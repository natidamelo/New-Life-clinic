import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import adminService, { AdminDashboardStats } from '../../services/adminService';
import { toast } from 'react-hot-toast';
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
  FileText,
  UserPlus,
  CalendarPlus,
  Package
} from 'lucide-react';

import { adminDashboardModules } from '../../config/dashboardModules.tsx';
import OptimizedDashboardWrapper from '../../components/dashboard/OptimizedDashboardWrapper';

// ─── Module icon map (lucide replacements for heroicons) ─────────────────────
const moduleIconMap: Record<string, React.ReactNode> = {
  facility:         <Building2 className="h-6 w-6" />,
  'patient-services': <Users className="h-6 w-6" />,
  appointments:     <Calendar className="h-6 w-6" />,
  pharmacy:         <ShoppingCart className="h-6 w-6" />,
  imaging:          <Camera className="h-6 w-6" />,
  finance:          <DollarSign className="h-6 w-6" />,
  reports:          <BarChart3 className="h-6 w-6" />,
  settings:         <Settings className="h-6 w-6" />,
  lab:              <FlaskConical className="h-6 w-6" />,
  'staff-management': <UserCog className="h-6 w-6" />,
};

// ─── Color map for module cards ───────────────────────────────────────────────
const moduleColorMap: Record<string, { bg: string; icon: string; border: string }> = {
  facility:           { bg: 'bg-emerald-50',  icon: 'text-emerald-600',  border: 'border-l-emerald-500' },
  'patient-services': { bg: 'bg-blue-50',     icon: 'text-blue-600',     border: 'border-l-blue-500' },
  appointments:       { bg: 'bg-violet-50',   icon: 'text-violet-600',   border: 'border-l-violet-500' },
  pharmacy:           { bg: 'bg-teal-50',     icon: 'text-teal-600',     border: 'border-l-teal-500' },
  imaging:            { bg: 'bg-purple-50',   icon: 'text-purple-600',   border: 'border-l-purple-500' },
  finance:            { bg: 'bg-amber-50',    icon: 'text-amber-600',    border: 'border-l-amber-500' },
  reports:            { bg: 'bg-indigo-50',   icon: 'text-indigo-600',   border: 'border-l-indigo-500' },
  settings:           { bg: 'bg-slate-50',    icon: 'text-slate-600',    border: 'border-l-slate-500' },
  lab:                { bg: 'bg-cyan-50',     icon: 'text-cyan-600',     border: 'border-l-cyan-500' },
  'staff-management': { bg: 'bg-rose-50',     icon: 'text-rose-600',     border: 'border-l-rose-500' },
};

// ─── Module Card ─────────────────────────────────────────────────────────────
interface ModuleCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  to: string;
  description?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ id, icon, title, to, description }) => {
  const navigate = useNavigate();
  const colors = moduleColorMap[id] ?? { bg: 'bg-gray-50', icon: 'text-gray-600', border: 'border-l-gray-400' };

  return (
    <Card
      className={`group border-l-4 ${colors.border} hover:shadow-lg transition-all duration-200 cursor-pointer bg-white hover:-translate-y-0.5`}
      onClick={() => navigate(to)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(to); } }}
      tabIndex={0}
      role="button"
      aria-label={`Navigate to ${title}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex-shrink-0 p-3 rounded-xl ${colors.bg} ${colors.icon} group-hover:scale-110 transition-transform duration-200`}>
            {moduleIconMap[id] ?? icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base leading-tight">{title}</h3>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5 leading-snug line-clamp-2">{description}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Quick Action Button ──────────────────────────────────────────────────────
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, to, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-transparent hover:shadow-md transition-all duration-200 group ${color}`}
    >
      <div className="group-hover:scale-110 transition-transform duration-200">{icon}</div>
      <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </button>
  );
};

// ─── Activity Item ────────────────────────────────────────────────────────────
interface ActivityItemProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  time: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ icon, iconBg, title, subtitle, time }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
    <div className={`flex-shrink-0 p-2 rounded-lg ${iconBg}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 leading-tight">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </div>
    <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{time}</span>
  </div>
);

// ─── System Status Badge ──────────────────────────────────────────────────────
const SystemStatusBadge: React.FC<{ status: 'online' | 'degraded' | 'offline' }> = ({ status }) => {
  const map = {
    online:   { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'All Systems Operational' },
    degraded: { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   label: 'Partial Degradation' },
    offline:  { dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     label: 'System Offline' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
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
    <span className="text-sm font-mono text-gray-500">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalStaff: 0,
    totalDepartments: 0,
  });
  const [systemStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    try {
      const dashboardStats = await adminService.getDashboardStats();
      setStats(dashboardStats);
    } catch {
      setStats({ totalPatients: 0, totalAppointments: 0, totalStaff: 0, totalDepartments: 0 });
    }
  }, []);

  useEffect(() => {
    setLoading(false);
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  }, [fetchStats]);

  const accessibleModules = useMemo(() => {
    const role = user?.role ?? 'admin';
    return adminDashboardModules.filter(m => m.requiredRoles.includes(role as any));
  }, [user]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
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
        totalRevenue: stats.totalDepartments * 1000,
        totalAppointments: stats.totalAppointments,
        totalPatients: stats.totalPatients,
      }}
      onRefresh={handleRefresh}
    >
      <div className="space-y-8">

        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-xl">
          {/* decorative circles */}
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/5" />
          <div className="absolute top-4 right-32 h-20 w-20 rounded-full bg-white/5" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HeartPulse className="h-5 w-5 text-blue-200" />
                <span className="text-blue-200 text-sm font-medium">New Life Clinic</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome back, {user?.firstName || 'Admin'} 👋
              </h1>
              <p className="text-blue-200 text-sm mt-1">{today}</p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3">
                <LiveClock />
                <SystemStatusBadge status={systemStatus} />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Mini stat strip */}
          <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Patients', value: stats.totalPatients.toLocaleString(), icon: <Users className="h-4 w-4" /> },
              { label: 'Staff Members',  value: stats.totalStaff.toLocaleString(),    icon: <UserCog className="h-4 w-4" /> },
              { label: 'Appointments',   value: stats.totalAppointments.toLocaleString(), icon: <Calendar className="h-4 w-4" /> },
              { label: 'Departments',    value: stats.totalDepartments.toLocaleString(),  icon: <Building2 className="h-4 w-4" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl bg-white/10 backdrop-blur-sm p-3 flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-white/20">{icon}</div>
                <div>
                  <p className="text-white/70 text-xs">{label}</p>
                  <p className="text-white font-bold text-lg leading-tight">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[
              { icon: <UserPlus className="h-6 w-6 text-blue-600" />,    label: 'New Patient',    to: '/app/patient-services', color: 'hover:bg-blue-50' },
              { icon: <CalendarPlus className="h-6 w-6 text-violet-600" />, label: 'Book Appointment', to: '/app/appointments', color: 'hover:bg-violet-50' },
              { icon: <FileText className="h-6 w-6 text-emerald-600" />, label: 'View Reports',   to: '/app/reports',          color: 'hover:bg-emerald-50' },
              { icon: <Package className="h-6 w-6 text-amber-600" />,    label: 'Stock Check',    to: '/app/inventory',        color: 'hover:bg-amber-50' },
              { icon: <FlaskConical className="h-6 w-6 text-cyan-600" />, label: 'Lab Orders',    to: '/app/lab',              color: 'hover:bg-cyan-50' },
              { icon: <Settings className="h-6 w-6 text-slate-600" />,   label: 'Settings',       to: '/app/settings',         color: 'hover:bg-slate-50' },
            ].map((a) => (
              <QuickAction key={a.label} {...a} />
            ))}
          </div>
        </div>

        {/* ── Management Modules ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Management Modules
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {accessibleModules.length} modules
            </span>
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
              />
            ))}
          </div>
        </div>

        {/* ── Bottom Row: Activity + System Health ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Activity */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-7 px-2">
                View all <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {[
                { icon: <UserPlus className="h-3.5 w-3.5 text-blue-600" />,    iconBg: 'bg-blue-50',    title: 'New patient registered',          subtitle: 'Patient #549 added to the system',         time: '2m ago' },
                { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />, iconBg: 'bg-emerald-50', title: 'Appointment completed',           subtitle: 'Dr. Sarah — Consultation room 3',          time: '15m ago' },
                { icon: <FlaskConical className="h-3.5 w-3.5 text-cyan-600" />, iconBg: 'bg-cyan-50',   title: 'Lab results ready',               subtitle: 'CBC panel for patient #541',               time: '32m ago' },
                { icon: <DollarSign className="h-3.5 w-3.5 text-amber-600" />,  iconBg: 'bg-amber-50',  title: 'Invoice paid',                    subtitle: 'Invoice #INV-2024-0089 — $1,050',          time: '1h ago' },
                { icon: <AlertCircle className="h-3.5 w-3.5 text-rose-600" />,  iconBg: 'bg-rose-50',   title: 'Low stock alert',                 subtitle: 'Paracetamol 500mg below reorder level',    time: '2h ago' },
                { icon: <UserCog className="h-3.5 w-3.5 text-violet-600" />,    iconBg: 'bg-violet-50', title: 'Staff schedule updated',          subtitle: 'Night shift roster for next week',         time: '3h ago' },
              ].map((item, i) => (
                <ActivityItem key={i} {...item} />
              ))}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[
                { label: 'API Server',     status: true,  latency: '42ms' },
                { label: 'Database',       status: true,  latency: '18ms' },
                { label: 'Auth Service',   status: true,  latency: '25ms' },
                { label: 'File Storage',   status: true,  latency: '61ms' },
                { label: 'Notifications',  status: true,  latency: '—' },
              ].map(({ label, status, latency }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${status ? 'bg-emerald-500' : 'bg-red-500'} ${status ? 'animate-pulse' : ''}`} />
                    <span className="text-sm text-gray-700">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">{latency}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${status ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {status ? 'OK' : 'DOWN'}
                    </span>
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Server Uptime</span>
                  <span className="text-xs font-semibold text-emerald-700">99.9%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.9%' }} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-500">Last checked</span>
                <LiveClock />
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </OptimizedDashboardWrapper>
  );
};

export default AdminDashboard;
