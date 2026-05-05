/**
 * Single source of truth for application navigation.
 * Consumed by AppSidebar (desktop), MobileBottomNav (mobile primary + More),
 * and the Home launcher. Do NOT define nav lists anywhere else.
 *
 * Sprint 1 (P1) of the architectural refactor.
 */
import {
  LayoutDashboard, FileText, Wrench, Wallet, Package,
  Warehouse, ClipboardList, Boxes, Users, BarChart3, Shield,
  CalendarDays, Home,
} from 'lucide-react';

export type Role = 'admin' | 'manager' | 'user';

export interface NavLeaf {
  /** Path with optional querystring, e.g. `/vouchers?tab=receipt` */
  path: string;
  /** Translation key (resolved via LanguageContext.t) */
  labelKey: string;
  /** Optional fallback label if key is missing */
  fallback?: string;
  /** Icon shown in mobile bottom nav / collapsed sidebar */
  icon?: typeof LayoutDashboard;
  /** Roles that can see this leaf. Empty = visible to all authenticated users. */
  roles?: Role[];
}

export interface NavModule {
  key: string;
  labelKey: string;
  fallback?: string;
  icon: typeof LayoutDashboard;
  items: NavLeaf[];
  roles?: Role[];
}

/** Top-level Dashboard entry (rendered above modules in the sidebar). */
export const dashboardLeaf: NavLeaf = {
  path: '/',
  labelKey: 'dashboard',
  fallback: 'لوحة التحكم',
  icon: LayoutDashboard,
};

/** Module groups used in the desktop sidebar. */
export const navModules: NavModule[] = [
  {
    key: 'items',
    labelKey: 'itemsModule',
    fallback: 'الأصناف',
    icon: Package,
    items: [
      { path: '/boxes/items?tab=list', labelKey: 'itemsMaster', fallback: 'كل الأصناف' },
      { path: '/boxes/items/smart-new', labelKey: 'smartItemEntry', fallback: 'إدخال صنف ذكي', roles: ['admin', 'manager'] },
    ],
  },
  {
    key: 'vouchers',
    labelKey: 'vouchersModule',
    fallback: 'الحركات والسندات',
    icon: ClipboardList,
    items: [
      { path: '/vouchers?tab=receipt',       labelKey: 'materialReceiptVoucher', fallback: 'استلام' },
      { path: '/vouchers?tab=issue',         labelKey: 'materialIssueVoucher',   fallback: 'صرف' },
      { path: '/vouchers?tab=opening',       labelKey: 'openingBalanceVoucher',  fallback: 'أرصدة افتتاحية' },
      { path: '/inventory?tab=transactions', labelKey: 'declarations_and_movements', fallback: 'سجل الحركات' },
    ],
  },
  {
    key: 'inventory',
    labelKey: 'inventoryModule',
    fallback: 'المخزون',
    icon: Warehouse,
    items: [
      { path: '/inventory?tab=stock',     labelKey: 'stock',          fallback: 'المخزون الحالي' },
      { path: '/inventory?tab=alerts',    labelKey: 'lowStockAlerts', fallback: 'تنبيهات' },
      { path: '/inventory?tab=counts',    labelKey: 'stockCountsNav', fallback: 'الجرد' },
      { path: '/inventory?tab=custody',   labelKey: 'custody',        fallback: 'العُهد' },
      { path: '/inventory?tab=locations', labelKey: 'locations',      fallback: 'المواقع' },
    ],
  },
  {
    key: 'documents',
    labelKey: 'documentsModule',
    fallback: 'المستندات والصناديق',
    icon: Boxes,
    items: [
      { path: '/boxes',       labelKey: 'boxesManagement', fallback: 'الصناديق' },
      { path: '/maintenance', labelKey: 'maintenance',     fallback: 'الصيانة' },
    ],
  },
  {
    key: 'office',
    labelKey: 'officeModule',
    fallback: 'المكتب',
    icon: Users,
    items: [
      { path: '/employees',          labelKey: 'employeesManagement' },
      { path: '/leave-tracking',     labelKey: 'leaveTracking' },
      { path: '/holiday-attendance', labelKey: 'holidayAttendance' },
      { path: '/petty-cash',         labelKey: 'pettyCash' },
    ],
  },
  {
    key: 'reports',
    labelKey: 'reportsModule',
    fallback: 'التقارير',
    icon: BarChart3,
    items: [
      { path: '/reports-analytics', labelKey: 'reportsTitle', fallback: 'مركز التقارير' },
    ],
  },
  {
    key: 'admin',
    labelKey: 'administration',
    fallback: 'الإدارة',
    icon: Shield,
    roles: ['admin', 'manager'],
    items: [
      { path: '/manager-dashboard', labelKey: 'managerDashboard', roles: ['manager'] },
      { path: '/admin/settings',    labelKey: 'adminSettingsHub', fallback: 'الإدارة والإعدادات' },
    ],
  },
];

/** Filter helper — returns modules + leaves visible to the given role. */
export function filterNavForRole(role: Role | undefined, modules: NavModule[] = navModules): NavModule[] {
  return modules
    .filter((m) => !m.roles || (role && m.roles.includes(role)))
    .map((m) => ({
      ...m,
      items: m.items.filter((it) => !it.roles || (role && it.roles.includes(role))),
    }))
    .filter((m) => m.items.length > 0);
}

/** Mobile bottom-nav primary slots (max 4 + More). */
export const mobilePrimaryNav: NavLeaf[] = [
  { path: '/',                      icon: Home,     labelKey: 'home' },
  { path: '/vouchers?tab=receipt',  icon: FileText, labelKey: 'vouchersHub' },
  { path: '/maintenance',           icon: Wrench,   labelKey: 'maintenance' },
  { path: '/petty-cash',            icon: Wallet,   labelKey: 'pettyCashShort' },
];

/** Mobile "More" sheet items (secondary). */
export const mobileMoreNav: NavLeaf[] = [
  { path: '/boxes',              icon: Package,      labelKey: 'boxesManagement' },
  { path: '/leave-tracking',     icon: CalendarDays, labelKey: 'leaveShort' },
  { path: '/reports-analytics',  icon: BarChart3,    labelKey: 'reports' },
  { path: '/holiday-attendance', icon: CalendarDays, labelKey: 'holidayAttendance' },
  { path: '/employees',          icon: Users,        labelKey: 'employeesManagement' },
  { path: '/manager-dashboard',  icon: BarChart3,    labelKey: 'managerDashboard', roles: ['admin', 'manager'] },
  { path: '/admin',              icon: Shield,       labelKey: 'adminDashboard',   roles: ['admin'] },
];