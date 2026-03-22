/**
 * Depo Injection Management Page
 * 
 * Main page for managing Depo-Provera injection schedules
 */

import React from 'react';
import DepoInjectionDashboard from '../components/DepoInjection/DepoInjectionDashboard';

const DepoInjectionManagement: React.FC = () => {
  return (
    <div className="min-h-screen bg-muted/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DepoInjectionDashboard />
      </div>
    </div>
  );
};

export default DepoInjectionManagement;

