import { router } from 'expo-router';
import { Platform } from 'react-native';
import { log } from '@/lib/core/debug/logger';
import { haptic, haptics } from '@/lib/ui/haptics';
import { DURATIONS } from '@/lib/ui/animations/constants';
import { ROUTES } from './routes';

export type NavigationAnimation = 
  | 'slide_from_right' 
  | 'slide_from_left'
  | 'slide_from_bottom'
  | 'fade'
  | 'fade_from_bottom'
  | 'none';

export interface NavigationOptions {
  animation?: NavigationAnimation;
  animationDuration?: number;
  gesture?: boolean;
  haptic?: boolean;
}

/**
 * Animated navigation helper
 */
export const animatedNavigation = {
  /**
   * Navigate with animation options
   */
  navigate: (href: string, options?: NavigationOptions) => {
    log.debug('Animated navigation', 'NAV', { href, options });
    
    // Haptic feedback
    if (options?.haptic !== false && Platform.OS !== 'web') {
      haptic('light');
    }
    
    // Navigate with options
    router.push({
      pathname: href,
      params: {
        animation: options?.animation,
        animationDuration: options?.animationDuration,
      },
    } as any);
  },

  /**
   * Replace with animation
   */
  replace: (href: string, options?: NavigationOptions) => {
    log.debug('Animated replace', 'NAV', { href, options });
    
    if (options?.haptic !== false && Platform.OS !== 'web') {
      haptic('light');
    }
    
    router.replace({
      pathname: href,
      params: {
        animation: options?.animation,
        animationDuration: options?.animationDuration,
      },
    } as any);
  },

  /**
   * Go back with animation
   */
  back: (options?: NavigationOptions) => {
    log.debug('Animated back', 'NAV', { options });
    
    if (options?.haptic !== false && Platform.OS !== 'web') {
      haptic('light');
    }
    
    router.back();
  },

  /**
   * Present as modal
   */
  presentModal: (href: string, options?: NavigationOptions) => {
    log.debug('Present modal', 'NAV', { href, options });
    
    if (Platform.OS !== 'web') {
      haptic('medium');
    }
    
    router.push({
      pathname: href,
      params: {
        presentation: 'modal',
        animation: options?.animation || 'slide_from_bottom',
        animationDuration: options?.animationDuration || 300, // normal duration
      },
    } as any);
  },

  /**
   * Dismiss modal
   */
  dismissModal: (options?: NavigationOptions) => {
    log.debug('Dismiss modal', 'NAV', { options });
    
    if (Platform.OS !== 'web') {
      haptic('light');
    }
    
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  },

  /**
   * Auth navigation with smooth transitions
   */
  auth: {
    toLogin: () => {
      animatedNavigation.replace(ROUTES.auth.login, {
        animation: 'fade',
        animationDuration: DURATIONS.fast,
      });
    },
    
    toSignup: () => {
      animatedNavigation.navigate(ROUTES.auth.register, {
        animation: Platform.select({
          ios: 'slide_from_right',
          default: 'fade_from_bottom',
        }),
      });
    },
    
    toForgotPassword: () => {
      animatedNavigation.presentModal(ROUTES.auth.forgotPassword);
    },
    
    toCompleteProfile: () => {
      animatedNavigation.replace(ROUTES.auth.completeProfile, {
        animation: 'fade',
        animationDuration: DURATIONS.normal,
      });
    },
  },

  /**
   * App navigation with transitions
   */
  app: {
    toHome: () => {
      animatedNavigation.replace('/(home)', {
        animation: 'fade',
        animationDuration: DURATIONS.normal,
      });
    },
    
    toExplore: () => {
      animatedNavigation.navigate('/(home)/explore', {
        animation: 'fade',
        animationDuration: DURATIONS.fast,
      });
    },
    
    toSettings: () => {
      animatedNavigation.navigate('/(home)/settings', {
        animation: Platform.select({
          ios: 'slide_from_right',
          default: 'fade',
        }),
      });
    },
    
    toAdmin: () => {
      animatedNavigation.navigate('/(home)/admin', {
        animation: 'fade',
        animationDuration: DURATIONS.fast,
      });
    },
    
    toManager: () => {
      animatedNavigation.navigate('/(home)/manager', {
        animation: 'fade',
        animationDuration: DURATIONS.fast,
      });
    },
  },

  /**
   * Tab navigation (no animation for instant feel)
   */
  tab: {
    switch: (href: string) => {
      if (Platform.OS !== 'web') {
        haptics.tabSelect();
      }
      router.replace(href as any);
    },
  },
};