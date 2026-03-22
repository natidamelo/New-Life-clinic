import { generateWoundCareSchedule, getFrequencyDisplayName } from './scheduleGenerator';

// Test all frequency and duration scenarios
export function testAllScenarios() {
  console.log('🧪 Testing all Treatment Frequency and Duration scenarios...\n');

  const testCases = [
    // Daily scenarios
    { frequency: 'daily', duration: 3, expected: 3 },
    { frequency: 'daily', duration: 7, expected: 7 },
    { frequency: 'daily', duration: 14, expected: 14 },
    { frequency: 'daily', duration: 30, expected: 30 },

    // Twice daily scenarios  
    { frequency: 'twice_daily', duration: 3, expected: 6 }, // 2 sessions per day
    { frequency: 'twice_daily', duration: 7, expected: 14 },
    { frequency: 'twice_daily', duration: 14, expected: 28 },
    { frequency: 'twice_daily', duration: 30, expected: 60 },

    // Every other day scenarios
    { frequency: 'every_other_day', duration: 6, expected: 3 }, // Every 2 days
    { frequency: 'every_other_day', duration: 14, expected: 7 },
    { frequency: 'every_other_day', duration: 30, expected: 15 },

    // Weekly scenarios
    { frequency: 'weekly', duration: 7, expected: 1 },
    { frequency: 'weekly', duration: 14, expected: 2 },
    { frequency: 'weekly', duration: 28, expected: 4 },
    { frequency: 'weekly', duration: 60, expected: 8 },

    // As needed scenarios
    { frequency: 'as_needed', duration: 3, expected: 1 }, // Every 3 days default
    { frequency: 'as_needed', duration: 9, expected: 3 },
    { frequency: 'as_needed', duration: 15, expected: 5 },
  ];

  const results: any[] = [];

  testCases.forEach((testCase, index) => {
    const { frequency, duration, expected } = testCase;
    
    try {
      const schedule = generateWoundCareSchedule(
        'Test Patient',
        frequency,
        duration,
        new Date('2024-01-01')
      );

      const actual = schedule.totalSessions;
      const passed = actual === expected;
      
      const result = {
        test: index + 1,
        frequency: getFrequencyDisplayName(frequency),
        duration,
        expected,
        actual,
        passed,
        details: {
          startDate: schedule.startDate.toDateString(),
          endDate: schedule.endDate.toDateString(),
          sessions: schedule.sessions.map(s => ({
            date: s.date.toDateString(),
            time: s.time,
            type: s.type
          }))
        }
      };

      results.push(result);

      console.log(`✅ Test ${index + 1}: ${frequency} for ${duration} days`);
      console.log(`   Expected: ${expected} sessions, Got: ${actual} sessions - ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (frequency === 'twice_daily' && actual > 0) {
        const morningCount = schedule.sessions.filter(s => s.type === 'morning').length;
        const eveningCount = schedule.sessions.filter(s => s.type === 'evening').length;
        console.log(`   Morning sessions: ${morningCount}, Evening sessions: ${eveningCount}`);
      }
      
      console.log(`   Date range: ${schedule.startDate.toDateString()} to ${schedule.endDate.toDateString()}`);
      console.log('');

    } catch (error) {
      console.error(`❌ Test ${index + 1} FAILED with error:`, error);
      results.push({
        test: index + 1,
        frequency,
        duration,
        expected,
        actual: 0,
        passed: false,
        error: error.message
      });
    }
  });

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\n📊 Test Summary:`);
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   Test ${r.test}: ${r.frequency} ${r.duration}d - Expected ${r.expected}, got ${r.actual}`);
    });
  }

  return results;
}

// Test specific edge cases
export function testEdgeCases() {
  console.log('\n🔬 Testing Edge Cases...\n');

  const edgeCases = [
    // Very short durations
    { frequency: 'daily', duration: 1, description: '1 day daily' },
    { frequency: 'twice_daily', duration: 1, description: '1 day twice daily' },
    
    // Very long durations  
    { frequency: 'daily', duration: 90, description: '90 days daily (should hit safety limit)' },
    
    // Zero/negative durations (should handle gracefully)
    { frequency: 'daily', duration: 0, description: '0 days (edge case)' },
    
    // Weekend scenarios for weekly
    { frequency: 'weekly', duration: 21, description: '3 weeks weekly' },
    
    // Leap year scenarios
    { frequency: 'daily', duration: 366, description: 'Leap year duration (should hit safety limit)' },
  ];

  edgeCases.forEach((testCase, index) => {
    const { frequency, duration, description } = testCase;
    
    try {
      const schedule = generateWoundCareSchedule(
        'Edge Case Patient',
        frequency,
        duration,
        new Date('2024-02-29') // Leap year date
      );

      console.log(`✅ Edge Case ${index + 1}: ${description}`);
      console.log(`   Generated ${schedule.totalSessions} sessions`);
      console.log(`   Safety limit applied: ${schedule.totalSessions >= 100 ? 'YES' : 'NO'}`);
      console.log(`   Date range: ${schedule.startDate.toDateString()} to ${schedule.endDate.toDateString()}`);
      console.log('');

    } catch (error) {
      console.error(`❌ Edge Case ${index + 1} FAILED:`, error.message);
    }
  });
}

// Test time scheduling accuracy
export function testTimeAccuracy() {
  console.log('\n⏰ Testing Time Accuracy...\n');

  const timeTests = [
    { frequency: 'twice_daily', expectedTimes: ['08:00', '20:00'] },
    { frequency: 'daily', expectedTimes: ['14:00'] },
    { frequency: 'every_other_day', expectedTimes: ['10:00'] },
    { frequency: 'weekly', expectedTimes: ['09:00'] },
    { frequency: 'as_needed', expectedTimes: ['12:00'] },
  ];

  timeTests.forEach(test => {
    const schedule = generateWoundCareSchedule(
      'Time Test Patient',
      test.frequency,
      7, // 1 week duration
      new Date('2024-01-01')
    );

    const actualTimes = [...new Set(schedule.sessions.map(s => s.time))];
    const timesMatch = test.expectedTimes.every(time => actualTimes.includes(time));

    console.log(`${timesMatch ? '✅' : '❌'} ${getFrequencyDisplayName(test.frequency)}:`);
    console.log(`   Expected times: ${test.expectedTimes.join(', ')}`);
    console.log(`   Actual times: ${actualTimes.join(', ')}`);
    console.log('');
  });
}

// Run all tests
export function runAllTests() {
  console.clear();
  console.log('🏥 Wound Care Schedule - Comprehensive Testing Suite\n');
  console.log('=' .repeat(60));
  
  testAllScenarios();
  testEdgeCases();
  testTimeAccuracy();
  
  console.log('=' .repeat(60));
  console.log('✅ All tests completed!');
}
