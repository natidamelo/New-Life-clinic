import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Heart, Pill, AlertTriangle, CheckCircle2, User,
  Calendar, RefreshCw, Activity, Users, Stethoscope,
  ArrowRight, Syringe, Droplets, ClipboardList, TrendingUp,
  ChevronRight, Bell, BarChart2, Utensils, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import nurseTaskService from '../../services/nurseTaskService';
import patientService from '../../services/patientService';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DashStats {
  totalPatients: number;
  activePatients: number;
  pendingTasks: number;
  completedTasks: number;
  urgentTasks: number;
  medicationDue: number;
  vitalsNeeded: number;
  overdueCount: number;
  injectionTasks: number;
}

interface RecentTask {
  id: string;
  patientName: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  dueTime: string;
  isIpd?: boolean;
}

// ─── Quick-action card config ─────────────────────────────────────────────────
const quickActions = [
  {
    label: 'IPD Management',
    desc: 'Admit, discharge, bed billing',
    icon: Users,
    route: '/app/ward/ipd',
    color: 'bg-teal-600',
    lightBg: 'bg-teal-50',
    textColor: 'text-teal-600',
    statKey: null as keyof DashStats | null,
    statLabel: '',
  },
  {
    label: 'Administer Meds',
    desc: 'Doctor-prescribed schedules',
    icon: Pill,
    route: '/app/ward/medications-backup',
    color: 'bg-primary',
    lightBg: 'bg-primary/8',
    textColor: 'text-primary',
    statKey: 'medicationDue' as keyof DashStats,
    statLabel: 'due',
  },
  {
    label: 'Record Vitals',
    desc: 'BP, temp, pulse, SpO₂',
    icon: Heart,
    route: '/app/ward/vitals',
    color: 'bg-rose-500',
    lightBg: 'bg-rose-50',
    textColor: 'text-rose-600',
    statKey: 'vitalsNeeded' as keyof DashStats,
    statLabel: 'needed',
  },
  {
    label: 'Injections',
    desc: 'Scheduled injections',
    icon: Syringe,
    route: '/app/ward/injection',
    color: 'bg-violet-500',
    lightBg: 'bg-violet-50',
    textColor: 'text-violet-600',
    statKey: 'injectionTasks' as keyof DashStats,
    statLabel: 'pending',
  },
  {
    label: 'Blood Pressure',
    desc: 'Monitor & record BP',
    icon: Activity,
    route: '/app/ward/blood-pressure',
    color: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    textColor: 'text-amber-600',
    statKey: null,
    statLabel: '',
  },
  {
    label: 'DASH Diet',
    desc: 'Dietary management',
    icon: Utensils,
    route: '/app/ward/dash-diet',
    color: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    statKey: null,
    statLabel: '',
  },
  {
    label: 'Procedures',
    desc: 'Clinical procedures',
    icon: Stethoscope,
    route: '/app/procedures',
    color: 'bg-cyan-500',
    lightBg: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    statKey: null,
    statLabel: '',
  },
  {
    label: 'View Schedule',
    desc: "Today's appointments",
    icon: Calendar,
    route: '/app/appointments',
    color: 'bg-indigo-500',
    lightBg: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    statKey: null,
    statLabel: '',
  },
  {
    label: 'Monthly Report',
    desc: 'Workload & analytics',
    icon: BarChart2,
    route: '/app/nurse/monthly-report',
    color: 'bg-slate-500',
    lightBg: 'bg-slate-50',
    textColor: 'text-slate-600',
    statKey: null,
    statLabel: '',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const priorityConfig: Record<string, { label: string; cls: string; dot: string }> = {
  urgent:  { label: 'Urgent',  cls: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  high:    { label: 'High',    cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  medium:  { label: 'Medium',  cls: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  normal:  { label: 'Normal',  cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  low:     { label: 'Low',     cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
};

const typeIcon: Record<string, React.ReactNode> = {
  medication: <Pill size={14} />,
  vitals:     <Heart size={14} />,
  procedure:  <Stethoscope size={14} />,
  injection:  <Syringe size={14} />,
  other:      <ClipboardList size={14} />,
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return `Today ${formatTime(iso)}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + formatTime(iso);
  } catch { return '—'; }
}

// ─── Component ────────────────────────────────────────────────────────────────
const ModernWardDashboard: React.FC = () => {
  const { user, getToken } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashStats>({
    totalPatients: 0, activePatients: 0, pendingTasks: 0,
    completedTasks: 0, urgentTasks: 0, medicationDue: 0,
    vitalsNeeded: 0, overdueCount: 0, injectionTasks: 0,
  });
  const [pendingTasks, setPendingTasks]   = useState<RecentTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<RecentTask[]>([]);
  const [overdueTasks, setOverdueTasks]   = useState<RecentTask[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'overdue'>('pending');

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const token = getToken() || localStorage.getItem('token') || '';

      // Fetch tasks + patients in parallel
      const [tasksRaw, patientsRaw] = await Promise.all([
        nurseTaskService.getNurseTasks({ limit: 300 }, token),
        patientService.getPatients().catch(() => ({ data: { patients: [] } })),
      ]);

      const patients = (patientsRaw as any)?.data?.patients || (patientsRaw as any)?.patients || [];
      const activePatients = patients.filter((p: any) =>
        ['Admitted', 'Active', 'Emergency'].includes(p.status)
      ).length;

      // De-duplicate tasks
      const seen = new Set<string>();
      const tasks: RecentTask[] = [];
      for (const t of (tasksRaw || [])) {
        const key = `${t.patientId}-${t.description}-${(t.taskType || '').toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          tasks.push({
            id: t._id || t.id || '',
            patientName: t.patientName || t.patientInfo?.fullName || 'Unknown',
            description: t.description || '',
            type: (t.taskType || 'other').toLowerCase(),
            priority: (t.priority || 'normal').toLowerCase(),
            status: (t.status || 'pending').toLowerCase(),
            dueTime: t.dueDate || '',
            isIpd: !!(t as any).admissionId,
          });
        }
      }

      const pending   = tasks.filter(t => t.status === 'pending');
      const completed = tasks.filter(t => t.status === 'completed');
      const overdue   = tasks.filter(t => t.status === 'overdue');

      setPendingTasks(pending.slice(0, 50));
      setCompletedTasks(completed.slice(0, 20));
      setOverdueTasks(overdue.slice(0, 20));

      setStats({
        totalPatients:  patients.length,
        activePatients,
        pendingTasks:   pending.length,
        completedTasks: completed.length,
        urgentTasks:    pending.filter(t => t.priority === 'urgent' || t.priority === 'high').length,
        medicationDue:  pending.filter(t => t.type === 'medication').length,
        vitalsNeeded:   pending.filter(t => t.type === 'vitals').length,
        overdueCount:   overdue.length,
        injectionTasks: pending.filter(t => t.type === 'injection' || t.type === 'procedure').length,
      });
    } catch (err) {
      console.error('Ward dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const completionRate = stats.pendingTasks + stats.completedTasks > 0
    ? Math.round((stats.completedTasks / (stats.pendingTasks + stats.completedTasks)) * 100)
    : 0;

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Total Patients',
      value: stats.totalPatients,
      sub: `${stats.activePatients} active`,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/8',
      border: 'border-primary/15',
    },
    {
      label: 'Pending Tasks',
      value: stats.pendingTasks,
      sub: `${stats.urgentTasks} urgent`,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'Overdue',
      value: stats.overdueCount,
      sub: 'need attention',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
    },
    {
      label: 'Completed Today',
      value: stats.completedTasks,
      sub: `${completionRate}% rate`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
  ];

  // ── Task list renderer ──────────────────────────────────────────────────────
  const renderTaskList = (list: RecentTask[], emptyIcon: React.ReactNode, emptyMsg: string) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">Loading tasks…</span>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            {emptyIcon}
          </div>
          <p className="text-sm font-medium text-slate-500">{emptyMsg}</p>
        </div>
      );
    }
    return (
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {list.map(task => {
          const pc = priorityConfig[task.priority] || priorityConfig.normal;
          const icon = typeIcon[task.type] || typeIcon.other;
          return (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all group"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                ${task.type === 'medication' ? 'bg-primary/10 text-primary' :
                  task.type === 'vitals'     ? 'bg-rose-100 text-rose-500' :
                  task.type === 'injection'  ? 'bg-violet-100 text-violet-500' :
                  'bg-slate-100 text-slate-500'}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{task.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <User size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-500 truncate">{task.patientName}</span>
                  {task.dueTime && (
                    <>
                      <span className="text-slate-300">·</span>
                      <Clock size={11} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-400">{formatDate(task.dueTime)}</span>
                    </>
                  )}
                </div>
              </div>
              <span className="flex items-center gap-1.5 flex-shrink-0">
              {task.isIpd && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-700">IPD</span>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${pc.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                {pc.label}
              </span>
            </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/50 p-5 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nurse Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Use IPD Management for admit, discharge & bed billing; ward tasks, vitals & medications.
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {greeting()}, <span className="font-medium text-slate-700">{user?.firstName} {user?.lastName}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-medium text-slate-600">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="mx-2 text-slate-300">·</span>
              <span>{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.urgentTasks > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                <Bell size={13} className="animate-pulse" />
                {stats.urgentTasks} urgent
              </div>
            )}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => (
            <div key={card.label} className={`bg-white rounded-2xl border ${card.border} p-4 shadow-sm`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${card.color}`}>
                    {loading ? '—' : card.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon size={18} className={card.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Progress bar ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" />
              <span className="text-sm font-semibold text-slate-700">Today's Progress</span>
            </div>
            <span className={`text-sm font-bold ${completionRate >= 80 ? 'text-emerald-600' : completionRate >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>
              {loading ? '—' : `${completionRate}%`}
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${completionRate >= 80 ? 'bg-emerald-500' : completionRate >= 50 ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: loading ? '0%' : `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{stats.completedTasks} completed</span>
            <span>{stats.pendingTasks} remaining</span>
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(action => {
              const count = action.statKey ? stats[action.statKey] : null;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.route)}
                  className="group bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-300 hover:shadow-md transition-all duration-150 active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${action.lightBg} flex items-center justify-center`}>
                      <action.icon size={18} className={action.textColor} />
                    </div>
                    {count !== null && count > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${action.lightBg} ${action.textColor}`}>
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-tight">{action.desc}</p>
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className={`text-xs font-medium ${action.textColor}`}>Open</span>
                    <ChevronRight size={12} className={action.textColor} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Task Feed ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-100">
            {([
              { key: 'pending',   label: 'Pending',   count: stats.pendingTasks,   color: 'text-amber-600' },
              { key: 'overdue',   label: 'Overdue',   count: stats.overdueCount,   color: 'text-red-600' },
              { key: 'completed', label: 'Completed', count: stats.completedTasks, color: 'text-emerald-600' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.key
                    ? `border-primary ${tab.color}`
                    : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label}
                {!loading && tab.count > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full
                    ${activeTab === tab.key
                      ? tab.key === 'overdue' ? 'bg-red-100 text-red-700'
                        : tab.key === 'completed' ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => navigate('/app/nurse/tasks')}
              className="flex items-center gap-1 px-4 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'pending' && renderTaskList(
              pendingTasks,
              <Clock size={20} className="text-slate-400" />,
              'No pending tasks — great work!'
            )}
            {activeTab === 'overdue' && renderTaskList(
              overdueTasks,
              <CheckCircle2 size={20} className="text-slate-400" />,
              'No overdue tasks'
            )}
            {activeTab === 'completed' && renderTaskList(
              completedTasks,
              <CheckCircle2 size={20} className="text-slate-400" />,
              'No completed tasks yet today'
            )}
          </div>
        </div>

        {/* ── Bottom summary strip ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Meds Due',       value: stats.medicationDue,  icon: Pill,          color: 'text-primary',    bg: 'bg-primary/8' },
            { label: 'Vitals Needed',  value: stats.vitalsNeeded,   icon: Heart,         color: 'text-rose-600',   bg: 'bg-rose-50' },
            { label: 'Injections',     value: stats.injectionTasks, icon: Syringe,       color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Overdue',        value: stats.overdueCount,   icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50' },
          ].map(item => (
            <div key={item.label} className={`${item.bg} rounded-2xl p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                <item.icon size={16} className={item.color} />
              </div>
              <div>
                <div className={`text-xl font-bold ${item.color}`}>{loading ? '—' : item.value}</div>
                <div className="text-xs text-slate-500 font-medium">{item.label}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default ModernWardDashboard;
