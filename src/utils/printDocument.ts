/**
 * Centralized print utility for the desktop (Electron) and browser.
 *
 * Goals:
 *  - Build a self-contained HTML document with ONLY the essential styles
 *    (Tailwind output + page-scoped <style> blocks). Avoid pulling extension
 *    or unrelated injected stylesheets so printing is faster and visually
 *    consistent.
 *  - Provide a robust fallback path: desktop printing generates a PDF first
 *    and opens it in the OS viewer. This avoids Electron/Windows native print
 *    preview, which is known to show "app doesn't support print preview".
 */

export type PaperSize = 'A4' | 'Letter';
export type PaperOrientation = 'portrait' | 'landscape';

/**
 * Windows-specific print transport selector.
 *  - 'auto'     : generate PDF through Electron, fall back to in-app preview.
 *  - 'native'   : generate PDF through Electron (bypass in-app preview).
 *  - 'preview'  : always use the in-app iframe preview (skip IPC bridge).
 */
export type WindowsPrintMode = 'auto' | 'native' | 'preview';

export interface PrintOptions {
  /** Document <title> — also used for default save-as filename. */
  title: string;
  /** Paper size token. Defaults to A4. */
  paperSize?: PaperSize;
  /** Page orientation. Defaults to portrait. */
  orientation?: PaperOrientation;
  /** Page margin in millimetres (uniform on all sides). Defaults to 10. */
  marginMm?: number;
  /** Document direction. Defaults to 'rtl'. */
  dir?: 'rtl' | 'ltr';
  /** Document language. Defaults to 'ar'. */
  lang?: string;
  /**
   * "Safe mode" rebuilds the document with the absolute minimum of styles
   * (page geometry + base table rules) instead of the full app stylesheets.
   * Used as the automatic single retry when the rich document fails to print.
   */
  safeMode?: boolean;
}

/**
 * Collect ONLY the stylesheets that are essential for the printable surface:
 *   - Vite-generated Tailwind/CSS bundles (link[rel="stylesheet"][href*="/assets/"])
 *   - <style> blocks owned by the application (we keep them, they are tiny)
 *
 * We deliberately skip browser-injected stylesheets (extensions, devtools)
 * and external font CDNs that may slow the print preview.
 */
function collectEssentialStyles(): string {
  const parts: string[] = [];

  // App-owned <style> tags (component-scoped print rules).
  document.querySelectorAll('style').forEach((el) => {
    const css = el.textContent ?? '';
    if (css.trim()) parts.push(`<style>${css}</style>`);
  });

  // Vite/asset stylesheets only.
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((el) => {
    const href = el.getAttribute('href') ?? '';
    // Keep app bundle (assets) and absolute https stylesheets the app explicitly added.
    // Skip extensions (chrome-extension://, moz-extension://) and data: URLs.
    if (
      href &&
      !href.startsWith('chrome-extension:') &&
      !href.startsWith('moz-extension:') &&
      !href.startsWith('data:')
    ) {
      parts.push(`<link rel="stylesheet" href="${href}">`);
    }
  });

  return parts.join('\n');
}

/**
 * Minimal stylesheet used by "safe mode" prints. Contains only the rules
 * required to render a clean A4/Letter document — no Tailwind, no theme
 * tokens. This is the recovery path when the full bundle causes a blank
 * print preview (printer driver bug, missing fonts, CSS @layer issues, ...).
 */
const SAFE_MODE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; color: #000; background: #fff; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #555; padding: 4px 6px; text-align: start; vertical-align: top; }
  thead { display: table-header-group; background: #eee; }
  tr { page-break-inside: avoid; }
  h1, h2, h3 { margin: 0 0 8px; }
  img { max-width: 100%; height: auto; }
  .print\\:hidden, [data-print-hide="true"] { display: none !important; }
`;

/**
 * Build the final HTML document for printing.
 */
export function buildPrintHTML(bodyHTML: string, opts: PrintOptions): string {
  const {
    title,
    paperSize = 'A4',
    orientation = 'portrait',
    marginMm = 10,
    dir = 'rtl',
    lang = 'ar',
    safeMode = false,
  } = opts;

  const styles = safeMode ? '' : collectEssentialStyles();
  // Clamp margin to a sane range to avoid printer-driver errors.
  const margin = Math.max(0, Math.min(40, Math.round(marginMm)));

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    ${styles}
    <style>
      @page { size: ${paperSize} ${orientation}; margin: ${margin}mm; }
      html, body { background: white !important; margin: 0; padding: 0; }
      ${safeMode ? SAFE_MODE_CSS : `body {
        font-family: 'Segoe UI Arabic', 'Cairo', Arial, sans-serif;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-sheet { width: 100%; min-height: auto; padding: 0; margin: 0; box-sizing: border-box; }
      .print:hidden, [data-print-hide="true"] { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      img { max-width: 100%; }`}
    </style>
  </head>
  <body>${bodyHTML}</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type PrintLogLevel = 'info' | 'warn' | 'error';
export interface PrintLogEntry {
  ts: number;
  level: PrintLogLevel;
  message: string;
  detail?: string;
}

const LOG_KEY = 'dts.print.log';
const LOG_MAX = 50;

/** Append an entry to the rolling print log (persisted in localStorage). */
export function logPrintEvent(entry: Omit<PrintLogEntry, 'ts'>): void {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const arr: PrintLogEntry[] = raw ? JSON.parse(raw) : [];
    arr.unshift({ ts: Date.now(), ...entry });
    localStorage.setItem(LOG_KEY, JSON.stringify(arr.slice(0, LOG_MAX)));
  } catch {
    // Silent — logging must never break printing.
  }
}

export function readPrintLog(): PrintLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as PrintLogEntry[]) : [];
  } catch {
    return [];
  }
}

export type PrintResult =
  | { ok: true; transport: 'electron' | 'browser' | 'preview'; safeMode?: boolean; path?: string }
  | {
      ok: false;
      reason: string;
      transport: 'electron' | 'browser' | 'preview';
      html: string;
      /** Step where the failure occurred — surfaced by the diagnostics screen. */
      failedStep: 'bridge' | 'css' | 'printer' | 'preview' | 'unknown';
      safeMode?: boolean;
    };

export interface PrintDocumentOpts extends PrintOptions {
  /** Override transport selection (Windows mode). Defaults to 'auto'. */
  windowsMode?: WindowsPrintMode;
  /**
   * If true (default), automatically retry once in safe mode when the first
   * native print attempt fails.
   */
  autoSafeRetry?: boolean;
}

/**
 * Try Electron native print first (respecting `windowsMode`), and
 * automatically retry once in "safe mode" if the rich document fails.
 * Falls back to returning the failure (with html + failed step) so the
 * caller can render an in-app preview / diagnostics dialog.
 */
export async function printDocument(
  bodyHTML: string,
  opts: PrintDocumentOpts,
): Promise<PrintResult> {
  const windowsMode: WindowsPrintMode = opts.windowsMode ?? 'auto';
  const autoSafeRetry = opts.autoSafeRetry ?? true;
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.printHTML);

  // Mode 'preview': caller will show the in-app iframe instead of using the bridge.
  if (isElectron && windowsMode === 'preview') {
    const html = buildPrintHTML(bodyHTML, opts);
    logPrintEvent({ level: 'info', message: `طباعة عبر المعاينة الداخلية: ${opts.title}` });
    return { ok: false, reason: 'forced-preview-mode', transport: 'preview', html, failedStep: 'preview' };
  }

  // Native Electron path.
  if (isElectron && (windowsMode === 'auto' || windowsMode === 'native')) {
    const html = buildPrintHTML(bodyHTML, opts);
    try {
      const response = await window.electronAPI!.printHTML!(html);
      const pdfPath = typeof response === 'object' && response !== null ? response.path : undefined;
      logPrintEvent({ level: 'info', message: `تم إنشاء ملف PDF للطباعة: ${opts.title}`, detail: `mode=${windowsMode}${pdfPath ? ` | ${pdfPath}` : ''}` });
      return { ok: true, transport: 'electron', path: pdfPath };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      logPrintEvent({
        level: 'warn',
        message: `فشل الطباعة (المحاولة الأولى)`,
        detail: `mode=${windowsMode} | ${reason}`,
      });

      // Auto safe-mode retry: rebuild with minimal CSS and try once more.
      if (autoSafeRetry) {
        const safeHtml = buildPrintHTML(bodyHTML, { ...opts, safeMode: true });
        try {
          const response = await window.electronAPI!.printHTML!(safeHtml);
          const pdfPath = typeof response === 'object' && response !== null ? response.path : undefined;
          logPrintEvent({
            level: 'info',
            message: `تم إنشاء PDF في الوضع الآمن: ${opts.title}`,
            detail: pdfPath,
          });
          return { ok: true, transport: 'electron', safeMode: true, path: pdfPath };
        } catch (e2) {
          const r2 = e2 instanceof Error ? e2.message : String(e2);
          logPrintEvent({
            level: 'error',
            message: `فشل الوضع الآمن أيضاً`,
            detail: r2,
          });
          return {
            ok: false,
            reason: r2,
            transport: 'electron',
            html: safeHtml,
            failedStep: classifyFailure(r2),
            safeMode: true,
          };
        }
      }

      return {
        ok: false,
        reason,
        transport: 'electron',
        html,
        failedStep: classifyFailure(reason),
      };
    }
  }

  const html = buildPrintHTML(bodyHTML, opts);
  // Browser path — let the host page run window.print(); the caller's
  // <body> is already on screen via the route, so this works without an iframe.
  try {
    const original = document.title;
    document.title = opts.title;
    await new Promise((r) => setTimeout(r, 80));
    window.print();
    setTimeout(() => { document.title = original; }, 600);
    logPrintEvent({ level: 'info', message: `طباعة عبر المتصفح: ${opts.title}` });
    return { ok: true, transport: 'browser' };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    logPrintEvent({ level: 'error', message: 'فشل طباعة المتصفح', detail: reason });
    return { ok: false, reason, transport: 'browser', html, failedStep: classifyFailure(reason) };
  }
}

/** Best-effort classification of a printer/preview error for diagnostics UI. */
function classifyFailure(reason: string): 'bridge' | 'css' | 'printer' | 'preview' | 'unknown' {
  const r = reason.toLowerCase();
  if (r.includes('ipc') || r.includes('bridge') || r.includes('handle') || r.includes('channel')) return 'bridge';
  if (r.includes('printer') || r.includes('no devices') || r.includes('not found') || r.includes('device')) return 'printer';
  if (r.includes('css') || r.includes('style') || r.includes('layer')) return 'css';
  if (r.includes('window') || r.includes('preview') || r.includes('loadfile')) return 'preview';
  return 'unknown';
}

/* ──────────────────────────────────────────────────────────────────────
 * Print self-test (dev mode)
 * Builds a small synthetic invoice document, runs it through buildPrintHTML
 * in both normal and safe modes, and verifies that the resulting HTML is
 * non-empty and includes the expected page-geometry. This catches "blank
 * white screen" regressions before they reach a release.
 * ────────────────────────────────────────────────────────────────────── */

export interface PrintSelfTestResult {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail?: string }>;
  /** Standalone HTML for an internal preview of the synthetic invoice. */
  previewHtml: string;
}

export function runPrintSelfTest(): PrintSelfTestResult {
  const checks: PrintSelfTestResult['checks'] = [];
  const sampleBody = `
    <div class="print-sheet" style="padding:10mm">
      <h1>فاتورة تجريبية — Sample Invoice</h1>
      <table>
        <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Widget A</td><td>2</td><td>50.00</td></tr>
          <tr><td>2</td><td>Widget B</td><td>1</td><td>75.50</td></tr>
        </tbody>
      </table>
    </div>`;

  const normal = buildPrintHTML(sampleBody, { title: 'self-test-normal', paperSize: 'A4', orientation: 'portrait', marginMm: 10 });
  checks.push({ name: 'normal-non-empty', ok: normal.length > 200, detail: `${normal.length} chars` });
  checks.push({ name: 'normal-has-page-rule', ok: normal.includes('@page'), detail: '@page directive present' });
  checks.push({ name: 'normal-has-body', ok: normal.includes('Sample Invoice'), detail: 'invoice body rendered' });

  const safe = buildPrintHTML(sampleBody, { title: 'self-test-safe', paperSize: 'A4', orientation: 'portrait', marginMm: 10, safeMode: true });
  checks.push({ name: 'safe-non-empty', ok: safe.length > 200, detail: `${safe.length} chars` });
  checks.push({ name: 'safe-no-bundle-css', ok: !safe.includes('/assets/'), detail: 'no Vite asset links in safe mode' });
  checks.push({ name: 'safe-has-page-rule', ok: safe.includes('@page'), detail: '@page directive present' });

  const ok = checks.every((c) => c.ok);
  logPrintEvent({
    level: ok ? 'info' : 'error',
    message: `Print self-test ${ok ? 'passed' : 'failed'}`,
    detail: checks.map((c) => `${c.ok ? '✓' : '✗'} ${c.name}`).join(' | '),
  });
  return { ok, checks, previewHtml: normal };
}