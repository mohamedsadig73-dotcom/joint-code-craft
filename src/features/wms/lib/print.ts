/**
 * iframe + Blob print strategy (Web), works inside Electron too.
 * Avoids window.open popup blockers and CSS leakage from the host app.
 */
export function wmsPrintHTML(html: string, fileTitle?: string) {
  const prevTitle = document.title;
  if (fileTitle) document.title = fileTitle;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  iframe.src = url;

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('wmsPrint: print() failed', e);
      }
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(iframe);
        if (fileTitle) document.title = prevTitle;
      }, 1000);
    }, 250);
  };
}

/** HTML escape helper for safe content interpolation. */
export function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}