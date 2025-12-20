import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  descriptionAr: string;
}

export function useWMSKeyboardShortcuts(language: string = 'en') {
  const navigate = useNavigate();
  const location = useLocation();

  const showShortcutsHelp = useCallback(() => {
    const message = language === 'ar' 
      ? 'اضغط ? لعرض جميع الاختصارات'
      : 'Press ? to view all shortcuts';
    toast.info(message);
  }, [language]);

  const shortcuts: ShortcutAction[] = [
    // Navigation shortcuts
    {
      key: 'd',
      alt: true,
      action: () => navigate('/wms'),
      description: 'Go to WMS Dashboard',
      descriptionAr: 'الذهاب للوحة التحكم'
    },
    {
      key: 'p',
      alt: true,
      action: () => navigate('/wms/products'),
      description: 'Go to Products',
      descriptionAr: 'الذهاب للمنتجات'
    },
    {
      key: 'i',
      alt: true,
      action: () => navigate('/wms/inventory'),
      description: 'Go to Inventory',
      descriptionAr: 'الذهاب للمخزون'
    },
    {
      key: 'l',
      alt: true,
      action: () => navigate('/wms/locations'),
      description: 'Go to Locations',
      descriptionAr: 'الذهاب للمواقع'
    },
    {
      key: 'n',
      alt: true,
      action: () => navigate('/wms/inbound'),
      description: 'Go to Inbound Orders',
      descriptionAr: 'الذهاب لأوامر الاستلام'
    },
    {
      key: 'o',
      alt: true,
      action: () => navigate('/wms/outbound'),
      description: 'Go to Outbound Orders',
      descriptionAr: 'الذهاب لأوامر الصرف'
    },
    {
      key: 't',
      alt: true,
      action: () => navigate('/wms/transactions'),
      description: 'Go to Transactions',
      descriptionAr: 'الذهاب للحركات'
    },
    {
      key: 'r',
      alt: true,
      action: () => navigate('/wms/reports'),
      description: 'Go to Reports',
      descriptionAr: 'الذهاب للتقارير'
    },
    {
      key: 'a',
      alt: true,
      action: () => navigate('/wms/alerts'),
      description: 'Go to Alerts',
      descriptionAr: 'الذهاب للتنبيهات'
    },
    {
      key: 's',
      alt: true,
      action: () => navigate('/wms/suppliers'),
      description: 'Go to Suppliers',
      descriptionAr: 'الذهاب للموردين'
    },
    // Action shortcuts
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
      descriptionAr: 'التركيز على البحث'
    },
    {
      key: 'Escape',
      action: () => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        if (dialogs.length > 0) {
          const closeButton = dialogs[dialogs.length - 1].querySelector('[data-close-button]') as HTMLButtonElement;
          closeButton?.click();
        }
      },
      description: 'Close dialog',
      descriptionAr: 'إغلاق النافذة'
    },
    {
      key: '/',
      action: showShortcutsHelp,
      description: 'Show shortcuts help',
      descriptionAr: 'عرض مساعدة الاختصارات'
    }
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (event.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
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

export function useShortcutsDialog(language: string = 'en') {
  const shortcuts = useWMSKeyboardShortcuts(language);
  
  const groupedShortcuts = {
    navigation: shortcuts.filter(s => s.alt && !s.ctrl),
    actions: shortcuts.filter(s => s.ctrl || (!s.alt && !s.ctrl))
  };

  const formatShortcut = (shortcut: ShortcutAction) => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return { groupedShortcuts, formatShortcut };
}
