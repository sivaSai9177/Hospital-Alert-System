import React from 'react';
import { ScrollView, RefreshControl, View, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack as RouterStack } from 'expo-router';
import {
  Container,
  Card,
  Text,
  Button,
  Badge,
  Progress,
  HStack,
  VStack,
  Separator,
  Symbol,
  Avatar,
  GlassCard,
  Box,
  Grid,
  GridItem,
} from '@/components/universal';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { format } from 'date-fns';
import { api } from '@/lib/api/trpc';
import { useAuthStore } from '@/lib/stores/auth-store';
import { LoadingView } from '@/components/universal/feedback';
import { showSuccessAlert, showErrorAlert } from '@/lib/core/alert';
import { haptic } from '@/lib/ui/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/responsive';
import { log } from '@/lib/core/debug/unified-logger';

interface EscalationTier {
  tier: number;
  name: string;
  roles: string[];
  responseTime: number; // in seconds
  notificationMethod: string[];
  members: {
    id: string;
    name: string;
    role: string;
    status: 'available' | 'busy' | 'offline';
    avatar?: string;
  }[];
}

interface EscalationEvent {
  id: string;
  timestamp: Date;
  fromTier: number;
  toTier: number;
  reason: string;
  automatic: boolean;
}

export default function EscalationDetailsModal() {
  const { alertId } = useLocalSearchParams<{ alertId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { user } = useAuthStore();
  const { isDesktop } = useResponsive();
  const [refreshing, setRefreshing] = React.useState(false);
  
  log.info('EscalationDetailsModal rendering', 'ESCALATION_DETAILS', { alertId });

  // Fetch escalation status
  const { data: escalationStatus, refetch: refetchStatus } = api.healthcare.getEscalationStatus.useQuery({
    alertId: alertId || '',
  }, {
    enabled: !!alertId,
  });

  // Fetch escalation history
  const { data: escalationHistoryData, isLoading, refetch: refetchHistory } = api.healthcare.getEscalationHistory.useQuery({
    alertId: alertId || '',
  }, {
    enabled: !!alertId,
  });

  // Trigger manual escalation mutation
  const triggerEscalationMutation = api.healthcare.triggerEscalation.useMutation({
    onSuccess: () => {
      haptic('success');
      showSuccessAlert('Escalation Triggered', 'Alert has been escalated to the next tier.');
      refetchStatus();
      refetchHistory();
    },
    onError: (error) => {
      haptic('error');
      showErrorAlert('Escalation Failed', error.message || 'Failed to trigger escalation.');
    },
  });

  // Get current tier and timing from escalation status
  const currentTier = escalationStatus?.currentTier || 1;
  const timeToNextEscalation = escalationStatus?.timeToNextEscalation 
    ? Math.max(0, Math.floor(escalationStatus.timeToNextEscalation / 1000)) 
    : 180;
  const totalEscalationTime = 300; // 5 minutes default

  const escalationTiers: EscalationTier[] = [
    {
      tier: 1,
      name: 'First Responders',
      roles: ['Nurse', 'Junior Doctor'],
      responseTime: 300,
      notificationMethod: ['Push Notification', 'In-App Alert'],
      members: [
        { id: '1', name: 'Sarah Johnson', role: 'Nurse', status: 'available' },
        { id: '2', name: 'Mike Wilson', role: 'Nurse', status: 'busy' },
        { id: '3', name: 'Dr. Emily Davis', role: 'Junior Doctor', status: 'available' },
      ],
    },
    {
      tier: 2,
      name: 'Senior Medical Staff',
      roles: ['Senior Doctor', 'Head Nurse'],
      responseTime: 300,
      notificationMethod: ['Push Notification', 'SMS', 'Phone Call'],
      members: [
        { id: '4', name: 'Dr. Michael Chen', role: 'Senior Doctor', status: 'available' },
        { id: '5', name: 'Patricia Moore', role: 'Head Nurse', status: 'available' },
        { id: '6', name: 'Dr. James Taylor', role: 'Senior Doctor', status: 'offline' },
      ],
    },
    {
      tier: 3,
      name: 'Department Heads',
      roles: ['Department Head', 'Medical Director'],
      responseTime: 600,
      notificationMethod: ['Phone Call', 'SMS', 'Email'],
      members: [
        { id: '7', name: 'Dr. Robert Anderson', role: 'Department Head', status: 'available' },
        { id: '8', name: 'Dr. Lisa Thompson', role: 'Medical Director', status: 'busy' },
      ],
    },
  ];

  // Transform escalation history data
  const escalationHistory: EscalationEvent[] = React.useMemo(() => {
    if (!escalationHistoryData?.escalations) {
      return [
        {
          id: '1',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          fromTier: 0,
          toTier: 1,
          reason: 'Alert created',
          automatic: false,
        },
      ];
    }

    return escalationHistoryData.escalations.map((esc) => ({
      id: esc.escalation.id,
      timestamp: new Date(esc.escalation.escalatedAt),
      fromTier: esc.escalation.from_tier || 0,
      toTier: esc.escalation.to_tier,
      reason: esc.escalation.reason || 'No response received',
      automatic: !esc.escalation.manual,
    }));
  }, [escalationHistoryData]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStatus(), refetchHistory()]);
    setRefreshing(false);
  }, [refetchStatus, refetchHistory]);

  const handleManualEscalate = () => {
    if (!alertId) return;
    triggerEscalationMutation.mutate({ alertId });
  };

  const getStatusColor = (status: 'available' | 'busy' | 'offline') => {
    switch (status) {
      case 'available':
        return theme.success;
      case 'busy':
        return theme.destructive;
      case 'offline':
        return theme.muted;
    }
  };

  const progress = (totalEscalationTime - timeToNextEscalation) / totalEscalationTime;

  if (isLoading && !refreshing) {
    return <LoadingView message="Loading escalation details..." />;
  }

  const content = (
    <VStack gap={spacing[4]}>
      {/* Header */}
      <HStack justifyContent="space-between" alignItems="center">
        <VStack>
          <Text size="2xl" weight="bold">Escalation Details</Text>
          <Text size="sm" colorTheme="mutedForeground">Alert ID: {alertId}</Text>
        </VStack>
        <Button
          onPress={() => router.back()}
          variant="ghost"
          size="icon"
        >
          <Symbol name="xmark" size={24} />
        </Button>
      </HStack>
      
      {/* Current Status */}
      <GlassCard>
        <Box p={4}>
          <VStack gap={spacing[3]}>
            <HStack justifyContent="space-between" alignItems="flex-start">
              <VStack gap={spacing[1]}>
                <Text size="lg" weight="semibold">Current Escalation Status</Text>
                <Badge variant="destructive" size="md">Tier {currentTier}</Badge>
              </VStack>
              <VStack gap={spacing[1]} alignItems="flex-end">
                <Text size="lg" weight="semibold" style={{ color: theme.destructive }}>
                  {Math.floor(timeToNextEscalation / 60)}:{(timeToNextEscalation % 60).toString().padStart(2, '0')}
                </Text>
                <Text size="xs" colorTheme="mutedForeground">Until Tier {currentTier + 1}</Text>
              </VStack>
            </HStack>

            <Progress value={progress * 100} />
            
            <Text size="sm" colorTheme="mutedForeground">
              Alert will automatically escalate to Tier {currentTier + 1} if no response is received
            </Text>

            <Button
              onPress={handleManualEscalate}
              variant="destructive"
              size="default"
              isLoading={triggerEscalationMutation.isPending}
              disabled={triggerEscalationMutation.isPending || currentTier >= 3}
              fullWidth
            >
              <HStack gap={spacing[2]} alignItems="center">
                <Symbol name="arrow.up.circle.fill" size={20} color="white" />
                <Text style={{ color: 'white' }}>Escalate Now</Text>
              </HStack>
            </Button>
          </VStack>
        </Box>
      </GlassCard>

      {/* Escalation Tiers */}
      <VStack gap={spacing[3]}>
        <Text size="lg" weight="semibold">Escalation Tiers</Text>
        <Grid columns={isDesktop ? 3 : 1} gap={3}>
          {escalationTiers.map((tier) => (
            <GridItem key={tier.tier} span={1}>
              <GlassCard
                style={tier.tier === currentTier ? {
                  borderColor: theme.primary,
                  borderWidth: 2,
                } : {}}
              >
                <Box p={3}>
                  <VStack gap={spacing[3]}>
                    <HStack justifyContent="space-between" alignItems="flex-start">
                      <VStack gap={spacing[1]}>
                        <HStack gap={spacing[2]} alignItems="center">
                          <Badge
                            variant={tier.tier === currentTier ? 'default' : 'secondary'}
                            size="sm"
                          >
                            Tier {tier.tier}
                          </Badge>
                          <Text weight="semibold">{tier.name}</Text>
                        </HStack>
                        <Text size="sm" colorTheme="mutedForeground">
                          Response time: {tier.responseTime / 60} minutes
                        </Text>
                      </VStack>
                      {tier.tier === currentTier && (
                        <Badge variant="default" size="sm">Current</Badge>
                      )}
                    </HStack>

                    <Separator />

                    {/* Roles */}
                    <VStack gap={spacing[1]}>
                      <Text size="sm" weight="medium">Notified Roles:</Text>
                      <HStack gap={spacing[1]} flexWrap="wrap">
                        {tier.roles.map((role, index) => (
                          <Badge key={index} variant="outline" size="sm">
                            {role}
                          </Badge>
                        ))}
                      </HStack>
                    </VStack>

                    {/* Notification Methods */}
                    <VStack gap={spacing[1]}>
                      <Text size="sm" weight="medium">Notification Methods:</Text>
                      <VStack gap={spacing[1]}>
                        {tier.notificationMethod.map((method, index) => (
                          <HStack key={index} gap={spacing[1]} alignItems="center">
                            <Symbol
                              name={
                                method === 'Push Notification' ? 'bell.fill' :
                                method === 'SMS' ? 'message.fill' :
                                method === 'Phone Call' ? 'phone.fill' :
                                'envelope.fill'
                              }
                              size={14}
                              color={theme.mutedForeground}
                            />
                            <Text size="xs" colorTheme="mutedForeground">{method}</Text>
                          </HStack>
                        ))}
                      </VStack>
                    </VStack>

                    {/* Team Members */}
                    <VStack gap={spacing[2]}>
                      <Text size="sm" weight="medium">Team Members ({tier.members.length}):</Text>
                      <VStack gap={spacing[2]}>
                        {tier.members.map((member) => (
                          <HStack key={member.id} gap={spacing[2]} alignItems="center">
                            <Avatar
                              name={member.name}
                              size="sm"
                            />
                            <VStack gap={spacing[0]} style={{ flex: 1 }}>
                              <Text size="sm">{member.name}</Text>
                              <Text size="xs" colorTheme="mutedForeground">{member.role}</Text>
                            </VStack>
                            <HStack gap={spacing[1]} alignItems="center">
                              <View
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: getStatusColor(member.status),
                                }}
                              />
                              <Text size="xs" colorTheme="mutedForeground">{member.status}</Text>
                            </HStack>
                          </HStack>
                        ))}
                      </VStack>
                    </VStack>
                  </VStack>
                </Box>
              </GlassCard>
            </GridItem>
          ))}
        </Grid>
      </VStack>

      {/* Escalation History */}
      <GlassCard>
        <Box p={4}>
          <VStack gap={spacing[3]}>
            <Text size="lg" weight="semibold">Escalation History</Text>
            <Separator />
            
            <VStack gap={spacing[3]}>
              {escalationHistory.map((event, index) => (
                <HStack key={event.id} gap={spacing[3]} alignItems="flex-start">
                  <View style={{ paddingTop: spacing[1] }}>
                    <Symbol
                      name="arrow.up.circle.fill"
                      size={20}
                      color={event.automatic ? theme.destructive : theme.primary}
                    />
                  </View>
                  
                  <VStack gap={spacing[1]} style={{ flex: 1 }}>
                    <HStack justifyContent="space-between">
                      <Text size="sm" weight="medium">
                        Escalated to Tier {event.toTier}
                      </Text>
                      <Text size="xs" colorTheme="mutedForeground">
                        {format(event.timestamp, 'HH:mm:ss')}
                      </Text>
                    </HStack>
                    
                    <Text size="xs" colorTheme="mutedForeground">
                      {event.reason}
                    </Text>
                    
                    {event.automatic && (
                      <Badge variant="outline" size="sm">
                        Automatic
                      </Badge>
                    )}
                  </VStack>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Box>
      </GlassCard>

      {/* Actions */}
      <Card>
        <Box p={4}>
          <VStack gap={spacing[3]}>
            <Text size="base" weight="medium">Escalation Actions</Text>
            <VStack gap={spacing[2]}>
              <Button
                variant="outline"
                size="default"
                fullWidth
                onPress={() => log.info('Pause escalation clicked', 'ESCALATION_DETAILS')}
              >
                Pause Escalation
              </Button>
              <Button
                variant="outline"
                size="default"
                fullWidth
                onPress={() => log.info('Skip to tier clicked', 'ESCALATION_DETAILS')}
              >
                Skip to Specific Tier
              </Button>
              <Button
                variant="outline"
                size="default"
                fullWidth
                onPress={() => log.info('Notify additional staff clicked', 'ESCALATION_DETAILS')}
              >
                Notify Additional Staff
              </Button>
            </VStack>
          </VStack>
        </Box>
      </Card>
    </VStack>
  );
  
  return (
    <>
      <RouterStack.Screen
        options={{
          title: 'Escalation Details',
          presentation: 'modal',
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
      </SafeAreaView>
    </>
  );
}