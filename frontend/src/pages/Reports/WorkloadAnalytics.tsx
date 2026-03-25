import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import workloadService, { WorkloadSummaryItem, WorkloadTimeseriesItem } from '../../services/workloadService';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Activity,
  MousePointerClick,
  Clock,
  TrendingUp,
  Search,
  RefreshCw,
  BarChart3,
  Route,
  Users,
  Eye,
  Calendar,
  Filter,
  Zap,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Tooltip, Legend, TimeScale, Filler, ArcElement
);

/* ─── helpers ─────────────────────────────────────────────────────────── */
const msToHuman = (ms: number) => {
  if (!ms || ms < 0) return '0s';
  const sec = Math.floor(ms / 1000);
  const mins = Math.floor(sec / 60);
  const hours = Math.floor(mins / 60);
  const rem = sec % 60;
  const remMins = mins % 60;
  if (hours > 0) return `${hours}h ${remMins}m`;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${rem}s`;
};

const ROLE_COLORS: Record<string, string> = {
  admin:     '#6366f1',
  doctor:    '#0ea5e9',
  nurse:     '#10b981',
  reception: '#f59e0b',
  finance:   '#8b5cf6',
  lab:       '#ef4444',
  imaging:   '#ec4899',
  default:   '#64748b',
};

const GRADIENT = {
  purple: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  blue:   'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  green:  'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)',
  amber:  'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
};

type SortKey = 'path' | 'visits' | 'clicks' | 'avgDurationMs' | 'totalDurationMs' | 'lastSeen';
type SortDir = 'asc' | 'desc';

/* ─── animated KPI card ───────────────────────────────────────────────── */
const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  animate?: boolean;
}> = ({ icon, label, value, sub, gradient, animate }) => (
  <div style={{
    background: gradient,
    borderRadius: 20,
    padding: '1.5rem',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0,0,0,.18)',
    flex: 1,
    minWidth: 180,
    transition: 'transform .2s ease, box-shadow .2s ease',
  }}
    className="kpi-card-hover"
  >
    {/* decorative circles */}
    <div style={{
      position: 'absolute', top: -24, right: -24,
      width: 90, height: 90, borderRadius: '50%',
      background: 'rgba(255,255,255,.12)',
    }} />
    <div style={{
      position: 'absolute', bottom: -16, right: 24,
      width: 56, height: 56, borderRadius: '50%',
      background: 'rgba(255,255,255,.08)',
    }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, position: 'relative' }}>
      <div style={{
        background: 'rgba(255,255,255,.22)',
        borderRadius: 12,
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, opacity: .85, fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, position: 'relative' }}>{value}</div>
    {sub && <div style={{ fontSize: 12, opacity: .75, marginTop: 4, position: 'relative' }}>{sub}</div>}
  </div>
);

/* ─── role pill ───────────────────────────────────────────────────────── */
const RolePill: React.FC<{ role?: string }> = ({ role }) => {
  const r = (role || 'default').toLowerCase();
  const color = ROLE_COLORS[r] ?? ROLE_COLORS.default;
  return (
    <span style={{
      background: `${color}20`,
      color,
      border: `1px solid ${color}50`,
      borderRadius: 20,
      padding: '2px 10px',
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {role || '—'}
    </span>
  );
};

/* ─── sort button ─────────────────────────────────────────────────────── */
const SortBtn: React.FC<{ col: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void }> = ({
  col, current, dir, onSort,
}) => (
  <button
    onClick={() => onSort(col)}
    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, color: 'inherit', fontWeight: 'inherit', fontSize: 'inherit' }}
  >
    {col === current ? (dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ArrowUpDown size={12} style={{ opacity: .35 }} />}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════ */
const WorkloadAnalytics: React.FC = () => {
  const [rows, setRows] = useState<WorkloadSummaryItem[]>([]);
  const [role, setRole] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [interval, setIntervalVal] = useState<'day' | 'week' | 'month'>('day');
  const [series, setSeries] = useState<WorkloadTimeseriesItem[]>([]);
  const [topPaths, setTopPaths] = useState<{ path: string; visits: number }[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('visits');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  /* ── derived ── */
  const filtered = useMemo(() => {
    let arr = rows.filter(r =>
      !search || r.path.toLowerCase().includes(search.toLowerCase())
    );
    arr = [...arr].sort((a, b) => {
      let va: any = a[sortKey] ?? '';
      let vb: any = b[sortKey] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, search, sortKey, sortDir]);

  const totalVisits    = useMemo(() => filtered.reduce((s, r) => s + (r.visits || 0), 0), [filtered]);
  const totalClicks    = useMemo(() => filtered.reduce((s, r) => s + (r.clicks || 0), 0), [filtered]);
  const totalDuration  = useMemo(() => filtered.reduce((s, r) => s + (r.totalDurationMs || 0), 0), [filtered]);
  const avgDurationAll = useMemo(() => (filtered.length ? Math.round(filtered.reduce((s, r) => s + (r.avgDurationMs || 0), 0) / filtered.length) : 0), [filtered]);

  /* role breakdown for doughnut */
  const roleBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const k = r.role || 'unknown';
      map[k] = (map[k] || 0) + (r.visits || 0);
    });
    return map;
  }, [rows]);

  /* ── handlers ── */
  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return prev; }
      setSortDir('desc');
      return key;
    });
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, ts, top] = await Promise.all([
        workloadService.getSummary({ role: role || undefined, startDate: startDate || undefined, endDate: endDate || undefined }),
        workloadService.getTimeseries({ role: role || undefined, startDate: startDate || undefined, endDate: endDate || undefined, interval }),
        workloadService.getTop({ role: role || undefined, startDate: startDate || undefined, endDate: endDate || undefined, by: 'path', limit: 10 }),
      ]);
      setRows(data);
      setSeries(ts);
      setTopPaths((top as any[]).map(t => ({ path: t.path ?? String(t.userId ?? ''), visits: t.visits ?? 0 })).filter(t => !!t.path));
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e?.message || 'Failed to load workload analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  /* ═══════════════════════ CHART DATA ═════════════════════════════════ */
  /* visits + clicks dual-axis line chart */
  const lineData = {
    labels: series.map(s => {
      try { return format(parseISO(s.bucket), interval === 'month' ? 'MMM yy' : interval === 'week' ? 'dd MMM' : 'dd MMM'); }
      catch { return s.bucket; }
    }),
    datasets: [
      {
        label: 'Visits',
        data: series.map(s => s.visits || 0),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,.15)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        yAxisID: 'y',
      },
      {
        label: 'Clicks',
        data: series.map(s => s.clicks || 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,.1)',
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        borderDash: [5, 3],
        yAxisID: 'y',
      },
    ],
  };

  const lineOpts: any = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: true, position: 'top', labels: { usePointStyle: true, pointStyleWidth: 10 } },
      tooltip: { backgroundColor: 'rgba(15,23,42,.95)', padding: 10, cornerRadius: 10 },
    },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { maxTicksLimit: 12, maxRotation: 0 } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } },
    },
  };

  /* bar chart */
  const barData = {
    labels: topPaths.map(t => t.path.length > 22 ? '…' + t.path.slice(-20) : t.path),
    datasets: [{
      label: 'Visits',
      data: topPaths.map(t => t.visits || 0),
      backgroundColor: topPaths.map((_, i) => `hsl(${220 + i * 18},70%,62%)`),
      borderRadius: 8,
      borderSkipped: false,
    }],
  };
  const barOpts: any = {
    responsive: true,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(15,23,42,.95)', padding: 10, cornerRadius: 10 },
    },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } },
      y: { grid: { display: false } },
    },
  };

  /* doughnut */
  const doughnutData = {
    labels: Object.keys(roleBreakdown),
    datasets: [{
      data: Object.values(roleBreakdown),
      backgroundColor: Object.keys(roleBreakdown).map(r => ROLE_COLORS[r.toLowerCase()] ?? ROLE_COLORS.default),
      borderWidth: 3,
      borderColor: '#fff',
      hoverOffset: 8,
    }],
  };
  const doughnutOpts: any = {
    responsive: true,
    cutout: '68%',
    plugins: {
      legend: { position: 'right', labels: { pointStyle: 'circle', usePointStyle: true } },
      tooltip: { backgroundColor: 'rgba(15,23,42,.95)', padding: 10, cornerRadius: 10 },
    },
  };

  /* ── max visits for heat row ── */
  const maxVisits = useMemo(() => Math.max(1, ...filtered.map(r => r.visits || 0)), [filtered]);

  /* ══════════════════════════ RENDER ══════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'inherit' }}>
      {/* ── inline style for hover effect ── */}
      <style>{`
        .kpi-card-hover:hover { transform: translateY(-4px); box-shadow: 0 18px 48px rgba(0,0,0,.24) !important; }
        .wa-table-row { transition: background .15s; }
        .wa-table-row:hover { background: rgba(99,102,241,.06) !important; }
        .wa-filter-card { background: linear-gradient(135deg,#f8faff 0%,#eef2ff 100%); border: 1px solid #e0e7ff; border-radius: 20px; padding: 1.5rem; }
        .dark .wa-filter-card { background: hsl(var(--card)); border-color: hsl(var(--border)); }
        @keyframes wa-spin { to { transform: rotate(360deg); } }
        .wa-spin { animation: wa-spin 1s linear infinite; }
        @keyframes wa-fade-in { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
        .wa-fade-in { animation: wa-fade-in .4s ease; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={26} style={{ color: '#6366f1' }} />
            Workload Analytics
          </h1>
          {lastRefreshed && (
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Last refreshed {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
            </p>
          )}
        </div>
        <Button
          onClick={load}
          disabled={loading}
          style={{ borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, background: GRADIENT.purple, color: '#fff', border: 'none', padding: '10px 20px' }}
        >
          <RefreshCw size={15} className={loading ? 'wa-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {/* ── FILTERS ── */}
      <div className="wa-filter-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Filter size={14} style={{ color: '#6366f1' }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Filters</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <Input
              placeholder="Search path…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, borderRadius: 12 }}
            />
          </div>
          <Select value={role || 'all'} onValueChange={v => setRole(v === 'all' ? '' : v)}>
            <SelectTrigger style={{ borderRadius: 12 }}><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              {['all','admin','doctor','nurse','reception','finance','lab','imaging'].map(r => (
                <SelectItem key={r} value={r}>{r === 'all' ? 'All roles' : r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ borderRadius: 12 }} placeholder="Start date" />
          <Input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   style={{ borderRadius: 12 }} placeholder="End date" />
          <Select value={interval} onValueChange={v => setIntervalVal(v as any)}>
            <SelectTrigger style={{ borderRadius: 12 }}><SelectValue placeholder="Interval" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load} disabled={loading} style={{ borderRadius: 12, background: GRADIENT.purple, color: '#fff', border: 'none' }}>
            {loading ? 'Applying…' : 'Apply Filters'}
          </Button>
        </div>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', color: '#dc2626', fontSize: 14 }}>
          ⚠ {error}
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }} className="wa-fade-in">
        <KpiCard icon={<Eye size={20} />}           label="Total Visits"    value={totalVisits.toLocaleString()}  sub={`${filtered.length} paths tracked`}         gradient={GRADIENT.purple} />
        <KpiCard icon={<MousePointerClick size={20}/>} label="Total Clicks"  value={totalClicks.toLocaleString()}  sub="Across all routes"                           gradient={GRADIENT.blue}   />
        <KpiCard icon={<Clock size={20} />}          label="Total Time"     value={msToHuman(totalDuration)}       sub="Session time logged"                         gradient={GRADIENT.green}  />
        <KpiCard icon={<Zap size={20} />}            label="Avg Session"    value={msToHuman(avgDurationAll)}      sub="Per path average"                            gradient={GRADIENT.amber}  />
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20 }}>
        {/* Line chart */}
        <Card style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
          <CardHeader style={{ paddingBottom: 8 }}>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <TrendingUp size={16} style={{ color: '#6366f1' }} /> Activity Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {series.length > 0
              ? <Line data={lineData} options={lineOpts} />
              : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>No timeseries data</div>
            }
          </CardContent>
        </Card>

        {/* Donut */}
        <Card style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
          <CardHeader style={{ paddingBottom: 8 }}>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <Users size={16} style={{ color: '#0ea5e9' }} /> Visits by Role
            </CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', justifyContent: 'center' }}>
            {Object.keys(roleBreakdown).length > 0
              ? <div style={{ maxWidth: 320, width: '100%' }}><Doughnut data={doughnutData} options={doughnutOpts} /></div>
              : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>No role data</div>
            }
          </CardContent>
        </Card>
      </div>

      {/* ── CHART ROW 2: Top Paths Horizontal Bar ── */}
      <Card style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        <CardHeader style={{ paddingBottom: 8 }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
            <BarChart3 size={16} style={{ color: '#10b981' }} /> Top 10 Paths by Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPaths.length > 0
            ? <Bar data={barData} options={barOpts} />
            : <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>No path data</div>
          }
        </CardContent>
      </Card>

      {/* ── PER-PATH TABLE ── */}
      <Card style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        <CardHeader style={{ paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <Route size={16} style={{ color: '#f59e0b' }} /> Per-Path Breakdown
            </CardTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge variant="outline" style={{ borderRadius: 20, fontSize: 11 }}>
                {filtered.length} route{filtered.length !== 1 ? 's' : ''}
              </Badge>
              {search && (
                <Badge style={{ borderRadius: 20, fontSize: 11, background: '#eef2ff', color: '#6366f1', border: 'none' }}>
                  Filtered
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <RefreshCw size={28} className="wa-spin" style={{ color: '#6366f1', margin: '0 auto 12px' }} />
              <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading analytics…</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg,#f8faff,#eef2ff)', borderBottom: '2px solid #e0e7ff' }}>
                    {[
                      { label: 'Path',       key: 'path' as SortKey,          icon: <Route size={12} /> },
                      { label: 'Role',       key: null,                        icon: <Users size={12} /> },
                      { label: 'Visits',     key: 'visits' as SortKey,        icon: <Eye size={12} /> },
                      { label: 'Clicks',     key: 'clicks' as SortKey,        icon: <MousePointerClick size={12} /> },
                      { label: 'Avg Time',   key: 'avgDurationMs' as SortKey, icon: <Clock size={12} /> },
                      { label: 'Total Time', key: 'totalDurationMs' as SortKey, icon: <Activity size={12} /> },
                      { label: 'Last Seen',  key: 'lastSeen' as SortKey,      icon: <Calendar size={12} /> },
                    ].map(col => (
                      <th key={col.label} style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', color: '#4f46e5', fontSize: 12, textTransform: 'uppercase', letterSpacing: .5 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {col.icon} {col.label}
                          {col.key && <SortBtn col={col.key} current={sortKey} dir={sortDir} onSort={handleSort} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const heatPct = ((r.visits || 0) / maxVisits) * 100;
                    const heatColor = `rgba(99,102,241,${(heatPct / 100) * 0.12})`;
                    return (
                      <tr
                        key={`${r.path}-${r.role || 'all'}-${idx}`}
                        className="wa-table-row"
                        style={{ borderBottom: '1px solid #f1f5f9', background: heatColor }}
                      >
                        <td style={{ padding: '11px 14px', fontWeight: 600, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.path}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f1f5f9', borderRadius: 6, padding: '2px 7px' }}>
                            {r.path}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}><RolePill role={r.role} /></td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 4, background: '#e0e7ff', borderRadius: 99, overflow: 'hidden', minWidth: 40 }}>
                              <div style={{ width: `${heatPct}%`, height: '100%', background: '#6366f1', borderRadius: 99 }} />
                            </div>
                            <span style={{ fontWeight: 700, color: '#4f46e5', minWidth: 32, textAlign: 'right' }}>{r.visits}</span>
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 600 }}>{r.clicks}</td>
                        <td style={{ padding: '11px 14px', color: '#0ea5e9', fontWeight: 600 }}>{msToHuman(r.avgDurationMs)}</td>
                        <td style={{ padding: '11px 14px', color: '#10b981', fontWeight: 600 }}>{msToHuman(r.totalDurationMs)}</td>
                        <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: 12 }}>
                          {r.lastSeen
                            ? <span title={format(new Date(r.lastSeen), 'yyyy-MM-dd HH:mm')}>
                                {formatDistanceToNow(new Date(r.lastSeen), { addSuffix: true })}
                              </span>
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                        <Route size={32} style={{ margin: '0 auto 10px', opacity: .3 }} />
                        <div>No route data found</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkloadAnalytics;
