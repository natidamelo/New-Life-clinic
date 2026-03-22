import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import patientService from '../services/patientService';
import userService from '../services/userService';

interface Patient {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  patientId?: string;
  age?: number;
  contactNumber?: string;
}

interface Doctor {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
}

interface SharedAppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPatientId?: string;
  onNewPatientClick?: () => void;
}

const appointmentTypes = [
  { value: 'checkup', label: 'Check-up' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'lab-test', label: 'Lab Test Request' },
  { value: 'imaging', label: 'Imaging Request' },
  { value: 'procedure', label: 'Procedure' },
];

const SharedAppointmentForm: React.FC<SharedAppointmentFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPatientId,
  onNewPatientClick
}) => {
  const [patientsForSelect, setPatientsForSelect] = useState<Patient[]>([]);
  const [doctorsForSelect, setDoctorsForSelect] = useState<Doctor[]>([]);
  const [isLoadingPatientsForSelect, setIsLoadingPatientsForSelect] = useState(false);
  const [isLoadingDoctorsForSelect, setIsLoadingDoctorsForSelect] = useState(false);
  
  // Patient search state
  const [filteredPatientsForSelect, setFilteredPatientsForSelect] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  const validationSchema = Yup.object().shape({
    patientId: Yup.string().required('Patient is required'),
    doctorId: Yup.string().required('Doctor is required'),
    appointmentDate: Yup.date()
      .required('Date is required')
      .min(new Date(new Date().setHours(0, 0, 0, 0)), 'Date cannot be in the past'),
    appointmentTime: Yup.string()
      .required('Time is required')
      .test('is-future-time', 'Time cannot be in the past for today\'s date', function(value) {
        const { appointmentDate } = this.parent;
        if (!value || !appointmentDate) return true;

        try {
          const selectedDate = new Date(appointmentDate);
          const today = new Date();
          selectedDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);

          if (selectedDate.getTime() === today.getTime()) {
            const [hours, minutes] = value.split(':').map(Number);
            const selectedDateTime = new Date();
            selectedDateTime.setHours(hours, minutes, 0, 0);
            return selectedDateTime > new Date();
          }
        } catch (e) {
          return false;
        }
        return true;
      }),
    type: Yup.string().required('Appointment type is required'),
    reason: Yup.string().required('Reason for appointment is required'),
    notes: Yup.string(),
  });

  const formik = useFormik({
    initialValues: {
      patientId: initialPatientId || '',
      doctorId: '',
      appointmentDate: '',
      appointmentTime: '',
      type: '',
      reason: '',
      notes: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setSubmitting(true);
      try {
        // Create date in local timezone to avoid UTC conversion issues
        const [year, month, day] = values.appointmentDate.split('-').map(Number);
        const [hours, minutes] = (values.appointmentTime || '00:00').split(':').map(Number);
        
        const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0);
        
        if (isNaN(appointmentDateTime.getTime())) {
          throw new Error("Invalid date or time selected.");
        }

        console.log("Submitting appointment:", values);
        
        // Validate required fields before sending
        if (!values.patientId || !values.doctorId || !values.type) {
          throw new Error("Missing required fields: patient, doctor, or type");
        }
        
        const appointmentData = {
          patient: values.patientId,
          doctor: values.doctorId,
          dateTime: appointmentDateTime.toISOString(),
          type: values.type,
          reason: values.reason || '',
          notes: values.notes || '',
          durationMinutes: 30
        };
        
        console.log("Sending appointment data:", appointmentData);

        const response = await api.post('/api/appointments', appointmentData);
        toast.success('Appointment scheduled successfully!');
        resetForm();
        onClose();
        onSuccess();
      } catch (error: any) {
        console.error('Error scheduling appointment:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to schedule appointment.';
        toast.error(`Scheduling failed: ${errorMessage}`);
      } finally {
        setSubmitting(false);
      }
    },
    enableReinitialize: true
  });

  // Fetch patients for appointment scheduling
  const fetchPatientsForSelect = async () => {
    setIsLoadingPatientsForSelect(true);
    try {
      const response = await patientService.getAllPatients(false, false, 1000);
      const patientsData = response.patients || [];
      setPatientsForSelect(patientsData);
      setFilteredPatientsForSelect(patientsData);
    } catch (error) {
      console.error('Error fetching patients for select:', error);
      toast.error('Failed to load patients');
    } finally {
      setIsLoadingPatientsForSelect(false);
    }
  };

  // Fetch doctors for appointment scheduling
  const fetchDoctorsForSelect = async () => {
    setIsLoadingDoctorsForSelect(true);
    try {
      const doctorsData = await userService.getAllDoctors();
      setDoctorsForSelect(doctorsData || []);
    } catch (error) {
      console.error('Error fetching doctors for select:', error);
      toast.error('Failed to load doctors');
    } finally {
      setIsLoadingDoctorsForSelect(false);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPatientsForSelect();
      fetchDoctorsForSelect();
      formik.resetForm({ values: { ...formik.initialValues, patientId: initialPatientId || '' } });
    }
  }, [isOpen, initialPatientId]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.patient-search-container')) {
        setShowPatientDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={formik.handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Patient *</Label>
              {onNewPatientClick && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onNewPatientClick();
                    onClose();
                  }}
                  className="ml-2"
                >
                  <UserPlusIcon className="w-4 h-4 mr-1" />
                  New Patient
                </Button>
              )}
            </div>
            <div className="relative patient-search-container">
              <input
                type="text"
                placeholder={isLoadingPatientsForSelect ? 'Loading patients...' : 'Search patients...'}
                className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2 pr-10"
                value={patientSearchTerm || (formik.values.patientId ? 
                  patientsForSelect.find(p => (p._id || p.id) === formik.values.patientId)?.firstName + ' ' + 
                  patientsForSelect.find(p => (p._id || p.id) === formik.values.patientId)?.lastName + 
                  ' (' + (patientsForSelect.find(p => (p._id || p.id) === formik.values.patientId)?.patientId || 'N/A') + ')' : 
                  '')}
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase();
                  const filteredPatients = patientsForSelect.filter(patient => 
                    patient.firstName?.toLowerCase().includes(searchTerm) ||
                    patient.lastName?.toLowerCase().includes(searchTerm) ||
                    patient.patientId?.toLowerCase().includes(searchTerm)
                  );
                  setFilteredPatientsForSelect(filteredPatients);
                  setPatientSearchTerm(searchTerm);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                disabled={isLoadingPatientsForSelect}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {formik.values.patientId && (
                  <button
                    type="button"
                    onClick={() => {
                      formik.setFieldValue('patientId', '');
                      setPatientSearchTerm('');
                      setShowPatientDropdown(false);
                    }}
                    className="mr-2 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              
              {/* Patient Search Dropdown */}
              {showPatientDropdown && !isLoadingPatientsForSelect && (
                <div className="absolute z-10 w-full mt-1 bg-primary-foreground border border-border/40 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredPatientsForSelect.length > 0 ? (
                    filteredPatientsForSelect.map((patient, index) => (
                      <div
                        key={patient._id || patient.id || `patient-select-${index}`}
                        className="px-4 py-2 hover:bg-muted/20 cursor-pointer border-b border-border/20 last:border-b-0"
                        onClick={() => {
                          formik.setFieldValue('patientId', patient._id || patient.id);
                          setShowPatientDropdown(false);
                          setPatientSearchTerm('');
                        }}
                      >
                        <div className="font-medium text-muted-foreground">
                          {patient?.firstName || ''} {patient?.lastName || ''}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {patient?.patientId || 'N/A'} • Age: {patient?.age || 'N/A'} • {patient?.contactNumber || 'No contact'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-muted-foreground text-sm">
                      {patientSearchTerm ? 'No patients found' : 'Start typing to search patients...'}
                    </div>
                  )}
                </div>
              )}
            </div>
            {formik.touched.patientId && formik.errors.patientId && (
              <p className="mt-1 text-xs text-destructive">{String(formik.errors.patientId)}</p>
            )}

            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Doctor *</Label>
              <select
                id="doctorId"
                name="doctorId"
                value={formik.values.doctorId}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`block w-full rounded-lg border ${
                  formik.touched.doctorId && formik.errors.doctorId
                    ? 'border-destructive/40 focus:ring-red-500'
                    : 'border-border/40 focus:ring-blue-500'
                } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
                disabled={isLoadingDoctorsForSelect}
              >
                <option value="">{isLoadingDoctorsForSelect ? 'Loading...' : '-- Select Doctor --'}</option>
                {doctorsForSelect.map((doctor, index) => (
                  <option key={doctor._id || doctor.id || `doctor-select-${index}`} value={doctor._id || doctor.id}>
                    Dr. {doctor.firstName} {doctor.lastName}
                  </option>
                ))}
              </select>
              {formik.touched.doctorId && formik.errors.doctorId && (
                <p className="mt-1 text-xs text-destructive">{String(formik.errors.doctorId)}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appointmentDate">Date *</Label>
                <Input
                  type="date"
                  id="appointmentDate"
                  name="appointmentDate"
                  value={formik.values.appointmentDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  min={new Date().toISOString().split('T')[0]}
                  className={formik.touched.appointmentDate && formik.errors.appointmentDate ? 'border-destructive' : ''}
                  required
                />
                {formik.touched.appointmentDate && formik.errors.appointmentDate && (
                  <p className="mt-1 text-xs text-destructive">{String(formik.errors.appointmentDate)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="appointmentTime">Time *</Label>
                <Input
                  type="time"
                  id="appointmentTime"
                  name="appointmentTime"
                  value={formik.values.appointmentTime}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={formik.touched.appointmentTime && formik.errors.appointmentTime ? 'border-destructive' : ''}
                  required
                />
                {formik.touched.appointmentTime && formik.errors.appointmentTime && (
                  <p className="mt-1 text-xs text-destructive">{String(formik.errors.appointmentTime)}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                name="type"
                value={formik.values.type}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`block w-full rounded-lg border ${
                  formik.touched.type && formik.errors.type
                    ? 'border-destructive/40 focus:ring-red-500'
                    : 'border-border/40 focus:ring-blue-500'
                } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
              >
                <option value="">-- Select Type --</option>
                {appointmentTypes.map((type, index) => (
                  <option key={type.value || `appointment-type-${index}`} value={type.value}>{type.label}</option>
                ))}
              </select>
              {formik.touched.type && formik.errors.type && (
                <p className="mt-1 text-xs text-destructive">{String(formik.errors.type)}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Input
                type="text"
                id="reason"
                name="reason"
                value={formik.values.reason}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Reason for appointment"
                className={formik.touched.reason && formik.errors.reason ? 'border-destructive' : ''}
                required
              />
              {formik.touched.reason && formik.errors.reason && (
                <p className="mt-1 text-xs text-destructive">{String(formik.errors.reason)}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                value={formik.values.notes}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                formik.resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formik.isSubmitting || !formik.isValid}
            >
              {formik.isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SharedAppointmentForm;
