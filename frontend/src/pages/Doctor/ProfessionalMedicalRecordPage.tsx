import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  Button,
  Typography,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Assignment as RecordIcon,
  ArrowBack as BackIcon,
  Favorite as FavoriteIcon
} from '@mui/icons-material';
import EnhancedMedicalRecordForm from '../../components/doctor/nextgen/EnhancedMedicalRecordForm';
import ModernMedicalRecordForm from '../../components/doctor/nextgen/ModernMedicalRecordForm';
import { getPatientById } from '../../services/patientService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`medical-record-tabpanel-${index}`}
      aria-labelledby={`medical-record-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProfessionalMedicalRecordPage: React.FC = () => {
  const { patientId, recordId } = useParams<{ patientId: string; recordId?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRecordSave = () => {
    // Handle save logic here
    navigate(-1);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Fetch patient data when component mounts
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) {
        setError('No patient ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching patient data for ID:', patientId);
        
        const patient = await getPatientById(patientId);
        if (patient) {
          console.log('Patient data fetched successfully:', patient);
          console.log('Patient age:', patient.age);
          console.log('Patient dateOfBirth:', patient.dateOfBirth);
          console.log('Patient contactNumber:', patient.contactNumber);
          console.log('Patient patientId:', patient.patientId);
          setPatientData(patient);
        } else {
          console.warn('No patient data returned for ID:', patientId);
          setError('Patient not found');
        }
      } catch (err) {
        console.error('Error fetching patient data:', err);
        setError('Failed to load patient information');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId]);

  // Show loading state
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading patient information...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">Error Loading Patient</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Button variant="outlined" onClick={() => navigate(-1)} startIcon={<BackIcon />}>
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Blue Header Bar - Dashboard Style */}
      <Box sx={{ 
        backgroundColor: '#1976d2', 
        color: '#fff', 
        py: 3, 
        px: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        borderRadius: 2,
        mb: 3
      }}>
        <FavoriteIcon sx={{ fontSize: 40, color: '#fff', mr: 2 }} />
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#fff', letterSpacing: 1 }}>
          New Life
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#fff', ml: 2 }}>
          Healthcare Center
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Professional Medical Record
        </Typography>

        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link color="inherit" href="/app/doctor">
            Doctor
          </Link>
          <Typography color="text.primary">Medical Record</Typography>
        </Breadcrumbs>

        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="medical record tabs"
          >
            <Tab icon={<RecordIcon />} label="Medical Record" />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            {/* HUGE DEBUG BOX TO CONFIRM RENDERING */}
            <Box sx={{ 
              p: 4, 
              mb: 4, 
              backgroundColor: 'red', 
              color: 'white',
              borderRadius: 2,
              border: '5px solid black',
              textAlign: 'center'
            }}>
              <Typography variant="h3" fontWeight="bold">
                🔥 NEW MODERN MEDICAL RECORD FORM IS LOADING 🔥
              </Typography>
              <Typography variant="h5" sx={{ mt: 2 }}>
                If you see this red box, the component is working!
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                Patient ID: {patientId} | Record ID: {recordId || 'New Record'}
              </Typography>
            </Box>
            <ModernMedicalRecordForm
              patientId={patientId!}
              recordId={recordId}
              mode={recordId ? 'edit' : 'create'}
              onSave={handleRecordSave}
              onCancel={handleCancel}
              patientData={patientData}
            />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default ProfessionalMedicalRecordPage; 