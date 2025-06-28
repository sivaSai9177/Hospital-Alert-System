/**
 * Onboarding Constants and Configuration
 */

import type { OnboardingStepConfig, RoleOption } from '../types';

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get started with healthcare alerts',
    icon: 'hand.wave',
    required: true,
  },
  {
    id: 'role-selection',
    title: 'Select Your Role',
    description: 'Choose your healthcare profession',
    icon: 'person.badge.plus',
    required: true,
  },
  {
    id: 'registration',
    title: 'Create Account',
    description: 'Set up your secure account',
    icon: 'person.circle',
    required: true,
  },
  {
    id: 'email-verification',
    title: 'Verify Email',
    description: 'Confirm your email address',
    icon: 'envelope.badge',
    required: true,
  },
  {
    id: 'phone-verification',
    title: 'Phone Number',
    description: 'Add phone for SMS alerts',
    icon: 'phone.badge.plus',
    required: false,
  },
  {
    id: 'profile-setup',
    title: 'Professional Profile',
    description: 'Add your professional details',
    icon: 'doc.text',
    required: true,
    requiresRole: ['doctor', 'nurse', 'head_doctor'],
  },
  {
    id: 'hospital-setup',
    title: 'Select Hospital',
    description: 'Choose or request your hospital',
    icon: 'building.2',
    required: true,
  },
  {
    id: 'department-setup',
    title: 'Department',
    description: 'Select your department',
    icon: 'square.stack.3d.up',
    required: false,
    requiresRole: ['doctor', 'nurse', 'head_doctor'],
  },
  {
    id: 'permissions',
    title: 'Permissions',
    description: 'Enable notifications and features',
    icon: 'bell.badge',
    required: false,
  },
  {
    id: 'completion',
    title: 'All Set!',
    description: 'Welcome to the platform',
    icon: 'checkmark.circle.fill',
    required: true,
  },
];

export const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'doctor',
    title: 'Doctor',
    description: 'Medical practitioner providing patient care',
    icon: 'stethoscope',
    color: '#3b82f6',
    features: [
      'Receive and acknowledge alerts',
      'Access patient records',
      'Update patient status',
      'View department analytics',
    ],
    requiresLicense: true,
  },
  {
    id: 'nurse',
    title: 'Nurse',
    description: 'Healthcare professional providing patient support',
    icon: 'heart.text.square',
    color: '#10b981',
    features: [
      'Receive and acknowledge alerts',
      'Monitor patient vitals',
      'Update care notes',
      'Coordinate with doctors',
    ],
    requiresLicense: true,
  },
  {
    id: 'head_doctor',
    title: 'Head Doctor',
    description: 'Department head with administrative access',
    icon: 'person.2.badge.gearshape',
    color: '#8b5cf6',
    features: [
      'All doctor permissions',
      'Manage department staff',
      'View department analytics',
      'Configure alert routing',
    ],
    requiresLicense: true,
  },
  {
    id: 'operator',
    title: 'Emergency Operator',
    description: 'Dispatch and coordinate emergency responses',
    icon: 'phone.badge.plus',
    color: '#ef4444',
    features: [
      'Create emergency alerts',
      'Monitor alert status',
      'Coordinate responses',
      'View hospital overview',
    ],
    requiresLicense: false,
  },
  {
    id: 'admin',
    title: 'Administrator',
    description: 'System administrator with full access',
    icon: 'gearshape.2',
    color: '#6b7280',
    features: [
      'Full system access',
      'Manage users and roles',
      'Configure hospitals',
      'View system analytics',
    ],
    requiresLicense: false,
  },
];

export const SPECIALIZATIONS = [
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'emergency', label: 'Emergency Medicine' },
  { value: 'internal_medicine', label: 'Internal Medicine' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'oncology', label: 'Oncology' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'anesthesiology', label: 'Anesthesiology' },
  { value: 'general_practice', label: 'General Practice' },
];

export const EXPERIENCE_RANGES = [
  { value: '0-2', label: 'Less than 2 years' },
  { value: '2-5', label: '2-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10-20', label: '10-20 years' },
  { value: '20+', label: 'More than 20 years' },
];

export const SHIFT_PREFERENCES = [
  { value: 'day', label: 'Day Shift', icon: 'sun.max', description: '6 AM - 6 PM' },
  { value: 'night', label: 'Night Shift', icon: 'moon.stars', description: '6 PM - 6 AM' },
  { value: 'rotating', label: 'Rotating Shifts', icon: 'arrow.triangle.2.circlepath', description: 'Flexible schedule' },
];

export const ONBOARDING_STORAGE_KEY = 'healthcare_onboarding_state';
export const ONBOARDING_TIMEOUT = 30 * 60 * 1000; // 30 minutes