import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { ItemImageHistoryViewer } from '@/components/boxes/items/ItemImageHistoryViewer';

export default function ItemImageHistory({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (embedded) {
    return <ItemImageHistoryViewer showItem limit={500} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/boxes/items')} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </Button>
        <PageHeader
          title={t('itemImageHistory')}
          subtitle={t('itemImageHistoryDesc')}
          icon={History}
        />

        <ItemImageHistoryViewer showItem limit={500} />
      </main>
    </div>
  );
}
