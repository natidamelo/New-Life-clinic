import React from 'react';
import { useParams } from 'react-router-dom';
import MedicalRecords from './MedicalRecords';

const PatientRecord: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();

  return (
    <div className="space-y-4">
      <MedicalRecords />
    </div>
  );
};

export default PatientRecord;
