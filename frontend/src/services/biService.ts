import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../utils/authUtils';

const BI_BASE = `${API_BASE_URL}/api/bi`;

async function biGet(path: string) {
  const res = await fetch(`${BI_BASE}${path}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`BI API error: ${res.status}`);
  return res.json();
}

export const biService = {
  // Financial
  getMonthlyFinancialSummary: (year: number, month: number) =>
    biGet(`/financial/monthly-summary?year=${year}&month=${month}`),
  getFinancialTrend: (months = 12) =>
    biGet(`/financial/trend?months=${months}`),

  // Appointments
  getDailyDashboard: (date: string) =>
    biGet(`/appointments/daily-dashboard?date=${date}`),
  getNoShowAnalysis: (months = 6) =>
    biGet(`/appointments/no-show-analysis?months=${months}`),

  // Market
  getPatientHeatmap: () => biGet('/market/patient-heatmap'),
  getReferralAnalytics: (months = 6) =>
    biGet(`/market/referral-analytics?months=${months}`),
  getPatientDemographics: () => biGet('/market/patient-demographics'),

  // Audit
  getAuditLogs: (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return biGet(`/audit/logs?${q}`);
  },
  getAuditSummary: (days = 30) =>
    biGet(`/audit/summary?days=${days}`),
};

export default biService;
