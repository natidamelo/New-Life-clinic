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
import BillingPatientDemographics from './pages/Billing/PatientDemographics';
import StandardFinancialReport from './pages/Finance/Reports/StandardFinancialReport';
import StockManagement from './pages/Inventory/StockManagement';
import InventoryDashboard from './components/admin/InventoryDashboard';
import NewInventoryItemForm from './pages/Inventory/NewInventoryItemForm';
import StaffManagement from './pages/Dashboard/StaffManagement';
import StaffControlCenter from './pages/Dashboard/StaffControlCenter';
import ProtectedRoute from './components/ProtectedRoute';
import PatientDashboard from './components/PatientDashboard';
import NewInvoiceForm from './pages/Billing/NewInvoiceForm';
import InvoiceDetail from './pages/Billing/InvoiceDetail';
import PatientCardManagement from './pages/Billing/PatientCardManagement';
import PatientServicesHub from './pages/Dashboard/PatientServicesHub';
import PatientReports from './pages/Reports/PatientReports';
import ReportsDashboard from './pages/Reports/ReportsDashboard';
import WorkloadAnalytics from './pages/Reports/WorkloadAnalytics';
import WeeklyDiseasesReportPage from './pages/Reports/WeeklyDiseasesReport';
import FacilityDashboard from './pages/Facility/FacilityDashboard';
import Settings from './pages/Settings';
import ThemeSettings from './pages/ThemeSettings';
import ErrorFallback from './components/common/ErrorFallback';
import PatientCardSettings from './pages/Settings/PatientCardSettings';
import ServiceManagement from './pages/Services/ServiceManagement';
import DataSharePage from './pages/DataShare/DataShare';
import RegisterPatient from './pages/Reception/RegisterPatient';
import MedicalRecordDemo from './pages/MedicalRecordDemo';
import ShadcnSidebarLayout from './components/ShadcnSidebar';
import ProfessionalMedicalRecordPage from './pages/Doctor/ProfessionalMedicalRecordPage';
import MahletImagingOrderForm from './components/doctor/MahletImagingOrderForm';
import UserManagement from './pages/Admin/UserManagement';
import SystemControls from './pages/Admin/SystemControls';
import UIShowcasePage from './pages/UIShowcasePage';
import StaffAttendanceControlPage from './pages/Admin/StaffAttendanceControl';
import { PatientDemographics } from './pages/Dashboard/PatientDemographics';
import ServiceRequestForm from './pages/Reception/ServiceRequestForm';
import ServicePatientsManagement from './pages/Reception/ServicePatientsManagement';
import DuePaymentsManager from './components/Reception/DuePaymentsManager';
import AuthTest from './pages/AuthTest';
import ProcessPaymentPage from './pages/Billing/ProcessPaymentPage';
import PrescriptionPaymentPage from './pages/Billing/PrescriptionPaymentPage';
import AddExpenseForm from './pages/Finance/AddExpenseForm';
import ExpenseManager from './pages/Finance/ExpenseManager';
import Consultations from './pages/Doctor/Consultations';
import MedicalRecords from './pages/Doctor/MedicalRecords';
import ConsultationForm from './pages/Doctor/ConsultationForm';
import EnhancedConsultationForm from './pages/Doctor/EnhancedConsultationForm';
import VitalsPage from './pages/Nurse/VitalsPage';
import MedicationsPage from './pages/Nurse/MedicationsPage';
import MyPatients from './pages/Doctor/MyPatients';
import DoctorAppointments from './pages/Doctor/DoctorAppointments';
import BloodPressure from './pages/Ward/BloodPressure';
import DashDiet from './pages/Ward/DashDiet';
import IPDManagement from './pages/Ward/IPDManagement';
import Procedures from './pages/Nurse/Procedures';
import MonthlyReportPage from './pages/Nurse/MonthlyReportPage';
import VerifyQR from './pages/VerifyQR';
import LeaveRequest from './pages/LeaveRequest';
import EMRPrescriptions from './pages/Doctor/EMRPrescriptions';
import DepoInjectionManagement from './pages/DepoInjectionManagement';
import MedicalCertificates from './pages/Doctor/MedicalCertificates';
import EMRReferralPaper from './components/doctor/EMRReferralPaper';
import MedicalTestRequestForm from './pages/Doctor/MedicalTestRequestForm';


const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
    errorElement: <ErrorFallback />
  },
  createLazyRoute("/login", Login),
  {
    path: "/verify-qr",
    element: <VerifyQR />,
    errorElement: <ErrorFallback />
  },

  {
    path: '/billing/process-payment/:notificationId',
    element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><ProcessPaymentPage /></ProtectedRoute>,
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
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance']}><AdminDashboard /></ProtectedRoute>
      },
      {
        path: 'patients',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception']}><Patients /></ProtectedRoute>
      },
      {
        path: 'appointments',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception']}><Appointments /></ProtectedRoute>
      },
      {
        path: 'lab-tests',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'lab']}><LabTests /></ProtectedRoute>
      },
      {
        path: 'billing',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><BillingDashboard /></ProtectedRoute>
      },
      {
        path: 'billing/invoices',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><InvoiceList /></ProtectedRoute>
      },
      {
        path: 'billing/invoices/new',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><NewInvoice /></ProtectedRoute>
      },
      {
        path: 'billing/invoices/:id',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><InvoiceDetail /></ProtectedRoute>
      },
      {
        path: 'billing/invoices/:id/edit',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><EditInvoice /></ProtectedRoute>
      },
      {
        path: 'billing/patient-cards',
        element: <ProtectedRoute allowedRoles={['admin', 'finance', 'reception']}><PatientCardSettings /></ProtectedRoute>
      },
      {
        path: 'billing/reports',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><BillingReports /></ProtectedRoute>
      },
      {
        path: 'billing/reports/detailed',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><DetailedBillingReport /></ProtectedRoute>
      },
      {
        path: 'billing/expense-manager',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><ExpenseManager /></ProtectedRoute>
      },
      {
        path: 'billing/financial-report',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><StandardFinancialReport /></ProtectedRoute>
      },
      {
        path: 'billing/item-revenue-report',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><ItemRevenueReport /></ProtectedRoute>
      },
      {
        path: 'billing/patient-demographics',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><BillingPatientDemographics /></ProtectedRoute>
      },
      {
        path: 'nurse',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><NurseDashboard /></ProtectedRoute>
      },
      {
        path: 'nurse/tasks',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><NurseTasksNew /></ProtectedRoute>
      },
      {
        path: 'ward',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}><ModernWardDashboard /></ProtectedRoute>
      },
      {
        path: 'ward/ipd',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}><IPDManagement /></ProtectedRoute>
      },
      {
        path: 'ward/vitals',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><VitalsPage /></ProtectedRoute>
      },
      {
        path: 'ward/medications-backup',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><MedicationsPage /></ProtectedRoute>
      },
      {
        path: 'ward/injection',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><InjectionDashboard /></ProtectedRoute>
      },
      {
        path: 'ward/blood-pressure',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><BloodPressure /></ProtectedRoute>
      },
      {
        path: 'ward/dash-diet',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><DashDiet /></ProtectedRoute>
      },
      {
        path: 'procedures',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse']}><Procedures /></ProtectedRoute>
      },
      {
        path: 'nurse/monthly-report',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}><MonthlyReportPage /></ProtectedRoute>
      },
      {
        path: 'reception',
        element: <ProtectedRoute allowedRoles={['admin', 'receptionist', 'reception']}><ReceptionDashboard /></ProtectedRoute>
      },
      {
        path: 'reception/register',
        element: <ProtectedRoute allowedRoles={['admin', 'receptionist', 'reception']}><RegisterPatient /></ProtectedRoute>
      },
      {
        path: 'reception/service-request',
        element: <ProtectedRoute allowedRoles={['admin', 'receptionist', 'reception']}><ServiceRequestForm /></ProtectedRoute>
      },
      {
        path: 'doctor',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><DoctorDashboard /></ProtectedRoute>
      },
      {
        path: 'doctor/dashboard',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><DoctorDashboard /></ProtectedRoute>
      },
      {
        path: 'doctor/patients',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><MyPatients /></ProtectedRoute>
      },
      {
        path: 'doctor/consultations',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><Consultations /></ProtectedRoute>
      },
      {
        path: 'doctor/consultation/:patientId',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><EnhancedConsultationForm /></ProtectedRoute>
      },
      {
        path: 'doctor/appointments',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><DoctorAppointments /></ProtectedRoute>
      },
      {
        path: 'doctor/emr-prescriptions',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><EMRPrescriptions /></ProtectedRoute>
      },
      {
        path: 'doctor/medical-certificates',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><MedicalCertificates /></ProtectedRoute>
      },
      {
        path: 'doctor/emr-referral',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><EMRReferralPaper /></ProtectedRoute>
      },
      {
        path: 'doctor/medical-test-requests',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><MedicalTestRequestForm /></ProtectedRoute>
      },
      {
        path: 'depo-injections',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}><DepoInjectionManagement /></ProtectedRoute>
      },
      {
        path: 'imaging',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'imaging', 'lab_technician']}><MahletImagingDashboard /></ProtectedRoute>
      },
      {
        path: 'imaging/dashboard',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'imaging', 'lab_technician']}><MahletImagingDashboard /></ProtectedRoute>
      },
      {
        path: 'admin',
        element: <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
      },
      {
        path: 'system-controls',
        element: <ProtectedRoute allowedRoles={['admin']}><SystemControls /></ProtectedRoute>
      },
      {
        path: 'staff-attendance-control',
        element: <ProtectedRoute allowedRoles={['admin']}><StaffAttendanceControlPage /></ProtectedRoute>
      },
      {
        path: 'inventory',
        element: <ProtectedRoute allowedRoles={['admin']}><StockManagement /></ProtectedRoute>
      },
      {
        path: 'inventory/dashboard',
        element: <ProtectedRoute allowedRoles={['admin']}><InventoryDashboard /></ProtectedRoute>
      },
      {
        path: 'inventory/new-item',
        element: <ProtectedRoute allowedRoles={['admin']}><NewInventoryItemForm /></ProtectedRoute>
      },
      {
        path: 'inventory/edit/:id',
        element: <ProtectedRoute allowedRoles={['admin']}><NewInventoryItemForm /></ProtectedRoute>
      },
      {
        path: 'facility',
        element: <ProtectedRoute allowedRoles={['admin']}><FacilityDashboard /></ProtectedRoute>
      },
      {
        path: 'settings',
        element: <ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>
      },
      {
        path: 'theme-settings',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'lab', 'finance']}><ThemeSettings /></ProtectedRoute>
      },
      {
        path: 'profile',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance', 'lab', 'imaging']}><Profile /></ProtectedRoute>
      },
      {
        path: 'patient-services',
        element: <ProtectedRoute allowedRoles={['admin', 'reception', 'nurse', 'doctor']}><PatientServicesHub /></ProtectedRoute>
      },
      {
        path: 'data-share',
        element: <ProtectedRoute allowedRoles={['admin']}><DataSharePage /></ProtectedRoute>
      },
      {
        path: 'reports',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance']}><ReportsDashboard /></ProtectedRoute>
      },
      {
        path: 'reports/workload',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception', 'finance', 'lab', 'imaging']}><WorkloadAnalytics /></ProtectedRoute>
      },
      {
        path: 'patient-reports',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'reception']}><PatientReports /></ProtectedRoute>
      },
      {
        path: 'weekly-diseases-report',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}><WeeklyDiseasesReportPage /></ProtectedRoute>
      },
      {
        path: 'patient-card-settings',
        element: <ProtectedRoute allowedRoles={['admin', 'finance']}><PatientCardSettings /></ProtectedRoute>
      },
      {
        path: 'staff-management',
        element: <ProtectedRoute allowedRoles={['admin']}><StaffManagement /></ProtectedRoute>
      },
      {
        path: 'staff-control',
        element: <ProtectedRoute allowedRoles={['admin']}><StaffControlCenter /></ProtectedRoute>
      },
      {
        path: 'leave-request',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'lab', 'imaging', 'reception']}><LeaveRequest /></ProtectedRoute>
      },
      {
        path: 'pharmacy',
        element: <ProtectedRoute allowedRoles={['admin']}><StockManagement /></ProtectedRoute>
      },
      {
        path: 'services',
        element: <ProtectedRoute allowedRoles={['admin']}><ServiceManagement /></ProtectedRoute>
      },
      {
        path: 'medical-record-demo',
        element: <ProtectedRoute allowedRoles={['admin', 'doctor']}><MedicalRecordDemo /></ProtectedRoute>
      },
      {
        path: 'auth-test',
        element: <AuthTest />
      },
      {
        path: 'ui-showcase',
        element: <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}><UIShowcasePage /></ProtectedRoute>
      },
      // Lab routes
      {
        path: 'lab',
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><LabDashboard /></ProtectedRoute>
      },
      {
        path: 'lab/new-test',
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><EnterTestResults /></ProtectedRoute>
      },
      {
        path: 'lab/results', 
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><ViewResults /></ProtectedRoute>
      },
      {
        path: 'lab/results/search', 
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><ViewResults /></ProtectedRoute>
      },
      {
        path: 'lab/service-results',
        element: <ProtectedRoute allowedRoles={['admin', 'lab_technician', 'lab']}><ServiceResults /></ProtectedRoute>
      }
    ]
  }
]);

export default router; 
