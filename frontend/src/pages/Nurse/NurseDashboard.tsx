import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Heart,
  Syringe,
  Stethoscope,
  Pill,
  Calendar,
  ClipboardList,
  Plus,
  Clock,
  Bell,
  AlertTriangle,
  Activity,
  CheckCircle2,
  UserCog,
  ListChecks,
  Users,
  RefreshCw,
  TrendingUp,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Tablets
} from 'lucide-react';
import attendanceService from '../../services/attendanceService';
import { useNurseTaskCleanup } from '../../hooks/useWebSocket';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';
import { ToastProvider, ToastViewport } from '../../components/ui/toast';
import { useToast } from '../../components/ui/use-toast';
import { useAuth } from '../../context/AuthContext';
import patientService, { Patient } from '../../services/patientService';
import visitService from '../../services/visitService';
import { notificationService, Notification } from '../../services/notificationService';
import vitalSignsService from '../../services/vitalSignsService';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import api from '../../services/api';
import nurseTaskService from '../../services/nurseTaskService';
import prescriptionService from '../../services/prescriptionService';
import { Prescription } from '../../types/prescription';
import '../../utils/testWorkflow.js'; // Import test utilities for debugging

// Local type definitions

// Define Medication type

interface Task {
  id: string;
  patientId: string;
  patientName: string;
  type: 'medication' | 'vitals' | 'treatment' | 'wound';
  description: string;
  dueTime: string;
  priority: 'normal' | 'urgent' | 'routine';
  status: 'pending' | 'completed' | 'overdue';
}

interface VitalsFormData {
  temperature: string;
  bloodPressure: string;
  heartRate: string;
  respiratoryRate: string;
  bloodSugar: string;
  oxygenSaturation: string;
  pain: string;
  height: string;
  weight: string;
  bmi: string;
}

// Define a type for the WebSocket message structure
type WebSocketNotification = Notification & { // Extend base Notification type
  type: Notification['type'] | 'PATIENT_READY'; // Add PATIENT_READY to possible types
  data?: { // Add optional data field for PATIENT_READY
    patientId?: string;
    patientName?: string;
    department?: string;
  };
};

// Simple function to check vital sign status (standalone copy for hasAbnormalVitals)
const checkVitalStatus = (type: string, value: string): 'normal' | 'warning' | 'critical' => {
  if (!value) return 'normal';
  
  try {
    switch (type) {
      case 'temperature':
        const temp = parseFloat(value);
        if (temp < 35 || temp > 39) return 'critical';
        if (temp < 36.5 || temp > 37.5) return 'warning';
        return 'normal';
        
      case 'bloodPressure':
        const [systolic, diastolic] = value && typeof value === 'string' ? value.split('/').map(Number) : [0, 0];
        if (!systolic || !diastolic) return 'normal';
        if (systolic < 90 || systolic > 180 || diastolic < 60 || diastolic > 110) return 'critical';
        if (systolic < 100 || systolic > 140 || diastolic < 70 || diastolic > 90) return 'warning';
        return 'normal';
        
      case 'heartRate':
        const hr = parseInt(value);
        if (hr < 50 || hr > 120) return 'critical';
        if (hr < 60 || hr > 100) return 'warning';
        return 'normal';
        
      case 'respiratoryRate':
        const rr = parseInt(value);
        if (rr < 8 || rr > 25) return 'critical';
        if (rr < 12 || rr > 20) return 'warning';
        return 'normal';
        
      case 'oxygenSaturation':
        const os = parseInt(value);
        if (os < 90) return 'critical';
        if (os < 95) return 'warning';
        return 'normal';
        
      case 'bloodSugar':
        const bs = parseInt(value);
        if (bs < 50 || bs > 300) return 'critical';
        if (bs < 70 || bs > 140) return 'warning';
        return 'normal';
        
      default:
        return 'normal';
    }
  } catch (e) {
    return 'normal';
  }
};

// Standalone version of hasAbnormalVitals
const hasAbnormalVitals = (patient: Patient): boolean => {
  // First check if the patient has vitals data
  if (!patient.vitals) {
    return false;
  }
  
  // Next check if any of the key vital values are present
  const hasVitalData = patient.vitals.temperature || 
                      patient.vitals.bloodPressure || 
                      patient.vitals.heartRate || 
                      patient.vitals.respiratoryRate;
  
  if (!hasVitalData) {
    return false;
  }
  
  // Now check if any of the vitals are abnormal
  return checkVitalStatus('temperature', patient.vitals.temperature || '') !== 'normal' ||
         checkVitalStatus('bloodPressure', patient.vitals.bloodPressure || '') !== 'normal' ||
         checkVitalStatus('heartRate', patient.vitals.heartRate || '') !== 'normal' ||
         checkVitalStatus('respiratoryRate', patient.vitals.respiratoryRate || '') !== 'normal';
};

interface NurseDashboardProps {
  initialTab?: string;
}

const NurseDashboard: React.FC<NurseDashboardProps> = ({ initialTab = 'patients' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isWoundCareModalOpen, setIsWoundCareModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime] = useState(new Date().toLocaleTimeString());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vitalsForm, setVitalsForm] = useState<VitalsFormData>({
    temperature: '',
    bloodPressure: '',
    heartRate: '',
    respiratoryRate: '',
    bloodSugar: '',
    oxygenSaturation: '',
    pain: '',
    height: '',
    weight: '',
    bmi: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [timeTracking, setTimeTracking] = useState<{[key: string]: number}>({});
  // Pagination state for patients table
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Reset to first page when the dataset or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, patients.length, filteredPatients.length]);

  const [isReferToDocModalOpen, setIsReferToDocModalOpen] = useState(false);
  const [referralReason, setReferralReason] = useState('');
  const [referralPriority, setReferralPriority] = useState('normal');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const [currentVisitId, setCurrentVisitId] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<Record<string, Prescription[]>>({});
  const [prescriptionsLoading, setPrescriptionsLoading] = useState<boolean>(false);
  
  // Automatic attendance status
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'offline' | 'loading'>('loading');
  const [lastActivity, setLastActivity] = useState<string>('');
  
  const navigate = useNavigate();

  // Debug selectedPatient changes
  useEffect(() => {
    if (selectedPatient) {
      console.log('selectedPatient updated:', {
        id: selectedPatient.id,
        name: selectedPatient.name || `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        assignedDoctorId: selectedPatient.assignedDoctorId,
        hasAssignedDoctor: !!selectedPatient.assignedDoctorId
      });
    }
  }, [selectedPatient]);

  // Fetch patients on component mount
  useEffect(() => {
    fetchPatients();
    fetchNurseTasks();
  }, []);

  // WebSocket listener for real-time nurse task cleanup
  useNurseTaskCleanup((event) => {
    console.log('🧹 Nurse task cleanup event received:', event);
    if (event.filter?.taskType === 'MEDICATION') {
      // Refresh tasks to remove cleaned up medication tasks
      fetchNurseTasks();
      toast({
        title: "Tasks Updated",
        description: `${event.deletedCount} medication task(s) removed`,
        variant: "default",
      });
    }
  }, []);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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

  // Function to fetch nurse tasks
  const fetchNurseTasks = async () => {
    try {
      const userId = user?._id || user?.id;
      if (!user || !userId) {
        console.error('Cannot fetch tasks: No user ID available');
        return;
      }

      console.log(`Fetching nurse tasks for nurse ID: ${userId}`);
      
      // Get the token from localStorage or context
      const token = localStorage.getItem('token') || '';
      
      // Fetch tasks assigned to this nurse AND unassigned medication tasks
      const assignedTasks = await nurseTaskService.getNurseTasks({ nurseId: userId }, token);
      console.log(`Fetched ${assignedTasks?.length || 0} assigned nurse tasks`);
      
      // Also fetch unassigned medication tasks that any nurse can handle
      const unassignedMedicationTasks = await nurseTaskService.getNurseTasks({ 
        taskType: 'MEDICATION',
        status: 'PENDING' 
      }, token);
      console.log(`Fetched ${unassignedMedicationTasks?.length || 0} unassigned medication tasks`);
      
      // Filter unassigned tasks to only include those not assigned to any nurse
      // Add null/undefined checks to prevent filter errors
      const trulyUnassignedTasks = Array.isArray(unassignedMedicationTasks) 
        ? unassignedMedicationTasks.filter(task => !task.assignedTo)
        : [];
      console.log(`Found ${trulyUnassignedTasks.length} truly unassigned medication tasks`);
      
      // Combine assigned and unassigned tasks, removing duplicates
      const allTaskIds = new Set();
      const assignedTasksArray = Array.isArray(assignedTasks) ? assignedTasks : [];
      const fetchedTasks = [...assignedTasksArray, ...trulyUnassignedTasks].filter(task => {
        const taskId = task.id || task._id;
        if (allTaskIds.has(taskId)) {
          return false;
        }
        allTaskIds.add(taskId);
        return true;
      });
      
      console.log(`Total tasks after combining: ${fetchedTasks.length}`);
      
      // Convert to the format expected by the dashboard
      const formattedTasks = fetchedTasks.map(task => {
        const lowerDesc = (task.description || '').toLowerCase();
        const isWoundRelated = lowerDesc.includes('wound') || lowerDesc.includes('dressing');

        // Determine dashboard type
        let dashboardType: 'medication' | 'vitals' | 'treatment' | 'wound';
        const taskTypeLower = (task.taskType || '').toLowerCase();
        if (taskTypeLower === 'medication') {
          dashboardType = 'medication';
        } else if (taskTypeLower === 'vital_signs') {
          dashboardType = isWoundRelated ? 'wound' : 'vitals';
        } else if (taskTypeLower === 'procedure') {
          dashboardType = isWoundRelated ? 'wound' : 'treatment';
        } else {
          dashboardType = isWoundRelated ? 'wound' : 'treatment';
        }

        return {
          id: task.id || task._id,
          patientId: task.patientId,
          patientName: task.patientName,
          type: dashboardType,
          description: task.description,
          dueTime: task.dueDate,
          priority: (task.priority || '').toLowerCase() === 'high' || (task.priority || '').toLowerCase() === 'urgent' ? 'urgent' :
                   (task.priority || '').toLowerCase() === 'medium' ? 'normal' : 'routine',
          status: (task.status || '').toLowerCase() === 'completed' ? 'completed' :
                 (task.status || '').toLowerCase() === 'in_progress' ? 'pending' : 'pending'
        };
      });
      
      setTasks(formattedTasks as any);
      
      // Update dashboard stats
      // setDashboardStats(prev => ({
      //   ...prev,
      //   pendingVitals: formattedTasks.filter(t => t.type === 'vitals' && t.status !== 'completed').length,
      //   completedTasks: formattedTasks.filter(t => t.status === 'completed').length
      // }));
      
    } catch (err) {
      console.error('Error fetching nurse tasks:', err);
      toast({
        title: "Error",
        description: "Failed to load your tasks. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      
      // Clear browser cache by adding timestamp to URL
      const timestamp = new Date().getTime();
      console.log(`Fetching patients with timestamp ${timestamp} to avoid caching`);
      
      // Use forceRefresh=true to ensure we always get the latest data
      const allPatients = await patientService.getAllPatients(true, false, 1000);
      
      console.log(`[DEBUG] Current nurse user ID:`, user?._id);
      console.log("[DEBUG] All patients fetched:", allPatients.patients.length);
      
      // Define active statuses for filtering
      const activeStatuses = ['Admitted', 'scheduled', 'in-progress', 'waiting'];
      
      // Debug: Log all patients to understand what we have
      console.log("[DEBUG] All patients summary:");
      const patientsWithNurseAssignment = allPatients.patients.filter(p => p.assignedNurseId);
      const patientsWithActiveStatus = allPatients.patients.filter(p => activeStatuses.includes(p.status));
      
      console.log(`[DEBUG] Summary: ${allPatients.patients.length} total patients`);
      console.log(`[DEBUG] Patients with assignedNurseId: ${patientsWithNurseAssignment.length}`);
      console.log(`[DEBUG] Patients with active status: ${patientsWithActiveStatus.length}`);
      
      if (patientsWithNurseAssignment.length > 0) {
        console.log("[DEBUG] Sample of patients with nurse assignments:");
        patientsWithNurseAssignment.slice(0, 5).forEach((p, index) => {
          console.log(`  ${index + 1}. ${p.firstName} ${p.lastName}`, {
            assignedNurseId: p.assignedNurseId,
            assignedNurseIdType: typeof p.assignedNurseId,
            status: p.status
          });
        });
      }
      
      allPatients.patients.forEach((p, index) => {
        console.log(`Patient ${index + 1}: ${p.firstName} ${p.lastName}`, {
          id: p.id,
          status: p.status,
          assignedNurseId: p.assignedNurseId,
          assignedNurseIdType: typeof p.assignedNurseId,
          assignedDoctorId: p.assignedDoctorId
        });
      });
      
      // Filter to show patients assigned to this nurse
      // Show patients with status: 'Admitted', 'scheduled', 'in-progress' (active patients)
      // Note: activeStatuses is already defined above
      const currentNurseId = user?.id || user?._id;
      console.log(`[DEBUG] Current nurse ID: ${currentNurseId}`);
      console.log(`[DEBUG] Current user object:`, {
        _id: user?._id,
        id: user?.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        role: user?.role
      });
      
      if (!currentNurseId) {
        console.error('[NurseDashboard] No nurse ID found in user object');
        toast({
          title: "Error",
          description: "Unable to identify nurse. Please log out and log back in.",
          variant: "destructive",
        });
        setPatients([]);
        setFilteredPatients([]);
        return [];
      }
      
      // More flexible ID comparison (handle string vs ObjectId, null, undefined)
      const normalizeId = (id: any): string | null => {
        if (!id) return null;
        return id.toString().trim();
      };
      
      const normalizedNurseId = normalizeId(currentNurseId);
      
      // Filter patients: 
      // 1. Patients assigned to this nurse with active status (priority)
      // 2. If no assigned patients, show all active patients that need vitals (fallback for workflow)
      const assignedPatients = allPatients.patients.filter(patient => {
        const patientNurseId = normalizeId(patient.assignedNurseId);
        const isAssignedToThisNurse = patientNurseId === normalizedNurseId;
        const hasActiveStatus = activeStatuses.includes(patient.status);

        console.log(`[DEBUG] Checking patient ${patient.firstName} ${patient.lastName}:`, {
          assignedNurseId: patient.assignedNurseId,
          normalizedPatientNurseId: patientNurseId,
          normalizedCurrentNurseId: normalizedNurseId,
          isAssignedToThisNurse: isAssignedToThisNurse,
          status: patient.status,
          hasActiveStatus: hasActiveStatus,
          willInclude: isAssignedToThisNurse && hasActiveStatus
        });

        if (isAssignedToThisNurse && hasActiveStatus) {
          console.log(`[NurseDashboard] Including assigned patient: ${patient.firstName} ${patient.lastName}`, {
            nurseId: patient.assignedNurseId,
            currentNurseId: currentNurseId,
            status: patient.status
          });
          return true;
        }
        
        // Log patients that don't meet criteria for debugging
        if (isAssignedToThisNurse && !hasActiveStatus) {
          console.log(`[NurseDashboard] Excluding assigned patient (inactive status): ${patient.firstName} ${patient.lastName}`, {
            status: patient.status,
            activeStatuses: activeStatuses
          });
        }
        
        if (!isAssignedToThisNurse && hasActiveStatus) {
          console.log(`[NurseDashboard] Excluding patient (not assigned to this nurse): ${patient.firstName} ${patient.lastName}`, {
            assignedNurseId: patient.assignedNurseId,
            currentNurseId: currentNurseId
          });
        }

        return false;
      });
      
      // If no assigned patients, show all active patients (for vitals recording workflow)
      // This allows nurses to record vitals even if patients aren't formally assigned
      const activePatientsForVitals = assignedPatients.length === 0 
        ? allPatients.patients.filter(patient => {
            const hasActiveStatus = activeStatuses.includes(patient.status);
            // Check if patient needs vitals (no vitals recorded or vitals are empty)
            const needsVitals = !patient.vitals || 
                              !patient.vitals.temperature || 
                              !patient.vitals.bloodPressure ||
                              !patient.vitals.heartRate;
            
            return hasActiveStatus && needsVitals;
          })
        : [];
      
      console.log(`Showing ${assignedPatients.length} patients assigned to this nurse with active status`);
      
      // Also check all patients assigned to this nurse (any status) for debugging
      const allAssignedPatients = allPatients.patients.filter(patient => {
        const patientNurseId = normalizeId(patient.assignedNurseId);
        return patientNurseId === normalizedNurseId;
      });
      
      console.log(`[DEBUG] Total patients assigned to this nurse (any status): ${allAssignedPatients.length}`);
      if (allAssignedPatients.length > 0) {
        console.log("[DEBUG] All assigned patients (any status):", allAssignedPatients.map(p => 
          `${p.firstName} ${p.lastName}: status=${p.status}, nurseId=${p.assignedNurseId}`
        ));
      }
      
      if (assignedPatients.length > 0) {
        console.log("Assigned patients with active status:", assignedPatients.map(p => 
          `${p.firstName} ${p.lastName} (${p.id}): status=${p.status}, nurseId=${p.assignedNurseId}`
        ));
        
        // Fetch prescriptions for each patient
        fetchPrescriptionsForPatients(assignedPatients);
        setPatients(assignedPatients);
        setFilteredPatients(assignedPatients);
        setError(null);
        return assignedPatients;
      } else if (activePatientsForVitals.length > 0) {
        // Show active patients that need vitals recorded (workflow fallback)
        console.log(`Showing ${activePatientsForVitals.length} active patients that need vitals recorded`);
        console.log("Active patients for vitals:", activePatientsForVitals.map(p => 
          `${p.firstName} ${p.lastName} (${p.id}): status=${p.status}`
        ));
        
        toast({
          title: "Showing Active Patients",
          description: `No patients are assigned to you. Showing ${activePatientsForVitals.length} active patient(s) that need vitals recorded.`,
          variant: "default",
        });
        
        fetchPrescriptionsForPatients(activePatientsForVitals);
        setPatients(activePatientsForVitals);
        setFilteredPatients(activePatientsForVitals);
        setError(null);
        return activePatientsForVitals;
      } else {
        console.log("INFO: No patients assigned to this nurse with active status");
        
        // If no active patients, show all assigned patients (any status) so nurse can see what's assigned
        if (allAssignedPatients.length > 0) {
          console.log("Showing all assigned patients regardless of status");
          toast({
            title: "Info",
            description: `Found ${allAssignedPatients.length} patient(s) assigned to you, but none are in active status. Showing all assigned patients.`,
            variant: "default",
          });
          setPatients(allAssignedPatients);
          setFilteredPatients(allAssignedPatients);
          fetchPrescriptionsForPatients(allAssignedPatients);
          setError(null);
          return allAssignedPatients;
        } else {
          // No patients assigned at all - show all active patients as last resort
          const allActivePatients = allPatients.patients.filter(p => activeStatuses.includes(p.status));
          
          if (allActivePatients.length > 0) {
            console.log(`No assigned patients found. Showing all ${allActivePatients.length} active patients as fallback.`);
            toast({
              title: "No Patients Assigned",
              description: `No patients are assigned to you. Showing all ${allActivePatients.length} active patient(s) for vitals recording.`,
              variant: "default",
            });
            fetchPrescriptionsForPatients(allActivePatients);
            setPatients(allActivePatients);
            setFilteredPatients(allActivePatients);
            setError(null);
            return allActivePatients;
          } else {
            // No patients at all
            console.log("No patients available");
            toast({
              title: "No Patients Available",
              description: "No active patients are available. Patients will appear here once they are registered and have an active status.",
              variant: "default",
            });
            setPatients([]);
            setFilteredPatients([]);
            setError(null);
            return [];
          }
        }
      }
    } catch (err) {
      console.error('Error fetching or filtering patients:', err);
      setError('Failed to load patients');
      toast({
        title: "Error",
        description: "Failed to load patients. Please try again.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch prescriptions for multiple patients
  const fetchPrescriptionsForPatients = async (patients: Patient[]) => {
    setPrescriptionsLoading(true);
    const prescriptionMap: Record<string, Prescription[]> = {};
    
    try {
      // Process patients in batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < patients.length; i += batchSize) {
        const batch = patients.slice(i, i + batchSize);
        
        // Process each patient in the current batch concurrently
        await Promise.all(batch.map(async (patient) => {
          try {
            if (patient.id) {
              console.log(`Fetching prescriptions for patient: ${patient.firstName} ${patient.lastName} (${patient.id})`);
              const allPrescriptions = await prescriptionService.getPatientPrescriptions(patient.id);
              // Keep only active prescriptions from the current admission window
              const admissionTime = patient.updatedAt || patient.lastUpdated || patient.lastVisit || patient.createdAt;
              const activeCurrentPrescriptions = allPrescriptions.filter((prescription: any) => {
                // status check (default ACTIVE if none)
                const status = (prescription.status || 'ACTIVE').toUpperCase();
                if (status !== 'ACTIVE') return false;
                if (!admissionTime) return true; // if no admission timestamp just rely on ACTIVE status
                const prescribedAt = new Date(prescription.datePrescribed || prescription.createdAt || 0);
                return prescribedAt >= new Date(admissionTime);
              });
              console.log(`Filtered to ${activeCurrentPrescriptions.length} current prescriptions for patient ${patient.id}`);
              prescriptionMap[patient.id] = activeCurrentPrescriptions as any;
            }
          } catch (error) {
            console.error(`Error fetching prescriptions for patient ${patient.id}:`, error);
            prescriptionMap[patient.id] = [];
          }
        }));
      }
      
      setPrescriptions(prescriptionMap);
      console.log("All prescriptions loaded:", prescriptionMap);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setPrescriptionsLoading(false);
    }
  };

  // Calculate statistics
  const totalPatients = patients.length;
  const criticalCare = patients.filter(p => p.priority === 'urgent' || p.priority === 'emergency').length;
  const pendingMedicationsCount = patients.reduce((acc, p) => acc + (p.medications?.filter(m => m.nextDue && new Date(m.nextDue) <= new Date()).length || 0), 0);
  const woundCareDue = patients.reduce((acc, p) => acc + (p.woundCare?.filter(w => w.nextDressing && new Date(w.nextDressing) <= new Date()).length || 0), 0);

  // Setup WebSocket connection for real-time notifications
  useEffect(() => {
    if (user) {
      // Disconnect any existing WebSocket connection before creating a new one
      notificationService.disconnect();
      
      // Use specific WebSocketNotification type
      const ws = notificationService.connectWebSocket(
        user.id,
        'nurse',
        (notification: WebSocketNotification) => { 
          console.log('WS Notification Received:', notification);
          // Add to state, ensuring it matches the base Notification structure
          setNotifications(prev => [{
             id: notification.id || Date.now().toString(),
             title: notification.title || 'Notification',
             message: notification.message || 'New update received.',
             type: (notification as any).type === 'PATIENT_READY' ? 'info' : (notification.type || 'info'), 
             timestamp: new Date(notification.timestamp || Date.now()),
             read: notification.read || false,
             priority: notification.priority || 'medium'
           }, ...prev].slice(0, 50));
          
          // Handle PATIENT_READY specifically
          if ((notification as any).type === 'PATIENT_READY') { 
            toast({
              title: notification.title || 'New Patient Assigned',
              description: notification.message || `Patient ${notification.data?.patientName || '...'} has been assigned to you.`,
            });
            // Immediately refresh the patient list
            fetchPatients();
          } else {
            // Show generic toast for other notifications
            toast({
              title: notification.title || 'New Notification',
              description: notification.message || 'You have a new update.',
              variant: notification.priority === 'high' ? 'destructive' : 'default', 
            });
          }
        }
      );

      setWsConnection(ws as any);

      return () => {
        console.log('Cleaning up WebSocket connection');
        notificationService.disconnect();
      };
    }
  }, [user, toast]);

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (user) {
        try {
          const notifs = await notificationService.getNotifications(user.id);
          setNotifications(notifs);
        } catch (error) {
          console.error('Error fetching notifications:', error);
          toast({ title: "Error", description: "Failed to load notifications.", variant: "destructive" });
        }
      }
    };

    fetchNotifications();
  }, [user, toast]);

  // Update vitals handler
  const handleUpdateVitals = async (patientId: string) => {
    // First try to get the latest patient data from the API to ensure we have current assignedDoctorId
    console.log('Looking for patient with ID:', patientId);
    console.log('Available patients count:', patients.length);
    console.log('Available patients IDs:', patients.map(p => ({ id: p.id, _id: p._id, name: `${p.firstName} ${p.lastName}` })));
    
    let patient = patients.find(p => p.id === patientId || p._id === patientId);
    if (!patient) {
      console.error('Patient not found in local patients array. Looking for patientId:', patientId);
      console.error('Available patients:', patients.map(p => ({ id: p.id, _id: p._id, name: `${p.firstName} ${p.lastName}` })));
      toast({
        title: "Error",
        description: "Selected patient not found locally.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Found patient in local array. Patient ID:', patient.id || patient._id);
    console.log('Patient name:', patient.firstName, patient.lastName);
    console.log('Patient status:', patient.status);

    try {
      // Fetch the latest patient data to ensure we have current assignedDoctorId
      const latestPatientData = await patientService.getPatientById(patientId);
      if (latestPatientData) {
        // Use the latest data if available, otherwise fall back to cached data
        patient = latestPatientData;
        console.log('Using latest patient data with assignedDoctorId:', patient.assignedDoctorId);
      } else {
        console.log('Using cached patient data with assignedDoctorId:', patient.assignedDoctorId);
      }
    } catch (error) {
      console.warn('Could not fetch latest patient data, using cached data:', error);
    }


    // Ensure patient has an ID before setting as selected
    if (!patient || (!patient.id && !patient._id)) {
      console.error('Patient is missing ID.');
      console.error('Patient exists:', !!patient);
      console.error('Patient keys:', patient ? Object.keys(patient) : 'patient is null/undefined');
      console.error('Patient key values:', patient ? Object.keys(patient).map(key => `${key}: ${patient[key]}`) : 'patient is null/undefined');
      console.error('Patient.id:', patient?.id);
      console.error('Patient._id:', patient?._id);
      console.error('Patient type:', typeof patient);
      console.error('Patient constructor:', patient?.constructor?.name);
      
      // Try to log specific properties without full serialization
      if (patient) {
        console.error('Patient firstName:', patient.firstName);
        console.error('Patient lastName:', patient.lastName);
        console.error('Patient status:', patient.status);
        
        // Log all enumerable properties
        for (const key in patient) {
          console.error(`Patient[${key}]:`, patient[key]);
        }
      }
      
      toast({
        title: "Error",
        description: "Patient data is invalid. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPatient(patient);
    setCurrentVisitId(null);

    try {
      console.log(`Preparing vitals modal for patient: ${patientId}`);
      
      // Try to get the latest vitals from the vitals service
      let mostRecentVitals = null;
      try {
        mostRecentVitals = await vitalSignsService.getLatestNurseVitals(patientId);
        console.log('Most recent vitals from vitals service:', mostRecentVitals);
      } catch (vitalsError) {
        console.log('No previous vitals found from vitals service, using patient vitals:', vitalsError);
      }

      // Use the most recent vitals or fall back to patient vitals
      setVitalsForm({
        temperature: mostRecentVitals?.temperature || patient.vitals?.temperature || '',
        bloodPressure: mostRecentVitals?.bloodPressure || patient.vitals?.bloodPressure || '',
        heartRate: mostRecentVitals?.heartRate || patient.vitals?.heartRate || '',
        respiratoryRate: mostRecentVitals?.respiratoryRate || patient.vitals?.respiratoryRate || '',
        bloodSugar: mostRecentVitals?.bloodSugar || patient.vitals?.bloodSugar || '',
        oxygenSaturation: mostRecentVitals?.oxygenSaturation || patient.vitals?.oxygenSaturation || '',
        pain: mostRecentVitals?.pain || patient.vitals?.pain || '',
        height: mostRecentVitals?.height || patient.vitals?.height || '',
        weight: mostRecentVitals?.weight || patient.vitals?.weight || '',
        bmi: mostRecentVitals?.bmi || patient.vitals?.bmi || ''
      });
      // Use setTimeout to ensure state is updated before opening modal
      setTimeout(() => {
        setIsVitalsModalOpen(true);
      }, 100);

    } catch (err) {
      console.error('Error preparing vitals modal:', err);
      toast({
        title: "Error",
        description: "Failed to load patient data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // BMI classification function
  const getBMIClassification = (bmi: number): { category: string; color: string; bgColor: string } => {
    if (bmi < 18.5) {
      return { category: 'Underweight', color: 'text-primary', bgColor: 'bg-primary/20' };
    } else if (bmi >= 18.5 && bmi < 25) {
      return { category: 'Normal', color: 'text-primary', bgColor: 'bg-primary/20' };
    } else if (bmi >= 25 && bmi < 30) {
      return { category: 'Overweight', color: 'text-accent-foreground', bgColor: 'bg-accent/20' };
    } else if (bmi >= 30 && bmi < 35) {
      return { category: 'Obese Class I', color: 'text-accent-foreground', bgColor: 'bg-accent/20' };
    } else if (bmi >= 35 && bmi < 40) {
      return { category: 'Obese Class II', color: 'text-destructive', bgColor: 'bg-destructive/20' };
    } else {
      return { category: 'Obese Class III', color: 'text-destructive', bgColor: 'bg-destructive/30' };
    }
  };

  // Add BMI calculation function
  const calculateBMI = (height: string, weight: string) => {
    if (!height || !weight || typeof height !== 'string' || typeof weight !== 'string') {
      handleVitalsChange('bmi', '');
      return;
    }
    
    const heightInMeters = parseFloat(height) / 100; // Convert cm to meters
    const weightInKg = parseFloat(weight);
    
    if (heightInMeters > 0 && weightInKg > 0) {
      const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
      const bmiNum = parseFloat(bmi);
      const classification = getBMIClassification(bmiNum);
      const bmiWithClassification = `${bmi} (${classification.category})`;
      handleVitalsChange('bmi', bmiWithClassification);
    } else {
      handleVitalsChange('bmi', '');
    }
  };

  // Helper function to reset vitals form
  const resetVitalsForm = () => {
    setVitalsForm({
      temperature: '',
      bloodPressure: '',
      heartRate: '',
      respiratoryRate: '',
      bloodSugar: '',
      oxygenSaturation: '',
      pain: '',
      height: '',
      weight: '',
      bmi: ''
    });
  };

  // Helper function to extract clean BMI value (without classification)
  const getCleanBMIValue = (bmiString: string): string => {
    if (!bmiString || typeof bmiString !== 'string') return '';
    const bmiMatch = bmiString.match(/(\d+\.?\d*)/);
    return bmiMatch ? bmiMatch[1] : '';
  };

  // Modify handleVitalsChange to include BMI calculation
  const handleVitalsChange = (field: keyof VitalsFormData, value: string) => {
    setVitalsForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'height' || field === 'weight') {
      calculateBMI(
        field === 'height' ? value : vitalsForm.height,
        field === 'weight' ? value : vitalsForm.weight
      );
    }
  };

  const validateVitals = (data: VitalsFormData) => {
    const errors: Partial<Record<keyof VitalsFormData, string>> = {};
    const isChild = selectedPatient && selectedPatient.age < 12;
    
    // Temperature (WHO standards)
    if (!data.temperature) errors.temperature = 'Temperature is required';
    else if (parseFloat(data.temperature) < 35 || parseFloat(data.temperature) > 42) 
      errors.temperature = 'Temperature must be between 35°C and 42°C';

    // Blood Pressure (WHO standards) - Optional for children under 12
    if (!isChild && !data.bloodPressure) {
      errors.bloodPressure = 'Blood pressure is required';
    } else if (data.bloodPressure) {
      const [systolic, diastolic] = data.bloodPressure && typeof data.bloodPressure === 'string' ? data.bloodPressure.split('/').map(Number) : [0, 0];
      if (!/^\d{2,3}\/\d{2,3}$/.test(data.bloodPressure))
        errors.bloodPressure = 'Blood pressure must be in format systolic/diastolic (e.g. 120/80)';
      else if (systolic < 70 || systolic > 220 || diastolic < 40 || diastolic > 130)
        errors.bloodPressure = 'Blood pressure values are out of valid range';
    }

    // Heart Rate (WHO standards)
    if (!data.heartRate) errors.heartRate = 'Heart rate is required';
    else if (parseInt(data.heartRate) < 40 || parseInt(data.heartRate) > 180)
      errors.heartRate = 'Heart rate must be between 40 and 180 bpm';

    // Respiratory Rate (WHO standards) - Optional field, but validate if provided
    if (data.respiratoryRate) {
      if (parseInt(data.respiratoryRate) < 8 || parseInt(data.respiratoryRate) > 40) {
        errors.respiratoryRate = 'Respiratory rate must be between 8 and 40 breaths per minute';
      }
    }

    // Blood Sugar (WHO standards) - Optional for all ages, but validate if provided
    if (data.bloodSugar && (parseFloat(data.bloodSugar) < 30 || parseFloat(data.bloodSugar) > 600))
      errors.bloodSugar = 'Blood sugar must be between 30 and 600 mg/dL';

    // Oxygen Saturation (WHO standards)
    if (data.oxygenSaturation && (parseInt(data.oxygenSaturation) < 70 || parseInt(data.oxygenSaturation) > 100))
      errors.oxygenSaturation = 'Oxygen saturation must be between 70% and 100%';

    // Pain Level (Standard scale) - Optional for very young children
    if (data.pain && (parseInt(data.pain) < 0 || parseInt(data.pain) > 10))
      errors.pain = 'Pain level must be between 0 and 10';

    // Height validation
    if (data.height && (parseFloat(data.height) < 30 || parseFloat(data.height) > 250))
      errors.height = 'Height must be between 30 and 250 cm';

    // Weight validation
    if (data.weight && (parseFloat(data.weight) < 0.1 || parseFloat(data.weight) > 500))
      errors.weight = 'Weight must be between 0.1 and 500 kg';

    return errors;
  };

  // Update the vital signs display in the table to show status
  const renderVitalWithStatus = (label: string, value: string | undefined, type: string) => {
    if (!value) return null;
    const status = checkVitalStatus(type, value);
    return (
      <div className="flex items-center justify-between">
        <span>{label}: {value}</span>
        <span className={`ml-2 text-xs font-medium ${status === 'critical' ? 'text-destructive' : status === 'warning' ? 'text-accent-foreground' : 'text-primary'}`}>
          {status === 'critical' ? 'Critical' : status === 'warning' ? 'Warning' : 'Normal'}
        </span>
      </div>
    );
  };

  // Update the sendNotificationToDoctor function
  const sendNotificationToDoctor = async (patientId: string, vitalsData: any) => {
    try {
      if (!selectedPatient) {
        throw new Error('No patient selected');
      }

      if (!selectedPatient.assignedDoctorId) {
        toast({
          title: "Error",
          description: "Patient does not have an assigned doctor. Please assign a doctor first.",
          variant: "destructive",
        });
        return false;
      }

      // Check for concerning vitals
      const concerningVitals = [];
      if (vitalsData.temperature && parseFloat(vitalsData.temperature) >= 38.0) {
        concerningVitals.push(`Fever: ${vitalsData.temperature}°C`);
      }
      if (vitalsData.bloodPressure) {
        const [systolic, diastolic] = vitalsData.bloodPressure && typeof vitalsData.bloodPressure === 'string' ? vitalsData.bloodPressure.split('/').map(Number) : [0, 0];
        if (systolic >= 160 || diastolic >= 100 || systolic < 90 || diastolic < 60) {
          concerningVitals.push(`Abnormal BP: ${vitalsData.bloodPressure}`);
        }
      }
      if (vitalsData.heartRate && (parseInt(vitalsData.heartRate) > 100 || parseInt(vitalsData.heartRate) < 60)) {
        concerningVitals.push(`Abnormal HR: ${vitalsData.heartRate}`);
      }
      if (vitalsData.oxygenSaturation && parseInt(vitalsData.oxygenSaturation) < 95) {
        concerningVitals.push(`Low O2: ${vitalsData.oxygenSaturation}%`);
      }

      const notificationData = {
        type: 'vitals_update',
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        doctorId: selectedPatient.assignedDoctorId,
        message: concerningVitals.length > 0 
          ? `Concerning vitals detected for ${selectedPatient.name}: ${concerningVitals.join(', ')}`
          : `New vitals recorded for ${selectedPatient.name}`,
        data: {
          vitals: vitalsData,
          concerningVitals,
        },
        priority: (concerningVitals.length > 0 ? 'urgent' : 'normal') as 'normal' | 'urgent' | 'emergency',
      };

      // Send notification to doctor
      const response = await patientService.notifyDoctor(patientId, notificationData);
      console.log('Doctor notification response:', response);

      // Update patient status to scheduled
      const updateResponse = await patientService.updatePatient(patientId, {
        status: 'scheduled',
        assignedDoctorId: selectedPatient.assignedDoctorId,
      });

      if (!updateResponse.success) {
        throw new Error('Failed to update patient status');
      }

      return true;
    } catch (error) {
      console.error('Error notifying doctor:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to notify doctor",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle vital signs submission with doctor notification
  const handleSaveVitals = async () => {
    if (!selectedPatient || !selectedPatient.id) {
      toast({
        title: "Error",
        description: "No patient selected or patient ID is missing",
        variant: "destructive"
      });
      return;
    }

    // For incremental saving, only validate fields that have values
    const filledFields = Object.entries(vitalsForm).filter(([key, value]) => value && typeof value === 'string' && value.trim() !== '');
    if (filledFields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one vital sign",
        variant: "destructive"
      });
      return;
    }

    // Only validate fields that have values
    const errors = validateVitals(vitalsForm);
    const relevantErrors = Object.entries(errors).filter(([key, value]) => 
      vitalsForm[key as keyof VitalsFormData] && (typeof vitalsForm[key as keyof VitalsFormData] === 'string' && vitalsForm[key as keyof VitalsFormData].trim() !== '')
    );
    
    if (relevantErrors.length > 0) {
      relevantErrors.forEach(([key, error]) => 
        toast({
          title: "Validation Error",
          description: error,
          variant: "destructive"
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Saving vitals for patient:', selectedPatient);
      console.log('Vitals form data:', vitalsForm);
      
      // Create a vitals object with timestamp
      const vitalsData = {
        temperature: vitalsForm.temperature,
        bloodPressure: vitalsForm.bloodPressure,
        heartRate: vitalsForm.heartRate,
        respiratoryRate: vitalsForm.respiratoryRate || '',
        bloodSugar: vitalsForm.bloodSugar || '',
        oxygenSaturation: vitalsForm.oxygenSaturation || '',
        pain: vitalsForm.pain || '',
        height: vitalsForm.height || '',
        weight: vitalsForm.weight || '',
        bmi: getCleanBMIValue(vitalsForm.bmi || ''),
        timestamp: new Date().toISOString()
      };
      
      console.log('Formatted vitals data to send to API:', vitalsData);
      
      // Double-check that selectedPatient exists and has an ID
      if (!selectedPatient || (!selectedPatient.id && !selectedPatient._id)) {
        console.error('Selected patient is null or missing ID.');
        console.error('SelectedPatient exists:', !!selectedPatient);
        console.error('SelectedPatient keys:', selectedPatient ? Object.keys(selectedPatient) : 'selectedPatient is null/undefined');
        console.error('SelectedPatient.id:', selectedPatient?.id);
        console.error('SelectedPatient._id:', selectedPatient?._id);
        console.error('SelectedPatient type:', typeof selectedPatient);
        console.error('SelectedPatient constructor:', selectedPatient?.constructor?.name);
        
        // Try to log specific properties without full serialization
        if (selectedPatient) {
          console.error('SelectedPatient firstName:', selectedPatient.firstName);
          console.error('SelectedPatient lastName:', selectedPatient.lastName);
          console.error('SelectedPatient status:', selectedPatient.status);
        }
        
        toast({
          title: "Error",
          description: "No patient selected or patient ID is missing. Please select a patient first.",
          variant: "destructive"
        });
        return;
      }
      
      const patientId = selectedPatient.id || selectedPatient._id;
      console.log('Patient ID for vitals update:', patientId);
      
      try {
        // Step 1: Update the vitals data through the API
        const updatedPatient = await patientService.updateVitals(patientId, vitalsData);
        console.log('Vitals updated successfully, response from API:', updatedPatient);
        
        // Step 2: Also directly update the patient status to ensure it's saved as 'scheduled'
        await patientService.updatePatientStatus(patientId, 'scheduled');
        console.log('Patient status updated to scheduled');
        
        // Step 3: Update the local state with the new vitals
        setPatients(prevPatients => 
          prevPatients.map(p => 
            (p.id === patientId || p._id === patientId)
              ? { 
                  ...p, 
                  vitals: vitalsData, 
                  status: 'scheduled' 
                }
              : p
          )
        );
        
        // Step 4: Refresh all patients to ensure we have the latest data from server
        await fetchPatients();
        console.log('Patients refreshed after vitals update');
        
        // Show success message for incremental save
        const savedFields = Object.entries(vitalsData).filter(([key, value]) => 
          key !== 'timestamp' && value && value !== ''
        ).map(([key]) => key);
        
        toast({
          title: "Success",
          description: `Vitals saved successfully (${savedFields.join(', ')}). Dialog will close.`
        });
      } catch (apiError) {
        console.error('API error when saving vitals:', apiError);
        
        // Try to get more details about the error
        let errorMessage = "Failed to save vitals";
        if (apiError instanceof Error) {
          errorMessage = apiError.message;
        } else if (typeof apiError === 'object' && apiError !== null) {
          errorMessage = JSON.stringify(apiError);
        }
        
        toast({
          title: "API Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in handleSaveVitals:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save vitals",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      // Close the modal after successful save
      setIsVitalsModalOpen(false);
      setSelectedPatient(null);
      // Reset the vitals form
      resetVitalsForm();
    }
  };

  // Wound care handler
  const handleWoundCare = async (patientId: string) => {
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;
      
      setSelectedPatient(patient);
      setIsWoundCareModalOpen(true);
    } catch (err) {
      console.error('Error updating wound care:', err);
      toast({
        title: "Error",
        description: "Failed to update wound care",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive/20 text-destructive';
      case 'normal': return 'bg-primary/20 text-primary';
      case 'routine': return 'bg-primary/20 text-primary';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const statistics = [
    { label: 'Total Patients', value: totalPatients, icon: User },
    { label: 'Critical Care', value: criticalCare, icon: AlertTriangle },
    { label: 'Pending Medications', value: pendingMedicationsCount, icon: Pill },
    { label: 'Wound Care Due', value: woundCareDue, icon: Stethoscope },
  ];

  // Add search functionality
  useEffect(() => {
    if (patients.length > 0) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const filtered = patients.filter(patient => 
        (patient.firstName?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (patient.lastName?.toLowerCase() || '').includes(lowerSearchTerm) ||
        patient.id.toLowerCase().includes(lowerSearchTerm) ||
        (patient.contactNumber || '').includes(searchTerm) // Assuming direct number search
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);





  // Render patient search and filters
  const renderPatientSearch = () => {
    return (
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            className="pl-10 pr-4 py-2 w-full"
            placeholder="Search patients by name or contact number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => {
            fetchPatients();
            fetchNurseTasks();
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    );
  };

  // Render patients table
  const renderPatientsTable = () => {
    // Exclude patients that have already been sent/notified to doctor (scheduled/waiting)
    // or already have vitals recorded; those will appear under the Vitals Log tab.
    const baseList = (searchTerm ? filteredPatients : patients).filter((p: any) => {
      const hasAnyVitals = !!(p?.vitals && (p.vitals.temperature || p.vitals.heartRate || p.vitals.bloodPressure || p.vitals.respiratoryRate || p.vitals.oxygenSaturation));
      const forwardedToDoctor = p?.status === 'scheduled' || p?.status === 'waiting';
      return !hasAnyVitals && !forwardedToDoctor;
    });
    // Sort latest-first using available timestamps
    const patientsSorted = [...baseList].sort((a, b) => {
      const aTime = new Date(
        (a as any).updatedAt || (a as any).lastUpdated || (a as any).lastVisit || (a as any).createdAt || 0
      ).getTime();
      const bTime = new Date(
        (b as any).updatedAt || (b as any).lastUpdated || (b as any).lastVisit || (b as any).createdAt || 0
      ).getTime();
      return bTime - aTime;
    });

    const totalPages = Math.max(1, Math.ceil(patientsSorted.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const patientsToShow = patientsSorted.slice(startIndex, startIndex + pageSize);
    
    // Before rendering the table, log the patients array
    console.log("Nurse dashboard patients:", patientsToShow);
    
    return (
      <Card className="mb-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vital Signs</TableHead>
              <TableHead>Prescriptions</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patientsToShow.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  {isLoading ? 'Loading patients...' : 'No patients found'}
                </TableCell>
              </TableRow>
            ) : (
              patientsToShow.map(patient => (
                <TableRow key={patient.id || patient._id} className={hasAbnormalVitals(patient) ? 'bg-destructive/10' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground/50" />
                      {`${patient.firstName} ${patient.lastName}`}
                    </div>
                  </TableCell>
                  <TableCell>{patient.id || patient._id || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={patient.priority === 'urgent' || patient.priority === 'emergency' 
                        ? 'destructive' 
                        : patient.priority === 'normal' ? 'outline' : 'default'}
                    >
                      {patient.priority || 'normal'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {patient.vitals && (patient.vitals.temperature || patient.vitals.heartRate || patient.vitals.bloodPressure || patient.vitals.respiratoryRate || patient.vitals.oxygenSaturation) ? (
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-1">Last updated:</span>
                          <span className="text-xs">
                            {patient.vitals.timestamp ? new Date(patient.vitals.timestamp).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                        <div className="mt-1 text-sm grid grid-cols-2 gap-x-4">
                          {patient.vitals.temperature && (
                            <div className={`flex items-center ${checkVitalStatus('temperature', patient.vitals.temperature) !== 'normal' ? 'font-medium' : ''}`}>
                              <span className="text-xs text-muted-foreground mr-1">Temp:</span>
                              <span className={`${checkVitalStatus('temperature', patient.vitals.temperature) === 'critical' ? 'text-destructive' : 
                                checkVitalStatus('temperature', patient.vitals.temperature) === 'warning' ? 'text-accent-foreground' : ''}`}>
                                {String(patient.vitals.temperature)}{String(patient.vitals.temperature).includes('°') ? '' : '°C'}
                              </span>
                            </div>
                          )}
                          
                          {patient.vitals.bloodPressure && (
                            <div className={`flex items-center ${checkVitalStatus('bloodPressure', patient.vitals.bloodPressure) !== 'normal' ? 'font-medium' : ''}`}>
                              <span className="text-xs text-muted-foreground mr-1">BP:</span>
                              <span className={`${checkVitalStatus('bloodPressure', patient.vitals.bloodPressure) === 'critical' ? 'text-destructive' : 
                                checkVitalStatus('bloodPressure', patient.vitals.bloodPressure) === 'warning' ? 'text-accent-foreground' : ''}`}>
                                {patient.vitals.bloodPressure}
                              </span>
                            </div>
                          )}
                          
                          {patient.vitals.heartRate && (
                            <div className={`flex items-center ${checkVitalStatus('heartRate', patient.vitals.heartRate) !== 'normal' ? 'font-medium' : ''}`}>
                              <span className="text-xs text-muted-foreground mr-1">HR:</span>
                              <span className={`${checkVitalStatus('heartRate', patient.vitals.heartRate) === 'critical' ? 'text-destructive' : 
                                checkVitalStatus('heartRate', patient.vitals.heartRate) === 'warning' ? 'text-accent-foreground' : ''}`}>
                                {patient.vitals.heartRate}{patient.vitals.heartRate.includes('bpm') ? '' : ' bpm'}
                              </span>
                            </div>
                          )}
                          
                          {patient.vitals.respiratoryRate && (
                            <div className={`flex items-center ${checkVitalStatus('respiratoryRate', patient.vitals.respiratoryRate) !== 'normal' ? 'font-medium' : ''}`}>
                              <span className="text-xs text-muted-foreground mr-1">RR:</span>
                              <span className={`${checkVitalStatus('respiratoryRate', patient.vitals.respiratoryRate) === 'critical' ? 'text-destructive' : 
                                checkVitalStatus('respiratoryRate', patient.vitals.respiratoryRate) === 'warning' ? 'text-accent-foreground' : ''}`}>
                                {String(patient.vitals.respiratoryRate)}{String(patient.vitals.respiratoryRate).includes('rpm') || String(patient.vitals.respiratoryRate).includes('/min') ? '' : '/min'}
                              </span>
                            </div>
                          )}
                          
                          {patient.vitals.oxygenSaturation && (
                            <div className="flex items-center">
                              <span className="text-xs text-muted-foreground mr-1">O2:</span>
                              <span>{patient.vitals.oxygenSaturation}{patient.vitals.oxygenSaturation.includes('%') ? '' : '%'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-accent-foreground text-sm">Not recorded</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {prescriptionsLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm">Loading...</span>
                      </div>
                    ) : (patient.id || patient._id) && prescriptions[patient.id || patient._id] && prescriptions[patient.id || patient._id].length > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-medium mb-1">Active Medications:</span>
                        <div className="space-y-1">
                          {prescriptions[patient.id || patient._id].slice(0, 3).map((prescription, idx) => (
                            <div key={prescription._id || idx} className="text-xs flex items-center">
                              <Pill className="h-3 w-3 mr-1 text-primary" />
                              <span>{(prescription.medications?.[0] as any)?.medicationName || 'Unknown'} - {(prescription.medications?.[0] as any)?.dosage || 'Unknown'}</span>
                            </div>
                          ))}
                          {prescriptions[patient.id || patient._id].length > 3 && (
                            <div className="text-xs text-primary">
                              +{prescriptions[patient.id || patient._id].length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No prescriptions</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        // title="Record Vitals" 
                        onClick={() => {
                          const patientId = patient.id || patient._id;
                          if (!patientId) {
                            toast({
                              title: "Error",
                              description: "Patient ID is missing. Please refresh the page and try again.",
                              variant: "destructive"
                            });
                            return;
                          }
                          handleUpdateVitals(patientId);
                        }}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        // title="Refer to Doctor" 
                        onClick={() => handleSendToDoctor(patient)}
                      >
                        <Stethoscope className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {/* Pagination controls */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-muted-foreground">
            Page {safePage} of {totalPages}
          </div>
          <div className="flex gap-2">
            {safePage > 1 && (
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                Previous
              </Button>
            )}
            {safePage < totalPages && (
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // Add the function to send a patient to the doctor
  const handleSendToDoctor = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsReferToDocModalOpen(true);
    setReferralReason('');
    setReferralPriority(patient.priority || 'normal');
  };

  // Add the function to submit the referral
  const submitDoctorReferral = async () => {
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "No patient selected",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReferral(true);
    
    try {
      // First, make sure the patient is properly assigned to the doctor in the backend
      if (!selectedPatient.assignedDoctorId) {
        toast({
          title: "Error",
          description: "Patient does not have an assigned doctor",
          variant: "destructive",
        });
        setIsSubmittingReferral(false);
        return;
      }

      console.log(`[NurseDashboard] Sending patient ${selectedPatient.id} to doctor ${selectedPatient.assignedDoctorId}`);
      
      // First update patient status to 'scheduled' or 'waiting'
      const updatedPatient = await patientService.updatePatientStatus(selectedPatient.id, 'scheduled');
      console.log(`[NurseDashboard] Updated patient status:`, updatedPatient);
      
      // Update local state to reflect the change
      if (updatedPatient) {
        setPatients(prev => 
          prev.map(p => p.id === updatedPatient.id ? updatedPatient : p)
        );
        
        if (selectedPatient.id === updatedPatient.id) {
          setSelectedPatient(updatedPatient);
        }
      }

      // Send a notification to the doctor
      const response = await patientService.notifyDoctor(selectedPatient.id, {
        type: 'PATIENT_READY',
        message: referralReason || `Patient ${selectedPatient.firstName} ${selectedPatient.lastName} needs attention`,
        data: {
          title: 'Patient Referral',
          patientId: selectedPatient.id,
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          priority: referralPriority,
          reason: referralReason,
          vitals: selectedPatient.vitals
        }
      });

      console.log('[NurseDashboard] Doctor notification response:', response);
      
      toast({
        title: "Success",
        description: `Patient ${selectedPatient.firstName} ${selectedPatient.lastName} has been referred to the doctor`,
      });
    } catch (error) {
      console.error('[NurseDashboard] Error referring patient to doctor:', error);
      toast({
        title: "Error",
        description: "Failed to refer patient to doctor. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Always reset state and close modal regardless of success or failure
      setIsSubmittingReferral(false);
      setIsReferToDocModalOpen(false);
      setReferralReason('');
      setSelectedPatient(null);
    }
  };

  // Fix the WebSocket connection issue
  const setupWebSocket = async () => {
    if (!user || !user.id) {
      console.error('Cannot set up WebSocket: No user ID available');
      return;
    }

    try {
      // Initialize WebSocket connection
      console.log('Setting up WebSocket connection for nurse dashboard...');
      const ws = await notificationService.connectWebSocket(
        user.id,
        'nurse',
        (notification) => {
          console.log('Received notification in nurse dashboard:', notification);
          
          // Add notification to state
          setNotifications(prev => {
            // Check if notification already exists to avoid duplicates
            const exists = prev.some(n => n.id === notification.id);
            if (exists) return prev;
            return [notification, ...prev];
          });
          
          // Update dashboard stats
          // setDashboardStats(prev => ({
          //   ...prev,
          //   alertsCount: prev.alertsCount + 1
          // }));
          
          // Handle specific notification types
          if (notification.type === 'medication_administration') {
            // Show toast notification for medication administration
            toast({
              title: "Medication Administration",
              description: notification.message || "New medication needs to be administered",
              variant: "default",
              action: (
                <Button variant="outline" size="sm" onClick={() => {
                  // Refresh the patients list to include this patient
                  fetchPatients();
                }}>
                  View
                </Button>
              ),
            });
            
            // Refresh data
            fetchPatients();
            fetchNurseTasks();
          } else if (notification.type === 'vitals_required') {
            // Show toast for vitals required
            toast({
              title: "Vitals Required",
              description: notification.message || "Patient needs vitals recorded",
              variant: "default",
            });
            
            // Refresh data
            fetchPatients();
            fetchNurseTasks();
          } else {
            // Show generic toast for other notifications
            toast({
              title: notification.title || 'New Notification',
              description: notification.message || 'You have a new update.',
              variant: notification.priority === 'high' ? 'destructive' : 'default', 
            });
          }
        }
      );

      setWsConnection(ws as any);

      return () => {
        console.log('Cleaning up WebSocket connection');
        notificationService.disconnect();
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      toast({
        title: "Connection Error",
        description: "Could not connect to notification service. You may miss real-time updates.",
        variant: "destructive",
      });
    }
  };

  return (
    <ToastProvider>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Nurse Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Nurse'}</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="default"
              className="flex items-center gap-2"
              onClick={() => window.location.href = '/app/nurse/tasks'}
            >
              <ClipboardList className="h-4 w-4" />
              Manage Tasks
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                fetchPatients();
                fetchNurseTasks();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Automatic Attendance Status removed as requested */}



        <Tabs value={activeTab} className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Patients
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="vitals" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Vitals Log
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="patients">
            {renderPatientSearch()}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {renderPatientsTable()}
          </TabsContent>

          <TabsContent value="tasks">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Tasks Overview</h3>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/app/nurse/tasks'}
                className="flex items-center gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                View All Tasks
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="p-4">
                <h4 className="font-medium mb-2">Pending Tasks</h4>
                {tasks.filter(task => task.status === 'pending').length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending tasks</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.filter(task => task.status === 'pending').slice(0, 3).map(task => (
                      <div key={task.id} className="flex justify-between items-center p-2 bg-muted/10 rounded">
                        <div>
                          <p className="text-sm font-medium">{task.description}</p>
                          <p className="text-xs text-muted-foreground">Patient: {task.patientName}</p>
                          <div className="flex items-center mt-1">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <span className="ml-2 text-xs text-muted-foreground">Due: {new Date(task.dueTime).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(task => task.status === 'pending').length > 3 && (
                      <Button 
                        variant="link" 
                        className="text-xs"
                        onClick={() => window.location.href = '/app/nurse/tasks'}
                      >
                        View all {tasks.filter(task => task.status === 'pending').length} pending tasks
                      </Button>
                    )}
                  </div>
                )}
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Recent Completed Tasks</h4>
                {tasks.filter(task => task.status === 'completed').length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed tasks</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.filter(task => task.status === 'completed').slice(0, 3).map(task => (
                      <div key={task.id} className="flex justify-between items-center p-2 bg-muted/10 rounded">
                        <div>
                          <p className="text-sm font-medium">{task.description}</p>
                          <p className="text-xs text-muted-foreground">Patient: {task.patientName}</p>
                          <div className="flex items-center mt-1">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              Completed
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(task => task.status === 'completed').length > 3 && (
                      <Button 
                        variant="link" 
                        className="text-xs"
                        onClick={() => window.location.href = '/app/nurse/tasks'}
                      >
                        View all completed tasks
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="vitals">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Vitals History Log</h3>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Temperature</TableHead>
                      <TableHead>Blood Pressure</TableHead>
                      <TableHead>Heart Rate</TableHead>
                      <TableHead>Respiratory Rate</TableHead>
                      <TableHead>Recorded At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Helper function to check if a value is meaningful (not empty/null/undefined)
                      const hasValue = (val: any): boolean => {
                        if (val === null || val === undefined) return false;
                        if (typeof val === 'string') return val.trim() !== '';
                        return true;
                      };
                      
                      // Filter patients that have actual vital sign data
                      const patientsWithVitals = patients.filter((p: any) => {
                        if (!p?.vitals) return false;
                        
                        // Check if any vital sign has a meaningful value
                        const hasAnyVital = hasValue(p.vitals.temperature) || 
                                          hasValue(p.vitals.heartRate) || 
                                          hasValue(p.vitals.bloodPressure) || 
                                          hasValue(p.vitals.respiratoryRate) || 
                                          hasValue(p.vitals.oxygenSaturation) ||
                                          hasValue(p.vitals.bloodSugar) ||
                                          hasValue(p.vitals.pain) ||
                                          hasValue(p.vitals.height) ||
                                          hasValue(p.vitals.weight);
                        
                        return hasAnyVital;
                      }).sort((a: any, b: any) => {
                        // Sort by timestamp, most recent first
                        const aTime = a?.vitals?.timestamp ? new Date(a.vitals.timestamp).getTime() : 0;
                        const bTime = b?.vitals?.timestamp ? new Date(b.vitals.timestamp).getTime() : 0;
                        return bTime - aTime;
                      });
                      
                      // Debug logging
                      console.log('Vitals Log - Total patients:', patients.length);
                      console.log('Vitals Log - Patients with vitals:', patientsWithVitals.length);
                      if (patients.length > 0) {
                        console.log('Vitals Log - Sample patient vitals:', patients[0]?.vitals);
                        console.log('Vitals Log - All patients vitals check:', patients.map((p: any) => ({
                          name: `${p.firstName} ${p.lastName}`,
                          hasVitals: !!p?.vitals,
                          vitals: p?.vitals
                        })));
                      }
                      
                      return patientsWithVitals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            No vitals records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        patientsWithVitals.map(patient => (
                        <TableRow key={`vitals-${patient.id}`} className="hover:bg-muted/10">
                          <TableCell className="font-medium">{`${patient.firstName} ${patient.lastName}`}</TableCell>
                          <TableCell>
                            <span className={`${
                              checkVitalStatus('temperature', patient.vitals?.temperature || '') === 'critical' ? 'text-destructive font-bold' : 
                              checkVitalStatus('temperature', patient.vitals?.temperature || '') === 'warning' ? 'text-accent-foreground' : ''
                            }`}>
                              {patient.vitals?.temperature || '-'} °C
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`${
                              checkVitalStatus('bloodPressure', patient.vitals?.bloodPressure || '') === 'critical' ? 'text-destructive font-bold' : 
                              checkVitalStatus('bloodPressure', patient.vitals?.bloodPressure || '') === 'warning' ? 'text-accent-foreground' : ''
                            }`}>
                              {patient.vitals?.bloodPressure || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`${
                              checkVitalStatus('heartRate', patient.vitals?.heartRate || '') === 'critical' ? 'text-destructive font-bold' : 
                              checkVitalStatus('heartRate', patient.vitals?.heartRate || '') === 'warning' ? 'text-accent-foreground' : ''
                            }`}>
                              {patient.vitals?.heartRate || '-'} bpm
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`${
                              checkVitalStatus('respiratoryRate', patient.vitals?.respiratoryRate || '') === 'critical' ? 'text-destructive font-bold' : 
                              checkVitalStatus('respiratoryRate', patient.vitals?.respiratoryRate || '') === 'warning' ? 'text-accent-foreground' : ''
                            }`}>
                              {String(patient.vitals.respiratoryRate)}{String(patient.vitals.respiratoryRate).includes('rpm') || String(patient.vitals.respiratoryRate).includes('/min') ? '' : '/min'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {patient.vitals?.timestamp ? 
                              new Date(patient.vitals.timestamp).toLocaleString() : 
                              '-'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              hasAbnormalVitals(patient) ? 'destructive' : 'default'
                            }>
                              {hasAbnormalVitals(patient) ? 'Abnormal' : 'Normal'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                      );
                    })()}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* WHO standard vitals dialog */}
        <Dialog open={isVitalsModalOpen} onOpenChange={(open) => {
          setIsVitalsModalOpen(open);
          if (!open) {
            // Reset form when dialog is closed
            setSelectedPatient(null);
            setIsSubmitting(false);
            resetVitalsForm();
          }
        }}>
                      <DialogContent className="bg-primary-foreground border-2 border-primary/20 shadow-xl max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="bg-primary/10 -mx-6 px-6 py-1 rounded-t-lg border-b border-primary/30">
              <DialogTitle className="flex items-center gap-2 text-primary text-sm">
                <Activity className="h-4 w-4 text-primary" />
                Record Vital Signs - {selectedPatient?.firstName} {selectedPatient?.lastName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-3 my-2">
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="temperature" className="text-xs font-medium text-primary">
                  Temperature (°C) <span className="text-xs text-muted-foreground">(36.5-37.5°C)</span>
                </label>
                <Input
                  id="temperature"
                  type="text"
                  value={vitalsForm.temperature}
                  onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                  className={`h-8 text-sm fade-placeholder ${checkVitalStatus('temperature', vitalsForm.temperature) === 'critical' ? 'border-destructive border-2' : 
                    checkVitalStatus('temperature', vitalsForm.temperature) === 'warning' ? 'border-amber-500 border-2' : 'border-primary/30'}`}
                  placeholder="e.g. 37.0"
                />
              </div>
              
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="bloodPressure" className="text-xs font-medium text-primary">
                  Blood Pressure <span className="text-xs text-muted-foreground">(120/80 ±20/10)</span>
                  {selectedPatient && selectedPatient.age < 12 && (
                    <span className="text-xs text-primary ml-1">(Optional for children)</span>
                  )}
                </label>
                <Input
                  id="bloodPressure"
                  type="text"
                  value={vitalsForm.bloodPressure}
                  onChange={(e) => handleVitalsChange('bloodPressure', e.target.value)}
                  className={`h-8 text-sm fade-placeholder ${checkVitalStatus('bloodPressure', vitalsForm.bloodPressure) === 'critical' ? 'border-destructive border-2' : 
                    checkVitalStatus('bloodPressure', vitalsForm.bloodPressure) === 'warning' ? 'border-amber-500 border-2' : 'border-primary/30'}`}
                  placeholder="e.g. 120/80"
                />
              </div>
              
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="heartRate" className="text-xs font-medium text-primary">
                  Heart Rate <span className="text-xs text-muted-foreground">(60-100 bpm)</span>
                </label>
                <Input
                  id="heartRate"
                  type="text"
                  value={vitalsForm.heartRate}
                  onChange={(e) => handleVitalsChange('heartRate', e.target.value)}
                  className={`h-8 text-sm fade-placeholder ${checkVitalStatus('heartRate', vitalsForm.heartRate) === 'critical' ? 'border-destructive border-2' : 
                    checkVitalStatus('heartRate', vitalsForm.heartRate) === 'warning' ? 'border-amber-500 border-2' : 'border-primary/30'}`}
                  placeholder="e.g. 75"
                />
              </div>
              
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="respiratoryRate" className="text-xs font-medium text-primary">
                  Respiratory Rate <span className="text-xs text-muted-foreground">(12-20/min)</span>
                </label>
                <Input
                  id="respiratoryRate"
                  type="text"
                  value={vitalsForm.respiratoryRate}
                  onChange={(e) => handleVitalsChange('respiratoryRate', e.target.value)}
                  className={`h-8 text-sm fade-placeholder ${checkVitalStatus('respiratoryRate', vitalsForm.respiratoryRate) === 'critical' ? 'border-destructive border-2' : 
                    checkVitalStatus('respiratoryRate', vitalsForm.respiratoryRate) === 'warning' ? 'border-amber-500 border-2' : ''}`}
                  placeholder="e.g. 16"
                />
              </div>
              
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="oxygenSaturation" className="text-xs font-medium text-primary">
                  O2 Saturation <span className="text-xs text-muted-foreground">(≥95%)</span>
                </label>
                <Input
                  id="oxygenSaturation"
                  type="text"
                  value={vitalsForm.oxygenSaturation}
                  onChange={(e) => handleVitalsChange('oxygenSaturation', e.target.value)}
                  className={`h-8 text-sm fade-placeholder ${checkVitalStatus('oxygenSaturation', vitalsForm.oxygenSaturation || '') === 'critical' ? 'border-destructive border-2' : 
                    checkVitalStatus('oxygenSaturation', vitalsForm.oxygenSaturation || '') === 'warning' ? 'border-amber-500 border-2' : 'border-primary/30'}`}
                  placeholder="e.g. 98"
                />
              </div>
              
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="bloodSugar" className="text-xs font-medium text-primary">
                  Blood Glucose <span className="text-xs text-muted-foreground">(70-140 mg/dL)</span>
                  <span className="text-xs text-primary ml-1">(Optional)</span>
                </label>
                <Input
                  id="bloodSugar"
                  type="text"
                  value={vitalsForm.bloodSugar}
                  onChange={(e) => handleVitalsChange('bloodSugar', e.target.value)}
                  className={`h-8 text-sm fade-placeholder ${checkVitalStatus('bloodSugar', vitalsForm.bloodSugar || '') === 'critical' ? 'border-destructive border-2' : 
                    checkVitalStatus('bloodSugar', vitalsForm.bloodSugar || '') === 'warning' ? 'border-amber-500 border-2' : ''}`}
                  placeholder="e.g. 100"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-3 my-2">
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="pain" className="text-xs font-medium text-primary">
                  Pain Level <span className="text-xs text-muted-foreground">(0-10)</span>
                  {selectedPatient && selectedPatient.age < 5 && (
                    <span className="text-xs text-primary ml-1">(Optional for young children)</span>
                  )}
                </label>
                <Input
                  id="pain"
                  type="text"
                  value={vitalsForm.pain}
                  onChange={(e) => handleVitalsChange('pain', e.target.value)}
                  className={`h-8 text-sm fade-placeholder ${parseInt(vitalsForm.pain || '0') > 7 ? 'border-destructive border-2' : 
                    parseInt(vitalsForm.pain || '0') > 4 ? 'border-amber-500 border-2' : ''}`}
                  placeholder="e.g. 0"
                />
              </div>
              
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="weight" className="text-xs font-medium text-primary">
                  Weight (kg) <span className="text-xs text-muted-foreground">(0.1-500 kg)</span>
                </label>
                <Input
                  id="weight"
                  type="text"
                  value={vitalsForm.weight}
                  onChange={(e) => {
                    handleVitalsChange('weight', e.target.value);
                    if (e.target.value && vitalsForm.height) {
                      calculateBMI(vitalsForm.height, e.target.value);
                    }
                  }}
                  className="h-8 text-sm fade-placeholder"
                  placeholder="e.g. 70"
                />
              </div>
              
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="height" className="text-xs font-medium text-primary">
                  Height (cm) <span className="text-xs text-muted-foreground">(30-250 cm)</span>
                </label>
                <Input
                  id="height"
                  type="text"
                  value={vitalsForm.height}
                  onChange={(e) => {
                    handleVitalsChange('height', e.target.value);
                    if (e.target.value && vitalsForm.weight) {
                      calculateBMI(e.target.value, vitalsForm.weight);
                    }
                  }}
                  className="h-8 text-sm fade-placeholder"
                  placeholder="e.g. 170"
                />
              </div>
              
              <div className="space-y-1 bg-primary/10 p-2 rounded-md">
                <label htmlFor="bmi" className="text-xs font-medium text-primary">
                  BMI
                </label>
                <div className="flex items-center gap-2">
                <Input
                  id="bmi"
                  type="text"
                    value={vitalsForm.bmi && typeof vitalsForm.bmi === 'string' ? vitalsForm.bmi.split(' ')[0] : ''}
                  readOnly
                    className="h-8 text-sm bg-primary/20 border-primary/30 flex-1"
                  placeholder="Auto-calculated"
                />
                  {vitalsForm.bmi && typeof vitalsForm.bmi === 'string' && vitalsForm.bmi.includes('(') && (
                    <div className="flex-shrink-0">
                      {(() => {
                        const bmiMatch = vitalsForm.bmi && typeof vitalsForm.bmi === 'string' ? vitalsForm.bmi.match(/(\d+\.?\d*)/) : null;
                        if (bmiMatch) {
                          const bmiNum = parseFloat(bmiMatch[1]);
                          const classification = getBMIClassification(bmiNum);
                          return (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${classification.bgColor} ${classification.color} whitespace-nowrap`}>
                              {classification.category}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

              </div>
            </div>
            
            <div className="mt-2">
              <h4 className="text-xs font-medium mb-1">Vitals Summary</h4>
              <div className="bg-muted/10 p-2 rounded border">
                <div className="grid grid-cols-6 gap-2">
                  {['temperature', 'heartRate', 'bloodPressure', 'respiratoryRate', 'oxygenSaturation', 'bmi'].map(vitalType => (
                    <div key={vitalType} className="text-center">
                      <div className={`inline-block rounded-full w-12 h-12 flex items-center justify-center ${
                        vitalType === 'bmi' ? 
                          (() => {
                            const bmiMatch = vitalsForm.bmi && typeof vitalsForm.bmi === 'string' ? vitalsForm.bmi.match(/(\d+\.?\d*)/) : null;
                            if (bmiMatch) {
                              const bmiNum = parseFloat(bmiMatch[1]);
                              const classification = getBMIClassification(bmiNum);
                              return `${classification.bgColor} ${classification.color}`;
                            }
                            return 'bg-muted/20 text-muted-foreground';
                          })() :
                        checkVitalStatus(vitalType, vitalsForm[vitalType as keyof VitalsFormData] || '') === 'critical' ? 'bg-destructive/20 text-destructive' : 
                        checkVitalStatus(vitalType, vitalsForm[vitalType as keyof VitalsFormData] || '') === 'warning' ? 'bg-accent/20 text-accent-foreground' : 
                        'bg-primary/20 text-primary'
                      }`}>
                        {vitalType === 'temperature' && <span className="text-sm font-bold">{vitalsForm.temperature || '-'}</span>}
                        {vitalType === 'heartRate' && <span className="text-sm font-bold">{vitalsForm.heartRate || '-'}</span>}
                        {vitalType === 'bloodPressure' && (
                          <span className="text-xs font-bold">{vitalsForm.bloodPressure || '-'}</span>
                        )}
                        {vitalType === 'respiratoryRate' && (
                          <span className="text-sm font-bold">{vitalsForm.respiratoryRate || '-'}</span>
                        )}
                        {vitalType === 'oxygenSaturation' && (
                          <span className="text-sm font-bold">{vitalsForm.oxygenSaturation || '-'}</span>
                        )}
                        {vitalType === 'bmi' && (
                          <span className="text-xs font-bold">
                            {vitalsForm.bmi && typeof vitalsForm.bmi === 'string' ? vitalsForm.bmi.split(' ')[0] : '-'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1 capitalize">{vitalType.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-3 flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => {
                setIsVitalsModalOpen(false);
                setSelectedPatient(null);
                setIsSubmitting(false);
                // Reset the vitals form
                resetVitalsForm();
              }}>
                Cancel
              </Button>
              <Button 
                type="button"
                variant="default"
                size="sm"
                onClick={handleSaveVitals}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Progress'}
              </Button>
              <Button 
                type="button"
                variant="destructive"
                size="sm"
                onClick={async () => {
                  console.log('Save & Notify Doctor clicked. Patient assignedDoctorId:', selectedPatient?.assignedDoctorId);
                  if (!selectedPatient) {
                    toast({
                      title: "Error",
                      description: "No patient selected",
                      variant: "destructive"
                    });
                    return;
                  }

                  // For "Save & Notify Doctor", require more complete vitals
                  // Blood pressure is optional for patients under 12 years old
                  const isChild = selectedPatient && selectedPatient.age < 12;
                  const requiredFields = isChild 
                    ? ['temperature', 'heartRate'] 
                    : ['temperature', 'heartRate', 'bloodPressure'];
                  const missingRequired = requiredFields.filter(field => 
                    !vitalsForm[field as keyof VitalsFormData] || 
                    (typeof vitalsForm[field as keyof VitalsFormData] === 'string' && vitalsForm[field as keyof VitalsFormData].trim() === '')
                  );
                  
                  if (missingRequired.length > 0) {
                    toast({
                      title: "Incomplete Vitals",
                      description: `Please complete the required vitals before notifying doctor: ${missingRequired.join(', ')}`,
                      variant: "destructive"
                    });
                    return;
                  }

                  const errors = validateVitals(vitalsForm);
                  const relevantErrors = Object.entries(errors).filter(([key, value]) => 
                    vitalsForm[key as keyof VitalsFormData] && (typeof vitalsForm[key as keyof VitalsFormData] === 'string' && vitalsForm[key as keyof VitalsFormData].trim() !== '')
                  );
                  
                  if (relevantErrors.length > 0) {
                    relevantErrors.forEach(([key, error]) => 
                      toast({
                        title: "Validation Error",
                        description: error,
                        variant: "destructive"
                      })
                    );
                    return;
                  }

                  setIsSubmitting(true);
                  try {
                    // Create vitals object
                    const vitalsData = {
                      temperature: vitalsForm.temperature,
                      bloodPressure: vitalsForm.bloodPressure,
                      heartRate: vitalsForm.heartRate,
                      respiratoryRate: vitalsForm.respiratoryRate || '',
                      bloodSugar: vitalsForm.bloodSugar || '',
                      oxygenSaturation: vitalsForm.oxygenSaturation || '',
                      pain: vitalsForm.pain || '',
                      height: vitalsForm.height || '',
                      weight: vitalsForm.weight || '',
                      bmi: getCleanBMIValue(vitalsForm.bmi || ''),
                      timestamp: new Date().toISOString()
                    };
                    
                    // Update the vitals - this will also update status to 'scheduled'
                    const updatedPatient = await patientService.updateVitals(selectedPatient.id, vitalsData);
                    
                    // Also directly update the patient status again to ensure it's saved
                    await patientService.updatePatientStatus(selectedPatient.id, 'scheduled');
                    
                    // Then immediately notify the doctor
                    await patientService.notifyDoctor(selectedPatient.id, {
                      type: 'PATIENT_VITALS',
                      message: `Nurse ${user?.firstName} ${user?.lastName} has recorded new vitals for patient ${selectedPatient.firstName} ${selectedPatient.lastName} and requested your review.`,
                      data: {
                        title: 'Vitals Review Requested',
                        patientId: selectedPatient.id,
                        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
                        priority: 'high',
                        vitals: vitalsData,
                        requestedBy: user?.id
                      }
                    });
                    
                    // Update UI with the new data
                    setPatients(prevPatients => 
                      prevPatients.map(p => 
                        p.id === selectedPatient.id 
                          ? { 
                              ...p, 
                              vitals: vitalsData, 
                              status: 'scheduled' 
                            }
                          : p
                      )
                    );
                    
                    // Force reload all patients to ensure we have the freshest data
                    await fetchPatients();
                    
                    // Small delay to ensure state is updated before switching tabs
                    setTimeout(() => {
                      // Switch to Vitals Log tab so the nurse can confirm the record
                      setActiveTab('vitals');
                    }, 100);
                    
                    // Show success message
                    toast({
                      title: "Success",
                      description: "Vitals updated and doctor notified successfully. View in Vitals Log tab."
                    });
                  } catch (error) {
                    console.error('Error saving vitals and notifying doctor:', error);
                    toast({
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to save vitals and notify doctor",
                      variant: "destructive"
                    });
                  } finally {
                    // For "Save & Notify Doctor", close modal and reset state
                    setIsSubmitting(false);
                    setIsVitalsModalOpen(false);
                    setSelectedPatient(null);
                    // Reset the vitals form
                    resetVitalsForm();
                  }
                }}
                disabled={isSubmitting || !selectedPatient?.assignedDoctorId}
                // title={!selectedPatient?.assignedDoctorId ? 'Patient must have an assigned doctor' : ''}
              >
                {isSubmitting ? 'Processing...' : 'Save & Notify Doctor'}
                {!selectedPatient?.assignedDoctorId && (
                  <span className="ml-1 text-xs">(No Doctor)</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Refer to Doctor Dialog */}
        <Dialog open={isReferToDocModalOpen} onOpenChange={setIsReferToDocModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Refer Patient to Doctor</DialogTitle>
              <DialogDescription>
                Send {selectedPatient?.firstName} {selectedPatient?.lastName} to their assigned doctor for review.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="referralReason">Reason for Referral</Label>
                <Textarea
                  id="referralReason"
                  placeholder="Enter reason for referral (symptoms, concerns, etc.)"
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="referralPriority">Priority</Label>
                <Select value={referralPriority} onValueChange={setReferralPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedPatient?.assignedDoctorId ? (
                <div className="text-sm text-primary flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Patient is assigned to a doctor</span>
                </div>
              ) : (
                <div className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>No doctor assigned to this patient</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsReferToDocModalOpen(false);
                setReferralReason('');
                setSelectedPatient(null);
                setIsSubmittingReferral(false);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={submitDoctorReferral} 
                disabled={isSubmittingReferral || !selectedPatient?.assignedDoctorId}
                className="gap-1"
              >
                {isSubmittingReferral && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmittingReferral ? 'Sending...' : 'Send to Doctor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Commented out Medication Modal */}
        {/* 
        <Dialog open={isMedicationModalOpen} onOpenChange={setIsMedicationModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Administer Medication - {selectedPatient?.firstName} {selectedPatient?.lastName}</DialogTitle>
            </DialogHeader>
            <div>
              <h4 className="font-medium mb-2">Pending Medications:</h4>
              {selectedPatient?.medications && selectedPatient.medications.length > 0 ? (
                <ul className="space-y-2">
                  {selectedPatient.medications.map((med) => (
                    <li key={med.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p>{med?.name} ({med?.dosage})</p>
                        <p className="text-xs text-muted-foreground">Due: {med?.nextDue ? new Date(med.nextDue).toLocaleTimeString() : 'N/A'}</p>
                      </div>
                      <Button size="sm" onClick={() => handleMedicationAdmin(med)} disabled={isSubmitting}>
                        Administer
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No pending medications.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMedicationModalOpen(false)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        */}

      <ToastViewport />
      </div>
    </ToastProvider>
  );
};

export default NurseDashboard; 