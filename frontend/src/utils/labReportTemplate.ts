// Professional Lab Report Template — Hospital-Grade Design
// New Life Medium Clinic — Laboratory Report System
import { generateMedicalReportHeaderHTML, getMedicalReportHeaderStyles, formatFileNo } from './medicalReportHeader';

export const generateProfessionalLabReportHTML = (selectedPatient: any, clinic?: any) => {
  // ─── Result Flag Logic (H / L / Normal) ─────────────────────────
  const getResultFlag = (value: string, normalRange: string, gender?: string) => {
    if (!value || !normalRange || normalRange === 'Not specified' || normalRange.trim() === '') {
      return { class: 'normal', text: '-' };
    }

    const numValue = parseFloat(value);
    const lowerValue = value.toLowerCase().trim();
    const lowerNormalRange = normalRange.toLowerCase().trim();

    // Qualitative results
    if (isNaN(numValue)) {
      if (lowerNormalRange === 'negative' && lowerValue === 'negative') return { class: 'normal', text: '-' };
      if (lowerNormalRange === 'positive' && lowerValue === 'positive') return { class: 'normal', text: '-' };
      if (lowerNormalRange === 'non-reactive' && lowerValue === 'non-reactive') return { class: 'normal', text: '-' };
      if (lowerNormalRange === 'reactive' && lowerValue === 'reactive') return { class: 'normal', text: '-' };
      if (lowerNormalRange.includes(lowerValue)) return { class: 'normal', text: '-' };
      return { class: 'high', text: '⚠' };
    }

    // Gender-aware range parsing: "Male: 13-17, Female: 12-15"
    let rangeStr = normalRange;
    if (gender) {
      const genderLower = gender.toLowerCase();
      const maleMatch = normalRange.match(/male[:\s]+([^,]+)/i);
      const femaleMatch = normalRange.match(/female[:\s]+([^,]+)/i);
      if (genderLower === 'male' && maleMatch) rangeStr = maleMatch[1].trim();
      else if (genderLower === 'female' && femaleMatch) rangeStr = femaleMatch[1].trim();
    }

    // Parse range
    const rangeMatch = rangeStr.match(/(\d+(\.\d+)?)\s*[-–]\s*(\d+(\.\d+)?)/);
    const lessThanMatch = rangeStr.match(/[<≤]\s*(\d+(\.\d+)?)/);
    const greaterThanMatch = rangeStr.match(/[>≥]\s*(\d+(\.\d+)?)/);

    let min = -Infinity;
    let max = Infinity;

    if (rangeMatch) {
      min = parseFloat(rangeMatch[1]);
      max = parseFloat(rangeMatch[3]);
    } else if (lessThanMatch) {
      max = parseFloat(lessThanMatch[1]);
    } else if (greaterThanMatch) {
      min = parseFloat(greaterThanMatch[1]);
    } else if (!isNaN(parseFloat(rangeStr))) {
      min = parseFloat(rangeStr);
      max = parseFloat(rangeStr);
    }

    if (numValue < min) return { class: 'low', text: 'L' };
    if (numValue > max) return { class: 'high', text: 'H' };
    return { class: 'normal', text: '-' };
  };

  // ─── Report Metadata ─────────────────────────────────────────────
  const reportId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const verificationCode = `NLC-${new Date().getFullYear()}-${reportId}`;
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const patientGender = selectedPatient.gender || 'N/A';

  // Determine lab technician and pathologist
  const labTechName = selectedPatient.verifiedBy || 'Tensae Nebiyou';
  const pathologistName = selectedPatient.verifiedBy 
    ? (selectedPatient.verifiedBy.startsWith('Dr.') ? selectedPatient.verifiedBy : 'Dr. ' + selectedPatient.verifiedBy) 
    : (selectedPatient.physician || 'Dr. DR Natan');
  const physicianName = selectedPatient.physician || 'Referral';

  // ─── Build Test Rows ─────────────────────────────────────────────
  const buildTestSection = (test: any, testIndex: number) => {
    let displayRows: string[] = [];

    const isUrinalysis = test.testName?.toLowerCase().includes('urinalysis') ||
                         test.testName?.toLowerCase().includes('urine') ||
                         test.testName?.toLowerCase().includes('dipstick') ||
                         (typeof test.results === 'object' && test.results?.results &&
                          test.results.results.includes('Colour:')) ||
                         (typeof test.results === 'string' && test.results.includes('Colour:'));

    if (isUrinalysis) {
      const urinalysisString = typeof test.results === 'object' ? test.results.results : test.results;
      if (urinalysisString && typeof urinalysisString === 'string') {
        const urinalysisParameters = [
          { name: 'COLOR', normalRange: 'YEL', unit: '', section: 'Physical' },
          { name: 'APPEARANCE', normalRange: 'CLEAR', unit: '', section: 'Physical' },
          { name: 'pH', normalRange: '5.0 - 8.0', unit: '', section: 'Chemical' },
          { name: 'SPECIFIC GRAVITY', normalRange: '1.015 - 1.025', unit: '', section: 'Chemical' },
          { name: 'PROTEIN', normalRange: 'NEG', unit: '', section: 'Chemical' },
          { name: 'LEUKOCYTE', normalRange: 'NEG', unit: '', section: 'Chemical' },
          { name: 'GLUCOSE', normalRange: 'NEG', unit: '', section: 'Chemical' },
          { name: 'BLOOD', normalRange: 'NEG', unit: '', section: 'Chemical' },
          { name: 'KETONE', normalRange: 'NEG', unit: '', section: 'Chemical' },
          { name: 'BILIRUBIN', normalRange: 'NEG', unit: '', section: 'Chemical' },
          { name: 'UROBILINOGEN', normalRange: 'NEG', unit: '', section: 'Chemical' },
          { name: 'NITRATE', normalRange: 'NEG', unit: '', section: 'Chemical' },
          { name: 'WBC', normalRange: '0 - 5', unit: '/HPF', section: 'Microscopy' },
          { name: 'RBC', normalRange: '0 - 3', unit: '/HPF', section: 'Microscopy' },
          { name: 'EPITHELIAL CELLS', normalRange: '0 - 4', unit: '/HPF', section: 'Microscopy' },
          { name: 'CASTS', normalRange: 'NEG', unit: '', section: 'Microscopy' },
          { name: 'BACTERIA', normalRange: 'NEG', unit: '', section: 'Microscopy' },
          { name: 'CRYSTALS', normalRange: 'NEG', unit: '', section: 'Microscopy' }
        ];
        const paramMappings: Record<string, RegExp> = {
          'COLOR': /Colour:\s*([^;]+)/i,
          'APPEARANCE': /Appearance:\s*([^;]+)/i,
          'pH': /pH:\s*([^;]+)/i,
          'SPECIFIC GRAVITY': /SG:\s*([^;]+)/i,
          'PROTEIN': /Protein:\s*([^;]+)/i,
          'LEUKOCYTE': /Leukocyte:\s*([^;]+)/i,
          'GLUCOSE': /Glucose:\s*([^;]+)/i,
          'BLOOD': /Blood:\s*([^;]+)/i,
          'KETONE': /Ketone:\s*([^;]+)/i,
          'BILIRUBIN': /Bilirubin:\s*([^;]+)/i,
          'UROBILINOGEN': /Urobilinogen:\s*([^;]+)/i,
          'NITRATE': /Nitrate:\s*([^;]+)/i,
          'WBC': /WBC:\s*([^;]+)/i,
          'RBC': /RBC:\s*([^;]+)/i,
          'EPITHELIAL CELLS': /Epithelial Cells:\s*([^;]+)/i,
          'CASTS': /Cast:\s*([^;]+)/i,
          'BACTERIA': /Bacteria:\s*([^;]+)/i,
          'CRYSTALS': /Crystal:\s*([^;]+)/i
        };
        let currentSection = '';
        urinalysisParameters.forEach(param => {
          const regex = paramMappings[param.name];
          if (regex) {
            const match = urinalysisString.match(regex);
            if (match && match[1]) {
              const resultValue = match[1].trim();
              const flag = getResultFlag(resultValue, param.normalRange);
              const resultClass = flag.class === 'high' ? 'result-high' : flag.class === 'low' ? 'result-low' : 'result-normal';
              const flagHtml = renderFlag(flag);
              
              // Section header for urinalysis sub-groups
              let sectionHeader = '';
              if (param.section !== currentSection) {
                currentSection = param.section;
                sectionHeader = `<tr class="section-divider"><td colspan="5">${param.section} Examination</td></tr>`;
              }
              
              displayRows.push(`
                ${sectionHeader}
                <tr>
                  <td class="param-name">${param.name}</td>
                  <td class="result-cell"><span class="${resultClass}">${resultValue}</span></td>
                  <td class="unit-cell">${param.unit || '—'}</td>
                  <td class="range-cell">${param.normalRange}</td>
                  <td class="flag-cell">${flagHtml}</td>
                </tr>
              `);
            }
          }
        });
      }
    } else {
      if (typeof test.results === 'object' && test.results !== null && !Array.isArray(test.results)) {
        if (test.results.results !== undefined && test.results.normalRange !== undefined) {
          const resultValue = String(test.results.results);
          const normalRange = test.results.normalRange || 'Not specified';
          const unit = test.results.unit || test.unit || '—';
          const flag = getResultFlag(resultValue, normalRange, patientGender);
          const resultClass = flag.class === 'high' ? 'result-high' : flag.class === 'low' ? 'result-low' : 'result-normal';
          displayRows.push(`
            <tr>
              <td class="param-name">${test.testName || 'Result'}</td>
              <td class="result-cell"><span class="${resultClass}">${resultValue}</span></td>
              <td class="unit-cell">${unit}</td>
              <td class="range-cell">${normalRange}</td>
              <td class="flag-cell">${renderFlag(flag)}</td>
            </tr>
          `);
        } else {
          displayRows = Object.entries(test.results).map(([key, value]) => {
            const resultValue = String(value);
            const normalRange = test.normalRange || 'Not specified';
            const flag = getResultFlag(resultValue, normalRange, patientGender);
            const resultClass = flag.class === 'high' ? 'result-high' : flag.class === 'low' ? 'result-low' : 'result-normal';
            return `
              <tr>
                <td class="param-name">${key}</td>
                <td class="result-cell"><span class="${resultClass}">${resultValue}</span></td>
                <td class="unit-cell">${test.unit || '—'}</td>
                <td class="range-cell">${normalRange}</td>
                <td class="flag-cell">${renderFlag(flag)}</td>
              </tr>
            `;
          });
        }
      } else {
        const resultValue = String(test.results);
        const normalRange = test.normalRange || 'Not specified';
        const flag = getResultFlag(resultValue, normalRange, patientGender);
        const resultClass = flag.class === 'high' ? 'result-high' : flag.class === 'low' ? 'result-low' :
                            resultValue === 'Pending' ? 'result-pending' :
                            resultValue === 'N/A' ? 'result-na' : 'result-normal';
        displayRows.push(`
          <tr>
            <td class="param-name">${test.testName}</td>
            <td class="result-cell"><span class="${resultClass}">${resultValue}</span></td>
            <td class="unit-cell">${test.unit || '—'}</td>
            <td class="range-cell">${normalRange}</td>
            <td class="flag-cell">${renderFlag(flag)}</td>
          </tr>
        `);
      }
    }

    const statusBadge = test.status === 'Completed' || test.status === 'completed'
      ? '<span class="status-badge status-completed">✓ Completed</span>'
      : `<span class="status-badge status-processing">${test.status || 'Processing'}</span>`;

    const orderDate = test.resultDate || test.orderDate || test.requestDate;
    const formattedDate = orderDate ? new Date(orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    return `
      <div class="test-panel">
        <div class="test-panel-header">
          <div class="test-panel-title">
            <span class="test-number">${testIndex + 1}</span>
            <div>
              <div class="test-name-text">${test.testName}</div>
              <div class="test-meta-text">Ordered by: <strong>${test.orderedBy || 'Unknown'}</strong> &nbsp;·&nbsp; Service: ${test.serviceLocation || 'N/A'} &nbsp;·&nbsp; ${formattedDate}</div>
            </div>
          </div>
          ${statusBadge}
        </div>
        <table class="results-table">
          <thead>
            <tr>
              <th style="width:30%; text-align:left;">PARAMETER</th>
              <th style="width:18%;">RESULT</th>
              <th style="width:12%;">UNIT</th>
              <th style="width:28%;">REFERENCE RANGE</th>
              <th style="width:12%;">FLAG</th>
            </tr>
          </thead>
          <tbody>
            ${displayRows.join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // Flag renderer
  const renderFlag = (flag: { class: string; text: string }) => {
    if (flag.text === 'H') return '<span class="flag-badge flag-high">H</span>';
    if (flag.text === 'L') return '<span class="flag-badge flag-low">L</span>';
    if (flag.text === '⚠') return '<span class="flag-badge flag-abnormal">!</span>';
    return '<span class="flag-normal">—</span>';
  };

  // Count abnormal results
  let abnormalCount = 0;
  let totalParamCount = 0;
  selectedPatient.tests.forEach((test: any) => {
    if (typeof test.results === 'object' && test.results !== null) {
      if (test.results.results !== undefined) {
        totalParamCount++;
        const f = getResultFlag(String(test.results.results), test.results.normalRange || '', patientGender);
        if (f.class !== 'normal') abnormalCount++;
      }
    } else if (test.results && test.results !== 'Pending' && test.results !== 'N/A') {
      totalParamCount++;
      const f = getResultFlag(String(test.results), test.normalRange || '', patientGender);
      if (f.class !== 'normal') abnormalCount++;
    }
  });

  const clinicName = clinic?.fullName || clinic?.name || 'New Life Medium Clinic';
  const clinicAddress = typeof clinic?.address === 'string' ? clinic.address : (clinic?.address?.city || 'Lafto, beside Kebron Guest House');
  const clinicPhone = clinic?.contactPhone || clinic?.phone || '+251925959219';

  // ─── Verification URL & Mobile QR Payload ─────────────────────────
  const compactPayload = {
    c: verificationCode,
    p: selectedPatient.patientName,
    m: selectedPatient.patientId,
    g: patientGender,
    a: selectedPatient.age || '',
    dob: selectedPatient.dob || selectedPatient.dateOfBirth,
    pl: selectedPatient.patientLocation || (selectedPatient.status === 'Inpatient' ? 'Inpatient' : 'Walk-In'),
    sl: clinic?.branch || 'Bole',
    od: selectedPatient.tests?.[0]?.orderDate || selectedPatient.tests?.[0]?.requestDate || new Date().toISOString(),
    rd: new Date().toISOString(),
    tb: labTechName,
    pb: pathologistName,
    req: physicianName,
    t: selectedPatient.tests.map((t: any) => ({
      n: t.testName,
      r: typeof t.results === 'object' && t.results?.results !== undefined ? t.results.results : (typeof t.results === 'string' ? t.results : JSON.stringify(t.results || '')),
      u: t.unit || t.results?.unit || '',
      nr: t.normalRange || t.results?.normalRange || '',
      notes: t.notes || '',
      f: getResultFlag(
        typeof t.results === 'object' && t.results?.results !== undefined ? String(t.results.results) : String(t.results || ''),
        t.normalRange || t.results?.normalRange || '',
        patientGender
      ).text,
      s: t.status || 'Completed'
    })),
    notes: selectedPatient.tests.map((t: any) => t.notes).filter(Boolean).join('; '),
    cl: {
      n: clinicName,
      p: clinicPhone,
      a: clinicAddress
    }
  };

  let encodedData = '';
  try {
    encodedData = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(compactPayload)))));
  } catch (err) {
    console.warn('Could not encode lab report payload:', err);
  }

  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  // Clean short URL (only ~55 chars) creates a crisp, ultra-low density 29x29 module QR code
  // with large high-contrast dots that any mobile camera scans in milliseconds!
  const verificationUrl = `${origin}/verify-lab-report?c=${encodeURIComponent(reportId)}`;

  // Cache in localStorage for instant access
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`lab_report_${reportId}`, JSON.stringify(compactPayload));
      localStorage.setItem(`lab_report_${verificationCode}`, JSON.stringify(compactPayload));
    } catch (_) {}
  }

  // Asynchronously register the report snapshot in the backend database
  if (typeof fetch !== 'undefined') {
    try {
      fetch('/api/public/lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationCode,
          reportId,
          patientName: selectedPatient.patientName,
          patientId: selectedPatient.patientId,
          gender: patientGender,
          age: selectedPatient.age,
          dob: selectedPatient.dob || selectedPatient.dateOfBirth,
          patientLocation: selectedPatient.patientLocation || (selectedPatient.status === 'Inpatient' ? 'Inpatient' : 'Walk-In'),
          serviceLocation: clinic?.branch || 'Bole',
          orderDate: selectedPatient.tests?.[0]?.orderDate || selectedPatient.tests?.[0]?.requestDate || new Date(),
          doneDate: new Date(),
          doneBy: labTechName,
          requestedBy: physicianName,
          reportDate: new Date(),
          reportDoneBy: pathologistName + ' (Pathologist / Lab Director)',
          tests: selectedPatient.tests.map((t: any) => ({
            testName: t.testName,
            results: t.results,
            unit: t.unit || t.results?.unit || '',
            normalRange: t.normalRange || t.results?.normalRange || '',
            notes: t.notes || '',
            flag: getResultFlag(
              typeof t.results === 'object' && t.results?.results !== undefined ? String(t.results.results) : String(t.results || ''),
              t.normalRange || t.results?.normalRange || '',
              patientGender
            ).text,
            status: t.status || 'Completed'
          })),
          summary: {
            totalTests: selectedPatient.tests.length,
            parameters: totalParamCount,
            abnormalCount
          },
          notes: selectedPatient.tests.map((t: any) => t.notes).filter(Boolean).join('; '),
          clinic: {
            name: clinicName,
            fullName: clinic?.fullName || clinicName,
            address: clinicAddress,
            phone: clinicPhone,
            branch: clinic?.branch || 'Bole'
          }
        })
      }).catch(() => {});
    } catch (_) {}
  }

  // ─── Full HTML Document ───────────────────────────────────────────
  return `
    <html>
      <head>
        <title>Lab Report - ${selectedPatient.patientName} - ${verificationCode}</title>
        <style>
          @page { 
            size: A4; 
            margin: 12mm 10mm 18mm 10mm; 
          }
          
          *, *::before, *::after { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
          }

          body {
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            color: #111827;
            font-size: 11px;
            line-height: 1.5;
            background: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .page {
            max-width: 210mm;
            margin: 0 auto;
            background: #ffffff;
            position: relative;
          }

          /* ── Watermark ── */
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 72px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.018);
            white-space: nowrap;
            pointer-events: none;
            z-index: 0;
            letter-spacing: 12px;
            text-transform: uppercase;
          }

          /* ── Section Title ── */
          .section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 14px 0 8px 0;
            padding-bottom: 6px;
            border-bottom: 2.5px solid #1a365d;
          }
          .section-header-icon {
            width: 28px;
            height: 28px;
            background: #1a365d;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
            font-weight: 700;
            flex-shrink: 0;
          }
          .section-header-text {
            font-size: 13px;
            font-weight: 700;
            color: #1a365d;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .section-header-count {
            margin-left: auto;
            font-size: 10px;
            color: #6b7280;
            font-weight: 500;
          }

          /* ── Summary Bar ── */
          .summary-bar {
            display: flex;
            gap: 0;
            margin-bottom: 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            overflow: hidden;
            font-size: 10px;
          }
          .summary-item {
            flex: 1;
            padding: 6px 10px;
            text-align: center;
            border-right: 1px solid #d1d5db;
          }
          .summary-item:last-child { border-right: none; }
          .summary-label {
            font-weight: 500;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            font-size: 8px;
            margin-bottom: 1px;
          }
          .summary-value {
            font-weight: 700;
            font-size: 13px;
            color: #111827;
          }
          .summary-value.abnormal { color: #dc2626; }

          /* ── Test Panel ── */
          .test-panel {
            margin-bottom: 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .test-panel-header {
            background: #f0f4f8;
            padding: 8px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #d1d5db;
          }
          .test-panel-title {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .test-number {
            width: 24px;
            height: 24px;
            background: #1a365d;
            color: #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            flex-shrink: 0;
          }
          .test-name-text {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .test-meta-text {
            font-size: 9px;
            color: #6b7280;
            margin-top: 1px;
          }

          /* ── Status Badges ── */
          .status-badge {
            font-size: 9px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .status-completed {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
          }
          .status-processing {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fcd34d;
          }

          /* ── Results Table ── */
          .results-table {
            width: 100%;
            border-collapse: collapse;
          }
          .results-table thead tr {
            background: #1e293b;
          }
          .results-table th {
            padding: 7px 12px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #ffffff;
            text-align: center;
          }
          .results-table th:first-child { text-align: left; }
          
          .results-table td {
            padding: 7px 12px;
            font-size: 11px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: middle;
          }
          .results-table tr:last-child td { border-bottom: none; }
          .results-table tr:nth-child(even) td { background: #f8fafc; }
          .results-table tr:hover td { background: #f1f5f9; }
          
          .param-name { 
            font-weight: 600; 
            color: #334155; 
            text-align: left; 
            padding-left: 16px !important;
          }
          .result-cell { text-align: center; font-weight: 600; }
          .unit-cell { text-align: center; color: #64748b; font-size: 10px; }
          .range-cell { text-align: center; color: #64748b; font-size: 10px; }
          .flag-cell { text-align: center; }

          /* ── Section Divider (urinalysis sub-groups) ── */
          .section-divider td {
            background: #e2e8f0 !important;
            font-size: 9px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding: 4px 16px !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }

          /* ── Result Values ── */
          .result-normal { font-weight: 700; color: #1e293b; }
          .result-high { font-weight: 800; color: #dc2626; }
          .result-low { font-weight: 800; color: #2563eb; }
          .result-pending { color: #d97706; font-style: italic; font-weight: 500; }
          .result-na { color: #9ca3af; font-style: italic; }

          /* ── Flag Badges ── */
          .flag-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 800;
          }
          .flag-high { 
            background: #fef2f2; 
            color: #dc2626; 
            border: 1.5px solid #fca5a5; 
          }
          .flag-low { 
            background: #eff6ff; 
            color: #2563eb; 
            border: 1.5px solid #93c5fd; 
          }
          .flag-abnormal {
            background: #fffbeb;
            color: #d97706;
            border: 1.5px solid #fcd34d;
          }
          .flag-normal { 
            color: #d1d5db; 
            font-size: 14px; 
          }

          /* ── Notes Section ── */
          .notes-section {
            margin-top: 10px;
            padding: 10px 14px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            border-left: 4px solid #1a365d;
            background: #f8fafc;
            page-break-inside: avoid;
          }
          .notes-title {
            font-size: 10px;
            font-weight: 700;
            color: #1a365d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .notes-text {
            font-size: 10px;
            color: #374151;
            line-height: 1.5;
          }

          /* ── Signature Block ── */
          .signature-section {
            margin-top: 20px;
            padding-top: 10px;
            page-break-inside: avoid;
          }
          .signature-grid {
            display: flex;
            justify-content: space-between;
            gap: 20px;
          }
          .signature-box {
            flex: 1;
            text-align: center;
            padding: 0 10px;
          }
          .sig-line-block {
            border-bottom: 1.5px solid #374151;
            height: 36px;
            margin-bottom: 4px;
            position: relative;
          }
          .sig-title {
            font-size: 10px;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .sig-name {
            font-size: 9px;
            color: #6b7280;
            margin-top: 2px;
          }
          .stamp-box {
            width: 90px;
            height: 90px;
            border: 2px dashed #94a3b8;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
          }
          .stamp-text {
            font-size: 8px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* ── Footer ── */
          .report-footer {
            margin-top: 16px;
            border-top: 2px solid #1a365d;
            padding-top: 10px;
            page-break-inside: avoid;
          }
          .footer-disclaimer {
            font-size: 8.5px;
            color: #6b7280;
            line-height: 1.6;
            text-align: center;
            padding: 6px 20px;
            background: #f9fafb;
            border-radius: 4px;
            margin-bottom: 8px;
            border: 1px solid #e5e7eb;
          }
          .footer-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: #9ca3af;
            padding: 0 4px;
          }
          .footer-clinic {
            font-weight: 600;
            color: #374151;
          }
          .footer-verification {
            font-family: 'Courier New', monospace;
            font-size: 8px;
            color: #6b7280;
            background: #f3f4f6;
            padding: 2px 8px;
            border-radius: 3px;
            border: 1px solid #e5e7eb;
          }

          /* ── Flag Legend ── */
          .flag-legend {
            display: flex;
            gap: 16px;
            align-items: center;
            margin: 8px 0;
            padding: 5px 12px;
            background: #f9fafb;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
            font-size: 9px;
          }
          .flag-legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #6b7280;
          }
          .flag-legend-label { font-weight: 500; }

          /* ══════════ Print Styles ══════════ */
          @media print {
            @page { size: A4; margin: 10mm; }
            
            body { 
              font-size: 11px; 
              background: white !important; 
            }
            
            .page { max-width: 100%; }
            
            .watermark { 
              color: rgba(0, 0, 0, 0.015) !important; 
            }
            
            .test-panel { 
              border: 1px solid #999 !important;
              page-break-inside: avoid; 
            }
            .test-panel-header {
              background: #f0f4f8 !important;
              -webkit-print-color-adjust: exact !important;
            }
            .test-number {
              background: #1a365d !important;
              color: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
            }
            .results-table thead tr {
              background: #1e293b !important;
              -webkit-print-color-adjust: exact !important;
            }
            .results-table th {
              color: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
            }
            .results-table td { border-bottom: 1px solid #ccc !important; }
            .results-table tr:nth-child(even) td { background: #f8fafc !important; }
            
            .result-high { color: #dc2626 !important; }
            .result-low { color: #2563eb !important; }
            
            .flag-high { 
              background: #fef2f2 !important; 
              color: #dc2626 !important; 
              border: 1.5px solid #fca5a5 !important;
              -webkit-print-color-adjust: exact !important;
            }
            .flag-low { 
              background: #eff6ff !important; 
              color: #2563eb !important; 
              border: 1.5px solid #93c5fd !important;
              -webkit-print-color-adjust: exact !important;
            }
            
            .summary-bar { border: 1px solid #999 !important; }
            .summary-item { border-right: 1px solid #999 !important; }
            
            .section-header { border-bottom: 2.5px solid #1a365d !important; }
            .section-header-icon {
              background: #1a365d !important;
              color: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
            }
            
            .status-completed {
              background: #dcfce7 !important;
              color: #166534 !important;
              border: 1px solid #86efac !important;
              -webkit-print-color-adjust: exact !important;
            }
            .status-processing {
              background: #fef3c7 !important;
              color: #92400e !important;
              border: 1px solid #fcd34d !important;
              -webkit-print-color-adjust: exact !important;
            }
            
            .sig-line-block { border-bottom: 1.5px solid #333 !important; }
            .stamp-box { border: 2px dashed #999 !important; }
            
            .report-footer { border-top: 2px solid #1a365d !important; }
            .footer-disclaimer { 
              background: #f9fafb !important; 
              border: 1px solid #ccc !important; 
            }
            
            .notes-section { 
              border: 1px solid #ccc !important;
              border-left: 4px solid #1a365d !important;
              background: #f8fafc !important;
              -webkit-print-color-adjust: exact !important;
            }
            
            .section-divider td {
              background: #e2e8f0 !important;
              -webkit-print-color-adjust: exact !important;
            }
          }
          
          ${getMedicalReportHeaderStyles()}
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Watermark -->
          <div class="watermark">${clinicName}</div>
          
          <!-- Official Medical Header -->
          ${generateMedicalReportHeaderHTML({
            reportTitle: 'LABORATORY Report',
            clinic,
            patient: {
              name: selectedPatient.patientName,
              mrn: selectedPatient.patientId,
              dob: selectedPatient.dob,
              age: selectedPatient.age,
              gender: patientGender,
              patientLocation: selectedPatient.patientLocation || (selectedPatient.status === 'Inpatient' ? 'Inpatient' : 'Walk-In'),
              serviceLocation: clinic?.branch || 'Bole'
            },
            reportInfo: {
              modalityLabel: 'LAB',
              orderDateTime: selectedPatient.tests?.[0]?.orderDate || selectedPatient.tests?.[0]?.requestDate || new Date(),
              fileNo: formatFileNo(selectedPatient.patientId, reportId),
              doneDateTime: new Date(),
              doneBy: labTechName,
              requestedBy: physicianName,
              reportDateTime: new Date(),
              reportDoneBy: pathologistName + ' (Pathologist / Lab Director)'
            },
            qrCodeData: verificationUrl
          })}

          <!-- Summary Bar -->
          <div class="summary-bar">
            <div class="summary-item">
              <div class="summary-label">Total Tests</div>
              <div class="summary-value">${selectedPatient.tests.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Parameters</div>
              <div class="summary-value">${totalParamCount > 0 ? totalParamCount : selectedPatient.tests.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Abnormal</div>
              <div class="summary-value ${abnormalCount > 0 ? 'abnormal' : ''}">${abnormalCount}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Patient</div>
              <div class="summary-value" style="font-size:10px;">${patientGender !== 'N/A' ? patientGender.charAt(0).toUpperCase() + patientGender.slice(1) : 'N/A'}${selectedPatient.age ? ', ' + selectedPatient.age + ' Yr' : ''}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Report ID</div>
              <div class="summary-value" style="font-size:10px; font-family: 'Courier New', monospace;">${verificationCode}</div>
            </div>
          </div>

          <!-- Results Section -->
          <div class="section-header">
            <div class="section-header-icon">⚕</div>
            <div class="section-header-text">Laboratory Results</div>
            <div class="section-header-count">${selectedPatient.tests.length} test${selectedPatient.tests.length > 1 ? 's' : ''} performed</div>
          </div>

          <!-- Flag Legend -->
          <div class="flag-legend">
            <span style="font-weight:600; color:#374151; margin-right:4px;">Legend:</span>
            <div class="flag-legend-item">
              <span class="flag-badge flag-high" style="width:16px;height:16px;font-size:8px;">H</span>
              <span class="flag-legend-label">High</span>
            </div>
            <div class="flag-legend-item">
              <span class="flag-badge flag-low" style="width:16px;height:16px;font-size:8px;">L</span>
              <span class="flag-legend-label">Low</span>
            </div>
            <div class="flag-legend-item">
              <span class="flag-badge flag-abnormal" style="width:16px;height:16px;font-size:8px;">!</span>
              <span class="flag-legend-label">Abnormal</span>
            </div>
            <div class="flag-legend-item">
              <span class="flag-normal" style="font-size:12px;">—</span>
              <span class="flag-legend-label">Normal</span>
            </div>
          </div>

          <!-- Test Panels -->
          ${selectedPatient.tests.map((test: any, index: number) => buildTestSection(test, index)).join('')}

          <!-- Notes -->
          ${selectedPatient.tests.some((t: any) => t.notes) ? `
            <div class="notes-section">
              <div class="notes-title">📋 Clinical Notes / Remarks</div>
              ${selectedPatient.tests.filter((t: any) => t.notes).map((t: any) => `
                <div class="notes-text"><strong>${t.testName}:</strong> ${t.notes}</div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="signature-grid">
              <div class="signature-box">
                <div class="sig-line-block"></div>
                <div class="sig-title">Lab Technician</div>
                <div class="sig-name">${labTechName}</div>
              </div>
              <div class="signature-box">
                <div class="sig-line-block"></div>
                <div class="sig-title">Pathologist / Lab Director</div>
                <div class="sig-name">${pathologistName}</div>
              </div>
              <div class="signature-box">
                <div class="stamp-box">
                  <div class="stamp-text">Official<br/>Stamp</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="report-footer">
            <div class="footer-disclaimer">
              <strong>DISCLAIMER:</strong> This report is intended for the referring physician. Laboratory results should be interpreted in conjunction with clinical findings. 
              Results may vary based on specimen quality, collection time, and patient conditions. 
              For any queries regarding this report, please contact the laboratory directly. 
              This report is confidential and intended solely for the use of the addressee.
            </div>
            <div class="footer-bottom">
              <div>
                <span class="footer-clinic">${clinicName} — Laboratory Report System</span>
                <br/>
                <span>Generated on ${reportDate} at ${reportTime}</span>
              </div>
              <div class="footer-verification">
                Verification: ${verificationCode}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
