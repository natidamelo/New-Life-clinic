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
  createdAt: string;
  expiresAt?: string;
  accessCount?: number;
}

const createShare = async (payload: CreateSharePayload) => {
  const { data } = await api.post('/api/data-share/shares', payload);
  return data.data as DataShareRecord;
};

const listShares = async () => {
  const { data } = await api.get('/api/data-share/shares');
  return data.data as DataShareRecord[];
};

const revokeShare = async (id: string) => {
  const { data } = await api.patch(`/api/data-share/shares/${id}/revoke`);
  return data.data as DataShareRecord;
};

const exportCsv = async (dataset: DatasetKey, params: { fields?: string[]; from?: string; to?: string }) => {
  const query = new URLSearchParams();
  if (params.fields?.length) query.set('fields', params.fields.join(','));
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  const url = `/api/data-share/export/${dataset}?${query.toString()}`;
  const response = await api.get(url, { responseType: 'blob' });
  return response.data as Blob;
};

export default { createShare, listShares, revokeShare, exportCsv };


