import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Send } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
}

export function BulkNotificationDialog() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    declarationId: '',
  });

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email')
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('failedToLoadUsers'),
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('selectUsersRequired'),
      });
      return;
    }

    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('fillRequiredFields'),
      });
      return;
    }

    setLoading(true);

    try {
      // Create notifications for all selected users
      const notifications = selectedUsers.map(userId => ({
        user_id: userId,
        declaration_id: formData.declarationId || 'BULK-NOTIFICATION',
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        read: false,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast({
        title: t('success'),
        description: `${selectedUsers.length} ${t('notificationsSent')}`,
      });

      // Reset form
      setFormData({
        title: '',
        message: '',
        type: 'info',
        declarationId: '',
      });
      setSelectedUsers([]);
      setSelectAll(false);
      setOpen(false);
    } catch (error: any) {
      console.error('Error sending notifications:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('notificationsFailed'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show for admins and managers
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Bell className="w-4 h-4" />
          {t('sendBulkNotification')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('sendBulkNotification')}</DialogTitle>
          <DialogDescription>
            {t('chooseUsersAndSend')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="title">{t('notificationTitle')} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('enterNotificationTitle')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{t('notificationMessage')} *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t('enterNotificationMessage')}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t('notificationType')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">{t('notificationInfo')}</SelectItem>
                    <SelectItem value="success">{t('notificationSuccess')}</SelectItem>
                    <SelectItem value="warning">{t('notificationWarning')}</SelectItem>
                    <SelectItem value="error">{t('notificationError')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="declarationId">{t('relatedDeclarationId')}</Label>
                <Input
                  id="declarationId"
                  value={formData.declarationId}
                  onChange={(e) => setFormData({ ...formData, declarationId: e.target.value })}
                  placeholder={t('declarationNumber')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('targetUsers')} ({selectedUsers.length})</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer">
                    {t('selectAllUsers')}
                  </Label>
                </div>
              </div>

              <ScrollArea className="h-48 border rounded-md p-4">
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`user-${u.id}`}
                        checked={selectedUsers.includes(u.id)}
                        onCheckedChange={() => handleUserToggle(u.id)}
                      />
                      <Label
                        htmlFor={`user-${u.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{u.username}</span>
                          <span className="text-sm text-muted-foreground">{u.email}</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Send className="w-4 h-4" />
              {loading ? t('sendingNotifications') : t('sendNotifications')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
