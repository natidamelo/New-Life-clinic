const fs = require('fs');
const path = require('path');

// Path to the file
const filePath = path.join(__dirname, 'src', 'pages', 'Reception', 'ReceptionDashboard.tsx');

// Read the file
let fileContent = fs.readFileSync(filePath, 'utf8');

// The corrected code snippet
const correctCode = `            {scheduleFormik.touched.patientId && scheduleFormik.errors.patientId && (
              <p className="mt-1 text-xs text-red-600">{String(scheduleFormik.errors.patientId)}</p>
            )}
            <select
              id="patientId"
              name="patientId"
              value={scheduleFormik.values.patientId}
              onChange={scheduleFormik.handleChange}
              onBlur={scheduleFormik.handleBlur}
              className={\`block w-full rounded-lg border \${
                scheduleFormik.touched.patientId && scheduleFormik.errors.patientId
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              } shadow-sm focus:border-transparent focus:ring-2 transition-all px-4 py-2\`}
              disabled={isLoadingPatientsForSelect}
            >
              <option value="" disabled>-- Select Patient --</option>
              {patientsForSelect.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>`;

// Check if there's a stray ']' character before the select element
// This regex pattern looks for a closing curly brace followed by a ']' character before the select
const pattern = /}\s*\]\s*<select/;
if (pattern.test(fileContent)) {
  // If found, replace the incorrect pattern with the correct one
  fileContent = fileContent.replace(pattern, `}
            <select`);
  
  // Write the fixed content back to the file
  fs.writeFileSync(filePath, fileContent, 'utf8');
  console.log('Fixed the syntax error with the select element.');
} else {
  console.log('No syntax error pattern found. The file might already be correct or have a different issue.');
} 