import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { 
  Shield, 
  Smartphone, 
  Mail, 
  Key, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Lock,
  RefreshCw
} from 'lucide-react';

interface TwoFactorSettings {
  is_enabled: boolean;
  method: 'email' | 'totp';
  last_verified_at: string | null;
}

export default function SecuritySettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [twoFactorSettings, setTwoFactorSettings] = useState<TwoFactorSettings | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setTwoFactorSettings({
          is_enabled: data.is_enabled || false,
          method: (data.method as 'email' | 'totp') || 'email',
          last_verified_at: data.last_verified_at,
        });
      } else {
        setTwoFactorSettings({
          is_enabled: false,
          method: 'email',
          last_verified_at: null,
        });
      }
    } catch (error: any) {
      console.error('Error loading 2FA settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    if (!user?.id || !user?.email) return;

    setSendingCode(true);
    try {
      // Generate code using database function
      const { data: code, error: codeError } = await supabase.rpc('generate_verification_code', {
        _user_id: user.id,
        _type: '2fa',
      });

      if (codeError) throw codeError;

      // In a real app, you would send this via email
      // For now, we'll show it in a toast (development only)
      toast({
        title: language === 'ar' ? 'تم إرسال الرمز' : 'Code Sent',
        description: language === 'ar' 
          ? `تم إرسال رمز التحقق إلى بريدك الإلكتروني. (للتطوير: ${code})`
          : `Verification code sent to your email. (Dev: ${code})`,
      });

      setCodeSent(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!user?.id || verificationCode.length !== 6) return;

    setVerifying(true);
    try {
      const { data: isValid, error } = await supabase.rpc('verify_code', {
        _user_id: user.id,
        _code: verificationCode,
        _type: '2fa',
      });

      if (error) throw error;

      if (isValid) {
        // Enable 2FA
        const { error: updateError } = await supabase
          .from('user_2fa_settings')
          .upsert({
            user_id: user.id,
            is_enabled: true,
            method: 'email',
            last_verified_at: new Date().toISOString(),
          });

        if (updateError) throw updateError;

        toast({
          title: language === 'ar' ? 'تم بنجاح' : 'Success',
          description: language === 'ar' 
            ? 'تم تفعيل المصادقة الثنائية'
            : '2FA enabled successfully',
        });

        setShowVerifyDialog(false);
        setVerificationCode('');
        setCodeSent(false);
        loadSettings();
      } else {
        toast({
          variant: 'destructive',
          title: language === 'ar' ? 'رمز غير صحيح' : 'Invalid Code',
          description: language === 'ar' 
            ? 'يرجى التحقق من الرمز والمحاولة مرة أخرى'
            : 'Please check the code and try again',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setVerifying(false);
    }
  };

  const disable2FA = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_2fa_settings')
        .update({ is_enabled: false })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' 
          ? 'تم تعطيل المصادقة الثنائية'
          : '2FA disabled',
      });

      loadSettings();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const enable2FA = () => {
    setShowVerifyDialog(true);
    setCodeSent(false);
    setVerificationCode('');
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            {language === 'ar' ? 'إعدادات الأمان' : 'Security Settings'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة إعدادات الأمان والمصادقة' : 'Manage your security and authentication settings'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    {language === 'ar' ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication (2FA)'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' 
                      ? 'أضف طبقة أمان إضافية لحسابك'
                      : 'Add an extra layer of security to your account'}
                  </CardDescription>
                </div>
                <Badge className={twoFactorSettings?.is_enabled 
                  ? 'bg-green-500/10 text-green-500' 
                  : 'bg-yellow-500/10 text-yellow-500'
                }>
                  {twoFactorSettings?.is_enabled 
                    ? (language === 'ar' ? 'مفعّل' : 'Enabled')
                    : (language === 'ar' ? 'غير مفعّل' : 'Disabled')
                  }
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {twoFactorSettings?.is_enabled ? (
                <>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>{language === 'ar' ? 'المصادقة الثنائية مفعّلة' : '2FA is enabled'}</AlertTitle>
                    <AlertDescription>
                      {language === 'ar' 
                        ? 'سيتم إرسال رمز تحقق إلى بريدك الإلكتروني عند تسجيل الدخول'
                        : 'A verification code will be sent to your email when you sign in'}
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{language === 'ar' ? 'نشط' : 'Active'}</Badge>
                  </div>

                  {twoFactorSettings.last_verified_at && (
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'آخر تحقق: ' : 'Last verified: '}
                      {new Date(twoFactorSettings.last_verified_at).toLocaleDateString()}
                    </p>
                  )}

                  <Button 
                    variant="destructive" 
                    onClick={disable2FA}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {language === 'ar' ? 'تعطيل المصادقة الثنائية' : 'Disable 2FA'}
                  </Button>
                </>
              ) : (
                <>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{language === 'ar' ? 'غير محمي' : 'Not Protected'}</AlertTitle>
                    <AlertDescription>
                      {language === 'ar' 
                        ? 'حسابك غير محمي بالمصادقة الثنائية. يُنصح بتفعيلها لزيادة الأمان.'
                        : 'Your account is not protected with 2FA. We recommend enabling it for better security.'}
                    </AlertDescription>
                  </Alert>

                  <Button onClick={enable2FA}>
                    {language === 'ar' ? 'تفعيل المصادقة الثنائية' : 'Enable 2FA'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Login Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {language === 'ar' ? 'نشاط تسجيل الدخول' : 'Login Activity'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'آخر عمليات تسجيل الدخول إلى حسابك'
                  : 'Recent login activity on your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{language === 'ar' ? 'الجلسة الحالية' : 'Current Session'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date().toLocaleDateString()} - {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
                    </p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500">
                    {language === 'ar' ? 'نشط' : 'Active'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {language === 'ar' ? 'كلمة المرور' : 'Password'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'تغيير كلمة المرور الخاصة بك'
                  : 'Change your password'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => window.location.href = '/forgot-password'}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {language === 'ar' ? 'التحقق من البريد الإلكتروني' : 'Email Verification'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!codeSent ? (
              <>
                <p className="text-muted-foreground">
                  {language === 'ar' 
                    ? `سنرسل رمز تحقق إلى ${user?.email}`
                    : `We'll send a verification code to ${user?.email}`}
                </p>
                <Button 
                  onClick={sendVerificationCode} 
                  disabled={sendingCode}
                  className="w-full"
                >
                  {sendingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {language === 'ar' ? 'إرسال الرمز' : 'Send Code'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-center">
                  {language === 'ar' 
                    ? 'أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك'
                    : 'Enter the 6-digit code sent to your email'}
                </p>

                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={verificationCode}
                    onChange={setVerificationCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={sendVerificationCode}
                    disabled={sendingCode}
                    className="flex-1"
                  >
                    {sendingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {language === 'ar' ? 'إعادة الإرسال' : 'Resend'}
                  </Button>
                  <Button 
                    onClick={verifyCode}
                    disabled={verifying || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {language === 'ar' ? 'تحقق' : 'Verify'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}