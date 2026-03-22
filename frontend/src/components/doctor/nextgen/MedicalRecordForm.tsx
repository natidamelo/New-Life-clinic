import React, { useState, useEffect } from 'react';
import { getAuthToken } from '../../../utils/authToken';
import {
  Box, Typography, Button, Stepper, Step, StepLabel,
  TextField, Grid, CircularProgress, Tooltip, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, MenuItem, Tabs, Tab, Select, Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { formatDateTime } from '../../../utils/formatters';
import medicalRecordsApi, { MedicalRecord, MedicalRecordInput } from '../../../services/medicalRecords';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import api from '../../../services/apiService';
import MedicalHistoryDropdown from './MedicalHistoryDropdown';
import ProfessionalPrescriptionForm from '../ProfessionalPrescriptionForm';
import LaboratoryRequestForm from '../LaboratoryRequestForm';
import ImagingOrderForm from '../ImagingOrderForm';
import MedicalDropdown, { MEDICAL_DROPDOWN_OPTIONS } from '../../ui/medical-dropdown';

interface MedicalRecordFormProps {
  patientId: string;
  recordId?: string;
  mode?: 'view' | 'create' | 'edit';
  onSave?: (record: MedicalRecord) => void;
  onCancel?: () => void;
  handleNewRecord?: () => void;
  hideHeader?: boolean;
}

const MedicalRecordForm: React.FC<MedicalRecordFormProps> = ({ 
  patientId, 
  recordId,
  mode = 'create',
  onSave,
  onCancel,
  handleNewRecord,
  hideHeader = false
}) => {
  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [record, setRecord] = useState<Partial<MedicalRecord>>({
    patient: patientId,
    chiefComplaint: {
      description: '',
      duration: '',
      severity: 'Mild',
      onsetPattern: 'Acute',
      progression: 'Improving',
      impactOnDailyLife: 'None',
    },
    physicalExamination: {
      vitals: {},
    },
    diagnoses: [],
    prescriptions: [],
    status: 'Draft',
    reviewOfSystems: '',
    familyHistory: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'updated' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);
  const { user } = useAuth();
  const [ccTab, setCCTab] = useState(0);
  const [systemTab, setSystemTab] = useState(0);
  const [patientName, setPatientName] = useState('');
  const [formMode, setFormMode] = useState<'view' | 'edit' | 'create'>(mode);

  // Medication form state
  const [medicationForm, setMedicationForm] = useState({
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    refills: 0,
    instructions: ''
  });

  // Steps in the form
  const steps = [
    'Chief Complaint & History',
    'Physical Examination',
    'Diagnosis & Plan'
  ];

  // Determine if we're in development mode
  const isDevelopmentMode = import.meta.env.MODE === 'development' || window.location.hostname === 'localhost';

  // Chief Complaint tabs configuration
  const ccTabs = [
    {
      key: 'chiefComplaint',
      label: 'Chief Complaint',
      icon: '📝',
      value: (record.chiefComplaint?.description || ''),
      onChange: (val: string) => handleChange('description', val, 'chiefComplaint'),
      chips: ['Fever', 'Cough', 'Headache', 'Abdominal pain', 'Chest pain', 'Sore throat']
    },
    {
      key: 'historyOfPresentIllness',
      label: 'History of Present Illness',
      icon: '📖',
      value: (record.historyOfPresentIllness || ''),
      onChange: (val: string) => handleChange('historyOfPresentIllness', val),
      chips: ['Acute onset', 'Gradual onset', 'Intermittent', 'Progressive']
    },
    {
      key: 'pastMedicalHistory',
      label: 'Past Medical History',
      icon: '🏥',
      value: (record.pastMedicalHistory || ''),
      onChange: (val: string) => handleChange('pastMedicalHistory', val),
      chips: ['Hypertension', 'Diabetes', 'Asthma', 'Heart disease']
    },
    {
      key: 'allergies',
      label: 'Allergies',
      icon: '🌾',
      value: (record.allergies || ''),
      onChange: (val: string) => handleChange('allergies', val),
      chips: ['Penicillin', 'Sulfa drugs', 'Peanuts', 'No known allergies']
    }
  ];

  // Physical examination systems
  const systems = [
    {
      key: 'heent',
      label: 'HEENT',
      icon: '🧑‍⚕️',
      normal: 'Head: Normocephalic, atraumatic. Eyes: PERRLA, EOMI. Ears: Normal. Nose: Normal. Throat: Normal mucosa.'
    },
    {
      key: 'chest',
      label: 'Chest/Lungs',
      icon: '🫁',
      normal: 'Clear to auscultation bilaterally. No rales, wheezes, or rhonchi.'
    },
    {
      key: 'cardiovascular',
      label: 'Cardiovascular',
      icon: '❤️',
      normal: 'Regular rate and rhythm. No murmurs, rubs, or gallops.'
    },
    {
      key: 'abdomen',
      label: 'Abdomen',
      icon: '🩺',
      normal: 'Soft, non-tender, no masses, no organomegaly.'
    }
  ];

  // Auto-set token for development mode
  useEffect(() => {
    if (isDevelopmentMode) {
      const possibleTokenKeys = ['token', 'jwt_token', 'auth_token', 'authToken'];
      let hasToken = false;
      
      for (const key of possibleTokenKeys) {
        if (localStorage.getItem(key)) {
          hasToken = true;
          break;
        }
      }
      
      if (!hasToken) {
        const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIzMzAxY2RlZmM3Nzc2YmY3NTM3YjMiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzQ4MTk0NDQ1LCJleHAiOjE3NDgyODA4NDV9.AMsRPhxM_eBAIfXBixgsdjvRyo7PkFxf1E44ivtx4QE';
        localStorage.setItem('jwt_token', testToken);
      }
    }
  }, [isDevelopmentMode]);

  // Load record if in edit or view mode
  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && recordId) {
      loadRecord(recordId);
    }
  }, [recordId, mode]);

  // Fetch patient details
  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (!patientId) return;
      
      try {
        const { getPatientById } = await import('../../../services/patientService');
        const patient = await getPatientById(patientId);
        if (patient) {
          setPatientName(`${patient.firstName} ${patient.lastName}`);
        }
      } catch (error) {
        console.error('Error fetching patient details:', error);
      }
    };
    
    fetchPatientDetails();
  }, [patientId]);

  // Load record from API
  const loadRecord = async (id: string) => {
    if (!id) {
      console.error('[MedicalRecordForm] No record ID provided to loadRecord');
      return;
    }

    console.log(`[MedicalRecordForm] Loading medical record with ID: ${id}`);
    setLoading(true);
    setErrors({});

    // Enhanced authentication check
    let authToken = null;
    const possibleTokenKeys = ['token', 'jwt_token', 'auth_token', 'authToken'];
    
    for (const key of possibleTokenKeys) {
      const token = localStorage.getItem(key);
      if (token) {
        authToken = token;
        console.log(`[MedicalRecordForm] Found auth token in localStorage.${key}`);
        break;
      }
    }
    
    if (!authToken && isDevelopmentMode) {
      console.log('[MedicalRecordForm] No token found in development mode - setting test token');
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIzMzAxY2RlZmM3Nzc2YmY3NTM3YjMiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzQ4MTk0NDQ1LCJleHAiOjE3NDgyODA4NDV9.AMsRPhxM_eBAIfXBixgsdjvRyo7PkFxf1E44ivtx4QE';
      localStorage.setItem('jwt_token', testToken);
      authToken = testToken;
    }

    if (!authToken) {
      console.error('[MedicalRecordForm] No authentication token available');
      toast.error('Authentication required. Please log in.');
      setLoading(false);
      return;
    }

    try {
      // Try multiple approaches to load the record
      let response;
      
      try {
        // Primary API call
        console.log('[MedicalRecordForm] Attempting primary API call via medicalRecordsApi.getById');
        response = await medicalRecordsApi.getById(id);
        console.log('[MedicalRecordForm] Primary API response:', response);
      } catch (primaryError) {
        console.warn('[MedicalRecordForm] Primary API failed, trying direct fetch:', primaryError);
        
        // Fallback to direct API call
        const directUrl = `/api/medical-records/${id}`;
        console.log(`[MedicalRecordForm] Trying direct fetch to: ${directUrl}`);
        
        const directResponse = await fetch(directUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!directResponse.ok) {
          throw new Error(`Direct API request failed: ${directResponse.status} ${directResponse.statusText}`);
        }
        
        response = await directResponse.json();
        console.log('[MedicalRecordForm] Direct fetch response:', response);
      }

      if (response && response.success && response.data) {
        console.log('[MedicalRecordForm] Successfully loaded record:', response.data);
        
        // Ensure proper data structure
        const loadedRecord = {
          ...response.data,
          patient: patientId, // Ensure patient ID is set correctly
          chiefComplaint: response.data.chiefComplaint || {
            description: '',
            duration: '',
            severity: 'Mild',
            onsetPattern: 'Acute',
            progression: 'Improving',
            impactOnDailyLife: 'None'
          },
          physicalExamination: response.data.physicalExamination || {
            vitals: {},
          },
          diagnoses: response.data.diagnoses || [],
          prescriptions: response.data.prescriptions || []
        };
        
        console.log('[MedicalRecordForm] Setting record with processed data:', loadedRecord);
        setRecord(loadedRecord);
        setIsFinalized(loadedRecord.status === 'Finalized');
        
        // Update form mode to view
        setFormMode('view');
        
        // Reset to first step to show the loaded data
        setActiveStep(0);
        
        // Ensure the form is properly populated with the loaded data
        // The form should automatically reflect the record state
        
        toast.success(`Medical record loaded: ${formatDateTime(response.data.createdAt)}`);
      } else {
        console.error('[MedicalRecordForm] Invalid response structure:', response);
        toast.error('Failed to load record: Invalid response from server');
      }
    } catch (error: any) {
      console.error('[MedicalRecordForm] Error loading record:', error);
      
      let errorMessage = 'Error loading medical record';
      
      if (error?.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view this record.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Medical record not found. It may have been deleted.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (
    field: string, 
    value: any, 
    section?: string, 
    subfield?: string
  ) => {
    setRecord(prev => {
      if (section && subfield) {
        return {
          ...prev,
          [section]: {
            ...(prev[section as keyof MedicalRecord] as any),
            [subfield]: {
              ...(prev[section as keyof MedicalRecord] as any)?.[subfield],
              [field]: value
            }
          }
        };
      } else if (section) {
        return {
          ...prev,
          [section]: {
            ...(prev[section as keyof MedicalRecord] as any),
            [field]: value
          }
        };
      } else {
        return {
          ...prev,
          [field]: value
        };
      }
    });
  };


  // Handle form submission
  const handleSave = async (finalize: boolean = false) => {
    const authToken = getAuthToken();
    
    if (!authToken) {
      toast.error('Authentication required. Please log in and try again.');
      return;
    }
    
    // Prevent multiple finalization attempts
    if (finalize && isFinalized) {
      console.log('⚠️ Record already finalized, preventing duplicate finalization');
      toast.error('This record has already been finalized.');
      return;
    }
    
    setSaving(true);
    setSaveStatus('saving');
    
    try {
      let response;
      const recordToSave: MedicalRecordInput = {
        ...record,
        patient: patientId,
        doctor: user?.id || user?._id || '',
        visit: patientId, // Use patientId as visit ID
        status: finalize ? 'Finalized' : (record.status || 'Draft'),
        // primaryProvider: user?.id || user?._id
      };
      
      if (mode === 'create' || !recordId) {
        response = await medicalRecordsApi.create(recordToSave);
      } else {
        response = await medicalRecordsApi.update(recordId, recordToSave);
      }
      
      if (response && response.success) {
        const savedRecordId = response.data._id || response.data.id;
        
        if (finalize && savedRecordId) {
          // Set finalized state immediately to prevent multiple clicks
          setIsFinalized(true);
          try {
            const finalizeResponse = await medicalRecordsApi.finalize(savedRecordId);
            if (finalizeResponse.success) {
              toast.success('Medical record saved and finalized successfully');
              setRecord(prev => ({ ...prev, status: 'Finalized', locked: true }));
            } else {
              toast.error('Record saved but could not be finalized');
            }
          } catch (finalizeError) {
            // Reset finalized state on error
            setIsFinalized(false);
            toast.error('Record saved but finalize failed');
          }
        } else {
          toast.success('Medical record saved successfully');
        }
        
        setSaveStatus(mode === 'create' ? 'saved' : 'updated');
        
        if (onSave) {
          onSave(response.data);
        }
      } else {
        toast.error('Failed to save record');
        setSaveStatus('error');
      }
    } catch (error: any) {
      console.error('Error saving record:', error);
      toast.error('An error occurred while saving');
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // Navigation functions
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Medication form functions
  const handleMedicationChange = (field: string, value: any) => {
    setMedicationForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddMedication = () => {
    if (!medicationForm.medication || !medicationForm.dosage || !medicationForm.frequency || !medicationForm.duration) {
      toast.error('Please fill out all required medication fields');
      return;
    }
    
    setRecord(prev => {
      const prescriptions = prev.prescriptions || [];
      return {
        ...prev,
        prescriptions: [
          ...prescriptions,
          {
            alternativeMedication: medicationForm.medication,
            dosage: medicationForm.dosage,
            frequency: medicationForm.frequency,
            duration: medicationForm.duration,
            quantity: 1,
            refills: medicationForm.refills,
            route: 'Oral',
            instructions: medicationForm.instructions,
            prescribedBy: user?.id,
            status: 'Active',
            startDate: new Date()
          }
        ] as any
      };
    });
    
    setMedicationForm({
      medication: '',
      dosage: '',
      frequency: '',
      duration: '',
      refills: 0,
      instructions: ''
    });
    
    toast.success('Medication added to prescription');
  };

  // Get system status for physical examination
  const getSystemStatus = (val: string) => {
    if (!val || val === '') return 'Not Examined';
    if (val === 'Normal') return 'Normal';
    if (val === 'Not Examined') return 'Not Examined';
    return 'Abnormal';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Normal') return 'success';
    if (status === 'Not Examined') return 'warning';
    return 'error';
  };

  // Add state for modals
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [imagingModalOpen, setImagingModalOpen] = useState(false);

  // Render form content based on active step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f9ff' }}>
              <Tabs
                value={ccTab}
                onChange={(_, newValue) => setCCTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {ccTabs.map((tab, idx) => (
                  <Tab
                    key={tab.key}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </Box>
                    }
                  />
                ))}
              </Tabs>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {ccTabs.map((tab, idx) => (
                <Box
                  key={tab.key}
                  role="tabpanel"
                  hidden={ccTab !== idx}
                  sx={{ display: ccTab === idx ? 'block' : 'none' }}
                >
                  {ccTab === idx && (
                    <Box>
                      <TextField
                        label={tab.label}
                        fullWidth
                        multiline
                        rows={6}
                        value={tab.value}
                        onChange={e => tab.onChange(e.target.value)}
                        disabled={mode === 'view' || record.locked}
                        sx={{ mb: 2 }}
                      />
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {tab.chips.map(chip => (
                          <Chip
                            key={chip}
                            label={chip}
                            variant="outlined"
                            color="info"
                            onClick={() => {
                              const prev = tab.value || '';
                              const newVal = prev ? prev + ', ' + chip : chip;
                              tab.onChange(newVal);
                            }}
                            disabled={mode === 'view' || record.locked}
                          />
                        ))}
                      </Box>

                      {/* Chief Complaint Dropdown Fields */}
                      {tab.key === 'chiefComplaint' && (
                        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 'bold' }}>
                            Clinical Characteristics
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                              <MedicalDropdown
                                label="Severity"
                                value={record.chiefComplaint?.severity || 'Mild'}
                                onChange={(value) => handleChange('severity', value, 'chiefComplaint')}
                                options={MEDICAL_DROPDOWN_OPTIONS.severity}
                                disabled={mode === 'view' || record.locked}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <MedicalDropdown
                                label="Onset Pattern"
                                value={record.chiefComplaint?.onsetPattern || 'Acute'}
                                onChange={(value) => handleChange('onsetPattern', value, 'chiefComplaint')}
                                options={MEDICAL_DROPDOWN_OPTIONS.onsetPattern}
                                disabled={mode === 'view' || record.locked}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <MedicalDropdown
                                label="Progression"
                                value={record.chiefComplaint?.progression || 'Improving'}
                                onChange={(value) => handleChange('progression', value, 'chiefComplaint')}
                                options={MEDICAL_DROPDOWN_OPTIONS.progression}
                                disabled={mode === 'view' || record.locked}
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <MedicalDropdown
                                label="Impact on Daily Life"
                                value={record.chiefComplaint?.impactOnDailyLife || 'None'}
                                onChange={(value) => handleChange('impactOnDailyLife', value, 'chiefComplaint')}
                                options={MEDICAL_DROPDOWN_OPTIONS.impactOnDailyLife}
                                disabled={mode === 'view' || record.locked}
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>Physical Examination</Typography>
            
            {/* Vitals Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={1}>Vitals</Typography>
              <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} component="div">
                  <TextField
                    label="Temperature (°C)"
                    fullWidth
                    value={record.physicalExamination?.vitals?.temperature || ''}
                    onChange={e => handleChange('temperature', e.target.value, 'physicalExamination', 'vitals')}
                    type="number"
                    inputProps={{ step: '0.1' }}
                  />
                </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} component="div">
                  <TextField
                    label="Heart Rate (bpm)"
                    fullWidth
                    value={record.physicalExamination?.vitals?.heartRate || ''}
                    onChange={e => handleChange('heartRate', e.target.value, 'physicalExamination', 'vitals')}
                    type="number"
                  />
                </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} component="div">
                  <TextField
                    label="Blood Pressure"
                    fullWidth
                    value={record.physicalExamination?.vitals?.bloodPressure || ''}
                    onChange={e => handleChange('bloodPressure', e.target.value, 'physicalExamination', 'vitals')}
                    placeholder="120/80"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Systemic Examination */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="success.main" mb={1}>Systemic Examination</Typography>
              <Tabs
                value={systemTab}
                onChange={(_, newValue) => setSystemTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2 }}
              >
                {systems.map((system, idx) => (
                  <Tab
                    key={system.key}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{system.icon}</span>
                        <span>{system.label}</span>
                      </Box>
                    }
                  />
                ))}
              </Tabs>
              {systems.map((system, idx) => {
                const value = record.physicalExamination?.[system.key] || '';
                const status = getSystemStatus(value);
                return (
                  <Box
                    key={system.key}
                    role="tabpanel"
                    hidden={systemTab !== idx}
                    sx={{ display: systemTab === idx ? 'block' : 'none' }}
                  >
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Chip
                        label={status}
                        color={getStatusColor(status)}
                        variant="filled"
                      />
                      <Button
                        variant={value === 'Normal' ? 'contained' : 'outlined'}
                        color="success"
                        size="small"
                        onClick={() => handleChange(system.key, 'Normal', 'physicalExamination')}
                      >
                        Normal
                      </Button>
                      <Button
                        variant={value === 'Not Examined' ? 'contained' : 'outlined'}
                        color="warning"
                        size="small"
                        onClick={() => handleChange(system.key, 'Not Examined', 'physicalExamination')}
                      >
                        Not Examined
                      </Button>
                      <Button
                        variant="outlined"
                        color="info"
                        size="small"
                        onClick={() => handleChange(system.key, system.normal, 'physicalExamination')}
                      >
                        Insert Normal
                      </Button>
                    </Box>
                    <TextField
                      label={`${system.label} Findings`}
                      fullWidth
                      multiline
                      minRows={3}
                      value={value === 'Normal' || value === 'Not Examined' ? '' : value}
                      onChange={e => handleChange(system.key, e.target.value, 'physicalExamination')}
                      placeholder={system.normal}
                    />
                  </Box>
                );
              })}
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>Diagnosis & Plan</Typography>
            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }} component="div">
                <TextField
                  label="Diagnosis"
                  fullWidth
                  multiline
                  minRows={3}
                  value={record.diagnosis || ''}
                  onChange={e => handleChange('diagnosis', e.target.value)}
                />
              </Grid>
                <Grid size={{ xs: 12 }} component="div">
                <TextField
                  label="Plan"
                  fullWidth
                  multiline
                  minRows={3}
                  value={record.plan || ''}
                  onChange={e => handleChange('plan', e.target.value)}
                />
              </Grid>
                <Grid size={{ xs: 12 }} component="div">
                <TextField
                  label="Notes"
                  fullWidth
                  multiline
                  minRows={3}
                  value={(record as any).notes || ''}
                  onChange={e => handleChange('notes', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      bgcolor: 'white',
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2,
        backgroundColor: 'hsl(var(--primary))',
        borderBottom: '1px solid hsl(var(--border))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!hideHeader && (
            <Typography variant="h6" sx={{ color: 'hsl(var(--primary-foreground))', fontWeight: 'bold' }}>
              {mode === 'create' ? 'New Medical Record' : mode === 'edit' ? 'Edit Medical Record' : 'View Medical Record'}
            </Typography>
          )}
          <MedicalHistoryDropdown 
            patientId={patientId}
            onSelectRecord={(recordId) => {
              if (recordId) {
                loadRecord(recordId);
                setFormMode('view');
              }
            }}
            onCreateNew={() => {
              setRecord({
                patient: patientId,
                chiefComplaint: { 
                  description: '',
                  duration: '',
                  severity: 'Mild' as const,
                  onsetPattern: 'Acute' as const,
                  progression: 'Improving' as const,
                  impactOnDailyLife: 'None' as const,
                  associatedSymptoms: [],
                  previousEpisodes: false,
                  previousEpisodesDetails: '',
                  recordedAt: new Date().toISOString(),
                  recordedBy: ''
                },
                physicalExamination: { vitals: {} },
                diagnoses: [],
                prescriptions: [],
                status: 'Draft'
              });
              setFormMode('create');
              setActiveStep(0);
              toast.success('Started new medical record');
            }}
            currentRecordId={record?._id}
          />
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Stepper */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e7ef' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Form Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {getStepContent(activeStep)}
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          borderTop: '1px solid #e0e7ef',
          backgroundColor: '#f8fafc'
        }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={activeStep === steps.length - 1 ? () => handleSave(false) : handleNext}
            endIcon={activeStep === steps.length - 1 ? <SaveIcon /> : <ArrowForwardIcon />}
          >
            {activeStep === steps.length - 1 ? 'Save' : 'Next'}
          </Button>
        </Box>
      </Box>
        
      {/* Development Helper Tools */}
      {isDevelopmentMode && (
        <Box sx={{ 
          position: 'fixed', 
          top: 20, 
          right: 20, 
          zIndex: 1000,
          display: 'flex',
          gap: 1,
          p: 1,
          bgcolor: 'rgba(255,255,255,0.9)',
          borderRadius: 2,
          boxShadow: 2
        }}>
          <Tooltip title="Set Development Token">
            <Button
              size="small"
              color="primary"
              variant="outlined"
              onClick={() => {
                const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIzMzAxY2RlZmM3Nzc2YmY3NTM3YjMiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzQ4MTk0NDQ1LCJleHAiOjE3NDgyODA4NDV9.AMsRPhxM_eBAIfXBixgsdjvRyo7PkFxf1E44ivtx4QE';
                localStorage.setItem('jwt_token', testToken);
                toast.success('Dev token set! 🔧');
              }}
            >
              🔧 Auth
            </Button>
          </Tooltip>
          <Tooltip title="Create New Record">
            <Button
              size="small"
              color="success"
              variant="outlined"
              onClick={() => {
                setRecord({
                  patient: patientId,
                  chiefComplaint: { 
                  description: '',
                  duration: '',
                  severity: 'Mild' as const,
                  onsetPattern: 'Acute' as const,
                  progression: 'Improving' as const,
                  impactOnDailyLife: 'None' as const,
                  associatedSymptoms: [],
                  previousEpisodes: false,
                  previousEpisodesDetails: '',
                  recordedAt: new Date().toISOString(),
                  recordedBy: ''
                },
                  physicalExamination: { vitals: {} },
                  diagnoses: [],
                  prescriptions: [],
                  status: 'Draft'
                });
                setFormMode('create');
                setActiveStep(0);
                toast.success('New record started! ✨');
              }}
            >
              ✨ New
            </Button>
          </Tooltip>
          <Tooltip title="Test Record Loading">
            <Button
              size="small"
              color="info"
              variant="outlined"
              onClick={async () => {
                try {
                  console.log('[Debug] Testing medical records API...');
                  const response = await medicalRecordsApi.getByPatientId(patientId);
                  console.log('[Debug] API Response:', response);
                  if (response?.data && response.data.length > 0) {
                    const firstRecord = response.data[0];
                    const recordId = firstRecord._id || (firstRecord as any).id;
                    console.log('[Debug] Testing loadRecord with ID:', recordId);
                    await loadRecord(recordId);
                  } else {
                    toast('No records found for this patient');
                  }
                } catch (error) {
                  console.error('[Debug] Error testing API:', error);
                  toast.error('API test failed - check console');
                }
              }}
            >
              🔍 Test
            </Button>
          </Tooltip>
        </Box>
      )}
        
      {/* Audit Trail Dialog */}
      <Dialog
        open={auditTrailOpen}
        onClose={() => setAuditTrailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Audit Trail
          <IconButton
            onClick={() => setAuditTrailOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">No audit trail available</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuditTrailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Save and Finalize buttons */}
      <Box sx={{ 
        p: 3, 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: 2,
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        position: 'sticky',
        bottom: 0,
        zIndex: 10
      }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleSave(false)}
          disabled={saving || !patientId}
          startIcon={saving && saveStatus === 'saving' ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          size="large"
          sx={{ minWidth: 120, boxShadow: 2 }}
        >
          {saving && saveStatus === 'saving' ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => handleSave(true)}
          disabled={saving || isFinalized || !patientId || record.status === 'Finalized'}
          startIcon={saving && saveStatus === 'saving' ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
          size="large"
          sx={{ minWidth: 120, boxShadow: 2 }}
        >
          {saving && saveStatus === 'saving' ? 'Finalizing...' : isFinalized ? 'Finalized' : 'Finalize'}
        </Button>
      </Box>
    </Box>
  );
};

export default MedicalRecordForm; 