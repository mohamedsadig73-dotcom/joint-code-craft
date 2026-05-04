import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Navigation } from '@/components/Navigation';
import { ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { VoucherForm, type VoucherKind } from '@/components/inventory/VoucherForm';

/**
 * Unified Vouchers Hub — replaces 3 separate pages
 * (OpeningBalanceVoucher / ReceiptVoucher / IssueVoucher).
 * Active tab is preserved in the URL via ?tab=opening|receipt|issue.
 */
export default function VouchersHub() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as VoucherKind | null;
  const tab: VoucherKind = raw === 'receipt' || raw === 'issue' || raw === 'opening' ? raw : 'receipt';

  const setTab = (v: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', v);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('vouchersHub') || 'السندات'}
          subtitle={t('vouchersHubDesc') || 'إصدار سندات الاستلام والصرف والأرصدة الافتتاحية'}
          icon={ClipboardList}
        />
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mb-4">
            <TabsTrigger value="receipt">{t('materialReceiptVoucher')}</TabsTrigger>
            <TabsTrigger value="issue">{t('materialIssueVoucher')}</TabsTrigger>
            <TabsTrigger value="opening">{t('openingBalanceVoucher')}</TabsTrigger>
          </TabsList>
          <TabsContent value="receipt" forceMount={tab === 'receipt' ? true : undefined} hidden={tab !== 'receipt'}>
            {tab === 'receipt' && <VoucherForm kind="receipt" />}
          </TabsContent>
          <TabsContent value="issue" hidden={tab !== 'issue'}>
            {tab === 'issue' && <VoucherForm kind="issue" />}
          </TabsContent>
          <TabsContent value="opening" hidden={tab !== 'opening'}>
            {tab === 'opening' && <VoucherForm kind="opening" />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}