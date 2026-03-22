import React from 'react';
import EMRPrescriptionSystem from '../../components/doctor/EMRPrescriptionSystem';
import { useAuth } from '../../context/AuthContext';

const EMRPrescriptions: React.FC = () => {
  const { user } = useAuth();

  // Only allow doctors to access this page
  if (!user || user.role !== 'doctor') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">This page is only accessible to doctors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <EMRPrescriptionSystem />
    </div>
  );
};

export default EMRPrescriptions;
