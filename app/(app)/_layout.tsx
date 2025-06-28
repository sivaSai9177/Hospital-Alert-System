import React, { useEffect } from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/theme/provider';
import { RefreshingBar } from '@/components/universal/feedback';
import { logger } from '@/lib/core/debug/unified-logger';
import { useUserAccess } from '@/hooks/usePermissions';
import { AnimatedStack } from '@/components/navigation/AnimatedStack';

export default function AppLayout() {
  const { isAuthenticated, hasHydrated, user } = useAuth();
  const theme = useTheme();
  const { isLoading: permissionsLoading } = useUserAccess();
  
  console.log('[APP LAYOUT] State:', {
    hasHydrated,
    permissionsLoading,
    isAuthenticated,
    userEmail: user?.email,
    userRole: user?.role
  });

  useEffect(() => {
    // Log navigation decisions after render
    if (!hasHydrated || permissionsLoading) return;
    
    if (!isAuthenticated) {
      logger.router.navigate('(app)/_layout', '/login', { 
        reason: 'not authenticated',
        hasUser: !!user 
      });
    }
  }, [hasHydrated, isAuthenticated, user, permissionsLoading]);

  // Remove the loading screen here since index.tsx already handles it
  // The index.tsx component already waits for hasHydrated
  // and shows DelayedLoadingScreen

  // Wait for auth to hydrate and permissions to load before making routing decisions
  if (!hasHydrated || permissionsLoading) {
    return null; // Let the parent show loading screen
  }

  // Check authentication
  if (!isAuthenticated) {
    return <Redirect href="/(public)/auth/login" />;
  }

  // Check if user needs profile completion
  if (user?.needsProfileCompletion || user?.role === 'user' || !user?.role || user?.role === 'guest') {
    return <Redirect href="/(public)/auth/complete-profile" />;
  }

  return (
    <>
      <RefreshingBar />
      <AnimatedStack transitionType="glass">
        <Stack.Screen 
          name="(tabs)" 
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="patients/[id]"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="shifts"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="support"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="analytics"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="logs"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="admin"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="organization"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="security"
          options={{
            headerShown: false,
          }}
        />
      </AnimatedStack>
    </>
  );
}