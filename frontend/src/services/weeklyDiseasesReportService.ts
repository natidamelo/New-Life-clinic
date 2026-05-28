import api from './apiService';
import { WeeklyDiseasesReport } from '../types/weeklyDiseasesReport';

const API_BASE_URL = '/api/weekly-diseases-reports';

class WeeklyDiseasesReportService {
  async getAllReports(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await api.get(`${API_BASE_URL}?${queryParams}`);
    return response.data;
  }

  async getReportById(id: string) {
    const response = await api.get(`${API_BASE_URL}/${id}`);
    return response.data;
  }

  async getCurrentWeekReport() {
    const response = await api.get(`${API_BASE_URL}/current-week`);
    return response.data;
  }

  async createReport(reportData: Partial<WeeklyDiseasesReport>) {
    const response = await api.post(API_BASE_URL, reportData);
    return response.data;
  }

  async updateReport(id: string, reportData: Partial<WeeklyDiseasesReport>) {
    const response = await api.put(`${API_BASE_URL}/${id}`, reportData);
    return response.data;
  }

  async deleteReport(id: string) {
    const response = await api.delete(`${API_BASE_URL}/${id}`);
    return response.data;
  }

  async getReportStatistics(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await api.get(`${API_BASE_URL}/statistics?${queryParams}`);
    return response.data;
  }

  async refreshDiseaseCounts(reportId: string) {
    const response = await api.post(`${API_BASE_URL}/${reportId}/refresh-counts`);
    return response.data;
  }

  async getDiseaseStats(weekStartDate: string, weekEndDate: string) {
    const queryParams = new URLSearchParams();
    queryParams.append('weekStartDate', weekStartDate);
    queryParams.append('weekEndDate', weekEndDate);

    const response = await api.get(`${API_BASE_URL}/disease-stats?${queryParams}`);
    return response.data;
  }
}

export default new WeeklyDiseasesReportService();
