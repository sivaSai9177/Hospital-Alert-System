import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import Svg, { Line, Circle, G, Text as SvgText, Rect } from 'react-native-svg';
import { VStack, HStack } from '@/components/universal/layout';
import { Text } from '@/components/universal/typography';
import { Badge, Avatar } from '@/components/universal/display';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { HEALTHCARE_ESCALATION_TIERS } from '@/types/healthcare';
import type { Alert } from '@/types/alert';

interface AlertEscalation {
  id: string;
  alertId: string;
  from_role: string;
  to_role: string;
  escalatedAt: Date;
  reason?: string | null;
  userId?: string;
  userName?: string;
}

interface EscalationTimelineProps {
  alert: Alert;
  escalations?: AlertEscalation[];
  currentTier: number;
  nextEscalationAt?: Date | null;
  onTierPress?: (tier: number) => void;
}

interface TierData {
  tier: number;
  role: string;
  timeout: number;
  status: 'completed' | 'current' | 'pending';
  escalatedAt?: Date;
  acknowledgedBy?: string;
  acknowledgedByName?: string;
  timeRemaining?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function EscalationTimeline({
  alert,
  escalations = [],
  currentTier,
  nextEscalationAt,
  onTierPress,
}: EscalationTimelineProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const screenWidth = Dimensions.get('window').width;
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  // Animation values
  const pulseAnimation = useSharedValue(1);
  const progressAnimation = useSharedValue(0);
  
  // Update countdown every minute
  useEffect(() => {
    if (alert.status === 'active' && nextEscalationAt) {
      const interval = setInterval(() => {
        forceUpdate(); // Force re-render to update countdown
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [alert.status, nextEscalationAt]);
  
  // Calculate timeline dimensions
  const padding = spacing[4] as number;
  const timelineWidth = screenWidth - (padding * 2);
  const tierSpacing = timelineWidth / (HEALTHCARE_ESCALATION_TIERS.length + 1);
  const timelineHeight = 200;
  
  // Prepare tier data
  const tierData = useMemo<TierData[]>(() => {
    return HEALTHCARE_ESCALATION_TIERS.map((tier, index) => {
      const tierNumber = index + 1;
      const escalation = escalations.find(e => e.to_role === tier.role);
      
      let status: 'completed' | 'current' | 'pending' = 'pending';
      if (tierNumber < currentTier) {
        status = 'completed';
      } else if (tierNumber === currentTier) {
        status = 'current';
      }
      
      const timeRemaining = nextEscalationAt && tierNumber === currentTier
        ? Math.max(0, differenceInMinutes(new Date(nextEscalationAt), new Date()))
        : undefined;
      
      return {
        tier: tierNumber,
        role: tier.role,
        timeout: tier.timeout_minutes,
        status,
        escalatedAt: escalation?.escalatedAt,
        acknowledgedBy: escalation?.userId,
        acknowledgedByName: escalation?.userName,
        timeRemaining,
      };
    });
  }, [currentTier, escalations, nextEscalationAt]);
  
  // Animate current tier
  useEffect(() => {
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );
  }, [pulseAnimation]);
  
  // Animate progress bar
  useEffect(() => {
    if (nextEscalationAt && currentTier <= HEALTHCARE_ESCALATION_TIERS.length) {
      const currentTierData = HEALTHCARE_ESCALATION_TIERS[currentTier - 1];
      if (currentTierData) {
        const totalMinutes = currentTierData.timeout_minutes;
        const elapsedMinutes = totalMinutes - (tierData[currentTier - 1]?.timeRemaining || 0);
        const progress = elapsedMinutes / totalMinutes;
        
        progressAnimation.value = withTiming(progress, { duration: 500 });
      }
    }
  }, [currentTier, nextEscalationAt, progressAnimation, tierData]);
  
  const getNodeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.success || '#10b981';
      case 'current':
        return theme.destructive || '#ef4444';
      case 'pending':
        return theme.mutedForeground || '#9ca3af';
      default:
        return theme.border;
    }
  };
  
  const pulseStyle = useAnimatedStyle(() => ({
    r: interpolate(pulseAnimation.value, [1, 1.2], [12, 16]),
    opacity: interpolate(pulseAnimation.value, [1, 1.2], [1, 0.8]),
  }));
  
  return (
    <VStack gap={spacing[3] as any}>
      <HStack justifyContent="space-between" alignItems="center">
        <Text size="lg" weight="semibold">Escalation Timeline</Text>
        {alert.status === 'active' && currentTier <= HEALTHCARE_ESCALATION_TIERS.length && (
          <Badge variant="destructive">
            <Text size="xs" style={{ color: 'white' }}>
              Tier {currentTier} Active
            </Text>
          </Badge>
        )}
      </HStack>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: spacing[2] as number }}
      >
        <Svg width={timelineWidth} height={timelineHeight}>
          {/* Timeline base line */}
          <Line
            x1={tierSpacing / 2}
            y1={timelineHeight / 2}
            x2={timelineWidth - tierSpacing / 2}
            y2={timelineHeight / 2}
            stroke={theme.border}
            strokeWidth={2}
            strokeDasharray="5,5"
          />
          
          {/* Progress line for completed tiers */}
          {currentTier > 1 && (
            <Line
              x1={tierSpacing / 2}
              y1={timelineHeight / 2}
              x2={tierSpacing * (currentTier - 0.5)}
              y2={timelineHeight / 2}
              stroke={theme.success || '#10b981'}
              strokeWidth={3}
            />
          )}
          
          {/* Tier nodes */}
          {tierData.map((tier, index) => {
            const x = tierSpacing * (index + 1);
            const y = timelineHeight / 2;
            
            return (
              <G key={tier.tier}>
                {/* Node circle */}
                {tier.status === 'current' ? (
                  <AnimatedCircle
                    cx={x}
                    cy={y}
                    r={12}
                    fill={getNodeColor(tier.status)}
                    animatedProps={pulseStyle}
                  />
                ) : (
                  <Circle
                    cx={x}
                    cy={y}
                    r={12}
                    fill={getNodeColor(tier.status)}
                    opacity={tier.status === 'pending' ? 0.5 : 1}
                  />
                )}
                
                {/* Tier number */}
                <SvgText
                  x={x}
                  y={y + 5}
                  fontSize={12}
                  fontWeight="bold"
                  fill="white"
                  textAnchor="middle"
                >
                  {tier.tier}
                </SvgText>
                
                {/* Role label */}
                <SvgText
                  x={x}
                  y={y - 25}
                  fontSize={11}
                  fill={theme.foreground}
                  textAnchor="middle"
                  fontWeight={tier.status === 'current' ? 'bold' : 'normal'}
                >
                  {tier.role.charAt(0).toUpperCase() + tier.role.slice(1)}
                </SvgText>
                
                {/* Time label */}
                <SvgText
                  x={x}
                  y={y + 35}
                  fontSize={10}
                  fill={theme.mutedForeground}
                  textAnchor="middle"
                >
                  {tier.status === 'current' && tier.timeRemaining !== undefined
                    ? `${tier.timeRemaining}m left`
                    : `${tier.timeout}m`
                  }
                </SvgText>
                
                {/* Progress indicator for current tier */}
                {tier.status === 'current' && (
                  <Rect
                    x={x - 30}
                    y={y + 45}
                    width={60}
                    height={4}
                    rx={2}
                    fill={theme.border}
                  />
                )}
              </G>
            );
          })}
        </Svg>
      </ScrollView>
      
      {/* Tier details */}
      <VStack gap={spacing[2] as any}>
        {tierData.filter(tier => tier.status !== 'pending').map((tier) => (
          <HStack 
            key={tier.tier}
            gap={spacing[3] as any} 
            alignItems="center"
            p={spacing[2]}
            style={{
              backgroundColor: tier.status === 'current' ? theme.destructive + '10' : theme.muted,
              borderRadius: 8,
              borderWidth: tier.status === 'current' ? 1 : 0,
              borderColor: theme.destructive,
            }}
          >
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: getNodeColor(tier.status),
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text size="sm" weight="bold" style={{ color: 'white' }}>
                {tier.tier}
              </Text>
            </View>
            
            <VStack style={{ flex: 1 }}>
              <Text size="sm" weight="semibold">
                Tier {tier.tier}: {tier.role.charAt(0).toUpperCase() + tier.role.slice(1)}
              </Text>
              {tier.status === 'completed' && tier.escalatedAt && (
                <Text size="xs" colorTheme="mutedForeground">
                  Escalated {formatDistanceToNow(new Date(tier.escalatedAt))} ago
                </Text>
              )}
              {tier.status === 'current' && (
                <Text size="xs" style={{ color: theme.destructive }}>
                  {tier.timeRemaining} minutes until next escalation
                </Text>
              )}
            </VStack>
            
            {tier.acknowledgedByName && (
              <Avatar
                name={tier.acknowledgedByName}
                size="sm"
              />
            )}
          </HStack>
        ))}
      </VStack>
      
      {/* Legend */}
      <HStack gap={spacing[4] as any} justifyContent="center">
        <HStack gap={spacing[1] as any} alignItems="center">
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: theme.success,
          }} />
          <Text size="xs" colorTheme="mutedForeground">Completed</Text>
        </HStack>
        <HStack gap={spacing[1] as any} alignItems="center">
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: theme.destructive,
          }} />
          <Text size="xs" colorTheme="mutedForeground">Active</Text>
        </HStack>
        <HStack gap={spacing[1] as any} alignItems="center">
          <View style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: theme.mutedForeground,
            opacity: 0.5,
          }} />
          <Text size="xs" colorTheme="mutedForeground">Pending</Text>
        </HStack>
      </HStack>
    </VStack>
  );
}