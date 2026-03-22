import React from 'react';
import DoctorDashboard from './DoctorDashboard';

const MyPatients: React.FC = () => {
  return <DoctorDashboard initialTab="patients" />;
};

export default MyPatients;