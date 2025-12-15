import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className,
  emptyMessage = 'لا توجد عناصر',
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const { visibleItems, startIndex, totalHeight, offsetY } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;
    
    return { visibleItems, startIndex, totalHeight, offsetY };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  if (items.length === 0) {
    return (
      <div 
        className={cn('flex items-center justify-center text-muted-foreground', className)}
        style={{ height: containerHeight }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Grid virtualization for card layouts
interface VirtualizedGridProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  columns: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
}

export function VirtualizedGrid<T>({
  items,
  itemHeight,
  containerHeight,
  columns,
  renderItem,
  gap = 16,
  overscan = 2,
  className,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const rowHeight = itemHeight + gap;
  const rows = Math.ceil(items.length / columns);
  const totalHeight = rows * rowHeight;

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(rows, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan);
  
  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length, endRow * columns);
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startRow * rowHeight;

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div 
          className="grid"
          style={{ 
            transform: `translateY(${offsetY}px)`,
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap,
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
