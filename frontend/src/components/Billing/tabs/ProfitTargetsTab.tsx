import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Target, AlertTriangle, Sparkles, CheckCircle } from 'lucide-react';
import { useFinancialSnapshot } from '../hooks/useFinancialSnapshot';
import { useLoans } from '../hooks/useLoans';
import { useAIInsight } from '../hooks/useAIInsight';

const format = (n: number) => Math.round(n).toLocaleString();
const formatK = (n: number) =>
  Math.abs(n) >= 1000
    ? Math.round(n / 1000).toLocaleString() + 'K'
    : Math.round(n).toLocaleString();

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1000, suffix = '', onChange }) => {
  const formattedValue = suffix === '%' ? `${value}%` : `ETB ${format(value)}`;
  const formattedMin = suffix === '%' ? `${min}%` : `ETB ${format(min)}`;
  const formattedMax = suffix === '%' ? `${max}%` : `ETB ${format(max)}`;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="text-sm text-gray-500">{label}</label>
        <span className="text-sm font-medium text-gray-900">{formattedValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-teal-600 cursor-pointer"
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">{formattedMin}</span>
        <span className="text-xs text-gray-400">{formattedMax}</span>
      </div>
    </div>
  );
};

const SkeletonLine: React.FC<{ w?: string }> = ({ w = 'w-full' }) => (
  <div className={`h-4 bg-slate-200 rounded animate-pulse ${w}`} />
);

const ProfitTargetsTab: React.FC = () => {
  const { snapshot } = useFinancialSnapshot('month');
  const { loans, fetchLoans } = useLoans();
  const { insight, loading: aiLoading, fetchInsight } = useAIInsight();

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const totalLoanRepay = loans.reduce((s, l) => s + l.monthlyPayment, 0);

  const [fixedCosts, setFixedCosts]     = useState(80_000);
  const [revPerPt, setRevPerPt]         = useState(0);
  const [varCostPct, setVarCostPct]     = useState(30);
  const [targetMargin, setTargetMargin] = useState(25);
  const [loanRepay, setLoanRepay]       = useState(0);

  // Sync defaults from snapshot and loans once loaded
  useEffect(() => {
    if (snapshot.avgRevenuePerPatient > 0) setRevPerPt(snapshot.avgRevenuePerPatient);
  }, [snapshot.avgRevenuePerPatient]);

  useEffect(() => {
    if (snapshot.operatingExpenses > 0) {
      setFixedCosts(snapshot.operatingExpenses);
    } else {
      setFixedCosts(80_000);
    }
  }, [snapshot.operatingExpenses]);

  useEffect(() => {
    if (totalLoanRepay > 0) setLoanRepay(Math.round(totalLoanRepay));
  }, [totalLoanRepay]);

  // Computed values
  const currentPatients = snapshot.patientCount;
  const currentRevenue = snapshot.totalRevenue;
  const loanRepayments = loanRepay;
  const revenuePerPatient = revPerPt;

  const contributionPerPatient = revenuePerPatient * (1 - varCostPct / 100);
  const totalFixed = fixedCosts + loanRepayments;
  const breakEvenPatients = contributionPerPatient > 0 ? Math.ceil(totalFixed / contributionPerPatient) : 0;

  const denominator = 1 - varCostPct / 100 - targetMargin / 100;
  const targetRevenue = denominator > 0 ? totalFixed / denominator : 0;
  const targetPatients = revenuePerPatient > 0 ? Math.ceil(targetRevenue / revenuePerPatient) : 0;
  const currentMonthlyProfit = (currentPatients * contributionPerPatient) - totalFixed;
  const gapToBreakEven = Math.max(0, breakEvenPatients - currentPatients);
  const actualPct = breakEvenPatients > 0 ? Math.min(100, (currentPatients / breakEvenPatients) * 100) : 0;

  const loanSliderMax = Math.max(300000, Math.ceil(totalLoanRepay / 10000) * 10000);

  const { summary = '', bullets = [], direction = 'maintain' } = insight || {};

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
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fixedCosts, revPerPt, varCostPct, targetMargin, loanRepay, triggerAI]);

  return (
    <div className="space-y-5">
      {/* 1. Critical alert banner */}
      {currentMonthlyProfit < 0 ? (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <AlertTriangle className="text-red-700 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-red-800">
              Critical: clinic is currently operating at a loss
            </p>
            <p className="text-xs text-red-600 mt-1 leading-relaxed">
              Fixed costs + loan repayments (ETB {format(totalFixed)}/month) exceed current revenue
              (ETB {format(currentRevenue)}/month) by <strong>ETB {format(Math.abs(currentMonthlyProfit))}</strong>.
              You need at least <strong>{breakEvenPatients} patients</strong> this month to break even
              — currently at {currentPatients}.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
          <CheckCircle className="text-green-700 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-green-800">
              Clinic is currently profitable
            </p>
            <p className="text-xs text-green-600 mt-1 leading-relaxed">
              Estimated monthly profit is <strong>ETB {format(currentMonthlyProfit)}</strong> based on {currentPatients} patients.
            </p>
          </div>
        </div>
      )}

      {/* 2. Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT — sliders + breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-[#1e3a5f] text-sm flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-teal-600" /> Configure Assumptions
          </h3>
          <div className="space-y-4">
            <SliderRow label="Monthly Fixed Costs (ETB)" value={fixedCosts} min={10000} max={500000} step={5000} onChange={setFixedCosts} />
            <SliderRow label="Avg Revenue per Patient (ETB)" value={revenuePerPatient || 500} min={100} max={5000} step={50} onChange={setRevPerPt} />
            <SliderRow label="Variable Cost per Patient (%)" value={varCostPct} min={5} max={80} step={1} suffix="%" onChange={setVarCostPct} />
            <SliderRow label="Target Profit Margin (%)" value={targetMargin} min={5} max={60} step={1} suffix="%" onChange={setTargetMargin} />
            <SliderRow label="Monthly Loan Repayments (ETB)" value={loanRepayments} min={0} max={loanSliderMax} step={1000} onChange={setLoanRepay} />
          </div>

          <div className="border-t border-gray-100 pt-3 mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Contribution per patient</span>
              <span className="text-xs font-medium">ETB {format(contributionPerPatient)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Total fixed + loans</span>
              <span className="text-xs font-medium text-red-600">ETB {format(totalFixed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Current patients this month</span>
              <span className="text-xs font-medium">{currentPatients}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — result cards */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            {/* Break-even patients — amber */}
            <div className="rounded-xl p-4 bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700 mb-1.5">Break-even patients</p>
              <p className="text-2xl font-medium text-amber-900">{breakEvenPatients}</p>
              <p className="text-xs text-amber-600 mt-1">to cover all costs</p>
            </div>

            {/* Target patients — blue */}
            <div className="rounded-xl p-4 bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-700 mb-1.5">Target patients ({targetMargin}% margin)</p>
              <p className="text-2xl font-medium text-blue-900">{targetPatients}</p>
              <p className="text-xs text-blue-600 mt-1">for profit target</p>
            </div>

            {/* Target monthly revenue — blue */}
            <div className="rounded-xl p-4 bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-700 mb-1.5">Target monthly revenue</p>
              <p className="text-2xl font-medium text-blue-900">ETB {formatK(targetRevenue)}</p>
              <p className="text-xs text-blue-600 mt-1">needed for target margin</p>
            </div>

            {/* Estimated monthly profit — red if negative, green if positive */}
            <div className={`rounded-xl p-4 border ${
              currentMonthlyProfit < 0
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-xs mb-1.5 ${currentMonthlyProfit < 0 ? 'text-red-700' : 'text-green-700'}`}>
                Est. monthly profit
              </p>
              <p className={`text-2xl font-medium ${currentMonthlyProfit < 0 ? 'text-red-900' : 'text-green-900'}`}>
                {currentMonthlyProfit < 0 ? '-' : ''}ETB {formatK(Math.abs(currentMonthlyProfit))}
              </p>
              <p className={`text-xs mt-1 ${currentMonthlyProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                based on {currentPatients} patients
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Patient gap bar (full width, below the two columns) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mt-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">
          Patient gap to break-even
        </p>

        {/* Three-column header */}
        <div className="flex justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400">Current</p>
            <p className="text-xl font-medium text-teal-600">
              {currentPatients} <span className="text-sm font-normal text-gray-400">patients</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Gap to break-even</p>
            <p className="text-xl font-medium text-red-600">
              {Math.max(0, breakEvenPatients - currentPatients)} patients needed
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Break-even target</p>
            <p className="text-xl font-medium text-amber-700">
              {breakEvenPatients} patients
            </p>
          </div>
        </div>

        {/* Gap bar */}
        <div className="h-5 rounded-full bg-gray-100 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-300"
            style={{ width: `${actualPct.toFixed(1)}%` }}
          />
        </div>

        {/* Annotation */}
        <div className="flex justify-between mt-2">
          <span className="text-xs font-medium text-teal-600">
            {currentPatients} actual ({actualPct.toFixed(1)}%)
          </span>
          <span className="text-xs font-medium text-red-500">
            {Math.max(0, breakEvenPatients - currentPatients)} more needed ({ (100 - actualPct).toFixed(1) }%)
          </span>
        </div>
      </div>

      {/* AI Advisor Box */}
      {aiLoading && !insight ? (
        <div className="mt-4 border-l-4 border-purple-500 bg-gray-50 rounded-r-xl px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-medium text-purple-700">
              <Sparkles size={14} />
              AI profit advisor
            </div>
          </div>
          <div className="space-y-2">
            <SkeletonLine />
            <SkeletonLine w="w-5/6" />
            <SkeletonLine w="w-4/5" />
          </div>
        </div>
      ) : insight ? (
        <div className="mt-4 border-l-4 border-purple-500 bg-gray-50 rounded-r-xl px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-medium text-purple-700">
              <Sparkles size={14} />
              AI profit advisor
            </div>
            {/* Direction badge — driven by API response */}
            {direction === 'caution' && (
              <span className="flex items-center gap-1 text-xs font-medium bg-red-50 text-red-700 px-3 py-1 rounded-full">
                <AlertTriangle size={11} /> Caution
              </span>
            )}
            {direction === 'maintain' && (
              <span className="text-xs font-medium bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
                → Maintain
              </span>
            )}
            {direction === 'grow' && (
              <span className="text-xs font-medium bg-green-50 text-green-700 px-3 py-1 rounded-full">
                ↑ Grow
              </span>
            )}
          </div>

          <p
            className="text-sm text-gray-500 leading-relaxed mb-3"
            dangerouslySetInnerHTML={{ __html: summary }}
          />

          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  i === 0 ? 'bg-red-100 text-red-600' :
                  i === 1 ? 'bg-amber-100 text-amber-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {i === 0 ? '!' : i === 1 ? '~' : '+'}
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 border-l-4 border-purple-500 bg-gray-50 rounded-r-xl px-4 py-4">
          <p className="text-gray-400 text-sm">Adjust the sliders above to get AI-powered gap analysis…</p>
        </div>
      )}
    </div>
  );
};

export default ProfitTargetsTab;
