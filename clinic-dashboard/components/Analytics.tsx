"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Building2,
  TrendingUp,
  Clock,
  Users,
  Activity,
  Layers,
} from "lucide-react";
import { hourlyPatientFlow, departmentLoad, type HourlyFlow, type DepartmentLoad } from "@/lib/mock-data";

export default function Analytics() {
  const [hoveredHour, setHoveredHour] = useState<HourlyFlow | null>(null);

  // Maximum flow value for scaling bars
  const maxFlow = Math.max(...hourlyPatientFlow.map((f) => f.patients), 16);
  const totalFlowPatients = hourlyPatientFlow.reduce((acc, curr) => acc + curr.patients, 0);
  const peakHour = hourlyPatientFlow.reduce((prev, curr) => (curr.patients > prev.patients ? curr : prev), hourlyPatientFlow[0]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {/* ─── Card 1: Patient Flow by Hour ─────────────────────────────────── */}
      <div className="bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark rounded-xl p-5 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-clinical-50 dark:bg-clinical-600/15 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-clinical-600 dark:text-clinical-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-deep-slate dark:text-[#F8FAFC]">
                  Patient Flow by Hour
                </h3>
                <p className="text-xs text-cool-slate dark:text-[#94A3B8]">
                  Volume distribution from 7:00 AM to 5:00 PM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-clinical-700 dark:text-clinical-300 bg-clinical-50 dark:bg-clinical-600/20 px-2.5 py-1 rounded-full tabular-nums">
                Peak: {peakHour.label} ({peakHour.patients} pts)
              </span>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-3 gap-2 py-2.5 px-3 mb-5 rounded-lg bg-alabaster dark:bg-[#0F172A]/40 border border-border-light/60 dark:border-border-dark/60">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-cool-slate dark:text-[#94A3B8] block">
                Total Seen
              </span>
              <span className="text-sm font-bold text-deep-slate dark:text-[#F8FAFC] tabular-nums">
                {totalFlowPatients} Patients
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-cool-slate dark:text-[#94A3B8] block">
                Hourly Avg
              </span>
              <span className="text-sm font-bold text-deep-slate dark:text-[#F8FAFC] tabular-nums">
                {(totalFlowPatients / hourlyPatientFlow.length).toFixed(1)} / hr
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-cool-slate dark:text-[#94A3B8] block">
                Capacity Stress
              </span>
              <span className="text-sm font-bold text-semantic-success tabular-nums">
                68% (Stable)
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="relative pt-6 pb-2">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-border-light dark:border-border-dark w-full flex justify-between">
                <span className="text-[9px] text-cool-slate dark:text-[#94A3B8] -mt-2 tabular-nums">15</span>
              </div>
              <div className="border-b border-dashed border-border-light dark:border-border-dark w-full flex justify-between">
                <span className="text-[9px] text-cool-slate dark:text-[#94A3B8] -mt-2 tabular-nums">10</span>
              </div>
              <div className="border-b border-dashed border-border-light dark:border-border-dark w-full flex justify-between">
                <span className="text-[9px] text-cool-slate dark:text-[#94A3B8] -mt-2 tabular-nums">5</span>
              </div>
              <div className="border-b border-border-light dark:border-border-dark w-full" />
            </div>

            {/* Bars */}
            <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 px-4 relative z-10">
              {hourlyPatientFlow.map((item) => {
                const heightPercent = (item.patients / maxFlow) * 100;
                const isPeak = item.patients === peakHour.patients;
                const isHovered = hoveredHour?.hour === item.hour;

                return (
                  <div
                    key={item.hour}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredHour(item)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    {/* Tooltip on Hover */}
                    <div
                      className={`text-[10px] font-semibold py-0.5 px-1.5 rounded bg-deep-slate text-white dark:bg-[#F8FAFC] dark:text-deep-slate mb-1 shadow transition-all duration-150 tabular-nums ${
                        isHovered ? "opacity-100 -translate-y-0.5" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      {item.patients}
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[28px] rounded-t-md transition-all duration-200 relative ${
                        isPeak
                          ? "bg-clinical-600 hover:bg-clinical-700 dark:bg-clinical-500 dark:hover:bg-clinical-400 shadow-sm"
                          : "bg-clinical-600/80 hover:bg-clinical-600 dark:bg-clinical-500/70 dark:hover:bg-clinical-400"
                      } ${isHovered ? "ring-2 ring-clinical-400/50 scale-[1.03]" : ""}`}
                    >
                      {isPeak && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-semantic-warning" />
                      )}
                    </div>

                    {/* X-axis Label */}
                    <span className="text-[10px] font-medium text-cool-slate dark:text-[#94A3B8] mt-2 truncate w-full text-center">
                      {item.label.replace(" ", "")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 mt-2 border-t border-border-light dark:border-border-dark flex items-center justify-between text-xs text-cool-slate dark:text-[#94A3B8]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-clinical-600 dark:bg-clinical-500" />
              <span>Standard Flow</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-semantic-warning" />
              <span>Peak Hours</span>
            </span>
          </div>
          <span className="tabular-nums">Live telemetry updated 1m ago</span>
        </div>
      </div>

      {/* ─── Card 2: Department Load Breakdown ────────────────────────────── */}
      <div className="bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark rounded-xl p-5 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-clinical-50 dark:bg-clinical-600/15 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-clinical-600 dark:text-clinical-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-deep-slate dark:text-[#F8FAFC]">
                  Department Load & Capacity
                </h3>
                <p className="text-xs text-cool-slate dark:text-[#94A3B8]">
                  Live station occupancy across 8 active clinic units
                </p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-cool-slate dark:text-[#94A3B8] bg-alabaster dark:bg-[#0F172A]/50 px-2.5 py-1 rounded-md border border-border-light dark:border-border-dark">
              8 Stations Active
            </span>
          </div>

          {/* Department Breakdown List */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
            {departmentLoad.map((dept) => {
              const occupancyRatio = dept.current / dept.capacity;
              const occupancyPct = Math.round(occupancyRatio * 100);

              // Semantic color coding based strictly on load
              let barColor = "bg-clinical-600 dark:bg-clinical-500";
              let badgeColor = "text-clinical-700 bg-clinical-50 dark:text-clinical-300 dark:bg-clinical-600/20";
              let statusLabel = "Optimal";

              if (occupancyPct >= 80) {
                barColor = "bg-semantic-critical";
                badgeColor = "text-semantic-critical bg-semantic-critical-bg dark:bg-semantic-critical-bg-dark";
                statusLabel = "High Load";
              } else if (occupancyPct >= 50) {
                barColor = "bg-semantic-warning";
                badgeColor = "text-semantic-warning bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark";
                statusLabel = "Moderate";
              }

              return (
                <div
                  key={dept.department}
                  className="p-2.5 rounded-lg border border-border-light/60 dark:border-border-dark/60 bg-alabaster/40 dark:bg-[#0F172A]/20 hover:border-border-light dark:hover:border-border-dark transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-deep-slate dark:text-[#F8FAFC]">
                        {dept.department}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="text-xs text-cool-slate dark:text-[#94A3B8] tabular-nums flex items-center gap-2">
                      <span>{dept.current} / {dept.capacity} beds</span>
                      <span className="font-bold text-deep-slate dark:text-[#F8FAFC]">{occupancyPct}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-alabaster dark:bg-[#0F172A]/60 h-2 rounded-full overflow-hidden border border-border-light/40 dark:border-border-dark/40">
                    <div
                      style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    />
                  </div>

                  {/* Subline metrics */}
                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-cool-slate dark:text-[#94A3B8] tabular-nums">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-cool-slate" />
                      <span>{dept.waiting} waiting in queue</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cool-slate" />
                      <span>Est. wait: {dept.avgWait} mins</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 mt-3 border-t border-border-light dark:border-border-dark flex items-center justify-between text-xs text-cool-slate dark:text-[#94A3B8]">
          <span className="tabular-nums">Avg Facility Occupancy: 54.2%</span>
          <button className="font-medium text-clinical-600 dark:text-clinical-400 hover:text-clinical-700 dark:hover:text-clinical-300 transition-colors">
            Manage Department Routing →
          </button>
        </div>
      </div>
    </div>
  );
}
