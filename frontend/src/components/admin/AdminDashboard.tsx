import React from 'react';
import Card from '../Card';

const AdminDashboard: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-2">Staff Management</h2>
          <p className="text-muted-foreground">Manage doctors, nurses, and other staff</p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold mb-2">Appointments</h2>
          <p className="text-muted-foreground">View and manage appointments</p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold mb-2">Reports</h2>
          <p className="text-muted-foreground">Generate and view reports</p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold mb-2">Settings</h2>
          <p className="text-muted-foreground">Configure system settings</p>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard; 