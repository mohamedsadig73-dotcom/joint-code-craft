import { useMemo, useRef, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Printer,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Search,
  Link as LinkIcon,
} from 'lucide-react';
import { WMS_REVIEW_REPORT, type ReportBlock } from '@/data/wmsReviewReport';
import { downloadDocx, printPdf } from '@/utils/wmsReportRenderer';
import { toast } from 'sonner';

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim();
  // Case-insensitive incl. Arabic — simple split
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let idx = lower.indexOf(ql);
  let key = 0;
  while (idx !== -1) {
    if (idx > lastIdx) parts.push(<span key={key++}>{text.slice(lastIdx, idx)}</span>);
    parts.push(
      <mark key={key++} className="bg-yellow-300 text-foreground px-0.5 rounded">
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    lastIdx = idx + q.length;
    idx = lower.indexOf(ql, lastIdx);
  }
  if (lastIdx < text.length) parts.push(<span key={key++}>{text.slice(lastIdx)}</span>);
  return <>{parts}</>;
}

function blockMatches(block: ReportBlock, q: string): boolean {
  if (!q.trim()) return false;
  const ql = q.toLowerCase();
  if (block.type === 'p') return block.text.toLowerCase().includes(ql);
  if (block.type === 'list') return block.items.some((i) => i.toLowerCase().includes(ql));
  if (block.type === 'callout')
    return block.text.toLowerCase().includes(ql) || (block.title ?? '').toLowerCase().includes(ql);
  if (block.type === 'table')
    return (
      block.headers.some((h) => h.toLowerCase().includes(ql)) ||
      block.rows.some((r) => r.some((c) => c.toLowerCase().includes(ql)))
    );
  return false;
}

function RenderBlock({ block, query }: { block: ReportBlock; query: string }) {
  if (block.type === 'p')
    return (
      <p className="leading-loose text-base text-justify mb-3 text-foreground">
        {highlight(block.text, query)}
      </p>
    );
  if (block.type === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul';
    return (
      <Tag className={`${block.ordered ? 'list-decimal' : 'list-disc'} ps-6 mb-4 space-y-1.5 text-base`}>
        {block.items.map((it, i) => (
          <li key={i} className="leading-relaxed">
            {highlight(it, query)}
          </li>
        ))}
      </Tag>
    );
  }
  if (block.type === 'callout') {
    const variantClasses: Record<string, string> = {
      info: 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
      warning: 'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
      success: 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
      danger: 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
    };
    return (
      <div className={`border-s-4 rounded-md p-4 mb-4 ${variantClasses[block.variant]}`}>
        {block.title && <div className="font-bold mb-1">{highlight(block.title, query)}</div>}
        <div className="text-sm leading-relaxed">{highlight(block.text, query)}</div>
      </div>
    );
  }
  // table
  return (
    <div className="overflow-x-auto mb-5 rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            {block.headers.map((h, i) => (
              <th key={i} className="border border-border px-3 py-2 text-start font-semibold">
                {highlight(h, query)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i} className={i % 2 ? 'bg-muted/40' : ''}>
              {row.map((c, j) => (
                <td key={j} className="border border-border px-3 py-2 align-top">
                  {highlight(c, query)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TechnicalReview() {
  const { t } = useLanguage();
  const report = WMS_REVIEW_REPORT;

  const [zoom, setZoom] = useState(100);
  const [query, setQuery] = useState('');
  const [pageIdx, setPageIdx] = useState(0); // 0 = cover, 1..N = sections
  const pageRef = useRef<HTMLDivElement>(null);

  // Page 0 is the cover; sections are pages 1..N
  const totalPages = report.sections.length + 1;

  // total matches across all blocks (for search counter)
  const matchCount = useMemo(() => {
    if (!query.trim()) return 0;
    let count = 0;
    const ql = query.toLowerCase();
    const countInString = (s: string) => {
      let n = 0;
      let i = s.toLowerCase().indexOf(ql);
      while (i !== -1) {
        n++;
        i = s.toLowerCase().indexOf(ql, i + ql.length);
      }
      return n;
    };
    for (const sec of report.sections) {
      count += countInString(sec.title);
      for (const b of sec.blocks) {
        if (b.type === 'p') count += countInString(b.text);
        else if (b.type === 'list') count += b.items.reduce((a, i) => a + countInString(i), 0);
        else if (b.type === 'callout') count += countInString(b.text) + countInString(b.title ?? '');
        else if (b.type === 'table') {
          count += b.headers.reduce((a, h) => a + countInString(h), 0);
          count += b.rows.reduce((a, r) => a + r.reduce((aa, c) => aa + countInString(c), 0), 0);
        }
      }
    }
    return count;
  }, [query, report.sections]);

  // Auto-jump to first matching section when search changes
  useEffect(() => {
    if (!query.trim()) return;
    for (let i = 0; i < report.sections.length; i++) {
      const sec = report.sections[i];
      if (sec.title.toLowerCase().includes(query.toLowerCase()) || sec.blocks.some((b) => blockMatches(b, query))) {
        setPageIdx(i + 1);
        return;
      }
    }
  }, [query, report.sections]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: report.title, url });
        return;
      } catch {
        /* user cancelled — fall back to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success(t('linkCopied'));
  };

  const currentSection = pageIdx > 0 ? report.sections[pageIdx - 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('technicalReview')}
          subtitle={t('technicalReviewDesc')}
          icon={FileText}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadDocx(report)}>
                <Download className="w-4 h-4 me-1.5" />
                {t('downloadDocx')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => printPdf(report)}>
                <Printer className="w-4 h-4 me-1.5" />
                {t('downloadPdf')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 me-1.5" />
                {t('shareReport')}
              </Button>
            </div>
          }
        />

        {/* Toolbar */}
        <Card className="p-3 mb-4 flex flex-wrap items-center gap-3 sticky top-2 z-10 bg-background/95 backdrop-blur">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchInReport')}
              className="ps-10"
              dir="rtl"
            />
          </div>
          {query.trim() && (
            <Badge variant={matchCount > 0 ? 'default' : 'destructive'}>
              {matchCount > 0 ? `${matchCount} ${t('matchesFound')}` : t('noMatches')}
            </Badge>
          )}

          {/* Zoom */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(70, z - 10))}
              aria-label={t('zoomOut')}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-10 text-center font-mono">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(180, z + 10))}
              aria-label={t('zoomIn')}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(100)}
              aria-label={t('resetZoom')}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Pager */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pageIdx === 0}
              onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm font-mono px-2">
              {pageIdx + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pageIdx >= totalPages - 1}
              onClick={() => setPageIdx((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Side TOC + Page */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-4">
          {/* TOC */}
          <Card className="p-3 h-fit lg:sticky lg:top-24">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              {t('technicalReview')}
            </div>
            <button
              onClick={() => setPageIdx(0)}
              className={`w-full text-start text-sm px-2 py-1.5 rounded hover:bg-muted ${pageIdx === 0 ? 'bg-muted font-semibold' : ''}`}
            >
              {t('coverPage' as never) || 'الغلاف'}
            </button>
            <div className="mt-1 space-y-0.5">
              {report.sections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setPageIdx(i + 1)}
                  className={`w-full text-start text-sm px-2 py-1.5 rounded hover:bg-muted ${pageIdx === i + 1 ? 'bg-muted font-semibold' : ''}`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </Card>

          {/* Page */}
          <div ref={pageRef} className="overflow-x-auto">
            <div
              className="bg-card border rounded-lg shadow-sm mx-auto p-8 md:p-12 transition-transform origin-top"
              style={{
                transform: `scale(${zoom / 100})`,
                width: '100%',
                maxWidth: '900px',
                minHeight: '600px',
              }}
              dir="rtl"
            >
              {pageIdx === 0 ? (
                <div className="text-center py-12 border-b-4 border-double border-primary">
                  <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">{report.title}</h1>
                  <p className="text-lg text-muted-foreground mb-10">{report.subtitle}</p>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>الإصدار: {report.version}</div>
                    <div>التاريخ: {report.date}</div>
                    <div>إعداد: {report.author}</div>
                  </div>
                  <div className="mt-10 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span dir="ltr" className="font-mono">
                      {window.location.pathname}
                    </span>
                  </div>
                </div>
              ) : (
                currentSection && (
                  <article>
                    <h2 className="text-2xl font-bold text-primary border-b-2 border-primary pb-2 mb-4">
                      {highlight(currentSection.title, query)}
                    </h2>
                    {currentSection.blocks.map((b, i) => (
                      <RenderBlock key={i} block={b} query={query} />
                    ))}
                  </article>
                )
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
