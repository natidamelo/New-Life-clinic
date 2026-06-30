import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import { toast } from 'react-hot-toast';
import { isAuthenticated, getAuthToken, getAuthHeaders, clearAuthData, handleAuthError } from '../../utils/authUtils';
import { API_BASE_URL } from '../../config';

interface MedicalCertificate {
  _id: string;
  certificateNumber: string;
  patientName: string;
  patientId: string;
  patientDisplayId: string;
  patientAge: number;
  patientGender: string;
  diagnosis: string;
  certificateType: string;
  dateIssued: string;
  validUntil: string;
  status: string;
  doctorName: string;
  caregiverName?: string;
  caregiverRelation?: string;
  caregiverPhone?: string;
  caregiverIdNumber?: string;
}

interface Patient {
  _id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  contactNumber: string;
  address: any;
}

const MedicalCertificates: React.FC = () => {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'stats'>('form');
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  
  // Upgraded patient search states
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [focusedPatientIndex, setFocusedPatientIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Edit mode: when set, form submits as PUT instead of POST
  const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);
  
  // Certificate search and pagination
  const [certificateSearchTerm, setCertificateSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [certificatesPerPage] = useState(10);

  // Medical information options - with localStorage persistence
  const [diagnosisOptions, setDiagnosisOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('diagnosisOptions');
    return saved ? JSON.parse(saved) : [
      'Common Cold',
      'Flu (Influenza)',
      'Fever',
      'Headache',
      'Migraine',
      'Hypertension',
      'Diabetes',
      'Pneumonia',
      'Bronchitis',
      'Asthma',
      'Gastroenteritis',
      'Food Poisoning',
      'Typhoid Fever',
      'Malaria',
      'Dengue Fever',
      'COVID-19',
      'Sinusitis',
      'Ear Infection',
      'Sore Throat',
      'Back Pain',
      'Joint Pain',
      'Sprain',
      'Fracture',
      'Anxiety',
      'Depression',
      'Insomnia'
    ];
  });

  const [symptomsOptions, setSymptomsOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('symptomsOptions');
    return saved ? JSON.parse(saved) : [
      'Fever',
      'Headache',
      'Cough',
      'Sore Throat',
      'Runny Nose',
      'Congestion',
      'Body Aches',
      'Fatigue',
      'Nausea',
      'Vomiting',
      'Diarrhea',
      'Abdominal Pain',
      'Chest Pain',
      'Shortness of Breath',
      'Dizziness',
      'Weakness',
      'Loss of Appetite',
      'Insomnia',
      'Anxiety',
      'Depression',
      'Back Pain',
      'Joint Pain',
      'Swelling',
      'Rash',
      'Itching'
    ];
  });

  const [treatmentOptions, setTreatmentOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('treatmentOptions');
    return saved ? JSON.parse(saved) : [
      'Rest and Fluids',
      'Antibiotics',
      'Pain Relievers (Paracetamol)',
      'Anti-inflammatory (Ibuprofen)',
      'Antihistamines',
      'Cough Syrup',
      'Nasal Decongestant',
      'Antacids',
      'Anti-diarrheal',
      'Antiemetic',
      'Bronchodilator',
      'Steroids',
      'Insulin',
      'Blood Pressure Medication',
      'Physical Therapy',
      'Surgery'
    ];
  });

  const [workRestrictionOptions, setWorkRestrictionOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('workRestrictionOptions');
    return saved ? JSON.parse(saved) : [
      'No Restrictions',
      'Light Duty Only',
      'No Heavy Lifting',
      'No Standing for Long Periods',
      'No Driving',
      'No Operating Machinery',
      'Desk Work Only',
      'Modified Work Schedule',
      'Work from Home',
      'Complete Rest Required'
    ];
  });

  const [restPeriodOptions, setRestPeriodOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('restPeriodOptions');
    return saved ? JSON.parse(saved) : [
      'No Rest Required',
      '1 Day',
      '2 Days',
      '3 Days',
      '1 Week',
      '2 Weeks',
      '1 Month',
      'Until Follow-up',
      'As Needed'
    ];
  });

  const [recommendationsOptions, setRecommendationsOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('recommendationsOptions');
    return saved ? JSON.parse(saved) : [
      'Follow up in 1 week',
      'Follow up in 2 weeks',
      'Follow up in 1 month',
      'Return if symptoms worsen',
      'Return if no improvement',
      'Continue current medication',
      'Take medication with food',
      'Avoid alcohol while on medication',
      'Drink plenty of fluids',
      'Get adequate rest',
      'Avoid strenuous activities',
      'Apply ice to affected area',
      'Apply heat to affected area',
      'Elevate affected limb',
      'Use compression bandage',
      'Practice deep breathing exercises',
      'Maintain good hygiene',
      'Avoid contact with others if contagious',
      'Wear protective equipment',
      'Monitor blood pressure daily',
      'Check blood sugar levels',
      'Take temperature twice daily',
      'Keep wound clean and dry',
      'Change dressing daily',
      'Avoid smoking',
      'Limit caffeine intake',
      'Eat a balanced diet',
      'Exercise regularly as tolerated',
      'Maintain regular sleep schedule',
      'Reduce stress levels'
    ];
  });

  // Function to add new options to localStorage
  const addToOptions = (field: string, value: string) => {
    if (!value.trim()) return;
    
    const fieldMap = {
      diagnosis: { state: diagnosisOptions, setter: setDiagnosisOptions, key: 'diagnosisOptions' },
      symptoms: { state: symptomsOptions, setter: setSymptomsOptions, key: 'symptomsOptions' },
      treatment: { state: treatmentOptions, setter: setTreatmentOptions, key: 'treatmentOptions' },
      workRestriction: { state: workRestrictionOptions, setter: setWorkRestrictionOptions, key: 'workRestrictionOptions' },
      restPeriod: { state: restPeriodOptions, setter: setRestPeriodOptions, key: 'restPeriodOptions' },
      recommendations: { state: recommendationsOptions, setter: setRecommendationsOptions, key: 'recommendationsOptions' }
    };
    
    const config = fieldMap[field as keyof typeof fieldMap];
    if (!config) return;
    
    const { state, setter, key } = config;
    
    // Check if value already exists
    if (!state.includes(value)) {
      const newOptions = [...state, value].sort();
      setter(newOptions);
      localStorage.setItem(key, JSON.stringify(newOptions));
      toast.success(`"${value}" added to ${field} options for future use!`);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    patientDisplayId: '',
    patientName: '',
    patientAge: '',
    patientGender: '',
    patientAddress: '',
    patientPhone: '',
    diagnosis: '',
    symptoms: '',
    treatment: '',
    prescription: '',
    recommendations: '',
    followUpDate: '',
    restPeriod: '',
    workRestriction: '',
    certificateType: 'Medical Certificate',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clinicName: 'New Life Medium Clinic PLC',
    clinicAddress: 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia',
    clinicPhone: '+251925959219',
    clinicLicense: 'CL-001',
    notes: '',
    digitalSignature: null as File | null,
    caregiverName: '',
    caregiverRelation: '',
    caregiverPhone: '',
    caregiverIdNumber: ''
  });

  // Statistics state
  const [stats, setStats] = useState({
    total: 0,
    issued: 0,
    draft: 0,
    cancelled: 0
  });

  useEffect(() => {
    if (activeTab === 'list') {
      loadCertificates();
    } else if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab]);

  // Dynamically update clinic details in form state when clinic context loads
  useEffect(() => {
    if (clinic) {
      setFormData(prev => {
        const isDefault = prev.clinicName === '' || prev.clinicName === 'New Life Medium Clinic PLC';
        return {
          ...prev,
          clinicName: isDefault ? clinic.fullName || clinic.name : prev.clinicName,
          clinicAddress: isDefault ? clinic.address || prev.clinicAddress : prev.clinicAddress,
          clinicPhone: isDefault ? clinic.contactPhone || prev.clinicPhone : prev.clinicPhone,
          clinicLicense: isDefault ? clinic.licenseNumber || prev.clinicLicense : prev.clinicLicense
        };
      });
    }
  }, [clinic]);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      // Check authentication status
      if (!isAuthenticated()) {
        console.warn('[MedicalCertificates] Not authenticated, skipping certificates load');
        setLoading(false);
        return;
      }

      // Get authentication headers
      const authHeaders = getAuthHeaders();
      if (!authHeaders.Authorization) {
        console.warn('[MedicalCertificates] No auth token available for certificates');
        setLoading(false);
        return;
      }

      // Request all certificates (limit=0 means "no limit" on the backend)
      const response = await fetch(`${API_BASE_URL}/api/medical-certificates?limit=0`, {
        method: 'GET',
        headers: authHeaders
      });

      if (response.ok) {
        const result = await response.json();
        setCertificates(result.data || []);
        console.log('[MedicalCertificates] Certificates loaded successfully');
      } else if (response.status === 401) {
        console.error('[MedicalCertificates] 401 Unauthorized for certificates');
        handleAuthError({ response: { status: 401 } });
      } else {
        console.error('[MedicalCertificates] Certificates API error:', response.status);
        toast.error('Failed to load certificates');
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
      toast.error('Network error loading certificates');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Check authentication status
      if (!isAuthenticated()) {
        console.warn('[MedicalCertificates] Not authenticated, skipping stats load');
        return;
      }

      // Get authentication headers
      const authHeaders = getAuthHeaders();
      if (!authHeaders.Authorization) {
        console.warn('[MedicalCertificates] No auth token available for stats');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/medical-certificates/stats`, {
        method: 'GET',
        headers: authHeaders
      });

      if (response.ok) {
        const result = await response.json();
        setStats(result.data.overview || { total: 0, issued: 0, draft: 0, cancelled: 0 });
        console.log('[MedicalCertificates] Stats loaded successfully');
      } else if (response.status === 401) {
        console.error('[MedicalCertificates] 401 Unauthorized for stats');
        handleAuthError({ response: { status: 401 } });
      } else {
        console.error('[MedicalCertificates] Stats API error:', response.status);
      }
    } catch (error) {
      console.error('[MedicalCertificates] Error loading stats:', error);
      handleAuthError(error);
    }
  };

  const searchPatients = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }
    await performSearch(searchTerm);
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setPatients([]);
      return;
    }

    setPatientSearchLoading(true);
    try {
      if (!isAuthenticated()) {
        setPatientSearchLoading(false);
        return;
      }
      const authHeaders = getAuthHeaders();
      if (!authHeaders.Authorization) {
        setPatientSearchLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/patients/search?q=${encodeURIComponent(query)}&limit=10`, {
        method: 'GET',
        headers: authHeaders
      });

      if (response.ok) {
        const result = await response.json();
        setPatients(result.data || []);
        setFocusedPatientIndex(-1);
        setIsDropdownOpen(true);
      }
    } catch (error) {
      console.error('[MedicalCertificates] Error searching patients:', error);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  const loadRecentPatients = async () => {
    if (!isAuthenticated()) return;
    const authHeaders = getAuthHeaders();
    if (!authHeaders.Authorization) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/patients/quick-load?limit=5`, {
        method: 'GET',
        headers: authHeaders
      });
      if (response.ok) {
        const result = await response.json();
        setRecentPatients(result.patients || result.data || []);
      }
    } catch (err) {
      console.error('Error loading recent patients:', err);
    }
  };

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patientId: patient._id,
      patientDisplayId: patient.patientId || '',
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientAge: patient.age?.toString() || '',
      patientGender: patient.gender || '',
      patientAddress: typeof patient.address === 'object' ?
        `${patient.address.street || ''} ${patient.address.city || ''}`.trim() :
        patient.address || '',
      patientPhone: patient.contactNumber || ''
    }));
    setShowPatientSearch(false);
    setIsDropdownOpen(false);
    setSearchTerm('');
    setPatients([]);
    setRecentPatients([]);
    setFocusedPatientIndex(-1);
    toast.success('Patient information loaded');
  };

  const clearSearch = () => {
    setShowPatientSearch(false);
    setIsDropdownOpen(false);
    setSearchTerm('');
    setPatients([]);
    setRecentPatients([]);
    setFocusedPatientIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const listToNavigate = searchTerm.trim() ? patients : recentPatients;
    
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
        setFocusedPatientIndex(0);
      } else {
        setFocusedPatientIndex(prev => 
          prev < listToNavigate.length - 1 ? prev + 1 : prev
        );
      }
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setFocusedPatientIndex(prev => (prev > 0 ? prev - 1 : 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (isDropdownOpen && focusedPatientIndex >= 0 && focusedPatientIndex < listToNavigate.length) {
        selectPatient(listToNavigate[focusedPatientIndex]);
        e.preventDefault();
      }
    }
  };

  // Debounce search effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setPatients([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Click outside search container effect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter certificates based on search term
  const filteredCertificates = certificates.filter(cert => {
    const searchLower = certificateSearchTerm.toLowerCase();
    return (
      cert.certificateNumber.toLowerCase().includes(searchLower) ||
      cert.patientName.toLowerCase().includes(searchLower) ||
      cert.patientDisplayId?.toLowerCase().includes(searchLower) ||
      cert.diagnosis.toLowerCase().includes(searchLower) ||
      cert.certificateType.toLowerCase().includes(searchLower)
    );
  });
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredCertificates.length / certificatesPerPage) || 1;
  const startIndex = (currentPage - 1) * certificatesPerPage;
  const endIndex = startIndex + certificatesPerPage;
  const currentCertificates = filteredCertificates.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [certificateSearchTerm]);

  const loadCertificateForEdit = async (certificateId: string) => {
    if (!isAuthenticated()) {
      toast.error('Authentication required. Please log in.');
      return;
    }
    const authHeaders = getAuthHeaders();
    if (!authHeaders.Authorization) {
      toast.error('No valid authentication token found. Please log in.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/medical-certificates/${certificateId}`, {
        method: 'GET',
        headers: authHeaders
      });
      if (!response.ok) {
        toast.error('Failed to load certificate for editing');
        return;
      }
      const result = await response.json();
      const cert = result.data;
      const formatDate = (d: Date | string | null) => {
        if (!d) return '';
        const date = typeof d === 'string' ? new Date(d) : d;
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
      };
      setFormData({
        patientId: cert.patientId?._id ?? cert.patientId ?? '',
        patientDisplayId: cert.patientDisplayId ?? '',
        patientName: cert.patientName ?? '',
        patientAge: cert.patientAge?.toString() ?? '',
        patientGender: cert.patientGender ?? '',
        patientAddress: cert.patientAddress ?? '',
        patientPhone: cert.patientPhone ?? '',
        diagnosis: cert.diagnosis ?? '',
        symptoms: cert.symptoms ?? '',
        treatment: cert.treatment ?? '',
        prescription: cert.prescription ?? '',
        recommendations: cert.recommendations ?? '',
        followUpDate: formatDate(cert.followUpDate),
        restPeriod: cert.restPeriod ?? '',
        workRestriction: cert.workRestriction ?? '',
        certificateType: cert.certificateType ?? 'Medical Certificate',
        validFrom: formatDate(cert.validFrom),
        validUntil: formatDate(cert.validUntil),
        clinicName: cert.clinicName ?? 'New Life Medium Clinic PLC',
        clinicAddress: cert.clinicAddress ?? 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia',
        clinicPhone: cert.clinicPhone ?? '+251925959219',
        clinicLicense: cert.clinicLicense ?? 'CL-001',
        notes: cert.notes ?? '',
        digitalSignature: null,
        caregiverName: cert.caregiverName ?? '',
        caregiverRelation: cert.caregiverRelation ?? '',
        caregiverPhone: cert.caregiverPhone ?? '',
        caregiverIdNumber: cert.caregiverIdNumber ?? ''
      });
      setEditingCertificateId(certificateId);
      setActiveTab('form');
      toast.success('Certificate loaded for editing');
    } catch (error) {
      console.error('[MedicalCertificates] Error loading certificate for edit:', error);
      toast.error('Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingCertificateId(null);
    setFormData({
      patientId: '',
      patientDisplayId: '',
      patientName: '',
      patientAge: '',
      patientGender: '',
      patientAddress: '',
      patientPhone: '',
      diagnosis: '',
      symptoms: '',
      treatment: '',
      prescription: '',
      recommendations: '',
      followUpDate: '',
      restPeriod: '',
      workRestriction: '',
      certificateType: 'Medical Certificate',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clinicName: clinic?.fullName || clinic?.name || 'New Life Medium Clinic PLC',
      clinicAddress: clinic?.address || 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia',
      clinicPhone: clinic?.contactPhone || '+251925959219',
      clinicLicense: clinic?.licenseNumber || 'CL-001',
      notes: '',
      digitalSignature: null,
      caregiverName: '',
      caregiverRelation: '',
      caregiverPhone: '',
      caregiverIdNumber: ''
    });
    setSelectedPatient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = {
      patientName: formData.patientName,
      patientAge: formData.patientAge,
      patientGender: formData.patientGender,
      patientAddress: formData.patientAddress,
      diagnosis: formData.diagnosis
    };
    
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.toString().trim() === '')
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    // Validate patient age is a number
    if (isNaN(Number(formData.patientAge)) || Number(formData.patientAge) < 0 || Number(formData.patientAge) > 150) {
      toast.error('Please enter a valid patient age (0-150)');
      return;
    }
    
    // Validate patient gender
    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(formData.patientGender)) {
      toast.error('Please select a valid gender');
      return;
    }

    const isEdit = Boolean(editingCertificateId);
    setLoading(true);
    try {
      // Check authentication status
      if (!isAuthenticated()) {
        toast.error('Authentication required. Please log in.');
        setLoading(false);
        return;
      }

      // Get authentication token
      const token = getAuthToken();
      if (!token) {
        toast.error('No valid authentication token found. Please log in.');
        setLoading(false);
        return;
      }

      if (isEdit) {
        // Update: send JSON
        const payload: Record<string, string | number | null> = {
          patientId: formData.patientId || null,
          patientDisplayId: formData.patientDisplayId || null,
          patientName: formData.patientName || null,
          patientAge: formData.patientAge ? Number(formData.patientAge) : null,
          patientGender: formData.patientGender || null,
          patientAddress: formData.patientAddress || null,
          patientPhone: formData.patientPhone || null,
          diagnosis: formData.diagnosis || null,
          symptoms: formData.symptoms || null,
          treatment: formData.treatment || null,
          prescription: formData.prescription || null,
          recommendations: formData.recommendations || null,
          followUpDate: formData.followUpDate || null,
          restPeriod: formData.restPeriod || null,
          workRestriction: formData.workRestriction || null,
          certificateType: formData.certificateType || null,
          validFrom: formData.validFrom || null,
          validUntil: formData.validUntil || null,
          clinicName: formData.clinicName || null,
          clinicAddress: formData.clinicAddress || null,
          clinicPhone: formData.clinicPhone || null,
          clinicLicense: formData.clinicLicense || null,
          notes: formData.notes || null,
          caregiverName: formData.caregiverName || null,
          caregiverRelation: formData.caregiverRelation || null,
          caregiverPhone: formData.caregiverPhone || null,
          caregiverIdNumber: formData.caregiverIdNumber || null
        };
        Object.keys(payload).forEach(k => {
          if (k === 'notes') return; // always send notes so Additional Notes edits persist
          if (payload[k] === null || payload[k] === '') delete payload[k];
        });
        const response = await fetch(`${API_BASE_URL}/api/medical-certificates/${editingCertificateId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (response.ok) {
          toast.success('Medical certificate updated successfully!');
          cancelEdit();
          setActiveTab('list');
          // Update list with response data so UI shows edited values immediately
          if (result.data) {
            setCertificates(prev =>
              prev.map(c => (c._id === result.data._id ? result.data : c))
            );
          }
          await loadCertificates();
        } else if (response.status === 401) {
          console.error('[MedicalCertificates] 401 Unauthorized for certificate update');
          toast.error('Session expired. Please log in again.');
          clearAuthData();
          window.location.href = '/login';
        } else {
          if (result.errors && Array.isArray(result.errors)) {
            const errorMessages = result.errors.map((err: any) => err.msg || err.message).join(', ');
            toast.error(`Validation errors: ${errorMessages}`);
          } else {
            toast.error(result.message || 'Error updating certificate.');
          }
        }
        setLoading(false);
        return;
      }
      
      // Create: FormData for file upload
      const formDataToSend = new FormData();
      
      // Debug: Log form data before sending
      console.log('[MedicalCertificates] Form data being sent:', formData);
      
      // Add all form fields except digitalSignature with proper validation
      Object.keys(formData).forEach(key => {
        if (key !== 'digitalSignature' && formData[key as keyof typeof formData] !== null) {
          let value = formData[key as keyof typeof formData] as string;
          
          // Convert patientAge to integer if it's a number
          if (key === 'patientAge' && value && !isNaN(Number(value))) {
            value = Number(value).toString();
          }
          
          // Ensure patientGender is one of the expected values
          if (key === 'patientGender' && value) {
            const validGenders = ['Male', 'Female', 'Other'];
            if (!validGenders.includes(value)) {
              console.warn(`[MedicalCertificates] Invalid gender: ${value}, using default`);
              value = 'Other';
            }
          }
          
          // Skip empty required fields that might cause validation errors
          if (key === 'patientId' && (!value || value.trim() === '')) {
            console.warn('[MedicalCertificates] Skipping empty patientId');
            return;
          }
          
          if (value && value.trim() !== '') {
            formDataToSend.append(key, value);
          }
        }
      });
      
      // Add digital signature file if selected
      if (formData.digitalSignature) {
        formDataToSend.append('digitalSignature', formData.digitalSignature);
      }
      
      // Debug: Log what's being sent
      console.log('[MedicalCertificates] FormData contents:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`  ${key}:`, value);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/medical-certificates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formDataToSend
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Medical certificate created successfully!');
        
        // Save new entries to options for future use
        if (formData.diagnosis) addToOptions('diagnosis', formData.diagnosis);
        if (formData.symptoms) addToOptions('symptoms', formData.symptoms);
        if (formData.treatment) addToOptions('treatment', formData.treatment);
        if (formData.workRestriction) addToOptions('workRestriction', formData.workRestriction);
        if (formData.restPeriod) addToOptions('restPeriod', formData.restPeriod);
        if (formData.recommendations) addToOptions('recommendations', formData.recommendations);
        
        setFormData({
          patientId: '',
          patientDisplayId: '',
          patientName: '',
          patientAge: '',
          patientGender: '',
          patientAddress: '',
          patientPhone: '',
          diagnosis: '',
          symptoms: '',
          treatment: '',
          prescription: '',
          recommendations: '',
          followUpDate: '',
          restPeriod: '',
          workRestriction: '',
          certificateType: 'Medical Certificate',
          validFrom: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          clinicName: clinic?.fullName || clinic?.name || 'New Life Medium Clinic PLC',
          clinicAddress: clinic?.address || 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia',
          clinicPhone: clinic?.contactPhone || '+251925959219',
          clinicLicense: clinic?.licenseNumber || 'CL-001',
          notes: '',
          digitalSignature: null,
          caregiverName: '',
          caregiverRelation: '',
          caregiverPhone: '',
          caregiverIdNumber: ''
        });
        setSelectedPatient(null);
        setActiveTab('list');
        loadCertificates();
      } else if (response.status === 401) {
        console.error('[MedicalCertificates] 401 Unauthorized for certificate creation');
        toast.error('Session expired. Please log in again.');
        clearAuthData();
        window.location.href = '/login';
      } else {
        console.error('[MedicalCertificates] Certificate creation error:', response.status, response.statusText);
        console.error('[MedicalCertificates] Error response:', result);
        
        // Show more detailed error message
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessages = result.errors.map((err: any) => err.msg || err.message).join(', ');
          toast.error(`Validation errors: ${errorMessages}`);
        } else if (result.message) {
          toast.error(result.message);
        } else {
          toast.error('Error creating certificate. Please check all required fields.');
        }
      }
    } catch (error) {
      console.error('[MedicalCertificates] Error creating certificate:', error);
      handleAuthError(error);
      toast.error('Network error creating certificate');
    } finally {
      setLoading(false);
    }
  };

  const printCertificate = async (certificateId: string) => {
    try {
      // Check authentication status
      if (!isAuthenticated()) {
        toast.error('Authentication required. Please log in.');
        return;
      }

      // Get authentication token
      const token = getAuthToken();
      if (!token) {
        toast.error('No valid authentication token found. Please log in.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/medical-certificates/print/${certificateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const certificateData = result.data;
        
        // Debug: Log the certificate data to see what we're getting
        console.log('Certificate data for print:', certificateData);
        console.log('Digital signature data:', certificateData.digitalSignature);
        
        // Convert signature image to base64 if it exists
        let signatureBase64: string | null = null;
        if (certificateData.digitalSignature && certificateData.digitalSignature.filename) {
          try {
            const signatureResponse = await fetch(`http://localhost:5002/uploads/signatures/${certificateData.digitalSignature.filename}`);
            if (signatureResponse.ok) {
              const signatureBlob = await signatureResponse.blob();
              const reader = new FileReader();
              signatureBase64 = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(signatureBlob);
              });
              console.log('Signature converted to base64 successfully');
            }
          } catch (error) {
            console.error('Error converting signature to base64:', error);
          }
        }
        
        // Fallback: use the doctor's global profile digital signature if no per-certificate signature
        if (!signatureBase64 && (user as any)?.digitalSignature) {
          signatureBase64 = (user as any).digitalSignature;
          console.log('Using doctor profile digital signature as fallback');
        }

        
        // Open print window with certificate data
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
          // Dynamic narrative generation based on certificate type
          const certType = certificateData.certificateType || 'Medical Certificate';
          const patientName = certificateData.patient.name || 'N/A';
          const patientAge = certificateData.patient.age || 'N/A';
          const patientGender = certificateData.patient.gender || 'N/A';
          const patientAddress = certificateData.patient.address || 'N/A';
          const patientId = certificateData.patient.id || 'N/A';
          const diagnosis = certificateData.medical.diagnosis || 'N/A';
          const restPeriod = certificateData.medical.restPeriod || 'N/A';
          const validFrom = certificateData.validFrom || 'N/A';
          const validUntil = certificateData.validUntil || 'N/A';
          
          let narrativeText = '';
          if (certType === 'Caregiver Leave Certificate') {
            const caregiverName = certificateData.caregiver?.name || 'N/A';
            const caregiverRelation = certificateData.caregiver?.relation || 'N/A';
            const caregiverIdNumber = certificateData.caregiver?.idNumber ? `, ID No: ${certificateData.caregiver.idNumber}` : '';
            narrativeText = `This is to certify that the patient <strong>${patientName}</strong> (Patient ID: ${patientId}, Age: ${patientAge}, Gender: ${patientGender}) has been clinically examined at our medical center. Due to the patient's medical condition (diagnosed as <strong>${diagnosis}</strong>), the patient requires constant nursing supervision and supportive care. It is therefore certified that the patient's caregiver, <strong>${caregiverName}</strong> (Relationship: <strong>${caregiverRelation}</strong>${caregiverIdNumber}), is required to attend to and care for the patient. It is recommended that the caregiver be excused from duties/work for a rest and nursing leave period of <strong>${restPeriod}</strong>, effective from <strong>${validFrom}</strong> to <strong>${validUntil}</strong>.`;
          } else if (certType === 'Sick Leave Certificate') {
            narrativeText = `This is to certify that <strong>${patientName}</strong> (Patient ID: ${patientId}, Age: ${patientAge}, Gender: ${patientGender}) has been examined at our clinic. The patient is diagnosed with <strong>${diagnosis}</strong> and is medically unfit to perform regular duties. Complete rest is required for a period of <strong>${restPeriod}</strong>, effective from <strong>${validFrom}</strong> to <strong>${validUntil}</strong>, to facilitate proper clinical recovery.`;
          } else {
            const treatment = certificateData.medical.treatment ? ` and received treatment consisting of <strong>${certificateData.medical.treatment}</strong>` : '';
            const recommendations = certificateData.medical.recommendations ? ` Recommendations: <strong>${certificateData.medical.recommendations}</strong>.` : '';
            narrativeText = `This is to certify that <strong>${patientName}</strong> (Patient ID: ${patientId}, Age: ${patientAge}, Gender: ${patientGender}), residing at ${patientAddress}, was clinically evaluated at our medical center. The patient was diagnosed with <strong>${diagnosis}</strong>${treatment}.${recommendations}`;
          }

          // Build QR code URL
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://new-life-clinic.vercel.app/verify/certificate/' + certificateData.certificateNumber)}`;

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Medical Certificate - ${certificateData.certificateNumber}</title>
              <style>
                @page {
                  size: A5 portrait;
                  margin: 0;
                }
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  margin: 0; 
                  padding: 8mm; 
                  background-color: white;
                  color: #2d3748;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  font-size: 11px;
                  line-height: 1.4;
                }
                .certificate-frame {
                  position: relative;
                  width: 100%;
                  height: auto;
                  min-height: 194mm;
                  box-sizing: border-box;
                  border: 4px double #1a365d;
                  padding: 12px;
                  display: flex;
                  flex-direction: column;
                }
                .watermark-bg {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 75mm;
                  height: 75mm;
                  z-index: 0;
                  pointer-events: none;
                  opacity: 0.035;
                }
                .clinic-header {
                  position: relative;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 2px solid #1a365d;
                  padding-bottom: 6px;
                  margin-bottom: 8px;
                  z-index: 1;
                }
                .clinic-logo {
                  height: 38px;
                  width: auto;
                  object-fit: contain;
                  border-radius: 4px;
                }
                .clinic-details {
                  text-align: left;
                  flex-grow: 1;
                  padding-left: 10px;
                }
                .clinic-details h1 {
                  font-family: Georgia, serif;
                  font-size: 14px;
                  font-weight: bold;
                  color: #1a365d;
                  margin: 0 0 2px 0;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .clinic-details p {
                  font-size: 8px;
                  color: #4a5568;
                  margin: 0;
                  line-height: 1.3;
                }
                .clinic-meta-right {
                  text-align: right;
                  font-size: 8px;
                  color: #4a5568;
                  line-height: 1.3;
                }
                .certificate-title-container {
                  text-align: center;
                  margin: 8px 0;
                  z-index: 1;
                }
                .certificate-title-container h2 {
                  font-family: Georgia, serif;
                  font-size: 13px;
                  font-weight: bold;
                  color: #1a365d;
                  text-transform: uppercase;
                  margin: 0;
                  letter-spacing: 1.5px;
                  display: inline-block;
                  border-bottom: 1.5px solid #d69e2e;
                  padding-bottom: 1px;
                }
                .meta-info-bar {
                  display: flex;
                  justify-content: space-between;
                  background-color: #f7fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 4px;
                  padding: 5px 8px;
                  margin-bottom: 8px;
                  font-size: 8.5px;
                  z-index: 1;
                }
                .meta-info-item strong {
                  color: #1a365d;
                }
                .narrative-block {
                  font-size: 10.5px;
                  line-height: 1.5;
                  text-align: justify;
                  margin-bottom: 10px;
                  color: #2d3748;
                  z-index: 1;
                  text-indent: 15px;
                }
                .narrative-block strong {
                  color: #1a365d;
                }
                .details-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 8px;
                  margin-bottom: 8px;
                  z-index: 1;
                }
                .details-card {
                  border: 1px solid #e2e8f0;
                  border-radius: 4px;
                  background-color: #fff;
                  padding: 6px;
                }
                .details-card h3 {
                  font-size: 9px;
                  font-weight: bold;
                  color: #1a365d;
                  margin: 0 0 4px 0;
                  text-transform: uppercase;
                  border-bottom: 1px solid #e2e8f0;
                  padding-bottom: 1px;
                  letter-spacing: 0.5px;
                }
                .details-row {
                  display: flex;
                  margin-bottom: 3px;
                  font-size: 8.5px;
                  line-height: 1.2;
                }
                .details-row:last-child {
                  margin-bottom: 0;
                }
                .details-row .label {
                  font-weight: bold;
                  color: #4a5568;
                  width: 80px;
                  flex-shrink: 0;
                }
                .details-row .val {
                  color: #1a202c;
                  word-break: break-word;
                }
                .notes-card {
                  border: 1px dashed #cbd5e0;
                  border-radius: 4px;
                  padding: 4px 6px;
                  margin-bottom: 8px;
                  z-index: 1;
                }
                .notes-card h3 {
                  font-size: 8.5px;
                  font-weight: bold;
                  color: #4a5568;
                  margin: 0 0 2px 0;
                  text-transform: uppercase;
                }
                .notes-card p {
                  font-size: 8px;
                  color: #2d3748;
                  margin: 0;
                  white-space: pre-wrap;
                }
                .footer-signature-section {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  margin-top: auto;
                  padding-top: 8px;
                  border-top: 1px solid #e2e8f0;
                  z-index: 1;
                }
                .doctor-info-block {
                  text-align: left;
                  max-width: 60%;
                }
                .signature-box {
                  margin-top: 3px;
                  margin-bottom: 3px;
                }
                .signature-image {
                  max-height: 38px;
                  max-width: 120px;
                  mix-blend-mode: multiply;
                }
                .signature-placeholder {
                  height: 38px;
                  border-bottom: 1px solid #718096;
                  width: 120px;
                  margin-bottom: 3px;
                }
                .doctor-name-title {
                  font-size: 9px;
                  font-weight: bold;
                  color: #1a365d;
                  margin: 0;
                }
                .doctor-license {
                  font-size: 8px;
                  color: #718096;
                  margin: 0;
                }
                .security-verification-block {
                  display: flex;
                  align-items: center;
                  border: 1px solid #e2e8f0;
                  border-radius: 4px;
                  padding: 4px;
                  background-color: #f7fafc;
                  max-width: 150px;
                }
                .qr-code-img {
                  width: 44px;
                  height: 44px;
                  flex-shrink: 0;
                }
                .qr-details {
                  margin-left: 5px;
                  font-size: 6.5px;
                  color: #718096;
                  line-height: 1.2;
                }
                .qr-details strong {
                  color: #1a365d;
                  font-size: 7px;
                }
                @media print {
                  body {
                    padding: 0;
                    margin: 4mm;
                    color: #000 !important;
                  }
                  .certificate-frame {
                    border-color: #000 !important;
                    min-height: 186mm;
                  }
                  .clinic-header {
                    border-bottom-color: #000 !important;
                  }
                  .clinic-details h1,
                  .clinic-details p,
                  .clinic-meta-right,
                  .certificate-title-container h2,
                  .meta-info-item,
                  .meta-info-item strong,
                  .narrative-block,
                  .narrative-block strong,
                  .details-card h3,
                  .details-row,
                  .details-row .label,
                  .details-row .val,
                  .notes-card h3,
                  .notes-card p,
                  .doctor-name-title,
                  .doctor-license,
                  .qr-details,
                  .qr-details strong {
                    color: #000 !important;
                  }
                  .certificate-title-container h2 {
                    border-bottom-color: #000 !important;
                  }
                  .meta-info-bar {
                    background-color: #fff !important;
                    border-color: #000 !important;
                  }
                  .details-card {
                    border-color: #000 !important;
                    background-color: #fff !important;
                  }
                  .details-card h3 {
                    border-bottom-color: #000 !important;
                  }
                  .notes-card {
                    border-color: #000 !important;
                    background-color: #fff !important;
                  }
                  .footer-signature-section {
                    border-top-color: #000 !important;
                  }
                  .security-verification-block {
                    background-color: #fff !important;
                    border-color: #000 !important;
                  }
                  .watermark-bg {
                    opacity: 0.08 !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="certificate-frame">
                <!-- Medical Emblem Watermark -->
                <svg class="watermark-bg" viewBox="0 0 24 24">
                  <path fill="#1a365d" d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z"/>
                </svg>

                <!-- Clinic Letterhead Header -->
                <div class="clinic-header">
                  <img src="${clinic?.logo || "/assets/images/logo.jpg"}" alt="Logo" class="clinic-logo" onerror="this.style.display='none'">
                  <div class="clinic-details">
                    <h1>${certificateData.clinic.name || 'New Life Medium Clinic PLC'}</h1>
                    <p>Primary Healthcare & Specialty Clinical Services</p>
                    <p>📍 ${certificateData.clinic.address || 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia'}</p>
                  </div>
                  <div class="clinic-meta-right">
                    📞 ${certificateData.clinic.phone || '+251925959219'}<br>
                    🪪 License: ${certificateData.clinic.license || 'CL-001'}
                  </div>
                </div>

                <!-- Certificate Title -->
                <div class="certificate-title-container">
                  <h2>${certType}</h2>
                </div>

                <!-- Meta Information Bar -->
                <div class="meta-info-bar">
                  <div class="meta-info-item">
                    <strong>Ref No:</strong> ${certificateData.certificateNumber}
                  </div>
                  <div class="meta-info-item">
                    <strong>Date Issued:</strong> ${certificateData.dateIssued}
                  </div>
                  <div class="meta-info-item">
                    <strong>Valid Until:</strong> ${certificateData.validUntil}
                  </div>
                  <div class="meta-info-item">
                    <strong>Status:</strong> <span style="color: #2f855a; font-weight: bold;">Verified</span>
                  </div>
                </div>

                <!-- Certification Narrative Paragraph -->
                <div class="narrative-block">
                  ${narrativeText}
                </div>

                <!-- Structured details section -->
                <div class="details-grid">
                  <!-- Patient & Caregiver details card -->
                  <div class="details-card">
                    <h3>Subject Details</h3>
                    <div class="details-row">
                      <span class="label">Patient Name:</span>
                      <span class="val">${patientName}</span>
                    </div>
                    <div class="details-row">
                      <span class="label">Age / Gender:</span>
                      <span class="val">${patientAge} yrs / ${patientGender}</span>
                    </div>
                    <div class="details-row">
                      <span class="label">Address / Phone:</span>
                      <span class="val">${patientAddress} / ${certificateData.patient.phone || 'N/A'}</span>
                    </div>
                    ${certType === 'Caregiver Leave Certificate' ? `
                      <div style="margin-top: 5px; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
                        <div class="details-row">
                          <span class="label">Caregiver Name:</span>
                          <span class="val">${certificateData.caregiver?.name || 'N/A'}</span>
                        </div>
                        <div class="details-row">
                          <span class="label">Relationship:</span>
                          <span class="val">${certificateData.caregiver?.relation || 'N/A'}</span>
                        </div>
                        <div class="details-row">
                          <span class="label">Contact / ID:</span>
                          <span class="val">${certificateData.caregiver?.phone || 'N/A'} / ${certificateData.caregiver?.idNumber || 'N/A'}</span>
                        </div>
                      </div>
                    ` : ''}
                  </div>

                  <!-- Clinical Details Card -->
                  <div class="details-card">
                    <h3>Clinical Records</h3>
                    <div class="details-row">
                      <span class="label">Diagnosis:</span>
                      <span class="val">${diagnosis}</span>
                    </div>
                    ${certificateData.medical.symptoms ? `
                      <div class="details-row">
                        <span class="label">Key Symptoms:</span>
                        <span class="val">${certificateData.medical.symptoms}</span>
                      </div>
                    ` : ''}
                    ${certificateData.medical.treatment ? `
                      <div class="details-row">
                        <span class="label">Treatment Plan:</span>
                        <span class="val">${certificateData.medical.treatment}</span>
                      </div>
                    ` : ''}
                    ${certificateData.medical.recommendations ? `
                      <div class="details-row">
                        <span class="label">Recommendations:</span>
                        <span class="val">${certificateData.medical.recommendations}</span>
                      </div>
                    ` : ''}
                    ${certificateData.medical.followUpDate ? `
                      <div class="details-row">
                        <span class="label">Follow-up Date:</span>
                        <span class="val">${certificateData.medical.followUpDate}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <!-- Prescription (if exists) -->
                ${certificateData.medical.prescription ? `
                  <div class="details-card" style="margin-bottom: 8px;">
                    <h3 style="font-size: 8.5px; color: #d69e2e; border-bottom-color: #f6e05e;">Prescribed Medication (Rx)</h3>
                    <p style="font-size: 8.5px; margin: 2px 0 0 0; color: #2d3748; white-space: pre-wrap;">${certificateData.medical.prescription}</p>
                  </div>
                ` : ''}

                <!-- Additional Notes (if exists) -->
                ${certificateData.notes ? `
                  <div class="notes-card">
                    <h3>Additional Physician Notes</h3>
                    <p>${certificateData.notes}</p>
                  </div>
                ` : ''}

                <!-- Footer / Signatures -->
                <div class="footer-signature-section">
                  <!-- Doctor Signature details -->
                  <div class="doctor-info-block">
                    <p style="margin: 0; font-size: 8px; color: #718096; text-transform: uppercase;">Attending Practitioner</p>
                    <div class="signature-box">
                      ${signatureBase64 ? `
                        <img src="${signatureBase64}" alt="Doctor Signature" class="signature-image">
                      ` : `
                        <div class="signature-placeholder"></div>
                      `}
                    </div>
                    <h4 class="doctor-name-title">Dr. ${certificateData.doctor.name}</h4>
                    <p class="doctor-license">${certificateData.doctor.specialization || 'General Practitioner'} | Lic: ${certificateData.doctor.licenseNumber}</p>
                  </div>

                  <!-- Security Verification block -->
                  <div class="security-verification-block">
                    <img src="${qrCodeUrl}" alt="Verification QR" class="qr-code-img">
                    <div class="qr-details">
                      <strong>SECURE VERIFY</strong><br>
                      Scan QR code to verify this medical record online.<br>
                      <em>System Ref: ${certificateData.certificateNumber}</em>
                    </div>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `);
          
          printWindow.document.close();
          
          // Wait for content to load before printing
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
              
              // Close window after a delay to allow print dialog to open
              setTimeout(() => {
                printWindow.close();
              }, 1000);
            } catch (printError) {
              console.error('Error during print:', printError);
              toast.error('Print dialog could not be opened');
            }
          }, 500);
        } else {
          toast.error('Could not open print window. Please check your popup blocker.');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Error loading certificate for printing');
      }
    } catch (error) {
      console.error('Error printing certificate:', error);
      toast.error('Network error. Please check your connection.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-muted-foreground">Medical Certificates</h1>
        <p className="text-muted-foreground mt-2">Create and manage medical certificates for patients</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="border-b border-border/30">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'form', label: 'Create Certificate' },
              { id: 'list', label: 'View Certificates' },
              { id: 'stats', label: 'Statistics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Form Tab */}
      {activeTab === 'form' && (
        <div className="bg-primary-foreground rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingCertificateId ? 'Edit Medical Certificate' : 'Create Medical Certificate'}
            </h2>
            {editingCertificateId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-1.5 text-sm border border-border/40 rounded-md hover:bg-muted/10 text-muted-foreground"
              >
                Cancel edit
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Information */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Patient Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div ref={searchContainerRef} className="relative">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Patient Search
                  </label>
                  <div className="relative flex items-center">
                    {/* Search Icon */}
                    <div className="absolute left-3 text-muted-foreground/50">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setIsDropdownOpen(true);
                        if (!searchTerm.trim()) {
                          loadRecentPatients();
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Search by name, ID, or phone..."
                      className="w-full pl-10 pr-10 py-2.5 border border-border/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-primary-foreground text-foreground placeholder-muted-foreground/60 transition-all shadow-sm"
                    />

                    {/* Clear or Spinner Icon */}
                    <div className="absolute right-3 flex items-center gap-1">
                      {patientSearchLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                      ) : searchTerm ? (
                        <button
                          type="button"
                          onClick={() => {
                            clearSearch();
                            setIsDropdownOpen(false);
                          }}
                          className="p-1 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20 rounded-full transition-colors"
                          title="Clear search"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Dropdown Results Card */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-primary-foreground/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl z-[100] max-h-80 overflow-y-auto overflow-x-hidden transition-all duration-200">
                      {/* Search Results */}
                      {searchTerm.trim() ? (
                        patients.length > 0 ? (
                          <div className="py-1 divide-y divide-border/20">
                            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider bg-muted/5">
                              Search Results
                            </div>
                            {patients.map((patient, index) => (
                              <div
                                key={patient._id}
                                onClick={() => selectPatient(patient)}
                                onMouseEnter={() => setFocusedPatientIndex(index)}
                                className={`px-4 py-3 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-1 transition-colors ${
                                  focusedPatientIndex === index 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'hover:bg-muted/5'
                                }`}
                              >
                                <div>
                                  <div className="font-semibold text-foreground">
                                    {patient.firstName} {patient.lastName}
                                  </div>
                                  <div className="text-xs text-muted-foreground/80 mt-0.5 font-mono">
                                    ID: {patient.patientId || 'N/A'}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 md:mt-0 text-xs">
                                  <span className="px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                                    {patient.gender}
                                  </span>
                                  <span className="px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                                    {patient.age} yrs
                                  </span>
                                  {patient.contactNumber && (
                                    <span className="px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                                      📞 {patient.contactNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          !patientSearchLoading && (
                            <div className="p-6 text-center text-muted-foreground">
                              <svg className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="font-medium text-sm">No patients found</p>
                              <p className="text-xs text-muted-foreground/80 mt-1">Try a different name, ID, or phone number</p>
                            </div>
                          )
                        )
                      ) : (
                        /* Recent Patients / Suggestions when empty */
                        recentPatients.length > 0 ? (
                          <div className="py-1 divide-y divide-border/20">
                            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider bg-muted/5 flex items-center justify-between">
                              <span>Recent Patients</span>
                              <span className="text-[10px] text-muted-foreground/50 lowercase normal-case">quick select</span>
                            </div>
                            {recentPatients.map((patient, index) => (
                              <div
                                key={patient._id}
                                onClick={() => selectPatient(patient)}
                                onMouseEnter={() => setFocusedPatientIndex(index)}
                                className={`px-4 py-3 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-1 transition-colors ${
                                  focusedPatientIndex === index 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'hover:bg-muted/5'
                                }`}
                              >
                                <div>
                                  <div className="font-semibold text-foreground">
                                    {patient.firstName} {patient.lastName}
                                  </div>
                                  <div className="text-xs text-muted-foreground/80 mt-0.5 font-mono">
                                    ID: {patient.patientId || 'N/A'}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 md:mt-0 text-xs">
                                  <span className="px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                                    {patient.gender}
                                  </span>
                                  <span className="px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                                    {patient.age} yrs
                                  </span>
                                  {patient.contactNumber && (
                                    <span className="px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                                      📞 {patient.contactNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            Type to search for patients in the system.
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Patient ID
                  </label>
                  <input
                    type="text"
                    value={formData.patientDisplayId}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientDisplayId: e.target.value }))}
                    placeholder="Auto-filled when patient is selected"
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-muted/10"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    value={formData.patientAge}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientAge: e.target.value }))}
                    required
                    min="0"
                    max="150"
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.patientGender}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientGender: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.patientPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Address *
                </label>
                <textarea
                  value={formData.patientAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, patientAddress: e.target.value }))}
                  required
                  rows={2}
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Caregiver Information (conditionally rendered) */}
            {formData.certificateType === 'Caregiver Leave Certificate' && (
              <div className="border rounded-lg p-4 bg-muted/5 border-primary/20">
                <h3 className="text-lg font-medium mb-4 text-primary flex items-center gap-2">
                  <span>Caregiver / Parent Information</span>
                  <span className="text-xs font-normal text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">Required for nursing leave</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Caregiver Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.caregiverName}
                      onChange={(e) => setFormData(prev => ({ ...prev, caregiverName: e.target.value }))}
                      required={formData.certificateType === 'Caregiver Leave Certificate'}
                      placeholder="e.g. Mother's or Father's Name"
                      className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Relationship to Patient *
                    </label>
                    <select
                      value={formData.caregiverRelation}
                      onChange={(e) => setFormData(prev => ({ ...prev, caregiverRelation: e.target.value }))}
                      required={formData.certificateType === 'Caregiver Leave Certificate'}
                      className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Relation</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Caregiver Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.caregiverPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, caregiverPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Caregiver ID Number (National ID / Passport)
                    </label>
                    <input
                      type="text"
                      value={formData.caregiverIdNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, caregiverIdNumber: e.target.value }))}
                      placeholder="Optional identification number"
                      className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Medical Information */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Medical Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Certificate Type *
                  </label>
                  <select
                    value={formData.certificateType}
                    onChange={(e) => setFormData(prev => ({ ...prev, certificateType: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Medical Certificate">Medical Certificate</option>
                    <option value="Sick Leave Certificate">Sick Leave Certificate</option>
                    <option value="Fitness Certificate">Fitness Certificate</option>
                    <option value="Treatment Certificate">Treatment Certificate</option>
                    <option value="Caregiver Leave Certificate">Caregiver Leave Certificate</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Diagnosis *
                    {formData.diagnosis && !diagnosisOptions.includes(formData.diagnosis) && (
                      <span className="ml-2 text-xs text-primary font-normal">
                        ✨ New entry - will be saved for future use
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                    list="diagnosis-options"
                    required
                    placeholder="Type or select diagnosis..."
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="diagnosis-options">
                    {diagnosisOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Symptoms
                    {formData.symptoms && !symptomsOptions.includes(formData.symptoms) && (
                      <span className="ml-2 text-xs text-primary font-normal">
                        ✨ New entry - will be saved for future use
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.symptoms}
                    onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                    list="symptoms-options"
                    placeholder="Type or select symptoms..."
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="symptoms-options">
                    {symptomsOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Treatment
                    {formData.treatment && !treatmentOptions.includes(formData.treatment) && (
                      <span className="ml-2 text-xs text-primary font-normal">
                        ✨ New entry - will be saved for future use
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.treatment}
                    onChange={(e) => setFormData(prev => ({ ...prev, treatment: e.target.value }))}
                    list="treatment-options"
                    placeholder="Type or select treatment..."
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="treatment-options">
                    {treatmentOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Prescription
                  </label>
                  <textarea
                    value={formData.prescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, prescription: e.target.value }))}
                    rows={3}
                    placeholder="List prescribed medications..."
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Recommendations
                    {formData.recommendations && !recommendationsOptions.includes(formData.recommendations) && (
                      <span className="ml-2 text-xs text-primary font-normal">
                        ✨ New entry - will be saved for future use
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.recommendations}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                    list="recommendations-options"
                    placeholder="Type or select recommendations..."
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="recommendations-options">
                    {recommendationsOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Rest Period
                      {formData.restPeriod && !restPeriodOptions.includes(formData.restPeriod) && (
                        <span className="ml-2 text-xs text-primary font-normal">
                          ✨ New entry - will be saved for future use
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.restPeriod}
                      onChange={(e) => setFormData(prev => ({ ...prev, restPeriod: e.target.value }))}
                      list="rest-period-options"
                      placeholder="Type or select rest period..."
                      className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="rest-period-options">
                      {restPeriodOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Work Restrictions
                      {formData.workRestriction && !workRestrictionOptions.includes(formData.workRestriction) && (
                        <span className="ml-2 text-xs text-primary font-normal">
                          ✨ New entry - will be saved for future use
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.workRestriction}
                      onChange={(e) => setFormData(prev => ({ ...prev, workRestriction: e.target.value }))}
                      list="work-restriction-options"
                      placeholder="Type or select work restrictions..."
                      className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="work-restriction-options">
                      {workRestrictionOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Validity Period */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Certificate Validity</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Additional Notes</h3>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any additional notes or comments..."
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Digital Signature */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">Digital Signature</h3>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Upload Doctor Signature
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border/40 border-dashed rounded-md hover:border-border/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-muted-foreground/50"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-muted-foreground">
                      <label
                        htmlFor="signature-upload"
                        className="relative cursor-pointer bg-primary-foreground rounded-md font-medium text-primary hover:text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload signature image</span>
                        <input
                          id="signature-upload"
                          name="signature-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFormData(prev => ({ ...prev, digitalSignature: file }));
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF up to 2MB
                    </p>
                    {formData.digitalSignature && (
                      <div className="mt-2">
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-sm text-primary">
                            ✓ {formData.digitalSignature.name} selected
                          </p>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, digitalSignature: null }))}
                            className="text-destructive hover:text-destructive text-sm font-medium underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-2 relative">
                          <img
                            src={URL.createObjectURL(formData.digitalSignature)}
                            alt="Signature preview"
                            className="mx-auto h-20 w-auto border rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, digitalSignature: null }))}
                            className="absolute -top-2 -right-2 bg-destructive text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive transition-colors"
                            title="Remove signature"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              {editingCertificateId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-2 border border-border/40 rounded-md hover:bg-muted/10 text-muted-foreground"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (editingCertificateId ? 'Updating...' : 'Creating...')
                  : (editingCertificateId ? 'Update Certificate' : 'Create Certificate')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Tab */}
      {activeTab === 'list' && (
        <div className="bg-primary-foreground rounded-lg shadow">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Medical Certificates</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={certificateSearchTerm}
                      onChange={(e) => setCertificateSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          // Search is already live, just prevent form submission
                          e.preventDefault();
                        }
                      }}
                      placeholder="Search certificates..."
                      className="pl-10 pr-4 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg
                      className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Clear search when button is clicked
                      setCertificateSearchTerm('');
                    }}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10 transition-colors"
                    title="Clear search"
                  >
                    Clear
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredCertificates.length} of {certificates.length} certificates
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading certificates...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Certificate #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Patient Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Patient ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Diagnosis
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date Issued
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Valid Until
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-primary-foreground divide-y divide-gray-200">
                    {filteredCertificates.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center text-muted-foreground">
                          {certificateSearchTerm ? 'No certificates match your search' : 'No certificates found'}
                        </td>
                      </tr>
                    ) : (
                      currentCertificates.map((cert) => (
                        <tr key={cert._id} className="hover:bg-muted/10">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                            {cert.certificateNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {cert.patientName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {cert.patientDisplayId || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {cert.certificateType}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {cert.diagnosis}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(cert.dateIssued).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(cert.validUntil).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              cert.status === 'Issued' ? 'bg-primary/20 text-primary' :
                              cert.status === 'Draft' ? 'bg-accent/20 text-accent-foreground' :
                              cert.status === 'Cancelled' ? 'bg-destructive/20 text-destructive' :
                              'bg-muted/20 text-muted-foreground'
                            }`}>
                              {cert.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => loadCertificateForEdit(cert._id)}
                              className="text-primary hover:text-primary mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => printCertificate(cert._id)}
                              className="text-primary hover:text-primary"
                            >
                              Print
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {filteredCertificates.length > certificatesPerPage && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredCertificates.length)} of {filteredCertificates.length} certificates
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-border/40 rounded-md hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 text-sm border rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'border-border/40 hover:bg-muted/10'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-border/40 rounded-md hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="bg-primary-foreground rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Certificate Statistics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-primary/10 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Certificates</div>
            </div>
            
            <div className="bg-primary/10 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-primary">{stats.issued}</div>
              <div className="text-sm text-muted-foreground mt-1">Issued</div>
            </div>
            
            <div className="bg-accent/10 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-accent-foreground">{stats.draft}</div>
              <div className="text-sm text-muted-foreground mt-1">Drafts</div>
            </div>
            
            <div className="bg-destructive/10 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-destructive">{stats.cancelled}</div>
              <div className="text-sm text-muted-foreground mt-1">Cancelled</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalCertificates;
