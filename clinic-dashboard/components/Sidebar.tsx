"use client";

import React, { useState } from "react";
import { useTheme } from "@/app/providers";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  Receipt,
  UserCog,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  Receipt,
  UserCog,
};

interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: "Overview", icon: "LayoutDashboard", href: "/" },
  { label: "Patient Queue", icon: "Users", href: "/queue", badge: 6 },
  { label: "Appointments", icon: "CalendarDays", href: "/appointments" },
  { label: "Pharmacy & Inventory", icon: "Pill", href: "/pharmacy", badge: 4 },
  { label: "Lab Orders", icon: "FlaskConical", href: "/lab" },
  { label: "Billing & Invoices", icon: "Receipt", href: "/billing" },
  { label: "Staff", icon: "UserCog", href: "/staff" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  collapsed: externalCollapsed,
  onToggleCollapse,
}: SidebarProps = {}) {
  const { theme, toggleTheme } = useTheme();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("/");

  const collapsed =
    externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const handleToggle =
    onToggleCollapse || (() => setInternalCollapsed((prev) => !prev));

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col
        bg-white dark:bg-charcoal-slate
        border-r border-border-light dark:border-border-dark
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-[72px]" : "w-[240px]"}`}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border-light dark:border-border-dark flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-clinical-600 flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="text-sm font-bold text-deep-slate dark:text-[#F8FAFC] leading-tight truncate">
              New Life Clinic
            </h1>
            <p className="text-[10px] font-medium text-clinical-600 dark:text-clinical-400 uppercase tracking-wider">
              Dashboard
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = activeItem === item.href;

          return (
            <button
              key={item.href}
              onClick={() => setActiveItem(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group relative
                ${
                  isActive
                    ? "bg-clinical-50 dark:bg-clinical-600/15 text-clinical-700 dark:text-clinical-400"
                    : "text-cool-slate dark:text-[#94A3B8] hover:bg-alabaster dark:hover:bg-[#0F172A]/50 hover:text-deep-slate dark:hover:text-[#F8FAFC]"
                }`}
            >
              <div className="relative flex-shrink-0">
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? "text-clinical-600 dark:text-clinical-400"
                      : "text-cool-slate dark:text-[#94A3B8] group-hover:text-deep-slate dark:group-hover:text-[#F8FAFC]"
                  }`}
                />
                {item.badge && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-semantic-critical text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-semantic-critical/10 text-semantic-critical text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-clinical-600 dark:bg-clinical-400 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-3 pt-2 border-t border-border-light dark:border-border-dark space-y-1 flex-shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-cool-slate dark:text-[#94A3B8]
            hover:bg-alabaster dark:hover:bg-[#0F172A]/50
            hover:text-deep-slate dark:hover:text-[#F8FAFC]
            transition-all duration-150"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Sun className="w-5 h-5 flex-shrink-0" />
          )}
          {!collapsed && (
            <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={handleToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-cool-slate dark:text-[#94A3B8]
            hover:bg-alabaster dark:hover:bg-[#0F172A]/50
            hover:text-deep-slate dark:hover:text-[#F8FAFC]
            transition-all duration-150"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
