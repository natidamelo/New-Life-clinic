/**
 * Depo Injection Schedule Modal Component
 * 
 * Modal for creating new Depo injection schedules
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Stethoscope, FileText } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import depoInjectionService, { CreateScheduleData } from '../../services/depoInjectionService';
import patientService from '../../services/patientService';
import userService from '../../services/userService';
import EthiopianCalendarDisplay from './EthiopianCalendarDisplay';

interface DepoInjectionScheduleModalProps {
  onClose: () => void;
  onScheduleCreated: () => void;
  patientId?: string;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  patientId: string;
}

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
}

const DepoInjectionScheduleModal: React.FC<DepoInjectionScheduleModalProps> = ({
  onClose,
  onScheduleCreated,
  patientId
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsData, doctorsData] = await Promise.all([
        patientService.getPatients(),
        userService.getUsers()
      ]);
      
      setPatients(patientsData as any);
      setDoctors(doctorsData as any);
    } catch (err: any) {
      setError('Failed to load data');
    }
  };

  const validationSchema = Yup.object({
    patientId: Yup.string().required('Patient is required'),
    firstInjectionDate: Yup.string().required('First injection date is required'),
    prescribingDoctorId: Yup.string().required('Prescribing doctor is required'),
    notes: Yup.string(),
    instructions: Yup.string(),
    injectionInterval: Yup.number().min(70).max(98).default(84),
    reminderSettings: Yup.object({
      enabled: Yup.boolean().default(true),
      daysBeforeReminder: Yup.number().min(1).max(30).default(7),
      reminderMethod: Yup.string().oneOf(['sms', 'email', 'both']).default('sms')
    })
  });

  const formik = useFormik({
    initialValues: {
      patientId: patientId || '',
      firstInjectionDate: '',
      prescribingDoctorId: '',
      notes: '',
      instructions: '',
      injectionInterval: 84,
      reminderSettings: {
        enabled: true,
        daysBeforeReminder: 7,
        reminderMethod: 'sms' as 'sms' | 'email' | 'both'
      }
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setLoading(true);
        setError(null);

        const selectedPatient = patients.find(p => p._id === values.patientId);
        const selectedDoctor = doctors.find(d => d._id === values.prescribingDoctorId);

        if (!selectedPatient || !selectedDoctor) {
          throw new Error('Invalid patient or doctor selection');
        }

        const scheduleData: CreateScheduleData = {
          patientId: values.patientId,
          firstInjectionDate: values.firstInjectionDate,
          prescribingDoctorId: values.prescribingDoctorId,
          prescribingDoctorName: `${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
          notes: values.notes,
          instructions: values.instructions,
          injectionInterval: values.injectionInterval,
          reminderSettings: values.reminderSettings
        };

        await depoInjectionService.createSchedule(scheduleData);
        onScheduleCreated();
      } catch (err: any) {
        setError(err.message || 'Failed to create schedule');
      } finally {
        setLoading(false);
        setSubmitting(false);
      }
    }
  });

  const calculateNextInjectionDate = () => {
    if (!formik.values.firstInjectionDate) return null;
    
    const firstDate = new Date(formik.values.firstInjectionDate);
    const nextDate = new Date(firstDate.getTime() + (formik.values.injectionInterval * 24 * 60 * 60 * 1000));
    
    return nextDate.toISOString();
  };

  const nextInjectionDate = calculateNextInjectionDate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-foreground rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-muted-foreground">Create Depo Injection Schedule</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground/50 hover:text-muted-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Patient
            </label>
            <select
              name="patientId"
              value={formik.values.patientId}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full px-3 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a patient</option>
              {patients.map((patient) => (
                <option key={patient._id} value={patient._id}>
                  {patient.firstName} {patient.lastName} (ID: {patient.patientId})
                </option>
              ))}
            </select>
            {formik.touched.patientId && formik.errors.patientId && (
              <p className="text-destructive text-sm mt-1">{formik.errors.patientId}</p>
            )}
          </div>

          {/* First Injection Date */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              First Injection Date
            </label>
            <input
              type="date"
              name="firstInjectionDate"
              value={formik.values.firstInjectionDate}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full px-3 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {formik.touched.firstInjectionDate && formik.errors.firstInjectionDate && (
              <p className="text-destructive text-sm mt-1">{formik.errors.firstInjectionDate}</p>
            )}
          </div>

          {/* Prescribing Doctor */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <Stethoscope className="h-4 w-4 inline mr-2" />
              Prescribing Doctor
            </label>
            <select
              name="prescribingDoctorId"
              value={formik.values.prescribingDoctorId}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full px-3 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor._id} value={doctor._id}>
                  Dr. {doctor.firstName} {doctor.lastName}
                </option>
              ))}
            </select>
            {formik.touched.prescribingDoctorId && formik.errors.prescribingDoctorId && (
              <p className="text-destructive text-sm mt-1">{formik.errors.prescribingDoctorId}</p>
            )}
          </div>

          {/* Injection Interval */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Injection Interval (days)
            </label>
            <input
              type="number"
              name="injectionInterval"
              value={formik.values.injectionInterval}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              min="70"
              max="98"
              className="w-full px-3 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Standard interval is 84 days (12 weeks). Range: 70-98 days.
            </p>
            {formik.touched.injectionInterval && formik.errors.injectionInterval && (
              <p className="text-destructive text-sm mt-1">{formik.errors.injectionInterval}</p>
            )}
          </div>

          {/* Next Injection Preview */}
          {nextInjectionDate && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-primary mb-2">Next Injection Date</h4>
              <EthiopianCalendarDisplay
                ethiopianDate={{
                  year: 0, // This would be calculated by the backend
                  month: 0,
                  day: 0,
                  monthName: '',
                  formatted: 'Calculated by backend'
                }}
                gregorianDate={nextInjectionDate}
                size="sm"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Notes
            </label>
            <textarea
              name="notes"
              value={formik.values.notes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              rows={3}
              className="w-full px-3 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes about the injection schedule..."
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Instructions
            </label>
            <textarea
              name="instructions"
              value={formik.values.instructions}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              rows={3}
              className="w-full px-3 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Special instructions for the patient..."
            />
          </div>

          {/* Reminder Settings */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-muted-foreground mb-4">Reminder Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="reminderSettings.enabled"
                  checked={formik.values.reminderSettings.enabled}
                  onChange={formik.handleChange}
                  className="h-4 w-4 text-primary focus:ring-blue-500 border-border/40 rounded"
                />
                <label className="ml-2 text-sm text-muted-foreground">
                  Enable reminders
                </label>
              </div>

              {formik.values.reminderSettings.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Days before reminder
                    </label>
                    <input
                      type="number"
                      name="reminderSettings.daysBeforeReminder"
                      value={formik.values.reminderSettings.daysBeforeReminder}
                      onChange={formik.handleChange}
                      min="1"
                      max="30"
                      className="w-full px-3 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Reminder method
                    </label>
                    <select
                      name="reminderSettings.reminderMethod"
                      value={formik.values.reminderSettings.reminderMethod}
                      onChange={formik.handleChange}
                      className="w-full px-3 py-2 border border-border/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="both">Both SMS and Email</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground bg-muted/20 rounded-lg hover:bg-muted/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formik.isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepoInjectionScheduleModal;

