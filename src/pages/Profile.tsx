import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Lock, Mail, Shield, Save } from 'lucide-react';
import { z } from 'zod';

const profileSchema = z.object({
  username: z.string()
    .trim()
    .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
    .max(50, 'اسم المستخدم يجب أن يكون أقل من 50 حرف')
    .regex(/^[a-zA-Z0-9_\u0600-\u06FF\s]+$/, 'اسم المستخدم يحتوي على أحرف غير صالحة'),
  email: z.string()
    .trim()
    .email('البريد الإلكتروني غير صالح')
    .max(255, 'البريد الإلكتروني يجب أن يكون أقل من 255 حرف'),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

export default function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate profile data
    try {
      profileSchema.parse({ username, email });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ في البيانات',
        description: error.errors?.[0]?.message || 'البيانات المدخلة غير صحيحة',
      });
      return;
    }

    setProfileLoading(true);

    try {
      // Check if username is already taken by another user
      if (username !== user?.username) {
        const { data: existingUsername } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', user?.id)
          .maybeSingle();

        if (existingUsername) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'اسم المستخدم مستخدم بالفعل',
          });
          setProfileLoading(false);
          return;
        }
      }

      // Check if email is already taken by another user
      if (email !== user?.email) {
        const { data: existingEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .neq('id', user?.id)
          .maybeSingle();

        if (existingEmail) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'البريد الإلكتروني مستخدم بالفعل',
          });
          setProfileLoading(false);
          return;
        }
      }

      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username,
          email,
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Update email in auth if changed
      if (email !== user?.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: email,
        });

        if (authError) throw authError;
      }

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث بياناتك الشخصية بنجاح',
      });

      // Reload to get updated data
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل تحديث البيانات',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    try {
      passwordSchema.parse({ newPassword, confirmPassword });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.errors?.[0]?.message || t('invalidData'),
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('passwordChangeSuccess'),
      });

      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message || t('passwordChangeFailed'),
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'manager':
        return 'bg-warning/20 text-warning border-warning/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return t('systemAdmin');
      case 'manager':
        return t('subManager');
      default:
        return t('regularUser');
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('myProfile')}</h1>
          <p className="text-muted-foreground">{t('profileSubtitle')}</p>
        </div>

        {/* Profile Information */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              البيانات الشخصية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    اسم المستخدم
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={profileLoading}
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={profileLoading}
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    الدور الوظيفي
                  </Label>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-md border font-medium ${getRoleBadgeColor(
                        user?.role || 'user'
                      )}`}
                    >
                      {getRoleLabel(user?.role || 'user')}
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setUsername(user?.username || '');
                    setEmail(user?.email || '');
                  }}
                  disabled={profileLoading}
                >
                  إعادة تعيين
                </Button>
                <Button type="submit" disabled={profileLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {profileLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              تغيير كلمة المرور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={loading}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
