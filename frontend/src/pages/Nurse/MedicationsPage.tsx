import React from 'react';
import CheckboxMedicationsPage from './CheckboxMedicationsPage';
import ErrorBoundary from '../../components/ErrorBoundary';

const MedicationsPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <CheckboxMedicationsPage />
    </ErrorBoundary>
  );
};

export default MedicationsPage;