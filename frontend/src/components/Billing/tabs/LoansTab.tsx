import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Brain, AlertTriangle } from 'lucide-react';
import { useLoans, Loan, CreateLoanInput } from '../hooks/useLoans';
import { useAIInsight } from '../hooks/useAIInsight';
import { useFinancialSnapshot } from '../hooks/useFinancialSnapshot';

const fmtETB = (n: number) =>
  'ETB ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

// Client-side monthly payment preview (mirrors server formula)
const calcMonthly = (principal: number, annualRate: number, termMonths: number): number => {
  if (!principal || !termMonths) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
};

const LoanCard: React.FC<{
  loan: Loan;
  onPay: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ loan, onPay, onDelete }) => {
  const progress = loan.termMonths > 0 ? (loan.paidMonths / loan.termMonths) * 100 : 0;
  const remaining = loan.termMonths - loan.paidMonths;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">{loan.name}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {loan.annualRate}% annual · {loan.termMonths} months
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPay(loan._id)}
            disabled={loan.paidMonths >= loan.termMonths}
            title="Mark this month as paid"
            className="p-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(loan._id)}
            title="Remove loan"
            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <p className="text-slate-400">Principal</p>
          <p className="font-bold text-slate-700 mt-0.5">{fmtETB(loan.principal)}</p>
        </div>
        <div className="bg-teal-50 rounded-lg p-2 text-center">
          <p className="text-slate-400">Monthly</p>
          <p className="font-bold text-teal-700 mt-0.5">{fmtETB(loan.monthlyPayment)}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-2 text-center">
          <p className="text-slate-400">Interest</p>
          <p className="font-bold text-orange-700 mt-0.5">{fmtETB(loan.totalInterest)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{loan.paidMonths} months paid</span>
          <span>{remaining} remaining</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const SkeletonLine: React.FC<{ w?: string }> = ({ w = 'w-full' }) => (
  <div className={`h-4 bg-slate-200 rounded animate-pulse ${w}`} />
);

const LoansTab: React.FC<{ currentMonthRevenue?: number }> = ({ currentMonthRevenue = 0 }) => {
  const { loans, loading, error, fetchLoans, createLoan, payMonth, deleteLoan } = useLoans();
  const { snapshot } = useFinancialSnapshot('month');
  const { insight, loading: aiLoading, fetchInsight } = useAIInsight();

  const [form, setForm] = useState<CreateLoanInput>({
    name: '', principal: 0, annualRate: 0, termMonths: 12,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  // Fetch AI loan advice whenever loans list changes
  useEffect(() => {
    if (loans.length > 0 && snapshot.periodKey) {
      fetchInsight('month', snapshot, loans);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans.length]);

  const preview = calcMonthly(form.principal, form.annualRate, form.termMonths);

  const totalMonthly = loans.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const revenue = currentMonthRevenue || snapshot.totalRevenue || 1;
  const debtRatio = Math.round((totalMonthly / revenue) * 100);
  const ratioColor = debtRatio < 15 ? 'text-emerald-600' : debtRatio <= 25 ? 'text-amber-600' : 'text-red-600';
  const ratioBg    = debtRatio < 15 ? 'bg-emerald-50 border-emerald-200' : debtRatio <= 25 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || form.principal <= 0 || form.termMonths <= 0) {
      setFormError('Please fill in all required fields with valid values.');
      return;
    }
    setSubmitting(true);
    try {
      await createLoan(form);
      setForm({ name: '', principal: 0, annualRate: 0, termMonths: 12 });
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Add Loan Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-[#1e3a5f] text-sm mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add New Loan
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Lender / Purpose *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Commercial Bank of Ethiopia"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Principal (ETB) *</label>
              <input
                type="number"
                min={0}
                value={form.principal || ''}
                onChange={e => setForm(f => ({ ...f, principal: Number(e.target.value) }))}
                placeholder="500000"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Annual Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.annualRate || ''}
                onChange={e => setForm(f => ({ ...f, annualRate: Number(e.target.value) }))}
                placeholder="12"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Term (months) *</label>
              <input
                type="number"
                min={1}
                value={form.termMonths || ''}
                onChange={e => setForm(f => ({ ...f, termMonths: Number(e.target.value) }))}
                placeholder="36"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              />
            </div>
          </div>

          {/* Live payment preview */}
          {preview > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5 text-sm flex items-center justify-between">
              <span className="text-teal-700 font-medium">Estimated monthly payment:</span>
              <span className="text-teal-800 font-black">{fmtETB(Math.round(preview))}</span>
            </div>
          )}

          {formError && (
            <p className="text-red-600 text-xs flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-9 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add Loan'}
          </button>
        </form>
      </div>

      {/* Loan list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm text-center py-4">{error}</p>
      ) : loans.length === 0 ? (
        <div className="py-10 text-center text-slate-400">
          <p className="font-medium">No active loans</p>
          <p className="text-sm mt-1">Add your first loan above to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map(loan => (
            <LoanCard
              key={loan._id}
              loan={loan}
              onPay={payMonth}
              onDelete={deleteLoan}
            />
          ))}
        </div>
      )}

      {/* Summary footer */}
      {loans.length > 0 && (
        <div className={`rounded-xl border p-4 ${ratioBg}`}>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-slate-600 font-medium">Total Monthly Obligations</p>
              <p className="text-[#1e3a5f] font-black text-lg">{fmtETB(totalMonthly)}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-600 font-medium">Debt-to-Revenue Ratio</p>
              <p className={`font-black text-xl ${ratioColor}`}>{debtRatio}%</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {debtRatio < 15 ? '✓ Healthy' : debtRatio <= 25 ? '⚠ Moderate' : '⚠ High — review'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Loan Advice */}
      {loans.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#1e3a5f]/90">
            <Brain className="h-4 w-4 text-purple-300" />
            <span className="text-white font-bold text-sm">AI Loan Advice</span>
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
              <p className="text-slate-400 text-sm">Generating loan advice…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoansTab;
