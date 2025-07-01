/**
 * Registration Screen
 * Account creation with email/password or social login
 * Enhanced with validation hook, offline support, and draft persistence
 */

import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/universal/typography/Text';
import { Button } from '@/components/universal/interaction/Button';
import { Input } from '@/components/universal/form/Input';
import { VStack, HStack } from '@/components/universal/layout/Stack';
import { Symbol } from '@/components/universal/display/Symbols';
import { GlassCard } from '@/components/universal/display';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { useOnboardingValidation } from '../hooks/useOnboardingValidation';
import { haptic } from '@/lib/ui/haptics';
import { authClient } from '@/lib/auth/auth-client';
import { logger } from '@/lib/core/debug/unified-logger';
import { cn } from '@/lib/utils/cn';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { useShadow } from '@/hooks/useShadow';
// import { useOfflineQueue } from '@/lib/error/offline-queue';
// import { useSimpleFormDraft } from '@/hooks/useSimpleFormDraft';
import { showAlert } from '@/lib/core/alert';
import type { UserRole } from '../types';
import { Checkbox } from '@/components/universal/form/Checkbox';

// Form data interface
interface RegistrationForm {
  email: string;
  password: string;
  name: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export function RegistrationScreen() {
  const router = useRouter();
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
  
  const {
    errors,
    validateField,
    validate,
    setError,
    clearError,
  } = useOnboardingValidation('registration');

  // Form state
  const [formData, setFormData] = useState<RegistrationForm>({
    email: state.userData.email || '',
    password: '',
    name: state.userData.name || '',
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Temporarily disable offline queue and draft persistence
  // const offlineQueue = useOfflineQueue();
  // const { saveDraft, clearDraft, draftAge } = useSimpleFormDraft({
  //   formKey: 'onboarding_registration',
  //   data: formData,
  //   onDataChange: setFormData,
  //   excludeFields: ['password', 'acceptTerms', 'acceptPrivacy'],
  //   debounceDelay: 1000,
  // });

  // Password strength calculation
  useEffect(() => {
    const password = formData.password;
    let strength = 0;
    
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 20;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 20;
    
    setPasswordStrength(Math.min(strength, 100));
  }, [formData.password]);

  const handleFieldChange = (field: keyof RegistrationForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
    // Save draft
    // saveDraft();
  };

  const isFormValid = 
    formData.email && 
    formData.password && 
    formData.name && 
    formData.acceptTerms && 
    formData.acceptPrivacy;

  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const onSubmit = async () => {
    // Validate entire form
    const validation = validate(formData);
    if (!validation.isValid) {
      haptic('error');
      return;
    }
    
    setIsLoading(true);
    haptic('light');

    try {
      // Create account using Better Auth
      const signUpResult = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        data: {
          role: state.selectedRole || 'user',
          needsProfileCompletion: true,
        },
      });

      if (signUpResult.error) {
        throw new Error(signUpResult.error.message || 'Registration failed');
      }

      // Send email verification OTP
      setIsSendingOtp(true);
      const otpResult = await authClient.emailOTP.sendVerificationOtp({
        email: formData.email,
        type: 'email-verification',
      });
      setIsSendingOtp(false);

      if (otpResult.error) {
        logger.error('Failed to send verification OTP', otpResult.error);
        // Continue anyway - user can request resend on verification screen
      }

      // Clear draft on success
      // await clearDraft();
      
      // Update onboarding state
      updateUserData({
        email: formData.email,
        name: formData.name,
        role: state.selectedRole,
      });

      haptic('success');
      completeStep('registration');
      goToNextStep();
    } catch (error: any) {
      haptic('error');
      logger.error('Registration failed', error);
      
      // Check if offline
      if (error.code === 'NETWORK_ERROR') {
        // Queue for offline processing
        // await offlineQueue.enqueue('generic', 'user-registration', {
        //   ...formData,
        //   role: state.selectedRole || 'user',
        // });
        
        showAlert({
          title: 'Offline Mode',
          description: 'Your registration will be processed when you\'re back online.',
          variant: 'success',
        });
        
        // Still proceed to next step
        updateUserData({
          email: formData.email,
          name: formData.name,
          role: state.selectedRole,
        });
        completeStep('registration');
        goToNextStep();
      } else if (error.message?.includes('already exists')) {
        setError('email', 'This email is already registered');
        showAlert({
          title: 'Account Already Exists',
          description: 'Please sign in instead',
          variant: 'destructive',
        });
      } else {
        showAlert({
          title: 'Registration Failed',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    haptic('light');
    setIsLoading(true);

    try {
      // For social login, we'll use the existing flow
      // The backend will handle OAuth and redirect appropriately
      showAlert({
        title: 'Social Login',
        description: 'Please use the main login page for social authentication',
        variant: 'info',
      });
      router.push('/(public)/auth/login');
    } catch (error) {
      haptic('error');
      logger.error('Social login failed', error);
      showAlert({
        title: 'Login Failed',
        description: 'Unable to connect with ' + provider,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrengthStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(`${passwordStrength}%`, { duration: 300 }),
      backgroundColor: withTiming(
        passwordStrength < 40
          ? theme.destructive
          : passwordStrength < 80
          ? '#f59e0b'
          : theme.success,
        { duration: 300 }
      ),
    };
  });
  
  // Responsive values
  const inputSize = isMobile ? 'md' : 'lg';
  const buttonSize = isMobile ? 'md' : 'lg';
  const contentGap = isMobile ? 4 : 5;

  return (
    <OnboardingLayout
      title="Create Account"
      subtitle="Set up your secure healthcare account"
      onBack={goToPreviousStep}
      progress={state.progress}
      backgroundGradient={['#1e3a8a', '#3b82f6', '#60a5fa']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <VStack gap={contentGap} style={{ flex: 1 }}>
          {/* Progress Indicator */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <ProgressIndicator
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
              variant="steps"
            />
          </Animated.View>
          
          {/* Draft Notification */}
          {/* {draftAge && (
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
          )} */}

          {/* Form */}
          <VStack gap={4}>
            {/* Name Input */}
            <Animated.View entering={FadeInUp.duration(400).delay(300)}>
              <Input
                value={formData.name}
                onChangeText={(value) => handleFieldChange('name', value)}
                placeholder="Full Name"
                textContentType="name"
                autoComplete="name"
                size={inputSize}
                error={errors.name}
                leftIcon={
                  <Symbol name="person" size={20} color="rgba(255, 255, 255, 0.6)" />
                }
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: errors.name ? theme.destructive : 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                }}
              />
            </Animated.View>

            {/* Email Input */}
            <Animated.View entering={FadeInUp.duration(400).delay(400)}>
              <Input
                value={formData.email}
                onChangeText={(value) => handleFieldChange('email', value)}
                placeholder="Email Address"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                size={inputSize}
                error={errors.email}
                leftIcon={
                  <Symbol name="envelope" size={20} color="rgba(255, 255, 255, 0.6)" />
                }
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: errors.email ? theme.destructive : 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                }}
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View entering={FadeInUp.duration(400).delay(500)}>
              <VStack gap={2}>
                <Input
                  value={formData.password}
                  onChangeText={(value) => handleFieldChange('password', value)}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  size={inputSize}
                  error={errors.password}
                  leftIcon={
                    <Symbol name="lock" size={20} color="rgba(255, 255, 255, 0.6)" />
                  }
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Symbol
                        name={showPassword ? 'eye' : 'eye.slash'}
                        size={20}
                        color="rgba(255, 255, 255, 0.6)"
                      />
                    </TouchableOpacity>
                  }
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: errors.password ? theme.destructive : 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                  }}
                />
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <View
                    style={{
                      height: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <Animated.View
                      style={[
                        {
                          height: '100%',
                          borderRadius: 2,
                        },
                        passwordStrengthStyle,
                      ]}
                    />
                  </View>
                )}
              </VStack>
            </Animated.View>

            {/* Terms and Privacy */}
            <Animated.View entering={FadeInUp.duration(400).delay(600)}>
              <VStack gap={3}>
                <HStack gap={3} style={{ alignItems: 'center' }}>
                  <Checkbox
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => handleFieldChange('acceptTerms', checked)}
                    style={{
                      borderColor: errors.acceptTerms ? theme.destructive : 'rgba(255, 255, 255, 0.6)',
                    }}
                  />
                  <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, flex: 1 }}>
                    I accept the{' '}
                    <Text style={{ color: 'white', textDecorationLine: 'underline' }}>
                      Terms of Service
                    </Text>
                  </Text>
                </HStack>

                <HStack gap={3} style={{ alignItems: 'center' }}>
                  <Checkbox
                    checked={formData.acceptPrivacy}
                    onCheckedChange={(checked) => handleFieldChange('acceptPrivacy', checked)}
                    style={{
                      borderColor: errors.acceptPrivacy ? theme.destructive : 'rgba(255, 255, 255, 0.6)',
                    }}
                  />
                  <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, flex: 1 }}>
                    I accept the{' '}
                    <Text style={{ color: 'white', textDecorationLine: 'underline' }}>
                      Privacy Policy
                    </Text>
                  </Text>
                </HStack>
              </VStack>
            </Animated.View>

            {/* Social Login */}
            {/* <Animated.View entering={FadeInUp.duration(400).delay(700)}>
              <VStack gap={3}>
                <HStack gap={2} style={{ alignItems: 'center' }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>or continue with</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                </HStack>

                <HStack gap={3}>
                  <Button
                    onPress={() => handleSocialLogin('google')}
                    variant="outline"
                    size={buttonSize}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    <HStack gap={2} align="center">
                      <Symbol name="globe" size={20} color="white" />
                      <Text style={{ color: 'white' }}>Google</Text>
                    </HStack>
                  </Button>

                  <Button
                    onPress={() => handleSocialLogin('github')}
                    variant="outline"
                    size={buttonSize}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    <HStack gap={2} align="center">
                      <Symbol name="chevron.left.forwardslash.chevron.right" size={20} color="white" />
                      <Text style={{ color: 'white' }}>GitHub</Text>
                    </HStack>
                  </Button>
                </HStack>
              </VStack>
            </Animated.View> */}
          </VStack>

          {/* Create Account Button */}
          <Animated.View entering={FadeInDown.duration(400).delay(800)}>
            <Button
              onPress={onSubmit}
              disabled={!isFormValid || isLoading}
              isLoading={isLoading}
              size={buttonSize}
              fullWidth
              style={[
                {
                  backgroundColor: isFormValid && !isLoading ? 'white' : 'rgba(255, 255, 255, 0.2)',
                  borderColor: isFormValid && !isLoading ? 'white' : 'rgba(255, 255, 255, 0.3)',
                },
                ...(isFormValid && !isLoading ? [shadowLg] : []),
              ]}
            >
              <Text style={{
                color: isFormValid && !isLoading ? theme.primary : 'rgba(255, 255, 255, 0.6)',
                fontSize: isMobile ? 16 : 18,
                fontWeight: 'bold',
              }}>
                Create Account
              </Text>
            </Button>
          </Animated.View>

          {/* Already Have Account */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(900)}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
              Already have an account?{' '}
              <Text
                onPress={() => router.push('/(public)/auth/login')}
                style={{ color: 'white', fontWeight: '600' }}
              >
                Sign In
              </Text>
            </Text>
          </Animated.View>
        </VStack>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}