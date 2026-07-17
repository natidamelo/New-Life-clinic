import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/EnhancedThemeContext';
import { toast } from 'react-hot-toast';
import api from '../../services/apiService';
import { 
  Search, 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  Plus, 
  Eye, 
  MessageSquare, 
  CheckCircle,
  Pill,
  ClipboardList,
  BookOpen,
  Heart,
  Activity,
  AlertTriangle,
  TrendingUp,
  Shield,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import Avatar from '../../components/Avatar';

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
    height?: string;
    weight?: string;
    bmi?: string;
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
  appointments?: Array<{
    _id: string;
    type: string;
    status: string;
    reason?: string;
    appointmentDateTime: string;
    doctorId?: any;
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
  const [storyboardTab, setStoryboardTab] = useState<'summary' | 'meds' | 'orders' | 'encounters'>('summary');
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConsultationPatients();
    fetchCompletedConsultations();
  }, [user]);

  // Auto-select first patient when the patients list changes
  useEffect(() => {
    if (patients.length > 0 && !selectedPatient) {
      setSelectedPatient(patients[0]);
    }
  }, [patients]);

  // Load history when selected patient changes
  useEffect(() => {
    const patientId = selectedPatient?.id || selectedPatient?._id;
    if (patientId) {
      fetchPatientHistory(patientId);
    } else {
      setSelectedPatientHistory([]);
    }
  }, [selectedPatient]);

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
        // Check if patient is assigned to this doctor (either directly, through service request, or appointment)
        const isAssignedToDoctor = patient.assignedDoctorId === currentDoctorId;
        
        // Check if any service request is assigned to this doctor
        const hasServiceRequestAssignedToDoctor = patient.serviceRequests?.some((sr: any) => 
          sr.assignedNurse === currentDoctorId || sr.assignedDoctor === currentDoctorId
        );

        // Check if any checked-in/scheduled appointment is assigned to this doctor
        const hasAppointmentAssignedToDoctor = patient.appointments?.some((appt: any) => 
          (appt.doctorId === currentDoctorId || appt.doctorId?._id === currentDoctorId) &&
          (appt.status === 'Checked In' || appt.status === 'Scheduled')
        );
        
        // Check if patient has consultation services or consultation appointments
        const hasConsultationService = patient.serviceRequests?.some((sr: any) => 
          sr.service?.category === 'consultation' || 
          sr.service?.category === 'follow-up' || 
          sr.notes?.toLowerCase().includes('consultation')
        ) || patient.appointments?.some((appt: any) => 
          ['Consultation', 'consultation', 'New Patient', 'Follow-up', 'follow-up', 'checkup', 'Check-up', 'Procedure', 'Emergency'].includes(appt.type) &&
          (appt.status === 'Checked In' || appt.status === 'Scheduled')
        );
        
        // More flexible status checking
        const isScheduled = patient.status === 'scheduled' || 
          patient.status === 'Admitted' || 
          patient.status === 'waiting' || 
          patient.status === 'in-progress';
        
        // Patient qualifies if they have consultation services/appointments AND are assigned to this doctor
        const qualifies = (isAssignedToDoctor || hasServiceRequestAssignedToDoctor || hasAppointmentAssignedToDoctor) && hasConsultationService;
        
        if (qualifies) {
          console.log(`🔍 [CONSULTATIONS] Found consultation patient: ${patient.firstName} ${patient.lastName}`, {
            isAssignedToDoctor,
            hasServiceRequestAssignedToDoctor,
            hasAppointmentAssignedToDoctor,
            hasConsultationService,
            status: patient.status,
            serviceRequests: patient.serviceRequests?.length || 0,
            appointments: patient.appointments?.length || 0
          });
        }
        
        return qualifies;
      });

      console.log('🔍 [CONSULTATIONS] Consultation patients found:', consultationPatients.length);
      setPatients(consultationPatients);
      
      // Keep selection updated or reset if current selection is not in list
      if (consultationPatients.length > 0) {
        if (!selectedPatient || !consultationPatients.some(p => (p.id || p._id) === (selectedPatient.id || selectedPatient._id))) {
          setSelectedPatient(consultationPatients[0]);
        }
      } else {
        setSelectedPatient(null);
      }
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
      setCompletedConsultations(completedRecords);
    } catch (error) {
      console.error('Error fetching completed consultations:', error);
    }
  };

  const fetchPatientHistory = async (patientId: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await api.get(`/api/medical-records/patient/${patientId}`);
      const history = response.data?.data || response.data || [];
      setSelectedPatientHistory(Array.isArray(history) ? history : []);
    } catch (error) {
      console.error('Error fetching patient history:', error);
      setSelectedPatientHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const checkVitalsAlerts = (vitals: any) => {
    if (!vitals) return { alerts: [], isAbnormal: false };
    const alerts: string[] = [];
    
    // Temp
    if (vitals.temperature) {
      const temp = parseFloat(vitals.temperature);
      if (!isNaN(temp)) {
        if (temp >= 38.0) alerts.push(`High Temp: ${vitals.temperature}°C`);
        else if (temp < 35.5) alerts.push(`Low Temp: ${vitals.temperature}°C`);
      }
    }
    
    // BP
    if (vitals.bloodPressure) {
      const bpParts = vitals.bloodPressure.split('/');
      if (bpParts.length === 2) {
        const sys = parseInt(bpParts[0]);
        const dia = parseInt(bpParts[1]);
        if (!isNaN(sys) && (sys >= 140 || dia >= 90)) alerts.push(`High BP: ${vitals.bloodPressure}`);
        else if (!isNaN(sys) && (sys < 90 || dia < 60)) alerts.push(`Low BP: ${vitals.bloodPressure}`);
      }
    }
    
    // HR
    if (vitals.heartRate) {
      const hr = parseInt(vitals.heartRate);
      if (!isNaN(hr)) {
        if (hr > 100) alerts.push(`Tachycardia: ${vitals.heartRate} bpm`);
        else if (hr < 50) alerts.push(`Bradycardia: ${vitals.heartRate} bpm`);
      }
    }
    
    // SpO2
    if (vitals.oxygenSaturation) {
      const spo2 = parseInt(vitals.oxygenSaturation);
      if (!isNaN(spo2) && spo2 < 94) alerts.push(`Low SpO2: ${vitals.oxygenSaturation}%`);
    }
    
    return {
      alerts,
      isAbnormal: alerts.length > 0
    };
  };

  const getVitalFieldStyle = (fieldName: string, value?: string) => {
    if (!value) return 'text-foreground';
    const val = parseFloat(value);
    if (isNaN(val)) return 'text-foreground';

    if (fieldName === 'temperature') {
      if (val >= 38.0) return 'text-red-600 dark:text-red-400 font-semibold';
      if (val < 35.5) return 'text-blue-600 dark:text-blue-400 font-semibold';
    }

    if (fieldName === 'heartRate') {
      if (val > 100 || val < 50) return 'text-red-600 dark:text-red-400 font-semibold';
    }

    if (fieldName === 'oxygenSaturation') {
      if (val < 94) return 'text-red-600 dark:text-red-400 font-semibold';
    }

    return 'text-foreground';
  };

  const getBPStyle = (bp?: string) => {
    if (!bp) return 'text-foreground';
    const parts = bp.split('/');
    if (parts.length !== 2) return 'text-foreground';
    const sys = parseInt(parts[0]);
    const dia = parseInt(parts[1]);
    if (isNaN(sys) || isNaN(dia)) return 'text-foreground';

    if (sys >= 140 || dia >= 90) return 'text-red-600 dark:text-red-400 font-semibold';
    if (sys < 90 || dia < 60) return 'text-blue-600 dark:text-blue-400 font-semibold';
    return 'text-foreground';
  };

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim().toLowerCase();
    const patientId = (patient.patientId || patient.id || patient._id || '').toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();
    
    return fullName.includes(searchTermLower) || patientId.includes(searchTermLower);
  });

  const handleStartConsultation = (patient: ConsultationPatient) => {
    const patientId = patient.id || patient._id;
    if (patientId) {
      navigate(`/app/doctor/consultation/${patientId}`);
    } else {
      toast.error('Patient ID not found');
    }
  };

  const handleViewMedicalRecord = (patient: ConsultationPatient) => {
    const patientId = patient.id || patient._id;
    if (patientId) {
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
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm">Loading Epic workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Epic Header / Clinical Workspace Title Banner */}
      <div className="flex justify-between items-center bg-card border border-border/60 p-4 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <h1 className="text-2xl font-bold text-foreground">Consultation Workspace</h1>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Epic Systems Console • Clinician View • Logged in as Dr. {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchConsultationPatients} variant="outline" size="sm" className="h-9">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Main Grid: Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Work List Queue (60% width) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Controls Card */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b space-y-0">
              <div className="flex space-x-1 bg-muted/40 p-0.5 rounded-lg">
                <button
                  onClick={() => {
                    setActiveTab('pending');
                    if (patients.length > 0) setSelectedPatient(patients[0]);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'pending'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pending Queue ({patients.length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('completed');
                    setSelectedPatient(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'completed'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Completed ({completedConsultations.length})
                </button>
              </div>
              <div className="relative w-48 lg:w-64">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-3.5 w-3.5" />
                <Input
                  placeholder="Filter by name, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              {activeTab === 'pending' ? (
                // Pending Consultations Queue
                filteredPatients.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    {searchTerm ? `No matches found for "${searchTerm}"` : 'No pending consultations in your queue.'}
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredPatients.map((patient, index) => {
                      const isSelected = selectedPatient && (patient.id || patient._id) === (selectedPatient.id || selectedPatient._id);
                      const vitalsCheck = checkVitalsAlerts(patient.vitals);
                      const displayAppt = patient.appointments && patient.appointments.length > 0 ? patient.appointments[0] : null;
                      
                      return (
                        <div
                          key={patient.id || patient._id || `patient-${index}`}
                          onClick={() => setSelectedPatient(patient)}
                          className={`flex items-center justify-between p-4 cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-blue-600' 
                              : 'hover:bg-muted/30 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <Avatar seed={patient.id || patient._id} fallbackInitials={`${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase()} size="sm" className="flex-shrink-0" />
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm text-foreground truncate">
                                {patient.firstName} {patient.lastName}
                              </h3>
                              <p className="text-xs text-muted-foreground/80 mt-0.5">
                                MRN: {patient.patientId || 'N/A'} • {patient.age || '?'}y/{patient.gender || '?'}
                              </p>
                              
                              <div className="flex items-center space-x-2 mt-2">
                                <StatusBadge status={patient.status}>
                                  {patient.status}
                                </StatusBadge>
                                {displayAppt && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-200/60 text-blue-700 bg-blue-50/20">
                                    {displayAppt.type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {/* Vitals Summary Indicator */}
                            <div className="hidden md:flex flex-col items-end text-right text-xs">
                              {patient.vitals ? (
                                <div className="space-y-0.5">
                                  <p className="text-muted-foreground text-[10px]">Vitals Summary</p>
                                  <div className="flex space-x-2 font-medium">
                                    <span className={getBPStyle(patient.vitals.bloodPressure)}>BP: {patient.vitals.bloodPressure || '--'}</span>
                                    <span className={getVitalFieldStyle('temperature', patient.vitals.temperature)}>T: {patient.vitals.temperature ? `${patient.vitals.temperature}°C` : '--'}</span>
                                  </div>
                                  {vitalsCheck.isAbnormal && (
                                    <span className="inline-flex items-center text-[9px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.2 rounded">
                                      Abnormal Range
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-yellow-600 font-medium bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200/50">
                                  Pending Vitals
                                </span>
                              )}
                            </div>

                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewMedicalRecord(patient);
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartConsultation(patient);
                                }}
                              >
                                Chart Room
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                // Completed Consultations
                completedConsultations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No completed consultations found for today.
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {completedConsultations.map((consultation, index) => (
                      <div
                        key={consultation._id || `consultation-${index}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/10"
                      >
                        <div className="flex items-center space-x-3.5">
                          <Avatar seed={consultation.patient?.patientId || consultation.patient?._id} fallbackInitials={`${consultation.patient?.firstName?.[0] || 'U'}${consultation.patient?.lastName?.[0] || 'P'}`} size="sm" className="flex-shrink-0" />
                          <div>
                            <h3 className="font-semibold text-sm text-foreground">
                              {consultation.patient?.firstName} {consultation.patient?.lastName}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              MRN: {consultation.patient?.patientId} • Date: {new Date(consultation.createdAt).toLocaleDateString()}
                            </p>
                            {consultation.diagnosis?.primary && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                                Dx: {consultation.diagnosis.primary}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleViewConsultationRecord(consultation)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Summary
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Epic Patient Storyboard Pane (40% width) */}
        <div className="lg:col-span-1">
          {selectedPatient ? (
            <Card className="border border-border/80 shadow-md sticky top-6 bg-card animate-fadeIn">
              
              {/* Storyboard Patient Header Banner */}
              <div className="bg-blue-600 text-white p-4 rounded-t-xl relative overflow-hidden">
                {/* Visual Background Accent */}
                <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-6 translate-x-2">
                  <Activity size={100} />
                </div>
                
                <div className="flex items-center space-x-3.5 relative z-10">
                  <Avatar seed={selectedPatient.id || selectedPatient._id} fallbackInitials={`${selectedPatient.firstName[0]}${selectedPatient.lastName[0]}`} size="sm" className="border-2 border-white/20 flex-shrink-0" />
                  <div>
                    <h2 className="font-bold text-base leading-tight">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h2>
                    <p className="text-xs text-white/80 mt-1">
                      MRN: {selectedPatient.patientId || 'N/A'} • DOB: {selectedPatient.lastUpdated ? new Date(selectedPatient.lastUpdated).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-xs text-white/90 font-medium mt-0.5">
                      {selectedPatient.age || '?'} Years Old • {selectedPatient.gender?.toUpperCase() || '?'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Storyboard Tab Switcher */}
              <div className="flex border-b text-xs">
                <button
                  onClick={() => setStoryboardTab('summary')}
                  className={`flex-1 py-2.5 text-center font-medium border-b-2 transition-all ${
                    storyboardTab === 'summary' 
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setStoryboardTab('meds')}
                  className={`flex-1 py-2.5 text-center font-medium border-b-2 transition-all ${
                    storyboardTab === 'meds' 
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Meds & Hx
                </button>
                <button
                  onClick={() => setStoryboardTab('orders')}
                  className={`flex-1 py-2.5 text-center font-medium border-b-2 transition-all ${
                    storyboardTab === 'orders' 
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setStoryboardTab('encounters')}
                  className={`flex-1 py-2.5 text-center font-medium border-b-2 transition-all ${
                    storyboardTab === 'encounters' 
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Encounters
                </button>
              </div>

              {/* Storyboard Content Panel */}
              <div className="p-4 min-h-[350px] max-h-[460px] overflow-y-auto text-xs space-y-4">
                
                {storyboardTab === 'summary' && (
                  // Summary Tab: Vitals Flows & Allergy Flags
                  <div className="space-y-4">
                    {/* Allergies / Care Warnings */}
                    <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 p-3 rounded-lg flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-red-700 dark:text-red-400">Allergies / Critical Alerts</h4>
                        <p className="text-muted-foreground text-[11px] mt-0.5">
                          No Known Drug Allergies (NKDA) recorded. Verify with patient.
                        </p>
                      </div>
                    </div>

                    {/* Vitals Flowsheet Grid */}
                    <div>
                      <h4 className="font-bold text-foreground mb-2 flex items-center">
                        <Activity className="h-4 w-4 mr-1.5 text-blue-600 animate-pulse" />
                        Vital Signs Flowsheet
                      </h4>
                      {selectedPatient.vitals ? (
                        <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2.5 rounded-lg">
                          <div className="border-b border-border/40 pb-1.5">
                            <span className="text-muted-foreground text-[10px] block">Temperature</span>
                            <span className={`font-semibold text-sm ${getVitalFieldStyle('temperature', selectedPatient.vitals.temperature)}`}>
                              {selectedPatient.vitals.temperature ? `${selectedPatient.vitals.temperature} °C` : '--'}
                            </span>
                          </div>
                          <div className="border-b border-border/40 pb-1.5">
                            <span className="text-muted-foreground text-[10px] block">Blood Pressure</span>
                            <span className={`font-semibold text-sm ${getBPStyle(selectedPatient.vitals.bloodPressure)}`}>
                              {selectedPatient.vitals.bloodPressure || '--'}
                            </span>
                          </div>
                          <div className="border-b border-border/40 pb-1.5">
                            <span className="text-muted-foreground text-[10px] block">Heart Rate</span>
                            <span className={`font-semibold text-sm ${getVitalFieldStyle('heartRate', selectedPatient.vitals.heartRate)}`}>
                              {selectedPatient.vitals.heartRate ? `${selectedPatient.vitals.heartRate} bpm` : '--'}
                            </span>
                          </div>
                          <div className="border-b border-border/40 pb-1.5">
                            <span className="text-muted-foreground text-[10px] block">SpO2</span>
                            <span className={`font-semibold text-sm ${getVitalFieldStyle('oxygenSaturation', selectedPatient.vitals.oxygenSaturation)}`}>
                              {selectedPatient.vitals.oxygenSaturation ? `${selectedPatient.vitals.oxygenSaturation} %` : '--'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px] block">Resp Rate</span>
                            <span className="font-semibold text-sm text-foreground">
                              {selectedPatient.vitals.respiratoryRate ? `${selectedPatient.vitals.respiratoryRate} /min` : '--'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px] block">BMI</span>
                            <span className="font-semibold text-sm text-foreground">
                              {selectedPatient.vitals.bmi || '--'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground bg-muted/10 rounded-lg">
                          No vitals captured. Vitals must be checked at Nursing Station.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {storyboardTab === 'meds' && (
                  // Meds & History Tab
                  <div className="space-y-4">
                    {/* Active Meds */}
                    <div>
                      <h4 className="font-bold text-foreground mb-2 flex items-center">
                        <Pill className="h-4 w-4 mr-1.5 text-blue-600" />
                        Active Home Medications
                      </h4>
                      <div className="bg-muted/20 p-2.5 rounded-lg text-muted-foreground">
                        No home medications recorded. Update during charting if needed.
                      </div>
                    </div>

                    {/* Past History */}
                    <div>
                      <h4 className="font-bold text-foreground mb-2 flex items-center">
                        <BookOpen className="h-4 w-4 mr-1.5 text-blue-600" />
                        Past Medical History
                      </h4>
                      <div className="bg-muted/20 p-2.5 rounded-lg text-muted-foreground">
                        No diagnostic history documented. Refer to Encounters tab for past logs.
                      </div>
                    </div>
                  </div>
                )}

                {storyboardTab === 'orders' && (
                  // Orders Tab
                  <div>
                    <h4 className="font-bold text-foreground mb-2 flex items-center">
                      <ClipboardList className="h-4 w-4 mr-1.5 text-blue-600" />
                      Active & Pending Orders
                    </h4>
                    {selectedPatient.serviceRequests && selectedPatient.serviceRequests.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPatient.serviceRequests.map((req, index) => (
                          <div key={index} className="p-2 border rounded bg-muted/10 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-foreground">{req.serviceName || req.service?.name}</p>
                              <p className="text-[10px] text-muted-foreground">Cat: {req.service?.category || 'Service'}</p>
                            </div>
                            <Badge variant={req.status === 'paid' ? 'success' : 'outline'} className="text-[10px]">
                              {req.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground bg-muted/10 rounded-lg">
                        No active clinical orders for this visit.
                      </div>
                    )}
                  </div>
                )}

                {storyboardTab === 'encounters' && (
                  // Encounters Tab (History Timeline)
                  <div>
                    <h4 className="font-bold text-foreground mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-1.5 text-blue-600" />
                      Encounter Timeline
                    </h4>
                    {isLoadingHistory ? (
                      <div className="text-center py-6 text-muted-foreground">
                        Loading clinical records...
                      </div>
                    ) : selectedPatientHistory.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPatientHistory.map((record, index) => (
                          <div key={index} className="p-2.5 border rounded bg-muted/10 space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-semibold text-blue-700 dark:text-blue-400">
                                {record.doctorName || 'Doctor Visit'}
                              </span>
                              <span className="text-muted-foreground">
                                {new Date(record.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="font-medium text-foreground">Dx: {record.diagnosis?.primary || 'No primary diagnosis'}</p>
                            {record.chiefComplaint?.description && (
                              <p className="text-muted-foreground text-[10px] truncate">CC: {record.chiefComplaint.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground bg-muted/10 rounded-lg">
                        No previous encounters recorded in system database.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Storyboard Sticky Action footer */}
              <div className="p-4 bg-muted/30 border-t rounded-b-xl flex space-x-2">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  onClick={() => handleStartConsultation(selectedPatient)}
                >
                  Open Patient Chart
                  <ArrowRight className="h-3.5 w-3.5 ml-2" />
                </Button>
              </div>

            </Card>
          ) : (
            <Card className="border border-dashed border-border/80 h-[450px] flex items-center justify-center p-6 text-center text-muted-foreground bg-muted/5 rounded-xl">
              <div>
                <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold text-sm text-foreground mb-1">No Chart Selected</h3>
                <p className="text-xs max-w-xs mx-auto">
                  Select a patient from the queue to load the Storyboard preview.
                </p>
              </div>
            </Card>
          )}
        </div>

      </div>

      {/* Consultation Details Modal (For Completed Visits) */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedConsultation && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b pb-4">
                <h2 className="text-xl font-bold text-foreground">Clinical Summary</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Finalized Encounter • Documented by Dr. {selectedConsultation.doctor?.firstName} {selectedConsultation.doctor?.lastName}
                </p>
              </div>

              {/* Patient Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Patient Name</span>
                  <span className="font-semibold text-foreground">{selectedConsultation.patient?.firstName} {selectedConsultation.patient?.lastName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Patient MRN</span>
                  <span className="font-semibold text-foreground">{selectedConsultation.patient?.patientId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Encounter Date</span>
                  <span className="font-semibold text-foreground">{new Date(selectedConsultation.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Record Type</span>
                  <span className="font-semibold text-foreground">{selectedConsultation.recordType || 'Consultation'}</span>
                </div>
              </div>

              {/* Chief Complaint */}
              {selectedConsultation.chiefComplaint && (
                <div>
                  <h3 className="font-bold text-sm text-foreground border-b pb-1 mb-2">Chief Complaint</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {typeof selectedConsultation.chiefComplaint === 'string' 
                      ? selectedConsultation.chiefComplaint 
                      : selectedConsultation.chiefComplaint.description || 'No complaint details documented.'}
                  </p>
                </div>
              )}

              {/* History of Present Illness */}
              {selectedConsultation.historyOfPresentIllness && (
                <div>
                  <h3 className="font-bold text-sm text-foreground border-b pb-1 mb-2">History of Present Illness</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {selectedConsultation.historyOfPresentIllness}
                  </p>
                </div>
              )}

              {/* Diagnosis */}
              {selectedConsultation.diagnosis?.primary && (
                <div>
                  <h3 className="font-bold text-sm text-foreground border-b pb-1 mb-2">Diagnoses (ICD Assessment)</h3>
                  <div className="bg-blue-50/20 border border-blue-200/50 p-3 rounded-lg text-xs">
                    <span className="font-bold text-blue-700 dark:text-blue-400">Primary Diagnosis:</span>
                    <span className="ml-1 text-foreground font-medium">{selectedConsultation.diagnosis.primary}</span>
                  </div>
                </div>
              )}

              {/* Plan & Medications */}
              {selectedConsultation.medications && selectedConsultation.medications.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm text-foreground border-b pb-1 mb-2">Prescribed Medications</h3>
                  <div className="space-y-2">
                    {selectedConsultation.medications.map((med: any, index: number) => (
                      <div key={index} className="p-2.5 border rounded-lg text-xs">
                        <p><span className="font-bold text-foreground">Medication:</span> {med.name}</p>
                        <p><span className="font-medium text-muted-foreground">Dosage:</span> {med.dosage} • <span className="font-medium text-muted-foreground">Sig:</span> {med.instructions}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Treatment Plan */}
              {selectedConsultation.treatmentPlan && (
                <div>
                  <h3 className="font-bold text-sm text-foreground border-b pb-1 mb-2">Treatment Plan & Orders</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {selectedConsultation.treatmentPlan}
                  </p>
                </div>
              )}

              {/* Additional Notes */}
              {selectedConsultation.additionalNotes && (
                <div>
                  <h3 className="font-bold text-sm text-foreground border-b pb-1 mb-2">Additional Comments</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
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
