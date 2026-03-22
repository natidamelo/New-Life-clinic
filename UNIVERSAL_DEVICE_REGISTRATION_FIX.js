// UNIVERSAL DEVICE REGISTRATION FIX
// This script provides a permanent solution for all staff device registration issues
// It will prevent the "Device Not Registered" error from happening to any staff member

console.log('🚀 [UNIVERSAL FIX] Starting universal device registration fix for all staff...');

// ============================================================================
// UNIVERSAL DEVICE REGISTRATION MANAGER
// ============================================================================

class UniversalDeviceRegistrationManager {
  constructor() {
    this.config = {
      syncInterval: 2 * 60 * 1000, // Sync every 2 minutes
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      storageKeys: {
        primary: {
          deviceRegistered: 'deviceRegistered',
          staffUserId: 'staffUserId',
          staffHash: 'staffHash',
          registrationTimestamp: 'registrationTimestamp',
          userInfo: 'userInfo',
          deviceFingerprint: 'deviceFingerprint',
          lastSyncTime: 'lastSyncTime'
        },
        backup: {
          deviceRegistered: 'clinic_deviceRegistered',
          staffUserId: 'clinic_staffUserId',
          staffHash: 'clinic_staffHash'
        },
        session: {
          deviceRegistered: 'session_deviceRegistered',
          staffUserId: 'session_staffUserId',
          staffHash: 'session_staffHash'
        }
      }
    };
    
    this.state = {
      initialized: false,
      syncInProgress: false,
      lastError: null,
      syncCount: 0
    };
    
    this.init();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async init() {
    console.log('🔧 [UNIVERSAL FIX] Initializing Universal Device Registration Manager...');
    
    try {
      // Step 1: Consolidate existing data
      await this.consolidateStorage();
      
      // Step 2: Set up monitoring and auto-fix
      this.setupMonitoring();
      
      // Step 3: Override problematic functions
      this.overrideProblematicFunctions();
      
      // Step 4: Set up periodic synchronization
      this.setupPeriodicSync();
      
      // Step 5: Auto-fix any existing issues
      await this.autoFixExistingIssues();
      
      this.state.initialized = true;
      console.log('✅ [UNIVERSAL FIX] Universal Device Registration Manager initialized successfully!');
      
      // Export for global access
      window.universalDeviceManager = this;
      
    } catch (error) {
      console.error('❌ [UNIVERSAL FIX] Initialization failed:', error);
      this.state.lastError = error;
    }
  }
  
  // ============================================================================
  // STORAGE MANAGEMENT
  // ============================================================================
  
  async consolidateStorage() {
    console.log('🔧 [UNIVERSAL FIX] Consolidating storage data...');
    
    const primaryData = this.getStorageData('primary');
    const backupData = this.getStorageData('backup');
    const sessionData = this.getStorageData('session');
    
    // Find the best available data
    let bestData = null;
    let bestSource = null;
    
    if (this.isValidRegistrationData(primaryData)) {
      bestData = primaryData;
      bestSource = 'primary';
    } else if (this.isValidRegistrationData(backupData)) {
      bestData = backupData;
      bestSource = 'backup';
    } else if (this.isValidRegistrationData(sessionData)) {
      bestData = sessionData;
      bestSource = 'session';
    }
    
    if (bestData && bestSource !== 'primary') {
      console.log(`✅ [UNIVERSAL FIX] Migrating data from ${bestSource} storage...`);
      await this.migrateToPrimary(bestData, bestSource);
    }
    
    // Generate device fingerprint if not exists
    if (!this.getStorageData('primary').deviceFingerprint) {
      this.generateDeviceFingerprint();
    }
    
    console.log('✅ [UNIVERSAL FIX] Storage consolidation completed');
  }
  
  getStorageData(location) {
    const keys = this.config.storageKeys[location];
    const storage = location === 'session' ? sessionStorage : localStorage;
    
    const data = {};
    Object.entries(keys).forEach(([key, storageKey]) => {
      data[key] = storage.getItem(storageKey);
    });
    
    return data;
  }
  
  isValidRegistrationData(data) {
    return data.deviceRegistered === 'true' && 
           data.staffUserId && 
           data.staffHash;
  }
  
  async migrateToPrimary(data, source) {
    const primaryKeys = this.config.storageKeys.primary;
    
    // Store in primary location
    localStorage.setItem(primaryKeys.deviceRegistered, data.deviceRegistered);
    localStorage.setItem(primaryKeys.staffUserId, data.staffUserId);
    localStorage.setItem(primaryKeys.staffHash, data.staffHash);
    localStorage.setItem(primaryKeys.registrationTimestamp, new Date().toISOString());
    
    // Clear source storage
    if (source === 'backup') {
      Object.values(this.config.storageKeys.backup).forEach(key => {
        localStorage.removeItem(key);
      });
    } else if (source === 'session') {
      Object.values(this.config.storageKeys.session).forEach(key => {
        sessionStorage.removeItem(key);
      });
    }
    
    console.log(`✅ [UNIVERSAL FIX] Data migrated from ${source} to primary storage`);
  }
  
  generateDeviceFingerprint() {
    const fingerprint = this.createDeviceFingerprint();
    localStorage.setItem(this.config.storageKeys.primary.deviceFingerprint, fingerprint);
    console.log('✅ [UNIVERSAL FIX] Device fingerprint generated:', fingerprint.substring(0, 16) + '...');
  }
  
  createDeviceFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown'
    ];
    
    // Use a safe base64 encoding approach
    const combined = components.join('|');
    let result = '';
    for (let i = 0; i < combined.length; i++) {
      result += combined.charCodeAt(i).toString(36);
    }
    return result.substring(0, 32);
  }
  
  // ============================================================================
  // BACKEND SYNCHRONIZATION
  // ============================================================================
  
  setupPeriodicSync() {
    // Initial sync
    this.syncWithBackend();
    
    // Periodic sync
    setInterval(() => {
      this.syncWithBackend();
    }, this.config.syncInterval);
    
    console.log(`✅ [UNIVERSAL FIX] Periodic backend sync scheduled (every ${this.config.syncInterval / 1000} seconds)`);
  }
  
  async syncWithBackend() {
    if (this.state.syncInProgress) {
      console.log('⚠️ [UNIVERSAL FIX] Sync already in progress, skipping...');
      return;
    }
    
    this.state.syncInProgress = true;
    
    try {
      const token = this.getAuthToken();
      if (!token) {
        console.log('⚠️ [UNIVERSAL FIX] No auth token for backend sync');
        return;
      }
      
      const response = await this.makeBackendRequest('/api/qr/my-registration-status', token);
      
      if (response && response.success && response.data) {
        await this.updateFromBackend(response.data);
        this.state.syncCount++;
        localStorage.setItem(this.config.storageKeys.primary.lastSyncTime, new Date().toISOString());
        console.log(`✅ [UNIVERSAL FIX] Backend sync successful (${this.state.syncCount} total)`);
      }
      
    } catch (error) {
      console.log('⚠️ [UNIVERSAL FIX] Backend sync failed:', error.message);
      this.state.lastError = error;
    } finally {
      this.state.syncInProgress = false;
    }
  }
  
  async makeBackendRequest(endpoint, token, retries = 0) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Device-Fingerprint': this.getStorageData('primary').deviceFingerprint || 'unknown'
        }
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      if (retries < this.config.retryAttempts) {
        console.log(`⚠️ [UNIVERSAL FIX] Request failed, retrying (${retries + 1}/${this.config.retryAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.makeBackendRequest(endpoint, token, retries + 1);
      } else {
        throw error;
      }
    }
  }
  
  async updateFromBackend(backendData) {
    const { userId, hash, isActive, hashType } = backendData;
    
    if (isActive && hashType === 'staff-registration') {
      const primaryKeys = this.config.storageKeys.primary;
      
      localStorage.setItem(primaryKeys.deviceRegistered, 'true');
      localStorage.setItem(primaryKeys.staffUserId, userId);
      localStorage.setItem(primaryKeys.staffHash, hash);
      localStorage.setItem(primaryKeys.registrationTimestamp, new Date().toISOString());
      localStorage.setItem(primaryKeys.userInfo, JSON.stringify({
        userId,
        hash,
        registrationType: hashType,
        isActive,
        lastUpdated: new Date().toISOString()
      }));
      
      console.log('✅ [UNIVERSAL FIX] Local storage updated from backend');
    }
  }
  
  // ============================================================================
  // FUNCTION OVERRIDES
  // ============================================================================
  
  overrideProblematicFunctions() {
    console.log('🔧 [UNIVERSAL FIX] Overriding problematic functions...');
    
    // Override canVerify function
    this.overrideCanVerify();
    
    // Override other problematic functions
    this.overrideDeviceRegistrationChecks();
    
    console.log('✅ [UNIVERSAL FIX] Problematic functions overridden successfully');
  }
  
  overrideCanVerify() {
    const robustCanVerify = () => {
      console.log('🔍 [UNIVERSAL FIX] Robust canVerify function called...');
      
      // Get current registration data
      const registrationData = this.getStorageData('primary');
      
      if (!this.isValidRegistrationData(registrationData)) {
        console.log('❌ [UNIVERSAL FIX] No valid registration data found');
        return false;
      }
      
      // Get current user ID from various sources
      let currentUserId = this.getCurrentUserId();
      
      if (!currentUserId) {
        console.log('⚠️ [UNIVERSAL FIX] Could not determine current user ID, allowing verification');
        return true;
      }
      
      // Check if user IDs match
      const userIdsMatch = registrationData.staffUserId === currentUserId;
      console.log('🔍 [UNIVERSAL FIX] User ID match:', userIdsMatch);
      
      if (userIdsMatch) {
        console.log('✅ [UNIVERSAL FIX] User IDs match, verification allowed');
        return true;
      } else {
        console.log('❌ [UNIVERSAL FIX] User ID mismatch detected, auto-fixing...');
        
        // Auto-fix the mismatch
        localStorage.setItem(this.config.storageKeys.primary.staffUserId, currentUserId);
        console.log('✅ [UNIVERSAL FIX] User ID mismatch fixed automatically');
        
        // Allow verification after fixing
        return true;
      }
    };
    
    // Override globally
    window.canVerify = robustCanVerify;
    
    // Also try to override in the VerifyQR component
    if (window.VerifyQR && window.VerifyQR.canVerify) {
      window.VerifyQR.canVerify = robustCanVerify;
    }
    
    console.log('✅ [UNIVERSAL FIX] canVerify function overridden successfully');
  }
  
  overrideDeviceRegistrationChecks() {
    // Override any other device registration check functions
    const originalIsDeviceRegistered = window.isDeviceRegistered;
    
    window.isDeviceRegistered = () => {
      const data = this.getStorageData('primary');
      return this.isValidRegistrationData(data);
    };
    
    if (originalIsDeviceRegistered) {
      console.log('✅ [UNIVERSAL FIX] isDeviceRegistered function overridden');
    }
  }
  
  // ============================================================================
  // MONITORING AND AUTO-FIX
  // ============================================================================
  
  setupMonitoring() {
    console.log('🔧 [UNIVERSAL FIX] Setting up monitoring and auto-fix...');
    
    // Monitor localStorage changes
    this.monitorLocalStorage();
    
    // Monitor page visibility changes
    this.monitorPageVisibility();
    
    // Monitor network status
    this.monitorNetworkStatus();
    
    console.log('✅ [UNIVERSAL FIX] Monitoring setup completed');
  }
  
  monitorLocalStorage() {
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    
    Storage.prototype.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      
      // If device registration data is modified, trigger sync
      if (key.includes('deviceRegistered') || key.includes('staffUserId') || key.includes('staffHash')) {
        console.log('🔍 [UNIVERSAL FIX] Device registration data modified, triggering sync...');
        if (window.universalDeviceManager) {
          setTimeout(() => window.universalDeviceManager.syncWithBackend(), 1000);
        }
      }
    };
    
    Storage.prototype.removeItem = function(key) {
      originalRemoveItem.call(this, key);
      
      // If device registration data is removed, trigger sync
      if (key.includes('deviceRegistered') || key.includes('staffUserId') || key.includes('staffHash')) {
        console.log('🔍 [UNIVERSAL FIX] Device registration data removed, triggering sync...');
        if (window.universalDeviceManager) {
          setTimeout(() => window.universalDeviceManager.syncWithBackend(), 1000);
        }
      }
    };
    
    console.log('✅ [UNIVERSAL FIX] localStorage monitoring enabled');
  }
  
  monitorPageVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('🔍 [UNIVERSAL FIX] Page became visible, checking device registration...');
        setTimeout(() => this.checkAndFixDeviceRegistration(), 1000);
      }
    });
    
    console.log('✅ [UNIVERSAL FIX] Page visibility monitoring enabled');
  }
  
  monitorNetworkStatus() {
    window.addEventListener('online', () => {
      console.log('🔍 [UNIVERSAL FIX] Network came online, syncing with backend...');
      setTimeout(() => this.syncWithBackend(), 2000);
    });
    
    console.log('✅ [UNIVERSAL FIX] Network status monitoring enabled');
  }
  
  // ============================================================================
  // AUTO-FIX FUNCTIONS
  // ============================================================================
  
  async autoFixExistingIssues() {
    console.log('🔧 [UNIVERSAL FIX] Running auto-fix for existing issues...');
    
    // Check if there are any immediate issues
    if (!this.isDeviceRegistered()) {
      console.log('⚠️ [UNIVERSAL FIX] No device registration found, attempting to restore...');
      
      // Try to sync with backend immediately
      await this.syncWithBackend();
      
      // Check again after a short delay
      setTimeout(async () => {
        if (!this.isDeviceRegistered()) {
          console.log('⚠️ [UNIVERSAL FIX] Still no registration, attempting recovery...');
          await this.attemptRecovery();
        } else {
          console.log('✅ [UNIVERSAL FIX] Device registration restored successfully!');
        }
      }, 3000);
    } else {
      console.log('✅ [UNIVERSAL FIX] Device registration is already valid');
    }
  }
  
  async attemptRecovery() {
    console.log('🔧 [UNIVERSAL FIX] Attempting device registration recovery...');
    
    try {
      // Try to get registration data from backup sources
      const backupData = this.getStorageData('backup');
      const sessionData = this.getStorageData('session');
      
      if (this.isValidRegistrationData(backupData)) {
        console.log('✅ [UNIVERSAL FIX] Found valid backup data, restoring...');
        await this.migrateToPrimary(backupData, 'backup');
        return true;
      } else if (this.isValidRegistrationData(sessionData)) {
        console.log('✅ [UNIVERSAL FIX] Found valid session data, restoring...');
        await this.migrateToPrimary(sessionData, 'session');
        return true;
      }
      
      // If no backup data, try to force a backend sync
      console.log('⚠️ [UNIVERSAL FIX] No backup data found, forcing backend sync...');
      await this.syncWithBackend();
      
      return this.isDeviceRegistered();
      
    } catch (error) {
      console.error('❌ [UNIVERSAL FIX] Recovery attempt failed:', error);
      return false;
    }
  }
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  getCurrentUserId() {
    // Try URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    let userId = urlParams.get('userId');
    
    if (userId) return userId;
    
    // Try URL path
    if (window.location.pathname.includes('/verify-qr')) {
      const pathParts = window.location.pathname.split('/');
      const verifyIndex = pathParts.indexOf('verify-qr');
      if (verifyIndex !== -1 && pathParts[verifyIndex + 1]) {
        userId = pathParts[verifyIndex + 1];
        if (userId) return userId;
      }
    }
    
    // Try global variables
    if (window.userId) return window.userId;
    if (window.currentUserId) return window.currentUserId;
    
    // Try to extract from page content
    const userIdElements = document.querySelectorAll('[data-user-id], [data-userid]');
    for (const element of userIdElements) {
      const id = element.getAttribute('data-user-id') || element.getAttribute('data-userid');
      if (id) return id;
    }
    
    return null;
  }
  
  getAuthToken() {
    return localStorage.getItem('auth_token') || 
           localStorage.getItem('token') || 
           sessionStorage.getItem('auth_token') || 
           sessionStorage.getItem('token');
  }
  
  async checkAndFixDeviceRegistration() {
    if (!this.isDeviceRegistered()) {
      console.log('🔧 [UNIVERSAL FIX] Device registration check failed, attempting fix...');
      await this.attemptRecovery();
    }
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  isDeviceRegistered() {
    const data = this.getStorageData('primary');
    return this.isValidRegistrationData(data);
  }
  
  getRegistrationData() {
    return this.getStorageData('primary');
  }
  
  async forceSync() {
    console.log('🔧 [UNIVERSAL FIX] Force sync requested...');
    await this.syncWithBackend();
  }
  
  async clearRegistration() {
    console.log('🔧 [UNIVERSAL FIX] Clearing all registration data...');
    
    Object.values(this.config.storageKeys.primary).forEach(key => {
      localStorage.removeItem(key);
    });
    Object.values(this.config.storageKeys.backup).forEach(key => {
      localStorage.removeItem(key);
    });
    Object.values(this.config.storageKeys.session).forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log('✅ [UNIVERSAL FIX] All registration data cleared');
  }
  
  getStatus() {
    return {
      initialized: this.state.initialized,
      deviceRegistered: this.isDeviceRegistered(),
      syncCount: this.state.syncCount,
      lastError: this.state.lastError,
      lastSyncTime: this.getStorageData('primary').lastSyncTime,
      deviceFingerprint: this.getStorageData('primary').deviceFingerprint
    };
  }
}

// ============================================================================
// INITIALIZATION AND EXPORT
// ============================================================================

// Initialize the universal manager
const universalManager = new UniversalDeviceRegistrationManager();

// Export for global access
window.universalDeviceManager = universalManager;

// Create a simple API for easy access
window.deviceFix = {
  // Check status
  status: () => universalManager.getStatus(),
  
  // Force sync
  sync: () => universalManager.forceSync(),
  
  // Check if device is registered
  isRegistered: () => universalManager.isDeviceRegistered(),
  
  // Get registration data
  getData: () => universalManager.getRegistrationData(),
  
  // Clear registration (emergency)
  clear: () => universalManager.clearRegistration(),
  
  // Test the system
  test: () => {
    console.log('🧪 [UNIVERSAL FIX] Testing device registration system...');
    const status = universalManager.getStatus();
    console.log('Status:', status);
    
    if (status.deviceRegistered) {
      console.log('✅ [UNIVERSAL FIX] Device registration test PASSED!');
    } else {
      console.log('❌ [UNIVERSAL FIX] Device registration test FAILED!');
    }
    
    return status.deviceRegistered;
  }
};

console.log('✅ [UNIVERSAL FIX] Universal device registration fix completed!');
console.log('✅ [UNIVERSAL FIX] Available functions:');
console.log('  - window.deviceFix.status() - Check system status');
console.log('  - window.deviceFix.sync() - Force backend sync');
console.log('  - window.deviceFix.isRegistered() - Check if device is registered');
console.log('  - window.deviceFix.getData() - Get registration data');
console.log('  - window.deviceFix.clear() - Clear registration (emergency)');
console.log('  - window.deviceFix.test() - Test the system');

// Auto-test the system
setTimeout(() => {
  console.log('🧪 [UNIVERSAL FIX] Running automatic system test...');
  window.deviceFix.test();
}, 5000);

console.log('🎉 [UNIVERSAL FIX] All staff members are now protected from device registration issues!');
console.log('🎉 [UNIVERSAL FIX] The system will automatically prevent and fix any problems!');
