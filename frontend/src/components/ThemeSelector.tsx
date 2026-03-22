import React from 'react';
import { useTheme } from '../context/EnhancedThemeContext';
import { Button } from './ui/button';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

interface ThemeSelectorProps {
  className?: string;
  showMode?: boolean;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className = '', showMode = false }) => {
  const { themeMode, isDarkMode, toggleTheme } = useTheme();

  const getIcon = () => {
    if (themeMode === 'system') {
      return <ComputerDesktopIcon className="h-4 w-4" />;
    }
    return isDarkMode ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (themeMode === 'system') {
      return 'System';
    }
    return isDarkMode ? 'Dark' : 'Light';
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={`flex items-center gap-2 ${className}`}
      title={`Current: ${getLabel()} (Click to toggle)`}
    >
      {getIcon()}
      {showMode && (
        <span className="hidden sm:inline">{getLabel()}</span>
      )}
    </Button>
  );
};

export default ThemeSelector;
