import { useState, useEffect, useCallback } from 'react';

interface NudgeConfig {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'tip';
  condition: () => boolean;
  priority: number;
  maxDismissals: number;
  cooldownDays: number;
}

interface NudgeState {
  dismissals: number;
  lastDismissed: string | null;
}

const STORAGE_KEY = 'dts_smart_nudges';

// Get stored nudge states
const getNudgeStates = (): Record<string, NudgeState> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save nudge states
const saveNudgeStates = (states: Record<string, NudgeState>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
};

export function useSmartNudges(config: {
  hasEmptyData?: boolean;
  hasOverdueItems?: boolean;
  isPremiumUser?: boolean;
  daysSinceLastActivity?: number;
  completionRate?: number;
  totalItems?: number;
}) {
  const [activeNudge, setActiveNudge] = useState<NudgeConfig | null>(null);
  const [nudgeStates, setNudgeStates] = useState<Record<string, NudgeState>>({});

  // Define nudges based on context
  const nudges: NudgeConfig[] = [
    {
      id: 'first_declaration',
      message: 'مرحباً! ابدأ بإنشاء أول إقرار لك من زر "إقرار جديد" 📝',
      type: 'tip',
      condition: () => config.totalItems === 0,
      priority: 10,
      maxDismissals: 3,
      cooldownDays: 1,
    },
    {
      id: 'overdue_maintenance',
      message: 'لديك عناصر صيانة متأخرة تحتاج انتباهك! ⚠️',
      type: 'warning',
      condition: () => config.hasOverdueItems === true,
      priority: 9,
      maxDismissals: 5,
      cooldownDays: 1,
    },
    {
      id: 'low_completion',
      message: 'نسبة الإنجاز منخفضة. حاول متابعة الإقرارات المعلقة 📊',
      type: 'info',
      condition: () => (config.completionRate || 0) < 30 && (config.totalItems || 0) > 5,
      priority: 7,
      maxDismissals: 3,
      cooldownDays: 3,
    },
    {
      id: 'inactive_reminder',
      message: 'مرحباً بعودتك! هل تريد مراجعة آخر التحديثات؟ 👋',
      type: 'info',
      condition: () => (config.daysSinceLastActivity || 0) > 7,
      priority: 6,
      maxDismissals: 2,
      cooldownDays: 7,
    },
    {
      id: 'high_completion',
      message: 'أداء ممتاز! نسبة الإنجاز لديك عالية جداً 🎉',
      type: 'success',
      condition: () => (config.completionRate || 0) > 80 && (config.totalItems || 0) > 10,
      priority: 3,
      maxDismissals: 2,
      cooldownDays: 14,
    },
  ];

  useEffect(() => {
    setNudgeStates(getNudgeStates());
  }, []);

  useEffect(() => {
    // Find the best nudge to show
    const now = new Date();
    
    const eligibleNudges = nudges
      .filter(nudge => {
        // Check if condition is met
        if (!nudge.condition()) return false;
        
        const state = nudgeStates[nudge.id];
        if (!state) return true;
        
        // Check max dismissals
        if (state.dismissals >= nudge.maxDismissals) return false;
        
        // Check cooldown
        if (state.lastDismissed) {
          const lastDismissed = new Date(state.lastDismissed);
          const daysSince = Math.floor((now.getTime() - lastDismissed.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince < nudge.cooldownDays) return false;
        }
        
        return true;
      })
      .sort((a, b) => b.priority - a.priority);

    setActiveNudge(eligibleNudges[0] || null);
  }, [config, nudgeStates]);

  const dismissNudge = useCallback((nudgeId: string) => {
    setNudgeStates(prev => {
      const state = prev[nudgeId] || { dismissals: 0, lastDismissed: null };
      const updated = {
        ...prev,
        [nudgeId]: {
          dismissals: state.dismissals + 1,
          lastDismissed: new Date().toISOString(),
        },
      };
      saveNudgeStates(updated);
      return updated;
    });
    setActiveNudge(null);
  }, []);

  const resetNudges = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setNudgeStates({});
  }, []);

  return {
    activeNudge,
    dismissNudge,
    resetNudges,
  };
}
