# Lab Reference Ranges - WHO Standards

## Overview

The laboratory system now includes comprehensive World Health Organization (WHO) standard reference ranges for common laboratory tests. These reference ranges are automatically populated when lab technicians enter test results.

## Features

### Automatic Population
- Reference ranges are automatically suggested based on test names
- WHO standards are applied for all supported test types
- Lab technicians can manually adjust ranges if needed

### WHO Standard Categories

#### Hematology Tests
- **Hemoglobin**: Male: 13.0-17.0 g/dL, Female: 12.0-15.0 g/dL
- **Hematocrit**: Male: 39-49%, Female: 36-46%
- **Platelets**: 150,000-400,000/μL
- **White Blood Cells**: 4,000-10,000/μL
- **Red Blood Cells**: Male: 4.5-5.9 × 10^6/μL, Female: 4.0-5.2 × 10^6/μL
- **MCV**: 80-100 fL
- **MCH**: 27-33 pg
- **MCHC**: 32-36 g/dL
- **RDW**: 11.5-14.5%
- **Differential Counts**: Neutrophils (40-70%), Lymphocytes (20-40%), Monocytes (2-8%), Eosinophils (1-4%), Basophils (0.5-1%)

#### Chemistry Tests
- **Fasting Glucose**: 70-100 mg/dL
- **Random Glucose**: 70-140 mg/dL
- **HbA1c**: < 6.5%
- **Sodium**: 135-145 mmol/L
- **Potassium**: 3.5-5.1 mmol/L
- **Chloride**: 98-107 mmol/L
- **Bicarbonate**: 23-29 mmol/L
- **Urea/BUN**: 6-20 mg/dL
- **Creatinine**: Male: 0.7-1.2 mg/dL, Female: 0.5-1.0 mg/dL
- **Cholesterol**: Total: < 200 mg/dL
- **Triglycerides**: < 150 mg/dL
- **HDL**: Male: > 40 mg/dL, Female: > 50 mg/dL
- **LDL**: < 100 mg/dL
- **Albumin**: 3.5-5.0 g/dL
- **Total Protein**: 6.0-8.3 g/dL
- **Uric Acid**: Male: 3.4-7.0 mg/dL, Female: 2.4-6.0 mg/dL

#### Liver Function Tests
- **ALT**: Male: 10-40 U/L, Female: 7-35 U/L
- **AST**: Male: 12-38 U/L, Female: 10-35 U/L
- **Alkaline Phosphatase**: 40-129 U/L
- **GGT**: Male: 8-61 U/L, Female: 5-36 U/L
- **Total Bilirubin**: 0.1-1.2 mg/dL
- **Direct Bilirubin**: 0.0-0.3 mg/dL
- **Indirect Bilirubin**: 0.1-0.9 mg/dL

#### Thyroid Function Tests
- **TSH**: 0.4-4.0 mIU/L
- **T3**: 80-200 ng/dL
- **T4**: 5.0-12.0 μg/dL
- **Free T3**: 2.3-4.2 pg/mL
- **Free T4**: 0.8-1.8 ng/dL

#### Electrolytes and Minerals
- **Calcium**: 8.5-10.5 mg/dL
- **Magnesium**: 1.7-2.2 mg/dL
- **Phosphorus**: 2.5-4.5 mg/dL
- **Iron**: Male: 60-170 μg/dL, Female: 50-170 μg/dL
- **Ferritin**: Male: 20-250 ng/mL, Female: 10-120 ng/mL

#### Vitamins
- **Vitamin D**: 30-100 ng/mL
- **Vitamin B12**: 200-900 pg/mL
- **Folate**: 2.0-20.0 ng/mL

#### Cardiac Markers
- **Troponin**: < 0.04 ng/mL
- **CK-MB**: < 5.0 ng/mL
- **BNP**: < 100 pg/mL

#### Kidney Function
- **eGFR**: > 90 mL/min/1.73m²
- **Cystatin C**: 0.53-0.95 mg/L

#### Immunology
- **HIV**: Non-reactive
- **CRP**: < 5 mg/L
- **ESR**: Male: 0-15 mm/hr, Female: 0-20 mm/hr
- **Rheumatoid Factor**: < 14 IU/mL
- **ANA**: Negative

#### Urinalysis
- **pH**: 4.5-8.0
- **Specific Gravity**: 1.005-1.030
- **Protein**: Negative
- **Glucose**: Negative
- **Blood**: Negative
- **Ketones**: Negative
- **Leukocytes**: Negative
- **Nitrites**: Negative

#### Stool Tests
- **Occult Blood**: Negative
- **Ova and Parasites**: Negative

#### Microbiology
- **Blood Culture**: No growth
- **Urine Culture**: < 10,000 CFU/mL
- **Sputum Culture**: Normal flora

## Usage in Lab Process

### For Lab Technicians
1. When entering lab results, reference ranges are automatically populated
2. Click the "WHO" button to manually populate WHO standards
3. Reference ranges can be manually edited if needed
4. The system validates that reference ranges are set before saving

### For Doctors and Nurses
1. Reference ranges are displayed alongside test results
2. Abnormal results are flagged based on WHO standards
3. Comprehensive lab reports include reference ranges

## Implementation Details

### Auto-Population Logic
The system uses pattern matching on test names to suggest appropriate reference ranges. For example:
- Tests containing "hemoglobin" get hemoglobin reference ranges
- Tests containing "glucose" and "fast" get fasting glucose ranges
- Tests containing "urinalysis" get urinalysis-specific guidance

### Fallback Behavior
If no WHO standard is available for a specific test:
1. The reference range field remains empty
2. Lab technicians can manually enter appropriate ranges
3. The system warns about missing reference ranges but doesn't block saving

### Data Storage
Reference ranges are stored as part of the lab result data and are included in:
- Lab result reports
- Patient medical records
- Doctor notifications
- Comprehensive lab reports

## Benefits

1. **Standardization**: All lab results use consistent WHO standards
2. **Accuracy**: Reduces errors from manual reference range entry
3. **Efficiency**: Saves time for lab technicians
4. **Quality**: Ensures international standard compliance
5. **Education**: Helps staff learn appropriate reference ranges

## Future Enhancements

- Age-specific reference ranges
- Pregnancy-specific ranges
- Pediatric reference ranges
- Local laboratory-specific adjustments
- Integration with external reference range databases 