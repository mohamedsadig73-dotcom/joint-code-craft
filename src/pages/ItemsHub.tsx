import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Library, ShieldCheck, History, Sparkles } from 'lucide-react';
import ItemsMaster from './ItemsMaster';
import ItemApprovals from './ItemApprovals';
import ItemImageHistory from './ItemImageHistory';
import ItemsMasterImport from './ItemsMasterImport';

/**
 * P3-b — Unified Items Hub.
 * Merges 4 legacy pages into a single tabbed page:
 *   list | approvals | images | import
 * URL-synced tab via ?tab= for deep-linking and legacy redirects.
 * Approvals & Import tabs are admin/manager only.
 */
type TabKey = 'list' | 'approvals' | 'images' | 'import';
const VALID: TabKey[] = ['list', 'approvals', 'images', 'import'];

export default function ItemsHub() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const requested = (params.get('tab') as TabKey) || 'list';
  const safeInitial: TabKey = VALID.includes(requested)
    ? (!canManage && (requested === 'approvals' || requested === 'import') ? 'list' : requested)
    : 'list';

  const [tab, setTab] = useState<TabKey>(safeInitial);

  useEffect(() => {
    const current = params.get('tab');
    if (current !== tab) {
      const next = new URLSearchParams(params);
      next.set('tab', tab);
      setParams(next, { replace: true });
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
      <PageHeader
        icon={Library}
        title={t('itemsMaster') || 'قاموس الأصناف'}
        subtitle={t('itemsMasterDesc')}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-4">
        <TabsList className={`grid w-full ${canManage ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} max-w-3xl`}>
          <TabsTrigger value="list" className="gap-1.5">
            <Library className="w-4 h-4" />
            <span className="hidden sm:inline">{t('itemsMaster') || 'قاموس الأصناف'}</span>
            <span className="sm:hidden">القائمة</span>
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="approvals" className="gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">{t('itemApprovalsNav') || 'الاعتمادات'}</span>
              <span className="sm:hidden">اعتماد</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="images" className="gap-1.5">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{t('itemImageHistory') || 'سجل الصور'}</span>
            <span className="sm:hidden">الصور</span>
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="import" className="gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">{t('importItemsTitle') || 'الاستيراد'}</span>
              <span className="sm:hidden">استيراد</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <ItemsMaster embedded />
        </TabsContent>
        {canManage && (
          <TabsContent value="approvals" className="mt-4">
            <ItemApprovals embedded />
          </TabsContent>
        )}
        <TabsContent value="images" className="mt-4">
          <ItemImageHistory embedded />
        </TabsContent>
        {canManage && (
          <TabsContent value="import" className="mt-4">
            <ItemsMasterImport embedded />
          </TabsContent>
        )}
      </Tabs>
    </main>
  );
}