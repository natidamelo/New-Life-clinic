import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  PlusIcon, 
  CalendarIcon as CalendarOutlineIcon,
  ClockIcon,
  TrashIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { toast } from 'react-hot-toast';
import { appointmentsAPI } from '../services/api';
import patientService, { Patient } from '../services/patientService';
import userService from '../services/userService';
import AppointmentCheckInModal from '../components/AppointmentCheckInModal';
import SharedAppointmentForm from '../components/SharedAppointmentForm';
import api from '../services/apiService';

const safeArray = <T,>(data: T[] | null | undefined): T[] => {
  return Array.isArray(data) ? data : [];
};

interface Appointment {
  id: string;
  _id?: string;
  patient?: Patient;
  doctor?: Doctor;
  patientId?: string | Patient;
  doctorId?: string | Doctor;
  patientName?: string;
  doctorName?: string;
  appointmentDateTime: string;
  durationMinutes?: number;
  duration?: number;
  reason?: string;
  type: string;
  status: string;
  notes?: string;
  selectedLabService?: {
    _id: string;
    name: string;
    price: number;
    category: string;
    description?: string;
  };
  selectedImagingService?: {
    _id: string;
    name: string;
    price: number;
    category: string;
    description?: string;
  };
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

const appointmentTypes = [
  { value: 'checkup', label: 'Check-up' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'lab-test', label: 'Lab Test Request' },
  { value: 'imaging', label: 'Imaging Request' },
  { value: 'procedure', label: 'Procedure' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  'Scheduled':   { label: 'Scheduled',   className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  'Checked In':  { label: 'Checked In',  className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  'Completed':   { label: 'Completed',   className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  'Cancelled':   { label: 'Cancelled',   className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  'No Show':     { label: 'No Show',     className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' },
};

const TYPE_CONFIG: Record<string, string> = {
  'checkup':      'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  'Check-up':     'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  'consultation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Consultation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'follow-up':    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Follow-up':    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'emergency':    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'Emergency':    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'lab-test':     'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'imaging':      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'procedure':    'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const className = TYPE_CONFIG[type] || 'bg-gray-100 text-gray-700';
  const label = appointmentTypes.find(t => t.value === type)?.label || type;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
};

const Appointments: React.FC = () => {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter/search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'all'>('all');

  // Edit form state
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const passedPatientId = location.state?.patientId;

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await appointmentsAPI.getFast({ limit: 999 });
      let appointmentsData: Appointment[] = [];

      if (response.data && Array.isArray(response.data)) {
        appointmentsData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        appointmentsData = response.data.data;
      } else if (response.data?.data?.appointments && Array.isArray(response.data.data.appointments)) {
        appointmentsData = response.data.data.appointments;
      } else if (response.data?.appointments && Array.isArray(response.data.appointments)) {
        appointmentsData = response.data.appointments;
      }

      setAppointments(appointmentsData);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments.');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPatientName = (appt: Appointment) => {
    if (appt.patientName) return appt.patientName;
    if (typeof appt.patientId === 'object' && appt.patientId) {
      return `${(appt.patientId as any).firstName || ''} ${(appt.patientId as any).lastName || ''}`.trim();
    }
    return 'Unknown Patient';
  };

  const getDoctorName = (appt: Appointment) => {
    if (appt.doctorName) return appt.doctorName;
    if (typeof appt.doctorId === 'object' && appt.doctorId) {
      return `Dr. ${(appt.doctorId as any).firstName || ''} ${(appt.doctorId as any).lastName || ''}`.trim();
    }
    return 'Unassigned';
  };

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      const today = new Date();
      const apptDate = new Date(appt.appointmentDateTime);

      // Date filter
      if (dateFilter === 'today') {
        if (apptDate.toDateString() !== today.toDateString()) return false;
      } else if (dateFilter === 'upcoming') {
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const apptStart = new Date(apptDate);
        apptStart.setHours(0, 0, 0, 0);
        if (apptStart <= todayStart) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && appt.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== 'all' && appt.type !== typeFilter) return false;

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const patientName = getPatientName(appt).toLowerCase();
        const doctorName = getDoctorName(appt).toLowerCase();
        const reason = (appt.reason || '').toLowerCase();
        if (!patientName.includes(term) && !doctorName.includes(term) && !reason.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, searchTerm, statusFilter, typeFilter, dateFilter]);

  const todaysCount = appointments.filter(appt => {
    const today = new Date();
    return new Date(appt.appointmentDateTime).toDateString() === today.toDateString();
  }).length;

  const upcomingCount = appointments.filter(appt => {
    const today = new Date();
    const apptDate = new Date(appt.appointmentDateTime);
    today.setHours(0, 0, 0, 0);
    apptDate.setHours(0, 0, 0, 0);
    return apptDate > today;
  }).length;

  const completedCount = appointments.filter(a => a.status === 'Completed').length;
  const scheduledCount = appointments.filter(a => a.status === 'Scheduled').length;

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await appointmentsAPI.delete(appointmentId);
      toast.success('Appointment deleted successfully!');
      setAppointments(prev => prev.filter(appt => (appt._id || appt.id) !== appointmentId));
    } catch (error: any) {
      if (error?.status !== 404) {
        toast.error(`Deletion failed: ${error.message || 'Unknown error'}`);
      } else {
        setAppointments(prev => prev.filter(appt => (appt._id || appt.id) !== appointmentId));
      }
    }
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      await api.put(`/api/appointments/${appointmentId}`, { status: newStatus });
      toast.success(`Appointment marked as ${newStatus}`);
      setAppointments(prev =>
        prev.map(appt =>
          (appt._id || appt.id) === appointmentId ? { ...appt, status: newStatus } : appt
        )
      );
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenEditModal = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setEditStatus(appt.status);
    setEditNotes(appt.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAppointment) return;
    const id = selectedAppointment._id || selectedAppointment.id;
    setIsUpdating(true);
    try {
      await api.put(`/api/appointments/${id}`, { status: editStatus, notes: editNotes });
      toast.success('Appointment updated successfully!');
      setAppointments(prev =>
        prev.map(appt =>
          (appt._id || appt.id) === id ? { ...appt, status: editStatus, notes: editNotes } : appt
        )
      );
      setIsEditModalOpen(false);
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCheckInAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsCheckInModalOpen(true);
  };

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsViewModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and track all patient appointments</p>
        </div>
        <Button onClick={() => setIsScheduleModalOpen(true)} className="gap-2 w-full sm:w-auto">
          <PlusIcon className="w-4 h-4" />
          Schedule Appointment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDateFilter('today')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Schedule</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{todaysCount}</h3>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <CalendarOutlineIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDateFilter('upcoming')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{upcomingCount}</h3>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                <ClockIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Scheduled')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{scheduledCount}</h3>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full">
                <CalendarOutlineIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Completed')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{completedCount}</h3>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patient, doctor, reason..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date filter */}
            <div className="flex gap-1 bg-secondary rounded-lg p-1">
              {(['all', 'today', 'upcoming'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === f
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? 'All Dates' : f === 'today' ? 'Today' : 'Upcoming'}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="all">All Statuses</option>
              {Object.keys(STATUS_CONFIG).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="all">All Types</option>
              {appointmentTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Clear filters */}
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setDateFilter('all');
                }}
                className="text-muted-foreground"
              >
                <XCircleIcon className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>
              {dateFilter === 'today' ? "Today's Schedule" : dateFilter === 'upcoming' ? 'Upcoming Appointments' : 'All Appointments'}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-lg overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold">Patient</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Doctor</TableHead>
                  <TableHead className="font-semibold">Reason</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        <span className="text-muted-foreground">Loading appointments...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarOutlineIcon className="w-10 h-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground font-medium">No appointments found</p>
                        <p className="text-muted-foreground text-sm">Try adjusting your filters or schedule a new appointment</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments
                    .sort((a, b) => new Date(b.appointmentDateTime).getTime() - new Date(a.appointmentDateTime).getTime())
                    .map(appt => {
                      const apptId = appt._id || appt.id;
                      const apptDate = new Date(appt.appointmentDateTime);
                      const isToday = apptDate.toDateString() === new Date().toDateString();
                      return (
                        <TableRow key={apptId} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                                {isToday ? 'Today' : apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-sm">{getPatientName(appt)}</span>
                          </TableCell>
                          <TableCell>
                            <TypeBadge type={appt.type} />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{getDoctorName(appt)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground truncate max-w-[140px] block">
                              {appt.reason || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={appt.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => handleViewAppointment(appt)}
                                title="View Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>

                              {/* Check In */}
                              {appt.status === 'Scheduled' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleCheckInAppointment(appt)}
                                  title="Check In"
                                >
                                  <CheckCircleIcon className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Mark Complete */}
                              {(appt.status === 'Checked In') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleUpdateStatus(apptId, 'Completed')}
                                  title="Mark as Completed"
                                  disabled={isUpdating}
                                >
                                  <CheckCircleIcon className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Edit */}
                              {(appt.status === 'Scheduled' || appt.status === 'Checked In') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenEditModal(appt)}
                                  title="Edit Appointment"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Cancel */}
                              {(appt.status === 'Scheduled') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                  onClick={() => handleUpdateStatus(apptId, 'Cancelled')}
                                  title="Cancel Appointment"
                                  disabled={isUpdating}
                                >
                                  <XCircleIcon className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteAppointment(apptId)}
                                title="Delete Appointment"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Modal */}
      <SharedAppointmentForm
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={() => { fetchAppointments(); setIsScheduleModalOpen(false); }}
        initialPatientId={passedPatientId}
      />

      {/* Check-in Modal */}
      <AppointmentCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        appointment={selectedAppointment as any}
        onCheckInSuccess={() => fetchAppointments()}
      />

      {/* View Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Patient</Label>
                  <p className="font-medium mt-1">{getPatientName(selectedAppointment)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Doctor</Label>
                  <p className="font-medium mt-1">{getDoctorName(selectedAppointment)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date & Time</Label>
                  <p className="font-medium mt-1">
                    {new Date(selectedAppointment.appointmentDateTime).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedAppointment.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Duration</Label>
                  <p className="font-medium mt-1">{selectedAppointment.durationMinutes || selectedAppointment.duration || 30} minutes</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
                  <div className="mt-1"><TypeBadge type={selectedAppointment.type} /></div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                  <div className="mt-1"><StatusBadge status={selectedAppointment.status} /></div>
                </div>
              </div>
              {selectedAppointment.reason && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reason</Label>
                  <p className="mt-1 text-sm">{selectedAppointment.reason}</p>
                </div>
              )}
              {selectedAppointment.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedAppointment.notes}</p>
                </div>
              )}
              {selectedAppointment.selectedLabService && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Lab Service</Label>
                  <p className="mt-1 text-sm">{selectedAppointment.selectedLabService.name} — {selectedAppointment.selectedLabService.price} ETB</p>
                </div>
              )}
              {selectedAppointment.selectedImagingService && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Imaging Service</Label>
                  <p className="mt-1 text-sm">{selectedAppointment.selectedImagingService.name} — {selectedAppointment.selectedImagingService.price} ETB</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            {selectedAppointment && (selectedAppointment.status === 'Scheduled' || selectedAppointment.status === 'Checked In') && (
              <Button onClick={() => { setIsViewModalOpen(false); handleOpenEditModal(selectedAppointment); }}>
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Patient</Label>
                <p className="text-muted-foreground text-sm mt-1">{getPatientName(selectedAppointment)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Date & Time</Label>
                <p className="text-muted-foreground text-sm mt-1">
                  {new Date(selectedAppointment.appointmentDateTime).toLocaleString()}
                </p>
              </div>
              <div>
                <Label htmlFor="edit-status" className="text-sm font-medium">Status</Label>
                <select
                  id="edit-status"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {Object.keys(STATUS_CONFIG).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-notes" className="text-sm font-medium">Notes</Label>
                <textarea
                  id="edit-notes"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Appointments;
