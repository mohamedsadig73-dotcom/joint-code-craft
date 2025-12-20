import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface SortableHeaderProps {
  label: string;
  column: string;
  currentSort: SortConfig;
  onSort: (column: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  column,
  currentSort,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort.column === column;
  const direction = isActive ? currentSort.direction : null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "-ms-3 h-8 gap-1 font-medium text-muted-foreground hover:text-foreground",
        isActive && "text-foreground",
        className
      )}
      onClick={() => onSort(column)}
    >
      <span>{label}</span>
      {direction === 'asc' ? (
        <ArrowUp className="w-3.5 h-3.5" />
      ) : direction === 'desc' ? (
        <ArrowDown className="w-3.5 h-3.5" />
      ) : (
        <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
      )}
    </Button>
  );
}

// Hook for managing sort state
export function useSortableTable<T>(
  data: T[],
  defaultColumn?: string,
  defaultDirection: SortDirection = null
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: defaultColumn || '',
    direction: defaultDirection,
  });

  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { column: '', direction: null };
      }
      return { column, direction: 'asc' };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortConfig.column];
      const bValue = (b as any)[sortConfig.column];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Handle strings (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Handle numbers and other comparables
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  return {
    sortConfig,
    setSortConfig,
    handleSort,
    sortedData,
  };
}
