import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { IoRefreshSharp } from 'react-icons/io5';
import { LuSearch } from 'react-icons/lu';
import { FiEye, FiPlus, FiCalendar } from 'react-icons/fi';
import { RiSendPlane2Line } from 'react-icons/ri';
// Import Heroicons
import {
  UserPlusIcon,
  ClockIcon,
  CalendarIcon,
  UserGroupIcon,
  IdentificationIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { DollarSign } from 'lucide-react';
import attendanceService from '../../services/attendanceService';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Patient } from '../../services/patientService';
import userService from '../../services/userService';
import { extractErrorMessage } from '../../utils/errorUtils';
import { safeErrorToString } from '../../utils/errorHandler';
import Modal from 'react-bootstrap/Modal';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Spinner from '../../components/Spinner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import patientService, { CreatePatientDto } from '../../services/patientService';
// Import Material UI components
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
// Import the API client properly
import api, { patientsAPI, appointmentsAPI, usersAPI } from '../../services/api';
// Import services
import patientCardService from '../../services/patientCardService';
import cardTypeService from '../../services/cardTypeService';
import { useCardTypes, CardType } from '../../context/CardTypeContextNew';
// Import other required components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog';
// import { Resizable } from 're-resizable';

import RecordPaymentForm from '../../components/Billing/RecordPaymentForm';
// import NotificationPanel from '../../components/Reception/NotificationPanel';
import UnifiedNotificationPanel from '../../components/Reception/UnifiedNotificationPanel';
import PatientCardSettings from '../../pages/Settings/PatientCardSettings';
import billingService from '../../services/billingService';
import { getActiveNotifications } from '../../utils/notificationFilters';
import receptionService, { ReceptionDashboardStats } from '../../services/receptionService';

// Load enough patients when not searching so the queue doesn't "disappear" after refetch (backend returns newest first; a small limit could exclude waiting patients)
const QUEUE_PATIENTS_LOAD_SIZE = 500;

// Local storage key for processed payments (should match the one in PaymentNotifications.tsx)
const PROCESSED_NOTIFICATIONS_KEY = 'clinic_processed_notifications';

// Helper function to get processed payment IDs from local storage
const getProcessedPaymentIds = (): string[] => {
  try {
    const stored = localStorage.getItem(PROCESSED_NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading from local storage:', error);
    return [];
  }
};

// Helper function to add a payment ID to processed list
const addProcessedPaymentId = (id: string): void => {
  try {
    const processedIds = getProcessedPaymentIds();
    if (!processedIds.includes(id)) {
      processedIds.push(id);
      // Keep only the last 100 IDs to prevent local storage from growing too large
      const limitedIds = processedIds.slice(-100);
      localStorage.setItem(PROCESSED_NOTIFICATIONS_KEY, JSON.stringify(limitedIds));
    }
  } catch (error) {
    console.error('Error writing to local storage:', error);
  }
};

interface QueuePatient extends Patient {
  department: string;
  time: string;
  priority: 'normal' | 'urgent' | 'emergency';
  waitingTime: string;
  estimatedTime: string;
  hasActiveServiceRequests?: boolean;
  activeServiceRequests?: any[];
  hasCardPayment?: boolean;
}

interface NewPatientFormValues {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  contactNumber: string;
  email: string;
  address: string;
  department: string;
  priority: string;
  insuranceProvider: string;
  insuranceNumber: string;
  medicalHistory: string;
  allergies: string;
  notes: string;
}

// Lightweight edit form state for patient registration updates
type EditFormState = Partial<Patient> & { id?: string };

interface Doctor {
  id: string;
  _id?: string;
  // When fetched from /api/staff/members we receive a single combined name field
  name?: string;
  firstName: string;
  lastName: string;
}

type SortableFields = 'firstName' | 'department' | 'time';

const calculateWaitingTime = (lastVisit?: string) => {
  if (!lastVisit) return '0 mins';

  const visitTime = new Date(lastVisit).getTime();
  const now = new Date().getTime();
  const diffMinutes = Math.floor((now - visitTime) / (1000 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes} mins`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  }
};

const getWaitingTimeMinutes = (lastVisit?: string): number => {
  if (!lastVisit) return 0;
  const visitTime = new Date(lastVisit).getTime();
  const now = new Date().getTime();
  return Math.floor((now - visitTime) / (1000 * 60));
};

const getWaitingTimeColor = (lastVisit?: string): string => {
  const mins = getWaitingTimeMinutes(lastVisit);
  if (mins >= 120) return 'text-red-600 font-semibold';
  if (mins >= 60) return 'text-orange-500 font-medium';
  if (mins >= 30) return 'text-yellow-600';
  return 'text-green-600';
};

/** Prefer lastUpdated (when they joined/refreshed in queue) so renewed-today patients show short wait. */
const getQueueJoinTime = (patient: any) =>
  patient?.lastUpdated || patient?.createdAt || patient?.registrationDate;

/** Reception queue: only patients with a verified card payment (invoice/PatientCard), not grace-only / issue-date-only. */
const hasVerifiedPaidCardForQueue = (patient: any) =>
  patient?.hasPaidCardFee === true && !patient?.hasUnpaidCardInvoice;

const Icon = ({ icon: Icon, className }: { icon: any; className?: string }) => (
  <Icon className={className} aria-hidden="true" />
);

interface Nurse {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
}

const appointmentTypes = [
  { value: 'checkup', label: 'Check-up' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'lab-test', label: 'Lab Test Request' },
  { value: 'imaging', label: 'Imaging Request' },
  { value: 'procedure', label: 'Procedure' },
];

const handlePrintPatientCard = (patient: any) => { };
const handleRenewCard = (patient: any) => { };

const ReceptionDashboard: React.FC = () => {
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<QueuePatient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Debug function to log search state
  const handleSearchChange = (value: string) => {

    setSearchQuery(value);
  };
  const [currentPage, setCurrentPage] = useState(1);
  // Queue: latest (most recently joined = shortest wait) on top
  const [sortField, setSortField] = useState<SortableFields>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent' | 'emergency'>('all');

  const [isRenewCardModalOpen, setIsRenewCardModalOpen] = useState(false);
  const [patientToRenewCard, setPatientToRenewCard] = useState<QueuePatient | null>(null);
  const [renewalAmount, setRenewalAmount] = useState<string>('');
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState<string>('cash');

  // Search expired cards state (integrated in registration modal)
  const [expiredCardSearchQuery, setExpiredCardSearchQuery] = useState<string>('');
  const [expiredCardSearchResults, setExpiredCardSearchResults] = useState<Patient[]>([]);
  const [isSearchingExpiredCards, setIsSearchingExpiredCards] = useState(false);
  const [selectedExpiredCardPatient, setSelectedExpiredCardPatient] = useState<Patient | null>(null);
  const [isRenewExpiredCardModalOpen, setIsRenewExpiredCardModalOpen] = useState(false);
  const [expiredCardRenewalAmount, setExpiredCardRenewalAmount] = useState<string>('');
  const [expiredCardRenewalPaymentMethod, setExpiredCardRenewalPaymentMethod] = useState<string>('Cash');
  const [expiredCardPatientCardId, setExpiredCardPatientCardId] = useState<string | null>(null);
  // Tab state for the New Patient modal: 'new' = register new, 'renew' = search & renew existing
  const [registrationTab, setRegistrationTab] = useState<'new' | 'renew'>('new');
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmSendNurseDialogOpen, setIsConfirmSendNurseDialogOpen] = useState(false);
  const [patientToSendToNurse, setPatientToSendToNurse] = useState<QueuePatient | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedNurseId, setSelectedNurseId] = useState<string | null>(null);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingNurses, setIsLoadingNurses] = useState(false);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [patientsForSelect, setPatientsForSelect] = useState<Patient[]>([]);
  const [doctorsForSelect, setDoctorsForSelect] = useState<Doctor[]>([]);
  const [isLoadingPatientsForSelect, setIsLoadingPatientsForSelect] = useState(false);
  const [isLoadingDoctorsForSelect, setIsLoadingDoctorsForSelect] = useState(false);
  const [patientCardStatuses, setPatientCardStatuses] = useState<{ [key: string]: any }>({});
  const [selectedCardTypeId, setSelectedCardTypeId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit patient modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Patient search state
  const [filteredPatientsForSelect, setFilteredPatientsForSelect] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Lab and Imaging services
  const [labServices, setLabServices] = useState<any[]>([]);
  const [imagingServices, setImagingServices] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Payment notification modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentNotificationData, setPaymentNotificationData] = useState<{
    message: string;
    totalAmount: number;
    invoices: any[];
    patientName: string;
    patientId?: string;
    canBypass?: boolean;
    paymentRequirementId?: string;
    cardExpired?: boolean;
    cardInfo?: any;
  } | null>(null);

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);

  // Add state for pending prescriptions
  const [paymentNotifications, setPaymentNotifications] = useState<any[]>([]);

  // Automatic attendance status
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'offline' | 'loading'>('loading');
  const [lastActivity, setLastActivity] = useState<string>('');
  const queueSectionRef = useRef<HTMLDivElement | null>(null);

  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState<ReceptionDashboardStats>({
    waitingPatients: 0,
    dailyAppointments: 0,
    activeDepartments: 0,
    urgentCases: 0,
    totalPatientsToday: 0,
    recentAppointments: 0,
    patientsByDepartment: {}
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const location = useLocation();
  const passedPatientIdFromAppointmentsPage = location.state?.patientId;

  const navigate = useNavigate();

  // Removed step-based form navigation

  const departments = [
    { value: 'general', label: 'General Medicine' },
    { value: 'cardiology', label: 'Cardiology' },
    { value: 'orthopedics', label: 'Orthopedics' },
    { value: 'pediatrics', label: 'Pediatrics' },
    { value: 'dental', label: 'Dental' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'neurology', label: 'Neurology' },
    { value: 'ophthalmology', label: 'Ophthalmology' },
  ];

  const priorityOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'emergency', label: 'Emergency' },
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Admitted': return 'bg-[hsl(var(--patient-admitted))] text-[hsl(var(--patient-admitted-foreground))] border-[hsl(var(--patient-admitted-border))]';
      case 'Discharged': return 'bg-[hsl(var(--patient-discharged))] text-[hsl(var(--patient-discharged-foreground))] border-[hsl(var(--patient-discharged-border))]';
      case 'Outpatient': return 'bg-[hsl(var(--patient-outpatient))] text-[hsl(var(--patient-outpatient-foreground))] border-[hsl(var(--patient-outpatient-border))]';
      case 'Emergency': return 'bg-[hsl(var(--patient-emergency))] text-[hsl(var(--patient-emergency-foreground))] border-[hsl(var(--patient-emergency-border))]';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-[hsl(var(--priority-urgent))] text-[hsl(var(--priority-urgent-foreground))] border-[hsl(var(--priority-urgent-border))]';
      case 'emergency': return 'bg-[hsl(var(--priority-urgent))] text-[hsl(var(--priority-urgent-foreground))] border-[hsl(var(--priority-urgent-border))]';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const validationSchema = Yup.object().shape({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    age: Yup.number()
      .required('Age is required')
      .positive('Age must be positive')
      .integer('Age must be a whole number')
      .max(150, 'Age must be less than 150')
      .typeError('Age must be a number'),
    contactNumber: Yup.string().required('Contact number is required'),
    // Optional fields that will be set with defaults
    gender: Yup.string(),
    email: Yup.string().email('Invalid email address'),
    address: Yup.string(),
    department: Yup.string(),
    priority: Yup.string(),
    insuranceProvider: Yup.string(),
    insuranceNumber: Yup.string(),
    medicalHistory: Yup.string(),
    allergies: Yup.string(),
    notes: Yup.string()
  });

  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const stats = await receptionService.getDashboardStats();
      setDashboardStats(stats);

      // Augment with live counts from client-side data sources
      try {
        // 1) Appointments for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const apptRes = await appointmentsAPI.getAllWithFallback({
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString(),
          limit: 999
        });
        const appts = apptRes?.data?.data?.appointments || apptRes?.data?.appointments || apptRes?.data || [];

        // 2) Active departments
        let activeDepartmentsCount = 0;
        try {
          const deptRes = await api.get('/api/staff/departments');
          const departments = deptRes?.data?.data || deptRes?.data || [];
          activeDepartmentsCount = Array.isArray(departments)
            ? departments.filter((d: any) => (d?.status ? d.status === 'active' : (d?.activeCount || 0) > 0)).length
            : 0;
        } catch (e) {
          activeDepartmentsCount = stats.activeDepartments || 0;
        }

        setDashboardStats(prev => ({
          ...prev,
          dailyAppointments: Array.isArray(appts) ? appts.length : Number(appts?.total || 0),
          activeDepartments: activeDepartmentsCount
        }));
      } catch (innerErr) {
        // Non-fatal; keep backend-provided values
        console.warn('Non-critical stats enrichment failed:', innerErr);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchPatients = useCallback(async (pageNum = 1, pageSize = 50, searchTerm?: string) => {
    setIsLoading(true);
    try {
      // Fetch all patients - include search parameter to search ALL patients in database
      let apiUrl = `/api/patients/quick-load?limit=${searchTerm && searchTerm.trim() ? 1000 : pageSize}`;
      if (searchTerm && searchTerm.trim()) {
        apiUrl += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      // Use the quick-load endpoint for better performance and correct sorting (newest first)
      const res = await api.get(apiUrl);

      if (res.data && Array.isArray(res.data.patients)) {
        // The backend now provides payment status directly
        const patientsWithPaymentStatus = res.data.patients.map((patient: any) => {
          // Debug logging for patients with unpaid invoices
          if (patient.hasUnpaidInvoices && patient.unpaidInvoices && patient.unpaidInvoices.length > 0) {

          }

          // Debug: Log card information to help diagnose grace period issues
          if (patient.cardType || patient.cardStatus) {
            console.log(`[Patient Card Info] ${patient.patientId} - ${patient.firstName} ${patient.lastName}:`, {
              hasCardType: !!patient.cardType,
              cardTypeName: patient.cardType?.name,
              cardStatus: patient.cardStatus,
              cardIssueDate: patient.cardIssueDate,
              cardExpiryDate: patient.cardExpiryDate
            });
          }

          return patient;
        });

        setPatients(patientsWithPaymentStatus);
        setCurrentPage(res.data.currentPage || 1);
        setTotal(res.data.totalPatients || 0);
      } else {
        console.warn('Unexpected response structure for patients:', res.data);
        setPatients(res.data?.data && Array.isArray(res.data.data) ? res.data.data : []);
        setCurrentPage(res.data?.page || res.data?.currentPage || 1);
        setTotal(res.data?.total || res.data?.totalItems || 0);
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      toast.error("Failed to load patients.");
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed searchQuery from dependencies

  // Fetch patients when search query changes (with debouncing)
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchQuery.trim()) {
        // When searching, fetch all matching patients from database
        fetchPatients(1, 1000, searchQuery);
      } else {
        // When not searching, load enough patients so queue list is stable (no disappear after refetch)
        fetchPatients(1, QUEUE_PATIENTS_LOAD_SIZE);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => {
      clearTimeout(searchTimeout);
    };
  }, [searchQuery, fetchPatients]);

  useEffect(() => {
    // Only fetch if not searching (search effect handles search queries).
    // Do NOT depend on currentPage: queue pagination is client-side; refetching on page change
    // would reset currentPage to 1 when the response arrives and break Prev/Next.
    if (!searchQuery.trim()) {
      fetchPatients(1, QUEUE_PATIENTS_LOAD_SIZE);
    }
    fetchDashboardStats();
  }, [limit, fetchPatients, fetchDashboardStats, searchQuery]);

  // Recompute client-side-driven stats when patient list/queue updates
  // moved below after queuePatients is defined to avoid temporal dead zone

  // Base queue for tab counts only: status + expired filter, no priority filter. Keeps "All (9)" in sync with table.
  const queuePatientsForTabCounts = useMemo(() => {
    if (!Array.isArray(patients)) return [];
    let list = patients;
    if (!searchQuery.trim()) {
      list = patients.filter(p => ['waiting', 'queue', 'in_queue', 'pending'].includes((p.status || '').toLowerCase().trim()));
      list = list.filter(p => hasVerifiedPaidCardForQueue(p));
      list = list.filter(patient => {
        const p = patient as any;
        const cardStatus = (p.cardStatus ?? '').toString().toLowerCase();
        if (cardStatus === 'expired') return false;
        const expiry = p.cardExpiryDate ? new Date(p.cardExpiryDate) : null;
        if (expiry && !isNaN(expiry.getTime())) {
          const graceEnd = new Date(expiry);
          graceEnd.setDate(graceEnd.getDate() + 15);
          if (Date.now() > graceEnd.getTime()) return false;
        }
        const issueDateSource = p.cardIssueDate || p.createdAt;
        if (issueDateSource && (p.cardType || p.cardStatus)) {
          const issueDate = new Date(issueDateSource);
          if (!isNaN(issueDate.getTime())) {
            const daysSinceIssue = Math.ceil((Date.now() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceIssue > 15) return false;
          }
        }
        return true;
      });
    } else {
      const searchLower = searchQuery.toLowerCase().trim();
      list = patients.filter(patient => {
        const firstName = (patient.firstName || '').toLowerCase();
        const lastName = (patient.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const patientId = (patient.patientId || '').toLowerCase();
        const department = (patient.department || '').toLowerCase();
        const contactNumber = (patient.contactNumber || '').toLowerCase();
        return firstName.includes(searchLower) || lastName.includes(searchLower) || fullName.includes(searchLower) ||
          patientId.includes(searchLower) || department.includes(searchLower) || contactNumber.includes(searchLower);
      });
    }
    return list;
  }, [patients, searchQuery]);

  // Filter patients for the queue - show waiting patients by default, but show all patients when searching
  // IMPORTANT: Patients with unpaid invoices are excluded from the queue to ensure payment is completed first
  // This prevents patients with "paid" status from appearing in the queue when they still have unpaid invoices
  const queuePatients = useMemo(() => {

    if (!Array.isArray(patients)) {

      return [];
    }

    // Debug: Log all patients we have


    let filteredPatients = patients;

    // If no search query, only show 'waiting' patients
    if (!searchQuery.trim()) {

      filteredPatients = patients.filter(patient => {
        const status = (patient.status || '').toLowerCase().trim();
        // For reliability, the queue now uses ONLY the patient status.
        // Any patient with status 'waiting' (or equivalent) will appear here.
        const waitingStatuses = ['waiting', 'queue', 'in_queue', 'pending'];
        return waitingStatuses.includes(status);
      });

      filteredPatients = filteredPatients.filter(p => hasVerifiedPaidCardForQueue(p));

      // NOTE: We intentionally removed extra payment-based filters here because they were
      // hiding patients whose card renewal invoices were already paid.
      // Payment enforcement now happens earlier in the flow (before status is set to 'waiting').

      // Log which patients are in the queue for debugging
      const excludedPatients = patients.filter(patient => {
        const status = (patient.status || '').toLowerCase().trim();
        const waitingStatuses = ['waiting', 'queue', 'in_queue', 'pending'];
        const isWaiting = waitingStatuses.includes(status);

        if (!isWaiting) return false; // Not waiting, so not excluded from queue

        const patientId = patient._id || patient.id;
        const patientName = `${patient.firstName} ${patient.lastName}`;

        // Check payment notifications
        const hasPaymentNotification = paymentNotifications.some(notification => {
          const notificationPatientId = notification.data?.patientId;
          const notificationPatientName = notification.data?.patientName;
          return (notificationPatientId && notificationPatientId === patientId) ||
            (notificationPatientName && notificationPatientName.toLowerCase() === patientName.toLowerCase());
        });

        // Check unpaid invoices
        const hasUnpaidInvoices = patient.hasUnpaidInvoices || (patient.unpaidInvoices && patient.unpaidInvoices.length > 0);

        return hasPaymentNotification || hasUnpaidInvoices;
      });

      if (excludedPatients.length > 0) {

      }

      // Log which patients were excluded and why (using the existing excludedPatients variable)
      if (excludedPatients.length > 0) {

      }

      // Exclude patients whose card is expired — same logic as getCardStatusText / getGracePeriodDetails
      filteredPatients = filteredPatients.filter(patient => {
        const p = patient as any;
        const cardStatus = (p.cardStatus ?? '').toString().toLowerCase();
        if (cardStatus === 'expired') return false;
        // Backend cardExpiryDate: exclude when past expiry + 15 days grace
        const expiry = p.cardExpiryDate ? new Date(p.cardExpiryDate) : null;
        if (expiry && !isNaN(expiry.getTime())) {
          const graceEnd = new Date(expiry);
          graceEnd.setDate(graceEnd.getDate() + 15);
          if (Date.now() > graceEnd.getTime()) return false;
        }
        // Same as getGracePeriodDetails: use cardIssueDate or createdAt, 15 days grace
        const issueDateSource = p.cardIssueDate || p.createdAt;
        if (issueDateSource && (p.cardType || p.cardStatus)) {
          const issueDate = new Date(issueDateSource);
          if (!isNaN(issueDate.getTime())) {
            const daysSinceIssue = Math.ceil((Date.now() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceIssue > 15) return false;
          }
        }
        return true;
      });
    } else {
      // When searching, include ALL patients regardless of status (including scheduled patients)
      const searchLower = searchQuery.toLowerCase().trim();

      filteredPatients = patients.filter(patient => {
        const firstName = (patient.firstName || '').toLowerCase();
        const lastName = (patient.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const patientId = (patient.patientId || '').toLowerCase();
        const department = (patient.department || '').toLowerCase();
        const contactNumber = (patient.contactNumber || '').toLowerCase();

        const matches = firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          fullName.includes(searchLower) ||
          patientId.includes(searchLower) ||
          department.includes(searchLower) ||
          contactNumber.includes(searchLower);

        if (matches) {

        }

        return matches;
      });

      // Note: When searching, we do NOT apply payment filters - show all matching patients
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filteredPatients = filteredPatients.filter(patient => {
        const p = (patient.priority || 'normal').toLowerCase();
        return p === priorityFilter;
      });
    }

    // Apply sorting
    filteredPatients = [...filteredPatients].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'firstName') {
        aVal = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        bVal = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
      } else if (sortField === 'department') {
        aVal = (a.department || '').toLowerCase();
        bVal = (b.department || '').toLowerCase();
      } else {
        // Sort by queue-join time (lastUpdated when set to waiting, else createdAt)
        aVal = new Date(getQueueJoinTime(a) || 0).getTime();
        bVal = new Date(getQueueJoinTime(b) || 0).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredPatients;
  }, [patients, searchQuery, paymentNotifications, priorityFilter, sortField, sortDirection]);

  // Expose variables for testing (development only)
  if (import.meta.env.DEV) {
    (window as any).queuePatients = queuePatients;
    (window as any).patients = patients;
    (window as any).paymentNotifications = paymentNotifications;
  }

  // Auto-reset page when current page is beyond available queue pages or when search changes
  useEffect(() => {
    const queueTotalPages = Math.ceil(queuePatients.length / (limit || 10));
    if (queuePatients.length > 0 && currentPage > queueTotalPages && queueTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [queuePatients.length, currentPage, limit]);

  // Reset to page 1 when search query or priority filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, priorityFilter]);

  // Sort handler: same column toggles direction; new column uses sensible default (time = desc so latest on top)
  const handleSort = (field: SortableFields) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'time' ? 'desc' : 'asc');
    }
  };

  // Quick view handler inside component
  const handleQuickView = (patient: QueuePatient) => {
    setSelectedPatient(patient);
    setIsQuickViewOpen(true);
  };

  useEffect(() => {
    const handlePatientRegistered = () => {
      fetchPatients(1, limit);
    };

    window.addEventListener('patientRegistered', handlePatientRegistered);

    return () => {
      window.removeEventListener('patientRegistered', handlePatientRegistered);
    };
  }, [fetchPatients, limit]);

  // After fetching patients and setting state, add a warning if patients is empty but API returned data
  useEffect(() => {
    // Only show error if: 
    // 1. Not loading (fetch completed)
    // 2. Queue patients array is empty (after filtering for 'waiting' status)
    // 3. We've attempted to fetch at least once
    const hasAttemptedFetch = !isLoading && patients.length > 0;
    const noQueuePatients = Array.isArray(patients) &&
      patients.filter(p => {
        const status = (p.status || '').toLowerCase().trim();
        const waitingStatuses = ['waiting', 'queue', 'in_queue', 'pending'];
        return waitingStatuses.includes(status);
      }).length === 0;

    // Queue status now handled by UnifiedNotificationPanel
    // if (hasAttemptedFetch && noQueuePatients) {
    //   toast('No patients currently waiting in the queue.', { icon: 'ℹ️' });
    // }
  }, [isLoading, patients]);

  const fetchDoctors = async () => {
    setIsLoadingDoctors(true);
    try {
      // Use staff members endpoint (backend does not expose /api/users)
      const response = await api.get('/api/staff/members', { params: { role: 'doctor' } });
      const rawDoctors = response.data?.data?.members || response.data || [];

      // Ensure rawDoctors is an array
      if (!Array.isArray(rawDoctors)) {
        console.error('❌ Expected array but got:', typeof rawDoctors, rawDoctors);
        setDoctors([]);
        return;
      }

      // Normalize to a consistent shape: id, firstName, lastName
      const doctorsData: Doctor[] = rawDoctors.map((d: any) => ({
        id: d.id || d._id || d.userId || d?.user?._id || '',
        _id: d._id || d.id,
        firstName: d.firstName || d.name?.split(' ')[0] || '',
        lastName: d.lastName || d.name?.split(' ').slice(1).join(' ') || '',
        name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim(),
      })).filter((d: Doctor) => Boolean(d.id || d._id));
      setDoctors(doctorsData);
    } catch (error: any) {
      console.error('❌ Error fetching doctors:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error('Failed to load doctors');
      setDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const fetchNurses = async () => {
    setIsLoadingNurses(true);
    try {
      const nursesData = await userService.getAllNurses();

      // Ensure nursesData is an array
      if (Array.isArray(nursesData)) {
        if (nursesData.length === 0) {
          toast.error('No nurses found in the system. Please add nurses from the admin panel.');
        }
        setNurses(nursesData);
      } else {
        console.error("Invalid nurses data received:", nursesData);
        toast.error("Invalid nurses data received from server");
        setNurses([]);
      }
    } catch (error: any) {
      console.error("Error fetching nurses:", error.message);
      toast.error("Failed to load nurses from database. Please check server connection.");
      setNurses([]);
    } finally {
      setIsLoadingNurses(false);
    }
  };

  // Add method to fetch payment notifications
  const fetchPaymentNotifications = async () => {
    try {
      console.log('🔍 [ReceptionDashboard] Fetching payment notifications...');

      const response = await api.get('/api/notifications?type=medication_payment_required,lab_payment_required,service_payment_required,card_payment_required');

      console.log('🔍 [ReceptionDashboard] Notifications API response:', response.data);

      const notifications = response.data?.data || response.data?.notifications || [];
      console.log('🔍 [ReceptionDashboard] Raw notifications:', notifications);

      if (Array.isArray(notifications)) {
        const activeNotifications = getActiveNotifications(notifications);
        console.log('🔍 [ReceptionDashboard] Active notifications after filtering:', activeNotifications);
        setPaymentNotifications(activeNotifications);
      } else {
        console.warn("Unexpected response structure from notifications API:", response.data);
        setPaymentNotifications([]);
      }

    } catch (error) {
      console.error("Error fetching payment notifications:", error);
      toast.error("Failed to fetch payment notifications");
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
    fetchNurses();
    fetchPaymentNotifications();

    // Also periodically refresh doctors list in case new doctors were added
    const refreshDoctorsInterval = setInterval(() => {
      fetchDoctors();
    }, 60000);

    // Check for patient updates from admin dashboard every 30 seconds
    const checkPatientUpdatesInterval = setInterval(() => {
      // Check if there was a recent update to hidden patients
      const lastUpdatedAt = localStorage.getItem('patientsLastUpdatedAt');
      if (lastUpdatedAt && parseInt(lastUpdatedAt) > Date.now() - 60000) { // Only refresh if update was in last 60 seconds
        fetchPatients();
      }

      // Always check if any patient IDs are marked as hidden in localStorage
      const hiddenPatientIds = localStorage.getItem('hiddenPatientIds');
      if (hiddenPatientIds) {
        const hiddenIds = JSON.parse(hiddenPatientIds);
        // Filter out any patients that should be hidden
        setPatients(prev => prev.filter(patient => !hiddenIds.includes(patient.id)));
      }

    }, 30000);

    // Refresh payment notifications every 30 seconds
    const refreshPaymentNotificationsInterval = setInterval(() => {
      fetchPaymentNotifications();
    }, 30000);

    // Listen for payment processed events to refresh immediately
    const handlePaymentProcessed = (event: CustomEvent) => {

      fetchPaymentNotifications();
      fetchPatients(); // Also refresh patients to update payment status
    };

    window.addEventListener('paymentProcessed', handlePaymentProcessed as EventListener);

    return () => {
      clearInterval(checkPatientUpdatesInterval);
      clearInterval(refreshDoctorsInterval);
      clearInterval(refreshPaymentNotificationsInterval);
      window.removeEventListener('paymentProcessed', handlePaymentProcessed as EventListener);
    };
  }, []);

  const handleRefresh = () => {
    fetchPatients();
  };

  // Editing handlers
  const handleEditPatientOpen = (patient: QueuePatient) => {
    const derivedId = (patient as any).id || (patient as any)._id || (patient as any).patientId;
    setEditForm({ ...patient, id: derivedId });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (field: keyof EditFormState, value: any) => {
    setEditForm(prev => ({ ...(prev || {}), [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    const id = (editForm as any).id || (editForm as any)._id || (editForm as any).patientId;
    if (!id) {
      toast.error('Missing patient identifier.');
      return;
    }
    setIsSavingEdit(true);
    try {
      const { id: _omit, _id: _omit2, patientId: _pid, ...payload } = editForm as any;
      await patientService.updatePatient(String(id), payload);
      toast.success('Patient updated successfully');
      setIsEditModalOpen(false);
      setEditForm(null);
      handleRefresh();
    } catch (e) {
      toast.error('Failed to update patient');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSendToNurse = (patient: QueuePatient) => {
    // Ensure patient has required fields
    if (!patient.firstName || !patient.lastName) {
      console.error('❌ [handleSendToNurse] Patient missing required fields:', patient);
      toast.error('Patient data is incomplete. Please refresh and try again.');
      return;
    }

    const patientName = `${patient.firstName} ${patient.lastName}`;

    // Check if card is expired - block sending to department if expired
    const graceInfo = getGracePeriodDetails(patient);
    const isCardExpired = graceInfo?.isExpired || patient.cardStatus === 'expired';

    if (isCardExpired) {
      const daysOverdue = graceInfo?.daysSinceIssue ? graceInfo.daysSinceIssue - 15 : 0;
      toast.error(`Cannot send ${patientName} to department. Card is expired (${daysOverdue} days overdue). Please renew the card first.`, {
        duration: 5000,
        position: 'top-center'
      });
      return;
    }

    setPatientToSendToNurse(patient);
    setSelectedDoctorId(null);
    setSelectedNurseId(null);

    // Show initial notification when opening assignment modal
    const initialCardInfo = (() => {
      if (patient.cardStatus === 'active') {
        const daysRemaining = patient.cardDaysRemaining;
        if (daysRemaining !== undefined && daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0) {
          return {
            message: `⚠️ ${patientName} has an active card (${daysRemaining} days left)`,
            type: 'warning'
          };
        }
        return {
          message: `✅ ${patientName} has an active card`,
          type: 'success'
        };
      }

      if (patient.cardIssueDate) {
        const cardIssueDate = new Date(patient.cardIssueDate);
        const gracePeriodEnd = new Date(cardIssueDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15);

        const now = new Date();
        if (now <= gracePeriodEnd) {
          const daysLeft = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            message: `⏰ ${patientName} is in grace period (${daysLeft} days left)`,
            type: 'warning'
          };
        }
      }

      if (patient.cardType && !patient.cardStatus) {
        return {
          message: `📋 ${patientName} has a card but status needs verification`,
          type: 'info'
        };
      }

      return {
        message: `❌ ${patientName} has no patient card - payment required`,
        type: 'error'
      };
    })();

    toast(initialCardInfo.message, {
      duration: 3000,
      position: 'top-right' as const,
      style: {
        background: initialCardInfo.type === 'warning' ? '#fef3c7' :
          initialCardInfo.type === 'error' ? '#fee2e2' :
            initialCardInfo.type === 'info' ? '#dbeafe' : '#f0fdf4',
        color: initialCardInfo.type === 'warning' ? '#d97706' :
          initialCardInfo.type === 'error' ? '#dc2626' :
            initialCardInfo.type === 'info' ? '#1d4ed8' : '#15803d',
        border: `1px solid ${initialCardInfo.type === 'warning' ? '#fbbf24' :
          initialCardInfo.type === 'error' ? '#fecaca' :
            initialCardInfo.type === 'info' ? '#93c5fd' : '#bbf7d0'}`,
        fontSize: '13px',
        fontWeight: '500'
      },
      icon: initialCardInfo.type === 'warning' ? '⚠️' :
        initialCardInfo.type === 'error' ? '❌' :
          initialCardInfo.type === 'info' ? '📋' : '✅'
    });

    setIsConfirmSendNurseDialogOpen(true);
  };

  // Helper function to check unpaid invoices for a patient
  const checkPatientUnpaidInvoices = async (patientId: string) => {
    try {

      // Use billingService for more robust API call
      const response = await billingService.getUnpaidInvoicesByPatient(patientId);

      if (!response || !response.invoices || response.invoices.length === 0) {
        console.warn(`No unpaid invoices found for patient ${patientId}`);
        return null;
      }

      // Calculate total outstanding amount
      const totalAmount = response.invoices.reduce((total, invoice) =>
        total + (invoice.outstandingAmount || invoice.totalAmount || 0), 0);

      // Prepare payment notification data
      const paymentNotification = {
        message: `Patient has ${response.invoices.length} unpaid invoice(s)`,
        totalAmount,
        invoices: response.invoices,
        patientName: response.patientName || `Unknown Patient (ID: ${patientId})`,
        patientId: patientId,
        canBypass: response.invoices.some(invoice => invoice.canBypass),
        paymentRequirementId: response.paymentRequirementId
      };

      // Open payment notification modal
      setPaymentNotificationData(paymentNotification);
      setIsPaymentModalOpen(true);

      return paymentNotification;
    } catch (error) {
      console.error('❌ Error checking patient unpaid invoices:', error);

      // More detailed error handling
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          toast.error(`Payment Check Failed: ${error.response.data.message || 'Server Error'}`);
        } else if (error.request) {
          // The request was made but no response was received
          toast.error('No response received from server. Check your network connection.');
        } else {
          // Something happened in setting up the request
          toast.error('Error setting up payment check request.');
        }
      } else {
        toast.error('Unexpected error checking payment notifications.');
      }

      return null;
    }
  };

  const confirmSendToNurse = async () => {
    if (!patientToSendToNurse) return;

    const patientId = patientToSendToNurse._id || patientToSendToNurse.id;
    const patientName = `${patientToSendToNurse.firstName} ${patientToSendToNurse.lastName}`;

    // FIRST: Check if card is expired - block sending if expired
    const graceInfo = getGracePeriodDetails(patientToSendToNurse);
    const isCardExpired = graceInfo?.isExpired || patientToSendToNurse.cardStatus === 'expired';

    if (isCardExpired) {
      const daysOverdue = graceInfo?.daysSinceIssue ? graceInfo.daysSinceIssue - 15 : 0;
      toast.error(`Cannot send ${patientName} to department. Card is expired (${daysOverdue} days overdue). Please renew the card first.`, {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          fontSize: '14px',
          fontWeight: '500'
        }
      });
      setIsConfirmSendNurseDialogOpen(false);
      setPatientToSendToNurse(null);
      setSelectedNurseId(null);
      setSelectedDoctorId(null);
      return;
    }

    // Check if patient has an active card with 15-day grace period
    const hasActiveCard = (() => {
      // Check for cardStatus from backend
      if (patientToSendToNurse.cardStatus === 'active') {
        return true;
      }

      // Also check cardIssueDate for grace period calculation if cardStatus not available
      // Use the graceInfo we already calculated
      if (graceInfo) {
        return graceInfo.isActive || graceInfo.isInGracePeriod;
      }

      if (patientToSendToNurse.cardIssueDate) {
        const cardIssueDate = new Date(patientToSendToNurse.cardIssueDate);
        const gracePeriodEnd = new Date(cardIssueDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15); // 15 days grace period

        const now = new Date();
        return now <= gracePeriodEnd;
      }

      return false;
    })();

    if (hasActiveCard) {
      // Patient's card is active or within grace period – proceed directly with nurse assignment
      toast.success(`✅ Active card detected for ${patientName}. Proceeding with nurse assignment.`, {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#dcfce7',
          color: '#15803d',
          border: '1px solid #bbf7d0',
          fontSize: '14px',
          fontWeight: '500'
        }
      });

      await proceedWithNurseAssignment();
      return;
    }

    // Enhanced card status checking with detailed notifications
    const cardStatusInfo = (() => {
      const patient = patientToSendToNurse;

      // Check for cardStatus from backend
      if (patient.cardStatus === 'active') {
        const daysRemaining = patient.cardDaysRemaining;
        if (daysRemaining !== undefined && daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0) {
          return {
            status: 'active-warning',
            message: `⚠️ Active card for ${patientName} (${daysRemaining} days left). Proceeding with assignment.`,
            type: 'warning'
          };
        }
        return {
          status: 'active',
          message: `✅ Active card detected for ${patientName}. Proceeding with nurse assignment.`,
          type: 'success'
        };
      }

      // Check for grace period - use the graceInfo we already calculated
      if (graceInfo) {
        if (graceInfo.isExpired) {
          // This should have been caught earlier, but handle it here too
          const daysOverdue = graceInfo.daysSinceIssue - 15;
          return {
            status: 'expired',
            message: `❌ ${patientName}'s card is expired (${daysOverdue} days overdue). Cannot proceed with assignment.`,
            type: 'error'
          };
        }

        if (graceInfo.isInGracePeriod) {
          return {
            status: 'grace-period',
            message: `⏰ ${patientName} is in grace period (${graceInfo.daysLeft} days left). Proceeding with assignment.`,
            type: 'warning'
          };
        }
      } else if (patient.cardIssueDate) {
        // Fallback check if graceInfo wasn't available
        const cardIssueDate = new Date(patient.cardIssueDate);
        const gracePeriodEnd = new Date(cardIssueDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15); // 15 days grace period

        const now = new Date();
        if (now <= gracePeriodEnd) {
          const daysLeft = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            status: 'grace-period',
            message: `⏰ ${patientName} is in grace period (${daysLeft} days left). Proceeding with assignment.`,
            type: 'warning'
          };
        } else {
          // Card is expired
          const daysSinceIssue = Math.ceil((now.getTime() - cardIssueDate.getTime()) / (1000 * 60 * 60 * 24));
          const daysOverdue = daysSinceIssue - 15;
          return {
            status: 'expired',
            message: `❌ ${patientName}'s card is expired (${daysOverdue} days overdue). Cannot proceed with assignment.`,
            type: 'error'
          };
        }
      }

      // Check if patient has a card but no explicit status
      if (patient.cardType && !patient.cardStatus) {
        return {
          status: 'card-no-status',
          message: `📋 ${patientName} has a card but status unknown. Please verify card payment before proceeding.`,
          type: 'info'
        };
      }

      // No card at all
      return {
        status: 'no-card',
        message: `❌ ${patientName} has no patient card. Card payment required before medical assignment.`,
        type: 'error'
      };
    })();

    // Block if card is expired
    if (cardStatusInfo.status === 'expired') {
      toast.error(cardStatusInfo.message, {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          fontSize: '14px',
          fontWeight: '500'
        }
      });
      setIsConfirmSendNurseDialogOpen(false);
      setPatientToSendToNurse(null);
      setSelectedNurseId(null);
      setSelectedDoctorId(null);
      return;
    }

    // Show appropriate notification based on card status
    if (cardStatusInfo.status === 'active' || cardStatusInfo.status === 'active-warning' || cardStatusInfo.status === 'grace-period') {
      // Patient's card is active or within grace period – proceed with assignment
      toast.success(cardStatusInfo.message, {
        duration: 4000,
        position: 'top-center',
        style: {
          background: cardStatusInfo.type === 'warning' ? '#fef3c7' : '#dcfce7',
          color: cardStatusInfo.type === 'warning' ? '#d97706' : '#15803d',
          border: `1px solid ${cardStatusInfo.type === 'warning' ? '#fbbf24' : '#bbf7d0'}`,
          fontSize: '14px',
          fontWeight: '500'
        }
      });

      await proceedWithNurseAssignment();
      return;
    }

    // For patients with card issues or no card, show warning but don't block
    if (cardStatusInfo.status === 'card-no-status' || cardStatusInfo.status === 'no-card') {
      toast.error(cardStatusInfo.message, {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          fontSize: '14px',
          fontWeight: '500'
        }
      });

      // Show confirmation dialog for problematic card status
      const shouldProceed = window.confirm(
        `${cardStatusInfo.message}\n\nDo you want to proceed with the assignment anyway?`
      );

      if (!shouldProceed) {
        setIsConfirmSendNurseDialogOpen(false);
        setPatientToSendToNurse(null);
        setSelectedNurseId(null);
        setSelectedDoctorId(null);
        return;
      }
    }

    try {
      // Check if patient has unpaid invoices
      try {
        const unpaidInvoicesResult = await checkPatientUnpaidInvoices(patientId);

        if (unpaidInvoicesResult) {
          // Generate a unique ID for this payment requirement
          const paymentRequirementId = `payment_${patientId}_${Date.now()}`;

          // Check if this payment has already been processed
          if (processedPaymentIds.includes(paymentRequirementId)) {
            // Payment already processed, proceed with sending to nurse

            proceedWithNurseAssignment();
            return;
          }

          // Show payment required modal
          setPaymentNotificationData({
            message: `Payment required! Patient has unpaid invoices totaling $${unpaidInvoicesResult.totalAmount.toFixed(2)}. Please process payment at Reception before assignment.`,
            totalAmount: unpaidInvoicesResult.totalAmount,
            invoices: unpaidInvoicesResult.invoices,
            patientName: patientName,
            patientId,
            // Store the payment requirement ID for later reference
            paymentRequirementId
          });
          setIsPaymentModalOpen(true);
          return;
        }
      } catch (error: any) {
        // For other errors, show an error message and stop
        toast.error('Failed to check patient payment status');
        setIsConfirmSendNurseDialogOpen(false);
        setPatientToSendToNurse(null);
        setSelectedNurseId(null);
        setSelectedDoctorId(null);
        return;
      }

      // No unpaid invoices, proceed with nurse assignment
      proceedWithNurseAssignment();

    } catch (error) {
      console.error('Error in confirmSendToNurse:', error);
      toast.error('Failed to process nurse assignment');
      setIsConfirmSendNurseDialogOpen(false);
      setPatientToSendToNurse(null);
      setSelectedNurseId(null);
      setSelectedDoctorId(null);
    }
  };

  // Add this helper function to extract the actual nurse assignment logic
  const proceedWithNurseAssignment = async () => {
    if (!patientToSendToNurse) return;

    // Define patientName outside try-catch block so it's available in error handling
    const patientName = `${patientToSendToNurse.firstName} ${patientToSendToNurse.lastName}`;

    try {
      // Require doctor selection
      if (!selectedDoctorId) {
        toast.error('Please select a doctor');
        return;
      }

      const nurseId = selectedNurseId;
      const patientId = patientToSendToNurse._id || patientToSendToNurse.id;

      if (!nurseId) {
        toast.error('Please select a nurse');
        return;
      }

      // Doctor selection already validated above

      // Use the general update patient endpoint so both assignments happen in one call
      const response = await api.put(`/api/patients/${patientId}`, {
        assignedNurseId: nurseId,
        assignedDoctorId: selectedDoctorId,
        status: 'Admitted',
        vitals: {}, // reset vitals so nurse can record new set
        forceAssignment: true // bypass payment check for active card holders
      });

      if (response.status === 200 || response.data.success) {

        // Enhanced success notification based on card status
        const successMessage = (() => {
          if (patientToSendToNurse.cardStatus === 'active') {
            const daysRemaining = patientToSendToNurse.cardDaysRemaining;
            if (daysRemaining !== undefined && daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0) {
              return `✅ ${patientName} assigned to medical staff (${daysRemaining} days left on card)`;
            }
            return `✅ ${patientName} assigned to medical staff (Active card)`;
          }

          if (patientToSendToNurse.cardIssueDate) {
            const cardIssueDate = new Date(patientToSendToNurse.cardIssueDate);
            const gracePeriodEnd = new Date(cardIssueDate);
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15);

            const now = new Date();
            if (now <= gracePeriodEnd) {
              const daysLeft = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return `✅ ${patientName} assigned to medical staff (Grace period: ${daysLeft} days)`;
            }
          }

          return `✅ ${patientName} assigned to medical staff`;
        })();

        toast.success(successMessage, {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#dcfce7',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            fontSize: '14px',
            fontWeight: '500'
          }
        });

        // Close the dialog and clear selections
        setIsConfirmSendNurseDialogOpen(false);
        setPatientToSendToNurse(null);
        setSelectedNurseId(null);
        setSelectedDoctorId(null);
        fetchPatients(); // Refresh patient list
        fetchPaymentNotifications(); // Refresh payment notifications
      } else {
        toast.error(response.data.message || 'Failed to assign patient to nurse');
        // Close dialog even on failure
        setIsConfirmSendNurseDialogOpen(false);
        setPatientToSendToNurse(null);
        setSelectedNurseId(null);
        setSelectedDoctorId(null);
      }
    } catch (error: any) {
      console.error('Error assigning patient to nurse:', error);

      // Check if the error is related to card payment requirement
      if (error.response?.status === 402 && error.response?.data?.requiresCardPayment) {
        toast.error(`❌ Card Payment Required: ${patientName} needs valid card payment before medical staff assignment.`, {
          duration: 5000,
          position: 'top-center',
          style: {
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            fontSize: '14px',
            fontWeight: '500'
          }
        });

        // Close dialog
        setIsConfirmSendNurseDialogOpen(false);
        setPatientToSendToNurse(null);
        setSelectedNurseId(null);
        setSelectedDoctorId(null);
        return;
      }

      // Check if the error is related to unpaid invoices or expired card
      if (error.response?.data?.message?.includes('payment') ||
        error.response?.data?.message?.includes('Card Expired') ||
        error.response?.status === 402 ||
        error.message?.includes('payment') ||
        error.response?.data?.cardExpired) {

        // Check if error response contains invoice information (for expired cards)
        if (error.response?.data?.unpaidInvoices && error.response?.data?.totalAmount) {
          const errorData = error.response.data;
          const patientId = patientToSendToNurse._id || patientToSendToNurse.id;

          // Show payment required modal with error data
          setPaymentNotificationData({
            message: errorData.message || `Payment required! Patient has unpaid invoices totaling ETB ${errorData.totalAmount.toFixed(2)}.`,
            totalAmount: errorData.totalAmount,
            invoices: errorData.unpaidInvoices,
            patientName: `${patientToSendToNurse.firstName} ${patientToSendToNurse.lastName}`,
            patientId,
            paymentRequirementId: `payment_${patientId}_${Date.now()}`,
            cardExpired: (errorData as any).cardExpired || false,
            cardInfo: errorData.cardInfo || null
          });
          setIsPaymentModalOpen(true);
          return;
        }

        // Try to check for unpaid invoices using the helper function
        try {
          const patientId = patientToSendToNurse._id || patientToSendToNurse.id;
          const unpaidInvoicesResult = await checkPatientUnpaidInvoices(patientId);

          if (unpaidInvoicesResult) {
            // Show payment required modal
            setPaymentNotificationData({
              message: `Payment required! Patient has unpaid invoices totaling ETB ${unpaidInvoicesResult.totalAmount.toFixed(2)}. Please process payment at Reception before assignment.`,
              totalAmount: unpaidInvoicesResult.totalAmount,
              invoices: unpaidInvoicesResult.invoices,
              patientName: `${patientToSendToNurse.firstName} ${patientToSendToNurse.lastName}`,
              patientId,
              paymentRequirementId: `payment_${patientId}_${Date.now()}`
            });
            setIsPaymentModalOpen(true);
            return;
          } else {
            // No unpaid invoices found, must be another issue
            toast.error(error.response?.data?.message || 'Failed to assign patient to nurse');
            // Close dialog
            setIsConfirmSendNurseDialogOpen(false);
            setPatientToSendToNurse(null);
            setSelectedNurseId(null);
            setSelectedDoctorId(null);
          }
        } catch (checkError) {
          console.error('Error checking unpaid invoices:', checkError);
          toast.error('Failed to check patient payment status');
          // Close dialog on error
          setIsConfirmSendNurseDialogOpen(false);
          setPatientToSendToNurse(null);
          setSelectedNurseId(null);
          setSelectedDoctorId(null);
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to assign patient to nurse');
        // Close dialog on other errors
        setIsConfirmSendNurseDialogOpen(false);
        setPatientToSendToNurse(null);
        setSelectedNurseId(null);
        setSelectedDoctorId(null);
      }
    }
  };

  const cancelSendToNurse = () => {
    console.log('🔍 [cancelSendToNurse] Closing modal...');
    setIsConfirmSendNurseDialogOpen(false);
    setPatientToSendToNurse(null);
    setSelectedDoctorId(null);
    setSelectedNurseId(null);
  };


  // Add confirmRenewCard function
  const confirmRenewCard = async () => {
    if (!patientToRenewCard) {
      toast.error("No patient selected for card renewal.");
      return;
    }
    if (!renewalAmount || isNaN(Number(renewalAmount)) || Number(renewalAmount) <= 0) {
      toast.error("Please enter a valid renewal amount.");
      return;
    }

    try {
      const patientId = (patientToRenewCard as any)._id || (patientToRenewCard as any).id;
      const cards = await patientCardService.getPatientCards({ patient: patientId });
      const cardToRenew = Array.isArray(cards) && cards.length > 0
        ? cards.find((c: any) => String(c.status).toLowerCase() === 'expired' || (c.expiryDate && new Date(c.expiryDate) < new Date())) || cards[0]
        : null;
      if (!cardToRenew) {
        toast.error("No patient card found to renew.");
        return;
      }
      const response = await patientCardService.renewPatientCard(cardToRenew._id, {
        amount: parseFloat(renewalAmount),
        invoiceOnly: true,
        transactionId: null
      });
      if ((response as any).invoiceOnly !== false) {
        setIsRenewCardModalOpen(false);
        setPatientToRenewCard(null);
        setRenewalAmount('');
        setRenewalPaymentMethod('cash');
        toast("Renewal sent to Billing. Process payment there to activate the card; then the patient will appear in the queue.", { icon: '✅', duration: 5000 });
      } else {
        setIsRenewCardModalOpen(false);
        setPatientToRenewCard(null);
        setRenewalAmount('');
        setRenewalPaymentMethod('cash');
        toast("Patient card renewed successfully!", { icon: '✅' });
      }
      fetchPatients(currentPage, limit);
    } catch (error: any) {
      console.error("Error renewing card:", error);
      toast.error(error?.response?.data?.message || "Failed to renew card. Please try again.");
    }
  };

  // Search ALL patients by name/ID/phone — show all results with their card status.
  // Only truly EXPIRED cards get the "Renew" button; grace-period cards are shown as active (no renewal needed).
  const searchExpiredCards = async (query?: string) => {
    const q = (query ?? expiredCardSearchQuery).trim();
    if (!q) {
      setExpiredCardSearchResults([]);
      return;
    }

    setIsSearchingExpiredCards(true);
    setExpiredCardSearchResults([]);

    try {
      const quickLoadResponse = await api.get(
        `/api/patients/quick-load?search=${encodeURIComponent(q)}&limit=50&includeCompleted=true`
      );
      const searchResults: any[] = quickLoadResponse.data?.patients || quickLoadResponse.data?.data || [];
      // Return all matched patients — UI will decide what to show per card status
      setExpiredCardSearchResults(searchResults);
    } catch (error: any) {
      toast.error("Search failed. Please try again.");
      setExpiredCardSearchResults([]);
    } finally {
      setIsSearchingExpiredCards(false);
    }
  };

  // Debounce ref for live search
  const renewSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle selecting a patient to fill registration form or renew card
  const handleSelectExpiredCardPatient = async (patient: Patient, action: 'fill-form' | 'renew' = 'fill-form') => {
    if (action === 'fill-form') {
      // Auto-fill the registration form with patient data
      formik.setValues({
        ...formik.values,
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        age: patient.age?.toString() || '',
        gender: patient.gender || 'male',
        contactNumber: patient.contactNumber || '',
        email: patient.email || '',
        address: patient.address || 'Not provided',
        department: patient.department || 'general',
        priority: patient.priority || 'normal',
      });

      // Auto-select the card type if patient has one
      if (patient.cardType) {
        // Find matching card type by name or ID
        const matchingCardType = cardTypes.find(ct =>
          ct._id === (typeof patient.cardType === 'string' ? patient.cardType : patient.cardType?._id) ||
          ct.name === (typeof patient.cardType === 'object' ? patient.cardType?.name : patient.cardType) ||
          ct.value === (typeof patient.cardType === 'object' ? patient.cardType?.name : patient.cardType)
        );

        if (matchingCardType) {
          setSelectedCardTypeId(matchingCardType._id);
          toast.success(`Patient data filled. Card type "${matchingCardType.name}" selected.`, {
            icon: '✅',
            duration: 3000
          });
        } else {
          // If card type not found in available types, still show the card info
          toast.info(`Patient data filled. Note: Patient has a card but it's not in the current card types.`, {
            icon: 'ℹ️',
            duration: 3000
          });
        }
      } else {
        toast.success('Patient data filled in registration form.', {
          icon: '✅',
          duration: 3000
        });
      }

      // Clear search results after filling form
      setExpiredCardSearchQuery('');
      setExpiredCardSearchResults([]);

      // Ensure registration modal is open
      if (!isNewPatientModalOpen) {
        setIsNewPatientModalOpen(true);
      }

      return;
    }

    // Renew card logic with resilient fallback
    setSelectedExpiredCardPatient(patient);

    // Try to fetch cardId; if it fails, still allow issuance path
    try {
      const cards = await patientCardService.getPatientCards({ patient: patient._id || patient.id });
      if (Array.isArray(cards) && cards.length > 0) {
        const expiredCard = cards.find(card =>
          String(card.status).toLowerCase() === 'expired' ||
          (card.expiryDate && new Date(card.expiryDate) < new Date())
        ) || cards[0];
        setExpiredCardPatientCardId(expiredCard._id);
        const cardType = cardTypes.find(ct => ct.value === (expiredCard as any).type || ct.name === (expiredCard as any).type);
        if (cardType) {
          setExpiredCardRenewalAmount(cardType.price.toString());
        } else {
          setExpiredCardRenewalAmount((expiredCard as any).amountPaid?.toString() || '0');
        }
      } else {
        setExpiredCardPatientCardId(null);
      }
    } catch (error: any) {
      console.warn("[Renew Card] Falling back to issuance path. Could not fetch patient card:", error);
      setExpiredCardPatientCardId(null);
    }

    // Derive card type/amount from patient data as a fallback
    const ptCardTypeName = typeof (patient as any).cardType === 'object' ? (patient as any).cardType?.name : (patient as any).cardType;
    const fallbackType = cardTypes.find(ct => ct.name === ptCardTypeName || ct.value === ptCardTypeName);
    if (fallbackType) {
      setExpiredCardRenewalAmount(String(fallbackType.price || ''));
    }
    setIsRenewExpiredCardModalOpen(true);
  };

  // Confirm renewal of expired card
  const confirmRenewExpiredCard = async () => {
    if (!selectedExpiredCardPatient) {
      toast.error("No patient selected for renewal.");
      return;
    }

    if (!expiredCardRenewalAmount || isNaN(Number(expiredCardRenewalAmount)) || Number(expiredCardRenewalAmount) <= 0) {
      toast.error("Please enter a valid renewal amount.");
      return;
    }

    try {
      const patientId = (selectedExpiredCardPatient as any)._id || (selectedExpiredCardPatient as any).id;

      // Prefer renew: if we have a cardId or can find an existing card, always renew (never create a second card)
      let cardIdToRenew = expiredCardPatientCardId;
      if (!cardIdToRenew) {
        const existingCards = await patientCardService.getPatientCards({ patient: patientId });
        if (Array.isArray(existingCards) && existingCards.length > 0) {
          const cardToRenew = existingCards.find((c: any) => String(c.status).toLowerCase() === 'expired' || (c.expiryDate && new Date(c.expiryDate) < new Date())) || existingCards[0];
          cardIdToRenew = cardToRenew._id;
        }
      }

      if (cardIdToRenew) {
        const result = await patientCardService.renewPatientCard(cardIdToRenew, {
          amount: parseFloat(expiredCardRenewalAmount),
          invoiceOnly: true,
          transactionId: null
        });
        if ((result as any).invoiceOnly) {
          toast.success(
            `Renewal sent to Billing for ${selectedExpiredCardPatient.firstName} ${selectedExpiredCardPatient.lastName}. Process payment there to activate the card; then the patient will appear in the queue.`,
            { icon: '✅', duration: 5000 }
          );
        } else {
          toast.success(`Card renewed successfully for ${selectedExpiredCardPatient.firstName} ${selectedExpiredCardPatient.lastName}!`, {
            icon: '✅',
            duration: 3000
          });
        }
      } else {
        // Only create a new card when patient has no existing card — always create as PENDING (payment via Billing)
        const ptCardTypeName = typeof (selectedExpiredCardPatient as any).cardType === 'object' ? (selectedExpiredCardPatient as any).cardType?.name : (selectedExpiredCardPatient as any).cardType;
        const chosenType = cardTypes.find(ct => ct.name === ptCardTypeName || ct.value === ptCardTypeName) || cardTypes[0];
        if (!chosenType) {
          toast.error('Card type could not be determined.');
          return;
        }
        const rawType = (chosenType.value || chosenType.name || '').trim().toLowerCase();
        const typeMap: Record<string, string> = { basic: 'Basic', standard: 'Basic', premium: 'Premium', vip: 'VIP', family: 'Family' };
        const cardTypeForApi = typeMap[rawType] || (rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : 'Basic');
        try {
          const createResult = await patientCardService.createPatientCard({
            patient: patientId,
            type: cardTypeForApi,
            amountPaid: parseFloat(expiredCardRenewalAmount),
            paymentMethod: expiredCardRenewalPaymentMethod,
            pendingPayment: true,  // create as PENDING — payment processed in Billing
            cardNumber: '' as any,
            _id: '' as any,
            issuedDate: '' as any,
            status: 'Active' as any,
            benefits: undefined as any,
            lastPaymentDate: '' as any,
            expiryDate: '' as any
          } as any);
          if ((createResult as any).invoiceOnly) {
            toast.success(
              `Renewal sent to Billing for ${selectedExpiredCardPatient.firstName} ${selectedExpiredCardPatient.lastName}. Process payment there to activate the card; then the patient will appear in the queue.`,
              { icon: '✅', duration: 5000 }
            );
          } else {
            toast.success('Patient card issued successfully.');
          }
        } catch (createErr: any) {
          const data = createErr?.response?.data;
          if (data?.code === 'CARD_ALREADY_EXISTS' && data?.existingCardId) {
            const result = await patientCardService.renewPatientCard(data.existingCardId, {
              amount: parseFloat(expiredCardRenewalAmount),
              invoiceOnly: true,
              transactionId: null
            });
            if ((result as any).invoiceOnly) {
              toast.success(`Renewal sent to Billing. Process payment there to activate the card; then the patient will appear in the queue.`, { duration: 5000 });
            } else {
              toast.success(`Card renewed successfully for ${selectedExpiredCardPatient.firstName} ${selectedExpiredCardPatient.lastName}!`);
            }
          } else {
            throw createErr;
          }
        }
      }

      // Close modal and reset state
      setIsRenewExpiredCardModalOpen(false);
      setSelectedExpiredCardPatient(null);
      // Remove renewed patient from inline results
      try {
        const renewedId = patientId as any;
        setExpiredCardSearchResults(prev => Array.isArray(prev) ? prev.filter(p => ((p as any)._id || (p as any).id) !== renewedId) : []);
      } catch { }
      // Keep the search term but refresh the list on the main table
      if (searchQuery && searchQuery.trim()) {
        fetchPatients(1, 1000, searchQuery);
      } else {
        fetchPatients(currentPage, limit);
      }
      setExpiredCardRenewalAmount('');
      setExpiredCardRenewalPaymentMethod('Cash');
      setExpiredCardPatientCardId(null);
    } catch (e: any) {
      console.error('Error renewing/issuing card:', e);
      toast.error(e?.response?.data?.message || e?.message || 'Failed to process card renewal.');
    }
  };

  const formik = useFormik<NewPatientFormValues>({
    initialValues: {
      firstName: '',
      lastName: '',
      age: '',
      contactNumber: '',
      // Set defaults for fields not shown in simplified form
      gender: 'male',
      email: '',
      address: 'Not provided',
      department: 'general',
      priority: 'normal',
      insuranceProvider: '',
      insuranceNumber: '',
      medicalHistory: '',
      allergies: '',
      notes: ''
    },
    validationSchema,
    validateOnMount: true,
    onSubmit: async (values, { setSubmitting, resetForm, setErrors, setStatus }) => {
      setIsSubmitting(true);
      try {

        // Create patient object - match backend expectations
        const newPatientData: CreatePatientDto = {
          firstName: values.firstName,
          lastName: values.lastName,
          age: parseInt(values.age), // Backend expects age as number
          gender: values.gender,
          contactNumber: values.contactNumber,
          email: values.email || undefined,
          address: values.address || undefined,
          department: values.department || undefined,
          priority: values.priority as 'normal' | 'urgent' | 'emergency' || 'normal',
          medicalHistory: values.medicalHistory || undefined,
          allergies: values.allergies || undefined,
          notes: values.notes || undefined,
          insuranceProvider: values.insuranceProvider || undefined,
          insuranceNumber: values.insuranceNumber || undefined,
          selectedCardTypeId: selectedCardTypeId,
        };

        // Explicitly log data being sent to API


        // Use patientService to create patient
        const createdPatient = await patientService.createPatient(newPatientData);

        if (createdPatient) {
          // Find selected card type details
          const selectedCardType = selectedCardTypeId ?
            cardTypes.find(card => card._id === selectedCardTypeId) : null;

          // Show success notification
          toast.success(`Patient ${values.firstName} ${values.lastName} registered successfully!`, {
            duration: 4000,
            position: 'top-right',
          });

          // Close the dialog immediately
          setIsNewPatientModalOpen(false);

          // Reset form
          resetForm();

          // Trigger a refresh of the patient list
          fetchPatients(currentPage, limit);

          // Create notification message with card payment info if card was selected
          let notificationMessage = `New patient ${values.firstName} ${values.lastName} has been registered`;
          if (selectedCardType) {
            notificationMessage += ` with ${selectedCardType.name} card (ETB ${selectedCardType.price})`;
          }

          // Dispatch patient registration event
          window.dispatchEvent(new CustomEvent('patientRegistered', {
            detail: {
              patient: createdPatient,
              message: notificationMessage,
              cardType: selectedCardType,
              hasCardPayment: !!selectedCardType
            }
          }));

          // If patient was registered with a card, create a payment notification
          if (selectedCardType) {
            // Create card payment notification
            window.dispatchEvent(new CustomEvent('cardPaymentRequired', {
              detail: {
                patient: createdPatient,
                cardType: selectedCardType,
                amount: selectedCardType.price,
                type: 'card_payment_required',
                title: 'Card Payment Required',
                message: `${selectedCardType.name} card payment required for ${values.firstName} ${values.lastName}`,
                priority: 'high',
                timestamp: new Date()
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error creating patient:', error);

        // Check if it's a validation error message
        const errorMessage = extractErrorMessage(error);

        if (errorMessage.includes('Validation failed:')) {
          // Parse validation error message and set field errors
          const validationErrorsText = errorMessage.replace('Validation failed: ', '');
          const errorPairs = validationErrorsText.split(', ');

          const formikErrors: Record<string, string> = {};

          errorPairs.forEach(pair => {
            const [field, message] = pair.split(': ');
            formikErrors[field] = message;
          });

          setErrors(formikErrors);
          toast.error('Please fix the validation errors', {
            duration: 4000,
            position: 'top-right',
          });
        } else {
          // General error
          toast.error(`Error: ${errorMessage}`, {
            duration: 5000,
            position: 'top-right',
          });
        }
      } finally {
        setSubmitting(false);
        setIsSubmitting(false);
      }
    },
  });

  const scheduleFormik = useFormik({
    initialValues: {
      patientId: passedPatientIdFromAppointmentsPage || '',
      doctorId: '',
      appointmentDate: '',
      appointmentTime: '',
      type: '',
      reason: '',
      notes: '',
      selectedLabService: '',
      selectedImagingService: ''
    },
    validationSchema: Yup.object().shape({
      patientId: Yup.string().required('Patient is required'),
      doctorId: Yup.string().required('Doctor is required'),
      appointmentDate: Yup.string().required('Date is required'),
      appointmentTime: Yup.string().required('Time is required'),
      type: Yup.string().required('Appointment type is required'),
      reason: Yup.string().required('Reason for appointment is required'),
      notes: Yup.string(),
      selectedLabService: Yup.string().when('type', {
        is: 'lab-test',
        then: (schema) => schema.required('Please select a lab test'),
        otherwise: (schema) => schema.notRequired()
      }),
      selectedImagingService: Yup.string().when('type', {
        is: 'imaging',
        then: (schema) => schema.required('Please select an imaging study'),
        otherwise: (schema) => schema.notRequired()
      })
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        // Format the date and time properly
        const appointmentDateTime = new Date(`${values.appointmentDate}T${values.appointmentTime}:00`);

        // Validate the date
        if (isNaN(appointmentDateTime.getTime())) {
          throw new Error("Invalid date or time selected.");
        }

        console.log("ReceptionDashboard - Submitting appointment:", values);
        console.log("ReceptionDashboard - Created appointment date:", appointmentDateTime);
        console.log("ReceptionDashboard - ISO string:", appointmentDateTime.toISOString());

        // Create appointment object with correct field names for backend
        const appointmentData = {
          patient: values.patientId,
          doctor: values.doctorId,
          dateTime: appointmentDateTime.toISOString(),
          type: values.type,
          reason: values.reason,
          notes: values.notes,
          durationMinutes: 30,
          // Include selected service information
          selectedLabService: values.selectedLabService || null,
          selectedImagingService: values.selectedImagingService || null
        };

        console.log("ReceptionDashboard - Sending appointment data:", appointmentData);

        // Call appointments API to schedule
        await api.post('/api/appointments', appointmentData);

        setIsScheduleModalOpen(false);
        toast('Appointment scheduled successfully!', { icon: '✅' });
        // Optionally refresh data or navigate to appointments page
      } catch (error) {
        console.error('Error scheduling appointment:', error);
        toast.error('Failed to schedule appointment. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  });

  const filteredPatients = Array.isArray(patients) ? patients.filter(patient =>

  ((patient?.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (patient?.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (patient?.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient?.status || '').toLowerCase().includes(searchQuery.toLowerCase()))
  ) : [];

  const sortedPatients = Array.isArray(filteredPatients) ? [...filteredPatients].sort((a: QueuePatient, b: QueuePatient) => {
    const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  }) : [];

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 10)));

  const paginatedPatients = Array.isArray(sortedPatients) ? sortedPatients.slice(
    ((currentPage || 1) - 1) * (limit || 10),
    (currentPage || 1) * (limit || 10)
  ) : [];

  // Utility function to calculate age from dateOfBirth
  function calculateAge(dateOfBirth?: string | Date): string {
    if (!dateOfBirth) return '-';
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return '-';
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
  }

  // Get card status color and text
  const getCardStatusColor = (patient?: any) => {
    // Handle new backend format: patient.cardStatus, patient.cardType, patient.cardIssueDate
    if (!patient) return 'bg-gray-100 text-gray-600 border border-gray-300';

    // Check if patient has a card
    if (!patient.cardType && !patient.cardStatus) {
      return 'bg-gray-100 text-gray-600 border border-gray-300';
    }

    // FIRST: Check grace period BEFORE checking cardStatus
    // Color categorization: Green (Active), Amber/Yellow (Grace Period), Red (Expired)
    const graceInfo = getGracePeriodDetails(patient);

    if (graceInfo) {
      // RED: Expired (more than 15 days)
      if (graceInfo.isExpired) {
        return 'bg-red-100 text-red-800 border-2 border-red-400 font-semibold';
      }

      // AMBER/YELLOW: Grace Period (1-15 days) - color intensity based on days left
      if (graceInfo.isInGracePeriod) {
        // More urgent (1-5 days left) - darker amber
        if (graceInfo.daysLeft <= 5) {
          return 'bg-amber-200 text-amber-900 border-2 border-amber-500 font-semibold';
        }
        // Moderate (6-10 days left) - medium amber
        if (graceInfo.daysLeft <= 10) {
          return 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400 font-semibold';
        }
        // Early grace period (11-15 days left) - light amber
        return 'bg-amber-50 text-amber-700 border-2 border-amber-300 font-semibold';
      }

      // GREEN: Active (issued today)
      if (graceInfo.isActive) {
        return 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400 font-semibold';
      }
    }

    // If patient has cardStatus field (new format) and within grace period
    if (patient.cardStatus === 'active') {
      return 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400 font-semibold';
    }

    if (patient.cardStatus === 'expired') {
      return 'bg-red-100 text-red-800 border-2 border-red-400 font-semibold';
    }

    // If patient has cardType but no explicit status, assume active
    if (patient.cardType && !patient.cardStatus) {
      return 'bg-primary/20 text-primary';
    }

    // Legacy format support
    if (typeof patient === 'object' && patient.hasCard !== undefined) {
      if (!patient.hasCard) {
        return 'bg-muted/20 text-muted-foreground';
      }
      if (patient.status === 'Active' && patient.isValid) {
        return 'bg-primary/20 text-primary';
      }
      if (patient.status === 'Grace' && patient.isValid) {
        return 'bg-accent/20 text-accent-foreground';
      }
      return 'bg-destructive/20 text-destructive';
    }

    return 'bg-muted/20 text-muted-foreground';
  };

  // Helper function to get grace period details
  const getGracePeriodDetails = (patient: any) => {
    // Use cardIssueDate if available, otherwise fall back to createdAt (when card was likely issued)
    const issueDateSource = patient?.cardIssueDate || patient?.createdAt;

    if (!issueDateSource) {
      // Debug: Log when no date is available
      if (patient?.cardType || patient?.cardStatus) {
        console.log(`[Grace Period] Patient ${patient.patientId || patient.id} has card but no issue date:`, {
          patientId: patient.patientId,
          cardType: patient.cardType,
          cardStatus: patient.cardStatus,
          hasCardIssueDate: !!patient.cardIssueDate,
          hasCreatedAt: !!patient.createdAt
        });
      }
      return null;
    }

    const issueDate = new Date(issueDateSource);
    // Validate the date
    if (isNaN(issueDate.getTime())) {
      console.warn(`[Grace Period] Invalid date for patient ${patient.patientId}:`, issueDateSource);
      return null;
    }

    const graceEnd = new Date(issueDate);
    graceEnd.setDate(graceEnd.getDate() + 15); // 15 days grace period
    const now = new Date();
    const daysSinceIssue = Math.ceil((now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      issueDate,
      graceEnd,
      daysSinceIssue,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      isExpired: daysSinceIssue > 15,
      isInGracePeriod: daysSinceIssue > 0 && daysSinceIssue <= 15,
      isActive: daysSinceIssue === 0
    };
  };

  const getCardStatusText = (patient?: any) => {
    // Handle new backend format: patient.cardStatus, patient.cardType, patient.cardIssueDate
    if (!patient) return 'No Card';

    // Check if patient has a card
    if (!patient.cardType && !patient.cardStatus) {
      return 'No Card';
    }

    // FIRST: Check grace period BEFORE checking cardStatus
    // If grace period is more than 15 days, card should be expired
    const graceInfo = getGracePeriodDetails(patient);

    if (graceInfo) {
      // If more than 15 days have passed since issue date, card is expired
      if (graceInfo.isExpired) {
        const daysOverdue = graceInfo.daysSinceIssue - 15;
        return `❌ Expired (${daysOverdue} days overdue)`;
      }

      // If within grace period (1-15 days), show grace period status with days left
      if (graceInfo.isInGracePeriod) {
        return `⏰ Grace Period (${graceInfo.daysLeft} days left)`;
      }

      // If issued today (0 days), show active
      if (graceInfo.isActive) {
        return '✅ Active (Issued Today)';
      }
    }

    // Fallback: If no cardIssueDate but has cardStatus, use cardStatus
    // But warn that we can't calculate grace period
    if (patient.cardStatus === 'active') {
      // If we have cardType but no cardIssueDate, this might be an old record
      if (patient.cardType && !patient.cardIssueDate) {
        console.warn(`[Card Status] Patient ${patient.patientId} has active card but no cardIssueDate - cannot determine grace period`);
      }
      const daysRemaining = patient.cardDaysRemaining;
      if (daysRemaining !== undefined && daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0) {
        return `✅ Active (${daysRemaining} days left)`;
      }
      return '✅ Active Card - No Payment';
    }

    if (patient.cardStatus === 'expired') {
      return '❌ Expired Card';
    }

    // If patient has cardType but no explicit status, assume active
    if (patient.cardType && !patient.cardStatus) {
      return `${patient.cardType.name} Card`;
    }

    // Legacy format support
    if (typeof patient === 'object' && patient.hasCard !== undefined) {
      if (!patient.hasCard) {
        return 'No Card';
      }
      if (patient.status === 'Active' && patient.isValid) {
        return 'Active';
      }
      if (patient.status === 'Grace' && patient.isValid) {
        return `Grace (${patient.daysLeftInGrace} days)`;
      }
      if (patient.status === 'Grace' || patient.status === 'Expired') {
        return 'Expired';
      }
      return patient.status;
    }

    return 'No Card';
  };

  // Restore handleOpenScheduleModal definition
  const handleOpenScheduleModal = () => {
    scheduleFormik.resetForm({ values: { ...scheduleFormik.initialValues, patientId: passedPatientIdFromAppointmentsPage || '' } });
    setIsScheduleModalOpen(true);
    // Load data when modal opens
    fetchPatientsForSelect();
    fetchDoctorsForSelect();
    fetchLabServices();
    fetchImagingServices();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.patient-search-container')) {
        setShowPatientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch patients for appointment scheduling
  const fetchPatientsForSelect = async () => {
    setIsLoadingPatientsForSelect(true);
    try {
      const response = await api.get('/api/patients');
      const patientsData = response.data?.data || response.data?.patients || [];
      setPatientsForSelect(patientsData);
      setFilteredPatientsForSelect(patientsData); // Initialize filtered patients
    } catch (error) {
      console.error('Error fetching patients for select:', error);
      toast.error('Failed to load patients');
    } finally {
      setIsLoadingPatientsForSelect(false);
    }
  };

  // Fetch doctors for appointment scheduling
  const fetchDoctorsForSelect = async () => {
    setIsLoadingDoctorsForSelect(true);
    try {

      const response = await api.get('/api/users?role=doctor');

      const doctorsData = response.data?.data || response.data?.users || response.data || [];

      setDoctorsForSelect(doctorsData);
    } catch (error: any) {
      console.error('❌ Error fetching doctors for select:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error('Failed to load doctors');
    } finally {
      setIsLoadingDoctorsForSelect(false);
    }
  };

  const fetchLabServices = async () => {
    setIsLoadingServices(true);
    try {
      const response = await api.get('/api/services?active=true');
      const allServices = response.data || [];
      const labServicesData = allServices.filter((service: any) =>
        service.category === 'lab' ||
        service.category === 'blood_test' ||
        service.category === 'rbs' ||
        service.name.toLowerCase().includes('blood') ||
        service.name.toLowerCase().includes('glucose') ||
        service.name.toLowerCase().includes('rbs') ||
        service.name.toLowerCase().includes('fbs') ||
        service.name.toLowerCase().includes('cbc') ||
        service.name.toLowerCase().includes('urine') ||
        service.name.toLowerCase().includes('stool')
      );
      setLabServices(labServicesData);
    } catch (error) {
      console.error('Error fetching lab services:', error);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const fetchImagingServices = async () => {
    setIsLoadingServices(true);
    try {
      const response = await api.get('/api/services?active=true');
      const allServices = response.data || [];
      const imagingServicesData = allServices.filter((service: any) =>
        service.category === 'imaging' ||
        service.category === 'ultrasound' ||
        service.name.toLowerCase().includes('x-ray') ||
        service.name.toLowerCase().includes('ultrasound') ||
        service.name.toLowerCase().includes('ct') ||
        service.name.toLowerCase().includes('mri') ||
        service.name.toLowerCase().includes('mammography')
      );
      setImagingServices(imagingServicesData);
    } catch (error) {
      console.error('Error fetching imaging services:', error);
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Replace Zustand store access with local state
  const { cardTypes } = useCardTypes();

  // Add effect to load card types
  useEffect(() => {
    const loadCardTypes = async () => {
      try {
        await cardTypeService.fetchCardTypes();
      } catch (error) {
        console.error("Error loading card types:", error);
      }
    };

    loadCardTypes();
  }, []);

  // Calculate pagination for queue patients (not all patients)
  const { queueTotalPages, queueCurrentPage, paginatedQueuePatients } = useMemo(() => {
    const totalPages = Math.ceil(queuePatients.length / (limit || 10));
    const currentPageClamped = Math.min(currentPage || 1, Math.max(1, totalPages));

    const paginated = Array.isArray(queuePatients) ? queuePatients.slice(
      ((currentPageClamped || 1) - 1) * (limit || 10),
      (currentPageClamped || 1) * (limit || 10)
    ) : [];

    return {
      queueTotalPages: totalPages,
      queueCurrentPage: currentPageClamped,
      paginatedQueuePatients: paginated
    };
  }, [queuePatients, currentPage, limit]);

  // Recompute client-side-driven stats when patient list/queue updates
  // Use queuePatients for urgent count so "Urgent Cases" = urgent in queue, not in entire loaded list
  useEffect(() => {
    try {
      const waitingCount = queuePatients.length;
      const urgentCount = queuePatients.filter(p => (p?.priority === 'urgent' || p?.priority === 'emergency')).length;
      setDashboardStats(prev => ({
        ...prev,
        waitingPatients: waitingCount,
        urgentCases: urgentCount
      }));
    } catch (e) {
      // ignore
    }
  }, [queuePatients.length, queuePatients, patients.length]);

  // Add this new state
  const [processedPaymentIds, setProcessedPaymentIds] = useState<string[]>([]);

  // Load processed payment IDs from local storage on component mount
  useEffect(() => {
    setProcessedPaymentIds(getProcessedPaymentIds());
  }, []);

  // Automatic attendance tracking
  useEffect(() => {
    let isUnmounted = false;

    const loadAttendanceStatus = async () => {
      try {
        const status = await attendanceService.getMyAttendanceStatus();
        if (!isUnmounted && status) {
          setAttendanceStatus(status.status);
          setLastActivity(status.lastActivity || '');
        }
      } catch (error) {
        console.error('Error loading attendance status:', error);
        if (!isUnmounted) setAttendanceStatus('absent');
      }
    };

    // Start tracking first so backend records presence, then fetch status
    attendanceService.startActivityTracking();

    // Initial fetch
    loadAttendanceStatus();

    // Quick follow-up fetch to flip from "absent" to "present" after heartbeat/login-activity
    const quickRefresh = setTimeout(loadAttendanceStatus, 2000);

    // Periodic refresh to keep UI in sync
    const refreshInterval = setInterval(loadAttendanceStatus, 30000);

    return () => {
      isUnmounted = true;
      clearTimeout(quickRefresh);
      clearInterval(refreshInterval);
      attendanceService.stopActivityTracking();
    };
  }, []);

  // Add a method to process a pending prescription
  const processPendingPrescription = async (prescription: any) => {
    try {

      // Call backend to mark prescription as processed
      const response = await api.put(`/api/prescriptions/${prescription._id}/process`, {
        status: 'processing_at_reception'
      });

      if (response.status === 200) {
        toast.success("Prescription processing started");

      }
    } catch (error) {
      console.error("❌ Error processing prescription:", error);
      toast.error("Failed to process prescription");
    }
  };

  if (isLoading && patients.length === 0) { // Show loading only if truly loading and no patients yet
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading patients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Reception Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage patient flow and appointments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              formik.resetForm();
              setPatientToEdit(null);
              setRegistrationTab('new');
              setExpiredCardSearchQuery('');
              setExpiredCardSearchResults([]);
              setIsNewPatientModalOpen(true);
            }}
            className="flex items-center flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-primary-foreground shadow-md text-sm"
            type="button"
          >
            <Icon icon={UserPlusIcon} className="w-4 h-4 mr-1.5" />
            New Patient
          </Button>
          <Button
            variant="outline"
            className="flex items-center flex-1 sm:flex-none text-sm"
            onClick={handleOpenScheduleModal}
          >
            <Icon icon={CalendarIcon} className="w-4 h-4 mr-1.5" />
            Schedule
          </Button>
          <Link to="/app/reception/service-request" className="flex-1 sm:flex-none">
            <Button
              variant="outline"
              className="flex items-center w-full border-secondary/30 text-secondary-foreground hover:bg-secondary/10 text-sm"
            >
              <Icon icon={CalendarIcon} className="w-4 h-4 mr-1.5" />
              Services
            </Button>
          </Link>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer" onClick={() => queueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Waiting Patients</p>
              <h3 className="text-2xl font-bold text-primary">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-primary/30 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.waitingPatients
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {patients.filter(patient => patient.status === 'waiting').length - queuePatients.length > 0 &&
                  `${patients.filter(patient => patient.status === 'waiting').length - queuePatients.length} excluded from queue (unpaid card fee, unpaid invoice, or expired card)`
                }
              </p>
            </div>
            <div className="bg-primary/20 p-3 rounded-full">
              <Icon icon={ClockIcon} className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 cursor-pointer" onClick={() => navigate('/app/appointments')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Daily Appointments</p>
              <h3 className="text-2xl font-bold text-primary">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-primary/30 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.dailyAppointments
                )}
              </h3>
            </div>
            <div className="bg-primary/20 p-3 rounded-full">
              <Icon icon={CalendarIcon} className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 cursor-pointer" onClick={() => navigate('/app/staff-management')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Departments</p>
              <h3 className="text-2xl font-bold text-secondary-foreground">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-secondary/30 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.activeDepartments
                )}
              </h3>
            </div>
            <div className="bg-secondary/20 p-3 rounded-full">
              <Icon icon={UserGroupIcon} className="w-6 h-6 text-secondary-foreground" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 cursor-pointer" onClick={() => queueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Urgent Cases</p>
              <h3 className="text-2xl font-bold text-accent-foreground">
                {isLoadingStats ? (
                  <div className="animate-pulse bg-accent/30 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.urgentCases
                )}
              </h3>
            </div>
            <div className="bg-accent/20 p-3 rounded-full">
              <Icon icon={ExclamationCircleIcon} className="w-6 h-6 text-accent-foreground" />
            </div>
          </div>
        </Card>
      </div>

      {/* Unified Notification Panel */}
      <UnifiedNotificationPanel
        queuePatients={queuePatients}
        paymentNotifications={paymentNotifications}
        cardPaymentPendingPatients={patients.filter(p => (p as any).hasUnpaidCardInvoice === true)}
      />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6">
        {/* Patient Queue - Takes up full width */}
        <div ref={queueSectionRef}>
          <Card className="p-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {searchQuery ? 'Search Results' : 'Patient Queue'}
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      {queuePatients.length}
                    </span>
                  </h2>
                  {searchQuery ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      Showing results for "{searchQuery}" • {queuePatients.length} patient(s) found
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {queuePatients.length} patient{queuePatients.length !== 1 ? 's' : ''} waiting
                      {priorityFilter !== 'all' && <span className="ml-1 text-blue-600">• filtered by {priorityFilter}</span>}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <input
                      type="text"
                      placeholder="Search patients..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full"
                    />
                    <Icon icon={MagnifyingGlassIcon} className="w-4 h-4 text-muted-foreground/50 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                  {searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => handleSearchChange('')}>
                      Clear
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <Icon icon={ArrowPathIcon} className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Priority filter tabs */}
              {!searchQuery && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Filter:</span>
                  {(['all', 'normal', 'urgent', 'emergency'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${priorityFilter === p
                          ? p === 'all' ? 'bg-blue-600 text-white' :
                            p === 'emergency' ? 'bg-red-600 text-white' :
                              p === 'urgent' ? 'bg-orange-500 text-white' :
                                'bg-gray-600 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                      {p === 'all' ? `All (${queuePatientsForTabCounts.length})` :
                        p === 'emergency' ? `Emerg. (${queuePatientsForTabCounts.filter(pt => (pt.priority || '').toLowerCase() === 'emergency').length})` :
                          p === 'urgent' ? `Urgent (${queuePatientsForTabCounts.filter(pt => (pt.priority || '').toLowerCase() === 'urgent').length})` :
                            `Normal (${queuePatientsForTabCounts.filter(pt => ['normal', ''].includes((pt.priority || '').toLowerCase())).length})`
                      }
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-auto">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-10">#</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Patient ID</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground" onClick={() => handleSort('firstName')}>
                      <div className="flex items-center gap-1">
                        Patient
                        {sortField === 'firstName' ? (
                          sortDirection === 'asc' ? <Icon icon={ArrowUpIcon} className="w-3 h-3 text-blue-600" /> : <Icon icon={ArrowDownIcon} className="w-3 h-3 text-blue-600" />
                        ) : <span className="w-3 h-3 opacity-30">↕</span>}
                      </div>
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Age/Gender</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground" onClick={() => handleSort('department')}>
                      <div className="flex items-center gap-1">
                        Department
                        {sortField === 'department' ? (
                          sortDirection === 'asc' ? <Icon icon={ArrowUpIcon} className="w-3 h-3 text-blue-600" /> : <Icon icon={ArrowDownIcon} className="w-3 h-3 text-blue-600" />
                        ) : <span className="w-3 h-3 opacity-30">↕</span>}
                      </div>
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground" onClick={() => handleSort('time')}>
                      <div className="flex items-center gap-1">
                        Waiting Time
                        {sortField === 'time' ? (
                          sortDirection === 'asc' ? <Icon icon={ArrowUpIcon} className="w-3 h-3 text-blue-600" /> : <Icon icon={ArrowDownIcon} className="w-3 h-3 text-blue-600" />
                        ) : <span className="w-3 h-3 opacity-30">↕</span>}
                      </div>
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Card Status</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQueuePatients.length > 0 ? (
                    paginatedQueuePatients.map((patient, index) => {
                      const globalPosition = (queueCurrentPage - 1) * limit + index + 1;
                      const priority = (patient?.priority || 'normal').toLowerCase();
                      const waitMins = getWaitingTimeMinutes(getQueueJoinTime(patient));
                      const rowBg = priority === 'emergency'
                        ? 'bg-red-50 hover:bg-red-100/70'
                        : priority === 'urgent'
                          ? 'bg-orange-50 hover:bg-orange-100/70'
                          : waitMins >= 120
                            ? 'bg-yellow-50/60 hover:bg-yellow-100/60'
                            : 'hover:bg-muted/10';
                      const graceInfo = getGracePeriodDetails(patient);
                      const isCardExpired = graceInfo?.isExpired || patient.cardStatus === 'expired';

                      return (
                        <tr key={patient.id || patient._id || `patient-${index}`} className={`border-b transition-colors ${rowBg}`}>
                          {/* Position */}
                          <td className="py-3 px-3 text-sm text-muted-foreground font-mono text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${globalPosition === 1 ? 'bg-blue-100 text-blue-700' :
                                globalPosition === 2 ? 'bg-indigo-100 text-indigo-700' :
                                  globalPosition === 3 ? 'bg-purple-100 text-purple-700' :
                                    'bg-muted text-muted-foreground'
                              }`}>{globalPosition}</span>
                          </td>
                          {/* Patient ID */}
                          <td className="py-3 px-3 text-xs text-muted-foreground font-mono">
                            {patient?.patientId || patient?.id || 'N/A'}
                          </td>
                          {/* Patient Name */}
                          <td className="py-3 px-3">
                            <div className="font-medium text-sm">{patient?.firstName || ''} {patient?.lastName || ''}</div>
                            {patient?.contactNumber && (
                              <div className="text-xs text-muted-foreground">{patient.contactNumber}</div>
                            )}
                          </td>
                          {/* Age / Gender */}
                          <td className="py-3 px-3 text-sm">
                            <span>{patient?.age || '-'}</span>
                            {patient?.gender && (
                              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${(patient.gender || '').toLowerCase() === 'male' ? 'bg-blue-100 text-blue-700' :
                                  (patient.gender || '').toLowerCase() === 'female' ? 'bg-pink-100 text-pink-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                {(patient.gender || '').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </td>
                          {/* Department */}
                          <td className="py-3 px-3 text-sm">{patient?.department || '-'}</td>
                          {/* Waiting Time */}
                          <td className="py-3 px-3 text-sm">
                            <span className={getWaitingTimeColor(getQueueJoinTime(patient))}>
                              {calculateWaitingTime(getQueueJoinTime(patient) || new Date())}
                            </span>
                            {waitMins >= 60 && (
                              <div className="text-xs text-red-500 mt-0.5">Long wait</div>
                            )}
                          </td>
                          {/* Priority */}
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(patient?.priority)}`}>
                              {priority === 'emergency' ? '🚨 Emergency' :
                                priority === 'urgent' ? '⚠️ Urgent' :
                                  'Normal'}
                            </span>
                          </td>
                          {/* Card Status */}
                          <td className="py-3 px-3">
                            <Tooltip
                              title={
                                (() => {
                                  if (!graceInfo) {
                                    return patient?.cardIssueDate
                                      ? `Card issue date: ${new Date(patient.cardIssueDate).toLocaleDateString()}`
                                      : 'No card issue date available';
                                  }
                                  const issueDateStr = graceInfo.issueDate.toLocaleDateString();
                                  const graceEndStr = graceInfo.graceEnd.toLocaleDateString();
                                  if (graceInfo.isExpired) {
                                    return `Card Expired\nIssue Date: ${issueDateStr}\nGrace End Date: ${graceEndStr}\nDays Since Issue: ${graceInfo.daysSinceIssue}\nDays Overdue: ${graceInfo.daysSinceIssue - 15}`;
                                  } else if (graceInfo.isInGracePeriod) {
                                    return `Grace Period Active\nIssue Date: ${issueDateStr}\nGrace End Date: ${graceEndStr}\nDays Since Issue: ${graceInfo.daysSinceIssue}\nDays Left: ${graceInfo.daysLeft}`;
                                  } else {
                                    return `Card Active\nIssue Date: ${issueDateStr}\nGrace End Date: ${graceEndStr}\nStatus: Issued Today`;
                                  }
                                })()
                              }
                              arrow
                              placement="top"
                            >
                              <span className={`px-2 py-1 rounded-full text-xs cursor-help ${getCardStatusColor(patient)}`}>
                                {getCardStatusText(patient)}
                              </span>
                            </Tooltip>
                          </td>
                          {/* Actions */}
                          <td className="py-3 px-3">
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="View patient details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleQuickView(patient)}
                                  sx={{ backgroundColor: '#f0fdf4', color: '#16a34a', '&:hover': { backgroundColor: '#dcfce7' } }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit registration">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditPatientOpen(patient)}
                                  sx={{ backgroundColor: '#eef2ff', '&:hover': { backgroundColor: '#e0e7ff' } }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={
                                (() => {
                                  if (patient.hasActiveServiceRequests) {
                                    return "Patient already has active service requests";
                                  }
                                  if (isCardExpired) {
                                    const daysOverdue = graceInfo?.daysSinceIssue ? graceInfo.daysSinceIssue - 15 : 0;
                                    return `Card Expired - Cannot send to department. Card is ${daysOverdue} days overdue. Please renew the card first.`;
                                  }
                                  if (graceInfo?.isInGracePeriod) {
                                    return `Send to Department (Grace Period - ${graceInfo.daysLeft} days left)`;
                                  }
                                  if (patient.cardStatus === 'active' || graceInfo?.isActive) {
                                    return "Send to Department (Active Card - No Payment Required)";
                                  }
                                  return "Send to Department";
                                })()
                              }>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleSendToNurse(patient)}
                                  disabled={patient.hasActiveServiceRequests || isCardExpired}
                                  sx={{
                                    ...(patient.hasActiveServiceRequests || isCardExpired ? {
                                      opacity: 0.5,
                                      backgroundColor: '#e5e7eb',
                                      color: '#9ca3af',
                                      cursor: 'not-allowed',
                                      '&:hover': { backgroundColor: '#e5e7eb', cursor: 'not-allowed' }
                                    } : (patient.cardStatus === 'active' || graceInfo?.isActive || graceInfo?.isInGracePeriod ? {
                                      background: 'linear-gradient(45deg, #10b981, #059669)',
                                      color: 'white',
                                      '&:hover': { background: 'linear-gradient(45deg, #059669, #047857)' }
                                    } : {}))
                                  }}
                                >
                                  <ArrowForwardIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr key="no-patients">
                      <td colSpan={9} className="py-12 text-center">
                        <div className="flex flex-col items-center space-y-3">
                          <Icon icon={ClockIcon} className="w-12 h-12 text-muted-foreground/40" />
                          <div>
                            <p className="text-muted-foreground font-medium">No patients in queue</p>
                            <p className="text-muted-foreground/50 text-sm">
                              {queuePatients.length === 0
                                ? "There are currently no patients waiting to be seen."
                                : "No patients found on this page. Try going to page 1."
                              }
                            </p>
                          </div>
                          {queuePatients.length > 0 && queueCurrentPage > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(1)}
                              className="mt-2"
                            >
                              Go to First Page
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {queuePatients.length === 0 ? 0 : (queueCurrentPage - 1) * limit + 1} to {Math.min(queueCurrentPage * limit, queuePatients.length)} of {queuePatients.length} waiting patients
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={queueCurrentPage === 1}
                >
                  <Icon icon={ChevronLeftIcon} className="w-4 h-4" />
                </Button>
                {queueTotalPages > 0 && Array.from({ length: queueTotalPages }, (_, i) => i + 1).map(p => (
                  <Button
                    key={p}
                    variant={queueCurrentPage === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(queueTotalPages, prev + 1))}
                  disabled={queueCurrentPage === queueTotalPages || queueTotalPages === 0}
                >
                  <Icon icon={ChevronRightIcon} className="w-4 h-4" />
                </Button>
                <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setCurrentPage(1); }} className="ml-2 border rounded px-2 py-1">
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog
        open={isQuickViewOpen}
        onOpenChange={() => setIsQuickViewOpen(false)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Patient Details
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              {/* Header info */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                  {(selectedPatient.firstName || '?').charAt(0)}{(selectedPatient.lastName || '').charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-base">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedPatient.patientId || selectedPatient.id}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedPatient.priority)}`}>
                      {selectedPatient.priority || 'Normal'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCardStatusColor(selectedPatient)}`}>
                      {getCardStatusText(selectedPatient)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Age</label>
                  <p className="font-medium">{selectedPatient.age || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gender</label>
                  <p className="font-medium">{selectedPatient.gender || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</label>
                  <p className="font-medium">{selectedPatient.department || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</label>
                  <p className="font-medium">{selectedPatient.contactNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Waiting Since</label>
                  <p className={`font-medium ${getWaitingTimeColor(getQueueJoinTime(selectedPatient))}`}>
                    {calculateWaitingTime(getQueueJoinTime(selectedPatient) || new Date())}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                  <p className={`font-medium capitalize ${getStatusColor(selectedPatient.status)}`}>{selectedPatient.status || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned Doctor</label>
                  <p className="font-medium">{(selectedPatient as any).assignedDoctorName || 'Not assigned'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned Nurse</label>
                  <p className="font-medium">{(selectedPatient as any).assignedNurseName || 'Not assigned'}</p>
                </div>
              </div>

              {selectedPatient.hasActiveServiceRequests && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-blue-700 text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  This patient has active service requests in progress.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setIsQuickViewOpen(false); handleEditPatientOpen(selectedPatient); }}>
                  <EditIcon fontSize="small" className="mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsQuickViewOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Patient Registration Modal */}
      <Dialog
        open={isEditModalOpen}
        onOpenChange={() => setIsEditModalOpen(false)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Patient Registration</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">First Name</label>
                  <input
                    className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 px-3 py-2"
                    value={editForm.firstName || ''}
                    onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Last Name</label>
                  <input
                    className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 px-3 py-2"
                    value={editForm.lastName || ''}
                    onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Age</label>
                  <input
                    type="number"
                    min={0}
                    className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 px-3 py-2"
                    value={(editForm as any).age || ''}
                    onChange={(e) => handleEditFormChange('age' as any, Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Gender</label>
                  <select
                    className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 px-3 py-2"
                    value={editForm.gender || ''}
                    onChange={(e) => handleEditFormChange('gender', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Number</label>
                <input
                  className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 px-3 py-2"
                  value={editForm.contactNumber || ''}
                  onChange={(e) => handleEditFormChange('contactNumber', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Department</label>
                  <select
                    className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 px-3 py-2"
                    value={editForm.department || ''}
                    onChange={(e) => handleEditFormChange('department' as any, e.target.value)}
                  >
                    <option value="">Select department</option>
                    <option value="general">General Medicine</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="orthopedics">Orthopedics</option>
                    <option value="pediatrics">Pediatrics</option>
                    <option value="dental">Dental</option>
                    <option value="dermatology">Dermatology</option>
                    <option value="neurology">Neurology</option>
                    <option value="ophthalmology">Ophthalmology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Priority</label>
                  <select
                    className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 px-3 py-2"
                    value={(editForm as any).priority || 'normal'}
                    onChange={(e) => handleEditFormChange('priority' as any, e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-primary hover:bg-primary text-primary-foreground">
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isNewPatientModalOpen}
        onOpenChange={() => {
          setIsNewPatientModalOpen(false);
          formik.resetForm();
          setExpiredCardSearchQuery('');
          setExpiredCardSearchResults([]);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-lg font-bold">Patient Registration</DialogTitle>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex rounded-lg border border-border/40 overflow-hidden mx-0 mt-2">
            <button
              type="button"
              onClick={() => { setRegistrationTab('new'); formik.resetForm(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${registrationTab === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                }`}
            >
              <Icon icon={UserPlusIcon} className="w-4 h-4" />
              New Patient
            </button>
            <button
              type="button"
              onClick={() => { setRegistrationTab('renew'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${registrationTab === 'renew'
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                }`}
            >
              <Icon icon={ArrowPathIcon} className="w-4 h-4" />
              Renew Existing Card
            </button>
          </div>

          <div className="pt-2 pb-2">

            {/* ── TAB: NEW PATIENT ── */}
            {registrationTab === 'new' && (
              <form onSubmit={formik.handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formik.values.firstName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-lg border ${formik.touched.firstName && formik.errors.firstName ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-3 py-2`}
                      placeholder="Enter first name"
                    />
                    {formik.touched.firstName && formik.errors.firstName && (
                      <p className="mt-1 text-xs text-destructive">{String(formik.errors.firstName)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formik.values.lastName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-lg border ${formik.touched.lastName && formik.errors.lastName ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-3 py-2`}
                      placeholder="Enter last name"
                    />
                    {formik.touched.lastName && formik.errors.lastName && (
                      <p className="mt-1 text-xs text-destructive">{String(formik.errors.lastName)}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-muted-foreground mb-1">Age *</label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      min="0"
                      max="150"
                      value={formik.values.age}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-lg border ${formik.touched.age && formik.errors.age ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-3 py-2`}
                      placeholder="Enter age"
                    />
                    {formik.touched.age && formik.errors.age && (
                      <p className="mt-1 text-xs text-destructive">{String(formik.errors.age)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Gender *</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formik.values.gender}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`block w-full rounded-lg border ${formik.touched.gender && formik.errors.gender ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-3 py-2`}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {formik.touched.gender && formik.errors.gender && (
                      <p className="mt-1 text-xs text-destructive">{String(formik.errors.gender)}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Number *</label>
                  <input
                    type="text"
                    id="contactNumber"
                    name="contactNumber"
                    value={formik.values.contactNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`block w-full rounded-lg border ${formik.touched.contactNumber && formik.errors.contactNumber ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-3 py-2`}
                    placeholder="Enter contact number"
                  />
                  {formik.touched.contactNumber && formik.errors.contactNumber && (
                    <p className="mt-1 text-xs text-destructive">{String(formik.errors.contactNumber)}</p>
                  )}
                </div>

                {/* Card Selection */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Patient Card (Optional)</label>
                  <select
                    value={selectedCardTypeId}
                    onChange={(e) => setSelectedCardTypeId(e.target.value)}
                    className="block w-full rounded-lg border border-border/40 focus:ring-blue-500 focus:border-primary shadow-sm px-3 py-2"
                    style={{ WebkitAppearance: "menulist-button" }}
                  >
                    <option value="">No Card</option>
                    {cardTypes.map((cardType, index) => (
                      <option key={cardType._id || `cardtype-${index}`} value={cardType._id}>
                        {cardType.name} — ETB {cardType.price}
                      </option>
                    ))}
                  </select>
                  {selectedCardTypeId && (
                    <p className="mt-1 text-xs text-blue-600 font-medium">
                      Card fee will be added to registration invoice
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsNewPatientModalOpen(false); formik.resetForm(); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    disabled={isSubmitting}
                  >
                    <Icon icon={UserPlusIcon} className="w-4 h-4 mr-1.5" />
                    {isSubmitting ? 'Registering…' : 'Register Patient'}
                  </Button>
                </div>
              </form>
            )}

            {/* ── TAB: RENEW EXISTING CARD ── */}
            {registrationTab === 'renew' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                  <Icon icon={MagnifyingGlassIcon} className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                  <span>Search for any patient by name, ID, or phone. Only <strong>expired</strong> cards can be renewed — patients in their grace period still have an active card.</span>
                </div>

                {/* Live search input */}
                <div className="relative">
                  <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  {isSearchingExpiredCards && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500" />
                    </div>
                  )}
                  <input
                    type="text"
                    value={expiredCardSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpiredCardSearchQuery(val);
                      if (renewSearchDebounceRef.current) clearTimeout(renewSearchDebounceRef.current);
                      if (val.trim().length >= 2) {
                        renewSearchDebounceRef.current = setTimeout(() => searchExpiredCards(val), 350);
                      } else {
                        setExpiredCardSearchResults([]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (renewSearchDebounceRef.current) clearTimeout(renewSearchDebounceRef.current);
                        searchExpiredCards();
                      }
                    }}
                    placeholder="Type name, patient ID, or phone number…"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-border/40 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm"
                    autoFocus
                  />
                </div>

                {/* Results */}
                {!isSearchingExpiredCards && expiredCardSearchResults.length > 0 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    <p className="text-xs font-semibold text-muted-foreground px-1">
                      {expiredCardSearchResults.length} patient{expiredCardSearchResults.length > 1 ? 's' : ''} found
                    </p>
                    {expiredCardSearchResults.map((patient) => {
                      const graceInfo = getGracePeriodDetails(patient);
                      const normalizedStatus = (patient.cardStatus || '').toString().toLowerCase();
                      const isExpired = (graceInfo?.isExpired === true) || normalizedStatus === 'expired';
                      const isInGracePeriod = (graceInfo?.isInGracePeriod === true) || normalizedStatus === 'grace';
                      const isActive = !isExpired && !isInGracePeriod && (patient.cardType || patient.cardStatus);
                      const hasCard = !!(patient.cardType || patient.cardStatus);
                      const daysOverdue = isExpired ? Math.max(0, (graceInfo?.daysSinceIssue ?? 0) - 15) : 0;
                      const daysLeft = graceInfo?.daysLeft ?? 0;
                      const cardTypeName = typeof patient.cardType === 'object'
                        ? (patient.cardType as any)?.name
                        : cardTypes.find(ct => ct._id === patient.cardType)?.name || patient.cardType;

                      return (
                        <div
                          key={(patient as any)._id || patient.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isExpired
                              ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                              : isInGracePeriod
                                ? 'border-amber-200 bg-amber-50/40'
                                : 'border-border/40 bg-white'
                            }`}
                        >
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isExpired ? 'bg-red-100 text-red-700' : isInGracePeriod ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {(patient.firstName || '?').charAt(0).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{patient.firstName} {patient.lastName}</span>
                              {isExpired ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">EXPIRED</span>
                              ) : isInGracePeriod ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">GRACE — Active</span>
                              ) : hasCard ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">ACTIVE</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">NO CARD</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                              <span className="font-mono">{patient.patientId}</span>
                              {patient.contactNumber && <span>{patient.contactNumber}</span>}
                              {cardTypeName && <span className="text-blue-600 font-medium">{cardTypeName}</span>}
                              {isExpired && daysOverdue > 0 && <span className="text-red-600 font-medium">{daysOverdue}d overdue</span>}
                              {isInGracePeriod && daysLeft > 0 && <span className="text-amber-600 font-medium">{daysLeft}d grace left</span>}
                            </div>
                          </div>

                          {/* Action */}
                          {isExpired ? (
                            <Button
                              size="sm"
                              onClick={() => handleSelectExpiredCardPatient(patient, 'renew')}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 flex-shrink-0"
                            >
                              <Icon icon={ArrowPathIcon} className="w-3.5 h-3.5 mr-1" />
                              Renew
                            </Button>
                          ) : isInGracePeriod ? (
                            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex-shrink-0 font-medium">
                              Still Active
                            </span>
                          ) : isActive ? (
                            <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 flex-shrink-0 font-medium">
                              Valid Card
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSelectExpiredCardPatient(patient, 'renew')}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 flex-shrink-0"
                            >
                              Issue Card
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Loading state */}
                {isSearchingExpiredCards && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Searching…
                  </div>
                )}

                {/* No results */}
                {!isSearchingExpiredCards && expiredCardSearchResults.length === 0 && expiredCardSearchQuery.trim().length >= 2 && (
                  <div className="text-center py-8 border border-dashed rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">No patients found</p>
                    <p className="text-xs text-muted-foreground mt-1">Try a different name, ID, or phone number</p>
                  </div>
                )}

                {/* Empty state before search */}
                {!isSearchingExpiredCards && expiredCardSearchResults.length === 0 && expiredCardSearchQuery.trim().length < 2 && (
                  <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground">
                    <Icon icon={MagnifyingGlassIcon} className="w-9 h-9 mx-auto mb-2 opacity-25" />
                    <p className="text-sm">Type at least 2 characters to search</p>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button variant="outline" onClick={() => { setIsNewPatientModalOpen(false); setExpiredCardSearchQuery(''); setExpiredCardSearchResults([]); }}>
                    Close
                  </Button>
                </div>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isConfirmSendNurseDialogOpen}
        onOpenChange={cancelSendToNurse}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Patient to Medical Staff</DialogTitle>
          </DialogHeader>
          {patientToSendToNurse && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Assign {patientToSendToNurse.firstName} {patientToSendToNurse.lastName} to a nurse and doctor:
              </p>

              <div className="space-y-3 mt-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Select Doctor</label>
                  <select
                    className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2"
                    value={selectedDoctorId || ''}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                  >
                    <option key="select-doctor-default" value="" disabled>-- Select Doctor --</option>
                    {doctors.map((doctor, index) => {
                      const value = doctor.id || doctor._id as string;
                      const label = doctor.firstName || doctor.lastName
                        ? `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
                        : (doctor.name ? `Dr. ${doctor.name}` : 'Dr.');
                      return (
                        <option key={value || `doctor-${index}`} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Select Nurse</label>
                  <select
                    className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2"
                    value={selectedNurseId || ''}
                    onChange={(e) => setSelectedNurseId(e.target.value)}
                  >
                    <option key="select-nurse-default" value="" disabled>-- Select Nurse --</option>
                    {Array.isArray(nurses) && nurses.map((nurse, index) => (
                      <option key={nurse.id || nurse._id || `nurse-${index}`} value={nurse.id || nurse._id}>
                        {nurse.firstName} {nurse.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 mt-4">
                <Button variant="outline" onClick={cancelSendToNurse}>
                  Cancel
                </Button>
                <Button onClick={confirmSendToNurse} className="bg-primary hover:bg-primary text-primary-foreground">
                  Confirm Assignment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleModalOpen} onOpenChange={() => setIsScheduleModalOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={scheduleFormik.handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-muted-foreground mb-2">Patient</label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNewPatientModalOpen(true);
                    setIsScheduleModalOpen(false);
                  }}
                  className="ml-2"
                >
                  <Icon icon={UserPlusIcon} className="w-4 h-4 mr-1" />
                  New Patient
                </Button>
              </div>
              <div className="relative patient-search-container">
                <input
                  type="text"
                  placeholder={isLoadingPatientsForSelect ? 'Loading patients...' : 'Search patients...'}
                  className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2 pr-10"
                  value={patientSearchTerm || (scheduleFormik.values.patientId ?
                    patientsForSelect.find(p => (p._id || p.id) === scheduleFormik.values.patientId)?.firstName + ' ' +
                    patientsForSelect.find(p => (p._id || p.id) === scheduleFormik.values.patientId)?.lastName +
                    ' (' + (patientsForSelect.find(p => (p._id || p.id) === scheduleFormik.values.patientId)?.patientId || 'N/A') + ')' :
                    '')}
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filteredPatients = patientsForSelect.filter(patient =>
                      patient.firstName?.toLowerCase().includes(searchTerm) ||
                      patient.lastName?.toLowerCase().includes(searchTerm) ||
                      patient.patientId?.toLowerCase().includes(searchTerm)
                    );
                    setFilteredPatientsForSelect(filteredPatients);
                    setPatientSearchTerm(searchTerm);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  disabled={isLoadingPatientsForSelect}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {scheduleFormik.values.patientId && (
                    <button
                      type="button"
                      onClick={() => {
                        scheduleFormik.setFieldValue('patientId', '');
                        setPatientSearchTerm('');
                        setShowPatientDropdown(false);
                      }}
                      className="mr-2 text-muted-foreground/50 hover:text-muted-foreground"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <Icon icon={MagnifyingGlassIcon} className="h-4 w-4 text-muted-foreground/50" />
                </div>

                {/* Patient Search Dropdown */}
                {showPatientDropdown && !isLoadingPatientsForSelect && (
                  <div className="absolute z-10 w-full mt-1 bg-primary-foreground border border-border/40 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPatientsForSelect.length > 0 ? (
                      filteredPatientsForSelect.map((patient, index) => (
                        <div
                          key={patient._id || patient.id || `patient-select-${index}`}
                          className="px-4 py-2 hover:bg-muted/20 cursor-pointer border-b border-border/20 last:border-b-0"
                          onClick={() => {
                            scheduleFormik.setFieldValue('patientId', patient._id || patient.id);
                            setShowPatientDropdown(false);
                            setPatientSearchTerm('');
                          }}
                        >
                          <div className="font-medium text-muted-foreground">
                            {patient?.firstName || ''} {patient?.lastName || ''}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {patient?.patientId || 'N/A'} • Age: {patient?.age || 'N/A'} • {patient?.contactNumber || 'No contact'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-muted-foreground text-sm">
                        {patientSearchTerm ? 'No patients found' : 'Start typing to search patients...'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {scheduleFormik.touched.patientId && scheduleFormik.errors.patientId && (
                <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.patientId)}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Doctor</label>
                <select
                  id="doctorId"
                  name="doctorId"
                  value={scheduleFormik.values.doctorId}
                  onChange={scheduleFormik.handleChange}
                  onBlur={scheduleFormik.handleBlur}
                  className={`block w-full rounded-lg border ${scheduleFormik.touched.doctorId && scheduleFormik.errors.doctorId
                      ? 'border-destructive/40 focus:ring-red-500'
                      : 'border-border/40 focus:ring-blue-500'
                    } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
                  disabled={isLoadingDoctorsForSelect}
                >
                  <option value="">{isLoadingDoctorsForSelect ? 'Loading...' : '-- Select Doctor --'}</option>
                  {doctorsForSelect.map((doctor, index) => (
                    <option key={doctor._id || doctor.id || `doctor-select-${index}`} value={doctor._id || doctor.id}>
                      Dr. {doctor.firstName} {doctor.lastName}
                    </option>
                  ))}
                </select>
                {scheduleFormik.touched.doctorId && scheduleFormik.errors.doctorId && (
                  <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.doctorId)}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Date</label>
                  <input
                    type="date"
                    id="appointmentDate"
                    name="appointmentDate"
                    value={scheduleFormik.values.appointmentDate}
                    onChange={scheduleFormik.handleChange}
                    onBlur={scheduleFormik.handleBlur}
                    className={`block w-full rounded-lg border ${scheduleFormik.touched.appointmentDate && scheduleFormik.errors.appointmentDate
                        ? 'border-destructive/40 focus:ring-red-500'
                        : 'border-border/40 focus:ring-blue-500'
                      } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {scheduleFormik.touched.appointmentDate && scheduleFormik.errors.appointmentDate && (
                    <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.appointmentDate)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Time</label>
                  <input
                    type="time"
                    id="appointmentTime"
                    name="appointmentTime"
                    value={scheduleFormik.values.appointmentTime}
                    onChange={scheduleFormik.handleChange}
                    onBlur={scheduleFormik.handleBlur}
                    className={`block w-full rounded-lg border ${scheduleFormik.touched.appointmentTime && scheduleFormik.errors.appointmentTime
                        ? 'border-destructive/40 focus:ring-red-500'
                        : 'border-border/40 focus:ring-blue-500'
                      } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
                  />
                  {scheduleFormik.touched.appointmentTime && scheduleFormik.errors.appointmentTime && (
                    <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.appointmentTime)}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Appointment Type</label>
                <select
                  id="type"
                  name="type"
                  value={scheduleFormik.values.type}
                  onChange={(e) => {
                    scheduleFormik.handleChange(e);
                    // Reset service selections when appointment type changes
                    scheduleFormik.setFieldValue('selectedLabService', '');
                    scheduleFormik.setFieldValue('selectedImagingService', '');
                  }}
                  onBlur={scheduleFormik.handleBlur}
                  className={`block w-full rounded-lg border ${scheduleFormik.touched.type && scheduleFormik.errors.type
                      ? 'border-destructive/40 focus:ring-red-500'
                      : 'border-border/40 focus:ring-blue-500'
                    } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
                >
                  <option value="">-- Select Type --</option>
                  {appointmentTypes.map((type, index) => (
                    <option key={type.value || `appointment-type-${index}`} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {scheduleFormik.touched.type && scheduleFormik.errors.type && (
                  <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.type)}</p>
                )}
              </div>

              {/* Lab Service Selection */}
              {scheduleFormik.values.type === 'lab-test' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Select Lab Test *</label>
                  <select
                    id="selectedLabService"
                    name="selectedLabService"
                    value={scheduleFormik.values.selectedLabService}
                    onChange={scheduleFormik.handleChange}
                    onBlur={scheduleFormik.handleBlur}
                    className={`block w-full rounded-lg border ${scheduleFormik.touched.selectedLabService && scheduleFormik.errors.selectedLabService
                        ? 'border-destructive/40 focus:ring-red-500'
                        : 'border-border/40 focus:ring-blue-500'
                      } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
                    disabled={isLoadingServices}
                  >
                    <option value="">{isLoadingServices ? 'Loading lab tests...' : '-- Select Lab Test --'}</option>
                    {labServices.map((service, index) => (
                      <option key={service._id || `lab-service-${index}`} value={service._id}>
                        {service.name} - ${service.price}
                      </option>
                    ))}
                  </select>
                  {scheduleFormik.touched.selectedLabService && scheduleFormik.errors.selectedLabService && (
                    <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.selectedLabService)}</p>
                  )}
                </div>
              )}

              {/* Imaging Service Selection */}
              {scheduleFormik.values.type === 'imaging' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Select Imaging Study *</label>
                  <select
                    id="selectedImagingService"
                    name="selectedImagingService"
                    value={scheduleFormik.values.selectedImagingService}
                    onChange={scheduleFormik.handleChange}
                    onBlur={scheduleFormik.handleBlur}
                    className={`block w-full rounded-lg border ${scheduleFormik.touched.selectedImagingService && scheduleFormik.errors.selectedImagingService
                        ? 'border-destructive/40 focus:ring-red-500'
                        : 'border-border/40 focus:ring-blue-500'
                      } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
                    disabled={isLoadingServices}
                  >
                    <option value="">{isLoadingServices ? 'Loading imaging studies...' : '-- Select Imaging Study --'}</option>
                    {imagingServices.map((service, index) => (
                      <option key={service._id || `imaging-service-${index}`} value={service._id}>
                        {service.name} - ${service.price}
                      </option>
                    ))}
                  </select>
                  {scheduleFormik.touched.selectedImagingService && scheduleFormik.errors.selectedImagingService && (
                    <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.selectedImagingService)}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Reason *</label>
                <input
                  type="text"
                  id="reason"
                  name="reason"
                  value={scheduleFormik.values.reason}
                  onChange={scheduleFormik.handleChange}
                  onBlur={scheduleFormik.handleBlur}
                  className={`block w-full rounded-lg border ${scheduleFormik.touched.reason && scheduleFormik.errors.reason
                      ? 'border-destructive/40 focus:ring-red-500'
                      : 'border-border/40 focus:ring-blue-500'
                    } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
                  placeholder="Brief reason for appointment"
                  required
                />
                {scheduleFormik.touched.reason && scheduleFormik.errors.reason && (
                  <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.reason)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={scheduleFormik.values.notes}
                  onChange={scheduleFormik.handleChange}
                  onBlur={scheduleFormik.handleBlur}
                  rows={2}
                  className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2"
                  placeholder="Additional notes or instructions"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScheduleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary text-primary-foreground disabled:bg-muted/50"
                disabled={scheduleFormik.isSubmitting || !scheduleFormik.isValid}
              >
                {scheduleFormik.isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Card Renewal Modal */}
      <Modal show={isRenewCardModalOpen} onHide={() => setIsRenewCardModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Renew Patient Card</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {patientToRenewCard && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Patient</Form.Label>
                <Form.Control
                  type="text"
                  value={`${patientToRenewCard.firstName} ${patientToRenewCard.lastName}`}
                  disabled
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Card Type</Form.Label>
                <Form.Control
                  type="text"
                  value={(patientToRenewCard as any).cardStatus?.cardType || 'Basic'}
                  disabled
                />
                <Form.Text className="text-muted">
                  {cardTypes.find(card => card.value === (patientToRenewCard as any).cardStatus?.cardType)?.value || 'Basic'}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Renewal Amount</Form.Label>
                <Form.Control
                  type="number"
                  value={renewalAmount}
                  onChange={(e) => setRenewalAmount(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Payment Method</Form.Label>
                <Form.Select
                  value={renewalPaymentMethod}
                  onChange={(e) => setRenewalPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="insurance">Insurance</option>
                  <option value="mobileMoney">Mobile Money</option>
                  <option value="bankTransfer">Bank Transfer</option>
                </Form.Select>
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setIsRenewCardModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="default" onClick={confirmRenewCard}>
            Renew Card
          </Button>
        </Modal.Footer>
      </Modal>


      {/* Renew Expired Card Modal */}
      <Dialog
        open={isRenewExpiredCardModalOpen}
        onOpenChange={(open) => {
          setIsRenewExpiredCardModalOpen(open);
          if (!open) {
            setSelectedExpiredCardPatient(null);
            setExpiredCardRenewalAmount('');
            setExpiredCardRenewalPaymentMethod('Cash');
            setExpiredCardPatientCardId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Icon icon={ArrowPathIcon} className="w-5 h-5 text-amber-500" />
              Renew Expired Card
            </DialogTitle>
          </DialogHeader>
          {selectedExpiredCardPatient && (() => {
            const graceInfo = getGracePeriodDetails(selectedExpiredCardPatient as any);
            const cardTypeName = typeof (selectedExpiredCardPatient as any).cardType === 'object'
              ? (selectedExpiredCardPatient as any).cardType?.name
              : cardTypes.find(ct => ct._id === (selectedExpiredCardPatient as any).cardType)?.name || (selectedExpiredCardPatient as any).cardType;
            return (
              <div className="p-6 space-y-5">
                {/* Patient info card */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {(selectedExpiredCardPatient.firstName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-base">
                        {selectedExpiredCardPatient.firstName} {selectedExpiredCardPatient.lastName}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">EXPIRED</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                      <span>ID: <span className="font-mono font-medium text-foreground">{selectedExpiredCardPatient.patientId}</span></span>
                      {selectedExpiredCardPatient.contactNumber && (
                        <span>Phone: <span className="font-medium text-foreground">{selectedExpiredCardPatient.contactNumber}</span></span>
                      )}
                      {cardTypeName && (
                        <span>Card Type: <span className="font-medium text-blue-600">{cardTypeName}</span></span>
                      )}
                      {graceInfo && (
                        <span>Expired: <span className="font-medium text-red-600">{Math.max(0, (graceInfo.daysSinceIssue ?? 0) - 15)}d ago</span></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Renewal form */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold mb-1.5">
                      Renewal Amount (ETB) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={expiredCardRenewalAmount}
                      onChange={(e) => setExpiredCardRenewalAmount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border/40 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm"
                      placeholder="e.g. 200"
                      min="0"
                      step="0.01"
                      autoFocus
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold mb-1.5">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={expiredCardRenewalPaymentMethod}
                      onChange={(e) => setExpiredCardRenewalPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border/40 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Mobile Money">Mobile Money</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-border/30">
                  <Button
                    variant="outline"
                    onClick={() => setIsRenewExpiredCardModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmRenewExpiredCard}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-6"
                    disabled={!expiredCardRenewalAmount || Number(expiredCardRenewalAmount) <= 0}
                  >
                    <Icon icon={ArrowPathIcon} className="w-4 h-4 mr-2" />
                    Renew Card
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Beautiful Payment Required Modal */}
      {isPaymentModalOpen && paymentNotificationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-primary-foreground rounded-xl shadow-xl max-w-sm w-full mx-auto transform transition-all duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-primary-foreground p-4 rounded-t-xl">
              <div className="flex items-center space-x-2">
                <div className="bg-primary-foreground bg-opacity-20 rounded-full p-1.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">Payment Required</h3>
                  <p className="text-destructive/20 text-xs">Patient: {paymentNotificationData.patientName}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div className="bg-destructive/10 border-l-4 border-destructive/50 p-3 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-destructive/50" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <p className="text-xs text-destructive font-medium">
                      Cannot assign patient to medical staff
                    </p>
                    <p className="text-xs text-destructive mt-1">
                      Payment required before assignment
                    </p>
                  </div>
                </div>
              </div>

              {paymentNotificationData.invoices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center">
                    <svg className="w-4 h-4 mr-1 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Outstanding Invoices
                  </h4>

                  <div className="bg-muted/10 rounded-lg p-3 space-y-2">
                    {paymentNotificationData.invoices.map((invoice: any, index: number) => (
                      <div key={invoice.id || `invoice-${index}`} className="flex justify-between items-center py-1.5 px-2 bg-primary-foreground rounded border border-border/30">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground capitalize">{invoice.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-destructive">${(invoice.balance || invoice.total || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}

                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center font-bold text-sm">
                        <span className="text-muted-foreground">Total Amount Due:</span>
                        <span className="text-destructive">${paymentNotificationData.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-primary/10 border-l-4 border-primary/50 p-2 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-primary/50" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <p className="text-xs text-primary font-medium">What to do next:</p>
                    <p className="text-xs text-primary mt-1">
                      Process payment at Reception before assignment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-muted/10 px-4 py-3 rounded-b-xl flex justify-between">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-muted-foreground font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Keep the payment modal open and show the payment form
                  if (paymentNotificationData && paymentNotificationData.invoices && paymentNotificationData.invoices.length > 0) {
                    const selectedInvoiceForPayment = paymentNotificationData.invoices[0];

                    // Extract patient ID correctly from multiple possible sources
                    // Use MongoDB ObjectId (from .patient field) instead of display ID (from .patientId field)
                    const patientId = selectedInvoiceForPayment.patient ||
                      (patientToSendToNurse?._id || patientToSendToNurse?.id) ||
                      (paymentNotificationData.patientId) ||
                      selectedInvoiceForPayment.patientId;

                    if (!patientId) {
                      toast.error('Cannot process payment: Missing patient ID');
                      return;
                    }

                    // Create a new object with all the invoice properties plus the patientId
                    setSelectedInvoiceForPayment({
                      ...selectedInvoiceForPayment,
                      patientId: patientId
                    });

                    setShowPaymentForm(true);
                  } else {
                    toast.error('No invoice found for payment');
                  }
                }}
                className="px-4 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-primary-foreground rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium transition-all shadow-md"
              >
                Process Payment
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoiceForPayment && (
        <RecordPaymentForm
          invoiceId={selectedInvoiceForPayment.invoiceNumber || selectedInvoiceForPayment.id || selectedInvoiceForPayment.invoiceId}
          patientId={selectedInvoiceForPayment.patient || selectedInvoiceForPayment.patientId}
          currentBalance={selectedInvoiceForPayment.balance || selectedInvoiceForPayment.total || 0}
          totalAmount={selectedInvoiceForPayment.total || 0}
          onSuccess={(updatedInvoice) => {
            setShowPaymentForm(false);
            setIsPaymentModalOpen(false);

            // Store the payment ID in local storage if available
            if (paymentNotificationData && paymentNotificationData.paymentRequirementId) {
              addProcessedPaymentId(paymentNotificationData.paymentRequirementId);
              setProcessedPaymentIds(prevIds => [...prevIds, paymentNotificationData.paymentRequirementId as string]);
            }

            toast('Payment recorded successfully!', { icon: '✅' });

            // Refresh patient data to ensure we have the latest status
            fetchPatients();

            // Wait a moment for the backend to process the payment
            setTimeout(() => {
              // Try to send patient to nurse again
              if (patientToSendToNurse) {
                proceedWithNurseAssignment();
              }
            }, 1000);
          }}
          onClose={() => {
            setShowPaymentForm(false);
          }}
        />
      )}

    </div>
  );
};

export default ReceptionDashboard;