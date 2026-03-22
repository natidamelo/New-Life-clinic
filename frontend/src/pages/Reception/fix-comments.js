// This is a script to fix HTML comments in ReceptionDashboard.tsx
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ReceptionDashboard.tsx');
const backupPath = path.join(__dirname, 'ReceptionDashboard.bak.tsx');

// First, create a backup of the original file
fs.copyFileSync(filePath, backupPath);
console.log(`Backup created at ${backupPath}`);

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Replace HTML comments <!-- ... --> with JSX comments {/* ... */}
let fixedContent = content.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');

// Write the fixed content back to the file
fs.writeFileSync(filePath, fixedContent, 'utf8');
console.log(`Fixed file saved at ${filePath}`);
console.log('Please check the file for any remaining issues and then run the application.');

// To run this script:
// node fix-comments.js 