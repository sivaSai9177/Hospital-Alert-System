/**
 * Centralized permissions configuration
 * Defines all roles, permissions, and feature access in the application
 */

// User roles
export const USER_ROLES = {
  // Admin roles
  ADMIN: 'admin',
  
  // Organization roles
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest',
  
  // Healthcare roles
  OPERATOR: 'operator',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  HEAD_DOCTOR: 'head_doctor',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Role groups for easier checking
export const ROLE_GROUPS = {
  HEALTHCARE_ROLES: [
    USER_ROLES.DOCTOR,
    USER_ROLES.NURSE,
    USER_ROLES.HEAD_DOCTOR,
    USER_ROLES.OPERATOR,
  ],
  ADMIN_ROLES: [
    USER_ROLES.ADMIN,
  ],
  MANAGEMENT_ROLES: [
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.HEAD_DOCTOR,
  ],
  STAFF_ROLES: [
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.USER,
    USER_ROLES.DOCTOR,
    USER_ROLES.NURSE,
    USER_ROLES.HEAD_DOCTOR,
    USER_ROLES.OPERATOR,
  ],
  MEDICAL_STAFF: [
    USER_ROLES.DOCTOR,
    USER_ROLES.NURSE,
    USER_ROLES.HEAD_DOCTOR,
  ],
} as const;

// Permission definitions
export const PERMISSIONS = {
  // General permissions
  VIEW_CONTENT: 'view_content',
  EDIT_PROFILE: 'edit_profile',
  
  // User management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  
  // Organization management
  MANAGE_ORGANIZATION: 'manage_organization',
  VIEW_ORGANIZATION: 'view_organization',
  INVITE_MEMBERS: 'invite_members',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_ANALYTICS: 'export_analytics',
  
  // Healthcare specific
  CREATE_ALERTS: 'create_alerts',
  VIEW_ALERTS: 'view_alerts',
  ACKNOWLEDGE_ALERTS: 'acknowledge_alerts',
  RESOLVE_ALERTS: 'resolve_alerts',
  ESCALATE_ALERTS: 'escalate_alerts',
  
  VIEW_PATIENTS: 'view_patients',
  MANAGE_PATIENTS: 'manage_patients',
  CREATE_PATIENTS: 'create_patients',
  
  VIEW_HEALTHCARE_DATA: 'view_healthcare_data',
  VIEW_ACTIVITY_LOGS: 'view_activity_logs',
  
  // Team management
  VIEW_TEAM: 'view_team',
  MANAGE_TEAM: 'manage_team',
  MANAGE_SCHEDULE: 'manage_schedule',
  
  // Shift management
  START_SHIFT: 'start_shift',
  END_SHIFT: 'end_shift',
  VIEW_SHIFT_STATUS: 'view_shift_status',
  MANAGE_SHIFTS: 'manage_shifts',
  VIEW_SHIFT_REPORTS: 'view_shift_reports',
  
  // Reports
  VIEW_REPORTS: 'view_reports',
  CREATE_REPORTS: 'create_reports',
  
  // System
  VIEW_SYSTEM_SETTINGS: 'view_system_settings',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  
  // All permissions (admin only)
  ALL: '*',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [USER_ROLES.ADMIN]: [PERMISSIONS.ALL],
  
  [USER_ROLES.MANAGER]: [
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.EDIT_PROFILE,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_SCHEDULE,
  ],
  
  [USER_ROLES.USER]: [
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.EDIT_PROFILE,
    PERMISSIONS.VIEW_ORGANIZATION,
  ],
  
  [USER_ROLES.GUEST]: [
    PERMISSIONS.VIEW_CONTENT,
  ],
  
  // Healthcare roles
  [USER_ROLES.OPERATOR]: [
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.EDIT_PROFILE,
    PERMISSIONS.CREATE_ALERTS,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.VIEW_ACTIVITY_LOGS,
    PERMISSIONS.VIEW_HEALTHCARE_DATA,
    PERMISSIONS.START_SHIFT,
    PERMISSIONS.END_SHIFT,
    PERMISSIONS.VIEW_SHIFT_STATUS,
  ],
  
  [USER_ROLES.DOCTOR]: [
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.EDIT_PROFILE,
    PERMISSIONS.CREATE_ALERTS,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.ACKNOWLEDGE_ALERTS,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.RESOLVE_ALERTS,
    PERMISSIONS.VIEW_HEALTHCARE_DATA,
    PERMISSIONS.VIEW_ACTIVITY_LOGS,
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.START_SHIFT,
    PERMISSIONS.END_SHIFT,
    PERMISSIONS.VIEW_SHIFT_STATUS,
  ],
  
  [USER_ROLES.NURSE]: [
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.EDIT_PROFILE,
    PERMISSIONS.CREATE_ALERTS,
    PERMISSIONS.ACKNOWLEDGE_ALERTS,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.VIEW_HEALTHCARE_DATA,
    PERMISSIONS.VIEW_ACTIVITY_LOGS,
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.START_SHIFT,
    PERMISSIONS.END_SHIFT,
    PERMISSIONS.VIEW_SHIFT_STATUS,
  ],
  
  [USER_ROLES.HEAD_DOCTOR]: [
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.EDIT_PROFILE,
    PERMISSIONS.CREATE_ALERTS,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.MANAGE_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.ACKNOWLEDGE_ALERTS,
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.RESOLVE_ALERTS,
    PERMISSIONS.ESCALATE_ALERTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_HEALTHCARE_DATA,
    PERMISSIONS.VIEW_ACTIVITY_LOGS,
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.MANAGE_SCHEDULE,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.CREATE_REPORTS,
    PERMISSIONS.START_SHIFT,
    PERMISSIONS.END_SHIFT,
    PERMISSIONS.VIEW_SHIFT_STATUS,
    PERMISSIONS.MANAGE_SHIFTS,
    PERMISSIONS.VIEW_SHIFT_REPORTS,
  ],
};

// Feature flags based on permissions
export const FEATURES = {
  ALERTS_DASHBOARD: 'alerts_dashboard',
  PATIENT_MANAGEMENT: 'patient_management',
  ANALYTICS: 'analytics',
  TEAM_MANAGEMENT: 'team_management',
  ORGANIZATION_SETTINGS: 'organization_settings',
  SYSTEM_ADMIN: 'system_admin',
  ACTIVITY_LOGS: 'activity_logs',
  REPORTS: 'reports',
  SCHEDULE_MANAGEMENT: 'schedule_management',
  SHIFT_MANAGEMENT: 'shift_management',
} as const;

export type Feature = typeof FEATURES[keyof typeof FEATURES];

// Feature-permission mapping
export const FEATURE_PERMISSIONS: Record<Feature, Permission[]> = {
  [FEATURES.ALERTS_DASHBOARD]: [
    PERMISSIONS.VIEW_ALERTS,
    PERMISSIONS.CREATE_ALERTS,
    PERMISSIONS.ACKNOWLEDGE_ALERTS,
  ],
  [FEATURES.PATIENT_MANAGEMENT]: [
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.MANAGE_PATIENTS,
  ],
  [FEATURES.ANALYTICS]: [
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  [FEATURES.TEAM_MANAGEMENT]: [
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.MANAGE_TEAM,
  ],
  [FEATURES.ORGANIZATION_SETTINGS]: [
    PERMISSIONS.VIEW_ORGANIZATION,
    PERMISSIONS.MANAGE_ORGANIZATION,
  ],
  [FEATURES.SYSTEM_ADMIN]: [
    PERMISSIONS.VIEW_SYSTEM_SETTINGS,
    PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
  ],
  [FEATURES.ACTIVITY_LOGS]: [
    PERMISSIONS.VIEW_ACTIVITY_LOGS,
  ],
  [FEATURES.REPORTS]: [
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.CREATE_REPORTS,
  ],
  [FEATURES.SCHEDULE_MANAGEMENT]: [
    PERMISSIONS.MANAGE_SCHEDULE,
  ],
  [FEATURES.SHIFT_MANAGEMENT]: [
    PERMISSIONS.START_SHIFT,
    PERMISSIONS.END_SHIFT,
    PERMISSIONS.VIEW_SHIFT_STATUS,
  ],
};

// Helper functions
export function hasPermission(userRole: UserRole | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(PERMISSIONS.ALL) || permissions.includes(permission);
}

export function hasAnyPermission(userRole: UserRole | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false;
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: UserRole | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false;
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function hasRole(userRole: UserRole | undefined, allowedRoles: readonly UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function hasFeatureAccess(userRole: UserRole | undefined, feature: Feature): boolean {
  if (!userRole) return false;
  const requiredPermissions = FEATURE_PERMISSIONS[feature] || [];
  return hasAnyPermission(userRole, requiredPermissions);
}

export function isHealthcareRole(userRole: UserRole | undefined): boolean {
  return hasRole(userRole, ROLE_GROUPS.HEALTHCARE_ROLES);
}

export function isAdminRole(userRole: UserRole | undefined): boolean {
  return hasRole(userRole, ROLE_GROUPS.ADMIN_ROLES);
}

export function isManagementRole(userRole: UserRole | undefined): boolean {
  return hasRole(userRole, ROLE_GROUPS.MANAGEMENT_ROLES);
}

export function isMedicalStaff(userRole: UserRole | undefined): boolean {
  return hasRole(userRole, ROLE_GROUPS.MEDICAL_STAFF);
}

// Hospital-based permission checks
export interface HospitalContext {
  userRole: UserRole | undefined;
  userHospitalId: string | undefined;
  targetHospitalId: string | undefined;
  userOrganizationId: string | undefined;
  targetOrganizationId: string | undefined;
}

export function canAccessHospital(context: HospitalContext): boolean {
  const { userRole, userHospitalId, targetHospitalId, userOrganizationId, targetOrganizationId } = context;
  
  // No role = no access
  if (!userRole) return false;
  
  // Admins can access any hospital
  if (isAdminRole(userRole)) return true;
  
  // Healthcare roles can only access their assigned hospital
  if (isHealthcareRole(userRole)) {
    return userHospitalId === targetHospitalId;
  }
  
  // Managers can access any hospital in their organization
  if (userRole === USER_ROLES.MANAGER && userOrganizationId && targetOrganizationId) {
    return userOrganizationId === targetOrganizationId;
  }
  
  return false;
}

export function canManageHospital(context: HospitalContext): boolean {
  const { userRole, userOrganizationId, targetOrganizationId } = context;
  
  // Admins can manage any hospital
  if (isAdminRole(userRole)) return true;
  
  // Managers can manage hospitals in their organization
  if (userRole === USER_ROLES.MANAGER && userOrganizationId === targetOrganizationId) {
    return true;
  }
  
  // Head doctors can manage their hospital
  if (userRole === USER_ROLES.HEAD_DOCTOR) {
    return canAccessHospital(context);
  }
  
  return false;
}

export function canAccessPatientInHospital(context: HospitalContext): boolean {
  // Must be able to access the hospital
  if (!canAccessHospital(context)) return false;
  
  // Medical staff can access patients
  return isMedicalStaff(context.userRole);
}

export function canCreateAlertInHospital(context: HospitalContext): boolean {
  // Must be able to access the hospital
  if (!canAccessHospital(context)) return false;
  
  // Check if role has alert creation permission
  return hasPermission(context.userRole, PERMISSIONS.CREATE_ALERTS);
}

export function canResolveAlertInHospital(context: HospitalContext): boolean {
  // Must be able to access the hospital
  if (!canAccessHospital(context)) return false;
  
  // Only doctors and head doctors can resolve alerts
  return hasPermission(context.userRole, PERMISSIONS.RESOLVE_ALERTS);
}

export function canStartShift(context: HospitalContext): boolean {
  // Must be able to access the hospital
  if (!canAccessHospital(context)) return false;
  
  // Check if role has shift start permission
  return hasPermission(context.userRole, PERMISSIONS.START_SHIFT);
}

export function canEndShift(context: HospitalContext): boolean {
  // Must be able to access the hospital
  if (!canAccessHospital(context)) return false;
  
  // Check if role has shift end permission
  return hasPermission(context.userRole, PERMISSIONS.END_SHIFT);
}

export function canViewShiftStatus(userRole: UserRole | undefined): boolean {
  return hasPermission(userRole, PERMISSIONS.VIEW_SHIFT_STATUS);
}

export function canManageShifts(userRole: UserRole | undefined): boolean {
  return hasPermission(userRole, PERMISSIONS.MANAGE_SHIFTS);
}