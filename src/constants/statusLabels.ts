// ===========================================
// UNIFIED CONSTANTS FILE
// All status labels, colors, permissions, and UI constants
// ===========================================

// Status translation key mapping (database key -> translation key)
export const statusTranslationKeys: Record<string, string> = {
  draft: 'draft',
  pending_warehouse_signature: 'pendingWarehouseSignature',
  warehouse_signed: 'warehouseSigned',
  sent_to_admin_office: 'sentToAdminOffice',
  received_by_admin_office: 'receivedByAdminOffice',
  returned_to_warehouse: 'returnedToWarehouse',
  archived: 'archived',
  rejected: 'rejected',
};

// Dynamic status translation keys based on declaration type
export const getDynamicStatusTranslationKey = (dbStatus: string, declarationType?: 'entrance' | 'exit'): string => {
  // For entrance declarations
  if (declarationType === 'entrance') {
    switch (dbStatus) {
      case 'pending_warehouse_signature':
        return 'pendingDelivererSignature'; // بانتظار توقيع المسلم
      case 'warehouse_signed':
        return 'signedByDeliverer'; // موقّع من المسلم
      default:
        return statusTranslationKeys[dbStatus] || dbStatus;
    }
  }
  
  // For exit declarations
  if (declarationType === 'exit') {
    switch (dbStatus) {
      case 'pending_warehouse_signature':
        return 'pendingReceiverSignature'; // بانتظار توقيع المستلم
      case 'warehouse_signed':
        return 'signedByReceiver'; // موقّع من المستلم
      default:
        return statusTranslationKeys[dbStatus] || dbStatus;
    }
  }
  
  return statusTranslationKeys[dbStatus] || dbStatus;
};

// Helper function to get status translation key
export const getStatusTranslationKey = (dbStatus: string): string => {
  return statusTranslationKeys[dbStatus] || dbStatus;
};

// Declaration status labels (Arabic) - for backward compatibility
export const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending_warehouse_signature: 'بانتظار التوقيع',
  warehouse_signed: 'موقّع',
  sent_to_admin_office: 'مرسل إلى المكتب الإداري',
  received_by_admin_office: 'مستلم',
  returned_to_warehouse: 'مُعاد للتعديل',
  archived: 'مؤرشف',
  rejected: 'مرفوض',
};

// English status labels
export const statusLabelsEn: Record<string, string> = {
  draft: 'Draft',
  pending_warehouse_signature: 'Awaiting Signature',
  warehouse_signed: 'Signed',
  sent_to_admin_office: 'Sent to Admin Office',
  received_by_admin_office: 'Received',
  returned_to_warehouse: 'Returned for Modification',
  archived: 'Archived',
  rejected: 'Rejected',
};

// Dynamic status labels based on declaration type (Arabic)
export const getDynamicStatusLabel = (status: string, type?: 'entrance' | 'exit', isArabic = true): string => {
  const labels = isArabic ? {
    // Entrance (دخول) - Deliverer signs
    entrance: {
      pending_warehouse_signature: 'بانتظار توقيع المُسلِّم',
      warehouse_signed: 'موقّع من المُسلِّم',
    },
    // Exit (خروج) - Receiver signs
    exit: {
      pending_warehouse_signature: 'بانتظار توقيع المُستلِم',
      warehouse_signed: 'موقّع من المُستلِم',
    },
  } : {
    entrance: {
      pending_warehouse_signature: 'Awaiting Deliverer Signature',
      warehouse_signed: 'Signed by Deliverer',
    },
    exit: {
      pending_warehouse_signature: 'Awaiting Receiver Signature',
      warehouse_signed: 'Signed by Receiver',
    },
  };
  
  if (type && labels[type]?.[status]) {
    return labels[type][status];
  }
  
  return isArabic ? (statusLabels[status] || status) : (statusLabelsEn[status] || status);
};

// Status colors for badges - Enhanced visibility
export const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40',
  pending_warehouse_signature: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
  warehouse_signed: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40',
  sent_to_admin_office: 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/40',
  received_by_admin_office: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40',
  returned_to_warehouse: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40',
  archived: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  rejected: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40',
};

// Maintenance status translation keys
export const maintenanceStatusTranslationKeys: Record<string, string> = {
  pending: 'pending',
  done: 'done',
  not_required: 'notRequired',
  overdue: 'overdue',
};

// Maintenance status labels (Arabic)
export const maintenanceStatusLabels: Record<string, string> = {
  pending: 'مطلوب',
  done: 'تم',
  not_required: 'غير مطلوب',
  overdue: 'متأخر',
};

// Maintenance status labels (English)
export const maintenanceStatusLabelsEn: Record<string, string> = {
  pending: 'Pending',
  done: 'Completed',
  not_required: 'Not Required',
  overdue: 'Overdue',
};

// Maintenance status colors
export const maintenanceStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  done: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  not_required: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  overdue: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
};

// Frequency translation keys
export const frequencyTranslationKeys: Record<string, string> = {
  monthly: 'monthly',
  quarterly: 'quarterly',
  semiannual: 'semiannual',
  annual: 'annual',
  ad_hoc: 'adHoc',
};

// Frequency labels (Arabic)
export const frequencyLabels: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  semiannual: 'نصف سنوي',
  annual: 'سنوي',
  ad_hoc: 'عند الحاجة',
};

// Frequency labels (English)
export const frequencyLabelsEn: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannual: 'Semi-Annual',
  annual: 'Annual',
  ad_hoc: 'As Needed',
};

// Asset type translation keys
export const assetTypeTranslationKeys: Record<string, string> = {
  electrical: 'electrical',
  plumbing: 'plumbing',
  hvac: 'hvac',
  safety: 'safety',
  equipment: 'equipment',
  building: 'building',
  other: 'other',
};

// Asset type labels (Arabic)
export const assetTypeLabels: Record<string, string> = {
  electrical: 'كهربائي',
  plumbing: 'سباكة',
  hvac: 'تكييف',
  safety: 'أمان',
  equipment: 'معدات',
  building: 'مبنى',
  other: 'أخرى',
};

// Asset type labels (English)
export const assetTypeLabelsEn: Record<string, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  safety: 'Safety',
  equipment: 'Equipment',
  building: 'Building',
  other: 'Other',
};

// Audit action labels (Arabic)
export const auditActionLabels: Record<string, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تحديث',
  DELETE: 'حذف',
  ASSIGN_ROLE: 'تعيين دور',
  UPDATE_ROLE: 'تحديث دور',
  REMOVE_ROLE: 'إزالة دور',
};

// Audit action labels (English)
export const auditActionLabelsEn: Record<string, string> = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  ASSIGN_ROLE: 'Assign Role',
  UPDATE_ROLE: 'Update Role',
  REMOVE_ROLE: 'Remove Role',
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

// Table labels (Arabic)
export const tableLabels: Record<string, string> = {
  declarations: 'الإقرارات',
  user_roles: 'أدوار المستخدمين',
  profiles: 'الملفات الشخصية',
  maintenance_items: 'بنود الصيانة',
  maintenance_schedule: 'جدول الصيانة',
  maintenance_assets: 'الأصول',
  maintenance_vendors: 'الموردين',
};

// Table labels (English)
export const tableLabelsEn: Record<string, string> = {
  declarations: 'Declarations',
  user_roles: 'User Roles',
  profiles: 'Profiles',
  maintenance_items: 'Maintenance Items',
  maintenance_schedule: 'Maintenance Schedule',
  maintenance_assets: 'Assets',
  maintenance_vendors: 'Vendors',
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

// Role labels (Arabic)
export const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  manager: 'مدير',
  user: 'مستخدم',
};

// Role labels (English)
export const roleLabelsEn: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  user: 'User',
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

// Empty state messages (Arabic)
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

// Empty state messages (English)
export const emptyStateMessagesEn = {
  declarations: {
    title: 'No Declarations',
    description: 'No declarations have been created yet. Start by creating a new declaration.',
  },
  trash: {
    title: 'Trash is Empty',
    description: 'No deleted items at this time.',
  },
  users: {
    title: 'No Users',
    description: 'No users have been registered yet.',
  },
  maintenance: {
    title: 'No Maintenance Items',
    description: 'No maintenance items have been added. Start by adding a new item.',
  },
  vendors: {
    title: 'No Vendors',
    description: 'No vendors have been registered yet.',
  },
  assets: {
    title: 'No Assets',
    description: 'No assets have been registered yet.',
  },
  activities: {
    title: 'No Activities',
    description: 'No recent activities have been recorded.',
  },
  search: {
    title: 'No Results',
    description: 'No results found matching your search.',
  },
  auditLogs: {
    title: 'No Logs',
    description: 'No operations have been logged yet.',
  },
};