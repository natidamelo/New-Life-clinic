import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, colorThemes } from '../context/EnhancedThemeContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, Activity, Check, Sun, Moon, Monitor,
  RefreshCw, Palette, ArrowLeft, Sparkles, Bell, Search, SlidersHorizontal,
  Zap, Shield, Eye, Layers, ChevronRight, Star, Wand2,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const swatchCategories = [
  {
    title: 'Clinical & Professional',
    icon: Shield,
    desc: 'Trusted, authoritative tones for healthcare settings',
    swatches: [
      { name: 'default-light', color: '#D1D5DB', label: 'Slate',        textColor: '#1f2937' },
      { name: 'default-dark',  color: '#6B7280', label: 'Stone',        textColor: '#fff'    },
      { name: 'navy',          color: '#1E3A5F', label: 'Navy',         textColor: '#fff'    },
      { name: 'indigo',        color: '#6366F1', label: 'Indigo',       textColor: '#fff'    },
      { name: 'charcoal',      color: '#374151', label: 'Charcoal',     textColor: '#fff'    },
      { name: 'midnight',      color: '#0F172A', label: 'Midnight',     textColor: '#fff'    },
      { name: 'steel',         color: '#64748B', label: 'Steel',        textColor: '#fff'    },
    ],
  },
  {
    title: 'Fresh & Cool',
    icon: Eye,
    desc: 'Calming, hygienic tones evoking cleanliness',
    swatches: [
      { name: 'aqua',         color: '#38B2AC', label: 'Aqua',         textColor: '#fff'    },
      { name: 'teal',         color: '#0D9488', label: 'Teal',         textColor: '#fff'    },
      { name: 'light-blue',   color: '#38BDF8', label: 'Sky Blue',     textColor: '#fff'    },
      { name: 'cool-breeze',  color: '#22D3EE', label: 'Cool Breeze',  textColor: '#fff'    },
      { name: 'icy-mint',     color: '#34D399', label: 'Icy Mint',     textColor: '#fff'    },
      { name: 'forest-green', color: '#166534', label: 'Forest',       textColor: '#fff'    },
      { name: 'turquoise',    color: '#2DD4BF', label: 'Turquoise',    textColor: '#fff'    },
      { name: 'peacock',      color: '#0E7490', label: 'Peacock',      textColor: '#fff'    },
    ],
  },
  {
    title: 'Warm & Vibrant',
    icon: Zap,
    desc: 'Energetic, human-centered accent colors',
    swatches: [
      { name: 'rose',       color: '#FB7185', label: 'Rose',       textColor: '#fff'    },
      { name: 'pink',       color: '#EC4899', label: 'Pink',       textColor: '#fff'    },
      { name: 'gold',       color: '#D97706', label: 'Gold',       textColor: '#fff'    },
      { name: 'orange',     color: '#F97316', label: 'Orange',     textColor: '#fff'    },
      { name: 'coral',      color: '#F97066', label: 'Coral',      textColor: '#fff'    },
      { name: 'terracotta', color: '#C2410C', label: 'Terracotta', textColor: '#fff'    },
    ],
  },
  {
    title: 'Rich & Royal',
    icon: Star,
    desc: 'Deep, luxurious tones for a premium feel',
    swatches: [
      { name: 'purple',    color: '#9333EA', label: 'Purple',    textColor: '#fff'    },
      { name: 'maroon',    color: '#881337', label: 'Maroon',    textColor: '#fff'    },
      { name: 'lavender',  color: '#A78BFA', label: 'Lavender',  textColor: '#fff'    },
      { name: 'plum',      color: '#7E22CE', label: 'Plum',      textColor: '#fff'    },
      { name: 'mauve',     color: '#C084FC', label: 'Mauve',     textColor: '#fff'    },
      { name: 'fuchsia',   color: '#D946EF', label: 'Fuchsia',   textColor: '#fff'    },
    ],
  },
  {
    title: 'Earth & Nature',
    icon: Layers,
    desc: 'Organic, grounded tones inspired by nature',
    swatches: [
      { name: 'jade',       color: '#059669', label: 'Jade',       textColor: '#fff'    },
      { name: 'sage',       color: '#84CC16', label: 'Sage',       textColor: '#fff'    },
      { name: 'olive',      color: '#65A30D', label: 'Olive',      textColor: '#fff'    },
      { name: 'emerald',    color: '#10B981', label: 'Emerald',    textColor: '#fff'    },
      { name: 'lime',       color: '#84CC16', label: 'Lime',       textColor: '#fff'    },
    ],
  },
  {
    title: 'Metallic & Luxe',
    icon: Sparkles,
    desc: 'Warm metallic tones for an elegant finish',
    swatches: [
      { name: 'copper',     color: '#B87333', label: 'Copper',     textColor: '#fff'    },
      { name: 'bronze',     color: '#A0522D', label: 'Bronze',     textColor: '#fff'    },
      { name: 'champagne',  color: '#C9A96E', label: 'Champagne',  textColor: '#fff'    },
      { name: 'amber',      color: '#F59E0B', label: 'Amber',      textColor: '#fff'    },
      { name: 'crimson',    color: '#DC2626', label: 'Crimson',    textColor: '#fff'    },
      { name: 'sapphire',   color: '#2563EB', label: 'Sapphire',   textColor: '#fff'    },
      { name: 'cobalt',     color: '#1D4ED8', label: 'Cobalt',     textColor: '#fff'    },
    ],
  },
];

const allSwatches = swatchCategories.flatMap(c => c.swatches);

const modeOptions = [
  { id: 'light'  as const, icon: Sun,     label: 'Light Mode',   desc: 'Clean, high-contrast light theme'      },
  { id: 'dark'   as const, icon: Moon,    label: 'Dark Mode',    desc: 'Immersive, eye-friendly dark theme'    },
  { id: 'system' as const, icon: Monitor, label: 'System Sync',  desc: 'Adapts to your OS preference'         },
];

/* ─── Mini live preview window ──────────────────────────────────────────── */
const LivePreview: React.FC<{ primaryColor: string; isDarkMode: boolean; label: string }> = ({
  primaryColor, isDarkMode, label,
}) => {
  const bg      = isDarkMode ? '#0a0a12' : '#f8f9fb';
  const sidebar  = isDarkMode ? '#111118' : '#f0f1f5';
  const card     = isDarkMode ? '#18181f' : '#ffffff';
  const text1    = isDarkMode ? '#f0f0f0' : '#1a1a2e';
  const text2    = isDarkMode ? '#888'    : '#6b7280';
  const border   = isDarkMode ? '#2a2a3a' : '#e5e7eb';

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border shadow-2xl transition-all duration-500"
      style={{ background: bg, borderColor: border, minHeight: 190 }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: primaryColor }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-white/25" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/25" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/25" />
          </div>
          <span className="text-[10px] font-bold text-white/90 ml-1">New Life Clinic</span>
        </div>
        <span className="text-[9px] text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{label}</span>
      </div>

      {/* Body */}
      <div className="flex" style={{ minHeight: 148 }}>
        {/* Sidebar */}
        <div className="w-[52px] flex flex-col items-center py-3 gap-2 border-r" style={{ background: sidebar, borderColor: border }}>
          {[LayoutDashboard, Users, Calendar, Activity].map((Icon, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: i === 0 ? primaryColor : 'transparent',
                opacity: i === 0 ? 1 : 0.4,
              }}
            >
              <Icon size={13} color={i === 0 ? '#fff' : text2} />
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-3 space-y-2.5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 rounded-md px-2 py-1 border" style={{ background: sidebar, borderColor: border }}>
              <Search size={9} color={text2} />
              <div className="w-14 h-1.5 rounded-full" style={{ background: border }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md border flex items-center justify-center" style={{ borderColor: border }}>
                <Bell size={10} color={text2} />
              </div>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: primaryColor }} />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {['Patients', 'Today', 'Revenue'].map((lbl, i) => (
              <div key={lbl} className="rounded-lg p-2 border" style={{ background: card, borderColor: border }}>
                <p className="text-[8px] font-medium mb-1" style={{ color: text2 }}>{lbl}</p>
                <p className="text-xs font-black" style={{ color: text1 }}>
                  {['1,482', '56', '4.2K'][i]}
                </p>
                {i === 0 && (
                  <div className="mt-1.5 w-full rounded-full overflow-hidden" style={{ background: border, height: 3 }}>
                    <div className="h-full rounded-full" style={{ width: '72%', background: primaryColor }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-0.5">
            <div className="text-[8px] px-3 py-1 rounded-md font-bold text-white" style={{ background: primaryColor }}>
              New Record
            </div>
            <div className="text-[8px] px-3 py-1 rounded-md font-bold border" style={{ borderColor: primaryColor, color: primaryColor }}>
              Export
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Swatch button ─────────────────────────────────────────────────────── */
const SwatchBtn: React.FC<{
  swatch: typeof allSwatches[0];
  active: boolean;
  onClick: () => void;
}> = ({ swatch, active, onClick }) => (
  <motion.button
    onClick={onClick}
    title={swatch.label}
    whileHover={{ scale: 1.18, y: -3 }}
    whileTap={{ scale: 0.92 }}
    className="group flex flex-col items-center gap-2 focus:outline-none"
  >
    <div
      className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300"
      style={{
        background: swatch.color,
        boxShadow: active
          ? `0 0 0 2.5px var(--background), 0 0 0 5px ${swatch.color}, 0 10px 24px ${swatch.color}55`
          : `0 4px 10px ${swatch.color}40, inset 0 -2px 4px rgba(0,0,0,0.18)`,
      }}
    >
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <Check size={16} strokeWidth={3.5} color={swatch.textColor} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    <span
      className={`text-[10px] leading-tight text-center max-w-[52px] font-semibold transition-colors duration-200 ${
        active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
      }`}
    >
      {swatch.label}
    </span>
  </motion.button>
);

/* ─── Section header ────────────────────────────────────────────────────── */
const SectionHeader: React.FC<{ icon: React.ElementType; title: string; right?: React.ReactNode }> = ({
  icon: Icon, title, right,
}) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon size={14} className="text-primary" />
      </div>
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
    </div>
    {right}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
const ThemeSettings: React.FC = () => {
  const navigate  = useNavigate();
  const { themeMode, colorTheme, resetToDefault, setThemeMode, setColorTheme, isDarkMode } = useTheme();
  const { user }  = useAuth();
  const [saving,    setSaving   ] = useState(false);
  const [savedMsg,  setSavedMsg ] = useState('');
  const [hoverMode, setHoverMode] = useState<string | null>(null);

  const apply = async (fn: () => Promise<void>, msg: string) => {
    setSaving(true);
    await fn();
    setSaving(false);
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 2200);
  };

  const currentSwatch       = allSwatches.find(s => s.name === colorTheme);
  const currentThemeConfig  = colorThemes.find(t => t.value === colorTheme);
  const primaryColor        = currentThemeConfig?.primary ?? 'hsl(var(--primary))';

  /* preview color: use hovered mode's representation if hovering a mode card */
  const previewDark = hoverMode ? hoverMode === 'dark' : isDarkMode;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 pb-20 relative overflow-x-hidden">

      {/* ── Ambient glow blobs ── */}
      <div
        className="pointer-events-none fixed top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-[0.06] blur-[120px] -z-10 transition-all duration-1000"
        style={{ background: primaryColor }}
      />
      <div
        className="pointer-events-none fixed bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full opacity-[0.05] blur-[140px] -z-10 transition-all duration-1000"
        style={{ background: primaryColor }}
      />

      {/* ══════════ STICKY HEADER ══════════ */}
      <header className="sticky top-0 z-50 w-full bg-card/70 backdrop-blur-2xl border-b border-border/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground bg-accent/0 hover:bg-accent/60 px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              <ArrowLeft size={15} />
              Back
            </motion.button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all duration-500"
                style={{ background: primaryColor }}
              >
                <Palette size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-foreground leading-none">Appearance</h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block mt-0.5">Tailor every pixel of your clinic</p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              {savedMsg && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85, x: 16 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85, x: -16 }}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border"
                  style={{
                    background: `${primaryColor}18`,
                    borderColor: `${primaryColor}40`,
                    color: primaryColor,
                  }}
                >
                  <Check size={11} strokeWidth={3} />
                  {savedMsg}
                </motion.span>
              )}
            </AnimatePresence>
            {saving && !savedMsg && (
              <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" /> Applying…
              </span>
            )}
            {user?.role === 'admin' && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border"
                style={{ background: `${primaryColor}12`, borderColor: `${primaryColor}30`, color: primaryColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: primaryColor }} />
                Global Admin
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ══════════ BODY ══════════ */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">

        {/* ══ HERO BANNER ══ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}22 0%, ${primaryColor}08 60%, transparent 100%)`,
            border: `1px solid ${primaryColor}25`,
          }}
        >
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wand2 size={18} style={{ color: primaryColor }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
                  Live Theme Editor
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-none mb-2">
                Make it yours.
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Every change is applied instantly across the entire application — no reloads, no delays.
              </p>
            </div>
            {/* Active theme pill */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-lg"
              style={{
                background: `${primaryColor}15`,
                borderColor: `${primaryColor}35`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center"
                style={{ background: primaryColor, boxShadow: `0 8px 24px ${primaryColor}60` }}
              >
                <Star size={16} fill="white" stroke="none" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Active Theme</p>
                <p className="text-sm font-black text-foreground">{currentSwatch?.label ?? 'Default'}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{themeMode} mode</p>
              </div>
            </div>
          </div>

          {/* decorative gradient orb */}
          <div
            className="absolute -right-20 -top-20 w-72 h-72 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
            style={{ background: primaryColor }}
          />
        </motion.div>

        {/* ══ LIVE PREVIEW ══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-5"
        >
          <SectionHeader icon={Layers} title="Live Preview" />
          <LivePreview
            primaryColor={primaryColor}
            isDarkMode={previewDark}
            label={currentSwatch?.label ?? 'Default'}
          />
        </motion.section>

        {/* ══ APPEARANCE MODE ══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-5"
        >
          <SectionHeader icon={Monitor} title="Appearance Mode" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {modeOptions.map(({ id, icon: Icon, label, desc }) => {
              const active = themeMode === id;
              return (
                <motion.button
                  key={id}
                  onClick={() => apply(() => setThemeMode(id), `${label} applied`)}
                  onMouseEnter={() => setHoverMode(id)}
                  onMouseLeave={() => setHoverMode(null)}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex flex-col items-stretch rounded-2xl border-2 overflow-hidden text-left transition-all duration-300 focus:outline-none ${
                    active
                      ? 'shadow-xl'
                      : 'border-border/60 hover:border-primary/40 bg-card/40'
                  }`}
                  style={
                    active
                      ? { borderColor: primaryColor, boxShadow: `0 12px 32px ${primaryColor}22`, background: `${primaryColor}08` }
                      : {}
                  }
                >
                  {/* Active checkmark */}
                  <AnimatePresence>
                    {active && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-lg"
                        style={{ background: primaryColor }}
                      >
                        <Check size={13} strokeWidth={3} color="white" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Mini mode preview */}
                  <div className="relative h-28 overflow-hidden">
                    {id === 'system' ? (
                      <div className="flex w-full h-full">
                        {/* Light half */}
                        <div className="w-1/2 h-full bg-[#f8f9fb] flex flex-col">
                          <div className="h-2.5 w-full" style={{ background: primaryColor, opacity: 0.85 }} />
                          <div className="flex flex-1">
                            <div className="w-5 bg-[#eef0f3] border-r border-gray-200" />
                            <div className="flex-1 p-2 space-y-1.5">
                              <div className="w-8 h-1.5 rounded bg-gray-200" />
                              <div className="w-12 h-1.5 rounded bg-gray-100" />
                              <div className="w-6 h-1.5 rounded" style={{ background: `${primaryColor}40` }} />
                            </div>
                          </div>
                        </div>
                        {/* Dark half */}
                        <div className="w-1/2 h-full bg-[#0a0a12] flex flex-col border-l border-gray-900">
                          <div className="h-2.5 w-full" style={{ background: primaryColor }} />
                          <div className="flex flex-1">
                            <div className="w-5 bg-[#111118] border-r border-gray-900" />
                            <div className="flex-1 p-2 space-y-1.5">
                              <div className="w-8 h-1.5 rounded bg-gray-800" />
                              <div className="w-12 h-1.5 rounded bg-gray-900" />
                              <div className="w-6 h-1.5 rounded" style={{ background: `${primaryColor}50` }} />
                            </div>
                          </div>
                        </div>
                        {/* Center gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
                      </div>
                    ) : (
                      <div
                        className="w-full h-full flex flex-col"
                        style={{ background: id === 'dark' ? '#0a0a12' : '#f8f9fb' }}
                      >
                        <div className="h-2.5 w-full" style={{ background: primaryColor, opacity: id === 'dark' ? 1 : 0.9 }} />
                        <div className="flex flex-1">
                          <div className="w-8 h-full border-r" style={{
                            background: id === 'dark' ? '#111118' : '#eef0f3',
                            borderColor: id === 'dark' ? '#1a1a25' : '#e5e7eb',
                          }} />
                          <div className="flex-1 p-2.5 space-y-2">
                            <div className="grid grid-cols-3 gap-1.5">
                              {[1,2,3].map(i => (
                                <div key={i} className="rounded-md p-1.5 border" style={{
                                  background: id === 'dark' ? '#18181f' : '#fff',
                                  borderColor: id === 'dark' ? '#2a2a3a' : '#e5e7eb',
                                }}>
                                  <div className="w-full h-1.5 rounded mb-1" style={{ background: id === 'dark' ? '#2a2a3a' : '#f0f0f0' }} />
                                  <div className="w-2/3 h-1 rounded" style={{ background: id === 'dark' ? '#222230' : '#e8e8e8' }} />
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-1.5">
                              <div className="px-2 py-0.5 rounded text-[7px] font-bold text-white" style={{ background: primaryColor }}>Button</div>
                              <div className="px-2 py-0.5 rounded text-[7px] font-bold border" style={{ borderColor: primaryColor, color: primaryColor }}>Outline</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className="p-4 flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{ background: active ? `${primaryColor}20` : 'hsl(var(--muted))' }}
                    >
                      <Icon size={15} style={{ color: active ? primaryColor : undefined }} className={active ? '' : 'text-muted-foreground'} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold leading-none mb-0.5 ${active ? 'text-foreground' : 'text-foreground'}`}>
                        {label}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{desc}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* ══ COLOR ACCENT ══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-5"
        >
          <SectionHeader
            icon={Palette}
            title="Color Theme Accent"
            right={
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => apply(resetToDefault, 'Restored to default')}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-accent/0 hover:bg-accent/60 px-3 py-1.5 rounded-lg border border-border/50 transition-all duration-200"
              >
                <RefreshCw size={12} />
                Restore default
              </motion.button>
            }
          />

          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden divide-y divide-border/40">
            {swatchCategories.map(({ title, icon: CatIcon, desc, swatches }, ci) => (
              <div key={title} className="p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: `${primaryColor}18` }}
                  >
                    <CatIcon size={12} style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">{title}</h3>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-3">
                  {swatches.map(swatch => (
                    <SwatchBtn
                      key={swatch.name}
                      swatch={swatch}
                      active={colorTheme === swatch.name}
                      onClick={() => apply(() => setColorTheme(swatch.name as any), `${swatch.label} applied`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ══ QUICK CONTROLS ══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-5"
        >
          <SectionHeader icon={SlidersHorizontal} title="Quick Controls" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                label: `Switch to ${isDarkMode ? 'Light Mode' : 'Dark Mode'}`,
                desc: isDarkMode ? 'Bright, high contrast display' : 'Reduce eye strain at night',
                icon: isDarkMode ? Sun : Moon,
                action: () => apply(() => setThemeMode(isDarkMode ? 'light' : 'dark'), `${isDarkMode ? 'Light' : 'Dark'} mode applied`),
              },
              {
                label: 'Reset to Defaults',
                desc: 'Restore the original system appearance',
                icon: RefreshCw,
                action: () => apply(resetToDefault, 'Restored to default'),
              },
            ].map(({ label, desc, icon: Ic, action }, i) => (
              <motion.button
                key={i}
                onClick={action}
                whileHover={{ y: -3, boxShadow: `0 16px 32px ${primaryColor}18` }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-5 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm hover:border-primary/40 transition-all duration-300 text-left group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-105"
                  style={{ background: `${primaryColor}15` }}
                >
                  <Ic size={20} style={{ color: primaryColor }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* ══ ACTIVE CONFIGURATION SUMMARY ══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div
            className="relative overflow-hidden rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}14 0%, ${primaryColor}06 100%)`,
              border: `1px solid ${primaryColor}25`,
            }}
          >
            {/* color dot */}
            <div
              className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-xl transition-all duration-500"
              style={{ background: primaryColor, boxShadow: `0 12px 28px ${primaryColor}55` }}
            >
              <Sparkles size={22} className="text-white" />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Active Configuration</p>
              <p className="text-base font-black text-foreground">{currentSwatch?.label ?? colorTheme}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span>Mode: <strong className="text-foreground capitalize">{themeMode}</strong></span>
                <span>·</span>
                <span>Brightness: <strong className="text-foreground">{isDarkMode ? 'Dark' : 'Light'}</strong></span>
                <span>·</span>
                <span>Accent: <strong className="text-foreground">{currentSwatch?.label ?? colorTheme}</strong></span>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
              style={{
                background: `${primaryColor}12`,
                borderColor: `${primaryColor}30`,
                color: primaryColor,
              }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: primaryColor }} />
              Live
            </div>

            {/* Decorative */}
            <div
              className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full blur-3xl opacity-[0.08] pointer-events-none"
              style={{ background: primaryColor }}
            />
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default ThemeSettings;
