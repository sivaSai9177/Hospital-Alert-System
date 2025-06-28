export { useAlertActivity } from './useAlertActivity';
export { useActivityAwareEscalation } from './useActivityAwareEscalation';
export { useAlertWebSocket, useAlertDetailWebSocket, useOptimisticAlertUpdate } from './useAlertWebSocket';
export { useMobileAlertWebSocket, useMobileOptimisticAlertUpdate } from './useMobileAlertWebSocket';
export { useHealthcareQuery, useHealthcareMutation } from './useHealthcareQuery';
export { useGlobalErrorStore } from './useGlobalErrorStore';
export { useHospitalContext, useRequiredHospitalContext } from './useHospitalContext';
export { useHealthcareUser, useRequiredHealthcareUser } from './useHealthcareUser';
export { useEscalationQueue, useBatchAcknowledgeEscalatedAlerts, useEscalatedAlert } from './useEscalationQueue';

// Enhanced API hooks
export {
  useActiveAlerts,
  useAlertDetails,
  useAcknowledgeAlert,
  useResolveAlert,
  useCreateAlert,
  useHealthcareMetrics,
  usePatients,
  useShiftStatus,
  useShiftHandover,
  useActiveAlertsWithOrg,
  useOrganizationAlertStats,
  useMetrics,
  useResponseTimes,
  useMyPatients,
  useAlertStats,
  useUnreadNotifications,
  useOrganizationHospitals,
  useSelectHospital,
} from './useHealthcareApi';

// Validation hooks
export {
  useCreateAlertValidation,
  useAcknowledgeAlertValidation,
  useHealthcareProfileValidation,
  useUpdateUserRoleValidation,
  formatValidationErrors,
  getFirstError,
} from './useValidation';