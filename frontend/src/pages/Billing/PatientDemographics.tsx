import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import {
  Users, TrendingUp, UserPlus, Cake, Phone, Mail,
  ChevronDown, ChevronLeft, AlertCircle, RefreshCw,
  Activity, BarChart3, PieChart as PieChartIcon, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../services/apiService';
import { Link } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DemographicData {
  totalPatients: number;
  newPatientsThisMonth: number;
  averageAge: number;
  ageGroups: Array<{ name: string; value: number; color: string }>;
  genderDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyGrowth: Array<{ month: string; newPatients: number }>;
}

interface Patient {
  _id: string; firstName: string; lastName: string;
  email?: string; phone?: string; dateOfBirth?: string;
  gender?: string; registrationDate: string;
}

const AGE_COLORS  = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#94a3b8', '#f59e0b'];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-blue-600 font-bold">{payload[0].value} patients</p>
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-sm">
      <p className="font-semibold text-gray-700">{payload[0].name}</p>
      <p className="font-bold" style={{ color: payload[0].payload.color }}>{payload[0].value} patients</p>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; bg: string; sub?: string }> = ({
  title, value, icon, bg, sub
}) => (
  <Card className={`${bg} border-0 shadow-md overflow-hidden`}>
    <CardContent className="p-5 relative">
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-6 translate-x-6" />
      <div className="flex items-center gap-4 relative">
        <div className="p-3 bg-white/20 rounded-xl">{icon}</div>
        <div>
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">{title}</p>
          <p className="text-white text-2xl font-black leading-tight">{value}</p>
          {sub && <p className="text-white/70 text-xs mt-0.5">{sub}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PatientDemographics: React.FC = () => {
  const [data, setData] = useState<DemographicData | null>(null);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year'>('1year');
  const [tableOpen, setTableOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/api/patients/demographics?timeRange=${timeRange}`);
      const payload = res.data?.data || res.data;
      if (!payload) throw new Error('Invalid response');

      setData({
        totalPatients: payload.totalPatients ?? 0,
        newPatientsThisMonth: payload.newPatientsThisMonth ?? 0,
        averageAge: payload.averageAge ?? 0,
        ageGroups: payload.ageGroups ?? [],
        genderDistribution: payload.genderDistribution ?? [],
        monthlyGrowth: payload.monthlyGrowth ?? [],
      });
      setRecentPatients(payload.recentPatients ?? []);
    } catch {
      setError('Failed to load patient demographics');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [timeRange]);

  const growthRate = useMemo(() => {
    if (!data?.monthlyGrowth?.length) return 0;
    const arr = data.monthlyGrowth;
    const last = arr[arr.length - 1]?.newPatients || 0;
    const prev = arr[arr.length - 2]?.newPatients || 0;
    return prev === 0 ? 0 : Math.round(((last - prev) / prev) * 100);
  }, [data]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 max-w-7xl mx-auto">
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700 ml-2 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
        </AlertDescription>
      </Alert>
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
            <Link to="/app/billing"><ChevronLeft className="h-3.5 w-3.5" /> Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-amber-600" /> Patient Demographics
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Population analytics and registration trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            {(['3months', '6months', '1year'] as const).map((r, i) => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${i > 0 ? 'border-l border-gray-200' : ''} ${timeRange === r ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {r === '3months' ? '3M' : r === '6months' ? '6M' : '1Y'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Patients"   value={data.totalPatients}          icon={<Users className="h-5 w-5 text-white" />}     bg="bg-gradient-to-br from-blue-600 to-indigo-700"   sub="Registered patients" />
        <StatCard title="New This Month"   value={data.newPatientsThisMonth}   icon={<UserPlus className="h-5 w-5 text-white" />}   bg="bg-gradient-to-br from-emerald-500 to-teal-600"  sub="Last 30 days" />
        <StatCard title="Average Age"      value={`${data.averageAge} yrs`}    icon={<Cake className="h-5 w-5 text-white" />}       bg="bg-gradient-to-br from-amber-500 to-orange-600"  sub="Across all patients" />
        <StatCard title="Growth Rate"      value={`${growthRate > 0 ? '+' : ''}${growthRate}%`} icon={<TrendingUp className="h-5 w-5 text-white" />} bg="bg-gradient-to-br from-violet-600 to-purple-700" sub="Month over month" />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Trend Bar Chart */}
        <Card className="lg:col-span-2 shadow-sm border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" /> Monthly Registration Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyGrowth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<BarTooltip />} />
                  <Bar dataKey="newPatients" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gender Pie */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-pink-600" /> Gender Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.genderDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {data.genderDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Age Distribution ────────────────────────────────────────────── */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-600" /> Age Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {data.ageGroups.map(({ name, value, color }) => {
              const pct = data.totalPatients > 0 ? Math.round((value / data.totalPatients) * 100) : 0;
              return (
                <div key={name} className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
                  <div className="text-xs font-semibold text-gray-600 mb-2">{name} yrs</div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{pct}%</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Patients (collapsible) ────────────────────────────────── */}
      <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
        <Card className="shadow-sm border border-gray-200">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors rounded-t-xl pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" /> Recent Patient Registrations
                  <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{recentPatients.length}</span>
                </CardTitle>
                {tableOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Patient', 'Contact', 'Age', 'Gender', 'Registered'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentPatients.map(p => {
                      const age = p.dateOfBirth
                        ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 86400000))
                        : null;
                      return (
                        <tr key={p._id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                                  {p.firstName?.charAt(0)}{p.lastName?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-gray-900">{p.firstName} {p.lastName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-gray-500">
                            <div className="space-y-0.5">
                              {p.phone && <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{p.phone}</div>}
                              {p.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{p.email}</div>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-gray-700 font-medium">{age ?? 'N/A'}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              p.gender === 'Male'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              p.gender === 'Female' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>{p.gender || 'Unknown'}</span>
                          </td>
                          <td className="px-3 py-3 text-gray-500 text-xs">
                            {p.registrationDate ? new Date(p.registrationDate).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default PatientDemographics;
