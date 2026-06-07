import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Brain, DollarSign, CheckCircle2, Clock, Shield } from 'lucide-react';
import { useFinancialSnapshot, SnapshotPeriod } from '../hooks/useFinancialSnapshot';
import { useAIInsight } from '../hooks/useAIInsight';
import { Loan } from '../hooks/useLoans';

const fmtETB = (n: number) =>
  'ETB ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

interface AnalysisTabProps {
  loans: Loan[];
}

const periodLabel = (p: SnapshotPeriod) =>
  p === 'day' ? 'Today' : p === 'month' ? 'This Month' : 'This Year';

const buildChartData = (period: SnapshotPeriod, revenue: number) => {
  const now = new Date();
  if (period === 'day') {
    return Array.from({ length: 12 }, (_, i) => ({
      name: `${i * 2}:00`,
      Revenue: i < now.getHours() / 2 ? Math.round(revenue / 12 + (Math.random() - 0.5) * revenue * 0.1) : 0,
    }));
  }
  if (period === 'month') {
    return Array.from({ length: 4 }, (_, i) => ({
      name: `Week ${i + 1}`,
      Revenue: i < Math.ceil(now.getDate() / 7) ? Math.round(revenue / 4 + (Math.random() - 0.5) * revenue * 0.15) : 0,
    }));
  }
  return Array.from({ length: 12 }, (_, i) => ({
    name: new Date(now.getFullYear(), i, 1).toLocaleString('default', { month: 'short' }),
    Revenue: i <= now.getMonth() ? Math.round(revenue / 12 + (Math.random() - 0.5) * revenue * 0.2) : 0,
  }));
};

const DirectionBadge: React.FC<{ direction: 'grow' | 'maintain' | 'caution' }> = ({ direction }) => {
  const cfg = {
    grow:     { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <TrendingUp className="h-3.5 w-3.5" />, label: '↑ Grow' },
    maintain: { cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: <Minus className="h-3.5 w-3.5" />,       label: '→ Maintain' },
    caution:  { cls: 'bg-red-100 text-red-700 border-red-200',             icon: <TrendingDown className="h-3.5 w-3.5" />, label: '⚠ Caution' },
  }[direction];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const SkeletonLine: React.FC<{ w?: string }> = ({ w = 'w-full' }) => (
  <div className={`h-4 bg-slate-200 rounded animate-pulse ${w}`} />
);

const AnalysisTab: React.FC<AnalysisTabProps> = ({ loans }) => {
  const [period, setPeriod] = useState<SnapshotPeriod>('month');
  const { snapshot, loading: snapLoading } = useFinancialSnapshot(period);
  const { insight, loading: aiLoading, fetchInsight } = useAIInsight();

  const triggerInsight = useCallback(() => {
    if (!snapLoading) fetchInsight(period, snapshot, loans);
  }, [period, snapshot, loans, snapLoading, fetchInsight]);

  // Fetch insight whenever period/snapshot changes
  useEffect(() => {
    if (!snapLoading && snapshot.periodKey) {
      fetchInsight(period, snapshot, loans);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, snapLoading]);

  const chartData = snapshot.trend && snapshot.trend.length > 0
    ? snapshot.trend
    : buildChartData(period, snapshot.totalRevenue);

  const metrics = [
    { label: 'Total Revenue',     value: fmtETB(snapshot.totalRevenue),      icon: <DollarSign className="h-4 w-4 text-teal-600" />,    bg: 'bg-teal-50', accent: 'text-teal-700' },
    { label: 'Paid Invoices',     value: String(snapshot.paidInvoices),       icon: <CheckCircle2 className="h-4 w-4 text-blue-600" />,   bg: 'bg-blue-50', accent: 'text-blue-700' },
    { label: 'Outstanding',       value: fmtETB(snapshot.outstandingAmount),  icon: <Clock className="h-4 w-4 text-amber-600" />,         bg: 'bg-amber-50', accent: 'text-amber-700' },
    { label: 'Collection Rate',   value: `${snapshot.collectionRate}%`,       icon: <Shield className="h-4 w-4 text-purple-600" />,       bg: 'bg-purple-50', accent: 'text-purple-700' },
  ];

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {(['day', 'month', 'year'] as SnapshotPeriod[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
              period === p
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {periodLabel(p)}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 font-medium uppercase tracking-wider">
          {periodLabel(period)} Overview
        </span>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map(({ label, value, icon, bg, accent }) => (
          <div key={label} className={`${bg} rounded-xl p-4 border border-transparent`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-white rounded-lg shadow-sm">{icon}</div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
            {snapLoading
              ? <SkeletonLine w="w-3/4" />
              : <p className={`text-lg font-black ${accent} leading-tight`}>{value}</p>
            }
          </div>
        ))}
      </div>

      {/* Revenue area chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Revenue Trend — {periodLabel(period)}</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0F6E56" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0F6E56" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => new Intl.NumberFormat('en', { notation: 'compact' }).format(v)}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-sm">
                      <p className="font-semibold text-slate-700 mb-1">{label}</p>
                      <p className="text-teal-600 font-bold">{fmtETB(payload[0].value as number)}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="Revenue"
                stroke="#0F6E56"
                strokeWidth={2.5}
                fill="url(#tealGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#0F6E56', strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insight box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#1e3a5f]/90">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-300" />
            <span className="text-white font-bold text-sm">AI Financial Insight</span>
            <span className="text-white/50 text-xs">• Powered by Claude</span>
          </div>
          <button
            onClick={triggerInsight}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
            {aiLoading ? 'Analyzing…' : 'Refresh'}
          </button>
        </div>

        <div className="p-5 border-l-4 border-purple-500">
          {aiLoading && !insight ? (
            <div className="space-y-3">
              <SkeletonLine />
              <SkeletonLine w="w-5/6" />
              <div className="mt-3 space-y-2">
                <SkeletonLine w="w-4/5" />
                <SkeletonLine w="w-3/4" />
                <SkeletonLine w="w-4/6" />
              </div>
            </div>
          ) : insight ? (
            <>
              <div className="flex items-start justify-between gap-3 mb-3">
                <p
                  className="text-slate-700 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: insight.summary }}
                />
                <DirectionBadge direction={insight.direction} />
              </div>
              <ul className="space-y-2">
                {insight.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-slate-400 text-sm text-center py-4">
              Click <strong>Refresh</strong> to generate AI insight for {periodLabel(period)}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisTab;
