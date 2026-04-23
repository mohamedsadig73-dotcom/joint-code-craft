import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Download, Search, FileText, Settings2 } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  useItemImageHistory,
  type ItemImageHistoryEntry,
} from '@/hooks/useItemImageHistory';
import { ItemImageHistoryList } from './ItemImageHistoryList';
import { supabase } from '@/integrations/supabase/client';
import { exportImageHistoryPdf } from '@/utils/imageHistoryPdf';
import { useImageDownloadLog } from '@/hooks/useImageDownloadLog';

const ALL = '__all__';
type ActionFilter = 'upload' | 'replace' | 'remove' | typeof ALL;

/** Available CSV columns (key + i18n label-key). */
const CSV_COLUMNS = [
  { key: 'user', labelKey: 'csvUser' },
  { key: 'date', labelKey: 'csvDate' },
  { key: 'action', labelKey: 'csvAction' },
  { key: 'partNo', labelKey: 'csvPartNo' },
  { key: 'fileName', labelKey: 'csvFileName' },
  { key: 'currentPath', labelKey: 'csvCurrentPath' },
  { key: 'previousPath', labelKey: 'csvPreviousPath' },
  { key: 'outcome', labelKey: 'csvOutcome' },
  { key: 'reason', labelKey: 'csvReason' },
] as const;
type CsvColKey = typeof CSV_COLUMNS[number]['key'];
const DEFAULT_COLS: CsvColKey[] = CSV_COLUMNS.map((c) => c.key);

interface PersistedFilters {
  userId: string;
  actionFilter: ActionFilter;
  fromDate: string;
  toDate: string;
  search: string;
  csvCols: CsvColKey[];
}

const FILTER_STORAGE_PREFIX = 'image_history_viewer_filters_v1:';

function readFilters(scope: string): Partial<PersistedFilters> | null {
  try {
    const raw = localStorage.getItem(`${FILTER_STORAGE_PREFIX}${scope}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeFilters(scope: string, value: PersistedFilters) {
  try {
    localStorage.setItem(`${FILTER_STORAGE_PREFIX}${scope}`, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

interface Props {
  /** When provided, restricts history to a single item. */
  itemId?: string;
  /** Show the part-no column on each row (used in global page). */
  showItem?: boolean;
  /** Current image of the item (for restore preview). */
  currentImagePath?: string | null;
  /** Callback when restoring an entry. */
  onRestore?: (entry: ItemImageHistoryEntry, path: string) => void | Promise<void>;
  /** Optional max number of entries to fetch. */
  limit?: number;
  /** Compact mode: filters collapse to a denser layout. */
  compact?: boolean;
}

/**
 * Wraps the image history list with search, filters (user/action/date)
 * and CSV export. Used both inside the standalone Image Log page and
 * inside the "View All" dialog of an item detail page.
 */
export function ItemImageHistoryViewer({
  itemId,
  showItem,
  currentImagePath,
  onRestore,
  limit = 500,
  compact,
}: Props) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { log: logDownload } = useImageDownloadLog();
  const scope = itemId ?? 'all';
  const persisted = useMemo(() => readFilters(scope), [scope]);

  const [userId, setUserId] = useState<string>(persisted?.userId ?? ALL);
  const [actionFilter, setActionFilter] = useState<ActionFilter>(
    (persisted?.actionFilter as ActionFilter) ?? ALL,
  );
  const [fromDate, setFromDate] = useState<string>(persisted?.fromDate ?? '');
  const [toDate, setToDate] = useState<string>(persisted?.toDate ?? '');
  const [search, setSearch] = useState<string>(persisted?.search ?? '');
  const [csvCols, setCsvCols] = useState<CsvColKey[]>(
    persisted?.csvCols && persisted.csvCols.length > 0 ? persisted.csvCols : DEFAULT_COLS,
  );
  const [pdfBusy, setPdfBusy] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; username: string }>>([]);

  // Persist filters whenever any control changes (per scope).
  useEffect(() => {
    writeFilters(scope, { userId, actionFilter, fromDate, toDate, search, csvCols });
  }, [scope, userId, actionFilter, fromDate, toDate, search, csvCols]);

  const { entries, loading } = useItemImageHistory({
    itemId,
    limit,
    userId: userId === ALL ? undefined : userId,
    action: actionFilter === ALL ? undefined : actionFilter,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username', { ascending: true })
        .limit(200);
      if (!cancelled && data) setUsers(data);
    })();
    return () => { cancelled = true; };
  }, []);

  // Client-side search by filename (old or new path) or notes/part_no
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const oldName = (e.old_path ?? '').toLowerCase();
      const newName = (e.new_path ?? '').toLowerCase();
      const notes = (e.notes ?? '').toLowerCase();
      const part = (e.item_part_no ?? '').toLowerCase();
      const user = (e.changed_by_username ?? '').toLowerCase();
      return (
        oldName.includes(q) ||
        newName.includes(q) ||
        notes.includes(q) ||
        part.includes(q) ||
        user.includes(q)
      );
    });
  }, [entries, search]);

  const hasFilters = useMemo(
    () => userId !== ALL || actionFilter !== ALL || !!fromDate || !!toDate || !!search,
    [userId, actionFilter, fromDate, toDate, search]
  );

  const clear = () => {
    setUserId(ALL);
    setActionFilter(ALL);
    setFromDate('');
    setToDate('');
    setSearch('');
  };

  const toggleCol = (key: CsvColKey) => {
    setCsvCols((curr) =>
      curr.includes(key) ? curr.filter((k) => k !== key) : [...curr, key],
    );
  };

  const exportCsv = () => {
    // Maintain canonical column order regardless of toggle order.
    const activeCols = CSV_COLUMNS.filter((c) => csvCols.includes(c.key));
    if (activeCols.length === 0) {
      toast({
        title: t('exportCsv'),
        description: t('csvSelectAtLeastOne'),
        variant: 'destructive',
      });
      return;
    }
    const headers = activeCols.map((c) => t(c.labelKey));
    const rows = filteredEntries.map((e) => {
      // Derive outcome / reason from notes (set by logImageRestoreOutcome)
      let outcome = '';
      let reason = '';
      if (e.notes) {
        if (e.notes.startsWith('[restore-failed]')) {
          outcome = 'failed';
          reason = e.notes.replace('[restore-failed]', '').trim();
        } else if (e.notes.startsWith('[restore]')) {
          outcome = 'success';
          reason = e.notes.replace('[restore]', '').trim();
        } else {
          reason = e.notes;
        }
      }
      const fileName = (e.new_path ?? e.old_path ?? '').split('/').pop() ?? '';
      const map: Record<CsvColKey, string> = {
        user: e.changed_by_username ?? '',
        date: format(new Date(e.changed_at), 'dd/MM/yyyy HH:mm:ss'),
        action: e.action,
        partNo: e.item_part_no ?? '',
        fileName,
        currentPath: e.new_path ?? '',
        previousPath: e.old_path ?? '',
        outcome,
        reason,
      };
      return activeCols.map((c) => map[c.key]);
    });
    const escape = (val: string) => {
      const v = String(val ?? '');
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };
    // BOM for Excel UTF-8 compatibility
    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = format(new Date(), 'yyyyMMdd_HHmmss');
    a.href = blobUrl;
    a.download = `image_history_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const exportPdf = async () => {
    if (filteredEntries.length === 0) return;
    setPdfBusy(true);
    try {
      await exportImageHistoryPdf(filteredEntries, {
        title: t('itemImageHistory'),
        subtitle: format(new Date(), 'dd/MM/yyyy HH:mm'),
      });
      toast({ title: t('pdfExportReady') });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown';
      toast({
        title: t('pdfExportFailed'),
        description: reason,
        variant: 'destructive',
      });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleDownloaded = async (info: {
    kind: 'current' | 'previous';
    fileName: string;
    path: string;
    entry: ItemImageHistoryEntry;
  }) => {
    const logged = await logDownload({
      kind: info.kind,
      fileName: info.fileName,
      path: info.path,
      itemId: info.entry.item_id,
      partNo: info.entry.item_part_no ?? null,
    });
    toast({
      title:
        info.kind === 'current'
          ? t('downloadedCurrentToast')
          : t('downloadedPreviousToast'),
      description: `${info.fileName} · ${logged.username ?? '—'} · ${format(
        new Date(logged.at),
        'dd/MM/yyyy HH:mm',
      )}`,
    });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className={compact ? 'p-3' : 'p-4'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs">{t('searchHistory')}</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 start-2.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('searchHistoryPlaceholder')}
                  className="h-9 ps-8"
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('filterByUser')}</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('allUsers')}</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('filterByAction')}</Label>
              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as ActionFilter)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('allActions')}</SelectItem>
                  <SelectItem value="upload">{t('imageAction_upload')}</SelectItem>
                  <SelectItem value="replace">{t('imageAction_replace')}</SelectItem>
                  <SelectItem value="remove">{t('imageAction_remove')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('filterFrom')}</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('filterTo')}</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              {t('resultsCount').replace('{count}', String(filteredEntries.length))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clear}
                disabled={!hasFilters}
                className="gap-1.5"
              >
                <X className="w-4 h-4" />
                {t('clearFilters')}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    title={t('csvColumns')}
                  >
                    <Settings2 className="w-4 h-4" />
                    {t('csvColumns')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-60 p-3">
                  <div className="space-y-2">
                    <div className="text-xs font-medium">{t('csvColumns')}</div>
                    <p className="text-[11px] text-muted-foreground">{t('csvColumnsHint')}</p>
                    <div className="space-y-1.5 pt-1">
                      {CSV_COLUMNS.map((c) => {
                        const checked = csvCols.includes(c.key);
                        return (
                          <label
                            key={c.key}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleCol(c.key)}
                            />
                            <span>{t(c.labelKey)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                size="sm"
                onClick={exportCsv}
                disabled={filteredEntries.length === 0}
                className="gap-1.5"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                {t('exportCsv')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={exportPdf}
                disabled={filteredEntries.length === 0 || pdfBusy}
                className="gap-1.5"
              >
                <FileText className="w-4 h-4" />
                {pdfBusy ? `${t('loading')}…` : t('exportPdfSummary')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ItemImageHistoryList
            entries={filteredEntries}
            loading={loading}
            showItem={showItem}
            onRestore={onRestore}
            currentImagePath={currentImagePath}
            onDownloaded={handleDownloaded}
          />
        </CardContent>
      </Card>
    </div>
  );
}
