import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toGregorianDateTime } from '@/utils/dateUtils';
import { ExternalLink, Clock, User, FileText, Phone, StickyNote } from 'lucide-react';

interface DeclarationDetails {
  id: string;
  type: string;
  status: string;
  notes: string | null;
  phone: string | null;
  archive_number: string | null;
  created_at: string;
  updated_at: string;
  sender?: { username: string; email: string };
  archive_file?: { archive_number: string; description: string | null };
  statusHistory?: Array<{
    id: string;
    old_status: string | null;
    new_status: string;
    changed_at: string;
    profiles?: { username: string };
  }>;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
  pending_warehouse_signature: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  warehouse_signed: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  sent_to_admin_office: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  received_by_admin_office: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  returned_to_warehouse: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  archived: 'bg-green-500/20 text-green-700 dark:text-green-300',
  rejected: 'bg-red-500/20 text-red-700 dark:text-red-300',
};

interface DeclarationRowExpandProps {
  declarationId: string;
}

export function DeclarationRowExpand({ declarationId }: DeclarationRowExpandProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [details, setDetails] = useState<DeclarationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [declarationId]);

  const loadDetails = async () => {
    try {
      const [declarationResult, historyResult] = await Promise.all([
        supabase
          .from('declarations')
          .select(`
            *,
            sender:profiles!sender_id(username, email),
            archive_file:archive_files(archive_number, description)
          `)
          .eq('id', declarationId)
          .single(),
        supabase
          .from('declaration_status_history')
          .select(`
            id,
            old_status,
            new_status,
            changed_at,
            profiles:profiles!declaration_status_history_changed_by_fkey(username)
          `)
          .eq('declaration_id', declarationId)
          .order('changed_at', { ascending: false })
          .limit(5)
      ]);

      if (declarationResult.error) throw declarationResult.error;

      setDetails({
        ...declarationResult.data,
        statusHistory: historyResult.data || [],
      });
    } catch (error) {
      console.error('Error loading declaration details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-muted/30 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-4 bg-muted/30 text-center text-muted-foreground">
        {t('error')}
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/30 border-t border-border/50 space-y-4">
      {/* Quick Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            {t('sender')}
          </div>
          <div className="text-sm font-medium">{details.sender?.username}</div>
          <div className="text-xs text-muted-foreground">{details.sender?.email}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {t('createdDate')}
          </div>
          <div className="text-sm">{toGregorianDateTime(details.created_at)}</div>
        </div>

        {details.phone && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {t('phone')}
            </div>
            <div className="text-sm font-mono">{details.phone}</div>
          </div>
        )}

        {details.archive_file && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              {t('archiveFile')}
            </div>
            <div className="text-sm">{details.archive_file.archive_number}</div>
          </div>
        )}
      </div>

      {/* Notes */}
      {details.notes && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <StickyNote className="w-3 h-3" />
            {t('notes')}
          </div>
          <div className="text-sm bg-background/50 rounded p-2">{details.notes}</div>
        </div>
      )}

      {/* Status Timeline (Mini) */}
      {details.statusHistory && details.statusHistory.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{t('recentStatusChanges')}</div>
          <div className="flex flex-wrap gap-2">
            {details.statusHistory.slice(0, 3).map((history) => (
              <div key={history.id} className="flex items-center gap-1 text-xs">
                {history.old_status && (
                  <>
                    <Badge variant="outline" className={`${statusColors[history.old_status]} text-xs py-0`}>
                      {t(history.old_status)}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                <Badge variant="outline" className={`${statusColors[history.new_status]} text-xs py-0`}>
                  {t(history.new_status)}
                </Badge>
                <span className="text-muted-foreground ms-1">
                  ({(history.profiles as any)?.username})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border/30">
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/declaration/${declarationId}`)}
          className="gap-2"
        >
          <ExternalLink className="w-3 h-3" />
          {t('viewFullDetails')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/declaration/${declarationId}/timeline`)}
        >
          {t('viewTimeline')}
        </Button>
      </div>
    </div>
  );
}
