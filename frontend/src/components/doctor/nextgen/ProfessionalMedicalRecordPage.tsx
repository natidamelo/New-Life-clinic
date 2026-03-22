import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Tabs, Tab, Paper, Button, 
  Typography, Breadcrumbs, Link, CircularProgress, Alert
} from '@mui/material';
import {
  Assignment as RecordIcon,
  Description as TemplateIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import EnhancedMedicalRecordForm from './EnhancedMedicalRecordForm';
import ProfessionalMedicalTemplates from './ProfessionalMedicalTemplates';
import { getPatientById } from '../../../services/patientService';

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
      id={`professional-tabpanel-${index}`}
      aria-labelledby={`professional-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
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

  const handleTemplateSelect = (template: any) => {
    // Switch to record form and apply template
    setActiveTab(0);
    // TODO: Apply template to form
  };

  const handleConditionSelect = (condition: any) => {
    // Add condition to current record
    console.log('Selected condition:', condition);
  };

  const handleMedicationSelect = (medication: any) => {
    // Add medication to current record
    console.log('Selected medication:', medication);
  };

  const handleRecordSave = (record: any) => {
    // Handle record save completion
    navigate(`/patients/${patientId}/records`);
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
      <Container maxWidth={false} sx={{ py: 3 }}>
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
      <Container maxWidth={false} sx={{ py: 3 }}>
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
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Breadcrumb Navigation */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs>
          <Link 
            color="inherit" 
            href="/dashboard" 
            onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
          >
            Dashboard
          </Link>
          <Link 
            color="inherit" 
            href={`/patients/${patientId}`}
            onClick={(e) => { e.preventDefault(); navigate(`/patients/${patientId}`); }}
          >
            {patientData ? `${patientData.firstName} ${patientData.lastName}` : 'Patient'}
          </Link>
          <Typography color="text.primary">
            {recordId ? 'Edit Medical Record' : 'New Medical Record'}
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={handleCancel}
          variant="outlined"
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Professional Medical Record System
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            icon={<RecordIcon />} 
            label="Medical Record" 
            id="professional-tab-0"
            aria-controls="professional-tabpanel-0"
          />
          <Tab 
            icon={<TemplateIcon />} 
            label="Templates & Resources" 
            id="professional-tab-1"
            aria-controls="professional-tabpanel-1"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <EnhancedMedicalRecordForm
          patientId={patientId!}
          recordId={recordId}
          mode={recordId ? 'edit' : 'create'}
          onSave={handleRecordSave}
          onCancel={handleCancel}
          patientData={patientData}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <ProfessionalMedicalTemplates
          onTemplateSelect={handleTemplateSelect}
          onConditionSelect={handleConditionSelect}
          onMedicationSelect={handleMedicationSelect}
          handleCreateTemplate={() => {}}
        />
      </TabPanel>
    </Container>
  );
};

export default ProfessionalMedicalRecordPage; 