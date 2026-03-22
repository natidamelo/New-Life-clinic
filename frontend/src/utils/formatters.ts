import { format, parseISO } from 'date-fns';

/**
 * Formats a date string or Date object into a localized date string (e.g., MM/DD/YYYY).
 * Handles potential invalid date inputs gracefully.
 * @param dateString - The date string (ISO format preferred) or Date object.
 * @returns Formatted date string or 'Invalid Date'.
 */
export const formatDate = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    // Check if date is valid after parsing
    if (isNaN(date.getTime())) {
      // Fallback for non-ISO strings if parseISO fails
      const fallbackDate = new Date(dateString);
      if (isNaN(fallbackDate.getTime())) return 'Invalid Date';
      return format(fallbackDate, 'PP'); // Format like: Sep 14, 2024
    }
    return format(date, 'PP'); // Format like: Sep 14, 2024
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    // Attempt a simple conversion as last resort
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  }
};

/**
 * Formats a date string or Date object into a localized time string (e.g., HH:MM AM/PM).
 * Handles potential invalid date inputs gracefully.
 * @param dateString - The date string (ISO format preferred) or Date object.
 * @returns Formatted time string or 'Invalid Time'.
 */
export const formatTime = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    // Check if date is valid after parsing
    if (isNaN(date.getTime())) {
      // Fallback for non-ISO strings if parseISO fails
      const fallbackDate = new Date(dateString);
      if (isNaN(fallbackDate.getTime())) return 'Invalid Time';
      return format(fallbackDate, 'p'); // Format like: 2:30 PM
    }
    return format(date, 'p'); // Format like: 2:30 PM
  } catch (error) {
    console.error("Error formatting time:", dateString, error);
    // Attempt a simple conversion as last resort
    try {
      return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return 'Invalid Time';
    }
  }
};

/**
 * Formats a date string or Date object into a combined date and time string (e.g., MM/DD/YYYY, HH:MM AM/PM).
 * Handles potential invalid date inputs gracefully.
 * @param dateString - The date string (ISO format preferred) or Date object.
 * @returns Formatted date and time string or 'Invalid Date/Time'.
 */
export const formatDateTime = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    // Check if date is valid after parsing
    if (isNaN(date.getTime())) {
      // Fallback for non-ISO strings if parseISO fails
      const fallbackDate = new Date(dateString);
      if (isNaN(fallbackDate.getTime())) return 'Invalid Date/Time';
      return format(fallbackDate, 'PPp'); // Format like: Sep 14, 2024, 2:30 PM
    }
    return format(date, 'PPp'); // Format like: Sep 14, 2024, 2:30 PM
  } catch (error) {
    console.error("Error formatting datetime:", dateString, error);
    // Attempt a simple conversion as last resort
    try {
      return new Date(dateString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return 'Invalid Date/Time';
    }
  }
};

/**
 * Ensures that a value is always an array
 * @param value The value to check
 * @returns An array, either the original value if it was an array, or an empty array
 */
export const safeArray = <T>(value: any): T[] => {
  if (Array.isArray(value)) {
    return value;
  }
  
  if (value === null || value === undefined) {
    return [];
  }
  
  console.warn('safeArray received a non-array value:', value);
  return [];
};

/**
 * Format a number as currency
 * @param value - The number to format
 * @param currency - The currency code (default: 'ETB')
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  currency: string = 'ETB',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Format a number as a percentage
 * @param value - The number to format (0-100)
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

/**
 * Format a phone number
 * @param phone - The phone number to format
 * @returns Formatted phone number string
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

/**
 * Format a file size in bytes to a human-readable string
 * @param bytes - The file size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// You can add other formatting functions here (like getStatusColor if needed) 

export default {
  safeArray,
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime
}; 