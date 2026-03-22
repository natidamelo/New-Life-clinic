import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import workloadService, { WorkloadSummaryItem, WorkloadTimeseriesItem } from '../../services/workloadService';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
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
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, TimeScale);

const msToHuman = (ms: number) => {
  if (!ms || ms < 0) return '0s';
  const sec = Math.floor(ms / 1000);
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${rem}s`;
};

const WorkloadAnalytics: React.FC = () => {
  const [rows, setRows] = useState<WorkloadSummaryItem[]>([]);
  const [role, setRole] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('day');
  const [series, setSeries] = useState<WorkloadTimeseriesItem[]>([]);
  const [topPaths, setTopPaths] = useState<{ path: string; visits: number }[]>([]);

  const filtered = useMemo(() => {
    return rows.filter(r =>
      (!search || r.path.toLowerCase().includes(search.toLowerCase()))
    );
  }, [rows, search]);

  const totalVisits = useMemo(() => filtered.reduce((s, r) => s + (r.visits || 0), 0), [filtered]);
  const totalClicks = useMemo(() => filtered.reduce((s, r) => s + (r.clicks || 0), 0), [filtered]);
  const totalDuration = useMemo(() => filtered.reduce((s, r) => s + (r.totalDurationMs || 0), 0), [filtered]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workloadService.getSummary({
        role: role || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setRows(data);

      // Fetch timeseries
      const ts = await workloadService.getTimeseries({
        role: role || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        interval,
      });
      setSeries(ts);

      // Fetch top paths
      const top = await workloadService.getTop({
        role: role || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        by: 'path',
        limit: 10,
      });
      // narrow to path structure if present
      setTopPaths((top as any[])
        .map((t) => ({ path: t.path ?? String(t.userId ?? ''), visits: t.visits ?? 0 }))
        .filter((t) => !!t.path));
    } catch (e: any) {
      setError(e?.message || 'Failed to load workload analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Workload Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by path"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <Select value={role || 'all'} onValueChange={(v) => setRole(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="reception">Reception</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="imaging">Imaging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <Select value={interval} onValueChange={(v) => setInterval(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={load} disabled={loading}>Apply</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Visits Over Time</CardTitle></CardHeader>
          <CardContent>
            <Line
              data={{
                labels: series.map((s) => format(new Date(s.bucket), 'yyyy-MM-dd')),
                datasets: [
                  {
                    label: 'Visits',
                    data: series.map((s) => s.visits || 0),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    tension: 0.3,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: true } },
                scales: { x: { ticks: { maxRotation: 0 } }, y: { beginAtZero: true } },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Paths by Visits</CardTitle></CardHeader>
          <CardContent>
            <Bar
              data={{
                labels: topPaths.map((t) => t.path),
                datasets: [
                  {
                    label: 'Visits',
                    data: topPaths.map((t) => t.visits || 0),
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: true } },
                scales: { x: { ticks: { maxRotation: 0, autoSkip: true } }, y: { beginAtZero: true } },
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Total Visits</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totalVisits}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Clicks</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totalClicks}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Time</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{msToHuman(totalDuration)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per Path</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-3">Path</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Visits</th>
                    <th className="py-2 pr-3">Clicks</th>
                    <th className="py-2 pr-3">Avg Time</th>
                    <th className="py-2 pr-3">Total Time</th>
                    <th className="py-2 pr-3">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={`${r.path}-${r.role || 'all'}`} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-medium">{r.path}</td>
                      <td className="py-2 pr-3">{r.role || '-'}</td>
                      <td className="py-2 pr-3">{r.visits}</td>
                      <td className="py-2 pr-3">{r.clicks}</td>
                      <td className="py-2 pr-3">{msToHuman(r.avgDurationMs)}</td>
                      <td className="py-2 pr-3">{msToHuman(r.totalDurationMs)}</td>
                      <td className="py-2 pr-3">{r.lastSeen ? format(new Date(r.lastSeen), 'yyyy-MM-dd HH:mm') : '-'}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-muted-foreground">No data</td>
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


