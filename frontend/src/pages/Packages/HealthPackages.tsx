import React from 'react';
import { useSetVeltDocId } from '../../context/VeltContext';
import PackagesDashboard from './PackagesDashboard';
import VeltToolbar from '../../components/VeltToolbar';

const HealthPackages: React.FC = () => {
  // Set the Velt document ID for packages module
  useSetVeltDocId('health-packages');

  return (
    <div className="space-y-4">
      <div className="flex justify-end pr-2">
        <VeltToolbar />
      </div>
      <PackagesDashboard />
    </div>
  );
};

export default HealthPackages;
