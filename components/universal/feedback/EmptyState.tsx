import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/universal/typography';
import { VStack, HStack } from '@/components/universal/layout/Stack';
import { Button } from '@/components/universal/interaction/Button';
import { Card, CardContent } from '@/components/universal/display/Card';
import { useGlassTheme } from '@/lib/design/themes/glass-theme';
import { useSpacing } from '@/contexts/SpacingContext';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { 
  Symbol,
  SearchIcon,
  AlertCircle,
  Users,
  Calendar,
  FileText,
  Activity,
  Database,
  PlusIcon,
  RefreshCw,
  Filter,
  ErrorIcon,
  WarningIcon
} from '@/components/universal/display/Symbols';

export type EmptyStateVariant = 
  | 'no-data'
  | 'no-results' 
  | 'no-alerts'
  | 'no-patients'
  | 'no-activity'
  | 'no-schedule'
  | 'no-reports'
  | 'error'
  | 'offline'
  | 'custom';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  icon?: React.ReactNode;
}

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: EmptyStateAction[];
  fullHeight?: boolean;
  compact?: boolean;
}

const EMPTY_STATE_CONFIGS = {
  'no-data': {
    icon: <Database size={48} color="#6B7280" />,
    title: 'No Data Available',
    description: 'There is no data to display at the moment.',
  },
  'no-results': {
    icon: <SearchIcon size={48} color="#6B7280" />,
    title: 'No Results Found',
    description: 'Try adjusting your filters or search criteria.',
  },
  'no-alerts': {
    icon: <AlertCircle size={48} color="#10B981" />,
    title: 'No Active Alerts',
    description: 'All clear! There are no active alerts at this time.',
  },
  'no-patients': {
    icon: <Users size={48} color="#6B7280" />,
    title: 'No Patients',
    description: 'No patients match your current criteria.',
  },
  'no-activity': {
    icon: <Activity size={48} color="#6B7280" />,
    title: 'No Recent Activity',
    description: 'There has been no activity in the selected time period.',
  },
  'no-schedule': {
    icon: <Calendar size={48} color="#6B7280" />,
    title: 'No Scheduled Items',
    description: 'Your schedule is clear for the selected period.',
  },
  'no-reports': {
    icon: <FileText size={48} color="#6B7280" />,
    title: 'No Reports Available',
    description: 'There are no reports to display.',
  },
  'error': {
    icon: <ErrorIcon size={48} color="#EF4444" />,
    title: 'Something Went Wrong',
    description: 'We encountered an error while loading this content.',
  },
  'offline': {
    icon: <WarningIcon size={48} color="#F59E0B" />,
    title: 'You\'re Offline',
    description: 'Please check your internet connection and try again.',
  },
  'custom': {
    icon: <Symbol name="tray" size={48} color="#6B7280" />,
    title: 'No Content',
    description: 'There is nothing to display here.',
  },
};

export function EmptyState({
  variant = 'no-data',
  title,
  description,
  icon,
  actions = [],
  fullHeight = true,
  compact = false,
}: EmptyStateProps) {
  const glassTheme = useGlassTheme();
  const { spacing } = useSpacing();
  
  const config = EMPTY_STATE_CONFIGS[variant];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;

  const containerStyle = {
    flex: fullHeight ? 1 : undefined,
    minHeight: fullHeight ? 400 : compact ? 200 : 300,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: spacing[4],
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={containerStyle}
    >
      <Card style={{ 
        width: '100%', 
        maxWidth: 400,
        padding: compact ? spacing[3] : spacing[6],
        backgroundColor: glassTheme.colors.background,
        borderColor: glassTheme.colors.border,
        borderWidth: 1,
        borderRadius: 12,
      }}>
        <CardContent>
          <VStack gap={compact ? 3 : 4} align="center">
            {/* Icon */}
            <Animated.View entering={FadeInUp.delay(100).springify()}>
              <View style={{
                width: compact ? 64 : 80,
                height: compact ? 64 : 80,
                borderRadius: compact ? 32 : 40,
                backgroundColor: variant === 'error' ? '#FEE2E2' : 
                               variant === 'offline' ? '#FEF3C7' :
                               variant === 'no-alerts' ? '#D1FAE5' : '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {displayIcon}
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInUp.delay(200).springify()}>
              <Text 
                size={compact ? 'lg' : 'xl'}
                weight="semibold"
                align="center"
                style={{ 
                  color: variant === 'error' ? '#DC2626' : '#111827',
                }}
              >
                {displayTitle}
              </Text>
            </Animated.View>

            {/* Description */}
            {displayDescription && (
              <Animated.View entering={FadeInUp.delay(300).springify()}>
                <Text 
                  size="base"
                  align="center"
                  color="muted"
                  style={{ 
                    maxWidth: 300,
                  }}
                >
                  {displayDescription}
                </Text>
              </Animated.View>
            )}

            {/* Actions */}
            {actions.length > 0 && (
              <Animated.View entering={FadeInUp.delay(400).springify()}>
                <HStack gap={2} style={{ marginTop: spacing[2] }}>
                  {actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || 'default'}
                      size={compact ? 'sm' : 'default'}
                      onPress={action.onPress}
                    >
                      {action.icon && <View style={{ marginRight: 4 }}>{action.icon}</View>}
                      {action.label}
                    </Button>
                  ))}
                </HStack>
              </Animated.View>
            )}
          </VStack>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

// Preset empty states for common scenarios
export const EmptyStates = {
  NoAlerts: () => (
    <EmptyState 
      variant="no-alerts"
      actions={[
        {
          label: 'Refresh',
          onPress: () => {},
          variant: 'outline',
          icon: <RefreshCw size={16} />,
        }
      ]}
    />
  ),
  
  NoSearchResults: ({ onClearFilters }: { onClearFilters?: () => void }) => (
    <EmptyState 
      variant="no-results"
      actions={onClearFilters ? [
        {
          label: 'Clear Filters',
          onPress: onClearFilters,
          variant: 'outline',
          icon: <Filter size={16} />,
        }
      ] : []}
    />
  ),
  
  NoPatients: ({ onAddPatient }: { onAddPatient?: () => void }) => (
    <EmptyState 
      variant="no-patients"
      actions={onAddPatient ? [
        {
          label: 'Add Patient',
          onPress: onAddPatient,
          icon: <PlusIcon size={16} />,
        }
      ] : []}
    />
  ),
  
  LoadingError: ({ onRetry }: { onRetry: () => void }) => (
    <EmptyState 
      variant="error"
      actions={[
        {
          label: 'Try Again',
          onPress: onRetry,
          icon: <RefreshCw size={16} />,
        }
      ]}
    />
  ),
  
  Offline: ({ onRetry }: { onRetry?: () => void }) => (
    <EmptyState 
      variant="offline"
      actions={onRetry ? [
        {
          label: 'Retry',
          onPress: onRetry,
          variant: 'outline',
          icon: <RefreshCw size={16} />,
        }
      ] : []}
    />
  ),
};