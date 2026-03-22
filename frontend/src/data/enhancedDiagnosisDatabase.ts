/*
  Enhanced Diagnosis Database
  Includes NHDD, ICD-10, and ICD-11 coding information.
  This file is shared between EnhancedMedicalRecordForm and ModernMedicalRecordForm.
*/

export interface DiagnosisEntry {
  nhdd: string;
  icd10: string;
  icd11: string;
  diagnosis: string;
  category: string;
  subcategory: string;
  severity: string;
  commonTerms: string[];
  nhddDescription: string;
  icd11Chapter: string;
  icd11Block: string;
}

// NOTE: This is a subset for demonstration. Extend as needed.
// The full list is defined in EnhancedMedicalRecordForm. To avoid duplication,
// consider extracting the array programmatically or maintaining in a JSON file.

export const enhancedDiagnosisDatabase: DiagnosisEntry[] = [
  // CHAPTER 12: Diseases of the respiratory system (CA00–CE9Z)
  {
    nhdd: 'RESP001',
    icd10: 'J06.9',
    icd11: 'CA40.Z',
    diagnosis: 'Upper respiratory tract infection, acute, unspecified',
    category: 'Respiratory Disorders',
    subcategory: 'Upper Respiratory Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['common cold', 'URTI', 'head cold'],
    nhddDescription: 'Acute inflammatory condition of upper respiratory tract structures',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
  },
  {
    nhdd: 'RESP002',
    icd10: 'J20.9',
    icd11: 'CA20.0',
    diagnosis: 'Acute bronchitis, unspecified organism',
    category: 'Respiratory Disorders',
    subcategory: 'Lower Respiratory Infections',
    severity: 'Moderate',
    commonTerms: ['acute bronchitis', 'chest infection'],
    nhddDescription: 'Acute inflammation of bronchial tubes',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA20-CA2Z Acute lower respiratory infections'
  },
  {
    nhdd: 'RESP003',
    icd10: 'J44.1',
    icd11: 'CB03.1',
    diagnosis: 'Chronic obstructive pulmonary disease with acute exacerbation',
    category: 'Respiratory Disorders',
    subcategory: 'Chronic Obstructive Disorders',
    severity: 'Severe',
    commonTerms: ['COPD exacerbation', 'emphysema flare'],
    nhddDescription: 'Worsening of chronic airway obstruction with increased symptoms',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CB00-CB0Z Chronic obstructive pulmonary disease'
  },
  {
    nhdd: 'RESP004',
    icd10: 'J45.9',
    icd11: 'CA25.9',
    diagnosis: 'Asthma, unspecified type',
    category: 'Respiratory Disorders',
    subcategory: 'Allergic and Reactive Disorders',
    severity: 'Variable',
    commonTerms: ['asthma', 'bronchial asthma', 'reactive airway'],
    nhddDescription: 'Chronic inflammatory disorder of airways with reversible obstruction',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA25-CA2Z Asthma or reactive airways disease'
  },
  {
    nhdd: 'RESP005',
    icd10: 'J03.90',
    icd11: 'CA40.0',
    diagnosis: 'Acute tonsillitis, unspecified',
    category: 'Respiratory Disorders',
    subcategory: 'Upper Respiratory Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['tonsillitis', 'acute tonsillitis', 'sore throat'],
    nhddDescription: 'Acute inflammation of the tonsils',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
  },
  {
    nhdd: 'RESP006',
    icd10: 'J03.00',
    icd11: 'CA40.1',
    diagnosis: 'Acute streptococcal tonsillitis',
    category: 'Respiratory Disorders',
    subcategory: 'Upper Respiratory Infections',
    severity: 'Moderate',
    commonTerms: ['strep throat', 'streptococcal tonsillitis', 'bacterial tonsillitis'],
    nhddDescription: 'Acute inflammation of tonsils caused by streptococcal bacteria',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
  },
  {
    nhdd: 'RESP007',
    icd10: 'J03.80',
    icd11: 'CA40.2',
    diagnosis: 'Acute exudative tonsillitis',
    category: 'Respiratory Disorders',
    subcategory: 'Upper Respiratory Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['exudative tonsillitis', 'purulent tonsillitis', 'tonsillitis with exudate'],
    nhddDescription: 'Acute tonsillitis with visible exudate or pus on tonsils',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
  },
  {
    nhdd: 'RESP011',
    icd10: 'J01.90',
    icd11: 'CA40.3',
    diagnosis: 'Acute sinusitis, unspecified',
    category: 'Respiratory Disorders',
    subcategory: 'Upper Respiratory Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['sinusitis', 'acute sinusitis', 'sinus infection', 'rhinosinusitis'],
    nhddDescription: 'Acute inflammation of the paranasal sinuses',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
  },
  {
    nhdd: 'RESP012',
    icd10: 'J32.9',
    icd11: 'CA41.0',
    diagnosis: 'Chronic sinusitis, unspecified',
    category: 'Respiratory Disorders',
    subcategory: 'Upper Respiratory Infections',
    severity: 'Moderate',
    commonTerms: ['chronic sinusitis', 'persistent sinusitis', 'recurrent sinusitis'],
    nhddDescription: 'Chronic inflammation of the paranasal sinuses lasting more than 12 weeks',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA41-CA4Z Chronic upper respiratory infections'
  },
  {
    nhdd: 'RESP008',
    icd10: 'J18.9',
    icd11: 'CA40.1',
    diagnosis: 'Pneumonia, organism unspecified',
    category: 'Respiratory Disorders',
    subcategory: 'Lower Respiratory Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['pneumonia', 'lung infection'],
    nhddDescription: 'Acute infection of lung parenchyma',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
  },
  {
    nhdd: 'RESP006',
    icd10: 'J02.9',
    icd11: 'CA41.9',
    diagnosis: 'Acute pharyngitis, unspecified',
    category: 'Respiratory Disorders',
    subcategory: 'Upper Respiratory Infections',
    severity: 'Mild',
    commonTerms: ['sore throat', 'pharyngitis', 'throat infection'],
    nhddDescription: 'Acute inflammation of pharyngeal structures',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
  },
  {
    nhdd: 'RESP007',
    icd10: 'J30.9',
    icd11: 'CA08.Z',
    diagnosis: 'Allergic rhinitis, unspecified',
    category: 'Respiratory Disorders',
    subcategory: 'Allergic and Reactive Disorders',
    severity: 'Mild',
    commonTerms: ['hay fever', 'allergic rhinitis', 'seasonal allergies'],
    nhddDescription: 'Allergic inflammation of nasal mucosa',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA08-CA0Z Allergic or hypersensitivity conditions of respiratory system'
  },

  // CHAPTER 11: Diseases of the circulatory system (BA00–BE2Z)
  {
    nhdd: 'CARD001',
    icd10: 'I10',
    icd11: 'BA00.Z',
    diagnosis: 'Essential hypertension',
    category: 'Cardiovascular Disorders',
    subcategory: 'Hypertensive Diseases',
    severity: 'Mild to Severe',
    commonTerms: ['high blood pressure', 'hypertension', 'HTN'],
    nhddDescription: 'Persistently elevated arterial blood pressure of unknown cause',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BA00-BA0Z Hypertensive diseases'
  },
  {
    nhdd: 'CARD002',
    icd10: 'I25.10',
    icd11: 'BA80.0',
    diagnosis: 'Atherosclerotic heart disease without angina',
    category: 'Cardiovascular Disorders',
    subcategory: 'Ischemic Heart Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['coronary artery disease', 'CAD', 'atherosclerosis'],
    nhddDescription: 'Narrowing of coronary arteries due to atherosclerotic plaque',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BA80-BA8Z Ischaemic heart diseases'
  },
  {
    nhdd: 'CARD003',
    icd10: 'I48.91',
    icd11: 'BC61.0',
    diagnosis: 'Atrial fibrillation, unspecified type',
    category: 'Cardiovascular Disorders',
    subcategory: 'Cardiac Arrhythmias',
    severity: 'Moderate',
    commonTerms: ['atrial fibrillation', 'A-fib', 'irregular heartbeat'],
    nhddDescription: 'Irregular and rapid heart rate due to disorganized atrial activity',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BC60-BC6Z Cardiac arrhythmias'
  },
  {
    nhdd: 'CARD004',
    icd10: 'I50.9',
    icd11: 'BD10.Z',
    diagnosis: 'Heart failure, unspecified',
    category: 'Cardiovascular Disorders',
    subcategory: 'Heart Failure Syndromes',
    severity: 'Moderate to Severe',
    commonTerms: ['heart failure', 'congestive heart failure', 'CHF'],
    nhddDescription: 'Inability of heart to pump blood effectively to meet body needs',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BD10-BD1Z Heart failure'
  },
  {
    nhdd: 'CARD005',
    icd10: 'I21.9',
    icd11: 'BA41.Z',
    diagnosis: 'Acute myocardial infarction, unspecified',
    category: 'Cardiovascular Disorders',
    subcategory: 'Acute Coronary Syndromes',
    severity: 'Severe',
    commonTerms: ['heart attack', 'MI', 'myocardial infarction'],
    nhddDescription: 'Death of heart muscle due to insufficient blood supply',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BA40-BA4Z Acute ischaemic heart disease'
  },

  // CHAPTER 05: Endocrine, nutritional or metabolic diseases (5A00–5D9Z)
  {
    nhdd: 'ENDO001',
    icd10: 'E11.9',
    icd11: '5A11.0',
    diagnosis: 'Type 2 diabetes mellitus without complications',
    category: 'Endocrine and Metabolic Disorders',
    subcategory: 'Diabetes Mellitus',
    severity: 'Moderate',
    commonTerms: ['diabetes', 'type 2 diabetes', 'adult onset diabetes'],
    nhddDescription: 'Chronic disorder of glucose metabolism with insulin resistance',
    icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5A10-5A1Z Type 2 diabetes mellitus'
  },
  {
    nhdd: 'ENDO002',
    icd10: 'E10.9',
    icd11: '5A10.0',
    diagnosis: 'Type 1 diabetes mellitus without complications',
    category: 'Endocrine and Metabolic Disorders',
    subcategory: 'Diabetes Mellitus',
    severity: 'Moderate to Severe',
    commonTerms: ['type 1 diabetes', 'juvenile diabetes', 'insulin dependent diabetes'],
    nhddDescription: 'Autoimmune destruction of pancreatic beta cells requiring insulin',
    icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5A10-5A1Z Type 1 diabetes mellitus'
  },
  {
    nhdd: 'ENDO003',
    icd10: 'E03.9',
    icd11: '5A00.0',
    diagnosis: 'Hypothyroidism, unspecified',
    category: 'Endocrine and Metabolic Disorders',
    subcategory: 'Thyroid Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['underactive thyroid', 'hypothyroidism', 'low thyroid'],
    nhddDescription: 'Deficient production of thyroid hormones',
    icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5A00-5A0Z Disorders of thyroid gland'
  },
  {
    nhdd: 'ENDO004',
    icd10: 'E78.5',
    icd11: '5C80.Z',
    diagnosis: 'Hyperlipidemia, unspecified',
    category: 'Endocrine and Metabolic Disorders',
    subcategory: 'Lipid Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['high cholesterol', 'hyperlipidemia', 'dyslipidemia'],
    nhddDescription: 'Elevated levels of lipids in blood',
    icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5C80-5C8Z Disorders of lipoprotein metabolism or lipidoses'
  },

  // CHAPTER 15: Diseases of the musculoskeletal system or connective tissue (FA00–FC0Z)
  {
    nhdd: 'MUSC001',
    icd10: 'M54.5',
    icd11: 'FB56.Z',
    diagnosis: 'Low back pain',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Spinal Disorders',
    severity: 'Mild to Severe',
    commonTerms: ['lower back pain', 'lumbago', 'lumbar pain'],
    nhddDescription: 'Pain in the lumbar region of the spine',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FB50-FB5Z Dorsalgia'
  },
  {
    nhdd: 'MUSC002',
    icd10: 'M25.511',
    icd11: 'FB40.1',
    diagnosis: 'Pain in right shoulder',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Joint Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['shoulder pain', 'right shoulder ache'],
    nhddDescription: 'Pain localized to right shoulder joint and surrounding structures',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FB40-FB4Z Arthralgia'
  },
  {
    nhdd: 'MUSC003',
    icd10: 'M79.1',
    icd11: 'FB00.Z',
    diagnosis: 'Myalgia, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Muscle Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['muscle pain', 'myalgia', 'muscle aches'],
    nhddDescription: 'Pain in muscle tissue',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FB00-FB0Z Myalgia'
  },
  {
    nhdd: 'MUSC009',
    icd10: 'M54.30',
    icd11: 'ME84.3',
    diagnosis: 'Sciatica',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Radiculopathies',
    severity: 'Mild to Severe',
    commonTerms: ['sciatica', 'sciatic neuralgia', 'ischialgia'],
    nhddDescription: 'Pain radiating along the sciatic nerve pathway',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'ME84-ME8Z Radiculopathy'
  },
  {
    nhdd: 'NEUR010',
    icd10: 'G57.00',
    icd11: '8C11.0',
    diagnosis: 'Lesion of sciatic nerve',
    category: 'Neurological Disorders',
    subcategory: 'Peripheral Nerve Disorders',
    severity: 'Variable',
    commonTerms: ['sciatic nerve lesion', 'sciatic neuropathy', 'sciatic neuritis'],
    nhddDescription: 'Injury or disease affecting the sciatic nerve',
    icd11Chapter: 'Chapter 08: Diseases of the nervous system',
    icd11Block: '8C11-8C1Z Lesions of individual nerves'
  },
  {
    nhdd: 'MUSC004',
    icd10: 'M06.9',
    icd11: 'FA20.Z',
    diagnosis: 'Rheumatoid arthritis, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Inflammatory Joint Diseases',
    severity: 'Moderate to Severe',
    commonTerms: ['rheumatoid arthritis', 'RA', 'inflammatory arthritis'],
    nhddDescription: 'Chronic autoimmune inflammatory disease affecting joints',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA20-FA2Z Rheumatoid arthritis'
  },
  {
    nhdd: 'MUSC005',
    icd10: 'M79.3',
    icd11: 'FB00.1',
    diagnosis: 'Fibromyalgia',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Soft Tissue Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['fibromyalgia', 'fibromyalgia syndrome', 'chronic pain syndrome'],
    nhddDescription: 'Chronic widespread pain disorder with tender points',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FB00-FB0Z Soft tissue disorders'
  },
  {
    nhdd: 'MUSC006',
    icd10: 'M19.90',
    icd11: 'FA00.Z',
    diagnosis: 'Osteoarthritis, unspecified site',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Degenerative Joint Diseases',
    severity: 'Mild to Severe',
    commonTerms: ['osteoarthritis', 'OA', 'degenerative arthritis', 'wear and tear arthritis'],
    nhddDescription: 'Degenerative joint disease characterized by cartilage breakdown',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA00-FA0Z Osteoarthritis'
  },
  {
    nhdd: 'MUSC007',
    icd10: 'M17.9',
    icd11: 'FA00.0',
    diagnosis: 'Osteoarthritis of knee, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Degenerative Joint Diseases',
    severity: 'Moderate to Severe',
    commonTerms: ['knee osteoarthritis', 'knee arthritis', 'gonarthrosis', 'knee OA'],
    nhddDescription: 'Degenerative joint disease of the knee',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA00-FA0Z Osteoarthritis'
  },
  {
    nhdd: 'MUSC008',
    icd10: 'M16.9',
    icd11: 'FA00.1',
    diagnosis: 'Osteoarthritis of hip, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Degenerative Joint Diseases',
    severity: 'Moderate to Severe',
    commonTerms: ['hip osteoarthritis', 'hip arthritis', 'coxarthrosis', 'hip OA'],
    nhddDescription: 'Degenerative joint disease of the hip',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA00-FA0Z Osteoarthritis'
  },

  // CHAPTER 13: Diseases of the digestive system (DA00–DE2Z)
  {
    nhdd: 'DIGE001',
    icd10: 'K21.9',
    icd11: 'DA22.0',
    diagnosis: 'Gastroesophageal reflux disease without esophagitis',
    category: 'Digestive System Disorders',
    subcategory: 'Esophageal Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['GERD', 'acid reflux', 'heartburn'],
    nhddDescription: 'Chronic condition where stomach acid refluxes into esophagus',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA20-DA2Z Diseases of oesophagus'
  },
  {
    nhdd: 'DIGE002',
    icd10: 'K29.70',
    icd11: 'DA40.Z',
    diagnosis: 'Gastritis, unspecified, without bleeding',
    category: 'Digestive System Disorders',
    subcategory: 'Gastric Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['gastritis', 'stomach inflammation'],
    nhddDescription: 'Inflammation of stomach lining',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA40-DA4Z Diseases of stomach or duodenum'
  },
  {
    nhdd: 'DIGE003',
    icd10: 'K59.00',
    icd11: 'DD70.0',
    diagnosis: 'Constipation, unspecified',
    category: 'Digestive System Disorders',
    subcategory: 'Functional Bowel Disorders',
    severity: 'Mild',
    commonTerms: ['constipation', 'hard stools', 'irregular bowel movements'],
    nhddDescription: 'Difficulty or infrequent bowel movements',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DD70-DD7Z Constipation'
  },
  {
    nhdd: 'DIGE004',
    icd10: 'K58.9',
    icd11: 'DD91.Z',
    diagnosis: 'Irritable bowel syndrome, unspecified',
    category: 'Digestive System Disorders',
    subcategory: 'Functional Bowel Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['IBS', 'irritable bowel syndrome', 'spastic colon', 'functional bowel disorder'],
    nhddDescription: 'Chronic functional disorder of the large intestine',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DD91-DD9Z Irritable bowel syndrome'
  },
  {
    nhdd: 'DIGE005',
    icd10: 'K59.1',
    icd11: 'DD71.Z',
    diagnosis: 'Diarrhea, unspecified',
    category: 'Digestive System Disorders',
    subcategory: 'Functional Bowel Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['diarrhea', 'loose stools', 'watery bowel movements'],
    nhddDescription: 'Frequent loose or watery bowel movements',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DD71-DD7Z Diarrhea'
  },

  // CHAPTER 16: Diseases of the genitourinary system (GA00–GC5Z)
  {
    nhdd: 'GENI001',
    icd10: 'N39.0',
    icd11: 'GC08.Z',
    diagnosis: 'Urinary tract infection, site unspecified',
    category: 'Genitourinary Disorders',
    subcategory: 'Urinary Tract Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['UTI', 'urinary tract infection', 'bladder infection'],
    nhddDescription: 'Bacterial infection of urinary system',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GC08-GC0Z Cystitis or urethritis'
  },
  {
    nhdd: 'GENI002',
    icd10: 'N18.6',
    icd11: 'GB61.Z',
    diagnosis: 'End stage renal disease',
    category: 'Genitourinary Disorders',
    subcategory: 'Chronic Kidney Disease',
    severity: 'Severe',
    commonTerms: ['kidney failure', 'ESRD', 'renal failure'],
    nhddDescription: 'Final stage of chronic kidney disease requiring dialysis or transplant',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GB60-GB6Z Chronic kidney disease'
  },

  // CHAPTER 06: Mental, behavioural or neurodevelopmental disorders (6A00–6E8Z)
  {
    nhdd: 'MENT001',
    icd10: 'F32.9',
    icd11: '6A70.Z',
    diagnosis: 'Major depressive disorder, single episode, unspecified',
    category: 'Mental Health Disorders',
    subcategory: 'Mood Disorders',
    severity: 'Mild to Severe',
    commonTerms: ['depression', 'major depression', 'depressive episode'],
    nhddDescription: 'Persistent feelings of sadness and loss of interest in activities',
    icd11Chapter: 'Chapter 06: Mental, behavioural or neurodevelopmental disorders',
    icd11Block: '6A70-6A7Z Single episode depressive disorder'
  },
  {
    nhdd: 'MENT002',
    icd10: 'F41.1',
    icd11: '6B00.Z',
    diagnosis: 'Generalized anxiety disorder',
    category: 'Mental Health Disorders',
    subcategory: 'Anxiety Disorders',
    severity: 'Mild to Severe',
    commonTerms: ['anxiety', 'generalized anxiety', 'GAD'],
    nhddDescription: 'Excessive and persistent worry about various aspects of life',
    icd11Chapter: 'Chapter 06: Mental, behavioural or neurodevelopmental disorders',
    icd11Block: '6B00-6B0Z Anxiety or fear-related disorders'
  },
  {
    nhdd: 'MENT003',
    icd10: 'G47.00',
    icd11: '7A00.Z',
    diagnosis: 'Insomnia, unspecified',
    category: 'Mental Health Disorders',
    subcategory: 'Sleep Disorders',
    severity: 'Mild to Severe',
    commonTerms: ['insomnia', 'sleep disorder', 'trouble sleeping', 'sleeplessness'],
    nhddDescription: 'Difficulty falling asleep, staying asleep, or poor sleep quality',
    icd11Chapter: 'Chapter 07: Sleep-wake disorders',
    icd11Block: '7A00-7A0Z Insomnia disorders'
  },
  {
    nhdd: 'MENT004',
    icd10: 'F48.0',
    icd11: '6C20.Z',
    diagnosis: 'Neurasthenia',
    category: 'Mental Health Disorders',
    subcategory: 'Somatic Symptom Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['chronic fatigue syndrome', 'neurasthenia', 'exhaustion syndrome'],
    nhddDescription: 'Chronic fatigue and weakness without apparent physical cause',
    icd11Chapter: 'Chapter 06: Mental, behavioural or neurodevelopmental disorders',
    icd11Block: '6C20-6C2Z Bodily distress disorder'
  },

  // CHAPTER 01: Certain infectious or parasitic diseases (1A00–1H0Z)
  {
    nhdd: 'INFE001',
    icd10: 'B34.9',
    icd11: '1D62.Z',
    diagnosis: 'Viral infection, unspecified',
    category: 'Infectious Diseases',
    subcategory: 'Viral Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['viral infection', 'virus', 'viral syndrome'],
    nhddDescription: 'Infection caused by viral pathogen',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1D60-1D6Z Viral infections of the central nervous system'
  },
  {
    nhdd: 'INFE002',
    icd10: 'A09',
    icd11: '1A40.Z',
    diagnosis: 'Infectious gastroenteritis and colitis, unspecified',
    category: 'Infectious Diseases',
    subcategory: 'Gastrointestinal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['gastroenteritis', 'stomach flu', 'food poisoning'],
    nhddDescription: 'Infection causing inflammation of stomach and intestines',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A40-1A4Z Bacterial intestinal infections'
  },

  // CHAPTER 21: Symptoms, signs or clinical findings, not elsewhere classified (MA00–MH2Z)
  {
    nhdd: 'SYMP001',
    icd10: 'R50.9',
    icd11: 'MA01.Z',
    diagnosis: 'Fever, unspecified',
    category: 'Signs and Symptoms',
    subcategory: 'General Symptoms',
    severity: 'Mild to Moderate',
    commonTerms: ['fever', 'pyrexia', 'elevated temperature'],
    nhddDescription: 'Elevation of body temperature above normal range',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings, not elsewhere classified',
    icd11Block: 'MA01-MA0Z Fever'
  },
  {
    nhdd: 'SYMP002',
    icd10: 'R51',
    icd11: 'MB40.Z',
    diagnosis: 'Headache',
    category: 'Signs and Symptoms',
    subcategory: 'Neurological Symptoms',
    severity: 'Mild to Severe',
    commonTerms: ['headache', 'head pain', 'cephalgia'],
    nhddDescription: 'Pain in head or upper neck region',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings, not elsewhere classified',
    icd11Block: 'MB40-MB4Z Pain in head or neck'
  },

  // CHAPTER 08: Diseases of the nervous system (8A00–8E7Z)
  {
    nhdd: 'NEUR001',
    icd10: 'G43.9',
    icd11: '8A80.4',
    diagnosis: 'Migraine, unspecified',
    category: 'Neurological Disorders',
    subcategory: 'Primary Headache Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['migraine', 'migraine headache', 'vascular headache'],
    nhddDescription: 'Recurrent severe headache often with nausea and light sensitivity',
    icd11Chapter: 'Chapter 08: Diseases of the nervous system',
    icd11Block: '8A80-8A8Z Primary headache disorders'
  },
  {
    nhdd: 'NEUR002',
    icd10: 'G40.9',
    icd11: '8A61.Z',
    diagnosis: 'Epilepsy, unspecified',
    category: 'Neurological Disorders',
    subcategory: 'Seizure Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['epilepsy', 'seizure disorder', 'convulsions'],
    nhddDescription: 'Chronic neurological disorder characterized by recurrent seizures',
    icd11Chapter: 'Chapter 08: Diseases of the nervous system',
    icd11Block: '8A60-8A6Z Epilepsy or seizures'
  },

  // CHAPTER 09: Diseases of the visual system (9A00–9D80)
  {
    nhdd: 'OPHT001',
    icd10: 'H52.4',
    icd11: '9D00.0',
    diagnosis: 'Presbyopia',
    category: 'Eye Disorders',
    subcategory: 'Refractive Disorders',
    severity: 'Mild',
    commonTerms: ['presbyopia', 'age-related farsightedness', 'reading glasses needed'],
    nhddDescription: 'Age-related decline in near vision due to lens hardening',
    icd11Chapter: 'Chapter 09: Diseases of the visual system',
    icd11Block: '9D00-9D0Z Disorders of refraction or accommodation'
  },
  {
    nhdd: 'OPHT002',
    icd10: 'H10.9',
    icd11: '9A60.Z',
    diagnosis: 'Conjunctivitis, unspecified',
    category: 'Eye Disorders',
    subcategory: 'Inflammatory Eye Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['conjunctivitis', 'pink eye', 'eye infection', 'red eye'],
    nhddDescription: 'Inflammation of the conjunctiva',
    icd11Chapter: 'Chapter 09: Diseases of the visual system',
    icd11Block: '9A60-9A6Z Disorders of conjunctiva'
  },
  {
    nhdd: 'OPHT003',
    icd10: 'H10.1',
    icd11: '9A60.0',
    diagnosis: 'Acute atopic conjunctivitis',
    category: 'Eye Disorders',
    subcategory: 'Inflammatory Eye Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['allergic conjunctivitis', 'atopic conjunctivitis', 'allergic pink eye'],
    nhddDescription: 'Allergic inflammation of the conjunctiva',
    icd11Chapter: 'Chapter 09: Diseases of the visual system',
    icd11Block: '9A60-9A6Z Disorders of conjunctiva'
  },
  {
    nhdd: 'OPHT004',
    icd10: 'H10.0',
    icd11: '9A60.1',
    diagnosis: 'Acute mucopurulent conjunctivitis',
    category: 'Eye Disorders',
    subcategory: 'Inflammatory Eye Conditions',
    severity: 'Moderate',
    commonTerms: ['bacterial conjunctivitis', 'purulent conjunctivitis', 'infectious pink eye'],
    nhddDescription: 'Bacterial infection of the conjunctiva with purulent discharge',
    icd11Chapter: 'Chapter 09: Diseases of the visual system',
    icd11Block: '9A60-9A6Z Disorders of conjunctiva'
  },

  // CHAPTER 10: Diseases of the ear or mastoid process (AA00–AB5Z)
  {
    nhdd: 'ENT001',
    icd10: 'H66.9',
    icd11: 'AA40.Z',
    diagnosis: 'Otitis media, unspecified',
    category: 'Ear Disorders',
    subcategory: 'Middle Ear Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['ear infection', 'otitis media', 'middle ear infection'],
    nhddDescription: 'Inflammation of middle ear space',
    icd11Chapter: 'Chapter 10: Diseases of the ear or mastoid process',
    icd11Block: 'AA40-AA4Z Nonsuppurative otitis media'
  },

  // Miscellaneous additional conditions
  {
    nhdd: 'SKIN001',
    icd10: 'L30.9',
    icd11: 'EA85.Z',
    diagnosis: 'Dermatitis, unspecified',
    category: 'Skin Disorders',
    subcategory: 'Inflammatory Skin Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['dermatitis', 'eczema', 'skin inflammation'],
    nhddDescription: 'Inflammation of the skin',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'EA85-EA8Z Dermatitis or eczema'
  },
  {
    nhdd: 'SKIN002',
    icd10: 'L20.9',
    icd11: 'EA80.Z',
    diagnosis: 'Atopic dermatitis, unspecified',
    category: 'Skin Disorders',
    subcategory: 'Inflammatory Skin Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['atopic dermatitis', 'atopic eczema', 'allergic dermatitis'],
    nhddDescription: 'Chronic inflammatory skin condition associated with allergies',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'EA80-EA8Z Atopic dermatitis'
  },
  {
    nhdd: 'SKIN003',
    icd10: 'L03.90',
    icd11: 'AB70.Z',
    diagnosis: 'Cellulitis, unspecified',
    category: 'Skin Disorders',
    subcategory: 'Infectious Skin Conditions',
    severity: 'Moderate to Severe',
    commonTerms: ['cellulitis', 'skin infection', 'soft tissue infection'],
    nhddDescription: 'Bacterial infection of the skin and underlying tissues',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'AB70-AB7Z Cellulitis'
  },
  {
    nhdd: 'SKIN004',
    icd10: 'L70.9',
    icd11: 'ED80.Z',
    diagnosis: 'Acne, unspecified',
    category: 'Skin Disorders',
    subcategory: 'Sebaceous Gland Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['acne', 'pimples', 'acne vulgaris', 'breakouts'],
    nhddDescription: 'Inflammatory condition of the sebaceous glands',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'ED80-ED8Z Acne'
  },

  // ESV-ICD-11: Ethiopia Simplified Version - Common Infectious Diseases
  {
    nhdd: 'ESV001',
    icd10: 'A01.0',
    icd11: '1A00.0',
    diagnosis: 'Typhoid fever',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['typhoid', 'typhoid fever', 'enteric fever', 'salmonella typhi'],
    nhddDescription: 'Systemic infection caused by Salmonella typhi',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A00-1A0Z Typhoid fever'
  },
  {
    nhdd: 'ESV002',
    icd10: 'A01.1',
    icd11: '1A00.1',
    diagnosis: 'Paratyphoid fever A',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['paratyphoid', 'paratyphoid fever', 'salmonella paratyphi'],
    nhddDescription: 'Systemic infection caused by Salmonella paratyphi A',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A00-1A0Z Typhoid fever'
  },
  {
    nhdd: 'ESV003',
    icd10: 'A01.2',
    icd11: '1A00.2',
    diagnosis: 'Paratyphoid fever B',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['paratyphoid B', 'paratyphoid fever B', 'salmonella paratyphi B'],
    nhddDescription: 'Systemic infection caused by Salmonella paratyphi B',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A00-1A0Z Typhoid fever'
  },
  {
    nhdd: 'ESV004',
    icd10: 'A01.3',
    icd11: '1A00.3',
    diagnosis: 'Paratyphoid fever C',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['paratyphoid C', 'paratyphoid fever C', 'salmonella paratyphi C'],
    nhddDescription: 'Systemic infection caused by Salmonella paratyphi C',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A00-1A0Z Typhoid fever'
  },
  {
    nhdd: 'ESV005',
    icd10: 'A01.4',
    icd11: '1A00.Z',
    diagnosis: 'Paratyphoid fever, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['paratyphoid fever', 'paratyphoid', 'enteric fever'],
    nhddDescription: 'Systemic infection caused by Salmonella paratyphi, unspecified type',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A00-1A0Z Typhoid fever'
  },

  // ESV-ICD-11: Malaria
  {
    nhdd: 'ESV006',
    icd10: 'B50.9',
    icd11: '1F40.Z',
    diagnosis: 'Plasmodium falciparum malaria, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['malaria', 'falciparum malaria', 'cerebral malaria', 'severe malaria'],
    nhddDescription: 'Malaria caused by Plasmodium falciparum',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F40-1F4Z Malaria'
  },
  {
    nhdd: 'ESV007',
    icd10: 'B51.9',
    icd11: '1F41.Z',
    diagnosis: 'Plasmodium vivax malaria, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['vivax malaria', 'benign malaria', 'tertian malaria'],
    nhddDescription: 'Malaria caused by Plasmodium vivax',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F40-1F4Z Malaria'
  },

  // ESV-ICD-11: Tuberculosis
  {
    nhdd: 'ESV008',
    icd10: 'A15.3',
    icd11: '1B10.0',
    diagnosis: 'Respiratory tuberculosis, bacteriologically and histologically confirmed',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['tuberculosis', 'TB', 'pulmonary TB', 'respiratory TB'],
    nhddDescription: 'Tuberculosis of respiratory system confirmed by laboratory tests',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1B10-1B1Z Respiratory tuberculosis'
  },
  {
    nhdd: 'ESV009',
    icd10: 'A15.9',
    icd11: '1B10.Z',
    diagnosis: 'Respiratory tuberculosis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['tuberculosis', 'TB', 'pulmonary TB', 'respiratory TB'],
    nhddDescription: 'Tuberculosis of respiratory system, unspecified confirmation',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1B10-1B1Z Respiratory tuberculosis'
  },

  // ESV-ICD-11: HIV/AIDS
  {
    nhdd: 'ESV010',
    icd10: 'B20',
    icd11: '1C60.Z',
    diagnosis: 'Human immunodeficiency virus disease resulting in infectious and parasitic diseases',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Viral Infections',
    severity: 'Severe',
    commonTerms: ['HIV', 'AIDS', 'HIV disease', 'immunodeficiency'],
    nhddDescription: 'HIV infection with resulting infectious and parasitic diseases',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1C60-1C6Z Human immunodeficiency virus disease'
  },

  // ESV-ICD-11: Diarrheal Diseases
  {
    nhdd: 'ESV011',
    icd10: 'A09',
    icd11: '1A40.Z',
    diagnosis: 'Infectious gastroenteritis and colitis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Gastrointestinal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['diarrhea', 'gastroenteritis', 'stomach flu', 'food poisoning'],
    nhddDescription: 'Infectious inflammation of stomach and intestines',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A40-1A4Z Bacterial intestinal infections'
  },
  {
    nhdd: 'ESV011A',
    icd10: 'A09',
    icd11: '1A40.Z',
    diagnosis: 'Acute gastroenteritis',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Gastrointestinal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['acute gastroenteritis', 'gastroenteritis', 'stomach flu', 'food poisoning', 'diarrhea', 'vomiting', 'nausea'],
    nhddDescription: 'Acute inflammation of stomach and intestines causing diarrhea and vomiting',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A40-1A4Z Bacterial intestinal infections'
  },
  {
    nhdd: 'ESV011B',
    icd10: 'A08.4',
    icd11: '1A40.0',
    diagnosis: 'Viral gastroenteritis',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Gastrointestinal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['viral gastroenteritis', 'rotavirus', 'norovirus', 'stomach flu', 'viral diarrhea'],
    nhddDescription: 'Viral infection causing inflammation of stomach and intestines',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A40-1A4Z Bacterial intestinal infections'
  },
  {
    nhdd: 'ESV011C',
    icd10: 'A04.9',
    icd11: '1A40.1',
    diagnosis: 'Bacterial gastroenteritis',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Gastrointestinal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['bacterial gastroenteritis', 'bacterial diarrhea', 'food poisoning', 'salmonella', 'e.coli', 'shigella'],
    nhddDescription: 'Bacterial infection causing inflammation of stomach and intestines',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A40-1A4Z Bacterial intestinal infections'
  },
  {
    nhdd: 'ESV012',
    icd10: 'A00.9',
    icd11: '1A00.9',
    diagnosis: 'Cholera, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Severe',
    commonTerms: ['cholera', 'vibrio cholerae', 'rice water stools'],
    nhddDescription: 'Acute diarrheal infection caused by Vibrio cholerae',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A00-1A0Z Cholera'
  },

  // ESV-ICD-11: Meningitis
  {
    nhdd: 'ESV013',
    icd10: 'G00.9',
    icd11: '1C01.Z',
    diagnosis: 'Bacterial meningitis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Central Nervous System Infections',
    severity: 'Severe',
    commonTerms: ['meningitis', 'bacterial meningitis', 'meningococcal meningitis'],
    nhddDescription: 'Bacterial infection of the meninges',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1C00-1C0Z Bacterial infections of the central nervous system'
  },

  // ESV-ICD-11: Pneumonia
  {
    nhdd: 'ESV014',
    icd10: 'J18.9',
    icd11: 'CA40.1',
    diagnosis: 'Pneumonia, organism unspecified',
    category: 'ESV-ICD-11: Respiratory Diseases',
    subcategory: 'Lower Respiratory Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['pneumonia', 'lung infection', 'chest infection'],
    nhddDescription: 'Infection of lung parenchyma',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
  },

  // ESV-ICD-11: Measles
  {
    nhdd: 'ESV015',
    icd10: 'B05.9',
    icd11: '1F02.0',
    diagnosis: 'Measles without complication',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Viral Infections',
    severity: 'Moderate',
    commonTerms: ['measles', 'rubeola', 'measles virus'],
    nhddDescription: 'Viral infection characterized by fever and rash',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F02-1F0Z Measles'
  },

  // ESV-ICD-11: Hepatitis
  {
    nhdd: 'ESV016',
    icd10: 'B19.9',
    icd11: '1E50.Z',
    diagnosis: 'Unspecified viral hepatitis',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Viral Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['hepatitis', 'viral hepatitis', 'liver inflammation'],
    nhddDescription: 'Viral infection causing liver inflammation',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1E50-1E5Z Viral hepatitis'
  },

  // ESV-ICD-11: Schistosomiasis
  {
    nhdd: 'ESV017',
    icd10: 'B65.9',
    icd11: '1F86.Z',
    diagnosis: 'Schistosomiasis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['schistosomiasis', 'bilharzia', 'snail fever'],
    nhddDescription: 'Parasitic infection caused by Schistosoma species',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F86-1F8Z Schistosomiasis'
  },

  // ESV-ICD-11: Hookworm
  {
    nhdd: 'ESV018',
    icd10: 'B76.9',
    icd11: '1F6A.Z',
    diagnosis: 'Hookworm disease, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['hookworm', 'ancylostomiasis', 'intestinal worm'],
    nhddDescription: 'Parasitic infection caused by hookworm species',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F6A-1F6Z Hookworm diseases'
  },

  // ESV-ICD-11: Ascariasis
  {
    nhdd: 'ESV019',
    icd10: 'B77.9',
    icd11: '1F6B.Z',
    diagnosis: 'Ascariasis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['ascariasis', 'roundworm', 'ascaris lumbricoides'],
    nhddDescription: 'Parasitic infection caused by Ascaris lumbricoides',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F6B-1F6Z Ascariasis'
  },

  // ESV-ICD-11: Amebiasis
  {
    nhdd: 'ESV020',
    icd10: 'A06.9',
    icd11: '1A30.Z',
    diagnosis: 'Amebiasis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['amebiasis', 'amoebiasis', 'entamoeba histolytica'],
    nhddDescription: 'Parasitic infection caused by Entamoeba histolytica',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A30-1A3Z Amebiasis'
  },

  // ESV-ICD-11: Giardiasis
  {
    nhdd: 'ESV021',
    icd10: 'A07.1',
    icd11: '1A32.0',
    diagnosis: 'Giardiasis',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['giardiasis', 'giardia', 'giardia lamblia'],
    nhddDescription: 'Parasitic infection caused by Giardia lamblia',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A32-1A3Z Giardiasis'
  },

  // ESV-ICD-11: Trachoma
  {
    nhdd: 'ESV022',
    icd10: 'A71.9',
    icd11: '1C90.Z',
    diagnosis: 'Trachoma, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['trachoma', 'chlamydia trachomatis', 'eye infection'],
    nhddDescription: 'Bacterial eye infection caused by Chlamydia trachomatis',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1C90-1C9Z Trachoma'
  },

  // ESV-ICD-11: Leishmaniasis
  {
    nhdd: 'ESV023',
    icd10: 'B55.9',
    icd11: '1F54.Z',
    diagnosis: 'Leishmaniasis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['leishmaniasis', 'kala-azar', 'cutaneous leishmaniasis'],
    nhddDescription: 'Parasitic infection caused by Leishmania species',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F54-1F5Z Leishmaniasis'
  },

  // ESV-ICD-11: Trypanosomiasis
  {
    nhdd: 'ESV024',
    icd10: 'B56.9',
    icd11: '1F51.Z',
    diagnosis: 'African trypanosomiasis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Severe',
    commonTerms: ['trypanosomiasis', 'sleeping sickness', 'african trypanosomiasis'],
    nhddDescription: 'Parasitic infection caused by Trypanosoma brucei',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F51-1F5Z Trypanosomiasis'
  },

  // ESV-ICD-11: Onchocerciasis
  {
    nhdd: 'ESV025',
    icd10: 'B73',
    icd11: '1F6D.Z',
    diagnosis: 'Onchocerciasis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['onchocerciasis', 'river blindness', 'onchocerca volvulus'],
    nhddDescription: 'Parasitic infection caused by Onchocerca volvulus',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F6D-1F6Z Onchocerciasis'
  },

  // ESV-ICD-11: Lymphatic Filariasis
  {
    nhdd: 'ESV026',
    icd10: 'B74.9',
    icd11: '1F6C.Z',
    diagnosis: 'Filariasis, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['filariasis', 'lymphatic filariasis', 'elephantiasis'],
    nhddDescription: 'Parasitic infection caused by filarial worms',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F6C-1F6Z Filariasis'
  },

  // ESV-ICD-11: Dracunculiasis
  {
    nhdd: 'ESV027',
    icd10: 'B72',
    icd11: '1F6E.Z',
    diagnosis: 'Dracunculiasis',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['dracunculiasis', 'guinea worm disease', 'dracunculus medinensis'],
    nhddDescription: 'Parasitic infection caused by Dracunculus medinensis',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F6E-1F6Z Dracunculiasis'
  },

  // ESV-ICD-11: Yellow Fever
  {
    nhdd: 'ESV028',
    icd10: 'A95.9',
    icd11: '1D48.Z',
    diagnosis: 'Yellow fever, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Viral Infections',
    severity: 'Severe',
    commonTerms: ['yellow fever', 'yellow fever virus', 'viral hemorrhagic fever'],
    nhddDescription: 'Viral hemorrhagic fever caused by yellow fever virus',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1D48-1D4Z Yellow fever'
  },

  // ESV-ICD-11: Dengue Fever
  {
    nhdd: 'ESV029',
    icd10: 'A90',
    icd11: '1D2Z',
    diagnosis: 'Dengue fever',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Viral Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['dengue', 'dengue fever', 'breakbone fever', 'dengue virus'],
    nhddDescription: 'Viral infection caused by dengue virus',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1D20-1D2Z Dengue'
  },

  // ESV-ICD-11: Chikungunya
  {
    nhdd: 'ESV030',
    icd10: 'A92.0',
    icd11: '1D40.0',
    diagnosis: 'Chikungunya virus disease',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Viral Infections',
    severity: 'Moderate',
    commonTerms: ['chikungunya', 'chikungunya fever', 'chikungunya virus'],
    nhddDescription: 'Viral infection caused by chikungunya virus',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1D40-1D4Z Chikungunya virus disease'
  },

  {
    nhdd: 'GYNE001',
    icd10: 'N92.0',
    icd11: 'GA34.4',
    diagnosis: 'Excessive and frequent menstruation with regular cycle',
    category: 'Gynecological Disorders',
    subcategory: 'Menstrual Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['heavy periods', 'menorrhagia', 'excessive bleeding'],
    nhddDescription: 'Abnormally heavy or prolonged menstrual bleeding',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GA34-GA3Z Abnormal uterine or vaginal bleeding'
  },
  {
    nhdd: 'PEDI001',
    icd10: 'R63.3',
    icd11: 'MD80.0',
    diagnosis: 'Feeding difficulties in newborn',
    category: 'Pediatric Disorders',
    subcategory: 'Neonatal Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['feeding problems', 'poor feeding', 'feeding difficulties'],
    nhddDescription: 'Difficulty establishing or maintaining adequate feeding in newborn',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings, not elsewhere classified',
    icd11Block: 'MD80-MD8Z Feeding difficulties or eating problems'
  },

  // ESV-ICD-11: Peptic Ulcer Disease (PUD)
  {
    nhdd: 'ESV031',
    icd10: 'K27.9',
    icd11: 'DA62.Z',
    diagnosis: 'Peptic ulcer disease, unspecified',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Peptic Ulcer Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['peptic ulcer', 'PUD', 'stomach ulcer', 'duodenal ulcer', 'gastric ulcer'],
    nhddDescription: 'Chronic ulceration of stomach or duodenal mucosa',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA62-DA6Z Peptic ulcer'
  },

  // ESV-ICD-11: Gastric Ulcer
  {
    nhdd: 'ESV032',
    icd10: 'K25.9',
    icd11: 'DA62.0',
    diagnosis: 'Gastric ulcer, unspecified',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Peptic Ulcer Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['gastric ulcer', 'stomach ulcer', 'peptic ulcer'],
    nhddDescription: 'Ulceration of gastric mucosa',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA62-DA6Z Peptic ulcer'
  },

  // ESV-ICD-11: Duodenal Ulcer
  {
    nhdd: 'ESV033',
    icd10: 'K26.9',
    icd11: 'DA62.1',
    diagnosis: 'Duodenal ulcer, unspecified',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Peptic Ulcer Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['duodenal ulcer', 'duodenal peptic ulcer', 'PUD'],
    nhddDescription: 'Ulceration of duodenal mucosa',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA62-DA6Z Peptic ulcer'
  },

  // ESV-ICD-11: Peptic Ulcer with Hemorrhage
  {
    nhdd: 'ESV034',
    icd10: 'K25.0',
    icd11: 'DA62.2',
    diagnosis: 'Peptic ulcer with hemorrhage',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Peptic Ulcer Disease',
    severity: 'Severe',
    commonTerms: ['bleeding ulcer', 'hemorrhagic ulcer', 'PUD with bleeding'],
    nhddDescription: 'Peptic ulcer complicated by hemorrhage',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA62-DA6Z Peptic ulcer'
  },

  // ESV-ICD-11: Peptic Ulcer with Perforation
  {
    nhdd: 'ESV035',
    icd10: 'K25.1',
    icd11: 'DA62.3',
    diagnosis: 'Peptic ulcer with perforation',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Peptic Ulcer Disease',
    severity: 'Severe',
    commonTerms: ['perforated ulcer', 'ulcer perforation', 'PUD with perforation'],
    nhddDescription: 'Peptic ulcer complicated by perforation',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA62-DA6Z Peptic ulcer'
  },

  // ESV-ICD-11: Peptic Ulcer with Obstruction
  {
    nhdd: 'ESV036',
    icd10: 'K25.2',
    icd11: 'DA62.4',
    diagnosis: 'Peptic ulcer with obstruction',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Peptic Ulcer Disease',
    severity: 'Severe',
    commonTerms: ['obstructed ulcer', 'ulcer obstruction', 'PUD with obstruction'],
    nhddDescription: 'Peptic ulcer complicated by gastric outlet obstruction',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA62-DA6Z Peptic ulcer'
  },

  // ESV-ICD-11: Helicobacter pylori Infection
  {
    nhdd: 'ESV037',
    icd10: 'B96.81',
    icd11: '1C4Z',
    diagnosis: 'Helicobacter pylori infection',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['H. pylori', 'helicobacter pylori', 'stomach bacteria'],
    nhddDescription: 'Bacterial infection of gastric mucosa',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1C40-1C4Z Helicobacter pylori infection'
  },

  // ESV-ICD-11: Cystitis
  {
    nhdd: 'ESV038',
    icd10: 'N30.9',
    icd11: 'GC08.0',
    diagnosis: 'Cystitis, unspecified',
    category: 'ESV-ICD-11: Genitourinary Disorders',
    subcategory: 'Urinary Tract Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['cystitis', 'bladder infection', 'UTI', 'urinary tract infection'],
    nhddDescription: 'Inflammation of the urinary bladder',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GC08-GC0Z Cystitis or urethritis'
  },

  // ESV-ICD-11: Acute Cystitis
  {
    nhdd: 'ESV039',
    icd10: 'N30.0',
    icd11: 'GC08.1',
    diagnosis: 'Acute cystitis',
    category: 'ESV-ICD-11: Genitourinary Disorders',
    subcategory: 'Urinary Tract Infections',
    severity: 'Moderate',
    commonTerms: ['acute cystitis', 'acute bladder infection', 'acute UTI'],
    nhddDescription: 'Acute inflammation of the urinary bladder',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GC08-GC0Z Cystitis or urethritis'
  },

  // ESV-ICD-11: Chronic Cystitis
  {
    nhdd: 'ESV040',
    icd10: 'N30.1',
    icd11: 'GC08.2',
    diagnosis: 'Chronic cystitis',
    category: 'ESV-ICD-11: Genitourinary Disorders',
    subcategory: 'Urinary Tract Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['chronic cystitis', 'chronic bladder infection', 'recurrent UTI'],
    nhddDescription: 'Chronic inflammation of the urinary bladder',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GC08-GC0Z Cystitis or urethritis'
  },

  // ESV-ICD-11: Gonorrhea
  {
    nhdd: 'ESV041',
    icd10: 'A54.9',
    icd11: '1A70.Z',
    diagnosis: 'Gonococcal infection, unspecified',
    category: 'ESV-ICD-11: Sexually Transmitted Infections',
    subcategory: 'Bacterial STIs',
    severity: 'Moderate to Severe',
    commonTerms: ['gonorrhea', 'gonococcal infection', 'the clap'],
    nhddDescription: 'Sexually transmitted infection caused by Neisseria gonorrhoeae',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A70-1A7Z Gonococcal infection'
  },

  // ESV-ICD-11: Chlamydia
  {
    nhdd: 'ESV042',
    icd10: 'A56.9',
    icd11: '1A71.Z',
    diagnosis: 'Chlamydial infection, unspecified',
    category: 'ESV-ICD-11: Sexually Transmitted Infections',
    subcategory: 'Bacterial STIs',
    severity: 'Mild to Moderate',
    commonTerms: ['chlamydia', 'chlamydial infection'],
    nhddDescription: 'Sexually transmitted infection caused by Chlamydia trachomatis',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A71-1A7Z Chlamydial infection'
  },

  // ESV-ICD-11: Syphilis
  {
    nhdd: 'ESV043',
    icd10: 'A53.9',
    icd11: '1A61.Z',
    diagnosis: 'Syphilis, unspecified',
    category: 'ESV-ICD-11: Sexually Transmitted Infections',
    subcategory: 'Bacterial STIs',
    severity: 'Moderate to Severe',
    commonTerms: ['syphilis', 'lues', 'treponemal infection'],
    nhddDescription: 'Sexually transmitted infection caused by Treponema pallidum',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A61-1A6Z Syphilis'
  },

  // ESV-ICD-11: Genital Herpes
  {
    nhdd: 'ESV044',
    icd10: 'A60.9',
    icd11: '1F00.Z',
    diagnosis: 'Anogenital herpesviral infection, unspecified',
    category: 'ESV-ICD-11: Sexually Transmitted Infections',
    subcategory: 'Viral STIs',
    severity: 'Mild to Moderate',
    commonTerms: ['genital herpes', 'herpes simplex', 'HSV'],
    nhddDescription: 'Viral infection caused by herpes simplex virus affecting genital area',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F00-1F0Z Anogenital herpesviral infection'
  },

  // ESV-ICD-11: HIV Infection
  {
    nhdd: 'ESV045',
    icd10: 'B20',
    icd11: '1C60.Z',
    diagnosis: 'Human immunodeficiency virus disease',
    category: 'ESV-ICD-11: Sexually Transmitted Infections',
    subcategory: 'Viral STIs',
    severity: 'Severe',
    commonTerms: ['HIV', 'AIDS', 'human immunodeficiency virus'],
    nhddDescription: 'Viral infection that attacks the immune system',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1C60-1C6Z Human immunodeficiency virus disease'
  },

  // ESV-ICD-11: Vaginal Candidiasis
  {
    nhdd: 'ESV046',
    icd10: 'B37.3',
    icd11: '1F23.0',
    diagnosis: 'Candidiasis of vulva and vagina',
    category: 'ESV-ICD-11: Gynecological Disorders',
    subcategory: 'Vaginal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['vaginal yeast infection', 'vaginal candidiasis', 'vaginal fungus', 'thrush'],
    nhddDescription: 'Fungal infection of the vagina caused by Candida species',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F23-1F2Z Candidiasis'
  },

  // ESV-ICD-11: Bacterial Vaginosis
  {
    nhdd: 'ESV047',
    icd10: 'N76.0',
    icd11: 'GA18.0',
    diagnosis: 'Bacterial vaginosis',
    category: 'ESV-ICD-11: Gynecological Disorders',
    subcategory: 'Vaginal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['bacterial vaginosis', 'BV', 'vaginal infection'],
    nhddDescription: 'Bacterial infection of the vagina causing abnormal discharge',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GA18-GA1Z Inflammatory diseases of female pelvic organs'
  },

  // ESV-ICD-11: Trichomoniasis
  {
    nhdd: 'ESV048',
    icd10: 'A59.9',
    icd11: '1A90.Z',
    diagnosis: 'Trichomoniasis, unspecified',
    category: 'ESV-ICD-11: Sexually Transmitted Infections',
    subcategory: 'Parasitic STIs',
    severity: 'Mild to Moderate',
    commonTerms: ['trichomoniasis', 'trich', 'trichomonas'],
    nhddDescription: 'Sexually transmitted parasitic infection caused by Trichomonas vaginalis',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1A90-1A9Z Trichomoniasis'
  },

  // ESV-ICD-11: Cholecystitis
  {
    nhdd: 'ESV049',
    icd10: 'K81.9',
    icd11: 'DC11.Z',
    diagnosis: 'Cholecystitis, unspecified',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Gallbladder Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['cholecystitis', 'gallbladder inflammation', 'gallbladder infection'],
    nhddDescription: 'Inflammation of the gallbladder',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC11-DC1Z Cholecystitis'
  },

  // ESV-ICD-11: Acute Cholecystitis
  {
    nhdd: 'ESV050',
    icd10: 'K81.0',
    icd11: 'DC11.0',
    diagnosis: 'Acute cholecystitis',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Gallbladder Disorders',
    severity: 'Severe',
    commonTerms: ['acute cholecystitis', 'acute gallbladder inflammation'],
    nhddDescription: 'Acute inflammation of the gallbladder',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC11-DC1Z Cholecystitis'
  },

  // ESV-ICD-11: Chronic Cholecystitis
  {
    nhdd: 'ESV051',
    icd10: 'K81.1',
    icd11: 'DC11.1',
    diagnosis: 'Chronic cholecystitis',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Gallbladder Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['chronic cholecystitis', 'chronic gallbladder inflammation'],
    nhddDescription: 'Chronic inflammation of the gallbladder',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC11-DC1Z Cholecystitis'
  },

  // ESV-ICD-11: Cholelithiasis
  {
    nhdd: 'ESV052',
    icd10: 'K80.2',
    icd11: 'DC11.2',
    diagnosis: 'Calculus of gallbladder',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Gallbladder Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['gallstones', 'cholelithiasis', 'gallbladder stones'],
    nhddDescription: 'Formation of stones in the gallbladder',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC11-DC1Z Cholecystitis'
  },

  // ESV-ICD-11: Choledocholithiasis
  {
    nhdd: 'ESV053',
    icd10: 'K80.5',
    icd11: 'DC12.0',
    diagnosis: 'Calculus of bile duct without cholangitis or cholecystitis',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Biliary Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['bile duct stones', 'choledocholithiasis', 'common bile duct stones'],
    nhddDescription: 'Formation of stones in the bile ducts',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC12-DC1Z Choledocholithiasis'
  },

  // ESV-ICD-11: Pleural Effusion
  {
    nhdd: 'ESV054',
    icd10: 'J90',
    icd11: 'CB01.Z',
    diagnosis: 'Pleural effusion, not elsewhere classified',
    category: 'ESV-ICD-11: Respiratory Disorders',
    subcategory: 'Pleural Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['pleural effusion', 'fluid in lungs', 'water in chest', 'pleural fluid'],
    nhddDescription: 'Accumulation of fluid in the pleural cavity',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CB01-CB0Z Pleural effusion'
  },

  // ESV-ICD-11: Acute Appendicitis
  {
    nhdd: 'ESV055',
    icd10: 'K35.80',
    icd11: 'DC10.0',
    diagnosis: 'Acute appendicitis, unspecified',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Appendiceal Disorders',
    severity: 'Severe',
    commonTerms: ['appendicitis', 'acute appendicitis', 'appendix infection'],
    nhddDescription: 'Acute inflammation of the appendix',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC10-DC1Z Appendicitis'
  },

  // ESV-ICD-11: Typhus
  {
    nhdd: 'ESV056',
    icd10: 'A75.9',
    icd11: '1C30.Z',
    diagnosis: 'Typhus fever, unspecified',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Rickettsial Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['typhus', 'typhus fever', 'rickettsial infection'],
    nhddDescription: 'Acute febrile illness caused by Rickettsia bacteria',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1C30-1C3Z Typhus fever'
  },

  // ESV-ICD-11: Epidemic Typhus
  {
    nhdd: 'ESV057',
    icd10: 'A75.0',
    icd11: '1C30.0',
    diagnosis: 'Epidemic louse-borne typhus fever due to Rickettsia prowazekii',
    category: 'ESV-ICD-11: Infectious Diseases',
    subcategory: 'Rickettsial Infections',
    severity: 'Severe',
    commonTerms: ['epidemic typhus', 'louse-borne typhus', 'Rickettsia prowazekii'],
    nhddDescription: 'Severe form of typhus transmitted by body lice',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1C30-1C3Z Typhus fever'
  },

  // ESV-ICD-11: Nail Fungal Infection
  {
    nhdd: 'ESV058',
    icd10: 'B35.1',
    icd11: '1F28.0',
    diagnosis: 'Tinea unguium',
    category: 'ESV-ICD-11: Dermatological Disorders',
    subcategory: 'Fungal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['nail fungus', 'onychomycosis', 'tinea unguium', 'fungal nail infection'],
    nhddDescription: 'Fungal infection of the nails',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F28-1F2Z Dermatophytosis'
  },

  // ESV-ICD-11: Tinea Pedis (Athlete's Foot)
  {
    nhdd: 'ESV059',
    icd10: 'B35.3',
    icd11: '1F28.1',
    diagnosis: 'Tinea pedis',
    category: 'ESV-ICD-11: Dermatological Disorders',
    subcategory: 'Fungal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['athlete\'s foot', 'tinea pedis', 'foot fungus', 'fungal foot infection'],
    nhddDescription: 'Fungal infection of the feet',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F28-1F2Z Dermatophytosis'
  },

  // ESV-ICD-11: Tinea Corporis (Ringworm)
  {
    nhdd: 'ESV060',
    icd10: 'B35.4',
    icd11: '1F28.2',
    diagnosis: 'Tinea corporis',
    category: 'ESV-ICD-11: Dermatological Disorders',
    subcategory: 'Fungal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['ringworm', 'tinea corporis', 'body fungus', 'skin fungus'],
    nhddDescription: 'Fungal infection of the body skin',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F28-1F2Z Dermatophytosis'
  },

  // ESV-ICD-11: Tinea Capitis (Scalp Ringworm)
  {
    nhdd: 'ESV061',
    icd10: 'B35.0',
    icd11: '1F28.3',
    diagnosis: 'Tinea capitis',
    category: 'ESV-ICD-11: Dermatological Disorders',
    subcategory: 'Fungal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['scalp ringworm', 'tinea capitis', 'head fungus', 'scalp fungus'],
    nhddDescription: 'Fungal infection of the scalp and hair',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F28-1F2Z Dermatophytosis'
  },

  // ESV-ICD-11: Candidiasis of Skin
  {
    nhdd: 'ESV062',
    icd10: 'B37.2',
    icd11: '1F23.1',
    diagnosis: 'Candidiasis of skin and nail',
    category: 'ESV-ICD-11: Dermatological Disorders',
    subcategory: 'Fungal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['skin candidiasis', 'cutaneous candidiasis', 'skin yeast infection'],
    nhddDescription: 'Fungal infection of skin caused by Candida species',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1F23-1F2Z Candidiasis'
  },

  // ESV-ICD-11: Paronychia (Nail Infection)
  {
    nhdd: 'ESV063',
    icd10: 'L03.0',
    icd11: '1B75.0',
    diagnosis: 'Cellulitis and acute lymphangitis of finger and toe',
    category: 'ESV-ICD-11: Dermatological Disorders',
    subcategory: 'Nail Infections',
    severity: 'Moderate',
    commonTerms: ['paronychia', 'nail infection', 'nail bed infection', 'finger infection'],
    nhddDescription: 'Infection of the nail fold and surrounding tissue',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1B75-1B7Z Cellulitis and acute lymphangitis'
  },

  // ESV-ICD-11: Acute Paronychia
  {
    nhdd: 'ESV064',
    icd10: 'L03.0',
    icd11: '1B75.1',
    diagnosis: 'Acute paronychia',
    category: 'ESV-ICD-11: Dermatological Disorders',
    subcategory: 'Nail Infections',
    severity: 'Moderate',
    commonTerms: ['acute paronychia', 'acute nail infection', 'nail abscess'],
    nhddDescription: 'Acute infection of the nail fold',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1B75-1B7Z Cellulitis and acute lymphangitis'
  },

  // ESV-ICD-11: Iron Deficiency Anemia
  {
    nhdd: 'ESV065',
    icd10: 'D50.9',
    icd11: '3A00.Z',
    diagnosis: 'Iron deficiency anemia, unspecified',
    category: 'ESV-ICD-11: Hematological Disorders',
    subcategory: 'Anemias',
    severity: 'Mild to Moderate',
    commonTerms: ['iron deficiency anemia', 'anemia', 'low iron', 'iron deficiency'],
    nhddDescription: 'Anemia caused by insufficient iron in the body',
    icd11Chapter: 'Chapter 03: Diseases of the blood or blood-forming organs',
    icd11Block: '3A00-3A0Z Iron deficiency anemias'
  },

  // ESV-ICD-11: Vitamin B12 Deficiency Anemia
  {
    nhdd: 'ESV066',
    icd10: 'D51.9',
    icd11: '3A01.Z',
    diagnosis: 'Vitamin B12 deficiency anemia, unspecified',
    category: 'ESV-ICD-11: Hematological Disorders',
    subcategory: 'Anemias',
    severity: 'Moderate to Severe',
    commonTerms: ['B12 deficiency', 'pernicious anemia', 'vitamin B12 anemia'],
    nhddDescription: 'Anemia caused by vitamin B12 deficiency',
    icd11Chapter: 'Chapter 03: Diseases of the blood or blood-forming organs',
    icd11Block: '3A01-3A0Z Vitamin B12 deficiency anemias'
  },

  // ESV-ICD-11: Folate Deficiency Anemia
  {
    nhdd: 'ESV067',
    icd10: 'D52.9',
    icd11: '3A02.Z',
    diagnosis: 'Folate deficiency anemia, unspecified',
    category: 'ESV-ICD-11: Hematological Disorders',
    subcategory: 'Anemias',
    severity: 'Moderate',
    commonTerms: ['folate deficiency', 'folic acid deficiency', 'folate anemia'],
    nhddDescription: 'Anemia caused by folate deficiency',
    icd11Chapter: 'Chapter 03: Diseases of the blood or blood-forming organs',
    icd11Block: '3A02-3A0Z Folate deficiency anemias'
  },

  // ESV-ICD-11: Protein-Energy Malnutrition
  {
    nhdd: 'ESV068',
    icd10: 'E46',
    icd11: '5B50.Z',
    diagnosis: 'Protein-energy malnutrition, unspecified',
    category: 'ESV-ICD-11: Nutritional Disorders',
    subcategory: 'Malnutrition',
    severity: 'Moderate to Severe',
    commonTerms: ['malnutrition', 'protein-energy malnutrition', 'PEM', 'undernutrition'],
    nhddDescription: 'Deficiency of protein and energy in the diet',
    icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5B50-5B5Z Protein-energy malnutrition'
  },

  // ESV-ICD-11: Severe Acute Malnutrition
  {
    nhdd: 'ESV069',
    icd10: 'E43',
    icd11: '5B50.0',
    diagnosis: 'Severe acute malnutrition',
    category: 'ESV-ICD-11: Nutritional Disorders',
    subcategory: 'Malnutrition',
    severity: 'Severe',
    commonTerms: ['severe malnutrition', 'SAM', 'wasting', 'marasmus'],
    nhddDescription: 'Severe form of protein-energy malnutrition',
    icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5B50-5B5Z Protein-energy malnutrition'
  },

  // ESV-ICD-11: Kwashiorkor
  {
    nhdd: 'ESV070',
    icd10: 'E40',
    icd11: '5B50.1',
    diagnosis: 'Kwashiorkor',
    category: 'ESV-ICD-11: Nutritional Disorders',
    subcategory: 'Malnutrition',
    severity: 'Severe',
    commonTerms: ['kwashiorkor', 'protein malnutrition', 'edematous malnutrition'],
    nhddDescription: 'Severe protein malnutrition with edema',
    icd11Chapter: 'Chapter 05: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5B50-5B5Z Protein-energy malnutrition'
  },

  // ESV-ICD-11: Ischemic Stroke
  {
    nhdd: 'ESV071',
    icd10: 'I63.9',
    icd11: '8B11.Z',
    diagnosis: 'Cerebral infarction, unspecified',
    category: 'ESV-ICD-11: Neurological Disorders',
    subcategory: 'Cerebrovascular Diseases',
    severity: 'Severe',
    commonTerms: ['stroke', 'ischemic stroke', 'brain attack', 'cerebral infarction'],
    nhddDescription: 'Death of brain tissue due to lack of blood supply',
    icd11Chapter: 'Chapter 08: Diseases of the nervous system',
    icd11Block: '8B11-8B1Z Cerebral infarction'
  },

  // ESV-ICD-11: Hemorrhagic Stroke
  {
    nhdd: 'ESV072',
    icd10: 'I61.9',
    icd11: '8B00.Z',
    diagnosis: 'Nontraumatic intracerebral hemorrhage, unspecified',
    category: 'ESV-ICD-11: Neurological Disorders',
    subcategory: 'Cerebrovascular Diseases',
    severity: 'Severe',
    commonTerms: ['hemorrhagic stroke', 'brain hemorrhage', 'intracerebral hemorrhage'],
    nhddDescription: 'Bleeding within the brain tissue',
    icd11Chapter: 'Chapter 08: Diseases of the nervous system',
    icd11Block: '8B00-8B0Z Nontraumatic intracerebral hemorrhage'
  },

  // ESV-ICD-11: Transient Ischemic Attack
  {
    nhdd: 'ESV073',
    icd10: 'G45.9',
    icd11: '8B10.Z',
    diagnosis: 'Transient cerebral ischemic attack, unspecified',
    category: 'ESV-ICD-11: Neurological Disorders',
    subcategory: 'Cerebrovascular Diseases',
    severity: 'Moderate',
    commonTerms: ['TIA', 'mini-stroke', 'transient ischemic attack'],
    nhddDescription: 'Temporary disruption of blood flow to the brain',
    icd11Chapter: 'Chapter 08: Diseases of the nervous system',
    icd11Block: '8B10-8B1Z Transient cerebral ischemic attacks'
  },

  // ESV-ICD-11: Febrile Seizure
  {
    nhdd: 'ESV074',
    icd10: 'R56.0',
    icd11: '8A62.0',
    diagnosis: 'Febrile seizure',
    category: 'ESV-ICD-11: Neurological Disorders',
    subcategory: 'Seizure Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['febrile seizure', 'fever seizure', 'febrile convulsion'],
    nhddDescription: 'Seizure occurring with fever in children',
    icd11Chapter: 'Chapter 08: Diseases of the nervous system',
    icd11Block: '8A62-8A6Z Febrile seizures'
  },

  // ESV-ICD-11: Acute Rheumatic Fever
  {
    nhdd: 'ESV075',
    icd10: 'I00',
    icd11: '1B50.Z',
    diagnosis: 'Rheumatic fever without heart involvement',
    category: 'ESV-ICD-11: Cardiovascular Disorders',
    subcategory: 'Rheumatic Heart Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['rheumatic fever', 'acute rheumatic fever', 'ARF'],
    nhddDescription: 'Inflammatory disease following streptococcal infection',
    icd11Chapter: 'Chapter 01: Certain infectious or parasitic diseases',
    icd11Block: '1B50-1B5Z Acute rheumatic fever'
  },

  // ESV-ICD-11: Rheumatic Heart Disease
  {
    nhdd: 'ESV076',
    icd10: 'I09.9',
    icd11: 'BB60.Z',
    diagnosis: 'Rheumatic heart disease, unspecified',
    category: 'ESV-ICD-11: Cardiovascular Disorders',
    subcategory: 'Rheumatic Heart Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['rheumatic heart disease', 'RHD', 'valvular heart disease'],
    nhddDescription: 'Heart damage caused by rheumatic fever',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BB60-BB6Z Rheumatic heart diseases'
  },

  // ESV-ICD-11: Rheumatic Mitral Stenosis
  {
    nhdd: 'ESV077',
    icd10: 'I05.0',
    icd11: 'BB60.0',
    diagnosis: 'Rheumatic mitral stenosis',
    category: 'ESV-ICD-11: Cardiovascular Disorders',
    subcategory: 'Rheumatic Heart Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['mitral stenosis', 'rheumatic mitral stenosis', 'MS'],
    nhddDescription: 'Narrowing of the mitral valve due to rheumatic fever',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BB60-BB6Z Rheumatic heart diseases'
  },

  // ESV-ICD-11: Rheumatic Mitral Regurgitation
  {
    nhdd: 'ESV078',
    icd10: 'I05.1',
    icd11: 'BB60.1',
    diagnosis: 'Rheumatic mitral insufficiency',
    category: 'ESV-ICD-11: Cardiovascular Disorders',
    subcategory: 'Rheumatic Heart Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['mitral regurgitation', 'mitral insufficiency', 'MR'],
    nhddDescription: 'Leakage of the mitral valve due to rheumatic fever',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BB60-BB6Z Rheumatic heart diseases'
  },

  // ESV-ICD-11: Rheumatic Aortic Stenosis
  {
    nhdd: 'ESV079',
    icd10: 'I06.0',
    icd11: 'BB60.2',
    diagnosis: 'Rheumatic aortic stenosis',
    category: 'ESV-ICD-11: Cardiovascular Disorders',
    subcategory: 'Rheumatic Heart Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['aortic stenosis', 'rheumatic aortic stenosis', 'AS'],
    nhddDescription: 'Narrowing of the aortic valve due to rheumatic fever',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BB60-BB6Z Rheumatic heart diseases'
  },

  // ESV-ICD-11: Rheumatic Aortic Regurgitation
  {
    nhdd: 'ESV080',
    icd10: 'I06.1',
    icd11: 'BB60.3',
    diagnosis: 'Rheumatic aortic insufficiency',
    category: 'ESV-ICD-11: Cardiovascular Disorders',
    subcategory: 'Rheumatic Heart Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['aortic regurgitation', 'aortic insufficiency', 'AR'],
    nhddDescription: 'Leakage of the aortic valve due to rheumatic fever',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BB60-BB6Z Rheumatic heart diseases'
  },

  // ESV-ICD-11: Acute Glomerulonephritis
  {
    nhdd: 'ESV081',
    icd10: 'N00.9',
    icd11: 'GB40.Z',
    diagnosis: 'Acute nephritic syndrome, unspecified',
    category: 'ESV-ICD-11: Renal Disorders',
    subcategory: 'Glomerular Diseases',
    severity: 'Moderate to Severe',
    commonTerms: ['acute glomerulonephritis', 'acute nephritis', 'post-streptococcal GN'],
    nhddDescription: 'Acute inflammation of the kidney glomeruli',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GB40-GB4Z Acute nephritic syndrome'
  },

  // ESV-ICD-11: Chronic Glomerulonephritis
  {
    nhdd: 'ESV082',
    icd10: 'N03.9',
    icd11: 'GB41.Z',
    diagnosis: 'Chronic nephritic syndrome, unspecified',
    category: 'ESV-ICD-11: Renal Disorders',
    subcategory: 'Glomerular Diseases',
    severity: 'Moderate to Severe',
    commonTerms: ['chronic glomerulonephritis', 'chronic nephritis', 'CGN'],
    nhddDescription: 'Chronic inflammation of the kidney glomeruli',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GB41-GB4Z Chronic nephritic syndrome'
  },

  // ESV-ICD-11: Nephrotic Syndrome
  {
    nhdd: 'ESV083',
    icd10: 'N04.9',
    icd11: 'GB42.Z',
    diagnosis: 'Nephrotic syndrome, unspecified',
    category: 'ESV-ICD-11: Renal Disorders',
    subcategory: 'Glomerular Diseases',
    severity: 'Moderate to Severe',
    commonTerms: ['nephrotic syndrome', 'proteinuria', 'minimal change disease'],
    nhddDescription: 'Kidney disorder causing protein loss in urine',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GB42-GB4Z Nephrotic syndrome'
  },

  // ESV-ICD-11: Acute Pyelonephritis
  {
    nhdd: 'ESV084',
    icd10: 'N10',
    icd11: 'GC10.0',
    diagnosis: 'Acute pyelonephritis',
    category: 'ESV-ICD-11: Renal Disorders',
    subcategory: 'Urinary Tract Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['acute pyelonephritis', 'kidney infection', 'upper UTI'],
    nhddDescription: 'Acute infection of the kidney and renal pelvis',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GC10-GC1Z Pyelonephritis'
  },

  // ESV-ICD-11: Chronic Pyelonephritis
  {
    nhdd: 'ESV085',
    icd10: 'N11.9',
    icd11: 'GC10.1',
    diagnosis: 'Chronic pyelonephritis, unspecified',
    category: 'ESV-ICD-11: Renal Disorders',
    subcategory: 'Urinary Tract Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['chronic pyelonephritis', 'chronic kidney infection'],
    nhddDescription: 'Chronic infection of the kidney and renal pelvis',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GC10-GC1Z Pyelonephritis'
  },

  // ESV-ICD-11: Acute Pancreatitis
  {
    nhdd: 'ESV086',
    icd10: 'K85.9',
    icd11: 'DC31.Z',
    diagnosis: 'Acute pancreatitis, unspecified',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Pancreatic Disorders',
    severity: 'Severe',
    commonTerms: ['acute pancreatitis', 'pancreas inflammation', 'pancreatic attack'],
    nhddDescription: 'Acute inflammation of the pancreas',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC31-DC3Z Acute pancreatitis'
  },

  // ESV-ICD-11: Chronic Pancreatitis
  {
    nhdd: 'ESV087',
    icd10: 'K86.1',
    icd11: 'DC32.Z',
    diagnosis: 'Chronic pancreatitis, unspecified',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Pancreatic Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['chronic pancreatitis', 'chronic pancreas inflammation'],
    nhddDescription: 'Chronic inflammation of the pancreas',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC32-DC3Z Chronic pancreatitis'
  },

  // ESV-ICD-11: Acute Cholecystitis with Calculus
  {
    nhdd: 'ESV088',
    icd10: 'K80.0',
    icd11: 'DC11.3',
    diagnosis: 'Acute cholecystitis with calculus',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Gallbladder Disorders',
    severity: 'Severe',
    commonTerms: ['acute cholecystitis with stones', 'gallbladder attack', 'biliary colic'],
    nhddDescription: 'Acute inflammation of gallbladder with gallstones',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC11-DC1Z Cholecystitis'
  },

  // ESV-ICD-11: Acute Cholangitis
  {
    nhdd: 'ESV089',
    icd10: 'K83.0',
    icd11: 'DC12.1',
    diagnosis: 'Acute cholangitis',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Biliary Disorders',
    severity: 'Severe',
    commonTerms: ['acute cholangitis', 'bile duct infection', 'ascending cholangitis'],
    nhddDescription: 'Acute infection of the bile ducts',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC12-DC1Z Choledocholithiasis'
  },

  // ESV-ICD-11: Acute Peritonitis
  {
    nhdd: 'ESV090',
    icd10: 'K65.9',
    icd11: 'DC90.Z',
    diagnosis: 'Peritonitis, unspecified',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Peritoneal Disorders',
    severity: 'Severe',
    commonTerms: ['acute peritonitis', 'peritoneal infection', 'abdominal infection'],
    nhddDescription: 'Acute inflammation of the peritoneum',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC90-DC9Z Peritonitis'
  },

  // ESV-ICD-11: Acute Diverticulitis
  {
    nhdd: 'ESV091',
    icd10: 'K57.30',
    icd11: 'DD70.0',
    diagnosis: 'Acute diverticulitis of large intestine without perforation or abscess',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Colonic Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['acute diverticulitis', 'diverticular disease', 'colon inflammation'],
    nhddDescription: 'Acute inflammation of colonic diverticula',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DD70-DD7Z Diverticular disease of large intestine'
  },

  // ESV-ICD-11: Acute Mesenteric Ischemia
  {
    nhdd: 'ESV092',
    icd10: 'K55.0',
    icd11: 'DD91.0',
    diagnosis: 'Acute vascular disorders of intestine',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Vascular Disorders',
    severity: 'Severe',
    commonTerms: ['acute mesenteric ischemia', 'intestinal ischemia', 'mesenteric infarction'],
    nhddDescription: 'Acute loss of blood supply to the intestines',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DD91-DD9Z Vascular disorders of intestine'
  },

  // ESV-ICD-11: Acute Intestinal Obstruction
  {
    nhdd: 'ESV093',
    icd10: 'K56.6',
    icd11: 'DD90.0',
    diagnosis: 'Intestinal obstruction, unspecified',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Intestinal Disorders',
    severity: 'Severe',
    commonTerms: ['acute intestinal obstruction', 'bowel obstruction', 'intestinal blockage'],
    nhddDescription: 'Complete or partial blockage of the intestines',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DD90-DD9Z Intestinal obstruction'
  },

  // ESV-ICD-11: Acute Intussusception
  {
    nhdd: 'ESV094',
    icd10: 'K56.1',
    icd11: 'DD90.1',
    diagnosis: 'Intussusception',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Intestinal Disorders',
    severity: 'Severe',
    commonTerms: ['intussusception', 'telescoping bowel', 'intestinal intussusception'],
    nhddDescription: 'Telescoping of one part of intestine into another',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DD90-DD9Z Intestinal obstruction'
  },

  // ESV-ICD-11: Acute Volvulus
  {
    nhdd: 'ESV095',
    icd10: 'K56.2',
    icd11: 'DD90.2',
    diagnosis: 'Volvulus',
    category: 'ESV-ICD-11: Gastrointestinal Disorders',
    subcategory: 'Intestinal Disorders',
    severity: 'Severe',
    commonTerms: ['volvulus', 'twisted bowel', 'intestinal torsion'],
    nhddDescription: 'Twisting of the intestine causing obstruction',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DD90-DD9Z Intestinal obstruction'
  },

  // =====================================================================
  // CHAPTER 22: Injury, poisoning or certain other consequences of external causes (NA00-NF0Z)
  // =====================================================================

  // TRAUMA: Head Injuries
  {
    nhdd: 'TRAUMA001',
    icd10: 'S09.90',
    icd11: 'NA07.Z',
    diagnosis: 'Unspecified injury of head',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Head Injuries',
    severity: 'Mild to Severe',
    commonTerms: ['head injury', 'head trauma', 'cranial trauma'],
    nhddDescription: 'Injury to the head region, unspecified type',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA00-NA0Z Injuries to the head'
  },
  {
    nhdd: 'TRAUMA002',
    icd10: 'S06.9',
    icd11: 'NA07.0',
    diagnosis: 'Intracranial injury, unspecified',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Head Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['intracranial injury', 'brain injury', 'head injury', 'TBI'],
    nhddDescription: 'Injury to intracranial structures',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA00-NA0Z Injuries to the head'
  },
  {
    nhdd: 'TRAUMA003',
    icd10: 'S06.0',
    icd11: 'NA07.1',
    diagnosis: 'Concussion',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Head Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['concussion', 'mild TBI', 'brain concussion', 'head concussion'],
    nhddDescription: 'Traumatic brain injury with temporary loss of brain function',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA00-NA0Z Injuries to the head'
  },
  {
    nhdd: 'TRAUMA004',
    icd10: 'S06.5',
    icd11: 'NA07.2',
    diagnosis: 'Traumatic subdural hemorrhage',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Head Injuries',
    severity: 'Severe',
    commonTerms: ['subdural hemorrhage', 'subdural hematoma', 'SDH'],
    nhddDescription: 'Bleeding beneath the dura mater following head trauma',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA00-NA0Z Injuries to the head'
  },
  {
    nhdd: 'TRAUMA005',
    icd10: 'S06.4',
    icd11: 'NA07.3',
    diagnosis: 'Epidural hemorrhage',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Head Injuries',
    severity: 'Severe',
    commonTerms: ['epidural hemorrhage', 'epidural hematoma', 'EDH'],
    nhddDescription: 'Bleeding between the skull and dura mater',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA00-NA0Z Injuries to the head'
  },
  {
    nhdd: 'TRAUMA006',
    icd10: 'S02.0',
    icd11: 'NA01.0',
    diagnosis: 'Fracture of skull vault',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Head Injuries',
    severity: 'Severe',
    commonTerms: ['skull fracture', 'cranial fracture', 'fractured skull'],
    nhddDescription: 'Break in the bones of the skull',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA01-NA0Z Fracture of skull'
  },

  // TRAUMA: Facial Injuries
  {
    nhdd: 'TRAUMA007',
    icd10: 'S00.93',
    icd11: 'NA08.Z',
    diagnosis: 'Contusion of face',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Facial Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['facial contusion', 'face bruise', 'facial bruising'],
    nhddDescription: 'Bruising of facial tissues without open wound',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA08-NA0Z Injuries to the face'
  },
  {
    nhdd: 'TRAUMA008',
    icd10: 'S02.4',
    icd11: 'NA02.0',
    diagnosis: 'Fracture of malar, maxillary and zygoma bones',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Facial Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['facial fracture', 'cheekbone fracture', 'maxillary fracture', 'zygoma fracture'],
    nhddDescription: 'Fracture of facial bones',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA02-NA0Z Fracture of facial bones'
  },
  {
    nhdd: 'TRAUMA009',
    icd10: 'S02.5',
    icd11: 'NA02.1',
    diagnosis: 'Fracture of tooth',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Dental Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['fractured tooth', 'broken tooth', 'tooth fracture', 'dental trauma'],
    nhddDescription: 'Break or crack in tooth structure',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA02-NA0Z Fracture of facial bones'
  },

  // TRAUMA: Neck Injuries
  {
    nhdd: 'TRAUMA010',
    icd10: 'S19.9',
    icd11: 'NB0Z.Z',
    diagnosis: 'Unspecified injury of neck',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Neck Injuries',
    severity: 'Mild to Severe',
    commonTerms: ['neck injury', 'neck trauma', 'cervical trauma'],
    nhddDescription: 'Injury to the neck region',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NB00-NB0Z Injuries to the neck'
  },
  {
    nhdd: 'TRAUMA011',
    icd10: 'S13.4',
    icd11: 'NB03.0',
    diagnosis: 'Sprain and strain of cervical spine',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Neck Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['whiplash', 'cervical sprain', 'neck sprain', 'neck strain'],
    nhddDescription: 'Stretching or tearing of ligaments in the neck',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NB03-NB0Z Dislocation, sprain and strain of joints and ligaments of neck'
  },

  // TRAUMA: Thoracic Injuries
  {
    nhdd: 'TRAUMA012',
    icd10: 'S29.9',
    icd11: 'NC0Z.Z',
    diagnosis: 'Unspecified injury of thorax',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Chest Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['chest injury', 'thoracic injury', 'chest trauma', 'thoracic trauma'],
    nhddDescription: 'Injury to the thoracic region',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NC00-NC0Z Injuries to the thorax'
  },
  {
    nhdd: 'TRAUMA013',
    icd10: 'S22.4',
    icd11: 'NC11.0',
    diagnosis: 'Multiple fractures of ribs',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Chest Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['rib fractures', 'broken ribs', 'fractured ribs', 'multiple rib fractures'],
    nhddDescription: 'Breaks in two or more ribs',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NC11-NC1Z Fracture of rib(s), sternum and thoracic spine'
  },
  {
    nhdd: 'TRAUMA014',
    icd10: 'S27.0',
    icd11: 'NC14.0',
    diagnosis: 'Traumatic pneumothorax',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Chest Injuries',
    severity: 'Severe',
    commonTerms: ['pneumothorax', 'collapsed lung', 'traumatic pneumothorax'],
    nhddDescription: 'Air in the pleural space following trauma',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NC14-NC1Z Injury of intrathoracic organs'
  },
  {
    nhdd: 'TRAUMA015',
    icd10: 'S27.1',
    icd11: 'NC14.1',
    diagnosis: 'Traumatic hemothorax',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Chest Injuries',
    severity: 'Severe',
    commonTerms: ['hemothorax', 'blood in chest', 'traumatic hemothorax'],
    nhddDescription: 'Blood in the pleural space following trauma',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NC14-NC1Z Injury of intrathoracic organs'
  },

  // TRAUMA: Abdominal Injuries
  {
    nhdd: 'TRAUMA016',
    icd10: 'S39.9',
    icd11: 'ND0Z.Z',
    diagnosis: 'Unspecified injury of abdomen',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Abdominal Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['abdominal injury', 'abdominal trauma', 'belly trauma', 'stomach trauma'],
    nhddDescription: 'Injury to the abdominal region',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'ND00-ND0Z Injuries to the abdomen, lower back, lumbar spine and pelvis'
  },
  {
    nhdd: 'TRAUMA017',
    icd10: 'S36.0',
    icd11: 'ND14.0',
    diagnosis: 'Injury of spleen',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Abdominal Injuries',
    severity: 'Severe',
    commonTerms: ['splenic injury', 'ruptured spleen', 'spleen trauma', 'splenic rupture'],
    nhddDescription: 'Traumatic injury to the spleen',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'ND14-ND1Z Injury of intra-abdominal organs'
  },
  {
    nhdd: 'TRAUMA018',
    icd10: 'S36.1',
    icd11: 'ND14.1',
    diagnosis: 'Injury of liver and gallbladder',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Abdominal Injuries',
    severity: 'Severe',
    commonTerms: ['liver injury', 'liver trauma', 'hepatic injury', 'liver laceration'],
    nhddDescription: 'Traumatic injury to liver or gallbladder',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'ND14-ND1Z Injury of intra-abdominal organs'
  },
  {
    nhdd: 'TRAUMA019',
    icd10: 'S36.4',
    icd11: 'ND14.2',
    diagnosis: 'Injury of small intestine',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Abdominal Injuries',
    severity: 'Severe',
    commonTerms: ['small bowel injury', 'intestinal injury', 'bowel perforation'],
    nhddDescription: 'Traumatic injury to the small intestine',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'ND14-ND1Z Injury of intra-abdominal organs'
  },

  // TRAUMA: Blunt Trauma (Multiple Body Regions)
  {
    nhdd: 'TRAUMA020',
    icd10: 'T14.8',
    icd11: 'NE6Z.Z',
    diagnosis: 'Other injury of unspecified body region',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Blunt Trauma',
    severity: 'Mild to Severe',
    commonTerms: ['blunt trauma', 'blunt force trauma', 'blunt injury', 'contusion'],
    nhddDescription: 'Non-penetrating injury caused by blunt force',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE60-NE6Z Injuries to unspecified part of trunk, limb or body region'
  },
  {
    nhdd: 'TRAUMA021',
    icd10: 'T14.0',
    icd11: 'NE60.0',
    diagnosis: 'Superficial injury of unspecified body region',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Blunt Trauma',
    severity: 'Mild',
    commonTerms: ['superficial injury', 'minor trauma', 'bruise', 'contusion'],
    nhddDescription: 'Minor injury affecting surface tissues',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE60-NE6Z Injuries to unspecified part of trunk, limb or body region'
  },
  {
    nhdd: 'TRAUMA022',
    icd10: 'T07',
    icd11: 'NE90.Z',
    diagnosis: 'Multiple injuries, unspecified',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Multiple Trauma',
    severity: 'Moderate to Severe',
    commonTerms: ['multiple injuries', 'polytrauma', 'multiple trauma', 'multi-system trauma'],
    nhddDescription: 'Injuries affecting multiple body regions',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE90-NE9Z Injuries involving multiple body regions'
  },

  // TRAUMA: Extremity Injuries - Upper Limb
  {
    nhdd: 'TRAUMA023',
    icd10: 'S49.9',
    icd11: 'NE0Z.Z',
    diagnosis: 'Unspecified injury of shoulder and upper arm',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Upper Limb Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['shoulder injury', 'arm injury', 'upper arm trauma'],
    nhddDescription: 'Injury to shoulder or upper arm region',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE00-NE0Z Injuries to the shoulder or upper arm'
  },
  {
    nhdd: 'TRAUMA024',
    icd10: 'S42.0',
    icd11: 'NE11.0',
    diagnosis: 'Fracture of clavicle',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Upper Limb Injuries',
    severity: 'Moderate',
    commonTerms: ['clavicle fracture', 'broken collarbone', 'fractured collarbone'],
    nhddDescription: 'Break in the clavicle bone',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE11-NE1Z Fracture at shoulder and upper arm level'
  },
  {
    nhdd: 'TRAUMA025',
    icd10: 'S42.2',
    icd11: 'NE11.1',
    diagnosis: 'Fracture of upper end of humerus',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Upper Limb Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['humeral fracture', 'shoulder fracture', 'proximal humerus fracture'],
    nhddDescription: 'Fracture of the upper portion of arm bone',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE11-NE1Z Fracture at shoulder and upper arm level'
  },
  {
    nhdd: 'TRAUMA026',
    icd10: 'S52.5',
    icd11: 'NE21.0',
    diagnosis: 'Fracture of lower end of radius',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Upper Limb Injuries',
    severity: 'Moderate',
    commonTerms: ['wrist fracture', 'Colles fracture', 'distal radius fracture', 'broken wrist'],
    nhddDescription: 'Fracture of the radius bone near the wrist',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE21-NE2Z Fracture at forearm level'
  },
  {
    nhdd: 'TRAUMA027',
    icd10: 'S62.5',
    icd11: 'NE31.0',
    diagnosis: 'Fracture of thumb',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Hand Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['thumb fracture', 'broken thumb', 'fractured thumb'],
    nhddDescription: 'Break in the bones of the thumb',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE31-NE3Z Fracture at wrist and hand level'
  },

  // TRAUMA: Extremity Injuries - Lower Limb
  {
    nhdd: 'TRAUMA028',
    icd10: 'S79.9',
    icd11: 'NF0Z.Z',
    diagnosis: 'Unspecified injury of hip and thigh',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Lower Limb Injuries',
    severity: 'Mild to Severe',
    commonTerms: ['hip injury', 'thigh injury', 'hip trauma'],
    nhddDescription: 'Injury to hip or thigh region',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF00-NF0Z Injuries to the hip and thigh'
  },
  {
    nhdd: 'TRAUMA029',
    icd10: 'S72.0',
    icd11: 'NF11.0',
    diagnosis: 'Fracture of neck of femur',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Lower Limb Injuries',
    severity: 'Severe',
    commonTerms: ['hip fracture', 'femoral neck fracture', 'broken hip'],
    nhddDescription: 'Break in the neck of the femur bone',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF11-NF1Z Fracture of femur'
  },
  {
    nhdd: 'TRAUMA030',
    icd10: 'S82.0',
    icd11: 'NF21.0',
    diagnosis: 'Fracture of patella',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Lower Limb Injuries',
    severity: 'Moderate',
    commonTerms: ['kneecap fracture', 'patella fracture', 'broken kneecap'],
    nhddDescription: 'Break in the kneecap bone',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF21-NF2Z Fracture of lower leg, including ankle'
  },
  {
    nhdd: 'TRAUMA031',
    icd10: 'S82.2',
    icd11: 'NF21.1',
    diagnosis: 'Fracture of shaft of tibia',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Lower Limb Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['tibia fracture', 'shin fracture', 'broken leg', 'tibial shaft fracture'],
    nhddDescription: 'Break in the shaft of the tibia bone',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF21-NF2Z Fracture of lower leg, including ankle'
  },
  {
    nhdd: 'TRAUMA032',
    icd10: 'S82.5',
    icd11: 'NF21.2',
    diagnosis: 'Fracture of medial malleolus',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Lower Limb Injuries',
    severity: 'Moderate',
    commonTerms: ['ankle fracture', 'broken ankle', 'malleolus fracture'],
    nhddDescription: 'Fracture of the inner ankle bone',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF21-NF2Z Fracture of lower leg, including ankle'
  },
  {
    nhdd: 'TRAUMA033',
    icd10: 'S92.9',
    icd11: 'NF31.Z',
    diagnosis: 'Fracture of foot, unspecified',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Foot Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['foot fracture', 'broken foot', 'fractured foot'],
    nhddDescription: 'Break in bones of the foot',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF31-NF3Z Fracture of foot'
  },

  // TRAUMA: Spinal Injuries
  {
    nhdd: 'TRAUMA034',
    icd10: 'S14.1',
    icd11: 'NB05.0',
    diagnosis: 'Injury of cervical spinal cord',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Spinal Cord Injuries',
    severity: 'Severe',
    commonTerms: ['spinal cord injury', 'cervical spinal injury', 'neck spinal injury', 'SCI'],
    nhddDescription: 'Injury to the cervical spinal cord',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NB05-NB0Z Injury of spinal cord'
  },
  {
    nhdd: 'TRAUMA035',
    icd10: 'S32.0',
    icd11: 'ND11.0',
    diagnosis: 'Fracture of lumbar vertebra',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Spinal Injuries',
    severity: 'Severe',
    commonTerms: ['lumbar fracture', 'back fracture', 'vertebral fracture', 'spine fracture'],
    nhddDescription: 'Break in lumbar vertebral bone',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'ND11-ND1Z Fracture of lumbar spine and pelvis'
  },
  {
    nhdd: 'TRAUMA036',
    icd10: 'S22.0',
    icd11: 'NC11.1',
    diagnosis: 'Fracture of thoracic vertebra',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Spinal Injuries',
    severity: 'Severe',
    commonTerms: ['thoracic vertebral fracture', 'mid-back fracture', 'spine fracture'],
    nhddDescription: 'Break in thoracic vertebral bone',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NC11-NC1Z Fracture of rib(s), sternum and thoracic spine'
  },

  // TRAUMA: Soft Tissue Injuries
  {
    nhdd: 'TRAUMA037',
    icd10: 'T14.0',
    icd11: 'NE60.1',
    diagnosis: 'Abrasion of unspecified body region',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Soft Tissue Injuries',
    severity: 'Mild',
    commonTerms: ['abrasion', 'scrape', 'road rash', 'skin abrasion'],
    nhddDescription: 'Superficial removal of skin surface',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE60-NE6Z Injuries to unspecified part of trunk, limb or body region'
  },
  {
    nhdd: 'TRAUMA038',
    icd10: 'T14.1',
    icd11: 'NE61.0',
    diagnosis: 'Open wound of unspecified body region',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Soft Tissue Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['open wound', 'laceration', 'cut', 'gash'],
    nhddDescription: 'Break in the skin with exposed tissue',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE61-NE6Z Open wound'
  },
  {
    nhdd: 'TRAUMA039',
    icd10: 'S01.0',
    icd11: 'NA06.0',
    diagnosis: 'Open wound of scalp',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Soft Tissue Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['scalp laceration', 'scalp wound', 'head laceration', 'scalp cut'],
    nhddDescription: 'Open wound of the scalp',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA06-NA0Z Open wound of head'
  },
  {
    nhdd: 'TRAUMA040',
    icd10: 'S61.9',
    icd11: 'NE36.Z',
    diagnosis: 'Open wound of wrist and hand, unspecified',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Hand Injuries',
    severity: 'Mild to Moderate',
    commonTerms: ['hand laceration', 'hand cut', 'wrist laceration', 'hand wound'],
    nhddDescription: 'Open wound of hand or wrist region',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE36-NE3Z Open wound of wrist and hand'
  },

  // TRAUMA: Burns
  {
    nhdd: 'TRAUMA041',
    icd10: 'T30.0',
    icd11: 'NF60.0',
    diagnosis: 'Burn of unspecified body region, unspecified degree',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Burns',
    severity: 'Mild to Severe',
    commonTerms: ['burn', 'thermal burn', 'burn injury'],
    nhddDescription: 'Tissue damage from heat, electricity, chemicals, or radiation',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF60-NF6Z Burns or corrosions'
  },
  {
    nhdd: 'TRAUMA042',
    icd10: 'T20.0',
    icd11: 'NF61.0',
    diagnosis: 'Burn of head and neck, unspecified degree',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Burns',
    severity: 'Moderate to Severe',
    commonTerms: ['facial burn', 'head burn', 'neck burn'],
    nhddDescription: 'Burn injury to head and neck region',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF61-NF6Z Burn or corrosion of head and neck'
  },
  {
    nhdd: 'TRAUMA043',
    icd10: 'T31.0',
    icd11: 'NF62.0',
    diagnosis: 'Burns involving less than 10% of body surface',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Burns',
    severity: 'Mild to Moderate',
    commonTerms: ['minor burn', 'first degree burn', 'superficial burn'],
    nhddDescription: 'Burns affecting less than 10% of total body surface area',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF62-NF6Z Burns classified by extent of body surface involved'
  },
  {
    nhdd: 'TRAUMA044',
    icd10: 'T31.2',
    icd11: 'NF62.1',
    diagnosis: 'Burns involving 20-29% of body surface',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Burns',
    severity: 'Severe',
    commonTerms: ['major burn', 'extensive burn', 'severe burn'],
    nhddDescription: 'Burns affecting 20-29% of total body surface area',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF62-NF6Z Burns classified by extent of body surface involved'
  },

  // TRAUMA: Poisoning and Toxic Effects
  {
    nhdd: 'TRAUMA045',
    icd10: 'T50.9',
    icd11: 'NE90.0',
    diagnosis: 'Poisoning by other and unspecified drugs, medicaments and biological substances',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Poisoning',
    severity: 'Mild to Severe',
    commonTerms: ['drug poisoning', 'poisoning', 'drug overdose', 'toxic ingestion'],
    nhddDescription: 'Harmful effects from ingestion of toxic substances',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE90-NE9Z Poisoning by drugs, medicaments and biological substances'
  },
  {
    nhdd: 'TRAUMA046',
    icd10: 'T60.9',
    icd11: 'NE91.0',
    diagnosis: 'Toxic effect of unspecified pesticide',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Poisoning',
    severity: 'Moderate to Severe',
    commonTerms: ['pesticide poisoning', 'insecticide poisoning', 'organophosphate poisoning'],
    nhddDescription: 'Toxic effects from pesticide exposure',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE91-NE9Z Toxic effects of substances chiefly nonmedicinal'
  },
  {
    nhdd: 'TRAUMA047',
    icd10: 'T51.0',
    icd11: 'NE91.1',
    diagnosis: 'Toxic effect of ethanol',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Poisoning',
    severity: 'Mild to Severe',
    commonTerms: ['alcohol poisoning', 'ethanol poisoning', 'alcohol intoxication'],
    nhddDescription: 'Toxic effects from ethanol consumption',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NE91-NE9Z Toxic effects of substances chiefly nonmedicinal'
  },

  // TRAUMA: Foreign Body
  {
    nhdd: 'TRAUMA048',
    icd10: 'T18.9',
    icd11: 'NF70.0',
    diagnosis: 'Foreign body in alimentary tract, part unspecified',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Foreign Body',
    severity: 'Mild to Severe',
    commonTerms: ['swallowed foreign body', 'ingested foreign object', 'foreign body ingestion'],
    nhddDescription: 'Object lodged in digestive system',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF70-NF7Z Effects of foreign body entering through natural orifice'
  },
  {
    nhdd: 'TRAUMA049',
    icd10: 'T17.9',
    icd11: 'NF70.1',
    diagnosis: 'Foreign body in respiratory tract, part unspecified',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Foreign Body',
    severity: 'Moderate to Severe',
    commonTerms: ['aspirated foreign body', 'foreign body aspiration', 'choking'],
    nhddDescription: 'Object lodged in airway or respiratory system',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF70-NF7Z Effects of foreign body entering through natural orifice'
  },
  {
    nhdd: 'TRAUMA050',
    icd10: 'T15.9',
    icd11: 'NF70.2',
    diagnosis: 'Foreign body in eye, part unspecified',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Foreign Body',
    severity: 'Mild to Moderate',
    commonTerms: ['foreign body in eye', 'eye foreign body', 'something in eye'],
    nhddDescription: 'Object lodged in or on the eye',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF70-NF7Z Effects of foreign body entering through natural orifice'
  },

  // TRAUMA: Animal and Insect Injuries
  {
    nhdd: 'TRAUMA051',
    icd10: 'W54.0',
    icd11: 'PE20.0',
    diagnosis: 'Dog bite',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Animal Bites',
    severity: 'Mild to Severe',
    commonTerms: ['dog bite', 'animal bite', 'dog attack'],
    nhddDescription: 'Bite injury from a dog',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PE20-PE2Z Contact with mammals'
  },
  {
    nhdd: 'TRAUMA052',
    icd10: 'W57',
    icd11: 'PE21.0',
    diagnosis: 'Bite or sting by nonvenomous insect and other nonvenomous arthropods',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Insect Bites',
    severity: 'Mild',
    commonTerms: ['insect bite', 'bug bite', 'insect sting', 'bee sting'],
    nhddDescription: 'Bite or sting from non-venomous insects',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PE21-PE2Z Contact with venomous animals or plants'
  },
  {
    nhdd: 'TRAUMA053',
    icd10: 'X20',
    icd11: 'PE22.0',
    diagnosis: 'Snake bite',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Animal Bites',
    severity: 'Moderate to Severe',
    commonTerms: ['snake bite', 'venomous snake bite', 'serpent bite'],
    nhddDescription: 'Bite injury from a snake',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PE22-PE2Z Contact with venomous reptiles'
  },

  // TRAUMA: Road Traffic Injuries
  {
    nhdd: 'TRAUMA054',
    icd10: 'V89.9',
    icd11: 'PB00.Z',
    diagnosis: 'Motor vehicle accident, unspecified',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Road Traffic Injuries',
    severity: 'Mild to Severe',
    commonTerms: ['car accident', 'motor vehicle accident', 'MVA', 'traffic accident', 'road accident'],
    nhddDescription: 'Injury sustained in motor vehicle collision',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PB00-PB0Z Transport accidents'
  },
  {
    nhdd: 'TRAUMA055',
    icd10: 'V19.9',
    icd11: 'PB01.0',
    diagnosis: 'Motorcycle accident',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Road Traffic Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['motorcycle accident', 'motorbike accident', 'motorcycle crash'],
    nhddDescription: 'Injury sustained in motorcycle collision',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PB01-PB0Z Motorcycle rider injured in transport accident'
  },
  {
    nhdd: 'TRAUMA056',
    icd10: 'V09.9',
    icd11: 'PB02.0',
    diagnosis: 'Pedestrian injured in traffic accident',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Road Traffic Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['pedestrian hit', 'hit by car', 'pedestrian accident', 'struck by vehicle'],
    nhddDescription: 'Injury to pedestrian struck by vehicle',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PB02-PB0Z Pedestrian injured in transport accident'
  },

  // TRAUMA: Falls
  {
    nhdd: 'TRAUMA057',
    icd10: 'W19',
    icd11: 'PC00.Z',
    diagnosis: 'Unspecified fall',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Falls',
    severity: 'Mild to Severe',
    commonTerms: ['fall', 'fallen', 'fall injury', 'mechanical fall'],
    nhddDescription: 'Injury from falling',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PC00-PC0Z Falls'
  },
  {
    nhdd: 'TRAUMA058',
    icd10: 'W01',
    icd11: 'PC01.0',
    diagnosis: 'Fall on same level from slipping, tripping and stumbling',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Falls',
    severity: 'Mild to Moderate',
    commonTerms: ['slip and fall', 'tripping', 'stumble', 'slipped'],
    nhddDescription: 'Fall on same level due to loss of balance',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PC01-PC0Z Fall on same level'
  },
  {
    nhdd: 'TRAUMA059',
    icd10: 'W10',
    icd11: 'PC02.0',
    diagnosis: 'Fall on and from stairs and steps',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Falls',
    severity: 'Moderate to Severe',
    commonTerms: ['fall down stairs', 'fell from steps', 'stair fall'],
    nhddDescription: 'Fall involving stairs or steps',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PC02-PC0Z Fall from one level to another'
  },

  // TRAUMA: Assault
  {
    nhdd: 'TRAUMA060',
    icd10: 'X95',
    icd11: 'PD00.0',
    diagnosis: 'Assault by unspecified means',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Assault',
    severity: 'Moderate to Severe',
    commonTerms: ['assault', 'attacked', 'physical assault', 'beaten'],
    nhddDescription: 'Intentional injury inflicted by another person',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PD00-PD0Z Assault'
  },
  {
    nhdd: 'TRAUMA061',
    icd10: 'X99',
    icd11: 'PD01.0',
    diagnosis: 'Assault by sharp object',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Assault',
    severity: 'Severe',
    commonTerms: ['stabbing', 'knife wound', 'stab wound', 'assault with weapon'],
    nhddDescription: 'Intentional injury with sharp object',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'PD01-PD0Z Assault by sharp object'
  },

  // TRAUMA: Drowning and Submersion
  {
    nhdd: 'TRAUMA062',
    icd10: 'T75.1',
    icd11: 'NF80.0',
    diagnosis: 'Drowning and nonfatal submersion',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Drowning',
    severity: 'Severe',
    commonTerms: ['drowning', 'near drowning', 'submersion'],
    nhddDescription: 'Respiratory impairment from submersion in liquid',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF80-NF8Z Other and unspecified effects of external causes'
  },

  // TRAUMA: Electrical Injuries
  {
    nhdd: 'TRAUMA063',
    icd10: 'T75.4',
    icd11: 'NF81.0',
    diagnosis: 'Effects of electric current',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Electrical Injuries',
    severity: 'Moderate to Severe',
    commonTerms: ['electrical injury', 'electric shock', 'electrocution'],
    nhddDescription: 'Injury from electrical current exposure',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF81-NF8Z Effects of electric current'
  },

  // TRAUMA: Complications of Trauma
  {
    nhdd: 'TRAUMA064',
    icd10: 'T79.3',
    icd11: 'NF90.0',
    diagnosis: 'Post-traumatic wound infection',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Complications',
    severity: 'Moderate to Severe',
    commonTerms: ['wound infection', 'infected wound', 'post-traumatic infection'],
    nhddDescription: 'Infection developing in traumatic wound',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF90-NF9Z Certain early complications of trauma'
  },
  {
    nhdd: 'TRAUMA065',
    icd10: 'T79.0',
    icd11: 'NF90.1',
    diagnosis: 'Air embolism (traumatic)',
    category: 'ESV-ICD-11: Trauma & Injuries',
    subcategory: 'Complications',
    severity: 'Severe',
    commonTerms: ['air embolism', 'gas embolism', 'traumatic air embolism'],
    nhddDescription: 'Air bubbles in bloodstream following trauma',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NF90-NF9Z Certain early complications of trauma'
  },

  // ─── BREAST CONDITIONS ──────────────────────────────────────────────────────
  {
    nhdd: 'BREAST001',
    icd10: 'O91.2',
    icd11: 'JA80.0',
    diagnosis: 'Mastitis',
    category: 'Breast Disorders',
    subcategory: 'Breast Infections',
    severity: 'Moderate',
    commonTerms: ['mastitis', 'breast inflammation', 'lactational mastitis', 'puerperal mastitis', 'breast infection'],
    nhddDescription: 'Inflammation of breast tissue, often associated with breastfeeding',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'JA80-JA8Z Disorders of breast'
  },
  {
    nhdd: 'BREAST002',
    icd10: 'N61',
    icd11: 'JA80.1',
    diagnosis: 'Breast abscess',
    category: 'Breast Disorders',
    subcategory: 'Breast Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['breast abscess', 'mammary abscess', 'breast pus', 'purulent mastitis'],
    nhddDescription: 'Localized collection of pus within breast tissue',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'JA80-JA8Z Disorders of breast'
  },
  {
    nhdd: 'BREAST003',
    icd10: 'N60.1',
    icd11: 'JA82.0',
    diagnosis: 'Fibrocystic breast disease',
    category: 'Breast Disorders',
    subcategory: 'Benign Breast Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['fibrocystic breast', 'fibrocystic mastopathy', 'cystic breast', 'benign breast disease'],
    nhddDescription: 'Benign condition characterized by lumpiness and breast pain',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'JA80-JA8Z Disorders of breast'
  },
  {
    nhdd: 'BREAST004',
    icd10: 'N64.4',
    icd11: 'JA84.0',
    diagnosis: 'Mastalgia',
    category: 'Breast Disorders',
    subcategory: 'Breast Pain',
    severity: 'Mild to Moderate',
    commonTerms: ['breast pain', 'mastalgia', 'mastodynia', 'breast tenderness'],
    nhddDescription: 'Pain in the breast tissue',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'JA80-JA8Z Disorders of breast'
  },
  {
    nhdd: 'BREAST005',
    icd10: 'C50.9',
    icd11: '2C60.Z',
    diagnosis: 'Malignant neoplasm of breast, unspecified',
    category: 'Breast Disorders',
    subcategory: 'Breast Malignancy',
    severity: 'Severe',
    commonTerms: ['breast cancer', 'breast carcinoma', 'breast tumor', 'mammary cancer'],
    nhddDescription: 'Malignant tumor arising from breast tissue',
    icd11Chapter: 'Chapter 2: Neoplasms',
    icd11Block: '2C60-2C6Z Malignant neoplasms of breast'
  },

  // ─── ENT CONDITIONS ──────────────────────────────────────────────────────────
  {
    nhdd: 'ENT001',
    icd10: 'J03.9',
    icd11: 'CA03.Z',
    diagnosis: 'Acute tonsillitis, unspecified',
    category: 'ENT Disorders',
    subcategory: 'Throat Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['tonsillitis', 'sore throat', 'throat infection', 'tonsillar infection'],
    nhddDescription: 'Acute inflammation of the tonsils',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA03-CA0Z Acute pharyngitis and tonsillitis'
  },
  {
    nhdd: 'ENT002',
    icd10: 'J02.9',
    icd11: 'CA02.Z',
    diagnosis: 'Acute pharyngitis, unspecified',
    category: 'ENT Disorders',
    subcategory: 'Throat Infections',
    severity: 'Mild',
    commonTerms: ['pharyngitis', 'sore throat', 'throat pain', 'strep throat'],
    nhddDescription: 'Acute inflammation of the pharynx',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA02-CA0Z Acute pharyngitis'
  },
  {
    nhdd: 'ENT003',
    icd10: 'H66.9',
    icd11: 'AA41.Z',
    diagnosis: 'Otitis media, unspecified',
    category: 'ENT Disorders',
    subcategory: 'Ear Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['ear infection', 'otitis media', 'middle ear infection', 'AOM'],
    nhddDescription: 'Inflammation of the middle ear',
    icd11Chapter: 'Chapter 14: Diseases of the ear or mastoid process',
    icd11Block: 'AA40-AA4Z Otitis media'
  },
  {
    nhdd: 'ENT004',
    icd10: 'H60.9',
    icd11: 'AA30.Z',
    diagnosis: 'Otitis externa, unspecified',
    category: 'ENT Disorders',
    subcategory: 'Ear Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['outer ear infection', 'swimmer\'s ear', 'otitis externa', 'ear canal infection'],
    nhddDescription: 'Inflammation of the external auditory canal',
    icd11Chapter: 'Chapter 14: Diseases of the ear or mastoid process',
    icd11Block: 'AA30-AA3Z Otitis externa'
  },
  {
    nhdd: 'ENT005',
    icd10: 'J32.9',
    icd11: 'CA09.Z',
    diagnosis: 'Chronic sinusitis, unspecified',
    category: 'ENT Disorders',
    subcategory: 'Sinus Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['sinusitis', 'sinus infection', 'chronic sinusitis', 'sinus pain'],
    nhddDescription: 'Chronic inflammation of the paranasal sinuses',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA09-CA0Z Sinusitis'
  },
  {
    nhdd: 'ENT006',
    icd10: 'J00',
    icd11: 'CA40.0',
    diagnosis: 'Acute nasopharyngitis (common cold)',
    category: 'ENT Disorders',
    subcategory: 'Upper Respiratory',
    severity: 'Mild',
    commonTerms: ['common cold', 'cold', 'runny nose', 'coryza', 'nasopharyngitis'],
    nhddDescription: 'Acute viral infection of the nose and throat',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Acute upper respiratory infections'
  },
  {
    nhdd: 'ENT007',
    icd10: 'J34.2',
    icd11: 'CA0J.0',
    diagnosis: 'Deviated nasal septum',
    category: 'ENT Disorders',
    subcategory: 'Nasal Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['deviated septum', 'septal deviation', 'DNS', 'nasal obstruction'],
    nhddDescription: 'Displacement of the nasal septum from midline',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA0J-CA0Z Other disorders of nose and nasal sinuses'
  },
  {
    nhdd: 'ENT008',
    icd10: 'H93.1',
    icd11: 'AA73.Z',
    diagnosis: 'Tinnitus',
    category: 'ENT Disorders',
    subcategory: 'Hearing Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['tinnitus', 'ringing in ears', 'ear ringing', 'buzzing ears'],
    nhddDescription: 'Perception of sound without external stimulation',
    icd11Chapter: 'Chapter 14: Diseases of the ear or mastoid process',
    icd11Block: 'AA73-AA7Z Other specified disorders of ear'
  },

  // ─── EYE CONDITIONS ──────────────────────────────────────────────────────────
  {
    nhdd: 'EYE001',
    icd10: 'H10.9',
    icd11: '9A60.Z',
    diagnosis: 'Conjunctivitis, unspecified',
    category: 'Eye Disorders',
    subcategory: 'Conjunctival Conditions',
    severity: 'Mild',
    commonTerms: ['pink eye', 'conjunctivitis', 'red eye', 'eye infection'],
    nhddDescription: 'Inflammation of the conjunctiva',
    icd11Chapter: 'Chapter 13: Diseases of the eye or adnexa',
    icd11Block: '9A60-9A6Z Conjunctival disorders'
  },
  {
    nhdd: 'EYE002',
    icd10: 'H16.0',
    icd11: '9A76.Z',
    diagnosis: 'Corneal ulcer',
    category: 'Eye Disorders',
    subcategory: 'Corneal Conditions',
    severity: 'Moderate to Severe',
    commonTerms: ['corneal ulcer', 'keratitis', 'eye ulcer'],
    nhddDescription: 'Open sore on the cornea of the eye',
    icd11Chapter: 'Chapter 13: Diseases of the eye or adnexa',
    icd11Block: '9A76-9A7Z Corneal disorders'
  },
  {
    nhdd: 'EYE003',
    icd10: 'H52.1',
    icd11: '9D00.1',
    diagnosis: 'Myopia',
    category: 'Eye Disorders',
    subcategory: 'Refractive Errors',
    severity: 'Mild',
    commonTerms: ['myopia', 'short-sightedness', 'nearsightedness', 'near-sightedness'],
    nhddDescription: 'Refractive error causing difficulty seeing distant objects',
    icd11Chapter: 'Chapter 13: Diseases of the eye or adnexa',
    icd11Block: '9D00-9D0Z Refractive errors'
  },
  {
    nhdd: 'EYE004',
    icd10: 'H35.3',
    icd11: '9B75.Z',
    diagnosis: 'Macular degeneration',
    category: 'Eye Disorders',
    subcategory: 'Retinal Conditions',
    severity: 'Moderate to Severe',
    commonTerms: ['macular degeneration', 'AMD', 'age-related macular degeneration', 'macula'],
    nhddDescription: 'Deterioration of the central portion of the retina',
    icd11Chapter: 'Chapter 13: Diseases of the eye or adnexa',
    icd11Block: '9B75-9B7Z Retinal disorders'
  },
  {
    nhdd: 'EYE005',
    icd10: 'H40.1',
    icd11: '9C61.Z',
    diagnosis: 'Open-angle glaucoma',
    category: 'Eye Disorders',
    subcategory: 'Glaucoma',
    severity: 'Moderate to Severe',
    commonTerms: ['glaucoma', 'raised eye pressure', 'intraocular pressure', 'optic nerve damage'],
    nhddDescription: 'Chronic optic neuropathy with elevated intraocular pressure',
    icd11Chapter: 'Chapter 13: Diseases of the eye or adnexa',
    icd11Block: '9C61-9C6Z Glaucoma'
  },

  // ─── SKIN AND DERMATOLOGY ─────────────────────────────────────────────────
  {
    nhdd: 'DERM001',
    icd10: 'L03.9',
    icd11: '1B74.Z',
    diagnosis: 'Cellulitis, unspecified',
    category: 'Skin & Dermatology',
    subcategory: 'Skin Infections',
    severity: 'Moderate',
    commonTerms: ['cellulitis', 'skin infection', 'soft tissue infection'],
    nhddDescription: 'Diffuse bacterial infection of skin and subcutaneous tissue',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1B70-1B7Z Bacterial infections of the skin or subcutaneous tissues'
  },
  {
    nhdd: 'DERM002',
    icd10: 'L02.9',
    icd11: '1B72.Z',
    diagnosis: 'Cutaneous abscess, unspecified',
    category: 'Skin & Dermatology',
    subcategory: 'Skin Infections',
    severity: 'Moderate',
    commonTerms: ['skin abscess', 'boil', 'furuncle', 'carbuncle', 'pus'],
    nhddDescription: 'Localized collection of pus in the skin',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1B72-1B7Z Staphylococcal infections of skin'
  },
  {
    nhdd: 'DERM003',
    icd10: 'L20.9',
    icd11: 'EA80.Z',
    diagnosis: 'Atopic dermatitis, unspecified',
    category: 'Skin & Dermatology',
    subcategory: 'Eczema & Dermatitis',
    severity: 'Mild to Moderate',
    commonTerms: ['eczema', 'atopic dermatitis', 'atopic eczema', 'itchy skin', 'dermatitis'],
    nhddDescription: 'Chronic inflammatory skin condition with itching',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'EA80-EA8Z Atopic eczema'
  },
  {
    nhdd: 'DERM004',
    icd10: 'L40.0',
    icd11: 'EA90.Z',
    diagnosis: 'Psoriasis vulgaris',
    category: 'Skin & Dermatology',
    subcategory: 'Inflammatory Skin Conditions',
    severity: 'Mild to Severe',
    commonTerms: ['psoriasis', 'plaque psoriasis', 'scaly skin patches'],
    nhddDescription: 'Chronic autoimmune condition causing red scaly patches',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'EA90-EA9Z Psoriasis'
  },
  {
    nhdd: 'DERM005',
    icd10: 'B35.1',
    icd11: '1F28.0',
    diagnosis: 'Tinea capitis (ringworm of scalp)',
    category: 'Skin & Dermatology',
    subcategory: 'Fungal Skin Infections',
    severity: 'Mild',
    commonTerms: ['ringworm', 'tinea capitis', 'scalp fungal infection', 'scalp ringworm'],
    nhddDescription: 'Fungal infection of the scalp and hair',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1F28-1F2Z Dermatophytosis'
  },
  {
    nhdd: 'DERM006',
    icd10: 'B35.4',
    icd11: '1F28.4',
    diagnosis: 'Tinea corporis (ringworm of body)',
    category: 'Skin & Dermatology',
    subcategory: 'Fungal Skin Infections',
    severity: 'Mild',
    commonTerms: ['ringworm', 'body ringworm', 'tinea corporis', 'skin fungus'],
    nhddDescription: 'Fungal infection of the skin of the body',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1F28-1F2Z Dermatophytosis'
  },
  {
    nhdd: 'DERM007',
    icd10: 'B37.2',
    icd11: '1F23.1',
    diagnosis: 'Candidiasis of skin and nail',
    category: 'Skin & Dermatology',
    subcategory: 'Fungal Skin Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['candida skin', 'skin thrush', 'candidiasis', 'yeast skin infection'],
    nhddDescription: 'Skin infection caused by Candida species',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1F23-1F2Z Candidiasis'
  },
  {
    nhdd: 'DERM008',
    icd10: 'L50.0',
    icd11: 'EB01.Z',
    diagnosis: 'Allergic urticaria',
    category: 'Skin & Dermatology',
    subcategory: 'Allergic Skin Reactions',
    severity: 'Mild to Moderate',
    commonTerms: ['hives', 'urticaria', 'allergic hives', 'skin allergy', 'wheals'],
    nhddDescription: 'Allergic skin reaction producing raised itchy wheals',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'EB01-EB0Z Urticaria'
  },
  {
    nhdd: 'DERM009',
    icd10: 'L23.9',
    icd11: 'EK00.Z',
    diagnosis: 'Allergic contact dermatitis, unspecified',
    category: 'Skin & Dermatology',
    subcategory: 'Contact Dermatitis',
    severity: 'Mild to Moderate',
    commonTerms: ['contact dermatitis', 'contact allergy', 'skin rash from contact', 'allergic rash'],
    nhddDescription: 'Skin inflammation from contact with an allergen',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'EK00-EK0Z Contact dermatitis'
  },
  {
    nhdd: 'DERM010',
    icd10: 'L60.0',
    icd11: 'ED50.0',
    diagnosis: 'Ingrowing nail',
    category: 'Skin & Dermatology',
    subcategory: 'Nail Disorders',
    severity: 'Mild',
    commonTerms: ['ingrown nail', 'ingrowing toenail', 'onychocryptosis'],
    nhddDescription: 'Nail grows into surrounding soft tissue causing pain',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'ED50-ED5Z Nail disorders'
  },

  // ─── OBSTETRICS & GYNAECOLOGY ─────────────────────────────────────────────
  {
    nhdd: 'OBSGYN001',
    icd10: 'N39.0',
    icd11: 'GC08.0',
    diagnosis: 'Urinary tract infection, site not specified',
    category: 'Urinary & Gynaecology',
    subcategory: 'Urinary Tract Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['UTI', 'urinary tract infection', 'bladder infection', 'urine infection', 'dysuria'],
    nhddDescription: 'Infection of the urinary tract',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GC08-GC0Z Urinary tract infections'
  },
  {
    nhdd: 'OBSGYN002',
    icd10: 'N76.0',
    icd11: 'GA10.Z',
    diagnosis: 'Acute vaginitis',
    category: 'Urinary & Gynaecology',
    subcategory: 'Vaginal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['vaginitis', 'vaginal infection', 'vaginal discharge', 'vaginal inflammation'],
    nhddDescription: 'Acute inflammation of the vagina',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GA10-GA1Z Inflammatory disorders of vagina'
  },
  {
    nhdd: 'OBSGYN003',
    icd10: 'B37.3',
    icd11: '1F23.2',
    diagnosis: 'Vaginal candidiasis',
    category: 'Urinary & Gynaecology',
    subcategory: 'Vaginal Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['vaginal thrush', 'candida vaginitis', 'vaginal yeast infection', 'candidiasis vaginal'],
    nhddDescription: 'Vaginal infection caused by Candida species',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1F23-1F2Z Candidiasis'
  },
  {
    nhdd: 'OBSGYN004',
    icd10: 'N73.0',
    icd11: 'GA50.0',
    diagnosis: 'Acute pelvic inflammatory disease',
    category: 'Urinary & Gynaecology',
    subcategory: 'Pelvic Conditions',
    severity: 'Moderate to Severe',
    commonTerms: ['PID', 'pelvic inflammatory disease', 'salpingitis', 'pelvic infection'],
    nhddDescription: 'Infection of female upper genital tract',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GA50-GA5Z Inflammatory disorders of uterus'
  },
  {
    nhdd: 'OBSGYN005',
    icd10: 'N92.0',
    icd11: 'GA20.0',
    diagnosis: 'Heavy menstrual bleeding',
    category: 'Urinary & Gynaecology',
    subcategory: 'Menstrual Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['heavy periods', 'menorrhagia', 'heavy menstrual bleeding', 'HMB', 'heavy flow'],
    nhddDescription: 'Abnormally heavy or prolonged menstrual bleeding',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GA20-GA2Z Menstrual disorders'
  },
  {
    nhdd: 'OBSGYN006',
    icd10: 'N94.6',
    icd11: 'GA20.3',
    diagnosis: 'Dysmenorrhoea, unspecified',
    category: 'Urinary & Gynaecology',
    subcategory: 'Menstrual Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['dysmenorrhoea', 'painful periods', 'menstrual cramps', 'period pain'],
    nhddDescription: 'Painful menstruation',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GA20-GA2Z Menstrual disorders'
  },
  {
    nhdd: 'OBSGYN007',
    icd10: 'N80.0',
    icd11: 'GA10.2',
    diagnosis: 'Endometriosis of uterus',
    category: 'Urinary & Gynaecology',
    subcategory: 'Uterine Conditions',
    severity: 'Mild to Severe',
    commonTerms: ['endometriosis', 'adenomyosis', 'endometrial tissue', 'uterine endometriosis'],
    nhddDescription: 'Endometrial tissue growing outside the uterus',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GA10-GA1Z Endometriosis'
  },
  {
    nhdd: 'OBSGYN008',
    icd10: 'D25.9',
    icd11: 'GA16.0',
    diagnosis: 'Uterine fibroids (leiomyoma of uterus)',
    category: 'Urinary & Gynaecology',
    subcategory: 'Uterine Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['fibroids', 'uterine fibroids', 'leiomyoma', 'myoma', 'fibromyoma'],
    nhddDescription: 'Benign smooth muscle tumors of the uterus',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GA16-GA1Z Benign uterine conditions'
  },
  {
    nhdd: 'OBSGYN009',
    icd10: 'O20.0',
    icd11: 'JA00.0',
    diagnosis: 'Threatened abortion',
    category: 'Obstetrics',
    subcategory: 'Pregnancy Complications',
    severity: 'Moderate',
    commonTerms: ['threatened miscarriage', 'threatened abortion', 'vaginal bleeding in pregnancy', 'threatened pregnancy loss'],
    nhddDescription: 'Vaginal bleeding in early pregnancy without cervical dilation',
    icd11Chapter: 'Chapter 18: Pregnancy, childbirth or the puerperium',
    icd11Block: 'JA00-JA0Z Complications of early pregnancy'
  },
  {
    nhdd: 'OBSGYN010',
    icd10: 'O21.0',
    icd11: 'JA21.0',
    diagnosis: 'Mild hyperemesis gravidarum',
    category: 'Obstetrics',
    subcategory: 'Pregnancy Complications',
    severity: 'Mild to Moderate',
    commonTerms: ['morning sickness', 'hyperemesis gravidarum', 'vomiting in pregnancy', 'nausea pregnancy'],
    nhddDescription: 'Excessive nausea and vomiting in pregnancy',
    icd11Chapter: 'Chapter 18: Pregnancy, childbirth or the puerperium',
    icd11Block: 'JA21-JA2Z Disorders of pregnancy'
  },
  {
    nhdd: 'OBSGYN011',
    icd10: 'O14.0',
    icd11: 'JA24.1',
    diagnosis: 'Mild to moderate pre-eclampsia',
    category: 'Obstetrics',
    subcategory: 'Hypertensive Pregnancy Disorders',
    severity: 'Moderate',
    commonTerms: ['pre-eclampsia', 'preeclampsia', 'pregnancy hypertension', 'PET'],
    nhddDescription: 'Hypertension with proteinuria developing after 20 weeks gestation',
    icd11Chapter: 'Chapter 18: Pregnancy, childbirth or the puerperium',
    icd11Block: 'JA24-JA2Z Hypertensive disorders in pregnancy'
  },
  {
    nhdd: 'OBSGYN012',
    icd10: 'O24.4',
    icd11: 'JA63.0',
    diagnosis: 'Gestational diabetes mellitus',
    category: 'Obstetrics',
    subcategory: 'Pregnancy Complications',
    severity: 'Moderate',
    commonTerms: ['gestational diabetes', 'pregnancy diabetes', 'GDM', 'diabetes in pregnancy'],
    nhddDescription: 'Diabetes mellitus arising during pregnancy',
    icd11Chapter: 'Chapter 18: Pregnancy, childbirth or the puerperium',
    icd11Block: 'JA63-JA6Z Diabetes in pregnancy'
  },

  // ─── GASTROINTESTINAL CONDITIONS ─────────────────────────────────────────
  {
    nhdd: 'GIT001',
    icd10: 'K37',
    icd11: 'DA91.0',
    diagnosis: 'Appendicitis, unspecified',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Appendix Conditions',
    severity: 'Severe',
    commonTerms: ['appendicitis', 'appendix pain', 'right lower quadrant pain', 'RLQ pain'],
    nhddDescription: 'Inflammation of the appendix',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA91-DA9Z Appendicitis'
  },
  {
    nhdd: 'GIT002',
    icd10: 'K80.2',
    icd11: 'DC10.Z',
    diagnosis: 'Cholelithiasis (gallstones)',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Gallbladder Conditions',
    severity: 'Mild to Severe',
    commonTerms: ['gallstones', 'cholelithiasis', 'biliary stones', 'gallbladder stones'],
    nhddDescription: 'Presence of stones in the gallbladder',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC10-DC1Z Gallbladder diseases'
  },
  {
    nhdd: 'GIT003',
    icd10: 'K81.0',
    icd11: 'DC10.1',
    diagnosis: 'Acute cholecystitis',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Gallbladder Conditions',
    severity: 'Moderate to Severe',
    commonTerms: ['cholecystitis', 'gallbladder inflammation', 'acute gallbladder', 'biliary colic'],
    nhddDescription: 'Acute inflammation of the gallbladder',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC10-DC1Z Gallbladder diseases'
  },
  {
    nhdd: 'GIT004',
    icd10: 'K85.9',
    icd11: 'DC31.Z',
    diagnosis: 'Acute pancreatitis, unspecified',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Pancreatic Conditions',
    severity: 'Severe',
    commonTerms: ['pancreatitis', 'acute pancreatitis', 'pancreatic inflammation', 'abdominal pain severe'],
    nhddDescription: 'Acute inflammation of the pancreas',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DC31-DC3Z Pancreatitis'
  },
  {
    nhdd: 'GIT005',
    icd10: 'K92.1',
    icd11: 'ME24.A0',
    diagnosis: 'Melaena (black tarry stool)',
    category: 'Gastrointestinal Disorders',
    subcategory: 'GI Bleeding',
    severity: 'Moderate to Severe',
    commonTerms: ['melaena', 'melena', 'black stool', 'tarry stool', 'GI bleeding', 'upper GI bleed'],
    nhddDescription: 'Passage of black tarry stools indicating upper GI bleeding',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'ME24-ME2Z GI haemorrhage'
  },
  {
    nhdd: 'GIT006',
    icd10: 'K25.9',
    icd11: 'DA42.Z',
    diagnosis: 'Gastric ulcer, unspecified',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Peptic Ulcer Disease',
    severity: 'Moderate',
    commonTerms: ['stomach ulcer', 'gastric ulcer', 'peptic ulcer', 'stomach pain', 'epigastric pain'],
    nhddDescription: 'Mucosal ulceration of the stomach',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA42-DA4Z Gastric ulcer'
  },
  {
    nhdd: 'GIT007',
    icd10: 'K29.7',
    icd11: 'DA43.Z',
    diagnosis: 'Gastritis, unspecified',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Gastric Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['gastritis', 'stomach inflammation', 'gastric pain', 'stomach upset'],
    nhddDescription: 'Inflammation of the gastric mucosa',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA43-DA4Z Gastritis and duodenitis'
  },
  {
    nhdd: 'GIT008',
    icd10: 'K21.0',
    icd11: 'DA22.0',
    diagnosis: 'Gastro-oesophageal reflux disease (GERD)',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Oesophageal Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['GERD', 'acid reflux', 'heartburn', 'GORD', 'gastroesophageal reflux', 'reflux'],
    nhddDescription: 'Acid reflux causing heartburn and regurgitation',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA22-DA2Z Gastro-oesophageal reflux disease'
  },
  {
    nhdd: 'GIT009',
    icd10: 'K57.3',
    icd11: 'DA94.Z',
    diagnosis: 'Diverticular disease of colon',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Colonic Conditions',
    severity: 'Mild to Severe',
    commonTerms: ['diverticulitis', 'diverticular disease', 'diverticulosis', 'colon pouches'],
    nhddDescription: 'Small pouches forming in the wall of the colon',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA94-DA9Z Diverticular disease'
  },
  {
    nhdd: 'GIT010',
    icd10: 'K58.9',
    icd11: 'DA93.0',
    diagnosis: 'Irritable bowel syndrome, unspecified',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Functional GI Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['IBS', 'irritable bowel', 'spastic colon', 'functional bowel disorder'],
    nhddDescription: 'Functional bowel disorder with abdominal pain and altered bowel habits',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA93-DA9Z Functional intestinal disorders'
  },
  {
    nhdd: 'GIT011',
    icd10: 'K50.9',
    icd11: 'DA91.1',
    diagnosis: "Crohn's disease, unspecified",
    category: 'Gastrointestinal Disorders',
    subcategory: 'Inflammatory Bowel Disease',
    severity: 'Moderate to Severe',
    commonTerms: ["Crohn's disease", "crohns", 'inflammatory bowel disease', 'IBD'],
    nhddDescription: 'Chronic inflammatory bowel disease affecting any part of the GI tract',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA91-DA9Z Inflammatory bowel disease'
  },
  {
    nhdd: 'GIT012',
    icd10: 'K51.9',
    icd11: 'DA91.2',
    diagnosis: 'Ulcerative colitis, unspecified',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Inflammatory Bowel Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['ulcerative colitis', 'UC', 'colitis', 'IBD', 'inflammatory bowel disease'],
    nhddDescription: 'Chronic inflammatory bowel disease affecting the colon',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA91-DA9Z Inflammatory bowel disease'
  },
  {
    nhdd: 'GIT013',
    icd10: 'K74.6',
    icd11: 'DB95.Z',
    diagnosis: 'Liver cirrhosis, unspecified',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Liver Conditions',
    severity: 'Severe',
    commonTerms: ['cirrhosis', 'liver cirrhosis', 'liver fibrosis', 'end-stage liver disease'],
    nhddDescription: 'Chronic liver disease with fibrous tissue replacement',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DB95-DB9Z Liver fibrosis and cirrhosis'
  },
  {
    nhdd: 'GIT014',
    icd10: 'K70.1',
    icd11: 'DB94.1',
    diagnosis: 'Alcoholic hepatitis',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Liver Conditions',
    severity: 'Moderate to Severe',
    commonTerms: ['alcoholic hepatitis', 'alcohol liver disease', 'alcoholic liver inflammation'],
    nhddDescription: 'Liver inflammation caused by excessive alcohol consumption',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DB94-DB9Z Alcoholic liver disease'
  },

  // ─── URINARY CONDITIONS ───────────────────────────────────────────────────
  {
    nhdd: 'URO001',
    icd10: 'N20.0',
    icd11: 'GB40.0',
    diagnosis: 'Calculus of kidney (kidney stone)',
    category: 'Urinary Disorders',
    subcategory: 'Urinary Calculi',
    severity: 'Moderate to Severe',
    commonTerms: ['kidney stone', 'renal calculus', 'nephrolithiasis', 'renal stone', 'urinary stone'],
    nhddDescription: 'Stone formation in the kidney',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GB40-GB4Z Urolithiasis'
  },
  {
    nhdd: 'URO002',
    icd10: 'N23',
    icd11: 'GB40.Z',
    diagnosis: 'Renal colic, unspecified',
    category: 'Urinary Disorders',
    subcategory: 'Urinary Calculi',
    severity: 'Severe',
    commonTerms: ['renal colic', 'kidney pain', 'ureteric colic', 'ureter pain'],
    nhddDescription: 'Severe pain caused by a kidney stone in the ureter',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GB40-GB4Z Urolithiasis'
  },
  {
    nhdd: 'URO003',
    icd10: 'N30.0',
    icd11: 'GC06.0',
    diagnosis: 'Acute cystitis',
    category: 'Urinary Disorders',
    subcategory: 'Urinary Tract Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['cystitis', 'bladder infection', 'acute cystitis', 'bladder inflammation', 'dysuria'],
    nhddDescription: 'Acute inflammation of the urinary bladder',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GC06-GC0Z Cystitis'
  },
  {
    nhdd: 'URO004',
    icd10: 'N40',
    icd11: 'GA90.0',
    diagnosis: 'Benign prostatic hyperplasia',
    category: 'Urinary Disorders',
    subcategory: 'Prostate Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['BPH', 'enlarged prostate', 'benign prostatic hyperplasia', 'prostate enlargement'],
    nhddDescription: 'Non-cancerous enlargement of the prostate gland',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GA90-GA9Z Benign prostatic hyperplasia'
  },
  {
    nhdd: 'URO005',
    icd10: 'N17.9',
    icd11: 'GB60.Z',
    diagnosis: 'Acute kidney injury, unspecified',
    category: 'Urinary Disorders',
    subcategory: 'Kidney Disorders',
    severity: 'Severe',
    commonTerms: ['AKI', 'acute renal failure', 'acute kidney injury', 'acute renal injury'],
    nhddDescription: 'Abrupt loss of kidney function',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GB60-GB6Z Acute kidney injury'
  },
  {
    nhdd: 'URO006',
    icd10: 'N18.3',
    icd11: 'GB61.2',
    diagnosis: 'Chronic kidney disease, stage 3',
    category: 'Urinary Disorders',
    subcategory: 'Kidney Disorders',
    severity: 'Moderate',
    commonTerms: ['CKD', 'chronic kidney disease', 'chronic renal failure', 'renal insufficiency'],
    nhddDescription: 'Progressive loss of kidney function over months to years',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GB61-GB6Z Chronic kidney disease'
  },

  // ─── MUSCULOSKELETAL CONDITIONS ──────────────────────────────────────────
  {
    nhdd: 'MSK001',
    icd10: 'M10.9',
    icd11: 'FA92.Z',
    diagnosis: 'Gout, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Crystal Arthropathies',
    severity: 'Mild to Severe',
    commonTerms: ['gout', 'gouty arthritis', 'uric acid crystals', 'big toe pain', 'podagra'],
    nhddDescription: 'Inflammatory arthritis caused by urate crystal deposition',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA92-FA9Z Crystal arthropathies'
  },
  {
    nhdd: 'MSK002',
    icd10: 'M54.5',
    icd11: 'ME84.2',
    diagnosis: 'Low back pain',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Back Pain',
    severity: 'Mild to Moderate',
    commonTerms: ['low back pain', 'LBP', 'lumbar pain', 'backache', 'lumbar backache'],
    nhddDescription: 'Pain in the lumbar region of the back',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'ME84-ME8Z Back pain'
  },
  {
    nhdd: 'MSK003',
    icd10: 'M54.4',
    icd11: 'ME84.30',
    diagnosis: 'Lumbago with sciatica',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Back Pain',
    severity: 'Moderate',
    commonTerms: ['sciatica', 'sciatic nerve pain', 'leg pain from back', 'radiating back pain'],
    nhddDescription: 'Back pain with radiation down the leg due to sciatic nerve compression',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'ME84-ME8Z Radicular pain'
  },
  {
    nhdd: 'MSK004',
    icd10: 'M16.9',
    icd11: 'FA02.Z',
    diagnosis: 'Osteoarthritis of hip, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Osteoarthritis',
    severity: 'Mild to Severe',
    commonTerms: ['hip osteoarthritis', 'hip OA', 'hip arthritis', 'coxarthrosis'],
    nhddDescription: 'Degenerative joint disease of the hip',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA02-FA0Z Osteoarthritis'
  },
  {
    nhdd: 'MSK005',
    icd10: 'M17.9',
    icd11: 'FA02.1',
    diagnosis: 'Osteoarthritis of knee, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Osteoarthritis',
    severity: 'Mild to Severe',
    commonTerms: ['knee arthritis', 'knee OA', 'knee osteoarthritis', 'gonarthrosis'],
    nhddDescription: 'Degenerative joint disease of the knee',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA02-FA0Z Osteoarthritis'
  },
  {
    nhdd: 'MSK006',
    icd10: 'M06.9',
    icd11: 'FA20.Z',
    diagnosis: 'Rheumatoid arthritis, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Inflammatory Arthritis',
    severity: 'Moderate to Severe',
    commonTerms: ['rheumatoid arthritis', 'RA', 'inflammatory arthritis', 'autoimmune arthritis'],
    nhddDescription: 'Chronic autoimmune inflammatory joint disease',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA20-FA2Z Rheumatoid arthritis'
  },
  {
    nhdd: 'MSK007',
    icd10: 'M41.9',
    icd11: 'FA80.Z',
    diagnosis: 'Scoliosis, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Spinal Deformities',
    severity: 'Mild to Moderate',
    commonTerms: ['scoliosis', 'spinal curvature', 'curved spine', 'S-curve spine'],
    nhddDescription: 'Lateral curvature of the spine',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA80-FA8Z Scoliosis'
  },
  {
    nhdd: 'MSK008',
    icd10: 'M80.9',
    icd11: 'FB83.Z',
    diagnosis: 'Osteoporosis with pathological fracture, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Bone Density Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['osteoporosis', 'brittle bones', 'bone thinning', 'pathological fracture'],
    nhddDescription: 'Reduced bone density causing fragility fractures',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FB83-FB8Z Osteoporosis'
  },
  {
    nhdd: 'MSK009',
    icd10: 'M75.1',
    icd11: 'FB56.1',
    diagnosis: 'Rotator cuff syndrome',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Shoulder Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['rotator cuff', 'shoulder pain', 'supraspinatus tear', 'shoulder impingement', 'rotator cuff injury'],
    nhddDescription: 'Injury or inflammation of the rotator cuff tendons',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FB56-FB5Z Shoulder disorders'
  },
  {
    nhdd: 'MSK010',
    icd10: 'M79.3',
    icd11: 'FB80.1',
    diagnosis: 'Panniculitis, unspecified',
    category: 'Musculoskeletal Disorders',
    subcategory: 'Soft Tissue Disorders',
    severity: 'Mild',
    commonTerms: ['panniculitis', 'fat tissue inflammation', 'subcutaneous inflammation'],
    nhddDescription: 'Inflammation of the subcutaneous fat tissue',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FB80-FB8Z Panniculitis'
  },

  // ─── PAEDIATRIC CONDITIONS ────────────────────────────────────────────────
  {
    nhdd: 'PAED001',
    icd10: 'A37.9',
    icd11: '1C12.Z',
    diagnosis: 'Whooping cough (pertussis), unspecified',
    category: 'Paediatric Conditions',
    subcategory: 'Respiratory Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['whooping cough', 'pertussis', 'cough spasm', 'paroxysmal cough'],
    nhddDescription: 'Highly contagious respiratory disease caused by Bordetella pertussis',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1C12-1C1Z Whooping cough'
  },
  {
    nhdd: 'PAED002',
    icd10: 'B05.9',
    icd11: '1F03.Z',
    diagnosis: 'Measles without complication',
    category: 'Paediatric Conditions',
    subcategory: 'Viral Infections',
    severity: 'Moderate',
    commonTerms: ['measles', 'rubeola', 'morbilli', 'viral rash fever'],
    nhddDescription: 'Highly contagious viral infection causing fever and rash',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1F03-1F0Z Measles'
  },
  {
    nhdd: 'PAED003',
    icd10: 'B06.9',
    icd11: '1F02.Z',
    diagnosis: 'Rubella without complication',
    category: 'Paediatric Conditions',
    subcategory: 'Viral Infections',
    severity: 'Mild',
    commonTerms: ['rubella', 'German measles', 'three-day measles'],
    nhddDescription: 'Mild viral infection causing rash and lymphadenopathy',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1F02-1F0Z Rubella'
  },
  {
    nhdd: 'PAED004',
    icd10: 'B01.9',
    icd11: '1E90.Z',
    diagnosis: 'Varicella (chickenpox) without complication',
    category: 'Paediatric Conditions',
    subcategory: 'Viral Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['chickenpox', 'varicella', 'chicken pox', 'varicella zoster'],
    nhddDescription: 'Highly contagious viral disease causing itchy blistering rash',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1E90-1E9Z Varicella'
  },
  {
    nhdd: 'PAED005',
    icd10: 'K12.0',
    icd11: 'DA01.0',
    diagnosis: 'Recurrent oral aphthous ulcers',
    category: 'Paediatric Conditions',
    subcategory: 'Oral Conditions',
    severity: 'Mild',
    commonTerms: ['mouth ulcers', 'aphthous ulcers', 'canker sores', 'oral ulcers'],
    nhddDescription: 'Recurring painful ulcers inside the mouth',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA01-DA0Z Diseases of lips and oral mucosa'
  },
  {
    nhdd: 'PAED006',
    icd10: 'G40.9',
    icd11: '8A61.Z',
    diagnosis: 'Epilepsy, unspecified',
    category: 'Paediatric Conditions',
    subcategory: 'Neurological',
    severity: 'Moderate to Severe',
    commonTerms: ['epilepsy', 'seizures', 'fits', 'convulsions', 'epileptic seizures'],
    nhddDescription: 'Neurological disorder characterized by recurrent seizures',
    icd11Chapter: 'Chapter 8: Diseases of the nervous system',
    icd11Block: '8A61-8A6Z Epilepsy'
  },
  {
    nhdd: 'PAED007',
    icd10: 'E43',
    icd11: '5B53.Z',
    diagnosis: 'Severe acute malnutrition',
    category: 'Paediatric Conditions',
    subcategory: 'Nutritional Disorders',
    severity: 'Severe',
    commonTerms: ['severe malnutrition', 'SAM', 'kwashiorkor', 'marasmus', 'protein-energy malnutrition'],
    nhddDescription: 'Severe nutritional deficiency in children',
    icd11Chapter: 'Chapter 5: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5B53-5B5Z Malnutrition'
  },

  // ─── NEUROLOGICAL CONDITIONS ─────────────────────────────────────────────
  {
    nhdd: 'NEURO001',
    icd10: 'G43.9',
    icd11: '8A80.Z',
    diagnosis: 'Migraine, unspecified',
    category: 'Neurological Disorders',
    subcategory: 'Headache Disorders',
    severity: 'Mild to Severe',
    commonTerms: ['migraine', 'migraine headache', 'severe headache', 'visual aura headache'],
    nhddDescription: 'Recurrent moderate to severe headache often with nausea',
    icd11Chapter: 'Chapter 8: Diseases of the nervous system',
    icd11Block: '8A80-8A8Z Migraine'
  },
  {
    nhdd: 'NEURO002',
    icd10: 'G45.9',
    icd11: '8B11.Z',
    diagnosis: 'Transient ischaemic attack (TIA)',
    category: 'Neurological Disorders',
    subcategory: 'Cerebrovascular Conditions',
    severity: 'Moderate',
    commonTerms: ['TIA', 'mini stroke', 'transient ischaemic attack', 'temporary stroke'],
    nhddDescription: 'Temporary disruption of blood supply to brain without permanent damage',
    icd11Chapter: 'Chapter 8: Diseases of the nervous system',
    icd11Block: '8B11-8B1Z Cerebrovascular disease'
  },
  {
    nhdd: 'NEURO003',
    icd10: 'G61.0',
    icd11: '8C00.0',
    diagnosis: 'Guillain-Barré syndrome',
    category: 'Neurological Disorders',
    subcategory: 'Peripheral Neuropathy',
    severity: 'Severe',
    commonTerms: ['GBS', 'Guillain Barre', 'ascending paralysis', 'acute inflammatory polyneuropathy'],
    nhddDescription: 'Autoimmune disorder causing ascending paralysis',
    icd11Chapter: 'Chapter 8: Diseases of the nervous system',
    icd11Block: '8C00-8C0Z Polyneuropathies'
  },
  {
    nhdd: 'NEURO004',
    icd10: 'G35',
    icd11: '8A40.Z',
    diagnosis: 'Multiple sclerosis',
    category: 'Neurological Disorders',
    subcategory: 'Demyelinating Diseases',
    severity: 'Severe',
    commonTerms: ['MS', 'multiple sclerosis', 'demyelinating disease'],
    nhddDescription: 'Demyelinating disease of the central nervous system',
    icd11Chapter: 'Chapter 8: Diseases of the nervous system',
    icd11Block: '8A40-8A4Z Multiple sclerosis'
  },
  {
    nhdd: 'NEURO005',
    icd10: 'G20',
    icd11: '8A00.0',
    diagnosis: "Parkinson's disease",
    category: 'Neurological Disorders',
    subcategory: 'Movement Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ["Parkinson's", 'Parkinson disease', 'tremor', 'resting tremor', 'bradykinesia'],
    nhddDescription: 'Progressive neurodegenerative disorder affecting movement',
    icd11Chapter: 'Chapter 8: Diseases of the nervous system',
    icd11Block: '8A00-8A0Z Parkinson disease'
  },
  {
    nhdd: 'NEURO006',
    icd10: 'F00.9',
    icd11: '6D80.Z',
    diagnosis: "Alzheimer's dementia, unspecified",
    category: 'Neurological Disorders',
    subcategory: 'Dementia',
    severity: 'Moderate to Severe',
    commonTerms: ["Alzheimer's", 'Alzheimer disease', 'dementia', 'memory loss', 'cognitive decline'],
    nhddDescription: 'Progressive neurodegenerative disease causing dementia',
    icd11Chapter: 'Chapter 6: Mental, behavioural or neurodevelopmental disorders',
    icd11Block: '6D80-6D8Z Dementia'
  },
  {
    nhdd: 'NEURO007',
    icd10: 'G54.1',
    icd11: '8C80.1',
    diagnosis: 'Lumbar radiculopathy',
    category: 'Neurological Disorders',
    subcategory: 'Radiculopathy',
    severity: 'Mild to Moderate',
    commonTerms: ['lumbar radiculopathy', 'nerve root compression', 'disc herniation', 'slipped disc', 'pinched nerve'],
    nhddDescription: 'Compression or irritation of the lumbar nerve root',
    icd11Chapter: 'Chapter 8: Diseases of the nervous system',
    icd11Block: '8C80-8C8Z Nerve root disorders'
  },

  // ─── MENTAL HEALTH CONDITIONS ─────────────────────────────────────────────
  {
    nhdd: 'MH001',
    icd10: 'F32.9',
    icd11: '6A70.Z',
    diagnosis: 'Depressive episode, unspecified',
    category: 'Mental Health',
    subcategory: 'Mood Disorders',
    severity: 'Mild to Severe',
    commonTerms: ['depression', 'depressive episode', 'low mood', 'clinical depression', 'major depression'],
    nhddDescription: 'Episode of depressed mood, reduced energy and activity',
    icd11Chapter: 'Chapter 6: Mental, behavioural or neurodevelopmental disorders',
    icd11Block: '6A70-6A7Z Depressive disorders'
  },
  {
    nhdd: 'MH002',
    icd10: 'F41.1',
    icd11: '6B00.0',
    diagnosis: 'Generalised anxiety disorder',
    category: 'Mental Health',
    subcategory: 'Anxiety Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['anxiety', 'GAD', 'generalised anxiety', 'chronic worry', 'anxiety disorder'],
    nhddDescription: 'Persistent excessive worry about many different things',
    icd11Chapter: 'Chapter 6: Mental, behavioural or neurodevelopmental disorders',
    icd11Block: '6B00-6B0Z Anxiety disorders'
  },
  {
    nhdd: 'MH003',
    icd10: 'F20.9',
    icd11: '6A20.Z',
    diagnosis: 'Schizophrenia, unspecified',
    category: 'Mental Health',
    subcategory: 'Psychotic Disorders',
    severity: 'Severe',
    commonTerms: ['schizophrenia', 'psychosis', 'hallucinations', 'delusions'],
    nhddDescription: 'Chronic psychotic disorder affecting thought, perception and behaviour',
    icd11Chapter: 'Chapter 6: Mental, behavioural or neurodevelopmental disorders',
    icd11Block: '6A20-6A2Z Schizophrenia'
  },
  {
    nhdd: 'MH004',
    icd10: 'F10.2',
    icd11: '6C40.2',
    diagnosis: 'Alcohol dependence syndrome',
    category: 'Mental Health',
    subcategory: 'Substance Use Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['alcoholism', 'alcohol dependence', 'alcohol addiction', 'alcohol use disorder'],
    nhddDescription: 'Compulsive alcohol use with physical dependence',
    icd11Chapter: 'Chapter 6: Mental, behavioural or neurodevelopmental disorders',
    icd11Block: '6C40-6C4Z Alcohol-related disorders'
  },
  {
    nhdd: 'MH005',
    icd10: 'F43.1',
    icd11: '6B40.0',
    diagnosis: 'Post-traumatic stress disorder',
    category: 'Mental Health',
    subcategory: 'Stress-related Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ['PTSD', 'post-traumatic stress disorder', 'trauma disorder', 'psychological trauma'],
    nhddDescription: 'Persistent distress following exposure to a traumatic event',
    icd11Chapter: 'Chapter 6: Mental, behavioural or neurodevelopmental disorders',
    icd11Block: '6B40-6B4Z Trauma-related disorders'
  },

  // ─── CARDIOVASCULAR CONDITIONS ────────────────────────────────────────────
  {
    nhdd: 'CV001',
    icd10: 'I20.9',
    icd11: 'BA41.Z',
    diagnosis: 'Angina pectoris, unspecified',
    category: 'Cardiovascular Disorders',
    subcategory: 'Coronary Artery Disease',
    severity: 'Moderate to Severe',
    commonTerms: ['angina', 'chest pain', 'angina pectoris', 'chest tightness', 'coronary pain'],
    nhddDescription: 'Chest pain due to reduced blood flow to heart muscle',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BA41-BA4Z Angina pectoris'
  },
  {
    nhdd: 'CV002',
    icd10: 'I48.9',
    icd11: 'BC81.Z',
    diagnosis: 'Atrial fibrillation, unspecified',
    category: 'Cardiovascular Disorders',
    subcategory: 'Arrhythmias',
    severity: 'Moderate',
    commonTerms: ['AF', 'atrial fibrillation', 'AFib', 'irregular heartbeat', 'heart rhythm disorder'],
    nhddDescription: 'Irregular heart rhythm due to chaotic electrical activity in atria',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BC81-BC8Z Atrial fibrillation'
  },
  {
    nhdd: 'CV003',
    icd10: 'I50.9',
    icd11: 'BD10.Z',
    diagnosis: 'Heart failure, unspecified',
    category: 'Cardiovascular Disorders',
    subcategory: 'Heart Failure',
    severity: 'Severe',
    commonTerms: ['heart failure', 'cardiac failure', 'CCF', 'CHF', 'congestive heart failure'],
    nhddDescription: 'Inability of the heart to pump sufficient blood for body needs',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BD10-BD1Z Heart failure'
  },
  {
    nhdd: 'CV004',
    icd10: 'I83.9',
    icd11: 'BD71.Z',
    diagnosis: 'Varicose veins of lower extremities',
    category: 'Cardiovascular Disorders',
    subcategory: 'Peripheral Vascular',
    severity: 'Mild',
    commonTerms: ['varicose veins', 'leg veins', 'spider veins', 'leg varices'],
    nhddDescription: 'Enlarged tortuous veins in the legs',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BD71-BD7Z Varicose veins'
  },
  {
    nhdd: 'CV005',
    icd10: 'I80.2',
    icd11: 'BD71.2',
    diagnosis: 'Deep vein thrombosis (DVT)',
    category: 'Cardiovascular Disorders',
    subcategory: 'Thrombotic Conditions',
    severity: 'Moderate to Severe',
    commonTerms: ['DVT', 'deep vein thrombosis', 'blood clot leg', 'venous thrombosis'],
    nhddDescription: 'Blood clot formation in deep veins of leg',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BD71-BD7Z Thrombosis'
  },
  {
    nhdd: 'CV006',
    icd10: 'I26.9',
    icd11: 'BB01.Z',
    diagnosis: 'Pulmonary embolism, unspecified',
    category: 'Cardiovascular Disorders',
    subcategory: 'Thrombotic Conditions',
    severity: 'Severe',
    commonTerms: ['pulmonary embolism', 'PE', 'lung blood clot', 'pulmonary thrombosis'],
    nhddDescription: 'Obstruction of pulmonary artery by blood clot',
    icd11Chapter: 'Chapter 11: Diseases of the circulatory system',
    icd11Block: 'BB01-BB0Z Pulmonary embolism'
  },

  // ─── ENDOCRINE CONDITIONS ─────────────────────────────────────────────────
  {
    nhdd: 'ENDO001',
    icd10: 'E03.9',
    icd11: '5A00.Z',
    diagnosis: 'Hypothyroidism, unspecified',
    category: 'Endocrine Disorders',
    subcategory: 'Thyroid Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['hypothyroidism', 'underactive thyroid', 'low thyroid', 'thyroid deficiency'],
    nhddDescription: 'Underproduction of thyroid hormones',
    icd11Chapter: 'Chapter 5: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5A00-5A0Z Hypothyroidism'
  },
  {
    nhdd: 'ENDO002',
    icd10: 'E05.9',
    icd11: '5A20.Z',
    diagnosis: 'Hyperthyroidism, unspecified',
    category: 'Endocrine Disorders',
    subcategory: 'Thyroid Disorders',
    severity: 'Mild to Moderate',
    commonTerms: ['hyperthyroidism', 'overactive thyroid', 'thyrotoxicosis', 'Graves disease'],
    nhddDescription: 'Overproduction of thyroid hormones',
    icd11Chapter: 'Chapter 5: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5A20-5A2Z Hyperthyroidism'
  },
  {
    nhdd: 'ENDO003',
    icd10: 'E27.4',
    icd11: '5A70.Z',
    diagnosis: "Addison's disease (adrenal insufficiency)",
    category: 'Endocrine Disorders',
    subcategory: 'Adrenal Disorders',
    severity: 'Moderate to Severe',
    commonTerms: ["Addison's disease", 'adrenal insufficiency', 'hypoadrenalism', 'adrenal failure'],
    nhddDescription: 'Insufficient cortisol production by adrenal glands',
    icd11Chapter: 'Chapter 5: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5A70-5A7Z Adrenal insufficiency'
  },
  {
    nhdd: 'ENDO004',
    icd10: 'E66.9',
    icd11: '5B81.Z',
    diagnosis: 'Obesity, unspecified',
    category: 'Endocrine Disorders',
    subcategory: 'Nutritional/Metabolic',
    severity: 'Mild to Moderate',
    commonTerms: ['obesity', 'overweight', 'morbid obesity', 'BMI elevated'],
    nhddDescription: 'Excess body fat accumulation posing health risks',
    icd11Chapter: 'Chapter 5: Endocrine, nutritional or metabolic diseases',
    icd11Block: '5B81-5B8Z Obesity'
  },

  // ─── INFECTIONS & TROPICAL DISEASES ─────────────────────────────────────
  {
    nhdd: 'INFECT001',
    icd10: 'B54',
    icd11: '1F40.Z',
    diagnosis: 'Malaria, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['malaria', 'plasmodium', 'falciparum malaria', 'vivax malaria', 'fever chills'],
    nhddDescription: 'Parasitic infection transmitted by Anopheles mosquito',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1F40-1F4Z Malaria'
  },
  {
    nhdd: 'INFECT002',
    icd10: 'A91',
    icd11: '1D2Z.Z',
    diagnosis: 'Dengue haemorrhagic fever',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Viral Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['dengue fever', 'dengue', 'dengue haemorrhagic', 'breakbone fever'],
    nhddDescription: 'Severe dengue with plasma leakage and bleeding',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1D2Z-1D2Z Dengue fever'
  },
  {
    nhdd: 'INFECT003',
    icd10: 'A75.9',
    icd11: '1C30.Z',
    diagnosis: 'Typhus fever, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Rickettsial Infections',
    severity: 'Moderate to Severe',
    commonTerms: ['typhus', 'rickettsial fever', 'epidemic typhus'],
    nhddDescription: 'Bacterial infection transmitted by lice, fleas or mites',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1C30-1C3Z Typhus'
  },
  {
    nhdd: 'INFECT004',
    icd10: 'B65.9',
    icd11: '1F60.Z',
    diagnosis: 'Schistosomiasis, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Helminth Infections',
    severity: 'Moderate',
    commonTerms: ['schistosomiasis', 'bilharzia', 'bilharziasis', 'fluke infection'],
    nhddDescription: 'Parasitic infection by Schistosoma species',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1F60-1F6Z Schistosomiasis'
  },
  {
    nhdd: 'INFECT005',
    icd10: 'B50.9',
    icd11: '1F40.0',
    diagnosis: 'Plasmodium falciparum malaria, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Parasitic Infections',
    severity: 'Severe',
    commonTerms: ['falciparum malaria', 'cerebral malaria', 'severe malaria', 'P. falciparum'],
    nhddDescription: 'Most severe form of malaria caused by Plasmodium falciparum',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1F40-1F4Z Malaria'
  },
  {
    nhdd: 'INFECT006',
    icd10: 'A09',
    icd11: '1A40.Z',
    diagnosis: 'Acute gastroenteritis, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'GI Infections',
    severity: 'Mild to Moderate',
    commonTerms: ['gastroenteritis', 'stomach flu', 'food poisoning', 'diarrhoea vomiting', 'GE'],
    nhddDescription: 'Acute inflammation of stomach and intestines',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1A40-1A4Z Intestinal infectious diseases'
  },
  {
    nhdd: 'INFECT007',
    icd10: 'A02.0',
    icd11: '1A05.0',
    diagnosis: 'Salmonella enteritis',
    category: 'Infections & Tropical Diseases',
    subcategory: 'GI Infections',
    severity: 'Moderate',
    commonTerms: ['salmonella', 'food poisoning', 'salmonellosis', 'enteric fever'],
    nhddDescription: 'Gastrointestinal infection caused by Salmonella',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1A05-1A0Z Salmonellosis'
  },
  {
    nhdd: 'INFECT008',
    icd10: 'A00.9',
    icd11: '1A00.Z',
    diagnosis: 'Cholera, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Bacterial GI Infections',
    severity: 'Severe',
    commonTerms: ['cholera', 'rice water diarrhoea', 'vibrio cholerae', 'profuse diarrhoea'],
    nhddDescription: 'Acute diarrhoeal disease caused by Vibrio cholerae',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1A00-1A0Z Cholera'
  },
  {
    nhdd: 'INFECT009',
    icd10: 'B20',
    icd11: '1C62.Z',
    diagnosis: 'HIV disease',
    category: 'Infections & Tropical Diseases',
    subcategory: 'HIV/AIDS',
    severity: 'Severe',
    commonTerms: ['HIV', 'AIDS', 'HIV disease', 'human immunodeficiency virus', 'retroviral disease'],
    nhddDescription: 'Infection by human immunodeficiency virus',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1C62-1C6Z HIV disease'
  },
  {
    nhdd: 'INFECT010',
    icd10: 'B18.1',
    icd11: '1E51.Z',
    diagnosis: 'Chronic hepatitis B',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Viral Hepatitis',
    severity: 'Moderate to Severe',
    commonTerms: ['hepatitis B', 'HBV', 'viral hepatitis', 'chronic HBV', 'HBsAg positive'],
    nhddDescription: 'Chronic viral infection of the liver by HBV',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1E51-1E5Z Hepatitis B'
  },
  {
    nhdd: 'INFECT011',
    icd10: 'B17.1',
    icd11: '1E50.1',
    diagnosis: 'Acute hepatitis C',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Viral Hepatitis',
    severity: 'Moderate',
    commonTerms: ['hepatitis C', 'HCV', 'acute hepatitis C', 'viral hepatitis C'],
    nhddDescription: 'Acute viral infection of the liver by HCV',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1E50-1E5Z Hepatitis C'
  },
  {
    nhdd: 'INFECT012',
    icd10: 'A36.9',
    icd11: '1C11.Z',
    diagnosis: 'Diphtheria, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Severe',
    commonTerms: ['diphtheria', 'throat membrane', 'corynebacterium diphtheria'],
    nhddDescription: 'Bacterial infection causing throat membrane and toxin effects',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1C11-1C1Z Diphtheria'
  },
  {
    nhdd: 'INFECT013',
    icd10: 'A33',
    icd11: '1C13.0',
    diagnosis: 'Tetanus neonatorum',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Severe',
    commonTerms: ['neonatal tetanus', 'tetanus neonatorum', 'newborn tetanus'],
    nhddDescription: 'Tetanus infection in newborns',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1C13-1C1Z Tetanus'
  },
  {
    nhdd: 'INFECT014',
    icd10: 'A34',
    icd11: '1C13.1',
    diagnosis: 'Obstetrical tetanus',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Bacterial Infections',
    severity: 'Severe',
    commonTerms: ['obstetrical tetanus', 'maternal tetanus', 'postpartum tetanus'],
    nhddDescription: 'Tetanus occurring in association with childbirth',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1C13-1C1Z Tetanus'
  },
  {
    nhdd: 'INFECT015',
    icd10: 'A15.0',
    icd11: '1B10.Z',
    diagnosis: 'Tuberculosis of lung',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Tuberculosis',
    severity: 'Severe',
    commonTerms: ['TB', 'tuberculosis', 'pulmonary TB', 'lung TB', 'Koch\'s disease'],
    nhddDescription: 'Pulmonary infection caused by Mycobacterium tuberculosis',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1B10-1B1Z Tuberculosis'
  },
  {
    nhdd: 'INFECT016',
    icd10: 'A30.9',
    icd11: '1B20.Z',
    diagnosis: 'Leprosy, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Mycobacterial Infections',
    severity: 'Moderate',
    commonTerms: ['leprosy', "Hansen's disease", 'mycobacterium leprae', 'skin patches leprosy'],
    nhddDescription: 'Chronic bacterial infection causing skin lesions and nerve damage',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1B20-1B2Z Leprosy'
  },
  {
    nhdd: 'INFECT017',
    icd10: 'A50.9',
    icd11: '1A62.Z',
    diagnosis: 'Congenital syphilis, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'STIs',
    severity: 'Moderate to Severe',
    commonTerms: ['congenital syphilis', 'syphilis newborn'],
    nhddDescription: 'Syphilis transmitted from mother to child during pregnancy',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1A62-1A6Z Congenital syphilis'
  },
  {
    nhdd: 'INFECT018',
    icd10: 'A54.9',
    icd11: '1A71.Z',
    diagnosis: 'Gonococcal infection, unspecified',
    category: 'Infections & Tropical Diseases',
    subcategory: 'STIs',
    severity: 'Moderate',
    commonTerms: ['gonorrhoea', 'gonorrhea', 'gonococcal infection', 'Neisseria gonorrhoeae'],
    nhddDescription: 'Sexually transmitted infection caused by Neisseria gonorrhoeae',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1A71-1A7Z Gonorrhoea'
  },
  {
    nhdd: 'INFECT019',
    icd10: 'B85.0',
    icd11: '1G00.Z',
    diagnosis: 'Pediculosis capitis (head lice)',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Ectoparasites',
    severity: 'Mild',
    commonTerms: ['head lice', 'pediculosis', 'lice', 'head louse infestation'],
    nhddDescription: 'Infestation of head hair with lice',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1G00-1G0Z Pediculosis'
  },
  {
    nhdd: 'INFECT020',
    icd10: 'B86',
    icd11: '1G04.Z',
    diagnosis: 'Scabies',
    category: 'Infections & Tropical Diseases',
    subcategory: 'Ectoparasites',
    severity: 'Mild',
    commonTerms: ['scabies', 'itch mite', 'sarcoptes scabiei', 'severe itch', 'burrow tracks'],
    nhddDescription: 'Infestation of skin by Sarcoptes scabiei mite',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1G04-1G0Z Scabies'
  },

  // ─── HAEMATOLOGICAL CONDITIONS ────────────────────────────────────────────
  {
    nhdd: 'HAEM001',
    icd10: 'D57.1',
    icd11: '3A51.0',
    diagnosis: 'Sickle cell anaemia without crisis',
    category: 'Haematological Disorders',
    subcategory: 'Haemoglobinopathies',
    severity: 'Moderate',
    commonTerms: ['sickle cell', 'sickle cell disease', 'SCD', 'sickle cell anaemia'],
    nhddDescription: 'Inherited blood disorder causing sickle-shaped red blood cells',
    icd11Chapter: 'Chapter 3: Diseases of the blood or blood-forming organs',
    icd11Block: '3A51-3A5Z Sickle cell disorders'
  },
  {
    nhdd: 'HAEM002',
    icd10: 'D50.9',
    icd11: '3A00.Z',
    diagnosis: 'Iron-deficiency anaemia, unspecified',
    category: 'Haematological Disorders',
    subcategory: 'Anaemia',
    severity: 'Mild to Moderate',
    commonTerms: ['iron deficiency anaemia', 'IDA', 'low iron anaemia', 'anaemia iron'],
    nhddDescription: 'Anaemia due to inadequate iron stores',
    icd11Chapter: 'Chapter 3: Diseases of the blood or blood-forming organs',
    icd11Block: '3A00-3A0Z Iron deficiency anaemia'
  },
  {
    nhdd: 'HAEM003',
    icd10: 'D51.9',
    icd11: '3A01.Z',
    diagnosis: 'Vitamin B12 deficiency anaemia, unspecified',
    category: 'Haematological Disorders',
    subcategory: 'Anaemia',
    severity: 'Mild to Moderate',
    commonTerms: ['B12 deficiency', 'vitamin B12 anaemia', 'pernicious anaemia', 'megaloblastic anaemia'],
    nhddDescription: 'Anaemia due to vitamin B12 deficiency',
    icd11Chapter: 'Chapter 3: Diseases of the blood or blood-forming organs',
    icd11Block: '3A01-3A0Z Vitamin B12 deficiency anaemia'
  },
  {
    nhdd: 'HAEM004',
    icd10: 'D65',
    icd11: '3B31.Z',
    diagnosis: 'Disseminated intravascular coagulation (DIC)',
    category: 'Haematological Disorders',
    subcategory: 'Coagulation Disorders',
    severity: 'Severe',
    commonTerms: ['DIC', 'disseminated intravascular coagulation', 'consumptive coagulopathy'],
    nhddDescription: 'Widespread activation of clotting cascade causing bleeding and clotting',
    icd11Chapter: 'Chapter 3: Diseases of the blood or blood-forming organs',
    icd11Block: '3B31-3B3Z Coagulation disorders'
  },

  // ─── ORTHOPAEDIC / FRACTURES ──────────────────────────────────────────────
  {
    nhdd: 'ORTHO001',
    icd10: 'S72.0',
    icd11: 'NA17.Z',
    diagnosis: 'Fracture of neck of femur',
    category: 'Orthopaedic Conditions',
    subcategory: 'Lower Limb Fractures',
    severity: 'Severe',
    commonTerms: ['hip fracture', 'neck of femur fracture', 'NOF fracture', 'femur neck fracture'],
    nhddDescription: 'Fracture of the proximal femur at the neck',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA17-NA1Z Fractures of hip and pelvis'
  },
  {
    nhdd: 'ORTHO002',
    icd10: 'S82.1',
    icd11: 'NA1B.Z',
    diagnosis: 'Fracture of tibia, proximal',
    category: 'Orthopaedic Conditions',
    subcategory: 'Lower Limb Fractures',
    severity: 'Moderate',
    commonTerms: ['tibial fracture', 'tibia fracture', 'shin bone fracture', 'leg fracture'],
    nhddDescription: 'Fracture of the upper tibia',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA1B-NA1Z Fractures of leg'
  },
  {
    nhdd: 'ORTHO003',
    icd10: 'S52.5',
    icd11: 'NA12.Z',
    diagnosis: 'Colles fracture (distal radius fracture)',
    category: 'Orthopaedic Conditions',
    subcategory: 'Upper Limb Fractures',
    severity: 'Moderate',
    commonTerms: ['Colles fracture', 'wrist fracture', 'distal radius fracture', 'radius fracture'],
    nhddDescription: 'Fracture of the distal radius with dorsal displacement',
    icd11Chapter: 'Chapter 22: Injury, poisoning or certain other consequences of external causes',
    icd11Block: 'NA12-NA1Z Fractures of forearm'
  },
  {
    nhdd: 'ORTHO004',
    icd10: 'M48.0',
    icd11: 'FA84.1',
    diagnosis: 'Spinal stenosis',
    category: 'Orthopaedic Conditions',
    subcategory: 'Spinal Conditions',
    severity: 'Moderate',
    commonTerms: ['spinal stenosis', 'lumbar stenosis', 'spinal canal narrowing', 'neurogenic claudication'],
    nhddDescription: 'Narrowing of the spinal canal causing nerve compression',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA84-FA8Z Spinal stenosis'
  },
  {
    nhdd: 'ORTHO005',
    icd10: 'M47.8',
    icd11: 'FA84.Z',
    diagnosis: 'Cervical spondylosis',
    category: 'Orthopaedic Conditions',
    subcategory: 'Spinal Conditions',
    severity: 'Mild to Moderate',
    commonTerms: ['cervical spondylosis', 'neck arthritis', 'neck degeneration', 'cervical OA'],
    nhddDescription: 'Degenerative changes in cervical spine causing pain and stiffness',
    icd11Chapter: 'Chapter 15: Diseases of the musculoskeletal system or connective tissue',
    icd11Block: 'FA84-FA8Z Spondylosis'
  },

  // ─── ALLERGIC / IMMUNOLOGICAL ────────────────────────────────────────────
  {
    nhdd: 'ALLERGY001',
    icd10: 'J45.9',
    icd11: 'CA23.Z',
    diagnosis: 'Asthma, unspecified',
    category: 'Allergic & Immunological',
    subcategory: 'Asthma',
    severity: 'Mild to Severe',
    commonTerms: ['asthma', 'bronchial asthma', 'wheeze', 'shortness of breath asthma', 'reactive airway'],
    nhddDescription: 'Chronic inflammatory airway disease causing reversible airflow obstruction',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA23-CA2Z Asthma'
  },
  {
    nhdd: 'ALLERGY002',
    icd10: 'T78.2',
    icd11: 'CA81.Z',
    diagnosis: 'Anaphylactic shock, unspecified',
    category: 'Allergic & Immunological',
    subcategory: 'Severe Allergic Reactions',
    severity: 'Severe',
    commonTerms: ['anaphylaxis', 'anaphylactic shock', 'severe allergic reaction', 'allergic emergency'],
    nhddDescription: 'Life-threatening systemic allergic reaction',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA81-CA8Z Anaphylaxis'
  },
  {
    nhdd: 'ALLERGY003',
    icd10: 'J30.4',
    icd11: 'CA08.Z',
    diagnosis: 'Allergic rhinitis, unspecified',
    category: 'Allergic & Immunological',
    subcategory: 'Allergic Conditions',
    severity: 'Mild',
    commonTerms: ['hay fever', 'allergic rhinitis', 'nasal allergy', 'sneezing runny nose', 'seasonal rhinitis'],
    nhddDescription: 'Allergic inflammation of the nasal mucosa',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA08-CA0Z Allergic rhinitis'
  },
  {
    nhdd: 'ALLERGY004',
    icd10: 'L27.0',
    icd11: 'EK03.0',
    diagnosis: 'Drug rash (adverse cutaneous drug reaction)',
    category: 'Allergic & Immunological',
    subcategory: 'Drug Reactions',
    severity: 'Mild to Severe',
    commonTerms: ['drug rash', 'medication rash', 'drug allergy rash', 'Stevens-Johnson', 'drug eruption'],
    nhddDescription: 'Skin reaction caused by medication',
    icd11Chapter: 'Chapter 14: Diseases of the skin',
    icd11Block: 'EK03-EK0Z Drug eruptions'
  },

  // ─── NEONATAL / PERINATAL ─────────────────────────────────────────────────
  {
    nhdd: 'NEO001',
    icd10: 'P59.9',
    icd11: 'KA8B.Z',
    diagnosis: 'Neonatal jaundice, unspecified',
    category: 'Neonatal Conditions',
    subcategory: 'Neonatal Jaundice',
    severity: 'Mild to Moderate',
    commonTerms: ['neonatal jaundice', 'newborn jaundice', 'physiological jaundice', 'neonatal hyperbilirubinaemia'],
    nhddDescription: 'Yellow discoloration of skin in newborns due to bilirubin',
    icd11Chapter: 'Chapter 19: Certain conditions originating in the perinatal period',
    icd11Block: 'KA8B-KA8Z Neonatal jaundice'
  },
  {
    nhdd: 'NEO002',
    icd10: 'P22.9',
    icd11: 'KB23.Z',
    diagnosis: 'Respiratory distress of newborn, unspecified',
    category: 'Neonatal Conditions',
    subcategory: 'Respiratory Conditions',
    severity: 'Severe',
    commonTerms: ['neonatal respiratory distress', 'RDS', 'newborn breathing difficulty', 'hyaline membrane disease'],
    nhddDescription: 'Breathing difficulty in newborns due to surfactant deficiency',
    icd11Chapter: 'Chapter 19: Certain conditions originating in the perinatal period',
    icd11Block: 'KB23-KB2Z Respiratory distress of newborn'
  },
  {
    nhdd: 'NEO003',
    icd10: 'P36.9',
    icd11: 'KA61.Z',
    diagnosis: 'Bacterial sepsis of newborn, unspecified',
    category: 'Neonatal Conditions',
    subcategory: 'Neonatal Infections',
    severity: 'Severe',
    commonTerms: ['neonatal sepsis', 'newborn sepsis', 'neonatal septicaemia', 'early onset sepsis'],
    nhddDescription: 'Serious bacterial infection in newborns causing systemic illness',
    icd11Chapter: 'Chapter 19: Certain conditions originating in the perinatal period',
    icd11Block: 'KA61-KA6Z Neonatal infections'
  },

  // ─── ONCOLOGY ─────────────────────────────────────────────────────────────
  {
    nhdd: 'ONCO001',
    icd10: 'C34.9',
    icd11: '2C25.Z',
    diagnosis: 'Malignant neoplasm of bronchus or lung, unspecified',
    category: 'Oncology',
    subcategory: 'Lung Cancers',
    severity: 'Severe',
    commonTerms: ['lung cancer', 'bronchogenic carcinoma', 'pulmonary malignancy', 'NSCLC', 'SCLC'],
    nhddDescription: 'Malignant tumor of the lung or bronchus',
    icd11Chapter: 'Chapter 2: Neoplasms',
    icd11Block: '2C25-2C2Z Malignant neoplasm of respiratory tract'
  },
  {
    nhdd: 'ONCO002',
    icd10: 'C18.9',
    icd11: '2B90.Z',
    diagnosis: 'Malignant neoplasm of colon, unspecified',
    category: 'Oncology',
    subcategory: 'Colorectal Cancers',
    severity: 'Severe',
    commonTerms: ['colon cancer', 'colorectal cancer', 'colonic malignancy', 'bowel cancer'],
    nhddDescription: 'Malignant tumor of the colon',
    icd11Chapter: 'Chapter 2: Neoplasms',
    icd11Block: '2B90-2B9Z Malignant neoplasm of colon'
  },
  {
    nhdd: 'ONCO003',
    icd10: 'C53.9',
    icd11: '2C76.Z',
    diagnosis: 'Malignant neoplasm of cervix uteri, unspecified',
    category: 'Oncology',
    subcategory: 'Gynaecological Cancers',
    severity: 'Severe',
    commonTerms: ['cervical cancer', 'cancer of cervix', 'cervical malignancy', 'ca cervix'],
    nhddDescription: 'Malignant tumor of the uterine cervix',
    icd11Chapter: 'Chapter 2: Neoplasms',
    icd11Block: '2C76-2C7Z Malignant neoplasm of cervix uteri'
  },
  {
    nhdd: 'ONCO004',
    icd10: 'C22.0',
    icd11: '2C12.0',
    diagnosis: 'Hepatocellular carcinoma',
    category: 'Oncology',
    subcategory: 'Liver Cancers',
    severity: 'Severe',
    commonTerms: ['hepatocellular carcinoma', 'HCC', 'liver cancer', 'primary liver cancer'],
    nhddDescription: 'Primary malignant tumor of the liver',
    icd11Chapter: 'Chapter 2: Neoplasms',
    icd11Block: '2C12-2C1Z Malignant neoplasm of liver'
  },
  {
    nhdd: 'ONCO005',
    icd10: 'C61',
    icd11: '2C82.Z',
    diagnosis: 'Malignant neoplasm of prostate',
    category: 'Oncology',
    subcategory: 'Male Genital Cancers',
    severity: 'Severe',
    commonTerms: ['prostate cancer', 'prostatic carcinoma', 'prostate malignancy', 'ca prostate'],
    nhddDescription: 'Malignant tumor of the prostate gland',
    icd11Chapter: 'Chapter 2: Neoplasms',
    icd11Block: '2C82-2C8Z Malignant neoplasm of prostate'
  },

  // ─── COMMON PRESENTATIONS ────────────────────────────────────────────────
  {
    nhdd: 'SYMP001',
    icd10: 'R50.9',
    icd11: 'MG26.Z',
    diagnosis: 'Fever, unspecified',
    category: 'Symptoms & Signs',
    subcategory: 'Fever',
    severity: 'Mild to Moderate',
    commonTerms: ['fever', 'pyrexia', 'high temperature', 'febrile', 'hyperthermia'],
    nhddDescription: 'Elevated body temperature above normal range',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'MG26-MG2Z Fever'
  },
  {
    nhdd: 'SYMP002',
    icd10: 'R07.9',
    icd11: 'MD81.Z',
    diagnosis: 'Chest pain, unspecified',
    category: 'Symptoms & Signs',
    subcategory: 'Chest Symptoms',
    severity: 'Mild to Severe',
    commonTerms: ['chest pain', 'thoracic pain', 'precordial pain', 'chest discomfort'],
    nhddDescription: 'Pain localized to the chest area',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'MD81-MD8Z Chest pain'
  },
  {
    nhdd: 'SYMP003',
    icd10: 'R10.9',
    icd11: 'MD81.0',
    diagnosis: 'Unspecified abdominal pain',
    category: 'Symptoms & Signs',
    subcategory: 'Abdominal Symptoms',
    severity: 'Mild to Moderate',
    commonTerms: ['abdominal pain', 'stomach pain', 'belly pain', 'tummy ache', 'abdominal cramps'],
    nhddDescription: 'Pain localized to the abdomen',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'MD81-MD8Z Abdominal pain'
  },
  {
    nhdd: 'SYMP004',
    icd10: 'R55',
    icd11: 'MG45.Z',
    diagnosis: 'Syncope and collapse',
    category: 'Symptoms & Signs',
    subcategory: 'Fainting',
    severity: 'Mild to Moderate',
    commonTerms: ['syncope', 'fainting', 'blackout', 'collapse', 'loss of consciousness'],
    nhddDescription: 'Transient loss of consciousness with loss of postural tone',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'MG45-MG4Z Syncope'
  },
  {
    nhdd: 'SYMP005',
    icd10: 'R42',
    icd11: 'MB48.Z',
    diagnosis: 'Dizziness and giddiness',
    category: 'Symptoms & Signs',
    subcategory: 'Vertigo & Dizziness',
    severity: 'Mild to Moderate',
    commonTerms: ['dizziness', 'vertigo', 'giddiness', 'lightheadedness', 'spinning sensation'],
    nhddDescription: 'Sensation of dizziness, lightheadedness or vertigo',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'MB48-MB4Z Dizziness'
  },
  {
    nhdd: 'SYMP006',
    icd10: 'R11',
    icd11: 'MD90.Z',
    diagnosis: 'Nausea and vomiting',
    category: 'Symptoms & Signs',
    subcategory: 'GI Symptoms',
    severity: 'Mild to Moderate',
    commonTerms: ['nausea', 'vomiting', 'nausea vomiting', 'feeling sick', 'emesis'],
    nhddDescription: 'Nausea with or without vomiting',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'MD90-MD9Z Nausea and vomiting'
  },
  {
    nhdd: 'SYMP007',
    icd10: 'R05',
    icd11: 'MD11.Z',
    diagnosis: 'Cough',
    category: 'Symptoms & Signs',
    subcategory: 'Respiratory Symptoms',
    severity: 'Mild',
    commonTerms: ['cough', 'dry cough', 'productive cough', 'persistent cough', 'chronic cough'],
    nhddDescription: 'Sudden expulsion of air from the lungs',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'MD11-MD1Z Cough'
  },
  {
    nhdd: 'SYMP008',
    icd10: 'R06.0',
    icd11: 'MD12.0',
    diagnosis: 'Dyspnoea (shortness of breath)',
    category: 'Symptoms & Signs',
    subcategory: 'Respiratory Symptoms',
    severity: 'Mild to Severe',
    commonTerms: ['shortness of breath', 'dyspnoea', 'breathlessness', 'difficulty breathing', 'SOB'],
    nhddDescription: 'Difficult or laboured breathing',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'MD12-MD1Z Dyspnoea'
  },
  {
    nhdd: 'SYMP009',
    icd10: 'R00.0',
    icd11: 'MD81.1',
    diagnosis: 'Tachycardia, unspecified',
    category: 'Symptoms & Signs',
    subcategory: 'Heart Rate Abnormalities',
    severity: 'Mild to Moderate',
    commonTerms: ['tachycardia', 'fast heart rate', 'rapid heartbeat', 'palpitations', 'racing heart'],
    nhddDescription: 'Heart rate greater than 100 beats per minute',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'MD81-MD8Z Heart rate abnormalities'
  },
  {
    nhdd: 'SYMP010',
    icd10: 'R60.9',
    icd11: 'ME11.Z',
    diagnosis: 'Oedema, unspecified',
    category: 'Symptoms & Signs',
    subcategory: 'Fluid Retention',
    severity: 'Mild to Moderate',
    commonTerms: ['oedema', 'edema', 'swelling', 'fluid retention', 'leg swelling'],
    nhddDescription: 'Abnormal accumulation of fluid in interstitial spaces',
    icd11Chapter: 'Chapter 21: Symptoms, signs or clinical findings not classified elsewhere',
    icd11Block: 'ME11-ME1Z Oedema'
  },

  // ─── ADDITIONAL COMMON INFECTIONS ────────────────────────────────────────
  {
    nhdd: 'ADD001',
    icd10: 'A41.9',
    icd11: '1G40.Z',
    diagnosis: 'Sepsis, unspecified',
    category: 'Critical Care Conditions',
    subcategory: 'Sepsis',
    severity: 'Severe',
    commonTerms: ['sepsis', 'septicaemia', 'blood poisoning', 'systemic infection', 'bacteraemia'],
    nhddDescription: 'Life-threatening organ dysfunction caused by dysregulated host response to infection',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1G40-1G4Z Sepsis'
  },
  {
    nhdd: 'ADD002',
    icd10: 'G00.9',
    icd11: '1D01.Z',
    diagnosis: 'Bacterial meningitis, unspecified',
    category: 'Neurological Disorders',
    subcategory: 'Meningitis',
    severity: 'Severe',
    commonTerms: ['meningitis', 'bacterial meningitis', 'meningococcal meningitis', 'neck stiffness fever'],
    nhddDescription: 'Bacterial infection of the meninges',
    icd11Chapter: 'Chapter 1: Certain infectious or parasitic diseases',
    icd11Block: '1D01-1D0Z Bacterial meningitis'
  },
  {
    nhdd: 'ADD003',
    icd10: 'J18.9',
    icd11: 'CA40.0',
    diagnosis: 'Pneumonia, unspecified organism',
    category: 'Respiratory Disorders',
    subcategory: 'Pneumonia',
    severity: 'Moderate to Severe',
    commonTerms: ['pneumonia', 'lung infection', 'chest infection', 'pneumonitis'],
    nhddDescription: 'Infection causing inflammation of lung tissue',
    icd11Chapter: 'Chapter 12: Diseases of the respiratory system',
    icd11Block: 'CA40-CA4Z Pneumonia'
  },
  {
    nhdd: 'ADD004',
    icd10: 'N12',
    icd11: 'GB51.Z',
    diagnosis: 'Tubulo-interstitial nephritis, unspecified',
    category: 'Urinary Disorders',
    subcategory: 'Kidney Infections',
    severity: 'Moderate',
    commonTerms: ['pyelonephritis', 'kidney infection', 'upper UTI', 'renal infection', 'loin pain fever'],
    nhddDescription: 'Bacterial infection of the kidney parenchyma',
    icd11Chapter: 'Chapter 16: Diseases of the genitourinary system',
    icd11Block: 'GB51-GB5Z Tubulo-interstitial nephritis'
  },
  {
    nhdd: 'ADD005',
    icd10: 'K35.8',
    icd11: 'DA91.0',
    diagnosis: 'Acute appendicitis with peritonitis',
    category: 'Gastrointestinal Disorders',
    subcategory: 'Appendix Conditions',
    severity: 'Severe',
    commonTerms: ['perforated appendicitis', 'appendicitis peritonitis', 'appendix perforation', 'ruptured appendix'],
    nhddDescription: 'Appendicitis complicated by peritoneal inflammation',
    icd11Chapter: 'Chapter 13: Diseases of the digestive system',
    icd11Block: 'DA91-DA9Z Appendicitis with complications'
  }
];

export default enhancedDiagnosisDatabase; 