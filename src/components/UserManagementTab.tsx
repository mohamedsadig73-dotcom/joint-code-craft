import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Users, RefreshCw, UserPlus, Trash2, Info, Mail } from 'lucide-react';
import { toHijriDateTime } from '@/utils/dateUtils';

interface UserWithRole {
  id: string;
  username: string;
  email: string;
  created_at: string;
  role: 'admin' | 'manager' | 'user';
}

const rolePermissions = {
  admin: {
    labelKey: 'systemAdmin',
    color: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
    permissionsKeys: [
      'viewAllDeclarations',
      'createEditDeleteDeclarations',
      'changeAnyDeclarationStatus',
      'manageAllUsers',
      'addDeleteUsers',
      'changeUserPermissions',
      'viewReportsStatistics',
      'fullSystemAccess',
    ],
  },
  manager: {
    labelKey: 'subManager',
    color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
    permissionsKeys: [
      'viewAllDeclarations',
      'createEditDeclarations',
      'changeAllDeclarationStatus',
      'viewUserInformation',
      'viewReportsStatistics',
    ],
  },
  user: {
    labelKey: 'regularUser',
    color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    permissionsKeys: [
      'viewAllDeclarations',
      'createNewDeclarations',
      'editOwnDeclarations',
      'changeOwnDeclarationStatus',
      'viewOwnProfile',
    ],
  },
};

export function UserManagementTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'user',
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'manager' | 'user') => {
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast({
        title: t('success'),
        description: t('userRoleUpdated'),
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('fillAllFields'),
      });
      return;
    }

    setCreating(true);
    try {
      // Send invitation via edge function
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: newUserEmail,
          role: newUserRole,
          invitedBy: user?.username || user?.email || 'Admin',
        },
      });

      if (error) {
        throw new Error(error.message || 'فشل إرسال الدعوة');
      }

      toast({
        title: t('success'),
        description: 'تم إرسال الدعوة بنجاح إلى ' + newUserEmail,
      });

      setNewUserEmail('');
      setNewUserRole('user');
      setAddDialogOpen(false);

      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message || t('userCreationFailed'),
      });
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete);

      if (roleError) throw roleError;

      toast({
        title: t('success'),
        description: t('permissionsDeleted'),
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Permissions Guide */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            {t('permissionsGuide')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(rolePermissions).map(([role, info]) => (
              <div key={role} className="space-y-3">
                <Badge className={info.color}>{t(info.labelKey)}</Badge>
                <ul className="space-y-2 text-sm">
                  {info.permissionsKeys.map((permissionKey, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-muted-foreground">{t(permissionKey)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('usersCount')} ({users.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadUsers}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('refresh')}
              </Button>
              
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('addUser')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('addNewUser')}</DialogTitle>
                    <DialogDescription>
                      {t('invitationDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <Label htmlFor="email">{t('email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                      />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('invitationDescription')}
                        </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="role">{t('role')}</Label>
                      <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <div className="flex items-center gap-2">
                              <Badge className={rolePermissions.user.color}>
                                {t(rolePermissions.user.labelKey)}
                              </Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="manager">
                            <div className="flex items-center gap-2">
                              <Badge className={rolePermissions.manager.color}>
                                {t(rolePermissions.manager.labelKey)}
                              </Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Badge className={rolePermissions.admin.color}>
                                {t(rolePermissions.admin.labelKey)}
                              </Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 text-primary" />
                        <div className="text-sm">
                          <p className="font-medium">{t('howItWorks')}</p>
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
                            <li>{t('invitationStep1')}</li>
                            <li>{t('invitationStep2')}</li>
                            <li>{t('invitationStep3')}</li>
                            <li>{t('invitationStep4')}</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAddDialogOpen(false)}
                        disabled={creating}
                      >
                        {t('cancel')}
                      </Button>
                      <Button type="submit" disabled={creating}>
                        {creating ? t('sending') : t('sendInvitation')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('username')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('creationDate')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userData) => (
                <TableRow key={userData.id}>
                  <TableCell className="font-medium">{userData.username}</TableCell>
                  <TableCell>{userData.email}</TableCell>
                  <TableCell>
                    <Select
                      value={userData.role}
                      onValueChange={(value: any) => handleRoleChange(userData.id, value)}
                      disabled={userData.id === user?.id}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue>
                          <Badge className={rolePermissions[userData.role].color}>
                            {t(rolePermissions[userData.role].labelKey)}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          <Badge className={rolePermissions.user.color}>
                            {t(rolePermissions.user.labelKey)}
                          </Badge>
                        </SelectItem>
                        <SelectItem value="manager">
                          <Badge className={rolePermissions.manager.color}>
                            {t(rolePermissions.manager.labelKey)}
                          </Badge>
                        </SelectItem>
                        <SelectItem value="admin">
                          <Badge className={rolePermissions.admin.color}>
                            {t(rolePermissions.admin.labelKey)}
                          </Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {toHijriDateTime(userData.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUserToDelete(userData.id);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={userData.id === user?.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteRoleWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive">
              {t('deletePermissions')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
