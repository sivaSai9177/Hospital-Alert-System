/**
 * Phone Verification Screen
 * Optional phone number verification for SMS alerts
 * Enhanced with Better Auth phone number plugin
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withSpring,
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
import { showAlert } from '@/lib/core/alert';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { useShadow } from '@/hooks/useShadow';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export function PhoneVerificationScreen() {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isTablet } = useResponsive();
  const shadowMd = useShadow({ size: 'md' });
  const shadowLg = useShadow({ size: 'lg' });
  
  const {
    state,
    updateUserData,
    completeStep,
    skipStep,
    goToNextStep,
    goToPreviousStep,
    canSkip,
  } = useOnboardingFlow();
  
  const {
    errors,
    validateField,
    setError,
    clearError,
  } = useOnboardingValidation('phoneVerification');

  // States
  const [phoneNumber, setPhoneNumber] = useState(state.userData.phoneNumber || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  
  // Responsive values
  const buttonSize = isMobile ? 'md' : 'lg';
  const contentGap = isMobile ? 5 : 6;
  const otpBoxSize = isMobile ? 44 : 48;
  const otpBoxHeight = isMobile ? 52 : 56;

  // Start resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else {
      return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
    clearError('phoneNumber');
  };

  const handleSendOtp = async () => {
    // Validate phone number
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('phoneNumber', 'Please enter a valid phone number');
      haptic('error');
      return;
    }

    setIsVerifying(true);
    haptic('light');

    try {
      // Send OTP via Better Auth
      const result = await authClient.phoneNumber.sendVerificationOtp({
        phoneNumber: `+1${digits.slice(-10)}`, // Assuming US numbers for now
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to send OTP');
      }

      haptic('success');
      setShowOtpInput(true);
      setResendCooldown(RESEND_COOLDOWN);
      
      showAlert({
        title: 'Code Sent',
        description: 'Check your SMS messages for the verification code',
        variant: 'success',
      });
    } catch (error) {
      haptic('error');
      logger.error('Failed to send phone OTP', error);
      showAlert({
        title: 'Send Failed',
        description: 'Unable to send verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = useCallback((value: string, index: number) => {
    clearError('code');
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      pastedCode.forEach((char, i) => {
        if (i + index < OTP_LENGTH) {
          newOtp[i + index] = char;
        }
      });
      setOtp(newOtp);
      
      // Focus last filled input or next empty one
      const lastIndex = Math.min(index + pastedCode.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastIndex]?.focus();
    } else {
      // Handle single character input
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when complete
      if (value && index === OTP_LENGTH - 1 && newOtp.every(digit => digit)) {
        handleVerify(newOtp.join(''));
      }
    }
  }, [otp]);

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const verificationCode = code || otp.join('');
    
    if (verificationCode.length !== OTP_LENGTH) {
      haptic('error');
      setError('code', 'Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    haptic('light');

    try {
      // Verify OTP via Better Auth
      const digits = phoneNumber.replace(/\D/g, '');
      const result = await authClient.phoneNumber.verifyPhoneNumber({
        phoneNumber: `+1${digits.slice(-10)}`,
        otp: verificationCode,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Verification failed');
      }

      haptic('success');
      
      // Update user data
      updateUserData({
        phoneNumber: phoneNumber,
        phoneNumberVerified: true,
      });
      
      completeStep('phone-verification');
      goToNextStep();
    } catch (error: any) {
      haptic('error');
      setAttempts(prev => prev + 1);
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      logger.error('Phone verification failed', error);
      
      if (attempts >= 2) {
        setError('code', 'Too many attempts. Please request a new code');
        showAlert({
          title: 'Too Many Attempts',
          description: 'Please request a new code',
          variant: 'destructive',
        });
      } else {
        setError('code', 'Invalid verification code');
        showAlert({
          title: 'Invalid Code',
          description: 'Please check your SMS and try again',
          variant: 'destructive',
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    haptic('light');
    
    try {
      const digits = phoneNumber.replace(/\D/g, '');
      const result = await authClient.phoneNumber.sendVerificationOtp({
        phoneNumber: `+1${digits.slice(-10)}`,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to resend code');
      }

      haptic('success');
      setResendCooldown(RESEND_COOLDOWN);
      setAttempts(0);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      showAlert({
        title: 'Code Sent',
        description: 'Check your SMS for the new code',
        variant: 'success',
      });
    } catch (error) {
      haptic('error');
      logger.error('Resend verification failed', error);
      showAlert({
        title: 'Resend Failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSkip = () => {
    haptic('light');
    skipStep('phone-verification');
    goToNextStep();
  };

  // Create animated style function
  const useOtpBoxStyle = (filled: boolean) => {
    return useAnimatedStyle(() => {
      return {
        transform: [
          {
            scale: withSpring(filled ? 1.05 : 1, {
              damping: 15,
              stiffness: 100,
            }),
          },
        ],
        borderColor: withTiming(
          filled ? theme.primary : 'rgba(255, 255, 255, 0.3)',
          { duration: 200 }
        ),
        backgroundColor: withTiming(
          filled ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          { duration: 200 }
        ),
      };
    });
  };

  return (
    <OnboardingLayout
      title="Phone Verification"
      subtitle="Add your phone number for SMS alerts (optional)"
      onBack={goToPreviousStep}
      onSkip={canSkip ? handleSkip : undefined}
      showSkip={canSkip && !showOtpInput}
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

          {/* Phone Icon */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            style={{ alignItems: 'center' }}
          >
            <View
              style={[
                {
                  width: spacing[24],
                  height: spacing[24],
                  borderRadius: spacing[12],
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                shadowMd,
              ]}
            >
              <Symbol name="phone.fill" size={48} color="white" />
            </View>
          </Animated.View>

          {/* Benefits */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <GlassCard
              style={[
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  borderWidth: 1,
                  padding: spacing[4],
                },
                shadowMd,
              ]}
            >
              <VStack gap={3}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  Why add your phone number?
                </Text>
                <VStack gap={2}>
                  <HStack gap={2} align="center">
                    <Symbol name="bell.badge.fill" size={16} color={theme.info || '#60a5fa'} />
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, flex: 1 }}>
                      Receive critical alert notifications via SMS
                    </Text>
                  </HStack>
                  <HStack gap={2} align="center">
                    <Symbol name="shield.lefthalf.filled" size={16} color={theme.success} />
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, flex: 1 }}>
                      Enable two-factor authentication for added security
                    </Text>
                  </HStack>
                  <HStack gap={2} align="center">
                    <Symbol name="person.fill.checkmark" size={16} color={theme.warning || '#f59e0b'} />
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, flex: 1 }}>
                      Quick identity verification for emergency access
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </GlassCard>
          </Animated.View>

          {!showOtpInput ? (
            <>
              {/* Phone Input */}
              <Animated.View entering={FadeInUp.duration(400).delay(500)}>
                <VStack gap={2}>
                  <Input
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    size={buttonSize}
                    error={errors.phoneNumber}
                    leftIcon={
                      <Symbol name="phone" size={20} color="rgba(255, 255, 255, 0.6)" />
                    }
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: errors.phoneNumber ? theme.destructive : 'rgba(255, 255, 255, 0.3)',
                      color: 'white',
                    }}
                  />
                  {errors.phoneNumber && (
                    <Text style={{ color: theme.destructive, fontSize: 14 }}>
                      {errors.phoneNumber}
                    </Text>
                  )}
                </VStack>
              </Animated.View>

              {/* Send Code Button */}
              <Animated.View entering={FadeInDown.duration(400).delay(600)}>
                <Button
                  onPress={handleSendOtp}
                  disabled={!phoneNumber || isVerifying}
                  isLoading={isVerifying}
                  size={buttonSize}
                  fullWidth
                  style={[
                    {
                      backgroundColor: phoneNumber && !isVerifying ? 'white' : 'rgba(255, 255, 255, 0.2)',
                      borderColor: phoneNumber && !isVerifying ? 'white' : 'rgba(255, 255, 255, 0.3)',
                    },
                    ...(phoneNumber && !isVerifying ? [shadowLg] : []),
                  ]}
                >
                  <Text style={{
                    color: phoneNumber && !isVerifying ? theme.primary : 'rgba(255, 255, 255, 0.6)',
                    fontSize: isMobile ? 16 : 18,
                    fontWeight: 'bold',
                  }}>
                    Send Verification Code
                  </Text>
                </Button>
              </Animated.View>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <Animated.View entering={FadeInUp.duration(400).delay(400)}>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  textAlign: 'center', 
                  marginBottom: spacing[4],
                  fontSize: 16,
                }}>
                  Enter the code sent to {phoneNumber}
                </Text>
                
                <HStack gap={isMobile ? 2 : 3} style={{ justifyContent: 'center' }}>
                  {otp.map((digit, index) => {
                    const OtpBox = () => {
                      const animatedStyle = useOtpBoxStyle(!!digit);
                      
                      return (
                        <Animated.View
                          style={[
                            {
                              width: otpBoxSize,
                              height: otpBoxHeight,
                              borderRadius: spacing[3],
                              borderWidth: 2,
                              overflow: 'hidden',
                            },
                            animatedStyle,
                          ]}
                          entering={FadeInUp.duration(300).delay(500 + index * 50)}
                        >
                          <TextInput
                            ref={(ref) => {
                              if (ref) inputRefs.current[index] = ref;
                            }}
                            value={digit}
                            onChangeText={(value) => handleOtpChange(value, index)}
                            onKeyPress={({ nativeEvent }) =>
                              handleKeyPress(nativeEvent.key, index)
                            }
                            keyboardType="number-pad"
                            maxLength={OTP_LENGTH}
                            selectTextOnFocus
                            style={{
                              flex: 1,
                              fontSize: isMobile ? 20 : 24,
                              fontWeight: '600',
                              textAlign: 'center',
                              color: 'white',
                            }}
                          />
                        </Animated.View>
                      );
                    };
                    
                    return <OtpBox key={index} />;
                  })}
                </HStack>
                
                {errors.code && (
                  <Text style={{ 
                    color: theme.destructive, 
                    fontSize: 14, 
                    marginTop: spacing[2],
                    textAlign: 'center',
                  }}>
                    {errors.code}
                  </Text>
                )}
              </Animated.View>

              {/* Resend Option */}
              <Animated.View
                entering={FadeInUp.duration(400).delay(600)}
                style={{ alignItems: 'center' }}
              >
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  style={{ padding: spacing[2] }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      color: resendCooldown > 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                      fontSize: 15,
                    }}
                  >
                    Didn&apos;t receive the code?{' '}
                    <Text
                      style={{
                        fontWeight: '600',
                        color: resendCooldown > 0 ? 'rgba(255, 255, 255, 0.4)' : 'white',
                      }}
                    >
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Resend'}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Verify Button */}
              <Animated.View 
                entering={FadeInDown.duration(400).delay(700)}
                style={{ marginTop: spacing[4] }}
              >
                <Button
                  onPress={() => handleVerify()}
                  disabled={otp.some(d => !d) || isVerifying}
                  isLoading={isVerifying}
                  size={buttonSize}
                  fullWidth
                  style={[
                    {
                      backgroundColor: otp.every(d => d) && !isVerifying ? 'white' : 'rgba(255, 255, 255, 0.2)',
                      borderColor: otp.every(d => d) && !isVerifying ? 'white' : 'rgba(255, 255, 255, 0.3)',
                    },
                    ...(otp.every(d => d) && !isVerifying ? [shadowLg] : []),
                  ]}
                >
                  <Text style={{
                    color: otp.every(d => d) && !isVerifying ? theme.primary : 'rgba(255, 255, 255, 0.6)',
                    fontSize: isMobile ? 16 : 18,
                    fontWeight: 'bold',
                  }}>
                    Verify Phone Number
                  </Text>
                </Button>
              </Animated.View>
            </>
          )}
        </VStack>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}