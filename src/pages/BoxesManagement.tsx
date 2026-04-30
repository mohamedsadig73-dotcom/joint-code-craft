import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { ReceiptsTab } from '@/components/boxes/ReceiptsTab';
import { BoxesSummaryTab } from '@/components/boxes/BoxesSummaryTab';
import { BoxesDashboardTab } from '@/components/boxes/BoxesDashboardTab';
import { ContainersTab } from '@/components/boxes/containers/ContainersTab';
import { PackingTab } from '@/components/boxes/PackingTab';
import { DispatchTab } from '@/components/boxes/dispatches/DispatchTab';
import { Package, ClipboardList, BarChart3, Ship, FileDown, Loader2, Library, Boxes, Send } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { DuplicateCheckBanner } from '@/components/boxes/DuplicateCheckBanner';
import { Button } from '@/components/ui/button';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { downloadBoxesTotalsPdf } from '@/utils/boxesTotalsPdf';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function BoxesManagement() {
  const { t, language } = useLanguage();
  const { receipts } = useBoxReceipts();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'receipts' | 'packing' | 'boxes' | 'dispatch' | 'containers' | 'dashboard'>('receipts');
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadBoxesTotalsPdf(receipts, language as 'ar' | 'en');
      toast({ title: t('success'), description: t('downloadPdfReport') });
    } catch (e) {
      toast({ title: t('error'), description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('boxesManagement')}
          subtitle={t('boxesManagementDesc')}
          icon={Package}
        />

        <div className="mt-4 space-y-3">
          <DuplicateCheckBanner />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/boxes/items')}
              className="gap-1.5"
            >
              <Library className="w-4 h-4" />
              {t('itemsMaster')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloading || receipts.length === 0}
              className="gap-1.5"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {t('downloadPdfReport')}
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 max-w-4xl">
            <TabsTrigger value="receipts" className="gap-1.5">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">{t('receiptsLog')}</span>
              <span className="sm:hidden">{t('receiptsLogShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="packing" className="gap-1.5">
              <Boxes className="w-4 h-4" />
              <span className="hidden sm:inline">{t('packing')}</span>
              <span className="sm:hidden">{t('packing')}</span>
            </TabsTrigger>
            <TabsTrigger value="boxes" className="gap-1.5">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">{t('boxesSummary')}</span>
              <span className="sm:hidden">{t('boxesShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="gap-1.5">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dispatch')}</span>
              <span className="sm:hidden">{t('dispatch')}</span>
            </TabsTrigger>
            <TabsTrigger value="containers" className="gap-1.5">
              <Ship className="w-4 h-4" />
              <span className="hidden sm:inline">{t('containers')}</span>
              <span className="sm:hidden">{t('containers')}</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('statistics')}</span>
              <span className="sm:hidden">{t('stats')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receipts" className="mt-4">
            <ReceiptsTab />
          </TabsContent>
          <TabsContent value="packing" className="mt-4">
            <PackingTab />
          </TabsContent>
          <TabsContent value="boxes" className="mt-4">
            <BoxesSummaryTab />
          </TabsContent>
          <TabsContent value="dispatch" className="mt-4">
            <DispatchTab />
          </TabsContent>
          <TabsContent value="containers" className="mt-4">
            <ContainersTab />
          </TabsContent>
          <TabsContent value="dashboard" className="mt-4">
            <BoxesDashboardTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}