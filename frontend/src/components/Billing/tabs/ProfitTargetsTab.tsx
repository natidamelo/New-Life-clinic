import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, Target, TrendingUp } from 'lucide-react';
import { useFinancialSnapshot } from '../hooks/useFinancialSnapshot';
import { useLoans } from '../hooks/useLoans';
import { useAIInsight } from '../hooks/useAIInsight';

const fmtETB = (n: number) =>
  'ETB ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1000, suffix = '', onChange }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className="font-bold text-[#1e3a5f]">
        {suffix === '%' ? `${value}%` : fmtETB(value)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-teal-600"
    />
    <div className="flex justify-between text-xs text-slate-400">
      <span>{suffix === '%' ? `${min}%` : fmtETB(min)}</span>
      <span>{suffix === '%' ? `${max}%` : fmtETB(max)}</span>
    </div>
  </div>
);

const ResultCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
  accent: string;
  bg: string;
}> = ({ label, value, sub, positive, accent, bg }) => (
  <div className={`${bg} rounded-xl p-4 border border-transparent`}>
    <p className="text-xs text-slate-500 font-medium">{label}</p>
    <p className={`text-xl font-black mt-1 ${accent} ${positive === false ? 'text-red-600' : positive === true ? 'text-emerald-600' : ''}`}>
      {value}
    </p>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const SkeletonLine: React.FC<{ w?: string }> = ({ w = 'w-full' }) => (
  <div className={`h-4 bg-slate-200 rounded animate-pulse ${w}`} />
);

const ProfitTargetsTab: React.FC = () => {
  const { snapshot } = useFinancialSnapshot('month');
  const { loans, fetchLoans } = useLoans();
  const { insight, loading: aiLoading, fetchInsight } = useAIInsight();

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const totalLoanRepay = loans.reduce((s, l) => s + l.monthlyPayment, 0);

  const [fixedCosts, setFixedCosts]   = useState(80_000);
  const [revPerPt,   setRevPerPt]     = useState(0);
  const [varCostPct, setVarCostPct]   = useState(30);
  const [targetMargin, setTargetMargin] = useState(25);
  const [loanRepay,  setLoanRepay]    = useState(0);

  // Sync defaults from snapshot and loans once loaded
  useEffect(() => {
    if (snapshot.avgRevenuePerPatient > 0) setRevPerPt(snapshot.avgRevenuePerPatient);
  }, [snapshot.avgRevenuePerPatient]);

  useEffect(() => {
    if (totalLoanRepay > 0) setLoanRepay(Math.round(totalLoanRepay));
  }, [totalLoanRepay]);

  // Computed outputs
  const contribution      = revPerPt * (1 - varCostPct / 100);
  const totalFixed        = fixedCosts + loanRepay;
  const breakEvenPatients = contribution > 0 ? Math.ceil(totalFixed / contribution) : 0;

  const denominator       = 1 - varCostPct / 100 - targetMargin / 100;
  const targetRevenue     = denominator > 0 ? totalFixed / denominator : 0;
  const targetPatients    = revPerPt > 0 && denominator > 0 ? Math.ceil(targetRevenue / revPerPt) : 0;
  const currentMonthlyProfit = (snapshot.patientCount * contribution) - totalFixed;

  // Debounce AI advice on slider changes (800ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerAI = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (snapshot.periodKey) {
        fetchInsight('month', snapshot, loans, {
          fixedCosts,
          varCostPct,
          targetMarginPct: targetMargin,
        });
      }
    }, 800);
  }, [snapshot, loans, fixedCosts, varCostPct, targetMargin, fetchInsight]);

  useEffect(() => {
    triggerAI();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fixedCosts, revPerPt, varCostPct, targetMargin, loanRepay, triggerAI]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sliders panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
          <h3 className="font-bold text-[#1e3a5f] text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-teal-600" /> Configure Assumptions
          </h3>
          <SliderRow label="Monthly Fixed Costs (ETB)" value={fixedCosts} min={10_000} max={500_000} step={5_000} onChange={setFixedCosts} />
          <SliderRow label="Avg Revenue per Patient (ETB)" value={revPerPt || 500} min={100} max={5_000} step={50} onChange={setRevPerPt} />
          <SliderRow label="Variable Cost per Patient (%)" value={varCostPct} min={5} max={80} step={1} suffix="%" onChange={setVarCostPct} />
          <SliderRow label="Target Profit Margin (%)" value={targetMargin} min={5} max={60} step={1} suffix="%" onChange={setTargetMargin} />
          <SliderRow label="Monthly Loan Repayments (ETB)" value={loanRepay} min={0} max={200_000} step={1_000} onChange={setLoanRepay} />
        </div>

        {/* Results panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-[#1e3a5f] text-sm flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-teal-600" /> Computed Targets
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                label="Break-even Patients"
                value={breakEvenPatients > 0 ? `${breakEvenPatients.toLocaleString()} pts` : '—'}
                sub="Minimum to cover all costs"
                accent="text-[#1e3a5f]"
                bg="bg-blue-50"
              />
              <ResultCard
                label="Target Patients for Margin"
                value={targetPatients > 0 ? `${targetPatients.toLocaleString()} pts` : '—'}
                sub={`For ${targetMargin}% profit margin`}
                accent="text-purple-700"
                bg="bg-purple-50"
              />
              <ResultCard
                label="Target Monthly Revenue"
                value={targetRevenue > 0 ? fmtETB(Math.round(targetRevenue)) : '—'}
                sub="Revenue needed for target margin"
                accent="text-teal-700"
                bg="bg-teal-50"
              />
              <ResultCard
                label="Est. Monthly Profit"
                value={fmtETB(Math.round(currentMonthlyProfit))}
                sub={`Based on ${snapshot.patientCount} patients this month`}
                positive={currentMonthlyProfit >= 0}
                accent=""
                bg={currentMonthlyProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
              />
            </div>

            {/* Contribution margin */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
              <div className="flex justify-between"><span>Contribution per patient:</span><span className="font-bold text-slate-800">{fmtETB(Math.round(contribution))}</span></div>
              <div className="flex justify-between mt-1"><span>Total fixed + loans:</span><span className="font-bold text-slate-800">{fmtETB(totalFixed)}</span></div>
              <div className="flex justify-between mt-1"><span>Current patients (this month):</span><span className="font-bold text-slate-800">{snapshot.patientCount}</span></div>
            </div>
          </div>

          {/* Gap visual */}
          {targetPatients > 0 && snapshot.patientCount > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Patient Gap to Target</p>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((snapshot.patientCount / targetPatients) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{snapshot.patientCount} actual</span>
                    <span>{targetPatients} target</span>
                  </div>
                </div>
                <span className={`text-sm font-black ${snapshot.patientCount >= targetPatients ? 'text-emerald-600' : 'text-red-600'}`}>
                  {snapshot.patientCount >= targetPatients
                    ? '✓ On Target'
                    : `${targetPatients - snapshot.patientCount} gap`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Advisor box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#1e3a5f]/90">
          <Brain className="h-4 w-4 text-purple-300" />
          <span className="text-white font-bold text-sm">AI Profit Advisor</span>
          <span className="text-white/50 text-xs">• Updates as you adjust sliders</span>
        </div>
        <div className="p-5 border-l-4 border-purple-500">
          {aiLoading && !insight ? (
            <div className="space-y-2">
              <SkeletonLine /><SkeletonLine w="w-5/6" /><SkeletonLine w="w-4/5" />
            </div>
          ) : insight ? (
            <>
              <p
                className="text-slate-700 text-sm leading-relaxed mb-3"
                dangerouslySetInnerHTML={{ __html: insight.summary }}
              />
              <ul className="space-y-1.5">
                {insight.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-slate-400 text-sm">Adjust the sliders above to get AI-powered gap analysis…</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitTargetsTab;
