const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function run() {
  const modelsDir = 'c:/Users/HP/OneDrive/Desktop/clinic new life/backend/models';
  const files = fs.readdirSync(modelsDir);
  
  console.log('Model Name -> Collection Name mappings:');
  
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    
    try {
      const modelName = file.replace('.js', '');
      const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
      
      // Look for mongoose.model('Name', schema, 'CollectionName')
      // or schema = new Schema({...}, { collection: 'CollectionName' })
      let collectionName = '';
      
      const collMatch = content.match(/collection:\s*['"](.+?)['"]/);
      if (collMatch) {
         collectionName = collMatch[1];
      } else {
         const modelMatch = content.match(/mongoose\.model\(['"](.+?)['"],\s*.+?,\s*['"](.+?)['"]\)/);
         if (modelMatch) {
            collectionName = modelMatch[2];
         }
      }
      
      if (!collectionName) {
          // Default pluralization
          collectionName = modelName.toLowerCase() + 's';
      }
      
      console.log(`${modelName} -> ${collectionName}`);
    } catch (err) {
      console.log(`${file} -> ERROR: ${err.message}`);
    }
  }
}

run();
