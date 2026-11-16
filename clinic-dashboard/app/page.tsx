"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import KPICards from "@/components/KPICards";
import PatientQueue from "@/components/PatientQueue";
import AlertsPanel from "@/components/AlertsPanel";
import Analytics from "@/components/Analytics";
import { Activity, ShieldCheck, Clock, Stethoscope } from "lucide-react";

export default function DashboardPage() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-alabaster dark:bg-deep-slate text-deep-slate dark:text-[#F8FAFC]">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          collapsed ? "md:pl-[72px]" : "md:pl-[240px]"
        }`}
      >
        {/* Sticky Header */}
        <Header onMenuToggle={() => setCollapsed((prev) => !prev)} />

        {/* Dashboard Canvas Container */}
        <main className="flex-1 w-full max-w-dashboard mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Facility Status & Context Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-light dark:border-border-dark">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-semantic-success animate-pulse" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-deep-slate dark:text-[#F8FAFC]">
                  Clinical Operations Command
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-clinical-50 dark:bg-clinical-600/20 text-clinical-700 dark:text-clinical-300 border border-clinical-200/50 dark:border-clinical-600/30">
                  New Life Medium Clinic
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cool-slate dark:text-[#94A3B8] mt-0.5">
                Active Duty: Day Shift · Station Addis Ababa · Dr. Natan D. on Duty
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-cool-slate dark:text-[#94A3B8]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark font-medium tabular-nums shadow-sm">
                <Clock className="w-3.5 h-3.5 text-clinical-600 dark:text-clinical-400" />
                <span>Live Queue Sync: <strong className="text-deep-slate dark:text-[#F8FAFC]">Online</strong></span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark font-medium tabular-nums shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-semantic-success" />
                <span>HIPAA / EMR Secure</span>
              </span>
            </div>
          </div>

          {/* 1. Top KPI Row (4 Cards) */}
          <section aria-label="Key Performance Indicators">
            <KPICards />
          </section>

          {/* 2. Primary Split View (2/3 Left, 1/3 Right) */}
          <section
            aria-label="Patient Queue and Clinical Alerts"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
          >
            {/* Left 2/3: Live Patient Triage & Queue Table */}
            <div className="lg:col-span-2">
              <PatientQueue />
            </div>

            {/* Right 1/3: Critical Alerts & Pharmacy Low-Stock Panel */}
            <div className="lg:col-span-1">
              <AlertsPanel />
            </div>
          </section>

          {/* 3. Bottom Analytics Row (2 Cards) */}
          <section aria-label="Clinical Flow and Capacity Analytics">
            <Analytics />
          </section>
        </main>
      </div>
    </div>
  );
}
