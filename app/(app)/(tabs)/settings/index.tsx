import React, { useState, useEffect } from 'react';
import { ScrollView, Platform, Alert, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTheme } from '@/lib/theme/provider';
import { sessionTimeoutManager } from '@/lib/auth/session-timeout-manager';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Box,
  Heading1,
  Avatar,
  Switch,
} from '@/components/universal';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useShadow } from '@/hooks/useShadow';
import { haptic } from '@/lib/ui/haptics';
import { showErrorAlert, showSuccessAlert } from '@/lib/core/alert';
import { DarkModeToggle } from '@/components/blocks/theme/DarkModeToggle/DarkModeToggle';
import { ThemeSelector } from '@/components/blocks/theme/ThemeSelector/ThemeSelector';
import { SpacingDensitySelector } from '@/components/blocks/theme/DensitySelector/SpacingDensitySelector';
import { SignOutButton } from '@/components/blocks/auth/SignOutButton/SignOutButton';
import { Symbol } from '@/components/universal/display/Symbols';
import { api } from '@/lib/api/trpc';
import { logger } from '@/lib/core/debug/unified-logger';
import { UnifiedHeader } from '@/components/blocks/navigation/UnifiedHeader';
import { useDebugStore } from '@/lib/stores/debug-store';

export default function SettingsScreen() {
  const { user, setRefreshing, lastActivity } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const shadowMd = useShadow({ size: 'md' });
  const utils = api.useUtils();
  const [isManuallyRefreshing, setIsManuallyRefreshing] = React.useState(false);
  const { showDebugPanel, showNavigationDebugger, toggleDebugPanel, toggleNavigationDebugger } = useDebugStore();
  
  // Use TanStack Query to manage session state with real-time updates
  const { data: sessionData } = useQuery({
    queryKey: ['session-status'],
    queryFn: () => {
      const remainingMs = sessionTimeoutManager.getRemainingTime();
      const isAboutToTimeout = sessionTimeoutManager.isAboutToTimeout();
      const INACTIVITY_TIMEOUT_MS = parseInt(process.env.EXPO_PUBLIC_INACTIVITY_TIMEOUT || '300000', 10);
      
      return {
        remainingMs,
        remainingSeconds: Math.floor(remainingMs / 1000),
        isAboutToTimeout,
        totalTimeoutMs: INACTIVITY_TIMEOUT_MS,
        percentRemaining: (remainingMs / INACTIVITY_TIMEOUT_MS) * 100
      };
    },
    refetchInterval: 1000, // Update every second
    staleTime: 0, // Always fetch fresh data
  });
  
  const sessionTimeRemaining = sessionData?.remainingSeconds || 0;
  
  // Log critical session states
  React.useEffect(() => {
    if (sessionTimeRemaining === 60) {
      logger.auth.warn('Session expiring in 1 minute', { 
        timeRemaining: sessionTimeRemaining,
        lastActivity: lastActivity
      });
    } else if (sessionTimeRemaining === 30) {
      logger.auth.warn('Session expiring in 30 seconds', { 
        timeRemaining: sessionTimeRemaining,
        lastActivity: lastActivity
      });
    } else if (sessionTimeRemaining === 0 && sessionData?.remainingMs > 0) {
      logger.auth.info('Session timer reached zero - refresh should trigger', {
        lastActivity: lastActivity
      });
    }
  }, [sessionTimeRemaining, sessionData, lastActivity]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualRefresh = async () => {
    const startTime = Date.now();
    logger.auth.info('Manual session refresh initiated', {
      userId: user?.id,
      sessionTimeRemaining
    });
    
    try {
      setIsManuallyRefreshing(true);
      setRefreshing(true);
      
      // Extend session using session timeout manager
      sessionTimeoutManager.extendSession();
      
      // Also refresh auth session
      await utils.auth.getSession.fetch();
      
      const duration = Date.now() - startTime;
      logger.auth.sessionRefresh(user?.id || 'unknown', 'manual-refresh');
      logger.auth.info('Manual session refresh successful', {
        duration,
        newLastActivity: new Date()
      });
      
      showSuccessAlert('Session Refreshed', 'Your session has been refreshed successfully');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.auth.error('Manual session refresh failed', {
        error: error?.message || error,
        duration,
        userId: user?.id
      });
      showErrorAlert('Refresh Failed', 'Failed to refresh session. Please try again.');
    } finally {
      setIsManuallyRefreshing(false);
      setRefreshing(false);
      logger.auth.debug('Manual refresh completed', {
        isManuallyRefreshing: false,
        isRefreshing: false
      });
    }
  };

  const getSessionStatus = () => {
    if (!sessionData) return { color: theme.mutedForeground, text: 'Loading...' };
    if (sessionData.isAboutToTimeout) {
      if (sessionTimeRemaining <= 60) return { color: theme.destructive, text: 'Critical' };
      return { color: theme.destructive, text: 'Expiring Soon' };
    }
    return { color: theme.success, text: 'Active' };
  };

  const sessionStatus = getSessionStatus();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement account deletion
              showErrorAlert('Not Implemented', 'Account deletion is not yet available');
            } catch {
              showErrorAlert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };
  
  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement 
  }: { 
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{ 
        padding: spacing[4] as any,
        backgroundColor: theme.card,
        borderRadius: 8,
        marginBottom: spacing[2],
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <HStack alignItems="center" gap={3 as any}>
        <Box>{icon}</Box>
        <Box style={{ flex: 1 }}>
          <Text weight="semibold">{title}</Text>
          {subtitle && (
            <Text size="sm" colorTheme="mutedForeground">{subtitle}</Text>
          )}
        </Box>
        {rightElement || (onPress && <Symbol name="chevron.right" size={20} color={theme.mutedForeground} />)}
      </HStack>
    </TouchableOpacity>
  );
  
  const content = (
    <VStack gap={5 as any}>
      
      {/* Account Section */}
      <VStack gap={2 as any}>
        <Text size="sm" colorTheme="mutedForeground" weight="semibold" style={{ paddingLeft: 4 }}>
          ACCOUNT
        </Text>
        <SettingItem
          icon={<Symbol name="person" size={20} color={theme.primary} />}
          title="Profile"
          subtitle={user?.email}
          onPress={() => router.push('/profile')}
        />
      </VStack>
      
      {/* Session Management Section */}
      <VStack gap={2 as any}>
        <Text size="sm" colorTheme="mutedForeground" weight="semibold" style={{ paddingLeft: 4 }}>
          SESSION MANAGEMENT
        </Text>
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 8,
          padding: spacing[4] as any,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
          <VStack gap={4 as any}>
            {/* Session Status */}
            <HStack justifyContent="space-between" alignItems="center">
              <VStack gap={1 as any}>
                <Text weight="semibold">Session Status</Text>
                <HStack gap={2 as any} alignItems="center">
                  <Box
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: sessionStatus.color,
                    }}
                  />
                  <Text size="sm" style={{ color: sessionStatus.color }}>
                    {sessionStatus.text}
                  </Text>
                </HStack>
              </VStack>
              <VStack alignItems="flex-end" gap={1 as any}>
                <Text size="xs" colorTheme="mutedForeground">
                  Refresh in
                </Text>
                <Text size="base" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatTime(sessionTimeRemaining)}
                </Text>
              </VStack>
            </HStack>
            
            {/* Progress Bar */}
            <Box
              style={{
                height: 6,
                backgroundColor: theme.border,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <Box
                style={{
                  height: '100%',
                  width: `${sessionData?.percentRemaining || 0}%`,
                  backgroundColor: sessionStatus.color,
                  ...(Platform.OS === 'web' ? { transition: 'width 0.3s ease-out' } : {}),
                }}
              />
            </Box>
            
            {/* Manual Refresh Button */}
            <Button
              onPress={handleManualRefresh}
              variant="outline"
              fullWidth
              disabled={isManuallyRefreshing}
            >
              <HStack gap={2 as any} alignItems="center">
                <Symbol name="arrow.clockwise" size={16} color={theme.primary} />
                <Text>{isManuallyRefreshing ? 'Refreshing...' : 'Refresh Session Now'}</Text>
              </HStack>
            </Button>
            
            {/* Debug: Force Activity Update */}
            {__DEV__ && (
              <Button
                onPress={() => {
                  sessionTimeoutManager.updateActivity();
                  const { updateActivity } = useAuthStore.getState();
                  updateActivity();
                  logger.auth.debug('Manually updated activity timestamp', {
                    newLastActivity: new Date(),
                    remainingTime: sessionTimeoutManager.getRemainingTime()
                  });
                }}
                variant="ghost"
                size="sm"
                fullWidth
              >
                <HStack gap={1 as any} align="center">
                  <Symbol name="hand.tap" size={14} color={theme.mutedForeground} />
                  <Text size="xs" colorTheme="mutedForeground">Debug: Update Activity</Text>
                </HStack>
              </Button>
            )}
            
            {/* Session Info */}
            <VStack gap={2 as any}>
              <Text size="xs" colorTheme="mutedForeground" style={{ textAlign: 'center' }}>
                Your session automatically refreshes after {(sessionData?.totalTimeoutMs || 300000) / 60000} minutes of inactivity
              </Text>
              
              {/* Last Activity Time */}
              {lastActivity && (
                <HStack justifyContent="center" gap={1 as any}>
                  <Symbol name="clock" size={12} color={theme.mutedForeground} />
                  <Text size="xs" colorTheme="mutedForeground">
                    Last activity: {new Date(lastActivity).toLocaleTimeString()}
                  </Text>
                </HStack>
              )}
            </VStack>
          </VStack>
        </View>
      </VStack>
      
      {/* Organization Section */}
      {user?.organizationId && (
        <VStack gap={2 as any}>
          <Text size="sm" colorTheme="mutedForeground" weight="semibold" style={{ paddingLeft: 4 }}>
            ORGANIZATION
          </Text>
          <SettingItem
            icon={<Symbol name="building.2.fill" size={20} color={theme.primary} />}
            title="Team Members"
            subtitle="Manage organization members"
            onPress={() => router.push('/settings/members')}
          />
          <SettingItem
            icon={<Symbol name="person.2.fill" size={20} color={theme.primary} />}
            title="Organization Settings"
            subtitle="Manage organization details"
            onPress={() => router.push('/organization/settings')}
          />
        </VStack>
      )}
      
      {/* Appearance Section */}
      <VStack gap={2 as any}>
        <Text size="sm" colorTheme="mutedForeground" weight="semibold" style={{ paddingLeft: 4 }}>
          APPEARANCE
        </Text>
        <View style={{
          backgroundColor: theme.card,
          borderRadius: 8,
          padding: spacing[4] as any,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
          <VStack gap={4 as any}>
            <DarkModeToggle />
            <ThemeSelector />
            <SpacingDensitySelector />
          </VStack>
        </View>
      </VStack>
      
      {/* Developer Tools Section - Only show in dev mode */}
      {__DEV__ && (
        <VStack gap={2 as any}>
          <Text size="sm" colorTheme="mutedForeground" weight="semibold" style={{ paddingLeft: 4 }}>
            DEVELOPER TOOLS
          </Text>
          <View style={{
            backgroundColor: theme.card,
            borderRadius: 8,
            padding: spacing[4] as any,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
            <VStack gap={4 as any}>
              {/* Debug Console Toggle */}
              <HStack justifyContent="space-between" alignItems="center">
                <VStack gap={1 as any} style={{ flex: 1 }}>
                  <Text weight="semibold">Debug Console</Text>
                  <Text size="sm" colorTheme="mutedForeground">
                    Show floating debug console button
                  </Text>
                </VStack>
                <Switch
                  value={showDebugPanel}
                  onValueChange={() => {
                    haptic('light');
                    toggleDebugPanel();
                  }}
                />
              </HStack>
              
              {/* Navigation Debugger Toggle */}
              <HStack justifyContent="space-between" alignItems="center">
                <VStack gap={1 as any} style={{ flex: 1 }}>
                  <Text weight="semibold">Navigation Debugger</Text>
                  <Text size="sm" colorTheme="mutedForeground">
                    Show expo-router navigation debugger
                  </Text>
                </VStack>
                <Switch
                  value={showNavigationDebugger}
                  onValueChange={() => {
                    haptic('light');
                    toggleNavigationDebugger();
                  }}
                />
              </HStack>
            </VStack>
          </View>
        </VStack>
      )}
      
      {/* Notifications Section */}
      <VStack gap={2 as any}>
        <Text size="sm" colorTheme="mutedForeground" weight="semibold" style={{ paddingLeft: 4 }}>
          NOTIFICATIONS
        </Text>
        <SettingItem
          icon={<Symbol name="bell" size={20} color={theme.primary} />}
          title="Notification Settings"
          subtitle="Manage alert sounds and preferences"
          onPress={() => router.push('/settings/notifications')}
        />
      </VStack>
      
      {/* Security Section */}
      <VStack gap={2 as any}>
        <Text size="sm" colorTheme="mutedForeground" weight="semibold" style={{ paddingLeft: 4 }}>
          SECURITY
        </Text>
        <SettingItem
          icon={<Symbol name="shield" size={20} color={theme.primary} />}
          title="Two-Factor Authentication"
          subtitle="Add an extra layer of security"
          onPress={() => router.push('/security/2fa')}
        />
        <SettingItem
          icon={<Symbol name="shield" size={20} color={theme.primary} />}
          title="Change Password"
          subtitle="Update your password"
          onPress={() => router.push('/security/change-password')}
        />
      </VStack>
      
      {/* Support Section */}
      <VStack gap={2 as any}>
        <Text size="sm" colorTheme="mutedForeground" weight="semibold" style={{ paddingLeft: 4 }}>
          SUPPORT
        </Text>
        <SettingItem
          icon={<Symbol name="questionmark.circle" size={20} color={theme.primary} />}
          title="Help & Support"
          subtitle="Get help with the app"
          onPress={() => router.push('/support')}
        />
      </VStack>
      
      {/* Actions */}
      <VStack gap={3 as any} style={{ marginTop: spacing[4] as any }}>
        <SignOutButton />
        <Button
          onPress={handleDeleteAccount}
          variant="destructive"
          fullWidth
        >
          Delete Account
        </Button>
      </VStack>
    </VStack>
  );
  
  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <UnifiedHeader 
            title="Settings"
            subtitle="Manage your preferences"
            rightElement={
              <Avatar
                source={user?.image ? { uri: user.image } : undefined}
                name={user?.name || 'User'}
                size="xl"
              />
            }
          />
          <ScrollView
            contentContainerStyle={{ padding: spacing[4] as any, paddingBottom: spacing[6] as any }}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
      </View>
    );
  }
  
  return (
    <Container>
      <UnifiedHeader 
        title="Settings"
        subtitle="Manage your preferences"
        rightElement={
          <Avatar
            source={user?.image ? { uri: user.image } : undefined}
            name={user?.name || 'User'}
            size="xl"
          />
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <VStack p={4} gap={4 as any}>
          {content}
        </VStack>
      </ScrollView>
    </Container>
  );
}