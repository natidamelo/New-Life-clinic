import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import biService from '../../services/biService';

type Tab = 'financial' | 'appointments' | 'market' | 'audit';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'financial', label: 'Financial Intelligence', icon: '💰' },
  { id: 'appointments', label: 'Appointments', icon: '📅' },
  { id: 'market', label: 'Market Analysis', icon: '🗺️' },
  { id: 'audit', label: 'Audit Log', icon: '🛡️' },
];

const KpiCard = ({ label, value, sub, color = '#2563eb' }: { label: string; value: string; sub?: string; color?: string }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.08)', borderLeft: `4px solid ${color}`, minWidth: 180 }}>
    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: color, marginTop: 2 }}>{sub}</div>}
  </div>
);

const SimpleBar = ({ data, labelKey, valueKey, color = '#3b82f6' }: { data: any[]; labelKey: string; valueKey: string; color?: string }) => {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 120, fontSize: 13, color: '#374151', textAlign: 'right', flexShrink: 0 }}>{d[labelKey]}</div>
          <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 6, height: 28, position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: `${(d[valueKey] / max) * 100}%`, background: color, height: '100%', borderRadius: 6, transition: 'width .5s ease', minWidth: 2 }} />
            <span style={{ position: 'absolute', right: 8, top: 4, fontSize: 12, fontWeight: 600, color: '#374151' }}>{d[valueKey]}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const TrendChart = ({ data }: { data: { label: string; revenue: number; expenses: number }[] }) => {
  if (!data.length) return <div style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>No trend data</div>;
  const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.expenses]), 1);
  const h = 200, w = 100;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: h + 40, padding: '0 8px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 50 }}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: h }}>
              <div style={{ width: 16, background: '#3b82f6', borderRadius: '4px 4px 0 0', height: `${(d.revenue / maxVal) * h}px`, transition: 'height .5s' }} title={`Rev: ${d.revenue.toLocaleString()}`} />
              <div style={{ width: 16, background: '#ef4444', borderRadius: '4px 4px 0 0', height: `${(d.expenses / maxVal) * h}px`, transition: 'height .5s' }} title={`Exp: ${d.expenses.toLocaleString()}`} />
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 12, color: '#3b82f6' }}>■ Revenue</span>
        <span style={{ fontSize: 12, color: '#ef4444' }}>■ Expenses</span>
      </div>
    </div>
  );
};

const Treemap = ({ data }: { data: { subCity: string; count: number; percentage: number }[] }) => {
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48'];
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderRadius: 12, overflow: 'hidden' }}>
      {data.slice(0, 12).map((d, i) => {
        const pct = total > 0 ? (d.count / total) * 100 : 0;
        return (
          <div key={i} style={{ background: colors[i % colors.length], color: '#fff', borderRadius: 8, padding: '12px 16px', flex: `${Math.max(pct, 8)} 0 0`, minWidth: 80, cursor: 'default' }}
            title={`${d.subCity}: ${d.count} patients (${d.percentage}%)`}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{d.subCity || 'Unknown'}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{d.count}</div>
            <div style={{ fontSize: 11, opacity: .8 }}>{d.percentage}%</div>
          </div>
        );
      })}
    </div>
  );
};

const BusinessIntelligence: React.FC = () => {
  const [tab, setTab] = useState<Tab>('financial');
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Data states
  const [financial, setFinancial] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [daily, setDaily] = useState<any>(null);
  const [noShowData, setNoShowData] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [referrals, setReferrals] = useState<any>(null);
  const [demographics, setDemographics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any>(null);
  const [auditSummary, setAuditSummary] = useState<any>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [dailyDate, setDailyDate] = useState(now.toISOString().split('T')[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'financial') {
        const [fin, tr] = await Promise.all([
          biService.getMonthlyFinancialSummary(year, month),
          biService.getFinancialTrend(12),
        ]);
        setFinancial(fin.data);
        setTrend(tr.data || []);
      } else if (tab === 'appointments') {
        const [d, ns] = await Promise.all([
          biService.getDailyDashboard(dailyDate),
          biService.getNoShowAnalysis(6),
        ]);
        setDaily(d.data);
        setNoShowData(ns.data || []);
      } else if (tab === 'market') {
        const [h, r, dem] = await Promise.all([
          biService.getPatientHeatmap(),
          biService.getReferralAnalytics(6),
          biService.getPatientDemographics(),
        ]);
        setHeatmap(h.data);
        setReferrals(r.data);
        setDemographics(dem.data);
      } else if (tab === 'audit') {
        const [logs, summary] = await Promise.all([
          biService.getAuditLogs({ page: String(auditPage), limit: '20' }),
          biService.getAuditSummary(30),
        ]);
        setAuditLogs(logs.data);
        setAuditSummary(summary.data);
      }
    } catch (err: any) {
      console.error('[BI] Load error:', err);
      toast.error(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tab, year, month, dailyDate, auditPage]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => (n || 0).toLocaleString();
  const etb = (n: number) => `${fmt(n)} ETB`;

  const sectionStyle: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.08)', marginBottom: 20 };
  const gridStyle = (cols: number): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 });

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>📊 Business Intelligence</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>Clinic performance analytics and market insights</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', borderRadius: 12, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all .2s',
              background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#111827' : '#6b7280',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>⏳ Loading data...</div>}

      {/* ═══ FINANCIAL TAB ═══ */}
      {!loading && tab === 'financial' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
            <select value={month} onChange={e => setMonth(+e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={load} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Refresh</button>
          </div>

          {financial && (
            <>
              <div style={{ ...gridStyle(4), marginBottom: 20 }}>
                <KpiCard label="Total Revenue" value={etb(financial.revenue?.total)} color="#10b981" />
                <KpiCard label="Total Expenses" value={etb(financial.expenses?.total)} color="#ef4444" />
                <KpiCard label="Net Income" value={etb(financial.kpis?.netIncome)} color={financial.kpis?.netIncome >= 0 ? '#10b981' : '#ef4444'} sub={`${financial.kpis?.profitMargin}% margin`} />
                <KpiCard label="Cost per Visit" value={etb(financial.kpis?.costPerVisit)} color="#8b5cf6" sub={`${financial.visits?.totalVisits} visits`} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                <div style={sectionStyle}>
                  <h3 style={{ marginTop: 0, color: '#111827' }}>📈 Revenue vs Expenses Trend (12 months)</h3>
                  <TrendChart data={trend} />
                </div>
                <div style={sectionStyle}>
                  <h3 style={{ marginTop: 0, color: '#111827' }}>💳 Revenue Cycle (RCM)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Total Invoices', val: financial.rcm?.totalInvoices, color: '#6b7280' },
                      { label: 'Paid', val: financial.rcm?.paidInvoices, color: '#10b981' },
                      { label: 'Pending', val: financial.rcm?.pendingInvoices, color: '#f59e0b' },
                      { label: 'Overdue', val: financial.rcm?.overdueInvoices, color: '#ef4444' },
                      { label: 'Collection Rate', val: `${financial.rcm?.collectionRate}%`, color: '#3b82f6' },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: '#6b7280', fontSize: 14 }}>{r.label}</span>
                        <span style={{ fontWeight: 700, color: r.color }}>{typeof r.val === 'number' ? fmt(r.val) : r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {financial.revenue?.breakdown && Object.keys(financial.revenue.breakdown).length > 0 && (
                <div style={sectionStyle}>
                  <h3 style={{ marginTop: 0, color: '#111827' }}>📊 Revenue by Category</h3>
                  <SimpleBar data={Object.entries(financial.revenue.breakdown).map(([k, v]) => ({ category: k, amount: v as number })).sort((a, b) => b.amount - a.amount)} labelKey="category" valueKey="amount" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ APPOINTMENTS TAB ═══ */}
      {!loading && tab === 'appointments' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
            <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db' }} />
            <button onClick={load} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Refresh</button>
          </div>

          {daily && (
            <>
              <div style={{ ...gridStyle(5), marginBottom: 20 }}>
                <KpiCard label="Scheduled" value={fmt(daily.summary?.scheduled)} color="#3b82f6" />
                <KpiCard label="Completed" value={fmt(daily.summary?.completed)} color="#10b981" />
                <KpiCard label="Checked In" value={fmt(daily.summary?.checkedIn)} color="#f59e0b" />
                <KpiCard label="No Shows" value={fmt(daily.summary?.noShow)} color="#ef4444" sub={`${daily.noShowRate}% rate`} />
                <KpiCard label="Cancelled" value={fmt(daily.summary?.cancelled)} color="#6b7280" />
              </div>

              {daily.byDoctor?.length > 0 && (
                <div style={sectionStyle}>
                  <h3 style={{ marginTop: 0, color: '#111827' }}>👨‍⚕️ By Doctor</h3>
                  <SimpleBar data={daily.byDoctor} labelKey="name" valueKey="scheduled" color="#8b5cf6" />
                </div>
              )}

              {daily.appointments?.length > 0 && (
                <div style={sectionStyle}>
                  <h3 style={{ marginTop: 0, color: '#111827' }}>📋 Appointment List</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Patient', 'ID', 'Doctor', 'Time', 'Type', 'Status'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {daily.appointments.map((a: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 12px' }}>{a.patient}</td>
                            <td style={{ padding: '8px 12px', color: '#6b7280' }}>{a.patientDisplayId || '-'}</td>
                            <td style={{ padding: '8px 12px' }}>{a.doctor}</td>
                            <td style={{ padding: '8px 12px' }}>{a.time ? new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                            <td style={{ padding: '8px 12px' }}>{a.type}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                background: a.status === 'Completed' ? '#d1fae5' : a.status === 'No Show' ? '#fee2e2' : a.status === 'Cancelled' ? '#f3f4f6' : '#dbeafe',
                                color: a.status === 'Completed' ? '#065f46' : a.status === 'No Show' ? '#991b1b' : a.status === 'Cancelled' ? '#6b7280' : '#1e40af' }}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {noShowData.length > 0 && (
            <div style={sectionStyle}>
              <h3 style={{ marginTop: 0, color: '#111827' }}>📉 No-Show Trend (6 months)</h3>
              <SimpleBar data={noShowData.map(d => ({ label: `${d.year}-${String(d.month).padStart(2,'0')}`, noShows: d.noShows, rate: Math.round(d.noShowRate) }))} labelKey="label" valueKey="noShows" color="#ef4444" />
            </div>
          )}
        </div>
      )}

      {/* ═══ MARKET TAB ═══ */}
      {!loading && tab === 'market' && (
        <div>
          {heatmap && (
            <div style={sectionStyle}>
              <h3 style={{ marginTop: 0, color: '#111827' }}>🗺️ Patient Geographic Heatmap <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>({heatmap.totalPatients} total patients)</span></h3>
              <Treemap data={heatmap.areas || []} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {referrals?.referralSources && (
              <div style={sectionStyle}>
                <h3 style={{ marginTop: 0, color: '#111827' }}>📣 Referral Sources</h3>
                <SimpleBar data={referrals.referralSources} labelKey="source" valueKey="count" color="#8b5cf6" />
              </div>
            )}
            {demographics?.gender && (
              <div style={sectionStyle}>
                <h3 style={{ marginTop: 0, color: '#111827' }}>👥 Gender Distribution</h3>
                <SimpleBar data={demographics.gender} labelKey="gender" valueKey="count" color="#ec4899" />
              </div>
            )}
          </div>

          {demographics?.ageGroups && (
            <div style={sectionStyle}>
              <h3 style={{ marginTop: 0, color: '#111827' }}>📊 Age Distribution</h3>
              <SimpleBar data={demographics.ageGroups} labelKey="range" valueKey="count" color="#06b6d4" />
            </div>
          )}

          {referrals?.growthTrend && (
            <div style={sectionStyle}>
              <h3 style={{ marginTop: 0, color: '#111827' }}>📈 New Patient Growth Trend</h3>
              <SimpleBar data={referrals.growthTrend} labelKey="label" valueKey="newPatients" color="#10b981" />
            </div>
          )}
        </div>
      )}

      {/* ═══ AUDIT TAB ═══ */}
      {!loading && tab === 'audit' && (
        <div>
          {auditSummary && (
            <div style={{ ...gridStyle(3), marginBottom: 20 }}>
              <KpiCard label="Total Entries (30d)" value={fmt(auditSummary.totalEntries)} color="#6366f1" />
              <div style={sectionStyle}>
                <h4 style={{ marginTop: 0, fontSize: 14, color: '#6b7280' }}>By Action</h4>
                {auditSummary.byAction?.map((a: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span>{a.action}</span><span style={{ fontWeight: 600 }}>{a.count}</span>
                  </div>
                ))}
              </div>
              <div style={sectionStyle}>
                <h4 style={{ marginTop: 0, fontSize: 14, color: '#6b7280' }}>Top Users</h4>
                {auditSummary.topUsers?.slice(0, 5).map((u: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span>{u.userName}</span><span style={{ fontWeight: 600 }}>{u.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {auditLogs && (
            <div style={sectionStyle}>
              <h3 style={{ marginTop: 0, color: '#111827' }}>📜 Recent Audit Entries</h3>
              {auditLogs.logs?.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center' }}>No audit entries yet. Activity will appear here as users interact with the system.</p>}
              {auditLogs.logs?.length > 0 && (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Time', 'User', 'Role', 'Action', 'Resource', 'Description'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.logs.map((log: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                          <td style={{ padding: '6px 10px' }}>{log.userName}</td>
                          <td style={{ padding: '6px 10px' }}>{log.userRole}</td>
                          <td style={{ padding: '6px 10px' }}><span style={{ padding: '2px 6px', borderRadius: 4, background: '#dbeafe', color: '#1e40af', fontSize: 11, fontWeight: 600 }}>{log.action}</span></td>
                          <td style={{ padding: '6px 10px' }}>{log.resourceType}</td>
                          <td style={{ padding: '6px 10px', color: '#6b7280', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>← Prev</button>
                    <span style={{ padding: '6px 12px', color: '#6b7280' }}>Page {auditPage} of {auditLogs.totalPages || 1}</span>
                    <button disabled={auditPage >= (auditLogs.totalPages || 1)} onClick={() => setAuditPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>Next →</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessIntelligence;
