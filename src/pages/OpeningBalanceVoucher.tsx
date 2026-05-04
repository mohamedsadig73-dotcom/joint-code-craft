import { PageHeader } from '@/components/ui/PageHeader';
import { Navigation } from '@/components/Navigation';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { VoucherForm } from '@/components/inventory/VoucherForm';

export default function OpeningBalanceVoucher() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader title={t('openingBalanceVoucher')} subtitle={t('openingBalanceVoucherDesc')} icon={ClipboardList} />
        <VoucherForm kind="opening" />
      </main>
    </div>
  );
}