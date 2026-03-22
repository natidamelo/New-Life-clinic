import api from './api'; // Import the api from api.ts
import { toast } from 'react-hot-toast';
import { User, Nurse } from '../types/user';
import { Doctor as DoctorType } from '../types/user';

// Define the Doctor interface (can be shared if defined elsewhere)
interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  // Add other fields if needed
}

// Define Patient interface
export interface PatientData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string;
}

// Real data will be fetched from the clinic-cms database

class UserService {
  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    try {
      const response = await api.get<User[]>('/api/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await api.get<User[]>('/api/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await api.get<User>(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all doctors
   */
  async getAllDoctors(): Promise<Doctor[]> {
    try {
      const response = await api.get<Doctor[]>('/api/doctors/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return [];
    }
  }

  /**
   * Get all nurses
   */
  async getAllNurses(): Promise<Nurse[]> {
    try {
      const response = await api.get<Nurse[]>('/api/nurse/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching nurses:', error);
      return [];
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const response = await api.get<User[]>(`/api/users?role=${role}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${role}s:`, error);
      return [];
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: Partial<User>): Promise<User | null> {
    try {
      const response = await api.post<User>('/api/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  /**
   * Update a user
   */
  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    try {
      const response = await api.put<User>(`/api/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      await api.delete(`/api/users/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      return false;
    }
  }

  /**
   * Change user password
   */
  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      await api.post(`/api/users/${id}/change-password`, {
        oldPassword,
        newPassword
      });
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  }

  /**
   * Reset user password
   */
  async resetPassword(email: string): Promise<boolean> {
    try {
      await api.post('/api/auth/reset-password', { email });
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      return false;
    }
  }

  /**
   * Creates a new patient by sending data to the backend API
   */
  async createPatient(patientData: PatientData): Promise<any> {
    try {
      const response = await api.post('/api/patients', patientData);
      toast.success('Patient registered successfully');
      return response.data;
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to register patient";
      toast.error(errorMsg);
      throw error;
    }
  }

  /**
   * Updates an existing patient's information
   */
  async updatePatient(patientId: string, patientData: PatientData): Promise<any> {
    try {
      const response = await api.put(`/api/patients/${patientId}`, patientData);
      toast.success('Patient information updated successfully');
      return response.data;
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to update patient information";
      toast.error(errorMsg);
      throw error;
    }
  }

  /**
   * Admin resets a user's password
   */
  async adminResetUserPassword(userId: string, newPassword: string): Promise<any> {
    try {
      const response = await api.put(`/api/admin/users/${userId}/change-password`, { newPassword });
      return response.data;
    } catch (error: any) {
      throw error?.response?.data?.message || error.message || "Failed to reset password";
    }
  }
}

const userService = new UserService();
export default userService;

