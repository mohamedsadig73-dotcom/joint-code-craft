import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Selection hook with shift-click range support and Ctrl+A / Esc shortcuts.
 * Operates on an ordered list of ids (the currently visible/filtered items).
 */
export function usePackingSelection(orderedIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastIndexRef = useRef<number | null>(null);

  // Drop ids that vanished from the visible list (avoid stale selections)
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(orderedIds);
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [orderedIds]);

  const toggle = useCallback((id: string, shiftKey = false) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const idx = orderedIds.indexOf(id);
      if (shiftKey && lastIndexRef.current !== null && idx >= 0) {
        const [a, b] = [lastIndexRef.current, idx].sort((x, y) => x - y);
        const shouldSelect = !next.has(id);
        for (let i = a; i <= b; i++) {
          const rid = orderedIds[i];
          if (shouldSelect) next.add(rid);
          else next.delete(rid);
        }
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      if (idx >= 0) lastIndexRef.current = idx;
      return next;
    });
  }, [orderedIds]);

  const selectIds = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const deselectIds = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const replaceSelection = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
    lastIndexRef.current = null;
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected(new Set(orderedIds));
  }, [orderedIds]);

  // Keyboard shortcuts: Ctrl/Cmd+A selects all visible, Esc clears
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
      if (isEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllVisible();
      } else if (e.key === 'Escape') {
        clear();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectAllVisible, clear]);

  return {
    selected,
    toggle,
    selectIds,
    deselectIds,
    replaceSelection,
    clear,
    selectAllVisible,
  };
}