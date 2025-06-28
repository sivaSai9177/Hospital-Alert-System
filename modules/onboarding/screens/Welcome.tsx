/**
 * Welcome Screen
 * First screen of the onboarding flow with hero content and animations
 * Enhanced with theme system and universal components
 */

import React, { useEffect } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/universal/typography/Text';
import { Button } from '@/components/universal/interaction/Button';
import { VStack, HStack, Box } from '@/components/universal/layout';
import { Symbol } from '@/components/universal/display/Symbols';
import { GlassCard } from '@/components/universal/display';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { haptic } from '@/lib/ui/haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { useShadow } from '@/hooks/useShadow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const shadowLg = useShadow({ size: 'lg' });
  const shadowXl = useShadow({ size: 'xl' });
  const { completeStep, goToNextStep } = useOnboardingFlow();
  
  // Animation values
  const pulseValue = useSharedValue(0);
  const floatValue = useSharedValue(0);
  const rotateValue = useSharedValue(0);
  const scaleValue = useSharedValue(0);

  useEffect(() => {
    // Start animations
    pulseValue.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      true
    );

    floatValue.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );

    rotateValue.value = withRepeat(
      withTiming(360, { duration: 20000 }),
      -1,
      false
    );

    scaleValue.value = withTiming(1, { duration: 1000 });
  }, [floatValue, pulseValue, rotateValue, scaleValue]);

  const handleGetStarted = () => {
    haptic('medium');
    completeStep('welcome');
    goToNextStep();
  };

  const handleSignIn = () => {
    haptic('light');
    router.push('/(public)/auth/login');
  };

  // Responsive values
  const heroSize = isMobile ? 200 : isTablet ? 250 : 300;
  const iconSize = isMobile ? 60 : isTablet ? 80 : 100;
  const buttonSize = isMobile ? 'default' : 'lg';
  const titleSize = isMobile ? 32 : isTablet ? 40 : 48;
  const contentGap = isMobile ? 6 : 8;

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pulseValue.value,
      [0, 1],
      [1, 1.2],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      pulseValue.value,
      [0, 1],
      [0.3, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const floatStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      floatValue.value,
      [0, 1],
      [0, -20],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }],
    };
  });

  const rotateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateValue.value}deg` }],
    };
  });

  const heroScaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });

  // Feature cards data
  const features = [
    {
      icon: '🚨',
      title: 'Instant Alerts',
      description: 'Real-time emergency notifications',
      color: theme.destructive,
    },
    {
      icon: '👥',
      title: 'Team Coordination',
      description: 'Seamless healthcare collaboration',
      color: theme.primary,
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'Data-driven insights',
      color: theme.secondary,
    },
  ];

  return (
    <OnboardingLayout
      showBack={false}
      backgroundGradient={['#10b981', '#3b82f6', '#8b5cf6']}
    >
      <VStack gap={contentGap} style={{ flex: 1, justifyContent: 'center' }}>
        {/* Hero Section */}
        <Animated.View 
          entering={ZoomIn.duration(800).springify()}
          style={[
            {
              alignItems: 'center',
              marginBottom: spacing[8],
            },
            heroScaleStyle,
          ]}
        >
          <View style={{ width: heroSize, height: heroSize, alignItems: 'center', justifyContent: 'center' }}>
            {/* Pulse Background */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: heroSize,
                  height: heroSize,
                  borderRadius: heroSize / 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
                pulseStyle,
              ]}
            />
            
            {/* Rotating Ring */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: heroSize * 0.9,
                  height: heroSize * 0.9,
                  borderRadius: heroSize * 0.45,
                  borderWidth: 3,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  borderStyle: 'dashed',
                },
                rotateStyle,
              ]}
            />
            
            {/* Central Icon */}
            <Animated.View
              style={[
                {
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconSize / 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                floatStyle,
                shadowXl,
              ]}
            >
              <Text style={{ fontSize: iconSize * 0.6 }}>🏥</Text>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Welcome Text */}
        <VStack gap={isMobile ? 3 : 4} style={{ alignItems: 'center' }}>
          <Animated.View entering={FadeInUp.duration(600).delay(400)}>
            <Text 
              style={{
                color: 'white',
                fontSize: titleSize,
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              Welcome to{'\n'}Healthcare Hub
            </Text>
          </Animated.View>
          
          <Animated.View entering={FadeInUp.duration(600).delay(500)}>
            <Text 
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: isMobile ? 18 : 20,
                textAlign: 'center',
                lineHeight: isMobile ? 26 : 30,
                paddingHorizontal: spacing[4],
              }}
            >
              Your complete platform for emergency response and patient care coordination
            </Text>
          </Animated.View>
        </VStack>

        {/* Feature Cards */}
        {!isMobile && (
          <HStack 
            gap={4} 
            style={{ 
              marginTop: spacing[8],
              marginBottom: spacing[6],
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {features.map((feature, index) => (
              <Animated.View
                key={feature.title}
                entering={SlideInRight.duration(500).delay(600 + index * 100)}
                style={{ width: isTablet ? '30%' : 150 }}
              >
                <GlassCard style={[
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    padding: spacing[4],
                    alignItems: 'center',
                  },
                  shadowLg,
                ]}>
                  <Text style={{ fontSize: 40, marginBottom: spacing[2] }}>
                    {feature.icon}
                  </Text>
                  <Text 
                    style={{
                      color: 'white',
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center',
                      marginBottom: spacing[1],
                    }}
                  >
                    {feature.title}
                  </Text>
                  <Text 
                    style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: 14,
                      textAlign: 'center',
                    }}
                  >
                    {feature.description}
                  </Text>
                </GlassCard>
              </Animated.View>
            ))}
          </HStack>
        )}

        {/* Action Buttons */}
        <Animated.View 
          entering={FadeInDown.duration(600).delay(800)}
          style={{ marginTop: spacing[8] }}
        >
          <VStack gap={isMobile ? 3 : 4}>
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
              <HStack gap={2} align="center">
                <Text 
                  style={{
                    color: theme.primary,
                    fontSize: isMobile ? 16 : 18,
                    fontWeight: 'bold',
                  }}
                >
                  Get Started
                </Text>
                <Symbol name="arrow.right" size={20} color={theme.primary} />
              </HStack>
            </Button>
            
            <Button
              variant="outline"
              onPress={handleSignIn}
              size={buttonSize}
              fullWidth
              style={{
                borderColor: 'rgba(255, 255, 255, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Text 
                style={{
                  color: 'white',
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: '600',
                }}
              >
                Already have an account? Sign In
              </Text>
            </Button>
          </VStack>
        </Animated.View>

        {/* Bottom Text */}
        <Animated.View 
          entering={FadeInUp.duration(600).delay(1000)}
          style={{ marginTop: spacing[6] }}
        >
          <Text 
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
        </Animated.View>
      </VStack>
    </OnboardingLayout>
  );
}