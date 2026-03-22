/**
 * Ethiopian Time Utility
 * 
 * Ethiopian Time (EAT) is UTC+3
 * This utility handles time conversions and medication scheduling in Ethiopian time
 */

/**
 * Get current Ethiopian time
 * @returns {Date} - Current time in Ethiopian timezone
 */
function getCurrentEthiopianTime() {
    const now = new Date();
    // Ethiopian time is UTC+3
    const ethiopianTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    return ethiopianTime;
}

/**
 * Convert any date to Ethiopian time
 * @param {Date} date - Date to convert
 * @returns {Date} - Date in Ethiopian timezone
 */
function toEthiopianTime(date) {
    if (!date) return getCurrentEthiopianTime();
    const utcTime = new Date(date.getTime());
    const ethiopianTime = new Date(utcTime.getTime() + (3 * 60 * 60 * 1000));
    return ethiopianTime;
}

/**
 * Get Ethiopian time components
 * @param {Date} date - Date in Ethiopian time (optional, defaults to current)
 * @returns {Object} - Object with hour, minute, day, etc.
 */
function getEthiopianTimeComponents(date = null) {
    const ethTime = date ? toEthiopianTime(date) : getCurrentEthiopianTime();
    
    return {
        hour: ethTime.getUTCHours(),
        minute: ethTime.getUTCMinutes(),
        day: ethTime.getUTCDate(),
        month: ethTime.getUTCMonth() + 1,
        year: ethTime.getUTCFullYear(),
        dayOfWeek: ethTime.getUTCDay(),
        timestamp: ethTime.getTime()
    };
}

/**
 * Check if current Ethiopian time is within a time slot window
 * @param {string} timeSlot - Time slot ('Morning', 'Evening', 'Afternoon', etc.)
 * @returns {boolean} - True if current time is within the window
 */
function isTimeSlotAvailable(timeSlot) {
    const ethTime = getEthiopianTimeComponents();
    const currentHour = ethTime.hour;
    
    switch (timeSlot.toLowerCase()) {
        case 'morning':
            // Morning: 6:00 AM - 12:00 PM (Ethiopian time)
            return currentHour >= 6 && currentHour < 12;
            
        case 'afternoon':
            // Afternoon: 12:00 PM - 6:00 PM (Ethiopian time)
            return currentHour >= 12 && currentHour < 18;
            
        case 'evening':
            // Evening: 6:00 PM - 10:00 PM (Ethiopian time)
            return currentHour >= 18 && currentHour < 22;
            
        case 'night':
            // Night: 10:00 PM - 6:00 AM (Ethiopian time)
            return currentHour >= 22 || currentHour < 6;
            
        case 'noon':
        case 'midday':
            // Noon: 11:00 AM - 1:00 PM (Ethiopian time)
            return currentHour >= 11 && currentHour < 13;
            
        case 'anytime':
            // Anytime - always available
            return true;
            
        default:
            // For legacy time formats (HH:MM), parse and check if within 2 hours
            if (timeSlot.includes(':')) {
                try {
                    const [targetHour, targetMinute] = timeSlot.split(':').map(n => parseInt(n));
                    const targetTime = targetHour * 60 + targetMinute;
                    const currentTime = currentHour * 60 + ethTime.minute;
                    
                    // Allow 2-hour window around the target time
                    const timeDiff = Math.abs(currentTime - targetTime);
                    return timeDiff <= 120; // 2 hours = 120 minutes
                } catch (error) {
                    console.error('Error parsing time slot:', timeSlot, error);
                    return false;
                }
            }
            return false;
    }
}

/**
 * Get next available time for a time slot
 * @param {string} timeSlot - Time slot name
 * @returns {Date} - Next Ethiopian time when this slot will be available
 */
function getNextAvailableTime(timeSlot) {
    const ethTime = getCurrentEthiopianTime();
    const components = getEthiopianTimeComponents(ethTime);
    let targetHour;
    
    switch (timeSlot.toLowerCase()) {
        case 'morning':
            targetHour = 6; // 6:00 AM
            break;
        case 'afternoon':
            targetHour = 12; // 12:00 PM
            break;
        case 'evening':
            targetHour = 18; // 6:00 PM
            break;
        case 'night':
            targetHour = 22; // 10:00 PM
            break;
        case 'noon':
        case 'midday':
            targetHour = 11; // 11:00 AM
            break;
        default:
            return ethTime; // Return current time for unknown slots
    }
    
    // Create target time for today
    const targetTime = new Date(ethTime);
    targetTime.setUTCHours(targetHour, 0, 0, 0);
    
    // If target time has passed today, move to tomorrow
    if (targetTime <= ethTime) {
        targetTime.setUTCDate(targetTime.getUTCDate() + 1);
    }
    
    return targetTime;
}

/**
 * Format Ethiopian time for display
 * @param {Date} date - Date to format
 * @param {boolean} includeSeconds - Include seconds in format
 * @returns {string} - Formatted time string
 */
function formatEthiopianTime(date = null, includeSeconds = false) {
    const ethTime = date ? toEthiopianTime(date) : getCurrentEthiopianTime();
    const components = getEthiopianTimeComponents(ethTime);
    
    const timeFormat = includeSeconds 
        ? `${components.hour.toString().padStart(2, '0')}:${components.minute.toString().padStart(2, '0')}:${ethTime.getUTCSeconds().toString().padStart(2, '0')}`
        : `${components.hour.toString().padStart(2, '0')}:${components.minute.toString().padStart(2, '0')}`;
    
    const dateFormat = `${components.day.toString().padStart(2, '0')}/${components.month.toString().padStart(2, '0')}/${components.year}`;
    
    return `${dateFormat} ${timeFormat} EAT`;
}

/**
 * Check if a dose can be administered now based on Ethiopian time
 * @param {string} timeSlot - Time slot for the dose
 * @param {Date} prescribedDate - Date when medication was prescribed
 * @param {number} dayNumber - Day number of the dose (1-based)
 * @returns {Object} - Object with availability info
 */
function checkDoseAvailability(timeSlot, prescribedDate, dayNumber) {
    const ethTime = getCurrentEthiopianTime();
    const prescribedEthTime = toEthiopianTime(prescribedDate);
    
    // Calculate the target date for this dose
    const targetDate = new Date(prescribedEthTime);
    targetDate.setUTCDate(targetDate.getUTCDate() + (dayNumber - 1));
    
    // Check if it's the right day
    const isRightDay = (
        ethTime.getUTCDate() === targetDate.getUTCDate() &&
        ethTime.getUTCMonth() === targetDate.getUTCMonth() &&
        ethTime.getUTCFullYear() === targetDate.getUTCFullYear()
    ) || ethTime > targetDate; // Or if the day has passed (overdue)
    
    // Check if it's the right time slot
    const isRightTime = isTimeSlotAvailable(timeSlot);
    
    const isOverdue = ethTime > targetDate && !isRightTime;
    const nextAvailable = isRightDay ? (isRightTime ? null : getNextAvailableTime(timeSlot)) : targetDate;
    
    return {
        canAdminister: isRightDay && isRightTime,
        isRightDay,
        isRightTime,
        isOverdue,
        nextAvailable,
        currentEthiopianTime: formatEthiopianTime(ethTime),
        targetDate: formatEthiopianTime(targetDate)
    };
}

module.exports = {
    getCurrentEthiopianTime,
    toEthiopianTime,
    getEthiopianTimeComponents,
    isTimeSlotAvailable,
    getNextAvailableTime,
    formatEthiopianTime,
    checkDoseAvailability
};
