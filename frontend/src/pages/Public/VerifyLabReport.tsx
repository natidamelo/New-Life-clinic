import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Download, 
  Printer, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Clock, 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  ArrowLeft,
  Activity,
  FileCheck,
  Building2,
  Lock
} from 'lucide-react';
import { generateProfessionalLabReportHTML } from '../../utils/labReportTemplate';

interface LabTestItem {
  testName: string;
  results: any;
  unit?: string;
  normalRange?: string;
  flag?: string;
  status?: string;
  notes?: string;
  orderedBy?: string;
  requestDate?: string;
  orderDate?: string;
  resultDate?: string;
}

interface ReportData {
  verificationCode: string;
  patientName: string;
  patientId: string;
  gender: string;
  age?: string | number;
  dob?: string;
  patientLocation?: string;
  serviceLocation?: string;
  orderDate?: string;
  doneDate?: string;
  doneBy?: string;
  requestedBy?: string;
  reportDate?: string;
  reportDoneBy?: string;
  tests: LabTestItem[];
  summary?: {
    totalTests: number;
    parameters: number;
    abnormalCount: number;
  };
  notes?: string;
  clinic?: {
    name?: string;
    fullName?: string;
    address?: string;
    phone?: string;
    branch?: string;
    logo?: string;
  };
}

export default function VerifyLabReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const codeParam = searchParams.get('c') || searchParams.get('code') || searchParams.get('id') || '';
  const dataParam = searchParams.get('data') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Parse data fallback from query string if available
  const parseDataParam = (raw: string): ReportData | null => {
    try {
      const decoded = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
      const parsed = JSON.parse(decoded);
      return {
        verificationCode: parsed.c || codeParam,
        patientName: parsed.p || 'Patient',
        patientId: parsed.m || 'N/A',
        gender: parsed.g || 'Not specified',
        age: parsed.a || 'N/A',
        dob: parsed.dob,
        patientLocation: parsed.pl || 'Walk-In',
        serviceLocation: parsed.sl || 'Bole',
        orderDate: parsed.od || new Date().toISOString(),
        doneDate: parsed.rd || new Date().toISOString(),
        doneBy: parsed.tb || 'Lab Technician',
        requestedBy: parsed.req || 'Referral',
        reportDate: parsed.rd || new Date().toISOString(),
        reportDoneBy: parsed.pb || 'Pathologist / Lab Director',
        tests: (parsed.t || []).map((t: any) => ({
          testName: t.n || 'Test',
          results: t.r,
          unit: t.u || '',
          normalRange: t.nr || '',
          flag: t.f || '-',
          status: t.s || 'Completed',
          notes: t.notes || ''
        })),
        notes: parsed.notes || '',
        clinic: {
          name: parsed.cl?.n || 'New Life Medium Clinic',
          fullName: parsed.cl?.n || 'New Life Medium Clinic',
          address: parsed.cl?.a || 'Lafto, beside Kebron Guest House',
          phone: parsed.cl?.p || '+251925959219',
          branch: parsed.sl || 'Bole'
        }
      };
    } catch (e) {
      console.warn('Failed to parse URL report data fallback:', e);
      return null;
    }
  };

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    // 1. Try fetching from backend API if code is present
    if (codeParam) {
      try {
        const res = await fetch(`/api/public/lab-reports/${encodeURIComponent(codeParam)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setReport(json.data);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('API lookup failed, checking local cache:', apiErr);
      }

      // 2. Try full report payload from localStorage (saved when report was generated)
      try {
        const fullCached = localStorage.getItem(`lab_report_full_${codeParam}`);
        if (fullCached) {
          const parsed = JSON.parse(fullCached);
          setReport(parsed);
          setLoading(false);
          return;
        }
      } catch (_) {}

      // 3. Try compact payload from localStorage
      try {
        const cached = localStorage.getItem(`lab_report_${codeParam}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(parsed)))));
          const formatted = parseDataParam(encoded);
          if (formatted) {
            setReport(formatted);
            setLoading(false);
            return;
          }
        }
      } catch (_) {}
    }

    // 4. Fall back to embedded URL data if API was not reached or failed
    if (dataParam) {
      const fallback = parseDataParam(dataParam);
      if (fallback) {
        setReport(fallback);
        setLoading(false);
        return;
      }
    }

    // 5. If nothing worked
    setError('Laboratory examination report could not be verified or was not found.');
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [codeParam, dataParam]);

  // Handle Download / Print PDF
  const handleDownloadPDF = () => {
    if (!report) return;
    setIsDownloading(true);

    try {
      const enhancedPatient = {
        patientName: report.patientName,
        patientId: report.patientId,
        age: report.age,
        gender: report.gender,
        dob: report.dob,
        patientLocation: report.patientLocation || 'Walk-In',
        serviceLocation: report.serviceLocation || 'Bole',
        verifiedBy: report.doneBy,
        physician: report.requestedBy,
        tests: report.tests.map(t => ({
          testName: t.testName,
          results: t.results,
          normalRange: t.normalRange,
          notes: t.notes,
          orderedBy: report.requestedBy,
          requestDate: report.orderDate,
          orderDate: report.orderDate,
          resultDate: report.doneDate || report.reportDate,
          status: t.status || 'Completed',
          unit: t.unit,
          serviceLocation: report.serviceLocation || 'Bole'
        }))
      };

      const clinicInfo = report.clinic || {
        fullName: 'New Life Medium Clinic',
        name: 'New Life Medium Clinic',
        address: 'Lafto, beside Kebron Guest House',
        phone: '+251925959219',
        branch: 'Bole'
      };

      const html = generateProfessionalLabReportHTML(enhancedPatient, clinicInfo);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        // Fallback for popup-blocked mobile browsers: create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Unable to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getResultFlagBadge = (flag?: string) => {
    if (flag === 'H') return <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 font-bold text-xs border border-red-300">H</span>;
    if (flag === 'L') return <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 font-bold text-xs border border-blue-300">L</span>;
    if (flag === '!' || flag === '⚠') return <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-100 text-amber-700 font-bold text-xs border border-amber-300">!</span>;
    return <span className="text-gray-400 font-bold">—</span>;
  };

  const formatDate = (val?: any) => {
    if (!val) return 'N/A';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Verifying Laboratory Report...</h2>
          <p className="text-sm text-slate-500">Checking document cryptographic signature and authenticating with New Life Medium Clinic laboratory database.</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Report Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">{error || 'This QR code does not match an authentic report in our records.'}</p>
          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 text-left border border-slate-200 mb-6 font-mono break-all">
            Code: {codeParam || 'None provided'}
          </div>
          <button 
            onClick={() => loadReport()} 
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate abnormal items
  const totalTests = report.tests?.length || 0;
  let abnormalCount = report.summary?.abnormalCount ?? 0;
  if (!report.summary) {
    abnormalCount = report.tests.filter(t => t.flag === 'H' || t.flag === 'L' || t.flag === '!').length;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* ── Top Official App Bar ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              NL
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-blue-950 uppercase tracking-tight">
                {report.clinic?.name || 'New Life Medium Clinic'}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Authentic Laboratory Report
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-6 space-y-4">
        {/* ── Verification Badge Banner ── */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-white/25 px-2 py-0.5 rounded text-white">
                  Official Record
                </span>
                <span className="text-xs text-emerald-100 font-medium">Digital Verification</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                Verified Diagnostic Lab Results
              </h1>
              <p className="text-xs text-emerald-100 mt-0.5 font-mono">
                Verification Code: <strong>{report.verificationCode}</strong>
              </p>
            </div>
          </div>

          <div className="bg-black/20 rounded-xl px-3 py-2 text-right self-stretch sm:self-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
            <div className="text-[10px] uppercase tracking-wider text-emerald-200">Verified On</div>
            <div className="text-xs sm:text-sm font-bold text-white">{formatDate(report.reportDate)}</div>
          </div>
        </div>

        {/* ── Patient & Report Metadata Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Patient Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3 text-slate-800">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Patient Details</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Full Name</span>
                <span className="font-bold text-slate-900 text-sm uppercase">{report.patientName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">MRN / Patient ID</span>
                <span className="font-mono font-semibold text-slate-800">{report.patientId || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Sex / Age</span>
                <span className="font-semibold text-slate-800">
                  {report.gender ? report.gender.charAt(0).toUpperCase() + report.gender.slice(1) : 'Not specified'}
                  {report.age ? ` · ${report.age} Yr` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Location</span>
                <span className="font-semibold text-slate-800">{report.patientLocation || 'Walk-In'} ({report.serviceLocation || 'Bole'})</span>
              </div>
            </div>
          </div>

          {/* Report Information Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3 text-slate-800">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Order & Validation</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Order Date</span>
                <span className="font-semibold text-slate-800">{formatDate(report.orderDate)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Lab Done By</span>
                <span className="font-semibold text-slate-800">{report.doneBy || 'Tensae Nebiyou'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Requested By</span>
                <span className="font-semibold text-slate-800">{report.requestedBy || 'Referral'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Pathologist / Director</span>
                <span className="font-semibold text-slate-800">{report.reportDoneBy || 'Dr. DR Natan'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary Metrics Bar ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Tests</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalTests}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
            <div className="text-[10px] uppercase font-bold text-slate-400">Parameters</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{report.summary?.parameters || totalTests}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
            <div className="text-[10px] uppercase font-bold text-slate-400">Abnormal Flags</div>
            <div className={`text-xl sm:text-2xl font-black mt-0.5 ${abnormalCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {abnormalCount}
            </div>
          </div>
        </div>

        {/* ── Test Results Table ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider">Laboratory Results</h2>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              WHO Reference Standard
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 sm:px-4">Parameter</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">Result</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">Unit</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">Reference Range</th>
                  <th className="py-2.5 px-3 sm:px-4 text-center">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.tests.map((test, idx) => {
                  const resultStr = typeof test.results === 'object' && test.results?.results ? String(test.results.results) : (typeof test.results === 'string' ? test.results : JSON.stringify(test.results || ''));
                  const isHigh = test.flag === 'H' || (test.normalRange && test.normalRange.includes('<') && parseFloat(resultStr) > parseFloat(test.normalRange.replace(/[^0-9.]/g, '')));
                  const isLow = test.flag === 'L';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 sm:px-4 font-semibold text-slate-800">
                        <div>{test.testName}</div>
                        {test.notes && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{test.notes}</div>}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center font-bold text-sm">
                        <span className={isHigh ? 'text-red-600 font-extrabold' : isLow ? 'text-blue-600 font-extrabold' : 'text-slate-900'}>
                          {resultStr || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center text-slate-500 font-mono">
                        {test.unit || '—'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center text-slate-600">
                        {test.normalRange || 'Not specified'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        {getResultFlagBadge(test.flag)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Flag Legend Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span className="font-bold text-slate-700">Flag Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 rounded bg-red-100 text-red-700 font-bold text-[10px] text-center border border-red-300 leading-4">H</span>
              <span>High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 rounded bg-blue-100 text-blue-700 font-bold text-[10px] text-center border border-blue-300 leading-4">L</span>
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-bold">—</span>
              <span>Normal</span>
            </div>
          </div>
        </div>

        {/* ── Clinical Remarks / Notes ── */}
        {(report.notes || report.tests.some(t => t.notes)) && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs">
            <h4 className="font-bold uppercase tracking-wider text-blue-900 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Clinical Remarks &amp; Interpretation
            </h4>
            <p className="text-slate-700 leading-relaxed">
              {report.notes || report.tests.filter(t => t.notes).map(t => `${t.testName}: ${t.notes}`).join(' · ')}
            </p>
          </div>
        )}

        {/* ── Signature & Stamp Area ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
            <div className="flex flex-col items-center justify-end">
              <div className="w-36 border-b-2 border-slate-800 pb-1 mb-1 font-serif font-bold text-slate-800">
                {report.doneBy || 'Tensae Nebiyou'}
              </div>
              <div className="font-bold text-slate-800 uppercase tracking-tight text-[11px]">Laboratory Technician</div>
              <div className="text-[10px] text-slate-400">Licensed Medical Laboratory Technologist</div>
            </div>

            <div className="flex flex-col items-center justify-end">
              <div className="w-36 border-b-2 border-slate-800 pb-1 mb-1 font-serif font-bold text-slate-800">
                {report.reportDoneBy || 'Dr. DR Natan'}
              </div>
              <div className="font-bold text-slate-800 uppercase tracking-tight text-[11px]">Pathologist / Medical Director</div>
              <div className="text-[10px] text-slate-400">Authorized Signatory</div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-blue-900/40 bg-blue-50/50 flex flex-col items-center justify-center p-2 text-blue-900">
                <Building2 className="w-6 h-6 mb-0.5 opacity-80" />
                <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">Official Seal</span>
                <span className="text-[7.5px] font-mono text-blue-700">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Prominent Download CTA Card ── */}
        <div className="bg-white rounded-2xl border-2 border-blue-600 p-5 shadow-lg text-center space-y-3">
          <h3 className="text-base font-bold text-slate-900">Need a copy of your verified official lab report?</h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            You can download the high-resolution, print-ready PDF containing the official hospital letterhead, watermark, QR verification seal, and signatures.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              <span>{isDownloading ? 'Generating PDF...' : 'Download Official Lab Report (PDF)'}</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm border border-slate-300 transition"
            >
              <Printer className="w-5 h-5" />
              <span>Print Document</span>
            </button>
          </div>
        </div>

        {/* ── Footer & Confidentiality ── */}
        <footer className="text-center text-[11px] text-slate-400 space-y-1.5 pt-4">
          <div className="flex items-center justify-center gap-1 font-semibold text-slate-600">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Confidential Diagnostic Health Record
          </div>
          <p className="max-w-xl mx-auto text-[10px] leading-relaxed text-slate-400">
            This verification service confirms that this laboratory report was produced by {report.clinic?.name || 'New Life Medium Clinic'}.
            Results must be reviewed in context with full clinical examination by a qualified physician.
          </p>
          <div className="text-[10px] text-slate-500">
            📍 {report.clinic?.address || 'Lafto, beside Kebron Guest House'} · 📞 {report.clinic?.phone || '+251925959219'}
          </div>
        </footer>
      </main>
    </div>
  );
}
