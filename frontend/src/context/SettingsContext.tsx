import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import SettingsService from '../services/settingsService';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

// Define types for settings
interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  colorTheme: 'default-light' | 'default-dark' | 'aqua' | 'teal' | 'light-blue' | 'rose' | 'pink' | 'gold' | 'orange' | 'charcoal' | 'navy' | 'indigo' | 'purple' | 'maroon' | 'forest-green' | 'blue' | 'green' | 'red' | 'gray' | 'slate' | 'zinc' | 'neutral' | 'stone' | 'emerald' | 'cyan' | 'sky' | 'violet' | 'fuchsia' | 'amber' | 'lime' | 'cool-breeze' | 'icy-mint' | 'custom';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
}

interface NotificationSettings {
  enabled: boolean;
  email: {
    enabled: boolean;
    appointmentReminders: boolean;
    prescriptionAlerts: boolean;
    labResults: boolean;
    systemUpdates: boolean;
  };
  sms: {
    enabled: boolean;
    appointmentReminders: boolean;
    urgentAlerts: boolean;
  };
  push: {
    enabled: boolean;
    appointmentReminders: boolean;
    medicationAlerts: boolean;
  };
}

interface DashboardSettings {
  defaultView: 'overview' | 'patients' | 'appointments' | 'consultations';
  widgets: string[];
  refreshInterval: number;
}

interface PrivacySettings {
  dataSharing: boolean;
  analytics: boolean;
  sessionTimeout: number;
}

interface SecuritySettings {
  twoFactorAuth: {
    enabled: boolean;
    method: 'email' | 'sms' | 'app';
  };
  loginNotifications: boolean;
  passwordPolicy: {
    minLength: number;
    requireSpecialChars: boolean;
    requireNumbers: boolean;
  };
}

interface LocalizationSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12' | '24';
}

interface AdvancedSettings {
  autoSave: boolean;
  debugMode: boolean;
  performanceMode: boolean;
  experimentalFeatures: boolean;
}

interface UserPreferences {
  _id?: string;
  userId: string;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  privacy: PrivacySettings;
  security: SecuritySettings;
  localization: LocalizationSettings;
  advanced: AdvancedSettings;
  lastUpdated: string;
  version: string;
}

interface SettingsContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updatePreferenceSection: (section: keyof UserPreferences, data: any) => Promise<void>;
  toggleSetting: (path: string, value?: boolean) => Promise<void>;
  resetPreferences: () => Promise<void>;
  
  // Quick access methods
  getTheme: () => 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => Promise<void>;
  getColorTheme: () => string;
  setColorTheme: (colorTheme: string) => Promise<void>;
  isNotificationEnabled: (type: string) => boolean;
  toggleNotification: (type: string, enabled?: boolean) => Promise<void>;
  
  // Profile management
  updateProfile: (profileData: any) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Device management
  getDevices: () => Promise<any[]>;
  revokeDevice: (deviceId: string) => Promise<void>;
  
  // Data management
  exportData: () => Promise<any>;
  deleteAccount: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences when user changes
  useEffect(() => {
    if (user) {
      loadPreferences();
    } else {
      setPreferences(null);
    }
  }, [user]);

  // Apply theme changes to document - DISABLED to prevent conflict with EnhancedThemeProvider
  // useEffect(() => {
  //   if (preferences?.appearance?.theme) {
  //     applyTheme(preferences.appearance.theme);
  //   }
  // }, [preferences?.appearance?.theme]);

  const loadPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await SettingsService.getUserPreferences();
      setPreferences(response.data);
      
      // Apply settings to document
      applySettings(response.data);
    } catch (err: any) {
      console.error('Error loading preferences:', err);
      setError(err.message || 'Failed to load preferences');
      
      // Fallback to localStorage if API fails
      const localSettings = localStorage.getItem('userSettings');
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings);
          setPreferences(parsed);
          applySettings(parsed);
        } catch (localErr) {
          console.error('Error parsing local settings:', localErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const applySettings = (prefs: UserPreferences) => {
    // Apply theme - DISABLED to prevent conflict with EnhancedThemeProvider
    // if (prefs.appearance?.theme) {
    //   applyTheme(prefs.appearance.theme);
    // }
    
    // Apply font size
    if (prefs.appearance?.fontSize) {
      applyFontSize(prefs.appearance.fontSize);
    }
    
    // Apply compact mode
    if (prefs.appearance?.compactMode) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark', 'auto');
    body.classList.remove('bg-muted', 'text-primary-foreground', 'bg-primary-foreground', 'text-muted-foreground');
    
    // Apply new theme
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
      if (prefersDark) {
        body.classList.add('bg-muted', 'text-primary-foreground');
      } else {
        body.classList.add('bg-primary-foreground', 'text-muted-foreground');
      }
    } else {
      root.classList.add(theme);
      if (theme === 'dark') {
        body.classList.add('bg-muted', 'text-primary-foreground');
      } else {
        body.classList.add('bg-primary-foreground', 'text-muted-foreground');
      }
    }
    
    // Store in localStorage as fallback
    localStorage.setItem('theme', theme);
  };

  const applyFontSize = (size: 'small' | 'medium' | 'large') => {
    const root = document.documentElement;
    
    // Remove existing font size classes
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    
    // Apply new font size
    switch (size) {
      case 'small':
        root.classList.add('text-sm');
        break;
      case 'medium':
        root.classList.add('text-base');
        break;
      case 'large':
        root.classList.add('text-lg');
        break;
    }
    
    localStorage.setItem('fontSize', size);
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedPreferences = { ...preferences, ...updates };
      const response = await SettingsService.updateUserPreferences(updatedPreferences);
      
      setPreferences(response.data);
      applySettings(response.data);
      
      // Also save to localStorage as backup
      localStorage.setItem('userSettings', JSON.stringify(response.data));
      
      toast.success('Settings updated successfully');
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setError(err.message || 'Failed to update preferences');
      toast.error('Failed to update settings');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePreferenceSection = async (section: keyof UserPreferences, data: any) => {
    if (!preferences) return;
    
    try {
      const response = await SettingsService.updatePreferenceSection(section, data);
      setPreferences(response.data);
      applySettings(response.data);
      
      // Save to localStorage as backup
      localStorage.setItem('userSettings', JSON.stringify(response.data));
      
      toast.success(`${section} settings updated successfully`);
    } catch (err: any) {
      console.error(`Error updating ${section} preferences:`, err);
      toast.error(`Failed to update ${section} settings`);
      throw err;
    }
  };

  const toggleSetting = async (path: string, value?: boolean) => {
    if (!preferences) return;
    
    try {
      const response = await SettingsService.toggleSetting(path, value);
      setPreferences(response.data);
      applySettings(response.data);
      
      // Save to localStorage as backup
      localStorage.setItem('userSettings', JSON.stringify(response.data));
      
      const settingName = path.split('.').pop() || path;
      toast.success(`${settingName} ${value !== undefined ? (value ? 'enabled' : 'disabled') : 'toggled'}`);
    } catch (err: any) {
      console.error(`Error toggling setting ${path}:`, err);
      toast.error(`Failed to toggle ${path}`);
      throw err;
    }
  };

  const resetPreferences = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await SettingsService.resetUserPreferences();
      setPreferences(response.data);
      applySettings(response.data);
      
      // Clear localStorage backup
      localStorage.removeItem('userSettings');
      
      toast.success('Settings reset to defaults');
    } catch (err: any) {
      console.error('Error resetting preferences:', err);
      setError(err.message || 'Failed to reset preferences');
      toast.error('Failed to reset settings');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTheme = (): 'light' | 'dark' | 'auto' => {
    return preferences?.appearance?.theme || 'light';
  };

  const setTheme = async (theme: 'light' | 'dark' | 'auto') => {
    await updatePreferenceSection('appearance', { theme });
  };

  const getColorTheme = (): string => {
    return preferences?.appearance?.colorTheme || 'default-light';
  };

  const setColorTheme = async (colorTheme: string) => {
    await updatePreferenceSection('appearance', { colorTheme });
  };

  const isNotificationEnabled = (type: string): boolean => {
    if (!preferences?.notifications) return false;
    
    const keys = type.split('.');
    let current: any = preferences.notifications;
    
    for (const key of keys) {
      current = current?.[key];
      if (current === undefined) return false;
    }
    
    return Boolean(current);
  };

  const toggleNotification = async (type: string, enabled?: boolean) => {
    await toggleSetting(`notifications.${type}`, enabled);
  };

  const updateProfile = async (profileData: any) => {
    try {
      const response = await SettingsService.updateUserProfile(profileData);
      toast.success('Profile updated successfully');
      return response.data;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
      throw err;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await SettingsService.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
    } catch (err: any) {
      console.error('Error changing password:', err);
      toast.error(err.message || 'Failed to change password');
      throw err;
    }
  };

  const getDevices = async () => {
    try {
      const response = await SettingsService.getUserDevices();
      return response.data;
    } catch (err: any) {
      console.error('Error getting devices:', err);
      toast.error('Failed to load devices');
      throw err;
    }
  };

  const revokeDevice = async (deviceId: string) => {
    try {
      await SettingsService.revokeDevice(deviceId);
      toast.success('Device revoked successfully');
    } catch (err: any) {
      console.error('Error revoking device:', err);
      toast.error('Failed to revoke device');
      throw err;
    }
  };

  const exportData = async () => {
    try {
      const response = await SettingsService.exportUserData();
      toast.success('Data export ready');
      return response.data;
    } catch (err: any) {
      console.error('Error exporting data:', err);
      toast.error('Failed to export data');
      throw err;
    }
  };

  const deleteAccount = async () => {
    try {
      await SettingsService.deleteUserAccount();
      toast.success('Account deleted successfully');
    } catch (err: any) {
      console.error('Error deleting account:', err);
      toast.error('Failed to delete account');
      throw err;
    }
  };

  const value: SettingsContextType = {
    preferences,
    loading,
    error,
    updatePreferences,
    updatePreferenceSection,
    toggleSetting,
    resetPreferences,
    getTheme,
    setTheme,
    getColorTheme,
    setColorTheme,
    isNotificationEnabled,
    toggleNotification,
    updateProfile,
    changePassword,
    getDevices,
    revokeDevice,
    exportData,
    deleteAccount,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
