import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, ChevronDown, ChevronUp, Keyboard, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TableSkeleton, CardSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SwipeableRow } from '@/components/SwipeableRow';
import { StatusQuickAction } from '@/components/declarations/StatusQuickAction';
import { DeclarationRowExpand } from '@/components/declarations/DeclarationRowExpand';
import { Pagination } from '@/components/dashboard/Pagination';
import { ExportToolbar } from '@/components/dashboard/ExportToolbar';
import { SortableHeader, useSortableTable, type SortConfig } from '@/components/dashboard/SortableHeader';
import { VirtualizedList } from '@/components/VirtualizedList';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTableKeyboardNavigation } from '@/hooks/useTableKeyboardNavigation';
import { toGregorianDate } from '@/utils/dateUtils';
import { Declaration } from '@/types/declarations';
import { cn } from '@/lib/utils';

const VIRTUAL_ROW_HEIGHT = 52;

interface DeclarationsTableProps {
  declarations: Declaration[];
  loading: boolean;
  selectedItems: string[];
  expandedRows: string[];
  onToggleSelectAll: () => void;
  onToggleSelectItem: (id: string) => void;
  onToggleRowExpand: (id: string) => void;
  onDelete: (declaration: Declaration) => void;
  onStatusChange: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onCreateNew: () => void;
  // Server-side pagination props
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  useServerPagination?: boolean;
}

export function DeclarationsTable({
  declarations,
  loading,
  selectedItems,
  expandedRows,
  onToggleSelectAll,
  onToggleSelectItem,
  onToggleRowExpand,
  onDelete,
  onStatusChange,
  hasActiveFilters,
  onClearFilters,
  onCreateNew,
  // Server-side pagination
  currentPage: serverCurrentPage,
  totalPages: serverTotalPages,
  pageSize: serverPageSize,
  totalCount: serverTotalCount,
  onPageChange: serverOnPageChange,
  onPageSizeChange: serverOnPageSizeChange,
  useServerPagination = false,
}: DeclarationsTableProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Client-side pagination state (used when useServerPagination is false)
  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(20);
  
  // Determine which pagination values to use
  const currentPage = useServerPagination ? (serverCurrentPage || 1) : clientCurrentPage;
  const pageSize = useServerPagination ? (serverPageSize || 20) : clientPageSize;
  const totalPages = useServerPagination ? (serverTotalPages || 1) : Math.ceil(declarations.length / clientPageSize);
  const totalCount = useServerPagination ? (serverTotalCount || 0) : declarations.length;
  
  // Sorting state
  const { sortConfig, handleSort, sortedData } = useSortableTable(declarations);
  
  // For client-side pagination, slice the declarations (after sorting)
  const displayedDeclarations = useMemo(() => {
    const dataToDisplay = useServerPagination ? declarations : sortedData;
    if (useServerPagination) {
      return dataToDisplay; // Server already returns paginated data
    }
    const startIndex = (clientCurrentPage - 1) * clientPageSize;
    return dataToDisplay.slice(startIndex, startIndex + clientPageSize);
  }, [declarations, sortedData, clientCurrentPage, clientPageSize, useServerPagination]);
  
  const handlePageChange = (page: number) => {
    if (useServerPagination && serverOnPageChange) {
      serverOnPageChange(page);
    } else {
      setClientCurrentPage(page);
    }
  };
  
  const handlePageSizeChange = (size: number) => {
    if (useServerPagination && serverOnPageSizeChange) {
      serverOnPageSizeChange(size);
    } else {
      setClientPageSize(size);
      setClientCurrentPage(1);
    }
  };

  // Keyboard navigation
  const handleRowSelect = useCallback((index: number) => {
    const declaration = displayedDeclarations[index];
    if (declaration) {
      onToggleSelectItem(declaration.id);
    }
  }, [displayedDeclarations, onToggleSelectItem]);

  const handleRowExpand = useCallback((index: number) => {
    const declaration = displayedDeclarations[index];
    if (declaration) {
      onToggleRowExpand(declaration.id);
    }
  }, [displayedDeclarations, onToggleRowExpand]);

  const handleRowAction = useCallback((index: number, action: 'view' | 'delete' | 'edit') => {
    const declaration = displayedDeclarations[index];
    if (!declaration) return;

    switch (action) {
      case 'view':
        navigate(`/declaration/${declaration.id}`);
        break;
      case 'delete':
        if (user?.role === 'admin' || (user?.role === 'manager' && declaration.sender_id === user?.id)) {
          onDelete(declaration);
        }
        break;
    }
  }, [displayedDeclarations, navigate, onDelete, user]);

  const {
    focusedIndex,
    handleKeyDown,
    getRowProps,
  } = useTableKeyboardNavigation({
    totalRows: displayedDeclarations.length,
    onRowSelect: handleRowSelect,
    onRowExpand: handleRowExpand,
    onRowAction: handleRowAction,
  });

  if (isMobile) {
    return (
      <div className="space-y-3">
        {loading ? (
          <CardSkeleton count={5} />
        ) : declarations.length === 0 ? (
          <EmptyState
            variant="search"
            title={hasActiveFilters ? t('noDeclarationsFound') : t('noDeclarations')}
            description={hasActiveFilters ? t('tryAdjustingFilters') : t('noRecentDeclarations')}
            actionLabel={hasActiveFilters ? t('clearFilters') : t('createDeclaration')}
            onAction={hasActiveFilters ? onClearFilters : onCreateNew}
          />
        ) : (
          <>
            {displayedDeclarations.map((declaration) => (
              <SwipeableRow
                key={declaration.id}
                onEdit={() => navigate(`/declaration/${declaration.id}`)}
                onDelete={(user?.role === 'admin' || (user?.role === 'manager' && declaration.sender_id === user?.id)) 
                  ? () => onDelete(declaration) 
                  : undefined}
                editLabel={t('view')}
                deleteLabel={t('delete')}
              >
                <Card className="p-4 space-y-3 bg-background border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {declaration.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        #{declaration.id.slice(0, 8)}
                      </span>
                    </div>
                    <StatusQuickAction
                      declarationId={declaration.id}
                      currentStatus={declaration.status}
                      onStatusChange={onStatusChange}
                    />
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{declaration.sender?.username || t('unknown')}</span>
                    <span>•</span>
                    <span>{toGregorianDate(declaration.created_at)}</span>
                  </div>

                  {declaration.archive_number && (
                    <div className="text-xs text-muted-foreground">
                      {t('archiveNumber')}: <span className="font-mono">{declaration.archive_number}</span>
                    </div>
                  )}
                </Card>
              </SwipeableRow>
            ))}
            {totalCount > pageSize && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalCount}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // Virtual scrolling state
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Render a single virtualized row
  const renderVirtualRow = useCallback((declaration: Declaration, index: number) => {
    const isSelected = selectedItems.includes(declaration.id);
    const isExpanded = expandedRows.includes(declaration.id);
    
    return (
      <div 
        className={cn(
          "grid grid-cols-[2rem_2rem_1fr_4rem_6rem_6rem_1fr_6rem_4rem] gap-2 items-center px-4 border-b border-border/30 hover:bg-muted/5 transition-colors",
          focusedIndex === index && "ring-2 ring-primary/50 ring-inset bg-primary/5"
        )}
        {...getRowProps(index)}
      >
        <div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onToggleRowExpand(declaration.id)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        <div>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelectItem(declaration.id)}
          />
        </div>
        <div className="font-medium font-mono text-xs truncate">{declaration.id}</div>
        <div className="text-sm">{declaration.type}</div>
        <div className="text-sm truncate">{declaration.sender?.username || t('unknown')}</div>
        <div className="font-mono text-xs">{declaration.archive_number || '-'}</div>
        <div>
          <StatusQuickAction
            declarationId={declaration.id}
            currentStatus={declaration.status}
            onStatusChange={onStatusChange}
          />
        </div>
        <div className="text-xs">{toGregorianDate(declaration.created_at)}</div>
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7"
            onClick={() => navigate(`/declaration/${declaration.id}`)}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {(user?.role === 'admin' || (user?.role === 'manager' && declaration.sender_id === user.id)) && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(declaration)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }, [selectedItems, expandedRows, focusedIndex, getRowProps, onToggleRowExpand, onToggleSelectItem, onStatusChange, onDelete, navigate, user, t]);

  return (
    <Card className="glass-card border-border/50 overflow-hidden">
      {/* Toolbar with keyboard hints, virtual scrolling toggle, and export */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Virtual scrolling toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Switch
                    id="virtual-scroll"
                    checked={useVirtualScrolling}
                    onCheckedChange={setUseVirtualScrolling}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="virtual-scroll" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('virtualScrolling')}</span>
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{t('virtualScrollingHint')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          {/* Export toolbar */}
          <ExportToolbar 
            declarations={displayedDeclarations} 
            totalCount={totalCount}
            disabled={loading || declarations.length === 0}
          />

          {/* Keyboard shortcuts hint */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Keyboard className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">{t('keyboardShortcuts')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p><kbd className="px-1 bg-muted rounded">↑↓</kbd> {t('navigateRows')}</p>
                  <p><kbd className="px-1 bg-muted rounded">Enter</kbd> {t('viewDetailsKey')}</p>
                  <p><kbd className="px-1 bg-muted rounded">Space</kbd> {t('selectRow')}</p>
                  <p><kbd className="px-1 bg-muted rounded">E</kbd> {t('expandRow')}</p>
                  <p><kbd className="px-1 bg-muted rounded">Del</kbd> {t('deleteRow')}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Virtual scrolling mode */}
      {useVirtualScrolling && !loading && declarations.length > 0 ? (
        <div>
          {/* Virtual header */}
          <div className="grid grid-cols-[2rem_2rem_1fr_4rem_6rem_6rem_1fr_6rem_4rem] gap-2 items-center px-4 py-3 bg-muted/30 border-b border-border/30 text-xs font-medium text-muted-foreground">
            <div></div>
            <div>
              <Checkbox
                checked={selectedItems.length === declarations.length && declarations.length > 0}
                onCheckedChange={onToggleSelectAll}
              />
            </div>
            <div>{t('declarationId')}</div>
            <div>{t('type')}</div>
            <div>{t('sender')}</div>
            <div>{t('archiveNumber')}</div>
            <div>{t('status')}</div>
            <div>{t('createdDate')}</div>
            <div>{t('actions')}</div>
          </div>
          
          {/* Virtualized list */}
          <div 
            ref={tableContainerRef}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            className="focus:outline-none"
          >
            <VirtualizedList
              items={displayedDeclarations}
              itemHeight={VIRTUAL_ROW_HEIGHT}
              containerHeight={Math.min(displayedDeclarations.length * VIRTUAL_ROW_HEIGHT, 520)}
              renderItem={renderVirtualRow}
              overscan={5}
              emptyMessage={t('noDeclarations')}
            />
          </div>
        </div>
      ) : (
        /* Standard table mode */
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedItems.length === declarations.length && declarations.length > 0}
                onCheckedChange={onToggleSelectAll}
                aria-label={t('selectAll')}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t('declarationId')}
                column="id"
                currentSort={sortConfig}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t('type')}
                column="type"
                currentSort={sortConfig}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t('sender')}
                column="sender"
                currentSort={sortConfig}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t('archiveNumber')}
                column="archive_number"
                currentSort={sortConfig}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t('status')}
                column="status"
                currentSort={sortConfig}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t('createdDate')}
                column="created_at"
                currentSort={sortConfig}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead>{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody 
          onKeyDown={handleKeyDown}
          role="rowgroup"
          tabIndex={0}
          className="focus:outline-none"
        >
          {loading ? (
            <TableSkeleton rows={10} columns={9} />
          ) : declarations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                <EmptyState
                  variant="search"
                  title={hasActiveFilters ? t('noDeclarationsFound') : t('noDeclarations')}
                  description={hasActiveFilters ? t('tryAdjustingFilters') : t('noRecentDeclarations')}
                  actionLabel={hasActiveFilters ? t('clearFilters') : t('createDeclaration')}
                  onAction={hasActiveFilters ? onClearFilters : onCreateNew}
                />
              </TableCell>
            </TableRow>
          ) : (
            displayedDeclarations.map((declaration, index) => (
              <Collapsible key={declaration.id} asChild open={expandedRows.includes(declaration.id)}>
                <>
                  <TableRow 
                    className={cn(
                      "hover:bg-muted/5 cursor-pointer transition-all",
                      focusedIndex === index && "ring-2 ring-primary/50 ring-inset bg-primary/5"
                    )}
                    {...getRowProps(index)}
                  >
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onToggleRowExpand(declaration.id)}
                          aria-label={expandedRows.includes(declaration.id) ? 'Collapse row' : 'Expand row'}
                        >
                          {expandedRows.includes(declaration.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(declaration.id)}
                        onCheckedChange={() => onToggleSelectItem(declaration.id)}
                        aria-label={`Select declaration ${declaration.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium font-mono text-sm">{declaration.id}</TableCell>
                    <TableCell>{declaration.type}</TableCell>
                    <TableCell>{declaration.sender?.username || t('unknown')}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {declaration.archive_number || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <StatusQuickAction
                        declarationId={declaration.id}
                        currentStatus={declaration.status}
                        onStatusChange={onStatusChange}
                      />
                    </TableCell>
                    <TableCell>{toGregorianDate(declaration.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/declaration/${declaration.id}`)}
                          aria-label={`${t('view')} ${declaration.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(user?.role === 'admin' || (user?.role === 'manager' && declaration.sender_id === user.id)) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(declaration)}
                            aria-label={`${t('delete')} ${declaration.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <tr>
                      <td colSpan={9} className="p-0">
                        <DeclarationRowExpand declarationId={declaration.id} />
                      </td>
                    </tr>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))
          )}
        </TableBody>
        </Table>
      )}
      
      {/* Pagination */}
      {totalCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </Card>
  );
}
