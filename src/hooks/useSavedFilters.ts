import { useState, useEffect, useCallback } from 'react';

export interface SavedFilter {
  id: string;
  name: string;
  filters: {
    searchQuery?: string;
    statusFilter?: string;
    senderFilter?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  createdAt: string;
}

const STORAGE_KEY = 'dts_saved_filters';

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedFilters(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  }, []);

  // Save filter
  const saveFilter = useCallback((name: string, filters: SavedFilter['filters']) => {
    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name,
      filters,
      createdAt: new Date().toISOString(),
    };

    setSavedFilters(prev => {
      const updated = [...prev, newFilter];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    return newFilter;
  }, []);

  // Delete filter
  const deleteFilter = useCallback((id: string) => {
    setSavedFilters(prev => {
      const updated = prev.filter(f => f.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Update filter
  const updateFilter = useCallback((id: string, updates: Partial<SavedFilter>) => {
    setSavedFilters(prev => {
      const updated = prev.map(f => 
        f.id === id ? { ...f, ...updates } : f
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    updateFilter,
  };
}
