import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Separator } from '../../components/ui/separator';
import { 
  ArrowLeft, 
  User, 
  Save, 
  Send,
  FileText,
  Pill,
  Activity,
  Clock,
  Plus,
  Stethoscope,
  Heart,
  Brain,
  Eye,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Search,
  Zap,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Shield,
  Target,
  Lightbulb
} from 'lucide-react';
import api from '../../services/apiService';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// Enhanced interfaces for modern EMR
interface Patient {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  patientId: string;
  age: number;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
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
  allergies?: Array<{
    allergen: string;
    reaction: string;
    severity: string;
  }>;
  currentMedications?: Array<{
    medication: string;
    dosage: string;
    frequency: string;
  }>;
  pastMedicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
}

interface Diagnosis {
  code: string;
  description: string;
  category: string;
  type: 'primary' | 'secondary';
  icd10?: string;
  icd11?: string;
  notes?: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  route: string;
  quantity?: number;
}

interface LabOrder {
  test: string;
  urgency: 'routine' | 'urgent' | 'stat';
  notes?: string;
  category: string;
}

interface ImagingOrder {
  study: string;
  urgency: 'routine' | 'urgent' | 'stat';
  indication?: string;
  bodyPart?: string;
}

interface ConsultationData {
  chiefComplaint: {
    description: string;
    duration: string;
    severity: string;
    associatedSymptoms: string[];
    onsetPattern: string;
    progression: string;
    impactOnDailyLife: string;
    location: string;
    aggravatingFactors: string[];
    relievingFactors: string[];
  };
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  familyHistory: string;
  socialHistory: string;
  physicalExamination: {
    general: string;
    heent: {
      head: string;
      eyes: string;
      ears: string;
      nose: string;
      throat: string;
    };
    cardiovascular: string;
    respiratory: string;
    gastrointestinal: string;
    genitourinary: string;
    musculoskeletal: string;
    neurological: string;
    skin: string;
  };
  diagnoses: Diagnosis[];
  medications: Medication[];
  labOrders: LabOrder[];
  imagingOrders: ImagingOrder[];
  followUpPlan: {
    timing: string;
    instructions: string;
    appointmentNeeded: boolean;
    labWork: boolean;
    imaging: boolean;
    provider: string;
  };
  notes: string;
  status: 'draft' | 'completed';
}

// Enhanced diagnosis database with ICD-10/ICD-11 codes
const diagnosisDatabase = [
  // Common conditions
  {
    code: 'HYP001',
    description: 'Essential hypertension',
    category: 'Cardiovascular',
    icd10: 'I10',
    icd11: 'BA00',
    commonTerms: ['high blood pressure', 'hypertension', 'HTN']
  },
  {
    code: 'DM001',
    description: 'Type 2 diabetes mellitus',
    category: 'Endocrine',
    icd10: 'E11',
    icd11: '5A11',
    commonTerms: ['diabetes', 'diabetes mellitus', 'T2DM']
  },
  {
    code: 'RESP001',
    description: 'Upper respiratory tract infection',
    category: 'Respiratory',
    icd10: 'J06.9',
    icd11: 'CA40.Z',
    commonTerms: ['cold', 'URTI', 'upper respiratory infection']
  },
  {
    code: 'GAST001',
    description: 'Gastroesophageal reflux disease',
    category: 'Gastrointestinal',
    icd10: 'K21.9',
    icd11: 'DD90',
    commonTerms: ['GERD', 'acid reflux', 'heartburn']
  },
  {
    code: 'NEURO001',
    description: 'Tension-type headache',
    category: 'Neurological',
    icd10: 'G44.2',
    icd11: '8D87',
    commonTerms: ['headache', 'tension headache', 'stress headache']
  },
  {
    code: 'MUSC001',
    description: 'Low back pain',
    category: 'Musculoskeletal',
    icd10: 'M54.5',
    icd11: 'ME84.2',
    commonTerms: ['back pain', 'lumbar pain', 'lower back pain']
  }
];

const EnhancedConsultationForm: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('chief-complaint');
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [medicationSearch, setMedicationSearch] = useState('');
  
  const [consultation, setConsultation] = useState<ConsultationData>({
    chiefComplaint: {
      description: '',
      duration: '',
      severity: '',
      associatedSymptoms: [],
      onsetPattern: '',
      progression: '',
      impactOnDailyLife: '',
      location: '',
      aggravatingFactors: [],
      relievingFactors: []
    },
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    familyHistory: '',
    socialHistory: '',
    physicalExamination: {
      general: '',
      heent: {
        head: '',
        eyes: '',
        ears: '',
        nose: '',
        throat: ''
      },
      cardiovascular: '',
      respiratory: '',
      gastrointestinal: '',
      genitourinary: '',
      musculoskeletal: '',
      neurological: '',
      skin: ''
    },
    diagnoses: [],
    medications: [],
    labOrders: [],
    imagingOrders: [],
    followUpPlan: {
      timing: '',
      instructions: '',
      appointmentNeeded: false,
      labWork: false,
      imaging: false,
      provider: ''
    },
    notes: '',
    status: 'draft'
  });

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      console.log(`[ENHANCED CONSULTATION] Fetching patient with ID: ${patientId}`);
      const response = await api.get(`/api/patients/${patientId}`);
      console.log(`[ENHANCED CONSULTATION] Patient response:`, response.data);
      
      const patientData = response.data.data || response.data;
      console.log(`[ENHANCED CONSULTATION] Patient data:`, patientData);
      
      if (!patientData) {
        throw new Error('No patient data received');
      }
      
      const formattedPatient: Patient = {
        id: patientData._id || patientData.id,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        patientId: patientData.patientId,
        age: patientData.age || 0,
        gender: patientData.gender,
        phone: patientData.phone,
        email: patientData.email,
        address: patientData.address,
        emergencyContact: patientData.emergencyContact,
        vitals: patientData.vitals,
        allergies: patientData.allergies || [],
        currentMedications: patientData.currentMedications || [],
        pastMedicalHistory: patientData.pastMedicalHistory || '',
        familyHistory: patientData.familyHistory || '',
        socialHistory: patientData.socialHistory || ''
      };
      
      setPatient(formattedPatient);
      
      // Pre-populate some fields if available
      setConsultation(prev => ({
        ...prev,
        pastMedicalHistory: formattedPatient.pastMedicalHistory || '',
        familyHistory: formattedPatient.familyHistory || '',
        socialHistory: formattedPatient.socialHistory || ''
      }));
      
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast.error('Failed to load patient data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConsultation = async () => {
    try {
      setIsSaving(true);
      
      // Transform consultation data to match backend expectations
      const consultationData = {
        patient: patientId,
        doctor: user?.id || user?._id,
        createdBy: user?.id || user?._id,
        status: 'Finalized',
        visitDate: new Date().toISOString(),
        recordType: 'consultation', // Add identifier for consultation records
        
        // Chief complaint - backend expects object structure
        chiefComplaint: {
          description: consultation.chiefComplaint.description || 'Medical consultation',
          duration: consultation.chiefComplaint.duration || '',
          severity: consultation.chiefComplaint.severity || 'Mild',
          onsetPattern: consultation.chiefComplaint.onsetPattern || 'Acute',
          progression: consultation.chiefComplaint.progression || 'Stable',
          location: consultation.chiefComplaint.location || '',
          aggravatingFactors: consultation.chiefComplaint.aggravatingFactors || [],
          relievingFactors: consultation.chiefComplaint.relievingFactors || [],
          associatedSymptoms: consultation.chiefComplaint.associatedSymptoms || [],
          impactOnDailyLife: consultation.chiefComplaint.impactOnDailyLife || '',
          previousEpisodes: false,
          previousEpisodesDetails: '',
          recordedBy: user?.id || user?._id,
          recordedAt: new Date().toISOString()
        },
        
        // History
        historyOfPresentIllness: consultation.historyOfPresentIllness || '',
        pastMedicalHistory: consultation.pastMedicalHistory || '',
        familyHistory: consultation.familyHistory || '',
        socialHistory: consultation.socialHistory || '',
        
        // Physical examination
        physicalExamination: consultation.physicalExamination || {},
        
        // Diagnosis - convert to string format expected by backend
        diagnosis: consultation.diagnoses.length > 0 
          ? consultation.diagnoses.map(d => d.description).join(', ')
          : 'Diagnosis pending',
        
        // Plan
        plan: consultation.notes || '',
        treatmentPlan: consultation.notes || '',
        
        // Follow-up plan
        followUpPlan: consultation.followUpPlan || {},
        
        // Additional notes
        notes: consultation.notes || ''
      };

      console.log('Saving consultation data:', consultationData);
      console.log('RecordType being sent:', consultationData.recordType);

      const response = await api.post('/api/medical-records', consultationData);
      console.log('Consultation save response:', response.data);

      // Update patient status using the correct endpoint
      try {
        await api.put(`/api/patients/${patientId}/status`, {
          status: 'completed'
        });
      } catch (statusError) {
        console.warn('Failed to update patient status, but consultation was saved:', statusError);
        // Don't fail the entire operation if status update fails
      }

      toast.success('Consultation completed successfully');
      navigate('/app/doctor/consultations');
    } catch (error) {
      console.error('Error saving consultation:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to save consultation');
    } finally {
      setIsSaving(false);
    }
  };

  const addDiagnosis = (diagnosis: any) => {
    const newDiagnosis: Diagnosis = {
      code: diagnosis.code,
      description: diagnosis.description,
      category: diagnosis.category,
      type: consultation.diagnoses.length === 0 ? 'primary' : 'secondary',
      icd10: diagnosis.icd10,
      icd11: diagnosis.icd11
    };
    
    setConsultation(prev => ({
      ...prev,
      diagnoses: [...prev.diagnoses, newDiagnosis]
    }));
    
    setDiagnosisSearch('');
  };

  const addMedication = () => {
    const newMedication: Medication = {
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      route: 'oral'
    };
    
    setConsultation(prev => ({
      ...prev,
      medications: [...prev.medications, newMedication]
    }));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    setConsultation(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const removeMedication = (index: number) => {
    setConsultation(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const addLabOrder = () => {
    const newLabOrder: LabOrder = {
      test: '',
      urgency: 'routine',
      notes: '',
      category: 'general'
    };
    
    setConsultation(prev => ({
      ...prev,
      labOrders: [...prev.labOrders, newLabOrder]
    }));
  };

  const updateLabOrder = (index: number, field: keyof LabOrder, value: string) => {
    setConsultation(prev => ({
      ...prev,
      labOrders: prev.labOrders.map((lab, i) => 
        i === index ? { ...lab, [field]: value } : lab
      )
    }));
  };

  const removeLabOrder = (index: number) => {
    setConsultation(prev => ({
      ...prev,
      labOrders: prev.labOrders.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Patient not found</p>
        <p className="text-sm text-muted-foreground/50 mt-2">Patient ID: {patientId}</p>
        <Button onClick={() => navigate('/app/doctor/consultations')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Consultations
        </Button>
      </div>
    );
  }

  const filteredDiagnoses = diagnosisDatabase.filter(dx => 
    dx.description.toLowerCase().includes(diagnosisSearch.toLowerCase()) ||
    dx.commonTerms.some(term => term.toLowerCase().includes(diagnosisSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/doctor/consultations')}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">
              Enhanced Consultation
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {patient.firstName} {patient.lastName} — {patient.patientId}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate(`/app/doctor/medical-records/${patientId}`)}>
            <FileText className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">View </span>Records
          </Button>
          <Button size="sm" onClick={handleSaveConsultation} disabled={isSaving}>
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            <span className="hidden sm:inline">Complete </span>Consultation
          </Button>
        </div>
      </div>

      {/* Patient Info & Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Name</Label>
              <p className="text-lg font-semibold">{patient.firstName} {patient.lastName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Patient ID</Label>
              <p className="text-lg font-semibold">{patient.patientId}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Age & Gender</Label>
              <p className="text-lg font-semibold">{patient.age} years, {patient.gender}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <Badge className="bg-primary/20 text-primary">In Consultation</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Vital Signs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patient.vitals ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Temperature</Label>
                  <p className="text-lg font-semibold">{patient.vitals.temperature || 'N/A'}°C</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Blood Pressure</Label>
                  <p className="text-lg font-semibold">{patient.vitals.bloodPressure || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Heart Rate</Label>
                  <p className="text-lg font-semibold">{patient.vitals.heartRate || 'N/A'} bpm</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Respiratory Rate</Label>
                  <p className="text-lg font-semibold">{patient.vitals.respiratoryRate || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">O2 Saturation</Label>
                  <p className="text-lg font-semibold">{patient.vitals.oxygenSaturation || 'N/A'}%</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No vital signs recorded</p>
            )}
          </CardContent>
        </Card>

        {/* Allergies & Current Medications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Allergies & Medications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Allergies</Label>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="space-y-1">
                  {patient.allergies.map((allergy, index) => (
                    <Badge key={index} variant="destructive" className="mr-1">
                      {allergy.allergen}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No known allergies</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Current Medications</Label>
              {patient.currentMedications && patient.currentMedications.length > 0 ? (
                <div className="space-y-1">
                  {patient.currentMedications.map((med, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{med.medication}</span>
                      <span className="text-muted-foreground"> - {med.dosage} {med.frequency}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No current medications</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Consultation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Stethoscope className="h-5 w-5 mr-2" />
            Consultation Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <TabsList className="flex w-max min-w-full sm:grid sm:grid-cols-6 gap-0">
                <TabsTrigger value="chief-complaint" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3">Chief Complaint</TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3">History</TabsTrigger>
                <TabsTrigger value="examination" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3">Examination</TabsTrigger>
                <TabsTrigger value="diagnosis" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3">Diagnosis</TabsTrigger>
                <TabsTrigger value="treatment" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3">Treatment</TabsTrigger>
                <TabsTrigger value="followup" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3">Follow-up</TabsTrigger>
              </TabsList>
            </div>

            {/* Chief Complaint Tab */}
            <TabsContent value="chief-complaint" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Chief Complaint</Label>
                  <Textarea
                    id="description"
                    value={consultation.chiefComplaint.description}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      chiefComplaint: { ...prev.chiefComplaint, description: e.target.value }
                    }))}
                    placeholder="Patient's main complaint..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={consultation.chiefComplaint.duration}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      chiefComplaint: { ...prev.chiefComplaint, duration: e.target.value }
                    }))}
                    placeholder="e.g., 3 days, 2 weeks"
                  />
                </div>
                <div>
                  <Label htmlFor="severity">Severity (1-10)</Label>
                  <Select
                    value={consultation.chiefComplaint.severity}
                    onValueChange={(value) => setConsultation(prev => ({
                      ...prev,
                      chiefComplaint: { ...prev.chiefComplaint, severity: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={consultation.chiefComplaint.location}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      chiefComplaint: { ...prev.chiefComplaint, location: e.target.value }
                    }))}
                    placeholder="e.g., chest, head, abdomen"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="associated-symptoms">Associated Symptoms</Label>
                <Textarea
                  id="associated-symptoms"
                  value={consultation.chiefComplaint.associatedSymptoms.join(', ')}
                  onChange={(e) => setConsultation(prev => ({
                    ...prev,
                    chiefComplaint: { 
                      ...prev.chiefComplaint, 
                      associatedSymptoms: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }
                  }))}
                  placeholder="List associated symptoms separated by commas"
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <div>
                <Label htmlFor="hpi">History of Present Illness</Label>
                <Textarea
                  id="hpi"
                  value={consultation.historyOfPresentIllness}
                  onChange={(e) => setConsultation(prev => ({
                    ...prev,
                    historyOfPresentIllness: e.target.value
                  }))}
                  placeholder="Detailed history of the current illness..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="pmh">Past Medical History</Label>
                <Textarea
                  id="pmh"
                  value={consultation.pastMedicalHistory}
                  onChange={(e) => setConsultation(prev => ({
                    ...prev,
                    pastMedicalHistory: e.target.value
                  }))}
                  placeholder="Previous medical conditions, surgeries, hospitalizations..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="fh">Family History</Label>
                <Textarea
                  id="fh"
                  value={consultation.familyHistory}
                  onChange={(e) => setConsultation(prev => ({
                    ...prev,
                    familyHistory: e.target.value
                  }))}
                  placeholder="Family medical history..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="sh">Social History</Label>
                <Textarea
                  id="sh"
                  value={consultation.socialHistory}
                  onChange={(e) => setConsultation(prev => ({
                    ...prev,
                    socialHistory: e.target.value
                  }))}
                  placeholder="Smoking, alcohol, occupation, lifestyle..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Physical Examination Tab */}
            <TabsContent value="examination" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="general">General Appearance</Label>
                  <Textarea
                    id="general"
                    value={consultation.physicalExamination.general}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      physicalExamination: { ...prev.physicalExamination, general: e.target.value }
                    }))}
                    placeholder="General appearance, alertness, distress..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="cardiovascular">Cardiovascular</Label>
                  <Textarea
                    id="cardiovascular"
                    value={consultation.physicalExamination.cardiovascular}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      physicalExamination: { ...prev.physicalExamination, cardiovascular: e.target.value }
                    }))}
                    placeholder="Heart sounds, rhythm, pulses..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="respiratory">Respiratory</Label>
                  <Textarea
                    id="respiratory"
                    value={consultation.physicalExamination.respiratory}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      physicalExamination: { ...prev.physicalExamination, respiratory: e.target.value }
                    }))}
                    placeholder="Lung sounds, breathing pattern..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="gastrointestinal">Gastrointestinal</Label>
                  <Textarea
                    id="gastrointestinal"
                    value={consultation.physicalExamination.gastrointestinal}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      physicalExamination: { ...prev.physicalExamination, gastrointestinal: e.target.value }
                    }))}
                    placeholder="Abdomen, bowel sounds..."
                    rows={2}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="neurological">Neurological</Label>
                <Textarea
                  id="neurological"
                  value={consultation.physicalExamination.neurological}
                  onChange={(e) => setConsultation(prev => ({
                    ...prev,
                    physicalExamination: { ...prev.physicalExamination, neurological: e.target.value }
                  }))}
                  placeholder="Mental status, cranial nerves, motor, sensory..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Diagnosis Tab */}
            <TabsContent value="diagnosis" className="space-y-4">
              <div>
                <Label htmlFor="diagnosis-search">Search Diagnosis</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-4 w-4" />
                  <Input
                    id="diagnosis-search"
                    placeholder="Search for diagnosis..."
                    value={diagnosisSearch}
                    onChange={(e) => setDiagnosisSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {diagnosisSearch && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                    {filteredDiagnoses.map((diagnosis, index) => (
                      <div
                        key={index}
                        className="p-2 hover:bg-muted/10 cursor-pointer border-b last:border-b-0"
                        onClick={() => addDiagnosis(diagnosis)}
                      >
                        <div className="font-medium">{diagnosis.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {diagnosis.category} • ICD-10: {diagnosis.icd10} • ICD-11: {diagnosis.icd11}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <Label>Current Diagnoses</Label>
                {consultation.diagnoses.length > 0 ? (
                  <div className="space-y-2">
                    {consultation.diagnoses.map((diagnosis, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{diagnosis.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {diagnosis.category} • {diagnosis.type} • ICD-10: {diagnosis.icd10}
                          </div>
                        </div>
                        <Badge variant={diagnosis.type === 'primary' ? 'default' : 'secondary'}>
                          {diagnosis.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No diagnoses added yet</p>
                )}
              </div>
            </TabsContent>

            {/* Treatment Tab */}
            <TabsContent value="treatment" className="space-y-4">
              {/* Medications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Medications</Label>
                  <Button size="sm" onClick={addMedication}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Medication
                  </Button>
                </div>
                {consultation.medications.length > 0 ? (
                  <div className="space-y-3">
                    {consultation.medications.map((medication, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <Label>Medication</Label>
                              <Input
                                value={medication.name}
                                onChange={(e) => updateMedication(index, 'name', e.target.value)}
                                placeholder="Medication name"
                              />
                            </div>
                            <div>
                              <Label>Dosage</Label>
                              <Input
                                value={medication.dosage}
                                onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                placeholder="e.g., 500mg"
                              />
                            </div>
                            <div>
                              <Label>Frequency</Label>
                              <Input
                                value={medication.frequency}
                                onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                                placeholder="e.g., twice daily"
                              />
                            </div>
                            <div>
                              <Label>Duration</Label>
                              <Input
                                value={medication.duration}
                                onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                                placeholder="e.g., 7 days"
                              />
                            </div>
                            <div className="md:col-span-4">
                              <Label>Instructions</Label>
                              <Textarea
                                value={medication.instructions}
                                onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                                placeholder="Special instructions..."
                                rows={2}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeMedication(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No medications added yet</p>
                )}
              </div>

              {/* Lab Orders */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Lab Orders</Label>
                  <Button size="sm" onClick={addLabOrder}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Lab Order
                  </Button>
                </div>
                {consultation.labOrders.length > 0 ? (
                  <div className="space-y-2">
                    {consultation.labOrders.map((lab, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                        <Input
                          value={lab.test}
                          onChange={(e) => updateLabOrder(index, 'test', e.target.value)}
                          placeholder="Lab test name"
                          className="flex-1"
                        />
                        <Select
                          value={lab.urgency}
                          onValueChange={(value) => updateLabOrder(index, 'urgency', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="routine">Routine</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="stat">STAT</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeLabOrder(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No lab orders added yet</p>
                )}
              </div>
            </TabsContent>

            {/* Follow-up Tab */}
            <TabsContent value="followup" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="followup-timing">Follow-up Timing</Label>
                  <Input
                    id="followup-timing"
                    value={consultation.followUpPlan.timing}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      followUpPlan: { ...prev.followUpPlan, timing: e.target.value }
                    }))}
                    placeholder="e.g., 2 weeks, 1 month"
                  />
                </div>
                <div>
                  <Label htmlFor="followup-provider">Provider</Label>
                  <Input
                    id="followup-provider"
                    value={consultation.followUpPlan.provider}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      followUpPlan: { ...prev.followUpPlan, provider: e.target.value }
                    }))}
                    placeholder="e.g., Primary care, Specialist"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="followup-instructions">Follow-up Instructions</Label>
                <Textarea
                  id="followup-instructions"
                  value={consultation.followUpPlan.instructions}
                  onChange={(e) => setConsultation(prev => ({
                    ...prev,
                    followUpPlan: { ...prev.followUpPlan, instructions: e.target.value }
                  }))}
                  placeholder="Specific instructions for follow-up..."
                  rows={3}
                />
              </div>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={consultation.followUpPlan.appointmentNeeded}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      followUpPlan: { ...prev.followUpPlan, appointmentNeeded: e.target.checked }
                    }))}
                  />
                  <span>Appointment needed</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={consultation.followUpPlan.labWork}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      followUpPlan: { ...prev.followUpPlan, labWork: e.target.checked }
                    }))}
                  />
                  <span>Lab work needed</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={consultation.followUpPlan.imaging}
                    onChange={(e) => setConsultation(prev => ({
                      ...prev,
                      followUpPlan: { ...prev.followUpPlan, imaging: e.target.checked }
                    }))}
                  />
                  <span>Imaging needed</span>
                </label>
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={consultation.notes}
                  onChange={(e) => setConsultation(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  placeholder="Any additional notes or recommendations..."
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedConsultationForm;
