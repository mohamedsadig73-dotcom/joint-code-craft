import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';
import { destinationBadgeClass, destinationRowTint, statusBadgeClass } from './destinationStyles';
import { cn } from '@/lib/utils';

interface Props {
  receipt: BoxReceipt;
  onEdit: (r: BoxReceipt) => void;
  onDelete: (r: BoxReceipt) => void;
  canModify: boolean;
}

export function ReceiptMobileCard({ receipt, onEdit, onDelete, canModify }: Props) {
  const { t } = useLanguage();
  const imgUrl = receipt.image_path
    ? supabase.storage.from('box-images').getPublicUrl(receipt.image_path).data.publicUrl
    : null;

  return (
    <Card className={cn('p-3 space-y-2', destinationRowTint(receipt.destination))}>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-md bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
          {imgUrl ? (
            <img src={imgUrl} alt={receipt.part_no} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground/60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{receipt.part_no}</span>
            <Badge className={destinationBadgeClass(receipt.destination)}>
              {t(`dest_${receipt.destination}`)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{receipt.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><span className="text-muted-foreground">{t('supplier')}: </span><span className="font-medium">{receipt.supplier}</span></div>
        <div><span className="text-muted-foreground">{t('boxNo')}: </span><span className="font-bold">{receipt.box_no}</span></div>
        <div><span className="text-muted-foreground">{t('qty')}: </span><span className="font-bold">{receipt.qty} {receipt.unit}</span></div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Badge variant="outline" className={statusBadgeClass(receipt.status)}>
          {t(`boxStatus_${receipt.status}`)}
        </Badge>
        {canModify && (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(receipt)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(receipt)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}