# New Life Medium Clinic — Clinical Management Dashboard

A modern, production-grade Clinic Management Dashboard UI built with **Next.js 14 (App Router)**, **Tailwind CSS**, and **Lucide Icons**.

## Features

- **Strict 60-30-10 Clinical Color Hierarchy**:
  - **Light Mode (Default)**: `#F8FAFC` Alabaster background, `#FFFFFF` cards, `#0D9488` Clinical Teal brand accents, `#0F172A` deep slate text.
  - **Dark Mode (Command Center)**: `#0F172A` Deep Slate background, `#1E293B` Charcoal Slate cards, `#14B8A6` muted teal brand accents, `#F8FAFC` off-white text.
  - **Semantic Status Accents**: `#10B981` Emerald (Completed / Normal), `#F59E0B` Amber (Pending / Warning), `#EF4444` Crimson (STAT / Critical).
- **Navigation Architecture**:
  - Collapsible 240px / 72px Left Sidebar with clinic branding, active route indicators, notification badges, and light/dark mode switcher.
  - Global Header with patient search (ID/name), quick-action "+ New Patient Check-In" button, interactive notifications dropdown, and user profile.
- **Main Content Layout (1440px Max Width)**:
  1. **Top KPI Row**: 4 cards with tabular numbers (Today's Patients, Waiting Room Queue & avg wait time, Low-Stock Alerts, Daily Revenue).
  2. **Primary Split View (2/3 Left, 1/3 Right)**:
     - **Left (2/3)**: Live Patient Triage & Queue Table with filtering tabs (All, Waiting, In Consultation, Completed), priority badges, assigned doctor, and action menu.
     - **Right (1/3)**: Pharmacy low-stock alerts (expiring meds, out-of-stock items) and STAT/Urgent pending lab results requiring immediate doctor review.
  3. **Bottom Analytics Row**:
     - **Patient Flow by Hour**: Interactive Clinical Teal bar chart displaying hourly patient volume, peak hours, and capacity stress.
     - **Department Load Breakdown**: Live bed/station occupancy bars and wait time indicators across 8 clinical stations.

## Getting Started

```bash
# Navigate to the dashboard directory
cd clinic-dashboard

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
