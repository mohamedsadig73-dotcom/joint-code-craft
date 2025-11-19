import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
import { Users, RefreshCw, UserPlus, Trash2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  username: string;
  email: string;
  created_at: string;
  role: 'admin' | 'manager' | 'user';
}

const rolePermissions = {
  admin: {
    label: 'مدير النظام',
    color: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
    permissions: [
      'عرض جميع الإقرارات',
      'إنشاء وتعديل وحذف الإقرارات',
      'تغيير حالة أي إقرار',
      'إدارة جميع المستخدمين',
      'إضافة وحذف مستخدمين',
      'تغيير صلاحيات المستخدمين',
      'عرض التقارير والإحصائيات',
      'الوصول الكامل للنظام',
    ],
  },
  manager: {
    label: 'مدير فرعي',
    color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
    permissions: [
      'عرض جميع الإقرارات',
      'إنشاء وتعديل الإقرارات',
      'تغيير حالة جميع الإقرارات',
      'عرض معلومات المستخدمين',
      'عرض التقارير والإحصائيات',
    ],
  },
  user: {
    label: 'مستخدم',
    color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    permissions: [
      'عرض جميع الإقرارات',
      'إنشاء إقرارات جديدة',
      'تعديل الإقرارات الخاصة به فقط',
      'تغيير حالة الإقرارات الخاصة به فقط',
      'عرض ملفه الشخصي',
    ],
  },
};

export function UserManagementTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
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
        title: 'خطأ',
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
        title: 'تم بنجاح',
        description: 'تم تحديث دور المستخدم بنجاح',
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserPassword || !newUserUsername) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
      });
      return;
    }

    setCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            username: newUserUsername,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('فشل إنشاء المستخدم');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: newUserRole,
        });

      if (roleError) throw roleError;

      toast({
        title: 'تم بنجاح',
        description: `تم إنشاء المستخدم ${newUserUsername} بنجاح`,
      });

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserUsername('');
      setNewUserRole('user');
      setAddDialogOpen(false);

      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل إنشاء المستخدم',
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
        title: 'تم بنجاح',
        description: 'تم حذف صلاحيات المستخدم. لحذف المستخدم بالكامل، يجب القيام بذلك من لوحة تحكم Supabase.',
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Permissions Guide */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            دليل الصلاحيات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(rolePermissions).map(([role, info]) => (
              <div key={role} className="space-y-3">
                <Badge className={info.color}>{info.label}</Badge>
                <ul className="space-y-2 text-sm">
                  {info.permissions.map((permission, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-muted-foreground">{permission}</span>
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
              المستخدمون ({users.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadUsers}>
                <RefreshCw className="w-4 h-4 mr-2" />
                تحديث
              </Button>
              
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    إضافة مستخدم
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                    <DialogDescription>
                      قم بإنشاء حساب مستخدم جديد وتحديد صلاحياته
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <Label htmlFor="username">اسم المستخدم</Label>
                      <Input
                        id="username"
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        placeholder="أدخل اسم المستخدم"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="أدخل كلمة مرور قوية"
                        required
                        minLength={6}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="role">الصلاحية</Label>
                      <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <div className="flex items-center gap-2">
                              <Badge className={rolePermissions.user.color}>
                                {rolePermissions.user.label}
                              </Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="manager">
                            <div className="flex items-center gap-2">
                              <Badge className={rolePermissions.manager.color}>
                                {rolePermissions.manager.label}
                              </Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Badge className={rolePermissions.admin.color}>
                                {rolePermissions.admin.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAddDialogOpen(false)}
                        disabled={creating}
                      >
                        إلغاء
                      </Button>
                      <Button type="submit" disabled={creating}>
                        {creating ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
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
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الصلاحية</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الإجراءات</TableHead>
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
                            {rolePermissions[userData.role].label}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          <Badge className={rolePermissions.user.color}>
                            {rolePermissions.user.label}
                          </Badge>
                        </SelectItem>
                        <SelectItem value="manager">
                          <Badge className={rolePermissions.manager.color}>
                            {rolePermissions.manager.label}
                          </Badge>
                        </SelectItem>
                        <SelectItem value="admin">
                          <Badge className={rolePermissions.admin.color}>
                            {rolePermissions.admin.label}
                          </Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {format(new Date(userData.created_at), 'PPp', { locale: ar })}
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
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء سيحذف صلاحيات المستخدم. لحذف المستخدم بالكامل من النظام، يجب القيام بذلك من لوحة تحكم قاعدة البيانات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive">
              حذف الصلاحيات
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
