import { useState, useCallback, useEffect } from 'react';
import api from '../../../services/apiService';

export type SnapshotPeriod = 'day' | 'month' | 'year';

export interface FinancialSnapshot {
  clinicId: string;
  period: SnapshotPeriod;
  periodKey: string;
  totalRevenue: number;
  paidInvoices: number;
  pendingInvoices: number;
  partialPayments: number;
  outstandingAmount: number;
  collectionRate: number;
  patientCount: number;
  avgRevenuePerPatient: number;
  operatingExpenses: number;
  trend?: any[];
  createdAt: string;
}

const defaultSnapshot = (): FinancialSnapshot => ({
  clinicId: 'new-life',
  period: 'month',
  periodKey: '',
  totalRevenue: 0,
  paidInvoices: 0,
  pendingInvoices: 0,
  partialPayments: 0,
  outstandingAmount: 0,
  collectionRate: 0,
  patientCount: 0,
  avgRevenuePerPatient: 0,
  operatingExpenses: 0,
  trend: [],
  createdAt: new Date().toISOString(),
});

const buildPeriodKey = (period: SnapshotPeriod): string => {
  const now = new Date();
  if (period === 'day') return now.toISOString().split('T')[0];
  if (period === 'month')
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return String(now.getFullYear());
};

export const useFinancialSnapshot = (period: SnapshotPeriod, key?: string) => {
  const [snapshot, setSnapshot] = useState<FinancialSnapshot>(defaultSnapshot());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async (p: SnapshotPeriod, k?: string) => {
    setLoading(true);
    setError(null);
    try {
      const periodKey = k ?? buildPeriodKey(p);
      const res = await api.get(`/api/financial-snapshots?period=${p}&key=${periodKey}`);
      if (res.data?.success) {
        setSnapshot(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load snapshot');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot(period, key);
  }, [period, key, fetchSnapshot]);

  return { snapshot, loading, error, refetch: () => fetchSnapshot(period, key) };
};
