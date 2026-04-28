import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useItemsMaster } from '@/hooks/useItemsMaster';
import { parseDocxItems, type ParsedItem } from '@/utils/docxItemsParser';
import {
  Upload, FileText, ImageIcon, CheckCircle2, AlertCircle,
  Loader2, ArrowLeft, ArrowRight, Sparkles, RefreshCw,
} from 'lucide-react';

type Step = 'upload' | 'preview' | 'result';

interface PreviewRow extends ParsedItem {
  /** unique key */
  key: string;
  /** preview blob URLs */
  previewUrls: string[];
  /** existing item match by part_no */
  existingId: string | null;
  /** include in import */
  selected: boolean;
  /** which image (index) to attach as primary */
  primaryImageIdx: number;
  /** edited description (allow user override) */
  editedDescription: string;
  /** edited part number (Word may strip leading zeros) */
  editedPartNo: string;
}

interface ImportResult {
  inserted: number;
  skipped: number;
  failed: Array<{ part_no: string; reason: string }>;
  uploadedImages: number;
  failedImages: Array<{ part_no: string; reason: string }>;
}

const DEFAULT_SUPPLIER = 'عبد الغني موتورز';

export default function ItemsMasterImport() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: existingItems, refetch } = useItemsMaster();

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [imageMap, setImageMap] = useState<Map<string, Blob>>(new Map());
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [supplier, setSupplier] = useState(DEFAULT_SUPPLIER);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const existingMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of existingItems) {
      m.set(it.part_no.trim().toLowerCase(), it.id);
    }
    return m;
  }, [existingItems]);

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setParsing(true);
      try {
        const parsed = await parseDocxItems(f);
        setImageMap(parsed.images);
        const built: PreviewRow[] = parsed.items.map((it, idx) => {
          const previewUrls = it.imageNames
            .map((n) => parsed.images.get(n))
            .filter(Boolean)
            .map((b) => URL.createObjectURL(b as Blob));
          const existingId = existingMap.get(it.part_no.trim().toLowerCase()) ?? null;
          return {
            ...it,
            key: `${it.part_no}-${idx}`,
            previewUrls,
            existingId,
            selected: !existingId, // default: skip existing
            primaryImageIdx: 0,
            editedDescription: it.description,
            editedPartNo: it.part_no,
          };
        });
        setRows(built);
        setStep('preview');
      } catch (e) {
        toast({
          title: t('error'),
          description: (e as Error).message,
          variant: 'destructive',
        });
      } finally {
        setParsing(false);
      }
    },
    [existingMap, t, toast]
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith('.docx')) handleFile(f);
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const withImage = rows.filter((r) => r.imageNames.length > 0).length;
    const noDesc = rows.filter((r) => !r.editedDescription.trim()).length;
    const duplicates = rows.filter((r) => r.existingId).length;
    const dupInFile = rows.filter((r) => r.duplicateInFile).length;
    const selected = rows.filter((r) => r.selected).length;
    const newCount = rows.filter((r) => r.selected && !r.existingId).length;
    return { total, withImage, noDesc, duplicates, dupInFile, selected, newCount };
  }, [rows]);

  const toggleAll = (val: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: val && !r.existingId })));
  };

  const updateRow = (key: string, patch: Partial<PreviewRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const runImport = async () => {
    if (!user?.id) {
      toast({ title: t('error'), description: t('mustBeLoggedIn'), variant: 'destructive' });
      return;
    }
    const todo = rows.filter((r) => r.selected && !r.existingId);
    if (todo.length === 0) {
      toast({ title: t('error'), description: t('importNoItemsSelected'), variant: 'destructive' });
      return;
    }

    setImporting(true);
    setProgress({ done: 0, total: todo.length });
    const res: ImportResult = {
      inserted: 0,
      skipped: rows.filter((r) => r.existingId).length,
      failed: [],
      uploadedImages: 0,
      failedImages: [],
    };

    for (let i = 0; i < todo.length; i++) {
      const row = todo[i];
      const finalPartNo = (row.editedPartNo || row.part_no).trim();
      let imagePath: string | null = null;
      const primaryName = row.imageNames[row.primaryImageIdx];
      const primaryBlob = primaryName ? imageMap.get(primaryName) : null;
      if (primaryBlob) {
        const ext = (primaryName?.split('.').pop() || 'jpg').toLowerCase();
        const safe = finalPartNo.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `items/${safe}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('box-images')
          .upload(path, primaryBlob, { cacheControl: '3600', upsert: true });
        if (upErr) {
          res.failedImages.push({ part_no: finalPartNo, reason: upErr.message });
        } else {
          imagePath = path;
          res.uploadedImages += 1;
        }
      }

      const { error: insErr } = await supabase.from('items_master').insert([
        {
          part_no: finalPartNo,
          description: row.editedDescription.trim() || finalPartNo,
          default_supplier: supplier.trim() || null,
          default_unit: 'PCS',
          image_path: imagePath,
          notes: null,
          is_active: true,
          created_by: user.id,
        },
      ]);
      if (insErr) {
        res.failed.push({ part_no: finalPartNo, reason: insErr.message });
      } else {
        res.inserted += 1;
      }
      setProgress({ done: i + 1, total: todo.length });
    }

    setResult(res);
    setImporting(false);
    setStep('result');
    refetch();
    toast({
      title: t('success'),
      description: t('importDoneMsg')
        .replace('{inserted}', String(res.inserted))
        .replace('{failed}', String(res.failed.length)),
    });
  };

  const reset = () => {
    rows.forEach((r) => r.previewUrls.forEach((u) => URL.revokeObjectURL(u)));
    setRows([]);
    setImageMap(new Map());
    setFile(null);
    setResult(null);
    setStep('upload');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          icon={Sparkles}
          title={t('importItemsTitle')}
          subtitle={t('importItemsSubtitle')}
          actions={
            <Button variant="outline" onClick={() => navigate('/boxes/items')}>
              <ArrowLeft className="w-4 h-4 me-1.5 rtl:rotate-180" />
              {t('back')}
            </Button>
          }
        />

        <Tabs value={step} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" disabled={step !== 'upload'}>
              1. {t('importStepUpload')}
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={step === 'upload'}>
              2. {t('importStepPreview')}
            </TabsTrigger>
            <TabsTrigger value="result" disabled={step !== 'result'}>
              3. {t('importStepResult')}
            </TabsTrigger>
          </TabsList>

          {/* STEP 1 — UPLOAD */}
          <TabsContent value="upload" className="mt-6">
            <Card className="p-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              >
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">{t('importParsing')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{t('importDragDocx')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('importAcceptedFormat')}
                      </p>
                    </div>
                    <Button type="button" variant="default" className="mt-2">
                      <FileText className="w-4 h-4 me-1.5" />
                      {t('importChooseFile')}
                    </Button>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={onPick}
                />
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('importDefaultSupplier')}</Label>
                  <Input
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('importDefaultSupplierHint')}
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* STEP 2 — PREVIEW */}
          <TabsContent value="preview" className="mt-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label={t('importStatTotal')} value={stats.total} />
              <StatCard label={t('importStatWithImage')} value={stats.withImage} tone="success" />
              <StatCard label={t('importStatNoDesc')} value={stats.noDesc} tone="warn" />
              <StatCard label={t('importStatDuplicates')} value={stats.duplicates} tone="warn" />
              <StatCard label={t('importStatDuplicateInFile')} value={stats.dupInFile} tone="warn" />
              <StatCard label={t('importStatSelected')} value={stats.selected} tone="info" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
                {t('selectAll')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
                {t('deselectAll')}
              </Button>
              <span className="text-xs text-muted-foreground ms-auto">
                {t('importDuplicatesNote')}
              </span>
            </div>

            <Card className="overflow-hidden">
              <div className="max-h-[55vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10">{t('select')}</TableHead>
                      <TableHead>{t('image')}</TableHead>
                      <TableHead>{t('partNo')}</TableHead>
                      <TableHead>{t('description')}</TableHead>
                      <TableHead className="w-20 text-center">{t('quantity')}</TableHead>
                      <TableHead className="w-32">{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.key} className={r.existingId ? 'opacity-60' : ''}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={r.selected}
                            disabled={!!r.existingId}
                            onChange={(e) =>
                              updateRow(r.key, { selected: e.target.checked })
                            }
                            className="w-4 h-4"
                          />
                        </TableCell>
                        <TableCell>
                          {r.previewUrls.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <img
                                src={r.previewUrls[r.primaryImageIdx]}
                                alt={r.part_no}
                                className="w-14 h-14 object-cover rounded border border-border"
                              />
                              {r.previewUrls.length > 1 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {r.primaryImageIdx + 1}/{r.previewUrls.length}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded border border-dashed border-border flex items-center justify-center bg-muted/20">
                              <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[140px]">
                          <Input
                            value={r.editedPartNo}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\s+/g, '');
                              const existingId = existingMap.get(v.trim().toLowerCase()) ?? null;
                              updateRow(r.key, {
                                editedPartNo: v,
                                existingId,
                                selected: r.selected && !existingId,
                              });
                            }}
                            className="h-8 font-mono text-xs"
                            placeholder={t('partNo')}
                          />
                        </TableCell>
                        <TableCell className="min-w-[260px]">
                          <Input
                            value={r.editedDescription}
                            onChange={(e) =>
                              updateRow(r.key, { editedDescription: e.target.value })
                            }
                            className="h-8 text-xs"
                            placeholder={t('descriptionPlaceholder')}
                          />
                        </TableCell>
                        <TableCell className="text-center text-xs tabular-nums">
                          {r.qty ?? '—'}
                        </TableCell>
                        <TableCell>
                          {r.existingId ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              {t('importStatusExists')}
                            </Badge>
                          ) : r.duplicateInFile ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              {t('importStatusDuplicateInFile')}
                            </Badge>
                          ) : !r.editedDescription.trim() ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              {t('importStatusNoDesc')}
                            </Badge>
                          ) : r.imageNames.length === 0 ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              {t('importStatusNoImage')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                              {t('importStatusReady')}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {importing && (
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    {t('importingProgress')
                      .replace('{done}', String(progress.done))
                      .replace('{total}', String(progress.total))}
                  </span>
                </div>
                <Progress
                  value={progress.total ? (progress.done / progress.total) * 100 : 0}
                />
              </Card>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={reset} disabled={importing}>
                <ArrowLeft className="w-4 h-4 me-1.5 rtl:rotate-180" />
                {t('back')}
              </Button>
              <Button onClick={runImport} disabled={importing || stats.newCount === 0}>
                {importing ? (
                  <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 me-1.5 rtl:rotate-180" />
                )}
                {t('importConfirmButton').replace('{n}', String(stats.newCount))}
              </Button>
            </div>
          </TabsContent>

          {/* STEP 3 — RESULT */}
          <TabsContent value="result" className="mt-6 space-y-4">
            {result && (
              <>
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                    <h3 className="text-lg font-bold">{t('importDoneTitle')}</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label={t('importResInserted')} value={result.inserted} tone="success" />
                    <StatCard label={t('importResImages')} value={result.uploadedImages} tone="info" />
                    <StatCard label={t('importResSkipped')} value={result.skipped} tone="warn" />
                    <StatCard label={t('importResFailed')} value={result.failed.length} tone={result.failed.length > 0 ? 'error' : 'success'} />
                  </div>
                </Card>

                {result.failed.length > 0 && (
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <h4 className="font-semibold text-sm">{t('importFailedItems')}</h4>
                    </div>
                    <div className="max-h-40 overflow-auto text-xs space-y-1">
                      {result.failed.map((f, i) => (
                        <div key={i} className="flex justify-between gap-3 border-b border-border pb-1">
                          <span className="font-mono">{f.part_no}</span>
                          <span className="text-destructive">{f.reason}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {result.failedImages.length > 0 && (
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <h4 className="font-semibold text-sm">{t('importFailedImages')}</h4>
                    </div>
                    <div className="max-h-40 overflow-auto text-xs space-y-1">
                      {result.failedImages.map((f, i) => (
                        <div key={i} className="flex justify-between gap-3 border-b border-border pb-1">
                          <span className="font-mono">{f.part_no}</span>
                          <span className="text-amber-700">{f.reason}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={reset}>
                    <RefreshCw className="w-4 h-4 me-1.5" />
                    {t('importAnotherFile')}
                  </Button>
                  <Button onClick={() => navigate('/boxes/items')}>
                    {t('goToItems')}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {file && step !== 'upload' && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            {t('importSourceFile')}: {file.name}
          </p>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'success' | 'warn' | 'error' | 'info';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600'
      : tone === 'warn'
      ? 'text-amber-600'
      : tone === 'error'
      ? 'text-destructive'
      : tone === 'info'
      ? 'text-primary'
      : 'text-foreground';
  return (
    <Card className="p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${toneClass}`}>{value.toLocaleString('en-US')}</p>
    </Card>
  );
}