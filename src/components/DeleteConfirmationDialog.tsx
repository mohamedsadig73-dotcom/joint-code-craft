import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { toHijriDate } from '@/utils/dateUtils';

interface Declaration {
  id: string;
  type: 'دخول' | 'خروج';
  sender?: { username: string };
  status: string;
  archive_number: string | null;
  created_at: string;
}

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  declaration: Declaration | null;
  onConfirm: () => void;
  userRole?: 'admin' | 'manager' | 'user';
}

const statusColors = {
  draft: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  pending_warehouse_signature: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  warehouse_signed: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  sent_to_admin_office: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  received_by_admin_office: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  returned_to_warehouse: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  archived: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
};

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  declaration,
  onConfirm,
  userRole,
}: DeleteConfirmationDialogProps) {
  const { t } = useLanguage();

  if (!declaration) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-right">
            تأكيد حذف الإقرار
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right space-y-4">
            <div className="text-base text-foreground">
              هل أنت متأكد من حذف هذا الإقرار؟
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-right">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">رقم الإقرار:</span>
                <span className="font-mono text-sm">{declaration.id}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">النوع:</span>
                <Badge variant="outline">{declaration.type}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">المرسل:</span>
                <span>{declaration.sender?.username || 'غير معروف'}</span>
              </div>
              
              {declaration.archive_number && (
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">رقم الأرشفة:</span>
                  <span className="font-mono text-sm">{declaration.archive_number}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">الحالة:</span>
                <Badge className={statusColors[declaration.status as keyof typeof statusColors]}>
                  {t(declaration.status)}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">تاريخ الإنشاء:</span>
                <span className="text-sm">
                  {toHijriDate(declaration.created_at)}
                </span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
              📦 سيتم نقل الإقرار إلى سلة المحذوفات ويمكن استرجاعه خلال 30 يوم
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            حذف الإقرار
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
