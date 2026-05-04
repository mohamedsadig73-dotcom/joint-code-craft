import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from 'react-router-dom';
import {
  Settings as SettingsIcon, Database, Tag, ShieldCheck, FileText,
  Printer, RefreshCw, Users,
} from 'lucide-react';

interface Tile {
  to: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

/**
 * Unified Admin & Settings Hub.
 * Replaces 7+ scattered admin entries in the sidebar with a single
 * directory page. Each tile deep-links to the existing implementation.
 */
export default function AdminSettingsHub() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const tiles: Tile[] = [
    {
      to: '/admin/app-settings',
      title: t('appSettingsNav') || 'إعدادات التطبيق',
      desc: t('appSettingsDesc') || 'الإعدادات العامة للتشغيل',
      icon: SettingsIcon,
      adminOnly: true,
    },
    {
      to: '/admin/data-setup',
      title: t('dataSetup') || 'البيانات الأساسية',
      desc: t('dataSetupDesc') || 'الفئات والوحدات والمواقع',
      icon: Database,
    },
    {
      to: '/admin/naming-system',
      title: t('namingSystemTitle') || 'نظام التسمية',
      desc: t('namingSystemDesc') || 'قواعد توليد أسماء وأكواد الأصناف',
      icon: Tag,
    },
    {
      to: '/admin',
      title: t('adminDashboard') || 'لوحة الإدارة',
      desc: t('adminDashboardDesc') || 'المستخدمون والإحصائيات',
      icon: Users,
      adminOnly: true,
    },
    {
      to: '/audit-logs',
      title: t('auditLogsTitle') || 'سجل التدقيق',
      desc: t('auditLogsDesc') || 'كل التغييرات الحساسة',
      icon: FileText,
      adminOnly: true,
    },
    {
      to: '/admin/rls-diagnostics',
      title: t('rlsDiagnosticsNav') || 'تشخيص الصلاحيات',
      desc: t('rlsDiagnosticsDesc') || 'فحص سياسات RLS',
      icon: ShieldCheck,
      adminOnly: true,
    },
    {
      to: '/print-diagnostics',
      title: t('printDiagnosticsTitle') || 'تشخيص الطباعة',
      desc: t('printDiagnosticsDesc') || 'اختبار وحدات الطباعة',
      icon: Printer,
    },
    {
      to: '/update-diagnostics',
      title: t('updateDiagnosticsTitle') || 'تشخيص التحديثات',
      desc: t('updateDiagnosticsDesc') || 'حالة Service Worker والتحديثات',
      icon: RefreshCw,
      adminOnly: true,
    },
  ];

  const visible = tiles.filter((tile) => !tile.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('adminSettingsHub') || 'الإدارة والإعدادات'}
          subtitle={t('adminSettingsHubDesc') || 'مركز موحّد لإدارة النظام والإعدادات والتشخيصات'}
          icon={SettingsIcon}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((tile) => {
            const Icon = tile.icon;
            return (
              <NavLink to={tile.to} key={tile.to} className="block">
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/40 cursor-pointer">
                  <CardContent className="p-5 flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 text-primary p-2.5 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">{tile.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tile.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </NavLink>
            );
          })}
        </div>
      </main>
    </div>
  );
}