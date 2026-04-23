import { format } from 'date-fns';
import { Upload, Replace, Trash2, ImageIcon, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import type { ItemImageHistoryEntry } from '@/hooks/useItemImageHistory';

interface Props {
  entries: ItemImageHistoryEntry[];
  loading: boolean;
  showItem?: boolean;
}

const ICON: Record<ItemImageHistoryEntry['action'], typeof Upload> = {
  upload: Upload,
  replace: Replace,
  remove: Trash2,
};

const COLOR: Record<ItemImageHistoryEntry['action'], string> = {
  upload: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900',
  replace: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900',
  remove: 'text-destructive bg-destructive/10 border-destructive/30',
};

function pathToUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from('box-images').getPublicUrl(path).data.publicUrl;
}

export function ItemImageHistoryList({ entries, loading, showItem }: Props) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t('loading')}…
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
        <Clock className="w-8 h-8 opacity-40" />
        {t('noImageHistory')}
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((e) => {
        const Icon = ICON[e.action];
        const newUrl = pathToUrl(e.new_path);
        const oldUrl = pathToUrl(e.old_path);
        return (
          <li key={e.id} className="px-4 py-3 flex items-start gap-3">
            <div className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center ${COLOR[e.action]}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {t(`imageAction_${e.action}`)}
                </Badge>
                {showItem && e.item_part_no && (
                  <span className="font-mono text-xs text-muted-foreground">{e.item_part_no}</span>
                )}
                <span className="text-muted-foreground text-xs">
                  {t('by')} <span className="font-medium text-foreground">{e.changed_by_username || '—'}</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {format(new Date(e.changed_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {e.action === 'replace' && oldUrl && (
                  <>
                    <Thumb url={oldUrl} label={t('previous')} muted />
                    <span className="text-muted-foreground text-xs">→</span>
                  </>
                )}
                {newUrl ? (
                  <Thumb url={newUrl} label={e.action === 'remove' ? t('removed') : t('current')} />
                ) : e.action === 'remove' && oldUrl ? (
                  <Thumb url={oldUrl} label={t('removed')} muted />
                ) : (
                  <div className="w-12 h-12 rounded border border-dashed flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-4 h-4 opacity-50" />
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Thumb({ url, label, muted }: { url: string; label: string; muted?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-12 h-12 rounded border overflow-hidden bg-muted/30 ${muted ? 'opacity-60' : ''}`}>
        <img src={url} alt={label} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
