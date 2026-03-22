import api from './apiService';

export interface Room {
  id: string;
  name: string;
  type: string;
  floor: string;
  building: string;
  capacity: number;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  equipmentList?: string[];
  notes?: string;
  lastCleaned?: string;
  lastMaintenance?: string;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  floors: number;
  status: 'active' | 'maintenance' | 'construction';
  contactPerson: string;
  contactNumber: string;
  description?: string;
  dateBuilt?: string;
  lastRenovation?: string;
}

export interface Department {
  id: string;
  name: string;
  building: string;
  floor: string;
  head: string;
  staffCount: number;
  status: 'active' | 'inactive';
  description?: string;
  contactExtension?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  location: string;
  department: string;
  status: 'operational' | 'maintenance' | 'faulty' | 'calibration';
  purchaseDate: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  supplier?: string;
  notes?: string;
}

export interface MaintenanceRequest {
  id: string;
  type: 'room' | 'equipment' | 'building';
  itemId: string;
  itemName: string;
  requestDate: string;
  requestedBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  completedDate?: string;
  notes?: string;
}

// Rooms API calls
const getRooms = async (): Promise<Room[]> => {
  try {
    const response = await api.get('/api/facility/rooms');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }
};

const getRoomById = async (id: string): Promise<Room> => {
  try {
    const response = await api.get(`/api/facility/rooms/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching room ${id}:`, error);
    throw error;
  }
};

const createRoom = async (room: Omit<Room, 'id'>): Promise<Room> => {
  try {
    const response = await api.post('/api/facility/rooms', room);
    return response.data.data;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

const updateRoom = async (id: string, room: Partial<Room>): Promise<Room> => {
  try {
    const response = await api.put(`/api/facility/rooms/${id}`, room);
    return response.data.data;
  } catch (error) {
    console.error(`Error updating room ${id}:`, error);
    throw error;
  }
};

const deleteRoom = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/facility/rooms/${id}`);
  } catch (error) {
    console.error(`Error deleting room ${id}:`, error);
    throw error;
  }
};

// Buildings API calls
const getBuildings = async (): Promise<Building[]> => {
  try {
    const response = await api.get('/api/facility/buildings');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching buildings:', error);
    throw error;
  }
};

const getBuildingById = async (id: string): Promise<Building> => {
  try {
    const response = await api.get(`/api/facility/buildings/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching building ${id}:`, error);
    throw error;
  }
};

const createBuilding = async (building: Omit<Building, 'id'>): Promise<Building> => {
  try {
    const response = await api.post('/api/facility/buildings', building);
    return response.data.data;
  } catch (error) {
    console.error('Error creating building:', error);
    throw error;
  }
};

const updateBuilding = async (id: string, building: Partial<Building>): Promise<Building> => {
  try {
    const response = await api.put(`/api/facility/buildings/${id}`, building);
    return response.data.data;
  } catch (error) {
    console.error(`Error updating building ${id}:`, error);
    throw error;
  }
};

const deleteBuilding = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/facility/buildings/${id}`);
  } catch (error) {
    console.error(`Error deleting building ${id}:`, error);
    throw error;
  }
};

// Departments API calls
const getDepartments = async (): Promise<Department[]> => {
  try {
    const response = await api.get('/api/facility/departments');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }
};

const getDepartmentById = async (id: string): Promise<Department> => {
  try {
    const response = await api.get(`/api/facility/departments/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching department ${id}:`, error);
    throw error;
  }
};

const createDepartment = async (department: Omit<Department, 'id'>): Promise<Department> => {
  try {
    const response = await api.post('/api/facility/departments', department);
    return response.data.data;
  } catch (error) {
    console.error('Error creating department:', error);
    throw error;
  }
};

const updateDepartment = async (id: string, department: Partial<Department>): Promise<Department> => {
  try {
    const response = await api.put(`/api/facility/departments/${id}`, department);
    return response.data.data;
  } catch (error) {
    console.error(`Error updating department ${id}:`, error);
    throw error;
  }
};

const deleteDepartment = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/facility/departments/${id}`);
  } catch (error) {
    console.error(`Error deleting department ${id}:`, error);
    throw error;
  }
};

// Equipment API calls
const getEquipment = async (): Promise<Equipment[]> => {
  try {
    const response = await api.get('/api/facility/equipment');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching equipment:', error);
    throw error;
  }
};

const getEquipmentById = async (id: string): Promise<Equipment> => {
  try {
    const response = await api.get(`/api/facility/equipment/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching equipment ${id}:`, error);
    throw error;
  }
};

const createEquipment = async (equipment: Omit<Equipment, 'id'>): Promise<Equipment> => {
  try {
    const response = await api.post('/api/facility/equipment', equipment);
    return response.data.data;
  } catch (error) {
    console.error('Error creating equipment:', error);
    throw error;
  }
};

const updateEquipment = async (id: string, equipment: Partial<Equipment>): Promise<Equipment> => {
  try {
    const response = await api.put(`/api/facility/equipment/${id}`, equipment);
    return response.data.data;
  } catch (error) {
    console.error(`Error updating equipment ${id}:`, error);
    throw error;
  }
};

const deleteEquipment = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/facility/equipment/${id}`);
  } catch (error) {
    console.error(`Error deleting equipment ${id}:`, error);
    throw error;
  }
};

// Maintenance requests API calls
const getMaintenanceRequests = async (): Promise<MaintenanceRequest[]> => {
  try {
    const response = await api.get('/api/facility/maintenance');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    throw error;
  }
};

const createMaintenanceRequest = async (request: Omit<MaintenanceRequest, 'id'>): Promise<MaintenanceRequest> => {
  try {
    const response = await api.post('/api/facility/maintenance', request);
    return response.data.data;
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    throw error;
  }
};

const updateMaintenanceRequest = async (id: string, request: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> => {
  try {
    const response = await api.put(`/api/facility/maintenance/${id}`, request);
    return response.data.data;
  } catch (error) {
    console.error(`Error updating maintenance request ${id}:`, error);
    throw error;
  }
};

const deleteMaintenanceRequest = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/facility/maintenance/${id}`);
  } catch (error) {
    console.error(`Error deleting maintenance request ${id}:`, error);
    throw error;
  }
};

// Get facility statistics
const getFacilityStats = async () => {
  try {
    const response = await api.get('/api/facility/stats');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching facility statistics:', error);
    throw error;
  }
};

const facilityService = {
  // Rooms
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  
  // Buildings
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  
  // Departments
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  
  // Equipment
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  
  // Maintenance requests
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  
  // Statistics
  getFacilityStats
};

export default facilityService; 