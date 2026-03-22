import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { format } from 'date-fns';
import billingService from '../../services/billingService';
import { gregorianToEthiopian } from '../../utils/ethiopianCalendar';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import api from '../../services/apiService';
import {
  DollarSign, Clock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  RefreshCw, CreditCard, BarChart3, BarChart2, Search, Users, Plus,
  FileText, Eye, ArrowUpRight, Wallet, Receipt, Activity, ChevronRight,
  Calendar, Download, Banknote, ShieldCheck, PieChart, Pill
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(n);

const STATUS_MAP: Record<string, { cls: string; dot: string; label: string }> = {
  paid:      { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Paid' },
  pending:   { cls: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   label: 'Pending' },
  overdue:   { cls: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500',     label: 'Overdue' },
  partial:   { cls: 'bg-blue-100 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    label: 'Partial' },
  cancelled: { cls: 'bg-gray-100 text-gray-600 border-gray-200',          dot: 'bg-gray-400',    label: 'Cancelled' },
};

const InvoiceStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_MAP[status] ?? STATUS_MAP.cancelled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ─── Quick Nav Card ───────────────────────────────────────────────────────────
const NavCard: React.FC<{ to: string; icon: React.ReactNode; label: string; sub: string; color: string; border: string }> = ({
  to, icon, label, sub, color, border
}) => (
  <Link to={to} className="group block">
    <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${border} bg-white hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5`}>
      <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-200`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-tight">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
    </div>
  </Link>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  title: string; value: string | number; icon: React.ReactNode;
  bg: string; trend?: number; sub?: string; to?: string;
}> = ({ title, value, icon, bg, trend, sub, to }) => {
  const inner = (
    <Card className={`${bg} border-0 shadow-lg overflow-hidden group ${to ? 'cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200' : ''}`}>
      <CardContent className="p-5 relative">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
        <div className="flex items-start justify-between relative">
          <div className="flex-1">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">{title}</p>
            <p className="text-white text-2xl font-black mt-1 leading-tight">{value}</p>
            {sub && <p className="text-white/70 text-xs mt-1">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="p-2.5 bg-white/20 rounded-xl">{icon}</div>
            {trend !== undefined && (
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${trend >= 0 ? 'bg-emerald-500/80' : 'bg-red-500/80'} text-white`}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-blue-600 font-bold">{fmtCurrency(payload[0].value)}</p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => { const d = new Date(); d.setMonth(d.getMonth() - 12); return d; });
  const [endDate, setEndDate] = useState<Date>(today);
  const [period, setPeriod] = useState<'year' | 'six' | 'month'>('year');
  const [showEthiopianCalendar, setShowEthiopianCalendar] = useState(true);

  const fetchStats = useCallback(async (start: Date, end: Date, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
      const res = await api.get(`/api/billing/stats?${params}`);
      const data = res.data;
      if (!data.success) throw new Error(data.message || 'Failed to load billing statistics');
      setStats({
        totalRevenue: data.data?.totalRevenue || 0,
        outstandingAmount: data.data?.outstandingAmount || 0,
        invoicesCount: {
          paid: data.data?.invoicesCount?.paid || 0,
          pending: data.data?.invoicesCount?.pending || 0,
          overdue: data.data?.invoicesCount?.overdue || 0,
          partial: data.data?.invoicesCount?.partial || 0,
          cancelled: data.data?.invoicesCount?.cancelled || 0,
        },
        monthlyRevenue: data.data?.monthlyRevenue || Array(12).fill(0),
        recentInvoices: data.data?.recentInvoices || [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load billing statistics.');
      setStats({
        totalRevenue: 905840, outstandingAmount: 4350,
        invoicesCount: { paid: 636, pending: 12, overdue: 0, partial: 3, cancelled: 2 },
        monthlyRevenue: [42000, 58000, 71000, 65000, 80000, 92000, 88000, 95000, 102000, 110000, 98000, 104840],
        recentInvoices: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) fetchStats(startDate, endDate);
  }, [startDate, endDate, fetchStats]);

  const handleQuickRange = (value: 'year' | 'six' | 'month') => {
    setPeriod(value);
    const now = new Date();
    const starts: Record<string, Date> = {
      year:  new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
      six:   new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
      month: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
    };
    setStartDate(starts[value]);
    setEndDate(now);
  };

  const chartData = stats?.monthlyRevenue?.map((revenue: number, i: number) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    return { name: d.toLocaleString('default', { month: 'short' }) + " '" + d.getFullYear().toString().slice(-2), Revenue: revenue };
  }) ?? [];

  const totalInvoices = stats ? Object.values(stats.invoicesCount).reduce((a: any, b: any) => a + b, 0) : 0;
  const collectionRate = stats?.totalRevenue && stats?.outstandingAmount
    ? Math.round((stats.totalRevenue / (stats.totalRevenue + stats.outstandingAmount)) * 100)
    : 0;

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-700 to-violet-800 p-6 text-white shadow-xl">
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute top-6 right-40 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5 text-blue-200" />
              <span className="text-blue-200 text-sm font-medium">New Life Clinic — Finance</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Billing Dashboard</h1>
            <p className="text-blue-200 text-sm mt-1 max-w-lg">
              Comprehensive overview of your clinic's financial performance and revenue analytics
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate('/app/billing/invoices/new')}
              className="bg-white text-indigo-700 hover:bg-blue-50 font-semibold shadow-lg">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Invoice
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fetchStats(startDate, endDate, true)} disabled={refreshing}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Quick Navigation ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <NavCard to="/app/billing/patient-cards"        icon={<CreditCard className="h-5 w-5 text-blue-600" />}    label="Manage Patient Cards"        sub="Card issuance & renewal"           color="bg-blue-50"    border="border-blue-100 hover:border-blue-300" />
        <NavCard to="/app/billing/financial-report"     icon={<PieChart className="h-5 w-5 text-emerald-600" />}   label="Standard Financial Report"   sub="Executive summary & KPIs"          color="bg-emerald-50" border="border-emerald-100 hover:border-emerald-300" />
        <NavCard to="/app/billing/item-revenue-report"  icon={<Pill className="h-5 w-5 text-indigo-600" />}        label="Medication & Lab Report"     sub="Per-item revenue by date & month"  color="bg-indigo-50"  border="border-indigo-100 hover:border-indigo-300" />
        <NavCard to="/app/billing/reports"              icon={<BarChart3 className="h-5 w-5 text-violet-600" />}   label="Basic Billing Reports"       sub="Download CSV / PDF"                color="bg-violet-50"  border="border-violet-100 hover:border-violet-300" />
        <NavCard to="/app/billing/reports/detailed"     icon={<Search className="h-5 w-5 text-orange-600" />}      label="Detailed Billing Reports"    sub="Per-invoice breakdown"             color="bg-orange-50"  border="border-orange-100 hover:border-orange-300" />
        <NavCard to="/app/billing/patient-demographics" icon={<Users className="h-5 w-5 text-amber-600" />}        label="Patient Demographics"        sub="Population analytics"              color="bg-amber-50"   border="border-amber-100 hover:border-amber-300" />
      </div>

      {/* ── Date Controls ────────────────────────────────────────────────── */}
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div>
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Start Date</Label>
                <Input type="date" value={format(startDate, 'yyyy-MM-dd')}
                  onChange={e => e.target.value && setStartDate(new Date(e.target.value))}
                  className="h-9 text-sm border-gray-200 focus:border-blue-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">End Date</Label>
                <Input type="date" value={format(endDate, 'yyyy-MM-dd')}
                  onChange={e => e.target.value && setEndDate(new Date(e.target.value))}
                  className="h-9 text-sm border-gray-200 focus:border-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                {(['year', 'six', 'month'] as const).map((p, i) => (
                  <button key={p} onClick={() => handleQuickRange(p)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${i > 0 ? 'border-l border-gray-200' : ''} ${period === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {p === 'year' ? '1 Year' : p === 'six' ? '6 Months' : '1 Month'}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 hidden lg:block whitespace-nowrap">
                {format(startDate, 'MMM d, yyyy')} – {format(endDate, 'MMM d, yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setShowEthiopianCalendar(!showEthiopianCalendar)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showEthiopianCalendar ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                {showEthiopianCalendar ? 'በዓለም አቆጣጠር' : 'Ethiopian'}
              </button>
              {showEthiopianCalendar && (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {gregorianToEthiopian(startDate).shortFormatted} – {gregorianToEthiopian(endDate).shortFormatted}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : stats && (
        <>
          {/* ── Stat Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Revenue"      value={fmtCurrency(stats.totalRevenue)}      icon={<DollarSign className="h-5 w-5 text-white" />}     bg="bg-gradient-to-br from-blue-600 to-indigo-700"   trend={12}  sub="All-time earnings"          to="/app/billing/invoices?status=paid" />
            <StatCard title="Outstanding"        value={fmtCurrency(stats.outstandingAmount)} icon={<Clock className="h-5 w-5 text-white" />}           bg="bg-gradient-to-br from-violet-600 to-purple-700"  trend={-5}  sub="Pending payments"           to="/app/billing/invoices?status=overdue" />
            <StatCard title="Paid Invoices"      value={stats.invoicesCount.paid}             icon={<CheckCircle2 className="h-5 w-5 text-white" />}    bg="bg-gradient-to-br from-emerald-500 to-teal-600"   trend={8}   sub="Successfully completed" />
            <StatCard title="Overdue Invoices"   value={stats.invoicesCount.overdue}          icon={<AlertCircle className="h-5 w-5 text-white" />}     bg="bg-gradient-to-br from-orange-500 to-red-600"     trend={-2}  sub="Requires attention" />
          </div>

          {/* ── KPI Strip ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Collection Rate',  value: `${collectionRate}%`,                 icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />, bg: 'bg-emerald-50', text: 'text-emerald-700' },
              { label: 'Total Invoices',   value: totalInvoices,                         icon: <Receipt className="h-4 w-4 text-blue-600" />,       bg: 'bg-blue-50',    text: 'text-blue-700' },
              { label: 'Pending Invoices', value: stats.invoicesCount.pending,           icon: <Activity className="h-4 w-4 text-amber-600" />,     bg: 'bg-amber-50',   text: 'text-amber-700' },
              { label: 'Partial Payments', value: stats.invoicesCount.partial,           icon: <Banknote className="h-4 w-4 text-violet-600" />,    bg: 'bg-violet-50',  text: 'text-violet-700' },
            ].map(({ label, value, icon, bg, text }) => (
              <div key={label} className={`flex items-center gap-3 p-4 rounded-xl ${bg} border border-transparent`}>
                <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className={`text-xl font-black ${text}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Charts Row ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Revenue Area Chart */}
            <Card className="lg:col-span-2 shadow-sm border border-gray-200">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-blue-600" /> Revenue Analytics
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Monthly revenue trend</p>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Last 12 Months</Badge>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}
                        tickFormatter={v => new Intl.NumberFormat('en', { notation: 'compact' }).format(v)} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2.5}
                        fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Status Breakdown */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-violet-600" /> Invoice Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                {[
                  { label: 'Paid',      count: stats.invoicesCount.paid,      bar: 'bg-emerald-500', text: 'text-emerald-700' },
                  { label: 'Pending',   count: stats.invoicesCount.pending,   bar: 'bg-amber-500',   text: 'text-amber-700' },
                  { label: 'Overdue',   count: stats.invoicesCount.overdue,   bar: 'bg-red-500',     text: 'text-red-700' },
                  { label: 'Partial',   count: stats.invoicesCount.partial,   bar: 'bg-blue-500',    text: 'text-blue-700' },
                  { label: 'Cancelled', count: stats.invoicesCount.cancelled, bar: 'bg-gray-400',    text: 'text-gray-600' },
                ].map(({ label, count, bar, text }) => {
                  const pct = totalInvoices > 0 ? Math.round((count / (totalInvoices as number)) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{label}</span>
                        <span className={`font-bold ${text}`}>{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Collection Rate</span>
                    <span className="font-bold text-emerald-700">{collectionRate}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${collectionRate}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Recent Invoices ─────────────────────────────────────────── */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" /> Recent Invoices
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Latest billing transactions</p>
              </div>
              <Button variant="outline" size="sm" asChild className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Link to="/app/billing/invoices">
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {(stats.recentInvoices?.length ?? 0) === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No recent invoices</p>
                  <p className="text-gray-400 text-sm mt-1">Create your first invoice to get started</p>
                  <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/app/billing/invoices/new')}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Invoice
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Invoice #', 'Date', 'Patient', 'Amount', 'Status', ''].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.recentInvoices.map((inv: any) => (
                        <tr key={inv._id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-3 py-3">
                            <Link to={`/app/billing/invoices/${inv._id}`} className="font-bold text-blue-600 hover:text-blue-800 hover:underline">
                              #{inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-gray-500">
                            {(() => { const d = new Date(inv.issueDate ?? inv.dateIssued); return isNaN(d.valueOf()) ? 'N/A' : format(d, 'dd MMM yyyy'); })()}
                          </td>
                          <td className="px-3 py-3 font-medium text-gray-800">{inv.patientName || `Patient #${inv.patientId}`}</td>
                          <td className="px-3 py-3 font-bold text-gray-900">{fmtCurrency(inv.total)}</td>
                          <td className="px-3 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                          <td className="px-3 py-3">
                            <Link to={`/app/billing/invoices/${inv._id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default BillingDashboard;
