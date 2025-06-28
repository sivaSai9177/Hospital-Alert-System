/**
 * OnboardingLayout Component
 * Provides consistent layout and navigation for all onboarding screens
 * with full theme and responsive support
 */

import React, { ReactNode } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Symbol } from '@/components/universal/display/Symbols';
import { Text } from '@/components/universal/typography/Text';
import { haptic } from '@/lib/ui/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '@/hooks/responsive';
import { VStack } from '@/components/universal/layout/Stack';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useShadow } from '@/hooks/useShadow';
import { GlassCard } from '@/components/universal/display';

interface OnboardingLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showSkip?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  progress?: number;
  backgroundGradient?: string[];
  className?: string;
  contentClassName?: string;
  glassBackground?: boolean;
}

export function OnboardingLayout({
  children,
  title,
  subtitle,
  showBack = true,
  showSkip = false,
  onBack,
  onSkip,
  progress = 0,
  backgroundGradient = ['#1e3a8a', '#3b82f6', '#60a5fa'] as const,
  className,
  contentClassName,
  glassBackground = false,
}: OnboardingLayoutProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const shadowSm = useShadow({ size: 'sm' });
  const shadowMd = useShadow({ size: 'md' });

  // Responsive values
  const contentPadding = isMobile ? spacing[4] : isTablet ? spacing[6] : spacing[8];
  const maxContentWidth = isMobile ? '100%' : isTablet ? 600 : 800;
  const titleSize = isMobile ? 28 : isTablet ? 32 : 36;
  const subtitleSize = isMobile ? 16 : isTablet ? 18 : 20;
  const iconSize = isMobile ? 20 : 24;
  const progressHeight = isMobile ? 4 : 6;

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${progress}%`, {
        damping: 15,
        stiffness: 100,
      }),
    };
  });

  const handleBack = () => {
    haptic('light');
    onBack?.();
  };

  const handleSkip = () => {
    haptic('light');
    onSkip?.();
  };

  return (
    <View style={{ flex: 1 }} className={className}>
      {/* Background Gradient */}
      <LinearGradient
        colors={backgroundGradient as any}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Glass Overlay */}
      {glassBackground && (
        <View style={StyleSheet.absoluteFillObject}>
          <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
            ]}
          />
        </View>
      )}

      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{
              paddingHorizontal: contentPadding,
              paddingTop: spacing[4],
              paddingBottom: spacing[2],
            }}
          >
            {/* Navigation Bar */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing[4],
            }}>
              {showBack ? (
                <TouchableOpacity
                  onPress={handleBack}
                  style={[
                    {
                      width: spacing[10],
                      height: spacing[10],
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: spacing[5],
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    shadowSm,
                  ]}
                >
                  <Symbol
                    name="chevron.left"
                    size={iconSize}
                    color="white"
                  />
                </TouchableOpacity>
              ) : (
                <View style={{ width: spacing[10] }} />
              )}

              {showSkip && (
                <TouchableOpacity 
                  onPress={handleSkip}
                  style={[
                    {
                      paddingHorizontal: spacing[4],
                      paddingVertical: spacing[2],
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: spacing[6],
                    },
                    shadowSm,
                  ]}
                >
                  <Text style={{ color: 'white', fontSize: isMobile ? 14 : 16 }}>
                    Skip
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Progress Bar */}
            {progress > 0 && (
              <View style={{ marginBottom: spacing[6] }}>
                <View
                  style={{
                    height: progressHeight,
                    borderRadius: progressHeight / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    overflow: 'hidden',
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        height: '100%',
                        borderRadius: progressHeight / 2,
                        backgroundColor: '#10b981',
                      },
                      progressStyle,
                      shadowMd,
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Title Section */}
            {(title || subtitle) && (
              <VStack gap={isMobile ? 2 : 3} style={{ marginBottom: spacing[6] }}>
                {title && (
                  <Animated.View entering={SlideInRight.duration(400).delay(100)}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: titleSize,
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                    >
                      {title}
                    </Text>
                  </Animated.View>
                )}
                {subtitle && (
                  <Animated.View entering={SlideInRight.duration(400).delay(200)}>
                    <Text
                      style={{
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontSize: subtitleSize,
                        textAlign: 'center',
                        lineHeight: subtitleSize * 1.5,
                      }}
                    >
                      {subtitle}
                    </Text>
                  </Animated.View>
                )}
              </VStack>
            )}
          </Animated.View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              entering={FadeIn.duration(500).delay(300)}
              exiting={FadeOut.duration(200)}
              style={{
                flex: 1,
                paddingHorizontal: contentPadding,
                paddingBottom: spacing[6],
                alignItems: 'center',
              }}
              className={contentClassName}
            >
              <View style={{
                width: '100%',
                maxWidth: maxContentWidth,
              }}>
                {children}
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Decorative Elements */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {/* Top Right Circle */}
        <Animated.View
          entering={FadeIn.duration(1000).delay(400)}
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: isMobile ? 250 : 300,
            height: isMobile ? 250 : 300,
            borderRadius: isMobile ? 125 : 150,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        />

        {/* Bottom Left Circle */}
        <Animated.View
          entering={FadeIn.duration(1000).delay(600)}
          style={{
            position: 'absolute',
            bottom: -150,
            left: -150,
            width: isMobile ? 350 : 400,
            height: isMobile ? 350 : 400,
            borderRadius: isMobile ? 175 : 200,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
          }}
        />

        {/* Middle decorative element */}
        {isDesktop && (
          <Animated.View
            entering={FadeIn.duration(1000).delay(800)}
            style={{
              position: 'absolute',
              top: '40%',
              right: -50,
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          />
        )}
      </View>
    </View>
  );
}