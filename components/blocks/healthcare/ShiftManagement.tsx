import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  ScrollView, 
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { 
  FadeIn, 
  FadeInDown,
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { 
  VStack, 
  HStack, 
  Text, 
  Button,
  Card,
  GlassCard,
  Badge,
  Symbol,
} from '@/components/universal';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useTheme } from '@/lib/theme/provider';
import { useShadow } from '@/hooks/useShadow';
import { useResponsive } from '@/hooks/responsive';
import { api } from '@/lib/api/trpc';
import { haptic } from '@/lib/ui/haptics';
import { logger } from '@/lib/core/debug/unified-logger';
import { useHospitalContext } from '@/hooks/healthcare';
import { formatDistanceToNow } from 'date-fns';
import { useShiftStore } from '@/lib/stores/shift-store';
import { HealthcareErrorBoundary } from '@/components/blocks/errors/HealthcareErrorBoundary';

interface ShiftManagementProps {
  onShiftChange?: (isOnDuty: boolean) => void;
  embedded?: boolean;
}

// Shift status card component
const ShiftStatusCard: React.FC<{
  status: any;
  onStartShift: () => void;
  onEndShift: () => void;
  isLoading?: boolean;
}> = ({ status, onStartShift, onEndShift, isLoading }) => {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const shadowMd = useShadow({ size: 'md' });
  const { isMobile } = useResponsive();
  const pulseAnim = useSharedValue(0);

  // Pulse animation for active shift
  useEffect(() => {
    if (status?.isOnDuty) {
      pulseAnim.value = withRepeat(
        withSequence(
          withSpring(1, { damping: 2 }),
          withSpring(0, { damping: 2 })
        ),
        -1,
        true
      );
    } else {
      pulseAnim.value = 0;
    }
  }, [status?.isOnDuty, pulseAnim]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.3, 0]),
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [1, 1.2]) }],
  }));

  const getDurationDisplay = () => {
    if (!status?.shiftDurationHours) return null;
    const hours = Math.floor(status.shiftDurationHours);
    const minutes = Math.round((status.shiftDurationHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <GlassCard style={[shadowMd, { overflow: 'hidden' }]}>
      <VStack gap={3} p={spacing[4]}>
        {/* Header */}
        <HStack justifyContent="space-between" alignItems="center">
          <HStack gap={3} alignItems="center">
            {/* Animated Status Indicator */}
            <View style={{ position: 'relative', width: 40, height: 40 }}>
              <View
                style={{
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: status?.isOnDuty ? theme.success : theme.muted,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Symbol 
                  name={status?.isOnDuty ? "clock.fill" : "clock"} 
                  size="md" 
                  color={status?.isOnDuty ? "white" : theme.mutedForeground} 
                />
              </View>
              {status?.isOnDuty && (
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.success,
                    },
                    pulseStyle,
                  ]}
                />
              )}
            </View>

            <VStack gap={1}>
              <Text size="lg" weight="bold">
                {status?.isOnDuty ? 'On Duty' : 'Off Duty'}
              </Text>
              {status?.isOnDuty && getDurationDisplay() && (
                <Text size="sm" colorTheme="mutedForeground">
                  Duration: {getDurationDisplay()}
                </Text>
              )}
            </VStack>
          </HStack>

          {/* Status Badge */}
          <Badge 
            variant={status?.isOnDuty ? "success" : "default"}
            size="lg"
          >
            {status?.isOnDuty ? "ACTIVE" : "INACTIVE"}
          </Badge>
        </HStack>

        {/* Shift Details */}
        {status?.isOnDuty && status?.shiftStartTime && (
          <Card style={{ backgroundColor: theme.muted }}>
            <VStack gap={2} p={spacing[3]}>
              <HStack justifyContent="space-between">
                <Text size="sm" colorTheme="mutedForeground">Started</Text>
                <Text size="sm" weight="medium">
                  {formatDistanceToNow(new Date(status.shiftStartTime), { addSuffix: true })}
                </Text>
              </HStack>
              {status.activeAlertCount > 0 && (
                <HStack justifyContent="space-between">
                  <Text size="sm" colorTheme="mutedForeground">Active Alerts</Text>
                  <Badge variant="error" size="sm">{status.activeAlertCount}</Badge>
                </HStack>
              )}
              {status.shiftDurationHours > 20 && (
                <HStack gap={1} alignItems="center">
                  <Symbol name="exclamationmark.triangle.fill" size="sm" color="#f59e0b" />
                  <Text size="xs" style={{ color: '#f59e0b' }}>
                    Approaching maximum shift duration (24h)
                  </Text>
                </HStack>
              )}
            </VStack>
          </Card>
        )}

        {/* Action Button */}
        <Button
          onPress={status?.isOnDuty ? onEndShift : onStartShift}
          variant={status?.isOnDuty ? "destructive" : "default"}
          size={isMobile ? "default" : "lg"}
          fullWidth
          isLoading={isLoading}
          disabled={
            (!status?.canStartShift && !status?.isOnDuty) || 
            (!status?.canEndShift && status?.isOnDuty)
          }
        >
          <HStack gap={2} alignItems="center">
            <Symbol 
              name={status?.isOnDuty ? "stop.circle.fill" : "play.circle.fill"} 
              size="sm" 
              color="white" 
            />
            <Text weight="semibold" style={{ color: 'white' }}>
              {status?.isOnDuty ? 'End Shift' : 'Start Shift'}
            </Text>
          </HStack>
        </Button>

        {/* Validation Messages */}
        {!status?.canStartShift && !status?.isOnDuty && status?.startShiftReason && (
          <Card style={{ backgroundColor: '#f59e0b20', borderColor: '#f59e0b' }}>
            <HStack gap={2} p={spacing[3]} alignItems="center">
              <Symbol name="clock.badge.exclamationmark" size="sm" color="#f59e0b" />
              <Text size="sm" style={{ flex: 1 }}>
                {status.startShiftReason}
                {status.hoursUntilCanStart && (
                  <Text size="sm" weight="semibold">
                    {` (${status.hoursUntilCanStart}h remaining)`}
                  </Text>
                )}
              </Text>
            </HStack>
          </Card>
        )}
      </VStack>
    </GlassCard>
  );
};

// Import react-hook-form component
import { ShiftHandoverForm } from './ShiftHandoverForm';

// Legacy handover form component (deprecated - use ShiftHandoverForm)
const HandoverFormLegacy: React.FC<{
  activeAlerts: number;
  onSubmit: (notes: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ activeAlerts, onSubmit, onCancel, isLoading }) => {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const shadowMd = useShadow({ size: 'md' });
  const { isMobile } = useResponsive();
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ notes?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!notes.trim()) {
      newErrors.notes = 'Handover notes are required when active alerts exist';
    } else if (notes.trim().length < 10) {
      newErrors.notes = 'Please provide more detailed handover notes (min 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(notes.trim());
    } else {
      haptic('light');
    }
  };

  return (
    <VStack gap={3}>
      {/* Alert Warning */}
      <Card style={[{ backgroundColor: theme.destructive + '20', borderColor: theme.destructive }, shadowMd]}>
        <HStack gap={3} p={spacing[3]} alignItems="center">
          <View style={{
            backgroundColor: theme.destructive,
            borderRadius: 12,
            padding: spacing[2],
          }}>
            <Symbol name="exclamationmark.triangle.fill" size="md" color="white" />
          </View>
          <VStack gap={1} style={{ flex: 1 }}>
            <Text weight="semibold">{activeAlerts} Active Alert{activeAlerts > 1 ? 's' : ''}</Text>
            <Text size="sm" colorTheme="mutedForeground">
              Please provide handover notes for the incoming shift
            </Text>
          </VStack>
        </HStack>
      </Card>

      {/* Handover Notes Input */}
      <GlassCard style={shadowMd}>
        <VStack gap={3} p={spacing[4]}>
          <VStack gap={1}>
            <HStack gap={1} alignItems="center">
              <Text weight="semibold" size="lg">Handover Notes</Text>
              <Text size="sm" style={{ color: theme.destructive }}>*</Text>
            </HStack>
            <Text size="sm" colorTheme="mutedForeground">
              Summarize current status and any important information for the next shift
            </Text>
          </VStack>

          <TextInput
            value={notes}
            onChangeText={(text) => {
              setNotes(text);
              if (errors.notes) {
                setErrors({});
              }
            }}
            placeholder="e.g., Room 302 patient requires hourly monitoring. Code blue resolved in room 415..."
            multiline
            numberOfLines={6}
            maxLength={500}
            style={{
              backgroundColor: theme.background,
              borderWidth: 1,
              borderColor: errors.notes ? theme.destructive : theme.border,
              borderRadius: 12,
              padding: spacing[3],
              fontSize: isMobile ? 14 : 16,
              color: theme.foreground,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
          />

          {errors.notes && (
            <HStack gap={1} alignItems="center">
              <Symbol name="exclamationmark.circle.fill" size="xs" color={theme.destructive} />
              <Text size="sm" style={{ color: theme.destructive }}>
                {errors.notes}
              </Text>
            </HStack>
          )}

          <Text size="xs" colorTheme="mutedForeground" style={{ textAlign: 'right' }}>
            {notes.length}/500 characters
          </Text>
        </VStack>
      </GlassCard>

      {/* Actions */}
      <HStack gap={2}>
        <Button
          variant="outline"
          onPress={onCancel}
          size={isMobile ? "default" : "lg"}
          style={{ flex: 1 }}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onPress={handleSubmit}
          size={isMobile ? "default" : "lg"}
          style={{ flex: 1 }}
          isLoading={isLoading}
        >
          <HStack gap={2} alignItems="center">
            <Symbol name="arrow.right.circle.fill" size="sm" color="white" />
            <Text weight="semibold" style={{ color: 'white' }}>
              End Shift
            </Text>
          </HStack>
        </Button>
      </HStack>
    </VStack>
  );
};

// Stats display component
const ShiftStats: React.FC<{
  onDutyCount: number;
  totalAlerts: number;
  isLoading?: boolean;
}> = ({ onDutyCount, totalAlerts, isLoading }) => {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const shadowSm = useShadow({ size: 'sm' });

  const stats = [
    {
      icon: 'person.2.fill',
      label: 'On Duty',
      value: onDutyCount,
      color: theme.success,
    },
    {
      icon: 'bell.fill',
      label: 'Active Alerts',
      value: totalAlerts,
      color: theme.destructive,
    },
  ];

  return (
    <HStack gap={2}>
      {stats.map((stat, index) => (
        <Animated.View
          key={stat.label}
          entering={FadeInDown.delay(index * 100)}
          style={{ flex: 1 }}
        >
          <Card style={[shadowSm, { backgroundColor: stat.color + '10' }]}>
            <HStack gap={2} p={spacing[3]} alignItems="center">
              <View style={{
                backgroundColor: stat.color + '20',
                borderRadius: 10,
                padding: spacing[2],
              }}>
                <Symbol name={stat.icon as any} size="sm" color={stat.color} />
              </View>
              <VStack gap={0.5}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={stat.color} />
                ) : (
                  <Text size="xl" weight="bold" style={{ color: stat.color }}>
                    {stat.value}
                  </Text>
                )}
                <Text size="xs" colorTheme="mutedForeground">
                  {stat.label}
                </Text>
              </VStack>
            </HStack>
          </Card>
        </Animated.View>
      ))}
    </HStack>
  );
};

export function ShiftManagement({ onShiftChange, embedded = false }: ShiftManagementProps) {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const { isDesktop } = useResponsive();
  const hospitalContext = useHospitalContext();
  const [showHandoverForm, setShowHandoverForm] = useState(false);
  
  // Use shift store
  const {
    isOnDuty: storeIsOnDuty,
    shiftStartTime: storeShiftStartTime,
    shiftEndTime: storeShiftEndTime,
    setShiftStatus,
    setHandoverData,
    clearHandoverData,
  } = useShiftStore();
  
  // API Queries
  const { 
    data: shiftStatus, 
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = api.healthcare.getShiftStatus.useQuery(undefined, {
    enabled: hospitalContext.canAccessHealthcare,
    refetchInterval: 60000, // Refresh every minute
  });

  const { 
    data: onDutyStaff,
    isLoading: staffLoading,
    refetch: refetchOnDutyStaff,
  } = api.healthcare.getOnDutyStaff.useQuery(
    { hospitalId: hospitalContext.hospitalId || '' },
    {
      enabled: !!hospitalContext.hospitalId && hospitalContext.canAccessHealthcare,
      refetchInterval: 300000, // Refresh every 5 minutes
    }
  );

  const { 
    data: activeAlerts,
    isLoading: alertsLoading,
    refetch: refetchActiveAlerts,
  } = api.healthcare.getActiveAlerts.useQuery(
    { hospitalId: hospitalContext.hospitalId || '' },
    {
      enabled: !!hospitalContext.hospitalId && hospitalContext.canAccessHealthcare,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );
  
  // Log component mount and sync with shift status
  useEffect(() => {
    logger.healthcare.info('ShiftManagement component mounted', {
      embedded,
      hospitalId: hospitalContext.hospitalId,
      hasValidHospital: hospitalContext.hasValidHospital,
    });
    
    // Sync shift status with store
    if (shiftStatus && 'isOnDuty' in shiftStatus) {
      setShiftStatus({
        isOnDuty: shiftStatus.isOnDuty || false,
        shiftStartTime: ('shiftStartTime' in shiftStatus && shiftStatus.shiftStartTime) ? new Date(shiftStatus.shiftStartTime) : null,
        shiftEndTime: null,
      });
    }
    
    return () => {
      logger.healthcare.debug('ShiftManagement component unmounted');
    };
  }, [embedded, hospitalContext.hospitalId, hospitalContext.hasValidHospital, shiftStatus, setShiftStatus]);
  
  // Refetch shift status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      logger.healthcare.debug('ShiftManagement screen focused - refetching status');
      // Refetch all relevant data when screen regains focus
      refetchStatus();
      refetchOnDutyStaff();
      refetchActiveAlerts();
    }, [refetchStatus, refetchOnDutyStaff, refetchActiveAlerts])
  );

  // Mutations
  const toggleShiftMutation = api.healthcare.toggleOnDuty.useMutation({
    onSuccess: (data) => {
      haptic('success');
      refetchStatus();
      setShowHandoverForm(false);
      onShiftChange?.(data.isOnDuty);
      
      // Update shift store
      setShiftStatus({
        isOnDuty: data.isOnDuty,
        shiftStartTime: data.isOnDuty ? new Date() : null,
        shiftEndTime: !data.isOnDuty ? new Date() : null,
      });
      
      // Clear handover data after successful submission
      if (!data.isOnDuty) {
        clearHandoverData();
      }
      
      logger.healthcare.info('Shift toggled successfully', {
        isOnDuty: data.isOnDuty,
        duration: 'shiftDuration' in data ? data.shiftDuration : undefined,
      });
    },
    onError: (error) => {
      haptic('error');
      logger.healthcare.error('Failed to toggle shift', {
        error: error.message,
      });
    },
  });

  const handleStartShift = useCallback(() => {
    logger.healthcare.info('Starting shift requested');
    haptic('medium');
    toggleShiftMutation.mutate({ isOnDuty: true });
  }, [toggleShiftMutation]);

  const handleEndShift = useCallback(() => {
    const requiresHandover = shiftStatus && 'requiresHandover' in shiftStatus ? shiftStatus.requiresHandover : false;
    const activeAlertCount = shiftStatus && 'activeAlertCount' in shiftStatus ? shiftStatus.activeAlertCount : 0;
    
    logger.healthcare.info('Ending shift requested', {
      requiresHandover,
      activeAlerts: activeAlertCount,
    });
    haptic('light');
    
    // Check if handover is required
    if (requiresHandover || activeAlertCount > 0) {
      logger.healthcare.debug('Handover required - showing form', {
        requiresHandover,
        activeAlertCount,
      });
      setShowHandoverForm(true);
    } else {
      toggleShiftMutation.mutate({ isOnDuty: false });
    }
  }, [shiftStatus, toggleShiftMutation]);

  const handleHandoverSubmit = useCallback((notes: string) => {
    logger.healthcare.info('Submitting shift handover', {
      notesLength: notes.length,
      hasNotes: !!notes.trim(),
    });
    
    // Update handover data in store
    setHandoverData({
      notes,
      activeAlertsCount: activeAlerts?.alerts?.length || 0,
    });
    
    toggleShiftMutation.mutate({
      isOnDuty: false,
      handoverNotes: notes,
    });
  }, [toggleShiftMutation, setHandoverData, activeAlerts]);

  // Check if user has hospital context
  if (!hospitalContext.hasValidHospital) {
    return (
      <Card style={{ backgroundColor: theme.muted }}>
        <VStack gap={3} p={spacing[4]} alignItems="center">
          <Symbol name="building.2.fill" size="lg" color={theme.mutedForeground} />
          <Text size="sm" colorTheme="mutedForeground" align="center">
            Select a hospital to manage your shift
          </Text>
        </VStack>
      </Card>
    );
  }

  const isLoading = statusLoading || staffLoading || alertsLoading;

  const content = (
    <VStack gap={3} style={{ maxWidth: isDesktop ? 600 : '100%' }}>
      {/* Stats */}
      <ShiftStats
        onDutyCount={onDutyStaff?.total || 0}
        totalAlerts={activeAlerts?.alerts?.length || 0}
        isLoading={isLoading}
      />

      {/* Main Content */}
      {showHandoverForm ? (
        <Animated.View entering={FadeIn}>
          <HealthcareErrorBoundary>
            <ShiftHandoverForm
              activeAlerts={(shiftStatus && 'activeAlertCount' in shiftStatus ? shiftStatus.activeAlertCount : 0) || 0}
              onSubmit={handleHandoverSubmit}
              onCancel={() => setShowHandoverForm(false)}
              isLoading={toggleShiftMutation.isPending}
            />
          </HealthcareErrorBoundary>
        </Animated.View>
      ) : (
        <ShiftStatusCard
          status={shiftStatus}
          onStartShift={handleStartShift}
          onEndShift={handleEndShift}
          isLoading={isLoading || toggleShiftMutation.isPending}
        />
      )}

      {/* Shift Rules */}
      {!showHandoverForm && (
        <Card style={{ backgroundColor: theme.muted + '50' }}>
          <VStack gap={2} p={spacing[3]}>
            <Text size="sm" weight="semibold" colorTheme="mutedForeground">
              Shift Rules
            </Text>
            <VStack gap={1}>
              <HStack gap={1} alignItems="center">
                <Symbol name="clock.arrow.circlepath" size="xs" color={theme.mutedForeground} />
                <Text size="xs" colorTheme="mutedForeground">
                  Maximum shift duration: {(shiftStatus && 'maxShiftDurationHours' in shiftStatus ? shiftStatus.maxShiftDurationHours : 24) || 24} hours
                </Text>
              </HStack>
              <HStack gap={1} alignItems="center">
                <Symbol name="bed.double.fill" size="xs" color={theme.mutedForeground} />
                <Text size="xs" colorTheme="mutedForeground">
                  Minimum break between shifts: {(shiftStatus && 'minBreakHours' in shiftStatus ? shiftStatus.minBreakHours : 8) || 8} hours
                </Text>
              </HStack>
              <HStack gap={1} alignItems="center">
                <Symbol name="doc.text.fill" size="xs" color={theme.mutedForeground} />
                <Text size="xs" colorTheme="mutedForeground">
                  Handover notes required when active alerts exist
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Card>
      )}
    </VStack>
  );

  if (embedded) {
    return content;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: spacing[4] as any,
      }}
    >
      {content}
    </ScrollView>
  );
}