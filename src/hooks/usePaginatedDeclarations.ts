import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Declaration } from '@/types/declarations';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface UsePaginatedDeclarationsOptions {
  pageSize?: number;
  filters?: {
    searchQuery?: string;
    statusFilter?: string;
    senderFilter?: string;
    dateFrom?: Date;
    dateTo?: Date;
  };
}

interface PaginatedResult {
  declarations: Declaration[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
}

export function usePaginatedDeclarations(options: UsePaginatedDeclarationsOptions = {}): PaginatedResult {
  const { pageSize: initialPageSize = 20, filters = {} } = options;
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeclarations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build count query
      let countQuery = supabase
        .from('declarations')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Build data query
      let dataQuery = supabase
        .from('declarations')
        .select(`*, sender:profiles!sender_id(username)`)
        .is('deleted_at', null);

      // Apply filters
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        countQuery = countQuery.eq('status', filters.statusFilter as any);
        dataQuery = dataQuery.eq('status', filters.statusFilter as any);
      }

      if (filters.senderFilter && filters.senderFilter !== 'all') {
        countQuery = countQuery.eq('sender_id', filters.senderFilter);
        dataQuery = dataQuery.eq('sender_id', filters.senderFilter);
      }

      if (filters.dateFrom) {
        const fromDate = filters.dateFrom.toISOString();
        countQuery = countQuery.gte('created_at', fromDate);
        dataQuery = dataQuery.gte('created_at', fromDate);
      }

      if (filters.dateTo) {
        const toDate = filters.dateTo.toISOString();
        countQuery = countQuery.lte('created_at', toDate);
        dataQuery = dataQuery.lte('created_at', toDate);
      }

      if (filters.searchQuery) {
        // Search in id field
        dataQuery = dataQuery.ilike('id', `%${filters.searchQuery}%`);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      // Apply pagination with range()
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error: dataError } = await dataQuery
        .order('created_at', { ascending: false })
        .range(from, to);

      if (dataError) throw dataError;

      setDeclarations(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: t('error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, toast, t]);

  useEffect(() => {
    fetchDeclarations();
  }, [fetchDeclarations]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.searchQuery, filters.statusFilter, filters.senderFilter, filters.dateFrom, filters.dateTo]);

  const goToPage = useCallback((page: number) => {
    const maxPage = Math.ceil(totalCount / pageSize);
    if (page >= 1 && page <= maxPage) {
      setCurrentPage(page);
    }
  }, [totalCount, pageSize]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    declarations,
    totalCount,
    currentPage,
    totalPages: Math.ceil(totalCount / pageSize),
    pageSize,
    loading,
    error,
    goToPage,
    setPageSize: handleSetPageSize,
    refresh: fetchDeclarations,
  };
}
