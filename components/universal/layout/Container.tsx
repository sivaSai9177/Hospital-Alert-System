import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, ScrollViewProps, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { Box, BoxProps } from './Box';
import { cn } from '@/lib/core/utils';
import { useAnimationStore } from '@/lib/stores/animation-store';

export type ContainerAnimationType = 'fade' | 'scale' | 'slide' | 'none';

interface ContainerProps extends Omit<BoxProps, 'maxWidth'> {
  safe?: boolean;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centered?: boolean;
  children?: React.ReactNode;
  
  // Animation props
  animated?: boolean;
  animationType?: ContainerAnimationType;
  animationDuration?: number;
  animationDelay?: number;
}

// Max width classes mapping
const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const Container = React.forwardRef<any, ContainerProps>(({
  safe = true,
  scroll = false,
  scrollProps = {},
  maxWidth = 'full',
  centered = true,
  children,
  style,
  className,
  // Animation props
  animated = false,
  animationType = 'fade',
  animationDuration = 500,
  animationDelay = 0,
  ...props
}, ref) => {
  const { shouldAnimate } = useAnimationStore();
  
  // Animation values
  const opacity = useSharedValue(animationType === 'fade' ? 0 : 1);
  const scale = useSharedValue(animationType === 'scale' ? 0.95 : 1);
  const translateY = useSharedValue(animationType === 'slide' ? 20 : 0);
  
  // Initialize animations
  useEffect(() => {
    if (animated && shouldAnimate()) {
      setTimeout(() => {
        if (animationType === 'fade') {
          opacity.value = withTiming(1, { duration: animationDuration });
        } else if (animationType === 'scale') {
          opacity.value = withTiming(1, { duration: animationDuration / 2 });
          scale.value = withSpring(1, {
            damping: 20,
            stiffness: 200,
          });
        } else if (animationType === 'slide') {
          opacity.value = withTiming(1, { duration: animationDuration });
          translateY.value = withSpring(0, {
            damping: 20,
            stiffness: 200,
          });
        }
      }, animationDelay);
    } else {
      opacity.value = 1;
      scale.value = 1;
      translateY.value = 0;
    }
  }, [animated, shouldAnimate, animationType, animationDuration, animationDelay]);
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));
  
  // Container classes
  const containerClasses = cn(
    'flex-1 w-full',
    maxWidthClasses[maxWidth],
    centered && 'self-center',
    className
  );
  
  const containerContent = (
    <Box
      className={containerClasses}
      style={[
        animated && shouldAnimate() && animationType !== 'none' ? animatedStyle : {},
        style,
      ]}
      {...props}
    >
      {children}
    </Box>
  );
  
  const scrollContent = scroll ? (
    <AnimatedScrollView
      ref={ref}
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
      nestedScrollEnabled={true}
      entering={animated && shouldAnimate() ? FadeIn.duration(animationDuration).delay(animationDelay) : undefined}
      {...scrollProps}
    >
      {containerContent}
    </AnimatedScrollView>
  ) : (
    containerContent
  );
  
  if (safe) {
    return (
      <AnimatedSafeAreaView
        ref={!scroll ? ref : undefined}
        className="flex-1 bg-background"
        style={style}
        entering={animated && shouldAnimate() && !scroll ? FadeIn.duration(animationDuration).delay(animationDelay) : undefined}
      >
        {scrollContent}
      </AnimatedSafeAreaView>
    );
  }
  
  return scrollContent;
});

Container.displayName = 'Container';