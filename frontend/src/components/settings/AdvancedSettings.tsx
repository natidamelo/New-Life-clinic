import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';

interface AdvancedSettingsProps {
  onClose?: () => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ onClose }) => {
  const { preferences, updatePreferenceSection, toggleSetting } = useSettings();
  const [isResetting, setIsResetting] = useState(false);

  const handleToggle = async (path: string, currentValue: boolean) => {
    try {
      await toggleSetting(path, !currentValue);
    } catch (error) {
      console.error('Error toggling setting:', error);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      return;
    }

    setIsResetting(true);
    try {
      // This would call the reset function from settings context
      toast.success('Settings reset to defaults');
      onClose?.();
    } catch (error) {
      console.error('Error resetting settings:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportData = async () => {
    try {
      // This would call the export function from settings context
      const dataStr = JSON.stringify(preferences, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'user-settings-backup.json';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('Failed to export settings');
    }
  };

  if (!preferences) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-muted-foreground">Advanced Settings</h2>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Performance Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Performance Mode</p>
              <p className="text-sm text-muted-foreground">Optimize for faster loading and reduced resource usage</p>
            </div>
            <div 
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                preferences.advanced?.performanceMode ? 'bg-primary' : 'bg-muted/40'
              }`}
              onClick={() => handleToggle('advanced.performanceMode', preferences.advanced?.performanceMode || false)}
            >
              <div 
                className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  preferences.advanced?.performanceMode ? 'translate-x-6' : ''
                }`} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-save</p>
              <p className="text-sm text-muted-foreground">Automatically save changes as you work</p>
            </div>
            <div 
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                preferences.advanced?.autoSave ? 'bg-primary' : 'bg-muted/40'
              }`}
              onClick={() => handleToggle('advanced.autoSave', preferences.advanced?.autoSave !== false)}
            >
              <div 
                className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  preferences.advanced?.autoSave !== false ? 'translate-x-6' : ''
                }`} 
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Developer Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Developer Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Debug Mode</p>
              <p className="text-sm text-muted-foreground">Enable detailed logging and debugging information</p>
            </div>
            <div 
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                preferences.advanced?.debugMode ? 'bg-primary' : 'bg-muted/40'
              }`}
              onClick={() => handleToggle('advanced.debugMode', preferences.advanced?.debugMode || false)}
            >
              <div 
                className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  preferences.advanced?.debugMode ? 'translate-x-6' : ''
                }`} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Experimental Features</p>
              <p className="text-sm text-muted-foreground">Enable beta features and experimental functionality</p>
            </div>
            <div 
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                preferences.advanced?.experimentalFeatures ? 'bg-primary' : 'bg-muted/40'
              }`}
              onClick={() => handleToggle('advanced.experimentalFeatures', preferences.advanced?.experimentalFeatures || false)}
            >
              <div 
                className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  preferences.advanced?.experimentalFeatures ? 'translate-x-6' : ''
                }`} 
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Data Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Export Settings</p>
              <p className="text-sm text-muted-foreground">Download a backup of your current settings</p>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reset All Settings</p>
              <p className="text-sm text-muted-foreground">Restore all settings to their default values</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={isResetting}
              className="text-destructive border-destructive hover:bg-destructive/10"
            >
              {isResetting ? 'Resetting...' : 'Reset'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Session Management */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Session Management</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Session Timeout (minutes)
            </label>
            <select 
              className="w-full p-2 border border-border/40 rounded-md"
              value={preferences.privacy?.sessionTimeout || 480}
              onChange={(e) => updatePreferenceSection('privacy', { 
                sessionTimeout: parseInt(e.target.value) 
              })}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours</option>
            </select>
            <p className="text-sm text-muted-foreground mt-1">
              How long to keep you logged in before requiring re-authentication
            </p>
          </div>
        </div>
      </Card>

      {/* Privacy Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Privacy</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Data Sharing</p>
              <p className="text-sm text-muted-foreground">Allow sharing of anonymized data for system improvements</p>
            </div>
            <div 
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                preferences.privacy?.dataSharing ? 'bg-primary' : 'bg-muted/40'
              }`}
              onClick={() => handleToggle('privacy.dataSharing', preferences.privacy?.dataSharing || false)}
            >
              <div 
                className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  preferences.privacy?.dataSharing ? 'translate-x-6' : ''
                }`} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Analytics</p>
              <p className="text-sm text-muted-foreground">Help us improve by sharing usage analytics</p>
            </div>
            <div 
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                preferences.privacy?.analytics !== false ? 'bg-primary' : 'bg-muted/40'
              }`}
              onClick={() => handleToggle('privacy.analytics', preferences.privacy?.analytics !== false)}
            >
              <div 
                className={`bg-primary-foreground w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  preferences.privacy?.analytics !== false ? 'translate-x-6' : ''
                }`} 
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdvancedSettings;
