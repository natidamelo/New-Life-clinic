import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { isAuthenticated, getAuthToken, getAuthHeaders, clearAuthData, handleAuthError } from '../../utils/authUtils';

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
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'stats'>('form');
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  
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
    digitalSignature: null as File | null
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
      const response = await fetch('/api/medical-certificates?limit=0', {
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

      const response = await fetch('/api/medical-certificates/stats', {
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

    setLoading(true);
    try {
      // Check authentication status
      if (!isAuthenticated()) {
        toast.error('Authentication required. Please log in.');
        setLoading(false);
        return;
      }

      // Get authentication headers
      const authHeaders = getAuthHeaders();
      if (!authHeaders.Authorization) {
        toast.error('No valid authentication token found. Please log in.');
        setLoading(false);
        return;
      }

      // Use the correct API endpoint with proper authentication
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(searchTerm)}&limit=10`, {
        method: 'GET',
        headers: authHeaders
      });

      if (response.ok) {
        const result = await response.json();
        setPatients(result.data || []);
        console.log(`[MedicalCertificates] Found ${result.data?.length || 0} patients`);
      } else if (response.status === 401) {
        console.error('[MedicalCertificates] 401 Unauthorized - authentication failed');
        toast.error('Session expired. Please log in again.');
        clearAuthData();
        window.location.href = '/login';
      } else {
        console.error('[MedicalCertificates] API error:', response.status, response.statusText);
        toast.error('Failed to search patients');
      }
    } catch (error) {
      console.error('[MedicalCertificates] Error searching patients:', error);
      handleAuthError(error);
      toast.error('Network error searching patients');
    } finally {
      setLoading(false);
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
    setSearchTerm(''); // Clear the search term
    setPatients([]); // Clear the search results
    toast.success('Patient information loaded');
  };

  const clearSearch = () => {
    setShowPatientSearch(false);
    setSearchTerm('');
    setPatients([]);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && patients.length > 0) {
      clearSearch();
    }
  };

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
      const response = await fetch(`/api/medical-certificates/${certificateId}`, {
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
        digitalSignature: null
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
      clinicName: 'New Life Medium Clinic PLC',
      clinicAddress: 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia',
      clinicPhone: '+251925959219',
      clinicLicense: 'CL-001',
      notes: '',
      digitalSignature: null
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
          notes: formData.notes || null
        };
        Object.keys(payload).forEach(k => {
          if (k === 'notes') return; // always send notes so Additional Notes edits persist
          if (payload[k] === null || payload[k] === '') delete payload[k];
        });
        const response = await fetch(`/api/medical-certificates/${editingCertificateId}`, {
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
      
      const response = await fetch('/api/medical-certificates', {
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
          clinicName: 'New Life Medium Clinic PLC',
          clinicAddress: 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia',
          clinicPhone: '+251925959219',
          clinicLicense: 'CL-001',
          notes: '',
          digitalSignature: null
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

      const response = await fetch(`/api/medical-certificates/print/${certificateId}`, {
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
        let signatureBase64 = null;
        if (certificateData.digitalSignature) {
          try {
            const signatureResponse = await fetch(`http://localhost:5002/uploads/signatures/${certificateData.digitalSignature.filename}`);
            if (signatureResponse.ok) {
              const signatureBlob = await signatureResponse.blob();
              const reader = new FileReader();
              signatureBase64 = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(signatureBlob);
              });
              console.log('Signature converted to base64 successfully');
            }
          } catch (error) {
            console.error('Error converting signature to base64:', error);
          }
        }
        
        // Open print window with certificate data
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Medical Certificate - ${certificateData.certificateNumber}</title>
              <style>
                @page {
                  size: A5 portrait;
                  margin: 5mm;
                }
                body { 
                  font-family: 'Arial', sans-serif; 
                  margin: 0; 
                  padding: 0; 
                  line-height: 1.5; 
                  background: white;
                  color: #333;
                  font-size: 15px;
                }
                .certificate-container {
                  width: 100%; /* Fill the page width */
                  max-width: 100%;
                  min-height: 200mm;
                  height: 100%;
                  margin: 0;
                  border: 3px solid #2c5aa0;
                  padding: 18px;
                  box-sizing: border-box;
                  box-shadow: none;
                  display: flex;
                  flex-direction: column;
                }
                .clinic-header { 
                  text-align: center;
                  margin-bottom: 15px; 
                  border-bottom: 3px solid #2c5aa0; 
                  padding-bottom: 12px; 
                }
                .clinic-header-content {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 18px;
                  margin-bottom: 10px;
                }
                .clinic-logo {
                  width: 70px;
                  height: 70px;
                  object-fit: contain;
                  flex-shrink: 0;
                }
                .clinic-name { 
                  font-size: 1.7rem; 
                  font-weight: 800; 
                  color: #2c5aa0; 
                  margin-bottom: 5px; 
                  text-transform: uppercase;
                  letter-spacing: 0.6px;
                }
                .document-title { 
                  font-size: 1.5rem; 
                  color: #333; 
                  margin-bottom: 8px; 
                  font-weight: 800;
                }
                .clinic-details { 
                  font-size: 1.05rem; 
                  color: #666; 
                  margin-bottom: 4px; 
                }
                .certificate-meta {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  background: #f8f9fa;
                  padding: 10px;
                  border-radius: 5px;
                  margin-bottom: 15px;
                  border-left: 4px solid #2c5aa0;
                }
                .meta-item {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                .meta-label {
                  font-size: 0.9rem;
                  color: #666;
                  font-weight: 500;
                  margin-bottom: 4px;
                }
                .meta-value {
                  font-size: 1rem;
                  color: #333;
                  font-weight: 600;
                }
                .status-badge {
                  background: #28a745;
                  color: white;
                  padding: 4px 12px;
                  border-radius: 14px;
                  font-size: 0.9rem;
                  font-weight: 600;
                }
                .certificate-section { 
                  margin-bottom: 12px; 
                  background: #fafafa;
                  padding: 12px;
                  border-radius: 5px;
                  border-left: 4px solid #2c5aa0;
                  flex-grow: 1;
                }
                .certificate-section h3 { 
                  font-size: 1.2rem; 
                  margin-bottom: 8px; 
                  color: #2c5aa0; 
                  border-bottom: 2px solid #e9ecef; 
                  padding-bottom: 5px; 
                  font-weight: 800;
                }
                .certificate-info { 
                  display: grid; 
                  grid-template-columns: 1fr 1fr; 
                  gap: 10px; 
                  margin-bottom: 8px; 
                }
                .info-item {
                  display: flex;
                  flex-direction: column;
                  margin-bottom: 5px;
                }
                .info-label {
                  font-weight: 800;
                  color: #2c5aa0;
                  font-size: 1rem;
                  margin-bottom: 3px;
                }
                .info-value {
                  color: #333;
                  font-size: 0.95rem;
                  padding: 2px 0;
                }
                .certificate-body {
                  flex-grow: 1;
                  display: flex;
                  flex-direction: column;
                }
                .certificate-footer { 
                  display: flex; 
                  justify-content: space-between; 
                  margin-top: auto;
                  padding-top: 15px; 
                  border-top: 2px solid #2c5aa0; 
                }
                .signature-section { 
                  text-align: center; 
                  flex: 1;
                  margin: 0 12px;
                  font-size: 1rem;
                }
                .signature-line { 
                  border-bottom: 2px solid #333; 
                  width: 150px; 
                  margin: 12px auto 4px; 
                  height: 1px;
                }
                .footer-info {
                  text-align: center;
                  margin-top: 12px;
                  padding-top: 8px;
                  border-top: 1px solid #ddd;
                  color: #666;
                  font-size: 0.85rem;
                }
                @media print { 
                  html, body { 
                    margin: 0; 
                    padding: 0; 
                    font-size: 13px;
                    width: 148mm; /* A5 portrait width (Half A4) */
                    height: 210mm; /* A5 portrait height */
                    color: black !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  * {
                    color: black !important;
                    border-color: black !important;
                  }
                  .certificate-container { 
                    box-shadow: none; 
                    border: 3px solid black !important; 
                    padding: 15px;
                    width: 100%;
                    min-height: auto;
                    height: auto;
                    box-sizing: border-box;
                    margin: 0;
                  }
                  /* Prevent sections from splitting across pages */
                  .clinic-header {
                    margin-bottom: 12px;
                    padding-bottom: 10px;
                    page-break-inside: avoid;
                    break-inside: avoid;
                  }
                  .clinic-header-content {
                    gap: 15px;
                    margin-bottom: 8px;
                  }
                  .clinic-logo {
                    width: 65px;
                    height: 65px;
                  }
                  .clinic-name {
                    font-size: 1.6rem;
                  }
                  .document-title {
                    font-size: 1.4rem;
                    margin-bottom: 6px;
                  }
                  .clinic-details {
                    font-size: 1rem;
                  }
                  .certificate-meta {
                    page-break-inside: avoid;
                    break-inside: avoid;
                  }
                  .certificate-section {
                    margin-bottom: 10px;
                    padding: 10px;
                    page-break-inside: avoid;
                    break-inside: avoid;
                  }
                  .certificate-section h3 {
                    font-size: 1.15rem;
                    margin-bottom: 6px;
                  }
                  .certificate-info {
                    gap: 8px;
                  }
                  .info-label {
                    font-size: 0.95rem;
                  }
                  .info-value {
                    font-size: 0.9rem;
                  }
                  .certificate-footer {
                    margin-top: auto;
                    padding-top: 12px;
                    page-break-inside: avoid;
                    break-inside: avoid;
                  }
                  .signature-section {
                    font-size: 0.95rem;
                  }
                  .footer-info { 
                    display: none !important; 
                  }
                  .clinic-name, .info-label, .document-title, h3 {
                    color: black !important;
                  }
                  .clinic-header { border-bottom-color: black !important; }
                  .certificate-meta { 
                    background: white !important; 
                    border-left-color: black !important; 
                  }
                  .certificate-section { 
                    background: white !important; 
                    border-left-color: black !important; 
                  }
                  .status-badge {
                    background: white !important;
                    color: black !important;
                    border: 1px solid black !important;
                  }
                  .clinic-details { color: black !important; }
                  .meta-label, .meta-value { color: black !important; }
                }
              </style>
            </head>
            <body>
              <div class="certificate-container">
                <div class="clinic-header">
                  <div class="clinic-header-content">
                    <img src="/assets/images/logo.jpg" alt="New Life Medium Clinic Logo" class="clinic-logo">
                    <div>
                      <div class="clinic-name">New Life Medium Clinic PLC</div>
                    </div>
                  </div>
                  <div class="document-title">Medical Certificate</div>
                  <div class="clinic-details">${certificateData.clinic.address || 'Lafto, beside Kebron Guest House, Addis Ababa, Ethiopia'}</div>
                  <div class="clinic-details">Phone: ${certificateData.clinic.phone || '+251925959219'} | License: ${certificateData.clinic.license || 'CL-001'}</div>
                </div>
                
                <div class="certificate-meta">
                  <div class="meta-item">
                    <div class="meta-label">Date</div>
                    <div class="meta-value">${certificateData.dateIssued}</div>
                  </div>
                  <div class="meta-item">
                    <div class="meta-label">Certificate Number</div>
                    <div class="meta-value">${certificateData.certificateNumber}</div>
                  </div>
                  <div class="meta-item">
                    <div class="meta-label">Type</div>
                    <div class="meta-value">${certificateData.certificateType || 'Medical Certificate'}</div>
                  </div>
                  <div class="meta-item">
                    <div class="meta-label">Valid Until</div>
                    <div class="meta-value">${certificateData.validUntil}</div>
                  </div>
                  <div class="meta-item">
                    <div class="meta-label">Status</div>
                    <div class="status-badge">Active</div>
                  </div>
                </div>
              <div class="certificate-body">
                <div class="certificate-section">
                  <h3>Patient Information</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 0.85rem;">
                    <div>
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">FULL NAME</div>
                      <div style="margin-bottom: 8px;">${certificateData.patient.name}</div>
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">AGE</div>
                      <div>${certificateData.patient.age || 'Not specified'}</div>
                    </div>
                    <div>
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">PATIENT ID</div>
                      <div style="margin-bottom: 8px;">${certificateData.patient.id || 'N/A'}</div>
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">GENDER</div>
                      <div>${certificateData.patient.gender || 'Not specified'}</div>
                    </div>
                    <div>
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">ADDRESS</div>
                      <div style="margin-bottom: 8px;">${certificateData.patient.address || 'Not specified'}</div>
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">PHONE</div>
                      <div>${certificateData.patient.phone || 'Not specified'}</div>
                    </div>
                  </div>
                </div>
                <div class="certificate-section">
                  <h3>Medical Information</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.85rem;">
                    <div>
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">DIAGNOSIS</div>
                      <div style="margin-bottom: 8px;">${certificateData.medical.diagnosis}</div>
                      ${certificateData.medical.symptoms ? `
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">SYMPTOMS</div>
                      <div style="margin-bottom: 8px;">${certificateData.medical.symptoms}</div>
                      ` : ''}
                      ${certificateData.medical.treatment ? `
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">TREATMENT</div>
                      <div style="margin-bottom: 8px;">${certificateData.medical.treatment}</div>
                      ` : ''}
                      ${certificateData.medical.prescription ? `
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">PRESCRIPTION</div>
                      <div>${certificateData.medical.prescription}</div>
                      ` : ''}
                    </div>
                    <div>
                      ${certificateData.medical.recommendations ? `
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">RECOMMENDATIONS</div>
                      <div style="margin-bottom: 8px;">${certificateData.medical.recommendations}</div>
                      ` : ''}
                      ${certificateData.medical.restPeriod ? `
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">REST PERIOD</div>
                      <div style="margin-bottom: 8px;">${certificateData.medical.restPeriod}</div>
                      ` : ''}
                      ${certificateData.medical.workRestriction ? `
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">WORK RESTRICTIONS</div>
                      <div style="margin-bottom: 8px;">${certificateData.medical.workRestriction}</div>
                      ` : ''}
                      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;" class="info-label">FOLLOW-UP DATE</div>
                      <div>${certificateData.medical.followUpDate || 'Not specified'}</div>
                    </div>
                  </div>
                </div>
                ${certificateData.notes ? `
                <div class="certificate-section">
                  <h3>Additional Notes</h3>
                  <p>${certificateData.notes}</p>
                </div>
                ` : ''}
              </div>
              <div class="certificate-footer">
                <div class="signature-section">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <div style="text-align: left;">
                      <div style="font-size: 0.8rem; font-weight: 600;" class="info-label">PRESCRIBER: Dr. ${certificateData.doctor.name}</div>
                      <div style="font-size: 0.75rem;">License: ${certificateData.doctor.licenseNumber}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 0.8rem; font-weight: 600;" class="info-label">DATE: ${certificateData.dateIssued}</div>
                      <div style="font-size: 0.75rem;">Specialization: ${certificateData.doctor.specialization || 'General Medicine'}</div>
                    </div>
                  </div>
                  ${signatureBase64 ? `
                  <div style="margin: 10px 0; text-align: center;">
                    <img src="${signatureBase64}" 
                         alt="Doctor Signature" 
                         style="max-height: 60px; max-width: 200px; border: 1px solid #ddd; background: white;"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; border-bottom: 1px solid #333; width: 150px; margin: 10px auto 3px; height: 1px;"></div>
                  </div>
                  ` : `
                  <div class="signature-line"></div>
                  `}
                  <p style="margin-top: 5px; font-weight: 600; font-size: 0.8rem;">DOCTOR SIGNATURE</p>
                </div>
              </div>
              
              <div class="footer-info">
                <p><strong>New Life Medium Clinic PLC - Medical Certificate System</strong></p>
                <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Valid for 30 days from issue date</p>
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
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Patient Search
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search by name, ID, or phone..."
                      className="flex-1 px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={searchPatients}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary"
                    >
                      Search
                    </button>
                  </div>
                  
                  {patients.length > 0 && (
                    <div className="mt-2 border rounded-md max-h-40 overflow-y-auto relative">
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground z-10"
                        title="Close search results"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {patients.map((patient) => (
                        <div
                          key={patient._id}
                          onClick={() => selectPatient(patient)}
                          className="p-2 hover:bg-muted/10 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {patient.patientId || 'N/A'} | Age: {patient.age} | Gender: {patient.gender} | Phone: {patient.contactNumber}
                          </div>
                        </div>
                      ))}
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
