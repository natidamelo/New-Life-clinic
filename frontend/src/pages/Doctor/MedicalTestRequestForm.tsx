import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import imagingService from '../../services/imagingService';
import api from '../../services/api';
import { 
  BeakerIcon, 
  HeartIcon, 
  DocumentTextIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
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

    // ECG and Echocardiography don't require body part (automatically set to Heart/Cardiac)

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

        // For ECG/Echocardiography use Heart/Cardiac; for Mammography use Breast - Left/Right/Bilateral
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

      // Reset form
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
      // Clear lab test selections if it was a lab test
      if (activeTab === 'lab') {
        setSelectedLabTests({});
        setExpandedTests(new Set());
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.response?.data?.message || `Failed to submit ${activeTab} request`);
    } finally {
      setSubmitting(false);
    }
  };

  const testTabs: { id: TestType; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'ultrasound', label: 'Ultrasound', icon: BeakerIcon },
    { id: 'xray', label: 'X-Ray', icon: BeakerIcon },
    { id: 'mri', label: 'MRI', icon: BeakerIcon },
    { id: 'ecg', label: 'ECG', icon: HeartIcon },
    { id: 'echocardiography', label: 'Echocardiography', icon: HeartIcon },
    { id: 'ctscan', label: 'CT Scan', icon: BeakerIcon },
    { id: 'mammography', label: 'Mammography', icon: BeakerIcon },
    { id: 'lab', label: 'Lab', icon: DocumentTextIcon }
  ];

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

  // Ordered with most commonly requested imaging areas first so they appear in the visible dropdown area
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

  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

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

    const allLabTestNames = getAllSelectedTestNames();
    const labTestsTableHtml = activeTab === 'lab'
      ? `
        <table class="tests-table">
          <thead>
            <tr>
              <th style="width: 48px;">#</th>
              <th>Lab Test</th>
            </tr>
          </thead>
          <tbody>
            ${allLabTestNames
              .map((testName, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapeHtml(testName)}</td>
                </tr>
              `)
              .join('')}
          </tbody>
        </table>
      `
      : '';

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Request Form - ${testTypeLabel}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A5 portrait;
              margin: 3mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0; 
              padding: 0; 
              line-height: 1.4; 
              background: white;
              color: #333;
              font-size: 15px;
            }
            .request-container {
              width: 100%;
              max-width: 100%;
              height: 204mm;
              margin: 0;
              border: 2px solid #2c5aa0;
              padding: 12px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .clinic-header { 
              text-align: center;
              margin-bottom: 10px; 
              border-bottom: 2px solid #2c5aa0; 
              padding-bottom: 8px; 
            }
            .clinic-header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              margin-bottom: 6px;
            }
            .clinic-logo {
              width: 55px;
              height: 55px;
              object-fit: contain;
              flex-shrink: 0;
              border-radius: 3px;
            }
            .clinic-name { 
              font-size: 1.5rem; 
              font-weight: 800; 
              color: #2c5aa0; 
              margin-bottom: 4px; 
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .document-title { 
              font-size: 1.3rem; 
              color: #333; 
              margin-bottom: 5px; 
              font-weight: 800;
            }
            .clinic-details { 
              font-size: 0.95rem; 
              color: #666; 
              margin-bottom: 3px; 
              line-height: 1.3;
            }
            .request-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #f8f9fa;
              padding: 8px 12px;
              border-radius: 3px;
              margin-bottom: 10px;
              border-left: 3px solid #2c5aa0;
              font-size: 1rem;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 0.9rem;
              color: #666;
              font-weight: 500;
              margin-bottom: 3px;
            }
            .meta-value {
              color: #333;
              font-size: 1.05rem;
              font-weight: 600;
            }
            .priority-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 10px;
              font-size: 0.9rem;
              font-weight: 600;
              text-transform: uppercase;
            }
            .priority-routine {
              background: #d1ecf1;
              color: #0c5460;
            }
            .priority-stat {
              background: #f8d7da;
              color: #721c24;
            }
            .priority-asap {
              background: #fff3cd;
              color: #856404;
            }
            .request-section { 
              margin-bottom: 10px; 
              background: #fafafa;
              padding: 10px;
              border-radius: 3px;
              border-left: 3px solid #2c5aa0;
              flex-grow: 1;
            }
            .request-section h3 { 
              font-size: 1.15rem; 
              margin-bottom: 8px; 
              color: #2c5aa0; 
              border-bottom: 1px solid #e9ecef; 
              padding-bottom: 4px; 
              font-weight: 800;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 10px; 
              margin-bottom: 8px; 
            }
            .info-item {
              display: flex;
              flex-direction: column;
              margin-bottom: 6px;
            }
            .info-label {
              font-weight: 800;
              color: #2c5aa0;
              font-size: 0.95rem;
              margin-bottom: 3px;
            }
            .info-value {
              color: #333;
              font-size: 1rem;
              padding: 2px 0;
              line-height: 1.4;
            }
            .clinical-info {
              background: white;
              padding: 8px;
              border: 1px solid #dee2e6;
              border-radius: 3px;
              margin-top: 6px;
              white-space: pre-wrap;
              line-height: 1.5;
              font-size: 0.95rem;
            }

            .tests-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              background: white;
            }
            .tests-table th,
            .tests-table td {
              border: 1px solid #dee2e6;
              padding: 6px 8px;
              font-size: 0.95rem;
              vertical-align: top;
            }
            .tests-table th {
              background: #f0f3f7;
              color: #2c5aa0;
              font-weight: 800;
              text-align: left;
            }

            .tests-table tbody tr:nth-child(even) {
              background: #fbfcfe;
            }
            .request-footer { 
              display: flex; 
              justify-content: space-between; 
              margin-top: auto;
              padding-top: 10px; 
              border-top: 2px solid #2c5aa0; 
            }
            .signature-section { 
              text-align: center; 
              flex: 1;
              margin: 0 12px;
              font-size: 0.95rem;
            }
            .signature-line { 
              border-bottom: 1px solid #333; 
              width: 140px; 
              margin: 10px auto 4px; 
              height: 1px;
            }
            .signature-label {
              font-size: 0.9rem;
              color: #666;
              font-weight: 600;
            }
            @media print { 
              html, body { 
                margin: 0; 
                padding: 0; 
                font-size: 14px;
                width: 148mm;
                height: 210mm;
              }
              .request-container { 
                box-shadow: none; 
                border: 2px solid #2c5aa0; 
                padding: 12px;
                width: 100%;
                min-height: 204mm;
                height: auto;
                box-sizing: border-box;
                margin: 0;
                overflow: visible;
              }
              .clinic-header {
                margin-bottom: 9px;
                padding-bottom: 7px;
              }
              .clinic-header-content {
                gap: 12px;
                margin-bottom: 5px;
              }
              .clinic-logo {
                width: 52px;
                height: 52px;
              }
              .clinic-name {
                font-size: 1.45rem;
              }
              .document-title {
                font-size: 1.25rem;
                margin-bottom: 4px;
              }
              .clinic-details {
                font-size: 0.9rem;
              }
              .request-meta {
                padding: 7px 10px;
                margin-bottom: 9px;
                font-size: 0.95rem;
              }
              .meta-label {
                font-size: 0.85rem;
              }
              .meta-value {
                font-size: 1rem;
              }
              .priority-badge {
                padding: 3px 10px;
                font-size: 0.85rem;
              }
              .request-section {
                margin-bottom: 9px;
                padding: 9px;
              }
              .request-section h3 {
                font-size: 1.1rem;
                margin-bottom: 6px;
              }
              .info-grid {
                gap: 9px;
                margin-bottom: 6px;
              }
              .info-item {
                margin-bottom: 5px;
              }
              .info-label {
                font-size: 0.9rem;
              }
              .info-value {
                font-size: 0.95rem;
              }
              .clinical-info {
                padding: 7px;
                font-size: 0.9rem;
                line-height: 1.4;
              }
              .tests-table th,
              .tests-table td {
                padding: 5px 7px;
                font-size: 0.9rem;
              }

              .tests-table thead {
                display: table-header-group;
              }
              .tests-table tbody {
                display: table-row-group;
              }
              .request-footer {
                margin-top: auto;
                padding-top: 8px;
              }
              .signature-section {
                font-size: 0.9rem;
                margin: 0 10px;
              }
              .signature-line {
                width: 130px;
                margin: 8px auto 3px;
              }
              .signature-label {
                font-size: 0.85rem;
              }
            }
          </style>
        </head>
        <body>
          <div class="request-container">
            <div class="clinic-header">
              <div class="clinic-header-content">
                <img src="/assets/images/logo.jpg" alt="New Life Medium Clinic Logo" class="clinic-logo" onerror="this.onerror=null;this.src='/assets/images/logo-placeholder.svg';">
                <div>
                  <div class="clinic-name">New Life Medium Clinic PLC</div>
                </div>
              </div>
              <div class="document-title">Request Form</div>
              <div class="clinic-details">Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia</div>
              <div class="clinic-details">Phone: +251925959219</div>
            </div>

            <div class="request-meta">
              <div class="meta-item">
                <span class="meta-label">Request Date:</span>
                <span class="meta-value">${currentDate}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Request Time:</span>
                <span class="meta-value">${currentTime}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Priority:</span>
                <span class="meta-value">
                  <span class="priority-badge priority-${formData.priority.toLowerCase()}">${formData.priority}</span>
                </span>
              </div>
            </div>

            <div class="request-section">
              <h3>Patient Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Patient Name:</span>
                  <span class="info-value">${selectedPatient.firstName} ${selectedPatient.lastName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Medical Record #:</span>
                  <span class="info-value">${selectedPatient.patientId || 'N/A'}</span>
                </div>
                ${selectedPatient.age ? `
                <div class="info-item">
                  <span class="info-label">Age:</span>
                  <span class="info-value">${selectedPatient.age} years</span>
                </div>
                ` : ''}
                ${selectedPatient.gender ? `
                <div class="info-item">
                  <span class="info-label">Gender:</span>
                  <span class="info-value">${selectedPatient.gender}</span>
                </div>
                ` : ''}
              </div>
            </div>

            <div class="request-section">
              <h3>Test Request Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Test Type:</span>
                  <span class="info-value">${testTypeLabel}</span>
                </div>
                ${['ultrasound', 'xray', 'mri', 'ctscan'].includes(activeTab) && formData.bodyPart ? `
                <div class="info-item">
                  <span class="info-label">Body Part:</span>
                  <span class="info-value">${formData.bodyPart}</span>
                </div>
                ` : ''}
                ${activeTab === 'lab' ? `
                <div class="info-item" style="grid-column: 1 / -1;">
                  <span class="info-label">Selected Lab Tests:</span>
                  <div class="info-value" style="padding: 0;">
                    ${labTestsTableHtml}
                  </div>
                </div>
                ` : formData.specificTest ? `
                <div class="info-item">
                  <span class="info-label">Specific Test:</span>
                  <span class="info-value">${formData.specificTest}</span>
                </div>
                ` : ''}
                ${(activeTab === 'ecg' || activeTab === 'echocardiography') ? `
                <div class="info-item">
                  <span class="info-label">Body Part:</span>
                  <span class="info-value">Heart/Cardiac</span>
                </div>
                ` : activeTab === 'mammography' && mammographyBodyPartLabel ? `
                <div class="info-item">
                  <span class="info-label">Body Part:</span>
                  <span class="info-value">${mammographyBodyPartLabel}</span>
                </div>
                ` : ''}
              </div>
              <div class="info-item" style="grid-column: 1 / -1;">
                <span class="info-label">Clinical Information / Indication:</span>
                <div class="clinical-info">${formData.clinicalInfo}</div>
              </div>
              ${formData.notes ? `
              <div class="info-item" style="grid-column: 1 / -1; margin-top: 8px;">
                <span class="info-label">Additional Notes:</span>
                <div class="clinical-info">${formData.notes}</div>
              </div>
              ` : ''}
            </div>

            <div class="request-section">
              <h3>Requesting Physician</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Doctor Name:</span>
                  <span class="info-value">${user?.firstName || ''} ${user?.lastName || ''}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Date & Time:</span>
                  <span class="info-value">${currentDate} at ${currentTime}</span>
                </div>
              </div>
            </div>

            <div class="request-footer">
              <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-label">Requesting Physician Signature</div>
              </div>
              <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-label">Date</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for images to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
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
        // 1) Summary sheet
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
          { wch: 38 }, // Clinical Information / Indication
          { wch: 30 }, // Additional Notes
          { wch: 22 }, // Requesting Physician
          { wch: 22 }, // Lab Category
          { wch: 34 }, // Lab Test
        ];

        const summaryName = 'Request Summary';
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, summaryName);

        // 2) Lab tests sheet (with category + each selected test row)
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
          { wch: 38 }, // Clinical info
          { wch: 30 }, // Additional Notes
          { wch: 22 } // Requesting Physician
        ];

        // Freeze header row (best-effort).
        (labWorksheet as any)['!freeze'] = { xSplit: 0, ySplit: 1, topRow: 1 };

        XLSX.utils.book_append_sheet(workbook, labWorksheet, 'Lab Tests');
      } else {
        // For imaging requests: keep one clean sheet.
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
          { wch: 34 }, // Lab Test
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
          { wch: 38 }, // Clinical Information / Indication
          { wch: 30 }, // Additional Notes
          { wch: 22 }, // Requesting Physician
        ];

        (worksheet as any)['!freeze'] = { xSplit: 0, ySplit: 1, topRow: 1 };

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Request Form');
      }

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      });

      const safePatientId = (selectedPatient.patientId || selectedPatient._id || 'patient').toString().replace(/[^\w-]+/g, '');
      saveAs(blob, `Lab-Request-${safePatientId}-${Date.now()}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to export to Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Request Forms</h1>
        <p className="text-muted-foreground">Request various medical tests and imaging studies for patients</p>
      </div>

      {/* Patient Selection */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Patient Information</h2>
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patient by name, ID, or phone number..."
              className="w-full pl-10 pr-10 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => searchQuery && setShowSearchResults(true)}
            />
            {selectedPatient && (
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setSearchQuery('');
                  setFormData(prev => ({ ...prev, patientId: '', patientName: '' }));
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((patient) => (
                <div
                  key={patient._id || patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                >
                  <div className="font-medium text-foreground">
                    {patient.firstName} {patient.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {patient.patientId && `MR#: ${patient.patientId}`}
                    {patient.age && ` | Age: ${patient.age}`}
                    {patient.gender && ` | ${patient.gender}`}
                    {patient.contactNumber && ` | Phone: ${patient.contactNumber}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isSearching && (
            <div className="mt-2 text-sm text-muted-foreground">Searching...</div>
          )}

          {selectedPatient && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="font-semibold text-foreground">
                Selected: {selectedPatient.firstName} {selectedPatient.lastName}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {selectedPatient.patientId && `MR#: ${selectedPatient.patientId}`}
                {selectedPatient.age && ` | Age: ${selectedPatient.age}`}
                {selectedPatient.gender && ` | ${selectedPatient.gender}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Type Tabs */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="border-b border-border">
          <div className="flex overflow-x-auto">
            {testTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Body Part (for imaging tests, but not ECG/Echocardiography) */}
            {['ultrasound', 'xray', 'mri', 'ctscan'].includes(activeTab) && (
              <div ref={bodyPartDropdownRef} className="relative">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Body Part <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setBodyPartDropdownOpen((prev) => !prev)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-left bg-background flex items-center justify-between"
                  aria-haspopup="listbox"
                  aria-expanded={bodyPartDropdownOpen}
                >
                  <span className={formData.bodyPart ? 'text-foreground' : 'text-muted-foreground'}>
                    {formData.bodyPart || 'Select body part'}
                  </span>
                  <svg className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${bodyPartDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {bodyPartDropdownOpen && (
                  <div
                    className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
                    role="listbox"
                  >
                    <div className="max-h-[280px] overflow-y-auto py-1">
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
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors ${formData.bodyPart === part ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'}`}
                        >
                          {part}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Info for ECG/Echocardiography */}
            {(activeTab === 'ecg' || activeTab === 'echocardiography') && (
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Body part will be automatically set to "Heart/Cardiac" for {activeTab === 'ecg' ? 'ECG' : 'Echocardiography'} tests.
                </p>
              </div>
            )}

            {/* Mammography: Which breast (required) */}
            {activeTab === 'mammography' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Which breast? <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mammographyLaterality"
                      value="left"
                      checked={mammographyLaterality === 'left'}
                      onChange={() => setMammographyLaterality('left')}
                      className="w-4 h-4 text-primary border-border focus:ring-primary focus:ring-2"
                    />
                    <span className="text-foreground font-medium">Left breast</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mammographyLaterality"
                      value="right"
                      checked={mammographyLaterality === 'right'}
                      onChange={() => setMammographyLaterality('right')}
                      className="w-4 h-4 text-primary border-border focus:ring-primary focus:ring-2"
                    />
                    <span className="text-foreground font-medium">Right breast</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mammographyLaterality"
                      value="bilateral"
                      checked={mammographyLaterality === 'bilateral'}
                      onChange={() => setMammographyLaterality('bilateral')}
                      className="w-4 h-4 text-primary border-border focus:ring-primary focus:ring-2"
                    />
                    <span className="text-foreground font-medium">Bilateral (both breasts)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Lab Tests Selection (for lab) */}
            {activeTab === 'lab' && (
              <div>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Lab test requests are prepared for printing only and will not be submitted to the lab system.
                  </p>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-foreground">
                    Select Lab Tests <span className="text-destructive">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllTests}
                    className="text-sm text-primary hover:text-primary/80 underline"
                  >
                    {Object.keys(selectedLabTests).length === Object.keys(labTests).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto border border-border rounded-lg p-4 bg-muted/20">
                  {Object.entries(labTests).map(([mainTest, subTests]) => {
                    const isExpanded = expandedTests.has(mainTest);
                    const isMainTestSelected = !!selectedLabTests[mainTest];
                    const selectedSubTestsCount = selectedLabTests[mainTest]?.size || 0;
                    const totalSubTestsCount = subTests.length;

                    return (
                      <div key={mainTest} className="border border-border rounded-lg bg-card">
                        {/* Main Test Header */}
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleExpandedTest(mainTest)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isMainTestSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleMainTestToggle(mainTest, e.target.checked);
                              }}
                              className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                            />
                            <span className="font-medium text-foreground">{mainTest}</span>
                            {selectedSubTestsCount > 0 && (
                              <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                                {selectedSubTestsCount}/{totalSubTestsCount} selected
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
                            <svg
                              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Sub-tests */}
                        {isExpanded && (
                          <div className="border-t border-border bg-muted/10">
                            <div className="p-3 space-y-2">
                              {subTests.map((subTest) => (
                                <label key={subTest} className="flex items-center gap-3 cursor-pointer hover:bg-muted/20 p-2 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedLabTests[mainTest]?.has(subTest) || false}
                                    onChange={(e) => handleSubTestSelection(mainTest, subTest, e.target.checked)}
                                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                                  />
                                  <span className="text-sm text-foreground">{subTest}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {getTotalSelectedTests() === 0 && (
                  <p className="text-sm text-destructive mt-2">Please select at least one lab test</p>
                )}
                {getTotalSelectedTests() > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      {getTotalSelectedTests()} test{getTotalSelectedTests() > 1 ? 's' : ''} selected:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {getAllSelectedTestNames().map((test) => (
                        <span
                          key={test}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                        >
                          {test}
                          <button
                            type="button"
                            onClick={() => {
                              // Find which main test this sub-test belongs to and remove it
                              Object.entries(selectedLabTests).forEach(([mainTest, subTests]) => {
                                if (subTests.has(test)) {
                                  handleSubTestSelection(mainTest, test, false);
                                }
                              });
                            }}
                            className="hover:text-destructive ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clinical Information */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Clinical Information / Indication <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.clinicalInfo}
                onChange={(e) => handleInputChange('clinicalInfo', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter clinical information, indication, or reason for the test..."
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Priority <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value as 'Routine' | 'STAT' | 'ASAP')}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="Routine">Routine</option>
                <option value="STAT">STAT (Urgent)</option>
                <option value="ASAP">ASAP (As Soon As Possible)</option>
              </select>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Any additional notes or special instructions..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-between gap-4 pt-4 border-t border-border">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!selectedPatient || !formData.clinicalInfo.trim() || (activeTab === 'lab' && getTotalSelectedTests() === 0) || (activeTab === 'mammography' && !mammographyLaterality)}
                  className="flex items-center gap-2 px-6 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PrinterIcon className="w-5 h-5" />
                  {activeTab === 'lab' ? 'Print (Paper)' : 'Print Request'}
                </button>
                {activeTab === 'lab' && (
                  <button
                    type="button"
                    onClick={handleExportToExcel}
                    disabled={
                      exportingExcel ||
                      !selectedPatient ||
                      !formData.clinicalInfo.trim() ||
                      (activeTab === 'lab' && getTotalSelectedTests() === 0)
                    }
                    className="flex items-center gap-2 px-6 py-2 bg-muted/30 border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DocumentTextIcon className="w-5 h-5" />
                    {exportingExcel ? 'Exporting...' : 'Export to Excel'}
                  </button>
                )}
              </div>
              <div className="flex gap-4">
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
                  }}
                  className="px-6 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                  disabled={submitting}
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedPatient || (activeTab === 'lab' && getTotalSelectedTests() === 0) || (activeTab === 'mammography' && !mammographyLaterality)}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : activeTab === 'lab' ? 'Prepare Lab Request' : `Submit ${testTabs.find(t => t.id === activeTab)?.label} Request`}
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

