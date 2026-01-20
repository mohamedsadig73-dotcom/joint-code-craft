import { useState, useEffect, useCallback } from 'react';
import { PrinterSettings, PrinterType, PaperSize } from '@/types/labelPrinting';

const SETTINGS_KEY = 'printerSettings';

const DEFAULT_SETTINGS: PrinterSettings = {
  defaultPrinterType: 'thermal80',
  defaultPaperSize: '80mm',
  showBarcodeDefault: true,
  showQRCodeDefault: false,
};

interface UsePrinterSettingsReturn {
  settings: PrinterSettings;
  updateSettings: (updates: Partial<PrinterSettings>) => void;
  resetSettings: () => void;
}

export function usePrinterSettings(): UsePrinterSettingsReturn {
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_SETTINGS);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Error loading printer settings:', error);
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<PrinterSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      
      // Sync paper size with printer type
      if (updates.defaultPrinterType) {
        if (updates.defaultPrinterType === 'thermal58') {
          newSettings.defaultPaperSize = '58mm';
        } else if (updates.defaultPrinterType === 'thermal80') {
          newSettings.defaultPaperSize = '80mm';
        } else {
          newSettings.defaultPaperSize = 'A4';
        }
      }
      
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      } catch (error) {
        console.error('Error saving printer settings:', error);
      }
      
      return newSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(SETTINGS_KEY);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
