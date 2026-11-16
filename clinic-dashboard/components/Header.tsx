'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Bell,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  X
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCheckIn: () => void;
  urgentAlertCount: number;
  isDarkMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenCheckIn,
  urgentAlertCount,
  isDarkMode,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 sticky top-0 z-20 px-6 flex items-center justify-between border-b bg-[#FFFFFF]/90 dark:bg-[#1E293B]/90 backdrop-blur-md border-[#E2E8F0] dark:border-[#334155] transition-colors">
      
      {/* ── LEFT: GLOBAL SEARCH BAR ── */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B] dark:text-[#94A3B8]">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search patients by name, token #, or ID (e.g. NL-8841)..."
            className="w-full h-10 pl-10 pr-10 text-xs rounded-xl border transition-all outline-none bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#334155] placeholder-[#64748B] dark:placeholder-[#94A3B8] focus:border-[#0D9488] dark:focus:border-[#14B8A6] focus:ring-1 focus:ring-[#0D9488] dark:focus:ring-[#14B8A6]"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border bg-white dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#334155]">
                /
              </kbd>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: ACTIONS & PROFILE ── */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        
        {/* Quick Action Button in Clinical Teal */}
        <button
          onClick={onOpenCheckIn}
          className="h-10 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-sm active:scale-95"
          style={{
            backgroundColor: isDarkMode ? '#14B8A6' : '#0D9488',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#2DD4BF' : '#0F766E';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#14B8A6' : '#0D9488';
          }}
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span className="hidden sm:inline">+ New Patient Check-In</span>
          <span className="sm:hidden">Check-In</span>
        </button>

        {/* Urgent Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="h-10 w-10 rounded-xl flex items-center justify-center border transition-colors relative bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#334155] hover:bg-[#E2E8F0]/40 dark:hover:bg-[#334155]/40"
            title="Urgent notifications"
          >
            <Bell className="h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
            {urgentAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center bg-[#EF4444] shadow-sm tabular-nums">
                {urgentAlertCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border shadow-xl z-50 p-4 bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155]"
              style={{
                boxShadow: isDarkMode ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(15,23,42,0.1)',
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155]">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                    Urgent Clinical Alerts
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444]">
                    {urgentAlertCount} Active
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                <div className="p-2.5 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Panic Lab Value: Serum K⁺ 6.2 mmol/L</p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Patient #NL-7319 • Immediate review needed</p>
                    <span className="text-[10px] text-[#EF4444] font-semibold mt-1 inline-block">10 min ago</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Expiring Batch: Amoxicillin 500mg</p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Batch #AMX-821 expires in 4 calendar days</p>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1 inline-block">25 min ago</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Platelets 42,000 /μL Alert</p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">Patient #NL-9204 in Triage Room 1</p>
                    <span className="text-[10px] text-[#EF4444] font-semibold mt-1 inline-block">32 min ago</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#E2E8F0] dark:border-[#334155] text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-semibold text-[#0D9488] dark:text-[#14B8A6] hover:underline"
                >
                  Mark all alerts acknowledged
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-[#E2E8F0] dark:border-[#334155]">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
            style={{ backgroundColor: isDarkMode ? '#14B8A6' : '#0D9488' }}
          >
            DH
          </div>
          <div className="hidden md:block leading-tight text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Dr. Dawit Haile
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
            </div>
            <p className="text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
              Chief Medical Officer
            </p>
          </div>
        </div>

      </div>

    </header>
  );
};
