import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { usePageSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { SwipeIndicator } from '@/components/SwipeIndicator';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Lock, Mail, Shield, Phone, FileText, Camera } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

const profileSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  email: z.string().email('بريد إلكتروني غير صحيح'),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

export default function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { isSwipingLeft, isSwipingRight } = usePageSwipeNavigation({
    left: undefined,
    right: '/manage',
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Profile fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUsername(data.username || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      profileSchema.parse({ username, email, phone, bio });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.errors?.[0]?.message || t('invalidData'),
      });
      return;
    }

    setProfileLoading(true);

    try {
      // التحقق من عدم تكرار البريد الإلكتروني
      if (email !== user.email) {
        const { data: existingEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .neq('id', user.id)
          .maybeSingle();

        if (existingEmail) {
          throw new Error('البريد الإلكتروني مستخدم بالفعل');
        }
      }

      // التحقق من عدم تكرار اسم المستخدم
      if (username !== user.username) {
        const { data: existingUsername } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .maybeSingle();

        if (existingUsername) {
          throw new Error('اسم المستخدم مستخدم بالفعل');
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          email,
          phone: phone || null,
          bio: bio || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'تم تحديث الملف الشخصي بنجاح',
      });

      // إعادة تحميل الملف الشخصي
      loadProfile();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message || 'فشل تحديث الملف الشخصي',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

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
      <SwipeIndicator 
        direction={isSwipingLeft ? 'left' : isSwipingRight ? 'right' : null}
        label={isSwipingRight ? 'إدارة' : undefined}
      />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('myProfile')}</h1>
          <p className="text-muted-foreground">{t('profileSubtitle')}</p>
        </div>

        {/* Profile Picture */}
        <Card className="glass-card mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl} alt={username} />
                <AvatarFallback className="text-2xl">
                  {username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{username}</h3>
                <p className="text-sm text-muted-foreground mb-3">{email}</p>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-md border font-medium ${getRoleBadgeColor(
                    user?.role || 'user'
                  )}`}
                >
                  {getRoleLabel(user?.role || 'user')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Information */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              تعديل المعلومات الشخصية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('username')}
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={profileLoading}
                    required
                    minLength={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t('email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={profileLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الهاتف
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0500000000"
                    disabled={profileLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    الدور الوظيفي
                  </Label>
                  <Input
                    value={getRoleLabel(user?.role || 'user')}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    لا يمكن تعديل الدور الوظيفي
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  نبذة عني (اختياري)
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="أضف نبذة مختصرة عنك..."
                  disabled={profileLoading}
                  className="min-h-[100px] resize-none"
                />
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={profileLoading}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading ? 'جاري التحديث...' : 'حفظ التغييرات'}
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
                  onClick={() => {
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={loading}
                >
                  مسح
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
