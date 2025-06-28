import React from 'react';
import { Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/theme/provider';
import { haptic } from '@/lib/ui/haptics';
import { Symbol } from '@/components/universal/display/Symbols';
import { useShadow } from '@/hooks/useShadow';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'destructive';
  style?: ViewStyle;
  disabled?: boolean;
}

export function FloatingActionButton({
  icon,
  onPress,
  size = 'md',
  variant = 'primary',
  style,
  disabled = false,
}: FloatingActionButtonProps) {
  const theme = useTheme();
  const shadowXl = useShadow({ size: 'xl' });
  
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const elevation = useSharedValue(1);
  
  // Size configuration
  const sizes = {
    sm: { button: 48, icon: 20 },
    md: { button: 56, icon: 24 },
    lg: { button: 64, icon: 28 },
  };
  
  const sizeConfig = sizes[size];
  
  // Color configuration
  const colors = {
    primary: {
      background: theme.primary,
      icon: theme.primaryForeground,
    },
    secondary: {
      background: theme.secondary,
      icon: theme.secondaryForeground,
    },
    destructive: {
      background: theme.destructive,
      icon: theme.destructiveForeground,
    },
  };
  
  const colorConfig = colors[variant];
  
  // Animated styles
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    shadowOpacity: interpolate(elevation.value, [0, 1], [0.15, 0.25]),
    shadowRadius: interpolate(elevation.value, [0, 1], [8, 16]),
  }));
  
  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    elevation.value = withTiming(0, { duration: 100 });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    elevation.value = withTiming(1, { duration: 100 });
    rotation.value = withSpring(rotation.value + 360, {
      damping: 15,
      stiffness: 150,
    });
  };
  
  const handlePress = () => {
    if (!disabled) {
      haptic('impact');
      onPress();
    }
  };
  
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        {
          width: sizeConfig.button,
          height: sizeConfig.button,
          borderRadius: sizeConfig.button / 2,
          backgroundColor: colorConfig.background,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
          ...shadowXl,
        },
        animatedButtonStyle,
        style,
      ]}
    >
      <Symbol
        name={icon}
        size={sizeConfig.icon}
        color={colorConfig.icon}
      />
    </AnimatedPressable>
  );
}