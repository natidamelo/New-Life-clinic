import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  BeakerIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Patients', href: '/patients', icon: UserGroupIcon },
  { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
  { name: 'Lab Tests', href: '/lab-tests', icon: BeakerIcon },
  { name: 'Profile', href: '/profile', icon: UserCircleIcon },
];

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-primary-foreground">
        <div className="flex items-center">
          <img src="/assets/images/logo.jpg" alt="New Life Clinic logo" className="h-8 w-8 rounded-full object-cover mr-3 ring-1 ring-white/40" />
          <h1 className="text-lg font-semibold">New Life Clinic</h1>
        </div>
        <button
          className="md:hidden p-1 rounded text-white/80 hover:text-white"
          onClick={() => setSidebarOpen(false)}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 mt-5 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-2 py-3 text-sm font-medium rounded-md ${
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-muted/10 hover:text-muted-foreground'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-primary' : 'text-muted-foreground/50'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/30">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <UserCircleIcon className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-muted-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-2 py-3 mt-4 text-sm font-medium text-destructive rounded-md hover:bg-destructive/10"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-primary-foreground/90 backdrop-blur shadow-lg z-30 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-primary-foreground/90 backdrop-blur shadow-sm sticky top-0 z-10">
          <div className="flex items-center px-4 py-4 gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-2 rounded-md text-muted-foreground hover:bg-accent -ml-1"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-muted-foreground truncate">
              {navigation.find((item) => item.href === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
