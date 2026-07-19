import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Save, RefreshCw, Eye, EyeOff, Plus, Trash2, GripVertical,
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Loader2,
  Home, MessageSquare, HelpCircle, Users, Phone, Star, Activity,
  BarChart3, Layout, AlignLeft, Settings2
} from 'lucide-react';
import homeContentService, { HomeContent, DEFAULT_HOME_CONTENT } from '../../services/homeContentService';

// ── Utility helpers ───────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title, icon, children, defaultOpen = false
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-sm font-bold text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-blue-500">{icon}</span>
        <span className="flex-1">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 dark:border-slate-700/50">{children}</div>}
    </div>
  );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400 transition-colors ${props.className || ''}`}
  />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400 transition-colors resize-none ${props.className || ''}`}
  />
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
      checked
        ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'
    }`}
  >
    {checked ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
    {label}
  </button>
);

// ── Main Component ────────────────────────────────────────────────────────────

const HomeContentEditor: React.FC = () => {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load content on mount
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await homeContentService.getHomeContent();
      setContent(data);
      setDirty(false);
    } catch {
      toast.error('Failed to load home content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  const update = <K extends keyof HomeContent>(key: K, value: HomeContent[K]) => {
    setContent(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await homeContentService.updateHomeContent(content);
      setContent(saved);
      setDirty(false);
      toast.success('Home page content saved successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all home page content to defaults? This cannot be undone.')) return;
    setResetting(true);
    try {
      const fresh = await homeContentService.resetHomeContent();
      setContent(fresh);
      setDirty(false);
      toast.success('Content reset to defaults');
    } catch {
      toast.error('Failed to reset content');
    } finally {
      setResetting(false);
    }
  };

  // ── Array helpers ─────────────────────────────────────────────────────────

  const updateArrayItem = <T extends object>(key: keyof HomeContent, index: number, field: keyof T, value: any) => {
    const arr = [...(content[key] as T[])];
    arr[index] = { ...arr[index], [field]: value };
    update(key, arr as any);
  };

  const removeArrayItem = (key: keyof HomeContent, index: number) => {
    const arr = [...(content[key] as any[])];
    arr.splice(index, 1);
    update(key, arr as any);
  };

  const addArrayItem = (key: keyof HomeContent, template: object) => {
    const arr = [...(content[key] as any[])];
    arr.push({ ...template });
    update(key, arr as any);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-sm text-slate-500">Loading home content...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Home className="h-6 w-6 text-blue-500" />
            Home Page Editor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit all content shown on the public-facing clinic home page.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={handleReset}
            disabled={resetting || saving}
            className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`h-9 px-5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50 transition-all ${
              dirty ? 'bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-400'
            }`}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {dirty && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-2 rounded-xl flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
          You have unsaved changes. Click "Save Changes" to publish.
        </div>
      )}

      {/* ── Hero Section ── */}
      <Section title="Hero Section" icon={<Layout className="h-4 w-4" />} defaultOpen={true}>
        <Field label="Badge Text" hint="The small text above the main heading">
          <Input value={content.heroBadge} onChange={e => update('heroBadge', e.target.value)} placeholder="Accredited Private Clinic in Addis Ababa" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Hero Title (before highlight)">
            <Input value={content.heroTitle} onChange={e => update('heroTitle', e.target.value)} placeholder="Healthcare That Puts" />
          </Field>
          <Field label="Highlight Word(s)" hint="Shown in gradient blue-teal color">
            <Input value={content.heroHighlight} onChange={e => update('heroHighlight', e.target.value)} placeholder="Your Life" />
          </Field>
          <Field label="Title End">
            <Input value={content.heroTitleEnd} onChange={e => update('heroTitleEnd', e.target.value)} placeholder="First" />
          </Field>
        </div>
        <Field label="Subtitle / Description">
          <Textarea rows={3} value={content.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)} placeholder="Experience compassionate care..." />
        </Field>

        <Field label="Trust Badges" hint="Small checkmarked labels shown under the CTA buttons">
          <div className="space-y-2">
            {content.trustBadges.map((badge, i) => (
              <div key={i} className="flex gap-2">
                <Input value={badge} onChange={e => {
                  const arr = [...content.trustBadges];
                  arr[i] = e.target.value;
                  update('trustBadges', arr);
                }} placeholder={`Badge ${i + 1}`} />
                <button onClick={() => {
                  const arr = [...content.trustBadges];
                  arr.splice(i, 1);
                  update('trustBadges', arr);
                }} className="h-9 w-9 shrink-0 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => update('trustBadges', [...content.trustBadges, ''])}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 pt-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Badge
            </button>
          </div>
        </Field>
      </Section>

      {/* ── Stats ── */}
      <Section title="Statistics / Counters" icon={<BarChart3 className="h-4 w-4" />}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">The 5 stat boxes shown below the hero section.</p>
          <Toggle
            checked={content.useRealCounts}
            onChange={v => update('useRealCounts', v)}
            label={content.useRealCounts ? 'Using Real DB Counts' : 'Using Manual Values'}
          />
        </div>
        {content.useRealCounts && (
          <div className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-3 py-2 rounded-xl text-blue-700 dark:text-blue-300">
            <strong>Real DB Counts enabled:</strong> For stats with a "Dynamic Key" (doctors, patients, services), the value is automatically calculated from the database. Manual values are used for stats without a dynamic key (e.g., Satisfaction Rate, Clinic Experience).
          </div>
        )}
        <div className="space-y-3">
          {content.stats.map((stat, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <Input
                  value={stat.label}
                  onChange={e => updateArrayItem<typeof stat>('stats', i, 'label', e.target.value)}
                  placeholder="Label (e.g. Licensed Doctors)"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={stat.value}
                  onChange={e => updateArrayItem<typeof stat>('stats', i, 'value', e.target.value)}
                  placeholder="Value (e.g. 30+)"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={stat.dynamicKey || ''}
                  onChange={e => updateArrayItem<typeof stat>('stats', i, 'dynamicKey', e.target.value)}
                  placeholder="Dynamic key (optional)"
                />
              </div>
              <button onClick={() => removeArrayItem('stats', i)} className="col-span-1 h-9 w-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addArrayItem('stats', { label: '', value: '', dynamicKey: '' })}
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 pt-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add Stat
          </button>
        </div>
        <p className="text-[10px] text-slate-400">Dynamic keys: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">doctors</code> <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">patients</code> <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">services</code></p>
      </Section>

      {/* ── Why Choose Us ── */}
      <Section title="Why Choose Us" icon={<Star className="h-4 w-4" />}>
        <div className="space-y-4">
          {content.whyChooseUs.map((item, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2 bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={item.title}
                  onChange={e => updateArrayItem<typeof item>('whyChooseUs', i, 'title', e.target.value)}
                  placeholder="Feature title"
                />
                <button onClick={() => removeArrayItem('whyChooseUs', i)} className="h-9 w-9 shrink-0 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Textarea
                rows={2}
                value={item.desc}
                onChange={e => updateArrayItem<typeof item>('whyChooseUs', i, 'desc', e.target.value)}
                placeholder="Feature description"
              />
            </div>
          ))}
          <button
            onClick={() => addArrayItem('whyChooseUs', { title: '', desc: '' })}
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add Feature
          </button>
        </div>
      </Section>

      {/* ── Departments ── */}
      <Section title="Departments" icon={<Activity className="h-4 w-4" />}>
        <div className="space-y-3">
          {content.departments.map((dept, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2 bg-slate-50 dark:bg-slate-800">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <Input
                    value={dept.name}
                    onChange={e => updateArrayItem<typeof dept>('departments', i, 'name', e.target.value)}
                    placeholder="Department name"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    value={dept.count}
                    onChange={e => updateArrayItem<typeof dept>('departments', i, 'count', e.target.value)}
                    placeholder="Count (e.g. 12 Services)"
                  />
                </div>
                <button onClick={() => removeArrayItem('departments', i)} className="col-span-1 h-9 w-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Textarea
                rows={2}
                value={dept.desc}
                onChange={e => updateArrayItem<typeof dept>('departments', i, 'desc', e.target.value)}
                placeholder="Department description"
              />
            </div>
          ))}
          <button
            onClick={() => addArrayItem('departments', { name: '', desc: '', count: '' })}
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add Department
          </button>
        </div>
      </Section>

      {/* ── Patient Journey ── */}
      <Section title="Patient Journey Steps" icon={<AlignLeft className="h-4 w-4" />}>
        <div className="space-y-3">
          {content.patientJourney.map((step, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2 bg-slate-50 dark:bg-slate-800">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-1">
                  <Input
                    value={step.step}
                    onChange={e => updateArrayItem<typeof step>('patientJourney', i, 'step', e.target.value)}
                    placeholder="#"
                  />
                </div>
                <div className="col-span-9">
                  <Input
                    value={step.title}
                    onChange={e => updateArrayItem<typeof step>('patientJourney', i, 'title', e.target.value)}
                    placeholder="Step title"
                  />
                </div>
                <button onClick={() => removeArrayItem('patientJourney', i)} className="col-span-1 h-9 w-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors ml-auto">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Textarea
                rows={2}
                value={step.desc}
                onChange={e => updateArrayItem<typeof step>('patientJourney', i, 'desc', e.target.value)}
                placeholder="Step description"
              />
            </div>
          ))}
          <button
            onClick={() => addArrayItem('patientJourney', { step: String(content.patientJourney.length + 1), title: '', desc: '' })}
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add Step
          </button>
        </div>
      </Section>

      {/* ── Testimonials ── */}
      <Section title="Testimonials" icon={<MessageSquare className="h-4 w-4" />}>
        <div className="space-y-3">
          {content.testimonials.map((t, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2 bg-slate-50 dark:bg-slate-800">
              <div className="flex gap-2">
                <Input
                  value={t.author}
                  onChange={e => updateArrayItem<typeof t>('testimonials', i, 'author', e.target.value)}
                  placeholder="Author name"
                  className="flex-1"
                />
                <Input
                  value={t.role}
                  onChange={e => updateArrayItem<typeof t>('testimonials', i, 'role', e.target.value)}
                  placeholder="Role (e.g. Verified Patient)"
                  className="flex-1"
                />
                <button onClick={() => removeArrayItem('testimonials', i)} className="h-9 w-9 shrink-0 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Textarea
                rows={3}
                value={t.quote}
                onChange={e => updateArrayItem<typeof t>('testimonials', i, 'quote', e.target.value)}
                placeholder='Quote text (include quotation marks: "...")'
              />
            </div>
          ))}
          <button
            onClick={() => addArrayItem('testimonials', { quote: '', author: '', role: 'Verified Patient' })}
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add Testimonial
          </button>
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section title="FAQ (Frequently Asked Questions)" icon={<HelpCircle className="h-4 w-4" />}>
        <div className="space-y-3">
          {content.faqs.map((faq, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-600 space-y-2 bg-slate-50 dark:bg-slate-800">
              <div className="flex gap-2">
                <Input
                  value={faq.question}
                  onChange={e => updateArrayItem<typeof faq>('faqs', i, 'question', e.target.value)}
                  placeholder="Question"
                />
                <button onClick={() => removeArrayItem('faqs', i)} className="h-9 w-9 shrink-0 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Textarea
                rows={3}
                value={faq.answer}
                onChange={e => updateArrayItem<typeof faq>('faqs', i, 'answer', e.target.value)}
                placeholder="Answer"
              />
            </div>
          ))}
          <button
            onClick={() => addArrayItem('faqs', { question: '', answer: '' })}
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add FAQ
          </button>
        </div>
      </Section>

      {/* ── Contact Info ── */}
      <Section title="Contact Information" icon={<Phone className="h-4 w-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Address">
            <Input value={content.contactAddress} onChange={e => update('contactAddress', e.target.value)} placeholder="Clinic address" />
          </Field>
          <Field label="Phone Number">
            <Input value={content.contactPhone} onChange={e => update('contactPhone', e.target.value)} placeholder="+251..." />
          </Field>
          <Field label="Email Address">
            <Input type="email" value={content.contactEmail} onChange={e => update('contactEmail', e.target.value)} placeholder="clinic@example.com" />
          </Field>
        </div>

        <Field label="Working Hours">
          <div className="space-y-2">
            {content.workingHours.map((wh, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={wh.day}
                  onChange={e => updateArrayItem<typeof wh>('workingHours', i, 'day', e.target.value)}
                  placeholder="Day(s) (e.g. Monday – Friday)"
                  className="flex-1"
                />
                <Input
                  value={wh.time}
                  onChange={e => updateArrayItem<typeof wh>('workingHours', i, 'time', e.target.value)}
                  placeholder="Time (e.g. 8:00 AM – 8:00 PM)"
                  className="flex-1"
                />
                <button onClick={() => removeArrayItem('workingHours', i)} className="h-9 w-9 shrink-0 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('workingHours', { day: '', time: '' })}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 pt-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Hours Row
            </button>
          </div>
        </Field>
      </Section>

      {/* ── Visibility ── */}
      <Section title="Section Visibility" icon={<Settings2 className="h-4 w-4" />}>
        <p className="text-xs text-slate-500">Toggle which sections are shown on the home page.</p>
        <div className="flex flex-wrap gap-3">
          <Toggle checked={content.showDoctors} onChange={v => update('showDoctors', v)} label="Our Doctors" />
          <Toggle checked={content.showPackages} onChange={v => update('showPackages', v)} label="Health Packages" />
          <Toggle checked={content.showTestimonials} onChange={v => update('showTestimonials', v)} label="Testimonials" />
          <Toggle checked={content.showFaq} onChange={v => update('showFaq', v)} label="FAQ Section" />
          <Toggle checked={content.showContactForm} onChange={v => update('showContactForm', v)} label="Contact Form" />
        </div>
      </Section>

      {/* ── Sticky Save Bar ── */}
      {dirty && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-11 px-6 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-xl shadow-blue-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default HomeContentEditor;
