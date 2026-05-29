import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = axios.create({ baseURL: `${API_BASE}/api/cctv` });

api.interceptors.request.use(config => {
  config.headers = { ...config.headers, ...getAuthHeaders() };
  return config;
});

// ── Cameras ────────────────────────────────────────────────────────────────
export const getCameras = () => api.get('/cameras').then(r => r.data);

export const addCamera = (data: {
  name: string;
  rtspUrl: string;
  room: string;
  location?: string;
  notes?: string;
}) => api.post('/cameras', data).then(r => r.data);

export const editCamera = (id: string, data: {
  name?: string;
  rtspUrl?: string;
  room?: string;
  location?: string;
  notes?: string;
  recordingEnabled?: boolean;
}) => api.put(`/cameras/${id}`, data).then(r => r.data);

export const deleteCamera = (id: string) =>
  api.delete(`/cameras/${id}`).then(r => r.data);

// ── Stream ─────────────────────────────────────────────────────────────────
export const getStreamUrl = (id: string) =>
  api.get(`/cameras/${id}/stream`).then(r => r.data);

export const checkCameraStatus = (id: string) =>
  api.post(`/cameras/${id}/status/check`).then(r => r.data);

// ── Recording ──────────────────────────────────────────────────────────────
export const startRecording = (id: string) =>
  api.post(`/cameras/${id}/recording/start`).then(r => r.data);

export const stopRecording = (id: string) =>
  api.post(`/cameras/${id}/recording/stop`).then(r => r.data);

export const getRecordings = (params?: { cameraId?: string; page?: number; limit?: number }) =>
  api.get('/recordings', { params }).then(r => r.data);

export const deleteRecording = (recordingId: string) =>
  api.delete(`/recordings/${recordingId}`).then(r => r.data);

// ── Events ─────────────────────────────────────────────────────────────────
export const getEvents = (params?: { cameraId?: string; eventType?: string; page?: number; limit?: number }) =>
  api.get('/events', { params }).then(r => r.data);

export const acknowledgeEvent = (eventId: string) =>
  api.post(`/events/${eventId}/acknowledge`).then(r => r.data);

// ── Status overview ────────────────────────────────────────────────────────
export const getAllCamerasStatus = () =>
  api.get('/status').then(r => r.data);

export default api;
