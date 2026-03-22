/**
 * Ethiopian Time Utility for Frontend
 * 
 * Ethiopian Time (EAT) is UTC+3
 * This utility handles time conversions and displays in Ethiopian time
 */

/**
 * Get current Ethiopian time
 * @returns {Date} - Current time in Ethiopian timezone
 */
export function getCurrentEthiopianTime(): Date {
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
export function toEthiopianTime(date: Date): Date {
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
export function getEthiopianTimeComponents(date: Date | null = null) {
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
export function isTimeSlotAvailable(timeSlot: string): boolean {
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
            return false;
    }
}

/**
 * Get next available time for a time slot
 * @param {string} timeSlot - Time slot name
 * @returns {Date} - Next Ethiopian time when this slot will be available
 */
export function getNextAvailableTime(timeSlot: string): Date {
    const ethTime = getCurrentEthiopianTime();
    let targetHour: number;
    
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
export function formatEthiopianTime(date: Date | null = null, includeSeconds: boolean = false): string {
    const ethTime = date ? toEthiopianTime(date) : getCurrentEthiopianTime();
    const components = getEthiopianTimeComponents(ethTime);
    
    const timeFormat = includeSeconds 
        ? `${components.hour.toString().padStart(2, '0')}:${components.minute.toString().padStart(2, '0')}:${ethTime.getUTCSeconds().toString().padStart(2, '0')}`
        : `${components.hour.toString().padStart(2, '0')}:${components.minute.toString().padStart(2, '0')}`;
    
    return `${timeFormat} EAT`;
}

/**
 * Format Ethiopian date for display
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatEthiopianDate(date: Date | null = null): string {
    const ethTime = date ? toEthiopianTime(date) : getCurrentEthiopianTime();
    const components = getEthiopianTimeComponents(ethTime);
    
    return `${components.day.toString().padStart(2, '0')}/${components.month.toString().padStart(2, '0')}/${components.year}`;
}

/**
 * Get time slot display info with availability
 * @param {string} timeSlot - Time slot name
 * @returns {Object} - Display info with availability status
 */
export function getTimeSlotDisplayInfo(timeSlot: string) {
    const isAvailable = isTimeSlotAvailable(timeSlot);
    const nextAvailable = isAvailable ? null : getNextAvailableTime(timeSlot);
    
    let displayName = timeSlot;
    let emoji = '⏰';
    let timeWindow = '';
    
    switch (timeSlot.toLowerCase()) {
        case 'morning':
            displayName = 'Morning';
            emoji = '🌅';
            timeWindow = '6:00 AM - 12:00 PM';
            break;
        case 'afternoon':
            displayName = 'Afternoon';
            emoji = '☀️';
            timeWindow = '12:00 PM - 6:00 PM';
            break;
        case 'evening':
            displayName = 'Evening';
            emoji = '🌆';
            timeWindow = '6:00 PM - 10:00 PM';
            break;
        case 'night':
            displayName = 'Night';
            emoji = '🌙';
            timeWindow = '10:00 PM - 6:00 AM';
            break;
        case 'noon':
        case 'midday':
            displayName = 'Noon';
            emoji = '☀️';
            timeWindow = '11:00 AM - 1:00 PM';
            break;
        case 'anytime':
            displayName = 'Anytime';
            emoji = '🕐';
            timeWindow = 'Available anytime';
            break;
    }
    
    return {
        displayName,
        emoji,
        timeWindow,
        isAvailable,
        nextAvailable: nextAvailable ? formatEthiopianTime(nextAvailable) : null,
        currentTime: formatEthiopianTime()
    };
}

/**
 * Check if a dose should be available based on day and time
 * @param {string} timeSlot - Time slot for the dose
 * @param {Date} prescribedDate - Date when medication was prescribed
 * @param {number} dayNumber - Day number of the dose (1-based)
 * @returns {Object} - Object with availability info
 */
export function checkDoseAvailability(timeSlot: string, prescribedDate: Date, dayNumber: number) {
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
