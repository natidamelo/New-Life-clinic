// Simple test for exact time calculation
console.log('🔧 Quick Time Calculation Test...\n');

// Test case: Staff clocked out at 3:33:47 PM
const clockOutTime = new Date();
clockOutTime.setHours(15, 33, 47, 0); // 3:33:47 PM

// Working hours configuration
const startTime = '08:30'; // 8:30 AM
const endTime = '23:00';   // 11:00 PM

// Calculate clock-out time in minutes
const outHours = clockOutTime.getHours();
const outMinutes = clockOutTime.getMinutes();
const outTotalMinutes = outHours * 60 + outMinutes;

// Calculate end time in minutes
const [endHour, endMin] = endTime.split(':').map(Number);
const endMinutes = endHour * 60 + endMin;

// Calculate early time
const earlyMinutes = endMinutes - outTotalMinutes;
const earlyHours = Math.floor(earlyMinutes / 60);
const earlyMins = earlyMinutes % 60;

console.log('📊 Clock-out Calculation:');
console.log(`   Clock Out: ${outHours}:${outMinutes.toString().padStart(2, '0')} (${outTotalMinutes} minutes)`);
console.log(`   End Time: ${endHour}:${endMin.toString().padStart(2, '0')} (${endMinutes} minutes)`);
console.log(`   Is Early Clock-out: ${outTotalMinutes < endMinutes ? 'Yes' : 'No'}`);
console.log(`   Early by: ${earlyHours}h ${earlyMins}m (${earlyMinutes} minutes)`);

console.log('\n✅ Quick test completed!');
