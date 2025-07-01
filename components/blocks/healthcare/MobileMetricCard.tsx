import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { Symbol } from '@/components/universal/display/Symbols';
import { Text, VStack, HStack, Badge } from '@/components/universal';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MobileMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  color?: string;
  gradient?: string[];
  onPress?: () => void;
  isLive?: boolean;
}

export function MobileMetricCard({
  title,
  value,
  subtitle,
  change,
  trend = 'neutral',
  icon,
  color,
  gradient,
  onPress,
  isLive = false,
}: MobileMetricCardProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  
  // Default colors
  const primaryColor = color || theme.primary;
  const gradientColors = gradient || [
    primaryColor + '20',
    primaryColor + '05',
  ];
  
  // Trend colors
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return theme.success;
      case 'down': return theme.destructive;
      default: return theme.mutedForeground;
    }
  };
  
  const handlePressIn = () => {
    scale.value = withSpring(0.96, {
      damping: 15,
      stiffness: 400,
    });
    rotation.value = withSpring(-2, {
      damping: 15,
      stiffness: 400,
    });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
    rotation.value = withSpring(0, {
      damping: 15,
      stiffness: 400,
    });
  };
  
  const handlePress = () => {
    haptic('light');
    onPress?.();
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));
  
  // Live pulse animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);
  
  React.useEffect(() => {
    if (isLive) {
      pulseScale.value = withTiming(1.5, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }, () => {
        pulseScale.value = withTiming(1, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        });
      });
      
      pulseOpacity.value = withTiming(0, {
        duration: 1500,
        easing: Easing.out(Easing.ease),
      }, () => {
        pulseOpacity.value = withTiming(0.3, {
          duration: 1500,
          easing: Easing.in(Easing.ease),
        });
      });
    }
  }, [isLive]);
  
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));
  
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          flex: 1,
          minHeight: 140,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border + '30',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
            },
            android: {
              elevation: 4,
            },
          }),
        },
        animatedStyle,
      ]}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      
      {/* Glass overlay for depth */}
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={30}
          tint={theme.scheme === 'dark' ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      )}
      
      <View style={{ padding: spacing[4] as number }}>
        <VStack gap={3} style={{ flex: 1 }}>
          {/* Header with icon and live indicator */}
          <HStack justifyContent="space-between" alignItems="flex-start">
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: primaryColor + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Symbol name={icon as any} size={24} color={primaryColor} />
            </View>
            
            {isLive && (
              <HStack alignItems="center" gap={1}>
                <View style={{ position: 'relative' }}>
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.success,
                      },
                      pulseStyle,
                    ]}
                  />
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.success,
                    }}
                  />
                </View>
                <Text size="xs" colorTheme="mutedForeground">Live</Text>
              </HStack>
            )}
          </HStack>
          
          {/* Title */}
          <Text size="sm" colorTheme="mutedForeground" weight="medium">
            {title}
          </Text>
          
          {/* Value and Change */}
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <HStack alignItems="baseline" gap={2}>
              <Text size="3xl" weight="bold" style={{ color: theme.foreground }}>
                {value}
              </Text>
              {change !== undefined && (
                <HStack alignItems="center" gap={1}>
                  <Symbol 
                    name={trend === 'up' ? 'arrow.up' : trend === 'down' ? 'arrow.down' : 'minus'} 
                    size={12} 
                    color={getTrendColor()} 
                  />
                  <Text size="sm" style={{ color: getTrendColor() }} weight="semibold">
                    {Math.abs(change)}%
                  </Text>
                </HStack>
              )}
            </HStack>
            
            {subtitle && (
              <Text size="xs" colorTheme="mutedForeground" style={{ marginTop: 4 }}>
                {subtitle}
              </Text>
            )}
          </View>
        </VStack>
      </View>
    </AnimatedPressable>
  );
}