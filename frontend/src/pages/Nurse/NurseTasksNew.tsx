import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import nurseTaskService from '../../services/nurseTaskService';
import medicationAdministrationService from '../../services/medicationAdministrationService';
import vitalSignsService from '../../services/vitalSignsService';
import { getPatientById } from '../../services/patientService';
import { api } from '../../services/api';
import { toast } from 'react-toastify';
import { format, addDays, isToday, isTomorrow, isYesterday } from 'date-fns';
// import '../../styles/NurseTasksNew.css'; // Removed to avoid conflicts with shadcn
import VitalSignsForm from '../../components/nurse/VitalSignsForm';
import { 
  canAdministerDoseSequentially, 
  getDoseButtonClass,
  getOrdinalSuffix,
  isTaskFullyCompleted 
} from './SequentialDosingLogic';
import { 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Clock, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square, 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Activity,
  Pill,
  Heart,
  Thermometer,
  Stethoscope,
  Search,
  Filter,
  Plus,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  DollarSign,
  Trash2
} from 'lucide-react';

// Enhanced interfaces for better type safety
interface MedicationDetails {
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string | undefined;
  instructions: string;
  duration: number;
  startDate: Date | string;
  doseRecords?: DoseRecord[];
  doseSchedule?: DoseSchedule[];
  instanceLabel?: string;
  isExtension?: boolean;
  totalDoses?: number;
  originalDoses?: number;
  extendedDoses?: number;
  extensionDetails?: boolean;
  prescriptionId?: string;
}

interface DoseRecord {
  day: number;
  timeSlot: string;
  administered: boolean;
  administeredAt?: Date | string;
  administeredBy?: string;
  notes?: string;
  missed?: boolean;
  overdue?: boolean;
  inventoryDeducted?: boolean;
  inventoryDetails?: any;
}

interface DoseSchedule {
  day: number;
  date: Date;
  timeSlots: TimeSlot[];
}

interface TimeSlot {
  time: string;
  label: string;
  administered: boolean;
  administeredAt?: Date | string;
  administeredBy?: string;
  notes?: string;
  missed: boolean;
  overdue: boolean;
}

interface PaymentAuthorization {
  paidDays: number;
  totalDays: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'fully_paid';
  canAdminister: boolean;
  restrictionMessage?: string;
  authorizedDoses: number;
  unauthorizedDoses: number;
  outstandingAmount: number;
  lastUpdated?: Date | string;
}

interface NurseTask {
  _id?: string;
  id?: string;
  patientId: string;
  patientName: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  taskType: 'MEDICATION' | 'VITAL_SIGNS' | 'ASSESSMENT' | 'PROCEDURE' | 'OTHER';
  dueDate: string;
  notes?: string;
  medicationDetails?: MedicationDetails;
  paymentAuthorization?: PaymentAuthorization;
  assignedByName?: string;
  createdAt?: string;
  updatedAt?: string;
  completedDate?: string;
  serviceName?: string;
}

interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  gender: string;
  roomNumber?: string;
  diagnosis?: string;
  allergies?: string[];
  contactNumber?: string;
}

interface TaskGroup {
  patientId: string;
  patientInfo: PatientInfo;
  tasks: NurseTask[];
  expanded: boolean;
}

// REMOVED: Local storage utilities that were causing state conflicts between morning and evening doses

// Helper to standardize timeSlot to 'HH:mm' (matches backend) and support label-based slots
const standardizeTimeSlot = (timeSlot: string) => {
  if (!timeSlot) return timeSlot as unknown as string;
  const raw = String(timeSlot).trim();
  const lower = raw.toLowerCase();
  const labelToTime: Record<string, string> = {
    morning: '09:00',
    noon: '12:00',
    afternoon: '16:00',
    evening: '18:00',
    night: '21:00',
    midnight: '00:00'
  };
  if (labelToTime[lower]) return labelToTime[lower];
  if (lower.includes('morning')) return '09:00';
  if (lower.includes('afternoon')) return '16:00';
  if (lower.includes('evening')) return '18:00';
  if (lower.includes('noon')) return '12:00';
  if (lower.includes('night')) return '21:00';
  const match = lower.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    return `${hours}:${minutes}`;
  }
  return raw;
};


const NurseTasksNew: React.FC = () => {
  const { user, getToken, isLoading: authLoading } = useAuth();
  
  // State management
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedTaskType, setSelectedTaskType] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(true);
  
  // Modal states
  const [selectedTask, setSelectedTask] = useState<NurseTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showVitalSignsModal, setShowVitalSignsModal] = useState(false);
  const [selectedVitalSignsTask, setSelectedVitalSignsTask] = useState<NurseTask | null>(null);
  const [selectedMedicationTask, setSelectedMedicationTask] = useState<NurseTask | null>(null);
  const [administrationNotes, setAdministrationNotes] = useState('');
  // Prevent duplicate submissions
  const [processingDose, setProcessingDose] = useState(false);
  const processingDoseRef = useRef(false);
  
  // Track processed doses to prevent UI conflicts
  const [processedDoses, setProcessedDoses] = useState<Set<string>>(new Set());
  
  // Medication administration state
  const [selectedDose, setSelectedDose] = useState<{
    taskId: string;
    day: number;
    timeSlot: string;
    medicationName: string;
  } | null>(null);

  // Track the most recently clicked doseKey to disable instantly
  const [justClickedDoseKey, setJustClickedDoseKey] = useState<string | null>(null);

  // Handle medication deletion
  const handleDeleteMedication = async (taskId: string, medicationName: string) => {
    if (window.confirm(`Are you sure you want to delete this medication: ${medicationName}?`)) {
      try {
        // Call the medication administration service to delete the medication
        await medicationAdministrationService.deleteMedication(taskId);
        toast.success(`✅ Medication "${medicationName}" deleted successfully`);
        
        // Refresh the tasks to update the list
        fetchTasks();
      } catch (error: any) {
        console.error('Error deleting medication:', error);
        toast.error(`❌ Failed to delete medication: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Payment status tracking for automatic updates
  const [lastPaymentUpdate, setLastPaymentUpdate] = useState<Date>(new Date());
  // Map recent medication payment notifications by patient to surface amounts in headers
  const [paymentInfoByPatient, setPaymentInfoByPatient] = useState<Record<string, { amountPaid?: number; outstandingAmount?: number; paymentStatus?: string }>>({});
  const [paymentInfoByPatientMed, setPaymentInfoByPatientMed] = useState<Record<string, { amountPaid?: number; outstandingAmount?: number; paymentStatus?: string }>>({});
  const [paymentStatusChanged, setPaymentStatusChanged] = useState(false);

  // Cache busting for fresh data
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());

  // Force refresh function
  const forceRefresh = () => {
    console.log('🔄 Force refreshing nurse tasks...');
    setCacheBuster(Date.now());
    // Clear localStorage cache
    try {
      localStorage.removeItem('medicationTasks');
      console.log('✅ Cleared localStorage cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
    fetchTasks();
  };

  // Auto-refresh on mount and when cache buster changes
  useEffect(() => {
    console.log('🔄 Auto-refreshing nurse tasks on mount...');
    forceRefresh();
  }, []); // Only run on mount

  // Utility functions
  const getTaskId = (task: NurseTask): string => task._id || task.id || '';

  const formatRelativeDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string for formatting:', dateString);
        return 'Invalid Date';
      }
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };

  // Generate dose schedule based on frequency
  const generateDoseSchedule = (medicationDetails: MedicationDetails): DoseSchedule[] => {
    const { frequency, duration, startDate } = medicationDetails;
    const schedule: DoseSchedule[] = [];
    
    console.log('🔍 [DOSE SCHEDULE DEBUG] Generating schedule for:', {
      frequency,
      duration,
      startDate,
      doseRecordsCount: medicationDetails.doseRecords?.length || 0,
      doseRecords: medicationDetails.doseRecords
    });
    
    // Debug frequency parsing
    console.log('🔍 [FREQUENCY DEBUG] Parsing frequency:', frequency);
    console.log('🔍 [FREQUENCY DEBUG] Frequency type:', typeof frequency);
    console.log('🔍 [FREQUENCY DEBUG] Frequency length:', frequency?.length);
    console.log('🔍 [FREQUENCY DEBUG] Frequency toLowerCase():', frequency?.toLowerCase());
    
    // Validate inputs
    if (!frequency || !duration || !startDate) {
      console.error('Missing required medication details:', { frequency, duration, startDate });
      return [];
    }
    
    // Validate and normalize startDate (should already be normalized but double-check)
    let normalizedStartDate: Date;
    if (startDate instanceof Date) {
      if (isNaN(startDate.getTime())) {
        console.error('Invalid Date object in medicationDetails:', startDate);
        normalizedStartDate = new Date(); // Fallback to current date
      } else {
        normalizedStartDate = startDate;
      }
    } else if (typeof startDate === 'string') {
      normalizedStartDate = new Date(startDate);
      if (isNaN(normalizedStartDate.getTime())) {
        console.error('Invalid date string in medicationDetails:', startDate);
        normalizedStartDate = new Date(); // Fallback to current date
      }
    } else {
      console.error('Invalid startDate type in medicationDetails:', startDate);
      normalizedStartDate = new Date(); // Fallback to current date
    }
    
    // Validate duration
    const validDuration = Math.max(1, Math.min(30, Math.floor(duration))); // 1-30 days max
    if (validDuration !== duration) {
      console.warn('Duration adjusted from', duration, 'to', validDuration);
    }
    
    // If real doseRecords are present, use them as the source of truth (no mock generation)
    if (Array.isArray(medicationDetails.doseRecords) && medicationDetails.doseRecords.length > 0) {
      const mapSlotToTimeAndLabel = (slot: string): { time: string; label: string } => {
        if (!slot) return { time: '09:00', label: 'Morning' };
        const raw = String(slot).trim();
        const lower = raw.toLowerCase();
        // If already a time like 9:00 or 09:00
        const timeMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
        if (timeMatch) {
          const hh = timeMatch[1].padStart(2, '0');
          const mm = timeMatch[2];
          const hour = parseInt(hh, 10);
          const label = hour === 0 ? 'Midnight' : hour < 12 ? 'Morning' : hour === 12 ? 'Noon' : hour < 17 ? 'Afternoon' : 'Evening';
          return { time: `${hh}:${mm}`, label };
        }
        if (lower.includes('midnight')) return { time: '00:00', label: 'Midnight' };
        if (lower.includes('dawn') || lower.includes('early')) return { time: '06:00', label: 'Early Morning' };
        if (lower.includes('morning')) return { time: '09:00', label: 'Morning' };
        if (lower.includes('noon')) return { time: '12:00', label: 'Noon' };
        if (lower.includes('afternoon')) return { time: '15:00', label: 'Afternoon' };
        if (lower.includes('evening')) return { time: '18:00', label: 'Evening' };
        if (lower.includes('night')) return { time: '21:00', label: 'Night' };
        // Default
        return { time: '09:00', label: 'Morning' };
      };

      // Group records by day
      const byDay = new Map<number, DoseRecord[]>();
      for (const rec of medicationDetails.doseRecords) {
        if (!rec || typeof rec.day !== 'number') continue;
        const arr = byDay.get(rec.day) || [];
        arr.push(rec);
        byDay.set(rec.day, arr);
      }

      const days = Array.from(byDay.keys()).sort((a, b) => a - b);
      for (const day of days) {
        const dayDate = addDays(normalizedStartDate, day - 1);
        const records = byDay.get(day) || [];
        // Sort records by time for consistent display
        const timeSlots = records
          .map((r) => {
            const mapped = mapSlotToTimeAndLabel(r.timeSlot as any);
            const slotDateTime = new Date(dayDate);
            const [hours, minutes] = mapped.time.split(':').map(Number);
            slotDateTime.setHours(hours, minutes, 0, 0);
            const currentTime = new Date();
            const isAdministered = !!r.administered;
            const isMissed = !isAdministered && currentTime > slotDateTime && !isToday(slotDateTime);
            const isOverdue = !isAdministered && currentTime > slotDateTime && isToday(slotDateTime);
            return {
              time: mapped.time,
              label: mapped.label,
              administered: isAdministered,
              administeredAt: r.administeredAt,
              administeredBy: r.administeredBy,
              notes: r.notes,
              missed: isMissed,
              overdue: isOverdue,
            } as TimeSlot;
          })
          .sort((a, b) => a.time.localeCompare(b.time));

        schedule.push({ day, date: dayDate, timeSlots });
      }

      return schedule;
    }

    // Parse frequency to determine time slots per day
    const getTimeSlots = (freq: string): TimeSlot[] => {
      const now = new Date();
      const baseSlots: { time: string; label: string }[] = [];
      
      console.log('🔍 [GET_TIME_SLOTS DEBUG] Input frequency:', freq);
      console.log('🔍 [GET_TIME_SLOTS DEBUG] Input frequency type:', typeof freq);
      console.log('🔍 [GET_TIME_SLOTS DEBUG] Input frequency toLowerCase():', freq?.toLowerCase());
      
      // More robust frequency matching
      const freqLower = freq.toLowerCase();
      
      if (freqLower.includes('twice') || freqLower.includes('bid') || freqLower.includes('2x')) {
        console.log('🔍 [GET_TIME_SLOTS DEBUG] Matched twice daily case (includes check)');
        baseSlots.push(
          { time: '09:00', label: 'Morning' },
          { time: '21:00', label: 'Evening' }
        );
      } else if (freqLower.includes('three') || freqLower.includes('tid') || freqLower.includes('3x')) {
        console.log('🔍 [GET_TIME_SLOTS DEBUG] Matched three times daily case');
        baseSlots.push(
          { time: '09:00', label: 'Morning' },
          { time: '15:00', label: 'Afternoon' },
          { time: '21:00', label: 'Evening' }
        );
      } else if (freqLower.includes('four') || freqLower.includes('qid') || freqLower.includes('4x')) {
        console.log('🔍 [GET_TIME_SLOTS DEBUG] Matched four times daily case');
        baseSlots.push(
          { time: '06:00', label: 'Early Morning' },
          { time: '12:00', label: 'Noon' },
          { time: '18:00', label: 'Evening' },
          { time: '00:00', label: 'Midnight' }
        );
      } else if (freqLower.includes('every 6') || freqLower.includes('q6h')) {
        console.log('🔍 [GET_TIME_SLOTS DEBUG] Matched every 6 hours case');
        baseSlots.push(
          { time: '06:00', label: 'Early Morning' },
          { time: '12:00', label: 'Noon' },
          { time: '18:00', label: 'Evening' },
          { time: '00:00', label: 'Midnight' }
        );
      } else if (freqLower.includes('every 8') || freqLower.includes('q8h')) {
        console.log('🔍 [GET_TIME_SLOTS DEBUG] Matched every 8 hours case');
        baseSlots.push(
          { time: '08:00', label: 'Morning' },
          { time: '16:00', label: 'Afternoon' },
          { time: '00:00', label: 'Midnight' }
        );
             } else {
         // Default to once daily
         console.log('🔍 [GET_TIME_SLOTS DEBUG] Matched default case - using once daily');
         baseSlots.push({ time: '09:00', label: 'Morning' });
       }
      
      return baseSlots.map(slot => ({
        ...slot,
        administered: false,
        missed: false,
        overdue: false
      }));
    };
    
    // Generate schedule for each day
    for (let day = 1; day <= validDuration; day++) {
      const dayDate = addDays(normalizedStartDate, day - 1);
      const baseTimeSlots = getTimeSlots(frequency);
      
      console.log(`🔍 [DOSE SCHEDULE DEBUG] Day ${day}: Generated ${baseTimeSlots.length} time slots:`, baseTimeSlots);
      
      // Update time slots with administration status for this specific day
      const timeSlots = baseTimeSlots.map(slot => {
        const doseRecord = medicationDetails.doseRecords?.find(
          record => record.day === day && record.timeSlot === slot.time
        );
        
        const slotDateTime = new Date(dayDate);
        const [hours, minutes] = slot.time.split(':').map(Number);
        slotDateTime.setHours(hours, minutes, 0, 0);
        
        const currentTime = new Date();
        const isAdministered = doseRecord?.administered || false;
        const isMissed = !isAdministered && currentTime > slotDateTime && !isToday(slotDateTime);
        const isOverdue = !isAdministered && currentTime > slotDateTime && isToday(slotDateTime);
        
        // Debug logging - check all slots
        if (isAdministered || day === 1) {
          console.log(`🔍 [DOSE DEBUG] Day ${day} ${slot.label} (${slot.time}):`, {
            day,
            timeSlot: slot.time,
            isAdministered,
            doseRecord: doseRecord || 'No record found',
            inventoryDeducted: doseRecord?.inventoryDeducted,
            inventoryDetails: doseRecord?.inventoryDetails,
            slotDateTime: slotDateTime.toISOString(),
            isToday: isToday(slotDateTime),
            isMissed,
            isOverdue
          });
        }
        
        return {
          ...slot,
          administered: isAdministered,
          administeredAt: doseRecord?.administeredAt,
          administeredBy: doseRecord?.administeredBy,
          notes: doseRecord?.notes,
          missed: isMissed,
          overdue: isOverdue
        };
      });
      
      schedule.push({
        day,
        date: dayDate,
        timeSlots
      });
    }
    
    return schedule;
  };

  // Check if dose is overdue
  const isDoseOverdue = (day: number, timeSlot: string, startDate: Date): boolean => {
    try {
      if (!startDate || isNaN(startDate.getTime())) {
        console.warn('Invalid startDate for dose overdue check:', startDate);
        return false;
      }
      
      const now = new Date();
      const doseDate = addDays(new Date(startDate), day - 1);
      const [hours, minutes] = timeSlot.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.warn('Invalid time slot format:', timeSlot);
        return false;
      }
      
      doseDate.setHours(hours, minutes, 0, 0);
      
      return now > doseDate && !isToday(doseDate);
    } catch (error) {
      console.error('Error checking if dose is overdue:', error);
      return false;
    }
  };

  // Check if dose is missed (overdue by more than 2 hours)
  const isDoseMissed = (day: number, timeSlot: string, startDate: Date): boolean => {
    try {
      if (!startDate || isNaN(startDate.getTime())) {
        console.warn('Invalid startDate for dose missed check:', startDate);
        return false;
      }
      
      const now = new Date();
      const doseDate = addDays(new Date(startDate), day - 1);
      const [hours, minutes] = timeSlot.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.warn('Invalid time slot format:', timeSlot);
        return false;
      }
      
      doseDate.setHours(hours, minutes, 0, 0);
      
      const twoHoursLater = new Date(doseDate.getTime() + 2 * 60 * 60 * 1000);
      return now > twoHoursLater;
    } catch (error) {
      console.error('Error checking if dose is missed:', error);
      return false;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'URGENT': return 'bg-[hsl(var(--priority-urgent))] text-[hsl(var(--priority-urgent-foreground))] border-[hsl(var(--priority-urgent-border))]';
      case 'HIGH': return 'bg-[hsl(var(--priority-high))] text-[hsl(var(--priority-high-foreground))] border-[hsl(var(--priority-high-border))]';
      case 'MEDIUM': return 'bg-[hsl(var(--priority-medium))] text-[hsl(var(--priority-medium-foreground))] border-[hsl(var(--priority-medium-border))]';
      case 'LOW': return 'bg-[hsl(var(--priority-low))] text-[hsl(var(--priority-low-foreground))] border-[hsl(var(--priority-low-border))]';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED': return 'bg-[hsl(var(--task-completed))] text-[hsl(var(--task-completed-foreground))] border-[hsl(var(--task-completed-border))]';
      case 'IN_PROGRESS': return 'bg-[hsl(var(--task-in-progress))] text-[hsl(var(--task-in-progress-foreground))] border-[hsl(var(--task-in-progress-border))]';
      case 'PENDING': return 'bg-[hsl(var(--task-pending))] text-[hsl(var(--task-pending-foreground))] border-[hsl(var(--task-pending-border))]';
      case 'CANCELLED': return 'bg-[hsl(var(--task-cancelled))] text-[hsl(var(--task-cancelled-foreground))] border-[hsl(var(--task-cancelled-border))]';
      default: return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'MEDICATION': return <Pill className="w-4 h-4" />;
      case 'VITAL_SIGNS': return <Heart className="w-4 h-4" />;
      case 'ASSESSMENT': return <Stethoscope className="w-4 h-4" />;
      case 'PROCEDURE': return <Activity className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Create sample medication data for testing
  const createSampleMedicationTasks = (): NurseTask[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Return empty array - no more sample data
    return [];
  };

  // Data fetching
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      try {
        // Get the current user ID - handle different user roles
        const currentUserId = user?.id || user?._id;
        console.log('🔍 Current user ID:', currentUserId);
        console.log('🔍 Current user object:', user);
        console.log('🔍 User role:', user?.role);
        console.log('🔍 Token available:', !!token);
        console.log('🔍 Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
        console.log('🔍 Cache buster:', cacheBuster);
        
        // Determine how to fetch tasks based on user role
        let nurseIdToUse = null;
        if (user?.role === 'nurse') {
          nurseIdToUse = currentUserId;
        } else if (user?.role === 'admin') {
          // Admin can see all nurse tasks, don't filter by specific nurse
          nurseIdToUse = null;
          console.log('🔍 Admin user - fetching all nurse tasks');
        } else if (user?.email?.toLowerCase().includes('semhal') || 
            user?.name?.toLowerCase().includes('semhal') ||
            user?.firstName?.toLowerCase().includes('semhal')) {
          nurseIdToUse = '6823859485e2a37d8cb420ed'; // Semhal's actual nurse ID
          console.log('🔍 Using Semhal Melaku\'s nurse ID:', nurseIdToUse);
        }
        
        // SINGLE API CALL APPROACH: Fetch all relevant tasks in one call
        console.log('📋 Fetching medication tasks with optimized query...');
        
        const queryParams = {
          taskType: 'MEDICATION',
          status: 'PENDING' // Only get pending tasks to avoid duplicates
        };
        
        // Add nurse filter if specific nurse
        if (nurseIdToUse) {
          (queryParams as any).assignedTo = nurseIdToUse;
        }
        
        // Add cache buster to force fresh data
        const allTasks = await nurseTaskService.getMedicationTasks(token, queryParams);
        console.log('📋 Fetched tasks count:', allTasks.length);
        
        // Log payment authorization for each task
        console.log('📋 Payment authorization details:');
        allTasks.forEach((task, index) => {
          console.log(`  Task ${index + 1}: ${task.medicationDetails?.medicationName}`);
          console.log(`    Payment Status: ${task.paymentAuthorization?.paymentStatus || 'No payment data'}`);
          console.log(`    Can Administer: ${task.paymentAuthorization?.canAdminister || false}`);
          console.log(`    Authorized Doses: ${task.paymentAuthorization?.authorizedDoses || 0}`);
          console.log(`    Unauthorized Doses: ${task.paymentAuthorization?.unauthorizedDoses || 0}`);
        });
        
        // DEDUPLICATION AT SOURCE: Remove duplicates based on unique criteria
        const uniqueTasks = [];
        const seenTaskKeys = new Set();
        
        for (const task of allTasks) {
          // Create a unique key for each task based on patient + medication + prescription + task type
          const taskKey = `${task.patientId}-${task.medicationDetails?.medicationName || task.description || 'unknown'}-${(task as any).prescriptionId || 'no-prescription'}-${task.taskType || 'unknown'}`;
          
          if (!seenTaskKeys.has(taskKey)) {
            seenTaskKeys.add(taskKey);
            uniqueTasks.push(task);
          } else {
            console.log(`🔄 [DUPLICATE REMOVAL] Skipping duplicate task: ${task._id || task.id} for ${task.medicationDetails?.medicationName || task.description}`);
          }
        }
        
        console.log('📋 After deduplication:', {
          originalCount: allTasks.length,
          uniqueCount: uniqueTasks.length,
          duplicatesRemoved: allTasks.length - uniqueTasks.length
        });
        
        // REMOVED: localStorage dose records merge - now using server data only
        
        console.log('📋 Final tasks summary:', {
          nurseIdUsed: nurseIdToUse,
          userRole: user?.role,
          totalTasks: uniqueTasks.length,
          taskDetails: uniqueTasks.map(t => ({ 
            id: t.id || t._id, 
            patient: t.patientName, 
            description: t.description,
            type: t.taskType,
            assignedTo: t.assignedTo,
            paymentStatus: t.paymentAuthorization?.paymentStatus || 'No payment data'
          }))
        });
        
        // Force debug: Log each task individually
        console.log('📋 Individual task details:');
        uniqueTasks.forEach((task, index) => {
          console.log(`  Task ${index + 1}:`, {
            id: task.id || task._id,
            patientName: task.patientName,
            description: task.description,
            taskType: task.taskType,
            status: task.status,
            assignedTo: task.assignedTo,
            medicationDetails: task.medicationDetails,
            doseRecords: task.medicationDetails?.doseRecords?.length || 0,
            paymentAuthorization: task.paymentAuthorization
          });
        });
        
        // Check for payment status changes
        const currentTasks = uniqueTasks || [];
        const previousTasks = tasks;
        
        // Detect payment status changes
        if (previousTasks.length > 0) {
          const paymentChanges = currentTasks.filter(newTask => {
            const oldTask = previousTasks.find(t => t._id === newTask._id || t.id === newTask.id);
            if (!oldTask) return false;
            
            const oldPaymentStatus = (oldTask as any).paymentAuthorization?.paymentStatus;
            const newPaymentStatus = (newTask as any).paymentAuthorization?.paymentStatus;
            
            return oldPaymentStatus !== newPaymentStatus;
          });
          
          if (paymentChanges.length > 0) {
            setPaymentStatusChanged(true);
            setLastPaymentUpdate(new Date());
            
            // Show notification for payment status changes
            paymentChanges.forEach(task => {
              const newStatus = (task as any).paymentAuthorization?.paymentStatus;
              if (newStatus === 'fully_paid' || newStatus === 'paid') {
                toast.success(`✅ Payment completed for ${task.patientName} - ${task.medicationDetails?.medicationName}`);
              } else if (newStatus === 'partially_paid') {
                toast.success(`💰 Partial payment received for ${task.patientName} - ${task.medicationDetails?.medicationName}`);
              }
            });
            
            // Clear the notification after 5 seconds
            setTimeout(() => setPaymentStatusChanged(false), 5000);
          }
        }
        
        // Always use real tasks only - no sample data fallback
        setTasks(currentTasks);
        await organizeTasksByPatient(currentTasks);
        
      } catch (fetchError: any) {
        console.error('❌ Error fetching tasks:', fetchError);
        
        // Show user-friendly error message
        if (fetchError.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (fetchError.response?.status === 403) {
          setError('You do not have permission to view nurse tasks.');
        } else if (fetchError.code === 'ECONNABORTED' || fetchError.message?.includes('timeout')) {
          setError('Request timed out. Please try again.');
        } else {
          setError(`Failed to load tasks: ${fetchError.message || 'Unknown error'}`);
        }
        
        // Set empty tasks array on error
        setTasks([]);
        setTaskGroups([]);
      }
    } catch (error: any) {
      console.error('❌ Error in fetchTasks:', error);
      setError(`Failed to load tasks: ${error.message || 'Unknown error'}`);
      setTasks([]);
      setTaskGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Lightweight fetch for nurse payment notifications to show paid/due in headers
  useEffect(() => {
    (async () => {
      try {
        // fetch latest nurse payment notifications (both read/unread)
        const res = await api.get('/api/notifications', { params: { recipientRole: 'nurse', type: 'medication_payment_info', limit: 200 } });
        const list = res.data?.data || res.data?.notifications || [];
        const map: Record<string, { amountPaid?: number; outstandingAmount?: number; paymentStatus?: string }> = {};
        for (const n of list) {
          const pid = n?.data?.patientId;
          const pname = (n?.data?.patientName || '').toString().toLowerCase();
          if (!pid) continue;
          map[String(pid)] = {
            amountPaid: n?.data?.amountPaid,
            outstandingAmount: n?.data?.outstandingAmount,
            paymentStatus: n?.data?.paymentStatus
          };
          if (pname) {
            map[`name:${pname}`] = {
              amountPaid: n?.data?.amountPaid,
              outstandingAmount: n?.data?.outstandingAmount,
              paymentStatus: n?.data?.paymentStatus
            };
          }
        }
        setPaymentInfoByPatient(map);

        // Build medication-specific map by querying latest invoices and matching item description to medication
        try {
          const patientIds = Array.from(new Set(tasks.map(t => String(t.patientId)).filter(Boolean)));
          const medMap: Record<string, { amountPaid?: number; outstandingAmount?: number; paymentStatus?: string }> = {};
          for (const pid of patientIds) {
            const invRes = await api.get('/api/billing/invoices', { params: { patient: pid, limit: 50 } });
            const invoices = invRes.data?.invoices || invRes.data?.data || [];
            for (const t of tasks.filter(x => String(x.patientId) === pid && x.medicationDetails?.medicationName)) {
              const medName = (t.medicationDetails!.medicationName || '').toString().toLowerCase();
              // Prefer invoice that actually contains medication items; ignore pure card/service invoices
              const inv = invoices.find((iv: any) => {
                const items = iv.items || [];
                const normalized = (s: any) => String(s || '').toLowerCase();
                const matchesByName = items.some((it: any) => normalized(it.description).includes(medName) || normalized(it?.metadata?.name).includes(medName));
                const isCardOnly = items.every((it: any) => String(it.category || '').toLowerCase() === 'card');
                if (isCardOnly) return false; // ignore card invoices (e.g., ETB 100 card)
                if (iv.isDailyConsolidated || iv.isConsolidated) return false; // ignore consolidated/daily invoices
                return matchesByName; // strict
              });
              if (inv) {
                const key = `${pid}|${medName}`;
                medMap[key] = {
                  amountPaid: inv.amountPaid || 0,
                  outstandingAmount: inv.balance ?? Math.max(0, (inv.total || 0) - (inv.amountPaid || 0)),
                  paymentStatus: inv.balance <= 0 ? 'paid' : 'partial'
                };
              }
            }
          }
          if (Object.keys(medMap).length > 0) setPaymentInfoByPatientMed(medMap);
        } catch {}
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Fallback: if we still don't have payment info for some patients, query their latest invoice
  useEffect(() => {
    (async () => {
      try {
        const ids = Array.from(new Set(tasks.map(t => String(t.patientId)).filter(Boolean)));
        const missing = ids.filter(pid => !paymentInfoByPatient[pid]);
        if (missing.length === 0) return;
        const updates: Record<string, { amountPaid?: number; outstandingAmount?: number; paymentStatus?: string }> = {};
        for (const pid of missing) {
          try {
            const resp = await api.get('/api/billing/invoices', { params: { patient: pid, limit: 1 } });
            const list = resp.data?.invoices || resp.data?.data || [];
            const inv = Array.isArray(list) && list.length > 0 ? list[0] : null;
            if (inv) {
              updates[pid] = {
                amountPaid: inv.amountPaid || 0,
                outstandingAmount: inv.balance ?? Math.max(0, (inv.total || 0) - (inv.amountPaid || 0)),
                paymentStatus: inv.balance <= 0 ? 'paid' : 'partial'
              };
            }
          } catch {}
        }
        if (Object.keys(updates).length > 0) {
          setPaymentInfoByPatient(prev => ({ ...prev, ...updates }));
        }
      } catch {}
    })();
  }, [tasks, paymentInfoByPatient]);

  // Keep invoice-derived amounts fresh, and compute immediately on task load
  useEffect(() => {
    const compute = async () => {
      try {
        const patientIds = Array.from(new Set(tasks.map(t => String(t.patientId)).filter(Boolean)));
        if (patientIds.length === 0) return;
        const medMap: Record<string, { amountPaid?: number; outstandingAmount?: number; paymentStatus?: string }> = {};
        for (const pid of patientIds) {
          try {
            const invRes = await api.get('/api/billing/invoices', { params: { patient: pid, limit: 50 } });
            const invoices = invRes.data?.invoices || invRes.data?.data || [];
            for (const t of tasks.filter(x => String(x.patientId) === pid && x.medicationDetails?.medicationName)) {
              const medName = (t.medicationDetails!.medicationName || '').toString().toLowerCase();
              const key = `${pid}|${medName}`;
              const inv = invoices.find((iv: any) => {
                const items = iv.items || [];
                const normalized = (s: any) => String(s || '').toLowerCase();
                // Prefer exact medication name match in description or metadata
                const matchesByName = items.some((it: any) => normalized(it.description).includes(medName) || normalized(it?.metadata?.name).includes(medName));
                // Avoid broad category matches that would double count across meds
                const hasMedicationItem = items.some((it: any) => normalized(it.description).includes(medName) || normalized(it?.metadata?.name).includes(medName));
                const isCardOnly = items.every((it: any) => normalized(it.category) === 'card');
                if (isCardOnly) return false;
                if (iv.isDailyConsolidated || iv.isConsolidated) return false;
                return hasMedicationItem || matchesByName;
              });
              if (inv) {
                try {
                  const items = inv.items || [];
                  const normalized = (s: any) => String(s || '').toLowerCase();
                  // Strict match to this medication only (description or metadata name)
                  const matchedItems = items.filter((it: any) => normalized(it.description).includes(medName) || normalized(it?.metadata?.name).includes(medName));
                  const matchedTotal = matchedItems.reduce((sum: number, it: any) => sum + (it.total || 0), 0);
                  const totalInvoiceTotal = items.reduce((sum: number, it: any) => sum + (it.total || 0), 0) || 1;
                  const proportion = matchedTotal > 0 ? matchedTotal / totalInvoiceTotal : 0;
                  const allocatedPaid = Math.round((inv.amountPaid || 0) * proportion);
                  const outstanding = Math.max(0, matchedTotal - allocatedPaid);
                  medMap[key] = {
                    amountPaid: allocatedPaid,
                    outstandingAmount: outstanding,
                    paymentStatus: outstanding <= 0 ? 'paid' : 'partial'
                  };
                } catch {
                  medMap[key] = {
                    amountPaid: inv.amountPaid || 0,
                    outstandingAmount: inv.balance ?? Math.max(0, (inv.total || 0) - (inv.amountPaid || 0)),
                    paymentStatus: (inv.balance ?? 0) <= 0 ? 'paid' : 'partial'
                  };
                }
              }
            }
          } catch {}
        }
        if (Object.keys(medMap).length > 0) setPaymentInfoByPatientMed(prev => ({ ...prev, ...medMap }));
      } catch {}
    };

    // Compute immediately on task load
    compute();
    // Then keep fresh every 15 seconds
    const interval = setInterval(compute, 15000);
    return () => clearInterval(interval);
  }, [tasks]);

  // Optimized patient organization - no API calls needed since backend provides patient names
  const organizeTasksByPatient = (taskList: NurseTask[]) => {
    try {
      const patientGroups = new Map<string, TaskGroup>();
      
      for (const task of taskList) {
        // Ensure task has required properties
        if (!task.patientId) {
          console.warn('Task missing patientId:', task);
          continue;
        }
        
        if (!patientGroups.has(task.patientId)) {
            // Use patient data from task (backend already provides patient names)
          const patientName = task.patientName || `Unknown Patient (ID: ${task.patientId})`;
          const nameParts = patientName.split(' ');
          
            const patientInfo: PatientInfo = {
              id: task.patientId,
              firstName: nameParts[0] || 'Unknown',
              lastName: nameParts.slice(1).join(' ') || 'Patient',
              gender: 'Unknown' // Can be enhanced later if needed
            };
            
            patientGroups.set(task.patientId, {
              patientId: task.patientId,
              patientInfo: patientInfo,
            tasks: [],
            expanded: true
          });
        }
        
        patientGroups.get(task.patientId)!.tasks.push(task);
      }
      
              console.log('📋 Organized tasks into', patientGroups.size, 'patient groups (no API calls)');
      setTaskGroups(Array.from(patientGroups.values()));
      
    } catch (error) {
      console.error('Error organizing tasks by patient:', error);
      // Set empty groups on error to prevent crash
      setTaskGroups([]);
    }
  };

  // Task actions
  const handleCompleteTask = async (taskId: string) => {
    try {
      console.log('✅ [TASK COMPLETION] Completing task:', taskId);
      
      // Find the task to check its type
      const task = taskGroups
        .flatMap(group => group.tasks)
        .find(t => getTaskId(t) === taskId);
      
      if (!task) {
        toast.error('Task not found');
        return;
      }

      console.log('🔍 [DEBUG] Task found:', {
        taskId,
        taskType: task.taskType,
        description: task.description,
        patientName: task.patientName
      });

      // Handle different task types
      if (task.taskType === 'VITAL_SIGNS' || 
          task.description?.toLowerCase().includes('blood pressure') ||
          task.serviceName?.toLowerCase().includes('blood pressure')) {
        console.log('🎯 [DEBUG] Opening vital signs modal for task:', task);
        // Open vital signs form instead of completing directly
        handleVitalSignsTask(task);
        return;
      } else if (task.taskType === 'MEDICATION') {
        console.log('💊 [DEBUG] Opening medication modal for task:', task);
        // Handle medication tasks (existing logic)
        setSelectedMedicationTask(task);
        setShowMedicationModal(true);
        return;
      }

      console.log('⚠️ [DEBUG] Task type not handled:', task.taskType);

      // For other task types, complete directly
      const token = await getToken();
      if (!token) return;

      await nurseTaskService.completeMedicationTask(taskId, administrationNotes, token);
      toast.success('Task completed successfully!');
      
      // Update local state
      setTasks(prev => prev.map(task => 
        getTaskId(task) === taskId 
          ? { ...task, status: 'COMPLETED' as const, completedDate: new Date().toISOString() }
          : task
      ));
      
      organizeTasksByPatient(tasks);
      setShowTaskModal(false);
      
    } catch (error: any) {
      console.error('❌ [TASK COMPLETION] Error:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleMedicationAdministration = async () => {
    // Prevent double-clicking with strong guards
    if (processingDoseRef.current || processingDose) {
      console.log('🚫 [CLEAN ADMIN] Already processing, ignoring click');
      return;
    }

    if (!selectedDose) {
      console.error('No dose selected for administration');
      return;
    }

    // Create dose key for tracking
    const doseKey = `${selectedDose.taskId}-${selectedDose.day}-${standardizeTimeSlot(selectedDose.timeSlot)}`;
    
    // Check if already processed
    if (processedDoses.has(doseKey)) {
      console.log('🚫 [CLEAN ADMIN] Dose already processed, ignoring click');
      return;
    }

    processingDoseRef.current = true;
    setProcessingDose(true);
    
    // Instantly disable the button for this dose
    setJustClickedDoseKey(doseKey);
    
    try {
      console.log('🚀 [CLEAN ADMIN] Starting dose administration:', {
        taskId: selectedDose.taskId,
        day: selectedDose.day,
        timeSlot: selectedDose.timeSlot,
        medicationName: selectedDose.medicationName
      });

      // Use the new clean medication administration service
      const response = await medicationAdministrationService.administerDose({
        taskId: selectedDose.taskId,
        day: selectedDose.day,
        timeSlot: selectedDose.timeSlot,
        notes: administrationNotes
      });

      console.log('✅ [CLEAN ADMIN] Dose administered successfully:', response);

      // Debug the response data
      console.log('🔍 [DOSE DEBUG] Administration response:', {
        success: response.success,
        data: response.data,
        inventoryDeducted: response.data.inventoryDeducted,
        inventoryDetails: response.data.inventoryDetails
      });

      // Do NOT update local state for administered here. Wait for backend fetch to reflect the change.

      // Show success message with inventory details
      let successMessage = `✅ ${selectedDose.medicationName} administered successfully!`;
      if (response.data?.inventoryDeducted && response.data?.inventoryDetails) {
        const { itemsDeducted, warning: inventoryWarning } = response.data.inventoryDetails as any;
        if (inventoryWarning) {
          successMessage += `\n⚠️ ${inventoryWarning}`;
          toast.warning(successMessage);
        } else if (itemsDeducted && itemsDeducted.length > 0) {
          const deductionSummary = itemsDeducted.map((item: any) => 
            `${item.name}: ${item.quantityDeducted} unit (${item.previousQuantity} → ${item.newQuantity})`
          ).join(', ');
          successMessage += `\n📦 Inventory deducted: ${deductionSummary}`;
          toast.success(successMessage);
        }
      } else {
        successMessage += `\n⚠️ No inventory deduction - Add "${selectedDose.medicationName}" to inventory`;
        toast.warning(successMessage);
      }

      // Remove this dose from local processing sets (it will be disabled via administered status on next fetch)
      setProcessedDoses(prev => {
        const newSet = new Set(prev);
        newSet.delete(doseKey);
        return newSet;
      });
      setJustClickedDoseKey(null);

      // Close modal and reset state
      setShowMedicationModal(false);
      setSelectedDose(null);
      setAdministrationNotes('');
      
      // Refresh tasks to get updated data from server
      setTimeout(() => {
        console.log('🔄 [DOSE DEBUG] Refreshing tasks after administration');
        fetchTasks();
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ [CLEAN ADMIN] Failed to administer dose:', error);
      toast.error(error.message || 'Failed to administer medication');
      
      // Remove from processed doses on error so user can retry
      setProcessedDoses(prev => {
        const newSet = new Set(prev);
        newSet.delete(doseKey);
        return newSet;
      });
    } finally {
      processingDoseRef.current = false;
      setProcessingDose(false);
    }
  };

  // Handle vital signs recording
  const handleVitalSignsRecording = async (vitalSignsData: any) => {
    try {
      console.log('💓 [VITAL SIGNS] Recording vital signs:', vitalSignsData);

      // Save vital signs using the service
      const result = await vitalSignsService.saveVitalSigns(vitalSignsData);

      console.log('✅ [VITAL SIGNS] Success:', result);

      // Close modal
      setShowVitalSignsModal(false);
      setSelectedVitalSignsTask(null);

      // Refresh tasks to show updated status
      setTimeout(() => {
        fetchTasks();
      }, 1000);

    } catch (error: any) {
      console.error('❌ [VITAL SIGNS] Error:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to record vital signs';
      toast.error(`❌ ${errorMessage}`);
      throw error; // Re-throw to let the form handle it
    }
  };

  // Handle vital signs task completion
  const handleVitalSignsTask = (task: NurseTask) => {
    console.log('🎯 [VITAL SIGNS] Opening modal for task:', task);
    console.log('🎯 [VITAL SIGNS] Setting selectedVitalSignsTask:', task);
    console.log('🎯 [VITAL SIGNS] Setting showVitalSignsModal to true');
    setSelectedVitalSignsTask(task);
    setShowVitalSignsModal(true);
    console.log('🎯 [VITAL SIGNS] Modal state should now be open');
  };

  // Clear filters function
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSelectedTaskType('ALL');
    console.log('🔄 Filters cleared');
  };

  // Quick filter functions
  const showAllTasks = () => setSelectedTaskType('ALL');
  const showMedicationTasks = () => setSelectedTaskType('MEDICATION');
  const showVitalTasks = () => setSelectedTaskType('VITAL_SIGNS');

  // Helper function to check if a task is medication-related
  const isMedicationRelatedTask = (task: NurseTask): boolean => {
    const description = (task.description || '').toLowerCase();
    const taskType = task.taskType;
    
    // Check if it's a MEDICATION type task
    if (taskType === 'MEDICATION') {
      return true;
    }
    
    // Check if it's a PROCEDURE that's medication-related
    if (taskType === 'PROCEDURE') {
      return description.includes('injection') ||
             description.includes('depo') ||
             description.includes('vaccine') ||
             description.includes('immunization') ||
             description.includes('medication') ||
             description.includes('administer');
    }
    
    return false;
  };

  // Filter functions
  const getFilteredTasks = () => {
    const filtered = tasks.filter(task => {
      // Exclude cancelled tasks from the interface
      if (task.status === 'CANCELLED') {
        return false;
      }
      
      // Additional duplicate prevention: if multiple tasks exist for same patient-medication, keep only one
      const taskKey = `${task.patientId}-${task.medicationDetails?.medicationName || 'unknown'}`;
      const duplicateTasks = tasks.filter(t => 
        t.patientId === task.patientId && 
        t.medicationDetails?.medicationName === task.medicationDetails?.medicationName &&
        t.status !== 'CANCELLED'
      );
      
      // Allow showing all tasks for the same medication (no duplicate hiding)
      if (false && duplicateTasks.length > 1) {
        // SMART DUPLICATE PREVENTION: Always keep the best single task
        const bestTask = duplicateTasks.reduce((best, current) => {
          const bestPayment = best.paymentAuthorization;
          const currentPayment = current.paymentAuthorization;
          
          // Priority order: paid > partially paid > unpaid > no payment
          const getPaymentPriority = (payment) => {
            if (!payment) return 0;
            
            // Check if it's fully paid (no outstanding amount and has authorized doses)
            if (payment.outstandingAmount === 0 && payment.authorizedDoses > 0) {
              return 5; // Highest priority - fully paid
            }
            
            // Check payment status field
            if (payment.paymentStatus === 'fully_paid' || payment.paymentStatus === 'paid') return 4;
            if (payment.paymentStatus === 'partial' || payment.paymentStatus === 'partially_paid') return 3;
            if (payment.paymentStatus === 'unpaid') return 2;
            
            // Check if it has any payment information
            if (payment.authorizedDoses > 0 || payment.outstandingAmount > 0) return 1;
            
            return 0; // No payment info
          };
          
          const bestPriority = getPaymentPriority(bestPayment);
          const currentPriority = getPaymentPriority(currentPayment);
          
          // If payment priority is the same, prefer the one with more authorized doses
          if (bestPriority === currentPriority) {
            const bestDoses = bestPayment?.authorizedDoses || 0;
            const currentDoses = currentPayment?.authorizedDoses || 0;
            
            if (bestDoses === currentDoses) {
              // If doses are the same, prefer the one with more recent payment update
              const bestPaymentUpdate = bestPayment?.lastUpdated ? new Date(bestPayment.lastUpdated) : new Date(0);
              const currentPaymentUpdate = currentPayment?.lastUpdated ? new Date(currentPayment.lastUpdated) : new Date(0);
              
              if (bestPaymentUpdate.getTime() === currentPaymentUpdate.getTime()) {
                // If payment updates are the same, keep the most recently updated task
                const bestUpdated = new Date(best.updatedAt || best.createdAt || 0);
                const currentUpdated = new Date(current.updatedAt || current.createdAt || 0);
                return bestUpdated.getTime() > currentUpdated.getTime() ? best : current;
              }
              
              return bestPaymentUpdate.getTime() > currentPaymentUpdate.getTime() ? best : current;
            }
            
            return bestDoses > currentDoses ? best : current;
          }
          
          return bestPriority > currentPriority ? best : current;
        });

        // Only keep the selected best task; filter out all others robustly
        const sameByObjectId = Boolean(task._id) && Boolean((bestTask as any)._id) && task._id === (bestTask as any)._id;
        const sameByAltId = Boolean((task as any).id) && Boolean((bestTask as any).id) && (task as any).id === (bestTask as any).id;
        if (!(sameByObjectId || sameByAltId)) {
          console.log(`🔄 [DUPLICATE PREVENTION] Hiding duplicate for ${task.medicationDetails?.medicationName}: ${task._id || (task as any).id} -> keeping ${bestTask._id || (bestTask as any).id}`);
          return false;
        }
      }
      
      const instanceLabel = task.medicationDetails?.instanceLabel ? ` ${task.medicationDetails.instanceLabel}` : '';
      const matchesSearch = 
        (task.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((task.medicationDetails?.medicationName || '').toLowerCase() + instanceLabel.toLowerCase()).includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === 'ALL' || task.status === selectedStatus;
      const matchesPriority = selectedPriority === 'ALL' || task.priority === selectedPriority;
      
      // Enhanced type matching to include medication-related procedures
      let matchesType = false;
      if (selectedTaskType === 'ALL') {
        matchesType = true;
      } else if (selectedTaskType === 'MEDICATION') {
        matchesType = isMedicationRelatedTask(task);
      } else {
        matchesType = task.taskType === selectedTaskType;
      }
      
      // Uncomment for detailed debugging:
      // console.log('🔍 Task Filter Check:', {
      //   taskId: getTaskId(task),
      //   patientName: task.patientName,
      //   status: task.status,
      //   priority: task.priority,
      //   taskType: task.taskType,
      //   matchesSearch,
      //   matchesStatus,
      //   matchesPriority,
      //   matchesType,
      //   selectedFilters: { selectedStatus, selectedPriority, selectedTaskType }
      // });
      
      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });
    
    console.log('🔍 Filter Summary:', {
      totalTasks: tasks.length,
      filteredTasks: filtered.length,
      filters: {
        searchQuery,
        selectedStatus,
        selectedPriority,
        selectedTaskType
      },
      allTaskStatuses: [...new Set(tasks.map(t => t.status).filter(Boolean))],
      allTaskPriorities: [...new Set(tasks.map(t => t.priority).filter(Boolean))],
      allTaskTypes: [...new Set(tasks.map(t => t.taskType).filter(Boolean))]
    });
    
    return filtered;
  };

  // Effects
  useEffect(() => {
    if (!authLoading) {
    fetchTasks();
    }
  }, [authLoading]);

  // Auto-refresh tasks every 30 seconds to get updated payment status
  useEffect(() => {
    if (!authLoading) {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing tasks for payment status updates...');
        fetchTasks();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [authLoading]);

  useEffect(() => {
    const filteredTasks = getFilteredTasks();
    organizeTasksByPatient(filteredTasks);
  }, [searchQuery, selectedStatus, selectedPriority, selectedTaskType, tasks]);

  // Helper function to create medication details for injection tasks
  const createMedicationDetailsForInjection = (task: NurseTask): MedicationDetails | null => {
    const description = task.description.toLowerCase();
    
    if (description.includes('depo injection')) {
      return {
        medicationName: 'DEPO Injection',
        dosage: '1 injection',
        frequency: 'Single dose',
        route: 'Intramuscular',
        instructions: 'Administer DEPO injection as prescribed',
        duration: 1,
        startDate: new Date(),
        doseSchedule: [{
          day: 1,
          date: new Date(),
          timeSlots: [{
            time: '09:00',
            label: 'Morning',
            administered: false,
            missed: false,
            overdue: false
          }]
        }]
      };
    }
    
    if (description.includes('injection')) {
      const medicationName = task.description.replace(/please perform|for patient.*$/gi, '').trim();
      return {
        medicationName: medicationName || 'Injection',
        dosage: '1 injection',
        frequency: 'Single dose',
        route: 'Intramuscular',
        instructions: 'Administer injection as prescribed',
        duration: 1,
        startDate: new Date(),
        doseSchedule: [{
          day: 1,
          date: new Date(),
          timeSlots: [{
            time: '09:00',
            label: 'Morning',
            administered: false,
            missed: false,
            overdue: false
          }]
        }]
      };
    }
    
    return null;
  };

  // Enhanced medication card with dose tracking
  const renderMedicationCard = (task: NurseTask) => {
    // Try to get existing medication details or create them for injections
    let medicationDetails = task.medicationDetails;
    if (!medicationDetails && isMedicationRelatedTask(task)) {
      medicationDetails = createMedicationDetailsForInjection(task);
    }
    
    if (!medicationDetails) return renderTaskCard(task);
    
    
    
    // Safely normalize startDate with validation
    const normalizeStartDate = (dateValue: Date | string | undefined | null): Date => {
      if (!dateValue) {
        
        return new Date();
      }
      
      if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) {
          
          return new Date();
        }
        return dateValue;
      }
      
      // Try to parse string date
      const parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) {
        
        return new Date();
      }
      
      return parsedDate;
    };
    
    // Ensure startDate is a proper Date object
    const normalizedMedicationDetails = {
      ...medicationDetails,
      startDate: normalizeStartDate(medicationDetails.startDate),
      // For extensions, use the total doses; otherwise use the original duration logic
      duration: (medicationDetails.isExtension && medicationDetails.totalDoses)
        ? medicationDetails.totalDoses
        : (typeof medicationDetails.duration === 'number' && medicationDetails.duration > 0)
          ? medicationDetails.duration
          : (Array.isArray((medicationDetails as any).doseRecords) && (medicationDetails as any).doseRecords.length > 0
              ? (medicationDetails as any).doseRecords.length
              : 1)
    };
    
    
    
    const doseSchedule = generateDoseSchedule(normalizedMedicationDetails);
    
    // Use the breakdown if available, otherwise fall back to schedule calculation
    let totalDoses;
    if (normalizedMedicationDetails.originalDoses && normalizedMedicationDetails.extendedDoses) {
      totalDoses = normalizedMedicationDetails.originalDoses + normalizedMedicationDetails.extendedDoses;
    } else {
      totalDoses = doseSchedule.reduce((total, day) => total + day.timeSlots.length, 0);
    }
    const administeredDoses = doseSchedule.reduce((total, day) => 
      total + day.timeSlots.filter(slot => slot.administered).length, 0
    );
    const missedDoses = doseSchedule.reduce((total, day) => 
      total + day.timeSlots.filter(slot => slot.missed).length, 0
    );
    
    // Payment Authorization UI Upgrade
    const paymentAuth = (task as any).paymentAuthorization;
    const getPaymentStatusBadge = () => {
      // Prefer task paymentAuthorization; fallback to invoice matched by patient+med; then notification by id/name
      const medKey = `${String(task.patientId)}|${(normalizedMedicationDetails.medicationName||'').toString().toLowerCase()}`;
      const fallbackKey = paymentInfoByPatient[String(task.patientId)] ? String(task.patientId) : `name:${(task.patientName||'').toLowerCase()}`;
      const status = (paymentAuth?.paymentStatus || paymentInfoByPatientMed[medKey]?.paymentStatus || paymentInfoByPatient[fallbackKey]?.paymentStatus || '').toLowerCase();
      let color = 'bg-muted/30 text-muted-foreground';
      let label = 'Payment';
      let icon = <Info className="w-3.5 h-3.5 mr-1" />;

      if (status === 'fully_paid' || status === 'paid') {
        color = 'bg-primary/20 text-primary border border-primary/40';
        label = 'Fully Paid';
        icon = <CheckCircle className="w-3.5 h-3.5 mr-1 text-primary" />;
      } else if (status === 'partially_paid' || status === 'partial') {
        color = 'bg-accent/20 text-accent-foreground border border-yellow-300';
        label = 'Partial';
        icon = <AlertTriangle className="w-3.5 h-3.5 mr-1 text-accent-foreground" />;
      }

      const isRecentlyUpdated = paymentAuth?.lastUpdated &&
        new Date(paymentAuth.lastUpdated).getTime() > lastPaymentUpdate.getTime() - 10000;

      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${color} ml-2 ${isRecentlyUpdated ? 'animate-pulse ring-2 ring-blue-400' : ''}`}>
          {icon}{label}
        </span>
      );
    };

    // Compact amount badge to surface payment in the header line
    const getPaymentAmountBadge = () => {
      // Prefer task authorization; fallback to invoice matched by patient+med; then notification by patient
      const medKey = `${String(task.patientId)}|${(normalizedMedicationDetails.medicationName||'').toString().toLowerCase()}`;
      const byMed = paymentInfoByPatientMed[medKey] || null;
      const byPatient = paymentInfoByPatient[String(task.patientId)] || null;
      const dueVal = paymentAuth && typeof paymentAuth.outstandingAmount === 'number'
        ? (paymentAuth.outstandingAmount as number)
        : (typeof byMed?.outstandingAmount === 'number'
            ? byMed!.outstandingAmount as number
            : (typeof byPatient?.outstandingAmount === 'number' ? byPatient!.outstandingAmount as number : 0));
      const paidVal = (paymentAuth && typeof (paymentAuth as any).amountPaid === 'number')
        ? (paymentAuth as any).amountPaid as number
        : (typeof byMed?.amountPaid === 'number'
            ? byMed!.amountPaid as number
            : (typeof byPatient?.amountPaid === 'number' ? byPatient!.amountPaid as number : null));

      if (paidVal !== null || (dueVal || 0) > 0) {
        return (
          <span className="ml-2 inline-flex items-center gap-1">
            {paidVal !== null && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary border border-primary/40">
                ETB {Number(paidVal).toFixed(0)} paid
              </span>
            )}
            {(dueVal || 0) > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/20 text-destructive border border-destructive/40">
                ETB {Number(dueVal).toFixed(0)} due
              </span>
            )}
          </span>
        );
      }
      return null;
    };
    
    return (
      <div
        key={getTaskId(task)}
        className="medication-card bg-primary-foreground border border-border/30 hover:bg-muted/10 transition-all duration-200 rounded-lg shadow-sm"
      >
        <div className="p-3">
          {/* Compact Medication Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 rounded ${getPriorityColor(task.priority)}`}>
                <Pill className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-muted-foreground text-sm truncate flex items-center">
                  {normalizedMedicationDetails.medicationName}
                  {/* Small Delete Icon */}
                  <button
                    onClick={() => handleDeleteMedication(getTaskId(task), normalizedMedicationDetails.medicationName)}
                    className="ml-2 p-1.5 rounded-full hover:bg-red-100 transition-colors border border-red-200"
                    title={`Delete medication: ${normalizedMedicationDetails.medicationName}`}
                  >
                    <Trash2 size={16} className="text-red-600 hover:text-red-800" />
                  </button>
                  {getPaymentStatusBadge()}
                  {getPaymentAmountBadge()}
                </h3>
                {/* Always show a faint placeholder so nurses see the slot */}
                {!paymentAuth && !paymentInfoByPatient[String(task.patientId)] && (
                  <div className="text-[10px] text-muted-foreground/50">Payment: —</div>
                )}
                <div className="text-xs text-muted-foreground flex items-center space-x-2">
                  <span className="font-medium">{normalizedMedicationDetails.dosage}</span>
                  <span>•</span>
                  <span>{normalizedMedicationDetails.route}</span>
                  <span>•</span>
                  <span className="hidden sm:inline">{normalizedMedicationDetails.frequency}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{normalizedMedicationDetails.duration}d</span>
                </div>
                {/* Payment Details Row */}
                {paymentAuth && (
                  <div className="flex flex-wrap items-center mt-1 space-x-2">
                    <span className="text-xs text-muted-foreground font-medium flex items-center">
                      <DollarSign className="w-3 h-3 mr-1 text-primary" />
                      {(() => {
                        /*
                          Robust paid-dose calculation:
                          1) Prefer explicit dose counts from paymentAuth (authorized/unauthorized).
                          2) Otherwise derive dose counts from paidDays / totalDays × dosesPerDay.
                        */

                        // Helper to parse doses per day from frequency text (very defensive)
                        const parseDosesPerDay = (freq: string | undefined): number => {
                          if (!freq) return 1;
                          const f = freq.toLowerCase();
                          if (f.includes('bid') || f.includes('twice')) return 2;
                          if (f.includes('tid') || f.includes('three')) return 3;
                          if (f.includes('qid') || f.includes('four')) return 4;
                          if (f.includes('once')) return 1;
                          const match = f.match(/(\d+)\s*times?/);
                          if (match) return parseInt(match[1], 10);
                          return 1;
                        };

                        // Try explicit dose counts first
                        if (typeof paymentAuth.authorizedDoses === 'number' && typeof paymentAuth.unauthorizedDoses === 'number') {
                          const totalDoses = paymentAuth.authorizedDoses + paymentAuth.unauthorizedDoses;
                          // Guard against incorrect data where unauthorizedDoses is 0 but outstandingAmount > 0
                          if (paymentAuth.outstandingAmount > 0 && paymentAuth.authorizedDoses === totalDoses) {
                            // Fall through to the derived calculation below instead of showing misleading 100% paid
                          } else {
                            return `${paymentAuth.authorizedDoses} paid of ${totalDoses}`;
                          }
                        }

                        // Fallback: derive from days × dosesPerDay
                        const dosesPerDay = parseDosesPerDay(normalizedMedicationDetails.frequency);
                        const paidDays = paymentAuth.paidDays || 0;
                        const totalDays = paymentAuth.totalDays || normalizedMedicationDetails.duration || 1;
                        const paidDoses = paidDays * dosesPerDay;
                        const totalDoses = totalDays * dosesPerDay;
                        return `${paidDoses} paid of ${totalDoses}`;
                      })()}
                    </span>
                    {paymentAuth.outstandingAmount > 0 && (
                      <span className={`text-xs font-medium flex items-center ${
                        paymentAuth.outstandingAmount < (paymentAuth.outstandingAmount || 0) ? 'text-primary' : 'text-destructive'
                      }`}>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        ETB {paymentAuth.outstandingAmount.toFixed(2)} due
                        {paymentAuth.lastUpdated && (
                          <span className="ml-1 text-xs opacity-75">
                            (Updated: {format(new Date(paymentAuth.lastUpdated), 'HH:mm')})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Compact Progress Summary */}
            <div className="text-right ml-2">
              <div className="text-sm font-bold text-muted-foreground">
                {(() => {
                  // Check if we have extension details to show breakdown
                  const medicationDetails = task.medicationDetails;
                  if (medicationDetails?.originalDoses && medicationDetails?.extendedDoses) {
                    return `${medicationDetails.originalDoses + medicationDetails.extendedDoses}/${medicationDetails.originalDoses + medicationDetails.extendedDoses}`;
                  }
                  // Fallback to original logic
                  if (paymentAuth && typeof paymentAuth.authorizedDoses === 'number') {
                    return `${paymentAuth.authorizedDoses}/${totalDoses}`;
                  }
                  return `${administeredDoses}/${totalDoses}`;
                })()}
              </div>
              <div className="text-xs text-muted-foreground">doses</div>
              {/* Show breakdown if available */}
              {task.medicationDetails?.originalDoses && task.medicationDetails?.extendedDoses && (
                <div className="text-xs text-muted-foreground mt-1">
                  <div className="font-medium">Active: {task.medicationDetails.originalDoses}</div>
                  <div className="font-medium">Extended: {task.medicationDetails.extendedDoses}</div>
                </div>
              )}
              {/* Show payment figures next to the dose counter to surface in the heading area */}
              {(paymentAuth || paymentInfoByPatient[String(task.patientId)] || paymentInfoByPatient[`name:${(task.patientName||'').toLowerCase()}`]) && (
                <div className="mt-0.5 text-[11px] leading-tight">
                  {(() => {
                    const fallback = paymentInfoByPatient[String(task.patientId)] || paymentInfoByPatient[`name:${(task.patientName||'').toLowerCase()}`] || null;
                    const hasDue = paymentAuth ? typeof paymentAuth.outstandingAmount === 'number' : typeof fallback?.outstandingAmount === 'number';
                    const dueVal = paymentAuth ? (paymentAuth.outstandingAmount as number) : (fallback?.outstandingAmount as number);
                    let paidVal: number | null = null;
                    if (paymentAuth && typeof (paymentAuth as any).amountPaid === 'number') {
                      paidVal = (paymentAuth as any).amountPaid as number;
                    } else if (fallback && typeof fallback.amountPaid === 'number') {
                      paidVal = fallback.amountPaid as number;
                    }
                    return (
                      <div className="flex flex-col items-end gap-0.5">
                        {paidVal !== null && <span className="text-primary font-semibold">Paid: ETB {paidVal.toFixed(0)}</span>}
                        {hasDue && (dueVal as number) > 0 && (
                          <span className="text-destructive font-semibold">Due: ETB {(dueVal as number).toFixed(0)}</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              {missedDoses > 0 && (
                <div className="text-xs text-destructive font-medium">
                  {missedDoses} missed
                </div>
              )}
            </div>
          </div>
          
          {/* Added overflow-x-auto wrapper to enable horizontal scrolling when the schedule is wider than the viewport */}
          <div className="border border-border/30 rounded-md p-1.5 overflow-x-auto">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Medication Schedule</div>
            {/* Ensure the inner flex grid preserves its intrinsic width so the outer container can scroll horizontally */}
            <div className="medication-schedule-grid min-w-max">
              {doseSchedule.map((daySchedule) => (
                <div key={daySchedule.day} className={`medication-day-column ${isToday(daySchedule.date) ? 'today' : ''}`}>
                  <div className="medication-day-header">
                    <div className="text-xs font-bold text-muted-foreground mb-1">
                      Day {daySchedule.day}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {(() => {
                        try {
                          return daySchedule.date && !isNaN(daySchedule.date.getTime()) ? 
                            format(daySchedule.date, 'MMM dd') : 
                            'Invalid Date';
                        } catch (error) {
                          console.error('Error formatting day schedule date:', error);
                          return 'Date Error';
                        }
                      })()}
                    </div>
                    {(() => {
                      try {
                        return daySchedule.date && !isNaN(daySchedule.date.getTime()) && isToday(daySchedule.date) && (
                          <div className="text-xs text-primary font-medium mb-1">Today</div>
                        );
                      } catch (error) {
                        console.error('Error checking if date is today:', error);
                        return null;
                      }
                    })()}
                  </div>
                  
                  {/* Time slots for this day */}
                  <div className="medication-time-slots">
                    {daySchedule.timeSlots.map((timeSlot, slotIndex) => (
                      <button
                        key={`${daySchedule.day}-${slotIndex}`}
                        onClick={() => {
                          try {
                            const isTodayDose = daySchedule.date && !isNaN(daySchedule.date.getTime()) && isToday(daySchedule.date);
                            const doseKey = `${getTaskId(task)}-${daySchedule.day}-${standardizeTimeSlot(timeSlot.time)}`;
                            
                            // Check server data and processing state
                            const isAlreadyAdministered = timeSlot.administered;
                            const isBeingProcessed = processedDoses.has(doseKey);
                            
                            console.log('🔍 [BUTTON DEBUG] Dose button clicked:', {
                              taskId: getTaskId(task),
                              day: daySchedule.day,
                              timeSlot: timeSlot.time,
                              medicationName: normalizedMedicationDetails.medicationName,
                              isAlreadyAdministered,
                              isBeingProcessed,
                              isTodayDose,
                              doseKey,
                              timeSlotData: timeSlot,
                              processedDosesSize: processedDoses.size,
                              processedDosesArray: Array.from(processedDoses)
                            });
                            
                            // Payment check
                            const paymentAuth = (task as any).paymentAuthorization;
                            let isUnpaid = false;

                            if (paymentAuth && paymentAuth.paymentStatus !== 'fully_paid') {
                              if (typeof paymentAuth.authorizedDoses === 'number') {
                                let cumulativeDoseNumber = 0;
                                const md = task.medicationDetails;
                                if (md && md.doseSchedule) {
                                  for (const ds of md.doseSchedule) {
                                    if (ds.day < daySchedule.day) {
                                      cumulativeDoseNumber += (ds.timeSlots?.length || 0);
                                    } else if (ds.day === daySchedule.day) {
                                      if (ds.timeSlots && Array.isArray(ds.timeSlots)) {
                                        for (const ts of ds.timeSlots) {
                                          cumulativeDoseNumber += 1;
                                          if (standardizeTimeSlot(ts.time) === standardizeTimeSlot(timeSlot.time)) {
                                            break;
                                          }
                                        }
                                      }
                                      break;
                                    }
                                  }
                                }
                                if (cumulativeDoseNumber === 0 && md?.doseRecords) {
                                  cumulativeDoseNumber = md.doseRecords.filter(r => r.administered).length + 1;
                                }
                                isUnpaid = cumulativeDoseNumber > (paymentAuth.authorizedDoses || 0);
                              } else if (typeof paymentAuth.paidDays === 'number') {
                                isUnpaid = paymentAuth.paidDays < daySchedule.day;
                              }
                            }

                            // Check sequential dosing restrictions
                            const sequentialCheck = canAdministerDoseSequentially(task, tasks, normalizedMedicationDetails);
                            
                            if (!isAlreadyAdministered && !isBeingProcessed && isTodayDose && !isUnpaid && sequentialCheck.canAdminister) {
                              console.log('✅ [BUTTON DEBUG] Opening medication modal');
                              toast.success(`Clicked ${timeSlot.label} ${timeSlot.time} for Day ${daySchedule.day}`);
                              setSelectedDose({
                                taskId: getTaskId(task),
                                day: daySchedule.day,
                                timeSlot: timeSlot.time,
                                medicationName: normalizedMedicationDetails.medicationName
                              });
                              setShowMedicationModal(true);
                            } else if (!sequentialCheck.canAdminister) {
                              console.log('🚫 [BUTTON DEBUG] Sequential dosing restriction:', sequentialCheck.reason);
                              toast.error(sequentialCheck.reason || 'Cannot administer this dose yet');
                            } else if (isUnpaid) {
                              const msg = paymentAuth && typeof paymentAuth.authorizedDoses === 'number'
                                ? `Payment required - only ${paymentAuth.authorizedDoses} doses authorized`
                                : 'Payment required before administering this dose';
                              toast.error(msg);
                            } else if (isAlreadyAdministered) {
                              console.log('🚫 [BUTTON DEBUG] Dose already administered, ignoring click');
                            } else if (isBeingProcessed) {
                              console.log('🚫 [BUTTON DEBUG] Dose being processed, ignoring click');
                            } else if (!isTodayDose) {
                              console.log('🚫 [BUTTON DEBUG] Not today\'s dose, ignoring click');
                              toast.error(`Can only administer today's doses. This is for ${format(daySchedule.date, 'MMM dd, yyyy')}`);
                            }
                          } catch (error) {
                            console.error('Error handling dose administration click:', error);
                          }
                        }}
                        className={(() => {
                          try {
                            const isAlreadyAdministered = timeSlot.administered;
                            const doseKey = `${getTaskId(task)}-${daySchedule.day}-${standardizeTimeSlot(timeSlot.time)}`;
                            const isBeingProcessed = processedDoses.has(doseKey);
                            const isNotToday = !daySchedule.date || isNaN(daySchedule.date.getTime()) || !isToday(daySchedule.date);
                            
                            // Check for sequential medication instance restriction
                            const sequentialCheck = canAdministerDoseSequentially(task, tasks, normalizedMedicationDetails);
                            const cannotAdministerSequentially = !sequentialCheck.canAdminister;
                            
                            // Check for consecutive day administration within the same instance
                            let cannotAdministerConsecutively = false;
                            if (daySchedule.day > 1) {
                              for (let prevDay = 1; prevDay < daySchedule.day; prevDay++) {
                                const prevDaySchedule = doseSchedule.find(ds => ds.day === prevDay);
                                if (prevDaySchedule) {
                                  const incompleteDoses = prevDaySchedule.timeSlots.filter(ts => !ts.administered);
                                  if (incompleteDoses.length > 0) {
                                    const overdueDoses = incompleteDoses.filter(ts => {
                                      const prevDoseDate = new Date(prevDaySchedule.date);
                                      const currentTime = new Date();
                                      return (currentTime.getTime() - prevDoseDate.getTime()) > (24 * 60 * 60 * 1000);
                                    });
                                    
                                    if (overdueDoses.length === 0) {
                                      cannotAdministerConsecutively = true;
                                      break;
                                    }
                                  }
                                }
                              }
                            }
                            
                            // Check payment status
                            let isUnpaid = false;
                            if (paymentAuth) {
                              if (typeof paymentAuth.authorizedDoses === 'number') {
                                let cumulativeDoseNumber = 0;
                                for (const ds of doseSchedule) {
                                  if (ds.day <= daySchedule.day) {
                                    if (ds.timeSlots && Array.isArray(ds.timeSlots)) {
                                      for (const ts of ds.timeSlots) {
                                        cumulativeDoseNumber += 1;
                                        if (standardizeTimeSlot(ts.time) === standardizeTimeSlot(timeSlot.time)) {
                                          break;
                                        }
                                      }
                                    }
                                    break;
                                  }
                                }
                                if (cumulativeDoseNumber === 0 && normalizedMedicationDetails.doseRecords) {
                                  cumulativeDoseNumber = normalizedMedicationDetails.doseRecords.filter(r => r.administered).length + 1;
                                }
                                isUnpaid = cumulativeDoseNumber > (paymentAuth.authorizedDoses || 0);
                              } else if (typeof paymentAuth.paidDays === 'number') {
                                isUnpaid = paymentAuth.paidDays < daySchedule.day;
                              }
                            }
                            
                            return getDoseButtonClass(
                              isAlreadyAdministered,
                              isBeingProcessed,
                              timeSlot,
                              isNotToday,
                              isUnpaid,
                              cannotAdministerSequentially,
                              cannotAdministerConsecutively
                            );
                          } catch (error) {
                            console.error('Error determining button style:', error);
                            return 'w-full p-0.5 rounded text-xs font-medium transition-all duration-200 min-h-[24px] flex flex-col items-center justify-center bg-muted/10 border border-border/40 text-muted-foreground';
                          }
                        })()}
                        disabled={(() => {
                          try {
                            const isAlreadyAdministered = timeSlot.administered;
                            const doseKey = `${getTaskId(task)}-${daySchedule.day}-${standardizeTimeSlot(timeSlot.time)}`;
                            const isBeingProcessed = processedDoses.has(doseKey);
                            const isNotToday = !daySchedule.date || isNaN(daySchedule.date.getTime()) || !isToday(daySchedule.date);
                            
                            // Check for consecutive administration restriction
                            let cannotAdministerConsecutively = false;
                            if (daySchedule.day > 1) {
                              for (let prevDay = 1; prevDay < daySchedule.day; prevDay++) {
                                const prevDaySchedule = doseSchedule.find(ds => ds.day === prevDay);
                                if (prevDaySchedule) {
                                  const incompleteDoses = prevDaySchedule.timeSlots.filter(ts => !ts.administered);
                                  if (incompleteDoses.length > 0) {
                                    const overdueDoses = incompleteDoses.filter(ts => {
                                      const prevDoseDate = new Date(prevDaySchedule.date);
                                      const currentTime = new Date();
                                      return (currentTime.getTime() - prevDoseDate.getTime()) > (24 * 60 * 60 * 1000);
                                    });
                                    
                                    if (overdueDoses.length === 0) {
                                      cannotAdministerConsecutively = true;
                                      break;
                                    }
                                  }
                                }
                              }
                            }
                            
                            // ---------------- Payment Authorization ----------------
                            const paymentAuth = (task as any).paymentAuthorization;
                            let isUnpaid = false;

                            if (paymentAuth && paymentAuth.paymentStatus !== 'fully_paid') {
                              // If authorizedDoses is provided, use dose-level validation
                              if (typeof paymentAuth.authorizedDoses === 'number') {
                                let cumulativeDoseNumber = 0;
                                const md = task.medicationDetails;

                                if (md && md.doseSchedule) {
                                  for (const ds of md.doseSchedule) {
                                    if (ds.day < daySchedule.day) {
                                      cumulativeDoseNumber += (ds.timeSlots?.length || 0);
                                    } else if (ds.day === daySchedule.day) {
                                      if (ds.timeSlots && Array.isArray(ds.timeSlots)) {
                                        for (const ts of ds.timeSlots) {
                                          cumulativeDoseNumber += 1;
                                          if (standardizeTimeSlot(ts.time) === standardizeTimeSlot(timeSlot.time)) {
                                            break;
                                          }
                                        }
                                      }
                                      break;
                                    }
                                  }
                                }

                                // Fallback to administered dose count if schedule missing
                                if (cumulativeDoseNumber === 0 && md?.doseRecords) {
                                  cumulativeDoseNumber = md.doseRecords.filter(r => r.administered).length + 1;
                                }

                                isUnpaid = cumulativeDoseNumber > (paymentAuth.authorizedDoses || 0);
                              } else if (typeof paymentAuth.paidDays === 'number') {
                                // Day-level validation fallback
                                isUnpaid = paymentAuth.paidDays < daySchedule.day;
                              }
                            }

                            return isAlreadyAdministered || isBeingProcessed || isNotToday || justClickedDoseKey === doseKey || isUnpaid || cannotAdministerConsecutively;
                          } catch (error) {
                            console.error('Error checking disabled state:', error);
                            return true; // Disable on error
                          }
                        })()}
                        title={(() => {
                          try {
                            const isAlreadyAdministered = timeSlot.administered;
                            const doseKey = `${getTaskId(task)}-${daySchedule.day}-${standardizeTimeSlot(timeSlot.time)}`;
                            const isBeingProcessed = processedDoses.has(doseKey);
                            const administeredAt = timeSlot.administeredAt;
                            
                            if (isAlreadyAdministered) {
                                try {
                                if (!administeredAt) return 'Administered';
                                const adminDate = administeredAt instanceof Date 
                                  ? administeredAt 
                                  : new Date(administeredAt);
                                return !isNaN(adminDate.getTime()) ? `Administered at ${format(adminDate, 'HH:mm')}` : 'Administered';
                                } catch (error) {
                                  console.error('Error formatting administered time:', error);
                                return 'Administered';
                                }
                            } else if (isBeingProcessed) {
                              return 'Processing... Please wait';
                            } else if (timeSlot.missed) {
                              return 'Missed dose';
                            } else {
                              // Payment validation for tooltip
                              const paymentAuth = (task as any).paymentAuthorization;
                              let isUnpaid = false;

                              if (paymentAuth && paymentAuth.paymentStatus?.toLowerCase() !== 'fully_paid' && paymentAuth.paymentStatus?.toLowerCase() !== 'paid') {
                                if (typeof paymentAuth.authorizedDoses === 'number') {
                                  let cumulativeDoseNumber = 0;
                                  const md = task.medicationDetails;
                                  if (md && md.doseSchedule) {
                                    for (const ds of md.doseSchedule) {
                                      if (ds.day < daySchedule.day) {
                                        cumulativeDoseNumber += (ds.timeSlots?.length || 0);
                                      } else if (ds.day === daySchedule.day) {
                                        if (ds.timeSlots && Array.isArray(ds.timeSlots)) {
                                          for (const ts of ds.timeSlots) {
                                            cumulativeDoseNumber += 1;
                                            if (standardizeTimeSlot(ts.time) === standardizeTimeSlot(timeSlot.time)) {
                                              break;
                                            }
                                          }
                                        }
                                        break;
                                      }
                                    }
                                  }
                                  if (cumulativeDoseNumber === 0 && md?.doseRecords) {
                                    cumulativeDoseNumber = md.doseRecords.filter(r => r.administered).length + 1;
                                  }
                                  isUnpaid = cumulativeDoseNumber > (paymentAuth.authorizedDoses || 0);
                                } else if (typeof paymentAuth.paidDays === 'number') {
                                  isUnpaid = paymentAuth.paidDays < daySchedule.day;
                                }
                              }

                              if (isUnpaid) {
                                return paymentAuth && typeof paymentAuth.authorizedDoses === 'number' ? `Payment required - only ${paymentAuth.authorizedDoses} doses authorized` : 'Payment required';
                              }
                            }

                            if (timeSlot.overdue) {
                               return 'Overdue - Click to administer';
                             } else {
                                try {
                                  return isToday(daySchedule.date) ? 'Click to administer' : 'Dose not due yet';
                                } catch (error) {
                                  console.error('Error checking if today for tooltip:', error);
                                  return 'Dose not due yet';
                                }
                            }
                          } catch (error) {
                            console.error('Error determining tooltip:', error);
                            return 'Dose';
                          }
                        })()}
                      >
                        <div className="text-xs font-bold leading-tight">{timeSlot.label}</div>
                        <div className="text-xs font-bold opacity-90 leading-tight">{timeSlot.time}</div>
                        {!timeSlot.administered && !timeSlot.missed && !timeSlot.overdue && (
                          <div className="text-xs font-semibold text-primary leading-tight mt-0.5">Give Dose</div>
                        )}
                        <div className="mt-0.5">
                          {(() => {
                            try {
                              // FIXED: Only check server data for icon consistency
                              const isAlreadyAdministered = timeSlot.administered;
                              
                              if (isAlreadyAdministered) {
                                return <CheckCircle className="w-2 h-2 text-primary" />;
                              } else if (timeSlot.missed) {
                                return <XCircle className="w-2 h-2 text-destructive" />;
                              } else if (timeSlot.overdue) {
                                return <AlertTriangle className="w-2 h-2 text-accent-foreground" />;
                              } else {
                                return <Square className="w-2 h-2 text-muted-foreground/50" />;
                              }
                            } catch (error) {
                              console.error('Error determining icon:', error);
                              return <Square className="w-2 h-2 text-muted-foreground/50" />;
                            }
                          })()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Compact Instructions */}
          {task.medicationDetails?.instructions && (
            <div className="mt-2 p-2 bg-primary/10 rounded-md">
              <div className="flex items-start space-x-1.5">
                <Info className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-primary text-xs">Instructions</div>
                  <div className="text-primary text-xs mt-0.5 leading-relaxed">
                    {task.medicationDetails?.instructions}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render functions
  const renderTaskCard = (task: NurseTask) => (
    <div
      key={getTaskId(task)}
      className="task-item bg-primary-foreground border border-border/30 hover:bg-muted/10 transition-all duration-200 rounded-lg"
    >
      <div className="p-3">
        {/* Compact Task Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {/* Checkbox for completion */}
            <div className="flex-shrink-0">
              {task.status === 'COMPLETED' ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : (
                <button
                  onClick={() => handleCompleteTask(getTaskId(task))}
                  className="w-5 h-5 border-2 border-border/40 rounded hover:border-primary hover:bg-primary/10 transition-colors duration-200 flex items-center justify-center"
                  title="Complete task"
                >
                  {task.status === 'IN_PROGRESS' && (
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </button>
              )}
            </div>

            {/* Task Type Icon */}
            <div className={`p-1.5 rounded ${getPriorityColor(task.priority)} flex-shrink-0`}>
              {getTaskTypeIcon(task.taskType)}
            </div>

            {/* Task Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-muted-foreground text-sm truncate">
                  {task.description}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)} flex-shrink-0`}>
                  {task.status}
                </span>
              </div>
              
              <div className="mt-1 text-xs text-muted-foreground flex items-center space-x-2">
                <Clock className="w-3 h-3" />
                <span>Due {formatRelativeDate(task.dueDate)}</span>
                <span>•</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
            <button
              onClick={() => {
                setSelectedTask(task);
                setShowTaskModal(true);
              }}
              className="p-1.5 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded transition-colors duration-200"
              title="View details"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPatientGroup = (group: TaskGroup) => (
    <div key={group.patientId} className="mb-3">
      {/* Patient Header - Extra Compact */}
      <div 
        className="patient-header bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg p-2.5 cursor-pointer"
        onClick={() => {
          setTaskGroups(prev => prev.map(g => 
            g.patientId === group.patientId 
              ? { ...g, expanded: !g.expanded }
              : g
          ));
        }}
      >
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="flex items-center space-x-2">
            <div className="patient-avatar w-7 h-7 bg-primary-foreground bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {group.patientInfo.firstName} {group.patientInfo.lastName}
              </h2>
              <div className="flex items-center space-x-2 text-primary/20 text-xs">
                {group.patientInfo.age && (
                  <span>{group.patientInfo.age}y</span>
                )}
                <span>{group.patientInfo.gender}</span>
                {group.patientInfo.roomNumber && (
                  <span className="flex items-center">
                    <MapPin className="w-2.5 h-2.5 mr-0.5" />
                    {group.patientInfo.roomNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="task-count text-base font-bold">{group.tasks.length}</div>
              <div className="text-primary/20 text-xs">
                {group.tasks.length === 1 ? 'Task' : 'Tasks'}
              </div>
            </div>
            {group.expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
        
        {/* Patient Details - Ultra Compact */}
        {group.patientInfo.diagnosis && (
          <div className="mt-2 pt-2 border-t border-primary border-opacity-30">
            <div className="text-primary/20 text-xs">
              <span className="font-medium">Dx:</span>
              <span className="ml-1">{group.patientInfo.diagnosis}</span>
              {group.patientInfo.allergies && group.patientInfo.allergies.length > 0 && (
                <>
                  <span className="mx-1">•</span>
                  <span className="font-medium">Allergies:</span>
                  <span className="ml-1">{group.patientInfo.allergies.join(', ')}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Tasks - Compact Medication Cards */}
      {group.expanded && (
        <div className="bg-muted/10 rounded-b-lg p-2 space-y-2">
          {group.tasks.map(task => 
            task.taskType === 'MEDICATION' 
              ? renderMedicationCard(task)
              : renderTaskCard(task)
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/10 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading nurse tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/10 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">Error Loading Tasks</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchTasks}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors duration-200"
          >
            Try Again
          </button>
          <button
            onClick={forceRefresh}
            className="ml-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors duration-200"
          >
            Force Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nurse-tasks-container min-h-screen bg-muted/10">
      {/* Compact Header */}
      <div className="bg-primary-foreground shadow-sm border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3">
              <CheckSquare className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-muted-foreground">Medication Checklist</h1>
              <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium">
                {getFilteredTasks().length} of {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              </span>
              {/* Active filters indicator */}
              {(searchQuery || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedTaskType !== 'ALL') && (
                <span className="px-2 py-1 bg-accent/20 text-accent-foreground rounded-full text-xs font-medium">
                  Filtered
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Payment status update indicator */}
              {paymentStatusChanged && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium animate-pulse">
                  <CheckCircle className="w-3 h-3" />
                  <span>Payment Updated</span>
                </div>
              )}
              
              <button
                onClick={() => {
                  toast.success('🔄 Refreshing payment status...');
                  forceRefresh();
                }}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  paymentStatusChanged 
                    ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                    : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'
                }`}
                title="Refresh payment status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded transition-colors duration-200 ${
                  showFilters 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                }`}
                title="Toggle filters"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="bg-primary-foreground rounded-lg shadow-sm border border-border/30 p-3 mb-3">
          {/* Compact Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 w-4 h-4" />
            <input
              type="text"
              placeholder="Search patients or medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border/40 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Compact Filters */}
          {showFilters && (
            <div className="pt-3 border-t border-border/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center space-x-1">
                  <Activity className="w-3 h-3" />
                  <span>Status</span>
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-border/40 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-primary-foreground"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Priority</span>
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-border/40 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-primary-foreground"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>Task Type</span>
                </label>
                <select
                  value={selectedTaskType}
                  onChange={(e) => setSelectedTaskType(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-border/40 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-primary-foreground"
                >
                  <option value="ALL">All Types</option>
                  <option value="MEDICATION">Medication</option>
                  <option value="VITAL_SIGNS">Vital Signs</option>
                  <option value="ASSESSMENT">Assessment</option>
                  <option value="PROCEDURE">Procedure</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              </div>
              
              {/* Clear Filters Button */}
              <div className="flex justify-end mt-3">
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-muted-foreground border border-border/40 hover:border-border/50 rounded transition-colors duration-200 flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Filters</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Task Groups - Checklist Style */}
        {taskGroups.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No tasks found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedTaskType !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'No medication tasks available at the moment'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {taskGroups.map(renderPatientGroup)}
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-primary-foreground rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-muted-foreground">Task Details</h2>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="p-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Task Info */}
                <div>
                  <h3 className="text-lg font-semibold text-muted-foreground mb-3">Task Information</h3>
                  <div className="bg-muted/10 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-muted-foreground">Patient:</span>
                        <p className="text-muted-foreground">{selectedTask.patientName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Type:</span>
                        <p className="text-muted-foreground">{selectedTask.taskType}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Priority:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedTask.priority)}`}>
                          {selectedTask.priority}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedTask.status)}`}>
                          {selectedTask.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Description:</span>
                      <p className="text-muted-foreground mt-1">{selectedTask.description}</p>
                    </div>
                    {selectedTask.notes && (
                      <div>
                        <span className="font-medium text-muted-foreground">Notes:</span>
                        <p className="text-muted-foreground mt-1">{selectedTask.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Medication Details */}
                {selectedTask.medicationDetails && (
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground mb-3">Medication Details</h3>
                    <div className="bg-primary/10 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-muted-foreground">Medication:</span>
                          <p className="text-muted-foreground">{selectedTask.medicationDetails.medicationName}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Dosage:</span>
                          <p className="text-muted-foreground">{selectedTask.medicationDetails.dosage}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Frequency:</span>
                          <p className="text-muted-foreground">{selectedTask.medicationDetails.frequency}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Route:</span>
                          <p className="text-muted-foreground">{selectedTask.medicationDetails.route}</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Instructions:</span>
                        <p className="text-muted-foreground mt-1">{selectedTask.medicationDetails.instructions}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {selectedTask.status === 'PENDING' && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Administration Notes
                    </label>
                    <textarea
                      value={administrationNotes}
                      onChange={(e) => setAdministrationNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter any notes about the task completion..."
                    />
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-border/30">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-muted-foreground bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors duration-200"
                >
                  Close
                </button>
                {selectedTask.status === 'PENDING' && (
                  <button
                    onClick={() => handleCompleteTask(getTaskId(selectedTask))}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Complete Task</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Medication Administration Modal */}
      {showMedicationModal && selectedDose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-primary-foreground rounded-lg shadow-xl max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-muted-foreground">Administer Medication</h2>
                <button
                  onClick={() => {
                    setShowMedicationModal(false);
                    setSelectedDose(null);
                    setAdministrationNotes('');
                  }}
                  className="p-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Compact Medication Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md p-3 border border-primary/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="p-1.5 bg-primary rounded-md">
                      <Pill className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary text-base">
                        {selectedDose.medicationName}
                      </h3>
                      <p className="text-primary text-xs">
                        Day {selectedDose.day} • {selectedDose.timeSlot}
                      </p>
                    </div>
                  </div>
                  
                  {/* Compact medication details */}
                  {(() => {
                    const task = tasks.find(t => getTaskId(t) === selectedDose.taskId);
                    const medicationDetails = task?.medicationDetails;
                    
                    if (medicationDetails) {
                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium text-primary">Dosage:</span>
                            <p className="text-primary">{medicationDetails.dosage}</p>
                          </div>
                          <div>
                            <span className="font-medium text-primary">Route:</span>
                            <p className="text-primary">{medicationDetails.route}</p>
                          </div>
                          <div>
                            <span className="font-medium text-primary">Frequency:</span>
                            <p className="text-primary">{medicationDetails.frequency}</p>
                          </div>
                          <div>
                            <span className="font-medium text-primary">Duration:</span>
                            <p className="text-primary">{medicationDetails.duration}d</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                {/* Compact Safety Checklist */}
                <div className="bg-accent/10 rounded-md p-3 border border-yellow-200">
                  <h4 className="font-semibold text-accent-foreground mb-2 flex items-center text-sm">
                    <AlertTriangle className="w-3 h-3 mr-1.5" />
                    Safety Checklist
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-border/40 w-3 h-3" required />
                      <span className="text-accent-foreground">Right patient verified</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-border/40 w-3 h-3" required />
                      <span className="text-accent-foreground">Right medication verified</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-border/40 w-3 h-3" required />
                      <span className="text-accent-foreground">Right dose verified</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-border/40 w-3 h-3" required />
                      <span className="text-accent-foreground">Right route verified</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-border/40 w-3 h-3" required />
                      <span className="text-accent-foreground">Right time verified</span>
                    </label>
                  </div>
                </div>
                
                {/* Compact Administration Notes */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Administration Notes
                  </label>
                  <textarea
                    value={administrationNotes}
                    onChange={(e) => setAdministrationNotes(e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1.5 text-xs border border-border/40 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter any notes about the administration (patient response, side effects, etc.)..."
                  />
                </div>
                
                {/* Compact Current Time Display */}
                <div className="bg-muted/10 rounded-md p-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Administration Time:</span>
                    <span className="ml-1">{format(new Date(), 'MMM dd, yyyy • HH:mm')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-border/30 sticky bottom-0 bg-primary-foreground py-3">
                <button
                  onClick={() => {
                    setShowMedicationModal(false);
                    setSelectedDose(null);
                    setAdministrationNotes('');
                  }}
                  className="px-3 py-1.5 text-muted-foreground bg-muted/20 rounded-md hover:bg-muted/30 transition-colors duration-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={e => {
                    console.log('🔍 [MODAL DEBUG] Confirm Administration button clicked:', {
                      selectedDose,
                      processingDose,
                      processingDoseRef: processingDoseRef.current,
                      administrationNotes
                    });
                    
                    const btn = e.currentTarget as HTMLButtonElement;
                    if (btn.disabled) {
                      console.log('🚫 [MODAL DEBUG] Button already disabled');
                      return; // already disabled
                    }
                    btn.disabled = true; // immediate guard at DOM level
                    console.log('✅ [MODAL DEBUG] Calling handleMedicationAdministration');
                    handleMedicationAdministration();
                  }}
                  disabled={processingDose || processingDoseRef.current}
                  className={`px-4 py-1.5 rounded-md flex items-center space-x-1.5 font-medium text-sm transition-colors duration-200 ${processingDose || processingDoseRef.current ? 'bg-muted/50 cursor-not-allowed' : 'bg-primary hover:bg-primary text-primary-foreground'}`}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>{processingDose ? 'Processing...' : 'Confirm Administration'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vital Signs Modal */}
      {showVitalSignsModal && selectedVitalSignsTask && (
        <VitalSignsForm
          task={selectedVitalSignsTask}
          patient={taskGroups.find(group => 
            group.tasks.some(task => getTaskId(task) === getTaskId(selectedVitalSignsTask))
          )?.patientInfo || {}}
          onSave={handleVitalSignsRecording}
          onCancel={() => {
            setShowVitalSignsModal(false);
            setSelectedVitalSignsTask(null);
          }}
          isOpen={showVitalSignsModal}
        />
      )}
    </div>
  );
};

export default NurseTasksNew;
