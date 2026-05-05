import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { dashboardLeaf, filterNavForRole, type NavModule, type Role } from '@/config/navigation';
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
  LayoutDashboard, ChevronDown,
} from 'lucide-react';

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

  // P1 — Nav definitions come from src/config/navigation.ts (single source of truth).
  const modules: NavModule[] = useMemo(
    () => filterNavForRole(user?.role as Role | undefined),
    [user?.role]
  );

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
                <SidebarMenuButton asChild isActive={pathname === dashboardLeaf.path} tooltip={t(dashboardLeaf.labelKey) || dashboardLeaf.fallback}>
                  <NavLink to={dashboardLeaf.path} className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{t(dashboardLeaf.labelKey) || dashboardLeaf.fallback}</span>}
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
          const moduleLabel = t(mod.labelKey) || mod.fallback || mod.labelKey;

          // When sidebar is collapsed (icon-only), render as a flat menu using the icon.
          if (collapsed) {
            return (
              <SidebarGroup key={mod.key}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {mod.items.map((leaf) => (
                      <SidebarMenuItem key={leaf.path}>
                        <SidebarMenuButton asChild isActive={isLeafActive(leaf.path)} tooltip={t(leaf.labelKey) || leaf.fallback || leaf.labelKey}>
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
                  <CollapsibleTrigger className="group/label flex w-full items-center gap-2 hover:text-foreground transition-colors">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate text-start">{moduleLabel}</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {mod.items.map((leaf) => (
                        <SidebarMenuSubItem key={leaf.path}>
                          <SidebarMenuSubButton asChild isActive={isLeafActive(leaf.path)}>
                            <NavLink to={leaf.path} className="block w-full text-start">
                              <span className="truncate">{t(leaf.labelKey) || leaf.fallback || leaf.labelKey}</span>
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
