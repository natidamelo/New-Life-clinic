import api from './apiService';
import { Service } from '../types/service';

const serviceService = {
  async getServices(params?: { isActive?: boolean }): Promise<any[]> {
    const queryParams = params?.isActive ? { active: params.isActive } : {};
    const response = await api.get('/api/services', { params: queryParams });
    return response.data;
  },
  async getAll(params?: { search?: string; category?: string; active?: boolean }): Promise<Service[]> {
    const response = await api.get('/api/services', { params });
    return response.data;
  },
  async getById(id: string): Promise<Service> {
    const response = await api.get(`/api/services/${id}`);
    return response.data;
  },
  async create(data: Partial<Service>): Promise<Service> {
    const response = await api.post('/api/services', data);
    return response.data;
  },
  async update(id: string, data: Partial<Service>): Promise<Service> {
    const response = await api.put(`/api/services/${id}`, data);
    return response.data;
  },
  async activate(id: string): Promise<Service> {
    const response = await api.patch(`/api/services/${id}/activate`);
    return response.data;
  },
  async deactivate(id: string): Promise<Service> {
    const response = await api.patch(`/api/services/${id}/deactivate`);
    return response.data;
  },
  async getAllWithInventory(params?: { search?: string; category?: string; active?: boolean }): Promise<any[]> {
    const queryParams = { ...params, withInventory: 'true' };
    const response = await api.get('/api/services', { params: queryParams });
    return response.data;
  },
  async linkInventory(serviceId: string, inventoryId: string): Promise<any> {
    const response = await api.post(`/api/services/${serviceId}/link-inventory/${inventoryId}`);
    return response.data;
  },
};

export default serviceService; 