import React, { useState, useCallback, useEffect } from 'react';
import { Platform, ScrollView, KeyboardAvoidingView, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { 
  GlassCard, 
  ActivityIndicator,
  Symbol 
} from '@/components/universal/display';
import { 
  VStack, 
  HStack,
  Stack,
  ResponsiveGrid 
} from '@/components/universal/layout';
import { Text } from '@/components/universal/typography';
import { Button } from '@/components/universal/interaction';
import { 
  DatePicker,
  Input,
  SelectionButton,
  TextArea 
} from '@/components/universal/form';
import { Stepper, StepperStep } from '@/components/universal/navigation/Stepper';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api/trpc';
import { haptic } from '@/lib/ui/haptics';
import { useRouter } from 'expo-router';
import { useResponsive } from '@/hooks/responsive';
import { logger } from '@/lib/core/debug/unified-logger';
import { createFormValidator, patientSchemas } from '@/lib/validations/healthcare';
import { useError } from '@/components/providers/ErrorProvider';
import { useAsyncError } from '@/hooks/useAsyncError';
import { useOfflineQueue } from '@/lib/error/offline-queue';
import { withRetry } from '@/lib/error/error-recovery';
import { ErrorRecovery } from '@/components/blocks/errors/ErrorRecovery';
import { useShadow } from '@/hooks/useShadow';
import { PatientRegistrationSuccess } from './PatientRegistrationSuccess';
import { 
  usePatientFormStore,
  usePatientFormData,
  usePatientFormActions,
  usePatientFormStep,
  usePatientFormValidation,
} from '@/lib/stores/patient-form-store';
import { 
  Gender,
  DEPARTMENT_CONFIG,
  DepartmentType,
} from '@/types/healthcare';

interface PatientCreationFormProps {
  hospitalId: string;
  onSuccess?: (patient?: any) => void;
  embedded?: boolean;
}

// Gender config helper
const getGenderConfig = (theme: any) => ({
  male: { icon: '👨', color: '#3B82F6', label: 'Male' }, // Blue
  female: { icon: '👩', color: '#EC4899', label: 'Female' }, // Pink
  other: { icon: '🧑', color: '#8B5CF6', label: 'Other' }, // Purple
});

// Step 1: Basic Information
const BasicInfoStep = ({ hospitalId }: { hospitalId: string }) => {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  const shadowMd = useShadow({ size: 'md' });
  
  const formData = usePatientFormData();
  const { updateField } = usePatientFormActions();
  const { errors, setError, clearError } = usePatientFormValidation();
  
  const nameInputRef = React.useRef<any>(null);
  
  // Log component state
  React.useEffect(() => {
    logger.healthcare.debug('BasicInfoStep rendered', {
      hospitalId,
      formData: {
        name: formData.name,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        department: formData.department,
        bloodGroup: formData.bloodGroup,
      },
      errors: Object.keys(errors),
      hasDepartmentConfig: !!DEPARTMENT_CONFIG,
      departmentKeys: DEPARTMENT_CONFIG ? Object.keys(DEPARTMENT_CONFIG) : [],
    });
  }, [hospitalId, formData, errors]);
  
  // Validation for basic fields
  const validateName = (value: string) => {
    if (!value.trim()) {
      setError('name', 'Name is required');
      return false;
    }
    if (value.length < 2) {
      setError('name', 'Name must be at least 2 characters');
      return false;
    }
    clearError('name');
    return true;
  };
  
  const validateDateOfBirth = (value: Date | null) => {
    if (!value) {
      setError('dateOfBirth', 'Date of birth is required');
      return false;
    }
    const age = new Date().getFullYear() - value.getFullYear();
    if (age > 150) {
      setError('dateOfBirth', 'Please enter a valid date of birth');
      return false;
    }
    clearError('dateOfBirth');
    return true;
  };
  
  return (
    <VStack gap={2}>
      {/* Name Input */}
      <GlassCard style={shadowMd}>
        <VStack gap={2} p={3}>
          <HStack gap={1} align="center">
            <Text weight="semibold" size="lg">Patient Name</Text>
            <Text size="sm" colorTheme="destructive">*</Text>
          </HStack>
          <Input
            ref={nameInputRef}
            value={formData.name}
            onChangeText={(value) => {
              updateField('name', value);
              validateName(value);
            }}
            placeholder="Enter patient's full name"
            error={errors.name}
            autoFocus={!isMobile}
            size={isMobile ? "default" : "lg"}
          />
        </VStack>
      </GlassCard>
      
      {/* Date of Birth */}
      <GlassCard style={shadowMd}>
        <VStack gap={2} p={3}>
          <HStack gap={1} align="center">
            <Text weight="semibold" size="lg">Date of Birth</Text>
            <Text size="sm" colorTheme="destructive">*</Text>
          </HStack>
          <DatePicker
            value={formData.dateOfBirth}
            onChange={(date) => {
              updateField('dateOfBirth', date);
              validateDateOfBirth(date);
            }}
            placeholder="Select date of birth"
            maximumDate={new Date()}
            error={errors.dateOfBirth}
            size={isMobile ? "default" : "lg"}
            captionLayout="dropdown"
            yearRange={{ start: 1900, end: new Date().getFullYear() }}
          />
        </VStack>
      </GlassCard>
      
      {/* Gender Selection */}
      <GlassCard style={shadowMd}>
        <VStack gap={2} p={3}>
          <HStack gap={1} align="center">
            <Text weight="semibold" size="lg">Gender</Text>
            <Text size="sm" colorTheme="destructive">*</Text>
          </HStack>
          <HStack gap={2}>
            {(['male', 'female', 'other'] as Gender[]).map((gender) => {
              const genderConfig = getGenderConfig(theme);
              const config = genderConfig[gender];
              
              return (
                <View key={gender} style={{ flex: 1 }}>
                  <SelectionButton
                    value={gender}
                    selected={formData.gender === gender}
                    onPress={() => {
                      updateField('gender', gender);
                      clearError('gender');
                    }}
                    icon={config.icon}
                    label={config.label}
                    color={config.color}
                    layout="horizontal"
                    size={isMobile ? 'sm' : 'md'}
                    variant="card"
                    showCheckmark
                  />
                </View>
              );
            })}
          </HStack>
          {errors.gender && (
            <Text size="xs" colorTheme="destructive">{errors.gender}</Text>
          )}
        </VStack>
      </GlassCard>
      
      {/* Blood Group */}
      <GlassCard style={shadowMd}>
        <VStack gap={2} p={3}>
          <Text weight="semibold" size="lg">Blood Group (Optional)</Text>
          <Input
            value={formData.bloodGroup}
            onChangeText={(value) => updateField('bloodGroup', value)}
            placeholder="e.g., A+, B-, O+"
            error={errors.bloodGroup}
            size={isMobile ? "default" : "lg"}
          />
        </VStack>
      </GlassCard>
      
      {/* Department Selection */}
      <GlassCard style={shadowMd}>
        <VStack gap={2} p={3}>
          <HStack gap={1} align="center">
            <Text weight="semibold" size="lg">Department</Text>
            <Text size="sm" colorTheme="destructive">*</Text>
          </HStack>
          <ResponsiveGrid
            columns={{ mobile: 2, tablet: 3, desktop: 4 }}
            gap={2}
          >
            {(() => {
              try {
                if (!DEPARTMENT_CONFIG) {
                  logger.healthcare.error('DEPARTMENT_CONFIG is undefined');
                  return <Text colorTheme="destructive">Department configuration error</Text>;
                }
                
                const deptKeys = Object.keys(DEPARTMENT_CONFIG) as DepartmentType[];
                logger.healthcare.debug('Rendering departments', { 
                  departmentCount: deptKeys.length,
                  departments: deptKeys 
                });
                
                return deptKeys.map((dept) => {
                  const deptConfig = DEPARTMENT_CONFIG[dept];
                  if (!deptConfig) {
                    logger.healthcare.error('No config for department', { dept });
                    return null;
                  }
                  
                  return (
                    <SelectionButton
                      key={dept}
                      value={dept}
                      selected={formData.department === dept}
                      onPress={() => {
                        updateField('department', dept);
                        clearError('department');
                      }}
                      icon={deptConfig.icon}
                      label={deptConfig.label}
                      color={deptConfig.color}
                      size={isMobile ? 'sm' : 'md'}
                      aspectRatio={isMobile ? 1.2 : 1.1}
                      showCheckmark
                    />
                  );
                });
              } catch (error) {
                logger.healthcare.error('Error rendering departments', {
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                });
                return <Text colorTheme="destructive">Error loading departments</Text>;
              }
            })()}
          </ResponsiveGrid>
          {errors.department && (
            <Text size="xs" colorTheme="destructive">{errors.department}</Text>
          )}
        </VStack>
      </GlassCard>
    </VStack>
  );
};

// Step 2: Contact Information
const ContactInfoStep = () => {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const shadowMd = useShadow({ size: 'md' });
  
  const formData = usePatientFormData();
  const { updateField, updateEmergencyContact } = usePatientFormActions();
  const { errors, setError, clearError } = usePatientFormValidation();
  
  // Phone validation
  const validatePhone = (value: string, field: string) => {
    if (!value.trim()) {
      setError(field, 'Phone number is required');
      return false;
    }
    if (value.length < 10) {
      setError(field, 'Phone number must be at least 10 digits');
      return false;
    }
    clearError(field);
    return true;
  };
  
  return (
    <VStack gap={2}>
      {/* Patient Contact */}
      <GlassCard style={shadowMd}>
        <VStack gap={3} p={3}>
          <Text weight="semibold" size="lg">Patient Contact Information</Text>
          
          {/* Phone Number */}
          <VStack gap={1}>
            <HStack gap={1} align="center">
              <Text size="sm" weight="medium">Phone Number</Text>
              <Text size="sm" colorTheme="destructive">*</Text>
            </HStack>
            <Input
              value={formData.phoneNumber}
              onChangeText={(value) => {
                updateField('phoneNumber', value);
                validatePhone(value, 'phoneNumber');
              }}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              error={errors.phoneNumber}
              size={isMobile ? "default" : "lg"}
            />
          </VStack>
          
          {/* Email */}
          <VStack gap={1}>
            <Text size="sm" weight="medium">Email (Optional)</Text>
            <Input
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              size={isMobile ? "default" : "lg"}
            />
          </VStack>
          
          {/* Address */}
          <VStack gap={1}>
            <HStack gap={1} align="center">
              <Text size="sm" weight="medium">Address</Text>
              <Text size="sm" colorTheme="destructive">*</Text>
            </HStack>
            <TextArea
              value={formData.address}
              onChangeText={(value) => {
                updateField('address', value);
                if (value.trim()) clearError('address');
                else setError('address', 'Address is required');
              }}
              placeholder="Enter full address"
              rows={3}
              maxRows={5}
              error={errors.address}
              size={isMobile ? "default" : "lg"}
              variant="default"
              autoResize
              showCharacterCount
              characterLimit={200}
            />
          </VStack>
        </VStack>
      </GlassCard>
      
      {/* Emergency Contact */}
      <GlassCard style={shadowMd}>
        <VStack gap={3} p={3}>
          <Text weight="semibold" size="lg">Emergency Contact</Text>
          
          {/* Contact Name */}
          <VStack gap={1}>
            <HStack gap={1} align="center">
              <Text size="sm" weight="medium">Contact Name</Text>
              <Text size="sm" colorTheme="destructive">*</Text>
            </HStack>
            <Input
              value={formData.emergencyContact.name}
              onChangeText={(value) => {
                updateEmergencyContact('name', value);
                if (value.trim()) clearError('emergencyContact.name');
                else setError('emergencyContact.name', 'Emergency contact name is required');
              }}
              placeholder="Enter contact person's name"
              error={errors['emergencyContact.name']}
              size={isMobile ? "default" : "lg"}
            />
          </VStack>
          
          {/* Contact Phone */}
          <VStack gap={1}>
            <HStack gap={1} align="center">
              <Text size="sm" weight="medium">Contact Phone</Text>
              <Text size="sm" colorTheme="destructive">*</Text>
            </HStack>
            <Input
              value={formData.emergencyContact.phoneNumber}
              onChangeText={(value) => {
                updateEmergencyContact('phoneNumber', value);
                validatePhone(value, 'emergencyContact.phoneNumber');
              }}
              placeholder="Enter contact phone number"
              keyboardType="phone-pad"
              error={errors['emergencyContact.phoneNumber']}
              size={isMobile ? "default" : "lg"}
            />
          </VStack>
          
          {/* Relationship */}
          <VStack gap={1}>
            <Text size="sm" weight="medium">Relationship (Optional)</Text>
            <Input
              value={formData.emergencyContact.relationship}
              onChangeText={(value) => updateEmergencyContact('relationship', value)}
              placeholder="e.g., Spouse, Parent, Sibling"
              error={errors['emergencyContact.relationship']}
              size={isMobile ? "default" : "lg"}
            />
          </VStack>
        </VStack>
      </GlassCard>
    </VStack>
  );
};

export function PatientCreationForm({
  hospitalId,
  onSuccess,
  embedded = false,
}: PatientCreationFormProps) {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const router = useRouter();
  const { isMobile, isDesktop } = useResponsive();
  const { isOnline, error: globalError } = useError();
  const { executeAsync } = useAsyncError({
    retries: 2,
    retryDelay: 1000,
  });
  const { enqueue } = useOfflineQueue();
  const shadowMd = useShadow({ size: 'md' });
  const utils = api.useUtils();
  
  // Log component mount
  React.useEffect(() => {
    logger.healthcare.info('PatientCreationForm mounted', {
      hospitalId,
      embedded,
      isOnline,
      hasGlobalError: !!globalError,
    });
  }, [hospitalId, embedded, isOnline, globalError]);
  
  // Zustand store hooks
  const formData = usePatientFormData();
  const { resetForm } = usePatientFormActions();
  const { currentStep, setCurrentStep, completedSteps, markStepCompleted } = usePatientFormStep();
  const { errors, clearAllErrors, isFormValid, setError } = usePatientFormValidation();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<any>(null);
  
  // Form validator
  const validator = createFormValidator(patientSchemas.createPatient);
  
  // Create patient mutation
  const createPatientMutation = api.healthcare.createPatient.useMutation({
    onSuccess: async (data) => {
      logger.healthcare.info('Patient created successfully', {
        patientId: data?.id,
        name: formData.name,
      });
      haptic('success');
      
      // Store created patient data
      setCreatedPatient(data);
      
      // Show success animation
      setShowSuccess(true);
      
      // Invalidate patients query to ensure fresh data
      await utils.healthcare.getMyPatients.invalidate();
      
      // Reset form after success
      resetForm();
      
      // Handle navigation after animation
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(data);
        } else if (!embedded) {
          // Navigate to patients screen with the new patient ID
          router.replace(`/patients?newPatientId=${data?.id}`);
        }
      }, 2500); // Wait for animation to complete
    },
    onError: (error) => {
      logger.healthcare.error('Failed to create patient', {
        error: error.message,
        formData,
      });
      haptic('error');
      setError('general', error.message || 'Registration failed. Please try again.');
      setIsSubmitting(false);
    },
  });
  
  // Validate current step
  const validateStep = (step: number, clearErrors = true): boolean => {
    if (clearErrors) {
      clearAllErrors();
    }
    
    if (step === 0) {
      // Validate basic info
      const hasName = formData.name.trim() !== '';
      const hasDoB = formData.dateOfBirth !== null;
      const hasGender = formData.gender !== null;
      const hasDepartment = formData.department !== null;
      
      let isValid = true;
      
      if (!hasName) {
        isValid = false;
      }
      if (!hasDoB) {
        isValid = false;
      }
      if (!hasGender) {
        isValid = false;
      }
      if (!hasDepartment) {
        isValid = false;
      }
      
      return isValid;
    } else if (step === 1) {
      // Validate contact info
      const hasPhone = formData.phoneNumber.trim() !== '';
      const hasAddress = formData.address.trim() !== '';
      const hasEmergencyName = formData.emergencyContact.name.trim() !== '';
      const hasEmergencyPhone = formData.emergencyContact.phoneNumber.trim() !== '';
      
      return hasPhone && hasAddress && hasEmergencyName && hasEmergencyPhone;
    }
    
    return true;
  };
  
  // Handle step change
  const handleStepChange = (newStep: number) => {
    // Validate current step before moving forward
    if (newStep > currentStep) {
      if (!validateStep(currentStep, true)) {
        haptic('error');
        // Set specific errors for missing fields
        if (currentStep === 0) {
          if (!formData.name.trim()) setError('name', 'Name is required');
          if (!formData.dateOfBirth) setError('dateOfBirth', 'Date of birth is required');
          if (!formData.gender) setError('gender', 'Please select a gender');
          if (!formData.department) setError('department', 'Please select a department');
        } else if (currentStep === 1) {
          if (!formData.phoneNumber.trim()) setError('phoneNumber', 'Phone number is required');
          if (!formData.address.trim()) setError('address', 'Address is required');
          if (!formData.emergencyContact.name.trim()) setError('emergencyContact.name', 'Emergency contact name is required');
          if (!formData.emergencyContact.phoneNumber.trim()) setError('emergencyContact.phoneNumber', 'Emergency contact phone is required');
        }
        return;
      }
      markStepCompleted(currentStep);
    }
    
    haptic('light');
    setCurrentStep(newStep);
  };
  
  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // Validate all steps
    if (!isFormValid()) {
      haptic('error');
      // Set errors for all missing fields
      if (!formData.name.trim()) setError('name', 'Name is required');
      if (!formData.dateOfBirth) setError('dateOfBirth', 'Date of birth is required');
      if (!formData.gender) setError('gender', 'Please select a gender');
      if (!formData.department) setError('department', 'Please select a department');
      if (!formData.phoneNumber.trim()) setError('phoneNumber', 'Phone number is required');
      if (!formData.address.trim()) setError('address', 'Address is required');
      if (!formData.emergencyContact.name.trim()) setError('emergencyContact.name', 'Emergency contact name is required');
      if (!formData.emergencyContact.phoneNumber.trim()) setError('emergencyContact.phoneNumber', 'Emergency contact phone is required');
      // Navigate to first step with errors
      if (!formData.name.trim() || !formData.dateOfBirth || !formData.gender || !formData.department) {
        setCurrentStep(0);
      }
      return;
    }
    
    const validationData = {
      ...formData,
      hospitalId,
      // Ensure email is handled properly (empty string should be undefined)
      email: formData.email?.trim() || undefined,
      // Ensure dateOfBirth is a Date object
      dateOfBirth: formData.dateOfBirth instanceof Date 
        ? formData.dateOfBirth 
        : formData.dateOfBirth 
          ? new Date(formData.dateOfBirth)
          : null,
    };
    
    // Log the data being validated
    logger.healthcare.info('Validating patient data', {
      data: validationData,
      hasEmail: !!validationData.email,
      emergencyContactFields: Object.keys(validationData.emergencyContact || {}),
    });
    
    const validation = validator.validate(validationData);
    
    logger.healthcare.info('Validation result', {
      success: validation.success,
      hasErrors: !!validation.errors,
      errorCount: validation.errors ? Object.keys(validation.errors).length : 0,
      errors: validation.errors,
    });
    
    if (!validation.success) {
      logger.healthcare.error('Patient validation failed', {
        errors: validation.errors,
        formData: validationData,
      });
      haptic('error');
      
      // Set inline errors from validation
      if (validation.errors && typeof validation.errors === 'object') {
        Object.entries(validation.errors).forEach(([field, error]) => {
          setError(field, error as string);
        });
        
        // Navigate to first step if basic info has errors
        const basicInfoFields = ['name', 'dateOfBirth', 'gender', 'department'];
        if (Object.keys(validation.errors).some(field => basicInfoFields.includes(field))) {
          setCurrentStep(0);
        }
      } else {
        // Fallback - set a general error
        setError('general', 'Please check all required fields');
      }
      return;
    }
    
    // Log successful validation
    logger.healthcare.info('Patient validation successful', {
      data: validation.data,
    });
    
    setIsSubmitting(true);
    
    // Handle offline scenario
    if (!isOnline) {
      try {
        const queueId = await enqueue('patient', 'create', validation.data!, { hospitalId });
        logger.healthcare.info('Patient registration queued for offline processing', { queueId });
        haptic('success');
        // Success is handled silently for queued registrations
        setIsSubmitting(false);
        
        if (onSuccess) {
          onSuccess({ ...validation.data, queued: true });
        }
        
        resetForm();
        
        setTimeout(() => {
          if (!onSuccess && !embedded) {
            router.back();
          }
        }, 1500);
        return;
      } catch (error) {
        logger.healthcare.error('Failed to queue patient registration', error);
        setError('general', 'Failed to queue registration. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }
    
    // Online submission
    try {
      logger.healthcare.info('Submitting patient registration', {
        data: validation.data,
        hospitalId: validation.data!.hospitalId,
      });
      
      // Ensure the data is properly formatted before sending
      const apiData = {
        ...validation.data!,
        dateOfBirth: validation.data!.dateOfBirth instanceof Date 
          ? validation.data!.dateOfBirth 
          : new Date(validation.data!.dateOfBirth),
      };
      
      logger.healthcare.info('Sending data to API', {
        apiData,
        dateOfBirthType: typeof apiData.dateOfBirth,
        dateOfBirthIsDate: apiData.dateOfBirth instanceof Date,
        dateOfBirthValue: apiData.dateOfBirth,
        allFields: Object.keys(apiData),
      });
      
      // Call mutation directly
      await createPatientMutation.mutateAsync(apiData);
      
    } catch (error) {
      logger.healthcare.error('Patient registration failed in submit', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // The error is already handled by mutation onError
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, hospitalId, validator, isOnline, enqueue, createPatientMutation, onSuccess, embedded, router, resetForm, isFormValid, setError, setCurrentStep]);
  
  // Define steps
  const steps: StepperStep[] = [
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Patient details',
      icon: 'person',
      content: <BasicInfoStep hospitalId={hospitalId} />,
      completed: completedSteps.has(0),
    },
    {
      id: 'contact-info',
      title: 'Contact Details',
      description: 'Contact & emergency',
      icon: 'phone',
      content: <ContactInfoStep />,
      completed: completedSteps.has(1),
    },
  ];
  
  // Log stepper state
  React.useEffect(() => {
    logger.healthcare.debug('PatientCreationForm stepper state', {
      currentStep,
      completedSteps: Array.from(completedSteps),
      formDataSummary: {
        hasName: !!formData.name,
        hasDateOfBirth: !!formData.dateOfBirth,
        hasGender: !!formData.gender,
        hasDepartment: !!formData.department,
        hasPhone: !!formData.phoneNumber,
        hasAddress: !!formData.address,
        hasEmergencyContact: !!formData.emergencyContact.name,
      },
      isFormValid: isFormValid(),
    });
  }, [currentStep, completedSteps, formData, isFormValid]);
  
  // Log form validation state
  React.useEffect(() => {
    const formIsValid = isFormValid();
    logger.healthcare.debug('Form validation state', {
      isValid: formIsValid,
      currentStep,
      formData: {
        name: formData.name,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        department: formData.department,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        emergencyName: formData.emergencyContact.name,
        emergencyPhone: formData.emergencyContact.phoneNumber,
      },
      buttonShouldBeDisabled: !formIsValid || isSubmitting,
    });
  }, [formData, currentStep, isFormValid, isSubmitting]);
  
  const content = (
    <VStack gap={1} style={{ width: '100%', maxWidth: isDesktop ? 600 : '100%' }}>
      {/* Show offline indicator */}
      {!isOnline && (
        <GlassCard style={[{ backgroundColor: theme.destructive + '20', borderColor: theme.destructive }, shadowMd]}>
          <HStack gap={2} p={3} style={{ alignItems: 'center' }}>
            <Text size="lg">🔴</Text>
            <VStack style={{ flex: 1 }}>
              <Text weight="semibold" size="sm">You're Offline</Text>
              <Text size="xs" colorTheme="mutedForeground">
                Registration will be queued and processed when connection is restored
              </Text>
            </VStack>
          </HStack>
        </GlassCard>
      )}
      
      {/* Show global error if any */}
      {globalError && (
        <ErrorRecovery compact />
      )}
      
      {/* Show validation errors summary */}
      {Object.keys(errors).length > 0 && (
        <Animated.View entering={FadeInDown} exiting={FadeOut}>
          <GlassCard style={[{ backgroundColor: theme.destructive + '20', borderColor: theme.destructive }, shadowMd]}>
            <HStack gap={2} p={3} style={{ alignItems: 'center' }}>
              <Symbol name="exclamationmark.triangle.fill" size={20} color={theme.destructive} />
              <VStack style={{ flex: 1 }}>
                {errors.general ? (
                  <>
                    <Text weight="semibold" size="sm" colorTheme="destructive">{errors.general}</Text>
                  </>
                ) : (
                  <>
                    <Text weight="semibold" size="sm" colorTheme="destructive">Please fix the following errors:</Text>
                    <Text size="xs" colorTheme="mutedForeground">
                      {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? 's' : ''} need{Object.keys(errors).length > 1 ? '' : 's'} your attention
                    </Text>
                  </>
                )}
              </VStack>
            </HStack>
          </GlassCard>
        </Animated.View>
      )}
      
      {/* Stepper */}
      <Stepper
        steps={steps}
        activeStep={currentStep}
        onStepChange={handleStepChange}
        variant="default"
        showStepNumbers
        showNavigation={false}
        allowStepClick
        linear={false}
        animated
        animationType="slide"
        stepTransition="slide"
        showProgress
        progressPosition="bottom"
      />
      
      {/* Custom Navigation */}
      <VStack gap={2} style={{ marginTop: spacing[3] }}>
        <HStack gap={8} style={{ width: '100%', justifyContent: 'center' }}>
          <Button
            variant="outline"
            onPress={() => handleStepChange(currentStep - 1)}
            size={isMobile ? "md" : "lg"}
            disabled={currentStep === 0}
            fullWidth={false}
            style={{
              backgroundColor: currentStep === 0 ? theme.muted : theme.background,
              borderColor: currentStep === 0 ? theme.border : theme.primary + '40',
              opacity: currentStep === 0 ? 0.6 : 1,
              minWidth: 120,
            }}
          >
            <HStack gap={2} align="center">
              <Symbol name="chevron.left" size={20} color={currentStep === 0 ? theme.mutedForeground : theme.foreground} />
              <Text
                size={isMobile ? "base" : "lg"}
                weight="semibold"
                style={{ color: currentStep === 0 ? theme.mutedForeground : theme.foreground }}
              >
                Previous
              </Text>
            </HStack>
          </Button>
          
          {currentStep < steps.length - 1 ? (
            <Button
              variant="default"
              onPress={() => handleStepChange(currentStep + 1)}
              disabled={!validateStep(currentStep, false)}
              size={isMobile ? "md" : "lg"}
              fullWidth={false}
              style={{
                backgroundColor: validateStep(currentStep, false) ? theme.primary : theme.muted,
                borderColor: validateStep(currentStep, false) ? theme.primary : theme.border,
                opacity: validateStep(currentStep, false) ? 1 : 0.6,
                minWidth: 120,
              }}
            >
              <HStack gap={2} align="center">
                <Text
                  size={isMobile ? "base" : "lg"}
                  weight="semibold"
                  style={{ color: validateStep(currentStep, false) ? 'white' : theme.mutedForeground }}
                >
                  Next
                </Text>
                <Symbol name="chevron.right" size={20} color={validateStep(currentStep, false) ? 'white' : theme.mutedForeground} />
              </HStack>
            </Button>
          ) : (
            <Button
              variant="default"
              onPress={handleSubmit}
              disabled={!isFormValid() || isSubmitting}
              isLoading={isSubmitting}
              size={isMobile ? "md" : "lg"}
              fullWidth={false}
              style={{
                backgroundColor: isFormValid() && !isSubmitting ? theme.primary : theme.muted,
                borderColor: isFormValid() && !isSubmitting ? theme.primary : theme.border,
                opacity: isFormValid() && !isSubmitting ? 1 : 0.6,
                minWidth: 180,
              }}
            >
              <HStack gap={2} align="center">
                {!isSubmitting && (
                  <Text size="lg">
                    {isFormValid() ? '✅' : '📝'}
                  </Text>
                )}
                <Text
                  size={isMobile ? "base" : "lg"}
                  weight="bold"
                  style={{ color: isFormValid() && !isSubmitting ? 'white' : theme.mutedForeground }}
                >
                  {isSubmitting ? 'Registering...' : isFormValid() ? 'Register Patient' : 'Complete All Fields'}
                </Text>
              </HStack>
            </Button>
          )}
        </HStack>
      </VStack>
    </VStack>
  );
  
  if (embedded) {
    return content;
  }
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          padding: isMobile ? spacing[2] : spacing[3],
          paddingBottom: isMobile ? spacing[6] : spacing[8],
          alignItems: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
      
      {/* Success Animation */}
      <PatientRegistrationSuccess
        visible={showSuccess}
        patientName={createdPatient?.name}
        patientId={createdPatient?.id}
        onComplete={() => {
          setShowSuccess(false);
          setCreatedPatient(null);
        }}
        autoHide={true}
        autoHideDelay={2000}
      />
    </KeyboardAvoidingView>
  );
}