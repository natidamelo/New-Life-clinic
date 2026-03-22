import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Beaker, PlusCircle, Bell, AlertTriangle, Check, ChevronRight, Download, FileText, Clock } from 'lucide-react';
import LaboratoryRequestForm from './LaboratoryRequestForm';
import { toast } from 'react-toastify';
import labService from '../../services/labService'; // Import the updated service
import { useAuth } from '../../context/AuthContext';

interface LabTestResult {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  testDate?: string;
  requestDate?: string;
  collectionDate?: string;
  completedDate?: string;
  status: string;
  urgency?: string;
  category?: string;
  orderedBy?: string;
  results?: any; // Changed to any to handle different result formats
  type?: string;
  timestamp?: string;
  notes?: string;
}

interface LabTestsProps {
  notifications?: any[];
  patientFilter?: string; // Add a patient filter
  showAllControls?: boolean; // Control whether to show all UI controls
  currentVisitId?: string; // Prop to pass the current visit ID
}

const LaboratoryTests: React.FC<LabTestsProps> = ({ 
  notifications = [], 
  patientFilter,
  showAllControls = true,
  currentVisitId // Assume this prop is passed down
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('completed');
  const [labTests, setLabTests] = useState<LabTestResult[]>([]);
  const [filteredTests, setFilteredTests] = useState<LabTestResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // State for submission loading
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [selectedTest, setSelectedTest] = useState<LabTestResult | null>(null);
  const { user } = useAuth();
  
  console.log('LaboratoryTests rendered with notifications:', notifications);
  
  // Fetch lab tests data on component mount
  useEffect(() => {
    fetchLabTests();
  }, [notifications, patientFilter]);
  
  // Filter tests when tab changes or search query updates
  useEffect(() => {
    filterTests();
  }, [activeTab, searchQuery, labTests, patientFilter]);
  
  const fetchLabTests = async () => {
    setLoading(true);
    try {
      console.log('Fetching lab tests with patientFilter:', patientFilter);
      
      // First, extract lab tests from notifications
      const notificationTests = notifications
        .filter(notif => ['lab_results', 'critical_lab_result', 'lab_notification'].includes(notif.type))
        .map(notif => ({
          id: notif.id,
          patientId: notif.patientId,
          patientName: notif.patientName,
          testName: notif.testName,
          testDate: new Date(notif.timestamp).toISOString().split('T')[0],
          status: 'Completed',
          results: notif.results,
          type: notif.type,
          timestamp: notif.timestamp,
          notes: notif.notes
        }));
      
      console.log('Notification tests:', notificationTests);
      
      // Then, check localStorage for labDashboardTests
      let localStorageTests: LabTestResult[] = [];
      try {
        const labDashboardTestsStr = localStorage.getItem('labDashboardTests');
        if (labDashboardTestsStr) {
          const labDashboardTests = JSON.parse(labDashboardTestsStr);
          console.log('Raw lab dashboard tests from localStorage:', labDashboardTests);
          
          localStorageTests = labDashboardTests.map((test: any) => ({
            id: test.id,
            patientId: test.patientId || '',
            patientName: test.patientName || `Unknown Patient (ID: ${test.patientId || 'N/A'})`,
            testName: test.testName || 'Unknown Test',
            status: test.status === 'completed' ? 'Completed' : 'Pending',
            requestDate: test.requestDate,
            collectionDate: test.collectionDate,
            completedDate: test.completedDate,
            results: test.results,
            category: test.category,
            urgency: test.urgency,
            orderedBy: test.orderedBy,
            notes: test.notes
          }));
        }
      } catch (error) {
        console.error('Error parsing labDashboardTests from localStorage:', error);
      }
      
      console.log('LocalStorage tests:', localStorageTests);
      
      // Combine both sources of tests
      let combinedTests = [...notificationTests, ...localStorageTests];
      
      // Remove duplicates (same test ID)
      const testIds = new Set();
      combinedTests = combinedTests.filter(test => {
        if (testIds.has(test.id)) {
          return false;
        }
        testIds.add(test.id);
        return true;
      });
      
      // Filter by patientFilter if provided
      let filteredByPatient = combinedTests;
      if (patientFilter) {
        console.log('Filtering by patient:', patientFilter);
        filteredByPatient = combinedTests.filter(test => {
          const matchesId = test.patientId && test.patientId.toLowerCase() === patientFilter.toLowerCase();
          const matchesName = test.patientName && test.patientName.toLowerCase().includes(patientFilter.toLowerCase());
          return matchesId || matchesName;
        });
      }
        
      console.log('Final filtered lab tests:', filteredByPatient);
      setLabTests(filteredByPatient);
      
    } catch (error) {
      console.error('Error fetching lab tests:', error);
      toast.error('Failed to fetch laboratory tests');
    } finally {
      setLoading(false);
    }
  };
  
  const filterTests = () => {
    let filtered = labTests;
    
    console.log('Filtering tests based on activeTab:', activeTab);
    console.log('Original lab tests:', labTests);
    
    // Filter by status
    filtered = filtered.filter(test => {
      const testStatus = test.status.toLowerCase();
      const isCompleted = testStatus.includes('complete') || testStatus === 'completed';
      const isPending = testStatus.includes('pending') || testStatus === 'pending';
      
      // For 'completed' tab, show tests with 'completed' status
      // For 'pending' tab, show tests with 'pending' or other non-completed status
      return activeTab === 'completed' ? isCompleted : isPending;
    });
    
    console.log('After status filtering:', filtered);
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(test => 
        (test.patientName && test.patientName.toLowerCase().includes(query)) || 
        (test.patientId && test.patientId.toLowerCase().includes(query)) ||
        (test.testName && test.testName.toLowerCase().includes(query))
      );
    }
    
    console.log('Final filtered tests:', filtered);
    setFilteredTests(filtered);
  };
  
  const handleCreateRequest = (patient: { id: string; name: string }) => {
    setSelectedPatient(patient);
    setShowRequestForm(true);
  };
  
  const handleViewTestDetails = (test: LabTestResult) => {
    setSelectedTest(test);
    
    // Mark as read in localStorage if it's a notification
    if (test.type && ['lab_results', 'critical_lab_result'].includes(test.type)) {
      const storedNotifications = JSON.parse(localStorage.getItem('doctorNotifications') || '[]');
      const updatedNotifications = storedNotifications.map((n: any) => {
        if (n.id === test.id) {
          return { ...n, read: true };
        }
        return n;
      });
      localStorage.setItem('doctorNotifications', JSON.stringify(updatedNotifications));
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Function to render test results based on different formats
  const renderTestResults = (test: LabTestResult) => {
    if (!test.results) return <p className="text-muted-foreground">No results available.</p>;
    
    // Check if results is an array
    if (Array.isArray(test.results)) {
      return (
        <div className="space-y-2">
          {test.results.map((result, index) => (
            <div key={index} className="flex justify-between border-b pb-2">
              <div className="font-medium">{result.name}</div>
              <div className={`${result.flagged ? 'text-destructive font-bold' : ''}`}>
                {result.value} {result.unit}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // If results is an object with key-value pairs
    return (
      <div className="space-y-2">
        {Object.entries(test.results).map(([key, value], index) => (
          <div key={index} className="flex justify-between border-b pb-2">
            <div className="font-medium">{key}</div>
            <div>{String(value)}</div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="bg-primary-foreground rounded-lg shadow overflow-hidden">
      {/* Add a prominent refresh button */}
      <div className="p-3 bg-primary/10 border-b border-primary/30">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Beaker className="h-5 w-5 text-primary mr-2" />
            <span className="text-primary font-medium">Found 11 lab results for this patient</span>
          </div>
          <button
            onClick={fetchLabTests}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Results
          </button>
        </div>
      </div>
      
      {/* Tab headers */}
      {showAllControls && (
        <div className="p-4 border-b">
          <div className="flex justify-between mb-4">
            <div className="flex space-x-1">
              <button
                className={`px-4 py-2 text-sm rounded-md ${
                  activeTab === 'pending'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted/20'
                }`}
                onClick={() => setActiveTab('pending')}
              >
                Pending Tests
              </button>
              <button
                className={`px-4 py-2 text-sm rounded-md ${
                  activeTab === 'completed'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-muted-foreground hover:bg-muted/20'
                }`}
                onClick={() => setActiveTab('completed')}
              >
                Completed Tests
              </button>
            </div>
            
            <button
              onClick={() => {
                setSelectedPatient(null);
                setShowRequestForm(true);
              }}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Lab Request
            </button>
          </div>
          
          <div className="flex items-center bg-muted/10 px-3 py-2 rounded-lg">
            <Search className="h-5 w-5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search by patient name, ID, or test..."
              className="ml-2 block w-full bg-transparent border-none focus:outline-none focus:ring-0 text-muted-foreground placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={fetchLabTests}
              className="ml-2 p-1 rounded-md hover:bg-muted/30"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}
      
      {/* Results section */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-muted/10">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Patient
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Test
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Results
              </th>
            </tr>
          </thead>
          <tbody className="bg-primary-foreground divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                  </div>
                </td>
              </tr>
            ) : filteredTests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                  {activeTab === 'pending' 
                    ? 'No pending laboratory tests found.' 
                    : 'No completed laboratory tests found.'}
                </td>
              </tr>
            ) : (
              filteredTests.map((test) => (
                <tr 
                  key={test.id}
                  className="hover:bg-muted/10 cursor-pointer"
                  onClick={() => handleViewTestDetails(test)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-muted-foreground">{test.patientName}</div>
                        <div className="text-xs text-muted-foreground">{test.patientId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">{test.testName}</div>
                    {test.category && <div className="text-xs text-muted-foreground">{test.category}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(test.testDate || test.requestDate || test.timestamp).split(',')[0]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      test.status === 'Completed' || test.status === 'completed'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-accent/20 text-accent-foreground'
                    }`}>
                      {test.status}
                    </span>
                    {test.urgency === 'urgent' && (
                      <span className="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-destructive/20 text-destructive">
                        Urgent
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {test.status === 'Completed' || test.status === 'completed' ? (
                      <button
                        className="inline-flex items-center text-primary hover:text-primary"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Results
                      </button>
                    ) : (
                      <span className="inline-flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* If a test is selected, show full-page details */}
      {selectedTest ? (
        <div className="w-full min-h-screen bg-primary-foreground flex flex-col">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <button 
                onClick={() => setSelectedTest(null)}
                className="text-primary hover:text-primary font-medium flex items-center"
                >
                <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                Back
                </button>
              <h3 className="text-lg font-medium text-muted-foreground ml-4">{selectedTest.testName}</h3>
            </div>
          </div>
          <div className="px-6 py-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Patient</p>
                <p className="font-medium">{selectedTest.patientName} ({selectedTest.patientId})</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`font-medium ${selectedTest.status === 'Completed' ? 'text-primary' : 'text-accent-foreground'}`}>{selectedTest.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requested On</p>
                <p className="font-medium">{formatDate(selectedTest.requestDate || selectedTest.timestamp)}</p>
              </div>
              {selectedTest.completedDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed On</p>
                  <p className="font-medium">{formatDate(selectedTest.completedDate)}</p>
                </div>
              )}
              {selectedTest.orderedBy && (
                <div>
                  <p className="text-sm text-muted-foreground">Ordered By</p>
                  <p className="font-medium">{selectedTest.orderedBy}</p>
                </div>
              )}
              {selectedTest.category && (
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedTest.category}</p>
                </div>
              )}
              {selectedTest.urgency && (
                <div>
                  <p className="text-sm text-muted-foreground">Urgency</p>
                  <p className={`font-medium ${selectedTest.urgency === 'urgent' ? 'text-destructive' : 'text-primary'}`}>{selectedTest.urgency.charAt(0).toUpperCase() + selectedTest.urgency.slice(1)}</p>
                </div>
              )}
            </div>
            <div className="mb-6">
              <h4 className="text-md font-medium mb-2">Test Results</h4>
              {selectedTest.status === 'Completed' ? renderTestResults(selectedTest) : (
                <p className="text-accent-foreground">Results pending</p>
              )}
            </div>
            {selectedTest.notes && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-2">Notes</h4>
                <p className={`${selectedTest.type === 'critical_lab_result' ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{selectedTest.notes}</p>
              </div>
            )}
          </div>
        </div>
      ) : showRequestForm ? (
        // Full-page LaboratoryRequestForm
        <div className="w-full min-h-screen bg-primary-foreground flex flex-col">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => !isSubmitting && setShowRequestForm(false)}
                className="text-primary hover:text-primary font-medium flex items-center"
                disabled={isSubmitting}
              >
                <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h3 className="text-lg font-medium text-muted-foreground ml-4">New Laboratory Request</h3>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
              <LaboratoryRequestForm 
              patientId={selectedPatient?.id || patientFilter}
              patientName={selectedPatient?.name || 'Unknown Patient'}
                onClose={() => !isSubmitting && setShowRequestForm(false)}
                onSubmit={async (data) => {
                   if (!currentVisitId) {
                     toast.error('Cannot submit lab order: Visit ID is missing.');
                     console.error('Visit ID is missing');
                     return;
                   }
                   if (!data.patientId) {
                      toast.error('Cannot submit lab order: Patient ID is missing.');
                      console.error('Patient ID is missing in form data');
                      return;
                   }
                   let submittedSuccessfully = false;
                   setIsSubmitting(true);
                   try {
                     // Real API call: create lab orders → backend will create notification
                     const { default: toast } = await import('react-hot-toast');
                     const labService = await import('../../services/labService');

                     // Normalize tests for bulk endpoint
                     const testsArray = Array.isArray((data as any).tests)
                       ? (data as any).tests
                       : Array.isArray((data as any).selectedTests)
                         ? (data as any).selectedTests.map((t: any) => ({ testName: t.name || t.testName }))
                         : [];

                     if (testsArray.length === 0) {
                       toast.error('Please select at least one lab test.');
                       setIsSubmitting(false);
                       return;
                     }

                     const payload = {
                       patientId: String((data as any).patientId),
                       visitId: String(currentVisitId),
                       priority: ((data as any).priority || (data as any).urgency || 'Routine') as 'Routine' | 'STAT' | 'ASAP',
                       tests: testsArray.map((t: any) => ({ testName: t.testName || t.name }))
                     };

                     const resp = await (labService as any).submitBulkLabOrder(payload);
                     console.log('✅ Lab order(s) created:', resp);
                     toast.success(`Lab request sent successfully.`);
                     submittedSuccessfully = true;
                   } catch (error) {
                     console.error('Submission error:', error);
                     const msg = (error as any)?.message || 'Failed to send lab request.';
                     toast.error(msg);
                     submittedSuccessfully = false;
                   } finally {
                     setIsSubmitting(false);
                     if (submittedSuccessfully) {
                       setShowRequestForm(false);
                     }
                   }
                }}
              />
            </div>
          </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Select a test to view details or create a new laboratory request.</p>
        </div>
      )}
    </div>
  );
};

export default LaboratoryTests; 