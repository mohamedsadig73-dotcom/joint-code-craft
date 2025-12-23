import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  FileText, 
  LayoutDashboard, 
  BarChart3, 
  Wrench, 
  Bell,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface OnboardingStep {
  icon: typeof FileText;
  titleKey: string;
  descriptionKey: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: LayoutDashboard,
    titleKey: 'onboardingDashboardTitle',
    descriptionKey: 'onboardingDashboardDesc',
    color: 'text-primary',
  },
  {
    icon: FileText,
    titleKey: 'onboardingDeclarationsTitle',
    descriptionKey: 'onboardingDeclarationsDesc',
    color: 'text-blue-500',
  },
  {
    icon: BarChart3,
    titleKey: 'onboardingReportsTitle',
    descriptionKey: 'onboardingReportsDesc',
    color: 'text-green-500',
  },
  {
    icon: Wrench,
    titleKey: 'onboardingMaintenanceTitle',
    descriptionKey: 'onboardingMaintenanceDesc',
    color: 'text-orange-500',
  },
  {
    icon: Bell,
    titleKey: 'onboardingNotificationsTitle',
    descriptionKey: 'onboardingNotificationsDesc',
    color: 'text-purple-500',
  },
];

const ONBOARDING_KEY = 'dts_onboarding_completed';

interface OnboardingProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export const Onboarding = memo(function Onboarding({ forceShow = false, onComplete }: OnboardingProps) {
  const { t, language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed || forceShow) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const isRTL = language === 'ar';

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="animate-slide-up">
        <Card className="glass-card border-border/50 w-full max-w-md p-6 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
          
          {/* Skip button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 end-4 z-10"
            onClick={handleSkip}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-8 bg-primary' 
                    : index < currentStep 
                      ? 'w-2 bg-primary/50' 
                      : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div key={currentStep} className="text-center relative z-10 animate-fade-in">
            <div className="mx-auto mb-6">
              <div className="inline-flex p-4 rounded-2xl bg-card/50 border border-border/30">
                <Icon className={`w-12 h-12 ${currentStepData.color}`} />
              </div>
            </div>

            <h2 className="text-xl font-bold mb-3">
              {t(currentStepData.titleKey)}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {t(currentStepData.descriptionKey)}
            </p>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4 relative z-10">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-2"
            >
              {isRTL ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
              {t('previous')}
            </Button>

            <Button
              onClick={handleNext}
              className="gap-2"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {t('getStarted')}
                </>
              ) : (
                <>
                  {t('next')}
                  {isRTL ? (
                    <ChevronLeft className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
});

// Hook to control onboarding
export function useOnboarding() {
  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
  };

  const isCompleted = () => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  };

  return { resetOnboarding, isCompleted };
}
