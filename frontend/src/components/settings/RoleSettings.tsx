import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'react-hot-toast';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import { useAuth } from '../../context/AuthContext';

interface RoleSettingsProps {
  onClose: () => void;
}

const RoleSettings: React.FC<RoleSettingsProps> = ({ onClose }) => {
  const { getRoleSettings, updateRoleSettings } = useGlobalSettings();
  const { user } = useAuth();
  const [currentSettings, setCurrentSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'appearance' | 'notifications' | 'dashboard'>('appearance');

  const userRole = user?.role || 'doctor';

  useEffect(() => {
    const loadRoleSettings = async () => {
      try {
        setLoading(true);
        const settings = await getRoleSettings(userRole);
        setCurrentSettings(settings);
      } catch (error) {
        console.error('Failed to load role settings:', error);
        toast.error('Failed to load your role settings');
      } finally {
        setLoading(false);
      }
    };

    loadRoleSettings();
  }, [userRole, getRoleSettings]);

  const handleSettingChange = (path: string, value: any) => {
    setCurrentSettings(prev => {
      if (!prev) return null;
      const newSettings = { ...prev };
      let current = newSettings as any;
      const parts = path.split('.');
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return newSettings;
    });
  };

  const handleSave = async () => {
    if (!currentSettings) return;
    try {
      setSaving(true);
      await updateRoleSettings(userRole, currentSettings);
      toast.success(`${userRole} settings saved successfully!`);
    } catch (error) {
      console.error('Failed to save role settings:', error);
      toast.error('Failed to save your settings');
    } finally {
      setSaving(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      doctor: 'Doctor',
      lab: 'Laboratory',
      imaging: 'Imaging',
      reception: 'Reception',
      nurse: 'Nurse'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors = {
      doctor: '#3B82F6', // Blue
      lab: '#DC2626', // Red
      imaging: '#7C3AED', // Purple
      reception: '#EA580C', // Orange
      nurse: '#DB2777' // Pink
    };
    return roleColors[role as keyof typeof roleColors] || '#3B82F6';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading your settings...</span>
        </div>
      </Card>
    );
  }

  if (!currentSettings) {
    return (
      <Card className="p-6">
        <p className="text-destructive">Failed to load your role settings.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-muted-foreground">
            {getRoleDisplayName(userRole)} Settings
          </h2>
          <p className="text-muted-foreground">
            Customize your {getRoleDisplayName(userRole).toLowerCase()} dashboard experience
          </p>
        </div>
        <div 
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: getRoleColor(userRole) }}
        ></div>
      </div>

      <div className="flex border-b border-border/30 mb-4">
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('appearance')} 
          className={activeTab === 'appearance' ? 'border-b-2 border-primary' : ''}
        >
          Appearance
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('notifications')} 
          className={activeTab === 'notifications' ? 'border-b-2 border-primary' : ''}
        >
          Notifications
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('dashboard')} 
          className={activeTab === 'dashboard' ? 'border-b-2 border-primary' : ''}
        >
          Dashboard
        </Button>
      </div>

      {activeTab === 'appearance' && (
        <Card className="p-6">
          <CardTitle className="mb-4">Appearance Settings</CardTitle>
          <div className="space-y-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select 
                value={currentSettings.appearance?.theme || 'light'} 
                onValueChange={(value: 'light' | 'dark' | 'auto') => handleSettingChange('appearance.theme', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">System Preference</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="primaryColor">Primary Color</Label>
              <Input 
                id="primaryColor" 
                type="color" 
                value={currentSettings.appearance?.primaryColor || getRoleColor(userRole)} 
                onChange={(e) => handleSettingChange('appearance.primaryColor', e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <Input 
                id="secondaryColor" 
                type="color" 
                value={currentSettings.appearance?.secondaryColor || '#059669'} 
                onChange={(e) => handleSettingChange('appearance.secondaryColor', e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="fontSize">Font Size</Label>
              <Select 
                value={currentSettings.appearance?.fontSize || 'medium'} 
                onValueChange={(value: 'small' | 'medium' | 'large') => handleSettingChange('appearance.fontSize', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select font size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="compactMode">Compact Mode</Label>
              <Switch
                id="compactMode"
                checked={currentSettings.appearance?.compactMode || false}
                onCheckedChange={(checked) => handleSettingChange('appearance.compactMode', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sidebarCollapsed">Collapsed Sidebar</Label>
              <Switch
                id="sidebarCollapsed"
                checked={currentSettings.appearance?.sidebarCollapsed || false}
                onCheckedChange={(checked) => handleSettingChange('appearance.sidebarCollapsed', checked)}
              />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card className="p-6">
          <CardTitle className="mb-4">Notification Settings</CardTitle>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notificationsEnabled">Enable All Notifications</Label>
              <Switch
                id="notificationsEnabled"
                checked={currentSettings.notifications?.enabled || true}
                onCheckedChange={(checked) => handleSettingChange('notifications.enabled', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notificationSound">Play Sound for Notifications</Label>
              <Switch
                id="notificationSound"
                checked={currentSettings.notifications?.soundEnabled || true}
                onCheckedChange={(checked) => handleSettingChange('notifications.soundEnabled', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="desktopNotifications">Desktop Notifications</Label>
              <Switch
                id="desktopNotifications"
                checked={currentSettings.notifications?.desktopNotifications || true}
                onCheckedChange={(checked) => handleSettingChange('notifications.desktopNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <Switch
                id="emailNotifications"
                checked={currentSettings.notifications?.emailNotifications || true}
                onCheckedChange={(checked) => handleSettingChange('notifications.emailNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="smsNotifications">SMS Notifications</Label>
              <Switch
                id="smsNotifications"
                checked={currentSettings.notifications?.smsNotifications || false}
                onCheckedChange={(checked) => handleSettingChange('notifications.smsNotifications', checked)}
              />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'dashboard' && (
        <Card className="p-6">
          <CardTitle className="mb-4">Dashboard Settings</CardTitle>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refreshInterval">Refresh Interval (milliseconds)</Label>
              <Input
                id="refreshInterval"
                type="number"
                value={currentSettings.dashboard?.refreshInterval || 30000}
                onChange={(e) => handleSettingChange('dashboard.refreshInterval', parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showWelcomeMessage">Show Welcome Message</Label>
              <Switch
                id="showWelcomeMessage"
                checked={currentSettings.dashboard?.showWelcomeMessage || true}
                onCheckedChange={(checked) => handleSettingChange('dashboard.showWelcomeMessage', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enableQuickActions">Enable Quick Actions</Label>
              <Switch
                id="enableQuickActions"
                checked={currentSettings.dashboard?.enableQuickActions || true}
                onCheckedChange={(checked) => handleSettingChange('dashboard.enableQuickActions', checked)}
              />
            </div>
            
            {/* Role-specific dashboard settings */}
            {userRole === 'lab' && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoRefreshResults">Auto Refresh Results</Label>
                  <Switch
                    id="autoRefreshResults"
                    checked={currentSettings.dashboard?.autoRefreshResults || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.autoRefreshResults', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showNormalRanges">Show Normal Ranges</Label>
                  <Switch
                    id="showNormalRanges"
                    checked={currentSettings.dashboard?.showNormalRanges || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.showNormalRanges', checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultTestView">Default Test View</Label>
                  <Select 
                    value={currentSettings.dashboard?.defaultTestView || 'list'} 
                    onValueChange={(value: 'grid' | 'list') => handleSettingChange('dashboard.defaultTestView', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {userRole === 'imaging' && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoRefreshOrders">Auto Refresh Orders</Label>
                  <Switch
                    id="autoRefreshOrders"
                    checked={currentSettings.dashboard?.autoRefreshOrders || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.autoRefreshOrders', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showImagePreview">Show Image Preview</Label>
                  <Switch
                    id="showImagePreview"
                    checked={currentSettings.dashboard?.showImagePreview || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.showImagePreview', checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultView">Default View</Label>
                  <Select 
                    value={currentSettings.dashboard?.defaultView || 'pending'} 
                    onValueChange={(value: 'pending' | 'completed' | 'all') => handleSettingChange('dashboard.defaultView', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {userRole === 'reception' && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoRefreshQueue">Auto Refresh Queue</Label>
                  <Switch
                    id="autoRefreshQueue"
                    checked={currentSettings.dashboard?.autoRefreshQueue || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.autoRefreshQueue', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showPatientPhotos">Show Patient Photos</Label>
                  <Switch
                    id="showPatientPhotos"
                    checked={currentSettings.dashboard?.showPatientPhotos || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.showPatientPhotos', checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultSortBy">Default Sort By</Label>
                  <Select 
                    value={currentSettings.dashboard?.defaultSortBy || 'time'} 
                    onValueChange={(value: 'time' | 'name' | 'priority') => handleSettingChange('dashboard.defaultSortBy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sort option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {userRole === 'nurse' && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoRefreshTasks">Auto Refresh Tasks</Label>
                  <Switch
                    id="autoRefreshTasks"
                    checked={currentSettings.dashboard?.autoRefreshTasks || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.autoRefreshTasks', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showVitalSigns">Show Vital Signs</Label>
                  <Switch
                    id="showVitalSigns"
                    checked={currentSettings.dashboard?.showVitalSigns || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.showVitalSigns', checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultTaskView">Default Task View</Label>
                  <Select 
                    value={currentSettings.dashboard?.defaultTaskView || 'pending'} 
                    onValueChange={(value: 'pending' | 'completed' | 'all') => handleSettingChange('dashboard.defaultTaskView', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {userRole === 'doctor' && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoRefreshPatients">Auto Refresh Patients</Label>
                  <Switch
                    id="autoRefreshPatients"
                    checked={currentSettings.dashboard?.autoRefreshPatients || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.autoRefreshPatients', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showPatientPhotos">Show Patient Photos</Label>
                  <Switch
                    id="showPatientPhotos"
                    checked={currentSettings.dashboard?.showPatientPhotos || true}
                    onCheckedChange={(checked) => handleSettingChange('dashboard.showPatientPhotos', checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultView">Default View</Label>
                  <Select 
                    value={currentSettings.dashboard?.defaultView || 'overview'} 
                    onValueChange={(value: 'overview' | 'patients' | 'appointments' | 'consultations') => handleSettingChange('dashboard.defaultView', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Overview</SelectItem>
                      <SelectItem value="patients">Patients</SelectItem>
                      <SelectItem value="appointments">Appointments</SelectItem>
                      <SelectItem value="consultations">Consultations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      <div className="flex justify-end space-x-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default RoleSettings;
