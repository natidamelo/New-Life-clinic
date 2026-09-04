/**
 * Medical-grade In-Progress Medication Administration Record (MAR) Print Generator
 * Formats in-progress medication administration tasks into a patient-grouped, 
 * intuitive, and highly readable clinical document for ward nurses and physicians.
 */

export interface MedicationPrintTask {
  _id?: string;
  id?: string;
  patientId: string;
  patientName: string;
  priority?: string;
  status?: string;
  medicationName?: string;
  medicationDetails?: {
    medicationName?: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    instructions?: string;
    duration?: number | string;
    startDate?: string | Date;
    prescriptionId?: string;
    doseRecords?: Array<{
      day?: number;
      timeSlot?: string;
      administered?: boolean;
      administeredAt?: string | Date;
      administeredBy?: string;
      notes?: string;
    }>;
    administrationSchedule?: Array<{
      day?: number;
      timeSlot?: string;
      administered?: boolean;
      administeredAt?: string | Date;
      administeredBy?: string;
      notes?: string;
    }>;
  };
  dueDate?: string;
  createdAt?: string;
  notes?: string;
  patient?: {
    name?: string;
    fullName?: string;
  };
  prescriptionId?: string;
  isExtension?: boolean;
  paymentAuthorization?: any;
}

export interface PrintReportOptions {
  tasks: MedicationPrintTask[];
  currentUser?: {
    name?: string;
    fullName?: string;
    role?: string;
  } | null;
  taskPaymentStatuses?: Record<string, any>;
  clinicName?: string;
  clinicTagline?: string;
  filterDescription?: string;
}

const escapeHtml = (value: unknown): string => {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const parseDurationDays = (duration: any): number => {
  if (typeof duration === 'number' && duration > 0) return duration;
  if (typeof duration === 'string') {
    const match = duration.match(/(\d+)/);
    if (match) return Math.max(parseInt(match[1], 10), 1);
  }
  return 1;
};

const countDosesPerDay = (frequency: string): number => {
  const f = (frequency || '').toLowerCase();
  if (f.includes('qid') || f.includes('4x') || f.includes('four')) return 4;
  if (f.includes('tid') || f.includes('3x') || f.includes('three')) return 3;
  if (f.includes('bid') || f.includes('2x') || f.includes('twice')) return 2;
  const match = f.match(/(\d+)\s*times?/);
  if (match) return Math.max(parseInt(match[1], 10), 1);
  return 1;
};

const formatDateShort = (dateVal: any): string => {
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (dateVal: any): string => {
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getInitials = (name: string): string => {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const printInProgressMedicationReport = ({
  tasks,
  currentUser,
  taskPaymentStatuses = {},
  clinicName = 'NEW LIFE CLINIC',
  clinicTagline = 'Compassionate Healthcare · Inpatient Nursing Station',
  filterDescription
}: PrintReportOptions): void => {
  if (!tasks || tasks.length === 0) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reportGeneratedAt = formatDateTime(now);
  const printedByName = currentUser?.fullName || currentUser?.name || 'Staff Nurse';
  const printedByRole = currentUser?.role ? ` (${currentUser.role})` : '';

  // Process and normalize each task's clinical data
  const normalizedTasks = tasks.map((task) => {
    const md = task.medicationDetails || {};
    const doseRecords: any[] = Array.isArray(md.doseRecords)
      ? md.doseRecords
      : Array.isArray(md.administrationSchedule)
      ? md.administrationSchedule
      : [];

    const durationDays = parseDurationDays(md.duration);
    const dosesPerDay = countDosesPerDay(md.frequency || '');
    const totalDoses = doseRecords.length > 0 ? doseRecords.length : Math.max(durationDays * dosesPerDay, 1);
    const administeredDoses = doseRecords.filter((d: any) => d?.administered).length;
    const remainingDoses = Math.max(totalDoses - administeredDoses, 0);
    const progressPercent = Math.min(100, Math.round((administeredDoses / totalDoses) * 100));

    const startBase = md.startDate || task.createdAt || task.dueDate || now.toISOString();
    const startDate = new Date(startBase);
    const safeStartDate = Number.isNaN(startDate.getTime()) ? new Date() : startDate;

    const endDate = new Date(safeStartDate);
    endDate.setDate(endDate.getDate() + Math.max(durationDays - 1, 0));

    // Calculate days remaining or overdue state
    const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffDays = Math.ceil((endMidnight.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    const isScheduleOverdue = diffDays < 0 && remainingDoses > 0;
    const daysLeftText = isScheduleOverdue
      ? `Overdue (${Math.abs(diffDays)}d past target)`
      : `${Math.max(diffDays, 0)} days left`;

    // Next dose
    const nextPending = doseRecords.find((d: any) => !d?.administered);
    let nextDoseLabel = 'All Doses Completed';
    if (remainingDoses > 0) {
      if (nextPending) {
        nextDoseLabel = `Day ${nextPending.day || '-'}${nextPending.timeSlot ? ` · ${nextPending.timeSlot}` : ''}`;
      } else {
        nextDoseLabel = `Dose ${administeredDoses + 1} of ${totalDoses}`;
      }
    }

    // Last administered dose details
    const administeredList = doseRecords.filter((d: any) => d?.administered);
    const lastAdministered = administeredList.length > 0 ? administeredList[administeredList.length - 1] : null;

    // Payment lookup
    const isExtension = task.isExtension || (task.medicationDetails as any)?.extensionDetails || false;
    const prescriptionId = task.prescriptionId || (md as any).prescriptionId || 'unknown';
    const taskKey = `${task.patientId}-${md.medicationName || 'unknown'}-${prescriptionId}-${isExtension ? 'ext' : 'orig'}`;
    const payment = taskPaymentStatuses[taskKey];

    return {
      task,
      patientId: String(task.patientId || ''),
      patientName: task.patientName || task.patient?.fullName || task.patient?.name || 'Unknown Patient',
      medicationName: md.medicationName || task.medicationName || 'Unknown Medication',
      dosage: md.dosage || 'As directed',
      frequency: md.frequency || 'Once daily',
      route: md.route || 'Oral',
      instructions: md.instructions || task.notes || '',
      priority: (task.priority || 'MEDIUM').toUpperCase(),
      startDate: safeStartDate,
      endDate,
      durationDays,
      totalDoses,
      administeredDoses,
      remainingDoses,
      progressPercent,
      daysLeftText,
      isScheduleOverdue,
      nextDoseLabel,
      lastAdministered,
      doseRecords,
      payment
    };
  });

  // Calculate high-level KPIs
  const totalMedications = normalizedTasks.length;
  const totalAdministeredDoses = normalizedTasks.reduce((acc, t) => acc + t.administeredDoses, 0);
  const totalScheduledDoses = normalizedTasks.reduce((acc, t) => acc + t.totalDoses, 0);
  const totalRemainingDoses = normalizedTasks.reduce((acc, t) => acc + t.remainingDoses, 0);
  const overallProgress = totalScheduledDoses > 0 ? Math.round((totalAdministeredDoses / totalScheduledDoses) * 100) : 0;

  // Group tasks by Patient
  const patientMap = new Map<string, typeof normalizedTasks>();
  normalizedTasks.forEach((item) => {
    const key = item.patientName + '___' + item.patientId;
    if (!patientMap.has(key)) {
      patientMap.set(key, []);
    }
    patientMap.get(key)!.push(item);
  });

  const totalPatients = patientMap.size;
  const urgentOrHighPatients = Array.from(patientMap.values()).filter((group) =>
    group.some((t) => t.priority === 'URGENT' || t.priority === 'HIGH')
  ).length;

  // Open popup print window
  const printWindow = window.open('', '_blank', 'width=1240,height=900');
  if (!printWindow) {
    alert('Unable to open print preview. Please allow popups for this site and try again.');
    return;
  }

  // Generate Patient-grouped HTML cards
  const patientCardsHtml = Array.from(patientMap.entries())
    .map(([_, pTasks]) => {
      const first = pTasks[0];
      const patientName = first.patientName;
      const patientId = first.patientId;
      const initials = getInitials(patientName);

      // Determine highest priority for patient
      let groupPriority = 'MEDIUM';
      if (pTasks.some((t) => t.priority === 'URGENT')) groupPriority = 'URGENT';
      else if (pTasks.some((t) => t.priority === 'HIGH')) groupPriority = 'HIGH';
      else if (pTasks.every((t) => t.priority === 'LOW')) groupPriority = 'LOW';

      // Payment summary
      const anyPaid = pTasks.some((t) => t.payment?.paymentStatus === 'fully_paid' || t.payment?.paymentStatus === 'paid');
      const anyPartial = pTasks.some((t) => t.payment?.paymentStatus === 'partially_paid' || t.payment?.paymentStatus === 'partial');
      let paymentBadgeClass = 'payment-unpaid';
      let paymentBadgeText = 'Payment Pending';
      if (anyPaid && !anyPartial) {
        paymentBadgeClass = 'payment-paid';
        paymentBadgeText = '● Fully Paid';
      } else if (anyPartial || anyPaid) {
        paymentBadgeClass = 'payment-partial';
        paymentBadgeText = '● Partially Paid';
      }

      // Format medications for this patient
      const medicationsHtml = pTasks
        .map((med, medIdx) => {
          // Build dose capsules
          let capsulesHtml = '';
          const maxCapsulesToShow = 14;
          if (med.doseRecords && med.doseRecords.length > 0) {
            capsulesHtml = med.doseRecords
              .slice(0, maxCapsulesToShow)
              .map((d: any, idx: number) => {
                const isGiven = Boolean(d.administered);
                const isNext = !isGiven && med.doseRecords.findIndex((x: any) => !x.administered) === idx;
                const statusCls = isGiven ? 'capsule-given' : isNext ? 'capsule-next' : 'capsule-pending';
                const icon = isGiven ? '✓' : isNext ? '⏰' : '○';
                const statusTitle = isGiven ? 'Administered' : isNext ? 'Next Due' : 'Scheduled';
                return `
                  <span class="dose-capsule ${statusCls}" title="Dose ${idx + 1}: ${statusTitle}">
                    <span class="capsule-icon">${icon}</span>
                    <span class="capsule-text">D${d.day || idx + 1}${d.timeSlot ? `·${escapeHtml(d.timeSlot)}` : ''}</span>
                  </span>
                `;
              })
              .join('');
            if (med.doseRecords.length > maxCapsulesToShow) {
              capsulesHtml += `<span class="dose-capsule capsule-more">+${med.doseRecords.length - maxCapsulesToShow} more</span>`;
            }
          } else {
            // Auto-generate virtual capsules based on totalDoses
            const count = Math.min(med.totalDoses, maxCapsulesToShow);
            const pills: string[] = [];
            for (let i = 1; i <= count; i++) {
              const isGiven = i <= med.administeredDoses;
              const isNext = i === med.administeredDoses + 1;
              const statusCls = isGiven ? 'capsule-given' : isNext ? 'capsule-next' : 'capsule-pending';
              const icon = isGiven ? '✓' : isNext ? '⏰' : '○';
              pills.push(`
                <span class="dose-capsule ${statusCls}">
                  <span class="capsule-icon">${icon}</span>
                  <span class="capsule-text">Dose ${i}</span>
                </span>
              `);
            }
            if (med.totalDoses > maxCapsulesToShow) {
              pills.push(`<span class="dose-capsule capsule-more">+${med.totalDoses - maxCapsulesToShow} more</span>`);
            }
            capsulesHtml = pills.join('');
          }

          const lastAdministeredText = med.lastAdministered
            ? `Last given: ${formatDateShort(med.lastAdministered.administeredAt || now)}`
            : 'No dose logged yet';

          return `
            <div class="med-card">
              <div class="med-header">
                <div class="med-title-group">
                  <span class="med-number">#${medIdx + 1}</span>
                  <h4 class="med-name">${escapeHtml(med.medicationName)}</h4>
                  <span class="pill pill-route">${escapeHtml(med.route)}</span>
                  <span class="pill pill-dosage">${escapeHtml(med.dosage)}</span>
                  <span class="pill pill-freq">${escapeHtml(med.frequency)}</span>
                </div>
                <div class="med-progress-badge">
                  <span class="progress-ratio"><strong>${med.administeredDoses}</strong> of ${med.totalDoses} doses</span>
                  <span class="progress-pct">(${med.progressPercent}%)</span>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width: ${med.progressPercent}%;"></div>
              </div>

              <!-- Schedule Grid -->
              <div class="schedule-grid">
                <div class="grid-cell">
                  <span class="cell-label">Course Duration</span>
                  <span class="cell-value">${formatDateShort(med.startDate)} → ${formatDateShort(med.endDate)} <span class="sub-text">(${med.durationDays} days)</span></span>
                </div>
                <div class="grid-cell">
                  <span class="cell-label">Remaining Doses</span>
                  <span class="cell-value ${med.remainingDoses > 0 ? 'text-amber' : 'text-green'}">
                    <strong>${med.remainingDoses}</strong> doses left
                  </span>
                </div>
                <div class="grid-cell cell-highlight">
                  <span class="cell-label">Next Scheduled Dose</span>
                  <span class="cell-value text-next-dose">
                    👉 <strong>${escapeHtml(med.nextDoseLabel)}</strong>
                  </span>
                </div>
                <div class="grid-cell">
                  <span class="cell-label">Schedule Health</span>
                  <span class="cell-value ${med.isScheduleOverdue ? 'text-danger' : 'text-slate'}">
                    ${escapeHtml(med.daysLeftText)} · <span class="sub-text">${escapeHtml(lastAdministeredText)}</span>
                  </span>
                </div>
              </div>

              <!-- Dose by dose capsule timeline -->
              <div class="timeline-row">
                <span class="timeline-label">Dose Schedule:</span>
                <div class="capsules-wrapper">${capsulesHtml}</div>
              </div>

              ${med.instructions ? `
                <div class="instructions-callout">
                  <span class="instructions-icon">📋</span>
                  <span class="instructions-text"><strong>Instructions:</strong> ${escapeHtml(med.instructions)}</span>
                </div>
              ` : ''}
            </div>
          `;
        })
        .join('');

      return `
        <div class="patient-section">
          <div class="patient-card-header">
            <div class="patient-identity">
              <div class="patient-avatar">${escapeHtml(initials)}</div>
              <div>
                <div class="patient-name-row">
                  <h3 class="patient-name">${escapeHtml(patientName)}</h3>
                  <span class="priority-pill priority-${groupPriority.toLowerCase()}">${groupPriority}</span>
                  <span class="pill-payment ${paymentBadgeClass}">${escapeHtml(paymentBadgeText)}</span>
                </div>
                <div class="patient-meta-row">
                  <span>Patient ID: <strong>#${escapeHtml(patientId.slice(-6) || patientId || 'N/A')}</strong></span>
                  <span class="meta-separator">•</span>
                  <span>Active Meds: <strong>${pTasks.length} in progress</strong></span>
                  <span class="meta-separator">•</span>
                  <span>Total Scheduled Doses: <strong>${pTasks.reduce((s, t) => s + t.totalDoses, 0)}</strong></span>
                </div>
              </div>
            </div>
            <div class="patient-action-box">
              <div class="nurse-sign-field">
                <span class="sign-label">Nurse Verification:</span>
                <span class="sign-line"></span>
              </div>
            </div>
          </div>

          <div class="patient-medications-list">
            ${medicationsHtml}
          </div>
        </div>
      `;
    })
    .join('');

  // Generate Alternative Grouped Table Rows
  const tableRowsHtml = Array.from(patientMap.entries())
    .map(([_, pTasks]) => {
      const first = pTasks[0];
      const patientHeaderRow = `
        <tr class="table-patient-header-row">
          <td colspan="9">
            <div class="t-patient-header">
              <span class="t-patient-name">${escapeHtml(first.patientName)}</span>
              <span class="priority-pill priority-${first.priority.toLowerCase()}">${first.priority}</span>
              <span class="sub-text">(ID: #${escapeHtml(first.patientId.slice(-6) || first.patientId || 'N/A')} · ${pTasks.length} medications in progress)</span>
            </div>
          </td>
        </tr>
      `;

      const medRows = pTasks
        .map((med, idx) => `
          <tr class="table-med-row">
            <td class="t-col-idx">${idx + 1}</td>
            <td class="t-col-med">
              <strong>${escapeHtml(med.medicationName)}</strong>
              <div class="sub-text">${escapeHtml(med.route)}</div>
            </td>
            <td class="t-col-dosage">
              <div>${escapeHtml(med.dosage)}</div>
              <div class="sub-text">${escapeHtml(med.frequency)}</div>
            </td>
            <td class="t-col-dates">
              <div>${formatDateShort(med.startDate)}</div>
              <div class="sub-text">to ${formatDateShort(med.endDate)} (${med.durationDays}d)</div>
            </td>
            <td class="t-col-progress">
              <div class="t-progress-text"><strong>${med.administeredDoses}</strong> / ${med.totalDoses} (${med.progressPercent}%)</div>
              <div class="progress-bar-track small-track">
                <div class="progress-bar-fill" style="width: ${med.progressPercent}%;"></div>
              </div>
            </td>
            <td class="t-col-remaining">
              <span class="remaining-badge ${med.remainingDoses > 0 ? 'bg-amber' : 'bg-green'}">${med.remainingDoses} left</span>
            </td>
            <td class="t-col-next">
              <span class="next-pill">👉 ${escapeHtml(med.nextDoseLabel)}</span>
            </td>
            <td class="t-col-status">
              <span class="${med.isScheduleOverdue ? 'text-danger font-semibold' : 'text-slate'}">${escapeHtml(med.daysLeftText)}</span>
            </td>
            <td class="t-col-sign">
              <div class="nurse-initial-box"></div>
            </td>
          </tr>
        `)
        .join('');

      return patientHeaderRow + medRows;
    })
    .join('');

  // Assemble full HTML document with professional typography and styles
  const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>In-Progress Medication Administration Record - ${escapeHtml(clinicName)}</title>
  <style>
    /* ── RESET & BASE FONTS ── */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      color: #0f172a;
      background-color: #f8fafc;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }

    /* ── FLOATING TOP CONTROLS (SCREEN ONLY) ── */
    .no-print-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 24px;
      border-radius: 14px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-badge {
      background: #0284c7;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .toolbar-title {
      font-size: 14px;
      font-weight: 600;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: #0284c7;
      color: white;
    }
    .btn-primary:hover {
      background: #0369a1;
    }
    .btn-secondary {
      background: #334155;
      color: #f1f5f9;
      border-color: #475569;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    .btn-toggle {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
    }
    .btn-toggle.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    /* ── REPORT CONTAINER ── */
    .report-container {
      max-width: 1200px;
      margin: 0 auto;
      background: #ffffff;
      padding: 28px 32px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    /* ── CLINIC HEADER ── */
    .clinic-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .clinic-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .clinic-logo-icon {
      width: 46px;
      height: 46px;
      background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
      color: white;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
    }
    .clinic-name {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .clinic-tagline {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .header-meta {
      text-align: right;
    }
    .report-main-title {
      font-size: 16px;
      font-weight: 800;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-timestamp {
      font-size: 12px;
      color: #475569;
      margin-top: 4px;
    }
    .report-author {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    /* ── KPI STATS CARDS ── */
    .kpi-banner {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 24px;
    }
    .kpi-item {
      display: flex;
      flex-direction: column;
      border-right: 1px solid #e2e8f0;
      padding-right: 12px;
    }
    .kpi-item:last-child {
      border-right: none;
      padding-right: 0;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .kpi-sub {
      font-size: 11px;
      color: #0284c7;
      font-weight: 600;
    }

    /* ── PATIENT SECTION CARD ── */
    .patient-section {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      margin-bottom: 22px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .patient-card-header {
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .patient-identity {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .patient-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #0284c7;
      color: white;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .patient-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .patient-name {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .patient-meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .meta-separator {
      color: #cbd5e1;
    }
    .nurse-sign-field {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #475569;
    }
    .sign-line {
      display: inline-block;
      width: 140px;
      border-bottom: 1px dashed #94a3b8;
      height: 14px;
    }

    /* ── BADGES & PILLS ── */
    .priority-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .priority-urgent { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .priority-high   { background: #ffedd5; color: #c2410c; border: 1px solid #fdba74; }
    .priority-medium { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .priority-low    { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

    .pill-payment {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
    }
    .payment-paid    { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .payment-partial { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .payment-unpaid  { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

    .pill {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .pill-route  { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .pill-dosage { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .pill-freq   { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }

    /* ── MEDICATION CARD INSIDE PATIENT ── */
    .patient-medications-list {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .med-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      transition: all 0.15s ease;
    }
    .med-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .med-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .med-number {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
    }
    .med-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .med-progress-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #0f172a;
    }
    .progress-pct {
      font-weight: 700;
      color: #0284c7;
    }

    /* ── PROGRESS BAR ── */
    .progress-bar-track {
      width: 100%;
      height: 7px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #0284c7 0%, #10b981 100%);
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    /* ── SCHEDULE DETAILS GRID ── */
    .schedule-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 10px;
    }
    .grid-cell {
      display: flex;
      flex-direction: column;
    }
    .cell-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .cell-value {
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
      margin-top: 1px;
    }
    .cell-highlight {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 4px 8px;
    }
    .text-next-dose {
      color: #1d4ed8;
      font-size: 12px;
    }
    .text-amber  { color: #d97706; }
    .text-green  { color: #15803d; }
    .text-danger { color: #dc2626; }
    .text-slate  { color: #475569; }
    .sub-text    { font-size: 11px; font-weight: 400; color: #64748b; }

    /* ── DOSE TIMELINE CAPSULES ── */
    .timeline-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .timeline-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      flex-shrink: 0;
    }
    .capsules-wrapper {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }
    .dose-capsule {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
      border: 1px solid transparent;
    }
    .capsule-given {
      background: #dcfce7;
      color: #15803d;
      border-color: #86efac;
    }
    .capsule-next {
      background: #dbeafe;
      color: #1d4ed8;
      border-color: #93c5fd;
      font-weight: 700;
      box-shadow: 0 0 0 1px #3b82f6;
    }
    .capsule-pending {
      background: #f1f5f9;
      color: #64748b;
      border-color: #cbd5e1;
    }
    .capsule-more {
      background: #e2e8f0;
      color: #475569;
      font-size: 9px;
    }

    /* ── DOCTOR INSTRUCTIONS CALLOUT ── */
    .instructions-callout {
      margin-top: 8px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #92400e;
    }

    /* ── ALTERNATIVE TABLE VIEW ── */
    .table-view-container {
      display: none; /* toggled via JS */
      width: 100%;
    }
    .mar-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .mar-table th {
      background: #0f172a;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .mar-table td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      vertical-align: middle;
    }
    .table-patient-header-row td {
      background: #f1f5f9;
      border-top: 2px solid #cbd5e1;
      padding: 8px 12px;
    }
    .t-patient-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .t-patient-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .small-track {
      height: 5px;
      margin-top: 4px;
      margin-bottom: 0;
    }
    .t-progress-text {
      font-size: 11px;
    }
    .next-pill {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      display: inline-block;
    }
    .remaining-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .bg-amber { background: #fef3c7; color: #b45309; }
    .bg-green { background: #dcfce7; color: #15803d; }
    .nurse-initial-box {
      width: 44px;
      height: 22px;
      border: 1px dashed #94a3b8;
      border-radius: 4px;
    }

    /* ── REPORT FOOTER / VERIFICATION ── */
    .report-footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
      color: #64748b;
    }
    .footer-signatures {
      display: flex;
      gap: 32px;
    }
    .footer-sig-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .footer-line {
      width: 160px;
      border-bottom: 1px solid #475569;
      height: 20px;
    }

    /* ── PRINT MEDIA QUERIES ── */
    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm 10mm;
      }
      body {
        background: #ffffff !important;
        padding: 0 !important;
        font-size: 11px !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print, .no-print-toolbar {
        display: none !important;
      }
      .report-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .patient-section {
        border: 1px solid #cbd5e1 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 14px !important;
      }
      .med-card {
        border: 1px solid #e2e8f0 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .table-med-row {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>

  <!-- Floating screen control bar -->
  <div class="no-print-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-badge">MAR REPORT</span>
      <span class="toolbar-title">${escapeHtml(clinicName)} — In-Progress Medications (${totalMedications} items for ${totalPatients} patients)</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-toggle active" id="btn-mode-cards" onclick="setMode('cards')">
        📋 Patient MAR Cards
      </button>
      <button class="btn btn-toggle" id="btn-mode-table" onclick="setMode('table')">
        📊 Ward Summary Table
      </button>
      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Print / Save PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        ✕ Close
      </button>
    </div>
  </div>

  <!-- Printable Report Document -->
  <div class="report-container">
    
    <!-- Clinic Header -->
    <header class="clinic-header">
      <div class="clinic-brand">
        <div class="clinic-logo-icon">➕</div>
        <div>
          <h1 class="clinic-name">${escapeHtml(clinicName)}</h1>
          <p class="clinic-tagline">${escapeHtml(clinicTagline)}</p>
        </div>
      </div>
      <div class="header-meta">
        <div class="report-main-title">In-Progress Medication Administration Record</div>
        <div class="report-timestamp">Generated: <strong>${escapeHtml(reportGeneratedAt)}</strong></div>
        <div class="report-author">Printed by: <strong>${escapeHtml(printedByName)}${escapeHtml(printedByRole)}</strong></div>
      </div>
    </header>

    <!-- KPI Summary Banner -->
    <section class="kpi-banner">
      <div class="kpi-item">
        <span class="kpi-label">Active Patients</span>
        <span class="kpi-value">${totalPatients}</span>
        <span class="kpi-sub">${urgentOrHighPatients} urgent/high priority</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">Active Regimens</span>
        <span class="kpi-value">${totalMedications}</span>
        <span class="kpi-sub">in-progress treatments</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">Doses Given</span>
        <span class="kpi-value">${totalAdministeredDoses} <span class="sub-text">/ ${totalScheduledDoses}</span></span>
        <span class="kpi-sub">${overallProgress}% overall completed</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">Doses Remaining</span>
        <span class="kpi-value">${totalRemainingDoses}</span>
        <span class="kpi-sub">pending administration</span>
      </div>
      <div class="kpi-item">
        <span class="kpi-label">Administration Scope</span>
        <span class="kpi-value">${filterDescription || 'Ward View'}</span>
        <span class="kpi-sub">all in-progress</span>
      </div>
    </section>

    <!-- VIEW 1: Patient MAR Cards (Default) -->
    <div id="view-cards" class="cards-view-container">
      ${patientCardsHtml}
    </div>

    <!-- VIEW 2: Ward Summary Table -->
    <div id="view-table" class="table-view-container">
      <table class="mar-table">
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Medication & Route</th>
            <th>Dosage & Freq</th>
            <th>Duration</th>
            <th>Dose Progress</th>
            <th>Left</th>
            <th>Next Scheduled Dose</th>
            <th>Schedule Health</th>
            <th style="width: 55px;">Sign</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Report Verification Footer -->
    <footer class="report-footer">
      <div>
        <strong>${escapeHtml(clinicName)} • Inpatient Ward MAR</strong><br />
        This document serves as an official clinical medication administration record. Administer all medications following five rights of drug administration.
      </div>
      <div class="footer-signatures">
        <div class="footer-sig-block">
          <span>Administering Nurse:</span>
          <div class="footer-line"></div>
        </div>
        <div class="footer-sig-block">
          <span>Supervisor / Doctor:</span>
          <div class="footer-line"></div>
        </div>
      </div>
    </footer>

  </div>

  <script>
    function setMode(mode) {
      var cardsEl = document.getElementById('view-cards');
      var tableEl = document.getElementById('view-table');
      var btnCards = document.getElementById('btn-mode-cards');
      var btnTable = document.getElementById('btn-mode-table');

      if (mode === 'table') {
        cardsEl.style.display = 'none';
        tableEl.style.display = 'block';
        btnCards.classList.remove('active');
        btnTable.classList.add('active');
      } else {
        cardsEl.style.display = 'block';
        tableEl.style.display = 'none';
        btnCards.classList.add('active');
        btnTable.classList.remove('active');
      }
    }

    // Auto-trigger print after render
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  printWindow.document.write(fullHtml);
  printWindow.document.close();
};
