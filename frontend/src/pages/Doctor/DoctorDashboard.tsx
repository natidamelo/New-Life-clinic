import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../../config';
import {
  ClipboardList as AssignmentIcon,
  Beaker as ScienceIcon,
  Camera as CameraIcon,
  Heart as HeartIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  Bell as BellIcon,
  Settings as CogIcon,
  FileText as DocumentTextIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Search as MagnifyingGlassIcon,
  Plus as PlusIcon,
  Thermometer as ThermometerIcon,
  Heart as HeartBeatIcon,
  Cloud as LungsIcon,
  Waves as Waves,
  ClipboardIcon,
  ArrowLeftIcon as ArrowBack,
} from 'lucide-react';
import { RefreshCw, Activity, Pill, AlertTriangle, ListChecks, TrendingUp, Search, User as LucideUser, Clock as LucideClock, FileText as LucideFileText, Stethoscope as LucideStethoscope, ArrowUpDown, FlaskConical, Sun, Moon, Link as LinkIcon, Stethoscope, ClipboardList } from 'lucide-react';
import attendanceService from '../../services/attendanceService';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSafeTheme } from '../../hooks/useSafeTheme'; // Import safe theme hook
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AUTH_TOKEN_KEY, USER_DATA_KEY } from '../../config';
import api from '../../services/apiService'; // Add missing api import

// Import lab components
import PatientLabResultsList from '../../components/doctor/PatientLabResultsList';
import ImagingResultsList from '../../components/doctor/ImagingResultsList';
import { PatientLabResults } from '../../services/labService';

// Import utility functions
import { formatDate, formatTime, formatDateTime } from '../../utils/formatters';
import { clearLocalStorageCache, forcePageRefresh } from '../../utils/clearCache';

// Import components
// import PatientHistoryModal from '../../components/doctor/PatientHistoryModal'; 
import ProfessionalPrescriptionForm from '../../components/doctor/ProfessionalPrescriptionForm';
import LabRequestForm from '../../components/doctor/LabRequestForm';
import MedicalRecordSection from '../../components/doctor/MedicalRecordSection';
import { ModernMedicalRecordForm } from '../../components/doctor/nextgen/ModernMedicalRecordForm';
import PlaceholderImage from '../../components/common/PlaceholderImage';

// Import services
import patientService, { Patient as PatientType } from '../../services/patientService';
import { notificationService, Notification as NotificationType } from '../../services/notificationService';
import { prescriptionAPI } from '../../services/api';
import prescriptionService, { PrescriptionCreateDto } from '../../services/prescriptionService';
import labService, { getLabOrdersByPatient, submitBulkLabOrder } from '../../services/labService';
import nurseTaskService from '../../services/nurseTaskService';
import imagingService from '../../services/imagingService';

// Import UI components
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';

// Import types
import { Prescription } from '../../types/prescription';

// Active patients list: show 10 per page, sorted by latest
const ACTIVE_PATIENTS_PAGE_SIZE = 10;

// Helper function to remove duplicate patients by ID
const removeDuplicatePatients = (patients: PatientType[]): PatientType[] => {
  const uniqueIds = new Set<string>();
  return patients.filter(patient => {
    // Handle both id and _id fields
    const patientId = patient.id || patient._id;
    if (!patientId) {
      console.warn("Patient missing ID during duplicate check:", patient);
      return false;
    }
    if (uniqueIds.has(patientId)) {
      console.log(`Removing duplicate patient: ${patient.firstName} ${patient.lastName}, ID: ${patientId}`);
      return false;
    } else {
      uniqueIds.add(patientId);
      return true;
    }
  });
};

// Helper function to format patient IDs consistently
const formatPatientId = (rawId: string): string => {
  if (!rawId) return 'N/A';

  // If it's already a standardized patient ID (starts with 'P'), return it as is
  if (rawId.startsWith('P')) return rawId;

  // If it's already in the correct format (starts with 'p'), return it
  if (/^p\d{4,}$/.test(rawId)) return rawId;

  // For ObjectIds or other formats, preserve the original ID
  return rawId;
};

// Helper function to format vitals consistently
const formatVitalsDisplay = (vitals: any) => {
  if (!vitals) return null;

  const formattedVitals = [];

  if (vitals.temperature) {
    const tempValue = vitals.temperature.includes('°') ? vitals.temperature : `${vitals.temperature}°C`;
    formattedVitals.push({
      icon: '🌡',
      value: tempValue,
      title: 'Temperature'
    });
  }

  if (vitals.heartRate) {
    const hrValue = vitals.heartRate.includes('bpm') ? vitals.heartRate : `${vitals.heartRate} bpm`;
    formattedVitals.push({
      icon: '❤️',
      value: hrValue,
      title: 'Heart Rate'
    });
  }

  if (vitals.bloodPressure) {
    formattedVitals.push({
      icon: '🩺',
      value: vitals.bloodPressure,
      title: 'Blood Pressure'
    });
  }

  if (vitals.respiratoryRate) {
    const rrValue = vitals.respiratoryRate.includes('rpm') || vitals.respiratoryRate.includes('/min')
      ? vitals.respiratoryRate
      : `${vitals.respiratoryRate}/min`;
    formattedVitals.push({
      icon: '💨',
      value: rrValue,
      title: 'Respiratory Rate'
    });
  }

  if (vitals.oxygenSaturation) {
    const o2Value = vitals.oxygenSaturation.includes('%') ? vitals.oxygenSaturation : `${vitals.oxygenSaturation}%`;
    formattedVitals.push({
      icon: '🫁',
      value: o2Value,
      title: 'Oxygen Saturation'
    });
  }

  return formattedVitals;
};

// Types (Restored from previous state)
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit?: string;
  status: 'waiting' | 'in-progress' | 'completed' | 'Admitted' | 'scheduled' | 'Discharged' | 'Outpatient' | 'Emergency' | 'Active';
  photo?: string;
  email?: string;
  phone?: string;
  contactNumber?: string;
  lastVitalsUpdate?: string;
  assignedDoctorId?: string;
  assignedNurseId?: string;
  patientId?: string;
  vitals?: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    timestamp?: string;
  };
  chiefComplaint?: {
    description: string;
  };
  assignedNurseName?: string;
  lastVitalsTimestamp?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  type: 'New Patient' | 'Follow-up' | 'Consultation' | 'Check-up' | 'Emergency';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  notes?: string;
  duration: number; // in minutes
}

interface DashboardStats {
  patientsToday: number;
  pendingReports: number;
  completedAppointments: number;
  labResults: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  date: string;
  read: boolean;
  data?: any;
}

interface PrescriptionData {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  refills: number;
  deaNumber?: string;
  instructions?: string;
}

interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  lastVisit?: string;
  medications?: string[];
}

interface LabResult {
  _id: string;
  testName: string;
  category: string;
  patientId: string;
  patientName: string;
  orderedBy: string;
  orderDate: string;
  resultDate: string;
  results: Record<string, any>;
  notes?: string;
  status: string;
}

// Define props interface for DoctorDashboard
interface DoctorDashboardProps {
  initialTab?: 'patients' | 'my-appointments' | 'appointments' | 'lab-results' | 'imaging-results' | 'prescriptions' | 'Medical Records' | 'completed-patients';
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ initialTab = 'patients' }) => {
  const { user, getToken, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Debug user data
  console.log('🔍 [DoctorDashboard] User data:', {
    user,
    userId: user?.id,
    user_id: user?._id,
    userName: user?.name,
    userRole: user?.role,
    isAuthenticated
  });
  // Safely get theme context with fallback
  const { isDarkMode } = useSafeTheme();

  // Debug: Log the full user object to check authentication state
  console.log('[DoctorDashboard] Auth user:', user);
  console.log('[DoctorDashboard] User ID:', user?.id || user?._id);

  // Check for user ID
  useEffect(() => {
    if (user && !user.id && user._id) {
      console.log('[DoctorDashboard] User has _id but no id property. This might cause issues in some components.');
    }
  }, [user]);

  // Check for authentication and redirect if needed
  useEffect(() => {
    const token = getToken();
    if (!token || !user) {
      console.error('No authentication token or user data found, redirecting to login...');
      // Use Navigate for redirection in React Router v6
      window.location.href = '/login';
    }
  }, [user, getToken]);

  // Automatic attendance tracking
  useEffect(() => {
    const loadAttendanceStatus = async () => {
      try {
        const status = await attendanceService.getMyAttendanceStatus();
        setAttendanceStatus(status.status);
        setLastActivity(status.lastActivity || '');
      } catch (error) {
        console.error('Error loading attendance status:', error);
        setAttendanceStatus('absent');
      }
    };

    loadAttendanceStatus();

    // Start automatic activity tracking
    attendanceService.startActivityTracking();

    return () => {
      attendanceService.stopActivityTracking();
    };
  }, []);

  // Add dialog state variables
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false);
  const [isLabRequestModalOpen, setIsLabRequestModalOpen] = useState(false);
  const [isImagingDialogOpen, setIsImagingDialogOpen] = useState(false);
  const [isLabResultsModalOpen, setIsLabResultsModalOpen] = useState(false);

  // State declarations (Restored Initializers)
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    patientsToday: 0,
    pendingReports: 0,
    completedAppointments: 0,
    labResults: 0
  });
  const [selectedPatientForAction, setSelectedPatientForAction] = useState<PatientType | null>(null);
  const [activeTab, setActiveTab] = useState<'patients' | 'my-appointments' | 'appointments' | 'lab-results' | 'imaging-results' | 'prescriptions' | 'Medical Records' | 'completed-patients'>(initialTab as any);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [groupedLabResults, setGroupedLabResults] = useState<PatientLabResults[]>([]);
  const [labResultsLoading, setLabResultsLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [prescriptionsPage, setPrescriptionsPage] = useState(1);
  const [prescriptionsTotalPages, setPrescriptionsTotalPages] = useState(1);
  const [selectedPatientObject, setSelectedPatientObject] = useState<PatientType | null>(null);
  const [showOldMedicalRecord, setShowOldMedicalRecord] = useState(false);
  const [isMedicalRecordOpen, setIsMedicalRecordOpen] = useState(false);
  const [isLoadingMedicalRecord, setIsLoadingMedicalRecord] = useState(false);
  const [showMedicalRecordsModal, setShowMedicalRecordsModal] = useState(false);
  const [viewedPatients, setViewedPatients] = useState<Set<string>>(new Set());

  // Add loading states
  const [isLoadingPrescription, setIsLoadingPrescription] = useState(false);
  const [isLoadingLab, setIsLoadingLab] = useState(false);
  const [isLoadingImaging, setIsLoadingImaging] = useState(false);
  const [isLoadingHistoryTaking, setIsLoadingHistoryTaking] = useState(false);
  const [isSubmittingLab, setIsSubmittingLab] = useState(false);
  const [isImportingPatient, setIsImportingPatient] = useState(false);

  // Add error states
  const [error, setError] = useState<string | null>(null);

  // Add status filter state
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Add imaging form state variables
  const [imagingType, setImagingType] = useState('X-Ray');
  const [bodyPart, setBodyPart] = useState('');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [imagingPriority, setImagingPriority] = useState<'Routine' | 'Urgent' | 'STAT'>('Routine');
  const [imagingLaterality, setImagingLaterality] = useState<'N/A' | 'Left' | 'Right' | 'Bilateral'>('N/A');
  const [imagingContrast, setImagingContrast] = useState(false);
  const [customBodyPart, setCustomBodyPart] = useState('');
  const [imagingFieldErrors, setImagingFieldErrors] = useState<Record<string, string>>({});

  // Add state for patients with vitals
  const [patientsWithVitals, setPatientsWithVitals] = useState<PatientType[]>([]);

  // Add state for medical records
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [medicalRecordsLoading, setMedicalRecordsLoading] = useState(false);
  const [selectedPatientForMedicalRecords, setSelectedPatientForMedicalRecords] = useState<PatientType | null>(null);
  const [medicalRecordsPage, setMedicalRecordsPage] = useState(1);
  const [medicalRecordsTotalPages, setMedicalRecordsTotalPages] = useState(1);
  const [medicalRecordsStatusFilter, setMedicalRecordsStatusFilter] = useState<'active' | 'finalized' | 'all'>('active');

  const [visits, setVisits] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);

  // Open prescription dialog when navigated from IPD Management (or elsewhere) with state
  const openedPrescriptionForRef = useRef<string | null>(null);
  useEffect(() => {
    const openForId = (location.state as any)?.openPrescriptionForPatientId;
    if (!openForId) {
      openedPrescriptionForRef.current = null;
      return;
    }
    const pid = String(openForId);
    if (openedPrescriptionForRef.current === pid) return;
    const found = patients.find((p: PatientType) =>
      (p.id && String(p.id) === pid) ||
      (p._id && String(p._id) === pid) ||
      (p.patientId && String(p.patientId) === pid)
    );
    if (found) {
      openedPrescriptionForRef.current = pid;
      setSelectedPatient(found.id || found._id);
      setSelectedPatientObject(found);
      setIsPrescriptionDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    if (patients.length === 0) return;
    openedPrescriptionForRef.current = pid;
    patientService.getPatientById(pid).then((p: PatientType | null) => {
      if (p) {
        const patientObj = { ...p, id: p._id || p.id };
        setSelectedPatient(patientObj.id || patientObj._id);
        setSelectedPatientObject(patientObj);
        setIsPrescriptionDialogOpen(true);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }).catch(() => { openedPrescriptionForRef.current = null; });
  }, [location.state, location.pathname, patients, navigate]);

  // Add state for completed patient search functionality
  const [completedPatients, setCompletedPatients] = useState<PatientType[]>([]);
  const [completedPatientsSearchTerm, setCompletedPatientsSearchTerm] = useState('');
  const [isLoadingCompletedPatients, setIsLoadingCompletedPatients] = useState(false);
  const [showCompletedPatientsSearch, setShowCompletedPatientsSearch] = useState(false);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedTotalPages, setCompletedTotalPages] = useState(1);

  // Appointments tab state
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [myAppointmentsLoading, setMyAppointmentsLoading] = useState(false);
  const [apptSearchTerm, setApptSearchTerm] = useState('');
  const [apptStatusFilter, setApptStatusFilter] = useState('all');
  const [apptDateFilter, setApptDateFilter] = useState<'all' | 'today' | 'upcoming'>('today');
  const [apptEditTarget, setApptEditTarget] = useState<any | null>(null);
  const [apptEditStatus, setApptEditStatus] = useState('');
  const [apptEditNotes, setApptEditNotes] = useState('');
  const [isApptEditOpen, setIsApptEditOpen] = useState(false);
  const [isApptUpdating, setIsApptUpdating] = useState(false);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Backend handles search filtering, so we only need to filter by status here
  const filteredPatients = patients.filter(patient => {
    const matchesStatus = !statusFilter || (patient.status && patient.status === statusFilter);
    return matchesStatus;
  });


  // Use top bar search when on Completed tab so search works from anywhere; otherwise use this tab's search
  const effectiveCompletedSearch = (activeTab === 'completed-patients' && searchTerm.trim())
    ? searchTerm.trim()
    : completedPatientsSearchTerm;

  // Filter completed patients based on search term and record status
  const filteredCompletedPatients = completedPatients.filter(patient => {
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim().toLowerCase();
    const term = effectiveCompletedSearch.toLowerCase();

    // Handle special filter cases (only for the tab's own search box, not top bar)
    if (term === 'has-records') {
      return (patient.finalizedRecordsCount || 0) > 0;
    } else if (term === 'no-records') {
      return (patient.finalizedRecordsCount || 0) === 0;
    }
    if (!term) return true;

    // Regular search: name, patient ID, contact, email
    const nameMatch = fullName.includes(term);
    const patientIdMatch = (patient.patientId || patient.patientCode || '').toLowerCase().includes(term);
    const contactMatch = (patient.contactNumber || '').toLowerCase().includes(term);
    const emailMatch = (patient.email || '').toLowerCase().includes(term);
    return nameMatch || patientIdMatch || contactMatch || emailMatch;
  });
  // Update completed patients pagination totals whenever filtered list changes
  useEffect(() => {
    const total = Math.max(1, Math.ceil(filteredCompletedPatients.length / 10));
    setCompletedTotalPages(total);
    setCompletedPage((p) => Math.min(p, total));
  }, [filteredCompletedPatients.length]);

  // Add loading state for patient table
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  // Add ref to track if a fetch is already in progress
  const fetchInProgressRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const FETCH_DEBOUNCE_TIME = 1000; // Reduced from 3 seconds to 1 second for faster initial loading
  const isInitialMountRef = useRef(true);

  // Selected prescription for detail modal
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  // Aggregated prescription list for a single patient
  const [selectedPatientPrescriptions, setSelectedPatientPrescriptions] = useState<Prescription[] | null>(null);
  // Selected medications for printing
  const [selectedMedications, setSelectedMedications] = useState<Set<string>>(new Set());
  // Patient type for printing
  const [patientType, setPatientType] = useState<'inpatient' | 'outpatient' | null>(null);

  // Handle medication selection for printing
  const toggleMedicationSelection = (medicationKey: string) => {
    setSelectedMedications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(medicationKey)) {
        newSet.delete(medicationKey);
      } else {
        newSet.add(medicationKey);
      }
      return newSet;
    });
  };

  // Select all medications
  const selectAllMedications = () => {
    if (!selectedPatientPrescriptions) return;
    const allKeys = new Set<string>();
    selectedPatientPrescriptions.forEach(p => {
      p.medications.forEach((med, index) => {
        allKeys.add(`${p._id}-${index}`);
      });
    });
    setSelectedMedications(allKeys);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedMedications(new Set());
  };

  // Get selected medications for printing
  const getSelectedMedicationsForPrint = () => {
    if (!selectedPatientPrescriptions) return [];
    return selectedPatientPrescriptions.flatMap(p =>
      p.medications.filter((med, index) =>
        selectedMedications.has(`${p._id}-${index}`)
      ).map(med => ({ ...med, prescription: p }))
    );
  };

  // Automatic attendance status
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'offline' | 'loading'>('loading');
  const [lastActivity, setLastActivity] = useState<string>('');

  // Add a helper to get nurse name by ID
  const getNurseNameById = (nurseId?: string) => {
    if (!nurseId) return null;
    const found = nurses.find((n) => n.id === nurseId || n._id === nurseId);
    return found ? `${found.firstName} ${found.lastName}` : null;
  };

  // Batch-check which patients have finalized records — one request for all patients
  const batchCheckFinalizedRecords = async (patientIds: string[]): Promise<Record<string, boolean>> => {
    if (!patientIds.length) return {};
    try {
      const response = await api.get('/api/medical-records/batch-finalized-check', {
        params: { patientIds: patientIds.join(',') }
      });
      return response.data || {};
    } catch (error) {
      console.error('[DoctorDashboard] Error batch-checking finalized records:', error);
      return {};
    }
  };

  const fetchData = useCallback(async (pageOverride?: number, searchOverride?: string) => {
    const pageToLoad = pageOverride ?? currentPage;
    const searchToUse = searchOverride !== undefined ? searchOverride : searchTerm;
    const currentDoctorId = user?.id || user?._id;
    console.log('[DoctorDashboard] fetchData called with:', {
      user: user,
      currentDoctorId: currentDoctorId,
      userId: user?.id,
      user_id: user?._id,
      userKeys: user ? Object.keys(user) : 'no user',
      searchTerm: searchToUse
    });
    if (!user || !currentDoctorId) {
      console.log('[DoctorDashboard] Waiting for user data to load...');
      return;
    }

    // Prevent multiple simultaneous fetches
    if (fetchInProgressRef.current) {
      console.log('[DoctorDashboard] Fetch already in progress, skipping duplicate request');
      return;
    }

    // Debounce fetches to prevent rapid successive calls
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    if (timeSinceLastFetch < FETCH_DEBOUNCE_TIME) {
      console.log(`[DoctorDashboard] Too soon to fetch again (${timeSinceLastFetch}ms since last fetch), debouncing`);
      return;
    }

    fetchInProgressRef.current = true;
    lastFetchTimeRef.current = now;

    clearLocalStorageCache();
    setIsLoading(true);
    setIsLoadingPatients(true);

    try {
      console.log('[DoctorDashboard] Fetching patients for doctor:', currentDoctorId, 'with search:', searchToUse);

      // Add timestamp to avoid browser caching
      const timestamp = new Date().getTime();
      console.log(`[DoctorDashboard] Using timestamp ${timestamp} to prevent caching`);

      // CRITICAL FIX: Use doctor-specific endpoint to get patients with card type data
      // When searching: request higher limit so we search across all patients (active + completed)
      const isSearching = !!(searchToUse && searchToUse.trim());
      const requestLimit = isSearching ? 500 : 100;
      console.log('[DoctorDashboard] Making API call to /api/doctor/patients/active', { isSearching, limit: requestLimit });
      let response;
      try {
        let apiUrl = `/api/doctor/patients/active?limit=${requestLimit}&page=1`;
        if (isSearching) {
          apiUrl += `&search=${encodeURIComponent(searchToUse.trim())}`;
        }
        response = await api.get(apiUrl);
        console.log('[DoctorDashboard] API response received:', response);
      } catch (error) {
        console.error('[DoctorDashboard] API call failed:', error);
        toast.error('Failed to fetch patients: ' + (error.response?.data?.message || error.message));
        setIsLoading(false);
        setIsLoadingPatients(false);
        fetchInProgressRef.current = false;
        return;
      }

      if (!response || !response.data || !response.data.data) {
        console.error('[DoctorDashboard] Invalid response format from doctor endpoint:', response);
        toast.error('Failed to load patient data: Invalid response format');
        setIsLoading(false);
        return;
      }

      const fetchedPatientsFromApi = response.data.data || [];
      // Pagination is client-side (10 per page); totalPages/currentPage are set by useEffect from filteredPatients.length
      console.log('[DoctorDashboard] Total patients fetched:', fetchedPatientsFromApi.length);

      // Ensure all patients have an id field for consistency
      const processedPatients = fetchedPatientsFromApi.map(patient => ({
        ...patient,
        id: patient.id || patient._id
      }));

      // Debug: Log all patients to understand the data
      console.log('All fetched patients summary:');
      processedPatients.forEach((p, index) => {
        console.log(`Patient ${index + 1}: ${p.firstName} ${p.lastName}`, {
          id: p.id,
          patientId: p.patientId,
          patientCode: p.patientCode,
          doctorId: p.assignedDoctor?.id,
          currentDoctorId: currentDoctorId,
          status: p.status,
          hasVitals: !!p.vitals,
          cardType: p.cardType,
          cardStatus: p.cardStatus
        });
      });

      // Find Ruth Natan specifically
      const ruthNatan = processedPatients.find(p =>
        p.firstName?.toLowerCase() === 'ruth' &&
        p.lastName?.toLowerCase() === 'natan'
      );

      if (ruthNatan) {
        console.log('Found Ruth Natan:', {
          id: ruthNatan.id,
          doctorId: ruthNatan.assignedDoctorId,
          status: ruthNatan.status,
          vitals: ruthNatan.vitals
        });
      } else {
        console.log('Ruth Natan not found in fetched patients');
      }

      // Filter patients with vitals for special handling
      const patientsWithVitalsData = processedPatients.filter(patient => {
        const hasVitals = patient.vitals &&
          (patient.vitals.temperature ||
            patient.vitals.heartRate ||
            patient.vitals.bloodPressure ||
            patient.vitals.respiratoryRate ||
            patient.vitals.oxygenSaturation);

        if (hasVitals) {
          console.log(`[DoctorDashboard] Found patient with vitals: ${patient.firstName} ${patient.lastName}`, {
            vitals: patient.vitals,
            doctorId: patient.assignedDoctorId,
            status: patient.status
          });
        }

        return hasVitals;
      });

      setPatientsWithVitals(patientsWithVitalsData);
      console.log(`[DoctorDashboard] Found ${patientsWithVitalsData.length} patients with vitals`);

      // Batch-check finalized records for all patients in a single request
      const patientIds = processedPatients.map((p: any) => (p.id || p._id)?.toString()).filter(Boolean);
      const finalizedMap = await batchCheckFinalizedRecords(patientIds);
      const assignedPatientsData = processedPatients.map((p: any) => ({
        ...p,
        hasFinalizedRecord: finalizedMap[(p.id || p._id)?.toString()] ?? false
      }));

      // When user is searching in the top bar, show ALL patients returned by the API (including completed).
      // When not searching, only show workflow-ready patients (assigned, sent by nurse, not completed).
      // Rule: Patient stays in active area until doctor writes and finalizes medical record; sending lab order or medication alone does NOT remove them (hasFinalizedRecord is only true when a medical record is finalized).
      const filteredPatients = searchToUse?.trim()
        ? assignedPatientsData
        : assignedPatientsData.filter(p => {
          // Check if patient is assigned to current doctor
          const patientDoctorId = p.assignedDoctor?.id || p.assignedDoctor?._id || p.assignedDoctorId;
          const isAssignedToCurrentDoctor = patientDoctorId?.toString() === currentDoctorId?.toString();

          // Check if patient is in an active workflow status
          const isActiveStatus = ['scheduled', 'Admitted', 'waiting', 'Admitted Patient', 'Observation'].includes(p.status);

          // EXCLUDE completed patients from "My Patients" list
          const isNotCompleted = p.status !== 'completed' && p.status !== 'discharged';

          // EXCLUDE only when there is a finalized medical record
          const hasNoFinalizedRecords = !p.hasFinalizedRecord;

          // RELAXED CRITERIA: Show assigned patients in any active status before completion
          if (isAssignedToCurrentDoctor && isActiveStatus && isNotCompleted && hasNoFinalizedRecords) {
            return true;
          }

          // Debug logs for excluded assigned patients
          if (isAssignedToCurrentDoctor && !isActiveStatus) {
            console.log(`[DoctorDashboard] Excluding assigned patient due to status: ${p.firstName} ${p.lastName}`, {
              status: p.status
            });
          }

          return false;
        });

      console.log(`[DoctorDashboard] ${searchToUse?.trim() ? 'Search results' : 'Workflow-ready patients'}: ${filteredPatients.length}`);

      // Remove debug fallback - only show patients that meet the criteria
      let finalPatientList = filteredPatients;

      // Update dashboard stats based on filtered patients
      setDashboardStats({
        patientsToday: finalPatientList.length,
        pendingReports: finalPatientList.filter(p => p.labResults?.some(lr => lr.status === 'pending')).length,
        completedAppointments: 0,
        labResults: finalPatientList.filter(p => p.labResults && p.labResults.length > 0).length
      });

      const uniqueAssignedPatientsData = removeDuplicatePatients(finalPatientList);
      console.log(`[DoctorDashboard] After removing duplicates: ${uniqueAssignedPatientsData.length} patients`);

      // Set patients state with the filtered and deduplicated list
      setPatients(uniqueAssignedPatientsData);
    } catch (error) {
      console.error('[DoctorDashboard] Error fetching data:', error);
      toast.error('Failed to load dashboard data. Please try refreshing.');
      setPatients([]);
    } finally {
      setIsLoading(false);
      setIsLoadingPatients(false);
      fetchInProgressRef.current = false; // Reset fetch in progress flag
    }
  }, [user, toast, searchTerm]);

  // Fetch doctor's own appointments
  const fetchMyAppointments = useCallback(async () => {
    setMyAppointmentsLoading(true);
    try {
      const currentDoctorId = user?.id || user?._id;
      const response = await api.get('/api/appointments', {
        params: { doctorId: currentDoctorId, limit: 200 }
      });
      let data: any[] = [];
      if (Array.isArray(response.data)) data = response.data;
      else if (Array.isArray(response.data?.data)) data = response.data.data;
      else if (Array.isArray(response.data?.appointments)) data = response.data.appointments;
      // Filter to only this doctor's appointments
      const filtered = data.filter((a: any) => {
        const docId = typeof a.doctorId === 'object' ? (a.doctorId?._id || a.doctorId?.id) : a.doctorId;
        return docId?.toString() === currentDoctorId?.toString();
      });
      setMyAppointments(filtered);
    } catch (err) {
      console.error('[DoctorDashboard] Error fetching appointments:', err);
    } finally {
      setMyAppointmentsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'my-appointments') {
      fetchMyAppointments();
    }
  }, [activeTab, fetchMyAppointments]);

  // WebSocket connection with proper debouncing
  useEffect(() => {
    const currentDoctorId = user?.id || user?._id;
    if (user && currentDoctorId) {
      console.log('[DoctorDashboard] Setting up WebSocket connection for doctor:', currentDoctorId);

      // Add auth token to requests before WebSocket connection
      const token = getToken();
      if (token) {
        console.log('[DoctorDashboard] Setting up auth token before WebSocket connection');
      }

      // Create a debounced version of fetchData to prevent excessive calls
      let refreshTimeout: NodeJS.Timeout | null = null;
      const debouncedRefresh = () => {
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        refreshTimeout = setTimeout(() => {
          console.log('[DoctorDashboard] Debounced refresh triggered');
          fetchData();
        }, 2000); // Wait 2 seconds before refreshing to allow multiple notifications to settle
      };

      const handleMessage = (notification: any) => {
        console.log('[DoctorDashboard] WebSocket notification received:', notification);

        // Handle vitals update notifications
        if (notification.type === 'vitals_update' || notification.type === 'PATIENT_VITALS') {
          const patientId = notification.data?.patientId;
          const patientName = notification.data?.patientName || notification.data?.patient?.firstName || 'A patient';

          // Show notification
          toast.success(`${patientName}'s vitals have been updated`, {
            duration: 5000,
            position: 'top-center',
          });

          // Use debounced refresh instead of immediate refresh
          debouncedRefresh();
        }

        // Add notification to state
        setNotifications(prev => [{
          id: notification.id || Date.now().toString(),
          title: notification.title || 'Notification',
          message: notification.message || 'New notification received',
          type: notification.type || 'info',
          date: new Date().toISOString(),
          timestamp: new Date(),
          read: false,
          data: notification.data
        }, ...prev]);

        // Show a toast notification
        toast.success('New notification received');

        // Handle different notification types with debounced refresh
        if (notification.type === 'PATIENT_READY' ||
          notification.type === 'notify_doctor' ||
          notification.type === 'patient_status_change') {

          console.log('[DoctorDashboard] Important notification received:', notification.type);
          // Use debounced refresh instead of immediate refresh
          debouncedRefresh();
        }
      };

      // Disconnect any existing WebSocket connection before creating a new one
      notificationService.disconnect();

      // Connect to WebSocket
      const socket = notificationService.connectWebSocket(currentDoctorId, 'doctor', handleMessage);
      console.log('[DoctorDashboard] WebSocket connection established:', !!socket);

      return () => {
        console.log('[DoctorDashboard] Cleaning up WebSocket connection for user', currentDoctorId);
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        notificationService.disconnect();
      };
    }
  }, [user, fetchData, getToken]);

  // Only call fetchData when user and user.id are ready - with debouncing
  useEffect(() => {
    const currentDoctorId = user?.id || user?._id;
    if (user && currentDoctorId) {
      console.log('[DoctorDashboard] User data loaded, fetching data with delay');
      // Add small delay to ensure everything is ready and prevent duplicate calls
      const initialLoadTimeout = setTimeout(() => {
        fetchData();
      }, 200); // Reduced from 500ms to 200ms for faster loading

      return () => {
        clearTimeout(initialLoadTimeout);
      };
    }
  }, [fetchData, user]);

  // Trigger fetch when search term changes (with debouncing)
  useEffect(() => {
    const currentDoctorId = user?.id || user?._id;
    if (!user || !currentDoctorId) {
      return;
    }

    // Skip on initial mount - let the initial load useEffect handle the first fetch
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Debounce search to avoid excessive API calls
    const searchTimeout = setTimeout(() => {
      console.log('[DoctorDashboard] Search term changed, fetching patients with search:', searchTerm);
      // Reset to page 1 when searching
      setCurrentPage(1);
      fetchData(1, searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => {
      clearTimeout(searchTimeout);
    };
  }, [searchTerm, user, fetchData]);

  // Active patients: pagination is client-side (10 per page); do not refetch when page changes
  useEffect(() => {
    const total = Math.max(1, Math.ceil(filteredPatients.length / ACTIVE_PATIENTS_PAGE_SIZE));
    setTotalPages(total);
    setCurrentPage((p) => Math.min(p, total));
  }, [filteredPatients.length]);

  useEffect(() => {
    // Fetch all visits when the component mounts
    const fetchVisits = async () => {
      try {
        const response = await api.get('/api/visits');
        // Ensure visits is always an array
        const visitsArray = Array.isArray(response.data) ? response.data : Array.isArray(response.data?.data) ? response.data.data : [];
        setVisits(visitsArray);
      } catch (error) {
        console.error('Error fetching visits:', error);
        setVisits([]);
      }
    };
    fetchVisits();
  }, []);

  useEffect(() => {
    // Fetch nurses for assignment
    const fetchNurses = async () => {
      try {
        const response = await api.get('/api/nurse/all');

        if (response.status === 200) {
          const nursesData = response.data;
          // Extract the actual nurses array from the response
          const nursesList = nursesData.data || nursesData;
          setNurses(nursesList);
          console.log('Fetched nurses for doctor dashboard:', nursesList);
        } else {
          console.error('Failed to fetch nurses:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching nurses:', error);
        setNurses([]);
      }
    };
    fetchNurses();
  }, []);

  // Fetch completed patients for search functionality
  const fetchCompletedPatients = async () => {
    const currentDoctorId = user?.id || user?._id;
    if (!currentDoctorId) {
      console.log('[DoctorDashboard] No doctor ID available for fetching completed patients');
      return;
    }

    setIsLoadingCompletedPatients(true);
    try {
      console.log('[DoctorDashboard] Fetching completed patients for doctor:', currentDoctorId);

      // Use the dedicated completed patients endpoint which properly formats the assignedDoctor field
      const response = await patientService.getCompletedPatients(1, 1000);

      if (!response || !response.patients) {
        console.error('[DoctorDashboard] Invalid response format from patientService:', response);
        setIsLoadingCompletedPatients(false);
        return;
      }

      const completedPatientsData = response.patients || [];

      // Debug: Log all completed patients
      console.log(`[DoctorDashboard] Found ${completedPatientsData.length} completed patients:`, completedPatientsData.map(p => ({
        id: p.id || p._id,
        name: `${p.firstName} ${p.lastName}`,
        status: p.status,
        assignedDoctor: p.assignedDoctor
      })));

      // Batch-fetch finalized record counts for all completed patients in one request
      const completedPatientIds = completedPatientsData.map((p: any) => (p._id || p.id)?.toString()).filter(Boolean);
      let finalizedCountMap: Record<string, number> = {};
      if (completedPatientIds.length > 0) {
        try {
          const countResponse = await api.get('/api/medical-records/batch-finalized-check', {
            params: { patientIds: completedPatientIds.join(','), includeCounts: 'true' }
          });
          finalizedCountMap = countResponse.data || {};
        } catch (err) {
          console.error('[DoctorDashboard] Error batch-fetching finalized counts:', err);
        }
      }

      const patientsWithRecordCounts = completedPatientsData.map((patient: any) => ({
        ...patient,
        finalizedRecordsCount: finalizedCountMap[(patient._id || patient.id)?.toString()] ?? 0
      }));

      setCompletedPatients(patientsWithRecordCounts as any);

    } catch (error) {
      console.error('[DoctorDashboard] Error fetching completed patients:', error);
      toast.error('Failed to load completed patients');
    } finally {
      setIsLoadingCompletedPatients(false);
    }
  };

  // Fetch completed patients when the tab is activated or component mounts
  useEffect(() => {
    if (activeTab === 'completed-patients' && isAuthenticated) {
      console.log('[DoctorDashboard] Completed Patients tab activated, fetching data...');
      fetchCompletedPatients();
    }
  }, [activeTab, isAuthenticated]);

  // Fetch active patients on mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchData();
    }
  }, [isAuthenticated, user?.id]);

  // Fetch lab results only when the lab-results tab is activated
  useEffect(() => {
    if (activeTab === 'lab-results' && isAuthenticated) {
      console.log('[DoctorDashboard] Lab Results tab activated, fetching results...');
      fetchAllDoctorLabResults();
    }
  }, [activeTab, isAuthenticated]);

  // Event Handlers & Helper Functions (restored, remain the same)
  const handlePatientSelect = (patientId: string) => {
    const patientObj = patients.find(p => p.id === patientId);
    setSelectedPatient(patientId);
    if (patientObj) {
      setSelectedPatientObject(patientObj);
      setActiveTab('Medical Records');
    }
  };
  const handleMarkNotificationAsRead = (notificationId: string) => { /* logic */ };
  const handleMarkAllNotificationsAsRead = () => { setNotifications(notifications.map(n => ({ ...n, read: true }))); };
  const getStatusColor = (status: string | undefined): string => {
    if (!status) return 'bg-muted text-muted-foreground';
    switch (status.toLowerCase()) {
      case 'waiting': return 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))] border-[hsl(var(--status-warning-border))]';
      case 'scheduled': return 'bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] border-[hsl(var(--status-info-border))]';
      case 'in-progress':
      case 'active': // Add this case to handle 'Active' status from the database
        return 'bg-[hsl(var(--status-info))] text-[hsl(var(--status-info-foreground))] border-[hsl(var(--status-info-border))]';
      case 'admitted': return 'bg-[hsl(var(--patient-admitted))] text-[hsl(var(--patient-admitted-foreground))] border-[hsl(var(--patient-admitted-border))]';
      case 'completed': return 'bg-[hsl(var(--status-success))] text-[hsl(var(--status-success-foreground))] border-[hsl(var(--status-success-border))]';
      case 'discharged': return 'bg-[hsl(var(--patient-discharged))] text-[hsl(var(--patient-discharged-foreground))] border-[hsl(var(--patient-discharged-border))]';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Restoring the full renderVital function definition
  const renderVital = (value: string | undefined, unit: string, normalRange: [number, number], Icon: React.ElementType) => {
    if (!value || value === 'N/A') return <span className="text-muted-foreground text-xs">--</span>;
    const numericValue = parseFloat(value);
    let isAbnormal = false;

    if (!isNaN(numericValue) && (numericValue < normalRange[0] || numericValue > normalRange[1])) {
      isAbnormal = true;
    }

    return (
      <span className={`flex items-center text-xs ${isAbnormal ? 'text-destructive font-semibold' : 'text-foreground'}`}>
        <Icon className={`h-3.5 w-3.5 mr-1 ${isAbnormal ? 'text-destructive' : 'text-muted-foreground'}`} />
        {value}{unit}
      </span>
    );
  };

  // const tabs = [ ... ]; // Keep placeholder for tabs if not fully defined before
  // useEffect(() => { /* selectedPatientObject logic */ }, [selectedPatient, patients]); 
  // Restore other handler definitions if they used placeholders
  const handlePrescriptionSubmit = async (prescriptionData: any) => {
    const token = getToken();
    if (!token) {
      toast.error('Authentication token not found. Please log in again.');
      return;
    }

    if (!user?.id && !user?._id) {
      toast.error('Doctor ID is missing. Please log in again.');
      return;
    }

    if (!selectedPatientObject?.id) {
      toast.error('Patient ID is missing. Please select a patient.');
      return;
    }

    const patientId = selectedPatientObject.id;
    const doctorId = user?.id || user?._id;

    // DEBUG: Log patient selection details
    console.log('🔍 [PRESCRIPTION DEBUG] Patient Selection Details:', {
      selectedPatientObject: selectedPatientObject,
      patientId: patientId,
      patientDisplayId: selectedPatientObject.patientId,
      patientName: `${selectedPatientObject.firstName} ${selectedPatientObject.lastName}`,
      doctorId: doctorId
    });

    // Filter out any medications that don't have a name
    const validMedications = prescriptionData.medications.filter((med: any) => med.medication && med.medication.trim() !== '');

    if (validMedications.length === 0) {
      toast.error('At least one medication name is required.');
      return;
    }

    const dataToSend = {
      patient: patientId,
      doctorId: doctorId,
      medicationName: validMedications[0]?.medication || '', // Populate for backend validation
      medications: validMedications.map((med: any) => ({
        medication: med.medication,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration, // Ensure doctor's duration is sent to backend
        route: med.route,
        quantity: med.quantity,
        nurseInstructions: med.nurseInstructions,
        sendToNurse: med.sendToNurse,
        assignedNurseId: med.assignedNurseId,
        inventoryItemId: med.inventoryItemId,
      })),
      duration: prescriptionData.duration,
      instructions: prescriptionData.instructions,
      notes: prescriptionData.notes || prescriptionData.instructions,
      visitId: selectedPatientObject?.visitId || "000000000000000000000000",
      patientName: selectedPatientObject?.name || `${selectedPatientObject?.firstName} ${selectedPatientObject?.lastName}`.trim(),
      patientAge: selectedPatientObject?.age,
      patientGender: selectedPatientObject?.gender
    };

    // DEBUG: Log the complete payload being sent
    console.log('📤 [PRESCRIPTION DEBUG] Complete payload being sent to API:', JSON.stringify(dataToSend, null, 2));

    try {
      setIsSubmittingLab(true); // Using Lab state for now, consider a dedicated one
      console.log('🚀 [PRESCRIPTION DEBUG] Creating prescription with data:', dataToSend);

      const response = await prescriptionService.createPrescription(dataToSend, token, doctorId);
      console.log('✅ [PRESCRIPTION DEBUG] Prescription created successfully:', response);

      // Single consolidated notification - handled by the prescription form component

      // Sync prescriptions with medical records
      try {
        console.log('🔄 [PRESCRIPTION DEBUG] Syncing prescriptions with medical records for patient:', patientId);
        const syncResult = await prescriptionService.syncPrescriptionsWithMedicalRecords(patientId);

        if (syncResult) {
          console.log('✅ [PRESCRIPTION DEBUG] Sync successful, refreshing data');
          await refreshAfterPrescriptionCreated();
        } else {
          console.warn('⚠️ [PRESCRIPTION DEBUG] Sync may have issues, attempting refresh anyway');
          setTimeout(() => refreshAfterPrescriptionCreated(), 1000);
        }
      } catch (syncError) {
        console.error("❌ [PRESCRIPTION DEBUG] Error syncing prescriptions:", syncError);
        setTimeout(() => refreshAfterPrescriptionCreated(), 1000);
      }

      setIsPrescriptionDialogOpen(false);

    } catch (error: any) {
      console.error('❌ [PRESCRIPTION DEBUG] Error creating prescription:', error);

      if (error.response) {
        console.error('❌ [PRESCRIPTION DEBUG] Response error status:', error.response.status);
        console.error('❌ [PRESCRIPTION DEBUG] Response error data:', error.response.data);

        if (error.response.status === 401) {
          toast.error('❌ Authentication error. Please log out and log in again.');
        } else if (error.response.status === 500) {
          const serverErrorMsg = error.response.data?.error || 'Unknown server error';
          toast.error(`❌ Server error: ${serverErrorMsg}. Please try again later.`);
        } else if (error.response.status === 400) {
          const validationErrors = error.response.data?.errors;
          if (validationErrors && Array.isArray(validationErrors)) {
            toast.error(`❌ Validation error: ${validationErrors[0]?.msg || 'Invalid data'}`);
          } else {
            toast.error('❌ Validation error: ' + (error.response.data?.message || 'Please check your form data'));
          }
        } else if (error.response.status === 404) {
          toast.error(`❌ Patient not found (ID: ${patientId}). Please refresh and try again.`);
        } else {
          toast.error(`❌ Error (${error.response.status}): ${error.response.data?.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        console.error('❌ [PRESCRIPTION DEBUG] No response received:', error.request);
        toast.error('❌ No response from server. Please check your connection and try again.');
      } else {
        console.error('❌ [PRESCRIPTION DEBUG] Error setting up request:', error.message);
        toast.error(`❌ Error: ${error.message}`);
      }
    } finally {
      setIsSubmittingLab(false);
    }
  };
  const handleImportPatient = (_patientToImport: PatientType) => {
    // Full logic restored here...
    setIsImportingPatient(true);
    setTimeout(() => { /* logic */ }, 800);
  };
  const handleLabRequestSubmit = async (formData: any) => {
    // const functionStartTimestamp = Date.now();
    if (!formData.patientId) {
      toast.error('Patient ID is missing');
      return;
    }
    setIsSubmittingLab(true);
    const loadingToastId = toast.loading('Finding active visit...');
    let currentVisitId: string | null = null;

    try {
      // Debug: log all visits and the patientId being searched for
      console.log('All visits:', visits);
      console.log('formData.patientId:', formData.patientId);
      // Find the active visit for the patient (case-insensitive, ignore spaces in status)
      const patientVisits = visits.filter(v => {
        if (v.patientId && typeof v.patientId === 'object') {
          return v.patientId._id === formData.patientId;
        } else if (typeof v.patientId === 'string') {
          return v.patientId === formData.patientId;
        }
        return false;
      });
      console.log('Visits for patient', formData.patientId, patientVisits);
      const activeVisit = patientVisits.find(v => {
        const normalizedStatus = (v.status || '').toLowerCase().replace(/\s+/g, '');
        return normalizedStatus === 'active';
      });
      if (!activeVisit) {
        console.warn('No active visit found; submitting lab order without visit ID');
        currentVisitId = null;
      } else {
        currentVisitId = activeVisit.id || activeVisit._id;
      }
    } catch (err) {
      console.error('Error finding active visit:', err);
      toast.error('Failed to find active visit');
      return;
    }

    // Note: currentVisitId can be null if no active visit is found, which is acceptable

    toast.loading('Sending lab orders...', { id: loadingToastId });
    let bulkPayload: any = null;

    try {
      const selectedTests = formData.tests;
      bulkPayload = {
        patientId: formData.patientId,
        ...(currentVisitId && { visitId: currentVisitId }),
        priority: formData.priority || 'Routine',
        tests: selectedTests,
        notes: formData.notes || ''
      };

      await submitBulkLabOrder(bulkPayload);
      toast.success('Lab order sent to reception for payment');

      // Refresh lab orders list
      await fetchLabResults(formData.patientId);

    } catch (err) {
      console.error('Error submitting lab orders:', err);
      toast.error('Failed to submit lab orders');
    } finally {
      toast.dismiss(loadingToastId);
      setIsSubmittingLab(false);
    }
  };
  const handleOpenCreatePrescription = async (patient?: PatientType) => {
    try {
      setError(null);
      // Get the authentication token from the context
      const token = getToken();

      // Check authentication before proceeding
      if (!token) {
        console.error('Authentication token not found');
        toast.error('Authentication error. Please log out and log in again.');
        return;
      }

      // Check if user data is available (with fallback to _id)
      const userId = user?.id || user?._id;
      if (!userId) {
        console.error('User ID not found - user data may still be loading');
        toast.error('User data is still loading. Please wait a moment and try again.');
        return;
      }

      const targetPatient = patient || selectedPatientObject;
      if (targetPatient) {
        setIsLoadingPrescription(true);
        setSelectedPatient(targetPatient.id);
        setSelectedPatientObject(targetPatient);
        setIsPrescriptionDialogOpen(true);
      } else {
        toast.error("Please select a patient first.");
      }
    } catch (err) {
      console.error('Error opening prescription form:', err);
      setError("Failed to open prescription form");
      toast.error("Failed to open prescription form");
    } finally {
      setIsLoadingPrescription(false);
    }
  };
  const handleOpenOrderLabTest = async (patient?: PatientType) => {
    try {
      setError(null);
      const targetPatient = patient || selectedPatientObject;
      if (targetPatient) {
        setIsLoadingLab(true);
        setSelectedPatient(targetPatient.id); // <-- Ensure this is the patient ID string
        setSelectedPatientObject(targetPatient);
        setIsLabRequestModalOpen(true);
      } else {
        toast.error("Please select a patient first.");
      }
    } catch (err) {
      setError("Failed to open lab test form");
      toast.error("Failed to open lab test form");
    } finally {
      setIsLoadingLab(false);
    }
  };
  const handleOpenRequestImaging = async (patient?: PatientType) => {
    try {
      setError(null);
      const targetPatient = patient || selectedPatientObject;
      if (targetPatient) {
        setIsLoadingImaging(true);
        setSelectedPatientObject(targetPatient);
        // Reset form fields when opening dialog
        setImagingType('X-Ray');
        setBodyPart('');
        setClinicalInfo('');
        setImagingPriority('Routine');
        setImagingLaterality('N/A');
        setImagingContrast(false);
        setCustomBodyPart('');
        setImagingFieldErrors({});
        setIsImagingDialogOpen(true);
      } else {
        toast.error("Please select a patient first.");
      }
    } catch (err) {
      setError("Failed to open imaging request form");
      toast.error("Failed to open imaging request form");
    } finally {
      setIsLoadingImaging(false);
    }
  };

  const handleOpenHistoryTaking = (patient?: PatientType) => {
    console.log('Opening history taking for:', patient);
    if (patient) {
      setSelectedPatientForMedicalRecords(patient);
      setShowMedicalRecordsModal(true);
    }
  };
  const handleOpenViewVitals = (patient?: PatientType) => {
    const targetPatient = patient || selectedPatientObject;
    if (targetPatient) {
      setSelectedPatientObject(targetPatient);

      // Create a formatted message with vitals information
      if (targetPatient.vitals) {
        const formattedVitals = formatVitalsDisplay(targetPatient.vitals);

        // Show a toast with vitals information
        toast(
          <div>
            <h3 className="font-bold mb-2">Vitals for {targetPatient.firstName} {targetPatient.lastName}</h3>
            <ul className="space-y-1 text-sm">
              {formattedVitals?.map((vital, index) => (
                <li key={`vital-${vital.title}-${index}`} className="flex items-center gap-2">
                  <span>{vital.icon}</span>
                  <span>{vital.title}: {vital.value}</span>
                </li>
              ))}
              <li className="text-xs text-muted-foreground mt-2">
                Last updated: {targetPatient.vitals.timestamp
                  ? formatDateTime(targetPatient.vitals.timestamp)
                  : 'Unknown'}
              </li>
            </ul>
          </div>,
          {
            duration: 10000, // Show for 10 seconds
            style: {
              maxWidth: '400px',
              padding: '16px',
            }
          }
        );
      } else {
        toast('No vitals recorded for patient');
      }
    } else {
      toast.error("Please select a patient first.");
    }
  };
  const handleOpenLabResults = (patient?: PatientType, labResult?: any) => {
    if (labResult) {
      // If a lab result is provided, show its details
      toast.success(`Viewing lab result: ${labResult.testName}`, { duration: 3000 });

      // Format the results for display
      const resultDetails = Object.entries(labResult.results || {})
        .map(([key, value]: [string, any]) => {
          const valueText = value.value || value;
          const unit = value.unit || '';
          const normalRange = value.normalRange || '';

          return `${key}: ${valueText}${unit ? ' ' + unit : ''}${normalRange ? ' (Normal: ' + normalRange + ')' : ''}`;
        })
        .join('\n');

      // Show a more detailed toast with the results
      toast(
        <div className="space-y-2">
          <h3 className="font-bold">{labResult.testName}</h3>
          <p className="text-sm">Patient: {labResult.patientName}</p>
          <p className="text-sm">Date: {formatDate(labResult.resultDate || labResult.orderDate)}</p>
          <div className="mt-2 text-xs whitespace-pre-line bg-muted/50 p-2 rounded max-h-40 overflow-y-auto">
            {resultDetails || 'No detailed results available'}
          </div>
        </div>,
        { duration: 8000 }
      );
    } else {
      // Original functionality for patient selection
      const targetPatient = patient || selectedPatientObject;
      if (targetPatient) {
        setSelectedPatientObject(targetPatient);
        setIsLabResultsModalOpen(true);
      } else {
        toast.error("Please select a patient first.");
      }
    }
  };
  const fetchLabResults = async (patientId: string) => {
    try {
      setLabResultsLoading(true);
      const results = await getLabOrdersByPatient(patientId);
      // Process and use results for a specific patient...
      setLabResultsLoading(false);
    } catch (error) {
      console.error('Error fetching lab results:', error);
      setLabResultsLoading(false);
    }
  };

  // Fetch all lab results for the doctor — single API call, then group client-side
  const fetchAllDoctorLabResults = async () => {
    try {
      const currentDoctorId = user?.id || user?._id;
      if (!currentDoctorId || !isAuthenticated) return;

      setLabResultsLoading(true);

      // One API call — pass results to grouped function to avoid a second call
      const results = await labService.getDoctorLabResults(currentDoctorId.toString());
      const grouped = await labService.getDoctorLabResultsGroupedByPatient(
        currentDoctorId.toString(),
        results as any
      );

      setLabResults(results as any);
      setGroupedLabResults(grouped);
      setLabResultsLoading(false);
    } catch (error: any) {
      console.error('Error fetching doctor lab results:', error);

      if (error?.response?.status === 401 || error?.response?.status === 403) {
        // silent — auth issue
      } else if (error?.response?.status === 404) {
        // silent — normal for new doctors
      } else {
        toast.error('Failed to load lab results. Please try again.');
      }

      setLabResults([]);
      setGroupedLabResults([]);
      setLabResultsLoading(false);
    }
  };

  // Fetch all prescriptions for the doctor (for prescriptions tab)
  const fetchAllPrescriptions = async () => {
    const currentDoctorId = user?.id || user?._id;
    if (!currentDoctorId) {
      return;
    }

    setPrescriptionsLoading(true);
    try {
      const response = await prescriptionService.getPrescriptionsByDoctor(currentDoctorId);

      // Helper: extract the raw patient ObjectId string from a prescription
      const extractPatientId = (prescription: any): string | null => {
        if (prescription.patient && typeof prescription.patient === 'object') {
          return prescription.patient._id || prescription.patient.id || null;
        }
        if (typeof prescription.patient === 'string' && prescription.patient.length > 0) {
          return prescription.patient;
        }
        if (prescription.patientId && typeof prescription.patientId === 'object') {
          return prescription.patientId._id || prescription.patientId.id || null;
        }
        if (typeof prescription.patientId === 'string' && prescription.patientId.length > 0) {
          return prescription.patientId;
        }
        return null;
      };

      // Collect unique patient IDs that don't already have populated data
      const patientCache = new Map<string, any>();

      // Pre-seed cache from already-loaded patients list
      patients.forEach((p: any) => {
        const id = p._id || p.id;
        if (id) patientCache.set(id.toString(), p);
      });

      // Find IDs that need fetching (populate didn't work on backend)
      const needsFetch = new Set<string>();
      (response || []).forEach((prescription: any) => {
        const hasPopulated =
          prescription.patient && typeof prescription.patient === 'object' && prescription.patient.firstName;
        if (!hasPopulated) {
          const pid = extractPatientId(prescription);
          if (pid && !patientCache.has(pid.toString())) {
            needsFetch.add(pid.toString());
          }
        }
      });

      // Batch-fetch missing patients (in parallel, max 10 at a time)
      const idsToFetch = Array.from(needsFetch);
      for (let i = 0; i < idsToFetch.length; i += 10) {
        const batch = idsToFetch.slice(i, i + 10);
        await Promise.all(
          batch.map(async (pid) => {
            try {
              const p = await patientService.getPatientById(pid);
              if (p) patientCache.set(pid, p);
            } catch {
              // ignore individual fetch errors
            }
          })
        );
      }

      // Now build processed prescriptions with full patient data
      const processedPrescriptions = (response || []).map((prescription: any) => {
        // Use already-populated patient object if available
        let enrichedPatient: any =
          prescription.patient && typeof prescription.patient === 'object' && prescription.patient.firstName
            ? prescription.patient
            : prescription.patientId && typeof prescription.patientId === 'object' && prescription.patientId.firstName
              ? prescription.patientId
              : null;

        // Fall back to patientSnapshot (stored at creation time)
        if (!enrichedPatient && prescription.patientSnapshot && prescription.patientSnapshot.firstName) {
          enrichedPatient = prescription.patientSnapshot;
        }

        // Look up from cache if still not populated
        if (!enrichedPatient) {
          const pid = extractPatientId(prescription);
          if (pid) enrichedPatient = patientCache.get(pid.toString()) || null;
        }

        const patientName = enrichedPatient
          ? `${enrichedPatient.firstName || ''} ${enrichedPatient.lastName || ''}`.trim() || 'Unknown Patient'
          : (prescription.patientName && prescription.patientName !== 'Patient Name' ? prescription.patientName : 'Unknown Patient');

        const resolvedPatientId = extractPatientId(prescription);

        return {
          ...prescription,
          patientId: resolvedPatientId,
          patient: enrichedPatient || prescription.patient,
          patientName,
        };
      });

      setPrescriptions(processedPrescriptions);

      // Run backfill in background (non-blocking) if patient data is missing
      const stillMissing = processedPrescriptions.some(
        (p: any) => !p.patient || typeof p.patient !== 'object' || !p.patient.firstName
      );
      if (stillMissing) {
        // Fire and forget — don't await, don't block loading state
        prescriptionAPI.backfillPatientSnapshots()
          .then(() => prescriptionService.getPrescriptionsByDoctor(currentDoctorId))
          .then((refreshed) => {
            const refreshedProcessed = (refreshed || []).map((prescription: any) => {
              const enrichedPatient: any =
                prescription.patient && typeof prescription.patient === 'object' && prescription.patient.firstName
                  ? prescription.patient
                  : prescription.patientSnapshot && prescription.patientSnapshot.firstName
                    ? prescription.patientSnapshot
                    : null;
              const patientName = enrichedPatient
                ? `${enrichedPatient.firstName || ''} ${enrichedPatient.lastName || ''}`.trim() || 'Unknown Patient'
                : 'Unknown Patient';
              return { ...prescription, patient: enrichedPatient || prescription.patient, patientName };
            });
            setPrescriptions(refreshedProcessed);
          })
          .catch(() => { /* backfill is best-effort */ });
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setPrescriptions([]);
    } finally {
      setPrescriptionsLoading(false);
    }
  };

  // Fetch prescriptions for a specific patient
  const fetchPrescriptions = async (patientId: string) => {
    // Implementation for fetching individual patient prescriptions
    // This can be used when viewing a specific patient's records
    console.log(`Fetching prescriptions for patient: ${patientId}`);
  };

  // Add Placeholder Handlers
  const handleViewDetails = (patient?: PatientType) => {
    if (patient) {
      setSelectedPatient(patient.id);
      setSelectedPatientObject(patient);
      // Automatically switch to the Medical Records tab
      setActiveTab('Medical Records');
      // Scroll to the medical records section
      setTimeout(() => {
        const medicalRecordsSection = document.getElementById('medical-records-section');
        if (medicalRecordsSection) {
          medicalRecordsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      toast.error("Please select a patient first.");
    }
  };
  const handleStartConsultation = (patient?: PatientType) => {
    if (patient) {
      toast(`Starting consultation for ${patient.firstName} ${patient.lastName}`);
      // Add consultation logic later
    } else {
      toast.error("Patient data missing.");
    }
  };

  // Update the handleOpenMedicalRecord function to use the old component
  const handleOpenMedicalRecord = (patient?: PatientType) => {
    if (!patient) {
      toast.error('Patient data is missing. Please select a patient.');
      return;
    }

    // Mark patient as viewed to hide NEW badge
    setViewedPatients(prev => new Set(prev).add(patient.id));

    setSelectedPatientObject(patient);
    setIsMedicalRecordOpen(true);

    console.log('Opening medical record for patient:', patient);
  };

  // New function to handle viewing existing records
  const handleViewExistingRecord = async (record: any, mode: 'view' | 'edit' = 'view') => {
    try {
      console.log(`🔍 [${mode.toUpperCase()} RECORD] Attempting to ${mode} existing record:`, record);
      console.log(`🔍 [${mode.toUpperCase()} RECORD] Available patients:`, patients.length);

      // If no patients are loaded, fetch them first with broader criteria
      if (patients.length === 0) {
        console.log(`🔍 [${mode.toUpperCase()} RECORD] No patients loaded, fetching patients with broader criteria...`);

        try {
          // Fetch all patients for this doctor without strict filtering
          const currentDoctorId = user?.id || user?._id;
          if (currentDoctorId) {
            const response = await patientService.getAllPatients(true, true, 100);
            if (response && response.patients) {
              // Use all patients assigned to this doctor, not just those with complete workflow
              const allDoctorPatients = response.patients.filter((p: any) =>
                p.assignedDoctor?.id?.toString() === currentDoctorId?.toString()
              );
              console.log(`🔍 [${mode.toUpperCase()} RECORD] Found ${allDoctorPatients.length} patients assigned to doctor`);
              setPatients(allDoctorPatients);

              // Wait a moment for the state to update
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        } catch (fetchError) {
          console.warn(`🔍 [${mode.toUpperCase()} RECORD] Failed to fetch patients with broader criteria:`, fetchError);
          // Fall back to regular fetchData
          await fetchData();
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`🔍 [${mode.toUpperCase()} RECORD] Patients fetched, now have:`, patients.length);
      }

      // Enhanced patient lookup - try multiple strategies
      let foundPatient = null;

      // Strategy 1: Try to find by patientId (most reliable)
      if (record.patientId) {
        foundPatient = patients.find(p => {
          // Convert ObjectIds to strings for comparison
          const recordPatientId = record.patientId?.toString();
          const patientId = p.id?.toString();
          const patientMongoId = p._id?.toString();
          const patientStandardId = p.patientId;

          return patientId === recordPatientId ||
            patientMongoId === recordPatientId ||
            patientStandardId === recordPatientId;
        });
        console.log(`🔍 [${mode.toUpperCase()} RECORD] Strategy 1 - patientId lookup:`, record.patientId, foundPatient ? 'FOUND' : 'NOT FOUND');
      }

      // Strategy 2: Try to find by patient name (fallback)
      if (!foundPatient && record.patientName) {
        foundPatient = patients.find(p =>
          `${p.firstName} ${p.lastName}`.toLowerCase().trim() === record.patientName.toLowerCase().trim()
        );
        console.log(`🔍 [${mode.toUpperCase()} RECORD] Strategy 2 - name lookup:`, record.patientName, foundPatient ? 'FOUND' : 'NOT FOUND');
      }

      // Strategy 3: Try to find by patient object reference
      if (!foundPatient && record.patient && typeof record.patient === 'object') {
        const patientObjId = (record.patient._id || record.patient.id)?.toString();
        foundPatient = patients.find(p => {
          const patientId = p.id?.toString();
          const patientMongoId = p._id?.toString();
          return patientId === patientObjId || patientMongoId === patientObjId;
        });
        console.log(`🔍 [${mode.toUpperCase()} RECORD] Strategy 3 - patient object lookup:`, patientObjId, foundPatient ? 'FOUND' : 'NOT FOUND');
      }

      // Strategy 4: Try to find by patient name in patient object
      if (!foundPatient && record.patient && typeof record.patient === 'object' && record.patient.firstName) {
        foundPatient = patients.find(p =>
          `${p.firstName} ${p.lastName}`.toLowerCase().trim() ===
          `${record.patient.firstName} ${record.patient.lastName}`.toLowerCase().trim()
        );
        console.log(`🔍 [${mode.toUpperCase()} RECORD] Strategy 4 - patient object name lookup:`,
          `${record.patient.firstName} ${record.patient.lastName}`,
          foundPatient ? 'FOUND' : 'NOT FOUND'
        );
      }

      if (!foundPatient) {
        console.error(`🔍 [${mode.toUpperCase()} RECORD] Patient not found after all strategies. Record data:`, record);
        console.error(`🔍 [${mode.toUpperCase()} RECORD] Available patients:`, patients.map(p => ({
          id: p.id,
          _id: p._id,
          patientId: p.patientId,
          name: `${p.firstName} ${p.lastName}`
        })));

        // Try to fetch more patients with broader criteria
        console.log(`🔍 [${mode.toUpperCase()} RECORD] Attempting to fetch more patients with broader criteria...`);
        try {
          const currentDoctorId = user?.id || user?._id;
          if (currentDoctorId) {
            const response = await patientService.getAllPatients(true, true, 100);
            if (response && response.patients) {
              // Use all patients assigned to this doctor, not just those with complete workflow
              const allDoctorPatients = response.patients.filter((p: any) =>
                p.assignedDoctor?.id?.toString() === currentDoctorId?.toString()
              );
              console.log(`🔍 [${mode.toUpperCase()} RECORD] Found ${allDoctorPatients.length} patients with broader criteria`);

              // Try to find the patient in the broader list
              const broaderFoundPatient = allDoctorPatients.find(p => {
                const recordPatientId = record.patientId?.toString();
                const patientId = p.id?.toString();
                const patientMongoId = p._id?.toString();
                const patientStandardId = p.patientId;

                return patientId === recordPatientId ||
                  patientMongoId === recordPatientId ||
                  patientStandardId === recordPatientId;
              });

              if (broaderFoundPatient) {
                console.log(`🔍 [${mode.toUpperCase()} RECORD] Found patient with broader criteria:`, broaderFoundPatient);
                foundPatient = broaderFoundPatient;
              } else {
                // Try one more strategy - look for the patient by the exact ObjectId
                const recordPatientId = record.patientId?.toString();
                const recordPatient = record.patient?.toString();

                console.log(`🔍 [${mode.toUpperCase()} RECORD] Final attempt - looking for:`, {
                  recordPatientId,
                  recordPatient
                });

                const finalAttempt = allDoctorPatients.find(p => {
                  const patientId = p.id?.toString();
                  const patientMongoId = p._id?.toString();
                  return patientId === recordPatientId || patientMongoId === recordPatientId ||
                    patientId === recordPatient || patientMongoId === recordPatient;
                });

                if (finalAttempt) {
                  console.log(`🔍 [${mode.toUpperCase()} RECORD] Found patient in final attempt:`, finalAttempt);
                  foundPatient = finalAttempt;
                } else {
                  // Last resort: create a minimal patient object from the record data
                  console.log(`🔍 [${mode.toUpperCase()} RECORD] Creating minimal patient object from record data`);
                  foundPatient = {
                    id: record.patient?._id || record.patientId || record.patient,
                    _id: record.patient?._id || record.patientId || record.patient,
                    firstName: record.patient?.firstName || record.patientName?.split(' ')[0] || 'Unknown',
                    lastName: record.patient?.lastName || record.patientName?.split(' ').slice(1).join(' ') || 'Patient',
                    patientId: record.patient?.patientId || record.patientId || 'Unknown',
                    name: record.patientName || 'Unknown Patient'
                  };
                  console.log(`🔍 [${mode.toUpperCase()} RECORD] Created minimal patient:`, foundPatient);
                }
              }
            }
          }
        } catch (fetchError) {
          console.warn(`🔍 [${mode.toUpperCase()} RECORD] Failed to fetch patients with broader criteria:`, fetchError);

          // Last resort: create a minimal patient object from the record data
          console.log(`🔍 [${mode.toUpperCase()} RECORD] Creating minimal patient object from record data (fallback)`);
          foundPatient = {
            id: record.patient?._id || record.patientId || record.patient,
            _id: record.patient?._id || record.patientId || record.patient,
            firstName: record.patient?.firstName || record.patientName?.split(' ')[0] || 'Unknown',
            lastName: record.patient?.lastName || record.patientName?.split(' ').slice(1).join(' ') || 'Patient',
            patientId: record.patient?.patientId || record.patientId || 'Unknown',
            name: record.patientName || 'Unknown Patient'
          };
          console.log(`🔍 [${mode.toUpperCase()} RECORD] Created minimal patient:`, foundPatient);
        }
      }

      console.log(`🔍 [${mode.toUpperCase()} RECORD] Found patient:`, foundPatient);
      console.log(`🔍 [${mode.toUpperCase()} RECORD] Record ID:`, record._id || record.id);

      // For both edit and view modes, fetch the complete record data
      let completeRecordData = record;
      if (mode === 'edit' || mode === 'view') {
        try {
          console.log(`🔍 [${mode.toUpperCase()} RECORD] Fetching complete record data for ${mode}...`);
          const recordId = record._id || record.id;
          const response = await api.get(`/api/medical-records/${recordId}/optimized`);
          completeRecordData = response.data.data;
          console.log(`🔍 [${mode.toUpperCase()} RECORD] Complete record data fetched:`, completeRecordData);
        } catch (fetchError) {
          console.warn(`🔍 [${mode.toUpperCase()} RECORD] Failed to fetch complete record, using dashboard data:`, fetchError);
          // Fall back to dashboard data if fetch fails
          completeRecordData = record;
        }
      }

      // Set up the patient object with record data for the form
      const patientWithRecordData = {
        ...foundPatient,
        _existingRecordData: completeRecordData, // Pass the complete record data
        _recordId: record._id || record.id,
        _mode: mode // Set to the specified mode (view or edit)
      };

      console.log('🔍 [DEBUG] Setting selectedPatientObject with record data:', {
        patientId: foundPatient?.id || foundPatient?._id,
        recordId: record._id || record.id,
        mode: mode,
        hasExistingRecordData: !!completeRecordData,
        existingRecordDataKeys: completeRecordData ? Object.keys(completeRecordData) : []
      });

      setSelectedPatientObject(patientWithRecordData);

      // Open the medical record form
      setIsMedicalRecordOpen(true);

      toast.success(`${mode === 'edit' ? 'Editing' : 'Opening'} medical record: ${record._id || record.id}`);
    } catch (error) {
      console.error(`🔍 [${mode.toUpperCase()} RECORD] Error:`, error);
      toast.error(`Error ${mode === 'edit' ? 'editing' : 'opening'} medical record`);
    }
  };

  // Fetch prescriptions when prescriptions tab is activated
  useEffect(() => {
    if (activeTab === 'prescriptions') {
      fetchAllPrescriptions();
    }
  }, [activeTab]);

  // Ensure patients are loaded when Medical Records tab is active
  useEffect(() => {
    if (activeTab === 'Medical Records' && user && (user.id || user._id)) {
      console.log('[DoctorDashboard] Medical Records tab active, ensuring patients are loaded...');

      // If no patients loaded, fetch them with broader criteria
      if (patients.length === 0) {
        const loadPatientsForMedicalRecords = async () => {
          try {
            const currentDoctorId = user?.id || user?._id;
            if (currentDoctorId) {
              const response = await patientService.getAllPatients(true, true, 100);
              if (response && response.patients) {
                // Use all patients assigned to this doctor, not just those with complete workflow
                const allDoctorPatients = response.patients.filter((p: any) =>
                  p.assignedDoctor?.id?.toString() === currentDoctorId?.toString()
                );
                console.log(`[DoctorDashboard] Loaded ${allDoctorPatients.length} patients for Medical Records tab`);
                setPatients(allDoctorPatients);
              }
            }
          } catch (error) {
            console.warn('[DoctorDashboard] Failed to load patients for Medical Records tab:', error);
          }
        };

        loadPatientsForMedicalRecords();
      }
    }
  }, [activeTab, user, patients.length]);

  // Function to refresh data after creating a prescription
  const refreshAfterPrescriptionCreated = async () => {
    // Refresh the medical record display if we're on that tab
    if (activeTab === 'Medical Records' && selectedPatient) {
      const medicalRecordsSection = document.getElementById('medical-records-section');
      if (medicalRecordsSection) {
        const currentDisplay = medicalRecordsSection.style.display;
        medicalRecordsSection.style.display = 'none';
        setTimeout(() => {
          medicalRecordsSection.style.display = currentDisplay;
        }, 50);
      }
    }

    // Only refresh the prescriptions list — no need to reload the entire patient list
    fetchAllPrescriptions();
  };

  // Add manual refresh function
  const handleManualRefresh = async () => {
    console.log("Manual refresh triggered");
    toast.success("Refreshing dashboard data...");
    // Clear patient cache to force fresh data
    patientService.clearPatientsCache();
    await fetchData();
  };

  // Add comprehensive cache clearing function
  const handleClearAllCaches = async () => {
    console.log('[DoctorDashboard] Clearing all caches and refreshing with database data only...');

    try {
      // Show loading toast
      toast.loading('Clearing all caches and fetching fresh data...', { duration: 3000 });

      // Clear patient service cache
      patientService.clearPatientsCache();

      // Clear localStorage
      clearLocalStorageCache();

      // Clear component state
      setPatients([]);
      setLabResults([]);
      setPrescriptions([]);
      setMedicalRecords([]);

      toast.success('All caches cleared! Please refresh the page to see updated data.');
    } catch (error) {
      console.error('Error clearing caches:', error);
      toast.error('Error clearing caches. Please refresh the page manually.');
    }
  };

  // Update the renderDialogs function
  const renderDialogs = () => (
    <>
      {/* Other dialogs */}
      {/* Prescription Dialog - Full Screen Modal */}
      {isPrescriptionDialogOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex flex-col">
          <div className="bg-background w-full h-full overflow-y-auto flex flex-col">
            <ProfessionalPrescriptionForm
              patient={selectedPatientObject}
              onClose={() => setIsPrescriptionDialogOpen(false)}
              onSubmit={handlePrescriptionSubmit}
            />
          </div>
        </div>
      )}

      {/* Lab Test Dialog - Full Screen */}
      {isLabRequestModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex flex-col">
          <div className="bg-background w-full h-full overflow-y-auto flex flex-col">
            <div className="bg-primary text-primary-foreground px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Order Lab Test</h2>
              <button
                onClick={() => setIsLabRequestModalOpen(false)}
                className="text-primary-foreground hover:text-primary-foreground/80 focus:outline-none"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoadingLab ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-destructive p-4">{error}</div>
              ) : (
                <div className="h-full overflow-y-auto">
                  <LabRequestForm
                    patientId={selectedPatient}
                    onSubmit={handleLabRequestSubmit}
                    onClose={() => setIsLabRequestModalOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Imaging Request Dialog - Upgraded */}
      {isImagingDialogOpen && (() => {
        const imagingTypeConfigs: Record<string, { icon: React.ReactNode; color: string; description: string; duration: string }> = {
          'X-Ray': { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>, color: 'blue', description: 'Bone fractures, lung, chest', duration: '15–30 min' },
          'Ultrasound': { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>, color: 'green', description: 'Soft tissue, abdomen, OB', duration: '30–45 min' },
          'CT': { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1M3 12h1m16 0h1m-2.636-7.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707M17.657 17.657l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>, color: 'orange', description: 'Detailed cross-sectional', duration: '15–60 min' },
          'MRI': { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>, color: 'purple', description: 'Brain, spine, soft tissue', duration: '45–90 min' },
          'Mammography': { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>, color: 'pink', description: 'Breast screening & diagnosis', duration: '20–30 min' },
          'Echocardiogram': { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, color: 'red', description: 'Heart structure & function', duration: '30–60 min' },
          'Other': { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>, color: 'gray', description: 'Specify in clinical info', duration: 'Varies' },
        };
        const colorMap: Record<string, { bg: string; border: string; text: string; ring: string; selBg: string }> = {
          blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', ring: 'ring-blue-400', selBg: 'bg-blue-100' },
          green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', ring: 'ring-green-400', selBg: 'bg-green-100' },
          orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', ring: 'ring-orange-400', selBg: 'bg-orange-100' },
          purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', ring: 'ring-purple-400', selBg: 'bg-purple-100' },
          pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', ring: 'ring-pink-400', selBg: 'bg-pink-100' },
          red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-400', selBg: 'bg-red-100' },
          gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', ring: 'ring-gray-400', selBg: 'bg-gray-100' },
          amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-400', selBg: 'bg-amber-100' },
        };

        const bodyPartOptions: Record<string, Record<string, string[]>> = {
          'X-Ray': {
            'Chest & Thorax': ['Chest X-Ray', 'Lung', 'Heart', 'Ribs', 'Diaphragm'],
            'Abdomen & Pelvis': ['Abdomen X-Ray', 'Pelvis X-Ray', 'Kidney X-Ray', 'Bladder X-Ray'],
            'Head & Neck': ['Skull X-Ray', 'Face X-Ray', 'Neck X-Ray', 'Sinuses X-Ray', 'Dental X-Ray'],
            'Spine': ['Cervical Spine X-Ray', 'Thoracic Spine X-Ray', 'Lumbar Spine X-Ray', 'Sacrum X-Ray'],
            'Upper Extremities': ['Shoulder X-Ray', 'Arm X-Ray', 'Elbow X-Ray', 'Wrist X-Ray', 'Hand X-Ray', 'Fingers X-Ray'],
            'Lower Extremities': ['Hip X-Ray', 'Thigh X-Ray', 'Knee X-Ray', 'Leg X-Ray', 'Ankle X-Ray', 'Foot X-Ray', 'Toes X-Ray'],
            'Other': ['Bone Scan', 'Joint X-Ray', 'Other X-Ray'],
          },
          'Ultrasound': {
            'Abdomen & Pelvis': ['Abdominal Ultrasound', 'Pelvic Ultrasound', 'Liver Ultrasound', 'Kidney Ultrasound', 'Spleen Ultrasound', 'Pancreas Ultrasound', 'Gallbladder Ultrasound', 'Bladder Ultrasound'],
            'Obstetrics & Gynecology': ['Obstetric Ultrasound', 'Pregnancy Ultrasound', 'Fetal Ultrasound', 'Uterus Ultrasound', 'Ovaries Ultrasound', 'Breast Ultrasound', 'Transvaginal Ultrasound'],
            'Cardiovascular': ['Echocardiogram', 'Carotid Ultrasound', 'Venous Ultrasound', 'Arterial Ultrasound'],
            'Musculoskeletal': ['Shoulder Ultrasound', 'Knee Ultrasound', 'Hip Ultrasound', 'Tendon Ultrasound', 'Muscle Ultrasound'],
            'Male Specific': ['Scrotal Ultrasound', 'Testicular Ultrasound', 'Prostate Ultrasound'],
            'Other': ['Thyroid Ultrasound', 'Neck Ultrasound', 'Eye Ultrasound', 'Other Ultrasound'],
          },
          'CT': {
            'Chest & Thorax': ['Chest CT', 'Lung CT', 'Heart CT', 'Mediastinum CT'],
            'Abdomen & Pelvis': ['Abdominal CT', 'Pelvic CT', 'Liver CT', 'Kidney CT', 'Spleen CT', 'Pancreas CT', 'Gallbladder CT', 'Bladder CT'],
            'Head & Neck': ['Head CT', 'Brain CT', 'Face CT', 'Neck CT', 'Sinuses CT', 'Orbits CT'],
            'Spine': ['Cervical Spine CT', 'Thoracic Spine CT', 'Lumbar Spine CT', 'Sacrum CT'],
            'Extremities': ['Shoulder CT', 'Knee CT', 'Ankle CT', 'Wrist CT', 'Hip CT'],
            'Vascular': ['CTA Head', 'CTA Chest', 'CTA Abdomen', 'CTA Extremities'],
            'Other': ['Whole Body CT', 'Other CT'],
          },
          'MRI': {
            'Brain & Head': ['Brain MRI', 'Head MRI', 'Face MRI', 'Orbits MRI', 'Pituitary MRI'],
            'Spine': ['Cervical Spine MRI', 'Thoracic Spine MRI', 'Lumbar Spine MRI', 'Sacrum MRI', 'Cauda Equina MRI'],
            'Chest & Thorax': ['Chest MRI', 'Heart MRI', 'Lung MRI', 'Mediastinum MRI'],
            'Abdomen & Pelvis': ['Abdominal MRI', 'Pelvic MRI', 'Liver MRI', 'Kidney MRI', 'Pancreas MRI', 'Prostate MRI', 'Uterus MRI', 'Ovaries MRI'],
            'Extremities': ['Shoulder MRI', 'Knee MRI', 'Hip MRI', 'Ankle MRI', 'Wrist MRI', 'Elbow MRI'],
            'Breast': ['Breast MRI', 'Breast MRI Bilateral'],
            'Vascular': ['MRA Head', 'MRA Neck', 'MRA Chest', 'MRA Abdomen', 'MRA Extremities'],
            'Other': ['Whole Body MRI', 'Other MRI'],
          },
          'Mammography': { 'Breast': ['Bilateral Mammogram', 'Left Breast Mammogram', 'Right Breast Mammogram', 'Diagnostic Mammogram'] },
          'Echocardiogram': { 'Cardiac': ['Transthoracic Echo (TTE)', 'Transesophageal Echo (TEE)', 'Stress Echocardiogram', 'Doppler Echocardiogram'] },
          'Other': { 'Other': ['Fluoroscopy', 'PET Scan', 'Nuclear Medicine', 'DEXA Scan', 'Angiography', 'Other (specify)'] },
        };

        const selTypeConf = imagingTypeConfigs[imagingType] || imagingTypeConfigs['Other'];
        const selColors = colorMap[selTypeConf.color];
        const effectiveBP = bodyPart === 'Other (specify)' ? customBodyPart : bodyPart;
        const currentBodyParts = bodyPartOptions[imagingType] || {};

        const handleImagingSubmit = async () => {
          const errs: Record<string, string> = {};
          if (!effectiveBP.trim()) errs.bodyPart = 'Please select or specify a body part.';
          if (!clinicalInfo.trim()) errs.clinicalInfo = 'Clinical information is required.';
          setImagingFieldErrors(errs);
          if (Object.keys(errs).length > 0) return;

          if (!selectedPatientObject) { toast.error('Please select a patient first'); return; }

          try {
            setIsLoadingImaging(true);
            const patientId = selectedPatientObject.id || selectedPatientObject._id;
            const patientVisits = visits.filter((v: any) => (v.patientId === patientId || v.patient === patientId));
            patientVisits.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const latestVisitId = patientVisits.length > 0 ? (patientVisits[0]._id || patientVisits[0].id) : undefined;
            await imagingService.createImagingOrder({
              patientId, imagingType, bodyPart: effectiveBP.trim(), clinicalInfo: clinicalInfo.trim(),
              priority: imagingPriority,
              ...(imagingLaterality !== 'N/A' && { laterality: imagingLaterality }),
              ...(imagingContrast && { contrastRequired: true }),
              ...(latestVisitId && { visitId: latestVisitId }),
            });
            toast.success('Imaging request submitted successfully');
            setImagingType('X-Ray'); setBodyPart(''); setClinicalInfo('');
            setImagingPriority('Routine'); setImagingLaterality('N/A'); setImagingContrast(false);
            setCustomBodyPart(''); setImagingFieldErrors({});
            setIsImagingDialogOpen(false);
          } catch (err: any) {
            console.error('Error creating imaging order:', err);
            toast.error(err.response?.data?.msg || 'Failed to submit imaging request');
          } finally {
            setIsLoadingImaging(false);
          }
        };

        const handleImagingClose = () => {
          setImagingType('X-Ray'); setBodyPart(''); setClinicalInfo('');
          setImagingPriority('Routine'); setImagingLaterality('N/A'); setImagingContrast(false);
          setCustomBodyPart(''); setImagingFieldErrors({});
          setIsImagingDialogOpen(false);
        };

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-xl">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Request Imaging</h2>
                    <p className="text-indigo-200 text-xs mt-0.5">Order imaging studies for the patient</p>
                  </div>
                </div>
                <button onClick={handleImagingClose} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Patient bar */}
              {selectedPatientObject && (
                <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                    {(selectedPatientObject.name || selectedPatientObject.firstName || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-indigo-900">{selectedPatientObject.name || `${selectedPatientObject.firstName || ''} ${selectedPatientObject.lastName || ''}`.trim() || 'Patient'}</span>
                    <span className="text-indigo-300">·</span>
                    <span className="text-indigo-500 text-xs font-mono">{selectedPatientObject.patientId || selectedPatientObject.id || selectedPatientObject._id}</span>
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {isLoadingImaging ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Imaging Type */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Imaging Type <span className="text-red-400">*</span></label>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(imagingTypeConfigs).map(([type, conf]) => {
                          const c = colorMap[conf.color];
                          const isSel = imagingType === type;
                          return (
                            <button key={type} type="button"
                              onClick={() => { setImagingType(type); setBodyPart(''); setCustomBodyPart(''); }}
                              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${isSel ? `${c.selBg} ${c.border} ring-2 ${c.ring} shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                            >
                              {isSel && (
                                <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full ${c.bg} ${c.border} border flex items-center justify-center`}>
                                  <svg className={`w-2.5 h-2.5 ${c.text}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                </div>
                              )}
                              <span className={isSel ? c.text : 'text-gray-400'}>{conf.icon}</span>
                              <span className={`text-xs font-semibold ${isSel ? c.text : 'text-gray-600'}`}>{type === 'CT' ? 'CT Scan' : type}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className={`mt-2 flex items-center gap-3 px-3 py-2 rounded-lg ${selColors.bg} ${selColors.border} border`}>
                        <span className={selColors.text}>{selTypeConf.icon}</span>
                        <div>
                          <p className={`text-xs font-medium ${selColors.text}`}>{selTypeConf.description}</p>
                          <p className="text-xs text-gray-400">Typical duration: {selTypeConf.duration}</p>
                        </div>
                      </div>
                    </div>

                    {/* Body Part */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Body Part / Examination Area <span className="text-red-400">*</span></label>
                      <select
                        value={bodyPart}
                        onChange={e => { setBodyPart(e.target.value); setImagingFieldErrors(p => ({ ...p, bodyPart: '' })); }}
                        className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50 ${imagingFieldErrors.bodyPart ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                      >
                        <option value="">— Select examination area —</option>
                        {Object.entries(currentBodyParts).map(([region, parts]) => (
                          <optgroup key={region} label={region}>
                            {(parts as string[]).map(p => <option key={p} value={p}>{p}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      {bodyPart === 'Other (specify)' && (
                        <input type="text" value={customBodyPart} onChange={e => { setCustomBodyPart(e.target.value); setImagingFieldErrors(p => ({ ...p, bodyPart: '' })); }}
                          placeholder="Specify body part or area..."
                          className="mt-2 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
                      )}
                      {imagingFieldErrors.bodyPart && <p className="text-xs text-red-500 mt-1">{imagingFieldErrors.bodyPart}</p>}
                    </div>

                    {/* Laterality + Contrast */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Laterality</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['N/A', 'Left', 'Right', 'Bilateral'] as const).map(side => (
                            <button key={side} type="button" onClick={() => setImagingLaterality(side)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${imagingLaterality === side ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                              {side}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contrast</label>
                        <button type="button" onClick={() => setImagingContrast(c => !c)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${imagingContrast ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${imagingContrast ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                            {imagingContrast && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          Contrast Required
                        </button>
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Priority</label>
                      <div className="flex gap-2">
                        {([['Routine', '📋', 'Standard scheduling', 'blue'], ['Urgent', '⚡', 'Within 24 hours', 'amber'], ['STAT', '🚨', 'Immediate', 'red']] as const).map(([key, icon, desc, col]) => {
                          const isSel = imagingPriority === key;
                          const c = colorMap[col];
                          return (
                            <button key={key} type="button" onClick={() => setImagingPriority(key as 'Routine' | 'Urgent' | 'STAT')}
                              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl border-2 transition-all ${isSel ? `${c.selBg} ${c.border} shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                              <span className="text-base">{icon}</span>
                              <span className={`text-xs font-bold ${isSel ? c.text : 'text-gray-600'}`}>{key}</span>
                              <span className={`text-xs ${isSel ? c.text : 'text-gray-400'} opacity-80`}>{desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clinical Information */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Clinical Information <span className="text-red-400">*</span></label>
                      <textarea value={clinicalInfo} onChange={e => { setClinicalInfo(e.target.value); setImagingFieldErrors(p => ({ ...p, clinicalInfo: '' })); }}
                        placeholder="Describe the clinical indication, relevant history, symptoms, or specific areas of concern..."
                        rows={3}
                        className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50 resize-none placeholder-gray-300 ${imagingFieldErrors.clinicalInfo ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                      />
                      <div className="flex justify-between mt-1">
                        {imagingFieldErrors.clinicalInfo ? <p className="text-xs text-red-500">{imagingFieldErrors.clinicalInfo}</p> : <span />}
                        <span className="text-xs text-gray-300">{clinicalInfo.length} chars</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
                {imagingType && effectiveBP ? (
                  <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${selColors.bg} ${selColors.text} border ${selColors.border}`}>
                    <span>{selTypeConf.icon}</span>
                    <span>{imagingType === 'CT' ? 'CT Scan' : imagingType} — {effectiveBP}</span>
                    {imagingLaterality !== 'N/A' && <span className="opacity-70">· {imagingLaterality}</span>}
                    {imagingContrast && <span className="opacity-70">· +Contrast</span>}
                  </div>
                ) : <span />}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleImagingClose} disabled={isLoadingImaging}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="button" onClick={handleImagingSubmit} disabled={isLoadingImaging}
                    className={`px-6 py-2 text-sm font-semibold text-white rounded-xl focus:outline-none transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${imagingPriority === 'STAT' ? 'bg-red-600 hover:bg-red-700' : imagingPriority === 'Urgent' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {isLoadingImaging ? (
                      <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Submitting...</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Submit Request</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );

  // Add function to fetch medical records with optional patient filter
  const fetchAllMedicalRecords = async (retryCount = 0, useFallback = false, patientId?: string) => {
    setMedicalRecordsLoading(true);
    const startTime = Date.now();

    try {
      console.log(`[FETCH MEDICAL RECORDS] Starting request for patient:`, patientId, `with status filter:`, medicalRecordsStatusFilter);

      // Show progress message to user
      if (patientId) {
        toast(`Loading medical records for patient...`, {
          icon: '📋',
          duration: 2000,
        });
      } else {
        const filterText = medicalRecordsStatusFilter === 'active' ? 'active' : medicalRecordsStatusFilter === 'finalized' ? 'finalized' : 'all';
        toast(`Loading ${filterText} medical records...`, {
          icon: '🔄',
          duration: 2000,
        });
      }

      // Choose endpoint based on filter
      let endpoint = '/api/medical-records/dashboard-lite';
      let params: any = { limit: 10, page: medicalRecordsPage, ...(patientId && { patientId }) };

      // If filtering for finalized records, use the finalized endpoint
      if (medicalRecordsStatusFilter === 'finalized') {
        endpoint = '/api/medical-records/finalized';
        params = {
          limit: 10,
          page: medicalRecordsPage,
          ...(patientId && { patientId }),
          includeCount: 'true'
        };
      } else if (medicalRecordsStatusFilter === 'all') {
        // For 'all', use the main endpoint which allows status filtering
        endpoint = '/api/medical-records';
        params = {
          limit: 10,
          page: medicalRecordsPage,
          ...(patientId && { patientId }),
          includeCount: 'true'
        };
      }

      console.log(`[FETCH MEDICAL RECORDS] Endpoint:`, endpoint);
      console.log(`[FETCH MEDICAL RECORDS] Request params:`, params);

      const response = await api.get(endpoint, {
        params,
        timeout: 8000, // 8 second timeout
      });

      const loadTime = Date.now() - startTime;
      console.log(`[FETCH MEDICAL RECORDS] Success! Fetched medical records in ${loadTime}ms`);

      const records = response.data?.data || [];
      console.log(`[FETCH MEDICAL RECORDS] Processed ${records.length} records`);
      try {
        const pagination = response.data?.pagination || {};
        setMedicalRecordsTotalPages(pagination.totalPages || medicalRecordsTotalPages || 1);
      } catch { }

      // If no records found, show helpful message
      if (records.length === 0) {
        const message = patientId
          ? `No medical records found for this patient`
          : response.data?.message || `No ${medicalRecordsStatusFilter} medical records found`;
        console.log(`[FETCH MEDICAL RECORDS] ${message}`);
        toast(message, { duration: 3000 });
      }

      // Apply frontend filtering based on status filter
      let filteredRecords = records;
      if (medicalRecordsStatusFilter === 'active') {
        // Filter out finalized records - only show active/draft
        filteredRecords = records.filter(record => {
          const status = record.status?.toLowerCase() || '';
          return !['finalized', 'completed', 'closed', 'archived'].includes(status);
        });
        console.log(`[FETCH MEDICAL RECORDS] Filtered out ${records.length - filteredRecords.length} finalized records`);
      } else if (medicalRecordsStatusFilter === 'finalized') {
        // Only show finalized records
        filteredRecords = records.filter(record => {
          const status = record.status?.toLowerCase() || '';
          return ['finalized', 'completed', 'closed', 'archived'].includes(status);
        });
        console.log(`[FETCH MEDICAL RECORDS] Showing ${filteredRecords.length} finalized records`);
      }
      // For 'all', show all records without filtering

      // Data is already sorted on the backend by creation date (newest first)
      setMedicalRecords(filteredRecords);

      // Show success message
      if (retryCount > 0) {
        toast.success(`Medical records loaded successfully (${loadTime}ms)`);
      } else if (filteredRecords.length > 0) {
        const patient = selectedPatientForMedicalRecords;
        if (patient && patientId) {
          toast.success(`Found ${filteredRecords.length} medical record${filteredRecords.length === 1 ? '' : 's'} for ${patient.firstName} ${patient.lastName}`);
        } else {
          toast.success(`Loaded ${filteredRecords.length} medical record${filteredRecords.length === 1 ? '' : 's'}`);
        }
      }

    } catch (error: any) {
      const loadTime = Date.now() - startTime;
      console.error(`[FETCH MEDICAL RECORDS] Error after ${loadTime}ms:`, error.message);

      // Show simple error message without retries
      toast.error('Failed to load medical records. Please try refreshing.');
      setMedicalRecords([]);
    } finally {
      const totalTime = Date.now() - startTime;
      console.log(`[FETCH MEDICAL RECORDS] Completed after ${totalTime}ms`);
      setMedicalRecordsLoading(false);
    }
  };

  // Add useEffect to fetch medical records on mount and when active tab changes
  useEffect(() => {
    if (activeTab === 'Medical Records') {
      const patient = selectedPatientForMedicalRecords;
      if (patient) {
        // Check if this is a completed patient (status === 'completed')
        if (patient.status === 'completed' && medicalRecordsStatusFilter === 'finalized') {
          // For completed patients viewing finalized records, use finalized endpoint
          const patientIdToUse = patient._id || patient.id;
          console.log(`[USE EFFECT] Fetching finalized records for completed patient: ${patientIdToUse}`);
          fetchFinalizedMedicalRecords(patientIdToUse);
        } else {
          // For active patients or when viewing all/active records, fetch regular records
          const patientId = patient.id;
          console.log(`[USE EFFECT] Fetching records for active patient: ${patientId} with filter: ${medicalRecordsStatusFilter}`);
          fetchAllMedicalRecords(0, false, patientId);
        }
      } else {
        // No patient selected, fetch all records based on filter
        console.log(`[USE EFFECT] Fetching medical records with filter: ${medicalRecordsStatusFilter}`);
        fetchAllMedicalRecords(0, false);
      }
    }
  }, [activeTab, selectedPatientForMedicalRecords, medicalRecordsStatusFilter]);

  // Re-fetch medical records when page changes on the Medical Records tab
  useEffect(() => {
    if (activeTab === 'Medical Records') {
      const patient = selectedPatientForMedicalRecords;
      if (patient && patient.status === 'completed') {
        const patientIdToUse = patient._id || patient.id;
        fetchFinalizedMedicalRecords(patientIdToUse);
      } else {
        fetchAllMedicalRecords(0, false, patient?.id);
      }
    }
  }, [medicalRecordsPage]);

  // Add function to handle viewing patient medical records
  const handleViewPatientMedicalRecords = (patient: PatientType) => {
    setSelectedPatientForMedicalRecords(patient);
    setActiveTab('Medical Records');

    // Show loading message
    toast(`Loading medical records for ${patient.firstName} ${patient.lastName}...`, {
      icon: '📋',
      duration: 2000,
    });

    // For completed patients, we need to fetch finalized records
    // Use the patient's _id (ObjectId) instead of patientId for better compatibility
    const patientIdToUse = patient._id || patient.id;
    console.log(`[VIEW HISTORY] Using patient ID: ${patientIdToUse} for ${patient.firstName} ${patient.lastName}`);

    // Fetch finalized records for completed patients
    fetchFinalizedMedicalRecords(patientIdToUse);
  };

  // Add function to fetch finalized medical records
  const fetchFinalizedMedicalRecords = async (patientId: string) => {
    setMedicalRecordsLoading(true);
    const startTime = Date.now();

    try {
      console.log(`[FETCH FINALIZED RECORDS] Starting request for patient: ${patientId}`);

      // Use the finalized endpoint for completed patients
      const endpoint = '/api/medical-records/finalized';
      const params = {
        limit: 10,
        page: medicalRecordsPage,
        patientId: patientId,
        includeCount: 'true'
      };

      console.log(`[FETCH FINALIZED RECORDS] Endpoint: ${endpoint}`);
      console.log(`[FETCH FINALIZED RECORDS] Request params:`, params);

      const response = await api.get(endpoint, {
        params,
        timeout: 10000, // 10 second timeout for finalized records
      });

      const loadTime = Date.now() - startTime;
      console.log(`[FETCH FINALIZED RECORDS] Success! Fetched finalized records in ${loadTime}ms`);

      const records = response.data?.data || [];
      console.log(`[FETCH FINALIZED RECORDS] Processed ${records.length} finalized records`);
      try {
        const pagination = response.data?.pagination || {};
        setMedicalRecordsTotalPages(pagination.totalPages || medicalRecordsTotalPages || 1);
      } catch { }

      // If no records found, show helpful message
      if (records.length === 0) {
        const message = `No finalized medical records found for this patient`;
        console.log(`[FETCH FINALIZED RECORDS] ${message}`);
        toast(message, { duration: 3000 });
      } else {
        toast.success(`Found ${records.length} finalized medical record${records.length === 1 ? '' : 's'}`);
      }

      // Set the finalized records
      setMedicalRecords(records);

    } catch (error: any) {
      const loadTime = Date.now() - startTime;
      console.error(`[FETCH FINALIZED RECORDS] Error after ${loadTime}ms:`, error.message);

      // Show error message
      toast.error('Failed to load finalized medical records. Please try refreshing.');
      setMedicalRecords([]);
    } finally {
      const totalTime = Date.now() - startTime;
      console.log(`[FETCH FINALIZED RECORDS] Completed after ${totalTime}ms`);
      setMedicalRecordsLoading(false);
    }
  };

  // Update the Medical Records Tab content
  const renderMedicalRecordsTab = () => (
    <div className="mt-4 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <LucideFileText className="w-5 h-5 text-white" />
          </div>
          <div>
            {selectedPatientForMedicalRecords ? (
              <>
                <h3 className="text-base font-bold text-blue-900">
                  {selectedPatientForMedicalRecords.firstName} {selectedPatientForMedicalRecords.lastName}
                </h3>
                <p className="text-xs text-blue-600">
                  ID: {selectedPatientForMedicalRecords.patientId || selectedPatientForMedicalRecords.patientCode || selectedPatientForMedicalRecords.id}
                  {selectedPatientForMedicalRecords.age && ` · ${selectedPatientForMedicalRecords.age}y`}
                  {selectedPatientForMedicalRecords.gender && ` · ${selectedPatientForMedicalRecords.gender}`}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-blue-900">All Medical Records</h3>
                <p className="text-xs text-blue-600">Showing recent records from all patients</p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedPatientForMedicalRecords && (
            <button
              onClick={() => { setSelectedPatientForMedicalRecords(null); fetchAllMedicalRecords(); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ArrowBack className="h-3 w-3" /> All Records
            </button>
          )}
          <select
            className="px-3 py-1.5 text-xs border border-blue-200 rounded-lg bg-white text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={medicalRecordsStatusFilter}
            onChange={(e) => { setMedicalRecordsStatusFilter(e.target.value as any); setMedicalRecordsPage(1); }}
          >
            <option value="active">Active & Draft</option>
            <option value="finalized">Finalized Only</option>
            <option value="all">All Records</option>
          </select>
          {selectedPatientForMedicalRecords && (
            <button
              onClick={() => handleOpenMedicalRecord(selectedPatientForMedicalRecords)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-3 w-3" /> New Record
            </button>
          )}
          <button
            onClick={() => {
              const patient = selectedPatientForMedicalRecords;
              if (patient && patient.status === 'completed' && medicalRecordsStatusFilter === 'finalized') {
                fetchFinalizedMedicalRecords(patient._id || patient.id);
              } else {
                fetchAllMedicalRecords(0, false, patient?.id);
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {medicalRecordsLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">
            {selectedPatientForMedicalRecords
              ? `Loading records for ${selectedPatientForMedicalRecords.firstName}...`
              : 'Loading medical records...'}
          </p>
        </div>
      ) : medicalRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-gray-800">
              {selectedPatientForMedicalRecords
                ? `No records for ${selectedPatientForMedicalRecords.firstName} ${selectedPatientForMedicalRecords.lastName}`
                : 'No medical records found'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedPatientForMedicalRecords
                ? 'Create a new record to get started.'
                : 'Medical records you create will appear here.'}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedPatientForMedicalRecords && (
              <button
                onClick={() => handleOpenMedicalRecord(selectedPatientForMedicalRecords)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4" /> Create Record
              </button>
            )}
            <button
              onClick={() => {
                const patient = selectedPatientForMedicalRecords;
                if (patient && patient.status === 'completed') {
                  fetchFinalizedMedicalRecords(patient._id || patient.id);
                } else {
                  fetchAllMedicalRecords(0, false, patient?.id);
                }
              }}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Count bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {selectedPatientForMedicalRecords ? 'Patient Medical History' : 'Recent Medical Records'}
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">{medicalRecords.length}</span>
            </p>
            <p className="text-xs text-gray-400">
              {medicalRecordsStatusFilter === 'active' ? 'Active & draft records' : medicalRecordsStatusFilter === 'finalized' ? 'Finalized records only' : 'All records'}
            </p>
          </div>

          {/* Records Table */}
          <div className="rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {!selectedPatientForMedicalRecords && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Chief Complaint</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Diagnosis</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {medicalRecords.map((record, idx) => {
                  const isFinalized = record.status === 'Finalized' || record.status === 'finalized';
                  const isDraft = record.status === 'Draft' || record.status === 'draft' || !record.status;
                  return (
                    <tr key={record._id || record.id} className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      {!selectedPatientForMedicalRecords && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white">
                                {(record.patientName || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{record.patientName || 'Unknown Patient'}</div>
                              <div className="text-xs text-gray-400 font-mono">{record.patientIdNumber || record.patientId || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-800">{formatDate(record.createdAt)}</div>
                        <div className="text-xs text-gray-400">{formatTime(record.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${isFinalized ? 'bg-emerald-100 text-emerald-700' :
                          isDraft ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isFinalized ? 'bg-emerald-500' : isDraft ? 'bg-amber-500' : 'bg-gray-400'}`} />
                          {record.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 line-clamp-1 max-w-[180px] block">
                          {record.chiefComplaint?.description ?? (typeof record.chiefComplaint === 'string' ? record.chiefComplaint : null) ?? <span className="text-gray-400 italic">Not specified</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 line-clamp-1 max-w-[180px] block">
                          {record.primaryDiagnosis?.description || record.diagnosis || <span className="text-gray-400 italic">Not specified</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewExistingRecord(record, 'view')}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <LucideFileText className="h-3 w-3" /> View
                          </button>
                          {!isFinalized && (
                            <button
                              onClick={() => handleViewExistingRecord(record, 'edit')}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          {!selectedPatientForMedicalRecords && (
                            <button
                              onClick={() => {
                                const patientId = record.patientId;
                                if (patientId) {
                                  const patient = patients.find(p => p.id === patientId);
                                  if (patient) handleViewPatientMedicalRecords(patient);
                                  else toast.error('Patient not found. Please refresh.');
                                } else toast.error('Patient ID not available');
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <LucideUser className="h-3 w-3" /> Patient
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">Page {medicalRecordsPage} of {medicalRecordsTotalPages}</p>
              <div className="flex gap-2">
                <button
                  disabled={medicalRecordsPage <= 1}
                  onClick={() => setMedicalRecordsPage(Math.max(1, medicalRecordsPage - 1))}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Previous</button>
                <button
                  disabled={medicalRecordsPage >= medicalRecordsTotalPages}
                  onClick={() => setMedicalRecordsPage(Math.min(medicalRecordsTotalPages, medicalRecordsPage + 1))}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Next</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Each prescription is its own row (grouped by prescription _id)
  const groupedPrescriptions = useMemo(() => {
    const result = (prescriptions || []).map((p: any) => {
      // 1. Try to find the patient from the 'patients' master list (most up-to-date)
      const pId = p.patientId || (typeof p.patient === 'object' ? p.patient?._id || p.patient?.id : p.patient);
      const masterPatient = pId && patients && patients.length > 0 
        ? patients.find((pat: any) => {
            const patId = pat._id || pat.id;
            return patId && patId.toString() === pId.toString();
          }) 
        : null;

      const patientObj = masterPatient || p.patient;

      const patientNameFinal =
        (patientObj && typeof patientObj === 'object' && (patientObj.firstName || patientObj.lastName))
          ? `${patientObj.firstName || ''} ${patientObj.lastName || ''}`.trim()
          : (p.patientSnapshot && p.patientSnapshot.firstName)
            ? `${p.patientSnapshot.firstName || ''} ${p.patientSnapshot.lastName || ''}`.trim()
            : (p.patientName && p.patientName !== 'Unknown Patient' && p.patientName !== 'Patient Name')
              ? p.patientName
              : 'Unknown Patient';

      const prescriptionId = p._id || p.id;
      return {
        key: prescriptionId,
        patientId: p.patientId || (typeof p.patient === 'object' ? p.patient?._id : p.patient),
        patientName: patientNameFinal,
        meds: [p],
      };
    });

    // Update total pages (10 per page)
    const total = Math.max(1, Math.ceil(result.length / 10));
    if (prescriptionsTotalPages !== total) {
      setPrescriptionsTotalPages(total);
      setPrescriptionsPage((p) => Math.min(p, total));
    }
    return result;
  }, [prescriptions, patients]);

  // Main component return
  console.log('isMedicalRecordOpen:', isMedicalRecordOpen, 'selectedPatientObject:', selectedPatientObject);

  const now = new Date();
  const timeGreeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const doctorName = user?.name || user?.firstName || 'Doctor';
  const todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Toaster position="top-right" />

      {/* ── Upgraded Page Header ── */}
      <div className="mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-xl">
          {/* decorative circles */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
          <div className="absolute top-4 right-40 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: greeting + subtitle */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                <LucideStethoscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white/95 text-sm font-medium">{timeGreeting}, Dr. {doctorName}</p>
                <h1 className="text-2xl font-bold text-white leading-tight">Doctor Dashboard</h1>
                <p className="text-white/90 text-xs mt-0.5">{todayLabel}</p>
              </div>
            </div>

            {/* Right: search + refresh */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="doctor-dashboard-search pl-9 pr-4 py-2 text-sm rounded-xl bg-blue-900/50 backdrop-blur-sm border border-white/25 text-white placeholder-white/70 caret-white focus:outline-none focus:ring-2 focus:ring-white/40 w-56"
                />
              </div>
              <button
                onClick={handleManualRefresh}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6">
        {/* ── Upgraded Stats Cards ── */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {/* Patients with Vitals */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-blue-100 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-blue-50" />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Patients with Vitals</p>
                  <p className="text-4xl font-extrabold text-gray-900">{dashboardStats.patientsToday}</p>
                  <p className="text-xs text-gray-400 mt-1">Active today</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-blue-100 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, dashboardStats.patientsToday * 5)}%` }} />
              </div>
            </div>

            {/* Completed Appointments */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-emerald-100 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-emerald-50" />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">Completed Appts</p>
                  <p className="text-4xl font-extrabold text-gray-900">{dashboardStats.completedAppointments}</p>
                  <p className="text-xs text-gray-400 mt-1">Finished sessions</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, dashboardStats.completedAppointments * 10)}%` }} />
              </div>
            </div>

            {/* Pending Reports */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-amber-50" />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">Pending Reports</p>
                  <p className="text-4xl font-extrabold text-gray-900">{dashboardStats.pendingReports}</p>
                  <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-amber-100 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, dashboardStats.pendingReports * 20)}%` }} />
              </div>
            </div>

            {/* Lab Results */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-purple-100 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-purple-50" />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-1">Lab Results</p>
                  <p className="text-4xl font-extrabold text-gray-900">{dashboardStats.labResults}</p>
                  <p className="text-xs text-gray-400 mt-1">Results available</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <ScienceIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-purple-100 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, dashboardStats.labResults * 10)}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Upgraded Tabs ── */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-6">
          <TabsList className="w-full justify-start flex h-auto p-1 bg-white border border-gray-200 rounded-xl shadow-sm gap-0.5 overflow-x-auto">
            {[
              { value: 'patients', label: 'My Patients', icon: '👥', dot: '#3B82F6', bg: '#EFF6FF' },
              { value: 'my-appointments', label: 'My Appointments', icon: '📅', dot: '#8B5CF6', bg: '#F5F3FF' },
              { value: 'lab-results', label: 'Lab Results', icon: '🔬', dot: '#10B981', bg: '#ECFDF5' },
              { value: 'imaging-results', label: 'Imaging Results', icon: '🩻', dot: '#F97316', bg: '#FFF7ED' },
              { value: 'prescriptions', label: 'Prescriptions', icon: '💊', dot: '#22C55E', bg: '#F0FDF4' },
              { value: 'Medical Records', label: 'Medical Records', icon: '📋', dot: '#6366F1', bg: '#EEF2FF' },
              { value: 'completed-patients', label: 'Completed Patients', icon: '✅', dot: '#14B8A6', bg: '#F0FDFA' },
            ].map(tab => {
              const isActive = activeTab === tab.value;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  /* strip ALL built-in colour classes; we drive everything via inline style */
                  className="flex-1 py-0 px-0 rounded-lg border-0 shadow-none bg-transparent transition-all"
                  style={{ all: 'unset' as any, flex: 1 }}
                >
                  {/* Custom pill — fully inline-styled, no class conflicts */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      backgroundColor: isActive ? tab.bg : 'transparent',
                      border: isActive ? `1.5px solid ${tab.dot}40` : '1.5px solid transparent',
                      boxShadow: isActive ? `0 1px 6px ${tab.dot}30` : 'none',
                    }}
                  >
                    {/* Colour dot */}
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      backgroundColor: tab.dot,
                      boxShadow: isActive ? `0 0 6px ${tab.dot}` : 'none',
                      opacity: isActive ? 1 : 0.5,
                      transition: 'all 0.2s ease',
                    }} />
                    {/* Icon */}
                    <span style={{ fontSize: '13px' }}>{tab.icon}</span>
                    {/* Label */}
                    <span style={{
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? tab.dot : '#6B7280',
                      transition: 'color 0.2s ease',
                    }}>
                      {tab.label}
                    </span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tabs Content */}
          <TabsContent value="patients" className="mt-4">
            <div style={{ maxWidth: '100vw', overflow: 'hidden' }}>
              {isLoadingPatients ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                  <span className="text-sm text-gray-500">Loading patients...</span>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Table Header */}
                  <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Active Patients</h3>
                        <p className="text-xs text-gray-400">{filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} ready for consultation</p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Complaint</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nurse</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Update</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredPatients.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-16">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                                  <UserIcon className="w-7 h-7 text-blue-300" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-700">
                                    {searchTerm.trim()
                                      ? `No patients found for "${searchTerm.trim()}"`
                                      : patients.length === 0
                                        ? 'No patients yet'
                                        : 'No matching patients'}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {searchTerm.trim()
                                      ? 'Try a different name, patient ID, phone number, or email.'
                                      : patients.length === 0
                                        ? 'Patients will appear here once assigned by a nurse.'
                                        : 'Try adjusting your search term.'}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          [...filteredPatients]
                            .sort((a, b) => {
                              const aVitals = a.vitals?.timestamp ? new Date(a.vitals.timestamp).getTime() : 0;
                              const aLast = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
                              const bVitals = b.vitals?.timestamp ? new Date(b.vitals.timestamp).getTime() : 0;
                              const bLast = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
                              const aTime = Math.max(aVitals, aLast);
                              const bTime = Math.max(bVitals, bLast);
                              return bTime - aTime;
                            })
                            .slice((currentPage - 1) * ACTIVE_PATIENTS_PAGE_SIZE, currentPage * ACTIVE_PATIENTS_PAGE_SIZE)
                            .map((patient, idx) => {
                              const vitalsTs = patient.vitals?.timestamp ? new Date(patient.vitals.timestamp).getTime() : 0;
                              const lastUpd = patient.lastUpdated ? new Date(patient.lastUpdated).getTime() : 0;
                              const latestTs = Math.max(vitalsTs, lastUpd);
                              const isRecentlySent = latestTs > 0 && (Date.now() - latestTs) < 30 * 60 * 1000 && !viewedPatients.has(patient.id);

                              const initials = `${(patient.firstName || 'U')[0]}${(patient.lastName || 'P')[0]}`.toUpperCase();
                              const avatarColors = [
                                'from-blue-400 to-blue-600',
                                'from-emerald-400 to-teal-600',
                                'from-purple-400 to-indigo-600',
                                'from-orange-400 to-red-500',
                                'from-pink-400 to-rose-600',
                                'from-cyan-400 to-blue-500',
                              ];
                              const avatarColor = avatarColors[idx % avatarColors.length];

                              const isInsurance = patient.cardType?.name?.toLowerCase() === 'insurance' ||
                                patient.cardType?.value?.toLowerCase() === 'insurance' ||
                                patient.cardStatus === 'insurance';

                              return (
                                <tr
                                  key={patient.id}
                                  className={`cursor-pointer transition-all hover:bg-blue-50/40 ${selectedPatient === patient.id ? 'bg-blue-50/60 border-l-4 border-l-blue-500' : ''
                                    } ${isRecentlySent ? 'bg-amber-50/40' : ''}`}
                                  onClick={() => handlePatientSelect(patient.id)}
                                >
                                  {/* Patient */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                        <span className="text-xs font-bold text-white">{initials}</span>
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm font-semibold text-gray-900">{patient.firstName} {patient.lastName}</span>
                                          {isRecentlySent && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">New</span>
                                          )}
                                          {isInsurance && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Insurance</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-400">{patient.gender}{patient.age ? `, ${patient.age}y` : ''}</p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* ID */}
                                  <td className="px-4 py-3">
                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                      {formatPatientId(patient.patientId || patient.patientCode || patient.id)}
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(patient.status)}`}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                      {patient.status}
                                    </span>
                                  </td>

                                  {/* Complaint */}
                                  <td className="px-4 py-3">
                                    <span className="text-xs text-gray-600 line-clamp-1 max-w-[160px] block">
                                      {patient.complaint || patient.chiefComplaint || <span className="text-gray-300 italic">—</span>}
                                    </span>
                                  </td>

                                  {/* Nurse */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                                        <span className="text-xs font-bold text-teal-700">
                                          {(getNurseNameById(patient.assignedNurseId) || patient.assignedNurseName || 'S')[0]}
                                        </span>
                                      </div>
                                      <span className="text-xs font-medium text-gray-700">
                                        {(getNurseNameById(patient.assignedNurseId) || patient.assignedNurseName || 'Semhal').split(' ')[0]}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Last Update - show latest of vitals timestamp or lastUpdated (so renewed/sent today shows on top) */}
                                  <td className="px-4 py-3">
                                    {(() => {
                                      const vitalsTime = patient.vitals?.timestamp ? new Date(patient.vitals.timestamp).getTime() : 0;
                                      const lastTime = patient.lastUpdated ? new Date(patient.lastUpdated).getTime() : 0;
                                      const latest = vitalsTime >= lastTime ? patient.vitals?.timestamp : patient.lastUpdated;
                                      if (!latest) return <><div className="text-xs font-medium text-gray-700">—</div><div className="text-xs text-gray-400"></div></>;
                                      const d = new Date(latest);
                                      return (
                                        <>
                                          <div className="text-xs font-medium text-gray-700">{d.toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</div>
                                          <div className="text-xs text-gray-400">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </>
                                      );
                                    })()}
                                  </td>

                                  {/* Actions */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                      {[
                                        { icon: '📄', title: 'Medical Record', color: 'bg-blue-500 hover:bg-blue-600', disabled: isLoadingMedicalRecord, action: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); handleOpenMedicalRecord(patient); } },
                                        { icon: '📝', title: 'History Taking', color: 'bg-teal-500 hover:bg-teal-600', disabled: isLoadingHistoryTaking, action: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); handleOpenHistoryTaking(patient); } },
                                        { icon: '💊', title: 'Prescription', color: 'bg-emerald-500 hover:bg-emerald-600', disabled: isLoadingPrescription, action: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); handleOpenCreatePrescription(patient); } },
                                        { icon: '🔬', title: 'Lab Test', color: 'bg-purple-500 hover:bg-purple-600', disabled: isLoadingLab, action: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); handleOpenOrderLabTest(patient); } },
                                        { icon: '🩻', title: 'Imaging', color: 'bg-orange-500 hover:bg-orange-600', disabled: isLoadingImaging, action: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); handleOpenRequestImaging(patient); } },
                                      ].map(btn => (
                                        <button
                                          key={btn.title}
                                          onClick={btn.action}
                                          disabled={btn.disabled}
                                          title={btn.title}
                                          className={`w-8 h-8 rounded-lg ${btn.color} text-white flex items-center justify-center text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95`}
                                        >
                                          {btn.icon}
                                        </button>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Pagination */}
              {!isLoadingPatients && (
                <div className="flex items-center justify-between px-5 py-3 bg-white border border-gray-200 rounded-b-2xl border-t-0 mt-0">
                  <p className="text-xs text-gray-500">Page {currentPage} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Previous</Button>
                    <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="lab-results" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Patient Lab Reports</h2>
            </div>



            {/* Use the new PatientLabResultsList component */}
            <PatientLabResultsList
              groupedResults={groupedLabResults}
              isLoading={labResultsLoading}
              onRefresh={fetchAllDoctorLabResults}
            />
          </TabsContent>

          <TabsContent value="imaging-results" className="mt-6">
            <ImagingResultsList doctorId={user?.id || user?._id} />
          </TabsContent>

          <TabsContent value="prescriptions" className="mt-6">
            {prescriptionsLoading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading prescriptions...</span>
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <Pill className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No prescriptions found</h3>
                <p className="mt-1 text-sm text-gray-500">Prescriptions you create will appear here.</p>
              </div>
            ) : (
              <div>
                <table className="w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Medication</th>
                      <th className="px-4 py-2 text-left">Patient</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedPrescriptions
                      .slice((prescriptionsPage - 1) * 10, (prescriptionsPage - 1) * 10 + 10)
                      .map(group => {
                        const latest = group.meds[0] as any;
                        const status = (latest.status || '').toLowerCase() === 'pending' ? 'pending' : 'active';
                        const medNames = latest.medications && latest.medications.length > 0
                          ? latest.medications.map((m: any) => m.name || m.medication || m.medicationName).filter(Boolean).join(', ')
                          : (latest.medicationName || 'Unknown medication');
                        return (
                          <tr key={group.key} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{medNames}</td>
                            <td className="px-4 py-2 text-sm">{group.patientName}</td>
                            <td className="px-4 py-2 text-sm">{formatDate(latest.createdAt || latest.datePrescribed)}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {latest.status || status}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <Button variant="outline" size="sm" onClick={async () => {
                                // Use current group meds directly (no need to refetch)
                                const meds = group.meds;

                                // Extract the patient ID from the first prescription
                                const firstMed = meds[0] as any;
                                const patientObjId =
                                  (firstMed?.patient && typeof firstMed.patient === 'object' ? firstMed.patient._id || firstMed.patient.id : null)
                                  || (typeof firstMed?.patient === 'string' ? firstMed.patient : null)
                                  || (firstMed?.patientId && typeof firstMed.patientId === 'object' ? firstMed.patientId._id || firstMed.patientId.id : null)
                                  || (typeof firstMed?.patientId === 'string' ? firstMed.patientId : null);

                                // Check if patient data is already populated
                                const alreadyHasPatient = firstMed?.patient && typeof firstMed.patient === 'object' && firstMed.patient.firstName;

                                let patientData: any = alreadyHasPatient ? firstMed.patient : null;

                                // Try patients array first
                                if (!patientData && patientObjId) {
                                  patientData = patients.find((p: any) => p.id === patientObjId || p._id === patientObjId) || null;
                                }

                                // Fetch directly from API if still not found
                                if (!patientData && patientObjId) {
                                  try {
                                    const res = await patientService.getPatientById(patientObjId);
                                    if (res) patientData = res;
                                  } catch {
                                    // ignore fetch error, will show what we have
                                  }
                                }

                                // Attach patient data to all meds
                                const enrichedMeds = patientData
                                  ? meds.map((med: any) => ({ ...med, patient: patientData }))
                                  : meds;

                                setSelectedPatientPrescriptions(enrichedMeds);
                              }}>
                                View
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-4 py-3 border-t mt-2">
                  <div className="text-xs text-muted-foreground">Page {prescriptionsPage} of {prescriptionsTotalPages}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={prescriptionsPage <= 1} onClick={() => setPrescriptionsPage(Math.max(1, prescriptionsPage - 1))}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={prescriptionsPage >= prescriptionsTotalPages} onClick={() => setPrescriptionsPage(Math.min(prescriptionsTotalPages, prescriptionsPage + 1))}>Next</Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="Medical Records" className="mt-6">
            {renderMedicalRecordsTab()}
          </TabsContent>

          <TabsContent value="completed-patients" className="mt-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircleIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-emerald-900">Completed Patient Histories</h2>
                    <p className="text-xs text-emerald-600">Patients with finalized medical records</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or ID... (or use top bar)"
                      value={effectiveCompletedSearch}
                      onChange={(e) => setCompletedPatientsSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs border border-emerald-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 w-48"
                    />
                  </div>
                  <select
                    className="px-3 py-1.5 text-xs border border-emerald-200 rounded-lg bg-white text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    onChange={(e) => {
                      const filter = e.target.value;
                      if (filter === 'all') setCompletedPatientsSearchTerm('');
                      else if (filter === 'with-records') setCompletedPatientsSearchTerm('has-records');
                      else if (filter === 'without-records') setCompletedPatientsSearchTerm('no-records');
                    }}
                  >
                    <option value="all">All Patients</option>
                    <option value="with-records">With Finalized Records</option>
                    <option value="without-records">Without Records</option>
                  </select>
                  <button
                    onClick={() => fetchCompletedPatients()}
                    disabled={isLoadingCompletedPatients}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw size={12} className={isLoadingCompletedPatients ? 'animate-spin' : ''} /> Refresh
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await patientService.getAllPatients(true, true, 1000);
                        const allPatients = response.patients || [];
                        const currentDoctorId = user?.id || user?._id;
                        const doctorPatients = allPatients.filter((p: any) => p.assignedDoctor?.id?.toString() === currentDoctorId?.toString());
                        for (const patient of doctorPatients) {
                          try {
                            const patientId = patient._id || patient.id;
                            const res = await api.get('/api/medical-records/finalized', { params: { patientId, limit: 1, includeCount: 'true' } });
                            const finalizedCount = res.data?.count || 0;
                            if (finalizedCount > 0 && patient.status !== 'completed') {
                              await api.put(`/api/patients/${patientId}/status`, { status: 'completed' });
                            }
                          } catch { }
                        }
                        fetchCompletedPatients();
                        toast.success('Patient statuses updated');
                      } catch { toast.error('Failed to update statuses'); }
                    }}
                    disabled={isLoadingCompletedPatients}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw size={12} /> Update Status
                  </button>
                </div>
              </div>

              {isLoadingCompletedPatients ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
                  <p className="text-sm text-gray-500">Loading completed patients...</p>
                </div>
              ) : filteredCompletedPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-base font-semibold text-gray-800">No completed patients found</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {completedPatients.length === 0
                        ? 'Completed patient histories will appear here once patients finish treatment.'
                        : 'No patients match your search criteria.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total Completed', value: filteredCompletedPatients.length, color: 'blue', icon: '👥' },
                      { label: 'With Records', value: filteredCompletedPatients.filter(p => (p.finalizedRecordsCount || 0) > 0).length, color: 'emerald', icon: '📋' },
                      { label: 'Total Records', value: filteredCompletedPatients.reduce((s, p) => s + (p.finalizedRecordsCount || 0), 0), color: 'orange', icon: '📄' },
                    ].map(stat => (
                      <div key={stat.label} className={`flex items-center gap-3 p-4 rounded-xl border bg-${stat.color}-50 border-${stat.color}-100`}>
                        <span className="text-2xl">{stat.icon}</span>
                        <div>
                          <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Patient Table */}
                  <div className="rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-700">Completed Patients</h3>
                      <p className="text-xs text-gray-400">Patients with finalized medical records</p>
                    </div>
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Finalized Records</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredCompletedPatients
                          .sort((a, b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0))
                          .slice((completedPage - 1) * 10, (completedPage - 1) * 10 + 10)
                          .map((patient, idx) => {
                            const initials = `${(patient.firstName || 'U')[0]}${(patient.lastName || 'P')[0]}`.toUpperCase();
                            const colors = ['from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-purple-400 to-pink-500', 'from-orange-400 to-red-500', 'from-cyan-400 to-blue-500'];
                            const color = colors[idx % colors.length];
                            const hasRecords = (patient.finalizedRecordsCount || 0) > 0;
                            return (
                              <tr key={patient.id} className={`hover:bg-emerald-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                                      <span className="text-xs font-bold text-white">{initials}</span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900">{patient.firstName} {patient.lastName}</div>
                                      <div className="text-xs text-gray-400">{patient.gender}{patient.age ? `, ${patient.age}y` : ''}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {formatPatientId(patient.patientId || patient.patientCode || patient.id)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-600">
                                    {patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-700">{patient.finalizedRecordsCount || 0}</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${hasRecords ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                      {hasRecords ? '✓ Finalized' : 'No Records'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleViewPatientMedicalRecords(patient)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                    >
                                      <LucideFileText className="h-3 w-3" /> View History
                                    </button>
                                    <button
                                      onClick={() => handleOpenMedicalRecord(patient)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                      <PlusIcon className="h-3 w-3" /> New Record
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Page {completedPage} of {completedTotalPages}</p>
                      <div className="flex gap-2">
                        <button disabled={completedPage <= 1} onClick={() => setCompletedPage(Math.max(1, completedPage - 1))}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Previous</button>
                        <button disabled={completedPage >= completedTotalPages} onClick={() => setCompletedPage(Math.min(completedTotalPages, completedPage + 1))}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* My Appointments Tab */}
          <TabsContent value="my-appointments" className="mt-4">
            <div className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Today's Appointments", value: myAppointments.filter(a => new Date(a.appointmentDateTime).toDateString() === new Date().toDateString()).length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Scheduled', value: myAppointments.filter(a => a.status === 'Scheduled').length, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                  { label: 'Checked In', value: myAppointments.filter(a => a.status === 'Checked In').length, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                  { label: 'Completed', value: myAppointments.filter(a => a.status === 'Completed').length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                ].map(stat => (
                  <Card key={stat.label}>
                    <CardContent className={`p-4 ${stat.bg} rounded-lg`}>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[180px]">
                      <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search patient or reason..."
                        value={apptSearchTerm}
                        onChange={e => setApptSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="flex gap-1 bg-secondary rounded-lg p-1">
                      {(['today', 'upcoming', 'all'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setApptDateFilter(f)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${apptDateFilter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'Upcoming'}
                        </button>
                      ))}
                    </div>
                    <select
                      value={apptStatusFilter}
                      onChange={e => setApptStatusFilter(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    >
                      <option value="all">All Statuses</option>
                      {['Scheduled', 'Checked In', 'Completed', 'Cancelled', 'No Show'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={fetchMyAppointments}
                      disabled={myAppointmentsLoading}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-foreground bg-background border border-input rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw size={12} className={myAppointmentsLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Appointments Table */}
              <Card>
                <CardContent className="p-0">
                  {myAppointmentsLoading ? (
                    <div className="flex items-center justify-center py-12 gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      <span className="text-muted-foreground text-sm">Loading appointments...</span>
                    </div>
                  ) : (() => {
                    const today = new Date();
                    const filtered = myAppointments.filter(appt => {
                      const apptDate = new Date(appt.appointmentDateTime);
                      if (apptDateFilter === 'today' && apptDate.toDateString() !== today.toDateString()) return false;
                      if (apptDateFilter === 'upcoming') {
                        const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
                        const aStart = new Date(apptDate); aStart.setHours(0, 0, 0, 0);
                        if (aStart <= todayStart) return false;
                      }
                      if (apptStatusFilter !== 'all' && appt.status !== apptStatusFilter) return false;
                      if (apptSearchTerm) {
                        const term = apptSearchTerm.toLowerCase();
                        const pName = (typeof appt.patientId === 'object'
                          ? `${appt.patientId?.firstName || ''} ${appt.patientId?.lastName || ''}`.trim()
                          : appt.patientName || '').toLowerCase();
                        const reason = (appt.reason || '').toLowerCase();
                        if (!pName.includes(term) && !reason.includes(term)) return false;
                      }
                      return true;
                    }).sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                          <CalendarIcon className="w-10 h-10 text-muted-foreground/30" />
                          <p className="text-muted-foreground font-medium">No appointments found</p>
                          <p className="text-muted-foreground text-xs">Try changing the date or status filter</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                      <Table className="min-w-[500px]">
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold text-xs">Date & Time</TableHead>
                            <TableHead className="font-semibold text-xs">Patient</TableHead>
                            <TableHead className="font-semibold text-xs">Type</TableHead>
                            <TableHead className="font-semibold text-xs">Reason</TableHead>
                            <TableHead className="font-semibold text-xs">Status</TableHead>
                            <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(appt => {
                            const apptId = appt._id || appt.id;
                            const apptDate = new Date(appt.appointmentDateTime);
                            const isToday = apptDate.toDateString() === today.toDateString();
                            const patientName = typeof appt.patientId === 'object'
                              ? `${appt.patientId?.firstName || ''} ${appt.patientId?.lastName || ''}`.trim()
                              : (appt.patientName || 'Unknown Patient');

                            const statusColors: Record<string, string> = {
                              'Scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                              'Checked In': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                              'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                              'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                              'No Show': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
                            };
                            const typeColors: Record<string, string> = {
                              'checkup': 'bg-teal-100 text-teal-800', 'Check-up': 'bg-teal-100 text-teal-800',
                              'consultation': 'bg-purple-100 text-purple-800', 'Consultation': 'bg-purple-100 text-purple-800',
                              'follow-up': 'bg-indigo-100 text-indigo-800', 'Follow-up': 'bg-indigo-100 text-indigo-800',
                              'emergency': 'bg-red-100 text-red-800', 'Emergency': 'bg-red-100 text-red-800',
                              'lab-test': 'bg-orange-100 text-orange-800',
                              'imaging': 'bg-cyan-100 text-cyan-800',
                              'procedure': 'bg-pink-100 text-pink-800',
                            };
                            const typeLabels: Record<string, string> = {
                              'checkup': 'Check-up', 'consultation': 'Consultation', 'follow-up': 'Follow-up',
                              'emergency': 'Emergency', 'lab-test': 'Lab Test', 'imaging': 'Imaging', 'procedure': 'Procedure',
                            };

                            return (
                              <TableRow key={apptId} className="hover:bg-muted/30 transition-colors">
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                                      {isToday ? 'Today' : apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm font-medium">{patientName}</span>
                                </TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[appt.type] || 'bg-gray-100 text-gray-700'}`}>
                                    {typeLabels[appt.type] || appt.type}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">{appt.reason || '—'}</span>
                                </TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[appt.status] || 'bg-gray-100 text-gray-700'}`}>
                                    {appt.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {/* Mark as Completed */}
                                    {(appt.status === 'Checked In' || appt.status === 'Scheduled') && (
                                      <button
                                        onClick={async () => {
                                          setIsApptUpdating(true);
                                          try {
                                            await api.put(`/api/appointments/${apptId}`, { status: 'Completed' });
                                            toast.success('Appointment marked as Completed');
                                            setMyAppointments(prev => prev.map(a => (a._id || a.id) === apptId ? { ...a, status: 'Completed' } : a));
                                          } catch { toast.error('Failed to update appointment'); }
                                          finally { setIsApptUpdating(false); }
                                        }}
                                        disabled={isApptUpdating}
                                        title="Mark as Completed"
                                        className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                                      >
                                        <CheckCircleIcon className="w-4 h-4" />
                                      </button>
                                    )}
                                    {/* Mark No Show */}
                                    {appt.status === 'Scheduled' && (
                                      <button
                                        onClick={async () => {
                                          setIsApptUpdating(true);
                                          try {
                                            await api.put(`/api/appointments/${apptId}`, { status: 'No Show' });
                                            toast.success('Appointment marked as No Show');
                                            setMyAppointments(prev => prev.map(a => (a._id || a.id) === apptId ? { ...a, status: 'No Show' } : a));
                                          } catch { toast.error('Failed to update appointment'); }
                                          finally { setIsApptUpdating(false); }
                                        }}
                                        disabled={isApptUpdating}
                                        title="Mark as No Show"
                                        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                      >
                                        <XCircleIcon className="w-4 h-4" />
                                      </button>
                                    )}
                                    {/* Edit Notes */}
                                    <button
                                      onClick={() => {
                                        setApptEditTarget(appt);
                                        setApptEditStatus(appt.status);
                                        setApptEditNotes(appt.notes || '');
                                        setIsApptEditOpen(true);
                                      }}
                                      title="Add/Edit Notes"
                                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                      <DocumentTextIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Edit Appointment Notes Dialog */}
            {isApptEditOpen && apptEditTarget && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Update Appointment</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Patient</p>
                      <p className="text-sm font-medium">
                        {typeof apptEditTarget.patientId === 'object'
                          ? `${apptEditTarget.patientId?.firstName || ''} ${apptEditTarget.patientId?.lastName || ''}`.trim()
                          : apptEditTarget.patientName || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Date & Time</p>
                      <p className="text-sm">{new Date(apptEditTarget.appointmentDateTime).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium block mb-1">Status</label>
                      <select
                        value={apptEditStatus}
                        onChange={e => setApptEditStatus(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                      >
                        {['Scheduled', 'Checked In', 'Completed', 'Cancelled', 'No Show'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium block mb-1">Doctor Notes</label>
                      <textarea
                        value={apptEditNotes}
                        onChange={e => setApptEditNotes(e.target.value)}
                        rows={3}
                        placeholder="Add clinical notes for this appointment..."
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-5">
                    <button
                      onClick={() => setIsApptEditOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        const id = apptEditTarget._id || apptEditTarget.id;
                        setIsApptUpdating(true);
                        try {
                          await api.put(`/api/appointments/${id}`, { status: apptEditStatus, notes: apptEditNotes });
                          toast.success('Appointment updated successfully');
                          setMyAppointments(prev => prev.map(a => (a._id || a.id) === id ? { ...a, status: apptEditStatus, notes: apptEditNotes } : a));
                          setIsApptEditOpen(false);
                        } catch { toast.error('Failed to update appointment'); }
                        finally { setIsApptUpdating(false); }
                      }}
                      disabled={isApptUpdating}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isApptUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      {renderDialogs()}

      {/* Professional Medical Record Dialog */}
      {isMedicalRecordOpen && selectedPatientObject && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <ModernMedicalRecordForm
              patientId={(() => {
                console.log('🔍 [DEBUG] Form props - selectedPatientObject:', selectedPatientObject);
                console.log('🔍 [DEBUG] Form props - recordId:', selectedPatientObject._recordId);
                console.log('🔍 [DEBUG] Form props - mode:', selectedPatientObject._mode);
                console.log('🔍 [DEBUG] Form props - hasInitialRecordData:', !!selectedPatientObject._existingRecordData);
                console.log('🔍 [DEBUG] Form props - initialRecordData keys:', selectedPatientObject._existingRecordData ? Object.keys(selectedPatientObject._existingRecordData) : 'null');
                const actualId = selectedPatientObject.id || selectedPatientObject._id;
                console.log('🔍 [DEBUG] Form props - Using patient ID:', actualId);
                return actualId;
              })()}
              recordId={selectedPatientObject._recordId}
              mode={selectedPatientObject._mode || "create"}
              initialRecordData={selectedPatientObject._existingRecordData}
              onCreatePrescription={() => handleOpenCreatePrescription(selectedPatientObject)}
              onOrderLabTest={() => handleOpenOrderLabTest(selectedPatientObject)}
              onRequestImaging={() => handleOpenRequestImaging(selectedPatientObject)}
              onSave={async (record) => {
                console.log('Medical record saved:', record);
                setIsMedicalRecordOpen(false);
                toast.success('Medical record saved successfully');

                // Refresh patient lists to update patient status (e.g., move finalized patients to completed)
                console.log('🔄 Refreshing patient lists after save...');

                // Clear patient cache to force fresh data
                patientService.clearPatientsCache();

                // Refresh both active and completed patient lists
                await Promise.all([
                  fetchData(), // Refresh active patients
                  fetchCompletedPatients() // Refresh completed patients
                ]);

                // Refresh medical records list
                fetchAllMedicalRecords(0, false, selectedPatientForMedicalRecords?.id);
              }}
              onCancel={async () => {
                console.log('📝 Medical record form cancelled/closed');
                setIsMedicalRecordOpen(false);

                // Refresh patient lists in case record was finalized
                console.log('🔄 Refreshing patient lists after form close...');

                // Clear patient cache to force fresh data
                patientService.clearPatientsCache();

                // Refresh both active and completed patient lists
                await Promise.all([
                  fetchData(), // Refresh active patients
                  fetchCompletedPatients() // Refresh completed patients
                ]);
              }}
            />
          </div>
        </div>
      )}

      {/* Prescription Detail Modal */}
      {selectedPatientPrescriptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Medications for {
                  (() => {
                    const prescription = selectedPatientPrescriptions[0];
                    if (!prescription) return 'Unknown Patient';

                    // Debug: Log prescription data to see what's available
                    console.log('🔍 [PRESCRIPTION POPUP DEBUG] Full prescription data:', prescription);
                    console.log('🔍 [PRESCRIPTION POPUP DEBUG] Patient data:', prescription.patient);
                    console.log('🔍 [PRESCRIPTION POPUP DEBUG] PatientId data:', prescription.patientId);
                    console.log('🔍 [PRESCRIPTION POPUP DEBUG] PatientAge data:', prescription.patient?.age);
                    console.log('🔍 [PRESCRIPTION POPUP DEBUG] PatientGender data:', prescription.patient?.gender);
                    console.log('🔍 [PRESCRIPTION POPUP DEBUG] PatientAddress data:', prescription.patient?.address);
                    console.log('🔍 [PRESCRIPTION POPUP DEBUG] PatientPatientId data:', prescription.patient?.patientId);
                    console.log('🔍 [PRESCRIPTION POPUP DEBUG] Patient data keys:', prescription.patient ? Object.keys(prescription.patient) : 'No patient data');
                    console.log('🔍 [PRESCRIPTION POPUP DEBUG] Full patient object:', JSON.stringify(prescription.patient, null, 2));

                    // Try to get name from populated patient object first (backend populates this)
                    if (prescription.patient && typeof prescription.patient === 'object' && (prescription.patient.firstName || prescription.patient.lastName)) {
                      return `${prescription.patient.firstName || ''} ${prescription.patient.lastName || ''}`.trim();
                    }
                    // Try to get name from patientId populated object (backup)
                    if (prescription.patientId && typeof prescription.patientId === 'object' && (prescription.patientId.firstName || prescription.patientId.lastName)) {
                      return `${prescription.patientId.firstName || ''} ${prescription.patientId.lastName || ''}`.trim();
                    }
                    // Try to get name from patientDetails (legacy)
                    if (prescription.patientDetails && (prescription.patientDetails.firstName || prescription.patientDetails.lastName)) {
                      return `${prescription.patientDetails.firstName || ''} ${prescription.patientDetails.lastName || ''}`.trim();
                    }
                    // Try to get name from patientName field (if already processed)
                    if (prescription.patientName && prescription.patientName !== 'Unknown Patient' && prescription.patientName !== 'Patient Name') {
                      return prescription.patientName;
                    }
                    // Fall back to finding in patients array (with better error handling)
                    try {
                      const patientId = prescription.patientId || prescription.patient;
                      if (patientId && patients && patients.length > 0) {
                        const pat = patients.find(pt => {
                          // Handle both string and object patient IDs
                          const ptId = pt.id || pt._id;
                          const presId = typeof patientId === 'string' ? patientId : (((patientId as any).id) || ((patientId as any)._id));
                          return ptId && presId && ptId.toString() === presId.toString();
                        });
                        if (pat) {
                          return `${pat.firstName || ''} ${pat.lastName || ''}`.trim();
                        }
                      }
                    } catch (error) {
                      console.warn('🔍 [PRESCRIPTION POPUP] Error in patient lookup:', error);
                    }
                    return 'Unknown Patient';
                  })()
                }</h2>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => {
                      const selectedMeds = getSelectedMedicationsForPrint();
                      if (selectedMeds.length === 0) {
                        alert('Please select at least one medication to print.');
                        return;
                      }

                      const prescription = selectedPatientPrescriptions[0];

                      // Debug: Log prescription data to see what's available
                      console.log('🔍 [PRESCRIPTION DEBUG] Full prescription data:', prescription);
                      console.log('🔍 [PRESCRIPTION DEBUG] Patient data:', prescription.patient);
                      console.log('🔍 [PRESCRIPTION DEBUG] PatientId data:', prescription.patientId);

                      const patientName = (() => {
                        if (prescription.patient && typeof prescription.patient === 'object' && (prescription.patient.firstName || prescription.patient.lastName)) {
                          return `${prescription.patient.firstName || ''} ${prescription.patient.lastName || ''}`.trim();
                        }
                        if (prescription.patientId && typeof prescription.patientId === 'object' && (prescription.patientId.firstName || prescription.patientId.lastName)) {
                          return `${prescription.patientId.firstName || ''} ${prescription.patientId.lastName || ''}`.trim();
                        }
                        if (prescription.patientDetails && (prescription.patientDetails.firstName || prescription.patientDetails.lastName)) {
                          return `${prescription.patientDetails.firstName || ''} ${prescription.patientDetails.lastName || ''}`.trim();
                        }
                        if (prescription.patientName && prescription.patientName !== 'Unknown Patient' && prescription.patientName !== 'Patient Name') {
                          return prescription.patientName;
                        }
                        try {
                          const patientId = prescription.patientId || prescription.patient;
                          if (patientId && patients && patients.length > 0) {
                            const pat = patients.find(pt => {
                              // Handle both string and object patient IDs
                              const ptId = pt.id || pt._id;
                              const presId = typeof patientId === 'string' ? patientId : (((patientId as any).id) || ((patientId as any)._id));
                              return ptId && presId && ptId.toString() === presId.toString();
                            });
                            if (pat) {
                              return `${pat.firstName || ''} ${pat.lastName || ''}`.trim();
                            }
                          }
                        } catch (error) {
                          console.warn('🔍 [PRESCRIPTION PRINT] Error in patient lookup:', error);
                        }
                        return 'Unknown Patient';
                      })();

                      const printWindow = window.open('', '_blank');
                      printWindow?.document.write(`
                        <html>
                          <head>
                            <title>Prescription - ${patientName}</title>
                            <style>
                              @page {
                                size: A5 portrait;
                                margin: 5mm;
                              }
                              body { 
                                font-family: Arial, sans-serif; 
                                margin: 0; 
                                padding: 0; 
                                background: white;
                                line-height: 1.5;
                                font-size: 16px;
                              }
                              .prescription-form {
                                width: 100%;
                                max-width: 100%;
                                height: 100%;
                                margin: 0;
                                border: 3px solid #333;
                                padding: 16px;
                                background: white;
                                box-sizing: border-box;
                              }
                              .clinic-header {
                                margin-bottom: 14px;
                                border-bottom: 3px solid #333;
                                padding-bottom: 12px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 16px;
                              }
                              .clinic-logo {
                                width: 65px;
                                height: 65px;
                                border-radius: 4px;
                                border: 1px solid #ddd;
                                object-fit: cover;
                                flex-shrink: 0;
                              }
                              .clinic-info {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                text-align: center;
                              }
                              .clinic-name {
                                font-size: 19px;
                                font-weight: bold;
                                color: #333;
                                margin-bottom: 5px;
                              }
                              .clinic-subtitle {
                                font-size: 17px;
                                font-weight: bold;
                                margin-bottom: 5px;
                              }
                              .clinic-address {
                                font-size: 13px;
                                color: #666;
                              }
                              .document-meta {
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 14px;
                                font-size: 13px;
                                background: #f5f5f5;
                                padding: 8px;
                                border: 1px solid #ddd;
                              }
                              .patient-section, .prescription-section {
                                margin-bottom: 14px;
                              }
                              .section-title {
                                font-size: 15px;
                                font-weight: bold;
                                margin-bottom: 7px;
                                text-decoration: underline;
                              }
                              .patient-info {
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                gap: 8px;
                                margin-bottom: 12px;
                              }
                              .patient-field {
                                font-size: 13px;
                                margin-bottom: 5px;
                              }
                              .medications-table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 7px;
                              }
                              .medications-table th,
                              .medications-table td {
                                border: 1px solid #333;
                                padding: 6px 7px;
                                text-align: left;
                                font-size: 13px;
                                vertical-align: top;
                                line-height: 1.5;
                              }
                              .medications-table th {
                                background-color: #f0f0f0;
                                font-weight: bold;
                                font-size: 13px;
                              }
                              .medications-table tbody tr {
                                page-break-inside: avoid;
                              }
                              .doctor-section {
                                margin-top: 16px;
                                display: flex;
                                justify-content: space-between;
                                align-items: flex-end;
                              }
                              .doctor-info {
                                font-size: 13px;
                              }
                              .signature-box {
                                width: 150px;
                                height: 45px;
                                border: 1px solid #333;
                                margin-top: 6px;
                              }
                              .footer {
                                margin-top: 14px;
                                text-align: center;
                                font-size: 11px;
                                color: #666;
                                border-top: 1px solid #ccc;
                                padding-top: 7px;
                              }
                              @media print {
                                body { 
                                  font-size: 14px;
                                  width: 148mm;
                                  height: 210mm;
                                }
                                .prescription-form {
                                  height: 100%;
                                  padding: 14px;
                                }
                                .clinic-logo {
                                  width: 60px;
                                  height: 60px;
                                }
                                .medications-table th,
                                .medications-table td {
                                  font-size: 12px;
                                  padding: 5px 6px;
                                }
                                .footer {
                                  display: none;
                                }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="prescription-form">
                              <div class="clinic-header">
                                <img src="/assets/images/logo.jpg" alt="Clinic Logo" class="clinic-logo" onerror="this.style.display='none'">
                                <div class="clinic-info">
                                  <div class="clinic-name">New Life Medium Clinic PLC</div>
                                  <div class="clinic-subtitle">Medical Prescription</div>
                                  <div class="clinic-address">Lafto beside Kebron Guest House<br>Phone: +251925959219</div>
                                </div>
                              </div>
                              
                              <div class="document-meta">
                                <div>Date: ${prescription.createdAt ? new Date(prescription.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                <div>Status: ${prescription.status || 'Active'}</div>
                                <div>ID: ${prescription._id?.toString().slice(-6).toUpperCase() || Math.floor(Math.random() * 900000) + 100000}</div>
                              </div>
                              
                              <div class="patient-section">
                                <div class="section-title">Patient Information</div>
                                <div class="patient-info">
                                  <div class="patient-field"><strong>FULL NAME:</strong> ${patientName}</div>
                                  <div class="patient-field"><strong>AGE:</strong> ${(prescription.patient as any)?.age || (prescription.patientId as any)?.age || prescription.patientDetails?.age || 'Not specified'} years</div>
                                  <div class="patient-field"><strong>GENDER:</strong> ${(prescription.patient as any)?.gender || (prescription.patientId as any)?.gender || prescription.patientDetails?.gender || 'Not specified'}</div>
                                  <div class="patient-field"><strong>ADDRESS:</strong> ${(prescription.patient as any)?.address || (prescription.patientId as any)?.address || prescription.patientDetails?.address || 'Not specified'}</div>
                                  <div class="patient-field"><strong>PATIENT ID:</strong> ${(prescription.patient as any)?.patientId || (prescription.patientId as any)?.patientId || prescription.patientDetails?.patientId || 'Not specified'}</div>
                                  <div class="patient-field" style="display: flex; align-items: center; gap: 15px;">
                                    <strong>Patient Type:</strong>
                                    <label style="display: flex; align-items: center; gap: 5px;">
                                      <input type="checkbox" style="width: 14px; height: 14px; border: 1px solid #333;" ${patientType === 'inpatient' ? 'checked' : ''}>
                                      <span>In-patient</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 5px;">
                                      <input type="checkbox" style="width: 14px; height: 14px; border: 1px solid #333;" ${patientType === 'outpatient' ? 'checked' : ''}>
                                      <span>Out-patient</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                              
                              <div class="prescription-section">
                                <div class="section-title">Prescription Details</div>
                                <table class="medications-table">
                                  <thead>
                                    <tr>
                                      <th>Medication</th>
                                      <th>Date given</th>
                                      <th>Dosage</th>
                                      <th>Route</th>
                                      <th>Frequency</th>
                                      <th>Duration</th>
                                      <th>Instructions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${selectedMeds.map(med => {
                        const p = med.prescription || prescription;
                        const dateGiven = p?.datePrescribed || p?.createdAt || p?.prescribedDate;
                        const dateStr = dateGiven ? new Date(dateGiven).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
                        return `
                                      <tr>
                                        <td>${med.name || med.medication || med.medicationName || 'Unknown medication'}</td>
                                        <td>${dateStr}</td>
                                        <td>${med.dosage || 'Not specified'}</td>
                                        <td>${med.route || 'Oral'}</td>
                                        <td>${med.frequency || 'Not specified'}</td>
                                        <td>${med.duration || 'Not specified'}</td>
                                        <td>${med.instructions || med.nurseInstructions || med.notes || 'Take as directed'}</td>
                                      </tr>
                                    `;
                      }).join('')}
                                  </tbody>
                                </table>
                              </div>
                              
                              <div class="doctor-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; padding-top: 15px; border-top: 2px solid #333; align-items: start;">
                                <div class="doctor-info">
                                  <div style="margin-bottom: 8px;"><strong>DOCTOR SIGNATURE</strong></div>
                                  <div style="font-size: 10px;"><strong>Prescriber:</strong> ${(prescription as any).doctorName || (prescription.doctorDetails as any)?.name || ((user?.firstName || '') + ' ' + (user?.lastName || '')).trim() || ('Dr. ' + (user?.firstName || 'Unknown'))}</div>
                                  <div style="font-size: 10px;"><strong>License:</strong> ${(prescription.doctorDetails as any)?.licenseNumber || 'N/A'}</div>
                                  <div style="font-size: 10px;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                  <div style="font-size: 10px; margin-top: 5px;"><strong>Signature:</strong> _______________________________________</div>
                                </div>
                                <div class="dispenser-info">
                                  <div style="margin-bottom: 8px;"><strong>DISPENSER</strong></div>
                                  <div style="font-size: 10px;"><strong>Full Name:</strong> _______________________________________</div>
                                  <div style="font-size: 10px; margin-top: 5px;"><strong>Signature:</strong> _______________________________________</div>
                                </div>
                              </div>
                              
                              <div class="footer">
                                <div>New Life Medium Clinic PLC - Medical Prescription System</div>
                                <div>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
                                <div>This prescription is valid for 30 days from the date of issue</div>
                              </div>
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow?.document.close();
                      printWindow?.print();
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                    disabled={selectedMedications.size === 0}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print ({selectedMedications.size})
                  </Button>
                  <button
                    onClick={() => {
                      setSelectedPatientPrescriptions(null);
                      setPatientType(null);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={selectAllMedications}
                    variant="outline"
                    size="sm"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={clearAllSelections}
                    variant="outline"
                    size="sm"
                  >
                    Clear All
                  </Button>
                  <span className="text-sm text-gray-600">
                    {selectedMedications.size} of {selectedPatientPrescriptions?.flatMap(p => p.medications).length || 0} selected
                  </span>
                </div>
              </div>

              <div id="printable-medications" className="printable-content">
                <style>{`
                  .prescription-form {
                    max-width: 800px;
                    margin: 0 auto;
                    border: 1px solid #333;
                    padding: 20px;
                    background: white;
                    font-family: Arial, sans-serif;
                    line-height: 1.4;
                  }
                  .clinic-header {
                    margin-bottom: 20px;
                    border-bottom: 1px solid #333;
                    padding-bottom: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 15px;
                  }
                  .clinic-logo {
                    width: 70px;
                    height: 70px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                    object-fit: cover;
                    flex-shrink: 0;
                  }
                  .clinic-info {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1;
                    text-align: center;
                  }
                  .clinic-name {
                    font-size: 20px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 5px;
                  }
                  .clinic-subtitle {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 8px;
                  }
                  .clinic-address {
                    font-size: 12px;
                    color: #666;
                  }
                  .document-meta {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    font-size: 12px;
                    background: #f5f5f5;
                    padding: 8px;
                    border: 1px solid #ddd;
                  }
                  .patient-section, .prescription-section {
                    margin-bottom: 20px;
                  }
                  .section-title {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    text-decoration: underline;
                  }
                  .patient-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin-bottom: 15px;
                  }
                  .patient-field {
                    font-size: 12px;
                    margin-bottom: 3px;
                  }
                  .medications-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                  }
                  .medications-table th,
                  .medications-table td {
                    border: 1px solid #333;
                    padding: 8px;
                    text-align: left;
                    font-size: 12px;
                  }
                  .medications-table th {
                    background-color: #f0f0f0;
                    font-weight: bold;
                  }
                  .doctor-section {
                    margin-top: 30px;
                    display: flex;
                    justify-content: space-between;
                  }
                  .doctor-info {
                    font-size: 12px;
                  }
                  .signature-box {
                    width: 200px;
                    height: 40px;
                    border: 1px solid #333;
                    margin-top: 5px;
                  }
                  .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                    border-top: 1px solid #ccc;
                    padding-top: 10px;
                  }
                `}</style>
                <div className="prescription-form">
                  <div className="clinic-header">
                    <img src="/assets/images/logo.jpg" alt="Clinic Logo" className="clinic-logo" onError={(e) => e.currentTarget.style.display = 'none'} />
                    <div className="clinic-info">
                      <div className="clinic-name">New Life Medium Clinic PLC</div>
                      <div className="clinic-subtitle">Medical Prescription</div>
                      <div className="clinic-address">Lafto beside Kebron Guest House<br />Phone: +251925959219</div>
                    </div>
                  </div>

                  <div className="document-meta">
                    <div>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div>Status: {selectedPatientPrescriptions[0]?.status || 'Active'}</div>
                    <div>ID: {selectedPatientPrescriptions[0]?._id?.toString().slice(-6).toUpperCase() || Math.floor(Math.random() * 900000) + 100000}</div>
                  </div>

                  <div className="patient-section">
                    <div className="section-title">Patient Information</div>
                    <div className="patient-info">
                      <div className="patient-field">
                        <strong>FULL NAME:</strong> {
                          (() => {
                            const prescription = selectedPatientPrescriptions[0];
                            if (!prescription) return 'Unknown Patient';

                            // Try to get name from populated patient object first (backend populates this)
                            if (prescription.patient && typeof prescription.patient === 'object' && (prescription.patient.firstName || prescription.patient.lastName)) {
                              return `${prescription.patient.firstName || ''} ${prescription.patient.lastName || ''}`.trim();
                            }
                            // Try to get name from patientId populated object (backup)
                            if (prescription.patientId && typeof prescription.patientId === 'object' && (prescription.patientId.firstName || prescription.patientId.lastName)) {
                              return `${prescription.patientId.firstName || ''} ${prescription.patientId.lastName || ''}`.trim();
                            }
                            // Try to get name from patientDetails (legacy)
                            if (prescription.patientDetails && (prescription.patientDetails.firstName || prescription.patientDetails.lastName)) {
                              return `${prescription.patientDetails.firstName || ''} ${prescription.patientDetails.lastName || ''}`.trim();
                            }
                            // Try to get name from patientName field (if already processed)
                            if (prescription.patientName && prescription.patientName !== 'Unknown Patient' && prescription.patientName !== 'Patient Name') {
                              return prescription.patientName;
                            }
                            // Fall back to finding in patients array
                            const pat = patients.find(pt => pt.id === prescription.patientId || pt._id === prescription.patientId);
                            return pat ? `${pat.firstName || ''} ${pat.lastName || ''}`.trim() : 'Unknown Patient';
                          })()
                        }
                      </div>
                      <div className="patient-field">
                        <strong>AGE:</strong> {
                          (() => {
                            const prescription = selectedPatientPrescriptions[0];
                            if (!prescription) return 'Not specified';
                            const age = (prescription.patient as any)?.age ||
                              (prescription.patientId as any)?.age ||
                              prescription.patientDetails?.age;
                            return age ? `${age} years` : 'Not specified';
                          })()
                        }
                      </div>
                      <div className="patient-field">
                        <strong>GENDER:</strong> {
                          (() => {
                            const prescription = selectedPatientPrescriptions[0];
                            if (!prescription) return 'Not specified';
                            return (prescription.patient as any)?.gender ||
                              (prescription.patientId as any)?.gender ||
                              prescription.patientDetails?.gender ||
                              'Not specified';
                          })()
                        }
                      </div>
                      <div className="patient-field">
                        <strong>ADDRESS:</strong> {
                          (() => {
                            const prescription = selectedPatientPrescriptions[0];
                            if (!prescription) return 'Not specified';
                            return (prescription.patient as any)?.address ||
                              (prescription.patientId as any)?.address ||
                              prescription.patientDetails?.address ||
                              'Not specified';
                          })()
                        }
                      </div>
                      <div className="patient-field">
                        <strong>PATIENT ID:</strong> {
                          (() => {
                            const prescription = selectedPatientPrescriptions[0];
                            if (!prescription) return 'Not specified';
                            return (prescription.patient as any)?.patientId ||
                              (prescription.patientId as any)?.patientId ||
                              prescription.patientDetails?.patientId ||
                              'Not specified';
                          })()
                        }
                      </div>
                      <div className="patient-field" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <strong>Patient Type:</strong>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            style={{ width: '14px', height: '14px', border: '1px solid #333', cursor: 'pointer' }}
                            checked={patientType === 'inpatient'}
                            onChange={() => setPatientType(patientType === 'inpatient' ? null : 'inpatient')}
                          />
                          <span>In-patient</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            style={{ width: '14px', height: '14px', border: '1px solid #333', cursor: 'pointer' }}
                            checked={patientType === 'outpatient'}
                            onChange={() => setPatientType(patientType === 'outpatient' ? null : 'outpatient')}
                          />
                          <span>Out-patient</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="prescription-section">
                    <div className="section-title">Prescription Details</div>

                    <table className="medications-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={selectedMedications.size === selectedPatientPrescriptions.flatMap(p => p.medications).length && selectedMedications.size > 0}
                              onChange={selectAllMedications}
                            />
                          </th>
                          <th>Medication</th>
                          <th>Date given</th>
                          <th>Dosage</th>
                          <th>Route</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPatientPrescriptions.flatMap((p) =>
                          p.medications.map((med, index) => {
                            const medicationKey = `${p._id}-${index}`;
                            const isSelected = selectedMedications.has(medicationKey);
                            const dateGiven = p.datePrescribed || p.createdAt || p.prescribedDate;
                            const dateStr = dateGiven ? new Date(dateGiven).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
                            return (
                              <tr key={medicationKey} className={`medication-row ${isSelected ? 'bg-blue-50' : ''}`}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleMedicationSelection(medicationKey)}
                                  />
                                </td>
                                <td>{med.name || med.medication || med.medicationName || 'Unknown medication'}</td>
                                <td>{dateStr}</td>
                                <td>{med.dosage || 'Not specified'}</td>
                                <td>{med.route || 'Oral'}</td>
                                <td>{med.frequency || 'Not specified'}</td>
                                <td>{med.duration || 'Not specified'}</td>
                                <td>{med.instructions || med.nurseInstructions || med.notes || 'Take as directed'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="doctor-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #333', alignItems: 'start' }}>
                    <div className="doctor-info">
                      <div style={{ marginBottom: '8px' }}><strong>DOCTOR SIGNATURE</strong></div>
                      <div style={{ fontSize: '10px' }}><strong>Prescriber:</strong> DR Natan</div>
                      <div style={{ fontSize: '10px' }}><strong>License:</strong> N/A</div>
                      <div style={{ fontSize: '10px' }}><strong>Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      <div style={{ fontSize: '10px', marginTop: '5px' }}><strong>Signature:</strong> _______________________________________</div>
                    </div>
                    <div className="dispenser-info">
                      <div style={{ marginBottom: '8px' }}><strong>DISPENSER</strong></div>
                      <div style={{ fontSize: '10px' }}><strong>Full Name:</strong> _______________________________________</div>
                      <div style={{ fontSize: '10px', marginTop: '5px' }}><strong>Signature:</strong> _______________________________________</div>
                    </div>
                  </div>

                  <div className="footer">
                    <div>New Life Medium Clinic PLC - Medical Prescription System</div>
                    <div>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</div>
                    <div>This prescription is valid for 30 days from the date of issue</div>
                  </div>
                </div>

                <div className="print-date">
                  Printed on: {new Date().toLocaleString()}
                </div>

                {/* Print-only table with selected medications */}
                <div className="hidden print:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="py-1 pr-2">Medication</th>
                        <th className="py-1 pr-2">Date given</th>
                        <th className="py-1 pr-2">Dosage</th>
                        <th className="py-1 pr-2">Frequency</th>
                        <th className="py-1 pr-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSelectedMedicationsForPrint().map((med, index) => {
                        const p = med.prescription;
                        const dateGiven = p?.datePrescribed || p?.createdAt || p?.prescribedDate;
                        const dateStr = dateGiven ? new Date(dateGiven).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
                        return (
                          <tr key={`print-${index}`} className="border-t medication-row">
                            <td className="py-1 pr-2">{med.name || med.medication || med.medicationName || 'Unknown medication'}</td>
                            <td className="py-1 pr-2">{dateStr}</td>
                            <td className="py-1 pr-2">{med.dosage || 'Not specified'}</td>
                            <td className="py-1 pr-2">{med.frequency || 'Not specified'}</td>
                            <td className="py-1 pr-2 capitalize">{med.prescription.status}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorDashboard;