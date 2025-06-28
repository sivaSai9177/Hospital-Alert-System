/**
 * Email Verification Screen
 * OTP verification for email confirmation
 * Enhanced with theme support and validation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

export function EmailVerificationScreen() {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isTablet } = useResponsive();
  const shadowMd = useShadow({ size: 'md' });
  const shadowLg = useShadow({ size: 'lg' });
  
  const {
    state,
    completeStep,
    goToNextStep,
    goToPreviousStep,
  } = useOnboardingFlow();
  
  const {
    errors,
    validateField,
    setError,
    clearError,
  } = useOnboardingValidation('emailVerification');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [isResending, setIsResending] = useState(false);
  
  // Responsive values
  const buttonSize = isMobile ? 'md' : 'lg';
  const contentGap = isMobile ? 5 : 6;
  const otpBoxSize = isMobile ? 44 : 48;
  const otpBoxHeight = isMobile ? 52 : 56;

  // Start resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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
  }, [otp, clearError]);

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
      showAlert({
        title: 'Invalid Code',
        description: 'Please enter all 6 digits',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    haptic('light');

    try {
      // Use Better Auth email OTP verification
      const result = await authClient.emailOTP.verifyEmail({
        email: state.userData.email!,
        otp: verificationCode,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Verification failed');
      }

      haptic('success');
      completeStep('email-verification');
      goToNextStep();
    } catch (error: any) {
      haptic('error');
      setAttempts(prev => prev + 1);
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      logger.error('Email verification failed', error);
      
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
          description: 'Please check your email and try again',
          variant: 'destructive',
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    haptic('light');
    setIsResending(true);
    
    try {
      // Use Better Auth email OTP resend
      const result = await authClient.emailOTP.sendVerificationOtp({
        email: state.userData.email!,
        type: 'email-verification',
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
        description: 'Check your email for the new code',
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
      title="Verify Your Email"
      subtitle={`We've sent a 6-digit code to ${state.userData.email}`}
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

          {/* Email Icon */}
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
              <Symbol name="envelope.badge.fill" size={48} color="white" />
            </View>
          </Animated.View>

          {/* OTP Input */}
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              textAlign: 'center', 
              marginBottom: spacing[4],
              fontSize: 16,
            }}>
              Enter the verification code
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
                Verify Email
              </Text>
            </Button>
          </Animated.View>

          {/* Help Text */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(800)}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              textAlign: 'center', 
              fontSize: 13,
              paddingHorizontal: spacing[8],
            }}>
              Check your spam folder if you don&apos;t see the email in your inbox
            </Text>
          </Animated.View>
        </VStack>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}