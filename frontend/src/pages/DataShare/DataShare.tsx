import React, { useMemo, useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import {
  Share2,
  Download,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Calendar,
  Users,
  FileSpreadsheet,
  Trash2,
  AlertCircle,
  Filter,
  Eye,
  RefreshCw,
  Clock,
  Lock,
  FileJson,
  Layers,
  Building2,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Plus,
  Ban,
} from 'lucide-react';
import dataShareService, {
  DatasetKey,
  DataShareRecord,
  DataShareStats,
} from '../../services/dataShareService';
import { useAuth } from '../../context/AuthContext';

// ─── Available Datasets & Field Metadata ─────────────────────────────────────
interface DatasetConfig {
  value: DatasetKey;
  label: string;
  description: string;
  icon: React.ElementType;
  availableFields: { key: string; label: string }[];
  defaultFields: string[];
}

const DATASETS: DatasetConfig[] = [
  {
    value: 'patients',
    label: 'Patients Registry',
    description: 'Demographics, clinical triage, department, contact numbers and EMR IDs',
    icon: Users,
    availableFields: [
      { key: 'patientId', label: 'Patient EMR ID' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'gender', label: 'Gender' },
      { key: 'age', label: 'Age' },
      { key: 'contactNumber', label: 'Phone Number' },
      { key: 'email', label: 'Email' },
      { key: 'department', label: 'Department' },
      { key: 'priority', label: 'Triage Priority' },
      { key: 'createdAt', label: 'Registered Date' },
    ],
    defaultFields: ['patientId', 'firstName', 'lastName', 'gender', 'age', 'contactNumber', 'department', 'createdAt'],
  },
  {
    value: 'appointments',
    label: 'Clinical Appointments',
    description: 'Scheduled visits, assigned doctors, consult status, and appointment slots',
    icon: Calendar,
    availableFields: [
      { key: 'patientId', label: 'Patient ID' },
      { key: 'patientName', label: 'Patient Name' },
      { key: 'doctor', label: 'Attending Doctor' },
      { key: 'appointmentDateTime', label: 'Appointment Time' },
      { key: 'durationMinutes', label: 'Duration (min)' },
      { key: 'type', label: 'Visit Type' },
      { key: 'status', label: 'Status' },
      { key: 'reason', label: 'Chief Complaint' },
      { key: 'createdAt', label: 'Booked Date' },
    ],
    defaultFields: ['patientId', 'patientName', 'doctor', 'appointmentDateTime', 'type', 'status', 'createdAt'],
  },
  {
    value: 'invoices',
    label: 'Billing & Invoices',
    description: 'Patient bills, payment authorizations, financial totals, and settlement statuses',
    icon: FileSpreadsheet,
    availableFields: [
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'patientId', label: 'Patient ID' },
      { key: 'patientName', label: 'Patient Name' },
      { key: 'dateIssued', label: 'Issue Date' },
      { key: 'status', label: 'Status' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'total', label: 'Total Amount (ETB)' },
      { key: 'createdAt', label: 'Created At' },
    ],
    defaultFields: ['invoiceNumber', 'patientName', 'dateIssued', 'paymentStatus', 'total', 'createdAt'],
  },
  {
    value: 'lab-orders',
    label: 'Laboratory & Diagnostics',
    description: 'Pathology requests, specimen statuses, STAT priorities, and results',
    icon: Activity,
    availableFields: [
      { key: 'patientId', label: 'Patient ID' },
      { key: 'patientName', label: 'Patient Name' },
      { key: 'testName', label: 'Diagnostic Test' },
      { key: 'status', label: 'Order Status' },
      { key: 'paymentStatus', label: 'Payment Auth' },
      { key: 'priority', label: 'Priority / STAT' },
      { key: 'orderDateTime', label: 'Order Time' },
      { key: 'createdAt', label: 'Created At' },
    ],
    defaultFields: ['patientId', 'patientName', 'testName', 'status', 'priority', 'orderDateTime'],
  },
  {
    value: 'inventory',
    label: 'Pharmacy & Stock Inventory',
    description: 'Medication quantities, unit prices, minimum thresholds, and safety alerts',
    icon: Layers,
    availableFields: [
      { key: 'itemCode', label: 'Item / Drug Code' },
      { key: 'name', label: 'Medication Name' },
      { key: 'category', label: 'Category' },
      { key: 'quantity', label: 'Current Stock' },
      { key: 'minThreshold', label: 'Reorder Level' },
      { key: 'sellingPrice', label: 'Unit Price' },
      { key: 'unit', label: 'Unit of Measure' },
      { key: 'createdAt', label: 'Catalog Date' },
    ],
    defaultFields: ['itemCode', 'name', 'category', 'quantity', 'minThreshold', 'sellingPrice'],
  },
];

const CLINIC_ROLES = ['admin', 'doctor', 'nurse', 'reception', 'finance', 'lab', 'imaging'];

const EXPIRY_PRESETS = [
  { label: '24 Hours', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '7 Days (Std)', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
  { label: 'Never', days: 0 },
];

export default function DataSharePage() {
  const { user } = useAuth();

  // Navigation tab: 'export' | 'create' | 'shares' | 'preview'
  const [activeTab, setActiveTab] = useState<'export' | 'create' | 'shares' | 'preview'>('export');

  // Shared state
  const [dataset, setDataset] = useState<DatasetKey>('patients');
  const [selectedFields, setSelectedFields] = useState<string[]>(DATASETS[0].defaultFields);
  const [datePreset, setDatePreset] = useState<string>('30d');
  const [fromDate, setFromDate] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  // Share creation form state
  const [shareTitle, setShareTitle] = useState<string>('');
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['admin', 'doctor']);
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [useAdvancedJsonFilter, setUseAdvancedJsonFilter] = useState<boolean>(false);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [customFilterJson, setCustomFilterJson] = useState<string>('{}');

  // Async data state
  const [shares, setShares] = useState<DataShareRecord[]>([]);
  const [stats, setStats] = useState<DataShareStats | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [searchShareQuery, setSearchShareQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [createdShareModal, setCreatedShareModal] = useState<DataShareRecord | null>(null);

  const currentDatasetConfig = useMemo(() => {
    return DATASETS.find((d) => d.value === dataset) || DATASETS[0];
  }, [dataset]);

  // Sync default fields on dataset change
  const handleDatasetChange = (newDataset: DatasetKey) => {
    setDataset(newDataset);
    const config = DATASETS.find((d) => d.value === newDataset) || DATASETS[0];
    setSelectedFields(config.defaultFields);
    setPreviewData([]);
  };

  // Date range preset handler
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = dayjs();
    if (preset === 'today') {
      setFromDate(today.format('YYYY-MM-DD'));
      setToDate(today.format('YYYY-MM-DD'));
    } else if (preset === '7d') {
      setFromDate(today.subtract(7, 'day').format('YYYY-MM-DD'));
      setToDate(today.format('YYYY-MM-DD'));
    } else if (preset === '30d') {
      setFromDate(today.subtract(30, 'day').format('YYYY-MM-DD'));
      setToDate(today.format('YYYY-MM-DD'));
    } else if (preset === 'thisMonth') {
      setFromDate(today.startOf('month').format('YYYY-MM-DD'));
      setToDate(today.format('YYYY-MM-DD'));
    } else if (preset === 'ytd') {
      setFromDate(today.startOf('year').format('YYYY-MM-DD'));
      setToDate(today.format('YYYY-MM-DD'));
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // Field selection toggles
  const toggleField = (fieldKey: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey) ? prev.filter((f) => f !== fieldKey) : [...prev, fieldKey]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(currentDatasetConfig.availableFields.map((f) => f.key));
  };

  const deselectAllFields = () => {
    setSelectedFields([]);
  };

  // Load active shares and metrics
  const loadData = async () => {
    try {
      const [sharesList, statsData] = await Promise.all([
        dataShareService.listShares(),
        dataShareService.getStats().catch(() => null),
      ]);
      setShares(sharesList);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load data shares:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch dataset preview
  const handleLoadPreview = async () => {
    setPreviewLoading(true);
    try {
      const data = await dataShareService.getDatasetPreview(dataset, {
        fields: selectedFields,
        from: fromDate,
        to: toDate,
      });
      setPreviewData(data);
      if (activeTab !== 'preview') {
        setActiveTab('preview');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to fetch live data preview: ' + (err.message || 'Error') });
    } finally {
      setPreviewLoading(false);
    }
  };

  // Export dataset
  const handleExport = async () => {
    if (!selectedFields.length) {
      setStatusMessage({ type: 'error', text: 'Please select at least one field to export.' });
      return;
    }
    setLoading(true);
    setStatusMessage({ type: 'info', text: `Preparing ${exportFormat.toUpperCase()} export for ${currentDatasetConfig.label}...` });
    try {
      const blob = await dataShareService.exportCsv(dataset, {
        fields: selectedFields,
        from: fromDate,
        to: toDate,
        format: exportFormat,
      });
      const ext = exportFormat === 'json' ? 'json' : 'csv';
      const filename = `new-life-${dataset}-${dayjs().format('YYYYMMDD-HHmm')}.${ext}`;
      saveAs(blob, filename);
      setStatusMessage({ type: 'success', text: `Export completed: ${filename} downloaded successfully.` });
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Export failed: ' + (err.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  // Create share link
  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide a descriptive title for this share link.' });
      return;
    }

    setLoading(true);
    try {
      let filterObj: Record<string, any> = {};
      if (useAdvancedJsonFilter) {
        try {
          filterObj = JSON.parse(customFilterJson || '{}');
        } catch {
          setStatusMessage({ type: 'error', text: 'Invalid JSON entered in advanced filter.' });
          setLoading(false);
          return;
        }
      } else {
        if (filterDepartment !== 'all') filterObj.department = filterDepartment;
        if (filterPriority !== 'all') filterObj.priority = filterPriority;
      }

      const created = await dataShareService.createShare({
        title: shareTitle.trim(),
        dataset,
        fields: selectedFields,
        filter: filterObj,
        expiresInDays,
        allowedRoles,
      });

      setCreatedShareModal(created);
      setShareTitle('');
      setStatusMessage({ type: 'success', text: `Secure share link "${created.title}" generated successfully!` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to create share: ' + (err.message || 'Server error') });
    } finally {
      setLoading(false);
    }
  };

  // Revoke share link
  const handleRevokeShare = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this share link? Authenticated recipients will immediately lose access.')) return;
    try {
      await dataShareService.revokeShare(id);
      setStatusMessage({ type: 'info', text: 'Share link successfully revoked.' });
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Revocation failed: ' + err.message });
    }
  };

  // Delete share record
  const handleDeleteShare = async (id: string) => {
    if (!window.confirm('Permanently delete this share record and audit history?')) return;
    try {
      await dataShareService.deleteShare(id);
      setStatusMessage({ type: 'info', text: 'Share record permanently removed.' });
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Deletion failed: ' + err.message });
    }
  };

  // Copy share URL to clipboard
  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Filtered shares list
  const filteredShares = useMemo(() => {
    return shares.filter((s) => {
      if (!searchShareQuery.trim()) return true;
      const q = searchShareQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.dataset.toLowerCase().includes(q) ||
        s.token.toLowerCase().includes(q)
      );
    });
  }, [shares, searchShareQuery]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* ─── Top Executive Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 border border-teal-200/50 dark:border-teal-700/40">
            <Share2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Data Share & Clinical Governance
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                <ShieldCheck className="w-3.5 h-3.5" /> HIPAA / EMR Compliant
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Securely export clinical registries, generate tokenized inter-department shares, and audit external compliance exchanges.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            title="Refresh active links"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> New Share Link
          </button>
        </div>
      </div>

      {/* ─── Notification Alert Banner ────────────────────────────────────── */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
              : statusMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40'
              : 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            ) : (
              <Activity className="w-4 h-4 text-teal-600 flex-shrink-0 animate-spin" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Executive Telemetry Strip (4 KPI Cards) ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Shares */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Share Links
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {shares.filter((s) => s.isActive && !s.isExpired).length}
            </span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Now
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {shares.length} total links generated to date
          </p>
        </div>

        {/* Card 2: Access Hits */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Access Hits
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <Key className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {stats?.totalAccesses ?? shares.reduce((acc, curr) => acc + (curr.accessCount || 0), 0)}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Logged
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Token & role verified on every retrieval
          </p>
        </div>

        {/* Card 3: Clinical Datasets */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Clinical Datasets
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              5 Stores
            </span>
            <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
              Ready
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Patients, OPD, Invoices, Labs, Stock
          </p>
        </div>

        {/* Card 4: Governance Protocol */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Security Protocol
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <Lock className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              SHA-256
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              Encrypted
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Zero clear-text exposure in transit
          </p>
        </div>
      </div>

      {/* ─── Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'export'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Download className="w-4 h-4" /> Export & Reports Studio
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'create'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Share2 className="w-4 h-4" /> Create Secure Share Link
        </button>

        <button
          onClick={() => setActiveTab('shares')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'shares'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Key className="w-4 h-4" /> Active Shares & Audit ({shares.length})
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'preview'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" /> Live Data Preview {previewData.length > 0 && `(${previewData.length} records)`}
        </button>
      </div>

      {/* ─── TAB 1: EXPORT & REPORTS STUDIO ───────────────────────────────── */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Configuration (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Select Dataset */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                    Step 1
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Select Clinical Dataset
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Choose source repository
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DATASETS.map((d) => {
                  const Icon = d.icon;
                  const isSelected = dataset === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => handleDatasetChange(d.value)}
                      className={`text-left p-3.5 rounded-xl border transition-all relative ${
                        isSelected
                          ? 'border-teal-600 dark:border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 ring-1 ring-teal-600/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {d.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {d.description}
                      </p>
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-teal-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Date Range Filter */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                    Step 2
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Temporal Date Range
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Filter by creation or visit timestamp
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: 'Last 7 Days' },
                  { id: '30d', label: 'Last 30 Days' },
                  { id: 'thisMonth', label: 'This Month' },
                  { id: 'ytd', label: 'Year to Date' },
                  { id: 'all', label: 'All Records' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      datePreset === p.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    From (Beginning of day)
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    To (End of day)
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Field Attributes Configurator */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                    Step 3
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Select Data Attributes ({selectedFields.length} of {currentDatasetConfig.availableFields.length} selected)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFields}
                    className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={deselectAllFields}
                    className="text-xs font-medium text-slate-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentDatasetConfig.availableFields.map((field) => {
                  const isChecked = selectedFields.includes(field.key);
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => toggleField(field.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isChecked
                          ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-500'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isChecked ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{field.label}</span>
                      <span className="text-[10px] opacity-70 font-mono">({field.key})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Export Summary & Execution Card (4 cols) */}
          <div className="lg:col-span-4 space-y-5 sticky top-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-teal-600" /> Export Summary
              </h3>

              <div className="space-y-3 py-2 border-y border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Selected Dataset:</span>
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {currentDatasetConfig.label}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Date Range:</span>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                    {fromDate || 'Earliest'} → {toDate || 'Latest'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Attributes Included:</span>
                  <strong className="text-teal-600 dark:text-teal-400 font-semibold tabular-nums">
                    {selectedFields.length} Fields
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Target Format:</span>
                  <span className="uppercase font-semibold text-slate-900 dark:text-white">
                    {exportFormat}
                  </span>
                </div>
              </div>

              {/* Format selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Output Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      exportFormat === 'csv'
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 ring-1 ring-teal-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> CSV (Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      exportFormat === 'json'
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 ring-1 ring-teal-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileJson className="w-4 h-4" /> JSON (EMR)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={loading || !selectedFields.length}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 shadow-md transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" /> Generating File...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Download {exportFormat.toUpperCase()}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleLoadPreview}
                  disabled={previewLoading || !selectedFields.length}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  {previewLoading ? (
                    <>
                      <Activity className="w-3.5 h-3.5 animate-spin" /> Fetching Preview...
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Preview First 8 Records
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  All exports are logged with your administrator user footprint for national EMR compliance audits.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CREATE SECURE SHARE LINK ──────────────────────────────── */}
      {activeTab === 'create' && (
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleCreateShare}
            className="p-6 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Generate Secure Share Link
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Create a tokenized, time-limited, role-guarded link for external specialists or departmental review.
                </p>
              </div>
            </div>

            {/* Share Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Share Purpose / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MOH Monthly Health Audit — Q4 General OPD"
                value={shareTitle}
                onChange={(e) => setShareTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Dataset Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Dataset
              </label>
              <select
                value={dataset}
                onChange={(e) => handleDatasetChange(e.target.value as DatasetKey)}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {DATASETS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label} — ({d.availableFields.length} attributes)
                  </option>
                ))}
              </select>
            </div>

            {/* Allowed Roles Multi-select */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Allowed Staff Roles (RBAC Guard)
                </label>
                <span className="text-[11px] text-slate-500">
                  Only staff with these roles can decrypt the share
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CLINIC_ROLES.map((role) => {
                  const isChecked = allowedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() =>
                        setAllowedRoles((prev) =>
                          prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        isChecked
                          ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-500'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 inline mr-1" />}
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expiration Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Link Expiration Window
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {EXPIRY_PRESETS.map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => setExpiresInDays(p.days)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                      expiresInDays === p.days
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Mode Selector (Visual vs JSON) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-teal-600" /> Dataset Filter Rules
                </span>
                <button
                  type="button"
                  onClick={() => setUseAdvancedJsonFilter(!useAdvancedJsonFilter)}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
                >
                  {useAdvancedJsonFilter ? 'Switch to Visual Builder' : 'Switch to Advanced JSON Filter'}
                </button>
              </div>

              {!useAdvancedJsonFilter ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Department Filter
                    </label>
                    <select
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="all">All Departments</option>
                      <option value="General">General OPD</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="OB/GYN">OB / GYN</option>
                      <option value="Dental">Dental</option>
                      <option value="Ophthalmology">Ophthalmology</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Priority / Triage
                    </label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="all">All Priorities</option>
                      <option value="Normal">Normal Only</option>
                      <option value="Urgent">Urgent Only</option>
                      <option value="Critical">Critical (STAT) Only</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1 font-mono">
                    MongoDB JSON Query Expression
                  </label>
                  <textarea
                    rows={3}
                    value={customFilterJson}
                    onChange={(e) => setCustomFilterJson(e.target.value)}
                    placeholder='{"priority": "Urgent"}'
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 shadow-md transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" /> Generating Cryptographic Token...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" /> Create & Tokenize Share Link
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB 3: ACTIVE SHARES & AUDIT TABLE ───────────────────────────── */}
      {activeTab === 'shares' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Active Share Links & Security Audit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track tokenized access history, revoke active shares, and copy secured endpoints
              </p>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search shares..."
                value={searchShareQuery}
                onChange={(e) => setSearchShareQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* How Sharing Works Tip */}
          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/40 text-xs text-teal-900 dark:text-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>How to share with a Doctor or Specialist:</strong> Click <strong>Copy URL</strong> to copy the share link (<code>/shared/&lt;token&gt;</code>) and send it to them. When opened, authorized doctors sign in with their credentials to view, search, and export the live dataset.
              </span>
            </div>
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 whitespace-nowrap bg-teal-100 dark:bg-teal-900/50 px-2.5 py-1 rounded-full">
              Click "View" to preview
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                  <th className="py-3 px-4">Title & Dataset</th>
                  <th className="py-3 px-4">Security Token</th>
                  <th className="py-3 px-4">Allowed Roles</th>
                  <th className="py-3 px-4">Status & Expiration</th>
                  <th className="py-3 px-4">Access Hits</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredShares.map((s) => {
                  const isRevoked = !s.isActive;
                  const isExpired = s.isExpired;
                  const isCopied = copiedToken === s.token;

                  return (
                    <tr
                      key={s._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Title & Dataset */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">
                          {s.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="capitalize font-medium text-teal-600 dark:text-teal-400">
                            {s.dataset}
                          </span>
                          <span>·</span>
                          <span>{dayjs(s.createdAt).format('MMM D, YYYY HH:mm')}</span>
                        </div>
                      </td>

                      {/* Token */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {s.token.slice(0, 10)}...{s.token.slice(-6)}
                        </span>
                      </td>

                      {/* Allowed Roles */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {s.allowedRoles && s.allowedRoles.length ? (
                            s.allowedRoles.map((r) => (
                              <span
                                key={r}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              >
                                {r}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">All Roles</span>
                          )}
                        </div>
                      </td>

                      {/* Status & Expiry */}
                      <td className="py-3.5 px-4">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            <Ban className="w-3 h-3" /> Revoked
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            <Clock className="w-3 h-3" /> Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Active
                            {s.expiresAt && ` · ${dayjs(s.expiresAt).format('MMM D')}`}
                          </span>
                        )}
                      </td>

                      {/* Access Hits */}
                      <td className="py-3.5 px-4 font-semibold tabular-nums text-slate-900 dark:text-white">
                        <span className="inline-flex items-center gap-1">
                          <Key className="w-3 h-3 text-slate-400" />
                          {s.accessCount || 0} hits
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => window.open(`/shared/${s.token}`, '_blank')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
                            title="Open interactive viewer in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(s.token)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
                            }`}
                            title="Copy link to clipboard"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy URL
                              </>
                            )}
                          </button>

                          {s.isActive && (
                            <button
                              type="button"
                              onClick={() => handleRevokeShare(s._id)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Revoke Link"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteShare(s._id)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!filteredShares.length && (
              <div className="text-center py-10 text-slate-400">
                <Share2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No data shares found</p>
                <p className="text-xs">Create your first share link using the button above.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: LIVE DATA PREVIEW ─────────────────────────────────────── */}
      {activeTab === 'preview' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Live Preview: {currentDatasetConfig.label}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                  {previewData.length} records shown
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspecting real database records before creating link or downloading
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadPreview}
                disabled={previewLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${previewLoading ? 'animate-spin' : ''}`} /> Refresh Preview
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download Full Dataset
              </button>
            </div>
          </div>

          {previewData.length > 0 ? (
            <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="py-2.5 px-3.5 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {previewData.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {Object.keys(row).map((k) => (
                        <td key={k} className="py-2.5 px-3.5 whitespace-nowrap text-slate-800 dark:text-slate-200">
                          {String(row[k] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Eye className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm font-semibold">No preview loaded yet</p>
              <button
                type="button"
                onClick={handleLoadPreview}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                Load Preview Data
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: SHARE LINK CREATED SUCCESS ────────────────────────────── */}
      {createdShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Share Link Successfully Created
                </h3>
                <p className="text-xs text-slate-500">
                  Ready for clinical collaboration and audits
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Direct Cryptographic URL:
              </span>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/shared/${createdShareModal.token}`}
                  className="w-full text-xs font-mono bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(createdShareModal.token)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1 flex-shrink-0"
                >
                  {copiedToken === createdShareModal.token ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Dataset:</span>
                <strong className="text-slate-900 dark:text-white capitalize">{createdShareModal.dataset}</strong>
              </div>
              <div className="flex justify-between">
                <span>Expiration:</span>
                <span>{createdShareModal.expiresAt ? dayjs(createdShareModal.expiresAt).format('MMM D, YYYY') : 'Never'}</span>
              </div>
              <div className="flex justify-between">
                <span>Allowed Roles:</span>
                <span>{createdShareModal.allowedRoles?.join(', ') || 'All Roles'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.open(`/shared/${createdShareModal.token}`, '_blank')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Share View
              </button>
              <button
                type="button"
                onClick={() => setCreatedShareModal(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
