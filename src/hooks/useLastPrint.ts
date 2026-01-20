import { useState, useEffect, useCallback } from 'react';
import { LabelData, PrintConfig, PrintJob } from '@/types/labelPrinting';

const STORAGE_KEY = 'lastPrintJob';
const EXPIRY_HOURS = 24;

interface UseLastPrintReturn {
  lastPrintJob: PrintJob | null;
  saveLastPrint: (labelData: LabelData, config: PrintConfig, userId: string) => void;
  clearLastPrint: () => void;
  canReprint: boolean;
}

export function useLastPrint(): UseLastPrintReturn {
  const [lastPrintJob, setLastPrintJob] = useState<PrintJob | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const job: PrintJob = JSON.parse(stored);
        
        // Check if expired (24 hours)
        const printedAt = new Date(job.printedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - printedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < EXPIRY_HOURS) {
          setLastPrintJob(job);
        } else {
          // Expired, clear it
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading last print job:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveLastPrint = useCallback((
    labelData: LabelData,
    config: PrintConfig,
    userId: string
  ) => {
    const job: PrintJob = {
      id: crypto.randomUUID(),
      labelData,
      config,
      printedAt: new Date().toISOString(),
      printedBy: userId,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
      setLastPrintJob(job);
    } catch (error) {
      console.error('Error saving last print job:', error);
    }
  }, []);

  const clearLastPrint = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLastPrintJob(null);
  }, []);

  return {
    lastPrintJob,
    saveLastPrint,
    clearLastPrint,
    canReprint: lastPrintJob !== null,
  };
}
