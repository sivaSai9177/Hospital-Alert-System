import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Text } from '@/components/universal';
import { useShadow } from '@/hooks/useShadow';
import { haptic } from '@/lib/ui/haptics';
import { useHealthcareAccess } from '@/hooks/usePermissions';

import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export function FloatingAlertButton() {
  const { user } = useAuth();
  const router = useRouter();
  const shadowLg = useShadow({ size: 'lg' });
  const { canCreateAlerts } = useHealthcareAccess();
  
  // Animation values - always call hooks
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  
  // Check if user has hospital assignment
  const hasHospital = !!(user?.defaultHospitalId || user?.organizationId);
  
  // Use useEffect to log debug info after render
  React.useEffect(() => {
    if (__DEV__) {

    }
  }, [user?.role, user?.organizationId, user?.defaultHospitalId, canCreateAlerts, hasHospital]);
  
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` }
      ] as any,
    };
  });
  
  // Don't show if user doesn't have proper role or hospital assignment
  if (!canCreateAlerts || !hasHospital) {
    return null;
  }
  
  const handlePress = () => {
    haptic('medium');
    
    // Animate button press
    if (Platform.OS !== 'web') {
      scale.value = withSequence(
        withSpring(0.9, { damping: 15, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 400 })
      );
      
      rotation.value = withSequence(
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
    
    // Navigate to create alert modal
    router.push('/(modals)/create-alert');
  };
  
  // For web, use regular TouchableOpacity
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          shadowLg,
          {
            position: 'absolute',
            bottom: 80,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#ef4444', // red-500 for emergency
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
          }
        ]}
      >
        <Text size="2xl" style={{ color: 'white' }}>
          🚨
        </Text>
      </TouchableOpacity>
    );
  }
  
  // For native, use animated version
  return (
    <AnimatedTouchableOpacity
      entering={FadeIn.delay(800).springify()}
      exiting={FadeOut.springify()}
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        shadowLg,
        animatedStyle as any,
        {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 90 : 80,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#ef4444', // red-500 for emergency
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
        }
      ]}
    >
      <Text size="2xl" style={{ color: 'white' }}>
        🚨
      </Text>
    </AnimatedTouchableOpacity>
  );
}