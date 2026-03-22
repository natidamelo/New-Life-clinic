import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Calendar } from '../../components/ui/calendar';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import appointmentService, { DashboardSummary } from '../../services/appointmentService';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  duration: number;
  service: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes: string;
  department: string;
}

interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  departmentId: string;
}

const AppointmentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    doctorId: '',
    doctorName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    duration: 30,
    service: '',
    status: 'scheduled',
    notes: '',
    department: ''
  });

  useEffect(() => {
    // Fetch dashboard data and appointments
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get dashboard summary
        const dashboardData = await appointmentService.getDashboardSummary();
        console.log('Dashboard data:', dashboardData);
        
        // Get today's appointments
        const todayAppointments = await appointmentService.getTodaysAppointments();
        
        // Get upcoming appointments
        const upcomingAppts = await appointmentService.getUpcomingAppointments();
        
        // Get doctor and service data for filters and forms
        const [doctorsData, servicesData, patientsData] = await Promise.all([
          appointmentService.getDoctors(),
          appointmentService.getServices(),
          appointmentService.getPatients()
        ]);
        
        setAppointments([...todayAppointments, ...upcomingAppts]);
        setDoctors(doctorsData);
        setPatients(patientsData);
        setServices(servicesData);
      } catch (error) {
        console.error('Error fetching appointment data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-populate related fields
    if (name === 'patientId') {
      const patient = patients.find(p => p.id === value);
      if (patient) {
        setFormData(prev => ({ ...prev, patientName: patient.name }));
      }
    } else if (name === 'doctorId') {
      const doctor = doctors.find(d => d.id === value);
      if (doctor) {
        setFormData(prev => ({ 
          ...prev, 
          doctorName: doctor.name,
          department: doctor.department
        }));
      }
    } else if (name === 'service') {
      const service = services.find(s => s.id === value);
      if (service) {
        setFormData(prev => ({ 
          ...prev, 
          duration: service.duration
        }));
      }
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
    }
  };

  const handleAddAppointment = async () => {
    try {
      // Create appointment via API
      const newAppointment = await appointmentService.createAppointment({
        patientId: formData.patientId,
        patientName: formData.patientName,
        doctorId: formData.doctorId,
        doctorName: formData.doctorName,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        service: formData.service,
        status: 'scheduled',
        notes: formData.notes,
        department: formData.department
      });
      
      setAppointments(prev => [...prev, newAppointment]);
      setIsAddDialogOpen(false);
      
      // Refresh dashboard data
      const dashboardData = await appointmentService.getDashboardSummary();
      console.log('Updated dashboard data:', dashboardData);
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment. Please try again.');
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      service: appointment.service,
      status: appointment.status,
      notes: appointment.notes,
      department: appointment.department
    });
    setSelectedDate(new Date(appointment.date));
    setIsEditDialogOpen(true);
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      // Update appointment via API
      const updatedAppointment = await appointmentService.updateAppointment(
        selectedAppointment.id,
        {
          patientId: formData.patientId,
          doctorId: formData.doctorId,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          service: formData.service,
          status: formData.status as any,
          notes: formData.notes,
          department: formData.department
        }
      );
      
      setAppointments(prev => 
        prev.map(app => app.id === selectedAppointment.id ? updatedAppointment : app)
      );
      setIsEditDialogOpen(false);
      
      // Refresh dashboard data
      const dashboardData = await appointmentService.getDashboardSummary();
      console.log('Updated dashboard data:', dashboardData);
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment. Please try again.');
    }
  };

  const handleDeleteConfirmation = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      // Delete/cancel appointment via API
      await appointmentService.deleteAppointment(selectedAppointment.id);
      
      setAppointments(prev => 
        prev.filter(app => app.id !== selectedAppointment.id)
      );
      setIsDeleteDialogOpen(false);
      
      // Refresh dashboard data
      const dashboardData = await appointmentService.getDashboardSummary();
      console.log('Updated dashboard data:', dashboardData);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      patientName: '',
      doctorId: '',
      doctorName: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      duration: 30,
      service: '',
      status: 'scheduled',
      notes: '',
      department: ''
    });
    setSelectedDate(new Date());
  };

  const statusColorMap: Record<string, string> = {
    scheduled: 'bg-primary/20 text-primary',
    completed: 'bg-primary/20 text-primary',
    cancelled: 'bg-destructive/20 text-destructive',
    'no-show': 'bg-accent/20 text-accent-foreground'
  };

  const filteredAppointments = appointments.filter(app => {
    if (activeTab === 'upcoming') {
      return ['scheduled'].includes(app.status);
    } else if (activeTab === 'completed') {
      return ['completed'].includes(app.status);
    } else if (activeTab === 'cancelled') {
      return ['cancelled', 'no-show'].includes(app.status);
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Appointment Management</h1>
        <Button onClick={() => {
          resetForm();
          setIsAddDialogOpen(true);
        }}>
          New Appointment
        </Button>
      </div>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled / No-Show</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card className="bg-primary-foreground">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map(appointment => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">{appointment.patientName}</TableCell>
                        <TableCell>{appointment.doctorName}</TableCell>
                        <TableCell>{appointment.department}</TableCell>
                        <TableCell>{`${appointment.date} ${appointment.time}`}</TableCell>
                        <TableCell>{appointment.service}</TableCell>
                        <TableCell>
                          <Badge className={statusColorMap[appointment.status] || 'bg-muted/20'}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditAppointment(appointment)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteConfirmation(appointment)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        No {activeTab} appointments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Appointment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientId">Patient</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('patientId', value)}
                  value={formData.patientId}
                >
                  <SelectTrigger id="patientId">
                    <SelectValue placeholder="Select Patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctorId">Doctor</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('doctorId', value)}
                  value={formData.doctorId}
                >
                  <SelectTrigger id="doctorId">
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(doctor => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="border rounded-md p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    className="w-full"
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Select
                    onValueChange={(value) => handleSelectChange('time', value)}
                    value={formData.time}
                  >
                    <SelectTrigger id="time">
                      <SelectValue placeholder="Select Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return [
                          <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </SelectItem>,
                          <SelectItem key={`${hour}:30`} value={`${hour}:30`}>
                            {`${hour}:30`}
                          </SelectItem>
                        ];
                      }).flat()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <Select
                    onValueChange={(value) => handleSelectChange('service', value)}
                    value={formData.service}
                  >
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Select Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.duration} mins)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={formData.duration.toString()}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes about the appointment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAppointment}>
              Create Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Same form fields as Add Dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-patientId">Patient</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('patientId', value)}
                  value={formData.patientId}
                >
                  <SelectTrigger id="edit-patientId">
                    <SelectValue placeholder="Select Patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-doctorId">Doctor</Label>
                <Select
                  onValueChange={(value) => handleSelectChange('doctorId', value)}
                  value={formData.doctorId}
                >
                  <SelectTrigger id="edit-doctorId">
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(doctor => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="border rounded-md p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    className="w-full"
                    initialFocus
                  />
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-2">
                  <Label htmlFor="edit-time">Time</Label>
                  <Select
                    onValueChange={(value) => handleSelectChange('time', value)}
                    value={formData.time}
                  >
                    <SelectTrigger id="edit-time">
                      <SelectValue placeholder="Select Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return [
                          <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </SelectItem>,
                          <SelectItem key={`${hour}:30`} value={`${hour}:30`}>
                            {`${hour}:30`}
                          </SelectItem>
                        ];
                      }).flat()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-service">Service</Label>
                  <Select
                    onValueChange={(value) => handleSelectChange('service', value)}
                    value={formData.service}
                  >
                    <SelectTrigger id="edit-service">
                      <SelectValue placeholder="Select Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.duration} mins)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    onValueChange={(value) => handleSelectChange('status', value)}
                    value={formData.status}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no-show">No-Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAppointment}>
              Update Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete/Cancel Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Cancellation</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to cancel the appointment for {selectedAppointment?.patientName} with {selectedAppointment?.doctorName} on {selectedAppointment?.date} at {selectedAppointment?.time}?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Go Back
            </Button>
            <Button variant="destructive" onClick={handleDeleteAppointment}>
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentManagement; 