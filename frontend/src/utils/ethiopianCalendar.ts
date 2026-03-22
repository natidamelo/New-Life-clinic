/**
 * Ethiopian Calendar Utility Functions for Frontend
 * Mirrors the backend utility but in TypeScript for frontend use
 */

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  dayName: string;
  formatted: string;
  shortFormatted: string;
}

export const ETHIOPIAN_MONTHS = [
  'Meskerem',    // መስከረም (September/October)
  'Tikimt',      // ጥቅምት (October/November)
  'Hidar',       // ሕዳር (November/December)
  'Tahsas',      // ታኅሳስ (December/January)
  'Tir',         // ጥር (January/February)
  'Yekatit',     // የካቲት (February/March)
  'Megabit',     // መጋቢት (March/April)
  'Miazia',      // ሚያዝያ (April/May)
  'Ginbot',      // ግንቦት (May/June)
  'Sene',        // ሰኔ (June/July)
  'Hamle',       // ሐምሌ (July/August)
  'Nehasse',     // ነሐሴ (August/September)
  'Pagume'       // ጳጉሜን (5-6 days)
];

export const ETHIOPIAN_DAYS = [
  'Ehud',        // እሁድ (Sunday)
  'Segno',       // ሰኞ (Monday)
  'Maksegno',    // ማክሰኞ (Tuesday)
  'Rebue',       // ረቡዕ (Wednesday)
  'Hamus',       // ሐሙስ (Thursday)
  'Arb',         // ዓርብ (Friday)
  'Kidame'       // ቅዳሜ (Saturday)
];

/**
 * Check if a Gregorian year is a leap year
 */
function isLeapYear(year: number): boolean {
  return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

/**
 * Get day of year for a given date
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Convert Gregorian date to Ethiopian date
 */
export function gregorianToEthiopian(gregorianDate: Date): EthiopianDate {
  const year = gregorianDate.getFullYear();
  const month = gregorianDate.getMonth() + 1;
  const day = gregorianDate.getDate();
  
  const ethiopianNewYear = isLeapYear(year) ? 12 : 11;
  
  let ethiopianYear: number;
  
  if (month < 9 || (month === 9 && day < ethiopianNewYear)) {
    ethiopianYear = year - 8;
  } else {
    ethiopianYear = year - 7;
  }
  
  const dayOfYear = getDayOfYear(gregorianDate);
  const ethiopianNewYearDay = getDayOfYear(new Date(year, 8, ethiopianNewYear));
  
  let ethiopianDayOfYear: number;
  if (dayOfYear >= ethiopianNewYearDay) {
    ethiopianDayOfYear = dayOfYear - ethiopianNewYearDay + 1;
  } else {
    const prevYear = year - 1;
    const prevYearDays = isLeapYear(prevYear) ? 366 : 365;
    const prevEthiopianNewYear = isLeapYear(prevYear) ? 12 : 11;
    const prevEthiopianNewYearDay = getDayOfYear(new Date(prevYear, 8, prevEthiopianNewYear));
    ethiopianDayOfYear = (prevYearDays - prevEthiopianNewYearDay + 1) + dayOfYear;
    ethiopianYear = year - 8;
  }
  
  let ethiopianMonth: number, ethiopianDay: number;
  
  if (ethiopianDayOfYear <= 360) {
    ethiopianMonth = Math.ceil(ethiopianDayOfYear / 30);
    ethiopianDay = ethiopianDayOfYear - ((ethiopianMonth - 1) * 30);
  } else {
    ethiopianMonth = 13;
    ethiopianDay = ethiopianDayOfYear - 360;
  }
  
  const dayOfWeek = gregorianDate.getDay();
  
  return {
    year: ethiopianYear,
    month: ethiopianMonth,
    day: ethiopianDay,
    monthName: ETHIOPIAN_MONTHS[ethiopianMonth - 1],
    dayName: ETHIOPIAN_DAYS[dayOfWeek],
    formatted: `${ethiopianDay} ${ETHIOPIAN_MONTHS[ethiopianMonth - 1]} ${ethiopianYear}`,
    shortFormatted: `${ethiopianDay}/${ethiopianMonth}/${ethiopianYear}`
  };
}

/**
 * Convert Ethiopian date to Gregorian date
 */
export function ethiopianToGregorian(ethiopianYear: number, ethiopianMonth: number, ethiopianDay: number): Date {
  let gregorianYear = ethiopianYear + 7;
  
  let ethiopianDayOfYear: number;
  if (ethiopianMonth <= 12) {
    ethiopianDayOfYear = ((ethiopianMonth - 1) * 30) + ethiopianDay;
  } else {
    ethiopianDayOfYear = 360 + ethiopianDay;
  }
  
  const ethiopianNewYear = isLeapYear(gregorianYear) ? 12 : 11;
  const ethiopianNewYearDate = new Date(gregorianYear, 8, ethiopianNewYear);
  
  const gregorianDate = new Date(ethiopianNewYearDate);
  gregorianDate.setDate(gregorianDate.getDate() + ethiopianDayOfYear - 1);
  
  return gregorianDate;
}

/**
 * Get current Ethiopian date
 */
export function getCurrentEthiopianDate(): EthiopianDate {
  return gregorianToEthiopian(new Date());
}

/**
 * Format Ethiopian date for display
 */
export function formatEthiopianDate(ethiopianDate: EthiopianDate, format: 'long' | 'short' | 'medium' = 'medium'): string {
  switch (format) {
    case 'long':
      return `${ethiopianDate.dayName}, ${ethiopianDate.day} ${ethiopianDate.monthName} ${ethiopianDate.year}`;
    case 'short':
      return ethiopianDate.shortFormatted;
    case 'medium':
    default:
      return ethiopianDate.formatted;
  }
}

/**
 * Get Ethiopian year from Gregorian date
 */
export function getEthiopianYear(gregorianDate: Date = new Date()): number {
  return gregorianToEthiopian(gregorianDate).year;
}

/**
 * Get list of Ethiopian months
 */
export function getEthiopianMonths() {
  return ETHIOPIAN_MONTHS.map((month, index) => ({
    index: index + 1,
    name: month,
    days: index < 12 ? 30 : 6
  }));
}

/**
 * Validate Ethiopian date
 */
export function isValidEthiopianDate(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 13 || day < 1) {
    return false;
  }
  
  if (month <= 12) {
    return day <= 30;
  } else {
    const gregorianYear = year + 7;
    const maxDays = isLeapYear(gregorianYear) ? 6 : 5;
    return day <= maxDays;
  }
}

/**
 * Calculate difference in days between two Ethiopian dates
 */
export function calculateEthiopianDateDifference(
  startDate: { year: number; month: number; day: number },
  endDate: { year: number; month: number; day: number }
): number {
  const startGregorian = ethiopianToGregorian(startDate.year, startDate.month, startDate.day);
  const endGregorian = ethiopianToGregorian(endDate.year, endDate.month, endDate.day);
  
  const timeDiff = endGregorian.getTime() - startGregorian.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Convert Gregorian date string to Ethiopian format
 */
export function gregorianDateToEthiopianString(dateString: string): string {
  const gregorianDate = new Date(dateString);
  const ethiopianDate = gregorianToEthiopian(gregorianDate);
  return formatEthiopianDate(ethiopianDate);
}

/**
 * Get Ethiopian date range for year (useful for dropdowns)
 */
export function getEthiopianYearRange(startYear?: number, endYear?: number): number[] {
  const currentEthiopian = getCurrentEthiopianDate();
  const start = startYear || currentEthiopian.year - 5;
  const end = endYear || currentEthiopian.year + 2;
  
  const years: number[] = [];
  for (let year = start; year <= end; year++) {
    years.push(year);
  }
  return years;
}
