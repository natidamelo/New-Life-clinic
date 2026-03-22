const fs = require('fs');
const path = require('path');

function readLastLines(filePath, numLines = 50) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    const lastLines = lines.slice(-numLines);
    return lastLines.join('\n');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

console.log('🚨 RECENT ERROR LOG ENTRIES (Last 50 lines):');
console.log('='.repeat(80));
const errorLog = readLastLines('logs/error.log', 50);
if (errorLog) {
  console.log(errorLog);
} else {
  console.log('No error log found or error reading file');
}

console.log('\n\n📋 RECENT COMBINED LOG ENTRIES (Last 30 lines):');
console.log('='.repeat(80));
const combinedLog = readLastLines('logs/combined.log', 30);
if (combinedLog) {
  console.log(combinedLog);
} else {
  console.log('No combined log found or error reading file');
}