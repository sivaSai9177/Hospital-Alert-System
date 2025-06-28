import React, { useEffect } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/universal/typography/Text';
import { VStack, HStack } from '@/components/universal/layout/Stack';
import { useTheme } from '@/lib/theme/provider';
import { haptic } from '@/lib/ui/haptics';
import { useResponsive } from '@/hooks/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PatientRegistrationSuccessProps {
  visible: boolean;
  patientName?: string;
  patientId?: string;
  onComplete?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

// Medical cross pulse animation component
const MedicalCrossPulse = ({ delay = 0 }: { delay?: number }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  
  React.useEffect(() => {
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.2, { damping: 10, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 250 })
      )
    );
    
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.8, { duration: 200 }),
        withTiming(0.4, { duration: 800 })
      )
    );
  }, [delay]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 120,
          height: 120,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
      ]}
    >
      {/* Horizontal bar */}
      <View
        style={{
          position: 'absolute',
          width: 80,
          height: 25,
          backgroundColor: '#10B981',
          borderRadius: 4,
        }}
      />
      {/* Vertical bar */}
      <View
        style={{
          position: 'absolute',
          width: 25,
          height: 80,
          backgroundColor: '#10B981',
          borderRadius: 4,
        }}
      />
    </Animated.View>
  );
};

// Heartbeat line animation
const HeartbeatLine = () => {
  const translateX = useSharedValue(-SCREEN_WIDTH);
  const opacity = useSharedValue(0);
  
  React.useEffect(() => {
    opacity.value = withDelay(300, withTiming(1, { duration: 300 }));
    translateX.value = withDelay(
      300,
      withTiming(SCREEN_WIDTH, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      })
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: SCREEN_WIDTH * 2,
          height: 2,
          backgroundColor: '#10B981',
          top: SCREEN_HEIGHT / 2 - 1,
        },
        animatedStyle,
      ]}
    />
  );
};

// Document animation with patient info
const PatientDocument = ({ patientName, patientId, delay = 0 }: { patientName?: string; patientId?: string; delay?: number }) => {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(-15);
  const opacity = useSharedValue(0);
  
  React.useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    scale.value = withDelay(
      delay,
      withSpring(1, {
        damping: 12,
        stiffness: 180,
        mass: 0.8,
      })
    );
    rotate.value = withDelay(
      delay,
      withSpring(0, {
        damping: 15,
        stiffness: 150,
      })
    );
  }, [delay]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View
      style={[
        {
          backgroundColor: 'white',
          borderRadius: 12,
          padding: 20,
          width: 200,
          minHeight: 100,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        },
        animatedStyle,
      ]}
    >
      <VStack gap={8}>
        {/* Document header */}
        <HStack gap={6} alignItems="center">
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#10B981',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16 }}>👤</Text>
          </View>
          <Text size="xs" weight="semibold" style={{ color: '#6B7280' }}>
            PATIENT RECORD
          </Text>
        </HStack>
        
        {/* Patient info */}
        <VStack gap={4}>
          <Text size="sm" weight="bold" style={{ color: '#111827' }}>
            {patientName || 'New Patient'}
          </Text>
          {patientId && (
            <Text size="xs" style={{ color: '#6B7280', fontFamily: 'monospace' }}>
              ID: {patientId.slice(0, 8).toUpperCase()}
            </Text>
          )}
        </VStack>
        
        {/* Success stamp */}
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            transform: [{ rotate: '-10deg' }],
          }}
        >
          <Text style={{ fontSize: 24 }}>✅</Text>
        </View>
      </VStack>
    </Animated.View>
  );
};

export function PatientRegistrationSuccess({
  visible,
  patientName,
  patientId,
  onComplete,
  autoHide = true,
  autoHideDelay = 3000,
}: PatientRegistrationSuccessProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  
  // Animation values
  const containerOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.8);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  
  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      haptic('success');
      
      // Container entrance
      containerOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      
      contentScale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
        mass: 1,
      });
      
      // Title fade in
      titleOpacity.value = withDelay(
        800,
        withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        })
      );
      
      // Subtitle fade in
      subtitleOpacity.value = withDelay(
        1000,
        withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        })
      );
      
      // Auto hide
      if (autoHide && onComplete) {
        setTimeout(() => {
          // Fade out animations
          containerOpacity.value = withTiming(0, {
            duration: 300,
            easing: Easing.in(Easing.cubic),
          }, () => {
            runOnJS(onComplete)();
          });
          
          contentScale.value = withTiming(0.8, {
            duration: 300,
            easing: Easing.in(Easing.cubic),
          });
        }, autoHideDelay);
      }
    }
  }, [visible, autoHide, autoHideDelay, onComplete]);
  
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));
  
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));
  
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      {
        translateY: interpolate(titleOpacity.value, [0, 1], [10, 0]),
      },
    ],
  }));
  
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [
      {
        translateY: interpolate(subtitleOpacity.value, [0, 1], [10, 0]),
      },
    ],
  }));
  
  if (!visible) return null;
  
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          alignItems: 'center',
          justifyContent: 'center',
        },
        containerStyle,
      ]}
    >
      {/* Backdrop */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={80}
          tint="dark"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      ) : (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
          }}
        />
      )}
      
      {/* Heartbeat line */}
      <HeartbeatLine />
      
      {/* Content */}
      <Animated.View style={[contentStyle, { alignItems: 'center' }]}>
        {/* Medical cross pulse effects */}
        <MedicalCrossPulse delay={100} />
        <MedicalCrossPulse delay={300} />
        
        {/* Patient document */}
        <PatientDocument
          patientName={patientName}
          patientId={patientId}
          delay={500}
        />
        
        {/* Text Content */}
        <View style={{ marginTop: isMobile ? 32 : 40 }}>
          <VStack gap={isMobile ? 6 : 10} alignItems="center">
            <Animated.View style={titleStyle}>
              <Text size={isMobile ? "2xl" : "3xl"} weight="bold" style={{ color: 'white' }}>
                Patient Registered! 🎉
              </Text>
            </Animated.View>
            
            <Animated.View style={subtitleStyle}>
              <VStack gap={2} alignItems="center">
                <Text size={isMobile ? "base" : "lg"} style={{ color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' }}>
                  {patientName ? `${patientName} has been successfully registered` : 'Registration completed successfully'}
                </Text>
                <Text size={isMobile ? "sm" : "base"} style={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
                  Redirecting to patient details...
                </Text>
              </VStack>
            </Animated.View>
          </VStack>
        </View>
      </Animated.View>
    </Animated.View>
  );
}