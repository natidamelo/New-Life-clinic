import api from './api';

export type DatasetKey = 'patients' | 'appointments' | 'invoices' | 'lab-orders' | 'inventory';

export interface CreateSharePayload {
  title: string;
  dataset: DatasetKey;
  fields?: string[];
  filter?: Record<string, any>;
  expiresInDays?: number;
  allowedRoles?: string[];
}

export interface DataShareRecord {
  _id: string;
  title: string;
  dataset: DatasetKey;
  fields: string[];
  filter: Record<string, any>;
  token: string;
  isActive: boolean;
  isExpired?: boolean;
  createdAt: string;
  expiresAt?: string;
  accessCount?: number;
  lastAccessedAt?: string;
  allowedRoles?: string[];
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface DataShareStats {
  totalShares: number;
  activeShares: number;
  totalAccesses: number;
  availableRecords: {
    patients: number;
    appointments: number;
    invoices: number;
  };
}

const createShare = async (payload: CreateSharePayload): Promise<DataShareRecord> => {
  const { data } = await api.post('/api/data-share/shares', payload);
  return data.data as DataShareRecord;
};

const listShares = async (): Promise<DataShareRecord[]> => {
  const { data } = await api.get('/api/data-share/shares');
  return (data.data || []) as DataShareRecord[];
};

const revokeShare = async (id: string): Promise<DataShareRecord> => {
  const { data } = await api.patch(`/api/data-share/shares/${id}/revoke`);
  return data.data as DataShareRecord;
};

const deleteShare = async (id: string): Promise<void> => {
  await api.delete(`/api/data-share/shares/${id}`);
};

const exportCsv = async (
  dataset: DatasetKey,
  params: { fields?: string[]; from?: string; to?: string; format?: 'csv' | 'json' }
): Promise<Blob> => {
  const query = new URLSearchParams();
  if (params.fields?.length) query.set('fields', params.fields.join(','));
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.format) query.set('format', params.format);
  const url = `/api/data-share/export/${dataset}?${query.toString()}`;
  const response = await api.get(url, { responseType: 'blob' });
  return response.data as Blob;
};

const getDatasetPreview = async (
  dataset: DatasetKey,
  params: { fields?: string[]; from?: string; to?: string }
): Promise<any[]> => {
  const query = new URLSearchParams();
  if (params.fields?.length) query.set('fields', params.fields.join(','));
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  const { data } = await api.get(`/api/data-share/preview/${dataset}?${query.toString()}`);
  return (data.data || []) as any[];
};

const getStats = async (): Promise<DataShareStats> => {
  const { data } = await api.get('/api/data-share/stats');
  return data.data as DataShareStats;
};

export default {
  createShare,
  listShares,
  revokeShare,
  deleteShare,
  exportCsv,
  getDatasetPreview,
  getStats,
};
