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
    users: 'Users',
    adminDashboard: 'Admin Dashboard',
    
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
    
    // Admin Dashboard
    adminDashboardTitle: 'Admin Dashboard',
    adminDashboardSubtitle: 'Comprehensive view of system statistics and activities',
    totalUsers: 'Total Users',
    allSystemAccounts: 'All system accounts',
    systemAdmins: 'System Admins',
    fullAccess: 'Full access',
    managers: 'Managers',
    managerialPermissions: 'Managerial permissions',
    totalDeclarations: 'Total Declarations',
    allDeclarations: 'All declarations',
    userDistribution: 'User Distribution by Roles',
    rolePercentage: 'Percentage of each role type',
    declarationDistribution: 'Declaration Distribution by Status',
    countByStage: 'Count of declarations in each stage',
    recentActivities: 'Recent Activities',
    latestSystemChanges: 'Latest system changes',
    noRecentActivities: 'No recent activities',
    statistics: 'Statistics',
    userManagement: 'User Management',
    
    // User Management
    permissionsGuide: 'Permissions Guide',
    systemAdmin: 'System Admin',
    subManager: 'Manager',
    regularUser: 'User',
    usersCount: 'Users',
    refresh: 'Refresh',
    addUser: 'Add User',
    addNewUser: 'Add New User',
    createUserAccount: 'Create a new user account and set their permissions',
    email: 'Email',
    role: 'Role',
    creationDate: 'Creation Date',
    cancel: 'Cancel',
    create: 'Create',
    creating: 'Creating...',
    createUser: 'Create User',
    areYouSure: 'Are You Sure?',
    deleteRoleWarning: 'This action will delete the user\'s permissions. To completely delete the user from the system, you must do so from the database control panel.',
    delete: 'Delete',
    deletePermissions: 'Delete Permissions',
    
    // Permissions
    viewAllDeclarations: 'View all declarations',
    createEditDeleteDeclarations: 'Create, edit, and delete declarations',
    changeAnyDeclarationStatus: 'Change any declaration status',
    manageAllUsers: 'Manage all users',
    addDeleteUsers: 'Add and delete users',
    changeUserPermissions: 'Change user permissions',
    viewReportsStatistics: 'View reports and statistics',
    fullSystemAccess: 'Full system access',
    createEditDeclarations: 'Create and edit declarations',
    changeAllDeclarationStatus: 'Change all declaration statuses',
    viewUserInformation: 'View user information',
    createNewDeclarations: 'Create new declarations',
    editOwnDeclarations: 'Edit own declarations only',
    changeOwnDeclarationStatus: 'Change own declaration statuses only',
    viewOwnProfile: 'View own profile',
    
    // Status Labels
    draft: 'Draft',
    pendingWarehouseSignature: 'Pending Signature',
    warehouseSigned: 'Signed',
    sentToAdminOffice: 'Sent',
    receivedByAdminOffice: 'Received',
    returnedToWarehouse: 'Returned',
    rejected: 'Rejected',
    
    // Messages
    success: 'Success',
    error: 'Error',
    loading: 'Loading...',
    userRoleUpdated: 'User role updated successfully',
    userCreatedSuccess: 'User created successfully',
    fillAllFields: 'Please fill all fields',
    userCreationFailed: 'User creation failed',
    permissionsDeleted: 'Permissions deleted.',
    
    // Dashboard Specific
    dashboardSubtitle: 'Track and manage all your declarations in one place',
    manageUsers: 'Manage Users',
    viewAll: 'View All',
    noDeclarations: 'No declarations found',
    recentDeclarations: 'Recent Declarations',
    
    // Manage Page
    manageDeclarations: 'Manage Declarations',
    manageSubtitle: 'View, filter, and manage all system declarations',
    searchPlaceholder: 'Search by ID or sender...',
    filterBySender: 'Filter by Sender',
    allSenders: 'All Senders',
    filterByDate: 'Filter by Date',
    dateRange: 'Date Range',
    from: 'From',
    to: 'To',
    clearFilters: 'Clear Filters',
    selectAll: 'Select All',
    selected: 'selected',
    exportSelected: 'Export Selected',
    deleteSelected: 'Delete Selected',
    noDeclarationsFound: 'No declarations found',
    tryAdjustingFilters: 'Try adjusting your filters',
    bulkExport: 'Bulk Export',
    
    // Reports Page
    reportsTitle: 'Reports & Analytics',
    reportsSubtitle: 'Comprehensive analysis of declarations and system performance',
    exportOptions: 'Export Options',
    statusBreakdown: 'Status Breakdown',
    declarationsOverTime: 'Declarations Over Time',
    topUsers: 'Top Users',
    by: 'by',
    
    // Profile Page
    myProfile: 'My Profile',
    personalInformation: 'Personal Information',
    accountSettings: 'Account Settings',
    securitySettings: 'Security Settings',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    updatePassword: 'Update Password',
    passwordUpdated: 'Password updated successfully',
    passwordMismatch: 'Passwords do not match',
    saveChanges: 'Save Changes',
    
    // Common Actions
    view: 'View',
    edit: 'Edit',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    close: 'Close',
    save: 'Save',
    update: 'Update',
    confirm: 'Confirm',
    
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
    users: 'المستخدمون',
    adminDashboard: 'لوحة المدير',
    
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
    
    // Admin Dashboard
    adminDashboardTitle: 'لوحة تحكم المدير',
    adminDashboardSubtitle: 'نظرة شاملة على إحصائيات النظام والنشاطات',
    totalUsers: 'إجمالي المستخدمين',
    allSystemAccounts: 'جميع حسابات النظام',
    systemAdmins: 'مدراء النظام',
    fullAccess: 'صلاحية كاملة',
    managers: 'المدراء الفرعيين',
    managerialPermissions: 'صلاحيات إدارية',
    totalDeclarations: 'إجمالي الإقرارات',
    allDeclarations: 'جميع الإقرارات',
    userDistribution: 'توزيع المستخدمين حسب الصلاحيات',
    rolePercentage: 'نسبة كل نوع من الصلاحيات',
    declarationDistribution: 'توزيع الإقرارات حسب الحالة',
    countByStage: 'عدد الإقرارات في كل مرحلة',
    recentActivities: 'آخر النشاطات',
    latestSystemChanges: 'أحدث التغييرات في النظام',
    noRecentActivities: 'لا توجد نشاطات حديثة',
    statistics: 'الإحصائيات',
    userManagement: 'إدارة المستخدمين',
    
    // User Management
    permissionsGuide: 'دليل الصلاحيات',
    systemAdmin: 'مدير النظام',
    subManager: 'مدير فرعي',
    regularUser: 'مستخدم',
    usersCount: 'المستخدمون',
    refresh: 'تحديث',
    addUser: 'إضافة مستخدم',
    addNewUser: 'إضافة مستخدم جديد',
    createUserAccount: 'قم بإنشاء حساب مستخدم جديد وتحديد صلاحياته',
    email: 'البريد الإلكتروني',
    role: 'الصلاحية',
    creationDate: 'تاريخ الإنشاء',
    cancel: 'إلغاء',
    create: 'إنشاء',
    creating: 'جاري الإنشاء...',
    createUser: 'إنشاء المستخدم',
    areYouSure: 'هل أنت متأكد؟',
    deleteRoleWarning: 'هذا الإجراء سيحذف صلاحيات المستخدم. لحذف المستخدم بالكامل من النظام، يجب القيام بذلك من لوحة تحكم قاعدة البيانات.',
    delete: 'حذف',
    deletePermissions: 'حذف الصلاحيات',
    
    // Permissions
    viewAllDeclarations: 'View all declarations',
    createEditDeleteDeclarations: 'Create, edit, and delete declarations',
    changeAnyDeclarationStatus: 'Change any declaration status',
    manageAllUsers: 'Manage all users',
    addDeleteUsers: 'Add and delete users',
    changeUserPermissions: 'Change user permissions',
    viewReportsStatistics: 'View reports and statistics',
    fullSystemAccess: 'Full system access',
    createEditDeclarations: 'Create and edit declarations',
    changeAllDeclarationStatus: 'Change all declaration statuses',
    viewUserInformation: 'View user information',
    createNewDeclarations: 'Create new declarations',
    editOwnDeclarations: 'Edit own declarations only',
    changeOwnDeclarationStatus: 'Change own declaration statuses only',
    viewOwnProfile: 'View own profile',
    
    // Status Labels
    draft: 'Draft',
    pendingWarehouseSignature: 'Pending Signature',
    warehouseSigned: 'Signed',
    sentToAdminOffice: 'Sent',
    receivedByAdminOffice: 'Received',
    returnedToWarehouse: 'Returned',
    rejected: 'Rejected',
    
    // Messages
    success: 'Success',
    error: 'Error',
    loading: 'Loading...',
    userRoleUpdated: 'User role updated successfully',
    userCreatedSuccess: 'User created successfully',
    fillAllFields: 'Please fill all fields',
    userCreationFailed: 'User creation failed',
    permissionsDeleted: 'Permissions deleted.',
    
    // Dashboard Specific
    dashboardSubtitle: 'تتبع وإدارة جميع إقراراتك في مكان واحد',
    manageUsers: 'إدارة المستخدمين',
    viewAll: 'عرض الكل',
    noDeclarations: 'لا توجد إقرارات',
    recentDeclarations: 'الإقرارات الحديثة',
    
    // Manage Page
    manageDeclarations: 'إدارة الإقرارات',
    manageSubtitle: 'عرض وفلترة وإدارة جميع إقرارات النظام',
    searchPlaceholder: 'البحث برقم الإقرار أو المرسل...',
    filterBySender: 'تصفية حسب المرسل',
    allSenders: 'جميع المرسلين',
    filterByDate: 'تصفية حسب التاريخ',
    dateRange: 'نطاق التاريخ',
    from: 'من',
    to: 'إلى',
    clearFilters: 'مسح الفلاتر',
    selectAll: 'تحديد الكل',
    selected: 'محدد',
    exportSelected: 'تصدير المحدد',
    deleteSelected: 'حذف المحدد',
    noDeclarationsFound: 'لم يتم العثور على إقرارات',
    tryAdjustingFilters: 'حاول تعديل الفلاتر الخاصة بك',
    bulkExport: 'التصدير الجماعي',
    
    // Reports Page
    reportsTitle: 'التقارير والتحليلات',
    reportsSubtitle: 'تحليل شامل للإقرارات وأداء النظام',
    exportOptions: 'خيارات التصدير',
    statusBreakdown: 'تفصيل الحالات',
    declarationsOverTime: 'الإقرارات عبر الوقت',
    topUsers: 'أكثر المستخدمين نشاطاً',
    by: 'بواسطة',
    
    // Profile Page
    myProfile: 'ملفي الشخصي',
    personalInformation: 'المعلومات الشخصية',
    accountSettings: 'إعدادات الحساب',
    securitySettings: 'إعدادات الأمان',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
    updatePassword: 'تحديث كلمة المرور',
    passwordUpdated: 'تم تحديث كلمة المرور بنجاح',
    passwordMismatch: 'كلمتا المرور غير متطابقتين',
    saveChanges: 'حفظ التغييرات',
    
    // Common Actions
    view: 'عرض',
    edit: 'تعديل',
    export: 'تصدير',
    import: 'استيراد',
    print: 'طباعة',
    close: 'إغلاق',
    save: 'حفظ',
    update: 'تحديث',
    confirm: 'تأكيد',
    
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
  const [language, setLanguage] = useState<Language>('ar');

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
