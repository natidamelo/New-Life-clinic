// clearCache.js
// Utility to clear the cache from localStorage

/**
 * Clears localStorage cached data that might be causing stale displays
 */
export const clearLocalStorageCache = () => {
  console.log('Clearing local storage cache...');
  
  // List of cache keys that might need clearing
  const cacheKeys = [
    'patients',
    'patientData',
    'doctorPatients',
    'dashboardStats',
    'prescriptions',
    'appointments',
    'labResults'
  ];
  
  // Clear all specified cache keys
  cacheKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Cleared cache: ${key}`);
  });
  
  // Look for any other cache keys
  for(let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('cache') || key.includes('data') || key.includes('patient'))) {
      localStorage.removeItem(key);
      console.log(`Cleared additional cache: ${key}`);
    }
  }
  
  console.log('Cache clearing completed');
  return true;
};

/**
 * Clears session storage cached data
 */
export const clearSessionStorageCache = () => {
  console.log('Clearing session storage cache...');
  
  // List of cache keys that might need clearing
  const cacheKeys = [
    'patients',
    'patientData',
    'doctorPatients',
    'dashboardStats',
    'prescriptions',
    'appointments',
    'labResults'
  ];
  
  // Clear all specified cache keys
  cacheKeys.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`Cleared session cache: ${key}`);
  });
  
  console.log('Session cache clearing completed');
  return true;
};

/**
 * Forces a complete page refresh, clearing cache
 */
export const forcePageRefresh = () => {
  console.log('Forcing page refresh...');
  
  // Clear all caches
  clearLocalStorageCache();
  clearSessionStorageCache();
  
  // Reload the page with cache busting
  window.location.href = window.location.href.split('?')[0] + '?t=' + new Date().getTime();
};

export default {
  clearLocalStorageCache,
  clearSessionStorageCache,
  forcePageRefresh
}; 