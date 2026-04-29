import { useState, useEffect, useCallback } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { 
  Users, RefreshCw, UserPlus, Trash2, Info, AlertTriangle, 
  UserX, UserCheck, ShieldAlert, FileText, Activity 
} from 'lucide-react';
import { toGregorianDate } from '@/utils/dateUtils';

interface UserWithRole {
  id: string;
  username: string;
  email: string;
  created_at: string;
  is_active: boolean;
  role: 'admin' | 'manager' | 'storekeeper' | 'user' | 'viewer';
}

interface LinkedDataInfo {
  has_data: boolean;
  declarations: number;
  audit_logs: number;
  status_history: number;
  maintenance: number;
  petty_cash: number;
  leave_requests: number;
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
  const [linkedDataDialogOpen, setLinkedDataDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [linkedDataInfo, setLinkedDataInfo] = useState<LinkedDataInfo | null>(null);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user, showInactiveUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter based on active status toggle
      if (!showInactiveUsers) {
        query = query.eq('is_active', true);
      }

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          is_active: profile.is_active ?? true,
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
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: newUserEmail,
          role: newUserRole,
          invitedBy: user?.username || user?.email || 'Admin',
        },
      });

      if (error) {
        const errorMessage = error.message || (data as any)?.message || 'فشل إرسال الدعوة';
        throw new Error(errorMessage);
      }

      if (data && (data as any).error) {
        throw new Error((data as any).message || 'فشل إرسال الدعوة');
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

  // Check if current user can manage another user
  const canManageUser = useCallback((targetUserId: string, targetRole: string) => {
    if (user?.role !== 'admin') return false;
    if (targetUserId === user?.id) return false;
    // Admin can manage all except themselves
    return true;
  }, [user]);

  // Check linked data for a user
  const checkLinkedData = async (userId: string): Promise<LinkedDataInfo | null> => {
    try {
      const { data, error } = await supabase.rpc('check_user_has_linked_data', {
        target_user_id: userId
      });
      
      if (error) throw error;
      return data as unknown as LinkedDataInfo;
    } catch (error) {
      console.error('Error checking linked data:', error);
      return null;
    }
  };

  // Handle delete button click
  const handleDeleteClick = async (userId: string) => {
    setUserToDelete(userId);
    setActionLoading(userId);
    
    const linkedData = await checkLinkedData(userId);
    setLinkedDataInfo(linkedData);
    setActionLoading(null);
    
    if (linkedData?.has_data) {
      setLinkedDataDialogOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
  };

  // Deactivate user (soft delete)
  const handleDeactivateUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.rpc('deactivate_user', {
        target_user_id: userId
      });
      
      if (error) throw error;
      
      toast({
        title: t('success'),
        description: t('userDeactivated'),
      });
      
      setLinkedDataDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message,
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Reactivate user
  const handleReactivateUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.rpc('reactivate_user', {
        target_user_id: userId
      });
      
      if (error) throw error;
      
      toast({
        title: t('success'),
        description: t('userReactivated'),
      });
      
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message,
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Hard delete user (only if no linked data)
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    if (!canManageUser(userToDelete, '')) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: user?.id === userToDelete 
          ? t('cannotDeleteSelf')
          : t('notAuthorizedToDelete'),
      });
      setDeleteDialogOpen(false);
      return;
    }

    setActionLoading(userToDelete);
    try {
      const { data, error } = await supabase.rpc('hard_delete_user', {
        target_user_id: userToDelete
      });
      
      if (error) throw error;
      
      const result = data as unknown as { success: boolean; reason?: string; linked_data?: LinkedDataInfo };
      
      if (!result.success) {
        setLinkedDataInfo(result.linked_data || null);
        setDeleteDialogOpen(false);
        setLinkedDataDialogOpen(true);
        return;
      }

      setUsers(prev => prev.filter(u => u.id !== userToDelete));

      toast({
        title: t('success'),
        description: t('userDeleted'),
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Error in confirmDeleteUser:', error);
      
      let errorMessage = error.message || t('deleteFailed');
      if (error.code === '23503') {
        errorMessage = t('cannotDeleteUserLinkedData');
      } else if (error.code === '42501') {
        errorMessage = t('notAuthorizedToDelete');
      }
      
      toast({
        variant: 'destructive',
        title: t('error'),
        description: errorMessage,
      });
      loadUsers();
    } finally {
      setActionLoading(null);
    }
  };

  // Get user to delete details for confirmation
  const userToDeleteDetails = users.find(u => u.id === userToDelete);

  // Calculate total linked items
  const getTotalLinkedItems = (data: LinkedDataInfo | null) => {
    if (!data) return 0;
    return data.declarations + data.audit_logs + data.status_history + 
           data.maintenance + data.petty_cash + data.leave_requests;
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('usersCount')} ({users.length})
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Show inactive users toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="show-inactive"
                  checked={showInactiveUsers}
                  onCheckedChange={setShowInactiveUsers}
                />
                <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
                  {t('showInactiveUsers')}
                </Label>
              </div>
              
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
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('creationDate')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userData) => (
                <TableRow 
                  key={userData.id} 
                  className={!userData.is_active ? 'opacity-60 bg-muted/30' : ''}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {userData.username}
                      {userData.id === user?.id && (
                        <Badge variant="outline" className="text-xs">{t('you')}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{userData.email}</TableCell>
                  <TableCell>
                    {userData.is_active ? (
                      <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">
                        <UserCheck className="w-3 h-3 mr-1" />
                        {t('active')}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30">
                        <UserX className="w-3 h-3 mr-1" />
                        {t('inactive')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={userData.role}
                      onValueChange={(value: any) => handleRoleChange(userData.id, value)}
                      disabled={userData.id === user?.id || !userData.is_active}
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
                    {toGregorianDate(userData.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {user?.role === 'admin' && userData.id !== user?.id && (
                        <>
                          {/* Reactivate button for inactive users */}
                          {!userData.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReactivateUser(userData.id)}
                              disabled={actionLoading === userData.id}
                              className="text-green-600 hover:text-green-700"
                              title={t('reactivateUser')}
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Deactivate button for active users */}
                          {userData.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateUser(userData.id)}
                              disabled={actionLoading === userData.id}
                              className="text-yellow-600 hover:text-yellow-700"
                              title={t('deactivateUser')}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(userData.id)}
                            disabled={actionLoading === userData.id}
                            className="text-destructive hover:text-destructive"
                            title={t('deleteUser')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Linked Data Warning Dialog */}
      <AlertDialog open={linkedDataDialogOpen} onOpenChange={setLinkedDataDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-yellow-600">
              <ShieldAlert className="w-5 h-5" />
              {t('cannotDeleteUser')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>{t('userHasLinkedDataDescription')}</p>
                
                {userToDeleteDetails && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{t('username')}:</span>
                      <span>{userToDeleteDetails.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{t('email')}:</span>
                      <span className="text-sm">{userToDeleteDetails.email}</span>
                    </div>
                  </div>
                )}
                
                {/* Linked Data Summary */}
                {linkedDataInfo && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-yellow-700 dark:text-yellow-300">
                      <Activity className="w-4 h-4" />
                      {t('linkedDataSummary')} ({getTotalLinkedItems(linkedDataInfo)} {t('items')})
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {linkedDataInfo.declarations > 0 && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          <span>{t('declarations')}: {linkedDataInfo.declarations}</span>
                        </div>
                      )}
                      {linkedDataInfo.audit_logs > 0 && (
                        <div className="flex items-center gap-2">
                          <Activity className="w-3 h-3" />
                          <span>{t('auditLogs')}: {linkedDataInfo.audit_logs}</span>
                        </div>
                      )}
                      {linkedDataInfo.status_history > 0 && (
                        <div className="flex items-center gap-2">
                          <Activity className="w-3 h-3" />
                          <span>{t('statusHistory')}: {linkedDataInfo.status_history}</span>
                        </div>
                      )}
                      {linkedDataInfo.maintenance > 0 && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          <span>{t('maintenance')}: {linkedDataInfo.maintenance}</span>
                        </div>
                      )}
                      {linkedDataInfo.petty_cash > 0 && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          <span>{t('pettyCash')}: {linkedDataInfo.petty_cash}</span>
                        </div>
                      )}
                      {linkedDataInfo.leave_requests > 0 && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          <span>{t('leaveRequests')}: {linkedDataInfo.leave_requests}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Alternative Action */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">{t('alternativeAction')}</p>
                  <p className="text-sm text-muted-foreground">{t('deactivateUserDescription')}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => userToDelete && handleDeactivateUser(userToDelete)}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
            >
              <UserX className="w-4 h-4 mr-2" />
              {t('deactivateUser')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog (for users without linked data) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t('confirmDeleteUser')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>{t('deleteUserWarning')}</p>
                
                {userToDeleteDetails && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-right">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{t('username')}:</span>
                      <span>{userToDeleteDetails.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{t('email')}:</span>
                      <span className="text-sm">{userToDeleteDetails.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{t('role')}:</span>
                      <Badge className={rolePermissions[userToDeleteDetails.role].color}>
                        {t(rolePermissions[userToDeleteDetails.role].labelKey)}
                      </Badge>
                    </div>
                  </div>
                )}
                
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                  ⚠️ {t('deleteUserPermanentWarning')}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading === userToDelete}
            >
              {t('deleteUser')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
