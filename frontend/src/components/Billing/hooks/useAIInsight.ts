import { useState, useCallback } from 'react';
import api from '../../../services/apiService';
import { FinancialSnapshot, SnapshotPeriod } from './useFinancialSnapshot';
import { Loan } from './useLoans';

export interface AIInsight {
  summary: string;
  bullets: string[];
  direction: 'grow' | 'maintain' | 'caution';
}

export interface ProfitConfig {
  fixedCosts: number;
  varCostPct: number;
  targetMarginPct: number;
}

export const useAIInsight = () => {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsight = useCallback(
    async (
      period: SnapshotPeriod,
      snapshot: FinancialSnapshot,
      loans: Loan[],
      profitConfig?: ProfitConfig
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.post('/api/ai/financial-insight', {
          period,
          snapshot,
          loans,
          profitConfig,
        });
        if (res.data?.success) {
          setInsight(res.data.data);
        } else {
          throw new Error(res.data?.message || 'Failed to get AI insight');
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'AI insight unavailable';
        setError(msg);
        // Set a fallback so the UI still renders something
        setInsight({
          summary: 'AI insight is temporarily unavailable. <b>Review your metrics</b> manually.',
          bullets: [
            'Follow up on outstanding invoices promptly.',
            'Track daily revenue against your monthly target.',
            'Consider cost-reduction opportunities in supply procurement.',
          ],
          direction: 'maintain',
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { insight, loading, error, fetchInsight };
};
