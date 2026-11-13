/**
 * Medical-grade Patient Medical History Print Utility
 * Formats patient medical history into a standard, executive A4 clinical document.
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

const formatFullDate = (dateVal: any): string => {
  if (!dateVal) return 'Not recorded';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatFullDateTime = (dateVal: any): string => {
  if (!dateVal) return 'Not recorded';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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
  if (pe.general) items.push({ label: 'General Appearance', value: String(pe.general) });
  if (heentVal) items.push({ label: 'HEENT', value: String(heentVal) });
  if (pe.cardiovascular) items.push({ label: 'Cardiovascular (CVS)', value: String(pe.cardiovascular) });
  if (pe.respiratory) items.push({ label: 'Respiratory (Chest / Lungs)', value: String(pe.respiratory) });
  if (pe.gastrointestinal) items.push({ label: 'Gastrointestinal (Abdomen)', value: String(pe.gastrointestinal) });
  if (pe.neurological) items.push({ label: 'Neurological (CNS)', value: String(pe.neurological) });
  if (pe.musculoskeletal) items.push({ label: 'Musculoskeletal', value: String(pe.musculoskeletal) });
  if (pe.skin) items.push({ label: 'Skin & Integumentary', value: String(pe.skin) });

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
 * Builds the standard, executive clinical report HTML
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
  const printTimestamp = formatFullDateTime(now);

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
    ? 'Official Clinical Consultation & Encounter Documentation'
    : `Cumulative Patient Health Record · ${records.length} Clinical Visit${records.length !== 1 ? 's' : ''}`;

  // QR Code generation
  const qrData = [
    `CLINIC: ${clinicName}`,
    `PATIENT: ${patientName}`,
    `MRN: ${patientId}`,
    `DATE: ${printTimestamp}`,
    `EMR: OFFICIAL VALIDATED RECORD`
  ].join('\n');
  const qrSvg = generateQRCodeSVG(qrData, 64);

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
        const formattedVisitDate = formatFullDateTime(visitDate);
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
          <div class="encounter-card ${idx > 0 ? 'encounter-page-break' : ''}">
            <!-- Encounter Banner -->
            <div class="encounter-header">
              <div class="enc-left">
                <span class="enc-badge">VISIT #${records.length - idx}</span>
                <span class="enc-spec">${escapeHtml(specialty)}</span>
                <span class="enc-status ${isFinalized ? 'status-done' : 'status-pending'}">${escapeHtml(status)}</span>
                <span class="enc-datetime">📅 ${escapeHtml(formattedVisitDate)}</span>
              </div>
              <div class="enc-right">
                <span class="enc-doc">Attending: <strong>${escapeHtml(doctorName)}</strong></span>
              </div>
            </div>

            <div class="encounter-body">
              <!-- Chief Complaint & HPI -->
              <div class="clinical-box">
                <div class="box-header">
                  <span class="box-icon">📋</span> CHIEF COMPLAINT &amp; HISTORY OF PRESENT ILLNESS (HPI)
                </div>
                <div class="box-inner">
                  <div class="cc-row">
                    <span class="sec-label">Chief Complaint:</span>
                    <strong class="cc-text">${escapeHtml(ccDesc)}</strong>
                    <div class="tag-group">
                      ${ccSeverity ? `<span class="tag tag-${ccSeverity.toLowerCase()}">Severity: ${escapeHtml(ccSeverity)}</span>` : ''}
                      ${ccDuration ? `<span class="tag tag-neutral">Duration: ${escapeHtml(ccDuration)}</span>` : ''}
                      ${ccLocation ? `<span class="tag tag-neutral">Location: ${escapeHtml(ccLocation)}</span>` : ''}
                    </div>
                  </div>
                  ${hpi ? `
                    <div class="hpi-block">
                      <span class="sec-label">History of Present Illness:</span>
                      <p class="hpi-paragraph">${escapeHtml(hpi)}</p>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Vital Signs Table -->
              ${hasVitals ? `
                <div class="clinical-box">
                  <div class="box-header">
                    <span class="box-icon">🩺</span> VITAL SIGNS
                  </div>
                  <div class="box-inner-table">
                    <table class="vitals-table">
                      <thead>
                        <tr>
                          <th>Blood Pressure</th>
                          <th>Heart Rate</th>
                          <th>Temperature</th>
                          <th>Resp. Rate</th>
                          <th>SpO₂</th>
                          <th>Blood Sugar</th>
                          <th>Weight</th>
                          <th>Height</th>
                          <th>BMI</th>
                          ${vitals.pain ? `<th>Pain Score</th>` : ''}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>${escapeHtml(vitals.bp || '—')}</strong> ${vitals.bp ? '<span class="u">mmHg</span>' : ''}</td>
                          <td><strong>${escapeHtml(vitals.hr || '—')}</strong> ${vitals.hr ? '<span class="u">bpm</span>' : ''}</td>
                          <td><strong>${escapeHtml(vitals.temp || '—')}</strong> ${vitals.temp ? '<span class="u">°F</span>' : ''}</td>
                          <td><strong>${escapeHtml(vitals.rr || '—')}</strong> ${vitals.rr ? '<span class="u">/min</span>' : ''}</td>
                          <td><strong>${escapeHtml(vitals.spo2 || '—')}</strong> ${vitals.spo2 ? '<span class="u">%</span>' : ''}</td>
                          <td><strong>${escapeHtml(vitals.sugar || '—')}</strong> ${vitals.sugar ? '<span class="u">mg/dL</span>' : ''}</td>
                          <td><strong>${escapeHtml(vitals.weight || '—')}</strong> ${vitals.weight ? '<span class="u">kg</span>' : ''}</td>
                          <td><strong>${escapeHtml(vitals.height || '—')}</strong> ${vitals.height ? '<span class="u">cm</span>' : ''}</td>
                          <td><strong>${escapeHtml(vitals.bmi || '—')}</strong></td>
                          ${vitals.pain ? `<td><strong>${escapeHtml(vitals.pain)}</strong>/10</td>` : ''}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}

              <!-- Physical Examination -->
              ${peItems.length > 0 ? `
                <div class="clinical-box">
                  <div class="box-header">
                    <span class="box-icon">🔍</span> PHYSICAL EXAMINATION FINDINGS
                  </div>
                  <div class="box-inner">
                    <div class="pe-grid">
                      ${peItems.map(pe => `
                        <div class="pe-item">
                          <strong class="pe-lbl">${escapeHtml(pe.label)}:</strong>
                          <span class="pe-txt">${escapeHtml(pe.value)}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- Specialty Findings (if present) -->
              ${detailsItems.length > 0 ? `
                <div class="clinical-box">
                  <div class="box-header">
                    <span class="box-icon">🔬</span> ${escapeHtml(specialty)} CLINICAL DETAILS
                  </div>
                  <div class="box-inner">
                    <div class="details-grid">
                      ${detailsItems.map(d => `
                        <div class="detail-item">
                          <span class="d-lbl">${escapeHtml(d.label)}:</span>
                          <strong class="d-val">${escapeHtml(d.value)}</strong>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- Assessment & Diagnosis -->
              <div class="clinical-box">
                <div class="box-header">
                  <span class="box-icon">🎯</span> CLINICAL ASSESSMENT &amp; DIAGNOSES
                </div>
                <div class="box-inner diagnosis-inner">
                  <div class="dx-prime-line">
                    <span class="dx-badge-primary">PRIMARY DIAGNOSIS:</span>
                    <strong class="dx-prime-name">${escapeHtml(primaryDiagnosis)}</strong>
                  </div>
                  ${otherDiagnoses.length > 0 ? `
                    <div class="dx-secondary-line">
                      <span class="dx-badge-sec">SECONDARY / DIFFERENTIAL:</span>
                      <div class="dx-chips">
                        ${otherDiagnoses.map(d => `<span class="dx-chip">${escapeHtml(d)}</span>`).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Prescriptions -->
              ${meds.length > 0 ? `
                <div class="clinical-box">
                  <div class="box-header">
                    <span class="box-icon">💊</span> PRESCRIBED MEDICATIONS (${meds.length})
                  </div>
                  <div class="box-inner-table">
                    <table class="clinical-table">
                      <thead>
                        <tr>
                          <th style="width: 25px;">#</th>
                          <th>Medication Name</th>
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
                            <td style="text-align: center; color: #64748b;">${mIdx + 1}</td>
                            <td><strong>${escapeHtml(m.name)}</strong></td>
                            <td>${escapeHtml(m.dosage || '—')}</td>
                            <td>${escapeHtml(m.route || 'Oral')}</td>
                            <td>${escapeHtml(m.frequency || '—')}</td>
                            <td>${escapeHtml(m.duration || '—')}</td>
                            <td><span class="status-pill status-${(m.status || 'active').toLowerCase()}">${escapeHtml(m.status || 'Active')}</span></td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}

              <!-- Lab Investigations -->
              ${labs.length > 0 ? `
                <div class="clinical-box">
                  <div class="box-header">
                    <span class="box-icon">🧪</span> LABORATORY &amp; DIAGNOSTIC INVESTIGATIONS (${labs.length})
                  </div>
                  <div class="box-inner-table">
                    <table class="clinical-table">
                      <thead>
                        <tr>
                          <th style="width: 25px;">#</th>
                          <th>Test / Investigation</th>
                          <th>Findings / Results</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${labs.map((l, lIdx) => `
                          <tr>
                            <td style="text-align: center; color: #64748b;">${lIdx + 1}</td>
                            <td><strong>${escapeHtml(l.name)}</strong></td>
                            <td>${l.result ? `<strong style="color: #1e3a8a;">${escapeHtml(l.result)}</strong>` : '<span style="color: #94a3b8; font-style: italic;">Recorded in lab chart</span>'}</td>
                            <td>${l.date ? escapeHtml(formatFullDate(l.date)) : '—'}</td>
                            <td><span class="status-pill status-${(l.status || 'completed').toLowerCase()}">${escapeHtml(l.status || 'Completed')}</span></td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}

              <!-- Treatment & Management Plan -->
              ${(treatmentPlan || followUpInstructions || followUpDate) ? `
                <div class="clinical-box">
                  <div class="box-header">
                    <span class="box-icon">📝</span> TREATMENT PLAN &amp; FOLLOW-UP
                  </div>
                  <div class="box-inner plan-inner">
                    ${treatmentPlan ? `
                      <div class="plan-section">
                        <strong class="sec-label">Management &amp; Care Plan:</strong>
                        <p class="plan-paragraph">${escapeHtml(treatmentPlan)}</p>
                      </div>
                    ` : ''}
                    ${(followUpDate || followUpInstructions) ? `
                      <div class="followup-section">
                        <strong class="sec-label">Follow-up Instructions:</strong>
                        <span class="followup-text">
                          ${followUpDate ? `<strong>Scheduled Return:</strong> ${escapeHtml(formatFullDate(followUpDate))} · ` : ''}
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
    /* ── BASE RESET & STANDARD MEDICAL DOCUMENT PROPORTIONS ── */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #0f172a;
      background-color: #f1f5f9;
      padding: 20px;
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
      margin-bottom: 20px;
      max-width: 960px;
      margin-left: auto;
      margin-right: auto;
    }
    .toolbar-title {
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-tag {
      background: #2563eb;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 7px;
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
      padding: 7px 16px;
      font-size: 11.5px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-primary { background: #2563eb; color: #ffffff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-close { background: #334155; color: #f8fafc; }
    .btn-close:hover { background: #475569; }

    /* ── REPORT CONTAINER (STANDARD BALANCED A4 PROPORTIONS) ── */
    .report-container {
      max-width: 920px;
      margin: 0 auto;
      background: #ffffff;
      padding: 24px 28px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    /* ── CLINIC LETTERHEAD ── */
    .clinic-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 14px;
      gap: 16px;
    }
    .clinic-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1.2;
    }
    .clinic-logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
      border-radius: 5px;
      border: 1px solid #cbd5e1;
      flex-shrink: 0;
    }
    .clinic-logo-placeholder {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      font-weight: 900;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 5px;
      flex-shrink: 0;
    }
    .clinic-name {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .clinic-tagline {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
    }
    .clinic-meta {
      font-size: 9.5px;
      color: #334155;
      line-height: 1.35;
      margin-top: 2px;
    }
    .clinic-license {
      font-size: 9.5px;
      font-weight: 700;
      color: #1e3a8a;
    }

    .header-doc-info {
      text-align: right;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .doc-titles {
      text-align: right;
    }
    .doc-main-title {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-sub-title {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .doc-meta-line {
      font-size: 9px;
      color: #475569;
      margin-top: 3px;
    }
    .qr-box svg {
      display: block;
      width: 58px;
      height: 58px;
      border: 1px solid #94a3b8;
      background: #ffffff;
      padding: 1px;
      border-radius: 3px;
    }

    /* ── PATIENT DEMOGRAPHICS MATRIX ── */
    .patient-matrix {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 14px;
      background: #ffffff;
      overflow: hidden;
    }
    .patient-matrix-header {
      background: #f1f5f9;
      padding: 5px 12px;
      font-size: 10px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .patient-matrix-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }
    .matrix-cell {
      padding: 6px 10px;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .matrix-cell:nth-child(4n) {
      border-right: none;
    }
    .matrix-cell:nth-last-child(-n+4) {
      border-bottom: none;
    }
    .matrix-lbl {
      display: block;
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 2px;
    }
    .matrix-val {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .val-mrn {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #1e3a8a;
    }
    .val-alert {
      color: #b91c1c;
    }

    /* ── ENCOUNTER CARD ── */
    .encounter-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 14px;
      overflow: hidden;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .encounter-header {
      background: #f8fafc;
      border-bottom: 1.5px solid #cbd5e1;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 10px;
    }
    .enc-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .enc-badge {
      background: #1e3a8a;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 3px;
      letter-spacing: 0.4px;
    }
    .enc-spec {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 3px;
    }
    .enc-status {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .status-done { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .status-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .enc-datetime { color: #334155; font-weight: 600; margin-left: 4px; }
    .enc-right .enc-doc { color: #0f172a; }

    .encounter-body {
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* ── CLINICAL BOXES ── */
    .clinical-box {
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      overflow: hidden;
      background: #ffffff;
    }
    .box-header {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 4px 10px;
      font-size: 9.5px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .box-icon { font-size: 11px; }

    .box-inner {
      padding: 8px 10px;
    }
    .box-inner-table {
      padding: 0;
    }

    /* Chief complaint & HPI */
    .cc-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }
    .sec-label {
      font-weight: 700;
      color: #475569;
      font-size: 10px;
      text-transform: uppercase;
    }
    .cc-text {
      font-size: 11.5px;
      color: #0f172a;
    }
    .tag-group {
      display: flex;
      gap: 5px;
      margin-left: auto;
    }
    .tag {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 3px;
      white-space: nowrap;
    }
    .tag-severe { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .tag-moderate { background: #ffedd5; color: #c2410c; border: 1px solid #fdba74; }
    .tag-mild { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .tag-neutral { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }

    .hpi-block {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #e2e8f0;
    }
    .hpi-paragraph {
      margin-top: 3px;
      font-size: 10.5px;
      line-height: 1.45;
      color: #1e293b;
    }

    /* Vitals Table */
    .vitals-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .vitals-table th {
      background: #f8fafc;
      color: #475569;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 4px 6px;
      border: 1px solid #cbd5e1;
      text-align: center;
    }
    .vitals-table td {
      padding: 5px 6px;
      border: 1px solid #cbd5e1;
      text-align: center;
      color: #0f172a;
    }
    .vitals-table .u {
      font-size: 8.5px;
      color: #64748b;
      font-weight: normal;
    }

    /* Physical Exam Grid */
    .pe-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .pe-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 5px 8px;
      font-size: 10px;
      line-height: 1.35;
    }
    .pe-lbl {
      color: #334155;
      font-weight: 800;
      font-size: 9.5px;
      margin-right: 4px;
    }
    .pe-txt {
      color: #0f172a;
    }

    /* Specialty Details Grid */
    .details-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    .detail-item {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 4px;
      padding: 5px 8px;
      font-size: 10px;
    }
    .d-lbl { color: #1e40af; font-size: 9px; text-transform: uppercase; display: block; }
    .d-val { color: #0f172a; }

    /* Diagnosis Inner */
    .diagnosis-inner {
      background: #fdf2f8;
      border-left: 3.5px solid #db2777;
    }
    .dx-prime-line {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .dx-badge-primary {
      font-size: 9.5px;
      font-weight: 800;
      color: #831843;
      text-transform: uppercase;
    }
    .dx-prime-name {
      font-size: 12px;
      color: #9d174d;
    }
    .dx-secondary-line {
      margin-top: 5px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .dx-badge-sec {
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b;
    }
    .dx-chips {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }
    .dx-chip {
      background: #fce7f3;
      color: #831843;
      border: 1px solid #fbcfe8;
      font-size: 9.5px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
    }

    /* Tables (Medications & Labs) */
    .clinical-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .clinical-table th {
      background: #f8fafc;
      color: #334155;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    .clinical-table td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }
    .status-pill {
      font-size: 8.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .status-active { background: #dcfce7; color: #166534; }
    .status-completed { background: #e0f2fe; color: #075985; }

    /* Plan & Follow-up Inner */
    .plan-inner {
      background: #f0fdf4;
      border-left: 3.5px solid #16a34a;
    }
    .plan-paragraph {
      margin-top: 3px;
      font-size: 10.5px;
      line-height: 1.45;
      color: #14532d;
    }
    .followup-section {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #bbf7d0;
      font-size: 10px;
      color: #14532d;
    }

    /* ── SIGNATURE & FOOTER ── */
    .report-footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 2px solid #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signature-row {
      display: grid;
      grid-template-columns: 2fr 1.2fr 1fr;
      gap: 16px;
      margin-bottom: 10px;
    }
    .sig-field {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 9.5px;
      color: #334155;
    }
    .sig-field span:first-child {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
    }
    .physician-sign-name {
      font-weight: 800;
      color: #0f172a;
      font-size: 11px;
    }
    .sig-line {
      border-bottom: 1px solid #475569;
      height: 20px;
    }
    .stamp-box {
      border: 1px dashed #94a3b8;
      height: 48px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .legal-notice {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 8.5px;
      color: #64748b;
      line-height: 1.4;
      text-align: justify;
    }

    .empty-state {
      padding: 30px;
      text-align: center;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      font-size: 11px;
    }

    /* ── PRINT MEDIA RULES ── */
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }

    @media print {
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        font-size: 9.5pt !important;
        line-height: 1.35 !important;
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
      .encounter-card {
        border: 1px solid #94a3b8 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 12px !important;
      }
      .encounter-page-break {
        page-break-before: always !important;
        break-before: page !important;
      }
      .clinical-box {
        border: 1px solid #cbd5e1 !important;
      }
      .vitals-table, .clinical-table {
        border: 1px solid #94a3b8 !important;
      }
      .vitals-table th, .clinical-table th,
      .vitals-table td, .clinical-table td {
        border: 1px solid #cbd5e1 !important;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Screen Toolbar (hidden in print) -->
  <div class="no-print-toolbar">
    <div class="toolbar-title">
      <span class="toolbar-tag">STANDARD MEDICAL RECORD</span>
      <span>${escapeHtml(patientName)} — ${escapeHtml(documentTitle)} (${records.length} visit${records.length !== 1 ? 's' : ''})</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="btn btn-close" onclick="window.close()">
        ✕ Close
      </button>
    </div>
  </div>

  <!-- Main Report Document -->
  <div class="report-container">

    <!-- Clinic Letterhead Header -->
    <header class="clinic-header">
      <div class="clinic-brand">
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
      <div class="header-doc-info">
        <div class="doc-titles">
          <h2 class="doc-main-title">${escapeHtml(documentTitle)}</h2>
          <p class="doc-sub-title">${escapeHtml(documentSubtitle)}</p>
          <div class="doc-meta-line">Printed: ${escapeHtml(printTimestamp)} · Dr: ${escapeHtml(printedByDoctor)}</div>
        </div>
        <div class="qr-box">
          ${qrSvg}
        </div>
      </div>
    </header>

    <!-- Patient Demographics Matrix -->
    <section class="patient-matrix">
      <div class="patient-matrix-header">
        <span>Patient Identification &amp; Demographics</span>
        <span>Scope: ${records.length} Encounter${records.length !== 1 ? 's' : ''} Documented</span>
      </div>
      <div class="patient-matrix-grid">
        <div class="matrix-cell">
          <span class="matrix-lbl">Patient Full Name</span>
          <span class="matrix-val">${escapeHtml(patientName)}</span>
        </div>
        <div class="matrix-cell">
          <span class="matrix-lbl">Patient ID / MRN</span>
          <span class="matrix-val val-mrn">${escapeHtml(patientId)}</span>
        </div>
        <div class="matrix-cell">
          <span class="matrix-lbl">Age &amp; Gender</span>
          <span class="matrix-val">${escapeHtml(ageDisplay)} / ${escapeHtml(genderDisplay)}</span>
        </div>
        <div class="matrix-cell">
          <span class="matrix-lbl">Contact Phone</span>
          <span class="matrix-val">${escapeHtml(phoneDisplay)}</span>
        </div>
        <div class="matrix-cell">
          <span class="matrix-lbl">Address / Residence</span>
          <span class="matrix-val">${escapeHtml(addressDisplay)}</span>
        </div>
        <div class="matrix-cell">
          <span class="matrix-lbl">Blood Group</span>
          <span class="matrix-val">${escapeHtml(bloodGroupDisplay)}</span>
        </div>
        <div class="matrix-cell" style="grid-column: span 2;">
          <span class="matrix-lbl">Allergies / Adverse Reactions</span>
          <span class="matrix-val ${allergiesDisplay.includes('No known') ? '' : 'val-alert'}">${escapeHtml(allergiesDisplay)}</span>
        </div>
      </div>
    </section>

    <!-- Encounters Section -->
    <main class="encounters-wrapper">
      ${encountersHtml}
    </main>

    <!-- Signature & Stamp Verification Footer -->
    <footer class="report-footer">
      <div class="signature-row">
        <div class="sig-field">
          <span>Attending Physician:</span>
          <span class="physician-sign-name">Dr. ${escapeHtml(printedByDoctor)}</span>
          <div class="sig-line"></div>
        </div>
        <div class="sig-field">
          <span>Date of Sign-off:</span>
          <span class="physician-sign-name">${escapeHtml(formatFullDate(now))}</span>
          <div class="sig-line"></div>
        </div>
        <div class="sig-field">
          <div class="stamp-box">Official Clinic Stamp</div>
        </div>
      </div>
      <div class="legal-notice">
        <strong>LEGAL NOTICE &amp; CONFIDENTIALITY DISCLAIMER:</strong> This medical record summary is an official clinical document generated from the clinic electronic health record system. It contains protected health information (PHI) privileged under medical privacy laws. Unauthorized inspection, reproduction, modification, or distribution is strictly prohibited.
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
  const printWindow = window.open('', '_blank', 'width=1050,height=900');
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
