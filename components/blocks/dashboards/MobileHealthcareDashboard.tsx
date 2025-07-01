import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  VStack,
  HStack,
  Text,
  Avatar,
  Badge,
  Container,
} from '@/components/universal';
import { 
  MobileMetricCard,
  MobileAlertSummary,
  MobileQuickActions,
  MobileShiftStatus,
} from '@/components/blocks/healthcare';
import { useAlertStats, useMyPatients, useShiftStatus } from '@/hooks/healthcare';

export function MobileHealthcareDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  
  // Get stats
  const { stats: alertStats } = useAlertStats();
  const { data: patientsData } = useMyPatients();
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    haptic('light');
    
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
      haptic('success');
    }, 1500);
  }, []);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  
  return (
    <Container 
      safe={false} 
      scroll 
      style={{ flex: 1, backgroundColor: theme.background }}
      scrollProps={{
        contentContainerStyle: { 
          paddingBottom: 120, // Account for tab bar
          flexGrow: 1,
        },
        showsVerticalScrollIndicator: false,
        bounces: true,
        scrollEnabled: true,
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        )
      }}
    >
      {/* Header with gradient background */}
      <View>
        <LinearGradient
          colors={[theme.primary + '15', theme.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            paddingTop: insets.top + (spacing[2] as number),
            paddingBottom: spacing[6] as number,
            paddingHorizontal: spacing[3] as number,
          }}
        >
          <VStack gap={3}>
            {/* User Info */}
            <Animated.View entering={FadeIn.delay(100).springify()}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack gap={0.5}>
                  <Text size="xl" weight="bold">
                    {getGreeting()}, {user?.name?.split(' ')[0]}
                  </Text>
                  <HStack alignItems="center" gap={1.5}>
                    <Badge variant="outline" size="xs">
                      {user?.role?.replace('_', ' ')}
                    </Badge>
                    <Text size="xs" colorTheme="mutedForeground">
                      St. Mary's Medical
                    </Text>
                  </HStack>
                </VStack>
                
                <Avatar
                  source={user?.image ? { uri: user.image } : undefined}
                  name={user?.name || 'User'}
                  size="lg"
                  style={{
                    width: 48,
                    height: 48,
                    borderWidth: 2,
                    borderColor: theme.background,
                    ...Platform.select({
                      ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                      },
                      android: {
                        elevation: 4,
                      },
                    }),
                  }}
                />
              </HStack>
            </Animated.View>
            
            {/* Shift Status Compact */}
            <Animated.View entering={FadeIn.delay(200).springify()}>
              <MobileShiftStatus compact onPress={() => router.push('/shifts')} />
            </Animated.View>
          </VStack>
        </LinearGradient>
        
        {/* Metrics Cards - Overlapping gradient */}
        <View style={{ marginTop: -(spacing[6] as number), paddingHorizontal: spacing[3] as number }}>
          <VStack gap={3}>
            <HStack gap={3}>
              <Animated.View 
                entering={FadeIn.delay(300).springify()} 
                style={{ flex: 1 }}
              >
                <MobileMetricCard
                  title="Active Alerts"
                  value={alertStats?.active || 8}
                  change={-12}
                  trend="down"
                  icon="bell.badge.fill"
                  color="#ef4444"
                  gradient={['#ef444430', '#ef444410']}
                  onPress={() => router.push('/alerts')}
                  isLive
                />
              </Animated.View>
              
              <Animated.View 
                entering={FadeIn.delay(400).springify()} 
                style={{ flex: 1 }}
              >
                <MobileMetricCard
                  title="My Patients"
                  value={patientsData?.patients?.length || 12}
                  subtitle="2 critical"
                  icon="person.2.fill"
                  color="#3b82f6"
                  gradient={['#3b82f630', '#3b82f610']}
                  onPress={() => router.push('/patients')}
                />
              </Animated.View>
            </HStack>
            
            <HStack gap={3}>
              <Animated.View 
                entering={FadeIn.delay(500).springify()} 
                style={{ flex: 1 }}
              >
                <MobileMetricCard
                  title="Response Time"
                  value="2.3m"
                  change={-15}
                  trend="down"
                  icon="timer"
                  color="#10b981"
                  gradient={['#10b98130', '#10b98110']}
                  onPress={() => router.push('/analytics')}
                />
              </Animated.View>
              
              <Animated.View 
                entering={FadeIn.delay(600).springify()} 
                style={{ flex: 1 }}
              >
                <MobileMetricCard
                  title="Tasks Today"
                  value={24}
                  subtitle="6 completed"
                  icon="checkmark.circle.fill"
                  color="#f59e0b"
                  gradient={['#f59e0b30', '#f59e0b10']}
                  onPress={() => router.push('/tasks')}
                />
              </Animated.View>
            </HStack>
          </VStack>
        </View>
      </View>
      
      <VStack gap={5} style={{ marginTop: spacing[6] as number }}>
        {/* Quick Actions */}
        <Animated.View 
          entering={FadeIn.delay(700).springify()}
          layout={Layout.springify()}
        >
          <MobileQuickActions />
        </Animated.View>
        
        {/* Alert Summary */}
        <Animated.View 
          entering={FadeIn.delay(800).springify()}
          layout={Layout.springify()}
          style={{ paddingHorizontal: spacing[3] as number }}
        >
          <MobileAlertSummary />
        </Animated.View>
        
        {/* Full Shift Status */}
        <Animated.View 
          entering={FadeIn.delay(900).springify()}
          layout={Layout.springify()}
          style={{ paddingHorizontal: spacing[3] as number }}
        >
          <MobileShiftStatus onPress={() => router.push('/shifts')} />
        </Animated.View>
      </VStack>
    </Container>
  );
}