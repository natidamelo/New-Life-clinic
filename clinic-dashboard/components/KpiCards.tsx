'use client';

import React from 'react';
import {
  Users,
  Clock,
  AlertTriangle,
  Receipt,
  TrendingUp,
  Activity
} from 'lucide-react';

interface KpiCardsProps {
  totalPatientsToday: number;
  waitingQueueCount: number;
  avgWaitMinutes: number;
  lowStockCount: number;
  dailyRevenueEtb: number;
  isDarkMode: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalPatientsToday,
  waitingQueueCount,
  avgWaitMinutes,
  lowStockCount,
  dailyRevenueEtb,
  isDarkMode,
}) => {
  const cards = [
    {
      id: 'patients',
      label: "Today's Patients",
      value: totalPatientsToday.toLocaleString(),
      change: '+8.4%',
      isPositive: true,
      context: 'vs previous day',
      icon: Users,
      iconColor: isDarkMode ? '#14B8A6' : '#0D9488',
      iconBg: isDarkMode ? 'rgba(20,184,166,0.12)' : 'rgba(13,148,136,0.10)',
      subtext: '86 OPD • 34 Peds • 22 MCH',
    },
    {
      id: 'queue',
      label: 'Waiting Room Queue',
      value: waitingQueueCount.toString(),
      secondaryPill: `Avg wait: ${avgWaitMinutes} min`,
      context: 'Real-time triage telemetry',
      icon: Clock,
      iconColor: '#F59E0B',
      iconBg: 'rgba(245,158,11,0.10)',
      subtext: '9 waiting • 6 in consult • 3 triaged',
    },
    {
      id: 'low_stock',
      label: 'Low-Stock Alerts',
      value: lowStockCount.toString(),
      alertBadge: '2 Critical',
      context: 'Pharmacy & consumables',
      icon: AlertTriangle,
      iconColor: '#EF4444',
      iconBg: 'rgba(239,68,68,0.10)',
      subtext: 'Ceftriaxone & Saline below safety limit',
    },
    {
      id: 'revenue',
      label: 'Daily Revenue',
      value: `ETB ${dailyRevenueEtb.toLocaleString()}`,
      change: '+12.1%',
      isPositive: true,
      context: 'vs daily budget target',
      icon: Receipt,
      iconColor: '#10B981',
      iconBg: 'rgba(16,185,129,0.10)',
      subtext: 'ETB 61,400 cash/telebirr • 22.8k insurance',
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            className="rounded-xl p-5 border transition-all duration-200 bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-tight">
                {card.label}
              </span>
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#0F172A] dark:text-[#F8FAFC]">
                {card.value}
              </span>

              {card.change && (
                <span className="inline-flex items-center text-xs font-bold tabular-nums px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#10B981]">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  {card.change}
                </span>
              )}

              {card.secondaryPill && (
                <span className="inline-flex items-center text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {card.secondaryPill}
                </span>
              )}

              {card.alertBadge && (
                <span className="inline-flex items-center text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                  {card.alertBadge}
                </span>
              )}
            </div>

            <p className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </section>
  );
};
