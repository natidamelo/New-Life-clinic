import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  ClipboardList,
  CheckCircle, 
  X, 
  ChevronRight,
  Search,
  Download,
  Clock,
  ArrowRight,
  Plus,
  Thermometer,
  Heart,
  Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface HistoryTakingFormProps {
  patientId?: string;
  patientName?: string;
  onSubmit?: (data: any) => void;
  onClose?: () => void;
  onSave?: () => void;
}

// Common complaints and their associated potential diagnoses
const complaintDiagnosisMap: Record<string, string[]> = {
  'Headache': ['Migraine', 'Tension headache', 'Cluster headache', 'Sinusitis', 'Hypertension'],
  'Fever': ['Viral infection', 'Bacterial infection', 'COVID-19', 'Influenza', 'Malaria'],
  'Cough': ['Upper respiratory infection', 'Bronchitis', 'Pneumonia', 'Asthma', 'COVID-19'],
  'Chest Pain': ['Angina', 'Myocardial infarction', 'Costochondritis', 'GERD', 'Pulmonary embolism'],
  'Abdominal Pain': ['Gastritis', 'Appendicitis', 'Cholecystitis', 'Irritable bowel syndrome', 'Pancreatitis'],
  'Sore Throat': ['Pharyngitis', 'Tonsillitis', 'Laryngitis', 'Strep throat', 'Viral infection'],
  'Difficulty Breathing': ['Asthma', 'COPD', 'Pneumonia', 'Pulmonary embolism', 'Heart failure'],
  'Back Pain': ['Muscle strain', 'Herniated disc', 'Spinal stenosis', 'Arthritis', 'Kidney infection'],
  'Dizziness': ['Vertigo', 'Hypotension', 'Anemia', 'Dehydration', 'Inner ear infection'],
};

// Add new complaint types
const complaintTypes = {
  onsetPatterns: ['Acute', 'Subacute', 'Chronic', 'Gradual', 'Sudden'],
  progressionTypes: ['Improving', 'Stable', 'Worsening', 'Fluctuating'],
  severityLevels: ['Mild', 'Moderate', 'Severe', 'Very Severe'],
  impactLevels: ['None', 'Mild', 'Moderate', 'Severe']
};

const HistoryTakingForm: React.FC<HistoryTakingFormProps> = ({ 
  patientId = '', 
  patientName = 'Patient', 
  onSubmit,
  onClose,
  onSave
}: HistoryTakingFormProps) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm();
  
  // Field arrays for dynamic fields
  const { fields: aggravatingFields, append: appendAggravating, remove: removeAggravating } = useFieldArray({
    control,
    name: 'chiefComplaint.aggravatingFactors'
  });
  
  const { fields: relievingFields, append: appendRelieving, remove: removeRelieving } = useFieldArray({
    control,
    name: 'chiefComplaint.relievingFactors'
  });
  
  const { fields: symptomsFields, append: appendSymptom, remove: removeSymptom } = useFieldArray({
    control,
    name: 'chiefComplaint.associatedSymptoms'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [suggestedDiagnoses, setSuggestedDiagnoses] = useState<string[]>([]);

  // Watch the chief complaint field to suggest diagnoses
  const chiefComplaint = watch('chiefComplaint');

  // Suggest diagnoses based on chief complaint
  useEffect(() => {
    if (chiefComplaint && typeof chiefComplaint === 'string') {
      const possibleDiagnoses = findPossibleDiagnoses(chiefComplaint);
      setSuggestedDiagnoses(possibleDiagnoses);
    } else {
      setSuggestedDiagnoses([]);
    }
  }, [chiefComplaint]);

  // Function to find possible diagnoses based on complaint text
  const findPossibleDiagnoses = (complaintText: string): string[] => {
    const diagnoses = new Set<string>();
    
    // Check if the complaint text contains any of our known complaints
    Object.entries(complaintDiagnosisMap).forEach(([complaint, relatedDiagnoses]) => {
      if (complaintText.toLowerCase().includes(complaint.toLowerCase())) {
        relatedDiagnoses.forEach(diagnosis => diagnoses.add(diagnosis));
      }
    });
    
    return Array.from(diagnoses).slice(0, 5); // Return top 5 diagnoses
  };

  // Load vital signs data from localStorage when the component mounts
  useEffect(() => {
    try {
      // Get doctor appointments from localStorage
      const doctorAppointmentsStr = localStorage.getItem('doctorAppointments');
      if (doctorAppointmentsStr) {
        const doctorAppointments = JSON.parse(doctorAppointmentsStr);
        
        // Find the appointment for this patient
        const patientAppointment = doctorAppointments.find(
          (apt: any) => apt.patientId === patientId || apt.patientName === patientName
        );
        
        // If we found an appointment with vital signs, set the form values
        if (patientAppointment && patientAppointment.vitals) {
          console.log('Found vital signs for patient:', patientName, patientAppointment.vitals);
          
          // Set vital signs form values
          setValue('temperature', patientAppointment.vitals.temperature || '');
          setValue('bloodPressure', patientAppointment.vitals.bloodPressure || '');
          setValue('heartRate', patientAppointment.vitals.heartRate || '');
          setValue('respiratoryRate', patientAppointment.vitals.respiratoryRate || '');
          
          // Notify the user that we've populated the vitals
          toast('Vital signs loaded from nurse assessment');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [patientId, patientName, setValue]);

  // Medical terms for search
  const medicalTerms = [
    'Hypertension', 'Diabetes Mellitus', 'Hyperlipidemia', 'Asthma',
    'Chronic Obstructive Pulmonary Disease', 'Coronary Artery Disease',
    'Congestive Heart Failure', 'Osteoarthritis', 'Rheumatoid Arthritis'
  ];

  // Define the steps for form navigation
  const steps = [
    { id: 'vitals', title: 'Vital Signs', description: 'Basic health measurements' },
    { id: 'complaint', title: 'Chief Complaint', description: "The main reason for today's visit" },
    { id: 'review', title: 'Review of Systems', description: 'Overall health assessment' }, // Moved up
    { id: 'history', title: 'History of Present Illness', description: 'Details about the current health issue' },
    { id: 'imaging', title: 'Imaging', description: 'Diagnostic imaging results' }, // Added imaging step
    { id: 'medical', title: 'Past Medical History', description: 'Medical conditions and treatments' },
    { id: 'family', title: 'Family History', description: 'Medical conditions in family members' },
    { id: 'social', title: 'Social History', description: 'Lifestyle and habits' },
  ];

  const onSubmitForm = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Format chief complaint with onset and duration if provided
      if (data.chiefComplaint && (data.complaintOnset || data.complaintDuration)) {
        let formattedComplaint = data.chiefComplaint;
        
        // Add onset and duration information
        const onsetDurationInfo = [];
        if (data.complaintOnset) onsetDurationInfo.push(`Onset: ${data.complaintOnset}`);
        if (data.complaintDuration) onsetDurationInfo.push(`Duration: ${data.complaintDuration}`);
        
        if (onsetDurationInfo.length > 0) {
          formattedComplaint += `\n\n${onsetDurationInfo.join(', ')}`;
        }
        
        // Update the data object with the formatted complaint
        data.chiefComplaint = formattedComplaint;
      }
      
      // Save to localStorage if API call not available
      try {
        localStorage.setItem(`patientHistory_${patientId}`, JSON.stringify({
          data,
          timestamp: new Date().toISOString(),
          patientId
        }));
      } catch (err) {
        console.error('Error saving to localStorage:', err);
      }

      // Call the provided handlers
      if (onSubmit) {
      await onSubmit(data);
      }
      
      if (onSave) {
        onSave();
      }
      
      toast.success('History form submitted successfully');
      if (onClose) onClose();
    } catch (error) {
      toast.error('Failed to submit history form');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to go to next step
  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  // Function to go to previous step
  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  // Function to handle medical term selection
  const handleMedicalTermSelect = (term: string) => {
    // Add term to appropriate field based on current step
    if (activeStep === 1) { // Chief complaint
      setValue('chiefComplaint', term);
    } else if (activeStep === 3) { // Medical history
      setValue('pastMedicalHistory', 
        (document.getElementById('pastMedicalHistory') as HTMLTextAreaElement)?.value + (
          (document.getElementById('pastMedicalHistory') as HTMLTextAreaElement)?.value ? ', ' : ''
        ) + term
      );
    }
    setShowSearchResults(false);
  };

  // Define ROS categories outside the switch statement
  const rosCategories = [
    {
      id: 'constitutional',
      name: 'Constitutional',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      gradient: 'from-gray-50 to-blue-gray-50',
      borderColor: 'border-border/20',
      findings: ['Fever', 'Chills', 'Weight change', 'Fatigue', 'Night sweats']
    },
    {
      id: 'heent',
      name: 'HEENT',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      gradient: 'from-teal-50 to-cyan-50',
      borderColor: 'border-teal-100',
      findings: ['Headache', 'Vision changes', 'Eye pain/redness', 'Hearing loss', 'Tinnitus', 'Nasal congestion', 'Sore throat', 'Hoarseness']
    },
    {
      id: 'cvs',
      name: 'Cardiovascular',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      gradient: 'from-red-50 to-rose-50',
      borderColor: 'border-destructive/20',
      findings: ['Chest pain', 'Palpitations', 'Shortness of breath', 'Orthopnea', 'PND', 'Edema', 'Claudication']
    },
    {
      id: 'respiratory',
      name: 'Respiratory (Chest)',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      gradient: 'from-blue-50 to-sky-50',
      borderColor: 'border-primary/20',
      findings: ['Cough', 'Sputum production', 'Hemoptysis', 'Wheezing', 'Dyspnea', 'Pleuritic chest pain']
    },
    {
      id: 'gastrointestinal',
      name: 'Gastrointestinal (Abdomen)',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: 'from-orange-50 to-amber-50',
      borderColor: 'border-orange-100',
      findings: ['Abdominal pain', 'Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Heartburn', 'Bloating', 'Hematemesis', 'Melena', 'Jaundice']
    },
    {
      id: 'musculoskeletal',
      name: 'Musculoskeletal (Extremities)',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      gradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-primary/20',
      findings: ['Joint pain/swelling', 'Muscle pain/weakness', 'Back pain', 'Limited range of motion', 'Stiffness']
    },
    {
      id: 'neurological',
      name: 'Neurological',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-purple-50 to-fuchsia-50',
      borderColor: 'border-secondary/20',
      findings: ['Dizziness', 'Syncope', 'Seizures', 'Weakness', 'Numbness/tingling', 'Tremors', 'Memory loss']
    },
    {
      id: 'skin',
      name: 'Skin',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.75 12c0-3.517 1.009-6.799 2.753-9.571m-3.44 2.04l-.054.09A13.916 13.916 0 0116 11a4 4 0 11-8 0c0-1.017.07-2.019.203-3m2.118-6.844A21.88 21.88 0 018.25 12z" />
        </svg>
      ),
      gradient: 'from-yellow-50 to-amber-50',
      borderColor: 'border-yellow-100',
      findings: ['Rash', 'Itching', 'Dryness', 'Lesions', 'Hair loss', 'Nail changes']
    },
  ];

  // Render content based on the active step
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Vital Signs
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-muted-foreground mb-4">Vital Signs</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-xl shadow-sm border border-orange-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-accent/20 p-1.5 rounded-full">
                    <Thermometer className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Temperature</label>
                </div>
                <input
                  type="text"
                  {...register('temperature', { required: true })}
                  placeholder="98.6°F"
                  className="w-full rounded-lg border-orange-200 bg-primary-foreground/80 text-lg focus:border-orange-400 focus:ring-orange-300"
                />
                {errors.temperature && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-pink-50 p-5 rounded-xl shadow-sm border border-destructive/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-destructive/20 p-1.5 rounded-full">
                    <Heart className="h-5 w-5 text-destructive" />
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Blood Pressure</label>
                </div>
                <input
                  type="text"
                  {...register('bloodPressure', { required: true })}
                  placeholder="120/80 mmHg"
                  className="w-full rounded-lg border-destructive/30 bg-primary-foreground/80 text-lg focus:border-destructive/50 focus:ring-red-300"
                />
                {errors.bloodPressure && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl shadow-sm border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary/20 p-1.5 rounded-full">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Heart Rate</label>
                </div>
                <input
                  type="text"
                  {...register('heartRate', { required: true })}
                  placeholder="72 bpm"
                  className="w-full rounded-lg border-primary/30 bg-primary-foreground/80 text-lg focus:border-primary/50 focus:ring-blue-300"
                />
                {errors.heartRate && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-5 rounded-xl shadow-sm border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary/20 p-1.5 rounded-full">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Respiratory Rate</label>
                </div>
                <input
                  type="text"
                  {...register('respiratoryRate', { required: true })}
                  placeholder="16/min"
                  className="w-full rounded-lg border-primary/30 bg-primary-foreground/80 text-lg focus:border-primary/50 focus:ring-green-300"
                />
                {errors.respiratoryRate && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
            </div>

            <div className="flex items-center justify-center mt-4">
              <div className="bg-secondary/10 px-4 py-2 rounded-lg border border-secondary/20 flex items-center">
                <span className="text-xs text-secondary-foreground italic mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  These vital signs were recorded by the nurse
                </span>
              </div>
            </div>
          </div>
        );
      case 1: // Chief Complaint
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-muted-foreground mb-4">Chief Complaint</h3>
            
            <div className="space-y-5">
              <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                <label className="block text-sm font-medium text-muted-foreground mb-3">
                  What is the main reason for today's visit?
                </label>
                <textarea
                  {...register('chiefComplaint.description', { required: true })}
                  id="chiefComplaint"
                  rows={4}
                  className="w-full rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300 transition-all duration-200"
                  placeholder="Describe the primary symptom or concern"
                ></textarea>
                {errors.chiefComplaint && (
                  <p className="text-destructive text-xs mt-1">Required</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                <label className="block text-sm font-medium text-muted-foreground mb-3">
                    Duration
                </label>
                  <input
                    type="text"
                    {...register('chiefComplaint.duration', { required: true })}
                    className="w-full rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300 fade-placeholder"
                    placeholder="e.g., 3 days, 2 weeks"
                  />
                  {errors['chiefComplaint.duration'] && (
                    <p className="text-destructive text-xs mt-1">Required</p>
                  )}
                </div>

                <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                  <label className="block text-sm font-medium text-muted-foreground mb-3">
                    Severity
                  </label>
                  <select
                    {...register('chiefComplaint.severity', { required: true })}
                    className="w-full rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300"
                  >
                    <option value="">Select severity</option>
                    {complaintTypes.severityLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                  ))}
                  </select>
                  {errors['chiefComplaint.severity'] && (
                    <p className="text-destructive text-xs mt-1">Required</p>
                  )}
              </div>
              
                <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                  <label className="block text-sm font-medium text-muted-foreground mb-3">
                    Onset Pattern
                  </label>
                  <select
                    {...register('chiefComplaint.onsetPattern', { required: true })}
                    className="w-full rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300"
                  >
                    <option value="">Select onset pattern</option>
                    {complaintTypes.onsetPatterns.map(pattern => (
                      <option key={pattern} value={pattern}>{pattern}</option>
                    ))}
                  </select>
                  {errors['chiefComplaint.onsetPattern'] && (
                    <p className="text-destructive text-xs mt-1">Required</p>
                  )}
                </div>

                <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                  <label className="block text-sm font-medium text-muted-foreground mb-3">
                    Progression
                  </label>
                  <select
                    {...register('chiefComplaint.progression', { required: true })}
                    className="w-full rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300"
                  >
                    <option value="">Select progression</option>
                    {complaintTypes.progressionTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors['chiefComplaint.progression'] && (
                    <p className="text-destructive text-xs mt-1">Required</p>
                  )}
                </div>
                </div>
                
              <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                <label className="block text-sm font-medium text-muted-foreground mb-3">
                  Location
                </label>
                <input
                  type="text"
                  {...register('chiefComplaint.location')}
                  className="w-full rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300 fade-placeholder"
                  placeholder="e.g., Right upper quadrant, Left knee"
                />
              </div>

              <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                <label className="block text-sm font-medium text-muted-foreground mb-3">
                  Impact on Daily Life
                </label>
                  <select
                  {...register('chiefComplaint.impactOnDailyLife', { required: true })}
                    className="w-full rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300"
                  >
                  <option value="">Select impact level</option>
                  {complaintTypes.impactLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                  </select>
                {errors['chiefComplaint.impactOnDailyLife'] && (
                  <p className="text-destructive text-xs mt-1">Required</p>
                )}
                </div>

              <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                <label className="block text-sm font-medium text-muted-foreground mb-3">
                  Aggravating Factors
                </label>
                <div className="space-y-2">
                  {aggravatingFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <input
                        {...register(`chiefComplaint.aggravatingFactors.${index}`)}
                        className="flex-1 rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300 fade-placeholder"
                        placeholder="e.g., Movement, Eating"
                      />
                      <button
                        type="button"
                        onClick={() => removeAggravating(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => appendAggravating('')}
                    className="text-secondary-foreground hover:text-secondary-foreground"
                  >
                    + Add Factor
                  </button>
                </div>
              </div>

              <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                <label className="block text-sm font-medium text-muted-foreground mb-3">
                  Relieving Factors
                </label>
                <div className="space-y-2">
                  {relievingFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <input
                        {...register(`chiefComplaint.relievingFactors.${index}`)}
                        className="flex-1 rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300 fade-placeholder"
                        placeholder="e.g., Rest, Medication"
                      />
                      <button
                        type="button"
                        onClick={() => removeRelieving(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => appendRelieving('')}
                    className="text-secondary-foreground hover:text-secondary-foreground"
                  >
                    + Add Factor
                  </button>
                </div>
              </div>

              <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                <label className="block text-sm font-medium text-muted-foreground mb-3">
                  Associated Symptoms
                </label>
                <div className="space-y-2">
                  {symptomsFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <input
                        {...register(`chiefComplaint.associatedSymptoms.${index}`)}
                        className="flex-1 rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300 fade-placeholder"
                        placeholder="e.g., Nausea, Dizziness"
                      />
                      <button
                        type="button"
                        onClick={() => removeSymptom(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => appendSymptom('')}
                    className="text-secondary-foreground hover:text-secondary-foreground"
                  >
                    + Add Symptom
                  </button>
                </div>
              </div>

              <div className="bg-primary-foreground p-5 rounded-xl shadow-sm border border-border/20">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    {...register('chiefComplaint.previousEpisodes')}
                    className="rounded border-border/40 text-secondary-foreground focus:ring-purple-500"
                  />
                  <label className="ml-2 block text-sm font-medium text-muted-foreground">
                    Previous Episodes
                  </label>
                </div>
                {watch('chiefComplaint.previousEpisodes') && (
                  <textarea
                    {...register('chiefComplaint.previousEpisodesDetails')}
                    rows={3}
                    className="w-full rounded-lg border-border/40 focus:border-secondary/50 focus:ring-purple-300"
                    placeholder="Describe previous episodes"
                  />
                )}
              </div>
            </div>
          </div>
        );
      case 2: // Review of Systems (New Position)
        return (
          <div className="space-y-8">
            <h3 className="text-xl font-medium text-muted-foreground mb-4">Review of Systems</h3>
            <p className="text-sm text-muted-foreground -mt-6 mb-6">
              Document pertinent positive and negative findings for each system. Check items that are positive or abnormal.
            </p>
            
            {rosCategories.map((category) => (
              <div 
                key={category.id}
                className={`bg-gradient-to-br ${category.gradient} p-5 rounded-xl shadow-sm border ${category.borderColor}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-muted/20 p-1.5 rounded-full">
                    {category.icon}
                  </div>
                  <h4 className="text-md font-semibold text-muted-foreground">{category.name}</h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 mb-4">
                  {category.findings.map((finding) => (
                    <label key={finding} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register(`ros.${category.id}.${finding.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_')}`)}
                        className="rounded text-secondary-foreground focus:ring-purple-500 h-4 w-4 border-border/40"
                      />
                      <span className="text-sm text-muted-foreground">{finding}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Notes for {category.name}</label>
                  <textarea
                    {...register(`ros.${category.id}.notes`)}
                    rows={2}
                    className="w-full rounded-lg border-border/30 bg-primary-foreground/80 text-md focus:border-border/50 focus:ring-gray-300"
                    placeholder={`Enter specific details or findings for ${category.name}...`}
                  ></textarea>
                </div>
              </div>
            ))}

            <div className="bg-gradient-to-br from-gray-50 to-blue-gray-50 p-5 rounded-xl shadow-sm border border-border/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-muted/20 p-1.5 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-md font-semibold text-muted-foreground">Overall Assessment Notes</h4>
              </div>
              <textarea
                {...register('ros.overall_notes')}
                rows={3}
                className="w-full rounded-lg border-border/30 bg-primary-foreground/80 text-md focus:border-border/50 focus:ring-gray-300"
                placeholder="Summarize overall findings or add any other relevant ROS details..."
              ></textarea>
            </div>
          </div>
        );
      case 3: // History of Present Illness (New Position)
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-muted-foreground mb-4">History of Present Illness</h3>
            
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 p-5 rounded-xl shadow-sm border border-secondary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-secondary/20 p-1.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <label className="text-sm font-medium text-muted-foreground">Onset</label>
                  </div>
                  <select
                    {...register('onset', { required: true })}
                    className="w-full rounded-lg border-secondary/30 bg-primary-foreground/80 text-md focus:border-secondary/50 focus:ring-purple-300"
                  >
                    <option value="">Select onset type</option>
                    <option value="Sudden">Sudden</option>
                    <option value="Gradual">Gradual</option>
                    <option value="Chronic">Chronic</option>
                    <option value="Recurring">Recurring</option>
                    <option value="Progressive">Progressive</option>
                  </select>
                  {errors.onset && <p className="text-destructive text-xs mt-1">Required</p>}
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Time Frame</label>
                    <select
                      {...register('onsetTimeFrame')}
                      className="w-full rounded-lg border-secondary/30 bg-primary-foreground/80 text-md focus:border-secondary/50 focus:ring-purple-300"
                    >
                      <option value="">Select time frame</option>
                      <option value="Hours ago">Hours ago</option>
                      <option value="Today">Today</option>
                      <option value="Yesterday">Yesterday</option>
                      <option value="Days ago">Days ago</option>
                      <option value="Weeks ago">Weeks ago</option>
                      <option value="Months ago">Months ago</option>
                      <option value="Years ago">Years ago</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl shadow-sm border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-primary/20 p-1.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  </div>
                  <select
                    {...register('duration', { required: true })}
                    className="w-full rounded-lg border-primary/30 bg-primary-foreground/80 text-md focus:border-primary/50 focus:ring-blue-300"
                  >
                    <option value="">Select duration</option>
                    <option value="Minutes">Minutes</option>
                    <option value="Hours">Hours</option>
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                    <option value="Constant">Constant</option>
                    <option value="Intermittent">Intermittent</option>
                  </select>
                  {errors.duration && <p className="text-destructive text-xs mt-1">Required</p>}
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Pattern</label>
                    <select
                      {...register('durationPattern')}
                      className="w-full rounded-lg border-primary/30 bg-primary-foreground/80 text-md focus:border-primary/50 focus:ring-blue-300"
                    >
                      <option value="">Select pattern</option>
                      <option value="Continuous">Continuous</option>
                      <option value="Intermittent">Intermittent</option>
                      <option value="Episodic">Episodic</option>
                      <option value="Cyclical">Cyclical</option>
                      <option value="Worsening">Worsening</option>
                      <option value="Improving">Improving</option>
                      <option value="Stable">Stable</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-5 rounded-xl shadow-sm border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-accent/20 p-1.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                  </div>
                  <select
                    {...register('location', { required: true })}
                    className="w-full rounded-lg border-amber-200 bg-primary-foreground/80 text-md focus:border-amber-400 focus:ring-amber-300"
                  >
                    <option value="">Select body region</option>
                    <optgroup label="Head & Neck">
                      <option value="Head">Head</option>
                      <option value="Face">Face</option>
                      <option value="Eyes">Eyes</option>
                      <option value="Ears">Ears</option>
                      <option value="Nose">Nose</option>
                      <option value="Mouth">Mouth</option>
                      <option value="Throat">Throat</option>
                      <option value="Neck">Neck</option>
                    </optgroup>
                    <optgroup label="Trunk">
                      <option value="Chest">Chest</option>
                      <option value="Upper back">Upper back</option>
                      <option value="Lower back">Lower back</option>
                      <option value="Abdomen">Abdomen</option>
                      <option value="Pelvis">Pelvis</option>
                    </optgroup>
                    <optgroup label="Extremities">
                      <option value="Right arm">Right arm</option>
                      <option value="Left arm">Left arm</option>
                      <option value="Right leg">Right leg</option>
                      <option value="Left leg">Left leg</option>
                      <option value="Right hand">Right hand</option>
                      <option value="Left hand">Left hand</option>
                      <option value="Right foot">Right foot</option>
                      <option value="Left foot">Left foot</option>
                    </optgroup>
                    <optgroup label="Joints">
                      <option value="Shoulder">Shoulder</option>
                      <option value="Elbow">Elbow</option>
                      <option value="Wrist">Wrist</option>
                      <option value="Hip">Hip</option>
                      <option value="Knee">Knee</option>
                      <option value="Ankle">Ankle</option>
                    </optgroup>
                  </select>
                  {errors.location && <p className="text-destructive text-xs mt-1">Required</p>}
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Characteristics</label>
                    <select
                      {...register('locationCharacteristics')}
                      className="w-full rounded-lg border-amber-200 bg-primary-foreground/80 text-md focus:border-amber-400 focus:ring-amber-300"
                    >
                      <option value="">Select characteristics</option>
                      <option value="Localized">Localized</option>
                      <option value="Diffuse">Diffuse</option>
                      <option value="Radiating">Radiating</option>
                      <option value="Migrating">Migrating</option>
                      <option value="Bilateral">Bilateral</option>
                      <option value="Unilateral">Unilateral</option>
                      <option value="Superficial">Superficial</option>
                      <option value="Deep">Deep</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-rose-50 p-5 rounded-xl shadow-sm border border-destructive/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-destructive/20 p-1.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <label className="text-sm font-medium text-muted-foreground">Severity</label>
                  </div>
                  <select
                    {...register('severity', { required: true })}
                    className="w-full rounded-lg border-destructive/30 bg-primary-foreground/80 text-md focus:border-destructive/50 focus:ring-red-300"
                  >
                    <option value="">Select severity level</option>
                    <option value="Mild">Mild (1-3)</option>
                    <option value="Moderate">Moderate (4-6)</option>
                    <option value="Severe">Severe (7-9)</option>
                    <option value="Very Severe">Very Severe (10)</option>
                  </select>
                  {errors.severity && <p className="text-destructive text-xs mt-1">Required</p>}
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Quality</label>
                    <select
                      {...register('painQuality')}
                      className="w-full rounded-lg border-destructive/30 bg-primary-foreground/80 text-md focus:border-destructive/50 focus:ring-red-300"
                    >
                      <option value="">Describe quality</option>
                      <option value="Sharp">Sharp</option>
                      <option value="Dull">Dull</option>
                      <option value="Aching">Aching</option>
                      <option value="Burning">Burning</option>
                      <option value="Throbbing">Throbbing</option>
                      <option value="Stabbing">Stabbing</option>
                      <option value="Cramping">Cramping</option>
                      <option value="Pressure">Pressure</option>
                      <option value="Shooting">Shooting</option>
                      <option value="Tingling">Tingling</option>
                      <option value="Numb">Numb</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-xl shadow-sm border border-orange-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-accent/20 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Aggravating Factors</label>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Movement', 'Exercise', 'Stress', 'Food', 'Heat', 'Cold', 
                    'Lying down', 'Standing', 'Walking', 'Coughing', 'Deep breathing']
                    .map(factor => (
                      <button
                        key={factor}
                        type="button"
                        onClick={() => {
                          const currentValue = document.getElementById('aggravatingFactors') as HTMLTextAreaElement;
                          const newValue = currentValue.value 
                            ? `${currentValue.value}${currentValue.value.endsWith(',') || currentValue.value.endsWith(', ') ? ' ' : ', '}${factor}`
                            : factor;
                          setValue('aggravatingFactors', newValue);
                        }}
                        className="px-3 py-1.5 bg-primary-foreground hover:bg-accent/10 text-sm text-muted-foreground rounded-full border border-orange-200 transition-colors hover:border-orange-300 hover:text-accent-foreground hover:shadow-sm"
                      >
                        {factor}
                      </button>
                  ))}
                </div>
                
                <textarea
                  {...register('aggravatingFactors')}
                  id="aggravatingFactors"
                  rows={2}
                  className="w-full rounded-lg border-orange-200 bg-primary-foreground/80 text-md focus:border-orange-400 focus:ring-orange-300"
                  placeholder="What makes it worse?"
                ></textarea>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl shadow-sm border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary/20 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Relieving Factors</label>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Rest', 'Medication', 'Heat', 'Ice', 'Position change',
                    'Massage', 'Food', 'Sleep', 'Stretching', 'Deep breathing']
                    .map(factor => (
                      <button
                        key={factor}
                        type="button"
                        onClick={() => {
                          const currentValue = document.getElementById('relievingFactors') as HTMLTextAreaElement;
                          const newValue = currentValue.value 
                            ? `${currentValue.value}${currentValue.value.endsWith(',') || currentValue.value.endsWith(', ') ? ' ' : ', '}${factor}`
                            : factor;
                          setValue('relievingFactors', newValue);
                        }}
                        className="px-3 py-1.5 bg-primary-foreground hover:bg-primary/10 text-sm text-muted-foreground rounded-full border border-primary/30 transition-colors hover:border-primary/40 hover:text-primary hover:shadow-sm"
                      >
                        {factor}
                      </button>
                  ))}
                </div>
                
                <textarea
                  {...register('relievingFactors')}
                  id="relievingFactors"
                  rows={2}
                  className="w-full rounded-lg border-primary/30 bg-primary-foreground/80 text-md focus:border-primary/50 focus:ring-green-300"
                  placeholder="What makes it better?"
                ></textarea>
              </div>
              
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-5 rounded-xl shadow-sm border border-indigo-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-100 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Associated Symptoms</label>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Fever', 'Chills', 'Sweating', 'Nausea', 'Vomiting', 'Diarrhea', 
                    'Headache', 'Dizziness', 'Fatigue', 'Weight loss', 'Appetite change', 
                    'Shortness of breath', 'Palpitations', 'Swelling']
                    .map(symptom => (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => {
                          const currentValue = document.getElementById('associatedSymptoms') as HTMLTextAreaElement;
                          const newValue = currentValue.value 
                            ? `${currentValue.value}${currentValue.value.endsWith(',') || currentValue.value.endsWith(', ') ? ' ' : ', '}${symptom}`
                            : symptom;
                          setValue('associatedSymptoms', newValue);
                        }}
                        className="px-3 py-1.5 bg-primary-foreground hover:bg-indigo-50 text-sm text-muted-foreground rounded-full border border-indigo-200 transition-colors hover:border-indigo-300 hover:text-indigo-700 hover:shadow-sm"
                      >
                        {symptom}
                      </button>
                  ))}
                </div>
                
                <textarea
                  {...register('associatedSymptoms')}
                  id="associatedSymptoms"
                  rows={2}
                  className="w-full rounded-lg border-indigo-200 bg-primary-foreground/80 text-md focus:border-indigo-400 focus:ring-indigo-300"
                  placeholder="Other symptoms occurring with the main problem"
                ></textarea>
              </div>
            </div>
          </div>
        );
      case 4: // Imaging
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-muted-foreground mb-4">Imaging Results</h3>
            
            <div className="bg-muted/10 p-4 rounded-lg border border-border/30 text-center">
              <p className="text-muted-foreground">No imaging results available for this patient.</p>
              <button
                type="button"
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary"
              >
                Refresh Imaging Results
              </button>
            </div>
            
            <textarea
              {...register('imagingNotes')}
              rows={3}
              className="w-full rounded-md border-border/40 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Add your notes about imaging results here..."
            ></textarea>
          </div>
        );
      case 5: // Past Medical History (now case 5)
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-muted-foreground mb-4">Past Medical History</h3>
            
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl shadow-sm border border-indigo-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-100 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Medical Conditions</label>
                </div>
                
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Hypertension', 'Diabetes', 'Asthma', 'COPD', 'Coronary Artery Disease', 
                      'Stroke', 'Cancer', 'Arthritis', 'Thyroid Disease', 'Kidney Disease']
                      .map(condition => (
                        <button
                          key={condition}
                          type="button"
                          onClick={() => {
                            const currentValue = document.getElementById('pastMedicalHistory') as HTMLTextAreaElement;
                            const newValue = currentValue.value 
                              ? `${currentValue.value}${currentValue.value.endsWith(',') || currentValue.value.endsWith(', ') ? ' ' : ', '}${condition}`
                              : condition;
                            setValue('pastMedicalHistory', newValue);
                          }}
                          className="px-3 py-1.5 bg-primary-foreground hover:bg-indigo-50 text-sm text-muted-foreground rounded-full border border-indigo-200 transition-colors hover:text-indigo-700"
                        >
                          {condition}
                        </button>
                    ))}
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-primary-foreground hover:bg-indigo-50 text-sm text-indigo-600 rounded-full border border-indigo-200 transition-colors hover:shadow-sm"
                      onClick={() => document.getElementById('conditionDropdown')?.classList.toggle('hidden')}
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        More
                      </span>
                    </button>
                  </div>
                  
                  <div id="conditionDropdown" className="hidden bg-primary-foreground rounded-lg shadow-md border border-border/30 p-3 mb-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['Hyperlipidemia', 'Heart Failure', 'Atrial Fibrillation', 'Epilepsy', 
                        'Migraines', 'Depression', 'Anxiety', 'Osteoporosis', 'Gout',
                        'Gastroesophageal Reflux', 'Irritable Bowel Syndrome', 'Liver Disease']
                        .map(condition => (
                          <button
                            key={condition}
                            type="button"
                            onClick={() => {
                              const currentValue = document.getElementById('pastMedicalHistory') as HTMLTextAreaElement;
                              const newValue = currentValue.value 
                                ? `${currentValue.value}${currentValue.value.endsWith(',') || currentValue.value.endsWith(', ') ? ' ' : ', '}${condition}`
                                : condition;
                              setValue('pastMedicalHistory', newValue);
                              document.getElementById('conditionDropdown')?.classList.add('hidden');
                            }}
                            className="px-3 py-1.5 text-left bg-primary-foreground hover:bg-indigo-50 text-sm text-muted-foreground rounded-lg transition-colors hover:text-indigo-700"
                          >
                            {condition}
                          </button>
                      ))}
                    </div>
                  </div>
                </div>

                <textarea
                  {...register('pastMedicalHistory', { required: true })}
                  id="pastMedicalHistory"
                  rows={3}
                  className="w-full rounded-lg border-indigo-200 bg-primary-foreground/80 text-md focus:border-indigo-400 focus:ring-indigo-300"
                  placeholder="List all medical conditions"
                ></textarea>
                {errors.pastMedicalHistory && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-rose-50 p-5 rounded-xl shadow-sm border border-destructive/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-destructive/20 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Allergies</label>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {['Penicillin', 'Sulfa', 'NSAIDs', 'Latex', 'Eggs', 
                    'Peanuts', 'Shellfish', 'Iodine', 'Contrast Dye']
                    .map(allergy => (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => {
                          const currentValue = document.getElementById('allergies') as HTMLTextAreaElement;
                          const newValue = currentValue.value 
                            ? `${currentValue.value}${currentValue.value.endsWith(',') || currentValue.value.endsWith(', ') ? ' ' : ', '}${allergy}`
                            : allergy;
                          setValue('allergies', newValue);
                        }}
                        className="px-3 py-1.5 bg-primary-foreground hover:bg-destructive/10 text-sm text-muted-foreground rounded-full border border-destructive/30 transition-colors hover:border-destructive/40 hover:text-destructive hover:shadow-sm"
                      >
                        {allergy}
                      </button>
                  ))}
                </div>

                <textarea
                  {...register('allergies', { required: true })}
                  id="allergies"
                  rows={2}
                  className="w-full rounded-lg border-destructive/30 bg-primary-foreground/80 text-md focus:border-destructive/50 focus:ring-red-300"
                  placeholder="List all allergies and reactions"
                ></textarea>
                {errors.allergies && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 p-5 rounded-xl shadow-sm border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary/20 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Current Medications</label>
                </div>

                <div className="mb-3">
                  <select 
                    className="w-full rounded-lg border-primary/30 bg-primary-foreground/80 text-md focus:border-primary/50 focus:ring-blue-300 mb-2"
                    onChange={(e) => {
                      if (e.target.value) {
                        const currentValue = document.getElementById('medications') as HTMLTextAreaElement;
                        const newValue = currentValue.value 
                          ? `${currentValue.value}${currentValue.value.endsWith(',') || currentValue.value.endsWith(', ') ? ' ' : ', '}${e.target.value}`
                          : e.target.value;
                        setValue('medications', newValue);
                        e.target.value = ''; // Reset the dropdown
                      }
                    }}
                  >
                    <option value="">Select medication to add</option>
                    <optgroup label="Cardiovascular">
                      <option value="Lisinopril">Lisinopril</option>
                      <option value="Metoprolol">Metoprolol</option>
                      <option value="Amlodipine">Amlodipine</option>
                      <option value="Atorvastatin">Atorvastatin</option>
                      <option value="Aspirin">Aspirin</option>
                    </optgroup>
                    <optgroup label="Diabetes">
                      <option value="Metformin">Metformin</option>
                      <option value="Insulin Glargine">Insulin Glargine</option>
                      <option value="Glipizide">Glipizide</option>
                    </optgroup>
                    <optgroup label="Respiratory">
                      <option value="Albuterol">Albuterol</option>
                      <option value="Fluticasone">Fluticasone</option>
                      <option value="Montelukast">Montelukast</option>
                    </optgroup>
                    <optgroup label="Pain/Inflammation">
                      <option value="Ibuprofen">Ibuprofen</option>
                      <option value="Acetaminophen">Acetaminophen</option>
                      <option value="Prednisone">Prednisone</option>
                    </optgroup>
                    <optgroup label="Mental Health">
                      <option value="Sertraline">Sertraline</option>
                      <option value="Escitalopram">Escitalopram</option>
                      <option value="Alprazolam">Alprazolam</option>
                    </optgroup>
                  </select>
                </div>
                
                <textarea
                  {...register('medications', { required: true })}
                  id="medications"
                  rows={3}
                  className="w-full rounded-lg border-primary/30 bg-primary-foreground/80 text-md focus:border-primary/50 focus:ring-blue-300"
                  placeholder="List all current medications with dosages"
                ></textarea>
                {errors.medications && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-5 rounded-xl shadow-sm border border-emerald-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-emerald-100 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <label className="text-sm font-medium text-muted-foreground">Surgical History</label>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {['Appendectomy', 'Cholecystectomy', 'Cesarean Section', 'Hysterectomy', 
                    'Tonsillectomy', 'Hip Replacement', 'Knee Replacement', 'CABG']
                    .map(surgery => (
                      <button
                        key={surgery}
                        type="button"
                        onClick={() => {
                          const currentValue = document.getElementById('surgicalHistory') as HTMLTextAreaElement;
                          const newValue = currentValue.value 
                            ? `${currentValue.value}${currentValue.value.endsWith(',') || currentValue.value.endsWith(', ') ? ' ' : ', '}${surgery}`
                            : surgery;
                          setValue('surgicalHistory', newValue);
                        }}
                        className="px-3 py-1.5 bg-primary-foreground hover:bg-emerald-50 text-sm text-muted-foreground rounded-full border border-emerald-200 transition-colors hover:border-emerald-300 hover:text-emerald-700 hover:shadow-sm"
                      >
                        {surgery}
                      </button>
                  ))}
                </div>
                
                <textarea
                  {...register('surgicalHistory')}
                  id="surgicalHistory"
                  rows={2}
                  className="w-full rounded-lg border-emerald-200 bg-primary-foreground/80 text-md focus:border-emerald-400 focus:ring-emerald-300"
                  placeholder="List all previous surgeries with dates if known"
                ></textarea>
              </div>
            </div>
          </div>
        );
      case 6: // Family History (now case 6)
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-muted-foreground mb-4">Family History</h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Family Medical History
              </label>
              <textarea
                {...register('familyHistory', { required: true })}
                rows={6}
                className="w-full rounded-md border-border/40"
                placeholder="List significant family medical conditions"
              ></textarea>
              {errors.familyHistory && <p className="text-destructive text-xs mt-1">Required</p>}
            </div>
          </div>
        );
      case 7: // Social History (now case 7)
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-medium text-muted-foreground mb-4">Social History</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Occupation</label>
                <input
                  type="text"
                  {...register('occupation', { required: true })}
                  className="w-full rounded-md border-border/40"
                />
                {errors.occupation && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Smoking Status</label>
                <select
                  {...register('smoking', { required: true })}
                  className="w-full rounded-md border-border/40"
                >
                  <option value="">Select status</option>
                  <option value="Never">Never</option>
                  <option value="Former">Former</option>
                  <option value="Current">Current</option>
                </select>
                {errors.smoking && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Alcohol Use</label>
                <select
                  {...register('alcohol', { required: true })}
                  className="w-full rounded-md border-border/40"
                >
                  <option value="">Select frequency</option>
                  <option value="None">None</option>
                  <option value="Occasional">Occasional</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Heavy">Heavy</option>
                </select>
                {errors.alcohol && <p className="text-destructive text-xs mt-1">Required</p>}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Exercise</label>
                <select
                  {...register('exercise')}
                  className="w-full rounded-md border-border/40"
                >
                  <option value="">Select frequency</option>
                  <option value="None">None</option>
                  <option value="Occasional">Occasional</option>
                  <option value="Regular">Regular</option>
                  <option value="Intensive">Intensive</option>
                </select>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-primary-foreground rounded-xl shadow-sm overflow-hidden max-w-full">
      {/* Top Navigation Bar */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-primary-foreground/20 p-2 rounded-lg">
            <ClipboardList className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary-foreground">Medical History Form</h2>
            <p className="text-sm text-secondary-foreground/20">Patient: {patientName}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < activeStep
                    ? 'bg-primary-foreground' 
                    : i === activeStep 
                      ? 'bg-accent/40 w-3 h-3' 
                      : 'bg-secondary/40/50'
                }`}
              />
            ))}
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors text-primary-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex bg-primary-foreground">
        {/* Left Sidebar - Quick Navigation */}
        <div className="w-[12%] bg-muted/10 p-3 border-r border-border/30 overflow-y-auto max-h-[80vh]">
          <div className="space-y-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-2 rounded-lg transition-all text-sm ${
                  activeStep === index 
                    ? 'bg-secondary/20 border-l-4 border-secondary shadow-sm pl-3' 
                    : activeStep > index
                    ? 'bg-primary/10 border-l-4 border-primary pl-3 opacity-80'
                    : 'hover:bg-muted/20'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 text-xs ${
                    activeStep > index 
                      ? 'bg-primary text-primary-foreground' 
                      : activeStep === index 
                        ? 'bg-secondary text-primary-foreground' 
                        : 'bg-muted/30 text-muted-foreground'
                  }`}>
                    {activeStep > index ? '✓' : index + 1}
                  </div>
                  <span className={`text-xs ${
                    activeStep === index ? 'text-secondary-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Main Form Area */}
        <div className="w-[88%] overflow-y-auto max-h-[80vh]">
          <div className="p-6 md:p-10 lg:p-12">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Step {activeStep + 1} of {steps.length}</span>
                <span className="text-xs font-medium text-secondary-foreground">
                  {Math.round((activeStep + 1) / steps.length * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-indigo-500 h-2 rounded-full animate-pulse transition-all duration-700 ease-in-out"
                  style={{ width: `${(activeStep + 1) / steps.length * 100}%` }}
                />
              </div>
            </div>
            
            {/* Form Content */}
            <form id="historyForm" onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div className="bg-primary-foreground rounded-2xl border border-border/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-2xl font-bold text-indigo-800 mb-2 tracking-tight drop-shadow-sm">{steps[activeStep].title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{steps[activeStep].description}</p>
                
                {/* Form fields based on active step */}
                {renderStepContent()}
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Footer Navigation */}
      <div className="bg-primary-foreground border-t border-border/30 p-4 sticky bottom-0 z-20 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={activeStep === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
              activeStep === 0
                ? 'bg-muted/20 text-muted-foreground/50 cursor-not-allowed'
                : 'bg-primary-foreground border border-border/40 text-muted-foreground hover:bg-muted/10 hover:text-secondary-foreground'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          {activeStep === steps.length - 1 ? (
            <button
              type="submit"
              form="historyForm"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-primary-foreground rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Submit History'}
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-primary-foreground rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors flex items-center"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryTakingForm; 