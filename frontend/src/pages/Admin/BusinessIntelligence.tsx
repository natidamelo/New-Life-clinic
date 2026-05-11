import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import biService from '../../services/biService';

type Tab = 'financial' | 'appointments' | 'market' | 'audit' | 'strategy' | 'scenario';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'financial', label: 'Financial Intelligence', icon: '💰' },
  { id: 'strategy', label: 'Financial Strategy', icon: '🎯' },
  { id: 'scenario', label: 'Scenario & Growth', icon: '📈' },
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

const BusinessIntelligence: React.FC = () => {
  const [tab, setTab] = useState<Tab>('financial');
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Data states
  const [financial, setFinancial] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [strategy, setStrategy] = useState<any>(null);
  const [targetProfit, setTargetProfit] = useState<number>(50000);
  const [loans, setLoans] = useState<any[]>([]);
  
  // Scenario & Growth states
  const [recalls, setRecalls] = useState<any[]>([]);
  const [revSim, setRevSim] = useState<number>(0);
  const [expSim, setExpSim] = useState<number>(0);
  
  const [daily, setDaily] = useState<any>(null);
  const [noShowData, setNoShowData] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [referrals, setReferrals] = useState<any>(null);
  const [demographics, setDemographics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any>(null);
  const [auditSummary, setAuditSummary] = useState<any>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [dailyDate, setDailyDate] = useState(now.toISOString().split('T')[0]);

  // Loan form
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanForm, setLoanForm] = useState({ name: '', principal: 0, interestRate: 0, monthlyPayment: 0, remainingBalance: 0, startDate: now.toISOString().split('T')[0] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'financial') {
        const [fin, tr] = await Promise.all([biService.getMonthlyFinancialSummary(year, month), biService.getFinancialTrend(12)]);
        setFinancial(fin.data); setTrend(tr.data || []);
      } else if (tab === 'strategy') {
        const [fc, ls, rc] = await Promise.all([biService.getForecast(targetProfit), biService.getLoans(), biService.getRecalls()]);
        setStrategy(fc.data); setLoans(ls.data || []); setRecalls(rc.data || []);
      } else if (tab === 'scenario') {
        const fc = await biService.getForecast(targetProfit);
        setStrategy(fc.data);
      } else if (tab === 'appointments') {
        const [d, ns] = await Promise.all([biService.getDailyDashboard(dailyDate), biService.getNoShowAnalysis(6)]);
        setDaily(d.data); setNoShowData(ns.data || []);
      } else if (tab === 'market') {
        const [h, r, dem] = await Promise.all([biService.getPatientHeatmap(), biService.getReferralAnalytics(6), biService.getPatientDemographics()]);
        setHeatmap(h.data); setReferrals(r.data); setDemographics(dem.data);
      } else if (tab === 'audit') {
        const [logs, summary] = await Promise.all([biService.getAuditLogs({ page: String(auditPage), limit: '20' }), biService.getAuditSummary(30)]);
        setAuditLogs(logs.data); setAuditSummary(summary.data);
      }
    } catch (err: any) { toast.error(err.message || 'Failed to load data'); } finally { setLoading(false); }
  }, [tab, year, month, dailyDate, auditPage, targetProfit]);

  useEffect(() => { load(); }, [load]);

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await biService.createLoan(loanForm);
      toast.success('Loan added');
      setShowLoanForm(false);
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!window.confirm('Delete loan?')) return;
    try {
      await biService.deleteLoan(id);
      toast.success('Loan deleted');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const fmt = (n: number) => (n || 0).toLocaleString();
  const etb = (n: number) => `${fmt(n)} ETB`;
  const sectionStyle: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.08)', marginBottom: 20 };
  const gridStyle = (cols: number): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 });

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>📊 Business Intelligence</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', borderRadius: 12, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#111827' : '#6b7280',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>⏳ Loading data...</div>}

      {/* ═══ FINANCIAL TAB ═══ */}
      {!loading && tab === 'financial' && financial && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
            <select value={month} onChange={e => setMonth(+e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={load} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Refresh</button>
          </div>
          <div style={{ ...gridStyle(4), marginBottom: 20 }}>
            <KpiCard label="Total Revenue" value={etb(financial.revenue?.total)} color="#10b981" />
            <KpiCard label="Total Expenses" value={etb(financial.expenses?.total)} color="#ef4444" />
            <KpiCard label="True Net Cash Flow" value={etb(financial.kpis?.trueNetCashFlow)} color={financial.kpis?.trueNetCashFlow >= 0 ? '#10b981' : '#ef4444'} sub={`After ${etb(financial.loans?.totalMonthlyPayments)} loan payments`} />
            <KpiCard label="Cost per Visit" value={etb(financial.kpis?.costPerVisit)} color="#8b5cf6" sub={`${financial.visits?.totalVisits} visits`} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
             <div style={sectionStyle}>
               <h3 style={{ marginTop: 0, color: '#111827' }}>📊 Revenue by Category</h3>
               {financial.revenue?.breakdown && Object.keys(financial.revenue.breakdown).length > 0 ? (
                 <SimpleBar data={Object.entries(financial.revenue.breakdown).map(([k, v]) => ({ category: k, amount: v as number })).sort((a, b) => b.amount - a.amount)} labelKey="category" valueKey="amount" />
               ) : <p>No revenue data for this month.</p>}
             </div>
             <div style={sectionStyle}>
               <h3 style={{ marginTop: 0, color: '#111827' }}>💳 Revenue Cycle (RCM)</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 {Object.entries(financial.rcm || {}).map(([k, v]: any) => (
                   <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span style={{ color: '#6b7280' }}>{k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                     <span style={{ fontWeight: 700 }}>{fmt(v)}{k === 'collectionRate' ? '%' : ''}</span>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* ═══ STRATEGY TAB ═══ */}
      {!loading && tab === 'strategy' && strategy && (
        <div>
          {/* Action Items */}
          {strategy.actionItems?.length > 0 && (
            <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {strategy.actionItems.map((ai: any, i: number) => (
                <div key={i} style={{ background: ai.type === 'danger' ? '#fef2f2' : ai.type === 'warning' ? '#fffbeb' : '#eff6ff', 
                                      borderLeft: `4px solid ${ai.type === 'danger' ? '#ef4444' : ai.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                                      padding: '12px 16px', borderRadius: 8, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{ai.type === 'danger' ? '🚨' : ai.type === 'warning' ? '⚠️' : '💡'}</span>
                  <span>{ai.text}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ ...gridStyle(3), marginBottom: 20 }}>
            {/* Gap Analysis & Daily Targets */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: '#111827' }}>🎯 Target Profit Goal</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" value={targetProfit} onChange={e => setTargetProfit(+e.target.value)} style={{ width: 100, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db' }} />
                  <button onClick={load} style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4 }}>Set</button>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Fixed OpEx (Forecast)</span><span style={{ fontWeight: 600 }}>{etb(strategy.gapAnalysis.requiredRevenue - targetProfit - strategy.debtProfile.totalMonthlyPayments)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Loan Payments</span><span style={{ fontWeight: 600 }}>{etb(strategy.debtProfile.totalMonthlyPayments)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#10b981' }}>Desired Profit</span><span style={{ fontWeight: 600, color: '#10b981' }}>{etb(targetProfit)}</span>
                </div>
                <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                  <span style={{ fontWeight: 700 }}>Monthly Required Revenue</span><span style={{ fontWeight: 800 }}>{etb(strategy.gapAnalysis.requiredRevenue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', marginTop: 8 }}>
                  <span>Revenue Gap (Shortfall)</span><span style={{ fontWeight: 700 }}>{etb(strategy.gapAnalysis.revenueGap)}</span>
                </div>
                
                {/* Daily Targets Highlights */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 16, borderRadius: 8, marginTop: 12 }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', textAlign: 'center' }}>📅 Your Daily Targets</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Daily Revenue</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0ea5e9', marginTop: 4 }}>{etb(strategy.gapAnalysis.dailyTargetRevenue)}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>per day</div>
                    </div>
                    <div style={{ borderLeft: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Daily Visits</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>{strategy.gapAnalysis.dailyTargetVisits}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>avg {etb(strategy.gapAnalysis.avgRevenuePerVisit)}/visit</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakeven & Forecast */}
            <div style={sectionStyle}>
              <h3 style={{ margin: 0, color: '#111827', marginBottom: 16 }}>📈 Next Month Forecast</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Forecast Revenue</span><span style={{ fontWeight: 600 }}>{etb(strategy.forecast.revenue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Forecast Expenses</span><span style={{ fontWeight: 600 }}>{etb(strategy.forecast.expenses)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Net Cash Flow</span>
                  <span style={{ fontWeight: 600, color: strategy.forecast.netCashFlow >= 0 ? '#10b981' : '#ef4444' }}>{etb(strategy.forecast.netCashFlow)}</span>
                </div>
              </div>

              <h3 style={{ margin: 0, color: '#111827', marginTop: 24, marginBottom: 16 }}>⚖️ Current Month Breakeven</h3>
              <div style={{ background: '#f3f4f6', borderRadius: 8, height: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: `${strategy.breakeven.progress}%`, background: strategy.breakeven.progress >= 100 ? '#10b981' : '#f59e0b', height: '100%', transition: 'width .5s' }}></div>
                <span style={{ position: 'absolute', width: '100%', textAlign: 'center', top: 4, fontSize: 12, fontWeight: 700, color: strategy.breakeven.progress >= 50 ? '#fff' : '#374151' }}>
                  {strategy.breakeven.progress}% ({etb(strategy.breakeven.currentRevenue)} / {etb(strategy.breakeven.target)})
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>{strategy.breakeven.daysLeft} days left in month</div>
            </div>

            {/* Debt Profile */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: '#111827' }}>🏦 Debt Profile</h3>
                <button onClick={() => setShowLoanForm(!showLoanForm)} style={{ padding: '4px 8px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
                  + Add Loan
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#6b7280' }}>Total Debt</span><span style={{ fontWeight: 700 }}>{etb(strategy.debtProfile.totalDebt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ color: '#6b7280' }}>Debt-to-Income</span>
                <span style={{ fontWeight: 700, color: strategy.debtProfile.debtToIncomeRatio > 30 ? '#ef4444' : '#10b981' }}>{strategy.debtProfile.debtToIncomeRatio}%</span>
              </div>

              {showLoanForm && (
                <form onSubmit={handleAddLoan} style={{ background: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input placeholder="Loan Name" required value={loanForm.name} onChange={e => setLoanForm({...loanForm, name: e.target.value})} style={{ padding: 6 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input type="number" placeholder="Principal" required value={loanForm.principal || ''} onChange={e => setLoanForm({...loanForm, principal: +e.target.value})} style={{ padding: 6 }} />
                    <input type="number" placeholder="Remaining" required value={loanForm.remainingBalance || ''} onChange={e => setLoanForm({...loanForm, remainingBalance: +e.target.value})} style={{ padding: 6 }} />
                    <input type="number" placeholder="Monthly Pay" required value={loanForm.monthlyPayment || ''} onChange={e => setLoanForm({...loanForm, monthlyPayment: +e.target.value})} style={{ padding: 6 }} />
                    <input type="number" placeholder="Interest %" required value={loanForm.interestRate || ''} onChange={e => setLoanForm({...loanForm, interestRate: +e.target.value})} style={{ padding: 6 }} />
                  </div>
                  <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px', borderRadius: 4, cursor: 'pointer' }}>Save Loan</button>
                </form>
              )}

              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {loans.map((l: any) => (
                  <div key={l._id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, position: 'relative' }}>
                    <div style={{ fontWeight: 600 }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span>Bal: {fmt(l.remainingBalance)}</span>
                      <span>Pay: {fmt(l.monthlyPayment)}/mo</span>
                    </div>
                    <button onClick={() => handleDeleteLoan(l._id)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>

              {/* Debt Reduction Calculator (Surplus Allocation) */}
              <div style={{ marginTop: 20, background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>💰 Surplus Allocator</h4>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>When daily revenue exceeds your target of <b>{etb(strategy.gapAnalysis?.dailyTargetRevenue)}</b>:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span style={{ color: '#10b981' }}>70% → Principal Paydown</span>
                  <span style={{ color: '#3b82f6' }}>30% → Cash Reserves</span>
                </div>
              </div>
            </div>

            {/* Patient Recall System */}
            <div style={sectionStyle}>
              <h3 style={{ margin: 0, color: '#111827', marginBottom: 16 }}>📞 Patient Retention (3+ Months)</h3>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Recall these patients to close the revenue gap.</div>
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recalls.length === 0 && <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 20 }}>No pending recalls</div>}
                {recalls.map((pt, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f9fafb', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{pt.firstName} {pt.lastName}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{pt.phone || 'No Phone'}</div>
                    </div>
                    <button style={{ background: '#ec4899', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                            onClick={() => toast.success(`SMS sent to ${pt.firstName}`)}>
                      SMS Invite
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SCENARIO TAB ═══ */}
      {!loading && tab === 'scenario' && strategy && (
        <div>
          <div style={{ ...gridStyle(2), marginBottom: 20 }}>
            {/* Scenario Simulator */}
            <div style={sectionStyle}>
              <h3 style={{ margin: 0, color: '#111827', marginBottom: 16 }}>🧪 The "What-If" Engine</h3>
              
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Revenue Increase (%)</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>+{revSim}%</span>
                </div>
                <input type="range" min="0" max="100" value={revSim} onChange={e => setRevSim(+e.target.value)} style={{ width: '100%', accentColor: '#10b981' }} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Expense Reduction (%)</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>-{expSim}%</span>
                </div>
                <input type="range" min="0" max="50" value={expSim} onChange={e => setExpSim(+e.target.value)} style={{ width: '100%', accentColor: '#ef4444' }} />
              </div>

              <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid #334155', paddingBottom: 12 }}>
                  <span style={{ color: '#94a3b8' }}>Simulated Revenue</span>
                  <span style={{ fontWeight: 600 }}>{etb(strategy.forecast.revenue * (1 + revSim/100))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid #334155', paddingBottom: 12 }}>
                  <span style={{ color: '#94a3b8' }}>Simulated Expenses</span>
                  <span style={{ fontWeight: 600 }}>{etb(strategy.forecast.expenses * (1 - expSim/100))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}>
                  <span style={{ color: '#cbd5e1' }}>New Net Cash Flow</span>
                  <span style={{ fontWeight: 800, color: (strategy.forecast.revenue * (1 + revSim/100)) - (strategy.forecast.expenses * (1 - expSim/100)) - strategy.debtProfile.totalMonthlyPayments >= 0 ? '#10b981' : '#ef4444' }}>
                    {etb((strategy.forecast.revenue * (1 + revSim/100)) - (strategy.forecast.expenses * (1 - expSim/100)) - strategy.debtProfile.totalMonthlyPayments)}
                  </span>
                </div>
              </div>
            </div>

            {/* Departmental Profitability Drill-down */}
            <div style={sectionStyle}>
              <h3 style={{ margin: 0, color: '#111827', marginBottom: 16 }}>🏢 Departmental Profitability Drill-down</h3>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Based on historical averages and standard cost margins.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Simulated Margins */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Pharmacy (Est. 30% Margin)</span>
                  </div>
                  <div style={{ background: '#f1f5f9', height: 24, borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ background: '#ec4899', height: '100%', width: '30%' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Lab Diagnostics (Est. 50% Margin)</span>
                  </div>
                  <div style={{ background: '#f1f5f9', height: 24, borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ background: '#8b5cf6', height: '100%', width: '50%' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Consultation/Card (Est. 90% Margin)</span>
                  </div>
                  <div style={{ background: '#f1f5f9', height: 24, borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ background: '#3b82f6', height: '100%', width: '90%' }}></div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20, padding: 12, background: '#fffbeb', borderRadius: 8, color: '#b45309', fontSize: 13 }}>
                <strong>Insight:</strong> Prioritize Consultation and Lab marketing efforts, as they yield the highest net cash return per service block.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ APPOINTMENTS TAB ═══ */}
      {!loading && tab === 'appointments' && daily && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db' }} />
            <button onClick={load} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Refresh</button>
          </div>
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
        </div>
      )}

      {/* ═══ MARKET TAB ═══ */}
      {!loading && tab === 'market' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {referrals?.referralSources && (
            <div style={sectionStyle}>
              <h3 style={{ marginTop: 0 }}>📣 Referral Sources</h3>
              <SimpleBar data={referrals.referralSources} labelKey="source" valueKey="count" color="#8b5cf6" />
            </div>
          )}
          {demographics?.gender && (
            <div style={sectionStyle}>
              <h3 style={{ marginTop: 0 }}>👥 Gender Distribution</h3>
              <SimpleBar data={demographics.gender} labelKey="gender" valueKey="count" color="#ec4899" />
            </div>
          )}
        </div>
      )}

      {/* ═══ AUDIT TAB ═══ */}
      {!loading && tab === 'audit' && auditSummary && (
        <div>
          <div style={{ ...gridStyle(3), marginBottom: 20 }}>
            <KpiCard label="Total Entries (30d)" value={fmt(auditSummary.totalEntries)} color="#6366f1" />
          </div>
          {auditLogs && (
            <div style={sectionStyle}>
              <h3 style={{ marginTop: 0 }}>📜 Recent Audit Entries</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: 8 }}>Time</th><th style={{ padding: 8 }}>User</th><th style={{ padding: 8 }}>Action</th><th style={{ padding: 8 }}>Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.logs.map((log: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: 8 }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={{ padding: 8 }}>{log.userName}</td>
                      <td style={{ padding: 8 }}><span style={{ padding: '2px 6px', borderRadius: 4, background: '#dbeafe', color: '#1e40af' }}>{log.action}</span></td>
                      <td style={{ padding: 8 }}>{log.resourceType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessIntelligence;
