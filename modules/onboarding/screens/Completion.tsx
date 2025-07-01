/**
 * Completion Screen
 * Celebration and next steps after successful onboarding
 * Enhanced with theme support and animations
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/universal/typography/Text';
import { Button } from '@/components/universal/interaction/Button';
import { VStack, HStack } from '@/components/universal/layout/Stack';
import { Symbol } from '@/components/universal/display/Symbols';
import { GlassCard } from '@/components/universal/display';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { haptic } from '@/lib/ui/haptics';
import { useRouter } from 'expo-router';
import { logger } from '@/lib/core/debug/unified-logger';
import { showAlert } from '@/lib/core/alert';
import { api } from '@/lib/api/trpc';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { useShadow } from '@/hooks/useShadow';
// import LottieView from 'lottie-react-native'; // Uncomment if lottie-react-native is installed

export function CompletionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isTablet } = useResponsive();
  const shadowLg = useShadow({ size: 'lg' });
  const shadowXl = useShadow({ size: 'xl' });
  
  const { state, completeOnboarding } = useOnboardingFlow();
  const { user, updateAuth } = useAuth();
  const completeProfileMutation = api.auth.completeProfile.useMutation();
  
  // Animation values
  const confettiScale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const particleRotation = useSharedValue(0);
  
  // Responsive values
  const buttonSize = isMobile ? 'md' : 'lg';
  const contentGap = isMobile ? 5 : 6;
  const celebrationSize = isMobile ? 160 : 192;
  const checkmarkSize = isMobile ? 80 : 96;
  
  // const lottieRef = useRef<LottieView>(null); // Uncomment if using Lottie

  useEffect(() => {
    // Trigger celebration animations
    haptic('success');
    
    // Play animations in sequence
    checkScale.value = withSpring(1, {
      damping: 10,
      stiffness: 100,
    });

    confettiScale.value = withSequence(
      withTiming(1.2, { duration: 600 }),
      withTiming(1, { duration: 300 })
    );

    contentOpacity.value = withTiming(1, {
      duration: 800,
    });

    particleRotation.value = withRepeat(
      withTiming(360, { duration: 10000 }),
      -1,
      false
    );

    // Play Lottie animation if available
    // lottieRef.current?.play(); // Uncomment if using Lottie
  }, [checkScale, confettiScale, contentOpacity, particleRotation]);

  const handleGetStarted = async () => {
    haptic('medium');

    try {
      // Prepare user data for profile completion
      const profileData = {
        name: state.userData.name || user?.name || '',
        role: state.selectedRole || 'user',
        organizationId: state.userData.hospitalId,
        defaultHospitalId: state.userData.hospitalId,
        department: state.userData.departmentId,
        phoneNumber: state.userData.phoneNumber,
        jobTitle: state.userData.specialization,
        licenseNumber: state.userData.licenseNumber,
        acceptTerms: true,
        acceptPrivacy: true,
      };

      // Update profile via API
      const result = await completeProfileMutation.mutateAsync(profileData);

      // Update local auth state with the new user data
      if (result?.user) {
        updateAuth(result.user, result.session?.token);
      }

      // Complete local onboarding state
      await completeOnboarding();

      // Navigate to main app
      router.replace('/home');

      showAlert({
        title: 'Welcome!',
        description: 'Your account is ready to use',
        variant: 'success',
      });
    } catch (error) {
      logger.error('Failed to complete onboarding', error);
      showAlert({
        title: 'Error',
        description: 'Unable to complete setup. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Animated styles
  const checkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkScale.value }],
    } as any;
  });

  const confettiStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: confettiScale.value },
        { rotate: `${particleRotation.value}deg` },
      ],
    } as any;
  });

  const contentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
    };
  });

  // Particle animation style
  const particleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${particleRotation.value}deg` },
      ],
    } as any;
  });

  // Quick stats based on onboarding data
  const stats = [
    {
      icon: 'clock',
      label: 'Setup Time',
      value: `${Math.round((Date.now() - new Date(state.startedAt).getTime()) / 60000)} min`,
    },
    {
      icon: 'checkmark.shield',
      label: 'Profile Complete',
      value: '100%',
    },
    {
      icon: 'bell.badge',
      label: 'Notifications',
      value: state.userData.notificationsEnabled ? 'Enabled' : 'Disabled',
    },
  ];

  return (
    <OnboardingLayout
      showBack={false}
      backgroundGradient={['#10b981', '#3b82f6', '#8b5cf6']}
    >
      <VStack gap={contentGap} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* Celebration Animation Container */}
        <View style={{ 
          position: 'relative', 
          width: celebrationSize, 
          height: celebrationSize, 
          alignItems: 'center', 
          justifyContent: 'center',
        }}>
          {/* Animated Particles */}
          {[...Array(6)].map((_, i) => {
            const angle = (i * 60) * Math.PI / 180;
            const x = Math.cos(angle) * 80;
            const y = Math.sin(angle) * 80;
            
            return (
              <Animated.View
                key={i}
                style={[
                  {
                    position: 'absolute',
                    left: celebrationSize/2 - 10 + x,
                    top: celebrationSize/2 - 10 + y,
                    width: isMobile ? 16 : 20,
                    height: isMobile ? 16 : 20,
                    borderRadius: isMobile ? 8 : 10,
                    backgroundColor: ['#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185'][i],
                  },
                  particleStyle,
                ]}
              />
            );
          })}

          {/* Success Checkmark */}
          <Animated.View
            style={[
              {
                width: checkmarkSize + 24,
                height: checkmarkSize + 24,
                borderRadius: (checkmarkSize + 24) / 2,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              },
              checkStyle,
              shadowXl,
            ]}
          >
            <View
              style={{
                width: checkmarkSize,
                height: checkmarkSize,
                borderRadius: checkmarkSize / 2,
                backgroundColor: theme.success,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Symbol name="checkmark.circle.fill" size={isMobile ? 40 : 48} color="white" />
            </View>
          </Animated.View>

          {/* Confetti Effect */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 200,
                height: 200,
                opacity: 0.3,
              },
              confettiStyle,
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['transparent', '#fbbf24', '#34d399', '#60a5fa', 'transparent']}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 100,
              }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
        </View>

        {/* Success Message */}
        <Animated.View style={[contentStyle, { alignItems: 'center' }]}>
          <Animated.View entering={ZoomIn.duration(600).delay(400)}>
            <Text
              style={{
                color: 'white',
                textAlign: 'center',
                marginBottom: spacing[3],
                fontSize: isMobile ? 28 : 32,
                fontWeight: 'bold',
              }}
            >
              Congratulations! 🎉
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(600)}>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center',
                paddingHorizontal: spacing[8],
                fontSize: isMobile ? 16 : 18,
                lineHeight: isMobile ? 24 : 28,
              }}
            >
              Your account is ready. Welcome to the future of healthcare communication.
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(800)}
          style={{ width: '100%' }}
        >
          <HStack style={{ justifyContent: 'space-around' }}>
            {stats.map((stat, index) => (
              <Animated.View
                key={stat.icon}
                entering={FadeInUp.duration(400).delay(900 + index * 100)}
                style={{ alignItems: 'center' }}
              >
                <View
                  style={[
                    {
                      width: spacing[12],
                      height: spacing[12],
                      borderRadius: spacing[3],
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: spacing[2],
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    shadowLg,
                  ]}
                >
                  <Symbol name={stat.icon as any} size={24} color="white" />
                </View>
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}>
                  {stat.label}
                </Text>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                  {stat.value}
                </Text>
              </Animated.View>
            ))}
          </HStack>
        </Animated.View>

        {/* Next Steps */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(1100)}
          style={{ width: '100%' }}
        >
          <GlassCard
            style={[
              {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                padding: spacing[4],
              },
              shadowLg,
            ]}
          >
            <Text style={{ color: 'white', fontWeight: '600', marginBottom: spacing[3], fontSize: 16 }}>
              What&apos;s Next?
            </Text>
            <VStack gap={2}>
              <HStack gap={2} align="center">
                <Symbol name="1.circle.fill" size={20} color="white" />
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, flex: 1 }}>
                  Explore your personalized dashboard
                </Text>
              </HStack>
              <HStack gap={2} align="center">
                <Symbol name="2.circle.fill" size={20} color="white" />
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, flex: 1 }}>
                  Review active alerts in your department
                </Text>
              </HStack>
              <HStack gap={2} align="center">
                <Symbol name="3.circle.fill" size={20} color="white" />
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, flex: 1 }}>
                  Connect with your healthcare team
                </Text>
              </HStack>
            </VStack>
          </GlassCard>
        </Animated.View>

        {/* Get Started Button */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(1300)}
          style={{ width: '100%' }}
        >
          <Button
            onPress={handleGetStarted}
            size={buttonSize}
            fullWidth
            style={[
              {
                backgroundColor: 'white',
                borderColor: 'white',
              },
              shadowLg,
            ]}
          >
            <Text style={{
              color: theme.primary,
              fontSize: isMobile ? 16 : 18,
              fontWeight: 'bold',
            }}>
              Get Started
            </Text>
          </Button>
        </Animated.View>

        {/* Support Link */}
        <Animated.View
          entering={FadeIn.duration(600).delay(1500)}
          style={{ alignItems: 'center' }}
        >
          <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13 }}>
            Need help? Visit our{' '}
            <Text style={{ color: 'white', textDecorationLine: 'underline' }}>
              support center
            </Text>
          </Text>
        </Animated.View>
      </VStack>
    </OnboardingLayout>
  );
}