import type { SpacingValue, ButtonVariant, BadgeVariant } from '@/types/components';
import React, { useState, useCallback } from 'react';
import { 
  ScrollView, 
  RefreshControl, 
  View, 
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInRight,
  Layout,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import {
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Box,
  Badge,
  Avatar,
  Skeleton,
  Alert,
  GlassCard,
  StatusGlassCard,
  Symbol,
  Heading2,
  Heading3,
  Separator,
} from '@/components/universal';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useAuth } from '@/lib/stores/auth-store';
import { api } from '@/lib/api/trpc';
import { format } from 'date-fns';
import { cn } from '@/lib/core/utils';
import { haptic } from '@/lib/ui/haptics';
import { AnimatedPageWrapper, pageEnteringAnimations } from '@/lib/navigation';
import { useLayoutTransition } from '@/hooks/useLayoutTransition';
import { DashboardGrid, Widget } from '@/components/universal/layout/WidgetGrid';
import { showSuccessAlert, showErrorAlert } from '@/lib/core/alert';
import { useShiftStore } from '@/lib/stores/shift-store';

interface HandoverNote {
  patientId: string;
  patientName: string;
  room: string;
  priority: 'high' | 'medium' | 'low';
  notes: string;
  medications: string[];
  alerts: number;
}

interface CriticalAlert {
  id: string;
  roomNumber: string;
  alertType: string;
  urgencyLevel: number;
  description: string;
  patientName?: string;
  createdAt: Date;
}

export default function ShiftHandoverScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { user } = useAuth();
  const utils = api.useUtils();
  const { setShiftStatus, clearHandoverData } = useShiftStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [handoverNotes, setHandoverNotes] = useState<HandoverNote[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [followUpItems, setFollowUpItems] = useState<string[]>([]);
  const [newFollowUp, setNewFollowUp] = useState('');
  
  // Page transition
  const { animatedStyle } = useLayoutTransition({ 
    type: 'glass', 
    duration: 400,
    hapticFeedback: true 
  });
  
  // Get shift summary from API
  const { data: shiftSummary, isLoading: isLoadingShift } = api.healthcare.getShiftSummary.useQuery();
  
  // Get active alerts
  const { data: activeAlerts } = api.healthcare.getActiveAlerts.useQuery({
    hospitalId: user?.defaultHospitalId || '',
  }, {
    enabled: !!user?.defaultHospitalId,
  });
  
  // End shift mutation
  const endShiftMutation = api.healthcare.endShift.useMutation({
    onSuccess: async () => {
      // Update shift store
      setShiftStatus({
        isOnDuty: false,
        shiftStartTime: null,
        shiftEndTime: new Date(),
      });
      clearHandoverData();
      
      // Invalidate shift status query to force refetch
      await utils.healthcare.getShiftStatus.invalidate();
      
      showSuccessAlert('Shift handover completed successfully');
      router.back();
    },
    onError: (error) => {
      showErrorAlert(error.message || 'Failed to submit handover');
    },
  });
  
  // Get on-duty staff for next shift
  const { data: onDutyStaff } = api.healthcare.getOnDutyStaff.useQuery({
    hospitalId: user?.defaultHospitalId || '',
  }, {
    enabled: !!user?.defaultHospitalId,
  });
  
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);
  
  const handleToggleAlert = useCallback((alertId: string) => {
    haptic('light');
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  }, []);
  
  const handleAddFollowUp = useCallback(() => {
    if (newFollowUp.trim()) {
      setFollowUpItems(prev => [...prev, newFollowUp.trim()]);
      setNewFollowUp('');
    }
  }, [newFollowUp]);
  
  const handleRemoveFollowUp = useCallback((index: number) => {
    setFollowUpItems(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const handleSubmitHandover = useCallback(async () => {
    haptic('medium');
    
    if (!additionalNotes.trim()) {
      showErrorAlert('Please add handover notes');
      return;
    }
    
    endShiftMutation.mutate({
      handoverNotes: additionalNotes.trim(),
      criticalAlerts: selectedAlerts,
      followUpRequired: followUpItems,
    });
  }, [additionalNotes, selectedAlerts, followUpItems, endShiftMutation]);
  
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Shift Handover',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      
      <AnimatedPageWrapper entering={pageEnteringAnimations.slideInUp} style={animatedStyle}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 , paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                />
              }
            >
              <DashboardGrid>
                {/* Shift Summary */}
                <Widget size="full">
                  <Animated.View entering={FadeInDown.delay(100)}>
                    <StatusGlassCard>
                      <Box p={4 as any}>
                        <VStack gap={3 as any}>
                          <HStack justifyContent="between" alignItems="center">
                            <VStack gap={1 as any}>
                              <Heading2>Shift Summary</Heading2>
                              <Text size="sm" color="muted">
                                {shiftSummary?.shiftStart 
                                  ? `Started ${format(new Date(shiftSummary.shiftStart), 'h:mm a')} • ${Math.floor(shiftSummary.shiftDuration / 60)}h ${shiftSummary.shiftDuration % 60}m`
                                  : 'No active shift'}
                              </Text>
                            </VStack>
                            <Badge variant="secondary" size="default">
                              <Text>{user?.role === 'nurse' ? 'Nurse' : 'Doctor'}</Text>
                            </Badge>
                          </HStack>
                          
                          <Separator />
                          
                          <HStack gap={3 as any} flexWrap="wrap">
                            <VStack gap={1 as any} minWidth={100}>
                              <Text size="xs" color="muted">Total Alerts</Text>
                              <Text size="2xl" weight="bold">{shiftSummary?.totalAlerts || 0}</Text>
                            </VStack>
                            <VStack gap={1 as any} minWidth={100}>
                              <Text size="xs" color="muted">Active Alerts</Text>
                              <Text size="2xl" weight="bold" color={theme.destructive}>
                                {shiftSummary?.activeAlerts || 0}
                              </Text>
                            </VStack>
                            <VStack gap={1 as any} minWidth={100}>
                              <Text size="xs" color="muted">Handled</Text>
                              <Text size="2xl" weight="bold" color={theme.success}>
                                {shiftSummary?.alertsHandled || 0}
                              </Text>
                            </VStack>
                            <VStack gap={1 as any} minWidth={100}>
                              <Text size="xs" color="muted">Duration</Text>
                              <Text size="2xl" weight="bold" color={theme.warning}>
                                {shiftSummary ? `${Math.floor(shiftSummary.shiftDuration / 60)}h` : '0h'}
                              </Text>
                            </VStack>
                          </HStack>
                        </VStack>
                      </Box>
                    </StatusGlassCard>
                  </Animated.View>
                </Widget>
                
                {/* Next Shift Staff */}
                <Widget size="full">
                  <Animated.View entering={FadeInDown.delay(200)}>
                    <GlassCard>
                      <Box p={4 as any}>
                        <VStack gap={3 as any}>
                          <Heading3>Current On-Duty Staff</Heading3>
                          {onDutyStaff && onDutyStaff.staff.length > 0 ? (
                            <VStack gap={2 as any}>
                              {onDutyStaff.staff.map((staff, index) => (
                                <Animated.View 
                                  key={staff.id}
                                  entering={SlideInRight.delay(250 + index * 50)}
                                >
                                  <HStack gap={3 as any} alignItems="center">
                                    <Avatar
                                      size="default"
                                      name={staff.name || staff.email}
                                      source={staff.image ? { uri: staff.image } : undefined}
                                    />
                                    <VStack gap={1 as any} style={{ flex: 1 }}>
                                      <Text weight="medium">{staff.name || 'Unknown'}</Text>
                                      <Text size="sm" color="muted">{staff.department || staff.role}</Text>
                                    </VStack>
                                    <Badge variant="outline"><Text>{staff.role}</Text></Badge>
                                  </HStack>
                                </Animated.View>
                              ))}
                            </VStack>
                          ) : (
                            <Text size="sm" color="muted">No other staff currently on duty</Text>
                          )}
                        </VStack>
                      </Box>
                    </GlassCard>
                  </Animated.View>
                </Widget>
                
                {/* Active Alerts for Handover */}
                <Widget size="full">
                  <Animated.View entering={FadeInDown.delay(300)}>
                    <VStack gap={3 as any}>
                      <HStack justifyContent="between" alignItems="center">
                        <Heading3>Active Alerts for Handover</Heading3>
                        <Text size="sm" color="muted">
                          {selectedAlerts.length} selected
                        </Text>
                      </HStack>
                      
                      <VStack gap={2 as any}>
                        {activeAlerts && activeAlerts.alerts.length > 0 ? (
                          activeAlerts.alerts.map((alert, index) => (
                          <Animated.View 
                            key={alert.id}
                            entering={SlideInRight.delay(350 + index * 50)}
                            layout={Layout.springify()}
                          >
                            <Pressable
                              onPress={() => handleToggleAlert(alert.id)}
                            >
                              <GlassCard
                                style={[
                                  selectedAlerts.includes(alert.id) && {
                                    borderColor: theme.primary,
                                    borderWidth: 2,
                                  }
                                ] as any}
                              >
                                <Box p={3 as any}>
                                  <HStack gap={3 as any} alignItems="flex-start">
                                    <Box
                                      style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        backgroundColor: selectedAlerts.includes(alert.id)
                                          ? theme.primary
                                          : theme.border,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {selectedAlerts.includes(alert.id) && (
                                        <Symbol name="checkmark" size={16} color="white" />
                                      )}
                                    </Box>
                                    
                                    <VStack gap={2 as any} style={{ flex: 1 }}>
                                      <HStack justifyContent="between" alignItems="flex-start">
                                        <VStack gap={1 as any}>
                                          <Text weight="semibold">{alert.alertType.replace(/_/g, ' ').toUpperCase()}</Text>
                                          <HStack gap={2 as any} alignItems="center">
                                            <Badge variant="secondary" size="sm">
                                              <Text size="sm">Room {alert.roomNumber}</Text>
                                            </Badge>
                                            <Badge 
                                              variant="outline" 
                                              size="sm"
                                              style={{ 
                                                borderColor: alert.urgencyLevel >= 4 ? theme.destructive : alert.urgencyLevel >= 3 ? theme.warning : theme.success,
                                                backgroundColor: (alert.urgencyLevel >= 4 ? theme.destructive : alert.urgencyLevel >= 3 ? theme.warning : theme.success) + '10',
                                              }}
                                            >
                                              <Text size="xs" style={{ color: alert.urgencyLevel >= 4 ? theme.destructive : alert.urgencyLevel >= 3 ? theme.warning : theme.success }}>
                                                Level {alert.urgencyLevel}
                                              </Text>
                                            </Badge>
                                            {alert.status === 'acknowledged' && (
                                              <Badge variant="default" size="sm">
                                                <Text size="sm">Acknowledged</Text>
                                              </Badge>
                                            )}
                                          </HStack>
                                        </VStack>
                                      </HStack>
                                      
                                      <Text size="sm" color="foreground">
                                        {alert.description || 'No description'}
                                      </Text>
                                      
                                      {alert.patientName && (
                                        <HStack gap={2 as any}>
                                          <Text size="xs" color="muted">Patient:</Text>
                                          <Text size="xs" weight="medium">{alert.patientName}</Text>
                                        </HStack>
                                      )}
                                      
                                      <Text size="xs" color="muted">
                                        Created {format(new Date(alert.createdAt), 'h:mm a')}
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </Box>
                              </GlassCard>
                            </Pressable>
                          </Animated.View>
                        ))
                        ) : (
                          <Alert variant="warning">
                            <Text size="sm">No active alerts to handover</Text>
                          </Alert>
                        )}
                      </VStack>
                    </VStack>
                  </Animated.View>
                </Widget>
                
                {/* Additional Notes */}
                <Widget size="full">
                  <Animated.View entering={FadeInDown.delay(400)}>
                    <GlassCard>
                      <Box p={4 as any}>
                        <VStack gap={3 as any}>
                          <Heading3>Handover Notes</Heading3>
                          <View
                            style={{
                              borderWidth: 1,
                              borderColor: theme.border,
                              borderRadius: 8,
                              padding: spacing[3] as any,
                              minHeight: 120,
                              backgroundColor: theme.background,
                            }}
                          >
                            <TextInput
                              value={additionalNotes}
                              onChangeText={setAdditionalNotes}
                              placeholder="Add important information for the incoming shift..."
                              placeholderTextColor={theme.mutedForeground}
                              multiline
                              style={{
                                color: theme.foreground,
                                fontSize: 14,
                                lineHeight: 20,
                              }}
                            />
                          </View>
                        </VStack>
                      </Box>
                    </GlassCard>
                  </Animated.View>
                </Widget>
                
                {/* Follow-up Items */}
                <Widget size="full">
                  <Animated.View entering={FadeInDown.delay(450)}>
                    <GlassCard>
                      <Box p={4 as any}>
                        <VStack gap={3 as any}>
                          <Heading3>Follow-up Required</Heading3>
                          <VStack gap={2 as any}>
                            {followUpItems.map((item, index) => (
                              <HStack key={index} gap={2 as any} alignItems="center">
                                <Symbol name="checkmark.circle" size={16} color={theme.primary} />
                                <Text size="sm" style={{ flex: 1 }}>{item}</Text>
                                <Pressable onPress={() => handleRemoveFollowUp(index)}>
                                  <Symbol name="xmark.circle.fill" size={20} color={theme.mutedForeground} />
                                </Pressable>
                              </HStack>
                            ))}
                          </VStack>
                          <HStack gap={2 as any}>
                            <TextInput
                              value={newFollowUp}
                              onChangeText={setNewFollowUp}
                              placeholder="Add follow-up item..."
                              placeholderTextColor={theme.mutedForeground}
                              style={{
                                flex: 1,
                                borderWidth: 1,
                                borderColor: theme.border,
                                borderRadius: 8,
                                padding: spacing[2] as any,
                                color: theme.foreground,
                                fontSize: 14,
                              }}
                              onSubmitEditing={handleAddFollowUp}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={handleAddFollowUp}
                              disabled={!newFollowUp.trim()}
                            >
                              Add
                            </Button>
                          </HStack>
                        </VStack>
                      </Box>
                    </GlassCard>
                  </Animated.View>
                </Widget>
                
                {/* Submit Button */}
                <Widget size="full">
                  <Animated.View entering={FadeInDown.delay(500)}>
                    <VStack gap={2 as any}>
                      {!shiftSummary && (
                        <Alert variant="warning">
                          <Text size="sm">No active shift found. Please start a shift first.</Text>
                        </Alert>
                      )}
                      <Button
                        size="default"
                        onPress={handleSubmitHandover}
                        disabled={!additionalNotes.trim() || endShiftMutation.isPending || !shiftSummary}
                        isLoading={endShiftMutation.isPending}
                      >
                        <HStack gap={2 as any} alignItems="center">
                          <Symbol name="checkmark.circle.fill" size={20} color="white" />
                          <Text weight="semibold" color="white">
                            Complete Shift Handover
                          </Text>
                        </HStack>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        onPress={() => router.back()}
                      >
                        Cancel
                      </Button>
                    </VStack>
                  </Animated.View>
                </Widget>
              </DashboardGrid>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </AnimatedPageWrapper>
    </>
  );
}