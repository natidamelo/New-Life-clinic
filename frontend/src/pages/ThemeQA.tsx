import React, { useState } from 'react';
import { useTheme, colorThemes } from '../context/EnhancedThemeContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Skeleton } from '../components/ui/skeleton';
import {
  Sun, Moon, Monitor, Palette, Check, AlertCircle, Info,
  CheckCircle2, XCircle, AlertTriangle, Inbox, Loader2, RefreshCw,
} from 'lucide-react';

// ─── Mini Swatch picker that works inline ───────────────────────────────────
const InlineThemePicker: React.FC = () => {
  const { colorTheme, themeMode, setColorTheme, setThemeMode, isDarkMode } = useTheme();

  const quickSwatches = [
    { value: 'navy',        color: '#1E3A5F', label: 'Navy' },
    { value: 'indigo',      color: '#6366F1', label: 'Indigo' },
    { value: 'teal',        color: '#0D9488', label: 'Teal' },
    { value: 'aqua',        color: '#38B2AC', label: 'Aqua' },
    { value: 'forest-green',color: '#166534', label: 'Forest' },
    { value: 'rose',        color: '#F9A8D4', label: 'Rose' },
    { value: 'pink',        color: '#EC4899', label: 'Pink' },
    { value: 'gold',        color: '#D97706', label: 'Gold' },
    { value: 'orange',      color: '#F97316', label: 'Orange' },
    { value: 'purple',      color: '#9333EA', label: 'Purple' },
    { value: 'maroon',      color: '#881337', label: 'Maroon' },
    { value: 'charcoal',    color: '#374151', label: 'Charcoal' },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Mode buttons */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        {([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']] as const).map(
          ([mode, Icon, label]) => (
            <button
              key={mode}
              id={`theme-qa-mode-${mode}`}
              onClick={() => setThemeMode(mode)}
              title={label}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors
                ${themeMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              <Icon size={12} />
              {label}
            </button>
          )
        )}
      </div>

      {/* Accent swatches */}
      <div className="flex flex-wrap gap-1.5">
        {quickSwatches.map(({ value, color, label }) => (
          <button
            key={value}
            id={`theme-qa-swatch-${value}`}
            title={label}
            onClick={() => setColorTheme(value as any)}
            style={{ backgroundColor: color }}
            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
              ${colorTheme === value ? 'border-foreground scale-110' : 'border-transparent'}`}
          />
        ))}
      </div>

      <span className="ml-auto text-xs text-muted-foreground">
        Active: <code className="font-mono text-primary">{colorTheme}</code> / {isDarkMode ? 'dark' : 'light'}
      </span>
    </div>
  );
};

// ─── Section wrapper ─────────────────────────────────────────────────────────
const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="space-y-4">
    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
      {title}
    </h2>
    {children}
  </section>
);

// ─── Main QA page ────────────────────────────────────────────────────────────
const ThemeQA: React.FC = () => {
  const [switchOn, setSwitchOn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectVal, setSelectVal] = useState('');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur px-6 py-3 shadow-sm">
        <div className="mx-auto max-w-6xl">
          <div className="mb-1 flex items-center gap-2">
            <Palette size={18} className="text-primary" />
            <h1 className="text-base font-bold text-foreground">Theme QA</h1>
            <Badge variant="outline" className="ml-1 text-xs">All shared components</Badge>
          </div>
          <InlineThemePicker />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-8">

        {/* ── 1. Buttons ── */}
        <Section id="qa-buttons" title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button id="qa-btn-default">Default</Button>
            <Button id="qa-btn-secondary" variant="secondary">Secondary</Button>
            <Button id="qa-btn-destructive" variant="destructive">Destructive</Button>
            <Button id="qa-btn-outline" variant="outline">Outline</Button>
            <Button id="qa-btn-ghost" variant="ghost">Ghost</Button>
            <Button id="qa-btn-link" variant="link">Link</Button>
            <Button id="qa-btn-disabled" disabled>Disabled</Button>
            <Button id="qa-btn-loading" disabled>
              <Loader2 size={14} className="animate-spin" />
              Loading…
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button id="qa-btn-sm" size="sm">Small</Button>
            <Button id="qa-btn-md">Medium</Button>
            <Button id="qa-btn-lg" size="lg">Large</Button>
          </div>
        </Section>

        {/* ── 2. Badges ── */}
        <Section id="qa-badges" title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge id="qa-badge-default">Default</Badge>
            <Badge id="qa-badge-secondary" variant="secondary">Secondary</Badge>
            <Badge id="qa-badge-destructive" variant="destructive">Destructive</Badge>
            <Badge id="qa-badge-outline" variant="outline">Outline</Badge>
            {/* Semantic colour badges */}
            <span id="qa-badge-success" className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-success)] bg-[color:var(--color-success)]/10 px-2 py-0.5 text-xs font-medium text-[color:var(--color-success)]">
              <CheckCircle2 size={11} /> Success
            </span>
            <span id="qa-badge-warning" className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-warning)] bg-[color:var(--color-warning)]/10 px-2 py-0.5 text-xs font-medium text-[color:var(--color-warning)]">
              <AlertTriangle size={11} /> Warning
            </span>
            <span id="qa-badge-danger" className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 px-2 py-0.5 text-xs font-medium text-[color:var(--color-danger)]">
              <XCircle size={11} /> Danger
            </span>
            <span id="qa-badge-info" className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-info)] bg-[color:var(--color-info)]/10 px-2 py-0.5 text-xs font-medium text-[color:var(--color-info)]">
              <Info size={11} /> Info
            </span>
          </div>
        </Section>

        {/* ── 3. Cards ── */}
        <Section id="qa-cards" title="Cards">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card id="qa-card-basic">
              <CardHeader><CardTitle>Patient Card</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Dr. Natan Kinfe · ID #00142</p>
                <p className="mt-2 text-2xl font-bold text-foreground">ETB 4,280</p>
                <p className="text-xs text-muted-foreground">Outstanding balance</p>
              </CardContent>
            </Card>
            <Card id="qa-card-accent" className="border-primary/30 bg-[color:var(--color-primary-subtle)]">
              <CardHeader><CardTitle className="text-primary">Active Theme</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">This card uses <code className="font-mono text-xs">--color-primary-subtle</code></p>
                <Button className="mt-3" size="sm">Primary CTA</Button>
              </CardContent>
            </Card>
            <Card id="qa-card-muted" className="bg-muted">
              <CardHeader><CardTitle>Muted Surface</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Reads <code className="font-mono text-xs">hsl(var(--muted))</code></p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ── 4. Table row ── */}
        <Section id="qa-table" title="Table Row">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Patient', 'Status', 'Date', 'Amount', 'Action'].map(h => (
                      <th key={h} className="border-b border-border px-4 py-2 text-left font-medium text-muted-foreground bg-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Hana Tesfaye', status: 'Active',     date: '2026-07-05', amount: 'ETB 1,200' },
                    { name: 'Yonas Bekele', status: 'Discharged', date: '2026-07-04', amount: 'ETB 4,800' },
                    { name: 'Sara Girma',   status: 'Pending',    date: '2026-07-03', amount: 'ETB 600'   },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-border transition-colors hover:bg-accent/30">
                      <td className="px-4 py-2 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-2">
                        <Badge id={`qa-table-status-${i}`}
                          variant={row.status === 'Active' ? 'default' : row.status === 'Discharged' ? 'secondary' : 'outline'}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{row.date}</td>
                      <td className="px-4 py-2 font-mono text-foreground">{row.amount}</td>
                      <td className="px-4 py-2">
                        <Button id={`qa-table-action-${i}`} size="sm" variant="outline">View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </Section>

        {/* ── 5. Form fields ── */}
        <Section id="qa-forms" title="Form Fields">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="qa-input-text">Text Input</Label>
              <Input id="qa-input-text" placeholder="e.g. Patient name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qa-select">Select</Label>
              <Select value={selectVal} onValueChange={setSelectVal}>
                <SelectTrigger id="qa-select"><SelectValue placeholder="Choose a department…" /></SelectTrigger>
                <SelectContent>
                  {['Outpatient', 'Inpatient', 'Lab', 'Imaging', 'MCH'].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="qa-textarea">Textarea</Label>
              <Textarea id="qa-textarea" placeholder="Clinical notes…" rows={3} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch id="qa-switch" checked={switchOn} onCheckedChange={setSwitchOn} />
                <Label htmlFor="qa-switch">Toggle ({switchOn ? 'On' : 'Off'})</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="qa-checkbox" checked={checked} onCheckedChange={v => setChecked(Boolean(v))} />
                <Label htmlFor="qa-checkbox">Consent checkbox ({checked ? 'Checked' : 'Unchecked'})</Label>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 6. Nav items ── */}
        <Section id="qa-nav" title="Navigation Items">
          <Card>
            <CardContent className="py-3">
              <nav className="flex flex-col gap-1">
                {[
                  { label: 'Dashboard',    active: true  },
                  { label: 'My Patients',  active: false },
                  { label: 'Appointments', active: false },
                  { label: 'Reports',      active: false },
                ].map(({ label, active }) => (
                  <div key={label}
                    id={`qa-nav-${label.replace(/\s/g, '-').toLowerCase()}`}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium cursor-default transition-colors
                      ${active
                        ? 'bg-[color:var(--color-primary-subtle)] text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                  >
                    <Check size={14} className={active ? 'text-primary' : 'opacity-0'} />
                    {label}
                    {active && <Badge className="ml-auto" variant="default">Active</Badge>}
                  </div>
                ))}
              </nav>
            </CardContent>
          </Card>
        </Section>

        {/* ── 7. Modal / Dialog ── */}
        <Section id="qa-modal" title="Modal / Dialog">
          <div className="flex gap-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button id="qa-dialog-trigger" variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent id="qa-dialog-content">
                <DialogHeader>
                  <DialogTitle>Theme-Aware Dialog</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  This dialog background is <code className="font-mono">hsl(var(--card))</code> and its border is <code className="font-mono">hsl(var(--border))</code>.
                  Both update when you switch accent or mode.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button id="qa-tooltip-trigger" variant="secondary">Hover for tooltip</Button>
                </TooltipTrigger>
                <TooltipContent id="qa-tooltip-content">
                  <p>Theme-aware tooltip</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Section>

        {/* ── 8. Tabs ── */}
        <Section id="qa-tabs" title="Tabs">
          <Tabs defaultValue="overview">
            <TabsList id="qa-tabs-list">
              <TabsTrigger id="qa-tab-overview"    value="overview">Overview</TabsTrigger>
              <TabsTrigger id="qa-tab-analytics"   value="analytics">Analytics</TabsTrigger>
              <TabsTrigger id="qa-tab-settings"    value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Overview tab content — surfaces use <code className="font-mono">--card</code>.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Analytics content.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Settings content.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Section>

        {/* ── 9. Skeletons / Loading ── */}
        <Section id="qa-skeletons" title="Loading Skeletons">
          <div className="space-y-3">
            <Skeleton id="qa-skeleton-title" className="h-6 w-48" />
            <Skeleton id="qa-skeleton-line1" className="h-4 w-full" />
            <Skeleton id="qa-skeleton-line2" className="h-4 w-3/4" />
            <div className="flex gap-3">
              <Skeleton id="qa-skeleton-avatar" className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── 10. Empty state ── */}
        <Section id="qa-empty" title="Empty State">
          <Card id="qa-empty-card">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-primary-subtle)]">
                <Inbox size={24} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">No records found</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Try adjusting your search or date range. New records will appear here as they are created.
              </p>
              <Button id="qa-empty-action" variant="outline" size="sm">
                <RefreshCw size={14} />
                Refresh
              </Button>
            </CardContent>
          </Card>
        </Section>

        {/* ── 11. Error state ── */}
        <Section id="qa-error" title="Error State">
          <Card id="qa-error-card" className="border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle size={20} className="text-[color:var(--color-danger)] flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Failed to load data</p>
                <p className="text-sm text-muted-foreground">Connection to the server timed out. Please try again.</p>
              </div>
              <Button id="qa-error-action" variant="destructive" size="sm" className="ml-auto">Retry</Button>
            </CardContent>
          </Card>
        </Section>

        {/* ── 12. CSS variable live readout ── */}
        <Section id="qa-tokens" title="Live Token Readout">
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-2 text-xs font-mono sm:grid-cols-2">
                {[
                  ['--color-primary',      'Primary accent'],
                  ['--color-surface',      'Page surface'],
                  ['--color-surface-alt',  'Card surface'],
                  ['--color-border',       'Border'],
                  ['--color-text',         'Body text'],
                  ['--color-text-muted',   'Muted text'],
                  ['--color-success',      'Success'],
                  ['--color-danger',       'Danger'],
                  ['--color-warning',      'Warning'],
                  ['--color-info',         'Info'],
                ].map(([token, label]) => (
                  <div key={token} className="flex items-center gap-2 rounded border border-border bg-muted/40 px-2 py-1">
                    <div
                      style={{ background: `var(${token})` }}
                      className="h-4 w-4 flex-shrink-0 rounded border border-border"
                    />
                    <span className="text-muted-foreground flex-1">{label}</span>
                    <code className="text-foreground">{token}</code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Section>

      </div>
    </div>
  );
};

export default ThemeQA;
