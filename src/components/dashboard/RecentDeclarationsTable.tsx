import { useNavigate } from 'react-router-dom';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { StatusQuickAction } from '@/components/declarations/StatusQuickAction';
import { DeclarationRowExpand } from '@/components/declarations/DeclarationRowExpand';
import { useLanguage } from '@/contexts/LanguageContext';
import { toGregorianDate } from '@/utils/dateUtils';
import { Declaration } from '@/types/declarations';

interface RecentDeclarationsTableProps {
  declarations: Declaration[];
  loading: boolean;
  expandedRows: string[];
  onToggleRowExpand: (id: string) => void;
  onStatusChange: () => void;
  onCreateNew: () => void;
  onViewAll: () => void;
  totalCount: number;
}

export function RecentDeclarationsTable({
  declarations,
  loading,
  expandedRows,
  onToggleRowExpand,
  onStatusChange,
  onCreateNew,
  onViewAll,
  totalCount,
}: RecentDeclarationsTableProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="glass-card border-border/50 p-6">
          <h3 className="text-base font-semibold mb-4">{t('recentDeclarations')}</h3>
          {loading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>{t('declarationId')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('sender')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('createdDate')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton rows={5} columns={7} />
              </TableBody>
            </Table>
          ) : declarations.length === 0 ? (
            <EmptyState
              variant="declarations"
              title={t('noDeclarations')}
              description={language === 'ar' ? 'لم يتم إنشاء أي إقرارات بعد. ابدأ بإنشاء إقرار جديد.' : 'No declarations created yet. Start by creating a new one.'}
              actionLabel={t('createDeclaration')}
              onAction={onCreateNew}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>{t('declarationId')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('sender')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('createdDate')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.slice(0, 5).map((declaration) => (
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
                          <TableCell className="font-medium font-mono text-sm">{declaration.id}</TableCell>
                          <TableCell>{declaration.type}</TableCell>
                          <TableCell>{declaration.sender?.username || t('unknown')}</TableCell>
                          <TableCell>
                            <StatusQuickAction
                              declarationId={declaration.id}
                              currentStatus={declaration.status}
                              onStatusChange={onStatusChange}
                            />
                          </TableCell>
                          <TableCell>{toGregorianDate(declaration.created_at)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/declaration/${declaration.id}`)}
                              aria-label={`${t('view')} ${declaration.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={7} className="p-0">
                              <DeclarationRowExpand declarationId={declaration.id} />
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
              {totalCount > 5 && (
                <div className="mt-4 text-center">
                  <Button variant="link" onClick={onViewAll}>
                    {t('viewAll')} ({totalCount})
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
