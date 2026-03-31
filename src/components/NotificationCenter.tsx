import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toGregorianDateTime } from '@/utils/dateUtils';

interface Notification {
  id: string;
  user_id: string;
  declaration_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasFetchedRef = useRef(false);

  const userId = user?.id;
  const userRole = user?.role;
  const isRTL = language === 'ar';

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      let query = supabase.from('notifications').select('*');
      if (userRole !== 'admin' && userRole !== 'manager') {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Fetch unread count only on mount (lightweight)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fetchCount = async () => {
      try {
        let query = supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
        if (userRole !== 'admin' && userRole !== 'manager') {
          query = query.eq('user_id', userId);
        }
        const { count, error } = await query;
        if (!error && !cancelled) {
          setUnreadCount(count || 0);
        }
      } catch { /* ignore */ }
    };
    fetchCount();
    return () => { cancelled = true; };
  }, [userId, userRole]);

  // Lazy-load full notifications on first open
  const handleOpenChange = useCallback((open: boolean) => {
    if (open && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadNotifications();
    }
  }, [loadNotifications]);

  const markAsRead = useCallback(async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const ids = notifications.filter(n => !n.read).map(n => n.id);
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', ids);
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: t('success'), description: t('allNotificationsRead') });
    } catch {
      toast({ variant: 'destructive', title: t('error'), description: t('updateFailed') });
    }
  }, [notifications, t, toast]);

  const deleteNotification = useCallback(async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast({ title: t('success'), description: t('notificationDeleted') });
    } catch {
      toast({ variant: 'destructive', title: t('error'), description: t('deleteFailed') });
    }
  }, [notifications, t, toast]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    navigate(`/declaration/${notification.declaration_id}`);
  }, [markAsRead, navigate]);

  const notificationItems = useMemo(() => {
    if (loading) {
      return (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      );
    }
    if (notifications.length === 0) {
      return (
        <div className="p-8 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">{t('noNotifications')}</p>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`relative p-3 hover:bg-accent cursor-pointer transition-colors ${!notification.read ? 'bg-primary/5' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">{notification.title}</p>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{toGregorianDateTime(notification.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {!notification.read && (
                    <Button variant="ghost" size="sm" onClick={(e) => markAsRead(notification.id, e)} className="h-6 text-xs gap-1">
                      <Check className="w-3 h-3" />
                      {t('markRead')}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={(e) => deleteNotification(notification.id, e)} className="h-6 text-xs gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                    {t('delete')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [loading, notifications, t, handleNotificationClick, markAsRead, deleteNotification]);

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -end-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-80">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-semibold">{t('notifications')}</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs">
              {t('markAllRead')}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notificationItems}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
