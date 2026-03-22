import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Skeleton } from '../../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import {
  Download, RefreshCw, DollarSign, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon,
  Activity, ShieldCheck, Banknote, CreditCard, ChevronLeft,
  FileText, Target, Wallet, ArrowUpRight, ArrowDownRight,
  Building2, Stethoscope, Calendar, Info
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { format } from 'date-fns';
import billingService from '../../../services/billingService';
import { useNavigate, Link } from 'react-router-dom';
import { gregorianToEthiopian } from '../../../utils/ethiopianCalendar';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FinancialSummary {
  totalRevenue: number;      // invoiced (accrual) total
  totalInvoiced?: number;    // alias for totalRevenue
  totalCollections: number;  // cash actually collected
  totalCollected?: number;
  totalPaid?: number;
  totalOutstanding: number;  // always >= 0
  totalOverdue: number;      // always >= 0
  totalCostOfGoodsSold: number; grossProfit: number;
  grossMargin: number; operatingExpenses: number; netProfit: number;
  netMargin: number; averageInvoiceValue: number; collectionRate: number;
}
interface AgingData { current: number; days30: number; days60: number; days90: number; over90: number; }
interface MonthlyData { month: string; revenue: number; collections: number; outstanding: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (n?: number) => {
  if (n === undefined || n === null || isNaN(n)) return 'ETB 0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(n);
};
const fmtPct = (v?: number) => (v === undefined || v === null || isNaN(v)) ? '0.0%' : `${v.toFixed(1)}%`;
const fmtCompact = (v: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Custom Tooltips ──────────────────────────────────────────────────────────
const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500 capitalize">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.dataKey}
          </span>
          <span className="font-bold" style={{ color: p.color }}>{fmtCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="font-bold text-blue-600">{fmtCurrency(payload[0].value)}</p>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  title: string; value: string; icon: React.ReactNode; bg: string;
  sub?: string; trend?: number; badge?: string;
}> = ({ title, value, icon, bg, sub, trend, badge }) => (
  <Card className={`${bg} border-0 shadow-lg overflow-hidden`}>
    <CardContent className="p-5 relative">
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/10 -translate-y-10 translate-x-10" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-white/20 rounded-xl">{icon}</div>
          {trend !== undefined && (
            <span className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-bold ${trend >= 0 ? 'bg-emerald-500/80' : 'bg-red-500/80'} text-white`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)}%
            </span>
          )}
          {badge && <span className="text-xs font-semibold text-white/70 bg-white/20 px-2 py-1 rounded-full">{badge}</span>}
        </div>
        <p className="text-white/75 text-xs font-semibold uppercase tracking-wider">{title}</p>
        <p className="text-white text-xl font-black mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
const KpiTile: React.FC<{ label: string; value: string; sub?: string; color: string; icon: React.ReactNode }> = ({
  label, value, sub, color, icon
}) => (
  <div className={`flex items-center gap-4 p-4 rounded-xl border bg-white shadow-sm`}>
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-black text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Aging Row ────────────────────────────────────────────────────────────────
const AgingRow: React.FC<{ label: string; pctLabel: string; amount: string; pct: number; color: string; risk: string; riskCls: string; dotCls: string }> = ({
  label, pctLabel, amount, pct, color, risk, riskCls, dotCls
}) => (
  <div className="py-3 border-b border-gray-50 last:border-0">
    {/* Top row: label + risk badge */}
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${riskCls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
        {risk}
      </span>
    </div>
    {/* Progress bar */}
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
    {/* Bottom row: amount + percentage */}
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-gray-900">{amount}</span>
      <span className="text-xs text-gray-400 font-medium">{pctLabel}</span>
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; sub?: string }> = ({ icon, title, sub }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="p-2 bg-gray-100 rounded-xl">{icon}</div>
    <div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const StandardFinancialReport: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d; });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showEthiopianCalendar, setShowEthiopianCalendar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [agingData, setAgingData] = useState<AgingData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [revenueByService, setRevenueByService] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [summaryRes, agingRes, monthlyRes, serviceRes, paymentRes, statsRes] = await Promise.all([
        billingService.getFinancialSummary(startDate, endDate),
        billingService.getAccountsReceivableAging(),
        billingService.getMonthlyFinancialData(startDate, endDate),
        billingService.getRevenueByService(startDate, endDate),
        billingService.getPaymentMethodBreakdown(startDate, endDate),
        billingService.getBillingStats(startDate, endDate),
      ]);
      setFinancialSummary(summaryRes || { totalRevenue: 0, totalOutstanding: 0, totalPaid: 0, totalOverdue: 0, totalCostOfGoodsSold: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: 0, netProfit: 0, netMargin: 0, averageInvoiceValue: 0, collectionRate: 0 });
      setAgingData(agingRes || { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });
      setMonthlyData(Array.isArray(monthlyRes) ? monthlyRes : []);
      // Normalize API shape { service, revenue } → { name, value, shortName, category }
      const rawServices = Array.isArray(serviceRes) ? serviceRes : [];
      setRevenueByService(
        rawServices
          .filter((s: any) => s && (s.revenue ?? s.value) > 0)
          .map((s: any) => {
            const fullName: string = s.service ?? s.name ?? 'Unknown';
            // Strip dosage parenthetical: "Medication: Ceftriaxone (5 doses...)" → "Ceftriaxone"
            const withoutDosage = fullName.replace(/\s*\([^)]*doses[^)]*\)/gi, '').trim();
            // Detect category prefix like "Medication:", "Lab test:", etc.
            const catMatch = withoutDosage.match(/^(Medication|Lab test|Lab|Procedure|Service|Consultation|Imaging|Supply):\s*/i);
            const category = catMatch ? catMatch[1].toLowerCase() : 'other';
            const shortName = catMatch ? withoutDosage.replace(catMatch[0], '').trim() : withoutDosage;
            return {
              name: fullName,
              shortName: shortName.length > 22 ? shortName.slice(0, 22) + '…' : shortName,
              displayName: shortName,
              category,
              value: s.revenue ?? s.value ?? 0,
              quantity: s.quantity ?? 0,
              averagePrice: s.averagePrice ?? 0,
            };
          })
          .slice(0, 8)
      );
      setPaymentMethods(Array.isArray(paymentRes) ? paymentRes : []);
      setDashboardStats(statsRes || null);
    } catch (err: any) {
      const status = err.response?.status;
      setError(
        status === 401 ? 'Authentication required. Please log in.' :
          status === 403 ? 'Access denied. Admin or Finance role required.' :
            'Failed to load financial data. Please try again.'
      );
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const downloadReport = async (type: 'pdf' | 'csv') => {
    try {
      setLoading(true);
      const blob = await billingService.generateStandardFinancialReport(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Standard_Financial_Report_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.${type}`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError(`Failed to generate ${type.toUpperCase()} report`); }
    finally { setLoading(false); }
  };

  const fs = financialSummary;
  const totalAging = agingData ? (agingData.current + agingData.days30 + agingData.days60 + agingData.days90 + agingData.over90) : 1;
  const dso = fs && fs.totalRevenue > 0 ? Math.round((fs.totalOutstanding / fs.totalRevenue) * 365) : 0;
  const profitMarginPct = fs && fs.totalRevenue > 0 ? (fs.netProfit / fs.totalRevenue) * 100 : 0;
  const workingCapital = fs && fs.totalRevenue > 0 ? ((fs.totalRevenue - fs.totalOutstanding) / fs.totalRevenue * 100) : 0;

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading && !fs) return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-6 text-white shadow-xl">
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-emerald-200" />
              <span className="text-emerald-200 text-sm font-medium">New Life Clinic — Finance</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Standard Financial Report</h1>
            <p className="text-emerald-200 text-sm mt-1">
              Comprehensive financial analysis and performance metrics
            </p>
            <p className="text-emerald-300/70 text-xs mt-1">
              {format(startDate, 'MMM d, yyyy')} – {format(endDate, 'MMM d, yyyy')}
            </p>
            {showEthiopianCalendar && (
              <p className="text-emerald-200/90 text-xs mt-0.5 flex items-center gap-1">
                <span className="opacity-80">በዓለም አቆጣጠር:</span>
                {gregorianToEthiopian(startDate).formatted} – {gregorianToEthiopian(endDate).formatted}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => downloadReport('pdf')} disabled={loading}
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-lg">
              <Download className="h-3.5 w-3.5 mr-1.5" /> PDF Report
            </Button>
            <Button size="sm" variant="secondary" onClick={() => downloadReport('csv')} disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
              <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
            </Button>
            <Button size="sm" variant="secondary" onClick={fetchData} disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Date Range Controls ──────────────────────────────────────────── */}
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Start Date</Label>
                <Input type="date" value={format(startDate, 'yyyy-MM-dd')}
                  onChange={e => e.target.value && setStartDate(new Date(e.target.value))}
                  className="h-9 text-sm border-gray-200 focus:border-emerald-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">End Date</Label>
                <Input type="date" value={format(endDate, 'yyyy-MM-dd')}
                  onChange={e => e.target.value && setEndDate(new Date(e.target.value))}
                  className="h-9 text-sm border-gray-200 focus:border-emerald-400" />
              </div>
              {/* Ethiopian calendar toggle */}
              <div className="col-span-2 flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEthiopianCalendar(!showEthiopianCalendar)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showEthiopianCalendar
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {showEthiopianCalendar ? 'በዓለም አቆጣጠር (Ethiopian)' : 'Show Ethiopian Calendar'}
                </button>
                {showEthiopianCalendar && (
                  <span className="text-xs text-gray-500">
                    {gregorianToEthiopian(startDate).shortFormatted} – {gregorianToEthiopian(endDate).shortFormatted}
                  </span>
                )}
              </div>
            </div>
            {/* Quick presets */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: '1M', months: 1 }, { label: '3M', months: 3 },
                { label: '6M', months: 6 }, { label: '1Y', months: 12 },
              ].map(({ label, months }) => (
                <button key={label} onClick={() => { const d = new Date(); d.setMonth(d.getMonth() - months); setStartDate(d); setEndDate(new Date()); }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {fs && (
        <>
          {/* ── No Data Notice ─────────────────────────────────────────── */}
          {fs.totalRevenue === 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 ml-2">
                No financial data found for this period. Try adjusting the date range or create some invoices.
              </AlertDescription>
            </Alert>
          )}

          {/* ── Executive Summary Cards ─────────────────────────────────── */}
          <div>
            <SectionHeader icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} title="Executive Summary" sub="High-level financial overview for the selected period" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Total Revenue" value={fmtCurrency(fs.totalInvoiced ?? fs.totalRevenue)} icon={<DollarSign className="h-5 w-5 text-white" />} bg="bg-gradient-to-br from-blue-600 to-indigo-700" sub="Total invoiced amount" />
              <StatCard title="Collections" value={fmtCurrency(fs.totalCollections)} icon={<CheckCircle2 className="h-5 w-5 text-white" />} bg="bg-gradient-to-br from-emerald-500 to-teal-600" sub={dashboardStats?.invoicesCount?.paid ? `${dashboardStats.invoicesCount.paid} paid invoices` : 'Cash received'} />
              <StatCard title="Outstanding" value={fmtCurrency(fs.totalOutstanding)} icon={<Clock className="h-5 w-5 text-white" />} bg="bg-gradient-to-br from-amber-500 to-orange-600" sub="Pending collection" />
              <StatCard title="Overdue" value={fmtCurrency(fs.totalOverdue)} icon={<AlertTriangle className="h-5 w-5 text-white" />} bg="bg-gradient-to-br from-red-500 to-rose-700" sub="Requires attention" />
            </div>
          </div>

          {/* ── KPI Row ─────────────────────────────────────────────────── */}
          <div>
            <SectionHeader icon={<Target className="h-5 w-5 text-blue-600" />} title="Key Performance Indicators" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiTile label="Collection Rate" value={fmtPct(fs.collectionRate)} sub="Revenue collected" color="bg-emerald-50" icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />} />
              <KpiTile label="Avg Invoice Value" value={fmtCurrency(fs.averageInvoiceValue)} sub="Per invoice" color="bg-blue-50" icon={<FileText className="h-5 w-5 text-blue-600" />} />
              <KpiTile label="Gross Profit" value={fmtCurrency(fs.grossProfit)} sub={fmtPct(fs.grossMargin)} color="bg-violet-50" icon={<TrendingUp className="h-5 w-5 text-violet-600" />} />
              <KpiTile label="Net Profit" value={fmtCurrency(fs.netProfit)} sub={fmtPct(fs.netMargin)} color={fs.netProfit >= 0 ? 'bg-teal-50' : 'bg-red-50'} icon={<Wallet className={`h-5 w-5 ${fs.netProfit >= 0 ? 'text-teal-600' : 'text-red-600'}`} />} />
            </div>
          </div>

          {/* ── Cost & Profit Analysis ───────────────────────────────────── */}
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <SectionHeader icon={<BarChart3 className="h-5 w-5 text-violet-600" />} title="Cost & Profit Analysis" sub="Revenue breakdown and margin analysis" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Revenue waterfall */}
                <div className="space-y-0">
                  {[
                    { label: 'Total Revenue', value: fmtCurrency(fs.totalInvoiced ?? fs.totalRevenue), cls: 'text-blue-700 font-black', border: 'border-blue-100 bg-blue-50/50' },
                    { label: 'Cost of Goods Sold', value: `−${fmtCurrency(fs.totalCostOfGoodsSold)}`, cls: 'text-red-600 font-semibold', border: 'border-red-100 bg-red-50/30' },
                    { label: 'Gross Profit', value: `${fmtCurrency(fs.grossProfit)} (${fmtPct(fs.grossMargin)})`, cls: 'text-emerald-700 font-black', border: 'border-emerald-100 bg-emerald-50/50', divider: true },
                    { label: 'Operating Expenses', value: `−${fmtCurrency(fs.operatingExpenses)}`, cls: 'text-red-600 font-semibold', border: 'border-red-100 bg-red-50/30' },
                    { label: 'Net Profit', value: `${fmtCurrency(fs.netProfit)} (${fmtPct(fs.netMargin)})`, cls: `${fs.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'} font-black`, border: `${fs.netProfit >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`, divider: true },
                  ].map(({ label, value, cls, border, divider }) => (
                    <div key={label}>
                      {divider && <div className="h-px bg-gray-200 my-1" />}
                      <div className={`flex justify-between items-center px-4 py-3 rounded-xl border ${border} mb-1`}>
                        <span className="text-sm text-gray-600 font-medium">{label}</span>
                        <span className={`text-sm ${cls}`}>{value}</span>
                      </div>
                    </div>
                  ))}
                  {fs.operatingExpenses === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                      Only expenses with a date in this period are included ({format(startDate, 'MMM d, yyyy')} – {format(endDate, 'MMM d, yyyy')}). Add monthly expenses in <Link to="/app/billing/expense-manager" className="font-semibold text-amber-800 underline hover:no-underline">Add Expense</Link> and set the date to a day within this month to see them here.
                    </p>
                  )}
                </div>

                {/* Margin gauges */}
                <div className="space-y-5">
                  {[
                    { label: 'Gross Margin', value: fs.grossMargin, color: 'bg-violet-500', text: 'text-violet-700' },
                    { label: 'Net Margin', value: fs.netMargin, color: fs.netMargin >= 0 ? 'bg-emerald-500' : 'bg-red-500', text: fs.netMargin >= 0 ? 'text-emerald-700' : 'text-red-700' },
                    { label: 'Collection Rate', value: fs.collectionRate, color: 'bg-blue-500', text: 'text-blue-700' },
                  ].map(({ label, value, color, text }) => (
                    <div key={label} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">{label}</span>
                        <span className={`text-xl font-black ${text}`}>{fmtPct(value)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Revenue Trend Chart ──────────────────────────────────────── */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl"><Activity className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <CardTitle className="text-base font-semibold">Revenue & Collections Trend</CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">Monthly comparison of revenue vs collections</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Collections</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {monthlyData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}
                        tickFormatter={v => fmtCompact(v)} />
                      <RechartsTooltip content={<AreaTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                      <Area type="monotone" dataKey="collections" stroke="#10b981" strokeWidth={2.5} fill="url(#colGrad)" dot={false} activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                  <Activity className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">No monthly trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Aging + Charts Row ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Accounts Receivable Aging */}
            <Card className="lg:col-span-1 shadow-sm border border-gray-200">
              <CardContent className="p-5">
                <SectionHeader icon={<Clock className="h-5 w-5 text-amber-600" />} title="AR Aging Analysis" sub="Receivables by age bucket" />
                {agingData && (
                  <div>
                    {[
                      { label: '0–30 days', amount: agingData.current, risk: 'Low', riskCls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotCls: 'bg-emerald-500', color: 'bg-emerald-500' },
                      { label: '31–60 days', amount: agingData.days30, risk: 'Medium', riskCls: 'bg-amber-50 text-amber-700 border-amber-200', dotCls: 'bg-amber-500', color: 'bg-amber-500' },
                      { label: '61–90 days', amount: agingData.days60, risk: 'High', riskCls: 'bg-orange-50 text-orange-700 border-orange-200', dotCls: 'bg-orange-500', color: 'bg-orange-500' },
                      { label: '90+ days', amount: agingData.over90, risk: 'Critical', riskCls: 'bg-red-50 text-red-700 border-red-200', dotCls: 'bg-red-500', color: 'bg-red-500' },
                    ].map(({ label, amount, risk, riskCls, dotCls, color }) => {
                      const pct = totalAging > 0 ? (amount / totalAging) * 100 : 0;
                      return (
                        <AgingRow key={label} label={label} pctLabel={`${pct.toFixed(0)}%`}
                          amount={fmtCurrency(amount)} pct={pct} color={color}
                          risk={risk} riskCls={riskCls} dotCls={dotCls} />
                      );
                    })}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Total Outstanding</span>
                      <span className="font-black text-gray-900">{fmtCurrency(fs.totalOutstanding)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue by Service */}
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-5">
                <SectionHeader icon={<Stethoscope className="h-5 w-5 text-violet-600" />} title="Revenue by Service" sub="Top services by revenue" />
                {revenueByService.length > 0 ? (() => {
                  const total = revenueByService.reduce((s, r) => s + r.value, 0);
                  const CAT_BADGE: Record<string, string> = {
                    medication: 'bg-blue-50 text-blue-700 border-blue-200',
                    'lab test': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    lab: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    procedure: 'bg-violet-50 text-violet-700 border-violet-200',
                    consultation: 'bg-amber-50 text-amber-700 border-amber-200',
                    imaging: 'bg-cyan-50 text-cyan-700 border-cyan-200',
                    supply: 'bg-orange-50 text-orange-700 border-orange-200',
                    other: 'bg-gray-100 text-gray-600 border-gray-200',
                  };
                  return (
                    <div className="flex flex-col gap-3">
                      {/* Donut chart — uses shortName so labels don't overflow */}
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={revenueByService}
                              cx="50%" cy="50%"
                              innerRadius={42} outerRadius={68}
                              dataKey="value"
                              nameKey="shortName"
                              paddingAngle={2}
                            >
                              {revenueByService.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              formatter={(v: number, _n: string, entry: any) => [
                                `${fmtCurrency(v)}  (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`,
                                entry.payload.displayName,
                              ]}
                              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)', fontSize: 12, maxWidth: 240 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legend rows */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                        {revenueByService.map((item, i) => {
                          const pct = total > 0 ? (item.value / total) * 100 : 0;
                          const badgeCls = CAT_BADGE[item.category] ?? CAT_BADGE.other;
                          return (
                            <div key={item.name} className="group rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all p-2.5">
                              {/* Top: color dot + category badge + percentage */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize ${badgeCls}`}>
                                  {item.category === 'lab test' ? 'Lab' : item.category}
                                </span>
                                <span className="ml-auto text-xs font-bold text-gray-500">{pct.toFixed(1)}%</span>
                              </div>
                              {/* Service name */}
                              <p className="text-xs font-semibold text-gray-800 leading-snug mb-1" title={item.name}>
                                {item.displayName}
                              </p>
                              {/* Bottom: revenue + qty */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-gray-900">{fmtCurrency(item.value)}</span>
                                {item.quantity > 0 && (
                                  <span className="text-[10px] text-gray-400">×{item.quantity} units</span>
                                )}
                              </div>
                              {/* Mini progress bar */}
                              <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min(pct, 100)}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer total */}
                      <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">{revenueByService.length} services</span>
                        <span className="font-black text-gray-900">{fmtCurrency(total)}</span>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                    <PieChartIcon className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">No service data available</p>
                    <p className="text-xs mt-1 text-gray-300">Create invoices with service items to see breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods Bar */}
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-5">
                <SectionHeader icon={<CreditCard className="h-5 w-5 text-blue-600" />} title="Payment Methods" />
                {paymentMethods.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentMethods} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="method" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => fmtCompact(v)} />
                        <RechartsTooltip content={<BarTooltip />} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {paymentMethods.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                    <Banknote className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">No payment data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Financial Health Indicators ──────────────────────────────── */}
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <SectionHeader icon={<Activity className="h-5 w-5 text-teal-600" />} title="Financial Health Indicators" sub="Key ratios and liquidity metrics" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Days Sales Outstanding',
                    value: `${dso} days`,
                    sub: 'Average collection period',
                    icon: <Calendar className="h-6 w-6 text-blue-600" />,
                    bg: 'bg-blue-50', border: 'border-blue-100',
                    note: dso <= 30 ? { label: 'Excellent', cls: 'bg-emerald-100 text-emerald-700' } : dso <= 60 ? { label: 'Good', cls: 'bg-amber-100 text-amber-700' } : { label: 'Needs Attention', cls: 'bg-red-100 text-red-700' },
                  },
                  {
                    title: 'Profit Margin',
                    value: fmtPct(profitMarginPct),
                    sub: 'Net profit percentage',
                    icon: <TrendingUp className="h-6 w-6 text-emerald-600" />,
                    bg: profitMarginPct >= 0 ? 'bg-emerald-50' : 'bg-red-50',
                    border: profitMarginPct >= 0 ? 'border-emerald-100' : 'border-red-100',
                    note: profitMarginPct >= 20 ? { label: 'Excellent', cls: 'bg-emerald-100 text-emerald-700' } : profitMarginPct >= 10 ? { label: 'Good', cls: 'bg-amber-100 text-amber-700' } : { label: 'Review Needed', cls: 'bg-red-100 text-red-700' },
                  },
                  {
                    title: 'Working Capital Ratio',
                    value: `${workingCapital.toFixed(1)}%`,
                    sub: 'Liquidity indicator',
                    icon: <Wallet className="h-6 w-6 text-violet-600" />,
                    bg: 'bg-violet-50', border: 'border-violet-100',
                    note: workingCapital >= 70 ? { label: 'Strong', cls: 'bg-emerald-100 text-emerald-700' } : workingCapital >= 50 ? { label: 'Adequate', cls: 'bg-amber-100 text-amber-700' } : { label: 'Weak', cls: 'bg-red-100 text-red-700' },
                  },
                ].map(({ title, value, sub, icon, bg, border, note }) => (
                  <div key={title} className={`p-5 rounded-2xl border-2 ${bg} ${border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 bg-white rounded-xl shadow-sm">{icon}</div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${note.cls}`}>{note.label}</span>
                    </div>
                    <p className="text-4xl font-black text-gray-900 leading-tight">{value}</p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StandardFinancialReport;
