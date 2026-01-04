// Convert Western numbers to Arabic/Eastern Arabic numerals
export function toArabicNumerals(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
}

// Format number with thousands separator - always use Western numerals (123)
export function formatNumber(num: number | string, _language: 'ar' | 'en' = 'ar'): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '0';
  return numValue.toLocaleString('en-US');
}

// Format currency - always use "ريال" for Arabic
export function formatCurrency(amount: number, language: 'ar' | 'en' = 'ar'): string {
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (language === 'ar') {
    return formatted + ' ريال';
  }
  return formatted + ' SAR';
}

// Format date with Arabic numerals
// @deprecated Use formatDate from dateUtils.ts instead
export function formatDateArabic(date: Date | string, language: 'ar' | 'en' = 'ar'): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const formatted = `${day}/${month}/${year}`;
  
  return language === 'ar' ? toArabicNumerals(formatted) : formatted;
}

// Format percentage
export function formatPercentage(value: number, language: 'ar' | 'en' = 'ar'): string {
  const formatted = value.toFixed(1);
  if (language === 'ar') {
    return toArabicNumerals(formatted) + '٪';
  }
  return formatted + '%';
}
