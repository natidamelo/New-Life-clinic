import api from './apiService';
import { toast } from 'react-hot-toast';
import { User } from '../types'; // Assuming a User type/interface exists
// Use hardcoded API paths that match our Flask backend
const API_ADMIN_DASHBOARD_STATS = '/api/admin/dashboard/stats';
const API_ADMIN_DASHBOARD_REVENUE = '/api/admin/dashboard/revenue-chart';
const API_ADMIN_PATIENT_SERVICES = '/api/admin/patient-services';
const API_ADMIN_USERS = '/api/admin/users'; // Define API path for users

export interface AdminDashboardStats {
  totalPatients: number;
  totalAppointments: number;
  totalStaff: number;
  totalDepartments: number;
}

export interface BillingStats {
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  statusCounts: {
    pending: number;
    paid: number;
    partial: number;
    overdue: number;
    cancelled: number;
  }
}

export interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  itemsByCategory?: {
    medication: number;
    supplies: number;
    equipment: number;
    laboratory: number;
    office: number;
    other: number;
  }
}

export interface RevenueChartData {
  name: string;
  revenue: number;
}

export interface SystemHealth {
  status: string;
  database: {
    status: string;
    responseTime: string;
  };
  api: {
    status: string;
    uptime: string;
  };
  services: Array<{
    name: string;
    status: string;
  }>;
}

export interface PatientService {
  id: string;
  name: string;
  description: string;
  access: boolean;
  route: string;
  icon: string;
}

/**
 * Normalize various backend payload shapes into AdminDashboardStats
 */
const normalizeDashboardStats = (payload: any): AdminDashboardStats => {
  const data = payload?.data ?? payload ?? {};
  return {
    totalPatients: Number(data.totalPatients ?? 0),
    totalAppointments: Number(data.totalAppointments ?? 0),
    // Some backends return activeDoctors or totalStaff; prefer totalStaff
    totalStaff: Number(data.totalStaff ?? data.activeDoctors ?? 0),
    totalDepartments: Number(data.totalDepartments ?? 0)
  };
};

/**
 * Get dashboard statistics with error handling and retry logic
 * @returns Dashboard statistics
 */
const getDashboardStats = async (): Promise<AdminDashboardStats> => {
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await api.get(API_ADMIN_DASHBOARD_STATS);
      // Support both { success, data: {...} } and direct {...}
      return normalizeDashboardStats(response.data);
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard statistics. Please try again later.');
        throw error;
      }
      // Wait for 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Failed to fetch dashboard statistics after multiple retries');
};

/**
 * Get revenue chart data with error handling
 * @param period - 'weekly', 'monthly', or 'yearly'
 * @returns Revenue chart data
 */
const getRevenueChartData = async (
  period: 'weekly' | 'monthly' | 'yearly' = 'monthly'
): Promise<RevenueChartData[]> => {
  try {
    const response = await api.get(`${API_ADMIN_DASHBOARD_REVENUE}?period=${period}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching revenue chart data:', error);
    toast.error('Failed to load revenue data. Please try again later.');
    throw error;
  }
};

/**
 * Get system health status
 * @returns System health information
 */
const getSystemHealth = async (): Promise<SystemHealth> => {
  try {
    const response = await api.get('/api/admin/system/health');
    return response.data;
  } catch (error) {
    console.error('Error fetching system health:', error);
    
    // Return fallback data if API fails
    return {
      status: 'unknown',
      database: {
        status: 'unknown',
        responseTime: 'N/A'
      },
      api: {
        status: 'unknown',
        uptime: 'N/A'
      },
      services: []
    };
  }
};

/**
 * Get patient services access for admin with error handling
 * @returns List of patient services with access status
 */
const getPatientServicesAccess = async (): Promise<PatientService[]> => {
  try {
    const response = await api.get(API_ADMIN_PATIENT_SERVICES);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching patient services access:', error);
    toast.error('Failed to load patient services. Please try again later.');
    throw error;
  }
};

/**
 * Subscribe to real-time updates for dashboard stats
 * @param callback - Function to call when stats are updated
 * @returns Function to unsubscribe
 */
const subscribeToDashboardUpdates = (callback: (stats: AdminDashboardStats) => void): (() => void) => {
  const interval = setInterval(async () => {
    try {
      const stats = await getDashboardStats();
      callback(stats);
    } catch (error) {
      console.error('Error in dashboard update subscription:', error);
    }
  }, 30000); // Update every 30 seconds

  return () => clearInterval(interval);
};

// --- Add User Management Interfaces/Types --- 
interface CreateUserData {
  username: string;
  email: string;
  password?: string; 
  role: string;
  firstName: string;
  lastName: string;
  // Add other fields as needed
}

interface CreatedUserResponse extends Omit<User, 'password'> {
  // Define based on backend response
}

interface UserListResponse {
  success: boolean;
  count?: number;
  data: User[];
  users?: User[]; // Support legacy format
}

// --- Add User Management Functions --- 

/**
 * Create a new staff user
 */
const createUser = async (userData: CreateUserData): Promise<CreatedUserResponse> => {
  try {
    // Use the correct API path
    const response = await api.post<{ success: boolean; data: CreatedUserResponse }>(API_ADMIN_USERS, userData);
    if (response.data.success) {
      return response.data.data;
    } else {
      // Handle cases where backend indicates failure without throwing an HTTP error
      throw new Error('Backend indicated failure in user creation');
    }
  } catch (error: any) {
    console.error('Error creating user:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create user via API');
  }
};

/**
 * Get all staff users
 */
const getUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get<UserListResponse>(API_ADMIN_USERS);
    // Backend returns { success: true, users: [...] }
    return response.data.users || response.data.data || []; // Support both formats
  } catch (error: any) {
    console.error('Error fetching users:', error.response?.data || error.message);
    toast.error('Failed to load staff list.');
    throw new Error(error.response?.data?.message || 'Failed to fetch users');
  }
};

/**
 * Update a staff user
 */
const updateUser = async (userId: string, updateData: Partial<CreateUserData>): Promise<User> => {
  try {
    const response = await api.put<{ success: boolean; data: User }>(`${API_ADMIN_USERS}/${userId}`, updateData);
     if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error('Backend indicated failure in user update');
    }
  } catch (error: any) {
    console.error(`Error updating user ${userId}:`, error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to update user');
  }
};

/**
 * Delete a staff user
 */
const deleteUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
  if (!userId) {
    console.error('deleteUser called with invalid userId:', userId);
    throw new Error('Invalid user ID provided');
  }

  const deleteUrl = `${API_ADMIN_USERS}/${userId}`;
  console.log(`Attempting to delete user. URL: ${deleteUrl}, UserID: ${userId}`);
  
  try {
    console.log(`Sending DELETE request to ${deleteUrl}`);
    const response = await api.delete<{ success: boolean; message?: string }>(deleteUrl);
    console.log(`Delete response:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Error deleting user ${userId}:`, error);
    
    if (error.response) {
      console.error(`Server returned ${error.response.status} status with data:`, error.response.data);
    } else if (error.request) {
      console.error('No response received from server:', error.request);
    } else {
      console.error('Error setting up the request:', error.message);
    }
    
    throw new Error(error.response?.data?.message || `Failed to delete user with ID ${userId}`);
  }
};

// Export the service functions
const adminService = {
  getDashboardStats,
  getRevenueChartData,
  getSystemHealth,
  getPatientServicesAccess,
  subscribeToDashboardUpdates,
  // Add user management functions
  createUser,
  getUsers,
  updateUser,
  deleteUser,
};

export default adminService; 