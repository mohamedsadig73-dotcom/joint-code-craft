import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    welcome: 'Welcome',
    all: 'All',
    recentDeclarations: 'Recent Declarations',
    exportAllDeclarations: 'Export All Declarations',
    
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
    sendInvitation: 'Send Invitation',
    invitationSent: 'Invitation sent successfully to',
    invitationFailed: 'Failed to send invitation',
    sending: 'Sending...',
    invitationDescription: 'An invitation will be sent to this email',
    howItWorks: 'How it works:',
    invitationStep1: 'An invitation email is sent',
    invitationStep2: 'User clicks the link in the email',
    invitationStep3: 'User sets their password',
    invitationStep4: 'User logs into the system',
    
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
    
    // Declaration Details
    declarationDetails: 'Declaration Details',
    declarationInfo: 'Declaration Information',
    declarationNumber: 'Declaration Number',
    updateStatus: 'Update Status',
    currentStatus: 'Current Status',
    timeline: 'Timeline',
    viewTimeline: 'View Timeline',
    backToManage: 'Back to Manage',
    createdBy: 'Created By',
    lastUpdated: 'Last Updated',
    statusHistory: 'Status History',
    changedBy: 'Changed By',
    changedAt: 'Changed At',
    oldStatus: 'Old Status',
    newStatus: 'New Status',
    notes: 'Notes',
    noNotes: 'No notes',
    statusUpdated: 'Status updated successfully',
    statusUpdateFailed: 'Failed to update status',
    declarationNotFound: 'Declaration not found',
    
    // Create Declaration
    createDeclaration: 'Create Declaration',
    createNewDeclaration: 'Create New Declaration',
    enterDeclarationDetails: 'Enter declaration details',
    declarationNumberLabel: 'Declaration Number',
    declarationType: 'Declaration Type',
    selectType: 'Select Type',
    entrance: 'Entrance',
    exit: 'Exit',
    initialStatus: 'Initial Status',
    selectStatus: 'Select Status',
    declarationCreated: 'Declaration created successfully',
    declarationCreationFailed: 'Failed to create declaration',
    numberTooShort: 'Declaration number must be at least 3 digits',
    numberTooLong: 'Declaration number is too long',
    numbersOnly: 'Must contain numbers only',
    mustSelectType: 'Must select declaration type',
    mustLogin: 'Must be logged in',
    numberExists: 'Declaration number already exists',
    
    // Login/Signup
    signup: 'Sign Up',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    signupSuccess: 'Account created successfully',
    signupFailed: 'Failed to create account',
    enterUsername: 'Please enter username',
    loggingIn: 'Logging in...',
    creatingAccount: 'Creating account...',
    
    // Messages
    success: 'Success',
    error: 'Error',
    loading: 'Loading...',
    noData: 'No data available',
    loadingData: 'Loading data...',
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
    profileSubtitle: 'Manage your personal information and account settings',
    accountRole: 'Account Role',
    passwordMinLength: 'Password must be at least 6 characters',
    invalidData: 'Invalid data entered',
    passwordChangeFailed: 'Failed to change password',
    passwordChangeSuccess: 'Password changed successfully',
    
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
    monthlyTrends: 'Monthly Trends',
    completionRate: 'Completion Rate',
    avgProcessingTime: 'Avg. Processing',
    days: 'days',
    savedFilters: 'Saved Filters',
    noSavedFilters: 'No saved filters',
    saveCurrentFilter: 'Save current filter',
    saveFilter: 'Save Filter',
    saveFilterDescription: 'Save your current filter settings for quick access',
    filterNamePlaceholder: 'Filter name...',
    filterSaved: 'Filter saved successfully',
    filterDeleted: 'Filter deleted',
    filterApplied: 'Filter applied',
    enterFilterName: 'Please enter a filter name',
    
    // Navigation
    home: 'Home',
    maintenance: 'Maintenance',
    installApp: 'Install App',
    auditLog: 'Audit Log',
    checkingUpdates: 'Checking updates',
    noUpdates: 'No updates available',
    updateAvailable: 'Update available',
    pageWillReload: 'Page will reload to apply update...',
    youUsingLatest: 'You are using the latest version',
    serviceWorkerNotRegistered: 'Service Worker not registered',
    notSupported: 'Not supported',
    browserNotSupport: 'Your browser does not support Service Worker',
    updateCheckFailed: 'Failed to check for updates',
    forceUpdate: 'Update',
    
    // Archive Files
    archiveFiles: 'Archive Files',
    archiveFilesManagement: 'Archive Files Management',
    addArchiveFile: 'Add Archive File',
    archiveNumber: 'Archive Number',
    archiveDescription: 'Description',
    declarationsCount: 'Declarations Count',
    createdAt: 'Created At',
    noArchiveFiles: 'No archive files',
    addFirstArchiveFile: 'Add your first archive file',
    enterArchiveNumber: 'Enter archive number',
    enterDescription: 'Enter description (optional)',
    add: 'Add',
    adding: 'Adding...',
    archiveFileAdded: 'Archive file added successfully',
    archiveFileDeleted: 'Archive file deleted successfully',
    archiveFileExists: 'Archive number already exists',
    cannotDeleteArchive: 'Cannot delete archive file with linked declarations',
    confirmDeleteArchive: 'Are you sure you want to delete this archive file?',
    unknown: 'Unknown',
    noRecentDeclarations: 'No recent declarations',
    
    // Manage Page Extended
    trashBin: 'Trash Bin',
    allSendersFilter: 'All Senders',
    exportExcelBtn: 'Export Excel',
    exportPDFBtn: 'Export PDF',
    manageArchiveFiles: 'Manage archive files and declarations',
    movedToTrash: 'Declaration moved to trash',
    alreadyDeleted: 'Declaration already deleted',
    
    // Maintenance
    maintenanceSystem: 'Maintenance System',
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
    welcome: 'مرحباً',
    all: 'الكل',
    recentDeclarations: 'الإقرارات الحديثة',
    exportAllDeclarations: 'تصدير جميع الإقرارات',
    
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
    sendInvitation: 'إرسال الدعوة',
    invitationSent: 'تم إرسال الدعوة بنجاح إلى',
    invitationFailed: 'فشل إرسال الدعوة',
    sending: 'جاري الإرسال...',
    invitationDescription: 'سيتم إرسال رسالة دعوة إلى هذا البريد الإلكتروني',
    howItWorks: 'كيف يعمل النظام:',
    invitationStep1: 'يتم إرسال رسالة دعوة إلى البريد الإلكتروني',
    invitationStep2: 'المستخدم يضغط على الرابط في الرسالة',
    invitationStep3: 'يقوم بتعيين كلمة المرور الخاصة به',
    invitationStep4: 'يدخل إلى النظام مباشرة',
    
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
    draft: 'مسودة',
    pendingWarehouseSignature: 'بانتظار توقيع المخزن',
    warehouseSigned: 'موقّع من المخزن',
    sentToAdminOffice: 'مُرسل إلى المكتب الإداري',
    receivedByAdminOffice: 'مستلم من المكتب الإداري',
    returnedToWarehouse: 'مُعاد إلى المخزن للأرشفة',
    rejected: 'مرفوض / يحتاج إلى تصحيح',
    
    // Declaration Details
    declarationDetails: 'تفاصيل الإقرار',
    declarationInfo: 'معلومات الإقرار',
    declarationNumber: 'رقم الإقرار',
    updateStatus: 'تحديث الحالة',
    currentStatus: 'الحالة الحالية',
    timeline: 'المسار الزمني',
    viewTimeline: 'عرض المسار الزمني',
    backToManage: 'العودة إلى الإدارة',
    createdBy: 'أنشئ بواسطة',
    lastUpdated: 'آخر تحديث',
    statusHistory: 'سجل الحالات',
    changedBy: 'تم التغيير بواسطة',
    changedAt: 'وقت التغيير',
    oldStatus: 'الحالة السابقة',
    newStatus: 'الحالة الجديدة',
    notes: 'ملاحظات',
    noNotes: 'لا توجد ملاحظات',
    statusUpdated: 'تم تحديث الحالة بنجاح',
    statusUpdateFailed: 'فشل تحديث الحالة',
    declarationNotFound: 'الإقرار غير موجود',
    
    // Create Declaration
    createDeclaration: 'إنشاء إقرار',
    createNewDeclaration: 'إنشاء إقرار جديد',
    enterDeclarationDetails: 'أدخل تفاصيل الإقرار',
    declarationNumberLabel: 'رقم الإقرار',
    declarationType: 'نوع الإقرار',
    selectType: 'اختر النوع',
    entrance: 'دخول',
    exit: 'خروج',
    initialStatus: 'الحالة الأولية',
    selectStatus: 'اختر الحالة',
    declarationCreated: 'تم إنشاء الإقرار بنجاح',
    declarationCreationFailed: 'فشل إنشاء الإقرار',
    numberTooShort: 'رقم الإقرار يجب أن يكون 3 أرقام على الأقل',
    numberTooLong: 'رقم الإقرار طويل جداً',
    numbersOnly: 'يجب أن يحتوي على أرقام فقط',
    mustSelectType: 'يجب اختيار نوع الإقرار',
    mustLogin: 'يجب تسجيل الدخول أولاً',
    numberExists: 'رقم الإقرار موجود بالفعل',
    
    // Login/Signup
    signup: 'إنشاء حساب',
    createAccount: 'إنشاء حساب',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    dontHaveAccount: 'ليس لديك حساب؟',
    signupSuccess: 'تم إنشاء الحساب بنجاح',
    signupFailed: 'فشل إنشاء الحساب',
    enterUsername: 'الرجاء إدخال اسم المستخدم',
    loggingIn: 'جاري تسجيل الدخول...',
    creatingAccount: 'جاري إنشاء الحساب...',
    
    // Messages
    success: 'نجح',
    error: 'خطأ',
    loading: 'جاري التحميل...',
    noData: 'لا توجد بيانات',
    loadingData: 'جاري تحميل البيانات...',
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
    profileSubtitle: 'إدارة معلوماتك الشخصية وإعدادات الحساب',
    accountRole: 'صلاحية الحساب',
    passwordMinLength: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    invalidData: 'البيانات المدخلة غير صحيحة',
    passwordChangeFailed: 'فشل تغيير كلمة المرور',
    passwordChangeSuccess: 'تم تغيير كلمة المرور بنجاح',
    
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
    monthlyTrends: 'الاتجاهات الشهرية',
    
    // Navigation
    home: 'الرئيسية',
    maintenance: 'الصيانة',
    installApp: 'تثبيت التطبيق',
    auditLog: 'سجل التدقيق',
    checkingUpdates: 'جاري التحديث',
    noUpdates: 'لا توجد تحديثات',
    updateAvailable: 'تحديث متاح',
    pageWillReload: 'سيتم إعادة تحميل الصفحة لتطبيق التحديث...',
    youUsingLatest: 'أنت تستخدم أحدث إصدار من التطبيق',
    serviceWorkerNotRegistered: 'Service Worker غير مسجل',
    notSupported: 'غير مدعوم',
    browserNotSupport: 'متصفحك لا يدعم ميزة Service Worker',
    updateCheckFailed: 'فشل التحقق من التحديثات',
    forceUpdate: 'تحديث',
    
    // Archive Files
    archiveFiles: 'ملفات الأرشيف',
    archiveFilesManagement: 'إدارة ملفات الأرشيف',
    addArchiveFile: 'إضافة ملف أرشيف',
    archiveNumber: 'رقم الأرشيف',
    archiveDescription: 'الوصف',
    declarationsCount: 'عدد الإقرارات',
    createdAt: 'تاريخ الإنشاء',
    noArchiveFiles: 'لا توجد ملفات أرشيف',
    addFirstArchiveFile: 'أضف أول ملف أرشيف',
    enterArchiveNumber: 'أدخل رقم الأرشيف',
    enterDescription: 'أدخل الوصف (اختياري)',
    add: 'إضافة',
    adding: 'جاري الإضافة...',
    archiveFileAdded: 'تمت إضافة ملف الأرشيف بنجاح',
    archiveFileDeleted: 'تم حذف ملف الأرشيف بنجاح',
    archiveFileExists: 'رقم الأرشيف موجود بالفعل',
    cannotDeleteArchive: 'لا يمكن حذف ملف أرشيف مرتبط بإقرارات',
    confirmDeleteArchive: 'هل أنت متأكد من حذف ملف الأرشيف هذا؟',
    unknown: 'غير معروف',
    noRecentDeclarations: 'لا توجد إقرارات حديثة',
    
    // Manage Page Extended
    trashBin: 'سلة المحذوفات',
    allSendersFilter: 'جميع المرسلين',
    exportExcelBtn: 'تصدير Excel',
    exportPDFBtn: 'تصدير PDF',
    manageArchiveFiles: 'إدارة ملفات الأرشيف والإقرارات',
    movedToTrash: 'تم نقل الإقرار إلى سلة المحذوفات',
    alreadyDeleted: 'الإقرار محذوف بالفعل',
    
    // Maintenance
    maintenanceSystem: 'نظام الصيانة',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'ar';
  });

  const toggleLanguage = () => {
    setLanguage(prev => {
      const newLang = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('app-language', newLang);
      
      // Update HTML attributes immediately without reload
      document.documentElement.lang = newLang;
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
      
      return newLang;
    });
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  // Set initial HTML attributes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

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
