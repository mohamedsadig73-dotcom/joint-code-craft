import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    manage: 'Manage',
    reports: 'Reports',
    logout: 'Logout',
    profile: 'Profile',
    changePassword: 'Change Password',
    
    // Login
    welcomeBack: 'Welcome Back',
    loginSubtitle: 'Sign in to access your declaration tracking system',
    username: 'Username',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    login: 'Login',
    invalidCredentials: 'Invalid credentials',
    
    // Dashboard
    systemTitle: 'Declaration Tracking System',
    streamlineWorkflow: 'Streamline Your Declaration Workflow',
    streamlineDesc: 'Transform manual tracking into intelligent digital workflow with real-time status updates, automated approvals, and comprehensive reporting.',
    unsigned: 'Unsigned',
    pending: 'Pending',
    approved: 'Approved',
    archived: 'Archived',
    recentActivity: 'Recent Activity',
    quickActions: 'Quick Actions',
    addDeclaration: 'Add Declaration',
    viewReports: 'View Reports',
    weeklyTrend: 'Weekly Trend',
    dailyActivity: 'Daily Activity',
    comparison: 'Comparison',
    
    // Manage
    declarations: 'Declarations',
    search: 'Search',
    filter: 'Filter',
    status: 'Status',
    allStatuses: 'All Statuses',
    declarationId: 'Declaration ID',
    type: 'Type',
    sender: 'Sender',
    createdDate: 'Created Date',
    actions: 'Actions',
    bulkActions: 'Bulk Actions',
    showing: 'Showing',
    of: 'of',
    results: 'results',
    selected: 'selected',
    
    // Reports
    reportsAnalytics: 'Reports & Analytics',
    overview: 'Overview',
    statusDistribution: 'Status Distribution',
    userActivity: 'User Activity',
    exportPDF: 'Export PDF',
    exportExcel: 'Export Excel',
    exportCSV: 'Export CSV',
  },
  ar: {
    // Navigation
    dashboard: 'لوحة التحكم',
    manage: 'إدارة',
    reports: 'التقارير',
    logout: 'تسجيل خروج',
    profile: 'الملف الشخصي',
    changePassword: 'تغيير كلمة المرور',
    
    // Login
    welcomeBack: 'مرحباً بعودتك',
    loginSubtitle: 'سجل الدخول للوصول إلى نظام تتبع الإقرارات',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    login: 'تسجيل دخول',
    invalidCredentials: 'بيانات غير صحيحة',
    
    // Dashboard
    systemTitle: 'نظام تتبع الإقرارات',
    streamlineWorkflow: 'بسّط سير عمل الإقرارات',
    streamlineDesc: 'حوّل التتبع اليدوي إلى سير عمل رقمي ذكي مع تحديثات الحالة الفورية والموافقات الآلية والتقارير الشاملة.',
    unsigned: 'غير موقّع',
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
    archived: 'مؤرشف',
    recentActivity: 'النشاط الأخير',
    quickActions: 'إجراءات سريعة',
    addDeclaration: 'إضافة إقرار',
    viewReports: 'عرض التقارير',
    weeklyTrend: 'الاتجاه الأسبوعي',
    dailyActivity: 'النشاط اليومي',
    comparison: 'مقارنة',
    
    // Manage
    declarations: 'الإقرارات',
    search: 'بحث',
    filter: 'فلتر',
    status: 'الحالة',
    allStatuses: 'جميع الحالات',
    declarationId: 'رقم الإقرار',
    type: 'النوع',
    sender: 'المرسل',
    createdDate: 'تاريخ الإنشاء',
    actions: 'الإجراءات',
    bulkActions: 'إجراءات جماعية',
    showing: 'عرض',
    of: 'من',
    results: 'نتيجة',
    selected: 'محدد',
    
    // Reports
    reportsAnalytics: 'التقارير والتحليلات',
    overview: 'نظرة عامة',
    statusDistribution: 'توزيع الحالات',
    userActivity: 'نشاط المستخدمين',
    exportPDF: 'تصدير PDF',
    exportExcel: 'تصدير Excel',
    exportCSV: 'تصدير CSV',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
    document.documentElement.dir = language === 'en' ? 'rtl' : 'ltr';
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
