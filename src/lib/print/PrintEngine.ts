/**
 * PrintEngine — unified printing facade (S6/P4).
 *
 * Every new print site should go through this single function so we can
 * swap the underlying transport (Electron / iframe / external browser)
 * in one place.
 */

export interface PrintOptions {
  documentTitle?: string;
  waitForImages?: boolean;
  imageTimeoutMs?: number;
}

type ElectronPrintAPI = {
  printHTML?: (html: string) => Promise<unknown>;
  openExternal?: (url: string) => Promise<unknown>;
};

function getElectronAPI(): ElectronPrintAPI | undefined {
  return typeof window !== 'undefined'
    ? (window as unknown as { electronAPI?: ElectronPrintAPI }).electronAPI
    : undefined;
}

export async function printHtml(html: string, options: PrintOptions = {}): Promise<void> {
  const { documentTitle, waitForImages = true, imageTimeoutMs = 4000 } = options;

  const originalTitle = typeof document !== 'undefined' ? document.title : '';
  if (documentTitle && typeof document !== 'undefined') {
    document.title = documentTitle;
  }
  const restoreTitle = () => {
    if (documentTitle && typeof document !== 'undefined') {
      document.title = originalTitle;
    }
  };

  const electron = getElectronAPI();

  if (electron?.printHTML) {
    try {
      await electron.printHTML(html);
    } catch (err) {
      console.log('[PrintEngine] Electron print cancelled:', err);
    } finally {
      restoreTitle();
    }
    return;
  }

  if (electron?.openExternal) {
    try {
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await electron.openExternal(dataUrl);
      restoreTitle();
      return;
    } catch (err) {
      console.warn('[PrintEngine] openExternal fallback failed, using iframe:', err);
    }
  }

  await printViaIframe(html, { waitForImages, imageTimeoutMs }, restoreTitle);
}

function printViaIframe(
  html: string,
  opts: Required<Pick<PrintOptions, 'waitForImages' | 'imageTimeoutMs'>>,
  cleanupTitle: () => void
): Promise<void> {
  return new Promise((resolve) => {
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
    });
    iframe.setAttribute('aria-hidden', 'true');

    const cleanup = () => {
      cleanupTitle();
      URL.revokeObjectURL(blobUrl);
      iframe.remove();
      resolve();
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) return cleanup();
      win.focus();

      const triggerPrint = () => {
        try {
          win.print();
        } catch (e) {
          console.warn('[PrintEngine] window.print() failed:', e);
        }
      };

      const imgs = win.document.images;
      if (!opts.waitForImages || imgs.length === 0) {
        setTimeout(triggerPrint, 200);
      } else {
        let loaded = 0;
        const onDone = () => {
          loaded += 1;
          if (loaded >= imgs.length) setTimeout(triggerPrint, 150);
        };
        for (const img of Array.from(imgs)) {
          if (img.complete) onDone();
          else {
            img.addEventListener('load', onDone);
            img.addEventListener('error', onDone);
          }
        }
        setTimeout(triggerPrint, opts.imageTimeoutMs);
      }

      win.onafterprint = cleanup;
      setTimeout(cleanup, 8000);
    };

    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  });
}

export function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}