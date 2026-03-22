// Utility to reset theme settings and force a fresh start
export const resetThemeSettings = () => {
  console.log('🔄 Resetting theme settings...');
  
  // Clear all theme-related localStorage
  localStorage.removeItem('themeMode');
  localStorage.removeItem('colorTheme');
  localStorage.removeItem('theme');
  localStorage.removeItem('userSettings');
  
  // Clear any existing CSS variables
  const root = document.documentElement;
  const style = root.style;
  
  // Remove all primary color variables
  for (let i = 25; i <= 950; i += 25) {
    style.removeProperty(`--primary-color-${i}`);
  }
  
  // Remove other theme variables
  style.removeProperty('--primary-color');
  style.removeProperty('--primary-hover');
  style.removeProperty('--primary-active');
  style.removeProperty('--primary-focus');
  style.removeProperty('--primary-disabled');
  
  console.log('✅ Theme settings reset complete');
};

// Auto-reset on import (for development)
if (process.env.NODE_ENV === 'development') {
  // Uncomment the line below to auto-reset themes on page load
  // resetThemeSettings();
}
