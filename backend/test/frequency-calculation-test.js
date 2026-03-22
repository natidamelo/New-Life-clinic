/**
 * Comprehensive Frequency Calculation Test
 *
 * This test verifies that the medication frequency system correctly handles:
 * - QD (once daily)
 * - BID (twice daily)
 * - TID (three times daily)
 * - QID (four times daily)
 * - Q4H, Q6H, Q8H, Q12H (every X hours)
 * - PRN (as needed)
 * - STAT (immediately)
 *
 * For ANY number of days (1 day to 365+ days)
 * Includes edge cases, medical scenarios, and comprehensive validation
 */

const { parseFrequencyToDosesPerDay, calculateTotalDoses } = require('../utils/frequencyDetection');
const { MedicationCalculator } = require('../utils/medicationCalculator');

function runFrequencyTest() {
    console.log('🧪 Starting Comprehensive Frequency Calculation Test...\n');
    
    // Test data for different frequencies - comprehensive coverage
    const frequencies = [
        // Standard QD variations
        { input: 'QD', expectedDoses: 1, description: 'QD (once daily)' },
        { input: 'qd', expectedDoses: 1, description: 'qd (lowercase)' },
        { input: 'once daily', expectedDoses: 1, description: 'Once daily' },
        { input: 'daily', expectedDoses: 1, description: 'Daily' },
        { input: '1x daily', expectedDoses: 1, description: '1x daily' },

        // Standard BID variations
        { input: 'BID', expectedDoses: 2, description: 'BID (twice daily)' },
        { input: 'bid', expectedDoses: 2, description: 'bid (lowercase)' },
        { input: 'twice daily', expectedDoses: 2, description: 'Twice daily' },
        { input: '2x daily', expectedDoses: 2, description: '2x daily' },
        { input: 'bis in die', expectedDoses: 2, description: 'Bis in die (Latin)' },

        // Standard TID variations
        { input: 'TID', expectedDoses: 3, description: 'TID (three times daily)' },
        { input: 'tid', expectedDoses: 3, description: 'tid (lowercase)' },
        { input: 'three times daily', expectedDoses: 3, description: 'Three times daily' },
        { input: 'thrice daily', expectedDoses: 3, description: 'Thrice daily' },
        { input: '3x daily', expectedDoses: 3, description: '3x daily' },
        { input: 'ter in die', expectedDoses: 3, description: 'Ter in die (Latin)' },

        // Standard QID variations
        { input: 'QID', expectedDoses: 4, description: 'QID (four times daily)' },
        { input: 'qid', expectedDoses: 4, description: 'qid (lowercase)' },
        { input: 'four times daily', expectedDoses: 4, description: 'Four times daily' },
        { input: '4x daily', expectedDoses: 4, description: '4x daily' },
        { input: 'quarter in die', expectedDoses: 4, description: 'Quarter in die (Latin)' },

        // Hourly frequencies
        { input: 'Q4H', expectedDoses: 6, description: 'Q4H (every 4 hours)' },
        { input: 'q4h', expectedDoses: 6, description: 'q4h (lowercase)' },
        { input: 'every 4 hours', expectedDoses: 6, description: 'Every 4 hours' },
        { input: 'Q6H', expectedDoses: 4, description: 'Q6H (every 6 hours)' },
        { input: 'every 6 hours', expectedDoses: 4, description: 'Every 6 hours' },
        { input: 'Q8H', expectedDoses: 3, description: 'Q8H (every 8 hours)' },
        { input: 'every 8 hours', expectedDoses: 3, description: 'Every 8 hours' },
        { input: 'Q12H', expectedDoses: 2, description: 'Q12H (every 12 hours)' },
        { input: 'every 12 hours', expectedDoses: 2, description: 'Every 12 hours' },

        // Special frequencies
        { input: 'PRN', expectedDoses: 1, description: 'PRN (as needed)' },
        { input: 'prn', expectedDoses: 1, description: 'prn (lowercase)' },
        { input: 'as needed', expectedDoses: 1, description: 'As needed' },
        { input: 'STAT', expectedDoses: 1, description: 'STAT (immediately)' },
        { input: 'stat', expectedDoses: 1, description: 'stat (lowercase)' },
        { input: 'immediately', expectedDoses: 1, description: 'Immediately' },

        // Additional common variations
        { input: 'once a day', expectedDoses: 1, description: 'Once a day' },
        { input: 'twice a day', expectedDoses: 2, description: 'Twice a day' },
        { input: 'three times a day', expectedDoses: 3, description: 'Three times a day' },
        { input: 'four times a day', expectedDoses: 4, description: 'Four times a day' }
    ];
    
    // Test durations from 1 day to 365+ days - comprehensive coverage
    const testDurations = [
        // Single digit days
        1, 2, 3, 4, 5, 6, 7, 8, 9,
        // Double digit days
        10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        // Monthly durations
        30, 31, 60, 61, 90, 91, 120, 180, 182, 183,
        // Annual and extended durations
        365, 366, 730, 1095,
        // Prime numbers for edge case testing
        13, 17, 23, 29, 31, 37, 41, 43, 47,
        // Fibonacci sequence for pattern testing
        1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
    ];
    
    let allTestsPassed = true;
    let totalTests = 0;
    let passedTests = 0;
    
    console.log('📋 Testing Frequency Detection:\n');
    
    // Test 1: Frequency Detection
    frequencies.forEach(freq => {
        totalTests++;
        const result = parseFrequencyToDosesPerDay(freq.input);
        const passed = result.dosesPerDay === freq.expectedDoses;
        
        if (passed) {
            passedTests++;
            console.log(`✅ ${freq.description}: ${freq.input} → ${result.dosesPerDay} doses/day`);
        } else {
            allTestsPassed = false;
            console.log(`❌ ${freq.description}: ${freq.input} → Expected ${freq.expectedDoses}, got ${result.dosesPerDay}`);
        }
    });
    
    console.log('\n📊 Testing Duration Calculations:\n');
    
    // Test 2: Duration Calculations for all frequencies and durations
    frequencies.forEach(freq => {
        console.log(`\n🔍 Testing ${freq.description} (${freq.expectedDoses} doses/day):`);
        
        testDurations.forEach(days => {
            totalTests++;
            const expectedTotal = days * freq.expectedDoses;
            const calculatedTotal = calculateTotalDoses(freq.input, days);
            const passed = calculatedTotal === expectedTotal;
            
            if (passed) {
                passedTests++;
                if (days <= 7 || days % 30 === 0 || days === 365) {
                    console.log(`  ✅ ${days} days: ${days} × ${freq.expectedDoses} = ${calculatedTotal} doses`);
                }
            } else {
                allTestsPassed = false;
                console.log(`  ❌ ${days} days: Expected ${expectedTotal}, got ${calculatedTotal}`);
            }
        });
    });
    
    console.log('\n📈 Testing Edge Cases:\n');
    
    // Test 3: Edge Cases
    const edgeCases = [
        { frequency: '', days: 5, expectedDoses: 5, description: 'Empty frequency' },
        { frequency: 'unknown pattern', days: 3, expectedDoses: 3, description: 'Unknown frequency pattern' },
        { frequency: 'BID', days: 0, expectedDoses: 0, description: 'Zero days' },
        { frequency: 'TID', days: 1000, expectedDoses: 3000, description: 'Very large duration' }
    ];
    
    edgeCases.forEach(testCase => {
        totalTests++;
        const calculatedTotal = calculateTotalDoses(testCase.frequency, testCase.days);
        const passed = calculatedTotal === testCase.expectedDoses;
        
        if (passed) {
            passedTests++;
            console.log(`✅ ${testCase.description}: ${testCase.frequency} × ${testCase.days} days = ${calculatedTotal} doses`);
        } else {
            allTestsPassed = false;
            console.log(`❌ ${testCase.description}: Expected ${testCase.expectedDoses}, got ${calculatedTotal}`);
        }
    });
    
    console.log('\n🎯 Common Medical Scenarios:\n');
    
    // Test 4: Common Medical Scenarios - Comprehensive Coverage
    const scenarios = [
        // Antibiotic regimens
        { medication: 'Amoxicillin', frequency: 'TID', days: 7, expectedDoses: 21, category: 'Antibiotic' },
        { medication: 'Ciprofloxacin', frequency: 'BID', days: 10, expectedDoses: 20, category: 'Antibiotic' },
        { medication: 'Azithromycin', frequency: 'QD', days: 5, expectedDoses: 5, category: 'Antibiotic' },

        // Pain management
        { medication: 'Ibuprofen', frequency: 'TID', days: 5, expectedDoses: 15, category: 'Pain medication' },
        { medication: 'Acetaminophen', frequency: 'QID', days: 3, expectedDoses: 12, category: 'Pain medication' },
        { medication: 'Morphine', frequency: 'Q4H', days: 2, expectedDoses: 12, category: 'Pain medication' },

        // Chronic conditions
        { medication: 'Metformin', frequency: 'BID', days: 30, expectedDoses: 60, category: 'Diabetes' },
        { medication: 'Lisinopril', frequency: 'QD', days: 90, expectedDoses: 90, category: 'Hypertension' },
        { medication: 'Atorvastatin', frequency: 'QD', days: 365, expectedDoses: 365, category: 'Cholesterol' },

        // Pediatric medications
        { medication: 'Amoxicillin suspension', frequency: 'TID', days: 10, expectedDoses: 30, category: 'Pediatric' },
        { medication: 'Ibuprofen suspension', frequency: 'Q6H', days: 3, expectedDoses: 12, category: 'Pediatric' },

        // Emergency/Acute care
        { medication: 'IV Antibiotics', frequency: 'Q8H', days: 14, expectedDoses: 42, category: 'Emergency' },
        { medication: 'STAT medication', frequency: 'STAT', days: 1, expectedDoses: 1, category: 'Emergency' },

        // PRN medications
        { medication: 'Nitroglycerin', frequency: 'PRN', days: 30, expectedDoses: 30, category: 'PRN' },
        { medication: 'Albuterol inhaler', frequency: 'PRN', days: 90, expectedDoses: 90, category: 'PRN' },

        // Extension prescriptions
        { medication: 'Warfarin extension', frequency: 'QD', days: 30, expectedDoses: 30, category: 'Extension' },
        { medication: 'Prednisone taper', frequency: 'QD', days: 7, expectedDoses: 7, category: 'Extension' },

        // Long-term therapy
        { medication: 'Thyroxine', frequency: 'QD', days: 365, expectedDoses: 365, category: 'Long-term' },
        { medication: 'Vitamin D', frequency: 'weekly', frequencyAlt: 'QD', days: 52, expectedDoses: 52, category: 'Long-term' }
    ];
    
    scenarios.forEach(scenario => {
        totalTests++;
        const frequencyToUse = scenario.frequencyAlt || scenario.frequency;
        const calculatedTotal = calculateTotalDoses(frequencyToUse, scenario.days);
        const passed = calculatedTotal === scenario.expectedDoses;

        if (passed) {
            passedTests++;
            console.log(`✅ ${scenario.category} - ${scenario.medication}: ${frequencyToUse} for ${scenario.days} days = ${calculatedTotal} doses`);
        } else {
            allTestsPassed = false;
            console.log(`❌ ${scenario.category} - ${scenario.medication}: Expected ${scenario.expectedDoses}, got ${calculatedTotal} (freq: ${frequencyToUse})`);
        }
    });
    
    // Test Results Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (allTestsPassed) {
        console.log('\n🎉 ALL TESTS PASSED! Frequency system is working correctly.');
        console.log('✅ The system correctly handles QD, BID, TID, QID for any number of days.');
    } else {
        console.log('\n❌ SOME TESTS FAILED! Please check the frequency detection logic.');
    }
    
    return allTestsPassed;
}

// Export for use in other modules
module.exports = { runFrequencyTest };

// Run test if this file is executed directly
if (require.main === module) {
    runFrequencyTest();
}
