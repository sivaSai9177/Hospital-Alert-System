/**
 * Healthcare Blocks
 * 
 * All healthcare-related block components for the hospital alert system.
 * These blocks are fully migrated to the new design system with:
 * - Tailwind/NativeWind styling
 * - Semantic color variants (no hardcoded colors)
 * - useShadow hook for platform-aware shadows
 * - useSpacing hook for density-aware spacing
 * - useResponsive hooks for adaptive layouts
 * - Animation hooks for smooth interactions
 * - Haptic feedback on user interactions
 */

// Alert Management Components
export { AlertCreationForm } from './AlertCreationForm';
export { AlertCreationFormEnhanced } from './AlertCreationFormEnhanced';
export { AlertCreationFormSimplified } from './AlertCreationFormSimplified';
export { AlertList } from './AlertList';
export { AlertListVirtualized } from './AlertListVirtualized';
export { AlertListWithBatchActions } from './AlertListWithBatchActions';
export { AlertSummary } from './AlertSummary';
export { AlertSummaryEnhanced } from './AlertSummaryEnhanced';
export { AlertTimeline } from './AlertTimeline';
export { AlertItem } from './AlertItem';
export { AlertItemSimple } from './AlertItemSimple';
export { AlertCardPremium } from './AlertCardPremium';
export { AlertCardOptimized } from './AlertCardOptimized';
export { AlertTimelineWidget } from './AlertTimelineWidget';
export { AlertFilters } from './AlertFilters';
export { AlertFilterPresets } from './AlertFilterPresets';
export { AlertActions } from './AlertActions';

// Alert Support Components
export { EscalationTimer, EscalationSummary } from './EscalationTimer';
export { EscalationTimeline, EscalationTimelineCompact } from './EscalationTimeline';
export { AlertAcknowledgeDialog } from './alerts/AlertAcknowledgeDialog';

// Patient Management Components
export { ActivePatients } from './ActivePatients';
export { PatientCardBlock as PatientCard } from './PatientCard';
export { PatientCreationForm } from './PatientCreationForm';

// Metrics & Analytics
export { MetricsOverviewBlock as MetricsOverview } from './MetricsOverview';
export { ResponseAnalyticsDashboard } from './ResponseAnalyticsDashboard';
export { ActivityLogsBlock } from './ActivityLogsBlock';

// Shift Management
export { ShiftStatus } from './ShiftStatus';
export { ShiftManagement } from './ShiftManagement';

// Debug Components
export { DebugUserInfo } from './DebugUserInfo';

// Floating Action Button
export { FloatingAlertButton } from './FloatingAlertButton';

// Profile & Access Management
// ProfileIncompletePrompt removed - hospital selection is now optional
export { HealthcareProvider, withHealthcareProvider } from './HealthcareProvider';

// Loading States
export { GlassLoadingScreen } from './GlassLoadingScreen';

// Success Animation
export { SuccessAnimation } from './SuccessAnimation';
export { PatientRegistrationSuccess } from './PatientRegistrationSuccess';

// Mobile-optimized components
export { MobileMetricCard } from './MobileMetricCard';
export { MobileAlertSummary } from './MobileAlertSummary';
export { MobileQuickActions } from './MobileQuickActions';
export { MobileShiftStatus } from './MobileShiftStatus';

// Type exports for better type safety
export type { AlertSummaryBlockProps } from './AlertSummary';