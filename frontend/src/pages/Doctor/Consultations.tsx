import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/EnhancedThemeContext';
import { toast } from 'react-hot-toast';
import api from '../../services/apiService';
import { Search, User, Calendar, Clock, FileText, Plus, Eye, MessageSquare, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface ConsultationPatient {
  id?: string;
  _id?: string;
  firstName: string;
  lastName: string;
  patientId?: string;
  status: string;
  assignedDoctorId?: string;
  assignedNurseId?: string;
  lastUpdated?: string;
  updatedAt?: string;
  createdAt?: string;
  vitals?: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    timestamp?: string;
  };
  serviceRequests?: Array<{
    id?: string;
    _id?: string;
    serviceName?: string;
    service?: {
      name?: string;
      category?: string;
    };
    status: string;
    requestDate?: string;
    notes?: string;
    assignedNurse?: string;
    assignedDoctor?: string;
  }>;
}

const Consultations: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [patients, setPatients] = useState<ConsultationPatient[]>([]);
  const [completedConsultations, setCompletedConsultations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<ConsultationPatient | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConsultationPatients();
    fetchCompletedConsultations();
  }, [user]);

  const fetchConsultationPatients = async () => {
    try {
      setIsLoading(true);
      const currentDoctorId = user?.id || user?._id;
      if (!currentDoctorId) {
        console.error('No doctor ID available');
        return;
      }

      console.log('🔍 [CONSULTATIONS] Fetching for doctor:', currentDoctorId);

      // Use the new endpoint that includes service requests
      const response = await api.get('/api/patients/with-service-requests');
      const allPatients = response.data?.data || [];

      console.log('🔍 [CONSULTATIONS] All patients fetched:', allPatients.length);

      // Filter for consultation patients assigned to this doctor
      const consultationPatients = allPatients.filter((patient: any) => {
        // Check if patient is assigned to this doctor (either directly or through service request)
        const isAssignedToDoctor = patient.assignedDoctorId === currentDoctorId;
        
        // Check if any service request is assigned to this doctor
        const hasServiceRequestAssignedToDoctor = patient.serviceRequests?.some((sr: any) => 
          sr.assignedNurse === currentDoctorId || sr.assignedDoctor === currentDoctorId
        );
        
        // Check if patient has consultation services
        const hasConsultationService = patient.serviceRequests?.some((sr: any) => 
          sr.service?.category === 'consultation' || 
          sr.service?.category === 'follow-up' || 
          sr.notes?.toLowerCase().includes('consultation')
        );
        
        // More flexible status checking
        const isScheduled = patient.status === 'scheduled' || 
          patient.status === 'Admitted' || 
          patient.status === 'waiting' || 
          patient.status === 'in-progress';
        
        // Patient qualifies if they have consultation services AND are assigned to this doctor
        const qualifies = (isAssignedToDoctor || hasServiceRequestAssignedToDoctor) && hasConsultationService;
        
        if (qualifies) {
          console.log(`🔍 [CONSULTATIONS] Found consultation patient: ${patient.firstName} ${patient.lastName}`, {
            isAssignedToDoctor,
            hasServiceRequestAssignedToDoctor,
            hasConsultationService,
            status: patient.status,
            serviceRequests: patient.serviceRequests?.length || 0
          });
        }
        
        return qualifies;
      });

      console.log('🔍 [CONSULTATIONS] Consultation patients found:', consultationPatients.length);
      setPatients(consultationPatients);
    } catch (error) {
      console.error('Error fetching consultation patients:', error);
      toast.error('Failed to load consultation patients');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompletedConsultations = async () => {
    try {
      const currentDoctorId = user?.id || user?._id;
      if (!currentDoctorId) {
        console.error('No doctor ID available');
        return;
      }

      console.log('🔍 [CONSULTATIONS] Fetching completed consultations for doctor:', currentDoctorId);

      // Fetch consultation records (only records created through consultation form)
      const response = await api.get('/api/medical-records/consultations');
      const completedRecords = response.data?.data || [];

      console.log('🔍 [CONSULTATIONS] Completed consultations fetched:', completedRecords.length);
      console.log('🔍 [CONSULTATIONS] Response data:', response.data);
      console.log('🔍 [CONSULTATIONS] Records:', completedRecords);

      setCompletedConsultations(completedRecords);
    } catch (error) {
      console.error('Error fetching completed consultations:', error);
      // Don't show error toast for this as it's not critical
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-muted/20 text-muted-foreground';
    
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-primary/20 text-primary';
      case 'admitted':
        return 'bg-primary/20 text-primary';
      case 'in-progress':
        return 'bg-accent/20 text-accent-foreground';
      case 'completed':
        return 'bg-muted/20 text-muted-foreground';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim().toLowerCase();
    const patientId = (patient.patientId || patient.id || patient._id || '').toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();
    
    // Search by name, patient ID, or status
    const nameMatch = fullName.includes(searchTermLower);
    const idMatch = patientId.includes(searchTermLower);
    const statusMatch = (patient.status || '').toLowerCase().includes(searchTermLower);
    
    return nameMatch || idMatch || statusMatch;
  });

  const handleStartConsultation = (patient: ConsultationPatient) => {
    // Navigate to consultation form
    const patientId = patient.id || patient._id;
    if (patientId) {
      navigate(`/app/doctor/consultation/${patientId}`);
    } else {
      toast.error('Patient ID not found');
    }
  };

  const handleViewMedicalRecord = (patient: ConsultationPatient) => {
    // Navigate to doctor dashboard with medical records tab and patient selected
    const patientId = patient.id || patient._id;
    if (patientId) {
      // Navigate to dashboard with medical records tab and patient data
      navigate('/app/doctor/dashboard', {
        state: {
          activeTab: 'Medical Records',
          selectedPatient: {
            id: patientId,
            _id: patientId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            patientId: patient.patientId,
            status: patient.status
          }
        }
      });
    } else {
      toast.error('Patient ID not found');
    }
  };

  const handleViewConsultationRecord = (consultation: any) => {
    setSelectedConsultation(consultation);
    setIsViewModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consultations</h1>
          <p className="text-muted-foreground">
            Manage consultation patients assigned to you
          </p>
        </div>
        <Button onClick={fetchConsultationPatients} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-4 w-4" />
        <Input
          placeholder="Search by name, patient ID, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
          >
            ×
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted/20 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-primary-foreground text-muted-foreground shadow-sm'
              : 'text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          Pending Consultations ({patients.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-primary-foreground text-muted-foreground shadow-sm'
              : 'text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          Completed Consultations ({completedConsultations.length})
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients.filter(p => p.status?.toLowerCase() === 'scheduled').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients.filter(p => p.status?.toLowerCase() === 'admitted' || p.status?.toLowerCase() === 'in-progress').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'pending' ? 'Pending Consultation Patients' : 'Completed Consultations'}
            {searchTerm && activeTab === 'pending' && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredPatients.length} of {patients.length} patients)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === 'pending' ? (
            // Pending Consultations
            filteredPatients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? (
                  <div>
                    <p>No patients found matching "{searchTerm}"</p>
                    <p className="text-sm mt-2">Try searching by name, patient ID, or status</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setSearchTerm('')}
                    >
                      Clear Search
                    </Button>
                  </div>
                ) : (
                  'No consultation patients assigned to you.'
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPatients.map((patient, index) => (
                  <div
                    key={patient.id || patient._id || `patient-${index}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          {patient?.firstName || ''} {patient?.lastName || ''}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          ID: {patient?.patientId || patient?.id || patient?._id || 'N/A'}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getStatusColor(patient?.status)}>
                            {patient?.status || 'Unknown'}
                          </Badge>
                          <span className="text-xs text-muted-foreground/50">
                            Updated: {new Date(patient?.lastUpdated || patient?.updatedAt || patient?.createdAt || new Date()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewMedicalRecord({
                          id: patient.id,
                          _id: patient._id,
                          firstName: patient.firstName,
                          lastName: patient.lastName,
                          patientId: patient.patientId,
                          status: patient.status
                        })}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Records
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStartConsultation(patient)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Start Consultation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Completed Consultations
            completedConsultations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed consultations found.
              </div>
            ) : (
              <div className="space-y-4">
                {completedConsultations.map((consultation, index) => (
                  <div
                    key={consultation._id || `consultation-${index}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          {consultation.patient?.firstName} {consultation.patient?.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          ID: {consultation.patient?.patientId || consultation.patient?._id}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className="bg-primary/20 text-primary">
                            Completed
                          </Badge>
                          <span className="text-xs text-muted-foreground/50">
                            Completed: {new Date(consultation.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {consultation.chiefComplaint && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Chief Complaint: {typeof consultation.chiefComplaint === 'string' 
                              ? consultation.chiefComplaint 
                              : consultation.chiefComplaint.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewConsultationRecord(consultation)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Consultation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Consultation Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consultation Record Details</DialogTitle>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Patient Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedConsultation.patient?.firstName} {selectedConsultation.patient?.lastName}</p>
                    <p><span className="font-medium">Patient ID:</span> {selectedConsultation.patient?.patientId}</p>
                    <p><span className="font-medium">Date:</span> {new Date(selectedConsultation.createdAt).toLocaleDateString()}</p>
                    <p><span className="font-medium">Status:</span> 
                      <Badge variant="outline" className="ml-2">
                        {selectedConsultation.status}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Consultation Details</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Record Type:</span> {selectedConsultation.recordType || 'consultation'}</p>
                    <p><span className="font-medium">Doctor:</span> {selectedConsultation.doctor?.firstName} {selectedConsultation.doctor?.lastName}</p>
                    <p><span className="font-medium">Created:</span> {new Date(selectedConsultation.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Chief Complaint */}
              {selectedConsultation.chiefComplaint?.description && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Chief Complaint</h3>
                  <p className="text-muted-foreground">
                    {typeof selectedConsultation.chiefComplaint === 'string' 
                      ? selectedConsultation.chiefComplaint 
                      : selectedConsultation.chiefComplaint.description}
                  </p>
                </div>
              )}

              {/* History of Present Illness */}
              {selectedConsultation.historyOfPresentIllness && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">History of Present Illness</h3>
                  <p className="text-muted-foreground">
                    {selectedConsultation.historyOfPresentIllness}
                  </p>
                </div>
              )}

              {/* Physical Examination */}
              {selectedConsultation.physicalExamination && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Physical Examination</h3>
                  <div className="text-muted-foreground space-y-2">
                    {typeof selectedConsultation.physicalExamination === 'string' ? (
                      <p>{selectedConsultation.physicalExamination}</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedConsultation.physicalExamination.general && (
                          <div>
                            <strong>General:</strong> {selectedConsultation.physicalExamination.general}
                          </div>
                        )}
                        {selectedConsultation.physicalExamination.cardiovascular && (
                          <div>
                            <strong>Cardiovascular:</strong> {selectedConsultation.physicalExamination.cardiovascular}
                          </div>
                        )}
                        {selectedConsultation.physicalExamination.respiratory && (
                          <div>
                            <strong>Respiratory:</strong> {selectedConsultation.physicalExamination.respiratory}
                          </div>
                        )}
                        {selectedConsultation.physicalExamination.gastrointestinal && (
                          <div>
                            <strong>Gastrointestinal:</strong> {selectedConsultation.physicalExamination.gastrointestinal}
                          </div>
                        )}
                        {selectedConsultation.physicalExamination.neurological && (
                          <div>
                            <strong>Neurological:</strong> {selectedConsultation.physicalExamination.neurological}
                          </div>
                        )}
                        {selectedConsultation.physicalExamination.musculoskeletal && (
                          <div>
                            <strong>Musculoskeletal:</strong> {selectedConsultation.physicalExamination.musculoskeletal}
                          </div>
                        )}
                        {selectedConsultation.physicalExamination.skin && (
                          <div>
                            <strong>Skin:</strong> {selectedConsultation.physicalExamination.skin}
                          </div>
                        )}
                        {selectedConsultation.physicalExamination.summary && (
                          <div>
                            <strong>Summary:</strong> {selectedConsultation.physicalExamination.summary}
                          </div>
                        )}
                        {selectedConsultation.physicalExamination.heent && (
                          <div>
                            <strong>HEENT:</strong>
                            {typeof selectedConsultation.physicalExamination.heent === 'string' ? (
                              <span> {selectedConsultation.physicalExamination.heent}</span>
                            ) : (
                              <div className="ml-4 space-y-1">
                                {selectedConsultation.physicalExamination.heent.head && (
                                  <div>Head: {selectedConsultation.physicalExamination.heent.head}</div>
                                )}
                                {selectedConsultation.physicalExamination.heent.eyes && (
                                  <div>Eyes: {selectedConsultation.physicalExamination.heent.eyes}</div>
                                )}
                                {selectedConsultation.physicalExamination.heent.ears && (
                                  <div>Ears: {selectedConsultation.physicalExamination.heent.ears}</div>
                                )}
                                {selectedConsultation.physicalExamination.heent.nose && (
                                  <div>Nose: {selectedConsultation.physicalExamination.heent.nose}</div>
                                )}
                                {selectedConsultation.physicalExamination.heent.throat && (
                                  <div>Throat: {selectedConsultation.physicalExamination.heent.throat}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {selectedConsultation.diagnosis?.primary && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Diagnosis</h3>
                  <p className="text-muted-foreground">
                    {selectedConsultation.diagnosis.primary}
                  </p>
                </div>
              )}

              {/* Treatment Plan */}
              {selectedConsultation.treatmentPlan && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Treatment Plan</h3>
                  <p className="text-muted-foreground">
                    {selectedConsultation.treatmentPlan}
                  </p>
                </div>
              )}

              {/* Medications */}
              {selectedConsultation.medications && selectedConsultation.medications.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Medications</h3>
                  <div className="space-y-2">
                    {selectedConsultation.medications.map((med: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p><span className="font-medium">Name:</span> {med.name}</p>
                        <p><span className="font-medium">Dosage:</span> {med.dosage}</p>
                        <p><span className="font-medium">Instructions:</span> {med.instructions}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up */}
              {selectedConsultation.followUp && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Follow-up</h3>
                  <p className="text-muted-foreground">
                    {selectedConsultation.followUp}
                  </p>
                </div>
              )}

              {/* Additional Notes */}
              {selectedConsultation.additionalNotes && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Additional Notes</h3>
                  <p className="text-muted-foreground">
                    {selectedConsultation.additionalNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Consultations;
