import React from 'react';
import { ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/theme/provider';
import { api } from '@/lib/api/trpc';
import {
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Box,
  Badge,
  Skeleton,
} from '@/components/universal';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useShadow } from '@/hooks/useShadow';
import { haptic } from '@/lib/ui/haptics';
import { showErrorAlert, showSuccessAlert } from '@/lib/core/alert';
import { format } from 'date-fns';
import { Symbol } from '@/components/universal/display/Symbols';
import { EscalationTimeline } from '@/components/blocks/healthcare/alerts/EscalationTimeline';
import { AlertAcknowledgeDialog } from '@/components/blocks/healthcare/alerts/AlertAcknowledgeDialog';
import { useAlertWebSocket } from '@/hooks/healthcare/useAlertWebSocket';
import type { Alert } from '@/types/alert';

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const shadowMd = useShadow({ size: 'md' });
  const [showAcknowledgeDialog, setShowAcknowledgeDialog] = React.useState(false);
  
  const role = user?.role;
  
  const { data: alert, isLoading, refetch } = api.healthcare.getAlert.useQuery(
    { alertId: id as string },
    { enabled: !!id }
  );
  
  // Subscribe to WebSocket updates for this alert
  useAlertWebSocket({
    hospitalId: alert?.hospitalId || '',
    enabled: !!alert?.hospitalId && alert?.status === 'active',
    onAlertEscalated: (event) => {
      if (event.alertId === id) {
        refetch(); // Refetch alert data when escalation happens
      }
    },
    onAlertAcknowledged: (event) => {
      if (event.alertId === id) {
        refetch();
      }
    },
    onAlertResolved: (event) => {
      if (event.alertId === id) {
        refetch();
      }
    },
    showNotifications: false, // Don't show notifications on details page
  });
  
  const acknowledgeMutation = api.healthcare.acknowledgeAlert.useMutation({
    onSuccess: () => {
      showSuccessAlert('Alert Acknowledged', 'You have acknowledged this alert');
      refetch();
    },
    onError: () => {
      showErrorAlert('Failed to acknowledge', 'Please try again');
    },
  });
  
  const resolveMutation = api.healthcare.resolveAlert.useMutation({
    onSuccess: () => {
      showSuccessAlert('Alert Resolved', 'The alert has been resolved');
      refetch();
    },
    onError: () => {
      showErrorAlert('Failed to resolve', 'Please try again');
    },
  });
  
  const handleAcknowledge = async (data: Parameters<typeof acknowledgeMutation.mutateAsync>[0]) => {
    await acknowledgeMutation.mutateAsync(data);
  };
  
  const handleOpenAcknowledgeDialog = () => {
    haptic('medium');
    setShowAcknowledgeDialog(true);
  };
  
  const handleResolve = () => {
    haptic('medium');
    resolveMutation.mutate({ 
      alertId: id as string,
      resolution: 'Resolved by healthcare staff',
    });
  };
  
  if (isLoading) {
    return (
      <Container>
        <VStack p={4} gap={4 as any}>
          <Skeleton height={200} />
          <Skeleton height={100} />
          <Skeleton height={100} />
        </VStack>
      </Container>
    );
  }
  
  if (!alert) {
    return (
      <Container>
        <VStack p={4} gap={4 as any} alignItems="center" justifyContent="center" style={{ flex: 1 }}>
          <Text size="base">Alert not found</Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </VStack>
      </Container>
    );
  }
  
  const urgencyColor = {
    1: 'secondary',
    2: 'warning', 
    3: 'destructive',
  }[alert.urgencyLevel] || 'secondary';
  
  const content = (
    <VStack gap={4 as any}>
      {/* Header */}
      <HStack alignItems="center" gap={2 as any}>
        <Button
          onPress={() => router.back()}
          variant="ghost"
          size="icon"
        >
          <Symbol name="chevron.left" size={24} />
        </Button>
        <Text size="xl" weight="bold">Alert Details</Text>
      </HStack>
      
      {/* Alert Info */}
      <Card style={shadowMd}>
        <Box p={4 as any}>
          <VStack gap={3 as any}>
            <HStack justifyContent="space-between" alignItems="flex-start">
              <VStack gap={1 as any}>
                <Text size="base" weight="bold">Room {alert.roomNumber}</Text>
                <Text colorTheme="mutedForeground">{alert.alertType}</Text>
              </VStack>
              <Badge variant={urgencyColor as any} size="sm">
                <Text size="sm">Level {alert.urgencyLevel}</Text>
              </Badge>
            </HStack>
            
            <Text>{alert.description}</Text>
            
            <HStack gap={4 as any}>
              <HStack gap={1 as any} alignItems="center">
                <Symbol name="clock" size={16} color={theme.mutedForeground} />
                <Text size="sm" colorTheme="mutedForeground">
                  {format(new Date(alert.createdAt), 'MMM d, h:mm a')}
                </Text>
              </HStack>
              {alert.createdBy && (
                <HStack gap={1 as any} alignItems="center">
                  <Symbol name="person" size={16} color={theme.mutedForeground} />
                  <Text size="sm" colorTheme="mutedForeground">
                    {alert.createdBy}
                  </Text>
                </HStack>
              )}
            </HStack>
            
            {/* Status */}
            <HStack gap={2 as any}>
              {alert.acknowledgedAt && (
                <Badge variant="outline">
                  <Text size="sm">Acknowledged by {alert.acknowledgedBy}</Text>
                </Badge>
              )}
              {alert.resolvedAt && (
                <Badge variant="success">
                  <Text size="sm">Resolved by {alert.resolvedBy}</Text>
                </Badge>
              )}
              {!alert.acknowledgedAt && !alert.resolvedAt && (
                <Badge variant="error">
                  <Text size="sm">Active</Text>
                </Badge>
              )}
            </HStack>
          </VStack>
        </Box>
      </Card>
      
      {/* Escalation Timeline */}
      {alert.status === 'active' && alert.currentEscalationTier && (
        <Card style={shadowMd}>
          <Box p={4 as any}>
            <EscalationTimeline
              alert={{
                ...alert,
                id: alert.id,
                alertType: alert.alertType,
                urgencyLevel: alert.urgencyLevel,
                roomNumber: alert.roomNumber,
                patientId: alert.patientId || '',
                description: alert.description,
                status: alert.status as 'active' | 'acknowledged' | 'resolved',
                hospitalId: alert.hospitalId,
                createdAt: new Date(alert.createdAt),
                createdBy: alert.createdBy || '',
                acknowledgedBy: alert.acknowledgedBy || undefined,
                acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
                resolvedBy: alert.resolvedBy || undefined,
                resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined,
                currentEscalationTier: alert.currentEscalationTier,
                nextEscalationAt: alert.nextEscalationAt ? new Date(alert.nextEscalationAt) : null,
                targetDepartment: alert.targetDepartment || undefined,
              }}
              escalations={alert.escalations?.map(esc => ({
                ...esc,
                escalatedAt: new Date(esc.escalatedAt),
              })) || []}
              currentTier={alert.currentEscalationTier}
              nextEscalationAt={alert.nextEscalationAt ? new Date(alert.nextEscalationAt) : null}
            />
          </Box>
        </Card>
      )}
      
      {/* Patient Info */}
      {alert.patientId && (
        <Card style={shadowMd}>
          <Box p={4 as any}>
            <VStack gap={3 as any}>
              <Text weight="semibold">Patient Information</Text>
              <VStack gap={2 as any}>
                <HStack justifyContent="space-between">
                  <Text colorTheme="mutedForeground">Patient ID</Text>
                  <Text>{alert.patientId}</Text>
                </HStack>
              </VStack>
            </VStack>
          </Box>
        </Card>
      )}
      
      {/* Actions */}
      {!alert.resolvedAt && (
        <VStack gap={2 as any}>
          {!alert.acknowledgedAt && (role === 'doctor' || role === 'nurse' || role === 'head_doctor') && (
            <Button
              onPress={handleOpenAcknowledgeDialog}
              variant="outline"
              fullWidth
            >
              Acknowledge Alert
            </Button>
          )}
          {alert.acknowledgedAt && (role === 'doctor' || role === 'head_doctor') && (
            <Button
              onPress={handleResolve}
              variant="default"
              fullWidth
              isLoading={resolveMutation.isPending}
            >
              Resolve Alert
            </Button>
          )}
        </VStack>
      )}
      
      {/* Urgency Level Info */}
      {alert.urgencyLevel && alert.urgencyLevel >= 3 && (
        <Card style={shadowMd}>
          <Box p={4 as any}>
            <VStack gap={2 as any}>
              <HStack gap={2 as any} alignItems="center">
                <Symbol name="exclamationmark.circle" size={20} color={theme.destructive} />
                <Text weight="semibold">High Priority Alert</Text>
              </HStack>
              <Text colorTheme="mutedForeground">
                This is a critical level {alert.urgencyLevel} alert requiring immediate attention
              </Text>
            </VStack>
          </Box>
        </Card>
      )}
      
      {/* Acknowledge Dialog */}
      {alert && (
        <AlertAcknowledgeDialog
          isOpen={showAcknowledgeDialog}
          onClose={() => setShowAcknowledgeDialog(false)}
          alert={alert}
          onAcknowledge={handleAcknowledge}
          isLoading={acknowledgeMutation.isPending}
        />
      )}
    </VStack>
  );
  
  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing[4] as any, paddingBottom: spacing[6] as any }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  return (
    <Container>
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