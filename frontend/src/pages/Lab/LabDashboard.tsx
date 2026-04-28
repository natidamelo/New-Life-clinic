import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGlobalDashboardSettings, useDashboardRefreshInterval } from '../../hooks/useGlobalDashboardSettings';
import { toast } from 'react-toastify';
import { 
  RefreshCw, Search, Beaker, AlertTriangle, CheckCircle, 
  Filter, ArrowUpDown, Clock, XCircle, Plus, FileText, Send,
  Droplet, Heart, PieChart, Activity, Zap, ChevronDown, ChevronRight, X
} from 'lucide-react';
import labService from '../../services/labService';
import Modal from '../../components/Modal';
import patientService from '../../services/patientService';
import inventoryService, { InventoryItem } from '../../services/inventoryService';
import { generateProfessionalLabReportHTML } from '../../utils/labReportTemplate';

// Simplified LabTest interface aligned with the database structure
interface LabTest {
  id: string;
  testName: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  orderedBy: string;
  status: string;
  priority: string;
  requestDate: string;
  collectionDate?: string;
  resultDate?: string;
  // Some code paths treat results as object or null
  results?: any | null;
  normalRange?: string;
  notes?: string;
  source?: 'doctor' | 'reception'; // New field to track source
  // Backend includes this flag; add here to fix TS errors
  sentToDoctor?: boolean;
}

// Interface for grouped tests
interface GroupedLabTest {
  groupKey: string; // Unique key for the group (e.g., patientId-orderedById-requestDate)
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  orderedBy: string;
  requestDate: string;
  tests: LabTest[]; // Array of individual tests in this group
  overallPriority: string; // Highest priority in the group
  overallStatus: string; // Consolidated status for the group
}

const LabDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isViewResultsRoute = location.pathname?.includes('/lab/results');
  const pendingStatuses = ['Ordered', 'Scheduled', 'Collected', 'Processing', 'Pending Payment'];
  const completedStatuses = [
    'Results Available',
    'Completed',
    'Cancelled',
    'Sent to Doctor',
    'Saved to Service Results'
  ];
  const { user, logout } = useAuth();
  
  // Role-specific dashboard settings
  const { settings: roleSettings, loading: settingsLoading } = useGlobalDashboardSettings('lab');
  const refreshInterval = useDashboardRefreshInterval('lab');
  
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'inventory'>(() => 
    isViewResultsRoute ? 'completed' : 'pending'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('requestDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    if (isViewResultsRoute && searchQuery && activeTab !== 'completed') {
      setActiveTab('completed');
    }
  }, [isViewResultsRoute, searchQuery, activeTab]);
  
  // Selected test for viewing details
  const [selectedPatient, setSelectedPatient] = useState<{
    patientName: string;
    patientId: string;
    tests: LabTest[];
  } | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // New state for results entry
  const [resultValue, setResultValue] = useState<string>('');
  const [normalRangeValue, setNormalRangeValue] = useState<string>('');
  const [resultNotes, setResultNotes] = useState<string>('');
  const [showResultsModal, setShowResultsModal] = useState(false);
  
  // Add new state for batch results entry
  const [selectedGroup, setSelectedGroup] = useState<GroupedLabTest | null>(null);
  const [showBatchResultsModal, setShowBatchResultsModal] = useState(false);
  // Allow dynamic extra fields like stool/urinalysis details
  const [testResults, setTestResults] = useState<{[testId: string]: any}>({});
  const [batchNotes, setBatchNotes] = useState<string>('');
  
  // State for inline editing in table
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [inlineTestResults, setInlineTestResults] = useState<{[testId: string]: any}>({});
  const [inlineBatchNotes, setInlineBatchNotes] = useState<string>('');
  // Drawer state for result entry
  const [drawerGroup, setDrawerGroup] = useState<GroupedLabTest | null>(null);
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 20;

  // Add a state for expanded patients
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());

  // Add new state for tracking which tests have been sent to doctors
  const [sentToDoctor, setSentToDoctor] = useState<Set<string>>(new Set());
  const [savedToService, setSavedToService] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState<boolean>(false);
  
  
  // FIRST_EDIT
  const [labInventory, setLabInventory] = useState<InventoryItem[]>([]);
  
  
  // Authentication check
  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access the Lab Dashboard');
      navigate('/login');
      return;
    }
    
    // Check if user role is allowed (matching ProtectedRoute)
    const allowedLabRoles = ['admin', 'lab'];
    if (!user.role || !allowedLabRoles.includes(user.role)) {
      toast.error('You do not have permission to access the Lab Dashboard');
      navigate('/unauthorized');
      return;
    }
  }, [user, navigate]);

  
  const fetchLabTests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const labOrders = await labService.getAllLabOrders();
      
      if (!labOrders || labOrders.length === 0) {
        setLabTests([]);
        return;
      }

      const visibleLabOrders = labOrders.filter(order => {
        if (!order.patientId) return false;
        const patientId = typeof order.patientId === 'object' 
          ? (order.patientId._id || order.patientId.id || null) 
          : order.patientId;
        return !!patientId;
      });
      
      const formattedLabTests = visibleLabOrders.map(order => {
        const orderPatientId = typeof order.patientId === 'object' 
          ? (order.patientId._id || order.patientId.id || null) 
          : order.patientId;
        
        // Use populated patient data from the order (backend already populates this)
        const patient = (typeof order.patientId === 'object' && order.patientId)
          ? order.patientId
          : order.patient || null;
        
        const patientName = patient 
          ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || `Unknown Patient (ID: ${orderPatientId || 'N/A'})`
          : `Unknown Patient (ID: ${orderPatientId || 'N/A'})`;

        const derivedAge = patient?.age ?? (() => {
          if (!patient?.dateOfBirth) return 0;
          const birthDate = new Date(patient.dateOfBirth);
          if (Number.isNaN(birthDate.getTime())) return 0;

          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();

          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age -= 1;
          }

          return age > 0 ? age : 0;
        })();
        
        let orderedByText = 'Unknown Doctor';
        if (order.source === 'reception') {
          orderedByText = 'Reception Service';
        } else if (typeof order.orderingDoctorId === 'object' && order.orderingDoctorId) {
          orderedByText = `Dr. ${order.orderingDoctorId.firstName || ''} ${order.orderingDoctorId.lastName || ''}`.trim() || 'Unknown Doctor';
        }

        return {
          id: order._id,
          testName: order.testName || 'Unknown Test',
          patientId: orderPatientId || 'unknown',
          patientName,
          patientAge: derivedAge,
          patientGender: patient ? (patient.gender || 'Unknown') : 'Unknown',
          orderedBy: orderedByText,
          status: order.status || 'Ordered',
          priority: order.priority || 'Routine',
          requestDate: order.orderDateTime || new Date().toISOString(),
          collectionDate: order.collectionDateTime,
          resultDate: order.resultDateTime,
          results: order.results,
          normalRange: order.normalRange,
          notes: order.notes,
          source: order.source || 'doctor',
          sentToDoctor: order.sentToDoctor || false
        };
      });
      
      setLabTests(formattedLabTests);
      
      const savedToServiceFromBackend = new Set<string>();
      formattedLabTests.forEach(test => {
        if (test.sentToDoctor && test.source === 'reception') {
          savedToServiceFromBackend.add(test.patientId);
        }
      });
      setSavedToService(savedToServiceFromBackend);
    } catch (error: any) {
      const errorMessage = error.response
        ? `Failed to fetch lab orders (${error.response.status})`
        : 'Failed to fetch lab orders. Please check your connection.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch lab inventory from database
  const fetchLabInventory = async () => {
    try {
      const items = await inventoryService.getAllItems({ category: 'laboratory' });
      setLabInventory(items);
    } catch (err) {
      console.error('Error fetching lab inventory items:', err);
    }
  };
  
  // Load data on component mount
  useEffect(() => {
    fetchLabTests();
    fetchLabInventory();
  }, []);

  
  // Handle loading timeout
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isLoading) {
      timeout = setTimeout(() => {
        setIsLoading(false);
        setError('Loading timed out. Please try again.');
      }, 15000); // 15 seconds timeout
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  // Reset to page 1 when filters/tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, priorityFilter]);
  
  // Filter and sort tests
  const getFilteredTests = (): GroupedLabTest[] => { // Return grouped tests
    const filtered = labTests
      .filter(test => {
        if (activeTab === 'inventory') {
          return false;
        }

        // On the dedicated View Results route, always show completed-type tests
        if (isViewResultsRoute) {
          return completedStatuses.includes(test.status);
        }

        // Filter by active tab (pending/completed)
        if (activeTab === 'pending') {
          return pendingStatuses.includes(test.status);
        }

        return completedStatuses.includes(test.status);
      })
      .filter(test => {
        // Filter by search query
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          test.testName.toLowerCase().includes(query) ||
          test.patientName.toLowerCase().includes(query) ||
          test.orderedBy.toLowerCase().includes(query)
        );
      })
      .filter(test => {
        // Filter by priority
        if (priorityFilter === 'all') return true;
        return test.priority.toLowerCase() === priorityFilter.toLowerCase();
      })
      .sort((a, b) => {
        // Handle sorting
        if (sortBy === 'requestDate') {
          const dateA = new Date(a.requestDate).getTime();
          const dateB = new Date(b.requestDate).getTime();
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        if (sortBy === 'priority') {
          const priorityOrder = { 'STAT': 0, 'ASAP': 1, 'Routine': 2 };
          const orderA = priorityOrder[a.priority as keyof typeof priorityOrder] || 3;
          const orderB = priorityOrder[b.priority as keyof typeof priorityOrder] || 3;
          return sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
        }
        
        // Default string comparison for other fields
        const valA = String(a[sortBy as keyof LabTest] || '').toLowerCase();
        const valB = String(b[sortBy as keyof LabTest] || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
      
    // Group the filtered and sorted tests
    const grouped = filtered.reduce((acc, test) => {
      // Use patientId, orderedBy, and the date part of requestDate for grouping
      const datePart = new Date(test.requestDate).toISOString().split('T')[0];
      const groupKey = `${test.patientId}-${test.orderedBy}-${datePart}`;
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          groupKey: groupKey,
          patientId: test.patientId,
          patientName: test.patientName,
          patientAge: test.patientAge,
          patientGender: test.patientGender,
          orderedBy: test.orderedBy,
          requestDate: test.requestDate, // Use the first test's date as representative
          tests: [],
          overallPriority: test.priority, // Initialize with first test's priority
          overallStatus: test.status, // Initialize with first test's status
        };
      }
      
      acc[groupKey].tests.push(test);
      
      // Determine highest priority for the group
      const priorityOrder = { 'STAT': 0, 'ASAP': 1, 'Routine': 2 };
      const currentPriorityVal = priorityOrder[acc[groupKey].overallPriority as keyof typeof priorityOrder] ?? 3;
      const newPriorityVal = priorityOrder[test.priority as keyof typeof priorityOrder] ?? 3;
      if (newPriorityVal < currentPriorityVal) {
        acc[groupKey].overallPriority = test.priority;
      }
      
      // Determine consolidated status (e.g., 'Processing' if any test is processing)
      // This logic might need refinement based on desired behavior
      const statusOrder = { 
        'Processing': 0, 
        'Collected': 1, 
        'Scheduled': 2, 
        'Ordered': 3, 
        'Results Available': 4, 
        'Cancelled': 5, 
        'Completed': 6,
        'Sent to Doctor': 7
      };
      const currentStatusVal = statusOrder[acc[groupKey].overallStatus as keyof typeof statusOrder] ?? 8;
      const newStatusVal = statusOrder[test.status as keyof typeof statusOrder] ?? 8;
       if (newStatusVal < currentStatusVal) {
         acc[groupKey].overallStatus = test.status;
       } else if (test.status === 'Results Available' && acc[groupKey].tests.every(t => t.status === 'Results Available' || t.status === 'Completed' || t.status === 'Cancelled')) {
         // If all are done/cancelled, maybe status is 'Results Available' or 'Completed'?
         // For simplicity, let's stick with the "earliest" active state.
         // Consider 'Completed' only if ALL tests are 'Completed'.
       }
       
        // Check if results have been sent to doctor or saved to service for this patient
        if (acc[groupKey].tests.every(t => t.status === 'Results Available' || t.status === 'Completed' || t.status === 'Cancelled')) {
          if (test.source === 'reception' && (test.sentToDoctor || savedToService.has(test.patientId))) {
            acc[groupKey].overallStatus = 'Saved to Service Results';
          } else if (test.source === 'doctor' && test.sentToDoctor) {
            acc[groupKey].overallStatus = 'Sent to Doctor';
          }
        }

      return acc;
    }, {} as Record<string, GroupedLabTest>);
    
    return Object.values(grouped); // Return array of groups
  };
  
  const filteredTestGroups = getFilteredTests();
  const totalPages = Math.ceil(filteredTestGroups.length / PAGE_SIZE);
  const paginatedGroups = filteredTestGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Grouped counts for tabs (number of patient groups, not individual tests)
  const pendingGroupCount = (() => {
    const groups = new Set<string>();
    labTests.filter(t => pendingStatuses.includes(t.status)).forEach(t => {
      const datePart = new Date(t.requestDate).toISOString().split('T')[0];
      groups.add(`${t.patientId}-${t.orderedBy}-${datePart}`);
    });
    return groups.size;
  })();
  const completedGroupCount = (() => {
    const groups = new Set<string>();
    labTests.filter(t => completedStatuses.includes(t.status)).forEach(t => {
      const datePart = new Date(t.requestDate).toISOString().split('T')[0];
      groups.add(`${t.patientId}-${t.orderedBy}-${datePart}`);
    });
    return groups.size;
  })();
  
  // Update test status
  const updateTestStatus = async (testId: string, newStatus: string) => {
    try {
      const result = await labService.updateLabOrderStatus(testId, newStatus);
      toast.success(`Test status updated to ${newStatus}`);
      await fetchLabTests(); // Refresh the data
      return true; // Success indicator
    } catch (error) {
      console.error('Error updating test status:', error);
      toast.error('Failed to update test status');
      return false; // Failure indicator
    }
  };
  
  // Update test result
  const updateTestResult = async (testId: string, resultData: { 
    results: string, 
    normalRange?: string, 
    notes?: string 
  }) => {
    try {
      const updatedTest = await labService.updateLabOrderStatus(testId, 'Results Available', resultData);
      toast.success('Test results saved successfully');
      await fetchLabTests(); // Refresh the data
      return true;
    } catch (error) {
      console.error('Error updating test results:', error);
      toast.error('Failed to save test results');
      return false;
    }
  };
  
  // Priority badge component
  const PriorityBadge = ({ priority }: { priority: string }) => {
    const bgColor = priority === 'STAT' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-bold' : 
                    priority === 'ASAP' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 font-semibold' : 
                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs ${bgColor}`}>
        {priority}
      </span>
    );
  };
  
  // Status badge component
  const StatusBadge = ({ status, className = '' }: { status: string; className?: string }) => {
    const bgColor = 
      status === 'Ordered' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
      status === 'Scheduled' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
      status === 'Collected' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300' :
      status === 'Processing' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
      status === 'Results Available' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
      status === 'Sent to Doctor' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
      status === 'Saved to Service Results' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' :
      status === 'Cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
      status === 'Pending Payment' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
      'bg-muted/20 text-muted-foreground';
    
    // Format status text with line breaks for multi-word statuses
    const formatStatus = (statusText: string) => {
      if (statusText === 'Sent to Doctor') {
        return (
          <>
            Sent to<br />Doctor
          </>
        );
      }
      if (statusText === 'Saved to Service Results') {
        return (
          <>
            Saved to<br />Service Results
          </>
        );
      }
      if (statusText === 'Results Available') {
        return (
          <>
            Results<br />Available
          </>
        );
      }
      return statusText;
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${className} whitespace-normal leading-tight`}>
        {formatStatus(status)}
      </span>
    );
  };

  // Add this new function to categorize tests and assign icons
  const getTestCategory = (testName: string): { category: string; icon: React.ReactNode } => {
    const lowerCaseName = testName.toLowerCase();
    
    if (lowerCaseName.includes('blood') || 
        lowerCaseName.includes('hemo') || 
        lowerCaseName.includes('rbc') || 
        lowerCaseName.includes('wbc')) {
      return { 
        category: 'Hematology', 
        icon: <Droplet className="h-4 w-4 text-destructive" /> 
      };
    }
    
    if (lowerCaseName.includes('glucose') || 
        lowerCaseName.includes('chem') || 
        lowerCaseName.includes('sodium') || 
        lowerCaseName.includes('potassium') ||
        lowerCaseName.includes('urea') ||
        lowerCaseName.includes('creatinine')) {
      return { 
        category: 'Chemistry', 
        icon: <Beaker className="h-4 w-4 text-secondary-foreground" /> 
      };
    }
    
    if (lowerCaseName.includes('culture') || 
        lowerCaseName.includes('stain') || 
        lowerCaseName.includes('microbiology')) {
      return { 
        category: 'Microbiology', 
        icon: <Zap className="h-4 w-4 text-primary" /> 
      };
    }
    
    if (lowerCaseName.includes('cardiac') || 
        lowerCaseName.includes('troponin') ||
        lowerCaseName.includes('ecg')) {
      return { 
        category: 'Cardiac', 
        icon: <Heart className="h-4 w-4 text-destructive" /> 
      };
    }
    
    if (lowerCaseName.includes('protein') || 
        lowerCaseName.includes('antibody') || 
        lowerCaseName.includes('hiv')) {
      return { 
        category: 'Immunology', 
        icon: <Activity className="h-4 w-4 text-primary" /> 
      };
    }

    return { 
      category: 'Other', 
      icon: <PieChart className="h-4 w-4 text-muted-foreground" /> 
    };
  };

  // Update function to use WHO standard reference ranges
  const getSuggestedReferenceRange = (testName: string): string => {
    const lowerCaseName = testName.toLowerCase();
    
    // Complete Blood Count (CBC) - Comprehensive
    if (lowerCaseName.includes('cbc') || 
        lowerCaseName.includes('complete blood count') || 
        lowerCaseName.includes('full blood count') ||
        lowerCaseName.includes('fbc')) {
      return 'See individual parameters for WHO standard ranges';
    }
    
    // Hematology tests (WHO standards)
    if (lowerCaseName.includes('hemoglobin')) {
      return 'Male: 13.0-17.0 g/dL, Female: 12.0-15.0 g/dL';
    }
    if (lowerCaseName.includes('hematocrit')) {
      return 'Male: 39-49%, Female: 36-46%';
    }
    if (lowerCaseName.includes('platelet')) {
      return '150,000-400,000/μL';
    }
    if (lowerCaseName.includes('wbc') || lowerCaseName.includes('white blood cell')) {
      return '4,000-10,000/μL';
    }
    if (lowerCaseName.includes('rbc') || lowerCaseName.includes('red blood cell')) {
      return 'Male: 4.5-5.9 × 10^6/μL, Female: 4.0-5.2 × 10^6/μL';
    }
    if (lowerCaseName.includes('mcv')) {
      return '80-100 fL';
    }
    if (lowerCaseName.includes('mch')) {
      return '27-33 pg';
    }
    if (lowerCaseName.includes('mchc')) {
      return '32-36 g/dL';
    }
    if (lowerCaseName.includes('rdw')) {
      return '11.5-14.5%';
    }
    if (lowerCaseName.includes('neutrophil')) {
      return '40-70%';
    }
    if (lowerCaseName.includes('lymphocyte')) {
      return '20-40%';
    }
    if (lowerCaseName.includes('monocyte')) {
      return '2-8%';
    }
    if (lowerCaseName.includes('eosinophil')) {
      return '1-4%';
    }
    if (lowerCaseName.includes('basophil')) {
      return '0.5-1%';
    }
    
    // Chemistry tests (WHO standards)
    if (lowerCaseName.includes('glucose') && lowerCaseName.includes('fast')) {
      return '70-100 mg/dL';
    }
    if (lowerCaseName.includes('glucose') && !lowerCaseName.includes('fast')) {
      return '70-140 mg/dL';
    }
    if (lowerCaseName.includes('hba1c') || lowerCaseName.includes('a1c')) {
      return '< 6.5%';
    }
    if (lowerCaseName.includes('sodium')) {
      return '135-145 mmol/L';
    }
    if (lowerCaseName.includes('potassium')) {
      return '3.5-5.1 mmol/L';
    }
    if (lowerCaseName.includes('chloride')) {
      return '98-107 mmol/L';
    }
    if (lowerCaseName.includes('bicarbonate') || lowerCaseName.includes('co2')) {
      return '23-29 mmol/L';
    }
    if (lowerCaseName.includes('urea') || lowerCaseName.includes('bun')) {
      return '6-20 mg/dL';
    }
    if (lowerCaseName.includes('creatinine')) {
      return 'Male: 0.7-1.2 mg/dL, Female: 0.5-1.0 mg/dL';
    }
    if (lowerCaseName.includes('cholesterol')) {
      return 'Total: < 200 mg/dL';
    }
    if (lowerCaseName.includes('triglyceride')) {
      return '< 150 mg/dL';
    }
    if (lowerCaseName.includes('hdl')) {
      return 'Male: > 40 mg/dL, Female: > 50 mg/dL';
    }
    if (lowerCaseName.includes('ldl')) {
      return '< 100 mg/dL';
    }
    if (lowerCaseName.includes('albumin')) {
      return '3.5-5.0 g/dL';
    }
    if (lowerCaseName.includes('total protein')) {
      return '6.0-8.3 g/dL';
    }
    if (lowerCaseName.includes('uric acid')) {
      return 'Male: 3.4-7.0 mg/dL, Female: 2.4-6.0 mg/dL';
    }
    
    // Immunology tests (WHO standards)
    if (lowerCaseName.includes('hiv')) {
      return 'Non-reactive';
    }
    if (lowerCaseName.includes('c-reactive protein') || lowerCaseName.includes('crp')) {
      return '< 5 mg/L';
    }
    if (lowerCaseName.includes('esr') || lowerCaseName.includes('sedimentation rate')) {
      return 'Male: 0-15 mm/hr, Female: 0-20 mm/hr';
    }
    if (lowerCaseName.includes('rheumatoid factor')) {
      return '< 14 IU/mL';
    }
    if (lowerCaseName.includes('antinuclear antibody') || lowerCaseName.includes('ana')) {
      return 'Negative';
    }
    
    // Liver function tests (WHO standards)
    if (lowerCaseName.includes('alt') || lowerCaseName.includes('alanine')) {
      return 'Male: 10-40 U/L, Female: 7-35 U/L';
    }
    if (lowerCaseName.includes('ast') || lowerCaseName.includes('aspartate')) {
      return 'Male: 12-38 U/L, Female: 10-35 U/L';
    }
    if (lowerCaseName.includes('alp') || lowerCaseName.includes('alkaline phosphatase')) {
      return 'Adult: 40-129 U/L';
    }
    if (lowerCaseName.includes('ggt') || lowerCaseName.includes('gamma-glutamyl transferase')) {
      return 'Male: 8-61 U/L, Female: 5-36 U/L';
    }
    if (lowerCaseName.includes('bilirubin') && lowerCaseName.includes('total')) {
      return '0.1-1.2 mg/dL';
    }
    if (lowerCaseName.includes('bilirubin') && lowerCaseName.includes('direct')) {
      return '0.0-0.3 mg/dL';
    }
    if (lowerCaseName.includes('bilirubin') && lowerCaseName.includes('indirect')) {
      return '0.1-0.9 mg/dL';
    }
    
    // Thyroid function tests (WHO standards)
    if (lowerCaseName.includes('tsh')) {
      return '0.4-4.0 mIU/L';
    }
    if (lowerCaseName.includes('t3') || lowerCaseName.includes('triiodothyronine')) {
      return '80-200 ng/dL';
    }
    if (lowerCaseName.includes('t4') || lowerCaseName.includes('thyroxine')) {
      return '5.0-12.0 μg/dL';
    }
    if (lowerCaseName.includes('free t3')) {
      return '2.3-4.2 pg/mL';
    }
    if (lowerCaseName.includes('free t4')) {
      return '0.8-1.8 ng/dL';
    }
    
    // Electrolytes (WHO standards)
    if (lowerCaseName.includes('calcium')) {
      return '8.5-10.5 mg/dL';
    }
    if (lowerCaseName.includes('magnesium')) {
      return '1.7-2.2 mg/dL';
    }
    if (lowerCaseName.includes('phosphorus') || lowerCaseName.includes('phosphate')) {
      return '2.5-4.5 mg/dL';
    }
    if (lowerCaseName.includes('iron')) {
      return 'Male: 60-170 μg/dL, Female: 50-170 μg/dL';
    }
    if (lowerCaseName.includes('ferritin')) {
      return 'Male: 20-250 ng/mL, Female: 10-120 ng/mL';
    }
    if (lowerCaseName.includes('vitamin d') || lowerCaseName.includes('25-oh vitamin d')) {
      return '30-100 ng/mL';
    }
    if (lowerCaseName.includes('vitamin b12')) {
      return '200-900 pg/mL';
    }
    if (lowerCaseName.includes('folate') || lowerCaseName.includes('folic acid')) {
      return '2.0-20.0 ng/mL';
    }
    
    // Cardiac markers (WHO standards)
    if (lowerCaseName.includes('troponin')) {
      return '< 0.04 ng/mL';
    }
    if (lowerCaseName.includes('ck-mb')) {
      return '< 5.0 ng/mL';
    }
    if (lowerCaseName.includes('bnp') || lowerCaseName.includes('brain natriuretic peptide')) {
      return '< 100 pg/mL';
    }
    
    // Kidney function (WHO standards)
    if (lowerCaseName.includes('egfr') || lowerCaseName.includes('estimated glomerular filtration rate')) {
      return '> 90 mL/min/1.73m²';
    }
    if (lowerCaseName.includes('cystatin c')) {
      return '0.53-0.95 mg/L';
    }
    
    // Urinalysis (WHO standards)
    if (lowerCaseName.includes('urinalysis') || lowerCaseName.includes('urine')) {
      return 'See specific parameters below';
    }
    if (lowerCaseName.includes('urine ph')) {
      return '4.5-8.0';
    }
    if (lowerCaseName.includes('specific gravity')) {
      return '1.005-1.030';
    }
    if (lowerCaseName.includes('urine protein')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine glucose')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine blood')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine ketone')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine leukocyte')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine nitrite')) {
      return 'Negative';
    }
    
    // Stool tests (WHO standards)
    if (lowerCaseName.includes('stool') || lowerCaseName.includes('fecal')) {
      return 'See specific parameters below';
    }
    if (lowerCaseName.includes('occult blood')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('ova and parasite')) {
      return 'Negative';
    }
    
    // Microbiology (WHO standards)
    if (lowerCaseName.includes('culture') && lowerCaseName.includes('blood')) {
      return 'No growth';
    }
    if (lowerCaseName.includes('culture') && lowerCaseName.includes('urine')) {
      return '< 10,000 CFU/mL';
    }
    if (lowerCaseName.includes('culture') && lowerCaseName.includes('sputum')) {
      return 'Normal flora';
    }
    
    // Default - return empty string for unknown tests
    return '';
  };

  // Single test modal - Auto-populate normal range when showing modal
  // Update useEffect to set the normal range automatically
  useEffect(() => {
    // When the results modal opens, auto-populate normal range with WHO standard
    if (showResultsModal && selectedPatient) {
      const standardRange = getSuggestedReferenceRange(selectedPatient.tests[0].testName);
      if (standardRange) {
        setNormalRangeValue(standardRange);
      } else {
        setNormalRangeValue('');
      }
    }
  }, [showResultsModal, selectedPatient]);

  // Batch results modal - Auto-populate normal range when showing modal
  useEffect(() => {
    // When the batch results modal opens, auto-populate normal ranges with WHO standards
    if (showBatchResultsModal && selectedGroup) {
      const processingTests = selectedGroup.tests.filter(test => test.status === 'Processing');
      
      const initialResults: {[testId: string]: any} = {};
      processingTests.forEach(test => {
        const standardRange = getSuggestedReferenceRange(test.testName);
        initialResults[test.id] = {
          value: '',
          normalRange: standardRange || ''
        };
      });
      
      setTestResults(initialResults);
    }
  }, [showBatchResultsModal, selectedGroup]);

  // Function to toggle expanded state of a patient
  const togglePatientExpanded = (patientId: string) => {
    setExpandedPatients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };


  // Update function to send all results for a patient at once
  const sendAllResultsToDoctor = async (patientId: string, patientName: string, tests: LabTest[]) => {
    try {
      setIsSending(true);
      
      // Get IDs of tests with results that haven't been sent yet
      const testIdsToSend = tests
        .filter(test => test.results && !test.sentToDoctor)
        .map(test => test.id);
      
      if (testIdsToSend.length === 0) {
        toast.warning("No new test results available to send");
        return false;
      }
      
      // Call the lab service to send results to doctor
      const result = await labService.sendLabResultsToDoctor(testIdsToSend, patientId);
      
      if (result.success) {
        // Mark only the specific tests as sent in the local state
        setLabTests(prev => prev.map(test => {
          if (testIdsToSend.includes(test.id)) {
            return { ...test, status: 'Sent to Doctor', sentToDoctor: true, sentDate: result.sentAt };
          }
          return test;
        }));

        // Also update selectedPatient so the modal reflects the new state immediately
        setSelectedPatient(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tests: prev.tests.map(test =>
              testIdsToSend.includes(test.id)
                ? { ...test, status: 'Sent to Doctor', sentToDoctor: true, sentDate: result.sentAt }
                : test
            )
          };
        });
        
        // Refresh the data to ensure we have the latest from the server
        setTimeout(() => { fetchLabTests(); }, 1000);
        
        toast.success(`All test results for ${patientName} successfully sent to doctor`);
        setShowBatchResultsModal(false);
        
        return true;
      } else {
        throw new Error(result.message || "Failed to send results");
      }
    } catch (error) {
      console.error("Error sending results to doctor:", error);
      toast.error("Failed to send results to doctor. Please try again.");
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // Function to save reception-ordered results to service results
  const saveResultsToServiceResults = async (patientId: string, patientName: string, tests: LabTest[]) => {
    try {
      setIsSending(true);
      
      // Filter tests that have results
      const testsWithResults = tests.filter(test => test.results);
      
      if (testsWithResults.length === 0) {
        toast.warning("No test results available to save");
        return false;
      }
      
      const serviceResults = [];
      for (const test of testsWithResults) {
        try {
          const payload = {
            patientId: patientId,
            testName: test.testName,
            results: test.results,
            normalRange: test.normalRange || '',
            notes: test.notes || '',
            priority: (test.priority as 'Routine' | 'STAT' | 'ASAP') || 'Routine'
          };
          
          const serviceResult = await labService.createLabServiceResult(payload);
          serviceResults.push(serviceResult);
        } catch (error) {
          console.error(`Error creating service result for test ${test.testName}:`, error);
          toast.error(`Failed to save ${test.testName} to service results: ${error.message}`);
        }
      }
      
      if (serviceResults.length > 0) {
        // Mark tests as saved to service results
        setSavedToService(prev => { const s = new Set(prev); s.add(patientId); return s; });

        // Update selectedPatient so modal reflects the new state immediately
        const savedTestIds = testsWithResults.map(t => t.id);
        setSelectedPatient(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tests: prev.tests.map(test =>
              savedTestIds.includes(test.id) ? { ...test, sentToDoctor: true } : test
            )
          };
        });
        
        toast.success(`All test results for ${patientName} successfully saved to service results`);
        setShowBatchResultsModal(false);
        setTimeout(() => { navigate('/app/lab/service-results'); }, 1000);
        
        return true;
      } else {
        throw new Error("No service results were created");
      }
    } catch (error) {
      console.error("Error saving results to service results:", error);
      toast.error(`Failed to save results to service results: ${error.message}`);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // FIRST_EDIT
  const renderInventoryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-muted/10">
          <tr>
            <th className="px-8 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">Item Code</th>
            <th className="px-8 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">Name</th>
            <th className="px-8 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
            <th className="px-8 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">Unit</th>
            <th className="px-8 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">Location</th>
          </tr>
        </thead>
        <tbody className="bg-primary-foreground divide-y divide-gray-200">
          {labInventory.map(item => (
            <tr key={item._id || item.id} className="hover:bg-muted/10">
              <td className="px-8 py-5 whitespace-nowrap text-base text-muted-foreground font-medium">{item.itemCode}</td>
              <td className="px-8 py-5 whitespace-nowrap text-base text-muted-foreground">{item.name}</td>
              <td className="px-8 py-5 whitespace-nowrap text-base text-muted-foreground">{item.quantity}</td>
              <td className="px-8 py-5 whitespace-nowrap text-base text-muted-foreground">{item.unit}</td>
              <td className="px-8 py-5 whitespace-nowrap text-base text-muted-foreground">{item.location || '-'}</td>
            </tr>
          ))}
          {labInventory.length === 0 && (
            <tr>
              <td colSpan={5} className="px-8 py-8 text-center text-base text-muted-foreground">
                No laboratory inventory items available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="px-2 sm:px-4 lg:px-6 py-6 w-full mx-auto">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-muted-foreground">Laboratory Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage and process laboratory tests
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={fetchLabTests}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-lg">Loading laboratory tests...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-2 sm:px-4 lg:px-6 py-6 w-full mx-auto">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-muted-foreground">Laboratory Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage and process laboratory tests
              </p>
          </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={fetchLabTests}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/20 mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Data</h3>
            <p className="text-destructive max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchLabTests}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-destructive hover:bg-destructive"
          >
            Try Again
          </button>
          </div>
        </div>
      </div>
    );
  }

  const getStructuredResultString = (testName: string, data: any): string | null => {
    const n = testName.toLowerCase();
    if (n.includes('stool')) {
      return `Colour: ${data?.colour || '-'}; Consistency: ${data?.consistency || '-'}; Mucus: ${data?.mucus || '-'}; Blood: ${data?.blood || '-'}; Pus Cells: ${data?.pusCells || '-'}; RBC: ${data?.rbc || '-'}; O/P: ${data?.op || '-'}; Parasite: ${data?.parasiteType || '-'}; Fat Globules: ${data?.fatGlobules || '-'}`;
    } else if (n.includes('urinalysis')) {
      return `Colour: ${data?.colour || '-'}; Appearance: ${data?.appearance || '-'}; pH: ${data?.ph || '-'}; SG: ${data?.sg || '-'}; Protein: ${data?.protein || '-'}; Glucose: ${data?.glucose || '-'}; Leukocyte: ${data?.leukocyte || '-'}; Blood: ${data?.blood || '-'}; Ketone: ${data?.ketone || '-'}; Bilirubin: ${data?.bilirubin || '-'}; Urobilinogen: ${data?.urobilinogen || '-'}; Nitrite: ${data?.nitrate || '-'}; WBC: ${data?.wbc || '-'}; RBC: ${data?.rbc || '-'}; Epithelial: ${data?.epithelial || '-'}; Cast: ${data?.cast || '-'}; Bacteria: ${data?.bacteria || '-'}; Crystal: ${data?.crystal || '-'}`;
    } else if (n.includes('cbc') || n.includes('complete blood count') || n.includes('full blood count') || n.includes('fbc')) {
      return `WBC: ${data?.wbc || '-'} ×10³/μL; RBC: ${data?.rbc || '-'} ×10⁶/μL; Hgb: ${data?.hemoglobin || '-'} g/dL; Hct: ${data?.hematocrit || '-'}%; MCV: ${data?.mcv || '-'} fL; MCH: ${data?.mch || '-'} pg; MCHC: ${data?.mchc || '-'} g/dL; RDW: ${data?.rdw || '-'}%; Plt: ${data?.platelets || '-'} ×10³/μL; Neut: ${data?.neutrophils || '-'}%; Lymph: ${data?.lymphocytes || '-'}%; Mono: ${data?.monocytes || '-'}%; Eos: ${data?.eosinophils || '-'}%; Baso: ${data?.basophils || '-'}%`;
    } else if (n.includes('malaria') || n.includes('mps') || n.includes('blood film')) {
      return `Result: ${data?.malariaResult || '-'}; Species: ${data?.malariaSpecies || '-'}; Parasitemia: ${data?.parasitemia || '-'}; Stage: ${data?.malariaStage || '-'}`;
    } else if (n.includes('blood group') || n.includes('blood type') || n.includes('abo')) {
      return `Blood Group: ${data?.aboGroup || '-'}; Rh Factor: ${data?.rhFactor || '-'}`;
    } else if (n.includes('pregnancy') || n.includes('hcg') || n.includes('upt')) {
      return data?.pregnancyResult || null;
    } else if (n.includes('hiv') || n.includes('retroviral')) {
      return `Screening: ${data?.hivResult || '-'}; Confirmatory: ${data?.hivConfirmatory || '-'}; Final: ${data?.hivFinal || '-'}`;
    } else if (n.includes('widal')) {
      return `S.Typhi O: ${data?.widalTO || '-'}; S.Typhi H: ${data?.widalTH || '-'}; S.Para A O: ${data?.widalAO || '-'}; S.Para A H: ${data?.widalAH || '-'}; S.Para B O: ${data?.widalBO || '-'}; S.Para B H: ${data?.widalBH || '-'}; Interpretation: ${data?.widalInterpretation || '-'}`;
    } else if (n.includes('weil') || n.includes('felix')) {
      return `OX-2: ${data?.wfOX2 || '-'}; OX-19: ${data?.wfOX19 || '-'}; OX-K: ${data?.wfOXK || '-'}; Interpretation: ${data?.wfInterpretation || '-'}`;
    }
    return null;
  };

  const hasStructuredData = (testName: string, data: any): boolean => {
    const n = testName.toLowerCase();
    if (n.includes('stool')) return !!(data?.colour || data?.consistency || data?.mucus || data?.blood || data?.pusCells || data?.rbc || data?.op);
    if (n.includes('urinalysis')) return !!(data?.colour || data?.appearance || data?.ph || data?.protein || data?.glucose || data?.wbc);
    if (n.includes('cbc') || n.includes('complete blood count') || n.includes('full blood count') || n.includes('fbc')) return !!(data?.wbc || data?.hemoglobin || data?.rbc);
    if (n.includes('malaria') || n.includes('mps') || n.includes('blood film')) return !!data?.malariaResult;
    if (n.includes('blood group') || n.includes('blood type') || n.includes('abo')) return !!data?.aboGroup;
    if (n.includes('pregnancy') || n.includes('hcg') || n.includes('upt')) return !!data?.pregnancyResult;
    if (n.includes('hiv') || n.includes('retroviral')) return !!data?.hivResult;
    if (n.includes('widal')) return !!(data?.widalTO || data?.widalTH || data?.widalAO || data?.widalBO);
    if (n.includes('weil') || n.includes('felix')) return !!(data?.wfOX2 || data?.wfOX19 || data?.wfOXK);
    return false;
  };

  const handleDrawerSave = async () => {
    if (!drawerGroup) return;
    const processingTests = drawerGroup.tests.filter(test => test.status === 'Processing');
    const testsWithValues = processingTests.filter(test => {
      const data = inlineTestResults[test.id];
      return data?.value?.trim() || hasStructuredData(test.testName, data);
    });
    const testsWithoutValues = processingTests.filter(test => {
      const data = inlineTestResults[test.id];
      return !data?.value?.trim() && !hasStructuredData(test.testName, data);
    });
    if (testsWithValues.length === 0) {
      toast.error('Please enter result values for at least one test before saving');
      return;
    }
    if (testsWithoutValues.length > 0) {
      toast.info(`${testsWithoutValues.length} test(s) without results will remain in Processing status`);
    }
    const missingRanges = testsWithValues.filter(test => {
      const n = test.testName.toLowerCase();
      const noRangeTest = n.includes('blood group') || n.includes('blood type') || n.includes('abo') ||
        n.includes('pregnancy') || n.includes('hcg') || n.includes('upt') ||
        n.includes('hiv') || n.includes('retroviral') ||
        n.includes('malaria') || n.includes('mps') || n.includes('blood film') ||
        n.includes('widal') || n.includes('weil') || n.includes('felix');
      return !noRangeTest && !inlineTestResults[test.id]?.normalRange?.trim();
    });
    if (missingRanges.length > 0) {
      toast.warning(`Reference ranges not set for: ${missingRanges.map(t => t.testName).join(', ')}. WHO standards will be used.`);
    }
    let successCount = 0;
    setIsLoading(true);
    try {
      for (const test of testsWithValues) {
        const data = inlineTestResults[test.id];
        const structured = getStructuredResultString(test.testName, data);
        const resultString = structured || data?.value || '';
        const resultData = {
          results: resultString,
          normalRange: inlineTestResults[test.id]?.normalRange || getSuggestedReferenceRange(test.testName),
          notes: inlineBatchNotes || undefined
        };
        try {
          const success = await updateTestResult(test.id, resultData);
          if (success) successCount++;
        } catch (error) {
          console.error(`Error saving result for test ${test.id}:`, error);
        }
      }
      if (successCount > 0) {
        toast.success(`Successfully saved results for ${successCount} of ${testsWithValues.length} test(s)`);
        setDrawerGroup(null);
        setInlineTestResults({});
        setInlineBatchNotes('');
      } else {
        toast.error('Failed to save any test results');
      }
    } catch (error) {
      console.error('Error in batch save:', error);
      toast.error('An error occurred while saving test results');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-6 w-full mx-auto">
      <div className="flex flex-col space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Laboratory Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage and process laboratory tests</p>
          </div>
          <button
            onClick={fetchLabTests}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground bg-background hover:bg-muted transition-colors disabled:opacity-50 shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Pending Tests', value: labTests.filter(t => pendingStatuses.includes(t.status)).length, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
            { label: 'Processing', value: labTests.filter(t => t.status === 'Processing').length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
            { label: 'Results Ready', value: labTests.filter(t => t.status === 'Results Available').length, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
            { label: 'Completed', value: labTests.filter(t => completedStatuses.includes(t.status)).length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-xl p-4`}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-background border border-border shadow-sm rounded-xl w-full">
          <div className="p-5 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-3">
              {/* Tabs */}
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pending ({pendingGroupCount})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'completed'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Completed ({completedGroupCount})
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'inventory'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Inventory ({labInventory.length})
                </button>
              </div>

              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patient, test..."
                    className="pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
                  />
                </div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Priorities</option>
                  <option value="STAT">STAT</option>
                  <option value="ASAP">ASAP</option>
                  <option value="Routine">Routine</option>
                </select>
              </div>
            </div>
            
            {activeTab === 'inventory' ? (
              renderInventoryTable()
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground text-lg">Loading laboratory tests...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/20 mb-4">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Data</h3>
                <p className="text-destructive max-w-md mx-auto">{error}</p>
                <button
                  onClick={fetchLabTests}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-destructive hover:bg-destructive"
                >
                  Try Again
                </button>
              </div>
            ) : filteredTestGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/20 mb-4">
                  <Beaker className="h-8 w-8 text-muted-foreground/50" />
            </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Lab Tests Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchQuery || priorityFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : activeTab === 'pending' 
                    ? 'There are no pending laboratory tests at this time.'
                    : 'There are no completed laboratory tests to display.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                      onClick={() => { setSortBy('patientName'); setSortOrder(sortBy === 'patientName' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                      <div className="flex items-center gap-1">Patient Information {sortBy === 'patientName' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                    </th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ordered By / Source</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sex</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                      onClick={() => { setSortBy('requestDate'); setSortOrder(sortBy === 'requestDate' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                      <div className="flex items-center gap-1">Date {sortBy === 'requestDate' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                    </th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                      onClick={() => { setSortBy('priority'); setSortOrder(sortBy === 'priority' && sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                      <div className="flex items-center gap-1">Priority {sortBy === 'priority' && <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                    </th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                    {paginatedGroups.map(group => {
                      // Determine actions available for the group
                      const canCollect = group.tests.some(t => t.status === 'Ordered' || t.status === 'Pending Payment' || t.status === 'Scheduled');
                      const canProcess = group.tests.some(t => t.status === 'Collected');
                      const canComplete = group.tests.some(t => t.status === 'Processing');

                      const handleGroupAction = async (targetStatus: string) => {
                        const sourceStatuses: string[] = [];
                        if (targetStatus === 'Collected') sourceStatuses.push('Ordered', 'Pending Payment', 'Scheduled');
                        if (targetStatus === 'Processing') sourceStatuses.push('Collected');
                        if (targetStatus === 'Results Available') sourceStatuses.push('Processing');

                        const testsToUpdate = group.tests.filter(t => sourceStatuses.includes(t.status));
                        
                        if (testsToUpdate.length === 0) {
                          toast(`No tests in this group are ready for status '${targetStatus}'.`);
                          return;
                        }

                        setIsLoading(true); // Indicate loading during batch update
                        try {
                          let successCount = 0;
                          
                          // Update each test one by one
                          for (const test of testsToUpdate) {
                            try {
                              const result = await labService.updateLabOrderStatus(test.id, targetStatus);
                              successCount++;
                            } catch (testError) {
                              console.error(`Error updating individual test ${test.id}:`, testError);
                            }
                          }
                          
                          if (successCount > 0) {
                            toast.success(`Updated ${successCount} of ${testsToUpdate.length} tests to ${targetStatus}.`);
                          } else {
                            toast.error(`Failed to update any tests to ${targetStatus}.`);
                          }
                        } catch (groupError) {
                          console.error(`Group update error:`, groupError);
                          toast.error(`Error updating tests: ${groupError instanceof Error ? groupError.message : 'Unknown error'}`);
                        } finally {
                          // Always refresh data and reset loading state
                          await fetchLabTests();
                          setIsLoading(false);
                        }
                      };
                      
                      // Generate a list of test IDs for this group - helps with debugging
                      const testIds = group.tests.map(t => t.id).join(', ');
                      return (
                        <>
                        <tr key={group.groupKey} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4">
                            {/* Patient name with dropdown toggle */}
                            <div className="flex items-center cursor-pointer gap-1" onClick={() => togglePatientExpanded(group.patientId)}>
                              {expandedPatients.has(group.patientId) 
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> 
                                : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              }
                              <p className="font-semibold text-foreground">{group.patientName}</p>
                              <span className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">({group.tests.length})</span>
                            </div>
                            
                            {/* Collapsible tests section - Excel style table */}
                            {expandedPatients.has(group.patientId) && (
                              <div className="mt-2 pl-7">
                                <table className="min-w-full border-collapse border border-gray-300 text-xs">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-8">#</th>
                                      <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 w-8"></th>
                                      <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700">Test Name</th>
                                      <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700">Category</th>
                                      <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.tests.map((test, index) => {
                                      const { category, icon } = getTestCategory(test.testName);
                                      const displayStatus = test.status === 'Results Available' && test.source === 'reception' && (test.sentToDoctor || savedToService.has(group.patientId))
                                        ? 'Saved to Service Results'
                                        : test.status === 'Results Available' && test.source === 'doctor' && test.sentToDoctor
                                        ? 'Sent to Doctor'
                                        : test.status;
                                      return (
                                        <tr key={test.id} className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-2 py-1 text-center text-gray-600">{index + 1}</td>
                                          <td className="border border-gray-300 px-2 py-1 text-center [&>svg]:h-3 [&>svg]:w-3">
                                            {icon}
                                          </td>
                                          <td className="border border-gray-300 px-2 py-1 text-gray-900">{test.testName}</td>
                                          <td className="border border-gray-300 px-2 py-1 text-gray-700">{category}</td>
                                          <td className="border border-gray-300 px-2 py-1 align-middle">
                                            <div className="flex items-center justify-center">
                                              <StatusBadge 
                                                status={displayStatus}
                                                className="px-1.5 py-0.5 text-[10px] inline-block text-center"
                                              />
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                      </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-muted-foreground align-top">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-foreground text-xs">{group.orderedBy}</span>
                              {group.tests[0]?.source === 'reception' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                                  Reception Service
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                  Doctor Ordered
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-foreground align-top font-medium">
                            {group.patientAge || 'N/A'}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-foreground align-top capitalize">
                            {group.patientGender || 'N/A'}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-muted-foreground align-top">
                            {new Date(group.requestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-top">
                            <PriorityBadge priority={group.overallPriority} />
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-top">
                            <StatusBadge status={group.overallStatus} />
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-muted-foreground align-top">
                            <div className="flex flex-col gap-1.5">
                              {canCollect && (
                                <button
                                  onClick={() => handleGroupAction('Collected')}
                                  className="px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 rounded-lg text-xs font-semibold hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
                                >
                                  Collect Sample
                                </button>
                              )}
                              {canProcess && (
                                <button
                                  onClick={() => handleGroupAction('Processing')}
                                  className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-lg text-xs font-semibold hover:bg-indigo-200 transition-colors"
                                >
                                  Start Processing
                                </button>
                              )}
                              {canComplete && (
                                <button
                                  onClick={() => {
                                    const initialResults: {[testId: string]: any} = {};
                                    group.tests.filter(t => t.status === 'Processing').forEach(test => {
                                      const standardRange = getSuggestedReferenceRange(test.testName);
                                      initialResults[test.id] = { value: '', normalRange: standardRange || '' };
                                    });
                                    setInlineTestResults(initialResults);
                                    setInlineBatchNotes('');
                                    setDrawerGroup(group);
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                >
                                  ✎ Enter Results
                                </button>
                              )}
                              {group.tests.some(t => t.results) && (
                                <button
                                  onClick={() => {
                                    setSelectedPatient({
                                      patientName: group.patientName,
                                      patientId: group.patientId,
                                      tests: group.tests.filter(t => t.results)
                                    });
                                    setShowDetailsModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors"
                                >
                                  View Results
                                </button>
                              )}
                            </div>
                          </td>
                    </tr>
                    {/* Inline Results Entry Form - replaced by drawer */}
                    {false && editingGroupId === group.groupKey && (
                      <tr>
                        <td colSpan={8} className="px-5 py-5 bg-muted/5 border-t border-border">
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Beaker className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-foreground">Enter Test Results — {group.patientName}</h3>
                                  <p className="text-xs text-muted-foreground">{group.tests.filter(t => t.status === 'Processing').length} test(s) ready for results • Ordered by {group.orderedBy}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                WHO Standard Reference Ranges auto-populated
                              </div>
                            </div>
                            
                            <div className="max-h-[600px] overflow-y-auto space-y-4 pr-1">
                              {group.tests.filter(test => test.status === 'Processing').map(test => {
                                const { category, icon } = getTestCategory(test.testName);
                                return (
                                  <div key={test.id} className="p-4 border border-border rounded-xl bg-background shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        {icon}
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-foreground">{test.testName}</h3>
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{category}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <label htmlFor={`inline-result-${test.id}`} className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                          Result Value <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          id={`inline-result-${test.id}`}
                                          value={inlineTestResults[test.id]?.value || ''}
                                          onChange={(e) => setInlineTestResults({
                                            ...inlineTestResults, 
                                            [test.id]: {...(inlineTestResults[test.id] || {}), value: e.target.value}
                                          })}
                                          placeholder="Enter test result value"
                                          className="block w-full p-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                          required
                                        />
                                      </div>
                                      
                                      {/* Reference Range Input with WHO Standards */}
                                      <div>
                                        <label htmlFor={`inline-normalRange-${test.id}`} className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                          Reference Range
                                          <span className="ml-1.5 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">WHO</span>
                                        </label>
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            id={`inline-normalRange-${test.id}`}
                                            value={inlineTestResults[test.id]?.normalRange || ''}
                                            onChange={(e) => setInlineTestResults({
                                              ...inlineTestResults, 
                                              [test.id]: {...(inlineTestResults[test.id] || {}), normalRange: e.target.value}
                                            })}
                                            placeholder="Auto-populated with WHO standards"
                                            className="flex-1 p-2.5 border border-border rounded-lg bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                          />
                                          {!inlineTestResults[test.id]?.normalRange && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const whoRange = getSuggestedReferenceRange(test.testName);
                                                if (whoRange) {
                                                  setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), normalRange: whoRange}});
                                                } else {
                                                  toast.warning(`No WHO standard available for ${test.testName}`);
                                                }
                                              }}
                                              className="px-3 py-2 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 font-medium"
                                            >
                                              Set WHO
                                            </button>
                                          )}
                                          {inlineTestResults[test.id]?.normalRange && (
                                            <span className="flex items-center text-xs text-green-600 font-medium px-2">✓ Set</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Stool Exam specific fields */}
                                    {test.testName.toLowerCase().includes('stool') && (
                                      <div className="space-y-3 mb-4">
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-1">Stool Examination Parameters</p>
                                          <p className="text-xs text-amber-700 dark:text-amber-400">Fill in all applicable fields for a complete stool analysis report</p>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                          {/* Macroscopic */}
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Colour</label>
                                            <select value={inlineTestResults[test.id]?.colour || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), colour: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Brown">Brown</option>
                                              <option value="Yellow">Yellow</option>
                                              <option value="Green">Green</option>
                                              <option value="Black">Black (Tarry)</option>
                                              <option value="Red">Red (Bloody)</option>
                                              <option value="Clay/White">Clay / White</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Consistency</label>
                                            <select value={inlineTestResults[test.id]?.consistency || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), consistency: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Formed">Formed</option>
                                              <option value="Semi-formed">Semi-formed</option>
                                              <option value="Soft">Soft</option>
                                              <option value="Watery">Watery</option>
                                              <option value="Hard">Hard</option>
                                              <option value="Liquid">Liquid</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Mucus</label>
                                            <select value={inlineTestResults[test.id]?.mucus || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), mucus: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Negative">Negative</option>
                                              <option value="Positive">Positive</option>
                                              <option value="+">+</option>
                                              <option value="++">++</option>
                                              <option value="+++">+++</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Blood</label>
                                            <select value={inlineTestResults[test.id]?.blood || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), blood: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Negative">Negative</option>
                                              <option value="Positive">Positive</option>
                                              <option value="Occult Positive">Occult Positive</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pus Cells (HPF)</label>
                                            <input type="text" value={inlineTestResults[test.id]?.pusCells || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), pusCells: e.target.value}})} placeholder="e.g., 0-2, 5-10" className="block w-full p-2 border border-border rounded-md text-sm bg-background" />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">RBC (HPF)</label>
                                            <input type="text" value={inlineTestResults[test.id]?.rbc || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), rbc: e.target.value}})} placeholder="e.g., Nil, 0-2" className="block w-full p-2 border border-border rounded-md text-sm bg-background" />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ova / Parasite (O/P)</label>
                                            <select value={inlineTestResults[test.id]?.op || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), op: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Negative">Negative</option>
                                              <option value="Positive">Positive</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Parasite Identified</label>
                                            <input type="text" value={inlineTestResults[test.id]?.parasiteType || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), parasiteType: e.target.value}})} placeholder="e.g., E. histolytica, Giardia" className="block w-full p-2 border border-border rounded-md text-sm bg-background" />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fat Globules</label>
                                            <select value={inlineTestResults[test.id]?.fatGlobules || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), fatGlobules: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Negative">Negative</option>
                                              <option value="+">+</option>
                                              <option value="++">++</option>
                                              <option value="+++">+++</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* CBC (Complete Blood Count) specific fields */}
                                    {(test.testName.toLowerCase().includes('cbc') || 
                                      test.testName.toLowerCase().includes('complete blood count') ||
                                      test.testName.toLowerCase().includes('full blood count') ||
                                      test.testName.toLowerCase().includes('fbc')) && (
                                      (() => {
                                        const cbcFields = [
                                          { key: 'wbc', label: 'WBC (White Blood Cells)', type: 'text', unit: '×10³/μL', range: '4.0-10.0' },
                                          { key: 'rbc', label: 'RBC (Red Blood Cells)', type: 'text', unit: '×10⁶/μL', range: 'Male: 4.5-5.9, Female: 4.0-5.2' },
                                          { key: 'hemoglobin', label: 'Hemoglobin (Hgb)', type: 'text', unit: 'g/dL', range: 'Male: 13.0-17.0, Female: 12.0-15.0' },
                                          { key: 'hematocrit', label: 'Hematocrit (Hct)', type: 'text', unit: '%', range: 'Male: 39-49, Female: 36-46' },
                                          { key: 'mcv', label: 'MCV (Mean Corpuscular Volume)', type: 'text', unit: 'fL', range: '80-100' },
                                          { key: 'mch', label: 'MCH (Mean Corpuscular Hemoglobin)', type: 'text', unit: 'pg', range: '27-33' },
                                          { key: 'mchc', label: 'MCHC (Mean Corpuscular Hemoglobin Concentration)', type: 'text', unit: 'g/dL', range: '32-36' },
                                          { key: 'rdw', label: 'RDW (Red Cell Distribution Width)', type: 'text', unit: '%', range: '11.5-14.5' },
                                          { key: 'platelets', label: 'Platelets', type: 'text', unit: '×10³/μL', range: '150-400' },
                                          { key: 'neutrophils', label: 'Neutrophils', type: 'text', unit: '%', range: '40-70' },
                                          { key: 'lymphocytes', label: 'Lymphocytes', type: 'text', unit: '%', range: '20-40' },
                                          { key: 'monocytes', label: 'Monocytes', type: 'text', unit: '%', range: '2-8' },
                                          { key: 'eosinophils', label: 'Eosinophils', type: 'text', unit: '%', range: '1-4' },
                                          { key: 'basophils', label: 'Basophils', type: 'text', unit: '%', range: '0.5-1' }
                                        ];
                                        return (
                                          <div className="space-y-4 mb-4">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                              <p className="text-sm font-medium text-blue-900 mb-1">Complete Blood Count (CBC) Parameters</p>
                                              <p className="text-xs text-blue-700">Enter values for all CBC components with WHO standard reference ranges</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                              {cbcFields.map((f) => (
                                                <div key={f.key} className="space-y-1">
                                                  <label className="block text-sm font-medium text-muted-foreground">
                                                    {f.label}
                                                    {f.unit && <span className="text-xs text-muted-foreground/70 ml-1">({f.unit})</span>}
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={inlineTestResults[test.id]?.[f.key] || ''}
                                                    onChange={(e) => setInlineTestResults({
                                                      ...inlineTestResults,
                                                      [test.id]: {...(inlineTestResults[test.id] || {}), [f.key]: e.target.value}
                                                    })}
                                                    placeholder={`Range: ${f.range}`}
                                                    className="block w-full p-2 border border-border/40 rounded-md shadow-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-primary"
                                                  />
                                                  <p className="text-xs text-muted-foreground/60">Normal: {f.range}</p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })()
                                    )}

                                    {/* Urinalysis specific fields */}
                                    {test.testName.toLowerCase().includes('urinalysis') && (
                                      (() => {
                                        const dipstickFields = [
                                          { key: 'colour', label: 'Colour', type: 'select', options: ['Straw', 'Yellow', 'Amber', 'Brown', 'Red', 'Orange', 'Dark Yellow'] },
                                          { key: 'appearance', label: 'Appearance', type: 'select', options: ['Clear', 'Slightly cloudy', 'Cloudy', 'Turbid', 'Milky'] },
                                          { key: 'ph', label: 'pH', type: 'text' },
                                          { key: 'sg', label: 'Specific Gravity', type: 'text' },
                                          { key: 'protein', label: 'Protein', type: 'select', options: ['Negative', 'Trace', '+1', '+2', '+3', '+4'] },
                                          { key: 'glucose', label: 'Glucose', type: 'select', options: ['Negative', 'Trace', '+1', '+2', '+3', '+4'] },
                                          { key: 'leukocyte', label: 'Leukocyte', type: 'select', options: ['Negative', 'Trace', '+', '++', '+++'] },
                                          { key: 'blood', label: 'Blood', type: 'select', options: ['Negative', 'Trace', '+', '++', '+++'] },
                                          { key: 'ketone', label: 'Ketone', type: 'select', options: ['Negative', 'Trace', '+', '++', '+++'] },
                                          { key: 'bilirubin', label: 'Bilirubin', type: 'select', options: ['Negative', '+', '++', '+++'] },
                                          { key: 'urobilinogen', label: 'Urobilinogen', type: 'select', options: ['Normal', '1+', '2+', '3+'] },
                                          { key: 'nitrate', label: 'Nitrite', type: 'select', options: ['Negative', 'Positive'] },
                                        ];
                                        const microscopyFields = [
                                          { key: 'wbc', label: 'WBC (HPF)', type: 'text', placeholder: 'e.g., 0-5' },
                                          { key: 'rbc', label: 'RBC (HPF)', type: 'text', placeholder: 'e.g., 0-2' },
                                          { key: 'epithelial', label: 'Epithelial Cells', type: 'text', placeholder: 'e.g., Few, 0-5' },
                                          { key: 'cast', label: 'Casts', type: 'text', placeholder: 'e.g., Nil, Hyaline' },
                                          { key: 'bacteria', label: 'Bacteria', type: 'select', options: ['Negative', 'Few', 'Moderate', 'Many'] },
                                          { key: 'crystal', label: 'Crystals', type: 'text', placeholder: 'e.g., Nil, Oxalate' },
                                        ];
                                        return (
                                          <div className="space-y-4 mb-4">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide mb-1">Urinalysis Parameters</p>
                                              <p className="text-xs text-blue-700 dark:text-blue-400">Dipstick (chemical) and microscopy findings</p>
                                            </div>
                                            <div>
                                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dipstick / Chemical Analysis</p>
                                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {dipstickFields.map((f) => (
                                                  <div key={f.key}>
                                                    <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                                                    {f.type === 'select' ? (
                                                      <select value={inlineTestResults[test.id]?.[f.key] || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), [f.key]: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                                        <option value="">Select</option>
                                                        {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                                      </select>
                                                    ) : (
                                                      <input type="text" value={inlineTestResults[test.id]?.[f.key] || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), [f.key]: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background" />
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                            <div>
                                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Microscopy</p>
                                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {microscopyFields.map((f) => (
                                                  <div key={f.key}>
                                                    <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                                                    {f.type === 'select' ? (
                                                      <select value={inlineTestResults[test.id]?.[f.key] || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), [f.key]: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                                        <option value="">Select</option>
                                                        {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                                      </select>
                                                    ) : (
                                                      <input type="text" value={inlineTestResults[test.id]?.[f.key] || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), [f.key]: e.target.value}})} placeholder={(f as any).placeholder || ''} className="block w-full p-2 border border-border rounded-md text-sm bg-background" />
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()
                                    )}
                                    {/* Malaria Test specific fields */}
                                    {(test.testName.toLowerCase().includes('malaria') || test.testName.toLowerCase().includes('mps') || test.testName.toLowerCase().includes('blood film')) && (
                                      <div className="space-y-3 mb-4">
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                          <p className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase tracking-wide mb-1">Malaria / Blood Film Parameters</p>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Result</label>
                                            <select value={inlineTestResults[test.id]?.malariaResult || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), malariaResult: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Negative">Negative</option>
                                              <option value="Positive">Positive</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Species</label>
                                            <select value={inlineTestResults[test.id]?.malariaSpecies || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), malariaSpecies: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select (if positive)</option>
                                              <option value="P. falciparum">P. falciparum</option>
                                              <option value="P. vivax">P. vivax</option>
                                              <option value="P. malariae">P. malariae</option>
                                              <option value="P. ovale">P. ovale</option>
                                              <option value="Mixed">Mixed</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Parasitemia</label>
                                            <input type="text" value={inlineTestResults[test.id]?.parasitemia || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), parasitemia: e.target.value}})} placeholder="e.g., +, ++, +++, 2%" className="block w-full p-2 border border-border rounded-md text-sm bg-background" />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stage</label>
                                            <select value={inlineTestResults[test.id]?.malariaStage || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), malariaStage: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Ring form">Ring form</option>
                                              <option value="Trophozoite">Trophozoite</option>
                                              <option value="Schizont">Schizont</option>
                                              <option value="Gametocyte">Gametocyte</option>
                                              <option value="Mixed stages">Mixed stages</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Blood Group specific fields */}
                                    {(test.testName.toLowerCase().includes('blood group') || test.testName.toLowerCase().includes('blood type') || test.testName.toLowerCase().includes('abo')) && (
                                      <div className="space-y-3 mb-4">
                                        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-3">
                                          <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wide mb-1">Blood Group & Rh Factor</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">ABO Group</label>
                                            <select value={inlineTestResults[test.id]?.aboGroup || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), aboGroup: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="A">A</option>
                                              <option value="B">B</option>
                                              <option value="AB">AB</option>
                                              <option value="O">O</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rh Factor</label>
                                            <select value={inlineTestResults[test.id]?.rhFactor || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), rhFactor: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Positive (+)">Positive (+)</option>
                                              <option value="Negative (-)">Negative (-)</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Pregnancy Test specific fields */}
                                    {(test.testName.toLowerCase().includes('pregnancy') || test.testName.toLowerCase().includes('hcg') || test.testName.toLowerCase().includes('upt')) && (
                                      <div className="space-y-3 mb-4">
                                        <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-3">
                                          <p className="text-xs font-semibold text-pink-800 dark:text-pink-300 uppercase tracking-wide mb-1">Pregnancy Test (hCG)</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Result</label>
                                            <select value={inlineTestResults[test.id]?.pregnancyResult || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), pregnancyResult: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Negative">Negative</option>
                                              <option value="Positive">Positive</option>
                                              <option value="Weakly Positive">Weakly Positive</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* HIV Test specific fields */}
                                    {(test.testName.toLowerCase().includes('hiv') || test.testName.toLowerCase().includes('retroviral')) && (
                                      <div className="space-y-3 mb-4">
                                        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">HIV Screening</p>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Screening Result</label>
                                            <select value={inlineTestResults[test.id]?.hivResult || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), hivResult: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Non-reactive">Non-reactive</option>
                                              <option value="Reactive">Reactive</option>
                                              <option value="Indeterminate">Indeterminate</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Confirmatory</label>
                                            <select value={inlineTestResults[test.id]?.hivConfirmatory || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), hivConfirmatory: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Non-reactive">Non-reactive</option>
                                              <option value="Reactive">Reactive</option>
                                              <option value="Not done">Not done</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Final Interpretation</label>
                                            <select value={inlineTestResults[test.id]?.hivFinal || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), hivFinal: e.target.value}})} className="block w-full p-2 border border-border rounded-md text-sm bg-background">
                                              <option value="">Select</option>
                                              <option value="Negative">Negative</option>
                                              <option value="Positive">Positive</option>
                                              <option value="Indeterminate - Repeat">Indeterminate - Repeat</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            <div>
                              <label htmlFor="inline-batch-notes" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                Lab Notes / Observations
                              </label>
                              <textarea
                                id="inline-batch-notes"
                                value={inlineBatchNotes}
                                onChange={(e) => setInlineBatchNotes(e.target.value)}
                                placeholder="Add any additional notes, observations, or remarks..."
                                rows={2}
                                className="block w-full p-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                              />
                            </div>
                            
                            {/* Summary Section */}
                            <div className="bg-muted/20 border border-border rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                  Results entered: <span className="font-semibold text-foreground">
                                    {group.tests.filter(test => test.status === 'Processing' && inlineTestResults[test.id]?.value?.trim()).length}
                                  </span> / {group.tests.filter(test => test.status === 'Processing').length}
                                </span>
                                <span className="text-muted-foreground">
                                  Ranges set: <span className="font-semibold text-foreground">
                                    {group.tests.filter(test => test.status === 'Processing' && inlineTestResults[test.id]?.normalRange?.trim()).length}
                                  </span> / {group.tests.filter(test => test.status === 'Processing').length}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">Partial saves allowed — remaining tests stay in Processing</p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="pt-3 border-t border-border flex justify-end gap-3">
                              <button
                                onClick={async () => {
                                  const processingTests = group.tests.filter(test => test.status === 'Processing');
                                  const testsWithValues = processingTests.filter(test => inlineTestResults[test.id]?.value?.trim());
                                  const testsWithoutValues = processingTests.filter(test => !inlineTestResults[test.id]?.value?.trim());
                                  
                                  if (testsWithValues.length === 0) {
                                    toast.error('Please enter result values for at least one test before saving');
                                    return;
                                  }
                                  
                                  if (testsWithoutValues.length > 0) {
                                    toast.info(`${testsWithoutValues.length} test(s) without results will remain in Processing status: ${testsWithoutValues.map(t => t.testName).join(', ')}`);
                                  }
                                  
                                  const missingRanges = testsWithValues.filter(test => !inlineTestResults[test.id]?.normalRange?.trim());
                                  if (missingRanges.length > 0) {
                                    toast.warning(`Reference ranges not set for: ${missingRanges.map(t => t.testName).join(', ')}. WHO standards will be used.`);
                                  }
                                  
                                  let successCount = 0;
                                  setIsLoading(true);
                                  
                                  try {
                                    for (const test of testsWithValues) {
                                      const resultData = {
                                        results: (() => {
                                          let base = inlineTestResults[test.id].value;
                                          const lowerName = test.testName.toLowerCase();
                                          if (lowerName.includes('stool')) {
                                            const extra = inlineTestResults[test.id];
                                            base = `Result: ${base}; Colour: ${extra?.colour || '-'}; Consistency: ${extra?.consistency || '-'}; Mucus: ${extra?.mucus || '-'}; Blood: ${extra?.blood || '-'}; Pus Cells: ${extra?.pusCells || '-'}; RBC: ${extra?.rbc || '-'}; O/P: ${extra?.op || '-'}; Parasite: ${extra?.parasiteType || '-'}; Fat Globules: ${extra?.fatGlobules || '-'}`;
                                          } else if (lowerName.includes('cbc') || lowerName.includes('complete blood count') || lowerName.includes('full blood count') || lowerName.includes('fbc')) {
                                            const c = inlineTestResults[test.id];
                                            base = `CBC Results:\nWBC: ${c?.wbc || '-'} ×10³/μL (Normal: 4.0-10.0)\nRBC: ${c?.rbc || '-'} ×10⁶/μL (Normal: Male 4.5-5.9, Female 4.0-5.2)\nHemoglobin: ${c?.hemoglobin || '-'} g/dL (Normal: Male 13.0-17.0, Female 12.0-15.0)\nHematocrit: ${c?.hematocrit || '-'}% (Normal: Male 39-49, Female 36-46)\nMCV: ${c?.mcv || '-'} fL (Normal: 80-100)\nMCH: ${c?.mch || '-'} pg (Normal: 27-33)\nMCHC: ${c?.mchc || '-'} g/dL (Normal: 32-36)\nRDW: ${c?.rdw || '-'}% (Normal: 11.5-14.5)\nPlatelets: ${c?.platelets || '-'} ×10³/μL (Normal: 150-400)\nNeutrophils: ${c?.neutrophils || '-'}% (Normal: 40-70)\nLymphocytes: ${c?.lymphocytes || '-'}% (Normal: 20-40)\nMonocytes: ${c?.monocytes || '-'}% (Normal: 2-8)\nEosinophils: ${c?.eosinophils || '-'}% (Normal: 1-4)\nBasophils: ${c?.basophils || '-'}% (Normal: 0.5-1)`;
                                          } else if (lowerName.includes('urinalysis')) {
                                            const e = inlineTestResults[test.id];
                                            base = `Result: ${base}; Colour: ${e?.colour || '-'}; Appearance: ${e?.appearance || '-'}; pH: ${e?.ph || '-'}; SG: ${e?.sg || '-'}; Protein: ${e?.protein || '-'}; Glucose: ${e?.glucose || '-'}; Leukocyte: ${e?.leukocyte || '-'}; Blood: ${e?.blood || '-'}; Ketone: ${e?.ketone || '-'}; Bilirubin: ${e?.bilirubin || '-'}; Urobilinogen: ${e?.urobilinogen || '-'}; Nitrate: ${e?.nitrate || '-'}; WBC: ${e?.wbc || '-'}; RBC: ${e?.rbc || '-'}; Epithelial Cells: ${e?.epithelial || '-'}; Cast: ${e?.cast || '-'}; Bacteria: ${e?.bacteria || '-'}; Crystal: ${e?.crystal || '-'}`;
                                          } else if (lowerName.includes('malaria') || lowerName.includes('mps') || lowerName.includes('blood film')) {
                                            const m = inlineTestResults[test.id];
                                            base = `Result: ${m?.malariaResult || base}; Species: ${m?.malariaSpecies || '-'}; Parasitemia: ${m?.parasitemia || '-'}; Stage: ${m?.malariaStage || '-'}`;
                                          } else if (lowerName.includes('blood group') || lowerName.includes('blood type') || lowerName.includes('abo')) {
                                            const bg = inlineTestResults[test.id];
                                            base = `Blood Group: ${bg?.aboGroup || base}; Rh Factor: ${bg?.rhFactor || '-'}`;
                                          } else if (lowerName.includes('pregnancy') || lowerName.includes('hcg') || lowerName.includes('upt')) {
                                            const pg = inlineTestResults[test.id];
                                            base = pg?.pregnancyResult || base;
                                          } else if (lowerName.includes('hiv') || lowerName.includes('retroviral')) {
                                            const hiv = inlineTestResults[test.id];
                                            base = `Screening: ${hiv?.hivResult || base}; Confirmatory: ${hiv?.hivConfirmatory || '-'}; Final: ${hiv?.hivFinal || '-'}`;
                                          }
                                          return base;
                                        })(),
                                        normalRange: inlineTestResults[test.id]?.normalRange || getSuggestedReferenceRange(test.testName),
                                        notes: inlineBatchNotes || undefined
                                      };
                                      
                                      try {
                                        const success = await updateTestResult(test.id, resultData);
                                        if (success) successCount++;
                                      } catch (error) {
                                        console.error(`Error saving result for test ${test.id}:`, error);
                                      }
                                    }
                                    
                                    if (successCount > 0) {
                                      toast.success(`Successfully saved results for ${successCount} of ${testsWithValues.length} test(s)${testsWithoutValues.length > 0 ? `. ${testsWithoutValues.length} test(s) remain in Processing` : ''}`);
                                      setEditingGroupId(null);
                                      setInlineTestResults({});
                                      setInlineBatchNotes('');
                                    } else {
                                      toast.error('Failed to save any test results');
                                    }
                                  } catch (error) {
                                    console.error('Error in batch save:', error);
                                    toast.error('An error occurred while saving test results');
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }}
                                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                              >
                                ✓ Save Results
                              </button>
                              
                              <button
                                onClick={() => {
                                  setEditingGroupId(null);
                                  setInlineTestResults({});
                                  setInlineBatchNotes('');
                                }}
                                className="px-5 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-semibold hover:bg-muted/80 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                        </>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination footer */}
          {filteredTestGroups.length > 0 && (
            <div className="flex items-center justify-between px-2 pt-4 pb-1">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredTestGroups.length)}–{Math.min(currentPage * PAGE_SIZE, filteredTestGroups.length)}</span> of <span className="font-semibold text-foreground">{filteredTestGroups.length}</span> patient group{filteredTestGroups.length !== 1 ? 's' : ''}
                {(searchQuery || priorityFilter !== 'all') && (
                  <span className="ml-1 text-muted-foreground">(filtered)</span>
                )}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >«</button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >‹ Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                            currentPage === p
                              ? 'bg-primary text-primary-foreground border-primary font-semibold'
                              : 'border-border bg-background hover:bg-muted'
                          }`}
                        >{p}</button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >Next ›</button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >»</button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
      
      {/* Result Entry Drawer */}
      {drawerGroup && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => { setDrawerGroup(null); setInlineTestResults({}); setInlineBatchNotes(''); }}
          />
          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 flex flex-col bg-background shadow-2xl border-l border-border">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Beaker className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{drawerGroup.patientName}</h3>
                  <p className="text-xs text-muted-foreground">{drawerGroup.tests.filter(t => t.status === 'Processing').length} test(s) • {drawerGroup.orderedBy}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:flex items-center gap-1 text-xs text-primary bg-primary/10 border border-primary/20 rounded-md px-2 py-1">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  WHO Ranges
                </span>
                <button
                  onClick={() => { setDrawerGroup(null); setInlineTestResults({}); setInlineBatchNotes(''); }}
                  className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {drawerGroup.tests.filter(test => test.status === 'Processing').map(test => {
                const { category, icon } = getTestCategory(test.testName);
                const lowerName = test.testName.toLowerCase();
                return (
                  <div key={test.id} className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                    {/* Test card header */}
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-muted/20 border-b border-border">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{test.testName}</p>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{category}</span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Generic Result + Range — hidden for tests that use specific structured fields */}
                      {(() => {
                        const isStructured = lowerName.includes('stool') || lowerName.includes('urinalysis') ||
                          lowerName.includes('cbc') || lowerName.includes('complete blood count') || lowerName.includes('full blood count') || lowerName.includes('fbc') ||
                          lowerName.includes('malaria') || lowerName.includes('mps') || lowerName.includes('blood film') ||
                          lowerName.includes('blood group') || lowerName.includes('blood type') || lowerName.includes('abo') ||
                          lowerName.includes('pregnancy') || lowerName.includes('hcg') || lowerName.includes('upt') ||
                          lowerName.includes('hiv') || lowerName.includes('retroviral') ||
                          lowerName.includes('widal') || lowerName.includes('weil') || lowerName.includes('felix');
                        const noRange = lowerName.includes('blood group') || lowerName.includes('blood type') || lowerName.includes('abo') ||
                          lowerName.includes('pregnancy') || lowerName.includes('hcg') || lowerName.includes('upt') ||
                          lowerName.includes('hiv') || lowerName.includes('retroviral') ||
                          lowerName.includes('malaria') || lowerName.includes('mps') || lowerName.includes('blood film') ||
                          lowerName.includes('widal') || lowerName.includes('weil') || lowerName.includes('felix');
                        if (isStructured) return null;
                        return (
                          <div className={`grid gap-3 ${noRange ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            <div>
                              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                Result <span className="text-destructive">*</span>
                              </label>
                              <input
                                type="text"
                                value={inlineTestResults[test.id]?.value || ''}
                                onChange={(e) => setInlineTestResults({ ...inlineTestResults, [test.id]: { ...(inlineTestResults[test.id] || {}), value: e.target.value } })}
                                placeholder="Enter value"
                                className="block w-full px-2.5 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>
                            {!noRange && (
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                  Ref. Range <span className="text-xs text-primary bg-primary/10 px-1 py-0.5 rounded font-medium">WHO</span>
                                </label>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={inlineTestResults[test.id]?.normalRange || ''}
                                    onChange={(e) => setInlineTestResults({ ...inlineTestResults, [test.id]: { ...(inlineTestResults[test.id] || {}), normalRange: e.target.value } })}
                                    placeholder="Range"
                                    className="flex-1 min-w-0 px-2.5 py-2 border border-border rounded-lg bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                  />
                                  {!inlineTestResults[test.id]?.normalRange ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const whoRange = getSuggestedReferenceRange(test.testName);
                                        if (whoRange) {
                                          setInlineTestResults({ ...inlineTestResults, [test.id]: { ...(inlineTestResults[test.id] || {}), normalRange: whoRange } });
                                        } else {
                                          toast.warning(`No WHO standard available for ${test.testName}`);
                                        }
                                      }}
                                      className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 font-medium whitespace-nowrap"
                                    >WHO</button>
                                  ) : (
                                    <span className="flex items-center text-xs text-green-600 font-medium px-1">✓</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Stool-specific fields */}
                      {lowerName.includes('stool') && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Stool Parameters</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Colour</label>
                              <select value={inlineTestResults[test.id]?.colour || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), colour: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option>
                                <option>Brown</option><option>Yellow</option><option>Green</option><option>Black (Tarry)</option><option>Red (Bloody)</option><option>Clay / White</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Consistency</label>
                              <select value={inlineTestResults[test.id]?.consistency || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), consistency: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option>
                                <option>Formed</option><option>Semi-formed</option><option>Soft</option><option>Watery</option><option>Hard</option><option>Liquid</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Mucus</label>
                              <select value={inlineTestResults[test.id]?.mucus || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), mucus: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option>
                                <option>Negative</option><option>Positive</option><option>+</option><option>++</option><option>+++</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Blood</label>
                              <select value={inlineTestResults[test.id]?.blood || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), blood: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option>
                                <option>Negative</option><option>Positive</option><option>Occult Positive</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Pus Cells (HPF)</label>
                              <input type="text" value={inlineTestResults[test.id]?.pusCells || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), pusCells: e.target.value}})} placeholder="e.g. 0-2" className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background" />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">RBC (HPF)</label>
                              <input type="text" value={inlineTestResults[test.id]?.rbc || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), rbc: e.target.value}})} placeholder="e.g. Nil" className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background" />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Ova / Parasite</label>
                              <select value={inlineTestResults[test.id]?.op || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), op: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option>
                                <option>Not Seen</option><option>Seen</option><option>Positive</option><option>Negative</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Parasite Type</label>
                              <input type="text" value={inlineTestResults[test.id]?.parasiteType || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), parasiteType: e.target.value}})} placeholder="If identified" className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-muted-foreground mb-1">Fat Globules</label>
                              <select value={inlineTestResults[test.id]?.fatGlobules || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), fatGlobules: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option>
                                <option>Not Seen</option><option>Few</option><option>Moderate</option><option>Many</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Urinalysis-specific fields */}
                      {lowerName.includes('urinalysis') && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Dipstick / Chemical</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[['colour','Colour'],['appearance','Appearance'],['ph','pH'],['sg','Sp. Gravity'],['protein','Protein'],['glucose','Glucose'],['leukocyte','Leukocyte'],['blood','Blood'],['ketone','Ketone'],['bilirubin','Bilirubin'],['urobilinogen','Urobilinogen'],['nitrate','Nitrite']].map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                                <input type="text" value={inlineTestResults[test.id]?.[field] || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), [field]: e.target.value}})} placeholder="-" className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background" />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide pt-1">Microscopy</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[['wbc','WBC (HPF)'],['rbc','RBC (HPF)'],['epithelial','Epithelial'],['cast','Cast'],['bacteria','Bacteria'],['crystal','Crystal']].map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                                <input type="text" value={inlineTestResults[test.id]?.[field] || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), [field]: e.target.value}})} placeholder="-" className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CBC-specific fields */}
                      {(lowerName.includes('cbc') || lowerName.includes('complete blood count') || lowerName.includes('full blood count') || lowerName.includes('fbc')) && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">CBC Parameters</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[['wbc','WBC (×10³/μL)'],['rbc','RBC (×10⁶/μL)'],['hemoglobin','Hemoglobin (g/dL)'],['hematocrit','Hematocrit (%)'],['mcv','MCV (fL)'],['mch','MCH (pg)'],['mchc','MCHC (g/dL)'],['rdw','RDW (%)'],['platelets','Platelets (×10³/μL)'],['neutrophils','Neutrophils (%)'],['lymphocytes','Lymphocytes (%)'],['monocytes','Monocytes (%)'],['eosinophils','Eosinophils (%)'],['basophils','Basophils (%)']].map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                                <input type="text" value={inlineTestResults[test.id]?.[field] || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), [field]: e.target.value}})} placeholder="-" className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Malaria-specific fields */}
                      {(lowerName.includes('malaria') || lowerName.includes('mps') || lowerName.includes('blood film')) && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Malaria / Blood Film</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Result</label>
                              <select value={inlineTestResults[test.id]?.malariaResult || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), malariaResult: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option><option>Negative</option><option>Positive</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Species</label>
                              <select value={inlineTestResults[test.id]?.malariaSpecies || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), malariaSpecies: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option><option>P. falciparum</option><option>P. vivax</option><option>P. malariae</option><option>P. ovale</option><option>Mixed</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Parasitemia</label>
                              <input type="text" value={inlineTestResults[test.id]?.parasitemia || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), parasitemia: e.target.value}})} placeholder="e.g. 2+" className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background" />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Stage</label>
                              <select value={inlineTestResults[test.id]?.malariaStage || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), malariaStage: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option><option>Ring</option><option>Trophozoite</option><option>Schizont</option><option>Gametocyte</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Blood Group-specific fields */}
                      {(lowerName.includes('blood group') || lowerName.includes('blood type') || lowerName.includes('abo')) && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">Blood Group</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">ABO Group</label>
                              <select value={inlineTestResults[test.id]?.aboGroup || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), aboGroup: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option><option>A</option><option>B</option><option>AB</option><option>O</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Rh Factor</label>
                              <select value={inlineTestResults[test.id]?.rhFactor || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), rhFactor: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option><option>Positive (+)</option><option>Negative (-)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pregnancy Test fields */}
                      {(lowerName.includes('pregnancy') || lowerName.includes('hcg') || lowerName.includes('upt')) && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <p className="text-xs font-semibold text-pink-700 dark:text-pink-400 uppercase tracking-wide">Pregnancy Test</p>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Result</label>
                            <select value={inlineTestResults[test.id]?.pregnancyResult || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), pregnancyResult: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                              <option value="">Select</option><option>Negative</option><option>Positive</option><option>Invalid</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* HIV Screening fields */}
                      {(lowerName.includes('hiv') || lowerName.includes('retroviral')) && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide">HIV Screening</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Screening Result</label>
                              <select value={inlineTestResults[test.id]?.hivResult || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), hivResult: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option><option>Non-Reactive</option><option>Reactive</option><option>Indeterminate</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Confirmatory</label>
                              <select value={inlineTestResults[test.id]?.hivConfirmatory || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), hivConfirmatory: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option><option>Non-Reactive</option><option>Reactive</option><option>Not Done</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-muted-foreground mb-1">Final Interpretation</label>
                              <select value={inlineTestResults[test.id]?.hivFinal || ''} onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), hivFinal: e.target.value}})} className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background">
                                <option value="">Select</option><option>HIV Negative</option><option>HIV Positive</option><option>Indeterminate - Repeat</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Widal Test fields */}
                      {(lowerName.includes('widal')) && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Widal Agglutination Titers</p>
                            <span className="text-xs text-muted-foreground">Significant: ≥1:160</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              ['widalTO', 'S. Typhi O'],
                              ['widalTH', 'S. Typhi H'],
                              ['widalAO', 'S. Para A O'],
                              ['widalAH', 'S. Para A H'],
                              ['widalBO', 'S. Para B O'],
                              ['widalBH', 'S. Para B H'],
                            ].map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                                <select
                                  value={inlineTestResults[test.id]?.[field] || ''}
                                  onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), [field]: e.target.value}})}
                                  className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background"
                                >
                                  <option value="">Select</option>
                                  <option>Negative</option>
                                  <option>1:20</option><option>1:40</option><option>1:80</option>
                                  <option>1:160</option><option>1:320</option><option>1:640</option><option>1:1280</option>
                                </select>
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Interpretation</label>
                            <select
                              value={inlineTestResults[test.id]?.widalInterpretation || ''}
                              onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), widalInterpretation: e.target.value}})}
                              className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background"
                            >
                              <option value="">Select</option>
                              <option>Negative — No significant agglutination</option>
                              <option>Positive — Significant titer (≥1:160)</option>
                              <option>Borderline — Repeat in 1 week</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Weil-Felix Test fields */}
                      {(lowerName.includes('weil') || lowerName.includes('felix')) && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Weil-Felix Agglutination Titers</p>
                            <span className="text-xs text-muted-foreground">Significant: ≥1:160</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              ['wfOX2', 'OX-2 (Proteus)'],
                              ['wfOX19', 'OX-19 (Proteus)'],
                              ['wfOXK', 'OX-K (Proteus)'],
                            ].map(([field, label]) => (
                              <div key={field}>
                                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                                <select
                                  value={inlineTestResults[test.id]?.[field] || ''}
                                  onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), [field]: e.target.value}})}
                                  className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background"
                                >
                                  <option value="">Select</option>
                                  <option>Negative</option>
                                  <option>1:20</option><option>1:40</option><option>1:80</option>
                                  <option>1:160</option><option>1:320</option><option>1:640</option><option>1:1280</option>
                                </select>
                              </div>
                            ))}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Interpretation</label>
                              <select
                                value={inlineTestResults[test.id]?.wfInterpretation || ''}
                                onChange={(e) => setInlineTestResults({...inlineTestResults, [test.id]: {...(inlineTestResults[test.id] || {}), wfInterpretation: e.target.value}})}
                                className="block w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background"
                              >
                                <option value="">Select</option>
                                <option>Negative</option>
                                <option>Positive — Rickettsia suspected</option>
                                <option>Borderline — Repeat advised</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Lab Notes */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Lab Notes / Observations</label>
                <textarea
                  value={inlineBatchNotes}
                  onChange={(e) => setInlineBatchNotes(e.target.value)}
                  rows={2}
                  placeholder="Add any additional notes, observations, or remarks..."
                  className="block w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-muted/10">
              <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                <span>
                  Results: <span className="font-semibold text-foreground">
                    {drawerGroup.tests.filter(t => t.status === 'Processing' && (inlineTestResults[t.id]?.value?.trim() || hasStructuredData(t.testName, inlineTestResults[t.id]))).length}
                  </span> / {drawerGroup.tests.filter(t => t.status === 'Processing').length} entered
                </span>
                <span className="text-xs text-muted-foreground">Partial saves allowed</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setDrawerGroup(null); setInlineTestResults({}); setInlineBatchNotes(''); }}
                  className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-semibold hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDrawerSave}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : '✓ Save Results'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Details Modal */}
      {selectedPatient && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title=""
          size="4xl"
        >
          {(() => {
            // Helper: parse a semicolon-separated key:value result string into an array of {key, value}
            const parseResultString = (s: string): {key: string; value: string}[] => {
              return s.split(';').map(part => {
                const idx = part.indexOf(':');
                if (idx === -1) return { key: 'Result', value: part.trim() };
                return { key: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() };
              }).filter(p => p.value && p.value !== '-');
            };

            // Helper: determine flag for a numeric result vs a range string like "70-100"
            const getFlag = (value: string, range: string): 'H' | 'L' | 'N' | null => {
              const num = parseFloat(value);
              if (isNaN(num)) {
                if (!range) return null;
                const negMatch = /^(neg|negative|non.?reactive|not seen|absent)/i.test(range);
                if (negMatch) {
                  const isNeg = /^(neg|negative|non.?reactive|not seen|absent|-)/i.test(value);
                  return isNeg ? 'N' : 'H';
                }
                return null;
              }
              const rangeMatch = range.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
              if (rangeMatch) {
                const lo = parseFloat(rangeMatch[1]), hi = parseFloat(rangeMatch[2]);
                if (num < lo) return 'L';
                if (num > hi) return 'H';
                return 'N';
              }
              return null;
            };

            const renderResultContent = (test: LabTest) => {
              // Unwrap JSON-stored results: backend may store {results: "...", normalRange: "..."}
              let raw = '';
              let range = typeof test.normalRange === 'string' ? test.normalRange : '';

              if (typeof test.results === 'string') {
                // Try to parse as JSON first
                try {
                  const parsed = JSON.parse(test.results);
                  if (parsed && typeof parsed === 'object') {
                    raw = parsed.results ?? parsed.result ?? parsed.value ?? parsed.resultString ?? '';
                    if (!range) range = parsed.normalRange ?? parsed.normal_range ?? '';
                  } else {
                    raw = test.results;
                  }
                } catch {
                  raw = test.results;
                }
              } else if (test.results && typeof test.results === 'object') {
                const obj = test.results as any;
                raw = obj.results ?? obj.result ?? obj.value ?? obj.resultString ?? '';
                if (!range) range = obj.normalRange ?? obj.normal_range ?? '';
                // If still no raw, stringify remaining keys
                if (!raw) raw = JSON.stringify(test.results);
              }

              // A "structured" result uses our key: value; key: value format (not JSON)
              const isStructuredStr = raw.includes(';') || (raw.includes(':') && !raw.trim().startsWith('{'));

              if (isStructuredStr) {
                const pairs = parseResultString(raw);
                return (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead>
                        <tr className="bg-muted/40">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-1/2">Parameter</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide w-12">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-background">
                        {pairs.map((p, i) => {
                          const flag = getFlag(p.value, '');
                          const isAbnormal = /^(positive|reactive|seen|present)/i.test(p.value);
                          return (
                            <tr key={i} className={`${isAbnormal ? 'bg-red-50/40 dark:bg-red-900/10' : i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                              <td className="px-4 py-2.5 font-medium text-foreground">{p.key}</td>
                              <td className={`px-4 py-2.5 font-semibold ${isAbnormal ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{p.value}</td>
                              <td className="px-4 py-2.5 text-center">
                                {isAbnormal ? <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold">!</span> : <span className="text-muted-foreground text-xs">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }

              // Plain single value
              const flag = getFlag(raw, range);
              return (
                <div className="flex items-start gap-6 p-4 rounded-lg bg-muted/10 border border-border">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Result</p>
                    <p className={`text-2xl font-bold ${flag === 'H' ? 'text-red-600' : flag === 'L' ? 'text-blue-600' : flag === 'N' ? 'text-green-600' : 'text-foreground'}`}>{raw || '—'}</p>
                  </div>
                  {range && (
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Reference Range</p>
                      <p className="text-sm text-muted-foreground">{range}</p>
                    </div>
                  )}
                  {flag && (
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flag</p>
                      <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold ${
                        flag === 'H' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                        flag === 'L' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                      }`}>{flag}</span>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className="flex flex-col h-full">
                {/* Patient header banner */}
                <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-primary">{selectedPatient.patientName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{selectedPatient.patientName}</h2>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{selectedPatient.tests.length} test{selectedPatient.tests.length !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>Ordered by {selectedPatient.tests[0]?.orderedBy}</span>
                          <span>•</span>
                          <span>{new Date(selectedPatient.tests[0]?.requestDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setShowDetailsModal(false)} className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Scrollable test cards */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 max-h-[60vh]">
                  {selectedPatient.tests.map((test, idx) => {
                    const { category, icon } = getTestCategory(test.testName);
                    return (
                      <div key={test.id} className="border border-border rounded-xl overflow-hidden shadow-sm">
                        {/* Test card header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium">#{idx + 1}</span>
                                <h3 className="font-semibold text-foreground">{test.testName}</h3>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{category}</span>
                                <StatusBadge status={test.status} />
                                <PriorityBadge priority={test.priority} />
                              </div>
                            </div>
                          </div>
                          {/* Compact timeline */}
                          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                              {new Date(test.requestDate).toLocaleDateString()}
                            </span>
                            {test.collectionDate && (
                              <>
                                <span className="text-muted-foreground/40">→</span>
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400"></span>
                                  Collected
                                </span>
                              </>
                            )}
                            {test.resultDate && (
                              <>
                                <span className="text-muted-foreground/40">→</span>
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
                                  Resulted
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Result content */}
                        <div className="p-4">
                          {test.results ? (
                            renderResultContent(test)
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                              <Clock className="h-4 w-4" />
                              <span>No results recorded yet</span>
                            </div>
                          )}
                          {test.notes && (
                            <div className="mt-3 pt-3 border-t border-border flex gap-2 text-sm">
                              <span className="font-semibold text-muted-foreground flex-shrink-0">Notes:</span>
                              <span className="text-muted-foreground">{typeof test.notes === 'object' ? JSON.stringify(test.notes) : test.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer actions */}
                <div className="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-between gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm">
                    {(() => {
                      const isSent = (t: LabTest) => t.sentToDoctor || t.status === 'Sent to Doctor' || t.status === 'Completed';
                      const sentTests = selectedPatient.tests.filter(isSent);
                      const total = selectedPatient.tests.length;
                      if (sentTests.length === 0) return null;
                      if (sentTests.length === total) return (
                        <span className="flex items-center gap-1.5 text-green-600 font-medium">
                          <CheckCircle className="h-4 w-4" /> All results sent to doctor
                        </span>
                      );
                      return (
                        <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                          <CheckCircle className="h-4 w-4" /> {sentTests.length}/{total} sent to doctor
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const patientDetails = await patientService.getPatientById(selectedPatient.patientId);
                          const calcAge = (dob: string | Date) => {
                            if (!dob) return 'N/A';
                            const b = new Date(dob), t = new Date();
                            let a = t.getFullYear() - b.getFullYear();
                            if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
                            return String(a);
                          };
                          const enhancedPatient = {
                            patientName: selectedPatient.patientName,
                            patientId: selectedPatient.patientId,
                            age: calcAge(patientDetails.dateOfBirth),
                            gender: patientDetails.gender || 'N/A',
                            dateOfBirth: patientDetails.dateOfBirth ? new Date(patientDetails.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
                            tests: selectedPatient.tests.map(t => ({ testName: t.testName, results: t.results, normalRange: t.normalRange, notes: t.notes, orderedBy: t.orderedBy, requestDate: t.requestDate }))
                          };
                          const pw = window.open('', '_blank');
                          if (pw) { pw.document.write(generateProfessionalLabReportHTML(enhancedPatient)); pw.document.close(); pw.print(); }
                        } catch { toast.error('Failed to fetch patient details for printing'); }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground bg-background hover:bg-muted transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Print
                    </button>

                    {(() => {
                      const isSentStatus = (t: LabTest) =>
                        t.sentToDoctor || t.status === 'Sent to Doctor' || t.status === 'Completed';

                      if (selectedPatient.tests.some(t => t.source === 'reception')) {
                        const unsent = selectedPatient.tests.filter(t => t.source === 'reception' && !isSentStatus(t));
                        const sentCount = selectedPatient.tests.filter(t => t.source === 'reception' && isSentStatus(t)).length;
                        const total = selectedPatient.tests.filter(t => t.source === 'reception').length;
                        if (unsent.length === 0) return (
                          <button disabled className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white cursor-not-allowed">
                            <CheckCircle className="h-4 w-4" /> Saved to Service
                          </button>
                        );
                        return (
                          <button onClick={() => saveResultsToServiceResults(selectedPatient.patientId, selectedPatient.patientName, unsent)} disabled={isSending}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
                            {isSending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</> : <><FileText className="h-4 w-4" /> Save {unsent.length}{sentCount > 0 ? ` remaining` : ''} to Service</>}
                          </button>
                        );
                      } else {
                        const unsent = selectedPatient.tests.filter(t => !isSentStatus(t) && !!t.results);
                        const sentCount = selectedPatient.tests.filter(t => isSentStatus(t)).length;
                        const total = selectedPatient.tests.length;
                        if (unsent.length === 0 || sentCount === total) return (
                          <button disabled className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white cursor-not-allowed">
                            <CheckCircle className="h-4 w-4" /> Sent to Doctor
                          </button>
                        );
                        return (
                          <button onClick={() => sendAllResultsToDoctor(selectedPatient.patientId, selectedPatient.patientName, selectedPatient.tests)} disabled={isSending}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
                            {isSending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send {unsent.length}{sentCount > 0 ? ` remaining` : ''} to Doctor</>}
                          </button>
                        );
                      }
                    })()}

                    <button onClick={() => setShowDetailsModal(false)}
                      className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground bg-background hover:bg-muted transition-colors">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
      
      {/* Results Entry Modal */}
      {selectedGroup && (
        <Modal
          isOpen={showBatchResultsModal}
          onClose={() => setShowBatchResultsModal(false)}
          title={`Enter Results: ${selectedGroup.patientName}`}
          size="5xl"
        >
          <div className="space-y-4">
            {/* WHO Standards Information Banner */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-primary/50" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-primary">
                    WHO Standard Reference Ranges
                  </h3>
                  <div className="mt-1 text-sm text-primary">
                    <p>Reference ranges are automatically populated with World Health Organization (WHO) standards. These ranges are based on international guidelines and represent normal values for healthy adults.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-b border-border/30 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedGroup.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ordered By</p>
                  <p className="font-medium">{selectedGroup.orderedBy}</p>
                </div>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {selectedGroup.tests.filter(test => test.status === 'Processing').map(test => {
                const { category, icon } = getTestCategory(test.testName);
                return (
                  <div key={test.id} className="mb-6 p-4 border border-border/30 rounded-lg">
                    <div className="flex items-center mb-3">
                      {icon}
                      <h3 className="font-medium text-lg text-muted-foreground ml-2">{test.testName}</h3>
                      <span className="ml-2 text-xs text-muted-foreground bg-muted/20 px-2 py-0.5 rounded">
                        {category}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 mb-4">
                      <div>
                        <label htmlFor={`result-${test.id}`} className="block text-sm font-medium text-muted-foreground mb-1">
                          Result Value <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          id={`result-${test.id}`}
                          value={testResults[test.id]?.value || ''}
                          onChange={(e) => setTestResults({
                            ...testResults, 
                            [test.id]: {...(testResults[test.id] || {}), value: e.target.value}
                          })}
                          placeholder="Enter test result value"
                          className="block w-full p-2 border border-border/40 rounded-md shadow-sm"
                          required
                        />
                      </div>
                      
                      {/* Reference Range Input with WHO Standards */}
                      <div>
                        <label htmlFor={`normalRange-${test.id}`} className="block text-sm font-medium text-muted-foreground mb-1">
                          Reference Range (WHO Standards) 
                          <span className="ml-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                            WHO
                          </span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            id={`normalRange-${test.id}`}
                            value={testResults[test.id]?.normalRange || ''}
                            onChange={(e) => setTestResults({
                              ...testResults, 
                              [test.id]: {...(testResults[test.id] || {}), normalRange: e.target.value}
                            })}
                            placeholder="Auto-populated with WHO standards"
                            className="flex-1 p-2 border border-border/40 rounded-md shadow-sm bg-muted/10 focus:ring-2 focus:ring-blue-500 focus:border-primary"
                            title={`WHO standard reference range for ${test.testName}`}
                          />
                          {!testResults[test.id]?.normalRange && (
                            <button
                              type="button"
                              onClick={() => {
                                const whoRange = getSuggestedReferenceRange(test.testName);
                                if (whoRange) {
                                  setTestResults({
                                    ...testResults,
                                    [test.id]: {...(testResults[test.id] || {}), normalRange: whoRange}
                                  });
                                  toast.success(`WHO standard reference range set for ${test.testName}`);
                                } else {
                                  toast.warning(`No WHO standard available for ${test.testName}`);
                                }
                              }}
                              className="px-3 py-2 text-xs bg-primary/20 text-primary rounded-md hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              title="Click to auto-populate WHO standard reference range"
                            >
                              WHO
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            WHO standard reference range for {test.testName}
                          </p>
                          {testResults[test.id]?.normalRange && (
                            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                              ✓ Set
                            </span>
                          )}
                        </div>
                      </div>
                      </div>
                      
                    {test.testName.toLowerCase().includes('stool') && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Consistency</label>
                          <select
                            value={testResults[test.id]?.consistency || ''}
                            onChange={(e) => setTestResults({
                              ...testResults,
                              [test.id]: {...(testResults[test.id] || {}), consistency: e.target.value}
                            })}
                            className="block w-full p-2 border border-border/40 rounded-md shadow-sm"
                          >
                            <option value="">Select</option>
                            <option value="Watery">Watery</option>
                            <option value="Semi-formed">Semi-formed</option>
                            <option value="Formed">Formed</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">O/P (Ova/Parasite)</label>
                          <select
                            value={testResults[test.id]?.op || ''}
                            onChange={(e) => setTestResults({
                              ...testResults,
                              [test.id]: {...(testResults[test.id] || {}), op: e.target.value}
                            })}
                            className="block w-full p-2 border border-border/40 rounded-md shadow-sm"
                          >
                            <option value="">Select</option>
                            <option value="Positive">Positive</option>
                            <option value="Negative">Negative</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Appearance / Colour</label>
                        <input
                          type="text"
                            value={testResults[test.id]?.appearance || ''}
                          onChange={(e) => setTestResults({
                            ...testResults, 
                              [test.id]: {...(testResults[test.id] || {}), appearance: e.target.value}
                          })}
                            placeholder="e.g., Brown"
                            className="block w-full p-2 border border-border/40 rounded-md shadow-sm"
                        />
                      </div>
                    </div>
                    )}

                    {/* CBC Components - Show all components when test is Complete Blood Count */}
                    {(test.testName.toLowerCase().includes('complete blood count') || 
                      test.testName.toLowerCase().includes('cbc') ||
                      test.testName.toLowerCase().includes('full blood count') ||
                      test.testName.toLowerCase().includes('fbc')) && (
                      (() => {
                        const cbcFields = [
                          { key: 'wbc', label: 'WBC (White Blood Cell Count)', unit: '/μL', normalRange: '4,000-10,000/μL' },
                          { key: 'rbc', label: 'RBC (Red Blood Cell Count)', unit: '× 10^6/μL', normalRange: 'Male: 4.5-5.9, Female: 4.0-5.2' },
                          { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', normalRange: 'Male: 13.0-17.0, Female: 12.0-15.0' },
                          { key: 'hematocrit', label: 'Hematocrit', unit: '%', normalRange: 'Male: 39-49%, Female: 36-46%' },
                          { key: 'mcv', label: 'MCV (Mean Corpuscular Volume)', unit: 'fL', normalRange: '80-100 fL' },
                          { key: 'mch', label: 'MCH (Mean Corpuscular Hemoglobin)', unit: 'pg', normalRange: '27-33 pg' },
                          { key: 'mchc', label: 'MCHC (Mean Corpuscular Hemoglobin Concentration)', unit: 'g/dL', normalRange: '32-36 g/dL' },
                          { key: 'rdw', label: 'RDW (Red Cell Distribution Width)', unit: '%', normalRange: '11.5-14.5%' },
                          { key: 'plateletCount', label: 'Platelet Count', unit: '/μL', normalRange: '150,000-400,000/μL' },
                          { key: 'neutrophils', label: 'Neutrophils', unit: '%', normalRange: '40-70%' },
                          { key: 'lymphocytes', label: 'Lymphocytes', unit: '%', normalRange: '20-40%' },
                          { key: 'monocytes', label: 'Monocytes', unit: '%', normalRange: '2-8%' },
                          { key: 'eosinophils', label: 'Eosinophils', unit: '%', normalRange: '1-4%' },
                          { key: 'basophils', label: 'Basophils', unit: '%', normalRange: '0.5-1%' }
                        ];
                        return (
                          <div className="space-y-4 mb-4 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-blue-900">Complete Blood Count Components</h4>
                              <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">WHO Standards</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {cbcFields.map((f) => (
                                <div key={f.key} className="bg-white p-3 rounded border border-blue-100">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {f.label}
                                    <span className="text-xs text-gray-500 ml-1">({f.unit})</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={testResults[test.id]?.[f.key] || ''}
                                    onChange={(e) => setTestResults({
                                      ...testResults,
                                      [test.id]: {...(testResults[test.id] || {}), [f.key]: e.target.value}
                                    })}
                                    placeholder={`Normal: ${f.normalRange}`}
                                    className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Normal: {f.normalRange}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {test.testName.toLowerCase().includes('urinalysis') && (
                      (() => {
                        const urineFields = [
                          { key: 'colour', label: 'Colour', type: 'select', options: ['Straw', 'Yellow', 'Amber', 'Brown', 'Red'] },
                          { key: 'appearance', label: 'Appearance', type: 'select', options: ['Clear', 'Slightly cloudy', 'Cloudy', 'Turbid'] },
                          { key: 'ph', label: 'pH', type: 'text' },
                          { key: 'sg', label: 'Specific Gravity (SG)', type: 'text' },
                          { key: 'protein', label: 'Protein', type: 'select', options: ['Negative', 'Trace', '+1', '+2', '+3', '+4'] },
                          { key: 'leukocyte', label: 'Leukocyte', type: 'select', options: ['Negative', 'Trace', '+', '++', '+++'] },
                          { key: 'glucose', label: 'Glucose', type: 'select', options: ['Negative', 'Trace', '+1', '+2', '+3', '+4'] },
                          { key: 'blood', label: 'Blood', type: 'select', options: ['Negative', 'Trace', '+', '++', '+++'] },
                          { key: 'ketone', label: 'Ketone', type: 'select', options: ['Negative', 'Trace', '+', '++', '+++'] },
                          { key: 'bilirubin', label: 'Bilirubin', type: 'select', options: ['Negative', '+', '++', '+++'] },
                          { key: 'urobilinogen', label: 'Urobilinogen', type: 'select', options: ['Normal', '1+', '2+', '3+'] },
                          { key: 'nitrate', label: 'Nitrate', type: 'select', options: ['Negative', 'Positive'] },
                          { key: 'wbc', label: 'WBC', type: 'text' },
                          { key: 'rbc', label: 'RBC', type: 'text' },
                          { key: 'epithelial', label: 'Epithelial Cells', type: 'text' },
                          { key: 'cast', label: 'Cast', type: 'text' },
                          { key: 'bacteria', label: 'Bacteria', type: 'text' },
                          { key: 'crystal', label: 'Crystal', type: 'text' }
                        ];
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {urineFields.map((f) => (
                              <div key={f.key}>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">{f.label}</label>
                                {f.type === 'select' ? (
                                  <select
                                    value={testResults[test.id]?.[f.key] || ''}
                                    onChange={(e) => setTestResults({
                                      ...testResults,
                                      [test.id]: {...(testResults[test.id] || {}), [f.key]: e.target.value}
                                    })}
                                    className="block w-full p-2 border border-border/40 rounded-md shadow-sm"
                                  >
                                    <option value="">Select</option>
                                    {f.options.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={testResults[test.id]?.[f.key] || ''}
                                    onChange={(e) => setTestResults({
                                      ...testResults,
                                      [test.id]: {...(testResults[test.id] || {}), [f.key]: e.target.value}
                                    })}
                                    className="block w-full p-2 border border-border/40 rounded-md shadow-sm"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
                );
              })}
            </div>
            
            <div>
              <label htmlFor="batch-notes" className="block text-sm font-medium text-muted-foreground mb-1">
                Notes (applies to all tests)
              </label>
              <textarea
                id="batch-notes"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder="Add any additional notes or observations"
                rows={3}
                className="block w-full p-2 border border-border/40 rounded-md shadow-sm"
              />
            </div>
            
            {/* Summary Section */}
            <div className="bg-muted/10 border border-border/30 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-muted-foreground">
                    Tests with results: <span className="font-medium text-muted-foreground">
                      {selectedGroup.tests.filter(test => test.status === 'Processing' && testResults[test.id]?.value?.trim()).length}
                    </span> / {selectedGroup.tests.filter(test => test.status === 'Processing').length}
                  </span>
                  <span className="text-muted-foreground">
                    Reference ranges set: <span className="font-medium text-muted-foreground">
                      {selectedGroup.tests.filter(test => test.status === 'Processing' && testResults[test.id]?.normalRange?.trim()).length}
                    </span> / {selectedGroup.tests.filter(test => test.status === 'Processing').length}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  You can save partial results. Tests without results will remain in Processing.
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border/30 flex justify-end space-x-3">
                    <button
                onClick={async () => {
                  // Get all processing tests and filter to only those with entered values
                  const processingTests = selectedGroup.tests.filter(test => test.status === 'Processing');
                  const testsWithValues = processingTests.filter(test => testResults[test.id]?.value?.trim());
                  const testsWithoutValues = processingTests.filter(test => !testResults[test.id]?.value?.trim());
                  
                  // Check if at least one test has a value
                  if (testsWithValues.length === 0) {
                    toast.error('Please enter result values for at least one test before saving');
                    return;
                  }
                  
                  // Inform user about tests that will be skipped
                  if (testsWithoutValues.length > 0) {
                    toast.info(`${testsWithoutValues.length} test(s) without results will remain in Processing status: ${testsWithoutValues.map(t => t.testName).join(', ')}`);
                  }
                  
                  // Check if reference ranges are set (warn if not, but don't block)
                  const missingRanges = testsWithValues.filter(test => !testResults[test.id]?.normalRange?.trim());
                  if (missingRanges.length > 0) {
                    toast.warning(`Reference ranges not set for: ${missingRanges.map(t => t.testName).join(', ')}. WHO standards will be used.`);
                  }
                  
                  // Save only tests with entered results
                  let successCount = 0;
                  setIsLoading(true);
                  
                  try {
                    for (const test of testsWithValues) {
                      const resultData = {
                        results: (() => {
                          let base = testResults[test.id].value;
                          const lowerName = test.testName.toLowerCase();
                          if (lowerName.includes('stool')) {
                            const extra = testResults[test.id];
                            base = `Result: ${base}; Consistency: ${extra?.consistency || '-'}; O/P: ${extra?.op || '-'}; Appearance: ${extra?.appearance || '-'}`;
                          } else if (lowerName.includes('cbc') || lowerName.includes('complete blood count') || lowerName.includes('full blood count') || lowerName.includes('fbc')) {
                            const c = testResults[test.id];
                            base = `CBC Results:\nWBC: ${c?.wbc || '-'} ×10³/μL (Normal: 4.0-10.0)\nRBC: ${c?.rbc || '-'} ×10⁶/μL (Normal: Male 4.5-5.9, Female 4.0-5.2)\nHemoglobin: ${c?.hemoglobin || '-'} g/dL (Normal: Male 13.0-17.0, Female 12.0-15.0)\nHematocrit: ${c?.hematocrit || '-'}% (Normal: Male 39-49, Female 36-46)\nMCV: ${c?.mcv || '-'} fL (Normal: 80-100)\nMCH: ${c?.mch || '-'} pg (Normal: 27-33)\nMCHC: ${c?.mchc || '-'} g/dL (Normal: 32-36)\nRDW: ${c?.rdw || '-'}% (Normal: 11.5-14.5)\nPlatelets: ${c?.platelets || '-'} ×10³/μL (Normal: 150-400)\nNeutrophils: ${c?.neutrophils || '-'}% (Normal: 40-70)\nLymphocytes: ${c?.lymphocytes || '-'}% (Normal: 20-40)\nMonocytes: ${c?.monocytes || '-'}% (Normal: 2-8)\nEosinophils: ${c?.eosinophils || '-'}% (Normal: 1-4)\nBasophils: ${c?.basophils || '-'}% (Normal: 0.5-1)`;
                          } else if (lowerName.includes('urinalysis')) {
                            const e = testResults[test.id];
                            base = `Result: ${base}; Colour: ${e?.colour || '-'}; Appearance: ${e?.appearance || '-'}; pH: ${e?.ph || '-'}; SG: ${e?.sg || '-'}; Protein: ${e?.protein || '-'}; Leukocyte: ${e?.leukocyte || '-'}; Glucose: ${e?.glucose || '-'}; Blood: ${e?.blood || '-'}; Ketone: ${e?.ketone || '-'}; Bilirubin: ${e?.bilirubin || '-'}; Urobilinogen: ${e?.urobilinogen || '-'}; Nitrate: ${e?.nitrate || '-'}; WBC: ${e?.wbc || '-'}; RBC: ${e?.rbc || '-'}; Epithelial Cells: ${e?.epithelial || '-'}; Cast: ${e?.cast || '-'}; Bacteria: ${e?.bacteria || '-'}; Crystal: ${e?.crystal || '-'}`;
                          }
                          return base;
                        })(),
                        normalRange: testResults[test.id]?.normalRange || getSuggestedReferenceRange(test.testName),
                        notes: batchNotes || undefined
                      };
                      
                      try {
                        const success = await updateTestResult(test.id, resultData);
                        if (success) successCount++;
                      } catch (error) {
                        console.error(`Error saving result for test ${test.id}:`, error);
                      }
                    }
                    
                    if (successCount > 0) {
                      toast.success(`Successfully saved results for ${successCount} of ${testsWithValues.length} test(s)${testsWithoutValues.length > 0 ? `. ${testsWithoutValues.length} test(s) remain in Processing` : ''}`);
                      setShowBatchResultsModal(false);
                      // Reset form
                      setTestResults({});
                      setBatchNotes('');
                    } else {
                      toast.error('Failed to save any test results');
                    }
                  } catch (error) {
                    console.error('Error in batch save:', error);
                    toast.error('An error occurred while saving test results');
                  } finally {
                    setIsLoading(false);
                  }
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded"
                    >
                Save Entered Results
                    </button>
              
              <button
                onClick={() => {
                  setShowBatchResultsModal(false);
                  setTestResults({});
                  setBatchNotes('');
                }}
                className="px-4 py-2 bg-muted/30 text-muted-foreground rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
      
    </div>
  );
};

export default LabDashboard; 