import { Navigate, createBrowserRouter, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

// Loading component for lazy-loaded routes
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
    <CircularProgress />
  </Box>
);

// Wrapper for lazy-loaded components
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
);

// Helper to create lazy-loaded routes
const createLazyRoute = (path: string, Component: React.ComponentType, errorElement = <ErrorFallback />) => ({
  path,
  element: <LazyWrapper><Component /></LazyWrapper>,
  errorElement
});

// Lazy load heavy components to reduce initial bundle size
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/Dashboard/AdminDashboard'));
const Patients = lazy(() => import('./pages/Patients'));
const Appointments = lazy(() => import('./pages/Appointments'));
const LabTests = lazy(() => import('./pages/LabTests'));
const Profile = lazy(() => import('./pages/Profile'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const ReceptionDashboard = lazy(() => import('./pages/Reception/ReceptionDashboard'));
const NurseDashboard = lazy(() => import('./pages/Nurse/NurseDashboard'));
const ModernWardDashboard = lazy(() => import('./pages/Nurse/ModernWardDashboard'));
const NurseTasksNew = lazy(() => import('./pages/Nurse/NurseTasksNew'));
const NurseTasks = lazy(() => import('./pages/Nurse/NurseTasks'));
const InjectionDashboard = lazy(() => import('./pages/Nurse/InjectionDashboard'));
const LabDashboard = lazy(() => import('./pages/Lab/LabDashboard'));
const EnterTestResults = lazy(() => import('./pages/Lab/EnterTestResults'));
const ViewResults = lazy(() => import('./pages/Lab/ViewResults'));
const CreateServiceResult = lazy(() => import('./pages/Lab/CreateServiceResult'));
const ServiceResults = lazy(() => import('./pages/Lab/ServiceResults'));
const DoctorDashboard = lazy(() => import('./pages/Doctor/DoctorDashboard'));
// Replace legacy imaging dashboard with the newer component
const MahletImagingDashboard = lazy(() => import('./components/doctor/ImagingDashboard'));
const InvoiceList = lazy(() => import('./pages/Billing/InvoiceList'));
const NewInvoice = lazy(() => import('./pages/Billing/NewInvoice'));
const EditInvoice = lazy(() => import('./pages/Billing/EditInvoice'));
const BillingDashboard = lazy(() => import('./pages/Billing/BillingDashboard'));
const BillingReports = lazy(() => import('./pages/Billing/BillingReports'));
const DetailedBillingReport = lazy(() => import('./pages/Billing/DetailedBillingReport'));
const ItemRevenueReport = lazy(() => import('./pages/Billing/ItemRevenueReport'));
import ProtectedRoute from './components/ProtectedRoute';
import ErrorFallback from './components/common/ErrorFallback';
import ShadcnSidebarLayout from './components/ShadcnSidebar';

const BillingPatientDemographics = lazy(() => import('./pages/Billing/PatientDemographics'));
const StandardFinancialReport = lazy(() => import('./pages/Finance/Reports/StandardFinancialReport'));
const StockManagement = lazy(() => import('./pages/Inventory/StockManagement'));
const InventoryDashboard = lazy(() => import('./components/admin/InventoryDashboard'));
const NewInventoryItemForm = lazy(() => import('./pages/Inventory/NewInventoryItemForm'));
const StaffManagement = lazy(() => import('./pages/Dashboard/StaffManagement'));
const StaffControlCenter = lazy(() => import('./pages/Dashboard/StaffControlCenter'));
const InvoiceDetail = lazy(() => import('./pages/Billing/InvoiceDetail'));
const PatientServicesHub = lazy(() => import('./pages/Dashboard/PatientServicesHub'));
const PatientReports = lazy(() => import('./pages/Reports/PatientReports'));
const ReportsDashboard = lazy(() => import('./pages/Reports/ReportsDashboard'));
const WorkloadAnalytics = lazy(() => import('./pages/Reports/WorkloadAnalytics'));
const WeeklyDiseasesReportPage = lazy(() => import('./pages/Reports/WeeklyDiseasesReport'));
const FacilityDashboard = lazy(() => import('./pages/Facility/FacilityDashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const ThemeSettings = lazy(() => import('./pages/ThemeSettings'));
const PatientCardSettings = lazy(() => import('./pages/Settings/PatientCardSettings'));
const ServiceManagement = lazy(() => import('./pages/Services/ServiceManagement'));
const DataSharePage = lazy(() => import('./pages/DataShare/DataShare'));
const RegisterPatient = lazy(() => import('./pages/Reception/RegisterPatient'));
const MedicalRecordDemo = lazy(() => import('./pages/MedicalRecordDemo'));
const UserManagement = lazy(() => import('./pages/Admin/UserManagement'));
const SystemControls = lazy(() => import('./pages/Admin/SystemControls'));
const ClinicManagement = lazy(() => import('./pages/Admin/ClinicManagement'));
const UIShowcasePage = lazy(() => import('./pages/UIShowcasePage'));
const StaffAttendanceControlPage = lazy(() => import('./pages/Admin/StaffAttendanceControl'));
const ServiceRequestForm = lazy(() => import('./pages/Reception/ServiceRequestForm'));
const AuthTest = lazy(() => import('./pages/AuthTest'));
const ProcessPaymentPage = lazy(() => import('./pages/Billing/ProcessPaymentPage'));
const ExpenseManager = lazy(() => import('./pages/Finance/ExpenseManager'));
const Consultations = lazy(() => import('./pages/Doctor/Consultations'));
const EnhancedConsultationForm = lazy(() => import('./pages/Doctor/EnhancedConsultationForm'));
const VitalsPage = lazy(() => import('./pages/Nurse/VitalsPage'));
const MedicationsPage = lazy(() => import('./pages/Nurse/MedicationsPage'));
const MyPatients = lazy(() => import('./pages/Doctor/MyPatients'));
const DoctorAppointments = lazy(() => import('./pages/Doctor/DoctorAppointments'));
const BloodPressure = lazy(() => import('./pages/Ward/BloodPressure'));
const DashDiet = lazy(() => import('./pages/Ward/DashDiet'));
const IPDManagement = lazy(() => import('./pages/Ward/IPDManagement'));
const Procedures = lazy(() => import('./pages/Nurse/Procedures'));
const MonthlyReportPage = lazy(() => import('./pages/Nurse/MonthlyReportPage'));
const VerifyQR = lazy(() => import('./pages/VerifyQR'));
const LeaveRequest = lazy(() => import('./pages/LeaveRequest'));
const EMRPrescriptions = lazy(() => import('./pages/Doctor/EMRPrescriptions'));
const DepoInjectionManagement = lazy(() => import('./pages/DepoInjectionManagement'));
const MedicalCertificates = lazy(() => import('./pages/Doctor/MedicalCertificates'));
const EMRReferralPaper = lazy(() => import('./components/doctor/EMRReferralPaper'));
const MedicalTestRequestForm = lazy(() => import('./pages/Doctor/MedicalTestRequestForm'));


const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
    errorElement: <ErrorFallback />
  },
  createLazyRoute("/login", Login),
  {
    path: "/verify-qr",
    element: <LazyWrapper><VerifyQR /></LazyWrapper>,
    errorElement: <ErrorFallback />
  },

  {
    path: '/billing/process-payment/:notificationId',
    element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><LazyWrapper><ProcessPaymentPage /></LazyWrapper></ProtectedRoute>,
    errorElement: <ErrorFallback />
  },
  {
    path: "/*",
    element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance', 'lab', 'imaging', 'billing']}><ShadcnSidebarLayout>
      <Outlet />
    </ShadcnSidebarLayout></ProtectedRoute>,
    errorElement: <ErrorFallback />
  },
  {
    path: '/patient-services',
    element: <Navigate to="/app/patient-services" replace />,
    errorElement: <ErrorFallback />
  },
  {
    path: '/nurse',
    element: <Navigate to='/app/nurse' replace />
  },
  {
    path: '/ward',
    element: <Navigate to='/app/ward' replace />
  },
  {
    path: '/ward/medications',
    element: <Navigate to='/app/ward/medications-backup' replace />
  },
  {
    path: '/app',
    element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance', 'lab', 'imaging', 'billing']}><ShadcnSidebarLayout>
      <Outlet />
    </ShadcnSidebarLayout></ProtectedRoute>,
    children: [
      {
        path: 'dashboard',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance']}><LazyWrapper><AdminDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'patients',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception']}><LazyWrapper><Patients /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'appointments',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception']}><LazyWrapper><Appointments /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'lab-tests',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'lab']}><LazyWrapper><LabTests /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><LazyWrapper><BillingDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/invoices',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><LazyWrapper><InvoiceList /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/invoices/new',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><LazyWrapper><NewInvoice /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/invoices/:id',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><LazyWrapper><InvoiceDetail /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/invoices/:id/edit',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><LazyWrapper><EditInvoice /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/patient-cards',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><LazyWrapper><PatientCardSettings /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/reports',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><LazyWrapper><BillingReports /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/reports/detailed',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><LazyWrapper><DetailedBillingReport /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/expense-manager',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><LazyWrapper><ExpenseManager /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/financial-report',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><LazyWrapper><StandardFinancialReport /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/item-revenue-report',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><LazyWrapper><ItemRevenueReport /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'billing/patient-demographics',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><LazyWrapper><BillingPatientDemographics /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'nurse',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><LazyWrapper><NurseDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'nurse/tasks',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><LazyWrapper><NurseTasksNew /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'ward',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}><LazyWrapper><ModernWardDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'ward/ipd',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}><LazyWrapper><IPDManagement /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'ward/vitals',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><LazyWrapper><VitalsPage /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'ward/medications-backup',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><LazyWrapper><MedicationsPage /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'ward/injection',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><LazyWrapper><InjectionDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'ward/blood-pressure',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><LazyWrapper><BloodPressure /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'ward/dash-diet',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><LazyWrapper><DashDiet /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'procedures',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><LazyWrapper><Procedures /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'nurse/monthly-report',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}><LazyWrapper><MonthlyReportPage /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'reception',
        element: <ProtectedRoute allowedRoles={['admin', 'receptionist', 'reception']}><LazyWrapper><ReceptionDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'reception/register',
        element: <ProtectedRoute allowedRoles={['admin', 'receptionist', 'reception']}><LazyWrapper><RegisterPatient /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'reception/service-request',
        element: <ProtectedRoute allowedRoles={['admin', 'receptionist', 'reception']}><LazyWrapper><ServiceRequestForm /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><DoctorDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor/dashboard',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><DoctorDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor/patients',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><MyPatients /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor/consultations',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><Consultations /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor/consultation/:patientId',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><EnhancedConsultationForm /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor/appointments',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><DoctorAppointments /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor/emr-prescriptions',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><EMRPrescriptions /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor/medical-certificates',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><MedicalCertificates /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor/emr-referral',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><EMRReferralPaper /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'doctor/medical-test-requests',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><MedicalTestRequestForm /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'depo-injections',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}><LazyWrapper><DepoInjectionManagement /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'imaging',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'imaging', 'lab_technician']}><LazyWrapper><MahletImagingDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'imaging/dashboard',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'imaging', 'lab_technician']}><LazyWrapper><MahletImagingDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'admin',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><AdminDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'system-controls',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><SystemControls /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'clinics',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><ClinicManagement /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'staff-attendance-control',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><StaffAttendanceControlPage /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'inventory',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><StockManagement /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'inventory/dashboard',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><InventoryDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'inventory/new-item',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><NewInventoryItemForm /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'inventory/edit/:id',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><NewInventoryItemForm /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'facility',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><FacilityDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'settings',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><Settings /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'theme-settings',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'lab', 'finance']}><LazyWrapper><ThemeSettings /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'profile',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance', 'lab', 'imaging']}><LazyWrapper><Profile /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'patient-services',
        element: <ProtectedRoute allowedRoles={['admin', 'reception', 'nurse', 'doctor']}><LazyWrapper><PatientServicesHub /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'data-share',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><DataSharePage /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'reports',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance']}><LazyWrapper><ReportsDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'reports/workload',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance', 'lab', 'imaging']}><LazyWrapper><WorkloadAnalytics /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'patient-reports',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception']}><LazyWrapper><PatientReports /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'weekly-diseases-report',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}><LazyWrapper><WeeklyDiseasesReportPage /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'patient-card-settings',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><LazyWrapper><PatientCardSettings /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'staff-management',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><StaffManagement /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'staff-control',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><StaffControlCenter /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'leave-request',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'lab', 'imaging', 'reception']}><LazyWrapper><LeaveRequest /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'pharmacy',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><StockManagement /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'services',
        element: <ProtectedRoute allowedRoles={['admin']}><LazyWrapper><ServiceManagement /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'medical-record-demo',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><LazyWrapper><MedicalRecordDemo /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'auth-test',
        element: <LazyWrapper><AuthTest /></LazyWrapper>
      },
      {
        path: 'ui-showcase',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}><LazyWrapper><UIShowcasePage /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'lab',
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><LazyWrapper><LabDashboard /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'lab/new-test',
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><LazyWrapper><EnterTestResults /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'lab/results', 
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><LazyWrapper><ViewResults /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'lab/results/search', 
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><LazyWrapper><ViewResults /></LazyWrapper></ProtectedRoute>
      },
      {
        path: 'lab/service-results',
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><LazyWrapper><ServiceResults /></LazyWrapper></ProtectedRoute>
      }
    ]
  }
]);

export default router; 
