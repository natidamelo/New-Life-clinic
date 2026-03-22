import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';
import {
  ChevronLeft, RefreshCw, Search, X, ChevronDown, ChevronUp,
  FlaskConical, Pill, Stethoscope, Activity, Package,
  DollarSign, TrendingUp, BarChart3, FileText, Download, Printer,
  Calendar, AlertTriangle, Filter, CreditCard, ShieldCheck, Users, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { format, subMonths, subYears } from 'date-fns';
import api from '../../services/apiService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MonthlyBreakdown { month: string; revenue: number; quantity: number; }
interface CardMonthly { month: string; revenue: number; count: number; }
interface CardTypeItem {
  cardType: string; totalRevenue: number; totalCount: number;
  activeCount: number; expiredCount: number; graceCount: number; cancelledCount: number;
  monthlyBreakdown: CardMonthly[];
}
interface InsuranceMonthly { month: string; revenue: number; invoiceCount: number; }
interface CardInsuranceData {
  cards: { items: CardTypeItem[]; totalRevenue: number; totalCards: number; };
  insurance: { totalRevenue: number; totalInvoices: number; monthlyBreakdown: InsuranceMonthly[]; };
}
interface ReportItem {
  itemType: string;
  name: string;
  descriptions?: string[];  // kept for CSV export only, not shown in UI
  totalRevenue: number;
  totalQuantity: number;    // number of times prescribed/given
  totalDoseUnits?: number;
  unitPrice: number;        // actual price per prescription
  invoiceCount: number;
  monthlyBreakdown: MonthlyBreakdown[];
}
interface TypeSummary { itemType: string; totalRevenue: number; totalQuantity: number; itemCount: number; }
interface ReportData {
  items: ReportItem[];
  summaryByType: TypeSummary[];
  totalRevenue: number;
  totalItems: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(n ?? 0);

const fmtCompact = (v: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-');
  return format(new Date(Number(y), Number(m) - 1, 1), 'MMM yyyy');
};


// ─── Type Config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string; bar: string }> = {
  medication:   { label: 'Medication',   icon: <Pill className="h-4 w-4" />,         color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',   bar: '#3b82f6' },
  lab:          { label: 'Lab Test',     icon: <FlaskConical className="h-4 w-4" />, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: '#10b981' },
  service:      { label: 'Service',      icon: <Stethoscope className="h-4 w-4" />,  color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200',  bar: '#8b5cf6' },
  procedure:    { label: 'Procedure',    icon: <Activity className="h-4 w-4" />,     color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: '#f59e0b' },
  consultation: { label: 'Consultation', icon: <FileText className="h-4 w-4" />,     color: 'text-cyan-700',    bg: 'bg-cyan-50',    border: 'border-cyan-200',    bar: '#06b6d4' },
  imaging:      { label: 'Imaging',      icon: <BarChart3 className="h-4 w-4" />,    color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200',    bar: '#ec4899' },
  supply:       { label: 'Supply',       icon: <Package className="h-4 w-4" />,      color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  bar: '#f97316' },
  other:        { label: 'Other',        icon: <DollarSign className="h-4 w-4" />,   color: 'text-gray-700',    bg: 'bg-gray-100',   border: 'border-gray-200',    bar: '#6b7280' },
};
const getTypeCfg = (t: string) => TYPE_CONFIG[t] ?? TYPE_CONFIG.other;

// ─── Item Row ─────────────────────────────────────────────────────────────────
const ItemRow: React.FC<{ item: ReportItem; rank: number; maxRevenue: number }> = ({ item, rank, maxRevenue }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = getTypeCfg(item.itemType);
  const pct = maxRevenue > 0 ? (item.totalRevenue / maxRevenue) * 100 : 0;
  const name = item.name;

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden transition-shadow ${expanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-4 bg-white hover:bg-gray-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Rank */}
          <span className="text-xs font-black text-gray-400 w-5 flex-shrink-0">#{rank}</span>

          {/* Type badge */}
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border} flex-shrink-0`}>
            {cfg.icon} {cfg.label}
          </span>

          {/* Name */}
          <span className="flex-1 text-sm font-semibold text-gray-800 truncate" title={name}>{name}</span>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-400">Times Given</p>
              <p className="text-sm font-bold text-gray-700">{item.totalQuantity.toLocaleString()}×</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Price</p>
              <p className="text-sm font-bold text-gray-700">{fmtCurrency(item.unitPrice)}</p>
            </div>
            <div className="text-right min-w-[110px]">
              <p className="text-xs text-gray-400">Total Revenue</p>
              <p className="text-sm font-black text-gray-900">{fmtCurrency(item.totalRevenue)}</p>
            </div>
          </div>

          {/* Mobile revenue */}
          <div className="sm:hidden text-right flex-shrink-0">
            <p className="text-sm font-black text-gray-900">{fmtCurrency(item.totalRevenue)}</p>
          </div>

          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 ml-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: cfg.bar }} />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue',  value: fmtCurrency(item.totalRevenue),                          color: 'text-blue-700' },
              { label: 'Times Given',    value: item.totalQuantity.toLocaleString() + ' times',          color: 'text-gray-700' },
              { label: 'Unit Price',     value: fmtCurrency(item.unitPrice),                            color: 'text-violet-700' },
              { label: 'Invoice Count',  value: item.invoiceCount.toLocaleString() + ' invoices',        color: 'text-emerald-700' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>


          {/* Monthly chart */}
          {item.monthlyBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Monthly Revenue Trend</p>
              <div className="h-36 bg-white rounded-xl border border-gray-100 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={item.monthlyBreakdown} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtCompact} width={45} />
                    <RechartsTooltip
                      formatter={(v: number) => [fmtCurrency(v), 'Revenue']}
                      labelFormatter={fmtMonth}
                      contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)', fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill={cfg.bar} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly table */}
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left py-1.5 font-medium">Month</th>
                      <th className="text-right py-1.5 font-medium">Times Given</th>
                      <th className="text-right py-1.5 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.monthlyBreakdown.map(m => (
                      <tr key={m.month} className="border-b border-gray-50 hover:bg-white transition-colors">
                        <td className="py-1.5 text-gray-600">{fmtMonth(m.month)}</td>
                        <td className="py-1.5 text-right text-gray-700 font-medium">{m.quantity}</td>
                        <td className="py-1.5 text-right font-bold text-gray-900">{fmtCurrency(m.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ItemRevenueReport: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<string>(() => format(subYears(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [activeType, setActiveType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [cardsOpen, setCardsOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [cardData, setCardData] = useState<CardInsuranceData | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (activeType !== 'all') params.append('type', activeType);
      const [itemRes, cardRes] = await Promise.all([
        api.get(`/api/billing/item-revenue-report?${params}`),
        api.get(`/api/billing/card-insurance-report?${new URLSearchParams({ startDate, endDate })}`),
      ]);
      if (!itemRes.data.success) throw new Error(itemRes.data.message || 'Failed to load report');
      setData(itemRes.data.data);
      if (cardRes.data.success) setCardData(cardRes.data.data);
    } catch (err: any) {
      setError(err.response?.status === 403
        ? 'Access denied. Admin or Finance role required.'
        : err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, activeType]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Filtered items
  const filteredItems = (data?.items ?? []).filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const maxRevenue = filteredItems[0]?.totalRevenue ?? 1;

  // Type filter tabs
  const typeTabs = [
    { key: 'all', label: 'All Items' },
    { key: 'medication', label: 'Medications' },
    { key: 'lab', label: 'Lab Tests' },
    { key: 'service', label: 'Services' },
    { key: 'procedure', label: 'Procedures' },
    { key: 'consultation', label: 'Consultations' },
  ];

  // Group items by category for export/print
  const groupedByType = (items: ReportItem[]) => {
    const order = ['medication', 'lab', 'service', 'procedure', 'consultation', 'imaging', 'supply', 'other'];
    const map: Record<string, ReportItem[]> = {};
    items.forEach(i => {
      const t = i.itemType ?? 'other';
      if (!map[t]) map[t] = [];
      map[t].push(i);
    });
    return order.filter(t => map[t]?.length).map(t => ({ type: t, label: getTypeCfg(t).label, items: map[t] }));
  };

  const downloadCSV = () => {
    if (!data) return;
    const groups = groupedByType(data.items);
    const rows: (string | number)[][] = [];

    rows.push([`Medication & Lab Revenue Report`]);
    rows.push([`Period: ${startDate} to ${endDate}`]);
    rows.push([`Generated: ${new Date().toLocaleString()}`]);
    rows.push([]);

    groups.forEach(g => {
      // Category header
      rows.push([`--- ${g.label.toUpperCase()} ---`]);
      rows.push(['#', 'Name', 'Unit Price (ETB)', 'Times Given', 'Total Revenue (ETB)', 'Invoice Count']);
      g.items.forEach((i, idx) => {
        rows.push([idx + 1, i.name, i.unitPrice.toFixed(2), i.totalQuantity, i.totalRevenue.toFixed(2), i.invoiceCount]);
      });
      const catTotal = g.items.reduce((s, i) => s + i.totalRevenue, 0);
      rows.push(['', `${g.label} Subtotal`, '', g.items.reduce((s, i) => s + i.totalQuantity, 0), catTotal.toFixed(2), '']);
      rows.push([]);
    });

    rows.push(['GRAND TOTAL (Items)', '', '', data.items.reduce((s, i) => s + i.totalQuantity, 0), data.totalRevenue.toFixed(2), '']);

    if (cardData && cardData.cards.items.length > 0) {
      rows.push([]);
      rows.push(['--- PATIENT CARDS ---']);
      rows.push(['Card Type', 'Total Issued', 'Active', 'Expired', 'Grace', 'Cancelled', 'Total Revenue (ETB)']);
      cardData.cards.items.forEach(c => {
        rows.push([c.cardType + ' Card', c.totalCount, c.activeCount, c.expiredCount, c.graceCount, c.cancelledCount, c.totalRevenue.toFixed(2)]);
      });
      rows.push(['Cards Subtotal', cardData.cards.totalCards, '', '', '', '', cardData.cards.totalRevenue.toFixed(2)]);
    }

    if (cardData && cardData.insurance.totalRevenue > 0) {
      rows.push([]);
      rows.push(['--- INSURANCE PAYMENTS ---']);
      rows.push(['Month', 'Invoices', 'Revenue (ETB)']);
      cardData.insurance.monthlyBreakdown.forEach(m => {
        rows.push([m.month, m.invoiceCount, m.revenue.toFixed(2)]);
      });
      rows.push(['Insurance Subtotal', cardData.insurance.totalInvoices, cardData.insurance.totalRevenue.toFixed(2)]);
    }

    const overallTotal = data.totalRevenue + (cardData?.cards.totalRevenue ?? 0) + (cardData?.insurance.totalRevenue ?? 0);
    rows.push([]);
    rows.push(['OVERALL GRAND TOTAL', '', '', '', overallTotal.toFixed(2), '']);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Item_Revenue_Report_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!data) return;
    const cd = cardData;
    const groups = groupedByType(data.items);
    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(n);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Item Revenue Report ${startDate} – ${endDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 12px; }
    .header h1 { font-size: 18px; font-weight: bold; color: #1e40af; }
    .header p { font-size: 11px; color: #555; margin-top: 4px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 13px; font-weight: bold; padding: 6px 10px; margin-bottom: 6px; border-radius: 4px; }
    .medication .section-title { background: #dbeafe; color: #1d4ed8; }
    .lab .section-title       { background: #d1fae5; color: #065f46; }
    .service .section-title   { background: #ede9fe; color: #5b21b6; }
    .procedure .section-title { background: #fef3c7; color: #92400e; }
    .consultation .section-title { background: #cffafe; color: #155e75; }
    .imaging .section-title   { background: #fce7f3; color: #9d174d; }
    .supply .section-title    { background: #ffedd5; color: #9a3412; }
    .other .section-title     { background: #f3f4f6; color: #374151; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; text-align: left; padding: 5px 8px; font-size: 11px; color: #555; border-bottom: 1px solid #e2e8f0; }
    th.right, td.right { text-align: right; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    tr:hover td { background: #f8fafc; }
    .subtotal td { font-weight: bold; background: #f8fafc; border-top: 1px solid #cbd5e1; }
    .grand-total { margin-top: 16px; border: 2px solid #1e40af; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
    .grand-total .label { font-size: 13px; font-weight: bold; color: #1e40af; }
    .grand-total .value { font-size: 16px; font-weight: bold; color: #111; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print { body { padding: 10px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Life Clinic — Medication &amp; Lab Revenue Report</h1>
    <p>Period: ${startDate} &nbsp;to&nbsp; ${endDate} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
  </div>

  ${groups.map(g => `
  <div class="section ${g.type}">
    <div class="section-title">${g.label} &nbsp;(${g.items.length} items)</div>
    <table>
      <thead>
        <tr>
          <th style="width:28px">#</th>
          <th>Name</th>
          <th class="right">Unit Price</th>
          <th class="right">Times Given</th>
          <th class="right">Total Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${g.items.map((i, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${i.name}</td>
          <td class="right">${fmt(i.unitPrice)}</td>
          <td class="right">${i.totalQuantity}×</td>
          <td class="right">${fmt(i.totalRevenue)}</td>
        </tr>`).join('')}
        <tr class="subtotal">
          <td colspan="2">${g.label} Subtotal</td>
          <td></td>
          <td class="right">${g.items.reduce((s, i) => s + i.totalQuantity, 0)}×</td>
          <td class="right">${fmt(g.items.reduce((s, i) => s + i.totalRevenue, 0))}</td>
        </tr>
      </tbody>
    </table>
  </div>`).join('')}

  <div class="grand-total">
    <span class="label">GRAND TOTAL — Medications &amp; Labs</span>
    <span class="value">${fmt(data.totalRevenue)}</span>
  </div>

  ${cd && cd.cards.items.length > 0 ? `
  <div class="section" style="margin-top:24px">
    <div class="section-title" style="background:#dbeafe;color:#1d4ed8">PATIENT CARDS &nbsp;(${cd.cards.totalCards} issued)</div>
    <table>
      <thead>
        <tr>
          <th>Card Type</th>
          <th class="right">Issued</th>
          <th class="right">Active</th>
          <th class="right">Expired</th>
          <th class="right">Grace</th>
          <th class="right">Cancelled</th>
          <th class="right">Total Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${cd.cards.items.map(c => `
        <tr>
          <td>${c.cardType} Card</td>
          <td class="right">${c.totalCount}</td>
          <td class="right">${c.activeCount}</td>
          <td class="right">${c.expiredCount}</td>
          <td class="right">${c.graceCount}</td>
          <td class="right">${c.cancelledCount}</td>
          <td class="right">${fmt(c.totalRevenue)}</td>
        </tr>`).join('')}
        <tr class="subtotal">
          <td>Cards Subtotal</td>
          <td class="right">${cd.cards.totalCards}</td>
          <td colspan="4"></td>
          <td class="right">${fmt(cd.cards.totalRevenue)}</td>
        </tr>
      </tbody>
    </table>
  </div>` : ''}

  ${cd && cd.insurance.totalRevenue > 0 ? `
  <div class="section" style="margin-top:24px">
    <div class="section-title" style="background:#d1fae5;color:#065f46">INSURANCE PAYMENTS &nbsp;(${cd.insurance.totalInvoices} invoices)</div>
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th class="right">Invoices</th>
          <th class="right">Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${cd.insurance.monthlyBreakdown.map(m => `
        <tr>
          <td>${m.month}</td>
          <td class="right">${m.invoiceCount}</td>
          <td class="right">${fmt(m.revenue)}</td>
        </tr>`).join('')}
        <tr class="subtotal">
          <td>Insurance Subtotal</td>
          <td class="right">${cd.insurance.totalInvoices}</td>
          <td class="right">${fmt(cd.insurance.totalRevenue)}</td>
        </tr>
      </tbody>
    </table>
  </div>` : ''}

  <div class="grand-total" style="margin-top:16px;border-color:#065f46">
    <span class="label" style="color:#065f46">OVERALL GRAND TOTAL (Items + Cards + Insurance)</span>
    <span class="value">${fmt(data.totalRevenue + (cd?.cards.totalRevenue ?? 0) + (cd?.insurance.totalRevenue ?? 0))}</span>
  </div>

  <div class="footer">New Life Clinic &nbsp;|&nbsp; This report is auto-generated and confidential.</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 p-6 text-white shadow-xl">
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/5" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => navigate('/app/billing')} className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back to Billing
            </button>
            <h1 className="text-2xl font-black">Medication & Lab Revenue Report</h1>
            <p className="text-white/70 text-sm mt-1">Detailed breakdown of all billed items — medications, lab tests, services and more</p>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <Button onClick={printReport} variant="outline" size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button onClick={downloadCSV} variant="outline" size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={fetchReport} variant="outline" size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex gap-3 flex-1">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> From Date
                </label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="text-sm border-gray-200 focus:border-blue-400" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> To Date
                </label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="text-sm border-gray-200 focus:border-blue-400" />
              </div>
            </div>
            {/* Quick presets */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: '1M', fn: () => { setStartDate(format(subMonths(new Date(), 1), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); } },
                { label: '3M', fn: () => { setStartDate(format(subMonths(new Date(), 3), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); } },
                { label: '6M', fn: () => { setStartDate(format(subMonths(new Date(), 6), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); } },
                { label: '1Y', fn: () => { setStartDate(format(subYears(new Date(), 1), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); } },
              ].map(({ label, fn }) => (
                <button key={label} onClick={fn}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-700 transition-colors">
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

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.summaryByType.slice(0, 4).map((s, i) => {
              const cfg = getTypeCfg(s.itemType);
              const GRADS = [
                'bg-gradient-to-br from-blue-600 to-indigo-700',
                'bg-gradient-to-br from-emerald-500 to-teal-600',
                'bg-gradient-to-br from-violet-500 to-purple-700',
                'bg-gradient-to-br from-amber-500 to-orange-600',
              ];
              return (
                <Card key={s.itemType} className={`${GRADS[i % 4]} border-0 shadow-lg overflow-hidden`}>
                  <CardContent className="p-5 relative">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-white/20 rounded-lg">{React.cloneElement(cfg.icon as React.ReactElement, { className: 'h-4 w-4 text-white' })}</div>
                        <span className="text-xs text-white/70 font-semibold">{s.itemCount} items</span>
                      </div>
                      <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">{cfg.label}</p>
                      <p className="text-white text-lg font-black mt-0.5 leading-tight">{fmtCurrency(s.totalRevenue)}</p>
                      <p className="text-white/60 text-xs mt-0.5">given {s.totalQuantity.toLocaleString()} times</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Type summary bar chart ──────────────────────────────────────── */}
          {data.summaryByType.length > 0 && (
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gray-100 rounded-xl"><BarChart3 className="h-5 w-5 text-indigo-600" /></div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Revenue by Category</h3>
                    <p className="text-xs text-gray-500">Total billed revenue per item type</p>
                  </div>
                  <span className="ml-auto text-sm font-black text-gray-900">{fmtCurrency(data.totalRevenue)}</span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.summaryByType} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="itemType" tickFormatter={t => getTypeCfg(t).label} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={fmtCompact} width={55} />
                      <RechartsTooltip
                        formatter={(v: number, _: string, entry: any) => [fmtCurrency(v), getTypeCfg(entry.payload.itemType).label]}
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)', fontSize: 12 }}
                      />
                      <Bar dataKey="totalRevenue" radius={[6, 6, 0, 0]}>
                        {data.summaryByType.map((s, i) => (
                          <Cell key={i} fill={getTypeCfg(s.itemType).bar} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Type filter tabs ────────────────────────────────────────────── */}
          <div className="flex gap-2 flex-wrap">
            {typeTabs.map(tab => {
              const count = tab.key === 'all'
                ? data.items.length
                : data.items.filter(i => i.itemType === tab.key).length;
              if (tab.key !== 'all' && count === 0) return null;
              return (
                <button key={tab.key} onClick={() => setActiveType(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    activeType === tab.key
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                  }`}>
                  {tab.label} {count > 0 && <span className={`ml-1 ${activeType === tab.key ? 'text-white/70' : 'text-gray-400'}`}>({count})</span>}
                </button>
              );
            })}
          </div>

          {/* ── Search bar ──────────────────────────────────────────────────── */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search medications, lab tests, services…"
              className="pl-9 pr-9 border-gray-200 focus:border-blue-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ── Results header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-bold text-gray-900">{filteredItems.length}</span> items
              {search && <> matching "<span className="font-semibold text-blue-600">{search}</span>"</>}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Filter className="h-3.5 w-3.5" />
              Sorted by revenue (highest first)
            </div>
          </div>

          {/* ── Item list ───────────────────────────────────────────────────── */}
          {/* ── Patient Cards Section ────────────────────────────────────────── */}
          {cardData && cardData.cards.items.length > 0 && (
            <div className="rounded-xl border border-blue-200 overflow-hidden">
              {/* Dropdown header */}
              <button
                onClick={() => setCardsOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">Patient Cards</span>
                  <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{cardData.cards.totalCards} issued</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-blue-900">{fmtCurrency(cardData.cards.totalRevenue)}</span>
                  {cardsOpen
                    ? <ChevronUp className="h-4 w-4 text-blue-500" />
                    : <ChevronDown className="h-4 w-4 text-blue-500" />}
                </div>
              </button>

              {/* Collapsible body */}
              {cardsOpen && (
              <div className="p-4 space-y-3 bg-white">

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cardData.cards.items.map((c) => {
                  const CARD_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
                    Basic:   { bg: 'bg-slate-50',   border: 'border-slate-200',  dot: 'bg-slate-400' },
                    Premium: { bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-500' },
                    VIP:     { bg: 'bg-violet-50',  border: 'border-violet-200', dot: 'bg-violet-500' },
                    Family:  { bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500' },
                  };
                  const cfg = CARD_COLORS[c.cardType] ?? CARD_COLORS.Basic;
                  return (
                    <div key={c.cardType} className={`rounded-xl border-2 ${cfg.bg} ${cfg.border} p-4`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${cfg.dot}`} />
                          <span className="font-bold text-gray-800 text-sm">{c.cardType} Card</span>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{c.totalCount} issued</span>
                      </div>
                      <p className="text-xl font-black text-gray-900 mb-3">{fmtCurrency(c.totalRevenue)}</p>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-100">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                          <span className="text-gray-500">Active</span>
                          <span className="ml-auto font-bold text-gray-800">{c.activeCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-100">
                          <Clock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          <span className="text-gray-500">Grace</span>
                          <span className="ml-auto font-bold text-gray-800">{c.graceCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-100">
                          <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          <span className="text-gray-500">Expired</span>
                          <span className="ml-auto font-bold text-gray-800">{c.expiredCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-100">
                          <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                          <span className="text-gray-500">Cancelled</span>
                          <span className="ml-auto font-bold text-gray-800">{c.cancelledCount}</span>
                        </div>
                      </div>
                      {c.monthlyBreakdown.length > 0 && (
                        <div className="mt-3 h-20">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={c.monthlyBreakdown} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} axisLine={false} />
                              <RechartsTooltip
                                formatter={(v: number) => [fmtCurrency(v), 'Revenue']}
                                labelFormatter={fmtMonth}
                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)', fontSize: 11 }}
                              />
                              <Bar dataKey="revenue" radius={[3, 3, 0, 0]} fill={cfg.dot.replace('bg-', '#').replace('slate-400','94a3b8').replace('blue-500','3b82f6').replace('violet-500','8b5cf6').replace('emerald-500','10b981')} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              </div>
              )}
            </div>
          )}

          {/* ── Insurance Section ────────────────────────────────────────────── */}
          {cardData && cardData.insurance.totalRevenue > 0 && (
            <div className="rounded-xl border border-emerald-200 overflow-hidden">
              {/* Dropdown header */}
              <button
                onClick={() => setInsuranceOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">Insurance Payments</span>
                  <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{cardData.insurance.totalInvoices} invoices</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-emerald-900">{fmtCurrency(cardData.insurance.totalRevenue)}</span>
                  {insuranceOpen
                    ? <ChevronUp className="h-4 w-4 text-emerald-500" />
                    : <ChevronDown className="h-4 w-4 text-emerald-500" />}
                </div>
              </button>

              {/* Collapsible body */}
              {insuranceOpen && (
                <div className="p-4 bg-white space-y-4">
                  {cardData.insurance.monthlyBreakdown.length > 0 && (
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cardData.insurance.monthlyBreakdown} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtCompact} width={50} />
                          <RechartsTooltip
                            formatter={(v: number) => [fmtCurrency(v), 'Insurance Revenue']}
                            labelFormatter={fmtMonth}
                            contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)', fontSize: 12 }}
                          />
                          <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {cardData.insurance.monthlyBreakdown.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100">
                            <th className="text-left py-1.5 font-medium">Month</th>
                            <th className="text-right py-1.5 font-medium">Invoices</th>
                            <th className="text-right py-1.5 font-medium">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cardData.insurance.monthlyBreakdown.map(m => (
                            <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="py-1.5 text-gray-600">{fmtMonth(m.month)}</td>
                              <td className="py-1.5 text-right text-gray-700 font-medium">{m.invoiceCount}</td>
                              <td className="py-1.5 text-right font-bold text-gray-900">{fmtCurrency(m.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Divider before items list ────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-bold text-gray-600">Medications, Lab Tests & Services</span>
            </div>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {filteredItems.length > 0 ? (
            <div className="space-y-2">
              {filteredItems.map((item, i) => (
                <ItemRow key={`${item.itemType}-${item.description}`} item={item} rank={i + 1} maxRevenue={maxRevenue} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Search className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-base font-semibold">No items found</p>
              <p className="text-sm mt-1">Try adjusting the date range or search term</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ItemRevenueReport;
