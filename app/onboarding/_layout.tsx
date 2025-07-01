/**
 * Onboarding Layout
 * Stack navigator for onboarding flow
 */

import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingLayout() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect to home if user has completed onboarding
  React.useEffect(() => {
    if (user && !user.needsProfileCompletion && user.emailVerified) {
      router.replace('/home');
    }
  }, [user, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen
        name="welcome"
        options={{
          title: 'Welcome',
        }}
      />
      <Stack.Screen
        name="role-selection"
        options={{
          title: 'Select Role',
        }}
      />
      <Stack.Screen
        name="registration"
        options={{
          title: 'Create Account',
        }}
      />
      <Stack.Screen
        name="email-verification"
        options={{
          title: 'Verify Email',
        }}
      />
      <Stack.Screen
        name="phone-verification"
        options={{
          title: 'Phone Verification',
        }}
      />
      <Stack.Screen
        name="profile-setup"
        options={{
          title: 'Professional Profile',
        }}
      />
      <Stack.Screen
        name="hospital-setup"
        options={{
          title: 'Select Hospital',
        }}
      />
      <Stack.Screen
        name="department-setup"
        options={{
          title: 'Select Department',
        }}
      />
      <Stack.Screen
        name="permissions"
        options={{
          title: 'Enable Features',
        }}
      />
      <Stack.Screen
        name="completion"
        options={{
          title: 'Welcome!',
          gestureEnabled: false, // Prevent going back from completion
        }}
      />
    </Stack>
  );
}