import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';

const ONBOARDING_KEY = 'dts-onboarding-completed';

export function OnboardingTour() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [run, setRun] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      // Delay to let the page render
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: Step[] = [
    {
      target: '[data-tour="dashboard-stats"]',
      content: t('onboardingDashboardDesc'),
      title: t('onboardingDashboardTitle'),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="create-declaration"]',
      content: t('onboardingDeclarationsDesc'),
      title: t('onboardingDeclarationsTitle'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="nav-reports"]',
      content: t('onboardingReportsDesc'),
      title: t('onboardingReportsTitle'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="notifications"]',
      content: t('onboardingNotificationsDesc'),
      title: t('onboardingNotificationsTitle'),
      placement: 'bottom',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setRun(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: language === 'ar' ? 'السابق' : 'Back',
        close: language === 'ar' ? 'إغلاق' : 'Close',
        last: language === 'ar' ? 'إنهاء' : 'Finish',
        next: language === 'ar' ? 'التالي' : 'Next',
        skip: language === 'ar' ? 'تخطي' : 'Skip',
      }}
      styles={{
        options: {
          arrowColor: isDark ? 'hsl(222.2 84% 4.9%)' : '#fff',
          backgroundColor: isDark ? 'hsl(222.2 84% 4.9%)' : '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          primaryColor: 'hsl(262.1 83.3% 57.8%)',
          textColor: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '8px',
        },
        tooltipContent: {
          fontSize: '14px',
          lineHeight: 1.6,
        },
        buttonNext: {
          backgroundColor: 'hsl(262.1 83.3% 57.8%)',
          borderRadius: '8px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
          marginRight: '8px',
        },
        buttonSkip: {
          color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
        },
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}
