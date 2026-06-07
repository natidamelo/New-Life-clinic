import { useState, useCallback } from 'react';
import api from '../../../services/apiService';

export interface Loan {
  _id: string;
  clinicId: string;
  name: string;
  principal: number;
  annualRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalRepayment: number;
  totalInterest: number;
  startDate: string;
  paidMonths: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateLoanInput {
  name: string;
  principal: number;
  annualRate: number;
  termMonths: number;
  startDate?: string;
}

export const useLoans = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/loans');
      setLoans(res.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load loans');
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLoan = useCallback(async (input: CreateLoanInput): Promise<boolean> => {
    try {
      const res = await api.post('/api/loans', input);
      if (res.data?.success) {
        await fetchLoans();
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to create loan');
    }
  }, [fetchLoans]);

  const payMonth = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await api.patch(`/api/loans/${id}/pay`);
      if (res.data?.success) {
        setLoans(prev => prev.map(l => l._id === id ? res.data.data : l));
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to mark payment');
    }
  }, []);

  const deleteLoan = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await api.delete(`/api/loans/${id}`);
      if (res.data?.success) {
        setLoans(prev => prev.filter(l => l._id !== id));
        return true;
      }
      return false;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to delete loan');
    }
  }, []);

  return { loans, loading, error, fetchLoans, createLoan, payMonth, deleteLoan };
};
