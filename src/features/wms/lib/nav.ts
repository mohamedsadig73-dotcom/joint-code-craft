import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Package, FolderTree, Ruler, Warehouse, MapPin,
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardCheck,
  CheckCircle2, Bell, BarChart3,
} from 'lucide-react';

export interface WmsNavItem {
  to: string;
  labelKey: string;          // i18n key under wms.nav.*
  icon: LucideIcon;
  badgeKey?: string;         // optional dynamic badge source key
}

export interface WmsNavGroup {
  labelKey: string;
  items: WmsNavItem[];
}

export const WMS_NAV: WmsNavGroup[] = [
  {
    labelKey: 'wms.nav.section-main',
    items: [
      { to: '/wms', labelKey: 'wms.nav.dashboard', icon: LayoutDashboard },
    ],
  },
  {
    labelKey: 'wms.nav.section-master',
    items: [
      { to: '/wms/items',       labelKey: 'wms.nav.items',       icon: Package },
      { to: '/wms/categories',  labelKey: 'wms.nav.categories',  icon: FolderTree },
      { to: '/wms/units',       labelKey: 'wms.nav.units',       icon: Ruler },
      { to: '/wms/warehouses',  labelKey: 'wms.nav.warehouses',  icon: Warehouse },
      { to: '/wms/locations',   labelKey: 'wms.nav.locations',   icon: MapPin },
    ],
  },
  {
    labelKey: 'wms.nav.section-movements',
    items: [
      { to: '/wms/receipts',  labelKey: 'wms.nav.receipts',  icon: ArrowDownToLine },
      { to: '/wms/issues',    labelKey: 'wms.nav.issues',    icon: ArrowUpFromLine },
      { to: '/wms/transfers', labelKey: 'wms.nav.transfers', icon: ArrowLeftRight },
      { to: '/wms/stocktake', labelKey: 'wms.nav.stocktake', icon: ClipboardCheck },
      { to: '/wms/approvals', labelKey: 'wms.nav.approvals', icon: CheckCircle2, badgeKey: 'approvals' },
    ],
  },
  {
    labelKey: 'wms.nav.section-monitor',
    items: [
      { to: '/wms/alerts',  labelKey: 'wms.nav.alerts',  icon: Bell, badgeKey: 'alerts' },
      { to: '/wms/reports', labelKey: 'wms.nav.reports', icon: BarChart3 },
    ],
  },
];

/* Mobile bottom-nav: 5 most-used destinations */
export const WMS_MOBILE_NAV: WmsNavItem[] = [
  { to: '/wms',           labelKey: 'wms.nav.dashboard', icon: LayoutDashboard },
  { to: '/wms/items',     labelKey: 'wms.nav.items',     icon: Package },
  { to: '/wms/receipts',  labelKey: 'wms.nav.receipts',  icon: ArrowDownToLine },
  { to: '/wms/issues',    labelKey: 'wms.nav.issues',    icon: ArrowUpFromLine },
  { to: '/wms/reports',   labelKey: 'wms.nav.reports',   icon: BarChart3 },
];