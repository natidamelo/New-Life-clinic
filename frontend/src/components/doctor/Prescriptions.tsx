import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, FileText, PlusCircle } from 'lucide-react';
import ProfessionalPrescriptionForm from './ProfessionalPrescriptionForm';
import { toast } from 'react-toastify';
import prescriptionService from '../../services/prescriptionService';
import { useAuth } from '../../context/AuthContext';

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  prescriptionDate: string;
  diagnosis: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  status: string;
}

const Prescriptions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<Prescription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const { user, isAuthenticated } = useAuth();
  const doctorId = user?.id || user?._id;
  
  // Fetch prescriptions data on component mount
  useEffect(() => {
    fetchPrescriptions();
  }, []);
  
  // Filter prescriptions when tab changes or search query updates
  useEffect(() => {
    filterPrescriptions();
  }, [activeTab, searchQuery, prescriptions]);
  
  // Get token from multiple possible storage locations for maximum compatibility
  const getEffectiveToken = () => {
    return localStorage.getItem('AUTH_TOKEN_KEY') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('auth_token') || 
           localStorage.getItem('jwt_token') || 
           localStorage.getItem('token');
  };
  
  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      // Fetch prescriptions from backend API using the service
      let fetchedPrescriptions = [];
      
      if (doctorId) {
        console.log('Fetching prescriptions for doctor:', doctorId);
        fetchedPrescriptions = await prescriptionService.getPrescriptionsByDoctor(doctorId);
      } else if (user?.id || user?._id) {
        // If user is a patient, fetch their prescriptions
        console.log('Fetching prescriptions for patient:', user?.id || user?._id);
        fetchedPrescriptions = await prescriptionService.getPrescriptionsByPatient(user?.id || user?._id);
      }
      
      console.log('Fetched prescriptions:', fetchedPrescriptions);
      
      // Map backend data to the format expected by the component
      const formattedPrescriptions = fetchedPrescriptions.map((prescription: any) => ({
        id: prescription._id || prescription.id,
        patientId: prescription.patient || prescription.patientId,
        patientName: prescription.patientName || 'Patient Name',
        prescriptionDate: new Date(prescription.createdAt || prescription.date).toISOString().split('T')[0],
        diagnosis: prescription.diagnosis || 'Prescription',
        medications: [{
          name: prescription.medicationName || 'Medication',
          dosage: prescription.dosage || '',
          frequency: prescription.frequency || '',
          duration: prescription.duration || '',
          instructions: prescription.notes || ''
        }],
        status: prescription.status || 'Active'
      }));
      
      setPrescriptions(formattedPrescriptions);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast.error('Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  };
  
  const filterPrescriptions = () => {
    let filtered = prescriptions;
    
    // Filter by status
    filtered = filtered.filter(prescription => 
      activeTab === 'active' ? prescription.status === 'Active' : prescription.status === 'Past'
    );
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prescription => 
        prescription.patientName.toLowerCase().includes(query) || 
        prescription.patientId.toLowerCase().includes(query) ||
        prescription.diagnosis.toLowerCase().includes(query) ||
        prescription.medications.some(med => med.name.toLowerCase().includes(query))
      );
    }
    
    setFilteredPrescriptions(filtered);
  };
  
  const handlePrescriptionSubmit = async (data: any) => {
    try {
      console.log('Prescription form data:', data);
      
      // Prepare the medication entry for the API
      const medicationEntry = {
        name: data.medicationName,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration || '',
        instructions: data.notes || ''
      };
      
      // Prepare the payload for the API
      const payload = {
        patient: data.patientId || data.patient?.id,
        visitId: data.visitId || '',
        medicationName: data.medicationName,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        route: data.route,
        refills: data.refills ? parseInt(data.refills) : 0,
        notes: data.notes
      };
      
      // Get the token
      const token = getEffectiveToken();
      
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication error. Please log in again.');
        return;
      }
      
      if (!doctorId) {
        console.error('No doctor ID found');
        toast.error('Doctor ID not found. Please log in again.');
        return;
      }
      
      // Call the service to create the prescription in the backend
      const createdPrescription = await prescriptionService.createPrescription(
        payload, 
        token,
        doctorId
      );
      
      console.log('Prescription created:', createdPrescription);
      
      // Refresh the prescriptions list from the server
      fetchPrescriptions();
      
      // Close the form
      setShowPrescriptionForm(false);
      setSelectedPatient(null);
      
    } catch (error) {
      console.error('Error submitting prescription:', error);
      // Don't show another error toast here, as the service will already show one
    }
  };
  
  const handleCreatePrescription = (patient: { id: string; name: string }) => {
    setSelectedPatient(patient);
    setShowPrescriptionForm(true);
  };

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    // In a real app, you might navigate to a detailed view or show a modal
    toast(`Viewing prescription for ${prescription.patientName}`);
  };
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-muted-foreground">Prescriptions</h2>
        <button
          onClick={() => {
            // Get patient from current appointment or first in list
            const selectedAppointment = JSON.parse(localStorage.getItem('doctorAppointments') || '[]')[0];
            if (selectedAppointment) {
              handleCreatePrescription({
                id: selectedAppointment.patientId,
                name: selectedAppointment.patientName
              });
            } else {
              toast.warning('Please select a patient first');
            }
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Prescription
        </button>
      </div>
      
      <div className="bg-primary-foreground shadow rounded-lg overflow-hidden">
        <div className="border-b border-border/30">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('active')}
              className={`${
                activeTab === 'active'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
            >
              Active Prescriptions
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`${
                activeTab === 'past'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border/40'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
            >
              Past Prescriptions
            </button>
          </nav>
        </div>
        
        <div className="p-4">
          <div className="flex justify-between mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <input
                type="text"
                placeholder="Search by patient name, ID or diagnosis"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 shadow-sm focus:ring-blue-500 focus:border-primary block w-full sm:text-sm border-border/40 rounded-md"
              />
            </div>
            <button
              onClick={fetchPrescriptions}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-border/40 text-sm leading-4 font-medium rounded-md text-muted-foreground bg-primary-foreground hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <RefreshCw className="animate-spin h-6 w-6 text-primary mr-2" />
              <span>Loading prescriptions...</span>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="text-center py-6 bg-muted/10 rounded">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-2 text-sm font-medium text-muted-foreground">No prescriptions found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === 'active' ? 'No active prescriptions' : 'No past prescriptions'}
              </p>
            </div>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Diagnosis
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Medications
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-primary-foreground divide-y divide-gray-200">
                  {filteredPrescriptions.map((prescription) => (
                    <tr key={prescription.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-muted-foreground">{prescription.patientName}</div>
                        <div className="text-sm text-muted-foreground">ID: {prescription.patientId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">{prescription.prescriptionDate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">{prescription.diagnosis}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-muted-foreground">
                          {prescription.medications.map((med, index) => (
                            <div key={index} className="mb-1">
                              {med.name} {med.dosage}
                              {index < prescription.medications.length - 1 && ', '}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <button 
                          onClick={() => handleViewPrescription(prescription)}
                          className="text-primary hover:text-primary"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Removed duplicate prescription form dialog */}
    </div>
  );
};

export default Prescriptions; 