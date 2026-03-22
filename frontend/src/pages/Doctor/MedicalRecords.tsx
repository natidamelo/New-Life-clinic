import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  FileText, 
  Stethoscope, 
  Pill, 
  Activity,
  Plus,
  Edit,
  Save,
  X
} from 'lucide-react';
import api from '../../services/apiService';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface VitalSigns {
  temperature?: string;
  bloodPressure?: string;
  heartRate?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  timestamp?: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescribedDate: string;
  status: string;
}

interface MedicalRecord {
  id: string;
  patientId: string;
  visitDate: string;
  chiefComplaint: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  doctorId: string;
  doctorName: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientId: string;
  age: number;
  gender: string;
  contactNumber: string;
  email: string;
  vitals?: VitalSigns;
  medicalHistory: string[];
  allergies: string[];
}

const MedicalRecords: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newRecord, setNewRecord] = useState({
    chiefComplaint: '',
    diagnosis: '',
    treatment: '',
    notes: ''
  });

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
      fetchMedicalRecords();
      fetchPrescriptions();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      const response = await api.get(`/api/patients/${patientId}`);
      setPatient(response.data.data);
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast.error('Failed to load patient data');
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const response = await api.get(`/api/medical-records/patient/${patientId}`);
      setMedicalRecords(response.data.data || []);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      // Don't show error toast as records might not exist yet
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const response = await api.get(`/api/prescriptions/patient/${patientId}`);
      setPrescriptions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      // Don't show error toast as prescriptions might not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecord = async () => {
    try {
      const response = await api.post('/api/medical-records', {
        patient: patientId,
        doctor: user?.id || user?._id || '',
        chiefComplaint: {
          description: newRecord.chiefComplaint,
          duration: '1 day',
          severity: 'Moderate',
          onsetPattern: 'Gradual',
          progression: 'Stable',
          impactOnDailyLife: 'Mild',
          location: '',
          aggravatingFactors: [],
          relievingFactors: [],
          associatedSymptoms: [],
          previousEpisodes: false,
          previousEpisodesDetails: '',
          recordedBy: user?.id || user?._id || '',
          recordedAt: new Date()
        },
        diagnosis: newRecord.diagnosis,
        plan: newRecord.treatment,
        notes: newRecord.notes
      });
      
      toast.success('Medical record saved successfully');
      setNewRecord({
        chiefComplaint: '',
        diagnosis: '',
        treatment: '',
        notes: ''
      });
      setIsEditing(false);
      fetchMedicalRecords();
    } catch (error) {
      console.error('Error saving medical record:', error);
      toast.error('Failed to save medical record');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-primary/20 text-primary';
      case 'completed':
        return 'bg-primary/20 text-primary';
      case 'discontinued':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
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
        <Button onClick={() => navigate('/app/doctor/consultations')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Consultations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/app/doctor/consultations')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Medical Records
            </h1>
            <p className="text-muted-foreground">
              {patient.firstName} {patient.lastName} - {patient.patientId}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* Patient Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label className="text-sm font-medium text-muted-foreground">Contact</Label>
              <p className="text-lg font-semibold">{patient.contactNumber}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p className="text-lg font-semibold">{patient.email || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Medical History</Label>
              <p className="text-sm">{patient.medicalHistory?.length || 0} conditions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vital Signs */}
      {patient.vitals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Temperature</Label>
                <p className="text-lg font-semibold">{patient.vitals.temperature || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Blood Pressure</Label>
                <p className="text-lg font-semibold">{patient.vitals.bloodPressure || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Heart Rate</Label>
                <p className="text-lg font-semibold">{patient.vitals.heartRate || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Respiratory Rate</Label>
                <p className="text-lg font-semibold">{patient.vitals.respiratoryRate || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">O2 Saturation</Label>
                <p className="text-lg font-semibold">{patient.vitals.oxygenSaturation || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Record Modal */}
      {isEditing && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Edit className="h-5 w-5 mr-2" />
                Add New Medical Record
              </span>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <Input
                id="chiefComplaint"
                value={newRecord.chiefComplaint}
                onChange={(e) => setNewRecord({...newRecord, chiefComplaint: e.target.value})}
                placeholder="Patient's main complaint"
              />
            </div>
            <div>
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input
                id="diagnosis"
                value={newRecord.diagnosis}
                onChange={(e) => setNewRecord({...newRecord, diagnosis: e.target.value})}
                placeholder="Medical diagnosis"
              />
            </div>
            <div>
              <Label htmlFor="treatment">Treatment</Label>
              <Input
                id="treatment"
                value={newRecord.treatment}
                onChange={(e) => setNewRecord({...newRecord, treatment: e.target.value})}
                placeholder="Treatment plan"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newRecord.notes}
                onChange={(e) => setNewRecord({...newRecord, notes: e.target.value})}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleSaveRecord}>
                <Save className="h-4 w-4 mr-2" />
                Save Record
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Records and Prescriptions */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Medical Records ({medicalRecords.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center">
            <Pill className="h-4 w-4 mr-2" />
            Prescriptions ({prescriptions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          {medicalRecords.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No medical records found</p>
                <p className="text-sm text-muted-foreground/50">Add a new record to get started</p>
              </CardContent>
            </Card>
          ) : (
            medicalRecords.map((record) => (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(record.visitDate).toLocaleDateString()}
                    </CardTitle>
                    <Badge variant="outline">Dr. {record.doctorName}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Chief Complaint</Label>
                    <p className="text-sm">{record.chiefComplaint ? (typeof record.chiefComplaint === 'object' ? ((record.chiefComplaint as any)?.description || 'N/A') : record.chiefComplaint) : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Diagnosis</Label>
                    <p className="text-sm">{record.diagnosis || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Treatment</Label>
                    <p className="text-sm">{record.treatment || 'N/A'}</p>
                  </div>
                  {record.notes && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                      <p className="text-sm">{record.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4">
          {prescriptions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Pill className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No prescriptions found</p>
                <p className="text-sm text-muted-foreground/50">Prescriptions will appear here when created</p>
              </CardContent>
            </Card>
          ) : (
            prescriptions.map((prescription) => (
              <Card key={prescription.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Pill className="h-4 w-4 mr-2" />
                      {prescription.medication}
                    </CardTitle>
                    <Badge className={getStatusColor(prescription.status)}>
                      {prescription.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Dosage</Label>
                      <p className="text-sm">{prescription.dosage}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Frequency</Label>
                      <p className="text-sm">{prescription.frequency}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                      <p className="text-sm">{prescription.duration}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Prescribed</Label>
                      <p className="text-sm">{new Date(prescription.prescribedDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Instructions</Label>
                    <p className="text-sm">{prescription.instructions}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedicalRecords; 