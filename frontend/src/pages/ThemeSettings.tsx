import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTheme, colorThemes } from '../context/EnhancedThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  IoArrowBack,
  IoSunny,
  IoMoon,
  IoDesktop,
  IoRefresh,
  IoCheckmark,
  IoColorPalette,
  IoSettings,
} from 'react-icons/io5';

const ThemeSettings: React.FC = () => {
  const navigate = useNavigate();
  const { themeMode, colorTheme, resetToDefault, setThemeMode, setColorTheme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const handleThemeModeChange = async (mode: 'light' | 'dark' | 'system') => {
    setSaving(true);
    await setThemeMode(mode);
    setSaving(false);
    setSavedMsg('Theme mode updated');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const handleColorThemeChange = async (themeName: string) => {
    setSaving(true);
    await setColorTheme(themeName as any);
    setSaving(false);
    setSavedMsg('Color theme applied');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const handleReset = async () => {
    setSaving(true);
    await resetToDefault();
    setSaving(false);
    setSavedMsg('Settings restored to default');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  // The 17 display colors matching the UI swatches
  const themeSwatches = [
    { name: 'default-light', color: '#E8E8E8', label: 'Default Light', textColor: '#333' },
    { name: 'default-dark',  color: '#6B7280', label: 'Default Dark',  textColor: '#fff' },
    { name: 'aqua',          color: '#38B2AC', label: 'Aqua',          textColor: '#fff' },
    { name: 'teal',          color: '#0D9488', label: 'Teal',          textColor: '#fff' },
    { name: 'light-blue',    color: '#38BDF8', label: 'Light Blue',    textColor: '#fff' },
    { name: 'rose',          color: '#F9A8D4', label: 'Rose',          textColor: '#333' },
    { name: 'pink',          color: '#EC4899', label: 'Pink',          textColor: '#fff' },
    { name: 'gold',          color: '#D97706', label: 'Gold',          textColor: '#fff' },
    { name: 'orange',        color: '#F97316', label: 'Orange',        textColor: '#fff' },
    { name: 'charcoal',      color: '#374151', label: 'Charcoal',      textColor: '#fff' },
    { name: 'navy',          color: '#1E3A5F', label: 'Navy',          textColor: '#fff' },
    { name: 'indigo',        color: '#6366F1', label: 'Indigo',        textColor: '#fff' },
    { name: 'purple',        color: '#9333EA', label: 'Purple',        textColor: '#fff' },
    { name: 'maroon',        color: '#881337', label: 'Maroon',        textColor: '#fff' },
    { name: 'forest-green',  color: '#166534', label: 'Forest Green',  textColor: '#fff' },
    { name: 'cool-breeze',   color: '#67E8F9', label: 'Cool Breeze',   textColor: '#333' },
    { name: 'icy-mint',      color: '#6EE7B7', label: 'Icy Mint',      textColor: '#333' },
  ];

  const currentSwatch = themeSwatches.find(t => t.name === colorTheme);
  const currentThemeConfig = colorThemes.find(t => t.value === colorTheme);

  const modeOptions = [
    {
      id: 'system' as const,
      icon: IoDesktop,
      label: 'System',
      desc: 'Follow system preference',
    },
    {
      id: 'light' as const,
      icon: IoSunny,
      label: 'Light',
      desc: 'Always use light theme',
    },
    {
      id: 'dark' as const,
      icon: IoMoon,
      label: 'Dark',
      desc: 'Always use dark theme',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <IoArrowBack className="h-4 w-4" />
              Back
            </Button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <IoColorPalette className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Appearance</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedMsg && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium animate-in fade-in slide-in-from-right-2">
                <IoCheckmark className="h-4 w-4" />
                {savedMsg}
              </span>
            )}
            {saving && (
              <span className="text-sm text-muted-foreground animate-pulse">Saving…</span>
            )}
            {user?.role === 'admin' && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                <IoSettings className="h-3 w-3" />
                Admin — changes apply to all users
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* ── Live Preview ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Preview</h2>
          <div
            className="rounded-2xl border border-border overflow-hidden shadow-sm"
            style={{ background: isDarkMode ? 'hsl(240 10% 6%)' : 'hsl(0 0% 98%)' }}
          >
            {/* Mock header */}
            <div
              className="flex items-center gap-3 px-5 py-3 border-b"
              style={{
                background: currentThemeConfig?.primary ?? 'var(--primary)',
                borderColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <div className="w-3 h-3 rounded-full bg-white/30" />
              <div className="w-3 h-3 rounded-full bg-white/30" />
              <div className="w-3 h-3 rounded-full bg-white/30" />
              <span className="ml-2 text-sm font-semibold text-white opacity-90">New Life Clinic</span>
            </div>
            {/* Mock body */}
            <div className="flex gap-0">
              {/* Sidebar */}
              <div
                className="w-36 p-3 space-y-1 border-r"
                style={{
                  background: isDarkMode ? 'hsl(240 10% 9%)' : 'hsl(0 0% 96%)',
                  borderColor: isDarkMode ? 'hsl(240 5% 18%)' : 'hsl(0 0% 90%)',
                }}
              >
                {['Dashboard', 'Patients', 'Schedule', 'Reports'].map((item, i) => (
                  <div
                    key={item}
                    className="text-xs px-2 py-1.5 rounded-md font-medium"
                    style={{
                      background: i === 0 ? (currentThemeConfig?.primary ?? 'var(--primary)') : 'transparent',
                      color: i === 0 ? '#fff' : isDarkMode ? 'hsl(0 0% 70%)' : 'hsl(0 0% 40%)',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              {/* Content */}
              <div className="flex-1 p-4 space-y-3">
                <div
                  className="h-3 w-32 rounded"
                  style={{ background: isDarkMode ? 'hsl(240 5% 20%)' : 'hsl(0 0% 88%)' }}
                />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(n => (
                    <div
                      key={n}
                      className="rounded-lg p-3"
                      style={{
                        background: isDarkMode ? 'hsl(240 5% 14%)' : '#fff',
                        border: `1px solid ${isDarkMode ? 'hsl(240 5% 20%)' : 'hsl(0 0% 90%)'}`,
                      }}
                    >
                      <div
                        className="h-2 w-12 rounded mb-2"
                        style={{ background: currentThemeConfig?.primary ?? 'var(--primary)', opacity: 0.7 }}
                      />
                      <div
                        className="h-2 w-8 rounded"
                        style={{ background: isDarkMode ? 'hsl(240 5% 25%)' : 'hsl(0 0% 85%)' }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div
                    className="text-xs px-3 py-1.5 rounded-md font-medium text-white"
                    style={{ background: currentThemeConfig?.primary ?? 'var(--primary)' }}
                  >
                    Primary Button
                  </div>
                  <div
                    className="text-xs px-3 py-1.5 rounded-md font-medium"
                    style={{
                      background: 'transparent',
                      border: `1px solid ${currentThemeConfig?.primary ?? 'var(--primary)'}`,
                      color: currentThemeConfig?.primary ?? 'var(--primary)',
                    }}
                  >
                    Outline
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Overall Appearance ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Overall Appearance</h2>
          <p className="text-sm text-muted-foreground mb-4">Applies to all pages, dialogs and menus</p>

          <div className="grid grid-cols-3 gap-3">
            {modeOptions.map(({ id, icon: Icon, label, desc }) => {
              const active = themeMode === id;
              return (
                <button
                  key={id}
                  onClick={() => handleThemeModeChange(id)}
                  className={`
                    relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all
                    hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                    ${active
                      ? 'border-primary bg-primary/8 shadow-sm'
                      : 'border-border bg-card hover:border-primary/40'
                    }
                  `}
                >
                  {active && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <IoCheckmark className="h-3 w-3 text-white" />
                    </span>
                  )}
                  {/* Mini preview */}
                  <div className="w-20 h-12 rounded-lg overflow-hidden border border-border/60 shadow-sm">
                    <div
                      className="w-full h-3"
                      style={{ background: currentThemeConfig?.primary ?? 'var(--primary)' }}
                    />
                    <div
                      className="w-full h-9"
                      style={{
                        background: id === 'dark' ? '#1a1a2e'
                          : id === 'light' ? '#ffffff'
                          : isDarkMode ? '#1a1a2e' : '#ffffff',
                      }}
                    />
                  </div>
                  <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <div className={`text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Color Theme ── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Color Theme</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
            >
              <IoRefresh className="h-3.5 w-3.5" />
              Restore default
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-5">Choose an accent color for buttons, links and highlights</p>

          <div className="grid grid-cols-6 sm:grid-cols-9 gap-3">
            {themeSwatches.map((swatch) => {
              const active = colorTheme === swatch.name;
              return (
                <button
                  key={swatch.name}
                  onClick={() => handleColorThemeChange(swatch.name)}
                  title={swatch.label}
                  className={`
                    group relative flex flex-col items-center gap-1.5 focus:outline-none
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-full transition-all duration-150
                      ${active
                        ? 'ring-2 ring-offset-2 ring-offset-background scale-110 shadow-lg'
                        : 'hover:scale-105 hover:shadow-md'
                      }
                    `}
                    style={{
                      background: swatch.color,
                      ringColor: swatch.color,
                      boxShadow: active ? `0 0 0 2px var(--background), 0 0 0 4px ${swatch.color}` : undefined,
                    }}
                  >
                    {active && (
                      <div className="w-full h-full rounded-full flex items-center justify-center">
                        <IoCheckmark
                          className="h-4 w-4 drop-shadow"
                          style={{ color: swatch.textColor }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[44px] truncate">
                    {swatch.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleThemeModeChange(isDarkMode ? 'light' : 'dark')}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                {isDarkMode
                  ? <IoSunny className="h-5 w-5 text-primary" />
                  : <IoMoon className="h-5 w-5 text-primary" />
                }
              </div>
              <div>
                <div className="font-medium text-foreground">
                  Switch to {isDarkMode ? 'Light' : 'Dark'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Change to {isDarkMode ? 'light' : 'dark'} theme
                </div>
              </div>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <IoRefresh className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">Reset to Default</div>
                <div className="text-sm text-muted-foreground">Restore original settings</div>
              </div>
            </button>
          </div>
        </section>

        {/* ── Current Settings Summary ── */}
        <section>
          <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card shadow-sm">
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-md"
              style={{ background: currentSwatch?.color ?? 'var(--primary)' }}
            >
              <IoCheckmark className="h-6 w-6" style={{ color: currentSwatch?.textColor ?? '#fff' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground">Current Settings</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Mode: <span className="font-medium text-foreground capitalize">{themeMode}</span>
                {' · '}
                Theme: <span className="font-medium text-foreground">{currentSwatch?.label ?? colorTheme}</span>
                {' · '}
                Appearance: <span className="font-medium text-foreground">{isDarkMode ? 'Dark' : 'Light'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ background: currentSwatch?.color ?? 'var(--primary)' }}
              />
              <span className="text-xs font-medium text-muted-foreground">Active</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default ThemeSettings;
