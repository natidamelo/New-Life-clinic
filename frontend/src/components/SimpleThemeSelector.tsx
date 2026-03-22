import React from 'react';
import { useTheme, colorThemes, ThemeMode, ColorTheme } from '../context/EnhancedThemeContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon,
  CheckIcon,
  PaintBrushIcon,
  ArrowPathIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';

interface SimpleThemeSelectorProps {
  className?: string;
  showTitle?: boolean;
  showDescription?: boolean;
  compact?: boolean;
}

const SimpleThemeSelector: React.FC<SimpleThemeSelectorProps> = ({ 
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

  // Debug logging
  console.log('SimpleThemeSelector render:', {
    themeMode,
    colorTheme,
    isDarkMode,
    documentClasses: typeof document !== 'undefined' ? document.documentElement.className : 'N/A',
    availableThemes: colorThemes.map(t => ({ value: t.value, name: t.name }))
  });

  const getThemeModeIcon = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return <SunIcon className="h-5 w-5" />;
      case 'dark':
        return <MoonIcon className="h-5 w-5" />;
      case 'system':
        return <ComputerDesktopIcon className="h-5 w-5" />;
      default:
        return <ComputerDesktopIcon className="h-5 w-5" />;
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
    <div className={`space-y-8 ${className}`}>
      {showTitle && (
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">Appearance</h3>
          {showDescription && (
            <p className="text-muted-foreground">
              Customize how the application looks and feels
            </p>
          )}
        </div>
      )}

      {/* Overall Appearance Section - Edge Style */}
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-medium mb-1">Overall appearance</h4>
          <p className="text-sm text-muted-foreground">
            Applies to new tabs, pages, dialogs and other menus
          </p>
        </div>
        
        <div className="flex gap-4">
          {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <div key={mode} className="flex-1">
              <input
                type="radio"
                id={mode}
                name="themeMode"
                value={mode}
                checked={themeMode === mode}
                onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
                className="sr-only"
              />
              <Label 
                htmlFor={mode} 
                className={`
                  flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                  hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2
                  ${themeMode === mode 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-2">
                  {getThemeModeIcon(mode)}
                  <span className="font-medium">
                    {getThemeModeLabel(mode)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground text-center">
                  {getThemeModeDescription(mode)}
                </span>
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Theme Colors Section - Edge Style */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-medium mb-1">Theme</h4>
            <p className="text-sm text-muted-foreground">
              Choose a color theme for your application
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="text-sm"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Restore default
          </Button>
        </div>
        
        <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-3">
          {colorThemes.map((theme) => {
            const isSelected = colorTheme === theme.value;
            const storedTheme = localStorage.getItem('colorTheme');
            console.log(`Theme ${theme.name}: isSelected=${isSelected}, current=${colorTheme}, theme.value=${theme.value}, stored=${storedTheme}`);
            
            return (
              <button
                key={theme.value}
                onClick={() => {
                  console.log(`🎨 Clicking theme: ${theme.name} (${theme.value})`);
                  setColorTheme(theme.value);
                }}
                className={`
                  relative w-12 h-12 rounded-full border-2 transition-all duration-200
                  hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                  ${isSelected 
                    ? 'border-primary ring-2 ring-primary ring-offset-2 shadow-lg' 
                    : 'border-border hover:border-primary/50 hover:shadow-md'
                  }
                `}
                style={{
                  backgroundColor: theme.primary,
                }}
                title={theme.name}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckIcon className="h-5 w-5 text-primary-foreground drop-shadow-lg" />
                  </div>
                )}
              </button>
            );
          })}
          
          {/* Custom Theme Button */}
          <button
            onClick={() => setColorTheme('custom')}
            className={`
              relative w-12 h-12 rounded-full border-2 transition-all duration-200
              hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
              ${colorTheme === 'custom' 
                ? 'border-primary ring-2 ring-primary ring-offset-2 shadow-lg' 
                : 'border-border hover:border-primary/50 hover:shadow-md'
              }
            `}
            title="Custom Theme"
          >
            {colorTheme === 'custom' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckIcon className="h-5 w-5 text-primary-foreground drop-shadow-lg" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <PaintBrushIcon className="h-4 w-4 text-primary-foreground drop-shadow-lg" />
            </div>
          </button>
        </div>
      </div>

      <Separator />

      {/* Quick Actions - Edge Style */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium">Quick Actions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={toggleTheme}
            className="flex items-center gap-3 justify-start h-12 text-left"
          >
            {isDarkMode ? (
              <>
                <SunIcon className="h-5 w-5" />
                <div>
                  <div className="font-medium">Switch to Light</div>
                  <div className="text-xs text-muted-foreground">Change to light theme</div>
                </div>
              </>
            ) : (
              <>
                <MoonIcon className="h-5 w-5" />
                <div>
                  <div className="font-medium">Switch to Dark</div>
                  <div className="text-xs text-muted-foreground">Change to dark theme</div>
                </div>
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={resetToDefault}
            className="flex items-center gap-3 justify-start h-12 text-left"
          >
            <ComputerDesktopIcon className="h-5 w-5" />
            <div>
              <div className="font-medium">Reset to Default</div>
              <div className="text-xs text-muted-foreground">Restore original settings</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Current Settings Summary - Edge Style */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Settings</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  {getThemeModeLabel(themeMode)}
                </Badge>
                <Badge variant="outline" className="text-xs px-2 py-1">
                  {colorThemes.find(t => t.value === colorTheme)?.name || 'Custom'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getThemeModeIcon(themeMode)}
              <div 
                className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
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

export default SimpleThemeSelector;