import api from './api';
import { toast } from 'react-hot-toast';

export interface MedicationDetails {
  medicationName: string;
  dosage: string;
  frequency: string;
  frequencyLabel?: string;
  route?: string;
  instructions?: string;
  duration?: number;
  startDate?: Date | string;
  doseRecords?: Array<{
    day: number;
    timeSlot: string;
    administered: boolean;
    administeredAt?: Date | string;
    administeredBy?: string;
    notes?: string;
  }>;
}

export interface PaymentAuthorization {
  paidDays: number;
  totalDays: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'fully_paid';
  canAdminister: boolean;
  restrictionMessage?: string;
  authorizedDoses: number;
  unauthorizedDoses: number;
  outstandingAmount: number;
  lastUpdated?: Date | string;
}

export interface NurseTask {
  id?: string;
  _id?: string; // MongoDB ObjectId
  patientId: string;
  patientName: string;
  taskType: 'MEDICATION' | 'VITAL_SIGNS' | 'PROCEDURE' | 'OTHER';
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedBy: string;
  assignedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate: string;
  completedDate?: string;
  notes?: string;
  serviceName?: string;
  metadata?: {
    serviceCategory?: string;
    invoiceId?: string;
  };
  inventoryUpdate?: {
    success: boolean;
    message: string;
  };
  isExtension?: boolean;
  prescriptionId?: string;
  paymentStatus?: string;
  paidAt?: Date;
  patient?: {
    name?: string;
    fullName?: string;
  };
  patientInfo?: {
    fullName?: string;
  };
  medicationName?: string;
  medicationDetails?: MedicationDetails & {
    medicationName?: string;
    prescriptionId?: string;
    extensionDetails?: boolean;
    instanceLabel?: string;
  };
  paymentAuthorization?: PaymentAuthorization;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create a new task for the nurse dashboard
 */
const createNurseTask = async (taskData: NurseTask, token: string): Promise<NurseTask> => {
  try {
    console.log('Creating new nurse task with data:', taskData);
    
    // Clean the data to ensure it's compatible with the backend
    const cleanedData = { ...taskData };
    
    // Handle MongoDB ObjectId fields - if they're not valid ObjectIds, generate placeholder IDs
    if (cleanedData.patientId && !isValidObjectId(cleanedData.patientId)) {
      // For demo purposes, create a placeholder patient ID
      cleanedData.patientId = generatePlaceholderId();
    }
    
    if (cleanedData.assignedBy && !isValidObjectId(cleanedData.assignedBy)) {
      cleanedData.assignedBy = generatePlaceholderId();
    }
    
    // If we have medicationDetails with doseRecords, make sure they're properly formatted
    if (cleanedData.medicationDetails?.doseRecords) {
      // Convert any Date objects to ISO strings for the API
      cleanedData.medicationDetails = {
        ...cleanedData.medicationDetails,
        startDate: cleanedData.medicationDetails.startDate instanceof Date 
          ? cleanedData.medicationDetails.startDate.toISOString() 
          : cleanedData.medicationDetails.startDate,
        doseRecords: cleanedData.medicationDetails.doseRecords.map(record => ({
          ...record,
          administeredAt: record.administeredAt instanceof Date 
            ? record.administeredAt.toISOString() 
            : record.administeredAt
        }))
      };
    }
    
    // Use the new endpoint
    const response = await api.post<NurseTask>('/api/nurse-tasks', cleanedData);
    
    console.log('Nurse task created:', response.data);
    toast.success('Task created successfully');
    return response.data;
  } catch (error: any) {
    console.error('Error creating nurse task:', error);
    
    if (error.response?.status === 401) {
      toast.error('Authentication error. Please log in again.');
    } else {
      toast.error('Failed to create nurse task: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    }
    
    throw error;
  }
};

// Helper to check if a string is a valid MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Helper to generate a placeholder MongoDB-like ID for demo purposes
const generatePlaceholderId = () => {
  return Array(24).fill(0).map(() => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

/**
 * Get all tasks or filter by parameters
 */
const getNurseTasks = async (params: {
  nurseId?: string,
  status?: string,
  taskType?: string,
  patientId?: string,
  limit?: number
} = {}, token: string): Promise<NurseTask[]> => {
  try {
    // Build query string from parameters
    const queryParams = new URLSearchParams();
    
    if (params.nurseId) {
      queryParams.append('assignedTo', params.nurseId);
    }
    
    if (params.status) {
      queryParams.append('status', params.status);
    }
    
    if (params.taskType) {
      queryParams.append('taskType', params.taskType);
    }
    
    if (params.patientId) {
      queryParams.append('patientId', params.patientId);
    }
    
    // Apply limit with a reasonable default (200) to prevent loading too many tasks
    const limit = params.limit || 200;
    queryParams.append('limit', limit.toString());
    
    const queryString = queryParams.toString();
    const url = `/api/nurse-tasks${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<NurseTask[] | { success: boolean; data: NurseTask[] }>(url);
    const data = response.data;
    // Backend may return array directly or paginated { success, data, pagination }
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) {
      return (data as any).data;
    }
    return [];
  } catch (error: any) {
    console.error('Error fetching nurse tasks:', error);
    return [];
  }
};

/**
 * Get a specific nurse task by ID
 */
const getNurseTaskById = async (taskId: string, token: string): Promise<NurseTask | null> => {
  try {
    const response = await api.get<NurseTask>(`/api/nurse-tasks/${taskId}`);
    
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching task ${taskId}:`, error);
    return null;
  }
};

/**
 * Get tasks by status
 */
const getTasksByStatus = async (status: NurseTask['status'], token: string): Promise<NurseTask[]> => {
  try {
    const response = await api.get<NurseTask[]>(`/api/nurse-tasks?status=${status}`);
    
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching ${status} tasks:`, error);
    return [];
  }
};

/**
 * Update a nurse task
 */
const updateNurseTask = async (taskId: string, updateData: Partial<NurseTask>, token: string): Promise<NurseTask> => {
  try {
    // Ensure we're sending valid data to the API
    const cleanedData = { ...updateData };
    
    // If we have medicationDetails with doseRecords, make sure they're properly formatted
    if (cleanedData.medicationDetails?.doseRecords) {
      // Convert any Date objects to ISO strings for the API
      cleanedData.medicationDetails = {
        ...cleanedData.medicationDetails,
        startDate: cleanedData.medicationDetails.startDate instanceof Date 
          ? cleanedData.medicationDetails.startDate.toISOString() 
          : cleanedData.medicationDetails.startDate,
        doseRecords: cleanedData.medicationDetails.doseRecords.map(record => ({
          ...record,
          administeredAt: record.administeredAt instanceof Date 
            ? record.administeredAt.toISOString() 
            : record.administeredAt
        }))
      };
    }
    
    console.log(`Updating task ${taskId} with data:`, cleanedData);
    
    const response = await api.put<NurseTask>(`/api/nurse-tasks/${taskId}`, cleanedData);
    
    console.log('Nurse task updated:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating nurse task:', error);
    
    if (error.response?.status === 404) {
      console.error(`Task with ID ${taskId} not found in database`);
      // Don't show toast for 404 errors as they're handled by the caller
    } else if (error.response?.status === 401) {
      toast.error('Authentication error. Please log in again.');
    } else {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error(`API error details: ${errorMessage}`);
      toast.error('Failed to update nurse task: ' + errorMessage);
    }
    
    throw error;
  }
};

/**
 * Complete a nurse task
 */
const completeNurseTask = async (
  taskId: string, 
  completionNotes: string, 
  token: string
): Promise<NurseTask> => {
  try {
    const response = await api.put<NurseTask>(`/api/nurse-tasks/${taskId}/complete`, { notes: completionNotes });
    
    console.log('Task completed:', response.data);
    toast.success('Task marked as completed');
    return response.data;
  } catch (error: any) {
    console.error('Error completing task:', error);
    
    // Handle inventory-related errors with better messaging
    if (error.response?.data?.error === 'INVENTORY_NOT_AVAILABLE') {
      toast.error(`Cannot complete task: ${error.response.data.message}`, { duration: 6000 });
    } else if (error.response?.data?.error === 'INVENTORY_NOT_CONFIGURED') {
      toast.error(`Cannot complete task: ${error.response.data.message}`, { duration: 8000 });
    } else if (error.response?.data?.error === 'MEDICATION_NOT_AVAILABLE') {
      toast.error(`Cannot complete task: ${error.response.data.message}`, { duration: 6000 });
    } else if (error.response?.data?.error === 'MEDICATION_NO_STOCK') {
      toast.error(`Cannot complete task: ${error.response.data.message}`, { duration: 6000 });
    } else if (error.response?.data?.error === 'INVENTORY_SYSTEM_ERROR') {
      toast.error('Inventory system error. Please contact administrator.', { duration: 6000 });
    } else {
      toast.error('Failed to complete task: ' + (error.response?.data?.message || error.message));
    }
    
    throw error;
  }
};

/**
 * Delete a nurse task
 */
const deleteNurseTask = async (taskId: string, token: string): Promise<boolean> => {
  try {
    await api.delete(`/api/nurse-tasks/${taskId}`);
    
    console.log(`Task ${taskId} deleted`);
    toast.success('Task deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error deleting task:', error);
    toast.error('Failed to delete task: ' + (error.response?.data?.message || error.message));
    return false;
  }
};

/**
 * Get all medication tasks (doctor-prescribed medications only)
 * Fetches all pages to ensure no tasks are missing
 */
const getMedicationTasks = async (token: string, params?: {
  status?: string;
  nurseId?: string;
  patientId?: string;
  limit?: number;
  page?: number;
}): Promise<NurseTask[]> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('taskType', 'MEDICATION');
    queryParams.append('_t', Date.now().toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.nurseId) queryParams.append('assignedTo', params.nurseId);
    if (params?.patientId) queryParams.append('patientId', params.patientId);

    const limit = params?.limit || 100;
    const page = params?.page || 1;
    queryParams.append('limit', limit.toString());
    queryParams.append('page', page.toString());
    queryParams.append('paginated', 'true');

    const url = `/api/nurse-tasks?${queryParams.toString()}`;
    const response = await api.get<any>(url);

    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error: any) {
    console.error('Error fetching medication tasks:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get all injection tasks (service-sent medications)
 */
const getInjectionTasks = async (token: string, params?: {
  status?: string;
  nurseId?: string;
  patientId?: string;
  limit?: number;
}): Promise<NurseTask[]> => {
  try {
    // Build query parameters with cache busting
    const queryParams = new URLSearchParams();
    // Only include PROCEDURE task type for service-sent medications (injections)
    queryParams.append('taskType', 'PROCEDURE');
    queryParams.append('_t', Date.now().toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.nurseId) queryParams.append('assignedTo', params.nurseId);
    if (params?.patientId) queryParams.append('patientId', params.patientId);
    
    // Apply limit with a reasonable default (200) to prevent loading too many tasks
    const limit = params?.limit || 200;
    queryParams.append('limit', limit.toString());

    const url = `/api/nurse-tasks?${queryParams.toString()}`;
    console.log(`Fetching injection tasks from: ${url}`);

    const response = await api.get<NurseTask[]>(url);

    if (response.data && Array.isArray(response.data)) {
      // Filter for injection-related tasks
      const injectionTasks = response.data.filter(task => {
        const description = task.description?.toLowerCase() || '';
        const serviceName = task.serviceName?.toLowerCase() || '';
        const serviceCategory = task.metadata?.serviceCategory?.toLowerCase() || '';
        
        const isInjectionTask = 
          description.includes('injection') ||
          serviceName.includes('injection') ||
          description.includes('inject') ||
          serviceName.includes('inject') ||
          serviceCategory === 'injection';
        
        // Debug logging for injection tasks
        if (isInjectionTask) {
          console.log(`💉 Found injection task:`, {
            id: task._id,
            serviceName: task.serviceName,
            description: task.description,
            category: task.metadata?.serviceCategory,
            status: task.status
          });
        }
        
        return isInjectionTask;
      });
      console.log(`Successfully fetched ${injectionTasks.length} injection tasks out of ${response.data.length} total tasks`);
      return injectionTasks;
    }

    console.warn('API returned non-array response:', response.data);
    return [];
  } catch (error: any) {
    console.error('Error fetching injection tasks:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Complete a medication task
 */
const completeMedicationTask = async (
  taskId: string, 
  administrationNotes: string, 
  token: string
): Promise<NurseTask> => {
  try {
    const response = await api.put<NurseTask>(`/api/nurse-tasks/${taskId}/complete`, { notes: administrationNotes });
    
    console.log('Medication task completed:', response.data);
    toast.success('Medication administered successfully');
    return response.data;
  } catch (error: any) {
    console.error('Error completing medication task:', error);
    toast.error('Failed to record medication administration: ' + (error.response?.data?.message || error.message));
    throw error;
  }
};

/**
 * Get all nurse tasks for a specific patient
 */
const getPatientNurseTasks = async (patientId: string, token: string): Promise<NurseTask[]> => {
  try {
    const url = `/api/nurse-tasks?patientId=${patientId}`;
    console.log(`Fetching nurse tasks for patient: ${patientId}`);
    
    const response = await api.get<NurseTask[]>(url);
    
    console.log(`Found ${response.data?.length || 0} nurse tasks for patient ${patientId}`);
    
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching nurse tasks for patient ${patientId}:`, error);
    return [];
  }
};

/**
 * Record dose administration for a medication task
 */
const recordDoseAdministration = async (
  taskId: string,
  day: number,
  timeSlot: string,
  notes: string = '',
  token: string
): Promise<NurseTask> => {
  try {
    console.log('Recording dose administration:', { taskId, day, timeSlot, notes });
    
    const response = await api.put<NurseTask>(`/api/nurse-tasks/${taskId}/dose`, {
      day,
      timeSlot,
      notes,
      administered: true,
      administeredAt: new Date().toISOString()
    });
    
    console.log('Dose administration recorded:', response.data);
    
    // Check for inventory update response
    if (response.data.inventoryUpdate) {
      if (response.data.inventoryUpdate.success) {
        toast.success('Medication dose administered successfully');
        console.log('📦 Inventory updated:', response.data.inventoryUpdate.message);
      } else {
        toast.success('Medication dose administered successfully');
        toast.error(`⚠️ ${response.data.inventoryUpdate.message}`, { duration: 6000 });
      }
    } else {
      toast.success('Medication dose administered successfully');
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Error recording dose administration:', error);
    
    // Handle different types of errors with better messaging
    if (error.response?.status === 404) {
      toast.error('Task not found. The task may have been deleted or updated. Please refresh the page.', { duration: 8000 });
    } else if (error.response?.data?.error === 'INVENTORY_NOT_AVAILABLE') {
      toast.error(`Cannot administer dose: ${error.response.data.message}`, { duration: 6000 });
    } else if (error.response?.data?.error === 'INVENTORY_NOT_CONFIGURED') {
      toast.error(`Cannot administer dose: ${error.response.data.message}`, { duration: 8000 });
    } else if (error.response?.data?.error === 'MEDICATION_NOT_AVAILABLE') {
      // This error is now handled differently in the backend - it shouldn't reach here
      toast.error(`Cannot administer dose: ${error.response.data.message}`, { duration: 6000 });
    } else if (error.response?.data?.error === 'MEDICATION_NO_STOCK') {
      toast.error(`Cannot administer dose: ${error.response.data.message}`, { duration: 6000 });
    } else if (error.response?.data?.error === 'INVENTORY_SYSTEM_ERROR') {
      toast.error('Inventory system error. Please contact administrator.', { duration: 6000 });
    } else {
      toast.error('Failed to record dose administration: ' + (error.response?.data?.message || error.message));
    }
    
    throw error;
  }
};

/**
 * Clear medication tasks cache
 */
const clearMedicationTasksCache = () => {
  try {
    localStorage.removeItem('medicationTasks');
    console.log('✅ Cleared medication tasks cache');
  } catch (error) {
    console.error('Error clearing medication tasks cache:', error);
  }
};

const nurseTaskService = {
  createNurseTask,
  getNurseTasks,
  getNurseTaskById,
  getTasksByStatus,
  updateNurseTask,
  completeNurseTask,
  deleteNurseTask,
  getMedicationTasks,
  getInjectionTasks,
  completeMedicationTask,
  getPatientNurseTasks,
  recordDoseAdministration,
  clearMedicationTasksCache
};

export default nurseTaskService; 