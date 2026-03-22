import { useEffect, useState } from 'react';
import { useGlobalSettings } from '../context/GlobalSettingsContext';

interface DashboardSettings {
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    secondaryColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    sidebarCollapsed: boolean;
  };
  notifications: {
    enabled: boolean;
    soundEnabled: boolean;
    desktopNotifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
  dashboard: {
    refreshInterval: number;
    showWelcomeMessage: boolean;
    enableQuickActions: boolean;
    [key: string]: any; // For dashboard-specific settings
  };
}

/**
 * Hook to get and apply role-specific settings to a specific dashboard
 * @param role - The user role ('doctor', 'lab', 'imaging', 'reception', 'nurse')
 * @returns Role-specific settings and loading state
 */
export const useGlobalDashboardSettings = (role: string) => {
  const { getRoleSettings, settings: globalSettings } = useGlobalSettings();
  const [roleSettings, setRoleSettings] = useState<DashboardSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoleSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get role-specific settings
        const settings = await getRoleSettings(role);
        setRoleSettings(settings);
      } catch (err: any) {
        console.error(`Error loading ${role} role settings:`, err);
        setError(err.message || `Failed to load ${role} role settings`);
        
        // Fallback to global settings if available
        if (globalSettings) {
          setRoleSettings({
            appearance: globalSettings.appearance,
            notifications: globalSettings.notifications,
            dashboard: globalSettings.dashboard
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadRoleSettings();
  }, [role, getRoleSettings, globalSettings]);

  // Apply appearance settings to the document
  useEffect(() => {
    if (roleSettings?.appearance) {
      applyAppearanceSettings(roleSettings.appearance);
    }
  }, [roleSettings?.appearance]);

  return {
    settings: roleSettings,
    loading,
    error,
    refreshSettings: () => {
      setLoading(true);
      // Re-trigger the effect
      setRoleSettings(null);
    }
  };
};

/**
 * Apply appearance settings to the document
 */
const applyAppearanceSettings = (appearance: DashboardSettings['appearance']) => {
  const root = document.documentElement;
  const body = document.body;

  // Apply theme
  if (appearance.theme) {
    root.classList.remove('light', 'dark', 'auto');
    root.classList.add(appearance.theme);
    
    if (appearance.theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        body.classList.add('bg-muted', 'text-primary-foreground');
        body.classList.remove('bg-primary-foreground', 'text-muted-foreground');
      } else {
        body.classList.add('bg-primary-foreground', 'text-muted-foreground');
        body.classList.remove('bg-muted', 'text-primary-foreground');
      }
    } else if (appearance.theme === 'dark') {
      body.classList.add('bg-muted', 'text-primary-foreground');
      body.classList.remove('bg-primary-foreground', 'text-muted-foreground');
    } else {
      body.classList.add('bg-primary-foreground', 'text-muted-foreground');
      body.classList.remove('bg-muted', 'text-primary-foreground');
    }
  }

  // Apply font size
  if (appearance.fontSize) {
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    root.classList.add(`text-${appearance.fontSize === 'small' ? 'sm' : appearance.fontSize === 'large' ? 'lg' : 'base'}`);
  }

  // Apply compact mode
  if (appearance.compactMode) {
    root.classList.add('compact-mode');
  } else {
    root.classList.remove('compact-mode');
  }

  // Apply custom CSS variables for colors
  if (appearance.primaryColor) {
    root.style.setProperty('--primary-color', appearance.primaryColor);
  }
  
  if (appearance.secondaryColor) {
    root.style.setProperty('--secondary-color', appearance.secondaryColor);
  }
};

/**
 * Hook to get refresh interval for dashboard auto-refresh
 */
export const useDashboardRefreshInterval = (role: string) => {
  const { settings } = useGlobalDashboardSettings(role);
  return settings?.dashboard?.refreshInterval || 30000; // Default 30 seconds
};

/**
 * Hook to check if notifications are enabled
 */
export const useDashboardNotifications = (role: string) => {
  const { settings } = useGlobalDashboardSettings(role);
  return {
    enabled: settings?.notifications?.enabled ?? true,
    soundEnabled: settings?.notifications?.soundEnabled ?? true,
    desktopNotifications: settings?.notifications?.desktopNotifications ?? true,
    emailNotifications: settings?.notifications?.emailNotifications ?? true,
    smsNotifications: settings?.notifications?.smsNotifications ?? false
  };
};

/**
 * Hook to get role-specific settings
 */
export const useRoleSpecificSettings = (role: string) => {
  const { settings } = useGlobalDashboardSettings(role);
  return settings?.dashboard || {};
};
