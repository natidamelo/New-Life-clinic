import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  BeakerIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-primary-foreground/90 backdrop-blur shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-primary-foreground">
            <img src="/assets/images/logo.jpg" alt="New Life Clinic logo" className="h-8 w-8 rounded-full object-cover mr-3 ring-1 ring-white/40" />
            <h1 className="text-lg font-semibold">New Life Clinic</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 mt-5 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-muted/10 hover:text-muted-foreground'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-primary' : 'text-muted-foreground/50'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-border/30">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCircleIcon className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-2 py-2 mt-4 text-sm font-medium text-destructive rounded-md hover:bg-destructive/10"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        {/* Header */}
        <header className="bg-primary-foreground/90 backdrop-blur shadow-sm">
          <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-muted-foreground">
              {navigation.find((item) => item.href === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 