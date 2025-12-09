import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(customShortcuts?: ShortcutAction[]) {
  const navigate = useNavigate();

  const defaultShortcuts: ShortcutAction[] = [
    {
      key: 'f',
      ctrl: true,
      action: () => {
        const searchInput = document.querySelector('input[type="text"], input[type="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search',
    },
    {
      key: 'h',
      ctrl: true,
      action: () => navigate('/'),
      description: 'Go to Dashboard',
    },
    {
      key: 'r',
      ctrl: true,
      shift: true,
      action: () => navigate('/reports'),
      description: 'Go to Reports',
    },
  ];

  const shortcuts = [...defaultShortcuts, ...(customShortcuts || [])];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only allow Escape
        if (event.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && keyMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}
