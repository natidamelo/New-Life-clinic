import React, { useState } from 'react';
import { X, Loader, ChevronDown, ChevronUp } from 'lucide-react';

interface LaboratoryRequestFormProps {
  patientId: string;
  patientName: string;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

interface TestCategory {
  name: string;
  isOpen: boolean;
  tests: {
    name: string;
    isSelected: boolean;
    normalRange?: string;
    units?: string;
    description?: string;
    clinicalSignificance?: string;
    specimenType?: string;
    preparation?: string;
  }[];
}

const LaboratoryRequestForm: React.FC<LaboratoryRequestFormProps> = ({
  patientId,
  patientName,
  onSubmit,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    testType: 'Routine',
    urgency: 'Routine',
    notes: '',
    fasting: false,
    collectionDate: '',
    testCategories: [
      {
        name: 'Hematology',
        isOpen: true,
        tests: [
          {
            name: 'Complete Blood Count (CBC)',
            isSelected: false,
            normalRange: 'Varies by parameter',
            units: 'Various',
            description: 'Comprehensive blood analysis including red cells, white cells, and platelets',
            clinicalSignificance: 'Screens for anemia, infection, leukemia, clotting disorders',
            specimenType: 'Venous blood (EDTA tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Hemoglobin',
            isSelected: false,
            normalRange: '12-16 g/dL (female), 14-18 g/dL (male)',
            units: 'g/dL',
            description: 'Protein in red blood cells that carries oxygen',
            clinicalSignificance: 'Diagnoses anemia, polycythemia, monitors treatment response',
            specimenType: 'Venous blood (EDTA tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'White Blood Cell Count',
            isSelected: false,
            normalRange: '4,500-11,000/µL',
            units: '/µL',
            description: 'Total count of white blood cells (neutrophils, lymphocytes, monocytes, eosinophils, basophils)',
            clinicalSignificance: 'Indicates infection, inflammation, leukemia, immune disorders',
            specimenType: 'Venous blood (EDTA tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Platelet Count',
            isSelected: false,
            normalRange: '150,000-450,000/µL',
            units: '/µL',
            description: 'Number of platelets in blood, essential for clotting',
            clinicalSignificance: 'Assesses bleeding risk, monitors chemotherapy effects, diagnoses thrombocytopenia/thrombocytosis',
            specimenType: 'Venous blood (EDTA tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Hematocrit',
            isSelected: false,
            normalRange: '36-46% (female), 41-53% (male)',
            units: '%',
            description: 'Percentage of blood volume occupied by red blood cells',
            clinicalSignificance: 'Evaluates anemia, dehydration, polycythemia, monitors treatment',
            specimenType: 'Venous blood (EDTA tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Erythrocyte Sedimentation Rate (ESR)',
            isSelected: false,
            normalRange: '0-20 mm/hr (female), 0-15 mm/hr (male)',
            units: 'mm/hr',
            description: 'Rate at which red blood cells settle in anticoagulated blood',
            clinicalSignificance: 'Non-specific marker of inflammation, infection, autoimmune diseases',
            specimenType: 'Venous blood (EDTA tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Prothrombin Time (PT)',
            isSelected: false,
            normalRange: '11-13.5 seconds',
            units: 'seconds',
            description: 'Time for blood to clot via extrinsic pathway',
            clinicalSignificance: 'Monitors warfarin therapy, liver function, vitamin K deficiency',
            specimenType: 'Venous blood (citrate tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'International Normalized Ratio (INR)',
            isSelected: false,
            normalRange: '0.8-1.1',
            units: 'ratio',
            description: 'Standardized measure of blood clotting time',
            clinicalSignificance: 'Monitors warfarin/anticoagulant therapy, standardizes PT results',
            specimenType: 'Venous blood (citrate tube)',
            preparation: 'No special preparation required'
          },
        ],
      },
      {
        name: 'Chemistry',
        isOpen: false,
        tests: [
          {
            name: 'Glucose (Fasting)',
            isSelected: false,
            normalRange: '70-99 mg/dL',
            units: 'mg/dL',
            description: 'Blood sugar level after overnight fasting',
            clinicalSignificance: 'Diagnoses diabetes, monitors glycemic control, screens for hypoglycemia',
            specimenType: 'Venous blood (fluoride tube)',
            preparation: 'Fasting for 8-12 hours required'
          },
          {
            name: 'HbA1c',
            isSelected: false,
            normalRange: '<5.7%',
            units: '%',
            description: 'Glycated hemoglobin, reflects average blood sugar over past 2-3 months',
            clinicalSignificance: 'Monitors long-term diabetes control, diagnoses diabetes complications',
            specimenType: 'Venous blood (EDTA tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Blood Urea Nitrogen (BUN)',
            isSelected: false,
            normalRange: '7-20 mg/dL',
            units: 'mg/dL',
            description: 'Waste product of protein metabolism filtered by kidneys',
            clinicalSignificance: 'Assesses kidney function, dehydration, protein metabolism',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Creatinine',
            isSelected: false,
            normalRange: '0.7-1.3 mg/dL (male), 0.6-1.1 mg/dL (female)',
            units: 'mg/dL',
            description: 'Waste product of muscle metabolism, cleared by kidneys',
            clinicalSignificance: 'Primary marker of kidney function, monitors renal disease progression',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Sodium',
            isSelected: false,
            normalRange: '135-145 mEq/L',
            units: 'mEq/L',
            description: 'Major extracellular electrolyte',
            clinicalSignificance: 'Evaluates fluid balance, dehydration, heart failure, kidney disease',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Potassium',
            isSelected: false,
            normalRange: '3.5-5.0 mEq/L',
            units: 'mEq/L',
            description: 'Major intracellular electrolyte, critical for cardiac function',
            clinicalSignificance: 'Monitors kidney function, cardiac rhythm, acid-base balance',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Chloride',
            isSelected: false,
            normalRange: '98-106 mEq/L',
            units: 'mEq/L',
            description: 'Major extracellular anion',
            clinicalSignificance: 'Assesses acid-base balance, dehydration, metabolic disorders',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Calcium',
            isSelected: false,
            normalRange: '8.5-10.2 mg/dL',
            units: 'mg/dL',
            description: 'Essential mineral for bone health, muscle function, and blood clotting',
            clinicalSignificance: 'Diagnoses bone disorders, parathyroid disease, vitamin D deficiency',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Uric Acid',
            isSelected: false,
            normalRange: '3.5-7.2 mg/dL (male), 2.6-6.0 mg/dL (female)',
            units: 'mg/dL',
            description: 'End product of purine metabolism',
            clinicalSignificance: 'Diagnoses gout, monitors kidney stones, assesses tumor lysis syndrome',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
        ],
      },
      {
        name: 'Liver Function',
        isOpen: false,
        tests: [
          {
            name: 'Alanine Aminotransferase (ALT)',
            isSelected: false,
            normalRange: '7-56 U/L',
            units: 'U/L',
            description: 'Liver enzyme primarily found in hepatocytes',
            clinicalSignificance: 'Sensitive marker of hepatocellular injury, monitors hepatitis and drug-induced liver damage',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Aspartate Aminotransferase (AST)',
            isSelected: false,
            normalRange: '5-40 U/L',
            units: 'U/L',
            description: 'Liver enzyme found in multiple tissues including heart, muscle, and liver',
            clinicalSignificance: 'Indicates liver damage, myocardial infarction, muscle disorders',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Alkaline Phosphatase (ALP)',
            isSelected: false,
            normalRange: '44-147 U/L',
            units: 'U/L',
            description: 'Enzyme found in liver, bone, kidney, and placenta',
            clinicalSignificance: 'Diagnoses liver/biliary disease, bone disorders, monitors treatment response',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Total Bilirubin',
            isSelected: false,
            normalRange: '0.1-1.2 mg/dL',
            units: 'mg/dL',
            description: 'Breakdown product of hemoglobin metabolism',
            clinicalSignificance: 'Assesses liver function, biliary obstruction, hemolytic anemia',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Direct Bilirubin',
            isSelected: false,
            normalRange: '0.0-0.3 mg/dL',
            units: 'mg/dL',
            description: 'Conjugated bilirubin that is water-soluble',
            clinicalSignificance: 'Differentiates between hepatocellular and biliary disorders',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Albumin',
            isSelected: false,
            normalRange: '3.4-5.4 g/dL',
            units: 'g/dL',
            description: 'Major plasma protein produced by liver',
            clinicalSignificance: 'Assesses liver synthetic function, nutritional status, kidney disease',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Total Protein',
            isSelected: false,
            normalRange: '6.0-8.3 g/dL',
            units: 'g/dL',
            description: 'Combined measurement of albumin and globulins',
            clinicalSignificance: 'Evaluates liver function, nutritional status, plasma cell disorders',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
        ],
      },
      {
        name: 'Lipid Profile',
        isOpen: false,
        tests: [
          {
            name: 'Total Cholesterol',
            isSelected: false,
            normalRange: '<200 mg/dL',
            units: 'mg/dL',
            description: 'Total cholesterol including HDL, LDL, and VLDL fractions',
            clinicalSignificance: 'Cardiovascular risk assessment, monitors lipid-lowering therapy',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'Fasting for 12 hours recommended'
          },
          {
            name: 'HDL Cholesterol',
            isSelected: false,
            normalRange: '>40 mg/dL (male), >50 mg/dL (female)',
            units: 'mg/dL',
            description: 'High-density lipoprotein, "good" cholesterol that removes cholesterol from arteries',
            clinicalSignificance: 'Protective factor against cardiovascular disease',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'Fasting for 12 hours recommended'
          },
          {
            name: 'LDL Cholesterol',
            isSelected: false,
            normalRange: '<100 mg/dL',
            units: 'mg/dL',
            description: 'Low-density lipoprotein, "bad" cholesterol that can build up in arteries',
            clinicalSignificance: 'Primary target for cardiovascular risk reduction',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'Fasting for 12 hours recommended'
          },
          {
            name: 'Triglycerides',
            isSelected: false,
            normalRange: '<150 mg/dL',
            units: 'mg/dL',
            description: 'Storage form of fatty acids, major component of very low-density lipoprotein',
            clinicalSignificance: 'Independent cardiovascular risk factor, associated with metabolic syndrome',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'Fasting for 12 hours recommended'
          },
        ],
      },
      {
        name: 'Serology',
        isOpen: false,
        tests: [
          {
            name: 'Hepatitis B Surface Antigen (HBsAg)',
            isSelected: false,
            normalRange: 'Negative',
            units: 'Qualitative',
            description: 'Marker of active Hepatitis B virus infection',
            clinicalSignificance: 'Diagnoses acute/chronic HBV infection, screens blood donors',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Hepatitis C Antibody',
            isSelected: false,
            normalRange: 'Negative',
            units: 'Qualitative',
            description: 'Antibody response to Hepatitis C virus',
            clinicalSignificance: 'Screens for HCV exposure, requires confirmatory testing',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'HIV Antibody',
            isSelected: false,
            normalRange: 'Negative',
            units: 'Qualitative',
            description: 'Antibody response to Human Immunodeficiency Virus',
            clinicalSignificance: 'Diagnoses HIV infection, requires confirmatory testing',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Rheumatoid Factor',
            isSelected: false,
            normalRange: '<14 IU/mL',
            units: 'IU/mL',
            description: 'Autoantibody against Fc portion of IgG',
            clinicalSignificance: 'Supports diagnosis of rheumatoid arthritis, Sjögren\'s syndrome',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'C-Reactive Protein (CRP)',
            isSelected: false,
            normalRange: '<10 mg/L',
            units: 'mg/L',
            description: 'Acute phase reactant produced by liver',
            clinicalSignificance: 'Non-specific marker of inflammation, infection, tissue damage',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'ABO Blood Group & Rh Typing',
            isSelected: false,
            normalRange: 'Not applicable',
            units: 'Qualitative',
            description: 'Determination of ABO blood type and Rh factor',
            clinicalSignificance: 'Essential for blood transfusion compatibility, pregnancy care',
            specimenType: 'Venous blood (EDTA tube)',
            preparation: 'No special preparation required'
          },
        ],
      },
      {
        name: 'Urinalysis',
        isOpen: false,
        tests: [
          {
            name: 'Complete Urinalysis',
            isSelected: false,
            normalRange: 'Varies by parameter',
            units: 'Various',
            description: 'Comprehensive urine analysis including physical, chemical, and microscopic examination',
            clinicalSignificance: 'Screens for urinary tract infection, kidney disease, metabolic disorders',
            specimenType: 'Clean catch midstream urine',
            preparation: 'Clean genital area before collection, collect midstream'
          },
          {
            name: 'Urine pH',
            isSelected: false,
            normalRange: '4.5-8.0',
            units: 'pH units',
            description: 'Acidity/alkalinity of urine',
            clinicalSignificance: 'Assesses metabolic disorders, urinary tract infections, stone formation risk',
            specimenType: 'Fresh urine sample',
            preparation: 'No special preparation required'
          },
          {
            name: 'Urine Specific Gravity',
            isSelected: false,
            normalRange: '1.005-1.030',
            units: '',
            description: 'Concentration of solutes in urine relative to water',
            clinicalSignificance: 'Evaluates kidney concentrating ability, hydration status, diabetes insipidus',
            specimenType: 'Fresh urine sample',
            preparation: 'No special preparation required'
          },
          {
            name: 'Urine Glucose',
            isSelected: false,
            normalRange: 'Negative',
            units: 'Qualitative',
            description: 'Presence of glucose in urine',
            clinicalSignificance: 'Screens for diabetes mellitus, monitors glycemic control',
            specimenType: 'Fresh urine sample',
            preparation: 'No special preparation required'
          },
          {
            name: 'Urine Protein',
            isSelected: false,
            normalRange: 'Negative',
            units: 'Qualitative',
            description: 'Presence of protein in urine',
            clinicalSignificance: 'Indicates kidney damage, proteinuria, preeclampsia in pregnancy',
            specimenType: 'Fresh urine sample',
            preparation: 'No special preparation required'
          },
          {
            name: 'Urine Ketones',
            isSelected: false,
            normalRange: 'Negative',
            units: 'Qualitative',
            description: 'Presence of ketone bodies in urine',
            clinicalSignificance: 'Indicates diabetic ketoacidosis, starvation, severe illness',
            specimenType: 'Fresh urine sample',
            preparation: 'No special preparation required'
          },
        ],
      },
      {
        name: 'Lab',
        isOpen: false,
        tests: [
          {
            name: 'Stool Examination',
            isSelected: false,
            normalRange: 'No ova or parasites seen',
            units: 'Qualitative',
            description: 'Microscopic examination of stool for parasites, ova, and cysts',
            clinicalSignificance: 'Diagnoses parasitic infections, gastrointestinal disorders',
            specimenType: 'Fresh stool sample in clean container',
            preparation: 'Collect before starting antibiotic treatment'
          },
          {
            name: 'Stool Culture',
            isSelected: false,
            normalRange: 'No pathogenic organisms',
            units: 'Qualitative',
            description: 'Bacterial culture of stool to identify pathogenic organisms',
            clinicalSignificance: 'Diagnoses bacterial gastroenteritis, identifies antibiotic sensitivity',
            specimenType: 'Fresh stool sample in transport medium',
            preparation: 'Collect before starting antibiotic treatment'
          },
          {
            name: 'Stool Occult Blood',
            isSelected: false,
            normalRange: 'Negative',
            units: 'Qualitative',
            description: 'Detection of hidden blood in stool',
            clinicalSignificance: 'Screens for colorectal cancer, gastrointestinal bleeding',
            specimenType: 'Three stool samples collected on different days',
            preparation: 'Avoid red meat, aspirin, vitamin C supplements for 3 days before collection'
          },
        ],
      },
      {
        name: 'Other Tests',
        isOpen: false,
        tests: [
          {
            name: 'Thyroid Stimulating Hormone (TSH)',
            isSelected: false,
            normalRange: '0.4-4.0 mIU/L',
            units: 'mIU/L',
            description: 'Pituitary hormone that regulates thyroid function',
            clinicalSignificance: 'Primary test for thyroid dysfunction, monitors thyroid hormone replacement therapy',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Free T4',
            isSelected: false,
            normalRange: '0.8-1.8 ng/dL',
            units: 'ng/dL',
            description: 'Unbound thyroxine, biologically active thyroid hormone',
            clinicalSignificance: 'Assesses thyroid hormone levels, monitors treatment for thyroid disorders',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Free T3',
            isSelected: false,
            normalRange: '2.3-4.2 pg/mL',
            units: 'pg/mL',
            description: 'Unbound triiodothyronine, most active thyroid hormone',
            clinicalSignificance: 'Detailed thyroid function assessment, especially in hyperthyroidism',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Prostate Specific Antigen (PSA)',
            isSelected: false,
            normalRange: '<4.0 ng/mL',
            units: 'ng/mL',
            description: 'Protein produced by prostate gland cells',
            clinicalSignificance: 'Screens for prostate cancer, monitors prostate cancer treatment',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'Avoid ejaculation for 48 hours, avoid vigorous exercise before test'
          },
          {
            name: 'Ferritin',
            isSelected: false,
            normalRange: '20-250 ng/mL (male), 10-120 ng/mL (female)',
            units: 'ng/mL',
            description: 'Storage form of iron, reflects total body iron stores',
            clinicalSignificance: 'Diagnoses iron deficiency anemia, iron overload conditions',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Vitamin B12',
            isSelected: false,
            normalRange: '200-900 pg/mL',
            units: 'pg/mL',
            description: 'Essential vitamin for red blood cell formation and neurological function',
            clinicalSignificance: 'Diagnoses pernicious anemia, malabsorption syndromes, neurological disorders',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
          {
            name: 'Vitamin D, 25-Hydroxy',
            isSelected: false,
            normalRange: '30-100 ng/mL',
            units: 'ng/mL',
            description: 'Active form of vitamin D, reflects vitamin D status',
            clinicalSignificance: 'Diagnoses vitamin D deficiency, assesses bone health and calcium metabolism',
            specimenType: 'Venous blood (serum separator tube)',
            preparation: 'No special preparation required'
          },
        ],
      },
    ],
    otherTests: '',
  });

  const toggleCategoryOpen = (categoryIndex: number) => {
    setFormData((prev) => {
      const updatedCategories = [...prev.testCategories];
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        isOpen: !updatedCategories[categoryIndex].isOpen,
      };
      return {
        ...prev,
        testCategories: updatedCategories,
      };
    });
  };

  const handleTestSelection = (categoryIndex: number, testIndex: number) => {
    setFormData((prev) => {
      const updatedCategories = [...prev.testCategories];
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        tests: updatedCategories[categoryIndex].tests.map((test, idx) => {
          if (idx === testIndex) {
            return {
              ...test,
              isSelected: !test.isSelected,
            };
          }
          return test;
        }),
      };
      return {
        ...prev,
        testCategories: updatedCategories,
      };
    });
  };

  const handleSelectAllInCategory = (categoryIndex: number, selectAll: boolean) => {
    setFormData((prev) => {
      const updatedCategories = [...prev.testCategories];
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        tests: updatedCategories[categoryIndex].tests.map((test) => ({
          ...test,
          isSelected: selectAll,
        })),
      };
      return {
        ...prev,
        testCategories: updatedCategories,
      };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const getTotalSelectedTests = () => {
    return formData.testCategories.reduce(
      (total, category) => total + category.tests.filter((test) => test.isSelected).length,
      0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Get all selected tests
      const selectedTests = formData.testCategories
        .flatMap(category => 
          category.tests
            .filter(test => test.isSelected)
            .map(test => ({
              name: test.name,
              category: category.name,
              normalRange: test.normalRange,
              units: test.units
            }))
        );
      
      // Prepare the data to submit
      const requestData = {
        patientId,
        patientName,
        testType: formData.testType,
        urgency: formData.urgency,
        notes: formData.notes,
        fasting: formData.fasting,
        collectionDate: formData.collectionDate || new Date().toISOString().split('T')[0],
        selectedTests,
        otherTests: formData.otherTests,
        requestDate: new Date().toISOString(),
        status: 'Pending',
      };
      
      if (selectedTests.length === 0 && !formData.otherTests) {
        alert('Please select at least one test or specify other tests');
        setLoading(false);
        return;
      }
      
      await onSubmit(requestData);
    } catch (error) {
      console.error('Error submitting lab request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-primary-foreground rounded-lg p-6 relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-muted-foreground">Laboratory Test Request</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground/50 hover:text-muted-foreground"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="bg-primary/10 p-4 rounded-md mb-4">
        <div className="flex items-center">
          <div>
            <h3 className="text-md font-medium text-muted-foreground">Patient: {patientName}</h3>
            <p className="text-sm text-muted-foreground">ID: {patientId}</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="testType" className="block text-sm font-medium text-muted-foreground">
                Test Type
              </label>
              <select
                id="testType"
                name="testType"
                value={formData.testType}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border/40 focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm rounded-md"
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="STAT">STAT (Immediate)</option>
                <option value="Pre-op">Pre-operative</option>
                <option value="Post-op">Post-operative</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="urgency" className="block text-sm font-medium text-muted-foreground">
                Urgency
              </label>
              <select
                id="urgency"
                name="urgency"
                value={formData.urgency}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border/40 focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm rounded-md"
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="collectionDate" className="block text-sm font-medium text-muted-foreground">
                Collection Date
              </label>
              <input
                type="date"
                id="collectionDate"
                name="collectionDate"
                value={formData.collectionDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full border border-border/40 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              id="fasting"
              name="fasting"
              type="checkbox"
              checked={formData.fasting}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-primary focus:ring-blue-500 border-border/40 rounded"
            />
            <label htmlFor="fasting" className="ml-2 text-sm text-muted-foreground">
              Fasting Required (8-12 hours before the test)
            </label>
          </div>

          <div className="bg-muted/10 p-4 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-muted-foreground">Laboratory Tests</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                {getTotalSelectedTests()} test(s) selected
              </span>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {formData.testCategories.map((category, categoryIndex) => (
                <div key={categoryIndex} className="border border-border/30 rounded-md overflow-hidden">
                  <div 
                    className="bg-muted/10 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-muted/20"
                    onClick={() => toggleCategoryOpen(categoryIndex)}
                  >
                    <h4 className="text-sm font-medium text-muted-foreground">{category.name}</h4>
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-2">
                        {category.tests.filter(t => t.isSelected).length} of {category.tests.length} selected
                      </span>
                      {category.isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {category.isOpen && (
                    <div className="px-4 py-3 border-t border-border/30">
                      <div className="flex justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAllInCategory(categoryIndex, true)}
                          className="text-xs text-primary hover:text-primary"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectAllInCategory(categoryIndex, false)}
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          Deselect All
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {category.tests.map((test, testIndex) => (
                          <div key={testIndex} className="flex items-start">
                            <div className="flex h-5 items-center">
                              <input
                                type="checkbox"
                                checked={test.isSelected}
                                onChange={() => handleTestSelection(categoryIndex, testIndex)}
                                className="h-4 w-4 text-primary focus:ring-blue-500 border-border/40 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label className="font-medium text-muted-foreground">
                                {test.name}
                              </label>
                              {test.normalRange && (
                                <div className="text-xs text-muted-foreground">
                                  Normal: {test.normalRange} {test.units ? `(${test.units})` : ''}
                                </div>
                              )}
                              {test.description && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {test.description}
                                </div>
                              )}
                              {test.clinicalSignificance && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Clinical: {test.clinicalSignificance}
                                </div>
                              )}
                              {test.specimenType && (
                                <div className="text-xs text-green-600 mt-1">
                                  Specimen: {test.specimenType}
                                </div>
                              )}
                              {test.preparation && (
                                <div className="text-xs text-orange-600 mt-1">
                                  Prep: {test.preparation}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label htmlFor="otherTests" className="block text-sm font-medium text-muted-foreground">
              Other Tests (Please specify)
            </label>
            <textarea
              id="otherTests"
              name="otherTests"
              value={formData.otherTests}
              onChange={handleChange}
              rows={2}
              className="mt-1 block w-full border border-border/40 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm"
              placeholder="Specify any other tests not listed above"
            />
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
              Additional Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full border border-border/40 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm"
              placeholder="Any additional information for the laboratory staff"
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 border border-border/40 rounded-md shadow-sm text-sm font-medium text-muted-foreground bg-primary-foreground hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {loading && <Loader className="animate-spin h-4 w-4 mr-2" />}
              Submit Request
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LaboratoryRequestForm; 