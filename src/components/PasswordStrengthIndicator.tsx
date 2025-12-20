import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getPasswordStrength } from '@/utils/authValidation';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  const { t } = useLanguage();

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'none' };
    return getPasswordStrength(password);
  }, [password]);

  const strengthPercentage = useMemo(() => {
    return Math.round((passwordStrength.score / 6) * 100);
  }, [passwordStrength.score]);

  const getStrengthColor = () => {
    switch (passwordStrength.label) {
      case 'weak': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'strong': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getProgressColor = () => {
    switch (passwordStrength.label) {
      case 'weak': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'strong': return 'bg-green-500';
      default: return 'bg-muted';
    }
  };

  const getShieldIcon = () => {
    switch (passwordStrength.label) {
      case 'weak': return <ShieldAlert className="w-5 h-5 text-destructive" />;
      case 'medium': return <Shield className="w-5 h-5 text-warning" />;
      case 'strong': return <ShieldCheck className="w-5 h-5 text-green-500" />;
      default: return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const requirements = [
    { 
      key: 'length', 
      label: t('passwordMinLength'), 
      met: password.length >= 10 
    },
    { 
      key: 'uppercase', 
      label: t('passwordUppercase'), 
      met: /[A-Z]/.test(password) 
    },
    { 
      key: 'lowercase', 
      label: t('passwordLowercase'), 
      met: /[a-z]/.test(password) 
    },
    { 
      key: 'number', 
      label: t('passwordNumber'), 
      met: /[0-9]/.test(password) 
    },
    { 
      key: 'special', 
      label: t('passwordSpecialChar'), 
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) 
    },
  ];

  const metCount = requirements.filter(r => r.met).length;

  if (!password) return null;

  return (
    <div className="space-y-3 animate-fade-in" id="password-requirements">
      {/* Strength Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getShieldIcon()}
          <span className={cn("text-sm font-medium", getStrengthColor())}>
            {t('passwordStrength')}: {t(passwordStrength.label)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {metCount}/{requirements.length} {t('requirements')}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out rounded-full",
            getProgressColor()
          )}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
          {requirements.map((req) => (
            <div
              key={req.key}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors duration-200",
                req.met ? 'text-green-500' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200",
                req.met 
                  ? 'bg-green-500/20' 
                  : 'bg-muted'
              )}>
                {req.met ? (
                  <Check className="w-2.5 h-2.5" />
                ) : (
                  <X className="w-2.5 h-2.5" />
                )}
              </div>
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
