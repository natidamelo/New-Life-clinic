import React from 'react';
import MedicalRecordForm from '../components/doctor/nextgen/MedicalRecordForm';
import { Box, Typography } from '@mui/material';

const MedicalRecordDemo = () => (
  <Box sx={{ width: '100vw', height: '100vh', p: 0, m: 0, bgcolor: 'white' }}>
    <Typography variant="h4" gutterBottom>
      Medical Record (NextGen Demo)
    </Typography>
    <MedicalRecordForm patientId="demo-patient" />
  </Box>
);

export default MedicalRecordDemo; 