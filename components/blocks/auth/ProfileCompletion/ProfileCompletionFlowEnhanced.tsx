import React, { useState, useCallback, useRef, useEffect, useTransition } from 'react';
import { View, ScrollView, Alert as RNAlert, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  // interpolate,
  // Extrapolation,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/trpc';
import { Button as PrimaryButton } from '@/components/universal/interaction';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/universal/display';
import { Input, TextArea, Select } from '@/components/universal/form';
// import { RoleSelector } from '@/components/blocks/forms/RoleSelector/RoleSelector';
import { HealthcareRoleSelector } from '@/components/blocks/forms/RoleSelector/HealthcareRoleSelector';
import { HospitalSelector } from '@/components/blocks/forms/HospitalSelector/HospitalSelector';
import { CompleteProfileInputSchema } from '@/lib/validations/profile';
import { z } from 'zod';
import { log } from '@/lib/core/debug/logger';
import { useTheme } from '@/lib/theme/provider';
import { haptic } from '@/lib/ui/haptics';
import { Text } from '@/components/universal/typography/Text';
import { Alert } from '@/components/universal/feedback/Alert';
import { Symbol } from '@/components/universal/display/Symbols';

const logger = log;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Department options based on role
const getDepartmentOptions = (role: string) => {
  const healthcareRoles = ['doctor', 'nurse', 'head_doctor'];
  const emergencyRoles = ['operator'];
  
  if (healthcareRoles.includes(role)) {
    return [
      { label: 'Emergency Department', value: 'emergency' },
      { label: 'Intensive Care Unit (ICU)', value: 'icu' },
      { label: 'Cardiology', value: 'cardiology' },
      { label: 'Pediatrics', value: 'pediatrics' },
      { label: 'Surgery', value: 'surgery' },
      { label: 'Radiology', value: 'radiology' },
      { label: 'Pharmacy', value: 'pharmacy' },
      { label: 'Laboratory', value: 'laboratory' },
      { label: 'Maternity Ward', value: 'maternity' },
      { label: 'Oncology', value: 'oncology' },
      { label: 'Neurology', value: 'neurology' },
      { label: 'Orthopedics', value: 'orthopedics' },
      { label: 'Psychiatry', value: 'psychiatry' },
      { label: 'General Medicine', value: 'general_medicine' },
    ];
  } else if (emergencyRoles.includes(role)) {
    return [
      { label: 'Dispatch Center', value: 'dispatch_center' },
      { label: 'Emergency Response', value: 'emergency_response' },
      { label: 'Fire Dispatch', value: 'fire_dispatch' },
      { label: 'Police Dispatch', value: 'police_dispatch' },
      { label: 'Medical Dispatch', value: 'medical_dispatch' },
    ];
  } else {
    // Administrative and general departments for other roles
    return [
      { label: 'Administration', value: 'administration' },
      { label: 'Human Resources', value: 'human_resources' },
      { label: 'Finance', value: 'finance' },
      { label: 'IT Support', value: 'it_support' },
      { label: 'Engineering', value: 'engineering' },
      { label: 'Marketing', value: 'marketing' },
      { label: 'Sales', value: 'sales' },
      { label: 'Customer Service', value: 'customer_service' },
      { label: 'Operations', value: 'operations' },
      { label: 'Product', value: 'product' },
      { label: 'Research & Development', value: 'research' },
    ];
  }
};

interface ProfileCompletionFlowProps {
  onComplete?: () => void;
  showSkip?: boolean;
}

// Animated Checkbox Component
const AnimatedCheckbox = ({ 
  checked, 
  onPress, 
  theme 
}: { 
  checked: boolean; 
  onPress: () => void; 
  theme: any;
}) => {
  const scale = useSharedValue(1);
  const checkmarkScale = useSharedValue(checked ? 1 : 0);
  const hoverOpacity = useSharedValue(0);

  useEffect(() => {
    checkmarkScale.value = withSpring(checked ? 1 : 0, {
      damping: 15,
      stiffness: 300,
    });
  }, [checked]);

  const handlePress = () => {
    haptic('light');
    scale.value = withSpring(0.9, {
      damping: 15,
      stiffness: 400,
    }, () => {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
    });
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkScale.value,
  }));

  const hoverStyle = useAnimatedStyle(() => ({
    opacity: hoverOpacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onHoverIn={() => {
        if (Platform.OS === 'web') {
          hoverOpacity.value = withTiming(1, { duration: 200 });
        }
      }}
      onHoverOut={() => {
        if (Platform.OS === 'web') {
          hoverOpacity.value = withTiming(0, { duration: 200 });
        }
      }}
      style={[
        {
          width: 20,
          height: 20,
          borderWidth: 2,
          borderColor: checked ? theme.primary : theme.border,
          backgroundColor: checked ? theme.primary : 'transparent',
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        },
        animatedStyle,
      ]}
    >
      {Platform.OS === 'web' && (
        <Animated.View 
          style={[
            {
              position: 'absolute',
              inset: -4,
              backgroundColor: checked ? theme.primary : theme.mutedForeground,
              borderRadius: 8,
              opacity: 0.1,
            },
            hoverStyle,
          ]}
        />
      )}
      <Animated.View style={checkmarkAnimatedStyle}>
        <Text style={{ color: theme.background, fontSize: 12, fontWeight: 'bold' }}>✓</Text>
      </Animated.View>
    </AnimatedPressable>
  );
};

// Use server validation schema for consistency
type ProfileCompletionData = z.infer<typeof CompleteProfileInputSchema>;

export function ProfileCompletionFlowEnhanced({ onComplete, showSkip = false }: ProfileCompletionFlowProps) {
  const theme = useTheme();
  const router = useRouter();
  const { user, updateUserData, isAuthenticated, hasHydrated } = useAuth();
  const utils = api.useUtils();
  
  // Determine initial step based on user state
  const getInitialStep = () => {
    // If user already has name and role, skip to step 2 (organization/hospital)
    if (user?.name && user?.role && user?.role !== 'user') {
      return 2;
    }
    return 1;
  };
  
  const [currentStep, setCurrentStep] = useState(getInitialStep());
  const totalSteps = 3;
  const [isPending, startTransition] = useTransition();
  
  // Use refs to prevent infinite loops
  const isSubmittingRef = useRef(false);
  const hasCompletedRef = useRef(false);
  
  // Initialize all state hooks before any conditional returns
  const [formData, setFormData] = useState<ProfileCompletionData>({
    name: user?.name || '',
    role: user?.role === 'user' ? 'guest' : (user?.role || 'guest'), // Default to 'guest' instead of empty string
    organizationId: user?.organizationId || undefined,
    organizationCode: undefined,
    organizationName: undefined,
    defaultHospitalId: user?.defaultHospitalId || undefined,
    acceptTerms: true as const, // Set to true for OAuth users (literal type)
    acceptPrivacy: true as const, // Set to true for OAuth users (literal type)
    phoneNumber: undefined,
    department: undefined,
    jobTitle: undefined,
    bio: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [organizationsSearch, setOrganizationsSearch] = useState('');
  const [isJoiningOrganization, setIsJoiningOrganization] = useState(false);
  const [selectedOrganizationForJoining, setSelectedOrganizationForJoining] = useState<{
    id: string;
    name: string;
    type: string;
    size: string;
  } | null>(null);
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const [isSelectingHospital, setIsSelectingHospital] = useState(false);
  
  // Track profile completion status
  const [isProfileComplete, setIsProfileComplete] = useState(user?.needsProfileCompletion === false);

  // Define callbacks before using them in mutations
  const handleCompleteProfileSuccess = useCallback((data: { success: true; user: any; organizationId?: string; hospitalId?: string }) => {
      // Prevent duplicate executions
      if (hasCompletedRef.current) {
        logger.warn('Profile completion already processed, ignoring duplicate success', 'PROFILE_COMPLETION');
        return;
      }
      
      hasCompletedRef.current = true;
      logger.info('Profile completed successfully', 'PROFILE_COMPLETION', data);
      
      // Update auth state immediately without setTimeout to prevent timing issues
      if (data.user) {
        logger.info('Updating auth store with completed profile', 'PROFILE_COMPLETION', data.user);
        
        // Update user data with needsProfileCompletion set to false and all new data
        const updatedUserData = {
          ...data.user,
          needsProfileCompletion: false,
          role: data.user.role || formData.role, // Ensure role is updated
          organizationId: data.organizationId || data.user.organizationId,
          defaultHospitalId: data.hospitalId || data.user.defaultHospitalId,
        };
        
        logger.info('Updating user data with completed profile', 'PROFILE_COMPLETION', {
          role: updatedUserData.role,
          organizationId: updatedUserData.organizationId,
          defaultHospitalId: updatedUserData.defaultHospitalId,
          needsProfileCompletion: updatedUserData.needsProfileCompletion
        });
        
        updateUserData(updatedUserData as any);
        
        // Call onComplete callback if provided
        if (onComplete) {
          onComplete();
        }
        
        // Refresh session to ensure authentication state is updated
        setTimeout(async () => {
          try {
            logger.info('Refreshing session after profile completion', 'PROFILE_COMPLETION');
            
            // Invalidate and refetch the session
            await utils.auth.getSession.invalidate();
            const updatedSession = await utils.auth.getSession.fetch();
            
            logger.info('Updated session data', 'PROFILE_COMPLETION', updatedSession);
            
            // Navigate to home - the app will handle role-based routing
            if (updatedSession && !(updatedSession as any).user?.needsProfileCompletion) {
              logger.info('Navigating to home after profile completion', 'PROFILE_COMPLETION');
              router.replace('/');
            } else {
              logger.warn('Profile still marked as incomplete after update', 'PROFILE_COMPLETION');
              // Force navigation anyway since we know the update succeeded
              router.replace('/');
            }
          } catch (error) {
            logger.error('Error refreshing session', 'PROFILE_COMPLETION', error);
            // Navigate anyway since the profile update was successful
            router.replace('/');
          } finally {
            // Reset submission flag after navigation
            isSubmittingRef.current = false;
          }
        }, 100);
      }
      
      // Show success message (non-blocking on web)
      if (Platform.OS === 'web') {
        // On web, use a simple notification instead of Alert
        log.info('Profile Complete! 🎉 Welcome! Your profile has been set up successfully.', 'COMPONENT');
      } else {
        // On mobile, show the alert after navigation
        setTimeout(() => {
          RNAlert.alert(
            'Profile Complete! 🎉',
            'Welcome! Your profile has been set up successfully. You now have access to all features.',
            [{ text: 'OK' }]
          );
        }, 100);
      }
    }, [updateUserData, router, onComplete, utils, formData.role]);

  const handleCompleteProfileError = useCallback((error: any) => {
      isSubmittingRef.current = false;
      hasCompletedRef.current = false;
      logger.error('Failed to update profile', 'PROFILE_COMPLETION', {
        error: error,
        message: error.message,
        data: error.data,
        shape: error.shape
      });
      RNAlert.alert('Error', error.message || 'Failed to update profile');
    }, []);

  // Stabilized mutation to prevent re-creation on every render
  const completeProfileMutation = api.auth.completeProfile.useMutation({
    onMutate: async (variables) => {
      logger.info('Mutation onMutate called with variables:', 'PROFILE_COMPLETION', variables);
      return { variables };
    },
    onSuccess: handleCompleteProfileSuccess,
    onError: handleCompleteProfileError,
  });

  // TODO: Add validateOrganizationCode mutation when api.organization.joinByCode is available
  // For now, we'll skip the real-time validation and let the backend handle it on submit
  const validateOrganizationCode = {
    isPending: false,
    mutateAsync: async (data: { code: string }) => {
      logger.info('Organization code validation skipped - will be validated on submit', 'PROFILE_COMPLETION', data);
      return { organizationId: undefined };
    }
  };

  const handleSubmit = useCallback(async () => {
    // Debug log button click
    logger.info('Complete Profile button clicked', 'PROFILE_COMPLETION', {
      isSubmitting: isSubmittingRef.current,
      hasCompleted: hasCompletedRef.current,
      formData: formData,
      currentStep: currentStep
    });
    
    // Prevent duplicate submissions
    if (isSubmittingRef.current || hasCompletedRef.current) {
      logger.warn('Profile completion already in progress or completed', 'PROFILE_COMPLETION');
      return;
    }
    
    isSubmittingRef.current = true;
    let cleanedFormData: any; // Declare here so it's accessible in catch block
    
    try {
      // Clean data before validation - convert empty strings to undefined
      cleanedFormData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value === '' || value === null) {
          // For optional fields, convert empty strings to undefined
          if (['organizationCode', 'organizationName', 'organizationId', 'defaultHospitalId', 'phoneNumber', 'department', 'jobTitle', 'bio'].includes(key)) {
            acc[key] = undefined;
          } else {
            acc[key] = value; // Keep required fields as is
          }
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      // Ensure required fields are present
      if (!cleanedFormData.name || !cleanedFormData.role) {
        logger.error('Missing required fields', 'PROFILE_COMPLETION', {
          hasName: !!cleanedFormData.name,
          hasRole: !!cleanedFormData.role,
          formData: cleanedFormData
        });
        setErrors({ 
          name: !cleanedFormData.name ? 'Name is required' : undefined,
          role: !cleanedFormData.role ? 'Role is required' : undefined
        });
        isSubmittingRef.current = false;
        return;
      }
      
      // Additional validation for healthcare roles
      const healthcareRoles = ['doctor', 'nurse', 'head_doctor', 'operator'];
      if (healthcareRoles.includes(cleanedFormData.role)) {
        const validationErrors: Record<string, string> = {};
        
        // Healthcare roles must have department
        if (!cleanedFormData.department) {
          validationErrors.department = 'Department is required for healthcare roles';
        }
        
        // Note: Organization and hospital are optional for healthcare roles
        // The backend will handle organization/hospital creation if provided
        
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          isSubmittingRef.current = false;
          return;
        }
      }
      
      // Validate cleaned data
      const validatedData = CompleteProfileInputSchema.parse(cleanedFormData);
      
      // Update profile completion status
      setIsProfileComplete(true);
      
      logger.info('Submitting profile completion data', 'PROFILE_COMPLETION', { 
        fields: Object.keys(validatedData), 
        data: validatedData,
        formData: formData,
        cleanedFormData: cleanedFormData
      });
      
      logger.info('About to call mutation with data:', 'PROFILE_COMPLETION', validatedData);
      
      await completeProfileMutation.mutateAsync(validatedData);
    } catch (error) {
      isSubmittingRef.current = false;
      
      // Revert status on error
      setIsProfileComplete(false);
      
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        logger.warn('Validation errors', 'PROFILE_COMPLETION', {
          fieldErrors,
          zodErrors: error.errors,
          formData: formData
        });
      } else {
        logger.error('Non-validation error in handleSubmit', 'PROFILE_COMPLETION', {
          error,
          message: error?.message,
          formData: formData
        });
      }
    }
  }, [formData, completeProfileMutation, setIsProfileComplete]);

  const handleSkip = useCallback(() => {
    // Prevent navigation if already completed
    if (hasCompletedRef.current) {
      return;
    }
    
    RNAlert.alert(
      'Skip Profile Setup?',
      'You can complete your profile later from settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            logger.info('User skipped profile completion', 'PROFILE_COMPLETION');
            hasCompletedRef.current = true;
            // Navigate to home - the app will handle role-based routing
            router.replace('/');
          },
        },
      ]
    );
  }, [router]);

  const handleInputChange = useCallback((field: keyof ProfileCompletionData, value: string | boolean) => {
    // For optional string fields, convert empty strings to undefined
    let processedValue: any = value;
    if (typeof value === 'string' && value === '' && 
        ['organizationCode', 'organizationName', 'organizationId', 'defaultHospitalId', 'phoneNumber', 'department', 'jobTitle', 'bio'].includes(field)) {
      processedValue = undefined;
    }
    
    logger.info('Field updated', 'PROFILE_COMPLETION', { field, value: processedValue });
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    setErrors(prev => {
      if (prev[field]) {
        const { [field]: removed, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  // Handle organization code validation
  const handleOrganizationCodeBlur = useCallback(async () => {
    if (formData.organizationCode && formData.organizationCode.length > 0) {
      try {
        logger.info('Validating organization code', 'PROFILE_COMPLETION', { code: formData.organizationCode });
        const result = await validateOrganizationCode.mutateAsync({ 
          code: formData.organizationCode 
        });
        
        if (result.organizationId) {
          logger.info('Organization code validated, updating form', 'PROFILE_COMPLETION', { 
            organizationId: result.organizationId 
          });
          setFormData(prev => ({ 
            ...prev, 
            organizationId: result.organizationId,
            // Clear organization name as we're joining an existing org
            organizationName: undefined
          }));
        }
      } catch (error) {
        logger.error('Organization code validation failed', 'PROFILE_COMPLETION', error);
        // Error is already handled in the mutation's onError
      }
    }
  }, [formData.organizationCode]);

  const toggleAcceptTerms = useCallback(() => {
    const newValue = !formData.acceptTerms;
    logger.info('Toggling acceptTerms', 'PROFILE_COMPLETION', { from: formData.acceptTerms, to: newValue });
    setFormData(prev => ({ ...prev, acceptTerms: newValue as true }));
    setErrors(prev => {
      if (prev.acceptTerms) {
        const { acceptTerms: removed, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, [formData.acceptTerms]);

  const toggleAcceptPrivacy = useCallback(() => {
    const newValue = !formData.acceptPrivacy;
    logger.info('Toggling acceptPrivacy', 'PROFILE_COMPLETION', { from: formData.acceptPrivacy, to: newValue });
    setFormData(prev => ({ ...prev, acceptPrivacy: newValue as true }));
    setErrors(prev => {
      if (prev.acceptPrivacy) {
        const { acceptPrivacy: removed, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, [formData.acceptPrivacy]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  // Log the user state for debugging and update step if needed
  useEffect(() => {
    if (hasHydrated && user) {
      logger.info('Profile completion page - user state', 'PROFILE_COMPLETION', {
        userId: user.id,
        role: user.role,
        needsProfileCompletion: user.needsProfileCompletion,
        isAuthenticated,
        hasName: !!user.name,
        organizationId: user.organizationId,
        defaultHospitalId: user.defaultHospitalId,
        department: user.department
      });
      
      // Update step if user already has name and role
      if (user.name && user.role && user.role !== 'user' && currentStep === 1) {
        setCurrentStep(2);
      }
    }
  }, [hasHydrated, user, isAuthenticated, currentStep]);
  
  // Reset refs when component unmounts
  useEffect(() => {
    return () => {
      isSubmittingRef.current = false;
      hasCompletedRef.current = false;
    };
  }, []);
  
  // Show loading while auth state is being determined
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  
  // If user is not authenticated, don't show the form
  if (!isAuthenticated || !user) {
    logger.warn('Profile completion page accessed without authentication', 'PROFILE_COMPLETION');
    return null;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View className="space-y-4">
            <View className="space-y-2">
              <Input
                label="Full Name"
                isRequired={true}
                placeholder="Enter your full name"
                value={formData.name || ''}
                onChangeText={(value) => handleInputChange('name', value)}
                autoCapitalize="words"
                floatingLabel={false}
                leftElement={<Symbol name="person" size={20} color={theme.mutedForeground} />}
                rightElement={
                  formData.name && formData.name.length > 0 ? (
                    <Symbol name="checkmark.circle.fill" size={20} color={theme.primary} />
                  ) : null
                }
              />
              {errors.name && (
                <Text size="sm" color="destructive">{errors.name}</Text>
              )}
            </View>

            <View className="space-y-2">
              <Text size="sm" weight="medium" color="foreground">Role *</Text>
              {/* Use HealthcareRoleSelector for healthcare context */}
              <HealthcareRoleSelector
                selectedRole={formData.role as any}
                onRoleSelect={(role) => handleInputChange('role', role)}
              />
              {errors.role && (
                <Text size="sm" color="destructive">{errors.role}</Text>
              )}
            </View>

            <View className="space-y-2">
              <Input
                label="Job Title (Optional)"
                placeholder="e.g. Software Engineer"
                value={formData.jobTitle || ''}
                onChangeText={(value) => handleInputChange('jobTitle', value)}
                floatingLabel={false}
                leftElement={<Symbol name="briefcase" size={20} color={theme.mutedForeground} />}
              />
            </View>
          </View>
        );

      case 2:
        const healthcareRoles = ['doctor', 'nurse', 'head_doctor', 'operator'];
        const isHealthcareRole = healthcareRoles.includes(formData.role);
        
        // Role-specific information
        const getRoleInfo = () => {
          switch (formData.role) {
            case 'doctor':
            case 'nurse':
            case 'head_doctor':
              return {
                title: 'Healthcare Professional',
                description: 'Access patient alerts, shift management, and healthcare tools',
                details: 'Department is required for healthcare professionals to ensure proper patient care coordination.',
                icon: 'heart.circle',
                color: 'primary' as const
              };
            case 'operator':
              return {
                title: 'Emergency Operator',
                description: 'Real-time alerts and dispatch tools',
                details: 'Department helps route emergency calls to the right team.',
                icon: 'phone.badge.plus',
                color: 'destructive' as const
              };
            case 'manager':
              return {
                title: 'Team Manager',
                description: 'Team management and analytics',
                details: 'Department is optional - helps organize teams by function.',
                icon: 'person.2.circle',
                color: 'secondary' as const
              };
            case 'admin':
              return {
                title: 'System Administrator',
                description: 'Full system access and configuration',
                details: 'Department is optional - useful for larger organizations.',
                icon: 'gearshape.2',
                color: 'muted' as const
              };
            default:
              return null;
          }
        };
        
        const roleInfo = getRoleInfo();
        
        return (
          <View className="space-y-4">
            {/* Role-specific information card */}
            {roleInfo && (
              <Card 
                variant="glass-subtle"
                className="p-4 mb-4"
                shadow="sm"
                rounded="lg"
              >
                <View className="flex-row items-start space-x-3">
                  <View className="p-2 rounded-full" style={{ backgroundColor: theme[roleInfo.color] + '20' }}>
                    <Symbol 
                      name={roleInfo.icon as any} 
                      size={20} 
                      color={roleInfo.color}
                    />
                  </View>
                  <View className="flex-1">
                    <Text size="sm" weight="semibold" color="foreground">
                      {roleInfo.title}
                    </Text>
                    <Text size="xs" color="muted" style={{ marginTop: 2 }}>
                      {roleInfo.description}
                    </Text>
                  </View>
                </View>
              </Card>
            )}
            {/* Organization selection for all roles */}
            <View className="space-y-2">
              <Input
                label={`${isHealthcareRole ? 'Hospital/Organization Code' : 'Organization Code'} (Optional)`}
                placeholder={isHealthcareRole ? "Enter hospital or organization code" : "Enter organization code"}
                value={formData.organizationCode || ''}
                onChangeText={(value) => handleInputChange('organizationCode', value)}
                onBlur={handleOrganizationCodeBlur}
                autoCapitalize="characters"
                floatingLabel={false}
                leftElement={<Symbol name="building.2" size={20} color={theme.mutedForeground} />}
                rightElement={
                  validateOrganizationCode.isPending ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : formData.organizationId && formData.organizationCode ? (
                    <Symbol name="checkmark.circle.fill" size={20} color={theme.primary} />
                  ) : null
                }
              />
              {errors.organizationCode && (
                <Text size="sm" color="destructive">{errors.organizationCode}</Text>
              )}
              
              {/* Show organization name field if not joining existing org */}
              {!formData.organizationCode && formData.role !== 'guest' && (
                <View className="mt-4">
                  <Input
                    label={`${isHealthcareRole ? 'Hospital/Organization Name' : 'Organization Name'} (Optional)`}
                    placeholder={isHealthcareRole ? "Enter hospital or organization name" : "Enter organization name"}
                    value={formData.organizationName || ''}
                    onChangeText={(value) => handleInputChange('organizationName', value)}
                    floatingLabel={false}
                    leftElement={<Symbol name="building" size={20} color={theme.mutedForeground} />}
                  />
                  {errors.organizationName && (
                    <Text size="sm" color="destructive">{errors.organizationName}</Text>
                  )}
                </View>
              )}
            </View>

            {/* Hospital selection for healthcare roles when organization is selected */}
            {isHealthcareRole && (
              <View className="space-y-2">
                <Text size="sm" weight="medium" color="foreground">Hospital Assignment (Optional)</Text>
                <Text size="xs" color="muted" style={{ marginBottom: 8 }}>
                  Healthcare professionals can optionally be assigned to a hospital
                </Text>
                {/* Show hospital selector if user has organizationId OR they're entering org details */}
                {(formData.organizationId || formData.organizationCode || formData.organizationName) ? (
                  formData.organizationId ? (
                    <HospitalSelector
                      organizationId={formData.organizationId}
                      value={formData.defaultHospitalId}
                      onChange={(hospitalId) => handleInputChange('defaultHospitalId', hospitalId)}
                      error={errors.defaultHospitalId}
                    />
                  ) : (
                    <Text size="sm" color="muted" style={{ fontStyle: 'italic' }}>
                      {formData.organizationCode 
                        ? "Hospital will be available after joining organization" 
                        : "Hospital will be created when you create the organization"}
                    </Text>
                  )
                ) : (
                  <Text size="sm" color="warning">
                    Please enter an organization code or name above to continue
                  </Text>
                )}
              </View>
            )}

            <View className="space-y-2">
              <Select
                label={`Department ${isHealthcareRole ? '(Required)' : '(Optional)'}`}
                value={formData.department || ''}
                onValueChange={(value) => handleInputChange('department', typeof value === 'string' ? value : value[0])}
                placeholder="Select a department"
                error={errors.department}
                options={getDepartmentOptions(formData.role)}
                variant="outline"
                size="md"
                searchable
                animated
              />
              {roleInfo?.details && (
                <Text size="xs" color="muted">{roleInfo.details}</Text>
              )}
            </View>

            <View className="space-y-2">
              <Input
                label="Phone Number (Optional)"
                placeholder="+1 (555) 123-4567"
                value={formData.phoneNumber || ''}
                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                keyboardType="phone-pad"
                floatingLabel={false}
                leftElement={<Symbol name="phone" size={20} color={theme.mutedForeground} />}
              />
              {errors.phoneNumber && (
                <Text size="sm" color="destructive">{errors.phoneNumber}</Text>
              )}
            </View>
          </View>
        );

      case 3:
        // Log form data when reaching final step
        React.useEffect(() => {
          logger.info('Reached final step with form data', 'PROFILE_COMPLETION', {
            formData: formData,
            errors: errors,
            role: formData.role,
            hasName: !!formData.name,
            hasDepartment: !!formData.department,
            acceptTerms: formData.acceptTerms,
            acceptPrivacy: formData.acceptPrivacy
          });
        }, []);
        
        return (
          <View className="space-y-4">
            {/* Final step information */}
            <Card 
              variant="glass-subtle"
              className="p-4 mb-4"
              shadow="sm"
              rounded="lg"
            >
              <View className="flex-row items-start space-x-3">
                <View className="p-2 rounded-full" style={{ backgroundColor: theme.primary + '20' }}>
                  <Symbol 
                    name="checkmark.seal" 
                    size={20} 
                    color="primary"
                  />
                </View>
                <View className="flex-1">
                  <Text size="sm" weight="semibold" color="foreground">
                    Almost Done!
                  </Text>
                  <Text size="xs" color="muted" style={{ marginTop: 2 }}>
                    Add a bio and accept our terms to complete your profile
                  </Text>
                </View>
              </View>
            </Card>
            
            <View className="space-y-2">
              <TextArea
                label="Bio (Optional)"
                placeholder="Share your background and expertise..."
                value={formData.bio || ''}
                onChangeText={(value) => handleInputChange('bio', value)}
                rows={5}
                maxRows={8}
                size="default"
                variant="default"
                error={errors.bio}
                showCharacterCount
                characterLimit={500}
                style={{ marginBottom: 8 }}
              />
              <Text size="sm" color="muted">
                Tell us about your professional background, skills, and what you bring to the team
              </Text>
            </View>

            <View className="space-y-4">
              <Text size="sm" weight="medium" color="foreground">Terms and Privacy *</Text>
              
              <View className="flex-row items-start space-x-3">
                <AnimatedCheckbox
                  checked={formData.acceptTerms}
                  onPress={toggleAcceptTerms}
                  theme={theme}
                />
                <View style={{ flex: 1 }}>
                  <Text size="sm" color="foreground">
                    I accept the{' '}
                    <Text size="sm" color="primary">Terms and Conditions</Text>
                  </Text>
                </View>
              </View>
              {errors.acceptTerms && (
                <Text size="sm" color="destructive">{errors.acceptTerms}</Text>
              )}

              <View className="flex-row items-start space-x-3">
                <AnimatedCheckbox
                  checked={formData.acceptPrivacy}
                  onPress={toggleAcceptPrivacy}
                  theme={theme}
                />
                <View style={{ flex: 1 }}>
                  <Text size="sm" color="foreground">
                    I accept the{' '}
                    <Text size="sm" color="primary">Privacy Policy</Text>
                  </Text>
                </View>
              </View>
              {errors.acceptPrivacy && (
                <Text size="sm" color="destructive">{errors.acceptPrivacy}</Text>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center items-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>
                {user?.email ? `Welcome, ${user.email}!` : 'Welcome!'} Let&apos;s set up your profile.
              </CardDescription>
              
              {/* Progress indicator */}
              <View className="flex-row justify-center mt-4 space-x-2">
                {[1, 2, 3].map((step) => (
                  <View
                    key={step}
                    className={`h-2 w-16 rounded-full ${
                      step <= currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </View>
              <Text size="sm" color="muted" align="center" style={{ marginTop: 8 }}>
                Step {currentStep} of {totalSteps}
              </Text>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {renderStep()}
              
              {/* Debug: Show any validation errors */}
              {__DEV__ && Object.keys(errors).length > 0 && (
                <Alert variant="destructive">
                  <Text size="sm" weight="semibold">Validation Errors:</Text>
                  {Object.entries(errors).map(([field, error]) => (
                    <Text key={field} size="xs" color="destructive">
                      {field}: {error}
                    </Text>
                  ))}
                </Alert>
              )}

              <View className="space-y-3 pt-6">
                <View className="flex-row space-x-3">
                  {currentStep > 1 && (
                    <View className="flex-1">
                      <PrimaryButton
                        onPress={prevStep}
                        variant="outline"
                      >
                        Previous
                      </PrimaryButton>
                    </View>
                  )}
                  
                  <View className="flex-1">
                    {currentStep < totalSteps ? (
                      <PrimaryButton
                        onPress={nextStep}
                        variant="default"
                      >
                        Next
                      </PrimaryButton>
                    ) : (
                      <>
                        {/* Debug info */}
                        {__DEV__ && (
                          <Text size="xs" color="muted" style={{ marginBottom: 8 }}>
                            Debug: isPending={String(completeProfileMutation.isPending)}, 
                            isSubmitting={String(isSubmittingRef.current)}, 
                            hasCompleted={String(hasCompletedRef.current)}
                          </Text>
                        )}
                        <PrimaryButton
                          onPress={() => {
                            logger.info('Button onPress triggered', 'PROFILE_COMPLETION', {
                              isPending: completeProfileMutation.isPending,
                              isSubmitting: isSubmittingRef.current,
                              hasCompleted: hasCompletedRef.current
                            });
                            handleSubmit();
                          }}
                          disabled={completeProfileMutation.isPending || isSubmittingRef.current || hasCompletedRef.current}
                          isLoading={completeProfileMutation.isPending || isSubmittingRef.current}
                          variant="default"
                        >
                          Complete Profile
                        </PrimaryButton>
                      </>
                    )}
                  </View>
                </View>
                
                {showSkip && currentStep === 1 && (
                  <PrimaryButton
                    onPress={handleSkip}
                    disabled={completeProfileMutation.isPending || hasCompletedRef.current}
                    variant="ghost"
                  >
                    Skip for Now
                  </PrimaryButton>
                )}
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}