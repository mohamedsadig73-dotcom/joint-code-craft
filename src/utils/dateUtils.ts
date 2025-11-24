/**
 * تحويل التاريخ الميلادي إلى هجري
 */
export const toHijriDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    // استخدام Intl.DateTimeFormat لتحويل التاريخ للهجري
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
