import React, { useEffect } from 'react';
import { View, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { Symbol } from '@/components/universal/display/Symbols';
import { Text, VStack, HStack, Badge } from '@/components/universal';
import { useShiftStatus } from '@/hooks/healthcare';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MobileShiftStatusProps {
  onPress?: () => void;
  compact?: boolean;
}

export function MobileShiftStatus({ onPress, compact = false }: MobileShiftStatusProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { data: shiftData, isLoading } = useShiftStatus();
  
  // Extract shift info from data
  const isOnDuty = shiftData?.status === 'on_duty';
  const currentShift = shiftData?.currentShift;
  const nextShift = shiftData?.nextShift;
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  
  // Mock data for demo
  const mockShift = currentShift || {
    startTime: '7:00 AM',
    endTime: '7:00 PM',
    department: 'Emergency',
    role: 'Senior Nurse',
  };
  
  const mockNextShift = nextShift || {
    date: 'Tomorrow',
    startTime: '7:00 AM',
    endTime: '3:00 PM',
  };
  
  // Pulse animation for active status
  useEffect(() => {
    if (isOnDuty) {
      pulseScale.value = withRepeat(
        withTiming(1.1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }
  }, [isOnDuty]);
  
  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
    rotation.value = withSpring(-1, { damping: 15, stiffness: 400 });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    rotation.value = withSpring(0, { damping: 15, stiffness: 400 });
  };
  
  const handlePress = () => {
    haptic('light');
    onPress?.();
  };
  
  const handleCheckInOut = () => {
    haptic('medium');
    // TODO: Implement check in/out functionality
    console.log(isOnDuty ? 'Checking out...' : 'Checking in...');
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));
  
  const statusPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  
  if (compact) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle]}
      >
        <View
          style={{
            backgroundColor: isOnDuty ? theme.success + '10' : theme.muted + '20',
            borderRadius: 16,
            paddingHorizontal: spacing[3] as number,
            paddingVertical: spacing[2] as number,
            borderWidth: 1,
            borderColor: isOnDuty ? theme.success + '30' : theme.border + '30',
          }}
        >
          <HStack alignItems="center" gap={2}>
            <Animated.View style={statusPulseStyle}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isOnDuty ? theme.success : theme.mutedForeground,
                }}
              />
            </Animated.View>
            <Text size="sm" weight="medium">
              {isOnDuty ? 'On Duty' : 'Off Duty'}
            </Text>
          </HStack>
        </View>
      </AnimatedPressable>
    );
  }
  
  return (
    <Animated.View entering={FadeIn.springify()}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          {
            backgroundColor: theme.card,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border + '30',
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
              },
              android: {
                elevation: 2,
              },
            }),
          },
          animatedStyle,
        ]}
      >
        {/* Background gradient */}
        <LinearGradient
          colors={
            isOnDuty
              ? [theme.success + '10', theme.success + '05']
              : [theme.muted + '10', theme.muted + '05']
          }
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
        
        <VStack p={4} gap={3}>
          {/* Header */}
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" gap={2}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: isOnDuty ? theme.success + '20' : theme.muted + '40',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Symbol 
                  name="clock.fill" 
                  size={20} 
                  color={isOnDuty ? theme.success : theme.mutedForeground} 
                />
              </View>
              <VStack gap={0}>
                <Text size="lg" weight="semibold">Shift Status</Text>
                <HStack alignItems="center" gap={1}>
                  <Animated.View style={statusPulseStyle}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isOnDuty ? theme.success : theme.mutedForeground,
                      }}
                    />
                  </Animated.View>
                  <Text size="xs" colorTheme="mutedForeground">
                    {isOnDuty ? 'Currently on duty' : 'Off duty'}
                  </Text>
                </HStack>
              </VStack>
            </HStack>
            
            {/* Check In/Out Button */}
            <Pressable onPress={handleCheckInOut}>
              <View
                style={{
                  backgroundColor: isOnDuty ? theme.destructive : theme.success,
                  paddingHorizontal: spacing[3] as number,
                  paddingVertical: spacing[2] as number,
                  borderRadius: 12,
                }}
              >
                <Text size="sm" weight="semibold" style={{ color: 'white' }}>
                  {isOnDuty ? 'Check Out' : 'Check In'}
                </Text>
              </View>
            </Pressable>
          </HStack>
          
          {/* Current Shift Info */}
          {isOnDuty && mockShift && (
            <VStack gap={2}>
              <HStack justifyContent="space-between">
                <HStack alignItems="center" gap={2}>
                  <Symbol name="clock" size={14} color={theme.mutedForeground} />
                  <Text size="sm" colorTheme="mutedForeground">Schedule</Text>
                </HStack>
                <Text size="sm" weight="medium">
                  {mockShift.startTime} - {mockShift.endTime}
                </Text>
              </HStack>
              
              <HStack justifyContent="space-between">
                <HStack alignItems="center" gap={2}>
                  <Symbol name="building.2.fill" size={14} color={theme.mutedForeground} />
                  <Text size="sm" colorTheme="mutedForeground">Department</Text>
                </HStack>
                <Text size="sm" weight="medium">{mockShift.department}</Text>
              </HStack>
              
              <HStack justifyContent="space-between">
                <HStack alignItems="center" gap={2}>
                  <Symbol name="person.fill" size={14} color={theme.mutedForeground} />
                  <Text size="sm" colorTheme="mutedForeground">Role</Text>
                </HStack>
                <Text size="sm" weight="medium">{mockShift.role}</Text>
              </HStack>
            </VStack>
          )}
          
          {/* Next Shift */}
          {!isOnDuty && mockNextShift && (
            <View
              style={{
                backgroundColor: theme.muted + '20',
                borderRadius: 12,
                padding: spacing[3] as number,
              }}
            >
              <HStack justifyContent="space-between" alignItems="center">
                <VStack gap={1}>
                  <Text size="xs" colorTheme="mutedForeground">Next Shift</Text>
                  <Text size="sm" weight="medium">
                    {mockNextShift.date} • {mockNextShift.startTime}
                  </Text>
                </VStack>
                <Symbol name="calendar" size={20} color={theme.primary} />
              </HStack>
            </View>
          )}
        </VStack>
      </AnimatedPressable>
    </Animated.View>
  );
}