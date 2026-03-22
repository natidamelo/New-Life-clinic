import React, { useState, useEffect } from 'react';
import {
  Search,
  Printer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  User,
  Pill,
  Activity,
  Download,
  ExternalLink,
  Shield,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  route?: string;
  notes?: string;
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  description: string;
  severity: string;
  interactionType: string;
}

interface AllergyAlert {
  medication: string;
  allergen: string;
  alertType: string;
  severity: string;
  description: string;
}

interface ClinicalAlert {
  alertType: string;
  message: string;
  severity: string;
  source: string;
  acknowledged: boolean;
}

interface Prescription {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  doctor: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  status: string;
  datePrescribed: string;
  medications: Medication[];
  drugInteractions: DrugInteraction[];
  allergyAlerts: AllergyAlert[];
  clinicalAlerts: ClinicalAlert[];
}

interface SearchFilters {
  query: string;
  patientId: string;
  medicationName: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const EMRPrescriptionSystem: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    patientId: '',
    medicationName: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDrugInfo, setShowDrugInfo] = useState(false);
  const [drugInfo, setDrugInfo] = useState<any>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 0
  });

  // Search prescriptions with EMR features
  const searchPrescriptions = async () => {
    try {
      setLoading(true);
      
      console.log('Loading real prescription data from database...');
      
      // Try to get real prescription data from the API
      try {
        const response = await axios.get('/api/prescriptions');
        console.log('API Response:', response.data);
        
        if (response.data && Array.isArray(response.data)) {
          // Transform the real data to match EMR interface
          const transformedPrescriptions = response.data.map((prescription: any) => ({
            _id: prescription._id,
            patient: prescription.patient || { 
              _id: prescription.patientId, 
              firstName: prescription.patient?.firstName || 'Unknown', 
              lastName: prescription.patient?.lastName || 'Patient' 
            },
            doctor: prescription.doctor || { 
              _id: prescription.doctorId, 
              firstName: prescription.doctor?.firstName || 'Dr.', 
              lastName: prescription.doctor?.lastName || 'Unknown' 
            },
            medicationName: prescription.medicationName || prescription.medication || 'Unknown medication',
            dosage: prescription.dosage || 'N/A',
            frequency: prescription.frequency || 'N/A',
            duration: prescription.duration || 'N/A',
            instructions: prescription.instructions || prescription.notes || '',
            status: prescription.status || 'Unknown',
            datePrescribed: prescription.datePrescribed || prescription.createdAt || new Date().toISOString(),
            medications: prescription.medications || [],
            drugInteractions: prescription.drugInteractions || [],
            allergyAlerts: prescription.allergyAlerts || [],
            clinicalAlerts: prescription.clinicalAlerts || []
          }));

          setPrescriptions(transformedPrescriptions);
          setPagination({
            page: 1,
            limit: 5,
            total: transformedPrescriptions.length,
            pages: Math.ceil(transformedPrescriptions.length / 5)
          });
          
          console.log('Real prescriptions loaded:', transformedPrescriptions.length);
          toast.success(`Loaded ${transformedPrescriptions.length} prescriptions from database`);
          return;
        }
      } catch (apiError) {
        console.log('API Error:', apiError);
        console.log('Falling back to test data...');
      }
      
      // Fallback to test data if API fails
      const testPrescriptions = [
        {
          _id: 'test1',
          patient: { _id: 'patient1', firstName: 'Melody', lastName: 'Johnson' },
          doctor: { _id: 'doctor1', firstName: 'Dr. John', lastName: 'Smith' },
          medicationName: 'Amoxicillin',
          dosage: '500mg',
          frequency: 'Three times daily',
          duration: '7 days',
          instructions: 'Take with food to reduce stomach upset',
          status: 'Active',
          datePrescribed: new Date().toISOString(),
          medications: [],
          drugInteractions: [],
          allergyAlerts: [],
          clinicalAlerts: []
        },
        {
          _id: 'test2',
          patient: { _id: 'patient2', firstName: 'Sarah', lastName: 'Wilson' },
          doctor: { _id: 'doctor1', firstName: 'Dr. John', lastName: 'Smith' },
          medicationName: 'Ibuprofen',
          dosage: '200mg',
          frequency: 'As needed',
          duration: '5 days',
          instructions: 'Take for pain relief, maximum 3 times per day',
          status: 'Active',
          datePrescribed: new Date().toISOString(),
          medications: [],
          drugInteractions: [],
          allergyAlerts: [],
          clinicalAlerts: []
        }
      ];
      
      setPrescriptions(testPrescriptions);
      setPagination({
        page: 1,
        limit: 5,
        total: testPrescriptions.length,
        pages: Math.ceil(testPrescriptions.length / 5)
      });
      
      console.log('Using test data as fallback:', testPrescriptions.length);
      toast.warning('Using test data - database connection failed');
      
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for immediate search results
  const allFilteredPrescriptions = prescriptions.filter(prescription => {
    if (!searchFilters.query) return true;
    
    const query = searchFilters.query.toLowerCase().trim();
    if (!query) return true;
    
    const matches = (
      prescription.medicationName?.toLowerCase().includes(query) ||
      prescription.patient?.firstName?.toLowerCase().includes(query) ||
      prescription.patient?.lastName?.toLowerCase().includes(query) ||
      prescription.instructions?.toLowerCase().includes(query) ||
      prescription.dosage?.toLowerCase().includes(query) ||
      prescription.frequency?.toLowerCase().includes(query) ||
      prescription.status?.toLowerCase().includes(query)
    );
    
    // Debug logging
    if (matches) {
      console.log('✅ Search match found:', {
        medication: prescription.medicationName,
        patient: `${prescription.patient?.firstName} ${prescription.patient?.lastName}`,
        query: query
      });
    }
    
    return matches;
  });

  // Apply pagination to filtered results
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const filteredPrescriptions = allFilteredPrescriptions.slice(startIndex, endIndex);

  // Update pagination when filtered results change
  useEffect(() => {
    const totalPages = Math.ceil(allFilteredPrescriptions.length / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total: allFilteredPrescriptions.length,
      pages: totalPages,
      page: prev.page > totalPages ? 1 : prev.page
    }));
  }, [allFilteredPrescriptions.length, pagination.limit]);

  // Load prescriptions on component mount and filter changes
  useEffect(() => {
    searchPrescriptions();
  }, [pagination.page]);

  // Real-time search effect
  useEffect(() => {
    console.log('Search query changed:', searchFilters.query);
    console.log('Current prescriptions count:', prescriptions.length);
    console.log('Filtered prescriptions count:', allFilteredPrescriptions.length);
  }, [searchFilters.query, prescriptions, allFilteredPrescriptions]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    searchPrescriptions();
  };

  // Generate professional prescription HTML
  const generateProfessionalPrescriptionHTML = (prescription: any) => {
    const currentDate = new Date(prescription.datePrescribed).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const calculateAge = (dateOfBirth: string) => {
      if (!dateOfBirth) return 'Not specified';
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age} years`;
    };

    return `
      <!DOCTYPE html>
      <html>
          <head>
              <title>Prescription - ${prescription.patient.firstName} ${prescription.patient.lastName}</title>
              <style>
                  @page {
                      size: A4;
                      margin: 5mm 8mm;
                  }
                  
                  * {
                      box-sizing: border-box;
                  }
                  
                  body { 
                      font-family: 'Georgia', 'Times New Roman', serif; 
                      margin: 0;
                      padding: 10px; 
                      color: #1e293b;
                      font-size: 12px;
                      line-height: 1.4;
                      background: white;
                      -webkit-print-color-adjust: exact;
                      color-adjust: exact;
                  }
                  
                  .prescription-container {
                      max-width: 100%;
                      margin: 0 auto;
                      background: white;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                      border-radius: 8px;
                      overflow: hidden;
                      position: relative;
                      height: 100vh;
                  }
                  
                  .prescription-container::before {
                      content: 'ORIGINAL';
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%) rotate(-45deg);
                      font-size: 48px;
                      font-weight: bold;
                      color: rgba(30, 64, 175, 0.1);
                      z-index: 1;
                      pointer-events: none;
                      letter-spacing: 8px;
                  }
                  
                  .prescription-container > * {
                      position: relative;
                      z-index: 2;
                  }
                  
                  .prescription-header {
                      background: #f8f8f8;
                      color: #333333;
                      padding: 8px 12px;
                      position: relative;
                      overflow: hidden;
                      border-bottom: 1px solid #cccccc;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                  }
                  
                  .clinic-info {
                      position: relative;
                      z-index: 2;
                      display: flex;
                      align-items: center;
                      flex-direction: row;
                  }
                  
                  .clinic-logo {
                      width: 30px;
                      height: 30px;
                      border-radius: 6px;
                      margin-right: 10px;
                      border: 1px solid #cccccc;
                      flex-shrink: 0;
                  }
                  
                  .clinic-name {
                      font-size: 16px;
                      font-weight: bold;
                      color: #333333;
                      margin-bottom: 0px;
                  }
                  
                  .clinic-subtitle {
                      font-size: 10px;
                      color: #666666;
                      margin-bottom: 0px;
                      font-weight: 500;
                  }
                  
                  .clinic-address, .clinic-phone {
                      font-size: 9px;
                      color: #666666;
                      margin-bottom: 0px;
                      display: flex;
                      align-items: center;
                      gap: 2px;
                  }
                  
                  .prescription-meta {
                      text-align: right;
                      font-size: 9px;
                      color: #333333;
                      background: #ffffff;
                      padding: 4px 6px;
                      border-radius: 4px;
                      border: 1px solid #cccccc;
                  }
                  
                  .patient-section {
                      padding: 6px 8px;
                      margin: 5px 8px;
                  }
                  
                  .patient-title {
                      font-size: 12px;
                      font-weight: bold;
                      color: #333333;
                      margin-bottom: 4px;
                      display: flex;
                      align-items: center;
                      gap: 4px;
                      border-bottom: 1px solid #cccccc;
                      padding-bottom: 2px;
                  }
                  
                  .patient-info {
                      display: grid;
                      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                      gap: 3px;
                      font-size: 10px;
                  }
                  
                  .info-item {
                      display: flex;
                      align-items: center;
                      padding: 3px 4px;
                  }
                  
                  .info-label {
                      font-weight: 600;
                      min-width: 50px;
                      color: #666666;
                      text-transform: uppercase;
                      font-size: 9px;
                      letter-spacing: 0.2px;
                  }
                  
                  .info-value {
                      color: #333333;
                      font-weight: 500;
                  }
                  
                  .prescription-title {
                      font-size: 12px;
                      font-weight: bold;
                      color: #333333;
                      margin: 8px 8px 5px 8px;
                      padding: 4px 6px;
                      border-bottom: 1px solid #cccccc;
                      display: flex;
                      align-items: center;
                      gap: 4px;
                  }
                  
                  .medications-list {
                      padding: 0 8px;
                  }
                  
                  .medication-item {
                      page-break-inside: avoid;
                      margin-bottom: 4px;
                      padding: 4px;
                      border-bottom: 1px solid #eeeeee;
                  }
                  
                  .medication-header {
                      display: flex;
                      align-items: center;
                      margin-bottom: 2px;
                  }
                  
                  .medication-number {
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      width: 16px;
                      height: 16px;
                      background: #666666;
                      color: white;
                      border-radius: 50%;
                      font-size: 10px;
                      font-weight: bold;
                      margin-right: 6px;
                  }
                  
                  .medication-name {
                      font-size: 11px;
                      color: #333333;
                      font-family: 'Georgia', serif;
                      font-weight: bold;
                  }
                  
                  .medication-details {
                      margin-left: 22px;
                      display: grid;
                      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                      gap: 4px;
                      margin-bottom: 2px;
                  }
                  
                  .detail-item {
                      padding: 2px 4px;
                  }
                  
                  .detail-label {
                      font-size: 8px;
                      color: #666666;
                      text-transform: uppercase;
                      font-weight: 600;
                  }
                  
                  .detail-value {
                      font-size: 9px;
                      color: #333333;
                      font-weight: 500;
                  }
                  
                  .doctor-signature {
                      margin: 8px 8px 5px 8px;
                      padding: 6px 8px;
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-end;
                      border-top: 1px solid #cccccc;
                  }
                  
                  .signature-block {
                      text-align: center;
                  }
                  
                  .signature-line {
                      border-bottom: 1px solid #333333;
                      width: 80px;
                      margin-bottom: 2px;
                      height: 20px;
                  }
                  
                  .signature-label {
                      font-size: 9px;
                      color: #666666;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 0.2px;
                  }
                  
                  .doctor-info {
                      text-align: right;
                      padding: 4px 6px;
                  }
                  
                  .doctor-info div {
                      margin-bottom: 1px;
                      font-size: 9px;
                  }
                  
                  .doctor-info strong {
                      color: #333333;
                      font-weight: 600;
                  }
                  
                  .footer {
                      margin: 5px 8px 5px 8px;
                      padding: 6px 8px;
                      background: #f8f8f8;
                      border-top: 1px solid #cccccc;
                      color: #333333;
                      text-align: center;
                  }
                  
                  .footer div {
                      margin-bottom: 1px;
                      font-size: 9px;
                  }
                  
                  .footer div:first-child {
                      font-weight: 600;
                      font-size: 10px;
                      margin-bottom: 2px;
                  }
                  
                  .print-btn {
                      padding: 12px 24px;
                      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                      color: white;
                      border: none;
                      border-radius: 8px;
                      font-size: 14px;
                      font-weight: 600;
                      cursor: pointer;
                      margin: 20px auto;
                      display: block;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                      transition: all 0.3s ease;
                  }
                  
                  .print-btn:hover {
                      transform: translateY(-2px);
                      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
                  }
                  
                  @media print {
                      @page {
                          size: A4;
                          margin: 3mm 5mm;
                      }
                      
                      body { 
                          margin: 0; 
                          padding: 0;
                          font-size: 9px;
                          color: #1e293b !important;
                          background: white !important;
                          max-height: 14.8cm;
                          overflow: hidden;
                      }
                      
                      .prescription-container {
                          box-shadow: none;
                          border-radius: 0;
                          max-width: none;
                          height: 14.8cm;
                          overflow: hidden;
                      }
                      
                      .prescription-container::before {
                          content: 'ORIGINAL';
                          position: absolute;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%) rotate(-45deg);
                          font-size: 36px;
                          font-weight: bold;
                          color: rgba(30, 64, 175, 0.08) !important;
                          z-index: 1;
                          pointer-events: none;
                          letter-spacing: 6px;
                      }
                      
                      .prescription-header {
                          background: #f8f8f8 !important;
                          color: #333333 !important;
                          -webkit-print-color-adjust: exact !important;
                          color-adjust: exact !important;
                      }
                      
                      .patient-section {
                          background: transparent !important;
                          border: none !important;
                      }
                      
                      .prescription-title {
                          background: transparent !important;
                          color: #333333 !important;
                      }
                      
                      .doctor-signature {
                          background: transparent !important;
                          border: none !important;
                      }
                      
                      .footer {
                          background: #f8f8f8 !important;
                          color: #333333 !important;
                      }
                      
                      .print-btn { 
                          display: none !important; 
                      }
                      
                      .no-print { 
                          display: none !important; 
                      }
                      
                      * { 
                          -webkit-print-color-adjust: exact !important; 
                          color-adjust: exact !important; 
                      }
                      
                      .medication-item {
                          page-break-inside: avoid !important;
                      }
                      
                      @media print and (max-width: 800px) {
                          .prescription-container::before {
                              display: none !important;
                          }
                      }
                  }
              </style>
          </head>
          <body>
              <div class="prescription-container">
                  <div class="prescription-header">
                      <div class="clinic-info">
                          <img src="/assets/images/logo.jpg" alt="Clinic Logo" class="clinic-logo" onerror="this.style.display='none'">
                          <div style="display: flex; flex-direction: column; justify-content: center;">
                              <div class="clinic-name">New Life Medium Clinic PLC</div>
                              <div class="clinic-subtitle">Medical Prescription</div>
                              <div class="clinic-address">📍 Lafto beside Kebron Guest House</div>
                              <div class="clinic-phone">📞 +251925959219</div>
                          </div>
                      </div>
                      <div class="prescription-meta">
                          <div><strong>Date:</strong> ${currentDate}</div>
                          <div><strong>Status:</strong> Active</div>
                          <div><strong>ID:</strong> ${prescription._id.slice(-6)}</div>
                      </div>
                  </div>

                  <div class="patient-section">
                      <div class="patient-title">
                          👤 Patient Information
                      </div>
                      <div class="patient-info">
                          <div class="info-item">
                              <span class="info-label">Full Name:</span>
                              <span class="info-value">${prescription.patient.firstName} ${prescription.patient.lastName}</span>
                          </div>
                          <div class="info-item">
                              <span class="info-label">Age:</span>
                              <span class="info-value">${calculateAge(prescription.patient.dateOfBirth)}</span>
                          </div>
                          <div class="info-item">
                              <span class="info-label">Gender:</span>
                              <span class="info-value">${prescription.patient.gender || 'Not specified'}</span>
                          </div>
                          <div class="info-item">
                              <span class="info-label">Patient ID:</span>
                              <span class="info-value">${prescription.patient.patientId || prescription.patient._id}</span>
                          </div>
                          ${prescription.patient.phoneNumber ? `
                              <div class="info-item">
                                  <span class="info-label">Phone:</span>
                                  <span class="info-value">${prescription.patient.phoneNumber}</span>
                              </div>
                          ` : ''}
                          ${prescription.patient.address ? `
                              <div class="info-item">
                                  <span class="info-label">Address:</span>
                                  <span class="info-value">${prescription.patient.address}</span>
                              </div>
                          ` : ''}
                      </div>
                  </div>

                  <div class="prescription-title">
                      💊 Prescription Details
                  </div>

                  <div class="medications-list">
                      <div class="medication-item">
                          <div class="medication-header">
                              <div class="medication-number">1</div>
                              <div class="medication-name">${prescription.medicationName}</div>
                          </div>
                          <div class="medication-details">
                              <div class="detail-item">
                                  <div class="detail-label">Dose</div>
                                  <div class="detail-value">${prescription.dosage || 'As directed'}</div>
                              </div>
                              <div class="detail-item">
                                  <div class="detail-label">Freq</div>
                                  <div class="detail-value">${prescription.frequency || 'As needed'}</div>
                              </div>
                              ${prescription.duration ? `
                                  <div class="detail-item">
                                      <div class="detail-label">Duration</div>
                                      <div class="detail-value">${prescription.duration}</div>
                                  </div>
                              ` : ''}
                              ${prescription.route ? `
                                  <div class="detail-item">
                                      <div class="detail-label">Route</div>
                                      <div class="detail-value">${prescription.route}</div>
                                  </div>
                              ` : ''}
                              ${prescription.quantity ? `
                                  <div class="detail-item">
                                      <div class="detail-label">Qty</div>
                                      <div class="detail-value">${prescription.quantity}</div>
                                  </div>
                              ` : ''}
                          </div>
                          ${prescription.instructions ? `
                              <div style="background: #f8f8f8; padding: 2px; margin-top: 2px; border-left: 1px solid #cccccc; margin-left: 22px;">
                                  <div style="font-size: 8px; color: #666666; font-weight: 600; text-transform: uppercase; margin-bottom: 1px;">Instructions</div>
                                  <div style="font-size: 8px; color: #333333; line-height: 1.2; font-style: italic;">${prescription.instructions}</div>
                              </div>
                          ` : ''}
                      </div>
                  </div>

                  <div class="doctor-signature">
                      <div class="signature-block">
                          <div class="signature-line"></div>
                          <div class="signature-label">Doctor Signature</div>
                      </div>
                      <div class="doctor-info">
                          <div><strong>Prescriber:</strong> Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}</div>
                          <div><strong>License:</strong> ${prescription.doctor.licenseNumber || 'N/A'}</div>
                          <div><strong>Date:</strong> ${currentDate}</div>
                      </div>
                  </div>

                  <div class="footer">
                      <div>New Life Medium Clinic PLC - Medical Prescription System</div>
                      <div>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
                      <div>This prescription is valid for 30 days from the date of issue</div>
                  </div>
              </div>

              <button class="print-btn no-print" onclick="window.print()">🖨️ Print Prescription</button>

              <script>
                  document.addEventListener('DOMContentLoaded', function() {
                      document.querySelector('.print-btn').focus();
                  });
                  
                  window.addEventListener('afterprint', function() {
                      console.log('Prescription printed successfully');
                  });
              </script>
          </body>
      </html>
    `;
  };

  // Print prescription
  const handlePrint = async (prescriptionId: string) => {
    try {
      // Try EMR print endpoint first
      try {
        const response = await axios.post(
          `/api/emr-prescriptions/print/${prescriptionId}`,
          {
            printType: 'prescription',
            copies: 1
          },
          {
            responseType: 'blob'
          }
        );

        // Create blob URL and trigger download
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prescription_${prescriptionId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success('Prescription printed successfully');
        return;
      } catch (emrError) {
        console.log('EMR print endpoint not available, using fallback');
      }

      // Fallback: Open prescription in new window for printing with professional format
      const prescription = prescriptions.find(p => p._id === prescriptionId);
      if (prescription) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(generateProfessionalPrescriptionHTML(prescription));
          printWindow.document.close();
          printWindow.focus();
          toast.success('Prescription opened for printing');
        }
      } else {
        toast.error('Prescription not found');
      }
    } catch (error) {
      console.error('Error printing prescription:', error);
      toast.error('Failed to print prescription');
    }
  };

  // Get drug information
  const handleGetDrugInfo = async (drugName: string) => {
    try {
      // Try EMR endpoint first
      try {
        const response = await axios.get(`/api/emr-prescriptions/drug-info/${drugName}`);
        
        if (response.data.success) {
          setDrugInfo(response.data.data);
          setShowDrugInfo(true);
          return;
        }
      } catch (emrError) {
        console.log('EMR drug info endpoint not available, using fallback');
      }

      // Fallback: Create basic drug information
      const fallbackDrugInfo = {
        name: drugName,
        genericName: drugName,
        brandNames: [],
        indications: [`Prescribed for treatment`],
        contraindications: [`Consult your doctor before taking ${drugName}`],
        sideEffects: [`Possible side effects may occur`],
        dosageInfo: {
          adult: 'As prescribed by doctor',
          pediatric: 'Consult pediatrician'
        }
      };

      setDrugInfo(fallbackDrugInfo);
      setShowDrugInfo(true);
    } catch (error) {
      console.error('Error getting drug information:', error);
      toast.error('Failed to get drug information');
    }
  };

  // Acknowledge clinical alerts
  const handleAcknowledgeAlerts = async (prescriptionId: string, alertIds: string[]) => {
    try {
      const reason = prompt('Please provide a reason for acknowledging these alerts:');
      if (!reason) return;

      await axios.post(`/api/emr-prescriptions/${prescriptionId}/acknowledge-alerts`, {
        alertIds,
        reason
      });

      toast.success('Alerts acknowledged successfully');
      searchPrescriptions(); // Refresh data
    } catch (error) {
      console.error('Error acknowledging alerts:', error);
      toast.error('Failed to acknowledge alerts');
    }
  };

  // Get severity color for alerts
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-destructive bg-destructive/20';
      case 'warning':
        return 'text-accent-foreground bg-accent/20';
      case 'info':
        return 'text-primary bg-primary/20';
      default:
        return 'text-muted-foreground bg-muted/20';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-muted-foreground mb-2">
          EMR Prescription Management System
        </h1>
        <p className="text-muted-foreground">
          Advanced prescription management with drug interaction checking, allergy alerts, and comprehensive search
        </p>
      </div>


      {/* Search and Filters */}
      <div className="bg-primary-foreground rounded-lg shadow-sm border p-4 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Search Prescriptions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 w-4 h-4" />
                <input
                  type="text"
                  value={searchFilters.query}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
                  placeholder="Search by medication, patient, or instructions..."
                  className="pl-10 w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
            
            <button
              type="button"
              onClick={() => searchPrescriptions()}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={searchFilters.medicationName}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, medicationName: e.target.value }))}
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Status
                </label>
                <select
                  value={searchFilters.status}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={searchFilters.dateFrom}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={searchFilters.dateTo}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <div className="bg-primary-foreground rounded-lg shadow-sm border">
        {/* Results Header */}
        <div className="px-6 py-4 border-b border-border/30">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-muted-foreground">
              Prescriptions ({allFilteredPrescriptions.length})
            </h2>
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </div>
          </div>
        </div>

        {/* Prescriptions List */}
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="text-center p-8">
              <RefreshCw className="mx-auto h-12 w-12 text-primary/50 animate-spin" />
              <h3 className="mt-2 text-lg font-medium text-muted-foreground">Loading prescriptions...</h3>
              <p className="mt-1 text-sm text-muted-foreground">Please wait while we fetch your data</p>
            </div>
          ) : allFilteredPrescriptions.length === 0 ? (
            <div className="text-center p-8">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-2 text-lg font-medium text-muted-foreground">No prescriptions found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchFilters.query ? `No results for "${searchFilters.query}". Try adjusting your search terms.` : 'No prescriptions available'}
              </p>
              {searchFilters.query && (
                <button
                  onClick={() => setSearchFilters(prev => ({ ...prev, query: '' }))}
                  className="mt-3 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredPrescriptions.map((prescription) => (
            <div key={prescription._id} className="p-6 hover:bg-muted/10">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {prescription.patient.firstName} {prescription.patient.lastName}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      prescription.status === 'Active' ? 'bg-primary/20 text-primary' :
                      prescription.status === 'Pending' ? 'bg-accent/20 text-accent-foreground' :
                      prescription.status === 'Completed' ? 'bg-primary/20 text-primary' :
                      'bg-muted/20 text-muted-foreground'
                    }`}>
                      {prescription.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Pill className="w-3 h-3" />
                      <span>{prescription.medicationName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3" />
                      <span>{prescription.dosage} - {prescription.frequency}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(prescription.datePrescribed).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      <span>Dr. {prescription.doctor.firstName} {prescription.doctor.lastName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{prescription.duration}</span>
                    </div>
                  </div>

                  {/* Clinical Alerts */}
                  {(prescription.clinicalAlerts?.length > 0 || 
                    prescription.drugInteractions?.length > 0 || 
                    prescription.allergyAlerts?.length > 0) && (
                    <div className="mt-4 space-y-2">
                      {prescription.clinicalAlerts?.map((alert, index) => (
                        <div key={index} className={`flex items-center gap-2 px-3 py-2 rounded-md ${getSeverityColor(alert.severity)}`}>
                          <AlertTriangle className="w-3 h-3" />
                          <span className="text-xs">{alert.message}</span>
                          {!alert.acknowledged && (
                            <button
                              onClick={() => handleAcknowledgeAlerts(prescription._id, [alert.alertType])}
                              className="ml-auto text-xs underline hover:no-underline"
                            >
                              Acknowledge
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {prescription.drugInteractions?.map((interaction, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/20 text-accent-foreground">
                          <Shield className="w-3 h-3" />
                          <span className="text-xs">
                            Drug Interaction: {interaction.drug1} ↔ {interaction.drug2}
                          </span>
                        </div>
                      ))}
                      
                      {prescription.allergyAlerts?.map((alert, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/20 text-destructive">
                          <XCircle className="w-3 h-3" />
                          <span className="text-xs">
                            Allergy Alert: {alert.allergen} in {alert.medication}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handlePrint(prescription._id)}
                    className="p-2 text-muted-foreground hover:bg-muted/20 rounded-md"
                    title="Print Prescription"
                  >
                    <Printer className="w-3 h-3" />
                  </button>
                  
                  <button
                    onClick={() => handleGetDrugInfo(prescription.medicationName)}
                    className="p-2 text-muted-foreground hover:bg-muted/20 rounded-md"
                    title="Drug Information"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  
                  <button
                    onClick={() => setSelectedPrescription(prescription)}
                    className="p-2 text-muted-foreground hover:bg-muted/20 rounded-md"
                    title="View Details"
                  >
                    <FileText className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Instructions */}
              {prescription.instructions && (
                <div className="mt-3 p-3 bg-primary/10 rounded-md">
                  <p className="text-xs text-primary">
                    <strong>Instructions:</strong> {prescription.instructions}
                  </p>
                </div>
              )}
            </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-border/30 flex justify-between items-center">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 text-sm text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10 disabled:opacity-50"
            >
              Previous
            </button>
            
            <span className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </span>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 text-sm text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Drug Information Modal */}
      {showDrugInfo && drugInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-primary-foreground rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-muted-foreground">
                Drug Information: {drugInfo.name}
              </h3>
              <button
                onClick={() => setShowDrugInfo(false)}
                className="text-muted-foreground/50 hover:text-muted-foreground"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {drugInfo.genericName && (
                <div>
                  <strong>Generic Name:</strong> {drugInfo.genericName}
                </div>
              )}
              
              {drugInfo.brandNames?.length > 0 && (
                <div>
                  <strong>Brand Names:</strong> {drugInfo.brandNames.join(', ')}
                </div>
              )}
              
              {drugInfo.indications?.length > 0 && (
                <div>
                  <strong>Indications:</strong>
                  <ul className="list-disc list-inside ml-4">
                    {drugInfo.indications.slice(0, 3).map((indication: string, index: number) => (
                      <li key={index} className="text-sm">{indication}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {drugInfo.contraindications?.length > 0 && (
                <div>
                  <strong>Contraindications:</strong>
                  <ul className="list-disc list-inside ml-4">
                    {drugInfo.contraindications.slice(0, 3).map((contraindication: string, index: number) => (
                      <li key={index} className="text-sm text-destructive">{contraindication}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prescription Details Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-foreground rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-muted-foreground">
                  Prescription Details
                </h2>
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="text-muted-foreground/50 hover:text-muted-foreground text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Patient Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-primary mb-3">Patient Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedPrescription.patient?.firstName} {selectedPrescription.patient?.lastName}</p>
                    <p><span className="font-medium">Patient ID:</span> {selectedPrescription.patient?._id}</p>
                  </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-primary mb-3">Doctor Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Doctor:</span> Dr. {selectedPrescription.doctor?.firstName} {selectedPrescription.doctor?.lastName}</p>
                    <p><span className="font-medium">Doctor ID:</span> {selectedPrescription.doctor?._id}</p>
                  </div>
                </div>
              </div>

              {/* Medication Details */}
              <div className="bg-muted/10 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-muted-foreground mb-4">Medication Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><span className="font-medium">Medication:</span> {selectedPrescription.medicationName}</p>
                    <p><span className="font-medium">Dosage:</span> {selectedPrescription.dosage}</p>
                    <p><span className="font-medium">Frequency:</span> {selectedPrescription.frequency}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Duration:</span> {selectedPrescription.duration}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedPrescription.status === 'Active' ? 'bg-primary/20 text-primary' :
                        selectedPrescription.status === 'Completed' ? 'bg-primary/20 text-primary' :
                        selectedPrescription.status === 'Cancelled' ? 'bg-destructive/20 text-destructive' :
                        'bg-muted/20 text-muted-foreground'
                      }`}>
                        {selectedPrescription.status}
                      </span>
                    </p>
                    <p><span className="font-medium">Date Prescribed:</span> {new Date(selectedPrescription.datePrescribed).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              {selectedPrescription.instructions && (
                <div className="bg-accent/10 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-accent-foreground mb-3">Instructions</h3>
                  <p className="text-accent-foreground">{selectedPrescription.instructions}</p>
                </div>
              )}

              {/* Drug Interactions */}
              {selectedPrescription.drugInteractions && selectedPrescription.drugInteractions.length > 0 && (
                <div className="bg-destructive/10 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-destructive mb-3">Drug Interactions</h3>
                  <div className="space-y-2">
                    {selectedPrescription.drugInteractions.map((interaction, index) => (
                      <div key={index} className="text-destructive">
                        <p><span className="font-medium">Drugs:</span> {interaction.drug1} + {interaction.drug2}</p>
                        <p><span className="font-medium">Type:</span> {interaction.interactionType}</p>
                        <p><span className="font-medium">Description:</span> {interaction.description}</p>
                        <p><span className="font-medium">Severity:</span> {interaction.severity}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergy Alerts */}
              {selectedPrescription.allergyAlerts && selectedPrescription.allergyAlerts.length > 0 && (
                <div className="bg-accent/10 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-accent-foreground mb-3">Allergy Alerts</h3>
                  <div className="space-y-2">
                    {selectedPrescription.allergyAlerts.map((alert, index) => (
                      <div key={index} className="text-accent-foreground">
                        <p><span className="font-medium">Allergen:</span> {alert.allergen}</p>
                        <p><span className="font-medium">Alert Type:</span> {alert.alertType}</p>
                        <p><span className="font-medium">Severity:</span> {alert.severity}</p>
                        <p><span className="font-medium">Description:</span> {alert.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Alerts */}
              {selectedPrescription.clinicalAlerts && selectedPrescription.clinicalAlerts.length > 0 && (
                <div className="bg-secondary/10 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-secondary-foreground mb-3">Clinical Alerts</h3>
                  <div className="space-y-2">
                    {selectedPrescription.clinicalAlerts.map((alert, index) => (
                      <div key={index} className="text-secondary-foreground">
                        <p><span className="font-medium">Type:</span> {alert.alertType}</p>
                        <p><span className="font-medium">Message:</span> {alert.message}</p>
                        <p><span className="font-medium">Severity:</span> {alert.severity}</p>
                        <p><span className="font-medium">Source:</span> {alert.source}</p>
                        <p><span className="font-medium">Acknowledged:</span> {alert.acknowledged ? 'Yes' : 'No'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="px-4 py-2 text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handlePrint(selectedPrescription._id);
                    setSelectedPrescription(null);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary flex items-center gap-2"
                >
                  <Printer className="w-3 h-3" />
                  Print Prescription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMRPrescriptionSystem;
