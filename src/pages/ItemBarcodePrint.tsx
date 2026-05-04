import { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useItemsMaster, type ItemMaster } from '@/hooks/useItemsMaster';
import { Barcode as BarcodeIcon, Eye, Printer, Search } from 'lucide-react';

type Format = 'small' | 'medium' | 'large';

// Physical dimensions in millimeters for accurate printing
const FORMAT_MM: Record<Format, { w: number; h: number; cols: number; barH: number }> = {
  small:  { w: 40, h: 25, cols: 4, barH: 10 },
  medium: { w: 60, h: 35, cols: 3, barH: 14 },
  large:  { w: 80, h: 50, cols: 2, barH: 20 },
};

function BarcodeImg({ value, height }: { value: string; height: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, { format: 'CODE128', height, width: 1.6, fontSize: 12, margin: 4, displayValue: true });
    } catch { /* noop */ }
  }, [value, height]);
  return <svg ref={ref} />;
}

function buildPrintHtml(opts: {
  labels: ItemMaster[];
  cols: number;
  wMm: number;
  hMm: number;
  barHmm: number;
  title: string;
  autoPrint: boolean;
}) {
  const { labels, cols, wMm, hMm, barHmm, title, autoPrint } = opts;
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"></script>
    <style>
      @page { size: A4; margin: 8mm; }
      body { font-family: 'Segoe UI Arabic', sans-serif; margin: 0; padding: 4mm; }
      .grid { display: grid; grid-template-columns: repeat(${cols}, ${wMm}mm); gap: 2mm; }
      .label { width: ${wMm}mm; height: ${hMm}mm; border: 1px dashed #ccc; padding: 1mm; text-align: center; box-sizing: border-box; page-break-inside: avoid; overflow: hidden; }
      .label .name { font-size: 9pt; font-weight: 600; margin-bottom: 0.5mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .label svg { width: 100%; height: ${barHmm}mm; }
      .label .pn { font-size: 7pt; color: #666; }
      @media print { .label { border: none; } }
    </style></head><body>
    <div class="grid">
      ${labels.map((it, idx) => `
        <div class="label">
          <div class="name">${(it.name_ar || it.description || it.part_no).replace(/</g,'&lt;')}</div>
          <svg id="b${idx}"></svg>
          <div class="pn">${it.part_no}</div>
        </div>`).join('')}
    </div>
    <script>
      window.addEventListener('load', () => {
        ${labels.map((it, idx) => {
          const v = (it.barcode || it.part_no).replace(/[^A-Za-z0-9._-]/g, '');
          return `try { JsBarcode('#b${idx}','${v}',{format:'CODE128',height:${Math.round(barHmm * 3.78)},width:1.4,fontSize:9,margin:1,displayValue:true}); } catch(e){}`;
        }).join('\n')}
        ${autoPrint ? `setTimeout(() => { window.print(); }, 300);` : ''}
      });
    </script>
    </body></html>`;
}

export default function ItemBarcodePrint() {
  const { t } = useLanguage();
  const { items, loading } = useItemsMaster();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<Format>('medium');
  const [copies, setCopies] = useState(1);
  const [useCustom, setUseCustom] = useState(false);
  const [customW, setCustomW] = useState(60);
  const [customH, setCustomH] = useState(35);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const dims = useMemo(() => {
    const f = FORMAT_MM[format];
    if (!useCustom) return f;
    return { w: customW, h: customH, cols: f.cols, barH: Math.max(6, Math.min(customH * 0.55, customH - 8)) };
  }, [format, useCustom, customW, customH]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = items.filter((i) => i.is_active);
    if (!q) return base;
    return base.filter((i) =>
      i.part_no.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      (i.barcode ?? '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => setSelected((s) => s.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.id)));

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected]
  );

  const buildHtml = (autoPrint: boolean) => {
    const labels: ItemMaster[] = [];
    selectedItems.forEach((it) => { for (let i = 0; i < copies; i++) labels.push(it); });
    return buildPrintHtml({
      labels,
      cols: dims.cols,
      wMm: dims.w,
      hMm: dims.h,
      barHmm: dims.barH,
      title: t('barcodePrint'),
      autoPrint,
    });
  };

  const handlePreview = () => {
    const html = buildHtml(false);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    const html = buildHtml(true);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0'; iframe.style.bottom = '0';
    iframe.style.width = '0'; iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(iframe); }, 60000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader title={t('barcodePrint')} subtitle={t('barcodePrintDesc')} icon={BarcodeIcon} />

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 rounded-lg border bg-card p-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label>{t('search')}</Label>
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" placeholder={t('searchPartNoOrDesc')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('barcodeFormat')}</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as Format)} disabled={useCustom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t('formatSmall')}</SelectItem>
                <SelectItem value="medium">{t('formatMedium')}</SelectItem>
                <SelectItem value="large">{t('formatLarge')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('copiesPerItem')}</Label>
            <Input type="number" min={1} max={100} value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} />
          </div>

          <div className="md:col-span-4 flex flex-wrap items-end gap-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Switch id="custom-size" checked={useCustom} onCheckedChange={setUseCustom} />
              <Label htmlFor="custom-size">{t('customSize')}</Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('widthMm')}</Label>
              <Input type="number" min={10} max={200} value={customW} onChange={(e) => setCustomW(Math.max(10, Number(e.target.value)))} disabled={!useCustom} className="w-28" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('heightMm')}</Label>
              <Input type="number" min={10} max={200} value={customH} onChange={(e) => setCustomH(Math.max(10, Number(e.target.value)))} disabled={!useCustom} className="w-28" />
            </div>
            <div className="text-xs text-muted-foreground">
              {dims.w}mm × {dims.h}mm · {dims.cols} cols
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={selected.size > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} />
            <span className="text-sm text-muted-foreground">
              {t('selected')}: {selected.size} / {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={selected.size === 0} className="gap-1.5">
              <Eye className="w-4 h-4" />{t('barcodePreview')}
            </Button>
            <Button onClick={handlePrint} disabled={selected.size === 0} className="gap-1.5">
              <Printer className="w-4 h-4" />{t('print')}
            </Button>
          </div>
        </div>

        <div className="mt-3 rounded-lg border bg-card max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t('loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t('noItemsFound')}</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                  <Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{it.part_no} — {it.name_ar || it.description}</p>
                    <p className="text-xs text-muted-foreground truncate">{it.brand ?? ''} {it.model_no ? `· ${it.model_no}` : ''}</p>
                  </div>
                  <div className="hidden sm:block">
                    <BarcodeImg value={(it.barcode || it.part_no).replace(/[^A-Za-z0-9._-]/g, '')} height={32} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Dialog open={previewOpen} onOpenChange={(o) => { setPreviewOpen(o); if (!o && previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); } }}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('barcodePreview')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted/20">
            {previewUrl && <iframe src={previewUrl} className="w-full h-full" title="preview" />}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>{t('closePreview')}</Button>
            <Button onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" />{t('printNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
