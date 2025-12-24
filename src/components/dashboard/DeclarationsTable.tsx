import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableSkeleton, CardSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SwipeableRow } from '@/components/SwipeableRow';
import { StatusQuickAction } from '@/components/declarations/StatusQuickAction';
import { DeclarationRowExpand } from '@/components/declarations/DeclarationRowExpand';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toGregorianDate } from '@/utils/dateUtils';
import { Declaration } from '@/types/declarations';

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
}: DeclarationsTableProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
          declarations.map((declaration) => (
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
          ))
        )}
      </div>
    );
  }

  return (
    <Card className="glass-card border-border/50 overflow-hidden">
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
            <TableHead>{t('declarationId')}</TableHead>
            <TableHead>{t('type')}</TableHead>
            <TableHead>{t('sender')}</TableHead>
            <TableHead>{t('archiveNumber')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('createdDate')}</TableHead>
            <TableHead>{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
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
            declarations.map((declaration) => (
              <Collapsible key={declaration.id} asChild open={expandedRows.includes(declaration.id)}>
                <>
                  <TableRow className="hover:bg-muted/5">
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
    </Card>
  );
}
