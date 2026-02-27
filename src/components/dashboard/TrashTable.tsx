import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toGregorianDate } from '@/utils/dateUtils';
import { statusLabels, statusColors } from '@/constants/statusLabels';
import { DeletedDeclaration } from '@/types/declarations';

interface TrashTableProps {
  declarations: DeletedDeclaration[];
  loading: boolean;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export function TrashTable({
  declarations, loading, onRestore, onPermanentDelete,
}: TrashTableProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const getDaysRemaining = (deletedAt: string) => {
    const daysPassed = differenceInDays(new Date(), new Date(deletedAt));
    return Math.max(0, 30 - daysPassed);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info Card */}
      <Card className="glass-card border-border/50 p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="text-sm space-y-1">
            <p className="text-foreground font-medium">
              {language === 'ar' ? 'معلومات مهمة عن سلة المحذوفات:' : 'Important information about trash:'}
            </p>
            <ul className="text-muted-foreground space-y-1 mr-4">
              <li>• {language === 'ar' ? 'يمكن استرجاع الإقرارات المحذوفة خلال 30 يوم من تاريخ الحذف' : 'Deleted declarations can be restored within 30 days'}</li>
              <li>• {language === 'ar' ? 'بعد 30 يوم، سيتم حذف الإقرار نهائياً بشكل تلقائي' : 'After 30 days, declarations will be permanently deleted'}</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Trash Table */}
      <Card className="glass-card border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('declarationId')}</TableHead>
              <TableHead>{t('type')}</TableHead>
              <TableHead>{t('sender')}</TableHead>
              <TableHead>{t('archiveNumber')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{language === 'ar' ? 'تاريخ الحذف' : 'Deleted Date'}</TableHead>
              <TableHead>{language === 'ar' ? 'الأيام المتبقية' : 'Days Remaining'}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={5} columns={8} />
            ) : declarations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <EmptyState
                    variant="trash"
                    title={language === 'ar' ? 'سلة المحذوفات فارغة' : 'Trash is empty'}
                    description={language === 'ar' ? 'لا توجد إقرارات محذوفة حالياً' : 'No deleted declarations currently'}
                  />
                </TableCell>
              </TableRow>
            ) : (
              declarations.map((declaration) => {
                const daysRemaining = getDaysRemaining(declaration.deleted_at);
                const isUrgent = daysRemaining <= 7;
                
                return (
                  <TableRow key={declaration.id} className="hover:bg-muted/5">
                    <TableCell className="font-medium font-mono text-sm">{declaration.id}</TableCell>
                    <TableCell>{declaration.type}</TableCell>
                    <TableCell>{declaration.sender?.username || t('unknown')}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {declaration.archive_number || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[declaration.status]}>
                        {statusLabels[declaration.status] || declaration.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{toGregorianDate(declaration.deleted_at)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={isUrgent ? 'border-red-500/50 text-red-700 dark:text-red-300' : ''}
                      >
                        {daysRemaining} {language === 'ar' ? (daysRemaining === 1 ? 'يوم' : 'أيام') : (daysRemaining === 1 ? 'day' : 'days')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/declaration/${declaration.id}`)}
                          aria-label={`${t('view')} ${declaration.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(user?.role === 'admin' || (user?.role === 'manager' && declaration.sender_id === user.id)) && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-green-600 hover:text-green-700 dark:text-green-400"
                              onClick={() => onRestore(declaration.id)}
                              aria-label={language === 'ar' ? 'استرجاع' : 'Restore'}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            {user?.role === 'admin' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => onPermanentDelete(declaration.id)}
                                aria-label={language === 'ar' ? 'حذف نهائي' : 'Permanently delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
