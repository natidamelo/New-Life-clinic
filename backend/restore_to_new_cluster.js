const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function restore() {
  console.log('Connecting to NEW Atlas cluster...');
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected!');

  const backupDir = path.join(__dirname, 'database_backup');
  if (!fs.existsSync(backupDir)) {
    console.error('Backup directory not found at: ' + backupDir);
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} collections to restore.`);

  for (const file of files) {
    const colName = file.replace('.json', '');
    const rawData = fs.readFileSync(path.join(backupDir, file), 'utf8');
    const data = JSON.parse(rawData);

    if (Array.isArray(data) && data.length > 0) {
      // Clear target collection first
      await mongoose.connection.db.collection(colName).deleteMany({});
      
      // Upload in chunks if very large (e.g., users or logs)
      const chunkSize = 100;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await mongoose.connection.db.collection(colName).insertMany(chunk);
      }
      console.log(`✅ Restored: ${colName} (${data.length} docs)`);
    } else {
      console.log(`ℹ️ Skipped empty: ${colName}`);
    }
  }

  console.log('\n--- ALL DATA RESTORED SUCCESSFULLY ---');
  process.exit(0);
}

restore().catch(err => {
  console.error('\n❌ RESTORE FAILED:', err);
  process.exit(1);
});
