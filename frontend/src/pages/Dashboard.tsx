import React from 'react';
import { Link } from 'react-router-dom';

const TrendUpIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const UserGroupIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const BeakerIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CurrencyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const stats = [
  {
    name: 'Total Patients',
    value: '2,345',
    change: '+12%',
    changeLabel: 'vs last month',
    positive: true,
    icon: UserGroupIcon,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    accent: 'border-l-blue-500',
  },
  {
    name: "Today's Appointments",
    value: '12',
    change: '+3',
    changeLabel: 'since yesterday',
    positive: true,
    icon: CalendarIcon,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    accent: 'border-l-violet-500',
  },
  {
    name: 'Pending Lab Tests',
    value: '8',
    change: '-2',
    changeLabel: 'from this morning',
    positive: false,
    icon: BeakerIcon,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accent: 'border-l-amber-500',
  },
  {
    name: "Today's Revenue",
    value: 'ETB 4,820',
    change: '+8%',
    changeLabel: 'vs yesterday',
    positive: true,
    icon: CurrencyIcon,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    accent: 'border-l-emerald-500',
  },
];

const quickActions = [
  {
    name: 'Register Patient',
    href: '/app/reception/register',
    icon: UserGroupIcon,
    color: 'bg-blue-500 hover:bg-blue-600',
    description: 'Add a new patient record',
  },
  {
    name: 'New Appointment',
    href: '/app/appointments',
    icon: CalendarIcon,
    color: 'bg-violet-500 hover:bg-violet-600',
    description: 'Schedule a consultation',
  },
  {
    name: 'Lab Request',
    href: '/app/lab',
    icon: BeakerIcon,
    color: 'bg-amber-500 hover:bg-amber-600',
    description: 'Order lab tests',
  },
];

const recentActivity = [
  {
    id: 1,
    title: 'New patient registered',
    desc: 'Aisha Mohammed was registered as a new patient.',
    time: '2 minutes ago',
    type: 'patient',
    dot: 'bg-blue-500',
  },
  {
    id: 2,
    title: 'Lab results ready',
    desc: 'Blood panel results for Patient #1042 are available.',
    time: '18 minutes ago',
    type: 'lab',
    dot: 'bg-amber-500',
  },
  {
    id: 3,
    title: 'Appointment confirmed',
    desc: 'Dr. Kebede confirmed appointment with Dawit Haile at 2:00 PM.',
    time: '1 hour ago',
    type: 'appointment',
    dot: 'bg-violet-500',
  },
  {
    id: 4,
    title: 'Invoice paid',
    desc: 'Invoice #INV-2024-0198 of ETB 1,200 has been settled.',
    time: '2 hours ago',
    type: 'billing',
    dot: 'bg-emerald-500',
  },
];

const upcomingAppointments = [
  { id: 1, patient: 'Tigist Alemu', doctor: 'Dr. Kebede', time: '10:00 AM', type: 'Consultation' },
  { id: 2, patient: 'Yonas Bekele', doctor: 'Dr. Haile', time: '11:30 AM', type: 'Follow-up' },
  { id: 3, patient: 'Meron Tadesse', doctor: 'Dr. Kebede', time: '2:00 PM', type: 'Lab Review' },
];

const Dashboard: React.FC = () => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
        <Link
          to="/app/reception/register"
          className="hidden sm:inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg text-primary-foreground transition-all duration-150 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ background: 'hsl(var(--primary))' }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Patient
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className={`relative bg-card rounded-xl border border-border shadow-sm overflow-hidden border-l-4 ${stat.accent} hover:shadow-md transition-shadow duration-200`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className={`h-10 w-10 rounded-lg ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    stat.positive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  <TrendUpIcon />
                  {stat.change}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="mt-0.5 text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">{stat.changeLabel}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity — takes 2 cols */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <span className="text-xs text-muted-foreground font-medium">Today</span>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors duration-100">
                <div className="mt-1.5 flex-shrink-0">
                  <span className={`h-2 w-2 rounded-full block ${item.dot}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{item.desc}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-muted-foreground/60 whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border">
            <button className="text-xs font-medium text-primary hover:underline">View all activity →</button>
          </div>
        </div>

        {/* Quick Actions — 1 col */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                style={{ textDecoration: 'none' }}
                className={`flex items-center gap-3 w-full p-3 rounded-lg text-white ${action.color} transition-all duration-150 shadow-sm hover:shadow-md group`}
              >
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold leading-tight">{action.name}</p>
                  <p className="text-xs text-white/70 mt-0.5">{action.description}</p>
                </div>
                <svg className="ml-auto h-4 w-4 text-white/60 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Upcoming Appointments</h3>
          <Link to="/app/appointments" className="text-xs font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doctor</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {upcomingAppointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-muted/30 transition-colors duration-100">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">{appt.patient[0]}</span>
                      </div>
                      <span className="font-medium text-foreground">{appt.patient}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{appt.doctor}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                      <ClockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {appt.time}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{appt.type}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Scheduled
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
