'use client';

import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { PatientQueueItem, TriagePriority } from './types';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPatient: (patient: Omit<PatientQueueItem, 'id' | 'token' | 'checkInTime' | 'waitTime' | 'status'>) => void;
  isDarkMode: boolean;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  onAddPatient,
  isDarkMode,
}) => {
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('F');
  const [department, setDepartment] = useState<'General OPD' | 'Pediatrics' | 'MCH / Antenatal' | 'Emergency Triage' | 'Ultrasound / Imaging'>('General OPD');
  const [priority, setPriority] = useState<TriagePriority>('Normal');
  const [assignedDoctorName, setAssignedDoctorName] = useState('Dr. Dawit Haile');
  const [chiefComplaint, setChiefComplaint] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    onAddPatient({
      patientName: patientName.trim(),
      patientId: patientId.trim() || `NL-${Math.floor(1000 + Math.random() * 9000)}`,
      age: Number(age) || 30,
      gender,
      department,
      priority,
      assignedDoctor: {
        name: assignedDoctorName,
        specialization: department === 'Pediatrics' ? 'Pediatric Care' : 'Internal Medicine',
      },
      chiefComplaint: chiefComplaint.trim() || 'General medical review',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl p-6 bg-[#FFFFFF] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC]"
        style={{
          boxShadow: isDarkMode ? '0 20px 50px rgba(0,0,0,0.6)' : '0 20px 50px rgba(15,23,42,0.15)',
        }}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: isDarkMode ? '#14B8A6' : '#0D9488' }}
            >
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">
                New Patient Check-In & Triage
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Assign queue token and directing physician
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-[#0F172A] dark:text-[#F8FAFC]">
                Patient Full Name *
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Abebech Gobena"
                className="w-full h-9 px-3 rounded-lg border outline-none bg-[#F8FAFC] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] focus:border-[#0D9488] dark:focus:border-[#14B8A6]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#0F172A] dark:text-[#F8FAFC]">
                Patient ID / Card #
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. NL-4829 (auto-generated if empty)"
                className="w-full h-9 px-3 rounded-lg border outline-none bg-[#F8FAFC] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] focus:border-[#0D9488] dark:focus:border-[#14B8A6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-[#0F172A] dark:text-[#F8FAFC]">
                Age
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Years"
                className="w-full h-9 px-3 rounded-lg border outline-none bg-[#F8FAFC] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] focus:border-[#0D9488] dark:focus:border-[#14B8A6]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#0F172A] dark:text-[#F8FAFC]">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg border outline-none bg-[#F8FAFC] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] focus:border-[#0D9488] dark:focus:border-[#14B8A6]"
              >
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#0F172A] dark:text-[#F8FAFC]">
                Triage Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg border outline-none bg-[#F8FAFC] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] focus:border-[#0D9488] dark:focus:border-[#14B8A6]"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent (Triage)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-[#0F172A] dark:text-[#F8FAFC]">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg border outline-none bg-[#F8FAFC] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] focus:border-[#0D9488] dark:focus:border-[#14B8A6]"
              >
                <option value="General OPD">General OPD</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="MCH / Antenatal">MCH / Antenatal</option>
                <option value="Emergency Triage">Emergency Triage</option>
                <option value="Ultrasound / Imaging">Ultrasound / Imaging</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#0F172A] dark:text-[#F8FAFC]">
                Directing Physician
              </label>
              <select
                value={assignedDoctorName}
                onChange={(e) => setAssignedDoctorName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border outline-none bg-[#F8FAFC] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] focus:border-[#0D9488] dark:focus:border-[#14B8A6]"
              >
                <option value="Dr. Dawit Haile">Dr. Dawit Haile (Internal Med)</option>
                <option value="Dr. Selamawit Tefera">Dr. Selamawit Tefera (General / ER)</option>
                <option value="Dr. Meron Assefa">Dr. Meron Assefa (Pediatrics)</option>
                <option value="Sr. Rahel Gizaw">Sr. Rahel Gizaw (Midwife / MCH)</option>
                <option value="Dr. Mahlet K.">Dr. Mahlet K. (Radiologist)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-[#0F172A] dark:text-[#F8FAFC]">
              Chief Complaint / Reason for Visit
            </label>
            <textarea
              rows={2}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Acute abdominal pain for 2 days, fever, vomiting..."
              className="w-full p-2.5 rounded-lg border outline-none bg-[#F8FAFC] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] focus:border-[#0D9488] dark:focus:border-[#14B8A6]"
            />
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm active:scale-95"
              style={{ backgroundColor: isDarkMode ? '#14B8A6' : '#0D9488' }}
            >
              Confirm & Issue Token
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
