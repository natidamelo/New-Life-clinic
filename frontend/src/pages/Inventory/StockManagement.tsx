import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import inventoryService from '../../services/inventoryService';
import patientService, { Patient } from '../../services/patientService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import {
  Plus,
  Edit2,
  Trash2,
  History,
  QrCode,
  AlertTriangle,
  RefreshCw,
  FlaskConical,
  Pill,
  Wrench,
  Camera,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  Package,
  PackageCheck,
  PackageX,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  CalendarClock,
  Search,
  X,
  ChevronDown,
  CheckCircle2,
  Clock,
  User,
  ShoppingBag,
  Layers,
  BarChart2,
} from 'lucide-react';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface StockItem {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice?: number;
  expiryDate?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  lastUpdated: string;
  serviceStatus?: {
    linked: boolean;
    services?: Array<{ id: string; name: string; category: string; price: number }>;
    suggestion?: { available: boolean; serviceId?: string; serviceName?: string; message?: string };
  };
}

interface StockMovement {
  _id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  reason: string;
  user: string;
}

type CategoryKey = 'all' | 'laboratory' | 'medication' | 'service' | 'imaging' | 'other';
type TabKey = 'overview' | 'movements' | 'reorder' | 'expiry';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return 'N/A';
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? 'Invalid' : format(dt, 'MMM dd, yyyy');
  } catch { return 'Invalid'; }
};

const normalizeCategory = (raw?: string): Exclude<CategoryKey, 'all'> => {
  const v = (raw || '').toLowerCase();
  if (v.includes('lab')) return 'laboratory';
  if (v.includes('medic') || v.includes('drug') || v.includes('pharma')) return 'medication';
  if (v.includes('imag') || v.includes('x-ray') || v.includes('xray') || v.includes('ultra') || v.includes('ct')) return 'imaging';
  if (v.includes('service')) return 'service';
  return 'other';
};

const calcStatus = (item: StockItem): StockItem['status'] => {
  if (item.quantity === 0) return 'out-of-stock';
  if (item.quantity <= item.reorderLevel) return 'low-stock';
  return 'in-stock';
};

const getExpiryInfo = (expiryDate: string) => {
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: `Expired ${Math.abs(days)}d ago`, cls: 'bg-red-100 text-red-700',    dot: 'bg-red-500' };
  if (days <= 7) return { label: `${days}d — Critical`,            cls: 'bg-red-100 text-red-700',    dot: 'bg-red-500' };
  if (days <= 30) return { label: `${days}d — Warning`,            cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' };
  return           { label: `${days}d`,                            cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
};

// ─── Category config ──────────────────────────────────────────────────────────
const CAT_CONFIG: Record<Exclude<CategoryKey, 'all'>, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  laboratory: { icon: <FlaskConical className="h-3.5 w-3.5" />, color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200' },
  medication:  { icon: <Pill className="h-3.5 w-3.5" />,        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  service:     { icon: <Wrench className="h-3.5 w-3.5" />,      color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
  imaging:     { icon: <Camera className="h-3.5 w-3.5" />,      color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  other:       { icon: <LayoutGrid className="h-3.5 w-3.5" />,  color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200' },
};

const STATUS_CONFIG: Record<StockItem['status'], { label: string; cls: string; dot: string }> = {
  'in-stock':     { label: 'In Stock',     cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  'low-stock':    { label: 'Low Stock',    cls: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  'out-of-stock': { label: 'Out of Stock', cls: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
};

const CAT_ORDER: Exclude<CategoryKey, 'all'>[] = ['laboratory', 'medication', 'service', 'imaging', 'other'];

// ─── Sub-components ───────────────────────────────────────────────────────────
const Badge: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>{children}</span>
);

const StatusBadge: React.FC<{ status: StockItem['status'] }> = ({ status }) => {
  const s = STATUS_CONFIG[status];
  return (
    <Badge className={`${s.cls} border-transparent`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </Badge>
  );
};

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const key = normalizeCategory(category);
  const c = CAT_CONFIG[key];
  return (
    <Badge className={`${c.bg} ${c.color} ${c.border}`}>
      {c.icon}
      {key.charAt(0).toUpperCase() + key.slice(1)}
    </Badge>
  );
};

// ─── Modal wrapper ────────────────────────────────────────────────────────────
const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; maxW?: string }> = ({
  open, onClose, title, children, footer, maxW = 'max-w-lg'
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxW} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const StockManagement: React.FC = () => {
  const navigate = useNavigate();

  // Data state
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

  // Movement form
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementQuantity, setMovementQuantity] = useState(0);
  const [movementReason, setMovementReason] = useState('');
  const [isDispenseToPatient, setIsDispenseToPatient] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [apiItems, fetchedMovements, patientResponse] = await Promise.all([
        inventoryService.getAllInventoryItems({ withServices: true }),
        inventoryService.getStockMovements(),
        patientService.getAllPatients(false, false),
      ]);

      const mapped: StockItem[] = apiItems.map(item => ({
        _id: item._id || item.id || '',
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        reorderLevel: item.minimumStockLevel || 0,
        costPrice: item.costPrice || 0,
        sellingPrice: item.sellingPrice,
        expiryDate: item.expiryDate,
        status: item.quantity <= 0 ? 'out-of-stock' : item.quantity <= (item.minimumStockLevel || 0) ? 'low-stock' : 'in-stock',
        lastUpdated: item.updatedAt || new Date().toISOString(),
        serviceStatus: item.serviceStatus,
      }));

      setStockItems(mapped);
      setMovements(fetchedMovements || []);
      setPatients(patientResponse.patients || []);
      setError(null);
    } catch {
      setError('Failed to load data. Please try again.');
      toast.error('Failed to load stock data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!movementDialogOpen) { setSelectedPatientId(null); setIsDispenseToPatient(false); setPatientSearch(''); } }, [movementDialogOpen]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts = { laboratory: 0, medication: 0, service: 0, imaging: 0, other: 0 };
    stockItems.forEach(i => { counts[normalizeCategory(i.category)]++; });
    return counts;
  }, [stockItems]);

  const filteredItems = useMemo(() => {
    let items = categoryFilter === 'all' ? stockItems : stockItems.filter(i => normalizeCategory(i.category) === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return [...items].sort((a, b) => {
      const diff = CAT_ORDER.indexOf(normalizeCategory(a.category)) - CAT_ORDER.indexOf(normalizeCategory(b.category));
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }, [stockItems, categoryFilter, searchQuery]);

  const reorderItems = useMemo(() => stockItems.filter(i => i.quantity <= i.reorderLevel), [stockItems]);
  const expiringItems = useMemo(() => stockItems.filter(i => {
    if (!i.expiryDate) return false;
    const d = new Date(i.expiryDate);
    return !isNaN(d.getTime());
  }).sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()), [stockItems]);

  const summaryStats = useMemo(() => ({
    total: stockItems.length,
    totalQty: stockItems.reduce((s, i) => s + i.quantity, 0),
    inStock: stockItems.filter(i => calcStatus(i) === 'in-stock').length,
    lowStock: stockItems.filter(i => calcStatus(i) === 'low-stock').length,
    outOfStock: stockItems.filter(i => calcStatus(i) === 'out-of-stock').length,
    totalCost: stockItems.reduce((s, i) => s + i.quantity * i.costPrice, 0),
    totalValue: stockItems.reduce((s, i) => s + i.quantity * (i.sellingPrice || 0), 0),
  }), [stockItems]);

  const filteredPatients = useMemo(() =>
    patients.filter(p => {
      if (!patientSearch.trim()) return true;
      const q = patientSearch.toLowerCase();
      return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || (p.patientId || '').toLowerCase().includes(q);
    }).slice(0, 8),
  [patients, patientSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStockMovement = async () => {
    if (!selectedItem || movementQuantity <= 0) { toast.error('Invalid item or quantity.'); return; }
    if (isDispenseToPatient && !selectedPatientId) { toast.error('Please select a patient.'); return; }
    setSubmitting(true);
    try {
      if (isDispenseToPatient && selectedPatientId) {
        await inventoryService.dispenseToPatient({
          items: [{ itemId: selectedItem._id, quantity: movementQuantity, notes: movementReason }],
          patientId: selectedPatientId,
          reference: selectedItem.name,
          notes: movementReason,
        });
        toast.success('Item dispensed to patient. Billable charge created.');
      } else {
        await inventoryService.recordStockMovement({ itemId: selectedItem._id, itemName: selectedItem.name, type: movementType, quantity: movementQuantity, reason: movementReason });
        toast.success(`Stock ${movementType === 'in' ? 'added' : 'removed'} successfully.`);
      }
      setMovementDialogOpen(false);
      fetchData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process stock operation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      const ok = await inventoryService.deleteInventoryItem(itemToDelete._id);
      if (ok) { toast.success('Item deleted.'); fetchData(true); }
      else toast.error('Failed to delete item.');
    } catch { toast.error('Unexpected error while deleting.'); }
    finally { setDeleteDialogOpen(false); setItemToDelete(null); }
  };

  const openMovement = (item: StockItem, type: 'in' | 'out') => {
    setSelectedItem(item);
    setMovementType(type);
    setMovementQuantity(0);
    setMovementReason('');
    setMovementDialogOpen(true);
  };

  // ── Tab config ────────────────────────────────────────────────────────────
  const TABS: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview',   label: 'Stock Overview',      icon: <Package className="h-4 w-4" /> },
    { key: 'movements',  label: 'Movement History',    icon: <History className="h-4 w-4" />,    badge: movements.length },
    { key: 'reorder',    label: 'Reorder Suggestions', icon: <AlertTriangle className="h-4 w-4" />, badge: reorderItems.length },
    { key: 'expiry',     label: 'Expiry Tracking',     icon: <CalendarClock className="h-4 w-4" />, badge: expiringItems.length },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-600" />
            Stock Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage inventory, track movements and monitor stock levels</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/app/inventory/new-item')}
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add New Item
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Items',    value: summaryStats.total,                      icon: <Package className="h-5 w-5" />,     bg: 'bg-blue-600',    sub: `${summaryStats.totalQty} units` },
            { label: 'In Stock',       value: summaryStats.inStock,                    icon: <PackageCheck className="h-5 w-5" />, bg: 'bg-emerald-600', sub: `${summaryStats.lowStock} low stock` },
            { label: 'Total Cost',     value: `$${summaryStats.totalCost.toFixed(0)}`, icon: <DollarSign className="h-5 w-5" />,  bg: 'bg-violet-600',  sub: 'Inventory cost' },
            { label: 'Sell Value',     value: `$${summaryStats.totalValue.toFixed(0)}`,icon: <TrendingUp className="h-5 w-5" />,  bg: 'bg-amber-600',   sub: 'Potential revenue' },
          ].map(({ label, value, icon, bg, sub }) => (
            <Card key={label} className="overflow-hidden border-0 shadow-md">
              <CardContent className="p-0">
                <div className={`${bg} p-4 text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs font-medium uppercase tracking-wide">{label}</p>
                      <p className="text-2xl font-bold mt-0.5">{value}</p>
                      <p className="text-white/70 text-xs mt-1">{sub}</p>
                    </div>
                    <div className="p-2.5 bg-white/20 rounded-xl">{icon}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Alert bar ───────────────────────────────────────────────────── */}
      {!loading && (summaryStats.outOfStock > 0 || summaryStats.lowStock > 0) && (
        <div className="flex flex-wrap gap-3">
          {summaryStats.outOfStock > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <PackageX className="h-4 w-4 flex-shrink-0" />
              <span><b>{summaryStats.outOfStock}</b> item{summaryStats.outOfStock > 1 ? 's' : ''} out of stock</span>
            </div>
          )}
          {summaryStats.lowStock > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span><b>{summaryStats.lowStock}</b> item{summaryStats.lowStock > 1 ? 's' : ''} running low</span>
            </div>
          )}
        </div>
      )}

      {/* ── Main Card ───────────────────────────────────────────────────── */}
      <Card className="shadow-sm border border-gray-200 overflow-hidden">

        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/60">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div>
            {/* Filters + Search */}
            <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
              {/* Category chips */}
              <div className="flex flex-wrap gap-2 flex-1">
                {([
                  { key: 'all' as CategoryKey,        label: `All`,        count: stockItems.length,          icon: <LayoutGrid className="h-3.5 w-3.5" /> },
                  { key: 'laboratory' as CategoryKey, label: 'Laboratory', count: categoryCounts.laboratory,  icon: <FlaskConical className="h-3.5 w-3.5" /> },
                  { key: 'medication' as CategoryKey, label: 'Medication', count: categoryCounts.medication,  icon: <Pill className="h-3.5 w-3.5" /> },
                  { key: 'service' as CategoryKey,    label: 'Service',    count: categoryCounts.service,     icon: <Wrench className="h-3.5 w-3.5" /> },
                  { key: 'imaging' as CategoryKey,    label: 'Imaging',    count: categoryCounts.imaging,     icon: <Camera className="h-3.5 w-3.5" /> },
                  { key: 'other' as CategoryKey,      label: 'Other',      count: categoryCounts.other,       icon: <LayoutGrid className="h-3.5 w-3.5" /> },
                ]).map(({ key, label, count, icon }) => (
                  <button
                    key={key}
                    onClick={() => setCategoryFilter(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      categoryFilter === key
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {icon}
                    {label}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${categoryFilter === key ? 'bg-white/20' : 'bg-gray-100'}`}>{count}</span>
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-2" />
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No items found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or add a new item</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Item', 'Category', 'Quantity', 'Cost Price', 'Sell Price', 'Total Cost', 'Total Value', 'Service', 'Status', 'Expiry', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const rows: React.ReactNode[] = [];
                      let lastCat: string | null = null;
                      filteredItems.forEach(item => {
                        const cat = normalizeCategory(item.category);
                        if (categoryFilter === 'all' && cat !== lastCat) {
                          const cc = CAT_CONFIG[cat];
                          rows.push(
                            <tr key={`hdr-${cat}`} className="bg-gray-50/80">
                              <td colSpan={11} className="px-4 py-2">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${cc.color}`}>
                                  {cc.icon}
                                  {cat}
                                </span>
                              </td>
                            </tr>
                          );
                          lastCat = cat;
                        }
                        const totalCost = item.quantity * item.costPrice;
                        const totalValue = item.quantity * (item.sellingPrice || 0);
                        const status = calcStatus(item);
                        rows.push(
                          <tr key={item._id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px]">
                              <div className="flex items-center gap-2">
                                {status !== 'in-stock' && (
                                  <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${status === 'out-of-stock' ? 'text-red-500' : 'text-amber-500'}`} />
                                )}
                                <span className="truncate">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3"><CategoryBadge category={item.category} /></td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{item.quantity}</td>
                            <td className="px-4 py-3 text-gray-600">${item.costPrice.toFixed(2)}</td>
                            <td className="px-4 py-3 text-gray-600">{item.sellingPrice ? `$${item.sellingPrice.toFixed(2)}` : '—'}</td>
                            <td className="px-4 py-3 text-gray-600">${totalCost.toFixed(2)}</td>
                            <td className="px-4 py-3 text-gray-600">{item.sellingPrice ? `$${totalValue.toFixed(2)}` : '—'}</td>
                            <td className="px-4 py-3">
                              {item.serviceStatus?.linked ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {item.serviceStatus.services?.[0]?.name?.slice(0, 16) || 'Linked'}
                                </Badge>
                              ) : item.serviceStatus?.suggestion?.available ? (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                                  <AlertTriangle className="h-3 w-3" />
                                  {item.serviceStatus.suggestion.serviceName?.slice(0, 16) || 'Available'}
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-50 text-gray-500 border-gray-200">No Service</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={status} /></td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.expiryDate)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  title="Stock In"
                                  onClick={() => openMovement(item, 'in')}
                                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                                >
                                  <ArrowUpCircle className="h-4 w-4" />
                                </button>
                                <button
                                  title="Stock Out"
                                  onClick={() => openMovement(item, 'out')}
                                  className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                                >
                                  <ArrowDownCircle className="h-4 w-4" />
                                </button>
                                <button
                                  title="QR Code"
                                  onClick={() => { setSelectedItem(item); setQrDialogOpen(true); }}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                >
                                  <QrCode className="h-4 w-4" />
                                </button>
                                <button
                                  title="Edit"
                                  onClick={() => navigate(`/app/inventory/edit/${item._id}`)}
                                  className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600 transition-colors"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  title="Delete"
                                  onClick={() => { setItemToDelete(item); setDeleteDialogOpen(true); }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary strip */}
            {!loading && !error && stockItems.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5"><BarChart2 className="h-3.5 w-3.5 text-blue-500" /> <b>{summaryStats.total}</b> items</span>
                  <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-violet-500" /> <b>{summaryStats.totalQty}</b> total units</span>
                  <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Cost: <b>${summaryStats.totalCost.toFixed(2)}</b></span>
                  <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Value: <b>${summaryStats.totalValue.toFixed(2)}</b></span>
                  {summaryStats.lowStock > 0 && <span className="flex items-center gap-1.5 text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> <b>{summaryStats.lowStock}</b> low stock</span>}
                  {summaryStats.outOfStock > 0 && <span className="flex items-center gap-1.5 text-red-600"><PackageX className="h-3.5 w-3.5" /> <b>{summaryStats.outOfStock}</b> out of stock</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MOVEMENT HISTORY TAB ──────────────────────────────────────── */}
        {activeTab === 'movements' && (
          <div className="overflow-x-auto">
            {movements.length === 0 ? (
              <div className="p-12 text-center">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No movement history</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Date', 'Item', 'Type', 'Quantity', 'Reason', 'User'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map(m => (
                    <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(m.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{m.itemName}</td>
                      <td className="px-4 py-3">
                        <Badge className={m.type === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                          {m.type === 'in' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                          {(m.type || '').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{m.quantity}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{m.reason}</td>
                      <td className="px-4 py-3 text-gray-500">{m.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── REORDER TAB ───────────────────────────────────────────────── */}
        {activeTab === 'reorder' && (
          <div className="overflow-x-auto">
            {reorderItems.length === 0 ? (
              <div className="p-12 text-center">
                <PackageCheck className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">All items are sufficiently stocked</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Item', 'Category', 'Current Stock', 'Reorder Level', 'Deficit', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reorderItems.map(item => {
                    const deficit = item.reorderLevel - item.quantity;
                    return (
                      <tr key={item._id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3"><CategoryBadge category={item.category} /></td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-amber-600'}`}>{item.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.reorderLevel}</td>
                        <td className="px-4 py-3">
                          <Badge className="bg-red-50 text-red-700 border-red-200">
                            <TrendingDown className="h-3 w-3" />
                            {deficit > 0 ? `−${deficit}` : 'Out'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={calcStatus(item)} /></td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => openMovement(item, 'in')}
                          >
                            <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                            Restock
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── EXPIRY TAB ────────────────────────────────────────────────── */}
        {activeTab === 'expiry' && (
          <div className="overflow-x-auto">
            {expiringItems.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarClock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No items with expiry dates</p>
                <p className="text-gray-400 text-sm mt-1">Add expiry dates to inventory items to track them here</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Item', 'Category', 'Expiry Date', 'Status', 'Qty', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expiringItems.map(item => {
                    const exp = getExpiryInfo(item.expiryDate!);
                    return (
                      <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.name}</p>
                        </td>
                        <td className="px-4 py-3"><CategoryBadge category={item.category} /></td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(item.expiryDate)}</td>
                        <td className="px-4 py-3">
                          <Badge className={`${exp.cls} border-transparent`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${exp.dot}`} />
                            {exp.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.quantity}</td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-amber-200 text-amber-600 hover:bg-amber-50"
                            onClick={() => openMovement(item, 'out')}
                          >
                            <ArrowDownCircle className="h-3.5 w-3.5 mr-1" />
                            Use Stock
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      {/* ── Stock Movement Modal ─────────────────────────────────────────── */}
      <Modal
        open={movementDialogOpen}
        onClose={() => setMovementDialogOpen(false)}
        title={`${movementType === 'in' ? 'Stock In' : 'Stock Out'} — ${selectedItem?.name}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setMovementDialogOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleStockMovement}
              disabled={movementQuantity <= 0 || !movementReason || submitting}
              className={movementType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
            >
              {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : (movementType === 'in' ? <ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" /> : <ArrowDownCircle className="h-3.5 w-3.5 mr-1.5" />)}
              Record Movement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(['in', 'out'] as const).map(t => (
              <button
                key={t}
                onClick={() => setMovementType(t)}
                className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  movementType === t
                    ? t === 'in' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t === 'in' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                Stock {t === 'in' ? 'In' : 'Out'}
              </button>
            ))}
          </div>

          {/* Item info */}
          {selectedItem && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="p-2 bg-blue-100 rounded-lg"><Package className="h-4 w-4 text-blue-600" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedItem.name}</p>
                <p className="text-xs text-gray-500">Current stock: <b>{selectedItem.quantity}</b> units</p>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
            <input
              type="number"
              min={1}
              value={movementQuantity || ''}
              onChange={e => setMovementQuantity(Number(e.target.value))}
              placeholder="Enter quantity"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
            <textarea
              value={movementReason}
              onChange={e => setMovementReason(e.target.value)}
              placeholder="Reason for movement…"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
            />
          </div>

          {/* Dispense to patient */}
          {movementType === 'out' && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isDispenseToPatient}
                  onChange={e => setIsDispenseToPatient(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Dispense to Patient</p>
                  <p className="text-xs text-gray-500">Creates a billable charge for the patient</p>
                </div>
                <ShoppingBag className="h-4 w-4 text-gray-400 ml-auto" />
              </label>

              {isDispenseToPatient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Patient</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search patients…"
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {filteredPatients.length === 0 ? (
                      <p className="p-3 text-sm text-gray-400 text-center">No patients found</p>
                    ) : filteredPatients.map(p => (
                      <button
                        key={p._id}
                        onClick={() => setSelectedPatientId(p._id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors border-b border-gray-100 last:border-0 ${
                          selectedPatientId === p._id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <User className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <span className="flex-1">{p.firstName} {p.lastName}</span>
                        <span className="text-xs text-gray-400">{p.patientId || 'N/A'}</span>
                        {selectedPatientId === p._id && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                  {isDispenseToPatient && !selectedPatientId && (
                    <p className="text-xs text-red-500 mt-1.5">Please select a patient to continue.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── QR Code Modal ────────────────────────────────────────────────── */}
      <Modal
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        title={`QR Code — ${selectedItem?.name}`}
        maxW="max-w-sm"
        footer={<Button size="sm" variant="outline" onClick={() => setQrDialogOpen(false)}>Close</Button>}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          {selectedItem && (
            <>
              <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-inner">
                <QRCode
                  value={JSON.stringify({ id: selectedItem._id, name: selectedItem.name, category: selectedItem.category })}
                  size={180}
                />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">{selectedItem.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{normalizeCategory(selectedItem.category)}</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">{selectedItem._id}</p>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
      <Modal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Item"
        maxW="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleDeleteItem} className="bg-red-600 hover:bg-red-700 text-white">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="p-4 bg-red-50 rounded-full">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <p className="text-gray-700">Are you sure you want to delete</p>
            <p className="font-semibold text-gray-900 mt-0.5">"{itemToDelete?.name}"?</p>
            <p className="text-sm text-gray-400 mt-2">This action cannot be undone.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StockManagement;
