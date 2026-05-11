import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../utils/authUtils';

const BI_BASE = `${API_BASE_URL}/api/bi`;

async function biGet(path: string) {
  const res = await fetch(`${BI_BASE}${path}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`BI API error: ${res.status}`);
  return res.json();
}

async function biPost(path: string, body: any) {
  const res = await fetch(`${BI_BASE}${path}`, { method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`BI API error: ${res.status}`);
  return res.json();
}

async function biPut(path: string, body: any) {
  const res = await fetch(`${BI_BASE}${path}`, { method: 'PUT', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`BI API error: ${res.status}`);
  return res.json();
}

async function biDelete(path: string) {
  const res = await fetch(`${BI_BASE}${path}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`BI API error: ${res.status}`);
  return res.json();
}

export const biService = {
  getMonthlyFinancialSummary: (year: number, month: number) => biGet(`/financial/monthly-summary?year=${year}&month=${month}`),
  getFinancialTrend: (months = 12) => biGet(`/financial/trend?months=${months}`),
  getDailyDashboard: (date: string) => biGet(`/appointments/daily-dashboard?date=${date}`),
  getNoShowAnalysis: (months = 6) => biGet(`/appointments/no-show-analysis?months=${months}`),
  getPatientHeatmap: () => biGet('/market/patient-heatmap'),
  getReferralAnalytics: (months = 6) => biGet(`/market/referral-analytics?months=${months}`),
  getPatientDemographics: () => biGet('/market/patient-demographics'),
  getAuditLogs: (params: Record<string, string>) => biGet(`/audit/logs?${new URLSearchParams(params)}`),
  getAuditSummary: (days = 30) => biGet(`/audit/summary?days=${days}`),
  // Strategy
  getLoans: () => biGet('/strategy/loans'),
  createLoan: (data: any) => biPost('/strategy/loans', data),
  updateLoan: (id: string, data: any) => biPut(`/strategy/loans/${id}`, data),
  deleteLoan: (id: string) => biDelete(`/strategy/loans/${id}`),
  getForecast: (targetProfit = 0) => biGet(`/strategy/forecast?targetProfit=${targetProfit}`),
  getRecalls: () => biGet('/strategy/recalls'),
};

export default biService;
