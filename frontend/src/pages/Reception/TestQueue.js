// Test script to see if the frontend properly handles patient data
// that should be correctly displayed in the queue

// This is a mock of what the backend says is in the database
// The database has 58 patients, 57 of them with status "waiting"
// But for some reason they're not appearing in the queue

// Mock data mimicking the API response from our database check
const mockApiResponse = {
  "patients": [
    {
      "id": "6825f7e449a1a74f03de089a",
      "_id": "6825f7e449a1a74f03de089a",
      "patientId": "P00001",
      "firstName": "Emily",
      "lastName": "Johnson",
      "status": "waiting",
      "createdAt": "2025-05-15T14:19:16.245Z"
    },
    {
      "id": "6825f7e449a1a74f03de089d",
      "_id": "6825f7e449a1a74f03de089d",
      "patientId": "P00002",
      "firstName": "James",
      "lastName": "Williams",
      "status": "waiting",
      "createdAt": "2025-05-15T14:19:16.262Z"
    },
    {
      "id": "6825f7e449a1a74f03de08a0",
      "_id": "6825f7e449a1a74f03de08a0",
      "patientId": "P00003",
      "firstName": "Sophia",
      "lastName": "Brown",
      "status": "waiting",
      "createdAt": "2025-05-15T14:19:16.271Z"
    }
  ],
  "currentPage": 1,
  "totalPages": 6,
  "totalPatients": 58
};

// Test if filtering logic works
console.log("Testing patient queue filtering logic...");

// This should match what the ReceptionDashboard.tsx component does
const filteredPatients = mockApiResponse.patients.filter(
  patient => (patient.status || '').toLowerCase().trim() === 'waiting'
);

console.log("Original patients:", mockApiResponse.patients.length);
console.log("Filtered 'waiting' patients:", filteredPatients.length);
console.log("Filtered patients details:", filteredPatients.map(p => ({
  id: p.id,
  name: `${p.firstName} ${p.lastName}`,
  status: p.status,
  matches: (p.status || '').toLowerCase().trim() === 'waiting'
})));

// If the filter works correctly, we should see 3 patients in the filtered list
// If it shows 0, something is wrong with the filtering logic

// Run this script with:
// node src/pages/Reception/TestQueue.js 