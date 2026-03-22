import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import labService from '../../services/labService';
import patientService from '../../services/patientService';
import Modal from '../../components/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { toast } from 'react-hot-toast';
import { 
  Printer, 
  Eye, 
  RefreshCw,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';
import { generateProfessionalLabReportHTML } from '../../utils/labReportTemplate';

interface ServiceResult {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
  };
  testName: string;
  results: any;
  normalRange?: string;
  notes?: string;
  priority: 'Routine' | 'STAT' | 'ASAP';
  status: 'pending' | 'completed' | 'printed';
  resultCreatedDate: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  printedAt?: string;
  printedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

const ServiceResults: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serviceResults, setServiceResults] = useState<ServiceResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<ServiceResult | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Load service results
  const fetchServiceResults = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching service results...');
      const response = await labService.getLabServiceResults();
      console.log('Service results response:', response);
      if (response.success) {
        setServiceResults(response.data || []);
        console.log('Service results loaded:', response.data?.length || 0);
      } else {
        console.error('Failed to load service results:', response);
        toast.error('Failed to load service results');
      }
    } catch (error: any) {
      console.error('Error fetching service results:', error);
      toast.error(error.message || 'Failed to load service results');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceResults();
  }, []);

  // Handle viewing result details
  const handleViewDetails = (result: ServiceResult) => {
    setSelectedResult(result);
    setShowDetailsModal(true);
  };

  // Handle printing result
  const handlePrint = async (result: ServiceResult) => {
    try {
      setIsPrinting(true);
      
      // Get the full result data for printing
      const response = await labService.getServiceResultForPrint(result._id);
      
      if (response.success) {
        setSelectedResult(response.data);
        setShowPrintModal(true);
      } else {
        toast.error('Failed to load result for printing');
      }
    } catch (error: any) {
      console.error('Error preparing result for print:', error);
      toast.error(error.message || 'Failed to prepare result for printing');
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle actual printing
  const handleActualPrint = async () => {
    if (!selectedResult) return;

    try {
      // Mark as printed
      await labService.markServiceResultAsPrinted(selectedResult._id);
      
      // Create print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const printContent = await generatePrintContent(selectedResult);
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
        
        toast.success('Result printed successfully');
        setShowPrintModal(false);
        fetchServiceResults(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Error printing result:', error);
      toast.error(error.message || 'Failed to print result');
    }
  };

  // Generate print content using professional template
  const generatePrintContent = async (result: ServiceResult) => {
    try {
      // Fetch complete patient information
      const patientDetails = await patientService.getPatientById(result.patientId._id);
      
      // Calculate age from date of birth if available
      const calculateAge = (dateOfBirth: string | Date) => {
        if (!dateOfBirth) return 'Not recorded';
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age.toString();
      };

      // Format date of birth
      const formatDateOfBirth = (dateOfBirth: string | Date) => {
        if (!dateOfBirth) return 'Not recorded';
        return new Date(dateOfBirth).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };

      // Transform ServiceResult to match the expected format for the professional template
      const selectedPatient = {
        patientName: `${result.patientId?.firstName || 'N/A'} ${result.patientId?.lastName || 'N/A'}`,
        patientId: result.patientId?.patientId || 'N/A',
        age: calculateAge(patientDetails.dateOfBirth),
        gender: patientDetails.gender || 'Not recorded',
        dateOfBirth: formatDateOfBirth(patientDetails.dateOfBirth),
        tests: [{
          testName: result.testName,
          results: result.results,
          normalRange: result.normalRange,
          notes: result.notes,
          orderedBy: `${result.createdBy?.firstName || 'N/A'} ${result.createdBy?.lastName || 'N/A'}`,
          requestDate: result.resultCreatedDate
        }]
      };
      
      return generateProfessionalLabReportHTML(selectedPatient);
    } catch (error) {
      console.error('Error fetching patient details for printing:', error);
      // Fallback to basic information if patient fetch fails
      const selectedPatient = {
        patientName: `${result.patientId?.firstName || 'N/A'} ${result.patientId?.lastName || 'N/A'}`,
        patientId: result.patientId?.patientId || 'N/A',
        age: 'Not recorded',
        gender: 'Not recorded',
        dateOfBirth: 'Not recorded',
        tests: [{
          testName: result.testName,
          results: result.results,
          normalRange: result.normalRange,
          notes: result.notes,
          orderedBy: `${result.createdBy?.firstName || 'N/A'} ${result.createdBy?.lastName || 'N/A'}`,
          requestDate: result.resultCreatedDate
        }]
      };
      return generateProfessionalLabReportHTML(selectedPatient);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </span>;
      case 'printed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
          <Printer className="w-3 h-3 mr-1" />
          Printed
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'STAT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive">STAT</span>;
      case 'ASAP':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground">ASAP</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/20 text-muted-foreground">Routine</span>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-muted-foreground">Lab Service Results</h1>
              <p className="mt-2 text-muted-foreground">
                Manage and print lab results for reception-ordered tests
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchServiceResults}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Service Results Table */}
        <div className="bg-primary-foreground shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading service results...</span>
              </div>
            ) : serviceResults.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-2 text-sm font-medium text-muted-foreground">No service results</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No lab service results have been created yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Test Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Created Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Created By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-primary-foreground divide-y divide-gray-200">
                    {serviceResults.map((result) => (
                      <tr key={result._id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">
                              {result.patientId?.firstName || 'N/A'} {result.patientId?.lastName || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {result.patientId?.patientId || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {result.testName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPriorityBadge(result.priority)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(result.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(result.resultCreatedDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {result.createdBy?.firstName || 'N/A'} {result.createdBy?.lastName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDetails(result)}
                              className="text-primary hover:text-primary"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handlePrint(result)}
                              disabled={isPrinting}
                              className="text-primary hover:text-primary disabled:opacity-50"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedResult && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Service Result Details"
          size="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Patient</label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedResult.patientId?.firstName || 'N/A'} {selectedResult.patientId?.lastName || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">ID: {selectedResult.patientId?.patientId || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Test Name</label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedResult.testName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Priority</label>
                <div className="mt-1">{getPriorityBadge(selectedResult.priority)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">{getStatusBadge(selectedResult.status)}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">Results</label>
              <div className="mt-1 p-3 bg-muted/10 rounded-md">
                <p className="text-sm text-muted-foreground">
                  {typeof selectedResult.results === 'object' 
                    ? JSON.stringify(selectedResult.results, null, 2)
                    : selectedResult.results
                  }
                </p>
                {selectedResult.normalRange && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Normal Range: {selectedResult.normalRange}
                  </p>
                )}
              </div>
            </div>

            {selectedResult.notes && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Notes</label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedResult.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Created Date</label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(selectedResult.resultCreatedDate).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Created By</label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedResult.createdBy?.firstName || 'N/A'} {selectedResult.createdBy?.lastName || 'N/A'}
                </p>
              </div>
            </div>

            {selectedResult.printedAt && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Printed Date</label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(selectedResult.printedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Printed By</label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedResult.printedBy?.firstName} {selectedResult.printedBy?.lastName}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Print Modal */}
      {showPrintModal && selectedResult && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Print Service Result"
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Printer className="h-5 w-5 text-primary/50" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-primary">
                    Ready to Print
                  </h3>
                  <div className="mt-2 text-sm text-primary">
                    <p>
                      This will print the lab service result for{' '}
                      <strong>{selectedResult.patientId?.firstName || 'N/A'} {selectedResult.patientId?.lastName || 'N/A'}</strong>
                    </p>
                    <p className="mt-1">Test: <strong>{selectedResult.testName}</strong></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-border/40 rounded-md text-sm font-medium text-muted-foreground bg-primary-foreground hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleActualPrint}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Printer className="h-4 w-4 mr-2 inline" />
                Print Result
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Wrap ServiceResults with ErrorBoundary for better error handling
const ServiceResultsWithErrorBoundary: React.FC = () => {
  const handleError = (error: Error, errorInfo: any) => {
    console.error('🚨 [ServiceResults] Error caught by boundary:', error);
    console.error('🚨 [ServiceResults] Error info:', errorInfo);
    toast.error('An error occurred while loading service results. Please try refreshing the page.');
  };

  return (
    <ErrorBoundary onError={handleError}>
      <ServiceResults />
    </ErrorBoundary>
  );
};

export default ServiceResultsWithErrorBoundary;
