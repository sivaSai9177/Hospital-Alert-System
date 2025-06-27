import React, { useState, useCallback, useMemo } from 'react';
import { 
  ScrollView, 
  RefreshControl, 
  View, 
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  SlideInRight,
  FadeIn,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Box,
  Badge,
  GlassCard,
  Symbol,
  Heading2,
  Separator,
  Checkbox,
  Grid,
  GridItem,
  AlertCircle,
} from '@/components/universal';
import { Skeleton, SkeletonCard } from '@/components/universal/feedback/Skeleton';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/trpc';
import { formatDistanceToNow } from 'date-fns';
import { haptic } from '@/lib/ui/haptics';
import { showSuccessAlert, showErrorAlert } from '@/lib/core/alert';
import { 
  useEscalationQueue, 
  useBatchAcknowledgeEscalatedAlerts,
  useHospitalContext 
} from '@/hooks/healthcare';
import { useHealthcareAccess } from '@/hooks/usePermissions';
import { URGENCY_LEVEL_CONFIG } from '@/types/healthcare';
import { logger } from '@/lib/core/debug/unified-logger';
import { useResponsive } from '@/hooks/responsive';
import { AlertAcknowledgeDialog } from '@/components/blocks/healthcare';
import { AppLoadingScreen } from '@/components/blocks/loading/AppLoadingScreen';
import { EmptyState } from '@/components/universal/feedback/EmptyState';

// Urgency level configurations for UI display
const urgencyConfig: Record<number, { label: string; color: string; icon: string }> = {
  5: { label: 'Critical', color: '#dc2626', icon: 'exclamationmark.triangle.fill' },
  4: { label: 'High', color: '#f59e0b', icon: 'exclamationmark.circle.fill' },
  3: { label: 'Medium', color: '#3b82f6', icon: 'bell.fill' },
  2: { label: 'Low', color: '#10b981', icon: 'bell' },
  1: { label: 'Info', color: '#6b7280', icon: 'info.circle' },
};

export default function AlertEscalationQueueScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { user } = useAuth();
  const { isDesktop, isMobile } = useResponsive();
  
  // Hospital context and permissions
  const { hospitalId, canAccessHealthcare } = useHospitalContext();
  const { canAcknowledgeAlerts, canViewAlerts, isLoading: permissionsLoading } = useHealthcareAccess();
  
  // Debug logging
  logger.info('EscalationQueueScreen rendering', 'ESCALATION_QUEUE', {
    user: user ? { id: user.id, role: user.role } : null,
    hospitalId,
    canAccessHealthcare,
    canViewAlerts,
    canAcknowledgeAlerts,
    hospitalIdType: typeof hospitalId,
    hospitalIdValue: hospitalId,
  });
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [acknowledgeDialogAlert, setAcknowledgeDialogAlert] = useState<any | null>(null);
  
  // Use the new escalation queue hook
  const {
    alerts: filteredAlerts,
    alertsByTier,
    stats,
    isLoading,
    error,
    refetch,
    isOffline,
    lastUpdated,
  } = useEscalationQueue({
    enabled: !!hospitalId && canAccessHealthcare && canViewAlerts,
    refetchInterval: 10000,
    urgencyFilter,
    showNotifications: true,
  });
  
  // Debug logging
  logger.info('Escalation queue state', 'ESCALATION_QUEUE', {
    alertsCount: filteredAlerts.length,
    isLoading,
    isOffline,
    error: error?.message || null,
    stats,
    lastUpdated,
  });
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic('light');
    try {
      await refetch();
      haptic('success');
    } catch {
      showErrorAlert('Failed to refresh alerts');
      haptic('error');
    }
    setRefreshing(false);
  }, [refetch]);
  
  const handleToggleAlert = useCallback((alertId: string) => {
    haptic('light');
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  }, []);
  
  const handleSelectAll = useCallback(() => {
    haptic('light');
    if (selectedAlerts.length === filteredAlerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(filteredAlerts.map(a => a.id));
    }
  }, [selectedAlerts, filteredAlerts]);
  
  const acknowledgeMutation = api.healthcare.acknowledgeAlert.useMutation({
    onSuccess: () => {
      logger.info('Alert acknowledged successfully', 'ESCALATION_QUEUE');
      showSuccessAlert('Alert acknowledged successfully');
    },
    onError: (error) => {
      logger.error('Failed to acknowledge alert', 'ESCALATION_QUEUE', { error: error.message });
      showErrorAlert('Failed to acknowledge alert', error.message || 'Please try again');
    },
  });
  
  const batchAcknowledgeMutation = useBatchAcknowledgeEscalatedAlerts();
  
  const handleSingleAcknowledge = useCallback((alertId: string) => {
    if (!canAcknowledgeAlerts) {
      showErrorAlert('You do not have permission to acknowledge alerts');
      return;
    }
    
    const alert = filteredAlerts.find(a => a.id === alertId);
    if (alert) {
      setAcknowledgeDialogAlert(alert);
    }
  }, [filteredAlerts, canAcknowledgeAlerts]);
  
  const handleAcknowledgeSubmit = useCallback(async (acknowledgeData: any) => {
    try {
      await acknowledgeMutation.mutateAsync(acknowledgeData);
      haptic('success');
      setAcknowledgeDialogAlert(null);
      await refetch();
    } catch (error) {
      haptic('error');
      logger.error('Failed to acknowledge alert', 'ESCALATION_QUEUE', { error });
      // Error is already handled by mutation onError
    }
  }, [acknowledgeMutation, refetch]);
  
  const handleBulkAcknowledge = useCallback(async () => {
    if (selectedAlerts.length === 0 || !canAcknowledgeAlerts) return;
    
    haptic('medium');
    
    try {
      await batchAcknowledgeMutation.mutateAsync({
        alertIds: selectedAlerts,
        urgencyAssessment: 'maintain',
        responseAction: 'responding',
        notes: 'Bulk acknowledged from escalation queue',
      });
      
      showSuccessAlert(`${selectedAlerts.length} alerts acknowledged`);
      setSelectedAlerts([]);
      await refetch();
    } catch {
      showErrorAlert('Failed to acknowledge some alerts');
    }
  }, [selectedAlerts, canAcknowledgeAlerts, batchAcknowledgeMutation, refetch]);
  
  // Handle navigation
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/alerts');
    }
  }, [router]);
  
  // Show loading screen while permissions are being determined
  if (permissionsLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Escalation Queue',
            headerBackTitle: 'Back',
            presentation: 'card',
            headerShown: false,
          }}
        />
        <AppLoadingScreen showProgress />
      </>
    );
  }
  
  // Check permissions after loading
  if (!canViewAlerts) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Escalation Queue',
            headerBackTitle: 'Back',
            presentation: 'card',
            headerShown: false,
          }}
        />
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4] }}>
            <VStack gap={4} align="center">
              <AlertCircle size={48} color="destructive" />
              <Text size="lg" weight="semibold" align="center">
                Access Denied
              </Text>
              <Text colorTheme="mutedForeground" align="center">
                You do not have permission to view escalated alerts.
              </Text>
              <Button
                variant="default"
                onPress={handleBack}
                style={{ marginTop: 20 }}
              >
                Go Back
              </Button>
            </VStack>
          </View>
        </SafeAreaView>
      </>
    );
  }
  
  // Check hospital context
  if (!hospitalId) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Escalation Queue',
            headerBackTitle: 'Back',
            presentation: 'card',
            headerShown: false,
          }}
        />
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4] }}>
            <VStack gap={4} align="center">
              <AlertCircle size={48} color="warning" />
              <Text size="lg" weight="semibold" align="center">
                No Hospital Selected
              </Text>
              <Text colorTheme="mutedForeground" align="center">
                Please select a hospital in settings before viewing alerts.
              </Text>
              <Button
                variant="default"
                onPress={() => router.push('/settings')}
                style={{ marginTop: 20 }}
              >
                Go to Settings
              </Button>
            </VStack>
          </View>
        </SafeAreaView>
      </>
    );
  }
  
  if (isLoading && filteredAlerts.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <Container>
          <VStack gap={4}>
            {/* Header Skeleton */}
            <SkeletonCard height={180} />
            
            {/* Filter Skeleton */}
            <HStack gap={2}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={40} flex={1} radius={8} />
              ))}
            </HStack>
            
            {/* Alert Skeletons */}
            <VStack gap={4}>
              {[1, 2, 3].map((tier) => (
                <VStack key={tier} gap={2}>
                  <HStack gap={2} alignItems="center">
                    <Skeleton height={24} width={4} />
                    <Skeleton height={20} width={120} />
                    <Skeleton height={20} width={60} radius={12} />
                  </HStack>
                  <Grid columns={isDesktop ? 2 : 1} gap={3}>
                    {[1, 2].map((alert) => (
                      <GridItem key={alert} span={1}>
                        <SkeletonCard height={120} />
                      </GridItem>
                    ))}
                  </Grid>
                </VStack>
              ))}
            </VStack>
          </VStack>
        </Container>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Escalation Queue',
            headerBackTitle: 'Back',
            presentation: 'card',
            headerShown: false,
          }}
        />
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <Container>
            <VStack p={4} gap={4} alignItems="center" justifyContent="center" style={{ flex: 1 }}>
              <Symbol name="exclamationmark.triangle" size={48} color={theme.destructive} />
              <Text size="lg" weight="semibold">Failed to Load Escalation Queue</Text>
              <Text colorTheme="mutedForeground" align="center" style={{ maxWidth: 300 }}>
                {error.message || 'An error occurred while fetching escalated alerts'}
              </Text>
              <VStack gap={2} style={{ marginTop: 20 }}>
                <Button onPress={() => refetch()} variant="default">
                  Try Again
                </Button>
                <Button onPress={handleBack} variant="outline">
                  Go Back
                </Button>
              </VStack>
            </VStack>
          </Container>
        </SafeAreaView>
      </>
    );
  }
  
  const tierColors = {
    2: '#f59e0b',
    3: '#ef4444',
    4: '#dc2626',
  };
  
  const content = (
    <VStack gap={spacing[4]}>
      {/* Header Card */}
      <GlassCard>
        <LinearGradient
          colors={[theme.destructive + '20', theme.background]}
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <Box p={4}>
            <VStack gap={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <HStack gap={2} alignItems="center">
                  <Button
                    onPress={() => router.back()}
                    variant="ghost"
                    size="icon"
                  >
                    <Symbol name="chevron.left" size={24} />
                  </Button>
                  <VStack>
                    <HStack gap={2} align="center">
                      <Text size="2xl" weight="bold">Escalation Queue</Text>
                      {isOffline && (
                        <Badge variant="outline" size="sm" style={{ borderColor: theme.accent }}>
                          <HStack gap={1} align="center">
                            <Symbol name="wifi.slash" size={12} color={theme.accent} />
                            <Text size="xs" style={{ color: theme.accent }}>Offline</Text>
                          </HStack>
                        </Badge>
                      )}
                    </HStack>
                    <Text size="sm" colorTheme="mutedForeground">
                      Alerts requiring immediate attention
                      {lastUpdated && (
                        <Text size="xs" colorTheme="mutedForeground">
                          {' • Updated '}
                          {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                        </Text>
                      )}
                    </Text>
                  </VStack>
                </HStack>
                {canAcknowledgeAlerts && selectedAlerts.length > 0 && (
                  <Button
                    size="default"
                    onPress={handleBulkAcknowledge}
                    style={{ backgroundColor: theme.destructive }}
                  >
                    <HStack gap={2} alignItems="center">
                      <Symbol name="checkmark.circle.fill" size={16} color="white" />
                      <Text weight="semibold" style={{ color: 'white' }}>
                        Acknowledge ({selectedAlerts.length})
                      </Text>
                    </HStack>
                  </Button>
                )}
              </HStack>
              
              <Separator />
              
              {/* Stats Row */}
              <Grid columns={isMobile ? 2 : 5} gap={3}>
                <GridItem span={1}>
                  <VStack gap={1}>
                    <Text size="xs" colorTheme="mutedForeground">Total Escalated</Text>
                    <Text size="2xl" weight="bold">{stats.total}</Text>
                  </VStack>
                </GridItem>
                <GridItem span={1}>
                  <VStack gap={1}>
                    <Text size="xs" colorTheme="mutedForeground">Tier 2</Text>
                    <Text size="2xl" weight="bold" style={{ color: tierColors[2] }}>
                      {stats.tier2}
                    </Text>
                  </VStack>
                </GridItem>
                <GridItem span={1}>
                  <VStack gap={1}>
                    <Text size="xs" colorTheme="mutedForeground">Tier 3</Text>
                    <Text size="2xl" weight="bold" style={{ color: tierColors[3] }}>
                      {stats.tier3}
                    </Text>
                  </VStack>
                </GridItem>
                <GridItem span={1}>
                  <VStack gap={1}>
                    <Text size="xs" colorTheme="mutedForeground">Tier 4+</Text>
                    <Text size="2xl" weight="bold" style={{ color: tierColors[4] }}>
                      {stats.tier4Plus}
                    </Text>
                  </VStack>
                </GridItem>
                <GridItem span={isMobile ? 2 : 1}>
                  <VStack gap={1}>
                    <Text size="xs" colorTheme="mutedForeground">Avg Time</Text>
                    <Text size="2xl" weight="bold">{stats.averageResponseTime}</Text>
                  </VStack>
                </GridItem>
              </Grid>
              
              {/* Urgency Distribution */}
              {Object.keys(stats.byUrgency || {}).length > 0 && (
                <VStack gap={2}>
                  <Text size="xs" colorTheme="mutedForeground">Urgency Distribution</Text>
                  <HStack gap={2}>
                    {Object.entries(stats.byUrgency).map(([level, count]) => (
                      <Badge 
                        key={level} 
                        variant="outline" 
                        size="sm"
                        style={{ 
                          borderColor: urgencyConfig[Number(level)]?.color || theme.border,
                          backgroundColor: (urgencyConfig[Number(level)]?.color || theme.border) + '10',
                        }}
                      >
                        <HStack gap={1} align="center">
                          <Text size="xs" weight="semibold" style={{ color: urgencyConfig[Number(level)]?.color || theme.foreground }}>
                            L{level}
                          </Text>
                          <Text size="xs" style={{ color: urgencyConfig[Number(level)]?.color || theme.foreground }}>
                            ({count})
                          </Text>
                        </HStack>
                      </Badge>
                    ))}
                  </HStack>
                </VStack>
              )}
            </VStack>
          </Box>
        </LinearGradient>
      </GlassCard>
      {/* Filter Tabs */}
      <Animated.View entering={FadeInDown.delay(200)}>
        <HStack gap={2}>
          {['all', '3', '4', '5'].map((level) => (
            <Pressable
              key={level}
              onPress={() => {
                haptic('light');
                setUrgencyFilter(level as any);
              }}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  backgroundColor: urgencyFilter === level 
                    ? theme.primary 
                    : theme.card,
                  borderRadius: 8,
                  paddingVertical: spacing[2],
                  paddingHorizontal: spacing[3],
                  borderWidth: 1,
                  borderColor: urgencyFilter === level 
                    ? theme.primary 
                    : theme.border,
                }}
              >
                <Text
                  align="center"
                  size="sm"
                  weight="medium"
                  style={{ 
                    color: urgencyFilter === level 
                      ? 'white' 
                      : theme.foreground 
                  }}
                >
                  {level === 'all' 
                    ? 'All Levels' 
                    : `Level ${level}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </HStack>
      </Animated.View>
              
      {/* Select All Option */}
      {filteredAlerts.length > 0 && canAcknowledgeAlerts && (
        <Animated.View entering={FadeInDown.delay(250)}>
          <Pressable onPress={handleSelectAll}>
            <HStack gap={3} alignItems="center">
              <Checkbox
                checked={selectedAlerts.length === filteredAlerts.length}
                onCheckedChange={handleSelectAll}
              />
              <Text size="sm" weight="medium">
                Select all {filteredAlerts.length} alerts
              </Text>
            </HStack>
          </Pressable>
        </Animated.View>
      )}
              
      {/* Alerts by Tier */}
      {Object.entries(alertsByTier)
        .sort(([a], [b]) => parseInt(b) - parseInt(a))
        .map(([tier, alerts], groupIndex) => (
          <Animated.View 
            key={tier}
            entering={FadeInDown.delay(300 + groupIndex * 50)}
          >
            <VStack gap={3}>
              {/* Tier Header */}
              <HStack gap={2} alignItems="center">
                <View
                  style={{
                    width: 4,
                    height: 24,
                    backgroundColor: tierColors[parseInt(tier)] || theme.destructive,
                    borderRadius: 2,
                  }}
                />
                <Text size="lg" weight="semibold">
                  Escalation Tier {tier}
                </Text>
                <Badge variant="destructive" size="sm">
                  <Text size="sm">{alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}</Text>
                </Badge>
              </HStack>
              
              {/* Alert Cards Grid */}
              <Grid columns={isDesktop ? 2 : 1} gap={3}>
                {alerts.map((alert, index) => (
                  <GridItem key={alert.id} span={1}>
                    <Animated.View 
                      entering={SlideInRight.delay(350 + groupIndex * 50 + index * 25)}
                    >
                      <Pressable
                        onPress={() => handleToggleAlert(alert.id)}
                      >
                        <GlassCard
                          style={[
                            {
                              borderWidth: 1,
                              borderColor: selectedAlerts.includes(alert.id) 
                                ? theme.primary 
                                : theme.border,
                            },
                            selectedAlerts.includes(alert.id) && {
                              borderWidth: 2,
                              transform: [{ scale: 0.98 }],
                            }
                          ]}
                        >
                          <Box p={3}>
                            <VStack gap={2}>
                              {/* Header Row */}
                              <HStack justifyContent="space-between" alignItems="flex-start">
                                <Pressable
                                  onPress={() => {
                                    haptic('light');
                                    router.push(`/alerts/${alert.id}`);
                                  }}
                                  style={{ flex: 1 }}
                                >
                                  <HStack gap={2} alignItems="center">
                                    {canAcknowledgeAlerts && (
                                      <Checkbox
                                        checked={selectedAlerts.includes(alert.id)}
                                        onCheckedChange={() => handleToggleAlert(alert.id)}
                                      />
                                    )}
                                    <VStack gap={1} style={{ flex: 1 }}>
                                      <HStack gap={2} alignItems="center">
                                        <Text weight="semibold" size="base">
                                          Room {alert.roomNumber}
                                        </Text>
                                        <Badge
                                          variant="outline"
                                          size="sm"
                                          style={{
                                            borderColor: tierColors[parseInt(tier)] || theme.destructive,
                                            backgroundColor: (tierColors[parseInt(tier)] || theme.destructive) + '10',
                                          }}
                                        >
                                          <Text size="xs" style={{ color: tierColors[parseInt(tier)] || theme.destructive }}>
                                            {URGENCY_LEVEL_CONFIG[alert.urgencyLevel]?.label || `Level ${alert.urgencyLevel}`}
                                          </Text>
                                        </Badge>
                                      </HStack>
                                      <Text size="sm" colorTheme="mutedForeground">
                                        {alert.alertType.replace(/_/g, ' ').toUpperCase()}
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </Pressable>
                                
                                {/* Actions */}
                                <VStack gap={1}>
                                  <Pressable
                                    onPress={() => {
                                      haptic('light');
                                      router.push(`/alerts/${alert.id}`);
                                    }}
                                    style={{
                                      padding: spacing[2],
                                      borderRadius: 8,
                                      backgroundColor: theme.muted,
                                    }}
                                  >
                                    <Symbol name="arrow.right.circle" size="sm" color={theme.primary} />
                                  </Pressable>
                                </VStack>
                              </HStack>
                              
                              {/* Description */}
                              {alert.description && (
                                <Pressable
                                  onPress={() => {
                                    haptic('light');
                                    router.push(`/alerts/${alert.id}`);
                                  }}
                                >
                                  <Text size="sm" numberOfLines={2}>
                                    {alert.description}
                                  </Text>
                                </Pressable>
                              )}
                              
                              {/* Footer Info */}
                              <VStack gap={1}>
                                {/* Time in tier */}
                                <HStack justifyContent="space-between" alignItems="center">
                                  <Text size="xs" colorTheme="mutedForeground">
                                    In tier for:
                                  </Text>
                                  <Text size="sm" weight="semibold" style={{ color: tierColors[parseInt(tier)] || theme.destructive }}>
                                    {formatDistanceToNow(new Date(alert.createdAt))}
                                  </Text>
                                </HStack>
                                
                                {/* Target Department */}
                                {alert.targetDepartment && (
                                  <HStack justifyContent="space-between" alignItems="center">
                                    <Text size="xs" colorTheme="mutedForeground">Department:</Text>
                                    <Badge variant="outline" size="sm">
                                      <Text size="sm">{alert.targetDepartment}</Text>
                                    </Badge>
                                  </HStack>
                                )}
                                
                                {/* Next Escalation Timer */}
                                {parseInt(tier) < 4 && (
                                  <HStack gap={2} alignItems="center">
                                    <Symbol name="clock.arrow.circlepath" size="xs" color={theme.destructive} />
                                    <Text size="xs" colorTheme="destructive">
                                      Next escalation in 5 minutes
                                    </Text>
                                  </HStack>
                                )}
                              </VStack>
                              
                              {/* Action Buttons */}
                              {canAcknowledgeAlerts && (
                                <Button
                                  onPress={() => handleSingleAcknowledge(alert.id)}
                                  variant="outline"
                                  size="sm"
                                  fullWidth
                                  style={{
                                    borderColor: tierColors[parseInt(tier)] || theme.destructive,
                                  }}
                                >
                                  <HStack gap={2} alignItems="center">
                                    <Symbol name="checkmark.circle" size="sm" color={tierColors[parseInt(tier)] || theme.destructive} />
                                    <Text size="sm" style={{ color: tierColors[parseInt(tier)] || theme.destructive }}>
                                      Acknowledge
                                    </Text>
                                  </HStack>
                                </Button>
                              )}
                            </VStack>
                          </Box>
                        </GlassCard>
                      </Pressable>
                    </Animated.View>
                  </GridItem>
                ))}
              </Grid>
            </VStack>
          </Animated.View>
        ))}
              
      {/* Empty State */}
      {filteredAlerts.length === 0 && !isLoading && (
        <Animated.View entering={FadeInDown.delay(300)}>
          <EmptyState
            icon="checkmark.circle.fill"
            iconColor={theme.success}
            title="No Escalated Alerts"
            description={
              urgencyFilter === 'all' 
                ? 'All alerts are being handled appropriately'
                : `No Level ${urgencyFilter} alerts have been escalated`
            }
            action={{
              label: "View All Alerts",
              onPress: () => router.push('/alerts'),
            }}
          />
        </Animated.View>
      )}
    </VStack>
  );
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Escalation Queue',
          headerBackTitle: 'Alerts',
          presentation: 'card',
          headerShown: false,
        }}
      />
      
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          contentContainerStyle={{ 
            flexGrow: 1,
            padding: spacing[4],
            paddingBottom: spacing[6],
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {Platform.OS === 'web' ? (
            <View style={{ width: '100%', maxWidth: 1200, marginHorizontal: 'auto' }}>
              {content}
            </View>
          ) : (
            content
          )}
        </ScrollView>
        
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
      </SafeAreaView>
    </>
  );
}