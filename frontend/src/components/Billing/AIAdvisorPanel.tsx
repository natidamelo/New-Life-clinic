import React, { useState } from 'react';
import { Brain, Landmark, Target } from 'lucide-react';
import AnalysisTab from './tabs/AnalysisTab';
import LoansTab from './tabs/LoansTab';
import ProfitTargetsTab from './tabs/ProfitTargetsTab';
import { useLoans } from './hooks/useLoans';

interface AIAdvisorPanelProps {
  currentMonthRevenue?: number;
}

type AdvisorTab = 'analysis' | 'loans' | 'targets';

const TABS: { key: AdvisorTab; label: string; icon: React.ReactNode }[] = [
  { key: 'analysis', label: 'AI Analysis',     icon: <Brain className="h-4 w-4" /> },
  { key: 'loans',    label: 'Loans',           icon: <Landmark className="h-4 w-4" /> },
  { key: 'targets',  label: 'Profit Targets',  icon: <Target className="h-4 w-4" /> },
];

const AIAdvisorPanel: React.FC<AIAdvisorPanelProps> = ({ currentMonthRevenue = 0 }) => {
  const [activeTab, setActiveTab] = useState<AdvisorTab>('analysis');
  const { loans } = useLoans();

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200/80">
      {/* ── Panel Header ─────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#2d1b69] px-6 py-5 overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-4 right-32 h-16 w-16 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <Brain className="h-6 w-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-white font-black text-lg leading-tight">AI Financial Advisor</h2>
              <p className="text-blue-200/80 text-xs mt-0.5">
                Powered by Claude · ETB amounts · New Life Clinic, Addis Ababa
              </p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 backdrop-blur-sm">
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`ai-advisor-tab-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-[#1e3a5f] shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      <div className="bg-slate-50/60 p-5">
        {activeTab === 'analysis' && <AnalysisTab loans={loans} />}
        {activeTab === 'loans'    && <LoansTab currentMonthRevenue={currentMonthRevenue} />}
        {activeTab === 'targets'  && <ProfitTargetsTab />}
      </div>
    </div>
  );
};

export default AIAdvisorPanel;
