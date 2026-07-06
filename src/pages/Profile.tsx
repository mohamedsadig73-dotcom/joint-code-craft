import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Lock, Mail, Shield, Save } from 'lucide-react';
import { z } from 'zod';

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

  // Dynamic validation schemas using translations
  const profileSchema = z.object({
    username: z.string()
      .trim()
      .min(3, t('passwordMinLength'))
      .max(50)
      .regex(/^[a-zA-Z0-9_\u0600-\u06FF\s]+$/, t('invalidData')),
    email: z.string()
      .trim()
      .email(t('invalidEmail'))
      .max(255),
  });

  const passwordSchema = z.object({
    newPassword: z.string().min(6, t('passwordMinLength')),
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: t('passwordMismatch'),
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

    try {
      profileSchema.parse({ username, email });
    } catch (error) {
      const zodError = error as z.ZodError;
      toast({
        variant: 'destructive',
        title: t('dataValidationError'),
        description: zodError.errors?.[0]?.message || t('invalidData'),
      });
      return;
    }

    setProfileLoading(true);

    try {
      if (username !== user?.username) {
        const { data: existingUsername } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', user?.id)
          .maybeSingle();

        if (existingUsername) {
          toast({ variant: 'destructive', title: t('error'), description: t('usernameAlreadyTaken') });
          setProfileLoading(false);
          return;
        }
      }

      if (email !== user?.email) {
        const { data: existingEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .neq('id', user?.id)
          .maybeSingle();

        if (existingEmail) {
          toast({ variant: 'destructive', title: t('error'), description: t('emailAlreadyTaken') });
          setProfileLoading(false);
          return;
        }
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username, email })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      if (email !== user?.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
      }

      toast({ title: t('success'), description: t('profileUpdated') });
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('profileUpdateFailed');
      toast({ variant: 'destructive', title: t('error'), description: errorMessage });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse({ newPassword, confirmPassword });
    } catch (error) {
      const zodError = error as z.ZodError;
      toast({ variant: 'destructive', title: t('error'), description: zodError.errors?.[0]?.message || t('invalidData') });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: t('success'), description: t('passwordChangeSuccess') });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('passwordChangeFailed');
      toast({ variant: 'destructive', title: t('error'), description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'manager': return 'bg-warning/20 text-warning border-warning/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return t('systemAdmin');
      case 'manager': return t('subManager');
      default: return t('regularUser');
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <PageHeader
          icon={User}
          title={t('myProfile')}
          subtitle={t('profileSubtitle')}
        />

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <Label htmlFor="username" className="flex items-center gap-2 text-sm">
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
                    {t('jobRole')}
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
                  {t('resetFields')}
                </Button>
                <Button type="submit" disabled={profileLoading}>
                  <Save className="w-4 h-4 me-2" />
                  {profileLoading ? t('savingProfile') : t('saveProfile')}
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
                  {loading ? t('savingProfile') : t('updatePassword')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}