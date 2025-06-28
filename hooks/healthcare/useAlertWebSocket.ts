import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { api } from '@/lib/api/trpc';
import { log } from '@/lib/core/debug/logger';
import { showSuccessAlert } from '@/lib/core/alert';
import { alertEventQueue } from '@/lib/websocket/event-queue';
import { alertWebSocketManager, type ConnectionState } from '@/lib/websocket/connection-manager';
import { useEventQueueCleanup } from '@/hooks/useEventQueueCleanup';
import type { AppRouter } from '@/src/server/routers';
import type { AlertWebSocketEvent } from '@/types/alert';

// Type for the alert event from subscription
// For now, we'll use a more direct type definition
type AlertSubscriptionEvent = {
  id: string;
  type: 'alert.created' | 'alert.acknowledged' | 'alert.resolved' | 'alert.escalated' | 'alert.updated';
  alertId: string;
  hospitalId: string;
  timestamp: string;
  data?: {
    roomNumber?: string;
    alertType?: string;
    urgencyLevel?: number;
    toTier?: number;
    acknowledgedBy?: string;
    resolvedBy?: string;
  };
};

// Type guard to validate alert event structure
function isValidAlertEvent(event: any): event is AlertSubscriptionEvent {
  return event && 
    typeof event === 'object' && 
    'type' in event &&
    typeof event.type === 'string';
}

interface UseAlertWebSocketOptions {
  hospitalId: string;
  enabled?: boolean;
  onAlertCreated?: (event: AlertSubscriptionEvent) => void;
  onAlertAcknowledged?: (event: AlertSubscriptionEvent) => void;
  onAlertResolved?: (event: AlertSubscriptionEvent) => void;
  onAlertEscalated?: (event: AlertSubscriptionEvent) => void;
  showNotifications?: boolean;
  fallbackToPolling?: boolean;
  pollingInterval?: number;
}

export function useAlertWebSocket({
  hospitalId,
  enabled = true,
  onAlertCreated,
  onAlertAcknowledged,
  onAlertResolved,
  onAlertEscalated,
  showNotifications = true,
  fallbackToPolling = true,
  pollingInterval = 5000,
}: UseAlertWebSocketOptions) {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<ConnectionState>(alertWebSocketManager.getState());
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Handle incoming alert events
  const handleEvent = useCallback(async (event: AlertSubscriptionEvent) => {
    // Validate event exists and has correct structure
    if (!isValidAlertEvent(event)) {
      log.error('Received invalid event structure', 'ALERT_WS', { event });
      return;
    }

    log.info('Alert event received via WebSocket', 'ALERT_WS', {
      type: event.type,
      alertId: event.alertId,
      hospitalId: event.hospitalId,
      hasData: !!event.data,
      timestamp: event.timestamp,
    });

    // Add event to queue for reliable processing
    // Convert timestamp string to Date
    const webSocketEvent: AlertWebSocketEvent = {
      ...event,
      timestamp: new Date(event.timestamp),
    };
    await alertEventQueue.enqueue(webSocketEvent);

    // Invalidate relevant queries to trigger refetch
    queryClient.invalidateQueries({
      queryKey: [['healthcare', 'getActiveAlerts'], { input: { hospitalId } }],
    });

    // Also invalidate specific alert queries if alertId exists
    if (event.alertId) {
      queryClient.invalidateQueries({
        queryKey: [['healthcare', 'getEscalationStatus'], { input: { alertId: event.alertId } }],
      });
    }

    // Show notifications if enabled
    if (showNotifications && event.type) {
      switch (event.type) {
        case 'alert.created':
          showSuccessAlert('New Alert', `New alert in room ${event.data?.roomNumber || 'Unknown'}`);
          break;
        case 'alert.acknowledged':
          showSuccessAlert('Alert Acknowledged', 'An alert has been acknowledged');
          break;
        case 'alert.escalated':
          showSuccessAlert('Alert Escalated', `Alert escalated to tier ${event.data?.toTier || 'Unknown'}`);
          break;
      }
    }

    // Call specific handlers
    switch (event.type) {
      case 'alert.created':
        onAlertCreated?.(event);
        break;
      case 'alert.acknowledged':
        onAlertAcknowledged?.(event);
        break;
      case 'alert.resolved':
        onAlertResolved?.(event);
        break;
      case 'alert.escalated':
        onAlertEscalated?.(event);
        break;
    }
  }, [
    queryClient,
    hospitalId,
    onAlertCreated,
    onAlertAcknowledged,
    onAlertResolved,
    onAlertEscalated,
    showNotifications,
  ]);

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    
    log.info('Starting polling fallback for alerts', 'ALERT_WS', { 
      hospitalId, 
      interval: pollingInterval 
    });
    
    pollingIntervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: [['healthcare', 'getActiveAlerts'], { input: { hospitalId } }],
      });
    }, pollingInterval);
  }, [hospitalId, pollingInterval, queryClient]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      log.info('Stopped polling for alerts', 'ALERT_WS');
    }
  }, []);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = alertWebSocketManager.subscribe(setConnectionState);
    return unsubscribe;
  }, []);

  // Setup connection manager callbacks
  useEffect(() => {
    alertWebSocketManager.onReconnectAttempt = () => {
      log.info('Attempting WebSocket reconnection', 'ALERT_WS', { hospitalId });
      // Force subscription to reconnect
      if (subscriptionRef.current?.reconnect) {
        subscriptionRef.current.reconnect();
      }
    };

    alertWebSocketManager.onHeartbeat = () => {
      // Send heartbeat ping if needed
      log.debug('WebSocket heartbeat', 'ALERT_WS');
    };

    return () => {
      alertWebSocketManager.onReconnectAttempt = undefined;
      alertWebSocketManager.onHeartbeat = undefined;
    };
  }, [hospitalId]);

  // Use the subscription
  const subscription = api.healthcare.subscribeToAlerts.useSubscription(
    enabled ? { hospitalId } : undefined,
    {
      enabled,
      onStarted: () => {
        log.info('WebSocket subscription started', 'ALERT_WS', { hospitalId });
        alertWebSocketManager.onConnectionSuccess();
        stopPolling(); // Stop polling when WebSocket connects
      },
      onData: (event) => {
        if (event) {
          // Cast to our expected type
          handleEvent(event as AlertSubscriptionEvent);
        } else {
          log.warn('Received null/undefined event from subscription', 'ALERT_WS');
        }
      },
      onError: (error) => {
        log.error('WebSocket subscription error', 'ALERT_WS', error);
        alertWebSocketManager.onConnectionError(error instanceof Error ? error : new Error(String(error)));
        
        // Start polling as fallback if enabled and not already reconnecting
        if (fallbackToPolling && connectionState.status !== 'reconnecting') {
          startPolling();
        }
      },
    }
  );

  // Store subscription ref for reconnection
  useEffect(() => {
    subscriptionRef.current = subscription;
  }, [subscription]);

  // Handle metrics subscription for real-time dashboard updates
  const metricsSubscription = api.healthcare.subscribeToMetrics.useSubscription(
    enabled ? { hospitalId, interval: 30000 } : undefined,
    {
      enabled,
      onData: (metrics) => {
        log.debug('Metrics update received', 'ALERT_WS', metrics);
        // Update metrics cache
        queryClient.setQueryData(
          [['healthcare', 'getMetrics'], { input: { timeRange: '24h', department: 'all' } }],
          (oldData: any) => ({
            ...oldData,
            ...metrics,
          })
        );
      },
      onError: (error) => {
        log.error('Metrics subscription error', 'ALERT_WS', error);
      },
    }
  );

  // Register event handlers with the queue
  useEffect(() => {
    // Register handlers for each event type
    const eventTypes = ['alert.created', 'alert.acknowledged', 'alert.resolved', 'alert.escalated'];
    
    alertEventQueue.registerHandler('alert.created', async (event) => {
      log.debug('Processing queued alert.created event', 'ALERT_WS', { alertId: event.alertId });
      queryClient.invalidateQueries({
        queryKey: [['healthcare', 'getActiveAlerts'], { input: { hospitalId } }],
      });
    });

    alertEventQueue.registerHandler('alert.acknowledged', async (event) => {
      log.debug('Processing queued alert.acknowledged event', 'ALERT_WS', { alertId: event.alertId });
      queryClient.invalidateQueries({
        queryKey: [['healthcare', 'getActiveAlerts'], { input: { hospitalId } }],
      });
    });

    alertEventQueue.registerHandler('alert.resolved', async (event) => {
      log.debug('Processing queued alert.resolved event', 'ALERT_WS', { alertId: event.alertId });
      queryClient.invalidateQueries({
        queryKey: [['healthcare', 'getActiveAlerts'], { input: { hospitalId } }],
      });
    });

    alertEventQueue.registerHandler('alert.escalated', async (event) => {
      log.debug('Processing queued alert.escalated event', 'ALERT_WS', { alertId: event.alertId });
      queryClient.invalidateQueries({
        queryKey: [['healthcare', 'getActiveAlerts'], { input: { hospitalId } }],
      });
      if (event.alertId) {
        queryClient.invalidateQueries({
          queryKey: [['healthcare', 'getEscalationStatus'], { input: { alertId: event.alertId } }],
        });
      }
    });

    // Cleanup function to prevent memory leaks
    return () => {
      log.debug('Cleaning up alert event handlers', 'ALERT_WS', { hospitalId });
      // Unregister all event handlers
      eventTypes.forEach(eventType => {
        alertEventQueue.unregisterHandler(eventType);
      });
    };
  }, [queryClient, hospitalId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      alertWebSocketManager.reset();
    };
  }, [stopPolling]);

  // Handle connection close events (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleBeforeUnload = () => {
        alertWebSocketManager.onConnectionClose(1000, 'Page unload');
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, []);

  return {
    isConnected: connectionState.status === 'connected',
    connectionError: connectionState.status === 'error' ? 'Connection failed' : null,
    connectionState,
    isPolling: !!pollingIntervalRef.current,
    queueStats: alertEventQueue.getStats(),
  };
}

// Hook for single alert subscription with details
export function useAlertDetailWebSocket(alertId: string | null, enabled = true) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // For now, use polling for alert details
  // In the future, this could be a dedicated subscription
  useEffect(() => {
    if (!alertId || !enabled) return;

    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: [['healthcare', 'getEscalationStatus'], { input: { alertId } }],
      });
      
      queryClient.invalidateQueries({
        queryKey: [['healthcare', 'getEscalationHistory'], { input: { alertId } }],
      });
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [alertId, enabled, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  return { isConnected };
}

// Hook for optimistic updates with WebSocket support
export function useOptimisticAlertUpdate() {
  const queryClient = useQueryClient();

  const updateAlertOptimistically = useCallback((
    alertId: string,
    updates: Partial<any>
  ) => {
    // Optimistically update the cache
    queryClient.setQueryData(
      [['healthcare', 'getActiveAlerts']],
      (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          alerts: oldData.alerts.map((alertData: any) =>
            alertData.alert.id === alertId
              ? { ...alertData, alert: { ...alertData.alert, ...updates } }
              : alertData
          ),
        };
      }
    );
  }, [queryClient]);

  return { updateAlertOptimistically };
}