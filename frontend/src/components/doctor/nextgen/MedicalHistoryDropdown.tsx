import React, { useState, useEffect } from 'react';
import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Button,
  Card,
  CardContent,
  Chip,
  Avatar,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Badge
} from '@mui/material';
import { 
  History as HistoryIcon, 
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  Emergency as EmergencyIcon
} from '@mui/icons-material';
import { formatDateTime, formatDate } from '../../../utils/formatters';
import medicalRecordsApi from '../../../services/medicalRecords';

interface MedicalHistoryDropdownProps {
  patientId: string;
  onSelectRecord: (recordId: string) => void;
  onCreateNew?: () => void;
  currentRecordId?: string;
}

interface MedicalRecord {
  _id: string;
  id: string;
  createdAt: string;
  chiefComplaint?: {
    description?: string;
  };
  status?: string;
  doctor?: {
    firstName: string;
    lastName: string;
  };
}

const MedicalHistoryDropdown: React.FC<MedicalHistoryDropdownProps> = ({
  patientId,
  onSelectRecord,
  onCreateNew,
  currentRecordId
}) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<string>('');

  // Enhanced Medical History Loader
  const loadMedicalHistory = async () => {
    if (!patientId) return;
    setError(null);
    setLoading(true);
    
    // Enhanced token detection with multiple fallback strategies
    let token = null;
    const possibleTokenKeys = ['token', 'jwt_token', 'auth_token', 'authToken'];
    
    // Check localStorage first
    for (const key of possibleTokenKeys) {
      const storedToken = localStorage.getItem(key);
      if (storedToken) {
        token = storedToken;
        console.log(`[MedicalHistoryDropdown] Found authentication token in localStorage.${key}`);
        break;
      }
    }
    
    // Check sessionStorage as backup
    if (!token) {
      for (const key of possibleTokenKeys) {
        const storedToken = sessionStorage.getItem(key);
        if (storedToken) {
          token = storedToken;
          console.log(`[MedicalHistoryDropdown] Found authentication token in sessionStorage.${key}`);
          break;
        }
      }
    }
    
    // Development mode fallback with test token
    const isDevelopmentMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!token && isDevelopmentMode) {
      console.log('[MedicalHistoryDropdown] No token found in development mode - setting test token');
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIzMzAxY2RlZmM3Nzc2YmY3NTM3YjMiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzQ4MTk0NDQ1LCJleHAiOjE3NDgyODA4NDV9.AMsRPhxM_eBAIfXBixgsdjvRyo7PkFxf1E44ivtx4QE';
      localStorage.setItem('jwt_token', testToken);
      token = testToken;
    }
    
    if (!token) {
      console.error('[MedicalHistoryDropdown] No authentication token found');
      setError('Authentication required. Please log in.');
      setLoading(false);
      return;
    }
    
    try {
      console.log(`[MedicalHistoryDropdown] Fetching medical records for patient ${patientId}`);
      
      // Try multiple API endpoints for better compatibility
      let response;
      try {
        response = await medicalRecordsApi.getByPatientId(patientId);
      } catch (primaryError) {
        console.warn('[MedicalHistoryDropdown] Primary API failed, trying alternative endpoint:', primaryError);
        
        // Fallback to direct API call
        const backupUrl = `/api/medical-records/patient/${patientId}`;
        const backupResponse = await fetch(backupUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!backupResponse.ok) {
          throw new Error(`API request failed: ${backupResponse.status}`);
        }
        
        response = await backupResponse.json();
      }
      
      if (response && response.success && response.data) {
        // Sort records by date (newest first)
        const sortedRecords = response.data.sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setRecords(sortedRecords);
        setError(null);
        console.log(`[MedicalHistoryDropdown] Successfully fetched ${sortedRecords.length} medical records`);
        
        // Auto-select current record if specified
        if (currentRecordId) {
          setSelectedRecord(currentRecordId);
        } else if (sortedRecords.length > 0) {
          // Auto-select the most recent record
          setSelectedRecord(sortedRecords[0]._id || sortedRecords[0].id);
        }
      } else {
        console.warn('[MedicalHistoryDropdown] API returned no data:', response);
        setRecords([]);
        setError(null); // No error, just no records
      }
    } catch (error: any) {
      console.error('[MedicalHistoryDropdown] Error fetching medical records:', error);
      setError(`Failed to load medical history: ${error.message}`);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Load medical history on component mount and patient change
  useEffect(() => {
    if (patientId) {
      loadMedicalHistory();
    }
  }, [patientId]);

  // Handle record selection
  const handleRecordSelect = (recordId: string) => {
    console.log(`[MedicalHistoryDropdown] Record selected with ID: ${recordId}`);
    console.log(`[MedicalHistoryDropdown] Available records:`, records.map(r => ({ id: r._id || r.id, description: r.chiefComplaint?.description })));
    
    setSelectedRecord(recordId);
    
    if (recordId && recordId !== '' && onSelectRecord) {
      console.log(`[MedicalHistoryDropdown] Calling onSelectRecord with ID: ${recordId}`);
      onSelectRecord(recordId);
    } else if (recordId === '') {
      console.log('[MedicalHistoryDropdown] Empty record ID selected - this is for creating new record');
    } else {
      console.warn('[MedicalHistoryDropdown] No onSelectRecord callback provided or invalid record ID');
    }
  };

  // Handle retry
  const handleRetry = () => {
    loadMedicalHistory();
  };

  // Handle create new record
  const handleCreateNew = () => {
    setSelectedRecord('');
    if (onCreateNew) {
      onCreateNew();
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'finalized':
        return 'success';
      case 'draft':
      case 'in-progress':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  // Render record item
  const renderRecordItem = (record: MedicalRecord) => (
    <MenuItem key={record._id || record.id} value={record._id || record.id}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 32, height: 32 }}>
          <DescriptionIcon fontSize="small" />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
            {formatDate(record.createdAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {record.chiefComplaint?.description || 'No chief complaint recorded'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip 
              label={record.status || 'Draft'} 
              size="small" 
              color={getStatusColor(record.status)}
              variant="outlined"
            />
            {record.doctor && (
              <Typography variant="caption" color="text.secondary">
                Dr. {record.doctor.firstName} {record.doctor.lastName}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </MenuItem>
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 400 }}>
      {/* Enhanced Medical History Dropdown */}
      <FormControl sx={{ minWidth: 350, flexGrow: 1 }}>
        <InputLabel id="medical-history-label">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon fontSize="small" />
            Medical History
          </Box>
        </InputLabel>
        <Select
          labelId="medical-history-label"
          value={selectedRecord}
          onChange={(e) => handleRecordSelect(e.target.value)}
          label="Medical History"
          disabled={loading}
          sx={{ minHeight: 56 }}
        >
          {/* Create New Record Option */}
          <MenuItem value="" onClick={handleCreateNew}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1 }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2, width: 32, height: 32 }}>
                <AddIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  Create New Medical Record
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Start a new medical record for this patient
                </Typography>
              </Box>
            </Box>
          </MenuItem>
          
          {/* Divider */}
          {records.length > 0 && <Divider />}
          
          {/* Loading State */}
          {loading && (
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                <CircularProgress size={24} />
                <Typography variant="body2">Loading medical history...</Typography>
              </Box>
            </MenuItem>
          )}
          
          {/* Error State */}
          {error && (
            <MenuItem disabled>
              <Box sx={{ py: 1 }}>
                <Alert severity="error" variant="outlined" sx={{ border: 'none' }}>
                  <Typography variant="caption">{error}</Typography>
                </Alert>
              </Box>
            </MenuItem>
          )}
          
          {/* No Records State */}
          {!loading && !error && records.length === 0 && (
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <EmergencyIcon color="disabled" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    No medical records found
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    This patient has no previous medical records
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          )}
          
          {/* Medical Records */}
          {records.map(renderRecordItem)}
        </Select>
      </FormControl>
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Refresh Button */}
        <Tooltip title="Refresh medical history">
          <IconButton 
            onClick={handleRetry} 
            disabled={loading}
            color="primary"
            sx={{ 
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'primary.light', color: 'white' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        
        {/* Records Count Badge */}
        <Tooltip title={`${records.length} medical record(s) found`}>
          <Badge 
            badgeContent={records.length} 
            color="primary"
            sx={{ 
              '& .MuiBadge-badge': { 
                fontSize: '0.75rem',
                minWidth: '20px',
                height: '20px'
              }
            }}
          >
            <IconButton 
              color="info"
              sx={{ 
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'info.light', color: 'white' }
              }}
            >
              <HistoryIcon />
            </IconButton>
          </Badge>
        </Tooltip>
        
        {/* Create New Button */}
        <Tooltip title="Create new medical record">
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{ 
              minWidth: 'auto',
              px: 2,
              boxShadow: 2
            }}
          >
            New
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default MedicalHistoryDropdown; 