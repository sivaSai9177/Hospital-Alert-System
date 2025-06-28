import { useMemo, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/trpc';
import { useHospitalContext } from './useHospitalContext';
import { useAlertWebSocket } from './useAlertWebSocket';
import { logger } from '@/lib/core/debug/unified-logger';
import type { AlertType } from '@/types/healthcare';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/src/server/routers';

// Infer the types from our TRPC router
type RouterOutput = inferRouterOutputs<AppRouter>;
type GetActiveAlertsOutput = RouterOutput['healthcare']['getActiveAlerts'];
type AlertFromAPI = GetActiveAlertsOutput['alerts'][number];

export interface EscalationQueueOptions {
  enabled?: boolean;
  refetchInterval?: number;
  urgencyFilter?: 'all' | '1' | '2' | '3' | '4' | '5';
  showNotifications?: boolean;
}

export interface EscalationStats {
  total: number;
  tier2: number;
  tier3: number;
  tier4Plus: number;
  averageResponseTime: string;
  byUrgency: Record<number, number>;
}

// Use the API type as base and ensure required fields
export type EscalatedAlert = AlertFromAPI & {
  currentEscalationTier: number;
  escalationLevel: number;
};

export interface EscalationQueueResult {
  alerts: EscalatedAlert[];
  alertsByTier: Record<number, EscalatedAlert[]>;
  stats: EscalationStats;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isOffline: boolean;
  lastUpdated?: Date;
}

/**
 * Hook for managing escalation queue with real-time updates
 * Follows SSR best practices with caching and offline support
 */
export function useEscalationQueue(options: EscalationQueueOptions = {}): EscalationQueueResult {
  const { 
    enabled = true, 
    refetchInterval = 10000, // 10 seconds
    urgencyFilter = 'all',
    showNotifications = true
  } = options;
  
  const { hospitalId, canAccessHealthcare } = useHospitalContext();
  const utils = api.useUtils();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Debug log the query parameters
  logger.healthcare.info('Escalation queue query params', {
    hospitalId,
    hospitalIdLength: hospitalId?.length,
    hospitalIdIsEmpty: hospitalId === '',
    canAccessHealthcare,
    enabled,
    queryEnabled: !!hospitalId && canAccessHealthcare && enabled,
  });
  
  // Fetch active alerts directly using TRPC query hook
  const {
    data: alertsData,
    isLoading,
    error,
    refetch: baseRefetch,
  } = api.healthcare.getActiveAlerts.useQuery(
    { 
      // Don't pass hospitalId if it's empty or undefined
      ...(hospitalId ? { hospitalId } : {}),
      status: 'active', // Explicitly request active alerts
    },
    {
      enabled: !!hospitalId && canAccessHealthcare && enabled,
      refetchInterval,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
  
  // Filter only escalated alerts (tier > 1) and store in rawData
  const rawData = useMemo(() => {
    if (!alertsData) return null;
    
    // Debug log the raw data
    logger.healthcare.info('Raw alerts data from API', {
      hospitalId,
      totalAlerts: alertsData.alerts.length,
      firstAlert: alertsData.alerts[0] ? {
        id: alertsData.alerts[0].id,
        roomNumber: alertsData.alerts[0].roomNumber,
        currentEscalationTier: alertsData.alerts[0].currentEscalationTier,
        escalationLevel: alertsData.alerts[0].escalationLevel,
        status: alertsData.alerts[0].status,
      } : null,
    });
    
    const escalatedAlerts = alertsData.alerts.filter((alert): alert is EscalatedAlert => {
      const isEscalated = alert.currentEscalationTier > 1 && alert.status === 'active';
      if (!isEscalated && alert.currentEscalationTier > 1) {
        logger.healthcare.warn('Alert filtered out due to status', {
          alertId: alert.id,
          currentEscalationTier: alert.currentEscalationTier,
          status: alert.status,
        });
      }
      return isEscalated;
    });
    
    logger.healthcare.info('Filtered escalation queue', {
      hospitalId,
      totalAlerts: alertsData.alerts.length,
      escalatedCount: escalatedAlerts.length,
      tiers: escalatedAlerts.reduce((acc, alert) => {
        const tier = alert.currentEscalationTier || 0;
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
    });
    
    return {
      ...alertsData,
      alerts: escalatedAlerts,
    };
  }, [alertsData, hospitalId]);
  
  // WebSocket integration for real-time updates
  useAlertWebSocket({
    hospitalId,
    enabled: !!hospitalId && enabled && !isOffline,
    showNotifications,
    onAlertEscalated: useCallback((event) => {
      logger.healthcare.info('Alert escalated - updating queue', event);
      // Invalidate cache to force refetch
      utils.healthcare.getActiveAlerts.invalidate({ hospitalId });
      void baseRefetch();
    }, [hospitalId, utils, baseRefetch]),
    onAlertAcknowledged: useCallback((event) => {
      logger.healthcare.info('Alert acknowledged - updating queue', event);
      // Optimistically update the UI
      if (rawData) {
        const updatedAlerts = rawData.alerts.filter(a => a.id !== event.alertId);
        utils.healthcare.getActiveAlerts.setData({ hospitalId }, {
          ...rawData,
          alerts: updatedAlerts,
        });
      }
      void baseRefetch();
    }, [hospitalId, utils, rawData, baseRefetch]),
    onAlertResolved: useCallback((event) => {
      logger.healthcare.info('Alert resolved - updating queue', event);
      void baseRefetch();
    }, [baseRefetch]),
  });
  
  // Filter alerts by urgency level
  const filteredAlerts = useMemo(() => {
    if (!rawData?.alerts) return [];
    
    if (urgencyFilter === 'all') return rawData.alerts;
    
    return rawData.alerts.filter(alert => 
      alert.urgencyLevel.toString() === urgencyFilter
    );
  }, [rawData?.alerts, urgencyFilter]);
  
  // Group alerts by escalation tier
  const alertsByTier = useMemo(() => {
    const grouped: Record<number, EscalatedAlert[]> = {};
    
    filteredAlerts.forEach(alert => {
      const tier = alert.currentEscalationTier || 1;
      if (!grouped[tier]) grouped[tier] = [];
      grouped[tier].push(alert);
    });
    
    // Sort each tier by urgency and creation time
    Object.keys(grouped).forEach(tier => {
      grouped[Number(tier)].sort((a, b) => {
        // First by urgency (higher first)
        if (a.urgencyLevel !== b.urgencyLevel) {
          return b.urgencyLevel - a.urgencyLevel;
        }
        // Then by creation time (older first)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    });
    
    return grouped;
  }, [filteredAlerts]);
  
  // Calculate statistics
  const stats = useMemo((): EscalationStats => {
    const tier2Count = alertsByTier[2]?.length || 0;
    const tier3Count = alertsByTier[3]?.length || 0;
    const tier4PlusCount = Object.entries(alertsByTier)
      .filter(([tier]) => parseInt(tier) >= 4)
      .reduce((sum, [_, alerts]) => sum + alerts.length, 0);
    
    // Calculate urgency distribution
    const byUrgency: Record<number, number> = {};
    filteredAlerts.forEach(alert => {
      byUrgency[alert.urgencyLevel] = (byUrgency[alert.urgencyLevel] || 0) + 1;
    });
    
    // Calculate average time in escalation
    const avgMinutes = filteredAlerts.length > 0 
      ? Math.floor(
          filteredAlerts.reduce((sum: number, alert) => {
            const minutes = Math.floor(
              (Date.now() - new Date(alert.createdAt).getTime()) / 60000
            );
            return sum + minutes;
          }, 0) / filteredAlerts.length
        )
      : 0;
    
    return {
      total: filteredAlerts.length,
      tier2: tier2Count,
      tier3: tier3Count,
      tier4Plus: tier4PlusCount,
      averageResponseTime: avgMinutes > 0 ? `${avgMinutes}m` : '0m',
      byUrgency,
    };
  }, [filteredAlerts, alertsByTier]);
  
  // Enhanced refetch with error handling
  const refetch = useCallback(async () => {
    try {
      await baseRefetch();
    } catch (error) {
      logger.healthcare.error('Failed to refetch escalation queue', { error });
    }
  }, [baseRefetch]);
  
  return {
    alerts: filteredAlerts,
    alertsByTier,
    stats,
    isLoading,
    error: error ? (error instanceof Error ? error : new Error(String(error))) : null,
    refetch,
    isOffline,
    lastUpdated: rawData ? new Date() : undefined,
  };
}

/**
 * Hook for batch acknowledging escalated alerts
 */
export function useBatchAcknowledgeEscalatedAlerts() {
  const utils = api.useUtils();
  const { hospitalId } = useHospitalContext();
  
  return api.healthcare.batchAcknowledgeAlerts.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.healthcare.getActiveAlerts.cancel();
      
      // Snapshot previous value
      const previousAlerts = utils.healthcare.getActiveAlerts.getData({ hospitalId });
      
      // Optimistically update
      if (previousAlerts && hospitalId && variables && 'alertIds' in variables && variables.alertIds) {
        const acknowledgedIds = new Set(variables.alertIds);
        utils.healthcare.getActiveAlerts.setData(
          { hospitalId },
          {
            ...previousAlerts,
            alerts: previousAlerts.alerts.filter(alert => 
              !acknowledgedIds.has(alert.id)
            ),
          }
        );
      }
      
      return { previousAlerts };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousAlerts && hospitalId) {
        utils.healthcare.getActiveAlerts.setData(
          { hospitalId },
          context.previousAlerts
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      utils.healthcare.getActiveAlerts.invalidate({ hospitalId });
    },
  });
}

/**
 * Hook to get a specific alert from the escalation queue
 */
export function useEscalatedAlert(alertId: string) {
  const { alerts } = useEscalationQueue();
  
  return useMemo(() => 
    alerts.find(alert => alert.id === alertId),
    [alerts, alertId]
  );
}