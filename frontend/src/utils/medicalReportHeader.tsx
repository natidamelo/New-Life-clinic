// @ts-ignore
import qr from 'qr.js';
import React from 'react';

export interface MedicalReportPatient {
  name: string;
  mrn?: string;
  dob?: string | Date;
  age?: number | string;
  gender?: string;
  patientLocation?: string;
  serviceLocation?: string;
}

export interface MedicalReportInfo {
  modalityLabel?: string; // e.g., "ULTRASOUND", "LAB", "MEDICATION", "PRESCRIPTION", "X-RAY"
  orderDateTime?: string | Date;
  fileNo?: string;
  doneDateTime?: string | Date;
  doneBy?: string;
  requestedBy?: string;
  reportDateTime?: string | Date;
  reportDoneBy?: string;
}

export interface MedicalReportHeaderOptions {
  reportTitle: string; // e.g. "ULTRASOUND Report", "LABORATORY Report", "PRESCRIPTION Report"
  clinic?: {
    name?: string;
    fullName?: string;
    logo?: string;
    address?: any;
    contactPhone?: string;
    phone?: string;
    branch?: string;
    licenseNumber?: string;
  };
  patient: MedicalReportPatient;
  reportInfo: MedicalReportInfo;
  qrCodeData?: string;
  showClinicHeader?: boolean;
}

/**
 * Formats a date-time into the standard hospital format: DD-MMM-YYYY HH:mm (e.g. 14-OCT-2026 20:33)
 */
export function formatMedicalDateTime(dateVal: any): string {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

/**
 * Formats a date into the standard hospital format: DD-MMM-YYYY (e.g. 14-OCT-2026)
 */
export function formatMedicalDate(dateVal: any): string {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Formats DOB and Age together (e.g. "36 Yr" or "14-OCT-1990 / 36 Yr")
 */
export function formatDobAge(dob: any, age: any): string {
  const ageStr = (age !== undefined && age !== null && age !== '') ? `${age} Yr` : '';
  let dobStr = '';
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      dobStr = formatMedicalDate(d);
    } else {
      dobStr = String(dob);
    }
  }
  if (dobStr && ageStr) return `${dobStr} / ${ageStr}`;
  if (ageStr) return ageStr;
  if (dobStr) return dobStr;
  return 'Not recorded';
}

/**
 * Formats hospital file number (e.g. 547758/2357067)
 */
export function formatFileNo(mrn?: string, orderId?: string, fallback = '547758/2357067'): string {
  const cleanMrn = mrn ? String(mrn).replace(/[^0-9A-Za-z]/g, '').slice(-6) : '';
  const cleanId = orderId ? String(orderId).replace(/[^0-9A-Za-z]/g, '').slice(-7) : '';
  if (cleanMrn && cleanId) return `${cleanMrn}/${cleanId}`;
  if (cleanMrn) return cleanMrn;
  if (cleanId) return cleanId;
  return fallback;
}

/**
 * Generates pure vector SVG string for QR Code using qr.js
 */
export function generateQRCodeSVG(text: string, size = 76): string {
  try {
    const qrData = qr(text || 'NEW-LIFE-CLINIC', { errorCorrectLevel: qr.ErrorCorrectLevel.M });
    const modules = qrData.modules;
    const count = modules.length;
    let path = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (modules[r][c]) {
          path += `M${c},${r}h1v1h-1z `;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count} ${count}" width="${size}" height="${size}" shape-rendering="crispEdges">
      <rect width="${count}" height="${count}" fill="#ffffff"/>
      <path d="${path}" fill="#000000"/>
    </svg>`;
  } catch (e) {
    return `<div style="width:${size}px;height:${size}px;border:1px solid #777;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;background:#fff;">QR</div>`;
  }
}

/**
 * CSS stylesheet string matching the exact layout in Image 2
 */
export function getMedicalReportHeaderStyles(): string {
  return `
    .med-header-root {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 14px;
      font-family: Arial, 'Segoe UI', Helvetica, sans-serif;
      color: #000000;
    }
    .med-clinic-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #1a365d;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .med-clinic-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .med-clinic-logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
      border-radius: 4px;
    }
    .med-clinic-name {
      font-size: 17px;
      font-weight: 800;
      color: #1a365d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .med-clinic-sub {
      font-size: 10.5px;
      color: #4b5563;
      font-weight: 500;
      margin-top: 1px;
    }
    .med-clinic-contact {
      font-size: 10px;
      color: #374151;
      text-align: right;
      line-height: 1.45;
    }
    .med-title-qr-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      margin-bottom: 12px;
      padding: 2px 0 6px 0;
    }
    .med-title-center {
      flex: 1;
      text-align: center;
    }
    .med-report-title {
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 21px;
      font-weight: 800;
      color: #000000;
      text-decoration: underline;
      text-underline-offset: 4px;
      text-decoration-thickness: 1.5px;
      margin: 0;
      letter-spacing: 0.5px;
      display: inline-block;
    }
    .med-qr-box {
      flex-shrink: 0;
      padding-left: 12px;
    }
    .med-qr-box svg {
      display: block;
      width: 74px;
      height: 74px;
      border: 1px solid #718096;
      background: #ffffff;
      padding: 2px;
    }
    .med-boxes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      width: 100%;
      box-sizing: border-box;
    }
    .med-fieldset {
      border: 1.5px solid #4a5568;
      border-radius: 1px;
      padding: 7px 12px 9px 12px;
      background: #ffffff;
      margin: 0;
      box-sizing: border-box;
      min-width: 0;
    }
    .med-legend {
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 13.5px;
      font-weight: 600;
      color: #000000;
      padding: 0 6px;
      margin-left: 4px;
    }
    .med-row {
      display: flex;
      align-items: flex-end;
      margin-bottom: 4px;
      font-size: 11px;
      line-height: 1.25;
    }
    .med-row:last-child {
      margin-bottom: 1px;
    }
    .med-label-p {
      width: 110px;
      flex-shrink: 0;
      font-weight: 500;
      color: #111111;
      padding-right: 6px;
      white-space: nowrap;
    }
    .med-label-r {
      width: 172px;
      flex-shrink: 0;
      font-weight: 500;
      color: #111111;
      padding-right: 6px;
      white-space: nowrap;
    }
    .med-val-line {
      flex: 1;
      border-bottom: 1px solid #000000;
      font-weight: 700;
      color: #000000;
      padding-bottom: 1px;
      min-height: 15px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .med-val-wrap {
      flex: 1;
      border-bottom: 1px solid #000000;
      font-weight: 700;
      color: #000000;
      padding-bottom: 1px;
      min-height: 15px;
      line-height: 1.2;
    }
    @media print {
      .med-header-root * {
        color: #000000 !important;
        border-color: #000000 !important;
      }
      .med-fieldset {
        border: 1.5px solid #000000 !important;
      }
      .med-val-line, .med-val-wrap {
        border-bottom: 1px solid #000000 !important;
      }
      .med-report-title {
        text-decoration: underline !important;
      }
    }
  `;
}

/**
 * Builds the complete HTML string for the header matching Image 2
 */
export function generateMedicalReportHeaderHTML(options: MedicalReportHeaderOptions): string {
  const {
    reportTitle,
    clinic,
    patient,
    reportInfo,
    qrCodeData,
    showClinicHeader = true
  } = options;

  const modality = (reportInfo.modalityLabel || 'EXAM').toUpperCase();
  const dobAge = formatDobAge(patient.dob, patient.age);
  const fileNo = reportInfo.fileNo || formatFileNo(patient.mrn, undefined);
  
  // Content for QR code
  const qrText = qrCodeData || [
    `Clinic: ${clinic?.fullName || clinic?.name || 'New Life Medium Clinic'}`,
    `Report: ${reportTitle}`,
    `Patient: ${patient.name}`,
    `MRN: ${patient.mrn || 'N/A'}`,
    `File No: ${fileNo}`,
    `Date: ${formatMedicalDateTime(reportInfo.reportDateTime || new Date())}`
  ].join('\n');

  const qrSvg = generateQRCodeSVG(qrText, 76);

  const clinicName = clinic?.fullName || clinic?.name || 'New Life Medium Clinic';
  const clinicAddress = typeof clinic?.address === 'string' ? clinic.address : (clinic?.address?.city || 'Lafto, beside Kebron Guest House');
  const clinicPhone = clinic?.contactPhone || clinic?.phone || '+251925959219';

  return `
    <div class="med-header-root">
      ${showClinicHeader ? `
        <div class="med-clinic-bar">
          <div class="med-clinic-left">
            ${clinic?.logo ? `
              <img src="${clinic.logo}" alt="Logo" class="med-clinic-logo" onerror="this.style.display='none'" />
            ` : `
              <div style="width:48px;height:48px;background:#1a365d;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:20px;border-radius:4px;">${clinicName[0]}</div>
            `}
            <div>
              <div class="med-clinic-name">${clinicName}</div>
              <div class="med-clinic-sub">Comprehensive Diagnostic &amp; Healthcare Services</div>
            </div>
          </div>
          <div class="med-clinic-contact">
            <div>📍 ${clinicAddress}</div>
            <div>📞 ${clinicPhone}</div>
          </div>
        </div>
      ` : ''}

      <div class="med-title-qr-row">
        <div class="med-title-center">
          <h1 class="med-report-title">${reportTitle}</h1>
        </div>
        <div class="med-qr-box">
          ${qrSvg}
        </div>
      </div>

      <div class="med-boxes-grid">
        <!-- Box 1: Patient Details -->
        <fieldset class="med-fieldset">
          <legend class="med-legend">Patient Details</legend>
          <div class="med-row">
            <span class="med-label-p">Name</span>
            <span class="med-val-line">${patient.name || 'Not recorded'}</span>
          </div>
          <div class="med-row">
            <span class="med-label-p">MRN</span>
            <span class="med-val-line" style="font-family: monospace;">${patient.mrn || 'N/A'}</span>
          </div>
          <div class="med-row">
            <span class="med-label-p">DOB/Age</span>
            <span class="med-val-line">${dobAge}</span>
          </div>
          <div class="med-row">
            <span class="med-label-p">Sex</span>
            <span class="med-val-line" style="text-transform: capitalize;">${patient.gender || 'Not specified'}</span>
          </div>
          <div class="med-row">
            <span class="med-label-p">Patient Location</span>
            <span class="med-val-line">${patient.patientLocation || 'Walk-In'}</span>
          </div>
          <div class="med-row">
            <span class="med-label-p">Service Location</span>
            <span class="med-val-line">${patient.serviceLocation || 'Bole'}</span>
          </div>
        </fieldset>

        <!-- Box 2: Report Information -->
        <fieldset class="med-fieldset">
          <legend class="med-legend">Report Information</legend>
          <div class="med-row">
            <span class="med-label-r">${modality} Order Date &amp; Time</span>
            <span class="med-val-line">${formatMedicalDateTime(reportInfo.orderDateTime || new Date())}</span>
          </div>
          <div class="med-row">
            <span class="med-label-r">File No.</span>
            <span class="med-val-line" style="font-family: monospace;">${fileNo}</span>
          </div>
          <div class="med-row">
            <span class="med-label-r">${modality} Done Date &amp; Time</span>
            <span class="med-val-line">${formatMedicalDateTime(reportInfo.doneDateTime || new Date())}</span>
          </div>
          <div class="med-row">
            <span class="med-label-r">${modality} Done by</span>
            <span class="med-val-line">${reportInfo.doneBy || 'Tensae Nebiyou Tesfaye'}</span>
          </div>
          <div class="med-row">
            <span class="med-label-r">${modality} Requested By</span>
            <span class="med-val-line">${reportInfo.requestedBy || 'Referral'}</span>
          </div>
          <div class="med-row">
            <span class="med-label-r">Report Date &amp; Time</span>
            <span class="med-val-line">${formatMedicalDateTime(reportInfo.reportDateTime || new Date())}</span>
          </div>
          <div class="med-row" style="align-items: stretch;">
            <span class="med-label-r">Report Done By</span>
            <span class="med-val-wrap">${reportInfo.reportDoneBy || 'Dr. Tensae Nebiyou Tesfaye (Senior Radiology Medical Specialist)'}</span>
          </div>
        </fieldset>
      </div>
    </div>
  `;
}

/**
 * Live React Component for on-screen modal rendering
 */
export const MedicalReportHeaderReact: React.FC<MedicalReportHeaderOptions> = ({
  reportTitle,
  clinic,
  patient,
  reportInfo,
  qrCodeData,
  showClinicHeader = false
}) => {
  const modality = (reportInfo.modalityLabel || 'EXAM').toUpperCase();
  const dobAge = formatDobAge(patient.dob, patient.age);
  const fileNo = reportInfo.fileNo || formatFileNo(patient.mrn, undefined);

  const qrText = qrCodeData || [
    `Clinic: ${clinic?.fullName || clinic?.name || 'New Life Medium Clinic'}`,
    `Report: ${reportTitle}`,
    `Patient: ${patient.name}`,
    `MRN: ${patient.mrn || 'N/A'}`,
    `File No: ${fileNo}`,
    `Date: ${formatMedicalDateTime(reportInfo.reportDateTime || new Date())}`
  ].join('\n');

  const qrSvg = generateQRCodeSVG(qrText, 76);

  return (
    <div className="w-full bg-white text-black font-sans mb-4 p-1">
      <div className="flex items-center justify-between relative mb-3">
        <div className="flex-1 text-center">
          <h2 className="text-xl font-bold underline font-serif tracking-wide text-black inline-block">
            {reportTitle}
          </h2>
        </div>
        <div 
          className="flex-shrink-0 pl-3"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Patient Details */}
        <fieldset className="border-[1.5px] border-gray-600 rounded-sm p-3 bg-white">
          <legend className="font-serif text-sm font-semibold px-2 text-black ml-1">
            Patient Details
          </legend>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-28 font-medium text-gray-800 flex-shrink-0">Name</span>
            <span className="flex-1 border-b border-black font-bold text-black uppercase pb-0.5 truncate min-h-[18px]">
              {patient.name || 'Not recorded'}
            </span>
          </div>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-28 font-medium text-gray-800 flex-shrink-0">MRN</span>
            <span className="flex-1 border-b border-black font-bold text-black font-mono pb-0.5 min-h-[18px]">
              {patient.mrn || 'N/A'}
            </span>
          </div>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-28 font-medium text-gray-800 flex-shrink-0">DOB/Age</span>
            <span className="flex-1 border-b border-black font-bold text-black pb-0.5 min-h-[18px]">
              {dobAge}
            </span>
          </div>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-28 font-medium text-gray-800 flex-shrink-0">Sex</span>
            <span className="flex-1 border-b border-black font-bold text-black capitalize pb-0.5 min-h-[18px]">
              {patient.gender || 'Not specified'}
            </span>
          </div>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-28 font-medium text-gray-800 flex-shrink-0">Patient Location</span>
            <span className="flex-1 border-b border-black font-bold text-black pb-0.5 min-h-[18px]">
              {patient.patientLocation || 'Walk-In'}
            </span>
          </div>
          <div className="flex items-end text-xs">
            <span className="w-28 font-medium text-gray-800 flex-shrink-0">Service Location</span>
            <span className="flex-1 border-b border-black font-bold text-black pb-0.5 min-h-[18px]">
              {patient.serviceLocation || 'Bole'}
            </span>
          </div>
        </fieldset>

        {/* Box 2: Report Information */}
        <fieldset className="border-[1.5px] border-gray-600 rounded-sm p-3 bg-white">
          <legend className="font-serif text-sm font-semibold px-2 text-black ml-1">
            Report Information
          </legend>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-44 font-medium text-gray-800 flex-shrink-0">{modality} Order Date &amp; Time</span>
            <span className="flex-1 border-b border-black font-bold text-black pb-0.5 min-h-[18px]">
              {formatMedicalDateTime(reportInfo.orderDateTime || new Date())}
            </span>
          </div>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-44 font-medium text-gray-800 flex-shrink-0">File No.</span>
            <span className="flex-1 border-b border-black font-bold text-black font-mono pb-0.5 min-h-[18px]">
              {fileNo}
            </span>
          </div>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-44 font-medium text-gray-800 flex-shrink-0">{modality} Done Date &amp; Time</span>
            <span className="flex-1 border-b border-black font-bold text-black pb-0.5 min-h-[18px]">
              {formatMedicalDateTime(reportInfo.doneDateTime || new Date())}
            </span>
          </div>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-44 font-medium text-gray-800 flex-shrink-0">{modality} Done by</span>
            <span className="flex-1 border-b border-black font-bold text-black pb-0.5 truncate min-h-[18px]">
              {reportInfo.doneBy || 'Tensae Nebiyou Tesfaye'}
            </span>
          </div>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-44 font-medium text-gray-800 flex-shrink-0">{modality} Requested By</span>
            <span className="flex-1 border-b border-black font-bold text-black pb-0.5 truncate min-h-[18px]">
              {reportInfo.requestedBy || 'Referral'}
            </span>
          </div>
          <div className="flex items-end mb-1 text-xs">
            <span className="w-44 font-medium text-gray-800 flex-shrink-0">Report Date &amp; Time</span>
            <span className="flex-1 border-b border-black font-bold text-black pb-0.5 min-h-[18px]">
              {formatMedicalDateTime(reportInfo.reportDateTime || new Date())}
            </span>
          </div>
          <div className="flex items-stretch text-xs">
            <span className="w-44 font-medium text-gray-800 flex-shrink-0">Report Done By</span>
            <span className="flex-1 border-b border-black font-bold text-black pb-0.5 leading-tight min-h-[18px]">
              {reportInfo.reportDoneBy || 'Dr. Tensae Nebiyou Tesfaye (Senior Radiology Medical Specialist)'}
            </span>
          </div>
        </fieldset>
      </div>
    </div>
  );
};
