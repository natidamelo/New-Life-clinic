import React from 'react';
import { useParams } from 'react-router-dom';
import { useSetDocumentId } from '@veltdev/react';
import MedicalRecords from './MedicalRecords';
import VeltToolbar from '../../components/VeltToolbar';

const PatientRecord: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  
  // Set the Velt document ID for the specific patient
  useSetDocumentId(`patient-${patientId}`);

  return (
    <div className="space-y-4">
      <div className="flex justify-end pr-2">
        <VeltToolbar />
      </div>
      <MedicalRecords />
    </div>
  );
};

export default PatientRecord;
