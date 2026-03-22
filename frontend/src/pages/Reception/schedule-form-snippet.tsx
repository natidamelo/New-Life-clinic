import React from 'react';

// Mock component for testing syntax
const TestComponent: React.FC = () => {
  // Mock data
  const isLoadingPatientsForSelect = false;
  const patientsForSelect = [{ id: '1', firstName: 'John', lastName: 'Doe' }];
  
  // Mock scheduleFormik
  const scheduleFormik = {
    touched: { patientId: false },
    errors: { patientId: '' },
    values: { patientId: '' },
    handleChange: () => {},
    handleBlur: () => {},
  };
  
  return (
    <div>
      {/* This is the section with the reported error */}
      {scheduleFormik.touched.patientId && scheduleFormik.errors.patientId && (
        <p className="mt-1 text-xs text-destructive">{String(scheduleFormik.errors.patientId)}</p>
      )}
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
    </div>
  );
};

export default TestComponent; 