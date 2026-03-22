import React, { useState, useEffect } from 'react';
import imagingService, { ImagingOrder } from '../../services/imagingService';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import RichTextEditor from '../ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save, Send, FileText, User, Calendar } from 'lucide-react';

interface ImagingResultsFormProps {
  order: ImagingOrder;
  onSubmit: (orderId: string, results: any) => void;
  onCancel: () => void;
}

// ======= EMR-STYLE TEMPLATES =======
// Field definition inside a section of the report
interface TemplateField { 
  key: string; 
  label: string; 
  type?: 'text' | 'number' | 'select';
  options?: string[]; // for select
  placeholder?: string;
  unit?: string; // optional unit hint
  step?: number; // for number inputs
}
interface TemplateSection { name: string; fields: TemplateField[] }
interface StudyTemplate { sections: TemplateSection[] }

// Templates are organised Modality ➜ Study (body part) ➜ Sections & Fields
// NOTE: This can be expanded over time without touching component logic
const EMR_TEMPLATES: Record<string, Record<string, StudyTemplate>> = {
  ultrasound: {
    abdominopelvic: {
      sections: [
        {
          name: 'Liver',
          fields: [
            { key: 'liverSize', label: 'Size (cm)', type: 'number', step: 0.1 },
            { key: 'liverEchotexture', label: 'Echotexture', type: 'select', options: ['Normal', 'Increased', 'Decreased', 'Heterogeneous'] },
            { key: 'liverFocalLesion', label: 'Focal Lesion', type: 'select', options: ['None', 'Present'] },
            { key: 'intrahepaticDucts', label: 'Intrahepatic Ducts', type: 'select', options: ['Not Dilated', 'Dilated'] },
            { key: 'portalVeinFlow', label: 'Portal Vein Flow', placeholder: 'e.g., hepatopetal, normal waveform' },
          ],
        },
        {
          name: 'Gallbladder & Biliary Tree',
          fields: [
            { key: 'gbWall', label: 'GB Wall Thickness (mm)', type: 'number', step: 0.1 },
            { key: 'gbStones', label: 'Gallstones', type: 'select', options: ['Absent', 'Present'] },
            { key: 'gbSludge', label: 'Sludge', type: 'select', options: ['Absent', 'Present'] },
            { key: 'murphysSign', label: "Murphy's Sign", type: 'select', options: ['Negative', 'Positive'] },
            { key: 'cbdDiameter', label: 'CBD Diameter (mm)', type: 'number', step: 0.1 },
          ],
        },
        {
          name: 'Pancreas & Spleen',
          fields: [
            { key: 'pancreasVisualization', label: 'Pancreas Visualization', type: 'select', options: ['Well Seen', 'Partially Seen', 'Poorly Seen'] },
            { key: 'pancreaticDuct', label: 'Pancreatic Duct', type: 'select', options: ['Not Dilated', 'Dilated'] },
            { key: 'spleenSize', label: 'Spleen Size (cm)', type: 'number', step: 0.1 },
            { key: 'spleenEchotexture', label: 'Spleen Echotexture', type: 'select', options: ['Normal', 'Heterogeneous'] },
          ],
        },
        {
          name: 'Right Kidney',
          fields: [
            { key: 'rkLength', label: 'Length (cm)', type: 'number', step: 0.1 },
            { key: 'rkEchogenicity', label: 'Parenchymal Echogenicity', type: 'select', options: ['Normal', 'Increased'] },
            { key: 'rkCMD', label: 'CMD Preserved', type: 'select', options: ['Yes', 'No'] },
            { key: 'rkHydronephrosis', label: 'Hydronephrosis', type: 'select', options: ['None', 'Grade I', 'Grade II', 'Grade III'] },
          ],
        },
        {
          name: 'Left Kidney',
          fields: [
            { key: 'lkLength', label: 'Length (cm)', type: 'number', step: 0.1 },
            { key: 'lkEchogenicity', label: 'Parenchymal Echogenicity', type: 'select', options: ['Normal', 'Increased'] },
            { key: 'lkCMD', label: 'CMD Preserved', type: 'select', options: ['Yes', 'No'] },
            { key: 'lkHydronephrosis', label: 'Hydronephrosis', type: 'select', options: ['None', 'Grade I', 'Grade II', 'Grade III'] },
          ],
        },
        {
          name: 'Bladder & Pelvis',
          fields: [
            { key: 'bladderWall', label: 'Bladder Wall (mm)', type: 'number', step: 0.1 },
            { key: 'pvr', label: 'Post-Void Residual (ml)', type: 'number', step: 1 },
            { key: 'pelvicOrgans', label: 'Pelvic Organs', placeholder: 'e.g., Prostate/Uterus/Adnexa findings' },
          ],
        },
      ],
    },
    obstetric: {
      sections: [
        {
          name: 'Fetus',
          fields: [
            { key: 'fetuses', label: 'Number of Fetuses', type: 'number', step: 1 },
            { key: 'presentation', label: 'Presentation', type: 'select', options: ['Cephalic', 'Breech', 'Transverse', 'Oblique'] },
            { key: 'fhr', label: 'Fetal Heart Rate (bpm)', type: 'number', step: 1 },
          ],
        },
        {
          name: 'Biometry',
          fields: [
            { key: 'crl', label: 'CRL (mm)', type: 'number', step: 0.1 },
            { key: 'bpd', label: 'BPD (mm)', type: 'number', step: 0.1 },
            { key: 'hc', label: 'HC (mm)', type: 'number', step: 0.1 },
            { key: 'ac', label: 'AC (mm)', type: 'number', step: 0.1 },
            { key: 'fl', label: 'FL (mm)', type: 'number', step: 0.1 },
            { key: 'efw', label: 'EFW (g)', type: 'number', step: 1 },
            { key: 'ga', label: 'Gestational Age (weeks+days)', placeholder: 'e.g., 20+3' },
          ],
        },
        {
          name: 'Placenta & Liquor',
          fields: [
            { key: 'placentaLocation', label: 'Placenta Location', type: 'select', options: ['Anterior', 'Posterior', 'Fundal', 'Low-lying'] },
            { key: 'placentaGrade', label: 'Placenta Grade', type: 'select', options: ['0', 'I', 'II', 'III'] },
            { key: 'previa', label: 'Placenta Previa', type: 'select', options: ['Absent', 'Present'] },
            { key: 'afi', label: 'AFI (cm)', type: 'number', step: 0.1 },
            { key: 'mvp', label: 'MVP (cm)', type: 'number', step: 0.1 },
            { key: 'liquor', label: 'Amniotic Fluid', type: 'select', options: ['Normal', 'Oligohydramnios', 'Polyhydramnios'] },
          ],
        },
        {
          name: 'Cervix & Adnexa',
          fields: [
            { key: 'cervicalLength', label: 'Cervical Length (mm)', type: 'number', step: 0.1 },
            { key: 'os', label: 'Os', type: 'select', options: ['Closed', 'Open'] },
            { key: 'adnexa', label: 'Adnexa', placeholder: 'e.g., normal / cyst / mass' },
          ],
        },
      ],
    },
    pelvic: {
      sections: [
        {
          name: 'Uterus',
          fields: [
            { key: 'uterusSize', label: 'Uterus Size (L x W x H cm)', placeholder: 'e.g., 7.5 x 4.2 x 3.8' },
            { key: 'uterusPosition', label: 'Position', type: 'select', options: ['Anteverted', 'Retroverted', 'Anteflexed', 'Retroflexed'] },
            { key: 'endometriumThickness', label: 'Endometrium Thickness (mm)', type: 'number', step: 0.1 },
            { key: 'myometrium', label: 'Myometrium', type: 'select', options: ['Normal', 'Fibroids', 'Adenomyosis'] },
          ],
        },
        {
          name: 'Right Ovary',
          fields: [
            { key: 'rightOvarySize', label: 'Size (L x W x H cm)', placeholder: 'e.g., 3.2 x 2.1 x 2.4' },
            { key: 'rightOvaryEcho', label: 'Echogenicity', type: 'select', options: ['Normal', 'Increased', 'Decreased'] },
            { key: 'rightOvaryCysts', label: 'Cysts/Masses', type: 'select', options: ['None', 'Simple Cyst', 'Complex Cyst', 'Solid Mass'] },
          ],
        },
        {
          name: 'Left Ovary',
          fields: [
            { key: 'leftOvarySize', label: 'Size (L x W x H cm)', placeholder: 'e.g., 3.0 x 2.2 x 2.1' },
            { key: 'leftOvaryEcho', label: 'Echogenicity', type: 'select', options: ['Normal', 'Increased', 'Decreased'] },
            { key: 'leftOvaryCysts', label: 'Cysts/Masses', type: 'select', options: ['None', 'Simple Cyst', 'Complex Cyst', 'Solid Mass'] },
          ],
        },
        {
          name: 'Pouch of Douglas',
          fields: [
            { key: 'freeFluid', label: 'Free Fluid', type: 'select', options: ['Absent', 'Minimal', 'Moderate', 'Large Amount'] },
            { key: 'cervix', label: 'Cervix', type: 'select', options: ['Normal', 'Abnormal'] },
          ],
        },
      ],
    },
    prostate: {
      sections: [
        {
          name: 'Prostate Gland',
          fields: [
            { key: 'prostateSize', label: 'Prostate Size (L x W x H cm)', placeholder: 'e.g., 4.2 x 3.8 x 3.5' },
            { key: 'prostateVolume', label: 'Volume (cc)', type: 'number', step: 1 },
            { key: 'prostateEcho', label: 'Echogenicity', type: 'select', options: ['Homogeneous', 'Heterogeneous', 'Nodular'] },
            { key: 'capsule', label: 'Capsule', type: 'select', options: ['Intact', 'Irregular'] },
            { key: 'calcifications', label: 'Calcifications', type: 'select', options: ['Absent', 'Present'] },
          ],
        },
        {
          name: 'Bladder',
          fields: [
            { key: 'bladderWall', label: 'Bladder Wall Thickness (mm)', type: 'number', step: 0.1 },
            { key: 'bladderContents', label: 'Bladder Contents', type: 'select', options: ['Clear', 'Debris', 'Stones'] },
            { key: 'pvr', label: 'Post-Void Residual (ml)', type: 'number', step: 1 },
          ],
        },
        {
          name: 'Kidneys',
          fields: [
            { key: 'rightKidneySize', label: 'Right Kidney Length (cm)', type: 'number', step: 0.1 },
            { key: 'leftKidneySize', label: 'Left Kidney Length (cm)', type: 'number', step: 0.1 },
            { key: 'hydronephrosis', label: 'Hydronephrosis', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
          ],
        },
      ],
    },
    thyroid: {
      sections: [
        {
          name: 'Right Thyroid Lobe',
          fields: [
            { key: 'rightLobeSize', label: 'Size (L x W x D cm)', placeholder: 'e.g., 4.5 x 1.8 x 1.5' },
            { key: 'rightLobeEcho', label: 'Echogenicity', type: 'select', options: ['Normal', 'Increased', 'Decreased', 'Heterogeneous'] },
            { key: 'rightLobeNodules', label: 'Nodules', type: 'select', options: ['None', 'Single', 'Multiple'] },
            { key: 'rightNoduleDetails', label: 'Nodule Details', placeholder: 'Size, characteristics if present' },
          ],
        },
        {
          name: 'Left Thyroid Lobe',
          fields: [
            { key: 'leftLobeSize', label: 'Size (L x W x D cm)', placeholder: 'e.g., 4.3 x 1.7 x 1.4' },
            { key: 'leftLobeEcho', label: 'Echogenicity', type: 'select', options: ['Normal', 'Increased', 'Decreased', 'Heterogeneous'] },
            { key: 'leftLobeNodules', label: 'Nodules', type: 'select', options: ['None', 'Single', 'Multiple'] },
            { key: 'leftNoduleDetails', label: 'Nodule Details', placeholder: 'Size, characteristics if present' },
          ],
        },
        {
          name: 'Isthmus & Lymph Nodes',
          fields: [
            { key: 'isthmusThickness', label: 'Isthmus Thickness (mm)', type: 'number', step: 0.1 },
            { key: 'lymphNodes', label: 'Cervical Lymph Nodes', type: 'select', options: ['Normal', 'Enlarged'] },
            { key: 'vascularityDoppler', label: 'Vascularity (Doppler)', type: 'select', options: ['Normal', 'Increased', 'Decreased'] },
          ],
        },
      ],
    },
    breast: {
      sections: [
        {
          name: 'Right Breast',
          fields: [
            { key: 'rightBreastEcho', label: 'Parenchymal Echogenicity', type: 'select', options: ['Homogeneous', 'Heterogeneous'] },
            { key: 'rightBreastMasses', label: 'Masses/Lesions', type: 'select', options: ['None', 'Solid Mass', 'Cystic Lesion', 'Complex Mass'] },
            { key: 'rightMassDetails', label: 'Mass Details', placeholder: 'Size, location, characteristics if present' },
            { key: 'rightNipple', label: 'Nipple-Areolar Complex', type: 'select', options: ['Normal', 'Abnormal'] },
          ],
        },
        {
          name: 'Left Breast',
          fields: [
            { key: 'leftBreastEcho', label: 'Parenchymal Echogenicity', type: 'select', options: ['Homogeneous', 'Heterogeneous'] },
            { key: 'leftBreastMasses', label: 'Masses/Lesions', type: 'select', options: ['None', 'Solid Mass', 'Cystic Lesion', 'Complex Mass'] },
            { key: 'leftMassDetails', label: 'Mass Details', placeholder: 'Size, location, characteristics if present' },
            { key: 'leftNipple', label: 'Nipple-Areolar Complex', type: 'select', options: ['Normal', 'Abnormal'] },
          ],
        },
        {
          name: 'Lymph Nodes',
          fields: [
            { key: 'axillaryNodes', label: 'Axillary Lymph Nodes', type: 'select', options: ['Normal', 'Enlarged', 'Suspicious'] },
            { key: 'supraclavicularNodes', label: 'Supraclavicular Nodes', type: 'select', options: ['Normal', 'Enlarged'] },
            { key: 'skinThickening', label: 'Skin Thickening', type: 'select', options: ['Absent', 'Present'] },
          ],
        },
      ],
    },
  },
  'x-ray': {
    chest: {
      sections: [
        {
          name: 'Cardiomediastinal',
          fields: [
            { key: 'heartSize', label: 'Heart Size', type: 'select', options: ['Normal', 'Enlarged', 'Borderline'] },
            { key: 'mediastinum', label: 'Mediastinum', type: 'select', options: ['Normal', 'Widened', 'Shifted'] },
            { key: 'hila', label: 'Hila', type: 'select', options: ['Normal', 'Prominent', 'Mass'] },
          ],
        },
        {
          name: 'Lung Fields',
          fields: [
            { key: 'lungFields', label: 'Lung Fields', type: 'select', options: ['Clear', 'Infiltrates', 'Consolidation', 'Nodules'] },
            { key: 'pleura', label: 'Pleura', type: 'select', options: ['Normal', 'Effusion', 'Thickening', 'Pneumothorax'] },
            { key: 'diaphragm', label: 'Diaphragm', type: 'select', options: ['Normal', 'Elevated', 'Flattened'] },
          ],
        },
        {
          name: 'Bones & Soft Tissues',
          fields: [
            { key: 'ribs', label: 'Ribs', type: 'select', options: ['Intact', 'Fracture', 'Old Fracture'] },
            { key: 'spine', label: 'Thoracic Spine', type: 'select', options: ['Normal', 'Degenerative Changes', 'Abnormal'] },
            { key: 'softTissues', label: 'Soft Tissues', type: 'select', options: ['Normal', 'Swelling', 'Calcification'] },
          ],
        },
      ],
    },
    abdomen: {
      sections: [
        {
          name: 'Bowel Gas Pattern',
          fields: [
            { key: 'bowelGas', label: 'Bowel Gas Distribution', type: 'select', options: ['Normal', 'Dilated Loops', 'Obstruction', 'Ileus'] },
            { key: 'gasPattern', label: 'Gas Pattern', type: 'select', options: ['Normal', 'Small Bowel Obstruction', 'Large Bowel Obstruction'] },
          ],
        },
        {
          name: 'Organs',
          fields: [
            { key: 'liver', label: 'Liver Shadow', type: 'select', options: ['Normal', 'Enlarged', 'Not Visualized'] },
            { key: 'spleen', label: 'Spleen', type: 'select', options: ['Normal', 'Enlarged', 'Not Visualized'] },
            { key: 'kidneys', label: 'Kidney Shadows', type: 'select', options: ['Normal', 'Enlarged', 'Calcifications'] },
          ],
        },
        {
          name: 'Bones & Other',
          fields: [
            { key: 'spine', label: 'Lumbar Spine', type: 'select', options: ['Normal', 'Degenerative Changes', 'Compression Fracture'] },
            { key: 'pelvis', label: 'Pelvis', type: 'select', options: ['Normal', 'Fracture', 'Abnormal'] },
            { key: 'calcifications', label: 'Abnormal Calcifications', type: 'select', options: ['None', 'Vascular', 'Organ', 'Other'] },
          ],
        },
      ],
    },
    pelvis: {
      sections: [
        {
          name: 'Hip Joints',
          fields: [
            { key: 'rightHip', label: 'Right Hip Joint', type: 'select', options: ['Normal', 'Arthritis', 'Fracture', 'Dislocation'] },
            { key: 'leftHip', label: 'Left Hip Joint', type: 'select', options: ['Normal', 'Arthritis', 'Fracture', 'Dislocation'] },
            { key: 'jointSpaces', label: 'Joint Spaces', type: 'select', options: ['Preserved', 'Narrowed', 'Lost'] },
          ],
        },
        {
          name: 'Pelvic Bones',
          fields: [
            { key: 'sacrum', label: 'Sacrum', type: 'select', options: ['Normal', 'Fracture', 'Degenerative Changes'] },
            { key: 'pubicBones', label: 'Pubic Bones', type: 'select', options: ['Normal', 'Fracture', 'Diastasis'] },
            { key: 'iliacBones', label: 'Iliac Bones', type: 'select', options: ['Normal', 'Fracture', 'Lesion'] },
          ],
        },
        {
          name: 'Soft Tissues',
          fields: [
            { key: 'softTissues', label: 'Pelvic Soft Tissues', type: 'select', options: ['Normal', 'Swelling', 'Calcification'] },
            { key: 'bowelGas', label: 'Bowel Gas', type: 'select', options: ['Normal', 'Distended', 'Abnormal'] },
          ],
        },
      ],
    },
  },
  'ct-scan': {
    head: {
      sections: [
        {
          name: 'Brain Parenchyma',
          fields: [
            { key: 'grayWhite', label: 'Gray-White Differentiation', type: 'select', options: ['Preserved', 'Lost', 'Blurred'] },
            { key: 'hemorrhage', label: 'Hemorrhage', type: 'select', options: ['None', 'Intraparenchymal', 'Subarachnoid', 'Subdural', 'Epidural'] },
            { key: 'infarct', label: 'Infarction', type: 'select', options: ['None', 'Acute', 'Chronic', 'Lacunar'] },
            { key: 'masses', label: 'Mass Lesions', type: 'select', options: ['None', 'Present'] },
          ],
        },
        {
          name: 'Ventricular System',
          fields: [
            { key: 'ventricles', label: 'Ventricular Size', type: 'select', options: ['Normal', 'Dilated', 'Compressed'] },
            { key: 'midlineShift', label: 'Midline Shift', type: 'select', options: ['None', 'Present'] },
            { key: 'hydrocephalus', label: 'Hydrocephalus', type: 'select', options: ['Absent', 'Present'] },
          ],
        },
        {
          name: 'Extra-axial',
          fields: [
            { key: 'extraAxial', label: 'Extra-axial Collections', type: 'select', options: ['None', 'Subdural', 'Epidural', 'Subarachnoid'] },
            { key: 'skull', label: 'Skull', type: 'select', options: ['Normal', 'Fracture', 'Lesion'] },
            { key: 'sinuses', label: 'Paranasal Sinuses', type: 'select', options: ['Clear', 'Fluid Levels', 'Opacified'] },
          ],
        },
      ],
    },
  },
  'mri': {
    brain: {
      sections: [
        {
          name: 'T1/T2 Signal',
          fields: [
            { key: 't1Signal', label: 'T1 Signal Abnormalities', type: 'select', options: ['None', 'Hyperintense', 'Hypointense', 'Mixed'] },
            { key: 't2Signal', label: 'T2 Signal Abnormalities', type: 'select', options: ['None', 'Hyperintense', 'Hypointense', 'Mixed'] },
            { key: 'flairSignal', label: 'FLAIR Signal Changes', type: 'select', options: ['None', 'Hyperintense', 'Hypointense'] },
          ],
        },
        {
          name: 'Enhancement Pattern',
          fields: [
            { key: 'enhancement', label: 'Post-Contrast Enhancement', type: 'select', options: ['None', 'Ring Enhancement', 'Homogeneous', 'Heterogeneous'] },
            { key: 'meninges', label: 'Meningeal Enhancement', type: 'select', options: ['Normal', 'Abnormal'] },
          ],
        },
        {
          name: 'Vascular & Other',
          fields: [
            { key: 'vessels', label: 'Major Vessels', type: 'select', options: ['Normal Flow Voids', 'Abnormal'] },
            { key: 'diffusion', label: 'Diffusion Changes', type: 'select', options: ['None', 'Restricted', 'Facilitated'] },
          ],
        },
      ],
    },
  },
  'echocardiogram': {
    transthoracic: {
      sections: [
        {
          name: 'Left Ventricle',
          fields: [
            { key: 'lvef', label: 'LV Ejection Fraction (%)', type: 'number', step: 1 },
            { key: 'lvSize', label: 'LV Size', type: 'select', options: ['Normal', 'Dilated', 'Small'] },
            { key: 'lvFunction', label: 'LV Systolic Function', type: 'select', options: ['Normal', 'Mild Dysfunction', 'Moderate Dysfunction', 'Severe Dysfunction'] },
            { key: 'wallMotion', label: 'Wall Motion', type: 'select', options: ['Normal', 'Hypokinetic', 'Akinetic', 'Dyskinetic'] },
          ],
        },
        {
          name: 'Right Heart',
          fields: [
            { key: 'rvSize', label: 'RV Size', type: 'select', options: ['Normal', 'Dilated', 'Small'] },
            { key: 'rvFunction', label: 'RV Function', type: 'select', options: ['Normal', 'Reduced'] },
            { key: 'raSize', label: 'RA Size', type: 'select', options: ['Normal', 'Dilated'] },
            { key: 'tricuspidRegurg', label: 'Tricuspid Regurgitation', type: 'select', options: ['None/Trivial', 'Mild', 'Moderate', 'Severe'] },
          ],
        },
        {
          name: 'Valves',
          fields: [
            { key: 'mitralValve', label: 'Mitral Valve', type: 'select', options: ['Normal', 'Stenosis', 'Regurgitation', 'Both'] },
            { key: 'aorticValve', label: 'Aortic Valve', type: 'select', options: ['Normal', 'Stenosis', 'Regurgitation', 'Both'] },
            { key: 'tricuspidValve', label: 'Tricuspid Valve', type: 'select', options: ['Normal', 'Stenosis', 'Regurgitation'] },
            { key: 'pulmonaryValve', label: 'Pulmonary Valve', type: 'select', options: ['Normal', 'Stenosis', 'Regurgitation'] },
          ],
        },
        {
          name: 'Other Findings',
          fields: [
            { key: 'pericardium', label: 'Pericardium', type: 'select', options: ['Normal', 'Effusion', 'Thickening'] },
            { key: 'aorticRoot', label: 'Aortic Root', type: 'select', options: ['Normal', 'Dilated'] },
            { key: 'pulmonaryPressure', label: 'Estimated PA Pressure', placeholder: 'mmHg if calculated' },
          ],
        },
      ],
    },
  },
};

const ImagingResultsForm: React.FC<ImagingResultsFormProps> = ({ order, onSubmit, onCancel }) => {
  const { user } = useAuth();

  const reportWorkflowStatus = (order as any)?.reportWorkflow?.status as
    | 'Draft'
    | 'Finalized'
    | 'Sent'
    | undefined;
  const [sentLocal, setSentLocal] = useState(false);
  const effectiveReportWorkflowStatus = (sentLocal ? 'Sent' : reportWorkflowStatus) as
    | 'Draft'
    | 'Finalized'
    | 'Sent'
    | undefined;
  const isFinalized = effectiveReportWorkflowStatus === 'Finalized' || effectiveReportWorkflowStatus === 'Sent';
  const isSent = effectiveReportWorkflowStatus === 'Sent';

  const [impression, setImpression] = useState('');
  const [findings, setFindings] = useState('');
  const [technique, setTechnique] = useState('');
  const [comparison, setComparison] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [radiologist, setRadiologist] = useState(user?.name || '');

  // editing toggle
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);

  // Dynamic template fields state
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});
  const autosaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ======= TEMPLATE SELECTION =======
  const normalizeModality = (type: string = ''): string => {
    const t = type.toLowerCase();
    if (t.includes('ultra') || t.includes('u/s') || t === 'us') return 'ultrasound';
    if (t.includes('xray') || t.includes('x-ray') || t.includes('x ray')) return 'x-ray';
    return t.replace(/\s+/g, '-');
  };

  const modalityKey = normalizeModality(order?.imagingType);

  const studyKey = React.useMemo(() => {
    const bp = (order?.bodyPart || '').toLowerCase();
    if (bp.match(/abdomin|abdomen|pelvis|pelvic/)) return 'abdominopelvic';
    if (bp.match(/obstetric|ob gyn|pregnan|uterus|fetal|ob\/gyn|obgyn|ob\/gyn/)) return 'obstetric';
    if (bp.match(/chest|lung|thorax/)) return 'chest';
    return '';
  }, [order?.bodyPart]);

  let selectedStudy = EMR_TEMPLATES[modalityKey]?.[studyKey];
  if (!selectedStudy) {
    // Fallback: assume ultrasound for obstetric/abdominopelvic if modality absent/unknown
    if (['obstetric', 'abdominopelvic'].includes(studyKey)) {
      selectedStudy = EMR_TEMPLATES['ultrasound']?.[studyKey];
    }
    // You can add more intelligent fallbacks here
  }

  const sections = selectedStudy?.sections || [];

  // Quick-insert organ/label buttons for Detailed Findings (based on study type)
  const findingsQuickLabels = React.useMemo(() => {
    const bp = (order?.bodyPart || '').toLowerCase();
    const type = (order?.imagingType || '').toLowerCase();
    if (type.includes('ultra') || type.includes('u/s')) {
      if (bp.match(/abdomin|abdomen|pelvis|pelvic/) && !bp.match(/obstetric|ob gyn|pregnan|fetal/)) {
        return ['Liver', 'GB', 'CBD & IHBDs', 'Kidneys', 'Spleen', 'Pancreas', 'Peritoneum and bowel loops', 'UB'];
      }
      if (bp.match(/obstetric|ob gyn|pregnan|uterus|fetal/)) {
        return ['Fetus', 'Biometry', 'Placenta', 'Cervix', 'Adnexa'];
      }
      if (bp.match(/pelvic|gynecologic/)) {
        return ['Uterus', 'Right Ovary', 'Left Ovary', 'Pouch of Douglas'];
      }
      if (bp.match(/thyroid/)) {
        return ['Right Lobe', 'Left Lobe', 'Isthmus'];
      }
      if (bp.match(/prostate/)) {
        return ['Prostate', 'Bladder', 'Kidneys'];
      }
    }
    if (type.match(/xray|x-ray/) && bp.match(/chest/)) {
      return ['Cardiomediastinal', 'Lung Fields', 'Bones'];
    }
    return sections.slice(0, 6).map((s) => s.name);
  }, [order?.bodyPart, order?.imagingType, sections]);

  // Dev log to help troubleshoot template matching
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[ImagingResultsForm] modalityKey:', modalityKey, 'studyKey:', studyKey, 'sections:', sections.length);
  }

  // Add guard clause for order existence
  if (!order) {
    console.error('ImagingResultsForm: order prop is undefined');
    return null;
  }

  // Debug logging to see what data we're receiving
  console.log('ImagingResultsForm - Order data:', order);
  console.log('ImagingResultsForm - Patient data:', order.patient);
  console.log('ImagingResultsForm - Imaging type:', order.imagingType);
  console.log('ImagingResultsForm - Body part:', order.bodyPart);
  
  useEffect(() => {
    setSentLocal(false);
    // Always set radiologist name from current user
    if (user?.name && !radiologist) {
      setRadiologist(user.name);
    }

    // Prefill from saved template in localStorage based on imagingType
    const templateKey = `imagingTemplate_${order.imagingType?.toLowerCase()}`;
    const savedTemplate = localStorage.getItem(templateKey);

    if (order.results) {
      // Initialize from existing results
      setImpression(order.results.impression || '');
      setFindings(order.results.findings || '');
      setTechnique(order.results.technique || '');
      setComparison(order.results.comparison || '');
      setConclusion(order.results.conclusion || '');
      // Use existing radiologist or fallback to current user
      setRadiologist(order.results.radiologist || user?.name || '');
      
      // Extract all dynamic values from existing results
      // This includes all the specialized template fields
      const existingDynamicValues = { ...order.results };
      // Remove the basic fields that have their own state
      delete existingDynamicValues.impression;
      delete existingDynamicValues.findings;
      delete existingDynamicValues.technique;
      delete existingDynamicValues.comparison;
      delete existingDynamicValues.conclusion;
      delete existingDynamicValues.radiologist;
      delete existingDynamicValues.reportDate;
      
      setDynamicValues(existingDynamicValues);
      setIsEditing(!isFinalized);
      
      console.log('ImagingResultsForm - Loaded existing results:', order.results);
      console.log('ImagingResultsForm - Extracted dynamic values:', existingDynamicValues);
    } else if (savedTemplate) {
      // populate template and open in read-only mode
      const tpl = JSON.parse(savedTemplate);
      setImpression(tpl.impression || '');
      setFindings(tpl.findings || '');
      setTechnique(tpl.technique || '');
      setComparison(tpl.comparison || '');
      setConclusion(tpl.conclusion || '');
      // Ensure radiologist is set even from template
      setRadiologist(tpl.radiologist || user?.name || '');
      setDynamicValues(tpl.dynamicValues || {});
      setIsEditing(!isFinalized);
    } else {
      // For new forms, ensure radiologist is set
      if (user?.name && !radiologist) {
        setRadiologist(user.name);
      }
    }
  }, [order, user, isFinalized]);

  const buildResultsPayload = () => ({
    impression,
    findings,
    technique,
    comparison,
    conclusion,
    radiologist,
    ...dynamicValues,
    reportDate: new Date().toISOString(),
  });

  const saveDraft = async (silent: boolean = false) => {
    if (isFinalized) return;
    const orderId = order._id || (order as any).id;
    setIsSavingDraft(true);
    try {
      await imagingService.saveImagingResultsDraft(orderId, buildResultsPayload());
      setLastDraftSavedAt(new Date().toISOString());
      if (!silent) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 1500);
      }
    } catch (error: any) {
      console.error('Error saving imaging draft:', error);
      if (!silent) alert('Failed to save draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Autosave draft while editing (debounced)
  useEffect(() => {
    if (!isEditing || isFinalized) return;
    if (!order?._id) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveDraft(true);
    }, 2000);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impression, findings, technique, comparison, conclusion, radiologist, dynamicValues, isEditing, isFinalized, order?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields when editing
    if (isEditing) {
      if (!impression.trim()) {
        alert('Please fill in the Impression field');
        return;
      }
      // Check if findings has actual content (not just formatting)
      const findingsText = findings
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/^#+\s/gm, '') // Remove headers
        .replace(/^[•\-\*]\s/gm, '') // Remove bullet points
        .replace(/^>\s/gm, '') // Remove blockquotes
        .replace(/^---$/gm, '') // Remove horizontal lines
        .replace(/^\d+\.\s/gm, '') // Remove numbered lists
        .trim();
      if (!findingsText) {
        alert('Please fill in the Detailed Findings field');
        return;
      }
      if (!conclusion.trim()) {
        alert('Please fill in the Conclusion field');
        return;
      }
      if (!radiologist.trim()) {
        alert('Please fill in the Radiologist field');
        return;
      }
    }

    setIsSaving(true);

    const results = {
      impression,
      findings,
      technique,
      comparison,
      conclusion,
      radiologist,
      ...dynamicValues,
      reportDate: new Date().toISOString(),
    };

    // Save template for future prefill
    const templateKey = `imagingTemplate_${order.imagingType?.toLowerCase()}`;
    localStorage.setItem(templateKey, JSON.stringify({
      impression,
      findings,
      technique,
      comparison,
      conclusion,
      radiologist,
      dynamicValues
    }));

    try {
    // Call onSubmit and show success immediately
      await onSubmit(order._id, results);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000); // Reset after 2 seconds
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving imaging results:', error);
      alert('Failed to save imaging results. Please try again.');
    } finally {
    setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/10/50">
      {/* Page Header */}
      <div className="bg-primary-foreground border-b border-border/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onCancel} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-muted-foreground">Imaging Report</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {effectiveReportWorkflowStatus ? `Report: ${effectiveReportWorkflowStatus}` : (order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending')}
            </Badge>
          </div>
        </div>
      </div>

              {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Information Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>Patient Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground block">Patient Name</Label>
                <p className="text-sm text-muted-foreground font-medium">
                  {order.patient?.name || 
                   (order.patient?.firstName && order.patient?.lastName ? 
                    `${order.patient.firstName} ${order.patient.lastName}` : 
                    `Unknown Patient (ID: ${order.patient?._id || order.patientId || 'N/A'})`)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground block">Imaging Type</Label>
                <Badge variant="secondary">
                  {order.imagingType || 'Not specified'}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground block">Body Part</Label>
                <Badge variant="outline">
                  {order.bodyPart || 'Not specified'}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground block">Clinical Info</Label>
                <p className="text-sm text-muted-foreground">
                  {order.clinicalInfo || 'No clinical information provided'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground block">Order Date</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {order.orderDateTime ? new Date(order.orderDateTime).toLocaleDateString() : 'Not recorded'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Report</TabsTrigger>
                  <TabsTrigger value="detailed">Detailed Findings</TabsTrigger>
                  <TabsTrigger value="additional">Additional Fields</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Essential Report Fields</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="impression">Impression</Label>
                        <Textarea
                          id="impression"
                          value={impression}
                          onChange={(e) => setImpression(e.target.value)}
                          className="min-h-[80px]"
                          placeholder="Summarize the primary findings"
                          required={isEditing}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="findings">Detailed Findings</Label>
                        <RichTextEditor
                          value={findings}
                          onChange={setFindings}
                          placeholder="Examination: Abdominal and Pelvic U/S&#10;&#10;Findings:&#10;&#10;Use the toolbar or quick-insert buttons above. Type organ names, then add descriptions."
                          disabled={!isEditing}
                          height="260px"
                          livePreview
                          quickInsertLabels={findingsQuickLabels}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="conclusion">Conclusion</Label>
                        <Textarea
                          id="conclusion"
                          value={conclusion}
                          onChange={(e) => setConclusion(e.target.value)}
                          className="min-h-[80px]"
                          placeholder="Summary and recommendations"
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="radiologist">Radiologist</Label>
                        <Input
                          id="radiologist"
                          value={radiologist}
                          onChange={(e) => setRadiologist(e.target.value)}
                          placeholder={user?.name || "Radiologist name"}
                          disabled={!isEditing}
                          className={radiologist === user?.name ? "bg-muted/10" : ""}
                        />
                        {radiologist === user?.name && (
                          <p className="text-xs text-muted-foreground">Automatically filled with your name</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="detailed" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Findings by Body Part</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {sections.length > 0 && (
                        <div className="space-y-6">
                          {sections.map((section) => (
                            <div key={section.name} className="space-y-4 p-4 border border-border/30 rounded-lg">
                              <h4 className="text-md font-semibold text-muted-foreground mb-3">{section.name}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {section.fields.map((field) => (
                                  <div className="space-y-2" key={field.key}>
                                    <Label htmlFor={field.key}>{field.label}</Label>
                                    {field.type === 'select' ? (
                                      <Select
                                        value={dynamicValues[field.key] || ''}
                                        onValueChange={(value) => setDynamicValues({ ...dynamicValues, [field.key]: value })}
                                        disabled={!isEditing}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(field.options || []).map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input
                                        id={field.key}
                                        type={field.type || 'text'}
                                        value={dynamicValues[field.key] || ''}
                                        onChange={(e) => setDynamicValues({ ...dynamicValues, [field.key]: e.target.value })}
                                        placeholder={field.placeholder}
                                        step={field.type === 'number' ? (field.step || 0.1) : undefined}
                                        disabled={!isEditing}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="additional" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="technique">Technique</Label>
                          <Input
                            id="technique"
                            value={technique}
                            onChange={(e) => setTechnique(e.target.value)}
                            placeholder="e.g., T1-weighted, Contrast-enhanced"
                            disabled={!isEditing}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="comparison">Comparison</Label>
                          <Input
                            id="comparison"
                            value={comparison}
                            onChange={(e) => setComparison(e.target.value)}
                            placeholder="Prior studies for comparison"
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-6 border-t bg-primary-foreground sticky bottom-0">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {lastDraftSavedAt && !isFinalized && (
                      <span className="text-xs text-muted-foreground mr-2">
                        Draft saved {new Date(lastDraftSavedAt).toLocaleTimeString()}
                      </span>
                    )}

                    {!isFinalized && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSavingDraft || isSaving}
                        onClick={() => saveDraft(false)}
                      >
                        {isSavingDraft ? 'Saving draft...' : 'Save Draft'}
                      </Button>
                    )}

                    {!isFinalized && (
                      <Button
                        type="submit"
                        disabled={isSaving || isSavingDraft}
                        className={saveSuccess ? 'bg-primary hover:bg-primary' : ''}
                      >
                        {saveSuccess ? (
                          <>✓ Saved!</>
                        ) : isSaving ? (
                          <>Finalizing...</>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Finalize Report
                          </>
                        )}
                      </Button>
                    )}

                    {effectiveReportWorkflowStatus === 'Finalized' && !isSent && (
                      <Button
                        type="button"
                        disabled={isSending}
                        onClick={async () => {
                          const orderId = order._id || (order as any).id;
                          setIsSending(true);
                          try {
                            await imagingService.sendImagingReportToDoctor(orderId);
                            setSentLocal(true);
                            alert('Report sent to doctor successfully!');
                          } catch (error: any) {
                            console.error('Error sending report:', error);
                            alert('Failed to send report to doctor.');
                          } finally {
                            setIsSending(false);
                          }
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isSending ? 'Sending...' : 'Send to Doctor'}
                      </Button>
                    )}

                    {isSent && (
                      <Badge variant="secondary" className="text-xs">
                        Sent to Doctor
                      </Badge>
                    )}
                  </div>
                </div>
              </Tabs>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagingResultsForm; 

