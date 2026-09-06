import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Clock, Star, Stethoscope, ArrowRight,
  CheckCircle, Check, Search, Sparkles, FileText,
  Activity, Pill, AlertCircle, Brain, Calendar, QrCode, Users
} from 'lucide-react';

const QUICK_SHORTCUTS = [
  { icon: Heart,       label: 'Cardiology',  key: 'consultation' },
  { icon: Users,       label: 'Pediatrics',  key: 'consultation' },
  { icon: Sparkles,    label: 'Dental',      key: 'procedure'    },
  { icon: FileText,    label: 'Radiology',   key: 'imaging'      },
  { icon: Activity,    label: 'Laboratory',  key: 'lab'          },
  { icon: Pill,        label: 'Pharmacy',    key: 'pharmacy'     },
  { icon: AlertCircle, label: 'Emergency',   key: 'emergency'    },
  { icon: Brain,       label: 'Neurology',   key: 'consultation' },
];

interface HeroSectionProps {
  heroTitle: string;
  heroHighlight: string;
  heroTitleEnd: string;
  heroSubtitle: string;
  heroBadge: string;
  trustBadges: string[];
  stats: { label: string; value: string }[];
  heroSearch: string;
  setHeroSearch: (v: string) => void;
  setServicesSearch: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  onNavigateTab: (tab: 'services' | 'packages' | 'appointment' | 'card' | 'login', details?: any) => void;
  parallax: { x: number; y: number };
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  heroTitle,
  heroHighlight,
  heroTitleEnd,
  heroSubtitle,
  heroBadge,
  trustBadges,
  stats,
  heroSearch,
  setHeroSearch,
  setServicesSearch,
  setSelectedCategory,
  onNavigateTab,
  parallax,
  onMouseMove,
  onMouseLeave,
}) => {
  return (
    <>
      {/* ─── HERO STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ecgScroll {
          to { stroke-dashoffset: -1000; }
        }
        .animate-ecg-hero {
          stroke-dasharray: 200 40;
          animation: ecgScroll 18s linear infinite;
        }
        @keyframes heartbeatHero {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.18); }
          40% { transform: scale(1); }
          55% { transform: scale(1.18); }
        }
        .animate-heartbeat-hero { animation: heartbeatHero 2s infinite ease-in-out; }

        @keyframes waveFloatHero {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        .float-a-hero { animation: waveFloatHero 4.5s ease-in-out infinite; }
        .float-b-hero { animation: waveFloatHero 5.2s ease-in-out infinite 0.8s; }
        .float-c-hero { animation: waveFloatHero 3.9s ease-in-out infinite 0.4s; }
        .float-d-hero { animation: waveFloatHero 4.8s ease-in-out infinite 1.2s; }
        .float-e-hero { animation: waveFloatHero 5.5s ease-in-out infinite 0.2s; }

        @keyframes rotateSlowHero {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .rotate-slow-hero     { animation: rotateSlowHero 18s linear infinite; }
        .rotate-slow-rev-hero { animation: rotateSlowHero 24s linear infinite reverse; }

        @keyframes pulseRingHero {
          0%   { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
          70%  { box-shadow: 0 0 0 10px rgba(52,211,153,0); }
          100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
        }
        .pulse-ring-hero { animation: pulseRingHero 2s ease-out infinite; }

        @keyframes progressFillHero {
          from { width: 0%; }
          to   { width: var(--fill); }
        }
        .progress-fill-hero { animation: progressFillHero 2s cubic-bezier(.22,.68,0,1.2) 1.2s both; }

        @keyframes particleDriftHero {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.35; }
          50%       { transform: translateY(-18px) translateX(8px) scale(1.1); opacity: 0.65; }
        }
        .particle-hero { animation: particleDriftHero var(--dur,8s) ease-in-out infinite; }

        @keyframes fadeInUpHero {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeftHero {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRightHero {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .anim-left-hero  { animation: slideInLeftHero  0.7s cubic-bezier(.22,.68,0,1.2) both; }
        .anim-right-hero { animation: slideInRightHero 0.7s cubic-bezier(.22,.68,0,1.2) both; }
        .anim-up-hero    { animation: fadeInUpHero     0.6s cubic-bezier(.22,.68,0,1.2) both; }
        .h-anim-d1 { animation-delay: 0.05s; }
        .h-anim-d2 { animation-delay: 0.15s; }
        .h-anim-d3 { animation-delay: 0.25s; }
        .h-anim-d4 { animation-delay: 0.35s; }
        .h-anim-d5 { animation-delay: 0.45s; }
        .h-anim-d6 { animation-delay: 0.55s; }

        .hero-widget {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .hero-stat-pill {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          backdrop-filter: blur(10px);
        }
        .hero-search {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(14px);
        }
        .hero-shortcut {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          transition: all 0.2s;
        }
        .hero-shortcut:hover {
          background: rgba(59,130,246,0.28);
          border-color: rgba(59,130,246,0.45);
          transform: translateY(-2px);
        }
        .cta-main {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 8px 32px rgba(37,99,235,0.40), inset 0 1px 0 rgba(255,255,255,0.14);
          transition: all 0.25s;
        }
        .cta-main:hover {
          box-shadow: 0 14px 40px rgba(37,99,235,0.55), inset 0 1px 0 rgba(255,255,255,0.2);
          transform: translateY(-2px) scale(1.02);
        }
        .cta-ghost {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.16);
          transition: all 0.25s;
        }
        .cta-ghost:hover {
          background: rgba(255,255,255,0.13);
          transform: translateY(-2px);
        }
        .cta-card {
          background: rgba(52,211,153,0.10);
          border: 1px solid rgba(52,211,153,0.28);
          transition: all 0.25s;
        }
        .cta-card:hover {
          background: rgba(52,211,153,0.18);
          transform: translateY(-2px);
        }
      `}} />

      {/* ─── HERO SECTION ─── */}
      <section
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="relative w-full min-h-screen flex flex-col overflow-hidden select-none"
        style={{ background: 'linear-gradient(135deg,#071020 0%,#0c1f45 35%,#091a38 65%,#050d1a 100%)' }}
      >
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }}
        />

        {/* Radial glow blobs */}
        <div className="absolute -top-20 -left-20 w-[650px] h-[650px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 -right-24 w-[550px] h-[550px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 left-1/2 w-[350px] h-[350px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)' }} />

        {/* Floating particles */}
        {[
          { s: 6,  top: '15%', left: '7%',  dur: '7s',   del: '0s'   },
          { s: 4,  top: '68%', left: '11%', dur: '9.5s', del: '1.5s' },
          { s: 7,  top: '30%', left: '90%', dur: '6.5s', del: '0.5s' },
          { s: 5,  top: '78%', left: '82%', dur: '8s',   del: '2s'   },
          { s: 3,  top: '52%', left: '54%', dur: '10s',  del: '3s'   },
          { s: 5,  top: '12%', left: '72%', dur: '7.5s', del: '1s'   },
        ].map((p, i) => (
          <div key={i} className="absolute rounded-full bg-blue-400/25 particle-hero pointer-events-none"
            style={{ width: p.s, height: p.s, top: p.top, left: p.left, '--dur': p.dur, animationDelay: p.del } as React.CSSProperties}
          />
        ))}

        {/* Rotating rings – top-right corner */}
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] pointer-events-none opacity-[0.08]">
          <div className="absolute inset-0 border border-blue-400 rounded-full rotate-slow-hero" />
          <div className="absolute inset-8 border border-cyan-300/60 rounded-full rotate-slow-rev-hero" />
          <div className="absolute inset-16 border border-indigo-300/40 rounded-full rotate-slow-hero" style={{ animationDuration: '32s' }} />
        </div>

        {/* ECG line */}
        <div className="absolute left-0 right-0 top-[55%] opacity-[0.06] pointer-events-none">
          <svg className="w-full h-24 text-cyan-400" preserveAspectRatio="none" viewBox="0 0 1000 80" fill="none">
            <path
              d="M0 40 H180 L192 26 L204 54 L214 6 L224 74 L234 38 L240 40
                 H440 L452 26 L464 54 L474 6 L484 74 L494 38 L500 40
                 H700 L712 26 L724 54 L734 6 L744 74 L754 38 L760 40 H1000"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className="animate-ecg-hero"
            />
          </svg>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-12 pb-8 relative z-10">

          {/* ════ LEFT: COPY ════ */}
          <div className="space-y-7 text-white">

            {/* Live Badge */}
            <div className="anim-left-hero h-anim-d1 inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold text-blue-300 w-fit"
              style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.18),rgba(16,185,129,0.12))', border: '1px solid rgba(59,130,246,0.28)' }}>
              <div className="h-2 w-2 rounded-full bg-emerald-400 pulse-ring-hero shrink-0" />
              <span>{heroBadge}</span>
            </div>

            {/* Headline */}
            <div className="anim-left-hero h-anim-d2 space-y-0.5">
              <h1 className="text-[48px] sm:text-[58px] lg:text-[70px] font-black leading-[1.04] tracking-tight text-white">
                {heroTitle}
              </h1>
              <h1
                className="text-[48px] sm:text-[58px] lg:text-[70px] font-black leading-[1.04] tracking-tight text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg,#38bdf8 0%,#818cf8 50%,#34d399 100%)', WebkitBackgroundClip: 'text' }}
              >
                {heroHighlight}
              </h1>
              <h1 className="text-[48px] sm:text-[58px] lg:text-[70px] font-black leading-[1.04] tracking-tight text-white">
                {heroTitleEnd}
              </h1>
            </div>

            {/* Subtitle */}
            <p className="anim-left-hero h-anim-d3 text-blue-100/60 text-sm sm:text-base lg:text-[17px] leading-relaxed max-w-[490px]">
              {heroSubtitle}
            </p>

            {/* CTA Buttons */}
            <div className="anim-left-hero h-anim-d4 flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => onNavigateTab('appointment')}
                className="cta-main flex items-center gap-2 px-7 rounded-2xl text-sm font-bold text-white cursor-pointer"
                style={{ height: '50px' }}
              >
                <Calendar className="h-4 w-4" />
                Book Appointment
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('doctors-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="cta-ghost flex items-center gap-2 px-6 rounded-2xl text-sm font-bold text-white cursor-pointer"
                style={{ height: '50px' }}
              >
                <Stethoscope className="h-4 w-4 text-blue-300" />
                Find a Doctor
              </button>

              <button
                onClick={() => onNavigateTab('card')}
                className="cta-card flex items-center gap-2 px-6 rounded-2xl text-sm font-bold text-emerald-300 cursor-pointer"
                style={{ height: '50px' }}
              >
                <QrCode className="h-4 w-4" />
                Patient Card
              </button>
            </div>

            {/* Trust badges */}
            <div className="anim-left-hero h-anim-d5 grid grid-cols-2 gap-3 pt-2 max-w-md"
              style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
              {trustBadges.slice(0, 4).map((badge, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-blue-100/75">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.35)' }}>
                    <Check className="h-3 w-3 text-emerald-400" />
                  </div>
                  {badge}
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="anim-left-hero h-anim-d6 flex items-center gap-4 pt-1">
              <div className="flex -space-x-2.5">
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
                ].map((src, i) => (
                  <img key={i} src={src} alt="Patient"
                    className="h-9 w-9 rounded-full object-cover"
                    style={{ border: '2px solid #0c1f45', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                  />
                ))}
              </div>
              <div className="text-xs leading-snug">
                <div className="flex items-center gap-1 font-bold text-amber-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                  <span className="ml-1 text-white">4.9</span>
                </div>
                <span className="text-white/40">Trusted by 30,000+ happy patients</span>
              </div>
            </div>
          </div>

          {/* ════ RIGHT: VISUAL DASHBOARD ════ */}
          <div
            className="relative flex justify-center items-center h-[520px] w-full anim-right-hero h-anim-d2"
            style={{
              transform: `translate(${parallax.x * 0.55}px, ${parallax.y * 0.55}px)`,
              transition: 'transform 0.14s ease-out',
            }}
          >
            {/* Central glow */}
            <div className="absolute w-72 h-72 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.28) 0%, transparent 68%)' }} />

            {/* Dashed orbit rings */}
            <svg className="absolute w-80 h-80 opacity-15 rotate-slow-hero" viewBox="0 0 320 320" fill="none">
              <circle cx="160" cy="160" r="154" stroke="#60a5fa" strokeWidth="1" strokeDasharray="7 7" />
            </svg>
            <svg className="absolute w-[400px] h-[400px] opacity-[0.08] rotate-slow-rev-hero" viewBox="0 0 400 400" fill="none">
              <circle cx="200" cy="200" r="195" stroke="#34d399" strokeWidth="1" strokeDasharray="4 11" />
            </svg>

            {/* Doctor image */}
            <div className="relative z-10 h-64 w-64 md:h-[290px] md:w-[290px] rounded-full overflow-hidden float-a-hero"
              style={{
                border: '3px solid rgba(255,255,255,0.10)',
                boxShadow: '0 0 70px rgba(37,99,235,0.35), 0 20px 60px rgba(0,0,0,0.55)',
              }}>
              <div className="absolute inset-0 z-10"
                style={{ background: 'linear-gradient(180deg, rgba(7,16,32,0.12) 0%, rgba(7,16,32,0.50) 100%)' }} />
              <img
                src="/assets/hero_doctor.png"
                alt="Professional Doctor at New Life Clinic"
                className="w-full h-full object-cover object-top scale-105"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=500&q=80';
                }}
              />
            </div>

            {/* Widget 1 – Next Slot (top-left) */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
              className="absolute top-2 left-0 sm:-left-6 hero-widget rounded-2xl p-3.5 text-white w-44 z-20"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
            >
              <div className="flex items-center gap-1.5 text-blue-300 font-bold text-[9px] uppercase tracking-widest mb-1.5">
                <Clock className="h-3.5 w-3.5" /> Next Slot
              </div>
              <p className="font-extrabold text-sm">09:30 AM Today</p>
              <p className="text-white/45 text-[10px] mt-0.5">General Consultation</p>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
                  <div className="h-full bg-blue-400 rounded-full progress-fill-hero" style={{ '--fill': '65%' } as React.CSSProperties} />
                </div>
                <span className="text-[9px] text-blue-300 font-bold shrink-0">65%</span>
              </div>
            </motion.div>

            {/* Widget 2 – Heart Rate (top-right) */}
            <motion.div
              animate={{ y: [0, 9, 0] }}
              transition={{ repeat: Infinity, duration: 5.1, ease: 'easeInOut' }}
              className="absolute top-6 -right-2 sm:right-2 hero-widget rounded-2xl p-3.5 text-white w-36 z-20"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold text-white/45 uppercase tracking-widest">Heart Rate</span>
                <Heart className="h-4 w-4 text-rose-400 animate-heartbeat-hero" />
              </div>
              <span className="text-[22px] font-black text-white block leading-none">
                72 <span className="text-xs font-semibold text-white/40">BPM</span>
              </span>
              {/* Sparkline */}
              <svg viewBox="0 0 80 22" className="w-full mt-2" style={{ height: '22px' }}>
                <polyline
                  points="0,17 13,13 26,15 39,7 52,11 65,5 80,9"
                  fill="none" stroke="#fb7185" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </motion.div>

            {/* Widget 3 – Blood Pressure (mid-left) */}
            <motion.div
              animate={{ y: [0, -9, 0] }}
              transition={{ repeat: Infinity, duration: 4.2, ease: 'easeInOut' }}
              className="absolute top-1/2 -translate-y-1/2 -left-4 sm:-left-10 hero-widget rounded-2xl p-3.5 text-white z-20"
              style={{ width: '152px', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
            >
              <span className="text-[9px] font-bold text-white/45 uppercase tracking-widest block">Blood Pressure</span>
              <span className="text-[22px] font-black text-white mt-0.5 block leading-tight">120 / 80</span>
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle className="h-3 w-3" /> Optimal Range
              </span>
            </motion.div>

            {/* Widget 4 – Satisfaction (mid-right) */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut' }}
              className="absolute top-1/2 -translate-y-1/2 -right-4 sm:-right-10 hero-widget rounded-2xl p-3.5 text-white w-32 z-20"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-[9px] font-bold text-white/45 uppercase tracking-widest">Rating</span>
              </div>
              <span className="text-[22px] font-black text-white block leading-none">98%</span>
              <span className="text-[9px] text-white/35 mt-0.5 block">Verified Care</span>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full bg-amber-400 rounded-full progress-fill-hero" style={{ '--fill': '98%' } as React.CSSProperties} />
              </div>
            </motion.div>

            {/* Widget 5 – Stats footer (bottom center) */}
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 hero-widget rounded-2xl px-5 py-3.5 text-white grid grid-cols-3 gap-3 z-20"
              style={{ width: '295px', boxShadow: '0 8px 32px rgba(0,0,0,0.40)' }}
            >
              <div className="text-center">
                <span className="text-[8px] font-bold text-white/35 uppercase tracking-wide block">Doctors</span>
                <span className="text-lg font-black text-blue-300">30+</span>
              </div>
              <div className="text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-[8px] font-bold text-white/35 uppercase tracking-wide block">Experience</span>
                <span className="text-lg font-black text-blue-300">15 Yrs</span>
              </div>
              <div className="text-center">
                <span className="text-[8px] font-bold text-white/35 uppercase tracking-wide block">Patients</span>
                <span className="text-lg font-black text-blue-300">30k+</span>
              </div>
            </motion.div>

            {/* Emergency badge */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="absolute bottom-14 -right-2 sm:-right-6 hero-widget rounded-xl px-3 py-2 flex items-center gap-1.5 z-20"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
            >
              <AlertCircle className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
              <span className="text-[10px] font-extrabold text-rose-300 uppercase tracking-wider">Emergency 24/7</span>
            </motion.div>
          </div>
        </div>

        {/* ── STATS BAR + SEARCH ── */}
        <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pb-10 relative z-10 space-y-4">

          {/* Stats pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.slice(0, 4).map((stat, i) => (
              <div key={i} className="hero-stat-pill rounded-2xl px-4 py-3.5 text-center text-white">
                <span
                  className="text-2xl font-black block text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg,#60a5fa,#34d399)', WebkitBackgroundClip: 'text' }}
                >
                  {stat.value}
                </span>
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div className="hero-search rounded-2xl flex items-center gap-3 p-2">
            <div className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.18)' }}>
              <Search className="h-5 w-5 text-blue-300" />
            </div>
            <input
              type="text"
              value={heroSearch}
              onChange={(e) => {
                setHeroSearch(e.target.value);
                setServicesSearch(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              placeholder="Search doctors, clinical tests, procedures, ultrasound, blood panels..."
              className="flex-grow bg-transparent text-sm text-white outline-none placeholder-white/25 py-2"
            />
            <button
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 h-11 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              style={{ boxShadow: '0 4px 20px rgba(37,99,235,0.35)' }}
            >
              Explore Services
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Shortcut pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_SHORTCUTS.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedCategory(s.key === 'pharmacy' ? 'all' : s.key);
                  document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hero-shortcut flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white/60 hover:text-white cursor-pointer"
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
