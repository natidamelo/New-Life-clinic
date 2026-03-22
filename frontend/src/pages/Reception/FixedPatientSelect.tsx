import React from 'react';

// This is a correctly formatted patient selection section 
// You can copy and paste this into the ReceptionDashboard.tsx file
// to replace the problematic section

/*
Replace this part in ReceptionDashboard.tsx:

            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Patient</label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewPatientModalOpen(true);
                  setIsScheduleModalOpen(false);
                }}
                className="ml-2"
              >
                <Icon icon={UserPlusIcon} className="w-4 h-4 mr-1" />
                New Patient
              </Button>
            </div>
            <select
              id="patientId"
              name="patientId"
              value={scheduleFormik.values.patientId}
              onChange={scheduleFormik.handleChange}
              onBlur={scheduleFormik.handleBlur}
              className={`block w-full rounded-lg border ${
                scheduleFormik.touched.patientId && scheduleFormik.errors.patientId
                  ? 'border-destructive/40 focus:ring-red-500'
                  : 'border-border/40 focus:ring-blue-500'
              } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2`}
              disabled={isLoadingPatientsForSelect}
            >
              <option value="" disabled>-- Select Patient --</option>
              {patientsForSelect.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>
            {scheduleFormik.touched.patientId && scheduleFormik.errors.patientId && (
              <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.patientId)}</p>
            )}
*/ 