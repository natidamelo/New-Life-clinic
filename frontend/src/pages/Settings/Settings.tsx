import React from 'react';
import { Card } from '../../components/ui/card';

const Settings: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">Manage your account details, password, and preferences.</p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary transition-colors">
              Manage Account
            </button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">System Preferences</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">Configure system-wide settings and defaults.</p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary transition-colors">
              System Settings
            </button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Email Notifications</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">Configure email notifications and alerts.</p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary transition-colors">
              Notification Settings
            </button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">Configure security settings and access controls.</p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary transition-colors">
              Security Settings
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings; 