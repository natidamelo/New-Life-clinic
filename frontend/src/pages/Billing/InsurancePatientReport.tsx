import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { format, startOfMonth, addMonths, isAfter } from 'date-fns';
import api from '../../services/apiService';
import { toast } from 'react-hot-toast';
import {
  ShieldCheck, Search, Download, RefreshCw, ChevronDown, ChevronUp,
  Users, Receipt, CreditCard, Pill, FlaskConical, Calendar,
  Banknote, AlertCircle, FileText, ChevronLeft, Filter, X, TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  gregorianToEthiopian,
  ethiopianToGregorian,
  getCurrentEthiopianDate,
  ETHIOPIAN_MONTHS,
  isValidEthiopianDate,
  type EthiopianDate,
} from '../../utils/ethiopianCalendar';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 2 }).format(n || 0);

const PRESETS = [
  { key: 'thisMonth',   label: 'This Month' },
  { key: 'lastMonth',   label: 'Last Month' },
  { key: 'last3Months', label: 'Last 3M' },
  { key: 'last6Months', label: 'Last 6M' },
  { key: 'thisYear',    label: 'This Year' },
];

// ─── Ethiopian date display helper ───────────────────────────────────────────
const ethFmt = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const e = gregorianToEthiopian(d);
    return `${e.day} ${ETHIOPIAN_MONTHS[e.month - 1]} ${e.year}`;
  } catch { return ''; }
};

// ─── Ethiopian Date Picker (inline, no extra component dependency) ────────────
const isLeapYear = (y: number) => ((y % 4 === 0) && (y % 100 !== 0)) || (y % 400 === 0);
const maxDaysEth = (month: number, ethYear: number) =>
  month <= 12 ? 30 : isLeapYear(ethYear + 7) ? 6 : 5;

interface EthPickerProps {
  label: string;
  value: string;          // Gregorian yyyy-MM-dd
  onChange: (greg: string) => void;
}
const EthiopianDatePicker: React.FC<EthPickerProps> = ({ label, value, onChange }) => {
  const cur = getCurrentEthiopianDate();

  // Derive initial Ethiopian values from the Gregorian value
  const initEth = useMemo(() => {
    if (!value) return { year: cur.year, month: cur.month, day: cur.day };
    try {
      const e = gregorianToEthiopian(new Date(value));
      return { year: e.year, month: e.month, day: e.day };
    } catch { return { year: cur.year, month: cur.month, day: cur.day }; }
  }, []); // intentionally once

  const [ethYear,  setEthYear]  = useState(initEth.year);
  const [ethMonth, setEthMonth] = useState(initEth.month);
  const [ethDay,   setEthDay]   = useState(initEth.day);

  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = cur.year - 10; y <= cur.year + 2; y++) opts.push(y);
    return opts;
  }, [cur.year]);

  const dayOptions = useMemo(() => {
    const max = maxDaysEth(ethMonth, ethYear);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [ethMonth, ethYear]);

  const commit = useCallback((y: number, m: number, d: number) => {
    if (!isValidEthiopianDate(y, m, d)) return;
    try {
      const greg = ethiopianToGregorian(y, m, d);
      onChange(format(greg, 'yyyy-MM-dd'));
    } catch { /* invalid */ }
  }, [onChange]);

  const handleYear = (y: number) => {
    setEthYear(y);
    const maxD = maxDaysEth(ethMonth, y);
    const safeDay = Math.min(ethDay, maxD);
    setEthDay(safeDay);
    commit(y, ethMonth, safeDay);
  };
  const handleMonth = (m: number) => {
    setEthMonth(m);
    const maxD = maxDaysEth(m, ethYear);
    const safeDay = Math.min(ethDay, maxD);
    setEthDay(safeDay);
    commit(ethYear, m, safeDay);
  };
  const handleDay = (d: number) => { setEthDay(d); commit(ethYear, ethMonth, d); };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        <Calendar className="h-3 w-3 inline mr-1" />{label}
      </p>
      <div className="flex gap-1.5">
        {/* Year */}
        <select
          value={ethYear}
          onChange={e => handleYear(Number(e.target.value))}
          className="flex-1 h-9 text-sm border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-white"
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {/* Month */}
        <select
          value={ethMonth}
          onChange={e => handleMonth(Number(e.target.value))}
          className="flex-[1.6] h-9 text-sm border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-white"
        >
          {ETHIOPIAN_MONTHS.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
        {/* Day */}
        <select
          value={ethDay}
          onChange={e => handleDay(Number(e.target.value))}
          className="w-16 h-9 text-sm border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-white"
        >
          {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {/* Show Gregorian equivalent */}
      {value && (
        <p className="text-xs text-gray-400 mt-1">
          = {format(new Date(value), 'dd MMM yyyy')} (GC)
        </p>
      )}
    </div>
  );
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface InvoiceEntry {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  status: string;
  total: number;
  amountPaid: number;
  balance: number;
  cardAmt: number;
  labAmt: number;
  medAmt: number;
  svcAmt: number;
  insurancePmt: number;
  cashPmt: number;
  items: Array<{ description: string; itemType: string; quantity: number; unitPrice: number; total: number }>;
}

interface PatientEntry {
  patientId: string;
  patientIdCode: string;
  patientName: string;
  phone: string;
  gender: string;
  invoiceCount: number;
  cardTotal: number;
  labTotal: number;
  medicationTotal: number;
  serviceTotal: number;
  grandTotal: number;
  insurancePaid: number;
  cashPaid: number;
  otherPaid: number;
  balance: number;
  invoices: InvoiceEntry[];
}

interface Summary {
  totalPatients: number;
  totalInvoices: number;
  totalCardRevenue: number;
  totalLabRevenue: number;
  totalMedicationRevenue: number;
  totalServiceRevenue: number;
  totalGrandRevenue: number;
  totalInsurancePaid: number;
  totalCashPaid: number;
  totalBalance: number;
}

interface ReportData {
  summary: Summary;
  patients: PatientEntry[];
  dateRange: { startDate?: string; endDate?: string };
}

// ─── Status Badge ────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  paid:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  partial:   'bg-blue-100 text-blue-700 border-blue-200',
  overdue:   'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] ?? STATUS_STYLES.cancelled}`}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

// ─── Category Pill ───────────────────────────────────────────────────────────
const CategoryPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
  value > 0 ? (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}: {fmt(value)}
    </span>
  ) : null
);

// ─── Patient Row ──────────────────────────────────────────────────────────────
const PatientRow: React.FC<{ patient: PatientEntry; index: number }> = ({ patient, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedInv, setExpandedInv] = useState<string | null>(null);

  const coveragePercent = patient.grandTotal > 0
    ? Math.round((patient.insurancePaid / patient.grandTotal) * 100)
    : 0;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200 ${expanded ? 'border-violet-300 shadow-lg shadow-violet-100' : 'border-gray-200 hover:border-violet-200 hover:shadow-md'}`}>

      {/* ── Patient Header ── */}
      <div
        className="flex flex-wrap items-center gap-4 p-4 cursor-pointer select-none bg-white hover:bg-violet-50/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Rank */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>

        {/* Patient info */}
        <div className="flex-1 min-w-[160px]">
          <p className="font-bold text-gray-900">{patient.patientName}</p>
          <p className="text-xs text-gray-400">{patient.patientIdCode} · {patient.gender} · {patient.phone}</p>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          <CategoryPill label="Card"    value={patient.cardTotal}       color="bg-indigo-100 text-indigo-700" />
          <CategoryPill label="Lab"     value={patient.labTotal}        color="bg-cyan-100 text-cyan-700" />
          <CategoryPill label="Meds"   value={patient.medicationTotal} color="bg-orange-100 text-orange-700" />
          <CategoryPill label="Svc"    value={patient.serviceTotal}    color="bg-emerald-100 text-emerald-700" />
        </div>

        {/* Totals */}
        <div className="text-right min-w-[130px]">
          <p className="text-base font-black text-gray-900">{fmt(patient.grandTotal)}</p>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <ShieldCheck className="h-3 w-3 text-violet-500" />
            <span className="text-xs text-violet-600 font-semibold">{fmt(patient.insurancePaid)}</span>
            <span className="text-xs text-gray-400">({coveragePercent}%)</span>
          </div>
        </div>

        {/* Invoices count */}
        <div className="text-center min-w-[50px]">
          <p className="text-lg font-black text-gray-700">{patient.invoiceCount}</p>
          <p className="text-xs text-gray-400">invoices</p>
        </div>

        {/* Balance */}
        <div className="text-right min-w-[90px]">
          <p className={`text-sm font-bold ${patient.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {patient.balance > 0 ? `Bal: ${fmt(patient.balance)}` : '✓ Settled'}
          </p>
        </div>

        <div className="flex-shrink-0 ml-1">
          {expanded
            ? <ChevronUp className="h-5 w-5 text-violet-400" />
            : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
      </div>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div className="border-t border-violet-100 bg-violet-50/20 p-4 space-y-3">

          {/* Patient summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Patient Card',  value: patient.cardTotal,       icon: <CreditCard className="h-4 w-4 text-indigo-500" />,  bg: 'bg-indigo-50 border-indigo-100' },
              { label: 'Lab / Imaging', value: patient.labTotal,        icon: <FlaskConical className="h-4 w-4 text-cyan-500" />,   bg: 'bg-cyan-50 border-cyan-100' },
              { label: 'Medication',    value: patient.medicationTotal, icon: <Pill className="h-4 w-4 text-orange-500" />,         bg: 'bg-orange-50 border-orange-100' },
              { label: 'Services',      value: patient.serviceTotal,    icon: <Receipt className="h-4 w-4 text-emerald-500" />,     bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Insurance Pd', value: patient.insurancePaid,   icon: <ShieldCheck className="h-4 w-4 text-violet-500" />,  bg: 'bg-violet-50 border-violet-100' },
              { label: 'Cash Paid',     value: patient.cashPaid,        icon: <Banknote className="h-4 w-4 text-teal-500" />,       bg: 'bg-teal-50 border-teal-100' },
            ].map(({ label, value, icon, bg }) => (
              <div key={label} className={`rounded-xl border p-3 ${bg}`}>
                <div className="flex items-center gap-1.5 mb-1">{icon}<p className="text-xs text-gray-500">{label}</p></div>
                <p className="text-sm font-black text-gray-900">{fmt(value)}</p>
              </div>
            ))}
          </div>

          {/* Invoice list */}
          <div className="space-y-2 mt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Breakdown</p>
            {patient.invoices.map(inv => (
              <div key={inv.invoiceId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Invoice header */}
                <div
                  className="flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedInv(expandedInv === inv.invoiceId ? null : inv.invoiceId)}
                >
                  <Receipt className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <span className="font-bold text-blue-700 text-sm">#{inv.invoiceNumber}</span>
                  <StatusBadge status={inv.status} />
                  <span className="text-xs text-gray-400">
                    {inv.issueDate ? format(new Date(inv.issueDate), 'dd MMM yyyy') : '-'}
                    {inv.issueDate && (
                      <span className="ml-1.5 text-amber-500 font-medium">
                        🇪🇹 {ethFmt(inv.issueDate)}
                      </span>
                    )}
                  </span>


                  <div className="flex flex-wrap gap-1 flex-1">
                    <CategoryPill label="Card" value={inv.cardAmt} color="bg-indigo-50 text-indigo-600" />
                    <CategoryPill label="Lab"  value={inv.labAmt}  color="bg-cyan-50 text-cyan-600" />
                    <CategoryPill label="Med"  value={inv.medAmt}  color="bg-orange-50 text-orange-600" />
                    <CategoryPill label="Svc"  value={inv.svcAmt}  color="bg-emerald-50 text-emerald-600" />
                  </div>

                  <div className="text-right min-w-[120px]">
                    <p className="text-sm font-black text-gray-900">{fmt(inv.total)}</p>
                    <p className="text-xs text-violet-600">Ins: {fmt(inv.insurancePmt)}</p>
                  </div>
                  {expandedInv === inv.invoiceId
                    ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                    : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                </div>

                {/* Invoice items */}
                {expandedInv === inv.invoiceId && inv.items.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Items</p>
                    <div className="space-y-1">
                      {inv.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <span className="text-gray-700 font-medium">{it.description}
                            <span className="ml-1.5 text-gray-400 font-normal capitalize">({it.itemType})</span>
                            <span className="ml-1.5 text-gray-400">×{it.quantity}</span>
                          </span>
                          <span className="font-bold text-gray-900">{fmt(it.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, icon, gradient }: { label: string; value: string | number; icon: React.ReactNode; gradient: string }) => (
  <Card className={`${gradient} border-0 shadow-md overflow-hidden`}>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2.5 bg-white/20 rounded-xl flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-white/75 text-xs font-medium leading-tight">{label}</p>
        <p className="text-white font-black text-base leading-tight truncate">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const InsurancePatientReport: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate]     = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [preset, setPreset]       = useState<string>('thisMonth');
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState<ReportData | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [useEthiopian, setUseEthiopian] = useState(false);

  // Ethiopian date labels for the selected range
  const ethStartLabel = startDate ? ethFmt(startDate) : '';
  const ethEndLabel   = endDate   ? ethFmt(endDate)   : '';

  // ── Preset date range ──────────────────────────────────────────────────────
  const applyPreset = (key: string) => {
    const today = new Date();
    let s: Date, e: Date = today;
    switch (key) {
      case 'thisMonth':   s = startOfMonth(today); break;
      case 'lastMonth': {
        const lm = addMonths(today, -1);
        s = startOfMonth(lm);
        e = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      }
      case 'last3Months': s = startOfMonth(addMonths(today, -3)); break;
      case 'last6Months': s = startOfMonth(addMonths(today, -6)); break;
      case 'thisYear':    s = new Date(today.getFullYear(), 0, 1); break;
      default: return;
    }
    setStartDate(format(s, 'yyyy-MM-dd'));
    setEndDate(format(e, 'yyyy-MM-dd'));
    setPreset(key);
    // Show Ethiopian date range in toast
    const eS = gregorianToEthiopian(s);
    const eE = gregorianToEthiopian(e);
    toast.success(`${eS.day} ${ETHIOPIAN_MONTHS[eS.month-1]} ${eS.year} – ${eE.day} ${ETHIOPIAN_MONTHS[eE.month-1]} ${eE.year}`);
  };

  // ── Fetch report ───────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!startDate || !endDate) { toast.error('Please select both dates'); return; }
    if (isAfter(new Date(startDate), new Date(endDate))) { toast.error('Start date must be before end date'); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get('/api/billing/insurance-patient-report', {
        params: { startDate, endDate },
      });
      if (res.data.success) {
        setData(res.data.data);
        toast.success(`Report loaded — ${res.data.data.summary.totalPatients} insurance patients`);
      } else {
        throw new Error(res.data.message || 'Failed to load report');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load report';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!data) { toast.error('Generate report first'); return; }

    const rows: string[][] = [
      ['Patient Name', 'Patient ID', 'Gender', 'Phone', 'Invoices',
       'Card (ETB)', 'Lab (ETB)', 'Medication (ETB)', 'Service (ETB)',
       'Grand Total (ETB)', 'Insurance Paid (ETB)', 'Cash Paid (ETB)', 'Balance (ETB)'],
    ];
    for (const p of data.patients) {
      rows.push([
        p.patientName, p.patientIdCode, p.gender, p.phone,
        String(p.invoiceCount),
        p.cardTotal.toFixed(2), p.labTotal.toFixed(2),
        p.medicationTotal.toFixed(2), p.serviceTotal.toFixed(2),
        p.grandTotal.toFixed(2), p.insurancePaid.toFixed(2),
        p.cashPaid.toFixed(2), p.balance.toFixed(2),
      ]);
    }
    // Totals row
    const s = data.summary;
    rows.push([
      'TOTAL', '', '', '', String(s.totalInvoices),
      s.totalCardRevenue.toFixed(2), s.totalLabRevenue.toFixed(2),
      s.totalMedicationRevenue.toFixed(2), s.totalServiceRevenue.toFixed(2),
      s.totalGrandRevenue.toFixed(2), s.totalInsurancePaid.toFixed(2),
      s.totalCashPaid.toFixed(2), s.totalBalance.toFixed(2),
    ]);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Insurance_Patient_Report_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  // ── Filtered patients ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.patients;
    return data.patients.filter(p =>
      p.patientName.toLowerCase().includes(q) ||
      p.patientIdCode.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  }, [data, search]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/app/billing')} className="h-8 gap-1.5 text-xs">
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
            Insurance Patient Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Per-patient breakdown: Card · Lab · Medication · Services · Totals
          </p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-violet-600" /> Date Range & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {/* Date pickers */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                <Calendar className="h-3 w-3 inline mr-1" />From Date
              </Label>
              <Input
                type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setPreset(''); }}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                <Calendar className="h-3 w-3 inline mr-1" />To Date
              </Label>
              <Input
                type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setPreset(''); }}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(({ key, label }) => (
              <button
                key={key} onClick={() => applyPreset(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  preset === key
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600'
                }`}
              >{label}</button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerate} disabled={loading}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              {loading
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                : <><ShieldCheck className="h-4 w-4 mr-2" />Generate Report</>}
            </Button>
            <Button
              variant="outline" onClick={handleExport}
              disabled={!data || loading}
              className="border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-700"
            >
              <Download className="h-4 w-4 mr-2" />Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {data && (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <SummaryCard
              label="Insurance Patients"
              value={data.summary.totalPatients}
              icon={<Users className="h-5 w-5 text-white" />}
              gradient="bg-gradient-to-br from-violet-600 to-purple-700"
            />
            <SummaryCard
              label="Total Card Revenue"
              value={fmt(data.summary.totalCardRevenue)}
              icon={<CreditCard className="h-5 w-5 text-white" />}
              gradient="bg-gradient-to-br from-indigo-500 to-blue-700"
            />
            <SummaryCard
              label="Total Lab Revenue"
              value={fmt(data.summary.totalLabRevenue)}
              icon={<FlaskConical className="h-5 w-5 text-white" />}
              gradient="bg-gradient-to-br from-cyan-500 to-teal-600"
            />
            <SummaryCard
              label="Total Medication"
              value={fmt(data.summary.totalMedicationRevenue)}
              icon={<Pill className="h-5 w-5 text-white" />}
              gradient="bg-gradient-to-br from-orange-500 to-amber-600"
            />
            <SummaryCard
              label="Total Services"
              value={fmt(data.summary.totalServiceRevenue)}
              icon={<Receipt className="h-5 w-5 text-white" />}
              gradient="bg-gradient-to-br from-emerald-500 to-green-700"
            />
          </div>

          {/* ── Insurance vs Cash paid cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-violet-50 border border-violet-200">
              <div className="p-3 bg-violet-100 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Insurance Paid</p>
                <p className="text-xl font-black text-violet-700">{fmt(data.summary.totalInsurancePaid)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Banknote className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Cash Paid</p>
                <p className="text-xl font-black text-emerald-700">{fmt(data.summary.totalCashPaid)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="p-3 bg-gray-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Grand Total Billed</p>
                <p className="text-xl font-black text-gray-900">{fmt(data.summary.totalGrandRevenue)}</p>
              </div>
            </div>
          </div>

          {/* ── Per-Patient Table ── */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-100">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-600" />
                Per-Patient Detail
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filtered.length} patients
                </span>
              </CardTitle>
              {/* Search */}
              <div className="relative w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search patient…"
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">No insurance patients found</p>
                  <p className="text-gray-400 text-sm mt-1">Try changing the date range or search term</p>
                </div>
              ) : (
                filtered.map((p, i) => <PatientRow key={p.patientId} patient={p} index={i} />)
              )}
            </CardContent>
          </Card>

          {/* ── Totals Footer ── */}
          {filtered.length > 0 && (
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-3">
                Report Totals  ({filtered.length} patients · {data.summary.totalInvoices} invoices)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Card',        value: data.summary.totalCardRevenue },
                  { label: 'Lab',         value: data.summary.totalLabRevenue },
                  { label: 'Medication',  value: data.summary.totalMedicationRevenue },
                  { label: 'Services',    value: data.summary.totalServiceRevenue },
                  { label: 'Grand Total', value: data.summary.totalGrandRevenue },
                  { label: 'Insurance',   value: data.summary.totalInsurancePaid },
                  { label: 'Cash',        value: data.summary.totalCashPaid },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-xl border border-violet-100 p-3 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-black text-gray-900">{fmt(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InsurancePatientReport;
