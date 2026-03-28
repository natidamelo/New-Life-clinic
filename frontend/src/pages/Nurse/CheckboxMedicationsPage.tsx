import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import nurseTaskService from '../../services/nurseTaskService';
import inventoryService from '../../services/inventoryService';
import { api } from '../../services/api';
import { toast } from 'react-toastify';
import { RefreshCw, Search, Filter, Pill, AlertCircle, Grid3X3, Zap } from 'lucide-react';
import SimplifiedMedicationAdmin from '../../components/nurse/SimplifiedMedicationAdmin';
import prescriptionService, { Prescription } from '../../services/prescriptionService';

interface NurseTask {
  _id?: string;
  id?: string;
  patientId: string;
  patientName: string;
  taskType: string;
  priority: string;
  status: string;
  description: string;
  medicationDetails?: any;
  paymentAuthorization?: any;
  assignedTo?: string;
  assignedBy?: string;
  prescriptionId?: string;
  dueDate?: string;
  createdAt?: string;
  isExtension?: boolean;
  patient?: {
    name?: string;
    fullName?: string;
  };
  medicationName?: string;
}

/** Mongo patient ids sometimes arrive as ObjectId vs string — compare normalized */
const patientIdEquals = (a: string | undefined, b: string | undefined) =>
  String(a || '') === String(b || '');

const CheckboxMedicationsPage: React.FC = () => {
  const { user, getToken } = useAuth();
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [sortField, setSortField] = useState<keyof NurseTask>('patientName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(''); // NEW: Track specific task selection
  const [taskPaymentStatuses, setTaskPaymentStatuses] = useState<{[key: string]: any}>({});
  const [paymentStatusesLoading, setPaymentStatusesLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [fixingPatientDoses, setFixingPatientDoses] = useState(false);

  const [restoringTasks, setRestoringTasks] = useState(false);

  const handleRestoreTasks = async (patientId: string) => {
    setRestoringTasks(true);
    try {
      const res = await api.post('/api/fix-nurse-tasks/restore-missing-tasks', { patientId });
      if (res.data?.success) {
        const { created } = res.data;
        if (created.length > 0) {
          toast.success(`Restored ${created.length} missing medication task(s)`);
          await fetchTasks();
        } else {
          toast.info('No missing tasks found — all medications already have tasks');
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to restore tasks');
    } finally {
      setRestoringTasks(false);
    }
  };

  const handleFixPatientDoses = async (patientId: string) => {
    setFixingPatientDoses(true);
    try {
      const res = await api.post('/api/fix-nurse-tasks/fix-patient-doses', { patientId });
      if (res.data?.success) {
        const { fixed, created, deleted } = res.data;
        const deletedCount = deleted?.length || 0;
        if (fixed.length > 0 || created.length > 0 || deletedCount > 0) {
          const parts = [];
          if (fixed.length > 0) parts.push(`fixed ${fixed.length}`);
          if (created.length > 0) parts.push(`created ${created.length}`);
          if (deletedCount > 0) parts.push(`removed ${deletedCount} duplicate(s)`);
          toast.success(`Tasks updated: ${parts.join(', ')}`);
          await fetchTasks();
        } else {
          toast.info('All dose records are already correct');
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to fix patient doses');
    } finally {
      setFixingPatientDoses(false);
    }
  };

  // Fetch payment statuses for all tasks in a single batch request
  const fetchBatchPaymentStatuses = async (taskList: NurseTask[]): Promise<{[key: string]: any}> => {
    try {
      const batchPayload = taskList
        .filter(task => task.medicationDetails?.medicationName)
        .map(task => {
          const prescriptionId = task.prescriptionId || task.medicationDetails?.prescriptionId || 'unknown';
          const isExtension = task.isExtension || task.medicationDetails?.extensionDetails || false;
          const taskKey = `${task.patientId}-${task.medicationDetails?.medicationName || 'unknown'}-${prescriptionId}-${isExtension ? 'ext' : 'orig'}`;
          return {
            taskKey,
            patientId: task.patientId,
            medicationName: task.medicationDetails?.medicationName,
            prescriptionId: (prescriptionId !== 'unknown' && prescriptionId !== 'Unknown') ? prescriptionId : task.patientId
          };
        });

      if (batchPayload.length === 0) return {};

      const response = await api.post('/api/medication-payment-status/batch', { tasks: batchPayload });
      if (response.data && response.data.success) {
        return response.data.data || {};
      }
      return {};
    } catch (error) {
      console.error('❌ [PAYMENT BATCH] Error fetching batch payment statuses:', error);
      return {};
    }
  };

  // Helper function to get completion status for a single task
  const getTaskCompletionStatus = (task: NurseTask) => {
    const prescriptionId = task.prescriptionId || task.medicationDetails?.prescriptionId || 'unknown';
    const isExtension = task.isExtension || task.medicationDetails?.extensionDetails || false;
    const taskKey = `${task.patientId}-${task.medicationDetails?.medicationName || 'unknown'}-${prescriptionId}-${isExtension ? 'ext' : 'orig'}`;
    const paymentStatus = taskPaymentStatuses[taskKey];
    
    if (paymentStatus) {
      const totalPaid = Number(paymentStatus.totalPaid) || 0;
      const totalCost = Number(paymentStatus.totalCost) || 0;

      let calculatedStatus = paymentStatus.paymentStatus || paymentStatus.status || paymentStatus.overallStatus || 'unpaid';
      if (calculatedStatus === 'partial') calculatedStatus = 'partially_paid';
      else if (calculatedStatus === 'paid') calculatedStatus = 'fully_paid';
      else if (calculatedStatus === 'no_data' || calculatedStatus === 'error') calculatedStatus = 'unpaid';

      if (totalCost > 0) {
        calculatedStatus = totalPaid >= totalCost ? 'fully_paid' : totalPaid > 0 ? 'partially_paid' : 'unpaid';
      } else if (totalPaid > 0 && totalCost === 0) {
        calculatedStatus = 'partially_paid';
      }

      const outstandingAmount = paymentStatus.outstandingAmount !== undefined
        ? Number(paymentStatus.outstandingAmount)
        : Math.max(0, totalCost - totalPaid);

      return {
        paymentStatus: calculatedStatus,
        isCompleted: calculatedStatus === 'fully_paid',
        outstandingAmount: Math.max(0, outstandingAmount),
        totalPaid,
        totalCost
      };
    }

    // Fallback to task payment authorization
    const p = task.paymentAuthorization?.paymentStatus;
    if (p === 'fully_paid') {
      return { paymentStatus: 'fully_paid', isCompleted: true, outstandingAmount: 0, totalPaid: 0, totalCost: 0 };
    }
    if (p === 'partially_paid' || p === 'partial') {
      return { paymentStatus: 'partially_paid', isCompleted: false, outstandingAmount: task.paymentAuthorization?.outstandingAmount || 0, totalPaid: 0, totalCost: 0 };
    }
    return { paymentStatus: 'unpaid', isCompleted: false, outstandingAmount: task.paymentAuthorization?.outstandingAmount || 0, totalPaid: 0, totalCost: 0 };
  };

  const calculateTotalOutstandingAmount = useCallback((tasks: NurseTask[]) => {
    const outstandingAmounts: { [key: string]: number } = {};

    tasks.forEach(task => {
      const patientId = task.patientId;
      const medicationName = task.medicationDetails?.medicationName || 'Unknown';
      const prescriptionId = task.prescriptionId || 'Unknown';
      const isExtension = task.isExtension || task.medicationDetails?.extensionDetails || false;
      const taskKey = `${patientId}-${medicationName}-${prescriptionId}-${isExtension ? 'ext' : 'orig'}`;
      const paymentStatus = taskPaymentStatuses[taskKey];

      if (paymentStatus) {
        if (!outstandingAmounts[patientId]) outstandingAmounts[patientId] = 0;
        const isAtoEliyas = (task.patient?.name || '').toLowerCase().includes('ato eliyas') ||
                            (task.patient?.fullName || '').toLowerCase().includes('ato eliyas');
        const outstandingAmount = paymentStatus.outstandingAmount || 0;

        if (isAtoEliyas) {
          const isIncludedMedication = medicationName === 'Ceftriaxone' &&
            (paymentStatus.status === 'partially_paid' || paymentStatus.status === 'unpaid');
          if (isIncludedMedication) outstandingAmounts[patientId] += outstandingAmount;
        } else {
          outstandingAmounts[patientId] += outstandingAmount;
        }
      }
    });

    return outstandingAmounts;
  }, [taskPaymentStatuses]);

  const loadPatientPrescriptions = async (patientId: string) => {
    try {
      setLoadingPrescriptions(true);
      const token = localStorage.getItem('token') || '';
      const list = await prescriptionService.getByPatient(token, patientId);
      setPrescriptions(list);
    } catch (e) {
      console.error('Failed to load prescriptions:', e);
      setPrescriptions([]);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  // Fetch medication tasks with retry logic and better error handling
  const fetchTasks = async (retryCount = 0) => {
    const maxRetries = 3;

    try {
      setLoading(true);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const timeoutMs = 30000;
      const withTimeout = <T,>(p: Promise<T>) => Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
      ]);

      try {
        const medicationTasks = await withTimeout(
          nurseTaskService.getMedicationTasks(token, { status: undefined })
        );

        // Sort tasks by creation date (most recent first)
        const sortedTasks = medicationTasks.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        // Show tasks immediately, then load payment statuses in the background
        setTasks(sortedTasks);
        setLoading(false);

        setPaymentStatusesLoading(true);
        fetchBatchPaymentStatuses(sortedTasks).then(newPaymentStatuses => {
          setTaskPaymentStatuses(newPaymentStatuses);
          setPaymentStatusesLoading(false);
        }).catch(() => {
          setPaymentStatusesLoading(false);
        });

      } catch (innerError: any) {
        if (innerError.name === 'AbortError' || innerError.message === 'timeout') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw innerError;
      }
    } catch (error: any) {
      console.error('❌ Error fetching medication tasks:', error.response?.data || error.message);

      if (retryCount < maxRetries && (
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.response?.status >= 500
      )) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return fetchTasks(retryCount + 1);
      }

      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You may not have permission to view medication tasks.');
      } else if (error.message?.includes('timeout')) {
        toast.error('Request timed out. Please check your connection and try again.');
      } else {
        toast.error('Failed to load medication tasks. Please try again later.');
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh tasks and payment statuses
  const handleRefresh = async () => {
    setRefreshing(true);
    setTaskPaymentStatuses({});
    await fetchTasks();
    setRefreshing(false);
    toast.success('Medication tasks and payment statuses refreshed');
  };

  // Refresh only payment statuses (faster — no task reload)
  const handleRefreshPayments = async () => {
    if (tasks.length === 0) return;
    setPaymentStatusesLoading(true);
    try {
      const updated = await fetchBatchPaymentStatuses(tasks);
      setTaskPaymentStatuses(updated);
      toast.success('Payment statuses updated from billing');
    } catch {
      toast.error('Failed to refresh payment statuses');
    } finally {
      setPaymentStatusesLoading(false);
    }
  };

  // Handle dose administration — refresh only the affected task to avoid full reload
  const handleDoseAdministered = async (taskId?: string) => {
    if (taskId) {
      try {
        const token = getToken();
        const response = await api.get(`/api/nurse-tasks/${taskId}`);
        const updated = response.data?.data || response.data;
        if (updated && (updated._id || updated.id)) {
          setTasks(prev => prev.map(t => (t._id || t.id) === taskId ? { ...t, ...updated } : t));
          return;
        }
      } catch {
        // fall through to full refresh
      }
    }
    fetchTasks();
  };

  // Determine actual status of a task based on doses administered
  const getActualTaskStatus = (task: NurseTask): string => {
    // Check if task is cancelled first
    if (task.status?.toLowerCase() === 'cancelled') {
      return 'cancelled';
    }
    
    // Check if any doses are in progress or completed
    const administrationSchedule = task.medicationDetails?.administrationSchedule;
    if (administrationSchedule && Array.isArray(administrationSchedule)) {
      const hasAdministered = administrationSchedule.some((dose: any) => dose.administered);
      const hasNotAdministered = administrationSchedule.some((dose: any) => !dose.administered);
      
      if (hasAdministered && hasNotAdministered) {
        return 'in progress';
      }
      
      // Only mark as completed if ALL doses have been administered
      if (hasAdministered && !hasNotAdministered) {
        return 'completed';
      }
    }
    
    // Also check doseRecords (alternative structure)
    const doseRecords = task.medicationDetails?.doseRecords;
    if (doseRecords && Array.isArray(doseRecords)) {
      const hasAdministered = doseRecords.some((dose: any) => dose.administered);
      const hasNotAdministered = doseRecords.some((dose: any) => !dose.administered);
      
      if (hasAdministered && hasNotAdministered) {
        return 'in progress';
      }
      
      // Only mark as completed if ALL doses have been administered
      if (hasAdministered && !hasNotAdministered) {
        return 'completed';
      }
    }
    
    // Check if task is overdue (only for non-completed tasks)
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    if (dueDate && dueDate < new Date() && task.status?.toLowerCase() !== 'completed') {
      return 'overdue';
    }
    
    // Default to pending - payment status does NOT determine task completion
    // A task is only completed when all doses are administered, regardless of payment status
    return task.status?.toLowerCase() || 'pending';
  };

  const filteredTasks = useMemo(() => tasks.filter(task => {
    const matchesSearch = 
      task.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.medicationDetails?.medicationName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Use actual status based on dose administration
    const actualStatus = getActualTaskStatus(task);
    const matchesStatus = statusFilter === 'all' || actualStatus === statusFilter.toLowerCase();
    
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesPatientFilter = selectedPatientFilter === '' || patientIdEquals(task.patientId, selectedPatientFilter);
    
    // NEW: If a specific task is selected, show only that task
    const matchesTaskSelection = selectedTaskId === '' || (task._id || task.id) === selectedTaskId;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesPatientFilter && matchesTaskSelection;
  }), [tasks, searchTerm, statusFilter, priorityFilter, selectedPatientFilter, selectedTaskId]);

  const sortedTasks = useMemo(() => [...filteredTasks].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle nested objects
    if (sortField === 'medicationDetails') {
      aValue = a.medicationDetails?.medicationName || '';
      bValue = b.medicationDetails?.medicationName || '';
    }

    // Convert to string for comparison
    aValue = String(aValue || '').toLowerCase();
    bValue = String(bValue || '').toLowerCase();

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }), [filteredTasks, sortField, sortDirection]);

  const groupedByPatient = useMemo(() => sortedTasks.reduce((groups: Record<string, { patientId: string; patientName: string; tasks: NurseTask[] }>, task) => {
    const key = String(task.patientId);
    if (!groups[key]) {
      groups[key] = { patientId: String(task.patientId), patientName: task.patientName, tasks: [] };
    }
    groups[key].tasks.push(task);
    return groups;
  }, {}), [sortedTasks]);
  const groupedRows = useMemo(() => Object.values(groupedByPatient), [groupedByPatient]);

  // Pagination: latest-first by group, 10 per page
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  // UX: track which patient row is opening to show immediate feedback
  const [openingPatientId, setOpeningPatientId] = useState('');

  // Sort groups by the most recent task timestamp so latest patients appear first
  const groupedRowsSorted = [...groupedRows].sort((a, b) => {
    const aMax = Math.max(
      ...a.tasks.map(t => new Date((t as any).updatedAt || (t as any).lastUpdated || (t as any).lastDoseAt || (t as any).createdAt || 0).getTime())
    );
    const bMax = Math.max(
      ...b.tasks.map(t => new Date((t as any).updatedAt || (t as any).lastUpdated || (t as any).lastDoseAt || (t as any).createdAt || 0).getTime())
    );
    return bMax - aMax;
  });

  const totalPages = Math.max(1, Math.ceil(groupedRowsSorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const groupedRowsPage = groupedRowsSorted.slice(startIndex, startIndex + pageSize);

  // Reset page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, selectedPatientFilter, filteredTasks.length]);

  // Clear opening state once detailed view is active for the selected patient
  useEffect(() => {
    if (openingPatientId && selectedPatientFilter === openingPatientId) {
      // small delay to allow the view switch to render before clearing
      const t = setTimeout(() => setOpeningPatientId(''), 200);
      return () => clearTimeout(t);
    }
  }, [openingPatientId, selectedPatientFilter]);

  // Function to categorize medications with order indicators
  const categorizeMedications = (tasks: NurseTask[]) => {
    const medicationCounts: { [key: string]: number } = {};
    const categorizedMeds: string[] = [];
    
    // Count occurrences of each medication
    tasks.forEach(task => {
      const medName = task.medicationDetails?.medicationName || 'Unknown';
      medicationCounts[medName] = (medicationCounts[medName] || 0) + 1;
    });
    
    // Sort tasks by creation date (oldest first) to determine prescription order
    const sortedTasks = [...tasks].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA.getTime() - dateB.getTime(); // Oldest first
    });
    
    // Create categorized medication names with order indicators based on prescription date
    const processedMeds: { [key: string]: number } = {};
    sortedTasks.forEach(task => {
      const medName = task.medicationDetails?.medicationName || 'Unknown';
      if (!processedMeds[medName]) {
        processedMeds[medName] = 0;
      }
      processedMeds[medName]++;
      
      if (medicationCounts[medName] === 1) {
        // Single medication, no order needed
        categorizedMeds.push(medName);
      } else {
        // Multiple medications, add order indicator based on prescription date
        const order = processedMeds[medName];
        let orderSuffix = '';
        if (order === 1) orderSuffix = '1st';
        else if (order === 2) orderSuffix = '2nd';
        else if (order === 3) orderSuffix = '3rd';
        else orderSuffix = `${order}th`;
        
        categorizedMeds.push(`${medName} ${orderSuffix}`);
      }
    });
    
    return {
      categorizedNames: categorizedMeds.join(', '),
      totalCount: tasks.length,
      uniqueCount: Object.keys(medicationCounts).length
    };
  };

  // Handle sorting
  const handleSort = (field: keyof NurseTask) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: keyof NurseTask }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-primary transition-colors"
    >
      <span>{field === 'medicationDetails' ? 'Medication' : field === 'patientName' ? 'Patient' : field}</span>
      {sortField === field && (
        <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );

  // Handle switching to detailed view for specific task
  const handleAdministerForTask = (task: NurseTask) => {
    setSelectedPatientFilter(task.patientId);
    setSelectedTaskId(task._id || task.id || ''); // Select specific task by ID
    setSearchTerm(''); // Clear search to avoid interference
    toast.success(`Opening ${task.medicationDetails?.frequency} task for ${task.medicationDetails?.medicationName}`);
  };

  // Load tasks on component mount
  useEffect(() => {
    setTaskPaymentStatuses({});
    fetchTasks();
  }, []);

  useEffect(() => {
    if (tasks.length === 0) return;
    const interval = setInterval(async () => {
      try {
        const updated = await fetchBatchPaymentStatuses(tasks);
        setTaskPaymentStatuses(updated);
      } catch { /* silent */ }
    }, 60000);
    return () => clearInterval(interval);
  }, [tasks.length]);

  // Don't reload when status filter changes - filter on frontend only
  // Status filtering is now handled by getActualTaskStatus() in filteredTasks

  useEffect(() => {
    if (selectedPatientFilter) {
      loadPatientPrescriptions(selectedPatientFilter);
    } else {
      setPrescriptions([]);
    }
  }, [selectedPatientFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-7 h-7 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">Loading medication tasks…</p>
          <p className="text-xs text-slate-400 mb-4">This may take a moment</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
            <Pill className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Doctor Medication Administration</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage doctor-prescribed medication schedules</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshPayments}
            disabled={paymentStatusesLoading || refreshing}
            title="Refresh payment statuses from billing"
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${paymentStatusesLoading ? 'animate-spin text-amber-500' : 'text-slate-400'}`} />
            {paymentStatusesLoading ? 'Updating…' : 'Sync Payments'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm shadow-primary/20"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients or medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white text-slate-600"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white text-slate-600"
          >
            <option value="all">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <div className="flex items-center justify-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-sm font-medium text-slate-600">
              {groupedRowsSorted.length} <span className="text-slate-400 font-normal">of</span> {Object.values(tasks.reduce((acc: any, t) => { acc[t.patientId] = true; return acc; }, {})).length} patients
            </span>
          </div>
        </div>
      </div>

      {/* Tasks Display */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">No medication tasks found</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || selectedPatientFilter
              ? 'Try adjusting your filters or search terms.'
              : 'No medication tasks are currently assigned.'
            }
          </p>
          {selectedPatientFilter && (
            <button
              onClick={() => { setSelectedPatientFilter(''); setSelectedTaskId(''); }}
              className="mt-5 px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              Show All Patients
            </button>
          )}
        </div>
      ) : selectedPatientFilter ? (
        // Detailed View for Selected Patient
        <>
          {/* Patient Filter Info + Payment Summary */}
          {(() => {
            const patientTasks = tasks.filter(t => patientIdEquals(t.patientId, selectedPatientFilter));
            const patientStatuses = patientTasks.map(t => getTaskCompletionStatus(t));
            let summaryPaid = 0, summaryCost = 0;
            patientTasks.forEach((task, i) => {
              summaryPaid += patientStatuses[i].totalPaid || 0;
              summaryCost += patientStatuses[i].totalCost || 0;
            });
            const summaryRemaining = Math.max(0, summaryCost - summaryPaid);
            const summaryAllPaid = summaryCost > 0 && summaryPaid >= summaryCost;
            const summaryPartial = !summaryAllPaid && summaryPaid > 0;
            const patientName = tasks.find(t => patientIdEquals(t.patientId, selectedPatientFilter))?.patientName;

            return (
              <div className="mb-5 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-sm gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Pill className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detailed View</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">{patientName}</div>
                  </div>
                </div>

                {/* Payment summary */}
                {summaryCost > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold
                    ${summaryAllPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : summaryPartial ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${summaryAllPaid ? 'bg-emerald-500' : summaryPartial ? 'bg-amber-500' : 'bg-red-500'}`} />
                    {summaryAllPaid ? (
                      <span>Fully Paid · {summaryCost.toFixed(2)} ETB</span>
                    ) : summaryPartial ? (
                      <span>Paid: {summaryPaid.toFixed(2)} / {summaryCost.toFixed(2)} ETB &nbsp;·&nbsp; Remaining: {summaryRemaining.toFixed(2)} ETB</span>
                    ) : (
                      <span>Unpaid · {summaryCost.toFixed(2)} ETB</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setSelectedPatientFilter(''); setSelectedTaskId(''); }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    ← Back to Table
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Render Enhanced UI for selected patient */}
          <div className="grid gap-6 grid-cols-1 w-full">
            {(() => {
              // Get all tasks for this patient
              const patientTasks = tasks.filter(task => patientIdEquals(task.patientId, selectedPatientFilter));
              
              // Categorize medications for this patient
              const medicationCounts: { [key: string]: number } = {};
              const categorizedTasks: { task: any; displayName: string }[] = [];
              
              // Count occurrences of each medication
              patientTasks.forEach(task => {
                const medName = task.medicationDetails?.medicationName || 'Unknown';
                medicationCounts[medName] = (medicationCounts[medName] || 0) + 1;
              });
              
              // Sort tasks by creation date (oldest first) to determine prescription order
              const sortedPatientTasks = [...patientTasks].sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateA.getTime() - dateB.getTime(); // Oldest first
              });
              
              // Create categorized task list with display names based on prescription order
              const processedMeds: { [key: string]: number } = {};
              sortedPatientTasks.forEach(task => {
                const medName = task.medicationDetails?.medicationName || 'Unknown';
                if (!processedMeds[medName]) {
                  processedMeds[medName] = 0;
                }
                processedMeds[medName]++;
                
                let displayName = medName;
                if (medicationCounts[medName] > 1) {
                  // Multiple medications, add order indicator based on prescription date
                  const order = processedMeds[medName];
                  let orderSuffix = '';
                  if (order === 1) orderSuffix = '1st';
                  else if (order === 2) orderSuffix = '2nd';
                  else if (order === 3) orderSuffix = '3rd';
                  else orderSuffix = `${order}th`;
                  
                  displayName = `${medName} ${orderSuffix}`;
                }
                
                categorizedTasks.push({ task, displayName });
              });
              
              return categorizedTasks.map(({ task, displayName }) => (
                <SimplifiedMedicationAdmin
                  key={task._id || task.id}
                  task={task}
                  displayName={displayName}
                  onRefresh={handleDoseAdministered}
                  allTasks={tasks}
                  hidePaymentBadge={true}
                />
              ));
            })()}


          </div>
        </>
      ) : (
        // Table View (Default) - grouped by patient
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3.5 text-left w-10">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid</span>
                    </th>
                    <th className="px-5 py-3.5 text-left">
                      <SortIndicator field="patientName" />
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</span>
                    </th>
                    <th className="px-4 py-3.5 text-left">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</span>
                    </th>
                    <th className="px-4 py-3.5 text-right">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedRowsPage.map((group) => {
                    const taskStatuses = group.tasks.map(task => getTaskCompletionStatus(task));
                    const allCompleted = taskStatuses.every(s => s.isCompleted);
                    const anyPartial = taskStatuses.some(s => s.paymentStatus === 'partially_paid');
                    const anyFullyPaid = taskStatuses.some(s => s.paymentStatus === 'fully_paid');

                    let hasOutstandingAmount = false;
                    let totalOutstandingAmount = 0;
                    let grandTotalPaid = 0;
                    let grandTotalCost = 0;

                    // Sum item-level costs per medication task directly from billing invoices
                    group.tasks.forEach((task, i) => {
                      const status = taskStatuses[i];
                      grandTotalPaid += status.totalPaid || 0;
                      grandTotalCost += status.totalCost || 0;
                      if (status.outstandingAmount && status.outstandingAmount > 0) {
                        hasOutstandingAmount = true;
                        totalOutstandingAmount += status.outstandingAmount;
                      }
                    });

                    // Payment state
                    type PaymentState = 'paid' | 'partial' | 'unpaid';
                    let paymentState: PaymentState = 'unpaid';
                    if (anyFullyPaid && !hasOutstandingAmount && !anyPartial) paymentState = 'paid';
                    else if (anyPartial || (anyFullyPaid && hasOutstandingAmount)) paymentState = 'partial';

                    const partialSub = grandTotalCost > 0
                      ? `Paid: ${grandTotalPaid.toFixed(2)} / ${grandTotalCost.toFixed(2)} ETB · Remaining: ${totalOutstandingAmount.toFixed(2)} ETB`
                      : `Outstanding: ${totalOutstandingAmount.toFixed(2)} ETB`;
                    const unpaidSub = grandTotalCost > 0
                      ? `Total: ${grandTotalCost.toFixed(2)} ETB · Unpaid: ${totalOutstandingAmount.toFixed(2)} ETB`
                      : hasOutstandingAmount ? `Outstanding: ${totalOutstandingAmount.toFixed(2)} ETB` : 'No payment recorded';
                    const paymentConfig = {
                      paid:    { label: 'Fully Paid',      sub: `Total: ${grandTotalCost > 0 ? grandTotalCost.toFixed(2) : grandTotalPaid.toFixed(2)} ETB`, dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                      partial: { label: 'Partially Paid',  sub: partialSub, dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                      unpaid:  { label: 'Unpaid',          sub: unpaidSub,  dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50 border-red-200'   },
                    }[paymentState];

                    // Task status
                    const taskActualStatuses = group.tasks.map(t => getActualTaskStatus(t));
                    const allDone = taskActualStatuses.every(s => s === 'completed');
                    const anyInProgress = taskActualStatuses.some(s => s === 'in progress');
                    const anyCancelled = taskActualStatuses.some(s => s === 'cancelled');
                    const anyOverdue = taskActualStatuses.some(s => s === 'overdue');
                    const anyDone = taskActualStatuses.some(s => s === 'completed');

                    type StatusKey = 'completed' | 'inprogress' | 'overdue' | 'cancelled' | 'pending';
                    let statusKey: StatusKey = 'pending';
                    if (allDone) statusKey = 'completed';
                    else if (anyOverdue) statusKey = 'overdue';
                    else if (anyInProgress || anyDone) statusKey = 'inprogress';
                    else if (anyCancelled) statusKey = 'cancelled';

                    const statusConfig: Record<StatusKey, { label: string; cls: string }> = {
                      completed:  { label: 'Completed',   cls: 'bg-emerald-100 text-emerald-700' },
                      inprogress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
                      overdue:    { label: 'Overdue',     cls: 'bg-red-100 text-red-700' },
                      cancelled:  { label: 'Cancelled',   cls: 'bg-slate-100 text-slate-600' },
                      pending:    { label: 'Pending',     cls: 'bg-slate-100 text-slate-600' },
                    };

                    const priorities = group.tasks.map(t => t.priority);
                    const highestPriority = priorities.includes('URGENT') ? 'URGENT' : priorities.includes('HIGH') ? 'HIGH' : priorities.includes('MEDIUM') ? 'MEDIUM' : 'LOW';
                    const priorityConfig: Record<string, { cls: string }> = {
                      URGENT: { cls: 'bg-red-100 text-red-700' },
                      HIGH:   { cls: 'bg-orange-100 text-orange-700' },
                      MEDIUM: { cls: 'bg-blue-100 text-blue-700' },
                      LOW:    { cls: 'bg-slate-100 text-slate-600' },
                    };

                    const categorizedMeds = categorizeMedications(group.tasks);
                    const isOpening = openingPatientId === group.patientId;

                    // Initials avatar
                    const nameParts = group.patientName?.split(' ') || ['?'];
                    const initials = nameParts.length >= 2
                      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
                      : (nameParts[0]?.[0] || '?').toUpperCase();

                    return (
                      <tr
                        key={group.patientId}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                        onClick={() => {
                          setOpeningPatientId(group.patientId);
                          setSelectedPatientFilter(group.patientId);
                          setSelectedTaskId('');
                        }}
                      >
                        {/* Payment status indicator */}
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          {allCompleted ? (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100">
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="9" />
                              </svg>
                            </span>
                          )}
                        </td>

                        {/* Patient */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                              ${statusKey === 'completed' ? 'bg-emerald-500' : statusKey === 'overdue' ? 'bg-red-400' : 'bg-primary'}`}>
                              {initials}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{group.patientName}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {categorizedMeds.categorizedNames.length > 40
                                  ? categorizedMeds.categorizedNames.slice(0, 40) + '…'
                                  : categorizedMeds.categorizedNames || 'No medications'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[statusKey].cls}`}>
                            {statusConfig[statusKey].label}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${priorityConfig[highestPriority]?.cls || 'bg-slate-100 text-slate-600'}`}>
                            {highestPriority}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${paymentConfig.bg} ${paymentConfig.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${paymentConfig.dot}`} />
                            {paymentConfig.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 pl-0.5">{paymentConfig.sub}</div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setOpeningPatientId(group.patientId);
                              setSelectedPatientFilter(group.patientId);
                              setSelectedTaskId('');
                            }}
                            disabled={isOpening}
                            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all
                              ${statusKey === 'completed'
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                                : 'bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/20'
                              } disabled:opacity-50`}
                          >
                            {isOpening ? (
                              <><RefreshCw className="w-3 h-3 animate-spin" /> Opening…</>
                            ) : statusKey === 'completed' ? (
                              <><Filter className="w-3 h-3" /> View</>
                            ) : (
                              <><Pill className="w-3 h-3" /> Administer</>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
                <div className="text-sm text-slate-500">
                  Page <span className="font-semibold text-slate-700">{safePage}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    ← Previous
                  </button>
                  <button
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Summary Stats */}
      {groupedRows.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Patients', value: groupedRows.length, color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
            { label: 'Ready to Administer', value: sortedTasks.filter(t => getTaskCompletionStatus(t).isCompleted).length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
            { label: 'Pending Payment', value: sortedTasks.filter(t => !getTaskCompletionStatus(t).isCompleted).length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
            { label: 'High Priority', value: sortedTasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CheckboxMedicationsPage;

