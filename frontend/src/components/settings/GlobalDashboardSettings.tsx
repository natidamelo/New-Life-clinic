import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Monitor, 
  Bell, 
  Settings, 
  Palette, 
  RefreshCw, 
  Download, 
  Upload,
  RotateCcw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface GlobalDashboardSettingsProps {
  onClose?: () => void;
}

const GlobalDashboardSettings: React.FC<GlobalDashboardSettingsProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { 
    settings, 
    loading, 
    error, 
    applyAppearanceToAll, 
    applyNotificationsToAll, 
    applyDashboardSettingsToAll,
    resetToDefaults,
    exportSettings,
    importSettings
  } = useGlobalSettings();

  // Local state for form data
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light' as 'light' | 'dark' | 'auto',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    compactMode: false,
    sidebarCollapsed: false
  });

  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    soundEnabled: true,
    desktopNotifications: true,
    emailNotifications: true,
    smsNotifications: false
  });

  const [dashboardSettings, setDashboardSettings] = useState({
    refreshInterval: 30000,
    showWelcomeMessage: true,
    enableQuickActions: true
  });

  const [isApplying, setIsApplying] = useState(false);
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>(['lab', 'imaging', 'reception', 'nurse']);

  // Update local state when global settings change
  useEffect(() => {
    if (settings) {
      setAppearanceSettings(settings.appearance);
      setNotificationSettings(settings.notifications);
      setDashboardSettings({
        refreshInterval: settings.dashboard.refreshInterval,
        showWelcomeMessage: settings.dashboard.showWelcomeMessage,
        enableQuickActions: settings.dashboard.enableQuickActions
      });
    }
  }, [settings]);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">Access Denied</h3>
          <p className="text-muted-foreground">Only administrators can manage global dashboard settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading global settings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">Error Loading Settings</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const handleDashboardToggle = (dashboardType: string) => {
    setSelectedDashboards(prev => 
      prev.includes(dashboardType) 
        ? prev.filter(d => d !== dashboardType)
        : [...prev, dashboardType]
    );
  };

  const handleApplyAppearance = async () => {
    try {
      setIsApplying(true);
      await applyAppearanceToAll(appearanceSettings);
    } catch (error) {
      console.error('Error applying appearance settings:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyNotifications = async () => {
    try {
      setIsApplying(true);
      await applyNotificationsToAll(notificationSettings);
    } catch (error) {
      console.error('Error applying notification settings:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyDashboardSettings = async () => {
    try {
      setIsApplying(true);
      await applyDashboardSettingsToAll(dashboardSettings);
    } catch (error) {
      console.error('Error applying dashboard settings:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (window.confirm('Are you sure you want to reset all global settings to defaults? This action cannot be undone.')) {
      try {
        setIsApplying(true);
        await resetToDefaults();
      } catch (error) {
        console.error('Error resetting settings:', error);
      } finally {
        setIsApplying(false);
      }
    }
  };

  const handleExportSettings = async () => {
    try {
      const exportData = await exportSettings();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `global-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('Failed to export settings');
    }
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        await importSettings(importData.settings);
      } catch (error) {
        console.error('Error importing settings:', error);
        toast.error('Failed to import settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const dashboardTypes = [
    { id: 'lab', name: 'Laboratory', icon: '🧪' },
    { id: 'imaging', name: 'Imaging', icon: '📷' },
    { id: 'reception', name: 'Reception', icon: '🏥' },
    { id: 'nurse', name: 'Nurse', icon: '👩‍⚕️' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-muted-foreground">Global Dashboard Settings</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportSettings}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label htmlFor="import-settings">
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
          </label>
          <input
            id="import-settings"
            type="file"
            accept=".json"
            onChange={handleImportSettings}
            className="hidden"
          />
          <Button variant="outline" onClick={handleResetToDefaults} disabled={isApplying}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Dashboard Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Select Dashboards to Apply Settings
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dashboardTypes.map((dashboard) => (
            <div key={dashboard.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={dashboard.id}
                checked={selectedDashboards.includes(dashboard.id)}
                onChange={() => handleDashboardToggle(dashboard.id)}
                className="rounded border-border/40"
              />
              <label htmlFor={dashboard.id} className="flex items-center space-x-2 cursor-pointer">
                <span className="text-lg">{dashboard.icon}</span>
                <span className="text-sm font-medium">{dashboard.name}</span>
              </label>
            </div>
          ))}
        </div>
      </Card>

      {/* Appearance Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Palette className="h-5 w-5 mr-2" />
          Appearance Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={appearanceSettings.theme} onValueChange={(value: any) => 
                setAppearanceSettings(prev => ({ ...prev, theme: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fontSize">Font Size</Label>
              <Select value={appearanceSettings.fontSize} onValueChange={(value: any) => 
                setAppearanceSettings(prev => ({ ...prev, fontSize: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="primaryColor">Primary Color</Label>
              <Input
                type="color"
                value={appearanceSettings.primaryColor}
                onChange={(e) => setAppearanceSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <Input
                type="color"
                value={appearanceSettings.secondaryColor}
                onChange={(e) => setAppearanceSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="compactMode"
                checked={appearanceSettings.compactMode}
                onCheckedChange={(checked) => 
                  setAppearanceSettings(prev => ({ ...prev, compactMode: checked }))
                }
              />
              <Label htmlFor="compactMode">Compact Mode</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="sidebarCollapsed"
                checked={appearanceSettings.sidebarCollapsed}
                onCheckedChange={(checked) => 
                  setAppearanceSettings(prev => ({ ...prev, sidebarCollapsed: checked }))
                }
              />
              <Label htmlFor="sidebarCollapsed">Collapsed Sidebar</Label>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button 
            onClick={handleApplyAppearance} 
            disabled={isApplying}
            className="w-full"
          >
            {isApplying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Appearance to All Dashboards
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Notification Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="notificationsEnabled"
                checked={notificationSettings.enabled}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, enabled: checked }))
                }
              />
              <Label htmlFor="notificationsEnabled">Enable Notifications</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="soundEnabled"
                checked={notificationSettings.soundEnabled}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, soundEnabled: checked }))
                }
              />
              <Label htmlFor="soundEnabled">Sound Notifications</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="desktopNotifications"
                checked={notificationSettings.desktopNotifications}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, desktopNotifications: checked }))
                }
              />
              <Label htmlFor="desktopNotifications">Desktop Notifications</Label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="emailNotifications"
                checked={notificationSettings.emailNotifications}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                }
              />
              <Label htmlFor="emailNotifications">Email Notifications</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="smsNotifications"
                checked={notificationSettings.smsNotifications}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))
                }
              />
              <Label htmlFor="smsNotifications">SMS Notifications</Label>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button 
            onClick={handleApplyNotifications} 
            disabled={isApplying}
            className="w-full"
          >
            {isApplying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Notifications to All Dashboards
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Dashboard Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Monitor className="h-5 w-5 mr-2" />
          Dashboard Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
              <Input
                type="number"
                id="refreshInterval"
                value={dashboardSettings.refreshInterval / 1000}
                onChange={(e) => setDashboardSettings(prev => ({ 
                  ...prev, 
                  refreshInterval: parseInt(e.target.value) * 1000 
                }))}
                min="5"
                max="300"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="showWelcomeMessage"
                checked={dashboardSettings.showWelcomeMessage}
                onCheckedChange={(checked) => 
                  setDashboardSettings(prev => ({ ...prev, showWelcomeMessage: checked }))
                }
              />
              <Label htmlFor="showWelcomeMessage">Show Welcome Message</Label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enableQuickActions"
                checked={dashboardSettings.enableQuickActions}
                onCheckedChange={(checked) => 
                  setDashboardSettings(prev => ({ ...prev, enableQuickActions: checked }))
                }
              />
              <Label htmlFor="enableQuickActions">Enable Quick Actions</Label>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button 
            onClick={handleApplyDashboardSettings} 
            disabled={isApplying}
            className="w-full"
          >
            {isApplying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Dashboard Settings to All Dashboards
              </>
            )}
          </Button>
        </div>
      </Card>

      {onClose && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

export default GlobalDashboardSettings;
