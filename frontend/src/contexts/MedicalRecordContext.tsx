import React, { createContext, useContext } from 'react';

export interface MedicalRecordContextType {
  specialty: string;
  setSpecialty: (specialty: string) => void;
  details: Record<string, any>;
  setDetails: (details: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
}

export const MedicalRecordContext = createContext<MedicalRecordContextType | undefined>(undefined);

export const useMedicalRecord = () => {
  const context = useContext(MedicalRecordContext);
  if (!context) {
    throw new Error('useMedicalRecord must be used within a MedicalRecordProvider');
  }
  return context;
};
