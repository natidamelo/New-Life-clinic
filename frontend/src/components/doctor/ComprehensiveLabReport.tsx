import React, { useState, useEffect } from 'react';
import { formatDate } from '../../utils/formatters';
import { PatientLabResults, StandardLabResult } from '../../services/labService';
import { Copy, Printer, Download, Search, RefreshCw, X, FlaskConical, User, Calendar, Hash, ChevronDown, ChevronUp, Activity, TestTube, Microscope, Heart, Shield, Beaker } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ComprehensiveLabReportProps {
  patientResults: PatientLabResults;
  onClose: () => void;
}

const LOGO_PATH = '/assets/images/logo.jpg';
const LOGO_FALLBACK = '/assets/images/logo-placeholder.svg';

const ComprehensiveLabReport: React.FC<ComprehensiveLabReportProps> = ({ patientResults, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Auto-expand only when there is a single test; with multiple tests start collapsed
    if (patientResults.tests?.length === 1) {
      setExpandedTests(new Set(patientResults.tests.map(t => t._id)));
    } else {
      setExpandedTests(new Set());
    }
  }, [patientResults]);

  // Function to handle printing the report
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to print reports');
      return;
    }
    
    setIsExporting(true);
    
    // Safety timeout to reset isExporting if something goes wrong
    const safetyTimeout = setTimeout(() => {
      setIsExporting(false);
    }, 30000); // 30 seconds timeout - increased from 10 seconds
    
    // Get the report content
    const reportContent = document.getElementById('lab-report-content');
    if (!reportContent) {
      alert('Could not find report content to print');
      setIsExporting(false);
      clearTimeout(safetyTimeout);
      return;
    }
    
    // Add print-specific styling
    printWindow.document.write(`
      <html>
        <head>
          <title>Lab Report - ${patientResults.patientName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
              font-size: 12px;
            }
            .report-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #444;
            }
            .report-header-left {
              display: flex;
              align-items: center;
            }
            .report-title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 3px;
              color: #222;
            }
            .clinic-info {
              font-size: 12px;
              margin-bottom: 3px;
            }
            .clinic-location {
              font-size: 11px;
              color: #555;
            }
            .clinic-phone {
              font-size: 11px;
              color: #555;
            }
            .clinic-logo {
              max-width: 80px;
              max-height: 80px;
              margin-right: 15px;
            }
            .patient-info {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 6px;
              margin-top: 10px;
              padding: 10px;
              background-color: #f9f9f9;
              border-radius: 4px;
              border: 1px solid #e0e0e0;
              font-size: 11px;
              margin-bottom: 15px;
            }
            .info-item {
              margin-bottom: 4px;
            }
            .info-label {
              font-weight: bold;
              display: inline-block;
              min-width: 90px;
            }
            .missing-data {
              color: #888;
              font-style: italic;
            }
            .results-title {
              font-size: 14px;
              font-weight: bold;
              margin-top: 15px;
              margin-bottom: 5px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 3px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px; 
              font-size: 11px;
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold;
              text-align: left;
              padding: 6px;
              border: 1px solid #ddd;
            }
            td { 
              padding: 6px; 
              border: 1px solid #ddd; 
              text-align: left; 
            }
            .test-header {
              background-color: #f5f5f5;
              font-weight: bold;
              padding: 8px;
              margin-top: 12px;
              margin-bottom: 4px;
              border-radius: 4px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-left: 4px solid #3b82f6;
            }
            .test-date {
              color: #666;
              font-size: 10px;
            }
            .flag-high { color: #dc2626; font-weight: bold; }
            .flag-low { color: #2563eb; font-weight: bold; }
            .flag-normal { color: #16a34a; font-weight: bold; }
            .flag-none { color: #666; }
            .lab-meta {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #666;
              margin-top: 30px;
              padding-top: 8px;
              border-top: 1px solid #ddd;
            }
            @media print {
              button { display: none; }
              body { margin: 0; padding: 15px; }
              .page-break { page-break-after: always; }
            }
            .print-btn {
              padding: 10px 20px;
              background-color: #3b82f6;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 14px;
              cursor: pointer;
              margin-top: 15px;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            .print-btn:hover {
              background-color: #2563eb;
            }
            .print-instructions {
              text-align: center;
              margin-top: 10px;
              font-style: italic;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="report-header-left">
              <img src="${LOGO_PATH}" class="clinic-logo" alt="New Life Medium Clinic Logo" onerror="this.onerror=null; this.src='${LOGO_FALLBACK}';" />
              <div>
                <div class="report-title">New Life Medium Clinic</div>
                <div class="clinic-info">Comprehensive Lab Report</div>
                <div class="clinic-location">Location: Lafto, beside Kebron Guest House</div>
                <div class="clinic-phone">Phone: +251925959219</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div>Date: ${new Date().toLocaleDateString()}</div>
              <div>Report ID: ${(patientResults as any).reportId || Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
            </div>
          </div>
          
          <div class="patient-info">
            <div class="info-item"><span class="info-label">Patient Name:</span> ${patientResults.patientName || '<span class="missing-data">Not recorded</span>'}</div>
            <div class="info-item"><span class="info-label">Patient ID:</span> ${patientResults.patientId || '<span class="missing-data">Not recorded</span>'}</div>
            <div class="info-item"><span class="info-label">Gender:</span> ${patientResults.gender || '<span class="missing-data">Not recorded</span>'}</div>
            <div class="info-item"><span class="info-label">Age:</span> ${patientResults.age || '<span class="missing-data">Not recorded</span>'}</div>
            <div class="info-item"><span class="info-label">Date of Birth:</span> ${patientResults.dob ? formatDate(patientResults.dob) : '<span class="missing-data">Not recorded</span>'}</div>
                                  </div>
            
            <div class="results-title">Results</div>
            
            ${generateResultsTableHtml(patientResults.tests, false)}
            
            <div class="lab-meta">
            <div>
              <div>Physician: ${patientResults.physician || 'Not specified'}</div>
              <div>Verified by: ${patientResults.verifiedBy || patientResults.physician || 'Not specified'}</div>
            </div>
            <div>
              <div>New Life Medium Clinic - Lab Report System</div>
              <div>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <button class="print-btn" id="printButton" style="background-color: #3b82f6; color: white; border: none; border-radius: 4px; font-size: 14px; padding: 10px 20px; cursor: pointer; margin-bottom: 10px;">Print Report</button>
            <div class="print-instructions" style="text-align: center; margin-top: 10px; font-style: italic; color: #666;">Click the button above to print this report</div>
          </div>
          
          <script>
            // Wait for the document to be fully loaded
            document.addEventListener('DOMContentLoaded', function() {
              // Add flag colors
              document.querySelectorAll('td:last-child').forEach(cell => {
                const flag = cell.textContent.trim();
                if (flag === 'H') cell.classList.add('flag-high');
                else if (flag === 'L') cell.classList.add('flag-low');
                else if (flag === 'N') cell.classList.add('flag-normal');
              });
              
              // Set up print button
              document.getElementById('printButton').addEventListener('click', function() {
                // Hide the button and instructions before printing
                this.style.display = 'none';
                document.querySelector('.print-instructions').style.display = 'none';
                
                // Trigger print dialog
                window.print();
                
                // Signal to parent window
                window.opener.postMessage('print-initiated', '*');
                
                // Show button again after print dialog is closed
                setTimeout(function() {
                  document.getElementById('printButton').style.display = 'block';
                  document.querySelector('.print-instructions').style.display = 'block';
                }, 1000);
              });
            });
            
            // Handle afterprint event
            window.addEventListener('afterprint', function() {
              window.opener.postMessage('print-complete', '*');
            });
            
            // Handle visibilitychange (tab/window switching)
            document.addEventListener('visibilitychange', function() {
              if (document.visibilityState === 'hidden') {
                window.opener.postMessage('print-complete', '*');
              }
            });
            
            // Don't auto-close the window - let the user close it manually
            // or use the very long timeout as a fallback
            setTimeout(() => {
              window.opener.postMessage('print-complete', '*');
              // Keep window open, don't auto-close
            }, 300000); // 5 minute timeout as absolute fallback
          </script>
        </body>
      </html>
    `);
    
    // Make sure document is properly closed
    printWindow.document.close();

    // Handle various messages from the print window
    const messageHandler = function(e) {
      if (e.data === 'print-initiated' || e.data === 'print-complete') {
        if (e.data === 'print-complete') {
          setIsExporting(false);
          clearTimeout(safetyTimeout);
          window.removeEventListener('message', messageHandler);
        }
      }
    };
    
    window.addEventListener('message', messageHandler);
  };

  // Function to handle downloading the report as PDF
  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;
      
      // Create a temporary container for the PDF content
      const container = document.createElement('div');
      
      // Use the same HTML generation function we use for printing
      container.innerHTML = generateResultsTableHtml(patientResults.tests, true);
      
      // Add some additional styling
      const style = document.createElement('style');
      style.textContent = `
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 15px; 
          font-size: 11px;
        }
        th { 
          background-color: #f2f2f2; 
          font-weight: bold;
          text-align: left;
          padding: 6px;
          border: 1px solid #ddd;
        }
        td { 
          padding: 6px; 
          border: 1px solid #ddd; 
          text-align: left; 
        }
        .test-header { 
          background-color: #f5f5f5;
          font-weight: bold;
          padding: 8px;
          margin-top: 12px;
          margin-bottom: 4px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-left: 4px solid #3b82f6;
        }
        .flag-high { color: #dc2626; }
        .flag-low { color: #2563eb; }
        .flag-normal { color: #16a34a; }
      `;
      container.appendChild(style);
      
      // Configure PDF options
      const opt = {
        margin: 10,
        filename: `Lab_Report_${patientResults.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Generate and download the PDF
      await html2pdf().from(container).set(opt).save();
      setIsExporting(false);
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Error generating PDF. Please try again.");
      setIsExporting(false);
    }
  };

  // Function to copy results to clipboard
  const handleCopyResults = () => {
    const resultText = patientResults.tests.map(test => {
      const resultDetails = Object.entries(test.results || {})
        .map(([key, value]: [string, any]) => {
          const valueText = value.value || value;
          const unit = (value as any).unit || '';
          const normalRange = (value as any).normalRange || '';
          return `${key}: ${valueText}${unit ? ' ' + unit : ''}${normalRange ? ' (Normal: ' + normalRange + ')' : ''}`;
        })
        .join('\n');

      return `Test: ${test.testName}\nDate: ${formatDate(test.resultDate || test.orderDate)}\nResults:\n${resultDetails}\n`;
    }).join('\n---\n');

    navigator.clipboard.writeText(resultText)
      .then(() => alert('Results copied to clipboard'))
      .catch(err => console.error('Failed to copy results:', err));
  };

  // Filter tests based on search term
  const filteredTests = patientResults.tests.filter(test => 
    test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (test.category && test.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Category color/style config
  const getCategoryConfig = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'hematology':
        return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', icon: <Activity size={18} className="text-red-500" />, accent: 'border-l-red-500' };
      case 'chemistry':
        return { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: <Beaker size={18} className="text-blue-500" />, accent: 'border-l-blue-500' };
      case 'microbiology':
        return { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: <Microscope size={18} className="text-green-500" />, accent: 'border-l-green-500' };
      case 'urinalysis':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: <TestTube size={18} className="text-yellow-600" />, accent: 'border-l-yellow-500' };
      case 'immunology':
        return { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: <Shield size={18} className="text-purple-500" />, accent: 'border-l-purple-500' };
      case 'cardiology':
        return { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700', icon: <Heart size={18} className="text-pink-500" />, accent: 'border-l-pink-500' };
      case 'endocrinology':
        return { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', icon: <FlaskConical size={18} className="text-indigo-500" />, accent: 'border-l-indigo-500' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700', icon: <FlaskConical size={18} className="text-gray-500" />, accent: 'border-l-gray-400' };
    }
  };

  // Function to get category icon (kept for backward compat)
  const getCategoryIcon = (category?: string) => {
    const config = getCategoryConfig(category);
    return (
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.bg} border ${config.border}`}>
        {config.icon}
      </div>
    );
  };

  // Function to create comprehensive urinalysis section
  const createUrinalysisSection = (urinalysisTests: any[]) => {
    if (urinalysisTests.length === 0) return null;

    // Standard urinalysis parameters with their normal ranges
    const urinalysisParameters = [
      { name: 'COLOR', normalRange: 'YEL', unit: '' },
      { name: 'APPEARANCE', normalRange: 'CLEAR', unit: '' },
      { name: 'SPECIFIC GRAVITY', normalRange: '1.015 - 1.025', unit: '' },
      { name: 'PH', normalRange: '5.0 - 6.0', unit: '' },
      { name: 'NITRITE', normalRange: 'NEG', unit: '' },
      { name: 'LEUKOCYTE', normalRange: 'NEG', unit: '' },
      { name: 'PROTEIN', normalRange: 'NEG', unit: '' },
      { name: 'GLUCOSE', normalRange: 'NEG', unit: '' },
      { name: 'KETONES', normalRange: 'NEG', unit: '' },
      { name: 'UROBILINOGEN', normalRange: '0.1 - 0.8', unit: 'mg/dL' },
      { name: 'BILIRUBIN', normalRange: 'NEG', unit: '' },
      { name: 'BLOOD U', normalRange: 'NEG', unit: '' },
      { name: 'WBC', normalRange: '0 - 4', unit: '' },
      { name: 'RBC', normalRange: '0 - 4', unit: '' },
      { name: 'EPITHELIAL CELLS', normalRange: '0 - 4', unit: '' },
      { name: 'BACTERIA', normalRange: 'NEG', unit: '' },
      { name: 'CASTS', normalRange: '0 - 2', unit: '' },
      { name: 'CRYSTALS', normalRange: 'NEG', unit: '' },
      { name: 'OTHERS', normalRange: 'N/A', unit: '' }
    ];

    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4 overflow-hidden border-l-4 border-l-amber-400">
        {/* Urinalysis Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100">
              <TestTube size={16} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Urinalysis</h3>
              <p className="text-xs text-gray-400">Comprehensive urine analysis</p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">Urinalysis</span>
        </div>

        {/* Urinalysis Results Table */}
        <div className="p-3">
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Parameter</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Result</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Normal Range</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Flag</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {urinalysisParameters.map((param, index) => {
                    
                    let matchingResult = null;
                    let resultValue = 'N/A';
                    let flag = '-';
                    let unit = param.unit;

                    // First, try to find a test that matches the parameter name
                    for (const test of urinalysisTests) {
                      if (test.results && typeof test.results === 'object') {
                        // Look for exact parameter name matches
                        const paramKey = Object.keys(test.results).find(key => 
                          key.toLowerCase() === param.name.toLowerCase() ||
                          key.toLowerCase() === param.name.toLowerCase().replace(/\s+/g, '_') ||
                          key.toLowerCase() === param.name.toLowerCase().replace(/\s+/g, '') ||
                          key.toLowerCase().includes(param.name.toLowerCase().split(' ')[0])
                        );

                        if (paramKey) {
                          matchingResult = test;
                          const result = test.results[paramKey];
                          
                          if (typeof result === 'object' && result !== null) {
                            resultValue = result.value || result.result || result;
                            unit = result.unit || param.unit;
                          } else {
                            resultValue = result;
                          }
                          break;
                        }
                      }
                    }

                    // If no direct match, try to extract from urinalysis result strings
                    if (resultValue === 'N/A' && urinalysisTests.length > 0) {
                      const urinalysisTest = urinalysisTests[0];
                      if (urinalysisTest.results && typeof urinalysisTest.results === 'string') {
                        const resultString = urinalysisTest.results;
                        
                        // Parse common urinalysis result formats
                        const paramMappings = {
                          'COLOR': /Colour:\s*([^;]+)/i,
                          'APPEARANCE': /Appearance:\s*([^;]+)/i,
                          'PH': /pH:\s*([^;]+)/i,
                          'SPECIFIC GRAVITY': /SG:\s*([^;]+)/i,
                          'PROTEIN': /Protein:\s*([^;]+)/i,
                          'LEUKOCYTE': /Leukocyte:\s*([^;]+)/i,
                          'GLUCOSE': /Glucose:\s*([^;]+)/i,
                          'BLOOD U': /Blood:\s*([^;]+)/i,
                          'KETONES': /Ketone:\s*([^;]+)/i,
                          'BILIRUBIN': /Bilirubin:\s*([^;]+)/i,
                          'UROBILINOGEN': /Urobilinogen:\s*([^;]+)/i,
                          'NITRITE': /Nitrate:\s*([^;]+)/i,
                          'WBC': /WBC:\s*([^;]+)/i,
                          'RBC': /RBC:\s*([^;]+)/i,
                          'EPITHELIAL CELLS': /Epithelial Cells:\s*([^;]+)/i,
                          'CASTS': /Cast:\s*([^;]+)/i,
                          'BACTERIA': /Bacteria:\s*([^;]+)/i,
                          'CRYSTALS': /Crystal:\s*([^;]+)/i
                        };

                        const regex = paramMappings[param.name];
                        if (regex) {
                          const match = resultString.match(regex);
                          if (match && match[1]) {
                            resultValue = match[1].trim();
                            matchingResult = urinalysisTest;
                          }
                        }
                      }
                    }

                    // If still no result, try to extract from the actual data structure
                    if (resultValue === 'N/A') {
                      for (const test of urinalysisTests) {
                        if (test.results) {
                          let testResultString = '';
                          if (typeof test.results === 'string') {
                            testResultString = test.results;
                          } else if (typeof test.results === 'object') {
                            testResultString = test.results.results || test.results.value || test.results.result || test.results.resultString || JSON.stringify(test.results);
                          }
                          
                          // Try to parse the actual urinalysis string
                          if (testResultString && testResultString.includes(';')) {
                            const paramMappings = {
                              'COLOR': /Colour:\s*([^;]+)/i,
                              'APPEARANCE': /Appearance:\s*([^;]+)/i,
                              'PH': /pH:\s*([^;]+)/i,
                              'SPECIFIC GRAVITY': /SG:\s*([^;]+)/i,
                              'PROTEIN': /Protein:\s*([^;]+)/i,
                              'LEUKOCYTE': /Leukocyte:\s*([^;]+)/i,
                              'GLUCOSE': /Glucose:\s*([^;]+)/i,
                              'BLOOD U': /Blood:\s*([^;]+)/i,
                              'KETONES': /Ketone:\s*([^;]+)/i,
                              'BILIRUBIN': /Bilirubin:\s*([^;]+)/i,
                              'UROBILINOGEN': /Urobilinogen:\s*([^;]+)/i,
                              'NITRITE': /Nitrate:\s*([^;]+)/i,
                              'WBC': /WBC:\s*([^;]+)/i,
                              'RBC': /RBC:\s*([^;]+)/i,
                              'EPITHELIAL CELLS': /Epithelial Cells:\s*([^;]+)/i,
                              'CASTS': /Cast:\s*([^;]+)/i,
                              'BACTERIA': /Bacteria:\s*([^;]+)/i,
                              'CRYSTALS': /Crystal:\s*([^;]+)/i
                            };

                            const regex = paramMappings[param.name];
                            if (regex) {
                              const match = testResultString.match(regex);
                              if (match && match[1]) {
                                resultValue = match[1].trim();
                                matchingResult = test;
                                break;
                              }
                            }
                          }
                        }
                      }
                      
                      // If still no real data, don't show the row
                      if (resultValue === 'N/A') {
                        return null;
                      }
                    }

                    // Determine flag based on result and normal range
                    if (resultValue !== 'N/A' && param.normalRange !== 'N/A') {
                      if (param.normalRange.includes('-')) {
                        const [min, max] = param.normalRange.split(' - ').map(v => parseFloat(v));
                        const numValue = parseFloat(resultValue);
                        if (!isNaN(numValue) && !isNaN(min) && !isNaN(max)) {
                          if (numValue < min) flag = 'L';
                          else if (numValue > max) flag = 'H';
                          else flag = 'N';
                        }
                      } else if (param.normalRange === 'NEG') {
                        if (resultValue !== 'NEG' && resultValue !== 'Negative' && resultValue !== 'NEGATIVE' && resultValue !== '-') {
                          flag = 'H';
                        } else {
                          flag = 'N';
                        }
                      } else if (param.normalRange === 'YEL' && resultValue.toLowerCase() === 'yellow') {
                        flag = 'N';
                      } else if (param.normalRange === 'CLEAR' && resultValue.toLowerCase() === 'clear') {
                        flag = 'N';
                      }
                    }

                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{param.name}</td>
                        <td className="px-4 py-2.5 text-sm text-center">
                          <span className={`font-semibold ${
                            flag === 'H' ? 'text-red-600' : 
                            flag === 'L' ? 'text-blue-600' : 
                            flag === 'N' ? 'text-emerald-600' : 
                            'text-gray-700'
                          }`}>
                            {resultValue}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-center text-gray-500">{unit || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-center text-gray-500">{param.normalRange}</td>
                        <td className="px-4 py-2.5 text-center">
                          {flag === 'H' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">H</span>}
                          {flag === 'L' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">L</span>}
                          {flag === 'N' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">N</span>}
                          {flag === '-' && <span className="text-gray-400 text-sm">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Function to format result value with color based on normal range
  const formatResultValue = (value: any, normalRange?: string) => {
    if (!value || !normalRange) return <span>{value}</span>;
    
    // Try to parse the value as a number
    const numValue = parseFloat(value.toString());
    if (isNaN(numValue)) return <span>{value}</span>;
    
    // Try to parse the normal range
    let min: number | undefined;
    let max: number | undefined;
    
    // Handle different normal range formats
    if (normalRange.includes('-')) {
      const [minStr, maxStr] = normalRange.split('-').map(s => s.trim());
      min = parseFloat(minStr);
      max = parseFloat(maxStr);
    } else if (normalRange.includes('<')) {
      max = parseFloat(normalRange.replace('<', '').trim());
    } else if (normalRange.includes('>')) {
      min = parseFloat(normalRange.replace('>', '').trim());
    }
    
    // Determine if the value is out of range
    const isLow = min !== undefined && numValue < min;
    const isHigh = max !== undefined && numValue > max;
    
    if (isLow) {
      return <span className="text-primary font-semibold">{value} ↓</span>;
    } else if (isHigh) {
      return <span className="text-destructive font-semibold">{value} ↑</span>;
    }
    
    return <span className="text-primary">{value}</span>;
  };

  // Extract unit from normalRange if available
  const extractUnitFromNormalRange = (normalRange: string) => {
    if (!normalRange || typeof normalRange !== 'string') return '';
    
    // Common units in lab tests - ordered by specificity to avoid partial matches
    const unitPatterns = [
      'mg/dL', 'g/dL', 'mmol/L', 'ng/mL', 'pg/mL', 'mIU/L', 'U/L', 'IU/L', 
      'mEq/L', '%', 'mmHg', 'fL', 'mcL', '10^3/mcL', '10^6/mcL', 'mL/min',
      'mm/hr', 'µmol/L', 'pmol/L', 'g/L', 'IU/mL', 'mg/L', '10^3/µL'
    ];
    
    // Try exact matches first
    for (const unit of unitPatterns) {
      if (normalRange.includes(unit)) {
        return unit;
      }
    }
    
    // Fall back to regex pattern matching for more complex cases
    const unitMatch = normalRange.match(/[0-9.-]+\s*([a-zA-Z/%]+\/[a-zA-Z]+|[a-zA-Z/%]+)/);
    return unitMatch && unitMatch[1] ? unitMatch[1].trim() : '';
  };
  
  // Clean normal range by removing the unit part if it's already displayed separately
  const cleanNormalRange = (normalRange: string, unit: string) => {
    if (!normalRange || typeof normalRange !== 'string' || !unit) return normalRange || '-';
    
    // Remove the unit from the normal range to avoid duplication
    return normalRange.replace(unit, '').trim() || normalRange;
  };

  // Function to determine appropriate flag based on result value and normal range
  const determineFlag = (value: any, normalRange?: string) => {
    if (!value || !normalRange || typeof normalRange !== 'string') return '-';
    
    // Try to convert value to a number for comparison
    const numericValue = parseFloat(value.toString());
    if (isNaN(numericValue)) return '-';
    
    // Clean up the normal range by removing units and extra spaces
    const cleanNormalRange = normalRange.replace(/[a-zA-Z/%]+\/[a-zA-Z]+|[a-zA-Z/%]+/g, '').trim();
    
    // Different normal range formats:
    
    // Format 1: Simple range like "70-100"
    const rangePattern = /^\s*([0-9.]+)\s*-\s*([0-9.]+)\s*$/;
    const rangeMatch = cleanNormalRange.match(rangePattern);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      
      if (numericValue < min) return 'L';
      if (numericValue > max) return 'H';
      return 'N';
    }
    
    // Format 2: Less than comparison like "< 5.0" or "<= 5.0"
    const lessThanPattern = /^\s*<\s*=?\s*([0-9.]+)\s*$/;
    const lessThanMatch = cleanNormalRange.match(lessThanPattern);
    if (lessThanMatch) {
      const threshold = parseFloat(lessThanMatch[1]);
      // For "<=" we consider the threshold itself normal
      if (cleanNormalRange.includes('<=')) {
        return numericValue <= threshold ? 'N' : 'H';
      }
      // For "<" the threshold is high
      return numericValue < threshold ? 'N' : 'H';
    }
    
    // Format 3: Greater than comparison like "> 120" or ">= 120"
    const greaterThanPattern = /^\s*>\s*=?\s*([0-9.]+)\s*$/;
    const greaterThanMatch = cleanNormalRange.match(greaterThanPattern);
    if (greaterThanMatch) {
      const threshold = parseFloat(greaterThanMatch[1]);
      // For ">=" we consider the threshold itself normal
      if (cleanNormalRange.includes('>=')) {
        return numericValue >= threshold ? 'N' : 'L';
      }
      // For ">" the threshold is low
      return numericValue > threshold ? 'N' : 'L';
    }
    
    // Format 4: Multiple ranges like "M: 13.5-17.5, F: 12.0-15.5"
    // For this case, we attempt to extract just the first range
    const multiRangePattern = /[0-9.]+\s*-\s*[0-9.]+/;
    const multiRangeMatch = cleanNormalRange.match(multiRangePattern);
    if (multiRangeMatch) {
      // Extract just this range and recursively call determineFlag
      return determineFlag(value, multiRangeMatch[0]);
    }
    
    // If we can't interpret the range format, return a dash
    return '-';
  };

  // Helper function to extract units from normal range strings
  const extractUnit = (normalRange: string) => {
    if (!normalRange || typeof normalRange !== 'string') return '-';
    
    // Common units in lab tests - ordered by specificity to avoid partial matches
    const unitPatterns = [
      'mg/dL', 'g/dL', 'mmol/L', 'ng/mL', 'pg/mL', 'mIU/L', 'U/L', 'IU/L', 
      'mEq/L', '%', 'mmHg', 'fL', 'mcL', '10^3/mcL', '10^6/mcL', 'mL/min',
      'mm/hr', 'µmol/L', 'pmol/L', 'g/L', 'IU/mL', 'mg/L', '10^3/µL',
      'K/uL', 'M/uL'
    ];
    
    // Try exact matches first
    for (const unit of unitPatterns) {
      if (normalRange.includes(unit)) {
        return unit;
      }
    }
    
    // Fall back to regex pattern matching for more complex cases
    const unitMatch = normalRange.match(/[0-9.-]+\s*([a-zA-Z/%]+\/[a-zA-Z]+|[a-zA-Z/%]+)/);
    return unitMatch && unitMatch[1] ? unitMatch[1].trim() : '-';
  };

  // Function to create default result rows if none are present
  // Function to get WHO standard reference ranges (same as in LabDashboard)
  const getSuggestedReferenceRange = (testName: string): string => {
    const lowerCaseName = testName.toLowerCase();
    
    // Hematology tests (WHO standards)
    if (lowerCaseName.includes('hemoglobin')) {
      return 'Male: 13.0-17.0 g/dL, Female: 12.0-15.0 g/dL';
    }
    if (lowerCaseName.includes('hematocrit')) {
      return 'Male: 39-49%, Female: 36-46%';
    }
    if (lowerCaseName.includes('platelet')) {
      return '150,000-400,000/μL';
    }
    if (lowerCaseName.includes('wbc') || lowerCaseName.includes('white blood cell')) {
      return '4,000-10,000/μL';
    }
    if (lowerCaseName.includes('rbc') || lowerCaseName.includes('red blood cell')) {
      return 'Male: 4.5-5.9 × 10^6/μL, Female: 4.0-5.2 × 10^6/μL';
    }
    if (lowerCaseName.includes('mcv')) {
      return '80-100 fL';
    }
    if (lowerCaseName.includes('mch')) {
      return '27-33 pg';
    }
    if (lowerCaseName.includes('mchc')) {
      return '32-36 g/dL';
    }
    if (lowerCaseName.includes('rdw')) {
      return '11.5-14.5%';
    }
    if (lowerCaseName.includes('neutrophil')) {
      return '40-70%';
    }
    if (lowerCaseName.includes('lymphocyte')) {
      return '20-40%';
    }
    if (lowerCaseName.includes('monocyte')) {
      return '2-8%';
    }
    if (lowerCaseName.includes('eosinophil')) {
      return '1-4%';
    }
    if (lowerCaseName.includes('basophil')) {
      return '0.5-1%';
    }
    
    // Chemistry tests (WHO standards)
    if (lowerCaseName.includes('glucose') && lowerCaseName.includes('fast')) {
      return '70-100 mg/dL';
    }
    if (lowerCaseName.includes('glucose') && !lowerCaseName.includes('fast')) {
      return '70-140 mg/dL';
    }
    if (lowerCaseName.includes('hba1c') || lowerCaseName.includes('a1c')) {
      return '< 6.5%';
    }
    if (lowerCaseName.includes('sodium')) {
      return '135-145 mmol/L';
    }
    if (lowerCaseName.includes('potassium')) {
      return '3.5-5.1 mmol/L';
    }
    if (lowerCaseName.includes('chloride')) {
      return '98-107 mmol/L';
    }
    if (lowerCaseName.includes('bicarbonate') || lowerCaseName.includes('co2')) {
      return '23-29 mmol/L';
    }
    if (lowerCaseName.includes('urea') || lowerCaseName.includes('bun')) {
      return '6-20 mg/dL';
    }
    if (lowerCaseName.includes('creatinine')) {
      return 'Male: 0.7-1.2 mg/dL, Female: 0.5-1.0 mg/dL';
    }
    if (lowerCaseName.includes('cholesterol')) {
      return 'Total: < 200 mg/dL';
    }
    if (lowerCaseName.includes('triglyceride')) {
      return '< 150 mg/dL';
    }
    if (lowerCaseName.includes('hdl')) {
      return 'Male: > 40 mg/dL, Female: > 50 mg/dL';
    }
    if (lowerCaseName.includes('ldl')) {
      return '< 100 mg/dL';
    }
    if (lowerCaseName.includes('albumin')) {
      return '3.5-5.0 g/dL';
    }
    if (lowerCaseName.includes('total protein')) {
      return '6.0-8.3 g/dL';
    }
    if (lowerCaseName.includes('uric acid')) {
      return 'Male: 3.4-7.0 mg/dL, Female: 2.4-6.0 mg/dL';
    }
    
    // Immunology tests (WHO standards)
    if (lowerCaseName.includes('hiv')) {
      return 'Non-reactive';
    }
    if (lowerCaseName.includes('c-reactive protein') || lowerCaseName.includes('crp')) {
      return '< 5 mg/L';
    }
    if (lowerCaseName.includes('esr') || lowerCaseName.includes('sedimentation rate')) {
      return 'Male: 0-15 mm/hr, Female: 0-20 mm/hr';
    }
    if (lowerCaseName.includes('rheumatoid factor')) {
      return '< 14 IU/mL';
    }
    if (lowerCaseName.includes('antinuclear antibody') || lowerCaseName.includes('ana')) {
      return 'Negative';
    }
    
    // Liver function tests (WHO standards)
    if (lowerCaseName.includes('alt') || lowerCaseName.includes('alanine')) {
      return 'Male: 10-40 U/L, Female: 7-35 U/L';
    }
    if (lowerCaseName.includes('ast') || lowerCaseName.includes('aspartate')) {
      return 'Male: 12-38 U/L, Female: 10-35 U/L';
    }
    if (lowerCaseName.includes('alp') || lowerCaseName.includes('alkaline phosphatase')) {
      return 'Adult: 40-129 U/L';
    }
    if (lowerCaseName.includes('ggt') || lowerCaseName.includes('gamma-glutamyl transferase')) {
      return 'Male: 8-61 U/L, Female: 5-36 U/L';
    }
    if (lowerCaseName.includes('bilirubin') && lowerCaseName.includes('total')) {
      return '0.1-1.2 mg/dL';
    }
    if (lowerCaseName.includes('bilirubin') && lowerCaseName.includes('direct')) {
      return '0.0-0.3 mg/dL';
    }
    if (lowerCaseName.includes('bilirubin') && lowerCaseName.includes('indirect')) {
      return '0.1-0.9 mg/dL';
    }
    
    // Thyroid function tests (WHO standards)
    if (lowerCaseName.includes('tsh')) {
      return '0.4-4.0 mIU/L';
    }
    if (lowerCaseName.includes('t3') || lowerCaseName.includes('triiodothyronine')) {
      return '80-200 ng/dL';
    }
    if (lowerCaseName.includes('t4') || lowerCaseName.includes('thyroxine')) {
      return '5.0-12.0 μg/dL';
    }
    if (lowerCaseName.includes('free t3')) {
      return '2.3-4.2 pg/mL';
    }
    if (lowerCaseName.includes('free t4')) {
      return '0.8-1.8 ng/dL';
    }
    
    // Electrolytes (WHO standards)
    if (lowerCaseName.includes('calcium')) {
      return '8.5-10.5 mg/dL';
    }
    if (lowerCaseName.includes('magnesium')) {
      return '1.7-2.2 mg/dL';
    }
    if (lowerCaseName.includes('phosphorus') || lowerCaseName.includes('phosphate')) {
      return '2.5-4.5 mg/dL';
    }
    if (lowerCaseName.includes('iron')) {
      return 'Male: 60-170 μg/dL, Female: 50-170 μg/dL';
    }
    if (lowerCaseName.includes('ferritin')) {
      return 'Male: 20-250 ng/mL, Female: 10-120 ng/mL';
    }
    if (lowerCaseName.includes('vitamin d') || lowerCaseName.includes('25-oh vitamin d')) {
      return '30-100 ng/mL';
    }
    if (lowerCaseName.includes('vitamin b12')) {
      return '200-900 pg/mL';
    }
    if (lowerCaseName.includes('folate') || lowerCaseName.includes('folic acid')) {
      return '2.0-20.0 ng/mL';
    }
    
    // Cardiac markers (WHO standards)
    if (lowerCaseName.includes('troponin')) {
      return '< 0.04 ng/mL';
    }
    if (lowerCaseName.includes('ck-mb')) {
      return '< 5.0 ng/mL';
    }
    if (lowerCaseName.includes('bnp') || lowerCaseName.includes('brain natriuretic peptide')) {
      return '< 100 pg/mL';
    }
    
    // Kidney function (WHO standards)
    if (lowerCaseName.includes('egfr') || lowerCaseName.includes('estimated glomerular filtration rate')) {
      return '> 90 mL/min/1.73m²';
    }
    if (lowerCaseName.includes('cystatin c')) {
      return '0.53-0.95 mg/L';
    }
    
    // Urinalysis (WHO standards)
    if (lowerCaseName.includes('urinalysis') || lowerCaseName.includes('urine')) {
      return 'See specific parameters below';
    }
    if (lowerCaseName.includes('urine ph')) {
      return '4.5-8.0';
    }
    if (lowerCaseName.includes('specific gravity')) {
      return '1.005-1.030';
    }
    if (lowerCaseName.includes('urine protein')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine glucose')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine blood')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine ketone')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine leukocyte')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('urine nitrite')) {
      return 'Negative';
    }
    
    // Stool tests (WHO standards)
    if (lowerCaseName.includes('stool') || lowerCaseName.includes('fecal')) {
      return 'See specific parameters below';
    }
    if (lowerCaseName.includes('occult blood')) {
      return 'Negative';
    }
    if (lowerCaseName.includes('ova and parasite')) {
      return 'Negative';
    }
    
    // Microbiology (WHO standards)
    if (lowerCaseName.includes('culture') && lowerCaseName.includes('blood')) {
      return 'No growth';
    }
    if (lowerCaseName.includes('culture') && lowerCaseName.includes('urine')) {
      return '< 10,000 CFU/mL';
    }
    if (lowerCaseName.includes('culture') && lowerCaseName.includes('sputum')) {
      return 'Normal flora';
    }
    
    // Default - return empty string for unknown tests
    return '';
  };

  // Helper function to get WHO standard reference ranges (accessible to HTML generation)
  const getWHOReferenceRange = (testName: string): string => {
    return getSuggestedReferenceRange(testName);
  };

  const createDefaultResults = (test: StandardLabResult) => {
    // If there are no results but there's a normalRange, create a default result
    if ((!test.results || Object.keys(test.results).length === 0) && test.normalRange) {
      // Use test name as parameter name, or "Result" if not available
      const paramName = test.testName || "Result";
      return [{
        paramName,
        resultValue: "See Reception",
        unit: extractUnit(test.normalRange) || '-',
        normalRange: test.normalRange || '-',
        flag: '-'
      }];
    }
    
    // If there are results in an older format (direct value), create a row for it
    if (test.results && typeof test.results !== 'object') {
      // Try to get WHO standard reference range if normalRange is missing
      const whoRange = test.normalRange || getSuggestedReferenceRange(test.testName);
      const unit = extractUnit(whoRange || '');
      return [{
        paramName: test.testName || "Result",
        resultValue: test.results,
        unit: unit || '-',
        normalRange: whoRange || '-',
        flag: determineFlag(test.results, whoRange) || '-'
      }];
    }
    
    // Legacy format: results is an object with 'results' as a property
    if (test.results && typeof test.results === 'object' && 'results' in test.results) {
      const whoRange = test.normalRange || test.results.normalRange || getSuggestedReferenceRange(test.testName);
      const unit = extractUnit(whoRange || '');
      return [{
        paramName: test.testName || "Result",
        resultValue: test.results.results,
        unit: unit || '-',
        normalRange: whoRange || '-',
        flag: determineFlag(test.results.results, whoRange) || '-'
      }];
    }
    
    // If we have a status but no results, show appropriate message
    if (test.status === 'Completed' || test.status === 'completed') {
      return [{
        paramName: test.testName || "Result",
        resultValue: "See Reception",
        unit: '-',
        normalRange: '-',
        flag: '-'
      }];
    }
    
    // For pending tests
    return [{
      paramName: test.testName || "Result",
      resultValue: "Pending",
      unit: '-',
      normalRange: '-',
      flag: '-'
    }];
  };

  // Function to generate urinalysis print section
  function generateUrinalysisPrintSection(urinalysisTests) {
    
    const urinalysisParameters = [
      { name: 'COLOR', normalRange: 'YEL', unit: '' },
      { name: 'APPEARANCE', normalRange: 'CLEAR', unit: '' },
      { name: 'SPECIFIC GRAVITY', normalRange: '1.015 - 1.025', unit: '' },
      { name: 'PH', normalRange: '5.0 - 6.0', unit: '' },
      { name: 'NITRITE', normalRange: 'NEG', unit: '' },
      { name: 'LEUKOCYTE', normalRange: 'NEG', unit: '' },
      { name: 'PROTEIN', normalRange: 'NEG', unit: '' },
      { name: 'GLUCOSE', normalRange: 'NEG', unit: '' },
      { name: 'KETONES', normalRange: 'NEG', unit: '' },
      { name: 'UROBILINOGEN', normalRange: '0.1 - 0.8', unit: 'mg/dL' },
      { name: 'BILIRUBIN', normalRange: 'NEG', unit: '' },
      { name: 'BLOOD U', normalRange: 'NEG', unit: '' },
      { name: 'WBC', normalRange: '0 - 4', unit: '' },
      { name: 'RBC', normalRange: '0 - 4', unit: '' },
      { name: 'EPITHELIAL CELLS', normalRange: '0 - 4', unit: '' },
      { name: 'BACTERIA', normalRange: 'NEG', unit: '' },
      { name: 'CASTS', normalRange: '0 - 2', unit: '' },
      { name: 'CRYSTALS', normalRange: 'NEG', unit: '' },
      { name: 'OTHERS', normalRange: 'N/A', unit: '' }
    ];

    let html = `
      <tr>
        <td colspan="5" class="test-header" style="background-color: #f5f5f5; font-weight: bold; padding: 8px; margin-top: 12px; margin-bottom: 4px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #3b82f6;">
          <div>MY LAB CHECK - URINALYSIS</div>
          <div class="test-date" style="color: #666; font-size: 10px;">${formatDate(urinalysisTests[0]?.resultDate || urinalysisTests[0]?.orderDate)}</div>
        </td>
      </tr>
    `;

    // Generate urinalysis parameter rows
    urinalysisParameters.forEach((param, index) => {
      let matchingResult = null;
      let resultValue = 'N/A';
      let flag = '-';
      let unit = param.unit;

      // First, try to find a test that matches the parameter name
      for (const test of urinalysisTests) {
        
        if (test.results && typeof test.results === 'object') {
          // Look for exact parameter name matches
          const paramKey = Object.keys(test.results).find(key => 
            key.toLowerCase() === param.name.toLowerCase() ||
            key.toLowerCase() === param.name.toLowerCase().replace(/\s+/g, '_') ||
            key.toLowerCase() === param.name.toLowerCase().replace(/\s+/g, '') ||
            key.toLowerCase().includes(param.name.toLowerCase().split(' ')[0])
          );

          if (paramKey) {
            matchingResult = test;
            const result = test.results[paramKey];
            
            if (typeof result === 'object' && result !== null) {
              resultValue = result.value || result.result || result;
              unit = result.unit || param.unit;
            } else {
              resultValue = result;
            }
            break;
          }
        }
      }

      // If no direct match, try to extract from urinalysis result strings
      if (resultValue === 'N/A' && urinalysisTests.length > 0) {
        const urinalysisTest = urinalysisTests[0];
        if (urinalysisTest.results && typeof urinalysisTest.results === 'string') {
          const resultString = urinalysisTest.results;
          
          // Parse common urinalysis result formats
          const paramMappings = {
            'COLOR': /Colour:\s*([^;]+)/i,
            'APPEARANCE': /Appearance:\s*([^;]+)/i,
            'PH': /pH:\s*([^;]+)/i,
            'SPECIFIC GRAVITY': /SG:\s*([^;]+)/i,
            'PROTEIN': /Protein:\s*([^;]+)/i,
            'LEUKOCYTE': /Leukocyte:\s*([^;]+)/i,
            'GLUCOSE': /Glucose:\s*([^;]+)/i,
            'BLOOD U': /Blood:\s*([^;]+)/i,
            'KETONES': /Ketone:\s*([^;]+)/i,
            'BILIRUBIN': /Bilirubin:\s*([^;]+)/i,
            'UROBILINOGEN': /Urobilinogen:\s*([^;]+)/i,
            'NITRITE': /Nitrate:\s*([^;]+)/i,
            'WBC': /WBC:\s*([^;]+)/i,
            'RBC': /RBC:\s*([^;]+)/i,
            'EPITHELIAL CELLS': /Epithelial Cells:\s*([^;]+)/i,
            'CASTS': /Cast:\s*([^;]+)/i,
            'BACTERIA': /Bacteria:\s*([^;]+)/i,
            'CRYSTALS': /Crystal:\s*([^;]+)/i
          };

          const regex = paramMappings[param.name];
          if (regex) {
            const match = resultString.match(regex);
            if (match && match[1]) {
              resultValue = match[1].trim();
              matchingResult = urinalysisTest;
            }
          }
        }
      }

      // If still no result, try to extract from the actual data structure
      if (resultValue === 'N/A') {
        for (const test of urinalysisTests) {
          if (test.results) {
            let testResultString = '';
            if (typeof test.results === 'string') {
              testResultString = test.results;
            } else if (typeof test.results === 'object') {
              testResultString = test.results.value || test.results.result || test.results.resultString || test.results.results || JSON.stringify(test.results);
            }
            
            // Try to parse the actual urinalysis string
            if (testResultString && testResultString.includes(';')) {
              const paramMappings = {
                'COLOR': /Colour:\s*([^;]+)/i,
                'APPEARANCE': /Appearance:\s*([^;]+)/i,
                'PH': /pH:\s*([^;]+)/i,
                'SPECIFIC GRAVITY': /SG:\s*([^;]+)/i,
                'PROTEIN': /Protein:\s*([^;]+)/i,
                'LEUKOCYTE': /Leukocyte:\s*([^;]+)/i,
                'GLUCOSE': /Glucose:\s*([^;]+)/i,
                'BLOOD U': /Blood:\s*([^;]+)/i,
                'KETONES': /Ketone:\s*([^;]+)/i,
                'BILIRUBIN': /Bilirubin:\s*([^;]+)/i,
                'UROBILINOGEN': /Urobilinogen:\s*([^;]+)/i,
                'NITRITE': /Nitrate:\s*([^;]+)/i,
                'WBC': /WBC:\s*([^;]+)/i,
                'RBC': /RBC:\s*([^;]+)/i,
                'EPITHELIAL CELLS': /Epithelial Cells:\s*([^;]+)/i,
                'CASTS': /Cast:\s*([^;]+)/i,
                'BACTERIA': /Bacteria:\s*([^;]+)/i,
                'CRYSTALS': /Crystal:\s*([^;]+)/i
              };

              const regex = paramMappings[param.name];
              if (regex) {
                const match = testResultString.match(regex);
                if (match && match[1]) {
                  resultValue = match[1].trim();
                  matchingResult = test;
                  break;
                }
              }
            }
          }
        }
        
        // If still no real data, don't show the row
        if (resultValue === 'N/A') {
          return;
        }
      }

      // Determine flag based on result and normal range
      if (resultValue !== 'N/A' && param.normalRange !== 'N/A') {
        if (param.normalRange.includes('-')) {
          const [min, max] = param.normalRange.split(' - ').map(v => parseFloat(v));
          const numValue = parseFloat(resultValue);
          if (!isNaN(numValue) && !isNaN(min) && !isNaN(max)) {
            if (numValue < min) flag = 'L';
            else if (numValue > max) flag = 'H';
            else flag = 'N';
          }
        } else if (param.normalRange === 'NEG') {
          if (resultValue !== 'NEG' && resultValue !== 'Negative' && resultValue !== 'NEGATIVE' && resultValue !== '-') {
            flag = 'H';
          } else {
            flag = 'N';
          }
        } else if (param.normalRange === 'YEL' && resultValue.toLowerCase() === 'yellow') {
          flag = 'N';
        } else if (param.normalRange === 'CLEAR' && resultValue.toLowerCase() === 'clear') {
          flag = 'N';
        }
      }


      let flagClass = '';
      if (flag === 'H') flagClass = 'flag-high';
      else if (flag === 'L') flagClass = 'flag-low';
      else if (flag === 'N') flagClass = 'flag-normal';
      else flagClass = 'flag-none';

      html += `
        <tr>
          <td>${param.name}</td>
          <td style="${flag === 'H' ? 'color: #dc2626; font-weight: bold;' : flag === 'L' ? 'color: #2563eb; font-weight: bold;' : flag === 'N' ? 'color: #16a34a; font-weight: bold;' : ''}">${resultValue}</td>
          <td>${unit}</td>
          <td>${param.normalRange}</td>
          <td class="${flagClass}">${flag}</td>
        </tr>
      `;
    });

    return html;
  }

  // Function to generate the HTML for the results table
  function generateResultsTableHtml(tests, includeHeader = true) {
    
    let html = '';
    
    // Generate the header only if requested
    if (includeHeader) {
      html += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #444;">
          <div style="display: flex; align-items: center;">
            <img src="${LOGO_PATH}" style="max-width: 80px; max-height: 80px; margin-right: 15px;" alt="New Life Medium Clinic Logo" onerror="this.onerror=null; this.src='${LOGO_FALLBACK}';" />
            <div>
              <div style="font-size: 20px; font-weight: bold; margin-bottom: 3px; color: #222;">New Life Medium Clinic</div>
              <div style="font-size: 12px; margin-bottom: 3px;">Comprehensive Lab Report</div>
              <div style="font-size: 11px; color: #555;">Location: Lafto, beside Kebron Guest House</div>
              <div style="font-size: 11px; color: #555;">Phone: +251925959219</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div>Date: ${new Date().toLocaleDateString()}</div>
            <div>Report ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; padding: 10px; background-color: #f9f9f9; border-radius: 4px; border: 1px solid #e0e0e0; font-size: 11px; margin-bottom: 15px;">
          <div style="margin-bottom: 4px;"><span style="font-weight: bold; display: inline-block; min-width: 90px;">Patient Name:</span> ${patientResults.patientName || '<span style="color: #888; font-style: italic;">Not recorded</span>'}</div>
          <div style="margin-bottom: 4px;"><span style="font-weight: bold; display: inline-block; min-width: 90px;">Patient ID:</span> ${patientResults.patientId || '<span style="color: #888; font-style: italic;">Not recorded</span>'}</div>
          <div style="margin-bottom: 4px;"><span style="font-weight: bold; display: inline-block; min-width: 90px;">Gender:</span> ${patientResults.gender || '<span style="color: #888; font-style: italic;">Not recorded</span>'}</div>
          <div style="margin-bottom: 4px;"><span style="font-weight: bold; display: inline-block; min-width: 90px;">Age:</span> ${patientResults.age || '<span style="color: #888; font-style: italic;">Not recorded</span>'}</div>
          <div style="margin-bottom: 4px;"><span style="font-weight: bold; display: inline-block; min-width: 90px;">Date of Birth:</span> ${patientResults.dob ? formatDate(patientResults.dob) : '<span style="color: #888; font-style: italic;">Not recorded</span>'}</div>
        </div>
        
        <div style="font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #ddd; padding-bottom: 3px;">Results</div>
      `;
    }
    
    // Add table element
    html += `
      <table>
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
    `;
    
    // Separate urinalysis tests from other tests for print
    const urinalysisTests = tests.filter(test => {
      const testName = test.testName?.toLowerCase() || '';
      const category = test.category?.toLowerCase() || '';
      
      // EXCLUDE HCG / pregnancy tests
      const isHCG = testName.includes('hcg') || 
                    testName.includes('pregnancy') || 
                    testName.includes('beta') ||
                    testName.includes('human chorionic gonadotropin') ||
                    category === 'hormone/pregnancy' ||
                    category === 'hormone' ||
                    category === 'pregnancy';

      // EXCLUDE stool / fecal tests — their result strings also contain "Colour:"
      const isStool = testName.includes('stool') || testName.includes('fecal') || testName.includes('faecal');
      
      const isUrinalysis = !isHCG && !isStool && (
             category === 'urinalysis' || 
             testName.includes('urinalysis') ||
             testName.includes('urine analysis') ||
             testName.includes('dipstick') ||
             testName.includes('urinalysis, dipstick only') ||
             // Check if the results contain urinalysis-specific parameters (not shared with stool)
             (test.results && (
               (typeof test.results === 'string' && 
                (test.results.includes('pH:') || test.results.includes('Protein:') || test.results.includes('Specific Gravity:'))) ||
               (typeof test.results === 'object' && test.results.results && 
                (test.results.results.includes('pH:') || test.results.results.includes('Protein:') || test.results.results.includes('Specific Gravity:')))
             )) ||
             testName === 'urinalysis, dipstick only'
      );
      
      return isUrinalysis;
    });
    
    const otherTests = tests.filter(test => {
      const testName = test.testName?.toLowerCase() || '';
      const category = test.category?.toLowerCase() || '';
      
      // EXCLUDE HCG tests - they are pregnancy tests, NOT urinalysis
      const isHCG = testName.includes('hcg') || 
                    testName.includes('pregnancy') || 
                    testName.includes('beta') ||
                    testName.includes('human chorionic gonadotropin') ||
                    category === 'hormone/pregnancy' ||
                    category === 'hormone' ||
                    category === 'pregnancy';
      
      return !(
               !isHCG && (
                 category === 'urinalysis' || 
                 testName.includes('urinalysis') ||
                 testName.includes('urine analysis') ||
                 testName.includes('dipstick') ||
                 testName.includes('urinalysis, dipstick only') ||
                 // Check if the results contain urinalysis parameters
                 (test.results && typeof test.results === 'string' && 
                  (test.results.includes('Colour:') || test.results.includes('pH:') || test.results.includes('Protein:')))
               )
             );
    });

    // Generate consolidated urinalysis section if present
    if (urinalysisTests.length > 0) {
      html += generateUrinalysisPrintSection(urinalysisTests);
    }

    // Loop through other tests and generate rows
    otherTests.forEach(test => {
      
      // Add test header - without duplicating the clinic header
      html += `
        <tr>
          <td colspan="5" class="test-header">
            <div>${test.testName}</div>
            <div class="test-date">${formatDate(test.resultDate || test.orderDate)}</div>
          </td>
        </tr>
      `;

      // Common unit mapping for specific tests
      const testUnitMap = {
        'Glucose, Fasting': 'mg/dL',
        'Creatinine': 'mg/dL',
        'Urea': 'mg/dL',
        'Sodium': 'mmol/L',
        'Potassium': 'mmol/L',
        'Chloride': 'mmol/L',
        'Calcium': 'mg/dL',
        'Hemoglobin': 'g/dL',
        'White Blood Cell Count': '10^3/µL',
        'Platelet Count': '10^3/µL',
        'Hematocrit': '%',
        'Cholesterol, Total': 'mg/dL',
        'Triglycerides': 'mg/dL',
        'HDL Cholesterol': 'mg/dL',
        'LDL Cholesterol': 'mg/dL'
      };
      
      // Get default unit for this test if available
      const defaultUnit = testUnitMap[test.testName] || '-';

      // CASE 0: No results or empty results - use default rows
      if (!test.results || (typeof test.results === 'object' && Object.keys(test.results).length === 0)) {
        const defaultRows = createDefaultResults(test);
        defaultRows.forEach(row => {
          let flagClass = '';
          if (row.flag === 'H') flagClass = 'flag-high';
          else if (row.flag === 'L') flagClass = 'flag-low';
          else if (row.flag === 'N') flagClass = 'flag-normal';
          else flagClass = 'flag-none';

          html += `
            <tr>
              <td>${row.paramName}</td>
              <td>${row.resultValue}</td>
              <td>${row.unit}</td>
              <td>${row.normalRange}</td>
              <td class="${flagClass}">${row.flag}</td>
            </tr>
          `;
        });
      }
      
      // CASE 1: Results is a direct value (string or number)
      else if (typeof test.results !== 'object') {
        const resultValue = test.results;
        // Try to get WHO standard reference range if normalRange is missing
        const normalRangeValue = test.normalRange || getWHOReferenceRange(test.testName);
        
        // Get unit
        let unit = normalRangeValue ? extractUnit(normalRangeValue) : defaultUnit;
        if (unit === '-' && defaultUnit !== '-') {
          unit = defaultUnit;
        }
        
        // Clean range
        const cleanedRange = unit !== '-' ? cleanNormalRange(normalRangeValue, unit) : normalRangeValue;
        
        // Determine flag
        const flag = determineFlag(resultValue, normalRangeValue);
        let flagClass = '';
        if (flag === 'H') flagClass = 'flag-high';
        else if (flag === 'L') flagClass = 'flag-low';
        else if (flag === 'N') flagClass = 'flag-normal';
        else flagClass = 'flag-none';
        
        html += `
          <tr>
            <td>${test.testName}</td>
            <td>${resultValue}</td>
            <td>${unit}</td>
            <td>${cleanedRange || '-'}</td>
            <td class="${flagClass}">${flag}</td>
          </tr>
        `;
      }
      
      // CASE 2: Modern format with structured results object
      else if (typeof test.results === 'object') {
        const parameters = Object.entries(test.results)
          .filter(([key]) => !['notes', 'createdAt', 'updatedAt', 'id', '_id'].includes(key))
          .filter(([key]) => key !== 'results' && key !== 'normalRange')
          .map(([key, value]) => {
            if (typeof value === 'object' && value !== null && 'value' in value) {
              // Get unit
              let unit = (value as any).unit || ((value as any).normalRange ? extractUnit((value as any).normalRange) : '');
              if (unit === '-' && defaultUnit !== '-') {
                unit = defaultUnit;
              }
              
              // Clean range - try WHO standard if missing
              const whoRange = (value as any).normalRange || getWHOReferenceRange(test.testName);
              const cleanedRange = unit !== '-' && whoRange ? 
                                  cleanNormalRange(whoRange, unit) : 
                                  whoRange || '-';
              
              // Determine flag
              const flag = determineFlag(value.value, whoRange);
              let flagClass = '';
              if (flag === 'H') flagClass = 'flag-high';
              else if (flag === 'L') flagClass = 'flag-low';
              else if (flag === 'N') flagClass = 'flag-normal';
              else flagClass = 'flag-none';
              
              return {
                paramName: key,
                resultValue: value.value,
                unit,
                normalRange: cleanedRange,
                flag,
                flagClass
              };
            } else {
              // Direct value
              let unit = test.normalRange ? extractUnit(test.normalRange) : '';
              if (unit === '-' && defaultUnit !== '-') {
                unit = defaultUnit;
              }
              
              // Clean range - try WHO standard if missing
              const whoRange = test.normalRange || getWHOReferenceRange(test.testName);
              const cleanedRange = unit !== '-' && whoRange ? 
                                  cleanNormalRange(whoRange, unit) : 
                                  whoRange || '-';
              
              // Determine flag
              const flag = determineFlag(value, whoRange);
              let flagClass = '';
              if (flag === 'H') flagClass = 'flag-high';
              else if (flag === 'L') flagClass = 'flag-low';
              else if (flag === 'N') flagClass = 'flag-normal';
              else flagClass = 'flag-none';
              
              return {
                paramName: key,
                resultValue: value,
                unit,
                normalRange: cleanedRange,
                flag,
                flagClass
              };
            }
          });
          
        if (parameters.length > 0) {
          parameters.forEach(param => {
            html += `
              <tr>
                <td>${param.paramName}</td>
                <td>${param.resultValue}</td>
                <td>${param.unit}</td>
                <td>${param.normalRange}</td>
                <td class="${param.flagClass}">${param.flag}</td>
              </tr>
            `;
          });
        } else {
          const defaultRows = createDefaultResults(test);
          defaultRows.forEach(row => {
            let flagClass = '';
            if (row.flag === 'H') flagClass = 'flag-high';
            else if (row.flag === 'L') flagClass = 'flag-low';
            else if (row.flag === 'N') flagClass = 'flag-normal';
            else flagClass = 'flag-none';
  
            html += `
              <tr>
                <td>${row.paramName}</td>
                <td>${row.resultValue}</td>
                <td>${row.unit}</td>
                <td>${row.normalRange}</td>
                <td class="${flagClass}">${row.flag}</td>
              </tr>
            `;
          });
        }
      }
    });
    
    // Close the table
    html += `
        </tbody>
      </table>
    `;
    
    return html;
  }

  return (
    <div className="bg-white rounded-xl shadow-xl w-full mx-auto flex flex-col border border-gray-200" style={{ maxHeight: '90vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 shrink-0">
            <img
              src={LOGO_PATH}
              className="w-9 h-9 object-contain"
              alt="Clinic Logo"
              onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = LOGO_FALLBACK; }}
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">New Life Medium Clinic</h1>
            <p className="text-xs text-gray-500">Comprehensive Lab Report · Lafto, beside Kebron Guest House</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Report Date</p>
            <p className="text-sm font-semibold text-gray-700">{formatDate(new Date())}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors border border-gray-200">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Patient Information */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: 'Patient Name', value: patientResults.patientName, icon: <User size={11} /> },
            { label: 'Patient ID', value: patientResults.patientId, mono: true, icon: <Hash size={11} /> },
            { label: 'Gender', value: patientResults.gender, capitalize: true, icon: <User size={11} /> },
            { label: 'Age', value: patientResults.age ? `${patientResults.age} yrs` : '', icon: <Calendar size={11} /> },
            { label: 'Date of Birth', value: patientResults.dob ? formatDate(patientResults.dob) : '', icon: <Calendar size={11} /> },
          ].map(({ label, value, mono, capitalize, icon }) => (
            <div key={label} className="bg-white rounded-lg px-3 py-2 border border-gray-200">
              <div className="flex items-center gap-1 mb-0.5 text-gray-400">{icon}<span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span></div>
              <p className={`text-sm font-semibold text-gray-800 truncate ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}>
                {value || <span className="text-gray-400 italic font-normal text-xs">Not recorded</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50 w-44"
            />
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2.5 py-1.5 border border-gray-200">
            <span className="font-semibold text-gray-700">{patientResults.testCount}</span> tests · Latest: <span className="font-semibold text-gray-700">{formatDate(patientResults.latestDate)}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handlePrint} disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {isExporting ? <RefreshCw size={12} className="animate-spin" /> : <Printer size={12} />} Print
          </button>
          <button onClick={handleDownload} disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {isExporting ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />} Download
          </button>
          <button onClick={handleCopyResults} disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
            <Copy size={12} /> Copy
          </button>
        </div>
      </div>

      {/* Tests Results Section */}
      <div id="lab-report-content" className="bg-gray-50/50 overflow-y-auto flex-1">
        {filteredTests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FlaskConical size={28} className="text-gray-400" />
            </div>
            <div className="text-base font-semibold text-gray-600">No matching tests found</div>
            <div className="text-sm text-gray-400 mt-1">Try adjusting your search criteria</div>
          </div>
        ) : (
          <div className="p-5">
            {/* Separate urinalysis tests from other tests */}
            {(() => {
              const isUrinalysisTest = (test: any) => {
                const testName = test.testName?.toLowerCase() || '';
                const category = test.category?.toLowerCase() || '';
                const isHCG = testName.includes('hcg') || testName.includes('pregnancy') ||
                              testName.includes('beta') || testName.includes('human chorionic gonadotropin') ||
                              category === 'hormone/pregnancy' || category === 'hormone' || category === 'pregnancy';
                // Stool result strings also contain "Colour:" — exclude them explicitly
                const isStool = testName.includes('stool') || testName.includes('fecal') || testName.includes('faecal');
                return !isHCG && !isStool && (
                  category === 'urinalysis' ||
                  testName.includes('urinalysis') ||
                  testName.includes('urine analysis') ||
                  testName.includes('dipstick') ||
                  testName === 'urinalysis, dipstick only' ||
                  (test.results && (
                    (typeof test.results === 'string' &&
                     (test.results.includes('pH:') || test.results.includes('Protein:') || test.results.includes('Specific Gravity:'))) ||
                    (typeof test.results === 'object' && test.results.results &&
                     (test.results.results.includes('pH:') || test.results.results.includes('Protein:') || test.results.results.includes('Specific Gravity:')))
                  ))
                );
              };

              const urinalysisTests = filteredTests.filter(isUrinalysisTest);
              const otherTests = filteredTests.filter(test => !isUrinalysisTest(test));

              return (
                <>
                  {/* Consolidated Urinalysis Section */}
                  {urinalysisTests.length > 0 && createUrinalysisSection(urinalysisTests)}
                  
                  {/* Other Tests */}
                  {otherTests.length > 0 && (
                    <div className="space-y-4">
                      {otherTests.map((test) => {
                        const catConfig = getCategoryConfig(test.category);
                        const isExpanded = expandedTests.has(test._id);
                        return (
                        <div key={test._id} className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden border-l-4 ${catConfig.accent}`}>
                          {/* Test Header */}
                          <div
                            className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'border-b border-gray-100' : ''}`}
                            onClick={() => {
                              const next = new Set(expandedTests);
                              if (next.has(test._id)) next.delete(test._id);
                              else next.add(test._id);
                              setExpandedTests(next);
                            }}
                          >
                            <div className="flex items-center flex-1 gap-3 min-w-0">
                              <div className="shrink-0">
                                {getCategoryIcon(test.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-gray-800">{test.testName}</h3>
                                  {test.category && (
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catConfig.badge}`}>
                                      {test.category}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    test.status === 'Completed' || test.status === 'completed' ? 
                                      'bg-emerald-100 text-emerald-700' : 
                                      'bg-amber-100 text-amber-700'
                                  }`}>
                                    {test.status === 'Completed' || test.status === 'completed' ? 'Results Available' : (test.status || 'Processing')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span className="text-xs text-gray-500">
                                    Ordered by: <span className="font-medium text-gray-600">{test.orderedBy || 'Unknown'}</span>
                                  </span>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(test.resultDate || test.orderDate)}
                                  </span>
                                  {/* Collapsed result preview */}
                                  {!isExpanded && (() => {
                                    const tn = test.testName?.toLowerCase() || '';
                                    let rawStr = '';
                                    if (typeof test.results === 'string') rawStr = test.results;
                                    else if (typeof test.results === 'object' && test.results !== null)
                                      rawStr = (test.results as any).results || (test.results as any).value || '';
                                    // Structured semicolon string (stool, urinalysis-like)
                                    if (rawStr && rawStr.includes(':') && rawStr.includes(';')) {
                                      const pairs = rawStr.split(';').slice(0, 3).map(s => {
                                        const ci = s.indexOf(':');
                                        if (ci === -1) return null;
                                        return `${s.slice(0, ci).trim()}: ${s.slice(ci + 1).trim()}`;
                                      }).filter(Boolean);
                                      return pairs.length > 0 ? (
                                        <>
                                          <span className="text-gray-300">•</span>
                                          <span className="text-xs text-gray-400 italic truncate max-w-xs">{pairs.join(' · ')}{rawStr.split(';').length > 3 ? ' …' : ''}</span>
                                        </>
                                      ) : null;
                                    }
                                    // Single value result
                                    if (rawStr) return (
                                      <>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs font-medium text-gray-600">{rawStr}</span>
                                      </>
                                    );
                                    // Object result — show first key/value
                                    if (test.results && typeof test.results === 'object') {
                                      const entries = Object.entries(test.results as Record<string, any>)
                                        .filter(([k]) => !['notes','createdAt','updatedAt','id','_id','normalRange'].includes(k));
                                      if (entries.length > 0) {
                                        const [k, v] = entries[0];
                                        const val = typeof v === 'object' && v !== null && 'value' in v ? v.value : v;
                                        return (
                                          <>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-xs font-medium text-gray-600">{k}: {String(val)}{entries.length > 1 ? ` +${entries.length - 1} more` : ''}</span>
                                          </>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 ml-3 text-gray-400">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>

                          {/* Test Details - Collapsible */}
                          {isExpanded && (
                          <div className="px-4 py-3 bg-white">
                            {/* Results Table */}
                            <div className="rounded-lg overflow-hidden border border-gray-200">
                              <div className="overflow-x-auto">
                                <table className="min-w-full">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Parameter</th>
                                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Result</th>
                                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Normal Range</th>
                                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Flag</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-100">
                            {(() => {
                              
                              // Common unit mapping for specific tests
                              const testUnitMap: Record<string, string> = {
                                'Glucose, Fasting': 'mg/dL',
                                'Creatinine': 'mg/dL',
                                'Urea': 'mg/dL',
                                'Sodium': 'mmol/L',
                                'Potassium': 'mmol/L',
                                'Chloride': 'mmol/L',
                                'Calcium': 'mg/dL',
                                'Hemoglobin': 'g/dL',
                                'White Blood Cell Count': '10^3/µL',
                                'Platelet Count': '10^3/µL',
                                'Hematocrit': '%',
                                'Cholesterol, Total': 'mg/dL',
                                'Triglycerides': 'mg/dL',
                                'HDL Cholesterol': 'mg/dL',
                                'LDL Cholesterol': 'mg/dL'
                              };
                              
                              // Get default unit for this test if available
                              const defaultUnit = testUnitMap[test.testName] || '-';

                              // Function to calculate flag with proper styling
                              const calculateFlag = (value: any, normalRange: any) => {
                                const flag = determineFlag(value, normalRange);
                                let flagColor = '';
                                if (flag === 'H') flagColor = 'text-red-600';
                                else if (flag === 'L') flagColor = 'text-blue-600';
                                else if (flag === 'N') flagColor = 'text-emerald-600';
                                else flagColor = 'text-gray-400';
                                return { flag, flagColor };
                              };
                              
                              // Check if we have any valid results to show
                              const hasValidResults = test.results && 
                                (typeof test.results !== 'undefined' && 
                                 test.results !== null && 
                                 (typeof test.results === 'object' ? 
                                  Object.keys(test.results).length > 0 : 
                                  true));
                              
                              // Reusable flag badge
                              const FlagBadge = ({ flag }: { flag: string }) => {
                                if (flag === 'H') return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">H</span>;
                                if (flag === 'L') return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">L</span>;
                                if (flag === 'N') return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">N</span>;
                                return <span className="text-gray-400 text-sm">—</span>;
                              };

                              const ResultCell = ({ value }: { value: string }) => {
                                if (value === "See Reception") return <span className="text-blue-600 italic font-medium text-sm">{value}</span>;
                                if (value === "N/A") return <span className="text-gray-400 italic text-sm">{value}</span>;
                                if (value === "Pending") return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">{value}</span>;
                                return <span className="text-gray-800 font-semibold text-sm">{value}</span>;
                              };

                              // CASE 0: No results at all or empty results - use default rows
                              if (!hasValidResults) {
                                const defaultRows = createDefaultResults(test);
                                return defaultRows.map((row, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                    <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{row.paramName}</td>
                                    <td className="px-4 py-2.5 text-center"><ResultCell value={row.resultValue} /></td>
                                    <td className="px-4 py-2.5 text-sm text-center text-gray-500">{row.unit || '-'}</td>
                                    <td className="px-4 py-2.5 text-sm text-center text-gray-500">{row.normalRange || '-'}</td>
                                    <td className="px-4 py-2.5 text-center"><FlagBadge flag={row.flag} /></td>
                                  </tr>
                                ));
                              }
                              
                              // CASE 1: Results is a direct value (string or number)
                              if (typeof test.results !== 'object' && test.results && (
                                typeof test.results === 'string' || typeof test.results === 'number')) {
                                const resultValue = test.results;
                                const normalRangeValue = test.normalRange || getSuggestedReferenceRange(test.testName);
                                let unit = normalRangeValue ? extractUnit(normalRangeValue) : defaultUnit;
                                if (unit === '-' && defaultUnit !== '-') unit = defaultUnit;
                                const cleanedRange = unit !== '-' ? cleanNormalRange(normalRangeValue, unit) : normalRangeValue;
                                const { flag, flagColor } = calculateFlag(resultValue, normalRangeValue);
                                return (
                                  <tr className="bg-white">
                                    <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{test.testName}</td>
                                    <td className="px-4 py-2.5 text-center"><span className={`font-semibold text-sm ${flagColor}`}>{resultValue}</span></td>
                                    <td className="px-4 py-2.5 text-sm text-center text-gray-500">{unit || '-'}</td>
                                    <td className="px-4 py-2.5 text-sm text-center text-gray-500">{cleanedRange || '-'}</td>
                                    <td className="px-4 py-2.5 text-center"><FlagBadge flag={flag} /></td>
                                  </tr>
                                );
                              }
                              
                              // CASE STOOL: Parse semicolon-separated stool result string into rows
                              const isStoolTest = test.testName?.toLowerCase().includes('stool') || test.testName?.toLowerCase().includes('fecal') || test.testName?.toLowerCase().includes('faecal');
                              if (isStoolTest) {
                                // Extract the raw result string from various storage formats
                                let rawStr = '';
                                if (typeof test.results === 'string') rawStr = test.results;
                                else if (typeof test.results === 'object' && test.results !== null) {
                                  rawStr = (test.results as any).results || (test.results as any).value || '';
                                }

                                // Stool normal ranges
                                const stoolNormals: Record<string, { normal: string; abnormal?: string[] }> = {
                                  'Colour':       { normal: 'Brown', abnormal: ['Black', 'Red', 'Pale', 'Yellow', 'Green', 'White'] },
                                  'Consistency':  { normal: 'Formed', abnormal: ['Loose', 'Watery', 'Hard', 'Soft', 'Mucoid'] },
                                  'Mucus':        { normal: 'Negative', abnormal: ['Positive', '+', '++', '+++'] },
                                  'Blood':        { normal: 'Negative', abnormal: ['Positive', '+', '++', '+++'] },
                                  'Pus Cells':    { normal: '0 – 2 /HPF', abnormal: [] },
                                  'RBC':          { normal: 'Nil', abnormal: ['Positive', '+', '++', '+++'] },
                                  'O/P':          { normal: 'Negative', abnormal: ['Positive'] },
                                  'Parasite':     { normal: 'None', abnormal: [] },
                                  'Fat Globules': { normal: 'Not Seen', abnormal: ['Seen', '+', '++', '+++'] },
                                };

                                const getStoolFlag = (param: string, value: string): { flag: string; color: string } => {
                                  const info = stoolNormals[param];
                                  if (!info) return { flag: '', color: 'text-gray-800' };
                                  const v = value.trim();
                                  if (v === info.normal) return { flag: 'N', color: 'text-emerald-700' };
                                  if (info.abnormal && info.abnormal.length > 0) {
                                    if (info.abnormal.some(a => v.toLowerCase() === a.toLowerCase())) return { flag: 'A', color: 'text-red-600' };
                                  }
                                  // Numeric pus cells
                                  if (param === 'Pus Cells') {
                                    const n = parseFloat(v);
                                    if (!isNaN(n) && n > 2) return { flag: 'H', color: 'text-red-600' };
                                    if (!isNaN(n)) return { flag: 'N', color: 'text-emerald-700' };
                                  }
                                  return { flag: '', color: 'text-gray-800' };
                                };

                                if (rawStr) {
                                  // Parse "Key: Value; Key: Value" format
                                  const pairs = rawStr.split(';').map(s => s.trim()).filter(Boolean);
                                  const rows = pairs.map(pair => {
                                    const colonIdx = pair.indexOf(':');
                                    if (colonIdx === -1) return { param: pair, value: '' };
                                    return { param: pair.slice(0, colonIdx).trim(), value: pair.slice(colonIdx + 1).trim() };
                                  }).filter(r => r.param && r.value !== undefined);

                                  if (rows.length > 0) {
                                    return rows.map((row, idx) => {
                                      const normalInfo = stoolNormals[row.param];
                                      const normalRange = normalInfo?.normal || '—';
                                      const { flag, color } = getStoolFlag(row.param, row.value);
                                      const isAbnormal = flag === 'H' || flag === 'A';
                                      return (
                                        <tr key={idx} className={`${isAbnormal ? 'bg-red-50/40' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                                          <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{row.param}</td>
                                          <td className="px-4 py-2.5 text-center">
                                            <span className={`font-semibold text-sm ${color}`}>{row.value || '—'}</span>
                                          </td>
                                          <td className="px-4 py-2.5 text-sm text-center text-gray-400">—</td>
                                          <td className="px-4 py-2.5 text-sm text-center text-gray-500">{normalRange}</td>
                                          <td className="px-4 py-2.5 text-center">
                                            {flag === 'H' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">H</span>}
                                            {flag === 'A' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">A</span>}
                                            {flag === 'N' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">N</span>}
                                            {!flag && <span className="text-gray-400 text-sm">—</span>}
                                          </td>
                                        </tr>
                                      );
                                    });
                                  }
                                }
                              }

                              // CASE 2: Modern format with structured results object
                              if (test.results && typeof test.results === 'object' && !Array.isArray(test.results)) {
                                const parameters = Object.entries(test.results)
                                  .filter(([key]) => !['notes', 'createdAt', 'updatedAt', 'id', '_id', 'results', 'normalRange'].includes(key))
                                  .map(([key, value]) => {
                                    if (typeof value === 'object' && value !== null && 'value' in value) {
                                      let unit = (value as any).unit || ((value as any).normalRange ? extractUnit((value as any).normalRange) : defaultUnit);
                                      if (unit === '-' && defaultUnit !== '-') unit = defaultUnit;
                                      const whoRange = (value as any).normalRange || getSuggestedReferenceRange(test.testName);
                                      const cleanedRange = unit !== '-' && whoRange ? cleanNormalRange(whoRange, unit) : whoRange || '-';
                                      const { flag, flagColor } = calculateFlag(value.value, whoRange);
                                      return { paramName: key, resultValue: value.value, unit, normalRange: cleanedRange, flag, flagColor };
                                    } else {
                                      let unit = test.normalRange ? extractUnit(test.normalRange) : defaultUnit;
                                      if (unit === '-' && defaultUnit !== '-') unit = defaultUnit;
                                      const whoRange = test.normalRange || getSuggestedReferenceRange(test.testName);
                                      const cleanedRange = unit !== '-' && whoRange ? cleanNormalRange(whoRange, unit) : whoRange || '-';
                                      const { flag, flagColor } = calculateFlag(value, whoRange);
                                      return { paramName: key, resultValue: value, unit, normalRange: cleanedRange, flag, flagColor };
                                    }
                                  });
                                
                                if (parameters.length > 0) {
                                  return parameters.map((param, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                      <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{param.paramName}</td>
                                      <td className="px-4 py-2.5 text-center"><span className={`font-semibold text-sm ${param.flagColor}`}>{String(param.resultValue)}</span></td>
                                      <td className="px-4 py-2.5 text-sm text-center text-gray-500">{param.unit || '-'}</td>
                                      <td className="px-4 py-2.5 text-sm text-center text-gray-500">{param.normalRange || '-'}</td>
                                      <td className="px-4 py-2.5 text-center"><FlagBadge flag={param.flag} /></td>
                                    </tr>
                                  ));
                                }
                              }
                              
                              // CASE 4: Default fallback
                              const defaultRows = createDefaultResults(test);
                              return defaultRows.map((row, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                  <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{row.paramName}</td>
                                  <td className="px-4 py-2.5 text-center"><ResultCell value={row.resultValue} /></td>
                                  <td className="px-4 py-2.5 text-sm text-center text-gray-500">{row.unit || '-'}</td>
                                  <td className="px-4 py-2.5 text-sm text-center text-gray-500">{row.normalRange || '-'}</td>
                                  <td className="px-4 py-2.5 text-center"><FlagBadge flag={row.flag} /></td>
                                </tr>
                              ))
                            })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Notes */}
                            {test.notes && (
                              <div className="mt-3">
                                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                                  <p className="text-xs font-semibold text-blue-700 mb-1">Notes</p>
                                  <p className="text-sm text-gray-700">{test.notes}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-400">
            Generated by New Life Medium Clinic Lab System · {new Date().toLocaleDateString()}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExpandedTests(new Set(filteredTests.map(t => t._id)))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedTests(new Set())}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ComprehensiveLabReport; 