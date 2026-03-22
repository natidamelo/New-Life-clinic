import React, { useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { 
  Dialog, DialogContent, DialogTitle, DialogActions,
  IconButton, Button, Box, Typography, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, Badge,
  SelectChangeEvent, Tooltip, Chip, Avatar
} from '@mui/material';
import { 
  Close as CloseIcon, 
  CalendarToday as CalendarIcon,
  FolderOpen as MedicalRecordsIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  History as HistoryIcon,
  Add as AddIcon
} from '@mui/icons-material';
import MedicalRecordSection from './MedicalRecordSection';
import api from '../../services/apiService';
import { getAuthToken } from '../../utils/auth';
import { API_BASE_URL } from '../../config';
import { toast } from 'react-toastify';
import { formatDate, formatDateTime } from '../../utils/formatters';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contactNumber?: string;
  email?: string;
  status?: string;
  patientId?: string;
}

interface MedicalRecord {
  _id: string;
  id?: string;
  createdAt: string;
  recordedAt?: string;
  date?: string;
  diagnosis?: string;
  doctorName?: string;
}

interface MedicalRecordDialogProps {
  open: boolean;
  onClose: () => void;
  patient: Patient | string | null;
  initialMode?: 'view' | 'create' | 'edit';
  onRecordSaved?: () => void; // Add callback for when record is saved
  fullPage?: boolean; // Add prop to control full page mode
  className?: string;
}

// Sample data for when patient API is not available
const SAMPLE_PATIENT: Patient = {
  id: "sample-patient-id",
  firstName: "Sample",
  lastName: "Patient",
  dateOfBirth: "1980-01-01",
  gender: "Male",
  contactNumber: "555-1234",
  email: "sample@example.com",
  status: "Active",
  patientId: "P12345"
};

// Get locally cached records
const getLocalRecords = (patientId: string | null) => {
  if (!patientId) return null;
  
  // Try multiple possible localStorage keys
  const possibleKeys = [
    `patient-records-${patientId}`,
    `medical-records-${patientId}`,
    `records-${patientId}`
  ];
  
  for (const key of possibleKeys) {
    const recordsStr = localStorage.getItem(key);
    if (recordsStr) {
      try {
        const records = JSON.parse(recordsStr);
        if (Array.isArray(records) && records.length > 0) {
          return records;
        }
      } catch (e) {
        console.error(`Error parsing local records from ${key}:`, e);
      }
    }
  }
  
  return null;
};

const MedicalRecordDialog: React.FC<MedicalRecordDialogProps> = ({ 
  open, 
  onClose,
  patient,
  initialMode = 'view',
  onRecordSaved,
  fullPage = true,
  className
}) => {
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [componentMode, setComponentMode] = useState<'view' | 'create' | 'edit'>(initialMode);
  const [recordSaved, setRecordSaved] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [stableRecords, setStableRecords] = useState<MedicalRecord[]>([]);
  const initialLoadRef = useRef(true);

  // Effect to toggle a body class AND hide/show background elements for true fullscreen
  useEffect(() => {
    const hiddenElements: Array<{ element: HTMLElement; originalDisplay: string }> = [];

    const hideElement = (el: HTMLElement | null) => {
      if (el && el.id !== 'medical-record-dialog' && !el.closest('#medical-record-dialog')) {
        // Check if the element is not the dialog itself or an ancestor of the dialog
        const dialogElement = document.getElementById('medical-record-dialog');
        if (dialogElement && dialogElement.contains(el)) {
          return; // Do not hide if it's an ancestor or part of the dialog content
        }
        hiddenElements.push({ element: el, originalDisplay: el.style.display });
        el.style.display = 'none';
      }
    };

    const showElements = () => {
      hiddenElements.forEach(({ element, originalDisplay }) => {
        if (document.body.contains(element)) {
          element.style.display = originalDisplay;
        }
      });
      hiddenElements.length = 0; // Clear the array
    };

    if (open && fullPage) {
      document.body.classList.add('medical-record-dialog-fullscreen-active');

      // --- USER: Adjust these selectors to match your app's layout --- 
      const selectorsToTry = [
        // More specific first
        '#app-sidebar', '#main-header', '.app-layout-main-content',
        // Common general patterns
        'body > header', 'body > nav', 'body > aside', 'body > main',
        '#root > header', '#root > aside', '#root > main:not(:has(#medical-record-dialog))',
        '#app > header', '#app > aside', '#app > main:not(:has(#medical-record-dialog))',
        // Try to get common wrapper divs if they are not the portal target for MUI
        'div[role="application"] > header', // Example for some structures
        'div[data-testid="app-container"] > header', // Example
      ];

      selectorsToTry.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => hideElement(el as HTMLElement));
        } catch (e) {
          console.warn(`MedicalRecordDialog: Invalid selector for hiding: ${selector}`, e);
        }
      });
      
      // Fallback: Hide other direct children of body, carefully excluding modals and our dialog
      Array.from(document.body.children).forEach(child => {
        const htmlChild = child as HTMLElement;
        if ( htmlChild.id !== 'medical-record-dialog' &&
             !htmlChild.matches('[class*="MuiModal-root"]') && // Exclude MUI modal roots
             !htmlChild.matches('#medical-record-dialog') && // Double check not our dialog
             htmlChild.tagName.toLowerCase() !== 'script' &&
             htmlChild.tagName.toLowerCase() !== 'style' &&
             htmlChild.tagName.toLowerCase() !== 'iframe' &&
             !hiddenElements.find(item => item.element === htmlChild) // Not already hidden
        ) {
          hideElement(htmlChild);
        }
      });

    } else {
      document.body.classList.remove('medical-record-dialog-fullscreen-active');
      showElements();
    }

    return () => {
      document.body.classList.remove('medical-record-dialog-fullscreen-active');
      showElements(); // Restore on unmount/cleanup
    };
  }, [open, fullPage]);

  // Update componentMode when initialMode changes
  useEffect(() => {
    if (open) {
      setComponentMode(initialMode);
    }
  }, [initialMode, open]);

  // Handle dialog close
  const handleClose = () => {
    if (loading || loadingRecords || isRefreshing) {
      return; // Don't close if loading or refreshing
    }
    
    // Ensure other dialogs are closed if this one is active and fullPage
    if (fullPage) {
        const otherDialogs = document.querySelectorAll('.MuiDialog-root');
        otherDialogs.forEach(dialog => {
            // Check if it is not the current dialog
            if (!dialog.contains(document.getElementById('medical-record-dialog-content'))) {
                 // Attempt to close by simulating a click on a backdrop or close button if available
                const backdrop = dialog.querySelector('.MuiBackdrop-root') as HTMLElement;
                if (backdrop) backdrop.click(); 
            }
        });
    }

    setIsClosing(true);
    onClose();
    // Reset state after closing
    setTimeout(() => {
      setIsClosing(false);
      setComponentMode(initialMode);
      setSelectedRecordId(null);
    }, 300);
  };

  // Fetch patient data when patient ID changes
  useEffect(() => {
    if (!patient || !open) {
      setPatientData(null);
      setPatientId(null);
      return;
    }
    
    // If patient is a string (ID), fetch the patient data
    if (typeof patient === 'string') {
      setPatientId(patient);
      if (open) {
        setLoading(true);
        setLoadingError(null);
        
        // Try to get patient details - use public endpoint if needed
        const patientId = patient;
        const endpoint = getAuthToken() 
          ? `/api/patients/${patientId}`
          : `/api/patients/public/${patientId}`;
        
        api.get(endpoint)
          .then(response => {
            if (response.data && response.data.data) {
              setPatientData(response.data.data);
            } else if (response.data && response.data.success === false) {
              // If API returned success=false, use sample data
              setPatientData({
                ...SAMPLE_PATIENT,
                id: patientId
              });
            }
            setLoading(false);
          })
          .catch(error => {
            console.error('Error fetching patient:', error);
            // Set sample patient data when API is unavailable
            setPatientData({
              ...SAMPLE_PATIENT,
              id: patientId
            });
            setLoadingError("Could not load patient details");
            setLoading(false);
          });
      }
    } else {
      // If patient is already a Patient object
      setPatientData(patient);
      setPatientId(patient.id);
    }
  }, [patient, open]);

  // Create a reusable function to fetch medical records
  const fetchMedicalRecords = useCallback(async () => {
    if (!patientId || !open) return [];
    
    if (isRefreshing && !initialLoadRef.current) return []; // Prevent multiple simultaneous refreshes except initial load
    
    setLoadingRecords(true);
    setIsRefreshing(true);
    setLoadingError(null);
    
    try {
      // Skip requests for invalid patient IDs
      if (patientId === 'unknown') {
        setMedicalRecords([]);
        setSelectedRecordId(null);
        setLoadingRecords(false);
        setIsRefreshing(false);
        initialLoadRef.current = false;
        return [];
      }
      
      // Try to load from local cache first for immediate display
      const localStorageRecords = getLocalRecords(patientId);
      if (localStorageRecords && localStorageRecords.length > 0) {
        // Sort local records by date (newest first)
        const sortedLocalRecords = [...localStorageRecords].sort((a: MedicalRecord, b: MedicalRecord) => {
          const dateA = new Date(a.recordedAt || a.createdAt || a.date || '').getTime();
          const dateB = new Date(b.recordedAt || b.createdAt || b.date || '').getTime();
          return dateB - dateA;
        });
        
        // Set stable records to prevent flickering during loading
        setStableRecords(sortedLocalRecords);
        if (sortedLocalRecords.length > 0 && !selectedRecordId) {
          setSelectedRecordId(sortedLocalRecords[0]._id || sortedLocalRecords[0].id);
        }
      }
      
      // Try the public endpoint first since it's more reliable
      const publicEndpoint = `/api/medical-records/patient-public/${patientId}`;
      const response = await api.get(publicEndpoint);
      
      const records = response.data.data || [];
      
      // If no records from public endpoint, try authenticated endpoint
      if (records.length === 0 && getAuthToken()) {
        try {
          const authResponse = await api.get(`/api/doctor/patient/${patientId}/history`);
          if (authResponse.data.data && authResponse.data.data.length > 0) {
            const authRecords = authResponse.data.data;
            // Sort records by date (newest first)
            const sortedRecords = authRecords.sort((a: MedicalRecord, b: MedicalRecord) => {
              const dateA = new Date(a.recordedAt || a.createdAt || a.date || '').getTime();
              const dateB = new Date(b.recordedAt || b.createdAt || b.date || '').getTime();
              return dateB - dateA;
            });
            
            // Store records in localStorage as a cache
            try {
              localStorage.setItem(`patient-records-${patientId}`, JSON.stringify(sortedRecords));
            } catch (e) {
              console.error('Failed to cache records in localStorage:', e);
            }
            
            setMedicalRecords(sortedRecords);
            setStableRecords(sortedRecords);
            if (sortedRecords.length > 0 && !selectedRecordId) {
              setSelectedRecordId(sortedRecords[0]._id || sortedRecords[0].id);
            }
            
            setLoadingRecords(false);
            setIsRefreshing(false);
            initialLoadRef.current = false;
            return sortedRecords;
          }
        } catch (authError) {
          console.error('Auth endpoint error:', authError);
          // Continue with public records if auth fails
        }
      }
      
      // If we got here, use the public records
      // Sort records by date (newest first)
      const sortedRecords = records.sort((a: MedicalRecord, b: MedicalRecord) => {
        const dateA = new Date(a.recordedAt || a.createdAt || a.date || '').getTime();
        const dateB = new Date(b.recordedAt || b.createdAt || b.date || '').getTime();
        return dateB - dateA;
      });
      
      // Store records in localStorage as a cache
      try {
        localStorage.setItem(`patient-records-${patientId}`, JSON.stringify(sortedRecords));
      } catch (e) {
        console.error('Failed to cache records in localStorage:', e);
      }
      
      setMedicalRecords(sortedRecords);
      setStableRecords(sortedRecords);
      if (sortedRecords.length > 0 && !selectedRecordId) {
        setSelectedRecordId(sortedRecords[0]._id || sortedRecords[0].id);
      }
      
      setLoadingRecords(false);
      setIsRefreshing(false);
      initialLoadRef.current = false;
      return records;
    } catch (error: any) {
      console.error('Error fetching medical records:', error);
      
      // Use locally cached records as fallback
      const localStorageRecords = getLocalRecords(patientId);
      if (localStorageRecords) {
        // Sort the local records as well
        const sortedFinalRecords = [...localStorageRecords].sort((a: MedicalRecord, b: MedicalRecord) => {
          const dateA = new Date(a.recordedAt || a.createdAt || a.date || '').getTime();
          const dateB = new Date(b.recordedAt || b.createdAt || b.date || '').getTime();
          return dateB - dateA;
        });
        
        setMedicalRecords(sortedFinalRecords);
        setStableRecords(sortedFinalRecords);
        if (sortedFinalRecords.length > 0 && !selectedRecordId) {
          setSelectedRecordId(sortedFinalRecords[0]._id || sortedFinalRecords[0].id);
        }
        setLoadingRecords(false);
        setIsRefreshing(false);
        initialLoadRef.current = false;
        toast("Using locally stored records");
        return localStorageRecords;
      }
      
      // If we've tried a few times and still no records, show error
      if (retryCount > 2) {
        setMedicalRecords([]);
        setStableRecords([]);
        setSelectedRecordId(null);
        setLoadingRecords(false);
        setIsRefreshing(false);
        setLoadingError("Could not load medical records");
        initialLoadRef.current = false;
        return [];
      }
      
      // Increment retry count and try again with a delay
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        fetchMedicalRecords();
      }, 1000);
      
      return [];
    }
  }, [patientId, open, isRefreshing, retryCount, selectedRecordId]);

  // Update the medical records fetching logic to use the callback
  useEffect(() => {
    if (open && patientId) {
      fetchMedicalRecords();
    }
  }, [fetchMedicalRecords, open, patientId]);

  // Add effect to refresh records when a record is saved
  useEffect(() => {
    if (recordSaved) {
      fetchMedicalRecords().then(() => {
        setComponentMode('view'); // Switch back to view mode
        setRecordSaved(false);   // Reset the flag
        toast.success("Medical record saved successfully");
      });
    }
  }, [recordSaved, fetchMedicalRecords]);

  const handleRecordSelect = (event: SelectChangeEvent<string>) => {
    const recordId = event.target.value;
    setSelectedRecordId(recordId);
    setComponentMode('view');
  };

  const handleManualRefresh = () => {
    if (patientId && !isRefreshing) {
      // Reset retry count
      setRetryCount(0);
      
      // Clear localStorage cache to force a fresh fetch
      const possibleKeys = [
        `patient-records-${patientId}`,
        `medical-records-${patientId}`,
        `records-${patientId}`
      ];
      possibleKeys.forEach(key => localStorage.removeItem(key));
      
      // Trigger a new fetch
      fetchMedicalRecords();
      toast("Refreshing medical records...");
    }
  };

  const handleCreateNewRecord = () => {
    setComponentMode('create');
    setSelectedRecordId(null);
  };
  
  // Handle record save completion
  const handleRecordSaved = () => {
    setRecordSaved(true);
    setComponentMode('view');
    if (onRecordSaved) {
      onRecordSaved();
    }
  };

  // Format the date for display in the dropdown
  const formatRecordDate = (record: MedicalRecord) => {
    const dateStr = record.recordedAt || record.createdAt || record.date || '';
    console.log('Formatting date for record:', { record, dateStr });
    
    try {
      if (!dateStr) return 'No date';
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateStr);
        return 'Invalid date';
      }
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Check if date is today
      if (date.toDateString() === today.toDateString()) {
        return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      // Check if date is yesterday
      if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      // For all other dates - use clear formatting with month name
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr || 'Unknown Date';
    }
  };

  // Get diagnosis summary for the dropdown
  const getDiagnosisSummary = (record: MedicalRecord) => {
    if (!record) return '';
    
    const diagnosis = record.diagnosis || '';
    // Truncate long diagnoses
    return diagnosis.length > 30 ? diagnosis.substring(0, 27) + '...' : diagnosis;
  };

  // Reset state when dialog opens/closes or patient changes
  useEffect(() => {
    if (open) {
      // Reset data when dialog opens
      initialLoadRef.current = true;
    } else {
      // Reset data when dialog closes
      setMedicalRecords([]);
      setStableRecords([]);
      setSelectedRecordId(null);
      setLoadingRecords(false);
      setIsRefreshing(false);
      setRetryCount(0);
    }
  }, [open, patientId]);

  return (
    <Dialog
      open={open && !isClosing}
      onClose={handleClose}
      fullScreen={fullPage}
      maxWidth={fullPage ? false : 'xl'}
      fullWidth
      aria-labelledby="medical-record-dialog-title"
      aria-describedby="medical-record-dialog-description"
      sx={{
        zIndex: fullPage ? 1500 : 1300,
        '& .MuiDialog-paper': {
          height: fullPage ? '100vh' : 'calc(100vh - 64px)',
          maxHeight: fullPage ? '100vh' : 'calc(100vh - 64px)',
          width: fullPage ? '100vw' : '90vw',
          maxWidth: fullPage ? '100vw' : '1200px',
          m: 0,
          borderRadius: fullPage ? 0 : undefined,
          overflow: 'hidden'
        },
      }}
      className={className}
      id="medical-record-dialog"
    >
      <DialogTitle 
        id="medical-record-dialog-title" 
        sx={{ 
          backgroundColor: '#0044cc', 
          color: 'white', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MedicalRecordsIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" component="div">
            Medical Records: {patientData ? `${patientData.firstName} ${patientData.lastName}` : 'Loading...'}
          </Typography>
          {patientData && (
            <Chip 
              avatar={<Avatar sx={{ bgcolor: 'primary.dark', color: 'white !important' }}>{patientData.firstName?.[0]}{patientData.lastName?.[0]}</Avatar>}
              label={`${patientData.gender}, DOB: ${patientData.dateOfBirth ? formatDate(patientData.dateOfBirth) : 'N/A'}, ID: ${patientData.patientId || patientData.id}`}
              sx={{ ml: 2, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Date filter for records (conditionally rendered) */}
          {componentMode === 'view' && medicalRecords.length > 0 && (
            <>
              <FormControl size="small" sx={{ minWidth: 180, mr: 1, '.MuiInputBase-root': { color: 'white' }, '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' } }}>
                <InputLabel id="record-select-label" sx={{ color: 'white' }}>Previous Records</InputLabel>
                <Select
                  labelId="record-select-label"
                  value={selectedRecordId || ''}
                  onChange={handleRecordSelect}
                  label="Previous Records"
                  sx={{ 
                    color: 'white', 
                    '& .MuiSvgIcon-root': { color: 'white' },
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }}
                >
                  {stableRecords.map((record) => (
                    <MenuItem key={record._id || record.id} value={record._id || record.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{formatRecordDate(record)}</span>
                        <Typography variant="caption" color="textSecondary" sx={{ml: 1}}>
                          {getDiagnosisSummary(record) || 'No diagnosis'}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Refresh Records">
                <IconButton onClick={handleManualRefresh} sx={{ color: 'white' }} disabled={isRefreshing || loadingRecords}>
                  {isRefreshing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
            </>
          )}
           <Tooltip title="Close">
            <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      
      <DialogContent 
        id="medical-record-dialog-content"
        sx={{ 
          p: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          height: 'calc(100% - 64px - 56px)', // Full height minus header and footer
          overflow: 'hidden',
          position: 'relative' // Add this to contain absolutely positioned elements
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
            <CircularProgress aria-label="Loading patient data" />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Loading patient data...
            </Typography>
          </Box>
        ) : loadingRecords && stableRecords.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
            <CircularProgress aria-label="Loading medical records" />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Loading medical records...
            </Typography>
          </Box>
        ) : loadingError ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', p:3, textAlign: 'center' }}>
            <Typography variant="h6" color="error" gutterBottom>
              Error
            </Typography>
            <Typography variant="body1" color="error">
              {loadingError}
            </Typography>
            <Button 
              onClick={handleManualRefresh} 
              sx={{ mt: 2 }}
              startIcon={<RefreshIcon />}
              variant="outlined"
              color="primary"
            >
              Retry
            </Button>
          </Box>
        ) : patientId ? (
          <MedicalRecordSection 
            patientId={patientId} 
            recordId={selectedRecordId}
            mode={componentMode}
            onRecordSaved={handleRecordSaved}
          />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body1">No patient selected</Typography>
          </Box>
        )}
        
        {/* Overlay loading indicator for refreshes after initial load */}
        {isRefreshing && !initialLoadRef.current && stableRecords.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              padding: '12px',
              backgroundColor: 'rgba(255,255,255,0.8)',
              zIndex: 10,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 16px', borderRadius: 2, backgroundColor: 'white', boxShadow: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Refreshing records...</Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      {/* MODIFIED Actions Bar */}
      {componentMode === 'view' && !isClosing && fullPage && (
        <DialogActions sx={{ 
          borderTop: '1px solid rgba(0,0,0,0.12)', 
          p: { xs: 1, sm: 1.5 }, 
          backgroundColor: '#f5f9ff', // Light background for the action bar
          width: '100%', 
          boxSizing: 'border-box',
          m: 0,
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'auto', // Auto height based on content
          minHeight: '56px', // Minimum height
          display: 'flex',
          justifyContent: 'flex-end', // Align button to the right
          zIndex: 1150 // Ensure it's above content but below header if overlapping somehow
        }}>
          <Button 
            onClick={handleCreateNewRecord}
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            size="large"
            disabled={loading || loadingRecords || isRefreshing}
            aria-label="Create new medical record"
            sx={{ 
              borderRadius: '28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', // Softer shadow
              px: { xs: 2, sm: 3 },
              py: { xs: 1, sm: 1.5 }
            }}
          >
            NEW RECORD
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default MedicalRecordDialog; 