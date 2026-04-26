/**
 * Centralized print utility for the desktop (Electron) and browser.
 *
 * Goals:
 *  - Build a self-contained HTML document with ONLY the essential styles
 *    (Tailwind output + page-scoped <style> blocks). Avoid pulling extension
 *    or unrelated injected stylesheets so printing is faster and visually
 *    consistent.
 *  - Provide a robust fallback path: if Electron's `printHTML` IPC fails
 *    (no printer, user cancelled, IPC error) callers can fall back to an
 *    in-app preview (iframe) without losing the rendered content.
 */

export type PaperSize = 'A4' | 'Letter';
export type PaperOrientation = 'portrait' | 'landscape';

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
  } = opts;

  const styles = collectEssentialStyles();
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
      body {
        font-family: 'Segoe UI Arabic', 'Cairo', Arial, sans-serif;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-sheet { width: 100%; min-height: auto; padding: 0; margin: 0; box-sizing: border-box; }
      .print:hidden, [data-print-hide="true"] { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      img { max-width: 100%; }
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
  | { ok: true; transport: 'electron' | 'browser' }
  | { ok: false; reason: string; transport: 'electron' | 'browser'; html: string };

/**
 * Try Electron native print first, fall back to opening a hidden iframe
 * and triggering window.print() on the host page. Caller can use the
 * returned `html` to render an in-app preview when `ok` is false.
 */
export async function printDocument(bodyHTML: string, opts: PrintOptions): Promise<PrintResult> {
  const html = buildPrintHTML(bodyHTML, opts);

  // Native Electron path.
  if (typeof window !== 'undefined' && window.electronAPI?.printHTML) {
    try {
      await window.electronAPI.printHTML(html);
      logPrintEvent({ level: 'info', message: `طباعة ناجحة: ${opts.title}` });
      return { ok: true, transport: 'electron' };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      logPrintEvent({
        level: 'error',
        message: `فشل الطباعة عبر تطبيق سطح المكتب`,
        detail: reason,
      });
      return { ok: false, reason, transport: 'electron', html };
    }
  }

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
    return { ok: false, reason, transport: 'browser', html };
  }
}