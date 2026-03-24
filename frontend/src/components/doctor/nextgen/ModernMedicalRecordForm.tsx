import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
// import { useMemorySystem } from '../../../hooks/useMemorySystem';
// import MemorySystemControls from '../MemorySystemControls';
import { getAuthToken } from '../../../utils/authToken';
import AIAssistantService from '../../../services/aiAssistantService';
import { toast } from 'react-toastify';
import MedicalRecordErrorBoundary from './MedicalRecordErrorBoundary';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Avatar,
  IconButton,
  Divider,
  Fade,
  Slide,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Badge,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Rating,
  Slider,
  ButtonGroup,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Breadcrumbs,
  Link,
  Container,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  ListSubheader,
  Skeleton,
  Popper,
  // MuiPaper
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Person as PersonIcon,
  MedicalServices as MedicalIcon,
  Assessment as AssessmentIcon,
  Healing as HealingIcon,
  HealthAndSafety as HealthIcon,
  Favorite as HeartIcon,
  Thermostat as TempIcon,
  Favorite as HeartRateIcon,
  Air as LungsIcon,
  Bloodtype as BloodtypeIcon,
  Height as HeightIcon,
  MonitorWeight as WeightIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Psychology as AIIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Star as StarIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioUncheckedIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Timeline as TimelineIcon,
  LocalHospital as HospitalIcon,
  Security as SecurityIcon,
  Medication as MedicationIcon,
  Science as LabIcon,
  Camera as ImagingIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  ContactSupport as SupportIcon,
  Lightbulb as LightbulbIcon,
  AutoAwesome as SparkleIcon,
  Dashboard as DashboardIcon,
  PersonAdd as PersonAddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { styled, useTheme, alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import prescriptionService from '../../../services/prescriptionService';
import labService from '../../../services/labService';
import vitalSignsService from '../../../services/vitalSignsService';
import imagingService from '../../../services/imagingService';
import authService from '../../../services/authService';
import { ipdService } from '../../../services/ipdService';
import { formatDateTime } from '../../../utils/formatters';
import { enhancedDiagnosisDatabase } from '../../../data/enhancedDiagnosisDatabase';
import icd11Service from '../../../services/icd11Service';
import { API_BASE_URL as CONFIG_API_BASE_URL } from '../../../config';

// Classic MUI Grid (with item/container API)
// NOTE: Ensure only one Grid import exists

// Styled Components for Enhanced UI
const GradientCard = styled(Card)(({ theme }) => ({
  background: theme.palette.background.paper,
  borderRadius: 8,
  boxShadow: 'none',
  border: `1px solid ${theme.palette.divider}`,
}));

const ModernStepper = styled(Stepper)(({ theme }) => ({
  '& .MuiStepLabel-root': {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    padding: theme.spacing(1),
    borderRadius: 12,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
    },
  },
  '& .MuiStepIcon-root': {
    fontSize: '1.8rem',
    '&.Mui-active': {
      color: theme.palette.primary.main,
      transform: 'scale(1.1)',
    },
    '&.Mui-completed': {
      color: theme.palette.success.main,
    },
  },
}));

const FloatingActionButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(3),
  right: theme.spacing(3),
  zIndex: 1000,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
    transform: 'scale(1.05)',
  },
}));

const StatsCard = styled(Card)(({ theme }) => ({
  borderRadius: 8,
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
}));

// VitalCard component removed as it's not used in this component

interface ModernMedicalRecordFormProps {
  patientId: string;
  recordId?: string;
  mode?: 'view' | 'create' | 'edit';
  onSave?: (record: any) => void;
  onCancel?: () => void;
  onCreatePrescription?: (patient: any) => void;
  onOrderLabTest?: (patient: any) => void;
  onRequestImaging?: (patient: any) => void;
  initialRecordData?: any; // Add prop for pre-loaded record data
  patientData?: any; // Add prop for patient data
}

interface PhysicalExaminationData {
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
  neurological: string;
  musculoskeletal: string;
  skin: string;
  summary?: string; // free-text narrative
}

// Determine backend API base URL — always prefer the runtime env-config.js value
// so production (Vercel) never falls back to a local LAN IP.
const API_BASE_URL: string = (() => {
  const w = window as any;
  return (
    w?._env_?.REACT_APP_API_URL ||
    w?._env_?.VITE_API_URL ||
    w?._env_?.API_BASE_URL ||
    w?.API_BASE_URL ||
    w?.envConfig?.API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    CONFIG_API_BASE_URL ||
    ''
  );
})();

// Simple debounce function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
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

// Enhanced search utilities
const searchHistory = new Set<string>();
const MAX_SEARCH_HISTORY = 10;

// Fuzzy search function for better matching
const fuzzySearch = (text: string, query: string): boolean => {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match gets highest priority
  if (textLower.includes(queryLower)) return true;
  
  // Word boundary matching
  const words = queryLower.split(/\s+/);
  return words.every(word => textLower.includes(word));
};

// Relevance scoring function
const calculateRelevanceScore = (option: any, query: string): number => {
  const queryLower = query.toLowerCase();
  let score = 0;
  
  // Exact matches get highest scores
  if (option.diagnosis.toLowerCase().includes(queryLower)) score += 100;
  if (option.nhdd.toLowerCase().includes(queryLower)) score += 80;
  if (option.icd11.toLowerCase().includes(queryLower)) score += 70;
  if (option.icd10.toLowerCase().includes(queryLower)) score += 60;
  
  // Common terms matching
  if (option.commonTerms.some((term: string) => term.toLowerCase().includes(queryLower))) {
    score += 50;
  }
  
  // Category matching
  if (option.category.toLowerCase().includes(queryLower)) score += 30;
  if (option.subcategory?.toLowerCase().includes(queryLower)) score += 25;
  
  // Chapter and block matching
  if (option.icd11Chapter?.toLowerCase().includes(queryLower)) score += 20;
  if (option.icd11Block?.toLowerCase().includes(queryLower)) score += 15;
  
  // Boost ESV-ICD-11 entries
  if (option.category.includes('ESV-ICD-11')) score += 10;
  
  return score;
};

// Get popular/common diagnoses
const getPopularDiagnoses = () => {
  const popularCodes = [
    'ESV001', 'ESV002', 'ESV003', 'ESV004', 'ESV005', // Typhoid, Malaria, etc.
    'ESV006', 'ESV007', 'ESV008', 'ESV009', 'ESV010'  // Common conditions
  ];
  return enhancedDiagnosisDatabase.filter(dx => popularCodes.includes(dx.nhdd));
};

export const ModernMedicalRecordForm: React.FC<ModernMedicalRecordFormProps> = ({
  patientId,
  recordId,
  mode = 'create',
  onSave,
  onCancel,
  onCreatePrescription,
  onOrderLabTest,
  onRequestImaging,
  initialRecordData,
  patientData: propPatientData
}) => {
  // Enhanced search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchHistoryList, setSearchHistoryList] = useState<string[]>([]);

  // Separate search state for primary diagnosis
  const [primarySearchQuery, setPrimarySearchQuery] = useState('');
  const [primarySearchResults, setPrimarySearchResults] = useState<any[]>([]);
  const [primaryIsSearching, setPrimaryIsSearching] = useState(false);

  // Separate search state for secondary diagnoses
  const [secondarySearchQuery, setSecondarySearchQuery] = useState('');
  const [secondarySearchResults, setSecondarySearchResults] = useState<any[]>([]);
  const [secondaryIsSearching, setSecondaryIsSearching] = useState(false);

  // Enhanced search functions
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      // HYBRID SEARCH: Search both local database and WHO API in parallel
      const [localResults, whoResults] = await Promise.all([
        // Local database search
        new Promise<any[]>((resolve) => {
          // Simulate small delay for better UX
          setTimeout(() => {
            const results = enhancedDiagnosisDatabase
              .map(option => ({
                ...option,
                relevanceScore: calculateRelevanceScore(option, query),
                source: 'local'
              }))
              .filter(option => 
                fuzzySearch(option.diagnosis, query) ||
                fuzzySearch(option.nhdd, query) ||
                fuzzySearch(option.icd11, query) ||
                fuzzySearch(option.icd10, query) ||
                fuzzySearch(option.category, query) ||
                option.commonTerms.some((term: string) => fuzzySearch(term, query))
              )
              .sort((a, b) => b.relevanceScore - a.relevanceScore)
              .slice(0, 15); // Get top 15 local results
            
            console.log(`[SEARCH] Local database found ${results.length} results`);
            resolve(results);
          }, 50);
        }),
        
        // WHO API search (fallback gracefully if fails)
        icd11Service.search(query, 10).catch(err => {
          console.warn('[SEARCH] WHO API search failed, using local only:', err);
          return [];
        })
      ]);

      // Combine and deduplicate results
      const combinedResults = [...localResults];
      
      // Add WHO API results if they don't already exist in local results
      if (whoResults && whoResults.length > 0) {
        console.log(`[SEARCH] WHO API found ${whoResults.length} results`);
        
        whoResults.forEach(whoResult => {
          // Check if this result already exists in local results
          const existsInLocal = localResults.some(localResult => 
            localResult.icd11 === whoResult.icd11 ||
            localResult.diagnosis.toLowerCase() === whoResult.diagnosis.toLowerCase()
          );
          
          if (!existsInLocal) {
            // Add WHO result with adjusted relevance score
            combinedResults.push({
              ...whoResult,
              relevanceScore: (whoResult.matchScore || 50) + 25, // Boost WHO results slightly
              source: 'WHO-API'
            });
          }
        });
      }

      // Sort combined results by relevance score and limit to top 20
      const finalResults = combinedResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 20);
      
      console.log(`[SEARCH] Total combined results: ${finalResults.length} (${localResults.length} local + ${whoResults.length} WHO)`);
      
      setSearchResults(finalResults);
      
      // Add to search history
      if (query.trim() && !searchHistory.has(query.trim())) {
        searchHistory.add(query.trim());
        if (searchHistory.size > MAX_SEARCH_HISTORY) {
          const firstItem = searchHistory.values().next().value;
          searchHistory.delete(firstItem);
        }
        setSearchHistoryList(Array.from(searchHistory));
      }
    } catch (error) {
      console.error('[SEARCH] Hybrid search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [performSearch]
  );

  // Handle search input change
  const handleSearchInputChange = useCallback((value: string) => {
    console.log('🔍 [SEARCH] Input changed:', value);
    setSearchQuery(value);
    if (value.trim()) {
      console.log('🔍 [SEARCH] Triggering search for:', value);
      debouncedSearch(value);
      setShowSearchSuggestions(false);
    } else {
      console.log('🔍 [SEARCH] Clearing search results');
      setSearchResults([]);
      setShowSearchSuggestions(true);
    }
  }, [debouncedSearch]);

  // Get search suggestions
  const getSearchSuggestions = useCallback(() => {
    const suggestions = [];
    
    // Add popular diagnoses
    if (getPopularDiagnoses().length > 0) {
      suggestions.push({
        type: 'popular',
        title: 'Popular Diagnoses',
        items: getPopularDiagnoses().slice(0, 5)
      });
    }
    
    // Add recent searches
    if (searchHistoryList.length > 0) {
      suggestions.push({
        type: 'history',
        title: 'Recent Searches',
        items: searchHistoryList.slice(0, 5).map(query => ({
          diagnosis: query,
          nhdd: '',
          icd11: '',
          icd10: '',
          category: 'Recent Search',
          isHistoryItem: true
        }))
      });
    }
    
    return suggestions;
  }, [searchHistoryList]);

  // Generic diagnosis search (returns results, doesn't touch state)
  const runDiagnosisSearch = useCallback(async (query: string): Promise<any[]> => {
    if (!query.trim()) return [];
    try {
      const [localResults, whoResults] = await Promise.all([
        new Promise<any[]>((resolve) => {
          setTimeout(() => {
            const results = enhancedDiagnosisDatabase
              .map(option => ({
                ...option,
                relevanceScore: calculateRelevanceScore(option, query),
                source: 'local'
              }))
              .filter(option =>
                fuzzySearch(option.diagnosis, query) ||
                fuzzySearch(option.nhdd, query) ||
                fuzzySearch(option.icd11, query) ||
                fuzzySearch(option.icd10, query) ||
                fuzzySearch(option.category, query) ||
                option.commonTerms.some((term: string) => fuzzySearch(term, query))
              )
              .sort((a, b) => b.relevanceScore - a.relevanceScore)
              .slice(0, 15);
            resolve(results);
          }, 50);
        }),
        icd11Service.search(query, 10).catch(() => [])
      ]);
      const combinedResults = [...localResults];
      if (whoResults && whoResults.length > 0) {
        whoResults.forEach((whoResult: any) => {
          const existsInLocal = localResults.some(
            (lr: any) => lr.icd11 === whoResult.icd11 || lr.diagnosis.toLowerCase() === whoResult.diagnosis.toLowerCase()
          );
          if (!existsInLocal) {
            combinedResults.push({ ...whoResult, relevanceScore: (whoResult.matchScore || 50) + 25, source: 'WHO-API' });
          }
        });
      }
      return combinedResults.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 20);
    } catch {
      return [];
    }
  }, []);

  // Debounced primary search
  const debouncedPrimarySearch = useMemo(
    () => debounce(async (query: string) => {
      const results = await runDiagnosisSearch(query);
      setPrimarySearchResults(results);
      setPrimaryIsSearching(false);
    }, 300),
    [runDiagnosisSearch]
  );

  // Debounced secondary search
  const debouncedSecondarySearch = useMemo(
    () => debounce(async (query: string) => {
      const results = await runDiagnosisSearch(query);
      setSecondarySearchResults(results);
      setSecondaryIsSearching(false);
    }, 300),
    [runDiagnosisSearch]
  );

  // Debug: Log all props received
  console.log('🔍 [ModernMedicalRecordForm] Props received:', {
    patientId,
    recordId,
    mode,
    propPatientData: propPatientData ? {
      firstName: propPatientData.firstName,
      lastName: propPatientData.lastName,
      age: propPatientData.age,
      dateOfBirth: propPatientData.dateOfBirth,
      contactNumber: propPatientData.contactNumber,
      patientId: propPatientData.patientId
    } : null,
    initialRecordData: initialRecordData ? {
      _id: initialRecordData._id,
      chiefComplaint: initialRecordData.chiefComplaint,
      historyOfPresentIllness: initialRecordData.historyOfPresentIllness,
      status: initialRecordData.status
    } : null,
    hasInitialRecordData: !!initialRecordData
  });

  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Memory System Integration - Disabled to prevent infinite loop
  // const memorySystem = useMemorySystem({
  //   patientId,
  //   recordId,
  //   debounceMs: 2000,
  //   autoLoad: false,
  //   onSave: async (data) => {
  //     // Auto-save functionality disabled to prevent infinite loop
  //     return { success: true, timestamp: new Date().toISOString() };
  //   },
  //   onRestore: (restoredData) => {
  //     // Restore functionality disabled to prevent infinite loop
  //   }
  // });

  // Create a mock memory system object to prevent errors
  const memorySystem = {
    updateData: () => {
      // Disabled to prevent infinite loop
      console.log('🔄 [MEMORY] updateData called but disabled to prevent infinite loop');
    },
    getMemoryState: () => ({
      data: {},
      lastSaved: '',
      isDirty: false,
      isAutoSaving: false,
      hasUnsavedChanges: false
    }),
    hasUnsavedChanges: () => false,
    getLastSaved: () => '',
    forceSave: async () => ({ success: true, timestamp: new Date().toISOString() }),
    restore: () => null,
    hasStoredData: () => false,
    getStorageInfo: () => ({ key: '', size: 0, lastSaved: '', hasData: false }),
    clearStorage: () => {}
  };
  
  // Custom styles for view mode to make text more readable
  const viewModeStyles = mode === 'view' ? {
    '& .MuiInputBase-input.Mui-disabled': {
      color: '#000000 !important',
      WebkitTextFillColor: '#000000 !important',
      opacity: '1 !important'
    },
    '& .MuiInputLabel-root.Mui-disabled': {
      color: '#000000 !important',
      opacity: '0.8 !important'
    },
    '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
      borderColor: '#1976d2 !important',
      borderWidth: '1px !important'
    },
    '& .MuiSelect-select.Mui-disabled': {
      color: '#000000 !important',
      WebkitTextFillColor: '#000000 !important',
      opacity: '1 !important'
    },
    '& .MuiInputBase-root.Mui-disabled': {
      '& .MuiInputBase-input': {
        color: '#000000 !important',
        WebkitTextFillColor: '#000000 !important',
        opacity: '1 !important'
      }
    },
    '& .MuiFormControl-root .Mui-disabled': {
      '& .MuiInputBase-input': {
        color: '#000000 !important',
        WebkitTextFillColor: '#000000 !important',
        opacity: '1 !important'
      }
    },
    // Autocomplete specific styles for view mode
    '& .MuiAutocomplete-root.Mui-disabled': {
      '& .MuiInputBase-input': {
        color: '#000000 !important',
        WebkitTextFillColor: '#000000 !important',
        opacity: '1 !important'
      },
      '& .MuiChip-root': {
        color: '#000000 !important',
        backgroundColor: '#f5f5f5 !important',
        borderColor: '#1976d2 !important'
      },
      '& .MuiChip-label': {
        color: '#000000 !important',
        WebkitTextFillColor: '#000000 !important',
        opacity: '1 !important'
      }
    },
    '& .MuiAutocomplete-inputRoot.Mui-disabled': {
      '& .MuiInputBase-input': {
        color: '#000000 !important',
        WebkitTextFillColor: '#000000 !important',
        opacity: '1 !important'
      }
    },
    '& .MuiChip-root.Mui-disabled': {
      color: '#000000 !important',
      backgroundColor: '#f5f5f5 !important',
      borderColor: '#1976d2 !important',
      '& .MuiChip-label': {
        color: '#000000 !important',
        WebkitTextFillColor: '#000000 !important',
        opacity: '1 !important'
      }
    },
    // More specific Autocomplete overrides
    '& .MuiAutocomplete-root': {
      '& .Mui-disabled .MuiChip-root': {
        color: '#000000 !important',
        backgroundColor: '#f5f5f5 !important',
        borderColor: '#1976d2 !important',
        '& .MuiChip-label': {
          color: '#000000 !important',
          WebkitTextFillColor: '#000000 !important',
          opacity: '1 !important'
        }
      },
      '& .Mui-disabled .MuiInputBase-input': {
        color: '#000000 !important',
        WebkitTextFillColor: '#000000 !important',
        opacity: '1 !important'
      }
    },
    // Direct chip overrides
    '& .MuiChip-root': {
      '&.Mui-disabled': {
        color: '#000000 !important',
        backgroundColor: '#f5f5f5 !important',
        borderColor: '#1976d2 !important',
        '& .MuiChip-label': {
          color: '#000000 !important',
          WebkitTextFillColor: '#000000 !important',
          opacity: '1 !important'
        }
      }
    },
    // Global disabled input overrides
    '& .Mui-disabled': {
      '& .MuiChip-root': {
        color: '#000000 !important',
        backgroundColor: '#f5f5f5 !important',
        borderColor: '#1976d2 !important',
        '& .MuiChip-label': {
          color: '#000000 !important',
          WebkitTextFillColor: '#000000 !important',
          opacity: '1 !important'
        }
      },
      '& .MuiInputBase-input': {
        color: '#000000 !important',
        WebkitTextFillColor: '#000000 !important',
        opacity: '1 !important'
      }
    }
  } : {};
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [qualityScore, setQualityScore] = useState(75);
  const [aiSuggestions, setAiSuggestions] = useState<any>({});
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(recordId || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  // Helper function to calculate age from date of birth
  const calculateAgeFromDOB = (dob: string | undefined): number => {
    if (!dob) return 0;
    
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birth month/day hasn't occurred yet this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= 0 ? age : 0;
    } catch (e) {
      console.warn('Could not calculate age from date of birth:', dob);
      return 0;
    }
  };

  const [patientData, setPatientData] = useState(() => {
    // Calculate age from date of birth if not provided
    let calculatedAge = propPatientData?.age || 0;
    if (!calculatedAge && propPatientData?.dateOfBirth) {
      calculatedAge = calculateAgeFromDOB(propPatientData.dateOfBirth);
    }
    
    const initialPatientData = {
      firstName: propPatientData?.firstName || '',
      lastName: propPatientData?.lastName || '',
      age: calculatedAge,
      gender: propPatientData?.gender || '',
      id: propPatientData?.patientId || propPatientData?._id || propPatientData?.id || '',
      phone: propPatientData?.phone || propPatientData?.contactNumber || '',
      avatar: propPatientData?.avatar || '/assets/images/logo-placeholder.svg'
    };
    
    console.log('🔍 [ModernMedicalRecordForm] Initial patient data:', initialPatientData);
    console.log('🔍 [ModernMedicalRecordForm] Prop patient data:', propPatientData);
    
    return initialPatientData;
  });

  // Ref to prevent auto-save on initial mount
  const isFirstRender = useRef(true);
  
  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [latestNurseVitals, setLatestNurseVitals] = useState<any | null>(null);
  
  // Debug: Monitor dialog state changes
  useEffect(() => {
    console.log('History dialog state changed:', historyDialogOpen);
  }, [historyDialogOpen]);
  const [allPrescriptions, setAllPrescriptions] = useState<any[]>([]);
  const [allLabResults, setAllLabResults] = useState<any[]>([]);
  const [allImagingResults, setAllImagingResults] = useState<any[]>([]);
  // Fallback data when no finalized records exist
  const [fallbackPrescriptions, setFallbackPrescriptions] = useState<any[]>([]);
  const [fallbackLabResults, setFallbackLabResults] = useState<any[]>([]);
  const [fallbackImagingResults, setFallbackImagingResults] = useState<any[]>([]);
  const [isEditingQualityChecks, setIsEditingQualityChecks] = useState(false);
  // IPD (Care Coordination): current admission for this patient
  const [ipdAdmission, setIpdAdmission] = useState<any>(null);
  const [ipdLoading, setIpdLoading] = useState(false);
  const [ipdShowPanel, setIpdShowPanel] = useState(false);
  const [ipdDialog, setIpdDialog] = useState<'admit' | 'bed' | 'discharge' | null>(null);
  const [ipdAdmitForm, setIpdAdmitForm] = useState({ wardName: 'General Ward', roomNumber: '', bedNumber: '', notes: '' });
  const [ipdBedChargeForm, setIpdBedChargeForm] = useState({ days: 1, unitPrice: '', description: '' });
  const [ipdDischargeNotes, setIpdDischargeNotes] = useState('');
  const [ipdSubmitting, setIpdSubmitting] = useState(false);
  
  // Nurse vital signs state
  const [nurseVitalSigns, setNurseVitalSigns] = useState<any>(null);
  const [loadingVitalSigns, setLoadingVitalSigns] = useState(false);
  const [vitalSignsError, setVitalSignsError] = useState<string | null>(null);

  // Custom findings state - for user-added entries
  const [customFindings, setCustomFindings] = useState<{[key: string]: string[]}>({
    general: [],
    head: [],
    eyes: [],
    ears: [],
    nose: [],
    throat: [],
    cardiovascular: [],
    respiratory: [],
    gastrointestinal: [],
    neurological: [],
    musculoskeletal: [],
    skin: []
  });

  // Smart auto-fill state
  const [hpiSuggestions, setHpiSuggestions] = useState<string[]>([]);
  const [showHpiSuggestions, setShowHpiSuggestions] = useState(false);
  const [hpiAutoFillLoading, setHpiAutoFillLoading] = useState(false);
  const [physicalExamAutoFilled, setPhysicalExamAutoFilled] = useState(false);
  const hpiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Gemini AI suggested phrases (organized by OLD CARTS category)
  const [geminiPhrases, setGeminiPhrases] = useState<{
    duration?: string[];
    severity?: string[];
    progression?: string[];
    location?: string[];
    character?: string[];
    aggravating?: string[];
    relieving?: string[];
    associated?: string[];
  }>({});
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const [geminiRedFlags, setGeminiRedFlags] = useState<string[]>([]);
  const [geminiDiagnoses, setGeminiDiagnoses] = useState<string[]>([]);

  // Load custom findings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('customMedicalFindings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomFindings(parsed);
        console.log('✨ Loaded custom medical findings:', parsed);
      }
    } catch (error) {
      console.error('Error loading custom findings:', error);
    }
  }, []);

  // Save custom findings to localStorage
  const saveCustomFinding = (category: string, value: string) => {
    if (!value || value.trim() === '') return;
    
    setCustomFindings(prev => {
      const existing = prev[category] || [];
      // Only add if it doesn't exist already
      if (!existing.includes(value.trim())) {
        const updated = {
          ...prev,
          [category]: [...existing, value.trim()]
        };
        // Save to localStorage
        try {
          localStorage.setItem('customMedicalFindings', JSON.stringify(updated));
          console.log(`✨ Saved custom finding for ${category}:`, value);
        } catch (error) {
          console.error('Error saving custom finding:', error);
        }
        return updated;
      }
      return prev;
    });
  };
  
  // Comprehensive medical findings for professional documentation - Expanded
  const heentFindings = {
    head: [
      'Normocephalic',
      'Atraumatic',
      'No visible lesions',
      'Symmetrical',
      'No tenderness',
      'No deformities',
      'Scalp normal',
      'Hair distribution normal',
      'Palpable masses',
      'Cranial asymmetry',
      'Trauma evident',
      'Scalp lesions',
      'Frontal bossing',
      'Macrocephaly',
      'Microcephaly',
      'Fontanelles soft and flat (pediatric)',
      'Head circumference within normal limits',
      'Bruising present',
      'Lacerations present',
      'Hematoma present'
    ],
    eyes: [
      'PERRLA (Pupils Equal, Round, Reactive to Light and Accommodation)',
      'EOMI (Extraocular Movements Intact)',
      'No conjunctivitis',
      'Sclera clear',
      'Sclera icteric',
      'No icterus',
      'Visual fields intact',
      'Visual acuity normal',
      'No nystagmus',
      'Fundi normal',
      'Red reflex present',
      'Conjunctiva pale',
      'Conjunctiva injected',
      'Periorbital edema',
      'Photophobia present',
      'Diplopia',
      'Ptosis',
      'Exophthalmos',
      'Enophthalmos',
      'Subconjunctival hemorrhage',
      'Corneal abrasion',
      'Cataracts present',
      'Arcus senilis',
      'Anisocoria'
    ],
    ears: [
      'TMs (Tympanic Membranes) clear',
      'TMs intact bilaterally',
      'No otitis media',
      'No cerumen impaction',
      'Hearing grossly intact',
      'Weber test midline',
      'Rinne test positive',
      'No discharge',
      'Canals clear',
      'TMs erythematous',
      'TMs bulging',
      'TMs retracted',
      'TMs perforated',
      'Otitis externa',
      'Otitis media',
      'Hearing loss',
      'Tinnitus reported',
      'Vertigo reported',
      'Mastoid tenderness',
      'Battle sign'
    ],
    nose: [
      'No rhinorrhea',
      'No congestion',
      'Septum midline',
      'Nares patent bilaterally',
      'No epistaxis',
      'Mucosa pink and moist',
      'Mucosa pale',
      'Mucosa erythematous',
      'Turbinates normal',
      'Nasal discharge clear',
      'Nasal discharge purulent',
      'Nasal congestion',
      'Septal deviation',
      'Septal perforation',
      'Polyps present',
      'Anosmia',
      'Post-nasal drip',
      'Sinuses non-tender',
      'Frontal sinus tenderness',
      'Maxillary sinus tenderness'
    ],
    throat: [
      'No pharyngitis',
      'No tonsillitis',
      'Tonsils normal size (1+)',
      'Tonsils 2+ enlarged',
      'Tonsils 3+ enlarged',
      'Tonsils 4+ enlarged (kissing)',
      'No exudate',
      'Uvula midline',
      'No lymphadenopathy',
      'Oropharynx clear',
      'Mucosa moist',
      'Pharynx erythematous',
      'Tonsillar exudate',
      'Posterior pharynx injection',
      'Posterior pharynx cobblestoning',
      'Difficulty swallowing (dysphagia)',
      'Odynophagia',
      'Hoarseness',
      'Stridor',
      'Thrush present',
      'Gag reflex intact',
      'Uvula deviated',
      'Peritonsillar abscess'
    ]
  };
  
  // Fetch patient medical history
  const fetchPatientHistory = async () => {
    try {
      console.log('=== FETCHING PATIENT HISTORY ===');
      console.log('Patient ID:', patientId);
      console.log('Patient Data:', patientData);
      console.log('Current historyDialogOpen state:', historyDialogOpen);
      
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Making request to:', `${API_BASE_URL}/api/medical-records/completed-patient-history?patientId=${patientId}`);
      console.log('User object:', user);
      console.log('User ID:', user?.id || user?._id);
      
      const token = authService.getToken();
      console.log('Auth token available:', !!token);
      
      // Test: Try to open dialog immediately to see if it works
      console.log('Testing dialog open...');
      setHistoryDialogOpen(true);
      console.log('Dialog open test completed');
      
      const response = await fetch(`${API_BASE_URL}/api/medical-records/completed-patient-history?patientId=${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Raw completed patient history response:', data);
        
        // Use the completed patient history records directly from the new endpoint
        const patientHistoryRecords = data.data || [];
        console.log('Patient history records found:', patientHistoryRecords.length);
        console.log('Patient history records:', patientHistoryRecords);
        

        
        setPatientHistory(patientHistoryRecords);

        // Proactively fetch latest nurse vitals to use as display fallback in history
        try {
          if (patientId) {
            const lv = await vitalSignsService.getLatestNurseVitals(patientId);
            setLatestNurseVitals(lv || null);
          }
        } catch (e) {
          console.warn('Could not fetch latest nurse vitals for history fallback:', e);
        }

        // Fetch all prescriptions for this patient
        try {
          const prescs = await prescriptionService.getPrescriptionsByPatient(patientId);
          // Also try fetching by patientData._id in case patientId is a custom string ID
          if ((!prescs || prescs.length === 0) && patientData?._id && patientData._id !== patientId) {
            const prescs2 = await prescriptionService.getPrescriptionsByPatient(patientData._id);
            setAllPrescriptions(prescs2 || []);
          } else {
            setAllPrescriptions(prescs || []);
          }
        } catch (err) {
          console.warn('Could not load prescriptions for history view:', err);
          setAllPrescriptions([]);
        }

        // Fetch all lab results for this patient to allow same-day display inside each record
        try {
          console.log('=== LAB RESULTS DEBUG ===');
          console.log('Patient ID looking for:', patientId);
          
          // Try direct patient endpoint first (most reliable)
          try {
            console.log('Fetching from direct patient endpoint...');
            const directResponse = await fetch(`${API_BASE_URL}/api/lab-results/patient/${patientId}`, {
              headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (directResponse.ok) {
              const directLabs = await directResponse.json();
              console.log('Direct patient lab results:', directLabs);
              console.log('Lab results details:', directLabs.map((lab: any) => ({
                testName: lab.testName,
                isMockData: lab.isMockData,
                status: lab.status,
                id: lab._id
              })));
              
              if (Array.isArray(directLabs) && directLabs.length > 0) {
                // Standardize the results and filter out mock data
                const standardizedLabs = directLabs
                  .filter((lab: any) => !lab.isMockData && lab._id !== 'placeholder_lab_test') // Filter out mock data
                  .map((lab: any) => ({
                    ...lab,
                    patientId: lab.patientId || patientId,
                    testName: lab.testName || lab.test?.name || 'Unknown Test',
                    status: lab.status || 'Completed'
                  }));
                
                console.log('Filtered and standardized lab results:', standardizedLabs);
                setAllLabResults(standardizedLabs);
                // Continue to imaging results instead of returning early
              }
            }
          } catch (directError) {
            console.warn('Direct patient lab results failed, trying doctor-based approach:', directError);
          }
          
          // Fallback to doctor-based approach
          const docId = user?.id || user?._id;
          if (docId) {
            const allLabs = await labService.getDoctorLabResults(docId);
            console.log('All doctor lab results:', allLabs);
            console.log('Lab results with patient IDs:', allLabs.map(lr => ({
              testName: lr.testName,
              patientId: lr.patientId,
              patient: (lr as any).patient,
              status: lr.status
            })));
            
            // Enhanced filtering to handle different ID formats
            const patientLabs = allLabs.filter((lr: any) => {
              const labPatientId = lr.patientId || lr.patient;
              const matches = labPatientId === patientId || 
                             labPatientId === patientData?.id ||
                             (typeof labPatientId === 'string' && typeof patientId === 'string' && 
                              labPatientId.toLowerCase() === patientId.toLowerCase());
              
              console.log(`Lab result ${lr.testName}: patientId=${labPatientId}, matches=${matches}`);
              return matches;
            });
            
            console.log('Filtered lab results for patient:', patientLabs);
            setAllLabResults(patientLabs);
          }
        } catch (err) {
          console.warn('Could not load lab results for history view:', err);
        }

        console.log('=== REACHING IMAGING RESULTS SECTION ===');
        console.log('About to start imaging results fetch...');
        console.log('imagingService available:', typeof imagingService);
        console.log('imagingService.getImagingResultsByPatient available:', typeof imagingService?.getImagingResultsByPatient);

        // Fetch all imaging results for this patient to allow same-day display inside each record
        try {
          console.log('=== IMAGING RESULTS DEBUG ===');
          console.log('Patient ID looking for:', patientId);
          console.log('Patient Data ID:', patientData?.id);
          console.log('Patient Data _id:', (patientData as any)?._id);
          console.log('About to call imagingService.getImagingResultsByPatient...');
          
          const patientImagingResults = await imagingService.getImagingResultsByPatient(patientId);
          console.log('Patient imaging results received:', patientImagingResults);
          console.log('Number of imaging results:', patientImagingResults?.length || 0);
          setAllImagingResults(patientImagingResults);
          console.log('Imaging results state updated');
        } catch (err) {
          console.error('Error loading imaging results for history view:', err);
          console.error('Error details:', err.message);
        }

        console.log('Setting historyDialogOpen to true');
        setHistoryDialogOpen(true);
        console.log('History dialog should now be open');
      } else {
        console.error('Failed to fetch patient history:', response.status, response.statusText);
        // Even if API fails, try to open dialog with fallback data
        console.log('API failed, but trying to open dialog with fallback data');
        setHistoryDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching patient history:', error);
      // Even if there's an error, try to open dialog
      console.log('Error occurred, but trying to open dialog anyway');
      setHistoryDialogOpen(true);
    }
  };

  // Load fallback prescriptions and lab results if no finalized records
  useEffect(() => {
    const loadFallback = async () => {
      if (!historyDialogOpen || patientHistory.length > 0 || !patientId) return;
      try {
        const presc = await prescriptionService.getPrescriptionsByPatient(patientId);
        // Determine the most recent prescription date (if any)
        let dayString: string | null = null;
        if (presc.length > 0) {
          const latest = presc.reduce((a: any, b: any) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
          dayString = new Date(latest.createdAt).toDateString();
        }
        // @ts-ignore – runtime fallback ensures fields exist
        const filteredPresc = dayString ? presc.filter((p: any) => {
          const dt = new Date(p.createdAt || p.date || p.created_date);
          return dt.toDateString() === dayString;
        }) : presc;
        setFallbackPrescriptions(filteredPresc);
        console.log('=== FALLBACK LAB RESULTS DEBUG ===');
        console.log('Patient ID looking for:', patientId);
        
        // Try direct patient endpoint first for fallback
        try {
          const directResponse = await fetch(`${API_BASE_URL}/api/lab-results/patient/${patientId}`, {
            headers: {
              'Authorization': `Bearer ${getAuthToken()}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (directResponse.ok) {
            const directLabs = await directResponse.json();
            console.log('Direct fallback lab results:', directLabs);
            
            if (Array.isArray(directLabs) && directLabs.length > 0) {
              // Filter by status and date if needed
              const filteredDirectLabs = directLabs.filter((lab: any) => {
                if ((lab.status || '').toLowerCase() !== 'completed') {
                  console.log(`Direct lab result ${lab.testName}: status=${lab.status}, status match=false`);
                  return false;
                }
                
                if (!dayString) {
                  console.log(`Direct lab result ${lab.testName}: no day filter, including`);
                  return true;
                }
                
                const dt = new Date(lab.resultDate || lab.orderDate || lab.completedDate);
                const dateMatches = dt.toDateString() === dayString;
                console.log(`Direct lab result ${lab.testName}: date=${dt.toDateString()}, dayString=${dayString}, date match=${dateMatches}`);
                return dateMatches;
              });
              
              console.log('Filtered direct fallback lab results:', filteredDirectLabs);
              setFallbackLabResults(filteredDirectLabs);
              return; // Use direct results if available
            }
          }
        } catch (directError) {
          console.warn('Direct fallback lab results failed, trying doctor-based approach:', directError);
        }
        
        // Fallback to doctor-based approach
        const docId = user?.id || user?._id;
        let labs: any[] = [];
        if (docId) {
          const allLabs = await labService.getDoctorLabResults(docId);
          console.log('All fallback lab results:', allLabs);
          
          labs = allLabs.filter((lr: any) => {
            const labPatientId = lr.patientId || lr.patient;
            const patientMatches = labPatientId === patientId || 
                                  labPatientId === patientData?.id ||
                                  (typeof labPatientId === 'string' && typeof patientId === 'string' && 
                                   labPatientId.toLowerCase() === patientId.toLowerCase());
            
            if (!patientMatches) {
              console.log(`Lab result ${lr.testName}: patientId=${labPatientId}, patient match=false`);
              return false;
            }
            
            if ((lr.status || '').toLowerCase() !== 'completed') {
              console.log(`Lab result ${lr.testName}: status=${lr.status}, status match=false`);
              return false;
            }
            
            if (!dayString) {
              console.log(`Lab result ${lr.testName}: no day filter, including`);
              return true;
            }
            
            // @ts-ignore – some results may miss fields but handled at runtime
            const dt = new Date(lr.resultDate || lr.orderDate);
            const dateMatches = dt.toDateString() === dayString;
            console.log(`Lab result ${lr.testName}: date=${dt.toDateString()}, dayString=${dayString}, date match=${dateMatches}`);
            return dateMatches;
          });
        }
        console.log('Filtered fallback lab results for patient:', labs);
        setFallbackLabResults(labs);

        // Load fallback imaging results
        try {
          console.log('=== FALLBACK IMAGING RESULTS DEBUG ===');
          console.log('Patient ID for fallback:', patientId);
          const imagingResults = await imagingService.getImagingResultsByPatient(patientId);
          console.log('Fallback imaging results:', imagingResults);
          
          // Filter by date if needed
          let filteredImagingResults = imagingResults;
          if (dayString && imagingResults.length > 0) {
            filteredImagingResults = imagingResults.filter((img: any) => {
              const dt = new Date(img.completionDateTime || img.orderDateTime || img.createdAt);
              return dt.toDateString() === dayString;
            });
          }
          
          console.log('Filtered fallback imaging results:', filteredImagingResults);
          setFallbackImagingResults(filteredImagingResults);
        } catch (err) {
          console.warn('Could not load fallback imaging results:', err);
        }
      } catch (err) {
        console.error('Error loading fallback prescription/lab data:', err);
      }
    };
    loadFallback();
  }, [historyDialogOpen, patientHistory.length, patientId, user?.id]);

  // Debounced auto-save function
  const autoSaveDraft = useRef(
    debounce(async (draftData: typeof formData) => {
      try {
        setAutoSaveStatus('saving');
        
        // Build payload as in handleSave, but always status: 'Draft'
        const userId = user?.id || user?._id;
        if (!userId || !patientId) {
          setAutoSaveStatus('idle');
          return;
        }
        
        // Use the new draft endpoint with relaxed validation
        const medicalRecordData = {
          patient: patientId,
          doctor: userId,
          status: 'Draft',
          visitDate: new Date().toISOString(),
          createdBy: userId,
          chiefComplaint: draftData.chiefComplaint.description || 'Medical consultation',
          historyOfPresentIllness: (draftData as any).historyOfPresentIllness || '',
          physicalExamination: draftData.physicalExamination,
          vitalSigns: draftData.vitalSigns,
          diagnosis: draftData.assessment?.primaryDiagnosis || '', // Send as string, not array
          plan: draftData.assessment?.plan || '',
          treatmentPlan: draftData.assessment?.plan || '',
          followUpPlan: {
            instructions: draftData.assessment?.followUp || '',
            timing: '',
            appointmentNeeded: false
          }
        };
        
        const response = await fetch(`${API_BASE_URL}/api/medical-records/draft`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authService.getToken()}`
          },
          body: JSON.stringify(medicalRecordData)
        });
        
        if (response.ok) {
          console.log('Auto-save draft successful');
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } else {
          console.warn('Auto-save draft failed:', response.status);
          setAutoSaveStatus('idle');
        }
      } catch (err) {
        // Optionally show a toast or log
        console.warn('Auto-save draft failed:', err);
        setAutoSaveStatus('idle');
      }
    }, 1000)
  ).current;

  // Helper function to calculate age from date of birth
  const calculateAge = (dob: string | undefined): number => {
    if (!dob) return 0;
    
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birth month/day hasn't occurred yet this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= 0 ? age : 0;
    } catch (e) {
      console.warn('Could not calculate age from date of birth:', dob);
      return 0;
    }
  };

  // Fetch patient data on component mount
  useEffect(() => {
    console.log('ModernMedicalRecordForm mounted with props:', { patientId, recordId, mode });
    
    const fetchPatientData = async () => {
      // Skip fetching if we already have patient data from props
      if (propPatientData) {
        console.log('🔍 [ModernMedicalRecordForm] Using patient data from props:', propPatientData);
        
        // Calculate age from date of birth if not provided
        let calculatedAge = propPatientData.age || 0;
        if (!calculatedAge && propPatientData.dateOfBirth) {
          calculatedAge = calculateAge(propPatientData.dateOfBirth);
        }
        
        setPatientData({
          firstName: propPatientData.firstName || 'Unknown',
          lastName: propPatientData.lastName || 'Patient',
          age: calculatedAge,
          gender: propPatientData.gender || 'Unknown',
          id: propPatientData.patientId || propPatientData._id || propPatientData.id || 'Unknown',
          phone: propPatientData.phone || propPatientData.contactNumber || 'Unknown',
          avatar: propPatientData.avatar || '/assets/images/logo-placeholder.svg'
        });
        setLoading(false);
        return;
      }
      
      if (!patientId) {
        console.warn('No patientId provided to ModernMedicalRecordForm');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log('🔍 [ModernMedicalRecordForm] Fetching patient data for ID:', patientId);
        
        // Use the patient service instead of direct API call
        const { getPatientById } = await import('../../../services/patientService');
        const patient = await getPatientById(patientId);
        
        if (patient) {
          console.log('🔍 [ModernMedicalRecordForm] Patient data received from service:', patient);
          console.log('🔍 [ModernMedicalRecordForm] Patient age from service:', patient.age);
          console.log('🔍 [ModernMedicalRecordForm] Patient dateOfBirth from service:', patient.dateOfBirth);
          console.log('🔍 [ModernMedicalRecordForm] Patient contactNumber from service:', patient.contactNumber);
          console.log('🔍 [ModernMedicalRecordForm] Patient patientId from service:', patient.patientId);
          
          // Calculate age from date of birth if not provided
          let calculatedAge = patient.age || 0;
          if (!calculatedAge && patient.dateOfBirth) {
            calculatedAge = calculateAge(patient.dateOfBirth);
            console.log('🔍 [ModernMedicalRecordForm] Calculated age from DOB:', calculatedAge);
          }
          
          const updatedPatientData = {
            firstName: patient.firstName || 'Unknown',
            lastName: patient.lastName || 'Patient',
            age: calculatedAge,
            gender: patient.gender || 'Unknown',
            id: patient.patientId || patient._id || 'Unknown',
            phone: patient.phone || patient.contactNumber || 'Unknown',
            avatar: patient.avatar || '/assets/images/logo-placeholder.svg'
          };
          
          console.log('🔍 [ModernMedicalRecordForm] Setting patient data:', updatedPatientData);
          setPatientData(updatedPatientData);
        } else {
          console.warn('No patient data returned for ID:', patientId);
          console.error('Patient not found');
        }
      } catch (error) {
        console.error('Error fetching patient data:', error);
        console.error('Error loading patient information');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, propPatientData]);

  // Fetch nurse vital signs
  const fetchNurseVitalSigns = async () => {
    if (!patientId) return;
    
    try {
      setLoadingVitalSigns(true);
      setVitalSignsError(null);
      
      console.log('Fetching nurse vital signs for patient:', patientId);
      
      // Try the doctor routes API first (most comprehensive)
      const response = await fetch(`${API_BASE_URL}/api/doctor/vitals/latest/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`[fetchNurseVitalSigns] API response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[fetchNurseVitalSigns] Nurse vital signs API data:', data);
        
        if (data.success && data.data) {
          setNurseVitalSigns(data.data);
          
          // Auto-populate the form with nurse vital signs
          setFormData(prev => ({
            ...prev,
            vitalSigns: {
              temperature: data.data.temperature || '',
              bloodPressure: data.data.bloodPressure || '',
              heartRate: data.data.heartRate || '',
              respiratoryRate: data.data.respiratoryRate || '',
              oxygenSaturation: data.data.oxygenSaturation || '',
              height: data.data.height || '',
              weight: data.data.weight || '',
              bmi: data.data.bmi || ''
            }
          }));
        } else {
          setVitalSignsError('No vital signs found from nurse');
          console.warn('[fetchNurseVitalSigns] API returned no vital signs data or success was false.', data);
        }
      } else {
        console.warn(`[fetchNurseVitalSigns] API request failed with status ${response.status}. Attempting fallback to vitalSignsService.`);
        // Fallback to vital signs service
        try {
          const vitals = await vitalSignsService.getLatestNurseVitals(patientId);
          if (vitals) {
            console.log('[fetchNurseVitalSigns] Fallback vital signs from service:', vitals);
            setNurseVitalSigns(vitals);
            
            // Auto-populate the form with nurse vital signs
            setFormData(prev => ({
              ...prev,
              vitalSigns: {
                temperature: vitals.temperature || '',
                bloodPressure: vitals.systolic && vitals.diastolic ? `${vitals.systolic}/${vitals.diastolic}` : '',
                heartRate: vitals.pulse || '',
                respiratoryRate: vitals.respiratoryRate || '',
                oxygenSaturation: vitals.spo2 || '',
                height: vitals.height || '',
                weight: vitals.weight || '',
                bmi: vitals.bmi || ''
              }
            }));
          } else {
            setVitalSignsError('No vital signs found from nurse');
            console.warn('[fetchNurseVitalSigns] Fallback service returned no vital signs data.');
          }
        } catch (fallbackError) {
          console.error('[fetchNurseVitalSigns] Error during fallback vital signs service call:', fallbackError);
          setVitalSignsError('Failed to fetch vital signs from nurse via fallback');
        }
      }
    } catch (error) {
      console.error('Error fetching nurse vital signs:', error);
      setVitalSignsError('Failed to fetch vital signs from nurse');
    } finally {
      setLoadingVitalSigns(false);
    }
  };

  // Fetch nurse vital signs on component mount
  useEffect(() => {
    fetchNurseVitalSigns();
  }, [patientId]);

  // Form state
  const [formData, setFormData] = useState({
    chiefComplaint: {
      description: '',
      duration: '',
      severity: '',
      progression: '',
      location: '',
      hpi: ''
    },
    vitalSigns: {
      temperature: '98.6',
      bloodPressure: '120/80',
      heartRate: '72',
      respiratoryRate: '16',
      oxygenSaturation: '98',
      height: '',
      weight: '',
      bmi: ''
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
      neurological: '',
      musculoskeletal: '',
      skin: '',
      summary: ''
    } as PhysicalExaminationData,
    assessment: {
      primaryDiagnosis: '',
      secondaryDiagnoses: [],
      plan: '',
      prescriptions: [],
      labOrders: [],
      followUp: ''
    },
    qualityChecks: {
      documentationComplete: false,
      reviewedAndApproved: false,
      peerReviewed: false
    }
  });

  // AI Assistant functionality
  const generateAISuggestions = useCallback(async () => {
    try {
      const patientData = {
        chiefComplaint: typeof formData.chiefComplaint === 'string' ? formData.chiefComplaint : (formData.chiefComplaint as any)?.description || '',
        historyOfPresentIllness: (formData as any).hpi || '',
        symptoms: String((formData as any).chiefComplaint?.description || (formData as any).chiefComplaint || '').split(',').map((s: string) => s.trim()) || [],
        vitals: formData.vitalSigns || {},
        age: propPatientData?.age || 34,
        gender: propPatientData?.gender || 'female',
        allergies: Array.isArray((formData as any).allergies) ? ((formData as any).allergies).map((a: any) => typeof a === 'string' ? a : a.allergen || '') : [],
        pastMedicalHistory: (formData as any).pastMedicalHistory || '',
        currentMedications: (formData as any).currentMedications || []
      };

      const suggestions = AIAssistantService.generateSuggestions(patientData);
      setAiSuggestions(suggestions);
      console.log('🤖 AI Suggestions generated:', suggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    }
  }, [formData, propPatientData]);

  // Apply AI suggestions to form
  const applyAISuggestions = useCallback(() => {
    try {
      if (!aiSuggestions || Object.keys(aiSuggestions).length === 0) {
        console.log('No AI suggestions to apply');
        return;
      }

      console.log('🤖 Applying AI suggestions to form...', aiSuggestions);

      // Apply diagnoses to assessment
      if (aiSuggestions.diagnoses && aiSuggestions.diagnoses.length > 0) {
        const primaryDiagnosis = aiSuggestions.diagnoses[0]; // Use first diagnosis as primary
        setFormData(prev => ({
          ...prev,
          assessment: {
            ...prev.assessment,
            primaryDiagnosis: primaryDiagnosis,
            differentialDiagnoses: aiSuggestions.diagnoses.slice(1) // Rest as differential
          }
        }));
        console.log('✅ Applied primary diagnosis:', primaryDiagnosis);
      }

      // Apply medications to prescriptions
      if (aiSuggestions.medications && aiSuggestions.medications.length > 0) {
        const newPrescriptions = aiSuggestions.medications.map((med: string, index: number) => ({
          id: `ai-prescription-${Date.now()}-${index}`,
          medication: med.split(' ')[0], // Extract medication name
          dosage: med.split(' ').slice(1).join(' '), // Extract dosage
          frequency: 'As directed',
          duration: '7 days',
          instructions: med,
          status: 'prescribed'
        }));

        setFormData(prev => ({
          ...prev,
          prescriptions: [...((prev as any).prescriptions || []), ...newPrescriptions]
        }));
        console.log('✅ Applied medications:', newPrescriptions);
      }

      // Apply lab tests to lab orders
      if (aiSuggestions.labTests && aiSuggestions.labTests.length > 0) {
        const newLabOrders = aiSuggestions.labTests.map((test: string, index: number) => ({
          id: `ai-lab-${Date.now()}-${index}`,
          testName: test,
          status: 'ordered',
          priority: 'routine',
          instructions: `AI suggested: ${test}`
        }));

        setFormData(prev => ({
          ...prev,
          labOrders: [...((prev as any).labOrders || []), ...newLabOrders]
        }));
        console.log('✅ Applied lab tests:', newLabOrders);
      }

      // NOTE: HPI template and clinical notes are NOT applied automatically
      // Users can manually use the "Generate HPI Template" button if needed
      
      // // Apply HPI template if available
      // if (aiSuggestions.hpiTemplate) {
      //   setFormData(prev => ({
      //     ...prev,
      //     historyOfPresentIllness: aiSuggestions.hpiTemplate
      //   }));
      //   console.log('✅ Applied HPI template:', aiSuggestions.hpiTemplate);
      // }

      // // Apply clinical notes to HPI
      // if (aiSuggestions.clinicalNotes && aiSuggestions.clinicalNotes.length > 0) {
      //   const clinicalNotesText = aiSuggestions.clinicalNotes.join('\n• ');
      //   setFormData(prev => ({
      //     ...prev,
      //     historyOfPresentIllness: (prev as any).historyOfPresentIllness ? `${(prev as any).historyOfPresentIllness}\n\nClinical Considerations:\n• ${clinicalNotesText}` : `Clinical Considerations:\n• ${clinicalNotesText}`
      //   }));
      //   console.log('✅ Applied clinical notes to HPI');
      // }

      // Apply follow-up to plan
      if (aiSuggestions.followUp && aiSuggestions.followUp.length > 0) {
        const followUpText = aiSuggestions.followUp.join('\n• ');
        setFormData(prev => ({
          ...prev,
          assessment: {
            ...prev.assessment,
            plan: prev.assessment?.plan ? `${prev.assessment.plan}\n\nFollow-up:\n• ${followUpText}` : `Follow-up:\n• ${followUpText}`
          }
        }));
        console.log('✅ Applied follow-up to plan');
      }

      // Show success message
      console.log('🎉 AI suggestions successfully applied to form!');
      toast.success('AI suggestions applied successfully! 🎉', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Close the AI Assistant dialog
      setAiAssistantOpen(false);

    } catch (error) {
      console.error('Error applying AI suggestions:', error);
      toast.error('Failed to apply AI suggestions. Please try again.', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [aiSuggestions]);

  // Generate HPI template
  const generateHPITemplate = useCallback(() => {
    try {
      const ccDescription = typeof formData.chiefComplaint === 'string' 
        ? formData.chiefComplaint 
        : (formData.chiefComplaint as any)?.description || '';
      
      const patientData = {
        chiefComplaint: ccDescription,
        symptoms: ccDescription.split(',').map((s: string) => s.trim()) || [],
        age: propPatientData?.age || 34,
        gender: propPatientData?.gender || 'female',
        duration: (formData.chiefComplaint as any)?.duration,
        severity: (formData.chiefComplaint as any)?.severity,
        progression: (formData.chiefComplaint as any)?.progression,
        location: (formData.chiefComplaint as any)?.location
      };

      const hpiTemplate = AIAssistantService.generateHPITemplate(patientData);
      
      // Apply the HPI template to the form
      setFormData(prev => ({
        ...prev,
        hpi: hpiTemplate
      }));

      toast.success('HPI template generated and applied! 📝', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error generating HPI template:', error);
      toast.error('Failed to generate HPI template. Please try again.', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [formData, propPatientData]);

  // Auto-fill HPI narrative — calls Gemini backend first, falls back to local generation
  const autoFillHPI = useCallback(async () => {
    const ccDescription = typeof formData.chiefComplaint === 'string'
      ? formData.chiefComplaint
      : (formData.chiefComplaint as any)?.description || '';

    if (!ccDescription.trim()) {
      toast.info('Please enter a chief complaint first.', { position: 'top-right', autoClose: 2000 });
      return;
    }

    setHpiAutoFillLoading(true);
    try {
      const parsedDuration = AIAssistantService.parseDurationFromChiefComplaint(ccDescription);
      const durationToUse = formData.chiefComplaint.duration || parsedDuration || '';

      const payload = {
        chiefComplaint: ccDescription,
        age: patientData.age,
        gender: patientData.gender,
        onset: formData.chiefComplaint.onsetPattern || undefined,
        duration: durationToUse || undefined,
        severity: formData.chiefComplaint.severity,
        progression: formData.chiefComplaint.progression,
        location: formData.chiefComplaint.location,
        aggravatingFactors: formData.chiefComplaint.aggravatingFactors || [],
        relievingFactors: formData.chiefComplaint.relievingFactors || [],
        associatedSymptoms: formData.chiefComplaint.associatedSymptoms || [],
        pastMedicalHistory: propPatientData?.pastMedicalHistory || ''
      };

      // Call Gemini-powered backend; falls back to local if unavailable
      const result = await AIAssistantService.generateHPIWithGemini(
        payload,
        API_BASE_URL,
        getAuthToken() || undefined
      );

      // Update Gemini phrase suggestions and availability flag
      setGeminiPhrases(result.suggestedPhrases || {});
      setGeminiAvailable(result.isAIAvailable);
      if (result.redFlags?.length) setGeminiRedFlags(result.redFlags);
      if (result.differentialDiagnoses?.length) setGeminiDiagnoses(result.differentialDiagnoses);

      const newHPI = result.narrative;
      const updated = { ...formData, historyOfPresentIllness: newHPI };
      if (parsedDuration && !formData.chiefComplaint.duration) {
        updated.chiefComplaint = { ...updated.chiefComplaint, duration: parsedDuration };
      }
      setFormData(updated);
      if (!isFirstRender.current) { autoSaveDraft(updated); memorySystem.updateData(); }

      // Show categorized suggested phrases
      setShowHpiSuggestions(true);

      if (result.isAIAvailable) {
        toast.success('HPI generated with AI — review and edit as needed.', { position: 'top-right', autoClose: 3000 });
      } else {
        toast.success('HPI auto-filled based on chief complaint!', { position: 'top-right', autoClose: 2500 });
      }
    } catch (error) {
      console.error('Error auto-filling HPI:', error);
      toast.error('Failed to auto-fill HPI.', { position: 'top-right', autoClose: 2000 });
    } finally {
      setHpiAutoFillLoading(false);
    }
  }, [formData, patientData, propPatientData]);

  // Generate HPI sentence suggestions as user types
  const updateHpiSuggestions = useCallback((chiefComplaint: string) => {
    if (!chiefComplaint.trim()) {
      setHpiSuggestions([]);
      setShowHpiSuggestions(false);
      return;
    }
    const currentHPI = (formData as any).historyOfPresentIllness || '';
    const suggestions = AIAssistantService.getHPICompletions(currentHPI, chiefComplaint);
    setHpiSuggestions(suggestions);
    setShowHpiSuggestions(suggestions.length > 0);
  }, [formData]);

  // Auto-fill Physical Examination based on chief complaint
  const autoFillPhysicalExam = useCallback(() => {
    const ccDescription = typeof formData.chiefComplaint === 'string'
      ? formData.chiefComplaint
      : (formData.chiefComplaint as any)?.description || '';

    if (!ccDescription.trim()) return;

    const suggestions = AIAssistantService.getPhysicalExamSuggestions({
      chiefComplaint: ccDescription,
      age: patientData.age,
      gender: patientData.gender
    });

    const updated = {
      ...formData,
      physicalExamination: {
        ...formData.physicalExamination,
        general: suggestions.general.join(', '),
        heent: {
          head: suggestions.heent.head.join(', '),
          eyes: suggestions.heent.eyes.join(', '),
          ears: suggestions.heent.ears.join(', '),
          nose: suggestions.heent.nose.join(', '),
          throat: suggestions.heent.throat.join(', ')
        },
        cardiovascular: suggestions.cardiovascular.join(', '),
        respiratory: suggestions.respiratory.join(', '),
        gastrointestinal: suggestions.gastrointestinal.join(', '),
        neurological: suggestions.neurological.join(', '),
        musculoskeletal: suggestions.musculoskeletal.join(', '),
        skin: suggestions.skin.join(', ')
      }
    };

    setFormData(updated);
    setPhysicalExamAutoFilled(true);
    if (!isFirstRender.current) { autoSaveDraft(updated); memorySystem.updateData(); }
    toast.success('Physical examination auto-filled based on chief complaint!', { position: 'top-right', autoClose: 2500 });
  }, [formData, patientData]);

  // Debounced HPI suggestion update when chief complaint changes
  useEffect(() => {
    const ccDescription = typeof formData.chiefComplaint === 'string'
      ? formData.chiefComplaint
      : (formData.chiefComplaint as any)?.description || '';

    if (hpiDebounceRef.current) clearTimeout(hpiDebounceRef.current);
    hpiDebounceRef.current = setTimeout(() => {
      updateHpiSuggestions(ccDescription);
    }, 500);

    return () => {
      if (hpiDebounceRef.current) clearTimeout(hpiDebounceRef.current);
    };
  }, [formData.chiefComplaint]);

  const steps = [
    {
      label: 'Patient & History',
      icon: <PersonIcon />,
      description: 'Chief complaint and patient history',
      color: 'primary'
    },
    {
      label: 'Physical Examination',
      icon: <MedicalIcon />,
      description: 'Vital signs and physical findings',
      color: 'secondary'
    },
    {
      label: 'Assessment & Plan',
      icon: <AssessmentIcon />,
      description: 'Diagnosis and treatment plan',
      color: 'success'
    },
    {
      label: 'Care Coordination',
      icon: <HealingIcon />,
      description: 'Referrals and follow-up care',
      color: 'info'
    },
    {
      label: 'Quality & Compliance',
      icon: <HealthIcon />,
      description: 'Review and finalization',
      color: 'warning'
    }
  ];

  const handleNext = () => {
    const nextStep = activeStep + 1;
    setActiveStep(nextStep);
    // Auto-fill physical exam when navigating to step 1 if fields are empty
    if (nextStep === 1 && !physicalExamAutoFilled) {
      const hasExistingData = formData.physicalExamination.general ||
        formData.physicalExamination.cardiovascular ||
        formData.physicalExamination.respiratory;
      if (!hasExistingData) {
        setTimeout(() => autoFillPhysicalExam(), 300);
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepClick = (step: number) => {
    setActiveStep(step);
    // Auto-fill physical exam when clicking to step 1 if fields are empty
    if (step === 1 && !physicalExamAutoFilled) {
      const hasExistingData = formData.physicalExamination.general ||
        formData.physicalExamination.cardiovascular ||
        formData.physicalExamination.respiratory;
      if (!hasExistingData) {
        setTimeout(() => autoFillPhysicalExam(), 300);
      }
    }
  };

  const handleSave = useCallback(async (finalize = false) => {
    console.log('=== MEDICAL RECORD SAVE START ===');
    console.log('Finalize:', finalize);
    console.log('🔍 [DEBUG] Current formData when saving:', {
      assessment: formData.assessment,
      plan: formData.assessment?.plan,
      primaryDiagnosis: formData.assessment?.primaryDiagnosis
    });
    
    // Prevent multiple finalization attempts
    if (finalize && isFinalized) {
      console.log('⚠️ Record already finalized, preventing duplicate finalization');
      alert('This record has already been finalized.');
      return;
    }
    
    setSaving(true);
    try {
      // Get user ID from AuthContext first, then fallback to localStorage
      let userId = user?.id || user?._id;
      
      // If not available from AuthContext, try localStorage
      if (!userId) {
        try {
          // Check user_data key (from config)
          const userData = localStorage.getItem('user_data');
          if (userData) {
            const parsedUserData = JSON.parse(userData);
            userId = parsedUserData.id || parsedUserData._id;
          }
          
          // Fallback to 'user' key if user_data doesn't exist
          if (!userId) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const parsedUser = JSON.parse(userStr);
              userId = parsedUser.id || parsedUser._id;
            }
          }
          
          // Additional fallbacks
          if (!userId) {
            const userIdFromStorage = localStorage.getItem('userId') || localStorage.getItem('user_id');
            userId = userIdFromStorage || undefined;
          }
        } catch (parseError) {
          console.error('Error parsing user data from localStorage:', parseError);
        }
      }
      
      console.log('User ID found:', userId);
      console.log('Patient ID:', patientId);
      console.log('Patient ID type:', typeof patientId);
      console.log('Patient ID length:', patientId?.length);
      
      // Validate MongoDB ObjectId format (24 hex characters)
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(patientId || '');
      console.log('Is valid MongoDB ObjectId:', isValidObjectId);
      
      if (!userId) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      if (!patientId) {
        throw new Error('Patient ID is required.');
      }
      
      if (!isValidObjectId) {
        throw new Error(`Invalid patient ID format. Expected 24-character MongoDB ObjectId, got: ${patientId}`);
      }
      
      // Validate that we have minimum required data
      if (!formData.chiefComplaint.description || formData.chiefComplaint.description.trim() === '') {
        throw new Error('Please fill in the "Chief Complaint" field before saving the medical record. This is a required field describing the patient\'s main reason for the visit.');
      }

      // Validate diagnosis when finalizing
      console.log('🔍 [VALIDATION] Checking primary diagnosis for finalization:', {
        hasAssessment: !!formData.assessment,
        primaryDiagnosis: formData.assessment?.primaryDiagnosis,
        isFinalize: finalize,
        assessment: formData.assessment
      });
      
      if (finalize && (!formData.assessment?.primaryDiagnosis || formData.assessment.primaryDiagnosis.trim() === '')) {
        console.error('❌ [VALIDATION] Primary diagnosis validation failed:', {
          assessment: formData.assessment,
          primaryDiagnosis: formData.assessment?.primaryDiagnosis
        });
        
        // Provide a helpful error message with instructions
        throw new Error('Primary diagnosis is required when finalizing a medical record. Please go to the "Assessment & Plan" section and enter a primary diagnosis before finalizing.');
      }

      // Prepare the data for sending
      const medicalRecordData = {
        patient: patientId,
        doctor: userId,
        status: finalize ? 'Finalized' : 'Draft', // Set status based on finalize parameter
        chiefComplaint: {
          description: typeof formData.chiefComplaint === 'string' ? formData.chiefComplaint : formData.chiefComplaint.description || '',
          duration: formData.chiefComplaint.duration || '',
          severity: formData.chiefComplaint.severity || 'Mild',
          onsetPattern: 'Acute', // Default value since it's not in form structure
          progression: formData.chiefComplaint.progression || 'Stable',
          location: formData.chiefComplaint.location || '',
          aggravatingFactors: [], // Default empty array since it's not in form structure
          relievingFactors: [], // Default empty array since it's not in form structure
          associatedSymptoms: [], // Default empty array since it's not in form structure
          impactOnDailyLife: '', // Default empty string since it's not in form structure
          previousEpisodes: false, // Default false since it's not in form structure
          previousEpisodesDetails: '', // Default empty string since it's not in form structure
          recordedAt: new Date(),
          recordedBy: userId
        },
        historyOfPresentIllness: (formData as any).historyOfPresentIllness || '',
        physicalExamination: {
          general: formData.physicalExamination?.general || '',
          heent: {
            head: formData.physicalExamination?.heent?.head || '',
            eyes: formData.physicalExamination?.heent?.eyes || '',
            ears: formData.physicalExamination?.heent?.ears || '',
            nose: formData.physicalExamination?.heent?.nose || '',
            throat: formData.physicalExamination?.heent?.throat || ''
          },
          cardiovascular: formData.physicalExamination?.cardiovascular || '',
          respiratory: formData.physicalExamination?.respiratory || '',
          gastrointestinal: formData.physicalExamination?.gastrointestinal || '',
          neurological: formData.physicalExamination?.neurological || '',
          musculoskeletal: formData.physicalExamination?.musculoskeletal || '',
          skin: formData.physicalExamination?.skin || '',
          summary: formData.physicalExamination?.summary || ''
        },
        vitalSigns: {
          temperature: formData.vitalSigns?.temperature || '',
          bloodPressure: formData.vitalSigns?.bloodPressure || '',
          heartRate: formData.vitalSigns?.heartRate || '',
          respiratoryRate: formData.vitalSigns?.respiratoryRate || '',
          oxygenSaturation: formData.vitalSigns?.oxygenSaturation || '',
          height: formData.vitalSigns?.height || '',
          weight: formData.vitalSigns?.weight || '',
          bmi: formData.vitalSigns?.bmi || ''
        },
        followUpPlan: {
          instructions: (formData as any).followUpPlan?.instructions || '',
          timing: (formData as any).followUpPlan?.timing || '',
          appointmentNeeded: (formData as any).followUpPlan?.appointmentNeeded || false
        },
        // Add assessment and treatment plan data
        assessment: {
          primaryDiagnosis: formData.assessment?.primaryDiagnosis || '',
          plan: formData.assessment?.plan || '',
          followUp: formData.assessment?.followUp || ''
        },
        // Also include as top-level fields for backward compatibility
        diagnosis: formData.assessment?.primaryDiagnosis || (finalize ? 'Diagnosis pending' : ''),
        plan: formData.assessment?.plan || '',
        treatmentPlan: formData.assessment?.plan || ''
      };

      // Remove undefined fields to avoid validation errors, but keep diagnosis even if empty
      const cleanedData: any = Object.fromEntries(
        (Object.entries(medicalRecordData) as [string, any][]).filter(([key, value]) => {
          // Always keep diagnosis field, even if empty
          if (key === 'diagnosis') {
            return true;
          }
          // For other fields, filter out undefined and empty strings
          return value !== undefined && value !== '';
        })
      );

      console.log('Sending medical record data:', JSON.stringify(cleanedData, null, 2));
      console.log('🔍 [DEBUG] Assessment data being sent:', {
        primaryDiagnosis: cleanedData.assessment?.primaryDiagnosis,
        plan: cleanedData.assessment?.plan,
        followUp: cleanedData.assessment?.followUp,
        topLevelPlan: cleanedData.plan,
        topLevelTreatmentPlan: cleanedData.treatmentPlan
      });

      // Make API call to save the medical record
      // For finalization, always use POST to create a new finalized record
      // For draft saves, use the draft endpoint
      // For updates (when recordId exists), use PUT method
      let endpoint = `${API_BASE_URL}/api/medical-records`;
      let method = 'POST';
      
      if (currentRecordId && mode === 'edit') {
        // If we're editing an existing record, use the standard update endpoint
        endpoint = `${API_BASE_URL}/api/medical-records/${currentRecordId}`;
        method = 'PUT';
        console.log('🔄 Updating existing record:', currentRecordId);
      } else if (!finalize) {
        // For draft saves, use the draft endpoint
        endpoint = `${API_BASE_URL}/api/medical-records/draft`;
        method = 'POST';
        console.log('📝 Saving as draft');
      } else {
        // For new finalized records, use POST
        console.log('✅ Creating new finalized record');
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(cleanedData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = response.statusText;
        let errorDetails = null;
        
        try {
          const errorData = await response.json();
          console.error('Server error response:', JSON.stringify(errorData, null, 2));
          errorDetails = errorData;
          errorMessage = errorData.message || errorData.error || errorData.details || response.statusText;
          
          // If there are validation errors, show them in detail
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const validationErrors = errorData.errors.map((err: any) => {
              if (typeof err === 'object' && err.field && err.message) {
                return `${err.field}: ${err.message}`;
              }
              return err.msg || err.message || err;
            });
            errorMessage = `Validation errors: ${validationErrors.join(', ')}`;
          }
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          // Try to get response text for debugging
          try {
            const responseText = await response.text();
            console.error('Raw error response text:', responseText);
            errorMessage = `${response.status} ${response.statusText}${responseText ? ': ' + responseText : ''}`;
          } catch (textError) {
            console.error('Could not get response text:', textError);
          }
        }
        
              console.error('Final error message:', errorMessage);
      
      // Show detailed error information in alert for debugging
      const debugInfo = `
Error Details:
- Status: ${response.status}
- Message: ${errorMessage}
- Patient ID: ${patientId}
- User ID: ${userId}
- Data sent: ${JSON.stringify(cleanedData, null, 2)}
${errorDetails ? `- Server response: ${JSON.stringify(errorDetails, null, 2)}` : ''}
      `;
      
      console.error('Debug info:', debugInfo);
      alert(`Failed to save medical record:\n\n${errorMessage}\n\nCheck console for full details.`);
      
      throw new Error(errorMessage);
      }

      const savedRecord = await response.json();
      console.log('Medical record saved successfully:', savedRecord);
      console.log('🔍 [DEBUG] Form data after save:', {
        assessment: formData.assessment,
        plan: formData.assessment?.plan,
        primaryDiagnosis: formData.assessment?.primaryDiagnosis
      });

      // If finalizing, call the finalize endpoint to trigger automatic patient status update
      if (finalize) {
        console.log('🔄 Finalizing medical record and updating patient status...');
        console.log('🔍 Saved record data:', savedRecord);
        
        // Set finalized state immediately to prevent multiple clicks
        setIsFinalized(true);
        
        // Check if the record is already finalized
        const recordStatus = savedRecord.data?.status || savedRecord.status;
        if (recordStatus === 'Finalized') {
          console.log('⚠️ Record is already finalized, skipping finalization');
          alert('This medical record has already been finalized.');
          return;
        }
        
        // Get the record ID from the saved record
        const recordId = savedRecord.data?._id || savedRecord._id || savedRecord.id || currentRecordId;
        
        if (!recordId) {
          console.error('❌ No record ID available for finalization');
          console.error('🔍 Saved record data:', savedRecord);
          console.error('🔍 Current record ID:', currentRecordId);
          alert('Medical record saved but could not finalize - missing record ID. Please try again.');
          return;
        }
        
        // Validate that the record ID is a valid MongoDB ObjectId format
        if (!/^[0-9a-fA-F]{24}$/.test(recordId)) {
          console.error('❌ Invalid record ID format for finalization:', recordId);
          alert('Medical record saved but could not finalize - invalid record ID format. Please try again.');
          return;
        }
        
        console.log('🔍 Using record ID for finalization:', recordId);
        
        try {
          const finalizeResponse = await fetch(`${API_BASE_URL}/api/medical-records/${recordId}/finalize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`
            }
          });
          
          if (finalizeResponse.ok) {
            const finalizeData = await finalizeResponse.json();
            console.log('✅ Medical record finalized successfully:', finalizeData);
            toast.success('🎉 Medical record finalized! Patient moved to "Completed Patient Histories" tab.', {
              position: 'top-center',
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true
            });
          } else {
            const errorData = await finalizeResponse.json().catch(() => ({}));
            console.warn('⚠️ Failed to finalize record:', errorData);
            
            // Check if the record is already finalized
            if (finalizeResponse.status === 400 && errorData.message?.includes('already be finalized')) {
              alert('This medical record has already been finalized and cannot be finalized again.');
            } else {
              // Reset finalized state on failure
              setIsFinalized(false);
              alert(`Medical record saved but finalization failed: ${errorData.message || 'Unknown error'}. Please try again.`);
            }
          }
        } catch (finalizeError) {
          console.error('❌ Error finalizing record:', finalizeError);
          // Reset finalized state on error
          setIsFinalized(false);
          alert('Medical record saved but finalization failed. Please try again.');
        }
        
        // Refresh the patient history to include the newly finalized record
        await fetchPatientHistory();
        
        // Close the form or redirect
        if (onCancel) {
          onCancel();
        } else {
          navigate('/doctor/patients');
        }
      } else {
        // Show success message for draft saves
        alert('Medical record saved as draft!');
      }

      // Call the onSave callback if provided
      if (onSave) {
        onSave(savedRecord);
      }

    } catch (error: any) {
      console.log('=== MEDICAL RECORD SAVE ERROR ===');
      console.error('Error saving medical record:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.log('Final error message for alert:', errorMessage);
      alert(`Failed to save medical record: ${errorMessage}`);
    } finally {
      console.log('=== MEDICAL RECORD SAVE END ===');
      setSaving(false);
    }
  }, [patientId, mode, formData, onSave, onCancel, navigate, user, currentRecordId]);

  const calculateQualityScore = () => {
    let score = 0;
    const maxScore = 100;
    
    // Chief complaint completeness
    if (formData.chiefComplaint.description) score += 15;
    if (formData.chiefComplaint.duration) score += 10;
    if (formData.chiefComplaint.severity) score += 5;
    
    // Vital signs completeness
    const vitalSigns = Object.values(formData.vitalSigns).filter(Boolean);
    score += (vitalSigns.length / 8) * 25;
    
    // Physical exam completeness
    const physicalExam = Object.values(formData.physicalExamination).filter(Boolean);
    score += (physicalExam.length / 8) * 20;
    
    // Assessment completeness
    if (formData.assessment.primaryDiagnosis) score += 15;
    if (formData.assessment.plan) score += 10;
    
    return Math.min(score, maxScore);
  };

  useEffect(() => {
    const score = calculateQualityScore();
    setQualityScore(score);
  }, [formData]);

  // Debug: Log formData changes
  useEffect(() => {
    console.log('🔄 [FORM DATA CHANGED] formData updated:', {
      chiefComplaint: formData.chiefComplaint.description,
      hpi: formData.chiefComplaint.hpi,
      duration: formData.chiefComplaint.duration,
      severity: formData.chiefComplaint.severity,
      progression: formData.chiefComplaint.progression,
      location: formData.chiefComplaint.location,
      qualityChecks: formData.qualityChecks
    });
  }, [formData]);

  // Debug: Monitor quality checks specifically
  useEffect(() => {
    console.log('🔍 [QUALITY CHECKS] Current state:', formData.qualityChecks);
  }, [formData.qualityChecks]);

  // Load latest draft or existing record on mount
  useEffect(() => {
    console.log('🔍 [DEBUG] useEffect triggered with:', {
      patientId,
      recordId,
      mode,
      hasInitialData: !!initialRecordData
    });
    
    const fetchLatestRecord = async () => {
      console.log('🔍 [DEBUG] fetchLatestRecord started');
      // Always check for existing records, even in create mode, to load any existing drafts
      // Only skip if we have a specific recordId and we're in edit mode
      if (mode === 'edit' && recordId) {
        console.log('🔍 [DEBUG] Edit mode with specific recordId, will load that specific record');
      } else if (mode === 'create' && recordId) {
        console.log('🔍 [DEBUG] Create mode with recordId, will load that specific record');
      } else {
        console.log('🔍 [DEBUG] Will check for latest draft/finalized record for this patient');
      }

      if (!patientId) {
        console.log('🔍 [DEBUG] Skipping - no patientId');
        return;
      }
      try {
        setLoading(true);
        
        let record: any = null;
        
        // If we have pre-loaded record data, use it first
        if (initialRecordData) {
          console.log('🔍 [DEBUG] Found initialRecordData, using pre-loaded data');
          console.log('=== USING PRE-LOADED RECORD DATA ===');
          console.log('Pre-loaded record data:', initialRecordData);
          record = initialRecordData;
          setCurrentRecordId(record._id || record.id);
          
          // Immediately map and set the form data
          const loadedForm = {
            chiefComplaint: {
              description: record.chiefComplaint?.description || record.chiefComplaint || '',
              duration: record.chiefComplaint?.duration || '',
              severity: record.chiefComplaint?.severity || 'Mild',
              progression: record.chiefComplaint?.progression || 'Stable',
              location: record.chiefComplaint?.location || '',
              hpi: record.historyOfPresentIllness || record.chiefComplaint?.hpi || ''
            },
            historyOfPresentIllness: record.historyOfPresentIllness || '',
            vitalSigns: {
              temperature: record.physicalExamination?.vitals?.temperature?.toString() || record.vitalSigns?.temperature?.toString() || '98.6',
              bloodPressure: record.physicalExamination?.vitals?.bloodPressure
                ? `${record.physicalExamination.vitals.bloodPressure.systolic}/${record.physicalExamination.vitals.bloodPressure.diastolic}`
                : record.vitalSigns?.bloodPressure || '120/80',
              heartRate: record.physicalExamination?.vitals?.heartRate?.toString() || record.vitalSigns?.heartRate?.toString() || '72',
              respiratoryRate: record.physicalExamination?.vitals?.respiratoryRate?.toString() || record.vitalSigns?.respiratoryRate?.toString() || '16',
              oxygenSaturation: record.physicalExamination?.vitals?.oxygenSaturation?.toString() || record.vitalSigns?.oxygenSaturation?.toString() || '98',
              height: record.physicalExamination?.vitals?.height?.toString() || record.vitalSigns?.height?.toString() || '',
              weight: record.physicalExamination?.vitals?.weight?.toString() || record.vitalSigns?.weight?.toString() || '',
              bmi: record.physicalExamination?.vitals?.bmi?.toString() || record.vitalSigns?.bmi?.toString() || ''
            },
            physicalExamination: {
              general: record.physicalExamination?.general || '',
              heent: (() => {
                // If HEENT is already an object with separate fields, use it
                if (record.physicalExamination?.heent && typeof record.physicalExamination.heent === 'object') {
                  return {
                    head: record.physicalExamination.heent.head || '',
                    eyes: record.physicalExamination.heent.eyes || '',
                    ears: record.physicalExamination.heent.ears || '',
                    nose: record.physicalExamination.heent.nose || '',
                    throat: record.physicalExamination.heent.throat || ''
                  };
                }
                // If HEENT is a string, parse it into separate fields
                if (typeof record.physicalExamination?.heent === 'string') {
                  return parseHeentString(record.physicalExamination.heent);
                }
                // Default empty object
                return {
                  head: '',
                  eyes: '',
                  ears: '',
                  nose: '',
                  throat: ''
                };
              })(),
              cardiovascular: record.physicalExamination?.cardiovascular || '',
              respiratory: record.physicalExamination?.chest || record.physicalExamination?.respiratory || '',
              gastrointestinal: record.physicalExamination?.abdomen || record.physicalExamination?.gastrointestinal || '',
              neurological: record.physicalExamination?.neurological || '',
              musculoskeletal: record.physicalExamination?.extremities || record.physicalExamination?.musculoskeletal || '',
              skin: record.physicalExamination?.skin || '',
              summary: record.physicalExamination?.summary || ''
            },
            assessment: {
              primaryDiagnosis: record.diagnosis || record.primaryDiagnosis?.description || record.assessment?.primaryDiagnosis || '',
              secondaryDiagnoses: record.secondaryDiagnoses || record.assessment?.secondaryDiagnoses || [],
              plan: record.plan || record.treatmentPlan || record.assessment?.plan || '',
              prescriptions: record.prescriptions || record.assessment?.prescriptions || [],
              labOrders: record.labOrders || record.assessment?.labOrders || [],
              followUp: record.followUpPlan?.instructions || record.assessment?.followUp || ''
            },
            qualityChecks: {
              documentationComplete: record.status !== 'Draft',
              reviewedAndApproved: record.status === 'Finalized',
              peerReviewed: record.qualityChecks?.peerReviewed || false
            }
          };
          
          console.log('🔍 [DATA MAPPING] Raw record data:', {
            chiefComplaint: record.chiefComplaint,
            historyOfPresentIllness: record.historyOfPresentIllness,
            physicalExamination: record.physicalExamination,
            diagnosis: record.diagnosis,
            plan: record.plan
          });
          
          console.log('🔍 [DEBUG] Raw chiefComplaint object:', record.chiefComplaint);
          console.log('🔍 [DEBUG] Raw historyOfPresentIllness:', record.historyOfPresentIllness);
          console.log('🔍 [DEBUG] Raw record keys:', Object.keys(record));
          console.log('🔍 [DEBUG] Complete raw record object:', record);
          
          console.log('✅ Mapped form data from initialRecordData:', loadedForm);
          console.log('🔍 [DEBUG] Assessment data loaded:', {
            primaryDiagnosis: loadedForm.assessment.primaryDiagnosis,
            plan: loadedForm.assessment.plan,
            followUp: loadedForm.assessment.followUp
          });
          console.log('🔍 [DEBUG] Form data assessment object:', loadedForm.assessment);
          
          // Set the form data to ensure the form is populated
          setFormData(loadedForm);
          setIsFinalized(record.status === 'Finalized');
          console.log('🔍 [DEBUG] Treatment plan value:', loadedForm.assessment.plan);
          console.log('🔍 [DEBUG] Treatment plan type:', typeof loadedForm.assessment.plan);
          console.log('🔍 [DEBUG] Treatment plan length:', loadedForm.assessment.plan?.length);
          console.log('🔍 [DEBUG] Raw record assessment fields:', {
            recordPlan: record.plan,
            recordTreatmentPlan: record.treatmentPlan,
            recordAssessmentPlan: record.assessment?.plan,
            recordDiagnosis: record.diagnosis,
            recordPrimaryDiagnosis: record.primaryDiagnosis?.description
          });
          console.log('🔍 [DEBUG] Complete record object for assessment:', {
            recordKeys: Object.keys(record),
            assessmentObject: record.assessment,
            planField: record.plan,
            treatmentPlanField: record.treatmentPlan,
            assessmentPlanField: record.assessment?.plan
          });
          console.log('🔍 [DEBUG] Chief complaint data being set:', {
            description: loadedForm.chiefComplaint.description,
            duration: loadedForm.chiefComplaint.duration,
            severity: loadedForm.chiefComplaint.severity,
            progression: loadedForm.chiefComplaint.progression,
            location: loadedForm.chiefComplaint.location,
            hpi: loadedForm.chiefComplaint.hpi
          });
          console.log('🔍 [DEBUG] History of present illness being set:', loadedForm.historyOfPresentIllness);
          console.log('🔍 [DEBUG] About to set form data with assessment:', {
            assessmentPlan: loadedForm.assessment.plan,
            assessmentPrimaryDiagnosis: loadedForm.assessment.primaryDiagnosis
          });
          setFormData(loadedForm);
          setIsFinalized(record.status === 'Finalized');
          
          // Skip the rest of the loading logic since we have the data
          setLoading(false);
          setTimeout(() => {
            isFirstRender.current = false;
          }, 500);
          return;
        }
        // If we have a specific recordId and no pre-loaded data, load that specific record
        else if (recordId) {
          console.log('=== LOADING SPECIFIC RECORD ===');
          console.log('Record ID:', recordId);
          
          try {
            const response = await fetch(`${API_BASE_URL}/api/medical-records/${recordId}/optimized`, {
              headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                record = data.data;
                console.log('✅ Loaded specific record:', {
                  id: record._id,
                  chiefComplaint: record.chiefComplaint?.description,
                  status: record.status
                });
              } else {
                console.error('❌ Failed to load specific record - invalid response:', data);
              }
            } else {
              console.error('❌ Failed to load specific record - HTTP error:', response.status);
            }
          } catch (error) {
            console.error('❌ Error loading specific record:', error);
          }
        }
        
        // If no specific record was loaded or failed, fall back to loading the latest record
        if (!record) {
          console.log('=== FALLING BACK TO LATEST RECORD ===');
          
        // Try to fetch the latest draft for this patient
        const res = await fetch(`${API_BASE_URL}/api/medical-records/patient/${patientId}?limit=20`, {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          // Prefer the most recent record that was created by the current doctor (or current user)
          // Helper to safely get current user id from context/localStorage
          const getCurrentUserId = () => {
            if (user?.id || user?._id) return user.id || user._id;
            try {
              const stored = localStorage.getItem('user_data') || localStorage.getItem('user') || '{}';
              const parsed = JSON.parse(stored);
              return parsed.id || parsed._id;
            } catch {
              return undefined;
            }
          };

          const currentUserId = getCurrentUserId();
          
          console.log('=== MEDICAL RECORD SELECTION DEBUG ===');
          console.log('Current user ID:', currentUserId);
          console.log('Available records:', data.data.map((rec: any) => ({
            id: rec._id,
            createdBy: rec.createdBy,
            chiefComplaint: rec.chiefComplaint?.description || 'No chief complaint',
            createdAt: rec.createdAt,
            isLabRecord: rec.chiefComplaint?.description?.includes('Lab test results')
          })));

          // Filter out lab placeholder records first
          const nonLabRecords = data.data.filter((rec: any) => 
            !rec.chiefComplaint?.description?.includes('Lab test results')
          );
          
          console.log('Non-lab records:', nonLabRecords.length);

          if (currentUserId) {
            // First try to find a record authored by the current user that's not a lab record
            record = nonLabRecords.find((rec: any) => rec.createdBy === currentUserId);
            console.log('Found user-authored non-lab record:', record ? {
              id: record._id,
              chiefComplaint: record.chiefComplaint?.description
            } : 'None found');
            
            // If no non-lab record by user, try any record by user
            if (!record) {
              record = data.data.find((rec: any) => rec.createdBy === currentUserId);
              console.log('Found user-authored record (including lab):', record ? {
                id: record._id,
                chiefComplaint: record.chiefComplaint?.description
              } : 'None found');
            }
          }

          // Fallback to the very latest non-lab record if none authored by the user
          if (!record && nonLabRecords.length > 0) {
            record = nonLabRecords[0];
            console.log('Using fallback non-lab record (latest):', {
              id: record._id,
              createdBy: record.createdBy,
              chiefComplaint: record.chiefComplaint?.description
            });
          }
          
          // Final fallback to any record
          if (!record) {
            record = data.data[0];
            console.log('Using final fallback record (latest):', {
              id: record._id,
              createdBy: record.createdBy,
              chiefComplaint: record.chiefComplaint?.description
            });
          }
          
          console.log('=== END DEBUG ===');
          }
        }
        
        // If we found a record, load it into the form
        if (record) {
          // Set the current record ID for save operations
          setCurrentRecordId(record._id);

          // Map backend data to local formData structure (same as before)
          const loadedForm = {
            chiefComplaint: {
              description: record.chiefComplaint?.description || '',
              duration: record.chiefComplaint?.duration || '',
              severity: record.chiefComplaint?.severity || '',
              progression: record.chiefComplaint?.progression || '',
              location: record.chiefComplaint?.location || '',
              hpi: record.historyOfPresentIllness || ''
            },
            vitalSigns: {
              temperature: record.physicalExamination?.vitals?.temperature?.toString() || '',
              bloodPressure: record.physicalExamination?.vitals?.bloodPressure
                ? `${record.physicalExamination.vitals.bloodPressure.systolic}/${record.physicalExamination.vitals.bloodPressure.diastolic}`
                : '',
              heartRate: record.physicalExamination?.vitals?.heartRate?.toString() || '',
              respiratoryRate: record.physicalExamination?.vitals?.respiratoryRate?.toString() || '',
              oxygenSaturation: record.physicalExamination?.vitals?.oxygenSaturation?.toString() || '',
              height: record.physicalExamination?.vitals?.height?.toString() || '',
              weight: record.physicalExamination?.vitals?.weight?.toString() || '',
              bmi: record.physicalExamination?.vitals?.bmi?.toString() || ''
            },
            physicalExamination: {
              general: record.physicalExamination?.general || '',
              heent: (() => {
                // If HEENT is already an object with separate fields, use it
                if (record.physicalExamination?.heent && typeof record.physicalExamination.heent === 'object') {
                  return {
                    head: record.physicalExamination.heent.head || '',
                    eyes: record.physicalExamination.heent.eyes || '',
                    ears: record.physicalExamination.heent.ears || '',
                    nose: record.physicalExamination.heent.nose || '',
                    throat: record.physicalExamination.heent.throat || ''
                  };
                }
                // If HEENT is a string, parse it into separate fields
                if (typeof record.physicalExamination?.heent === 'string') {
                  return parseHeentString(record.physicalExamination.heent);
                }
                // Default empty object
                return {
                  head: '',
                  eyes: '',
                  ears: '',
                  nose: '',
                  throat: ''
                };
              })(),
              cardiovascular: record.physicalExamination?.cardiovascular || '',
              respiratory: record.physicalExamination?.chest || '',
              gastrointestinal: record.physicalExamination?.abdomen || '',
              neurological: record.physicalExamination?.neurological || '',
              musculoskeletal: record.physicalExamination?.extremities || '',
              skin: record.physicalExamination?.skin || '',
              summary: record.physicalExamination?.summary || ''
            },
            assessment: {
              primaryDiagnosis: record.diagnosis || record.primaryDiagnosis?.description || '',
              secondaryDiagnoses: [],
              plan: record.plan || record.treatmentPlan || record.assessment?.plan || '',
              prescriptions: [],
              labOrders: [],
              followUp: record.followUpPlan?.instructions || ''
            },
            qualityChecks: {
              documentationComplete: record.status !== 'Draft',
              reviewedAndApproved: record.status === 'Finalized',
              peerReviewed: false
            }
          } as typeof formData;
          
          console.log('🔍 [DEBUG] Assessment mapping result:', {
            mappedPlan: loadedForm.assessment.plan,
            mappedPrimaryDiagnosis: loadedForm.assessment.primaryDiagnosis,
            mappedFollowUp: loadedForm.assessment.followUp
          });
          setFormData(loadedForm);
          setIsFinalized(record.status === 'Finalized');
          
          console.log('✅ Form data loaded successfully:', {
            recordId: record._id,
            chiefComplaint: loadedForm.chiefComplaint.description,
            status: record.status
          });
        }
      } catch (err) {
        console.error('Error loading medical record:', err);
      } finally {
        setLoading(false);
        // Enable auto-save after initial load
        setTimeout(() => {
          isFirstRender.current = false;
        }, 500);
      }
    };
    fetchLatestRecord();
  }, [patientId, mode, recordId, initialRecordData]);

  const renderPatientHeader = () => (
    <Box
      sx={{
        mb: 2.5,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
      }}
    >
      {/* Avatar + name row on mobile */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', minWidth: 0 }}>
        {/* Avatar */}
        <Avatar
          src={patientData.avatar}
          sx={{
            width: 44,
            height: 44,
            bgcolor: 'primary.main',
            fontSize: '1rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {(patientData.firstName || 'U')[0]}{(patientData.lastName || 'P')[0]}
        </Avatar>

        {/* Name + meta */}
        <Box flex={1} minWidth={0}>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3, fontSize: { xs: '0.9rem', sm: '1.05rem' }, wordBreak: 'break-word' }}>
            {patientData.firstName || 'Unknown'} {patientData.lastName || 'Patient'}
          </Typography>
          <Box display="flex" gap={1} mt={0.5} flexWrap="wrap" alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {patientData.gender ? patientData.gender.charAt(0).toUpperCase() + patientData.gender.slice(1) : 'Unknown'} · {patientData.age || '—'} yrs
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>ID: {patientData.id}</Typography>
            {patientData.phone && <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{patientData.phone}</Typography>}
          <Chip
            label={`Quality Score: ${Math.round(qualityScore)}%`}
            color={qualityScore >= 80 ? 'success' : qualityScore >= 60 ? 'warning' : 'error'}
            size="small"
            sx={{ height: 22, fontSize: '0.78rem' }}
          />
          {autoSaveStatus !== 'idle' && (
            <Chip
              icon={autoSaveStatus === 'saving' ? <SaveIcon sx={{ fontSize: '0.8rem !important' }} /> : <CheckCircleIcon sx={{ fontSize: '0.8rem !important' }} />}
              label={autoSaveStatus === 'saving' ? 'Saving…' : 'Saved'}
              color={autoSaveStatus === 'saved' ? 'success' : 'info'}
              size="small"
              sx={{ height: 22, fontSize: '0.78rem' }}
            />
          )}
        </Box>
        {/* Quality progress bar */}
        <LinearProgress
          variant="determinate"
          value={qualityScore}
          sx={{
            mt: 1,
            height: 4,
            borderRadius: 2,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 2,
              bgcolor: qualityScore >= 80 ? 'success.main' : qualityScore >= 60 ? 'warning.main' : 'error.main',
            },
          }}
        />
      </Box>
      </Box>{/* end avatar+name wrapper */}

      {/* Action buttons — wrap on mobile */}
      <Box display="flex" gap={1} flexShrink={0} alignItems="center" flexWrap="wrap" sx={{ width: { xs: '100%', sm: 'auto' } }}>
        <Button variant="outlined" startIcon={<HistoryIcon />} size="small" onClick={fetchPatientHistory} sx={{ fontSize: '0.82rem', textTransform: 'none' }}>
          History
        </Button>
        <Button variant="outlined" startIcon={<AIIcon />} size="small" onClick={() => { setAiAssistantOpen(true); generateAISuggestions(); }} sx={{ fontSize: '0.82rem', textTransform: 'none' }}>
          AI Assist
        </Button>
        <Button variant="outlined" startIcon={<PrintIcon />} size="small" onClick={() => window.print()} sx={{ fontSize: '0.82rem', textTransform: 'none' }}>
          Print
        </Button>
        <Tooltip title="Close">
          <IconButton
            onClick={() => onCancel && onCancel()}
            size="small"
            sx={{
              ml: 0.5,
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              '&:hover': { bgcolor: 'error.lighter', color: 'error.main', borderColor: 'error.light' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const renderModernStepper = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden' }}>
        <ModernStepper orientation="horizontal" activeStep={activeStep} sx={{ p: 2 }}>
          {steps.map((step, index) => (
            <Step key={step.label} onClick={() => handleStepClick(index)}>
              <StepLabel
                icon={
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: index === activeStep ? `${step.color}.main` : 'grey.300',
                      color: index === activeStep ? 'white' : 'grey.600',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'scale(1.1)',
                      }
                    }}
                  >
                    {step.icon}
                  </Box>
                }
              >
                <Box textAlign="center">
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}
                    color={index === activeStep ? 'primary' : 'text.secondary'}
                  >
                    {step.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {step.description}
                  </Typography>
                </Box>
              </StepLabel>
            </Step>
          ))}
        </ModernStepper>
      </Paper>
    </motion.div>
  );

  const renderSidebar = () => (
    <Box
      sx={{
        height: 'fit-content',
        position: 'sticky',
        top: 16,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        const isCompleted = index < activeStep;
        return (
          <Box
            key={step.label}
            onClick={() => handleStepClick(index)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1.5,
              cursor: 'pointer',
              bgcolor: isActive ? 'primary.main' : 'transparent',
              borderBottom: index < steps.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              transition: 'background 0.15s',
              '&:hover': {
                bgcolor: isActive ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: isActive ? 'rgba(255,255,255,0.2)' : isCompleted ? 'success.main' : 'grey.200',
                color: isActive || isCompleted ? 'white' : 'text.secondary',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              {isCompleted ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : index + 1}
            </Box>
            <Box flex={1} minWidth={0}>
              <Typography
                variant="body2"
                fontWeight={isActive ? 700 : 500}
                noWrap
                sx={{ color: isActive ? 'white' : 'text.primary', fontSize: '0.92rem' }}
              >
                {step.label}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: isActive ? 'rgba(255,255,255,0.75)' : 'text.secondary', fontSize: '0.78rem' }}
              >
                {step.description}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  const renderStepContent = () => {
    // Debug: Log current formData values
    console.log('🔍 [RENDER] Current formData:', {
      chiefComplaint: formData.chiefComplaint.description,
      hpi: formData.chiefComplaint.hpi,
      duration: formData.chiefComplaint.duration,
      severity: formData.chiefComplaint.severity,
      progression: formData.chiefComplaint.progression,
      location: formData.chiefComplaint.location,
      assessment: formData.assessment,
      primaryDiagnosis: formData.assessment?.primaryDiagnosis
    });
    
    console.log('🔍 [STEP] Current active step:', activeStep);
    
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Chief Complaint card */}
            <GradientCard>
              <Box sx={{ px: 2.5, pt: 2, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AssignmentIcon sx={{ fontSize: '1.25rem', color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>Chief Complaint</Typography>
                  <Typography variant="body2" color="text.secondary">Primary reason for today's visit</Typography>
                </Box>
              </Box>
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  {/* Chief Complaint */}
                  <TextField
                    fullWidth
                    size="small"
                    label="Chief Complaint"
                    placeholder="Describe the main symptom or reason for today's visit"
                    value={formData.chiefComplaint.description}
                    onChange={(e) => {
                      const updated = { ...formData, chiefComplaint: { ...formData.chiefComplaint, description: e.target.value } };
                      setFormData(updated);
                      if (!isFirstRender.current) { autoSaveDraft(updated); memorySystem.updateData(); }
                    }}
                    disabled={mode === 'view'}
                  />

                  {/* HPI */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        History of Present Illness (HPI)
                      </Typography>
                      {mode !== 'view' && (
                        <Tooltip title={geminiAvailable ? 'Generate HPI with Gemini AI' : 'Auto-fill HPI based on chief complaint'}>
                          <Button
                            size="small"
                            variant={geminiAvailable ? 'contained' : 'outlined'}
                            startIcon={hpiAutoFillLoading ? <CircularProgress size={12} color="inherit" /> : <SparkleIcon sx={{ fontSize: '0.9rem' }} />}
                            onClick={autoFillHPI}
                            disabled={hpiAutoFillLoading || !formData.chiefComplaint.description}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.72rem',
                              py: 0.3,
                              px: 1,
                              ...(geminiAvailable
                                ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #663d93 100%)' } }
                                : { borderColor: 'primary.main', color: 'primary.main', '&:hover': { bgcolor: 'primary.50' } })
                            }}
                          >
                            {hpiAutoFillLoading ? 'Generating…' : geminiAvailable ? '✨ AI Fill HPI' : 'Auto-fill HPI'}
                          </Button>
                        </Tooltip>
                      )}
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={4}
                      placeholder="Provide a detailed history of the present illness, or click Auto-fill HPI..."
                      value={(formData as any).historyOfPresentIllness || ''}
                      onChange={(e) => {
                        const updated = { ...formData, historyOfPresentIllness: e.target.value };
                        setFormData(updated);
                        if (!isFirstRender.current) { autoSaveDraft(updated); memorySystem.updateData(); }
                        // Update suggestions as user types
                        const ccDesc = formData.chiefComplaint.description || '';
                        if (ccDesc) {
                          const suggestions = AIAssistantService.getHPICompletions(e.target.value, ccDesc);
                          setHpiSuggestions(suggestions);
                          setShowHpiSuggestions(suggestions.length > 0);
                        }
                      }}
                      disabled={mode === 'view'}
                      sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } }}
                    />
                    {/* HPI smart suggestion chips — categorized with form-field fill support */}
                    {showHpiSuggestions && mode !== 'view' && (
                      <Box sx={{ mt: 1.5, p: 1.5, border: '1px solid', borderColor: geminiAvailable ? 'primary.light' : 'grey.300', borderRadius: 1.5, bgcolor: geminiAvailable ? 'primary.50' : 'grey.50' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: geminiAvailable ? 'primary.main' : 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SparkleIcon sx={{ fontSize: '0.8rem' }} />
                            {geminiAvailable ? 'AI Suggested phrases — click to fill:' : 'Suggested phrases — click to append:'}
                          </Typography>
                          <Chip label="Dismiss" size="small" onClick={() => setShowHpiSuggestions(false)} sx={{ fontSize: '0.65rem', height: '18px', cursor: 'pointer' }} />
                        </Box>

                        {/* Form-field phrases: Duration, Severity, Progression, Location */}
                        {(['duration', 'severity', 'progression', 'location'] as const).some(k => (geminiPhrases[k] || []).length > 0) && (
                          <Box sx={{ mb: 1 }}>
                            {(['duration', 'severity', 'progression', 'location'] as const).map(field => {
                              const phrases = geminiPhrases[field] || [];
                              if (!phrases.length) return null;
                              const label = field.charAt(0).toUpperCase() + field.slice(1);
                              return (
                                <Box key={field} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                                  <Typography variant="caption" sx={{ color: 'text.disabled', minWidth: 64, fontStyle: 'italic', fontSize: '0.68rem' }}>{label}</Typography>
                                  {phrases.slice(0, 4).map((phrase, idx) => (
                                    <Chip
                                      key={idx}
                                      label={phrase}
                                      size="small"
                                      variant="filled"
                                      onClick={() => {
                                        const updated = { ...formData, chiefComplaint: { ...formData.chiefComplaint, [field]: phrase } };
                                        setFormData(updated);
                                        if (!isFirstRender.current) { autoSaveDraft(updated); memorySystem.updateData(); }
                                      }}
                                      sx={{ fontSize: '0.68rem', height: '20px', cursor: 'pointer', bgcolor: 'primary.100', color: 'primary.dark', '&:hover': { bgcolor: 'primary.200' } }}
                                    />
                                  ))}
                                </Box>
                              );
                            })}
                          </Box>
                        )}

                        {/* Inline HPI phrases: character, aggravating, relieving, associated */}
                        {(['character', 'aggravating', 'relieving', 'associated'] as const).some(k => (geminiPhrases[k] || []).length > 0) && (
                          <Box>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem', fontStyle: 'italic', display: 'block', mb: 0.5 }}>Append to HPI:</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(['character', 'aggravating', 'relieving', 'associated'] as const).flatMap(field =>
                                (geminiPhrases[field] || []).slice(0, 2).map((phrase, idx) => (
                                  <Chip
                                    key={`${field}-${idx}`}
                                    label={phrase.length > 52 ? phrase.slice(0, 52) + '…' : phrase}
                                    size="small"
                                    variant="outlined"
                                    icon={<SparkleIcon sx={{ fontSize: '0.7rem !important' }} />}
                                    onClick={() => {
                                      const current = (formData as any).historyOfPresentIllness || '';
                                      const sep = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : '';
                                      const updated = { ...formData, historyOfPresentIllness: current + sep + phrase };
                                      setFormData(updated);
                                      if (!isFirstRender.current) { autoSaveDraft(updated); memorySystem.updateData(); }
                                    }}
                                    sx={{ fontSize: '0.68rem', height: '20px', cursor: 'pointer', borderColor: 'primary.light', color: 'primary.main', '&:hover': { bgcolor: 'primary.50' } }}
                                  />
                                ))
                              )}
                            </Box>
                          </Box>
                        )}

                        {/* Fallback: simple suggestion chips when no gemini phrases */}
                        {Object.keys(geminiPhrases).length === 0 && hpiSuggestions.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {hpiSuggestions.map((suggestion, idx) => (
                              <Chip
                                key={idx}
                                label={suggestion.length > 55 ? suggestion.slice(0, 55) + '…' : suggestion}
                                size="small"
                                variant="outlined"
                                icon={<SparkleIcon sx={{ fontSize: '0.75rem !important' }} />}
                                onClick={() => {
                                  const current = (formData as any).historyOfPresentIllness || '';
                                  const separator = current && !current.endsWith(' ') && !current.endsWith('\n') ? ' ' : '';
                                  const updated = { ...formData, historyOfPresentIllness: current + separator + suggestion };
                                  setFormData(updated);
                                  if (!isFirstRender.current) { autoSaveDraft(updated); memorySystem.updateData(); }
                                  setShowHpiSuggestions(false);
                                }}
                                sx={{ fontSize: '0.7rem', height: '22px', cursor: 'pointer', borderColor: 'primary.light', color: 'primary.main', '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' } }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Duration / Severity / Progression / Location — 2×2 grid */}
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Duration"
                        placeholder="e.g., 2 days, 1 week"
                        value={formData.chiefComplaint.duration}
                        onChange={(e) => {
                          const updated = { ...formData, chiefComplaint: { ...formData.chiefComplaint, duration: e.target.value } };
                          setFormData(updated);
                          if (!isFirstRender.current) { autoSaveDraft(updated); memorySystem.updateData(); }
                        }}
                        disabled={mode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Severity</InputLabel>
                        <Select
                          value={formData.chiefComplaint.severity}
                          label="Severity"
                          disabled={mode === 'view'}
                          onChange={(e) => {
                            const updated = { ...formData, chiefComplaint: { ...formData.chiefComplaint, severity: e.target.value } };
                            setFormData(updated);
                            if (!isFirstRender.current) autoSaveDraft(updated);
                          }}
                        >
                          <MenuItem value="Mild">Mild</MenuItem>
                          <MenuItem value="Moderate">Moderate</MenuItem>
                          <MenuItem value="Severe">Severe</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Progression</InputLabel>
                        <Select
                          value={formData.chiefComplaint.progression}
                          label="Progression"
                          disabled={mode === 'view'}
                          onChange={(e) => {
                            const updated = { ...formData, chiefComplaint: { ...formData.chiefComplaint, progression: e.target.value } };
                            setFormData(updated);
                            if (!isFirstRender.current) autoSaveDraft(updated);
                          }}
                        >
                          <MenuItem value="Improving">Improving</MenuItem>
                          <MenuItem value="Stable">Stable</MenuItem>
                          <MenuItem value="Worsening">Worsening</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Location"
                        placeholder="Where is the pain/discomfort located?"
                        value={formData.chiefComplaint.location}
                        onChange={(e) => {
                          const updated = { ...formData, chiefComplaint: { ...formData.chiefComplaint, location: e.target.value } };
                          setFormData(updated);
                          if (!isFirstRender.current) { autoSaveDraft(updated); memorySystem.updateData(); }
                        }}
                        disabled={mode === 'view'}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </GradientCard>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <GradientCard>
              <Box sx={{ px: 2.5, pt: 2, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <MedicalIcon sx={{ fontSize: '1.25rem', color: 'secondary.main' }} />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>Physical Examination</Typography>
                    <Typography variant="body2" color="text.secondary">Systematic physical assessment findings</Typography>
                  </Box>
                </Box>
                {mode !== 'view' && (
                  <Tooltip title={physicalExamAutoFilled ? 'Re-fill physical exam based on chief complaint' : 'Auto-fill physical exam based on chief complaint'}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<SparkleIcon sx={{ fontSize: '0.9rem' }} />}
                      onClick={autoFillPhysicalExam}
                      disabled={!formData.chiefComplaint.description}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        py: 0.3,
                        px: 1,
                        borderColor: 'secondary.main',
                        color: 'secondary.main',
                        '&:hover': { bgcolor: 'secondary.50' }
                      }}
                    >
                      {physicalExamAutoFilled ? 'Re-fill Exam' : 'Auto-fill Exam'}
                    </Button>
                  </Tooltip>
                )}
              </Box>
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  {/* Vital Signs */}
                  <Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        Vital Signs (from Nurse)
                      </Typography>
                      <Button
                        startIcon={<RefreshIcon />}
                        onClick={fetchNurseVitalSigns}
                        disabled={loadingVitalSigns}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        {loadingVitalSigns ? 'Loading…' : 'Refresh'}
                      </Button>
                    </Box>
                          
                          {loadingVitalSigns ? (
                            <Box display="flex" alignItems="center" gap={1.5} py={1}>
                              <CircularProgress size={16} />
                              <Typography variant="body2" color="text.secondary">Loading vital signs…</Typography>
                            </Box>
                          ) : vitalSignsError ? (
                            <Alert severity="warning" sx={{ py: 0.5 }}>
                              <Typography variant="body2">{vitalSignsError || 'Error loading vital signs'}</Typography>
                            </Alert>
                          ) : nurseVitalSigns ? (
                            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                              <Grid container>
                                {[
                                  { label: 'Temperature', value: nurseVitalSigns.temperature },
                                  { label: 'Blood Pressure', value: nurseVitalSigns.systolic && nurseVitalSigns.diastolic ? `${nurseVitalSigns.systolic}/${nurseVitalSigns.diastolic}` : null },
                                  { label: 'Heart Rate', value: nurseVitalSigns.pulse },
                                  { label: 'Resp. Rate', value: nurseVitalSigns.respiratoryRate },
                                  { label: 'SpO₂', value: nurseVitalSigns.spo2 },
                                  { label: 'Height', value: nurseVitalSigns.height },
                                  { label: 'Weight', value: nurseVitalSigns.weight },
                                  { label: 'BMI', value: nurseVitalSigns.bmi },
                                ].map((item, i) => (
                                  <Grid key={i} size={{ xs: 6, sm: 3 }}>
                                    <Box sx={{ p: 1.5, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
                                      <Typography variant="caption" color="text.secondary" display="block">{item.label}</Typography>
                                      <Typography variant="body2" fontWeight={700} color={item.value ? 'text.primary' : 'text.disabled'}>
                                        {item.value || '—'}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                ))}
                              </Grid>
                              <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary">
                                  Recorded by {nurseVitalSigns.measuredByName || 'Nurse'} · {nurseVitalSigns.measurementDate ? new Date(nurseVitalSigns.measurementDate).toLocaleString() : 'N/A'}
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Alert severity="info" sx={{ py: 0.5 }}>
                              <Typography variant="body2">No vital signs recorded yet. Click Refresh to check.</Typography>
                            </Alert>
                          )}
                        </Box>

                  <Divider />

                  <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ letterSpacing: '0.02em', mb: 1.5 }}>
                    System-Based Physical Examination
                  </Typography>
                        
                        {/* General Appearance */}
                        <Grid container spacing={3}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper 
                              elevation={0}
                              sx={{ 
                                p: 2.5, 
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderLeft: '4px solid',
                                borderLeftColor: 'primary.main',
                                bgcolor: 'grey.50',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                '&:hover': {
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                  borderColor: 'primary.light'
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%', 
                                  bgcolor: 'primary.50',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 1.5,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}>
                                  <Typography sx={{ fontSize: '1.25rem' }}>👤</Typography>
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                  General Appearance
                                </Typography>
                              </Box>
                              <Autocomplete
                                multiple
                                options={[
                                  ...new Set([
                                    'Alert',
                                    'Oriented x3 (person, place, time)',
                                    'Well-appearing',
                                    'Well-nourished',
                                    'Well-developed',
                                    'No acute distress',
                                    'Cooperative',
                                    'Pleasant affect',
                                    'Anxious',
                                    'Appears stated age',
                                    'Younger than stated age',
                                    'Older than stated age',
                                    'Distressed',
                                    'Lethargic',
                                    'Confused',
                                    'Agitated',
                                    'Combative',
                                    'Ill-appearing',
                                    'Toxic-appearing',
                                    'Pale',
                                    'Diaphoretic',
                                    'Cachetic',
                                    'Obese',
                                    ...(customFindings.general || [])
                                  ])
                                ]}
                                value={formData.physicalExamination.general 
                                  ? formData.physicalExamination.general.split(', ').filter(Boolean)
                                  : []
                                }
                                onChange={(event, newValue, reason, details) => {
                                  // Save custom entry if user typed it
                                  if (reason === 'createOption' && details?.option) {
                                    saveCustomFinding('general', details.option);
                                  }
                                  
                                  const updated = {
                                    ...formData,
                                    physicalExamination: {
                                      ...formData.physicalExamination,
                                      general: newValue.join(', ')
                                    }
                                  };
                                  setFormData(updated);
                                  if (!isFirstRender.current) autoSaveDraft(updated);
                                }}
                                disabled={mode === 'view'}
                                freeSolo
                                size="medium"
                                renderTags={(tagValue, getTagProps) =>
                                  tagValue.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    const predefinedOptions = [
                                      'Alert', 'Oriented x3 (person, place, time)', 'Well-appearing', 'Well-nourished',
                                      'Well-developed', 'No acute distress', 'Cooperative', 'Pleasant affect', 'Anxious',
                                      'Appears stated age', 'Younger than stated age', 'Older than stated age', 'Distressed',
                                      'Lethargic', 'Confused', 'Agitated', 'Combative', 'Ill-appearing', 'Toxic-appearing',
                                      'Pale', 'Diaphoretic', 'Cachetic', 'Obese'
                                    ];
                                    const isCustom = !predefinedOptions.includes(option) || customFindings.general?.includes(option);
                                    return (
                                      <Chip
                                        variant="filled"
                                        label={isCustom ? `✨ ${option}` : option}
                                        {...tagProps}
                                        key={key}
                                        size="small"
                                        sx={{ 
                                          fontSize: '0.75rem', 
                                          height: '26px',
                                          borderRadius: '9999px',
                                          bgcolor: isCustom ? 'success.50' : 'primary.50',
                                          color: isCustom ? 'success.dark' : 'primary.dark',
                                          fontWeight: isCustom ? 600 : 500,
                                          '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7 }
                                        }}
                                      />
                                    );
                                  })
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Select or type findings..."
                                    size="medium"
                                    variant="outlined"
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 2.5,
                                        fontSize: '0.875rem',
                                        minHeight: '52px',
                                        bgcolor: 'background.paper',
                                        '& fieldset': { borderColor: 'divider' },
                                        '&:hover fieldset': { borderColor: 'primary.light' },
                                        '&.Mui-focused fieldset': { borderWidth: '2px' }
                                      }
                                    }}
                                  />
                                )}
                              />
                            </Paper>
                          </Grid>

                          {/* HEENT - Head */}
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper 
                              elevation={0}
                              sx={{ 
                                p: 2.5, 
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderLeft: '4px solid',
                                borderLeftColor: 'secondary.main',
                                bgcolor: 'grey.50',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                '&:hover': {
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                  borderColor: 'secondary.light'
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%', 
                                  bgcolor: 'secondary.50',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 1.5,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}>
                                  <Typography sx={{ fontSize: '1.25rem' }}>🧠</Typography>
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                  Head
                                </Typography>
                              </Box>
                              <Autocomplete
                                multiple
                                options={[
                                  ...new Set([
                                    'Normocephalic',
                                    'Atraumatic',
                                    'No visible lesions',
                                    'Symmetrical',
                                    'No tenderness',
                                    'No deformities',
                                    'Scalp normal',
                                    'Hair distribution normal',
                                    'Palpable masses',
                                    'Cranial asymmetry',
                                    'Trauma evident',
                                    'Scalp lesions',
                                    'Frontal bossing',
                                    'Macrocephaly',
                                    'Microcephaly',
                                    'Fontanelles soft and flat (pediatric)',
                                    'Head circumference within normal limits',
                                    'Bruising present',
                                    'Lacerations present',
                                    'Hematoma present',
                                    ...(customFindings.head || [])
                                  ])
                                ]}
                                value={formData.physicalExamination.heent.head 
                                  ? formData.physicalExamination.heent.head.split(', ').filter(Boolean)
                                  : []
                                }
                                onChange={(event, newValue, reason, details) => {
                                  // Save custom entry if user typed it
                                  if (reason === 'createOption' && details?.option) {
                                    saveCustomFinding('head', details.option);
                                  }
                                  
                                  const updated = {
                                    ...formData,
                                    physicalExamination: {
                                      ...formData.physicalExamination,
                                      heent: {
                                        ...formData.physicalExamination.heent,
                                        head: newValue.join(', ')
                                      }
                                    }
                                  };
                                  setFormData(updated);
                                  if (!isFirstRender.current) autoSaveDraft(updated);
                                }}
                                disabled={mode === 'view'}
                                freeSolo
                                size="medium"
                                renderTags={(tagValue, getTagProps) =>
                                  tagValue.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    const predefinedOptions = [
                                      'Normocephalic', 'Atraumatic', 'No visible lesions', 'Symmetrical', 'No tenderness',
                                      'No deformities', 'Scalp normal', 'Hair distribution normal', 'Palpable masses',
                                      'Cranial asymmetry', 'Trauma evident', 'Scalp lesions', 'Frontal bossing',
                                      'Macrocephaly', 'Microcephaly', 'Fontanelles soft and flat (pediatric)',
                                      'Head circumference within normal limits', 'Bruising present', 'Lacerations present',
                                      'Hematoma present'
                                    ];
                                    const isCustom = !predefinedOptions.includes(option) || customFindings.head?.includes(option);
                                    return (
                                      <Chip
                                        variant="filled"
                                        label={isCustom ? `✨ ${option}` : option}
                                        {...tagProps}
                                        key={key}
                                        size="small"
                                        sx={{ 
                                          fontSize: '0.75rem', 
                                          height: '26px',
                                          borderRadius: '9999px',
                                          bgcolor: isCustom ? 'success.50' : 'secondary.50',
                                          color: isCustom ? 'success.dark' : 'secondary.dark',
                                          fontWeight: isCustom ? 600 : 500,
                                          '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7 }
                                        }}
                                      />
                                    );
                                  })
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Select or type findings..."
                                    size="medium"
                                    variant="outlined"
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 2.5,
                                        fontSize: '0.875rem',
                                        minHeight: '52px',
                                        bgcolor: 'background.paper',
                                        '& fieldset': { borderColor: 'divider' },
                                        '&:hover fieldset': { borderColor: 'primary.light' },
                                        '&.Mui-focused fieldset': { borderWidth: '2px' }
                                      }
                                    }}
                                  />
                                )}
                              />
                            </Paper>
                          </Grid>

                          {/* HEENT - Eyes */}
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper 
                              elevation={0}
                              sx={{ 
                                p: 2.5, 
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderLeft: '4px solid',
                                borderLeftColor: 'info.main',
                                bgcolor: 'grey.50',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                '&:hover': {
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                  borderColor: 'info.light'
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%', 
                                  bgcolor: 'info.50',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 1.5,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}>
                                  <Typography sx={{ fontSize: '1.25rem' }}>👁️</Typography>
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                  Eyes
                                </Typography>
                              </Box>
                              <Autocomplete
                                multiple
                                options={[...new Set([...heentFindings.eyes, ...(customFindings.eyes || [])])]}
                                value={formData.physicalExamination.heent.eyes 
                                  ? formData.physicalExamination.heent.eyes.split(', ').filter(Boolean)
                                  : []
                                }
                                onChange={(event, newValue, reason, details) => {
                                  if (reason === 'createOption' && details?.option) {
                                    saveCustomFinding('eyes', details.option);
                                  }
                                  const updated = {
                                    ...formData,
                                    physicalExamination: {
                                      ...formData.physicalExamination,
                                      heent: {
                                        ...formData.physicalExamination.heent,
                                        eyes: newValue.join(', ')
                                      }
                                    }
                                  };
                                  setFormData(updated);
                                  if (!isFirstRender.current) autoSaveDraft(updated);
                                }}
                                disabled={mode === 'view'}
                                freeSolo
                                size="medium"
                                renderTags={(tagValue, getTagProps) =>
                                  tagValue.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    const isCustom = !heentFindings.eyes.includes(option) || customFindings.eyes?.includes(option);
                                    return (
                                      <Chip
                                        variant="filled"
                                        label={isCustom ? `✨ ${option}` : option}
                                        {...tagProps}
                                        key={key}
                                        size="small"
                                        sx={{ 
                                          fontSize: '0.75rem', 
                                          height: '26px',
                                          borderRadius: '9999px',
                                          bgcolor: isCustom ? 'success.50' : 'info.50',
                                          color: isCustom ? 'success.dark' : 'info.dark',
                                          fontWeight: isCustom ? 600 : 500,
                                          '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7 }
                                        }}
                                      />
                                    );
                                  })
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Select or type findings..."
                                    size="medium"
                                    variant="outlined"
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 2.5,
                                        fontSize: '0.875rem',
                                        minHeight: '52px',
                                        bgcolor: 'background.paper',
                                        '& fieldset': { borderColor: 'divider' },
                                        '&:hover fieldset': { borderColor: 'primary.light' },
                                        '&.Mui-focused fieldset': { borderWidth: '2px' }
                                      }
                                    }}
                                  />
                                )}
                              />
                            </Paper>
                          </Grid>

                          {/* HEENT - Ears */}
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper 
                              elevation={0}
                              sx={{ 
                                p: 2.5, 
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderLeft: '4px solid',
                                borderLeftColor: 'success.main',
                                bgcolor: 'grey.50',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                '&:hover': {
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                  borderColor: 'success.light'
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%', 
                                  bgcolor: 'success.50',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 1.5,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}>
                                  <Typography sx={{ fontSize: '1.25rem' }}>👂</Typography>
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                  Ears
                                </Typography>
                              </Box>
                              <Autocomplete
                                multiple
                                options={[...new Set([...heentFindings.ears, ...(customFindings.ears || [])])]}
                                value={formData.physicalExamination.heent.ears 
                                  ? formData.physicalExamination.heent.ears.split(', ').filter(Boolean)
                                  : []
                                }
                                onChange={(event, newValue, reason, details) => {
                                  if (reason === 'createOption' && details?.option) {
                                    saveCustomFinding('ears', details.option);
                                  }
                                  const updated = {
                                    ...formData,
                                    physicalExamination: {
                                      ...formData.physicalExamination,
                                      heent: {
                                        ...formData.physicalExamination.heent,
                                        ears: newValue.join(', ')
                                      }
                                    }
                                  };
                                  setFormData(updated);
                                  if (!isFirstRender.current) autoSaveDraft(updated);
                                }}
                                disabled={mode === 'view'}
                                freeSolo
                                size="medium"
                                renderTags={(tagValue, getTagProps) =>
                                  tagValue.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    const isCustom = !heentFindings.ears.includes(option) || customFindings.ears?.includes(option);
                                    return (
                                      <Chip
                                        variant="filled"
                                        label={isCustom ? `✨ ${option}` : option}
                                        {...tagProps}
                                        key={key}
                                        size="small"
                                        sx={{ 
                                          fontSize: '0.75rem', 
                                          height: '26px',
                                          borderRadius: '9999px',
                                          bgcolor: isCustom ? 'success.50' : 'success.50',
                                          color: isCustom ? 'success.dark' : 'success.dark',
                                          fontWeight: isCustom ? 600 : 500,
                                          '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7 }
                                        }}
                                      />
                                    );
                                  })
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Select or type findings..."
                                    size="medium"
                                    variant="outlined"
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 2.5,
                                        fontSize: '0.875rem',
                                        minHeight: '52px',
                                        bgcolor: 'background.paper',
                                        '& fieldset': { borderColor: 'divider' },
                                        '&:hover fieldset': { borderColor: 'primary.light' },
                                        '&.Mui-focused fieldset': { borderWidth: '2px' }
                                      }
                                    }}
                                  />
                                )}
                              />
                            </Paper>
                          </Grid>
                        </Grid>

                        {/* Row 2: Nose, Throat */}
                        <Grid container spacing={3} sx={{ mt: 0.5 }}>
                          {/* HEENT - Nose */}
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper 
                              elevation={0}
                              sx={{ 
                                p: 2.5, 
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderLeft: '4px solid',
                                borderLeftColor: 'warning.main',
                                bgcolor: 'grey.50',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                '&:hover': {
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                  borderColor: 'warning.light'
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%', 
                                  bgcolor: 'warning.50',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 1.5,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}>
                                  <Typography sx={{ fontSize: '1.25rem' }}>👃</Typography>
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                  Nose
                                </Typography>
                              </Box>
                              <Autocomplete
                                multiple
                                options={[...new Set([...heentFindings.nose, ...(customFindings.nose || [])])]}
                                value={formData.physicalExamination.heent.nose 
                                  ? formData.physicalExamination.heent.nose.split(', ').filter(Boolean)
                                  : []
                                }
                                onChange={(event, newValue, reason, details) => {
                                  if (reason === 'createOption' && details?.option) {
                                    saveCustomFinding('nose', details.option);
                                  }
                                  const updated = {
                                    ...formData,
                                    physicalExamination: {
                                      ...formData.physicalExamination,
                                      heent: {
                                        ...formData.physicalExamination.heent,
                                        nose: newValue.join(', ')
                                      }
                                    }
                                  };
                                  setFormData(updated);
                                  if (!isFirstRender.current) autoSaveDraft(updated);
                                }}
                                disabled={mode === 'view'}
                                freeSolo
                                size="medium"
                                renderTags={(tagValue, getTagProps) =>
                                  tagValue.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    const isCustom = !heentFindings.nose.includes(option) || customFindings.nose?.includes(option);
                                    return (
                                      <Chip
                                        variant="filled"
                                        label={isCustom ? `✨ ${option}` : option}
                                        {...tagProps}
                                        key={key}
                                        size="small"
                                        sx={{ 
                                          fontSize: '0.75rem', 
                                          height: '26px',
                                          borderRadius: '9999px',
                                          bgcolor: isCustom ? 'success.50' : 'warning.50',
                                          color: isCustom ? 'success.dark' : 'warning.dark',
                                          fontWeight: isCustom ? 600 : 500,
                                          '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7 }
                                        }}
                                      />
                                    );
                                  })
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Select or type findings..."
                                    size="medium"
                                    variant="outlined"
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 2.5,
                                        fontSize: '0.875rem',
                                        minHeight: '52px',
                                        bgcolor: 'background.paper',
                                        '& fieldset': { borderColor: 'divider' },
                                        '&:hover fieldset': { borderColor: 'primary.light' },
                                        '&.Mui-focused fieldset': { borderWidth: '2px' }
                                      }
                                    }}
                                  />
                                )}
                              />
                            </Paper>
                          </Grid>

                          {/* HEENT - Throat */}
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper 
                              elevation={0}
                              sx={{ 
                                p: 2.5, 
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderLeft: '4px solid',
                                borderLeftColor: 'error.main',
                                bgcolor: 'grey.50',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                '&:hover': {
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                  borderColor: 'error.light'
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%', 
                                  bgcolor: 'error.50',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 1.5,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}>
                                  <Typography sx={{ fontSize: '1.25rem' }}>🗣️</Typography>
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                  Throat
                                </Typography>
                              </Box>
                              <Autocomplete
                                multiple
                                options={[...new Set([...heentFindings.throat, ...(customFindings.throat || [])])]}
                                value={formData.physicalExamination.heent.throat 
                                  ? formData.physicalExamination.heent.throat.split(', ').filter(Boolean)
                                  : []
                                }
                                onChange={(event, newValue, reason, details) => {
                                  if (reason === 'createOption' && details?.option) {
                                    saveCustomFinding('throat', details.option);
                                  }
                                  const updated = {
                                    ...formData,
                                    physicalExamination: {
                                      ...formData.physicalExamination,
                                      heent: {
                                        ...formData.physicalExamination.heent,
                                        throat: newValue.join(', ')
                                      }
                                    }
                                  };
                                  setFormData(updated);
                                  if (!isFirstRender.current) autoSaveDraft(updated);
                                }}
                                disabled={mode === 'view'}
                                freeSolo
                                size="medium"
                                renderTags={(tagValue, getTagProps) =>
                                  tagValue.map((option, index) => {
                                    const { key, ...tagProps } = getTagProps({ index });
                                    const isCustom = !heentFindings.throat.includes(option) || customFindings.throat?.includes(option);
                                    return (
                                      <Chip
                                        variant="filled"
                                        label={isCustom ? `✨ ${option}` : option}
                                        {...tagProps}
                                        key={key}
                                        size="small"
                                        sx={{ 
                                          fontSize: '0.75rem', 
                                          height: '26px',
                                          borderRadius: '9999px',
                                          bgcolor: isCustom ? 'success.50' : 'error.50',
                                          color: isCustom ? 'success.dark' : 'error.dark',
                                          fontWeight: isCustom ? 600 : 500,
                                          '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7 }
                                        }}
                                      />
                                    );
                                  })
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Select or type findings..."
                                    size="medium"
                                    variant="outlined"
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 2.5,
                                        fontSize: '0.875rem',
                                        minHeight: '52px',
                                        bgcolor: 'background.paper',
                                        '& fieldset': { borderColor: 'divider' },
                                        '&:hover fieldset': { borderColor: 'primary.light' },
                                        '&.Mui-focused fieldset': { borderWidth: '2px' }
                                      }
                                    }}
                                  />
                                )}
                              />
                            </Paper>
                          </Grid>

                          {/* Body Systems: Cardiovascular, Respiratory */}
                        {[
                            { 
                              key: 'cardiovascular', 
                              label: 'Cardiovascular', 
                              icon: '❤️',
                              bgcolor: 'error.50',
                              chipColor: 'error.main',
                              options: [
                                'Regular rate and rhythm',
                                'S1 S2 present',
                                'No murmurs',
                                'No rubs',
                                'No gallops',
                                'Capillary refill <2 seconds',
                                'Peripheral pulses intact 2+ bilaterally',
                                'No peripheral edema',
                                'JVP not elevated',
                                'No carotid bruits',
                                'PMI at 5th intercostal space',
                                'Tachycardia',
                                'Bradycardia',
                                'Irregular rhythm',
                                'Pedal edema 1+',
                                'Pedal edema 2+',
                                'Systolic murmur',
                                'Diastolic murmur'
                              ]
                            },
                            { 
                              key: 'respiratory', 
                              label: 'Respiratory', 
                              icon: '🫁',
                              bgcolor: 'success.50',
                              chipColor: 'success.main',
                              options: [
                                'Clear to auscultation bilaterally',
                                'Breath sounds equal bilaterally',
                                'No wheezes',
                                'No rales/crackles',
                                'No rhonchi',
                                'Good air movement',
                                'Symmetric chest expansion',
                                'No accessory muscle use',
                                'No cyanosis',
                                'Trachea midline',
                                'Wheezing present',
                                'Crackles/rales present',
                                'Ronchi present',
                                'Diminished breath sounds',
                                'Respiratory distress',
                                'Use of accessory muscles'
                              ]
                            }
                        ].map((exam) => (
                             <Grid size={{ xs: 12, sm: 6 }} key={exam.key}>
                              <Paper 
                                elevation={0}
                                sx={{ 
                                  p: 2.5, 
                                  borderRadius: 3,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderLeft: '4px solid',
                                  borderLeftColor: exam.chipColor,
                                  bgcolor: 'grey.50',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                  '&:hover': {
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                    borderColor: exam.chipColor
                                  }
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <Box sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: '50%', 
                                    bgcolor: exam.bgcolor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 1.5,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                  }}>
                                    <Typography sx={{ fontSize: '1.25rem' }}>{exam.icon}</Typography>
                                  </Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                    {exam.label}
                                  </Typography>
                                </Box>
                                <Autocomplete
                                  multiple
                                  options={exam.options}
                                  value={formData.physicalExamination[exam.key as keyof PhysicalExaminationData] 
                                    ? (typeof formData.physicalExamination[exam.key as keyof PhysicalExaminationData] === 'string' 
                                         ? (formData.physicalExamination[exam.key as keyof PhysicalExaminationData] as string).split(', ').filter(Boolean)
                                         : [])
                                    : []
                                  }
                                  onChange={(event, newValue) => {
                                    const updated = {
                                      ...formData,
                                      physicalExamination: {
                                        ...formData.physicalExamination,
                                        [exam.key]: newValue.join(', ')
                                      }
                                    };
                                    setFormData(updated);
                                    if (!isFirstRender.current) autoSaveDraft(updated);
                                  }}
                                  disabled={mode === 'view'}
                                  freeSolo
                                  size="medium"
                                  renderTags={(tagValue, getTagProps) =>
                                    tagValue.map((option, index) => {
                                      const { key, ...tagProps } = getTagProps({ index });
                                      return (
                                        <Chip
                                          variant="filled"
                                          label={option}
                                          {...tagProps}
                                          key={key}
                                          size="small"
                                          sx={{ 
                                            fontSize: '0.75rem', 
                                            height: '26px',
                                            borderRadius: '9999px',
                                            bgcolor: exam.bgcolor,
                                            color: exam.chipColor,
                                            fontWeight: 500,
                                            '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7 }
                                          }}
                                        />
                                      );
                                    })
                                  }
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="Select or type findings..."
                                      size="medium"
                                      variant="outlined"
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 2.5,
                                          fontSize: '0.875rem',
                                          minHeight: '52px',
                                          bgcolor: 'background.paper',
                                          '& fieldset': { borderColor: 'divider' },
                                          '&:hover fieldset': { borderColor: 'primary.light' },
                                          '&.Mui-focused fieldset': { borderWidth: '2px' }
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>

                        {/* Row 3: Gastrointestinal, Neurological, Musculoskeletal, Skin */}
                        <Grid container spacing={3} sx={{ mt: 0.5 }}>
                          {[
                            { 
                              key: 'gastrointestinal', 
                              label: 'Gastrointestinal', 
                              icon: '🫃',
                              bgcolor: 'warning.50',
                              chipColor: 'warning.main',
                              options: [
                                'Soft',
                                'Non-tender',
                                'Non-distended',
                                'Bowel sounds present in all 4 quadrants',
                                'Bowel sounds normoactive',
                                'No masses palpable',
                                'No hepatosplenomegaly',
                                'No rebound',
                                'No guarding',
                                'Tympanic to percussion',
                                'Bowel sounds hyperactive',
                                'Bowel sounds hypoactive',
                                'Distended',
                                'Rebound tenderness',
                                'Guarding present',
                                'Masses palpable',
                                'Ascites present'
                              ]
                            },
                            { 
                              key: 'neurological', 
                              label: 'Neurological', 
                              icon: '🧠',
                              bgcolor: 'secondary.50',
                              chipColor: 'secondary.main',
                              options: [
                                'Alert and oriented x3 (person, place, time)',
                                'Alert and oriented x4',
                                'Glasgow Coma Scale 15/15',
                                'Cranial nerves II-XII grossly intact',
                                'Motor strength 5/5 all extremities',
                                'Deep tendon reflexes 2+ symmetric',
                                'Babinski negative bilaterally',
                                'Sensation intact to light touch',
                                'Coordination normal',
                                'Gait steady',
                                'Gait normal',
                                'Romberg negative',
                                'No tremor',
                                'No ataxia',
                                'No focal deficits',
                                'Focal neurological deficits present'
                              ]
                            },
                            { 
                              key: 'musculoskeletal', 
                              label: 'Musculoskeletal', 
                              icon: '💪',
                              bgcolor: 'info.50',
                              chipColor: 'info.main',
                              options: [
                                'Full range of motion all joints',
                                'No joint swelling',
                                'No joint tenderness',
                                'No joint deformity',
                                'Muscle strength normal',
                                'Muscle tone normal',
                                'No muscle atrophy',
                                'Spine straight',
                                'No scoliosis',
                                'No crepitus',
                                'Limited range of motion',
                                'Joint swelling present',
                                'Joint effusion present',
                                'Bone tenderness',
                                'Deformity present'
                              ]
                            },
                            { 
                              key: 'skin', 
                              label: 'Skin', 
                              icon: '🫱',
                              bgcolor: 'primary.50',
                              chipColor: 'primary.main',
                              options: [
                                'Warm',
                                'Dry',
                                'Intact',
                                'No rashes',
                                'No lesions',
                                'Good turgor',
                                'Normal moisture',
                                'No jaundice',
                                'No cyanosis',
                                'No pallor',
                                'Pink',
                                'Well-perfused',
                                'Rash present',
                                'Lesions present',
                                'Bruising',
                                'Poor turgor',
                                'Diaphoretic',
                                'Jaundiced',
                                'Cyanotic',
                                'Pale'
                              ]
                            }
                          ].map((exam) => (
                             <Grid size={{ xs: 12, sm: 6, md: 3 }} key={exam.key}>
                              <Paper 
                                elevation={0}
                                sx={{ 
                                  p: 2.5, 
                                  borderRadius: 3,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderLeft: '4px solid',
                                  borderLeftColor: exam.chipColor,
                                  bgcolor: 'grey.50',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                  '&:hover': {
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                    borderColor: exam.chipColor
                                  }
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <Box sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: '50%', 
                                    bgcolor: exam.bgcolor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 1.5,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                  }}>
                                    <Typography sx={{ fontSize: '1.25rem' }}>{exam.icon}</Typography>
                                  </Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                    {exam.label}
                                  </Typography>
                                </Box>
                                <Autocomplete
                                  multiple
                                  options={exam.options}
                                  value={formData.physicalExamination[exam.key as keyof PhysicalExaminationData] 
                                    ? (typeof formData.physicalExamination[exam.key as keyof PhysicalExaminationData] === 'string' 
                                         ? (formData.physicalExamination[exam.key as keyof PhysicalExaminationData] as string).split(', ').filter(Boolean)
                                         : [])
                                    : []
                                  }
                                  onChange={(event, newValue) => {
                                    const updated = {
                                      ...formData,
                                      physicalExamination: {
                                        ...formData.physicalExamination,
                                        [exam.key]: newValue.join(', ')
                                      }
                                    };
                                    setFormData(updated);
                                    if (!isFirstRender.current) autoSaveDraft(updated);
                                  }}
                                  disabled={mode === 'view'}
                                  freeSolo
                                  size="medium"
                                  renderTags={(tagValue, getTagProps) =>
                                    tagValue.map((option, index) => {
                                      const { key, ...tagProps } = getTagProps({ index });
                                      return (
                                        <Chip
                                          variant="filled"
                                          label={option}
                                          {...tagProps}
                                          key={key}
                                          size="small"
                                          sx={{ 
                                            fontSize: '0.75rem', 
                                            height: '26px',
                                            borderRadius: '9999px',
                                            bgcolor: exam.bgcolor,
                                            color: exam.chipColor,
                                            fontWeight: 500,
                                            '& .MuiChip-deleteIcon': { color: 'inherit', opacity: 0.7 }
                                          }}
                                        />
                                      );
                                    })
                                  }
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      placeholder="Select or type findings..."
                                      size="medium"
                                      variant="outlined"
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 2.5,
                                          fontSize: '0.875rem',
                                          minHeight: '52px',
                                          bgcolor: 'background.paper',
                                          '& fieldset': { borderColor: 'divider' },
                                          '&:hover fieldset': { borderColor: 'primary.light' },
                                          '&.Mui-focused fieldset': { borderWidth: '2px' }
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </Paper>
                            </Grid>
                          ))}
                      </Grid>
                </Stack>
              </CardContent>
            </GradientCard>
          </Box>
        );

      case 2:
        return (
          <GradientCard>
            <Box sx={{ px: 2.5, pt: 2, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AssessmentIcon sx={{ fontSize: '1.25rem', color: 'success.main' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>Assessment & Plan</Typography>
                <Typography variant="body2" color="text.secondary">Diagnosis and treatment recommendations</Typography>
              </Box>
              {(formData.assessment.primaryDiagnosis || (formData.assessment.secondaryDiagnoses?.length ?? 0) > 0) && (
                <Chip
                  label={`${(formData.assessment.primaryDiagnosis ? 1 : 0) + (formData.assessment.secondaryDiagnoses?.length ?? 0)} dx`}
                  size="small"
                  color="success"
                  variant="filled"
                />
              )}
            </Box>
            <CardContent>
                      <Grid container spacing={2.5}>
                      <Grid size={12} sx={{ width: '100%' }}>
                          {/* PRIMARY DIAGNOSIS CARD */}
                          <Paper elevation={0} sx={{
                            p: 2,
                            border: '2px solid',
                            borderColor: formData.assessment.primaryDiagnosis ? 'success.main' : 'primary.light',
                            borderRadius: 2,
                            bgcolor: formData.assessment.primaryDiagnosis
                              ? alpha(theme.palette.success.main, 0.04)
                              : alpha(theme.palette.primary.main, 0.02),
                            transition: 'all 0.2s ease'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                              <MedicalIcon color="primary" sx={{ fontSize: '1rem' }} />
                              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                                Primary Diagnosis *
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                Search by name · ICD-11 · ICD-10 · NHDD
                              </Typography>
                            </Box>
                            {/* Selected Primary Diagnosis Display */}
                            {formData.assessment.primaryDiagnosis && (
                              <Box sx={{
                                mb: 1.5, p: 1.5,
                                bgcolor: 'background.paper',
                                borderRadius: 1.5,
                                border: '1px solid',
                                borderColor: 'success.light',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 1
                              }}>
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                    <CheckCircleIcon sx={{ fontSize: '1rem', color: 'success.main' }} />
                                    <Typography variant="body1" fontWeight={700} color="success.dark">
                                      {formData.assessment.primaryDiagnosis}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                    {formData.assessment.primaryDiagnosisICD11?.code && (
                                      <Chip label={`ICD-11: ${formData.assessment.primaryDiagnosisICD11.code}`} size="small" color="success" variant="filled" />
                                    )}
                                    {(() => {
                                      const dx = enhancedDiagnosisDatabase.find(d => d.diagnosis === formData.assessment.primaryDiagnosis);
                                      if (!dx) return null;
                                      return (
                                        <>
                                          {dx.icd10 && <Chip label={`ICD-10: ${dx.icd10}`} size="small" color="secondary" variant="outlined" />}
                                          {dx.nhdd && <Chip label={`NHDD: ${dx.nhdd}`} size="small" color="primary" variant="outlined" />}
                                          {dx.category && <Chip label={dx.category} size="small" variant="outlined" color="default" />}
                                        </>
                                      );
                                    })()}
                                  </Box>
                                  {formData.assessment.primaryDiagnosisICD11?.chapter && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                      {formData.assessment.primaryDiagnosisICD11.chapter}
                                    </Typography>
                                  )}
                                </Box>
                                {mode !== 'view' && (
                                  <Tooltip title="Change diagnosis">
                                    <IconButton size="small" color="error" onClick={() => {
                                      const updated = {
                                        ...formData,
                                        assessment: {
                                          ...formData.assessment,
                                          primaryDiagnosis: '',
                                          primaryDiagnosisICD11: { code: '', description: '', chapter: '', block: '', category: '', subcategory: '' }
                                        }
                                      };
                                      setFormData(updated);
                                      if (!isFirstRender.current) autoSaveDraft(updated);
                                    }}>
                                      <CloseIcon sx={{ fontSize: '0.9rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            )}

                            {/* Primary Diagnosis Search */}
                            {mode !== 'view' && (
                          <Autocomplete
                            fullWidth
                            freeSolo={false}
                            options={primarySearchQuery.trim() ? primarySearchResults : getPopularDiagnoses().slice(0, 8)}
                            getOptionLabel={(option: any) => option.diagnosis || ''}
                            isOptionEqualToValue={(option: any, value: any) => option.diagnosis === value.diagnosis}
                            value={null}
                            inputValue={primarySearchQuery}
                            onChange={(_event: any, newValue: any) => {
                              if (!newValue) return;
                              const updated = {
                                ...formData,
                                assessment: {
                                  ...formData.assessment,
                                  primaryDiagnosis: newValue.diagnosis || '',
                                  primaryDiagnosisICD11: {
                                    code: newValue.icd11 || newValue.icd_11 || '',
                                    description: newValue.diagnosis || '',
                                    chapter: newValue.icd11Chapter || newValue.chapter || '',
                                    block: newValue.icd11Block || newValue.block || '',
                                    category: newValue.category || '',
                                    subcategory: newValue.subcategory || ''
                                  }
                                }
                              };
                              setFormData(updated);
                              if (!isFirstRender.current) autoSaveDraft(updated);
                              setPrimarySearchQuery('');
                              setPrimarySearchResults([]);
                            }}
                            onInputChange={(_event: any, value: string) => {
                              setPrimarySearchQuery(value);
                              if (value.trim()) {
                                setPrimaryIsSearching(true);
                                debouncedPrimarySearch(value);
                              } else {
                                setPrimarySearchResults([]);
                                setPrimaryIsSearching(false);
                              }
                            }}
                            loading={primaryIsSearching}
                            filterOptions={(options: any[]) => options}
                            noOptionsText={primarySearchQuery.trim() ? 'No diagnoses found — try different keywords' : 'Type to search diagnoses...'}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={formData.assessment.primaryDiagnosis ? 'Change Primary Diagnosis' : 'Search Primary Diagnosis *'}
                                placeholder="Type name, ICD-11 code, ICD-10, or NHDD..."
                                helperText={
                                  primarySearchQuery.trim() && !primaryIsSearching
                                    ? `${primarySearchResults.length} result${primarySearchResults.length !== 1 ? 's' : ''} found`
                                    : 'Search across local database and WHO ICD-11'
                                }
                                InputProps={{
                                  ...params.InputProps,
                                  endAdornment: (
                                    <>
                                      {primaryIsSearching ? <CircularProgress color="inherit" size={18} /> : null}
                                      {params.InputProps.endAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                            renderOption={(props: any, option: any) => {
                              const { key, ...otherProps } = props;
                              return (
                                <Box component="li" key={`p-${option.nhdd}-${option.diagnosis}`} {...otherProps} sx={{ py: 1 }}>
                                  <Box sx={{ width: '100%' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                      <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{option.diagnosis}</Typography>
                                      <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
                                        {option.source === 'WHO-API' && (
                                          <Chip label="WHO" size="small" color="warning" variant="filled" sx={{ height: 18, fontSize: '0.6rem' }} />
                                        )}
                                        {option.source === 'local' && (
                                          <Chip label="Local DB" size="small" color="info" variant="filled" sx={{ height: 18, fontSize: '0.6rem' }} />
                                        )}
                                      </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                      {option.icd11 && <Chip label={`ICD-11: ${option.icd11}`} size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                      {option.icd10 && <Chip label={`ICD-10: ${option.icd10}`} size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                      {option.nhdd && <Chip label={`NHDD: ${option.nhdd}`} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                      {option.category && (
                                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>{option.category}</Typography>
                                      )}
                                    </Box>
                                    {option.commonTerms && option.commonTerms.length > 0 && (
                                      <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.25 }}>
                                        Also: {option.commonTerms.slice(0, 3).join(', ')}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              );
                            }}
                          />
                            )}
                            {mode === 'view' && !formData.assessment.primaryDiagnosis && (
                              <Typography variant="body2" color="text.secondary" fontStyle="italic">No primary diagnosis recorded</Typography>
                            )}
                          </Paper>
                        </Grid>

                      {/* SECONDARY DIAGNOSES */}
                      <Grid size={12} sx={{ width: '100%' }}>
                        <Paper elevation={0} sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: (formData.assessment.secondaryDiagnoses?.length ?? 0) > 0 ? 'secondary.light' : 'divider',
                          borderRadius: 2,
                          bgcolor: (formData.assessment.secondaryDiagnoses?.length ?? 0) > 0
                            ? alpha(theme.palette.secondary.main, 0.02)
                            : 'transparent'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <AddIcon color="secondary" sx={{ fontSize: '1rem' }} />
                            <Typography variant="subtitle2" fontWeight={700}>Secondary / Comorbid Diagnoses</Typography>
                            {(formData.assessment.secondaryDiagnoses?.length ?? 0) > 0 && (
                              <Chip
                                label={formData.assessment.secondaryDiagnoses!.length}
                                size="small"
                                color="secondary"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                            <Tooltip title="Add comorbidities, complications, or additional diagnoses. Each can have its own severity level.">
                              <InfoIcon sx={{ fontSize: '0.85rem', color: 'text.disabled', ml: 'auto' }} />
                            </Tooltip>
                          </Box>

                          {/* List of added secondary diagnoses */}
                          {(formData.assessment.secondaryDiagnoses?.length ?? 0) > 0 && (
                            <Box sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                              {formData.assessment.secondaryDiagnoses!.map((dx: any, idx: number) => (
                                <Box
                                  key={idx}
                                  sx={{
                                    p: 1.25,
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 1,
                                    justifyContent: 'space-between',
                                    '&:hover': { borderColor: 'secondary.light', bgcolor: alpha(theme.palette.secondary.main, 0.03) },
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={600} noWrap>
                                      {idx + 1}. {dx.diagnosis}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                      {dx.icd11Code && (
                                        <Chip label={`ICD-11: ${dx.icd11Code}`} size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                                      )}
                                      <Chip
                                        label={dx.severity || 'Mild'}
                                        size="small"
                                        color={dx.severity === 'Severe' ? 'error' : dx.severity === 'Moderate' ? 'warning' : 'default'}
                                        variant="filled"
                                        sx={{ height: 18, fontSize: '0.6rem' }}
                                      />
                                    </Box>
                                  </Box>
                                  {mode !== 'view' && (
                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                                      <Select
                                        size="small"
                                        value={dx.severity || 'Mild'}
                                        onChange={(e) => {
                                          const updatedList = [...formData.assessment.secondaryDiagnoses!];
                                          updatedList[idx] = { ...updatedList[idx], severity: e.target.value };
                                          const updated = { ...formData, assessment: { ...formData.assessment, secondaryDiagnoses: updatedList } };
                                          setFormData(updated);
                                          if (!isFirstRender.current) autoSaveDraft(updated);
                                        }}
                                        sx={{ fontSize: '0.72rem', height: 28, minWidth: 95, '& .MuiSelect-select': { py: 0.5 } }}
                                      >
                                        <MenuItem value="Mild">Mild</MenuItem>
                                        <MenuItem value="Moderate">Moderate</MenuItem>
                                        <MenuItem value="Severe">Severe</MenuItem>
                                      </Select>
                                      <Tooltip title="Remove">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => {
                                            const updatedList = formData.assessment.secondaryDiagnoses!.filter((_: any, i: number) => i !== idx);
                                            const updated = { ...formData, assessment: { ...formData.assessment, secondaryDiagnoses: updatedList } };
                                            setFormData(updated);
                                            if (!isFirstRender.current) autoSaveDraft(updated);
                                          }}
                                          sx={{ p: 0.5 }}
                                        >
                                          <CloseIcon sx={{ fontSize: '0.85rem' }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          )}

                          {/* Add secondary diagnosis search */}
                          {mode !== 'view' && (
                            <Autocomplete
                              fullWidth
                              freeSolo={false}
                              options={secondarySearchQuery.trim() ? secondarySearchResults : []}
                              getOptionLabel={(option: any) => option.diagnosis || ''}
                              isOptionEqualToValue={(option: any, value: any) => option.diagnosis === value.diagnosis}
                              value={null}
                              inputValue={secondarySearchQuery}
                              onChange={(_event: any, newValue: any) => {
                                if (!newValue) return;
                                const alreadyAdded = formData.assessment.secondaryDiagnoses?.some(
                                  (dx: any) => dx.diagnosis === newValue.diagnosis
                                );
                                if (alreadyAdded) {
                                  toast.info('This diagnosis is already added');
                                  return;
                                }
                                const isPrimary = formData.assessment.primaryDiagnosis === newValue.diagnosis;
                                if (isPrimary) {
                                  toast.info('This diagnosis is already set as primary');
                                  return;
                                }
                                const newDx = {
                                  diagnosis: newValue.diagnosis || '',
                                  icd11Code: newValue.icd11 || newValue.icd_11 || '',
                                  icd11Description: newValue.diagnosis || '',
                                  icd11Chapter: newValue.icd11Chapter || newValue.chapter || '',
                                  icd11Block: newValue.icd11Block || newValue.block || '',
                                  severity: 'Mild',
                                  notes: '',
                                  dateRecorded: new Date().toISOString()
                                };
                                const updated = {
                                  ...formData,
                                  assessment: {
                                    ...formData.assessment,
                                    secondaryDiagnoses: [...(formData.assessment.secondaryDiagnoses || []), newDx]
                                  }
                                };
                                setFormData(updated);
                                if (!isFirstRender.current) autoSaveDraft(updated);
                                setSecondarySearchQuery('');
                                setSecondarySearchResults([]);
                              }}
                              onInputChange={(_event: any, value: string) => {
                                setSecondarySearchQuery(value);
                                if (value.trim()) {
                                  setSecondaryIsSearching(true);
                                  debouncedSecondarySearch(value);
                                } else {
                                  setSecondarySearchResults([]);
                                  setSecondaryIsSearching(false);
                                }
                              }}
                              loading={secondaryIsSearching}
                              filterOptions={(options: any[]) => options}
                              noOptionsText={secondarySearchQuery.trim() ? 'No diagnoses found — try different keywords' : 'Type to search and add a diagnosis...'}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Add Secondary Diagnosis"
                                  placeholder="Search to add comorbidities or complications..."
                                  helperText={
                                    secondarySearchQuery.trim() && !secondaryIsSearching
                                      ? `${secondarySearchResults.length} result${secondarySearchResults.length !== 1 ? 's' : ''} — click to add`
                                      : 'Type to search and add multiple diagnoses'
                                  }
                                  InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <AddIcon color="action" sx={{ fontSize: '1rem' }} />
                                      </InputAdornment>
                                    ),
                                    endAdornment: (
                                      <>
                                        {secondaryIsSearching ? <CircularProgress color="inherit" size={18} /> : null}
                                        {params.InputProps.endAdornment}
                                      </>
                                    ),
                                  }}
                                />
                              )}
                              renderOption={(props: any, option: any) => {
                                const { key, ...otherProps } = props;
                                const isAlreadyAdded = formData.assessment.secondaryDiagnoses?.some((dx: any) => dx.diagnosis === option.diagnosis);
                                return (
                                  <Box
                                    component="li"
                                    key={`s-${option.nhdd}-${option.diagnosis}`}
                                    {...otherProps}
                                    sx={{ py: 1, opacity: isAlreadyAdded ? 0.5 : 1 }}
                                  >
                                    <Box sx={{ width: '100%' }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{option.diagnosis}</Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
                                          {isAlreadyAdded && <Chip label="Added" size="small" color="success" variant="filled" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                          {option.source === 'WHO-API' && <Chip label="WHO" size="small" color="warning" variant="filled" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                          {option.source === 'local' && <Chip label="Local DB" size="small" color="info" variant="filled" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                        </Box>
                                      </Box>
                                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {option.icd11 && <Chip label={`ICD-11: ${option.icd11}`} size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                        {option.icd10 && <Chip label={`ICD-10: ${option.icd10}`} size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                        {option.category && <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>{option.category}</Typography>}
                                      </Box>
                                    </Box>
                                  </Box>
                                );
                              }}
                            />
                          )}

                          {mode === 'view' && (formData.assessment.secondaryDiagnoses?.length ?? 0) === 0 && (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">No secondary diagnoses recorded</Typography>
                          )}
                        </Paper>
                      </Grid>

                      {/* CLINICAL REASONING */}
                      <Grid size={12} sx={{ width: '100%' }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Clinical Reasoning"
                            placeholder="Document your clinical reasoning and assessment findings..."
                            value={(formData.assessment as any).clinicalReasoning || ''}
                            onChange={(e) => {
                              const updated = {
                                ...formData,
                                assessment: { ...formData.assessment, clinicalReasoning: e.target.value }
                              };
                              setFormData(updated);
                              if (!isFirstRender.current) {
                                autoSaveDraft(updated);
                                memorySystem.updateData();
                              }
                            }}
                            disabled={mode === 'view'}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        </Grid>

                      {/* TREATMENT PLAN */}
                      <Grid size={12} sx={{ width: '100%' }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Treatment Plan (ESV-ICD-11 Supported)"
                            placeholder="Describe the treatment plan, medications, and recommendations..."
                            value={formData.assessment.plan}
                            onChange={(e) => {
                              const updated = {
                                ...formData,
                                assessment: { ...formData.assessment, plan: e.target.value }
                              };
                              setFormData(updated);
                              if (!isFirstRender.current) {
                                autoSaveDraft(updated);
                                memorySystem.updateData();
                              }
                            }}
                            disabled={mode === 'view'}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        </Grid>

                      {/* FOLLOW UP */}
                      <Grid size={12} sx={{ width: '100%' }}>
                          <TextField
                            fullWidth
                            label="Follow-up Instructions"
                            placeholder="Follow-up care instructions and timing..."
                            value={formData.assessment.followUp}
                            onChange={(e) => {
                              const updated = {
                                ...formData,
                                assessment: { ...formData.assessment, followUp: e.target.value }
                              };
                              setFormData(updated);
                              if (!isFirstRender.current) {
                                autoSaveDraft(updated);
                                memorySystem.updateData();
                              }
                            }}
                            disabled={mode === 'view'}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        </Grid>
                      </Grid>
            </CardContent>
          </GradientCard>
        );

      case 3:
        return (
          <GradientCard>
            <Box sx={{ px: 2.5, pt: 2, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HealingIcon sx={{ fontSize: '1.25rem', color: 'info.main' }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>Care Coordination</Typography>
                <Typography variant="body2" color="text.secondary">Referrals and coordination of care</Typography>
              </Box>
            </Box>
            <CardContent>
                      <Typography variant="body1" paragraph>
                        Configure referrals, specialist consultations, and care coordination.
                      </Typography>
                      <Box display="flex" gap={2} flexWrap="wrap">
                        <Button 
                          variant="outlined" 
                          startIcon={<MedicationIcon />}
                          onClick={() => onCreatePrescription && onCreatePrescription(patientData)}
                          disabled={!onCreatePrescription || mode === 'view'}
                        >
                          Prescriptions
                        </Button>
                        <Button 
                          variant="outlined" 
                          startIcon={<LabIcon />}
                          onClick={() => onOrderLabTest && onOrderLabTest(patientData)}
                          disabled={!onOrderLabTest || mode === 'view'}
                        >
                          Lab Orders
                        </Button>
                        <Button 
                          variant="outlined" 
                          startIcon={<ImagingIcon />}
                          onClick={() => onRequestImaging && onRequestImaging(patientData)}
                          disabled={!onRequestImaging || mode === 'view'}
                        >
                          Imaging
                        </Button>
                        <Button 
                          variant="outlined" 
                          startIcon={<ScheduleIcon />}
                          disabled={mode === 'view'}
                        >
                          Follow-up
                        </Button>
                        <Button 
                          variant={ipdShowPanel ? 'contained' : 'outlined'}
                          startIcon={<HospitalIcon />}
                          onClick={async () => {
                            if (!ipdShowPanel) {
                              setIpdLoading(true);
                              try {
                                const list = await ipdService.getAdmissions('active');
                                const pid = (patientData as any)?._id || (patientData as any)?.id;
                                const adm = list.find((a: any) => (a.patientId?._id || a.patientId)?.toString() === pid?.toString());
                                setIpdAdmission(adm || null);
                              } catch (e) {
                                setIpdAdmission(null);
                              } finally {
                                setIpdLoading(false);
                              }
                            }
                            setIpdShowPanel(!ipdShowPanel);
                          }}
                          disabled={mode === 'view'}
                        >
                          IPD
                        </Button>
                      </Box>
                      {/* IPD panel: if this patient needs IPD it will be here */}
                      <Collapse in={ipdShowPanel}>
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <HospitalIcon fontSize="small" /> In Patient (IPD) — ward, medications, vitals & billing
                          </Typography>
                          {ipdLoading ? (
                            <Box display="flex" alignItems="center" gap={1}><CircularProgress size={18} /> Loading...</Box>
                          ) : !ipdAdmission ? (
                            <>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                Patient is not admitted. Admit to ward to assign bed and enable ward tasks and billing.
                              </Typography>
                              <Button size="small" variant="contained" startIcon={<PersonAddIcon />} onClick={() => setIpdDialog('admit')} disabled={mode === 'view'}>
                                Admit to Ward
                              </Button>
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ mb: 1.5 }}>
                                <strong>{ipdAdmission.patientName}</strong> · {ipdAdmission.wardName} · Room {ipdAdmission.roomNumber} · Bed {ipdAdmission.bedNumber}
                                {' · Admitted '}{ipdAdmission.admitDate ? new Date(ipdAdmission.admitDate).toLocaleDateString() : ''}
                              </Typography>
                              <Box display="flex" gap={1} flexWrap="wrap">
                                <Button size="small" variant="outlined" startIcon={<HeartIcon />} onClick={async () => {
                                  try {
                                    await ipdService.orderVitals(ipdAdmission._id);
                                    toast.success('Vitals order sent to nurse');
                                  } catch (e: any) {
                                    toast.error(e.response?.data?.message || 'Failed to order vitals');
                                  }
                                }} disabled={mode === 'view'}>Order Vitals</Button>
                                <Button size="small" variant="outlined" startIcon={<AssignmentIcon />} onClick={() => { setIpdBedChargeForm({ days: 1, unitPrice: '', description: '' }); setIpdDialog('bed'); }} disabled={mode === 'view'}>Bed Charge</Button>
                                <Button size="small" variant="outlined" color="error" startIcon={<RemoveIcon />} onClick={() => { setIpdDischargeNotes(''); setIpdDialog('discharge'); }} disabled={mode === 'view'}>Discharge</Button>
                              </Box>
                            </>
                          )}
                        </Box>
                      </Collapse>
                      {/* IPD Admit dialog */}
                      <Dialog open={ipdDialog === 'admit'} onClose={() => setIpdDialog(null)} maxWidth="xs" fullWidth>
                        <DialogTitle>Admit to Ward (IPD)</DialogTitle>
                        <DialogContent>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <TextField label="Ward" value={ipdAdmitForm.wardName} onChange={(e) => setIpdAdmitForm(f => ({ ...f, wardName: e.target.value }))} size="small" fullWidth />
                            <TextField label="Room number" value={ipdAdmitForm.roomNumber} onChange={(e) => setIpdAdmitForm(f => ({ ...f, roomNumber: e.target.value }))} size="small" fullWidth placeholder="e.g. 101" />
                            <TextField label="Bed number" value={ipdAdmitForm.bedNumber} onChange={(e) => setIpdAdmitForm(f => ({ ...f, bedNumber: e.target.value }))} size="small" fullWidth placeholder="e.g. 1" />
                            <TextField label="Notes (optional)" value={ipdAdmitForm.notes} onChange={(e) => setIpdAdmitForm(f => ({ ...f, notes: e.target.value }))} size="small" fullWidth multiline rows={2} />
                          </Box>
                        </DialogContent>
                        <DialogActions>
                          <Button onClick={() => setIpdDialog(null)}>Cancel</Button>
                          <Button variant="contained" disabled={ipdSubmitting || !ipdAdmitForm.roomNumber.trim() || !ipdAdmitForm.bedNumber.trim()} onClick={async () => {
                            const pid = (patientData as any)?._id || (patientData as any)?.id;
                            if (!pid) { toast.error('Patient not found'); return; }
                            setIpdSubmitting(true);
                            try {
                              await ipdService.admitPatient({ patientId: pid, wardName: ipdAdmitForm.wardName, roomNumber: ipdAdmitForm.roomNumber.trim(), bedNumber: ipdAdmitForm.bedNumber.trim(), admissionNotes: ipdAdmitForm.notes || undefined });
                              toast.success('Patient admitted to IPD');
                              setIpdDialog(null);
                              setIpdAdmitForm({ wardName: 'General Ward', roomNumber: '', bedNumber: '', notes: '' });
                              const list = await ipdService.getAdmissions('active');
                              const adm = list.find((a: any) => (a.patientId?._id || a.patientId)?.toString() === pid?.toString());
                              setIpdAdmission(adm || null);
                            } catch (e: any) {
                              toast.error(e.response?.data?.message || 'Failed to admit');
                            } finally {
                              setIpdSubmitting(false);
                            }
                          }}>{ipdSubmitting ? 'Saving...' : 'Admit'}</Button>
                        </DialogActions>
                      </Dialog>
                      {/* IPD Bed charge dialog */}
                      <Dialog open={ipdDialog === 'bed'} onClose={() => setIpdDialog(null)} maxWidth="xs" fullWidth>
                        <DialogTitle>Add bed charge</DialogTitle>
                        <DialogContent>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <TextField type="number" label="Days" value={ipdBedChargeForm.days} onChange={(e) => setIpdBedChargeForm(f => ({ ...f, days: Math.max(1, parseInt(e.target.value, 10) || 1) }))} size="small" fullWidth inputProps={{ min: 1 }} />
                            <TextField type="number" label="Price per day" value={ipdBedChargeForm.unitPrice} onChange={(e) => setIpdBedChargeForm(f => ({ ...f, unitPrice: e.target.value }))} size="small" fullWidth placeholder="0.00" inputProps={{ min: 0, step: 0.01 }} />
                            <TextField label="Description (optional)" value={ipdBedChargeForm.description} onChange={(e) => setIpdBedChargeForm(f => ({ ...f, description: e.target.value }))} size="small" fullWidth />
                          </Box>
                        </DialogContent>
                        <DialogActions>
                          <Button onClick={() => setIpdDialog(null)}>Cancel</Button>
                          <Button variant="contained" disabled={ipdSubmitting || !(parseFloat(ipdBedChargeForm.unitPrice) > 0)} onClick={async () => {
                            if (!ipdAdmission) return;
                            const price = parseFloat(ipdBedChargeForm.unitPrice);
                            if (!(price > 0)) return;
                            setIpdSubmitting(true);
                            try {
                              await ipdService.addBedCharge(ipdAdmission._id, ipdBedChargeForm.days, price, ipdBedChargeForm.description || undefined);
                              toast.success('Bed charge added');
                              setIpdDialog(null);
                              setIpdBedChargeForm({ days: 1, unitPrice: '', description: '' });
                            } catch (e: any) {
                              toast.error(e.response?.data?.message || 'Failed');
                            } finally {
                              setIpdSubmitting(false);
                            }
                          }}>{ipdSubmitting ? 'Adding...' : 'Add charge'}</Button>
                        </DialogActions>
                      </Dialog>
                      {/* IPD Discharge dialog */}
                      <Dialog open={ipdDialog === 'discharge'} onClose={() => setIpdDialog(null)} maxWidth="xs" fullWidth>
                        <DialogTitle>Discharge patient</DialogTitle>
                        <DialogContent>
                          <TextField label="Discharge notes (optional)" value={ipdDischargeNotes} onChange={(e) => setIpdDischargeNotes(e.target.value)} size="small" fullWidth multiline rows={3} sx={{ mt: 1 }} />
                        </DialogContent>
                        <DialogActions>
                          <Button onClick={() => setIpdDialog(null)}>Cancel</Button>
                          <Button variant="contained" color="error" disabled={ipdSubmitting} onClick={async () => {
                            if (!ipdAdmission) return;
                            setIpdSubmitting(true);
                            try {
                              await ipdService.dischargeAdmission(ipdAdmission._id, ipdDischargeNotes);
                              toast.success('Patient discharged');
                              setIpdDialog(null);
                              setIpdAdmission(null);
                            } catch (e: any) {
                              toast.error(e.response?.data?.message || 'Failed');
                            } finally {
                              setIpdSubmitting(false);
                            }
                          }}>{ipdSubmitting ? 'Discharging...' : 'Discharge'}</Button>
                        </DialogActions>
                      </Dialog>
            </CardContent>
          </GradientCard>
        );

      case 4:
        return (
          <GradientCard>
            <Box sx={{ px: 2.5, pt: 2, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HealthIcon sx={{ fontSize: '1.25rem', color: 'warning.main' }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>Quality & Compliance</Typography>
                <Typography variant="body2" color="text.secondary">Review and finalize the medical record</Typography>
              </Box>
            </Box>
            <CardContent>
              <Box mb={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight={600}>Quality Score</Typography>
                  <Typography variant="body2" fontWeight={700} color={qualityScore >= 80 ? 'success.main' : qualityScore >= 60 ? 'warning.main' : 'error.main'}>
                    {Math.round(qualityScore)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={qualityScore}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      bgcolor: qualityScore >= 80 ? 'success.main' : qualityScore >= 60 ? 'warning.main' : 'error.main',
                    },
                  }}
                />
              </Box>
              
              <Box display="flex" flexDirection="column" gap={1.5}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.qualityChecks.documentationComplete}
                              onChange={(e) => {
                                console.log('📝 [QUALITY] Documentation complete toggle:', e.target.checked);
                                setIsEditingQualityChecks(true);
                                const updated = {
                                  ...formData,
                                  qualityChecks: {
                                    ...formData.qualityChecks,
                                    documentationComplete: e.target.checked
                                  }
                                };
                                console.log('📝 [QUALITY] Updated formData:', updated.qualityChecks);
                                setFormData(updated);
                                if (!isFirstRender.current) autoSaveDraft(updated);
                                // Reset flag after a short delay
                                setTimeout(() => setIsEditingQualityChecks(false), 1000);
                              }}
                            />
                          }
                          label="Documentation is complete and accurate"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.qualityChecks.reviewedAndApproved}
                              onChange={(e) => {
                                console.log('✅ [QUALITY] Reviewed and approved toggle:', e.target.checked);
                                setIsEditingQualityChecks(true);
                                const updated = {
                                  ...formData,
                                  qualityChecks: {
                                    ...formData.qualityChecks,
                                    reviewedAndApproved: e.target.checked
                                  }
                                };
                                console.log('✅ [QUALITY] Updated formData:', updated.qualityChecks);
                                setFormData(updated);
                                if (!isFirstRender.current) autoSaveDraft(updated);
                                // Reset flag after a short delay
                                setTimeout(() => setIsEditingQualityChecks(false), 1000);
                              }}
                            />
                          }
                          label="Reviewed and approved for finalization"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.qualityChecks.peerReviewed}
                              onChange={(e) => {
                                console.log('👥 [QUALITY] Peer reviewed toggle:', e.target.checked);
                                setIsEditingQualityChecks(true);
                                const updated = {
                                  ...formData,
                                  qualityChecks: {
                                    ...formData.qualityChecks,
                                    peerReviewed: e.target.checked
                                  }
                                };
                                console.log('👥 [QUALITY] Updated formData:', updated.qualityChecks);
                                setFormData(updated);
                                if (!isFirstRender.current) autoSaveDraft(updated);
                                // Reset flag after a short delay
                                setTimeout(() => setIsEditingQualityChecks(false), 1000);
                              }}
                            />
                          }
                          label="Peer reviewed (if required)"
                        />
                      </Box>
            </CardContent>
          </GradientCard>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {mode === 'view' && (
        <style>
          {`
            .view-mode-form .MuiChip-root {
              color: #000000 !important;
              background-color: #f5f5f5 !important;
              border-color: #1976d2 !important;
            }
            .view-mode-form .MuiChip-root .MuiChip-label {
              color: #000000 !important;
              opacity: 1 !important;
            }
            .view-mode-form .MuiInputBase-input {
              color: #000000 !important;
              opacity: 1 !important;
            }
            .view-mode-form .MuiAutocomplete-root .MuiChip-root {
              color: #000000 !important;
              background-color: #f5f5f5 !important;
              border-color: #1976d2 !important;
            }
            .view-mode-form .MuiAutocomplete-root .MuiChip-root .MuiChip-label {
              color: #000000 !important;
              opacity: 1 !important;
            }
            .view-mode-form .MuiAutocomplete-root .MuiInputBase-input {
              color: #000000 !important;
              opacity: 1 !important;
            }
          `}
        </style>
      )}
      <Box
        className={mode === 'view' ? 'view-mode-form' : ''}
        sx={{
          minHeight: '100vh',
          background: '#f8f9fa',
          ...viewModeStyles,
        }}
      >
        <Box sx={{ p: { xs: 1, sm: 2.5 } }}>
          {/* Patient Header */}
          {renderPatientHeader()}

          {/* Mobile: horizontal scrollable step tabs */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, overflowX: 'auto', mb: 2, gap: 0, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              return (
                <Box
                  key={step.label}
                  onClick={() => handleStepClick(index)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    flexShrink: 0,
                    borderBottom: isActive ? '3px solid' : '3px solid transparent',
                    borderBottomColor: isActive ? 'primary.main' : 'transparent',
                    bgcolor: isActive ? 'primary.50' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <Typography variant="caption" fontWeight={isActive ? 700 : 500} sx={{ fontSize: '0.75rem', color: isActive ? 'primary.main' : 'text.secondary', whiteSpace: 'nowrap' }}>
                    {index + 1}. {step.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Desktop: Two Column Layout: Sidebar + Content */}
          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
            {/* Sidebar — desktop only */}
            <Box sx={{ width: 240, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
              {renderSidebar()}
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ mb: 2 }}>
                {renderStepContent()}
              </Box>
            </Box>
          </Box>

          {/* Navigation */}
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              sx={{ textTransform: 'none', fontSize: '0.9rem' }}
            >
              Previous
            </Button>

                {mode !== 'view' && (
                <Box display="flex" gap={1.5} alignItems="center">
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={() => {
                      console.log('Save Draft button clicked');
                      handleSave(false);
                    }}
                    disabled={saving}
                    sx={{ textTransform: 'none', fontSize: '0.9rem' }}
                  >
                    {saving ? 'Saving…' : 'Save Draft'}
                  </Button>

                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      endIcon={<CheckCircleIcon />}
                      onClick={() => {
                        console.log('Finalize Record button clicked');
                        handleSave(true);
                      }}
                      disabled={saving || isFinalized || !formData.qualityChecks.reviewedAndApproved || (currentRecordId && formData.qualityChecks.reviewedAndApproved && (mode as any) === 'view')}
                      color="success"
                      sx={{ textTransform: 'none', fontSize: '0.9rem' }}
                    >
                      {isFinalized ? 'Finalized' : 'Finalize Record'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      onClick={handleNext}
                      sx={{ textTransform: 'none', fontSize: '0.9rem' }}
                    >
                      Next
                    </Button>
                  )}
                </Box>
                )}
          </Box>
        </Box>

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="Medical Record Actions"
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<AIIcon />}
          tooltipTitle="AI Suggestions"
          onClick={() => {
            setAiAssistantOpen(true);
            generateAISuggestions();
          }}
        />
        <SpeedDialAction
          icon={<HistoryIcon />}
          tooltipTitle="Patient History"
          onClick={() => {
            console.log('History button clicked');
            console.log('Current historyDialogOpen state:', historyDialogOpen);
            setHistoryDialogOpen(true);
            console.log('Set historyDialogOpen to true');
          }}
        />
        <SpeedDialAction
          icon={<PrintIcon />}
          tooltipTitle="Print Record"
        />
        <SpeedDialAction
          icon={<ShareIcon />}
          tooltipTitle="Share Record"
        />
      </SpeedDial>

      {/* Enhanced Patient History — rendered via portal directly into document.body */}
      {historyDialogOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setHistoryDialogOpen(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{
            width: '100%', maxWidth: '1100px',
            height: '90vh',
            backgroundColor: '#fff',
            borderRadius: '12px',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          }}>
        {/* Gradient Header */}
        <Box sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          px: 3, py: 2,
          display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0
        }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HistoryIcon sx={{ color: 'white', fontSize: '1.4rem' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
              Patient Medical History
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              {patientData.firstName} {patientData.lastName} · {patientHistory.length} visit{patientHistory.length !== 1 ? 's' : ''} on record
            </Typography>
          </Box>
          <Chip
            label={`${patientHistory.length} Records`}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, border: '1px solid rgba(255,255,255,0.4)' }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: 'white' }, textTransform: 'none', fontSize: '0.78rem' }}
          >
            Print History
          </Button>
          <IconButton onClick={() => setHistoryDialogOpen(false)} sx={{ color: 'white', ml: 0.5 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Scrollable content — flex:1 with overflow:auto, no height constraints that fight flex */}
        <div style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0%', overflowY: 'auto', padding: '20px', backgroundColor: '#f5f7fa' }}>
          {patientHistory.length > 0 ? (
            <>
              {patientHistory.map((record: any, index: number) => (
                <Box
                  key={record._id}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }
                  }}
                >
                  {/* Visit Header Bar */}
                  <Box sx={{
                    px: 2.5, py: 1.5,
                    background: record.status === 'Finalized'
                      ? 'linear-gradient(90deg, #e8f5e9 0%, #f1f8e9 100%)'
                      : 'linear-gradient(90deg, #fff8e1 0%, #fffde7 100%)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap'
                  }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: 1.5,
                      bgcolor: record.status === 'Finalized' ? 'success.main' : 'warning.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <MedicalIcon sx={{ color: 'white', fontSize: '1.1rem' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'text.primary' }}>
                          Visit — {new Date(record.visitDate || record.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </Typography>
                        <Chip
                          label={record.status}
                          size="small"
                          color={record.status === 'Finalized' ? 'success' : 'warning'}
                          sx={{ fontWeight: 600, fontSize: '0.72rem', height: 22 }}
                        />
                        {index === 0 && (
                          <Chip label="Latest" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(record.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {(record.doctor?.firstName || record.doctor?.lastName) && ` · Dr. ${record.doctor?.firstName || ''} ${record.doctor?.lastName || ''}`.trim()}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon sx={{ fontSize: '0.85rem' }} />}
                      onClick={() => {
                        // Load this record's chief complaint and HPI into the current form
                        const cc = record.chiefComplaint?.description || record.chiefComplaint || '';
                        const hpi = record.historyOfPresentIllness || '';
                        if (cc || hpi) {
                          setFormData(prev => ({
                            ...prev,
                            chiefComplaint: { ...prev.chiefComplaint, description: cc || prev.chiefComplaint.description },
                            historyOfPresentIllness: hpi || (prev as any).historyOfPresentIllness
                          } as any));
                          toast.success('Loaded into current record', { position: 'top-right', autoClose: 2000 });
                          setHistoryDialogOpen(false);
                        }
                      }}
                      sx={{ textTransform: 'none', fontSize: '0.72rem', flexShrink: 0 }}
                    >
                      Load into Form
                    </Button>
                  </Box>

                  {/* Content — single column so everything is always visible */}
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Chief Complaint + HPI + Diagnosis + Treatment */}
                      {/* Chief Complaint Card */}
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0f7ff', border: '1px solid #bbdefb' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                          <AssignmentIcon sx={{ fontSize: '0.95rem', color: '#1976d2' }} />
                          <Typography variant="caption" fontWeight={700} sx={{ color: '#1565c0', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                            Chief Complaint
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, color: 'text.primary' }}>
                          {record.chiefComplaint?.description || record.chiefComplaint || 'Not specified'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                          {record.chiefComplaint?.severity && (
                            <Chip label={`Severity: ${record.chiefComplaint.severity}`} size="small"
                              sx={{ fontSize: '0.68rem', height: 20,
                                bgcolor: record.chiefComplaint.severity === 'Severe' ? '#ffebee' : record.chiefComplaint.severity === 'Moderate' ? '#fff3e0' : '#e8f5e9',
                                color: record.chiefComplaint.severity === 'Severe' ? '#c62828' : record.chiefComplaint.severity === 'Moderate' ? '#e65100' : '#2e7d32'
                              }} />
                          )}
                          {record.chiefComplaint?.duration && (
                            <Chip label={`Duration: ${record.chiefComplaint.duration}`} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#f3e5f5', color: '#6a1b9a' }} />
                          )}
                          {record.chiefComplaint?.location && (
                            <Chip label={`Location: ${record.chiefComplaint.location}`} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#e0f2f1', color: '#00695c' }} />
                          )}
                        </Box>
                        {record.historyOfPresentIllness && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #bbdefb' }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#1565c0', display: 'block', mb: 0.25 }}>HPI</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5, fontSize: '0.8rem' }}>
                              {record.historyOfPresentIllness}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Diagnosis Card */}
                      {(record.diagnosis || record.assessment?.primaryDiagnosis || (record.diagnoses && record.diagnoses.length > 0)) && (
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fce4ec', border: '1px solid #f48fb1' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                            <AssessmentIcon sx={{ fontSize: '0.95rem', color: '#c2185b' }} />
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#880e4f', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                              Diagnosis
                            </Typography>
                          </Box>
                          {(record.diagnosis || record.assessment?.primaryDiagnosis) && (
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#880e4f', mb: 0.5 }}>
                              {record.diagnosis || record.assessment?.primaryDiagnosis}
                            </Typography>
                          )}
                          {record.diagnoses && record.diagnoses.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {record.diagnoses.map((d: any, i: number) => (
                                <Chip key={i} label={d.description || d} size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: '#f8bbd0', color: '#880e4f' }} />
                              ))}
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Treatment Plan */}
                      {(record.plan || record.treatmentPlan || record.assessment?.plan) && (
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                            <HealingIcon sx={{ fontSize: '0.95rem', color: '#2e7d32' }} />
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#1b5e20', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                              Treatment Plan
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: '#1b5e20', lineHeight: 1.5, fontSize: '0.8rem' }}>
                            {record.plan || record.treatmentPlan || record.assessment?.plan}
                          </Typography>
                        </Box>
                      )}
                    {/* Vitals + Physical Exam + Medications + Lab Results + Follow-up */}
                      {/* Vital Signs - Modern Grid */}
                      {(() => {
                        const vsPrimary = (record as any).vitalSigns || {};
                        const vsSecondary = (record as any).physicalExamination?.vitals || {};
                        const vsFallback = latestNurseVitals ? {
                          bloodPressure: (latestNurseVitals.systolic != null && latestNurseVitals.diastolic != null) ? `${latestNurseVitals.systolic}/${latestNurseVitals.diastolic}` : latestNurseVitals.bloodPressure,
                          heartRate: latestNurseVitals.pulse, temperature: latestNurseVitals.temperature,
                          respiratoryRate: latestNurseVitals.respiratoryRate, oxygenSaturation: latestNurseVitals.spo2,
                          height: latestNurseVitals.height, weight: latestNurseVitals.weight, bmi: latestNurseVitals.bmi,
                          bloodSugar: latestNurseVitals.bloodSugar, pain: latestNurseVitals.pain,
                        } : {};
                        const normalize = (val: any) => (val === undefined || val === null || val === '' ? null : val);
                        const getFromSources = (aliases: string[]) => {
                          for (const a of aliases) { const v = (vsPrimary as any)[a] ?? null; if (v !== null && v !== undefined && v !== '') return v; }
                          for (const a of aliases) { const v = (vsSecondary as any)[a] ?? null; if (v !== null && v !== undefined && v !== '') return v; }
                          for (const a of aliases) { const v = (vsFallback as any)[a] ?? null; if (v !== null && v !== undefined && v !== '') return v; }
                          return null;
                        };
                        const bpField = getFromSources(['bloodPressure','bp']);
                        const systolic = normalize(getFromSources(['systolic','bloodPressureSystolic']));
                        const diastolic = normalize(getFromSources(['diastolic','bloodPressureDiastolic']));
                        const bpRaw = (typeof bpField === 'string' && bpField.trim()) ? bpField : (systolic != null && diastolic != null ? `${systolic}/${diastolic}` : '');
                        const bp = normalize(bpRaw);
                        const temp = normalize(getFromSources(['temperature','temp']));
                        const hr = normalize(getFromSources(['heartRate','pulse','hr']));
                        const rr = normalize(getFromSources(['respiratoryRate','rr']));
                        const spo2 = normalize(getFromSources(['oxygenSaturation','spO2','spo2']));
                        const sugar = normalize(getFromSources(['bloodSugar','bloodGlucose','glucose']));
                        const pain = normalize(getFromSources(['pain']));
                        const height = normalize(getFromSources(['height']));
                        const weight = normalize(getFromSources(['weight']));
                        const bmi = normalize(getFromSources(['bmi']));
                        const hasAny = bp || temp || hr || rr || spo2 || sugar || pain || height || weight || bmi;
                        if (!hasAny) return null;

                        const vitalItems = [
                          { label: 'Blood Pressure', value: bp, unit: 'mmHg', icon: '🩸', color: '#e53935', bg: '#ffebee',
                            alert: bp && typeof bp === 'string' && (() => { const [s,d] = bp.split('/').map(Number); return s > 140 || d > 90; })() },
                          { label: 'Temperature', value: temp, unit: '°F', icon: '🌡️', color: '#f57c00', bg: '#fff3e0',
                            alert: temp && Number(temp) > 38.5 },
                          { label: 'Heart Rate', value: hr, unit: 'bpm', icon: '❤️', color: '#e91e63', bg: '#fce4ec',
                            alert: hr && (Number(hr) > 100 || Number(hr) < 60) },
                          { label: 'Resp. Rate', value: rr, unit: '/min', icon: '🫁', color: '#1976d2', bg: '#e3f2fd',
                            alert: rr && Number(rr) > 20 },
                          { label: 'O₂ Saturation', value: spo2, unit: '%', icon: '💨', color: '#0097a7', bg: '#e0f7fa',
                            alert: spo2 && Number(spo2) < 95 },
                          { label: 'Blood Sugar', value: sugar, unit: '', icon: '🩸', color: '#7b1fa2', bg: '#f3e5f5', alert: false },
                          { label: 'Height', value: height, unit: 'cm', icon: '📏', color: '#388e3c', bg: '#e8f5e9', alert: false },
                          { label: 'Weight', value: weight, unit: 'kg', icon: '⚖️', color: '#5d4037', bg: '#efebe9', alert: false },
                          { label: 'BMI', value: bmi, unit: '', icon: '📊', color: '#455a64', bg: '#eceff1',
                            alert: bmi && (Number(bmi) > 30 || Number(bmi) < 18.5) },
                          { label: 'Pain Score', value: pain, unit: '/10', icon: '😣', color: '#d32f2f', bg: '#ffebee',
                            alert: pain && Number(pain) >= 7 },
                        ].filter(v => v.value != null);

                        return (
                          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                              <Typography sx={{ fontSize: '0.95rem' }}>🩺</Typography>
                              <Typography variant="caption" fontWeight={700} sx={{ color: '#37474f', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                                Vital Signs
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 0.75 }}>
                              {vitalItems.map((v, i) => (
                                <Box key={i} sx={{
                                  p: 1, borderRadius: 1.5, bgcolor: v.bg,
                                  border: `1px solid ${v.alert ? v.color : 'transparent'}`,
                                  position: 'relative'
                                }}>
                                  {v.alert && (
                                    <Box sx={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', bgcolor: v.color }} />
                                  )}
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.65rem', lineHeight: 1.2, mb: 0.25 }}>
                                    {v.icon} {v.label}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={700} sx={{ color: v.color, fontSize: '0.85rem', lineHeight: 1 }}>
                                    {v.value}{v.unit && <span style={{ fontWeight: 400, fontSize: '0.7rem', color: '#78909c' }}> {v.unit}</span>}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        );
                      })()}

                      {/* Physical Examination - Compact Colored Grid */}
                      {record.physicalExamination && (() => {
                        const pe = record.physicalExamination;
                        const heentParts = [
                          pe.heent?.head && `H: ${pe.heent.head}`,
                          pe.heent?.eyes && `E: ${pe.heent.eyes}`,
                          pe.heent?.ears && `Ea: ${pe.heent.ears}`,
                          pe.heent?.nose && `N: ${pe.heent.nose}`,
                          pe.heent?.throat && `T: ${pe.heent.throat}`
                        ].filter(Boolean).join(' · ');
                        const systems = [
                          { key: 'general', label: 'General', value: pe.general, color: '#1976d2', bg: '#e3f2fd' },
                          { key: 'heent', label: 'HEENT', value: heentParts || (typeof pe.heent === 'string' ? pe.heent : ''), color: '#7b1fa2', bg: '#f3e5f5' },
                          { key: 'cardiovascular', label: 'Cardiovascular', value: pe.cardiovascular, color: '#c62828', bg: '#ffebee' },
                          { key: 'respiratory', label: 'Respiratory', value: pe.respiratory, color: '#0277bd', bg: '#e1f5fe' },
                          { key: 'gastrointestinal', label: 'Gastrointestinal', value: pe.gastrointestinal, color: '#e65100', bg: '#fff3e0' },
                          { key: 'neurological', label: 'Neurological', value: pe.neurological, color: '#4527a0', bg: '#ede7f6' },
                          { key: 'musculoskeletal', label: 'Musculoskeletal', value: pe.musculoskeletal, color: '#2e7d32', bg: '#e8f5e9' },
                          { key: 'skin', label: 'Skin', value: pe.skin, color: '#5d4037', bg: '#efebe9' },
                        ].filter(s => s.value);
                        if (systems.length === 0) return null;
                        return (
                          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                              <AssessmentIcon sx={{ fontSize: '0.9rem', color: '#546e7a' }} />
                              <Typography variant="caption" fontWeight={700} sx={{ color: '#37474f', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                                Physical Examination
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 0.75 }}>
                              {systems.map(s => (
                                <Box key={s.key} sx={{ p: 1, borderRadius: 1.5, bgcolor: s.bg, border: `1px solid ${s.color}22` }}>
                                  <Typography variant="caption" fontWeight={700} sx={{ color: s.color, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', mb: 0.25 }}>
                                    {s.label}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.4 }}>
                                    {(s.value as string).length > 80 ? (s.value as string).slice(0, 80) + '…' : s.value}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        );
                      })()}

                      {/* Medications */}
                      {(() => {
                        // Primary: prescriptions populated directly on the record by backend
                        const recordMeds = Array.isArray(record.prescriptions)
                          ? (record.prescriptions as any[]).filter((p: any) => typeof p === 'object' && p !== null && (p.medicationName || p.name))
                          : [];

                        // Secondary: allPrescriptions for this patient
                        // Use ±1 day window to handle timezone edge cases
                        const visitMs = new Date(record.visitDate || record.createdAt).getTime();
                        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                        const nearbyMeds = allPrescriptions.filter((p: any) => {
                          const pd = new Date(p.createdAt || p.datePrescribed || p.date || p.prescribedAt);
                          return Math.abs(pd.getTime() - visitMs) <= ONE_DAY_MS;
                        });

                        // Tertiary fallback: if this is the most recent record (index === 0)
                        // and nothing matched yet, show ALL patient prescriptions
                        const fallbackMeds = (recordMeds.length === 0 && nearbyMeds.length === 0 && index === 0)
                          ? allPrescriptions
                          : [];

                        const flattenPrescriptions = (list: any[]) => list.flatMap((p: any) =>
                          Array.isArray(p?.medications) && p.medications.length > 0
                            ? p.medications.map((mi: any) => ({ ...mi, _fromPrescription: p }))
                            : [p]
                        );

                        const normalizeItem = (m: any) => ({
                          id: (m._id || m.id || `${m.name || m.medicationName}-${m.createdAt}`).toString(),
                          name: m.name || m.medicationName || m.medication || m.drug || 'Medication',
                          dosage: m.dosage || m.dose || '',
                          frequency: m.frequency || m.freq || '',
                          duration: m.duration || m.days || '',
                          route: m.route || '',
                          status: m.status || ''
                        });

                        const merged = [
                          ...recordMeds.map(normalizeItem),
                          ...flattenPrescriptions(nearbyMeds).map(normalizeItem),
                          ...flattenPrescriptions(fallbackMeds).map(normalizeItem)
                        ];
                        const uniqueMap = new Map<string, any>();
                        merged.forEach(m => {
                          const key = `${m.name.toLowerCase()}|${m.dosage}|${m.frequency}`;
                          if (!uniqueMap.has(key)) uniqueMap.set(key, m);
                        });
                        const meds = Array.from(uniqueMap.values());
                        if (meds.length === 0) return null;

                        const statusColor = (s: string) => {
                          const sl = (s || '').toLowerCase();
                          if (sl === 'active') return { bg: '#e8f5e9', color: '#2e7d32' };
                          if (sl === 'completed') return { bg: '#e3f2fd', color: '#1565c0' };
                          if (sl === 'cancelled') return { bg: '#ffebee', color: '#c62828' };
                          return { bg: '#fff8e1', color: '#e65100' }; // pending / default
                        };

                        return (
                          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f3e5f5', border: '1px solid #ce93d8' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                              <MedicationIcon sx={{ fontSize: '0.9rem', color: '#7b1fa2' }} />
                              <Typography variant="caption" fontWeight={700} sx={{ color: '#4a148c', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                                Medications ({meds.length})
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                              {meds.map((m: any, i: number) => {
                                const sc = statusColor(m.status);
                                return (
                                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#7b1fa2', mt: 0.7, flexShrink: 0 }} />
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" sx={{ color: '#4a148c', fontSize: '0.75rem', lineHeight: 1.4 }}>
                                        <strong>{m.name}</strong>
                                        {m.dosage ? ` ${m.dosage}` : ''}
                                        {m.frequency ? ` · ${m.frequency}` : ''}
                                        {m.duration ? ` · ${m.duration}` : ''}
                                        {m.route ? ` · ${m.route}` : ''}
                                      </Typography>
                                      {m.status && (
                                        <Chip label={m.status} size="small" sx={{ height: 16, fontSize: '0.6rem', mt: 0.25, bgcolor: sc.bg, color: sc.color, border: `1px solid ${sc.color}44` }} />
                                      )}
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        );
                      })()}

                      {/* Lab Results */}
                      {(() => {
                        const visitDate = new Date(record.visitDate || record.createdAt);
                        const visitMs = visitDate.getTime();
                        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

                        // Match lab results within ±1 day of visit to handle timezone edge cases
                        const sameDayLabs = allLabResults.filter((lr: any) => {
                          const lrDate = new Date(lr.resultDate || lr.completedAt || lr.orderDate || lr.createdAt);
                          return Math.abs(lrDate.getTime() - visitMs) <= ONE_DAY_MS;
                        });

                        // Also include labs embedded directly in the record
                        const recordLabs: any[] = Array.isArray((record as any).labResults)
                          ? (record as any).labResults
                          : Array.isArray((record as any).labOrders)
                          ? (record as any).labOrders
                          : [];

                        // Merge and deduplicate by test name
                        const allLabs = [...sameDayLabs, ...recordLabs];
                        const seen = new Set<string>();
                        const labs = allLabs.filter((lr: any) => {
                          const key = (lr.testName || lr.test?.name || lr._id || '').toString();
                          if (seen.has(key)) return false;
                          seen.add(key);
                          return true;
                        });

                        if (labs.length === 0) return null;

                        const getStatusColor = (status: string) => {
                          const s = (status || '').toLowerCase();
                          if (s === 'completed' || s === 'finalized') return { color: '#1b5e20', bg: '#e8f5e9', dot: '#2e7d32' };
                          if (s === 'pending') return { color: '#e65100', bg: '#fff3e0', dot: '#f57c00' };
                          return { color: '#1565c0', bg: '#e3f2fd', dot: '#1976d2' };
                        };

                        return (
                          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#e8eaf6', border: '1px solid #9fa8da' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                              <LabIcon sx={{ fontSize: '0.9rem', color: '#283593' }} />
                              <Typography variant="caption" fontWeight={700} sx={{ color: '#1a237e', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                                Lab Results ({labs.length})
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {labs.map((lr: any, i: number) => {
                                const testName = lr.testName || lr.test?.name || lr.name || 'Lab Test';
                                const status = lr.status || 'Completed';
                                const sc = getStatusColor(status);
                                const resultSummary = lr.results || lr.result || lr.value || '';
                                return (
                                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sc.dot, mt: 0.7, flexShrink: 0 }} />
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" sx={{ color: '#1a237e', fontSize: '0.75rem', lineHeight: 1.4 }}>
                                        <strong>{testName}</strong>
                                        {resultSummary ? ` — ${typeof resultSummary === 'object' ? JSON.stringify(resultSummary) : resultSummary}` : ''}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap' }}>
                                        <Chip
                                          label={status}
                                          size="small"
                                          sx={{ height: 16, fontSize: '0.6rem', bgcolor: sc.bg, color: sc.color, border: `1px solid ${sc.dot}44` }}
                                        />
                                        {lr.resultDate || lr.completedAt ? (
                                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', lineHeight: '16px' }}>
                                            {new Date(lr.resultDate || lr.completedAt).toLocaleDateString()}
                                          </Typography>
                                        ) : null}
                                      </Box>
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        );
                      })()}

                      {/* Follow-up */}
                      {record.followUpPlan?.instructions && (
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#e0f7fa', border: '1px solid #80deea' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                            <ScheduleIcon sx={{ fontSize: '0.9rem', color: '#00838f' }} />
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#006064', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                              Follow-up Plan
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: '#004d40', fontSize: '0.8rem', lineHeight: 1.5 }}>
                            {record.followUpPlan.instructions}
                          </Typography>
                        </Box>
                      )}
                  </Box>
                </Box>
              ))}
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HistoryIcon sx={{ fontSize: '2rem', color: '#1976d2' }} />
              </Box>
              <Typography variant="h6" color="text.secondary">No Medical Records Found</Typography>
              <Typography variant="body2" color="text.disabled">This patient has no previous visit records.</Typography>
            </Box>
          )}
        </div>{/* end scrollable content */}
        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#fff', flexShrink: 0, borderRadius: '0 0 12px 12px' }}>
          <button
            onClick={() => setHistoryDialogOpen(false)}
            style={{ padding: '8px 24px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            Close
          </button>
        </div>
        </div>{/* end modal panel */}
        </div>,
        document.body
      )}{/* end portal */}

      {/* AI Assistant Dialog */}
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
            <Alert severity={geminiAvailable ? 'success' : 'info'} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {geminiAvailable ? '✨ Gemini AI Analysis Complete' : '🤖 AI Analysis Complete'}
              </Typography>
              Based on your input: "{typeof formData.chiefComplaint === 'string' ? formData.chiefComplaint : (formData.chiefComplaint as any)?.description || 'No input'}", here are intelligent clinical suggestions:
              {!geminiAvailable && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                  Configure GEMINI_API_KEY in backend .env for AI-powered suggestions.
                </Typography>
              )}
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
                      <strong>Chief Complaint:</strong> {typeof formData.chiefComplaint === 'string' ? formData.chiefComplaint : (formData.chiefComplaint as any)?.description || 'Not specified'}
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

            {/* Gemini AI Results (shown when Gemini has generated HPI) */}
            {geminiAvailable && (geminiDiagnoses.length > 0 || geminiRedFlags.length > 0) && (
              <Box sx={{ mb: 3, p: 2, background: 'linear-gradient(135deg, #f5f0ff 0%, #ede7f6 100%)', borderRadius: 2, border: '1px solid #ce93d8' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: '#6a1b9a', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SparkleIcon sx={{ fontSize: '1rem' }} /> Gemini AI Clinical Insights
                </Typography>
                {geminiDiagnoses.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#7b1fa2', display: 'block', mb: 0.5 }}>Differential Diagnoses</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {geminiDiagnoses.map((d, i) => (
                        <Chip key={i} label={d} size="small" sx={{ bgcolor: '#e1bee7', color: '#4a148c', fontSize: '0.72rem' }} />
                      ))}
                    </Box>
                  </Box>
                )}
                {geminiRedFlags.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#c62828', display: 'block', mb: 0.5 }}>Red Flags to Assess</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {geminiRedFlags.map((f, i) => (
                        <Chip key={i} label={f} size="small" sx={{ bgcolor: '#ffebee', color: '#b71c1c', fontSize: '0.72rem', border: '1px solid #ef9a9a' }} />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* AI Suggestions */}
            {Object.keys(aiSuggestions).length > 0 && (
              <>
                {/* Diagnoses */}
                {aiSuggestions.diagnoses && aiSuggestions.diagnoses.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon color="primary" />
                      Differential Diagnoses
                    </Typography>
                    <Grid container spacing={2}>
                      {aiSuggestions.diagnoses.map((diagnosis: string, index: number) => (
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
                )}

                {/* Medications */}
                {aiSuggestions.medications && aiSuggestions.medications.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MedicationIcon color="primary" />
                      Medication Suggestions
                    </Typography>
                    <Grid container spacing={2}>
                      {aiSuggestions.medications.map((medication: string, index: number) => (
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
                )}

                {/* Lab Tests */}
                {aiSuggestions.labTests && aiSuggestions.labTests.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LabIcon color="primary" />
                      Recommended Lab Tests
                    </Typography>
                    <Grid container spacing={2}>
                      {aiSuggestions.labTests.map((test: string, index: number) => (
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
                )}

                {/* Red Flags */}
                {aiSuggestions.redFlags && aiSuggestions.redFlags.length > 0 && (
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
                        {aiSuggestions.redFlags.map((flag: string, index: number) => (
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
                )}

                {/* Clinical Notes */}
                {aiSuggestions.clinicalNotes && aiSuggestions.clinicalNotes.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon color="primary" />
                      Clinical Notes & Considerations
                    </Typography>
                    <List>
                      {aiSuggestions.clinicalNotes.map((note: string, index: number) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemIcon>
                            <InfoIcon color="info" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={note} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* HPI Writing Suggestions */}
                {aiSuggestions.hpiSuggestions && aiSuggestions.hpiSuggestions.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EditIcon color="primary" />
                      HPI Writing Suggestions
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        📝 Improve Your HPI Documentation
                      </Typography>
                      <List dense>
                        {aiSuggestions.hpiSuggestions.map((suggestion: string, index: number) => (
                          <ListItem key={index} sx={{ py: 0.5 }}>
                            <ListItemIcon>
                              <EditIcon color="info" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={suggestion} />
                          </ListItem>
                        ))}
                      </List>
                    </Alert>
                  </Box>
                )}

                {/* Follow-up */}
                {aiSuggestions.followUp && aiSuggestions.followUp.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon color="success" />
                      Follow-up Recommendations
                    </Typography>
                    <List>
                      {aiSuggestions.followUp.map((item: string, index: number) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Button
                variant="contained"
                startIcon={<AIIcon />}
                onClick={generateAISuggestions}
                color="primary"
              >
                Refresh AI Analysis
              </Button>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => {
                  applyAISuggestions();
                }}
              >
                Apply Suggestions
              </Button>
              <Button
                variant="outlined"
                startIcon={hpiAutoFillLoading ? <CircularProgress size={14} /> : <SparkleIcon />}
                onClick={() => {
                  setAiAssistantOpen(false);
                  autoFillHPI();
                }}
                color="secondary"
                disabled={hpiAutoFillLoading}
              >
                {geminiAvailable ? '✨ AI Fill HPI' : 'Generate HPI Template'}
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
              generateAISuggestions();
            }} 
            variant="contained"
            startIcon={<RefreshIcon />}
          >
            Refresh Analysis
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </>
  );
};

// Wrap the component with ErrorBoundary for better error handling
const ModernMedicalRecordFormWithErrorBoundary = (props: any) => {
  const handleError = (error: Error, errorInfo: any) => {
    console.error('🚨 [ModernMedicalRecordForm] Error caught by boundary:', error);
    console.error('🚨 [ModernMedicalRecordForm] Error info:', errorInfo);
  };

  const handleRetry = () => {
    console.log('🔄 [ModernMedicalRecordForm] Retrying after error...');
    // Force a re-render by updating a key or state
  };

  const handleSaveDraft = () => {
    console.log('💾 [ModernMedicalRecordForm] Attempting to save draft after error...');
    // This could trigger a save operation if needed
  };

  const handleGoBack = () => {
    console.log('⬅️ [ModernMedicalRecordForm] Going back after error...');
    window.history.back();
  };

  return (
    <MedicalRecordErrorBoundary
      onError={handleError}
      onRetry={handleRetry}
      onSaveDraft={handleSaveDraft}
      onGoBack={handleGoBack}
    >
      <ModernMedicalRecordForm {...props} />
    </MedicalRecordErrorBoundary>
  );
};

export default ModernMedicalRecordFormWithErrorBoundary; 