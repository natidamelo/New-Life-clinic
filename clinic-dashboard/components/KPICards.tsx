"use client";

import React from "react";
import {
  Users,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { kpiMetrics } from "@/lib/mock-data";

interface KPICard {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  accent: "teal" | "amber" | "red" | "green";
}

const cards: KPICard[] = [
  {
    label: "Today's Patients",
    value: kpiMetrics.todayPatients.toString(),
    subtitle: `${kpiMetrics.completedToday} completed · ${kpiMetrics.totalCapacity} capacity`,
    icon: Users,
    trend: { value: "+12%", positive: true },
    accent: "teal",
  },
  {
    label: "Waiting Room Queue",
    value: kpiMetrics.waitingCount.toString(),
    subtitle: `Avg. wait: ${kpiMetrics.avgWaitMinutes} min`,
    icon: Clock,
    trend: { value: "-3 min", positive: true },
    accent: "amber",
  },
  {
    label: "Low-Stock Alerts",
    value: kpiMetrics.lowStockAlerts.toString(),
    subtitle: "1 out-of-stock · 2 expiring soon",
    icon: AlertTriangle,
    trend: { value: "+2", positive: false },
    accent: "red",
  },
  {
    label: "Daily Revenue",
    value: `${(kpiMetrics.dailyRevenue / 1000).toFixed(1)}K`,
    subtitle: `Target: ${(kpiMetrics.revenueTarget / 1000).toFixed(0)}K ETB`,
    icon: DollarSign,
    trend: { value: "+8.4%", positive: true },
    accent: "green",
  },
];

const accentStyles = {
  teal: {
    iconBg: "bg-clinical-50 dark:bg-clinical-600/15",
    iconColor: "text-clinical-600 dark:text-clinical-400",
  },
  amber: {
    iconBg: "bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark",
    iconColor: "text-semantic-warning",
  },
  red: {
    iconBg: "bg-semantic-critical-bg dark:bg-semantic-critical-bg-dark",
    iconColor: "text-semantic-critical",
  },
  green: {
    iconBg: "bg-semantic-success-bg dark:bg-semantic-success-bg-dark",
    iconColor: "text-semantic-success",
  },
};

export default function KPICards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {cards.map((card) => {
        const style = accentStyles[card.accent];
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark
              rounded-xl p-5 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/10
              transition-all duration-200 group cursor-default"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${style.iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${style.iconColor}`} />
              </div>
              {card.trend && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-semibold tabular-nums
                    ${card.trend.positive ? "text-semantic-success" : "text-semantic-critical"}`}
                >
                  {card.trend.positive ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {card.trend.value}
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-deep-slate dark:text-[#F8FAFC] tabular-nums leading-none mb-1">
              {card.value}
            </p>
            <p className="text-sm font-medium text-deep-slate dark:text-[#F8FAFC] mb-1">
              {card.label}
            </p>
            <p className="text-xs text-cool-slate dark:text-[#94A3B8] tabular-nums">
              {card.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
}
