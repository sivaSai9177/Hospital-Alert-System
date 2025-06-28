import React, { useState, useMemo } from 'react';
import { View, ScrollView, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/universal/display/Card';
import { Text } from '@/components/universal/typography';
import { VStack, HStack } from '@/components/universal/layout/Stack';
import { Badge } from '@/components/universal/display/Badge';
import { Button } from '@/components/universal/interaction/Button';
import { Select } from '@/components/universal/form/Select';
import { Input } from '@/components/universal/form/Input';
import { 
  SearchIcon, 
  Filter, 
  Download, 
  RefreshCw, 
  User, 
  Clock, 
  Activity, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Info,
  Symbol 
} from '@/components/universal/display/Symbols';
import { getResponsiveSpacing, getScreenSize } from '@/lib/design/responsive-spacing';
import { api } from '@/lib/api/trpc';
import { useDebounce } from '@/hooks/useDebounce';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { useGlassTheme } from '@/lib/design/themes/glass-theme';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';
import { EmptyState, SkeletonList, SkeletonCard, SkeletonMetricCard } from '@/components/universal/feedback';

type LogType = 'all' | 'alert' | 'patient' | 'auth' | 'system' | 'audit';
type LogSeverity = 'all' | 'info' | 'warning' | 'error' | 'critical';
type TimeFilter = '1h' | '24h' | '7d' | '30d' | 'custom';

interface ActivityLog {
  id: string;
  timestamp: Date;
  type: string;
  action: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  entityType?: string;
  entityId?: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

interface ActivityLogsBlockProps {
  hospitalId?: string;
  userId?: string;
  limit?: number;
}

const LOG_TYPE_ICONS = {
  alert: AlertCircle,
  patient: User,
  auth: Shield,
  system: Activity,
  audit: Info,
};

const SEVERITY_COLORS = {
  info: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',
  critical: '#DC2626',
};

export function ActivityLogsBlock({ hospitalId, userId, limit = 100 }: ActivityLogsBlockProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [logType, setLogType] = useState<LogType>('all');
  const [severity, setSeverity] = useState<LogSeverity>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [showFilters, setShowFilters] = useState(false);
  const screenSize = getScreenSize();
  const spacing = {
    scale: (value: number) => getResponsiveSpacing(value as any, screenSize),
  };
  const glassTheme = useGlassTheme();
  const glassContainer = (glassTheme as any).glassContainer || { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12 };

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch activity logs
  const { data: logsData, isLoading, refetch, error } = api.healthcare.getActivityLogs.useQuery({
    hospitalId,
    userId,
    search: debouncedSearch,
    type: logType === 'all' ? undefined : logType,
    severity: severity === 'all' ? undefined : severity,
    timeRange: timeFilter,
    limit,
  }, {
    enabled: !!hospitalId, // Only fetch if hospitalId is provided
    retry: false, // Don't retry on error
    onError: (err) => {
      console.error('Failed to load activity logs:', err);
    }
  });

  // Mock data for demonstration
  const mockLogs: ActivityLog[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      type: 'alert',
      action: 'alert_created',
      user: { id: '1', name: 'Dr. Smith', role: 'doctor' },
      entityType: 'alert',
      entityId: 'alert-123',
      description: 'Created Code Blue alert for Room 301',
      severity: 'critical',
      metadata: { roomNumber: '301', alertType: 'Code Blue' },
      ipAddress: '192.168.1.100',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      type: 'auth',
      action: 'login',
      user: { id: '2', name: 'Nurse Johnson', role: 'nurse' },
      description: 'User logged in successfully',
      severity: 'info',
      metadata: { loginMethod: 'password' },
      ipAddress: '192.168.1.101',
      userAgent: 'Mobile App iOS',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      type: 'patient',
      action: 'patient_updated',
      user: { id: '3', name: 'Dr. Williams', role: 'doctor' },
      entityType: 'patient',
      entityId: 'patient-456',
      description: 'Updated patient status to stable',
      severity: 'info',
      metadata: { previousStatus: 'critical', newStatus: 'stable' },
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      type: 'system',
      action: 'backup_completed',
      user: { id: 'system', name: 'System', role: 'system' },
      description: 'Daily backup completed successfully',
      severity: 'info',
      metadata: { backupSize: '2.5GB', duration: '5m' },
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      type: 'alert',
      action: 'alert_escalated',
      user: { id: '4', name: 'System', role: 'system' },
      entityType: 'alert',
      entityId: 'alert-789',
      description: 'Alert escalated to Level 2 after timeout',
      severity: 'warning',
      metadata: { escalationLevel: 2, timeout: '10m' },
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 90 * 60 * 1000),
      type: 'audit',
      action: 'permission_changed',
      user: { id: '5', name: 'Admin User', role: 'admin' },
      entityType: 'user',
      entityId: 'user-123',
      description: 'User permissions updated',
      severity: 'warning',
      metadata: { addedPermissions: ['view_reports'], removedPermissions: [] },
    },
  ];

  const logs = logsData?.logs || mockLogs;

  // Filter logs based on criteria
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Type filter
      if (logType !== 'all' && log.type !== logType) return false;
      
      // Severity filter
      if (severity !== 'all' && log.severity !== severity) return false;
      
      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        return (
          log.description.toLowerCase().includes(searchLower) ||
          log.user.name.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower) ||
          log.type.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [logs, logType, severity, debouncedSearch]);

  const formatTimestamp = (date: Date) => {
    if (isToday(date)) {
      return `Today at ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'HH:mm')}`;
    }
    return format(date, 'MMM d, yyyy HH:mm');
  };

  const getLogIcon = (type: string) => {
    const Icon = LOG_TYPE_ICONS[type as keyof typeof LOG_TYPE_ICONS] || Activity;
    return <Icon size={16} color="#6B7280" />;
  };

  const renderLogItem = (log: ActivityLog, index: number) => (
    <Animated.View
      key={log.id}
      entering={FadeInUp.delay(index * 50).springify()}
      layout={Layout.springify()}
    >
      <Card style={[glassContainer, { marginBottom: spacing.scale(2), padding: spacing.scale(3) }]}>
          <VStack gap={2 as any}>
            {/* Header */}
            <HStack justify="between" align="center">
              <HStack gap={2 as any} align="center">
                {getLogIcon(log.type)}
                <Badge variant={log.severity === 'critical' ? 'error' : log.severity === 'error' ? 'error' : log.severity === 'warning' ? 'warning' : 'default'}>
                  {log.type}
                </Badge>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {formatTimestamp(log.timestamp)}
                </Text>
              </HStack>
              <Badge 
                variant="outline" 
                style={{ 
                  borderColor: SEVERITY_COLORS[log.severity],
                  backgroundColor: `${SEVERITY_COLORS[log.severity]}10`,
                }}
              >
                <Text style={{ color: SEVERITY_COLORS[log.severity], fontSize: 12 }}>
                  {log.severity.toUpperCase()}
                </Text>
              </Badge>
            </HStack>

            {/* Description */}
            <Text style={{ fontSize: 14, fontWeight: '500' }}>
              {log.description}
            </Text>

            {/* User Info */}
            <HStack gap={3 as any} align="center">
              <HStack gap={1 as any} align="center">
                <User size={14} color="#6B7280" />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {log.user.name} ({log.user.role})
                </Text>
              </HStack>
              {log.ipAddress && (
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  IP: {log.ipAddress}
                </Text>
              )}
              {log.userAgent && (
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {log.userAgent}
                </Text>
              )}
            </HStack>

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <HStack gap={2} style={{ flexWrap: 'wrap' }}>
                {Object.entries(log.metadata).map(([key, value]) => (
                  <Badge key={key} variant="secondary" size="sm">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </HStack>
            )}

            {/* Entity Reference */}
            {log.entityType && log.entityId && (
              <HStack gap={1 as any} align="center">
                <Info size={12} color="#6B7280" />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {log.entityType}: {log.entityId}
                </Text>
              </HStack>
            )}
          </VStack>
      </Card>
    </Animated.View>
  );

  // Handle errors
  if (error && !hospitalId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <EmptyState
          icon="exclamationmark.triangle"
          title="Hospital Assignment Required"
          description="Healthcare features require hospital assignment. Please complete your profile to select a hospital."
          actionLabel="Complete Your Profile"
          onAction={() => {
            // Navigate to profile completion
            router.push('/(public)/auth/complete-profile');
          }}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <EmptyState
          icon="exclamationmark.triangle"
          title="Failed to Load Logs"
          description="Unable to load activity logs. Please try again."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <VStack gap={3 as any}>
        {/* Header */}
        <Animated.View entering={FadeInDown}>
          <Card style={[glassContainer, { padding: spacing.scale(4) }]}>
              <VStack gap={3 as any}>
                {/* Title and Actions */}
                <HStack justify="between" align="center">
                  <VStack gap={1 as any}>
                    <Text style={{ fontSize: 20, fontWeight: '700' }}>Activity Logs</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>
                      {filteredLogs.length} entries found
                    </Text>
                  </VStack>
                  <HStack gap={2 as any}>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => setShowFilters(!showFilters)}
                    >
                      <Filter size={16} />
                      Filters
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => refetch()}
                    >
                      <RefreshCw size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        // Export functionality

                      }}
                    >
                      <Download size={16} />
                    </Button>
                  </HStack>
                </HStack>

                {/* Search Bar */}
                <View style={{ position: 'relative' }}>
                  <View style={{ 
                    position: 'absolute', 
                    left: 12, 
                    top: '50%',
                    transform: [{ translateY: -10 }],
                    zIndex: 1,
                  }}>
                    <SearchIcon size={20} color="#6B7280" />
                  </View>
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{ paddingLeft: 40 }}
                  />
                </View>

                {/* Filters */}
                {showFilters && (
                  <Animated.View entering={FadeInDown}>
                    <HStack gap={2 as any} style={{ flexWrap: 'wrap' }}>
                      {/* Time Filter */}
                      <Select 
                        value={timeFilter} 
                        onValueChange={(value) => setTimeFilter(value as TimeFilter)}
                        options={[
                          { value: '1h', label: 'Last Hour' },
                          { value: '24h', label: 'Last 24 Hours' },
                          { value: '7d', label: 'Last 7 Days' },
                          { value: '30d', label: 'Last 30 Days' },
                        ]}
                        placeholder="Time Range"
                        style={{ minWidth: 120 }}
                      />

                      {/* Type Filter */}
                      <Select 
                        value={logType} 
                        onValueChange={(value) => setLogType(value as LogType)}
                        options={[
                          { value: 'all', label: 'All Types' },
                          { value: 'alert', label: 'Alerts' },
                          { value: 'patient', label: 'Patient' },
                          { value: 'auth', label: 'Authentication' },
                          { value: 'system', label: 'System' },
                          { value: 'audit', label: 'Audit' },
                        ]}
                        placeholder="Log Type"
                        style={{ minWidth: 120 }}
                      />

                      {/* Severity Filter */}
                      <Select 
                        value={severity} 
                        onValueChange={(value) => setSeverity(value as LogSeverity)}
                        options={[
                          { value: 'all', label: 'All Severities' },
                          { value: 'info', label: 'Info' },
                          { value: 'warning', label: 'Warning' },
                          { value: 'error', label: 'Error' },
                          { value: 'critical', label: 'Critical' },
                        ]}
                        placeholder="Severity"
                        style={{ minWidth: 120 }}
                      />

                      {/* Clear Filters */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          setSearchQuery('');
                          setLogType('all');
                          setSeverity('all');
                          setTimeFilter('24h');
                        }}
                      >
                        Clear All
                      </Button>
                    </HStack>
                  </Animated.View>
                )}
              </VStack>
          </Card>
        </Animated.View>

        {/* Logs List */}
        <ScrollView 
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.scale(4) }}
        >
          {isLoading ? (
            <SkeletonList 
              count={5} 
              gap={3}
              renderItem={() => <SkeletonCard showActions={false} />}
            />
          ) : filteredLogs.length === 0 ? (
            <EmptyState 
              variant="no-activity"
              title="No Activity Logs Found"
              description={searchQuery || logType !== 'all' || severity !== 'all' 
                ? "Try adjusting your filters or search criteria" 
                : "No activity has been recorded in the selected time period"}
              actions={[
                {
                  label: 'Clear Filters',
                  onPress: () => {
                    setSearchQuery('');
                    setLogType('all');
                    setSeverity('all');
                    setTimeFilter('24h');
                  },
                  variant: 'outline',
                  icon: <Filter size={16} />,
                }
              ]}
              fullHeight={false}
            />
          ) : (
            <VStack gap={0}>
              {filteredLogs.map((log, index) => renderLogItem(log, index))}
            </VStack>
          )}
        </ScrollView>
      </VStack>
    </View>
  );
}