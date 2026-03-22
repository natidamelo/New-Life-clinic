import { WeeklyDiseasesReport } from '../types/weeklyDiseasesReport';

const API_BASE_URL = '/api/weekly-diseases-reports';

class WeeklyDiseasesReportService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

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

    const response = await fetch(`${API_BASE_URL}?${queryParams}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }

    return response.json();
  }

  async getReportById(id: string) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch report');
    }

    return response.json();
  }

  async getCurrentWeekReport() {
    const response = await fetch(`${API_BASE_URL}/current-week`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch current week report');
    }

    return response.json();
  }

  async createReport(reportData: Partial<WeeklyDiseasesReport>) {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(reportData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create report');
    }

    return response.json();
  }

  async updateReport(id: string, reportData: Partial<WeeklyDiseasesReport>) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(reportData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update report');
    }

    return response.json();
  }

  async deleteReport(id: string) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete report');
    }

    return response.json();
  }

  async getReportStatistics(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(`${API_BASE_URL}/statistics?${queryParams}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    return response.json();
  }

  async refreshDiseaseCounts(reportId: string) {
    const response = await fetch(`${API_BASE_URL}/${reportId}/refresh-counts`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to refresh disease counts');
    }

    return response.json();
  }

  async getDiseaseStats(weekStartDate: string, weekEndDate: string) {
    const queryParams = new URLSearchParams();
    queryParams.append('weekStartDate', weekStartDate);
    queryParams.append('weekEndDate', weekEndDate);

    const response = await fetch(`${API_BASE_URL}/disease-stats?${queryParams}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch disease statistics');
    }

    return response.json();
  }
}

export default new WeeklyDiseasesReportService();
