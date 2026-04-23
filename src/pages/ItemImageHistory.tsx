import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { useItemImageHistory } from '@/hooks/useItemImageHistory';
import { ItemImageHistoryList } from '@/components/boxes/items/ItemImageHistoryList';

export default function ItemImageHistory() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { entries, loading } = useItemImageHistory({ limit: 200 });

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
        <Card>
          <CardContent className="p-0">
            <ItemImageHistoryList entries={entries} loading={loading} showItem />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
