/**
 * Navigation exports
 */

// Export everything except 'navigation' from routes
export { 
  ROUTES,
  ROUTES_LEGACY,
  getLoginRoute, 
  getAlertDetailsRoute,
  PAGE_TRANSITIONS,
  SCREEN_OPTIONS
} from './routes';

// Export navigation from navigation.ts
export { navigation } from './navigation';

// Export other modules
export * from './navigation-helper';
export * from './animated-navigation';
export * from './gesture-handler';
export * from './transitions';
// Re-export specific items from page-transitions
export { 
  pageTransitions,
  getDefaultPageTransition,
  applyPageTransition,
  type TransitionType,
  AnimatedPageWrapper,
  pageEnteringAnimations,
  pageExitingAnimations
} from './page-transitions';