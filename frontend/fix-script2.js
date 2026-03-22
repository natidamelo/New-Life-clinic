const fs = require('fs');
const path = require('path');

// Path to the file
const filePath = path.join(__dirname, 'src', 'pages', 'Reception', 'ReceptionDashboard.tsx');

// Read the file
let fileContent = fs.readFileSync(filePath, 'utf8');

// The fix is to target specific sections and ensure they don't have syntax errors
const fixPatients = () => {
  // This is a simple fix trying to find and replace patterns that might cause syntax errors
  // Find the patient section that might be problematic
  // First create a backup
  fs.writeFileSync(`${filePath}.before-fix`, fileContent, 'utf8');
  
  // Look for specific syntax errors around "patientId"
  let fixedContent = fileContent;
  
  // Try to fix a potential ']' before <select
  const errorBeforeSelect = /}\s*\](\s*<select)/g;
  fixedContent = fixedContent.replace(errorBeforeSelect, '}\n$1');
  
  // Fix potential unclosed parentheses 
  const errorUnclosedParens = /\(\s*<p[^)]*<\/p>\s*(?!\))/g;
  fixedContent = fixedContent.replace(errorUnclosedParens, (match) => match + ')');
  
  // Look for missing closing braces in JSX expressions
  const errorMissingBrace = /\$\{\s*([^}]*)\s*(?!\})/g;
  fixedContent = fixedContent.replace(errorMissingBrace, '${$1}');
  
  // If we made changes, write them back
  if (fixedContent !== fileContent) {
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log('Fixed potential syntax errors in the file.');
    return true;
  } else {
    console.log('No fixable syntax errors found with this script.');
    return false;
  }
};

// Another approach - recreate the entire select section
const replaceSelectSection = () => {
  const selectPattern = /<select[\s\S]*?<\/select>/g;
  const patientSelectPattern = /<select[\s\S]*?id="patientId"[\s\S]*?<\/select>/g;
  
  const correctPatientSelect = `<select
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
  
  // First try the more specific pattern
  if (patientSelectPattern.test(fileContent)) {
    let fixedContent = fileContent.replace(patientSelectPattern, correctPatientSelect);
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log('Replaced patient select section with correct code.');
    return true;
  }
  
  console.log('Could not find patient select section to replace.');
  return false;
};

// Try the first approach, and if that doesn't work, try the second
if (!fixPatients()) {
  replaceSelectSection();
} 