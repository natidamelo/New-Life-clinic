import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import {
  ShieldCheck,
  Download,
  Key,
  Users,
  Calendar,
  Layers,
  Activity,
  FileSpreadsheet,
  FileJson,
  Printer,
  Search,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  LogIn,
} from 'lucide-react';
import dataShareService, { SharedPayloadResponse } from '../../services/dataShareService';
import { useAuth } from '../../context/AuthContext';

export default function SharedDatasetViewer() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<SharedPayloadResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Quick in-situ login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Fetch shared dataset
  const fetchSharedData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await dataShareService.consumeShare(token);
      setResponse(res);
    } catch (err: any) {
      setResponse({
        success: false,
        message: err.message || 'Failed to decrypt shared dataset. Please verify the URL.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedData();
  }, [token, user]);

  // Handle in-situ login for role-guarded links
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(loginEmail, loginPassword);
      // Auth context updates and triggers fetchSharedData
    } catch (err: any) {
      setLoginError(err.response?.data?.message || err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Convert array of objects to CSV for download
  const handleDownloadCsv = () => {
    if (!response?.data || !response.data.length) return;
    const items = response.data;
    const fields = response.share?.fields?.length ? response.share.fields : Object.keys(items[0]);
    
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = fields.map(escapeCsv).join(',');
    const rows = items.map((row) => fields.map((f) => escapeCsv(row[f])).join(','));
    const csvContent = [header, ...rows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `${(response.share?.title || 'dataset').replace(/[^a-zA-Z0-9_-]/g, '_')}-${dayjs().format('YYYYMMDD')}.csv`;
    saveAs(blob, filename);
  };

  // Download JSON format
  const handleDownloadJson = () => {
    if (!response?.data) return;
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const filename = `${(response.share?.title || 'dataset').replace(/[^a-zA-Z0-9_-]/g, '_')}-${dayjs().format('YYYYMMDD')}.json`;
    saveAs(blob, filename);
  };

  // Filter & sort data
  const processedData = useMemo(() => {
    if (!response?.data) return [];
    let list = [...response.data];

    // Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((row) =>
        Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortField) {
      list.sort((a, b) => {
        const valA = a[sortField] ?? '';
        const valB = b[sortField] ?? '';
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [response?.data, searchQuery, sortField, sortAsc]);

  // Paginated items
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.ceil(processedData.length / pageSize) || 1;

  // Toggle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // ─── 1. Loading State ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-700/50 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
        <h2 className="text-lg font-bold">Decrypting Tokenized Share...</h2>
        <p className="text-xs text-slate-500 mt-1">Verifying cryptographic signature and clinical permissions</p>
      </div>
    );
  }

  // ─── 2. Authentication Required Gate ──────────────────────────────────────
  if (response?.requiresAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-700/50 flex items-center justify-center">
              <Lock className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Role-Restricted Clinical Share
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {response.createdBy || 'Clinic Administrator'} has shared the{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                "{response.title}"
              </strong>{' '}
              dataset with authorized clinic staff.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800/40 text-xs text-teal-800 dark:text-teal-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Authorized Roles Required:</span>
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {response.allowedRoles?.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-teal-200/60 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Login Form */}
          <form onSubmit={handleQuickLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Clinic Username or Email
              </label>
              <input
                type="text"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="e.g. doctor@newlife.com"
                className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 shadow-md transition-all active:scale-[0.98]"
            >
              {loginLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" /> Verifying Credentials...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In & Decrypt Dataset
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-xs text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
            >
              Go to Standard Portal Sign-In →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 3. Role Mismatch or Unauthorized ──────────────────────────────────────
  if (response?.roleMismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#1E293B] border border-red-200 dark:border-red-900/50 shadow-xl space-y-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center">
            <XCircle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Access Authorization Denied
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            You are currently authenticated as <strong className="uppercase">"{response.userRole}"</strong>.
            This share requires one of the following roles:
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {response.allowedRoles?.map((r) => (
              <span
                key={r}
                className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {r}
              </span>
            ))}
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700"
            >
              Switch Account / Re-login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 4. Revoked, Expired, or General Error ─────────────────────────────────
  if (!response?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {response?.isRevoked ? 'Share Link Revoked' : response?.isExpired ? 'Share Link Expired' : 'Share Unavailable'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {response?.message || 'The requested share token is invalid or no longer active.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              Return to Clinic Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 5. Successful Decryption & Data Table ──────────────────────────────────
  const shareMeta = response.share;
  const items = response.data || [];
  const columns = shareMeta?.fields?.length
    ? shareMeta.fields
    : items.length
    ? Object.keys(items[0])
    : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Clinic Header Banner */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {shareMeta?.title || 'Shared Clinical Dataset'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40">
              {shareMeta?.dataset}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Shared by <strong className="text-slate-800 dark:text-slate-200">{shareMeta?.createdBy}</strong> ·{' '}
            {shareMeta?.expiresAt ? `Expires: ${dayjs(shareMeta.expiresAt).format('MMM D, YYYY')}` : 'No Expiration'} ·{' '}
            <span className="tabular-nums">Access #{shareMeta?.accessCount || 1}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all"
            title="Download formatted CSV spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel (CSV)
          </button>
          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all"
            title="Download JSON structure"
          >
            <FileJson className="w-4 h-4" /> JSON
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all"
            title="Print View"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="max-w-7xl mx-auto rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search in shared records..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-900 dark:text-white font-semibold">{processedData.length}</strong> of{' '}
              {items.length} records
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
            >
              <option value={15}>15 / page</option>
              <option value={30}>30 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      {sortField === col ? (
                        sortAsc ? (
                          <ChevronUp className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              {paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col} className="py-3 px-4 whitespace-nowrap text-slate-800 dark:text-slate-200">
                      {String(row[col] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {!paginatedData.length && (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <Search className="w-8 h-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm font-semibold">No records match your search filter</p>
              <p className="text-xs">Try clearing the search query.</p>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security & Audit Footer */}
      <div className="max-w-7xl mx-auto p-4 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>New Life Clinic EMR Cryptographic Share Hub · Decrypted & Logged</span>
        </span>
        <span className="tabular-nums font-mono text-[11px] text-slate-400">
          Token: {token?.slice(0, 8)}...{token?.slice(-6)}
        </span>
      </div>
    </div>
  );
}
