import React, { useCallback } from 'react';
import { View, ViewProps, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';
import { cn } from '@/lib/core/utils';
import { Text } from '@/components/universal/typography/Text';
import { haptic } from '@/lib/ui/haptics';
import { useAnimation } from '@/lib/ui/animations/hooks';
import { useAnimationStore } from '@/lib/stores/animation-store';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useShadow, useInteractiveShadow } from '@/hooks/useShadow';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CardProps extends ViewProps {
  // Interaction props
  pressable?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  
  // Style props
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'elevated' | 'glass' | 'glass-subtle' | 'glass-strong';
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  // Shadow props
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shadowColor?: 'default' | 'primary' | 'secondary' | 'destructive' | 'success' | 'warning';
  
  // Glass props
  glassIntensity?: 'subtle' | 'medium' | 'strong';
  glowEffect?: boolean;
  
  // Animation props
  animated?: boolean;
  animationType?: 'lift' | 'scale' | 'tilt' | 'glow' | 'glass-shimmer' | 'none';
  useHaptics?: boolean;
  
  // Content props
  children: React.ReactNode;
}

// Card variants using Tailwind
const cardVariants = {
  default: 'bg-card text-card-foreground',
  outline: 'border border-border bg-transparent',
  ghost: 'bg-transparent',
  elevated: 'bg-card text-card-foreground',
  glass: 'glass glass-hover glass-press',
  'glass-subtle': 'glass-subtle glass-hover glass-press',
  'glass-strong': 'glass-strong glass-hover glass-press',
};

// Size configurations with density support
const sizeClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const densitySizeClasses = {
  compact: {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  },
  medium: {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  },
  large: {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },
};

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

const getGlassClasses = (intensity: string, shadowColor?: string) => {
  const baseClass = intensity === 'subtle' ? 'glass-subtle' : 
                    intensity === 'strong' ? 'glass-strong' : 'glass';
  
  const colorClass = shadowColor === 'destructive' ? 'glass-urgent' :
                     shadowColor === 'warning' ? 'glass-warning' :
                     shadowColor === 'success' ? 'glass-success' :
                     shadowColor === 'primary' ? 'glass-info' : '';
  
  return cn(baseClass, colorClass);
};

export const Card = React.forwardRef<View, CardProps>(({
  pressable = false,
  onPress,
  onLongPress,
  className,
  variant = 'default',
  size = 'md',
  rounded = 'lg',
  shadow = 'md',
  shadowColor = 'default',
  glassIntensity = 'medium',
  glowEffect = false,
  animated = true,
  animationType = 'lift',
  useHaptics = true,
  children,
  style,
  pointerEvents,
  ...props
}, ref) => {
  const { shouldAnimate, enableAnimations } = useAnimationStore();
  const { density } = useSpacing();
  
  // Get shadow styles - glass variants have their own shadow handling
  const isGlassVariant = variant.includes('glass');
  const staticShadow = useShadow({ 
    size: variant === 'elevated' ? 'xl' : isGlassVariant ? 'none' : shadow, 
    color: shadowColor 
  });
  
  const {
    shadowStyle: interactiveShadow,
    handlers: shadowHandlers,
    isHovered,
    isPressed: isShadowPressed,
  } = useInteractiveShadow(
    variant === 'elevated' ? 'xl' : isGlassVariant ? 'none' : shadow,
    variant === 'elevated' ? '2xl' : isGlassVariant ? 'none' : 'lg',
    { color: shadowColor }
  );
  
  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotateX = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const shimmerProgress = useSharedValue(0);
  const isPressed = useSharedValue(0);
  
  // Use entrance animation
  const { animatedStyle: entranceStyle } = useAnimation('fadeIn', {
    duration: 'fast',
  });

  // Handle hover (web)
  const handleHoverIn = useCallback(() => {
    if (!animated || !enableAnimations || Platform.OS !== 'web') return;
    
    switch (animationType) {
      case 'lift':
        translateY.value = withSpring(-4, { damping: 15, stiffness: 300 });
        break;
      case 'scale':
        scale.value = withSpring(1.02, { damping: 15, stiffness: 300 });
        break;
      case 'tilt':
        rotateX.value = withSpring(-5, { damping: 15, stiffness: 300 });
        break;
      case 'glow':
        glowOpacity.value = withTiming(0.2, { duration: 200 });
        break;
      case 'glass-shimmer':
        shimmerProgress.value = withRepeat(
          withTiming(1, { duration: 2000 }),
          -1,
          false
        );
        break;
    }
  }, [animated, enableAnimations, animationType, translateY, scale, rotateX, glowOpacity, shimmerProgress]);

  const handleHoverOut = useCallback(() => {
    if (!animated || !enableAnimations || Platform.OS !== 'web') return;
    
    // Reset all animations
    translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    rotateX.value = withSpring(0, { damping: 15, stiffness: 300 });
    glowOpacity.value = withTiming(0, { duration: 300 });
  }, [animated, enableAnimations, translateY, scale, rotateX, glowOpacity]);

  // Handle press
  const handlePressIn = useCallback(() => {
    if (!animated || !enableAnimations) return;
    
    isPressed.value = withTiming(1, { duration: 100 });
    
    switch (animationType) {
      case 'lift':
        translateY.value = withSpring(2, { damping: 15, stiffness: 300 });
        break;
      case 'scale':
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
        break;
      case 'tilt':
        rotateX.value = withSpring(5, { damping: 15, stiffness: 300 });
        break;
      case 'glow':
        glowOpacity.value = withTiming(0.3, { duration: 150 });
        break;
    }
    
    if (useHaptics && pressable) {
      haptic('light');
    }
  }, [animated, enableAnimations, animationType, isPressed, translateY, scale, rotateX, glowOpacity, useHaptics, pressable]);

  const handlePressOut = useCallback(() => {
    if (!animated || !enableAnimations) return;
    
    isPressed.value = withTiming(0, { duration: 100 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    rotateX.value = withSpring(0, { damping: 15, stiffness: 300 });
    glowOpacity.value = withTiming(0, { duration: 300 });
  }, [animated, enableAnimations, isPressed, translateY, scale, rotateX, glowOpacity]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      if (useHaptics) {
        haptic('medium');
      }
      onLongPress();
    }
  }, [onLongPress, useHaptics]);

  // Animated card style
  const animatedCardStyle = useAnimatedStyle(() => {
    'worklet';
    const perspective = 1000;
    
    return {
      transform: [
        { translateY: translateY.value } as any,
        { scale: scale.value } as any,
        { perspective } as any,
        { rotateX: `${rotateX.value}deg` } as any,
      ],
    };
  });

  // Glow overlay style
  const glowStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: shadowColor === 'primary' ? 'rgba(59, 130, 246, 0.1)' :
                       shadowColor === 'secondary' ? 'rgba(139, 92, 246, 0.1)' :
                       shadowColor === 'destructive' ? 'rgba(239, 68, 68, 0.1)' :
                       shadowColor === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                       shadowColor === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                       'rgba(255, 255, 255, 0.1)',
      opacity: glowOpacity.value,
    };
  });

  // Get size classes based on density
  const sizeClass = densitySizeClasses[density]?.[size] || sizeClasses[size];
  
  // Build card classes
  const cardClasses = cn(
    cardVariants[variant],
    roundedClasses[rounded],
    sizeClass,
    'relative overflow-hidden',
    pressable && 'cursor-pointer',
    // Glass-specific classes
    isGlassVariant && getGlassClasses(glassIntensity, shadowColor),
    isGlassVariant && glowEffect && shadowColor === 'destructive' && 'glass-glow-urgent',
    isGlassVariant && glowEffect && shadowColor === 'warning' && 'glass-glow-warning',
    isGlassVariant && glowEffect && shadowColor === 'success' && 'glass-glow-success',
    isGlassVariant && glowEffect && !shadowColor && 'glass-glow',
    animationType === 'glass-shimmer' && 'glass-shimmer',
    // Focus styles for accessibility
    pressable && 'web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
    className
  );
  
  // Choose shadow style based on interactivity
  const shadowStyle = pressable && animated && shouldAnimate() ? interactiveShadow : staticShadow;
  
  // Android-specific elevation for visibility
  const androidElevation = Platform.OS === 'android' && !isGlassVariant ? {
    elevation: variant === 'elevated' ? 8 : shadow === 'none' ? 0 : 2,
    shadowColor: '#000',
  } : {};
  
  // Combine all handlers
  const combinedHandlers = pressable ? {
    onPress: onPress || handlePress,
    onLongPress: onLongPress || handleLongPress,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    ...(Platform.OS === 'web' && {
      onHoverIn: () => {
        handleHoverIn();
        shadowHandlers.onMouseEnter?.();
      },
      onHoverOut: () => {
        handleHoverOut();
        shadowHandlers.onMouseLeave?.();
      },
    }),
  } : {};

  const Component = pressable ? AnimatedPressable : AnimatedView;
  
  return (
    <Component
      ref={ref}
      className={Platform.OS === 'web' ? cardClasses : undefined}
      style={[
        shadowStyle,
        androidElevation,
        animated && animatedCardStyle,
        animated && shouldAnimate() && entranceStyle,
        { backgroundColor: variant === 'ghost' || variant === 'outline' ? 'transparent' : '#ffffff' },
        style,
        pointerEvents ? { pointerEvents } : undefined,
      ].filter(Boolean) as any}
      {...combinedHandlers}
      {...props}
    >
      {/* Glow effect overlay */}
      {animationType === 'glow' && animated && (
        <AnimatedView style={[glowStyle, { pointerEvents: 'none' }] as any} />
      )}
      
      {/* Glass shimmer overlay for native */}
      {animationType === 'glass-shimmer' && animated && Platform.OS !== 'web' && (
        <AnimatedView 
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: interpolate(
                shimmerProgress.value,
                [0, 0.5, 1],
                [0, 0.1, 0]
              ),
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none' as any,
            }
          ]} 
        />
      )}
      
      {/* Card content */}
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

// Card sub-components for composition
export const CardHeader = React.forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('flex-col space-y-1.5 pb-4', className) as string}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<View, { children: React.ReactNode; className?: string }>(
  ({ className, children, ...props }, ref) => (
    <Text
      ref={ref as any}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className) as string}
      {...props}
    >
      {children}
    </Text>
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<View, { children: React.ReactNode; className?: string }>(
  ({ className, children, ...props }, ref) => (
    <Text
      ref={ref as any}
      className={cn('text-sm text-muted-foreground', className) as string}
      {...props}
    >
      {children}
    </Text>
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn('pt-0', className) as string} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('flex-row items-center pt-4', className) as string}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// Specialized card components
export const ElevatedCard = React.forwardRef<View, Omit<CardProps, 'variant' | 'shadow'>>((props, ref) => (
  <Card ref={ref} variant="elevated" shadow="xl" {...props} />
));
ElevatedCard.displayName = 'ElevatedCard';

export const InteractiveCard = React.forwardRef<View, Omit<CardProps, 'pressable' | 'animated'>>((props, ref) => (
  <Card ref={ref} pressable animated {...props} />
));
InteractiveCard.displayName = 'InteractiveCard';

export const GhostCard = React.forwardRef<View, Omit<CardProps, 'variant' | 'shadow'>>((props, ref) => (
  <Card ref={ref} variant="ghost" shadow="none" {...props} />
));
GhostCard.displayName = 'GhostCard';