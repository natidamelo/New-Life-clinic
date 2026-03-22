import { useContext } from 'react';
import { ThemeContext } from '../context/EnhancedThemeContext';

/**
 * Safe theme hook that handles cases where ThemeProvider might not be available
 * This prevents the "useTheme must be used within a ThemeProvider" error
 */
export const useSafeTheme = () => {
  const context = useContext(ThemeContext);
  
  // If context is undefined, return default values
  if (context === undefined) {
    console.warn('Theme context not available, using default theme');
    return {
      isDarkMode: false,
      themeMode: 'light' as const,
      colorTheme: 'default-light' as const,
      toggleTheme: () => {},
      setColorTheme: () => {},
      resetToDefault: () => {}
    };
  }

  return context;
};
