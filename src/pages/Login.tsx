import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Globe, Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { validatePassword } from '@/utils/authValidation';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, signup } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Password validation for signup
  const passwordErrors = useMemo(() => {
    if (!isSignup || !password) return [];
    return validatePassword(password, t);
  }, [password, isSignup, t]);

  const isPasswordValid = passwordErrors.length === 0 && password.length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('invalidEmail'),
      });
      setLoading(false);
      return;
    }
    
    if (isSignup) {
      // Validate username
      if (!username || username.trim().length < 2) {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: t('enterUsername'),
        });
        setLoading(false);
        return;
      }

      // Validate password strength
      if (passwordErrors.length > 0) {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: passwordErrors[0],
        });
        setLoading(false);
        return;
      }
      
      const result = await signup(email.trim(), password, username.trim());
      if (result.success) {
        const loginResult = await login(email.trim(), password);
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
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate('/');
      } else {
        try {
          await supabase.rpc('log_failed_login_attempt', {
            _email: email.trim(),
            _error_message: result.error || 'Invalid credentials',
            _ip_address: null,
            _user_agent: navigator.userAgent
          });
        } catch (logError) {
          // Silent fail for audit logging
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
      {/* Skip to main content link */}
      <a href="#login-form" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50">
        {t('skipToContent')}
      </a>

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl top-0 left-0 animate-pulse" />
        <div className="absolute w-96 h-96 bg-secondary/20 rounded-full blur-3xl bottom-0 right-0 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Language Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="absolute top-4 right-4 gap-2 z-10"
        aria-label={t('switchLanguage')}
      >
        <Globe className="w-4 h-4" aria-hidden="true" />
        {language === 'en' ? 'العربية' : 'English'}
      </Button>

      {/* Login/Signup Card */}
      <div className="glass-card rounded-2xl p-8 w-full max-w-md relative z-10 shadow-2xl" role="main">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-50 animate-fade-in" aria-live="polite">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" aria-hidden="true" />
            <p className="text-lg font-medium">
              {isSignup ? t('creatingAccount') : t('loggingIn')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('pleaseWait')}
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

        <form id="login-form" onSubmit={handleSubmit} className="space-y-6" noValidate>
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
                maxLength={50}
                aria-describedby="username-hint"
              />
              <p id="username-hint" className="text-xs text-muted-foreground">
                {t('usernameHint')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 glass-card border-border/50"
                placeholder={t('email')}
                required
                maxLength={255}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 glass-card border-border/50"
                placeholder={t('password')}
                required
                minLength={isSignup ? 10 : 1}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                aria-describedby={isSignup ? 'password-requirements' : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>

            {/* Enhanced Password strength indicator for signup */}
            {isSignup && <PasswordStrengthIndicator password={password} />}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
            disabled={loading || (isSignup && !isPasswordValid)}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
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
              setPassword('');
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
