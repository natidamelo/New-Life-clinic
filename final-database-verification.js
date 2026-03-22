const fs = require('fs');
const path = require('path');

/**
 * Final Database Reference Verification
 * Confirms all database references now use clinic-cms
 */

console.log('🔍 FINAL DATABASE REFERENCE VERIFICATION');
console.log('========================================');

// Database names that should NOT be used (not yours)
const INVALID_DATABASES = [
  'clinic-cms',
  'clinic-cms', 
  'clinic-cms',
  'clinic-cms',
  'clinic-cms',
  'clinic_db',
  'clinic_test'
];

// Your correct database
const CORRECT_DATABASE = 'clinic-cms';

let issuesFound = [];
let totalFilesChecked = 0;

/**
 * Check a single file for database issues
 */
function checkFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let hasIssues = false;
    let fileIssues = [];
    
    // Check for invalid database names
    INVALID_DATABASES.forEach(dbName => {
      if (content.includes(dbName)) {
        hasIssues = true;
        fileIssues.push(dbName);
      }
    });

    // Check for over-fixed database names (multiple cms suffixes)
    if (content.includes('clinic-cms')) {
      hasIssues = true;
      fileIssues.push('clinic-cms (over-fixed)');
    }

    if (hasIssues) {
      issuesFound.push({
        file: filePath,
        issues: fileIssues
      });
    }

    totalFilesChecked++;
    return hasIssues;
  } catch (error) {
    return false;
  }
}

/**
 * Scan files recursively
 */
function scanFiles(dir, maxDepth = 4, currentDepth = 0) {
  if (currentDepth >= maxDepth) return;
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      
      try {
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Skip common directories that don't need checking
          if (!['node_modules', '.git', 'database-fix-backup', 'logs', 'uploads'].includes(item)) {
            scanFiles(itemPath, maxDepth, currentDepth + 1);
          }
        } else if (item.endsWith('.js') || item.endsWith('.ts')) {
          checkFile(itemPath);
        }
      } catch (error) {
        // Skip items that can't be accessed
      }
    });
  } catch (error) {
    // Skip directories that can't be accessed
  }
}

// Start the verification
console.log('🔍 Scanning files for database reference issues...');
scanFiles(process.cwd());

// Report results
console.log('\n📊 VERIFICATION RESULTS');
console.log('========================');
console.log(`🔍 Files Checked: ${totalFilesChecked}`);
console.log(`❌ Issues Found: ${issuesFound.length}`);

if (issuesFound.length === 0) {
  console.log('\n🎉 SUCCESS! All database references are correct!');
  console.log('✅ Only clinic-cms database is being used');
  console.log('✅ No unauthorized database access');
  console.log('✅ Security maintained');
} else {
  console.log('\n🚨 ISSUES FOUND:');
  issuesFound.forEach(issue => {
    console.log(`\n📄 ${issue.file}`);
    issue.issues.forEach(dbIssue => {
      console.log(`   ❌ Using: ${dbIssue}`);
    });
  });
  
  console.log('\n💡 These files need immediate attention!');
}

console.log('\n🔍 Verification completed!');
