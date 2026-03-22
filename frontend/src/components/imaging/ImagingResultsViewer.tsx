import React, { useState } from 'react';
import { Printer, X, Download, Calendar, User, FileText, Activity } from 'lucide-react';
import { ImagingOrder } from '../../services/imagingService';
import { formatDate } from '../../utils/formatters';

interface ImagingResultsViewerProps {
  order: ImagingOrder;
  onClose: () => void;
  onEdit?: () => void;
}

const ImagingResultsViewer: React.FC<ImagingResultsViewerProps> = ({ order, onClose, onEdit }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  // Function to convert markdown-style formatting to HTML
  const processMarkdownToHTML = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/^# (.*$)/gm, '<h1 style="font-size: 1.5em; font-weight: 600; color: hsl(var(--primary-color-800)); margin: 1em 0 0.5em 0;">$1</h1>') // H1
      .replace(/^## (.*$)/gm, '<h2 style="font-size: 1.3em; font-weight: 600; color: hsl(var(--primary-color-500)); margin: 0.8em 0 0.4em 0;">$1</h2>') // H2
      .replace(/^### (.*$)/gm, '<h3 style="font-size: 1.1em; font-weight: 600; color: hsl(var(--muted-foreground)); margin: 0.6em 0 0.3em 0;">$1</h3>') // H3
      .replace(/^• (.*$)/gm, '<li style="margin: 0.3em 0; line-height: 1.6;">$1</li>') // Bullet points
      .replace(/^> (.*$)/gm, '<blockquote style="border-left: 4px solid hsl(var(--primary-color-500)); padding-left: 16px; margin: 1em 0; font-style: italic; background: hsl(var(--primary-color-50)); padding: 12px 16px; border-radius: 0 8px 8px 0;">$1</blockquote>') // Blockquotes
      .replace(/^---$/gm, '<hr style="border: none; border-top: 2px solid hsl(var(--border)); margin: 1em 0;">') // Horizontal lines
      .replace(/^\d+\. (.*$)/gm, '<li style="margin: 0.3em 0; line-height: 1.6;">$1</li>') // Numbered lists
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 4px;" />') // Images
      .replace(/\n/g, '<br>'); // Line breaks
  };

  const handlePrint = () => {
    setIsPrinting(true);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }
    
      // Helper function to generate specialized templates for different imaging types
      const generateSpecializedTemplate = (imagingType, bodyPart, results) => {
        const type = (imagingType || '').toLowerCase();
        const part = (bodyPart || '').toLowerCase();
        let html = '';
        
        if (type.includes('ultrasound')) {
          if (part.includes('obstetric') || part.includes('pregnancy') || part.includes('fetal')) {
            // (Header removed; final banner is shown later near Study Details)
            html += '<div class="findings-grid">';
            
            // Fetal Information
            const fetalFields = ['fetuses', 'presentation', 'fhr'];
            const fetalData = fetalFields.filter(key => results[key]).map(key => {
              let label = key.replace('fhr', 'Fetal Heart Rate').replace('fetuses', 'Number of Fetuses');
              return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${results[key]}`;
            }).join('<br>');
            if (fetalData) html += `<div class="finding-row"><div class="finding-title">Fetal Assessment</div><div class="finding-content">${fetalData}</div></div>`;
            
            // Fetal Biometry
            const biometry = ['crl', 'bpd', 'hc', 'ac', 'fl', 'efw', 'ga'];
            const biometryData = biometry.filter(key => results[key]).map(key => {
              let label = key.toUpperCase();
              if (key === 'crl') label = 'CRL (mm)';
              if (key === 'bpd') label = 'BPD (mm)';
              if (key === 'hc') label = 'HC (mm)';
              if (key === 'ac') label = 'AC (mm)';
              if (key === 'fl') label = 'FL (mm)';
              if (key === 'efw') label = 'EFW (g)';
              if (key === 'ga') label = 'Gestational Age';
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (biometryData) html += `<div class="finding-row"><div class="finding-title">Fetal Biometry</div><div class="finding-content">${biometryData}</div></div>`;
            
            // Placenta & Liquor
            const placenta = ['placentaLocation', 'placentaGrade', 'previa', 'afi', 'mvp', 'liquor'];
            const placentaData = placenta.filter(key => results[key]).map(key => {
              let label = key.replace('placenta', 'Placenta ').replace('Location', 'Location').replace('Grade', 'Grade');
              if (key === 'afi') label = 'AFI (cm)';
              if (key === 'mvp') label = 'MVP (cm)';
              return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${results[key]}`;
            }).join('<br>');
            if (placentaData) html += `<div class="finding-row"><div class="finding-title">Placenta & Amniotic Fluid</div><div class="finding-content">${placentaData}</div></div>`;
            
            // Cervix & Adnexa
            const cervixFields = ['cervicalLength', 'os', 'adnexa'];
            const cervixData = cervixFields.filter(key => results[key]).map(key => {
              let label = key.replace('cervicalLength', 'Cervical Length (mm)');
              return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${results[key]}`;
            }).join('<br>');
            if (cervixData) html += `<div class="finding-row"><div class="finding-title">Cervix & Adnexa</div><div class="finding-content">${cervixData}</div></div>`;
            
            html += '</div>';
            
          } else if (part.includes('breast')) {
            // (Header removed; final banner is shown later near Study Details)
            html += '<div class="findings-grid">';
            
            // Right Breast
            const rightFields = ['rightBreastEcho', 'rightBreastMasses', 'rightMassDetails', 'rightNipple'];
            const rightData = rightFields.filter(key => results[key]).map(key => {
              let label = key.replace('rightBreast', '').replace('right', '').replace('Echo', 'Echogenicity').replace('Masses', 'Masses/Lesions');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (rightData) html += `<div class="finding-row"><div class="finding-title">Right Breast</div><div class="finding-content">${rightData}</div></div>`;
            
            // Left Breast
            const leftFields = ['leftBreastEcho', 'leftBreastMasses', 'leftMassDetails', 'leftNipple'];
            const leftData = leftFields.filter(key => results[key]).map(key => {
              let label = key.replace('leftBreast', '').replace('left', '').replace('Echo', 'Echogenicity').replace('Masses', 'Masses/Lesions');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (leftData) html += `<div class="finding-row"><div class="finding-title">Left Breast</div><div class="finding-content">${leftData}</div></div>`;
            
            // Lymph Nodes
            const lymphFields = ['axillaryNodes', 'supraclavicularNodes', 'skinThickening'];
            const lymphData = lymphFields.filter(key => results[key]).map(key => {
              let label = key.replace('axillaryNodes', 'Axillary Lymph Nodes').replace('supraclavicularNodes', 'Supraclavicular Nodes');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (lymphData) html += `<div class="finding-row"><div class="finding-title">Lymph Nodes</div><div class="finding-content">${lymphData}</div></div>`;
            
            html += '</div>';
            
          } else if (part.includes('prostate') || part.includes('bph')) {
            // (Header removed; final banner is shown later near Study Details)
            html += '<div class="findings-grid">';
            
            // Prostate Gland
            const prostateFields = ['prostateSize', 'prostateVolume', 'prostateEcho', 'capsule', 'calcifications'];
            const prostateData = prostateFields.filter(key => results[key]).map(key => {
              let label = key.replace('prostate', '').replace('Size', 'Size (cm)').replace('Volume', 'Volume (cc)').replace('Echo', 'Echogenicity');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (prostateData) html += `<div class="finding-row"><div class="finding-title">Prostate Gland</div><div class="finding-content">${prostateData}</div></div>`;
            
            // Bladder
            const bladderFields = ['bladderWall', 'bladderContents', 'pvr'];
            const bladderData = bladderFields.filter(key => results[key]).map(key => {
              let label = key.replace('bladderWall', 'Wall Thickness (mm)').replace('bladderContents', 'Contents').replace('pvr', 'Post-void Residual (ml)');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (bladderData) html += `<div class="finding-row"><div class="finding-title">Bladder</div><div class="finding-content">${bladderData}</div></div>`;
            
            // Kidneys
            const kidneyFields = ['rightKidneySize', 'leftKidneySize', 'hydronephrosis'];
            const kidneyData = kidneyFields.filter(key => results[key]).map(key => {
              let label = key.replace('rightKidneySize', 'Right Kidney (cm)').replace('leftKidneySize', 'Left Kidney (cm)');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (kidneyData) html += `<div class="finding-row"><div class="finding-title">Kidneys</div><div class="finding-content">${kidneyData}</div></div>`;
            
            html += '</div>';
            
          } else if (part.includes('pelvic') || part.includes('gynecologic')) {
            // (Header removed; final banner is shown later near Study Details)
            html += '<div class="findings-grid">';
            
            // Uterus
            const uterusFields = ['uterusSize', 'uterusPosition', 'endometriumThickness', 'myometrium'];
            const uterusData = uterusFields.filter(key => results[key]).map(key => {
              let label = key.replace('uterus', '').replace('Size', 'Size (cm)').replace('endometriumThickness', 'Endometrium (mm)');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (uterusData) html += `<div class="finding-row"><div class="finding-title">Uterus</div><div class="finding-content">${uterusData}</div></div>`;
            
            // Right Ovary
            const rightOvaryFields = ['rightOvarySize', 'rightOvaryEcho', 'rightOvaryCysts'];
            const rightOvaryData = rightOvaryFields.filter(key => results[key]).map(key => {
              let label = key.replace('rightOvary', '').replace('Size', 'Size (cm)').replace('Echo', 'Echogenicity').replace('Cysts', 'Cysts/Masses');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (rightOvaryData) html += `<div class="finding-row"><div class="finding-title">Right Ovary</div><div class="finding-content">${rightOvaryData}</div></div>`;
            
            // Left Ovary
            const leftOvaryFields = ['leftOvarySize', 'leftOvaryEcho', 'leftOvaryCysts'];
            const leftOvaryData = leftOvaryFields.filter(key => results[key]).map(key => {
              let label = key.replace('leftOvary', '').replace('Size', 'Size (cm)').replace('Echo', 'Echogenicity').replace('Cysts', 'Cysts/Masses');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (leftOvaryData) html += `<div class="finding-row"><div class="finding-title">Left Ovary</div><div class="finding-content">${leftOvaryData}</div></div>`;
            
            // Pouch of Douglas
            const pouchFields = ['freeFluid', 'cervix'];
            const pouchData = pouchFields.filter(key => results[key]).map(key => {
              let label = key.replace('freeFluid', 'Free Fluid');
              return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${results[key]}`;
            }).join('<br>');
            if (pouchData) html += `<div class="finding-row"><div class="finding-title">Pouch of Douglas</div><div class="finding-content">${pouchData}</div></div>`;
            
            html += '</div>';
            
          } else if (part.includes('thyroid')) {
            // (Header removed; final banner is shown later near Study Details)
            html += '<div class="findings-grid">';
            
            // Right Thyroid Lobe
            const rightLobeFields = ['rightLobeSize', 'rightLobeEcho', 'rightLobeNodules', 'rightNoduleDetails'];
            const rightLobeData = rightLobeFields.filter(key => results[key]).map(key => {
              let label = key.replace('rightLobe', '').replace('Size', 'Size (cm)').replace('Echo', 'Echogenicity');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (rightLobeData) html += `<div class="finding-row"><div class="finding-title">Right Thyroid Lobe</div><div class="finding-content">${rightLobeData}</div></div>`;
            
            // Left Thyroid Lobe
            const leftLobeFields = ['leftLobeSize', 'leftLobeEcho', 'leftLobeNodules', 'leftNoduleDetails'];
            const leftLobeData = leftLobeFields.filter(key => results[key]).map(key => {
              let label = key.replace('leftLobe', '').replace('Size', 'Size (cm)').replace('Echo', 'Echogenicity');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (leftLobeData) html += `<div class="finding-row"><div class="finding-title">Left Thyroid Lobe</div><div class="finding-content">${leftLobeData}</div></div>`;
            
            // Isthmus & Other
            const isthmusFields = ['isthmusThickness', 'lymphNodes', 'vascularityDoppler'];
            const isthmusData = isthmusFields.filter(key => results[key]).map(key => {
              let label = key.replace('isthmusThickness', 'Isthmus Thickness (mm)').replace('lymphNodes', 'Cervical Lymph Nodes').replace('vascularityDoppler', 'Vascularity');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (isthmusData) html += `<div class="finding-row"><div class="finding-title">Isthmus & Lymph Nodes</div><div class="finding-content">${isthmusData}</div></div>`;
            
            html += '</div>';
            
          } else {
            // (Header removed; final banner is shown later near Study Details)
            html += '<div class="findings-grid">';
            
            // Liver
            const liverFields = ['liverSize', 'liverEchotexture', 'liverFocalLesion', 'intrahepaticDucts', 'portalVeinFlow'];
            const liverData = liverFields.filter(key => results[key]).map(key => {
              let label = key.replace('liver', '').replace('Size', 'Size (cm)').replace('Echotexture', 'Echotexture').replace('FocalLesion', 'Focal Lesions');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (liverData) html += `<div class="finding-row"><div class="finding-title">Liver</div><div class="finding-content">${liverData}</div></div>`;
            
            // Gallbladder
            const gbFields = ['gbWall', 'gbStones', 'gbSludge', 'murphysSign', 'cbdDiameter'];
            const gbData = gbFields.filter(key => results[key]).map(key => {
              let label = key.replace('gb', 'GB ').replace('Wall', 'Wall (mm)').replace('Stones', 'Stones').replace('Sludge', 'Sludge').replace('murphysSign', "Murphy's Sign").replace('cbdDiameter', 'CBD Diameter (mm)');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (gbData) html += `<div class="finding-row"><div class="finding-title">Gallbladder & Biliary</div><div class="finding-content">${gbData}</div></div>`;
            
            // Pancreas & Spleen
            const pancreasFields = ['pancreasVisualization', 'pancreaticDuct', 'spleenSize', 'spleenEchotexture'];
            const pancreasData = pancreasFields.filter(key => results[key]).map(key => {
              let label = key.replace('pancreas', 'Pancreas ').replace('Visualization', 'Visualization').replace('pancreaticDuct', 'Pancreatic Duct').replace('spleen', 'Spleen ').replace('Size', 'Size (cm)');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (pancreasData) html += `<div class="finding-row"><div class="finding-title">Pancreas & Spleen</div><div class="finding-content">${pancreasData}</div></div>`;
            
            // Right Kidney
            const rkFields = ['rkLength', 'rkEchogenicity', 'rkCMD', 'rkHydronephrosis'];
            const rkData = rkFields.filter(key => results[key]).map(key => {
              let label = key.replace('rk', '').replace('Length', 'Length (cm)').replace('Echogenicity', 'Echogenicity').replace('CMD', 'CMD');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (rkData) html += `<div class="finding-row"><div class="finding-title">Right Kidney</div><div class="finding-content">${rkData}</div></div>`;
            
            // Left Kidney
            const lkFields = ['lkLength', 'lkEchogenicity', 'lkCMD', 'lkHydronephrosis'];
            const lkData = lkFields.filter(key => results[key]).map(key => {
              let label = key.replace('lk', '').replace('Length', 'Length (cm)').replace('Echogenicity', 'Echogenicity').replace('CMD', 'CMD');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (lkData) html += `<div class="finding-row"><div class="finding-title">Left Kidney</div><div class="finding-content">${lkData}</div></div>`;
            
            // Bladder & Pelvis
            const bladderPelvicFields = ['bladderWall', 'pvr', 'pelvicOrgans'];
            const bladderPelvicData = bladderPelvicFields.filter(key => results[key]).map(key => {
              let label = key.replace('bladderWall', 'Bladder Wall (mm)').replace('pvr', 'Post-void Residual (ml)').replace('pelvicOrgans', 'Pelvic Organs');
              return `${label}: ${results[key]}`;
            }).join('<br>');
            if (bladderPelvicData) html += `<div class="finding-row"><div class="finding-title">Bladder & Pelvis</div><div class="finding-content">${bladderPelvicData}</div></div>`;
            
            html += '</div>';
          }
        } else {
          // Generic template for other imaging types (X-Ray, CT, MRI, etc.)
          html += `<h3 style="color: hsl(var(--primary-color-800)); font-size: 9pt; margin-bottom: 8px; text-align: center; border-bottom: 1px solid hsl(var(--primary-color-600)); padding-bottom: 3px;">${(imagingType || 'IMAGING').toUpperCase()} REPORT</h3>`;
          html += '<div class="findings-grid">';
          Object.entries(results).forEach(([key, value]) => {
            if (!value || key.toLowerCase() === 'reportdate' || key.toLowerCase() === 'radiologist') return;
            const keyFormatted = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
            const isAbnormal = String(value).toLowerCase().includes('abnormal') || String(value).toLowerCase().includes('stone') || String(value).toLowerCase().includes('mass');
            const contentClass = isAbnormal ? 'finding-content finding-abnormal' : 'finding-content';
            html += `<div class="finding-row"><div class="finding-title">${keyFormatted}</div><div class="${contentClass}">${value}</div></div>`;
          });
          html += '</div>';
        }
        
        // Removed early Clinical Impression section to avoid duplicate near top
        
        return html;
      };
      
     // Create complete print HTML - Professional Medical Report Format
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imaging Report - ${order.patient?.name || 'Patient'}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            
            body {
              font-family: 'Times New Roman', serif;
              font-size: 8pt;
              line-height: 1.1;
              color: hsl(var(--foreground));
              background: white;
              max-width: 100%;
              margin: 0;
            }
            
            /* Ultra Compact Header */
            .header {
              border-bottom: 1px solid hsl(var(--primary-color-600));
              padding-bottom: 6px;
              margin-bottom: 10px;
              background: hsl(var(--muted));
              padding: 6px;
              position: relative;
            }
            
            .date-report {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
              color: #475569;
              margin-bottom: 8px;
              font-weight: 500;
            }
            
            .clinic-header {
              display: flex;
              align-items: center;
              margin-bottom: 8px;
            }
            
            .clinic-logo {
              width: 40px;
              height: 40px;
              background: #2563eb;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 15px;
            }
            
            .clinic-logo::after {
              content: '⚕';
              color: white;
              font-size: 20px;
              font-weight: bold;
            }
            
            .clinic-info {
              flex: 1;
            }
            
            .clinic-title {
              font-size: 11pt;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 1px;
              text-transform: uppercase;
            }
            
            .clinic-subtitle {
              font-size: 7pt;
              color: #475569;
              margin-bottom: 1px;
            }
            
            .report-title {
              text-align: center;
              font-size: 9pt;
              font-weight: bold;
              color: #1e40af;
              margin: 6px 0;
              text-transform: uppercase;
              border: 1px solid #2563eb;
              padding: 4px;
              background: #f0f7ff;
            }
            
            .report-id {
              position: absolute;
              top: 10px;
              right: 10px;
              background: #1e40af;
              color: white;
              padding: 4px 8px;
              border-radius: 3px;
              font-size: 8pt;
              font-weight: bold;
            }
            
            .clinic-contact {
              font-size: 8pt;
              color: #475569;
              margin-bottom: 1px;
            }
            
            .clinic-phone {
              font-size: 8pt;
              color: #475569;
            }
            
            .separator {
              height: 2px;
              background: #2563eb;
              margin: 8px 0;
            }
            
            /* Compact Patient Information Grid */
            .patient-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 15px;
              padding: 10px;
              background: hsl(var(--muted));
              border: 1px solid #e2e8f0;
              font-size: 8pt;
            }
            
            .patient-info-section {
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            
            .patient-info-item {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              border-bottom: 1px dotted #cbd5e1;
            }
            
            .patient-info-label {
              font-weight: 600;
              color: #374151;
              min-width: 80px;
            }
            
            .patient-info-value {
              color: #111827;
              font-weight: 500;
              text-align: right;
            }
            
            .results-title {
              font-size: 10pt;
              font-weight: bold;
              color: #1e40af;
              margin: 10px 0 8px 0;
              text-align: center;
              text-transform: uppercase;
              border: 1px solid #2563eb;
              padding: 6px;
              background: #f0f7ff;
            }
            
            /* Compact Findings Layout */
            .findings-section {
              margin-bottom: 15px;
              border: 1px solid #e5e7eb;
            }
            
            .findings-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0;
            }
            
            .finding-row {
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
              background: #fafafa;
              break-inside: avoid;
            }
            
            .finding-row:nth-child(even) {
              background: #ffffff;
            }
            
            .finding-title {
              font-size: 8pt;
              font-weight: 600;
              color: #1e40af;
              margin-bottom: 4px;
              text-transform: uppercase;
              border-bottom: 1px solid #3b82f6;
              padding-bottom: 2px;
            }
            
            .finding-content {
              font-size: 8pt;
              color: #374151;
              line-height: 1.3;
              padding: 2px 0;
            }
            
            .finding-measurement {
              font-weight: 600;
              color: #059669;
            }
            
            .finding-abnormal {
              font-weight: 600;
              color: #dc2626;
            }
            
            /* Compact Impression/Conclusion Section */
            .conclusion-section {
              margin-top: 10px;
              padding: 10px;
              background: #fef3c7;
              border: 2px solid #f59e0b;
              page-break-inside: avoid;
            }
            
            .conclusion-title {
              font-size: 9pt;
              font-weight: bold;
              color: #92400e;
              margin-bottom: 5px;
              text-transform: uppercase;
              text-align: center;
            }
            
            .conclusion-content {
              font-size: 8pt;
              color: #451a03;
              line-height: 1.3;
              font-weight: 500;
            }
            
            /* Compact Technical Information Table */
            .tech-info-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 7pt;
            }
            
            .tech-info-table th,
            .tech-info-table td {
              border: 1px solid #d1d5db;
              padding: 3px 6px;
              text-align: left;
            }
            
            .tech-info-table th {
              background: #f3f4f6;
              font-weight: 600;
              color: #374151;
              font-size: 8pt;
            }
            
            .tech-info-table tr:nth-child(even) {
              background: #f9fafb;
            }
            
            /* Ultra Compact Footer */
            .footer {
              margin-top: 8px;
              border-top: 1px solid #2563eb;
              padding-top: 4px;
              background: hsl(var(--muted));
              padding: 4px;
            }
            
            .footer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px;
              margin-bottom: 8px;
            }
            
            .footer-section {
              text-align: center;
            }
            
            .footer-section h5 {
              font-size: 7pt;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 3px;
            }
            
            .footer-section p {
              font-size: 6pt;
              color: #475569;
              margin: 1px 0;
            }
            
            /* Compact Signature Areas */
            .signature-area {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px solid #d1d5db;
            }
            
            .signature-box {
              text-align: center;
            }
            
            .signature-line {
              border-bottom: 1px solid #374151;
              width: 120px;
              margin: 15px auto 5px;
            }
            
            .signature-label {
              font-size: 7pt;
              color: #6b7280;
              font-weight: 600;
            }
            
            .signature-date {
              font-size: 6pt;
              color: #9ca3af;
              margin-top: 2px;
            }
            
            /* Print Optimization */
            .page-break {
              page-break-before: always;
            }
            
            .no-break {
              page-break-inside: avoid;
            }
            
            /* Copyright */
            .copyright {
              text-align: center;
              font-size: 8pt;
              color: #6b7280;
              margin-top: 20px;
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
            }
              display: flex;
              justify-content: space-between;
              font-size: 9pt;
              color: #666;
            }
            
            .footer-section {
              flex: 1;
              text-align: center;
            }
            
            .signature-line {
              border-top: 1px solid #333;
              width: 120px;
              margin: 15px auto 5px;
            }
            
            @page {
              margin: 20mm;
              size: A4;
            }
          </style>
        </head>
        <body>
          <!-- Professional Header -->
          <div class="header">
            <!-- Report ID Badge -->
            <div class="report-id">Report #${order._id?.slice(-8) || 'R' + Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
            
            <div class="date-report">
              <span>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })} at ${new Date().toLocaleTimeString()}</span>
              <span>Study Date: ${new Date(order.orderDateTime).toLocaleDateString()}</span>
            </div>
            
            <div class="clinic-header">
              <div class="clinic-logo"></div>
              <div class="clinic-info">
                <div class="clinic-title">New Life Healthcare Center</div>
                <div class="clinic-subtitle">Department of Medical Imaging</div>
                <div class="clinic-contact">📍 Lafto, beside Kebron Guest House</div>
                <div class="clinic-phone">📞 +251925959219</div>
              </div>
            </div>
            
            <div class="report-title">
              ${order.imagingType || 'Medical Imaging'} Report
            </div>
            
            <div class="separator"></div>
            
            <!-- Professional Patient Information Grid -->
            <div class="patient-info">
              <div class="patient-info-section">
                <div class="patient-info-item">
                  <span class="patient-info-label">Patient Name:</span>
                  <span class="patient-info-value">${order.patient?.name || `Unknown Patient`}</span>
                </div>
                <div class="patient-info-item">
                  <span class="patient-info-label">Patient ID:</span>
                  <span class="patient-info-value">${(order.patient as any)?.patientId || 'N/A'}</span>
                </div>
                <div class="patient-info-item">
                  <span class="patient-info-label">Gender:</span>
                  <span class="patient-info-value">${order.patient?.gender || 'N/A'}</span>
                </div>
                <div class="patient-info-item">
                  <span class="patient-info-label">Age:</span>
                  <span class="patient-info-value">${(order.patient as any)?.age || 'N/A'} years</span>
                </div>
              </div>
              <div class="patient-info-section">
                <div class="patient-info-item">
                  <span class="patient-info-label">Examination:</span>
                  <span class="patient-info-value">${order.imagingType || 'N/A'}</span>
                </div>
                <div class="patient-info-item">
                  <span class="patient-info-label">Body Part:</span>
                  <span class="patient-info-value">${order.bodyPart || 'N/A'}</span>
                </div>
                <div class="patient-info-item">
                  <span class="patient-info-label">Ordering Doctor:</span>
                  <span class="patient-info-value">${order.doctor?.name || 'N/A'}</span>
                </div>
                <div class="patient-info-item">
                  <span class="patient-info-label">Report Status:</span>
                  <span class="patient-info-value">${order.status || 'Completed'}</span>
                </div>
              </div>
            </div>
          </div>
          
          
          
          <!-- Specialized Findings Section -->
          <div class="findings-section">
            ${order.results ? (() => {
              if (typeof order.results === 'object' && order.results !== null) {
                // Use specialized template based on imaging type and body part
                let html = generateSpecializedTemplate(order.imagingType, order.bodyPart, order.results);
                
                // Add detailed findings if available
                if (order.results.findings) {
                  html += `
                    <div class="detailed-findings-section" style="margin-top: 15px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                      <div class="finding-title" style="font-size: 9pt; font-weight: 600; color: #1e40af; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #3b82f6; padding-bottom: 3px;">
                        Detailed Clinical Findings
                      </div>
                      <div class="finding-content" style="font-size: 8pt; line-height: 1.3; color: #374151;">
                        ${processMarkdownToHTML(order.results.findings)}
                      </div>
                    </div>
                  `;
                }
                
                return html;
              } else if (typeof order.results === 'string' && order.results.trim()) {
                // Handle string results
                const resultsText = order.results.trim();
                const isConclusion = resultsText.toLowerCase().includes('conclusion') || 
                                   resultsText.toLowerCase().includes('impression') ||
                                   resultsText.length > 100;
                
                if (isConclusion) {
                  // Omit early Clinical Impression block here
                  return '';
                } else {
                  return `
                    <div class="finding-row">
                      <div class="finding-title">Clinical Findings</div>
                      <div class="finding-content">${processMarkdownToHTML(resultsText)}</div>
                    </div>
                  `;
                }
              } else {
                return `
                  <div class="finding-row">
                    <div class="finding-content" style="text-align: center; font-style: italic; color: #666;">
                      No detailed imaging results available for this study.
                    </div>
                  </div>
                `;
              }
            })() : `
              <div class="finding-row">
                <div class="finding-content" style="text-align: center; font-style: italic; color: #666;">
                  No imaging results available for this study.
                </div>
              </div>
            `}
            
            
            
          </div>
          
          <!-- Professional Footer -->
          <div class="footer">
            <div class="footer-grid">
            <div class="footer-section">
                <h5>Report Information</h5>
                <p>Generated: ${new Date().toLocaleDateString()}</p>
                <p>Time: ${new Date().toLocaleTimeString()}</p>
                <p><strong>Report ID: #${order._id?.slice(-8) || 'N/A'}</strong></p>
                <p>System: New Life CMS v2.0</p>
            </div>
              
            <div class="footer-section">
                <h5>Medical Facility</h5>
                <p><strong>New Life Healthcare Center</strong></p>
                <p>Department of Medical Imaging</p>
                <p>Professional Medical Imaging Services</p>
                <p>📞 +251925959219</p>
              </div>
              
            <div class="footer-section">
                <h5>Legal Notice</h5>
                <p>This is an official medical report</p>
                <p>Confidential patient information</p>
                <p>For authorized use only</p>
                <p>© ${new Date().getFullYear()} New Life Healthcare</p>
              </div>
            </div>
            
            <!-- Professional Signature Area -->
            <div class="signature-area">
              <div class="signature-box">
              <div class="signature-line"></div>
                <div class="signature-label">Radiologist</div>
                <div class="signature-label">${order.results?.radiologist || 'Dr. Radiologist'}</div>
                <div class="signature-date">Date: ${new Date().toLocaleDateString()}</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Verified By</div>
                <div class="signature-label">Department Head</div>
                <div class="signature-date">Date: ${new Date().toLocaleDateString()}</div>
              </div>
            </div>
            
            <div class="copyright">
              © ${new Date().getFullYear()} New Life Healthcare Center. All rights reserved. 
              This document contains confidential medical information.
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Write content to new window
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      setIsPrinting(false);
    }, 500);
  };

  const handleDownload = () => {
    // Create a comprehensive professional report
    const reportContent = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                          NEW LIFE HEALTHCARE CENTER                          ║
║                             IMAGING DEPARTMENT                               ║
║                        Professional Medical Imaging                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

IMAGING REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATIENT INFORMATION:
• Name: ${typeof order.patient === 'object' ? order.patient.name || `Unknown Patient (ID: ${(order.patient as any)?._id || order.patientId || 'N/A'})` : `Unknown Patient (ID: ${(order.patient as any)?._id || order.patientId || 'N/A'})`}
• Patient ID: ${typeof order.patient === 'object' ? order.patient._id?.slice(-8) || 'N/A' : 'N/A'}
• Order Date: ${formatDate(order.orderDateTime)}
• Status: ${order.status}

STUDY INFORMATION:
• Imaging Type: ${order.imagingType}
• Body Part: ${order.bodyPart}
• Clinical Information: ${order.clinicalInfo || 'Not provided'}
• Priority: ${order.priority || 'Routine'}
• Report ID: ${order._id?.slice(-8) || 'N/A'}

IMAGING RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${order.results ? `
${order.results?.impression ? `
IMPRESSION:
${order.results?.impression}
` : ''}

${order.results?.findings ? `
DETAILED FINDINGS:
${processMarkdownToHTML(order.results.findings)}
` : ''}

${order.results?.technique ? `
TECHNIQUE:
${order.results?.technique}
` : ''}

${order.results?.comparison ? `
COMPARISON:
${order.results?.comparison}
` : ''}

${order.results?.conclusion ? `
CONCLUSION:
${order.results?.conclusion}
` : ''}

${order.results?.radiologist ? `
REPORTING RADIOLOGIST:
${order.results?.radiologist}
Report Date: ${order.results?.reportDate ? formatDate(order.results?.reportDate) : 'Not specified'}
` : ''}
` : 'Results are not yet available for this imaging order.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
New Life Healthcare Center - Imaging Department
This is an official medical report - Confidential patient information
© ${new Date().getFullYear()} New Life Healthcare Center. All rights reserved.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imaging-report-${order._id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper function to safely render dynamic template fields
  const renderDynamicFields = () => {
    if (!order.results) return null;
    
    // Check if order.results is an object (not a string or other primitive)
    if (typeof order.results !== 'object' || order.results === null) return null;
    
    const excludedFields = ['impression', 'findings', 'technique', 'comparison', 'conclusion', 'radiologist', 'reportDate'];
    const dynamicFields = Object.keys(order.results).filter(key => 
      !excludedFields.includes(key) && 
      order.results[key] !== null && 
      order.results[key] !== undefined &&
      order.results[key] !== ''
    );
    
    if (dynamicFields.length === 0) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-muted-foreground border-b border-border/30 pb-2">
          Additional Findings
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-additional-grid">
          {dynamicFields.map(key => {
            const value = order.results[key];
            const displayValue = typeof value === 'string' ? value : String(value);
            
            return (
              <div key={key} className="bg-muted/10 p-3 rounded-lg border border-border/30 print-additional-item">
                <h5 className="font-medium text-muted-foreground mb-1 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h5>
                <p className="text-muted-foreground text-sm">{displayValue}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

    return (
    <>
      {/* Professional Print Styles */}
      <style>{`
        @media print {
          /* Reset everything for clean printing */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Show only print content */
          body * {
            visibility: hidden;
          }
          
          .print-content, .print-content * {
            visibility: visible !important;
          }
          
          /* Hide modal overlay and non-essential elements */
          .no-print {
            display: none !important;
          }
          
          /* Remove any fixed positioning that might interfere */
          .fixed, .sticky {
            position: static !important;
          }
          
          /* Main print container */
          .print-content {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            background: white !important;
            margin: 0 !important;
            padding: 20px !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-size: 12pt !important;
            line-height: 1.4 !important;
            color: black !important;
            display: block !important;
            visibility: visible !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          
          /* Ensure content is visible */
          .print-content * {
            visibility: visible !important;
          }
          
          /* Print header styling */
          .print-header {
            text-align: center !important;
            border-bottom: 3px solid #000 !important;
            margin-bottom: 25px !important;
            padding-bottom: 15px !important;
            page-break-after: avoid !important;
          }
          
          .print-header h1 {
            font-size: 20pt !important;
            font-weight: bold !important;
            margin: 0 0 5px 0 !important;
            color: black !important;
          }
          
          .print-header p {
            font-size: 14pt !important;
            margin: 0 !important;
            color: #333 !important;
          }
          
          /* Patient and study info grid */
          .print-info-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            margin-bottom: 25px !important;
            page-break-inside: avoid !important;
          }
          
          .print-info-section {
            border: 2px solid #ddd !important;
            padding: 15px !important;
            background: #f9f9f9 !important;
          }
          
          .print-info-section h3 {
            font-size: 14pt !important;
            font-weight: bold !important;
            margin: 0 0 10px 0 !important;
            border-bottom: 1px solid #ccc !important;
            padding-bottom: 5px !important;
          }
          
          .print-info-row {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 8px !important;
            font-size: 11pt !important;
          }
          
          .print-info-row strong {
            font-weight: bold !important;
          }
          
          /* Results section styling */
          .print-results-section {
            margin-top: 25px !important;
            page-break-inside: avoid !important;
          }
          
          .print-results-title {
            font-size: 16pt !important;
            font-weight: bold !important;
            text-align: center !important;
            margin: 20px 0 15px 0 !important;
            border-bottom: 2px solid #000 !important;
            padding-bottom: 10px !important;
          }
          
          /* Key findings grid for print */
          .print-findings-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 15px !important;
            margin-bottom: 20px !important;
          }
          
          .print-finding-card {
            border: 2px solid #ddd !important;
            padding: 12px !important;
            background: #f8f9fa !important;
            page-break-inside: avoid !important;
          }
          
          .print-finding-card h4 {
            font-size: 13pt !important;
            font-weight: bold !important;
            margin: 0 0 8px 0 !important;
            color: #000 !important;
          }
          
          .print-finding-card p {
            font-size: 11pt !important;
            line-height: 1.5 !important;
            margin: 0 !important;
          }
          
          /* Detailed sections */
          .print-detail-section {
            margin-bottom: 20px !important;
            page-break-inside: avoid !important;
          }
          
          .print-detail-section h4 {
            font-size: 13pt !important;
            font-weight: bold !important;
            margin: 0 0 10px 0 !important;
            border-bottom: 1px solid #ccc !important;
            padding-bottom: 5px !important;
          }
          
          .print-detail-section p {
            font-size: 11pt !important;
            line-height: 1.6 !important;
            margin: 0 !important;
            text-align: justify !important;
          }
          
          /* Additional findings grid */
          .print-additional-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
            margin-bottom: 20px !important;
          }
          
          .print-additional-item {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            background: #f9f9f9 !important;
            font-size: 10pt !important;
          }
          
          .print-additional-item h5 {
            font-size: 11pt !important;
            font-weight: bold !important;
            margin: 0 0 5px 0 !important;
          }
          
          /* Radiologist signature */
          .print-signature {
            margin-top: 30px !important;
            border: 2px solid #000 !important;
            padding: 15px !important;
            background: #f8f9fa !important;
            page-break-inside: avoid !important;
          }
          
          .print-signature h4 {
            font-size: 13pt !important;
            font-weight: bold !important;
            margin: 0 0 10px 0 !important;
          }
          
          /* Footer */
          .print-footer {
            margin-top: 40px !important;
            padding-top: 20px !important;
            border-top: 2px solid #000 !important;
            font-size: 9pt !important;
            text-align: center !important;
            page-break-inside: avoid !important;
          }
          
          .print-footer-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 20px !important;
            text-align: left !important;
            margin-bottom: 15px !important;
          }
          
          .print-footer-section h5 {
            font-size: 10pt !important;
            font-weight: bold !important;
            margin: 0 0 8px 0 !important;
          }
          
          .print-footer-section p {
            font-size: 9pt !important;
            margin: 0 0 4px 0 !important;
            line-height: 1.3 !important;
          }
          
          /* Page breaks */
          .page-break-before {
            page-break-before: always !important;
          }
          
          .page-break-after {
            page-break-after: always !important;
          }
          
          .page-break-avoid {
            page-break-inside: avoid !important;
          }
          
          /* Hide scrollbars */
          ::-webkit-scrollbar {
            display: none !important;
          }
          
          /* Rich text content styling */
          .rich-text-content h1 {
            font-size: 1.5em !important;
            font-weight: 600 !important;
            color: #1e40af !important;
            margin: 1em 0 0.5em 0 !important;
          }
          
          .rich-text-content h2 {
            font-size: 1.3em !important;
            font-weight: 600 !important;
            color: #3b82f6 !important;
            margin: 0.8em 0 0.4em 0 !important;
          }
          
          .rich-text-content h3 {
            font-size: 1.1em !important;
            font-weight: 600 !important;
            color: #6b7280 !important;
            margin: 0.6em 0 0.3em 0 !important;
          }
          
          .rich-text-content strong {
            font-weight: 600 !important;
            color: #374151 !important;
          }
          
          .rich-text-content em {
            font-style: italic !important;
          }
          
          .rich-text-content u {
            text-decoration: underline !important;
          }
          
          .rich-text-content blockquote {
            border-left: 4px solid #3b82f6 !important;
            padding-left: 16px !important;
            margin: 1em 0 !important;
            font-style: italic !important;
            background: #f0f7ff !important;
            padding: 12px 16px !important;
            border-radius: 0 8px 8px 0 !important;
          }
          
          .rich-text-content ul, 
          .rich-text-content ol {
            margin: 1em 0 !important;
            padding-left: 1.5em !important;
          }
          
          .rich-text-content li {
            margin: 0.3em 0 !important;
            line-height: 1.6 !important;
          }
          
          .rich-text-content p {
            margin: 0.5em 0 !important;
            line-height: 1.6 !important;
          }
          
          /* Page margins */
          @page {
            margin: 0.75in;
            size: letter;
          }
          
          /* Ensure print header is visible */
          .print-header {
            display: block !important;
          }
          
          /* Make sure all print content is visible */
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
      
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print print:static print:bg-transparent print:p-0">
        <div className="bg-primary-foreground rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden print-content print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:rounded-none">
          {/* Professional Print Header (Hidden on screen, visible on print) */}
          <div style={{ display: 'none' }} className="print-header print:block">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  backgroundColor: '#4F46E5', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: '15px',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}>
                  +
                </div>
                <div>
                  <h1 style={{ fontSize: '24pt', fontWeight: 'bold', margin: '0', color: '#000' }}>
                    New Life Healthcare Center
                  </h1>
                  <p style={{ fontSize: '14pt', margin: '0', color: '#666' }}>
                    Comprehensive Imaging Report
                  </p>
                  <p style={{ fontSize: '11pt', margin: '0', color: '#666' }}>
                    Location: Main Hospital, Imaging Department
                  </p>
                  <p style={{ fontSize: '11pt', margin: '0', color: '#666' }}>
                    Phone: +251123456789
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12pt', margin: '0', fontWeight: 'bold' }}>
                  Date: {new Date().toLocaleDateString()}
                </p>
                <p style={{ fontSize: '12pt', margin: '0', fontWeight: 'bold' }}>
                  Report ID: {order._id?.slice(-8).toUpperCase() || 'N/A'}
                </p>
              </div>
            </div>
            
            {/* Separator Line */}
            <div style={{ 
              width: '100%', 
              height: '2px', 
              backgroundColor: '#000', 
              marginBottom: '20px' 
            }}></div>
            
            {/* Patient Information Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: '20px', 
              marginBottom: '25px',
              fontSize: '11pt'
            }}>
              <div>
                <strong>Patient Name:</strong> {typeof order.patient === 'object' ? order.patient.name || `Unknown Patient (ID: ${(order.patient as any)?._id || order.patientId || 'N/A'})` : `Unknown Patient (ID: ${(order.patient as any)?._id || order.patientId || 'N/A'})`}
              </div>
              <div>
                <strong>Patient ID:</strong> {typeof order.patient === 'object' ? order.patient._id?.slice(-8) || 'N/A' : 'N/A'}
              </div>
              <div>
                <strong>Gender:</strong> N/A
              </div>
              <div>
                <strong>Age:</strong> N/A
              </div>
              <div>
                <strong>Date of Birth:</strong> Not recorded
              </div>
              <div>
                <strong>Study Date:</strong> {formatDate(order.orderDateTime)}
              </div>
            </div>
            
            {/* Results Section Header */}
            <div style={{ 
              fontSize: '16pt', 
              fontWeight: 'bold', 
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '1px solid #ccc'
            }}>
              Imaging Results
            </div>
            

          </div>

          {/* Screen Header (Visible on screen, hidden on print) */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-primary-foreground px-6 py-4 no-print">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-primary/30" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Imaging Report</h2>
                  <p className="text-primary/20 text-sm">
                    {order.imagingType || 'Unknown'} • {order.bodyPart || 'Unknown'} • {typeof order.patient === 'object' ? order.patient.name || `Unknown Patient (ID: ${(order.patient as any)?._id || order.patientId || 'N/A'})` : `Unknown Patient (ID: ${(order.patient as any)?._id || order.patientId || 'N/A'})`}
                  </p>
                </div>
              </div>
            <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                  Report ID: #{order._id?.slice(-6) || 'N/A'}
                </span>
              <button
                onClick={handleDownload}
                  className="p-2 text-primary/30 hover:text-primary-foreground hover:bg-primary rounded-lg transition-colors"
                title="Download Report"
              >
                <Download size={20} />
              </button>
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                  className="p-2 text-primary/30 hover:text-primary-foreground hover:bg-primary rounded-lg transition-colors disabled:opacity-50"
                title="Print Report"
              >
                <Printer size={20} />
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 text-primary/30 hover:text-primary-foreground hover:bg-primary rounded-lg transition-colors"
                  title="Edit Results"
                >
                  <FileText size={20} />
                </button>
              )}
             <button
                onClick={onClose}
                  className="p-2 text-primary/30 hover:text-primary-foreground hover:bg-primary rounded-lg transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
           </div>
        </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(95vh-80px)] print:overflow-visible print:max-h-none">

          {/* Report Content */}
            <div className="px-6 py-6 space-y-8 print:px-4 print:py-4">
              {/* Hospital Header - Enhanced */}
              <div className="text-center border-b-2 border-border/40 pb-6 print-header print-section">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <Activity className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-muted-foreground">New Life Healthcare Center</h1>
                    <p className="text-lg text-muted-foreground font-medium">Imaging Department - Professional Reports</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <p>Professional Medical Imaging Services</p>
                  <p className="font-medium text-muted-foreground mt-1">
                    Report Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </p>
      </div>
        </div>
        
              {/* Enhanced Patient Information Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-info-grid">
                {/* Patient Information Card */}
                <div className="bg-muted/10 border border-border/30 rounded-lg p-6 print-info-section">
                  <div className="flex items-center mb-4">
                    <User className="h-5 w-5 text-muted-foreground mr-2 no-print" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Patient Information</h3>
                  </div>
              <div className="space-y-3">
                    <div className="flex justify-between print-info-row">
                      <span className="font-medium text-muted-foreground"><strong>Name:</strong></span>
                      <span className="text-muted-foreground font-semibold">
                        {typeof order.patient === 'object' ? order.patient.name || `Unknown Patient (ID: ${(order.patient as any)?._id || order.patientId || 'N/A'})` : `Unknown Patient (ID: ${(order.patient as any)?._id || order.patientId || 'N/A'})`}
                      </span>
                    </div>
                    <div className="flex justify-between print-info-row">
                      <span className="font-medium text-muted-foreground"><strong>Patient ID:</strong></span>
                      <span className="text-muted-foreground font-mono text-sm">
                        {typeof order.patient === 'object' ? order.patient._id?.slice(-8) || 'N/A' : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between print-info-row">
                      <span className="font-medium text-muted-foreground"><strong>Order Date:</strong></span>
                      <span className="text-muted-foreground">{formatDate(order.orderDateTime)}</span>
                    </div>
                    <div className="flex justify-between items-center print-info-row">
                      <span className="font-medium text-muted-foreground"><strong>Status:</strong></span>
                      <span className={`px-3 py-1 text-xs rounded-full font-semibold ${
                      order.status?.toLowerCase() === 'results available' || order.status?.toLowerCase() === 'completed'
                          ? 'bg-primary/20 text-primary border border-primary/30' 
                          : 'bg-accent/20 text-accent-foreground border border-yellow-200'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
        </div>

                {/* Study Information Card */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 print-info-section">
                  <div className="flex items-center mb-4">
                    <Calendar className="h-5 w-5 text-primary mr-2 no-print" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Study Information</h3>
                  </div>
              <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Imaging Type:</span>
                      <span className="text-muted-foreground font-semibold bg-primary/20 px-2 py-1 rounded text-sm">
                        {order.imagingType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Body Part:</span>
                      <span className="text-muted-foreground font-semibold bg-primary/20 px-2 py-1 rounded text-sm">
                        {order.bodyPart}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Priority:</span>
                      <span className="text-muted-foreground">{order.priority || 'Routine'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground block mb-1">Clinical Information:</span>
                      <div className="text-muted-foreground bg-primary-foreground p-2 rounded border text-sm">
                        {order.clinicalInfo || 'No clinical information provided'}
                      </div>
                    </div>
                </div>
              </div>
            </div>

              {/* Enhanced Results Section */}
              <div className="space-y-6 print-section">
                <div className="flex items-center">
                  <FileText className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-xl font-bold text-muted-foreground border-b-2 border-primary/30 pb-2 flex-1 print-results-title">
                Imaging Results
              </h3>
                </div>
              
              {order.results ? (
                  <div className="space-y-6 print-results-section">

                    {/* Key Findings Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-findings-grid">
                                            {/* Impression */}
                      {/* Impression card removed to avoid duplicate section at top */}

                      {/* Conclusion */}
                      {order.results?.conclusion && (
                        <div className="bg-primary/10 border-l-4 border-primary/50 p-6 rounded-r-lg print-finding-card">
                          <div className="flex items-center mb-3">
                            <div className="w-2 h-2 bg-primary rounded-full mr-2 no-print"></div>
                            <h4 className="font-bold text-primary text-lg">Conclusion</h4>
                          </div>
                          <p className="text-muted-foreground leading-relaxed font-medium">{order.results?.conclusion}</p>
                        </div>
                      )}
                    </div>

                    {/* Detailed Findings */}
                    {order.results?.findings && (
                      <div className="bg-primary-foreground border border-border/30 rounded-lg p-6 shadow-sm print-detail-section">
                        <h4 className="font-bold text-muted-foreground text-lg mb-4 flex items-center">
                          <div className="w-3 h-3 bg-indigo-600 rounded-full mr-3 no-print"></div>
                          Detailed Findings
                        </h4>
                        <div 
                          className="text-muted-foreground leading-relaxed bg-muted/10 p-4 rounded-lg border rich-text-content"
                          dangerouslySetInnerHTML={{ 
                            __html: order.results?.findings ? processMarkdownToHTML(order.results.findings) : '' 
                          }}
                        />
            </div>
                  )}

                    {/* Technical Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {order.results?.technique && (
                        <div className="bg-secondary/10 p-4 rounded-lg border border-secondary/30">
                          <h4 className="font-semibold text-secondary-foreground mb-2 flex items-center">
                            <div className="w-2 h-2 bg-secondary rounded-full mr-2"></div>
                            Technique
                          </h4>
                          <p className="text-muted-foreground text-sm">{order.results?.technique}</p>
            </div>
                  )}

                  {order.results?.comparison && (
                        <div className="bg-accent/10 p-4 rounded-lg border border-orange-200">
                          <h4 className="font-semibold text-accent-foreground mb-2 flex items-center">
                            <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                            Comparison
                          </h4>
                          <p className="text-muted-foreground text-sm">{order.results?.comparison}</p>
            </div>
                  )}
                    </div>

                    {/* Radiologist Signature */}
                    {order.results?.radiologist && (
                      <div className="bg-muted/20 p-4 rounded-lg border border-border/40 print-signature">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-muted-foreground mb-1">Reporting Radiologist</h4>
                            <p className="text-muted-foreground font-medium">{order.results?.radiologist}</p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>Report Date:</p>
                            <p className="font-medium">{order.results?.reportDate ? formatDate(order.results?.reportDate) : 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Dynamic Fields */}
                    {renderDynamicFields()}

                </div>
              ) : (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-border/30">
                    <div className="max-w-lg mx-auto">
                      <div className="w-20 h-20 mx-auto mb-6 bg-accent/20 rounded-full flex items-center justify-center shadow-lg">
                        <FileText className="w-10 h-10 text-accent-foreground" />
                    </div>
                      <h4 className="text-2xl font-bold text-muted-foreground mb-3">Results Pending</h4>
                      <p className="text-muted-foreground mb-6 text-lg">
                        The imaging study has been completed, but results are not yet available.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                          <h5 className="font-semibold text-primary mb-2">Current Status</h5>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            order.status?.toLowerCase() === 'results available' || order.status?.toLowerCase() === 'completed'
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-accent/20 text-accent-foreground'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                          <h5 className="font-semibold text-primary mb-2">Order ID</h5>
                          <p className="text-primary font-mono text-sm">#{order._id?.slice(-8) || 'N/A'}</p>
                        </div>
                    </div>
                    
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-primary/30 rounded-lg p-6 text-left">
                        <h5 className="font-semibold text-primary mb-3 flex items-center">
                          <Calendar className="h-5 w-5 mr-2" />
                          Next Steps
                        </h5>
                        <ul className="text-primary space-y-2 text-sm">
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                            Results will appear here once the radiologist completes the interpretation
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                            You will be automatically notified when results become available
                          </li>
                          <li className="flex items-start">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                            For urgent concerns, contact the imaging department directly
                          </li>
                        </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

              {/* Enhanced Professional Footer */}
              <div className="border-t-2 border-border/40 pt-6 mt-8 print-footer">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm print-footer-grid">
                  <div className="text-center md:text-left print-footer-section">
                    <h5 className="font-semibold text-muted-foreground mb-2">Report Information</h5>
                    <p className="text-muted-foreground">Generated: {new Date().toLocaleDateString()}</p>
                    <p className="text-muted-foreground">Time: {new Date().toLocaleTimeString()}</p>
                    <p className="text-muted-foreground font-medium">Report ID: #{order._id?.slice(-8) || 'N/A'}</p>
                  </div>
                  
                  <div className="text-center print-footer-section">
                    <h5 className="font-semibold text-muted-foreground mb-2">Medical Facility</h5>
                    <p className="text-muted-foreground font-medium">New Life Healthcare Center</p>
                    <p className="text-muted-foreground">Imaging Department</p>
                    <p className="text-muted-foreground">Professional Medical Imaging Services</p>
                  </div>
                  
                  <div className="text-center md:text-right print-footer-section">
                    <h5 className="font-semibold text-muted-foreground mb-2">Legal Notice</h5>
                    <p className="text-muted-foreground">This is an official medical report</p>
                    <p className="text-muted-foreground">Confidential patient information</p>
                    <p className="text-muted-foreground">For authorized use only</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-border/30 text-center">
                  <p className="text-xs text-muted-foreground">
                    © {new Date().getFullYear()} New Life Healthcare Center. All rights reserved. 
                    This document contains confidential medical information.
                  </p>
                </div>
                
                {/* Print Footer - Professional Medical Report Style */}
                <div className="hidden print:block" style={{ 
                  position: 'fixed', 
                  bottom: '20px', 
                  left: '20px', 
                  right: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10pt',
                  color: '#666',
                  borderTop: '1px solid #ccc',
                  paddingTop: '10px'
                }}>
                  <div>
                    <strong>Physician:</strong> {order.results?.radiologist || 'Dr. Radiologist'}<br/>
                    <strong>Verified by:</strong> {order.results?.radiologist || 'Dr. Radiologist'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>New Life Healthcare Center - Imaging Report System</strong><br/>
                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer with Action Buttons */}
            <div className="sticky bottom-0 bg-primary-foreground border-t border-border/30 px-6 py-4 flex justify-end space-x-3 no-print">
              <button
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground bg-muted/20 hover:bg-muted/30 rounded-lg transition-colors"
              >
                Close
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-4 py-2 text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  // TODO: Implement send to doctor functionality
                  console.log('Send to Doctor clicked for order:', order._id);
                  onClose(); // Close the dialog
                }}
                className="px-4 py-2 text-primary-foreground bg-primary hover:bg-primary rounded-lg transition-colors"
              >
                Send to Doctor
              </button>
            </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default ImagingResultsViewer; 