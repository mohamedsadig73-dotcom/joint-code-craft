/**
 * تنسيق التاريخ الميلادي بشكل مختصر (Gregorian Calendar)
 */
export const toGregorianDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    // Use ar-EG locale with Gregorian calendar to get Arabic numerals with Gregorian dates
    const formatter = new Intl.DateTimeFormat('ar-EG-u-ca-gregory', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    // Fallback to simple format
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
};

/**
 * تنسيق التاريخ الميلادي مع الوقت (Gregorian Calendar)
 */
export const toGregorianDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const dateFormatter = new Intl.DateTimeFormat('ar-EG-u-ca-gregory', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const timeFormatter = new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const gregorianDate = dateFormatter.format(dateObj);
    const time = timeFormatter.format(dateObj);
    
    return `${gregorianDate} - ${time}`;
  } catch (error) {
    console.error('Error formatting datetime:', error);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  }
};

/**
 * تنسيق التاريخ الميلادي بشكل مفصل (Gregorian Calendar)
 */
export const toGregorianDateLong = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const formatter = new Intl.DateTimeFormat('ar-EG-u-ca-gregory', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    const day = dateObj.getDate();
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  }
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
