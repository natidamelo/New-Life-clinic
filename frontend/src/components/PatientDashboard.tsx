import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

interface LabResult {
  _id: string;
  testName: string;
  category: string;
  patientId?: string;
  patientName?: string;
  orderedBy?: string;
  orderDate?: string;
  resultDate?: string;
  results: Record<string, any>;
  notes?: string;
  status?: string;
}

interface Prescription {
  _id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
  status: string;
  datePrescribed: string;
}

const PatientDashboard: React.FC = () => {
  const { patientId = 'P001' } = useParams<{ patientId?: string }>();
  const [activeTab, setActiveTab] = useState<'lab-results' | 'prescriptions'>('lab-results');
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [labResultsLoading, setLabResultsLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  useEffect(() => {
    fetchLabResults();
    fetchPrescriptions();
  }, [patientId]);
  
  const fetchLabResults = async () => {
    setLabResultsLoading(true);
    try {
      // Always use the real patient endpoint, never test mode
      const response = await axios.get(`/api/lab-results/patient/${patientId}`);
      setLabResults(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching lab results:', error);
      setLabResults([]);
    } finally {
      setLabResultsLoading(false);
    }
  };
  
  const fetchPrescriptions = async () => {
    setPrescriptionsLoading(true);
    try {
      // Always use the real prescriptions endpoint, never test mode
      const response = await axios.get(`/api/prescriptions?patientId=${patientId}`);
      setPrescriptions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setPrescriptions([]);
    } finally {
      setPrescriptionsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="bg-primary-foreground shadow-md rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-primary/10">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-muted-foreground">Patient Dashboard</h1>
            <div className="flex items-center">
              <span className="mr-3 text-sm text-muted-foreground">Patient ID: {patientId}</span>
            </div>
          </div>
        </div>
        
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'lab-results' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('lab-results')}
            >
              Lab Results
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'prescriptions' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('prescriptions')}
            >
              Prescriptions
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {activeTab === 'lab-results' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Lab Results</h2>
                <button 
                  className="bg-primary/20 text-primary px-3 py-1 rounded hover:bg-primary/30"
                  onClick={fetchLabResults}
                >
                  Refresh
                </button>
              </div>
              
              {labResultsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 mx-auto text-primary border-4 border-primary/30 rounded-full border-t-blue-600"></div>
                  <p className="mt-2 text-muted-foreground">Loading lab results...</p>
                </div>
              ) : labResults.length === 0 ? (
                <div className="text-center py-8 bg-muted/10 rounded-lg border border-border/30">
                  <div className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-muted-foreground">No Lab Results</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    There are no lab results available for this patient.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {labResults.map((result) => (
                    <div 
                      key={result._id} 
                      className="border border-border/30 rounded-lg overflow-hidden bg-primary-foreground shadow-sm"
                    >
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b border-border/30">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-muted-foreground">{result.testName || 'Unknown Test'}</h4>
                            <div className="text-xs text-muted-foreground mt-1">
                              {result.resultDate ? new Date(result.resultDate).toLocaleDateString() : 'Date not available'}
                              {result.category && (
                                <span className="ml-2 bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                                  {result.category}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {result.status && (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium 
                              ${result.status === 'Completed' ? 'bg-primary/20 text-primary' : 
                              result.status === 'In Progress' ? 'bg-primary/20 text-primary' :
                              'bg-muted/20 text-muted-foreground'}`}
                            >
                              {result.status}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="bg-muted/10 p-3 rounded-md">
                          {result.results && typeof result.results === 'object' && !Array.isArray(result.results) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(result.results).map(([key, value], index) => {
                                let displayValue = '';
                                let normalRange = '';

                                // Handle different result value formats
                                if (typeof value === 'object' && value !== null) {
                                  // Structured format
                                  const typedValue = value as {value?: string; unit?: string; normalRange?: string};
                                  displayValue = typedValue.value || '';
                                  if (typedValue.unit) {
                                    displayValue += ` ${typedValue.unit}`;
                                  }
                                  normalRange = typedValue.normalRange || '';
                                } else if (typeof value === 'string' || typeof value === 'number') {
                                  // Simple string or number format
                                  displayValue = String(value);
                                } else {
                                  // Fallback
                                  displayValue = JSON.stringify(value);
                                }

                                return (
                                  <div key={`${result._id}-${index}-${key}`} className="flex justify-between border-b border-border/20 pb-1">
                                    <span className="font-medium text-sm">{key}:</span>
                                    <div className="flex items-center">
                                      <span className="text-sm">{displayValue}</span>
                                      {normalRange && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                          (Normal: {normalRange})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {typeof result.results === 'string' 
                                ? result.results 
                                : 'Result data is in an unsupported format'}
                            </div>
                          )}
                        </div>
                        
                        {result.notes && (
                          <div className="mt-3 pt-3 border-t border-border/20">
                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Notes</h5>
                            <p className="text-sm text-muted-foreground">{result.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'prescriptions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Prescriptions</h2>
                <button 
                  className="bg-primary/20 text-primary px-3 py-1 rounded hover:bg-primary/30"
                  onClick={fetchPrescriptions}
                >
                  Refresh
                </button>
              </div>
              
              {prescriptionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 mx-auto text-primary border-4 border-primary/30 rounded-full border-t-blue-600"></div>
                  <p className="mt-2 text-muted-foreground">Loading prescriptions...</p>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="text-center py-8 bg-muted/10 rounded-lg border border-border/30">
                  <div className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-muted-foreground">No Prescriptions</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    There are no prescriptions available for this patient.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((prescription) => (
                    <div 
                      key={prescription._id} 
                      className="border border-border/30 rounded-lg overflow-hidden bg-primary-foreground shadow-sm"
                    >
                      <div className="bg-gradient-to-r from-green-50 to-teal-50 p-3 border-b border-border/30">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-muted-foreground">{prescription.medicationName}</h4>
                            <div className="text-xs text-muted-foreground mt-1">
                              Prescribed: {prescription.datePrescribed ? new Date(prescription.datePrescribed).toLocaleDateString() : 'Unknown date'}
                              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium 
                                ${prescription.status === 'Active' ? 'bg-primary/20 text-primary' : 
                                prescription.status === 'Completed' ? 'bg-muted/20 text-muted-foreground' : 
                                'bg-destructive/20 text-destructive'}`}
                              >
                                {prescription.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Dosage</p>
                            <p className="text-md font-medium">{prescription.dosage}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Frequency</p>
                            <p className="text-md font-medium">{prescription.frequency}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Route</p>
                            <p className="text-md font-medium">{prescription.route}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Duration</p>
                            <p className="text-md font-medium">{prescription.duration}</p>
                          </div>
                        </div>
                        
                        {prescription.instructions && (
                          <div className="mt-4 pt-4 border-t border-border/20">
                            <p className="text-sm text-muted-foreground mb-1">Instructions</p>
                            <p className="text-md">{prescription.instructions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard; 