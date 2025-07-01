import React from 'react';
import { View, Pressable, Platform, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { useRouter } from 'expo-router';
import { Symbol } from '@/components/universal/display/Symbols';
import { Text, VStack, HStack } from '@/components/universal';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: screenWidth } = Dimensions.get('window');

interface QuickAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  gradient?: string[];
  route: string;
  badge?: number;
}

interface MobileQuickActionsProps {
  actions?: QuickAction[];
  columns?: number;
}

const defaultActions: QuickAction[] = [
  {
    id: 'create-alert',
    title: 'New Alert',
    subtitle: 'Report incident',
    icon: 'plus.circle.fill',
    color: '#ef4444',
    gradient: ['#ef4444', '#dc2626'],
    route: '/create-alert',
  },
  {
    id: 'patients',
    title: 'My Patients',
    subtitle: '12 active',
    icon: 'person.2.fill',
    color: '#3b82f6',
    gradient: ['#3b82f6', '#2563eb'],
    route: '/patients',
    badge: 12,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    subtitle: 'Next: 2:00 PM',
    icon: 'calendar',
    color: '#10b981',
    gradient: ['#10b981', '#059669'],
    route: '/schedule',
  },
  {
    id: 'messages',
    title: 'Messages',
    subtitle: '3 unread',
    icon: 'message.fill',
    color: '#8b5cf6',
    gradient: ['#8b5cf6', '#7c3aed'],
    route: '/messages',
    badge: 3,
  },
];

function QuickActionCard({ action, index }: { action: QuickAction; index: number }) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const router = useRouter();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  
  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
    rotation.value = withSpring(-3, { damping: 15, stiffness: 400 });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    rotation.value = withSpring(0, { damping: 15, stiffness: 400 });
  };
  
  const handlePress = () => {
    haptic('medium');
    // For create-alert, we need to use the modal route
    if (action.route === '/create-alert') {
      router.push('/(modals)/create-alert' as any);
    } else {
      router.push(action.route as any);
    }
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));
  
  const cardWidth = (screenWidth - 48 - 16) / 2; // 48 = padding, 16 = gap
  
  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).springify()}
      style={{ width: cardWidth }}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          {
            height: 110,
            borderRadius: 20,
            overflow: 'hidden',
            ...Platform.select({
              ios: {
                shadowColor: action.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
              },
              android: {
                elevation: 4,
              },
            }),
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={action.gradient || [action.color, action.color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        
        {/* Decorative circles */}
        <View
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />
        
        <VStack p={3} style={{ flex: 1 }} justifyContent="space-between">
          <HStack justifyContent="space-between" alignItems="flex-start">
            <Symbol name={action.icon as any} size={24} color="white" />
            {action.badge && (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  minWidth: 24,
                  alignItems: 'center',
                }}
              >
                <Text size="xs" weight="bold" style={{ color: action.color }}>
                  {action.badge}
                </Text>
              </View>
            )}
          </HStack>
          
          <VStack gap={0}>
            <Text size="base" weight="bold" style={{ color: 'white' }}>
              {action.title}
            </Text>
            {action.subtitle && (
              <Text size="xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {action.subtitle}
              </Text>
            )}
          </VStack>
        </VStack>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function MobileQuickActions({
  actions = defaultActions,
  columns = 2,
}: MobileQuickActionsProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  
  // Create rows from actions
  const rows = [];
  for (let i = 0; i < actions.length; i += columns) {
    rows.push(actions.slice(i, i + columns));
  }
  
  return (
    <VStack gap={3}>
      <HStack px={4} justifyContent="space-between" alignItems="center">
        <Text size="lg" weight="semibold">Quick Actions</Text>
        <Symbol name="square.grid.2x2" size={20} color={theme.mutedForeground} />
      </HStack>
      
      <VStack gap={3} px={4}>
        {rows.map((row, rowIndex) => (
          <HStack key={rowIndex} gap={3}>
            {row.map((action, index) => (
              <QuickActionCard
                key={action.id}
                action={action}
                index={rowIndex * columns + index}
              />
            ))}
            {/* Fill empty slots */}
            {row.length < columns && (
              <View style={{ flex: 1 }} />
            )}
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
}