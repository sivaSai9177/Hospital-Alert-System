import { api } from '@/lib/api/trpc';
import { useHospitalContext } from './useHospitalContext';

/**
 * Hook for fetching active alerts with error handling and caching
 */
export function useActiveAlerts(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const { hospitalId, canAccessHealthcare } = useHospitalContext();
  
  return api.healthcare.getActiveAlerts.useQuery(
    { hospitalId: hospitalId || '' },
    {
      enabled: !!hospitalId && canAccessHealthcare && (options?.enabled ?? true),
      refetchInterval: options?.refetchInterval || 30000, // 30 seconds
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
}

/**
 * Hook for fetching alert details
 */
export function useAlertDetails(alertId: string, options?: { enabled?: boolean }) {
  const { canAccessHealthcare } = useHospitalContext();
  
  return api.healthcare.getAlert.useQuery(
    { alertId },
    {
      enabled: !!alertId && canAccessHealthcare && (options?.enabled ?? true),
    }
  );
}

/**
 * Hook for acknowledging alerts with optimistic updates
 */
export function useAcknowledgeAlert() {
  const utils = api.useUtils();
  const { hospitalId } = useHospitalContext();
  
  return api.healthcare.acknowledgeAlert.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.healthcare.getActiveAlerts.cancel();
      
      // Snapshot previous value
      const previousAlerts = utils.healthcare.getActiveAlerts.getData({ hospitalId });
      
      // Optimistically update
      if (previousAlerts && hospitalId && variables && 'alertId' in variables && variables.alertId) {
        utils.healthcare.getActiveAlerts.setData(
          { hospitalId },
          {
            ...previousAlerts,
            alerts: previousAlerts.alerts.map(alert =>
              alert.id === variables.alertId
                ? { ...alert, acknowledged: true, acknowledgedAt: new Date().toISOString() }
                : alert
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
 * Hook for resolving alerts
 */
export function useResolveAlert() {
  const utils = api.useUtils();
  const { hospitalId } = useHospitalContext();
  
  return api.healthcare.resolveAlert.useMutation({
    onMutate: async (variables) => {
      await utils.healthcare.getActiveAlerts.cancel();
      
      const previousAlerts = utils.healthcare.getActiveAlerts.getData({ hospitalId });
      
      if (previousAlerts && hospitalId && variables && 'alertId' in variables && variables.alertId) {
        utils.healthcare.getActiveAlerts.setData(
          { hospitalId },
          {
            ...previousAlerts,
            alerts: previousAlerts.alerts.map(alert =>
              alert.id === variables.alertId
                ? { ...alert, resolved: true, resolvedAt: new Date().toISOString() }
                : alert
            ),
          }
        );
      }
      
      return { previousAlerts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAlerts && hospitalId) {
        utils.healthcare.getActiveAlerts.setData(
          { hospitalId },
          context.previousAlerts
        );
      }
    },
    onSettled: () => {
      utils.healthcare.getActiveAlerts.invalidate({ hospitalId });
    },
  });
}

/**
 * Hook for creating new alerts
 */
export function useCreateAlert() {
  const { hospitalId } = useHospitalContext();
  const utils = api.useUtils();
  
  return api.healthcare.createAlert.useMutation({
    onSuccess: () => {
      // Invalidate queries after successful creation
      utils.healthcare.getActiveAlerts.invalidate({ hospitalId });
      utils.healthcare.getMetrics.invalidate();
    },
  });
}

/**
 * Hook for fetching healthcare metrics
 */
export function useHealthcareMetrics(options?: {
  timeRange?: '1h' | '6h' | '24h' | '7d';
  enabled?: boolean;
}) {
  const { hospitalId, canAccessHealthcare } = useHospitalContext();
  
  return api.healthcare.getMetrics.useQuery(
    { 
      timeRange: options?.timeRange || '24h',
    },
    {
      enabled: !!hospitalId && canAccessHealthcare && (options?.enabled ?? true),
      refetchInterval: 60000, // 1 minute
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

/**
 * Hook for fetching my patients
 */
export function useMyPatients(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const { hospitalId, canAccessHealthcare } = useHospitalContext();
  
  return api.healthcare.getMyPatients.useQuery(
    { hospitalId: hospitalId || '' },
    {
      enabled: !!hospitalId && canAccessHealthcare && (options?.enabled ?? true),
      refetchInterval: options?.refetchInterval || 30000,
      staleTime: 5 * 60 * 1000,
    }
  );
}

/**
 * Hook for fetching active alerts with organization data
 */
export function useActiveAlertsWithOrg(options?: {
  hospitalId?: string;
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const { hospitalId: contextHospitalId } = useHospitalContext();
  const hospitalId = options?.hospitalId || contextHospitalId;
  
  return api.healthcare.getActiveAlertsWithOrg.useQuery(
    { hospitalId: hospitalId || '' },
    {
      enabled: !!hospitalId && (options?.enabled ?? true),
      refetchInterval: options?.refetchInterval || 30000,
      staleTime: 2 * 60 * 1000,
    }
  );
}

/**
 * Hook for organization alert stats
 */
export function useOrganizationAlertStats(options?: {
  organizationId?: string;
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return api.healthcare.getOrganizationAlertStats.useQuery(
    { organizationId: options?.organizationId || '' },
    {
      enabled: !!options?.organizationId && (options?.enabled ?? true),
      refetchInterval: options?.refetchInterval || 60000,
      staleTime: 5 * 60 * 1000,
    }
  );
}

/**
 * Hook for healthcare metrics with custom parameters
 */
export function useMetrics(options?: {
  hospitalId?: string;
  timeRange?: '1h' | '6h' | '24h' | '7d';
  department?: string;
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const { hospitalId: contextHospitalId } = useHospitalContext();
  const hospitalId = options?.hospitalId || contextHospitalId;
  
  return api.healthcare.getMetrics.useQuery(
    { 
      timeRange: options?.timeRange || '24h',
      department: options?.department || 'all',
    },
    {
      enabled: !!hospitalId && (options?.enabled ?? true),
      refetchInterval: options?.refetchInterval || 30000,
      staleTime: 5 * 60 * 1000,
    }
  );
}

/**
 * Hook for alert stats
 */
export function useAlertStats(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const { canAccessHealthcare } = useHospitalContext();
  
  return api.healthcare.getAlertStats.useQuery(undefined, {
    enabled: canAccessHealthcare && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval || 30000,
  });
}

/**
 * Hook for unread notifications
 */
export function useUnreadNotifications(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return api.notification.getUnread.useQuery(undefined, {
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval || 60000,
  });
}

/**
 * Hook for organization hospitals
 */
export function useOrganizationHospitals(organizationId: string | undefined, options?: {
  enabled?: boolean;
}) {
  return api.healthcare.getOrganizationHospitals.useQuery(
    { organizationId: organizationId || '' },
    {
      enabled: !!organizationId && organizationId !== '' && (options?.enabled ?? true),
      staleTime: 10 * 60 * 1000,
    }
  );
}

/**
 * Hook for selecting hospital
 */
export function useSelectHospital() {
  const utils = api.useUtils();
  
  return api.auth.selectHospital.useMutation({
    onSuccess: () => {
      // Invalidate all healthcare queries after hospital change
      utils.healthcare.invalidate();
    },
  });
}

/**
 * Hook for fetching patient details
 */
export function usePatientDetails(patientId: string, options?: { enabled?: boolean }) {
  const { canAccessHealthcare } = useHospitalContext();
  
  return api.patient.getDetails.useQuery(
    { patientId },
    {
      enabled: !!patientId && canAccessHealthcare && (options?.enabled ?? true),
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

// Legacy hooks that might be used elsewhere - these will be deprecated
export function usePatients(options?: {
  status?: 'active' | 'discharged' | 'all';
  enabled?: boolean;
}) {
  // Use getMyPatients instead as getPatients doesn't exist
  return useMyPatients(options);
}

export function useShiftStatus() {
  // Return a mock/empty response as this endpoint doesn't exist
  return {
    data: null,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data: null })
  };
}

export function useShiftHandover() {
  // Return a mock mutation as this endpoint doesn't exist
  return {
    mutate: () => {},
    mutateAsync: () => Promise.resolve(null),
    isLoading: false,
    error: null
  };
}

export function useResponseTimes(_options?: {
  hospitalId?: string;
  period?: string;
  enabled?: boolean;
  refetchInterval?: number;
}) {
  // Return a mock/empty response as this endpoint doesn't exist
  return {
    data: null,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data: null })
  };
}