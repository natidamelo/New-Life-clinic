/**
 * Script to fix the age field in the patients collection
 * - Removes duplicate "Age" field (capitalized)
 * - Converts any date values in age field to numeric age
 * - Ensures all patients have a lowercase "age" field with a numeric value
 */
const { MongoClient } = require('mongodb');

// Connection URL
const url = 'mongodb://localhost:27017';
const dbName = 'clinic-cms';

async function fixAgeField() {
  console.log('Starting age field fix script...');
  
  // Create a new MongoClient
  const client = new MongoClient(url);
  
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected to MongoDB server');
    
    // Get the database and collection
    const db = client.db(dbName);
    const patientsCollection = db.collection('patients');
    
    // Find all patients
    const patients = await patientsCollection.find({}).toArray();
    console.log(`Found ${patients.length} patients in the database`);
    
    // Track how many patients were updated
    let updatedCount = 0;
    let dateConversionCount = 0;
    let duplicateFieldCount = 0;
    
    // Process each patient
    for (const patient of patients) {
      let needsUpdate = false;
      let updateData = {};
      
      // Check if patient has both "age" and "Age" fields
      if (patient.Age !== undefined && patient.age !== undefined) {
        console.log(`Patient ${patient._id}: Has both "age" (${patient.age}) and "Age" (${patient.Age}) fields`);
        duplicateFieldCount++;
        needsUpdate = true;
        
        // Keep the lowercase "age" value, but ensure it's a number
        if (typeof patient.age !== 'number') {
          updateData.age = Number(patient.age) || 0;
        }
        
        // Remove the capitalized "Age" field
        updateData.$unset = { Age: "" };
      }
      // Check if patient has only "Age" field (capitalized)
      else if (patient.Age !== undefined && patient.age === undefined) {
        console.log(`Patient ${patient._id}: Has only "Age" field (${patient.Age}), converting to lowercase`);
        duplicateFieldCount++;
        needsUpdate = true;
        
        // Convert to lowercase field and ensure it's a number
        updateData.age = Number(patient.Age) || 0;
        updateData.$unset = { Age: "" };
      }
      // Check if "age" field is not a number (could be a date or string)
      else if (patient.age !== undefined && typeof patient.age !== 'number') {
        console.log(`Patient ${patient._id}: "age" field is not a number (${patient.age}, type: ${typeof patient.age})`);
        dateConversionCount++;
        needsUpdate = true;
        
        // If it's a date, calculate the age in years
        if (patient.age instanceof Date || (typeof patient.age === 'string' && !isNaN(Date.parse(patient.age)))) {
          const birthDate = new Date(patient.age);
          const today = new Date();
          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
          }
          
          console.log(`Patient ${patient._id}: Converted date value to age: ${calculatedAge}`);
          updateData.age = calculatedAge;
        } else {
          // If it's not a valid date, try to convert to number or default to 0
          updateData.age = Number(patient.age) || 0;
        }
      }
      
      // Update the patient if needed
      if (needsUpdate) {
        try {
          const result = await patientsCollection.updateOne(
            { _id: patient._id },
            { $set: updateData, ...(updateData.$unset ? { $unset: updateData.$unset } : {}) }
          );
          
          if (result.modifiedCount > 0) {
            updatedCount++;
            console.log(`Patient ${patient._id}: Updated successfully`);
          }
        } catch (updateError) {
          console.error(`Error updating patient ${patient._id}:`, updateError);
        }
      }
    }
    
    console.log('\nSummary:');
    console.log(`Total patients: ${patients.length}`);
    console.log(`Patients with duplicate age fields: ${duplicateFieldCount}`);
    console.log(`Patients with date values in age field: ${dateConversionCount}`);
    console.log(`Total patients updated: ${updatedCount}`);
    
    // Verify the fix
    const verificationQuery = [
      { Age: { $exists: true } },  // Check for any remaining capitalized Age fields
      { age: { $not: { $type: "number" } } }  // Check for any non-numeric age fields
    ];
    
    const remainingIssues = await patientsCollection.find({ $or: verificationQuery }).toArray();
    
    if (remainingIssues.length > 0) {
      console.log(`\nWARNING: Found ${remainingIssues.length} patients with remaining issues:`);
      for (const patient of remainingIssues) {
        console.log(`Patient ${patient._id}: Age=${patient.Age}, age=${patient.age}, age type=${typeof patient.age}`);
      }
    } else {
      console.log('\nSUCCESS: All patients now have a numeric "age" field and no duplicate "Age" fields');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the fix
fixAgeField().catch(console.error); 
