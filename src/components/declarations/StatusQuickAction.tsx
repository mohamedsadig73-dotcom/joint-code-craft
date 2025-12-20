import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';

type DeclarationStatus = 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected';

const statusColors: Record<DeclarationStatus, string> = {
  draft: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  pending_warehouse_signature: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  warehouse_signed: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  sent_to_admin_office: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  received_by_admin_office: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  returned_to_warehouse: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  archived: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
};

// Map database status keys to translation keys
const statusTranslationKeys: Record<DeclarationStatus, string> = {
  draft: 'draft',
  pending_warehouse_signature: 'pendingWarehouseSignature',
  warehouse_signed: 'warehouseSigned',
  sent_to_admin_office: 'sentToAdminOffice',
  received_by_admin_office: 'receivedByAdminOffice',
  returned_to_warehouse: 'returnedToWarehouse',
  archived: 'archived',
  rejected: 'rejected',
};

const statusOrder: DeclarationStatus[] = [
  'draft',
  'pending_warehouse_signature',
  'warehouse_signed',
  'sent_to_admin_office',
  'received_by_admin_office',
  'returned_to_warehouse',
  'archived',
  'rejected',
];

interface StatusQuickActionProps {
  declarationId: string;
  currentStatus: DeclarationStatus;
  onStatusChange?: () => void;
  disabled?: boolean;
}

export function StatusQuickAction({ 
  declarationId, 
  currentStatus, 
  onStatusChange,
  disabled = false 
}: StatusQuickActionProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getStatusLabel = (status: DeclarationStatus) => {
    return t(statusTranslationKeys[status]);
  };

  const handleStatusChange = async (newStatus: DeclarationStatus) => {
    if (newStatus === currentStatus) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ status: newStatus })
        .eq('id', declarationId);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('statusUpdated'),
      });

      onStatusChange?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={disabled || loading} asChild>
        <button className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
          <Badge className={`${statusColors[currentStatus]} ${loading ? 'animate-pulse' : ''}`}>
            {getStatusLabel(currentStatus)}
          </Badge>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('updateStatus')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statusOrder.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className="flex items-center justify-between"
          >
            <Badge className={statusColors[status]} variant="outline">
              {getStatusLabel(status)}
            </Badge>
            {status === currentStatus && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
