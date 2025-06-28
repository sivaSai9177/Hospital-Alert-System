import React, { useState, useCallback, useMemo } from 'react';
import { 
  ScrollView, 
  RefreshControl, 
  View,
  Dimensions,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/theme/provider';
import { api } from '@/lib/api/trpc';
import { useHospitalContext } from '@/hooks/healthcare';
import {
  Container,
  VStack,
  HStack,
  Text,
  Button,
  GlassCard,
  Badge,
  Input,
  Select,
  Symbol,
  LoadingView,
  EmptyState,
} from '@/components/universal';
import { UnifiedHeader } from '@/components/blocks/navigation/UnifiedHeader';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { haptic } from '@/lib/ui/haptics';
import { formatDistanceToNow, startOfDay, endOfDay, subDays } from 'date-fns';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/lib/core/debug/unified-logger';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Alert type configurations
const alertTypeConfig = {
  cardiac_arrest: { icon: '❤️', color: '#ef4444', label: 'Cardiac Arrest' },
  code_blue: { icon: '🆘', color: '#3b82f6', label: 'Code Blue' },
  fire: { icon: '🔥', color: '#f97316', label: 'Fire Emergency' },
  security: { icon: '🚨', color: '#8b5cf6', label: 'Security' },
  medical_emergency: { icon: '🏥', color: '#10b981', label: 'Medical Emergency' },
};

// Urgency level configurations
const urgencyConfig = {
  5: { label: 'Critical', color: '#dc2626', icon: 'exclamationmark.triangle.fill' },
  4: { label: 'High', color: '#f59e0b', icon: 'exclamationmark.circle.fill' },
  3: { label: 'Medium', color: '#3b82f6', icon: 'bell.fill' },
  2: { label: 'Low', color: '#10b981', icon: 'bell' },
  1: { label: 'Info', color: '#6b7280', icon: 'info.circle' },
};

// Status configurations
const statusConfig = {
  active: { label: 'Active', color: '#ef4444', icon: 'bell.badge.fill' },
  acknowledged: { label: 'Acknowledged', color: '#f59e0b', icon: 'checkmark.circle.fill' },
  resolved: { label: 'Resolved', color: '#10b981', icon: 'checkmark.seal.fill' },
  escalated: { label: 'Escalated', color: '#8b5cf6', icon: 'arrow.up.circle.fill' },
};

// Timeline Event Component (unused - kept for future implementation)
const TimelineEvent = ({ event, index, isLast }: any) => {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const scale = useSharedValue(1);
  const { isMobile } = useResponsive();
  
  const handlePress = () => {
    haptic('light');
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }, 100);
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const eventConfig = {
    created: { icon: 'plus.circle.fill', color: theme.primary },
    acknowledged: { icon: 'checkmark.circle.fill', color: theme.accent },
    urgency_changed: { icon: 'arrow.up.arrow.down.circle.fill', color: theme.primary },
    escalated: { icon: 'arrow.up.circle.fill', color: theme.destructive },
    resolved: { icon: 'checkmark.seal.fill', color: theme.success },
    note_added: { icon: 'note.text', color: theme.mutedForeground },
  };
  
  const config = eventConfig[event.eventType as keyof typeof eventConfig] || 
                 { icon: 'circle.fill', color: theme.mutedForeground };
  
  return (
    <AnimatedPressable
      onPress={handlePress}
      entering={FadeInDown.delay(index * 50).springify()}
    >
      <Animated.View style={animatedStyle}>
        <HStack gap={3} align="start">
          {/* Timeline Line */}
          <View style={{ alignItems: 'center', width: 40 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: config.color + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Symbol name={config.icon as any} size={20} color={config.color} />
            </View>
            {!isLast && (
              <View
                style={{
                  position: 'absolute',
                  top: 40,
                  width: 2,
                  height: 80,
                  backgroundColor: theme.border,
                }}
              />
            )}
          </View>
          
          {/* Event Content */}
          <VStack style={{ flex: 1, paddingBottom: isLast ? 0 : spacing[6] }}>
            <Text weight="semibold" size={isMobile ? 'sm' : 'base'}>
              {event.description}
            </Text>
            <HStack gap={2} align="center" style={{ marginTop: spacing[1] }}>
              <Text size="xs" colorTheme="mutedForeground">
                {formatDistanceToNow(new Date(event.eventTime), { addSuffix: true })}
              </Text>
              {event.userName && (
                <>
                  <Text size="xs" colorTheme="mutedForeground">•</Text>
                  <Text size="xs" colorTheme="mutedForeground">
                    by {event.userName}
                  </Text>
                </>
              )}
            </HStack>
            {event.metadata && (
              <GlassCard style={{ marginTop: spacing[2], padding: spacing[2] }}>
                <Text size="xs" colorTheme="mutedForeground">
                  {JSON.stringify(event.metadata, null, 2)}
                </Text>
              </GlassCard>
            )}
          </VStack>
        </HStack>
      </Animated.View>
    </AnimatedPressable>
  );
};

// Alert History Card Component
const AlertHistoryCard = ({ alert, index, onPress }: any) => {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile } = useResponsive();
  const scale = useSharedValue(1);
  
  const typeConfig = alertTypeConfig[alert.alertType as keyof typeof alertTypeConfig] || 
                    { icon: '🔔', color: theme.primary, label: alert.alertType };
  const urgencyConf = urgencyConfig[alert.urgencyLevel as keyof typeof urgencyConfig];
  const statusConf = statusConfig[alert.status as keyof typeof statusConfig];
  
  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <AnimatedPressable
      onPress={() => onPress(alert)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      entering={FadeInDown.delay(index * 50).springify()}
      style={animatedStyle}
    >
      <GlassCard
        style={{
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border + '30',
        }}
      >
        {/* Gradient Background */}
        <LinearGradient
          colors={[typeConfig.color + '10', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        
        <VStack gap={3} p={4}>
          {/* Header */}
          <HStack justifyContent="space-between" align="start">
            <HStack gap={3} align="center" style={{ flex: 1 }}>
              {/* Type Icon */}
              <View
                style={{
                  width: isMobile ? 44 : 52,
                  height: isMobile ? 44 : 52,
                  borderRadius: isMobile ? 12 : 14,
                  backgroundColor: typeConfig.color + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text size={isMobile ? 'xl' : '2xl'}>{typeConfig.icon}</Text>
              </View>
              
              {/* Alert Info */}
              <VStack style={{ flex: 1 }}>
                <HStack gap={2} align="center">
                  <Text weight="bold" size={isMobile ? 'base' : 'lg'}>
                    Room {alert.roomNumber}
                  </Text>
                  <Badge
                    size="sm"
                    style={{
                      backgroundColor: statusConf.color + '20',
                      borderColor: statusConf.color,
                    }}
                  >
                    <HStack gap={1} align="center">
                      <Symbol 
                        name={statusConf.icon as any} 
                        size={10} 
                        color={statusConf.color} 
                      />
                      <Text size="xs" style={{ color: statusConf.color }}>
                        {statusConf.label}
                      </Text>
                    </HStack>
                  </Badge>
                </HStack>
                <Text size="sm" colorTheme="mutedForeground">
                  {typeConfig.label}
                </Text>
              </VStack>
            </HStack>
            
            {/* Urgency Badge */}
            <Badge
              variant="outline"
              size="sm"
              style={{
                borderColor: urgencyConf.color,
                backgroundColor: urgencyConf.color + '10',
              }}
            >
              <HStack gap={1} align="center">
                <Symbol 
                  name={urgencyConf.icon as any} 
                  size={12} 
                  color={urgencyConf.color} 
                />
                <Text size="xs" weight="semibold" style={{ color: urgencyConf.color }}>
                  {urgencyConf.label}
                </Text>
              </HStack>
            </Badge>
          </HStack>
          
          {/* Description */}
          {alert.description && (
            <Text size="sm" colorTheme="mutedForeground" numberOfLines={2}>
              {alert.description}
            </Text>
          )}
          
          {/* Timeline Info */}
          <HStack gap={4} align="center">
            <HStack gap={1} align="center">
              <Symbol name="clock" size={14} color={theme.mutedForeground} />
              <Text size="xs" colorTheme="mutedForeground">
                Created {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
              </Text>
            </HStack>
            
            {alert.resolvedAt && (
              <>
                <Text size="xs" colorTheme="mutedForeground">•</Text>
                <HStack gap={1} align="center">
                  <Symbol name="checkmark.circle.fill" size={14} color={theme.success} />
                  <Text size="xs" colorTheme="mutedForeground">
                    Resolved in {formatDistanceToNow(new Date(alert.createdAt), { 
                      includeSeconds: false 
                    })}
                  </Text>
                </HStack>
              </>
            )}
          </HStack>
          
          {/* Response Team */}
          {(alert.createdByName || alert.acknowledgedByName) && (
            <HStack gap={3} align="center">
              {alert.createdByName && (
                <HStack gap={1} align="center">
                  <Symbol name="person.circle" size={14} color={theme.mutedForeground} />
                  <Text size="xs" colorTheme="mutedForeground">
                    Created by {alert.createdByName}
                  </Text>
                </HStack>
              )}
              
              {alert.acknowledgedByName && (
                <>
                  <Text size="xs" colorTheme="mutedForeground">•</Text>
                  <HStack gap={1} align="center">
                    <Symbol name="person.circle.fill" size={14} color={theme.accent} />
                    <Text size="xs" colorTheme="mutedForeground">
                      Ack by {alert.acknowledgedByName}
                    </Text>
                  </HStack>
                </>
              )}
            </HStack>
          )}
        </VStack>
      </GlassCard>
    </AnimatedPressable>
  );
};

// Statistics Card Component
const StatCard = ({ title, value, subtitle, icon, color, trend }: any) => {
  const theme = useTheme();
  // const { spacing } = useSpacing();
  const { isMobile } = useResponsive();
  const scale = useSharedValue(1);
  
  React.useEffect(() => {
    scale.value = withSpring(1, {
      damping: 10,
      stiffness: 100,
      mass: 0.8,
    });
  }, [scale]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]} entering={FadeIn.delay(100).springify()}>
      <GlassCard style={{ height: '100%' }}>
        <VStack gap={2} p={isMobile ? 3 : 4}>
          <HStack justifyContent="space-between" align="center">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: color + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Symbol name={icon as any} size={20} color={color} />
            </View>
            {trend && (
              <Badge size="sm" variant="outline" style={{ borderColor: trend > 0 ? theme.success : theme.destructive }}>
                <HStack gap={0.5} align="center">
                  <Symbol 
                    name={trend > 0 ? "arrow.up" : "arrow.down"} 
                    size={10} 
                    color={trend > 0 ? theme.success : theme.destructive} 
                  />
                  <Text size="xs" style={{ color: trend > 0 ? theme.success : theme.destructive }}>
                    {Math.abs(trend)}%
                  </Text>
                </HStack>
              </Badge>
            )}
          </HStack>
          
          <VStack gap={0.5}>
            <Text size={isMobile ? '2xl' : '3xl'} weight="bold">
              {value}
            </Text>
            <Text size="xs" colorTheme="mutedForeground">
              {title}
            </Text>
            {subtitle && (
              <Text size="xs" colorTheme="mutedForeground" style={{ opacity: 0.7 }}>
                {subtitle}
              </Text>
            )}
          </VStack>
        </VStack>
      </GlassCard>
    </Animated.View>
  );
};

export default function AlertHistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isDesktop } = useResponsive();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  
  // Hospital context validation
  const hospitalContext = useHospitalContext();
  const hospitalId = hospitalContext.hospitalId || '';
  
  // Log authentication state
  React.useEffect(() => {
    logger.healthcare.info('AlertHistoryScreen auth state', {
      isAuthenticated: !!user,
      userId: user?.id,
      userRole: user?.role,
      hasHospitalContext: !!hospitalContext.hospitalId,
      hospitalId: hospitalContext.hospitalId,
    });
  }, [user, hospitalContext]);
  
  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date | undefined;
    
    switch (timeRange) {
      case '24h':
        startDate = subDays(now, 1);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case 'all':
        startDate = undefined;
        break;
      default:
        startDate = subDays(now, 7);
    }
    
    return {
      startDate: startDate ? startOfDay(startDate) : undefined,
      endDate: endOfDay(now),
    };
  }, [timeRange]);
  
  // Check if user has permission to view alerts
  const hasPermission = React.useMemo(() => {
    if (!user) return false;
    const allowedRoles = ['operator', 'doctor', 'nurse', 'head_doctor', 'admin'];
    return allowedRoles.includes(user.role);
  }, [user]);
  
  // Fetch alert history
  const { data, isLoading, error, refetch } = api.healthcare.getAlertHistory.useQuery(
    { 
      hospitalId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    { 
      enabled: !!user && !!hospitalId && hasPermission,
      retry: 1
    }
  );
  
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic('light');
    try {
      await refetch();
      haptic('success');
    } catch (error) {
      haptic('error');
    }
    setRefreshing(false);
  }, [refetch]);
  
  // Filter alerts
  const filteredAlerts = useMemo(() => {
    let alerts = data?.alerts || [];
    
    // Search filter
    if (searchQuery) {
      alerts = alerts.filter(alert => 
        alert.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.alertType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      alerts = alerts.filter(alert => alert.status === statusFilter);
    }
    
    // Urgency filter
    if (urgencyFilter !== 'all') {
      alerts = alerts.filter(alert => alert.urgencyLevel === parseInt(urgencyFilter));
    }
    
    return alerts;
  }, [data?.alerts, searchQuery, statusFilter, urgencyFilter]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    const alerts = data?.alerts || [];
    const resolved = alerts.filter(a => a.status === 'resolved');
    const totalResponseTime = resolved.reduce((sum, alert) => {
      if (alert.acknowledgedAt && alert.createdAt) {
        return sum + (new Date(alert.acknowledgedAt).getTime() - new Date(alert.createdAt).getTime());
      }
      return sum;
    }, 0);
    
    const avgResponseTime = resolved.length > 0 
      ? Math.round(totalResponseTime / resolved.length / 1000 / 60) // in minutes
      : 0;
    
    return {
      total: alerts.length,
      resolved: resolved.length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      avgResponseTime,
      criticalCount: alerts.filter(a => a.urgencyLevel === 5).length,
    };
  }, [data?.alerts]);
  
  const handleAlertPress = (alert: any) => {
    haptic('light');
    router.push(`/alerts/${alert.id}`);
  };
  
  // Not authenticated
  if (!user) {
    return (
      <Container>
        <VStack gap={4} p={4} align="center" justify="center" style={{ flex: 1 }}>
          <Symbol name="person.crop.circle.badge.exclamationmark" size={48} color={theme.destructive} />
          <Text size="lg" weight="semibold">Authentication Required</Text>
          <Text colorTheme="mutedForeground" align="center">
            Please log in to view alert history.
          </Text>
          <Button onPress={() => router.push('/')} variant="default">
            Log In
          </Button>
        </VStack>
      </Container>
    );
  }
  
  // Loading state
  if (isLoading && !data) {
    return <LoadingView message="Loading alert history..." />;
  }
  
  // No permission state
  if (!hasPermission && user) {
    return (
      <Container>
        <VStack gap={4} p={4} align="center" justify="center" style={{ flex: 1 }}>
          <Symbol name="lock.shield" size={48} color={theme.accent} />
          <Text size="lg" weight="semibold">Access Restricted</Text>
          <Text colorTheme="mutedForeground" align="center">
            Your role ({user.role}) doesn&apos;t have permission to view alert history.
          </Text>
          <Text size="sm" colorTheme="mutedForeground" align="center">
            Only operators, doctors, nurses, and administrators can access this feature.
          </Text>
          <Button onPress={() => router.back()} variant="outline">
            Go Back
          </Button>
        </VStack>
      </Container>
    );
  }
  
  // Error state
  if (error && !data) {
    return (
      <Container>
        <VStack gap={4} p={4} align="center" justify="center" style={{ flex: 1 }}>
          <Symbol name="exclamationmark.triangle" size={48} color={theme.destructive} />
          <Text size="lg" weight="semibold">Failed to Load History</Text>
          <Text colorTheme="mutedForeground" align="center">
            {error.message || 'Unable to fetch alert history'}
          </Text>
          <Button onPress={handleRefresh} variant="default">
            Try Again
          </Button>
        </VStack>
      </Container>
    );
  }
  
  const content = (
    <VStack gap={4}>
      {/* Statistics */}
      <VStack gap={3}>
        <Text size="lg" weight="semibold">Overview</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[3] }}
        >
          <View style={{ width: isMobile ? 140 : 160 }}>
            <StatCard
              title="Total Alerts"
              value={stats.total}
              subtitle={`Last ${timeRange}`}
              icon="bell.fill"
              color={theme.primary}
            />
          </View>
          <View style={{ width: isMobile ? 140 : 160 }}>
            <StatCard
              title="Resolved"
              value={stats.resolved}
              subtitle={`${Math.round((stats.resolved / stats.total) * 100) || 0}% of total`}
              icon="checkmark.seal.fill"
              color={theme.success}
              trend={12}
            />
          </View>
          <View style={{ width: isMobile ? 140 : 160 }}>
            <StatCard
              title="Active"
              value={stats.active}
              subtitle="Currently active"
              icon="bell.badge.fill"
              color={theme.destructive}
            />
          </View>
          <View style={{ width: isMobile ? 140 : 160 }}>
            <StatCard
              title="Avg Response"
              value={`${stats.avgResponseTime}m`}
              subtitle="Response time"
              icon="clock.fill"
              color={theme.accent}
              trend={-8}
            />
          </View>
          <View style={{ width: isMobile ? 140 : 160 }}>
            <StatCard
              title="Critical"
              value={stats.criticalCount}
              subtitle="High priority"
              icon="exclamationmark.triangle.fill"
              color={theme.destructive}
            />
          </View>
        </ScrollView>
      </VStack>
      
      {/* Filters */}
      <GlassCard>
        <VStack gap={3} p={3}>
          <Input
            placeholder="Search alerts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Symbol name="magnifyingglass" size={20} color={theme.mutedForeground} />}
            rightIcon={
              searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Symbol name="xmark.circle.fill" size={20} color={theme.mutedForeground} />
                </Pressable>
              ) : null
            }
          />
          
          <HStack gap={2}>
            <View style={{ flex: 1 }}>
              <Select 
                value={timeRange} 
                onValueChange={(value) => setTimeRange(value as string)}
                options={[
                  { label: "Last 24 Hours", value: "24h" },
                  { label: "Last 7 Days", value: "7d" },
                  { label: "Last 30 Days", value: "30d" },
                  { label: "All Time", value: "all" }
                ]}
                size="sm"
              />
            </View>
            
            <View style={{ flex: 1 }}>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => setStatusFilter(value as string)}
                options={[
                  { label: "All Status", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Acknowledged", value: "acknowledged" },
                  { label: "Resolved", value: "resolved" },
                ]}
                size="sm"
              />
            </View>
            
            {!isMobile && (
              <View style={{ flex: 1 }}>
                <Select 
                  value={urgencyFilter} 
                  onValueChange={(value) => setUrgencyFilter(value as string)}
                  options={[
                    { label: "All Urgency", value: "all" },
                    { label: "Critical", value: "5" },
                    { label: "High", value: "4" },
                    { label: "Medium", value: "3" },
                    { label: "Low", value: "2" },
                  ]}
                  size="sm"
                />
              </View>
            )}
          </HStack>
        </VStack>
      </GlassCard>
      
      {/* Alert List */}
      <VStack gap={3}>
        <HStack justifyContent="space-between" align="center">
          <Text weight="semibold" size="lg">Alert History</Text>
          <Badge variant="secondary" size="sm">
            <Text size="xs">{filteredAlerts.length} {filteredAlerts.length === 1 ? 'alert' : 'alerts'}</Text>
          </Badge>
        </HStack>
        
        {filteredAlerts.length === 0 ? (
          <EmptyState
            variant="no-results"
            title="No alerts found"
            description="Try adjusting your filters or search criteria"
            actions={[
              {
                label: 'Clear filters',
                onPress: () => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setUrgencyFilter('all');
                  setTimeRange('7d');
                },
                variant: 'outline',
              }
            ]}
          />
        ) : (
          <VStack gap={3}>
            {filteredAlerts.map((alert, index) => (
              <AlertHistoryCard
                key={alert.id}
                alert={alert}
                index={index}
                onPress={handleAlertPress}
              />
            ))}
          </VStack>
        )}
      </VStack>
    </VStack>
  );
  
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <UnifiedHeader 
        title="Alert History"
        subtitle="View and analyze past alerts"
        showBackButton
        rightElement={
          <Button
            variant="ghost"
            size="sm"
            onPress={handleRefresh}
          >
            <Symbol name="arrow.clockwise" size={20} />
          </Button>
        }
      />
      
      <ScrollView
        contentContainerStyle={{ 
          padding: spacing[4] as number, 
          paddingBottom: spacing[8] as number 
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {content}
      </ScrollView>
      
    </View>
  );
}