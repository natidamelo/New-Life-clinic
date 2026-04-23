import React, { useState } from 'react';
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
  UserPlusIcon,
  CurrencyDollarIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useSafeTheme } from '../hooks/useSafeTheme';
import { toast } from 'react-hot-toast';
import QRCodeModal from './QRCodeModal';
import ThemeSelector from './ThemeSelector';
import { useAttendanceStatus } from '../hooks/useAttendanceStatus';

// Define menu items for different roles
const adminMenuItems = [
  { path: '/app/dashboard', icon: AdminHomeIcon, label: 'Admin Dashboard' },
  { path: '/app/staff-management', icon: UserPlusIcon, label: 'Staff Management' },
  { path: '/app/pharmacy', icon: BeakerIcon, label: 'Stock Management' },
  { path: '/app/services', icon: CogIcon, label: 'Service Management' },
  { path: '/app/patient-card-settings', icon: CurrencyDollarIcon, label: 'Patient Card Settings' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
  { path: '/app/settings', icon: CogIcon, label: 'Settings' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/billing', icon: DashboardIcon, label: 'Billing Dashboard' },
  { path: '/app/billing/expense-manager', icon: DashboardIcon, label: 'Add Expense' }, // Updated route
];

const doctorMenuItems = [
  { path: '/app/doctor', icon: DashboardIcon, label: 'Doctor Dashboard' },
  { path: '/app/doctor/patients', icon: PatientsIcon, label: 'My Patients' },
  { path: '/app/doctor/consultations', icon: DocumentTextIcon, label: 'Consultations' },
  { path: '/app/doctor/appointments', icon: AppointmentsIcon, label: 'Appointments' },
  { path: '/app/nurse/monthly-report', icon: DocumentTextIcon, label: 'Monthly Report' },
  { path: '/app/depo-injections', icon: HeartIcon, label: 'Depo Injections' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
];

// Define menu items for Reception
const receptionMenuItems = [
  { path: '/app/reception', icon: DashboardIcon, label: 'Reception Dashboard' },
  { path: '/app/reception/register', icon: UserPlusIcon, label: 'Register Patient' },
  { path: '/app/patients', icon: PatientsIcon, label: 'Patients' },
  { path: '/app/reception/service-request', icon: CogIcon, label: 'Request Service' },
  { path: '/app/appointments', icon: AppointmentsIcon, label: 'Manage Appointments' },
  { path: '/app/billing/invoices', icon: CurrencyDollarIcon, label: 'Patient Billing' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
];

// Define menu items for Finance
const financeMenuItems = [
  { path: '/app/billing', icon: DashboardIcon, label: 'Billing Dashboard' },
  { path: '/app/billing/invoices', icon: CurrencyDollarIcon, label: 'Invoices' },
  { path: '/app/billing/patient-cards', icon: CurrencyDollarIcon, label: 'Patient Cards' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
];

// Define menu items for Nurse
const nurseMenuItems = [
  { path: '/app/ward', icon: DashboardIcon, label: 'Nurse Dashboard' },
  { path: '/app/ward/vitals', icon: BeakerIcon, label: 'Record Vitals' },
  { path: '/app/ward/medications-backup', icon: ClipboardDocumentCheckIcon, label: 'Administer Meds' },
  { path: '/app/ward/injection', icon: BeakerIcon, label: 'Injection' },
  { path: '/app/depo-injections', icon: HeartIcon, label: 'Depo Injections' },
  { path: '/app/ward/blood-pressure', icon: HeartIcon, label: 'Blood Pressure' },
  { path: '/app/ward/dash-diet', icon: HeartIcon, label: 'DASH Diet' },
  { path: '/app/procedures', icon: WrenchScrewdriverIcon, label: 'Procedures' },
  { path: '/app/appointments', icon: AppointmentsIcon, label: 'View Schedule' },
  { path: '/app/nurse/monthly-report', icon: DocumentTextIcon, label: 'Monthly Report' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
];

// Define menu items for Lab - Updated with new service result functionality
const labMenuItems = [
  { path: '/app/lab', icon: DashboardIcon, label: 'Lab Dashboard' },
  { path: '/app/lab/new-test', icon: BeakerIcon, label: 'Enter Test Results' },
  { path: '/app/lab/results', icon: DocumentMagnifyingGlassIcon, label: 'View Results' },
  { path: '/app/lab/service-results', icon: DocumentTextIcon, label: 'Service Results' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
];

const imagingMenuItems = [
  { path: '/app/imaging/dashboard', icon: DashboardIcon, label: 'Imaging Dashboard' },
  { path: '/app/theme-settings', icon: CogIcon, label: 'Appearance' },
  { path: '/app/profile', icon: UserCircleIcon, label: 'Profile' },
];

interface SidebarProps {
  // No props needed - component is self-contained
}

const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { isDarkMode } = useSafeTheme();
  const { attendanceStatus, isLoading: statusLoading } = useAttendanceStatus();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Force re-render when component mounts to ensure menu items are updated
  React.useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, []);


  // Make handleLogout synchronous
  const handleLogout = () => {
    console.log("Logout button clicked");
    try {
      logout(); // Call synchronous logout function
      console.log("Logout function finished, navigating...");
      navigate('/login'); // Navigate after state updates
    } catch (error) {
      console.error('Logout failed in Sidebar:', error);
      toast.error('Logout failed. Please try again.');
    }
  };

  // Determine menu items based on user role
  let currentMenuItems = adminMenuItems; // Default to admin menu
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

  return (
    <div className="w-64 h-screen flex flex-col bg-card border-r border-border">
      <div className="p-6 flex items-center">
        <img
          src="/assets/images/logo.jpg"
          alt="New Life Clinic logo"
          className="h-9 w-9 rounded-full object-cover mr-2 ring-1 ring-black/10"
        />
        <div>
          <h1 className="text-xl font-bold text-foreground">New Life Clinic</h1>
          <p className="text-xs text-muted-foreground">Healthcare Center</p>
        </div>
      </div>

      <nav className="flex-1 px-4">
        <div className="space-y-1" key={`menu-${user?.role}-${forceUpdate}`}>
          {currentMenuItems && currentMenuItems.length > 0 ? (
            currentMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              // Determine if a child route is active for Doctor Dashboard
              const isChildActive = item.path === '/app/doctor' &&
                (location.pathname === '/app/doctor/patients' || location.pathname === '/app/doctor/appointments');
              // Use a combination of path and label for a unique key
              const uniqueKey = `${item.path}-${item.label.replace(/\\s+/g, '-').toLowerCase()}`;

              return (
                <Link
                  key={uniqueKey}
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group relative ${isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? '' : ''
                    }`} />
                  <span className="ml-3 font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                  )}
                  {isChildActive && !isActive && (
                    <div className="absolute right-3 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" title="Active section" />
                  )}
                </Link>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Loading menu...
              </p>
            </div>
          )}
        </div>
      </nav>

      {/* Check-in/Check-out Button */}
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={() => setIsQRModalOpen(true)}
          disabled={attendanceStatus?.status === 'overtime_completed' ||
            (attendanceStatus?.status === 'clocked_in' || attendanceStatus?.status === 'checked_in')}
          className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 group text-primary-foreground shadow-md ${attendanceStatus?.status === 'overtime_completed' ||
              (attendanceStatus?.status === 'clocked_in' || attendanceStatus?.status === 'checked_in')
              ? 'bg-muted hover:bg-muted cursor-not-allowed'
              : attendanceStatus?.status === 'overtime_active'
                ? 'bg-secondary hover:bg-secondary/80 hover:shadow-lg'
                : 'bg-primary hover:bg-primary/90 hover:shadow-lg'
            }`}
        >
          <QrCodeIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          <div className="ml-3 flex flex-col items-start">
            <span className="font-medium">
              {attendanceStatus?.status === 'overtime_active' ? 'Check Out (Overtime)' :
                attendanceStatus?.status === 'overtime_completed' ? 'Overtime Completed' :
                  attendanceStatus?.status === 'clocked_in' || attendanceStatus?.status === 'checked_in' ? 'Already Checked In' :
                    'Check-in/Check-out'}
            </span>
            {statusLoading && (
              <span className="text-xs opacity-75">Loading...</span>
            )}
          </div>
        </button>
      </div>

      {/* Theme Toggle */}
      <div className="px-4 py-3 border-t border-border">
        <ThemeSelector className="w-full" />
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            {user?.photo ? (
              <img
                src={user.photo}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-foreground">
              {user ? `${user.firstName || user.name || 'User'} ${user.lastName || ''}`.trim() : 'Loading...'}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.role || 'Loading role...'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 rounded-lg transition-colors group text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          <span className="ml-3 font-medium">Logout</span>
        </button>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />
    </div>
  );
};

export default Sidebar; 