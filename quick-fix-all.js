const fs = require('fs');
const path = require('path');

console.log('⚡ QUICK FIX ALL DATABASES');
console.log('============================');

let fixed = 0;

// Simple function to fix a file
function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Fix all database references at once
    content = content.replace(/mongodb:\/\/[^\/]+\/clinic(?![a-zA-Z_-])/gi, 'mongodb://localhost:27017/clinic-cms');
    content = content.replace(/mongodb:\/\/[^\/]+\/clinic-management(?![a-zA-Z_-])/gi, 'mongodb://localhost:27017/clinic-cms');
    content = content.replace(/mongodb:\/\/[^\/]+\/clinic-management-system(?![a-zA-Z_-])/gi, 'mongodb://localhost:27017/clinic-cms');
    content = content.replace(/mongodb:\/\/[^\/]+\/clinic_new_life(?![a-zA-Z_-])/gi, 'mongodb://localhost:27017/clinic-cms');
    content = content.replace(/mongodb:\/\/[^\/]+\/clinic_management(?![a-zA-Z_-])/gi, 'mongodb://localhost:27017/clinic-cms');
    content = content.replace(/mongodb:\/\/[^\/]+\/clinic_db(?![a-zA-Z_-])/gi, 'mongodb://localhost:27017/clinic-cms');
    content = content.replace(/mongodb:\/\/[^\/]+\/clinic_test(?![a-zA-Z_-])/gi, 'mongodb://localhost:27017/clinic-cms');
    
    // Fix database names in quotes
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    content = content.replace(/'clinic-cms'/g, "'clinic-cms'");
    
    // Fix over-fixed names
    content = content.replace(/clinic-cms(-cms)+/gi, 'clinic-cms');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      fixed++;
    }
  } catch (error) {
    // Skip files that can't be accessed
  }
}

// Get all JS files and fix them
const jsFiles = [];
function scanDir(dir) {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      try {
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory() && !['node_modules', '.git', 'database-fix-backup'].includes(item)) {
          scanDir(itemPath);
        } else if (item.endsWith('.js')) {
          jsFiles.push(itemPath);
        }
      } catch (error) {
        // Skip items that can't be accessed
      }
    });
  } catch (error) {
    // Skip directories that can't be accessed
  }
}

console.log('🔍 Scanning for JavaScript files...');
scanDir(process.cwd());

console.log(`🔧 Fixing ${jsFiles.length} files...`);
jsFiles.forEach(fixFile);

console.log(`\n✅ DONE! Fixed ${fixed} files`);
console.log('🚨 All databases now use clinic-cms');
