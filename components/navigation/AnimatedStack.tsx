import React from 'react';
import { Stack, StackProps, Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useTheme } from '@/lib/theme/provider';
import { useAnimationStore } from '@/lib/stores/animation-store';
import { Easing } from 'react-native';

// Page transition types
export type TransitionType = 
  | 'slide'
  | 'fade'
  | 'modal'
  | 'zoom'
  | 'flip'
  | 'glass'
  | 'parallax'
  | 'cube'
  | 'none';

// Default transition configuration
const defaultTransitions = {
  slide: {
    cardStyleInterpolator: ({ current, layouts }: any) => ({
      cardStyle: {
        transform: [{
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          })
        }],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0.7, 1],
        }),
      },
    }),
    transitionSpec: {
      open: { animation: 'spring', config: { stiffness: 1000, damping: 500, mass: 3 } },
      close: { animation: 'timing', config: { duration: 300, easing: Easing.out(Easing.poly(4)) } },
    },
  },
  fade: {
    cardStyleInterpolator: ({ current }: any) => ({
      cardStyle: {
        opacity: current.progress,
      },
    }),
    transitionSpec: {
      open: { animation: 'timing', config: { duration: 300 } },
      close: { animation: 'timing', config: { duration: 300 } },
    },
  },
  none: {
    cardStyleInterpolator: () => ({}),
    transitionSpec: {
      open: { animation: 'timing', config: { duration: 0 } },
      close: { animation: 'timing', config: { duration: 0 } },
    },
  },
};

// Local implementation of getDefaultPageTransition
function getDefaultPageTransition(): TransitionType {
  if (Platform.OS === 'ios') return 'slide';
  if (Platform.OS === 'android') return 'fade';
  return 'fade'; // Default for web
}

// Local implementation of applyPageTransition
function applyPageTransition(transitionType: TransitionType = 'slide') {
  const transition = defaultTransitions[transitionType] || defaultTransitions.fade;
  return {
    ...transition,
    presentation: transitionType === 'modal' ? 'modal' : 'card',
    gestureEnabled: transitionType !== 'none',
    gestureDirection: transitionType === 'modal' ? 'vertical' : 'horizontal',
  };
}

interface AnimatedStackProps extends Partial<StackProps> {
  transitionType?: TransitionType;
  enableGestures?: boolean;
  children?: React.ReactNode;
}

export function AnimatedStack({ 
  transitionType = getDefaultPageTransition(),
  enableGestures = true,
  children,
  ...props 
}: AnimatedStackProps) {
  const theme = useTheme();
  const { reducedMotion } = useAnimationStore();
  
  // Use no transition if reduced motion is enabled
  const finalTransitionType = reducedMotion ? 'none' : transitionType;
  
  // Apply the transition configuration
  const transition = applyPageTransition(finalTransitionType);

  return (
    <Stack
      {...props}
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.background,
        },
        ...transition,
        gestureEnabled: enableGestures && !reducedMotion && Platform.OS !== 'web',
        // Apply theme-specific header styles if header is shown
        headerStyle: {
          backgroundColor: theme.card,
          ...(Platform.OS === 'web' && finalTransitionType === 'glass' && {
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            backgroundColor: theme.card + 'CC', // Semi-transparent
          }),
        },
        headerTintColor: theme.foreground,
        headerTitleStyle: {
          fontFamily: Platform.select({
            ios: 'SF Pro Display',
            android: 'Roboto',
            default: 'System',
          }),
          fontWeight: '600',
          fontSize: 17,
        },
        headerBackTitle: 'Back',
        headerBackTitleVisible: Platform.OS === 'ios',
        ...props.screenOptions,
      }}
    >
      {children}
    </Stack>
  );
}

// Screen wrapper with animation support
interface AnimatedScreenProps {
  children: React.ReactNode;
  transitionType?: TransitionType;
  options?: any;
}

export function AnimatedScreen({ 
  children, 
  transitionType,
  options = {} 
}: AnimatedScreenProps) {
  return (
    <Stack.Screen
      options={{
        ...options,
        ...(transitionType ? applyPageTransition(transitionType) : {}),
      }}
    >
      {children}
    </Stack.Screen>
  );
}

// Tab navigator with animations
export function AnimatedTabs({ children, ...props }: any) {
  const theme = useTheme();
  const { reducedMotion } = useAnimationStore();
  
  return (
    <Tabs
      {...props}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.mutedForeground,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          ...(Platform.OS === 'web' && {
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            backgroundColor: theme.card + 'CC',
          }),
        },
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: Platform.OS !== 'web',
        // Disable animations if reduced motion is enabled
        animationEnabled: !reducedMotion,
        ...props.screenOptions,
      }}
    >
      {children}
    </Tabs>
  );
}