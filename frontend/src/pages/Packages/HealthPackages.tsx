import React from 'react';
import { useSetDocumentId } from '@veltdev/react';
import PackagesDashboard from './PackagesDashboard';
import VeltToolbar from '../../components/VeltToolbar';

const HealthPackages: React.FC = () => {
  // Set the Velt document ID for packages module
  useSetDocumentId('health-packages');

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
