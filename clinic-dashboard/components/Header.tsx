"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Bell,
  User,
  ChevronDown,
  X,
  Menu,
} from "lucide-react";
import { notifications } from "@/lib/mock-data";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-charcoal-slate border-b border-border-light dark:border-border-dark flex items-center justify-between px-4 sm:px-6 gap-3 sm:gap-4 sticky top-0 z-30">
      {/* Mobile menu toggle */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-lg text-cool-slate dark:text-[#94A3B8] hover:bg-alabaster dark:hover:bg-[#0F172A]/50 transition-colors md:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cool-slate dark:text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search patients by ID or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg text-sm
            bg-alabaster dark:bg-[#0F172A]
            border border-border-light dark:border-border-dark
            text-deep-slate dark:text-[#F8FAFC]
            placeholder:text-cool-slate dark:placeholder:text-[#94A3B8]
            focus:outline-none focus:ring-2 focus:ring-clinical-600/30 dark:focus:ring-clinical-400/30
            focus:border-clinical-600 dark:focus:border-clinical-400
            transition-all duration-150"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-slate hover:text-deep-slate dark:hover:text-[#F8FAFC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* New Patient Check-In */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
          bg-clinical-600 hover:bg-clinical-700
          dark:bg-clinical-500 dark:hover:bg-clinical-400
          text-white shadow-sm
          transition-all duration-150 active:scale-[0.98]">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Patient Check-In</span>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className="relative p-2 rounded-lg text-cool-slate dark:text-[#94A3B8]
              hover:bg-alabaster dark:hover:bg-[#0F172A]/50
              hover:text-deep-slate dark:hover:text-[#F8FAFC]
              transition-all duration-150"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-semantic-critical text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums animate-pulse-slow">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-96 bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark rounded-xl shadow-xl animate-fade-in z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                <h3 className="text-sm font-semibold text-deep-slate dark:text-[#F8FAFC]">
                  Notifications
                </h3>
                <span className="text-xs text-cool-slate dark:text-[#94A3B8]">
                  {unreadCount} unread
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-border-light/50 dark:border-border-dark/50
                      hover:bg-alabaster dark:hover:bg-[#0F172A]/30 transition-colors cursor-pointer
                      ${!n.read ? "bg-clinical-50/50 dark:bg-clinical-600/5" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          n.type === "urgent"
                            ? "bg-semantic-critical"
                            : n.type === "warning"
                            ? "bg-semantic-warning"
                            : "bg-clinical-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-deep-slate dark:text-[#F8FAFC] leading-snug">
                          {n.message}
                        </p>
                        <p className="text-xs text-cool-slate dark:text-[#94A3B8] mt-1">
                          {n.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg
              hover:bg-alabaster dark:hover:bg-[#0F172A]/50
              transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-full bg-clinical-100 dark:bg-clinical-600/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-clinical-700 dark:text-clinical-400" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-deep-slate dark:text-[#F8FAFC] leading-tight">
                Dr. Natan
              </p>
              <p className="text-[11px] text-cool-slate dark:text-[#94A3B8]">
                Admin
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-cool-slate dark:text-[#94A3B8] hidden md:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-charcoal-slate border border-border-light dark:border-border-dark rounded-xl shadow-xl animate-fade-in z-50 py-1">
              {["Profile Settings", "Preferences", "Sign Out"].map((item) => (
                <button
                  key={item}
                  className="w-full text-left px-4 py-2 text-sm text-deep-slate dark:text-[#F8FAFC]
                    hover:bg-alabaster dark:hover:bg-[#0F172A]/50 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
