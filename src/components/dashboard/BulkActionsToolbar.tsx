import { useState } from 'react';
import { Trash2, RefreshCw, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { statusLabels, statusLabelsEn } from '@/constants/statusLabels';
import type { Database } from '@/integrations/supabase/types';

type DeclarationStatus = Database['public']['Enums']['declaration_status'];

interface BulkActionsToolbarProps {
  selectedItems: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

const STATUS_OPTIONS: DeclarationStatus[] = [
  'draft',
  'pending_warehouse_signature',
  'warehouse_signed',
  'sent_to_admin_office',
  'received_by_admin_office',
  'returned_to_warehouse',
  'archived',
  'rejected',
];

export function BulkActionsToolbar({
  selectedItems,
  onClearSelection,
  onActionComplete,
}: BulkActionsToolbarProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DeclarationStatus | ''>('');

  const handleBulkStatusChange = async (status: DeclarationStatus) => {
    if (selectedItems.length === 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', selectedItems)
        .is('deleted_at', null);

      if (error) throw error;

      const statusLabel = language === 'ar' ? statusLabels[status] : statusLabelsEn[status];
      toast({
        title: t('success'),
        description: `${t('bulkStatusChanged')}: ${selectedItems.length} → ${statusLabel}`,
      });

      onClearSelection();
      onActionComplete();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setSelectedStatus('');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id 
        })
        .in('id', selectedItems)
        .is('deleted_at', null);

      if (error) throw error;

      toast({
        title: t('success'),
        description: `${t('bulkDeleted')}: ${selectedItems.length}`,
      });

      onClearSelection();
      onActionComplete();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  if (selectedItems.length === 0) return null;

  const labels = language === 'ar' ? statusLabels : statusLabelsEn;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-card border-primary/30 bg-primary/5 p-3 flex items-center gap-3 rounded-lg flex-wrap"
      >
        {/* Selected count */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary">
            {selectedItems.length} {t('selected')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClearSelection}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border/50" />

        {/* Bulk status change */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value as DeclarationStatus);
              if (value) {
                handleBulkStatusChange(value as DeclarationStatus);
              }
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder={t('changeStatusTo')} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status} className="text-xs">
                  {labels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>

        <div className="h-6 w-px bg-border/50" />

        {/* Bulk delete */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('deleteSelected')}</span>
          </Button>
        )}
      </motion.div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmBulkDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulkDeleteWarning').replace('{count}', String(selectedItems.length))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
