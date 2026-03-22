/**
 * PDF Generation utility for eating plans
 * This is a simple implementation that uses the browser's print functionality
 * For production, consider using libraries like jsPDF or Puppeteer
 */

export interface PDFContent {
  title: string;
  patientName: string;
  patientId: string;
  generatedDate: string;
  content: string;
}

export const generatePDF = (content: PDFContent) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    throw new Error('Unable to open print window. Please check your popup blocker settings.');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${content.title} - ${content.patientName}</title>
      <style>
        @media print {
          @page {
            margin: 0.5in;
            size: A4;
          }
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #dc2626;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .clinic-name {
          font-size: 24px;
          font-weight: bold;
          color: #dc2626;
          margin-bottom: 5px;
        }
        
        .clinic-subtitle {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .document-title {
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }
        
        .patient-info {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .patient-info h3 {
          margin: 0 0 10px 0;
          color: #dc2626;
          font-size: 16px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
        }
        
        .info-label {
          font-weight: 600;
          color: #666;
        }
        
        .info-value {
          color: #333;
        }
        
        .section {
          margin-bottom: 25px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #dc2626;
          margin-bottom: 15px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 5px;
        }
        
        .meal-plan {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }
        
        .day-title {
          font-weight: bold;
          color: #dc2626;
          margin-bottom: 10px;
          font-size: 16px;
        }
        
        .meal-item {
          margin-bottom: 8px;
          padding-left: 15px;
        }
        
        .meal-type {
          font-weight: 600;
          color: #374151;
        }
        
        .meal-description {
          color: #6b7280;
        }
        
        .goals-list, .restrictions-list {
          list-style: none;
          padding: 0;
        }
        
        .goals-list li, .restrictions-list li {
          padding: 5px 0;
          padding-left: 20px;
          position: relative;
        }
        
        .goals-list li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: bold;
        }
        
        .restrictions-list li:before {
          content: "✗";
          position: absolute;
          left: 0;
          color: #ef4444;
          font-weight: bold;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        
        .disclaimer {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 10px;
          margin-top: 20px;
          font-size: 12px;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="clinic-name">New Life Clinic</div>
        <div class="clinic-subtitle">Healthcare Center</div>
        <div class="document-title">${content.title}</div>
      </div>
      
      <div class="patient-info">
        <h3>Patient Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Patient Name:</span>
            <span class="info-value">${content.patientName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Patient ID:</span>
            <span class="info-value">${content.patientId}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Generated Date:</span>
            <span class="info-value">${content.generatedDate}</span>
          </div>
        </div>
      </div>
      
      <div class="content">
        ${content.content}
      </div>
      
      <div class="disclaimer">
        <strong>Disclaimer:</strong> This eating plan is personalized based on your current vital signs and medical conditions. 
        Please consult with your healthcare provider before making significant dietary changes.
      </div>
      
      <div class="footer">
        <p>Generated by New Life Clinic Healthcare Management System</p>
        <p>For questions or concerns, please contact your healthcare provider</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
};

export const downloadPDF = (content: PDFContent, filename: string = 'eating-plan.pdf') => {
  // For now, we'll use the same print functionality
  // In a production environment, you might want to use a proper PDF library
  generatePDF(content);
};
