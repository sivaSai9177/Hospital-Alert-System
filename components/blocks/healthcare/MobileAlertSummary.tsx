import React from 'react';
import { View, ScrollView, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  Layout,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { useRouter } from 'expo-router';
import { Symbol } from '@/components/universal/display/Symbols';
import { Text, VStack, HStack, Badge, Box } from '@/components/universal';
import { EmptyState } from '@/components/universal/feedback/EmptyState';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Alert {
  id: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  room: string;
  type: string;
  time: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface MobileAlertSummaryProps {
  alerts?: Alert[];
  isLoading?: boolean;
  onViewAll?: () => void;
}

const urgencyConfig = {
  critical: {
    color: '#ef4444',
    icon: 'exclamationmark.triangle.fill',
    gradient: ['#ef444420', '#ef444405'],
  },
  high: {
    color: '#f97316',
    icon: 'exclamationmark.circle.fill',
    gradient: ['#f9731620', '#f9731605'],
  },
  medium: {
    color: '#3b82f6',
    icon: 'bell.fill',
    gradient: ['#3b82f620', '#3b82f605'],
  },
  low: {
    color: '#6b7280',
    icon: 'bell',
    gradient: ['#6b728020', '#6b728005'],
  },
};

function AlertItem({ alert, onPress }: { alert: Alert; onPress: () => void }) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const scale = useSharedValue(1);
  const config = urgencyConfig[alert.urgency];
  
  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle]}
    >
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border + '30',
          overflow: 'hidden',
          marginBottom: spacing[2] as number,
        }}
      >
        <LinearGradient
          colors={config.gradient}
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
        
        <HStack p={3} alignItems="center" gap={3}>
          {/* Urgency Icon */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: config.color + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Symbol name={config.icon as any} size={20} color={config.color} />
          </View>
          
          {/* Alert Details */}
          <VStack style={{ flex: 1 }} gap={1}>
            <HStack alignItems="center" gap={2}>
              <Text weight="semibold" size="base">Room {alert.room}</Text>
              {alert.status === 'acknowledged' && (
                <Badge variant="outline" size="sm">
                  <HStack gap={1} alignItems="center">
                    <Symbol name="checkmark.circle.fill" size={10} color={theme.success} />
                    <Text size="xs">Ack</Text>
                  </HStack>
                </Badge>
              )}
            </HStack>
            <Text size="sm" colorTheme="mutedForeground">{alert.type}</Text>
          </VStack>
          
          {/* Time and Arrow */}
          <VStack alignItems="flex-end" gap={1}>
            <Text size="xs" colorTheme="mutedForeground">{alert.time}</Text>
            <Symbol name="chevron.right" size={16} color={theme.mutedForeground} />
          </VStack>
        </HStack>
      </View>
    </AnimatedPressable>
  );
}

export function MobileAlertSummary({
  alerts = [],
  isLoading = false,
  onViewAll,
}: MobileAlertSummaryProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const router = useRouter();
  
  // Use actual alerts - no mock data
  const displayAlerts = alerts;
  
  const handleAlertPress = (alert: Alert) => {
    haptic('light');
    router.push(`/alerts/${alert.id}`);
  };
  
  const handleViewAll = () => {
    haptic('light');
    onViewAll ? onViewAll() : router.push('/alerts');
  };
  
  return (
    <View
      style={{
        backgroundColor: theme.background,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.border + '30',
        overflow: 'hidden',
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
          },
          android: {
            elevation: 2,
          },
        }),
      }}
    >
      {/* Header */}
      <HStack 
        p={4} 
        pb={3}
        justifyContent="space-between" 
        alignItems="center"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: theme.border + '20',
        }}
      >
        <HStack alignItems="center" gap={2}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: theme.destructive + '10',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Symbol name="bell.badge.fill" size={18} color={theme.destructive} />
          </View>
          <VStack gap={0}>
            <Text size="lg" weight="semibold">Active Alerts</Text>
            <Text size="xs" colorTheme="mutedForeground">
              {displayAlerts.length} requires attention
            </Text>
          </VStack>
        </HStack>
        
        <Pressable onPress={handleViewAll}>
          <HStack alignItems="center" gap={1}>
            <Text size="sm" style={{ color: theme.primary }} weight="medium">
              View All
            </Text>
            <Symbol name="arrow.right" size={14} color={theme.primary} />
          </HStack>
        </Pressable>
      </HStack>
      
      {/* Alert List */}
      <VStack p={4} pt={3}>
        {isLoading ? (
          <VStack gap={2}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  height: 72,
                  backgroundColor: theme.muted + '20',
                  borderRadius: 16,
                }}
              />
            ))}
          </VStack>
        ) : displayAlerts.length === 0 ? (
          <View style={{ paddingVertical: spacing[4] as number, alignItems: 'center' }}>
            <EmptyState
              variant="no-alerts"
              title="All Clear!"
              description="No active alerts at the moment"
              compact
            />
          </View>
        ) : (
          <>
            {displayAlerts.map((alert, index) => (
              <Animated.View
                key={alert.id}
                entering={FadeIn.delay(index * 50).springify()}
                layout={Layout.springify()}
              >
                <AlertItem
                  alert={alert}
                  onPress={() => handleAlertPress(alert)}
                />
              </Animated.View>
            ))}
          </>
        )}
      </VStack>
    </View>
  );
}