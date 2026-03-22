import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  ArrowLeft, 
  User, 
  Save, 
  Send,
  FileText,
  Pill,
  Activity,
  Clock,
  Plus
} from 'lucide-react';
import api from '../../services/apiService';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientId: string;
  age: number;
  gender: string;
  vitals?: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
  };
}

interface ConsultationForm {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  physicalExamination: string;
  diagnosis: string;
  treatmentPlan: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  followUpDate: string;
  notes: string;
}

const ConsultationForm: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [consultation, setConsultation] = useState<ConsultationForm>({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    physicalExamination: '',
    diagnosis: '',
    treatmentPlan: '',
    medications: [],
    followUpDate: '',
    notes: ''
  });

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      console.log(`[CONSULTATION FORM] Fetching patient with ID: ${patientId}`);
      const response = await api.get(`/api/patients/${patientId}`);
      console.log(`[CONSULTATION FORM] Patient response:`, response.data);
      
      // Handle different response structures
      const patientData = response.data.data || response.data;
      console.log(`[CONSULTATION FORM] Patient data:`, patientData);
      
      if (!patientData) {
        throw new Error('No patient data received');
      }
      
      // Ensure the patient data has the required fields
      const formattedPatient = {
        id: patientData._id || patientData.id,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        patientId: patientData.patientId,
        age: patientData.age,
        gender: patientData.gender,
        vitals: patientData.vitals
      };
      
      console.log(`[CONSULTATION FORM] Formatted patient:`, formattedPatient);
      setPatient(formattedPatient);
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast.error('Failed to load patient data');
    } finally {
      setIsLoading(false);
    }
  };

  const addMedication = () => {
    setConsultation(prev => ({
      ...prev,
      medications: [...prev.medications, {
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      }]
    }));
  };

  const updateMedication = (index: number, field: string, value: string) => {
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

  const handleSaveConsultation = async () => {
    if (!consultation.chiefComplaint || !consultation.diagnosis) {
      toast.error('Please fill in chief complaint and diagnosis');
      return;
    }

    setIsSaving(true);
    try {
      // Save medical record using the existing API structure
      await api.post('/api/medical-records', {
        patient: patientId,
        doctor: user?.id || user?._id,
        chiefComplaint: {
          description: consultation.chiefComplaint,
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
          recordedBy: user?.id || user?._id,
          recordedAt: new Date()
        },
        diagnosis: consultation.diagnosis,
        plan: consultation.treatmentPlan,
        notes: consultation.notes,
        historyOfPresentIllness: consultation.historyOfPresentIllness,
        physicalExam: consultation.physicalExamination
      });

      // Save prescriptions if any medications
      if (consultation.medications.length > 0) {
        const medications = consultation.medications
          .filter(med => med.name && med.dosage)
          .map(med => ({
            medication: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            route: 'Oral',
            quantity: 1,
            nurseInstructions: med.instructions
          }));

        if (medications.length > 0) {
          await api.post('/api/prescriptions', {
            patientId,
            doctorId: user?.id || user?._id,
            medications,
            duration: consultation.medications[0]?.duration || '7 days',
            notes: consultation.notes,
            status: 'Active',
            sendToNurse: true,
            instructions: consultation.notes
          });
        }
      }

      // Update patient status to completed
      await api.patch(`/api/patients/${patientId}`, {
        status: 'completed'
      });

      toast.success('Consultation completed successfully');
      navigate('/app/doctor/consultations');
    } catch (error) {
      console.error('Error saving consultation:', error);
      toast.error('Failed to save consultation');
    } finally {
      setIsSaving(false);
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
        <p className="text-sm text-muted-foreground/50 mt-2">Patient ID: {patientId}</p>
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
              Consultation Form
            </h1>
            <p className="text-muted-foreground">
              {patient.firstName} {patient.lastName} - {patient.patientId}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate(`/app/doctor/medical-records/${patientId}`)}>
            <FileText className="h-4 w-4 mr-2" />
            View Records
          </Button>
          <Button onClick={handleSaveConsultation} disabled={isSaving}>
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Complete Consultation
          </Button>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Consultation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chief Complaint</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={consultation.chiefComplaint}
                onChange={(e) => setConsultation({...consultation, chiefComplaint: e.target.value})}
                placeholder="Patient's main complaint..."
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History of Present Illness</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={consultation.historyOfPresentIllness}
                onChange={(e) => setConsultation({...consultation, historyOfPresentIllness: e.target.value})}
                placeholder="Detailed history of the current illness..."
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Physical Examination</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={consultation.physicalExamination}
                onChange={(e) => setConsultation({...consultation, physicalExamination: e.target.value})}
                placeholder="Physical examination findings..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Diagnosis</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={consultation.diagnosis}
                onChange={(e) => setConsultation({...consultation, diagnosis: e.target.value})}
                placeholder="Medical diagnosis..."
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Treatment Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={consultation.treatmentPlan}
                onChange={(e) => setConsultation({...consultation, treatmentPlan: e.target.value})}
                placeholder="Treatment plan and recommendations..."
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Pill className="h-4 w-4 mr-2" />
                  Medications
                </span>
                <Button variant="outline" size="sm" onClick={addMedication}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medication
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {consultation.medications.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No medications added</p>
              ) : (
                consultation.medications.map((medication, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Medication {index + 1}</h4>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeMedication(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Medication Name</Label>
                        <Input
                          value={medication.name}
                          onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          placeholder="e.g., Amoxicillin"
                          className="fade-placeholder"
                        />
                      </div>
                      <div>
                        <Label>Dosage</Label>
                        <Input
                          value={medication.dosage}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          placeholder="e.g., 500mg"
                          className="fade-placeholder"
                        />
                      </div>
                      <div>
                        <Label>Frequency</Label>
                        <Input
                          value={medication.frequency}
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          placeholder="e.g., Twice daily"
                          className="fade-placeholder"
                        />
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <Input
                          value={medication.duration}
                          onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                          placeholder="e.g., 7 days"
                          className="fade-placeholder"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Instructions</Label>
                      <Textarea
                        value={medication.instructions}
                        onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                        placeholder="Special instructions..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={consultation.followUpDate}
                onChange={(e) => setConsultation({...consultation, followUpDate: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={consultation.notes}
              onChange={(e) => setConsultation({...consultation, notes: e.target.value})}
              placeholder="Any additional notes or observations..."
              rows={4}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsultationForm; 