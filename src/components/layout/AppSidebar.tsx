import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  LayoutDashboard, FileText, Wrench, Package, Wallet, CalendarDays,
  Users, BarChart3, Shield, Database, Settings as SettingsIcon,
  ShieldCheck, Warehouse, Briefcase, FolderCog, ChevronDown,
} from 'lucide-react';

type Leaf = { path: string; label: string };
type Module = {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: Leaf[];
};

/**
 * P1: Sidebar reorganized into 6 logical Modules (Information Architecture).
 *  1) Dashboard (single entry)
 *  2) Operations    — Declarations / Boxes / Maintenance
 *  3) Inventory     — Unified inventory page (with internal Tabs)
 *  4) Master Data   — Items / Data Setup / Suppliers
 *  5) HR & Office   — Employees / Leaves / Holiday / Petty Cash
 *  6) Reports       — Unified reports
 *  7) Admin         — Users / Audit / Settings (admin only)
 */
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const modules: Module[] = useMemo(() => {
    const ops: Leaf[] = [
      { path: '/declarations', label: t('declarations') },
      { path: '/boxes',        label: t('boxesManagement') },
      { path: '/maintenance',  label: t('maintenance') },
    ];

    const inv: Leaf[] = [
      { path: '/inventory?tab=transactions', label: t('declarations_and_movements') || 'الحركات' },
      { path: '/inventory/voucher/opening', label: t('openingBalanceVoucher') || 'الأرصدة الافتتاحية' },
      { path: '/inventory/voucher/receipt', label: t('materialReceiptVoucher') || 'سند استلام مواد' },
      { path: '/inventory/voucher/issue',   label: t('materialIssueVoucher')   || 'سند صرف مواد' },
      { path: '/inventory?tab=stock',        label: t('stock') },
      { path: '/inventory?tab=alerts',       label: t('lowStockAlerts') },
      { path: '/inventory?tab=counts',       label: t('stockCountsNav') },
      { path: '/inventory?tab=custody',      label: t('custody') },
      { path: '/inventory?tab=locations',    label: t('locations') },
    ];

    const master: Leaf[] = [
      { path: '/boxes/items?tab=list', label: t('itemsMaster') || 'الأصناف' },
    ];
    if (user?.role === 'admin' || user?.role === 'manager') {
      master.push({ path: '/boxes/items/smart-new',     label: t('smartItemEntry') || 'إدخال صنف ذكي' });
      master.push({ path: '/boxes/items?tab=approvals',  label: t('itemApprovalsNav') });
      master.push({ path: '/boxes/items?tab=images',     label: t('itemImageHistory') || 'سجل الصور' });
      master.push({ path: '/boxes/items?tab=import',     label: t('importItemsTitle') || 'الاستيراد' });
      master.push({ path: '/admin/supplier-price-import', label: t('supplierPriceImport') });
    }
    if (user?.role === 'admin') {
      master.push({ path: '/admin/data-setup', label: t('dataSetup') });
      master.push({ path: '/admin/naming-system', label: t('namingSystemTitle') || 'نظام التسمية' });
    }

    const hr: Leaf[] = [
      { path: '/employees',          label: t('employeesManagement') },
      { path: '/leave-tracking',     label: t('leaveTracking') },
      { path: '/holiday-attendance', label: t('holidayAttendance') },
      { path: '/petty-cash',         label: t('pettyCash') },
    ];

    const reports: Leaf[] = [
      { path: '/reports-analytics', label: t('reportsTitle') },
    ];

    const admin: Leaf[] = [];
    if (user?.role === 'manager' || user?.role === 'admin') {
      admin.push({ path: '/manager-dashboard', label: t('managerDashboard') });
    }
    if (user?.role === 'admin') {
      admin.push({ path: '/admin',                  label: t('adminDashboard') });
      admin.push({ path: '/admin/app-settings',     label: t('appSettingsNav') });
      admin.push({ path: '/audit-logs',             label: t('auditLogsTitle') || 'سجل التدقيق' });
      admin.push({ path: '/admin/rls-diagnostics',  label: t('rlsDiagnosticsNav') });
    }

    const list: Module[] = [
      { key: 'operations',  label: t('operationsModule')  || 'العمليات',          icon: FileText,  items: ops },
      { key: 'inventory',   label: t('inventoryModule')   || 'المخزون',           icon: Warehouse, items: inv },
      { key: 'master',      label: t('masterDataModule')  || 'البيانات الرئيسية', icon: FolderCog, items: master },
      { key: 'hr',          label: t('hrOfficeModule')    || 'الموارد والمكتب',   icon: Briefcase, items: hr },
      { key: 'reports',     label: t('reportsModule')     || 'التقارير',          icon: BarChart3, items: reports },
    ];
    if (admin.length) list.push({ key: 'admin', label: t('administration') || 'الإدارة', icon: Shield, items: admin });
    return list;
  }, [user?.role, t, language]);

  // Auto-expand the module containing the active route on initial render.
  const initialOpen = useMemo(() => {
    const m: Record<string, boolean> = {};
    modules.forEach((mod) => {
      m[mod.key] = mod.items.some((it) => pathname === it.path.split('?')[0]);
    });
    // Always open at least one
    if (!Object.values(m).some(Boolean) && modules[0]) m[modules[0].key] = true;
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(initialOpen);
  const toggle = (k: string) => setOpenMap((p) => ({ ...p, [k]: !p[k] }));

  const isLeafActive = (leafPath: string) => {
    const [path, query] = leafPath.split('?');
    if (pathname !== path) return false;
    if (!query) return true;
    const params = new URLSearchParams(query);
    const search = new URLSearchParams(window.location.search);
    for (const [k, v] of params) if (search.get(k) !== v) return false;
    return true;
  };

  return (
    <Sidebar collapsible="icon" side={language === 'ar' ? 'right' : 'left'}>
      <SidebarHeader className="px-3 py-3 border-b">
        {!collapsed ? (
          <h1 className="text-base font-bold gradient-text whitespace-nowrap">إدارة المخزن</h1>
        ) : (
          <div className="h-6 w-6 rounded bg-primary/20" />
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Single Dashboard entry at the top */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/'} tooltip={t('dashboard') || 'لوحة التحكم'}>
                  <NavLink to="/" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{t('dashboard') || 'لوحة التحكم'}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 6 Modules */}
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isOpen = !!openMap[mod.key];

          // When sidebar is collapsed (icon-only), render as a flat menu using the icon.
          if (collapsed) {
            return (
              <SidebarGroup key={mod.key}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {mod.items.map((leaf) => (
                      <SidebarMenuItem key={leaf.path}>
                        <SidebarMenuButton asChild isActive={isLeafActive(leaf.path)} tooltip={leaf.label}>
                          <NavLink to={leaf.path} className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <Collapsible key={mod.key} open={isOpen} onOpenChange={() => toggle(mod.key)}>
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between hover:text-foreground transition-colors">
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {mod.label}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {mod.items.map((leaf) => (
                        <SidebarMenuSubItem key={leaf.path}>
                          <SidebarMenuSubButton asChild isActive={isLeafActive(leaf.path)}>
                            <NavLink to={leaf.path}>
                              <span className="truncate">{leaf.label}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
