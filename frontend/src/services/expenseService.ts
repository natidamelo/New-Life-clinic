import { api } from './api';

export interface OperatingExpense {
  _id?: string;
  description: string;
  category: string;
  amount: number;
  expenseDate: string;
  /** If true, this expense is applied every month in report period (one entry covers all months). */
  recurring?: boolean;
  createdAt?: string;
}

export const addExpense = async (expense: Omit<OperatingExpense, '_id'>, token: string) => {
  const res = await api.post('/api/operating-expenses', expense, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.data as OperatingExpense;
};

export const fetchExpenses = async (startDate: string, endDate: string, token: string) => {
  const res = await api.get('/api/operating-expenses', {
    params: { startDate, endDate },
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.data as OperatingExpense[];
};

export const updateExpense = async (id: string, expense: Omit<OperatingExpense, '_id'>, token: string) => {
  const res = await api.put(`/api/operating-expenses/${id}`, expense, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.data as OperatingExpense;
};

export const deleteExpense = async (id: string, token: string) => {
  const res = await api.delete(`/api/operating-expenses/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}; 