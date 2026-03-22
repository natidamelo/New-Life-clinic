/**
 * Ethiopian Calendar Utility
 * 
 * Handles conversion between Gregorian and Ethiopian calendars
 * Ethiopian calendar is approximately 7-8 years behind Gregorian calendar
 */

class EthiopianCalendar {
  constructor() {
    // Ethiopian calendar months
    this.ethiopianMonths = [
      'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
      'Megabit', 'Miazia', 'Genbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
    ];
    
    // Days in each Ethiopian month (first 12 months have 30 days, 13th has 5-6)
    this.ethiopianMonthDays = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 5];
  }

  /**
   * Convert Gregorian date to Ethiopian date
   * @param {Date} gregorianDate - Gregorian date to convert
   * @returns {Object} Ethiopian date object
   */
  gregorianToEthiopian(gregorianDate) {
    const year = gregorianDate.getFullYear();
    const month = gregorianDate.getMonth() + 1; // JavaScript months are 0-based
    const day = gregorianDate.getDate();

    // Ethiopian calendar starts on September 11, 7 BC (Gregorian)
    // But for practical purposes, we use the offset of approximately 7-8 years
    let ethiopianYear = year - 8;
    
    // Adjust for the month offset (Ethiopian year starts in September)
    if (month >= 9) {
      ethiopianYear += 1;
    }

    // Calculate days since September 11
    const september11 = new Date(year, 8, 11); // September 11 (month 8 = September)
    const daysDiff = Math.floor((gregorianDate - september11) / (1000 * 60 * 60 * 24));
    
    let ethiopianMonth = 1; // Meskerem
    let ethiopianDay = 1;
    
    if (daysDiff >= 0) {
      // Current Ethiopian year
      let remainingDays = daysDiff;
      
      for (let i = 0; i < 13; i++) {
        const daysInMonth = (i === 12) ? (this.isLeapYear(ethiopianYear) ? 6 : 5) : 30;
        
        if (remainingDays < daysInMonth) {
          ethiopianMonth = i + 1;
          ethiopianDay = remainingDays + 1;
          break;
        }
        
        remainingDays -= daysInMonth;
      }
    } else {
      // Previous Ethiopian year
      ethiopianYear -= 1;
      const daysInYear = this.isLeapYear(ethiopianYear) ? 366 : 365;
      let remainingDays = daysInYear + daysDiff;
      
      for (let i = 12; i >= 0; i--) {
        const daysInMonth = (i === 12) ? (this.isLeapYear(ethiopianYear) ? 6 : 5) : 30;
        
        if (remainingDays >= daysInMonth) {
          ethiopianMonth = i + 1;
          ethiopianDay = remainingDays - daysInMonth + 1;
          break;
        }
        
        remainingDays -= daysInMonth;
      }
    }

    return {
      year: ethiopianYear,
      month: ethiopianMonth,
      day: ethiopianDay,
      monthName: this.ethiopianMonths[ethiopianMonth - 1],
      formatted: `${this.ethiopianMonths[ethiopianMonth - 1]} ${ethiopianDay}, ${ethiopianYear}`
    };
  }

  /**
   * Convert Ethiopian date to Gregorian date
   * @param {number} year - Ethiopian year
   * @param {number} month - Ethiopian month (1-13)
   * @param {number} day - Ethiopian day
   * @returns {Date} Gregorian date
   */
  ethiopianToGregorian(year, month, day) {
    // Calculate days since September 11 of the corresponding Gregorian year
    const gregorianYear = year + 8;
    let totalDays = 0;
    
    // Add days from previous months in the Ethiopian year
    for (let i = 1; i < month; i++) {
      if (i === 13) {
        totalDays += this.isLeapYear(year) ? 6 : 5;
      } else {
        totalDays += 30;
      }
    }
    
    // Add days in current month
    totalDays += day - 1;
    
    // Calculate the Gregorian date
    const september11 = new Date(gregorianYear, 8, 11); // September 11
    const gregorianDate = new Date(september11.getTime() + (totalDays * 24 * 60 * 60 * 1000));
    
    return gregorianDate;
  }

  /**
   * Check if Ethiopian year is a leap year
   * @param {number} year - Ethiopian year
   * @returns {boolean} True if leap year
   */
  isLeapYear(year) {
    // Ethiopian leap year calculation (similar to Gregorian but with different offset)
    return (year % 4 === 3);
  }

  /**
   * Add days to an Ethiopian date
   * @param {Object} ethiopianDate - Ethiopian date object
   * @param {number} days - Number of days to add
   * @returns {Object} New Ethiopian date object
   */
  addDays(ethiopianDate, days) {
    const gregorianDate = this.ethiopianToGregorian(ethiopianDate.year, ethiopianDate.month, ethiopianDate.day);
    const newGregorianDate = new Date(gregorianDate.getTime() + (days * 24 * 60 * 60 * 1000));
    return this.gregorianToEthiopian(newGregorianDate);
  }

  /**
   * Calculate next Depo injection date (12 weeks = 84 days from last injection)
   * @param {Date} lastInjectionDate - Date of last injection
   * @returns {Object} Next injection date in both calendars
   */
  calculateNextDepoDate(lastInjectionDate) {
    const nextGregorianDate = new Date(lastInjectionDate.getTime() + (84 * 24 * 60 * 60 * 1000));
    const nextEthiopianDate = this.gregorianToEthiopian(nextGregorianDate);
    
    return {
      gregorian: {
        date: nextGregorianDate,
        formatted: nextGregorianDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      },
      ethiopian: nextEthiopianDate
    };
  }

  /**
   * Get current Ethiopian date
   * @returns {Object} Current Ethiopian date
   */
  getCurrentEthiopianDate() {
    return this.gregorianToEthiopian(new Date());
  }

  /**
   * Format Ethiopian date for display
   * @param {Object} ethiopianDate - Ethiopian date object
   * @returns {string} Formatted date string
   */
  formatEthiopianDate(ethiopianDate) {
    return `${ethiopianDate.monthName} ${ethiopianDate.day}, ${ethiopianDate.year}`;
  }

  /**
   * Get days until next injection
   * @param {Date} lastInjectionDate - Date of last injection
   * @returns {number} Days until next injection
   */
  getDaysUntilNextInjection(lastInjectionDate) {
    const nextInjectionDate = new Date(lastInjectionDate.getTime() + (84 * 24 * 60 * 60 * 1000));
    const today = new Date();
    const timeDiff = nextInjectionDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if injection is overdue
   * @param {Date} lastInjectionDate - Date of last injection
   * @returns {boolean} True if injection is overdue
   */
  isInjectionOverdue(lastInjectionDate) {
    return this.getDaysUntilNextInjection(lastInjectionDate) < 0;
  }

  /**
   * Get injection status (due, overdue, upcoming)
   * @param {Date} lastInjectionDate - Date of last injection
   * @returns {Object} Status information
   */
  getInjectionStatus(lastInjectionDate) {
    const daysUntil = this.getDaysUntilNextInjection(lastInjectionDate);
    const nextInjectionDate = new Date(lastInjectionDate.getTime() + (84 * 24 * 60 * 60 * 1000));
    
    let status = 'upcoming';
    let message = '';
    
    if (daysUntil < 0) {
      status = 'overdue';
      message = `Overdue by ${Math.abs(daysUntil)} days`;
    } else if (daysUntil === 0) {
      status = 'due';
      message = 'Due today';
    } else if (daysUntil <= 7) {
      status = 'due_soon';
      message = `Due in ${daysUntil} days`;
    } else {
      status = 'upcoming';
      message = `Due in ${daysUntil} days`;
    }
    
    return {
      status,
      message,
      daysUntil,
      nextInjectionDate,
      nextInjectionEthiopian: this.gregorianToEthiopian(nextInjectionDate)
    };
  }
}

module.exports = new EthiopianCalendar();