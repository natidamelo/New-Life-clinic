import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  Search,
  ExternalLink,
  Shield,
  Info,
  Save,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  notes: string;
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  description: string;
  severity: string;
  interactionType: string;
}

interface AllergyAlert {
  medication: string;
  allergen: string;
  alertType: string;
  severity: string;
  description: string;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  allergies?: string[];
}

interface EnhancedPrescriptionFormProps {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}

const EnhancedPrescriptionForm: React.FC<EnhancedPrescriptionFormProps> = ({
  patient,
  onClose,
  onSuccess
}) => {
  const [medications, setMedications] = useState<Medication[]>([
    {
      name: '',
      dosage: '',
      frequency: '',
      duration: '7 days',
      route: 'Oral',
      notes: ''
    }
  ]);

  const [instructions, setInstructions] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([]);
  const [allergyAlerts, setAllergyAlerts] = useState<AllergyAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  // Common medication suggestions
  const commonMedications = [
    'Acetaminophen', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Azithromycin',
    'Metformin', 'Lisinopril', 'Atorvastatin', 'Omeprazole', 'Amlodipine'
  ];

  // Enhanced frequency options - Medical Grade
  const frequencyOptions = [
    // Standard Daily Frequencies
    'Once daily (QD)', 'Twice daily (BID)', 'Three times daily (TID)', 'Four times daily (QID)',
    'Five times daily', 'Six times daily',
    
    // Hourly Intervals
    'Every 1 hour', 'Every 2 hours', 'Every 3 hours', 'Every 4 hours',
    'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'Every 24 hours',
    
    // Meal-Related
    'Before meals (AC)', 'After meals (PC)', 'With meals', 'On empty stomach',
    '30 minutes before meals', '1 hour after meals',
    
    // Time-Specific
    'In the morning (AM)', 'In the evening (PM)', 'At bedtime (HS)', 'At noon',
    'Twice daily - morning and evening', 'Three times daily - with meals',
    
    // As Needed
    'As needed (PRN)', 'As needed for pain', 'As needed for fever', 'As needed for nausea',
    'As needed for anxiety', 'As needed for sleep',
    
    // Weekly Frequencies
    'Once weekly', 'Twice weekly', 'Three times weekly', 'Every other day',
    'Every 3 days', 'Every 4 days',
    
    // Monthly and Extended
    'Once monthly', 'Every 2 weeks', 'Every 3 weeks', 'Every 4 weeks',
    'Every 6 weeks', 'Every 8 weeks', 'Every 12 weeks',
    
    // Special Medical Frequencies
    'Continuous infusion', 'Bolus dose', 'Loading dose then maintenance', 'Tapering dose',
    'Pulse therapy', 'Cyclical therapy',
    
    // Emergency/Stat
    'Stat (immediately)', 'Emergency use only', 'Rescue medication', 'Breakthrough dose',
    
    // Monitoring/Follow-up
    'Until follow-up', 'Until symptoms resolve', 'Until lab values normalize',
    'Lifelong therapy', 'Ongoing as prescribed'
  ];

  // Enhanced duration options - Medical Grade
  const durationOptions = [
    // Short-term (Days)
    '1 day', '2 days', '3 days', '4 days', '5 days', '6 days', '7 days',
    '8 days', '9 days', '10 days', '11 days', '12 days', '13 days', '14 days',
    '15 days', '16 days', '17 days', '18 days', '19 days', '20 days', '21 days', '28 days',
    
    // Weekly durations
    '1 week', '2 weeks', '3 weeks', '4 weeks', '6 weeks', '8 weeks', '10 weeks', '12 weeks',
    
    // Monthly durations
    '1 month', '1.5 months', '2 months', '2.5 months', '3 months', '4 months', '5 months',
    '6 months', '7 months', '8 months', '9 months', '10 months', '11 months', '12 months',
    
    // Extended durations
    '18 months', '2 years', '2.5 years', '3 years', '4 years', '5 years',
    
    // Special medical durations
    'Single dose', 'One-time use', 'Loading dose only', 'Maintenance dose',
    'Tapering schedule', 'Cyclical therapy', 'Pulse therapy', 'Continuous therapy',
    
    // Condition-based durations
    'Until symptoms resolve', 'Until pain free', 'Until fever resolves', 'Until infection clears',
    'Until lab values normalize', 'Until blood pressure controlled', 'Until blood sugar controlled',
    'Until follow-up visit', 'Until next appointment', 'Until specialist consultation',
    
    // Chronic conditions
    'Lifelong therapy', 'Long-term maintenance', 'Chronic management', 'Ongoing treatment', 'Indefinite duration',
    
    // Emergency/Stat
    'Emergency use only', 'As needed for symptoms', 'PRN (as needed)', 'Breakthrough pain only', 'Rescue medication',
    
    // Follow-up based
    'Until follow-up', 'Until re-evaluation', 'Until next visit', 'Until specialist review',
    'Until treatment response', 'Until side effects resolve',
    
    // Custom durations
    'Custom duration', 'As directed by physician', 'Per protocol', 'According to guidelines', 'Based on response'
  ];

  // Route options
  const routeOptions = [
    'Oral', 'Topical', 'Injection', 'Intravenous', 'Intramuscular',
    'Sublingual', 'Rectal', 'Inhalation', 'Nasal', 'Ophthalmic'
  ];

  // Add new medication
  const addMedication = () => {
    setMedications([
      ...medications,
      {
        name: '',
        dosage: '',
        frequency: '',
        duration: '7 days',
        route: 'Oral',
        notes: ''
      }
    ]);
  };

  // Remove medication
  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  // Update medication
  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = medications.map((med, i) => 
      i === index ? { ...med, [field]: value } : med
    );
    setMedications(updated);
  };

  // Check for drug interactions and allergies
  const checkInteractionsAndAllergies = async () => {
    if (medications.filter(med => med.name).length < 1) return;

    setCheckingInteractions(true);
    try {
      // Check drug interactions
      const interactionResponse = await axios.post('/api/emr-prescriptions/check-interactions', {
        medications: medications.filter(med => med.name)
      });

      if (interactionResponse.data.success) {
        setDrugInteractions(interactionResponse.data.data.interactions || []);
      }

      // Check allergy alerts
      const allergyResponse = await axios.post('/api/emr-prescriptions/check-allergies', {
        patientId: patient._id,
        medications: medications.filter(med => med.name)
      });

      if (allergyResponse.data.success) {
        setAllergyAlerts(allergyResponse.data.data.alerts || []);
      }

      // Show alerts if any found
      if (interactionResponse.data.data.hasInteractions || allergyResponse.data.data.hasAlerts) {
        setShowAlerts(true);
      }
    } catch (error) {
      console.error('Error checking interactions and allergies:', error);
      toast.error('Failed to check drug interactions and allergies');
    } finally {
      setCheckingInteractions(false);
    }
  };

  // Auto-check interactions when medications change
  useEffect(() => {
    const timer = setTimeout(() => {
      checkInteractionsAndAllergies();
    }, 1000);

    return () => clearTimeout(timer);
  }, [medications]);

  // Submit prescription
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const validMedications = medications.filter(med => med.name && med.dosage && med.frequency);
    if (validMedications.length === 0) {
      toast.error('Please add at least one complete medication');
      return;
    }

    // Check for critical alerts
    const criticalAlerts = [...drugInteractions.filter(di => di.severity === 'severe'), ...allergyAlerts];
    if (criticalAlerts.length > 0 && !confirm('Critical alerts detected. Do you want to proceed?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/emr-prescriptions/create-enhanced', {
        patientId: patient._id,
        medications: validMedications,
        diagnosis,
        instructions
      });

      if (response.data.success) {
        toast.success('Prescription created successfully');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'severe':
      case 'critical':
        return 'border-destructive bg-destructive/10 text-destructive';
      case 'moderate':
        return 'border-yellow-500 bg-accent/10 text-accent-foreground';
      case 'mild':
        return 'border-primary bg-primary/10 text-primary';
      default:
        return 'border-border bg-muted/10 text-muted-foreground';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-primary-foreground rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-muted-foreground">Enhanced Prescription Form</h2>
            <p className="text-muted-foreground">
              Patient: {patient.firstName} {patient.lastName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground/50 hover:text-muted-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Patient Allergies Alert */}
        {patient.allergies && patient.allergies.length > 0 && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="font-medium text-destructive">Patient Allergies</h3>
            </div>
            <p className="text-destructive">
              {patient.allergies.join(', ')}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Diagnosis
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter diagnosis..."
            />
          </div>

          {/* Medications */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-muted-foreground">Medications</h3>
              <button
                type="button"
                onClick={addMedication}
                className="flex items-center gap-2 px-3 py-1 text-primary border border-primary rounded-md hover:bg-primary/10"
              >
                <Plus className="w-4 h-4" />
                Add Medication
              </button>
            </div>

            <div className="space-y-4">
              {medications.map((medication, index) => (
                <div key={index} className="p-4 border border-border/30 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium text-muted-foreground">Medication {index + 1}</h4>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Medication Name */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Medication Name *
                      </label>
                      <input
                        type="text"
                        value={medication.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        list={`medications-${index}`}
                        className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter medication name..."
                        required
                      />
                      <datalist id={`medications-${index}`}>
                        {commonMedications.map(med => (
                          <option key={med} value={med} />
                        ))}
                      </datalist>
                    </div>

                    {/* Dosage */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Dosage *
                      </label>
                      <input
                        type="text"
                        value={medication.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 500mg, 1 tablet"
                        required
                      />
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Frequency *
                      </label>
                      <select
                        value={medication.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select frequency</option>
                        {frequencyOptions.map(freq => (
                          <option key={freq} value={freq}>{freq}</option>
                        ))}
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Duration *
                      </label>
                      <select
                        value={medication.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select duration</option>
                        {durationOptions.map(duration => (
                          <option key={duration} value={duration}>{duration}</option>
                        ))}
                      </select>
                    </div>

                    {/* Route */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Route
                      </label>
                      <select
                        value={medication.route}
                        onChange={(e) => updateMedication(index, 'route', e.target.value)}
                        className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {routeOptions.map(route => (
                          <option key={route} value={route}>{route}</option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={medication.notes}
                        onChange={(e) => updateMedication(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Additional Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter any additional instructions for the patient..."
            />
          </div>

          {/* Drug Interactions and Allergy Alerts */}
          {(drugInteractions.length > 0 || allergyAlerts.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent-foreground" />
                <h3 className="text-lg font-medium text-muted-foreground">Clinical Alerts</h3>
              </div>

              {/* Drug Interactions */}
              {drugInteractions.length > 0 && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Drug Interactions</h4>
                  <div className="space-y-2">
                    {drugInteractions.map((interaction, index) => (
                      <div key={index} className={`p-3 border rounded-md ${getSeverityColor(interaction.severity)}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4" />
                          <strong>{interaction.drug1} ↔ {interaction.drug2}</strong>
                          <span className="text-xs px-2 py-1 bg-primary-foreground rounded-full">
                            {interaction.severity}
                          </span>
                        </div>
                        <p className="text-sm">{interaction.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergy Alerts */}
              {allergyAlerts.length > 0 && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Allergy Alerts</h4>
                  <div className="space-y-2">
                    {allergyAlerts.map((alert, index) => (
                      <div key={index} className={`p-3 border rounded-md ${getSeverityColor(alert.severity)}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4" />
                          <strong>{alert.medication} - {alert.allergen}</strong>
                          <span className="text-xs px-2 py-1 bg-primary-foreground rounded-full">
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm">{alert.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex items-center gap-2">
              {checkingInteractions && (
                <div className="flex items-center gap-2 text-primary">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Checking interactions...</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || checkingInteractions}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Create Prescription
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedPrescriptionForm;
