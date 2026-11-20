import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import {
  Calendar, RefreshCw, Printer, Download, DollarSign, CheckCircle2,
  Clock, AlertTriangle, TrendingUp, TrendingDown, CreditCard, Banknote,
  Search, Filter, Wallet, ArrowUpRight, ArrowDownRight, FileText,
  ShieldCheck, Eye, ChevronRight, PieChart, Activity, User, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import billingService from '../../../services/billingService';
import * as expenseService from '../../../services/expenseService';
import { gregorianToEthiopian } from '../../../utils/ethiopianCalendar';
import EthiopianDatePickerInline from '../../../components/EthiopianDatePickerInline';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (n?: number) => {
  if (n === undefined || n === null || isNaN(n)) return 'ETB 0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(n);
};

const fmtPct = (v?: number) => (v === undefined || v === null || isNaN(v)) ? '0.0%' : `${v.toFixed(1)}%`;

const STATUS_MAP: Record<string, { cls: string; dot: string; label: string }> = {
  paid:      { cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Paid' },
  pending:   { cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',       dot: 'bg-amber-500',   label: 'Pending' },
  overdue:   { cls: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300',             dot: 'bg-red-500',     label: 'Overdue' },
  partial:   { cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',          dot: 'bg-blue-500',    label: 'Partial' },
  cancelled: { cls: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-800 dark:text-gray-300',          dot: 'bg-gray-400',    label: 'Cancelled' },
};

const InvoiceStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_MAP[status?.toLowerCase()] ?? STATUS_MAP.cancelled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

export const DailyFinancialReport: React.FC = () => {
  const navigate = useNavigate();
  const { getToken, user } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEthiopianCalendar, setShowEthiopianCalendar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [reportData, setReportData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<number>(0);
  const [expenseItems, setExpenseItems] = useState<any[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const formattedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  const isToday = useMemo(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd') === formattedDateStr;
  }, [formattedDateStr]);

  const isYesterday = useMemo(() => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    return format(yest, 'yyyy-MM-dd') === formattedDateStr;
  }, [formattedDateStr]);

  const fetchDailyData = useCallback(async (date: Date, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      // 1. Fetch detailed invoices and summary for this specific date
      const detailedRes = await billingService.getDetailedBillingReport(dateStr, dateStr);

      if (detailedRes && detailedRes.success) {
        setReportData(detailedRes.data);
        setInvoices(detailedRes.data?.invoices || []);
      } else {
        setReportData(null);
        setInvoices([]);
      }

      // 2. Fetch operating expenses recorded on this day
      try {
        const token = getToken();
        if (token) {
          const expRes = await expenseService.fetchExpenses(dateStr, dateStr, token);
          if (Array.isArray(expRes)) {
            setExpenseItems(expRes);
            const totalExp = expRes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            setDailyExpenses(totalExp);
          } else {
            setExpenseItems([]);
            setDailyExpenses(0);
          }
        }
      } catch (expErr) {
        console.warn('Could not fetch daily expenses:', expErr);
        setDailyExpenses(0);
        setExpenseItems([]);
      }
    } catch (err: any) {
      console.error('Failed to load daily financial data:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load daily report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchDailyData(selectedDate);
  }, [selectedDate, fetchDailyData]);

  // Handle Quick Day Buttons
  const handleSelectToday = () => {
    setSelectedDate(new Date());
  };

  const handleSelectYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setSelectedDate(yest);
  };

  // Calculation summaries
  const summary = reportData?.summary || {
    totalRevenue: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalCashPayments: 0,
    totalBankPayments: 0,
    totalInsurancePayments: 0,
    totalOtherPayments: 0,
    totalInvoices: 0
  };

  // Calculate Telebirr / CBE / Cash splits from invoices if detailed payments exist
  const paymentBreakdown = useMemo(() => {
    let cash = summary.totalCashPayments || 0;
    let bank = summary.totalBankPayments || 0;
    let insurance = summary.totalInsurancePayments || 0;
    let other = summary.totalOtherPayments || 0;
    let telebirr = 0;
    let cbe = 0;

    // Scan invoices for specific mobile money / bank notes
    invoices.forEach(inv => {
      const allPayments = (inv.payments || []).concat(inv.paymentHistory || []);
      allPayments.forEach((p: any) => {
        const method = (p.method || '').toLowerCase();
        const ref = (p.reference || '').toLowerCase();
        const note = (p.notes || '').toLowerCase();
        const amt = Number(p.amount) || 0;

        if (method === 'telebirr' || ref.includes('telebirr') || note.includes('telebirr')) {
          telebirr += amt;
        } else if (ref.includes('cbe') || note.includes('cbe') || inv.bankName?.toLowerCase()?.includes('commercial')) {
          cbe += amt;
        }
      });
    });

    const totalCollected = summary.totalPaid || 0;

    return {
      cash,
      bank,
      insurance,
      telebirr,
      cbe,
      other,
      totalCollected
    };
  }, [summary, invoices]);

  // Net Cash Flow for the day = Collections - Expenses
  const netDailyCashFlow = (summary.totalPaid || 0) - dailyExpenses;
  const collectionRate = summary.totalRevenue > 0
    ? ((summary.totalPaid || 0) / summary.totalRevenue) * 100
    : 0;

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Search
      const pName = (inv.patientName || '').toLowerCase();
      const invNum = (inv.invoiceNumber || '').toLowerCase();
      const bName = (inv.bankName || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || pName.includes(query) || invNum.includes(query) || bName.includes(query);

      // Status
      const matchesStatus = statusFilter === 'all' || inv.status?.toLowerCase() === statusFilter;

      // Payment Method
      let matchesPayment = true;
      if (paymentFilter === 'cash') matchesPayment = (inv.cashPayments || 0) > 0;
      else if (paymentFilter === 'bank') matchesPayment = (inv.bankPayments || 0) > 0;
      else if (paymentFilter === 'insurance') matchesPayment = (inv.insurancePayments || 0) > 0;
      else if (paymentFilter === 'other') matchesPayment = (inv.otherPayments || 0) > 0;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [invoices, searchQuery, statusFilter, paymentFilter]);

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    if (!filteredInvoices.length) return;
    const headers = ['Invoice #', 'Patient Name', 'Issue Time', 'Total (ETB)', 'Paid (ETB)', 'Balance (ETB)', 'Status', 'Payment Method'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      `"${inv.patientName || 'Unknown'}"`,
      format(new Date(inv.issueDate), 'HH:mm'),
      inv.total || 0,
      inv.amountPaid || 0,
      inv.balance || 0,
      inv.status,
      inv.bankName || (inv.cashPayments > 0 ? 'Cash' : inv.insurancePayments > 0 ? 'Insurance' : 'Other')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Revenue_${formattedDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">

      {/* ── Header Card ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 p-6 text-white shadow-xl border border-indigo-800/40 print:bg-white print:text-black print:border-b-2 print:border-black print:p-2">
        <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-blue-500/10 blur-2xl print:hidden" />
        <div className="absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-indigo-500/10 blur-xl print:hidden" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5 print:hidden">
                <Activity className="h-3 w-3 text-cyan-400" /> Daily Financial Audit
              </span>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  ● TODAY'S LIVE CLOSING
                </span>
              )}
              {isYesterday && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  YESTERDAY'S REPORT
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Daily Financial Report</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Day-end collections, cashier handover reconciliation, itemized revenue, and daily expenses.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-blue-200/90 font-medium">
              <span>Gregorian: <strong>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</strong></span>
              <span>•</span>
              <span>የቀን አቆጣጠር: <strong>{gregorianToEthiopian(selectedDate).formatted}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-md gap-1.5"
            >
              <Printer className="h-4 w-4 text-indigo-600" /> Print Daily Closing
            </Button>
            <Button
              onClick={handleExportCSV}
              size="sm"
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button
              onClick={() => fetchDailyData(selectedDate, true)}
              size="sm"
              variant="outline"
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Date Picker Controls ────────────────────────────────────────────── */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-800 print:hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Quick buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleSelectToday}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isToday
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleSelectYesterday}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isYesterday
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setShowEthiopianCalendar(!showEthiopianCalendar)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  showEthiopianCalendar
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {showEthiopianCalendar ? 'የኢትዮጵያ ቀን መቁጠሪያ' : 'Ethiopian Calendar'}
                </span>
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Select Date:
              </span>
              {showEthiopianCalendar ? (
                <div className="w-56">
                  <EthiopianDatePickerInline
                    value={selectedDate}
                    onChange={date => date && setSelectedDate(date)}
                    focusClassName="focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              ) : (
                <Input
                  type="date"
                  value={formattedDateStr}
                  onChange={e => e.target.value && setSelectedDate(new Date(e.target.value))}
                  className="h-10 text-sm w-44 rounded-xl border-slate-300 focus:border-blue-500"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-900 dark:bg-red-950/30 dark:border-red-900/50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm font-medium ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Key Daily Metrics Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Collections */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between opacity-80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Collections</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 leading-tight">{fmtCurrency(summary.totalPaid)}</p>
          <p className="text-[11px] text-emerald-100 font-medium mt-1">Actual cash/digital received</p>
        </div>

        {/* Total Invoiced */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between opacity-80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Invoiced</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 leading-tight">{fmtCurrency(summary.totalRevenue)}</p>
          <p className="text-[11px] text-blue-100 font-medium mt-1">{summary.totalInvoices} invoices issued</p>
        </div>

        {/* Outstanding / Pending */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between opacity-80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Uncollected</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 leading-tight">{fmtCurrency(summary.totalOutstanding)}</p>
          <p className="text-[11px] text-amber-100 font-medium mt-1">Pending balance for day</p>
        </div>

        {/* Daily Expenses */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between opacity-80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Daily Expenses</span>
            <ArrowDownRight className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 leading-tight">{fmtCurrency(dailyExpenses)}</p>
          <p className="text-[11px] text-rose-100 font-medium mt-1">{expenseItems.length} expenses logged</p>
        </div>

        {/* Net Daily Cash Balance */}
        <div className={`p-4 rounded-2xl ${netDailyCashFlow >= 0 ? 'bg-gradient-to-br from-cyan-600 to-blue-700' : 'bg-gradient-to-br from-purple-700 to-red-800'} text-white shadow-md relative overflow-hidden`}>
          <div className="flex items-center justify-between opacity-80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Cash Flow</span>
            <Wallet className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 leading-tight">{fmtCurrency(netDailyCashFlow)}</p>
          <p className="text-[11px] text-cyan-100 font-medium mt-1">Collections − Expenses</p>
        </div>

        {/* Collection Efficiency */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between opacity-80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Collection Rate</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 leading-tight">{fmtPct(collectionRate)}</p>
          <p className="text-[11px] text-violet-100 font-medium mt-1">Day collection efficiency</p>
        </div>
      </div>

      {/* ── Cashier Shift Handover & Channel Breakdown ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Channels Card */}
        <Card className="lg:col-span-2 shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-emerald-600" />
                  Collection Channels & Payment Breakdown
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed distribution across Cash, Telebirr, CBE, Bank transfers, and Insurance
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                Total: {fmtCurrency(summary.totalPaid)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {/* Cash Box */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                  <span>Physical Cash</span>
                  <Banknote className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white">{fmtCurrency(summary.totalCashPayments)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {summary.totalPaid > 0 ? fmtPct((summary.totalCashPayments / summary.totalPaid) * 100) : '0%'} of collections
                </p>
              </div>

              {/* Bank Transfers */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/60 dark:bg-blue-950/20">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  <span>Bank & CBE</span>
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white">{fmtCurrency(summary.totalBankPayments)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {summary.totalPaid > 0 ? fmtPct((summary.totalBankPayments / summary.totalPaid) * 100) : '0%'} of collections
                </p>
              </div>

              {/* Insurance */}
              <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-200/60 dark:bg-violet-950/20">
                <div className="flex items-center justify-between text-xs font-semibold text-violet-800 dark:text-violet-300 mb-1">
                  <span>Insurance</span>
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white">{fmtCurrency(summary.totalInsurancePayments)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {summary.totalPaid > 0 ? fmtPct((summary.totalInsurancePayments / summary.totalPaid) * 100) : '0%'} of collections
                </p>
              </div>

              {/* Other Payments */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/50">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Other / Digital</span>
                  <Wallet className="h-4 w-4 text-slate-600" />
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white">{fmtCurrency(summary.totalOtherPayments)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {summary.totalPaid > 0 ? fmtPct((summary.totalOtherPayments / summary.totalPaid) * 100) : '0%'} of collections
                </p>
              </div>
            </div>

            {/* Visual Channel Progress bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                <span>Collections Proportion</span>
                <span>100% Total Channel Receipts</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                <div
                  style={{ width: `${summary.totalPaid > 0 ? (summary.totalCashPayments / summary.totalPaid) * 100 : 0}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`Cash: ${fmtCurrency(summary.totalCashPayments)}`}
                />
                <div
                  style={{ width: `${summary.totalPaid > 0 ? (summary.totalBankPayments / summary.totalPaid) * 100 : 0}%` }}
                  className="bg-blue-500 h-full transition-all duration-500"
                  title={`Bank: ${fmtCurrency(summary.totalBankPayments)}`}
                />
                <div
                  style={{ width: `${summary.totalPaid > 0 ? (summary.totalInsurancePayments / summary.totalPaid) * 100 : 0}%` }}
                  className="bg-violet-500 h-full transition-all duration-500"
                  title={`Insurance: ${fmtCurrency(summary.totalInsurancePayments)}`}
                />
                <div
                  style={{ width: `${summary.totalPaid > 0 ? (summary.totalOtherPayments / summary.totalPaid) * 100 : 0}%` }}
                  className="bg-amber-500 h-full transition-all duration-500"
                  title={`Other: ${fmtCurrency(summary.totalOtherPayments)}`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Cash ({fmtCurrency(summary.totalCashPayments)})</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Bank / CBE ({fmtCurrency(summary.totalBankPayments)})</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Insurance ({fmtCurrency(summary.totalInsurancePayments)})</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Other ({fmtCurrency(summary.totalOtherPayments)})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shift Handover Closing Voucher */}
        <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Cashier Closing & Handover
            </CardTitle>
            <p className="text-xs text-slate-500">Summary for safe deposit & shift closing</p>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Cash Collected at Counter:</span>
              <span className="font-bold text-slate-900 dark:text-white">{fmtCurrency(summary.totalCashPayments)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Mobile & Bank Collections:</span>
              <span className="font-bold text-slate-900 dark:text-white">{fmtCurrency(summary.totalBankPayments + summary.totalOtherPayments)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Corporate & Insurance Claims:</span>
              <span className="font-bold text-slate-900 dark:text-white">{fmtCurrency(summary.totalInsurancePayments)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800 text-rose-600 dark:text-rose-400">
              <span>Less: Cash Operating Expenses:</span>
              <span className="font-bold">−{fmtCurrency(dailyExpenses)}</span>
            </div>
            <div className="flex justify-between py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">Physical Cash to Deposit:</span>
              <span className="font-black text-emerald-900 dark:text-emerald-200 text-sm">
                {fmtCurrency(Math.max(0, summary.totalCashPayments - dailyExpenses))}
              </span>
            </div>

            {/* Signature Block for Print */}
            <div className="pt-4 mt-2 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-3">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Cashier on Duty:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.name || user?.username || 'Finance Officer'}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Verified by Auditor:</span>
                <span className="border-b border-slate-400 w-28 inline-block" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Daily Invoices & Receipts Registry ───────────────────────────────── */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Today's Invoices & Transaction Receipts ({filteredInvoices.length})
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit list of all patient invoices and payments issued on {format(selectedDate, 'MMM d, yyyy')}
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search patient, invoice #..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs w-48 rounded-lg"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
              </select>

              {/* Payment filter */}
              <select
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
              >
                <option value="all">All Channels</option>
                <option value="cash">Cash Only</option>
                <option value="bank">Bank / CBE</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-semibold">Loading daily transactions…</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <Info className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No invoices found for this date.</p>
              <p className="text-xs text-slate-500 mt-1">There are no invoices recorded on {format(selectedDate, 'MMMM d, yyyy')}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Services / Items</th>
                    <th className="py-3 px-4 text-right">Total (ETB)</th>
                    <th className="py-3 px-4 text-right">Paid (ETB)</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvoices.map((inv: any) => {
                    const timeStr = inv.issueDate ? format(new Date(inv.issueDate), 'hh:mm a') : '—';
                    const itemsSummary = Array.isArray(inv.items) && inv.items.length > 0
                      ? inv.items.map((it: any) => it.name || it.description).filter(Boolean).join(', ')
                      : 'Clinical services';

                    const paymentMethodName = inv.bankName
                      ? inv.bankName
                      : inv.cashPayments > 0
                        ? 'Cash'
                        : inv.insurancePayments > 0
                          ? 'Insurance'
                          : inv.bankPayments > 0
                            ? 'Bank'
                            : 'Other';

                    return (
                      <tr key={inv._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">{timeStr}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {inv.patientName || 'Walk-in Patient'}
                        </td>
                        <td className="py-3 px-4 max-w-[220px] truncate text-slate-600 dark:text-slate-400" title={itemsSummary}>
                          {itemsSummary}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                          {fmtCurrency(inv.total)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {fmtCurrency(inv.amountPaid)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">
                          {inv.balance > 0 ? (
                            <span className="text-amber-600 font-bold">{fmtCurrency(inv.balance)}</span>
                          ) : (
                            <span className="text-slate-400">0.00</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {inv.cashPayments > 0 && <Banknote className="h-3 w-3 text-emerald-600" />}
                            {inv.bankPayments > 0 && <CreditCard className="h-3 w-3 text-blue-600" />}
                            {inv.insurancePayments > 0 && <ShieldCheck className="h-3 w-3 text-violet-600" />}
                            {paymentMethodName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="py-3 px-4 text-right print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/app/billing/invoices/${inv._id}`)}
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-slate-700 dark:text-slate-200">
                      Day Total ({filteredInvoices.length} invoices)
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                      {fmtCurrency(filteredInvoices.reduce((s, i) => s + (i.total || 0), 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-300">
                      {fmtCurrency(filteredInvoices.reduce((s, i) => s + (i.amountPaid || 0), 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-amber-700 dark:text-amber-300">
                      {fmtCurrency(filteredInvoices.reduce((s, i) => s + (i.balance || 0), 0))}
                    </td>
                    <td colSpan={3} className="py-3 px-4 text-right text-xs text-slate-500">
                      Closing verified
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Daily Operating Expenses Log ────────────────────────────────────── */}
      {expenseItems.length > 0 && (
        <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <ArrowDownRight className="h-5 w-5" />
              Operating Expenses Recorded on this Day ({expenseItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenseItems.map(exp => (
                  <tr key={exp._id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{exp.description}</td>
                    <td className="py-2.5 px-4 capitalize text-slate-500">{exp.category}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600">−{fmtCurrency(exp.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold">
                <tr>
                  <td colSpan={2} className="py-2.5 px-4">Total Daily Expenses</td>
                  <td className="py-2.5 px-4 text-right text-rose-700 font-black">−{fmtCurrency(dailyExpenses)}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Print-only Signoff Footer ───────────────────────────────────────── */}
      <div className="hidden print:block pt-8 mt-8 border-t-2 border-black text-xs">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="font-bold">Prepared by (Cashier / Finance):</p>
            <p className="mt-8 border-b border-black w-48" />
            <p className="mt-1">Signature & Date</p>
          </div>
          <div className="text-right">
            <p className="font-bold">Approved by (Medical Director / Finance Head):</p>
            <p className="mt-8 border-b border-black w-48 ml-auto" />
            <p className="mt-1">Signature & Date</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DailyFinancialReport;
