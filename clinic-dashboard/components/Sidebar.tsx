'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  Receipt,
  UserCog,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Activity,
  HeartPulse
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeNav: string;
  onSelectNav: (id: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeNav,
  onSelectNav,
  isDarkMode,
  onToggleTheme,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'queue', label: 'Patient Queue', icon: Users, badge: '18' },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays },
    { id: 'pharmacy', label: 'Pharmacy & Inventory', icon: Pill, alertBadge: '5' },
    { id: 'labs', label: 'Lab Orders', icon: FlaskConical },
    { id: 'billing', label: 'Billing & Invoices', icon: Receipt },
    { id: 'staff', label: 'Staff', icon: UserCog },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 transition-all duration-300 ease-in-out flex flex-col border-r select-none
        ${collapsed ? 'w-16' : 'w-60'}
        bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155]
      `}
      style={{
        boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 12px rgba(15,23,42,0.03)',
      }}
    >
      {/* ── CLINIC BRAND HEADER ── */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-[#E2E8F0] dark:border-[#334155] shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-white font-black shadow-sm"
            style={{ backgroundColor: isDarkMode ? '#14B8A6' : '#0D9488' }}
          >
            <HeartPulse className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] truncate">
                New Life Clinic
              </h1>
              <p className="text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8] tracking-wider uppercase">
                Medium Clinic
              </p>
            </div>
          )}
        </div>

        {/* Collapse button */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* ── VERTICAL NAVIGATION ── */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative
                ${
                  isActive
                    ? isDarkMode
                      ? 'bg-[#14B8A6]/15 text-[#14B8A6] font-bold'
                      : 'bg-[#0D9488]/10 text-[#0D9488] font-bold'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              {/* Active left indicator bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full"
                  style={{ backgroundColor: isDarkMode ? '#14B8A6' : '#0D9488' }}
                />
              )}

              <Icon
                className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? (isDarkMode ? 'text-[#14B8A6]' : 'text-[#0D9488]') : ''
                }`}
              />

              {!collapsed && (
                <span className="truncate text-left flex-1">{item.label}</span>
              )}

              {!collapsed && item.badge && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums bg-[#F1F5F9] dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8]">
                  {item.badge}
                </span>
              )}

              {!collapsed && item.alertBadge && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {item.alertBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── THEME SWITCHER & FOOTER ── */}
      <div className="p-3 border-t border-[#E2E8F0] dark:border-[#334155] shrink-0 space-y-2">
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155] transition-all"
          title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} mode`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {isDarkMode ? (
              <Moon className="h-4 w-4 text-[#14B8A6] shrink-0" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            {!collapsed && (
              <span className="truncate">
                {isDarkMode ? 'Command Mode (Dark)' : 'Clinical Room (Light)'}
              </span>
            )}
          </div>
          {!collapsed && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: isDarkMode ? '#14B8A6' : '#0D9488',
                color: '#FFFFFF',
              }}
            >
              {isDarkMode ? 'Dark' : 'Light'}
            </span>
          )}
        </button>

        {!collapsed && (
          <div className="px-1 text-[10px] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between">
            <span>v2.4 Production</span>
            <span className="flex items-center gap-1 text-[#10B981] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Online
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
