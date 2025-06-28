/**
 * Centralized routing configuration
 * Type-safe navigation with proper route definitions
 */

export const ROUTES = {
  // Auth routes
  auth: {
    login: '/auth/login' as const,
    register: '/auth/register' as const,
    forgotPassword: '/auth/forgot-password' as const,
    verifyEmail: '/auth/verify-email' as const,
    completeProfile: '/auth/complete-profile' as const,
  },
  
  // Onboarding routes
  onboarding: {
    welcome: '/onboarding/welcome' as const,
    roleSelection: '/onboarding/role-selection' as const,
    registration: '/onboarding/registration' as const,
    emailVerification: '/onboarding/email-verification' as const,
    profileSetup: '/onboarding/profile-setup' as const,
    hospitalSetup: '/onboarding/hospital-setup' as const,
    departmentSetup: '/onboarding/department-setup' as const,
    permissions: '/onboarding/permissions' as const,
    completion: '/onboarding/completion' as const,
  },
  
  // Main app tabs
  tabs: {
    home: '/home' as const,
    alerts: {
      index: '/alerts' as const,
      detail: (id: string) => `/alerts/${id}` as const,
    },
    patients: '/patients' as const,
    settings: {
      index: '/settings' as const,
      members: '/settings/members' as const,
      invitations: '/settings/invitations' as const,
    },
  },
  
  // Healthcare specific routes
  healthcare: {
    alerts: {
      list: '/alerts' as const,
      detail: (id: string) => `/alerts/${id}` as const,
      history: '/alerts/history' as const,
      escalationQueue: '/alerts/escalation-queue' as const,
    },
    patients: {
      list: '/patients' as const,
      detail: (id: string) => `/patients/${id}` as const,
      vitals: (id: string) => `/patients/${id}/vitals` as const,
      medications: (id: string) => `/patients/${id}/medications` as const,
      notes: (id: string) => `/patients/${id}/notes` as const,
    },
    shifts: {
      handover: '/shifts/handover' as const,
      schedule: '/shifts/schedule' as const,
      history: '/shifts/history' as const,
    },
    analytics: {
      response: '/response-analytics' as const,
      performance: '/analytics/performance' as const,
      trends: '/analytics/trends' as const,
    },
    logs: {
      activity: '/activity-logs' as const,
      audit: '/admin/audit' as const,
    },
  },
  
  // Organization routes
  organization: {
    dashboard: '/organization/dashboard' as const,
    settings: '/organization/settings' as const,
    members: '/settings/members' as const,
    billing: '/organization/billing' as const,
  },
  
  // Admin routes
  admin: {
    users: '/admin/users' as const,
    organizations: '/admin/organizations' as const,
    system: '/admin/system' as const,
    audit: '/admin/audit' as const,
  },
  
  // Modal routes
  modals: {
    createAlert: '/create-alert' as const,
    alertDetails: (id: string) => `/alerts/${id}` as const,
    patientDetails: (id: string) => `/patient-details?patientId=${id}` as const,
    acknowledgeAlert: (id: string) => `/acknowledge-alert?alertId=${id}` as const,
    // hospitalSelection: '/hospital-selection' as const, // Removed - hospital selection is now optional
    inviteMember: '/invite-member' as const,
  },
  
  // Profile & Security
  profile: {
    index: '/profile' as const,
    security: {
      changePassword: '/security/change-password' as const,
      twoFactor: '/security/2fa' as const,
    },
  },
  
  // Support
  support: '/support' as const,
  
  // Other routes
  authCallback: '/auth-callback' as const,
  index: '/' as const,
  
  // Route groupings for easier access
  PUBLIC: {
    login: '/auth/login' as const,
    register: '/auth/register' as const,
    forgotPassword: '/auth/forgot-password' as const,
    verifyEmail: '/auth/verify-email' as const,
    completeProfile: '/auth/complete-profile' as const,
    index: '/' as const,
  },
  
  APP: {
    home: '/home' as const,
    alerts: '/alerts' as const,
    patients: '/patients' as const,
    settings: '/settings' as const,
    profile: '/profile' as const,
  },
} as const;

// Legacy aliases for backward compatibility
export const ROUTES_LEGACY = {
  PUBLIC: {
    LOGIN: ROUTES.auth.login,
    REGISTER: ROUTES.auth.register,
    FORGOT_PASSWORD: ROUTES.auth.forgotPassword,
    VERIFY_EMAIL: ROUTES.auth.verifyEmail,
    COMPLETE_PROFILE: ROUTES.auth.completeProfile,
  },
  APP: {
    HOME: ROUTES.tabs.home,
    ALERTS: ROUTES.tabs.alerts.index,
    ALERT_DETAILS: ROUTES.tabs.alerts.detail,
    PATIENTS: ROUTES.tabs.patients,
    SETTINGS: ROUTES.tabs.settings.index,
    PROFILE: ROUTES.profile.index,
    ADMIN: {
      USERS: ROUTES.admin.users,
      SYSTEM: ROUTES.admin.system,
      AUDIT: ROUTES.admin.audit,
      ORGANIZATIONS: ROUTES.admin.organizations,
    },
    ORGANIZATION: {
      DASHBOARD: ROUTES.organization.dashboard,
      SETTINGS: ROUTES.organization.settings,
    },
  },
  MODALS: {
    CREATE_ALERT: ROUTES.modals.createAlert,
    ALERT_DETAILS: ROUTES.modals.alertDetails,
    PATIENT_DETAILS: ROUTES.modals.patientDetails,
    INVITE_MEMBER: ROUTES.modals.inviteMember,
  },
  AUTH_CALLBACK: ROUTES.authCallback,
  INDEX: ROUTES.index,
} as const;

// Type-safe route helpers
export function getLoginRoute(returnTo?: string): string {
  if (returnTo) {
    return `${ROUTES.auth.login}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return ROUTES.auth.login;
}

export function getAlertDetailsRoute(id: string): string {
  return ROUTES.tabs.alerts.detail(id);
}

// Navigation helpers
export const navigation = {
  // Navigate to alert detail
  goToAlertDetail: (id: string) => ROUTES.tabs.alerts.detail(id),
  
  // Navigate to patient detail
  goToPatientDetail: (id: string) => ROUTES.healthcare.patients.detail(id),
  
  // Navigate to patient vitals
  goToPatientVitals: (id: string) => ROUTES.healthcare.patients.vitals(id),
  
  // Open modal
  openAlertModal: (id: string) => ROUTES.modals.alertDetails(id),
  openPatientModal: (id: string) => ROUTES.modals.patientDetails(id),
  
  // Auth navigation
  goToLogin: () => ROUTES.auth.login,
  goToRegister: () => ROUTES.auth.register,
  goToHome: () => ROUTES.tabs.home,
};

// Page transition configurations
export const PAGE_TRANSITIONS = {
  // Slide transitions
  slide: {
    animation: 'slide-from-right',
    animationDuration: 300,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
  },
  
  // Modal transitions
  modal: {
    animation: 'slide-from-bottom',
    animationDuration: 400,
    gestureEnabled: true,
    gestureDirection: 'vertical',
    presentation: 'modal' as const,
  },
  
  // Fade transitions
  fade: {
    animation: 'fade',
    animationDuration: 200,
  },
  
  // iOS-style transitions
  ios: {
    animation: 'ios',
    animationDuration: 350,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
  },
} as const;

// Navigation options for different screen types
export const SCREEN_OPTIONS = {
  // Main screens
  main: {
    headerShown: true,
    ...PAGE_TRANSITIONS.ios,
  },
  
  // Modal screens
  modal: {
    headerShown: true,
    ...PAGE_TRANSITIONS.modal,
  },
  
  // Tab screens
  tab: {
    headerShown: false,
    ...PAGE_TRANSITIONS.fade,
  },
  
  // Auth screens
  auth: {
    headerShown: false,
    ...PAGE_TRANSITIONS.fade,
  },
} as const;