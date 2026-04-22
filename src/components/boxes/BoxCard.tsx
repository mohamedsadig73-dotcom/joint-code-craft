import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Printer, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import type { BoxSummaryRow } from '@/hooks/useBoxSummary';
import { destinationBadgeClass } from './destinationStyles';

function formatDate(d: string) {
  if (!d) return '';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function BoxCard({ box }: { box: BoxSummaryRow }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-lg font-bold text-primary">{box.box_no}</div>
            <Badge className={destinationBadgeClass(box.destination)}>
              {t(`dest_${box.destination}`)}
            </Badge>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => navigate(`/boxes/card/${encodeURIComponent(box.box_no)}`)}>
          <Printer className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
        <span className="font-medium text-foreground">{t('suppliers')}: </span>
        {box.suppliers}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-accent/40 rounded-md p-2 text-center">
          <div className="text-xs text-muted-foreground">{t('items')}</div>
          <div className="text-base font-bold text-foreground">
            {box.items_count.toLocaleString('en-US')}
          </div>
        </div>
        <div className="bg-primary/10 rounded-md p-2 text-center">
          <div className="text-xs text-muted-foreground">{t('totalQty')}</div>
          <div className="text-base font-bold text-primary">
            {box.total_qty.toLocaleString('en-US')}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3" />
        <span className="tabular-nums">{formatDate(box.first_date)}</span>
      </div>
    </Card>
  );
}