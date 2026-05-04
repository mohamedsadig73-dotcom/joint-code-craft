/**
 * Lightweight haptic feedback wrapper.
 * Uses the Web Vibration API where available (Android, some PWAs).
 * No-op on iOS Safari (which does not expose vibration), but safe to call.
 */
type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 35,
  selection: 8,
  success: [10, 40, 10],
  warning: [20, 60, 20],
  error: [40, 60, 40, 60, 40],
};

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function haptic(pattern: HapticPattern = 'light') {
  try {
    if (!canVibrate()) return;
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* ignore */
  }
}

export const hapticLight = () => haptic('light');
export const hapticMedium = () => haptic('medium');
export const hapticSuccess = () => haptic('success');
export const hapticError = () => haptic('error');
export const hapticSelection = () => haptic('selection');