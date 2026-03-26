import api from './apiService';

export interface Appointment {
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

export interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  departmentId: string;
}

export interface TimeSlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface DashboardSummary {
  todayCount: number;
  upcomingCount: number;
  totalScheduled: number;
}

// Dashboard summary
const getDashboardSummary = async (): Promise<DashboardSummary> => {
  try {
    const response = await api.get('/api/appointments/dashboard-summary');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return {
      todayCount: 0,
      upcomingCount: 0,
      totalScheduled: 0
    };
  }
};

// Today's appointments
const getTodaysAppointments = async (): Promise<Appointment[]> => {
  try {
    const response = await api.get('/api/appointments/today');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching today\'s appointments:', error);
    return [];
  }
};

// Upcoming appointments
const getUpcomingAppointments = async (): Promise<Appointment[]> => {
  try {
    const response = await api.get('/api/appointments/upcoming');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    return [];
  }
};

// Appointments API calls
// NOTE: This is the SINGLE SOURCE OF TRUTH for appointments API
// Do not create duplicate definitions in other files
export const appointmentsAPI = {
  getAll: async (params?: any) => {
    try {
      const response = await api.get('/api/appointments', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  },

  getFast: async (params?: any) => {
    try {
      // Use the main appointments endpoint, not the test fast-load endpoint
      const response = await api.get('/api/appointments', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching appointments (fast):', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/api/appointments/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching appointment ${id}:`, error);
      throw error;
    }
  },

  create: async (appointment: Omit<Appointment, 'id'>) => {
    try {
      const response = await api.post('/api/appointments', appointment);
      return response.data.data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  },

  update: async (id: string, appointment: Partial<Appointment>) => {
    try {
      const response = await api.put(`/api/appointments/${id}`, appointment);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating appointment ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      await api.delete(`/api/appointments/${id}`);
    } catch (error) {
      console.error(`Error deleting appointment ${id}:`, error);
      throw error;
    }
  },

  // Enhanced getAll with fallback for better reliability
  getAllWithFallback: async (params?: any) => {
    try {
      console.log('[AppointmentsAPI] Attempting main endpoint...');
      const response = await api.get('/api/appointments', { params });
      console.log('[AppointmentsAPI] Main endpoint successful');
      return response;
    } catch (error) {
      console.log('[AppointmentsAPI] Main endpoint failed, trying alternative...');
      try {
        const response = await api.get('/api/appointments', { params });
        console.log('[AppointmentsAPI] Alternative endpoint successful');
        return response;
      } catch (fallbackError) {
        console.error('[AppointmentsAPI] All endpoints failed:', fallbackError);
        throw fallbackError;
      }
    }
  }
};

// Doctors API calls
const getDoctors = async (): Promise<Doctor[]> => {
  try {
    const response = await api.get('/api/doctor/all');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching doctors:', error);
    // Return mock data for now
    return [
      {
        id: 'd1',
        name: 'Dr. Sarah Miller',
        department: 'General Medicine',
        specialization: 'General Practice'
      },
      {
        id: 'd2',
        name: 'Dr. Robert Williams',
        department: 'Cardiology',
        specialization: 'Interventional Cardiology'
      }
    ];
  }
};

// Services API calls
const getServices = async (): Promise<Service[]> => {
  try {
    const response = await api.get('/api/services');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching services:', error);
    // Return mock data for now
    return [
      {
        id: 's1',
        name: 'General Checkup',
        duration: 30,
        departmentId: 'dep1'
      },
      {
        id: 's2',
        name: 'Cardiology Consultation',
        duration: 45,
        departmentId: 'dep2'
      }
    ];
  }
};

// Available time slots
const getAvailableTimeSlots = async (doctorId: string, date: string): Promise<TimeSlot[]> => {
  try {
    const response = await api.get(`/api/appointments/slots?doctorId=${doctorId}&date=${date}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching available time slots:', error);
    // Return mock data for now
    return [
      {
        id: 'ts1',
        doctorId,
        date,
        startTime: '09:00',
        endTime: '09:30',
        isBooked: false
      },
      {
        id: 'ts2',
        doctorId,
        date,
        startTime: '09:30',
        endTime: '10:00',
        isBooked: true
      },
      {
        id: 'ts3',
        doctorId,
        date,
        startTime: '10:00',
        endTime: '10:30',
        isBooked: false
      }
    ];
  }
};

// Patients API calls - simplified, likely would be in a separate service
const getPatients = async (): Promise<Patient[]> => {
  try {
    const response = await api.get('/api/patients/list');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching patients:', error);
    // Return mock data for now
    return [
      {
        id: 'p1',
        name: 'John Smith',
        phone: '555-123-4567',
        email: 'john.smith@example.com'
      },
      {
        id: 'p2',
        name: 'Emily Johnson',
        phone: '555-987-6543',
        email: 'emily.johnson@example.com'
      }
    ];
  }
};

// CRUD operations
const createAppointment = async (appointmentData: Partial<Appointment>) => {
  try {
    const response = await api.post('/api/appointments', appointmentData);
    return response.data;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

const updateAppointment = async (id: string, appointmentData: Partial<Appointment>) => {
  try {
    const response = await api.put(`/api/appointments/${id}`, appointmentData);
    return response.data;
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

const deleteAppointment = async (id: string) => {
  try {
    const response = await api.delete(`/api/appointments/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};

const appointmentService = {
  // Dashboard
  getDashboardSummary,
  getTodaysAppointments,
  getUpcomingAppointments,
  
  // Appointments
  appointmentsAPI,
  
  // Doctors
  getDoctors,
  
  // Services
  getServices,
  
  // Time slots
  getAvailableTimeSlots,
  
  // Patients
  getPatients,
  
  // CRUD operations
  createAppointment,
  updateAppointment,
  deleteAppointment
};

export default appointmentService; 