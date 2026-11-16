"use client";

import React, { useState, useMemo } from "react";
import {
  MoreHorizontal,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { patientQueue, type QueuePatient, type PatientStatus } from "@/lib/mock-data";

type FilterTab = "All" | PatientStatus;

const filterTabs: FilterTab[] = ["All", "Waiting", "In Consultation", "Completed"];

const statusConfig: Record<
  PatientStatus,
  { color: string; bg: string; icon: React.ElementType }
> = {
  Waiting: {
    color: "text-semantic-warning",
    bg: "bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark",
    icon: Clock,
  },
  "In Consultation": {
    color: "text-clinical-600 dark:text-clinical-400",
    bg: "bg-clinical-50 dark:bg-clinical-600/15",
    icon: ChevronRight,
  },
  Completed: {
    color: "text-semantic-success",
    bg: "bg-semantic-success-bg dark:bg-semantic-success-bg-dark",
    icon: CheckCircle2,
  },
  "No Show": {
    color: "text-cool-slate dark:text-[#94A3B8]",
    bg: "bg-alabaster dark:bg-[#0F172A]/40",
    icon: XCircle,
  },
};

const triageConfig = {
  Normal: {
    color: "text-semantic-success",
    bg: "bg-semantic-success-bg dark:bg-semantic-success-bg-dark",
  },
  Urgent: {
    color: "text-semantic-warning",
    bg: "bg-semantic-warning-bg dark:bg-semantic-warning-bg-dark",
  },
  Critical: {
    color: "text-semantic-critical",
    bg: "bg-semantic-critical-bg dark:bg-semantic-critical-bg-dark",
  },
};

export default function PatientQueue() {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  const filtered = useMemo(() => {
    if (activeTab === "All") return patientQueue;
    return patientQueue.filter((p) => p.status === activeTab);
  }, [activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: patientQueue.length };
    patientQueue.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-deep-slate dark:text-[#F8FAFC]">
              Live Patient Triage & Queue
            </h2>
            <p className="text-xs text-cool-slate dark:text-[#94A3B8] mt-0.5">
              Real-time patient flow management
            </p>
          </div>
          <button className="p-2 rounded-lg text-cool-slate dark:text-[#94A3B8] hover:bg-alabaster dark:hover:bg-[#0F172A]/50 hover:text-deep-slate dark:hover:text-[#F8FAFC] transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-alabaster dark:bg-[#0F172A]/40 p-1 rounded-lg">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-all duration-150
                ${
                  activeTab === tab
                    ? "bg-white dark:bg-charcoal-slate text-deep-slate dark:text-[#F8FAFC] shadow-sm"
                    : "text-cool-slate dark:text-[#94A3B8] hover:text-deep-slate dark:hover:text-[#F8FAFC]"
                }`}
            >
              {tab}
              <span
                className={`tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                  ${
                    activeTab === tab
                      ? "bg-clinical-50 dark:bg-clinical-600/15 text-clinical-600 dark:text-clinical-400"
                      : "bg-alabaster dark:bg-[#0F172A]/60 text-cool-slate dark:text-[#94A3B8]"
                  }`}
              >
                {tabCounts[tab] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-border-light dark:border-border-dark">
              {["Token", "Patient", "Department", "Triage", "Doctor", "Status", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider
                      text-cool-slate dark:text-[#94A3B8] bg-alabaster/50 dark:bg-[#0F172A]/20"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {filtered.map((patient) => {
              const status = statusConfig[patient.status];
              const triage = triageConfig[patient.triage];
              const StatusIcon = status.icon;

              return (
                <tr
                  key={patient.token}
                  className="hover:bg-alabaster/70 dark:hover:bg-[#0F172A]/20 transition-colors group"
                >
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono font-semibold text-clinical-600 dark:text-clinical-400 tabular-nums">
                      {patient.token}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-medium text-deep-slate dark:text-[#F8FAFC] leading-tight">
                        {patient.name}
                      </p>
                      <p className="text-xs text-cool-slate dark:text-[#94A3B8] tabular-nums">
                        {patient.patientId} · {patient.age}{patient.gender === "M" ? "M" : "F"}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-deep-slate dark:text-[#F8FAFC]">
                      {patient.department}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${triage.bg} ${triage.color}`}
                    >
                      {patient.triage === "Critical" && (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {patient.triage}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-deep-slate dark:text-[#F8FAFC]">
                      {patient.doctor}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button className="p-1 rounded-md text-cool-slate dark:text-[#94A3B8] opacity-0 group-hover:opacity-100 hover:bg-alabaster dark:hover:bg-[#0F172A]/50 transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border-light dark:border-border-dark flex items-center justify-between">
        <p className="text-xs text-cool-slate dark:text-[#94A3B8]">
          Showing {filtered.length} of {patientQueue.length} patients
        </p>
        <button className="text-xs font-medium text-clinical-600 dark:text-clinical-400 hover:text-clinical-700 dark:hover:text-clinical-300 transition-colors">
          View Full Queue →
        </button>
      </div>
    </div>
  );
}
