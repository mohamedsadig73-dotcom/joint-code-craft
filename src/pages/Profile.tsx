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

export default function Profile() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Dynamic validation schemas based on language
  const profileSchema = z.object({
    username: z.string()
      .trim()
      .min(3, language === 'ar' ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters')
      .max(50, language === 'ar' ? 'اسم المستخدم يجب أن يكون أقل من 50 حرف' : 'Username must be less than 50 characters')
      .regex(/^[a-zA-Z0-9_\u0600-\u06FF\s]+$/, language === 'ar' ? 'اسم المستخدم يحتوي على أحرف غير صالحة' : 'Username contains invalid characters'),
    email: z.string()
      .trim()
      .email(language === 'ar' ? 'البريد الإلكتروني غير صالح' : 'Invalid email address')
      .max(255, language === 'ar' ? 'البريد الإلكتروني يجب أن يكون أقل من 255 حرف' : 'Email must be less than 255 characters'),
  });

  const passwordSchema = z.object({
    newPassword: z.string().min(6, language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: t('passwordsNotMatch'),
    path: ['confirmPassword'],
  });

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
        title: t('profileDataError'),
        description: error.errors?.[0]?.message || t('invalidData'),
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
            title: t('error'),
            description: t('usernameTaken'),
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
            title: t('error'),
            description: t('emailTaken'),
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
        title: t('success'),
        description: t('dataUpdated'),
      });

      // Reload to get updated data
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message || t('dataUpdateFailed'),
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
    <div className="min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
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
              {t('personalData')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('usernameLabel')}
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
                    {t('emailLabel')}
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
                    {t('functionalRole')}
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
                  {t('resetChanges')}
                </Button>
                <Button type="submit" disabled={profileLoading}>
                  <Save className="w-4 h-4 me-2" />
                  {profileLoading ? t('saving') : t('saveEdits')}
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
              {t('changePasswordTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPasswordLabel')}</Label>
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
                <Label htmlFor="confirmPassword">{t('confirmPasswordLabel')}</Label>
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
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? t('updatingPassword') : t('updatePasswordBtn')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}