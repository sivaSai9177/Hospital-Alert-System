/**
 * Permissions Screen
 * Enable notifications, biometrics, and location services
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
// import * as LocalAuthentication from 'expo-local-authentication'; // Uncomment if installed
// import * as Location from 'expo-location'; // Uncomment if installed
import { Text } from '@/components/universal/typography/Text';
import { Button } from '@/components/universal/interaction/Button';
import { VStack, HStack } from '@/components/universal/layout/Stack';
import { Symbol } from '@/components/universal/display/Symbols';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { haptic } from '@/lib/ui/haptics';
import { log } from '@/lib/core/debug/logger';
import { cn } from '@/lib/utils/cn';

// TODO: Replace with actual toast implementation
const showToast = (options: { type: string; title: string; message: string }) => {
  console.log(`[${options.type}] ${options.title}: ${options.message}`);
};

const logger = log;

interface Permission {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  required: boolean;
}

export function PermissionsScreen() {
  const {
    state,
    updateUserData,
    completeStep,
    skipStep,
    goToNextStep,
    goToPreviousStep,
    canSkip,
  } = useOnboardingFlow();

  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'notifications',
      title: 'Push Notifications',
      description: 'Receive critical alerts and updates instantly',
      icon: 'bell.badge.fill',
      color: '#ef4444',
      enabled: false,
      required: true,
    },
    {
      id: 'biometric',
      title: 'Biometric Authentication',
      description: 'Quick and secure login with Face ID or Touch ID',
      icon: Platform.OS === 'ios' ? 'faceid' : 'fingerprint',
      color: '#10b981',
      enabled: false,
      required: false,
    },
    {
      id: 'location',
      title: 'Location Services',
      description: 'Faster emergency response based on your location',
      icon: 'location.fill',
      color: '#3b82f6',
      enabled: false,
      required: false,
    },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);

  const handlePermissionToggle = async (permissionId: string) => {
    haptic('light');
    setIsProcessing(true);

    try {
      let granted = false;

      switch (permissionId) {
        case 'notifications':
          const { status } = await Notifications.requestPermissionsAsync();
          granted = status === 'granted';
          
          if (granted) {
            // Configure notification settings
            await Notifications.setNotificationChannelAsync('alerts', {
              name: 'Emergency Alerts',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#FF0000',
            });
          }
          break;

        case 'biometric':
          // Biometric authentication disabled (expo-local-authentication not installed)
          const hasHardware = false; // await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = false; // await LocalAuthentication.isEnrolledAsync();
          
          if (!hasHardware) {
            showToast({
              type: 'error',
              title: 'Not Available',
              message: 'Biometric authentication is not available on this device',
            });
            return;
          }
          
          if (!isEnrolled) {
            showToast({
              type: 'error',
              title: 'Not Enrolled',
              message: 'Please set up biometric authentication in your device settings',
            });
            return;
          }

          const result = { success: false } as any; /* await LocalAuthentication.authenticateAsync({
            promptMessage: 'Enable biometric authentication',
          }); */
          granted = result.success;
          break;

        case 'location':
          // Location permissions disabled (expo-location not installed)
          const { status: locationStatus } = { status: 'denied' }; // await Location.requestForegroundPermissionsAsync();
          granted = locationStatus === 'granted';
          break;
      }

      if (granted) {
        haptic('success');
        setPermissions(prev =>
          prev.map(p => p.id === permissionId ? { ...p, enabled: true } : p)
        );
      } else {
        haptic('error');
        showToast({
          type: 'error',
          title: 'Permission Denied',
          message: 'You can enable this later in settings',
        });
      }
    } catch (error) {
      logger.error('Permission request failed', 'ONBOARDING', { error, permissionId });
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Unable to request permission',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    const requiredPermissions = permissions.filter(p => p.required);
    const allRequiredEnabled = requiredPermissions.every(p => p.enabled);

    if (!allRequiredEnabled) {
      showToast({
        type: 'error',
        title: 'Required Permissions',
        message: 'Please enable push notifications to continue',
      });
      return;
    }

    haptic('success');
    
    updateUserData({
      notificationsEnabled: permissions.find(p => p.id === 'notifications')?.enabled || false,
      biometricEnabled: permissions.find(p => p.id === 'biometric')?.enabled || false,
      locationEnabled: permissions.find(p => p.id === 'location')?.enabled || false,
    });

    completeStep('permissions');
    goToNextStep();
  };

  const handleSkip = () => {
    haptic('light');
    skipStep('permissions');
  };

  const PermissionCard = ({ permission, index }: { permission: Permission; index: number }) => {
    const cardStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            scale: withSpring(permission.enabled ? 0.98 : 1, {
              damping: 15,
              stiffness: 100,
            }),
          },
        ],
      };
    });

    return (
      <Animated.View
        key={permission.id}
        entering={FadeInUp.duration(400).delay(300 + index * 100)}
        style={cardStyle}
      >
        <TouchableOpacity
          onPress={() => !permission.enabled && handlePermissionToggle(permission.id)}
          disabled={permission.enabled || isProcessing}
          className={cn(
            "p-4 rounded-xl",
            permission.enabled
              ? "bg-white/20 border-2 border-green-500/40"
              : "bg-white/10 border-2 border-transparent"
          )}
        >
          <HStack className="items-start">
            {/* Icon */}
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{
                backgroundColor: permission.enabled
                  ? permission.color + '30'
                  : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Symbol
                name={permission.icon as any}
                size={24}
                color={permission.enabled ? permission.color : 'white'}
              />
            </View>

            {/* Content */}
            <View className="flex-1">
              <HStack className="items-center mb-1">
                <Text className="text-white font-semibold flex-1">
                  {permission.title}
                </Text>
                {permission.required && (
                  <View className="px-2 py-0.5 rounded-full bg-red-500/20">
                    <Text className="text-red-400 text-xs">Required</Text>
                  </View>
                )}
              </HStack>
              
              <Text className="text-white/60 text-sm mb-3">
                {permission.description}
              </Text>

              {/* Status */}
              {permission.enabled ? (
                <HStack className="items-center">
                  <Symbol name="checkmark.circle.fill" size={16} color="#10b981" />
                  <Text className="text-green-400 text-sm ml-1">Enabled</Text>
                </HStack>
              ) : (
                <TouchableOpacity
                  onPress={() => handlePermissionToggle(permission.id)}
                  disabled={isProcessing}
                  className="self-start"
                >
                  <HStack className="items-center px-3 py-1.5 rounded-full bg-white/10">
                    <Text className="text-white text-sm font-medium">
                      {isProcessing ? 'Processing...' : 'Enable'}
                    </Text>
                    <Symbol name="chevron.right" size={12} color="white" className="ml-1" />
                  </HStack>
                </TouchableOpacity>
              )}
            </View>
          </HStack>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const allEnabled = permissions.every(p => p.enabled);
  const requiredEnabled = permissions.filter(p => p.required).every(p => p.enabled);

  return (
    <OnboardingLayout
      title="Enable Features"
      subtitle="Get the most out of the app with these permissions"
      onBack={goToPreviousStep}
      onSkip={canSkip ? handleSkip : undefined}
      showSkip={canSkip && requiredEnabled}
      progress={state.progress}
      backgroundGradient={['#1e3a8a', '#3b82f6', '#60a5fa']}
    >
      <VStack className="flex-1" gap={6}>
        {/* Progress Indicator */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <ProgressIndicator
            currentStep={state.currentStep}
            completedSteps={state.completedSteps}
            variant="steps"
          />
        </Animated.View>

        {/* Permissions List */}
        <VStack gap={3}>
          {permissions.map((permission, index) => <PermissionCard key={permission.id} permission={permission} index={index} />)}
        </VStack>

        {/* All Enabled Celebration */}
        {allEnabled && (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="p-4 rounded-xl items-center"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
          >
            <Symbol name="checkmark.shield.fill" size={32} color="#10b981" />
            <Text className="text-green-400 font-semibold mt-2">
              All permissions enabled!
            </Text>
            <Text className="text-green-400/80 text-sm text-center mt-1">
              You&apos;re all set for the best experience
            </Text>
          </Animated.View>
        )}

        {/* Privacy Note */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(600)}
          className="p-3 rounded-lg flex-row items-start"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <Symbol name="lock.shield.fill" size={16} color="#60a5fa" style={{ marginTop: 2 }} />
          <Text className="text-white/60 text-xs ml-2 flex-1">
            Your privacy is important to us. All data is encrypted and used only to improve your healthcare experience.
          </Text>
        </Animated.View>

        {/* Continue Button */}
        <Animated.View entering={FadeInDown.duration(400).delay(700)}>
          <Button
            variant="default"
            size="lg"
            onPress={handleContinue}
            disabled={!requiredEnabled || isProcessing}
            className={cn(
              "w-full",
              requiredEnabled && !isProcessing ? "bg-white" : "bg-white/20"
            )}
            textClassName={cn(
              "font-semibold",
              requiredEnabled && !isProcessing ? "text-blue-600" : "text-white/60"
            )}
            shadow={requiredEnabled && !isProcessing ? "lg" : "none"}
          >
            {allEnabled ? "Complete Setup" : "Continue"}
          </Button>
        </Animated.View>
      </VStack>
    </OnboardingLayout>
  );
}