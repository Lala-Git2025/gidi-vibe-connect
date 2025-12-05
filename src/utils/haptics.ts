/**
 * Haptic Feedback Utility for iOS and Android
 * Provides tactile feedback for user interactions
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback if available
 * Works on iOS (via Haptic Engine) and Android (via Vibration API)
 */
export const triggerHaptic = (style: HapticStyle = 'light'): void => {
  // iOS Haptic Engine (iOS 10+)
  if ('haptics' in navigator && (navigator as any).haptics) {
    try {
      switch (style) {
        case 'light':
          (navigator as any).haptics.notification({ type: 'success' });
          break;
        case 'medium':
          (navigator as any).haptics.impact({ style: 'medium' });
          break;
        case 'heavy':
          (navigator as any).haptics.impact({ style: 'heavy' });
          break;
        case 'success':
          (navigator as any).haptics.notification({ type: 'success' });
          break;
        case 'warning':
          (navigator as any).haptics.notification({ type: 'warning' });
          break;
        case 'error':
          (navigator as any).haptics.notification({ type: 'error' });
          break;
      }
      return;
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  }

  // Fallback to Vibration API (Android and some iOS browsers)
  if ('vibrate' in navigator) {
    try {
      const patterns: Record<HapticStyle, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 30,
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [30, 100, 30, 100, 30],
      };

      navigator.vibrate(patterns[style]);
    } catch (error) {
      console.debug('Vibration not available:', error);
    }
  }
};

/**
 * Trigger haptic feedback for button press
 */
export const hapticClick = (): void => {
  triggerHaptic('light');
};

/**
 * Trigger haptic feedback for successful action
 */
export const hapticSuccess = (): void => {
  triggerHaptic('success');
};

/**
 * Trigger haptic feedback for error/failure
 */
export const hapticError = (): void => {
  triggerHaptic('error');
};

/**
 * Trigger haptic feedback for warning
 */
export const hapticWarning = (): void => {
  triggerHaptic('warning');
};

/**
 * Trigger haptic feedback for selection change
 */
export const hapticSelection = (): void => {
  triggerHaptic('medium');
};

/**
 * Check if haptic feedback is available
 */
export const isHapticAvailable = (): boolean => {
  return 'haptics' in navigator || 'vibrate' in navigator;
};
