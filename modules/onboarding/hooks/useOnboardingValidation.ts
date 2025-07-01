/**
 * Onboarding Validation Hook
 * Provides validation utilities for all onboarding forms
 */

import { useState, useCallback } from 'react';
import { z } from 'zod';

// Validation schemas for each step
export const onboardingSchemas = {
  registration: z.object({
    email: z.string().email('Please enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' }),
    }),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the privacy policy' }),
    }),
  }),

  profile: z.object({
    specialization: z.string().min(1, 'Please select your specialization'),
    yearsOfExperience: z.string().min(1, 'Please select your experience'),
    shiftPreference: z.string().min(1, 'Please select your shift preference'),
    phoneNumber: z.string().optional(),
    bio: z.string().optional(),
    profilePhotoUrl: z.string().optional(),
  }),

  // Add license for medical roles
  profileWithLicense: z.object({
    specialization: z.string().min(1, 'Please select your specialization'),
    yearsOfExperience: z.string().min(1, 'Please select your experience'),
    shiftPreference: z.string().min(1, 'Please select your shift preference'),
    licenseNumber: z
      .string()
      .min(5, 'License number must be at least 5 characters')
      .regex(/^[A-Z0-9-]+$/, 'Invalid license format (use uppercase letters, numbers, and hyphens)'),
    phoneNumber: z.string().optional(),
    bio: z.string().optional(),
    profilePhotoUrl: z.string().optional(),
  }),

  hospital: z.object({
    hospitalId: z.string().uuid('Please select a valid hospital'),
    inviteCode: z.string().optional(),
  }),

  department: z.object({
    departmentId: z.string().min(1, 'Please select a department'),
  }),

  emailVerification: z.object({
    code: z.string().length(6, 'Verification code must be 6 digits'),
  }),

  phoneVerification: z.object({
    phoneNumber: z
      .string()
      .regex(/^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, 'Please enter a valid phone number'),
    code: z.string().length(6, 'Verification code must be 6 digits').optional(),
  }),
};

// Error state type
export type ValidationErrors = Record<string, string>;

// Validation hook
export function useOnboardingValidation<T extends keyof typeof onboardingSchemas>(
  schemaName?: T
) {
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Clear specific error
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Set specific error
  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  // Validate a single field
  const validateField = useCallback(
    (field: string, value: any, schema?: z.ZodSchema) => {
      try {
        if (!schema && !schemaName) {
          console.warn('No schema provided for validation');
          return true;
        }

        const fieldSchema = schema || onboardingSchemas[schemaName!];
        
        // Try to validate just the specific field if possible
        if (fieldSchema instanceof z.ZodObject) {
          const shape = fieldSchema.shape as any;
          if (shape[field]) {
            shape[field].parse(value);
            clearError(field);
            return true;
          }
        }

        // Fallback to full validation
        const result = fieldSchema.safeParse({ [field]: value });
        if (!result.success) {
          const fieldError = result.error.errors.find((e) => e.path[0] === field);
          if (fieldError) {
            setError(field, fieldError.message);
            return false;
          }
        }
        
        clearError(field);
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find((e) => e.path[0] === field);
          if (fieldError) {
            setError(field, fieldError.message);
          }
          return false;
        }
        return false;
      }
    },
    [schemaName, clearError, setError]
  );

  // Validate entire form
  const validate = useCallback(
    (data: any, schema?: z.ZodSchema) => {
      try {
        if (!schema && !schemaName) {
          console.warn('No schema provided for validation');
          return { isValid: true, errors: {}, data };
        }

        const validationSchema = schema || onboardingSchemas[schemaName!];
        const result = validationSchema.safeParse(data);

        if (!result.success) {
          const newErrors: ValidationErrors = {};
          result.error.errors.forEach((error) => {
            const field = error.path.join('.');
            newErrors[field] = error.message;
          });
          setErrors(newErrors);
          return { isValid: false, errors: newErrors, data: null };
        }

        clearErrors();
        return { isValid: true, errors: {}, data: result.data };
      } catch (error) {
        console.error('Validation error:', error);
        return { isValid: false, errors: { general: 'Validation failed' }, data: null };
      }
    },
    [schemaName, clearErrors]
  );

  // Check if form has any errors
  const hasErrors = useCallback(() => {
    return Object.keys(errors).length > 0;
  }, [errors]);

  // Get error for specific field
  const getError = useCallback(
    (field: string) => {
      return errors[field] || '';
    },
    [errors]
  );

  return {
    errors,
    setError,
    clearError,
    clearErrors,
    validateField,
    validate,
    hasErrors,
    getError,
    setErrors,
  };
}