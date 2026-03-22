import React from 'react';
import { useTheme, colorThemes, ThemeMode, ColorTheme } from '../context/EnhancedThemeContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
// import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon,
  CheckIcon,
  PaintBrushIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface EnhancedThemeSelectorProps {
  className?: string;
  showTitle?: boolean;
  showDescription?: boolean;
  compact?: boolean;
}

const EnhancedThemeSelector: React.FC<EnhancedThemeSelectorProps> = ({ 
  className = '', 
  showTitle = true,
  showDescription = true,
  compact = false
}) => {
  const { 
    themeMode, 
    colorTheme, 
    isDarkMode, 
    setThemeMode, 
    setColorTheme, 
    toggleTheme, 
    resetToDefault 
  } = useTheme();

  const getThemeModeIcon = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return <SunIcon className="h-4 w-4" />;
      case 'dark':
        return <MoonIcon className="h-4 w-4" />;
      case 'system':
        return <ComputerDesktopIcon className="h-4 w-4" />;
      default:
        return <ComputerDesktopIcon className="h-4 w-4" />;
    }
  };

  const getThemeModeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  const getThemeModeDescription = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return 'Always use light theme';
      case 'dark':
        return 'Always use dark theme';
      case 'system':
        return 'Use system preference';
      default:
        return 'Use system preference';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="flex items-center gap-2"
        >
          {isDarkMode ? (
            <>
              <MoonIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <SunIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Light</span>
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Appearance</h3>
          {showDescription && (
            <p className="text-sm text-muted-foreground">
              Customize how the application looks and feels
            </p>
          )}
        </div>
      )}

      {/* Overall Appearance Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Overall appearance</CardTitle>
          <CardDescription className="text-sm">
            Applies to new tabs, pages, dialogs and other menus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
              <div key={mode} className="flex items-center space-x-3">
                <input
                  type="radio"
                  id={mode}
                  name="themeMode"
                  value={mode}
                  checked={themeMode === mode}
                  onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
                  className="h-4 w-4 text-primary focus:ring-primary border-border/40"
                />
                <Label 
                  htmlFor={mode} 
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  {getThemeModeIcon(mode)}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {getThemeModeLabel(mode)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getThemeModeDescription(mode)}
                    </span>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme Colors Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Theme</CardTitle>
              <CardDescription className="text-sm">
                Choose a color theme for your application
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefault}
              className="text-xs"
            >
              Restore default
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
            {colorThemes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => setColorTheme(theme.value)}
                className={`
                  relative w-10 h-10 rounded-full border-2 transition-all duration-200
                  hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                  ${colorTheme === theme.value 
                    ? 'border-primary ring-2 ring-primary ring-offset-2' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
                style={{
                  backgroundColor: theme.primary,
                }}
                title={theme.name}
              >
                {colorTheme === theme.value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckIcon className="h-4 w-4 text-primary-foreground drop-shadow-sm" />
                  </div>
                )}
              </button>
            ))}
            
            {/* Custom Theme Button */}
            <button
              onClick={() => setColorTheme('custom')}
              className={`
                relative w-10 h-10 rounded-full border-2 transition-all duration-200
                hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
                ${colorTheme === 'custom' 
                  ? 'border-primary ring-2 ring-primary ring-offset-2' 
                  : 'border-border hover:border-primary/50'
                }
              `}
              title="Custom Theme"
            >
              {colorTheme === 'custom' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckIcon className="h-4 w-4 text-primary-foreground drop-shadow-sm" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <PaintBrushIcon className="h-3 w-3 text-primary-foreground drop-shadow-sm" />
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription className="text-sm">
            Common appearance settings and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={toggleTheme}
              className="flex items-center gap-2 justify-start"
            >
              {isDarkMode ? (
                <>
                  <SunIcon className="h-4 w-4" />
                  Switch to Light
                </>
              ) : (
                <>
                  <MoonIcon className="h-4 w-4" />
                  Switch to Dark
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={resetToDefault}
              className="flex items-center gap-2 justify-start"
            >
              <ComputerDesktopIcon className="h-4 w-4" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Current Settings</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getThemeModeLabel(themeMode)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {colorThemes.find(t => t.value === colorTheme)?.name || 'Custom'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getThemeModeIcon(themeMode)}
              <div 
                className="w-6 h-6 rounded-full border"
                style={{
                  backgroundColor: colorThemes.find(t => t.value === colorTheme)?.primary || '#3B82F6'
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedThemeSelector;
