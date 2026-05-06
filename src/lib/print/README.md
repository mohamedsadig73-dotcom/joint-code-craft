# Print Engine (S6 / P4)

Single entry point for printing across the app.

- `printHtml(html, options)` — pure function, framework-free.
- `usePrint()` — React hook wrapper.
- `escapeHtml(value)` — small helper for template strings.

## Strategy
1. Electron native (`webContents.printToPDF`) when available.
2. Electron shell → open in system browser (older desktop builds).
3. Web: hidden iframe + Blob URL, waits for images, then `window.print()`.

## Migration policy
- New print sites MUST use `usePrint()` / `printHtml()`.
- Existing sites keep working unchanged and will be migrated
  module-by-module in follow-up sprints.