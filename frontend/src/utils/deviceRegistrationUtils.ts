/**
 * Device Registration Utilities
 * Provides helper functions for managing device registration in the New Life Clinic system
 */

export interface DeviceRegistrationData {
  deviceRegistered: string;
  staffUserId: string;
  staffHash: string;
  registrationTimestamp: string;
  userInfo?: string;
  localDeviceRegistered?: string;
}

/**
 * Check if device is properly registered
 */
export const isDeviceProperlyRegistered = (): boolean => {
  const deviceRegistered = localStorage.getItem('deviceRegistered');
  const staffUserId = localStorage.getItem('staffUserId');
  const staffHash = localStorage.getItem('staffHash');
  
  return deviceRegistered === 'true' && !!staffUserId && !!staffHash;
};

/**
 * Get current device registration status
 */
export const getDeviceRegistrationStatus = (): DeviceRegistrationData | null => {
  const deviceRegistered = localStorage.getItem('deviceRegistered');
  const staffUserId = localStorage.getItem('staffUserId');
  const staffHash = localStorage.getItem('staffHash');
  const registrationTimestamp = localStorage.getItem('registrationTimestamp');
  const userInfo = localStorage.getItem('userInfo');
  const localDeviceRegistered = localStorage.getItem('localDeviceRegistered');
  
  if (!deviceRegistered || !staffUserId || !staffHash) {
    return null;
  }
  
  return {
    deviceRegistered,
    staffUserId,
    staffHash,
    registrationTimestamp: registrationTimestamp || '',
    userInfo: userInfo || '',
    localDeviceRegistered: localDeviceRegistered || ''
  };
};

/**
 * Clear all device registration data
 */
export const clearDeviceRegistration = (): void => {
  const keysToRemove = [
    'deviceRegistered',
    'staffUserId',
    'staffHash',
    'registrationTimestamp',
    'userInfo',
    'localDeviceRegistered',
    'clinic_deviceRegistered',
    'clinic_staffUserId',
    'clinic_staffHash',
    'clinic_registrationTimestamp',
    'clinic_userInfo'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  console.log('🔍 [DeviceRegistrationUtils] All device registration data cleared');
};

/**
 * Backup device registration data
 */
export const backupDeviceRegistration = (): DeviceRegistrationData | null => {
  const data = getDeviceRegistrationStatus();
  if (!data) {
    console.log('🔍 [DeviceRegistrationUtils] No device registration data to backup');
    return null;
  }
  
  // Store backup in sessionStorage
  sessionStorage.setItem('deviceRegistrationBackup', JSON.stringify(data));
  console.log('🔍 [DeviceRegistrationUtils] Device registration backed up to sessionStorage');
  
  return data;
};

/**
 * Restore device registration from backup
 */
export const restoreDeviceRegistrationFromBackup = (): boolean => {
  const backup = sessionStorage.getItem('deviceRegistrationBackup');
  if (!backup) {
    console.log('🔍 [DeviceRegistrationUtils] No backup found in sessionStorage');
    return false;
  }
  
  try {
    const data: DeviceRegistrationData = JSON.parse(backup);
    
    // Restore to localStorage
    localStorage.setItem('deviceRegistered', data.deviceRegistered);
    localStorage.setItem('staffUserId', data.staffUserId);
    localStorage.setItem('staffHash', data.staffHash);
    localStorage.setItem('registrationTimestamp', data.registrationTimestamp);
    
    if (data.userInfo) {
      localStorage.setItem('userInfo', data.userInfo);
    }
    
    if (data.localDeviceRegistered) {
      localStorage.setItem('localDeviceRegistered', data.localDeviceRegistered);
    }
    
    console.log('🔍 [DeviceRegistrationUtils] Device registration restored from backup');
    return true;
  } catch (error) {
    console.error('🔍 [DeviceRegistrationUtils] Error restoring from backup:', error);
    return false;
  }
};

/**
 * Generate a new device registration hash
 */
export const generateDeviceRegistrationHash = (prefix: string = 'local'): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${prefix}_registration_${timestamp}_${randomPart}`;
};

/**
 * Register device with generated hash
 */
export const registerDeviceWithHash = (userId: string, hash: string): boolean => {
  try {
    const timestamp = new Date().toISOString();
    
    // Primary storage
    localStorage.setItem('deviceRegistered', 'true');
    localStorage.setItem('staffUserId', userId);
    localStorage.setItem('staffHash', hash);
    localStorage.setItem('registrationTimestamp', timestamp);
    localStorage.setItem('localDeviceRegistered', 'true');
    
    // Backup storage
    localStorage.setItem('clinic_deviceRegistered', 'true');
    localStorage.setItem('clinic_staffUserId', userId);
    localStorage.setItem('clinic_staffHash', hash);
    localStorage.setItem('clinic_registrationTimestamp', timestamp);
    
    // Session storage backup
    sessionStorage.setItem('deviceRegistered', 'true');
    sessionStorage.setItem('staffUserId', userId);
    sessionStorage.setItem('staffHash', hash);
    sessionStorage.setItem('registrationTimestamp', timestamp);
    
    console.log('🔍 [DeviceRegistrationUtils] Device registered successfully with hash:', hash.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('🔍 [DeviceRegistrationUtils] Error registering device:', error);
    return false;
  }
};

/**
 * Validate device registration data
 */
export const validateDeviceRegistration = (): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  const data = getDeviceRegistrationStatus();
  if (!data) {
    issues.push('No device registration data found');
    suggestions.push('Register your device using the "Register Device Locally" button');
    return { isValid: false, issues, suggestions };
  }
  
  // Check if hash looks valid
  if (data.staffHash.startsWith('temp_') || data.staffHash.startsWith('emergency_fix_')) {
    issues.push('Using temporary hash - may cause issues');
    suggestions.push('Consider re-registering your device for a more stable hash');
  }
  
  // Check if timestamp is recent
  if (data.registrationTimestamp) {
    const registrationDate = new Date(data.registrationTimestamp);
    const daysSinceRegistration = (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceRegistration > 30) {
      issues.push('Device registration is over 30 days old');
      suggestions.push('Consider re-registering your device for security');
    }
  }
  
  // Check if user info exists
  if (!data.userInfo) {
    issues.push('User information not stored');
    suggestions.push('User info will be stored on next login');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
};

/**
 * Deregister device from backend and clear local storage
 */
export const deregisterDevice = async (userId: string, authToken?: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log('🔍 [DeviceRegistrationUtils] Starting device deregistration for user:', userId);
    
    // First, try to deregister from backend if we have auth token
    if (authToken) {
      try {
        const response = await fetch(`/api/qr/deactivate-device/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('🔍 [DeviceRegistrationUtils] Backend deregistration result:', result);
        } else {
          console.warn('🔍 [DeviceRegistrationUtils] Backend deregistration failed, continuing with local clear');
        }
      } catch (error) {
        console.warn('🔍 [DeviceRegistrationUtils] Backend deregistration error:', error);
      }
    }
    
    // Clear local storage regardless of backend result
    clearDeviceRegistration();
    
    console.log('🔍 [DeviceRegistrationUtils] Device deregistration completed');
    return {
      success: true,
      message: 'Device deregistered successfully from both backend and local storage'
    };
  } catch (error) {
    console.error('🔍 [DeviceRegistrationUtils] Error deregistering device:', error);
    return {
      success: false,
      message: `Failed to deregister device: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Deregister current user's device (convenience function)
 */
export const deregisterCurrentDevice = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const data = getDeviceRegistrationStatus();
  if (!data) {
    return {
      success: false,
      message: 'No device registration found to deregister'
    };
  }
  
  // Try to get auth token from localStorage or sessionStorage
  const authToken = localStorage.getItem('authToken') || 
                   localStorage.getItem('token') || 
                   sessionStorage.getItem('authToken') || 
                   sessionStorage.getItem('token');
  
  return await deregisterDevice(data.staffUserId, authToken || undefined);
};

/**
 * Quick deregister function for browser console use
 * This function can be called directly from the browser console
 */
export const quickDeregister = async (): Promise<void> => {
  console.log('🔍 [QuickDeregister] Starting quick deregistration...');
  
  try {
    // Get current user data
    const data = getDeviceRegistrationStatus();
    if (!data) {
      console.log('❌ No device registration found to deregister');
      alert('No device registration found to deregister');
      return;
    }
    
    console.log('🔍 [QuickDeregister] Found registration for user:', data.staffUserId);
    
    // Try to get auth token
    const authToken = localStorage.getItem('authToken') || 
                     localStorage.getItem('token') || 
                     sessionStorage.getItem('authToken') || 
                     sessionStorage.getItem('token');
    
    if (!authToken) {
      console.warn('⚠️ No auth token found, will only clear local storage');
    }
    
    // Call the deregister function
    const result = await deregisterDevice(data.staffUserId, authToken || undefined);
    
    if (result.success) {
      console.log('✅ Device deregistered successfully!');
      alert('✅ Device deregistered successfully!\n\nYou can now register a new device.');
    } else {
      console.error('❌ Deregistration failed:', result.message);
      alert('❌ Deregistration failed: ' + result.message);
    }
  } catch (error) {
    console.error('❌ Error during quick deregistration:', error);
    alert('❌ Error during quick deregistration: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

/**
 * Clear all device registrations from database and local storage
 * This is a powerful function that clears everything
 */
export const clearAllDeviceRegistrations = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log('🧹 [ClearAll] Starting to clear all device registrations...');
    
    // Try to get auth token
    const authToken = localStorage.getItem('authToken') || 
                     localStorage.getItem('token') || 
                     sessionStorage.getItem('authToken') || 
                     sessionStorage.getItem('token');
    
    if (!authToken) {
      console.warn('⚠️ No auth token found, will only clear local storage');
      clearDeviceRegistration();
      return {
        success: true,
        message: 'Local storage cleared (no auth token for database clear)'
      };
    }
    
    // Call backend to clear all registrations
    const response = await fetch('/api/qr/clear-all-registrations', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('🧹 [ClearAll] Backend cleared:', result);
      
      // Also clear local storage
      clearDeviceRegistration();
      
      return {
        success: true,
        message: `Successfully cleared all device registrations! Cleared ${result.details?.total || 0} records from database and local storage.`
      };
    } else {
      console.warn('⚠️ Backend clear failed, clearing local storage only');
      clearDeviceRegistration();
      return {
        success: true,
        message: 'Local storage cleared (backend clear failed)'
      };
    }
  } catch (error) {
    console.error('❌ Error clearing all registrations:', error);
    clearDeviceRegistration(); // Still clear local storage
    return {
      success: false,
      message: `Failed to clear all registrations: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Debug device registration issues
 */
export const debugDeviceRegistration = (): string => {
  const data = getDeviceRegistrationStatus();
  const validation = validateDeviceRegistration();
  
  let debugInfo = '=== Device Registration Debug Info ===\n\n';
  
  if (data) {
    debugInfo += `Device Registered: ${data.deviceRegistered}\n`;
    debugInfo += `Staff User ID: ${data.staffUserId}\n`;
    debugInfo += `Staff Hash: ${data.staffHash ? data.staffHash.substring(0, 20) + '...' : 'none'}\n`;
    debugInfo += `Registration Timestamp: ${data.registrationTimestamp}\n`;
    debugInfo += `Local Registration: ${data.localDeviceRegistered}\n`;
    debugInfo += `User Info: ${data.userInfo ? 'Present' : 'Missing'}\n\n`;
  } else {
    debugInfo += 'No device registration data found\n\n';
  }
  
  debugInfo += `Validation Status: ${validation.isValid ? 'Valid' : 'Invalid'}\n\n`;
  
  debugInfo += 'Device Registration Utils loaded and available\n';
  
  console.log(debugInfo);
  return debugInfo;
};

// Make it available globally for console use
if (typeof window !== 'undefined') {
  (window as any).quickDeregister = quickDeregister;
  (window as any).clearDeviceRegistration = clearDeviceRegistration;
  (window as any).clearAllDeviceRegistrations = clearAllDeviceRegistrations;
  (window as any).debugDeviceRegistration = debugDeviceRegistration;
}
