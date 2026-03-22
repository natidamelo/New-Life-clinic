import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
// import { PlusIcon, EyeIcon, PaperAirplaneIcon, CalendarIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Card } from '../components/ui/card';
import patientService, { Patient } from '../services/patientService';
import userService from '../services/userService';
import { usersAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
// import Dialog from '../components/Dialog'; // Removed due to missing dependencies
import Select from '../components/Select';
import { useNavigate } from 'react-router-dom';
import { safeArray } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

interface Nurse {
  id: string;
  firstName: string;
  lastName: string;
}

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const [showHiddenPatients, setShowHiddenPatients] = useState(false);

  const [isSendNurseModalOpen, setIsSendNurseModalOpen] = useState(false);
  const [patientToSend, setPatientToSend] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedNurseId, setSelectedNurseId] = useState<string | null>(null);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingNurses, setIsLoadingNurses] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true);
        const response = await patientService.getAllPatients(true, true);
        const data = response.patients;
        
        // Get hidden patient IDs from localStorage
        const hiddenPatientIds = JSON.parse(localStorage.getItem('hiddenPatientIds') || '[]');
        
        // Apply hidden status from both server and localStorage
        const updatedData = data.map(patient => ({
          ...patient,
          hidden: patient.hidden || hiddenPatientIds.includes(patient.id)
        }));
        
        setPatients(updatedData);
        setFilteredPatients(updatedData);
      } catch (error) {
        toast.error('Failed to fetch patients');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();

    // Set up localStorage event listener to refresh data when changes occur in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'patientsLastUpdatedAt') {
        fetchPatients();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // This useEffect hook filters patients based on whether they are hidden (archived)
  // and whether the user has toggled the "Show Archived" button
  useEffect(() => {
    if (showHiddenPatients) {
      setFilteredPatients(patients);
    } else {
      setFilteredPatients(patients.filter(patient => !patient.hidden));
    }
  }, [patients, showHiddenPatients]);

  useEffect(() => {
    if (isSendNurseModalOpen) {
      fetchDoctors();
      fetchNurses();
    }
  }, [isSendNurseModalOpen]);

  const fetchDoctors = async () => {
    setIsLoadingDoctors(true);
    try {
      const fetchedDoctors = await userService.getAllDoctors();
      setDoctors(safeArray(fetchedDoctors));
    } catch (error: any) {
      console.error("Error fetching doctors:", error);
      toast.error("Failed to load doctors list.");
      setDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const fetchNurses = async () => {
    setIsLoadingNurses(true);
    try {
      const fetchedNurses = await (usersAPI as any).getUsersByRole('nurse');
      const nursesData = safeArray(fetchedNurses.data).map((nurse: any) => ({
        id: nurse._id || nurse.id,
        firstName: nurse.firstName || 'N/A',
        lastName: nurse.lastName || ''
      }));
      setNurses(nursesData);
    } catch (error: any) {
      console.error("Error fetching nurses:", error);
      toast.error("Failed to load nurses list.");
      setNurses([]);
    } finally {
      setIsLoadingNurses(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewModalOpen(true);
  };

  const handleOpenSendToNurseModal = (patient: Patient) => {
    setPatientToSend(patient);
    setSelectedDoctorId(null);
    setSelectedNurseId(null);
    setIsSendNurseModalOpen(true);
  };

  const cancelSendToNurse = () => {
    setIsSendNurseModalOpen(false);
    setPatientToSend(null);
    setSelectedDoctorId(null);
    setSelectedNurseId(null);
  };

  const confirmSendToNurse = async () => {
    if (!patientToSend || !selectedDoctorId || !selectedNurseId) {
      toast.error('Please select both a nurse and a doctor.');
      return;
    }

    console.log(`Sending patient ${patientToSend.patientId} to nurse ${selectedNurseId}, assigned to doctor ${selectedDoctorId}`);
    
    try {
      // Check payment status before allowing assignment
      console.log('Checking payment status for patient:', patientToSend.id);
      const paymentCheckResponse = await fetch(`/api/billing/invoices?patientId=${patientToSend.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clinic_auth_token') || localStorage.getItem('auth_token') || localStorage.getItem('jwt_token') || ''}`
        }
      });
      
      if (paymentCheckResponse.ok) {
        const invoicesData = await paymentCheckResponse.json();
        const unpaidInvoices = invoicesData.data?.filter((invoice: any) => 
          invoice.status === 'overdue' || invoice.status === 'pending' || invoice.balance > 0
        ) || [];
        
        if (unpaidInvoices.length > 0) {
          const totalUnpaid = unpaidInvoices.reduce((sum: number, invoice: any) => sum + (invoice.balance || 0), 0);
          toast.error(`Payment required! Patient has unpaid invoices totaling $${totalUnpaid.toFixed(2)}. Please process payment at Reception before assignment.`);
          cancelSendToNurse();
          return;
        }
      }
      
      const updatePayload: Partial<Patient> = {
        status: 'Admitted',
        assignedDoctorId: selectedDoctorId,
        assignedNurseId: selectedNurseId,
        lastUpdated: new Date().toISOString()
      };
      
      await patientService.updatePatient(patientToSend.id, updatePayload);
      
      setPatients(prevPatients => 
        prevPatients.map(p => 
          p.id === patientToSend.id 
            ? { ...p, status: 'Admitted', assignedDoctorId: selectedDoctorId, assignedNurseId: selectedNurseId }
            : p 
        )
      );
      
      toast.success(`${patientToSend.firstName} ${patientToSend.lastName} sent to Nurse and assigned.`);
      cancelSendToNurse();
    } catch (error) {
      console.error('Error updating patient for Send to Nurse:', error);
      toast.error('Failed to assign patient. Please try again.');
    }
  };

  const handleScheduleAppointment = (patient: Patient) => {
    console.log('Navigating to schedule Appointment for:', patient.patientId);
    navigate('/appointments', { state: { patientId: patient.id } });
  };

  // Refresh patients list
  const refreshPatients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Refreshing patients list...');
      // Admin page always fetches all patients, including hidden ones
      const fetchedPatientsResponse = await patientService.getAllPatients(true, true);
      
      // Log the response for debugging
      console.log('Refresh patients response:', fetchedPatientsResponse);
      
      if (fetchedPatientsResponse && fetchedPatientsResponse.patients) {
        setPatients(safeArray(fetchedPatientsResponse.patients));
        toast.success(`Successfully refreshed data: ${fetchedPatientsResponse.patients.length} patients loaded`);
      } else {
        setPatients([]);
        toast.error('No patients were found during refresh');
      }
    } catch (err) {
      console.error('Error refreshing patients:', err);
      setError('Failed to fetch patients. Please try again later.');
      setPatients([]);
      toast.error('Failed to refresh patients. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit logic
  const handleEditPatient = (patient: Patient) => {
    setEditForm(patient);
    setIsEditModalOpen(true);
  };
  const handleEditFormChange = (field: keyof Patient, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };
  const handleSaveEdit = async () => {
    if (!editForm.id) return;
    setIsSaving(true);
    try {
      await patientService.updatePatient(editForm.id, editForm);
      setIsEditModalOpen(false);
      setEditForm({});
      await refreshPatients();
      toast.success('Patient updated successfully.');
    } catch (err) {
      toast.error('Failed to update patient.');
    } finally {
      setIsSaving(false);
    }
  };
  // Toggle patient visibility
  const handleToggleVisibility = async (patient: Patient) => {
    try {
      const isHidden = !!patient.hidden;
      const action = isHidden ? 'unhide' : 'hide';
      
      // First update local state immediately for UI responsiveness
      setPatients(prev => 
        prev.map(p => 
          p.id === patient.id 
            ? { ...p, hidden: !isHidden } 
            : p
        )
      );
      
      // Then send update to server
      await patientService.updatePatient(patient.id, { hidden: !isHidden });
      
      // Store current hidden patient IDs in localStorage for persistent hiding
      if (!isHidden) { // Adding a patient to hidden list
        // Get currently hidden patients
        const hiddenPatientIds = JSON.parse(localStorage.getItem('hiddenPatientIds') || '[]');
        // Add this patient if not already in the list
        if (!hiddenPatientIds.includes(patient.id)) {
          hiddenPatientIds.push(patient.id);
          localStorage.setItem('hiddenPatientIds', JSON.stringify(hiddenPatientIds));
        }
      } else { // Removing a patient from hidden list
        // Get currently hidden patients
        const hiddenPatientIds = JSON.parse(localStorage.getItem('hiddenPatientIds') || '[]');
        // Remove this patient
        const updatedHiddenIds = hiddenPatientIds.filter((id: string) => id !== patient.id);
        localStorage.setItem('hiddenPatientIds', JSON.stringify(updatedHiddenIds));
      }
      
      // Set a timestamp in localStorage to force other dashboards to refresh their data
      localStorage.setItem('patientsLastUpdatedAt', Date.now().toString());
      
      toast.success(`Patient ${action}d successfully.`);
    } catch (err) {
      // Revert local state change if API call fails
      setPatients(prev => 
        prev.map(p => 
          p.id === patient.id 
            ? { ...p, hidden: !!patient.hidden } // Revert to original state
            : p
        )
      );
      toast.error(`Failed to ${patient.hidden ? 'unhide' : 'hide'} patient.`);
    }
  };

  // Soft delete logic
  const handleDeletePatient = async (patientId: string) => {
    if (!window.confirm('Are you sure you want to delete this patient?')) return;
    try {
      await patientService.deletePatient(patientId);
      setPatients(prev => prev.filter(p => p.id !== patientId));
      toast.success('Patient deleted (hidden from list).');
    } catch (err) {
      toast.error('Failed to delete patient.');
    }
  };

  return (
    <TooltipProvider>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Patients</h1>
          <div className="flex gap-2">
            <Button className="flex items-center">
              {/* <PlusIcon className="w-5 h-5 mr-2" /> */}
              Add Patient
            </Button>
            <Button variant="outline" onClick={refreshPatients}>Refresh</Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search patients..."
                className="pl-4 pr-4 py-2 border rounded-lg w-64"
              />
            </div>
            <div className="flex space-x-4">
              <Button 
                variant={showHiddenPatients ? "default" : "outline"} 
                onClick={() => setShowHiddenPatients(!showHiddenPatients)}
              >
                {showHiddenPatients ? "Hide Archived" : "Show Archived"}
              </Button>
              <Button variant="outline">Filter</Button>
              <Button variant="outline">Export</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-6">Patient ID</th>
                  <th className="text-left py-4 px-6">Name</th>
                  <th className="text-left py-4 px-6">Contact</th>
                  <th className="text-left py-4 px-6">Last Visit</th>
                  <th className="text-left py-4 px-6">Status</th>
                  <th className="text-left py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">Loading patients...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-destructive">{error}</td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                   <tr className="border-b hover:bg-muted/10">
                     <td className="py-4 px-6 text-center" colSpan={6}>
                       <p className="text-sm text-muted-foreground">No patients found</p>
                     </td>
                   </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className={`border-b hover:bg-muted/10 ${patient.hidden ? 'opacity-60 bg-muted/10' : ''}`}>
                      <td className="py-4 px-6">{patient.patientId || `P00?`}</td>
                      <td className="py-4 px-6">
                        {`${patient.firstName} ${patient.lastName}`}
                        {patient.hidden && <span className="ml-2 text-xs text-muted-foreground">(Archived)</span>}
                      </td>
                      <td className="py-4 px-6">{patient.contactNumber}</td>
                      <td className="py-4 px-6">{formatDate(patient.lastVisit)}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          patient.status === 'Admitted' ? 'bg-primary/20 text-primary' :
                          patient.status === 'Discharged' ? 'bg-primary/20 text-primary' :
                          patient.status === 'Outpatient' ? 'bg-accent/20 text-accent-foreground' :
                          patient.status === 'Emergency' ? 'bg-destructive/20 text-destructive' :
                          patient.status === 'waiting' ? 'bg-muted/20 text-muted-foreground' :
                          patient.status === 'in-progress' ? 'bg-secondary/20 text-secondary-foreground' :
                           patient.status === 'scheduled' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-muted/20 text-muted-foreground'
                        }`}>
                          {patient.status || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-6 space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-muted/20 p-1 rounded" onClick={() => handleViewPatient(patient)}>
                              View
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Details</p>
                          </TooltipContent>
                        </Tooltip>
                        {user?.role === 'admin' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="hover:bg-accent/20 p-1 rounded" onClick={() => handleEditPatient(patient)}>
                                  <span className="material-icons">edit</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="hover:bg-destructive/20 p-1 rounded" onClick={() => handleDeletePatient(patient.id)}>
                                  <span className="material-icons">delete</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className={`p-1 rounded ${patient.hidden ? 'hover:bg-primary/20' : 'hover:bg-muted/20'}`}
                                  onClick={() => handleToggleVisibility(patient)}
                                >
                                  {patient.hidden ? (
                                    "Show"
                                  ) : (
                                    "Hide"
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{patient.hidden ? 'Unhide Patient' : 'Hide Patient'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-primary/20 p-1 rounded" onClick={() => handleOpenSendToNurseModal(patient)}>
                              Send
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send to Nurse</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-primary/20 p-1 rounded" onClick={() => handleScheduleAppointment(patient)}>
                              Schedule
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Schedule Appointment</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {isViewModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Patient Details</h2>
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
          {selectedPatient && (
            <div className="space-y-4 p-4">
              <p><span className="font-semibold">Patient ID:</span> {selectedPatient.patientId}</p>
              <p><span className="font-semibold">Name:</span> {selectedPatient.firstName} {selectedPatient.lastName}</p>
              <p><span className="font-semibold">Gender:</span> {selectedPatient.gender}</p>
              <p><span className="font-semibold">Date of Birth:</span> {formatDate(selectedPatient.dateOfBirth)} (Age: {selectedPatient.age})</p>
              <p><span className="font-semibold">Contact:</span> {selectedPatient.contactNumber}</p>
              <p><span className="font-semibold">Email:</span> {selectedPatient.email || 'N/A'}</p>
              <p><span className="font-semibold">Address:</span> {selectedPatient.address}</p>
              <p><span className="font-semibold">Status:</span> {selectedPatient.status}</p>
              {selectedPatient.hidden && (
                <p><span className="font-semibold text-accent-foreground">Archived Status:</span> <span className="text-accent-foreground">This patient is archived and hidden from the main list</span></p>
              )}
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
            </div>
          </div>
        )}

        {isSendNurseModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Send to Nurse</h2>
                <button 
                  onClick={cancelSendToNurse}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
          {patientToSend && (
            <div className="space-y-4 p-4">
              <p><span className="font-semibold">Patient:</span> {patientToSend.firstName} {patientToSend.lastName}</p>
              <p><span className="font-semibold">Doctor:</span></p>
              <Select
                options={doctors.map(doctor => ({
                  value: doctor.id,
                  label: `${doctor.firstName} ${doctor.lastName}`
                }))}
                value={selectedDoctorId}
                onChange={(value) => setSelectedDoctorId(value)}
              />
              <p><span className="font-semibold">Nurse:</span></p>
              <Select
                options={Array.isArray(nurses) ? nurses.map(nurse => ({
                  value: nurse.id,
                  label: `${nurse.firstName} ${nurse.lastName}`
                })) : []}
                value={selectedNurseId}
                onChange={(value) => setSelectedNurseId(value)}
              />
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={cancelSendToNurse}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={confirmSendToNurse}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
            </div>
          </div>
        )}

        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Patient</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
          {editForm && (
            <div className="space-y-4 p-4">
              <label className="block text-sm font-medium">First Name</label>
              <input
                className="w-full border rounded p-2"
                value={editForm.firstName || ''}
                onChange={e => handleEditFormChange('firstName', e.target.value)}
              />
              <label className="block text-sm font-medium">Last Name</label>
              <input
                className="w-full border rounded p-2"
                value={editForm.lastName || ''}
                onChange={e => handleEditFormChange('lastName', e.target.value)}
              />
              <label className="block text-sm font-medium">Contact Number</label>
              <input
                className="w-full border rounded p-2"
                value={editForm.contactNumber || ''}
                onChange={e => handleEditFormChange('contactNumber', e.target.value)}
              />
              <label className="block text-sm font-medium">Email</label>
              <input
                className="w-full border rounded p-2"
                value={editForm.email || ''}
                onChange={e => handleEditFormChange('email', e.target.value)}
              />
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="hiddenCheckbox"
                  checked={!!editForm.hidden}
                  onChange={e => handleEditFormChange('hidden', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-primary"
                />
                <label htmlFor="hiddenCheckbox" className="text-sm font-medium">
                  Archive Patient (Hide from main list)
                </label>
              </div>
              <div className="flex justify-end pt-4 gap-2">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
            </div>
          </div>
        )}

      </div>
    </TooltipProvider>
  );
};

export default Patients;