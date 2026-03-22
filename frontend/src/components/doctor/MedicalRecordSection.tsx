import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { 
  Box, Typography, Paper, Button, Grid, Tabs, Tab, Table, 
  TableHead, TableBody, TableRow, TableCell, Divider, Card, 
  CardContent, Chip, DialogTitle, Dialog, DialogContent, 
  DialogActions, TextField, Alert, CircularProgress,
  InputLabel, Select, MenuItem, FormControlLabel, Switch,
  Stepper, Step, StepLabel, RadioGroup, Radio, FormLabel, FormHelperText,
  OutlinedInput, SelectChangeEvent, Avatar, Badge, ButtonGroup, Tooltip,
  IconButton, FormControl, Accordion, AccordionSummary, AccordionDetails,
  AppBar, Toolbar
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  AddCircleOutline as AddIcon,
  Medication as MedicationIcon,
  Science as ScienceIcon,
  Receipt as ReceiptIcon,
  LocalHospital as LocalHospitalIcon,
  Event as EventIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
  ShoppingBag as ShoppingBagIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon, 
  ArrowForward as ArrowForwardIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Favorite as HeartBeatIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { formatDate, formatTime, formatDateTime } from '../../utils/formatters';
import MedicalRecordForm from './nextgen/MedicalRecordForm';
import PatientTimeline from './nextgen/PatientTimeline';
import ReactDOM from 'react-dom';

// Types
interface MedicalRecord {
  id: string;
  _id?: string;
  patientId: string;
  date: string;
  chiefComplaint: string | {
    description?: string;
    duration?: string;
    severity?: string;
  };
  historyOfPresentIllness?: string;
  symptoms: string;
  diagnosis?: string;
  treatment?: string;
  diagnoses?: Array<{
    id?: string;
    description: string;
    type?: string;
    notes?: string;
  }>;
  treatmentPlan?: string;
  plan?: string;
  assessment?: {
    diagnosis?: string;
    differentials?: string[];
  };
  notes: string;
  doctorId: string;
  doctorName: string;
  status?: string;
  vitals: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    weight?: string;
    height?: string;
  };
  physicalExam?: {
    generalAppearance?: string;
    heent?: string;
    chest?: string;
    cardiovascular?: string;
    abdomen?: string;
    extremities?: string;
    neurological?: string;
    skin?: string;
    other?: string;
    summary?: string;
  };
  medications?: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    inventoryId?: string;
    quantity?: number;
  }>;
  labTests?: Array<{
    id: string;
    name: string;
    status: string;
    results?: string;
    date?: string;
  }>;
  invoices?: Array<{
    id: string;
    amount: number;
    status: string;
    date: string;
    items: Array<{
      description: string;
      amount: number;
      quantity: number;
    }>;
  }>;
  inventoryItems?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
}

interface MedicalRecordSectionProps {
  patientId: string;
  recordId?: string | null;
  mode?: 'view' | 'create' | 'edit';
  onRecordSaved?: () => void;
}

const MedicalRecordSection: React.FC<MedicalRecordSectionProps> = ({ 
  patientId, 
  recordId = null,
  mode = 'create',
  onRecordSaved 
}) => {
  // Constants
  const AUTO_SAVE_KEY = `medical-record-draft-${patientId}`;
  const LOCAL_SAVE_INTERVAL = 5000;
  const SERVER_SAVE_INTERVAL = 30000;
  const VIEW_MODE = 'view' as const;
  const CREATE_MODE = 'create' as const;
  const EDIT_MODE = 'edit' as const;

  // State hooks
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [openNewRecordDialog, setOpenNewRecordDialog] = useState(false);
  const [formStepIndex, setFormStepIndex] = useState(0);
  const [dialogState, setDialogState] = useState<'normal' | 'minimized' | 'maximized'>('normal');
  const [serverAutoSaveEnabled, setServerAutoSaveEnabled] = useState(true);
  const [lastServerSaveTime, setLastServerSaveTime] = useState<string | null>(null);
  const [draftRecordId, setDraftRecordId] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<MedicalRecord | null>(null);
  const [isLoadingState, setIsLoading] = useState(false);
  const [latestVitals, setLatestVitals] = useState<MedicalRecord['vitals']>({});
  const [isLoadingVitals, setIsLoadingVitals] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<MedicalRecord>>({});
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [componentMode, setComponentMode] = useState<'view' | 'create' | 'edit'>(mode);

  // Update componentMode when mode prop changes
  useEffect(() => {
    setComponentMode(mode);
  }, [mode]);

  // Helper function to generate sample data
  const generateSampleData = () => {
    const patientSeed = patientId ? parseInt(patientId.substring(0, 8), 16) : Date.now();
    const rand = (min: number, max: number) => {
      const x = Math.sin(patientSeed + min) * 10000;
      const randomVal = x - Math.floor(x);
      return Math.floor(randomVal * (max - min + 1)) + min;
    };
    
          return {
      temperature: `${(36 + rand(0, 20) / 10).toFixed(1)}°C`,
      bloodPressure: `${110 + rand(0, 30)}/${70 + rand(0, 20)}`,
      heartRate: `${60 + rand(0, 40)} bpm`,
      respiratoryRate: `${12 + rand(0, 8)}/min`,
      oxygenSaturation: `${95 + rand(0, 5)}%`,
      weight: `${50 + rand(0, 40)} kg`,
      height: `${150 + rand(0, 40)} cm`
    };
  };

  // Fetch latest vitals
  const fetchLatestVitals = async () => {
    if (!patientId) return;
    
    setIsLoadingVitals(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/doctor/vitals/latest/${patientId}`, {
        timeout: 5000
        });
        
        if (response.data.success && response.data.data) {
          const vitalsData = response.data.data;
        setLatestVitals(vitalsData);
          setNewRecord(prev => ({
            ...prev,
          vitals: vitalsData
        }));
          toast("Latest vital signs loaded");
        } else {
        const sampleData = generateSampleData();
        setLatestVitals(sampleData);
        setNewRecord(prev => ({
          ...prev,
          vitals: sampleData
        }));
        toast('No vital signs found. Using sample data.');
      }
    } catch (error) {
      const sampleData = generateSampleData();
      setLatestVitals(sampleData);
      setNewRecord(prev => ({
        ...prev,
        vitals: sampleData
      }));
      toast('Could not connect to vital signs service. Using sample data.');
    } finally {
      setIsLoadingVitals(false);
    }
  };
  
  // Effects
  useEffect(() => {
    if (openNewRecordDialog) {
      fetchLatestVitals();
    }
  }, [openNewRecordDialog, patientId]);

  useEffect(() => {
    if (medicalRecords) {
      console.log("Current medical records:", medicalRecords);
    }
  }, [medicalRecords]);

  useEffect(() => {
      if (!openNewRecordDialog) return;
      
      try {
        const savedData = localStorage.getItem(AUTO_SAVE_KEY);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData._draftId) {
            setDraftRecordId(parsedData._draftId);
          }
          setNewRecord(parsedData);
        }
      } catch (error) {
      console.error('Error loading draft from localStorage:', error);
    }
  }, [openNewRecordDialog, AUTO_SAVE_KEY]);

  // Helper function to format chief complaint
  const formatChiefComplaint = (complaint: MedicalRecord['chiefComplaint']): string => {
    if (typeof complaint === 'string') {
      return complaint;
    }
    if (complaint && typeof complaint === 'object') {
      return complaint.description || '';
    }
    return '';
  };

  // Helper function to convert mode to expected type
  const getFormMode = (mode: 'view' | 'create' | 'edit'): 'create' | 'edit' | undefined => {
    if (mode === 'view') return 'create';
    return mode;
  };

  // Render
  return (
    ReactDOM.createPortal(
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'white',
        zIndex: 2000,
        overflow: 'auto',
      display: 'flex', 
      flexDirection: 'column',
          margin: 0, 
        borderRadius: 0,
        boxShadow: 'none',
        maxWidth: 'none',
      }}>
        <MedicalRecordForm
          patientId={patientId}
          recordId={recordId || undefined}
          mode={getFormMode(componentMode)}
          onSave={onRecordSaved}
          hideHeader={false}
        />
      </div>,
      document.body
    )
  );
};

export default MedicalRecordSection; 