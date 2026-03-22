import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  User, 
  Calendar, 
  FileText, 
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  Save,
  Eye,
  Loader
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatTime } from '../../utils/formatters';
import patientService from '../../services/patientService';
import referralService from '../../services/referralService';

interface PatientData {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  age?: number;
  gender: string;
  contactNumber?: string;
  phone?: string;
  address?: string;
  patientId?: string;
  medicalRecordNumber?: string;
}

interface ReferralData {
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  medicalRecordNumber: string;
  referringDoctor: string;
  referringClinic: string;
  referringPhone: string;
  referringEmail: string;
  referringAddress: string;
  referredToDoctor: string;
  referredToClinic: string;
  referredToPhone: string;
  referredToEmail: string;
  referredToAddress: string;
  referralDate: string;
  referralTime: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  medications: string;
  allergies: string;
  physicalExamination: string;
  diagnosis: string;
  reasonForReferral: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  requestedInvestigations: string;
  requestedTreatments: string;
  followUpInstructions: string;
  additionalNotes: string;
}

const EMRReferralPaper: React.FC = () => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData>({
    patientId: '',
    patientName: '',
    age: 0,
    gender: '',
    phone: '',
    address: '',
    medicalRecordNumber: '',
    referringDoctor: user?.name || '',
    referringClinic: 'New Life Medium Clinic',
    referringPhone: '215925959219',
    referringEmail: 'newlifemediumclinic@gmail.com',
    referringAddress: 'Lafto, Beside Kebron guest house',
    referredToDoctor: '',
    referredToClinic: '',
    referredToPhone: '',
    referredToEmail: '',
    referredToAddress: '',
    referralDate: formatDate(new Date().toISOString()),
    referralTime: formatTime(new Date().toISOString()),
    chiefComplaint: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    medications: '',
    allergies: '',
    physicalExamination: '',
    diagnosis: '',
    reasonForReferral: '',
    urgency: 'routine',
    requestedInvestigations: '',
    requestedTreatments: '',
    followUpInstructions: '',
    additionalNotes: ''
  });

  const [isPrinting, setIsPrinting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PatientData[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSavedReferrals, setShowSavedReferrals] = useState(false);
  const [savedReferrals, setSavedReferrals] = useState<any[]>([]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.patient-search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-save form data to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('referralFormData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setReferralData(prev => ({ ...prev, ...parsedData }));
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('referralFormData', JSON.stringify(referralData));
    }, 500); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [referralData]);

  const handleInputChange = (field: keyof ReferralData, value: string) => {
    setReferralData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePatientSearch = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const patients = await patientService.searchPatients(searchTerm);
      setSearchResults(patients as any);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePatientSelect = (patient: PatientData) => {
    const age = patient.age || calculateAge(patient.dateOfBirth || '');
    setReferralData(prev => ({
      ...prev,
      patientId: patient._id || patient.id || '',
      patientName: `${patient.firstName} ${patient.lastName}`,
      age: age,
      gender: patient.gender || '',
      phone: patient.contactNumber || patient.phone || '',
      address: patient.address || '',
      medicalRecordNumber: patient.patientId || patient.medicalRecordNumber || ''
    }));
    setSearchTerm(`${patient.firstName} ${patient.lastName}`);
    setShowSearchResults(false);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchTerm(value);
    handlePatientSearch(value);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleSaveReferral = async () => {
    // Validate required fields
    if (!referralData.patientId) {
      setSaveMessage({ type: 'error', text: 'Please select a patient' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (!referralData.patientName || referralData.patientName.trim() === '') {
      setSaveMessage({ type: 'error', text: 'Patient name is required' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (!referralData.age || referralData.age <= 0) {
      setSaveMessage({ type: 'error', text: 'Valid patient age is required' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (!referralData.gender) {
      setSaveMessage({ type: 'error', text: 'Patient gender is required' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (!referralData.referredToDoctor || referralData.referredToDoctor.trim() === '') {
      setSaveMessage({ type: 'error', text: 'Please enter referred to doctor name' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (!referralData.referredToClinic || referralData.referredToClinic.trim() === '') {
      setSaveMessage({ type: 'error', text: 'Please enter referred to clinic' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (!referralData.chiefComplaint || referralData.chiefComplaint.trim() === '') {
      setSaveMessage({ type: 'error', text: 'Please enter chief complaint' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (!referralData.diagnosis || referralData.diagnosis.trim() === '') {
      setSaveMessage({ type: 'error', text: 'Please enter diagnosis' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (!referralData.reasonForReferral || referralData.reasonForReferral.trim() === '') {
      setSaveMessage({ type: 'error', text: 'Please enter reason for referral' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setIsSaving(true);
    try {
      // Normalize gender to match backend expectations
      let normalizedGender = referralData.gender;
      if (normalizedGender) {
        normalizedGender = normalizedGender.charAt(0).toUpperCase() + normalizedGender.slice(1).toLowerCase();
        // Ensure it's one of the valid values
        if (!['Male', 'Female', 'Other'].includes(normalizedGender)) {
          if (normalizedGender.toLowerCase().includes('male')) {
            normalizedGender = 'Male';
          } else if (normalizedGender.toLowerCase().includes('female')) {
            normalizedGender = 'Female';
          } else {
            normalizedGender = 'Other';
          }
        }
      }

      const referralPayload = {
        patientId: referralData.patientId,
        patientName: referralData.patientName.trim(),
        patientAge: Number(referralData.age),
        patientGender: normalizedGender,
        patientAddress: referralData.address || '',
        patientPhone: referralData.phone || '',
        medicalRecordNumber: referralData.medicalRecordNumber || '',
        referredToDoctorName: referralData.referredToDoctor.trim(),
        referredToClinic: referralData.referredToClinic.trim(),
        referredToPhone: referralData.referredToPhone || '',
        referredToEmail: referralData.referredToEmail || '',
        referredToAddress: referralData.referredToAddress || '',
        referralDate: referralData.referralDate,
        referralTime: referralData.referralTime,
        urgency: referralData.urgency,
        chiefComplaint: referralData.chiefComplaint.trim(),
        historyOfPresentIllness: referralData.historyOfPresentIllness || '',
        pastMedicalHistory: referralData.pastMedicalHistory || '',
        medications: referralData.medications || '',
        allergies: referralData.allergies || '',
        physicalExamination: referralData.physicalExamination || '',
        diagnosis: referralData.diagnosis.trim(),
        reasonForReferral: referralData.reasonForReferral.trim(),
        requestedInvestigations: referralData.requestedInvestigations || '',
        requestedTreatments: referralData.requestedTreatments || '',
        followUpInstructions: referralData.followUpInstructions || '',
        additionalNotes: referralData.additionalNotes || '',
        status: 'Sent' as const
      };

      console.log('Sending referral payload:', referralPayload);

      const response = await referralService.createReferral(referralPayload);
      setSaveMessage({ type: 'success', text: `Referral saved successfully! Referral #: ${response.data?.referralNumber}` });
      setTimeout(() => setSaveMessage(null), 5000);
      
      // Clear form and localStorage
      localStorage.removeItem('referralFormData');
    } catch (error: any) {
      console.error('Error saving referral:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save referral';
      const errors = error.response?.data?.errors;
      let detailedMessage = errorMessage;
      if (errors && Array.isArray(errors)) {
        detailedMessage += ': ' + errors.map((e: any) => e.msg).join(', ');
      }
      setSaveMessage({ type: 'error', text: detailedMessage });
      setTimeout(() => setSaveMessage(null), 7000);
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedReferrals = async () => {
    try {
      const response = await referralService.getReferrals({ 
        limit: 50,
        doctorId: user?._id 
      });
      setSavedReferrals(response.data || []);
      setShowSavedReferrals(true);
    } catch (error) {
      console.error('Error loading saved referrals:', error);
      setSaveMessage({ type: 'error', text: 'Failed to load saved referrals' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const viewReferral = (referral: any) => {
    setReferralData({
      patientId: referral.patientId,
      patientName: referral.patientName,
      age: referral.patientAge,
      gender: referral.patientGender,
      phone: referral.patientPhone,
      address: referral.patientAddress,
      medicalRecordNumber: referral.medicalRecordNumber,
      referringDoctor: referral.referringDoctorName,
      referringClinic: referral.referringClinicName,
      referringPhone: referral.referringClinicPhone,
      referringEmail: referral.referringClinicEmail,
      referringAddress: referral.referringClinicAddress,
      referredToDoctor: referral.referredToDoctorName,
      referredToClinic: referral.referredToClinic,
      referredToPhone: referral.referredToPhone || '',
      referredToEmail: referral.referredToEmail || '',
      referredToAddress: referral.referredToAddress || '',
      referralDate: formatDate(referral.referralDate),
      referralTime: referral.referralTime,
      urgency: referral.urgency,
      chiefComplaint: referral.chiefComplaint,
      historyOfPresentIllness: referral.historyOfPresentIllness || '',
      pastMedicalHistory: referral.pastMedicalHistory || '',
      medications: referral.medications || '',
      allergies: referral.allergies || '',
      physicalExamination: referral.physicalExamination || '',
      diagnosis: referral.diagnosis,
      reasonForReferral: referral.reasonForReferral,
      requestedInvestigations: referral.requestedInvestigations || '',
      requestedTreatments: referral.requestedTreatments || '',
      followUpInstructions: referral.followUpInstructions || '',
      additionalNotes: referral.additionalNotes || ''
    });
    setShowSavedReferrals(false);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'urgent':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'routine':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return <AlertCircle className="w-4 h-4" />;
      case 'urgent':
        return <Clock className="w-4 h-4" />;
      case 'routine':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Controls */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border p-4 no-print">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referral Paper</h1>
            <p className="text-gray-600">Generate professional medical referral documents</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSaveReferral}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Referral</span>
                </>
              )}
            </button>
            <button
              onClick={loadSavedReferrals}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Eye className="w-4 h-4" />
              <span>View Saved</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Printing...' : 'Print'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mt-4 p-3 rounded-lg ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {saveMessage.text}
          </div>
        )}
      </div>

      {/* Saved Referrals Modal */}
      {showSavedReferrals && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Saved Referrals</h2>
                <button
                  onClick={() => setShowSavedReferrals(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {savedReferrals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No saved referrals found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedReferrals.map((referral) => (
                    <div
                      key={referral._id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => viewReferral(referral)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {referral.patientName}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              referral.urgency === 'emergency' 
                                ? 'bg-red-100 text-red-800'
                                : referral.urgency === 'urgent'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {referral.urgency?.toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              referral.status === 'Sent'
                                ? 'bg-blue-100 text-blue-800'
                                : referral.status === 'Received'
                                ? 'bg-purple-100 text-purple-800'
                                : referral.status === 'Completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {referral.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">
                                <strong>Referral #:</strong> {referral.referralNumber}
                              </p>
                              <p className="text-gray-600">
                                <strong>Date:</strong> {new Date(referral.referralDate).toLocaleDateString()}
                              </p>
                              <p className="text-gray-600">
                                <strong>Diagnosis:</strong> {referral.diagnosis}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">
                                <strong>Referred To:</strong> {referral.referredToDoctorName}
                              </p>
                              <p className="text-gray-600">
                                <strong>Clinic:</strong> {referral.referredToClinic}
                              </p>
                              <p className="text-gray-600">
                                <strong>Reason:</strong> {referral.reasonForReferral?.substring(0, 50)}...
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            viewReferral(referral);
                          }}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Referral Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 no-print">
        {/* Patient Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Patient Information
          </h2>
          <div className="space-y-4">
            {/* Patient Search */}
            <div className="relative patient-search-container">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Patient</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search patient by name..."
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((patient) => {
                    const age = patient.age || calculateAge(patient.dateOfBirth || '');
                    return (
                      <div
                        key={patient._id || patient.id}
                        onClick={() => handlePatientSelect(patient)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {age > 0 && `Age: ${age}`}
                          {patient.contactNumber && ` | Phone: ${patient.contactNumber}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {patient.patientId && `MR#: ${patient.patientId}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {showSearchResults && searchResults.length === 0 && !isSearching && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="px-4 py-3 text-gray-500 text-center">
                    No patients found
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <input
                  type="text"
                  value={referralData.patientName}
                  onChange={(e) => handleInputChange('patientName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  value={referralData.age || ''}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Age"
                  min="0"
                  max="150"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={referralData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={referralData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical Record Number</label>
                <input
                  type="text"
                  value={referralData.medicalRecordNumber}
                  onChange={(e) => handleInputChange('medicalRecordNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter medical record number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={referralData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Enter patient address"
              />
            </div>
          </div>
        </div>

        {/* Referring Doctor Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Stethoscope className="w-5 h-5 mr-2" />
            Referring Doctor Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
              <input
                type="text"
                value={referralData.referringDoctor}
                onChange={(e) => handleInputChange('referringDoctor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter doctor name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic/Hospital</label>
              <input
                type="text"
                value={referralData.referringClinic}
                onChange={(e) => handleInputChange('referringClinic', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter clinic/hospital name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={referralData.referringPhone}
                  onChange={(e) => handleInputChange('referringPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={referralData.referringEmail}
                  onChange={(e) => handleInputChange('referringEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={referralData.referringAddress}
                onChange={(e) => handleInputChange('referringAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Enter clinic address"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Referred To Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 no-print">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Referred To
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor/Specialist Name</label>
              <input
                type="text"
                value={referralData.referredToDoctor}
                onChange={(e) => handleInputChange('referredToDoctor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter specialist name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic/Hospital</label>
              <input
                type="text"
                value={referralData.referredToClinic}
                onChange={(e) => handleInputChange('referredToClinic', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter clinic/hospital name"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={referralData.referredToPhone}
                  onChange={(e) => handleInputChange('referredToPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={referralData.referredToEmail}
                  onChange={(e) => handleInputChange('referredToEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={referralData.referredToAddress}
                onChange={(e) => handleInputChange('referredToAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Enter clinic address"
              />
            </div>
          </div>
        </div>
      </div>

       {/* Medical Information */}
       <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 no-print">
         <div className="flex items-center justify-between mb-4">
           <h2 className="text-lg font-semibold text-gray-900 flex items-center">
             <Stethoscope className="w-5 h-5 mr-2" />
             Medical Information
           </h2>
           <div className="flex items-center gap-2">
             <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
               Auto-saved
             </span>
             <button
               onClick={() => setIsEditing(!isEditing)}
               className="text-sm text-blue-600 hover:text-blue-800"
             >
               {isEditing ? 'View Mode' : 'Edit Mode'}
             </button>
           </div>
         </div>
         <div className="space-y-4">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
               <textarea
                 value={referralData.chiefComplaint}
                 onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 rows={3}
                 placeholder="Enter chief complaint"
                 disabled={!isEditing}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">History of Present Illness</label>
               <textarea
                 value={referralData.historyOfPresentIllness}
                 onChange={(e) => handleInputChange('historyOfPresentIllness', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 rows={3}
                 placeholder="Enter history of present illness"
                 disabled={!isEditing}
               />
             </div>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Past Medical History</label>
               <textarea
                 value={referralData.pastMedicalHistory}
                 onChange={(e) => handleInputChange('pastMedicalHistory', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 rows={3}
                 placeholder="Enter past medical history"
                 disabled={!isEditing}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
               <textarea
                 value={referralData.medications}
                 onChange={(e) => handleInputChange('medications', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 rows={3}
                 placeholder="Enter current medications"
                 disabled={!isEditing}
               />
             </div>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
               <textarea
                 value={referralData.allergies}
                 onChange={(e) => handleInputChange('allergies', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 rows={2}
                 placeholder="Enter known allergies"
                 disabled={!isEditing}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Physical Examination</label>
               <textarea
                 value={referralData.physicalExamination}
                 onChange={(e) => handleInputChange('physicalExamination', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 rows={2}
                 placeholder="Enter physical examination findings"
                 disabled={!isEditing}
               />
             </div>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
               <textarea
                 value={referralData.diagnosis}
                 onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 rows={2}
                 placeholder="Enter diagnosis"
                 disabled={!isEditing}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Referral</label>
               <textarea
                 value={referralData.reasonForReferral}
                 onChange={(e) => handleInputChange('reasonForReferral', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 rows={2}
                 placeholder="Enter reason for referral"
                 disabled={!isEditing}
               />
             </div>
           </div>
         </div>
       </div>

      {/* Referral Details */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 no-print">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Referral Details
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Date</label>
              <input
                type="date"
                value={referralData.referralDate}
                onChange={(e) => handleInputChange('referralDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Time</label>
              <input
                type="time"
                value={referralData.referralTime}
                onChange={(e) => handleInputChange('referralTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
              <select
                value={referralData.urgency}
                onChange={(e) => handleInputChange('urgency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
           <div className="bg-gray-50 rounded-lg p-4 border">
             <h3 className="text-lg font-semibold text-gray-900 mb-4">Requested Investigations & Treatments</h3>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Requested Investigations</label>
                 <select
                   value={referralData.requestedInvestigations}
                   onChange={(e) => handleInputChange('requestedInvestigations', e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                 >
                   <option value="">Select common investigations...</option>
                   <option value="Blood tests (CBC, Chemistry panel)">Blood tests (CBC, Chemistry panel)</option>
                   <option value="Chest X-ray">Chest X-ray</option>
                   <option value="ECG (Electrocardiogram)">ECG (Electrocardiogram)</option>
                   <option value="MRI scan">MRI scan</option>
                   <option value="CT scan">CT scan</option>
                   <option value="Ultrasound">Ultrasound</option>
                   <option value="Endoscopy">Endoscopy</option>
                   <option value="Biopsy">Biopsy</option>
                   <option value="Pulmonary function test">Pulmonary function test</option>
                   <option value="Cardiac stress test">Cardiac stress test</option>
                   <option value="Other (specify in notes)">Other (specify in notes)</option>
                 </select>
                 <textarea
                   value={referralData.requestedInvestigations}
                   onChange={(e) => handleInputChange('requestedInvestigations', e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   rows={2}
                   placeholder="Or enter custom investigations..."
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Requested Treatments</label>
                 <select
                   value={referralData.requestedTreatments}
                   onChange={(e) => handleInputChange('requestedTreatments', e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                 >
                   <option value="">Select common treatments...</option>
                   <option value="Physical therapy">Physical therapy</option>
                   <option value="Medication review and adjustment">Medication review and adjustment</option>
                   <option value="Surgical consultation">Surgical consultation</option>
                   <option value="Cardiac rehabilitation">Cardiac rehabilitation</option>
                   <option value="Pulmonary rehabilitation">Pulmonary rehabilitation</option>
                   <option value="Diabetes management">Diabetes management</option>
                   <option value="Pain management">Pain management</option>
                   <option value="Psychiatric evaluation">Psychiatric evaluation</option>
                   <option value="Nutritional counseling">Nutritional counseling</option>
                   <option value="Follow-up appointment">Follow-up appointment</option>
                   <option value="Other (specify in notes)">Other (specify in notes)</option>
                 </select>
                 <textarea
                   value={referralData.requestedTreatments}
                   onChange={(e) => handleInputChange('requestedTreatments', e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   rows={2}
                   placeholder="Or enter custom treatments..."
                 />
               </div>
             </div>
           </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Instructions</label>
              <textarea
                value={referralData.followUpInstructions}
                onChange={(e) => handleInputChange('followUpInstructions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter follow-up instructions"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                value={referralData.additionalNotes}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter additional notes"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Referral Document */}
      <div className="bg-white rounded-lg shadow-sm border p-8 print:shadow-none print:border-0 print:p-0">
         <style>{`
           @media print {
             @page {
               margin: 5mm 10mm;
               size: A4 portrait;
             }
             
             body {
               font-family: 'Arial', sans-serif;
               font-size: 9pt;
               line-height: 1.2;
               color: #000;
               background: white !important;
               max-width: 100%;
             }
             
             /* Hide all UI controls in print */
             .no-print,
             button:not(.print-allowed),
             [role="button"],
             nav,
             .print-controls,
             .navigation-controls,
             .dark-mode-toggle,
             header button,
             [class*="arrow"],
             [class*="navigation"],
             [class*="control"],
             [class*="resize"],
             [aria-label],
             svg:not(.print-allowed),
             input[type="button"],
             input[type="submit"]:not(.print-allowed),
             .toolbar,
             .controls { 
               display: none !important; 
               visibility: hidden !important;
             }
             
             .print-break { 
               page-break-before: always; 
             }
             
             /* Ensure content fills page properly */
             html, body {
               width: 100%;
               height: 100%;
               margin: 0 !important;
               padding: 0 !important;
               overflow: visible !important;
             }
             
             /* Ensure only the referral content shows */
             * {
               -webkit-print-color-adjust: exact !important;
               print-color-adjust: exact !important;
             }
             
             .referral-header { 
               border-bottom: 2px solid #000; 
               padding-bottom: 6px; 
               margin-bottom: 8px;
               width: 100%;
             }
             
             .referral-section { 
               margin-bottom: 8px;
               width: 100%;
             }
             
             .referral-label { 
               font-weight: bold; 
               margin-bottom: 3px; 
               font-size: 9pt;
             }
             
             .referral-content { 
               margin-bottom: 4px; 
               font-size: 9pt;
             }
             
             .print-container {
               max-width: 100%;
               width: 100%;
               margin: 0;
               padding: 0;
             }
             
             .print-header {
               margin-bottom: 10px;
               width: 100%;
               padding-bottom: 5px;
             }
             
             .print-header h1 {
               font-size: 16pt;
               font-weight: bold;
               text-align: center;
               margin: 8px 0;
             }
             
             .print-header img {
               width: 60px !important;
               height: 60px !important;
               object-fit: contain;
             }
             
             .print-header .clinic-info {
               font-size: 9pt;
             }
             
             .print-header .text-base {
               font-size: 11pt !important;
             }
             
             .print-header .text-xs {
               font-size: 8pt !important;
             }
             
             .border-t-2 {
               border-top: 2px solid #000 !important;
               padding-top: 8px !important;
               margin-top: 8px !important;
               width: 100%;
             }
             
             .flex {
               display: flex !important;
             }
             
             .items-start {
               align-items: flex-start !important;
             }
             
             .justify-between {
               justify-content: space-between !important;
             }
             
             .gap-3 {
               gap: 8px !important;
             }
             
             .text-center {
               text-align: center !important;
             }
             
             .text-left {
               text-align: left !important;
             }
             
             .text-right {
               text-align: right !important;
             }
             
             .font-bold {
               font-weight: bold !important;
             }
             
             .print-section {
               margin-bottom: 10px;
               page-break-inside: avoid;
               width: 100%;
               padding: 5px 0;
             }
             
             .print-section h2 {
               font-size: 11pt;
               font-weight: bold;
               border-bottom: 1px solid #000;
               padding-bottom: 3px;
               margin-bottom: 6px;
             }
             
             .print-grid {
               display: grid;
               grid-template-columns: 1fr 1fr 1fr;
               gap: 8px;
               margin-bottom: 6px;
               width: 100%;
             }
             
             .print-grid-full {
               grid-column: 1 / -1;
             }
             
             .print-signature {
               margin-top: 15px;
               border-top: 2px solid #000;
               padding-top: 8px;
               width: 100%;
             }
             
             .print-stamp {
               border: 1px solid #000;
               width: 130px;
               height: 50px;
               display: flex;
               align-items: center;
               justify-content: center;
               margin-top: 6px;
               font-size: 9pt;
             }
             
             .compact-grid {
               display: grid;
               grid-template-columns: 1fr 1fr 1fr;
               gap: 8px;
               margin-bottom: 6px;
               width: 100%;
             }
             
             .medical-info {
               font-size: 9pt;
               line-height: 1.2;
             }
             
             /* Ensure proper spacing */
             .mb-2 {
               margin-bottom: 6px !important;
             }
             
             .mb-3 {
               margin-bottom: 8px !important;
             }
             
             .mb-4 {
               margin-bottom: 10px !important;
             }
             
             .pt-3 {
               padding-top: 6px !important;
             }
             
             .w-16 {
               width: 60px !important;
             }
             
             .h-16 {
               height: 60px !important;
             }
             
             .gap-2 {
               gap: 8px !important;
             }
             
             .gap-3 {
               gap: 10px !important;
             }
             
             .text-xs {
               font-size: 8pt !important;
             }
             
             .text-sm {
               font-size: 9pt !important;
             }
             
             .text-base {
               font-size: 11pt !important;
             }
             
             .text-2xl {
               font-size: 16pt !important;
             }
             
             textarea, input {
               font-size: 9pt !important;
               padding: 3px !important;
               line-height: 1.2 !important;
               min-height: 30px !important;
             }
             
             /* Ensure full width */
             .grid, .flex {
               width: 100% !important;
             }
           }
         `}</style>

        {/* Referral Header */}
        <div className="referral-header mb-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-start gap-3">
              <img 
                src="/assets/images/logo.jpg" 
                alt="Clinic Logo" 
                className="w-16 h-16 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="text-left">
                <p className="font-bold text-base">{referralData.referringClinic}</p>
                <p className="text-xs">{referralData.referringAddress}</p>
                <p className="text-xs">Tel: {referralData.referringPhone} | Email: {referralData.referringEmail}</p>
              </div>
            </div>
            <div className="text-right text-xs">
              <p><strong>Date:</strong> {referralData.referralDate}</p>
              <p><strong>Time:</strong> {referralData.referralTime}</p>
              <p><strong>Urgency:</strong> <span className="font-bold">{referralData.urgency.toUpperCase()}</span></p>
            </div>
          </div>
          <div className="border-t-2 border-gray-800 pt-3 text-center">
            <h1 className="text-2xl font-bold">MEDICAL REFERRAL</h1>
          </div>
        </div>

        {/* Patient Information Section */}
        <div className="referral-section print-section mb-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">PATIENT INFORMATION</h2>
          <div className="grid grid-cols-3 gap-2 compact-grid">
            <div>
              <p className="referral-label">Name:</p>
              <p className="referral-content">{referralData.patientName || '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">Age:</p>
              <p className="referral-content">{referralData.age > 0 ? `${referralData.age} years` : '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">Gender:</p>
              <p className="referral-content">{referralData.gender || '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">Phone:</p>
              <p className="referral-content">{referralData.phone || '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">MR#:</p>
              <p className="referral-content">{referralData.medicalRecordNumber || '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">Address:</p>
              <p className="referral-content">{referralData.address || '_________________'}</p>
            </div>
          </div>
        </div>

        {/* Referring Doctor Section */}
        <div className="referral-section print-section mb-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">REFERRING DOCTOR</h2>
          <div className="grid grid-cols-2 gap-2 compact-grid">
            <div>
              <p className="referral-label">Dr. {referralData.referringDoctor}</p>
            </div>
            <div>
              <p className="referral-label">{referralData.referringClinic}</p>
            </div>
            <div>
              <p className="referral-label">Tel: {referralData.referringPhone}</p>
            </div>
            <div>
              <p className="referral-label">Email: {referralData.referringEmail}</p>
            </div>
          </div>
        </div>

        {/* Referred To Section */}
        <div className="referral-section print-section mb-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">REFERRED TO</h2>
          <div className="grid grid-cols-2 gap-2 compact-grid">
            <div>
              <p className="referral-label">Dr. {referralData.referredToDoctor || '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">{referralData.referredToClinic || '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">Tel: {referralData.referredToPhone || '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">Email: {referralData.referredToEmail || '_________________'}</p>
            </div>
          </div>
        </div>

        {/* Medical Information Section */}
        <div className="referral-section print-section mb-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">MEDICAL INFORMATION</h2>
          <div className="medical-info space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="referral-label">Chief Complaint:</p>
                <p className="referral-content">{referralData.chiefComplaint || '_________________'}</p>
              </div>
              <div>
                <p className="referral-label">Diagnosis:</p>
                <p className="referral-content">{referralData.diagnosis || '_________________'}</p>
              </div>
            </div>
            <div>
              <p className="referral-label">History:</p>
              <p className="referral-content">{referralData.historyOfPresentIllness || '_________________'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="referral-label">Medications:</p>
                <p className="referral-content">{referralData.medications || '_________________'}</p>
              </div>
              <div>
                <p className="referral-label">Allergies:</p>
                <p className="referral-content">{referralData.allergies || 'None known'}</p>
              </div>
            </div>
            <div>
              <p className="referral-label">Physical Exam:</p>
              <p className="referral-content">{referralData.physicalExamination || '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">Reason for Referral:</p>
              <p className="referral-content">{referralData.reasonForReferral || '_________________'}</p>
            </div>
          </div>
        </div>

        {/* Referral Details Section */}
        <div className="referral-section print-section mb-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">REFERRAL DETAILS</h2>
          <div className="medical-info space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="referral-label">Investigations:</p>
                <p className="referral-content">{referralData.requestedInvestigations || '_________________'}</p>
              </div>
              <div>
                <p className="referral-label">Treatments:</p>
                <p className="referral-content">{referralData.requestedTreatments || '_________________'}</p>
              </div>
            </div>
            <div>
              <p className="referral-label">Follow-up:</p>
              <p className="referral-content">{referralData.followUpInstructions || '_________________'}</p>
            </div>
            <div>
              <p className="referral-label">Notes:</p>
              <p className="referral-content">{referralData.additionalNotes || '_________________'}</p>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="referral-section print-section print-signature mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="referral-label">Doctor Signature:</p>
              <div className="mt-4 border-b border-gray-400 w-32"></div>
              <p className="text-xs text-gray-600 mt-1">{referralData.referringDoctor}</p>
              <p className="text-xs text-gray-600">Date: _________________</p>
            </div>
            <div>
              <p className="referral-label">Stamp:</p>
              <div className="mt-4 border border-gray-400 w-32 h-12 flex items-center justify-center print-stamp">
                <span className="text-gray-500 text-xs">[STAMP]</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EMRReferralPaper;
