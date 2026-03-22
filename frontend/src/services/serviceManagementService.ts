import { api } from './api';

export interface Service {
  _id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  unit: string;
  status: 'Active' | 'Inactive';
  description?: string;
}

export interface ServiceTaskType {
  taskType: 'MEDICATION' | 'VITAL_SIGNS' | 'PROCEDURE' | 'OTHER';
  department: 'nurse' | 'lab' | 'imaging' | 'doctor';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

/**
 * Get all active services
 */
export const getAllServices = async (): Promise<Service[]> => {
  try {
    const response = await api.get<Service[]>('/api/services');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
};

/**
 * Get a specific service by ID
 */
export const getServiceById = async (serviceId: string): Promise<Service | null> => {
  try {
    const response = await api.get<Service>(`/api/services/${serviceId}`);
    return response.data || null;
  } catch (error) {
    console.error('Error fetching service:', error);
    return null;
  }
};

/**
 * Categorize a service to determine task type and department
 */
export const categorizeService = (service: Service): ServiceTaskType => {
  const category = service.category?.toLowerCase() || '';
  const name = service.name?.toLowerCase() || '';
  
  // Medication-related services (injections, vaccines, etc.)
  if (category.includes('injection') || 
      category.includes('medication') || 
      category.includes('vaccine') || 
      category.includes('immunization') ||
      name.includes('injection') || 
      name.includes('depo') || 
      name.includes('vaccine') || 
      name.includes('immunization')) {
    return {
      taskType: 'MEDICATION',
      department: 'nurse',
      priority: 'MEDIUM'
    };
  }
  
  // Vital signs and nursing procedures
  if (category.includes('vital') || 
      category.includes('blood pressure') || 
      category.includes('temperature') || 
      category.includes('wound') || 
      category.includes('dressing') ||
      name.includes('vital') ||
      name.includes('blood pressure') ||
      name.includes('temperature') ||
      name.includes('wound') ||
      name.includes('dressing')) {
    return {
      taskType: 'VITAL_SIGNS',
      department: 'nurse',
      priority: 'MEDIUM'
    };
  }
  
  // Lab services
  if (category.includes('lab') || 
      category.includes('blood') || 
      category.includes('test') || 
      category.includes('analysis') ||
      name.includes('lab') ||
      name.includes('blood') ||
      name.includes('test') ||
      name.includes('cbc') ||
      name.includes('sugar')) {
    return {
      taskType: 'PROCEDURE',
      department: 'lab',
      priority: 'MEDIUM'
    };
  }
  
  // Imaging services
  if (category.includes('imaging') || 
      category.includes('x-ray') || 
      category.includes('ultrasound') || 
      category.includes('scan') || 
      category.includes('ct') || 
      category.includes('mri') ||
      name.includes('x-ray') ||
      name.includes('ultrasound') ||
      name.includes('scan') ||
      name.includes('ct') ||
      name.includes('mri')) {
    return {
      taskType: 'PROCEDURE',
      department: 'imaging',
      priority: 'MEDIUM'
    };
  }
  
  // Consultation services
  if (category.includes('consultation') || 
      category.includes('consult') ||
      name.includes('consultation') ||
      name.includes('consult')) {
    return {
      taskType: 'OTHER',
      department: 'doctor',
      priority: 'MEDIUM'
    };
  }
  
  // Default to nursing procedure
  return {
    taskType: 'PROCEDURE',
    department: 'nurse',
    priority: 'MEDIUM'
  };
};

/**
 * Get services by category
 */
export const getServicesByCategory = async (category: string): Promise<Service[]> => {
  try {
    const services = await getAllServices();
    return services.filter(service => 
      service.category?.toLowerCase().includes(category.toLowerCase())
    );
  } catch (error) {
    console.error('Error fetching services by category:', error);
    return [];
  }
};

/**
 * Get medication-related services
 */
export const getMedicationServices = async (): Promise<Service[]> => {
  try {
    const services = await getAllServices();
    return services.filter(service => {
      const category = categorizeService(service);
      return category.taskType === 'MEDICATION';
    });
  } catch (error) {
    console.error('Error fetching medication services:', error);
    return [];
  }
};

/**
 * Get vital signs related services
 */
export const getVitalSignsServices = async (): Promise<Service[]> => {
  try {
    const services = await getAllServices();
    return services.filter(service => {
      const category = categorizeService(service);
      return category.taskType === 'VITAL_SIGNS';
    });
  } catch (error) {
    console.error('Error fetching vital signs services:', error);
    return [];
  }
};

const serviceManagementService = {
  getAllServices,
  getServiceById,
  categorizeService,
  getServicesByCategory,
  getMedicationServices,
  getVitalSignsServices
};

export default serviceManagementService; 