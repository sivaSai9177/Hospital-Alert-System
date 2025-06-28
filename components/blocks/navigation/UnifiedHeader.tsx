import React, { useState, useEffect } from 'react';
import { View, Pressable, Platform, StatusBar } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { Symbol } from '@/components/universal/display/Symbols';
import { Text, Badge, HStack, VStack, Box } from '@/components/universal';
import { HospitalSwitcher } from '@/components/blocks/organization';
import { useHospitalStore } from '@/lib/stores/hospital-store';
import { useUnreadNotifications } from '@/hooks/healthcare';
import { useAuth } from '@/hooks/useAuth';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface UnifiedHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  onMenuPress?: () => void;
  rightActions?: React.ReactNode;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  blurIntensity?: number;
}

export function UnifiedHeader({
  title,
  subtitle,
  showBackButton = true,
  showMenuButton = true,
  onMenuPress,
  rightActions,
  rightElement,
  transparent = false,
  blurIntensity = 80,
}: UnifiedHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const insets = useSafeAreaInsets();
  const { currentHospital } = useHospitalStore();
  const { user } = useAuth();
  
  // Prevent double navigation
  const isNavigatingRef = React.useRef(false);
  
  // Get page title from pathname if not provided
  const getPageTitle = () => {
    if (title) return title;
    if (currentHospital?.name) return currentHospital.name;
    
    const pathSegments = pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    const titles: Record<string, string> = {
      home: 'Dashboard',
      alerts: 'Alerts',
      patients: 'Patients',
      settings: 'Settings',
      'escalation-queue': 'Escalation Queue',
      history: 'Alert History',
    };
    
    return titles[lastSegment] || 'Healthcare Hub';
  };
  
  // Notifications
  const { data: notifications } = useUnreadNotifications({
    enabled: !!user,
  });
  
  const unreadCount = notifications?.count || 0;
  
  // Animation for button presses
  const createPressAnimation = () => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));
    
    const handlePressIn = () => {
      scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    };
    
    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };
    
    return { animatedStyle, handlePressIn, handlePressOut };
  };
  
  // Header height
  const HEADER_HEIGHT = 56;
  const TOTAL_HEIGHT = HEADER_HEIGHT + insets.top;
  
  // Background component
  const HeaderBackground = () => {
    if (transparent) return null;
    
    if (Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={blurIntensity}
          tint={theme.scheme === 'dark' ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      );
    }
    
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.background + 'f8',
        }}
      />
    );
  };
  
  const leftButtonAnimation = createPressAnimation();
  const searchAnimation = createPressAnimation();
  const notificationAnimation = createPressAnimation();
  
  return (
    <>
      <StatusBar
        barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <View
        style={{
          height: TOTAL_HEIGHT,
          borderBottomWidth: transparent ? 0 : 0.5,
          borderBottomColor: theme.border + '30',
        }}
      >
        <HeaderBackground />
        <View
          style={{
            marginTop: insets.top,
            height: HEADER_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing[4],
          }}
        >
          {/* Left section */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {showBackButton && pathname !== '/home' ? (
              <AnimatedPressable
                onPress={() => {
                  haptic('light');
                  router.back();
                }}
                onPressIn={leftButtonAnimation.handlePressIn}
                onPressOut={leftButtonAnimation.handlePressOut}
                style={[
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.muted + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  leftButtonAnimation.animatedStyle,
                ]}
              >
                <Symbol name="chevron.left" size={20} color={theme.foreground} />
              </AnimatedPressable>
            ) : showMenuButton ? (
              <AnimatedPressable
                onPress={() => {
                  haptic('light');
                  onMenuPress?.();
                }}
                onPressIn={leftButtonAnimation.handlePressIn}
                onPressOut={leftButtonAnimation.handlePressOut}
                style={[
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.muted + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  leftButtonAnimation.animatedStyle,
                ]}
              >
                <Symbol name="line.3.horizontal" size={20} color={theme.foreground} />
              </AnimatedPressable>
            ) : null}
          </View>
          
          {/* Center section - Title or Hospital Switcher */}
          <View style={{ flex: 2, alignItems: 'center' }}>
            {title ? (
              <VStack alignItems="center" gap={0}>
                <Text size="lg" weight="semibold" numberOfLines={1}>
                  {getPageTitle()}
                </Text>
                {subtitle && (
                  <Text size="xs" colorTheme="mutedForeground" numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </VStack>
            ) : (
              <HospitalSwitcher compact showLabel={false} />
            )}
          </View>
          
          {/* Right section */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            {rightElement || rightActions || (
              <HStack gap={2}>
                {/* Search button */}
                <AnimatedPressable
                  onPress={() => {
                    if (isNavigatingRef.current) return;
                    
                    isNavigatingRef.current = true;
                    haptic('light');
                    
                    router.push('/search');
                    
                    // Reset after navigation
                    setTimeout(() => {
                      isNavigatingRef.current = false;
                    }, 500);
                  }}
                  onPressIn={searchAnimation.handlePressIn}
                  onPressOut={searchAnimation.handlePressOut}
                  style={[
                    {
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.muted + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    searchAnimation.animatedStyle,
                  ]}
                >
                  <Symbol name="magnifyingglass" size={18} color={theme.foreground} />
                </AnimatedPressable>
                
                {/* Notifications */}
                <AnimatedPressable
                  onPress={() => {
                    haptic('light');
                    router.push('/notifications');
                  }}
                  onPressIn={notificationAnimation.handlePressIn}
                  onPressOut={notificationAnimation.handlePressOut}
                  style={[
                    {
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.muted + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    },
                    notificationAnimation.animatedStyle,
                  ]}
                >
                  <Symbol 
                    name={unreadCount > 0 ? 'bell.badge' : 'bell'} 
                    size={18} 
                    color={theme.foreground} 
                  />
                  {unreadCount > 0 && (
                    <Badge
                      variant="error"
                      size="xs"
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        minWidth: 16,
                        height: 16,
                        paddingHorizontal: 3,
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </AnimatedPressable>
              </HStack>
            )}
          </View>
        </View>
      </View>
    </>
  );
}