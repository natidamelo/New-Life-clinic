'use client';

import React from 'react';
import { HourlyFlowData, DepartmentLoadData } from './types';
import { BarChart3, PieChart, Users, ArrowUpRight } from 'lucide-react';

interface AnalyticsChartsProps {
  hourlyFlow: HourlyFlowData[];
  departmentLoad: DepartmentLoadData[];
  isDarkMode: boolean;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  hourlyFlow,
  departmentLoad,
  isDarkMode,
}) => {
  const maxPatients = Math.max(...hourlyFlow.map((h) => h.patients), 40);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── CARD 1: PATIENT FLOW BY HOUR (CLEAN BAR CHART IN CLINICAL TEAL) ── */}
      <div className="rounded-xl border bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] shadow-sm p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155]">
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(20,184,166,0.15)' : 'rgba(13,148,136,0.10)',
                  color: isDarkMode ? '#14B8A6' : '#0D9488',
                }}
              >
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                  Patient Flow by Hour
                </h3>
                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  Hourly admissions & triage check-ins (08:00 – 17:00)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: isDarkMode ? '#14B8A6' : '#0D9488' }}
                />
                Arrivals
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-amber-500" />
                Peak Triage
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="mt-6 h-48 flex items-end justify-between gap-2 pt-6 px-1">
            {hourlyFlow.map((item) => {
              const heightPercent = Math.round((item.patients / maxPatients) * 100);
              const isPeak = item.isPeak;

              return (
                <div key={item.hour} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded shadow-sm text-white bg-[#0F172A] dark:bg-white dark:text-[#0F172A] pointer-events-none mb-1">
                    {item.patients}
                  </div>

                  {/* Bar */}
                  <div className="w-full max-w-[28px] h-36 flex items-end rounded-t-md overflow-hidden bg-[#F1F5F9] dark:bg-[#0F172A]/80">
                    <div
                      className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-110"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: isPeak
                          ? '#F59E0B'
                          : isDarkMode
                          ? '#14B8A6'
                          : '#0D9488',
                      }}
                    />
                  </div>

                  {/* X-axis label */}
                  <span className="text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] group-hover:text-[#0F172A] dark:group-hover:text-[#F8FAFC]">
                    {item.hour.split(':')[0]}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
          <span className="text-[11px]">
            Peak intake observed between <strong className="text-[#0F172A] dark:text-[#F8FAFC]">10:00 – 11:30 AM</strong>
          </span>
          <span className="text-[11px] font-mono font-semibold tabular-nums text-[#0D9488] dark:text-[#14B8A6]">
            218 total day check-ins
          </span>
        </div>
      </div>

      {/* ── CARD 2: DEPARTMENT LOAD BREAKDOWN ── */}
      <div className="rounded-xl border bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] shadow-sm p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#334155]">
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(20,184,166,0.15)' : 'rgba(13,148,136,0.10)',
                  color: isDarkMode ? '#14B8A6' : '#0D9488',
                }}
              >
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
                  Department Load Breakdown
                </h3>
                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  Capacity utilization across clinical services
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
              Balanced
            </span>
          </div>

          {/* Department Distribution Bars */}
          <div className="mt-5 space-y-3.5">
            {departmentLoad.map((dept, index) => {
              const barColors = [
                isDarkMode ? '#14B8A6' : '#0D9488', // Primary Clinical Teal
                '#3B82F6', // Blue
                '#8B5CF6', // Purple
                '#F59E0B', // Amber
                '#EF4444', // Crimson
              ];
              const color = barColors[index % barColors.length];

              return (
                <div key={dept.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      {dept.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                        {dept.count} consultations
                      </span>
                      <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums text-xs">
                        {dept.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-[#F1F5F9] dark:bg-[#0F172A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${dept.percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
          <span className="text-[11px]">
            Highest volume in <strong className="text-[#0F172A] dark:text-[#F8FAFC]">General OPD (42%)</strong>
          </span>
          <button className="text-[11px] font-semibold text-[#0D9488] dark:text-[#14B8A6] hover:underline flex items-center gap-0.5">
            View Specialty Roster
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </div>

    </section>
  );
};
