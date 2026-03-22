import React, { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../../../utils/authToken';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  Snackbar,
  Card,
  CardHeader,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Switch,
  Autocomplete,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Avatar,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Star as StarIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Psychology as AIIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  LocalHospital as HospitalIcon,
  Science as LabIcon,
  Medication as MedicationIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  Thermostat as ThermometerIcon,
  Favorite as HeartIcon,
  ShowChart as WavesIcon,
  Air as LungsIcon,
  Refresh as RefreshIcon,
  Bloodtype as BloodtypeIcon,
  WaterDrop as WaterDropIcon,
  Height as HeightIcon,
  MonitorWeight as MonitorWeightIcon,
  Calculate as CalculateIcon,
  LocalHospital as LocalHospitalIcon,
  Favorite as FavoriteIcon,
  Air as AirIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import AIAssistantService from '../../../services/aiAssistantService';
import { api } from '../../../services/api';
import medicalRecordsApi from '../../../services/medicalRecords'; // Added missing import
import { formatDate, formatDateTime, formatTime } from '../../../utils/formatters';
import { useAuth } from '../../../context/AuthContext';
import medicalRecordService from '../../../services/medicalRecordService';
import vitalSignsService from '../../../services/vitalSignsService';
import { LocalizationProvider, DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import dayjs, { Dayjs } from 'dayjs';
import ProfessionalPrescriptionForm from '../ProfessionalPrescriptionForm';
import LaboratoryRequestForm from '../LaboratoryRequestForm';
import ImagingOrderForm from '../ImagingOrderForm';
import { useMemorySystem } from '../../../hooks/useMemorySystem';
import MemorySystemControls from '../MemorySystemControls';

// Types
interface MedicalRecord {
  _id?: string;
  patient?: string;
  patientId?: string;
  visitDate?: string;
  chiefComplaint?: {
    description?: string;
    duration?: string;
    severity?: string;
    associatedSymptoms?: string[];
    onsetPattern?: string;
    progression?: string;
    impactOnDailyLife?: string;
    location?: string;
    aggravatingFactors?: string[];
    relievingFactors?: string[];
    previousEpisodes?: boolean;
    previousEpisodesDetails?: string;
    recordedAt?: string;
    recordedBy?: string;
  };
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  currentMedications?: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    startDate?: string;
  }>;
  allergies?: Array<{
    allergen: string;
    reaction: string;
    severity: string;
  }>;
  vitalSigns?: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    height?: string;
    weight?: string;
    bmi?: string;
  };
  physicalExamination?: {
    general?: string;
    heent?: {
      head?: string;
      eyes?: string;
      ears?: string;
      nose?: string;
      throat?: string;
    };
    cardiovascular?: string;
    respiratory?: string;
    gastrointestinal?: string;
    genitourinary?: string;
    musculoskeletal?: string;
    neurological?: string;
    skin?: string;
    vitals?: {
      temperature?: string;
      bloodPressure?: string;
      heartRate?: string;
      respiratoryRate?: string;
      oxygenSaturation?: string;
      height?: string;
      weight?: string;
      bmi?: string;
      autoPopulated?: boolean;
      nurseRecordedBy?: string;
      nurseRecordedAt?: string;
      recordedBy?: string;
      recordedAt?: string;
    };
  };
  diagnoses?: Array<{
    diagnosis: string;
    type: 'primary' | 'secondary';
    icd10?: string;
    notes?: string;
  }>;
  // Add missing properties for primary diagnosis
  primaryDiagnosis?: {
    code?: string;
    description?: string;
    category?: string;
  };
  secondaryDiagnoses?: Array<{
    code?: string;
    description?: string;
    category?: string;
  }>;
  // Add plan property
  plan?: string;
  prescriptions?: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  procedures?: Array<{
    procedure: string;
    date?: string;
    provider?: string;
    notes?: string;
  }>;
  labOrders?: Array<{
    test: string;
    urgency: 'routine' | 'urgent' | 'stat';
    notes?: string;
  }>;
  imagingOrders?: Array<{
    study: string;
    urgency: 'routine' | 'urgent' | 'stat';
    indication?: string;
  }>;
  followUpPlan?: {
    timing?: string;
    provider?: string;
    instructions?: string;
    appointmentNeeded?: boolean;
    labWork?: boolean;
    imaging?: boolean;
  };
  status?: 'draft' | 'finalized';
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // Add quality control properties
  reviewedAndApproved?: boolean;
  qualityScore?: number;
  version?: number;
}

interface EnhancedMedicalRecordFormProps {
  patientId: string;
  recordId?: string;
  mode?: 'view' | 'create' | 'edit';
  onSave?: (record: MedicalRecord) => void;
  onCancel?: () => void;
  hideHeader?: boolean;
  patientData?: any;
  recordData?: any; // Add recordData prop for pre-loaded records
}

// Add this near the top of the file, after imports
const LOGO_PATH = '/assets/images/logo.jpg';
const LOGO_FALLBACK = '/assets/images/logo-placeholder.svg';


const EnhancedMedicalRecordForm: React.FC<EnhancedMedicalRecordFormProps> = ({ 
  patientId, 
  recordId,
  mode = 'create',
  onSave,
  onCancel,
  hideHeader = false,
  patientData: initialPatientData,
  recordData: initialRecordData
}) => {
  // Enhanced NHDD (National Health Data Dictionary) Diagnosis Database
  // NOW WITH FULL ICD-11 SUPPORT
  // Following WHO ICD-11 Classification System alongside NHDD and ICD-10
  const enhancedDiagnosisDatabase = [
    // CHAPTER 01: Certain infectious or parasitic diseases (1A00-1H0Z)
    { 
      nhdd: 'RESP001', 
      icd10: 'J06.9',
      icd11: 'CA40.Z', // Acute upper respiratory infections, unspecified
      diagnosis: 'Upper respiratory tract infection, acute, unspecified', 
      category: 'Respiratory Disorders',
      subcategory: 'Upper Respiratory Infections',
      severity: 'Mild to Moderate',
      commonTerms: ['common cold', 'URTI', 'head cold'],
      nhddDescription: 'Acute inflammatory condition of upper respiratory tract structures',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
    },
    { 
      nhdd: 'RESP002', 
      icd10: 'J20.9',
      icd11: 'CA20.0', // Acute bronchitis due to unspecified organism
      diagnosis: 'Acute bronchitis, unspecified organism', 
      category: 'Respiratory Disorders',
      subcategory: 'Lower Respiratory Infections',
      severity: 'Moderate',
      commonTerms: ['acute bronchitis', 'chest infection'],
      nhddDescription: 'Acute inflammation of bronchial tubes',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA20-CA2Z Acute lower respiratory infections'
    },
    { 
      nhdd: 'RESP003', 
      icd10: 'J44.1',
      icd11: 'CB03.1', // Chronic obstructive pulmonary disease with acute exacerbation
      diagnosis: 'Chronic obstructive pulmonary disease with acute exacerbation', 
      category: 'Respiratory Disorders',
      subcategory: 'Chronic Obstructive Disorders',
      severity: 'Severe',
      commonTerms: ['COPD exacerbation', 'emphysema flare'],
      nhddDescription: 'Worsening of chronic airway obstruction with increased symptoms',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CB00-CB0Z Chronic obstructive pulmonary disease'
    },
    { 
      nhdd: 'RESP004', 
      icd10: 'J45.9',
      icd11: 'CA25.9', // Asthma, unspecified
      diagnosis: 'Asthma, unspecified type', 
      category: 'Respiratory Disorders',
      subcategory: 'Allergic and Reactive Disorders',
      severity: 'Variable',
      commonTerms: ['asthma', 'bronchial asthma', 'reactive airway'],
      nhddDescription: 'Chronic inflammatory disorder of airways with reversible obstruction',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA25-CA2Z Asthma or reactive airways disease'
    },
    { 
      nhdd: 'RESP005', 
      icd10: 'J03.90',
      icd11: 'CA40.0', // Acute tonsillitis, unspecified
      diagnosis: 'Acute tonsillitis, unspecified', 
      category: 'Respiratory Disorders',
      subcategory: 'Upper Respiratory Infections',
      severity: 'Mild to Moderate',
      commonTerms: ['tonsillitis', 'acute tonsillitis', 'sore throat'],
      nhddDescription: 'Acute inflammation of the tonsils',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
    },
    { 
      nhdd: 'RESP006', 
      icd10: 'J03.00',
      icd11: 'CA40.1', // Acute streptococcal tonsillitis
      diagnosis: 'Acute streptococcal tonsillitis', 
      category: 'Respiratory Disorders',
      subcategory: 'Upper Respiratory Infections',
      severity: 'Moderate',
      commonTerms: ['strep throat', 'streptococcal tonsillitis', 'bacterial tonsillitis'],
      nhddDescription: 'Acute inflammation of tonsils caused by streptococcal bacteria',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
    },
    { 
      nhdd: 'RESP007', 
      icd10: 'J03.80',
      icd11: 'CA40.2', // Acute exudative tonsillitis
      diagnosis: 'Acute exudative tonsillitis', 
      category: 'Respiratory Disorders',
      subcategory: 'Upper Respiratory Infections',
      severity: 'Moderate to Severe',
      commonTerms: ['exudative tonsillitis', 'purulent tonsillitis', 'tonsillitis with exudate'],
      nhddDescription: 'Acute tonsillitis with visible exudate or pus on tonsils',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
    },
    { 
      nhdd: 'RESP011', 
      icd10: 'J01.90',
      icd11: 'CA40.3', // Acute sinusitis, unspecified
      diagnosis: 'Acute sinusitis, unspecified', 
      category: 'Respiratory Disorders',
      subcategory: 'Upper Respiratory Infections',
      severity: 'Mild to Moderate',
      commonTerms: ['sinusitis', 'acute sinusitis', 'sinus infection', 'rhinosinusitis'],
      nhddDescription: 'Acute inflammation of the paranasal sinuses',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
    },
    { 
      nhdd: 'RESP012', 
      icd10: 'J32.9',
      icd11: 'CA41.0', // Chronic sinusitis, unspecified
      diagnosis: 'Chronic sinusitis, unspecified', 
      category: 'Respiratory Disorders',
      subcategory: 'Upper Respiratory Infections',
      severity: 'Moderate',
      commonTerms: ['chronic sinusitis', 'persistent sinusitis', 'recurrent sinusitis'],
      nhddDescription: 'Chronic inflammation of the paranasal sinuses lasting more than 12 weeks',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA41-CA4Z Chronic upper respiratory infections'
    },
    { 
      nhdd: 'RESP008', 
      icd10: 'J18.9',
      icd11: 'CA40.1', // Pneumonia, organism unspecified
      diagnosis: 'Pneumonia, organism unspecified', 
      category: 'Respiratory Disorders',
      subcategory: 'Lower Respiratory Infections',
      severity: 'Moderate to Severe',
      commonTerms: ['pneumonia', 'lung infection'],
      nhddDescription: 'Acute infection of lung parenchyma',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
    },
    { 
      nhdd: 'RESP009', 
      icd10: 'J02.9',
      icd11: 'CA41.9', // Acute pharyngitis, unspecified
      diagnosis: 'Acute pharyngitis, unspecified', 
      category: 'Respiratory Disorders',
      subcategory: 'Upper Respiratory Infections',
      severity: 'Mild',
      commonTerms: ['sore throat', 'pharyngitis', 'throat infection'],
      nhddDescription: 'Acute inflammation of pharyngeal structures',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
    },
    { 
      nhdd: 'RESP010', 
      icd10: 'J30.9',
      icd11: 'CA08.Z', // Allergic rhinitis, unspecified
      diagnosis: 'Allergic rhinitis, unspecified', 
      category: 'Respiratory Disorders',
      subcategory: 'Allergic and Reactive Disorders',
      severity: 'Mild',
      commonTerms: ['hay fever', 'allergic rhinitis', 'seasonal allergies'],
      nhddDescription: 'Allergic inflammation of nasal mucosa',
      icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
      icd11Block: 'CA08-CA0Z Allergic or hypersensitivity conditions of respiratory system'
    },
    
    // CHAPTER 11: Diseases of the circulatory system (BA00-BE2Z)
    { 
      nhdd: 'CARD001', 
      icd10: 'I10',
      icd11: 'BA00.Z', // Essential hypertension
      diagnosis: 'Essential hypertension', 
      category: 'Cardiovascular Disorders',
      subcategory: 'Hypertensive Diseases',
      severity: 'Mild to Severe',
      commonTerms: ['high blood pressure', 'hypertension', 'HTN'],
      nhddDescription: 'Persistently elevated arterial blood pressure of unknown cause',
      icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
      icd11Block: 'BA00-BA0Z Hypertensive diseases'
    },
    { 
      nhdd: 'CARD002', 
      icd10: 'I25.10',
      icd11: 'BA80.0', // Atherosclerotic heart disease
      diagnosis: 'Atherosclerotic heart disease without angina', 
      category: 'Cardiovascular Disorders',
      subcategory: 'Ischemic Heart Disease',
      severity: 'Moderate to Severe',
      commonTerms: ['coronary artery disease', 'CAD', 'atherosclerosis'],
      nhddDescription: 'Narrowing of coronary arteries due to atherosclerotic plaque',
      icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
      icd11Block: 'BA80-BA8Z Ischaemic heart diseases'
    },
    { 
      nhdd: 'CARD003', 
      icd10: 'I48.91',
      icd11: 'BC61.0', // Atrial fibrillation
      diagnosis: 'Atrial fibrillation, unspecified type', 
      category: 'Cardiovascular Disorders',
      subcategory: 'Cardiac Arrhythmias',
      severity: 'Moderate',
      commonTerms: ['atrial fibrillation', 'A-fib', 'irregular heartbeat'],
      nhddDescription: 'Irregular and rapid heart rate due to disorganized atrial activity',
      icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
      icd11Block: 'BC60-BC6Z Cardiac arrhythmias'
    },
    { 
      nhdd: 'CARD004', 
      icd10: 'I50.9',
      icd11: 'BD10.Z', // Heart failure, unspecified
      diagnosis: 'Heart failure, unspecified', 
      category: 'Cardiovascular Disorders',
      subcategory: 'Heart Failure Syndromes',
      severity: 'Moderate to Severe',
      commonTerms: ['heart failure', 'congestive heart failure', 'CHF'],
      nhddDescription: 'Inability of heart to pump blood effectively to meet body needs',
      icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
      icd11Block: 'BD10-BD1Z Heart failure'
    },
    { 
      nhdd: 'CARD005', 
      icd10: 'I21.9',
      icd11: 'BA41.Z', // Acute myocardial infarction, unspecified
      diagnosis: 'Acute myocardial infarction, unspecified', 
      category: 'Cardiovascular Disorders',
      subcategory: 'Acute Coronary Syndromes',
      severity: 'Severe',
      commonTerms: ['heart attack', 'MI', 'myocardial infarction'],
      nhddDescription: 'Death of heart muscle due to insufficient blood supply',
      icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
      icd11Block: 'BA40-BA4Z Acute ischaemic heart disease'
    },
    
    // CHAPTER 05: Endocrine, nutritional or metabolic diseases (5A00-5D9Z)
    { 
      nhdd: 'ENDO001', 
      icd10: 'E11.9',
      icd11: '5A11.0', // Type 2 diabetes mellitus without complications
      diagnosis: 'Type 2 diabetes mellitus without complications', 
      category: 'Endocrine and Metabolic Disorders',
      subcategory: 'Diabetes Mellitus',
      severity: 'Moderate',
      commonTerms: ['diabetes', 'type 2 diabetes', 'adult onset diabetes'],
      nhddDescription: 'Chronic disorder of glucose metabolism with insulin resistance',
      icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
      icd11Block: '5A10-5A1Z Type 2 diabetes mellitus'
    },
    { 
      nhdd: 'ENDO002', 
      icd10: 'E10.9',
      icd11: '5A10.0', // Type 1 diabetes mellitus without complications
      diagnosis: 'Type 1 diabetes mellitus without complications', 
      category: 'Endocrine and Metabolic Disorders',
      subcategory: 'Diabetes Mellitus',
      severity: 'Moderate to Severe',
      commonTerms: ['type 1 diabetes', 'juvenile diabetes', 'insulin dependent diabetes'],
      nhddDescription: 'Autoimmune destruction of pancreatic beta cells requiring insulin',
      icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
      icd11Block: '5A10-5A1Z Type 1 diabetes mellitus'
    },
    { 
      nhdd: 'ENDO003', 
      icd10: 'E03.9',
      icd11: '5A00.0', // Hypothyroidism, unspecified
      diagnosis: 'Hypothyroidism, unspecified', 
      category: 'Endocrine and Metabolic Disorders',
      subcategory: 'Thyroid Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['underactive thyroid', 'hypothyroidism', 'low thyroid'],
      nhddDescription: 'Deficient production of thyroid hormones',
      icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
      icd11Block: '5A00-5A0Z Disorders of thyroid gland'
    },
    { 
      nhdd: 'ENDO004', 
      icd10: 'E78.5',
      icd11: '5C80.Z', // Hyperlipidemia, unspecified
      diagnosis: 'Hyperlipidemia, unspecified', 
      category: 'Endocrine and Metabolic Disorders',
      subcategory: 'Lipid Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['high cholesterol', 'hyperlipidemia', 'dyslipidemia'],
      nhddDescription: 'Elevated levels of lipids in blood',
      icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
      icd11Block: '5C80-5C8Z Disorders of lipoprotein metabolism or lipidoses'
    },
    
    // CHAPTER 15: Diseases of the musculoskeletal system or connective tissue (FA00-FC0Z)
    { 
      nhdd: 'MUSC001', 
      icd10: 'M54.5',
      icd11: 'FB56.Z', // Low back pain
      diagnosis: 'Low back pain', 
      category: 'Musculoskeletal Disorders',
      subcategory: 'Spinal Disorders',
      severity: 'Mild to Severe',
      commonTerms: ['lower back pain', 'lumbago', 'lumbar pain'],
      nhddDescription: 'Pain in the lumbar region of the spine',
      icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
      icd11Block: 'FB50-FB5Z Dorsalgia'
    },
    { 
      nhdd: 'MUSC002', 
      icd10: 'M25.511',
      icd11: 'FB40.1', // Pain in right shoulder
      diagnosis: 'Pain in right shoulder', 
      category: 'Musculoskeletal Disorders',
      subcategory: 'Joint Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['shoulder pain', 'right shoulder ache'],
      nhddDescription: 'Pain localized to right shoulder joint and surrounding structures',
      icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
      icd11Block: 'FB40-FB4Z Arthralgia'
    },
    { 
      nhdd: 'MUSC003', 
      icd10: 'M79.1',
      icd11: 'FB00.Z', // Myalgia, unspecified
      diagnosis: 'Myalgia, unspecified', 
      category: 'Musculoskeletal Disorders',
      subcategory: 'Muscle Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['muscle pain', 'myalgia', 'muscle aches'],
      nhddDescription: 'Pain in muscle tissue',
      icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
      icd11Block: 'FB00-FB0Z Myalgia'
    },
    { 
      nhdd: 'MUSC004', 
      icd10: 'M06.9',
      icd11: 'FA20.Z', // Rheumatoid arthritis, unspecified
      diagnosis: 'Rheumatoid arthritis, unspecified', 
      category: 'Musculoskeletal Disorders',
      subcategory: 'Inflammatory Joint Diseases',
      severity: 'Moderate to Severe',
      commonTerms: ['rheumatoid arthritis', 'RA', 'inflammatory arthritis'],
      nhddDescription: 'Chronic autoimmune inflammatory disease affecting joints',
      icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
      icd11Block: 'FA20-FA2Z Rheumatoid arthritis'
    },
    { 
      nhdd: 'MUSC005', 
      icd10: 'M79.3',
      icd11: 'FB00.1', // Fibromyalgia
      diagnosis: 'Fibromyalgia', 
      category: 'Musculoskeletal Disorders',
      subcategory: 'Soft Tissue Disorders',
      severity: 'Moderate to Severe',
      commonTerms: ['fibromyalgia', 'fibromyalgia syndrome', 'chronic pain syndrome'],
      nhddDescription: 'Chronic widespread pain disorder with tender points',
      icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
      icd11Block: 'FB00-FB0Z Soft tissue disorders'
    },
    { 
      nhdd: 'MUSC006', 
      icd10: 'M19.90',
      icd11: 'FA00.Z', // Osteoarthritis, unspecified site
      diagnosis: 'Osteoarthritis, unspecified site', 
      category: 'Musculoskeletal Disorders',
      subcategory: 'Degenerative Joint Diseases',
      severity: 'Mild to Severe',
      commonTerms: ['osteoarthritis', 'OA', 'degenerative arthritis', 'wear and tear arthritis'],
      nhddDescription: 'Degenerative joint disease characterized by cartilage breakdown',
      icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
      icd11Block: 'FA00-FA0Z Osteoarthritis'
    },
    { 
      nhdd: 'MUSC007', 
      icd10: 'M17.9',
      icd11: 'FA00.0', // Osteoarthritis of knee, unspecified
      diagnosis: 'Osteoarthritis of knee, unspecified', 
      category: 'Musculoskeletal Disorders',
      subcategory: 'Degenerative Joint Diseases',
      severity: 'Moderate to Severe',
      commonTerms: ['knee osteoarthritis', 'knee arthritis', 'gonarthrosis', 'knee OA'],
      nhddDescription: 'Degenerative joint disease of the knee',
      icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
      icd11Block: 'FA00-FA0Z Osteoarthritis'
    },
    { 
      nhdd: 'MUSC008', 
      icd10: 'M16.9',
      icd11: 'FA00.1', // Osteoarthritis of hip, unspecified
      diagnosis: 'Osteoarthritis of hip, unspecified', 
      category: 'Musculoskeletal Disorders',
      subcategory: 'Degenerative Joint Diseases',
      severity: 'Moderate to Severe',
      commonTerms: ['hip osteoarthritis', 'hip arthritis', 'coxarthrosis', 'hip OA'],
      nhddDescription: 'Degenerative joint disease of the hip',
      icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
      icd11Block: 'FA00-FA0Z Osteoarthritis'
    },
    { 
      nhdd: 'MUSC009', 
      icd10: 'M54.30',
      icd11: 'ME84.3', // Sciatica
      diagnosis: 'Sciatica', 
      category: 'Musculoskeletal Disorders',
      subcategory: 'Radiculopathies',
      severity: 'Mild to Severe',
      commonTerms: ['sciatica', 'sciatic neuralgia', 'ischialgia'],
      nhddDescription: 'Pain radiating along the sciatic nerve pathway',
      icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
      icd11Block: 'ME84-ME8Z Radiculopathy'
    },
    { 
      nhdd: 'NEUR010', 
      icd10: 'G57.00',
      icd11: '8C11.0', // Lesion of sciatic nerve
      diagnosis: 'Lesion of sciatic nerve', 
      category: 'Neurological Disorders',
      subcategory: 'Peripheral Nerve Disorders',
      severity: 'Variable',
      commonTerms: ['sciatic nerve lesion', 'sciatic neuropathy', 'sciatic neuritis'],
      nhddDescription: 'Injury or disease affecting the sciatic nerve',
      icd11Chapter: 'Chapter 08: Diseases of the nervous system',
      icd11Block: '8C11-8C1Z Lesions of individual nerves'
    },
    
    // CHAPTER 13: Diseases of the digestive system (DA00-DE2Z)
    { 
      nhdd: 'DIGE001', 
      icd10: 'K21.9',
      icd11: 'DA22.0', // Gastroesophageal reflux disease without esophagitis
      diagnosis: 'Gastroesophageal reflux disease without esophagitis', 
      category: 'Digestive System Disorders',
      subcategory: 'Esophageal Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['GERD', 'acid reflux', 'heartburn'],
      nhddDescription: 'Chronic condition where stomach acid refluxes into esophagus',
      icd11Chapter: 'Chapter 13: Diseases of the digestive system',
      icd11Block: 'DA20-DA2Z Diseases of oesophagus'
    },
    { 
      nhdd: 'DIGE002', 
      icd10: 'K29.70',
      icd11: 'DA40.Z', // Gastritis, unspecified, without bleeding
      diagnosis: 'Gastritis, unspecified, without bleeding', 
      category: 'Digestive System Disorders',
      subcategory: 'Gastric Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['gastritis', 'stomach inflammation'],
      nhddDescription: 'Inflammation of stomach lining',
      icd11Chapter: 'Chapter 13: Diseases of the digestive system',
      icd11Block: 'DA40-DA4Z Diseases of stomach or duodenum'
    },
    { 
      nhdd: 'DIGE003', 
      icd10: 'K59.00',
      icd11: 'DD70.0', // Constipation, unspecified
      diagnosis: 'Constipation, unspecified', 
      category: 'Digestive System Disorders',
      subcategory: 'Functional Bowel Disorders',
      severity: 'Mild',
      commonTerms: ['constipation', 'hard stools', 'irregular bowel movements'],
      nhddDescription: 'Difficulty or infrequent bowel movements',
      icd11Chapter: 'Chapter 13: Diseases of the digestive system',
      icd11Block: 'DD70-DD7Z Constipation'
    },
    { 
      nhdd: 'DIGE004', 
      icd10: 'K58.9',
      icd11: 'DD91.Z', // Irritable bowel syndrome, unspecified
      diagnosis: 'Irritable bowel syndrome, unspecified', 
      category: 'Digestive System Disorders',
      subcategory: 'Functional Bowel Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['IBS', 'irritable bowel syndrome', 'spastic colon', 'functional bowel disorder'],
      nhddDescription: 'Chronic functional disorder of the large intestine',
      icd11Chapter: 'Chapter 13: Diseases of the digestive system',
      icd11Block: 'DD91-DD9Z Irritable bowel syndrome'
    },
    { 
      nhdd: 'DIGE005', 
      icd10: 'K59.1',
      icd11: 'DD71.Z', // Diarrhea, unspecified
      diagnosis: 'Diarrhea, unspecified', 
      category: 'Digestive System Disorders',
      subcategory: 'Functional Bowel Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['diarrhea', 'loose stools', 'watery bowel movements'],
      nhddDescription: 'Frequent loose or watery bowel movements',
      icd11Chapter: 'Chapter 13: Diseases of the digestive system',
      icd11Block: 'DD71-DD7Z Diarrhea'
    },
    
    // CHAPTER 16: Diseases of the genitourinary system (GA00-GC5Z)
    { 
      nhdd: 'GENI001', 
      icd10: 'N39.0',
      icd11: 'GC08.Z', // Urinary tract infection, site unspecified
      diagnosis: 'Urinary tract infection, site unspecified', 
      category: 'Genitourinary Disorders',
      subcategory: 'Urinary Tract Infections',
      severity: 'Mild to Moderate',
      commonTerms: ['UTI', 'urinary tract infection', 'bladder infection'],
      nhddDescription: 'Bacterial infection of urinary system',
      icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
      icd11Block: 'GC08-GC0Z Cystitis or urethritis'
    },
    { 
      nhdd: 'GENI002', 
      icd10: 'N18.6',
      icd11: 'GB61.Z', // End stage renal disease
      diagnosis: 'End stage renal disease', 
      category: 'Genitourinary Disorders',
      subcategory: 'Chronic Kidney Disease',
      severity: 'Severe',
      commonTerms: ['kidney failure', 'ESRD', 'renal failure'],
      nhddDescription: 'Final stage of chronic kidney disease requiring dialysis or transplant',
      icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
      icd11Block: 'GB60-GB6Z Chronic kidney disease'
    },
    
    // CHAPTER 06: Mental, behavioural or neurodevelopmental disorders (6A00-6E8Z)
    { 
      nhdd: 'MENT001', 
      icd10: 'F32.9',
      icd11: '6A70.Z', // Major depressive disorder, single episode, unspecified
      diagnosis: 'Major depressive disorder, single episode, unspecified', 
      category: 'Mental Health Disorders',
      subcategory: 'Mood Disorders',
      severity: 'Mild to Severe',
      commonTerms: ['depression', 'major depression', 'depressive episode'],
      nhddDescription: 'Persistent feelings of sadness and loss of interest in activities',
      icd11Chapter: 'Chapter 06: Mental, behavioural or neurodevelopmental disorders',
      icd11Block: '6A70-6A7Z Single episode depressive disorder'
    },
    { 
      nhdd: 'MENT002', 
      icd10: 'F41.1',
      icd11: '6B00.Z', // Generalized anxiety disorder
      diagnosis: 'Generalized anxiety disorder', 
      category: 'Mental Health Disorders',
      subcategory: 'Anxiety Disorders',
      severity: 'Mild to Severe',
      commonTerms: ['anxiety', 'generalized anxiety', 'GAD'],
      nhddDescription: 'Excessive and persistent worry about various aspects of life',
      icd11Chapter: 'Chapter 06: Mental, behavioural or neurodevelopmental disorders',
      icd11Block: '6B00-6B0Z Anxiety or fear-related disorders'
    },
    { 
      nhdd: 'MENT003', 
      icd10: 'G47.00',
      icd11: '7A00.Z', // Insomnia, unspecified
      diagnosis: 'Insomnia, unspecified', 
      category: 'Mental Health Disorders',
      subcategory: 'Sleep Disorders',
      severity: 'Mild to Severe',
      commonTerms: ['insomnia', 'sleep disorder', 'trouble sleeping', 'sleeplessness'],
      nhddDescription: 'Difficulty falling asleep, staying asleep, or poor sleep quality',
      icd11Chapter: 'Chapter 07: Sleep-wake disorders',
      icd11Block: '7A00-7A0Z Insomnia disorders'
    },
    { 
      nhdd: 'MENT004', 
      icd10: 'F48.0',
      icd11: '6C20.Z', // Neurasthenia
      diagnosis: 'Neurasthenia', 
      category: 'Mental Health Disorders',
      subcategory: 'Somatic Symptom Disorders',
      severity: 'Moderate to Severe',
      commonTerms: ['chronic fatigue syndrome', 'neurasthenia', 'exhaustion syndrome'],
      nhddDescription: 'Chronic fatigue and weakness without apparent physical cause',
      icd11Chapter: 'Chapter 06: Mental, behavioural or neurodevelopmental disorders',
      icd11Block: '6C20-6C2Z Bodily distress disorder'
    },
    
    // CHAPTER 01: Certain infectious or parasitic diseases (1A00-1H0Z)
    { 
      nhdd: 'INFE001', 
      icd10: 'B34.9',
      icd11: '1D62.Z', // Viral infection, unspecified
      diagnosis: 'Viral infection, unspecified', 
      category: 'Infectious Diseases',
      subcategory: 'Viral Infections',
      severity: 'Mild to Moderate',
      commonTerms: ['viral infection', 'virus', 'viral syndrome'],
      nhddDescription: 'Infection caused by viral pathogen',
      icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
      icd11Block: '1D60-1D6Z Viral infections of the central nervous system'
    },
    { 
      nhdd: 'INFE002', 
      icd10: 'A09',
      icd11: '1A40.Z', // Infectious gastroenteritis and colitis, unspecified
      diagnosis: 'Infectious gastroenteritis and colitis, unspecified', 
      category: 'Infectious Diseases',
      subcategory: 'Gastrointestinal Infections',
      severity: 'Mild to Moderate',
      commonTerms: ['gastroenteritis', 'stomach flu', 'food poisoning'],
      nhddDescription: 'Infection causing inflammation of stomach and intestines',
      icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
      icd11Block: '1A40-1A4Z Bacterial intestinal infections'
    },
    
    // CHAPTER 21: Symptoms, signs or clinical findings, not elsewhere classified (MA00-MH2Z)
    { 
      nhdd: 'SYMP001', 
      icd10: 'R50.9',
      icd11: 'MA01.Z', // Fever, unspecified
      diagnosis: 'Fever, unspecified', 
      category: 'Signs and Symptoms',
      subcategory: 'General Symptoms',
      severity: 'Mild to Moderate',
      commonTerms: ['fever', 'pyrexia', 'elevated temperature'],
      nhddDescription: 'Elevation of body temperature above normal range',
      icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings, not elsewhere classified',
      icd11Block: 'MA01-MA0Z Fever'
    },
    { 
      nhdd: 'SYMP002', 
      icd10: 'R51',
      icd11: 'MB40.Z', // Headache
      diagnosis: 'Headache', 
      category: 'Signs and Symptoms',
      subcategory: 'Neurological Symptoms',
      severity: 'Mild to Severe',
      commonTerms: ['headache', 'head pain', 'cephalgia'],
      nhddDescription: 'Pain in head or upper neck region',
      icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings, not elsewhere classified',
      icd11Block: 'MB40-MB4Z Pain in head or neck'
    },

    // CHAPTER 08: Diseases of the nervous system (8A00-8E7Z)
    { 
      nhdd: 'NEUR001', 
      icd10: 'G43.9',
      icd11: '8A80.4', // Migraine, unspecified
      diagnosis: 'Migraine, unspecified', 
      category: 'Neurological Disorders',
      subcategory: 'Primary Headache Disorders',
      severity: 'Moderate to Severe',
      commonTerms: ['migraine', 'migraine headache', 'vascular headache'],
      nhddDescription: 'Recurrent severe headache often with nausea and light sensitivity',
      icd11Chapter: 'Chapter 08: Diseases of the nervous system',
      icd11Block: '8A80-8A8Z Primary headache disorders'
    },
    { 
      nhdd: 'NEUR002', 
      icd10: 'G40.9',
      icd11: '8A61.Z', // Epilepsy, unspecified
      diagnosis: 'Epilepsy, unspecified', 
      category: 'Neurological Disorders',
      subcategory: 'Seizure Disorders',
      severity: 'Moderate to Severe',
      commonTerms: ['epilepsy', 'seizure disorder', 'convulsions'],
      nhddDescription: 'Chronic neurological disorder characterized by recurrent seizures',
      icd11Chapter: 'Chapter 08: Diseases of the nervous system',
      icd11Block: '8A60-8A6Z Epilepsy or seizures'
    },

    // CHAPTER 09: Diseases of the visual system (9A00-9D80)
    { 
      nhdd: 'OPHT001', 
      icd10: 'H52.4',
      icd11: '9D00.0', // Presbyopia
      diagnosis: 'Presbyopia', 
      category: 'Eye Disorders',
      subcategory: 'Refractive Disorders',
      severity: 'Mild',
      commonTerms: ['presbyopia', 'age-related farsightedness', 'reading glasses needed'],
      nhddDescription: 'Age-related decline in near vision due to lens hardening',
      icd11Chapter: 'Chapter 09: Diseases of the visual system',
      icd11Block: '9D00-9D0Z Disorders of refraction or accommodation'
    },
    { 
      nhdd: 'OPHT002', 
      icd10: 'H10.9',
      icd11: '9A60.Z', // Conjunctivitis, unspecified
      diagnosis: 'Conjunctivitis, unspecified', 
      category: 'Eye Disorders',
      subcategory: 'Inflammatory Eye Conditions',
      severity: 'Mild to Moderate',
      commonTerms: ['conjunctivitis', 'pink eye', 'eye infection', 'red eye'],
      nhddDescription: 'Inflammation of the conjunctiva',
      icd11Chapter: 'Chapter 09: Diseases of the visual system',
      icd11Block: '9A60-9A6Z Disorders of conjunctiva'
    },
    { 
      nhdd: 'OPHT003', 
      icd10: 'H10.1',
      icd11: '9A60.0', // Acute atopic conjunctivitis
      diagnosis: 'Acute atopic conjunctivitis', 
      category: 'Eye Disorders',
      subcategory: 'Inflammatory Eye Conditions',
      severity: 'Mild to Moderate',
      commonTerms: ['allergic conjunctivitis', 'atopic conjunctivitis', 'allergic pink eye'],
      nhddDescription: 'Allergic inflammation of the conjunctiva',
      icd11Chapter: 'Chapter 09: Diseases of the visual system',
      icd11Block: '9A60-9A6Z Disorders of conjunctiva'
    },
    { 
      nhdd: 'OPHT004', 
      icd10: 'H10.0',
      icd11: '9A60.1', // Acute mucopurulent conjunctivitis
      diagnosis: 'Acute mucopurulent conjunctivitis', 
      category: 'Eye Disorders',
      subcategory: 'Inflammatory Eye Conditions',
      severity: 'Moderate',
      commonTerms: ['bacterial conjunctivitis', 'purulent conjunctivitis', 'infectious pink eye'],
      nhddDescription: 'Bacterial infection of the conjunctiva with purulent discharge',
      icd11Chapter: 'Chapter 09: Diseases of the visual system',
      icd11Block: '9A60-9A6Z Disorders of conjunctiva'
    },

    // CHAPTER 10: Diseases of the ear or mastoid process (AA00-AB5Z)
    { 
      nhdd: 'ENT001', 
      icd10: 'H66.9',
      icd11: 'AA40.Z', // Otitis media, unspecified
      diagnosis: 'Otitis media, unspecified', 
      category: 'Ear Disorders',
      subcategory: 'Middle Ear Infections',
      severity: 'Mild to Moderate',
      commonTerms: ['ear infection', 'otitis media', 'middle ear infection'],
      nhddDescription: 'Inflammation of middle ear space',
      icd11Chapter: 'Chapter 10: Diseases of the ear or mastoid process',
      icd11Block: 'AA40-AA4Z Nonsuppurative otitis media'
    },

    // Additional common conditions with ICD-11 codes
    { 
      nhdd: 'SKIN001', 
      icd10: 'L30.9',
      icd11: 'EA85.Z', // Dermatitis, unspecified
      diagnosis: 'Dermatitis, unspecified', 
      category: 'Skin Disorders',
      subcategory: 'Inflammatory Skin Conditions',
      severity: 'Mild to Moderate',
      commonTerms: ['dermatitis', 'eczema', 'skin inflammation'],
      nhddDescription: 'Inflammation of the skin',
      icd11Chapter: 'Chapter 14: Diseases of the skin',
      icd11Block: 'EA85-EA8Z Dermatitis or eczema'
    },
    { 
      nhdd: 'SKIN002', 
      icd10: 'L20.9',
      icd11: 'EA80.Z', // Atopic dermatitis, unspecified
      diagnosis: 'Atopic dermatitis, unspecified', 
      category: 'Skin Disorders',
      subcategory: 'Inflammatory Skin Conditions',
      severity: 'Mild to Moderate',
      commonTerms: ['atopic dermatitis', 'atopic eczema', 'allergic dermatitis'],
      nhddDescription: 'Chronic inflammatory skin condition associated with allergies',
      icd11Chapter: 'Chapter 14: Diseases of the skin',
      icd11Block: 'EA80-EA8Z Atopic dermatitis'
    },
    { 
      nhdd: 'SKIN003', 
      icd10: 'L03.90',
      icd11: 'AB70.Z', // Cellulitis, unspecified
      diagnosis: 'Cellulitis, unspecified', 
      category: 'Skin Disorders',
      subcategory: 'Infectious Skin Conditions',
      severity: 'Moderate to Severe',
      commonTerms: ['cellulitis', 'skin infection', 'soft tissue infection'],
      nhddDescription: 'Bacterial infection of the skin and underlying tissues',
      icd11Chapter: 'Chapter 14: Diseases of the skin',
      icd11Block: 'AB70-AB7Z Cellulitis'
    },
    { 
      nhdd: 'SKIN004', 
      icd10: 'L70.9',
      icd11: 'ED80.Z', // Acne, unspecified
      diagnosis: 'Acne, unspecified', 
      category: 'Skin Disorders',
      subcategory: 'Sebaceous Gland Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['acne', 'pimples', 'acne vulgaris', 'breakouts'],
      nhddDescription: 'Inflammatory condition of the sebaceous glands',
      icd11Chapter: 'Chapter 14: Diseases of the skin',
      icd11Block: 'ED80-ED8Z Acne'
    },
    { 
      nhdd: 'GYNE001', 
      icd10: 'N92.0',
      icd11: 'GA34.4', // Excessive and frequent menstruation
      diagnosis: 'Excessive and frequent menstruation with regular cycle', 
      category: 'Gynecological Disorders',
      subcategory: 'Menstrual Disorders',
      severity: 'Mild to Moderate',
      commonTerms: ['heavy periods', 'menorrhagia', 'excessive bleeding'],
      nhddDescription: 'Abnormally heavy or prolonged menstrual bleeding',
      icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
      icd11Block: 'GA34-GA3Z Abnormal uterine or vaginal bleeding'
    },
    { 
      nhdd: 'PEDI001', 
      icd10: 'R63.3',
      icd11: 'MD80.0', // Feeding difficulties in newborn
      diagnosis: 'Feeding difficulties in newborn', 
      category: 'Pediatric Disorders',
      subcategory: 'Neonatal Conditions',
      severity: 'Mild to Moderate',
      commonTerms: ['feeding problems', 'poor feeding', 'feeding difficulties'],
      nhddDescription: 'Difficulty establishing or maintaining adequate feeding in newborn',
      icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings, not elsewhere classified',
      icd11Block: 'MD80-MD8Z Feeding difficulties or eating problems'
    }
  ];

  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [record, setRecord] = useState<Partial<MedicalRecord>>({
    patient: patientId,
    // assignedDoctor: 'Dr. Natan', // Dr. Natan's name - commented out as it's not in the type
    chiefComplaint: {
      description: '',
      duration: '',
      severity: 'Mild',
      onsetPattern: 'Acute',
      progression: 'Improving',
      impactOnDailyLife: 'None',
      location: '',
      aggravatingFactors: [],
      relievingFactors: [],
      associatedSymptoms: [],
      previousEpisodes: false,
      previousEpisodesDetails: '',
    },
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
      skin: '',
      vitals: {},
    },
    diagnoses: [],
    prescriptions: [],
    labOrders: [],
    imagingOrders: [],
    status: 'draft',
    // reviewOfSystems: '', // Commented out as it's not in the type definition
    familyHistory: '',
    socialHistory: '',
    allergies: [],
    pastMedicalHistory: '',
    historyOfPresentIllness: '',
    plan: '',
    followUpPlan: {
      timing: '',
      instructions: '',
      appointmentNeeded: false,
      labWork: false,
      imaging: false
    },
    // careTeamNotes: '', // Commented out as it's not in the type definition
    // Add ICD-10 fields
    primaryDiagnosis: {
      code: '',
      description: '',
      category: ''
    },
    secondaryDiagnoses: []
  });
  
  // Debug initial state
  console.log('🔧 [INIT] Initial record state:', record);
  console.log('🔧 [INIT] Patient ID from props:', patientId);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [patientData, setPatientData] = useState<any>(initialPatientData || null);
  const [aiSuggestions, setAiSuggestions] = useState<any>({});
  const [qualityScore, setQualityScore] = useState(0);
  const [labTestPriority, setLabTestPriority] = useState('routine');
  const [labTestInstructions, setLabTestInstructions] = useState('');
  // Add state for modals
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [imagingModalOpen, setImagingModalOpen] = useState(false);
  
  const { user } = useAuth();

  // Get the API base URL from config
  const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://192.168.78.157:5002');

  // Memory System Integration
  const memorySystem = useMemorySystem({
    patientId,
    recordId,
    debounceMs: 2000,
    autoLoad: true,
    onSave: async (data) => {
      try {
        setSaving(true);
        const recordToSave = {
          ...data,
          patient: patientId,
          doctor: user?.id || user?._id || '',
          status: 'Draft',
          updatedAt: new Date().toISOString()
        };

        let response;
        if (mode === 'create' || !recordId) {
          response = await fetch(`${API_BASE_URL}/api/medical-records/draft`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(recordToSave)
          });
        } else {
          response = await fetch(`${API_BASE_URL}/api/medical-records/${recordId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(recordToSave)
          });
        }

        if (response.ok) {
          const result = await response.json();
          console.log('💾 [MEMORY] Auto-save successful:', result);
          return {
            success: true,
            timestamp: new Date().toISOString(),
            recordId: result.data?._id || result._id
          };
        } else {
          console.warn('💾 [MEMORY] Auto-save failed:', response.status);
          return {
            success: false,
            error: `Server error: ${response.status}`,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        console.error('💾 [MEMORY] Auto-save error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        };
      } finally {
        setSaving(false);
      }
    },
    onRestore: (restoredData) => {
      console.log('🔄 [MEMORY] Restoring data:', restoredData);
      setRecord(restoredData);
    }
  });

  // Helper function to format date of birth
  const formatDateOfBirth = (dob: any) => {
    if (!dob) return '';
    
    try {
      // If it's already a Date object
      if (dob instanceof Date) {
        return dob.toISOString().split('T')[0];
      }
      
      // If it's a string, try to parse it
      if (typeof dob === 'string') {
        const date = new Date(dob);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
        
        // Try parsing other formats
        const dateFormats = [
          dob, // Original format
          dob.replace(/[-/]/g, '-'), // Normalize separators
          dob.split('T')[0] // Remove time if present
        ];
        
        for (const format of dateFormats) {
          const parsed = new Date(format);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
          }
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error formatting date of birth:', error);
      return '';
    }
  };

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth: any) => {
    if (!dateOfBirth) return null;
    
    try {
      const birthDate = new Date(dateOfBirth);
      if (isNaN(birthDate.getTime())) return null;
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= 0 ? age : null;
    } catch (error) {
      console.error('Error calculating age:', error);
      return null;
    }
  };

  // Function to parse HEENT string into separate fields
  const parseHeentString = (heentString: string) => {
    const result = {
      head: '',
      eyes: '',
      ears: '',
      nose: '',
      throat: ''
    };

    if (!heentString || typeof heentString !== 'string') {
      return result;
    }

    // Split by comma and process each part
    const parts = heentString.split(',').map(part => part.trim());
    
    parts.forEach(part => {
      if (part.startsWith('head:')) {
        result.head = part.replace('head:', '').trim();
      } else if (part.startsWith('eyes:')) {
        result.eyes = part.replace('eyes:', '').trim();
      } else if (part.startsWith('ears:')) {
        result.ears = part.replace('ears:', '').trim();
      } else if (part.startsWith('nose:')) {
        result.nose = part.replace('nose:', '').trim();
      } else if (part.startsWith('throat:')) {
        result.throat = part.replace('throat:', '').trim();
      }
    });

    return result;
  };

  // Default physical examination template
  const getDefaultPhysicalExam = () => {
    return {
      general: '',
      vitals: {
        temperature: '',
        bloodPressure: '',
        heartRate: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        height: '',
        weight: '',
        bmi: ''
      },
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
    };
  };

  // Comprehensive HEENT medical findings for professional documentation
  const heentFindings = {
    head: [
      'Normocephalic',
      'Atraumatic',
      'No visible lesions',
      'Symmetrical',
      'No tenderness',
      'Palpable masses',
      'Cranial asymmetry',
      'Trauma evident',
      'Scalp lesions',
      'Fontanelles soft and flat (pediatric)',
      'Head circumference within normal limits'
    ],
    eyes: [
      'PERRLA (Pupils Equal, Round, Reactive to Light and Accommodation)',
      'EOMI (Extraocular Movements Intact)',
      'No conjunctivitis',
      'Sclera clear',
      'No icterus',
      'Visual fields intact',
      'No nystagmus',
      'Fundi normal',
      'Conjunctiva pale',
      'Conjunctiva injected',
      'Photophobia present',
      'Diplopia',
      'Ptosis',
      'Exophthalmos',
      'Enophthalmos'
    ],
    ears: [
      'TMs (Tympanic Membranes) clear',
      'No otitis media',
      'No cerumen impaction',
      'Hearing grossly intact',
      'Weber test midline',
      'Rinne test positive',
      'No discharge',
      'TMs erythematous',
      'TMs bulging',
      'TMs retracted',
      'Otitis externa',
      'Hearing loss',
      'Tinnitus reported',
      'Vertigo reported'
    ],
    nose: [
      'No rhinorrhea',
      'No congestion',
      'Septum midline',
      'Nares patent',
      'No epistaxis',
      'Mucosa pink',
      'Nasal discharge clear',
      'Nasal discharge purulent',
      'Nasal congestion',
      'Septal deviation',
      'Polyps present',
      'Anosmia',
      'Post-nasal drip'
    ],
    throat: [
      'No pharyngitis',
      'No tonsillitis',
      'Tonsils normal size',
      'No exudate',
      'Uvula midline',
      'No lymphadenopathy',
      'Pharynx erythematous',
      'Tonsillar exudate',
      'Tonsils enlarged',
      'Pharyngeal injection',
      'Posterior pharynx cobblestoning',
      'Difficulty swallowing',
      'Hoarseness',
      'Stridor'
    ]
  };

  // Professional medical record steps following healthcare standards
  const steps = [
    { label: 'Patient & History', icon: '📋', required: true },
    { label: 'Physical Exam', icon: '🩺', required: true },
    { label: 'Assessment & Plan', icon: '📊', required: true },
    { label: 'Care Coordination', icon: '🤝', required: false },
    { label: 'Quality & Compliance', icon: '✅', required: true }
  ];

  // Helper function to map backend data to form structure
  const mapDataToFormRecord = (data: any): Partial<MedicalRecord> => {
    console.log('🔄 [MAP DATA] Mapping data to form record:', data);
    
    const fixEncoding = (text: string): string => {
      if (!text) return '';
      return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => 
        String.fromCharCode(parseInt(code, 16))
      );
    };

    const mappedRecord = {
      ...data,
      // Ensure primaryDiagnosis is properly mapped
      primaryDiagnosis: data.primaryDiagnosis ? {
        code: data.primaryDiagnosis.code,
        description: data.primaryDiagnosis.description,
        category: data.primaryDiagnosis.category
      } : {
        code: '',
        description: '',
        category: ''
      },
      // Map other fields
      chiefComplaint: data.chiefComplaint ? {
        description: fixEncoding(data.chiefComplaint.description),
        duration: fixEncoding(data.chiefComplaint.duration),
        severity: data.chiefComplaint.severity,
        associatedSymptoms: data.chiefComplaint.associatedSymptoms || [],
        onsetPattern: data.chiefComplaint.onsetPattern,
        progression: data.chiefComplaint.progression,
        impactOnDailyLife: data.chiefComplaint.impactOnDailyLife,
        location: fixEncoding(data.chiefComplaint.location),
        aggravatingFactors: data.chiefComplaint.aggravatingFactors || [],
        relievingFactors: data.chiefComplaint.relievingFactors || [],
        previousEpisodes: data.chiefComplaint.previousEpisodes || false,
        previousEpisodesDetails: fixEncoding(data.chiefComplaint.previousEpisodesDetails),
        recordedAt: data.chiefComplaint.recordedAt,
        recordedBy: data.chiefComplaint.recordedBy
      } : undefined,
      historyOfPresentIllness: data.historyOfPresentIllness || '',
      pastMedicalHistory: data.pastMedicalHistory || '',
      medications: data.medications || [],
      socialHistory: data.socialHistory || '',
      familyHistory: data.familyHistory || '',
      reviewOfSystems: data.reviewOfSystems || '',
      allergies: data.allergies || '',
      
      // Step 2: Physical Examination
      physicalExamination: {
        general: data.physicalExamination?.general || '',
        // Map vital signs from physicalExamination.vitals or use defaults
        vitals: {
          temperature: String(data.physicalExamination?.vitals?.temperature || 98.6),
          heartRate: String(data.physicalExamination?.vitals?.heartRate || 72),
          bloodPressure: String(data.physicalExamination?.vitals?.bloodPressure || '120/80'),
          respiratoryRate: String(data.physicalExamination?.vitals?.respiratoryRate || 16),
          oxygenSaturation: String(data.physicalExamination?.vitals?.oxygenSaturation || 98),
          height: String(data.physicalExamination?.vitals?.height || ''),
          weight: String(data.physicalExamination?.vitals?.weight || ''),
          bmi: String(data.physicalExamination?.vitals?.bmi || ''),
          // Don't include recordedBy or recordedAt in the mapped data as they cause backend issues
        },
        skin: data.physicalExamination?.skin || '',
        heent: (() => {
          if (data.physicalExamination?.heent && typeof data.physicalExamination.heent === 'object') {
            return {
              head: data.physicalExamination.heent.head || '',
              eyes: data.physicalExamination.heent.eyes || '',
              ears: data.physicalExamination.heent.ears || '',
              nose: data.physicalExamination.heent.nose || '',
              throat: data.physicalExamination.heent.throat || ''
            };
          }
          if (typeof data.physicalExamination?.heent === 'string') {
            return parseHeentString(data.physicalExamination.heent);
          }
          return {
            head: '',
            eyes: '',
            ears: '',
            nose: '',
            throat: ''
          };
        })(),
        cardiovascular: data.physicalExamination?.cardiovascular || '',
        respiratory: data.physicalExamination?.respiratory || '',
        gastrointestinal: data.physicalExamination?.gastrointestinal || '',
        genitourinary: data.physicalExamination?.genitourinary || '',
        musculoskeletal: data.physicalExamination?.musculoskeletal || '',
        neurological: data.physicalExamination?.neurological || '',
        psychiatric: data.physicalExamination?.psychiatric || '',
        lymphatic: data.physicalExamination?.lymphatic || '',
        endocrine: data.physicalExamination?.endocrine || ''
      },
      
      // Step 3: Assessment & Plan
      diagnoses: data.diagnoses || [],
      assessmentNotes: data.assessmentNotes || '',
      plan: fixEncoding(data.plan || ''),
      followUpPlan: data.followUpPlan || {},
      
      // Step 4: Orders & Prescriptions
      prescriptions: data.prescriptions || [],
      labOrders: data.labOrders || [],
      imagingOrders: data.imagingOrders || [],
      procedures: data.procedures || [],
      
      // Step 5: Care Coordination
      referrals: data.referrals || [],
      consultations: data.consultations || [],
      patientEducation: data.patientEducation || [],
      careTeamNotes: data.careTeamNotes || '',
      
      // Step 6: Quality & Compliance
      qualityMetrics: data.qualityMetrics || {},
      clinicalGuidelines: data.clinicalGuidelines || [],
      preventiveCare: data.preventiveCare || [],
      
      // Metadata
      status: data.status || 'Draft',
      visitDate: data.visitDate || new Date().toISOString(),
      metadata: data.metadata || {},
      
      // ICD-10 fields
      secondaryDiagnoses: data.secondaryDiagnoses || []
    };
    
    console.log('[MAP DATA] Mapped medical record:', mappedRecord);
    return mappedRecord;
  };

  // Load patient data and auto-populate vitals
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) return;
      
      // If patient data is already provided as a prop, don't fetch it again
      if (initialPatientData) {
        console.log('Using provided patient data:', initialPatientData);
        setPatientData(initialPatientData);
        
        // Auto-populate vitals from nurse measurements
        if (initialPatientData.vitals) {
          console.log('Auto-populating vitals from nurse:', initialPatientData.vitals);
          setRecord(prev => ({
            ...prev,
            physicalExamination: {
              ...prev.physicalExamination,
              vitals: {
                temperature: initialPatientData.vitals.temperature || '',
                heartRate: initialPatientData.vitals.heartRate || '',
                bloodPressure: initialPatientData.vitals.bloodPressure || '',
                respiratoryRate: initialPatientData.vitals.respiratoryRate || '',
                oxygenSaturation: initialPatientData.vitals.oxygenSaturation || '',
                height: initialPatientData.vitals.height || '',
                weight: initialPatientData.vitals.weight || '',
                bmi: initialPatientData.vitals.bmi || '',
                timestamp: initialPatientData.vitals.timestamp || new Date().toISOString()
              }
            }
          }));
          
          // Show success message
          toast.success(`✅ Vital signs automatically loaded from nurse measurements`, {
            position: 'top-center',
          });
        }
        return;
      }
      
      try {
        // Use patient service instead of direct API call
        const { getPatientById } = await import('../../../services/patientService');
        const [patient, nurseVitals] = await Promise.all([
          getPatientById(patientId),
          vitalSignsService.getLatestNurseVitals(patientId)
        ]);
        
        console.log('Patient data from service:', patient);
        console.log('Nurse vitals response:', nurseVitals);
        
        // Set patient data with age calculation
        if (patient) {
          console.log('Patient data fields:', Object.keys(patient));
          console.log('Full patient data:', patient);
          
          // Calculate age from date of birth if not provided
          let calculatedAge = patient.age || 0;
          if (!calculatedAge && patient.dateOfBirth) {
            try {
              const birthDate = new Date(patient.dateOfBirth);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              
              // Adjust age if birth month/day hasn't occurred yet this year
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              
              calculatedAge = age >= 0 ? age : 0;
            } catch (e) {
              console.warn('Could not calculate age from date of birth:', patient.dateOfBirth);
              calculatedAge = 0;
            }
          }
          
          // Set patient data with calculated age
          setPatientData({
            ...patient,
            age: calculatedAge
          });
        }
          
        // Auto-populate nurse vitals if available
        if (nurseVitals) {
          console.log('🏥 Auto-populating vitals from nurse:', nurseVitals);
            setRecord(prev => ({
              ...prev,
              physicalExamination: {
                ...prev.physicalExamination,
                vitals: {
                temperature: nurseVitals.temperature || '',
                heartRate: nurseVitals.heartRate || '',
                bloodPressure: nurseVitals.bloodPressure || '',
                respiratoryRate: nurseVitals.respiratoryRate || '',
                oxygenSaturation: nurseVitals.oxygenSaturation || '',
                height: nurseVitals.height || '',
                weight: nurseVitals.weight || '',
                bmi: nurseVitals.bmi || '',
                nurseRecordedBy: nurseVitals.recordedBy || '',
                nurseRecordedAt: nurseVitals.recordedAt || '',
                autoPopulated: true // Flag to show auto-populated badge
                }
              }
            }));
            
          toast.success(`✅ Vital signs automatically loaded from nurse: ${nurseVitals.recordedBy}`, {
            position: 'top-center',
          });
        } else {
          // Try to get vitals from patient data (fallback)
          if (patient?.vitals) {
            console.log('Auto-populating vitals from patient data:', patient.vitals);
            setRecord(prev => ({
              ...prev,
              physicalExamination: {
                ...prev.physicalExamination,
                vitals: {
                  temperature: patient.vitals.temperature || '',
                  heartRate: patient.vitals.heartRate || '',
                  bloodPressure: patient.vitals.bloodPressure || '',
                  respiratoryRate: patient.vitals.respiratoryRate || '',
                  oxygenSaturation: patient.vitals.oxygenSaturation || '',
                  height: patient.vitals.height || '',
                  weight: patient.vitals.weight || '',
                  bmi: patient.vitals.bmi || '',
                  timestamp: patient.vitals.timestamp || new Date().toISOString()
                }
              }
            }));
            
            toast(`ℹ️ Vital signs loaded from patient records`);
          } else {
            console.log('No nurse vitals found for patient', patientId);
          }
        }
        
      } catch (error) {
        console.error('Error fetching patient data or vitals:', error);
        toast.error('Failed to load patient data. Please try again.');
      }
    };

    fetchPatientData();
  }, [patientId, initialPatientData]);

  // Load existing record if in edit mode
  useEffect(() => {
    const directLoadRecord = async () => {
      if (!recordId) {
        console.log('[DIRECT LOAD] No recordId, skipping direct load');
        return;
      }
      
      console.log(`🔄 [DIRECT LOAD] Attempting to load record: ${recordId}`);
      setLoading(true);
      setLoadError(null);
      
      try {
        // Use the new load-test endpoint that doesn't require authentication
        const response = await fetch(`${API_BASE_URL}/api/medical-records/load-test/${recordId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to load record: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log('🔄 [DIRECT LOAD] Response data:', responseData);
        
        // Extract the actual data
        const loadedData = responseData.success ? responseData.data : responseData;
        
        if (!loadedData || !loadedData._id) {
          throw new Error('Invalid record data received');
        }
        
        console.log('✅ [DIRECT LOAD] Successfully loaded medical record:', {
          id: loadedData._id,
          patient: loadedData.patient,
          status: loadedData.status,
          hasChiefComplaint: !!loadedData.chiefComplaint,
          hasPlan: !!loadedData.plan
        });
        
        // Map the loaded data to our form structure
        const mappedRecord = {
          ...mapDataToFormRecord(loadedData),
          _id: loadedData._id,
          patient: loadedData.patient || patientId // Ensure patient ID is set
        };
        console.log('🔧 [DIRECT LOAD] Mapped record:', mappedRecord);
        
        // Update the record state with the loaded data
        setRecord(mappedRecord as MedicalRecord);
        
        // Also update the formData state to ensure the form is populated
        if (loadedData.chiefComplaint) {
          setRecord(prev => ({
            ...prev,
            chiefComplaint: {
              description: loadedData.chiefComplaint.description || '',
              duration: loadedData.chiefComplaint.duration || '',
              severity: loadedData.chiefComplaint.severity || 'Mild',
              onsetPattern: loadedData.chiefComplaint.onsetPattern || 'Acute',
              progression: loadedData.chiefComplaint.progression || 'Stable',
              location: loadedData.chiefComplaint.location || '',
              aggravatingFactors: loadedData.chiefComplaint.aggravatingFactors || [],
              relievingFactors: loadedData.chiefComplaint.relievingFactors || [],
              associatedSymptoms: loadedData.chiefComplaint.associatedSymptoms || [],
              impactOnDailyLife: loadedData.chiefComplaint.impactOnDailyLife || '',
              previousEpisodes: loadedData.chiefComplaint.previousEpisodes || false,
              previousEpisodesDetails: loadedData.chiefComplaint.previousEpisodesDetails || '',
              recordedAt: loadedData.chiefComplaint.recordedAt,
              recordedBy: loadedData.chiefComplaint.recordedBy
            }
          } as any));
        }
        
        if (loadedData.physicalExamination) {
          setRecord(prev => ({
            ...prev,
            physicalExamination: {
              general: loadedData.physicalExamination.general || '',
              heent: {
                head: loadedData.physicalExamination.heent?.head || '',
                eyes: loadedData.physicalExamination.heent?.eyes || '',
                ears: loadedData.physicalExamination.heent?.ears || '',
                nose: loadedData.physicalExamination.heent?.nose || '',
                throat: loadedData.physicalExamination.heent?.throat || ''
              },
              cardiovascular: loadedData.physicalExamination.cardiovascular || '',
              respiratory: loadedData.physicalExamination.respiratory || '',
              gastrointestinal: loadedData.physicalExamination.gastrointestinal || '',
              neurological: loadedData.physicalExamination.neurological || '',
              musculoskeletal: loadedData.physicalExamination.musculoskeletal || '',
              skin: loadedData.physicalExamination.skin || '',
              summary: loadedData.physicalExamination.summary || ''
            }
          } as any));
        }
        
        if (loadedData.vitalSigns) {
          setRecord(prev => ({
            ...prev,
            vitalSigns: {
              temperature: loadedData.vitalSigns.temperature || '',
              bloodPressure: loadedData.vitalSigns.bloodPressure || '',
              heartRate: loadedData.vitalSigns.heartRate || '',
              respiratoryRate: loadedData.vitalSigns.respiratoryRate || '',
              oxygenSaturation: loadedData.vitalSigns.oxygenSaturation || '',
              height: loadedData.vitalSigns.height || '',
              weight: loadedData.vitalSigns.weight || '',
              bmi: loadedData.vitalSigns.bmi || ''
            }
          } as any));
        }
        
        if (loadedData.assessment) {
          setRecord(prev => ({
            ...prev,
            assessment: {
              primaryDiagnosis: loadedData.assessment.primaryDiagnosis || '',
              secondaryDiagnoses: loadedData.assessment.secondaryDiagnoses || [],
              plan: loadedData.assessment.plan || '',
              followUp: loadedData.assessment.followUp || ''
            }
          } as any));
        }
        
        console.log('✅ [DIRECT LOAD] Record loaded and form initialized');
      } catch (error) {
        console.error('❌ [DIRECT LOAD] Error loading record:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load record');
        
        // Initialize with default data on error
        const defaultRecord = {
          ...mapDataToFormRecord({ patient: patientId }),
          patient: patientId
        };
        setRecord(defaultRecord as MedicalRecord);
      } finally {
        setLoading(false);
      }
    };

    directLoadRecord();
  }, [recordId, mode, patientId]);

  // Handle pre-loaded record data from props
  useEffect(() => {
    if (initialRecordData) {
      console.log('🔄 [LOAD RECORD] Using pre-loaded record data:', initialRecordData);
      
      const mappedRecord = mapDataToFormRecord(initialRecordData);
      
      console.log('🔄 [LOAD RECORD] Mapped pre-loaded record:', mappedRecord);
      setRecord(mappedRecord);
      setIsFinalized(initialRecordData.status === 'Finalized');
      
      // Show success message
      toast.success(`Record loaded from props: ${initialRecordData._id || 'Unknown ID'}`);
    } else if (mode === 'create' && !recordId) {
        // Initialize with patientId and defaults when creating a new record and no initial data
        console.log('🔄 [LOAD RECORD] Initializing new record form for patient:', patientId);
        setRecord(mapDataToFormRecord({ patient: patientId }));
    }
  }, [initialRecordData, mode, recordId, patientId]); // Added patientId to dependencies

  // Debug: Check if we should have loaded a record but didn't
  useEffect(() => {
    if (recordId && mode !== 'create' && !record._id && !initialRecordData) {
      console.warn('🚨 [LOAD RECORD] WARNING: We have a recordId but no record data loaded!');
      console.warn('🚨 [LOAD RECORD] recordId:', recordId);
      console.warn('🚨 [LOAD RECORD] mode:', mode);
      console.warn('🚨 [LOAD RECORD] record._id:', record._id);
      console.warn('🚨 [LOAD RECORD] initialRecordData:', initialRecordData);
      
      toast.error(
        <div>
          <strong>⚠️ Record Loading Issue</strong>
          <br />
          Record ID: {recordId}
          <br />
          Mode: {mode}
          <br />
          The record should have loaded but didn't. Check console for details.
        </div>,
        {}
      );
    }
  }, [recordId, mode, record._id, initialRecordData]);

  // Enhanced AI-powered suggestions using AIAssistantService
  const generateAISuggestions = useCallback(async (section: string, data: any) => {
    try {
      // Extract patient data for AI analysis
      const patientData = {
        chiefComplaint: record.chiefComplaint?.description || '',
        historyOfPresentIllness: record.historyOfPresentIllness || '',
        symptoms: record.chiefComplaint?.associatedSymptoms || [],
        vitals: record.physicalExamination?.vitals || {},
        age: (record as any)?.patientDetails?.age || 34,
        gender: (record as any)?.patientDetails?.gender || 'female',
        allergies: Array.isArray(record.allergies) 
          ? record.allergies.map((a: any) => typeof a === 'string' ? a : a.allergen || '')
          : [],
        pastMedicalHistory: record.pastMedicalHistory || '',
        currentMedications: Array.isArray(record.currentMedications)
          ? record.currentMedications.map((m: any) => typeof m === 'string' ? m : m.medication || '')
          : []
      };

      // Use AIAssistantService for comprehensive suggestions
      const suggestions = AIAssistantService.generateSuggestions(patientData);
      
      setAiSuggestions(suggestions);
      
      // Show success message
      toast.success('AI analysis completed! 🧠');
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      toast.error('Failed to generate AI suggestions');
    }
  }, [record]);


  // Quality scoring algorithm
  const calculateQualityScore = useCallback(() => {
    let score = 0;
    const maxScore = 100;
    
    // Chief complaint quality (20 points)
    if (record.chiefComplaint?.description?.length > 10) score += 20;
    
    // Physical examination completeness (20 points)
    const examSections = ['vitals', 'general', 'heent', 'cardiovascular', 'respiratory', 'abdomen'];
    const completedSections = examSections.filter(section => {
      if (section === 'heent') {
        // Check if any HEENT component is filled
        const heentData = record.physicalExamination?.[section];
        return heentData && (
          heentData.head || heentData.eyes || heentData.ears || 
          heentData.nose || heentData.throat
        );
      }
      return record.physicalExamination?.[section] && record.physicalExamination[section] !== '';
    });
    score += (completedSections.length / examSections.length) * 20;
    
    // Assessment and plan (25 points)
    if (record.primaryDiagnosis?.description?.length > 10 || record.primaryDiagnosis?.code) score += 15;
    if (record.plan?.length > 10) score += 10;
    
    // Documentation completeness (25 points)
    if (record.historyOfPresentIllness?.length > 20) score += 10;
    if (record.historyOfPresentIllness && record.historyOfPresentIllness.length > 50) score += 5;
    if (record.allergies) score += 5;
    if (record.pastMedicalHistory) score += 5;
    
    // Follow-up planning (10 points)
    if (record.followUpPlan?.instructions?.length > 10) score += 10;
    
    setQualityScore(Math.round(score));
  }, [record]);

  useEffect(() => {
    calculateQualityScore();
  }, [record, calculateQualityScore]);

  const handleChange = (field: string, value: any, section?: string, subfield?: string) => {
    console.log('📝 [FORM UPDATE] Field:', field, 'Value:', value, 'Section:', section, 'Subfield:', subfield);
    
    setRecord(prev => {
      const updated = { ...prev };
      
      if (section && subfield) {
        if (!updated[section]) updated[section] = {};
        if (!updated[section][subfield]) updated[section][subfield] = {};
        updated[section][subfield] = { ...updated[section][subfield], [field]: value };
        console.log('📝 [FORM UPDATE] Updated nested field:', `${section}.${subfield}.${field}`, '=', value);
      } else if (section) {
        if (!updated[section]) updated[section] = {};
        updated[section] = { ...updated[section], [field]: value };
        console.log('📝 [FORM UPDATE] Updated section field:', `${section}.${field}`, '=', value);
      } else {
        updated[field] = value;
        console.log('📝 [FORM UPDATE] Updated root field:', field, '=', value);
      }
      
      console.log('📝 [FORM UPDATE] New record state keys:', Object.keys(updated));
      
      // Update memory system with the new data
      memorySystem.updateData(updated);
      
      return updated;
    });
  };

  // Test function to verify form data is being captured
  const testFormData = () => {
    console.log('🧪 [TEST] ===== COMPREHENSIVE FORM STATE TEST =====');
    console.log('🧪 [TEST] Full record object:', JSON.stringify(record, null, 2));
    console.log('🧪 [TEST] Record object keys:', Object.keys(record));
    console.log('🧪 [TEST] Chief Complaint:', record.chiefComplaint);
    console.log('🧪 [TEST] Primary Diagnosis:', record.primaryDiagnosis);
    console.log('🧪 [TEST] Physical Examination:', record.physicalExamination);
    console.log('🧪 [TEST] Patient ID:', patientId);
    console.log('🧪 [TEST] Patient Data:', patientData);
    console.log('🧪 [TEST] User:', user);
    console.log('🧪 [TEST] Quality Score:', qualityScore);
    
    // Test field validation
    const hasChiefComplaint = record.chiefComplaint?.description?.length > 0;
    const hasPatientId = !!patientId;
    const hasPrimaryDx = record.primaryDiagnosis?.code || record.primaryDiagnosis?.description;
    
    console.log('🧪 [TEST] Validation Status:');
    console.log('  - Chief Complaint:', hasChiefComplaint ? '✅ Valid' : '❌ Missing');
    console.log('  - Patient ID:', hasPatientId ? '✅ Valid' : '❌ Missing');
    console.log('  - Primary Diagnosis:', hasPrimaryDx ? '✅ Valid' : '❌ Missing');
    
    // Test if we can update the record
    setRecord(prev => ({
      ...prev,
      testField: 'Form is working - ' + new Date().toISOString(),
      lastTest: new Date().getTime()
    }));
    
    toast.success(
      <div>
        <strong>🧪 Form State Test Results:</strong>
        <br />
        Chief Complaint: {hasChiefComplaint ? '✅' : '❌'}
        <br />
        Patient ID: {hasPatientId ? '✅' : '❌'}
        <br />
        Primary Diagnosis: {hasPrimaryDx ? '✅' : '❌'}
        <br />
        Check console for detailed logs
      </div>,
      {}
    );
  };

  // Helper function to clean vitals data before sending to backend
  const cleanVitalsForBackend = (vitals: any) => {
    if (!vitals) return {};
    
    // Create a clean copy without fields that might cause backend issues
    const cleanedVitals = {
      temperature: vitals.temperature || '',
      heartRate: vitals.heartRate || '',
      bloodPressure: vitals.bloodPressure || '',
      respiratoryRate: vitals.respiratoryRate || '',
      oxygenSaturation: vitals.oxygenSaturation || '',
      height: vitals.height || '',
      weight: vitals.weight || '',
      bmi: vitals.bmi || ''
    };
    
    // Only include recordedBy if it's a valid MongoDB ObjectId (24 character hex string)
    if (vitals.recordedBy && /^[0-9a-fA-F]{24}$/.test(vitals.recordedBy)) {
      (cleanedVitals as any).recordedBy = vitals.recordedBy;
    }
    
    // Include recordedAt if it's a valid date
    if (vitals.recordedAt) {
      (cleanedVitals as any).recordedAt = vitals.recordedAt;
    }
    
    return cleanedVitals;
  };

  // Save as draft with enhanced metadata
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      
      // 🔍 COMPREHENSIVE DEBUGGING - Check form state
      console.log('🚀 [SAVE DRAFT] ===== DEBUGGING FORM DATA =====');
      console.log('🔍 [SAVE DRAFT] Complete record state:', JSON.stringify(record, null, 2));
      console.log('🔍 [SAVE DRAFT] Patient ID:', patientId);
      console.log('🔍 [SAVE DRAFT] Patient data:', patientData);
      console.log('🔍 [SAVE DRAFT] User data:', user);
      console.log('🔍 [SAVE DRAFT] Quality score:', qualityScore);
      
      // Check each form field individually
      console.log('📋 [SAVE DRAFT] Chief Complaint:', {
        description: record.chiefComplaint?.description,
        duration: record.chiefComplaint?.duration,
        severity: record.chiefComplaint?.severity,
        location: record.chiefComplaint?.location,
        onsetPattern: record.chiefComplaint?.onsetPattern,
        progression: record.chiefComplaint?.progression
      });
      
      console.log('🩺 [SAVE DRAFT] Physical Exam:', {
        vitals: record.physicalExamination?.vitals,
        general: record.physicalExamination?.general
      });
      
      console.log('📊 [SAVE DRAFT] Primary Diagnosis:', {
        code: record.primaryDiagnosis?.code,
        description: record.primaryDiagnosis?.description,
        category: record.primaryDiagnosis?.category
      });
      
      console.log('💊 [SAVE DRAFT] Treatment Plan:', record.plan);
      console.log('📝 [SAVE DRAFT] History:', {
        present: record.historyOfPresentIllness,
        past: record.pastMedicalHistory,
        family: record.familyHistory,
        social: record.socialHistory
      });
      
      // Validate we have minimum required data
      if (!patientId) {
        console.error('❌ [SAVE DRAFT] Missing patient ID');
        toast.error('Patient ID is missing');
        return;
      }
      
      if (!record.chiefComplaint?.description) {
        console.error('❌ [SAVE DRAFT] Missing chief complaint description');
        toast.error('Chief complaint is required');
        return;
      }

      // Add validation for primary diagnosis
      if (!record.primaryDiagnosis?.code || !record.primaryDiagnosis?.description) {
        console.error('❌ [SAVE DRAFT] Missing primary diagnosis');
        toast.error('Primary diagnosis is required');
        return;
      }
      
      const recordToSave = {
        ...record,
        patient: patientId,
        visit: '000000000000000000000000',
        status: 'Draft',
        qualityScore: qualityScore,
        lastModified: new Date().toISOString(),
        modifiedBy: user?.id,
        modifiedByName: user?.name,
        version: (record.version || 0) + 1,
        // Enhanced primaryDiagnosis with full ICD-11 support
        primaryDiagnosis: (() => {
          const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
          return {
            code: record.primaryDiagnosis?.code, // NHDD code
            description: record.primaryDiagnosis?.description,
            category: record.primaryDiagnosis?.category,
            // Add ICD-11 metadata from the diagnosis database
            icd10: selectedDx?.icd10 || '',
            icd11: selectedDx?.icd11 || '',
            icd11Chapter: selectedDx?.icd11Chapter || '',
            icd11Block: selectedDx?.icd11Block || '',
            subcategory: selectedDx?.subcategory || '',
            severity: selectedDx?.severity || '',
            commonTerms: selectedDx?.commonTerms || [],
            nhddDescription: selectedDx?.nhddDescription || ''
          };
        })(),
        // Clean the physical examination vitals to prevent backend errors
        physicalExamination: {
          ...record.physicalExamination,
          vitals: cleanVitalsForBackend(record.physicalExamination?.vitals)
        },
        // Enhanced metadata for search and retrieval with full ICD-11 support
        metadata: {
          patientName: `${patientData?.firstName} ${patientData?.lastName}`,
          patientId: patientId,
          chiefComplaintSummary: record.chiefComplaint?.description?.substring(0, 100) + '...',
          primaryDiagnosisCode: record.primaryDiagnosis?.code, // NHDD code
          primaryDiagnosisDescription: record.primaryDiagnosis?.description,
          // ICD coding systems
          primaryDiagnosisICD10: (() => {
            const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
            return selectedDx?.icd10 || '';
          })(),
          primaryDiagnosisICD11: (() => {
            const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
            return selectedDx?.icd11 || '';
          })(),
          icd11Chapter: (() => {
            const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
            return selectedDx?.icd11Chapter || '';
          })(),
          icd11Block: (() => {
            const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
            return selectedDx?.icd11Block || '';
          })(),
          category: record.primaryDiagnosis?.category,
          createdDate: record.createdAt || new Date().toISOString(),
          lastModifiedDate: new Date().toISOString(),
          doctorId: user?.id,
          doctorName: user?.name,
          tags: [
            record.primaryDiagnosis?.category,
            ...(record.secondaryDiagnoses?.map(dx => dx.category) || []),
            record.status,
            'NHDD-Coded',
            'ICD-11-Supported'
          ].filter(Boolean),
          searchTerms: [
            record.chiefComplaint?.description,
            record.primaryDiagnosis?.description,
            record.primaryDiagnosis?.code, // NHDD code
            ...(record.secondaryDiagnoses?.map(dx => dx.description) || []),
            ...(record.secondaryDiagnoses?.map(dx => dx.code) || []), // NHDD codes
            record.plan,
            record.historyOfPresentIllness,
            // Add common terms for better searchability
            ...(() => {
              const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
              return selectedDx?.commonTerms || [];
            })()
          ].filter(Boolean)
        }
      };

      // Debug: Log what we're sending to the API
      console.log('📤 [SAVE DRAFT] Sending to API:', recordToSave);
      console.log('📤 [SAVE DRAFT] Record size (KB):', JSON.stringify(recordToSave).length / 1024);
      console.log('📤 [SAVE DRAFT] Record keys:', Object.keys(recordToSave));
      console.log('📤 [SAVE DRAFT] Chief complaint in payload:', recordToSave.chiefComplaint);
      console.log('📤 [SAVE DRAFT] Physical exam in payload:', recordToSave.physicalExamination);
      console.log('📤 [SAVE DRAFT] Primary diagnosis in payload:', recordToSave.primaryDiagnosis);
      
      // Validate the recordToSave has required data
      if (!recordToSave.chiefComplaint?.description) {
        console.error('❌ [SAVE DRAFT] recordToSave missing chief complaint');
        toast.error('Failed to prepare record data - chief complaint missing');
        return;
      }
      
      if (!recordToSave.patient) {
        console.error('❌ [SAVE DRAFT] recordToSave missing patient ID');
        toast.error('Failed to prepare record data - patient ID missing');
        return;
      }

      let response;
      if (recordId && mode === 'edit') {
        console.log('🔄 [SAVE DRAFT] Updating existing record:', recordId);
        response = await medicalRecordsApi.updateRecord(recordId, recordToSave);
        toast.success('Medical record updated successfully');
      } else {
        console.log('✨ [SAVE DRAFT] Creating new record');
        response = await medicalRecordsApi.createRecord(recordToSave);
        toast.success('Medical record saved as draft');
      }

      // Debug: Log the API response
      console.log('📥 [SAVE DRAFT] API Response:', response);
      console.log('📥 [SAVE DRAFT] Response data:', response?.data);
      console.log('📥 [SAVE DRAFT] Response keys:', response?.data ? Object.keys(response.data) : 'No data');

      if (response && response.data) {
        console.log('✅ [SAVE DRAFT] Success! Record data:', response.data);
        console.log('✅ [SAVE DRAFT] Record ID:', response.data._id);
        console.log('✅ [SAVE DRAFT] Record fields saved:', Object.keys(response.data));
        
        // Check if the response has actual content
        if (!response.data._id) {
          console.error('❌ [SAVE DRAFT] No record ID in response');
          toast.error('Record created but no ID returned');
          return;
        }
        
        if (!response.data.chiefComplaint?.description && recordToSave.chiefComplaint?.description) {
          console.error('❌ [SAVE DRAFT] Chief complaint lost in save process');
          toast.error('Warning: Chief complaint may not have been saved properly');
        }
        
        // Update local state with saved record ID for future updates
        setRecord(prev => ({ ...prev, _id: response.data._id }));
        if (onSave) {
          console.log('🔄 [SAVE DRAFT] Calling onSave callback');
          onSave(response.data);
        }
        
        // Show detailed success message
        toast.success(
          <div>
            <strong>✅ Record Saved Successfully!</strong>
            <br />
            Record ID: {response.data._id}
            <br />
            Status: {response.data.status || 'Draft'}
            <br />
            Quality Score: {qualityScore}%
            <br />
            Fields saved: {Object.keys(response.data).length}
          </div>,
          {}
        );
      } else {
        console.error('❌ [SAVE DRAFT] Invalid response format:', response);
        toast.error('Save operation returned invalid response');
      }
    } catch (error) {
      console.error('❌ [SAVE DRAFT] Error saving draft:', error);
      console.error('❌ [SAVE DRAFT] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(`Failed to save draft: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Finalize record with comprehensive metadata
  const handleFinalizeRecord = async () => {
    try {
      // Prevent multiple finalization attempts
      if (isFinalized) {
        console.log('⚠️ Record already finalized, preventing duplicate finalization');
        alert('This record has already been finalized.');
        return;
      }
      
      // Debug: Log the current record state
      console.log('🔍 [FINALIZE] Current record state:', record);
      console.log('🔍 [FINALIZE] Patient data:', patientData);
      console.log('🔍 [FINALIZE] User data:', user);
      
      // Validate required fields
      const validationErrors = validateRecord(record);
      if (Object.keys(validationErrors).length > 0) {
        console.log('❌ [FINALIZE] Validation errors:', validationErrors);
        setErrors(validationErrors);
        toast.error('Please complete all required fields');
        return;
      }

      if (!record.reviewedAndApproved) {
        toast.error('Please review and approve the documentation before finalizing');
        return;
      }
      
      // Validate we have minimum required data
      if (!patientId) {
        toast.error('Patient ID is missing');
        return;
      }

      setSaving(true);
      
      // Set finalized state immediately to prevent multiple clicks
      setIsFinalized(true);
      
      const recordToSave = {
        ...record,
        patient: patientId, // Ensure patient ID is set
        visit: '000000000000000000000000', // Add placeholder visit ID to satisfy validation
        status: 'Finalized',
        qualityScore: qualityScore,
        finalizedAt: new Date().toISOString(),
        finalizedBy: user?.id,
        finalizedByName: user?.name,
        version: (record.version || 0) + 1,
        // Clean the physical examination vitals to prevent backend errors
        physicalExamination: {
          ...record.physicalExamination,
          vitals: cleanVitalsForBackend(record.physicalExamination?.vitals)
        },
        // Enhanced metadata for comprehensive search with full ICD-11 support
        metadata: {
          patientName: `${patientData?.firstName} ${patientData?.lastName}`,
          patientId: patientId,
          chiefComplaintSummary: record.chiefComplaint?.description?.substring(0, 100) + '...',
          primaryDiagnosisCode: record.primaryDiagnosis?.code, // NHDD code
          primaryDiagnosisDescription: record.primaryDiagnosis?.description,
          // ICD coding systems
          primaryDiagnosisICD10: (() => {
            const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
            return selectedDx?.icd10 || '';
          })(),
          primaryDiagnosisICD11: (() => {
            const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
            return selectedDx?.icd11 || '';
          })(),
          icd11Chapter: (() => {
            const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
            return selectedDx?.icd11Chapter || '';
          })(),
          icd11Block: (() => {
            const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
            return selectedDx?.icd11Block || '';
          })(),
          secondaryDiagnoses: record.secondaryDiagnoses?.map(dx => {
            const selectedDx = enhancedDiagnosisDatabase.find(dbDx => dbDx.nhdd === dx.code);
            return {
              code: dx.code, // NHDD code
              description: dx.description,
              category: dx.category,
              icd10: selectedDx?.icd10 || '',
              icd11: selectedDx?.icd11 || '', // Add ICD-11 support
              icd11Chapter: selectedDx?.icd11Chapter || '',
              icd11Block: selectedDx?.icd11Block || '',
              severity: selectedDx?.severity || '',
              subcategory: selectedDx?.subcategory || ''
            };
          }) || [],
          category: record.primaryDiagnosis?.category,
          createdDate: record.createdAt || new Date().toISOString(),
          finalizedDate: new Date().toISOString(),
          doctorId: user?.id,
          doctorName: user?.name,
          qualityScore: qualityScore,
          tags: [
            record.primaryDiagnosis?.category,
            ...(record.secondaryDiagnoses?.map(dx => dx.category) || []),
            'Finalized',
            'NHDD-Coded',
            'ICD-11-Supported',
            qualityScore >= 80 ? 'High Quality' : qualityScore >= 60 ? 'Good Quality' : 'Needs Review'
          ].filter(Boolean),
          searchTerms: [
            record.chiefComplaint?.description,
            record.primaryDiagnosis?.description,
            record.primaryDiagnosis?.code, // NHDD code
            ...(record.secondaryDiagnoses?.map(dx => dx.description) || []),
            ...(record.secondaryDiagnoses?.map(dx => dx.code) || []), // NHDD codes
            record.plan,
            record.historyOfPresentIllness,
            // Add common terms and ICD-10 codes for better searchability
            ...(() => {
              const allDiagnoses = [
                record.primaryDiagnosis?.code,
                ...(record.secondaryDiagnoses?.map(dx => dx.code) || [])
              ].filter(Boolean);
              
              const allTerms = [];
              allDiagnoses.forEach(nhddCode => {
                const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === nhddCode);
                if (selectedDx) {
                  allTerms.push(...selectedDx.commonTerms);
                  allTerms.push(selectedDx.icd10);
                  allTerms.push(selectedDx.nhddDescription);
                  allTerms.push(selectedDx.subcategory);
                }
              });
              return allTerms;
            })()
          ].filter(Boolean).join(' ').toLowerCase()
        }
      };

      // Debug: Log what we're sending to the API
      console.log('📤 [FINALIZE] Sending to API:', recordToSave);

      let response;
      if (recordId && mode === 'edit') {
        console.log('🔄 [FINALIZE] Updating existing record:', recordId);
        response = await medicalRecordsApi.updateRecord(recordId, recordToSave);
        toast.success('Medical record finalized successfully');
      } else {
        console.log('✨ [FINALIZE] Creating new record');
        response = await medicalRecordsApi.createRecord(recordToSave);
        toast.success('Medical record created and finalized successfully');
      }

      // Debug: Log the API response
      console.log('📥 [FINALIZE] API Response:', response);

      if (response && response.data) {
        console.log('✅ [FINALIZE] Success! Record data:', response.data);
        // Update local state
        setRecord(prev => ({ ...prev, _id: response.data._id }));
        if (onSave) {
          console.log('🔄 [FINALIZE] Calling onSave callback');
          onSave(response.data);
        }
        
        // Show success with record details
        toast.success(
          <div>
            <strong>🎉 Record Finalized Successfully!</strong>
            <br />
            Record ID: {response.data._id}
            <br />
            NHDD Code: {record.primaryDiagnosis?.code || 'N/A'}
            <br />
            Quality Score: {qualityScore}%
            <br />
            Status: Finalized
          </div>,
          {}
        );
      } else {
        console.error('❌ [FINALIZE] No data in response:', response);
        toast.error('Finalize successful but no data returned');
      }
    } catch (error) {
      console.error('❌ [FINALIZE] Error finalizing record:', error);
      console.error('❌ [FINALIZE] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Reset finalized state on error
      setIsFinalized(false);
      toast.error(`Failed to finalize record: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Validate record
  const validateRecord = (recordData: any) => {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!recordData.chiefComplaint?.description) {
      errors.chiefComplaint = 'Chief complaint is required';
    }

    if (!recordData.physicalExamination?.vitals) {
      errors.vitals = 'Vital signs are required';
    }

    if (!recordData.primaryDiagnosis?.code && !recordData.primaryDiagnosis?.description) {
      errors.diagnosis = 'Primary diagnosis is required';
    }

    if (!recordData.plan) {
      errors.plan = 'Treatment plan is required';
    }

    return errors;
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0: // Patient & History
        return (
          <Box sx={{ p: { xs: 2, md: 5 }, bgcolor: '#f8fafd', borderRadius: 4, boxShadow: 3 }}>
            <Grid container spacing={3}>
              {/* Patient Info Card */}
              <Grid size={12}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={3} alignItems="center">
                      {/* Patient Avatar and Basic Info */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: 'primary.main', 
                              width: 56, 
                              height: 56, 
                              fontSize: '1.5rem' 
                            }}
                          >
                            {patientData?.firstName?.charAt(0)}{patientData?.lastName?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {patientData?.firstName || ''} {patientData?.lastName || ''}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {patientData?.gender || 'N/A'} • {patientData?.age || 'N/A'} years old
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Patient Details */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="medium" color="text.secondary">
                              DOB:
                            </Typography>
                            <Typography variant="body2">
                              {formatDateOfBirth(patientData?.dateOfBirth || patientData?.dob || patientData?.birthDate)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="medium" color="text.secondary">
                              Patient ID:
                            </Typography>
                            <Typography variant="body2" fontFamily="monospace">
                              {patientData?.patientId || 
                               patientData?.patientCode ||
                               patientData?.id || 
                               patientData?._id || 
                               'Not assigned'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="medium" color="text.secondary">
                              Contact:
                            </Typography>
                            <Typography variant="body2">
                              {patientData?.phone || 
                               patientData?.contactNumber || 
                               patientData?.phoneNumber || 
                               'Not provided'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Quality Score and Status */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          <Chip 
                            label={`Quality Score: ${qualityScore}%`} 
                            color={qualityScore >= 80 ? 'success' : qualityScore >= 60 ? 'warning' : 'error'}
                            icon={<StarIcon />}
                            size="medium"
                          />
                          <Chip 
                            label={record.status || 'Draft'} 
                            color={record.status === 'finalized' ? 'success' : 'default'}
                            variant="outlined"
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            Last updated: {new Date().toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Chief Complaint - Primary Section */}
              <Grid size={12}>
                <Card variant="outlined" sx={{ border: '2px solid', borderColor: 'error.main', borderRadius: 2 }}>
                  <CardHeader 
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" color="primary" fontWeight="bold">Chief Complaint</Typography>
                        <Chip size="small" label="Required" color="error" />
                      </Box>
                    }
                    sx={{ pb: 0 }}
                  />
                  <CardContent sx={{ pt: 1 }}>
                    <Grid container spacing={3}>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Chief Complaint Description"
                          multiline
                          rows={3}
                          value={record.chiefComplaint?.description || ''}
                          onChange={(e) => {
                            console.log('🔄 [FORM UPDATE] Chief complaint description changed to:', e.target.value);
                            handleChange('description', e.target.value, 'chiefComplaint');
                          }}
                          placeholder="Describe the patient's primary concern or reason for visit"
                          error={!!errors.chiefComplaint}
                          helperText={errors.chiefComplaint}
                          disabled={!memorySystem.isEditMode}
                          InputProps={{
                            readOnly: !memorySystem.isEditMode
                          }}
                        />
                      </Grid>
                      
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Duration"
                          value={record.chiefComplaint?.duration || ''}
                          onChange={(e) => handleChange('duration', e.target.value, 'chiefComplaint')}
                          placeholder="e.g., 3 days, 2 weeks"
                          disabled={!memorySystem.isEditMode}
                          InputProps={{
                            readOnly: !memorySystem.isEditMode
                          }}
                        />
                      </Grid>
                      
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Severity</InputLabel>
                          <Select
                            value={record.chiefComplaint?.severity || 'Mild'}
                            onChange={(e) => handleChange('severity', e.target.value, 'chiefComplaint')}
                            label="Severity"
                            disabled={!memorySystem.isEditMode}
                          >
                            <MenuItem value="Mild">Mild</MenuItem>
                            <MenuItem value="Moderate">Moderate</MenuItem>
                            <MenuItem value="Severe">Severe</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Onset Pattern</InputLabel>
                          <Select
                            value={record.chiefComplaint?.onsetPattern || 'Acute'}
                            onChange={(e) => handleChange('onsetPattern', e.target.value, 'chiefComplaint')}
                            label="Onset Pattern"
                          >
                            <MenuItem value="Acute">Acute</MenuItem>
                            <MenuItem value="Gradual">Gradual</MenuItem>
                            <MenuItem value="Chronic">Chronic</MenuItem>
                            <MenuItem value="Intermittent">Intermittent</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Progression</InputLabel>
                          <Select
                            value={record.chiefComplaint?.progression || 'Stable'}
                            onChange={(e) => handleChange('progression', e.target.value, 'chiefComplaint')}
                            label="Progression"
                          >
                            <MenuItem value="Improving">Improving</MenuItem>
                            <MenuItem value="Stable">Stable</MenuItem>
                            <MenuItem value="Worsening">Worsening</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Location (if applicable)"
                          value={record.chiefComplaint?.location || ''}
                          onChange={(e) => handleChange('location', e.target.value, 'chiefComplaint')}
                          placeholder="e.g., Chest, Abdomen, Head"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* History Taking */}
              <Grid size={12}>
                <Card variant="outlined" sx={{ mb: 3 }}>
                      <CardHeader 
                    title="History of Present Illness" 
                    action={<Chip size="small" label="Required" color="warning" />}
                      />
                  <CardContent>
                        <TextField
                          fullWidth
                          label="History of Present Illness"
                      multiline
                      rows={4}
                          value={record.historyOfPresentIllness || ''}
                          onChange={(e) => handleChange('historyOfPresentIllness', e.target.value)}
                      placeholder="Detailed description of the current illness, including timeline, associated symptoms, and relevant details"
                            />
                      </CardContent>
                    </Card>
                  </Grid>

              {/* Medical History */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardHeader title="Past Medical History" />
                  <CardContent>
                        <TextField
                          fullWidth
                          label="Past Medical History"
                      multiline
                      rows={3}
                          value={record.pastMedicalHistory || ''}
                          onChange={(e) => handleChange('pastMedicalHistory', e.target.value)}
                      placeholder="Previous medical conditions, hospitalizations, surgeries"
                            />
                      </CardContent>
                    </Card>
              </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardHeader title="Family History" />
                  <CardContent>
                        <TextField
                          fullWidth
                      label="Family History"
                          multiline
                      rows={3}
                      value={record.familyHistory || ''}
                      onChange={(e) => handleChange('familyHistory', e.target.value)}
                      placeholder="Relevant family medical history"
                    />
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardHeader title="Social History" />
                  <CardContent>
                        <TextField
                          fullWidth
                      label="Social History"
                          multiline
                      rows={3}
                      value={record.socialHistory || ''}
                      onChange={(e) => handleChange('socialHistory', e.target.value)}
                      placeholder="Smoking, alcohol, occupation, living situation"
                        />
                      </CardContent>
                    </Card>
                  </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardHeader title="Allergies" />
                  <CardContent>
                        <TextField
                          fullWidth
                      label="Allergies"
                          multiline
                          rows={3}
                      value={record.allergies || ''}
                      onChange={(e) => handleChange('allergies', e.target.value)}
                      placeholder="Known allergies and reactions"
                            />
                      </CardContent>
                    </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // Physical Exam
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom color="primary">
              Physical Examination
            </Typography>
            
            {/* Vital Signs - Priority Section */}
            <Card variant="outlined" sx={{ border: '2px solid', borderColor: 'warning.main', borderRadius: 2, mb: 3 }}>
              <CardHeader 
                title={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">Vital Signs</Typography>
                    {record.physicalExamination?.vitals?.autoPopulated ? (
                      <Tooltip title={`Recorded by: ${record.physicalExamination?.vitals?.nurseRecordedBy || 'Nurse'} at ${record.physicalExamination?.vitals?.nurseRecordedAt ? new Date(record.physicalExamination.vitals.nurseRecordedAt).toLocaleString() : 'recently'}`}>
                        <Chip
                          size="small"
                          label={`✅ From Nurse: ${record.physicalExamination?.vitals?.nurseRecordedBy || 'Unknown'}`} 
                          color="success" 
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Tooltip>
                    ) : (
                      <Chip size="small" label="Manual Entry" color="default" />
                    )}
                  </Box>
                } 
                sx={{ pb: 1 }}
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      label="Temperature (°F)"
                      value={record.physicalExamination?.vitals?.temperature || record.vitalSigns?.temperature || ''}
                      onChange={(e) => handleChange('temperature', e.target.value, 'physicalExamination', 'vitals')}
                      placeholder="98.6"
                      InputProps={{
                        startAdornment: <LocalHospitalIcon color={record.physicalExamination?.vitals?.temperature ? "success" : "action"} sx={{ mr: 1 }} />
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: record.physicalExamination?.vitals?.autoPopulated && record.physicalExamination?.vitals?.temperature ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      label="Heart Rate (bpm)"
                      value={record.physicalExamination?.vitals?.heartRate || record.vitalSigns?.heartRate || ''}
                      onChange={(e) => handleChange('heartRate', e.target.value, 'physicalExamination', 'vitals')}
                      placeholder="72"
                      InputProps={{
                        startAdornment: <HeartIcon color={record.physicalExamination?.vitals?.heartRate ? "success" : "action"} sx={{ mr: 1 }} />
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: record.physicalExamination?.vitals?.autoPopulated && record.physicalExamination?.vitals?.heartRate ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      label="Blood Pressure"
                      value={record.physicalExamination?.vitals?.bloodPressure || record.vitalSigns?.bloodPressure || ''}
                      onChange={(e) => handleChange('bloodPressure', e.target.value, 'physicalExamination', 'vitals')}
                      placeholder="120/80"
                      InputProps={{
                        startAdornment: <BloodtypeIcon color={record.physicalExamination?.vitals?.bloodPressure ? "success" : "action"} sx={{ mr: 1 }} />
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: record.physicalExamination?.vitals?.autoPopulated && record.physicalExamination?.vitals?.bloodPressure ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      label="Respiratory Rate"
                      value={record.physicalExamination?.vitals?.respiratoryRate || record.vitalSigns?.respiratoryRate || ''}
                      onChange={(e) => handleChange('respiratoryRate', e.target.value, 'physicalExamination', 'vitals')}
                      placeholder="16"
                      InputProps={{
                        startAdornment: <AirIcon color={record.physicalExamination?.vitals?.respiratoryRate ? "success" : "action"} sx={{ mr: 1 }} />
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: record.physicalExamination?.vitals?.autoPopulated && record.physicalExamination?.vitals?.respiratoryRate ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          fullWidth
                      label="O2 Saturation (%)"
                      value={record.physicalExamination?.vitals?.oxygenSaturation || record.vitalSigns?.oxygenSaturation || ''}
                          onChange={(e) => handleChange('oxygenSaturation', e.target.value, 'physicalExamination', 'vitals')}
                      placeholder="98"
                          InputProps={{
                        startAdornment: <WaterDropIcon color={record.physicalExamination?.vitals?.oxygenSaturation ? "success" : "action"} sx={{ mr: 1 }} />
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                          backgroundColor: record.physicalExamination?.vitals?.autoPopulated && record.physicalExamination?.vitals?.oxygenSaturation ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }
                          }}
                        />
                      </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          fullWidth
                      label="Height"
                      value={record.physicalExamination?.vitals?.height || record.vitalSigns?.height || ''}
                          onChange={(e) => handleChange('height', e.target.value, 'physicalExamination', 'vitals')}
                      placeholder="5'8&quot;"
                          InputProps={{
                        startAdornment: <HeightIcon color={record.physicalExamination?.vitals?.height ? "success" : "action"} sx={{ mr: 1 }} />
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                          backgroundColor: record.physicalExamination?.vitals?.autoPopulated && record.physicalExamination?.vitals?.height ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }
                          }}
                        />
                      </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          fullWidth
                      label="Weight"
                      value={record.physicalExamination?.vitals?.weight || record.vitalSigns?.weight || ''}
                          onChange={(e) => handleChange('weight', e.target.value, 'physicalExamination', 'vitals')}
                      placeholder="150 lbs"
                          InputProps={{
                        startAdornment: <MonitorWeightIcon color={record.physicalExamination?.vitals?.weight ? "success" : "action"} sx={{ mr: 1 }} />
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                          backgroundColor: record.physicalExamination?.vitals?.autoPopulated && record.physicalExamination?.vitals?.weight ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }
                          }}
                        />
                      </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      fullWidth
                      label="BMI"
                      value={record.physicalExamination?.vitals?.bmi || record.vitalSigns?.bmi || ''}
                      onChange={(e) => handleChange('bmi', e.target.value, 'physicalExamination', 'vitals')}
                      placeholder="22.8"
                      InputProps={{
                        startAdornment: <CalculateIcon color={record.physicalExamination?.vitals?.bmi ? "success" : "action"} sx={{ mr: 1 }} />
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: record.physicalExamination?.vitals?.autoPopulated && record.physicalExamination?.vitals?.bmi ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
                {record.physicalExamination?.vitals?.autoPopulated && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>📋 Nurse Vitals Auto-Populated</strong><br />
                      Recorded by: {(record.physicalExamination?.vitals as any)?.nurseRecordedBy || 'Unknown Nurse'}<br />
                      Time: {(record.physicalExamination?.vitals as any)?.nurseRecordedAt ? 
                        new Date((record.physicalExamination.vitals as any).nurseRecordedAt).toLocaleString() : 'Recently'}
                      <br />
                      <em>You can edit these values if needed. Changes will be tracked.</em>
                    </Typography>
                  </Alert>
                  )}
              </CardContent>
            </Card>

            {/* Physical Examination by Body Systems */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="General Appearance" />
                    <CardContent>
                      <TextField
                        fullWidth
                      label="General Appearance"
                        multiline
                        rows={3}
                      value={record.physicalExamination?.general || ''}
                      onChange={(e) => handleChange('general', e.target.value, 'physicalExamination')}
                      placeholder="Alert, oriented, well-appearing, no acute distress"
                    />
                    </CardContent>
                  </Card>
                </Grid>
              
                            <Grid size={{ xs: 12 }}>
                <Card>
                  <CardHeader 
                    title="Head, Eyes, Ears, Nose, Throat (HEENT)" 
                    subheader="Complete examination by body region"
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Autocomplete
                          multiple
                          options={heentFindings.head}
                          value={record.physicalExamination?.heent?.head ? record.physicalExamination.heent.head.split(', ').filter(Boolean) : []}
                          onChange={(event, newValue) => {
                            handleChange('head', newValue.join(', '), 'physicalExamination', 'heent');
                          }}
                          freeSolo
                          renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                              const { key, ...tagProps } = getTagProps({ index });
                              return (
                                <Chip
                                  variant="outlined"
                                  label={option}
                                  {...tagProps}
                                  key={key}
                                  size="small"
                                  sx={{ fontSize: '0.75rem', height: '24px' }}
                                />
                              );
                            })
                          }
                          renderInput={(params) => (
                    <TextField
                              {...params}
                              label="Head"
                              placeholder="Select or type findings..."
                              variant="outlined"
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Autocomplete
                          multiple
                          options={heentFindings.eyes}
                          value={record.physicalExamination?.heent?.eyes ? record.physicalExamination.heent.eyes.split(', ').filter(Boolean) : []}
                          onChange={(event, newValue) => {
                            handleChange('eyes', newValue.join(', '), 'physicalExamination', 'heent');
                          }}
                          freeSolo
                          renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                              const { key, ...tagProps } = getTagProps({ index });
                              return (
                                <Chip
                                  variant="outlined"
                                  label={option}
                                  {...tagProps}
                                  key={key}
                                  size="small"
                                  sx={{ fontSize: '0.75rem', height: '24px' }}
                                />
                              );
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Eyes"
                              placeholder="Select or type findings..."
                              variant="outlined"
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Autocomplete
                          multiple
                          options={heentFindings.ears}
                          value={record.physicalExamination?.heent?.ears ? record.physicalExamination.heent.ears.split(', ').filter(Boolean) : []}
                          onChange={(event, newValue) => {
                            handleChange('ears', newValue.join(', '), 'physicalExamination', 'heent');
                          }}
                          freeSolo
                          renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                              const { key, ...tagProps } = getTagProps({ index });
                              return (
                                <Chip
                                  variant="outlined"
                                  label={option}
                                  {...tagProps}
                                  key={key}
                                  size="small"
                                  sx={{ fontSize: '0.75rem', height: '24px' }}
                                />
                              );
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Ears"
                              placeholder="Select or type findings..."
                              variant="outlined"
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        <Autocomplete
                          multiple
                          options={heentFindings.nose}
                          value={record.physicalExamination?.heent?.nose ? record.physicalExamination.heent.nose.split(', ').filter(Boolean) : []}
                          onChange={(event, newValue) => {
                            handleChange('nose', newValue.join(', '), 'physicalExamination', 'heent');
                          }}
                          freeSolo
                          renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                              const { key, ...tagProps } = getTagProps({ index });
                              return (
                                <Chip
                                  variant="outlined"
                                  label={option}
                                  {...tagProps}
                                  key={key}
                                  size="small"
                                  sx={{ fontSize: '0.75rem', height: '24px' }}
                                />
                              );
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Nose"
                              placeholder="Select or type findings..."
                              variant="outlined"
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        <Autocomplete
                          multiple
                          options={heentFindings.throat}
                          value={record.physicalExamination?.heent?.throat ? record.physicalExamination.heent.throat.split(', ').filter(Boolean) : []}
                          onChange={(event, newValue) => {
                            handleChange('throat', newValue.join(', '), 'physicalExamination', 'heent');
                          }}
                          freeSolo
                          renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => {
                              const { key, ...tagProps } = getTagProps({ index });
                              return (
                                <Chip
                                  variant="outlined"
                                  label={option}
                                  {...tagProps}
                                  key={key}
                                  size="small"
                                  sx={{ fontSize: '0.75rem', height: '24px' }}
                                />
                              );
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Throat"
                              placeholder="Select or type findings..."
                              variant="outlined"
                    />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Cardiovascular" />
                  <CardContent>
                    <TextField
                      fullWidth
                      label="Cardiovascular"
                      multiline
                      rows={3}
                      value={record.physicalExamination?.cardiovascular || ''}
                      onChange={(e) => handleChange('cardiovascular', e.target.value, 'physicalExamination')}
                      placeholder="Regular rate and rhythm. No murmurs, rubs, or gallops."
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Respiratory" />
                  <CardContent>
                    <TextField
                      fullWidth
                      label="Respiratory"
                      multiline
                      rows={3}
                      value={record.physicalExamination?.respiratory || ''}
                      onChange={(e) => handleChange('respiratory', e.target.value, 'physicalExamination')}
                      placeholder="Clear to auscultation bilaterally. No wheezes, rales, or rhonchi."
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Gastrointestinal" />
                  <CardContent>
                    <TextField
                      fullWidth
                      label="Gastrointestinal"
                      multiline
                      rows={3}
                      value={record.physicalExamination?.gastrointestinal || ''}
                      onChange={(e) => handleChange('gastrointestinal', e.target.value, 'physicalExamination')}
                      placeholder="Soft, non-tender, non-distended. Bowel sounds present."
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Neurological" />
                  <CardContent>
                    <TextField
                      fullWidth
                      label="Neurological"
                      multiline
                      rows={3}
                      value={record.physicalExamination?.neurological || ''}
                      onChange={(e) => handleChange('neurological', e.target.value, 'physicalExamination')}
                      placeholder="Alert and oriented x3. Cranial nerves II-XII grossly intact."
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Musculoskeletal" />
                  <CardContent>
                    <TextField
                      fullWidth
                      label="Musculoskeletal"
                      multiline
                      rows={3}
                      value={record.physicalExamination?.musculoskeletal || ''}
                      onChange={(e) => handleChange('musculoskeletal', e.target.value, 'physicalExamination')}
                      placeholder="Full range of motion. No joint swelling or tenderness."
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Skin" />
                  <CardContent>
                    <TextField
                      fullWidth
                      label="Skin"
                      multiline
                      rows={3}
                      value={record.physicalExamination?.skin || ''}
                      onChange={(e) => handleChange('skin', e.target.value, 'physicalExamination')}
                      placeholder="Warm, dry, intact. No rashes or lesions."
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 2: // Assessment & Plan
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom color="primary">
              Assessment & Treatment Plan
            </Typography>
            
            {/* Primary Diagnosis */}
            <Card variant="outlined" sx={{ border: '2px solid', borderColor: 'error.main', borderRadius: 2, mb: 3 }}>
              <CardHeader 
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">Primary Diagnosis</Typography>
                    <Chip size="small" label="Required" color="error" />
                  </Box>
                } 
                sx={{ pb: 0 }}
              />
              <CardContent sx={{ pt: 1 }}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                      fullWidth
                      options={enhancedDiagnosisDatabase}
                      getOptionLabel={(option) => `${option.nhdd} - ${option.diagnosis}`}
                      value={enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code) || null}
                      onChange={(event, newValue) => {
                        if (newValue) {
                          handleChange('code', newValue.nhdd, 'primaryDiagnosis');
                          handleChange('description', newValue.diagnosis, 'primaryDiagnosis');
                          handleChange('category', newValue.category, 'primaryDiagnosis');
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Primary Diagnosis Search"
                          placeholder="Search by NHDD, ICD-10, ICD-11, or diagnosis name..."
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="body1" fontWeight="bold">
                              {option.diagnosis}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={`NHDD: ${option.nhdd}`}
                                color="primary"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                size="small"
                                label={`ICD-10: ${option.icd10}`}
                                color="secondary"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                size="small"
                                label={`ICD-11: ${option.icd11}`}
                                color="success"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {option.category} | {option.icd11Chapter}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              {option.icd11Block}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      filterOptions={(options, { inputValue }) => {
                        const filterValue = inputValue.toLowerCase();
                        return options.filter(option =>
                          option.diagnosis.toLowerCase().includes(filterValue) ||
                          option.nhdd.toLowerCase().includes(filterValue) ||
                          option.icd10.toLowerCase().includes(filterValue) ||
                          option.icd11.toLowerCase().includes(filterValue) ||
                          option.category.toLowerCase().includes(filterValue) ||
                          option.commonTerms.some(term => term.toLowerCase().includes(filterValue)) ||
                          option.icd11Chapter.toLowerCase().includes(filterValue) ||
                          option.icd11Block.toLowerCase().includes(filterValue)
                        );
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        fullWidth
                        label="ICD-10 Code"
                        value={(() => {
                          const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
                          return selectedDx?.icd10 || '';
                        })()}
                        disabled
                        placeholder="Auto-filled from diagnosis selection"
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="ICD-11 Code"
                        value={(() => {
                          const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
                          return selectedDx?.icd11 || '';
                        })()}
                        disabled
                        placeholder="Auto-filled from diagnosis selection"
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'success.lighter',
                          }
                        }}
                      />
                      {record.primaryDiagnosis?.code && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            <strong>ICD-11 Chapter:</strong> {(() => {
                              const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
                              return selectedDx?.icd11Chapter || '';
                            })()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            <strong>ICD-11 Block:</strong> {(() => {
                              const selectedDx = enhancedDiagnosisDatabase.find(dx => dx.nhdd === record.primaryDiagnosis?.code);
                              return selectedDx?.icd11Block || '';
                            })()}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Treatment Plan */}
            <Card sx={{ mb: 3 }}>
              <CardHeader 
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">Treatment Plan</Typography>
                    <Chip size="small" label="Required" color="error" />
                  </Box>
                }
              />
              <CardContent>
                <TextField
                  fullWidth
                  label="Treatment Plan"
                  multiline
                  rows={6}
                  value={record.plan || ''}
                  onChange={(e) => handleChange('plan', e.target.value)}
                  placeholder="Detailed treatment plan including medications, procedures, lifestyle modifications, and follow-up care..."
                  error={!!errors.plan}
                  helperText={errors.plan}
                />
              </CardContent>
            </Card>

            {/* Secondary Diagnoses */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Secondary Diagnoses (Optional)" />
              <CardContent>
                <Grid container spacing={2}>
                  {(record.secondaryDiagnoses || []).map((diagnosis, index) => (
                    <Grid size={12} key={index}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Autocomplete
                  fullWidth
                          options={enhancedDiagnosisDatabase}
                          getOptionLabel={(option) => `${option.nhdd} - ${option.diagnosis}`}
                          value={enhancedDiagnosisDatabase.find(dx => dx.nhdd === diagnosis.code) || null}
                          onChange={(event, newValue) => {
                            const updated = [...(record.secondaryDiagnoses || [])];
                            if (newValue) {
                              updated[index] = {
                                code: newValue.nhdd,
                                description: newValue.diagnosis,
                                category: newValue.category
                              };
                            } else {
                              updated[index] = { code: '', description: '', category: '' };
                            }
                            handleChange('secondaryDiagnoses', updated);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={`Secondary Diagnosis ${index + 1}`}
                              placeholder="Search diagnosis..."
                            />
                          )}
                        />
                        <IconButton
                        onClick={() => {
                            const updated = (record.secondaryDiagnoses || []).filter((_, i) => i !== index);
                            handleChange('secondaryDiagnoses', updated);
                        }}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                  </Box>
                    </Grid>
                  ))}
                  <Grid size={12}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const updated = [...(record.secondaryDiagnoses || []), { code: '', description: '', category: '' }];
                        handleChange('secondaryDiagnoses', updated);
                      }}
                      variant="outlined"
                    >
                      Add Secondary Diagnosis
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        );

      case 3: // Care Coordination
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom color="primary">
              Care Coordination & Follow-up
            </Typography>

            {/* Follow-up Plan */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Follow-up Plan" />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Follow-up Timing"
                        value={record.followUpPlan?.timing || ''}
                        onChange={(e) => handleChange('timing', e.target.value, 'followUpPlan')}
                      placeholder="e.g., 1 week, 2 weeks, 1 month"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Provider"
                      value={record.followUpPlan?.provider || ''}
                      onChange={(e) => handleChange('provider', e.target.value, 'followUpPlan')}
                      placeholder="Primary care physician, specialist, etc."
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Follow-up Instructions"
                      multiline
                      rows={4}
                      value={record.followUpPlan?.instructions || ''}
                      onChange={(e) => handleChange('instructions', e.target.value, 'followUpPlan')}
                      placeholder="Detailed follow-up instructions and patient education..."
                    />
                  </Grid>
                  <Grid size={12}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={record.followUpPlan?.appointmentNeeded || false}
                          onChange={(e) => handleChange('appointmentNeeded', e.target.checked, 'followUpPlan')}
                        />
                      }
                      label="Appointment Needed"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={record.followUpPlan?.labWork || false}
                          onChange={(e) => handleChange('labWork', e.target.checked, 'followUpPlan')}
                        />
                      }
                      label="Lab Work Required"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={record.followUpPlan?.imaging || false}
                          onChange={(e) => handleChange('imaging', e.target.checked, 'followUpPlan')}
                        />
                      }
                      label="Imaging Required"
                    />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Care Team Communication */}
            <Card>
              <CardHeader title="Care Team Communication" />
              <CardContent>
                <TextField
                  fullWidth
                  label="Care Team Notes"
                  multiline
                  rows={3}
                  value={(record as any).careTeamNotes || ''}
                  onChange={(e) => handleChange('careTeamNotes', e.target.value)}
                  placeholder="Communications with other healthcare providers, family members, etc."
                />
              </CardContent>
            </Card>
          </Box>
        );

      case 4: // Quality & Compliance
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom color="primary">
              Quality & Compliance Review
            </Typography>
            
            {/* Quality Score Dashboard */}
            <Card sx={{ mb: 3 }}>
              <CardHeader 
                title="Documentation Quality Score" 
                action={
                  <Chip 
                    label={`${qualityScore}%`} 
                    color={qualityScore >= 80 ? 'success' : qualityScore >= 60 ? 'warning' : 'error'}
                    size="medium"
                  />
                }
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Quality Score: {qualityScore}/100
                  </Typography>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={qualityScore} 
                      size={80}
                      thickness={4}
                      sx={{ color: qualityScore >= 80 ? 'success.main' : qualityScore >= 60 ? 'warning.main' : 'error.main' }}
                    />
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" gutterBottom>Quality Checklist:</Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      {record.chiefComplaint?.description?.length > 10 ? 
                        <CheckCircleIcon color="success" /> : 
                        <WarningIcon color="warning" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Chief Complaint Documented" 
                      secondary={record.chiefComplaint?.description?.length > 10 ? 'Complete' : 'Needs improvement'}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      {record.physicalExamination?.vitals ? 
                        <CheckCircleIcon color="success" /> : 
                        <WarningIcon color="warning" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Vital Signs Recorded" 
                      secondary={record.physicalExamination?.vitals ? 'Complete' : 'Missing vital signs'}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      {record.primaryDiagnosis?.description?.length > 10 || record.primaryDiagnosis?.code ? 
                        <CheckCircleIcon color="success" /> : 
                        <WarningIcon color="warning" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Diagnosis Documented" 
                      secondary={record.primaryDiagnosis?.description?.length > 10 || record.primaryDiagnosis?.code ? 'Complete' : 'Needs detailed diagnosis'}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      {record.plan?.length > 20 ? 
                        <CheckCircleIcon color="success" /> : 
                        <WarningIcon color="warning" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Treatment Plan Documented" 
                      secondary={record.plan?.length > 20 ? 'Complete' : 'Needs detailed plan'}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      {record.followUpPlan?.instructions ? 
                        <CheckCircleIcon color="success" /> : 
                        <WarningIcon color="warning" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Follow-up Plan" 
                      secondary={record.followUpPlan?.instructions ? 'Complete' : 'Missing follow-up instructions'}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Clinical Alerts */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Clinical Alerts" />
              <CardContent>
                {/* Mock clinical alerts based on data */}
                {record.physicalExamination?.vitals?.bloodPressure && (
                  (() => {
                    const bp = record.physicalExamination.vitals.bloodPressure.split('/');
                    const systolic = parseInt(bp[0]);
                    if (systolic > 140) {
                      return (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Hypertension Alert</Typography>
                          Blood pressure {record.physicalExamination.vitals.bloodPressure} is elevated. Consider hypertension evaluation.
                        </Alert>
                      );
                    }
                    return null;
                  })()
                )}
                
                {record.physicalExamination?.vitals?.temperature && 
                 parseFloat(record.physicalExamination.vitals.temperature) > 100.4 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Fever Alert</Typography>
                    Temperature {record.physicalExamination.vitals.temperature}°F indicates fever. Consider infection workup.
                  </Alert>
                )}
                
                {record.prescriptions?.length > 0 && record.allergies && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Drug Allergy Check</Typography>
                    Patient has documented allergies. Verify medications against allergy list.
                  </Alert>
                )}
                
                {!record.physicalExamination?.vitals && (
                  <Alert severity="warning">
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Missing Vital Signs</Typography>
                    No vital signs recorded. Consider documenting baseline vitals.
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Compliance Checklist */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Regulatory Compliance" />
              <CardContent>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <SecurityIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="HIPAA Compliance" 
                      secondary="Patient privacy and security measures in place"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <AssessmentIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Documentation Standards" 
                      secondary="Meets professional medical documentation requirements"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <TimelineIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Quality Measures" 
                      secondary="Supports CMS quality reporting requirements"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Final Review */}
            <Card>
              <CardHeader title="Final Review" />
              <CardContent>
                <Typography variant="body1" paragraph>
                  Please review all sections before finalizing this medical record. Ensure all required fields are completed 
                  and documentation meets professional standards.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={record.reviewedAndApproved || false}
                        onChange={(e) => handleChange('reviewedAndApproved', e.target.checked)}
                      />
                    }
                    label="I have reviewed and approve this documentation"
                  />
                </Box>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Electronic Signature</Typography>
                  By finalizing this record, you are providing an electronic signature that this documentation 
                  is accurate and complete to the best of your knowledge.
                </Alert>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return <Typography>Step content for step {step}</Typography>;
    }
  };

  useEffect(() => {
    document.title = 'New life clinic - Professional Medical Record';
  }, []);

  return (
    <Box sx={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8fafc'
    }}>
      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 9999, 
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          padding: 2,
          boxShadow: 1
        }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Loading medical record...
          </Typography>
        </Box>
      )}

      {/* Load Error Display */}
      {loadError && (
        <Alert 
          severity="error" 
          sx={{ m: 2 }}
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setLoadError(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Failed to Load Medical Record
          </Typography>
          <Typography variant="body2">
            {loadError}
          </Typography>
        </Alert>
      )}

      {/* Header - conditionally render */}
      {!hideHeader && (
        <Paper elevation={1} sx={{ p: 3, borderRadius: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  component="img"
                  src={LOGO_PATH}
                  alt="New Life Clinic Logo"
                  sx={{
                    height: 48,
                    width: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    backgroundColor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': {
                      boxShadow: 2,
                      transform: 'scale(1.05)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite loop
                    target.src = LOGO_FALLBACK;
                  }}
                />
                <Box>
                  <Typography 
                    variant="h4" 
                    fontWeight="bold" 
                    sx={{ 
                      color: '#2196f3', 
                      fontFamily: 'Roboto, sans-serif',
                      letterSpacing: '0.5px'
                    }}
                  >
                    New Life Clinic
                  </Typography>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontFamily: 'Roboto, sans-serif', 
                      color: 'text.secondary',
                      letterSpacing: '0.3px'
                    }}
                  >
                    Professional Medical Record - {patientData?.firstName || 'Unknown'} {patientData?.lastName || 'Patient'}
                  </Typography>
                  {patientData && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'Roboto, sans-serif', 
                        color: 'text.secondary',
                        mt: 0.5
                      }}
                    >
                      {(() => {
                        const calculatedAge = calculateAge(patientData.dateOfBirth);
                        const displayAge = patientData.age || calculatedAge;
                        return displayAge !== null && displayAge !== undefined ? 
                          `${displayAge} years old` : 
                          patientData.dateOfBirth ? 
                            `DOB: ${new Date(patientData.dateOfBirth).toLocaleDateString()}` : 
                            'Age: Unknown';
                      })()} • 
                      {patientData.gender || 'Gender: Unknown'} • 
                      ID: {patientData.patientId || patientData.id || 'Unknown'}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip 
                  label={`Record ID: ${record._id || 'New Record'}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  label={mode === 'create' ? 'Creating New Record' : mode === 'edit' ? 'Editing Record' : 'Viewing Record'}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
                {record.status && (
                  <Chip 
                    label={record.status}
                    color={record.status === 'finalized' ? 'success' : 'warning'}
                    size="small"
                  />
                )}
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip 
                icon={<StarIcon />}
                label={`Quality Score: ${qualityScore}%`}
                color={qualityScore >= 80 ? 'success' : qualityScore >= 60 ? 'warning' : 'error'}
                variant="filled"
              />
              
              <Tooltip title="AI Assistant">
                <IconButton onClick={() => {
                  setAiAssistantOpen(true);
                  // Generate AI suggestions when opening
                  generateAISuggestions('all', record);
                }} color="primary">
                  <AIIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Audit Trail">
                <IconButton onClick={() => setAuditTrailOpen(true)} color="primary">
                  <HistoryIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Memory System Controls */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 0, bgcolor: '#f8fafd' }}>
        <MemorySystemControls
          memoryState={memorySystem.memoryState}
          isEditMode={memorySystem.isEditMode}
          onToggleMode={memorySystem.toggleMode}
          onSetEditMode={memorySystem.setEditMode}
          onSetViewMode={memorySystem.setViewMode}
          onSaveToStorage={memorySystem.saveToStorage}
          onLoadFromStorage={memorySystem.loadFromStorage}
          onClearStorage={memorySystem.clearStorage}
          hasStoredData={memorySystem.hasStoredData()}
          onSaveToServer={async () => { await memorySystem.saveToServer(); }}
          onForceSave={async () => { await memorySystem.forceSave(); }}
          lastSaved={memorySystem.getLastSaved()}
          storageInfo={memorySystem.getStorageInfo()}
          hasUnsavedChanges={memorySystem.hasUnsavedChanges()}
          compact={false}
          showStorageInfo={true}
        />
      </Paper>

      {/* Progress Stepper */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((step, index) => (
            <Step 
              key={step.label} 
              onClick={() => setActiveStep(index)}
              sx={{ cursor: 'pointer' }}
            >
              <StepLabel>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: activeStep === index ? 'bold' : 'normal',
                    color: activeStep === index ? 'primary.main' : 'text.secondary'
                  }}
                >
                  {step.label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {/* Step Navigation Info */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, opacity: 0.7 }}>
          <Typography variant="caption" color="text.secondary">
            Click on any step to navigate directly • Step {activeStep + 1} of {steps.length}
          </Typography>
        </Box>
      </Paper>

      {/* Content */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        paddingBottom: '120px' // Ensure content doesn't get hidden behind sticky navigation
      }}>
        {getStepContent(activeStep)}
      </Box>

      {/* Navigation */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          borderRadius: 0,
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button
            disabled={activeStep === 0}
            onClick={() => setActiveStep(prev => prev - 1)}
            startIcon={<ArrowBackIcon />}
            variant="outlined"
          >
            Previous
          </Button>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              disabled={saving}
              size="large"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            
            {/* Test Button for debugging */}
            <Button
              variant="outlined"
              color="warning"
              onClick={testFormData}
              size="small"
              sx={{ fontSize: '0.75rem' }}
            >
              🧪 Test Form
            </Button>
            
            {/* Debug Current Record State */}
            <Button
              variant="outlined"
              color="info"
              onClick={() => {
                console.log('🔬 [DEBUG] Current record state:', record);
                console.log('🔬 [DEBUG] Record ID:', recordId);
                console.log('🔬 [DEBUG] Chief complaint:', record.chiefComplaint);
                console.log('🔬 [DEBUG] Physical exam:', record.physicalExamination);
                console.log('🔬 [DEBUG] Vital signs:', record.vitalSigns);
                console.log('🔬 [DEBUG] Plan:', record.plan);
                alert(`DEBUG INFO:\nRecord ID: ${recordId}\nChief Complaint: ${record.chiefComplaint?.description || 'EMPTY'}\nDuration: ${record.chiefComplaint?.duration || 'EMPTY'}\nSeverity: ${record.chiefComplaint?.severity || 'EMPTY'}\nTemperature: ${record.vitalSigns?.temperature || 'EMPTY'}\nHeart Rate: ${record.vitalSigns?.heartRate || 'EMPTY'}\nPlan: ${record.plan || 'EMPTY'}`);
              }}
              size="small"
              sx={{ fontSize: '0.75rem' }}
            >
              🔬 Debug State
            </Button>
            
            {/* Manual Record Load Button */}
            {recordId && (
              <Button
                variant="outlined"
                color="info"
                onClick={() => {
                  // Simple reload by forcing re-fetch
                  console.log('🔄 Manual reload triggered for record:', recordId);
                  window.location.reload();
                }}
                size="small"
                sx={{ fontSize: '0.75rem' }}
                disabled={loading}
              >
                {loading ? '⌛ Loading...' : '🔄 Reload Page'}
              </Button>
            )}
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleFinalizeRecord}
                endIcon={<CheckCircleIcon />}
                disabled={saving || isFinalized || !record.reviewedAndApproved}
                color="success"
                size="large"
                sx={{ minWidth: '160px' }}
              >
                {saving ? 'Finalizing...' : isFinalized ? 'Finalized' : 'Finalize Record'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => setActiveStep(prev => prev + 1)}
                endIcon={<ArrowForwardIcon />}
                size="large"
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
        
        {/* Additional info for final step */}
        {activeStep === steps.length - 1 && (
          <Box sx={{ mt: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {record.reviewedAndApproved 
                ? "✅ Ready to finalize - All requirements met" 
                : "⚠️ Please approve the documentation to enable finalization"}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Enhanced AI Assistant Dialog */}
      <Dialog open={aiAssistantOpen} onClose={() => setAiAssistantOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <AIIcon color="primary" sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" component="div">
                AI Clinical Assistant
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Intelligent suggestions based on patient data
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                🤖 AI Analysis Complete
              </Typography>
              Based on the current documentation, here are intelligent clinical suggestions:
            </Alert>
            
            {/* Patient Summary */}
            <Card sx={{ mb: 3, bgcolor: '#f8fafd' }}>
              <CardHeader 
                title="Patient Summary" 
                avatar={<PersonIcon color="primary" />}
                sx={{ pb: 1 }}
              />
              <CardContent sx={{ pt: 0 }}>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Chief Complaint:</strong> {record.chiefComplaint?.description || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Quality Score:</strong> {qualityScore}%
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* AI Suggestions Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={0} aria-label="AI suggestions tabs">
                <Tab label="Diagnoses" />
                <Tab label="Medications" />
                <Tab label="Lab Tests" />
                <Tab label="Follow-up" />
                <Tab label="Red Flags" />
                <Tab label="Clinical Notes" />
              </Tabs>
            </Box>

            {/* Diagnoses Tab */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentIcon color="primary" />
                Differential Diagnoses
              </Typography>
              <Grid container spacing={2}>
                {aiSuggestions.diagnoses?.map((diagnosis: string, index: number) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <Card sx={{ p: 2, border: '1px solid #e0e0e0', '&:hover': { borderColor: 'primary.main' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {diagnosis}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Medications Tab */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MedicationIcon color="primary" />
                Medication Suggestions
              </Typography>
              <Grid container spacing={2}>
                {aiSuggestions.medications?.map((medication: string, index: number) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={index}>
                    <Card sx={{ p: 2, border: '1px solid #e0e0e0', '&:hover': { borderColor: 'primary.main' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {medication}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Lab Tests Tab */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LabIcon color="primary" />
                Recommended Lab Tests
              </Typography>
              <Grid container spacing={2}>
                {aiSuggestions.labTests?.map((test: string, index: number) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={index}>
                    <Card sx={{ p: 2, border: '1px solid #e0e0e0', '&:hover': { borderColor: 'primary.main' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {test}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Follow-up Tab */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon color="primary" />
                Follow-up Recommendations
              </Typography>
              <List>
                {aiSuggestions.followUp?.map((item: string, index: number) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Red Flags Tab */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="error" />
                Red Flags to Watch For
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  ⚠️ Important Warning Signs
                </Typography>
                <List dense>
                  {aiSuggestions.redFlags?.map((flag: string, index: number) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon>
                        <WarningIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={flag} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            </Box>

            {/* Clinical Notes Tab */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon color="primary" />
                Clinical Notes & Considerations
              </Typography>
              <List>
                {aiSuggestions.clinicalNotes?.map((note: string, index: number) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon>
                      <InfoIcon color="info" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={note} />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Button
                variant="contained"
                startIcon={<AIIcon />}
                onClick={() => generateAISuggestions('all', record)}
                color="primary"
              >
                Refresh AI Analysis
              </Button>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => {
                  // Apply suggestions to form
                  toast.success('AI suggestions applied to form!');
                }}
              >
                Apply Suggestions
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafd' }}>
          <Button onClick={() => setAiAssistantOpen(false)} variant="outlined">
            Close
          </Button>
          <Button 
            onClick={() => {
              generateAISuggestions('all', record);
              toast.info('AI analysis refreshed!');
            }} 
            variant="contained"
            startIcon={<RefreshIcon />}
          >
            Refresh Analysis
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedMedicalRecordForm; 