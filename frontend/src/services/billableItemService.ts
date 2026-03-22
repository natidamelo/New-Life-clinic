import { api } from './api';

export type BillableItemType = 'service' | 'lab' | 'medication' | 'imaging' | 'supply' | 'procedure' | 'other';

export interface BillableItem {
  _id: string;
  name: string;
  type: BillableItemType;
  price: number;
  inventoryItem?: any; // Can be typed more strictly if needed
  code?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillableItemInput {
  name: string;
  type: BillableItemType;
  price: number;
  inventoryItem?: string;
  code?: string;
  isActive?: boolean;
}

const billableItemService = {
  async getAll(params?: { type?: BillableItemType; isActive?: boolean; search?: string }) {
    const response = await api.get('/api/billable-items', { params });
    return response.data.data;
  },
  async getById(id: string) {
    const response = await api.get(`/api/billable-items/${id}`);
    return response.data.data;
  },
  async create(data: BillableItemInput) {
    const response = await api.post('/api/billable-items', data);
    return response.data.data;
  },
  async update(id: string, data: BillableItemInput) {
    const response = await api.put(`/api/billable-items/${id}`, data);
    return response.data.data;
  },
  async deactivate(id: string) {
    const response = await api.delete(`/api/billable-items/${id}`);
    return response.data.data;
  }
};

export default billableItemService; 