import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSafeTheme } from '../hooks/useSafeTheme';
import { Moon, Sun, Eye, EyeOff } from 'lucide-react';
import { getClinicTenantId } from '../utils/authToken';
import api from '../services/apiService';

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

// Cold-start warm-up: max 5 minutes in 1-second ticks
const WARMUP_MAX_SECONDS = 300;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, getRoleBasedRoute } = useAuth();
  const { isDarkMode, toggleTheme } = useSafeTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupSeconds, setWarmupSeconds] = useState(0);
  const warmupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up the warm-up timer on unmount
  useEffect(() => {
    return () => {
      if (warmupTimerRef.current) clearInterval(warmupTimerRef.current);
    };
  }, []);

  const startWarmup = () => {
    setIsWarmingUp(true);
    setWarmupSeconds(0);
    if (warmupTimerRef.current) clearInterval(warmupTimerRef.current);
    warmupTimerRef.current = setInterval(() => {
      setWarmupSeconds(s => s + 1);
    }, 1000);
  };

  const stopWarmup = () => {
    setIsWarmingUp(false);
    setWarmupSeconds(0);
    if (warmupTimerRef.current) {
      clearInterval(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
  };

  // Treat as a warm-up/retry situation: genuine timeouts OR backend 503 database_unavailable
  const isWarmupError = (err: any): boolean => {
    if (err?.name === 'TimeoutError') return true;
    if (typeof err?.message === 'string' && err.message.toLowerCase().includes('timeout')) return true;
    // 503 with database_unavailable means Atlas isn't connected yet
    const responseData = err?.response?.data ?? err?.data;
    if (responseData?.error === 'database_unavailable') return true;
    if (err?.status === 503 || err?.response?.status === 503) return true;
    if (typeof err?.message === 'string' && err.message.toLowerCase().includes('database unavailable')) return true;
    return false;
  };

  const savedClinicId = getClinicTenantId();
  const hasRememberedClinic = savedClinicId && savedClinicId !== 'default';
  const [showClinicField, setShowClinicField] = useState(!hasRememberedClinic);

  const formik = useFormik({
    initialValues: { email: '', password: '', clinicId: savedClinicId },
    validationSchema: LoginSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const tenant = (values.clinicId || '').trim() || 'default';
        const loggedInUser = await login(values.email, values.password, tenant);
        stopWarmup();
        toast.success(`Welcome back, ${loggedInUser.firstName || loggedInUser.name}!`);
        const isAdmin =
          loggedInUser.role === 'admin' ||
          loggedInUser.role === 'super_admin' ||
          (loggedInUser.email && loggedInUser.email.toLowerCase().includes('admin')) ||
          (loggedInUser.username && loggedInUser.username.toLowerCase().includes('admin'));
        navigate(isAdmin ? '/app/dashboard' : getRoleBasedRoute(loggedInUser.role));
      } catch (err: any) {
        if (isWarmupError(err)) {
          // Server/DB cold-start: show warming banner and auto-retry every 8s
          if (!isWarmingUp) {
            startWarmup();
            toast.loading('Server is warming up… retrying automatically.', { duration: 6000 });
          }
          setTimeout(() => formik.submitForm(), 8000);
        }
        // other errors (wrong password, etc.) handled by AuthContext
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 12% 18%, rgba(59,130,246,0.32), transparent 40%), radial-gradient(circle at 85% 75%, rgba(14,165,233,0.18), transparent 45%), linear-gradient(140deg, #020617 0%, #050d1e 50%, #081126 100%)' }} />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.22) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <img
          src="/assets/images/logo.jpg"
          alt=""
          aria-hidden="true"
          className="hidden lg:block absolute left-[6%] top-1/2 -translate-y-1/2 w-[520px] h-[520px] object-cover rounded-full opacity-[0.055] blur-[1px]"
        />
        <img
          src="/assets/images/logo.jpg"
          alt=""
          aria-hidden="true"
          className="absolute -right-20 -bottom-20 w-[280px] h-[280px] object-cover rounded-full opacity-[0.05] blur-[1px]"
        />
      </div>

      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-30 p-2.5 rounded-xl border transition-all duration-200 hover:scale-105"
        style={{ background: 'rgba(15,23,42,0.65)', borderColor: 'rgba(148,163,184,0.35)', backdropFilter: 'blur(10px)' }}
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-cyan-300" />}
      </button>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.2fr_0.9fr]">
        <section className="hidden lg:flex flex-col justify-between px-14 py-12">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-cyan-200">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
              <span className="text-xs font-semibold tracking-[0.12em] uppercase">Clinical Operations Ready</span>
            </div>

            <div>
              <p className="text-slate-300/80 text-sm uppercase tracking-[0.2em] mb-4">New Life Clinic Platform</p>
              <h1 className="text-white font-black leading-[1.02] tracking-tight text-[clamp(3rem,4.7vw,4.8rem)]">
                A brand-new
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300">
                  login experience
                </span>
              </h1>
              <p className="mt-6 text-slate-300/85 max-w-[560px] text-[15px] leading-relaxed">
                Designed for modern care teams with faster access, cleaner visuals, and a focused sign-in flow that keeps staff moving.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-[520px]">
              {stats.map(({ value, label }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
                  <p className="text-cyan-200 font-extrabold text-2xl">{value}</p>
                  <p className="text-slate-300/70 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400/80">© {new Date().getFullYear()} New Life Clinic. Built for better outcomes.</div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div
            className="auth-login-card w-full max-w-[440px] rounded-3xl p-7 sm:p-9 space-y-7"
            style={{
              background: 'linear-gradient(170deg, rgba(8,15,33,0.94) 0%, rgba(11,24,48,0.94) 60%, rgba(7,16,34,0.94) 100%)',
              border: '1px solid rgba(148,163,184,0.28)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 30px 90px rgba(2,6,23,0.7)',
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
              <div className="h-0.5 w-10 rounded-full bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300" />
              <span className="text-cyan-300 text-xs font-semibold uppercase tracking-widest">Secure Sign In</span>
            </div>
            <h2 className="text-white text-[2rem] sm:text-[2.2rem] font-extrabold tracking-tight">Welcome back</h2>
            <p className="text-slate-300/75 text-[13px] mt-1.5">Sign in to continue to your clinic workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={formik.handleSubmit} className="space-y-5">

            {/* Username field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
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
                  className="auth-login-input w-full h-12 pl-10 pr-4 text-sm rounded-xl outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-300/25"
                  style={{
                    background: 'rgba(15,23,42,0.75)',
                    color: '#f8fafc',
                    caretColor: '#f8fafc',
                    WebkitTextFillColor: '#f8fafc',
                    border: formik.touched.email && formik.errors.email
                      ? '1px solid rgba(248,113,113,0.6)'
                      : '1px solid rgba(148,163,184,0.28)',
                    boxShadow: formik.touched.email && !formik.errors.email && formik.values.email
                      ? '0 0 0 1px rgba(103,232,249,0.5)'
                      : 'none',
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = formik.errors.email
                      ? '1px solid rgba(248,113,113,0.6)'
                      : '1px solid rgba(148,163,184,0.28)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.color = '#f8fafc';
                    e.currentTarget.style.webkitTextFillColor = '#f8fafc';
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
            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
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
                  className="auth-login-input w-full h-12 pl-10 pr-11 text-sm rounded-xl outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-300/25"
                  style={{
                    background: 'rgba(15,23,42,0.75)',
                    color: '#f8fafc',
                    caretColor: '#f8fafc',
                    WebkitTextFillColor: '#f8fafc',
                    border: formik.touched.password && formik.errors.password
                      ? '1px solid rgba(248,113,113,0.6)'
                      : '1px solid rgba(148,163,184,0.28)',
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = formik.errors.password
                      ? '1px solid rgba(248,113,113,0.6)'
                      : '1px solid rgba(148,163,184,0.28)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.color = '#f8fafc';
                    e.currentTarget.style.webkitTextFillColor = '#f8fafc';
                    formik.handleBlur(e);
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition-colors"
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

            {/* Clinic code — remembered after first login; collapsible for returning users */}
            {showClinicField ? (
              <div className="space-y-2">
                <label htmlFor="clinicId" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Clinic code
                </label>
                <input
                  id="clinicId"
                  name="clinicId"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. clinicnew"
                  {...formik.getFieldProps('clinicId')}
                  className="auth-login-input w-full h-11 px-4 text-sm rounded-xl outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-300/25"
                  style={{
                    background: 'rgba(15,23,42,0.75)',
                    color: '#f8fafc',
                    caretColor: '#f8fafc',
                    WebkitTextFillColor: '#f8fafc',
                    border: '1px solid rgba(148,163,184,0.28)',
                  }}
                />
                <p className="text-[10px] text-slate-400/80 leading-snug">
                  Your clinic <strong className="text-slate-200">slug</strong> from Clinic Management. Leave blank if unsure.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClinicField(true)}
                className="text-xs text-cyan-300/80 hover:text-cyan-200 transition-colors"
              >
                Change clinic ({savedClinicId})
              </button>
            )}

            {/* Cold-start warming banner */}
            {isWarmingUp && (
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}
              >
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 flex-shrink-0" style={{ color: '#fbbf24' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-xs font-semibold" style={{ color: '#fcd34d' }}>
                    Server is waking up — please wait ({warmupSeconds}s)
                  </p>
                </div>
                <p className="text-[10px] leading-snug" style={{ color: 'rgba(253,211,77,0.65)' }}>
                  The server was asleep to save resources. It will be ready in &lt;2 minutes.
                  Login will retry automatically.
                </p>
                {/* Progress bar */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(251,191,36,0.15)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min((warmupSeconds / WARMUP_MAX_SECONDS) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || isWarmingUp || !formik.isValid || !formik.dirty}
              className="relative w-full h-12 rounded-xl text-slate-950 text-sm font-bold tracking-wide transition-all duration-300 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-300/50 focus:ring-offset-2 focus:ring-offset-transparent mt-2"
              style={{ background: 'linear-gradient(90deg, #67e8f9 0%, #93c5fd 50%, #a5b4fc 100%)', boxShadow: '0 8px 24px rgba(6,182,212,0.35)' }}
            >
              {/* Shimmer hover layer */}
              <span className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-200 rounded-xl" />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : isWarmingUp ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Waiting for server…
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
            <div className="flex-1 h-px bg-slate-700/60" />
            <span className="text-slate-400 text-xs">secured by</span>
            <div className="flex-1 h-px bg-slate-700/60" />
          </div>

          {/* Footer trust badges */}
          <div className="flex items-center justify-center gap-3">
            {['SSL Encrypted', 'HIPAA Ready', '99.9% Uptime'].map(badge => (
              <span key={badge} className="text-[10px] text-slate-400 font-medium">{badge}</span>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400">
            Having trouble? Contact your{' '}
            <span className="text-cyan-300/80 cursor-pointer hover:text-cyan-200 transition-colors">system administrator</span>.
          </p>
        </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
