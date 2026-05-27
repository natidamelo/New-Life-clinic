import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { VitalsTrendPoint } from '../../services/healthPackageService';
import { Activity, Heart, Eye } from 'lucide-react';

interface VitalsTrendChartsProps {
  data: VitalsTrendPoint[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border/80 p-3.5 rounded-xl shadow-lg text-xs space-y-1.5 font-medium">
        <p className="font-bold text-foreground border-b border-border/40 pb-1 mb-1">{label}</p>
        {payload.map((pld: any) => (
          <div key={pld.dataKey} className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-1.5" style={{ color: pld.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }} />
              {pld.name}:
            </span>
            <span className="font-extrabold text-foreground">
              {pld.value} {pld.unit || ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const VitalsTrendCharts: React.FC<VitalsTrendChartsProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="animate-pulse h-[280px] bg-muted border-0" />
        <Card className="animate-pulse h-[280px] bg-muted border-0" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl bg-muted/10">
        <Activity className="w-10 h-10 text-muted-foreground/35 mx-auto mb-3" />
        <h4 className="text-sm font-semibold">No vitals trend data recorded</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          Vital signs recorded during package check-in visits will populate these analytical trend lines.
        </p>
      </div>
    );
  }

  // Check if we have specific vital data recorded
  const hasBP = data.some(d => d.systolic !== null || d.diastolic !== null);
  const hasSugar = data.some(d => d.sugar_fasting !== null || d.sugar_random !== null);
  const hasWeight = data.some(d => d.weight !== null || d.bmi !== null);

  return (
    <div className="space-y-6">
      
      {/* 1. Blood Pressure Chart */}
      {hasBP && (
        <Card className="border-primary/5 shadow-sm rounded-2xl overflow-hidden bg-card/60 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              Blood Pressure Trend (mmHg)
            </CardTitle>
            <CardDescription className="text-[11px]">
              Systolic and Diastolic pressure logs over consecutive package visits.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                <XAxis 
                  dataKey="visit_number" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  stroke="hsl(var(--border) / 0.8)"
                />
                <YAxis 
                  domain={[40, 200]} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border) / 0.8)"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                <Line 
                  name="Systolic BP" 
                  type="monotone" 
                  dataKey="systolic" 
                  stroke="#4f46e5" // Indigo 600
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 1.5, fill: '#4f46e5' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                  unit=" mmHg"
                />
                <Line 
                  name="Diastolic BP" 
                  type="monotone" 
                  dataKey="diastolic" 
                  stroke="#f43f5e" // Rose 500
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 1.5, fill: '#f43f5e' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                  unit=" mmHg"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 2. Blood Sugar Chart */}
        {hasSugar && (
          <Card className="border-primary/5 shadow-sm rounded-2xl overflow-hidden bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500" />
                Blood Sugar Level Trend (mg/dL)
              </CardTitle>
              <CardDescription className="text-[11px]">
                Fasting and Random blood sugar logs over package visits.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[200px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                  <XAxis 
                    dataKey="visit_number" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    stroke="hsl(var(--border) / 0.8)"
                  />
                  <YAxis 
                    domain={[60, 300]} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border) / 0.8)"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Line 
                    name="Fasting Sugar" 
                    type="monotone" 
                    dataKey="sugar_fasting" 
                    stroke="#10b981" // Emerald 500
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                    unit=" mg/dL"
                  />
                  <Line 
                    name="Random Sugar" 
                    type="monotone" 
                    dataKey="sugar_random" 
                    stroke="#f59e0b" // Amber 500
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#f59e0b' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                    unit=" mg/dL"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 3. Weight & BMI Chart */}
        {hasWeight && (
          <Card className="border-primary/5 shadow-sm rounded-2xl overflow-hidden bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-violet-500" />
                Weight & BMI Index Trend
              </CardTitle>
              <CardDescription className="text-[11px]">
                Patient weight changes and corresponding calculated Body Mass Index (BMI).
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[200px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                  <XAxis 
                    dataKey="visit_number" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                    stroke="hsl(var(--border) / 0.8)"
                  />
                  <YAxis 
                    yAxisId="weight"
                    domain={['dataMin - 5', 'dataMax + 5']}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border) / 0.8)"
                  />
                  <YAxis 
                    yAxisId="bmi"
                    orientation="right"
                    domain={[10, 45]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border) / 0.8)"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  <Line 
                    yAxisId="weight"
                    name="Weight" 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#8b5cf6" // Violet 500
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#8b5cf6' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                    unit=" kg"
                  />
                  <Line 
                    yAxisId="bmi"
                    name="BMI Index" 
                    type="monotone" 
                    dataKey="bmi" 
                    stroke="#06b6d4" // Cyan 500
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#06b6d4' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                    unit=" (Index)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
};

export default VitalsTrendCharts;
