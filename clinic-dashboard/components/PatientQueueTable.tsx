'use client';

import React, { useState } from 'react';
import {
  PatientQueueItem,
  PatientQueueStatus,
  TriagePriority
} from './types';
import {
  Filter,
  MoreVertical,
  PhoneCall,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  UserCheck,
  Stethoscope,
  ChevronDown
} from 'lucide-react';

interface PatientQueueTableProps {
  queue: PatientQueueItem[];
  onStatusChange: (patientId: string, newStatus: PatientQueueStatus) => void;
  searchFilter: string;
  isDarkMode: boolean;
}

export const PatientQueueTable: React.FC<PatientQueueTableProps> = ({
  queue,
  onStatusChange,
  searchFilter,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Waiting' | 'In Consultation' | 'Completed'>('All');
  const [activeMenuPatientId, setActiveMenuPatientId] = useState<string | null>(null);

  // Counts for tabs
  const countAll = queue.length;
  const countWaiting = queue.filter((p) => p.status === 'Waiting').length;
  const countInConsult = queue.filter((p) => p.status === 'In Consultation').length;
  const countCompleted = queue.filter((p) => p.status === 'Completed').length;

  // Filtered queue by tab and search
  const filteredQueue = queue.filter((patient) => {
    // Tab filter
    if (activeTab !== 'All' && patient.status !== activeTab) {
      return false;
    }
    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = patient.patientName.toLowerCase().includes(q);
      const matchId = patient.patientId.toLowerCase().includes(q);
      const matchToken = patient.token.toLowerCase().includes(q);
      const matchDept = patient.department.toLowerCase().includes(q);
      return matchName || matchId || matchToken || matchDept;
    }
    return true;
  });

  return (
    <div className="rounded-xl border bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] shadow-sm flex flex-col overflow-hidden">
      
      {/* ── TABLE HEADER & FILTER TABS ── */}
      <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F8FAFC]">
              Live Patient Triage & Queue
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Active patient flow, triage classifications, and consulting room assignments
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] text-xs">
          {[
            { id: 'All', label: 'All', count: countAll },
            { id: 'Waiting', label: 'Waiting', count: countWaiting },
            { id: 'In Consultation', label: 'In Consult', count: countInConsult },
            { id: 'Completed', label: 'Done', count: countCompleted },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#FFFFFF] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] shadow-sm font-bold'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold tabular-nums ${
                  isActive
                    ? 'bg-[#0D9488]/15 dark:bg-[#14B8A6]/20 text-[#0D9488] dark:text-[#14B8A6]'
                    : 'bg-[#E2E8F0] dark:bg-[#334155] text-[#64748B] dark:text-[#94A3B8]'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TABLE CONTENT ── */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC]/75 dark:bg-[#0F172A]/50 text-[#64748B] dark:text-[#94A3B8] uppercase text-[10px] font-bold tracking-wider">
              <th className="py-3 px-4">Token #</th>
              <th className="py-3 px-4">Patient Name / ID</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Triage Priority</th>
              <th className="py-3 px-4">Assigned Doctor</th>
              <th className="py-3 px-4">Status & Wait</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
            {filteredQueue.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#64748B] dark:text-[#94A3B8]">
                  <p className="font-semibold text-sm">No patients found in this queue filter</p>
                  <p className="text-xs mt-1">Try resetting search or selecting another tab</p>
                </td>
              </tr>
            ) : (
              filteredQueue.map((patient) => {
                const isUrgent = patient.priority === 'Urgent';
                const isWaiting = patient.status === 'Waiting';
                const isInConsult = patient.status === 'In Consultation';
                const isDone = patient.status === 'Completed';

                return (
                  <tr
                    key={patient.id}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]/60 transition-colors group"
                  >
                    {/* 1. Token # */}
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                      <span className={`px-2 py-1 rounded-md border text-xs font-black ${
                        isUrgent
                          ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                          : 'bg-[#F1F5F9] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#334155]'
                      }`}>
                        {patient.token}
                      </span>
                    </td>

                    {/* 2. Patient Name / ID */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] block text-xs">
                          {patient.patientName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          <span className="font-mono text-[#0D9488] dark:text-[#14B8A6] font-semibold">
                            #{patient.patientId}
                          </span>
                          <span>•</span>
                          <span>{patient.age}y / {patient.gender}</span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Department */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC] block">
                        {patient.department}
                      </span>
                      <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate max-w-[160px] block mt-0.5">
                        {patient.chiefComplaint}
                      </span>
                    </td>

                    {/* 4. Triage Priority */}
                    <td className="py-3.5 px-4">
                      {isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-ping" />
                          Urgent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                          Normal
                        </span>
                      )}
                    </td>

                    {/* 5. Assigned Doctor */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-[#0D9488]/10 text-[#0D9488] dark:bg-[#14B8A6]/20 dark:text-[#14B8A6] font-bold text-[10px]">
                          <Stethoscope className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] block text-xs leading-none">
                            {patient.assignedDoctor.name}
                          </span>
                          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 block leading-tight">
                            {patient.assignedDoctor.specialization}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 6. Status & Wait */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {isWaiting && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="h-3 w-3" />
                            Waiting
                          </span>
                        )}
                        {isInConsult && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#0D9488]/15 dark:bg-[#14B8A6]/20 text-[#0D9488] dark:text-[#14B8A6] border border-[#0D9488]/30 dark:border-[#14B8A6]/30">
                            <Activity className="h-3 w-3" />
                            In Consult
                          </span>
                        )}
                        {isDone && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                        )}
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                          Wait: {patient.waitTime}
                        </p>
                      </div>
                    </td>

                    {/* 7. Quick Action Menu */}
                    <td className="py-3.5 px-4 text-right relative">
                      <div className="flex items-center justify-end gap-1.5">
                        {isWaiting && (
                          <button
                            onClick={() => onStatusChange(patient.id, 'In Consultation')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1"
                            style={{ backgroundColor: isDarkMode ? '#14B8A6' : '#0D9488' }}
                            title="Call patient into consultation room"
                          >
                            <PhoneCall className="h-3 w-3" />
                            <span className="hidden xl:inline">Call</span>
                          </button>
                        )}

                        {isInConsult && (
                          <button
                            onClick={() => onStatusChange(patient.id, 'Completed')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] transition-all shadow-sm flex items-center gap-1"
                            title="Complete consultation"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="hidden xl:inline">Finish</span>
                          </button>
                        )}

                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuPatientId(activeMenuPatientId === patient.id ? null : patient.id)
                            }
                            className="p-1.5 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#E2E8F0]/50 dark:hover:bg-[#334155]/50 transition-colors"
                            title="More options"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeMenuPatientId === patient.id && (
                            <div
                              className="absolute right-0 mt-1 w-44 rounded-xl border shadow-lg z-30 p-1.5 bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-left"
                            >
                              <button
                                onClick={() => {
                                  onStatusChange(patient.id, 'In Consultation');
                                  setActiveMenuPatientId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]"
                              >
                                Set In Consultation
                              </button>
                              <button
                                onClick={() => {
                                  onStatusChange(patient.id, 'Waiting');
                                  setActiveMenuPatientId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]"
                              >
                                Re-queue Patient
                              </button>
                              <button
                                onClick={() => {
                                  onStatusChange(patient.id, 'Completed');
                                  setActiveMenuPatientId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#10B981] hover:bg-[#10B981]/10"
                              >
                                Mark Completed
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── TABLE FOOTER SUMMARY ── */}
      <div className="p-3.5 border-t border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC]/50 dark:bg-[#0F172A]/30 flex flex-wrap items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8] gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold">Showing {filteredQueue.length} of {queue.length} patients</span>
          <span>•</span>
          <span className="text-[#10B981] font-semibold">Triage Stage: Optimal</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>Clinic Latency: 24ms</span>
          <span>•</span>
          <span className="text-[#0D9488] dark:text-[#14B8A6] font-semibold">Auto-refresh active</span>
        </div>
      </div>

    </div>
  );
};
