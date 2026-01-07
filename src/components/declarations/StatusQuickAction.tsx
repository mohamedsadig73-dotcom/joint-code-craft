import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { statusColors, getDynamicStatusLabel } from '@/constants/statusLabels';
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
type DeclarationType = 'entrance' | 'exit';

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
  declarationType?: DeclarationType;
  onStatusChange?: () => void;
  disabled?: boolean;
}

export function StatusQuickAction({ 
  declarationId, 
  currentStatus, 
  declarationType,
  onStatusChange,
  disabled = false 
}: StatusQuickActionProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isArabic = language === 'ar';

  const getStatusLabel = (status: DeclarationStatus) => {
    return getDynamicStatusLabel(status, declarationType, isArabic);
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
          <Badge className={`${statusColors[currentStatus] || 'bg-muted text-muted-foreground'} ${loading ? 'animate-pulse' : ''}`}>
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
            <Badge className={statusColors[status] || 'bg-muted text-muted-foreground'} variant="outline">
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
