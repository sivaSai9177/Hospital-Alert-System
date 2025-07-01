/**
 * Onboarding Module Types
 * Comprehensive type definitions for the healthcare onboarding flow
 */

export type UserRole = 'doctor' | 'nurse' | 'head_doctor' | 'operator' | 'admin';

export type OnboardingStep = 
  | 'welcome'
  | 'role-selection'
  | 'registration'
  | 'email-verification'
  | 'profile-setup'
  | 'hospital-setup'
  | 'department-setup'
  | 'permissions'
  | 'completion';

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  userData: Partial<UserProfile>;
  selectedRole?: UserRole;
  selectedHospital?: Hospital;
  selectedDepartment?: Department;
  progress: number;
  skippedSteps: OnboardingStep[];
  startedAt: string;
  lastActiveAt: string;
}

export interface UserProfile {
  // Basic Information
  email: string;
  name: string;
  phone?: string;
  profilePhoto?: string;
  
  // Professional Information
  role: UserRole;
  licenseNumber?: string;
  specialization?: string;
  yearsOfExperience?: number;
  qualifications?: string[];
  
  // Organization
  hospitalId?: string;
  departmentId?: string;
  shiftPreference?: 'day' | 'night' | 'rotating';
  
  // Preferences
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  locationEnabled: boolean;
  
  // Metadata
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
}

export interface Hospital {
  id: string;
  name: string;
  code: string;
  address: string;
  logo?: string;
  departments: Department[];
  requiresInvitation: boolean;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  icon?: string;
  headDoctorId?: string;
  isActive: boolean;
}

export interface OnboardingStepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  requiresRole?: UserRole[];
  validation?: (data: Partial<UserProfile>) => boolean;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  percentComplete: number;
  estimatedTimeRemaining: number; // in seconds
}

export interface RoleOption {
  id: UserRole;
  title: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  requiresLicense: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface OnboardingAnalytics {
  stepStarted: (step: OnboardingStep) => void;
  stepCompleted: (step: OnboardingStep, timeSpent: number) => void;
  stepSkipped: (step: OnboardingStep, reason?: string) => void;
  onboardingCompleted: (totalTime: number, skippedSteps: OnboardingStep[]) => void;
  errorOccurred: (step: OnboardingStep, error: Error) => void;
}