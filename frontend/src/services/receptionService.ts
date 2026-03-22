import api from './apiService';

export interface ReceptionDashboardStats {
  waitingPatients: number;
  dailyAppointments: number;
  activeDepartments: number;
  urgentCases: number;
  totalPatientsToday: number;
  recentAppointments: number;
  patientsByDepartment: { [key: string]: number };
}

const receptionService = {
  getDashboardStats: async (): Promise<ReceptionDashboardStats> => {
    try {
      const response = await api.get('/api/reception/dashboard-stats');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch dashboard stats');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error fetching reception dashboard stats:', error);
      
      // Return fallback data in case of API failure
      return {
        waitingPatients: 0,
        dailyAppointments: 0,
        activeDepartments: 0,
        urgentCases: 0,
        totalPatientsToday: 0,
        recentAppointments: 0,
        patientsByDepartment: {}
      };
    }
  }
};

export default receptionService;
