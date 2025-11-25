/**
 * تنسيق التاريخ الميلادي بشكل مختصر
 */
export const toGregorianDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const formatter = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateObj.toLocaleDateString('ar-SA');
  }
};

/**
 * تنسيق التاريخ الميلادي مع الوقت
 */
export const toGregorianDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const dateFormatter = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const timeFormatter = new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const gregorianDate = dateFormatter.format(dateObj);
    const time = timeFormatter.format(dateObj);
    
    return `${gregorianDate} - ${time}`;
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return dateObj.toLocaleString('ar-SA');
  }
};

/**
 * تنسيق التاريخ الميلادي بشكل مفصل
 */
export const toGregorianDateLong = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const formatter = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateObj.toLocaleDateString('ar-SA');
  }
};
