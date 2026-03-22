import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { SearchableCombobox, ComboboxOption } from '../../components/ui/searchable-combobox';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import serviceRequestService from '../../services/serviceRequestService';
import patientService from '../../services/patientService';
import serviceService from '../../services/serviceService';
import userService from '../../services/userService';
import { debounce } from 'lodash'; // Import debounce from lodash
import { extractErrorMessage } from '../../utils/errorUtils';
import { safeErrorToString } from '../../utils/errorHandler';

interface Patient {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  contactNumber: string;
}

interface Service {
  _id: string;
  name: string;
  category: string;
  price: number;
}

interface Staff {
  _id: string;
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
}

const ServiceRequestForm: React.FC = () => {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [patient, setPatient] = useState<Patient>({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    contactNumber: ''
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ComboboxOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [staffOptions, setStaffOptions] = useState<ComboboxOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update available staff when service is selected
  useEffect(() => {
    if (selectedServiceId) {
      const service = services.find(s => s._id === selectedServiceId);
      setSelectedService(service || null);
      
      if (service) {
        const departmentMap: Record<string, string[]> = {
          'injection': ['nurse'],
          'procedure': ['nurse'],
          'imaging': ['imaging'], // Only imaging staff can handle imaging
          'ultrasound': ['imaging'], // Only imaging staff can handle ultrasound
          'lab': ['nurse', 'lab_technician'],
          'blood_test': ['nurse', 'lab_technician'],
          'rbs': ['nurse', 'lab_technician'],
          'consultation': ['doctor']
        };
        
        const allowedRoles = departmentMap[service.category.toLowerCase()] || ['nurse'];
        const filteredStaff = allStaff
          .filter(staff => staff && (staff._id || staff.id)) // Ensure staff has valid ID
          .filter(staff => 
            allowedRoles.includes(staff.role.toLowerCase()) ||
            allowedRoles.some((role: string) => staff.role.toLowerCase().includes(role))
          );
        
        console.log('ServiceRequestForm: Available staff for service:', service.name, filteredStaff);
        setAvailableStaff(filteredStaff);
        
        // Create staff options for the searchable combobox
        const staffOpts: ComboboxOption[] = filteredStaff.map((staff) => ({
          value: staff._id || staff.id,
          label: `${staff.firstName} ${staff.lastName} (${staff.role})`,
          searchTerms: [staff.firstName.toLowerCase(), staff.lastName.toLowerCase(), staff.role.toLowerCase()]
        }));
        setStaffOptions(staffOpts);
        
        setSelectedStaffId(''); // Reset selection when service changes
        setErrorMessage(''); // Clear any previous errors when changing service
      }
    } else {
      setAvailableStaff([]);
      setStaffOptions([]);
      setSelectedStaffId('');
    }
  }, [selectedServiceId, services, allStaff]);

  const fetchData = async () => {
    try {
      console.log('ServiceRequestForm: Starting to fetch data...');
      
      // Fetch services
      console.log('ServiceRequestForm: Fetching services...');
      const servicesResponse = await serviceService.getServices({ isActive: true });
      console.log('ServiceRequestForm: Services response:', servicesResponse);
      
      // Ensure services are set even if empty and filter out invalid services
      const validServices = (servicesResponse || []).filter((s: any) => s && s._id);
      console.log('ServiceRequestForm: Valid services:', validServices);
      setServices(validServices);
      
      // Create service options for the searchable combobox
      const options: ComboboxOption[] = validServices.map((service: Service) => ({
        value: service._id,
        label: `${service.name} - ${service.price} ETB (${service.category})`,
        searchTerms: [service.name.toLowerCase(), service.category.toLowerCase(), service.price.toString()]
      }));
      setServiceOptions(options);
      
      // Fetch all staff types
      console.log('ServiceRequestForm: Fetching staff...');
      const [nursesData, doctorsData, imagingData, usersData] = await Promise.all([
        userService.getUsersByRole('nurse').catch((err) => {
          console.error('Error fetching nurses:', err);
          return [];
        }),
        userService.getUsersByRole('doctor').catch((err) => {
          console.error('Error fetching doctors:', err);
          return [];
        }),
        userService.getUsersByRole('imaging').catch((err) => {
          console.error('Error fetching imaging staff:', err);
          return [];
        }),
        userService.getUsers().catch((err) => {
          console.error('Error fetching users:', err);
          return [];
        })
      ]);
      
      console.log('ServiceRequestForm: Nurses data:', nursesData);
      console.log('ServiceRequestForm: Doctors data:', doctorsData);
      console.log('ServiceRequestForm: Imaging data:', imagingData);
      console.log('ServiceRequestForm: Users data:', usersData);
      
      // Combine all staff types
      const nurses = (nursesData || []).map((n: any) => ({ ...n, role: 'nurse' }));
      const doctors = (doctorsData || []).map((d: any) => ({ ...d, role: 'doctor' }));
      const imagingStaff = (imagingData || []).map((i: any) => ({ ...i, role: 'imaging' }));
      const labTechs = (usersData || [])
        .filter((u: any) => u.role && u.role.toLowerCase().includes('lab'))
        .map((u: any) => ({ ...u, role: 'lab_technician' }));
      
      const combinedStaff = [...nurses, ...doctors, ...imagingStaff, ...labTechs];
      console.log('ServiceRequestForm: Combined staff:', combinedStaff);
      
      setAllStaff(combinedStaff);
      
    } catch (error) {
      console.error('ServiceRequestForm: Error fetching data:', error);
      toast.error('Failed to load form data');
      
      // Remove mock data fallback
      setServices([]);
      setAllStaff([]);
    }
  };

  const getDepartmentLabel = (service: Service | null) => {
    if (!service) return 'Staff Member';
    
    const departmentMap: Record<string, string> = {
      'injection': 'Nurse',
      'procedure': 'Nurse',
      'imaging': 'Imaging',
      'ultrasound': 'Imaging',
      'lab': 'Nurse/Lab Tech',
      'blood_test': 'Nurse/Lab Tech',
      'rbs': 'Nurse/Lab Tech',
      'consultation': 'Doctor'
    };
    
    return departmentMap[service.category.toLowerCase()] || 'Staff Member';
  };

  const handleInputChange = (field: string, value: string) => {
    setPatient(prev => ({ ...prev, [field]: value }));
  };

  const handlePatientSearch = React.useCallback(debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    try {
      const patients = await patientService.searchPatients(query);
      // Ensure patients is an array before calling slice
      const patientsArray = Array.isArray(patients) ? patients : [];
      setSearchResults(patientsArray.slice(0, 10)); // Limit to 10 results
      setShowSearchResults(true);
    } catch (err) {
      console.error('Patient search error', err);
      toast.error('Search failed');
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, 500), []); // Debounce by 500ms

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

  const handleSelectExistingPatient = (p: any) => {
    setPatient({
      firstName: p.firstName,
      lastName: p.lastName,
      age: p.age?.toString() || '',
      gender: p.gender,
      contactNumber: p.contactNumber,
    });
    setSelectedPatientId(p._id || p.id);
    setSearchQuery(`${p.firstName} ${p.lastName}`); // Set the full name in the search input
    setSearchResults([]); // Clear search results after selection
    setShowSearchResults(false); // Hide search results
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMessage(''); // Clear any previous errors

    if (!selectedServiceId || !selectedStaffId) {
      toast.error('Please select service and staff member');
      setLoading(false);
      return;
    }

    // Validate patient gender when creating a new patient
    if (!selectedPatientId && !patient.gender) {
      toast.error('Please select patient gender');
      setLoading(false);
      return;
    }

    try {
      const requestData: any = {
        serviceId: selectedServiceId,
        assignedNurseId: selectedStaffId, // Backend still expects this field name
      };

      if (selectedPatientId) {
        requestData.patientId = selectedPatientId;
      } else {
        requestData.patientInfo = {
          firstName: patient.firstName,
          lastName: patient.lastName,
          age: parseInt(patient.age, 10) || 0,
          gender: patient.gender,
          contactNumber: patient.contactNumber,
        };
      }

      await serviceRequestService.createServiceRequest(requestData);

      toast.success('Service request submitted successfully');
      
      // Redirect to Reception Dashboard when done
      navigate('/app/reception', { replace: true });

    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error response data:', error.response?.data);
      const errorMsg = extractErrorMessage(error) || 'Failed to submit request';
      console.log('Final error message:', errorMsg);
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full max-w-none mx-auto">
      {/* Search existing patient */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find Existing Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative" ref={searchRef}>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Input 
                  value={searchQuery} 
                  onChange={handleSearchInputChange} 
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSearchResults(true);
                    }
                  }}
                  placeholder="Enter patient name or ID..." 
                  className="w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-primary-foreground border border-border/30 rounded-md shadow-lg max-h-48 overflow-y-auto">
                <ul className="divide-y divide-gray-100">
                  {searchResults.map((p) => (
                    <li 
                      key={p._id || p.id} 
                      className="px-4 py-3 hover:bg-primary/10 cursor-pointer transition-colors duration-150"
                      onClick={() => handleSelectExistingPatient(p)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {p.patientId}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground/50">
                          {p.age && `${p.age} years`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {showSearchResults && searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-primary-foreground border border-border/30 rounded-md shadow-lg">
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  No patients found for "{searchQuery}"
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Service Request</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-destructive/50" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive">
                    Service Request Failed
                  </h3>
                  <div className="mt-2 text-sm text-destructive">
                    {safeErrorToString(errorMessage)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={patient.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={patient.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Age</Label>
                <Input
                  type="number"
                  value={patient.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={patient.gender}
                  onValueChange={(val) => handleInputChange('gender', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Contact Number</Label>
                <Input
                  value={patient.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Service</Label>
                <SearchableCombobox
                  options={serviceOptions}
                  value={selectedServiceId}
                  onValueChange={(val) => {
                    console.log('Service selected:', val);
                    setSelectedServiceId(val);
                  }}
                  placeholder="Select service"
                  searchPlaceholder="Search services..."
                  emptyMessage="No services found."
                  className="w-full"
                />
                {selectedService && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {selectedService.name} - {selectedService.price} ETB
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {services.length} services available
                </p>
              </div>
              <div>
                <Label>{getDepartmentLabel(selectedService)}</Label>
                <SearchableCombobox
                  options={staffOptions}
                  value={selectedStaffId}
                  onValueChange={(val) => setSelectedStaffId(val)}
                  placeholder={selectedServiceId ? `Select ${getDepartmentLabel(selectedService).toLowerCase()}` : "Select service first"}
                  searchPlaceholder="Search staff..."
                  emptyMessage="No staff available for this service."
                  disabled={!selectedServiceId}
                  className="w-full"
                />
                {selectedService && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Available for: {selectedService.category} services
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading || !selectedServiceId || !selectedStaffId}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceRequestForm; 