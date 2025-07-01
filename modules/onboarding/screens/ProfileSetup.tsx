/**
 * Profile Setup Screen
 * Professional details collection based on selected role
 * Enhanced with theme support and universal components
 */

import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
// import * as ImagePicker from 'expo-image-picker'; // Uncomment if expo-image-picker is installed
import { Text } from '@/components/universal/typography/Text';
import { Button } from '@/components/universal/interaction/Button';
import { Input } from '@/components/universal/form/Input';
import { Select } from '@/components/universal/form/Select';
import { SelectionButton } from '@/components/universal/form/SelectionButton';
import { VStack, HStack } from '@/components/universal/layout/Stack';
import { Symbol } from '@/components/universal/display/Symbols';
import { GlassCard } from '@/components/universal/display';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { useOnboardingValidation } from '../hooks/useOnboardingValidation';
import { SPECIALIZATIONS, EXPERIENCE_RANGES, SHIFT_PREFERENCES } from '../utils/constants';
import { haptic } from '@/lib/ui/haptics';
import { logger } from '@/lib/core/debug/unified-logger';
import { showAlert } from '@/lib/core/alert';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { useShadow } from '@/hooks/useShadow';
import { useSimpleFormDraft } from '@/hooks/useSimpleFormDraft';

// Form data interface
interface ProfileForm {
  specialization: string;
  yearsOfExperience: string;
  shiftPreference: string;
  licenseNumber?: string;
  phoneNumber?: string;
  bio?: string;
}

export function ProfileSetupScreen() {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isTablet } = useResponsive();
  const shadowMd = useShadow({ size: 'md' });
  const shadowLg = useShadow({ size: 'lg' });
  
  const {
    state,
    updateUserData,
    completeStep,
    goToNextStep,
    goToPreviousStep,
  } = useOnboardingFlow();
  
  const requiresLicense = state.selectedRole && 
    ['doctor', 'nurse', 'head_doctor'].includes(state.selectedRole);
  
  const {
    errors,
    validateField,
    validate,
    clearError,
    hasErrors,
  } = useOnboardingValidation(requiresLicense ? 'profileWithLicense' : 'profile');

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ProfileForm>({
    specialization: state.userData.specialization || '',
    yearsOfExperience: state.userData.yearsOfExperience?.toString() || '',
    shiftPreference: state.userData.shiftPreference || '',
    licenseNumber: '',
    phoneNumber: state.userData.phoneNumber || '',
    bio: state.userData.bio || '',
  });
  
  // Draft persistence
  const { saveDraft, clearDraft, draftAge } = useSimpleFormDraft({
    formKey: 'onboarding-profile',
    data: formData,
    onDataChange: setFormData,
    showRestoreNotification: true,
  });
  
  // Update field value and validate
  const updateField = useCallback((field: keyof ProfileForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  }, [validateField]);
  
  // Responsive values
  const inputSize = isMobile ? 'md' : 'lg';
  const buttonSize = isMobile ? 'md' : 'lg';
  const contentGap = isMobile ? 4 : 5;

  const handlePhotoUpload = async () => {
    haptic('light');
    setIsUploading(true);
    
    try {
      // Image picker functionality disabled - expo-image-picker not installed
      showAlert({
        title: 'Feature Disabled',
        description: 'Photo upload is not available in this demo',
        variant: 'success',
      });
      
      // Simulate photo upload for demo
      setTimeout(() => {
        setProfilePhoto('https://i.pravatar.cc/300');
        setIsUploading(false);
      }, 1500);
    } catch (error) {
      setIsUploading(false);
      showAlert({
        title: 'Upload Failed',
        description: 'Unable to upload photo',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async () => {
    // Validate entire form
    const validation = validate(formData);
    if (!validation.isValid) {
      haptic('error');
      return;
    }
    
    setIsSubmitting(true);
    haptic('light');

    try {
      // Clear draft on success
      await clearDraft();
      
      // Update user data
      updateUserData({
        specialization: formData.specialization,
        shiftPreference: formData.shiftPreference,
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : undefined,
        phoneNumber: formData.phoneNumber,
        bio: formData.bio,
        profilePhoto: profilePhoto || undefined,
        ...(requiresLicense && formData.licenseNumber ? { licenseNumber: formData.licenseNumber } : {}),
      } as any);

      // In a real app, verify license here
      if (requiresLicense && formData.licenseNumber) {
        // Simulate license verification
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      haptic('success');
      completeStep('profile-setup');
      goToNextStep();
    } catch (error) {
      haptic('error');
      logger.error('Profile setup failed', error);
      showAlert({
        title: 'Setup Failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if form is valid
  const isFormValid = !hasErrors() && 
    formData.specialization && 
    formData.yearsOfExperience && 
    formData.shiftPreference &&
    (!requiresLicense || formData.licenseNumber);

  const photoStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(profilePhoto ? 1.05 : 1, {
            damping: 15,
            stiffness: 100,
          }),
        },
      ],
    };
  });
  
  // Photo container size
  const photoSize = isMobile ? 100 : 120;

  return (
    <OnboardingLayout
      title="Professional Profile"
      subtitle="Tell us about your professional background"
      onBack={goToPreviousStep}
      progress={state.progress}
      backgroundGradient={['#1e3a8a', '#3b82f6', '#60a5fa']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <VStack gap={contentGap}>
            {/* Progress Indicator */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <ProgressIndicator
                currentStep={state.currentStep}
                completedSteps={state.completedSteps}
                variant="steps"
              />
            </Animated.View>
            
            {/* Draft Notification */}
            {draftAge && (
              <Animated.View entering={FadeInDown.duration(400).delay(250)}>
                <GlassCard
                  style={[
                    {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      borderWidth: 1,
                      padding: spacing[3],
                    },
                    shadowMd,
                  ]}
                >
                  <HStack gap={2} style={{ alignItems: 'center' }}>
                    <Symbol name="clock.arrow.circlepath" size={16} color="white" />
                    <Text style={{ color: 'white', fontSize: 14, flex: 1 }}>
                      Draft restored from {draftAge < 60 ? `${draftAge} minutes` : `${Math.floor(draftAge / 60)} hours`} ago
                    </Text>
                  </HStack>
                </GlassCard>
              </Animated.View>
            )}

            {/* Profile Photo */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(300)}
              style={{ alignItems: 'center' }}
            >
              <TouchableOpacity onPress={handlePhotoUpload} disabled={isUploading}>
                <Animated.View
                  style={[
                    {
                      width: photoSize,
                      height: photoSize,
                      borderRadius: photoSize / 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: profilePhoto ? theme.success : 'rgba(255, 255, 255, 0.3)',
                      overflow: 'hidden',
                    },
                    photoStyle,
                    shadowLg,
                  ]}
                >
                  {profilePhoto ? (
                    <Image
                      source={{ uri: profilePhoto }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Symbol
                      name="camera.fill"
                      size={isMobile ? 32 : 40}
                      color="white"
                    />
                  )}
                
                  {isUploading && (
                    <View
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Symbol name="arrow.triangle.2.circlepath" size={30} color="white" />
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>
              
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                marginTop: spacing[2], 
                fontSize: 14,
              }}>
                {profilePhoto ? 'Tap to change photo' : 'Add profile photo (optional)'}
              </Text>
            </Animated.View>

            {/* Form Fields */}
            <VStack gap={4}>
              {/* License Number (if required) */}
              {requiresLicense && (
                <Animated.View entering={FadeInUp.duration(400).delay(400)}>
                  <Input
                    label="License Number"
                    placeholder="e.g., MD-12345 or RN-67890"
                    value={formData.licenseNumber || ''}
                    onChangeText={(text) => updateField('licenseNumber', text.toUpperCase())}
                    onBlur={() => validateField('licenseNumber', formData.licenseNumber)}
                    error={errors.licenseNumber}
                    leftIcon="doc.text"
                    autoCapitalize="characters"
                    size={inputSize}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: errors.licenseNumber ? theme.destructive : 'rgba(255, 255, 255, 0.2)',
                    }}
                    inputStyle={{ color: 'white' }}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                  
                  <HStack gap={2} style={{ marginTop: spacing[2], alignItems: 'center' }}>
                    <Symbol name="checkmark.shield.fill" size={14} color={theme.success} />
                    <Text style={{ color: theme.success, fontSize: 12 }}>
                      License will be verified with state board
                    </Text>
                  </HStack>
                </Animated.View>
              )}

              {/* Specialization */}
              <Animated.View entering={FadeInUp.duration(400).delay(500)}>
                <Select
                  label="Specialization"
                  value={formData.specialization}
                  onValueChange={(value) => updateField('specialization', value)}
                  options={SPECIALIZATIONS}
                  placeholder="Select your specialization"
                  error={errors.specialization}
                  size={inputSize}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: errors.specialization ? theme.destructive : 'rgba(255, 255, 255, 0.2)',
                  }}
                />
              </Animated.View>

              {/* Experience */}
              <Animated.View entering={FadeInUp.duration(400).delay(600)}>
                <Select
                  label="Years of Experience"
                  value={formData.yearsOfExperience}
                  onValueChange={(value) => updateField('yearsOfExperience', value)}
                  options={EXPERIENCE_RANGES}
                  placeholder="Select experience range"
                  error={errors.yearsOfExperience}
                  size={inputSize}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: errors.yearsOfExperience ? theme.destructive : 'rgba(255, 255, 255, 0.2)',
                  }}
                />
              </Animated.View>

              {/* Shift Preference */}
              <Animated.View entering={FadeInUp.duration(400).delay(700)}>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  marginBottom: spacing[2],
                  fontSize: 16,
                  fontWeight: '500',
                }}>
                  Shift Preference
                </Text>
                <VStack gap={2}>
                  {SHIFT_PREFERENCES.map((shift) => (
                    <SelectionButton
                      key={shift.value}
                      value={shift.value}
                      selected={formData.shiftPreference === shift.value}
                      onPress={() => {
                        haptic('light');
                        updateField('shiftPreference', shift.value);
                      }}
                      icon={
                        <View
                          style={{
                            width: spacing[10],
                            height: spacing[10],
                            borderRadius: spacing[2],
                            backgroundColor: formData.shiftPreference === shift.value
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'rgba(255, 255, 255, 0.1)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Symbol
                            name={shift.icon as any}
                            size={20}
                            color="white"
                          />
                        </View>
                      }
                      label={shift.label}
                      description={shift.description}
                      variant="card"
                      size={isMobile ? 'md' : 'lg'}
                      style={{
                        backgroundColor: formData.shiftPreference === shift.value
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'rgba(255, 255, 255, 0.08)',
                        borderColor: formData.shiftPreference === shift.value
                          ? 'rgba(255, 255, 255, 0.4)'
                          : 'rgba(255, 255, 255, 0.2)',
                      }}
                    />
                  ))}
                </VStack>
                {errors.shiftPreference && (
                  <Text style={{ 
                    color: theme.destructive, 
                    fontSize: 14, 
                    marginTop: spacing[1],
                  }}>
                    {errors.shiftPreference}
                  </Text>
                )}
              </Animated.View>
              
              {/* Additional Fields */}
              <Animated.View entering={FadeInUp.duration(400).delay(800)}>
                <Input
                  label="Phone Number (Optional)"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phoneNumber}
                  onChangeText={(value) => updateField('phoneNumber', value)}
                  leftIcon="phone"
                  keyboardType="phone-pad"
                  size={inputSize}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                  inputStyle={{ color: 'white' }}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              </Animated.View>
              
              <Animated.View entering={FadeInUp.duration(400).delay(900)}>
                <Input
                  label="Bio (Optional)"
                  placeholder="Tell us a bit about yourself..."
                  value={formData.bio}
                  onChangeText={(value) => updateField('bio', value)}
                  multiline
                  numberOfLines={3}
                  size={inputSize}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    minHeight: spacing[24],
                  }}
                  inputStyle={{ 
                    color: 'white',
                    textAlignVertical: 'top',
                    paddingTop: spacing[3],
                  }}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              </Animated.View>
            </VStack>

            {/* Continue Button */}
            <Animated.View 
              entering={FadeInDown.duration(400).delay(1000)}
              style={{ marginTop: spacing[6] }}
            >
              <Button
                onPress={onSubmit}
                disabled={!isFormValid || isSubmitting}
                isLoading={isSubmitting}
                size={buttonSize}
                fullWidth
                style={[
                  {
                    backgroundColor: isFormValid && !isSubmitting ? 'white' : 'rgba(255, 255, 255, 0.2)',
                    borderColor: isFormValid && !isSubmitting ? 'white' : 'rgba(255, 255, 255, 0.3)',
                  },
                  ...(isFormValid && !isSubmitting ? [shadowLg] : []),
                ]}
              >
                <Text style={{
                  color: isFormValid && !isSubmitting ? theme.primary : 'rgba(255, 255, 255, 0.6)',
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: 'bold',
                }}>
                  {requiresLicense && isSubmitting ? 'Verifying License...' : 'Continue'}
                </Text>
              </Button>
            </Animated.View>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}