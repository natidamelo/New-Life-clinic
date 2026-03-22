import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { format, isAfter, addMonths, startOfMonth } from 'date-fns';
import billingService from '../../services/billingService';
import { gregorianToEthiopian } from '../../utils/ethiopianCalendar';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Download, Calendar, FileText, BarChart3, AlertCircle,
  RefreshCw, ChevronLeft, CheckCircle2, FileSpreadsheet, FilePdf
} from 'lucide-react';

type ReportFormat = 'pdf' | 'csv';

const PRESETS = [
  { key: 'thisMonth',   label: 'This Month' },
  { key: 'lastMonth',   label: 'Last Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'last6Months', label: 'Last 6 Months' },
  { key: 'thisYear',    label: 'This Year' },
];

const BillingReports: React.FC = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [reportFormat, setReportFormat] = useState<ReportFormat>('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>('thisMonth');
  const [success, setSuccess] = useState(false);
  const [showEthiopianCalendar, setShowEthiopianCalendar] = useState(true);

  const validateDates = (): boolean => {
    if (!startDate || !endDate) { setError('Please select both start and end dates'); return false; }
    if (isAfter(startDate, endDate)) { setError('Start date must be before end date'); return false; }
    if (isAfter(endDate, new Date())) { setError('End date cannot be in the future'); return false; }
    return true;
  };

  const setPresetDateRange = (range: string) => {
    const today = new Date();
    let newStart: Date;
    let newEnd: Date = today;
    setError(null);
    setSuccess(false);

    switch (range) {
      case 'thisMonth':   newStart = startOfMonth(today); break;
      case 'lastMonth':   { const lm = addMonths(today, -1); newStart = startOfMonth(lm); newEnd = new Date(today.getFullYear(), today.getMonth(), 0); break; }
      case 'last3Months': newStart = startOfMonth(addMonths(today, -3)); break;
      case 'last6Months': newStart = startOfMonth(addMonths(today, -6)); break;
      case 'thisYear':    newStart = new Date(today.getFullYear(), 0, 1); break;
      default: return;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
    setSelectedPreset(range);
    toast.success(`Range: ${format(newStart, 'MMM dd')} – ${format(newEnd, 'MMM dd, yyyy')}`);
  };

  const handleGenerateReport = async () => {
    if (!validateDates()) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const s = format(startDate!, 'yyyy-MM-dd');
      const e = format(endDate!, 'yyyy-MM-dd');
      const blob = await billingService.getBillingReport(s, e, reportFormat);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Billing_Report_${s}_to_${e}.${reportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess(true);
      toast.success(`Report downloaded as ${reportFormat.toUpperCase()}`);
    } catch {
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const dateRangeLabel = startDate && endDate
    ? `${format(startDate, 'MMM dd, yyyy')} – ${format(endDate, 'MMM dd, yyyy')}`
    : 'No range selected';

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/app/billing')} className="h-8 gap-1.5 text-xs">
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-violet-600" /> Basic Billing Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and download billing reports for any date range</p>
        </div>
      </div>

      {/* ── Config Card ─────────────────────────────────────────────────── */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" /> Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">

          {/* Date + Format row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Start Date</Label>
              <Input type="date" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                onChange={e => { setStartDate(e.target.value ? new Date(e.target.value) : null); setSelectedPreset(null); setSuccess(false); }}
                className="h-9 text-sm border-gray-200 focus:border-blue-400" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">End Date</Label>
              <Input type="date" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                onChange={e => { setEndDate(e.target.value ? new Date(e.target.value) : null); setSelectedPreset(null); setSuccess(false); }}
                className="h-9 text-sm border-gray-200 focus:border-blue-400" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Export Format</Label>
              <Select value={reportFormat} onValueChange={v => setReportFormat(v as ReportFormat)}>
                <SelectTrigger className="h-9 text-sm border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2"><FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> CSV Spreadsheet</div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-red-600" /> PDF Document</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preset chips */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Date Ranges</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(({ key, label }) => (
                <button key={key} onClick={() => setPresetDateRange(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                    selectedPreset === key
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {startDate && endDate && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {dateRangeLabel}
                </p>
                {showEthiopianCalendar && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="font-medium text-gray-600">በዓለም አቆጣጠር:</span>
                    {gregorianToEthiopian(startDate).formatted} – {gregorianToEthiopian(endDate).formatted}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowEthiopianCalendar(!showEthiopianCalendar)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showEthiopianCalendar ? 'Hide' : 'Show'} Ethiopian Calendar
                </button>
              </div>
            )}
          </div>

          {/* Error / Success */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 ml-2">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700 ml-2">Report downloaded successfully!</AlertDescription>
            </Alert>
          )}

          {/* Generate Button */}
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleGenerateReport} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6">
              {loading
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
                : <><Download className="h-4 w-4 mr-2" /> Generate & Download</>}
            </Button>
            {selectedPreset && (
              <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-gray-600"
                onClick={() => { setSelectedPreset(null); setSuccess(false); }}>
                Clear selection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Info Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 text-sm">CSV Format</p>
              <p className="text-xs text-emerald-600 mt-0.5">Best for data analysis in Excel or Google Sheets. Includes all invoice details in tabular format.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-red-100 bg-red-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2.5 bg-red-100 rounded-xl">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-800 text-sm">PDF Format</p>
              <p className="text-xs text-red-600 mt-0.5">Best for printing and sharing. Formatted report with clinic branding and summary tables.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillingReports;
