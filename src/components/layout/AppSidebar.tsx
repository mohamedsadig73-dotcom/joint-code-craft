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
  ShieldCheck, Warehouse, ChevronDown, ClipboardList, Boxes,
} from 'lucide-react';

type Leaf = { path: string; label: string };
type Module = {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: Leaf[];
};

/**
 * IA-Refactor v5 — Reorganized into 5 clean modules (down from 6),
 * inspired by WMS Pro hierarchical pattern. Goal: ~12 visible items
 * instead of ~32. All admin/diagnostic pages collapsed into a single
 * "Settings Hub" tile group, and 3 separate vouchers merged into one
 * `/vouchers` page with internal tabs.
 *
 *  1) Items     — ItemsHub + Smart Entry
 *  2) Vouchers  — Unified Vouchers (opening/receipt/issue) + Movements log
 *  3) Inventory — Stock / Alerts / Counts / Custody / Locations (tabs)
 *  4) Documents — Declarations + Boxes + Maintenance (operations)
 *  5) Office    — Employees / Leaves / Holiday / Petty Cash
 *  6) Reports   — Unified reports hub
 *  7) Admin     — Settings Hub (single entry → tile directory)
 */
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const modules: Module[] = useMemo(() => {
    // 1) ITEMS
    const items: Leaf[] = [
      { path: '/boxes/items?tab=list', label: t('itemsMaster') || 'كل الأصناف' },
    ];
    if (user?.role === 'admin' || user?.role === 'manager') {
      items.push({ path: '/boxes/items/smart-new', label: t('smartItemEntry') || 'إدخال صنف ذكي' });
    }

    // 2) VOUCHERS & MOVEMENTS
    const vouchers: Leaf[] = [
      { path: '/vouchers?tab=receipt',         label: t('materialReceiptVoucher') || 'استلام' },
      { path: '/vouchers?tab=issue',           label: t('materialIssueVoucher')   || 'صرف' },
      { path: '/vouchers?tab=opening',         label: t('openingBalanceVoucher')  || 'أرصدة افتتاحية' },
      { path: '/inventory?tab=transactions',   label: t('declarations_and_movements') || 'سجل الحركات' },
    ];

    // 3) INVENTORY (read/inquiry)
    const inventory: Leaf[] = [
      { path: '/inventory?tab=stock',     label: t('stock')           || 'المخزون الحالي' },
      { path: '/inventory?tab=alerts',    label: t('lowStockAlerts')  || 'تنبيهات' },
      { path: '/inventory?tab=counts',    label: t('stockCountsNav')  || 'الجرد' },
      { path: '/inventory?tab=custody',   label: t('custody')         || 'العُهد' },
      { path: '/inventory?tab=locations', label: t('locations')       || 'المواقع' },
    ];

    // 4) DOCUMENTS & BOXES (Declarations + Boxes + Maintenance grouped)
    const documents: Leaf[] = [
      { path: '/declarations', label: t('declarations')     || 'الإعلانات' },
      { path: '/boxes',        label: t('boxesManagement')  || 'الصناديق' },
      { path: '/maintenance',  label: t('maintenance')      || 'الصيانة' },
    ];

    // 5) OFFICE (HR)
    const office: Leaf[] = [
      { path: '/employees',          label: t('employeesManagement') },
      { path: '/leave-tracking',     label: t('leaveTracking') },
      { path: '/holiday-attendance', label: t('holidayAttendance') },
      { path: '/petty-cash',         label: t('pettyCash') },
    ];

    // 6) REPORTS
    const reports: Leaf[] = [
      { path: '/reports-analytics', label: t('reportsTitle') || 'مركز التقارير' },
    ];

    const list: Module[] = [
      { key: 'items',     label: t('itemsModule')     || 'الأصناف',            icon: Package,       items },
      { key: 'vouchers',  label: t('vouchersModule')  || 'الحركات والسندات',   icon: ClipboardList, items: vouchers },
      { key: 'inventory', label: t('inventoryModule') || 'المخزون',            icon: Warehouse,     items: inventory },
      { key: 'documents', label: t('documentsModule') || 'المستندات والصناديق', icon: Boxes,        items: documents },
      { key: 'office',    label: t('officeModule')    || 'المكتب',             icon: Users,         items: office },
      { key: 'reports',   label: t('reportsModule')   || 'التقارير',           icon: BarChart3,     items: reports },
    ];

    // 7) ADMIN — single tile entry (everything else lives inside the hub)
    if (user?.role === 'manager' || user?.role === 'admin') {
      const admin: Leaf[] = [
        { path: '/admin/settings', label: t('adminSettingsHub') || 'الإدارة والإعدادات' },
      ];
      if (user?.role === 'manager') {
        admin.unshift({ path: '/manager-dashboard', label: t('managerDashboard') });
      }
      list.push({ key: 'admin', label: t('administration') || 'الإدارة', icon: Shield, items: admin });
    }

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
