# New Life Medium Clinic - Operations Dashboard (Next.js App Router)

A modern, production-grade Clinic Management Dashboard UI built with Next.js 14 (App Router), Tailwind CSS, and Lucide Icons following a strict 60-30-10 clinical color hierarchy.

---

## 🎨 Color System & Theme Rules (Strict 60-30-10 Hierarchy)

### Light Mode (Default - Optimized for Bright Clinical Rooms)
- **App Background (60%)**: `#F8FAFC` (Alabaster)
- **Card / Surface Background**: `#FFFFFF` with 1px border `#E2E8F0`
- **Primary Brand / Active Nav (30%)**: `#0D9488` (Clinical Teal) with `#0F766E` hover
- **Primary Text**: `#0F172A` (Deep Slate)
- **Secondary / Muted Text**: `#64748B` (Cool Slate)

### Dark Mode (Command Center / Low-Light Ops)
- **App Background (60%)**: `#0F172A` (Deep Slate)
- **Card / Surface Background**: `#1E293B` (Charcoal Slate) with 1px border `#334155`
- **Primary Brand / Active Nav (30%)**: `#14B8A6` (Muted Teal) with `#2DD4BF` hover
- **Primary Text**: `#F8FAFC` (Off-White)
- **Secondary / Muted Text**: `#94A3B8`

### Semantic Status Accents (10% - Strictly reserved for clinical meaning)
- **Normal / Completed / Paid**: `#10B981` (Emerald) on soft tinted badge
- **Pending / Low Stock / Follow-up**: `#F59E0B` (Amber) on soft tinted badge
- **Critical / Urgent Triage / Expired**: `#EF4444` (Muted Crimson) on soft tinted badge

---

## 📐 Layout & Architecture

1. **Left Sidebar (Collapsible, 240px)**
   - Clinic logo at top: **New Life Medium Clinic** with pulsing medical emblem
   - Clean vertical navigation: *Overview*, *Patient Queue*, *Appointments*, *Pharmacy & Inventory*, *Lab Orders*, *Billing & Invoices*, *Staff*
   - Light/Dark theme toggle switcher with local storage persistence
   - Collapse button to toggle between full 240px and compact 64px icon bar

2. **Top Header**
   - Global live search bar (filters patients by ID, token, or name with `/` shortcut)
   - Quick-action button: `+ New Patient Check-In` in `#0D9488`
   - Notification bell with urgent badge count (`3`) and alert flyout
   - Logged-in profile: Dr. Dawit Haile (Chief Medical Officer)

3. **Main Content Area (Max-width 1440px)**
   - **Top KPI Row (4 Cards)** with tabular numbers (`tabular-nums`):
     - Today's Patients (`142`, `+8.4%`)
     - Waiting Room Queue (`18`, with `Avg wait: 14 min`)
     - Low-Stock Alerts (`6` items below limit)
     - Daily Revenue (`ETB 84,250`, `+12.1%`)
   - **Primary Split View (2/3 Left, 1/3 Right)**:
     - **Left (2/3)**: Live Patient Triage & Queue Table with token #, patient name/ID, department, triage priority (Normal / Urgent), assigned doctor, status, and quick action buttons (*Call*, *Finish*, *Reassign*), plus filter tabs (*All*, *Waiting*, *In Consult*, *Completed*).
     - **Right (1/3)**: Critical Alerts & Pharmacy Low-Stock Panel showing panic lab values, expiring medication batches, and a one-click *Reorder* button.
   - **Bottom Analytics Row (2 Cards)**:
     - **Patient Flow by Hour**: Clean bar chart in Clinical Teal (`#0D9488` / `#14B8A6`) with peak triage indicators.
     - **Department Load Breakdown**: Capacity utilization progress distribution.

---

## 🚀 Running the Project

From the project root:
```bash
npm run dev:next
```

Or from `clinic-dashboard`:
```bash
cd clinic-dashboard
npm run dev
```

Visit [http://localhost:3001](http://localhost:3001) in your browser.
