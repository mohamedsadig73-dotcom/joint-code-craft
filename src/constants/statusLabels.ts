// ===========================================
// UNIFIED CONSTANTS FILE
// All status labels, colors, permissions, and UI constants
// ===========================================

// Declaration status labels (Arabic)
export const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending_warehouse_signature: 'بانتظار التوقيع',
  warehouse_signed: 'موقّع',
  sent_to_admin_office: 'مُرسل',
  received_by_admin_office: 'مستلم',
  returned_to_warehouse: 'مُعاد',
  archived: 'مؤرشف',
  rejected: 'مرفوض',
};

// Status colors for badges
export const statusColors: Record<string, string> = {
  draft: 'bg-muted/20 text-muted-foreground border-muted/30',
  pending_warehouse_signature: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  warehouse_signed: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  sent_to_admin_office: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  received_by_admin_office: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  returned_to_warehouse: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  archived: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
};

// Maintenance status labels
export const maintenanceStatusLabels: Record<string, string> = {
  pending: 'مطلوب',
  done: 'تم',
  not_required: 'غير مطلوب',
  overdue: 'متأخر',
};

// Maintenance status colors
export const maintenanceStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  done: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  not_required: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  overdue: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
};

// Frequency labels
export const frequencyLabels: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  semiannual: 'نصف سنوي',
  annual: 'سنوي',
  ad_hoc: 'عند الحاجة',
};

// Asset type labels
export const assetTypeLabels: Record<string, string> = {
  electrical: 'كهربائي',
  plumbing: 'سباكة',
  hvac: 'تكييف',
  safety: 'أمان',
  equipment: 'معدات',
  building: 'مبنى',
  other: 'أخرى',
};

// Audit action labels
export const auditActionLabels: Record<string, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تحديث',
  DELETE: 'حذف',
  ASSIGN_ROLE: 'تعيين دور',
  UPDATE_ROLE: 'تحديث دور',
  REMOVE_ROLE: 'إزالة دور',
};

// Audit action colors
export const auditActionColors: Record<string, string> = {
  CREATE: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  UPDATE: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  DELETE: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  ASSIGN_ROLE: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  UPDATE_ROLE: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  REMOVE_ROLE: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
};

// Table labels for audit logs
export const tableLabels: Record<string, string> = {
  declarations: 'الإقرارات',
  user_roles: 'أدوار المستخدمين',
  profiles: 'الملفات الشخصية',
  maintenance_items: 'بنود الصيانة',
  maintenance_schedule: 'جدول الصيانة',
  maintenance_assets: 'الأصول',
  maintenance_vendors: 'الموردين',
};

// Chart colors using CSS variables
export const CHART_COLORS = {
  admin: 'hsl(var(--destructive))',
  manager: 'hsl(var(--chart-2))',
  user: 'hsl(var(--chart-1))',
  draft: 'hsl(var(--muted))',
  pending: 'hsl(var(--chart-3))',
  signed: 'hsl(var(--chart-1))',
  sent: 'hsl(var(--chart-2))',
  received: 'hsl(var(--primary))',
  returned: 'hsl(var(--chart-4))',
  archived: 'hsl(var(--chart-5))',
  rejected: 'hsl(var(--destructive))',
  entrance: 'hsl(var(--chart-1))',
  exit: 'hsl(var(--chart-2))',
};

// Status color map for charts
export const statusColorMap: Record<string, string> = {
  draft: CHART_COLORS.draft,
  pending_warehouse_signature: CHART_COLORS.pending,
  warehouse_signed: CHART_COLORS.signed,
  sent_to_admin_office: CHART_COLORS.sent,
  received_by_admin_office: CHART_COLORS.received,
  returned_to_warehouse: CHART_COLORS.returned,
  archived: CHART_COLORS.archived,
  rejected: CHART_COLORS.rejected,
};

// Role labels
export const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  manager: 'مدير فرعي',
  user: 'مستخدم',
};

// Role badge colors
export const roleBadgeColors: Record<string, string> = {
  admin: 'bg-destructive/20 text-destructive border-destructive/30',
  manager: 'bg-warning/20 text-warning border-warning/30',
  user: 'bg-primary/20 text-primary border-primary/30',
};

// Role permissions info
export const rolePermissions = {
  admin: {
    labelKey: 'systemAdmin',
    color: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
    permissionsKeys: [
      'viewAllDeclarations',
      'createEditDeleteDeclarations',
      'changeAnyDeclarationStatus',
      'manageAllUsers',
      'addDeleteUsers',
      'changeUserPermissions',
      'viewReportsStatistics',
      'fullSystemAccess',
    ],
  },
  manager: {
    labelKey: 'subManager',
    color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
    permissionsKeys: [
      'viewAllDeclarations',
      'createEditDeclarations',
      'changeAllDeclarationStatus',
      'viewUserInformation',
      'viewReportsStatistics',
    ],
  },
  user: {
    labelKey: 'regularUser',
    color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    permissionsKeys: [
      'viewAllDeclarations',
      'createNewDeclarations',
      'editOwnDeclarations',
      'changeOwnDeclarationStatus',
      'viewOwnProfile',
    ],
  },
};

// Empty state messages
export const emptyStateMessages = {
  declarations: {
    title: 'لا توجد إقرارات',
    description: 'لم يتم إنشاء أي إقرارات بعد. ابدأ بإنشاء إقرار جديد.',
  },
  trash: {
    title: 'سلة المحذوفات فارغة',
    description: 'لا توجد عناصر محذوفة حالياً.',
  },
  users: {
    title: 'لا يوجد مستخدمين',
    description: 'لم يتم تسجيل أي مستخدمين بعد.',
  },
  maintenance: {
    title: 'لا توجد بنود صيانة',
    description: 'لم يتم إضافة أي بنود صيانة. ابدأ بإضافة بند جديد.',
  },
  vendors: {
    title: 'لا يوجد موردين',
    description: 'لم يتم تسجيل أي موردين بعد.',
  },
  assets: {
    title: 'لا توجد أصول',
    description: 'لم يتم تسجيل أي أصول بعد.',
  },
  activities: {
    title: 'لا توجد نشاطات',
    description: 'لم يتم تسجيل أي نشاطات حديثة.',
  },
  search: {
    title: 'لا توجد نتائج',
    description: 'لم يتم العثور على نتائج مطابقة لبحثك.',
  },
  auditLogs: {
    title: 'لا توجد سجلات',
    description: 'لم يتم تسجيل أي عمليات بعد.',
  },
};