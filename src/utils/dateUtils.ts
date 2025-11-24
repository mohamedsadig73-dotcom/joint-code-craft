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

/**
 * تحويل التاريخ الميلادي إلى هجري
 */
export const toHijriDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    
    const hijriDate = formatter.format(dateObj);
    return `${hijriDate} هـ`;
  } catch (error) {
    console.error('Error converting to Hijri date:', error);
    return dateObj.toLocaleDateString('ar-SA');
  }
};

/**
 * تحويل التاريخ الميلادي إلى هجري مع الوقت
 */
export const toHijriDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const dateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    
    const timeFormatter = new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const hijriDate = dateFormatter.format(dateObj);
    const time = timeFormatter.format(dateObj);
    
    return `${hijriDate} - ${time}`;
  } catch (error) {
    console.error('Error converting to Hijri datetime:', error);
    return dateObj.toLocaleString('ar-SA');
  }
};

/**
 * تنسيق التاريخ الهجري بشكل مفصل
 */
export const toHijriDateLong = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    console.error('Error converting to Hijri date:', error);
    return dateObj.toLocaleDateString('ar-SA');
  }
};

/**
 * تنسيق التاريخ حسب تفضيلات المستخدم (هجري أو ميلادي)
 */
export const formatDate = (date: Date | string, calendarType: 'gregorian' | 'hijri' = 'gregorian'): string => {
  return calendarType === 'hijri' ? toHijriDate(date) : toGregorianDate(date);
};

/**
 * تنسيق التاريخ والوقت حسب تفضيلات المستخدم
 */
export const formatDateTime = (date: Date | string, calendarType: 'gregorian' | 'hijri' = 'gregorian'): string => {
  return calendarType === 'hijri' ? toHijriDateTime(date) : toGregorianDateTime(date);
};

/**
 * تنسيق التاريخ المفصل حسب تفضيلات المستخدم
 */
export const formatDateLong = (date: Date | string, calendarType: 'gregorian' | 'hijri' = 'gregorian'): string => {
  return calendarType === 'hijri' ? toHijriDateLong(date) : toGregorianDateLong(date);
};