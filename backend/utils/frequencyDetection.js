/**
 * Centralized Frequency Detection Utility
 * 
 * This utility provides consistent frequency detection across the entire system
 * to ensure all medication extensions calculate doses correctly (QD, BID, TID, QID).
 * 
 * ROOT CAUSE FIX: Enhanced to handle all frequency types robustly
 */

/**
 * Parse frequency string to doses per day with enhanced detection
 * @param {string} frequency - Frequency string (e.g., "BID", "TID", "Three times daily")
 * @returns {Object} - Object containing dosesPerDay and normalized frequency
 */
function parseFrequencyToDosesPerDay(frequency) {
    if (!frequency) {
        console.warn('⚠️  [FREQUENCY DETECTION] No frequency provided, defaulting to QD');
        return {
            dosesPerDay: 1,
            normalizedFrequency: 'QD (once daily)'
        };
    }
    
    // Normalize frequency string for better detection
    const freq = frequency.toLowerCase().trim();
    
    // ROOT CAUSE FIX: Enhanced frequency detection with comprehensive patterns
    // Check most specific patterns first to avoid false matches
    
    // QID (Four times daily) - 4 doses/day
    if (freq.includes('four') || freq.includes('qid') || freq.includes('4x') || freq.includes('4 times') || freq.includes('every 6 hours') || freq.includes('4 times daily')) {
        return {
            dosesPerDay: 4,
            normalizedFrequency: 'QID (four times daily)'
        };
    } 
    // TID (Three times daily) - 3 doses/day
    else if (freq.includes('three') || freq.includes('tid') || freq.includes('thrice') || freq.includes('3x') || freq.includes('3 times') || freq.includes('every 8 hours') || freq.includes('3 times daily')) {
        return {
            dosesPerDay: 3,
            normalizedFrequency: 'TID (three times daily)'
        };
    } 
    // BID (Twice daily) - 2 doses/day
    else if (freq.includes('twice') || freq.includes('bid') || freq.includes('2x') || freq.includes('2 times') || freq.includes('every 12 hours') || freq.includes('2 times daily')) {
        return {
            dosesPerDay: 2,
            normalizedFrequency: 'BID (twice daily)'
        };
    } 
    // QD (Once daily) - 1 dose/day
    else if (freq.includes('once') || freq.includes('daily') || freq.includes('qd') || freq.includes('1x') || freq.includes('every 24 hours') || freq.includes('1 time daily')) {
        return {
            dosesPerDay: 1,
            normalizedFrequency: 'QD (once daily)'
        };
    } else {
        // Fallback: Try to extract number from frequency string
        const match = freq.match(/(\d+)\s*times?.*daily/);
        if (match) {
            const dosesPerDay = parseInt(match[1], 10);
            return {
                dosesPerDay: dosesPerDay,
                normalizedFrequency: `${dosesPerDay} times daily`
            };
        } else {
            // ROOT CAUSE FIX: Enhanced logging for debugging
            console.error(`❌ [FREQUENCY DETECTION] Unrecognized frequency: "${frequency}" -> defaulting to QD`);
            console.error(`❌ [FREQUENCY DETECTION] Normalized input: "${freq}"`);
            console.error(`❌ [FREQUENCY DETECTION] This indicates a bug in frequency passing or detection`);
            console.error(`❌ [FREQUENCY DETECTION] Please check the frequency value being passed to this function`);
            return {
                dosesPerDay: 1,
                normalizedFrequency: 'QD (once daily)'
            };
        }
    }
}

/**
 * Calculate total doses for a given duration and frequency
 * @param {string} frequency - Frequency string
 * @param {number} days - Number of days
 * @returns {number} - Total doses
 */
function calculateTotalDoses(frequency, days) {
    const { dosesPerDay } = parseFrequencyToDosesPerDay(frequency);
    return days * dosesPerDay;
}

/**
 * Calculate days needed for a given number of doses and frequency
 * @param {string} frequency - Frequency string
 * @param {number} doses - Number of doses
 * @returns {number} - Number of days needed
 */
function calculateDaysFromDoses(frequency, doses) {
    const { dosesPerDay } = parseFrequencyToDosesPerDay(frequency);
    return Math.ceil(doses / dosesPerDay);
}

/**
 * Validate frequency string and return normalized version
 * @param {string} frequency - Frequency string to validate
 * @returns {Object} - Validation result with normalized frequency and validity
 */
function validateFrequency(frequency) {
    if (!frequency) {
        return {
            isValid: false,
            normalizedFrequency: 'QD (once daily)',
            dosesPerDay: 1,
            error: 'Frequency is required'
        };
    }
    
    const result = parseFrequencyToDosesPerDay(frequency);
    const originalFreq = frequency.toLowerCase().trim();
    
    // Check if the frequency was recognized
    const isRecognized = (
        originalFreq.includes('four') || originalFreq.includes('qid') || originalFreq.includes('4x') ||
        originalFreq.includes('three') || originalFreq.includes('tid') || originalFreq.includes('3x') ||
        originalFreq.includes('twice') || originalFreq.includes('bid') || originalFreq.includes('2x') ||
        originalFreq.includes('once') || originalFreq.includes('daily') || originalFreq.includes('qd') ||
        originalFreq.match(/(\d+)\s*times?.*daily/) !== null
    );
    
    return {
        isValid: isRecognized,
        normalizedFrequency: result.normalizedFrequency,
        dosesPerDay: result.dosesPerDay,
        error: isRecognized ? null : `Unrecognized frequency pattern: "${frequency}"`
    };
}

/**
 * Get frequency display name for UI
 * @param {string} frequency - Frequency string
 * @returns {string} - Display name
 */
function getFrequencyDisplayName(frequency) {
    const { normalizedFrequency } = parseFrequencyToDosesPerDay(frequency);
    return normalizedFrequency;
}

/**
 * Get frequency abbreviation (QD, BID, TID, QID)
 * @param {string} frequency - Frequency string
 * @returns {string} - Abbreviation
 */
function getFrequencyAbbreviation(frequency) {
    const freq = frequency.toLowerCase().trim();
    
    if (freq.includes('four') || freq.includes('qid') || freq.includes('4x')) {
        return 'QID';
    } else if (freq.includes('three') || freq.includes('tid') || freq.includes('3x')) {
        return 'TID';
    } else if (freq.includes('twice') || freq.includes('bid') || freq.includes('2x')) {
        return 'BID';
    } else if (freq.includes('once') || freq.includes('daily') || freq.includes('qd')) {
        return 'QD';
    } else {
        return 'QD'; // Default
    }
}

/**
 * Get simplified time slots (Morning/Evening) for a given frequency
 * @param {string} frequency - Frequency string
 * @returns {Array} - Array of simplified time slots
 */
function getSimplifiedTimeSlots(frequency) {
    const { dosesPerDay } = parseFrequencyToDosesPerDay(frequency);
    
    switch (dosesPerDay) {
        case 1: return ['Morning']; // QD - any time during morning
        case 2: return ['Morning', 'Evening']; // BID - morning and evening
        case 3: return ['Morning', 'Afternoon', 'Evening']; // TID - morning, afternoon, evening
        case 4: return ['Morning', 'Noon', 'Afternoon', 'Evening']; // QID - four times
        default: return ['Morning'];
    }
}

/**
 * Get flexible time slots for medication administration
 * These allow administration at any time during the specified period
 * @param {string} frequency - Frequency string
 * @returns {Array} - Array of time slots that can be administered at any time
 */
function getFlexibleTimeSlots(frequency) {
    const { dosesPerDay } = parseFrequencyToDosesPerDay(frequency);
    
    // For simplified administration, use broader time periods
    switch (dosesPerDay) {
        case 1: return ['Anytime']; // QD - once per day, any time
        case 2: return ['Morning', 'Evening']; // BID - morning and evening periods
        case 3: return ['Morning', 'Afternoon', 'Evening']; // TID - three periods
        case 4: return ['Morning', 'Midday', 'Afternoon', 'Evening']; // QID - four periods
        default: return ['Anytime'];
    }
}

module.exports = {
    parseFrequencyToDosesPerDay,
    calculateTotalDoses,
    calculateDaysFromDoses,
    validateFrequency,
    getFrequencyDisplayName,
    getFrequencyAbbreviation,
    getSimplifiedTimeSlots,
    getFlexibleTimeSlots
};
