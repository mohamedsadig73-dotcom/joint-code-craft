import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';

export type DestFilter = 'all' | 'morocco' | 'uzbekistan' | 'unspecified';
export type StatusFilter = 'all' | 'received' | 'sorted' | 'packed' | 'shipped' | 'dispatched';
export type PackingFilter = 'all' | 'boxed' | 'loose';
export type ImageFilter = 'all' | 'with' | 'without';

export interface ReceiptsFiltersState {
  search: string;
  destination: DestFilter;
  status: StatusFilter;
  packing: PackingFilter;
  supplier: string; // '' = all
  invoiceNumber: string; // '' = all
  boxNo: string; // '' = all
  dateFrom: string; // '' = none (yyyy-mm-dd)
  dateTo: string;
  qtyMin: string; // '' = none (kept as string for input)
  qtyMax: string;
  hasImage: ImageFilter;
}

export const DEFAULT_FILTERS: ReceiptsFiltersState = {
  search: '',
  destination: 'all',
  status: 'all',
  packing: 'all',
  supplier: '',
  invoiceNumber: '',
  boxNo: '',
  dateFrom: '',
  dateTo: '',
  qtyMin: '',
  qtyMax: '',
  hasImage: 'all',
};

const STORAGE_KEY = 'receipts.filters.v1';
const PRESETS_KEY = 'receipts.filterPresets.v1';

export interface FilterPreset {
  id: string;
  name: string;
  filters: ReceiptsFiltersState;
  createdAt: number;
}

export function useReceiptsFilters(receipts: BoxReceipt[]) {
  const [filters, setFilters] = useState<ReceiptsFiltersState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_FILTERS, ...parsed };
      }
    } catch { /* noop */ }
    return DEFAULT_FILTERS;
  });

  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch { /* noop */ }
    return [];
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(filters)); } catch { /* noop */ }
  }, [filters]);

  useEffect(() => {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch { /* noop */ }
  }, [presets]);

  const setField = useCallback(
    <K extends keyof ReceiptsFiltersState>(key: K, value: ReceiptsFiltersState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetAll = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const resetField = useCallback((key: keyof ReceiptsFiltersState) => {
    setFilters((prev) => ({ ...prev, [key]: DEFAULT_FILTERS[key] }));
  }, []);

  const savePreset = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPresets((prev) => [
      ...prev.filter((p) => p.name !== trimmed),
      { id: crypto.randomUUID(), name: trimmed, filters, createdAt: Date.now() },
    ]);
  }, [filters]);

  const loadPreset = useCallback((id: string) => {
    setPresets((prevPresets) => {
      const p = prevPresets.find((x) => x.id === id);
      if (p) setFilters({ ...DEFAULT_FILTERS, ...p.filters });
      return prevPresets;
    });
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Derived: distinct lookups
  const suppliers = useMemo(
    () => Array.from(new Set(receipts.map((r) => r.supplier).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')),
    [receipts],
  );
  const invoiceNumbers = useMemo(
    () => Array.from(new Set(receipts.map((r) => r.invoice_number).filter((v): v is string => !!v))).sort(),
    [receipts],
  );
  const boxNumbers = useMemo(
    () => Array.from(new Set(receipts.map((r) => r.box_no).filter((v): v is string => !!v))).sort(),
    [receipts],
  );

  // Apply filters
  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const qMin = filters.qtyMin === '' ? null : Number(filters.qtyMin);
    const qMax = filters.qtyMax === '' ? null : Number(filters.qtyMax);
    return receipts.filter((r) => {
      if (filters.destination !== 'all' && r.destination !== filters.destination) return false;
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.packing !== 'all' && r.packing_type !== filters.packing) return false;
      if (filters.supplier && r.supplier !== filters.supplier) return false;
      if (filters.invoiceNumber && r.invoice_number !== filters.invoiceNumber) return false;
      if (filters.boxNo && r.box_no !== filters.boxNo) return false;
      if (filters.dateFrom && r.receipt_date < filters.dateFrom) return false;
      if (filters.dateTo && r.receipt_date > filters.dateTo) return false;
      if (qMin !== null && !Number.isNaN(qMin) && r.qty < qMin) return false;
      if (qMax !== null && !Number.isNaN(qMax) && r.qty > qMax) return false;
      if (filters.hasImage === 'with' && !r.image_path) return false;
      if (filters.hasImage === 'without' && r.image_path) return false;
      if (!q) return true;
      return (
        r.supplier.toLowerCase().includes(q) ||
        r.part_no.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.box_no?.toLowerCase().includes(q) ?? false) ||
        (r.invoice_number?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [receipts, filters]);

  // Active filters list (for chips). search is shown inline so we exclude it.
  const activeChips = useMemo(() => {
    const chips: { key: keyof ReceiptsFiltersState; label: string; value: string }[] = [];
    if (filters.destination !== 'all') chips.push({ key: 'destination', label: 'destination', value: filters.destination });
    if (filters.status !== 'all') chips.push({ key: 'status', label: 'status', value: filters.status });
    if (filters.packing !== 'all') chips.push({ key: 'packing', label: 'packingType', value: filters.packing });
    if (filters.supplier) chips.push({ key: 'supplier', label: 'supplier', value: filters.supplier });
    if (filters.invoiceNumber) chips.push({ key: 'invoiceNumber', label: 'invoiceNumber', value: filters.invoiceNumber });
    if (filters.boxNo) chips.push({ key: 'boxNo', label: 'boxNo', value: filters.boxNo });
    if (filters.dateFrom) chips.push({ key: 'dateFrom', label: 'dateFrom', value: filters.dateFrom });
    if (filters.dateTo) chips.push({ key: 'dateTo', label: 'dateTo', value: filters.dateTo });
    if (filters.qtyMin) chips.push({ key: 'qtyMin', label: 'qtyMin', value: filters.qtyMin });
    if (filters.qtyMax) chips.push({ key: 'qtyMax', label: 'qtyMax', value: filters.qtyMax });
    if (filters.hasImage !== 'all') chips.push({ key: 'hasImage', label: 'image', value: filters.hasImage });
    return chips;
  }, [filters]);

  const activeCount = activeChips.length;

  // Date shortcut helpers
  const setDateRange = useCallback((preset: 'today' | '7d' | 'month' | 'year') => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    let from = new Date(today);
    if (preset === 'today') {
      // same
    } else if (preset === '7d') {
      from.setDate(today.getDate() - 6);
    } else if (preset === 'month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'year') {
      from = new Date(today.getFullYear(), 0, 1);
    }
    setFilters((prev) => ({ ...prev, dateFrom: fmt(from), dateTo: fmt(today) }));
  }, []);

  return {
    filters,
    setField,
    resetAll,
    resetField,
    filtered,
    activeChips,
    activeCount,
    suppliers,
    invoiceNumbers,
    boxNumbers,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    setDateRange,
  };
}