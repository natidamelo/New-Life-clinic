import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { format, isAfter, addMonths, startOfMonth } from 'date-fns';
import billingService from '../../services/billingService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Search, Download, Filter, Eye, ChevronLeft, AlertCircle, RefreshCw,
  DollarSign, CheckCircle2, Clock, FileText, Banknote, ShieldCheck,
  CreditCard, ChevronDown, ChevronUp, Receipt, Calendar, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DetailedInvoice {
  _id: string; invoiceNumber: string; patientName: string; patientId: string;
  providerName: string; createdByName: string; issueDate: string; dueDate: string;
  status: string; subtotal: number; taxTotal: number; discountTotal: number;
  total: number; amountPaid: number; balance: number;
  items: Array<{ service: string; description?: string; quantity: number; unitPrice: number; amount: number }>;
  payments: Array<{ amount: number; method: string; date: string; reference?: string; notes?: string }>;
  paymentHistory: Array<{ amount: number; method: string; date: string; reference?: string; notes?: string }>;
  cashPayments: number; insurancePayments: number; otherPayments: number;
  bankName?: string; notes?: string;
}

interface ReportData {
  reportTitle: string; generatedAt: string;
  period: { startDate: string; endDate: string };
  filters: { status: string; paymentMethod: string; patientId: string };
  summary: {
    totalInvoices: number; totalRevenue: number; totalPaid: number; totalOutstanding: number;
    totalCashPayments: number; totalInsurancePayments: number; totalOtherPayments: number;
    statusBreakdown: Record<string, number>;
  };
  invoices: DetailedInvoice[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 2 }).format(n);

const STATUS_MAP: Record<string, { cls: string; dot: string }> = {
  paid:      { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  pending:   { cls: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
  overdue:   { cls: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500' },
  partial:   { cls: 'bg-blue-100 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
  cancelled: { cls: 'bg-gray-100 text-gray-600 border-gray-200',          dot: 'bg-gray-400' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_MAP[status] ?? STATUS_MAP.cancelled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const PRESETS = [
  { key: 'thisMonth', label: 'This Month' }, { key: 'lastMonth', label: 'Last Month' },
  { key: 'last3Months', label: 'Last 3M' }, { key: 'last6Months', label: 'Last 6M' },
  { key: 'thisYear', label: 'This Year' },
];

// ─── Invoice Row ──────────────────────────────────────────────────────────────
const InvoiceRow: React.FC<{ invoice: DetailedInvoice }> = ({ invoice }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden transition-shadow ${expanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
      {/* Header row */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 min-w-[120px]">
          <Receipt className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <span className="font-bold text-blue-700 text-sm">#{invoice.invoiceNumber}</span>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <p className="text-sm font-semibold text-gray-900 truncate">{invoice.patientName}</p>
          <p className="text-xs text-gray-400">{invoice.patientId}</p>
        </div>
        <div className="text-right min-w-[100px]">
          <p className="text-sm font-black text-gray-900">{fmtCurrency(invoice.total)}</p>
          <p className="text-xs text-gray-400">{format(new Date(invoice.issueDate), 'dd MMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-3 min-w-[160px]">
          <div className="text-right">
            <p className="text-xs text-emerald-600 font-semibold">Paid: {fmtCurrency(invoice.amountPaid)}</p>
            <p className="text-xs text-amber-600 font-semibold">Bal: {fmtCurrency(invoice.balance)}</p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Subtotal',  value: fmtCurrency(invoice.subtotal),      color: 'text-gray-700' },
              { label: 'Tax',       value: fmtCurrency(invoice.taxTotal),       color: 'text-gray-700' },
              { label: 'Discount',  value: fmtCurrency(invoice.discountTotal),  color: 'text-emerald-600' },
              { label: 'Total',     value: fmtCurrency(invoice.total),          color: 'text-gray-900 font-black' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div className="flex flex-wrap gap-3">
            {invoice.cashPayments > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs">
                <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Cash: {fmtCurrency(invoice.cashPayments)}</span>
              </div>
            )}
            {invoice.insurancePayments > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-lg text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
                <span className="text-violet-700 font-semibold">Insurance: {fmtCurrency(invoice.insurancePayments)}</span>
              </div>
            )}
            {invoice.otherPayments > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs">
                <CreditCard className="h-3.5 w-3.5 text-gray-600" />
                <span className="text-gray-700 font-semibold">Other: {fmtCurrency(invoice.otherPayments)}</span>
              </div>
            )}
            {invoice.bankName && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-blue-700 font-semibold">Bank: {invoice.bankName}</span>
              </div>
            )}
          </div>

          {/* Services */}
          {invoice.items?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services</p>
              <div className="space-y-1">
                {invoice.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <span className="text-gray-700">{item.service} <span className="text-gray-400">×{item.quantity}</span></span>
                    <span className="font-semibold text-gray-900">{fmtCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment records */}
          {invoice.payments?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Records</p>
              <div className="space-y-1">
                {invoice.payments.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <span className="font-semibold text-gray-700 capitalize">{p.method}</span>
                    <span className="font-bold text-emerald-700">{fmtCurrency(p.amount)}</span>
                    <span className="text-gray-400">{format(new Date(p.date), 'dd MMM yyyy')}</span>
                    {p.reference && <span className="text-gray-400">Ref: {p.reference}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DetailedBillingReport: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [filters, setFilters] = useState({ status: '', paymentMethod: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>('thisMonth');

  const validateDates = () => {
    if (!startDate || !endDate) { setError('Please select both dates'); return false; }
    if (isAfter(startDate, endDate)) { setError('Start date must be before end date'); return false; }
    if (isAfter(endDate, new Date())) { setError('End date cannot be in the future'); return false; }
    return true;
  };

  const setPresetDateRange = (range: string) => {
    const today = new Date(); let newStart: Date; let newEnd = today;
    setError(null);
    switch (range) {
      case 'thisMonth':   newStart = startOfMonth(today); break;
      case 'lastMonth':   { const lm = addMonths(today, -1); newStart = startOfMonth(lm); newEnd = new Date(today.getFullYear(), today.getMonth(), 0); break; }
      case 'last3Months': newStart = startOfMonth(addMonths(today, -3)); break;
      case 'last6Months': newStart = startOfMonth(addMonths(today, -6)); break;
      case 'thisYear':    newStart = new Date(today.getFullYear(), 0, 1); break;
      default: return;
    }
    setStartDate(newStart); setEndDate(newEnd); setSelectedPreset(range);
    toast.success(`Range: ${format(newStart, 'MMM dd')} – ${format(newEnd, 'MMM dd, yyyy')}`);
  };

  const handleGenerateReport = async () => {
    if (!validateDates()) return;
    setLoading(true); setError(null);
    try {
      const s = format(startDate!, 'yyyy-MM-dd');
      const e = format(endDate!, 'yyyy-MM-dd');
      const res = await billingService.getDetailedBillingReport(s, e, filters);
      if (res.success) { setReportData(res.data); toast.success('Report generated'); }
      else throw new Error(res.message || 'Failed to generate report');
    } catch (err: any) {
      setError(err.message || 'Failed to generate report.');
    } finally { setLoading(false); }
  };

  const handleExport = async () => {
    if (!startDate || !endDate) { toast.error('Select date range first'); return; }
    setLoading(true);
    try {
      const s = format(startDate, 'yyyy-MM-dd');
      const e = format(endDate, 'yyyy-MM-dd');
      const res = await billingService.getDetailedBillingReport(s, e, filters, 'csv');
      const blob = new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `Detailed_Billing_${s}_to_${e}.csv`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch { toast.error('Failed to export.'); }
    finally { setLoading(false); }
  };

  const filteredInvoices = useMemo(() =>
    (reportData?.invoices ?? []).filter(inv => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return inv.invoiceNumber.toLowerCase().includes(q) || inv.patientName.toLowerCase().includes(q) || inv.patientId.toLowerCase().includes(q);
    }),
  [reportData, searchTerm]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/app/billing')} className="h-8 gap-1.5 text-xs">
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="h-6 w-6 text-indigo-600" /> Detailed Billing Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Per-invoice breakdown with payment details and service items</p>
        </div>
      </div>

      {/* ── Filters Card ─────────────────────────────────────────────────── */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" /> Filters & Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Start Date</Label>
              <Input type="date" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                onChange={e => { setStartDate(e.target.value ? new Date(e.target.value) : null); setSelectedPreset(null); }}
                className="h-9 text-sm border-gray-200 focus:border-indigo-400" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">End Date</Label>
              <Input type="date" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                onChange={e => { setEndDate(e.target.value ? new Date(e.target.value) : null); setSelectedPreset(null); }}
                className="h-9 text-sm border-gray-200 focus:border-indigo-400" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Status</Label>
              <Select value={filters.status || 'all'} onValueChange={v => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
                <SelectTrigger className="h-9 text-sm border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['all', 'paid', 'pending', 'partial', 'overdue', 'cancelled'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Payment Method</Label>
              <Select value={filters.paymentMethod || 'all'} onValueChange={v => setFilters({ ...filters, paymentMethod: v === 'all' ? '' : v })}>
                <SelectTrigger className="h-9 text-sm border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['all', 'cash', 'insurance', 'other'].map(m => (
                    <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(({ key, label }) => (
              <button key={key} onClick={() => setPresetDateRange(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedPreset === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}>{label}</button>
            ))}
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 ml-2">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button onClick={handleGenerateReport} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating…</> : <><Eye className="h-4 w-4 mr-2" />Generate Report</>}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={loading || (!startDate || !endDate)} className="border-gray-200 text-gray-700">
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue',   value: fmtCurrency(reportData.summary.totalRevenue),    icon: <DollarSign className="h-5 w-5 text-white" />,   bg: 'bg-gradient-to-br from-blue-600 to-indigo-700' },
              { label: 'Total Paid',      value: fmtCurrency(reportData.summary.totalPaid),        icon: <CheckCircle2 className="h-5 w-5 text-white" />, bg: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
              { label: 'Outstanding',     value: fmtCurrency(reportData.summary.totalOutstanding), icon: <Clock className="h-5 w-5 text-white" />,        bg: 'bg-gradient-to-br from-amber-500 to-orange-600' },
              { label: 'Total Invoices',  value: reportData.summary.totalInvoices,                 icon: <FileText className="h-5 w-5 text-white" />,     bg: 'bg-gradient-to-br from-violet-600 to-purple-700' },
            ].map(({ label, value, icon, bg }) => (
              <Card key={label} className={`${bg} border-0 shadow-md`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl">{icon}</div>
                  <div>
                    <p className="text-white/80 text-xs font-medium">{label}</p>
                    <p className="text-white font-black text-lg leading-tight">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Method Breakdown */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-violet-600" /> Payment Method Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Cash', value: reportData.summary.totalCashPayments,      icon: <Banknote className="h-4 w-4 text-emerald-600" />, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
                  { label: 'Insurance', value: reportData.summary.totalInsurancePayments, icon: <ShieldCheck className="h-4 w-4 text-violet-600" />, bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100' },
                  { label: 'Other', value: reportData.summary.totalOtherPayments,    icon: <CreditCard className="h-4 w-4 text-gray-600" />,    bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200' },
                ].map(({ label, value, icon, bg, text, border }) => (
                  <div key={label} className={`flex items-center gap-3 p-4 rounded-xl ${bg} border ${border}`}>
                    <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`font-black text-lg ${text}`}>{fmtCurrency(value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice List */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600" />
                Invoice Details
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filteredInvoices.length}</span>
              </CardTitle>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search invoices…"
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {filteredInvoices.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">No invoices found</p>
                </div>
              ) : filteredInvoices.map(inv => <InvoiceRow key={inv._id} invoice={inv} />)}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default DetailedBillingReport;
