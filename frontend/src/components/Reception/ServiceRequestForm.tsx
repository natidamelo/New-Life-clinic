import React, { useState, useEffect } from 'react';
// import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import serviceRequestService from '../../services/serviceRequestService';
import patientService from '../../services/patientService';
// import nurseService from '../../services/nurseService';
import serviceService from '../../services/serviceService';

interface ServiceRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  patientName: string;
  patientId?: string;
  serviceId: string;
  assignedNurseId: string;
  notes?: string;
}

export default function ServiceRequestForm({ isOpen, onClose, onSuccess }: ServiceRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [nurses, setNurses] = useState([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const servicesRes = await serviceService.getServices();
        setServices(servicesRes);
        setNurses([]);
      } catch (error) {
        console.error('Error loading form data:', error);
        toast.error('Failed to load form data');
      }
    };

    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // First find or create patient
      let patientId = data.patientId;
      if (!patientId) {
        const patientRes = await patientService.createPatient({
          firstName: data.patientName.split(' ')[0] || 'Unknown',
          lastName: data.patientName.split(' ').slice(1).join(' ') || 'Patient',
          age: 0,
          gender: 'Unknown',
          contactNumber: '',
          priority: 'normal'
        });
        patientId = patientRes.data._id;
      }

      // Create service request
      await serviceRequestService.createServiceRequest({
        patient: patientId,
        service: data.serviceId,
        assignedNurse: data.assignedNurseId,
        notes: data.notes,
        status: 'pending'
      });

      toast.success('Service request created successfully');
      reset();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create service request';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="mx-auto max-w-lg rounded bg-primary-foreground p-6">
          <h2 className="text-lg font-medium mb-4">Request Service</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Patient Name</label>
              <input
                type="text"
                {...register('patientName', { required: 'Patient name is required' })}
                className="mt-1 block w-full rounded-md border-border/40 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.patientName && (
                <p className="mt-1 text-sm text-destructive">{errors.patientName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">Service</label>
              <select
                {...register('serviceId', { required: 'Service is required' })}
                className="mt-1 block w-full rounded-md border-border/40 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select a service</option>
                {services.map((service: any) => (
                  <option key={service._id} value={service._id}>
                    {service.name}
                  </option>
                ))}
              </select>
              {errors.serviceId && (
                <p className="mt-1 text-sm text-destructive">{errors.serviceId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">Assign Nurse</label>
              <select
                {...register('assignedNurseId', { required: 'Nurse assignment is required' })}
                className="mt-1 block w-full rounded-md border-border/40 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select a nurse</option>
                {Array.isArray(nurses) && nurses.map((nurse: any) => (
                  <option key={nurse._id} value={nurse._id}>
                    {nurse.name}
                  </option>
                ))}
              </select>
              {errors.assignedNurseId && (
                <p className="mt-1 text-sm text-destructive">{errors.assignedNurseId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">Notes</label>
              <textarea
                {...register('notes')}
                className="mt-1 block w-full rounded-md border-border/40 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-md border border-border/40 bg-primary-foreground px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 