import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import imagingService from '../../services/imagingService';
import { toast } from 'react-hot-toast';

interface ImagingTest {
  id: string;
  type: string;
  orderedBy: string;
  date: string;
  status: string;
  results?: string;
  notes?: string;
  patientName?: string;
  patientId?: string;
}

const ImagingDashboard: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingTests, setPendingTests] = useState<ImagingTest[]>([]);
  const [completedTests, setCompletedTests] = useState<ImagingTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverUnavailable, setServerUnavailable] = useState(false);

  useEffect(() => {
    fetchImagingTests();
  }, []);

  const fetchImagingTests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Optional flag to quickly test UI when backend is unreachable. Keep disabled in production.
      const forceOfflineMode = false;
      if (forceOfflineMode) {
        setServerUnavailable(true);
        setPendingTests([]);
        setCompletedTests([]);
        return;
      }
      
      console.log('Fetching imaging orders from API...');
      const orders = await imagingService.getImagingOrders();

      let allTests: ImagingTest[] = orders.map(o => ({
        id: o._id,
        type: o.imagingType,
        orderedBy: 'Doctor', // Simplified for now
        date: o.orderDateTime?.substring(0,10) || '',
        status: (o.status || 'Ordered').toLowerCase(),
        patientName: o.patient?.firstName && o.patient?.lastName ? `${o.patient.firstName} ${o.patient.lastName}` : 'Patient',
        patientId: o.patient?._id || o._id,
        notes: (o as any).notes || ''
      }));

      if (allTests.length === 0) {
        console.log('No imaging orders returned from API');
      }

      setPendingTests(allTests.filter(test => test.status !== 'completed'));
      setCompletedTests(allTests.filter(test => test.status === 'completed'));
    } catch (error) {
      console.error('Error fetching imaging tests:', error);
      setError('Failed to fetch imaging tests');
      setServerUnavailable(true);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTestStatus = async (testId: string, status: string) => {
    try {
      // Skip local-only updates. All status changes will be persisted to the server.
      await imagingService.updateImagingOrder(testId, { status: status === 'completed' ? 'Completed' : 'Cancelled' });
      toast.success('Test status updated successfully');
      await fetchImagingTests();
    } catch (error) {
      alert('Failed to update test status');
      console.error('Error updating test status:', error);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (error && !serverUnavailable) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Imaging Dashboard</h1>
      
      {serverUnavailable && (
        <div className="bg-accent/20 text-accent-foreground p-4 mb-6 rounded-md">
          <p className="font-semibold">⚠️ Cannot reach imaging service</p>
          <p className="text-sm">The dashboard is currently offline. Data will appear here once the server connection is restored.</p>
        </div>
      )}
      
      <div className="mb-6">
        <div className="border-b border-border/30">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`${
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Pending Tests
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`${
                activeTab === 'completed'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Completed Tests
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-primary-foreground shadow rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {activeTab === 'pending' ? 'Pending Imaging Tests' : 'Completed Imaging Tests'}
          </h2>
          <div className="space-y-4">
            {(activeTab === 'pending' ? pendingTests : completedTests).length === 0 ? (
              <p className="text-center text-muted-foreground">
                No {activeTab === 'pending' ? 'pending' : 'completed'} tests
              </p>
            ) : (
              (activeTab === 'pending' ? pendingTests : completedTests).map((test) => (
                <div key={test.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{test.type}</h3>
                      <p className="text-sm text-muted-foreground">Patient: {test.patientName}</p>
                      <p className="text-sm text-muted-foreground">Ordered by: {test.orderedBy}</p>
                      <p className="text-sm text-muted-foreground">Date: {test.date}</p>
                      <p className="text-sm text-muted-foreground">Status: {test.status}</p>
                      {test.results && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Results:</p>
                          <p className="text-sm">{test.results}</p>
                        </div>
                      )}
                      {test.notes && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Notes:</p>
                          <p className="text-sm">{test.notes}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      {activeTab === 'pending' ? (
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => updateTestStatus(test.id, 'completed')}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-primary transition-colors"
                          >
                            Upload Results
                          </button>
                          <button
                            onClick={() => updateTestStatus(test.id, 'cancelled')}
                            className="bg-destructive text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-destructive transition-colors"
                          >
                            Cancel Test
                          </button>
                        </div>
                      ) : (
                        <button
                          className="border border-border/40 text-muted-foreground px-4 py-2 rounded-md text-sm hover:bg-muted/10 transition-colors"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ImagingDashboard; 