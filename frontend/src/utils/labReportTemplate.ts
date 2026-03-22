// Professional Lab Report Template
export const generateProfessionalLabReportHTML = (selectedPatient: any) => {
  const getResultFlag = (value: string, normalRange: string) => {
    if (!value || !normalRange || normalRange === 'Not specified' || normalRange.trim() === '') {
      return { class: 'normal', text: '-' };
    }

    const numValue = parseFloat(value);
    
    // Handle qualitative results (e.g., Blood Group, HIV status)
    const lowerValue = value.toLowerCase();
    const lowerNormalRange = normalRange.toLowerCase();

    // Check if the value is explicitly mentioned in the normal range string (e.g., "o+ve" in "a, b, ab, o")
    if (isNaN(numValue) && lowerNormalRange.includes(lowerValue)) {
        return { class: 'normal', text: '-' };
    }
    // Specific qualitative checks
    if (lowerNormalRange === 'negative' && lowerValue === 'negative') {
        return { class: 'normal', text: '-' };
    }
    if (lowerNormalRange === 'positive' && lowerValue === 'positive') {
        return { class: 'normal', text: '-' };
    }
    // If it's a qualitative result and doesn't match normal range, it's abnormal
    if (isNaN(numValue) && !lowerNormalRange.includes(lowerValue)) {
        return { class: 'high', text: 'H' }; // Assuming abnormal qualitative is 'high' or 'abnormal'
    }

    // Handle quantitative results
    if (isNaN(numValue)) { // If it's not a number and not handled by qualitative checks
      return { class: 'normal', text: '-' };
    }

    // Parse normalRange string (e.g., "70-100 mg/dL", "<70", ">100")
    const rangeMatch = normalRange.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/); // Matches "70-100" or "7.0-10.5"
    const lessThanMatch = normalRange.match(/<(\d+(\.\d+)?)/); // Matches "<70"
    const greaterThanMatch = normalRange.match(/>(\d+(\.\d+)?)/); // Matches ">100"

    let min = -Infinity;
    let max = Infinity;

    if (rangeMatch) {
      min = parseFloat(rangeMatch[1]);
      max = parseFloat(rangeMatch[3]);
    } else if (lessThanMatch) {
      max = parseFloat(lessThanMatch[1]);
      min = -Infinity;
    } else if (greaterThanMatch) {
      min = parseFloat(greaterThanMatch[1]);
      max = Infinity;
    }
    // If normalRange is a single value (e.g., "100"), treat as exact match or range 100-100
    else if (!isNaN(parseFloat(normalRange))) {
        min = parseFloat(normalRange);
        max = parseFloat(normalRange);
    }
    
    if (numValue < min) {
      return { class: 'low', text: 'L' };
    } else if (numValue > max) {
      return { class: 'high', text: 'H' };
    } else {
      return { class: 'normal', text: '-' };
    }
  };

  const reportId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return `
    <html>
      <head>
        <title>Lab Report - ${selectedPatient.patientName}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1f2937;
            font-size: 11px;
            line-height: 1.5;
            background: white;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .page {
            max-width: 100%;
            background: white;
          }

          /* ── Header ── */
          .header {
            background: #1e293b;
            color: white;
            padding: 14px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .header-left { display: flex; align-items: center; gap: 12px; }
          .header-logo {
            width: 40px; height: 40px;
            background: rgba(255,255,255,0.15);
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; font-weight: bold; color: white;
            border: 1px solid rgba(255,255,255,0.2);
          }
          .header-clinic-name { font-size: 16px; font-weight: 700; color: white; }
          .header-subtitle { font-size: 11px; color: #94a3b8; margin-top: 2px; }
          .header-contact { font-size: 10px; color: #64748b; margin-top: 3px; }
          .header-right { text-align: right; }
          .header-date { font-size: 11px; color: #94a3b8; }
          .report-id-badge {
            display: inline-block;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            padding: 3px 8px;
            font-family: monospace;
            font-size: 11px;
            color: #e2e8f0;
            margin-top: 4px;
          }

          /* ── Patient Info ── */
          .patient-section {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 10px;
          }
          .patient-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
          }
          .patient-card {
            background: white;
            border: 1px solid #dbeafe;
            border-radius: 6px;
            padding: 6px 8px;
          }
          .patient-card-label {
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 2px;
          }
          .patient-card-value {
            font-size: 12px;
            font-weight: 600;
            color: #111827;
          }
          .not-recorded { color: #9ca3af; font-style: italic; font-weight: 400; }

          /* ── Section Title ── */
          .section-title {
            font-size: 12px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 2px solid #e5e7eb;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* ── Test Block ── */
          .test-block {
            margin-bottom: 10px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            border-left: 4px solid #6366f1;
          }
          .test-block-header {
            background: #f8fafc;
            padding: 7px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e5e7eb;
          }
          .test-name { font-size: 12px; font-weight: 700; color: #1e293b; }
          .test-meta { font-size: 10px; color: #6b7280; margin-top: 2px; }
          .test-badge {
            font-size: 9px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 20px;
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
          }

          /* ── Results Table ── */
          .results-table {
            width: 100%;
            border-collapse: collapse;
          }
          .results-table thead tr {
            background: #374151;
            color: white;
          }
          .results-table th {
            padding: 7px 10px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .results-table th:first-child { text-align: left; }
          .results-table th:not(:first-child) { text-align: center; }
          .results-table td {
            padding: 6px 10px;
            font-size: 11px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
          }
          .results-table td:first-child { font-weight: 500; color: #374151; }
          .results-table td:not(:first-child) { text-align: center; }
          .results-table tr:last-child td { border-bottom: none; }
          .results-table tr:nth-child(even) td { background: #f9fafb; }
          
          .result-normal { font-weight: 600; color: #374151; }
          .result-high { font-weight: 700; color: #dc2626; }
          .result-low { font-weight: 700; color: #2563eb; }
          .result-pending { color: #d97706; font-style: italic; }
          .result-na { color: #9ca3af; font-style: italic; }

          /* ── Flag Badges ── */
          .flag-badge {
            display: inline-block;
            width: 20px; height: 20px;
            border-radius: 50%;
            font-size: 10px;
            font-weight: 700;
            text-align: center;
            line-height: 20px;
          }
          .flag-H { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
          .flag-L { background: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe; }
          .flag-N { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
          .flag-dash { color: #9ca3af; font-size: 12px; }

          /* ── Footer ── */
          .footer {
            background: #1e293b;
            color: #94a3b8;
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            margin-top: 12px;
            border-radius: 0 0 8px 8px;
          }
          .footer-sig {
            text-align: center;
          }
          .sig-line {
            border-bottom: 1px solid #475569;
            width: 100px;
            height: 24px;
            margin-bottom: 3px;
          }
          .sig-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

          @media print {
            @page { size: A4; margin: 8mm; }
            body { font-size: 11px; }
            .header { background: #1e293b !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
            .results-table thead tr { background: #374151 !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
            .flag-H { background: #fee2e2 !important; -webkit-print-color-adjust: exact !important; }
            .flag-L { background: #dbeafe !important; -webkit-print-color-adjust: exact !important; }
            .flag-N { background: #dcfce7 !important; -webkit-print-color-adjust: exact !important; }
            .patient-section { background: #eff6ff !important; -webkit-print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="header-logo">N</div>
              <div>
                <div class="header-clinic-name">New Life Medium Clinic</div>
                <div class="header-subtitle">Comprehensive Laboratory Report</div>
                <div class="header-contact">Lafto, beside Kebron Guest House &nbsp;·&nbsp; +251925959219</div>
              </div>
            </div>
            <div class="header-right">
              <div class="header-date">${reportDate} at ${reportTime}</div>
              <div class="report-id-badge"># ${reportId}</div>
            </div>
          </div>

          <!-- Patient Info -->
          <div class="patient-section">
            <div class="patient-grid">
              <div class="patient-card">
                <div class="patient-card-label">Patient Name</div>
                <div class="patient-card-value">${selectedPatient.patientName || '<span class="not-recorded">Not recorded</span>'}</div>
              </div>
              <div class="patient-card">
                <div class="patient-card-label">Patient ID</div>
                <div class="patient-card-value" style="font-family:monospace">${selectedPatient.patientId || '<span class="not-recorded">N/A</span>'}</div>
              </div>
              <div class="patient-card">
                <div class="patient-card-label">Gender</div>
                <div class="patient-card-value">${selectedPatient.gender || '<span class="not-recorded">Not recorded</span>'}</div>
              </div>
              <div class="patient-card">
                <div class="patient-card-label">Age</div>
                <div class="patient-card-value">${selectedPatient.age ? selectedPatient.age + ' yrs' : '<span class="not-recorded">Not recorded</span>'}</div>
              </div>
              <div class="patient-card">
                <div class="patient-card-label">Date of Birth</div>
                <div class="patient-card-value">${selectedPatient.dob || '<span class="not-recorded">Not recorded</span>'}</div>
              </div>
            </div>
          </div>

          <!-- Results -->
          <div class="section-title">Laboratory Results</div>
          ${selectedPatient.tests.map(test => {
            let displayRows: string[] = [];

            // Check if this is a urinalysis test
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
                  { name: 'COLOR', normalRange: 'YEL', unit: '' },
                  { name: 'APPEARANCE', normalRange: 'CLEAR', unit: '' },
                  { name: 'pH', normalRange: '5.0 - 8.0', unit: '' },
                  { name: 'SPECIFIC GRAVITY', normalRange: '1.015 - 1.025', unit: '' },
                  { name: 'PROTEIN', normalRange: 'NEG', unit: '' },
                  { name: 'LEUKOCYTE', normalRange: 'NEG', unit: '' },
                  { name: 'GLUCOSE', normalRange: 'NEG', unit: '' },
                  { name: 'BLOOD', normalRange: 'NEG', unit: '' },
                  { name: 'KETONE', normalRange: 'NEG', unit: '' },
                  { name: 'BILIRUBIN', normalRange: 'NEG', unit: '' },
                  { name: 'UROBILINOGEN', normalRange: 'NEG', unit: '' },
                  { name: 'NITRATE', normalRange: 'NEG', unit: '' },
                  { name: 'WBC', normalRange: '0 - 5', unit: '/HPF' },
                  { name: 'RBC', normalRange: '0 - 3', unit: '/HPF' },
                  { name: 'EPITHELIAL CELLS', normalRange: '0 - 4', unit: '/HPF' },
                  { name: 'CASTS', normalRange: 'NEG', unit: '' },
                  { name: 'BACTERIA', normalRange: 'NEG', unit: '' },
                  { name: 'CRYSTALS', normalRange: 'NEG', unit: '' }
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
                urinalysisParameters.forEach(param => {
                  const regex = paramMappings[param.name];
                  if (regex) {
                    const match = urinalysisString.match(regex);
                    if (match && match[1]) {
                      const resultValue = match[1].trim();
                      const flag = getResultFlag(resultValue, param.normalRange);
                      const resultClass = flag.class === 'high' ? 'result-high' : flag.class === 'low' ? 'result-low' : 'result-normal';
                      const flagHtml = flag.text === 'H' ? '<span class="flag-badge flag-H">H</span>' :
                                       flag.text === 'L' ? '<span class="flag-badge flag-L">L</span>' :
                                       flag.text === 'N' ? '<span class="flag-badge flag-N">N</span>' :
                                       '<span class="flag-dash">—</span>';
                      displayRows.push(`
                        <tr>
                          <td>${param.name}</td>
                          <td><span class="${resultClass}">${resultValue}</span></td>
                          <td>${param.unit || '—'}</td>
                          <td>${param.normalRange}</td>
                          <td>${flagHtml}</td>
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
                  const flag = getResultFlag(resultValue, normalRange);
                  const resultClass = flag.class === 'high' ? 'result-high' : flag.class === 'low' ? 'result-low' : 'result-normal';
                  const flagHtml = flag.text === 'H' ? '<span class="flag-badge flag-H">H</span>' :
                                   flag.text === 'L' ? '<span class="flag-badge flag-L">L</span>' :
                                   flag.text === 'N' ? '<span class="flag-badge flag-N">N</span>' :
                                   '<span class="flag-dash">—</span>';
                  displayRows.push(`
                    <tr>
                      <td>${test.testName || 'Result'}</td>
                      <td><span class="${resultClass}">${resultValue}</span></td>
                      <td>${unit}</td>
                      <td>${normalRange}</td>
                      <td>${flagHtml}</td>
                    </tr>
                  `);
                } else {
                  displayRows = Object.entries(test.results).map(([key, value]) => {
                    const resultValue = String(value);
                    const normalRange = test.normalRange || 'Not specified';
                    const flag = getResultFlag(resultValue, normalRange);
                    const resultClass = flag.class === 'high' ? 'result-high' : flag.class === 'low' ? 'result-low' : 'result-normal';
                    const flagHtml = flag.text === 'H' ? '<span class="flag-badge flag-H">H</span>' :
                                     flag.text === 'L' ? '<span class="flag-badge flag-L">L</span>' :
                                     flag.text === 'N' ? '<span class="flag-badge flag-N">N</span>' :
                                     '<span class="flag-dash">—</span>';
                    return `
                      <tr>
                        <td>${key}</td>
                        <td><span class="${resultClass}">${resultValue}</span></td>
                        <td>${test.unit || '—'}</td>
                        <td>${normalRange}</td>
                        <td>${flagHtml}</td>
                      </tr>
                    `;
                  });
                }
              } else {
                const resultValue = String(test.results);
                const normalRange = test.normalRange || 'Not specified';
                const flag = getResultFlag(resultValue, normalRange);
                const resultClass = flag.class === 'high' ? 'result-high' : flag.class === 'low' ? 'result-low' : 
                                    resultValue === 'Pending' ? 'result-pending' : 
                                    resultValue === 'N/A' ? 'result-na' : 'result-normal';
                const flagHtml = flag.text === 'H' ? '<span class="flag-badge flag-H">H</span>' :
                                 flag.text === 'L' ? '<span class="flag-badge flag-L">L</span>' :
                                 flag.text === 'N' ? '<span class="flag-badge flag-N">N</span>' :
                                 '<span class="flag-dash">—</span>';
                displayRows.push(`
                  <tr>
                    <td>${test.testName}</td>
                    <td><span class="${resultClass}">${resultValue}</span></td>
                    <td>${test.unit || '—'}</td>
                    <td>${normalRange}</td>
                    <td>${flagHtml}</td>
                  </tr>
                `);
              }
            }

            const statusBadge = test.status === 'Completed' || test.status === 'completed' 
              ? '<span class="test-badge">Results Available</span>'
              : `<span class="test-badge" style="background:#fef3c7;color:#92400e;border-color:#fde68a;">${test.status || 'Processing'}</span>`;

            return `
              <div class="test-block">
                <div class="test-block-header">
                  <div>
                    <div class="test-name">${test.testName}</div>
                    <div class="test-meta">Ordered by: ${test.orderedBy || 'Unknown'} &nbsp;·&nbsp; ${test.resultDate || test.orderDate ? new Date(test.resultDate || test.orderDate).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  ${statusBadge}
                </div>
                <table class="results-table">
                  <thead>
                    <tr>
                      <th>PARAMETER</th>
                      <th>RESULT</th>
                      <th>UNIT</th>
                      <th>NORMAL RANGE</th>
                      <th>FLAG</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${displayRows.join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}

          <!-- Footer -->
          <div class="footer">
            <div>
              <div style="color:#e2e8f0;font-weight:600;">New Life Medium Clinic — Lab Report System</div>
              <div style="margin-top:2px;">Generated on ${reportDate} at ${reportTime}</div>
            </div>
            <div style="display:flex;gap:24px;">
              <div class="footer-sig">
                <div class="sig-line"></div>
                <div class="sig-label">Lab Technician</div>
              </div>
              <div class="footer-sig">
                <div class="sig-line"></div>
                <div class="sig-label">Physician</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
