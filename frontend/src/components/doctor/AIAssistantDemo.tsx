import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Psychology as AIIcon,
  Assessment as AssessmentIcon,
  Medication as MedicationIcon,
  Science as LabIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import AIAssistantService, { PatientData } from '../../services/aiAssistantService';

const AIAssistantDemo: React.FC = () => {
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Demo patient data
  const demoPatientData: PatientData = {
    chiefComplaint: 'headache, dry cough, fever',
    historyOfPresentIllness: '34-year-old female with 3-day history of headache, dry cough, and fever',
    symptoms: ['headache', 'cough', 'fever'],
    vitals: {
      temperature: 38.5,
      bloodPressure: '120/80',
      heartRate: 95,
      respiratoryRate: 18
    },
    age: 34,
    gender: 'female',
    allergies: ['Penicillin'],
    pastMedicalHistory: 'No significant past medical history',
    currentMedications: ['Multivitamin']
  };

  const runAIAnalysis = async () => {
    setLoading(true);
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiSuggestions = AIAssistantService.generateSuggestions(demoPatientData);
      setSuggestions(aiSuggestions);
    } catch (error) {
      console.error('Error running AI analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon color="primary" />
        AI Clinical Assistant Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        This demo showcases the AI Clinical Assistant's ability to analyze patient data and provide intelligent clinical suggestions.
      </Typography>

      {/* Demo Patient Data */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Demo Patient Data" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2">
                <strong>Chief Complaint:</strong> {demoPatientData.chiefComplaint}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2">
                <strong>Age/Gender:</strong> {demoPatientData.age} years old, {demoPatientData.gender}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2">
                <strong>Vitals:</strong> Temp {demoPatientData.vitals?.temperature}°C, BP {demoPatientData.vitals?.bloodPressure}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2">
                <strong>Allergies:</strong> {demoPatientData.allergies?.join(', ')}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* AI Analysis Button */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<AIIcon />}
          onClick={runAIAnalysis}
          disabled={loading}
          sx={{ px: 4, py: 1.5 }}
        >
          {loading ? 'Analyzing...' : 'Run AI Analysis'}
        </Button>
      </Box>

      {/* AI Suggestions Results */}
      {suggestions && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon color="primary" />
            AI Analysis Results
          </Typography>

          {/* Diagnoses */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon color="primary" />
              Differential Diagnoses
            </Typography>
            <Grid container spacing={1}>
              {suggestions.diagnoses.map((diagnosis: string, index: number) => (
                <Grid key={index}>
                  <Chip label={diagnosis} color="primary" variant="outlined" />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Medications */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicationIcon color="primary" />
              Medication Suggestions
            </Typography>
            <List dense>
              {suggestions.medications.map((medication: string, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={medication} />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Lab Tests */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LabIcon color="primary" />
              Recommended Lab Tests
            </Typography>
            <List dense>
              {suggestions.labTests.map((test: string, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <LabIcon color="info" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={test} />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Red Flags */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="error" />
              Red Flags to Watch For
            </Typography>
            <Alert severity="warning">
              <List dense>
                {suggestions.redFlags.map((flag: string, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={flag} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Clinical Notes */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon color="primary" />
              Clinical Notes & Considerations
            </Typography>
            <List dense>
              {suggestions.clinicalNotes.map((note: string, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <InfoIcon color="info" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={note} />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Follow-up */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" />
              Follow-up Recommendations
            </Typography>
            <List dense>
              {suggestions.followUp.map((item: string, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={item} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default AIAssistantDemo;
