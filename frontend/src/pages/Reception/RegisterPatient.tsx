import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import patientService, { CreatePatientDto } from '../../services/patientService';
import { useCardTypes } from '../../context/CardTypeContextNew';
import { Button } from '../../components/ui/button';
// import { IdentificationIcon, HeartIcon } from '@heroicons/react/24/outline';

const departments = [
  { value: 'general', label: 'General Medicine' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'dental', label: 'Dental' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'ophthalmology', label: 'Ophthalmology' },
];

const priorityOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'emergency', label: 'Emergency' },
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];

// Validate real phone number: digits only 9–15 chars; Ethiopian 09XXXXXXXX or 9XXXXXXXX or +2519XXXXXXXX
const phoneRegex = /^[\d\s\-+()]{9,20}$/;
const isValidPhone = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return false;
  // Ethiopian local: 09XXXXXXXX (10) or 9XXXXXXXX (9)
  if (digits.length === 9) return /^9\d{8}$/.test(digits);
  if (digits.length === 10) return /^09\d{8}$/.test(digits);
  // Ethiopian with country code: 2519XXXXXXXX (12)
  if (digits.length === 12) return /^2519\d{8}$/.test(digits);
  // Other international: 11–15 digits, must start with country code (e.g. 1–3 digits then rest)
  return true;
};

const validationSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  age: Yup.number()
    .typeError('Age must be a number')
    .required('Age is required')
    .min(0, 'Age must be positive'),
  ageUnit: Yup.string().oneOf(['years', 'months', 'days']).required('Age unit is required'),
  gender: Yup.string().required('Gender is required'),
  contactNumber: Yup.string()
    .required('Contact number is required')
    .matches(phoneRegex, 'Enter a valid phone number (e.g. 0912345678 or +251912345678)')
    .test('valid-phone', 'Enter a valid phone number (e.g. 0912345678 or +251912345678)', (value) => !value || isValidPhone(value)),
  email: Yup.string().email('Invalid email address'),
  address: Yup.string().required('Address is required'),
  department: Yup.string().required('Department is required'),
  priority: Yup.string().required('Priority is required'),
  insuranceProvider: Yup.string(),
  insuranceNumber: Yup.string(),
  faydaId: Yup.string(),
  medicalHistory: Yup.string(),
  allergies: Yup.string(),
  notes: Yup.string(),
  selectedCardTypeId: Yup.string().required('Card type is required')
});

const RegisterPatient: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFormTab, setCurrentFormTab] = useState<'personal' | 'medical'>('personal');
  const { cardTypes } = useCardTypes();

  useEffect(() => {
    // Card types are now managed by CardTypeContext, no need to fetch here
  }, []);

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      age: '',
      ageUnit: 'years',
      gender: 'male',
      contactNumber: '',
      email: '',
      address: '',
      department: 'general',
      priority: 'normal',
      insuranceProvider: '',
      insuranceNumber: '',
      faydaId: '',
      medicalHistory: '',
      allergies: '',
      notes: '',
      selectedCardTypeId: ''
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsSubmitting(true);
      try {
        const normalizeAgeToYears = (ageValue: any, unit: string) => {
          const numericAge = Number(ageValue);
          if (!Number.isFinite(numericAge) || numericAge < 0) return 0;
          if (unit === 'months') return Number((numericAge / 12).toFixed(2));
          if (unit === 'days') return Number((numericAge / 365).toFixed(2));
          return numericAge;
        };

        const newPatientData: CreatePatientDto = {
          firstName: values.firstName,
          lastName: values.lastName,
          age: normalizeAgeToYears(values.age, (values as any).ageUnit),
          gender: values.gender,
          contactNumber: values.contactNumber,
          email: values.email,
          address: values.address,
          department: values.department,
          priority: values.priority as 'normal' | 'urgent' | 'emergency',
          medicalHistory: values.medicalHistory,
          allergies: values.allergies,
          notes: values.notes,
          insuranceProvider: values.insuranceProvider,
          insuranceNumber: values.insuranceNumber,
          faydaId: values.faydaId,
          selectedCardTypeId: values.selectedCardTypeId || undefined
        };
        
        console.log("Submitting new patient data:", newPatientData);
        const registrationResponse = await patientService.createPatient(newPatientData);
        const createdPatient = registrationResponse?.data || registrationResponse;
        
        if (createdPatient) {
          // Find selected card type details
          const selectedCardType = values.selectedCardTypeId ? 
            cardTypes.find(card => card._id === values.selectedCardTypeId) : null;
          
          // Show success notification
          toast.success(`Patient ${values.firstName} ${values.lastName} registered successfully!`, {
            duration: 4000,
            position: 'top-right',
          });

          // Warn if invoice creation failed on the backend
          if (registrationResponse?.invoiceError) {
            toast.error(registrationResponse.invoiceError, { duration: 8000, position: 'top-right' });
            console.error('Invoice creation failed:', registrationResponse.invoiceErrorDetail);
          }
          
          // Reset form
          resetForm();
          
          // Create notification message with card payment info if card was selected
          let notificationMessage = `New patient ${values.firstName} ${values.lastName} has been registered`;
          if (selectedCardType) {
            notificationMessage += ` with ${selectedCardType.name} card (ETB ${selectedCardType.price})`;
          }
          
          // Dispatch patient registration event
          window.dispatchEvent(new CustomEvent('patientRegistered', {
            detail: {
              patient: createdPatient,
              message: notificationMessage,
              cardType: selectedCardType,
              hasCardPayment: !!selectedCardType
            }
          }));
          console.log('RegisterPatient: patientRegistered event dispatched.');
          
          // If patient was registered with a card, create a payment notification
          if (selectedCardType) {
            // Create card payment notification
            window.dispatchEvent(new CustomEvent('cardPaymentRequired', {
              detail: {
                patient: createdPatient,
                cardType: selectedCardType,
                amount: selectedCardType.price,
                type: 'card_payment_required',
                title: 'Card Payment Required',
                message: `${selectedCardType.name} card payment required for ${values.firstName} ${values.lastName}`,
                priority: 'high',
                timestamp: new Date()
              }
            }));
            console.log('RegisterPatient: cardPaymentRequired event dispatched.');
            
            // Redirect to billing area when payment is required
            setTimeout(() => {
              navigate('/app/billing/invoices');
            }, 1000);
          } else {
            // Navigate back to reception dashboard if no payment required
            setTimeout(() => {
              navigate('/app/reception');
            }, 1000);
          }
        } else {
          // This case should ideally not be hit if createPatient throws an error on failure
          toast.error('Failed to register patient. No patient data returned.', {
            duration: 5000,
            position: 'top-right',
          });
        }
      } catch (error: any) {
        console.error("Error during patient registration:", error);
        const isDuplicate = error?.response?.status === 409 || error?.response?.data?.code === 'PATIENT_DUPLICATE';
        const apiMessage = error?.response?.data?.message;
        const existing = error?.response?.data?.existingPatient;
        if (isDuplicate) {
          const who = existing
            ? `${existing.firstName} ${existing.lastName}${existing.contactNumber ? ` (${existing.contactNumber})` : ''}`
            : 'matching name, phone number, email, or Fayda ID';
          toast.error(`Patient already registered: ${who}. Use search to find and update the existing record.`, {
            duration: 6000,
            position: 'top-right',
          });
          if (existing?._id) {
            window.dispatchEvent(new CustomEvent('patientDuplicateFound', { detail: { existingPatient: existing } }));
          }
        } else {
          toast.error(apiMessage || error?.message || 'Failed to register patient. Please try again.', {
            duration: 5000,
            position: 'top-right',
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Register New Patient</h1>
      <form onSubmit={formik.handleSubmit} className="space-y-6 bg-primary-foreground p-6 rounded-xl shadow border">
        {/* Tab Navigation */}
        <div className="flex justify-between bg-muted/10 rounded-lg p-1 mb-4">
          <button
            type="button"
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${currentFormTab === 'personal' ? 'bg-primary-foreground shadow text-primary' : 'text-muted-foreground hover:bg-primary-foreground/50'}`}
            onClick={() => setCurrentFormTab('personal')}
          >
            {/* <IdentificationIcon className="w-5 h-5 mr-2" /> */}
            Personal & Contact Info
          </button>
          <button
            type="button"
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${currentFormTab === 'medical' ? 'bg-primary-foreground shadow text-primary' : 'text-muted-foreground hover:bg-primary-foreground/50'}`}
            onClick={() => setCurrentFormTab('medical')}
          >
            {/* <HeartIcon className="w-5 h-5 mr-2" /> */}
            Medical Information
          </button>
        </div>
        {/* Form Content */}
        {currentFormTab === 'personal' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">First Name *</label>
              <input type="text" id="firstName" name="firstName" value={formik.values.firstName} onChange={formik.handleChange} onBlur={formik.handleBlur} className={`block w-full rounded-lg border ${formik.touched.firstName && formik.errors.firstName ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`} placeholder="Enter first name" />
              {formik.touched.firstName && formik.errors.firstName && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.firstName)}</p>)}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Last Name *</label>
              <input type="text" id="lastName" name="lastName" value={formik.values.lastName} onChange={formik.handleChange} onBlur={formik.handleBlur} className={`block w-full rounded-lg border ${formik.touched.lastName && formik.errors.lastName ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`} placeholder="Enter last name" />
              {formik.touched.lastName && formik.errors.lastName && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.lastName)}</p>)}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Age *</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" id="age" name="age" value={formik.values.age as any} onChange={formik.handleChange} onBlur={formik.handleBlur} className={`block w-full rounded-lg border ${formik.touched.age && formik.errors.age ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`} placeholder="Enter age" min={0} />
                <select id="ageUnit" name="ageUnit" value={(formik.values as any).ageUnit} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2">
                  <option value="years">Years</option>
                  <option value="months">Months</option>
                  <option value="days">Days</option>
                </select>
              </div>
              {formik.touched.age && formik.errors.age && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.age)}</p>)}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Gender *</label>
              <select id="gender" name="gender" value={formik.values.gender} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2">
                {genderOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
              </select>
              {formik.touched.gender && formik.errors.gender && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.gender)}</p>)}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Contact Number *</label>
              <input type="text" id="contactNumber" name="contactNumber" value={formik.values.contactNumber} onChange={formik.handleChange} onBlur={formik.handleBlur} className={`block w-full rounded-lg border ${formik.touched.contactNumber && formik.errors.contactNumber ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`} placeholder="e.g. 0912345678 or +251912345678" />
              {formik.touched.contactNumber && formik.errors.contactNumber && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.contactNumber)}</p>)}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
              <input type="email" id="email" name="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} className={`block w-full rounded-lg border ${formik.touched.email && formik.errors.email ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`} placeholder="Enter email (optional)" />
              {formik.touched.email && formik.errors.email && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.email)}</p>)}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Fayda ID</label>
              <input type="text" id="faydaId" name="faydaId" value={formik.values.faydaId} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2" placeholder="Enter Fayda ID (optional)" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Address *</label>
              <input type="text" id="address" name="address" value={formik.values.address} onChange={formik.handleChange} onBlur={formik.handleBlur} className={`block w-full rounded-lg border ${formik.touched.address && formik.errors.address ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`} placeholder="Enter address" />
              {formik.touched.address && formik.errors.address && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.address)}</p>)}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Department *</label>
              <select id="department" name="department" value={formik.values.department} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2">
                {departments.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
              </select>
              {formik.touched.department && formik.errors.department && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.department)}</p>)}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Priority *</label>
              <select id="priority" name="priority" value={formik.values.priority} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2">
                {priorityOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
              </select>
              {formik.touched.priority && formik.errors.priority && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.priority)}</p>)}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Card Type *</label>
              <select id="selectedCardTypeId" name="selectedCardTypeId" value={formik.values.selectedCardTypeId} onChange={formik.handleChange} onBlur={formik.handleBlur} className={`block w-full rounded-lg border ${formik.touched.selectedCardTypeId && formik.errors.selectedCardTypeId ? 'border-destructive/40 focus:ring-red-500' : 'border-border/40 focus:ring-blue-500'} shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`} style={{WebkitAppearance: "menulist-button"}}>
                <option value="">Select a card type</option>
                {cardTypes.map(cardType => (
                  <option key={cardType._id} value={cardType._id}>
                    {cardType.name} - {cardType.description || `${cardType.name} patient membership with ${cardType.name.toLowerCase()} benefits.`} (ETB {cardType.price})
                  </option>
                ))}
              </select>
              {formik.touched.selectedCardTypeId && formik.errors.selectedCardTypeId && (<p className="mt-1 text-xs text-destructive">{String(formik.errors.selectedCardTypeId)}</p>)}
            </div>
          </div>
        )}
        {currentFormTab === 'medical' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Medical History</label>
              <textarea id="medicalHistory" name="medicalHistory" rows={3} value={formik.values.medicalHistory} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2" placeholder="Enter medical history (optional)" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Allergies</label>
              <textarea id="allergies" name="allergies" rows={2} value={formik.values.allergies} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2" placeholder="Enter allergies (optional)" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Insurance Provider</label>
              <input type="text" id="insuranceProvider" name="insuranceProvider" value={formik.values.insuranceProvider} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2" placeholder="Enter insurance provider (optional)" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Insurance Number</label>
              <input type="text" id="insuranceNumber" name="insuranceNumber" value={formik.values.insuranceNumber} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-primary focus:ring-blue-500 px-4 py-2" placeholder="Enter insurance number (optional)" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Additional Notes</label>
              <textarea id="notes" name="notes" rows={3} value={formik.values.notes} onChange={formik.handleChange} onBlur={formik.handleBlur} className="block w-full rounded-lg border border-border/40 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter any additional medical notes or observations..." />
            </div>
          </div>
        )}
        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="mr-1">*</span> Required fields
          </div>
          <div className="flex space-x-3">
            <Button type="submit" disabled={isSubmitting || !formik.isValid || !formik.dirty} className={`${isSubmitting || !formik.isValid || !formik.dirty ? 'bg-muted/50' : 'bg-primary hover:bg-primary'} text-primary-foreground transition-colors`}>
              {isSubmitting ? 'Registering...' : 'Register Patient'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RegisterPatient; 