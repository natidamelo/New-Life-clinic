import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../components/Modal';
import inventoryService, { InventoryItem } from '../../services/inventoryService';
import labTestService from '../../services/labTestService';
import { useAuth } from '../../context/AuthContext';
import { getAllServices, categorizeService, Service } from '../../services/serviceManagementService';

// Static flag to track if an instance is already rendered
let isLabRequestFormRendered = false;

interface LabTest {
  id: number;
  name: string;
  normalRange?: string;
  value?: string;
  selected?: boolean;
  quantity?: number;
  available?: boolean;
  source?: 'inventory' | 'static';
  specimenType?: string;
  price?: number;
}

interface UrinalysisParameter {
  id: string;
  name: string;
  options: string[];
  selected: string;
  normalRange: string;
}

interface TestPanel {
  id: string;
  name: string;
  description: string;
  tests: number[];
  category: TestCategory;
}

type TestCategory = 'chemistry' | 'hematology' | 'parasitology' | 'immunology' | 'other' | 'urinalysis' | 'endocrinology' | 'cardiology' | 'tumor-markers';

interface LabRequestFormProps {
  patientId: string;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  isSubmitting?: boolean;
  isNested?: boolean;
}

// Specimen type mapping
const specimenTypeMap: Record<string, string> = {
  'Glucose, Fasting': 'Serum',
  'Urea': 'Serum',
  'Creatinine': 'Serum',
  'Sodium': 'Serum',
  'Potassium': 'Serum',
  'Chloride': 'Serum',
  'Bicarbonate': 'Serum',
  'ALT (SGPT)': 'Serum',
  'AST (SGOT)': 'Serum',
  'Total Bilirubin': 'Serum',
  'Albumin': 'Serum',
  'Total Protein': 'Serum',
  'Cholesterol, Total': 'Serum',
  'Triglycerides': 'Serum',
  'HDL Cholesterol': 'Serum',
  'LDL Cholesterol': 'Serum',
  'HbA1C': 'Whole Blood',
  'Calcium': 'Serum',
  'Phosphorus': 'Serum',
  'Magnesium': 'Serum',
  'Uric Acid': 'Serum',
  'Amylase': 'Serum',
  'Lipase': 'Serum',
  'Alkaline Phosphatase': 'Serum',
  'GGT': 'Serum',
  'Iron': 'Serum',
  'TIBC': 'Serum',
  'Ferritin': 'Serum',
  'Complete Blood Count (CBC)': 'Whole Blood',
  'Hemoglobin': 'Whole Blood',
  'Hematocrit': 'Whole Blood',
  'Red Blood Cell Count': 'Whole Blood',
  'White Blood Cell Count': 'Whole Blood',
  'Platelet Count': 'Whole Blood',
  'Differential Count': 'Whole Blood',
  'Prothrombin Time (PT)': 'Plasma',
  'International Normalized Ratio (INR)': 'Plasma',
  'Partial Thromboplastin Time (PTT)': 'Plasma',
  'Stool Exam (Routine)': 'Stool',
  'Fecal Occult Blood Test (FOBT)': 'Stool',
  'Stool Culture': 'Stool',
  'Ova and Parasite Examination': 'Stool',
  'Malaria Smear': 'Whole Blood',
  'HIV Antibody': 'Serum',
  'Hepatitis B Surface Antigen (HBsAg)': 'Serum',
  'Hepatitis C Antibody': 'Serum',
  'C-Reactive Protein': 'Serum',
  'Complete Urinalysis': 'Urine',
  'Urinalysis, Dipstick Only': 'Urine',
  'Urinalysis, Microscopic Only': 'Urine',
  'Urine Microalbumin': 'Urine',
  'Thyroid Stimulating Hormone (TSH)': 'Serum',
  'Free T4': 'Serum',
  'Free T3': 'Serum',
  'Cortisol': 'Serum',
  'Testosterone': 'Serum',
  'Troponin I': 'Serum',
  'Troponin T': 'Serum',
  'BNP': 'Plasma',
  'Prostate Specific Antigen (PSA)': 'Serum',
  'CEA': 'Serum',
  'CA-125': 'Serum',
  'AFP': 'Serum',
};

// Category icons (SVG paths)
const categoryIcons: Record<TestCategory, React.ReactNode> = {
  chemistry: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  hematology: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  parasitology: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  immunology: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  other: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  urinalysis: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  endocrinology: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  cardiology: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'tumor-markers': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
};

// Urinalysis parameters with options and normal ranges
const urinalysisParameters: UrinalysisParameter[] = [
  { id: 'color', name: 'Color', options: ['Pale Yellow', 'Yellow', 'Dark Yellow', 'Amber', 'Orange', 'Red/Pink', 'Brown', 'Blue/Green', 'Colorless'], selected: '', normalRange: 'Pale Yellow to Yellow' },
  { id: 'appearance', name: 'Appearance', options: ['Clear', 'Slightly Cloudy', 'Cloudy', 'Turbid'], selected: '', normalRange: 'Clear' },
  { id: 'specific_gravity', name: 'Specific Gravity', options: ['1.000-1.005', '1.005-1.010', '1.010-1.015', '1.015-1.020', '1.020-1.025', '1.025-1.030', '>1.030'], selected: '', normalRange: '1.005-1.030' },
  { id: 'ph', name: 'pH', options: ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'], selected: '', normalRange: '4.5-8.0' },
  { id: 'protein', name: 'Protein', options: ['Negative', 'Trace', '1+ (30 mg/dL)', '2+ (100 mg/dL)', '3+ (300 mg/dL)', '4+ (>2000 mg/dL)'], selected: '', normalRange: 'Negative' },
  { id: 'glucose', name: 'Glucose', options: ['Negative', 'Trace', '1+ (100 mg/dL)', '2+ (250 mg/dL)', '3+ (500 mg/dL)', '4+ (>1000 mg/dL)'], selected: '', normalRange: 'Negative' },
  { id: 'ketones', name: 'Ketones', options: ['Negative', 'Trace', '1+ (Small)', '2+ (Moderate)', '3+ (Large)'], selected: '', normalRange: 'Negative' },
  { id: 'blood', name: 'Blood', options: ['Negative', 'Trace', '1+ (Small)', '2+ (Moderate)', '3+ (Large)'], selected: '', normalRange: 'Negative' },
  { id: 'bilirubin', name: 'Bilirubin', options: ['Negative', 'Trace', '1+ (Small)', '2+ (Moderate)', '3+ (Large)'], selected: '', normalRange: 'Negative' },
  { id: 'urobilinogen', name: 'Urobilinogen', options: ['Normal (0.2-1.0 mg/dL)', '2 mg/dL', '4 mg/dL', '8 mg/dL', '12 mg/dL'], selected: '', normalRange: '0.2-1.0 mg/dL' },
  { id: 'nitrite', name: 'Nitrite', options: ['Negative', 'Positive'], selected: '', normalRange: 'Negative' },
  { id: 'leukocytes', name: 'Leukocyte Esterase', options: ['Negative', 'Trace', '1+ (Small)', '2+ (Moderate)', '3+ (Large)'], selected: '', normalRange: 'Negative' },
  { id: 'rbc', name: 'RBC (per HPF)', options: ['0-2', '2-5', '5-10', '10-20', '20-50', '50-100', '>100'], selected: '', normalRange: '0-2' },
  { id: 'wbc', name: 'WBC (per HPF)', options: ['0-2', '2-5', '5-10', '10-20', '20-50', '50-100', '>100'], selected: '', normalRange: '0-5' },
  { id: 'epithelial', name: 'Epithelial Cells', options: ['None', 'Few', 'Moderate', 'Many'], selected: '', normalRange: 'Few' },
  { id: 'casts', name: 'Casts', options: ['None', 'Hyaline', 'Granular', 'Waxy', 'RBC', 'WBC', 'Epithelial', 'Fatty', 'Broad'], selected: '', normalRange: 'None or Few Hyaline' },
  { id: 'crystals', name: 'Crystals', options: ['None', 'Calcium Oxalate', 'Uric Acid', 'Triple Phosphate', 'Calcium Phosphate', 'Amorphous Phosphates', 'Amorphous Urates', 'Cystine', 'Tyrosine', 'Leucine'], selected: '', normalRange: 'None or Few' },
  { id: 'bacteria', name: 'Bacteria', options: ['None', 'Few', 'Moderate', 'Many'], selected: '', normalRange: 'None' },
  { id: 'yeast', name: 'Yeast', options: ['None', 'Few', 'Moderate', 'Many'], selected: '', normalRange: 'None' },
  { id: 'trichomonas', name: 'Trichomonas', options: ['None', 'Present'], selected: '', normalRange: 'None' },
];

// Common test panels
const commonPanels: TestPanel[] = [
  { id: 'basic-metabolic', name: 'Basic Metabolic Panel', description: 'Evaluates kidney function, electrolytes, and blood sugar', category: 'chemistry', tests: [1, 2, 3, 4, 5, 6, 7] },
  { id: 'lipid-profile', name: 'Lipid Profile', description: 'Assesses cardiovascular risk factors', category: 'chemistry', tests: [13, 14, 15, 16] },
  { id: 'liver-function', name: 'Liver Function Tests', description: 'Evaluates liver health and function', category: 'chemistry', tests: [8, 9, 10, 11, 12] },
  { id: 'cbc-diff', name: 'CBC with Differential', description: 'Complete blood count with white cell differential', category: 'hematology', tests: [101, 102, 103, 104, 105, 106, 107, 108, 109] },
  { id: 'coagulation', name: 'Coagulation Panel', description: 'Evaluates blood clotting function', category: 'hematology', tests: [110, 111, 112] },
  { id: 'thyroid-panel', name: 'Thyroid Panel', description: 'Assesses thyroid function', category: 'endocrinology', tests: [501, 502, 503] },
  { id: 'cardiac-panel', name: 'Cardiac Panel', description: 'Assesses heart function and risk', category: 'cardiology', tests: [601, 602, 603, 604] },
  { id: 'tumor-marker-panel', name: 'Tumor Marker Panel', description: 'Common tumor markers for screening', category: 'tumor-markers', tests: [701, 702, 703, 704, 705] },
  { id: 'vitamin-panel', name: 'Vitamin Panel', description: 'Common vitamin level tests', category: 'other', tests: [406, 407, 408] },
  { id: 'hormone-panel', name: 'Hormone Panel', description: 'Common hormone level tests', category: 'endocrinology', tests: [504, 505, 506, 507, 508] },
  { id: 'hepatitis-panel', name: 'Hepatitis Panel', description: 'Screens for viral hepatitis infections', category: 'immunology', tests: [302, 303] },
];

// Common lab test presets with WHO standard reference ranges
const commonLabTests: Record<TestCategory, LabTest[]> = {
  chemistry: [
    { id: 1, name: 'Glucose, Fasting', normalRange: '70-100 mg/dL', selected: false },
    { id: 2, name: 'Urea', normalRange: '6-20 mg/dL', selected: false },
    { id: 3, name: 'Creatinine', normalRange: 'Male: 0.7-1.2 mg/dL, Female: 0.5-1.0 mg/dL', selected: false },
    { id: 4, name: 'Sodium', normalRange: '135-145 mmol/L', selected: false },
    { id: 5, name: 'Potassium', normalRange: '3.5-5.1 mmol/L', selected: false },
    { id: 6, name: 'Chloride', normalRange: '98-107 mmol/L', selected: false },
    { id: 7, name: 'Bicarbonate', normalRange: '23-29 mmol/L', selected: false },
    { id: 8, name: 'ALT (SGPT)', normalRange: 'Male: 10-40 U/L, Female: 7-35 U/L', selected: false },
    { id: 9, name: 'AST (SGOT)', normalRange: 'Male: 12-38 U/L, Female: 10-35 U/L', selected: false },
    { id: 10, name: 'Total Bilirubin', normalRange: '0.1-1.2 mg/dL', selected: false },
    { id: 11, name: 'Albumin', normalRange: '3.5-5.0 g/dL', selected: false },
    { id: 12, name: 'Total Protein', normalRange: '6.0-8.3 g/dL', selected: false },
    { id: 13, name: 'Cholesterol, Total', normalRange: '< 200 mg/dL', selected: false },
    { id: 14, name: 'Triglycerides', normalRange: '< 150 mg/dL', selected: false },
    { id: 15, name: 'HDL Cholesterol', normalRange: 'Male: > 40 mg/dL, Female: > 50 mg/dL', selected: false },
    { id: 16, name: 'LDL Cholesterol', normalRange: '< 100 mg/dL', selected: false },
    { id: 17, name: 'HbA1C', normalRange: '< 6.5%', selected: false },
    { id: 18, name: 'Calcium', normalRange: '8.5-10.5 mg/dL', selected: false },
    { id: 19, name: 'Phosphorus', normalRange: '2.5-4.5 mg/dL', selected: false },
    { id: 20, name: 'Magnesium', normalRange: '1.7-2.2 mg/dL', selected: false },
    { id: 21, name: 'Uric Acid', normalRange: 'Male: 3.4-7.0 mg/dL, Female: 2.4-6.0 mg/dL', selected: false },
    { id: 22, name: 'Amylase', normalRange: '30-110 U/L', selected: false },
    { id: 23, name: 'Lipase', normalRange: '0-160 U/L', selected: false },
    { id: 24, name: 'Alkaline Phosphatase', normalRange: '40-129 U/L', selected: false },
    { id: 25, name: 'GGT', normalRange: 'Male: 8-61 U/L, Female: 5-36 U/L', selected: false },
    { id: 26, name: 'Iron', normalRange: 'Male: 60-170 μg/dL, Female: 50-170 μg/dL', selected: false },
    { id: 27, name: 'TIBC', normalRange: '240-450 μg/dL', selected: false },
    { id: 28, name: 'Ferritin', normalRange: 'Male: 20-250 ng/mL, Female: 10-120 ng/mL', selected: false },
  ],
  hematology: [
    { id: 101, name: 'Complete Blood Count (CBC)', normalRange: '', selected: false },
    { id: 102, name: 'Hemoglobin', normalRange: 'Male: 13.0-17.0 g/dL, Female: 12.0-15.0 g/dL', selected: false },
    { id: 103, name: 'Hematocrit', normalRange: 'Male: 39-49%, Female: 36-46%', selected: false },
    { id: 104, name: 'Red Blood Cell Count', normalRange: 'Male: 4.5-5.9 × 10^6/μL, Female: 4.0-5.2 × 10^6/μL', selected: false },
    { id: 105, name: 'White Blood Cell Count', normalRange: '4,000-10,000/μL', selected: false },
    { id: 106, name: 'Platelet Count', normalRange: '150,000-400,000/μL', selected: false },
    { id: 107, name: 'Mean Corpuscular Volume (MCV)', normalRange: '80-100 fL', selected: false },
    { id: 108, name: 'Mean Corpuscular Hemoglobin (MCH)', normalRange: '27-33 pg', selected: false },
    { id: 109, name: 'Differential Count', normalRange: '', selected: false },
    { id: 110, name: 'Prothrombin Time (PT)', normalRange: '11-13.5 sec', selected: false },
    { id: 111, name: 'International Normalized Ratio (INR)', normalRange: '0.8-1.1', selected: false },
    { id: 112, name: 'Partial Thromboplastin Time (PTT)', normalRange: '25-35 sec', selected: false },
    { id: 113, name: 'Reticulocyte Count', normalRange: '0.5-2.5%', selected: false },
    { id: 114, name: 'Erythrocyte Sedimentation Rate (ESR)', normalRange: 'Male: 0-15 mm/hr, Female: 0-20 mm/hr', selected: false },
    { id: 115, name: 'Neutrophils', normalRange: '40-70%', selected: false },
    { id: 116, name: 'Lymphocytes', normalRange: '20-40%', selected: false },
    { id: 117, name: 'Monocytes', normalRange: '2-8%', selected: false },
    { id: 118, name: 'Eosinophils', normalRange: '1-4%', selected: false },
    { id: 119, name: 'Basophils', normalRange: '0.5-1%', selected: false },
    { id: 120, name: 'D-Dimer', normalRange: '< 500 ng/mL', selected: false },
    { id: 121, name: 'Fibrinogen', normalRange: '200-400 mg/dL', selected: false },
  ],
  parasitology: [
    { id: 201, name: 'Stool Exam (Routine)', normalRange: 'Negative', selected: false },
    { id: 202, name: 'Fecal Occult Blood Test (FOBT)', normalRange: 'Negative', selected: false },
    { id: 203, name: 'Stool Culture', normalRange: 'No growth', selected: false },
    { id: 204, name: 'Ova and Parasite Examination', normalRange: 'No ova or parasites seen', selected: false },
    { id: 205, name: 'Malaria Smear', normalRange: 'Negative', selected: false },
    { id: 206, name: 'Filaria Smear', normalRange: 'Negative', selected: false },
    { id: 207, name: 'Schistosomiasis Test', normalRange: 'Negative', selected: false },
    { id: 208, name: 'Giardia Antigen', normalRange: 'Negative', selected: false },
    { id: 209, name: 'Cryptosporidium Antigen', normalRange: 'Negative', selected: false },
    { id: 210, name: 'Entamoeba histolytica Antigen', normalRange: 'Negative', selected: false },
    { id: 211, name: 'Helminth Antibody Panel', normalRange: 'Negative', selected: false },
  ],
  immunology: [
    { id: 301, name: 'HIV Antibody', normalRange: 'Non-reactive', selected: false },
    { id: 302, name: 'Hepatitis B Surface Antigen (HBsAg)', normalRange: 'Negative', selected: false },
    { id: 303, name: 'Hepatitis C Antibody', normalRange: 'Negative', selected: false },
    { id: 304, name: 'COVID-19 PCR Test', normalRange: 'Not detected', selected: false },
    { id: 305, name: 'C-Reactive Protein', normalRange: '< 5 mg/L', selected: false },
    { id: 306, name: 'Rheumatoid Factor', normalRange: '< 14 IU/mL', selected: false },
    { id: 307, name: 'ANA (Antinuclear Antibody)', normalRange: 'Negative', selected: false },
    { id: 308, name: 'Thyroid Peroxidase Antibody', normalRange: '< 35 IU/mL', selected: false },
    { id: 309, name: 'IgE Total', normalRange: '< 100 IU/mL', selected: false },
    { id: 310, name: 'IgG', normalRange: '700-1600 mg/dL', selected: false },
    { id: 311, name: 'IgM', normalRange: '40-230 mg/dL', selected: false },
    { id: 312, name: 'IgA', normalRange: '70-400 mg/dL', selected: false },
    { id: 313, name: 'Complement C3', normalRange: '90-180 mg/dL', selected: false },
    { id: 314, name: 'Complement C4', normalRange: '10-40 mg/dL', selected: false },
    { id: 315, name: 'Anti-dsDNA', normalRange: 'Negative', selected: false },
    { id: 316, name: 'Anti-CCP', normalRange: 'Negative', selected: false },
    { id: 317, name: 'Hepatitis B Core Antibody', normalRange: 'Negative', selected: false },
    { id: 318, name: 'Hepatitis B Surface Antibody', normalRange: 'Negative', selected: false },
    { id: 319, name: 'VDRL/RPR', normalRange: 'Non-reactive', selected: false },
  ],
  endocrinology: [
    { id: 501, name: 'Thyroid Stimulating Hormone (TSH)', normalRange: '0.4-4.0 mIU/L', selected: false },
    { id: 502, name: 'Free T4', normalRange: '0.7-1.9 ng/dL', selected: false },
    { id: 503, name: 'Free T3', normalRange: '2.3-4.1 pg/mL', selected: false },
    { id: 504, name: 'Cortisol', normalRange: '7-28 µg/dL (morning)', selected: false },
    { id: 505, name: 'Testosterone', normalRange: '280-1100 ng/dL (male)', selected: false },
    { id: 506, name: 'Estradiol', normalRange: '15-350 pg/mL (female)', selected: false },
    { id: 507, name: 'FSH', normalRange: '1.5-12.4 mIU/mL', selected: false },
    { id: 508, name: 'LH', normalRange: '1.7-8.6 mIU/mL', selected: false },
    { id: 509, name: 'Prolactin', normalRange: '2-18 ng/mL', selected: false },
    { id: 510, name: 'ACTH', normalRange: '10-60 pg/mL', selected: false },
    { id: 511, name: 'Parathyroid Hormone (PTH)', normalRange: '10-65 pg/mL', selected: false },
    { id: 512, name: 'Insulin', normalRange: '2-25 µIU/mL', selected: false },
    { id: 513, name: 'C-Peptide', normalRange: '0.5-2.0 ng/mL', selected: false },
    { id: 514, name: 'DHEA-S', normalRange: '80-560 µg/dL (male)', selected: false },
    { id: 515, name: 'Progesterone', normalRange: '< 1 ng/mL (follicular)', selected: false },
  ],
  cardiology: [
    { id: 601, name: 'Troponin I', normalRange: '< 0.04 ng/mL', selected: false },
    { id: 602, name: 'Troponin T', normalRange: '< 0.01 ng/mL', selected: false },
    { id: 603, name: 'BNP', normalRange: '< 100 pg/mL', selected: false },
    { id: 604, name: 'NT-proBNP', normalRange: '< 300 pg/mL', selected: false },
    { id: 605, name: 'CK-MB', normalRange: '< 5 ng/mL', selected: false },
    { id: 606, name: 'Myoglobin', normalRange: '< 70 ng/mL', selected: false },
    { id: 607, name: 'Homocysteine', normalRange: '< 15 µmol/L', selected: false },
    { id: 608, name: 'Lipoprotein (a)', normalRange: '< 30 mg/dL', selected: false },
  ],
  'tumor-markers': [
    { id: 701, name: 'Prostate Specific Antigen (PSA)', normalRange: '< 4 ng/mL', selected: false },
    { id: 702, name: 'CEA', normalRange: '< 3 ng/mL', selected: false },
    { id: 703, name: 'CA-125', normalRange: '< 35 U/mL', selected: false },
    { id: 704, name: 'CA 19-9', normalRange: '< 37 U/mL', selected: false },
    { id: 705, name: 'AFP', normalRange: '< 10 ng/mL', selected: false },
    { id: 706, name: 'CA 15-3', normalRange: '< 30 U/mL', selected: false },
    { id: 707, name: 'Beta-hCG', normalRange: '< 5 mIU/mL (non-pregnant)', selected: false },
    { id: 708, name: 'NSE (Neuron-Specific Enolase)', normalRange: '< 16.3 ng/mL', selected: false },
    { id: 709, name: 'Chromogranin A', normalRange: '< 100 ng/mL', selected: false },
  ],
  other: [
    { id: 401, name: 'Vitamin D, 25-Hydroxy', normalRange: '30-100 ng/mL', selected: false },
    { id: 402, name: 'Vitamin B12', normalRange: '200-900 pg/mL', selected: false },
    { id: 403, name: 'Folate', normalRange: '2-20 ng/mL', selected: false },
    { id: 404, name: 'Microalbumin, Urine', normalRange: '< 30 mg/g creatinine', selected: false },
    { id: 405, name: 'HCG, Quantitative', normalRange: '< 5 mIU/mL (non-pregnant)', selected: false },
    { id: 406, name: 'Urine Culture', normalRange: 'No growth', selected: false },
    { id: 407, name: 'Blood Culture', normalRange: 'No growth', selected: false },
    { id: 408, name: 'Throat Culture', normalRange: 'Normal flora', selected: false },
    { id: 409, name: 'Hemoglobin A1C', normalRange: '< 5.7%', selected: false },
    { id: 410, name: 'Ammonia', normalRange: '15-45 µmol/L', selected: false },
    { id: 411, name: 'Lactic Acid', normalRange: '0.5-2.2 mmol/L', selected: false },
    { id: 412, name: 'Ceruloplasmin', normalRange: '20-35 mg/dL', selected: false },
    { id: 413, name: 'Alpha-1-Antitrypsin', normalRange: '90-200 mg/dL', selected: false },
    { id: 414, name: 'Copper', normalRange: '70-140 µg/dL', selected: false },
    { id: 415, name: 'Zinc', normalRange: '60-120 µg/dL', selected: false },
    { id: 416, name: 'Lead', normalRange: '< 5 µg/dL', selected: false },
    { id: 417, name: 'Mercury', normalRange: '< 10 µg/L', selected: false },
    { id: 418, name: 'Arsenic', normalRange: '< 10 µg/L', selected: false },
    { id: 419, name: 'Cryoglobulins', normalRange: 'Negative', selected: false },
    { id: 420, name: 'CSF Analysis', normalRange: 'See report', selected: false },
  ],
  urinalysis: [
    { id: 601, name: 'Complete Urinalysis', normalRange: '', selected: false },
    { id: 602, name: 'Urinalysis, Dipstick Only', normalRange: '', selected: false },
    { id: 603, name: 'Urinalysis, Microscopic Only', normalRange: '', selected: false },
    { id: 604, name: 'Urine Microalbumin', normalRange: '< 30 mg/g creatinine', selected: false },
    { id: 605, name: 'Urine Protein-to-Creatinine Ratio', normalRange: '< 0.2', selected: false },
  ],
};

const labTestToItemMap: Record<string, string> = {
  'Glucose, Fasting': 'Glucose Reagent',
  'Glucose Test Strip': 'Glucose Test Strips',
  'Sodium': 'Serum Electrolytes Reagent',
  'Potassium': 'Serum Electrolytes Reagent',
  'Chloride': 'Serum Electrolytes Reagent',
};

// Loading skeleton component
const TestSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="animate-pulse flex items-center p-3 rounded-lg border border-gray-100 bg-gray-50">
        <div className="h-4 w-4 rounded bg-gray-200 mr-3 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-2.5 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-5 w-16 bg-gray-200 rounded-full ml-2" />
      </div>
    ))}
  </div>
);

const LabRequestForm: React.FC<LabRequestFormProps> = ({ patientId, onClose, onSubmit, isSubmitting = false, isNested = false }) => {
  useEffect(() => {
    if (isLabRequestFormRendered) {
      console.warn('Multiple LabRequestForm instances detected');
      onClose();
      return;
    }
    isLabRequestFormRendered = true;
    return () => { isLabRequestFormRendered = false; };
  }, [onClose]);

  const [tests, setTests] = useState<Record<TestCategory, LabTest[]>>({
    chemistry: [],
    hematology: [],
    parasitology: [],
    immunology: [],
    other: [],
    urinalysis: [],
    endocrinology: [],
    cardiology: [],
    'tumor-markers': [],
  });

  const getTestsForCategory = (category: TestCategory): LabTest[] => {
    const categoryMap: Record<string, string> = {
      chemistry: 'Chemistry', hematology: 'Hematology', parasitology: 'Parasitology',
      immunology: 'Immunology', urinalysis: 'Urinalysis', endocrinology: 'Endocrinology',
      cardiology: 'Cardiology', 'tumor-markers': 'Tumor Markers', other: 'Other',
    };
    const mappedCategory = categoryMap[category] || category;
    const dynamicTests = dynamicLabTests[mappedCategory] || [];
    const staticTests = commonLabTests[category] || [];

    const inventoryBasedTests = dynamicTests.map((test: any, index: number) => ({
      id: test.id || index + 1,
      name: test.name,
      normalRange: test.normalRange || '',
      value: '',
      selected: false,
      quantity: test.quantity,
      available: test.available,
      source: 'inventory' as const,
      price: typeof test.sellingPrice === 'number' ? test.sellingPrice : undefined,
    }));

    const inventoryTestNames = new Set(inventoryBasedTests.map((t: LabTest) => t.name.toLowerCase()));
    const additionalStaticTests = staticTests
      .filter(st => !inventoryTestNames.has(st.name.toLowerCase()))
      .map(st => ({ ...st, quantity: 0, available: false, source: 'static' as const }));

    return [...inventoryBasedTests, ...additionalStaticTests];
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [urinalysisParams, setUrinalysisParams] = useState<UrinalysisParameter[]>([]);
  const [isUrinalysisDetailed, setIsUrinalysisDetailed] = useState(false);
  const [activeTab, setActiveTab] = useState<TestCategory>('chemistry');
  const [priority, setPriority] = useState<'Routine' | 'STAT' | 'ASAP'>('Routine');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [labServices, setLabServices] = useState<Service[]>([]);
  const [dynamicLabTests, setDynamicLabTests] = useState<Record<string, any[]>>({});
  const [loadingLabTests, setLoadingLabTests] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        setLoadingLabTests(true);
        const data = await labTestService.getAvailableLabTests();
        if (data.success && data.categories) {
          setDynamicLabTests(data.categories);
          const items = await inventoryService.getAllItems({ category: 'laboratory' });
          setInventoryItems(items);
        }
      } catch (err) {
        console.error('Failed to fetch lab tests', err);
        try {
          const items = await inventoryService.getAllItems({ category: 'laboratory' });
          setInventoryItems(items);
        } catch (fallbackErr) {
          console.error('Fallback also failed:', fallbackErr);
        }
      } finally {
        setLoadingLabTests(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const allServices = await getAllServices();
        setLabServices(allServices.filter(s => s.category === 'lab' || s.category === 'blood_test'));
      } catch (err) {
        console.error('Failed to fetch lab services', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (Object.keys(dynamicLabTests).length > 0) {
      setTests(prevTests => {
        const updated = {} as Record<TestCategory, LabTest[]>;
        (Object.keys(prevTests) as TestCategory[]).forEach(cat => {
          const newCatTests = getTestsForCategory(cat);
          updated[cat] = newCatTests.map(newTest => {
            const prev = prevTests[cat].find(pt => pt.id === newTest.id || pt.name === newTest.name);
            return prev?.selected ? { ...newTest, selected: true, value: prev.value || '' } : newTest;
          });
        });
        return updated;
      });
    }
  }, [dynamicLabTests]);

  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const newItems = await labTestService.checkForNewItems();
        if (newItems.length > 0) {
          const fullData = await labTestService.getAvailableLabTests();
          if (fullData.success && fullData.categories) setDynamicLabTests(fullData.categories);
        }
      } catch (error) {
        console.error('Error syncing lab tests:', error);
      }
    }, 30000);
    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    setTests({
      chemistry: [...commonLabTests.chemistry],
      hematology: [...commonLabTests.hematology],
      parasitology: [...commonLabTests.parasitology],
      immunology: [...commonLabTests.immunology],
      other: [...commonLabTests.other],
      urinalysis: [...commonLabTests.urinalysis],
      endocrinology: [...commonLabTests.endocrinology],
      cardiology: [...commonLabTests.cardiology],
      'tumor-markers': [...commonLabTests['tumor-markers']],
    });
    setUrinalysisParams([...urinalysisParameters]);
  }, []);

  useEffect(() => {
    document.body.classList.add('dialog-open');
    return () => { document.body.classList.remove('dialog-open'); };
  }, []);

  const getStockForTest = (testName: string): number | null => {
    let item = inventoryItems.find(i => i.name === testName);
    if (!item) {
      const mappedName = labTestToItemMap[testName];
      if (mappedName) item = inventoryItems.find(i => i.name === mappedName);
    }
    return item ? item.quantity : null;
  };

  const getReorderLevelForTest = (testName: string): number | null => {
    let item = inventoryItems.find(i => i.name === testName);
    if (!item) {
      const mappedName = labTestToItemMap[testName];
      if (mappedName) item = inventoryItems.find(i => i.name === mappedName);
    }
    return item ? (item.reorderPoint ?? item.minimumStockLevel ?? null) : null;
  };

  /** Prefer exact inventory price when available (from stock); else service list or fallback. */
  const getTestPrice = (test: LabTest): number => {
    if (typeof test.price === 'number' && test.price >= 0) return test.price;
    const service = labServices.find(s => s.name.toLowerCase() === test.name.toLowerCase());
    return service ? service.price : 50;
  };

  const hasSufficientInventoryForPanel = (panel: TestPanel): boolean => {
    const categoryTests = tests[panel.category] || [];
    for (const testId of panel.tests) {
      const test = categoryTests.find(t => t.id === testId);
      if (!test) continue;
      const stock = getStockForTest(test.name);
      const reorderLevel = getReorderLevelForTest(test.name);
      if (stock === null) continue;
      if (stock <= 0 || (reorderLevel !== null && stock <= reorderLevel)) return false;
    }
    return true;
  };

  const getPanelInventoryStatus = (panel: TestPanel): string => {
    const categoryTests = tests[panel.category] || [];
    const unavailable: string[] = [];
    for (const testId of panel.tests) {
      const test = categoryTests.find(t => t.id === testId);
      if (!test) continue;
      const stock = getStockForTest(test.name);
      const reorderLevel = getReorderLevelForTest(test.name);
      if (stock !== null && (stock <= 0 || (reorderLevel !== null && stock <= reorderLevel))) {
        unavailable.push(test.name);
      }
    }
    if (unavailable.length === 0) return 'All tests available';
    if (unavailable.length === panel.tests.length) return 'No inventory available for any tests';
    return `Some tests unavailable: ${unavailable.slice(0, 2).join(', ')}${unavailable.length > 2 ? '...' : ''}`;
  };

  const toggleTestSelection = (category: TestCategory, id: number) => {
    if (category === 'urinalysis' && id === 601) {
      if (!tests.urinalysis.find(t => t.id === 601)?.selected) setIsUrinalysisDetailed(true);
    }
    setTests(prev => ({
      ...prev,
      [category]: prev[category].map(t => t.id === id ? { ...t, selected: !t.selected } : t),
    }));
  };

  const updateUrinalysisParameter = (paramId: string, value: string) => {
    setUrinalysisParams(prev => prev.map(p => p.id === paramId ? { ...p, selected: value } : p));
  };

  const addCustomTest = (category: TestCategory) => {
    if (!searchQuery.trim()) return;
    const newTest: LabTest = { id: Date.now(), name: searchQuery, normalRange: '', selected: true };
    setTests(prev => ({ ...prev, [category]: [...prev[category], newTest] }));
    setSearchQuery('');
  };

  const applyPanel = (panelId: string) => {
    const panel = commonPanels.find(p => p.id === panelId);
    if (!panel) return;
    if (!hasSufficientInventoryForPanel(panel)) {
      alert(`Cannot apply ${panel.name} panel: ${getPanelInventoryStatus(panel)}`);
      return;
    }
    setTests(prev => ({
      ...prev,
      [panel.category]: prev[panel.category].map(t =>
        panel.tests.includes(t.id) ? { ...t, selected: true } : t
      ),
    }));
  };

  const selectAllInCategory = (category: TestCategory) => {
    setTests(prev => ({
      ...prev,
      [category]: prev[category].map(t =>
        (t.available !== false && t.source !== 'static') ? { ...t, selected: true } : t
      ),
    }));
  };

  const clearAllInCategory = (category: TestCategory) => {
    setTests(prev => ({
      ...prev,
      [category]: prev[category].map(t => ({ ...t, selected: false })),
    }));
  };

  const getFilteredTests = (category: TestCategory) => {
    const query = searchQuery.toLowerCase();
    if (!query) return tests[category];
    return tests[category].filter(t => t.name.toLowerCase().includes(query));
  };

  const selectedCounts = useMemo(() => {
    const counts = {} as Record<TestCategory, number>;
    (Object.keys(tests) as TestCategory[]).forEach(cat => {
      counts[cat] = tests[cat].filter(t => t.selected).length;
    });
    return counts;
  }, [tests]);

  const totalSelected = useMemo(() =>
    Object.values(selectedCounts).reduce((sum, c) => sum + c, 0),
    [selectedCounts]
  );

  const allSelectedTests = useMemo(() => {
    return (Object.keys(tests) as TestCategory[]).flatMap(cat =>
      tests[cat].filter(t => t.selected).map(t => ({ ...t, category: cat }))
    );
  }, [tests]);

  const totalEstimatedCost = useMemo(() =>
    allSelectedTests.reduce((sum, t) => sum + getTestPrice(t), 0),
    [allSelectedTests, labServices]
  );

  const handleSave = async () => {
    const selectedTests = {} as Record<TestCategory, LabTest[]>;
    (Object.keys(tests) as TestCategory[]).forEach(cat => {
      selectedTests[cat] = tests[cat].filter(t => t.selected);
    });
    const formData = {
      patientId,
      ...selectedTests,
      urinalysisDetails: isUrinalysisDetailed ? urinalysisParams : null,
      notes: clinicalNotes,
      priority,
      status: 'draft',
    };
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  const handleSend = async () => {
    const selectedLists = (Object.keys(tests) as TestCategory[])
      .flatMap(cat => tests[cat].filter(t => t.selected));
    const formData = {
      patientId,
      tests: selectedLists.map(t => ({ testName: t.name, price: getTestPrice(t) })),
      notes: clinicalNotes,
      priority,
    };
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error('Failed to send lab request:', err);
    }
  };

  const renderPanels = (category: TestCategory) => {
    const relevantPanels = commonPanels.filter(p => p.category === category);
    if (relevantPanels.length === 0) return null;
    return (
      <div className="mb-5 pb-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Quick Panels</p>
        <div className="flex flex-wrap gap-2">
          {relevantPanels.map(panel => {
            const hasInventory = hasSufficientInventoryForPanel(panel);
            const inventoryStatus = getPanelInventoryStatus(panel);
            return (
              <button
                key={panel.id}
                onClick={() => hasInventory ? applyPanel(panel.id) : undefined}
                disabled={!hasInventory}
                title={`${panel.description}${!hasInventory ? ` — ${inventoryStatus}` : ''}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150 ${
                  hasInventory
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer shadow-sm'
                    : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {panel.name}
                {!hasInventory && <span className="text-orange-400">⚠</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTests = (category: TestCategory) => {
    const testsToRender = getFilteredTests(category);

    if (loadingLabTests) return <TestSkeleton />;

    if (testsToRender.length === 0 && !searchQuery) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm">No tests available in this category.</p>
        </div>
      );
    }
    if (testsToRender.length === 0 && searchQuery) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">No tests match "<strong>{searchQuery}</strong>"</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {testsToRender.map(test => {
          const stockQty = test.quantity || 0;
          const isAvailable = test.available !== false;
          const reorderLevel = getReorderLevelForTest(test.name);
          const isStaticTest = test.source === 'static';
          const price = getTestPrice(test);
          const specimen = specimenTypeMap[test.name];

          let status: 'ok' | 'low' | 'out' | 'static' = 'out';
          if (isStaticTest) status = 'static';
          else if (!isAvailable || stockQty <= 0) status = 'out';
          else if (reorderLevel !== null && stockQty <= reorderLevel) status = 'low';
          else status = 'ok';

          const isDisabled = status === 'out' || status === 'static';
          const isSelected = test.selected || false;

          const cardClass = isSelected
            ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200 shadow-md'
            : status === 'ok'
            ? 'border-green-200 bg-white hover:bg-green-50 hover:border-green-300 hover:shadow-sm'
            : status === 'low'
            ? 'border-amber-200 bg-white hover:bg-amber-50 hover:border-amber-300 hover:shadow-sm'
            : 'border-red-100 bg-gray-50 opacity-55 cursor-not-allowed';

          return (
            <div
              key={test.id}
              onClick={() => !isDisabled && toggleTestSelection(category, test.id)}
              className={`relative flex flex-col p-3 rounded-xl border transition-all duration-150 group ${cardClass} ${!isDisabled ? 'cursor-pointer' : ''}`}
            >
              {/* Selected checkmark overlay */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="flex items-start gap-2.5 pr-6">
                <input
                  type="checkbox"
                  id={`test-${category}-${test.id}`}
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => !isDisabled && toggleTestSelection(category, test.id)}
                  onClick={e => e.stopPropagation()}
                  className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={`test-${category}-${test.id}`}
                    className={`text-sm font-medium leading-tight cursor-pointer ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    {test.name}
                  </label>
                  {test.normalRange && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate" title={`Normal: ${test.normalRange}`}>
                      Ref: {test.normalRange}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  {/* Availability badge */}
                  {isStaticTest ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium border border-red-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                      Not Available
                    </span>
                  ) : status === 'ok' ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      Available
                    </span>
                  ) : status === 'low' ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      Low Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium border border-red-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                      Not Available
                    </span>
                  )}
                  {/* Specimen type */}
                  {specimen && (
                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                      {specimen}
                    </span>
                  )}
                </div>
                {/* Price */}
                <span className={`text-xs font-semibold ${isDisabled ? 'text-gray-300' : 'text-blue-600'}`}>
                  ₱{price.toLocaleString()}
                </span>
              </div>

              {/* Admin stock count */}
              {user?.role === 'admin' && stockQty > 0 && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-300 font-mono">
                  ×{stockQty}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderUrinalysisDetails = () => {
    if (!isUrinalysisDetailed) return null;
    const isCompleteSelected = tests.urinalysis.find(t => t.id === 601)?.selected;
    if (!isCompleteSelected) { setIsUrinalysisDetailed(false); return null; }

    return (
      <div className="mt-6 bg-blue-50 p-5 rounded-xl border border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h4 className="font-semibold text-blue-800 text-base">Complete Urinalysis Parameters</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Physical Properties', params: urinalysisParams.slice(0, 3) },
            { title: 'Chemical Properties', params: urinalysisParams.slice(3, 12) },
            { title: 'Microscopic Examination', params: urinalysisParams.slice(12) },
          ].map(section => (
            <div key={section.title} className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
              <h5 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 pb-2 border-b border-blue-100">{section.title}</h5>
              <div className="space-y-2.5">
                {section.params.map(param => (
                  <div key={param.id}>
                    <label className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                      <span>{param.name}</span>
                      <span className="text-gray-400 font-normal">{param.normalRange}</span>
                    </label>
                    <select
                      value={param.selected}
                      onChange={e => updateUrinalysisParameter(param.id, e.target.value)}
                      className="w-full text-xs p-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50"
                    >
                      <option value="">— Select —</option>
                      {param.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const categoryLabels: Record<TestCategory, string> = {
    chemistry: 'Chemistry', hematology: 'Hematology', parasitology: 'Parasitology',
    immunology: 'Immunology', urinalysis: 'Urinalysis', endocrinology: 'Endocrinology',
    cardiology: 'Cardiology', 'tumor-markers': 'Tumor Markers', other: 'Other',
  };

  return (
    <div
      className="lab-request-form-container w-full flex flex-col bg-gray-50"
      style={{ height: isNested ? '100%' : '100vh', maxHeight: isNested ? '100%' : '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}
    >
      {/* Header */}
      {!isNested && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center shadow-lg flex-shrink-0" data-lab-request-header="true">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Order Lab Test</h2>
              <p className="text-blue-200 text-xs mt-0.5">Select tests and set priority</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Sub-header: Priority + Patient Info */}
      <div className="bg-white px-6 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</span>
          <div className="flex gap-1.5">
            {(['Routine', 'STAT', 'ASAP'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-150 ${
                  priority === p
                    ? p === 'STAT' ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                    : p === 'ASAP' ? 'bg-red-500 border-red-500 text-white shadow-sm'
                    : 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-500">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-500">Patient:</span>
            <span className="text-xs font-semibold text-blue-600">{patientId !== 'N/A' ? patientId : 'No patient selected'}</span>
          </div>

          {totalSelected > 0 ? (
            <button
              onClick={() => setShowSummary(s => !s)}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {totalSelected} test{totalSelected !== 1 ? 's' : ''} · ₱{totalEstimatedCost.toLocaleString()}
              <svg className={`w-3 h-3 transition-transform ${showSummary ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <span className="text-xs text-gray-400 italic">No tests selected</span>
          )}
        </div>
      </div>

      {/* Selected Tests Summary Dropdown */}
      {showSummary && totalSelected > 0 && (
        <div className="bg-white border-b border-gray-200 shadow-md flex-shrink-0 max-h-56 overflow-y-auto">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Selected Tests Summary</h4>
              <button
                onClick={() => {
                  (Object.keys(tests) as TestCategory[]).forEach(cat => clearAllInCategory(cat));
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {allSelectedTests.map(test => (
                <div key={`${test.category}-${test.id}`} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => toggleTestSelection(test.category as TestCategory, test.id)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <span className="text-xs text-gray-700 truncate font-medium">{test.name}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 ml-2 flex-shrink-0">₱{getTestPrice(test).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-700">
                Estimated Total: <span className="text-blue-600">₱{totalEstimatedCost.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-0 overflow-hidden">
        {/* Left Sidebar: Categories */}
        <div className="w-full md:w-52 lg:w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <div className="p-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Categories</p>
            <nav className="space-y-0.5">
              {(Object.keys(tests) as TestCategory[]).map(category => {
                const count = selectedCounts[category];
                return (
                  <button
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all duration-100 ${
                      activeTab === category
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={activeTab === category ? 'text-blue-200' : 'text-gray-400'}>
                        {categoryIcons[category]}
                      </span>
                      <span className="font-medium">{categoryLabels[category]}</span>
                    </div>
                    {count > 0 && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        activeTab === category ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right: Test Selection */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            {/* Category Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-500">{categoryIcons[activeTab]}</span>
                <h3 className="text-lg font-bold text-gray-800">{categoryLabels[activeTab]}</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {getFilteredTests(activeTab).length} tests
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search tests..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none w-44 bg-gray-50"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Select All / Clear */}
                <button
                  onClick={() => selectAllInCategory(activeTab)}
                  className="px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => clearAllInCategory(activeTab)}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={selectedCounts[activeTab] === 0}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Panels */}
            {renderPanels(activeTab)}

            {/* Tests Grid */}
            {renderTests(activeTab)}

            {/* Urinalysis Details */}
            {activeTab === 'urinalysis' && renderUrinalysisDetails()}
          </div>

          {/* Clinical Notes */}
          <div className="border-t border-gray-200 bg-white px-5 py-3 flex-shrink-0">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Clinical Indication / Notes
              <span className="font-normal text-gray-400 ml-1">(optional)</span>
            </label>
            <textarea
              value={clinicalNotes}
              onChange={e => setClinicalNotes(e.target.value)}
              placeholder="e.g. Routine check-up, suspected diabetes, follow-up for hypertension..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none resize-none bg-gray-50 placeholder-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shadow-lg flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {totalSelected > 0 && (
            <div className="text-sm text-gray-500 mr-2">
              <span className="font-semibold text-gray-700">{totalSelected}</span> test{totalSelected !== 1 ? 's' : ''} ·{' '}
              <span className="font-semibold text-blue-600">₱{totalEstimatedCost.toLocaleString()}</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSubmitting || totalSelected === 0}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Draft
          </button>
          <button
            onClick={handleSend}
            disabled={isSubmitting || totalSelected === 0}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send to Lab
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabRequestForm;
