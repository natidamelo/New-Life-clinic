import React, { useState, useEffect } from 'react';
import { useSetVeltDocId } from '../../context/VeltContext';
import AIAdvisorPanel from '../../components/Billing/AIAdvisorPanel';
import VeltToolbar from '../../components/VeltToolbar';
import api from '../../services/apiService';

const FinancialAdvisor: React.FC = () => {
  const [revenue, setRevenue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Set Velt document ID
  useSetVeltDocId('financial-advisor');

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const today = new Date();
        const startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        const params = new URLSearchParams({
          startDate: startDate.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        });
        const res = await api.get(`/api/billing/stats?${params}`);
        if (res.data?.success) {
          setRevenue(res.data.data?.totalRevenue || 0);
        }
      } catch (err) {
        console.error('Failed to load revenue for Financial Advisor page:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      <div className="flex justify-between items-center bg-card/60 border border-border/85 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Financial Advisor</h1>
          <p className="text-sm text-muted-foreground">Collaboration space for clinic financial planning and loan analysis</p>
        </div>
        <VeltToolbar />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <AIAdvisorPanel currentMonthRevenue={revenue} />
      )}
    </div>
  );
};

export default FinancialAdvisor;
