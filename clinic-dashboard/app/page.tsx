'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { KpiCards } from '../components/KpiCards';
import { PatientQueueTable } from '../components/PatientQueueTable';
import { CriticalAlertsPanel } from '../components/CriticalAlertsPanel';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { CheckInModal } from '../components/CheckInModal';
import {
  INITIAL_PATIENT_QUEUE,
  CRITICAL_ALERTS,
  PHARMACY_LOW_STOCK,
  HOURLY_PATIENT_FLOW,
  DEPARTMENT_LOAD_BREAKDOWN
} from '../components/mockData';
import {
  PatientQueueItem,
  PatientQueueStatus,
  CriticalAlertItem,
  PharmacyStockItem
} from '../components/types';

export default function ClinicDashboardPage() {
  // Theme state: Default Light Mode as requested
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  // Live data states
  const [queue, setQueue] = useState<PatientQueueItem[]>(INITIAL_PATIENT_QUEUE);
  const [alerts, setAlerts] = useState<CriticalAlertItem[]>(CRITICAL_ALERTS);
  const [lowStock, setLowStock] = useState<PharmacyStockItem[]>(PHARMACY_LOW_STOCK);

  // Sync theme with html document element
  useEffect(() => {
    // Check local storage or default to light mode
    const savedTheme = localStorage.getItem('clinic_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('clinic_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('clinic_theme', 'light');
      }
      return next;
    });
  };

  // Status transition handler for queue
  const handleStatusChange = (patientId: string, newStatus: PatientQueueStatus) => {
    setQueue((prev) =>
      prev.map((pt) =>
        pt.id === patientId
          ? {
              ...pt,
              status: newStatus,
              waitTime: newStatus === 'Completed' ? 'Completed' : pt.waitTime,
            }
          : pt
      )
    );
  };

  // Add new patient handler
  const handleAddPatient = (
    newPtData: Omit<PatientQueueItem, 'id' | 'token' | 'checkInTime' | 'waitTime' | 'status'>
  ) => {
    const tokenPrefix = newPtData.priority === 'Urgent' ? 'U' : 'A';
    const tokenNumber = Math.floor(45 + queue.length);
    const newPatient: PatientQueueItem = {
      ...newPtData,
      id: `pt-${Date.now()}`,
      token: `${tokenPrefix}-0${tokenNumber}`,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      waitTime: 'Just arrived',
      status: 'Waiting',
    };

    setQueue((prev) => [newPatient, ...prev]);
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  // Reorder pharmacy item
  const handleReorderItem = (itemId: string) => {
    setLowStock((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, currentStock: item.currentStock + 50, status: 'Low' }
          : item
      )
    );
  };

  // Computed metrics
  const waitingPatientsCount = queue.filter((p) => p.status === 'Waiting').length;
  const avgWaitMinutes = 14;
  const lowStockCount = lowStock.length;
  const totalPatientsToday = 142 + (queue.length - INITIAL_PATIENT_QUEUE.length);
  const dailyRevenueEtb = 84250;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] flex transition-colors duration-200">

      {/* ── 1. COLLAPSIBLE 240px SIDEBAR ── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeNav={activeNav}
        onSelectNav={(navId) => setActiveNav(navId)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* ── 2. MAIN APPLICATION CONTENT WRAPPER ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'pl-16' : 'pl-60'
        }`}
      >
        {/* Sticky Top Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCheckIn={() => setIsCheckInOpen(true)}
          urgentAlertCount={alerts.length}
          isDarkMode={isDarkMode}
        />

        {/* Main Content Area (Max-width 1440px with generous padding) */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Subheader / Clinical Station Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                  Clinical Operations Command
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#0D9488]/10 text-[#0D9488] dark:bg-[#14B8A6]/15 dark:text-[#14B8A6]">
                  Medium Clinic Level
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                Real-time patient triage, waiting room telemetry, and pharmacy dispensary status
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
              <span>Station: <strong>Addis Ababa Central</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#10B981] font-bold">
                <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                Shift Active
              </span>
            </div>
          </div>

          {/* ── TOP KPI ROW (4 CARDS) ── */}
          <KpiCards
            totalPatientsToday={totalPatientsToday}
            waitingQueueCount={waitingPatientsCount}
            avgWaitMinutes={avgWaitMinutes}
            lowStockCount={lowStockCount}
            dailyRevenueEtb={dailyRevenueEtb}
            isDarkMode={isDarkMode}
          />

          {/* ── PRIMARY SPLIT VIEW (2/3 Left, 1/3 Right) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2/3: Live Patient Triage & Queue Table */}
            <div className="lg:col-span-2">
              <PatientQueueTable
                queue={queue}
                onStatusChange={handleStatusChange}
                searchFilter={searchQuery}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Right 1/3: Critical Alerts & Pharmacy Low-Stock Panel */}
            <div className="lg:col-span-1">
              <CriticalAlertsPanel
                alerts={alerts}
                lowStockItems={lowStock}
                onAcknowledgeAlert={handleAcknowledgeAlert}
                onReorderItem={handleReorderItem}
                isDarkMode={isDarkMode}
              />
            </div>

          </div>

          {/* ── BOTTOM ANALYTICS ROW (2 CARDS) ── */}
          <AnalyticsCharts
            hourlyFlow={HOURLY_PATIENT_FLOW}
            departmentLoad={DEPARTMENT_LOAD_BREAKDOWN}
            isDarkMode={isDarkMode}
          />

        </main>
      </div>

      {/* ── NEW PATIENT CHECK-IN MODAL ── */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onAddPatient={handleAddPatient}
        isDarkMode={isDarkMode}
      />

    </div>
  );
}
