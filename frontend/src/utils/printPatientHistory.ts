/**
 * Medical-grade Patient Medical History Print Utility
 * Formats patient medical history into a compact, executive 1-Page A4 clinical document.
 */

import { generateQRCodeSVG } from './medicalReportHeader';

export interface PatientDemographics {
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  age?: number | string;
  dateOfBirth?: string | Date;
  gender?: string;
  sex?: string;
  id?: string;
  patientId?: string;
  mrn?: string;
  phone?: string;
  contactNumber?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: any;
}

export interface ClinicInfo {
  name?: string;
  fullName?: string;
  logo?: string | null;
  tagline?: string;
  address?: any;
  contactPhone?: string;
  phone?: string;
  contactEmail?: string;
  licenseNumber?: string;
}

export interface PrintPatientHistoryOptions {
  patient: PatientDemographics;
  records: any[];
  clinic?: ClinicInfo | null;
  currentUser?: {
    name?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null;
  specialtyFilter?: string;
  allPrescriptions?: any[];
  allLabResults?: any[];
  singleRecordTitle?: string;
}

const escapeHtml = (val: unknown): string => {
  if (val == null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatShortDate = (dateVal: any): string => {
  if (!dateVal) return 'Not recorded';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatShortDateTime = (dateVal: any): string => {
  if (!dateVal) return 'Not recorded';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const calculateAge = (dob: any): string => {
  if (!dob) return '';
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  return years > 0 ? `${years} yrs` : '< 1 yr';
};

/**
 * Normalizes vitals from multiple possible record field locations
 */
function extractVitals(record: any) {
  const vsPrimary = record.vitalSigns || {};
  const vsSecondary = record.physicalExamination?.vitals || {};

  const getVal = (...keys: string[]) => {
    for (const k of keys) {
      const v1 = vsPrimary[k];
      if (v1 !== undefined && v1 !== null && v1 !== '') return v1;
      const v2 = vsSecondary[k];
      if (v2 !== undefined && v2 !== null && v2 !== '') return v2;
    }
    return null;
  };

  const systolic = getVal('systolic', 'bloodPressureSystolic');
  const diastolic = getVal('diastolic', 'bloodPressureDiastolic');
  const bpRaw = getVal('bloodPressure', 'bp');
  const bp = (typeof bpRaw === 'string' && bpRaw.trim())
    ? bpRaw.trim()
    : (systolic != null && diastolic != null ? `${systolic}/${diastolic}` : null);

  const temp = getVal('temperature', 'temp');
  const hr = getVal('heartRate', 'pulse', 'hr');
  const rr = getVal('respiratoryRate', 'rr');
  const spo2 = getVal('oxygenSaturation', 'spO2', 'spo2');
  const sugar = getVal('bloodSugar', 'bloodGlucose', 'glucose');
  const weight = getVal('weight');
  const height = getVal('height');
  const bmi = getVal('bmi');
  const pain = getVal('pain');

  return { bp, temp, hr, rr, spo2, sugar, weight, height, bmi, pain };
}

/**
 * Formats physical examination systems into an array of { label, value }
 */
function extractPhysicalExam(pe: any) {
  if (!pe || typeof pe !== 'object') return [];

  const heentParts = [
    pe.heent?.head && `Head: ${pe.heent.head}`,
    pe.heent?.eyes && `Eyes: ${pe.heent.eyes}`,
    pe.heent?.ears && `Ears: ${pe.heent.ears}`,
    pe.heent?.nose && `Nose: ${pe.heent.nose}`,
    pe.heent?.throat && `Throat: ${pe.heent.throat}`
  ].filter(Boolean).join(' · ');

  const heentVal = heentParts || (typeof pe.heent === 'string' ? pe.heent : '');

  const items: { label: string; value: string }[] = [];
  if (pe.general) items.push({ label: 'General', value: String(pe.general) });
  if (heentVal) items.push({ label: 'HEENT', value: String(heentVal) });
  if (pe.cardiovascular) items.push({ label: 'CVS', value: String(pe.cardiovascular) });
  if (pe.respiratory) items.push({ label: 'Chest/Lungs', value: String(pe.respiratory) });
  if (pe.gastrointestinal) items.push({ label: 'Abdomen', value: String(pe.gastrointestinal) });
  if (pe.neurological) items.push({ label: 'CNS', value: String(pe.neurological) });
  if (pe.musculoskeletal) items.push({ label: 'Musculoskeletal', value: String(pe.musculoskeletal) });
  if (pe.skin) items.push({ label: 'Skin', value: String(pe.skin) });

  return items;
}

/**
 * Extracts and unrolls specialty details into readable key-value pairs
 */
function extractSpecialtyDetails(details: any): { label: string; value: string }[] {
  if (!details || typeof details !== 'object') return [];
  const result: { label: string; value: string }[] = [];

  const walk = (obj: any, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'object' && !Array.isArray(v)) {
        walk(v, prefix ? `${prefix} - ` : '');
      } else {
        const cleanKey = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
        const formattedLabel = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
        const valStr = Array.isArray(v) ? v.join(', ') : String(v);
        result.push({ label: `${prefix}${formattedLabel}`, value: valStr });
      }
    }
  };

  walk(details);
  return result;
}

/**
 * Normalizes prescriptions for a given record
 */
function extractPrescriptions(record: any, allPrescriptions: any[] = [], visitMs: number) {
  const recordMeds = Array.isArray(record.prescriptions)
    ? record.prescriptions.filter((p: any) => typeof p === 'object' && p !== null && (p.medicationName || p.name || p.medication))
    : [];

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const nearbyMeds = allPrescriptions.filter((p: any) => {
    const pd = new Date(p.createdAt || p.datePrescribed || p.date || p.prescribedAt).getTime();
    return Math.abs(pd - visitMs) <= ONE_DAY_MS;
  });

  const flattenList = (list: any[]) =>
    list.flatMap((p: any) =>
      Array.isArray(p?.medications) && p.medications.length > 0
        ? p.medications.map((mi: any) => ({ ...mi, _parentStatus: p.status }))
        : [p]
    );

  const merged = [
    ...flattenList(recordMeds),
    ...flattenList(nearbyMeds)
  ];

  const uniqueMap = new Map<string, any>();
  for (const m of merged) {
    const name = m.name || m.medicationName || m.medication || m.drug || '';
    if (!name) continue;
    const dosage = m.dosage || m.dose || '';
    const frequency = m.frequency || m.freq || '';
    const key = `${name.toLowerCase()}|${dosage.toLowerCase()}|${frequency.toLowerCase()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, {
        name,
        dosage,
        frequency,
        duration: m.duration || m.days ? `${m.duration || m.days}` : '',
        route: m.route || '',
        status: m.status || m._parentStatus || 'Active'
      });
    }
  }

  return Array.from(uniqueMap.values());
}

/**
 * Normalizes lab investigations for a given record
 */
function extractLabResults(record: any, allLabResults: any[] = [], visitMs: number) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const nearbyLabs = allLabResults.filter((lr: any) => {
    const ld = new Date(lr.resultDate || lr.completedAt || lr.orderDate || lr.createdAt).getTime();
    return Math.abs(ld - visitMs) <= ONE_DAY_MS;
  });

  const recordLabs: any[] = Array.isArray(record.labResults)
    ? record.labResults
    : Array.isArray(record.labOrders)
    ? record.labOrders
    : [];

  const allLabs = [...nearbyLabs, ...recordLabs];
  const uniqueMap = new Map<string, any>();

  for (const lr of allLabs) {
    const testName = lr.testName || lr.test?.name || lr.name || '';
    if (!testName) continue;
    const key = testName.toLowerCase();
    if (!uniqueMap.has(key)) {
      let resultVal = lr.results || lr.result || lr.value || '';
      if (typeof resultVal === 'object') {
        resultVal = JSON.stringify(resultVal);
      }
      uniqueMap.set(key, {
        name: testName,
        status: lr.status || 'Completed',
        result: resultVal,
        date: lr.resultDate || lr.completedAt || lr.orderDate || lr.createdAt
      });
    }
  }

  return Array.from(uniqueMap.values());
}

/**
 * Builds the compact, executive 1-Page A4 HTML string
 */
export function buildPatientHistoryHTML(options: PrintPatientHistoryOptions): string {
  const {
    patient,
    records = [],
    clinic,
    currentUser,
    specialtyFilter = 'All',
    allPrescriptions = [],
    allLabResults = [],
    singleRecordTitle
  } = options;

  const now = new Date();
  const printTimestamp = formatShortDateTime(now);

  // Patient normalization
  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim()
    || patient.fullName || patient.name || 'Unknown Patient';
  const patientId = patient.id || patient.patientId || patient.mrn || 'N/A';
  const ageDisplay = patient.age ? `${patient.age} yrs` : calculateAge(patient.dateOfBirth) || 'N/A';
  const genderDisplay = (patient.gender || patient.sex || 'Not Specified').toUpperCase();
  const phoneDisplay = patient.phone || patient.contactNumber || 'N/A';
  const addressDisplay = patient.address || 'Addis Ababa, Ethiopia';
  const bloodGroupDisplay = patient.bloodGroup || 'Not Documented';

  let allergiesDisplay = 'No known drug allergies (NKDA)';
  if (Array.isArray(patient.allergies) && patient.allergies.length > 0) {
    allergiesDisplay = patient.allergies.map((a: any) => typeof a === 'string' ? a : a.allergen || a.name || '').filter(Boolean).join(', ') || allergiesDisplay;
  } else if (typeof patient.allergies === 'string' && patient.allergies.trim()) {
    allergiesDisplay = patient.allergies;
  }

  // Clinic normalization
  const clinicName = clinic?.fullName || clinic?.name || 'New Life Medium Clinic PLC';
  const clinicTagline = clinic?.tagline || 'Excellence in Healthcare · Compassion in Service';
  const clinicAddress = typeof clinic?.address === 'string'
    ? clinic.address
    : (clinic?.address?.city || clinic?.address?.street || 'Addis Ababa, Ethiopia');
  const clinicPhone = clinic?.contactPhone || clinic?.phone || '+251 911 000000 / +251 115 000000';
  const clinicEmail = clinic?.contactEmail || 'info@newlifeclinic.com';
  const clinicLicense = clinic?.licenseNumber ? `License: ${clinic.licenseNumber}` : 'Licensed Health Facility';
  const clinicLogo = clinic?.logo;

  // Doctor / Staff normalization
  const printedByDoctor = currentUser?.fullName
    || (currentUser?.firstName ? `Dr. ${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : null)
    || (currentUser?.name ? `Dr. ${currentUser.name}` : 'Attending Physician');

  // Document Title
  const documentTitle = singleRecordTitle || 'PATIENT MEDICAL HISTORY RECORD';
  const documentSubtitle = records.length === 1
    ? 'Clinical Consultation & Encounter Documentation'
    : `Cumulative Patient Health Record · ${records.length} Visits`;

  // QR Code generation (compact 48px size)
  const qrData = [
    `CLINIC: ${clinicName}`,
    `PATIENT: ${patientName}`,
    `MRN: ${patientId}`,
    `DATE: ${printTimestamp}`,
    `RECORD: OFFICIAL EMR`
  ].join('\n');
  const qrSvg = generateQRCodeSVG(qrData, 50);

  // Encounters HTML
  const encountersHtml = records.length === 0
    ? `
      <div class="empty-state">
        <p><strong>No medical consultation records found for this patient.</strong></p>
      </div>
    `
    : records.map((record, idx) => {
        const visitDate = record.visitDate || record.createdAt || now;
        const visitMs = new Date(visitDate).getTime();
        const formattedVisitDate = formatShortDateTime(visitDate);
        const specialty = (record.specialty || 'General Practice').toUpperCase();
        const status = (record.status || 'Finalized').toUpperCase();
        const isFinalized = status === 'FINALIZED' || status === 'COMPLETED';

        const doctorName = (record.doctor?.firstName || record.doctor?.lastName)
          ? `Dr. ${record.doctor?.firstName || ''} ${record.doctor?.lastName || ''}`.trim()
          : printedByDoctor;

        // Chief Complaint & HPI
        const ccDesc = record.chiefComplaint?.description || (typeof record.chiefComplaint === 'string' ? record.chiefComplaint : 'Routine Consultation / Evaluation');
        const ccSeverity = record.chiefComplaint?.severity;
        const ccDuration = record.chiefComplaint?.duration;
        const ccLocation = record.chiefComplaint?.location;
        const hpi = record.historyOfPresentIllness;

        // Vitals
        const vitals = extractVitals(record);
        const hasVitals = Object.values(vitals).some(v => v !== null && v !== undefined && v !== '');

        // Physical Exam
        const peItems = extractPhysicalExam(record.physicalExamination);

        // Specialty Details
        const detailsItems = extractSpecialtyDetails(record.details);

        // Diagnosis
        const primaryDiagnosis = record.diagnosis || record.assessment?.primaryDiagnosis || (Array.isArray(record.diagnoses) && record.diagnoses[0]?.description) || 'Clinical Evaluation';
        const otherDiagnoses: string[] = [];
        if (Array.isArray(record.diagnoses)) {
          record.diagnoses.forEach((d: any) => {
            const desc = typeof d === 'string' ? d : d?.description || d?.name;
            if (desc && desc !== primaryDiagnosis && !otherDiagnoses.includes(desc)) {
              otherDiagnoses.push(desc);
            }
          });
        }

        // Treatment & Management
        const treatmentPlan = record.plan || record.treatmentPlan || record.assessment?.plan;

        // Medications
        const meds = extractPrescriptions(record, allPrescriptions, visitMs);

        // Lab Investigations
        const labs = extractLabResults(record, allLabResults, visitMs);

        // Follow up
        const followUpInstructions = record.followUpPlan?.instructions || record.followUpPlan?.notes;
        const followUpDate = record.followUpPlan?.date || record.followUpPlan?.returnDate;

        return `
          <div class="encounter-block ${idx > 0 ? 'encounter-page-break' : ''}">
            <!-- Encounter Banner Bar -->
            <div class="encounter-bar">
              <div class="bar-left">
                <span class="badge-num">#${records.length - idx}</span>
                <span class="badge-spec">${escapeHtml(specialty)}</span>
                <span class="badge-stat ${isFinalized ? 'stat-done' : 'stat-pend'}">${escapeHtml(status)}</span>
                <span class="enc-time">📅 ${escapeHtml(formattedVisitDate)}</span>
              </div>
              <div class="bar-right">
                <span class="enc-doc">👨‍⚕️ ${escapeHtml(doctorName)}</span>
              </div>
            </div>

            <div class="encounter-content">
              <!-- Chief Complaint & HPI -->
              <div class="c-section">
                <div class="c-title">CHIEF COMPLAINT &amp; HPI</div>
                <div class="cc-hpi-box">
                  <div class="cc-row">
                    <span class="lbl-inline">Complaint:</span>
                    <strong class="val-inline">${escapeHtml(ccDesc)}</strong>
                    ${ccSeverity ? `<span class="badge-tag tag-${ccSeverity.toLowerCase()}">Severity: ${escapeHtml(ccSeverity)}</span>` : ''}
                    ${ccDuration ? `<span class="badge-tag">Duration: ${escapeHtml(ccDuration)}</span>` : ''}
                    ${ccLocation ? `<span class="badge-tag">Location: ${escapeHtml(ccLocation)}</span>` : ''}
                  </div>
                  ${hpi ? `
                    <div class="hpi-row">
                      <span class="lbl-inline">HPI:</span>
                      <span class="hpi-text">${escapeHtml(hpi)}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Vitals Matrix (compact 1-row table) -->
              ${hasVitals ? `
                <div class="c-section">
                  <div class="c-title">VITAL SIGNS</div>
                  <table class="v-table">
                    <thead>
                      <tr>
                        <th>BP (mmHg)</th>
                        <th>Pulse (bpm)</th>
                        <th>Temp (°F)</th>
                        <th>RR (/min)</th>
                        <th>SpO₂ (%)</th>
                        <th>Sugar</th>
                        <th>Weight</th>
                        <th>Height</th>
                        <th>BMI</th>
                        ${vitals.pain ? `<th>Pain</th>` : ''}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>${escapeHtml(vitals.bp || '—')}</strong></td>
                        <td><strong>${escapeHtml(vitals.hr || '—')}</strong></td>
                        <td><strong>${escapeHtml(vitals.temp || '—')}</strong></td>
                        <td><strong>${escapeHtml(vitals.rr || '—')}</strong></td>
                        <td><strong>${escapeHtml(vitals.spo2 || '—')}</strong></td>
                        <td><strong>${escapeHtml(vitals.sugar || '—')}</strong></td>
                        <td><strong>${escapeHtml(vitals.weight || '—')}</strong></td>
                        <td><strong>${escapeHtml(vitals.height || '—')}</strong></td>
                        <td><strong>${escapeHtml(vitals.bmi || '—')}</strong></td>
                        ${vitals.pain ? `<td><strong>${escapeHtml(vitals.pain)}/10</strong></td>` : ''}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ` : ''}

              <!-- Physical Examination Findings -->
              ${peItems.length > 0 ? `
                <div class="c-section">
                  <div class="c-title">PHYSICAL EXAMINATION</div>
                  <div class="pe-row-grid">
                    ${peItems.map(pe => `
                      <div class="pe-chip">
                        <strong>${escapeHtml(pe.label)}:</strong> <span>${escapeHtml(pe.value)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Specialty Specific Clinical Details -->
              ${detailsItems.length > 0 ? `
                <div class="c-section">
                  <div class="c-title">${escapeHtml(specialty)} CLINICAL FINDINGS</div>
                  <div class="details-row-grid">
                    ${detailsItems.map(d => `
                      <div class="detail-chip">
                        <span>${escapeHtml(d.label)}:</span> <strong>${escapeHtml(d.value)}</strong>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Clinical Assessment & Diagnoses -->
              <div class="c-section">
                <div class="c-title">ASSESSMENT &amp; DIAGNOSIS</div>
                <div class="dx-compact-bar">
                  <div class="dx-prime">
                    <span class="dx-badge">PRIMARY</span>
                    <strong class="dx-text">${escapeHtml(primaryDiagnosis)}</strong>
                  </div>
                  ${otherDiagnoses.length > 0 ? `
                    <div class="dx-secondary">
                      <span class="dx-sub-badge">SECONDARY</span>
                      ${otherDiagnoses.map(d => `<span class="dx-pill">${escapeHtml(d)}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Prescribed Medications -->
              ${meds.length > 0 ? `
                <div class="c-section">
                  <div class="c-title">PRESCRIBED MEDICATIONS (${meds.length})</div>
                  <table class="t-table">
                    <thead>
                      <tr>
                        <th style="width:20px;">#</th>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Route</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${meds.map((m, mIdx) => `
                        <tr>
                          <td style="text-align:center;">${mIdx + 1}</td>
                          <td><strong>${escapeHtml(m.name)}</strong></td>
                          <td>${escapeHtml(m.dosage || '—')}</td>
                          <td>${escapeHtml(m.route || 'Oral')}</td>
                          <td>${escapeHtml(m.frequency || '—')}</td>
                          <td>${escapeHtml(m.duration || '—')}</td>
                          <td><span class="pill-stat">${escapeHtml(m.status || 'Active')}</span></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}

              <!-- Laboratory & Diagnostic Investigations -->
              ${labs.length > 0 ? `
                <div class="c-section">
                  <div class="c-title">LABORATORY INVESTIGATIONS (${labs.length})</div>
                  <table class="t-table">
                    <thead>
                      <tr>
                        <th style="width:20px;">#</th>
                        <th>Test / Investigation</th>
                        <th>Result / Findings</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${labs.map((l, lIdx) => `
                        <tr>
                          <td style="text-align:center;">${lIdx + 1}</td>
                          <td><strong>${escapeHtml(l.name)}</strong></td>
                          <td>${l.result ? `<strong style="color:#1e3a8a;">${escapeHtml(l.result)}</strong>` : '<span style="color:#94a3b8;">Recorded in lab</span>'}</td>
                          <td>${l.date ? escapeHtml(formatShortDate(l.date)) : '—'}</td>
                          <td><span class="pill-stat">${escapeHtml(l.status || 'Completed')}</span></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}

              <!-- Treatment & Management Plan -->
              ${(treatmentPlan || followUpInstructions || followUpDate) ? `
                <div class="c-section">
                  <div class="c-title">MANAGEMENT PLAN &amp; FOLLOW-UP</div>
                  <div class="plan-followup-box">
                    ${treatmentPlan ? `
                      <div class="plan-row">
                        <span class="lbl-inline">Plan:</span>
                        <span class="plan-text">${escapeHtml(treatmentPlan)}</span>
                      </div>
                    ` : ''}
                    ${(followUpDate || followUpInstructions) ? `
                      <div class="followup-row">
                        <span class="lbl-inline">Follow-up:</span>
                        <span>
                          ${followUpDate ? `<strong>Scheduled:</strong> ${escapeHtml(formatShortDate(followUpDate))} · ` : ''}
                          ${followUpInstructions ? escapeHtml(followUpInstructions) : ''}
                        </span>
                      </div>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(documentTitle)} - ${escapeHtml(patientName)}</title>
  <style>
    /* ── BASE RESET & HIGH-DENSITY 1-PAGE A4 LAYOUT ── */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      line-height: 1.3;
      color: #0f172a;
      background-color: #f1f5f9;
      padding: 16px;
      -webkit-font-smoothing: antialiased;
    }

    /* ── SCREEN FLOATING TOOLBAR ── */
    .no-print-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 8px;
      box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }
    .toolbar-title {
      font-size: 12.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-tag {
      background: #2563eb;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 5px;
      cursor: pointer;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .btn-primary { background: #2563eb; color: #ffffff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-close { background: #334155; color: #f8fafc; }
    .btn-close:hover { background: #475569; }

    /* ── REPORT CONTAINER (CALIBRATED FOR EXACT A4 1-PAGE FIT) ── */
    .report-container {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      padding: 16px 20px 12px 20px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    }

    /* ── UNIFIED COMPACT LETTERHEAD ── */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 8px;
      gap: 12px;
    }
    .clinic-col {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1.3;
    }
    .clinic-logo {
      width: 44px;
      height: 44px;
      object-fit: contain;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      flex-shrink: 0;
    }
    .clinic-logo-placeholder {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      font-weight: 900;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .clinic-name {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.15;
    }
    .clinic-tagline {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
    }
    .clinic-meta {
      font-size: 8.5px;
      color: #334155;
      line-height: 1.25;
      margin-top: 1px;
    }
    .clinic-license {
      font-size: 8.5px;
      font-weight: 700;
      color: #1e3a8a;
    }

    .title-col {
      text-align: center;
      flex: 1;
      padding: 0 6px;
    }
    .doc-title {
      font-size: 13.5px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.15;
    }
    .doc-sub {
      font-size: 9px;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
    }
    .doc-timestamp {
      font-size: 8px;
      color: #64748b;
      margin-top: 2px;
    }

    .qr-col {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    .qr-col svg {
      display: block;
      width: 48px;
      height: 48px;
      border: 1px solid #94a3b8;
      background: #ffffff;
      padding: 1px;
      border-radius: 2px;
    }

    /* ── STREAMLINED PATIENT DEMOGRAPHICS STRIP ── */
    .patient-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 3.5px solid #1e3a8a;
      border-radius: 4px;
      padding: 4px 8px;
      margin-bottom: 8px;
      gap: 2px 8px;
    }
    .p-item {
      display: flex;
      align-items: baseline;
      gap: 4px;
      font-size: 9.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .p-item-wide {
      grid-column: span 2;
    }
    .p-item .lbl {
      color: #64748b;
      font-weight: 700;
      font-size: 8.5px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .p-item .val {
      color: #0f172a;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .p-item .val-mrn {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #1e3a8a;
    }
    .p-item .val-alert {
      color: #b91c1c;
    }

    /* ── ENCOUNTER BLOCK ── */
    .encounter-block {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      margin-bottom: 8px;
      overflow: hidden;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .encounter-bar {
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 3px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 9px;
    }
    .bar-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-num {
      background: #1e3a8a;
      color: #ffffff;
      font-weight: 800;
      font-size: 8.5px;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .badge-spec {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-weight: 700;
      font-size: 8.5px;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .badge-stat {
      font-size: 8px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .stat-done { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .stat-pend { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .enc-time { color: #334155; font-weight: 600; margin-left: 4px; }
    .bar-right .enc-doc { color: #0f172a; font-weight: 700; }

    .encounter-content {
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    /* ── COMPACT CLINICAL SECTIONS ── */
    .c-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .c-title {
      font-size: 8.5px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1px;
    }

    /* Chief complaint & HPI */
    .cc-hpi-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 3px 6px;
      font-size: 9.5px;
    }
    .cc-row {
      display: flex;
      align-items: baseline;
      gap: 5px;
      flex-wrap: wrap;
    }
    .lbl-inline {
      color: #64748b;
      font-weight: 700;
      font-size: 8.5px;
      text-transform: uppercase;
    }
    .val-inline {
      color: #0f172a;
    }
    .badge-tag {
      font-size: 8px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .tag-severe { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
    .tag-moderate { background: #ffedd5; color: #c2410c; border-color: #fdba74; }
    .tag-mild { background: #dcfce7; color: #15803d; border-color: #86efac; }

    .hpi-row {
      margin-top: 2px;
      padding-top: 2px;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      align-items: baseline;
      gap: 5px;
    }
    .hpi-text {
      color: #1e293b;
      line-height: 1.25;
      font-size: 9px;
    }

    /* Vitals mini table */
    .v-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
      border: 1px solid #cbd5e1;
    }
    .v-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 4px;
      border: 1px solid #cbd5e1;
      text-align: center;
      font-size: 8px;
    }
    .v-table td {
      padding: 2px 4px;
      border: 1px solid #cbd5e1;
      text-align: center;
      color: #0f172a;
    }

    /* Physical Exam row grid */
    .pe-row-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
    }
    .pe-chip {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 2px 5px;
      font-size: 8.5px;
      line-height: 1.2;
    }
    .pe-chip strong {
      color: #334155;
      font-size: 8px;
      text-transform: uppercase;
    }

    /* Specialty Details */
    .details-row-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
    }
    .detail-chip {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 3px;
      padding: 1px 5px;
      font-size: 8.5px;
    }
    .detail-chip span { color: #1e40af; font-size: 8px; text-transform: uppercase; }

    /* Diagnosis compact bar */
    .dx-compact-bar {
      background: #fdf2f8;
      border: 1px solid #fbcfe8;
      border-left: 3px solid #db2777;
      border-radius: 3px;
      padding: 3px 6px;
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }
    .dx-prime {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .dx-badge {
      font-size: 8px;
      font-weight: 800;
      color: #831843;
      background: #fce7f3;
      padding: 1px 4px;
      border-radius: 2px;
    }
    .dx-text {
      color: #9d174d;
      font-size: 10px;
    }
    .dx-secondary {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-left: auto;
    }
    .dx-sub-badge {
      font-size: 7.5px;
      font-weight: 700;
      color: #64748b;
    }
    .dx-pill {
      background: #ffffff;
      color: #475569;
      border: 1px solid #e2e8f0;
      font-size: 8.5px;
      font-weight: 600;
      padding: 0 4px;
      border-radius: 2px;
    }

    /* Tables for Meds & Labs */
    .t-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
      border: 1px solid #cbd5e1;
    }
    .t-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 4px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    .t-table td {
      padding: 2px 4px;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }
    .pill-stat {
      font-size: 7.5px;
      font-weight: 700;
      padding: 0 4px;
      border-radius: 2px;
      background: #dcfce7;
      color: #166534;
      text-transform: uppercase;
    }

    /* Plan & Follow-up */
    .plan-followup-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 3px solid #16a34a;
      border-radius: 3px;
      padding: 3px 6px;
      font-size: 9px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .plan-row, .followup-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .plan-text {
      color: #14532d;
      line-height: 1.25;
    }

    /* ── STREAMLINED SIGNATURE FOOTER ── */
    .doc-footer {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1.5px solid #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-row {
      display: grid;
      grid-template-columns: 2fr 1.2fr 1fr;
      gap: 12px;
      margin-bottom: 4px;
    }
    .sig-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 8.5px;
      color: #475569;
    }
    .sig-col span:first-child {
      font-weight: 700;
      font-size: 8px;
      text-transform: uppercase;
    }
    .physician-name {
      font-weight: 800;
      color: #0f172a;
      font-size: 9.5px;
    }
    .sig-line {
      border-bottom: 1px solid #475569;
      height: 14px;
    }
    .stamp-box-compact {
      border: 1px dashed #94a3b8;
      height: 38px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 8px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .footer-legal-line {
      font-size: 7.5px;
      color: #64748b;
      text-align: center;
      border-top: 1px dashed #e2e8f0;
      padding-top: 3px;
      margin-top: 2px;
    }

    .empty-state {
      padding: 20px;
      text-align: center;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
      font-size: 10px;
    }

    /* ── PRINT MEDIA RULES (ENFORCING STRICT 1-PAGE A4) ── */
    @page {
      size: A4 portrait;
      margin: 4mm 6mm 4mm 6mm;
    }

    @media print {
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        font-size: 8.5pt !important;
        line-height: 1.2 !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print-toolbar {
        display: none !important;
      }
      .report-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }
      .encounter-block {
        border: 1px solid #94a3b8 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 6px !important;
      }
      .encounter-page-break {
        page-break-before: always !important;
        break-before: page !important;
      }
      .v-table, .t-table {
        border: 1px solid #94a3b8 !important;
      }
      .v-table th, .t-table th,
      .v-table td, .t-table td {
        border: 1px solid #cbd5e1 !important;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Screen Toolbar (hidden in print) -->
  <div class="no-print-toolbar">
    <div class="toolbar-title">
      <span class="toolbar-tag">1-PAGE A4 FORMAT</span>
      <span>${escapeHtml(patientName)} — ${escapeHtml(documentTitle)} (${records.length} visit${records.length !== 1 ? 's' : ''})</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Print / Save as PDF (1 Page)
      </button>
      <button class="btn btn-close" onclick="window.close()">
        ✕ Close
      </button>
    </div>
  </div>

  <!-- Main Report Document -->
  <div class="report-container">

    <!-- Unified Header Letterhead -->
    <header class="doc-header">
      <div class="clinic-col">
        ${clinicLogo ? `
          <img src="${clinicLogo}" alt="Logo" class="clinic-logo" onerror="this.style.display='none'" />
        ` : `
          <div class="clinic-logo-placeholder">➕</div>
        `}
        <div>
          <h1 class="clinic-name">${escapeHtml(clinicName)}</h1>
          <p class="clinic-tagline">${escapeHtml(clinicTagline)}</p>
          <div class="clinic-meta">📍 ${escapeHtml(clinicAddress)} · 📞 ${escapeHtml(clinicPhone)} · ✉️ ${escapeHtml(clinicEmail)}</div>
          <div class="clinic-license">${escapeHtml(clinicLicense)}</div>
        </div>
      </div>
      <div class="title-col">
        <h2 class="doc-title">${escapeHtml(documentTitle)}</h2>
        <p class="doc-sub">${escapeHtml(documentSubtitle)}</p>
        <div class="doc-timestamp">Printed: ${escapeHtml(printTimestamp)} · Dr: ${escapeHtml(printedByDoctor)}</div>
      </div>
      <div class="qr-col">
        ${qrSvg}
      </div>
    </header>

    <!-- Streamlined Patient Demographics Strip -->
    <section class="patient-strip">
      <div class="p-item"><span class="lbl">PATIENT:</span> <span class="val">${escapeHtml(patientName)}</span></div>
      <div class="p-item"><span class="lbl">MRN / ID:</span> <span class="val val-mrn">${escapeHtml(patientId)}</span></div>
      <div class="p-item"><span class="lbl">AGE / SEX:</span> <span class="val">${escapeHtml(ageDisplay)} / ${escapeHtml(genderDisplay)}</span></div>
      <div class="p-item"><span class="lbl">PHONE:</span> <span class="val">${escapeHtml(phoneDisplay)}</span></div>
      <div class="p-item"><span class="lbl">RESIDENCE:</span> <span class="val">${escapeHtml(addressDisplay)}</span></div>
      <div class="p-item"><span class="lbl">BLOOD GRP:</span> <span class="val">${escapeHtml(bloodGroupDisplay)}</span></div>
      <div class="p-item p-item-wide"><span class="lbl">ALLERGIES:</span> <span class="val ${allergiesDisplay.includes('No known') ? '' : 'val-alert'}">${escapeHtml(allergiesDisplay)}</span></div>
    </section>

    <!-- Encounters Section -->
    <main class="encounters-wrapper">
      ${encountersHtml}
    </main>

    <!-- Streamlined Signature & Legal Footer -->
    <footer class="doc-footer">
      <div class="sig-row">
        <div class="sig-col">
          <span>Attending Physician:</span>
          <span class="physician-name">Dr. ${escapeHtml(printedByDoctor)}</span>
          <div class="sig-line"></div>
        </div>
        <div class="sig-col">
          <span>Date of Sign-off:</span>
          <span class="physician-name">${escapeHtml(formatShortDate(now))}</span>
          <div class="sig-line"></div>
        </div>
        <div class="sig-col">
          <div class="stamp-box-compact">Official Clinic Stamp</div>
        </div>
      </div>
      <div class="footer-legal-line">
        CONFIDENTIAL MEDICAL DOCUMENT • Generated from ${escapeHtml(clinicName)} EMR • Unauthorized Reproduction Prohibited
      </div>
    </footer>

  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
}

/**
 * Universal print executor: Opens a popup window or falls back seamlessly to a hidden iframe.
 */
export function executePrint(htmlContent: string): void {
  // Try popup window first
  const printWindow = window.open('', '_blank', 'width=1000,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return;
  }

  // Popup was blocked by browser -> use isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Failed to print iframe:', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 400);
  }
}

/**
 * Main entry point: Print patient medical history (all or filtered visits)
 */
export function printPatientHistory(options: PrintPatientHistoryOptions): void {
  const html = buildPatientHistoryHTML(options);
  executePrint(html);
}

/**
 * Print a single medical record / consultation
 */
export function printSingleMedicalRecord(
  record: any,
  patient: PatientDemographics,
  clinic?: ClinicInfo | null,
  currentUser?: any,
  allPrescriptions: any[] = [],
  allLabResults: any[] = []
): void {
  const html = buildPatientHistoryHTML({
    patient,
    records: [record],
    clinic,
    currentUser,
    specialtyFilter: record.specialty || 'General',
    allPrescriptions,
    allLabResults,
    singleRecordTitle: 'CLINICAL ENCOUNTER & CONSULTATION REPORT'
  });
  executePrint(html);
}
