import React, { useState, useEffect } from 'react';
import { RefreshCw, Pill, CalendarClock, Check, X, FileText, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types/user';

interface PatientMedicationsProps {
  patientId: string;
  user: User | null;
}

interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  prescribedAt: string;
  status: string;
  administeredBy?: string;
  administeredAt?: string;
  notes?: string;
  priority: string;
  instructions?: string;
  sideEffects?: string[];
  contraindications?: string[];
}

const PatientMedications: React.FC<PatientMedicationsProps> = ({ patientId, user }) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedications = async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/medications/${patientId}`);
      
      if (response.data && Array.isArray(response.data)) {
        setMedications(response.data);
      } else {
        setMedications([]);
        setError('No medications found');
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
      setError('Failed to load medications');
      setMedications([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMedications();
  }, [patientId]);
  
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string, text: string, icon: JSX.Element }> = {
      active: {
        bg: 'bg-primary/20',
        text: 'text-primary',
        icon: <Check className="h-3.5 w-3.5 mr-1" />
      },
      completed: {
        bg: 'bg-primary/20',
        text: 'text-primary',
        icon: <Check className="h-3.5 w-3.5 mr-1" />
      },
      cancelled: {
        bg: 'bg-destructive/20',
        text: 'text-destructive',
        icon: <X className="h-3.5 w-3.5 mr-1" />
      },
      pending: {
        bg: 'bg-accent/20',
        text: 'text-accent-foreground',
        icon: <CalendarClock className="h-3.5 w-3.5 mr-1" />
      }
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { 
      bg: 'bg-muted/20', 
      text: 'text-muted-foreground',
      icon: null
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
        {statusInfo.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { bg: string, text: string, icon: JSX.Element }> = {
      normal: {
        bg: 'bg-primary/20',
        text: 'text-primary',
        icon: <Check className="h-3.5 w-3.5 mr-1" />
      },
      urgent: {
        bg: 'bg-accent/20',
        text: 'text-accent-foreground',
        icon: <AlertTriangle className="h-3.5 w-3.5 mr-1" />
      },
      stat: {
        bg: 'bg-destructive/20',
        text: 'text-destructive',
        icon: <AlertTriangle className="h-3.5 w-3.5 mr-1" />
      }
    };
    
    const priorityInfo = priorityMap[priority.toLowerCase()] || { 
      bg: 'bg-primary/20', 
      text: 'text-primary',
      icon: <Check className="h-3.5 w-3.5 mr-1" />
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityInfo.bg} ${priorityInfo.text}`}>
        {priorityInfo.icon}
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="p-4 bg-primary-foreground rounded-lg border border-border/30 shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/30">
        <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Medications
        </h3>
        <button
          onClick={fetchMedications}
          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Medications Content */}
      <div className="space-y-6 max-h-[calc(95vh-280px)] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
        {isLoading ? (
          <div className="py-12 text-center">
            <RefreshCw className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading medications...</p>
          </div>
        ) : medications.length > 0 ? (
          <>
            {/* Active Medications Table */}
            <div className="overflow-hidden rounded-lg border border-border/30">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/10">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Medication
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Dosage
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Frequency
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Start Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-primary-foreground divide-y divide-gray-200">
                  {medications.map((medication, index) => (
                    <tr key={medication._id || index} className="hover:bg-muted/10">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
                            <Pill className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">{medication.name || 'Unknown'}</div>
                            {medication.route && (
                              <div className="text-xs text-muted-foreground">{medication.route}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">{medication.dosage || 'Not specified'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">{medication.frequency || 'Not specified'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(medication.startDate)}
                        {medication.endDate && (
                          <div className="text-xs">
                            End: {formatDate(medication.endDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(medication.status || 'Active')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getPriorityBadge(medication.priority || 'Normal')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Medication Details */}
            <div className="space-y-6 mt-6">
              <h4 className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Medication Details
              </h4>
              
              {medications.map((medication, index) => (
                <div key={`detail-${medication._id || index}`} className="border border-border/30 rounded-lg overflow-hidden">
                  <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-border/30 ${
                    medication.priority === 'urgent' ? 'from-orange-50 to-yellow-50' : 
                    medication.priority === 'stat' ? 'from-red-50 to-orange-50' : 
                    'from-blue-50 to-indigo-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">{medication.name}</span>
                        {medication._id && (
                          <span className="text-xs text-muted-foreground">ID: {medication._id}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(medication.priority || 'Normal')}
                        {getStatusBadge(medication.status || 'Active')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-primary-foreground">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        {medication.instructions && (
                          <div className="mb-4">
                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Instructions</h5>
                            <div className="text-sm text-muted-foreground bg-muted/10 p-3 rounded border border-border/20">
                              {medication.instructions}
                            </div>
                          </div>
                        )}
                        
                        {medication.notes && (
                          <div className="mb-4">
                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Notes</h5>
                            <p className="text-sm text-muted-foreground">{medication.notes}</p>
                          </div>
                        )}

                        {medication.sideEffects && medication.sideEffects.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Side Effects</h5>
                            <ul className="text-sm text-muted-foreground list-disc list-inside pl-1">
                              {medication.sideEffects.map((effect, idx) => (
                                <li key={idx}>{effect}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {medication.contraindications && medication.contraindications.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Contraindications</h5>
                            <ul className="text-sm text-muted-foreground list-disc list-inside pl-1">
                              {medication.contraindications.map((contraindication, idx) => (
                                <li key={idx}>{contraindication}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {medication.prescribedBy && (
                            <div>
                              <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Prescribed By</h5>
                              <p className="text-sm text-muted-foreground">Dr. {medication.prescribedBy}</p>
                            </div>
                          )}
                          
                          {medication.prescribedAt && (
                            <div>
                              <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Prescribed On</h5>
                              <p className="text-sm text-muted-foreground">{formatDate(medication.prescribedAt)}</p>
                            </div>
                          )}
                        </div>
                        
                        {medication.administeredBy && (
                          <div>
                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Administered By</h5>
                            <p className="text-sm text-muted-foreground">{medication.administeredBy}</p>
                            {medication.administeredAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                on {formatDate(medication.administeredAt)}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Route</h5>
                            <p className="text-sm text-muted-foreground">{medication.route || 'Not specified'}</p>
                          </div>
                          <div>
                            <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Frequency</h5>
                            <p className="text-sm text-muted-foreground">{medication.frequency || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center border border-border/30 rounded-lg bg-muted/10">
            <Pill className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Medications Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              There are no medications recorded for this patient at this time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientMedications; 