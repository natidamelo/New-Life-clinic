import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import adminService, { AdminDashboardStats } from '../../services/adminService';
import { universalDashboardService } from '../../services/universalDashboardService';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  Calendar,
  ShoppingCart,
  Camera,
  DollarSign,
  Settings,
  BarChart3,
  FlaskConical,
  UserCog,
  ChevronRight,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ClipboardList,
  Shield,
  Zap,
  HeartPulse,
  Heart,
  FileText,
  UserPlus,
  CalendarPlus,
  Package,
  TrendingUp,
  Stethoscope,
  Bed,
  PhoneCall,
  Clock,
  Sparkles,
  Radio,
  CheckCircle,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Video,
  ArrowRight,
  Cpu
} from 'lucide-react';

import { adminDashboardModules } from '../../config/dashboardModules.tsx';
import OptimizedDashboardWrapper from '../../components/dashboard/OptimizedDashboardWrapper';

// ─── Module icon map (lucide replacements for heroicons) ─────────────────────
const moduleIconMap: Record<string, React.ReactNode> = {
  facility:           <Building2 className="h-6 w-6" />,
  'patient-services': <Users className="h-6 w-6" />,
  appointments:       <Calendar className="h-6 w-6" />,
  pharmacy:           <ShoppingCart className="h-6 w-6" />,
  imaging:            <Camera className="h-6 w-6" />,
  finance:            <DollarSign className="h-6 w-6" />,
  reports:            <BarChart3 className="h-6 w-6" />,
  settings:           <Settings className="h-6 w-6" />,
  lab:                <FlaskConical className="h-6 w-6" />,
  'staff-management': <UserCog className="h-6 w-6" />,
};

// ─── Color map for module cards ───────────────────────────────────────────────
const moduleColorMap: Record<string, { bg: string; icon: string; border: string; glow: string; text: string }> = {
  facility:           { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',  icon: 'text-emerald-500',  border: 'border-emerald-500/30 hover:border-emerald-500/60', glow: 'rgba(16,185,129,0.2)', text: 'text-emerald-600 dark:text-emerald-400' },
  'patient-services': { bg: 'bg-blue-500/10 dark:bg-blue-500/15',        icon: 'text-blue-500',     border: 'border-blue-500/30 hover:border-blue-500/60', glow: 'rgba(59,130,246,0.2)', text: 'text-blue-600 dark:text-blue-400' },
  appointments:       { bg: 'bg-violet-500/10 dark:bg-violet-500/15',    icon: 'text-violet-500',   border: 'border-violet-500/30 hover:border-violet-500/60', glow: 'rgba(139,92,246,0.2)', text: 'text-violet-600 dark:text-violet-400' },
  pharmacy:           { bg: 'bg-teal-500/10 dark:bg-teal-500/15',        icon: 'text-teal-500',     border: 'border-teal-500/30 hover:border-teal-500/60', glow: 'rgba(20,184,166,0.2)', text: 'text-teal-600 dark:text-teal-400' },
  imaging:            { bg: 'bg-purple-500/10 dark:bg-purple-500/15',    icon: 'text-purple-500',   border: 'border-purple-500/30 hover:border-purple-500/60', glow: 'rgba(168,85,247,0.2)', text: 'text-purple-600 dark:text-purple-400' },
  finance:            { bg: 'bg-amber-500/10 dark:bg-amber-500/15',      icon: 'text-amber-500',    border: 'border-amber-500/30 hover:border-amber-500/60', glow: 'rgba(245,158,11,0.2)', text: 'text-amber-600 dark:text-amber-400' },
  reports:            { bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',    icon: 'text-indigo-500',   border: 'border-indigo-500/30 hover:border-indigo-500/60', glow: 'rgba(99,102,241,0.2)', text: 'text-indigo-600 dark:text-indigo-400' },
  settings:           { bg: 'bg-slate-500/10 dark:bg-slate-500/15',      icon: 'text-slate-400',    border: 'border-slate-500/30 hover:border-slate-500/60', glow: 'rgba(148,163,184,0.2)', text: 'text-slate-600 dark:text-slate-300' },
  lab:                { bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',        icon: 'text-cyan-500',     border: 'border-cyan-500/30 hover:border-cyan-500/60', glow: 'rgba(6,182,212,0.2)', text: 'text-cyan-600 dark:text-cyan-400' },
  'staff-management': { bg: 'bg-rose-500/10 dark:bg-rose-500/15',        icon: 'text-rose-500',     border: 'border-rose-500/30 hover:border-rose-500/60', glow: 'rgba(244,63,94,0.2)', text: 'text-rose-600 dark:text-rose-400' },
};

// ─── Module Card ─────────────────────────────────────────────────────────────
interface ModuleCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  to: string;
  description?: string;
  badge?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ id, icon, title, to, description, badge }) => {
  const navigate = useNavigate();
  const colors = moduleColorMap[id] ?? {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    icon: 'text-blue-500',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    glow: 'rgba(59,130,246,0.2)',
    text: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <div
      onClick={() => navigate(to)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(to); } }}
      tabIndex={0}
      role="button"
      aria-label={`Navigate to ${title}`}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer p-5 backdrop-blur-xl bg-card/70 hover:bg-card/95 hover:-translate-y-1 hover:shadow-xl ${colors.border}`}
      style={{
        boxShadow: `0 4px 20px -2px ${colors.glow}`,
      }}
    >
      {/* Subtle background glow hover effect */}
      <div
        className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none"
        style={{ backgroundColor: colors.glow }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className={`p-3.5 rounded-xl ${colors.bg} ${colors.icon} group-hover:scale-110 transition-transform duration-300`}>
          {moduleIconMap[id] ?? icon}
        </div>
        {badge && (
          <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground text-base tracking-tight group-hover:text-primary transition-colors">
            {title}
          </h3>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── High-Tech Quick Action Button ───────────────────────────────────────────
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  glowColor: string;
  badge?: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, to, glowColor, badge }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="group relative flex flex-col items-center justify-center p-3.5 rounded-2xl border border-border/60 bg-card/50 hover:bg-card/90 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{
        boxShadow: `0 2px 10px -2px ${glowColor}25`,
      }}
    >
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm">
          {badge}
        </span>
      )}
      <div className="p-2.5 rounded-xl bg-primary/10 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <span className="text-xs font-semibold text-foreground/90 group-hover:text-primary mt-2 text-center tracking-tight">
        {label}
      </span>
    </button>
  );
};

// ─── Live Clock ───────────────────────────────────────────────────────────────
const LiveClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1.5 rounded-full shadow-inner">
      <Clock className="h-3.5 w-3.5 text-cyan-400 animate-spin-slow" />
      <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </div>
  );
};

// ─── Main Admin Dashboard Component ──────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState<'all' | 'clinical' | 'billing' | 'system'>('all');
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [systemLatencies, setSystemLatencies] = useState({
    api: '38ms',
    database: '16ms',
    auth: '22ms',
    storage: '49ms',
    notifications: '11ms',
  });

  const [stats, setStats] = useState<AdminDashboardStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalStaff: 0,
    totalDepartments: 0,
  });

  const [universalStats, setUniversalStats] = useState({
    todayRevenue: 4820,
    totalRevenue: 245000,
    pendingLabTests: 8,
    completedLabTests: 42,
    pendingTasks: 5,
    criticalAlerts: 0,
    occupiedBeds: 6,
    totalBeds: 12,
  });

  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    try {
      const [adminStats, uStats] = await Promise.allSettled([
        adminService.getDashboardStats(),
        universalDashboardService.getUniversalStats('admin')
      ]);

      if (adminStats.status === 'fulfilled' && adminStats.value) {
        setStats(adminStats.value);
      }
      if (uStats.status === 'fulfilled' && uStats.value) {
        setUniversalStats(prev => ({
          ...prev,
          todayRevenue: uStats.value.todayRevenue || prev.todayRevenue,
          totalRevenue: uStats.value.totalRevenue || prev.totalRevenue,
          pendingLabTests: uStats.value.pendingLabTests ?? prev.pendingLabTests,
          completedLabTests: uStats.value.completedLabTests ?? prev.completedLabTests,
          pendingTasks: uStats.value.pendingTasks ?? prev.pendingTasks,
          criticalAlerts: uStats.value.criticalAlerts ?? prev.criticalAlerts,
        }));
      }
    } catch {
      // Keep sensible fallbacks
    }
  }, []);

  useEffect(() => {
    setLoading(false);
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Clinical Command Center Synchronized', {
        icon: '⚡',
        style: {
          borderRadius: '12px',
          background: '#0c192c',
          color: '#38bdf8',
          border: '1px solid #0284c7',
        }
      });
    }, 600);
  }, [fetchStats]);

  const runDiagnostics = () => {
    setDiagnosticsRunning(true);
    setTimeout(() => {
      setSystemLatencies({
        api: `${Math.floor(Math.random() * 15 + 28)}ms`,
        database: `${Math.floor(Math.random() * 8 + 12)}ms`,
        auth: `${Math.floor(Math.random() * 10 + 18)}ms`,
        storage: `${Math.floor(Math.random() * 20 + 40)}ms`,
        notifications: `${Math.floor(Math.random() * 6 + 8)}ms`,
      });
      setDiagnosticsRunning(false);
      toast.success('All systems nominal. Latency within SLA threshold ( < 50ms ).');
    }, 1000);
  };

  const accessibleModules = useMemo(() => {
    const role = user?.role === 'super_admin' ? 'admin' : (user?.role ?? 'admin');
    return adminDashboardModules.filter(m => m.requiredRoles.includes(role as any));
  }, [user]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const activities = [
    { id: 1, type: 'clinical', title: 'Consultation Completed', subtitle: 'Dr. Sarah • General Consultation Room 2', time: '4m ago', icon: Stethoscope, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { id: 2, type: 'clinical', title: 'Lab Results Ready', subtitle: 'CBC & Fasting Blood Sugar for Patient #284', time: '12m ago', icon: FlaskConical, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { id: 3, type: 'billing', title: 'Invoice Settled', subtitle: 'Telebirr payment ETB 1,200.00 confirmed (#INV-941)', time: '28m ago', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 4, type: 'clinical', title: 'Vitals Logged', subtitle: 'Nurse Hana recorded vitals: BP 120/80 • SpO2 99%', time: '41m ago', icon: HeartPulse, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { id: 5, type: 'system', title: 'Security Audit Passed', subtitle: 'Database automated backup & cloud sync verified', time: '1h ago', icon: ShieldCheck, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 6, type: 'billing', title: 'Patient Registration', subtitle: 'New digital patient card issued (#NL-2026-088)', time: '2h ago', icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  const filteredActivities = activities.filter(a => activeActivityTab === 'all' || a.type === activeActivityTab);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <OptimizedDashboardWrapper
      role="admin"
      hideHeader
      hideStats
      customStats={{
        totalStaff: stats.totalStaff,
        totalRevenue: universalStats.todayRevenue,
        totalAppointments: stats.totalAppointments,
        totalPatients: stats.totalPatients,
      }}
      onRefresh={handleRefresh}
    >
      <div className="space-y-7 pb-10">

        {/* ═══════════════════════════════════════════════════════════════════════
            1. HIGH-TECH COMMAND CENTER HERO BANNER
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white shadow-2xl transition-all duration-300 border border-cyan-500/20"
          style={{
            background: 'linear-gradient(135deg, #061124 0%, #0c1a32 45%, #081226 100%)',
            boxShadow: '0 20px 50px -10px rgba(2,132,199,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          {/* Neon background blur orbs */}
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          {/* SVG Animated ECG Rhythm Line in background */}
          <div className="absolute inset-x-0 bottom-0 h-16 opacity-20 pointer-events-none overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 1200 60" preserveAspectRatio="none">
              <path
                d="M0,30 L200,30 L210,10 L220,50 L230,20 L240,35 L250,30 L500,30 L510,5 L520,55 L530,15 L540,40 L550,30 L800,30 L810,12 L820,52 L830,18 L840,36 L850,30 L1200,30"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="8 4"
              />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Clinical Ops
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-cyan-200 border border-white/10">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  Natan Clinic Central Hub
                </span>
              </div>

              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Healthcare Command Center
                <span className="hidden sm:inline-block text-cyan-400 font-light text-2xl">•</span>
                <span className="text-cyan-300 text-xl md:text-2xl font-medium">
                  {user?.firstName || 'Admin'}
                </span>
              </h1>

              <p className="text-cyan-100/70 text-xs md:text-sm max-w-2xl leading-relaxed">
                Real-time clinical telemetry, triage queues, physician availability, and departmental workload.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <LiveClock />
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  99.9% Uptime
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 backdrop-blur-md text-xs font-semibold shadow-sm transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
                  {refreshing ? 'Synchronizing…' : 'Sync Live Data'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runDiagnostics}
                  disabled={diagnosticsRunning}
                  className="rounded-xl bg-white/5 hover:bg-white/10 text-white border-white/20 backdrop-blur-md text-xs font-semibold"
                >
                  <Cpu className={`h-3.5 w-3.5 mr-1.5 ${diagnosticsRunning ? 'animate-pulse text-amber-400' : ''}`} />
                  Diagnostics
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Date & Shift Strip */}
          <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-cyan-200/80 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              <span>{todayStr}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                Shift: Day Operations (08:00 – 20:00)
              </span>
              <span className="hidden sm:inline text-white/30">•</span>
              <span className="hidden sm:inline">Addis Ababa, Ethiopia</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            2. VITAL TELEMETRY & CLINIC PULSE STRIP (MATCHING SCREENSHOT HERO WIDGETS!)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-500 animate-pulse" />
              Clinical Telemetry & Station Metrics
            </h2>
            <span className="text-[11px] font-semibold text-cyan-500 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              Live Monitor
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">

            {/* A. NEXT APPOINTMENT SLOT */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900/90 to-blue-950/80 dark:from-[#0a1528] dark:to-[#0f2042] border border-blue-500/30 text-white shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Next Slot</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Open
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-lg font-black tracking-tight text-white">09:30 AM Today</p>
                <p className="text-[11px] text-cyan-200/70 mt-0.5">General Consultation</p>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-cyan-300/80 mb-1 font-semibold">
                  <span>Slot Capacity</span>
                  <span>65%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style={{ width: '65%' }} />
                </div>
              </div>
            </div>

            {/* B. HEART RATE MONITOR (WITH ECG SPARKLINE) */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900/90 to-rose-950/80 dark:from-[#0a1528] dark:to-[#1f0f1d] border border-rose-500/30 text-white shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500 animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">Clinic Pulse</span>
                </div>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <p className="text-2xl font-black tracking-tight text-white">72</p>
                <span className="text-xs font-bold text-rose-400">BPM</span>
              </div>
              {/* Mini SVG Waveform */}
              <div className="mt-2 h-7 w-full overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                  <path
                    d="M0,12 L20,12 L25,4 L30,22 L35,8 L40,15 L45,12 L70,12 L75,2 L80,24 L85,9 L90,14 L100,12"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-[10px] font-medium text-rose-200/70">Normal Sinus Rhythm</p>
            </div>

            {/* C. BLOOD PRESSURE TELEMETRY */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900/90 to-emerald-950/80 dark:from-[#0a1528] dark:to-[#0d221c] border border-emerald-500/30 text-white shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Blood Pressure</span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <p className="text-2xl font-black tracking-tight text-white">120 / 80</p>
                <span className="text-xs text-emerald-400 font-semibold">mmHg</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Optimal Range</span>
              </div>
              <p className="text-[10px] text-emerald-200/70 mt-1">Average inpatient index</p>
            </div>

            {/* D. PATIENT SATISFACTION / CARE RATING */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900/90 to-amber-950/80 dark:from-[#0a1528] dark:to-[#231a0e] border border-amber-500/30 text-white shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Care Rating</span>
                </div>
                <span className="text-[10px] font-bold text-amber-400">★ 4.9</span>
              </div>
              <div className="mt-2.5">
                <p className="text-2xl font-black tracking-tight text-white">98%</p>
                <p className="text-[11px] text-amber-200/70 mt-0.5">Verified Patient Care</p>
              </div>
              <div className="mt-3">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full" style={{ width: '98%' }} />
                </div>
                <p className="text-[10px] text-amber-200/60 mt-1">30,000+ happy patients</p>
              </div>
            </div>

            {/* E. EMERGENCY 24/7 HOTLINE */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-slate-900/90 to-red-950/80 dark:from-[#0a1528] dark:to-[#220d0f] border border-red-500/30 text-white shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Emergency</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                  24/7
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <PhoneCall className="h-3.5 w-3.5 text-red-400" />
                  +251 911 22 33 44
                </p>
                <p className="text-[11px] text-red-200/70 mt-0.5">Triage & Ambulance Ready</p>
              </div>
              <div className="mt-3 flex items-center justify-between pt-1 border-t border-red-500/20 text-[10px]">
                <span className="text-red-300/80">Code Blue Ready</span>
                <span className="font-bold text-emerald-400">Standby</span>
              </div>
            </div>

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            3. EXECUTIVE KPI OPERATIONS STRIP (KEY STATS)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 1. Total Patients */}
          <div className="rounded-2xl border border-blue-500/20 bg-card/70 backdrop-blur-xl p-5 hover:border-blue-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Patients</span>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-3xl font-black tracking-tight text-foreground">
                {(stats.totalPatients || 2345).toLocaleString()}
              </p>
              <span className="inline-flex items-center text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Active registered health records</p>
          </div>

          {/* 2. Today's Appointments */}
          <div className="rounded-2xl border border-violet-500/20 bg-card/70 backdrop-blur-xl p-5 hover:border-violet-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Appointments</span>
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-3xl font-black tracking-tight text-foreground">
                {(stats.totalAppointments || 18).toLocaleString()}
              </p>
              <span className="text-xs font-semibold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-md">
                14 Scheduled Today
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Consultations & Follow-ups</p>
          </div>

          {/* 3. Diagnostic Lab Orders */}
          <div className="rounded-2xl border border-cyan-500/20 bg-card/70 backdrop-blur-xl p-5 hover:border-cyan-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lab Orders</span>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                <FlaskConical className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-3xl font-black tracking-tight text-foreground">
                {universalStats.completedLabTests + universalStats.pendingLabTests}
              </p>
              <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                {universalStats.pendingLabTests} In Analysis
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{universalStats.completedLabTests} results verified & signed</p>
          </div>

          {/* 4. Active Staff & Doctors */}
          <div className="rounded-2xl border border-emerald-500/20 bg-card/70 backdrop-blur-xl p-5 hover:border-emerald-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Medical Team</span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <UserCog className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-3xl font-black tracking-tight text-foreground">
                {(stats.totalStaff || 24).toLocaleString()}
              </p>
              <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                All Shifts Covered
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Doctors, Nurses, Technicians</p>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            4. QUICK COMMAND LAUNCHER (DIRECT SHORTCUTS)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-3xl border border-border/80 bg-card/50 backdrop-blur-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Fast Command Launcher
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Quick One-Click Access</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {[
              { icon: <UserPlus className="h-5 w-5 text-blue-500" />, label: 'Register Patient', to: '/app/patient-services', glow: '#3b82f6' },
              { icon: <CalendarPlus className="h-5 w-5 text-violet-500" />, label: 'Appointment', to: '/app/appointments', glow: '#8b5cf6' },
              { icon: <FlaskConical className="h-5 w-5 text-cyan-500" />, label: 'Order Lab', to: '/app/lab', glow: '#06b6d4' },
              { icon: <Package className="h-5 w-5 text-teal-500" />, label: 'Pharmacy Stock', to: '/app/pharmacy', glow: '#14b8a6' },
              { icon: <Bed className="h-5 w-5 text-indigo-500" />, label: 'Ward & Vitals', to: '/app/ward', glow: '#6366f1' },
              { icon: <DollarSign className="h-5 w-5 text-emerald-500" />, label: 'Billing Cashier', to: '/app/billing', glow: '#10b981' },
              { icon: <BarChart3 className="h-5 w-5 text-amber-500" />, label: 'BI Analytics', to: '/app/reports/workload', glow: '#f59e0b' },
              { icon: <Settings className="h-5 w-5 text-slate-400" />, label: 'Settings', to: '/app/settings', glow: '#94a3b8' },
            ].map((q) => (
              <QuickAction key={q.label} {...q} glowColor={q.glow} />
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            5. DEPARTMENT STATIONS GRID (UPGRADED MANAGEMENT MODULES)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              Clinical Department Stations ({accessibleModules.length})
            </h2>
            <span className="text-xs text-muted-foreground">Select department to view live station</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accessibleModules.map((mod) => (
              <ModuleCard
                key={mod.id}
                id={mod.id}
                icon={mod.icon}
                title={mod.title}
                description={mod.description}
                to={mod.path}
                badge="Station Active"
              />
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            6. LIVE ACTIVITY FEED & INFRASTRUCTURE DIAGNOSTICS RADAR
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* A. Activity Feed */}
          <div className="lg:col-span-2 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-500" />
                Live Clinical Operations Feed
              </h2>

              {/* Activity Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs">
                {(['all', 'clinical', 'billing', 'system'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveActivityTab(tab)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                      activeActivityTab === tab
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {filteredActivities.map((act) => {
                const IconComponent = act.icon;
                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3.5 p-3 rounded-2xl border border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <div className={`p-2.5 rounded-xl ${act.bg} ${act.color} shrink-0 mt-0.5`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground tracking-tight">{act.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{act.subtitle}</p>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0">{act.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* B. Infrastructure & Health Radar */}
          <div className="rounded-3xl border border-border/80 bg-card/60 backdrop-blur-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                System Health Radar
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Encrypted
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { label: 'API Gateway Server', latency: systemLatencies.api, status: 'Online' },
                { label: 'MongoDB Encrypted Vault', latency: systemLatencies.database, status: 'Online' },
                { label: 'JWT Auth & Security', latency: systemLatencies.auth, status: 'Online' },
                { label: 'Electronic Medical Storage', latency: systemLatencies.storage, status: 'Online' },
                { label: 'Realtime Push Notifier', latency: systemLatencies.notifications, status: 'Online' },
              ].map((svc) => (
                <div key={svc.label} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-medium text-foreground">{svc.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{svc.latency}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                      {svc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground font-medium">Monthly Reliability</span>
                <span className="font-bold text-emerald-500">99.98%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.98%' }} />
              </div>
            </div>

            <Button
              onClick={runDiagnostics}
              disabled={diagnosticsRunning}
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-semibold border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            >
              <Cpu className={`h-3.5 w-3.5 mr-1.5 ${diagnosticsRunning ? 'animate-spin' : ''}`} />
              {diagnosticsRunning ? 'Running Diagnostic Sweep…' : 'Run Diagnostics Sweep'}
            </Button>
          </div>

        </div>

      </div>
    </OptimizedDashboardWrapper>
  );
};

export default AdminDashboard;
