import { useCallback, useRef, useState } from 'react';

interface UseTableKeyboardNavigationOptions {
  totalRows: number;
  onRowSelect?: (index: number) => void;
  onRowExpand?: (index: number) => void;
  onRowAction?: (index: number, action: 'view' | 'delete' | 'edit') => void;
}

/**
 * Hook for keyboard navigation in tables
 * Supports: Arrow keys, Enter, Space, Delete, Escape
 */
export function useTableKeyboardNavigation({
  totalRows,
  onRowSelect,
  onRowExpand,
  onRowAction,
}: UseTableKeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (totalRows === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < totalRows - 1 ? prev + 1 : 0;
          return next;
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : totalRows - 1;
          return next;
        });
        break;

      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setFocusedIndex(totalRows - 1);
        break;

      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && onRowAction) {
          onRowAction(focusedIndex, 'view');
        }
        break;

      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && onRowSelect) {
          onRowSelect(focusedIndex);
        }
        break;

      case 'e':
      case 'E':
        if (focusedIndex >= 0 && onRowExpand) {
          event.preventDefault();
          onRowExpand(focusedIndex);
        }
        break;

      case 'Delete':
      case 'Backspace':
        if (focusedIndex >= 0 && onRowAction) {
          event.preventDefault();
          onRowAction(focusedIndex, 'delete');
        }
        break;

      case 'Escape':
        event.preventDefault();
        setFocusedIndex(-1);
        break;
    }
  }, [totalRows, focusedIndex, onRowSelect, onRowExpand, onRowAction]);

  const getRowProps = useCallback((index: number) => ({
    tabIndex: index === focusedIndex ? 0 : -1,
    'aria-selected': index === focusedIndex,
    'data-focused': index === focusedIndex,
    onFocus: () => setFocusedIndex(index),
    onClick: () => setFocusedIndex(index),
    className: index === focusedIndex ? 'ring-2 ring-primary/50 ring-inset' : '',
  }), [focusedIndex]);

  return {
    tableRef,
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    getRowProps,
  };
}
