/**
 * ==============================================
 * Date Formatting Utilities
 * ==============================================
 * 
 * Standard Format: DD/MM/YYYY (e.g., 07/03/2025)
 * 
 * This file contains all date formatting functions.
 * All dates in the application MUST use these functions
 * to ensure consistent formatting.
 * 
 * DO NOT use other date formatting methods elsewhere!
 * ==============================================
 */

/**
 * تنسيق التاريخ بصيغة موحدة DD/MM/YYYY
 * Standard date format: DD/MM/YYYY (e.g., 07/03/2025)
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * تنسيق التاريخ الميلادي بشكل مختصر (Gregorian Calendar)
 * @deprecated Use formatDate() instead for consistent DD/MM/YYYY format
 */
export const toGregorianDate = (date: Date | string): string => {
  return formatDate(date);
};

/**
 * تنسيق التاريخ مع الوقت DD/MM/YYYY - HH:MM
 * Standard datetime format: DD/MM/YYYY - HH:MM (e.g., 07/03/2025 - 14:30)
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '-';
  }
};

/**
 * تنسيق التاريخ الميلادي مع الوقت (Gregorian Calendar)
 * @deprecated Use formatDateTime() instead for consistent format
 */
export const toGregorianDateTime = (date: Date | string): string => {
  return formatDateTime(date);
};

/**
 * تنسيق التاريخ بشكل مفصل (DD اسم_الشهر YYYY)
 * Long date format: DD Month YYYY (e.g., 07 مارس 2025)
 */
export const formatDateLong = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * تنسيق التاريخ الميلادي بشكل مفصل (Gregorian Calendar)
 * @deprecated Use formatDateLong() instead for consistent format
 */
export const toGregorianDateLong = (date: Date | string): string => {
  return formatDateLong(date);
};

/**
 * Natural sorting helper for archive numbers (S1, S2, ... S10, S11)
 */
export const sortArchiveNumbers = <T extends { archive_number: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const extractNumber = (str: string): number => {
      const match = str.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    
    const extractPrefix = (str: string): string => {
      const match = str.match(/^[A-Za-z]+/);
      return match ? match[0] : '';
    };
    
    const prefixA = extractPrefix(a.archive_number);
    const prefixB = extractPrefix(b.archive_number);
    
    if (prefixA !== prefixB) {
      return prefixA.localeCompare(prefixB);
    }
    
    return extractNumber(a.archive_number) - extractNumber(b.archive_number);
  });
};
