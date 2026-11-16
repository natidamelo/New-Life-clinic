"use client";

import React from "react";
import {
  AlertTriangle,
  Package,
  FlaskConical,
  Clock,
  AlertCircle,
  ArrowRight,
  PackageX,
  CalendarClock,
} from "lucide-react";
import { pharmacyAlerts, pendingLabResults } from "@/lib/mock-data";

export default function AlertsPanel() {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Pharmacy Low-Stock Panel */}
      <div className="bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark flex items-center justify-center">
              <Package className="w-4 h-4 text-semantic-warning" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-deep-slate dark:text-[#F8FAFC]">
                Pharmacy Alerts
              </h3>
              <p className="text-[11px] text-cool-slate dark:text-[#94A3B8]">
                {pharmacyAlerts.length} items need attention
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3 space-y-1.5">
          {pharmacyAlerts.map((alert) => {
            const isOutOfStock = alert.category === "out-of-stock";
            const isExpiring = alert.category === "expiring";
            const isLowStock = alert.category === "low-stock";

            return (
              <div
                key={alert.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                  hover:bg-alabaster dark:hover:bg-[#0F172A]/30
                  transition-colors cursor-pointer group"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${
                      isOutOfStock
                        ? "bg-semantic-critical-bg dark:bg-semantic-critical-bg-dark"
                        : isExpiring
                        ? "bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark"
                        : "bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark"
                    }`}
                >
                  {isOutOfStock ? (
                    <PackageX className="w-4 h-4 text-semantic-critical" />
                  ) : isExpiring ? (
                    <CalendarClock className="w-4 h-4 text-semantic-warning" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-semantic-warning" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-deep-slate dark:text-[#F8FAFC] truncate leading-tight">
                    {alert.name}
                  </p>
                  <p className="text-xs text-cool-slate dark:text-[#94A3B8] tabular-nums">
                    {isOutOfStock
                      ? "Out of stock"
                      : isExpiring
                      ? `Expires in ${alert.daysUntilExpiry} days`
                      : `${alert.currentStock}/${alert.minThreshold} ${alert.unit}`}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full flex-shrink-0
                    ${
                      isOutOfStock
                        ? "bg-semantic-critical-bg dark:bg-semantic-critical-bg-dark text-semantic-critical"
                        : isExpiring
                        ? "bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark text-semantic-warning"
                        : "bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark text-semantic-warning"
                    }`}
                >
                  {alert.category.replace("-", " ")}
                </span>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-border-light dark:border-border-dark">
          <button className="text-xs font-medium text-clinical-600 dark:text-clinical-400 hover:text-clinical-700 dark:hover:text-clinical-300 transition-colors flex items-center gap-1">
            View Full Inventory <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Pending Lab Results */}
      <div className="bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-clinical-50 dark:bg-clinical-600/15 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-clinical-600 dark:text-clinical-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-deep-slate dark:text-[#F8FAFC]">
                Pending Lab Results
              </h3>
              <p className="text-[11px] text-cool-slate dark:text-[#94A3B8]">
                {pendingLabResults.length} results pending
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3 space-y-1.5">
          {pendingLabResults.map((lab) => {
            const priorityStyle =
              lab.priority === "STAT"
                ? "bg-semantic-critical-bg dark:bg-semantic-critical-bg-dark text-semantic-critical"
                : lab.priority === "Urgent"
                ? "bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark text-semantic-warning"
                : "bg-alabaster dark:bg-[#0F172A]/40 text-cool-slate dark:text-[#94A3B8]";

            const statusStyle =
              lab.status === "Delayed"
                ? "text-semantic-critical"
                : lab.status === "Processing"
                ? "text-clinical-600 dark:text-clinical-400"
                : "text-semantic-warning";

            return (
              <div
                key={lab.id}
                className="px-3 py-2.5 rounded-lg hover:bg-alabaster dark:hover:bg-[#0F172A]/30
                  transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-deep-slate dark:text-[#F8FAFC] leading-tight">
                    {lab.patientName}
                  </p>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${priorityStyle}`}
                  >
                    {lab.priority}
                  </span>
                </div>
                <p className="text-xs text-cool-slate dark:text-[#94A3B8] mb-1">
                  {lab.testType}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-cool-slate dark:text-[#94A3B8] tabular-nums flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Ordered {lab.orderedAt}
                  </span>
                  <span className={`text-[11px] font-medium ${statusStyle} flex items-center gap-1`}>
                    {lab.status === "Delayed" && <AlertCircle className="w-3 h-3" />}
                    {lab.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-border-light dark:border-border-dark">
          <button className="text-xs font-medium text-clinical-600 dark:text-clinical-400 hover:text-clinical-700 dark:hover:text-clinical-300 transition-colors flex items-center gap-1">
            View All Lab Orders <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
