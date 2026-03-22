import React, { useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import { Tab as HeadlessTab } from '@headlessui/react';
import {
  Assignment as AssignmentIcon,
  Science as ScienceIcon,
  CameraAlt as CameraIcon,
  Favorite as HeartIcon,
  Person as UserIcon,
  CalendarMonth as CalendarIcon,
  Notifications as BellIcon,
  Settings as CogIcon,
  Description as DocumentTextIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as XCircleIcon,
  Search as MagnifyingGlassIcon,
  KeyboardArrowDown as ChevronDownIcon,
  Add as PlusIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  LocalHospital as LocalHospitalIcon,
  History as HistoryIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { Grid, Card, CardContent, Box, Avatar, Typography, CardHeader, Chip, Tabs, Tab, Dialog, DialogTitle, DialogContent } from '@mui/material';

// Import components
import LaboratoryTests from './LaboratoryTests';
import Imaging from './Imaging';
import Prescriptions from './Prescriptions';
import VitalSigns from './VitalSigns';
import MedicalRecordSection from './MedicalRecordSection';
import ClinicalDecisionSupport from './ClinicalDecisionSupport';
import ProfessionalPrescriptionForm from './ProfessionalPrescriptionForm';
import LaboratoryRequestForm from './LaboratoryRequestForm';
import HistoryTakingForm from './HistoryTakingForm';
import { formatDateTime } from '../../utils/formatters';
import EnhancedMedicalRecordForm from './nextgen/EnhancedMedicalRecordForm';
import MedicalRecordHistory from './nextgen/MedicalRecordHistory';
import PatientList from './PatientList';

// Import services
import doctorService from '../../services/doctorService';
import patientService, { Patient } from '../../services/patientService';
import { useAuth } from '../../context/AuthContext';

// Import UI components
import { Button } from '../../components/ui/button';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// Types
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  type: 'New Patient' | 'Follow-up' | 'Consultation' | 'Check-up' | 'Emergency';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  notes?: string;
  duration: number; // in minutes
}

interface DashboardStats {
  patientsToday: number;
  pendingReports: number;
  completedAppointments: number;
  labResults: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  date: string;
  read: boolean;
}

interface TabItem {
  name: string;
  icon: any;
  component: React.ComponentType<any>;
}

const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    patientsToday: 0,
    pendingReports: 0,
    completedAppointments: 0,
    labResults: 0
  });
  const [selectedPatientForAction, setSelectedPatientForAction] = useState<Patient | null>(null);
  const [filterTerm, setFilterTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showHistoryTakingForm, setShowHistoryTakingForm] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<string | null>(null);
  const [recordMode, setRecordMode] = useState<'create' | 'edit' | 'view'>('create');

  // States for medical record management
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [showPatientHistory, setShowPatientHistory] = useState(false);

  console.log('[Render] showHistoryTakingForm:', showHistoryTakingForm, 'selectedPatient:', selectedPatient);

  // Fetch patients & dashboard stats
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch patients
        const patientsResponse = await patientService.getAllPatients(false, false);
        
        // Add sample vitals for demonstration (you can remove this when real vitals are available)
        const patientsWithVitals = patientsResponse.data.patients.map((patient: any, index: number) => ({
          ...patient,
          nurseName: index === 0 ? 'Semhal Melaku' : ['Fatima Ahmed', 'Rahel Tesfaye', 'Meron Bekele'][index % 3],
          lastUpdate: new Date().toISOString(),
          vitals: {
            temperature: index === 0 ? '40°C' : `${36.5 + (index % 3)}°C`,
            heartRate: index === 0 ? '75 bpm' : `${70 + (index % 20)} bpm`,
            bloodPressure: index === 0 ? '120/90' : `${110 + (index % 20)}/${70 + (index % 15)}`,
            respiratoryRate: index === 0 ? '16/min' : `${14 + (index % 6)}/min`,
            oxygenSaturation: index === 0 ? '98%' : `${96 + (index % 4)}%`
          }
        }));
        
        setPatients(patientsWithVitals); 

        // Fetch dashboard stats
        const stats = await doctorService.getDashboardStats();
        setDashboardStats(stats);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Check for patient updates from admin dashboard every 30 seconds instead of 5
    const checkPatientUpdatesInterval = setInterval(() => {
      const lastUpdatedAt = localStorage.getItem('patientsLastUpdatedAt');
      if (lastUpdatedAt && parseInt(lastUpdatedAt) > Date.now() - 60000) { // Only refresh if update was in last 60 seconds
        console.log('Patient data was updated in admin dashboard, refreshing data...');
        fetchData();
        localStorage.removeItem('patientsLastUpdatedAt'); // Clear the marker after refreshing
      }
    }, 30000); // Changed from 5000 to 30000 (30 seconds)

    return () => {
      clearInterval(checkPatientUpdatesInterval);
    };
  }, []);

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/notifications');
        setNotifications(response.data || []); 
        return response.data;
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Return demo data or empty array on error
        const demoData = [
          { 
            id: '1', 
            title: 'New Lab Results', 
            message: 'Lab results for John Doe are now available', 
            type: 'info', 
            date: '2023-05-15T10:30:00', 
            read: false 
          },
          { 
            id: '2', 
            title: 'Appointment Reminder', 
            message: 'You have an appointment with Sarah Johnson tomorrow at 10:30 AM', 
            type: 'warning', 
            date: '2023-05-14T15:45:00', 
            read: false 
          }
        ];
        setNotifications(demoData);
        return demoData;
      }
    },
  });

  // Event handlers
  const handlePatientSelect = (patientId: string) => {
    setSelectedPatient(patients.find(p => p._id === patientId) || null);
    const patient = patients.find(p => p.id === patientId) || null;
    setSelectedPatientForAction(patient);
  };

  const handleMarkNotificationAsRead = (notificationId: string) => {
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'waiting':
      case 'scheduled':
        return 'bg-accent/20 text-accent-foreground';
      case 'in progress':
      case 'in-progress':
        return 'bg-primary/20 text-primary';
      case 'completed':
        return 'bg-primary/20 text-primary';
      case 'cancelled':
      case 'no show':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Define tabs
  const tabs: TabItem[] = [
    {
      name: 'Medical Records',
      icon: DocumentTextIcon,
      component: MedicalRecordSection
    },
    { 
      name: 'Vital Signs', 
      icon: HeartIcon, 
      component: VitalSigns 
    },
    { 
      name: 'Prescriptions', 
      icon: AssignmentIcon, 
      component: Prescriptions 
    },
    {
      name: 'Laboratory Tests',
      icon: ScienceIcon,
      component: LaboratoryTests
    },
    {
      name: 'Imaging',
      icon: CameraIcon,
      component: Imaging
    },
    {
      name: 'Decision Support', 
      icon: AssignmentIcon,
      component: ClinicalDecisionSupport
    },
    {
      name: 'Medical History',
      icon: HistoryIcon,
      component: MedicalRecordSection
    }
  ];

  // Filter patients
  const filteredPatients = patients.filter(patient => 
    (patient.firstName + ' ' + patient.lastName).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count unread notifications
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Dialog logs (should be outside JSX)
  if (showHistoryTakingForm) {
    console.log('[Render Logic] Dialog should render. Open state:', showHistoryTakingForm);
    console.log('[Render Logic] DialogContent should render. Selected patient:', selectedPatient);
  }

  const getTabContent = () => {
    switch (activeTab) {
      case 0: // Patient Queue
  return (
          <Grid container spacing={3}>
            {/* Queue Stats */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <PeopleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{patients.length}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Patients
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <ScheduleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {patients.filter(p => p.status === 'waiting').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Waiting
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {patients.filter(p => p.status === 'completed').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Completed
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'error.main' }}>
                      <LocalHospitalIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {patients.filter(p => p.priority === 'urgent').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Urgent
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Patient List */}
            <Grid size={12}>
              <PatientList 
                patients={filteredPatients as any} 
                onSelectPatient={handlePatientSelect}
                selectedPatient={selectedPatient?._id || selectedPatient?.id || ''}
              />
            </Grid>
          </Grid>
        );

      case 1: // Today's Appointments
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card>
                <CardHeader 
                  title="Today's Appointments"
                  subheader={new Date().toLocaleDateString()}
                />
                <CardContent>
                  <Typography variant="body1">
                    Appointment schedule coming soon...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 2: // Emergency Queue
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card>
                <CardHeader 
                  title="Emergency Queue"
                  action={
                    <Chip 
                      label={`${patients.filter(p => p.priority === 'urgent').length} urgent cases`}
                      color="error"
                    />
                  }
                />
                <CardContent>
                  <PatientList 
                    patients={patients.filter(p => p.priority === 'urgent') as any} 
                    onSelectPatient={handlePatientSelect}
                    selectedPatient={selectedPatient?._id || selectedPatient?.id || ''}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 3: // Medical History
        return (
          <Box sx={{ height: 'calc(100vh - 200px)' }}>
            <MedicalRecordHistory
              onRecordSelect={(record) => {
                console.log('Selected record for viewing:', record);
                // Optionally open a view dialog or navigate to record details
              }}
              onEditRecord={(recordId) => {
                console.log('Edit record:', recordId);
                setRecordToEdit(recordId);
                setRecordMode('edit');
                setRecordDialogOpen(true);
              }}
            />
          </Box>
        );

      case 4: // My Performance
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card>
                <CardHeader title="Performance Dashboard" />
                <CardContent>
                  <Typography variant="body1">
                    Performance metrics coming soon...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return <Typography>Select a tab</Typography>;
    }
  };

  return (
    <>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Doctor Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome, Dr. {user?.name}. Here's your overview for today.
          </Typography>
        </Box>

        {/* Tabs Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)}>
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={<tab.icon />}
                label={tab.name}
                iconPosition="start"
                sx={{ minHeight: 64 }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        {getTabContent()}
      </Box>

      {/* Medical Record Dialog */}
      <Dialog 
        open={recordDialogOpen} 
        onClose={() => {
          setRecordDialogOpen(false);
          setRecordToEdit(null);
          setRecordMode('create');
        }}
        maxWidth="xl"
        fullWidth
        sx={{ 
          '& .MuiDialog-paper': { 
            height: '95vh',
            maxHeight: '95vh'
          }
        }}
      >
        <EnhancedMedicalRecordForm
          patientId={selectedPatient?._id || selectedPatient?.id || ''}
          recordId={recordToEdit || undefined}
          mode={recordMode}
          patientData={selectedPatient}
          onSave={(record) => {
            console.log('Record saved:', record);
            setRecordDialogOpen(false);
            setRecordToEdit(null);
            setRecordMode('create');
            toast.success('Medical record saved successfully');
          }}
          onCancel={() => {
            setRecordDialogOpen(false);
            setRecordToEdit(null);
            setRecordMode('create');
          }}
        />
      </Dialog>

      {/* History Taking Form Dialog (Keep existing functionality) */}
      {showHistoryTakingForm && selectedPatient && (
        <Dialog 
          open={showHistoryTakingForm} 
          onClose={() => setShowHistoryTakingForm(false)}
          maxWidth="lg"
          fullWidth
          sx={{ 
            '& .MuiDialog-paper': { 
              height: '90vh',
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle>
            History Taking - {selectedPatient?.firstName} {selectedPatient?.lastName}
          </DialogTitle>
          <DialogContent dividers>
          <HistoryTakingForm
              patientId={selectedPatient?._id || selectedPatient?.id || ''}
              onSave={() => {
                console.log('History data saved successfully');
              setShowHistoryTakingForm(false);
                toast.success('History data saved successfully');
            }}
              onClose={() => setShowHistoryTakingForm(false)}
          />
        </DialogContent>
      </Dialog>
      )}
    </>
  );
};

export default DoctorDashboard; 