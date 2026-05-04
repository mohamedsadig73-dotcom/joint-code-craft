import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { toGregorianDate } from '@/utils/dateUtils';
import { StandardModal } from '@/components/ui/StandardModal';
import { StandardAlert } from '@/components/ui/StandardForm';
import { Trash2 } from 'lucide-react';

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
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title="تأكيد حذف الإقرار"
      size="sm"
      submitLabel="حذف الإقرار"
      submitVariant="destructive"
      onSubmit={onConfirm}
    >
      <div className="space-y-4">
        <StandardAlert tone="danger">
          <span className="font-medium">هل أنت متأكد من حذف هذا الإقرار؟</span>
        </StandardAlert>

        <div className="rounded-md border border-[hsl(var(--wms-border))] bg-[hsl(var(--wms-bg3))] divide-y divide-[hsl(var(--wms-border))]">
          <DetailRow label="رقم الإقرار" value={<span className="font-mono text-[hsl(var(--wms-accent))]">{declaration.id}</span>} />
          <DetailRow label="النوع" value={<Badge variant="outline">{declaration.type}</Badge>} />
          <DetailRow label="المرسل" value={<span>{declaration.sender?.username || 'غير معروف'}</span>} />
          {declaration.archive_number && (
            <DetailRow label="رقم الأرشفة" value={<span className="font-mono">{declaration.archive_number}</span>} />
          )}
          <DetailRow label="الحالة" value={
            <Badge className={statusColors[declaration.status as keyof typeof statusColors]}>
              {t(declaration.status)}
            </Badge>
          } />
          <DetailRow label="تاريخ الإنشاء" value={<span className="text-sm">{toGregorianDate(declaration.created_at)}</span>} />
        </div>

        <StandardAlert tone="info">
          <Trash2 className="inline w-3.5 h-3.5 me-1" />
          سيتم نقل الإقرار إلى سلة المحذوفات ويمكن استرجاعه خلال 30 يوم
        </StandardAlert>
      </div>
    </StandardModal>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 text-[13px]">
      <span className="text-[hsl(var(--wms-text3))] font-medium">{label}</span>
      <span className="text-[hsl(var(--wms-text))]">{value}</span>
    </div>
  );
}
