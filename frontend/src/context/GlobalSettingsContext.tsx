import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import GlobalSettingsService from '../services/globalSettingsService';
import { toast } from 'react-hot-toast';

// Types
interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  sidebarCollapsed: boolean;
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface DashboardSettings {
  refreshInterval: number;
  showWelcomeMessage: boolean;
  enableQuickActions: boolean;
  lab?: {
    autoRefreshResults: boolean;
    showNormalRanges: boolean;
    defaultTestView: 'grid' | 'list';
  };
  imaging?: {
    autoRefreshOrders: boolean;
    showImagePreview: boolean;
    defaultView: 'pending' | 'completed' | 'all';
  };
  reception?: {
    autoRefreshQueue: boolean;
    showPatientPhotos: boolean;
    defaultSortBy: 'time' | 'name' | 'priority';
  };
  nurse?: {
    autoRefreshTasks: boolean;
    showVitalSigns: boolean;
    defaultTaskView: 'pending' | 'completed' | 'all';
  };
}

interface SecuritySettings {
  sessionTimeout: number;
  requirePasswordChange: boolean;
  passwordExpiryDays: number;
}

interface SystemSettings {
  maintenanceMode: boolean;
  allowUserRegistration: boolean;
  enableAuditLog: boolean;
}

interface GlobalSettings {
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  security: SecuritySettings;
  system: SystemSettings;
  lastUpdated: string;
  updatedBy: string;
  version: string;
}

interface GlobalSettingsContextType {
  settings: GlobalSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<GlobalSettings>) => Promise<void>;
  applyToDashboards: (dashboardTypes: string[], settings: Partial<GlobalSettings>) => Promise<void>;
  applyAppearanceToAll: (appearance: Partial<AppearanceSettings>) => Promise<void>;
  applyNotificationsToAll: (notifications: Partial<NotificationSettings>) => Promise<void>;
  applyDashboardSettingsToAll: (dashboard: Partial<DashboardSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  getDashboardSettings: (dashboardType: string) => Promise<any>;
  getRoleSettings: (role: string) => Promise<any>;
  updateRoleSettings: (role: string, settings: any) => Promise<any>;
  exportSettings: () => Promise<any>;
  importSettings: (settings: any) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType | undefined>(undefined);

interface GlobalSettingsProviderProps {
  children: ReactNode;
}

export const GlobalSettingsProvider: React.FC<GlobalSettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load global settings on mount
  useEffect(() => {
    if (user) {
      // Add a longer delay to ensure authentication token is properly set
      const timer = setTimeout(() => {
        loadSettings();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated before making the request
      if (!user) {
        console.warn('No user found, skipping global settings load');
        setLoading(false);
        return;
      }
      
      // Check if we have a valid authentication token
      const token = localStorage.getItem('auth_token') || localStorage.getItem('AUTH_TOKEN_KEY');
      if (!token) {
        console.warn('No authentication token found, skipping global settings load');
        setLoading(false);
        return;
      }
      
      console.log('Loading global settings for user:', user.email, user.role);
      console.log('Authentication token present:', !!token);
      
      const globalSettings = await GlobalSettingsService.getGlobalSettings();
      setSettings(globalSettings);
      console.log('Global settings loaded successfully:', globalSettings);
    } catch (err: any) {
      console.error('Error loading global settings:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url,
        method: err.config?.method
      });
      
      // Set appropriate error message based on status code
      let errorMessage = 'Failed to load global settings';
      if (err.response?.status === 401) {
        errorMessage = 'Authentication required to load global settings';
      } else if (err.response?.status === 403) {
        errorMessage = 'Insufficient permissions to load global settings';
      } else if (err.response?.status === 404) {
        errorMessage = 'Global settings endpoint not found';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error while loading global settings';
      }
      
      setError(errorMessage);
      
      // Only show toast for non-authentication errors
      if (err.response?.status !== 401) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<GlobalSettings>) => {
    try {
      setError(null);
      const updatedSettings = await GlobalSettingsService.updateGlobalSettings(updates);
      setSettings(updatedSettings);
      toast.success('Global settings updated successfully');
    } catch (err: any) {
      console.error('Error updating global settings:', err);
      setError(err.message || 'Failed to update global settings');
      toast.error('Failed to update global settings');
      throw err;
    }
  };

  const applyToDashboards = async (dashboardTypes: string[], settingsToApply: Partial<GlobalSettings>) => {
    try {
      setError(null);
      const updatedSettings = await GlobalSettingsService.applySettingsToDashboards(
        dashboardTypes, 
        settingsToApply
      );
      setSettings(updatedSettings);
      toast.success(`Settings applied to ${dashboardTypes.join(', ')} dashboards`);
    } catch (err: any) {
      console.error('Error applying settings to dashboards:', err);
      setError(err.message || 'Failed to apply settings to dashboards');
      toast.error('Failed to apply settings to dashboards');
      throw err;
    }
  };

  const applyAppearanceToAll = async (appearance: Partial<AppearanceSettings>) => {
    try {
      setError(null);
      const updatedSettings = await GlobalSettingsService.applyAppearanceToAllDashboards(appearance);
      setSettings(updatedSettings);
      toast.success('Appearance settings applied to all dashboards');
    } catch (err: any) {
      console.error('Error applying appearance settings:', err);
      setError(err.message || 'Failed to apply appearance settings');
      toast.error('Failed to apply appearance settings');
      throw err;
    }
  };

  const applyNotificationsToAll = async (notifications: Partial<NotificationSettings>) => {
    try {
      setError(null);
      const updatedSettings = await GlobalSettingsService.applyNotificationsToAllDashboards(notifications);
      setSettings(updatedSettings);
      toast.success('Notification settings applied to all dashboards');
    } catch (err: any) {
      console.error('Error applying notification settings:', err);
      setError(err.message || 'Failed to apply notification settings');
      toast.error('Failed to apply notification settings');
      throw err;
    }
  };

  const applyDashboardSettingsToAll = async (dashboard: Partial<DashboardSettings>) => {
    try {
      setError(null);
      const updatedSettings = await GlobalSettingsService.applyDashboardSettingsToAll(dashboard);
      setSettings(updatedSettings);
      toast.success('Dashboard settings applied to all dashboards');
    } catch (err: any) {
      console.error('Error applying dashboard settings:', err);
      setError(err.message || 'Failed to apply dashboard settings');
      toast.error('Failed to apply dashboard settings');
      throw err;
    }
  };

  const resetToDefaults = async () => {
    try {
      setError(null);
      const resetSettings = await GlobalSettingsService.resetGlobalSettings();
      setSettings(resetSettings);
      toast.success('Global settings reset to defaults');
    } catch (err: any) {
      console.error('Error resetting global settings:', err);
      setError(err.message || 'Failed to reset global settings');
      toast.error('Failed to reset global settings');
      throw err;
    }
  };

  const getDashboardSettings = async (dashboardType: string) => {
    try {
      setError(null);
      return await GlobalSettingsService.getDashboardSettings(dashboardType);
    } catch (err: any) {
      console.error(`Error getting ${dashboardType} dashboard settings:`, err);
      setError(err.message || `Failed to get ${dashboardType} dashboard settings`);
      throw err;
    }
  };

  const getRoleSettings = async (role: string) => {
    try {
      setError(null);
      return await GlobalSettingsService.getRoleSettings(role);
    } catch (err: any) {
      console.error(`Error getting ${role} role settings:`, err);
      setError(err.message || `Failed to get ${role} role settings`);
      throw err;
    }
  };

  const updateRoleSettings = async (role: string, settings: any) => {
    try {
      setError(null);
      const updatedSettings = await GlobalSettingsService.updateRoleSettings(role, settings);
      toast.success(`${role} role settings updated successfully`);
      return updatedSettings;
    } catch (err: any) {
      console.error(`Error updating ${role} role settings:`, err);
      setError(err.message || `Failed to update ${role} role settings`);
      toast.error(`Failed to update ${role} role settings`);
      throw err;
    }
  };

  const exportSettings = async () => {
    try {
      setError(null);
      return await GlobalSettingsService.exportGlobalSettings();
    } catch (err: any) {
      console.error('Error exporting global settings:', err);
      setError(err.message || 'Failed to export global settings');
      throw err;
    }
  };

  const importSettings = async (settingsToImport: any) => {
    try {
      setError(null);
      const importedSettings = await GlobalSettingsService.importGlobalSettings(settingsToImport);
      setSettings(importedSettings);
      toast.success('Global settings imported successfully');
    } catch (err: any) {
      console.error('Error importing global settings:', err);
      setError(err.message || 'Failed to import global settings');
      toast.error('Failed to import global settings');
      throw err;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  const value: GlobalSettingsContextType = {
    settings,
    loading,
    error,
    updateSettings,
    applyToDashboards,
    applyAppearanceToAll,
    applyNotificationsToAll,
    applyDashboardSettingsToAll,
    resetToDefaults,
    getDashboardSettings,
    getRoleSettings,
    updateRoleSettings,
    exportSettings,
    importSettings,
    refreshSettings
  };

  return (
    <GlobalSettingsContext.Provider value={value}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};

export const useGlobalSettings = (): GlobalSettingsContextType => {
  const context = useContext(GlobalSettingsContext);
  if (context === undefined) {
    throw new Error('useGlobalSettings must be used within a GlobalSettingsProvider');
  }
  return context;
};
