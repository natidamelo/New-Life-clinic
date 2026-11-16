'use client';

import React, { useState } from 'react';
import {
  CriticalAlertItem,
  PharmacyStockItem
} from './types';
import {
  AlertTriangle,
  Pill,
  Clock,
  FlaskConical,
  Check,
  ShoppingCart,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface CriticalAlertsPanelProps {
  alerts: CriticalAlertItem[];
  lowStockItems: PharmacyStockItem[];
  onAcknowledgeAlert: (alertId: string) => void;
  onReorderItem: (itemId: string) => void;
  isDarkMode: boolean;
}

export const CriticalAlertsPanel: React.FC<CriticalAlertsPanelProps> = ({
  alerts,
  lowStockItems,
  onAcknowledgeAlert,
  onReorderItem,
  isDarkMode,
}) => {
  const [reorderedMap, setReorderedMap] = useState<Record<string, boolean>>({});

  const handleReorder = (id: string) => {
    setReorderedMap((prev) => ({ ...prev, [id]: true }));
    onReorderItem(id);
  };

  return (
    <div className="space-y-6">

      {/* ── SECTION 1: CRITICAL ALERTS & LAB PANIC VALUES ── */}
      <div className="rounded-xl border bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                Critical Alerts & Lab Review
              </h3>
              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                Requires immediate physician attention
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25 tabular-nums">
            {alerts.length} Pending
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          {alerts.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#10B981] flex flex-col items-center gap-1.5">
              <Check className="h-5 w-5" />
              <span className="font-semibold">All critical lab values reviewed</span>
            </div>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.urgency === 'critical';

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border transition-all text-xs flex items-start justify-between gap-3 ${
                    isCritical
                      ? 'bg-[#EF4444]/5 border-[#EF4444]/20 hover:border-[#EF4444]/40'
                      : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isCritical ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      )}
                      <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-xs truncate">
                        {alert.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-snug">
                      {alert.subtitle}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      <Clock className="h-3 w-3" />
                      <span>{alert.timestamp}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onAcknowledgeAlert(alert.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors border bg-white dark:bg-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#334155]"
                    title="Acknowledge alert"
                  >
                    Review
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── SECTION 2: PHARMACY LOW-STOCK PANEL ── */}
      <div className="rounded-xl border bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Pill className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                Pharmacy Low-Stock Monitor
              </h3>
              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                Consumables & essential medicines
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8]">
            5 items
          </span>
        </div>

        <div className="mt-3 divide-y divide-[#E2E8F0] dark:divide-[#334155]">
          {lowStockItems.map((med) => {
            const isCritical = med.status === 'Critical';
            const isReordered = reorderedMap[med.id];

            return (
              <div
                key={med.id}
                className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {med.name}
                    </span>
                    {isCritical ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/25 shrink-0">
                        Critical
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                        Low
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    <span>{med.dosage}</span>
                    <span>•</span>
                    <span className="tabular-nums font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {med.currentStock} {med.unit} left
                    </span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      (Min: {med.reorderLevel})
                    </span>
                  </div>
                </div>

                <div>
                  {isReordered ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981] px-2.5 py-1 rounded-lg bg-[#10B981]/10">
                      <Check className="h-3 w-3" />
                      Ordered
                    </span>
                  ) : (
                    <button
                      onClick={() => handleReorder(med.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1 active:scale-95"
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
                      <ShoppingCart className="h-3 w-3" />
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-[#E2E8F0] dark:border-[#334155] text-right">
          <button
            className="text-xs font-semibold text-[#0D9488] dark:text-[#14B8A6] hover:underline inline-flex items-center gap-1"
          >
            <span>Open Inventory Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
