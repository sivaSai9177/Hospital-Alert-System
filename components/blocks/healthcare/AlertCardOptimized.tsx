import * as React from 'react';
import { memo, useCallback, useMemo } from 'react';
import { 
  View, 
  Pressable, 
  Platform,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { VStack, HStack } from '@/components/universal/layout';
import { Text } from '@/components/universal/typography';
import { Badge, Symbol } from '@/components/universal/display';
import { Button } from '@/components/universal/interaction';
import { 
  ALERT_TYPE_CONFIG, 
  URGENCY_LEVEL_CONFIG,
} from '@/types/healthcare';
import type { AlertListItem } from '@/types/alert';
import { haptic } from '@/lib/ui/haptics';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useTheme } from '@/lib/theme/provider';
import { formatDistanceToNow } from 'date-fns';
import Animated, { 
  FadeInDown, 
  FadeOut,
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

interface AlertCardOptimizedProps {
  alert: AlertListItem;
  index: number;
  onPress?: () => void;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => Promise<void>;
  canAcknowledge?: boolean;
  canResolve?: boolean;
  isHighlighted?: boolean;
}

// Memoized sub-components for better performance
const UrgencyIndicator = memo(({ 
  urgencyLevel, 
  icon, 
  isActive 
}: { 
  urgencyLevel: number; 
  icon: string; 
  isActive: boolean;
}) => {
  const pulseAnimation = useSharedValue(1);
  
  React.useEffect(() => {
    if (urgencyLevel <= 2 && isActive) {
      pulseAnimation.value = withRepeat(
        withTiming(1.05, { duration: 1000 }),
        -1,
        true
      );
    }
  }, [urgencyLevel, isActive, pulseAnimation]);
  
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));
  
  const colors = useMemo(() => {
    switch (urgencyLevel) {
      case 1:
      case 2:
        return ['#ef4444', '#dc2626', '#b91c1c'];
      case 3:
        return ['#f59e0b', '#d97706', '#b45309'];
      case 4:
      case 5:
        return ['#3b82f6', '#2563eb', '#1d4ed8'];
      default:
        return ['#6b7280', '#4b5563', '#374151'];
    }
  }, [urgencyLevel]);
  
  return (
    <Animated.View style={pulseStyle}>
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        style={[
          styles.urgencyIndicator,
          !isActive && styles.inactiveIndicator
        ]}
      >
        <Text size="xl" style={{ color: 'white' }}>{icon}</Text>
      </LinearGradient>
    </Animated.View>
  );
});

UrgencyIndicator.displayName = 'UrgencyIndicator';

const AlertHeader = memo(({ 
  roomNumber, 
  alertType, 
  createdAt,
  urgencyLabel,
  urgencyColor,
  isHighlighted,
  status
}: {
  roomNumber: string;
  alertType: string;
  createdAt: Date;
  urgencyLabel: string;
  urgencyColor: string;
  isHighlighted?: boolean;
  status: string;
}) => {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const timeAgo = useMemo(() => formatDistanceToNow(new Date(createdAt)), [createdAt]);
  
  return (
    <VStack style={{ flex: 1 }}>
      <HStack gap={spacing[2] as any} alignItems="center">
        <Text weight="bold" size="xl">
          Room {roomNumber}
        </Text>
        {isHighlighted && (
          <Badge
            variant="default"
            style={{
              backgroundColor: '#10b981',
              borderColor: '#10b981',
            }}
          >
            <Text size="xs" weight="bold" style={{ color: 'white' }}>
              NEW
            </Text>
          </Badge>
        )}
        <Badge
          variant="outline"
          style={{
            backgroundColor: urgencyColor + '20',
            borderColor: urgencyColor,
          }}
        >
          <Text size="xs" style={{ color: urgencyColor }}>
            {urgencyLabel}
          </Text>
        </Badge>
      </HStack>
      
      <HStack gap={spacing[2] as any} alignItems="center">
        <Text size="sm" colorTheme="mutedForeground">
          {alertType.replace(/_/g, ' ').toUpperCase()}
        </Text>
        <Text size="xs" colorTheme="mutedForeground">
          • {timeAgo} ago
        </Text>
      </HStack>
      
      {status === 'acknowledged' && (
        <View style={styles.statusBadge}>
          <Symbol name="checkmark.circle.fill" size="sm" color="#10b981" />
        </View>
      )}
    </VStack>
  );
});

AlertHeader.displayName = 'AlertHeader';

export const AlertCardOptimized = memo<AlertCardOptimizedProps>(({
  alert,
  index,
  onPress,
  onAcknowledge,
  onResolve,
  canAcknowledge = false,
  canResolve = false,
  isHighlighted = false,
}) => {
  const { spacing } = useSpacing();
  const theme = useTheme();
  
  // Memoize config lookups
  const config = useMemo(() => 
    ALERT_TYPE_CONFIG[alert.alertType] || { icon: '🚨', color: 'destructive' },
    [alert.alertType]
  );
  
  const urgencyConfig = useMemo(() => 
    URGENCY_LEVEL_CONFIG[alert.urgencyLevel] || { label: `Level ${alert.urgencyLevel}`, color: 'destructive' },
    [alert.urgencyLevel]
  );
  
  const urgencyColors = useMemo(() => {
    switch (alert.urgencyLevel) {
      case 1:
      case 2:
        return ['#ef4444', '#dc2626', '#b91c1c'];
      case 3:
        return ['#f59e0b', '#d97706', '#b45309'];
      case 4:
      case 5:
        return ['#3b82f6', '#2563eb', '#1d4ed8'];
      default:
        return ['#6b7280', '#4b5563', '#374151'];
    }
  }, [alert.urgencyLevel]);
  
  // Highlight animation
  const highlightAnimation = useSharedValue(0);
  const glowAnimation = useSharedValue(0);
  
  React.useEffect(() => {
    if (isHighlighted) {
      highlightAnimation.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(1, { duration: 4400 }),
        withTiming(0, { duration: 300 })
      );
      glowAnimation.value = withRepeat(
        withTiming(1, { duration: 1500 }),
        3,
        true
      );
    }
  }, [isHighlighted, highlightAnimation, glowAnimation]);
  
  const handlePress = useCallback(() => {
    haptic('light');
    onPress?.();
  }, [onPress]);
  
  const handleAcknowledge = useCallback(() => {
    if (!canAcknowledge) return;
    
    haptic('medium');
    onAcknowledge?.(alert.id);
  }, [canAcknowledge, onAcknowledge, alert.id]);
  
  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlightAnimation.value,
  }));
  
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + glowAnimation.value * 0.05 }],
    opacity: 0.5 - glowAnimation.value * 0.5,
  }));
  
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 50, 300)).springify()}
      exiting={FadeOut}
      style={{ marginBottom: spacing[3] }}
    >
      <Pressable onPress={handlePress}>
        <View style={styles.cardContainer}>
          {/* Highlight Effects */}
          {isHighlighted && (
            <>
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  glowStyle,
                  {
                    backgroundColor: '#10b981',
                    borderRadius: 16,
                  },
                ]}
              />
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  highlightStyle,
                  {
                    borderRadius: 16,
                    borderWidth: 3,
                    borderColor: '#10b981',
                  },
                ]}
              />
            </>
          )}
          
          {/* Gradient Border */}
          <LinearGradient
            colors={urgencyColors as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            {/* Glass Card */}
            <View style={[styles.glassCard, { 
              backgroundColor: theme.card + 'ee', 
              padding: spacing[3] as number
            }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
              )}
              
              <VStack gap={spacing[2] as any}>
                {/* Header Section */}
                <HStack gap={spacing[3] as any} alignItems="center">
                  <UrgencyIndicator
                    urgencyLevel={alert.urgencyLevel}
                    icon={config.icon}
                    isActive={alert.status === 'active'}
                  />
                  
                  <AlertHeader
                    roomNumber={alert.roomNumber}
                    alertType={alert.alertType}
                    createdAt={alert.createdAt}
                    urgencyLabel={urgencyConfig.label}
                    urgencyColor={urgencyColors[0]}
                    isHighlighted={isHighlighted}
                    status={alert.status}
                  />
                </HStack>
                
                {/* Description */}
                {alert.description && (
                  <Text size="sm" colorTheme="mutedForeground" numberOfLines={2}>
                    {alert.description}
                  </Text>
                )}
                
                {/* Actions - Only for active alerts */}
                {alert.status === 'active' && canAcknowledge && (
                  <Button
                    onPress={handleAcknowledge}
                    variant="default"
                    size="sm"
                    fullWidth
                    style={{
                      backgroundColor: urgencyColors[0],
                    }}
                  >
                    <HStack gap={spacing[1] as any} alignItems="center">
                      <Symbol name="checkmark.circle" size="sm" color="white" />
                      <Text size="sm" style={{ color: 'white' }}>
                        Acknowledge
                      </Text>
                    </HStack>
                  </Button>
                )}
              </VStack>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Deep comparison for optimal performance
  return (
    prevProps.alert.id === nextProps.alert.id &&
    prevProps.alert.status === nextProps.alert.status &&
    prevProps.alert.urgencyLevel === nextProps.alert.urgencyLevel &&
    prevProps.alert.description === nextProps.alert.description &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.canAcknowledge === nextProps.canAcknowledge &&
    prevProps.canResolve === nextProps.canResolve &&
    prevProps.index === nextProps.index
  );
});

AlertCardOptimized.displayName = 'AlertCardOptimized';

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradientBorder: {
    padding: 1.5,
    borderRadius: 16,
  },
  glassCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  urgencyIndicator: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIndicator: {
    opacity: 0.6,
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b98120',
    alignItems: 'center',
    justifyContent: 'center',
  },
});