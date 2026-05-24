import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTheme, colorThemes } from '../context/EnhancedThemeContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Activity,
  Check,
  Sun,
  Moon,
  Monitor,
  RefreshCw,
  Palette,
  Settings as SettingsIcon,
  ArrowLeft,
  Sparkles,
  Bell,
  Search,
  ChevronRight,
  Sparkle,
  SlidersHorizontal,
} from 'lucide-react';

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

  // Original display colors grouped into categories for premium styling
  const swatchCategories = [
    {
      title: 'Clinical & Professional',
      swatches: [
        { name: 'default-light', color: '#E8E8E8', label: 'Default Light', textColor: '#333' },
        { name: 'default-dark',  color: '#6B7280', label: 'Default Dark',  textColor: '#fff' },
        { name: 'navy',          color: '#1E3A5F', label: 'Navy',          textColor: '#fff' },
        { name: 'indigo',        color: '#6366F1', label: 'Indigo',        textColor: '#fff' },
        { name: 'charcoal',      color: '#374151', label: 'Charcoal',      textColor: '#fff' },
      ]
    },
    {
      title: 'Fresh & Cool',
      swatches: [
        { name: 'aqua',          color: '#38B2AC', label: 'Aqua',          textColor: '#fff' },
        { name: 'teal',          color: '#0D9488', label: 'Teal',          textColor: '#fff' },
        { name: 'light-blue',    color: '#38BDF8', label: 'Light Blue',    textColor: '#fff' },
        { name: 'cool-breeze',   color: '#67E8F9', label: 'Cool Breeze',   textColor: '#333' },
        { name: 'icy-mint',      color: '#6EE7B7', label: 'Icy Mint',      textColor: '#333' },
        { name: 'forest-green',  color: '#166534', label: 'Forest Green',  textColor: '#fff' },
      ]
    },
    {
      title: 'Warm & Vibrant',
      swatches: [
        { name: 'rose',          color: '#F9A8D4', label: 'Rose',          textColor: '#333' },
        { name: 'pink',          color: '#EC4899', label: 'Pink',          textColor: '#fff' },
        { name: 'gold',          color: '#D97706', label: 'Gold',          textColor: '#fff' },
        { name: 'orange',        color: '#F97316', label: 'Orange',        textColor: '#fff' },
        { name: 'purple',        color: '#9333EA', label: 'Purple',        textColor: '#fff' },
        { name: 'maroon',        color: '#881337', label: 'Maroon',        textColor: '#fff' },
      ]
    }
  ];

  // Flattened swatches list for summaries
  const allSwatches = swatchCategories.flatMap(cat => cat.swatches);
  const currentSwatch = allSwatches.find(t => t.name === colorTheme);
  const currentThemeConfig = colorThemes.find(t => t.value === colorTheme);

  const modeOptions = [
    {
      id: 'system' as const,
      icon: Monitor,
      label: 'System Sync',
      desc: 'Adapts dynamically to system preferences',
    },
    {
      id: 'light' as const,
      icon: Sun,
      label: 'Light Mode',
      desc: 'Clean, high-contrast light theme',
    },
    {
      id: 'dark' as const,
      icon: Moon,
      label: 'Dark Mode',
      desc: 'Immersive, eye-friendly dark theme',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background text-foreground transition-colors duration-500 pb-16">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse duration-8000" />
      <div className="absolute top-1/3 right-1/4 w-[32rem] h-[32rem] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse duration-10000" />

      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-40 w-full bg-card/60 backdrop-blur-xl border-b border-border/80 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg py-2 px-3"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
                <span>Back</span>
              </Button>
            </motion.div>
            <div className="w-px h-5 bg-border/80" />
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Appearance</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Tailor the visual environment of your clinic</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <AnimatePresence mode="wait">
              {savedMsg && (
                <motion.span
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-3 py-1.5 rounded-full border border-emerald-500/20"
                >
                  <Check className="h-3.5 w-3.5" />
                  {savedMsg}
                </motion.span>
              )}
            </AnimatePresence>
            {saving && !savedMsg && (
              <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Updating...
              </span>
            )}
            {user?.role === 'admin' && (
              <span className="flex items-center gap-1.5 text-[11px] bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold tracking-wide uppercase border border-primary/20 shadow-sm shadow-primary/5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                Admin Controlled
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* ── Section: Live Preview ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Live Environment Preview</h2>
          </div>

          <div
            className="relative rounded-2xl border overflow-hidden shadow-2xl transition-all duration-500 bg-card group"
            style={{
              borderColor: 'var(--border)',
              background: isDarkMode ? 'hsl(240 10% 6%)' : 'hsl(0 0% 98.5%)',
            }}
          >
            {/* Window title bar */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b transition-colors duration-300"
              style={{
                background: currentThemeConfig?.primary ?? 'var(--primary)',
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <span className="ml-3 text-xs font-bold text-white tracking-wide drop-shadow-sm flex items-center gap-1.5">
                  <Sparkle className="h-3 w-3 fill-current" />
                  New Life Clinic
                </span>
              </div>
              <span className="text-[10px] font-medium text-white/70 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/5">
                Theme: {currentSwatch?.label ?? 'Default'}
              </span>
            </div>

            {/* Mock Dashboard Layout */}
            <div className="flex min-h-[220px] divide-x divide-border/40">
              {/* Sidebar Mock */}
              <div
                className="w-44 p-4 space-y-3 hidden sm:block transition-colors duration-300"
                style={{
                  background: isDarkMode ? 'hsl(240 10% 9%)' : 'hsl(0 0% 96%)',
                }}
              >
                {/* Mini User Profile */}
                <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-primary/10"
                    style={{ background: currentThemeConfig?.primary ?? 'var(--primary)' }}
                  >
                    AD
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold truncate">Admin User</p>
                    <p className="text-[8px] text-muted-foreground">System Admin</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {[
                    { label: 'Overview', icon: LayoutDashboard },
                    { label: 'Patients', icon: Users },
                    { label: 'Schedule', icon: Calendar },
                    { label: 'Reports', icon: Activity },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    const isActive = i === 0;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-300"
                        style={{
                          background: isActive ? (currentThemeConfig?.primary ?? 'var(--primary)') : 'transparent',
                          color: isActive ? '#fff' : isDarkMode ? 'hsl(0 0% 75%)' : 'hsl(0 0% 35%)',
                          boxShadow: isActive ? '0 4px 10px -2px var(--primary)' : 'none',
                        }}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {item.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Content Area Mock */}
              <div className="flex-1 p-5 space-y-4">
                {/* Mini Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/30">
                  <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-lg px-2 py-1 w-32">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <div className="w-16 h-2 bg-muted rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-muted/40 border border-border/40 rounded-lg">
                      <Bell className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-ping"
                      style={{ background: currentThemeConfig?.primary ?? 'var(--primary)' }}
                    />
                  </div>
                </div>

                {/* Dashboard Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Patients Count Widget */}
                  <div
                    className="p-3 rounded-xl border border-border/50 shadow-sm transition-colors duration-300"
                    style={{ background: isDarkMode ? 'hsl(240 5% 12%)' : '#fff' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-medium text-muted-foreground uppercase">Total Patients</p>
                      <Users className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-black">1,482</p>
                    <div className="flex items-center gap-1 mt-1 text-[8px] text-emerald-500 font-bold">
                      <span>+12.4%</span>
                      <span className="text-muted-foreground font-normal">this month</span>
                    </div>
                  </div>

                  {/* Consultations Sparkline Widget */}
                  <div
                    className="p-3 rounded-xl border border-border/50 shadow-sm transition-colors duration-300"
                    style={{ background: isDarkMode ? 'hsl(240 5% 12%)' : '#fff' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-medium text-muted-foreground uppercase">Consultations</p>
                      <Activity className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-sm font-black">56</p>
                      {/* SVG Sparkline reacting dynamically to theme primary color */}
                      <svg className="w-12 h-6 text-primary" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M0,25 C15,10 20,5 35,15 C50,25 60,5 75,18 C90,30 95,10 100,5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Task Progress Widget */}
                  <div
                    className="p-3 rounded-xl border border-border/50 shadow-sm transition-colors duration-300"
                    style={{ background: isDarkMode ? 'hsl(240 5% 12%)' : '#fff' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[9px] font-medium text-muted-foreground uppercase">Task Progress</p>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: currentThemeConfig?.primary ?? 'var(--primary)' }}
                      />
                    </div>
                    <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: '70%',
                          background: currentThemeConfig?.primary ?? 'var(--primary)',
                        }}
                      />
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-1.5 font-semibold">7 / 10 Tasks Completed</p>
                  </div>
                </div>

                {/* Primary & Secondary Buttons Mock */}
                <div className="flex gap-2 pt-2">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="text-[9px] px-3.5 py-1.5 rounded-lg font-bold text-white shadow-md cursor-pointer transition-all duration-300"
                    style={{
                      background: currentThemeConfig?.primary ?? 'var(--primary)',
                      boxShadow: `0 4px 10px -2px ${(currentThemeConfig?.primary ?? 'var(--primary)')}50`
                    }}
                  >
                    Primary Button
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="text-[9px] px-3.5 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer"
                    style={{
                      background: 'transparent',
                      borderColor: currentThemeConfig?.primary ?? 'var(--primary)',
                      color: currentThemeConfig?.primary ?? 'var(--primary)',
                    }}
                  >
                    Outline View
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Overall Appearance ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Monitor className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Overall Appearance</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {modeOptions.map(({ id, icon: Icon, label, desc }) => {
              const active = themeMode === id;
              return (
                <motion.button
                  key={id}
                  onClick={() => handleThemeModeChange(id)}
                  whileHover={{ y: -3, boxShadow: '0 12px 20px -8px rgba(0,0,0,0.12)' }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative flex flex-col items-stretch p-5 rounded-2xl border-2 text-left bg-card/40 backdrop-blur-md transition-all duration-300 focus:outline-none
                    ${active
                      ? 'border-primary ring-4 ring-primary/10 shadow-lg shadow-primary/5 bg-primary/[0.02]'
                      : 'border-border/60 hover:border-primary/30'
                    }
                  `}
                >
                  {/* Selected Indicator */}
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white z-10 shadow-md shadow-primary/20"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Mode Layout Representation */}
                  <div className="w-full h-24 rounded-lg overflow-hidden border border-border/40 shadow-inner bg-muted/20 mb-4 relative flex">
                    {/* Light/Dark split preview for 'system' */}
                    {id === 'system' ? (
                      <>
                        {/* Light Half */}
                        <div className="w-1/2 h-full bg-slate-50 flex flex-col relative divide-y divide-gray-100">
                          <div className="w-full h-3" style={{ background: currentThemeConfig?.primary ?? 'var(--primary)', opacity: 0.8 }} />
                          <div className="flex-1 flex">
                            <div className="w-6 h-full bg-slate-100/80 border-r border-gray-100" />
                            <div className="flex-1 p-2 space-y-1">
                              <div className="w-8 h-1 bg-gray-200 rounded" />
                              <div className="w-10 h-1 bg-gray-200 rounded" />
                            </div>
                          </div>
                        </div>
                        {/* Dark Half */}
                        <div className="w-1/2 h-full bg-slate-950 flex flex-col relative divide-y divide-gray-900">
                          <div className="w-full h-3" style={{ background: currentThemeConfig?.primary ?? 'var(--primary)', opacity: 0.9 }} />
                          <div className="flex-1 flex">
                            <div className="w-6 h-full bg-slate-900 border-r border-gray-900" />
                            <div className="flex-1 p-2 space-y-1">
                              <div className="w-8 h-1 bg-gray-800 rounded" />
                              <div className="w-10 h-1 bg-gray-800 rounded" />
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                      </>
                    ) : (
                      <div
                        className="w-full h-full flex flex-col divide-y transition-colors duration-300"
                        style={{
                          background: id === 'dark' ? '#0a0a0f' : '#ffffff',
                          borderColor: id === 'dark' ? 'hsl(240 5% 15%)' : 'hsl(0 0% 92%)',
                        }}
                      >
                        {/* Topbar */}
                        <div
                          className="w-full h-3.5 transition-colors duration-300"
                          style={{ background: currentThemeConfig?.primary ?? 'var(--primary)', opacity: id === 'dark' ? 0.95 : 0.85 }}
                        />
                        {/* Layout Inner */}
                        <div className="flex-1 flex divide-x divide-border/20">
                          {/* Sidebar */}
                          <div
                            className="w-8 h-full transition-colors duration-300"
                            style={{ background: id === 'dark' ? '#111116' : '#f5f5f7' }}
                          />
                          {/* Content */}
                          <div className="flex-1 p-2 space-y-1">
                            <div
                              className="w-8 h-1 rounded"
                              style={{ background: id === 'dark' ? 'hsl(240 5% 25%)' : 'hsl(0 0% 88%)' }}
                            />
                            <div
                              className="w-12 h-1 rounded"
                              style={{ background: id === 'dark' ? 'hsl(240 5% 20%)' : 'hsl(0 0% 92%)' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Label & Description */}
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4.5 w-4.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className={`text-sm font-bold ${active ? 'text-primary' : 'text-foreground'}`}>
                      {label}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ── Section: Color Theme Swatches ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Palette className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Color Theme Accent</h2>
            </div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-lg px-2.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Restore default
              </Button>
            </motion.div>
          </div>

          {/* Categorized Palette grid */}
          <div className="bg-card/30 backdrop-blur-md rounded-2xl border border-border/60 p-6 space-y-6">
            {swatchCategories.map((category) => (
              <div key={category.title} className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground/80 tracking-wider uppercase">{category.title}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-4">
                  {category.swatches.map((swatch) => {
                    const active = colorTheme === swatch.name;
                    return (
                      <button
                        key={swatch.name}
                        onClick={() => handleColorThemeChange(swatch.name)}
                        title={swatch.label}
                        className="group flex flex-col items-center gap-2 focus:outline-none"
                      >
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: 6 }}
                          whileTap={{ scale: 0.95 }}
                          className={`
                            relative w-11 h-11 rounded-full cursor-pointer flex items-center justify-center border-2 border-transparent transition-all duration-300
                          `}
                          style={{
                            background: swatch.color,
                            boxShadow: active
                              ? `0 0 0 2px var(--background), 0 0 0 4.5px ${swatch.color}, 0 8px 16px ${swatch.color}40`
                              : `0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04), inset 0 -2px 4px rgba(0,0,0,0.15)`
                          }}
                        >
                          <AnimatePresence>
                            {active && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.3 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.3 }}
                              >
                                <Check
                                  className="h-4.5 w-4.5 drop-shadow font-extrabold stroke-[3.5]"
                                  style={{ color: swatch.textColor }}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                        <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[56px] truncate font-medium group-hover:text-foreground transition-colors duration-200">
                          {swatch.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section: Quick Actions ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Quick Controls</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button
              onClick={() => handleThemeModeChange(isDarkMode ? 'light' : 'dark')}
              whileHover={{ y: -3, borderColor: 'var(--primary)' }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/30 backdrop-blur-sm hover:bg-accent/40 hover:shadow-lg hover:shadow-primary/2 transition-all duration-300 text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-primary animate-pulse" />
                ) : (
                  <Moon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-foreground">
                  Switch to {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Change active visual environment
                </div>
              </div>
            </motion.button>

            <motion.button
              onClick={handleReset}
              whileHover={{ y: -3, borderColor: 'var(--primary)' }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/30 backdrop-blur-sm hover:bg-accent/40 hover:shadow-lg hover:shadow-primary/2 transition-all duration-300 text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground">Reset to Defaults</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Restore original system settings
                </div>
              </div>
            </motion.button>
          </div>
        </section>

        {/* ── Section: Current Settings Summary ── */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/40 backdrop-blur-md p-5 flex flex-col sm:flex-row items-center gap-4 shadow-md shadow-black/[0.02]">
            {/* Dynamic visual bubble */}
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg transition-all duration-500"
              style={{
                background: currentSwatch?.color ?? 'var(--primary)',
                boxShadow: `0 8px 20px -4px ${(currentSwatch?.color ?? 'var(--primary)')}60`
              }}
            >
              <Check className="h-5 w-5 font-bold stroke-[3]" style={{ color: currentSwatch?.textColor ?? '#fff' }} />
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <h3 className="font-bold text-sm text-foreground">Active Configuration Summary</h3>
              <p className="text-xs text-muted-foreground mt-1 flex flex-wrap justify-center sm:justify-start gap-x-2 gap-y-1">
                <span>Mode:</span>
                <span className="font-bold text-foreground capitalize">{themeMode}</span>
                <span className="text-border">•</span>
                <span>Swatch Palette:</span>
                <span className="font-bold text-foreground">{currentSwatch?.label ?? colorTheme}</span>
                <span className="text-border">•</span>
                <span>Active State:</span>
                <span className="font-bold text-foreground">{isDarkMode ? 'Dark' : 'Light'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 border border-border/80 bg-background/50 px-3.5 py-1.5 rounded-full shadow-inner">
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse shadow-md"
                style={{
                  background: currentSwatch?.color ?? 'var(--primary)',
                  boxShadow: `0 0 8px ${(currentSwatch?.color ?? 'var(--primary)')}`
                }}
              />
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Active</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ThemeSettings;
