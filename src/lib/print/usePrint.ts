import { useCallback } from 'react';
import { printHtml, type PrintOptions } from './PrintEngine';

/**
 * Hook wrapper around the PrintEngine. Components stay React-flavored
 * while the engine itself is framework-free.
 *
 *   const { print } = usePrint();
 *   await print(buildHtml(data), { documentTitle: 'Report' });
 */
export function usePrint() {
  const print = useCallback(
    (html: string, options?: PrintOptions) => printHtml(html, options),
    []
  );
  return { print };
}