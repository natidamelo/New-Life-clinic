import React, { useState, useEffect } from 'react';
import Table from '../Table';
import Button from '../Button';
import Spinner from '../Spinner';

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  reason: string;
}

const AppointmentList: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  const handleView = (id: string) => {
    // Implement view functionality
    console.log('View appointment:', id);
  };

  const handleEdit = (id: string) => {
    // Implement edit functionality
    console.log('Edit appointment:', id);
  };

  const handleCancel = (id: string) => {
    // Implement cancel functionality
    console.log('Cancel appointment:', id);
  };

  const getStatusBadgeColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-primary/20 text-primary';
      case 'completed':
        return 'bg-primary/20 text-primary';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  const columns = [
    { 
      header: 'Patient',
      accessor: (appointment: Appointment) => (
        <div 
          className="cursor-pointer hover:text-primary"
          onClick={() => handleView(appointment.id)}
        >
          {appointment.patientName}
        </div>
      )
    },
    { header: 'Doctor', accessor: 'doctorName' as keyof Appointment },
    { header: 'Date', accessor: 'date' as keyof Appointment },
    { header: 'Time', accessor: 'time' as keyof Appointment },
    {
      header: 'Status',
      accessor: (appointment: Appointment) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(appointment.status)}`}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
      )
    },
    { header: 'Reason', accessor: 'reason' as keyof Appointment },
    {
      header: 'Actions',
      accessor: (appointment: Appointment) => (
        <div className="flex space-x-2">
          <Button variant="primary" size="sm" onClick={() => handleView(appointment.id)}>
            View
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleEdit(appointment.id)}>
            Edit
          </Button>
          {appointment.status === 'scheduled' && (
            <Button variant="danger" size="sm" onClick={() => handleCancel(appointment.id)}>
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Appointments</h2>
        <Button variant="primary" onClick={() => console.log('Add new appointment')}>
          New Appointment
        </Button>
      </div>
      <Table
        data={appointments}
        columns={columns}
      />
    </div>
  );
};

export default AppointmentList; 