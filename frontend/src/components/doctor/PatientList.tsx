import React from 'react';
import { 
  Card, CardContent, Grid, Typography, Chip, Box, IconButton, Tooltip
} from '@mui/material';
import { 
  Person as PersonIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  LocalPharmacy as PharmacyIcon,
  Biotech as BiotechIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material';

// Types
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contactNumber: string;
  email: string;
  status: string;
  patientId: string;
  nurseName?: string;
  lastUpdate?: string;
  vitals?: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
  };
}

interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  selectedPatient?: string;
}

const PatientList: React.FC<PatientListProps> = ({ 
  patients, 
  onSelectPatient, 
  selectedPatient 
}) => {
  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'waiting':
      case 'scheduled':
        return 'warning';
      case 'in progress':
      case 'active':
        return 'info';
      case 'completed':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Jul 15, 2025, 1:22 PM';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Jul 15, 2025, 1:22 PM';
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 0.5, // Much smaller gap between cards
      maxHeight: '70vh',
      overflow: 'visible',
      pr: 1 
    }}>
      {patients.length > 0 ? (
        patients.map((patient) => (
          <Card 
            key={patient.id}
            variant="outlined"
              sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              border: selectedPatient === patient.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
              backgroundColor: selectedPatient === patient.id ? '#f3f8ff' : 'white',
                  '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)',
                  },
              minHeight: 'auto', // Compact height
              maxWidth: '100%'
            }}
            onClick={() => onSelectPatient(patient.id)}
          >
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              <Grid container spacing={1} alignItems="center">
                {/* Patient Basic Info */}
                   <Grid size={{ xs: 12, sm: 6 }} component="div">
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="h6" component="div" sx={{ 
                      fontWeight: 600, 
                      fontSize: '1.1rem',
                      lineHeight: 1.2,
                      color: '#1976d2'
                    }}>
                      {patient.firstName} {patient.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {patient.gender}, {calculateAge(patient.dateOfBirth)} yrs
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                        {patient.patientId}
                    </Typography>
                    <Chip 
                      label={patient.status} 
                      size="small"
                        color={getStatusColor(patient.status)}
                        sx={{ 
                          fontSize: '0.65rem', 
                          height: 20,
                          '& .MuiChip-label': { px: 1 }
                        }}
                    />
                    </Box>
                  </Box>
                </Grid>



                {/* Nurse and Date Info */}
                   <Grid size={{ xs: 12, sm: 3 }} component="div">
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      -{patient.nurseName || 'Semhal Melaku'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {formatDateTime(patient.lastUpdate)}
                      </Typography>
                  </Box>
                </Grid>

                {/* Action Buttons */}
                   <Grid size={{ xs: 12, sm: 2 }} component="div">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title="Medical Records">
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        <DescriptionIcon sx={{ fontSize: '1.2rem' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="History Taking">
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        <AssignmentIcon sx={{ fontSize: '1.2rem' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Prescriptions">
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        <PharmacyIcon sx={{ fontSize: '1.2rem' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Lab Tests">
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        <BiotechIcon sx={{ fontSize: '1.2rem' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Imaging">
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        <CameraIcon sx={{ fontSize: '1.2rem' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No patients found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              There are no patients in the system or matching your filters
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PatientList; 