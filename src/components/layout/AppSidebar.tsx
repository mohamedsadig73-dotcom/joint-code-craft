import { useMemo } from 'react';
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
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, FileText, Wrench, Package, Wallet, CalendarDays,
  Users, BarChart3, Shield, Database, Settings as SettingsIcon,
  ShieldCheck, AlertTriangle, ClipboardList,
} from 'lucide-react';

type NavItem = { path: string; icon: typeof LayoutDashboard; labelKey: string };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const isActive = (p: string) => pathname === p;

  const mainItems: NavItem[] = useMemo(() => [
    { path: '/', icon: LayoutDashboard, labelKey: 'home' },
    { path: '/declarations', icon: FileText, labelKey: 'declarations' },
    { path: '/maintenance', icon: Wrench, labelKey: 'maintenance' },
    { path: '/boxes', icon: Package, labelKey: 'boxesManagement' },
    { path: '/petty-cash', icon: Wallet, labelKey: 'pettyCash' },
    { path: '/leave-tracking', icon: FileText, labelKey: 'leaveTracking' },
    { path: '/holiday-attendance', icon: CalendarDays, labelKey: 'holidayAttendance' },
    { path: '/employees', icon: Users, labelKey: 'employeesManagement' },
    { path: '/reports-analytics', icon: BarChart3, labelKey: 'reportsTitle' },
  ], []);

  const inventoryItems: NavItem[] = useMemo(() => {
    const base: NavItem[] = [
      { path: '/inventory/alerts', icon: AlertTriangle, labelKey: 'lowStockAlerts' },
      { path: '/inventory/stock-counts', icon: ClipboardList, labelKey: 'stockCountsNav' },
    ];
    if (user?.role === 'admin' || user?.role === 'manager') {
      base.push({ path: '/admin/item-approvals', icon: ShieldCheck, labelKey: 'itemApprovalsNav' });
      base.push({ path: '/admin/supplier-price-import', icon: Database, labelKey: 'supplierPriceImport' });
    }
    return base;
  }, [user?.role]);

  const adminItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (user?.role === 'manager' || user?.role === 'admin') {
      items.push({ path: '/manager-dashboard', icon: BarChart3, labelKey: 'managerDashboard' });
    }
    if (user?.role === 'admin') {
      items.push({ path: '/admin', icon: Shield, labelKey: 'adminDashboard' });
      items.push({ path: '/admin/data-setup', icon: Database, labelKey: 'dataSetup' });
      items.push({ path: '/admin/app-settings', icon: SettingsIcon, labelKey: 'appSettingsNav' });
      items.push({ path: '/admin/rls-diagnostics', icon: ShieldCheck, labelKey: 'rlsDiagnosticsNav' });
    }
    return items;
  }, [user?.role]);

  const renderGroup = (label: string, items: NavItem[]) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={t(item.labelKey)}>
                    <NavLink to={item.path} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
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
        {renderGroup(t('mainMenu') || 'القائمة الرئيسية', mainItems)}
        {renderGroup(t('inventoryToolsGroup') || 'أدوات المخزون', inventoryItems)}
        {renderGroup(t('administration') || 'الإدارة', adminItems)}
      </SidebarContent>
    </Sidebar>
  );
}
