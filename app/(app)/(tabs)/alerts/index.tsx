import React, { useState, useEffect, useCallback } from 'react';
import { useAlertFilters } from '@/contexts/AlertFilterContext';
import { 
  View, 
  ScrollView, 
} from 'react-native';
import { Skeleton, SkeletonCard } from '@/components/universal/feedback/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, Redirect, useLocalSearchParams } from 'expo-router';
import {
  VStack,
  HStack,
  Text,
  Button,
  Symbol,
  ConnectionStatus,
} from '@/components/universal';
import { useTheme } from '@/lib/theme/provider';
import { log } from '@/lib/core/debug/unified-logger';
import { useAlertWebSocket, useHospitalContext } from '@/hooks/healthcare';
import { useEventQueueCleanup } from '@/hooks/useEventQueueCleanup';
import { useActiveAlerts, useAcknowledgeAlert, useResolveAlert } from '@/hooks/healthcare/useHealthcareApi';
import { haptic } from '@/lib/ui/haptics';
import { useSpacing } from '@/lib/stores/spacing-store';
import { 
  AlertListWithBatchActions,
  AlertTimelineWidget,
  AlertFilters,
  AlertFilterPresets,
  AlertAcknowledgeDialog,
} from '@/components/blocks/healthcare';
import { ApiErrorBoundary } from '@/components/blocks/errors/ApiErrorBoundary';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHealthcareAccess } from '@/hooks/usePermissions';
// import { useSSRPrefetchHealthcare } from '@/lib/api/use-ssr-prefetch';
import { api } from '@/lib/api/trpc';
import Animated, { 
  FadeInDown,
  FadeIn, 
  useAnimatedStyle, 
  useSharedValue,
  interpolate,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useLayoutTransition } from '@/hooks/useLayoutTransition';
import { UnifiedHeader } from '@/components/blocks/navigation/UnifiedHeader';


function AlertsScreenContent() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const searchParams = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedAlertId, setHighlightedAlertId] = useState<string | null>(null);
  const [acknowledgeDialogAlert, setAcknowledgeDialogAlert] = useState<any | null>(null);
  const scrollY = useSharedValue(0);
  
  // Debug logging
  log.info('AlertsScreenContent rendering', 'ALERTS', {
    user: user ? { id: user.id, role: user.role } : null,
    theme: { background: theme.background },
  });
  
  // Use event queue cleanup hook to prevent memory leaks
  useEventQueueCleanup();
  
  // Use filter context
  const {
    filters,
    setSearchQuery,
    setUrgencyFilter,
    setStatusFilter,
  } = useAlertFilters();
  
  const { searchQuery, urgencyFilter, statusFilter } = filters;
  
  // Page transition animation
  const { animatedStyle } = useLayoutTransition({ 
    type: 'glass', 
    duration: 300,
    hapticFeedback: true 
  });
  
  // Permission checks
  const { canViewAlerts, canCreateAlerts, canAcknowledgeAlerts, canResolveAlerts } = useHealthcareAccess();
  
  // Hospital context validation
  const hospitalContext = useHospitalContext();
  
  // Get hospitalId from user's default hospital or organization
  const hospitalId = hospitalContext.hospitalId || user?.defaultHospitalId || user?.organizationId || '';
  
  // Debug hospital context
  log.info('Hospital context in alerts', 'ALERTS', {
    hospitalContext,
    hospitalId,
    canViewAlerts,
    userDefaultHospitalId: user?.defaultHospitalId,
    userOrganizationId: user?.organizationId,
  });
  
  // SSR prefetch for web - DISABLED to fix grey screen issue
  // TODO: Fix SSR implementation before re-enabling
  // useSSRPrefetchHealthcare(hospitalId);
  
  // Use enhanced API hooks with error handling and caching
  // These hooks must be called before any conditional returns
  const { 
    data, 
    isLoading, 
    refetch,
    error,
  } = useActiveAlerts({
    enabled: !!user && !!hospitalId,
    refetchInterval: 30000, // 30 seconds
  });
  
  // Use enhanced mutations
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();
  
  // Batch mutations
  const batchAcknowledgeMutation = api.healthcare.batchAcknowledgeAlerts.useMutation();
  const batchResolveMutation = api.healthcare.batchResolveAlerts.useMutation();
  
  // Debug data fetching
  log.info('Alerts data state', 'ALERTS', {
    dataExists: !!data,
    alertsCount: data?.alerts?.length || 0,
    isLoading,
    error: error?.message || null,
    queryEnabled: !!user && !!hospitalId,
  });
  
  // WebSocket integration - must be called before conditional returns
  const { connectionState } = useAlertWebSocket({
    hospitalId,
    showNotifications: true,
    onAlertCreated: (event) => {
      log.info('New alert created - refreshing list', 'ALERTS', event);
      refetch();
      // Highlight the new alert
      if (event?.alertId) {
        setHighlightedAlertId(event.alertId);
        // Remove highlight after 5 seconds
        setTimeout(() => setHighlightedAlertId(null), 5000);
      }
    },
    onAlertAcknowledged: () => {
      log.info('Alert acknowledged - refreshing list', 'ALERTS');
      refetch();
    },
    onAlertResolved: () => {
      log.info('Alert resolved - refreshing list', 'ALERTS');
      refetch();
    },
  });
  
  // Log query state for debugging
  useEffect(() => {
    log.debug('Alerts query state', 'ALERTS', {
      enabled: !!user && !!hospitalId && hospitalContext.canAccessHealthcare,
      hospitalId,
      userId: user?.id,
      userRole: user?.role,
      canAccessHealthcare: hospitalContext.canAccessHealthcare,
      hasValidHospital: hospitalContext.hasValidHospital,
      hospitalError: hospitalContext.error,
      canViewAlerts,
      organizationId: user?.organizationId,
      defaultHospitalId: user?.defaultHospitalId,
      // Add query status
      isLoading,
      hasData: !!data,
      alertsCount: data?.alerts?.length || 0,
      queryEnabled: !!user && !!hospitalId,
    });
  }, [user, hospitalId, hospitalContext, canViewAlerts, isLoading, data]);
  
  // Handle navigation from create alert with highlight
  useEffect(() => {
    if (searchParams.newAlertId && typeof searchParams.newAlertId === 'string') {
      setHighlightedAlertId(searchParams.newAlertId);
      // Remove highlight after 5 seconds
      setTimeout(() => setHighlightedAlertId(null), 5000);
    }
  }, [searchParams.newAlertId]);
  
  // Callbacks - must be defined before conditional returns
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic('light');
    try {
      await refetch();
      haptic('success');
    } catch {
      // Error handling is done by the hook
      haptic('error');
    }
    setRefreshing(false);
  }, [refetch]);
  
  const handleCreateAlert = useCallback(() => {
    haptic('medium');
    if (canCreateAlerts) {
      router.push('/(modals)/create-alert');
    } else {
      // Error alert is handled by the hook
    }
  }, [canCreateAlerts, router]);
  
  const handleAcknowledge = useCallback((alertId: string) => {
    // Find the alert to show in dialog
    const alert = data?.alerts.find(a => a.id === alertId);
    if (alert) {
      setAcknowledgeDialogAlert(alert);
    }
  }, [data?.alerts]);
  
  const handleAcknowledgeSubmit = useCallback(async (acknowledgeData: any) => {
    try {
      await acknowledgeMutation.mutateAsync(acknowledgeData);
      haptic('success');
      setAcknowledgeDialogAlert(null);
    } catch (error) {
      haptic('error');
      log.error('Failed to acknowledge alert', 'ALERTS', { error });
      throw error; // Re-throw to let dialog handle error state
    }
  }, [acknowledgeMutation]);
  
  const handleResolve = useCallback(async (alertId: string) => {
    try {
      await resolveMutation.mutateAsync({ 
        alertId,
        resolution: 'Resolved via mobile app',
      });
      haptic('success');
    } catch (error) {
      haptic('error');
      log.error('Failed to resolve alert', 'ALERTS', { error });
    }
  }, [resolveMutation]);
  
  // Batch handlers
  const handleBatchAcknowledge = useCallback(async (alertIds: string[]) => {
    try {
      await batchAcknowledgeMutation.mutateAsync({
        alertIds,
        urgencyAssessment: 'maintain',
        responseAction: 'responding',
        notes: 'Batch acknowledged via mobile app',
      });
      haptic('success');
      refetch();
    } catch (error) {
      haptic('error');
      log.error('Failed to batch acknowledge alerts', 'ALERTS', { error });
    }
  }, [batchAcknowledgeMutation, refetch]);
  
  const handleBatchResolve = useCallback(async (alertIds: string[]) => {
    try {
      await batchResolveMutation.mutateAsync({
        alertIds,
        resolution: 'Batch resolved via mobile app',
        followUpRequired: false,
      });
      haptic('success');
      refetch();
    } catch (error) {
      haptic('error');
      log.error('Failed to batch resolve alerts', 'ALERTS', { error });
    }
  }, [batchResolveMutation, refetch]);
  
  // Header animation based on scroll - must be defined before conditional returns
  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, 100],
      [180, 100],
      'clamp'
    );
    return {
      height,
    };
  });
  
  // Timeline data - disabled for now as endpoint doesn't exist
  const timelineData = null;
  
  // Create a custom page animation that doesn't interfere with rendering
  // This must be declared before any conditional returns to follow React hooks rules
  const pageAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1, { duration: 300 }),
      transform: [
        {
          translateY: withSpring(0, {
            damping: 20,
            stiffness: 90,
            overshootClamping: false,
          }),
        },
      ],
    };
  });
  
  // Now we can do conditional returns after all hooks have been called
  // Check permissions
  log.info('Permission check before render', 'ALERTS', {
    canViewAlerts,
    aboutToRedirect: !canViewAlerts,
  });
  
  if (!canViewAlerts) {
    log.warn('Redirecting to home - no view alerts permission', 'ALERTS');
    return <Redirect href="/home" />;
  }
  
  
  const filteredAlerts = (data?.alerts.filter(alert => {
    if (searchQuery && !alert.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (urgencyFilter !== 'all' && alert.urgencyLevel?.toString() !== urgencyFilter) {
      return false;
    }
    if (statusFilter === 'active' && alert.status !== 'active') {
      return false;
    }
    if (statusFilter === 'acknowledged' && alert.status !== 'acknowledged') {
      return false;
    }
    return true;
  }) || []) as any[];
  
  // Stats calculation
  const stats = {
    total: filteredAlerts.length,
    critical: filteredAlerts.filter(a => a.urgencyLevel <= 2).length,
    acknowledged: filteredAlerts.filter(a => a.status === 'acknowledged').length,
    avgResponseTime: '2m 15s', // This would come from real data
  };
  
  if (isLoading && !data) {
    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        style={{ flex: 1, backgroundColor: theme.background }}
      >
          {/* Header Skeleton */}
          <LinearGradient
            colors={[theme.primary + '20', theme.background]}
            style={{ paddingHorizontal: spacing[4] as any, paddingTop: spacing[4] as any, paddingBottom: spacing[3] as any }}
          >
            <VStack gap={spacing[3] as any}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack gap={spacing[2] as any}>
                  <Skeleton height={36} width={120} />
                  <Skeleton height={16} width={150} />
                </VStack>
                <Skeleton height={44} width={100} radius={12} />
              </HStack>
              
              {/* Stats Skeleton */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack gap={spacing[2] as any}>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} height={80} width={100} radius={12} />
                  ))}
                </HStack>
              </ScrollView>
            </VStack>
          </LinearGradient>
          
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, padding: spacing[4] as any }}
            style={{ backgroundColor: theme.background }}
          >
            <VStack gap={spacing[4] as any}>
              {/* Filter Skeleton */}
              <HStack gap={spacing[2] as any}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height={40} flex={1} radius={8} />
                ))}
              </HStack>
              
              {/* Alert Cards Skeleton */}
              <VStack gap={spacing[3] as any}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.delay(i * 100)}
                  >
                    <SkeletonCard height={120} />
                  </Animated.View>
                ))}
              </VStack>
            </VStack>
          </ScrollView>
      </Animated.View>
    );
  }
  
  log.info('Rendering main alerts UI', 'ALERTS', {
    filteredAlertsCount: filteredAlerts.length,
    stats,
    themeBackground: theme.background,
  });
  
  // Remove debug UI and show proper alerts screen

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: theme.background }, pageAnimatedStyle]}>
        {/* Unified Header */}
        <UnifiedHeader 
          title="Alerts"
          subtitle="Real-time monitoring"
          showBackButton={false}
          rightElement={
            canCreateAlerts ? (
              <Button
                onPress={handleCreateAlert}
                size="default"
                style={{
                  backgroundColor: '#ef4444',
                  borderRadius: 12,
                }}
              >
                <HStack gap={spacing[1] as any} alignItems="center">
                  <Symbol name="plus.circle.fill" size="sm" color="white" />
                  <Text style={{ color: 'white' }}>New Alert</Text>
                </HStack>
              </Button>
            ) : undefined
          }
        />
        
        {/* Connection Status */}
        <ConnectionStatus 
          connectionState={connectionState} 
          position="top"
          showDetails={false}
        />
        
        {/* Stats Section */}
        <LinearGradient
          colors={[theme.primary + '20', theme.background]}
          style={{ paddingHorizontal: spacing[4] as any, paddingVertical: spacing[3] as any }}
        >
          <VStack gap={spacing[3] as any}>
            
            {/* Quick Stats */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing[2] as any , paddingBottom: 20 }}
              style={{ flexGrow: 0 }}
            >
              <StatCard
                icon="bell.fill"
                label="Total"
                value={stats.total.toString()}
                color="#3b82f6"
              />
              <StatCard
                icon="exclamationmark.triangle.fill"
                label="Critical"
                value={stats.critical.toString()}
                color="#ef4444"
              />
              <StatCard
                icon="checkmark.circle.fill"
                label="Acknowledged"
                value={stats.acknowledged.toString()}
                color="#10b981"
              />
              <StatCard
                icon="clock.fill"
                label="Avg Response"
                value={stats.avgResponseTime}
                color="#f59e0b"
              />
            </ScrollView>
          </VStack>
        </LinearGradient>
      
      <View style={{ flex: 1 }}>
        {/* Filter Presets */}
        <View style={{ paddingVertical: spacing[2] as any }}>
          <AlertFilterPresets />
        </View>
        
        {/* Filters */}
        <View style={{ paddingHorizontal: spacing[4] as any, paddingBottom: spacing[2] as any }}>
          <AlertFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            urgencyFilter={urgencyFilter}
            onUrgencyChange={setUrgencyFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
          />
        </View>
        
        {/* Alert List with Batch Actions */}
        <AlertListWithBatchActions
          alerts={filteredAlerts}
          isLoading={isLoading}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onAlertPress={(alert) => router.push(`/alerts/${alert.id}`)}
          onAcknowledge={canAcknowledgeAlerts ? handleAcknowledge : undefined}
          onResolve={canResolveAlerts ? handleResolve : undefined}
          onBatchAcknowledge={canAcknowledgeAlerts ? handleBatchAcknowledge : undefined}
          onBatchResolve={canResolveAlerts ? handleBatchResolve : undefined}
          canAcknowledge={canAcknowledgeAlerts}
          canResolve={canResolveAlerts}
          highlightedAlertId={highlightedAlertId}
          searchQuery={searchQuery}
          hasFilters={urgencyFilter !== 'all' || statusFilter !== 'active'}
        />
        
        {/* Timeline Widget - Show as overlay for recent events */}
        {timelineData && timelineData.events && timelineData.events.length > 0 && (
          <Animated.View 
            entering={FadeInDown.delay(300)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: spacing[4] as any,
              backgroundColor: theme.background + 'F0',
            }}
          >
            <AlertTimelineWidget
              events={timelineData.events.slice(0, 10)}
              alertStatus="active"
              urgencyLevel={3}
            />
          </Animated.View>
        )}
      </View>
      
      {/* Acknowledge Dialog */}
      {acknowledgeDialogAlert && (
        <AlertAcknowledgeDialog
          isOpen={!!acknowledgeDialogAlert}
          onClose={() => setAcknowledgeDialogAlert(null)}
          alert={acknowledgeDialogAlert}
          onAcknowledge={handleAcknowledgeSubmit}
          isLoading={acknowledgeMutation.isLoading}
        />
      )}
    </Animated.View>
  );
}

// Stat Card Component
const StatCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => {
  const { spacing } = useSpacing();
  
  return (
    <View style={{
      backgroundColor: color + '10',
      borderRadius: 12,
      padding: spacing[3] as any,
      minWidth: 100,
      borderWidth: 1,
      borderColor: color + '30',
    }}>
      <VStack gap={spacing[1] as any} alignItems="center">
        <Symbol name={icon as any} size="sm" color={color} />
        <Text size="xs" colorTheme="mutedForeground">{label}</Text>
        <Text size="base" weight="bold" style={{ color }}>{value}</Text>
      </VStack>
    </View>
  );
};


// Export component wrapped with error boundary
export default function AlertsScreen() {
  return (
    <ApiErrorBoundary retryRoute="/alerts">
      <AlertsScreenContent />
    </ApiErrorBoundary>
  );
}