import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon as AdminHomeIcon,
  CogIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  HeartIcon,
  SquaresPlusIcon as DashboardIcon,
  ClipboardDocumentListIcon as PatientsIcon,
  CalendarDaysIcon as AppointmentsIcon,
  CalendarDaysIcon as Calendar,
  UserPlusIcon,
  CurrencyDollarIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  UsersIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useSafeTheme } from '../hooks/useSafeTheme';
import { toast, Toaster } from 'react-hot-toast';
import attendanceService from '../services/attendanceService';
import { useAttendanceStatus } from '../hooks/useAttendanceStatus';
import analyticsService from '../services/analyticsService';
import ThemeSelector from './ThemeSelector';
import QRCodeModal from './QRCodeModal';
import AttendanceOverlay from './AttendanceOverlay';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './ui/sidebar';

// Define menu items for different roles (EXACTLY as in your original sidebar)
const adminMenuItems = [
  { path: '/app/dashboard', icon: AdminHomeIcon, label: 'Admin Dashboard' },
  { path: '/app/patient-services', icon: PatientsIcon, label: 'Patient Services' },
  { path: '/app/staff-management', icon: UserPlusIcon, label: 'Staff Management' },
  { path: '/app/pharmacy', icon: BeakerIcon, label: 'Stock Management' },
  { path: '/app/services', icon: CogIcon, label: 'Service Management' },
  { path: '/app/patient-card-settings', icon: CurrencyDollarIcon, label: 'Patient Card Settings' },
  { path: '/app/reports/workload', icon: DocumentTextIcon, label: 'Workload Analytics' },
  { path: '/app/weekly-diseases-report', icon: DocumentTextIcon, label: 'Weekly Diseases Report' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
  { path: '/app/settings', icon: CogIcon, label: 'Settings' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/billing', icon: DashboardIcon, label: 'Billing Dashboard' },
  { path: '/app/billing/expense-manager', icon: DashboardIcon, label: 'Add Expense' },
];

const systemControlsMenuItems = [
  { path: '/app/system-controls', icon: ShieldCheckIcon, label: 'Attendance Overlay Control' },
  { path: '/app/staff-attendance-control', icon: UsersIcon, label: 'Staff Attendance Control' },
];

const doctorMenuItems = [
  { path: '/app/doctor', icon: DashboardIcon, label: 'Doctor Dashboard' },
  { path: '/app/ward/ipd', icon: PatientsIcon, label: 'IPD Management' },
  { path: '/app/doctor/patients', icon: PatientsIcon, label: 'My Patients' },
  { path: '/app/doctor/consultations', icon: DocumentTextIcon, label: 'Consultations' },
  { path: '/app/doctor/appointments', icon: AppointmentsIcon, label: 'Appointments' },
  { path: '/app/doctor/medical-test-requests', icon: BeakerIcon, label: 'Request Forms' },
  { path: '/app/doctor/medical-certificates', icon: DocumentIcon, label: 'Medical Certificates' },
  { path: '/app/doctor/emr-referral', icon: DocumentTextIcon, label: 'Referral Paper' },
  { path: '/app/nurse/monthly-report', icon: DocumentTextIcon, label: 'Monthly Report' },
  { path: '/app/reports/workload', icon: DocumentTextIcon, label: 'Workload Analytics' },
  { path: '/app/weekly-diseases-report', icon: DocumentTextIcon, label: 'Weekly Diseases Report' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/leave-request', icon: Calendar, label: 'Request Leave' },
];

const receptionMenuItems = [
  { path: '/app/reception', icon: DashboardIcon, label: 'Reception Dashboard' },
  { path: '/app/reception/register', icon: UserPlusIcon, label: 'Register Patient' },
  { path: '/app/reception/service-request', icon: CogIcon, label: 'Request Service' },
  { path: '/app/appointments', icon: AppointmentsIcon, label: 'Manage Appointments' },
  { path: '/app/billing/invoices', icon: CurrencyDollarIcon, label: 'Patient Billing' },
  { path: '/app/reports/workload', icon: DocumentTextIcon, label: 'Workload Analytics' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/leave-request', icon: Calendar, label: 'Request Leave' },
];

const financeMenuItems = [
  { path: '/app/billing', icon: DashboardIcon, label: 'Billing Dashboard' },
  { path: '/app/billing/invoices', icon: CurrencyDollarIcon, label: 'Invoices' },
  { path: '/app/billing/patient-cards', icon: CurrencyDollarIcon, label: 'Patient Cards' },
  { path: '/app/reports/workload', icon: DocumentTextIcon, label: 'Workload Analytics' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
];

const nurseMenuItems = [
  { path: '/app/ward', icon: DashboardIcon, label: 'Nurse Dashboard' },
  { path: '/app/ward/ipd', icon: PatientsIcon, label: 'IPD Management' },
  { path: '/app/ward/vitals', icon: BeakerIcon, label: 'Record Vitals' },
  { path: '/app/ward/medications-backup', icon: ClipboardDocumentCheckIcon, label: 'Administer Meds' },
  { path: '/app/ward/injection', icon: BeakerIcon, label: 'Injection' },
  { path: '/app/ward/blood-pressure', icon: HeartIcon, label: 'Blood Pressure' },
  { path: '/app/ward/dash-diet', icon: HeartIcon, label: 'DASH Diet' },
  { path: '/app/procedures', icon: WrenchScrewdriverIcon, label: 'Procedures' },
  { path: '/app/appointments', icon: AppointmentsIcon, label: 'View Schedule' },
  { path: '/app/nurse/monthly-report', icon: DocumentTextIcon, label: 'Monthly Report' },
  { path: '/app/reports/workload', icon: DocumentTextIcon, label: 'Workload Analytics' },
  { path: '/app/weekly-diseases-report', icon: DocumentTextIcon, label: 'Weekly Diseases Report' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/leave-request', icon: Calendar, label: 'Request Leave' },
];

const labMenuItems = [
  { path: '/app/lab', icon: DashboardIcon, label: 'Lab Dashboard' },
  { path: '/app/lab/new-test', icon: BeakerIcon, label: 'Enter Test Results' },
  { path: '/app/lab/results', icon: DocumentMagnifyingGlassIcon, label: 'View Results' },
  { path: '/app/lab/results/search', icon: DocumentMagnifyingGlassIcon, label: 'Search Completed Labs' },
  { path: '/app/lab/service-results', icon: DocumentTextIcon, label: 'Service Results' },
  { path: '/app/reports/workload', icon: DocumentTextIcon, label: 'Workload Analytics' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/leave-request', icon: Calendar, label: 'Request Leave' },
];

const imagingMenuItems = [
  { path: '/app/imaging/dashboard', icon: DashboardIcon, label: 'Imaging Dashboard' },
  { path: '/app/reports/workload', icon: DocumentTextIcon, label: 'Workload Analytics' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/leave-request', icon: Calendar, label: 'Request Leave' },
];

interface ShadcnSidebarProps {
  children: React.ReactNode;
}

const ShadcnSidebarLayout: React.FC<ShadcnSidebarProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isLoading: authLoading } = useAuth();
  const { isDarkMode } = useSafeTheme();
  const { attendanceStatus, isLoading: statusLoading } = useAttendanceStatus();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const isNavigatingRef = useRef(false);
  const [isNavigatingViaButtons, setIsNavigatingViaButtons] = useState(false);
  const lastRouteStartTimeRef = useRef<number | null>(null);
  const lastRoutePathRef = useRef<string | null>(null);

  // Attendance tracking logic (from original App.tsx)
  useEffect(() => {
    if (user) {
      // Delay starting attendance tracking to reduce initial load
      const timer = setTimeout(() => {
        attendanceService.startActivityTracking();
      }, 3000); // 3 second delay

      return () => {
        clearTimeout(timer);
        attendanceService.stopActivityTracking();
      };
    }
  }, [user]);

  // Track dwell time per route (enter/leave) for sidebar items
  useEffect(() => {
    const now = Date.now();

    const prevPath = lastRoutePathRef.current;
    const prevStart = lastRouteStartTimeRef.current;

    // When route changes, send a leave event for the previous route if any
    if (prevPath && typeof prevStart === 'number') {
      const durationMs = now - prevStart;
      analyticsService.trackRouteUsage({
        action: 'leave',
        path: prevPath,
        role: user?.role,
        userId: (user as any)?._id || (user as any)?.id,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    }

    // Record enter for the new route
    lastRoutePathRef.current = location.pathname;
    lastRouteStartTimeRef.current = now;
    analyticsService.trackRouteUsage({
      action: 'enter',
      path: location.pathname,
      role: user?.role,
      userId: (user as any)?._id || (user as any)?.id,
      timestamp: new Date().toISOString(),
    });

    // On unmount, flush the last route's duration
    return () => {
      const endNow = Date.now();
      const lp = lastRoutePathRef.current;
      const ls = lastRouteStartTimeRef.current;
      if (lp && typeof ls === 'number') {
        analyticsService.trackRouteUsage({
          action: 'leave',
          path: lp,
          role: user?.role,
          userId: (user as any)?._id || (user as any)?.id,
          durationMs: endNow - ls,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }, [location.pathname, user]);

  // Track navigation state within the application - only for sidebar items
  useEffect(() => {
    const currentPath = location.pathname;

    // Get all sidebar menu items for the current user
    let allSidebarPaths: string[] = [];
    if (user) {
      switch (user.role) {
        case 'doctor':
          allSidebarPaths = doctorMenuItems.map(item => item.path);
          break;
        case 'reception':
          allSidebarPaths = receptionMenuItems.map(item => item.path);
          break;
        case 'nurse':
          allSidebarPaths = nurseMenuItems.map(item => item.path);
          break;
        case 'lab':
          allSidebarPaths = labMenuItems.map(item => item.path);
          break;
        case 'imaging':
          allSidebarPaths = imagingMenuItems.map(item => item.path);
          break;
        case 'finance':
          allSidebarPaths = financeMenuItems.map(item => item.path);
          break;
        case 'admin':
        default:
          allSidebarPaths = adminMenuItems.map(item => item.path);
          break;
      }
    }

    // Only track navigation if it's a sidebar path
    if (!allSidebarPaths.includes(currentPath)) {
      return;
    }

    // If we're navigating via buttons, don't add to history, just reset the flag
    if (isNavigatingViaButtons) {
      console.log('Navigation via buttons detected, resetting flag');
      setIsNavigatingViaButtons(false);
      return;
    }

    setNavigationHistory(prevHistory => {
      // Initialize history if empty
      if (prevHistory.length === 0) {
        console.log('Initializing sidebar navigation history with:', currentPath);
        setCurrentHistoryIndex(0);
        return [currentPath];
      }

      // Check if this is a new navigation (not back/forward)
      const lastPath = prevHistory[currentHistoryIndex];
      if (currentPath !== lastPath) {
        // This is a new navigation, add to history
        const newHistory = prevHistory.slice(0, currentHistoryIndex + 1);
        newHistory.push(currentPath);
        console.log('Adding new sidebar path to history:', currentPath, 'New history:', newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
        return newHistory;
      }

      return prevHistory;
    });
  }, [location.pathname, currentHistoryIndex, isNavigatingViaButtons, user]);

  // Initialize navigation history on first load
  useEffect(() => {
    if (navigationHistory.length === 0) {
      console.log('Initializing navigation history with:', location.pathname);
      setNavigationHistory([location.pathname]);
      setCurrentHistoryIndex(0);
    }
  }, [location.pathname, navigationHistory.length]);

  // Test function to populate sidebar history (for debugging)
  useEffect(() => {
    // Add this to window for testing
    (window as any).testSidebarNavigation = {
      addTestHistory: () => {
        console.log('Adding test sidebar navigation history...');
        // Get sidebar paths for current user
        let testPaths: string[] = [];
        if (user) {
          switch (user.role) {
            case 'reception':
              testPaths = ['/app/dashboard', '/app/reception', '/app/appointments'];
              break;
            case 'admin':
              testPaths = ['/app/dashboard', '/app/staff-management', '/app/patients'];
              break;
            default:
              testPaths = ['/app/dashboard', '/app/reception', location.pathname];
          }
        }
        setNavigationHistory(testPaths);
        setCurrentHistoryIndex(testPaths.length - 1);
        console.log('Test sidebar history set:', testPaths);
      },
      showState: () => {
        console.log('Current sidebar navigation state:', {
          history: navigationHistory,
          currentIndex: currentHistoryIndex,
          canGoBack,
          canGoForward,
          currentPath: location.pathname,
          userRole: user?.role
        });
      },
      getSidebarPaths: () => {
        let paths: string[] = [];
        if (user) {
          switch (user.role) {
            case 'doctor':
              paths = doctorMenuItems.map(item => item.path);
              break;
            case 'reception':
              paths = receptionMenuItems.map(item => item.path);
              break;
            case 'nurse':
              paths = nurseMenuItems.map(item => item.path);
              break;
            case 'admin':
            default:
              paths = adminMenuItems.map(item => item.path);
              break;
          }
        }
        console.log('Available sidebar paths for', user?.role + ':', paths);
        return paths;
      }
    };
  }, [navigationHistory, currentHistoryIndex, canGoBack, canGoForward, location.pathname, user]);

  // Listen to browser back/forward buttons and sync with our state
  useEffect(() => {
    const handlePopState = () => {
      // When browser back/forward is used, find the current path in our history
      const currentPath = location.pathname;
      const historyIndex = navigationHistory.findIndex(path => path === currentPath);

      if (historyIndex !== -1) {
        setCurrentHistoryIndex(historyIndex);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigationHistory, location.pathname]);

  // Update button states based on our navigation history
  useEffect(() => {
    const canGoBackState = currentHistoryIndex > 0 && navigationHistory.length > 1;
    const canGoForwardState = currentHistoryIndex >= 0 && currentHistoryIndex < navigationHistory.length - 1;

    setCanGoBack(canGoBackState);
    setCanGoForward(canGoForwardState);

    console.log('Navigation State Update:', {
      history: navigationHistory,
      historyLength: navigationHistory.length,
      currentIndex: currentHistoryIndex,
      canGoBack: canGoBackState,
      canGoForward: canGoForwardState,
      currentPath: location.pathname
    });
  }, [navigationHistory, currentHistoryIndex, location.pathname]);

  // Navigation functions for sidebar items
  const handleGoBack = () => {
    console.log('Sidebar Back button clicked', {
      canGoBack,
      currentHistoryIndex,
      history: navigationHistory,
      historyLength: navigationHistory.length,
      currentPath: location.pathname
    });

    if (currentHistoryIndex > 0 && navigationHistory.length > 1) {
      const newIndex = currentHistoryIndex - 1;
      const targetPath = navigationHistory[newIndex];
      console.log('Going back to sidebar item:', targetPath, 'from index:', currentHistoryIndex, 'to index:', newIndex);
      setIsNavigatingViaButtons(true);
      setCurrentHistoryIndex(newIndex);
      navigate(targetPath);
    } else {
      console.log('Cannot go back - no previous sidebar item in history');
    }
  };

  const handleGoForward = () => {
    console.log('Sidebar Forward button clicked', {
      canGoForward,
      currentHistoryIndex,
      history: navigationHistory,
      historyLength: navigationHistory.length,
      currentPath: location.pathname
    });

    if (currentHistoryIndex < navigationHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      const targetPath = navigationHistory[newIndex];
      console.log('Going forward to sidebar item:', targetPath, 'from index:', currentHistoryIndex, 'to index:', newIndex);
      setIsNavigatingViaButtons(true);
      setCurrentHistoryIndex(newIndex);
      navigate(targetPath);
    } else {
      console.log('Cannot go forward - no next sidebar item in history');
    }
  };

  const handleLogout = async () => {
    console.log("Logout button clicked");
    try {
      await logout();
      console.log("Logout function finished, navigating...");
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed in Sidebar:', error);
      toast.error('Logout failed. Please try again.');
      navigate('/login', { replace: true });
    }
  };

  // Determine menu items based on user role (EXACTLY as in your original)
  let currentMenuItems = adminMenuItems;
  if (user && user.role) {
    switch (user.role.toLowerCase()) {
      case 'doctor':
        currentMenuItems = doctorMenuItems;
        break;
      case 'reception':
        currentMenuItems = receptionMenuItems;
        break;
      case 'nurse':
        currentMenuItems = nurseMenuItems;
        break;
      case 'lab':
        currentMenuItems = labMenuItems;
        break;
      case 'imaging':
        currentMenuItems = imagingMenuItems;
        break;
      case 'finance':
        currentMenuItems = financeMenuItems;
        break;
      case 'admin':
      default:
        currentMenuItems = adminMenuItems;
        break;
    }
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AttendanceOverlay>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <Sidebar variant="inset" className="no-print">
            {/* Header with Logo */}
            <SidebarHeader className="border-b border-sidebar-border pb-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="relative flex-shrink-0">
                  <img
                    src="/assets/images/logo.jpg"
                    alt="New Life Clinic logo"
                    className="h-9 w-9 rounded-xl object-cover shadow-sm ring-2 ring-sidebar-border"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate font-bold text-sidebar-foreground text-sm leading-tight">
                    New Life Clinic
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/50 font-medium">
                    Healthcare Center
                  </span>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="px-3 py-1">
                <ThemeSelector className="w-full" />
              </div>
            </SidebarHeader>

            {/* Main Navigation Content */}
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {currentMenuItems && currentMenuItems.length > 0 ? (
                      currentMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        // Determine if a child route is active for Doctor Dashboard
                        const isChildActive = item.path === '/app/doctor' &&
                          (location.pathname === '/app/doctor/patients' || location.pathname === '/app/doctor/appointments');
                        const uniqueKey = `${item.path}-${item.label.replace(/\\s+/g, '-').toLowerCase()}`;

                        return (
                          <SidebarMenuItem key={uniqueKey}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className="w-full relative"
                            >
                              <Link
                                to={item.path}
                                className="flex items-center gap-3 w-full"
                                onClick={() => {
                                  analyticsService.trackRouteUsage({
                                    action: 'click',
                                    path: item.path,
                                    label: item.label,
                                    role: user?.role,
                                    userId: (user as any)?._id || (user as any)?.id,
                                    timestamp: new Date().toISOString(),
                                  });
                                }}
                              >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                                {isChildActive && (
                                  <div className="absolute right-3 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" title="Active section" />
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <p className="text-sm text-muted-foreground">
                          Loading menu...
                        </p>
                      </div>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* System Controls section - only for admin users */}
              {user?.role === 'admin' && (
                <SidebarGroup>
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                      System Controls
                    </h3>
                  </div>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {systemControlsMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const uniqueKey = `system-${item.path}-${item.label.replace(/\s+/g, '-').toLowerCase()}`;

                        return (
                          <SidebarMenuItem key={uniqueKey}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className="w-full"
                            >
                              <Link
                                to={item.path}
                                className="flex items-center gap-3 w-full"
                                onClick={() => {
                                  analyticsService.trackRouteUsage({
                                    action: 'click',
                                    path: item.path,
                                    label: item.label,
                                    role: user?.role,
                                    userId: (user as any)?._id || (user as any)?.id,
                                    timestamp: new Date().toISOString(),
                                  });
                                }}
                              >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </SidebarContent>

            {/* Footer with User Info & Logout */}
            <SidebarFooter className="border-t border-sidebar-border pt-2">
              <SidebarMenu>
                {/* Check-in/Check-out Button */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsQRModalOpen(true)}
                    disabled={attendanceStatus?.status === 'overtime_completed' ||
                      (attendanceStatus?.status === 'clocked_in' || attendanceStatus?.status === 'checked_in')}
                    className={`w-full border-0 font-medium rounded-lg transition-all duration-200 ${attendanceStatus?.status === 'overtime_completed' ||
                        (attendanceStatus?.status === 'clocked_in' || attendanceStatus?.status === 'checked_in')
                        ? 'bg-gray-400/80 hover:bg-gray-400/80 cursor-not-allowed text-white'
                        : attendanceStatus?.status === 'overtime_active'
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30'
                      }`}
                  >
                    <QrCodeIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-semibold leading-tight">
                        {attendanceStatus?.status === 'overtime_active' ? 'Check Out (Overtime)' :
                          attendanceStatus?.status === 'overtime_completed' ? 'Overtime Completed' :
                            attendanceStatus?.status === 'clocked_in' || attendanceStatus?.status === 'checked_in' ? 'Checked In' :
                              'Check-in / Check-out'}
                      </span>
                      {statusLoading && (
                        <span className="text-xs opacity-60">Loading...</span>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <div className="flex items-center gap-3 px-3 py-2 text-sm">
                    {user?.photo ? (
                      <img
                        src={user.photo}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-sidebar-border flex-shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-sidebar-border">
                        <span className="text-xs font-semibold text-primary">
                          {user ? (user.firstName || user.name || 'U')[0].toUpperCase() : 'U'}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate font-medium text-sidebar-foreground text-sm">
                        {user ? `${user.firstName || user.name || 'User'} ${user.lastName || ''}`.trim() : 'Loading...'}
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/60 capitalize">
                        {user?.role || 'Loading role...'}
                      </span>
                    </div>
                  </div>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-150">
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          {/* Main Content Area */}
          <SidebarInset>
            {/* Header with Sidebar Toggle */}
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 no-print sticky top-0 z-10">
              <SidebarTrigger className="-ml-1 h-8 w-8 rounded-md hover:bg-accent transition-colors" />

              {/* Divider */}
              <div className="h-5 w-px bg-border mx-1" />

              {/* Navigation Buttons */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleGoBack}
                  disabled={!canGoBack}
                  className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${canGoBack
                      ? 'hover:bg-accent text-foreground'
                      : 'text-muted-foreground/40 cursor-not-allowed'
                    }`}
                  title="Go back"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleGoForward}
                  disabled={!canGoForward}
                  className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${canGoForward
                      ? 'hover:bg-accent text-foreground'
                      : 'text-muted-foreground/40 cursor-not-allowed'
                    }`}
                  title="Go forward"
                >
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground overflow-hidden">
                <span className="hidden sm:block truncate max-w-xs font-medium text-foreground">
                  {currentMenuItems.find(item => location.pathname === item.path)?.label ||
                    currentMenuItems.find(item => location.pathname.startsWith(item.path) && item.path !== '/app')?.label ||
                    'Dashboard'}
                </span>
              </div>

              <div className="flex-1" />

              {/* Right side: theme + user pill */}
              <div className="flex items-center gap-2">
                <ThemeSelector />
                {/* User pill */}
                <div className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-muted/60 border border-border hover:bg-muted transition-colors cursor-default">
                  {user?.photo ? (
                    <img
                      src={user.photo}
                      alt="avatar"
                      className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-primary">
                        {user ? (user.firstName || user.name || 'U')[0].toUpperCase() : 'U'}
                      </span>
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground truncate max-w-[100px]">
                    {user ? `${user.firstName || user.name || 'User'}` : 'User'}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize hidden md:block">
                    · {user?.role || ''}
                  </span>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <div className="flex flex-1 flex-col gap-4 p-5 bg-background">
              {children}
            </div>
          </SidebarInset>
        </div>

        {/* QR Code Modal */}
        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
        />

        {/* Toaster for notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 6000,
            style: {
              zIndex: 9999,
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              style: {
                background: '#10B981',
                color: 'white',
              },
            },
            error: {
              style: {
                background: '#EF4444',
                color: 'white',
                minWidth: '300px',
              },
            },
          }}
        />
      </SidebarProvider>
    </AttendanceOverlay>
  );
};

export default ShadcnSidebarLayout;
