/**
 * RoleCard Component
 * Interactive card for role selection in onboarding
 */

import React from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/universal/typography/Text';
import { Symbol } from '@/components/universal/display/Symbols';
import { VStack } from '@/components/universal/layout/Stack';
import { haptic } from '@/lib/ui/haptics';
import { cn } from '@/lib/utils/cn';
import type { RoleOption } from '../types';

interface RoleCardProps {
  role: RoleOption;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth > 400 ? 180 : (screenWidth - 60) / 2;

export function RoleCard({ role, isSelected, onPress }: RoleCardProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const handlePress = () => {
    haptic('medium');
    
    // Animate press
    scale.value = withSpring(0.95, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 15 });
    });
    
    if (!isSelected) {
      rotation.value = withSpring(5, { damping: 15 }, () => {
        rotation.value = withSpring(0, { damping: 15 });
      });
    }

    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const borderWidth = interpolate(
      isSelected ? 1 : 0,
      [0, 1],
      [0, 2],
      Extrapolation.CLAMP
    );

    const shadowOpacity = interpolate(
      isSelected ? 1 : 0,
      [0, 1],
      [0.1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
      borderWidth: withTiming(borderWidth, { duration: 200 }),
      borderColor: role.color,
      shadowOpacity: withTiming(shadowOpacity, { duration: 200 }),
      shadowColor: role.color,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: isSelected ? 8 : 4,
    } as any;
  });

  const checkmarkStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isSelected ? 1 : 0, { duration: 200 }),
      transform: [
        {
          scale: withSpring(isSelected ? 1 : 0, {
            damping: 15,
            stiffness: 100,
          }),
        },
      ],
    };
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      style={{ width: cardWidth }}
    >
      <Animated.View
        style={[
          {
            width: '100%',
            aspectRatio: 0.85,
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
          animatedStyle,
        ]}
      >
        {/* Background Gradient */}
        <LinearGradient
          colors={
            isSelected
              ? [role.color + '20', role.color + '10']
              : ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
          }
          style={{ flex: 1, padding: 16 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Selected Indicator */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 12,
                right: 12,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: role.color,
                alignItems: 'center',
                justifyContent: 'center',
              },
              checkmarkStyle,
            ]}
          >
            <Symbol name="checkmark.circle.fill" size={16} color="white" />
          </Animated.View>

          {/* Content */}
          <VStack className="flex-1" gap={3}>
            {/* Icon */}
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center"
              style={{
                backgroundColor: isSelected
                  ? role.color + '30'
                  : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Symbol
                name={role.icon as any}
                size={32}
                color={isSelected ? role.color : 'white'}
              />
            </View>

            {/* Title */}
            <Text
              className={cn(
                "font-bold",
                isSelected ? "text-white" : "text-white/90"
              )}
              size="lg"
            >
              {role.title}
            </Text>

            {/* Description */}
            <Text
              className={cn(
                "text-xs leading-4",
                isSelected ? "text-white/80" : "text-white/60"
              )}
              numberOfLines={2}
            >
              {role.description}
            </Text>

            {/* Features */}
            <View className="flex-1 justify-end">
              <View
                className="px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <Text className="text-white/70 text-xs font-medium">
                  {role.features.length} permissions
                </Text>
              </View>
            </View>

            {/* License Badge */}
            {role.requiresLicense && (
              <View
                className="absolute bottom-3 right-3 px-2 py-1 rounded-md flex-row items-center"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Symbol name="doc.text.fill" size={10} color="white" />
                <Text className="text-white/60 text-xs ml-1">License</Text>
              </View>
            )}
          </VStack>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}