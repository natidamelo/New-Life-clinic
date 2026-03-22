import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  TextField,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Divider,
  CardContent,
  CardHeader,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AddBusiness as AddBusinessIcon,
  Info as InfoIcon,
  Inventory as InventoryIcon,
  LocalPharmacy as LocalPharmacyIcon,
  Business as BusinessIcon,
  AttachFile as AttachFileIcon,
  Note as NoteIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import inventoryService from '../../services/inventoryService';
import serviceService from '../../services/serviceService';
import { format } from 'date-fns';
import Autocomplete from '@mui/material/Autocomplete';

// Inventory item types
type ItemType = 'medication' | 'lab' | 'equipment' | 'supplies' | 'service' | 'imaging' | 'other';

// Interface for inventory item
interface InventoryItem {
  name: string;
  description: string;
  category: string;
  itemType: ItemType;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  reorderLevel: number;
  expiryDate?: string;
  barcode?: string;
  location?: string;
  notes?: string;
  // Medication specific fields
  dosage?: string;
  dosageCustom?: string;
  administrationRoute?: string;
  adminRouteCustom?: string;
  activeIngredient?: string;
  prescriptionRequired?: boolean;
  // Lab specific fields
  storageTemperature?: string;
  specimenType?: string;
  testType?: string;
  processTime?: string;
  manufacturer?: string;
  batchNumber?: string;
  supplier?: string;
  purchaseDate?: string;
  expiryReminder?: string;
  minOrderQuantity?: string;
  attachments?: string[];
  customTags?: string;
  // Service-specific fields
  serviceDuration?: string;
  serviceRequirements?: string;
  serviceEquipment?: string;
  serviceStaffRequired?: string;
  servicePreparation?: string;
  serviceFollowUp?: string;
  serviceContraindications?: string;
  serviceIndications?: string;
  // Additional lab-specific fields
  serviceStorageTemperature?: string;
  serviceSpecimenType?: string;
  serviceTestType?: string;
}

// Expand static lists for dropdowns
const MEDICATIONS = [
  'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Ciprofloxacin', 'Metformin', 'Amlodipine', 'Atorvastatin', 'Omeprazole',
  'Azithromycin', 'Losartan', 'Simvastatin', 'Prednisone', 'Lisinopril', 'Hydrochlorothiazide', 'Enalapril', 'Metoprolol',
  'Fluoxetine', 'Sertraline', 'Loratadine', 'Cetirizine', 'Albuterol', 'Insulin', 'Warfarin', 'Levothyroxine', 
  'Ceftriaxone', 'Cimetidine', 'Metoclopramide', 'Hydrocortisone', 'Dexamethasone', 'Morphine',
  'Ondansetron', 'Diazepam', 'Furosemide', 'Digoxin', 'Epinephrine', 'Atropine', 'Dopamine', 'Norepinephrine',
  'Ketamine', 'Propofol', 'Midazolam', 'Fentanyl', 'Vitamin B Complex',
  'Vitamin C', 'Vitamin D3', 'Multivitamin', 'Iron Sulfate', 'Folic Acid',
  'Calcium Gluconate', 'Magnesium Sulfate', 'Potassium Chloride', 'Sodium Bicarbonate', 'Glucose 40%', 'Mannitol', 'Albumin',
  'Gentamicin', 'Vancomycin', 'Metronidazole', 'Clindamycin', 'Erythromycin', 'Tetracycline', 'Clarithromycin',
  'Aspirin', 'Diclofenac', 'Naproxen', 'Celecoxib', 'Tramadol', 'Codeine', 'Oxycodone', 'Buprenorphine',
  'Haloperidol', 'Risperidone', 'Olanzapine', 'Quetiapine', 'Chlorpromazine', 'Lithium', 'Carbamazepine',
  'Phenytoin', 'Valproic Acid', 'Levetiracetam', 'Lamotrigine', 'Gabapentin', 'Pregabalin', 'Baclofen',
  'Salbutamol', 'Budesonide', 'Prednisolone', 'Methylprednisolone', 'Betamethasone', 'Triamcinolone',
  'Nifedipine', 'Verapamil', 'Diltiazem', 'Bisoprolol', 'Carvedilol', 'Ramipril', 'Candesartan', 'Irbesartan',
  'Spironolactone', 'Indapamide', 'Bendroflumethiazide', 'Rosuvastatin', 'Pravastatin', 'Fenofibrate',
  'Glibenclamide', 'Gliclazide', 'Pioglitazone', 'Sitagliptin', 'Liraglutide', 'Empagliflozin', 'Other'
];
const DOSAGES = [
  '500mg', '250mg', '1g', '5mg', '10mg', '20mg', '50mg', '100mg', '200mg', 'Other'
];
const ADMIN_ROUTES = [
  'Oral', 'IV', 'IM', 'Subcutaneous', 'Topical', 'Inhalation', 'Rectal', 'Suppository', 'Sublingual', 'Other'
];
const CATEGORIES = [
  'Pain Relievers', 'Antibiotics', 'Antiseptics', 'Vitamins', 'Vaccines', 'Reagents', 'Test Kits', 'Consumables',
  'Specimen Containers', 'Diagnostic', 'Monitoring', 'Surgical', 'Therapeutic', 'Disposable Supplies', 'Reusable Supplies',
  'PPE', 'Cleaning Supplies', 'Office Supplies', 'General Item', 'Miscellaneous', 'Other'
];
const SUPPLIERS = [
  'ABC Pharma', 'Global Meds', 'HealthSource', 'MedSupply Co.', 'PharmaPlus', 
  'Ethiopian Pharmaceuticals', 'Addis Pharmaceuticals', 'East African Medical Supplies',
  'Horn of Africa Pharma', 'Ethio-Med Supplies', 'African Health Solutions',
  'MedTech Ethiopia', 'PharmaLink Africa', 'HealthCare Partners', 'MediCorp',
  'Pharmaceutical Solutions', 'Medical Supply Chain', 'HealthTech Distributors',
  'MediSource International', 'PharmaWorld', 'Global Health Supplies', 'Other'
];
const MANUFACTURERS = [
  'Pfizer', 'Novartis', 'Roche', 'Sanofi', 'Johnson & Johnson', 'Merck', 
  'GlaxoSmithKline', 'Bayer', 'AstraZeneca', 'Bristol Myers Squibb', 'Abbott',
  'Boehringer Ingelheim', 'Eli Lilly', 'Takeda', 'Amgen', 'Gilead Sciences',
  'Moderna', 'BioNTech', 'Regeneron', 'Vertex Pharmaceuticals', 'Biogen',
  'Ethiopian Pharmaceuticals', 'Addis Pharmaceuticals', 'East African Pharma',
  'Horn of Africa Medical', 'Ethio-Med Manufacturing', 'African Pharma Works',
  'MedTech Manufacturing', 'PharmaLink Production', 'HealthCare Industries',
  'MediCorp Manufacturing', 'Pharmaceutical Industries', 'Medical Manufacturing Co.',
  'HealthTech Production', 'MediSource Manufacturing', 'PharmaWorld Industries',
  'Global Health Manufacturing', 'Other'
];
const BATCH_NUMBERS = [
  'BATCH001', 'BATCH002', 'BATCH003', 'BATCH004', 'Other'
];
const LOCATIONS = [
  'Main Pharmacy', 'Ward A', 'Ward B', 'Lab Storage', 'Refrigerator', 'Cabinet 1', 'Cabinet 2', 'Other'
];
const SPECIMEN_TYPES = [
  'Blood', 'Urine', 'Saliva', 'Tissue', 'Stool', 'Sputum', 'Other'
];
const TEST_TYPES = [
  'CBC', 'Blood Glucose', 'Liver Function', 'Kidney Function', 'Urinalysis', 'Culture', 'Other'
];

// Map item types to categories
const LAB_SERVICE_CATEGORIES = ['chemistry', 'hematology', 'parasitology', 'immunology', 'urinalysis', 'endocrinology', 'cardiology', 'tumor-markers'];
const IMAGING_SERVICE_CATEGORIES = ['imaging', 'xray', 'ultrasound'];

const ITEM_TYPE_CATEGORIES = {
  medication: [
    'Pain Relievers', 'Antibiotics', 'Vitamins', 'Antiseptics', 'Vaccines',
    'Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Neurological',
    'Endocrine', 'Dermatological', 'Ophthalmic', 'Ear/Nose/Throat',
    'Musculoskeletal', 'Psychiatric', 'Oncology', 'Emergency Medicine', 'IV Fluids',
    'Pediatric', 'Geriatric', 'Women\'s Health', 'Men\'s Health',
    'Antifungal', 'Antiviral', 'Antimalarial', 'Antidiabetic',
    'Antihypertensive', 'Anticoagulant', 'Immunosuppressant', 'Other Medication'
  ],
  lab: ['chemistry', 'hematology', 'parasitology', 'immunology', 'urinalysis', 'endocrinology', 'cardiology', 'tumor-markers', 'other'],
  equipment: ['Diagnostic', 'Monitoring', 'Surgical', 'Therapeutic', 'Other Equipment'],
  supplies: ['Disposable Supplies', 'Reusable Supplies', 'PPE', 'Cleaning Supplies', 'Office Supplies', 'Other Supply'],
  service: [
    'consultation', 'procedure', 
    ...LAB_SERVICE_CATEGORIES,
    'imaging', 'injection', 'ultrasound', 'blood_test', 'rbs', 'other'
  ],
  imaging: [...IMAGING_SERVICE_CATEGORIES],
  other: ['General Item', 'Miscellaneous']
};

// Helper function to format service category names for display
const formatServiceCategoryName = (category: string): string => {
  const categoryMap: { [key: string]: string } = {
    'consultation': 'Consultation',
    'procedure': 'Procedure',
    'lab': 'Lab Service',
    // Lab subcategories
    'chemistry': 'Chemistry',
    'hematology': 'Hematology',
    'parasitology': 'Parasitology',
    'immunology': 'Immunology',
    'urinalysis': 'Urinalysis',
    'endocrinology': 'Endocrinology',
    'cardiology': 'Cardiology',
    'tumor-markers': 'Tumor Markers',
    'imaging': 'Imaging',
    'injection': 'Injection',
    'ultrasound': 'Ultrasound',
    'blood_test': 'Blood Test',
    'rbs': 'RBS (Random Blood Sugar)',
    'xray': 'X-Ray',
    'other': 'Other'
  };
  return categoryMap[category] || category;
};

// Get service-specific fields based on category
const getServiceSpecificFields = (category: string) => {
  const serviceFields: { [key: string]: { [key: string]: { label: string; type: string; placeholder: string; required: boolean } } } = {
    'consultation': {
      serviceDuration: { label: 'Duration (minutes)', type: 'number', placeholder: 'e.g., 30', required: true },
      serviceRequirements: { label: 'Patient Requirements', type: 'text', placeholder: 'e.g., Fasting, Previous records', required: false },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Doctor, Nurse', required: true },
      servicePreparation: { label: 'Preparation Instructions', type: 'text', placeholder: 'e.g., Patient should bring ID', required: false },
      serviceFollowUp: { label: 'Follow-up Required', type: 'text', placeholder: 'e.g., Return in 1 week', required: false },
      serviceIndications: { label: 'When to Use', type: 'text', placeholder: 'e.g., General health check, specific symptoms', required: false },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Not suitable for emergency cases', required: false }
    },
    'procedure': {
      serviceDuration: { label: 'Duration (minutes)', type: 'number', placeholder: 'e.g., 45', required: true },
      serviceRequirements: { label: 'Patient Requirements', type: 'text', placeholder: 'e.g., Consent form, fasting', required: true },
      serviceEquipment: { label: 'Equipment Needed', type: 'text', placeholder: 'e.g., Surgical instruments, monitoring devices', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Surgeon, Anesthesiologist, Nurse', required: true },
      servicePreparation: { label: 'Preparation Instructions', type: 'text', placeholder: 'e.g., Pre-operative assessment, sterilization', required: true },
      serviceFollowUp: { label: 'Post-procedure Care', type: 'text', placeholder: 'e.g., Recovery monitoring, wound care', required: true },
      serviceIndications: { label: 'Indications', type: 'text', placeholder: 'e.g., Specific medical conditions requiring this procedure', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Patient allergies, medical conditions', required: true }
    },
    'lab': {
      serviceDuration: { label: 'Processing Time', type: 'text', placeholder: 'e.g., 2-4 hours', required: true },
      serviceRequirements: { label: 'Sample Requirements', type: 'text', placeholder: 'e.g., Blood sample, fasting required', required: true },
      serviceEquipment: { label: 'Lab Equipment', type: 'text', placeholder: 'e.g., Centrifuge, microscope, test kits', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Lab technician, pathologist', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, storage conditions', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, consultation if needed', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Diagnostic purposes, health screening', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Recent medication, specific conditions', required: false },
      // Additional lab-specific fields (similar to lab items)
      serviceStorageTemperature: { label: 'Storage Temperature', type: 'text', placeholder: 'e.g., 2-8°C, Room temperature', required: false },
      serviceSpecimenType: { label: 'Specimen Type', type: 'text', placeholder: 'e.g., Serum, Whole Blood, Urine', required: false },
      serviceTestType: { label: 'Test Type', type: 'text', placeholder: 'e.g., Blood Glucose, CBC, Urinalysis', required: false }
    },
    // Lab subcategories - all use the same fields as 'lab'
    'chemistry': {
      serviceDuration: { label: 'Processing Time', type: 'text', placeholder: 'e.g., 1-2 hours', required: true },
      serviceRequirements: { label: 'Sample Requirements', type: 'text', placeholder: 'e.g., Serum/Plasma, fasting required', required: true },
      serviceEquipment: { label: 'Lab Equipment', type: 'text', placeholder: 'e.g., Chemistry analyzer, centrifuge', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Lab technician, clinical chemist', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, storage conditions', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, consultation if needed', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., General health screening, metabolic assessment', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Recent medication, specific conditions', required: false },
      serviceStorageTemperature: { label: 'Storage Temperature', type: 'text', placeholder: 'e.g., 2-8°C (short-term), -20°C (long-term)', required: false },
      serviceSpecimenType: { label: 'Specimen Type', type: 'text', placeholder: 'e.g., Serum/Plasma', required: false },
      serviceTestType: { label: 'Test Type', type: 'text', placeholder: 'e.g., General Chemistry', required: false }
    },
    'hematology': {
      serviceDuration: { label: 'Processing Time', type: 'text', placeholder: 'e.g., ≈1 hour', required: true },
      serviceRequirements: { label: 'Sample Requirements', type: 'text', placeholder: 'e.g., Whole Blood (EDTA)', required: true },
      serviceEquipment: { label: 'Lab Equipment', type: 'text', placeholder: 'e.g., Hematology analyzer, microscope', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Lab technician, hematologist', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, storage conditions', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, consultation if needed', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Blood disorder screening, infection detection', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Recent medication, specific conditions', required: false },
      serviceStorageTemperature: { label: 'Storage Temperature', type: 'text', placeholder: 'e.g., 2-8°C (≤24 hrs)', required: false },
      serviceSpecimenType: { label: 'Specimen Type', type: 'text', placeholder: 'e.g., Whole Blood (EDTA)', required: false },
      serviceTestType: { label: 'Test Type', type: 'text', placeholder: 'e.g., Hematology Panel', required: false }
    },
    'parasitology': {
      serviceDuration: { label: 'Processing Time', type: 'text', placeholder: 'e.g., 1-2 hours', required: true },
      serviceRequirements: { label: 'Sample Requirements', type: 'text', placeholder: 'e.g., Stool sample, fresh collection', required: true },
      serviceEquipment: { label: 'Lab Equipment', type: 'text', placeholder: 'e.g., Microscope, staining materials', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Lab technician, parasitologist', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, immediate examination', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, treatment if needed', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Parasitic infection diagnosis', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Recent medication, specific conditions', required: false },
      serviceStorageTemperature: { label: 'Storage Temperature', type: 'text', placeholder: 'e.g., Room temp; examine ASAP', required: false },
      serviceSpecimenType: { label: 'Specimen Type', type: 'text', placeholder: 'e.g., Stool', required: false },
      serviceTestType: { label: 'Test Type', type: 'text', placeholder: 'e.g., Microscopy/Parasitology', required: false }
    },
    'immunology': {
      serviceDuration: { label: 'Processing Time', type: 'text', placeholder: 'e.g., 2-4 hours', required: true },
      serviceRequirements: { label: 'Sample Requirements', type: 'text', placeholder: 'e.g., Serum sample', required: true },
      serviceEquipment: { label: 'Lab Equipment', type: 'text', placeholder: 'e.g., ELISA reader, immunoassay analyzer', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Lab technician, immunologist', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, storage conditions', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, consultation if needed', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Autoimmune disease screening, infection detection', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Recent medication, specific conditions', required: false },
      serviceStorageTemperature: { label: 'Storage Temperature', type: 'text', placeholder: 'e.g., 2-8°C (short-term), -20°C (long-term)', required: false },
      serviceSpecimenType: { label: 'Specimen Type', type: 'text', placeholder: 'e.g., Serum', required: false },
      serviceTestType: { label: 'Test Type', type: 'text', placeholder: 'e.g., Immunoassay', required: false }
    },
    'urinalysis': {
      serviceDuration: { label: 'Processing Time', type: 'text', placeholder: 'e.g., ≤1 hour', required: true },
      serviceRequirements: { label: 'Sample Requirements', type: 'text', placeholder: 'e.g., Mid-stream urine, clean collection', required: true },
      serviceEquipment: { label: 'Lab Equipment', type: 'text', placeholder: 'e.g., Urine analyzer, microscope', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Lab technician, urologist', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, immediate analysis', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, consultation if needed', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Kidney function assessment, infection detection', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Recent medication, specific conditions', required: false },
      serviceStorageTemperature: { label: 'Storage Temperature', type: 'text', placeholder: 'e.g., Room temp ≤2 hrs or 2–8°C', required: false },
      serviceSpecimenType: { label: 'Specimen Type', type: 'text', placeholder: 'e.g., Urine', required: false },
      serviceTestType: { label: 'Test Type', type: 'text', placeholder: 'e.g., Urinalysis', required: false }
    },
    'endocrinology': {
      serviceDuration: { label: 'Processing Time', type: 'text', placeholder: 'e.g., 2-4 hours', required: true },
      serviceRequirements: { label: 'Sample Requirements', type: 'text', placeholder: 'e.g., Serum sample, timing specific', required: true },
      serviceEquipment: { label: 'Lab Equipment', type: 'text', placeholder: 'e.g., Hormone analyzer, immunoassay system', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Lab technician, endocrinologist', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, storage conditions', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, consultation if needed', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Hormone level assessment, endocrine disorders', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Recent medication, specific conditions', required: false },
      serviceStorageTemperature: { label: 'Storage Temperature', type: 'text', placeholder: 'e.g., 2-8°C (short-term), -20°C (long-term)', required: false },
      serviceSpecimenType: { label: 'Specimen Type', type: 'text', placeholder: 'e.g., Serum', required: false },
      serviceTestType: { label: 'Test Type', type: 'text', placeholder: 'e.g., Hormone Assay', required: false }
    },
    'cardiology': {
      serviceDuration: { label: 'Processing Time', type: 'text', placeholder: 'e.g., 1-2 hours', required: true },
      serviceRequirements: { label: 'Sample Requirements', type: 'text', placeholder: 'e.g., Serum/Plasma sample', required: true },
      serviceEquipment: { label: 'Lab Equipment', type: 'text', placeholder: 'e.g., Cardiac marker analyzer', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Lab technician, cardiologist', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, storage conditions', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, consultation if needed', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Heart disease screening, cardiac event assessment', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Recent medication, specific conditions', required: false },
      serviceStorageTemperature: { label: 'Storage Temperature', type: 'text', placeholder: 'e.g., 2-8°C', required: false },
      serviceSpecimenType: { label: 'Specimen Type', type: 'text', placeholder: 'e.g., Serum/Plasma', required: false },
      serviceTestType: { label: 'Test Type', type: 'text', placeholder: 'e.g., Cardiac Markers', required: false }
    },
    'tumor-markers': {
      serviceDuration: { label: 'Processing Time', type: 'text', placeholder: 'e.g., 2-4 hours', required: true },
      serviceRequirements: { label: 'Sample Requirements', type: 'text', placeholder: 'e.g., Serum sample', required: true },
      serviceEquipment: { label: 'Lab Equipment', type: 'text', placeholder: 'e.g., Tumor marker analyzer, immunoassay system', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Lab technician, oncologist', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, storage conditions', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, consultation if needed', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Cancer screening, tumor monitoring', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Recent medication, specific conditions', required: false },
      serviceStorageTemperature: { label: 'Storage Temperature', type: 'text', placeholder: 'e.g., 2-8°C (short-term), -20°C (long-term)', required: false },
      serviceSpecimenType: { label: 'Specimen Type', type: 'text', placeholder: 'e.g., Serum', required: false },
      serviceTestType: { label: 'Test Type', type: 'text', placeholder: 'e.g., Tumor Marker', required: false }
    },
    'imaging': {
      serviceDuration: { label: 'Scan Duration', type: 'text', placeholder: 'e.g., 15-30 minutes', required: true },
      serviceRequirements: { label: 'Patient Requirements', type: 'text', placeholder: 'e.g., Remove metal objects, contrast agent', required: true },
      serviceEquipment: { label: 'Imaging Equipment', type: 'text', placeholder: 'e.g., X-ray machine, CT scanner, MRI', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Radiologist, technician', required: true },
      servicePreparation: { label: 'Preparation Instructions', type: 'text', placeholder: 'e.g., Positioning, contrast preparation', required: true },
      serviceFollowUp: { label: 'Follow-up Required', type: 'text', placeholder: 'e.g., Report review, additional scans', required: false },
      serviceIndications: { label: 'Imaging Indications', type: 'text', placeholder: 'e.g., Fracture diagnosis, tumor detection', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Pregnancy, metal implants', required: true }
    },
    'injection': {
      serviceDuration: { label: 'Administration Time', type: 'text', placeholder: 'e.g., 5-10 minutes', required: true },
      serviceRequirements: { label: 'Patient Requirements', type: 'text', placeholder: 'e.g., Allergy check, consent', required: true },
      serviceEquipment: { label: 'Equipment Needed', type: 'text', placeholder: 'e.g., Syringe, needle, antiseptic', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Nurse, doctor', required: true },
      servicePreparation: { label: 'Preparation Instructions', type: 'text', placeholder: 'e.g., Site preparation, dosage calculation', required: true },
      serviceFollowUp: { label: 'Post-injection Care', type: 'text', placeholder: 'e.g., Monitoring for reactions', required: true },
      serviceIndications: { label: 'Injection Indications', type: 'text', placeholder: 'e.g., Vaccination, medication administration', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Known allergies, pregnancy', required: true }
    },
    'ultrasound': {
      serviceDuration: { label: 'Scan Duration', type: 'text', placeholder: 'e.g., 20-30 minutes', required: true },
      serviceRequirements: { label: 'Patient Requirements', type: 'text', placeholder: 'e.g., Full bladder, fasting', required: false },
      serviceEquipment: { label: 'Ultrasound Equipment', type: 'text', placeholder: 'e.g., Ultrasound machine, gel', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Sonographer, radiologist', required: true },
      servicePreparation: { label: 'Preparation Instructions', type: 'text', placeholder: 'e.g., Gel application, positioning', required: true },
      serviceFollowUp: { label: 'Follow-up Required', type: 'text', placeholder: 'e.g., Report review, additional scans', required: false },
      serviceIndications: { label: 'Ultrasound Indications', type: 'text', placeholder: 'e.g., Pregnancy monitoring, organ assessment', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Open wounds, recent surgery', required: false }
    },
    'blood_test': {
      serviceDuration: { label: 'Collection Time', type: 'text', placeholder: 'e.g., 5-10 minutes', required: true },
      serviceRequirements: { label: 'Patient Requirements', type: 'text', placeholder: 'e.g., Fasting, specific timing', required: true },
      serviceEquipment: { label: 'Equipment Needed', type: 'text', placeholder: 'e.g., Blood collection tubes, needles', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Phlebotomist, lab technician', required: true },
      servicePreparation: { label: 'Sample Preparation', type: 'text', placeholder: 'e.g., Proper labeling, storage', required: true },
      serviceFollowUp: { label: 'Result Follow-up', type: 'text', placeholder: 'e.g., Report delivery, consultation', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Health screening, diagnosis', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., Bleeding disorders, recent medication', required: false }
    },
    'rbs': {
      serviceDuration: { label: 'Test Duration', type: 'text', placeholder: 'e.g., 2-5 minutes', required: true },
      serviceRequirements: { label: 'Patient Requirements', type: 'text', placeholder: 'e.g., Fasting or random', required: false },
      serviceEquipment: { label: 'Equipment Needed', type: 'text', placeholder: 'e.g., Glucose meter, test strips', required: true },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., Nurse, lab technician', required: true },
      servicePreparation: { label: 'Preparation Instructions', type: 'text', placeholder: 'e.g., Finger cleaning, device calibration', required: true },
      serviceFollowUp: { label: 'Follow-up Required', type: 'text', placeholder: 'e.g., Result interpretation, treatment', required: false },
      serviceIndications: { label: 'Test Indications', type: 'text', placeholder: 'e.g., Diabetes screening, monitoring', required: true },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., None for basic RBS', required: false }
    },
    'other': {
      serviceDuration: { label: 'Service Duration', type: 'text', placeholder: 'e.g., Variable', required: false },
      serviceRequirements: { label: 'Requirements', type: 'text', placeholder: 'e.g., As needed', required: false },
      serviceEquipment: { label: 'Equipment Needed', type: 'text', placeholder: 'e.g., As required', required: false },
      serviceStaffRequired: { label: 'Staff Required', type: 'text', placeholder: 'e.g., As appropriate', required: false },
      servicePreparation: { label: 'Preparation', type: 'text', placeholder: 'e.g., As needed', required: false },
      serviceFollowUp: { label: 'Follow-up', type: 'text', placeholder: 'e.g., As required', required: false },
      serviceIndications: { label: 'Indications', type: 'text', placeholder: 'e.g., As appropriate', required: false },
      serviceContraindications: { label: 'Contraindications', type: 'text', placeholder: 'e.g., As applicable', required: false }
    }
  };
  
  return serviceFields[category] || serviceFields['other'];
};

// Expand categories to medications
const CATEGORY_MEDICATIONS = {
  'Antibiotics': [
    'Amoxicillin', 'Ciprofloxacin', 'Azithromycin', 'Doxycycline', 'Cephalexin', 
    'Clindamycin', 'Metronidazole', 'Penicillin V', 'Amoxicillin-Clavulanate', 
    'Cefuroxime', 'Ceftriaxone', 'Vancomycin', 'Gentamicin', 'Tobramycin',
    'Levofloxacin', 'Moxifloxacin', 'Clarithromycin', 'Erythromycin', 'Other'
  ],
  'Pain Relievers': [
    'Paracetamol', 'Ibuprofen', 'Aspirin', 'Diclofenac', 'Tramadol', 'Morphine', 
    'Codeine', 'Oxycodone', 'Hydrocodone', 'Naproxen', 'Ketorolac', 'Piroxicam',
    'Celecoxib', 'Meloxicam', 'Acetaminophen', 'Fentanyl', 'Methadone', 'Other'
  ],
  'Vitamins': [
    'Vitamin C', 'Vitamin D', 'Vitamin B12', 'Folic Acid', 'Multivitamin', 
    'Vitamin A', 'Vitamin E', 'Vitamin K', 'Thiamine (B1)', 'Riboflavin (B2)',
    'Niacin (B3)', 'Pantothenic Acid (B5)', 'Pyridoxine (B6)', 'Biotin (B7)',
    'Vitamin B Complex', 'Calcium', 'Iron', 'Zinc', 'Magnesium', 'Other'
  ],
  'Antiseptics': [
    'Chlorhexidine', 'Hydrogen Peroxide', 'Povidone-Iodine', 'Alcohol', 
    'Benzalkonium Chloride', 'Cetrimide', 'Hexachlorophene', 'Triclosan',
    'Silver Sulfadiazine', 'Mupirocin', 'Fusidic Acid', 'Other'
  ],
  'Vaccines': [
    'COVID-19 Vaccine', 'Influenza Vaccine', 'Hepatitis B Vaccine', 'Tetanus Toxoid', 
    'MMR Vaccine', 'Polio Vaccine', 'BCG Vaccine', 'Hepatitis A Vaccine',
    'Varicella Vaccine', 'HPV Vaccine', 'Pneumococcal Vaccine', 'Meningococcal Vaccine',
    'Yellow Fever Vaccine', 'Rabies Vaccine', 'Other'
  ],
  'Cardiovascular': [
    'Amlodipine', 'Lisinopril', 'Metoprolol', 'Atenolol', 'Losartan', 'Valsartan',
    'Digoxin', 'Furosemide', 'Hydrochlorothiazide', 'Spironolactone', 'Warfarin',
    'Aspirin', 'Clopidogrel', 'Atorvastatin', 'Simvastatin', 'Nitrostat', 'Other'
  ],
  'Respiratory': [
    'Albuterol', 'Salbutamol', 'Ipratropium', 'Budesonide', 'Fluticasone',
    'Montelukast', 'Theophylline', 'Prednisolone', 'Dexamethasone', 'Oxygen',
    'Nebulizer Solution', 'Inhaler', 'Cough Syrup', 'Guaifenesin', 'Other'
  ],
  'Gastrointestinal': [
    'Omeprazole', 'Ranitidine', 'Famotidine', 'Lansoprazole', 'Pantoprazole',
    'Metoclopramide', 'Domperidone', 'Ondansetron', 'Loperamide', 'Bisacodyl',
    'Lactulose', 'Simethicone', 'Antacid', 'Probiotics', 'Other'
  ],
  'Neurological': [
    'Carbamazepine', 'Phenytoin', 'Valproic Acid', 'Gabapentin', 'Pregabalin',
    'Diazepam', 'Lorazepam', 'Clonazepam', 'Alprazolam', 'Donepezil',
    'Memantine', 'Levodopa', 'Pramipexole', 'Sumatriptan', 'Other'
  ],
  'Endocrine': [
    'Insulin', 'Metformin', 'Glipizide', 'Glibenclamide', 'Pioglitazone',
    'Levothyroxine', 'Methimazole', 'Propylthiouracil', 'Hydrocortisone',
    'Prednisolone', 'Testosterone', 'Estradiol', 'Progesterone', 'Other'
  ],
  'Dermatological': [
    'Hydrocortisone Cream', 'Betamethasone', 'Clobetasol', 'Mometasone',
    'Ketoconazole Cream', 'Clotrimazole', 'Terbinafine', 'Acyclovir Cream',
    'Benzoyl Peroxide', 'Tretinoin', 'Sunscreen', 'Moisturizer', 'Other'
  ],
  'Ophthalmic': [
    'Artificial Tears', 'Chloramphenicol Eye Drops', 'Tobramycin Eye Drops',
    'Prednisolone Eye Drops', 'Atropine Eye Drops', 'Pilocarpine Eye Drops',
    'Timolol Eye Drops', 'Latanoprost Eye Drops', 'Eye Ointment', 'Other'
  ],
  'Ear/Nose/Throat': [
    'Amoxicillin-Clavulanate', 'Cefuroxime', 'Pseudoephedrine', 'Phenylephrine',
    'Oxymetazoline', 'Fluticasone Nasal Spray', 'Budesonide Nasal Spray',
    'Ciprofloxacin Ear Drops', 'Hydrocortisone Ear Drops', 'Throat Lozenges', 'Other'
  ],
  'Musculoskeletal': [
    'Ibuprofen', 'Diclofenac', 'Naproxen', 'Meloxicam', 'Celecoxib',
    'Methocarbamol', 'Cyclobenzaprine', 'Baclofen', 'Tizanidine', 'Glucosamine',
    'Chondroitin', 'Calcium', 'Vitamin D', 'Magnesium', 'Other'
  ],
  'Psychiatric': [
    'Fluoxetine', 'Sertraline', 'Paroxetine', 'Citalopram', 'Escitalopram',
    'Amitriptyline', 'Imipramine', 'Clomipramine', 'Haloperidol', 'Risperidone',
    'Olanzapine', 'Quetiapine', 'Lorazepam', 'Diazepam', 'Other'
  ],
  'Oncology': [
    'Methotrexate', 'Cyclophosphamide', 'Doxorubicin', 'Cisplatin', 'Carboplatin',
    'Paclitaxel', 'Docetaxel', 'Tamoxifen', 'Anastrozole', 'Letrozole',
    'Imatinib', 'Rituximab', 'Trastuzumab', 'Bevacizumab', 'Other'
  ],
  'Emergency Medicine': [
    'Epinephrine', 'Atropine', 'Naloxone', 'Flumazenil', 'Glucagon',
    'Dextrose 50%', 'Sodium Bicarbonate', 'Calcium Gluconate', 'Magnesium Sulfate',
    'Lidocaine', 'Amiodarone', 'Dopamine', 'Norepinephrine', 'Other'
  ],
  'IV Fluids': [
    'Normal Saline (0.9% NaCl)', 'Ringer Lactate (Hartmann Solution)', 'Dextrose 5% (D5W)',
    'Dextrose 10% (D10W)', 'Dextrose 40%', 'Dextrose 50% (D50W)', 'Half Normal Saline (0.45% NaCl)',
    '3% Saline', '5% Dextrose in Normal Saline (D5NS)', '5% Dextrose in Half Normal Saline (D5 0.45% NaCl)',
    '10% Dextrose in Normal Saline', 'Sodium Bicarbonate 8.4%', 'Potassium Chloride (KCl)',
    'Calcium Gluconate', 'Magnesium Sulfate', 'Mannitol 20%', 'Albumin 5%', 'Albumin 25%',
    'Fresh Frozen Plasma', 'Packed Red Blood Cells', 'Platelets', 'Whole Blood', 'Other'
  ],
  'Pediatric': [
    'Pediatric Paracetamol', 'Pediatric Ibuprofen', 'Amoxicillin Suspension',
    'Cefuroxime Suspension', 'Pediatric Vitamins', 'Pediatric Multivitamin',
    'Pediatric Iron Drops', 'Pediatric Probiotics', 'Pediatric Cough Syrup',
    'Pediatric Antacid', 'Pediatric Laxative', 'Pediatric Antihistamine', 'Other'
  ],
  'Geriatric': [
    'Donepezil', 'Memantine', 'Rivastigmine', 'Galantamine', 'Warfarin',
    'Digoxin', 'Furosemide', 'Metformin', 'Atorvastatin', 'Amlodipine',
    'Lisinopril', 'Metoprolol', 'Calcium + Vitamin D', 'Other'
  ],
  'Women\'s Health': [
    'Oral Contraceptives', 'Progesterone', 'Estradiol', 'Clomiphene', 'Metformin',
    'Folic Acid', 'Iron Supplements', 'Prenatal Vitamins', 'Postnatal Vitamins',
    'Hormone Replacement Therapy', 'Tamoxifen', 'Anastrozole', 'Other'
  ],
  'Men\'s Health': [
    'Testosterone', 'Sildenafil', 'Tadalafil', 'Vardenafil', 'Finasteride',
    'Dutasteride', 'Saw Palmetto', 'Zinc Supplements', 'Vitamin D',
    'Prostate Health Supplements', 'Erectile Dysfunction Treatment', 'Other'
  ],
  'Antifungal': [
    'Fluconazole', 'Itraconazole', 'Ketoconazole', 'Clotrimazole', 'Miconazole',
    'Terbinafine', 'Amphotericin B', 'Nystatin', 'Griseofulvin', 'Voriconazole',
    'Posaconazole', 'Caspofungin', 'Micafungin', 'Other'
  ],
  'Antiviral': [
    'Acyclovir', 'Valacyclovir', 'Famciclovir', 'Ganciclovir', 'Valganciclovir',
    'Oseltamivir', 'Zanamivir', 'Ribavirin', 'Interferon', 'Lamivudine',
    'Tenofovir', 'Entecavir', 'Sofosbuvir', 'Other'
  ],
  'Antimalarial': [
    'Chloroquine', 'Hydroxychloroquine', 'Quinine', 'Artemether', 'Lumefantrine',
    'Mefloquine', 'Primaquine', 'Proguanil', 'Atovaquone', 'Doxycycline',
    'Artemisinin', 'Artesunate', 'Pyrimethamine', 'Other'
  ],
  'Antidiabetic': [
    'Insulin Regular', 'Insulin NPH', 'Insulin Glargine', 'Insulin Lispro',
    'Metformin', 'Glipizide', 'Glibenclamide', 'Gliclazide', 'Pioglitazone',
    'Rosiglitazone', 'Sitagliptin', 'Vildagliptin', 'Empagliflozin', 'Other'
  ],
  'Antihypertensive': [
    'Amlodipine', 'Nifedipine', 'Diltiazem', 'Verapamil', 'Lisinopril',
    'Enalapril', 'Captopril', 'Losartan', 'Valsartan', 'Candesartan',
    'Metoprolol', 'Atenolol', 'Propranolol', 'Hydrochlorothiazide', 'Other'
  ],
  'Anticoagulant': [
    'Warfarin', 'Heparin', 'Enoxaparin', 'Dabigatran', 'Rivaroxaban',
    'Apixaban', 'Edoxaban', 'Aspirin', 'Clopidogrel', 'Prasugrel',
    'Ticagrelor', 'Dipyridamole', 'Fondaparinux', 'Other'
  ],
  'Immunosuppressant': [
    'Cyclosporine', 'Tacrolimus', 'Mycophenolate', 'Azathioprine', 'Methotrexate',
    'Leflunomide', 'Hydroxychloroquine', 'Sulfasalazine', 'Prednisolone',
    'Methylprednisolone', 'Rituximab', 'Infliximab', 'Adalimumab', 'Other'
  ],
  'Reagents': ['Benedict\'s Solution', 'Gram Stain', 'Biuret Reagent', 'CRP Fluid/Reagent (100 tests)', 'ASO Fluid/Reagent (100 tests)', 'Blood Group Fluid/Reagent (100 tests)', 'Other'],
  'Test Kits': ['Malaria Test Kit', 'HIV Test Kit', 'Pregnancy Test Kit', 'Glucose Test Strips', 'Other'],
  'Consumables': ['Syringe', 'Gloves', 'Test Tubes', 'Glucose Test Strips', 'Other'],
  'Specimen Containers': ['Urine Container', 'Stool Container', 'Blood Collection Tube', 'Other'],
  'Diagnostic': ['ECG Machine', 'X-ray Machine', 'Ultrasound Machine', 'Other'],
  'Monitoring': ['Blood Pressure Monitor', 'Pulse Oximeter', 'Thermometer', 'Other'],
  'Surgical': ['Scalpel', 'Surgical Scissors', 'Forceps', 'Other'],
  'Therapeutic': ['Nebulizer', 'Infusion Pump', 'Other'],
  'Disposable Supplies': [
    'Face Mask',
    'Surgical Gloves',
    'Gauze',
    'Alcohol Swab',
    'Lidocaine',
    'Syringe 3cc',
    'Syringe 5cc',
    'Syringe 10cc',
    'Syringe 20cc',
    'Cannula',
    'Suture 2/0',
    'Suture 3/0',
    'Suture 4/0',
    'Glucose Test Strips',
    'CRP Fluid/Reagent (100 tests)',
    'ASO Fluid/Reagent (100 tests)',
    'Blood Group Fluid/Reagent (100 tests)',
    'Other'
  ],
  'Reusable Supplies': ['Stethoscope', 'BP Cuff', 'Reflex Hammer', 'Other'],
  'PPE': ['Face Shield', 'Gown', 'N95 Mask', 'Other'],
  'Cleaning Supplies': ['Disinfectant', 'Detergent', 'Mop', 'Other'],
  'Office Supplies': ['Pen', 'Notebook', 'Printer Paper', 'Other'],
  'General Item': ['Custom Item', 'Other'],
  'Miscellaneous': ['Other'],
  'Other': ['Other'],
  'chemistry': ['Glucose, Fasting', 'Glucose Test Strips', 'Urea', 'Creatinine', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate', 'ALT (SGPT)', 'AST (SGOT)', 'Total Bilirubin', 'Albumin', 'Total Protein', 'Cholesterol, Total', 'Triglycerides', 'HDL Cholesterol', 'LDL Cholesterol', 'HbA1C', 'Calcium', 'Phosphorus', 'Magnesium', 'Uric Acid', 'Amylase', 'Lipase', 'Alkaline Phosphatase', 'GGT', 'Iron', 'TIBC', 'Ferritin', 'Other'],
  'hematology': ['Complete Blood Count (CBC)', 'Hemoglobin', 'Hematocrit', 'Red Blood Cell Count', 'White Blood Cell Count', 'Platelet Count', 'Blood Group Test (100 tests)', 'Blood Group Fluid/Reagent (100 tests)', 'Mean Corpuscular Volume (MCV)', 'Mean Corpuscular Hemoglobin (MCH)', 'Differential Count', 'Prothrombin Time (PT)', 'International Normalized Ratio (INR)', 'Partial Thromboplastin Time (PTT)', 'Reticulocyte Count', 'Erythrocyte Sedimentation Rate (ESR)', 'Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils', 'D-Dimer', 'Fibrinogen', 'Other'],
  'parasitology': ['Stool Exam (Routine)', 'Fecal Occult Blood Test (FOBT)', 'Stool Culture', 'Ova and Parasite Examination', 'Malaria Smear', 'Malaria Blood Test (with Kit)', 'Filaria Smear', 'Schistosomiasis Test', 'Giardia Antigen', 'Cryptosporidium Antigen', 'Entamoeba histolytica Antigen', 'Helminth Antibody Panel', 'Other'],
  'immunology': ['HIV Antibody', 'Hepatitis B Surface Antigen (HBsAg)', 'Hepatitis C Antibody', 'COVID-19 PCR Test', 'C-Reactive Protein', 'CRP Fluid/Reagent (100 tests)', 'Rheumatoid Factor', 'ASO (Anti-Streptolysin O)', 'ASO Fluid/Reagent (100 tests)', 'ANA (Antinuclear Antibody)', 'Thyroid Peroxidase Antibody', 'H. pylori Antigen', 'H. pylori Antibody', 'H. pylori Ag/Ab Test', 'HCG (Pregnancy Test)', 'Serum HCG', 'Urine HCG', 'Widal O & H Test (100 tests)', 'Weil-Felix Test (100 tests)', 'IgE Total', 'IgG', 'IgM', 'IgA', 'Complement C3', 'Complement C4', 'Anti-dsDNA', 'Anti-CCP', 'Hepatitis B Core Antibody', 'Hepatitis B Surface Antibody', 'VDRL/RPR', 'Other'],
  'urinalysis': ['Complete Urinalysis', 'Urinalysis, Dipstick Only', 'Urinalysis, Microscopic Only', 'Urine Microalbumin', 'Urine Protein-to-Creatinine Ratio', 'Other'],
  'endocrinology': ['Thyroid Stimulating Hormone (TSH)', 'Free T4', 'Free T3', 'Cortisol', 'Testosterone', 'Estradiol', 'FSH', 'LH', 'Prolactin', 'ACTH', 'Parathyroid Hormone (PTH)', 'Insulin', 'C-Peptide', 'DHEA-S', 'Progesterone', 'Other'],
  'cardiology': ['Troponin I', 'Troponin T', 'BNP', 'NT-proBNP', 'CK-MB', 'Myoglobin', 'Homocysteine', 'Lipoprotein (a)', 'Other'],
  'tumor-markers': ['Prostate Specific Antigen (PSA)', 'CEA', 'CA-125', 'CA 19-9', 'AFP', 'CA 15-3', 'Beta-hCG', 'NSE (Neuron-Specific Enolase)', 'Chromogranin A', 'Other'],
  'other': ['Custom Lab Item', 'Other']
};

// Service name options for each service category
const SERVICE_NAMES: Record<string, string[]> = {
  'consultation': [
    'General Consultation', 'Follow-up Consultation', 'Emergency Consultation',
    'Specialist Consultation', 'Telemedicine Consultation', 'Second Opinion',
    'Pre-operative Consultation', 'Post-operative Consultation', 'Other'
  ],
  'procedure': [
    'Minor Surgery', 'Biopsy', 'Suturing', 'Wound Care', 'Drainage',
    'Incision and Drainage', 'Excision', 'Cauterization', 'Other'
  ],
  'chemistry': [
    'Glucose, Fasting', 'Glucose Test Strips', 'Urea', 'Creatinine', 'Sodium', 'Potassium', 'Chloride', 
    'Bicarbonate', 'ALT (SGPT)', 'AST (SGOT)', 'Total Bilirubin', 'Albumin', 
    'Total Protein', 'Cholesterol, Total', 'Triglycerides', 'HDL Cholesterol', 
    'LDL Cholesterol', 'HbA1C', 'Calcium', 'Phosphorus', 'Magnesium', 'Uric Acid', 
    'Amylase', 'Lipase', 'Alkaline Phosphatase', 'GGT', 'Iron', 'TIBC', 'Ferritin', 'Other'
  ],
  'hematology': [
    'Complete Blood Count (CBC)', 'Hemoglobin', 'Hematocrit', 'Red Blood Cell Count', 
    'White Blood Cell Count', 'Platelet Count', 'Blood Group Test (100 tests)', 'Blood Group Fluid/Reagent (100 tests)', 'Mean Corpuscular Volume (MCV)', 
    'Mean Corpuscular Hemoglobin (MCH)', 'Differential Count', 'Prothrombin Time (PT)', 
    'International Normalized Ratio (INR)', 'Partial Thromboplastin Time (PTT)', 
    'Reticulocyte Count', 'Erythrocyte Sedimentation Rate (ESR)', 'Neutrophils', 
    'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils', 'D-Dimer', 'Fibrinogen', 'Other'
  ],
  'parasitology': [
    'Stool Exam (Routine)', 'Fecal Occult Blood Test (FOBT)', 'Stool Culture', 'Ova and Parasite Examination', 
    'Malaria Smear', 'Malaria Blood Test (with Kit)', 'Filaria Smear', 'Schistosomiasis Test', 'Giardia Antigen', 
    'Cryptosporidium Antigen', 'Entamoeba histolytica Antigen', 'Helminth Antibody Panel', 'Other'
  ],
  'immunology': [
    'HIV Antibody', 'Hepatitis B Surface Antigen (HBsAg)', 'Hepatitis C Antibody', 
    'COVID-19 PCR Test', 'C-Reactive Protein', 'CRP Fluid/Reagent (100 tests)', 'Rheumatoid Factor', 
    'ASO (Anti-Streptolysin O)', 'ASO Fluid/Reagent (100 tests)', 'ANA (Antinuclear Antibody)', 'Thyroid Peroxidase Antibody', 'H. pylori Antigen', 
    'H. pylori Antibody', 'H. pylori Ag/Ab Test', 'HCG (Pregnancy Test)', 
    'Serum HCG', 'IgE Total', 
    'IgG', 'IgM', 'IgA', 'Complement C3', 'Complement C4', 'Anti-dsDNA', 
    'Anti-CCP', 'Hepatitis B Core Antibody', 'Hepatitis B Surface Antibody', 'VDRL/RPR', 'Other'
  ],
  'urinalysis': [
    'Complete Urinalysis', 'Urinalysis, Dipstick Only', 'Urinalysis, Microscopic Only', 
    'Urine Microalbumin', 'Urine Protein-to-Creatinine Ratio', 'Urine HCG', 'Other'
  ],
  'endocrinology': [
    'Thyroid Stimulating Hormone (TSH)', 'Free T4', 'Free T3', 'Cortisol', 
    'Testosterone', 'Estradiol', 'FSH', 'LH', 'Prolactin', 'ACTH', 
    'Parathyroid Hormone (PTH)', 'Insulin', 'C-Peptide', 'DHEA-S', 'Progesterone', 'Other'
  ],
  'cardiology': [
    'Troponin I', 'Troponin T', 'BNP', 'NT-proBNP', 'CK-MB', 'Myoglobin', 
    'Homocysteine', 'Lipoprotein (a)', 'Other'
  ],
  'tumor-markers': [
    'Prostate Specific Antigen (PSA)', 'CEA', 'CA-125', 'CA 19-9', 'AFP', 
    'CA 15-3', 'Beta-hCG', 'NSE (Neuron-Specific Enolase)', 'Chromogranin A', 'Other'
  ],
  'imaging': [
    'Chest X-ray', 'Abdominal X-ray', 'Bone X-ray', 'CT Scan', 'MRI Scan', 
    'Ultrasound', 'Mammography', 'Bone Density Scan', 'Other'
  ],
  'xray': [
    'Chest X-ray', 'Skull X-ray', 'Spine X-ray', 'Abdominal X-ray', 'Extremity X-ray', 'Dental X-ray', 'Other'
  ],
  'injection': [
    'Vaccination', 'Intramuscular Injection', 'Subcutaneous Injection', 
    'Intravenous Injection', 'Local Anesthesia', 'Pain Management Injection', 'Other'
  ],
  'ultrasound': [
    'Abdominal Ultrasound', 'Pelvic Ultrasound', 'Cardiac Ultrasound (Echocardiogram)', 
    'Thyroid Ultrasound', 'Breast Ultrasound', 'Vascular Ultrasound', 'Other'
  ],
  'blood_test': [
    'Blood Glucose Test', 'Blood Type Test', 'Blood Group Test', 
    'Blood Culture', 'Blood Gas Analysis', 'Other'
  ],
  'rbs': [
    'Random Blood Sugar', 'Fasting Blood Sugar', 'Post-prandial Blood Sugar', 
    'Glucose Tolerance Test', 'Other'
  ],
  'other': [
    'Custom Service', 'Other'
  ]
};

// Map service names to their corresponding test types and other details
const SERVICE_TEST_TYPES: Record<string, string> = {
  // Chemistry tests
  'Glucose, Fasting': 'Blood Glucose Test',
  'Urea': 'Urea Test',
  'Creatinine': 'Creatinine Test',
  'Sodium': 'Electrolyte Panel',
  'Potassium': 'Electrolyte Panel',
  'Chloride': 'Electrolyte Panel',
  'Bicarbonate': 'Electrolyte Panel',
  'ALT (SGPT)': 'Liver Function Test',
  'AST (SGOT)': 'Liver Function Test',
  'Total Bilirubin': 'Liver Function Test',
  'Albumin': 'Liver Function Test',
  'Total Protein': 'Protein Test',
  'Cholesterol, Total': 'Lipid Panel',
  'Triglycerides': 'Lipid Panel',
  'HDL Cholesterol': 'Lipid Panel',
  'LDL Cholesterol': 'Lipid Panel',
  'HbA1C': 'Glycated Hemoglobin Test',
  'Calcium': 'Calcium Test',
  'Phosphorus': 'Phosphorus Test',
  'Magnesium': 'Magnesium Test',
  'Uric Acid': 'Uric Acid Test',
  'Amylase': 'Amylase Test',
  'Lipase': 'Lipase Test',
  'Alkaline Phosphatase': 'Liver Function Test',
  'GGT': 'Liver Function Test',
  'Iron': 'Iron Studies',
  'TIBC': 'Iron Studies',
  'Ferritin': 'Iron Studies',
  
  // Hematology tests
  'Complete Blood Count (CBC)': 'Complete Blood Count',
  'Hemoglobin': 'Hemoglobin Test',
  'Hematocrit': 'Hematocrit Test',
  'Red Blood Cell Count': 'Red Blood Cell Count',
  'White Blood Cell Count': 'White Blood Cell Count',
  'Platelet Count': 'Platelet Count',
  'Mean Corpuscular Volume (MCV)': 'Red Cell Indices',
  'Mean Corpuscular Hemoglobin (MCH)': 'Red Cell Indices',
  'Differential Count': 'White Blood Cell Differential',
  'Prothrombin Time (PT)': 'Coagulation Studies',
  'Partial Thromboplastin Time (PTT)': 'Coagulation Studies',
  'International Normalized Ratio (INR)': 'Coagulation Studies',
  'Bleeding Time': 'Bleeding Time Test',
  'Clotting Time': 'Clotting Time Test',
  'Erythrocyte Sedimentation Rate (ESR)': 'ESR Test',
  'C-Reactive Protein (CRP)': 'CRP Test',
  'D-Dimer': 'D-Dimer Test',
  'Fibrinogen': 'Fibrinogen Test',
  
  // Parasitology tests
  'Stool Exam (Routine)': 'Stool Examination',
  'Fecal Occult Blood Test (FOBT)': 'Occult Blood Test',
  'Stool Culture': 'Stool Culture',
  'Ova and Parasites': 'Parasite Examination',
  'Giardia Antigen': 'Giardia Test',
  'Cryptosporidium': 'Cryptosporidium Test',
  'Entamoeba histolytica': 'Amoeba Test',
  'Malaria Smear': 'Malaria Test',
  'Malaria Antigen': 'Malaria Rapid Test',
  'Filariasis': 'Filariasis Test',
  'Schistosomiasis': 'Schistosomiasis Test',
  'Toxoplasmosis': 'Toxoplasmosis Test',
  'Leishmaniasis': 'Leishmaniasis Test',
  'Trypanosomiasis': 'Trypanosomiasis Test',
  
  // Immunology tests
  'HIV Test': 'HIV Test',
  'Hepatitis B Surface Antigen': 'Hepatitis B Test',
  'Hepatitis C Antibody': 'Hepatitis C Test',
  'Syphilis (VDRL)': 'Syphilis Test',
  'Rheumatoid Factor': 'Rheumatoid Factor Test',
  'Anti-nuclear Antibody (ANA)': 'ANA Test',
  'Anti-CCP': 'Anti-CCP Test',
  'C3 Complement': 'Complement Test',
  'C4 Complement': 'Complement Test',
  'Immunoglobulin A (IgA)': 'Immunoglobulin Test',
  'Immunoglobulin G (IgG)': 'Immunoglobulin Test',
  'Immunoglobulin M (IgM)': 'Immunoglobulin Test',
  'Immunoglobulin E (IgE)': 'Immunoglobulin Test',
  'Allergy Panel': 'Allergy Test',
  'Food Allergy Test': 'Food Allergy Test',
  'Environmental Allergy Test': 'Environmental Allergy Test',
  
  // Urinalysis tests
  'Urinalysis, Complete': 'Complete Urinalysis',
  'Urinalysis, Dipstick Only': 'Urine Dipstick Test',
  'Urine Culture': 'Urine Culture',
  'Urine Microscopy': 'Urine Microscopy',
  '24-Hour Urine Collection': '24-Hour Urine Test',
  'Microalbuminuria': 'Microalbumin Test',
  'Protein/Creatinine Ratio': 'Protein/Creatinine Ratio',
  'Urine Pregnancy Test': 'Pregnancy Test',
  'Urine Drug Screen': 'Drug Screen',
  'Urine pH': 'Urine pH Test',
  'Urine Specific Gravity': 'Specific Gravity Test',
  'Ketones in Urine': 'Ketone Test',
  'Glucose in Urine': 'Glucose Test',
  'Bilirubin in Urine': 'Bilirubin Test',
  'Urobilinogen in Urine': 'Urobilinogen Test',
  
  // Endocrinology tests
  'Thyroid Stimulating Hormone (TSH)': 'TSH Test',
  'Free T4': 'Free T4 Test',
  'Free T3': 'Free T3 Test',
  'Cortisol': 'Cortisol Test',
  'Testosterone': 'Testosterone Test',
  'Estradiol': 'Estradiol Test',
  'FSH': 'FSH Test',
  'LH': 'LH Test',
  'Prolactin': 'Prolactin Test',
  'ACTH': 'ACTH Test',
  'Parathyroid Hormone (PTH)': 'PTH Test',
  'Insulin': 'Insulin Test',
  'C-Peptide': 'C-Peptide Test',
  'DHEA-S': 'DHEA-S Test',
  'Progesterone': 'Progesterone Test',
  
  // Cardiology tests
  'Troponin I': 'Troponin I Test',
  'Troponin T': 'Troponin T Test',
  'BNP': 'BNP Test',
  'NT-proBNP': 'NT-proBNP Test',
  'CK-MB': 'CK-MB Test',
  'Myoglobin': 'Myoglobin Test',
  'Homocysteine': 'Homocysteine Test',
  'Lipoprotein (a)': 'Lipoprotein (a) Test',
  
  // Tumor markers
  'Prostate Specific Antigen (PSA)': 'PSA Test',
  'CEA': 'CEA Test',
  'CA-125': 'CA-125 Test',
  'CA 19-9': 'CA 19-9 Test',
  'AFP': 'AFP Test',
  'CA 15-3': 'CA 15-3 Test',
  'Beta-hCG': 'Beta-hCG Test',
  'NSE (Neuron-Specific Enolase)': 'NSE Test',
  'Chromogranin A': 'Chromogranin A Test',
  
  // Blood tests
  'Blood Glucose Test': 'Blood Glucose Test',
  'Blood Type Test': 'Blood Typing',
  'Blood Group Test': 'Blood Group Test',
  'Blood Culture': 'Blood Culture',
  'Blood Gas Analysis': 'Blood Gas Analysis',
  
  // RBS tests
  'Random Blood Sugar': 'Random Blood Glucose',
  'Fasting Blood Sugar': 'Fasting Blood Glucose',
  'Post-prandial Blood Sugar': 'Post-prandial Blood Glucose',
  'Glucose Tolerance Test': 'Glucose Tolerance Test'
};

// Comprehensive service details auto-fill data
const SERVICE_DETAILS: Record<string, {
  serviceTestType: string;
  serviceStorageTemperature: string;
  serviceSpecimenType: string;
  serviceDuration: string;
  serviceRequirements: string;
  serviceEquipment: string;
  serviceStaffRequired: string;
  servicePreparation: string;
  serviceFollowUp: string;
  serviceIndications: string;
  serviceContraindications: string;
}> = {
  // Chemistry tests
  'Glucose, Fasting': {
    serviceTestType: 'Blood Glucose Test',
    serviceStorageTemperature: '2-8°C (≤24 hrs)',
    serviceSpecimenType: 'Serum',
    serviceDuration: '30 minutes',
    serviceRequirements: 'Fasting 8-12 hours',
    serviceEquipment: 'Glucose analyzer, centrifuge',
    serviceStaffRequired: 'Lab technician',
    servicePreparation: 'Proper labeling, immediate processing',
    serviceFollowUp: 'Report delivery within 2 hours',
    serviceIndications: 'Diabetes screening, glucose monitoring',
    serviceContraindications: 'Recent food intake, certain medications'
  },
  'Urea': {
    serviceTestType: 'Urea Test',
    serviceStorageTemperature: '2-8°C (≤24 hrs)',
    serviceSpecimenType: 'Serum',
    serviceDuration: '1 hour',
    serviceRequirements: 'No special preparation',
    serviceEquipment: 'Chemistry analyzer',
    serviceStaffRequired: 'Lab technician',
    servicePreparation: 'Proper labeling, immediate processing',
    serviceFollowUp: 'Report delivery within 4 hours',
    serviceIndications: 'Kidney function assessment',
    serviceContraindications: 'None'
  },
  'Creatinine': {
    serviceTestType: 'Creatinine Test',
    serviceStorageTemperature: '2-8°C (≤24 hrs)',
    serviceSpecimenType: 'Serum',
    serviceDuration: '1 hour',
    serviceRequirements: 'No special preparation',
    serviceEquipment: 'Chemistry analyzer',
    serviceStaffRequired: 'Lab technician',
    servicePreparation: 'Proper labeling, immediate processing',
    serviceFollowUp: 'Report delivery within 4 hours',
    serviceIndications: 'Kidney function assessment',
    serviceContraindications: 'None'
  },
  'Complete Blood Count (CBC)': {
    serviceTestType: 'Complete Blood Count',
    serviceStorageTemperature: 'Room temperature (≤4 hrs)',
    serviceSpecimenType: 'Whole Blood (EDTA)',
    serviceDuration: '1 hour',
    serviceRequirements: 'No special preparation',
    serviceEquipment: 'Hematology analyzer, microscope',
    serviceStaffRequired: 'Lab technician, hematologist',
    servicePreparation: 'Proper labeling, gentle mixing',
    serviceFollowUp: 'Report delivery within 2 hours',
    serviceIndications: 'Blood disorder screening, infection detection',
    serviceContraindications: 'None'
  },
  'Stool Exam (Routine)': {
    serviceTestType: 'Stool Examination',
    serviceStorageTemperature: 'Room temp; examine ASAP',
    serviceSpecimenType: 'Stool',
    serviceDuration: '1-2 hours',
    serviceRequirements: 'Stool sample, fresh collection',
    serviceEquipment: 'Microscope, staining materials',
    serviceStaffRequired: 'Lab technician, parasitologist',
    servicePreparation: 'Proper labeling, immediate examination',
    serviceFollowUp: 'Report delivery, treatment if needed',
    serviceIndications: 'Parasitic infection diagnosis',
    serviceContraindications: 'Recent medication, specific conditions'
  },
  'Urinalysis, Dipstick Only': {
    serviceTestType: 'Urine Dipstick Test',
    serviceStorageTemperature: 'Room temperature (≤2 hrs)',
    serviceSpecimenType: 'Midstream urine',
    serviceDuration: '30 minutes',
    serviceRequirements: 'Clean catch urine sample',
    serviceEquipment: 'Dipstick test strips, centrifuge',
    serviceStaffRequired: 'Lab technician',
    servicePreparation: 'Proper labeling, immediate testing',
    serviceFollowUp: 'Report delivery within 1 hour',
    serviceIndications: 'Urinary tract infection screening',
    serviceContraindications: 'None'
  },
  'HIV Test': {
    serviceTestType: 'HIV Test',
    serviceStorageTemperature: '2-8°C (≤48 hrs)',
    serviceSpecimenType: 'Serum',
    serviceDuration: '2-4 hours',
    serviceRequirements: 'Informed consent, counseling',
    serviceEquipment: 'HIV test kits, centrifuge',
    serviceStaffRequired: 'Lab technician, counselor',
    servicePreparation: 'Proper labeling, secure handling',
    serviceFollowUp: 'Confidential report delivery, counseling',
    serviceIndications: 'HIV screening, diagnosis',
    serviceContraindications: 'None'
  },
  'Thyroid Stimulating Hormone (TSH)': {
    serviceTestType: 'TSH Test',
    serviceStorageTemperature: '2-8°C (≤24 hrs)',
    serviceSpecimenType: 'Serum',
    serviceDuration: '2 hours',
    serviceRequirements: 'No special preparation',
    serviceEquipment: 'Immunoassay analyzer',
    serviceStaffRequired: 'Lab technician, endocrinologist',
    servicePreparation: 'Proper labeling, immediate processing',
    serviceFollowUp: 'Report delivery within 4 hours',
    serviceIndications: 'Thyroid function assessment',
    serviceContraindications: 'None'
  }
};

// Comprehensive lab item details auto-fill data
const LAB_ITEM_DETAILS: Record<string, {
  specimenType: string;
  testType: string;
  storageTemperature: string;
  processTime: string;
}> = {
  // Chemistry lab items
  'Glucose, Fasting': {
    specimenType: 'Serum',
    testType: 'Blood Glucose Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '30 minutes'
  },
  'Urea': {
    specimenType: 'Serum',
    testType: 'Urea Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Creatinine': {
    specimenType: 'Serum',
    testType: 'Creatinine Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Sodium': {
    specimenType: 'Serum',
    testType: 'Electrolyte Panel',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Potassium': {
    specimenType: 'Serum',
    testType: 'Electrolyte Panel',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Chloride': {
    specimenType: 'Serum',
    testType: 'Electrolyte Panel',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'ALT (SGPT)': {
    specimenType: 'Serum',
    testType: 'Liver Function Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'AST (SGOT)': {
    specimenType: 'Serum',
    testType: 'Liver Function Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Total Bilirubin': {
    specimenType: 'Serum',
    testType: 'Liver Function Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Cholesterol, Total': {
    specimenType: 'Serum',
    testType: 'Lipid Panel',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Triglycerides': {
    specimenType: 'Serum',
    testType: 'Lipid Panel',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'HDL Cholesterol': {
    specimenType: 'Serum',
    testType: 'Lipid Panel',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'LDL Cholesterol': {
    specimenType: 'Serum',
    testType: 'Lipid Panel',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'HbA1C': {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'Glycated Hemoglobin Test',
    storageTemperature: '2-8°C (≤7 days)',
    processTime: '2 hours'
  },
  'Calcium': {
    specimenType: 'Serum',
    testType: 'Calcium Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Phosphorus': {
    specimenType: 'Serum',
    testType: 'Phosphorus Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Magnesium': {
    specimenType: 'Serum',
    testType: 'Magnesium Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Uric Acid': {
    specimenType: 'Serum',
    testType: 'Uric Acid Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Amylase': {
    specimenType: 'Serum',
    testType: 'Amylase Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Lipase': {
    specimenType: 'Serum',
    testType: 'Lipase Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Alkaline Phosphatase': {
    specimenType: 'Serum',
    testType: 'Liver Function Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'GGT': {
    specimenType: 'Serum',
    testType: 'Liver Function Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Iron': {
    specimenType: 'Serum',
    testType: 'Iron Studies',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'TIBC': {
    specimenType: 'Serum',
    testType: 'Iron Studies',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Ferritin': {
    specimenType: 'Serum',
    testType: 'Iron Studies',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  
  // Hematology lab items
  'Complete Blood Count (CBC)': {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'Complete Blood Count',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '1 hour'
  },
  'Hemoglobin': {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'Hemoglobin Test',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '30 minutes'
  },
  'Hematocrit': {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'Hematocrit Test',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '30 minutes'
  },
  'Red Blood Cell Count': {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'Red Blood Cell Count',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '30 minutes'
  },
  'White Blood Cell Count': {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'White Blood Cell Count',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '30 minutes'
  },
  'Platelet Count': {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'Platelet Count',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '30 minutes'
  },
  'Prothrombin Time (PT)': {
    specimenType: 'Citrated Plasma',
    testType: 'Coagulation Studies',
    storageTemperature: '2-8°C (≤4 hrs)',
    processTime: '1 hour'
  },
  'Partial Thromboplastin Time (PTT)': {
    specimenType: 'Citrated Plasma',
    testType: 'Coagulation Studies',
    storageTemperature: '2-8°C (≤4 hrs)',
    processTime: '1 hour'
  },
  'International Normalized Ratio (INR)': {
    specimenType: 'Citrated Plasma',
    testType: 'Coagulation Studies',
    storageTemperature: '2-8°C (≤4 hrs)',
    processTime: '1 hour'
  },
  'Erythrocyte Sedimentation Rate (ESR)': {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'ESR Test',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '1 hour'
  },
  'C-Reactive Protein (CRP)': {
    specimenType: 'Serum',
    testType: 'CRP Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'D-Dimer': {
    specimenType: 'Citrated Plasma',
    testType: 'D-Dimer Test',
    storageTemperature: '2-8°C (≤4 hrs)',
    processTime: '2 hours'
  },
  'Fibrinogen': {
    specimenType: 'Citrated Plasma',
    testType: 'Fibrinogen Test',
    storageTemperature: '2-8°C (≤4 hrs)',
    processTime: '2 hours'
  },
  
  // Parasitology lab items
  'Stool Exam (Routine)': {
    specimenType: 'Stool',
    testType: 'Stool Examination',
    storageTemperature: 'Room temp; examine ASAP',
    processTime: '1-2 hours'
  },
  'Fecal Occult Blood Test (FOBT)': {
    specimenType: 'Stool',
    testType: 'Occult Blood Test',
    storageTemperature: 'Room temp; test ASAP',
    processTime: '30 minutes'
  },
  'Stool Culture': {
    specimenType: 'Stool',
    testType: 'Stool Culture',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2-3 days'
  },
  'Ova and Parasite Examination': {
    specimenType: 'Stool',
    testType: 'Parasite Examination',
    storageTemperature: 'Room temp; examine ASAP',
    processTime: '1-2 hours'
  },
  'Malaria Smear': {
    specimenType: 'Blood (Thin/Thick smear)',
    testType: 'Malaria Test',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '30 minutes'
  },
  'Malaria Antigen': {
    specimenType: 'Whole Blood',
    testType: 'Malaria Rapid Test',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '15 minutes'
  },
  'Malaria Blood Test (with Kit)': {
    specimenType: 'Whole Blood (Finger Prick or Venous)',
    testType: 'Malaria Rapid Diagnostic Test (RDT)',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '15-20 minutes'
  },
  'Giardia Antigen': {
    specimenType: 'Stool',
    testType: 'Giardia Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Cryptosporidium Antigen': {
    specimenType: 'Stool',
    testType: 'Cryptosporidium Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Entamoeba histolytica Antigen': {
    specimenType: 'Stool',
    testType: 'Amoeba Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  
  // Immunology lab items
  'HIV Antibody': {
    specimenType: 'Serum',
    testType: 'HIV Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '2-4 hours'
  },
  'Hepatitis B Surface Antigen (HBsAg)': {
    specimenType: 'Serum',
    testType: 'Hepatitis B Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '2-4 hours'
  },
  'Hepatitis C Antibody': {
    specimenType: 'Serum',
    testType: 'Hepatitis C Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '2-4 hours'
  },
  'COVID-19 PCR Test': {
    specimenType: 'Nasopharyngeal swab',
    testType: 'COVID-19 PCR Test',
    storageTemperature: '2-8°C (≤72 hrs)',
    processTime: '4-6 hours'
  },
  'C-Reactive Protein': {
    specimenType: 'Serum',
    testType: 'CRP Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Rheumatoid Factor': {
    specimenType: 'Serum',
    testType: 'Rheumatoid Factor Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'ASO (Anti-Streptolysin O)': {
    specimenType: 'Serum',
    testType: 'ASO Titer Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '1-2 hours'
  },
  'ANA (Antinuclear Antibody)': {
    specimenType: 'Serum',
    testType: 'ANA Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2-4 hours'
  },
  'Thyroid Peroxidase Antibody': {
    specimenType: 'Serum',
    testType: 'TPO Antibody Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'IgE Total': {
    specimenType: 'Serum',
    testType: 'Immunoglobulin Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'IgG': {
    specimenType: 'Serum',
    testType: 'Immunoglobulin Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'IgM': {
    specimenType: 'Serum',
    testType: 'Immunoglobulin Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'IgA': {
    specimenType: 'Serum',
    testType: 'Immunoglobulin Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'H. pylori Antigen': {
    specimenType: 'Stool',
    testType: 'H. pylori Antigen Test',
    storageTemperature: '2-8°C (≤3 days)',
    processTime: '1-2 hours'
  },
  'H. pylori Antibody': {
    specimenType: 'Serum',
    testType: 'H. pylori Antibody Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '2-4 hours'
  },
  'H. pylori Ag/Ab Test': {
    specimenType: 'Serum/Stool',
    testType: 'H. pylori Combined Ag/Ab Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '2-4 hours'
  },
  'HCG (Pregnancy Test)': {
    specimenType: 'Serum or Urine',
    testType: 'HCG Pregnancy Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '30 minutes - 2 hours'
  },
  'Serum HCG': {
    specimenType: 'Serum',
    testType: 'Serum HCG (Beta-HCG)',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '1-2 hours'
  },
  'Urine HCG': {
    specimenType: 'Urine',
    testType: 'Urine HCG Test',
    storageTemperature: 'Room temperature (≤2 hrs) or 2-8°C',
    processTime: '5-15 minutes'
  },
  'Complement C3': {
    specimenType: 'Serum',
    testType: 'Complement Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Complement C4': {
    specimenType: 'Serum',
    testType: 'Complement Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Anti-dsDNA': {
    specimenType: 'Serum',
    testType: 'Anti-dsDNA Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2-4 hours'
  },
  'Anti-CCP': {
    specimenType: 'Serum',
    testType: 'Anti-CCP Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Hepatitis B Core Antibody': {
    specimenType: 'Serum',
    testType: 'Hepatitis B Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '2-4 hours'
  },
  'Hepatitis B Surface Antibody': {
    specimenType: 'Serum',
    testType: 'Hepatitis B Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '2-4 hours'
  },
  'VDRL/RPR': {
    specimenType: 'Serum',
    testType: 'Syphilis Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  
  // Urinalysis lab items
  'Complete Urinalysis': {
    specimenType: 'Midstream urine',
    testType: 'Complete Urinalysis',
    storageTemperature: 'Room temperature (≤2 hrs)',
    processTime: '1 hour'
  },
  'Urinalysis, Dipstick Only': {
    specimenType: 'Midstream urine',
    testType: 'Urine Dipstick Test',
    storageTemperature: 'Room temperature (≤2 hrs)',
    processTime: '30 minutes'
  },
  'Urinalysis, Microscopic Only': {
    specimenType: 'Midstream urine',
    testType: 'Urine Microscopy',
    storageTemperature: 'Room temperature (≤2 hrs)',
    processTime: '1 hour'
  },
  'Urine Microalbumin': {
    specimenType: 'Midstream urine',
    testType: 'Microalbumin Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Urine Protein-to-Creatinine Ratio': {
    specimenType: 'Midstream urine',
    testType: 'Protein/Creatinine Ratio',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  
  // Endocrinology lab items
  'Thyroid Stimulating Hormone (TSH)': {
    specimenType: 'Serum',
    testType: 'TSH Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Free T4': {
    specimenType: 'Serum',
    testType: 'Free T4 Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Free T3': {
    specimenType: 'Serum',
    testType: 'Free T3 Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Cortisol': {
    specimenType: 'Serum',
    testType: 'Cortisol Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Testosterone': {
    specimenType: 'Serum',
    testType: 'Testosterone Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Estradiol': {
    specimenType: 'Serum',
    testType: 'Estradiol Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'FSH': {
    specimenType: 'Serum',
    testType: 'FSH Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'LH': {
    specimenType: 'Serum',
    testType: 'LH Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Prolactin': {
    specimenType: 'Serum',
    testType: 'Prolactin Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'ACTH': {
    specimenType: 'Serum',
    testType: 'ACTH Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Parathyroid Hormone (PTH)': {
    specimenType: 'Serum',
    testType: 'PTH Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Insulin': {
    specimenType: 'Serum',
    testType: 'Insulin Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'C-Peptide': {
    specimenType: 'Serum',
    testType: 'C-Peptide Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'DHEA-S': {
    specimenType: 'Serum',
    testType: 'DHEA-S Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Progesterone': {
    specimenType: 'Serum',
    testType: 'Progesterone Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  
  // Cardiology lab items
  'Troponin I': {
    specimenType: 'Serum',
    testType: 'Troponin I Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Troponin T': {
    specimenType: 'Serum',
    testType: 'Troponin T Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'BNP': {
    specimenType: 'Serum',
    testType: 'BNP Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'NT-proBNP': {
    specimenType: 'Serum',
    testType: 'NT-proBNP Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'CK-MB': {
    specimenType: 'Serum',
    testType: 'CK-MB Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Myoglobin': {
    specimenType: 'Serum',
    testType: 'Myoglobin Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '1 hour'
  },
  'Homocysteine': {
    specimenType: 'Serum',
    testType: 'Homocysteine Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Lipoprotein (a)': {
    specimenType: 'Serum',
    testType: 'Lipoprotein (a) Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  
  // Tumor markers lab items
  'Prostate Specific Antigen (PSA)': {
    specimenType: 'Serum',
    testType: 'PSA Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'CEA': {
    specimenType: 'Serum',
    testType: 'CEA Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'CA-125': {
    specimenType: 'Serum',
    testType: 'CA-125 Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'CA 19-9': {
    specimenType: 'Serum',
    testType: 'CA 19-9 Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'AFP': {
    specimenType: 'Serum',
    testType: 'AFP Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'CA 15-3': {
    specimenType: 'Serum',
    testType: 'CA 15-3 Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Beta-hCG': {
    specimenType: 'Serum',
    testType: 'Beta-hCG Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'NSE (Neuron-Specific Enolase)': {
    specimenType: 'Serum',
    testType: 'NSE Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  'Chromogranin A': {
    specimenType: 'Serum',
    testType: 'Chromogranin A Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2 hours'
  },
  
  // Blood test lab items
  'Blood Glucose Test': {
    specimenType: 'Serum',
    testType: 'Blood Glucose Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '30 minutes'
  },
  'Blood Type Test': {
    specimenType: 'Whole Blood',
    testType: 'Blood Typing',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '30 minutes'
  },
  'Blood Group Test': {
    specimenType: 'Whole Blood',
    testType: 'Blood Group Test',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '30 minutes'
  },
  'Blood Culture': {
    specimenType: 'Blood',
    testType: 'Blood Culture',
    storageTemperature: '35-37°C (incubate)',
    processTime: '5-7 days'
  },
  'Blood Gas Analysis': {
    specimenType: 'Arterial Blood',
    testType: 'Blood Gas Analysis',
    storageTemperature: 'Ice bath (≤30 min)',
    processTime: '15 minutes'
  },
  
  // RBS lab items
  'Random Blood Sugar': {
    specimenType: 'Serum',
    testType: 'Random Blood Glucose',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '30 minutes'
  },
  'Fasting Blood Sugar': {
    specimenType: 'Serum',
    testType: 'Fasting Blood Glucose',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '30 minutes'
  },
  'Post-prandial Blood Sugar': {
    specimenType: 'Serum',
    testType: 'Post-prandial Blood Glucose',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '30 minutes'
  },
  'Glucose Tolerance Test': {
    specimenType: 'Serum',
    testType: 'Glucose Tolerance Test',
    storageTemperature: '2-8°C (≤24 hrs)',
    processTime: '2-3 hours'
  }
};

// Category-level defaults to ensure all medication categories have sensible auto-fill behavior
const MED_CATEGORY_DEFAULTS: Record<string, {
  defaultAdminRoute: string;
  allowedDosages: string[];
  prescriptionRequired: boolean;
}> = {
  'Antibiotics': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['125mg', '250mg', '500mg', '1g', 'Suspension 125mg/5ml', 'Suspension 250mg/5ml', 'Other'],
    prescriptionRequired: true
  },
  'Pain Relievers': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['200mg', '400mg', '500mg', '650mg', '1g', 'Other'],
    prescriptionRequired: false
  },
  'Vitamins': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['500mg', '1 tablet', '1 capsule', '1000 IU', '2000 IU', '5000 IU', 'Other'],
    prescriptionRequired: false
  },
  'Antiseptics': {
    defaultAdminRoute: 'Topical',
    allowedDosages: ['0.5%', '1%', '2%', '4%', '10%', 'Other'],
    prescriptionRequired: false
  },
  'Vaccines': {
    defaultAdminRoute: 'IM',
    allowedDosages: ['0.5ml', '1ml', 'Other'],
    prescriptionRequired: true
  },
  'Cardiovascular': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['2.5mg', '5mg', '10mg', '20mg', '25mg', '50mg', '100mg', 'Other'],
    prescriptionRequired: true
  },
  'Respiratory': {
    defaultAdminRoute: 'Inhalation',
    allowedDosages: ['100mcg', '200mcg', '400mcg', '5mg', '10mg', 'Other'],
    prescriptionRequired: true
  },
  'Gastrointestinal': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['10mg', '20mg', '40mg', '150mg', '300mg', 'Other'],
    prescriptionRequired: false
  },
  'Neurological': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['5mg', '10mg', '25mg', '50mg', '100mg', '200mg', 'Other'],
    prescriptionRequired: true
  },
  'Endocrine': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['5mg', '10mg', '25mg', '50mg', '100mg', '500mg', 'Other'],
    prescriptionRequired: true
  },
  'Dermatological': {
    defaultAdminRoute: 'Topical',
    allowedDosages: ['0.5%', '1%', '2.5%', '5%', '10%', 'Other'],
    prescriptionRequired: false
  },
  'Ophthalmic': {
    defaultAdminRoute: 'Topical',
    allowedDosages: ['0.1%', '0.3%', '0.5%', '1%', 'Other'],
    prescriptionRequired: true
  },
  'Ear/Nose/Throat': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['5mg', '10mg', '20mg', '30mg', '60mg', 'Other'],
    prescriptionRequired: false
  },
  'Musculoskeletal': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['200mg', '400mg', '500mg', '750mg', '1000mg', 'Other'],
    prescriptionRequired: false
  },
  'Psychiatric': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['5mg', '10mg', '20mg', '25mg', '50mg', '100mg', 'Other'],
    prescriptionRequired: true
  },
  'Oncology': {
    defaultAdminRoute: 'IV',
    allowedDosages: ['10mg', '25mg', '50mg', '100mg', '200mg', 'Other'],
    prescriptionRequired: true
  },
  'Emergency Medicine': {
    defaultAdminRoute: 'IV',
    allowedDosages: ['1mg', '5mg', '10mg', '50mg', '100mg', 'Other'],
    prescriptionRequired: true
  },
  'IV Fluids': {
    defaultAdminRoute: 'IV',
    allowedDosages: ['100ml', '250ml', '500ml', '1000ml', '2000ml', '50ml', '20ml', '10ml', '5ml', 'Other'],
    prescriptionRequired: false
  },
  'Pediatric': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['125mg/5ml', '250mg/5ml', '1ml', '2.5ml', '5ml', 'Other'],
    prescriptionRequired: false
  },
  'Geriatric': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['2.5mg', '5mg', '10mg', '25mg', '50mg', 'Other'],
    prescriptionRequired: true
  },
  'Women\'s Health': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['0.5mg', '1mg', '2mg', '5mg', '10mg', 'Other'],
    prescriptionRequired: true
  },
  'Men\'s Health': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['5mg', '10mg', '25mg', '50mg', '100mg', 'Other'],
    prescriptionRequired: true
  },
  'Antifungal': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['50mg', '100mg', '150mg', '200mg', '400mg', 'Other'],
    prescriptionRequired: true
  },
  'Antiviral': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['200mg', '400mg', '500mg', '750mg', '1000mg', 'Other'],
    prescriptionRequired: true
  },
  'Antimalarial': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['100mg', '150mg', '250mg', '500mg', 'Other'],
    prescriptionRequired: true
  },
  'Antidiabetic': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['5mg', '10mg', '25mg', '50mg', '100mg', 'Other'],
    prescriptionRequired: true
  },
  'Antihypertensive': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['2.5mg', '5mg', '10mg', '20mg', '25mg', '50mg', 'Other'],
    prescriptionRequired: true
  },
  'Anticoagulant': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['1mg', '2.5mg', '5mg', '10mg', '20mg', 'Other'],
    prescriptionRequired: true
  },
  'Immunosuppressant': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['5mg', '10mg', '25mg', '50mg', '100mg', 'Other'],
    prescriptionRequired: true
  },
  'Other Medication': {
    defaultAdminRoute: 'Oral',
    allowedDosages: ['5mg', '10mg', '20mg', '50mg', '100mg', 'Other'],
    prescriptionRequired: false
  }
};

// Medication to category mapping for auto-filling category field
const MEDICATION_TO_CATEGORY: Record<string, string> = {
  // Pain Relievers
  'Paracetamol': 'Pain Relievers',
  'Ibuprofen': 'Pain Relievers',
  'Aspirin': 'Pain Relievers',
  'Diclofenac': 'Pain Relievers',
  'Naproxen': 'Pain Relievers',
  'Celecoxib': 'Pain Relievers',
  'Tramadol': 'Pain Relievers',
  'Codeine': 'Pain Relievers',
  'Oxycodone': 'Pain Relievers',
  'Buprenorphine': 'Pain Relievers',
  'Morphine': 'Emergency Medicine',
  'Fentanyl': 'Emergency Medicine',
  
  // Antibiotics
  'Amoxicillin': 'Antibiotics',
  'Ciprofloxacin': 'Antibiotics',
  'Azithromycin': 'Antibiotics',
  'Ceftriaxone': 'Antibiotics',
  'Gentamicin': 'Antibiotics',
  'Vancomycin': 'Antibiotics',
  'Metronidazole': 'Antibiotics',
  'Clindamycin': 'Antibiotics',
  'Erythromycin': 'Antibiotics',
  'Tetracycline': 'Antibiotics',
  'Clarithromycin': 'Antibiotics',
  
  // Cardiovascular
  'Amlodipine': 'Cardiovascular',
  'Atorvastatin': 'Cardiovascular',
  'Losartan': 'Antihypertensive',
  'Simvastatin': 'Cardiovascular',
  'Lisinopril': 'Antihypertensive',
  'Hydrochlorothiazide': 'Antihypertensive',
  'Enalapril': 'Antihypertensive',
  'Metoprolol': 'Cardiovascular',
  'Digoxin': 'Cardiovascular',
  'Nifedipine': 'Cardiovascular',
  'Verapamil': 'Cardiovascular',
  'Diltiazem': 'Cardiovascular',
  'Bisoprolol': 'Cardiovascular',
  'Carvedilol': 'Cardiovascular',
  'Ramipril': 'Antihypertensive',
  'Candesartan': 'Antihypertensive',
  'Irbesartan': 'Antihypertensive',
  'Spironolactone': 'Cardiovascular',
  'Indapamide': 'Antihypertensive',
  'Bendroflumethiazide': 'Antihypertensive',
  'Rosuvastatin': 'Cardiovascular',
  'Pravastatin': 'Cardiovascular',
  'Fenofibrate': 'Cardiovascular',
  'Warfarin': 'Anticoagulant',
  
  // Gastrointestinal
  'Omeprazole': 'Gastrointestinal',
  'Cimetidine': 'Gastrointestinal',
  'Metoclopramide': 'Gastrointestinal',
  'Ondansetron': 'Gastrointestinal',
  
  // Endocrine/Diabetes
  'Metformin': 'Antidiabetic',
  'Insulin': 'Antidiabetic',
  'Levothyroxine': 'Endocrine',
  'Glibenclamide': 'Antidiabetic',
  'Gliclazide': 'Antidiabetic',
  'Pioglitazone': 'Antidiabetic',
  'Sitagliptin': 'Antidiabetic',
  'Liraglutide': 'Antidiabetic',
  'Empagliflozin': 'Antidiabetic',
  
  // Psychiatric/Neurological
  'Fluoxetine': 'Psychiatric',
  'Sertraline': 'Psychiatric',
  'Diazepam': 'Psychiatric',
  'Haloperidol': 'Psychiatric',
  'Risperidone': 'Psychiatric',
  'Olanzapine': 'Psychiatric',
  'Quetiapine': 'Psychiatric',
  'Chlorpromazine': 'Psychiatric',
  'Lithium': 'Psychiatric',
  'Carbamazepine': 'Neurological',
  'Phenytoin': 'Neurological',
  'Valproic Acid': 'Neurological',
  'Levetiracetam': 'Neurological',
  'Lamotrigine': 'Neurological',
  'Gabapentin': 'Neurological',
  'Pregabalin': 'Neurological',
  'Baclofen': 'Musculoskeletal',
  
  // Respiratory
  'Loratadine': 'Respiratory',
  'Cetirizine': 'Respiratory',
  'Albuterol': 'Respiratory',
  'Salbutamol': 'Respiratory',
  'Budesonide': 'Respiratory',
  
  // Corticosteroids
  'Prednisone': 'Emergency Medicine',
  'Hydrocortisone': 'Emergency Medicine',
  'Dexamethasone': 'Emergency Medicine',
  'Prednisolone': 'Emergency Medicine',
  'Methylprednisolone': 'Emergency Medicine',
  'Betamethasone': 'Dermatological',
  'Triamcinolone': 'Dermatological',
  
  // Emergency Medicine
  'Epinephrine': 'Emergency Medicine',
  'Atropine': 'Emergency Medicine',
  'Dopamine': 'Emergency Medicine',
  'Norepinephrine': 'Emergency Medicine',
  'Ketamine': 'Emergency Medicine',
  'Propofol': 'Emergency Medicine',
  'Midazolam': 'Emergency Medicine',
  
  // Diuretics
  'Furosemide': 'Cardiovascular',
  
  // Vitamins & Supplements
  'Vitamin B Complex': 'Vitamins',
  'Vitamin C': 'Vitamins',
  'Vitamin D3': 'Vitamins',
  'Multivitamin': 'Vitamins',
  'Iron Sulfate': 'Vitamins',
  'Folic Acid': 'Vitamins',
  
  // IV Fluids & Electrolytes
  'Calcium Gluconate': 'IV Fluids',
  'Magnesium Sulfate': 'IV Fluids',
  'Potassium Chloride': 'IV Fluids',
  'Sodium Bicarbonate': 'IV Fluids',
  'Glucose 40%': 'IV Fluids',
  'Mannitol': 'IV Fluids',
  'Albumin': 'IV Fluids',
  
  // Other
  'Other': 'Other Medication'
};

// Lab item to category mapping for auto-filling category field
const LAB_ITEM_TO_CATEGORY: Record<string, string> = {
  // Chemistry
  'Glucose, Fasting': 'chemistry',
  'Glucose Test Strips': 'chemistry',
  'Urea': 'chemistry',
  'Creatinine': 'chemistry',
  'Sodium': 'chemistry',
  'Potassium': 'chemistry',
  'Chloride': 'chemistry',
  'Bicarbonate': 'chemistry',
  'ALT (SGPT)': 'chemistry',
  'AST (SGOT)': 'chemistry',
  'Total Bilirubin': 'chemistry',
  'Albumin': 'chemistry',
  'Total Protein': 'chemistry',
  'Cholesterol, Total': 'chemistry',
  'Triglycerides': 'chemistry',
  'HDL Cholesterol': 'chemistry',
  'LDL Cholesterol': 'chemistry',
  'HbA1C': 'chemistry',
  'Calcium': 'chemistry',
  'Phosphorus': 'chemistry',
  'Magnesium': 'chemistry',
  'Uric Acid': 'chemistry',
  'Amylase': 'chemistry',
  'Lipase': 'chemistry',
  'Alkaline Phosphatase': 'chemistry',
  'GGT': 'chemistry',
  'Iron': 'chemistry',
  'TIBC': 'chemistry',
  'Ferritin': 'chemistry',
  
  // Hematology
  'Complete Blood Count (CBC)': 'hematology',
  'Hemoglobin': 'hematology',
  'Hematocrit': 'hematology',
  'Red Blood Cell Count': 'hematology',
  'White Blood Cell Count': 'hematology',
  'Platelet Count': 'hematology',
  'Blood Group Test (100 tests)': 'hematology',
  'Blood Group Fluid/Reagent (100 tests)': 'hematology',
  'Mean Corpuscular Volume (MCV)': 'hematology',
  'Mean Corpuscular Hemoglobin (MCH)': 'hematology',
  'Differential Count': 'hematology',
  'Prothrombin Time (PT)': 'hematology',
  'International Normalized Ratio (INR)': 'hematology',
  'Partial Thromboplastin Time (PTT)': 'hematology',
  'Reticulocyte Count': 'hematology',
  'Erythrocyte Sedimentation Rate (ESR)': 'hematology',
  'Neutrophils': 'hematology',
  'Lymphocytes': 'hematology',
  'Monocytes': 'hematology',
  'Eosinophils': 'hematology',
  'Basophils': 'hematology',
  'D-Dimer': 'hematology',
  'Fibrinogen': 'hematology',
  
  // Parasitology
  'Stool Exam (Routine)': 'parasitology',
  'Fecal Occult Blood Test (FOBT)': 'parasitology',
  'Stool Culture': 'parasitology',
  'Ova and Parasite Examination': 'parasitology',
  'Malaria Smear': 'parasitology',
  'Malaria Blood Test (with Kit)': 'parasitology',
  'Filaria Smear': 'parasitology',
  'Schistosomiasis Test': 'parasitology',
  'Giardia Antigen': 'parasitology',
  'Cryptosporidium Antigen': 'parasitology',
  'Entamoeba histolytica Antigen': 'parasitology',
  'Helminth Antibody Panel': 'parasitology',
  
  // Immunology
  'HIV Antibody': 'immunology',
  'Hepatitis B Surface Antigen (HBsAg)': 'immunology',
  'Hepatitis C Antibody': 'immunology',
  'COVID-19 PCR Test': 'immunology',
  'C-Reactive Protein': 'immunology',
  'CRP Fluid/Reagent (100 tests)': 'immunology',
  'Rheumatoid Factor': 'immunology',
  'ASO (Anti-Streptolysin O)': 'immunology',
  'ASO Fluid/Reagent (100 tests)': 'immunology',
  'ANA (Antinuclear Antibody)': 'immunology',
  'Thyroid Peroxidase Antibody': 'immunology',
  'H. pylori Antigen': 'immunology',
  'H. pylori Antibody': 'immunology',
  'H. pylori Ag/Ab Test': 'immunology',
  'HCG (Pregnancy Test)': 'immunology',
  'Serum HCG': 'immunology',
  'Urine HCG': 'immunology',
  'Widal O & H Test (100 tests)': 'immunology',
  'Weil-Felix Test (100 tests)': 'immunology',
  'IgE Total': 'immunology',
  'IgG': 'immunology',
  'IgM': 'immunology',
  'IgA': 'immunology',
  'Complement C3': 'immunology',
  'Complement C4': 'immunology',
  'Anti-dsDNA': 'immunology',
  'Anti-CCP': 'immunology',
  'Hepatitis B Core Antibody': 'immunology',
  'Hepatitis B Surface Antibody': 'immunology',
  'VDRL/RPR': 'immunology',
  
  // Urinalysis
  'Complete Urinalysis': 'urinalysis',
  'Urinalysis, Dipstick Only': 'urinalysis',
  'Urinalysis, Microscopic Only': 'urinalysis',
  'Urine Microalbumin': 'urinalysis',
  'Urine Protein-to-Creatinine Ratio': 'urinalysis',
  
  // Endocrinology
  'Thyroid Stimulating Hormone (TSH)': 'endocrinology',
  'Free T4': 'endocrinology',
  'Free T3': 'endocrinology',
  'Cortisol': 'endocrinology',
  'Testosterone': 'endocrinology',
  'Estradiol': 'endocrinology',
  'FSH': 'endocrinology',
  'LH': 'endocrinology',
  'Prolactin': 'endocrinology',
  'ACTH': 'endocrinology',
  'Parathyroid Hormone (PTH)': 'endocrinology',
  'Insulin': 'endocrinology',
  'C-Peptide': 'endocrinology',
  'DHEA-S': 'endocrinology',
  'Progesterone': 'endocrinology',
  
  // Cardiology
  'Troponin I': 'cardiology',
  'Troponin T': 'cardiology',
  'BNP': 'cardiology',
  'NT-proBNP': 'cardiology',
  'CK-MB': 'cardiology',
  'Myoglobin': 'cardiology',
  'Homocysteine': 'cardiology',
  'Lipoprotein (a)': 'cardiology',
  
  // Tumor markers
  'Prostate Specific Antigen (PSA)': 'tumor-markers',
  'CEA': 'tumor-markers',
  'CA-125': 'tumor-markers',
  'CA 19-9': 'tumor-markers',
  'AFP': 'tumor-markers',
  'CA 15-3': 'tumor-markers',
  'Beta-hCG': 'tumor-markers',
  'NSE (Neuron-Specific Enolase)': 'tumor-markers',
  'Chromogranin A': 'tumor-markers',
  
  // Other
  'Custom Lab Item': 'other',
  'Other': 'other'
};

// Equipment item to category mapping for auto-filling category field
const EQUIPMENT_TO_CATEGORY: Record<string, string> = {
  // Diagnostic
  'ECG Machine': 'Diagnostic',
  'X-ray Machine': 'Diagnostic',
  'Ultrasound Machine': 'Diagnostic',
  'Stethoscope': 'Diagnostic',
  
  // Monitoring
  'Blood Pressure Monitor': 'Monitoring',
  'Pulse Oximeter': 'Monitoring',
  'Thermometer': 'Monitoring',
  
  // Surgical
  'Scalpel': 'Surgical',
  'Surgical Scissors': 'Surgical',
  'Forceps': 'Surgical',
  
  // Therapeutic
  'Nebulizer': 'Therapeutic',
  'Infusion Pump': 'Therapeutic',
  'Ventilator': 'Therapeutic',
  'Defibrillator': 'Therapeutic',
  
  // Other
  'Other': 'Other Equipment'
};

// Supplies item to category mapping for auto-filling category field
const SUPPLIES_TO_CATEGORY: Record<string, string> = {
  // Disposable Supplies
  'Face Mask': 'Disposable Supplies',
  'Surgical Gloves': 'Disposable Supplies',
  'Gauze': 'Disposable Supplies',
  'Alcohol Swab': 'Disposable Supplies',
  'Lidocaine': 'Disposable Supplies',
  'Syringe 3cc': 'Disposable Supplies',
  'Syringe 5cc': 'Disposable Supplies',
  'Syringe 10cc': 'Disposable Supplies',
  'Syringe 20cc': 'Disposable Supplies',
  'Syringes': 'Disposable Supplies',
  'Needles': 'Disposable Supplies',
  'Cannula': 'Disposable Supplies',
  'Suture 2/0': 'Disposable Supplies',
  'Suture 3/0': 'Disposable Supplies',
  'Suture 4/0': 'Disposable Supplies',
  'Bandages': 'Disposable Supplies',
  'Gloves': 'Disposable Supplies',
  'Test Tubes': 'Disposable Supplies',
  'Specimen Containers': 'Disposable Supplies',
  
  // Reusable Supplies
  'BP Cuff': 'Reusable Supplies',
  'Reflex Hammer': 'Reusable Supplies',
  
  // PPE
  'Face Shield': 'PPE',
  'Gown': 'PPE',
  'N95 Mask': 'PPE',
  'Masks': 'PPE',
  
  // Cleaning Supplies
  'Disinfectant': 'Cleaning Supplies',
  'Disinfectants': 'Cleaning Supplies',
  'Detergent': 'Cleaning Supplies',
  'Mop': 'Cleaning Supplies',
  
  // Office Supplies
  'Pen': 'Office Supplies',
  'Notebook': 'Office Supplies',
  'Printer Paper': 'Office Supplies',
  
  // Test Kits & Lab Supplies (Reagents/Fluids)
  'CRP Fluid/Reagent (100 tests)': 'Disposable Supplies',
  'ASO Fluid/Reagent (100 tests)': 'Disposable Supplies',
  'Blood Group Fluid/Reagent (100 tests)': 'Disposable Supplies',
  'Glucose Test Strips': 'Disposable Supplies',
  'Malaria Test Kit': 'Disposable Supplies',
  'HIV Test Kit': 'Disposable Supplies',
  'Pregnancy Test Kit': 'Disposable Supplies',
  
  // Other
  'Other': 'Other Supply'
};

// Service name to category mapping for auto-filling category field
const SERVICE_TO_CATEGORY: Record<string, string> = {
  // Consultation services
  'General Consultation': 'consultation',
  'Follow-up Consultation': 'consultation',
  'Emergency Consultation': 'consultation',
  'Specialist Consultation': 'consultation',
  'Telemedicine Consultation': 'consultation',
  'Second Opinion': 'consultation',
  'Pre-operative Consultation': 'consultation',
  'Post-operative Consultation': 'consultation',
  
  // Procedure services
  'Minor Surgery': 'procedure',
  'Biopsy': 'procedure',
  'Suturing': 'procedure',
  'Wound Care': 'procedure',
  'Drainage': 'procedure',
  'Incision and Drainage': 'procedure',
  'Excision': 'procedure',
  'Cauterization': 'procedure',
  
  // Chemistry services (same as lab chemistry items)
  'Glucose, Fasting': 'chemistry',
  'Glucose Test Strips': 'chemistry',
  'Urea': 'chemistry',
  'Creatinine': 'chemistry',
  'Sodium': 'chemistry',
  'Potassium': 'chemistry',
  'Chloride': 'chemistry',
  'Bicarbonate': 'chemistry',
  'ALT (SGPT)': 'chemistry',
  'AST (SGOT)': 'chemistry',
  'Total Bilirubin': 'chemistry',
  'Albumin': 'chemistry',
  'Total Protein': 'chemistry',
  'Cholesterol, Total': 'chemistry',
  'Triglycerides': 'chemistry',
  'HDL Cholesterol': 'chemistry',
  'LDL Cholesterol': 'chemistry',
  'HbA1C': 'chemistry',
  'Calcium': 'chemistry',
  'Phosphorus': 'chemistry',
  'Magnesium': 'chemistry',
  'Uric Acid': 'chemistry',
  'Amylase': 'chemistry',
  'Lipase': 'chemistry',
  'Alkaline Phosphatase': 'chemistry',
  'GGT': 'chemistry',
  'Iron': 'chemistry',
  'TIBC': 'chemistry',
  'Ferritin': 'chemistry',
  
  // Hematology services
  'Complete Blood Count (CBC)': 'hematology',
  'Hemoglobin': 'hematology',
  'Hematocrit': 'hematology',
  'Red Blood Cell Count': 'hematology',
  'White Blood Cell Count': 'hematology',
  'Platelet Count': 'hematology',
  'Blood Group Test (100 tests)': 'hematology',
  'Blood Group Fluid/Reagent (100 tests)': 'hematology',
  'Mean Corpuscular Volume (MCV)': 'hematology',
  'Mean Corpuscular Hemoglobin (MCH)': 'hematology',
  'Differential Count': 'hematology',
  'Prothrombin Time (PT)': 'hematology',
  'International Normalized Ratio (INR)': 'hematology',
  'Partial Thromboplastin Time (PTT)': 'hematology',
  'Reticulocyte Count': 'hematology',
  'Erythrocyte Sedimentation Rate (ESR)': 'hematology',
  'Neutrophils': 'hematology',
  'Lymphocytes': 'hematology',
  'Monocytes': 'hematology',
  'Eosinophils': 'hematology',
  'Basophils': 'hematology',
  'D-Dimer': 'hematology',
  'Fibrinogen': 'hematology',
  
  // Parasitology services
  'Stool Exam (Routine)': 'parasitology',
  'Fecal Occult Blood Test (FOBT)': 'parasitology',
  'Stool Culture': 'parasitology',
  'Ova and Parasite Examination': 'parasitology',
  'Malaria Smear': 'parasitology',
  'Malaria Blood Test (with Kit)': 'parasitology',
  'Filaria Smear': 'parasitology',
  'Schistosomiasis Test': 'parasitology',
  'Giardia Antigen': 'parasitology',
  'Cryptosporidium Antigen': 'parasitology',
  'Entamoeba histolytica Antigen': 'parasitology',
  'Helminth Antibody Panel': 'parasitology',
  
  // Immunology services
  'HIV Antibody': 'immunology',
  'Hepatitis B Surface Antigen (HBsAg)': 'immunology',
  'Hepatitis C Antibody': 'immunology',
  'COVID-19 PCR Test': 'immunology',
  'C-Reactive Protein': 'immunology',
  'CRP Fluid/Reagent (100 tests)': 'immunology',
  'Rheumatoid Factor': 'immunology',
  'ASO (Anti-Streptolysin O)': 'immunology',
  'ASO Fluid/Reagent (100 tests)': 'immunology',
  'ANA (Antinuclear Antibody)': 'immunology',
  'Thyroid Peroxidase Antibody': 'immunology',
  'H. pylori Antigen': 'immunology',
  'H. pylori Antibody': 'immunology',
  'H. pylori Ag/Ab Test': 'immunology',
  'HCG (Pregnancy Test)': 'immunology',
  'Serum HCG': 'immunology',
  'Widal O & H Test (100 tests)': 'immunology',
  'Weil-Felix Test (100 tests)': 'immunology',
  'IgE Total': 'immunology',
  'IgG': 'immunology',
  'IgM': 'immunology',
  'IgA': 'immunology',
  'Complement C3': 'immunology',
  'Complement C4': 'immunology',
  'Anti-dsDNA': 'immunology',
  'Anti-CCP': 'immunology',
  'Hepatitis B Core Antibody': 'immunology',
  'Hepatitis B Surface Antibody': 'immunology',
  'VDRL/RPR': 'immunology',
  
  // Urinalysis services
  'Complete Urinalysis': 'urinalysis',
  'Urinalysis, Dipstick Only': 'urinalysis',
  'Urinalysis, Microscopic Only': 'urinalysis',
  'Urine Microalbumin': 'urinalysis',
  'Urine Protein-to-Creatinine Ratio': 'urinalysis',
  'Urine HCG': 'urinalysis',
  
  // Endocrinology services
  'Thyroid Stimulating Hormone (TSH)': 'endocrinology',
  'Free T4': 'endocrinology',
  'Free T3': 'endocrinology',
  'Cortisol': 'endocrinology',
  'Testosterone': 'endocrinology',
  'Estradiol': 'endocrinology',
  'FSH': 'endocrinology',
  'LH': 'endocrinology',
  'Prolactin': 'endocrinology',
  'ACTH': 'endocrinology',
  'Parathyroid Hormone (PTH)': 'endocrinology',
  'Insulin': 'endocrinology',
  'C-Peptide': 'endocrinology',
  'DHEA-S': 'endocrinology',
  'Progesterone': 'endocrinology',
  
  // Cardiology services
  'Troponin I': 'cardiology',
  'Troponin T': 'cardiology',
  'BNP': 'cardiology',
  'NT-proBNP': 'cardiology',
  'CK-MB': 'cardiology',
  'Myoglobin': 'cardiology',
  'Homocysteine': 'cardiology',
  'Lipoprotein (a)': 'cardiology',
  
  // Tumor markers services
  'Prostate Specific Antigen (PSA)': 'tumor-markers',
  'CEA': 'tumor-markers',
  'CA-125': 'tumor-markers',
  'CA 19-9': 'tumor-markers',
  'AFP': 'tumor-markers',
  'CA 15-3': 'tumor-markers',
  'Beta-hCG': 'tumor-markers',
  'NSE (Neuron-Specific Enolase)': 'tumor-markers',
  'Chromogranin A': 'tumor-markers',
  
  // Imaging services
  'Chest X-ray': 'imaging',
  'Abdominal X-ray': 'imaging',
  'Bone X-ray': 'imaging',
  'CT Scan': 'imaging',
  'MRI Scan': 'imaging',
  'Ultrasound': 'imaging',
  'Mammography': 'imaging',
  'Bone Density Scan': 'imaging',
  
  // Injection services
  'Vaccination': 'injection',
  'Intramuscular Injection': 'injection',
  'Subcutaneous Injection': 'injection',
  'Intravenous Injection': 'injection',
  'Local Anesthesia': 'injection',
  'Pain Management Injection': 'injection',
  
  // Ultrasound services
  'Abdominal Ultrasound': 'ultrasound',
  'Pelvic Ultrasound': 'ultrasound',
  'Cardiac Ultrasound (Echocardiogram)': 'ultrasound',
  'Thyroid Ultrasound': 'ultrasound',
  'Breast Ultrasound': 'ultrasound',
  'Vascular Ultrasound': 'ultrasound',
  
  // Blood test services
  'Blood Glucose Test': 'blood_test',
  'Blood Type Test': 'blood_test',
  'Blood Group Test': 'blood_test',
  'Blood Culture': 'blood_test',
  'Blood Gas Analysis': 'blood_test',
  
  // RBS services
  'Random Blood Sugar': 'rbs',
  'Fasting Blood Sugar': 'rbs',
  'Post-prandial Blood Sugar': 'rbs',
  'Glucose Tolerance Test': 'rbs',
  
  // Other services
  'Custom Service': 'other',
  'Other': 'other'
};

// Presets for common lab tests to auto-fill lab details
const LAB_TEST_PRESETS: Record<string, {
  specimenType: string;
  testType: string;
  storageTemperature?: string;
  processTime?: string;
}> = {
  'Glucose, Fasting': {
    specimenType: 'Serum/Plasma',
    testType: 'Blood Glucose',
    storageTemperature: '2–8°C (short-term), -20°C (long-term)',
    processTime: '1–2 hours'
  },
  'Urea': {
    specimenType: 'Serum',
    testType: 'Urea',
    storageTemperature: '2–8°C',
    processTime: '1–2 hours'
  },
  'Creatinine': {
    specimenType: 'Serum',
    testType: 'Creatinine',
    storageTemperature: '2–8°C',
    processTime: '1–2 hours'
  },
  'Complete Urinalysis': {
    specimenType: 'Urine',
    testType: 'Urinalysis',
    storageTemperature: 'Room temp ≤2 hrs or 2–8°C',
    processTime: '≤1 hour'
  },
  'Complete Blood Count (CBC)': {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'CBC',
    storageTemperature: '2–8°C (≤24 hrs)',
    processTime: '≈1 hour'
  },
  'Malaria Blood Test (with Kit)': {
    specimenType: 'Whole Blood (Finger Prick or Venous)',
    testType: 'Malaria Rapid Diagnostic Test (RDT)',
    storageTemperature: 'Room temperature (≤4 hrs)',
    processTime: '15-20 minutes'
  },
  'H. pylori Antigen': {
    specimenType: 'Stool',
    testType: 'H. pylori Antigen Test',
    storageTemperature: '2-8°C (≤3 days)',
    processTime: '1-2 hours'
  },
  'H. pylori Antibody': {
    specimenType: 'Serum',
    testType: 'H. pylori Antibody Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '2-4 hours'
  },
  'H. pylori Ag/Ab Test': {
    specimenType: 'Serum/Stool',
    testType: 'H. pylori Combined Ag/Ab Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '2-4 hours'
  },
  'HCG (Pregnancy Test)': {
    specimenType: 'Serum or Urine',
    testType: 'HCG Pregnancy Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '30 minutes - 2 hours'
  },
  'Serum HCG': {
    specimenType: 'Serum',
    testType: 'Serum HCG (Beta-HCG)',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '1-2 hours'
  },
  'Urine HCG': {
    specimenType: 'Urine',
    testType: 'Urine HCG Test',
    storageTemperature: 'Room temperature (≤2 hrs) or 2-8°C',
    processTime: '5-15 minutes'
  },
  'ASO (Anti-Streptolysin O)': {
    specimenType: 'Serum',
    testType: 'ASO Titer Test',
    storageTemperature: '2-8°C (≤48 hrs)',
    processTime: '1-2 hours'
  },
  'CRP Fluid/Reagent (100 tests)': {
    specimenType: 'Reagent for Serum samples',
    testType: 'CRP Test Reagent',
    storageTemperature: '2-8°C (refrigerated)',
    processTime: 'Reagent for 100 tests'
  },
  'ASO Fluid/Reagent (100 tests)': {
    specimenType: 'Reagent for Serum samples',
    testType: 'ASO Test Reagent',
    storageTemperature: '2-8°C (refrigerated)',
    processTime: 'Reagent for 100 tests'
  },
  'Blood Group Fluid/Reagent (100 tests)': {
    specimenType: 'Reagent for Blood samples',
    testType: 'Blood Typing Reagent',
    storageTemperature: '2-8°C (refrigerated)',
    processTime: 'Reagent for 100 tests'
  },
  'Glucose Test Strips': {
    specimenType: 'Test Strips for Blood samples',
    testType: 'Blood Glucose Test Strips',
    storageTemperature: 'Room temperature (dry place)',
    processTime: 'Strips for glucose testing'
  },
  'Blood Group Test (100 tests)': {
    specimenType: 'Whole Blood',
    testType: 'Blood Group/Typing Test Kit',
    storageTemperature: '2-8°C (refrigerated)',
    processTime: 'Test kit for 100 blood group tests'
  },
  'Widal O & H Test (100 tests)': {
    specimenType: 'Serum',
    testType: 'Typhoid Fever Serology Test Kit',
    storageTemperature: '2-8°C (refrigerated)',
    processTime: 'Test kit for 100 Widal tests (O & H antigens)'
  },
  'Weil-Felix Test (100 tests)': {
    specimenType: 'Serum',
    testType: 'Rickettsial Infection Screening Test Kit',
    storageTemperature: '2-8°C (refrigerated)',
    processTime: 'Test kit for 100 Weil-Felix tests'
  }
};

// Category-level defaults for lab categories
const LAB_CATEGORY_DEFAULTS: Record<string, {
  specimenType: string;
  testType: string;
  storageTemperature?: string;
  processTime?: string;
}> = {
  chemistry: {
    specimenType: 'Serum/Plasma',
    testType: 'General Chemistry',
    storageTemperature: '2–8°C (short-term), -20°C (long-term)',
    processTime: '1–2 hours'
  },
  hematology: {
    specimenType: 'Whole Blood (EDTA)',
    testType: 'Hematology Panel',
    storageTemperature: '2–8°C (≤24 hrs)',
    processTime: '≈1 hour'
  },
  parasitology: {
    specimenType: 'Stool',
    testType: 'Microscopy/Parasitology',
    storageTemperature: 'Room temp; examine ASAP',
    processTime: '1–2 hours'
  },
  immunology: {
    specimenType: 'Serum',
    testType: 'Immunoassay',
    storageTemperature: '2–8°C (short-term), -20°C (long-term)',
    processTime: '2–4 hours'
  },
  urinalysis: {
    specimenType: 'Urine',
    testType: 'Urinalysis',
    storageTemperature: 'Room temp ≤2 hrs or 2–8°C',
    processTime: '≤1 hour'
  },
  endocrinology: {
    specimenType: 'Serum',
    testType: 'Hormone Assay',
    storageTemperature: '2–8°C (short-term), -20°C (long-term)',
    processTime: '2–4 hours'
  },
  cardiology: {
    specimenType: 'Serum/Plasma',
    testType: 'Cardiac Markers',
    storageTemperature: '2–8°C',
    processTime: '1–2 hours'
  },
  'tumor-markers': {
    specimenType: 'Serum',
    testType: 'Tumor Marker',
    storageTemperature: '2–8°C (short-term), -20°C (long-term)',
    processTime: '2–4 hours'
  },
  other: {
    specimenType: 'Varies',
    testType: 'Lab Test',
    storageTemperature: 'As per test',
    processTime: 'Varies'
  }
};

// Define presets for common medications with route-specific dosages
// Best Practice: Aim for clarity, common use-cases, and always allow for "Other"/custom input.
// Generic names are preferred. Dosages should include units. Prescription status is a general guideline.
const MEDICATION_PRESETS = {
  'Paracetamol': { // Acetaminophen
    activeIngredient: 'Paracetamol',
    prescriptionRequired: false,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '500mg',
        allowedDosages: ['250mg', '325mg', '500mg', '650mg', '1g', 'Other'],
      },
      'IV': {
        defaultDosage: '1g',
        allowedDosages: ['500mg', '1g', '15mg/kg', 'Other'], // Added weight-based common option
      },
      'Rectal': {
        defaultDosage: '325mg',
        allowedDosages: ['80mg', '120mg', '125mg', '325mg', '650mg', 'Other'] // Expanded pediatric/adult options
      }
    }
  },
  'Ibuprofen': {
    activeIngredient: 'Ibuprofen',
    prescriptionRequired: false,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '200mg',
        allowedDosages: ['100mg/5ml (Suspension)', '200mg', '400mg', '600mg', '800mg', 'Other'], // Added suspension, higher dose
      },
      'IV': {
        defaultDosage: '400mg',
        allowedDosages: ['400mg', '800mg', 'Other'] // Common IV doses
      },
      'Topical': {
        defaultDosage: '5% Gel',
        allowedDosages: ['5% Gel', '10% Gel', 'Other']
      }
    }
  },
  'Normal Saline (0.9% NaCl)': {
    activeIngredient: 'Sodium Chloride 0.9%',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '500ml',
        allowedDosages: ['50ml', '100ml', '250ml', '500ml', '1000ml', '2000ml', 'Other']
      }
    }
  },
  'Ringer Lactate (Hartmann Solution)': {
    activeIngredient: 'Lactated Ringer\'s Solution',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '500ml',
        allowedDosages: ['100ml', '250ml', '500ml', '1000ml', '2000ml', 'Other']
      }
    }
  },
  'Dextrose 5% (D5W)': {
    activeIngredient: 'Dextrose 5% in Water',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '500ml',
        allowedDosages: ['100ml', '250ml', '500ml', '1000ml', '2000ml', 'Other']
      }
    }
  },
  'Amoxicillin': {
    activeIngredient: 'Amoxicillin Trihydrate',
    prescriptionRequired: true,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '250mg',
        allowedDosages: ['125mg/5ml (Suspension)', '250mg/5ml (Suspension)', '250mg', '500mg', '875mg', 'Other'], // Added more suspension options
      }
      // IV/IM Amoxicillin is less common for general clinic stock, often Amoxicillin/Clavulanate is used IV/IM.
    }
  },
  'Amoxicillin/Clavulanate': { // Common combination
    activeIngredient: 'Amoxicillin Trihydrate / Potassium Clavulanate',
    prescriptionRequired: true,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '500mg/125mg',
        allowedDosages: ['250mg/62.5mg (Suspension)', '500mg/125mg', '875mg/125mg', 'Other'],
      },
      'IV': {
        defaultDosage: '1g/200mg',
        allowedDosages: ['500mg/100mg', '1g/200mg', 'Other'],
      }
    }
  },
  'Diclofenac': {
    activeIngredient: 'Diclofenac Sodium/Potassium',
    prescriptionRequired: true,
    defaultAdminRoute: 'IM',
    routes: {
      'IM': {
        defaultDosage: '75mg/3ml', // Clarified volume
        allowedDosages: ['75mg/3ml', '75mg/2ml', '50mg/2ml', 'Other'],
      },
      'Oral': {
        defaultDosage: '50mg',
        allowedDosages: ['25mg', '50mg', '75mg SR', '100mg SR', 'Other'], // SR for Sustained Release
      },
      'Topical': { // Gel, Patch, Solution
        defaultDosage: '1% Gel',
        allowedDosages: ['1% Gel', '1.5% Solution', '2% Solution', '1.3% Patch', 'Other'],
      },
      'Rectal': { // Suppository
        defaultDosage: '100mg',
        allowedDosages: ['12.5mg', '25mg', '50mg', '100mg', 'Other'] // Added pediatric doses
      }
    }
  },
  'Gentamicin': {
    activeIngredient: 'Gentamicin Sulfate',
    prescriptionRequired: true,
    defaultAdminRoute: 'IM',
    routes: {
      'IM': {
        defaultDosage: '80mg/2ml',
        allowedDosages: ['40mg/1ml', '80mg/2ml', '160mg/2ml', 'Other']
      },
      'IV': {
        defaultDosage: '80mg',
        allowedDosages: ['40mg', '80mg', '120mg', '160mg', 'Other']
      }
    }
  },
  // ... (Review and refine ALL other existing presets similarly for consistency, clarity, common dosages, and units)
  // Example for Epinephrine - ensure clarity of concentrations
  'Epinephrine (Adrenaline)': {
    activeIngredient: 'Epinephrine',
    prescriptionRequired: true,
    defaultAdminRoute: 'IM',
    routes: {
      'IM': { // Anaphylaxis
        defaultDosage: '0.3mg (1:1000)',
        allowedDosages: ['0.15mg (1:1000 Child)', '0.3mg (1:1000 Adult)', '0.5mg (1:1000 Adult)', 'Other'],
      },
      'IV': { // Cardiac arrest, severe hypotension
        defaultDosage: '1mg (1:10,000 for CA bolus)',
        // Note: IV infusions are highly specialized and dosed mcg/kg/min or similar, often from a more concentrated solution further diluted.
        allowedDosages: ['0.1-1mcg/kg/min (Infusion)', '1mg (1:10,000 Bolus CA)', 'Other (Specify concentration & rate)'],
      },
      'Subcutaneous': { // Slower absorption than IM for anaphylaxis
        defaultDosage: '0.3mg (1:1000)',
        allowedDosages: ['0.15mg (1:1000)', '0.3mg (1:1000)', '0.5mg (1:1000)', 'Other'],
      },
      'Inhalation': { // For croup or severe asthma, nebulized
        defaultDosage: '0.5ml of 1mg/ml (1:1000 solution)',
        allowedDosages: ['0.25ml of 1mg/ml (1:1000)', '0.5ml of 1mg/ml (1:1000)', '2.25% Racemic Solution', 'Other']
      }
    }
  },
  // ... Ensure Salbutamol specifies MDI vs Nebule clearly ...
  'Salbutamol': { // Albuterol
    activeIngredient: 'Salbutamol Sulfate',
    prescriptionRequired: true,
    defaultAdminRoute: 'Inhalation',
    routes: {
      'Inhalation': {
        defaultDosage: '100mcg/puff (MDI)',
        allowedDosages: ['100mcg/puff (MDI)', '200mcg/puff (MDI)', '2.5mg/2.5ml (Nebule)', '5mg/2.5ml (Nebule)', 'Other'],
      },
      'Oral': { // Syrup or Tablets
        defaultDosage: '2mg',
        allowedDosages: ['2mg (Tablet)', '4mg (Tablet)', '2mg/5ml (Syrup)', 'Other'],
      }
    }
  },

  // Add a few more highly common drugs with good detail
  'Metronidazole': {
    activeIngredient: 'Metronidazole',
    prescriptionRequired: true,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '400mg',
        allowedDosages: ['200mg', '250mg', '400mg', '500mg', 'Other'],
      },
      'IV': {
        defaultDosage: '500mg',
        allowedDosages: ['500mg (in 100ml over 20-60 min)', 'Other'],
      },
      'Rectal': {
        defaultDosage: '1g',
        allowedDosages: ['500mg', '1g', 'Other'],
      },
      'Topical': {
        defaultDosage: '0.75% Gel/Cream',
        allowedDosages: ['0.75% Gel/Cream/Lotion', '1% Gel/Cream', 'Other'],
      }
    }
  },
  'Doxycycline': {
    activeIngredient: 'Doxycycline Hyclate',
    prescriptionRequired: true,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '100mg',
        allowedDosages: ['50mg', '100mg', 'Other']
      }
    }
  },
  'Prednisolone': {
    activeIngredient: 'Prednisolone',
    prescriptionRequired: true,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '5mg',
        allowedDosages: ['1mg', '2.5mg', '5mg', '10mg', '20mg', '25mg', 'Other (Dose varies widely by indication)'],
      },
      // IV/IM often uses Methylprednisolone or Hydrocortisone instead of Prednisolone directly
      'Rectal': { // Enema or foam for IBD
        defaultDosage: '20mg (Enema)',
        allowedDosages: ['5mg (Suppository)', '20mg (Enema)', 'Other'],
      }
    }
  },
  'Lorazepam': {
    activeIngredient: 'Lorazepam',
    prescriptionRequired: true, // Controlled drug
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '1mg',
        allowedDosages: ['0.5mg', '1mg', '2mg', '2.5mg', 'Other'],
      },
      'IV': { // Status epilepticus, sedation
        defaultDosage: '2mg (slow)',
        allowedDosages: ['0.05mg/kg', '1mg', '2mg', '4mg (max)', 'Other'],
      },
      'IM': {
        defaultDosage: '2mg',
        allowedDosages: ['0.05mg/kg', '1mg', '2mg', '4mg (max)', 'Other'],
      },
      'Sublingual': {
        defaultDosage: '1mg',
        allowedDosages: ['0.5mg', '1mg', '2mg', 'Other'],
      }
    }
  },
  'Ceftriaxone': {
    activeIngredient: 'Ceftriaxone',
    prescriptionRequired: true,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '1g',
        allowedDosages: ['500mg', '1g', '2g', '50-100mg/kg/day', 'Other'],
      },
      'IM': {
        defaultDosage: '1g',
        allowedDosages: ['250mg', '500mg', '1g', 'Other'],
      }
    }
  },
  'Cimetidine': {
    activeIngredient: 'Cimetidine',
    prescriptionRequired: false,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '400mg',
        allowedDosages: ['200mg', '300mg', '400mg', '800mg', 'Other'],
      },
      'IV': {
        defaultDosage: '300mg',
        allowedDosages: ['300mg', '600mg', 'Other'],
      }
    }
  },
  'Metoclopramide': {
    activeIngredient: 'Metoclopramide', // Plasil brand name
    prescriptionRequired: true,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '10mg',
        allowedDosages: ['5mg', '10mg', '15mg', 'Other'],
      },
      'IV': {
        defaultDosage: '10mg',
        allowedDosages: ['10mg', '20mg', '0.1-0.2mg/kg', 'Other'],
      },
      'IM': {
        defaultDosage: '10mg',
        allowedDosages: ['10mg', '20mg', 'Other'],
      }
    }
  },
  'Normal Saline': {
    activeIngredient: 'Sodium Chloride 0.9%',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '1000ml',
        allowedDosages: ['100ml', '250ml', '500ml', '1000ml', 'Other'],
      },
      'Topical': {
        defaultDosage: '100ml',
        allowedDosages: ['100ml', '250ml', '500ml', 'Other'],
      }
    }
  },
  'Hydrocortisone': {
    activeIngredient: 'Hydrocortisone',
    prescriptionRequired: true,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '20mg',
        allowedDosages: ['5mg', '10mg', '20mg', '50mg', 'Other'],
      },
      'IV': {
        defaultDosage: '100mg',
        allowedDosages: ['25mg', '50mg', '100mg', '200mg', '500mg', 'Other'],
      },
      'Topical': {
        defaultDosage: '1% Cream',
        allowedDosages: ['0.5% Cream', '1% Cream', '2.5% Cream', 'Other'],
      }
    }
  },
  'Dextrose 40%': {
    activeIngredient: 'Dextrose 40%',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '50ml',
        allowedDosages: ['20ml', '50ml', '100ml', '250ml', '500ml', 'Other'],
      }
    }
  },
  'Dextrose 5%': {
    activeIngredient: 'Dextrose 5%',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '1000ml',
        allowedDosages: ['100ml', '250ml', '500ml', '1000ml', 'Other'],
      }
    }
  },
  'Dextrose 50%': {
    activeIngredient: 'Dextrose 50%',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '50ml',
        allowedDosages: ['10ml', '20ml', '50ml', '100ml', 'Other'],
      }
    }
  },
  'Vitamin B Complex': {
    activeIngredient: 'B-Complex Vitamins',
    prescriptionRequired: false,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '1 tablet',
        allowedDosages: ['1 tablet', '2 tablets', '1 capsule', '2 capsules', 'Other'],
      },
      'IV': {
        defaultDosage: '2ml',
        allowedDosages: ['1ml', '2ml', '5ml', '10ml', 'Other'],
      },
      'IM': {
        defaultDosage: '2ml',
        allowedDosages: ['1ml', '2ml', '5ml', 'Other'],
      }
    }
  },
  'Ringer Lactate': {
    activeIngredient: 'Ringer Lactate Solution',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '1000ml',
        allowedDosages: ['100ml', '250ml', '500ml', '1000ml', 'Other'],
      }
    }
  },
  'Hartmann Solution': {
    activeIngredient: 'Hartmann Solution',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '1000ml',
        allowedDosages: ['100ml', '250ml', '500ml', '1000ml', 'Other'],
      }
    }
  },
  'Vitamin C': {
    activeIngredient: 'Ascorbic Acid',
    prescriptionRequired: false,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '500mg',
        allowedDosages: ['100mg', '250mg', '500mg', '1000mg', 'Other'],
      },
      'IV': {
        defaultDosage: '500mg',
        allowedDosages: ['250mg', '500mg', '1000mg', 'Other'],
      }
    }
  },
  'Vitamin D3': {
    activeIngredient: 'Cholecalciferol',
    prescriptionRequired: false,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '1000 IU',
        allowedDosages: ['400 IU', '800 IU', '1000 IU', '2000 IU', '5000 IU', '10000 IU', 'Other'],
      }
    }
  },
  'Iron Sulfate': {
    activeIngredient: 'Ferrous Sulfate',
    prescriptionRequired: false,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '325mg',
        allowedDosages: ['200mg', '325mg', '65mg elemental iron', '130mg elemental iron', 'Other'],
      }
    }
  },
  'Folic Acid': {
    activeIngredient: 'Folic Acid',
    prescriptionRequired: false,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '5mg',
        allowedDosages: ['400mcg', '800mcg', '1mg', '5mg', '15mg', 'Other'],
      }
    }
  },
  'Calcium Gluconate': {
    activeIngredient: 'Calcium Gluconate',
    prescriptionRequired: false,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '10ml (10%)',
        allowedDosages: ['10ml (10%)', '20ml (10%)', '100ml (10%)', 'Other'],
      },
      'Oral': {
        defaultDosage: '500mg',
        allowedDosages: ['250mg', '500mg', '1000mg', 'Other'],
      }
    }
  },
  'Magnesium Sulfate': {
    activeIngredient: 'Magnesium Sulfate',
    prescriptionRequired: true,
    defaultAdminRoute: 'IV',
    routes: {
      'IV': {
        defaultDosage: '2g in 50ml',
        allowedDosages: ['1g in 50ml', '2g in 50ml', '4g in 100ml', '8g in 500ml', 'Other'],
      },
      'IM': {
        defaultDosage: '5ml (50%)',
        allowedDosages: ['5ml (50%)', '10ml (50%)', 'Other'],
      }
    }
  },
  'Aspirin': {
    activeIngredient: 'Acetylsalicylic Acid',
    prescriptionRequired: false,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '75mg',
        allowedDosages: ['75mg', '100mg', '300mg', '500mg', '325mg', 'Other'],
      }
    }
  },
  'Dexamethasone': {
    activeIngredient: 'Dexamethasone',
    prescriptionRequired: true,
    defaultAdminRoute: 'Oral',
    routes: {
      'Oral': {
        defaultDosage: '4mg',
        allowedDosages: ['0.5mg', '1mg', '2mg', '4mg', '8mg', '16mg', 'Other'],
      },
      'IV': {
        defaultDosage: '4mg',
        allowedDosages: ['2mg', '4mg', '8mg', '16mg', '20mg', 'Other'],
      },
      'IM': {
        defaultDosage: '4mg',
        allowedDosages: ['2mg', '4mg', '8mg', '16mg', 'Other'],
      },
      'Topical': {
        defaultDosage: '0.1% Cream',
        allowedDosages: ['0.05% Cream', '0.1% Cream', '0.25% Cream', 'Other'],
      }
    }
  }
  // Continue reviewing and refining other presets for clarity, common dosages, units and ensuring 'Other' is available.
};

const NewInventoryItemForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingItem, setFetchingItem] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const [formData, setFormData] = useState<InventoryItem>({
    name: '',
    description: '',
    category: '',
    itemType: 'other', // Default to other to avoid strict validation
    quantity: 0,
    unitPrice: 0,
    costPrice: 0,
    reorderLevel: 0,
    barcode: '',
    location: '',
    notes: '',
    dosage: '',
    dosageCustom: '',
    administrationRoute: '',
    adminRouteCustom: '',
    activeIngredient: '',
    prescriptionRequired: false,
    storageTemperature: '',
    specimenType: '',
    testType: '',
    processTime: '',
    manufacturer: '',
    batchNumber: '',
    supplier: '',
    purchaseDate: '',
    expiryDate: '',
    expiryReminder: '',
    minOrderQuantity: '',
    attachments: [],
    customTags: '',
    // Service-specific fields
    serviceDuration: '',
    serviceRequirements: '',
    serviceEquipment: '',
    serviceStaffRequired: '',
    servicePreparation: '',
    serviceFollowUp: '',
    serviceContraindications: '',
    serviceIndications: '',
    // Additional lab-specific fields
    serviceStorageTemperature: '',
    serviceSpecimenType: '',
    serviceTestType: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof InventoryItem, string>>>({});
  const [currentDosageOptions, setCurrentDosageOptions] = useState<string[]>(DOSAGES);
  const [currentAdminRouteOptions, setCurrentAdminRouteOptions] = useState<string[]>(ADMIN_ROUTES);

  // Effect to update item details when formData.name changes (for all item types)
  useEffect(() => {
    const selectedItemName = formData.name;
    const itemType = formData.itemType;

    // Handle medications
    if (itemType === 'medication') {
      const preset = MEDICATION_PRESETS[selectedItemName as keyof typeof MEDICATION_PRESETS];

      if (preset) {
        const adminRoutesForMed = preset.routes ? Object.keys(preset.routes) : [];
        const availableAdminRoutes = adminRoutesForMed.length > 0 ? [...adminRoutesForMed, 'Other'] : ADMIN_ROUTES;
        setCurrentAdminRouteOptions(availableAdminRoutes);

        const routeToUse = preset.defaultAdminRoute && preset.routes[preset.defaultAdminRoute]
          ? preset.defaultAdminRoute
          : adminRoutesForMed.length > 0
            ? adminRoutesForMed[0] // Fallback to the first defined route if default is not valid
            : 'Other';

        let newDosage = '';
        let newDosageOptions = DOSAGES;

        if (preset.routes && preset.routes[routeToUse]) {
          const routeDetails = preset.routes[routeToUse];
          newDosage = routeDetails.defaultDosage || '';
          newDosageOptions = routeDetails.allowedDosages ? [...routeDetails.allowedDosages, 'Other'].filter((v, i, a) => a.indexOf(v) === i) : DOSAGES;
        }

        // Auto-fill category from medication mapping
        const autoCategory = MEDICATION_TO_CATEGORY[selectedItemName] || '';

        setFormData(prevData => ({
          ...prevData,
          category: autoCategory, // Auto-fill category
          activeIngredient: preset.activeIngredient || '',
          prescriptionRequired: preset.prescriptionRequired !== undefined ? preset.prescriptionRequired : false,
          administrationRoute: routeToUse, // Set the admin route
          dosage: newDosage, // Set dosage based on the (default) admin route
        }));
        setCurrentDosageOptions(newDosageOptions);

      } else {
        // No preset for the selected medication, or "Other" medication
        // Auto-fill category even if no preset exists
        const autoCategory = MEDICATION_TO_CATEGORY[selectedItemName] || formData.category;
        
        // Try category-level defaults to auto-fill sensible values
        const catDefaults = MED_CATEGORY_DEFAULTS[autoCategory as keyof typeof MED_CATEGORY_DEFAULTS];
        if (catDefaults) {
          setCurrentAdminRouteOptions([catDefaults.defaultAdminRoute, ...ADMIN_ROUTES.filter(r => r !== catDefaults.defaultAdminRoute)]);
          setCurrentDosageOptions([...catDefaults.allowedDosages]);
          setFormData(prevData => ({
            ...prevData,
            category: autoCategory, // Auto-fill category
            activeIngredient: prevData.activeIngredient || '',
            administrationRoute: catDefaults.defaultAdminRoute,
            dosage: catDefaults.allowedDosages[0] || prevData.dosage,
            prescriptionRequired: prevData.prescriptionRequired ?? catDefaults.prescriptionRequired,
          }));
        } else {
          setCurrentAdminRouteOptions(ADMIN_ROUTES);
          setCurrentDosageOptions(DOSAGES);
          // Optionally clear/reset other fields
          setFormData(prevData => ({
            ...prevData,
            category: autoCategory, // Auto-fill category
            activeIngredient: prevData.activeIngredient || '',
          }));
        }
      }
    }

    // Handle lab items
    else if (itemType === 'lab') {
      const autoCategory = LAB_ITEM_TO_CATEGORY[selectedItemName] || formData.category;
      setFormData(prevData => ({
        ...prevData,
        category: autoCategory, // Auto-fill category
      }));
    }

    // Handle equipment items
    else if (itemType === 'equipment') {
      const autoCategory = EQUIPMENT_TO_CATEGORY[selectedItemName] || formData.category;
      setFormData(prevData => ({
        ...prevData,
        category: autoCategory, // Auto-fill category
      }));
    }

    // Handle supplies items
    else if (itemType === 'supplies') {
      const autoCategory = SUPPLIES_TO_CATEGORY[selectedItemName] || formData.category;
      setFormData(prevData => ({
        ...prevData,
        category: autoCategory, // Auto-fill category
      }));
    }

    // Handle service items
    else if (itemType === 'service') {
      const autoCategory = SERVICE_TO_CATEGORY[selectedItemName] || formData.category;
      setFormData(prevData => ({
        ...prevData,
        category: autoCategory, // Auto-fill category
      }));
    }
  }, [formData.name, formData.itemType]);

  // Effect to update dosage options when formData.administrationRoute changes
  useEffect(() => {
    const selectedMedicationName = formData.name;
    const selectedAdminRoute = formData.administrationRoute;
    const preset = MEDICATION_PRESETS[selectedMedicationName as keyof typeof MEDICATION_PRESETS];

    if (preset && selectedAdminRoute && preset.routes && preset.routes[selectedAdminRoute]) {
      const routeDetails = preset.routes[selectedAdminRoute];
      const newDosageOptions = routeDetails.allowedDosages ? [...routeDetails.allowedDosages, 'Other'].filter((v, i, a) => a.indexOf(v) === i) : DOSAGES;
      setCurrentDosageOptions(newDosageOptions);

      // Update formData.dosage to the default for the new route,
      // only if the current dosage is not in the new options or if it's 'Other' from a previous selection.
      // Or, more simply, always set to default when route changes for consistency.
      const newDefaultDosage = routeDetails.defaultDosage || '';
      if (formData.dosage !== newDefaultDosage) { // Avoid unnecessary updates if already correct
         setFormData(prevData => ({
           ...prevData,
           dosage: newDefaultDosage,
         }));
      }

    } else if (preset && selectedAdminRoute === 'Other') {
        // If admin route is "Other", allow all global dosages
        setCurrentDosageOptions(DOSAGES);
        // setFormData(prevData => ({ ...prevData, dosage: '' })); // Optionally clear dosage
    } else if (!preset) {
        // If no medication preset is active, ensure global dosages are available
        setCurrentDosageOptions(DOSAGES);
    }
    // Note: Dependency array includes formData.name because presets are medication-specific
  }, [formData.name, formData.administrationRoute]);

  // Auto-fill lab item details when selecting common lab tests
  useEffect(() => {
    if (formData.itemType !== 'lab') return;
    
    const selectedLabName = formData.name;
    const labDetails = LAB_ITEM_DETAILS[selectedLabName];
    
    console.log('🔍 Auto-fill lab item details:', {
      labName: selectedLabName,
      hasDetails: !!labDetails,
      details: labDetails
    });
    
    if (labDetails) {
      setFormData(prev => ({
        ...prev,
        specimenType: labDetails.specimenType,
        testType: labDetails.testType,
        storageTemperature: labDetails.storageTemperature,
        processTime: labDetails.processTime,
      }));
    } else {
      // Fallback to category defaults if no specific test preset
      const catDefaults = LAB_CATEGORY_DEFAULTS[formData.category as keyof typeof LAB_CATEGORY_DEFAULTS];
      const isOtherName = (formData.name || '').toLowerCase() === 'other';
      if (isOtherName) {
        // When "Other" is selected, clear fields to let the user specify custom details
        setFormData(prev => ({
          ...prev,
          specimenType: '',
          testType: '',
          storageTemperature: '',
          processTime: '',
        }));
      } else if (catDefaults) {
        setFormData(prev => ({
          ...prev,
          specimenType: catDefaults.specimenType,
          testType: catDefaults.testType,
          storageTemperature: catDefaults.storageTemperature || '',
          processTime: catDefaults.processTime || '',
        }));
      }
    }
  }, [formData.itemType, formData.name]);

  // Auto-fill service details when selecting service names
  useEffect(() => {
    if (formData.itemType !== 'service') return;
    
    const selectedServiceName = formData.name;
    const serviceDetails = SERVICE_DETAILS[selectedServiceName];
    
    console.log('🔍 Auto-fill service details:', {
      serviceName: selectedServiceName,
      hasDetails: !!serviceDetails,
      details: serviceDetails
    });
    
    if (serviceDetails) {
      setFormData(prev => ({
        ...prev,
        // Lab Item Details
        serviceStorageTemperature: serviceDetails.serviceStorageTemperature,
        serviceSpecimenType: serviceDetails.serviceSpecimenType,
        serviceTestType: serviceDetails.serviceTestType,
        // Service Details
        serviceDuration: serviceDetails.serviceDuration,
        serviceRequirements: serviceDetails.serviceRequirements,
        serviceEquipment: serviceDetails.serviceEquipment,
        serviceStaffRequired: serviceDetails.serviceStaffRequired,
        servicePreparation: serviceDetails.servicePreparation,
        serviceFollowUp: serviceDetails.serviceFollowUp,
        serviceIndications: serviceDetails.serviceIndications,
        serviceContraindications: serviceDetails.serviceContraindications,
      }));
    } else {
      // Clear all fields if no mapping found
      setFormData(prev => ({
        ...prev,
        serviceStorageTemperature: '',
        serviceSpecimenType: '',
        serviceTestType: '',
        serviceDuration: '',
        serviceRequirements: '',
        serviceEquipment: '',
        serviceStaffRequired: '',
        servicePreparation: '',
        serviceFollowUp: '',
        serviceIndications: '',
        serviceContraindications: '',
      }));
    }
  }, [formData.itemType, formData.name]);

  // Fetch item data when in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchItem = async () => {
        setFetchingItem(true);
        try {
          const item = await inventoryService.getInventoryItemById(id);
          // Convert backend data format to form format
          setFormData({
            name: item.name || '',
            description: item.description || '',
            // Map backend category to frontend itemType
            itemType: item.category === 'medication' 
              ? 'medication' 
              : item.category === 'laboratory' 
                ? 'lab' 
                : item.category === 'equipment' 
                  ? 'equipment' 
                  : item.category === 'supplies' 
                    ? 'supplies' 
                    : 'other',
            category: item.category || '',
            quantity: item.quantity || 0,
            unitPrice: item.sellingPrice || item.costPrice || 0,
            costPrice: item.costPrice || 0,
            reorderLevel: item.minimumStockLevel || 0,
            barcode: item.itemCode || '',
            location: item.location || '',
            expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
            notes: item.notes || '',
            dosage: item.dosage || '',
            dosageCustom: item.dosageCustom || '',
            administrationRoute: item.administrationRoute || '',
            adminRouteCustom: item.adminRouteCustom || '',
            activeIngredient: item.activeIngredient || '',
            prescriptionRequired: item.prescriptionRequired || false,
            storageTemperature: item.storageTemperature || '',
            specimenType: item.specimenType || '',
            testType: item.testType || '',
            processTime: item.processTime || '',
            manufacturer: item.manufacturer || '',
            batchNumber: item.batchNumber || '',
            supplier: typeof item.supplier === 'string' ? item.supplier : (item.supplier?.name || ''),
            purchaseDate: item.purchaseDate || '',
            expiryReminder: item.expiryReminder || '',
            minOrderQuantity: item.minOrderQuantity || '',
            attachments: item.attachments || [],
            customTags: item.customTags || '',
            // Service-specific fields
            serviceDuration: (item as any).serviceDuration || '',
            serviceRequirements: (item as any).serviceRequirements || '',
            serviceEquipment: (item as any).serviceEquipment || '',
            serviceStaffRequired: (item as any).serviceStaffRequired || '',
            servicePreparation: (item as any).servicePreparation || '',
            serviceFollowUp: (item as any).serviceFollowUp || '',
            serviceContraindications: (item as any).serviceContraindications || '',
            serviceIndications: (item as any).serviceIndications || '',
            // Additional lab-specific fields
            serviceStorageTemperature: (item as any).serviceStorageTemperature || '',
            serviceSpecimenType: (item as any).serviceSpecimenType || '',
            serviceTestType: (item as any).serviceTestType || '',
          });
        } catch (err) {
          console.error('Error fetching inventory item:', err);
          if (err instanceof Error) {
            setError(`Failed to load item: ${err.message}`);
          } else {
            setError('Failed to load item data');
          }
          
          // If item doesn't exist or can't be fetched, show error but don't redirect
          setSnackbar({
            open: true,
            message: 'Item not found or could not be loaded',
            severity: 'error'
          });
        } finally {
          setFetchingItem(false);
        }
      };
      
      fetchItem();
    }
  }, [id, isEditMode]);

  // Validate form
  const validateForm = () => {
    const newErrors: Partial<Record<keyof InventoryItem, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // For service-like items, ensure proper category mapping
    if ((formData.itemType === 'service' || formData.itemType === 'imaging') && !formData.category.trim()) {
      newErrors.category = 'Category is required for service items';
    }

    // Generate an itemCode (barcode) if not provided
    if (!formData.barcode) {
      // This is not an error, just set a default in handleSubmit
      console.log('No barcode provided, will generate one automatically');
    }

    // Only validate stock fields for non-service items or lab services
    const isLabService = formData.itemType === 'service' && LAB_SERVICE_CATEGORIES.includes(formData.category);
    if (formData.itemType !== 'service' || isLabService || formData.itemType === 'imaging') {
      if (formData.quantity < 0) {
        newErrors.quantity = 'Quantity cannot be negative';
      }

      if (formData.costPrice < 0) {
        newErrors.costPrice = 'Cost price cannot be negative';
      } else if (formData.unitPrice > 0 && formData.costPrice > 0 && formData.costPrice > formData.unitPrice) {
        newErrors.costPrice = 'Cost price cannot exceed selling price';
      }

      if (formData.reorderLevel < 0) {
        newErrors.reorderLevel = 'Reorder level cannot be negative';
      }
    }

    if (formData.unitPrice < 0) {
      newErrors.unitPrice = 'Price cannot be negative';
    }

    // Validate medication-specific fields (only if user has entered medication data)
    if (formData.itemType === 'medication' && formData.name.trim()) {
      // Only require medication fields if the user has started entering medication data
      if (formData.dosage && formData.dosage.trim() === '') {
        newErrors.dosage = 'Dosage cannot be empty if specified';
      }
      if (formData.administrationRoute && formData.administrationRoute.trim() === '') {
        newErrors.administrationRoute = 'Administration route cannot be empty if specified';
      }
      if (formData.activeIngredient && formData.activeIngredient.trim() === '') {
        newErrors.activeIngredient = 'Active ingredient cannot be empty if specified';
      }
    }

    // Validate lab-specific fields (only if user has entered lab data)
    if (formData.itemType === 'lab' && formData.name.trim()) {
      // Only require lab fields if the user has started entering lab data
      if (formData.specimenType && formData.specimenType.trim() === '') {
        newErrors.specimenType = 'Specimen type cannot be empty if specified';
      }
      if (formData.testType && formData.testType.trim() === '') {
        newErrors.testType = 'Test type cannot be empty if specified';
      }
    }

    setErrors(newErrors);
    console.log('Validation errors:', newErrors);
    console.log('Form data:', formData);
    return Object.keys(newErrors).length === 0;
  };

  // Handle deleting lab items from the dropdown
  const handleDeleteLabItem = async (itemName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent dropdown from closing
    
    if (window.confirm(`Are you sure you want to delete "${itemName}" from the lab items list?`)) {
      try {
        console.log(`🗑️ Attempting to delete lab item: ${itemName}`);
        
        // Use the inventory service to delete the item
        const response = await inventoryService.deleteInventoryItemByName(itemName);

        if (response.success) {
          console.log(`✅ Successfully deleted: ${response.message}`);
          
          setSnackbar({ 
            open: true, 
            message: `"${itemName}" deleted successfully from inventory`, 
            severity: 'success' 
          });
          
          // Refresh the form or remove from current list
          // You could also trigger a refresh of the dropdown options here
        } else {
          throw new Error(response.message || 'Failed to delete item');
        }
      } catch (error) {
        console.error('Error deleting lab item:', error);
        setSnackbar({ 
          open: true, 
          message: `Failed to delete "${itemName}". ${error instanceof Error ? error.message : 'Please try again.'}`, 
          severity: 'error' 
        });
      }
    }
  };

  // Modified handleSubmit to handle both create and update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with data:", formData);

    if (!validateForm()) {
      setSnackbar({ open: true, message: 'Please fix the errors in the form', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const isServiceItem = formData.itemType === 'service';
      const isImagingItem = formData.itemType === 'imaging';
      const isServiceLike = isServiceItem || isImagingItem;
      const isLabService = isServiceItem && LAB_SERVICE_CATEGORIES.includes(formData.category);
      const usesVirtualStock = isServiceLike && !isLabService;
      
      // Map frontend form fields to backend field names
      const backendData = {
        itemCode: formData.barcode || `${formData.itemType.substring(0, 3).toUpperCase()}-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        // Map frontend category to backend category
        category: formData.itemType === 'medication' 
          ? 'medication' 
          : formData.itemType === 'lab' 
            ? 'laboratory' 
            : formData.itemType === 'equipment' 
              ? 'equipment' 
              : formData.itemType === 'supplies' 
                ? 'supplies' 
                : formData.itemType === 'imaging'
                  ? 'imaging'
                  : formData.itemType === 'service'
                    ? 'service'
                    : 'other',
        unit: formData.itemType === 'medication' ? 'units' : (isServiceLike ? 'service' : 'pieces'),
        quantity: usesVirtualStock ? 1 : formData.quantity,
        minimumStockLevel: usesVirtualStock ? 0 : formData.reorderLevel,
        reorderPoint: usesVirtualStock ? 0 : formData.reorderLevel * 2,
        costPrice: formData.costPrice,
        sellingPrice: formData.unitPrice,
        location: formData.location,
        expiryDate: formData.expiryDate,
        // Include medication-specific fields if applicable
        ...(formData.itemType === 'medication' && {
          dosage: formData.dosage,
          administrationRoute: formData.administrationRoute,
          activeIngredient: formData.activeIngredient,
          prescriptionRequired: formData.prescriptionRequired
        }),
        // Include lab-specific fields if applicable
        ...((formData.itemType === 'lab' || isLabService) && {
          storageTemperature: formData.storageTemperature,
          specimenType: formData.specimenType,
          testType: formData.testType
        }),
        notes: formData.notes,
        manufacturer: formData.manufacturer,
        batchNumber: formData.batchNumber,
        supplier: formData.supplier,
        purchaseDate: formData.purchaseDate,
        expiryReminder: formData.expiryReminder,
        minOrderQuantity: formData.minOrderQuantity,
        attachments: formData.attachments,
        customTags: formData.customTags,
        // Include service-specific fields if applicable
        ...(isServiceLike && {
          serviceDuration: formData.serviceDuration,
          serviceRequirements: formData.serviceRequirements,
          serviceEquipment: formData.serviceEquipment,
          serviceStaffRequired: formData.serviceStaffRequired,
          servicePreparation: formData.servicePreparation,
          serviceFollowUp: formData.serviceFollowUp,
          serviceContraindications: formData.serviceContraindications,
          serviceIndications: formData.serviceIndications,
        }),
      };

      let result;
      if (isEditMode && id) {
        // Update existing item
        result = await inventoryService.updateInventoryItem(id, backendData as any);
        setSnackbar({
          open: true,
          message: 'Inventory item updated successfully',
          severity: 'success'
        });
      } else {
        // Create new item
        result = await inventoryService.createInventoryItem(backendData);
        
        // If it's a service, also create it in the service management system
        if (isServiceLike) {
          try {
            const serviceData = {
              name: formData.name,
              code: backendData.itemCode,
              category: formData.category, // This should be the service category like 'consultation', 'procedure', etc.
              price: formData.unitPrice,
              unit: 'service',
              description: formData.description,
              isActive: true,
              fromInventory: true, // Flag to indicate this service is created from inventory form
              // Include service-specific fields
              serviceDuration: formData.serviceDuration,
              serviceRequirements: formData.serviceRequirements,
              serviceEquipment: formData.serviceEquipment,
              serviceStaffRequired: formData.serviceStaffRequired,
              servicePreparation: formData.servicePreparation,
              serviceFollowUp: formData.serviceFollowUp,
              serviceContraindications: formData.serviceContraindications,
              serviceIndications: formData.serviceIndications,
              // Additional lab-specific fields
              serviceStorageTemperature: formData.serviceStorageTemperature,
              serviceSpecimenType: formData.serviceSpecimenType,
              serviceTestType: formData.serviceTestType,
            };
            
            console.log('🔧 Creating service with data:', serviceData);
            console.log('🔧 Service category:', formData.category);
            console.log('🔧 Is lab service:', isLabService);
            
            const createdService = await serviceService.create({
              ...serviceData,
              category: serviceData.category as any
            });
            console.log('✅ Service also created in service management system:', createdService);
          } catch (serviceError) {
            console.error('❌ Failed to create service in service management:', serviceError);
            console.error('❌ Service error details:', {
              message: serviceError.message,
              response: serviceError.response?.data,
              status: serviceError.response?.status
            });
            // Don't fail the entire operation if service creation fails
            setSnackbar({
              open: true,
              message: `Inventory item created, but service creation failed: ${serviceError.response?.data?.message || serviceError.message}. Please check service management.`,
              severity: 'warning' as any
            });
          }
        }
        
        setSnackbar({
          open: true,
          message: isServiceLike 
            ? 'Service created successfully in both inventory and service management' 
            : 'Inventory item created successfully',
          severity: 'success'
        });
      }

      console.log(isEditMode ? "Item updated successfully:" : "Item created successfully:", result);

      // Short delay to show the success message before navigating
      setTimeout(() => {
        navigate('/inventory'); // Navigate to inventory dashboard
      }, 1500);
    } catch (err) {
      console.error(isEditMode ? 'Error updating inventory item:' : 'Error creating inventory item:', err);
      const errorMessage = (err instanceof Error ? err.message : String(err)) || 'An unknown error occurred';
      setError(`Failed to ${isEditMode ? 'update' : 'create'} inventory item: ${errorMessage}`);
      setSnackbar({
        open: true,
        message: `Failed to ${isEditMode ? 'update' : 'create'} inventory item: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

// Filter categories by itemType
const filteredCategories = ITEM_TYPE_CATEGORIES[formData.itemType] || CATEGORIES;

// Get appropriate options based on item type
const getItemNameOptions = () => {
  if (formData.itemType === 'medication') {
    return CATEGORY_MEDICATIONS[formData.category] || MEDICATIONS;
  } else if (formData.itemType === 'service') {
    // Service names based on category
    return SERVICE_NAMES[formData.category] || SERVICE_NAMES['other'];
  } else if (formData.itemType === 'imaging') {
    return SERVICE_NAMES[formData.category] || SERVICE_NAMES['imaging'];
  } else if (formData.itemType === 'lab') {
    return CATEGORY_MEDICATIONS[formData.category] || MEDICATIONS; // Reuse medication list for lab items
  } else if (formData.itemType === 'equipment') {
    return [
      'Stethoscope', 'Blood Pressure Monitor', 'Thermometer', 'Pulse Oximeter',
      'ECG Machine', 'X-ray Machine', 'Ultrasound Machine', 'Defibrillator',
      'Ventilator', 'Infusion Pump', 'Other'
    ];
  } else if (formData.itemType === 'supplies') {
    return [
      'Syringes', 'Needles', 'Gauze', 'Bandages', 'Gloves', 'Masks',
      'Test Tubes', 'Specimen Containers', 'Disinfectants', 'Other'
    ];
  } else {
    return ['Custom Item', 'Other'];
  }
};

const filteredMeds = getItemNameOptions();

const isServiceItem = formData.itemType === 'service';
const isImagingItem = formData.itemType === 'imaging';
const isServiceLike = isServiceItem || isImagingItem;
const isLabServiceCategory = isServiceItem && LAB_SERVICE_CATEGORIES.includes(formData.category);
const showStockSection = formData.itemType !== 'service' || isLabServiceCategory || isImagingItem;

  // When category changes under Medication, apply category-level defaults if no specific preset is active
  useEffect(() => {
    if (formData.itemType !== 'medication') return;
    const preset = MEDICATION_PRESETS[formData.name as keyof typeof MEDICATION_PRESETS];
    if (preset) return; // Specific med preset already handles details

    const catDefaults = MED_CATEGORY_DEFAULTS[formData.category as keyof typeof MED_CATEGORY_DEFAULTS];
    if (!catDefaults) return;
    setCurrentAdminRouteOptions([catDefaults.defaultAdminRoute, ...ADMIN_ROUTES.filter(r => r !== catDefaults.defaultAdminRoute)]);
    setCurrentDosageOptions([...catDefaults.allowedDosages]);
    setFormData(prev => ({
      ...prev,
      administrationRoute: catDefaults.defaultAdminRoute,
      dosage: catDefaults.allowedDosages[0] || prev.dosage,
      prescriptionRequired: prev.prescriptionRequired ?? catDefaults.prescriptionRequired,
    }));
  }, [formData.itemType, formData.category, formData.name]);

  // When category changes under Lab, apply category-level defaults if no specific test preset
  useEffect(() => {
    if (formData.itemType !== 'lab') return;
    const preset = LAB_TEST_PRESETS[formData.name as keyof typeof LAB_TEST_PRESETS];
    if (preset) return; // handled by other effect

    const catDefaults = LAB_CATEGORY_DEFAULTS[formData.category as keyof typeof LAB_CATEGORY_DEFAULTS];
    if (!catDefaults) return;
    const isOtherName = (formData.name || '').toLowerCase() === 'other';
    setFormData(prev => ({
      ...prev,
      specimenType: isOtherName ? '' : catDefaults.specimenType,
      testType: isOtherName ? '' : catDefaults.testType,
      storageTemperature: isOtherName ? '' : (catDefaults.storageTemperature || ''),
      processTime: isOtherName ? '' : (catDefaults.processTime || ''),
    }));
  }, [formData.itemType, formData.category, formData.name]);

  const itemTypeConfig: { value: ItemType; label: string; icon: string; color: string }[] = [
    { value: 'medication', label: 'Medication', icon: '💊', color: '#10b981' },
    { value: 'lab', label: 'Lab Item', icon: '🔬', color: '#8b5cf6' },
    { value: 'equipment', label: 'Equipment', icon: '🩺', color: '#3b82f6' },
    { value: 'supplies', label: 'Supplies', icon: '📦', color: '#f59e0b' },
    { value: 'service', label: 'Service', icon: '🏥', color: '#06b6d4' },
    { value: 'imaging', label: 'Imaging', icon: '📡', color: '#6366f1' },
    { value: 'other', label: 'Other', icon: '📋', color: '#64748b' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #fafbff 50%, #f5f0ff 100%)', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
              {isEditMode ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isEditMode ? 'Update the item details below' : 'Fill in the details to add a new item to inventory'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={() => navigate('/inventory')}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Cancel
          </Button>
        </Box>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Basic Information Section */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid #3b82f6' }}>
              <Box display="flex" alignItems="center" mb={2.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                  <InfoIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>Basic Information</Typography>
              </Box>

              {/* Item Type Cards */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Item Type
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {itemTypeConfig.map((type) => (
                    <Box
                      key={type.value}
                      onClick={() => setFormData({ ...formData, itemType: type.value })}
                      sx={{
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 1,
                        px: 2, py: 1.5,
                        borderRadius: 2.5,
                        border: '2px solid',
                        borderColor: formData.itemType === type.value ? type.color : 'divider',
                        bgcolor: formData.itemType === type.value ? `${type.color}10` : 'background.paper',
                        transition: 'all 0.15s ease',
                        '&:hover': { borderColor: type.color, bgcolor: `${type.color}08`, transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                        ...(formData.itemType === type.value && { boxShadow: `0 0 0 1px ${type.color}30, 0 2px 8px ${type.color}15` }),
                      }}
                    >
                      <Typography sx={{ fontSize: '1.2rem' }}>{type.icon}</Typography>
                      <Typography variant="body2" fontWeight={formData.itemType === type.value ? 700 : 500}
                        sx={{ color: formData.itemType === type.value ? type.color : 'text.primary' }}>
                        {type.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Grid container spacing={2.5}>
                <Grid size={12}>
                  <FormControl component="fieldset" sx={{ display: 'none' }}>
                    <RadioGroup row name="itemType" value={formData.itemType}
                      onChange={(e) => setFormData({ ...formData, itemType: e.target.value as ItemType })} />
                  </FormControl>
                </Grid>

                      {/* Basic Information Row 1: Item Name and Category */}
                      <Grid size={{ xs: 12, md: 7 }} sx={{ minWidth: 350, maxWidth: 500 }}> {/* Item Name Autocomplete */}
                        <Autocomplete
                          freeSolo
                          options={filteredMeds}
                          value={formData.name}
                          onChange={(_, newValue) => setFormData({ ...formData, name: newValue || '' })}
                          sx={{ minWidth: 350, maxWidth: 500 }}
                          renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            return (
                              <Box 
                                key={key}
                                component="li" 
                                {...otherProps} 
                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                              >
                                <span>{option}</span>
                                {formData.itemType === 'lab' && option !== 'Other' && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleDeleteLabItem(option, e)}
                                    sx={{ 
                                      ml: 1,
                                      color: 'error.main',
                                      '&:hover': {
                                        backgroundColor: 'error.light',
                                        color: 'white'
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            );
                          }}
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              label={
                                formData.itemType === 'lab' ? 'Lab Item' : 
                                formData.itemType === 'service' ? 'Service Name' :
                                formData.itemType === 'imaging' ? 'Imaging Study' :
                                formData.itemType === 'equipment' ? 'Equipment Name' :
                                formData.itemType === 'supplies' ? 'Supply Name' :
                                'Medication'
                              } 
                              required 
                              fullWidth 
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 5 }} sx={{ minWidth: 350, maxWidth: 500 }}> {/* Category Autocomplete */}
                        <Autocomplete
                          freeSolo
                          options={filteredCategories}
                          value={formData.category}
                          onChange={(_, newValue) => setFormData({ ...formData, category: newValue || '' })}
                          sx={{ minWidth: 350, maxWidth: 500 }}
                          getOptionLabel={(option) => {
                            // For service categories, use formatted names for display
                            if (formData.itemType === 'service' || formData.itemType === 'imaging') {
                              return formatServiceCategoryName(option);
                            }
                            return option;
                          }}
                          renderInput={(params) => (
                            <TextField {...params} label="Category" required fullWidth />
                          )}
                        />
                      </Grid>

                      {/* Basic Information Row 2: Description */}
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          id="description"
                          label="Description"
                          name="description"
                          multiline
                          rows={1} // Keep it compact initially
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                {/* Stock Section - Hidden for non-lab services */}
                {showStockSection && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid #10b981' }}>
                    <Box display="flex" alignItems="center" mb={2.5}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                        <InventoryIcon sx={{ color: '#10b981', fontSize: 20 }} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={700}>Stock Information</Typography>
                    </Box>
                      <Grid container spacing={2}>
                        {/* Stock Information Row (Starts below Description) */}
                        <Grid size={{ xs: 12, sm: 3 }}>
                          <TextField
                             required
                             fullWidth
                             id="quantity"
                             label="Quantity"
                             name="quantity"
                             type="number"
                             value={formData.quantity}
                             onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                             error={!!errors.quantity}
                             helperText={errors.quantity}
                             inputProps={{ min: 0 }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                          <TextField
                             required
                             fullWidth
                             id="costPrice"
                             label="Cost Price (ETB)"
                             name="costPrice"
                             type="number"
                             value={formData.costPrice}
                             onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                             error={!!errors.costPrice}
                             helperText={errors.costPrice}
                             inputProps={{ min: 0, step: "0.01" }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                          <TextField
                             required
                             fullWidth
                             id="unitPrice"
                            label="Selling Price (ETB)"
                             name="unitPrice"
                             type="number"
                             value={formData.unitPrice}
                             onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                             error={!!errors.unitPrice}
                             helperText={errors.unitPrice}
                             inputProps={{ min: 0, step: "0.01" }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                          <TextField
                             required
                             fullWidth
                             id="reorderLevel"
                             label="Reorder Level"
                             name="reorderLevel"
                             type="number"
                             value={formData.reorderLevel}
                             onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                             error={!!errors.reorderLevel}
                             helperText={errors.reorderLevel}
                             inputProps={{ min: 0 }}
                          />
                        </Grid>
                      </Grid>
                  </Paper>
                )}

                {/* Service Pricing Section - Only for Services */}
                {isServiceLike && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid #06b6d4' }}>
                    <Box display="flex" alignItems="center" mb={2.5}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                        <InventoryIcon sx={{ color: '#06b6d4', fontSize: 20 }} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={700}>Service Pricing</Typography>
                    </Box>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            required
                            fullWidth
                            id="unitPrice"
                            label="Service Price (ETB)"
                            name="unitPrice"
                            type="number"
                            value={formData.unitPrice}
                            onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                            error={!!errors.unitPrice}
                            helperText={errors.unitPrice}
                            inputProps={{ min: 0, step: "0.01" }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            id="serviceDuration"
                            label="Service Duration (minutes)"
                            name="serviceDuration"
                            type="number"
                            value={formData.serviceDuration}
                            onChange={(e) => setFormData({ ...formData, serviceDuration: e.target.value })}
                            inputProps={{ min: 0 }}
                            placeholder="e.g., 30"
                          />
                        </Grid>
                      </Grid>
                  </Paper>
                )}

                {/* Medication/Lab Details Section */}
                {formData.itemType === 'medication' && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid #10b981' }}>
                    <Box display="flex" alignItems="center" mb={2.5}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                        <LocalPharmacyIcon sx={{ color: '#10b981', fontSize: 20 }} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={700}>Medication Details</Typography>
                    </Box>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <FormControl fullWidth required error={!!errors.dosage}>
                            <InputLabel id="dosage-label">Dosage</InputLabel>
                            <Select
                              labelId="dosage-label"
                              id="dosage"
                              value={formData.dosage || ''}
                              label="Dosage"
                              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                            >
                              {currentDosageOptions.map((dose) => (
                                <MenuItem key={dose} value={dose}>{dose}</MenuItem>
                              ))}
                            </Select>
                            {errors.dosage && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.dosage}</Typography>}
                          </FormControl>
                          {formData.dosage === 'Other' && (
                            <TextField
                              fullWidth
                              label="Custom Dosage"
                              value={formData.dosageCustom || ''}
                              onChange={(e) => setFormData({ ...formData, dosageCustom: e.target.value })}
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <FormControl fullWidth required error={!!errors.administrationRoute}>
                            <InputLabel id="admin-route-label">Administration Route</InputLabel>
                            <Select
                              labelId="admin-route-label"
                              id="administrationRoute"
                              value={formData.administrationRoute || ''}
                              label="Administration Route"
                              onChange={(e) => setFormData({ ...formData, administrationRoute: e.target.value })}
                            >
                              {currentAdminRouteOptions.map((route) => (
                                <MenuItem key={route} value={route}>{route}</MenuItem>
                              ))}
                            </Select>
                            {errors.administrationRoute && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.administrationRoute}</Typography>}
                          </FormControl>
                          {formData.administrationRoute === 'Other' && (
                            <TextField
                              fullWidth
                              label="Custom Administration Route"
                              value={formData.adminRouteCustom || ''}
                              onChange={(e) => setFormData({ ...formData, adminRouteCustom: e.target.value })}
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Grid>
                         <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField required fullWidth label="Active Ingredient" name="activeIngredient" value={formData.activeIngredient} onChange={(e) => setFormData({ ...formData, activeIngredient: e.target.value })} error={!!errors.activeIngredient} helperText={errors.activeIngredient}/>
                        </Grid>
                         <Grid size={{ xs: 12 }}>
                           <FormControlLabel
                             control={
                               <RadioGroup row name="prescriptionRequired" value={String(formData.prescriptionRequired)} onChange={(e) => setFormData({...formData, prescriptionRequired: e.target.value === 'true'})}>
                                  <FormControlLabel value="true" control={<Radio />} label="Yes" />
                                  <FormControlLabel value="false" control={<Radio />} label="No" />
                               </RadioGroup>
                             }
                             label="Prescription Required?"
                             labelPlacement="start"
                             sx={{ justifyContent: 'flex-start', marginLeft: 0, width: '100%' }}
                           />
                        </Grid>
                      </Grid>
                  </Paper>
                )}
                {(formData.itemType === 'lab' || (formData.itemType === 'service' && ['chemistry', 'hematology', 'parasitology', 'immunology', 'urinalysis', 'endocrinology', 'cardiology', 'tumor-markers'].includes(formData.category))) && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid #8b5cf6' }}>
                    <Box display="flex" alignItems="center" mb={2.5}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                        <LocalPharmacyIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={700}>Lab Item Details</Typography>
                    </Box>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField fullWidth label="Storage Temperature" name="storageTemperature" value={formData.storageTemperature} onChange={(e) => setFormData({ ...formData, storageTemperature: e.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField required fullWidth label="Specimen Type" name="specimenType" value={formData.specimenType} onChange={(e) => setFormData({ ...formData, specimenType: e.target.value })} error={!!errors.specimenType} helperText={errors.specimenType}/>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField required fullWidth label="Test Type" name="testType" value={formData.testType} onChange={(e) => setFormData({ ...formData, testType: e.target.value })} error={!!errors.testType} helperText={errors.testType}/>
                        </Grid>
                         <Grid size={{ xs: 12, sm: 4 }}>
                          <TextField fullWidth label="Approx. Process Time" name="processTime" value={formData.processTime} onChange={(e) => setFormData({ ...formData, processTime: e.target.value })} />
                        </Grid>
                      </Grid>
                  </Paper>
                )}

                {/* Service Details Section */}
                {isServiceLike && (
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid #06b6d4' }}>
                    <Box display="flex" alignItems="center" mb={2.5}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                        <BusinessIcon sx={{ color: '#06b6d4', fontSize: 20 }} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {formatServiceCategoryName(formData.category)} Service Details
                      </Typography>
                    </Box>
                      <Grid container spacing={2}>
                        {Object.entries(getServiceSpecificFields(formData.category)).map(([fieldKey, fieldConfig]) => (
                          <Grid size={{ xs: 12, sm: 6 }} key={fieldKey}>
                            <TextField
                              fullWidth
                              label={fieldConfig.label}
                              name={fieldKey}
                              type={fieldConfig.type}
                              value={formData[fieldKey as keyof InventoryItem] || ''}
                              onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
                              placeholder={fieldConfig.placeholder}
                              required={fieldConfig.required}
                              multiline={fieldConfig.type === 'text' && fieldConfig.label.includes('Instructions')}
                              rows={fieldConfig.type === 'text' && fieldConfig.label.includes('Instructions') ? 2 : 1}
                            />
                          </Grid>
                        ))}
                      </Grid>
                  </Paper>
                )}

                {/* Supplier/Batch Section */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid #f59e0b' }}>
                  <Box display="flex" alignItems="center" mb={2.5}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                      <BusinessIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700}>Supplier & Batch</Typography>
                  </Box>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Autocomplete
                          freeSolo
                          options={MANUFACTURERS}
                          value={formData.manufacturer}
                          onChange={(_, newValue) => setFormData({ ...formData, manufacturer: newValue || '' })}
                          renderInput={(params) => (
                            <TextField {...params} label="Manufacturer" fullWidth />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          id="batchNumber"
                          label="Batch Number"
                          name="batchNumber"
                          value={formData.batchNumber}
                          onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Autocomplete
                          freeSolo
                          options={SUPPLIERS}
                          value={formData.supplier}
                          onChange={(_, newValue) => setFormData({ ...formData, supplier: newValue || '' })}
                          renderInput={(params) => (
                            <TextField {...params} label="Supplier" required fullWidth />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          id="purchaseDate"
                          label="Purchase Date"
                          name="purchaseDate"
                          type="date"
                          value={formData.purchaseDate || ''}
                          onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          id="expiryDate"
                          label="Expiry Date"
                          name="expiryDate"
                          type="date"
                          value={formData.expiryDate || ''}
                          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          id="expiryReminder"
                          label="Expiry Reminder (days before expiry)"
                          name="expiryReminder"
                          type="number"
                          value={formData.expiryReminder}
                          onChange={(e) => setFormData({ ...formData, expiryReminder: e.target.value })}
                          error={!!errors.expiryReminder}
                          helperText={errors.expiryReminder}
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          id="minOrderQuantity"
                          label="Minimum Order Quantity"
                          name="minOrderQuantity"
                          type="number"
                          value={formData.minOrderQuantity}
                          onChange={(e) => setFormData({ ...formData, minOrderQuantity: e.target.value })}
                          error={!!errors.minOrderQuantity}
                          helperText={errors.minOrderQuantity}
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                    </Grid>
                </Paper>

                {/* Attachments Section */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid #64748b' }}>
                  <Box display="flex" alignItems="center" mb={2.5}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                      <AttachFileIcon sx={{ color: '#64748b', fontSize: 20 }} />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700}>Attachments</Typography>
                  </Box>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          id="attachments"
                          label="Attachments (comma-separated URLs or file paths)"
                          name="attachments"
                          multiline
                          rows={2}
                          value={formData.attachments?.join(', ') || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            attachments: e.target.value ? e.target.value.split(',').map(url => url.trim()).filter(url => url) : []
                          })}
                          placeholder="Enter file URLs or paths separated by commas"
                        />
                      </Grid>
                    </Grid>
                </Paper>

                {/* Custom Tags/Labels Section */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderLeft: '4px solid #64748b' }}>
                  <Box display="flex" alignItems="center" mb={2.5}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                      <NoteIcon sx={{ color: '#64748b', fontSize: 20 }} />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700}>Custom Tags/Labels & Notes</Typography>
                  </Box>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          id="customTags"
                          label="Custom Tags/Labels"
                          name="customTags"
                          multiline
                          rows={3}
                          value={formData.customTags}
                          onChange={(e) => setFormData({ ...formData, customTags: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          id="notes"
                          label="Additional Notes"
                          name="notes"
                          multiline
                          rows={3}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                </Paper>

                {/* Action Buttons - Sticky Footer */}
                <Paper elevation={0} sx={{
                  p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  bgcolor: 'background.paper',
                  position: 'sticky', bottom: 16, zIndex: 10,
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.08)'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    {formData.name ? `Adding: ${formData.name}` : 'Fill in the required fields above'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={() => navigate('/inventory')}
                      sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                      disabled={loading}
                      sx={{ borderRadius: 2, textTransform: 'none', px: 4, fontWeight: 600 }}
                    >
                      {loading ? 'Saving...' : (isEditMode ? 'Update Item' : 'Save Item')}
                    </Button>
                  </Box>
                </Paper>
              </Box>
            </Box>

        {/* Snackbar for feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default NewInventoryItemForm; 