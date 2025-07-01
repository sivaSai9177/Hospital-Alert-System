/**
 * Onboarding Module Exports
 * Central export point for all onboarding components and utilities
 */

// Screens
export { WelcomeScreen } from './screens/Welcome';
export { RoleSelectionScreen } from './screens/RoleSelection';
export { RegistrationScreen } from './screens/Registration';
export { EmailVerificationScreen } from './screens/EmailVerification';
export { PhoneVerificationScreen } from './screens/PhoneVerification';
export { ProfileSetupScreen } from './screens/ProfileSetup';
export { HospitalSetupScreen } from './screens/HospitalSetup';
export { DepartmentSetupScreen } from './screens/DepartmentSetup';
export { PermissionsScreen } from './screens/Permissions';
export { CompletionScreen } from './screens/Completion';

// Components
export { OnboardingLayout } from './components/OnboardingLayout';
export { ProgressIndicator } from './components/ProgressIndicator';
export { RoleCard } from './components/RoleCard';

// Hooks
export { useOnboardingFlow } from './hooks/useOnboardingFlow';

// Types
export type {
  UserRole,
  OnboardingStep,
  OnboardingState,
  UserProfile,
  Hospital,
  Department,
  OnboardingStepConfig,
  OnboardingProgress,
  RoleOption,
  ValidationError,
  OnboardingAnalytics,
} from './types';

// Constants
export {
  ONBOARDING_STEPS,
  ROLE_OPTIONS,
  SPECIALIZATIONS,
  EXPERIENCE_RANGES,
  SHIFT_PREFERENCES,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_TIMEOUT,
} from './utils/constants';