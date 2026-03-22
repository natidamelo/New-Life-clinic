import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BellIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useSafeTheme } from '../hooks/useSafeTheme';
import api from '../services/apiService';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: Date;
  patient?: any;
}

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useSafeTheme();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleLogout = () => {
    logout();
  };

  const fetchUnpaidCardPayments = async () => {
    try {
      // Only fetch if user is authenticated and has appropriate permissions
      if (!user || !user.role) {
        console.log('User not authenticated, skipping unpaid card payments fetch');
        return;
      }

      // Only certain roles should see billing notifications
      const allowedRoles = ['admin', 'finance', 'reception'];
      if (!allowedRoles.includes(user.role.toLowerCase())) {
        console.log('User role not allowed for billing notifications:', user.role);
        return;
      }

      // Check if we have a valid token
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (!token) {
        console.log('No auth token found, skipping unpaid card payments fetch');
        return;
      }

      console.log('Fetching unpaid card payments for role:', user.role);
      const response = await api.get('/api/billing/unpaid-card-payments');
      
      if (response.data && response.data.length > 0) {
        const newNotification: Notification = {
          id: `card-payment-${Date.now()}`,
          message: `${response.data.length} unpaid card payment(s) require attention`,
          type: 'warning',
          timestamp: new Date(),
          patient: response.data[0]?.patient
        };
        setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Error fetching unpaid card payments:', error);
      // Don't show error to user for this background operation
    }
  };

  useEffect(() => {
    // Only fetch notifications when user is authenticated
    if (user && user.role) {
      fetchUnpaidCardPayments();
    }

    // Set up event listeners for real-time notifications
    const handlePatientRegistered = (event: CustomEvent) => {
      const newNotification: Notification = {
        id: `patient-${Date.now()}`,
        message: `New patient registered: ${event.detail.patientName}`,
        type: 'info',
        timestamp: new Date(),
        patient: event.detail.patient
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    };

    const handleCardPaymentRequired = (event: CustomEvent) => {
      const newNotification: Notification = {
        id: `payment-${Date.now()}`,
        message: `Payment required for patient: ${event.detail.patientName}`,
        type: 'warning',
        timestamp: new Date(),
        patient: event.detail.patient
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    };

    // Add event listeners
    window.addEventListener('patientRegistered', handlePatientRegistered as EventListener);
    window.addEventListener('cardPaymentRequired', handleCardPaymentRequired as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('patientRegistered', handlePatientRegistered as EventListener);
      window.removeEventListener('cardPaymentRequired', handleCardPaymentRequired as EventListener);
    };
  }, [user]); // Re-run when user authentication changes

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (!target.closest('[data-notification-dropdown]')) {
        setIsNotificationOpen(false);
      }
      
      if (!target.closest('[data-user-menu]')) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const refreshNotifications = () => {
      fetchUnpaidCardPayments();
  };
  
  return (
    <header className="bg-primary-foreground/90 dark:bg-muted backdrop-blur shadow-sm border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center">
            <div className="flex items-center">
              <img
                src="/assets/images/logo.jpg"
                alt="New Life Clinic logo"
                className="h-8 w-8 rounded-full object-cover mr-2 ring-1 ring-black/10"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">New Life Clinic</h1>
                <p className="text-xs text-muted-foreground">Healthcare Center</p>
              </div>
            </div>
          </Link>
          
          <span className="mx-4 text-muted-foreground">|</span>
          
          <div className="relative w-96">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-border/30 dark:border-border rounded-lg focus:outline-none focus:border-primary bg-primary-foreground dark:bg-muted text-muted-foreground dark:text-muted-foreground/40 placeholder-muted-foreground dark:placeholder-muted-foreground/60"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <div className="relative" data-notification-dropdown>
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 rounded-lg text-muted-foreground hover:bg-accent"
            >
              <BellIcon className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute top-16 left-4 right-4 w-[800px] bg-card rounded-lg shadow-lg border border-border z-50 max-h-64 overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Notifications ({notifications.length})
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={refreshNotifications}
                      className="text-xs text-primary hover:text-primary dark:hover:text-primary/40"
                      title="Refresh notifications"
                    >
                      🔄 Refresh
                    </button>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs text-primary dark:text-primary/50 hover:text-primary dark:hover:text-primary/40"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="max-h-64 overflow-x-auto scrollbar-hide">
                  {notifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-muted-foreground">
                      <BellIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  ) : (
                    <div className="flex space-x-2 p-2">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`px-3 py-2 border-r last:border-r-0 min-w-[300px] flex-shrink-0 ${
                            notification.type === 'warning' 
                              ? 'border-accent/20 dark:border-accent/40 bg-accent/10/50 dark:bg-accent/10 hover:bg-accent/20/70 dark:hover:bg-accent/20'
                              : 'border-border/20 dark:border-border hover:bg-muted/10 dark:hover:bg-muted'
                          } flex flex-col justify-between group`}
                        >
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${
                            notification.type === 'warning'
                              ? 'text-accent-foreground dark:text-accent-foreground/30'
                              : 'text-muted-foreground dark:text-muted-foreground/40'
                          }`}>
                            {notification.message}
                          </p>
                          <p className={`text-xs mt-1 ${
                            notification.type === 'warning'
                              ? 'text-accent-foreground dark:text-accent-foreground/50'
                              : 'text-muted-foreground dark:text-muted-foreground'
                          }`}>
                            {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className={`self-end p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                            notification.type === 'warning'
                              ? 'text-accent-foreground dark:text-accent-foreground/40 hover:text-accent-foreground dark:hover:text-accent-foreground/30 hover:bg-accent/30 dark:hover:bg-accent/30'
                              : 'text-muted-foreground/50 dark:text-muted-foreground/50 hover:text-muted-foreground dark:hover:text-muted-foreground/40 hover:bg-muted/30 dark:hover:bg-muted'
                          }`}
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Theme Toggle Button */}
          <button 
            onClick={() => {
              
              toggleTheme();
            }}
            className="p-2 rounded-lg focus:outline-none text-muted-foreground hover:bg-accent"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>

          {/* User Dropdown Menu */}
          <div className="relative" data-user-menu>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary">
                {user?.photo ? (
                  <img
                    src={user.photo}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-5 h-5 text-primary-foreground" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {user?.role || 'Role'}
                </p>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg border border-border z-50">
                <div className="py-1">
                  <Link
                    to="/app/settings" 
                    className="flex items-center px-4 py-2 text-sm text-muted-foreground dark:text-muted-foreground/40 hover:bg-accent"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <UserIcon className="w-4 h-4 mr-3" />
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-muted-foreground dark:text-muted-foreground/40 hover:bg-accent"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 