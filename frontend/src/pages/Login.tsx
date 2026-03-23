import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSafeTheme } from '../hooks/useSafeTheme';
import { Moon, Sun, Eye, EyeOff } from 'lucide-react';
import { getClinicTenantId } from '../utils/authToken';

const LoginSchema = Yup.object().shape({
  email: Yup.string().required('Username or email is required'),
  password: Yup.string().min(3, 'Password must be at least 3 characters').required('Password is required'),
  clinicId: Yup.string().trim(),
});

const stats = [
  { value: '10K+', label: 'Patients Served' },
  { value: '50+', label: 'Staff Members' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, getRoleBasedRoute } = useAuth();
  const { isDarkMode, toggleTheme } = useSafeTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: { email: '', password: '', clinicId: getClinicTenantId() },
    validationSchema: LoginSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const tenant = (values.clinicId || 'default').trim() || 'default';
        const loggedInUser = await login(values.email, values.password, tenant);
        toast.success(`Welcome back, ${loggedInUser.firstName || loggedInUser.name}!`);
        const isAdmin =
          loggedInUser.role === 'admin' ||
          loggedInUser.role === 'super_admin' ||
          (loggedInUser.email && loggedInUser.email.toLowerCase().includes('admin')) ||
          (loggedInUser.username && loggedInUser.username.toLowerCase().includes('admin'));
        navigate(isAdmin ? '/app/dashboard' : getRoleBasedRoute(loggedInUser.role));
      } catch {
        // errors handled by AuthContext
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #020818 0%, #0a1628 40%, #0d1f3c 70%, #071320 100%)' }}>

      {/* ── Animated ambient orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)', animationDuration: '4s' }} />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)', animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] rounded-full animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)', animationDuration: '5s', animationDelay: '2s' }} />
        {/* Dot-grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        {/* ECG / heartbeat line */}
        <svg className="absolute bottom-0 left-0 w-full opacity-[0.06]" viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none">
          <polyline
            points="0,60 120,60 160,10 200,110 240,60 320,60 360,30 400,90 440,60 560,60 600,20 640,100 680,60 800,60 840,40 880,80 920,60 1040,60 1080,15 1120,105 1160,60 1280,60 1320,35 1360,85 1400,60 1440,60"
            stroke="rgba(56,189,248,1)" strokeWidth="2" fill="none"
          />
        </svg>
      </div>

      {/* ── Theme toggle ── */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-30 p-2.5 rounded-xl border transition-all duration-200 hover:scale-105"
        style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
        aria-label="Toggle dark mode"
      >
        {isDarkMode
          ? <Sun className="h-4 w-4 text-yellow-300" />
          : <Moon className="h-4 w-4 text-sky-300" />}
      </button>

      {/* ══════════════════════════════════════════════
          LEFT PANEL — branding
      ══════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between px-16 py-14 relative z-10">

        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-white/20 shadow-xl shadow-sky-500/10">
            <img
              src="/assets/images/logo.jpg"
              alt="New Life Clinic"
              className="h-full w-full object-cover"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = 'none';
                const p = el.parentElement;
                if (p) {
                  p.style.background = 'linear-gradient(135deg,#0ea5e9,#6366f1)';
                  p.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 m-auto mt-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4"/></svg>`;
                }
              }}
            />
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-tight tracking-tight">New Life Clinic</p>
            <p className="text-sky-400/70 text-xs font-medium tracking-wider uppercase mt-0.5">Healthcare Management System</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="space-y-8 max-w-[480px]">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide"
            style={{ background: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.3)', color: '#7dd3fc' }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Live System Active
          </div>

          <div>
            <h1 className="font-black text-white leading-[1.08] tracking-tighter" style={{ fontSize: 'clamp(2.8rem,4.2vw,4rem)' }}>
              Smarter Care,
            </h1>
            <h1 className="font-black leading-[1.08] tracking-tighter" style={{
              fontSize: 'clamp(2.8rem,4.2vw,4rem)',
              background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Better Outcomes.
            </h1>
            <p className="mt-5 text-slate-400 text-[0.96rem] leading-relaxed">
              A unified platform for your entire clinic — patient registration,<br />
              lab results, billing, and real-time monitoring.
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {stats.map(({ value, label }) => (
              <div key={label} className="rounded-2xl p-4 text-center border"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
                <p className="text-white font-extrabold text-xl leading-none">{value}</p>
                <p className="text-slate-500 text-[10px] mt-1.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Feature rows */}
          <div className="space-y-3">
            {[
              { color: '#0ea5e9', icon: '🩺', text: 'Full EMR with real-time patient records' },
              { color: '#6366f1', icon: '🔒', text: 'HIPAA-compliant data security & encryption' },
              { color: '#14b8a6', icon: '⚡', text: 'Instant alerts, vitals monitoring & billing' },
            ].map(({ color, icon, text }) => (
              <div key={text} className="flex items-center gap-3.5">
                <span className="text-base flex-shrink-0">{icon}</span>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }} />
                <p className="text-slate-400 text-xs text-right max-w-[240px]">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} New Life Clinic. All rights reserved.</p>
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT PANEL — form
      ══════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative z-10">

        {/* Glass card */}
        <div
          className="auth-login-card w-full max-w-[400px] rounded-3xl p-8 sm:p-10 space-y-8 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/20 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
              <img src="/assets/images/logo.jpg" alt="logo" className="h-full w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">New Life Clinic</p>
              <p className="text-sky-400/60 text-[10px]">Healthcare Management</p>
            </div>
          </div>

          {/* Heading */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" />
              <span className="text-sky-400 text-xs font-semibold uppercase tracking-widest">Secure Login</span>
            </div>
            <h2 className="text-white text-3xl font-extrabold tracking-tight">Welcome back</h2>
            <p className="text-slate-400 text-sm mt-1.5">Sign in to access your clinic dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={formik.handleSubmit} className="space-y-5">

            {/* Username field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="off"
                  placeholder="dr.smith or admin@clinic.com"
                  {...formik.getFieldProps('email')}
                  className="auth-login-input w-full h-12 pl-10 pr-4 text-sm rounded-xl outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#000000',
                    caretColor: '#000000',
                    WebkitTextFillColor: '#000000',
                    border: formik.touched.email && formik.errors.email
                      ? '1px solid rgba(248,113,113,0.6)'
                      : '1px solid rgba(255,255,255,0.09)',
                    boxShadow: formik.touched.email && !formik.errors.email && formik.values.email
                      ? '0 0 0 1px rgba(56,189,248,0.4)'
                      : 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(56,189,248,0.5)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.12)';
                    e.currentTarget.style.color = '#000000';
                    e.currentTarget.style.webkitTextFillColor = '#000000';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = formik.errors.email
                      ? '1px solid rgba(248,113,113,0.6)'
                      : '1px solid rgba(255,255,255,0.09)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.color = '#000000';
                    e.currentTarget.style.webkitTextFillColor = '#000000';
                    formik.handleBlur(e);
                  }}
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                  <span>⚠</span> {formik.errors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="off"
                  placeholder="Enter your password"
                  {...formik.getFieldProps('password')}
                  className="auth-login-input w-full h-12 pl-10 pr-11 text-sm rounded-xl outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#000000',
                    caretColor: '#000000',
                    WebkitTextFillColor: '#000000',
                    border: formik.touched.password && formik.errors.password
                      ? '1px solid rgba(248,113,113,0.6)'
                      : '1px solid rgba(255,255,255,0.09)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(56,189,248,0.5)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.12)';
                    e.currentTarget.style.color = '#000000';
                    e.currentTarget.style.webkitTextFillColor = '#000000';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = formik.errors.password
                      ? '1px solid rgba(248,113,113,0.6)'
                      : '1px solid rgba(255,255,255,0.09)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.color = '#000000';
                    e.currentTarget.style.webkitTextFillColor = '#000000';
                    formik.handleBlur(e);
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                  <span>⚠</span> {formik.errors.password}
                </p>
              )}
            </div>

            {/* Clinic / tenant (slug) — use "default" for legacy data; after migration use your clinic slug e.g. "clinic" */}
            <div className="space-y-1.5">
              <label htmlFor="clinicId" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Clinic code
              </label>
              <input
                id="clinicId"
                name="clinicId"
                type="text"
                autoComplete="off"
                placeholder="default"
                {...formik.getFieldProps('clinicId')}
                className="auth-login-input w-full h-11 px-4 text-sm rounded-xl outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#000000',
                  caretColor: '#000000',
                  WebkitTextFillColor: '#000000',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              />
              <p className="text-[10px] text-slate-500 leading-snug">
                Same as your clinic <strong className="text-slate-400">slug</strong> in Clinic Management. Leave <code className="text-sky-400/90">default</code> until you migrate old data.
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !formik.isValid || !formik.dirty}
              className="relative w-full h-12 rounded-xl text-white text-sm font-bold tracking-wide transition-all duration-300 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 focus:ring-offset-transparent mt-2"
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}
            >
              {/* Shimmer hover layer */}
              <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200 rounded-xl" />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-slate-600 text-xs">secured by</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Footer trust badges */}
          <div className="flex items-center justify-center gap-4">
            {['🔐 SSL Encrypted', '🛡 HIPAA Ready', '⚡ 99.9% Uptime'].map(badge => (
              <span key={badge} className="text-[10px] text-slate-600 font-medium">{badge}</span>
            ))}
          </div>

          <p className="text-center text-xs text-slate-600">
            Having trouble? Contact your{' '}
            <span className="text-sky-400/80 cursor-pointer hover:text-sky-300 transition-colors">system administrator</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
