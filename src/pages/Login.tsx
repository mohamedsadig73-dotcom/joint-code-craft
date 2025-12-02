import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Globe, Lock, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isSignup) {
      if (!username) {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: t('enterUsername'),
        });
        setLoading(false);
        return;
      }
      
      const result = await signup(email, password, username);
      if (result.success) {
        // بعد إنشاء الحساب، نحاول تسجيل الدخول مباشرة
        const loginResult = await login(email, password);
        if (loginResult.success) {
          toast({
            title: t('success'),
            description: t('signupSuccess'),
          });
          navigate('/');
        } else {
          toast({
            variant: 'destructive',
            title: t('error'),
            description: loginResult.error || t('signupFailed'),
          });
          setIsSignup(false);
          setLoading(false);
        }
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: result.error || t('signupFailed'),
        });
        setLoading(false);
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      } else {
        // تسجيل محاولة الدخول الفاشلة
        try {
          await supabase.rpc('log_failed_login_attempt', {
            _email: email,
            _error_message: result.error || 'Invalid credentials',
            _ip_address: null, // سيتم جمعها من الـ edge function إذا لزم الأمر
            _user_agent: navigator.userAgent
          });
        } catch (logError) {
          console.error('Failed to log failed login attempt:', logError);
        }
        
        toast({
          variant: 'destructive',
          title: t('error'),
          description: result.error || t('invalidCredentials'),
        });
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl top-0 left-0 animate-pulse" />
        <div className="absolute w-96 h-96 bg-secondary/20 rounded-full blur-3xl bottom-0 right-0 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Language Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="absolute top-4 right-4 gap-2 z-10"
      >
        <Globe className="w-4 h-4" />
        {language === 'en' ? 'العربية' : 'English'}
      </Button>

      {/* Login/Signup Card */}
      <div className="glass-card rounded-2xl p-8 w-full max-w-md relative z-10 shadow-2xl">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-50 animate-fade-in">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg font-medium">
              {isSignup ? t('creatingAccount') : t('loggingIn')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              الرجاء الانتظار
            </p>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">DTS</h1>
          <h2 className="text-2xl font-bold mb-2">
            {isSignup ? t('createAccount') : t('welcomeBack')}
          </h2>
          <p className="text-muted-foreground">
            {isSignup ? t('enterDeclarationDetails') : t('loginSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-card border-border/50"
                placeholder={t('username')}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 glass-card border-border/50"
                placeholder={t('email')}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 glass-card border-border/50"
                placeholder={t('password')}
                required
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isSignup ? t('creatingAccount') : t('loggingIn')}
              </span>
            ) : (
              isSignup ? t('createAccount') : t('login')
            )}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setLoading(false);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            {isSignup ? t('alreadyHaveAccount') + ' ' + t('login') : t('dontHaveAccount') + ' ' + t('signup')}
          </button>
          
          {!isSignup && (
            <button
              onClick={() => window.location.href = '/forgot-password'}
              className="text-sm text-primary hover:underline"
              disabled={loading}
            >
              {t('forgotPassword')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
