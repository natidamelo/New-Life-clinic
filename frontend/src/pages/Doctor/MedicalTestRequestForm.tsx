import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import patientService from '../../services/patientService';
import imagingService from '../../services/imagingService';
import api from '../../services/api';
import { 
  Search, 
  X, 
  Printer, 
  FileSpreadsheet, 
  Activity, 
  Heart, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  User, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Info, 
  Layers, 
  FileText, 
  Sparkles,
  Zap,
  CheckCircle2,
  Bookmark,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Patient {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  patientId?: string;
  age?: number;
  gender?: string;
  contactNumber?: string;
}

type TestType = 'ultrasound' | 'xray' | 'mri' | 'ecg' | 'echocardiography' | 'ctscan' | 'mammography' | 'lab';

type MammographyLaterality = 'left' | 'right' | 'bilateral';

interface TestRequest {
  testType: TestType;
  patientId: string;
  patientName: string;
  bodyPart?: string;
  clinicalInfo: string;
  priority: 'Routine' | 'STAT' | 'ASAP';
  notes?: string;
  specificTest?: string; // For lab tests
  selectedTests?: string[]; // For multiple lab tests
}

const MedicalTestRequestForm: React.FC = () => {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const [activeTab, setActiveTab] = useState<TestType>('ultrasound');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const bodyPartDropdownRef = useRef<HTMLDivElement>(null);
  const [bodyPartDropdownOpen, setBodyPartDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Lab test search filter query
  const [labSearchQuery, setLabSearchQuery] = useState('');

  // Form state for each test type
  const [formData, setFormData] = useState<TestRequest>({
    testType: 'ultrasound',
    patientId: '',
    patientName: '',
    bodyPart: '',
    clinicalInfo: '',
    priority: 'Routine',
    notes: '',
    specificTest: '',
    selectedTests: []
  });

  // State for mammography: which breast (left, right, or bilateral)
  const [mammographyLaterality, setMammographyLaterality] = useState<MammographyLaterality | ''>('');

  // State for multiple test selection - now supports hierarchical structure
  const [selectedLabTests, setSelectedLabTests] = useState<{[mainTest: string]: Set<string>}>({});
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const getLabSection = (mainTest: string): string => {
    // Lab print sections requested by the user.
    const map: Record<string, string> = {
      'Complete Blood Count (CBC)': 'HEMATOLOGY',
      'Basic Metabolic Panel (BMP)': 'CHEMISTRY',
      'Comprehensive Metabolic Panel (CMP)': 'CHEMISTRY',
      'Lipid Panel': 'CHEMISTRY',
      'Liver Function Tests': 'CHEMISTRY',
      'Urinalysis': 'URINALYSIS',
      'Stool Analysis': 'PARASITOLOGY',
      'Blood Culture': 'MICROBIOLOGY',
      'Urine Culture': 'MICROBIOLOGY',
      'Throat Culture': 'MICROBIOLOGY',
      'Mycology': 'PARASITOLOGY',
      'Thyroid Function Tests': 'IMMUNOCHEMISTRY',
      'Hemoglobin A1C': 'IMMUNOCHEMISTRY',
      'Pap Smear': 'PATHOLOGY',
      'Biopsy': 'PATHOLOGY',
      'Other': 'OTHER'
    };

    return map[mainTest] || 'OTHER';
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (bodyPartDropdownRef.current && !bodyPartDropdownRef.current.contains(event.target as Node)) {
        setBodyPartDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search patients
  const handlePatientSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const patients = await patientService.searchPatients(query);
      const patientsArray = Array.isArray(patients) ? patients : [];
      setSearchResults(patientsArray.slice(0, 10));
      setShowSearchResults(true);
    } catch (error) {
      console.error('Patient search error:', error);
      toast.error('Failed to search patients');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      handlePatientSearch(query);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patientId: patient._id || patient.id || '',
      patientName: `${patient.firstName} ${patient.lastName}`
    }));
    setSearchQuery(`${patient.firstName} ${patient.lastName}`);
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleTabChange = (tab: TestType) => {
    setActiveTab(tab);
    setBodyPartDropdownOpen(false);
    setMammographyLaterality('');
    setFormData(prev => ({
      ...prev,
      testType: tab,
      bodyPart: '',
      clinicalInfo: '',
      notes: '',
      specificTest: '',
      selectedTests: []
    }));
    // Clear selected tests when switching tabs
    setSelectedLabTests({});
    setExpandedTests(new Set());
    setLabSearchQuery('');
  };

  const handleMainTestToggle = (mainTest: string, checked: boolean) => {
    setSelectedLabTests(prev => {
      const newSelected = { ...prev };
      if (checked) {
        // Select all sub-tests for this main test
        newSelected[mainTest] = new Set(labTests[mainTest as keyof typeof labTests]);
      } else {
        // Deselect all sub-tests for this main test
        delete newSelected[mainTest];
      }
      return newSelected;
    });
  };

  const handleSubTestSelection = (mainTest: string, subTest: string, checked: boolean) => {
    setSelectedLabTests(prev => {
      const newSelected = { ...prev };
      if (!newSelected[mainTest]) {
        newSelected[mainTest] = new Set();
      }

      if (checked) {
        newSelected[mainTest].add(subTest);
      } else {
        newSelected[mainTest].delete(subTest);
        // If no sub-tests selected, remove the main test entry
        if (newSelected[mainTest].size === 0) {
          delete newSelected[mainTest];
        }
      }

      return newSelected;
    });
  };

  const toggleExpandedTest = (mainTest: string) => {
    setExpandedTests(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(mainTest)) {
        newExpanded.delete(mainTest);
      } else {
        newExpanded.add(mainTest);
      }
      return newExpanded;
    });
  };

  const handleSelectAllTests = () => {
    const allMainTests = Object.keys(labTests);
    const currentlySelectedMainTests = Object.keys(selectedLabTests);
    const allSelected = currentlySelectedMainTests.length === allMainTests.length &&
      allMainTests.every(mainTest =>
        selectedLabTests[mainTest]?.size === labTests[mainTest as keyof typeof labTests].length
      );

    if (allSelected) {
      // Deselect all
      setSelectedLabTests({});
    } else {
      // Select all main tests and all their sub-tests
      const newSelected: {[mainTest: string]: Set<string>} = {};
      allMainTests.forEach(mainTest => {
        newSelected[mainTest] = new Set(labTests[mainTest as keyof typeof labTests]);
      });
      setSelectedLabTests(newSelected);
    }
  };

  // Get total selected tests count
  const getTotalSelectedTests = () => {
    return Object.values(selectedLabTests).reduce((total, subTests) => total + subTests.size, 0);
  };

  // Get all selected test names for display
  const getAllSelectedTestNames = () => {
    const allNames: string[] = [];
    Object.entries(selectedLabTests).forEach(([mainTest, subTests]) => {
      subTests.forEach(subTest => {
        allNames.push(subTest);
      });
    });
    return allNames;
  };

  const handleInputChange = (field: keyof TestRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Preset Panel configurations
  const labPanels = [
    {
      name: 'CBC Panel',
      mainTestsList: ['Complete Blood Count (CBC)']
    },
    {
      name: 'Lipid Panel',
      mainTestsList: ['Lipid Panel']
    },
    {
      name: 'Liver Profile (LFT)',
      mainTestsList: ['Liver Function Tests']
    },
    {
      name: 'Metabolic BMP',
      mainTestsList: ['Basic Metabolic Panel (BMP)']
    },
    {
      name: 'Thyroid Panel',
      mainTestsList: ['Thyroid Function Tests']
    },
    {
      name: 'Routine Lab Screen',
      mainTestsList: ['Complete Blood Count (CBC)', 'Basic Metabolic Panel (BMP)', 'Lipid Panel', 'Urinalysis']
    }
  ];

  const handleApplyPresetPanel = (mainTestsList: string[]) => {
    setSelectedLabTests(prev => {
      const newSelected = { ...prev };
      mainTestsList.forEach(mainTest => {
        if (labTests[mainTest as keyof typeof labTests]) {
          newSelected[mainTest] = new Set(labTests[mainTest as keyof typeof labTests]);
        }
      });
      return newSelected;
    });
    
    // Auto-expand the applied panels
    setExpandedTests(prev => {
      const newExpanded = new Set(prev);
      mainTestsList.forEach(mt => newExpanded.add(mt));
      return newExpanded;
    });

    toast.success('Applied panel tests to form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    if (!formData.clinicalInfo.trim()) {
      toast.error('Please provide clinical information');
      return;
    }

    if (activeTab === 'lab' && getTotalSelectedTests() === 0) {
      toast.error('Please select at least one lab test');
      return;
    }

    if (['ultrasound', 'xray', 'mri', 'ctscan'].includes(activeTab) && !formData.bodyPart?.trim()) {
      toast.error('Please specify the body part');
      return;
    }

    if (activeTab === 'mammography' && !mammographyLaterality) {
      toast.error('Please select which breast (Left, Right, or Bilateral)');
      return;
    }

    setSubmitting(true);

    try {
      let response;

      if (activeTab === 'lab') {
        // Lab tests are for printing only - no submission to backend
        toast.success('Lab test request prepared for printing');
      } else {
        // Submit imaging request (including ECG and Echocardiography)
        const imagingTypeMap: Record<string, string> = {
          'ultrasound': 'Ultrasound',
          'xray': 'X-Ray',
          'mri': 'MRI',
          'ctscan': 'CT Scan',
          'ecg': 'ECG',
          'echocardiography': 'Echocardiography',
          'mammography': 'Mammography'
        };

        const bodyPartForCardiac = activeTab === 'ecg' || activeTab === 'echocardiography'
          ? 'Heart/Cardiac'
          : activeTab === 'mammography'
            ? `Breast - ${mammographyLaterality === 'left' ? 'Left' : mammographyLaterality === 'right' ? 'Right' : 'Bilateral'}`
            : formData.bodyPart || 'N/A';

        response = await imagingService.createImagingOrder({
          patientId: formData.patientId,
          imagingType: imagingTypeMap[activeTab] || activeTab,
          bodyPart: bodyPartForCardiac,
          clinicalInfo: formData.clinicalInfo + (formData.notes ? `\n\nNotes: ${formData.notes}` : ''),
          priority: formData.priority
        });

        toast.success(`${activeTab.toUpperCase()} request submitted successfully`);
      }

      // Reset form (except selected patient)
      setFormData({
        testType: activeTab,
        patientId: selectedPatient._id || selectedPatient.id || '',
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        bodyPart: '',
        clinicalInfo: '',
        priority: 'Routine',
        notes: '',
        specificTest: ''
      });

      if (activeTab === 'mammography') {
        setMammographyLaterality('');
      }
      if (activeTab === 'lab') {
        setSelectedLabTests({});
        setExpandedTests(new Set());
        setLabSearchQuery('');
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.response?.data?.message || `Failed to submit ${activeTab} request`);
    } finally {
      setSubmitting(false);
    }
  };

  const labTests = {
    'Complete Blood Count (CBC)': [
      'White Blood Cell Count (WBC)',
      'Red Blood Cell Count (RBC)',
      'Hemoglobin (Hb)',
      'Hematocrit (HCT)',
      'Platelet Count',
      'Mean Corpuscular Volume (MCV)',
      'Mean Corpuscular Hemoglobin (MCH)',
      'Mean Corpuscular Hemoglobin Concentration (MCHC)',
      'Red Cell Distribution Width (RDW)',
      'Neutrophils',
      'Lymphocytes',
      'Monocytes',
      'Eosinophils',
      'Basophils'
    ],
    'Basic Metabolic Panel (BMP)': [
      'Glucose',
      'Calcium',
      'Sodium',
      'Potassium',
      'Carbon Dioxide (CO2)',
      'Chloride',
      'Blood Urea Nitrogen (BUN)',
      'Creatinine'
    ],
    'Comprehensive Metabolic Panel (CMP)': [
      'Glucose',
      'Calcium',
      'Sodium',
      'Potassium',
      'Carbon Dioxide (CO2)',
      'Chloride',
      'Blood Urea Nitrogen (BUN)',
      'Creatinine',
      'Albumin',
      'Total Protein',
      'Alkaline Phosphatase (ALP)',
      'Alanine Aminotransferase (ALT)',
      'Aspartate Aminotransferase (AST)',
      'Bilirubin (Total)',
      'Bilirubin (Direct)'
    ],
    'Lipid Panel': [
      'Total Cholesterol',
      'HDL Cholesterol',
      'LDL Cholesterol',
      'Triglycerides',
      'VLDL Cholesterol'
    ],
    'Liver Function Tests': [
      'Albumin',
      'Total Protein',
      'Alkaline Phosphatase (ALP)',
      'Alanine Aminotransferase (ALT)',
      'Aspartate Aminotransferase (AST)',
      'Gamma-Glutamyl Transferase (GGT)',
      'Bilirubin (Total)',
      'Bilirubin (Direct)',
      'Bilirubin (Indirect)'
    ],
    'Thyroid Function Tests': [
      'Thyroid Stimulating Hormone (TSH)',
      'Free T4',
      'Free T3',
      'Total T4',
      'Total T3',
      'Thyroid Peroxidase Antibodies (TPO)',
      'Thyroglobulin Antibodies (TgAb)'
    ],
    'Hemoglobin A1C': [
      'Hemoglobin A1C (%)',
      'Estimated Average Glucose (eAG)'
    ],
    'Urinalysis': [
      'Color',
      'Appearance',
      'Specific Gravity',
      'pH',
      'Protein',
      'Glucose',
      'Ketones',
      'Blood',
      'Nitrites',
      'Leukocyte Esterase',
      'White Blood Cells (WBC)',
      'Red Blood Cells (RBC)',
      'Epithelial Cells',
      'Bacteria',
      'Crystals'
    ],
    'Stool Analysis': [
      'Color',
      'Consistency',
      'Occult Blood',
      'Parasites',
      'Bacteria',
      'White Blood Cells',
      'Red Blood Cells',
      'Fat',
      'pH'
    ],
    'Blood Culture': [
      'Aerobic Culture',
      'Anaerobic Culture',
      'Fungal Culture'
    ],
    'Urine Culture': [
      'Bacterial Culture',
      'Fungal Culture',
      'Sensitivity Testing'
    ],
    'Throat Culture': [
      'Streptococcus Culture',
      'Other Bacterial Culture'
    ],
    'Mycology': [
      'KOH Preparation'
    ],
    'Pap Smear': [
      'Conventional Pap Smear',
      'Liquid-Based Cytology'
    ],
    'Biopsy': [
      'Histopathology',
      'Immunohistochemistry',
      'Special Stains'
    ],
    'Other': [
      'Custom Test'
    ]
  };

  const bodyParts = [
    'Shoulder',
    'Knee',
    'Wrist',
    'Ankle',
    'Spine',
    'Cervical Spine',
    'Thoracic Spine',
    'Lumbar Spine',
    'Chest',
    'Abdomen',
    'Head',
    'Hip',
    'Elbow',
    'Foot',
    'Pelvis',
    'Neck',
    'Skull',
    'Brain',
    'Face',
    'Sinuses',
    'Eye / Orbit',
    'Ear',
    'Jaw / TMJ',
    'Teeth',
    'Thyroid',
    'Thorax',
    'Breast',
    'Liver',
    'Gallbladder',
    'Spleen',
    'Kidney',
    'Pancreas',
    'Bladder',
    'Prostate',
    'Uterus',
    'Ovaries',
    'Scrotum / Testes',
    'Sacrum',
    'Upper Arm',
    'Forearm',
    'Hand',
    'Finger(s)',
    'Thigh',
    'Lower Leg',
    'Toe(s)',
    'Upper Extremity',
    'Lower Extremity',
    'Soft Tissue',
    'Other'
  ];

  // Quick select common body parts
  const quickBodyParts = ['Chest', 'Abdomen', 'Knee', 'Spine', 'Shoulder', 'Brain', 'Pelvis'];

  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Filtered lab tests based on search query
  const filteredLabTests = useMemo(() => {
    if (!labSearchQuery.trim()) return labTests;

    const query = labSearchQuery.toLowerCase();
    const result: Record<string, string[]> = {};

    Object.entries(labTests).forEach(([mainTest, subTests]) => {
      const matchMain = mainTest.toLowerCase().includes(query);
      const matchingSubs = subTests.filter(sub => sub.toLowerCase().includes(query));

      if (matchMain) {
        // If main test matches, return all its sub tests
        result[mainTest] = subTests;
      } else if (matchingSubs.length > 0) {
        // Otherwise, only return matching sub tests
        result[mainTest] = matchingSubs;
      }
    });

    return result;
  }, [labSearchQuery]);

  // Keep matching categories expanded during search
  useEffect(() => {
    if (labSearchQuery.trim()) {
      const matchingCategories = Object.keys(filteredLabTests);
      setExpandedTests(new Set(matchingCategories));
    }
  }, [filteredLabTests, labSearchQuery]);

  const handlePrint = () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    if (!formData.clinicalInfo.trim()) {
      toast.error('Please fill in the clinical information');
      return;
    }

    if (activeTab === 'lab' && getTotalSelectedTests() === 0) {
      toast.error('Please select at least one lab test');
      return;
    }

    if (activeTab === 'mammography' && !mammographyLaterality) {
      toast.error('Please select which breast (Left, Right, or Bilateral) before printing');
      return;
    }

    const testTypeLabel = testTabs.find(t => t.id === activeTab)?.label || activeTab;
    const mammographyBodyPartLabel = activeTab === 'mammography' && mammographyLaterality
      ? `Breast - ${mammographyLaterality === 'left' ? 'Left' : mammographyLaterality === 'right' ? 'Right' : 'Bilateral'}`
      : '';
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const labMasterTableHtml =
      activeTab === 'lab'
        ? (() => {
            const sectionOrder = [
              'SEROLOGY',
              'MICROBIOLOGY',
              'CHEMISTRY',
              'URINALYSIS',
              'PARASITOLOGY',
              'HEMATOLOGY',
              'IMMUNOCHEMISTRY',
              'PATHOLOGY',
              'OTHER'
            ];

            const selectedBySection: Record<string, Array<{ mainTest: string; subTest: string }>> = {};

            Object.entries(selectedLabTests).forEach(([mainTest, subSet]) => {
              if (!subSet || subSet.size === 0) return;

              const section = getLabSection(mainTest);
              if (!selectedBySection[section]) selectedBySection[section] = [];

              const masterSubTests = (labTests as any)[mainTest] || [];
              masterSubTests.forEach((subTest: string) => {
                if (subSet.has(subTest)) {
                  selectedBySection[section].push({ mainTest, subTest });
                }
              });
            });

            const selectedCount = getTotalSelectedTests();
            const compact = selectedCount >= 25;
            const rowPadding = compact ? '1px 3px' : '2px 4px';
            const tableFontSize = compact ? '9px' : '10.5px';

            let rowNo = 1;
            const rowsHtml: string[] = [];

            sectionOrder.forEach((section) => {
              const rows = selectedBySection[section];
              if (!rows || rows.length === 0) return;

              rowsHtml.push(`
                <tr class="lab-section-row">
                  <td colspan="4" style="background: #f1f5f9; font-weight: 850; text-transform: uppercase; font-size: 0.8rem; padding: 4px 6px; letter-spacing: 0.5px; border-bottom: 1.5px solid #cbd5e1; text-align: left; color: #1e3a8a;">
                    ${section}
                  </td>
                </tr>
              `);

              rows.forEach(({ mainTest, subTest }) => {
                rowsHtml.push(`
                  <tr class="lab-row" style="border-bottom: 1px solid #e2e8f0;">
                    <td class="lab-row-no" style="width: 32px; text-align: center; font-weight: 700; color: #475569;">${rowNo++}</td>
                    <td class="lab-test-cell" style="padding: 4px 8px; text-align: left;">
                      <div class="lab-test-category" style="font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 1px;">${escapeHtml(mainTest)}</div>
                      <div class="lab-test-name" style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">${escapeHtml(subTest)}</div>
                    </td>
                    <td class="lab-icd-cell" style="width: 120px; border-left: 1px solid #cfd8e3; border-right: 1px solid #cfd8e3;">&nbsp;</td>
                    <td class="lab-selected-cell" style="width: 44px; text-align: center; font-weight: 900; color: #2563eb; font-size: 1rem;">✔</td>
                  </tr>
                `);
              });
            });

            return `
              <style>
                .lab-master-table { font-size: ${tableFontSize}; width: 100%; border-collapse: collapse; background: white; border: 1.5px solid #94a3b8; }
                .lab-master-table th { background: #1e3a8a; color: white !important; font-weight: 800; font-size: 0.82rem; text-align: left; padding: 6px 8px; letter-spacing: 0.5px; }
                .lab-master-table td { padding: ${rowPadding}; border-bottom: 1px solid #cbd5e1; }
              </style>
              <div class="lab-instruction" style="font-size: 0.8rem; color: #475569; margin: 4px 0 10px 0; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <span>ℹ Requested tests are selected below. Please specify ICD-10 diagnostic codes in the designated column if required.</span>
              </div>
              <table class="lab-master-table">
                <thead>
                  <tr style="border-bottom: 2px solid #1e3a8a;">
                    <th style="width: 32px; text-align: center;">#</th>
                    <th>REQUESTED SPECIALTY TEST</th>
                    <th style="width: 120px; text-align: center; border-left: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2);">ICD-10 Code</th>
                    <th style="width: 44px; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml.join('')}
                </tbody>
              </table>
            `;
          })()
        : '';

    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Request Form - ${testTypeLabel}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 6mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              color: #000000 !important;
              border-color: #475569 !important;
            }
            body { 
              font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif; 
              margin: 0; 
              padding: 0; 
              line-height: 1.35; 
              background: white;
              color: #0f172a;
              font-size: 13.5px;
            }
            .request-container {
              width: 100%;
              max-width: 100%;
              margin: 0;
              border: 3px double #1e3a8a;
              padding: 18px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              border-radius: 6px;
            }
            .clinic-header {
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 12px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 12px;
              position: relative;
            }
            .clinic-logo-container {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .clinic-logo {
              width: 60px;
              height: 60px;
              object-fit: contain;
              border-radius: 6px;
              border: 1px solid #94a3b8;
            }
            .clinic-header-info {
              display: flex;
              flex-direction: column;
            }
            .clinic-name {
              font-size: 20px;
              font-weight: 850;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #1e3a8a !important;
            }
            .clinic-subtitle {
              font-size: 11px;
              color: #475569 !important;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 1px;
            }
            .clinic-contact-right {
              font-size: 10.5px;
              color: #475569 !important;
              text-align: right;
              line-height: 1.4;
              font-weight: 500;
            }
            .form-title-banner {
              text-align: center;
              margin-bottom: 14px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 6px 0;
            }
            .form-title-banner span {
              font-size: 14px;
              font-weight: 800;
              color: #1e3a8a !important;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .request-meta {
              display: flex;
              justify-content: space-between;
              background: #f8fafc;
              padding: 8px 12px;
              border-radius: 4px;
              margin-bottom: 12px;
              border-left: 4px solid #1e3a8a;
              border-top: 1px solid #e2e8f0;
              border-right: 1px solid #e2e8f0;
              border-bottom: 1px solid #e2e8f0;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 10.5px;
              color: #64748b !important;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .meta-value {
              color: #0f172a !important;
              font-weight: 700;
              font-size: 13.5px;
            }
            .priority-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              border: 1px solid #cbd5e1;
            }
            .priority-routine {
              background: #e2f0d9;
              color: #385723 !important;
              border-color: #a9d08e;
            }
            .priority-stat {
              background: #fce4d6;
              color: #c65911 !important;
              border-color: #f4b084;
              animation: blink 1s infinite alternate;
            }
            .priority-asap {
              background: #fff2cc;
              color: #7f6000 !important;
              border-color: #ffd966;
            }
            .request-section { 
              margin-bottom: 12px; 
              background: #ffffff;
              padding: 12px;
              border-radius: 4px;
              border: 1px solid #cbd5e1;
            }
            .request-section h3 { 
              font-size: 12px; 
              margin-bottom: 8px; 
              color: #1e3a8a !important; 
              border-bottom: 1.5px solid #1e3a8a; 
              padding-bottom: 3px; 
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 8px 20px; 
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-weight: 700;
              color: #475569 !important;
              font-size: 11px;
              text-transform: uppercase;
              margin-bottom: 1px;
            }
            .info-value {
              color: #0f172a !important;
              font-weight: 700;
              font-size: 13.5px;
            }
            .clinical-info {
              background: #fafafa;
              padding: 8px 10px;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              margin-top: 4px;
              white-space: pre-wrap;
              line-height: 1.4;
              font-size: 13px;
              font-weight: 500;
              min-height: 50px;
            }
            .request-footer { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 30px;
              padding-top: 15px; 
              border-top: 1.5px solid #1e3a8a; 
            }
            .signature-section { 
              text-align: center; 
              flex: 1;
              margin: 0 25px;
            }
            .signature-line { 
              border-bottom: 1.5px solid #000; 
              width: 170px; 
              margin: 15px auto 4px; 
              height: 1px;
            }
            .signature-label {
              font-size: 11px;
              color: #475569 !important;
              font-weight: 700;
              text-transform: uppercase;
            }
            .stamp-box {
              width: 85px;
              height: 85px;
              border: 1px dashed #94a3b8;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              color: #94a3b8 !important;
              text-transform: uppercase;
              font-weight: 700;
              margin-left: 20px;
            }
            @media print { 
              html, body { 
                background: white;
              }
              .request-container { 
                border: 2px solid #1e3a8a; 
                padding: 14px;
                width: 100%;
                box-sizing: border-box;
                margin: 0;
              }
              .priority-badge {
                border: 1px solid #000 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="request-container">
            <div class="clinic-header">
              <div class="clinic-logo-container">
                <img src="${clinic?.logo || '/assets/images/logo.jpg'}" alt="Clinic Logo" class="clinic-logo" onerror="this.style.display='none'">
                <div class="clinic-header-info">
                  <div class="clinic-name">${clinic?.fullName || clinic?.name || 'New Life Medium Clinic PLC'}</div>
                  <div class="clinic-subtitle">Laboratory & Diagnostic Imaging Services</div>
                </div>
              </div>
              <div class="clinic-contact-right">
                📍 ${clinic?.address || 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia'}<br>
                📞 Telephone: ${clinic?.contactPhone || '+251925959219'}
              </div>
            </div>
            
            <div class="form-title-banner">
              <span>── MEDICAL RECONNAISSANCE & TEST REQUEST ──</span>
            </div>

            <div class="request-meta">
              <div class="meta-item">
                <span class="meta-label">Request Date</span>
                <span class="meta-value">${currentDate}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Request Time</span>
                <span class="meta-value">${currentTime}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Urgency Priority</span>
                <span class="meta-value">
                  <span class="priority-badge priority-${formData.priority.toLowerCase()}">${formData.priority}</span>
                </span>
              </div>
            </div>

            <div class="request-section">
              <h3>1. Patient Demographics</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Full Name</span>
                  <span class="info-value" style="font-size: 14.5px;">${selectedPatient.firstName} ${selectedPatient.lastName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Medical Record Number (MRN)</span>
                  <span class="info-value">${selectedPatient.patientId || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Age</span>
                  <span class="info-value">${selectedPatient.age ? `${selectedPatient.age} Years` : 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Gender</span>
                  <span class="info-value" style="text-transform: capitalize;">${selectedPatient.gender || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div class="request-section" style="flex-grow: 1;">
              <h3>2. Diagnostic Request Details</h3>
              <div class="info-grid" style="margin-bottom: 10px;">
                <div class="info-item">
                  <span class="info-label">Category of Service</span>
                  <span class="info-value" style="text-transform: uppercase;">${testTypeLabel}</span>
                </div>
                ${['ultrasound', 'xray', 'mri', 'ctscan'].includes(activeTab) && formData.bodyPart ? `
                <div class="info-item">
                  <span class="info-label">Anatomical Target Site (Body Part)</span>
                  <span class="info-value">${formData.bodyPart}</span>
                </div>
                ` : ''}
                ${(activeTab === 'ecg' || activeTab === 'echocardiography') ? `
                <div class="info-item">
                  <span class="info-label">Anatomical Target Site</span>
                  <span class="info-value">Heart / Cardiac Assessment</span>
                </div>
                ` : ''}
                ${activeTab === 'mammography' && mammographyBodyPartLabel ? `
                <div class="info-item">
                  <span class="info-label">Laterality Requested</span>
                  <span class="info-value" style="text-transform: uppercase;">${mammographyBodyPartLabel}</span>
                </div>
                ` : ''}
              </div>
              
              ${activeTab === 'lab' ? `
              <div class="info-item" style="margin-top: 10px; margin-bottom: 10px;">
                <span class="info-label" style="margin-bottom: 4px;">Laboratory Panel Checklist</span>
                <div class="info-value" style="padding: 0;">
                  ${labMasterTableHtml}
                </div>
              </div>
              ` : ''}

              <div class="info-item" style="margin-top: 6px;">
                <span class="info-label">Clinical Indication & Presentation Notes</span>
                <div class="clinical-info">${escapeHtml(formData.clinicalInfo)}</div>
              </div>
              
              ${formData.notes ? `
              <div class="info-item" style="margin-top: 8px;">
                <span class="info-label">Secondary Directives & Notes</span>
                <div class="clinical-info">${escapeHtml(formData.notes)}</div>
              </div>
              ` : ''}
            </div>

            <div class="request-section">
              <h3>3. Ordering Medical Practitioner</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Clinician Name</span>
                  <span class="info-value">Dr. ${user?.firstName || ''} ${user?.lastName || ''}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Department / Clinic</span>
                  <span class="info-value">Internal Medicine / OPD</span>
                </div>
              </div>
            </div>

            <div class="request-footer">
              <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-label">Physician Signature & Stamp</div>
              </div>
              <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-label">Authorization Date</div>
              </div>
              <div class="stamp-box">
                Official Seal
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };
    }
  };

  const handleExportToExcel = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    if (!formData.clinicalInfo.trim()) {
      toast.error('Please fill in the clinical information');
      return;
    }

    if (activeTab === 'lab' && getTotalSelectedTests() === 0) {
      toast.error('Please select at least one lab test');
      return;
    }

    if (activeTab === 'mammography' && !mammographyLaterality) {
      toast.error('Please select which breast (Left, Right, or Bilateral) before exporting');
      return;
    }

    const testTypeLabel = testTabs.find(t => t.id === activeTab)?.label || activeTab;
    const mammographyBodyPartLabel = activeTab === 'mammography' && mammographyLaterality
      ? `Breast - ${mammographyLaterality === 'left' ? 'Left' : mammographyLaterality === 'right' ? 'Right' : 'Bilateral'}`
      : '';

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const requestingPhysician = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'N/A';
    const patientName = `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim();
    const patientMr = selectedPatient.patientId || 'N/A';
    const patientAge = selectedPatient.age ? `${selectedPatient.age} years` : '';
    const patientGender = selectedPatient.gender || '';

    const bodyPartForExcel =
      activeTab === 'lab'
        ? ''
        : activeTab === 'ecg' || activeTab === 'echocardiography'
          ? 'Heart/Cardiac'
          : activeTab === 'mammography'
            ? mammographyBodyPartLabel
            : formData.bodyPart || '';

    const commonColumns = {
      'Request Date': currentDate,
      'Request Time': currentTime,
      'Priority': formData.priority,
      'Patient Name': patientName,
      'Medical Record #': patientMr,
      'Age': patientAge,
      'Gender': patientGender,
      'Contact Number': selectedPatient.contactNumber || '',
      'Test Type': testTypeLabel,
      'Body Part': bodyPartForExcel,
      'Clinical Information / Indication': formData.clinicalInfo,
      'Additional Notes': formData.notes || '',
      'Requesting Physician': requestingPhysician
    };

    setExportingExcel(true);
    try {
      const workbook = XLSX.utils.book_new();

      if (activeTab === 'lab') {
        // Summary sheet
        const summaryWorksheet = XLSX.utils.json_to_sheet([{
          ...commonColumns,
          'Lab Category': '',
          'Lab Test': ''
        }]);

        (summaryWorksheet as any)['!cols'] = [
          { wch: 18 }, // Request Date
          { wch: 14 }, // Request Time
          { wch: 12 }, // Priority
          { wch: 24 }, // Patient Name
          { wch: 18 }, // Medical Record #
          { wch: 10 }, // Age
          { wch: 12 }, // Gender
          { wch: 18 }, // Contact Number
          { wch: 18 }, // Test Type
          { wch: 12 }, // Body Part
          { wch: 38 }, // Clinical Information
          { wch: 30 }, // Additional Notes
          { wch: 22 }, // Requesting Physician
          { wch: 22 }, // Lab Category
          { wch: 34 }, // Lab Test
        ];

        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Request Summary');

        // Detailed lab sheet
        const labRows: Array<Record<string, any>> = [];
        let no = 1;

        Object.entries(labTests).forEach(([mainTest, subTests]) => {
          const selectedSet = selectedLabTests[mainTest];
          if (!selectedSet) return;

          subTests.forEach((subTest) => {
            if (!selectedSet.has(subTest)) return;
            labRows.push({
              'No.': no++,
              'Lab Category': mainTest,
              'Lab Test': subTest,
              'Request Date': currentDate,
              'Request Time': currentTime,
              'Priority': formData.priority,
              'Patient Name': patientName,
              'Medical Record #': patientMr,
              'Age': patientAge,
              'Gender': patientGender,
              'Contact Number': selectedPatient.contactNumber || '',
              'Clinical Information / Indication': formData.clinicalInfo,
              'Additional Notes': formData.notes || '',
              'Requesting Physician': requestingPhysician
            });
          });
        });

        const labWorksheet = XLSX.utils.json_to_sheet(labRows);
        (labWorksheet as any)['!cols'] = [
          { wch: 6 }, // No.
          { wch: 22 }, // Lab Category
          { wch: 34 }, // Lab Test
          { wch: 18 }, // Request Date
          { wch: 14 }, // Request Time
          { wch: 12 }, // Priority
          { wch: 24 }, // Patient Name
          { wch: 18 }, // Medical Record #
          { wch: 10 }, // Age
          { wch: 12 }, // Gender
          { wch: 18 }, // Contact Number
          { wch: 38 }, // Clinical Info
          { wch: 30 }, // Notes
          { wch: 22 } // Physician
        ];

        (labWorksheet as any)['!freeze'] = { xSplit: 0, ySplit: 1, topRow: 1 };
        XLSX.utils.book_append_sheet(workbook, labWorksheet, 'Lab Tests Detail');
      } else {
        // Imaging request sheet
        const rows = [
          {
            'No.': 1,
            'Lab Test': '',
            ...commonColumns,
          }
        ];

        const worksheet = XLSX.utils.json_to_sheet(rows);
        (worksheet as any)['!cols'] = [
          { wch: 6 }, // No.
          { wch: 18 }, // Lab Test placeholder
          { wch: 18 }, // Request Date
          { wch: 14 }, // Request Time
          { wch: 12 }, // Priority
          { wch: 24 }, // Patient Name
          { wch: 18 }, // Medical Record #
          { wch: 10 }, // Age
          { wch: 12 }, // Gender
          { wch: 18 }, // Contact Number
          { wch: 18 }, // Test Type
          { wch: 18 }, // Body Part
          { wch: 38 }, // Clinical Info
          { wch: 30 }, // Notes
          { wch: 22 }, // Physician
        ];

        (worksheet as any)['!freeze'] = { xSplit: 0, ySplit: 1, topRow: 1 };
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Request Form');
      }

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      });

      const safePatientId = (selectedPatient.patientId || selectedPatient._id || 'patient').toString().replace(/[^\w-]+/g, '');
      saveAs(blob, `Diagnostic-Request-${safePatientId}-${Date.now()}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to export to Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  const testTabs: { id: TestType; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'ultrasound', label: 'Ultrasound', icon: Activity },
    { id: 'xray', label: 'X-Ray', icon: Layers },
    { id: 'mri', label: 'MRI', icon: Layers },
    { id: 'ecg', label: 'ECG', icon: Heart },
    { id: 'echocardiography', label: 'Echocardiography', icon: Heart },
    { id: 'ctscan', label: 'CT Scan', icon: Layers },
    { id: 'mammography', label: 'Mammography', icon: Sparkles },
    { id: 'lab', label: 'Laboratory', icon: FileText }
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 transform opacity-10">
          <Activity className="h-64 w-64" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-100 backdrop-blur-sm border border-blue-400/20">
            <Activity className="h-3.5 w-3.5" /> Doctor's Portal
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Diagnostic Requests</h1>
          <p className="max-w-xl text-blue-100 text-sm md:text-base font-medium">
            Order laboratory panels and diagnostic imaging studies (Ultrasound, X-Ray, MRI, CT Scan, and ECG) with instant print and system logging capabilities.
          </p>
        </div>
      </div>

      {/* Patient Selection Card */}
      <div className="bg-card rounded-2xl shadow-sm border border-border/80">
        <div className="border-b border-border/60 bg-muted/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Patient Information</h2>
          </div>
          {selectedPatient && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Check className="w-3 h-3" /> Selected
            </span>
          )}
        </div>
        
        <div className="p-6 space-y-4">
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patient by Name, Patient ID, or Contact Number..."
                className="w-full pl-11 pr-10 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-foreground placeholder:text-muted-foreground transition-all"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => searchQuery && setShowSearchResults(true)}
              />
              {selectedPatient && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setSearchQuery('');
                    setFormData(prev => ({ ...prev, patientId: '', patientName: '' }));
                    setSelectedLabTests({});
                    setExpandedTests(new Set());
                  }}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-30 w-full mt-2 bg-card border border-border rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
                {searchResults.map((patient) => {
                  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();
                  return (
                    <div
                      key={patient._id || patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 cursor-pointer transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground truncate">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-0.5">
                          {patient.patientId && <span className="font-semibold text-primary">MRN: {patient.patientId}</span>}
                          {patient.age && <span>• {patient.age} yrs</span>}
                          {patient.gender && <span className="capitalize">• {patient.gender}</span>}
                          {patient.contactNumber && <span>• 📞 {patient.contactNumber}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isSearching && (
              <div className="absolute z-30 w-full mt-2 bg-card border border-border rounded-xl p-4 text-center shadow-lg text-sm text-muted-foreground flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                Searching clinical registry...
              </div>
            )}
          </div>

          {/* Selected Patient Overview Card */}
          {selectedPatient && (
            <div className="bg-gradient-to-br from-muted/50 to-muted/20 border border-border/80 rounded-xl p-5 relative overflow-hidden transition-all duration-300">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-muted/10">
                <User className="w-24 h-24" />
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-lg font-bold text-white shadow-md">
                    {`${selectedPatient.firstName?.[0] || ''}${selectedPatient.lastName?.[0] || ''}`.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-semibold text-primary border border-blue-500/10">
                        MRN: {selectedPatient.patientId || 'N/A'}
                      </span>
                      {selectedPatient.age && (
                        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                          {selectedPatient.age} Years Old
                        </span>
                      )}
                      {selectedPatient.gender && (
                        <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/10 capitalize">
                          {selectedPatient.gender}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedPatient.contactNumber && (
                  <div className="text-sm bg-background border border-border/60 rounded-lg px-4 py-2 self-start sm:self-center">
                    <span className="text-muted-foreground block text-xs uppercase font-bold tracking-wide">Contact</span>
                    <span className="font-semibold text-foreground">📞 {selectedPatient.contactNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Container */}
      <div className="bg-card rounded-2xl shadow-sm border border-border/80">
        {/* Navigation Tabs */}
        <div className="border-b border-border/60 bg-muted/20 p-2 overflow-x-auto">
          <div className="flex space-x-1 min-w-max">
            {testTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Count for lab selection badge
              const labSelectedCount = tab.id === 'lab' ? getTotalSelectedTests() : 0;
              
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                  <span>{tab.label}</span>
                  {labSelectedCount > 0 && (
                    <span className={`ml-1.5 px-2 py-0.5 text-xs font-extrabold rounded-full ${
                      isActive ? 'bg-white text-primary' : 'bg-primary text-white'
                    }`}>
                      {labSelectedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Panel Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Main Service Fields */}
          <div className="space-y-6">
            
            {/* Imaging Selection Body Site Grid & Dropdown */}
            {['ultrasound', 'xray', 'mri', 'ctscan'].includes(activeTab) && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <label className="text-base font-bold text-foreground block">
                      Anatomical Target Site <span className="text-destructive">*</span>
                    </label>
                    <span className="text-xs text-muted-foreground">Select a common target or choose from the list.</span>
                  </div>
                  
                  {/* Dropdown Selector */}
                  <div ref={bodyPartDropdownRef} className="relative w-full md:w-72">
                    <button
                      type="button"
                      onClick={() => setBodyPartDropdownOpen((prev) => !prev)}
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-left bg-background text-sm flex items-center justify-between hover:bg-muted/40 transition-colors"
                      aria-haspopup="listbox"
                      aria-expanded={bodyPartDropdownOpen}
                    >
                      <span className={formData.bodyPart ? 'text-foreground font-semibold' : 'text-muted-foreground'}>
                        {formData.bodyPart || 'Search body parts...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${bodyPartDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {bodyPartDropdownOpen && (
                      <div className="absolute right-0 z-40 w-full mt-1.5 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-100">
                        <div className="max-h-60 overflow-y-auto py-1">
                          {bodyParts.map((part) => (
                            <button
                              key={part}
                              type="button"
                              role="option"
                              aria-selected={formData.bodyPart === part}
                              onClick={() => {
                                handleInputChange('bodyPart', part);
                                setBodyPartDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors ${formData.bodyPart === part ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'}`}
                            >
                              {part}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Select Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {quickBodyParts.map((part) => {
                    const isSelected = formData.bodyPart === part;
                    return (
                      <button
                        key={part}
                        type="button"
                        onClick={() => handleInputChange('bodyPart', part)}
                        className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary shadow-sm'
                            : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        }`}
                      >
                        {part}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('bodyPart', 'Other');
                      setBodyPartDropdownOpen(true);
                    }}
                    className={`px-3 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                      formData.bodyPart && !quickBodyParts.includes(formData.bodyPart)
                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                        : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                  >
                    Custom Site...
                  </button>
                </div>
              </div>
            )}

            {/* Cardiac assessment note */}
            {(activeTab === 'ecg' || activeTab === 'echocardiography') && (
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-foreground">Standard Cardiac Assessment Target</h4>
                  <p className="text-xs text-muted-foreground">
                    This order is automatically targeted at <strong>Heart/Cardiac</strong>. No additional anatomical targeting is required.
                  </p>
                </div>
              </div>
            )}

            {/* Mammography Breast selection */}
            {activeTab === 'mammography' && (
              <div className="space-y-3">
                <label className="text-base font-bold text-foreground block">
                  Laterality Assessment Target <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'left', title: 'Left Breast Only', desc: 'Single view request for left anatomical side' },
                    { id: 'right', title: 'Right Breast Only', desc: 'Single view request for right anatomical side' },
                    { id: 'bilateral', title: 'Bilateral Assessment', desc: 'Both breasts (routine screening setup)' }
                  ].map((laterality) => {
                    const isSelected = mammographyLaterality === laterality.id;
                    return (
                      <button
                        key={laterality.id}
                        type="button"
                        onClick={() => setMammographyLaterality(laterality.id as MammographyLaterality)}
                        className={`p-4 rounded-xl border-2 text-left transition-all flex items-start justify-between ${
                          isSelected
                            ? 'bg-primary/5 border-primary shadow-sm'
                            : 'bg-card border-border/80 hover:bg-muted/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <h4 className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {laterality.title}
                          </h4>
                          <p className="text-xs text-muted-foreground font-medium">
                            {laterality.desc}
                          </p>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'border-primary bg-primary text-white' : 'border-muted-foreground/30 bg-transparent'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Advanced Lab Panels selection */}
            {activeTab === 'lab' && (
              <div className="space-y-6">
                
                {/* Visual Alert */}
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-foreground">Print-Only Directives</h4>
                    <p className="text-xs text-muted-foreground">
                      Laboratory requests will generate a premium A4 print sheet containing ICD-10 columns for medical recording.
                    </p>
                  </div>
                </div>

                {/* Search & Preset Panel Buttons */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="text-base font-bold text-foreground">
                      Select Laboratory Panels & Tests <span className="text-destructive">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllTests}
                      className="text-xs font-bold text-primary hover:underline hover:text-primary/80 self-end sm:self-auto"
                    >
                      {Object.keys(selectedLabTests).length === Object.keys(labTests).length ? 'Deselect All Panels' : 'Select All Panels'}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search laboratory tests (e.g., glucose, creatinine, lipid)..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-foreground transition-all"
                        value={labSearchQuery}
                        onChange={(e) => setLabSearchQuery(e.target.value)}
                      />
                      {labSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setLabSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                    <span className="text-xs text-muted-foreground font-bold flex items-center gap-1 mr-1">
                      <Bookmark className="w-3 h-3 text-primary" /> Preset Panels:
                    </span>
                    {labPanels.map((panel) => (
                      <button
                        key={panel.name}
                        type="button"
                        onClick={() => handleApplyPresetPanel(panel.mainTestsList)}
                        className="px-2.5 py-1 text-xs font-bold bg-muted/60 border border-border/80 text-foreground hover:bg-primary/5 hover:border-primary/40 rounded-lg transition-all"
                      >
                        + {panel.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout Grid: Panels on left, selection preview on right */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Collapsible Lab Test List */}
                  <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto border border-border/70 rounded-xl p-3 bg-muted/10 scrollbar-thin">
                    {Object.entries(filteredLabTests).map(([mainTest, subTests]) => {
                      const isExpanded = expandedTests.has(mainTest);
                      const isMainTestSelected = !!selectedLabTests[mainTest];
                      const selectedSubTestsCount = selectedLabTests[mainTest]?.size || 0;
                      const totalSubTestsCount = subTests.length;

                      return (
                        <div key={mainTest} className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-xs">
                          {/* Main Panel Row */}
                          <div
                            className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => toggleExpandedTest(mainTest)}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMainTestToggle(mainTest, !isMainTestSelected);
                                }}
                                className="focus:outline-hidden"
                              >
                                <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${
                                  isMainTestSelected
                                    ? 'bg-primary border-primary text-white shadow-sm'
                                    : 'border-muted-foreground/30 bg-background hover:border-muted-foreground/60'
                                }`}>
                                  {isMainTestSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                </div>
                              </button>
                              <span className="font-bold text-foreground text-sm">{mainTest}</span>
                              {selectedSubTestsCount > 0 && (
                                <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  {selectedSubTestsCount} / {totalSubTestsCount} Selected
                                </span>
                              )}
                            </div>
                            
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandedTest(mainTest);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Sub tests container */}
                          {isExpanded && (
                            <div className="border-t border-border/50 bg-muted/5 divide-y divide-border/30">
                              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {subTests.map((subTest) => {
                                  const isChecked = selectedLabTests[mainTest]?.has(subTest) || false;
                                  return (
                                    <label
                                      key={subTest}
                                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors ${
                                        isChecked ? 'bg-primary/5' : ''
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => handleSubTestSelection(mainTest, subTest, e.target.checked)}
                                        className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary/20 shrink-0 mt-0.5 cursor-pointer"
                                      />
                                      <span className="text-xs font-semibold text-foreground leading-normal">{subTest}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {Object.keys(filteredLabTests).length === 0 && (
                      <div className="text-center py-12 text-muted-foreground text-sm font-medium">
                        🔍 No laboratory tests matched "{labSearchQuery}"
                      </div>
                    )}
                  </div>

                  {/* Summary Basket */}
                  <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col h-[500px]">
                    <div className="border-b border-border/50 pb-3 mb-3 flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">Selected Tests</span>
                      <span className="bg-primary/10 text-primary font-bold text-xs px-2.5 py-0.5 rounded-full">
                        {getTotalSelectedTests()} Total
                      </span>
                    </div>

                    {getTotalSelectedTests() === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <Filter className="w-8 h-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs font-semibold text-muted-foreground">
                          No laboratory tests selected yet.
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                        {Object.entries(selectedLabTests).map(([mainTest, subTests]) => (
                          <div key={mainTest} className="space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {mainTest}
                            </div>
                            <div className="space-y-1 pl-2">
                              {Array.from(subTests).map((test) => (
                                <div
                                  key={test}
                                  className="flex items-center justify-between gap-2 bg-muted/30 border border-border/40 rounded-lg p-2 text-xs transition-all hover:bg-muted"
                                >
                                  <span className="font-bold text-foreground leading-tight truncate">{test}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSubTestSelection(mainTest, test, false)}
                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {getTotalSelectedTests() > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedLabTests({})}
                        className="mt-4 w-full py-2 text-center text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg border border-destructive/20 transition-all cursor-pointer"
                      >
                        Deselect All ({getTotalSelectedTests()})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Clinical Information Indication */}
            <div className="space-y-2">
              <label className="text-base font-bold text-foreground block">
                Clinical Indication & Presentation Notes <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.clinicalInfo}
                onChange={(e) => handleInputChange('clinicalInfo', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-foreground placeholder:text-muted-foreground text-sm transition-all"
                placeholder="Detail patient symptoms, clinical indication, or reason for the test request..."
                required
              />
            </div>

            {/* Urgency Priority Cards */}
            <div className="space-y-3">
              <label className="text-base font-bold text-foreground block">
                Urgency Priority <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'Routine',
                    title: 'Routine Request',
                    desc: 'Processed within standard schedule timeline',
                    borderClass: 'border-slate-200 dark:border-slate-800',
                    activeClass: 'bg-slate-500/5 border-slate-500 text-slate-700 dark:text-slate-300'
                  },
                  {
                    id: 'ASAP',
                    title: 'ASAP Directive',
                    desc: 'High priority request for urgent cases',
                    borderClass: 'border-amber-200 dark:border-amber-900',
                    activeClass: 'bg-amber-500/5 border-amber-500 text-amber-700 dark:text-amber-300'
                  },
                  {
                    id: 'STAT',
                    title: 'STAT (Emergency)',
                    desc: 'Immediate diagnostic assessment required',
                    borderClass: 'border-rose-200 dark:border-rose-900',
                    activeClass: 'bg-rose-500/5 border-rose-500 text-rose-700 dark:text-rose-300'
                  }
                ].map((priorityOption) => {
                  const isSelected = formData.priority === priorityOption.id;
                  return (
                    <button
                      key={priorityOption.id}
                      type="button"
                      onClick={() => handleInputChange('priority', priorityOption.id as 'Routine' | 'STAT' | 'ASAP')}
                      className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex items-start gap-3 ${
                        isSelected
                          ? priorityOption.activeClass
                          : `bg-card ${priorityOption.borderClass} hover:bg-muted/10`
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {priorityOption.id === 'STAT' ? (
                          <div className="relative flex h-4 w-4">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              isSelected ? 'bg-rose-500' : 'bg-rose-400'
                            }`} />
                            <span className={`relative inline-flex rounded-full h-4 w-4 ${
                              isSelected ? 'bg-rose-600' : 'bg-rose-500'
                            }`} />
                          </div>
                        ) : (
                          <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-primary' : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold">{priorityOption.title}</h4>
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                          {priorityOption.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Secondary Notes */}
            <div className="space-y-2">
              <label className="text-base font-bold text-foreground block">
                Secondary Directives / Notes (Optional)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-foreground placeholder:text-muted-foreground text-sm transition-all"
                placeholder="Input additional directives or instructions to the laboratory/imaging staff..."
              />
            </div>

            {/* Form Action Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-border/80">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={
                    !selectedPatient ||
                    !formData.clinicalInfo.trim() ||
                    (activeTab === 'lab' && getTotalSelectedTests() === 0) ||
                    (activeTab === 'mammography' && !mammographyLaterality)
                  }
                  className="flex items-center justify-center gap-2 px-5 py-2.5 border border-border rounded-xl text-foreground font-bold hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Printer className="w-4.5 h-4.5" />
                  Print Physical Request
                </button>
                {activeTab === 'lab' && (
                  <button
                    type="button"
                    onClick={handleExportToExcel}
                    disabled={
                      exportingExcel ||
                      !selectedPatient ||
                      !formData.clinicalInfo.trim() ||
                      getTotalSelectedTests() === 0
                    }
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-bold hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <FileSpreadsheet className="w-4.5 h-4.5" />
                    {exportingExcel ? 'Exporting...' : 'Export Spreadsheet'}
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      testType: activeTab,
                      patientId: selectedPatient?._id || selectedPatient?.id || '',
                      patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : '',
                      bodyPart: '',
                      clinicalInfo: '',
                      priority: 'Routine',
                      notes: '',
                      specificTest: '',
                      selectedTests: []
                    });
                    setMammographyLaterality('');
                    setSelectedLabTests({});
                    setExpandedTests(new Set());
                    setLabSearchQuery('');
                  }}
                  className="px-5 py-2.5 border border-border rounded-xl text-foreground font-bold hover:bg-muted transition-colors text-sm"
                  disabled={submitting}
                >
                  Reset form
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedPatient ||
                    (activeTab === 'lab' && getTotalSelectedTests() === 0) ||
                    (activeTab === 'mammography' && !mammographyLaterality)
                  }
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/10"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Saving request...
                    </>
                  ) : activeTab === 'lab' ? (
                    <>
                      <CheckCircle2 className="w-4.5 h-4.5" />
                      Finalize Request Form
                    </>
                  ) : (
                    <>
                      <Zap className="w-4.5 h-4.5" />
                      Submit {testTabs.find(t => t.id === activeTab)?.label} Order
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default MedicalTestRequestForm;
