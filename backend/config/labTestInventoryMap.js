module.exports = {
  // ============================================================================
  // COMPREHENSIVE LAB TEST INVENTORY MAPPING
  // Maps lab test names to actual inventory item names for automatic deduction
  // ============================================================================
  
  // ----------------------------------------------------------------------------
  // GLUCOSE TESTS - Point to LABORATORY category items
  // ----------------------------------------------------------------------------
  'Glucose (Fasting)': { itemName: 'Glucose, Fasting', quantity: 1, category: 'laboratory' },
  'Glucose, Fasting': { itemName: 'Glucose, Fasting', quantity: 1, category: 'laboratory' },
  'Glucose': { itemName: 'Glucose, Fasting', quantity: 1, category: 'laboratory' },
  'Fasting': { itemName: 'Glucose, Fasting', quantity: 1, category: 'laboratory' },
  'FBS': { itemName: 'Glucose, Fasting', quantity: 1, category: 'laboratory' },
  'Fasting Blood Sugar': { itemName: 'Glucose, Fasting', quantity: 1, category: 'laboratory' },
  'Fasting Blood Glucose': { itemName: 'Glucose, Fasting', quantity: 1, category: 'laboratory' },
  
  // Glucose Test Strips - Use LABORATORY category to appear in lab test interface
  'Glucose Strip': { itemName: 'Glucose Test Strips', quantity: 1, category: 'laboratory' },
  'Glucose Test Strip': { itemName: 'Glucose Test Strips', quantity: 1, category: 'laboratory' },
  'Glucose Test Strips': { itemName: 'Glucose Test Strips', quantity: 1, category: 'laboratory' },
  'Blood Glucose Strip': { itemName: 'Glucose Test Strips', quantity: 1, category: 'laboratory' },
  'RBS': { itemName: 'Glucose Test Strips', quantity: 1, category: 'laboratory' },
  'Random Blood Sugar': { itemName: 'Glucose Test Strips', quantity: 1, category: 'laboratory' },
  
  // ----------------------------------------------------------------------------
  // HEMOGLOBIN & CBC TESTS - Point to LABORATORY category items
  // ----------------------------------------------------------------------------
  'Hemoglobin': { itemName: 'Hemoglobin', quantity: 1, category: 'laboratory' },
  'HGB': { itemName: 'Hemoglobin', quantity: 1, category: 'laboratory' },
  'Hb': { itemName: 'Hemoglobin', quantity: 1, category: 'laboratory' },
  'Haemoglobin': { itemName: 'Hemoglobin', quantity: 1, category: 'laboratory' },
  'CBC': { itemName: 'Hemoglobin', quantity: 1, category: 'laboratory' },
  'Complete Blood Count': { itemName: 'Hemoglobin', quantity: 1, category: 'laboratory' },
  'Full Blood Count': { itemName: 'Hemoglobin', quantity: 1, category: 'laboratory' },
  'FBC': { itemName: 'Hemoglobin', quantity: 1, category: 'laboratory' },
  
  // Electrolytes
  'Sodium': { itemName: 'Serum Electrolytes Reagent', quantity: 1 },
  'Na': { itemName: 'Serum Electrolytes Reagent', quantity: 1 },
  'Potassium': { itemName: 'Serum Electrolytes Reagent', quantity: 1 },
  'K': { itemName: 'Serum Electrolytes Reagent', quantity: 1 },
  'Chloride': { itemName: 'Serum Electrolytes Reagent', quantity: 1 },
  'Cl': { itemName: 'Serum Electrolytes Reagent', quantity: 1 },
  
  // Kidney Function Tests
  'Creatinine': { itemName: 'Creatinine', quantity: 1 },
  'CR': { itemName: 'Creatinine', quantity: 1 },
  'Urea': { itemName: 'Urea', quantity: 1 },
  'BUN': { itemName: 'Urea', quantity: 1 },
  
  // Liver Function Tests
  'ALT': { itemName: 'ALT', quantity: 1 },
  'SGPT': { itemName: 'ALT', quantity: 1 },
  'AST': { itemName: 'AST', quantity: 1 },
  'SGOT': { itemName: 'AST', quantity: 1 },
  'Alkaline Phosphatase': { itemName: 'Alkaline Phosphatase', quantity: 1 },
  'ALP': { itemName: 'Alkaline Phosphatase', quantity: 1 },
  'GGT': { itemName: 'GGT', quantity: 1 },
  'Gamma Glutamyl Transferase': { itemName: 'GGT', quantity: 1 },
  'Bilirubin': { itemName: 'Bilirubin', quantity: 1 },
  'Total Bilirubin': { itemName: 'Bilirubin', quantity: 1 },
  'Albumin': { itemName: 'Albumin', quantity: 1 },
  'Total Protein': { itemName: 'Total Protein', quantity: 1 },
  
  // Lipid Profile
  'Cholesterol': { itemName: 'Cholesterol', quantity: 1 },
  'Total Cholesterol': { itemName: 'Cholesterol', quantity: 1 },
  'Triglycerides': { itemName: 'Triglycerides', quantity: 1 },
  'HDL': { itemName: 'HDL', quantity: 1 },
  'HDL Cholesterol': { itemName: 'HDL', quantity: 1 },
  'LDL': { itemName: 'LDL', quantity: 1 },
  'LDL Cholesterol': { itemName: 'LDL', quantity: 1 },
  
  // Diabetes Tests
  'HbA1c': { itemName: 'HbA1c', quantity: 1 },
  'A1C': { itemName: 'HbA1c', quantity: 1 },
  'Glycated Hemoglobin': { itemName: 'HbA1c', quantity: 1 },
  
  // Cardiac Markers
  'Troponin I': { itemName: 'Troponin I', quantity: 1 },
  'Troponin T': { itemName: 'Troponin T', quantity: 1 },
  'CK-MB': { itemName: 'CK-MB', quantity: 1 },
  'Creatine Kinase-MB': { itemName: 'CK-MB', quantity: 1 },
  'BNP': { itemName: 'BNP', quantity: 1 },
  'Brain Natriuretic Peptide': { itemName: 'BNP', quantity: 1 },
  
  // Coagulation Tests
  'Prothrombin Time': { itemName: 'Prothrombin Time', quantity: 1 },
  'PT': { itemName: 'Prothrombin Time', quantity: 1 },
  'INR': { itemName: 'INR', quantity: 1 },
  'International Normalized Ratio': { itemName: 'INR', quantity: 1 },
  'APTT': { itemName: 'APTT', quantity: 1 },
  'Activated Partial Thromboplastin Time': { itemName: 'APTT', quantity: 1 },
  'D-Dimer': { itemName: 'D-Dimer', quantity: 1 },
  'Fibrinogen': { itemName: 'Fibrinogen', quantity: 1 },
  
  // Thyroid Tests
  'TSH': { itemName: 'TSH', quantity: 1 },
  'Thyroid Stimulating Hormone': { itemName: 'TSH', quantity: 1 },
  'T4': { itemName: 'T4', quantity: 1 },
  'Thyroxine': { itemName: 'T4', quantity: 1 },
  'T3': { itemName: 'T3', quantity: 1 },
  'Triiodothyronine': { itemName: 'T3', quantity: 1 },
  
  // Hormone Tests
  'Cortisol': { itemName: 'Cortisol', quantity: 1 },
  'Testosterone': { itemName: 'Testosterone', quantity: 1 },
  'Estrogen': { itemName: 'Estrogen', quantity: 1 },
  'Progesterone': { itemName: 'Progesterone', quantity: 1 },
  'Insulin': { itemName: 'Insulin', quantity: 1 },
  'C-Peptide': { itemName: 'C-Peptide', quantity: 1 },
  
  // Tumor Markers
  'PSA': { itemName: 'PSA', quantity: 1 },
  'Prostate Specific Antigen': { itemName: 'PSA', quantity: 1 },
  'AFP': { itemName: 'AFP', quantity: 1 },
  'Alpha-Fetoprotein': { itemName: 'AFP', quantity: 1 },
  'CEA': { itemName: 'CEA', quantity: 1 },
  'Carcinoembryonic Antigen': { itemName: 'CEA', quantity: 1 },
  'CA-125': { itemName: 'CA-125', quantity: 1 },
  'CA 19-9': { itemName: 'CA 19-9', quantity: 1 },
  
  // Iron Studies
  'Iron': { itemName: 'Iron', quantity: 1 },
  'Serum Iron': { itemName: 'Iron', quantity: 1 },
  'Ferritin': { itemName: 'Ferritin', quantity: 1 },
  'TIBC': { itemName: 'TIBC', quantity: 1 },
  'Total Iron Binding Capacity': { itemName: 'TIBC', quantity: 1 },
  
  // Vitamin Tests
  'Vitamin D': { itemName: 'Vitamin D', quantity: 1 },
  '25-Hydroxy Vitamin D': { itemName: 'Vitamin D', quantity: 1 },
  'Vitamin B12': { itemName: 'Vitamin B12', quantity: 1 },
  'Cobalamin': { itemName: 'Vitamin B12', quantity: 1 },
  'Folate': { itemName: 'Folate', quantity: 1 },
  'Folic Acid': { itemName: 'Folate', quantity: 1 },
  
  // Infectious Disease Tests
  'HIV Test': { itemName: 'HIV Antibody', quantity: 1, category: 'laboratory' },
  'HIV Antibody': { itemName: 'HIV Antibody', quantity: 1, category: 'laboratory' },
  'HIV': { itemName: 'HIV Antibody', quantity: 1, category: 'laboratory' },
  'Hepatitis B': { itemName: 'Hepatitis B', quantity: 1 },
  'Hepatitis C': { itemName: 'Hepatitis C', quantity: 1 },
  'Syphilis Test': { itemName: 'Syphilis Test', quantity: 1 },
  'RPR': { itemName: 'Syphilis Test', quantity: 1 },
  'VDRL': { itemName: 'Syphilis Test', quantity: 1 },
  'Malaria Test': { itemName: 'Malaria Test Kit', quantity: 1 },
  'Malaria Rapid Test': { itemName: 'Malaria Test Kit', quantity: 1 },
  // FOBT (Fecal Occult Blood Test)
  'FOBT': { itemName: 'Fecal Occult Blood Test (FOBT)', quantity: 1, category: 'laboratory' },
  'Fecal Occult Blood Test': { itemName: 'Fecal Occult Blood Test (FOBT)', quantity: 1, category: 'laboratory' },
  'Fecal Occult Blood Test (FOBT)': { itemName: 'Fecal Occult Blood Test (FOBT)', quantity: 1, category: 'laboratory' },
  'Occult Blood': { itemName: 'Fecal Occult Blood Test (FOBT)', quantity: 1, category: 'laboratory' },
  'Stool Occult Blood': { itemName: 'Fecal Occult Blood Test (FOBT)', quantity: 1, category: 'laboratory' },
  'Occult Blood Test': { itemName: 'Fecal Occult Blood Test (FOBT)', quantity: 1, category: 'laboratory' },
  'FOB': { itemName: 'Fecal Occult Blood Test (FOBT)', quantity: 1, category: 'laboratory' },
  'Dengue Test': { itemName: 'Dengue Test', quantity: 1 },
  'Dengue NS1': { itemName: 'Dengue Test', quantity: 1 },
  'COVID-19 Test': { itemName: 'COVID-19 Test', quantity: 1 },
  'SARS-CoV-2': { itemName: 'COVID-19 Test', quantity: 1 },
  
  // ----------------------------------------------------------------------------
  // BODY FLUID TESTS - Point to LABORATORY category items
  // ----------------------------------------------------------------------------
  
  // Urinalysis
  'Urinalysis': { itemName: 'Complete Urinalysis', quantity: 1, category: 'laboratory' },
  'Complete Urinalysis': { itemName: 'Complete Urinalysis', quantity: 1, category: 'laboratory' },
  'Urine Analysis': { itemName: 'Complete Urinalysis', quantity: 1, category: 'laboratory' },
  'Urine Test': { itemName: 'Complete Urinalysis', quantity: 1, category: 'laboratory' },
  'Urine Routine': { itemName: 'Complete Urinalysis', quantity: 1, category: 'laboratory' },
  'Urine R/E': { itemName: 'Complete Urinalysis', quantity: 1, category: 'laboratory' },
  'Urine R&M': { itemName: 'Complete Urinalysis', quantity: 1, category: 'laboratory' },
  'Urine Routine & Microscopy': { itemName: 'Complete Urinalysis', quantity: 1, category: 'laboratory' },
  
  // Stool Examination
  'Stool Exam': { itemName: 'Stool Exam (Routine)', quantity: 1, category: 'laboratory' },
  'Stool Analysis': { itemName: 'Stool Exam (Routine)', quantity: 1, category: 'laboratory' },
  'Stool Exam (Routine)': { itemName: 'Stool Exam (Routine)', quantity: 1, category: 'laboratory' },
  'Stool Test': { itemName: 'Stool Exam (Routine)', quantity: 1, category: 'laboratory' },
  'Stool Routine': { itemName: 'Stool Exam (Routine)', quantity: 1, category: 'laboratory' },
  'Stool R/E': { itemName: 'Stool Exam (Routine)', quantity: 1, category: 'laboratory' },
  'Stool R&M': { itemName: 'Stool Exam (Routine)', quantity: 1, category: 'laboratory' },
  'Fecal Exam': { itemName: 'Stool Exam (Routine)', quantity: 1, category: 'laboratory' },
  'Sputum Culture': { itemName: 'Sputum Culture', quantity: 1 },
  'Sputum Analysis': { itemName: 'Sputum Culture', quantity: 1 },
  'Blood Culture': { itemName: 'Blood Culture', quantity: 1 },
  'Throat Culture': { itemName: 'Throat Culture', quantity: 1 },
  'Wound Culture': { itemName: 'Wound Culture', quantity: 1 },
  
  // ----------------------------------------------------------------------------
  // PREGNANCY TESTS
  // ----------------------------------------------------------------------------
  'HCG': { itemName: 'Urine HCG', quantity: 1, category: 'laboratory' },
  'Human Chorionic Gonadotropin': { itemName: 'Urine HCG', quantity: 1, category: 'laboratory' },
  'Urine HCG': { itemName: 'Urine HCG', quantity: 1, category: 'laboratory' },
  'Pregnancy Test': { itemName: 'Urine HCG', quantity: 1, category: 'laboratory' },
  'UPT': { itemName: 'Urine HCG', quantity: 1, category: 'laboratory' },
  'Urine Pregnancy Test': { itemName: 'Urine HCG', quantity: 1, category: 'laboratory' },
  'Beta HCG': { itemName: 'Urine HCG', quantity: 1, category: 'laboratory' },
  'β-HCG': { itemName: 'Urine HCG', quantity: 1, category: 'laboratory' },
  
  // Other Common Tests
  'Calcium': { itemName: 'Calcium', quantity: 1 },
  'Ca': { itemName: 'Calcium', quantity: 1 },
  'Phosphorus': { itemName: 'Phosphorus', quantity: 1 },
  'Phos': { itemName: 'Phosphorus', quantity: 1 },
  'Magnesium': { itemName: 'Magnesium', quantity: 1 },
  'Mg': { itemName: 'Magnesium', quantity: 1 },
  'Amylase': { itemName: 'Amylase', quantity: 1 },
  'Lipase': { itemName: 'Lipase', quantity: 1 },
  'Uric Acid': { itemName: 'Uric Acid', quantity: 1, category: 'laboratory' },
  'UA': { itemName: 'Uric Acid', quantity: 1, category: 'laboratory' },
  'Serum Uric Acid': { itemName: 'Uric Acid', quantity: 1, category: 'laboratory' },
  // CRP (C-Reactive Protein)
  'C-Reactive Protein': { itemName: 'CRP Fluid/Reagent (100 tests)', quantity: 1, category: 'laboratory' },
  'CRP': { itemName: 'CRP Fluid/Reagent (100 tests)', quantity: 1, category: 'laboratory' },
  'CRP Fluid/Reagent (100 tests)': { itemName: 'CRP Fluid/Reagent (100 tests)', quantity: 1, category: 'laboratory' },
  'CRP Fluid/Reagent': { itemName: 'CRP Fluid/Reagent (100 tests)', quantity: 1, category: 'laboratory' },
  'CRP Test': { itemName: 'CRP Fluid/Reagent (100 tests)', quantity: 1, category: 'laboratory' },
  'Quantitative CRP': { itemName: 'CRP Fluid/Reagent (100 tests)', quantity: 1, category: 'laboratory' },
  'High Sensitivity CRP': { itemName: 'CRP Fluid/Reagent (100 tests)', quantity: 1, category: 'laboratory' },
  'hs-CRP': { itemName: 'CRP Fluid/Reagent (100 tests)', quantity: 1, category: 'laboratory' },
  
  // ----------------------------------------------------------------------------
  // HEMATOLOGY TESTS - Updated to match actual inventory item names
  // ----------------------------------------------------------------------------
  
  // ESR (Erythrocyte Sedimentation Rate)
  'ESR': { itemName: 'Erythrocyte Sedimentation Rate (ESR)', quantity: 1, category: 'laboratory' },
  'Erythrocyte Sedimentation Rate': { itemName: 'Erythrocyte Sedimentation Rate (ESR)', quantity: 1, category: 'laboratory' },
  'Erythrocyte Sedimentation': { itemName: 'Erythrocyte Sedimentation Rate (ESR)', quantity: 1, category: 'laboratory' },
  'Sed Rate': { itemName: 'Erythrocyte Sedimentation Rate (ESR)', quantity: 1, category: 'laboratory' },
  'Erythrocyte Sedimentation Rate (ESR)': { itemName: 'Erythrocyte Sedimentation Rate (ESR)', quantity: 1, category: 'laboratory' },
  'Sedimentation Rate': { itemName: 'Erythrocyte Sedimentation Rate (ESR)', quantity: 1, category: 'laboratory' },
  
  // WBC (White Blood Cell Count)
  'WBC': { itemName: 'White Blood Cell Count', quantity: 1, category: 'laboratory' },
  'White Blood Cell Count': { itemName: 'White Blood Cell Count', quantity: 1, category: 'laboratory' },
  'White Blood Cell': { itemName: 'White Blood Cell Count', quantity: 1, category: 'laboratory' },
  'Leucocyte Count': { itemName: 'White Blood Cell Count', quantity: 1, category: 'laboratory' },
  'Leukocyte Count': { itemName: 'White Blood Cell Count', quantity: 1, category: 'laboratory' },
  'Total WBC': { itemName: 'White Blood Cell Count', quantity: 1, category: 'laboratory' },
  
  // RBC (Red Blood Cell Count)
  'RBC': { itemName: 'Red Blood Cell Count', quantity: 1, category: 'laboratory' },
  'Red Blood Cell Count': { itemName: 'Red Blood Cell Count', quantity: 1, category: 'laboratory' },
  'Red Blood Cell': { itemName: 'Red Blood Cell Count', quantity: 1, category: 'laboratory' },
  'Erythrocyte Count': { itemName: 'Red Blood Cell Count', quantity: 1, category: 'laboratory' },
  'Total RBC': { itemName: 'Red Blood Cell Count', quantity: 1, category: 'laboratory' },
  
  // Platelet Count
  'Platelet Count': { itemName: 'Platelet Count', quantity: 1, category: 'laboratory' },
  'Platelets': { itemName: 'Platelet Count', quantity: 1, category: 'laboratory' },
  'PLT': { itemName: 'Platelet Count', quantity: 1, category: 'laboratory' },
  'Thrombocytes': { itemName: 'Platelet Count', quantity: 1, category: 'laboratory' },
  'Thrombocyte Count': { itemName: 'Platelet Count', quantity: 1, category: 'laboratory' },
  
  // ----------------------------------------------------------------------------
  // SEROLOGICAL TESTS - Updated to match actual inventory item names
  // ----------------------------------------------------------------------------
  
  // ASO (Anti-Streptolysin O)
  'ASO': { itemName: 'ASO Fluid/Reagent', quantity: 1, category: 'laboratory' },
  'Anti-Streptolysin O': { itemName: 'ASO Fluid/Reagent', quantity: 1, category: 'laboratory' },
  'Anti-Streptolysin': { itemName: 'ASO Fluid/Reagent', quantity: 1, category: 'laboratory' },
  'ASTO': { itemName: 'ASO Fluid/Reagent', quantity: 1, category: 'laboratory' },
  'ASO Fluid/Reagent': { itemName: 'ASO Fluid/Reagent', quantity: 1, category: 'laboratory' },
  'ASO Titre': { itemName: 'ASO Fluid/Reagent', quantity: 1, category: 'laboratory' },
  'ASO Titer': { itemName: 'ASO Fluid/Reagent', quantity: 1, category: 'laboratory' },
  
  // Widal Test (Typhoid)
  'Widal': { itemName: 'Widal O & H Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Widal Test': { itemName: 'Widal O & H Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Typhoid Widal': { itemName: 'Widal O & H Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Widal O & H Test (100 tests)': { itemName: 'Widal O & H Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Widal O & H': { itemName: 'Widal O & H Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Widal O & H Test': { itemName: 'Widal O & H Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Typhoid Test': { itemName: 'Widal O & H Test (100 tests)', quantity: 1, category: 'laboratory' },
  
  'RF': { itemName: 'RF (Rheumatoid Factor)', quantity: 1, category: 'laboratory' },
  'Rheumatoid Factor': { itemName: 'RF (Rheumatoid Factor)', quantity: 1, category: 'laboratory' },
  
  // ----------------------------------------------------------------------------
  // INFECTIOUS DISEASE TESTS - Specific Pathogens
  // ----------------------------------------------------------------------------
  
  // H. pylori Test
  'H. pylori': { itemName: 'H. pylori Antigen', quantity: 1, category: 'laboratory' },
  'H. pylori Antigen': { itemName: 'H. pylori Antigen', quantity: 1, category: 'laboratory' },
  'Helicobacter pylori': { itemName: 'H. pylori Antigen', quantity: 1, category: 'laboratory' },
  'H pylori': { itemName: 'H. pylori Antigen', quantity: 1, category: 'laboratory' },
  'HP Antigen': { itemName: 'H. pylori Antigen', quantity: 1, category: 'laboratory' },
  'Helicobacter': { itemName: 'H. pylori Antigen', quantity: 1, category: 'laboratory' },
  
  // Weil-Felix Test (Rickettsial infections)
  'Weil-Felix': { itemName: 'Weil-Felix Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Weil-Felix Test': { itemName: 'Weil-Felix Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Weil-Felix Test (100 tests)': { itemName: 'Weil-Felix Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Weil Felix': { itemName: 'Weil-Felix Test (100 tests)', quantity: 1, category: 'laboratory' },
  'Rickettsial Test': { itemName: 'Weil-Felix Test (100 tests)', quantity: 1, category: 'laboratory' },
  
  // Hepatitis Tests - Point to actual inventory items
  'HBsAg': { itemName: 'Hepatitis B Surface Antigen', quantity: 1, category: 'laboratory' },
  'Hepatitis B Surface Antigen': { itemName: 'Hepatitis B Surface Antigen', quantity: 1, category: 'laboratory' },
  'Hepatitis B Surface Antigen (HBsAg)': { itemName: 'Hepatitis B Surface Antigen', quantity: 1, category: 'laboratory' },
  'Hepatitis B Surface Ag': { itemName: 'Hepatitis B Surface Antigen', quantity: 1, category: 'laboratory' },
  'Hepatitis B': { itemName: 'Hepatitis B Surface Antigen', quantity: 1, category: 'laboratory' },
  
  'Hepatitis C Antibody': { itemName: 'Hepatitis C Antibody', quantity: 1, category: 'laboratory' },
  'HCV Antibody': { itemName: 'Hepatitis C Antibody', quantity: 1, category: 'laboratory' },
  'Hepatitis C': { itemName: 'Hepatitis C Antibody', quantity: 1, category: 'laboratory' },
  'HCV': { itemName: 'Hepatitis C Antibody', quantity: 1, category: 'laboratory' },
  
  // VDRL/RPR Tests - Point to actual inventory items
  'VDRL/RPR': { itemName: 'VDRL/RPR', quantity: 1, category: 'laboratory' },
  'VDRL': { itemName: 'VDRL/RPR', quantity: 1, category: 'laboratory' },
  'RPR': { itemName: 'VDRL/RPR', quantity: 1, category: 'laboratory' },
  'Syphilis Test': { itemName: 'VDRL/RPR', quantity: 1, category: 'laboratory' },
  'Rapid Plasma Reagin': { itemName: 'VDRL/RPR', quantity: 1, category: 'laboratory' },
  'Venereal Disease Research Laboratory': { itemName: 'VDRL/RPR', quantity: 1, category: 'laboratory' }
}; 
