import React, { useState, useCallback, useRef } from 'react';
import { View, Pressable, Platform, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { Symbol } from '@/components/universal/display/Symbols';
import { Text, Badge, Box } from '@/components/universal';
import { NavigationDrawer } from './NavigationDrawer';
import { UnifiedHeader } from './UnifiedHeader';
import { FloatingActionButton } from '@/components/universal/interaction/FloatingActionButton';
import { 
  navigationConfig, 
  getTabBarItems, 
  filterNavigationByPermissions,
  quickActions 
} from '@/lib/config/navigation.config';
import { useHealthcareAccess } from '@/hooks/usePermissions';
import { useAlertStats } from '@/hooks/healthcare';
import { BlurView } from 'expo-blur';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MobileNavigationProps {
  children: React.ReactNode;
}

export function MobileNavigation({ children }: MobileNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { width: screenWidth } = Dimensions.get('window');
  
  // Permissions
  const {
    canViewAlerts,
    canViewPatients,
    canViewAnalytics,
    canManageShifts,
    canViewAuditLogs,
    canCreateAlerts,
  } = useHealthcareAccess();
  
  // Real-time alert stats
  const { data: alertStats } = useAlertStats({
    enabled: canViewAlerts,
  });
  
  // Build permissions object
  const permissions = {
    view_alerts: canViewAlerts,
    view_patients: canViewPatients,
    view_analytics: canViewAnalytics,
    manage_shifts: canManageShifts,
    view_audit_logs: canViewAuditLogs,
    create_alerts: canCreateAlerts,
  };
  
  // Filter navigation items based on permissions
  const filteredNavItems = filterNavigationByPermissions(navigationConfig, permissions);
  const tabItems = getTabBarItems(filteredNavItems);
  
  // Update badge counts
  const tabItemsWithBadges = tabItems.map(item => {
    if (item.id === 'alerts' && alertStats) {
      return { ...item, badge: alertStats.active || 0 };
    }
    return item;
  });
  
  // Tab bar height
  const TAB_BAR_HEIGHT = 56;
  const TOTAL_TAB_HEIGHT = TAB_BAR_HEIGHT + insets.bottom;
  
  // Check if current path matches
  const isPathActive = useCallback((href?: string) => {
    if (!href) return false;
    const cleanHref = href.replace('/(tabs)', '').replace('/(app)', '');
    const cleanPathname = pathname.replace('/(tabs)', '').replace('/(app)', '');
    return cleanHref === cleanPathname || (cleanHref !== '/' && cleanPathname.startsWith(cleanHref));
  }, [pathname]);
  
  // Handle tab press
  const handleTabPress = useCallback((item: any) => {
    haptic('light');
    
    if (item.id === 'more') {
      setDrawerOpen(true);
    } else if (item.href) {
      router.push(item.href);
    }
  }, [router]);
  
  // Tab item component
  const TabItem = ({ item, index }: { item: any; index: number }) => {
    const isActive = isPathActive(item.href);
    const scale = useSharedValue(1);
    const iconTranslateY = useSharedValue(0);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));
    
    const iconAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: iconTranslateY.value }],
    }));
    
    const handlePressIn = () => {
      scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
      iconTranslateY.value = withSpring(-2, { damping: 15, stiffness: 300 });
    };
    
    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      iconTranslateY.value = withSpring(0, { damping: 15, stiffness: 300 });
    };
    
    return (
      <AnimatedPressable
        onPress={() => handleTabPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: spacing[2],
            paddingBottom: spacing[1],
          },
          animatedStyle,
        ]}
      >
        <Animated.View style={[{ position: 'relative' }, iconAnimatedStyle]}>
          <Symbol
            name={item.icon}
            size={24}
            color={isActive ? theme.primary : theme.mutedForeground}
          />
          {item.badge !== undefined && item.badge > 0 && (
            <Badge
              variant={item.badgeVariant || 'error'}
              size="xs"
              style={{
                position: 'absolute',
                top: -6,
                right: -10,
                minWidth: 18,
                height: 18,
                paddingHorizontal: 4,
              }}
            >
              <Text size="xs" style={{ color: 'white' }}>{item.badge > 99 ? '99+' : item.badge}</Text>
            </Badge>
          )}
        </Animated.View>
        <Text
          size="xs"
          weight={isActive ? 'semibold' : 'normal'}
          style={{
            marginTop: spacing[1],
            color: isActive ? theme.primary : theme.mutedForeground,
          }}
        >
          {item.title}
        </Text>
      </AnimatedPressable>
    );
  };
  
  // Tab bar background (iOS blur effect)
  const TabBarBackground = () => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={80}
          tint={theme.scheme === 'dark' ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      );
    }
    
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.background + 'f8',
        }}
      />
    );
  };
  
  return (
    <>
      {/* Main content area */}
      <View style={{ flex: 1, paddingBottom: TOTAL_TAB_HEIGHT }}>
        {children}
      </View>
      
      {/* Tab bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: TOTAL_TAB_HEIGHT,
          borderTopWidth: 0.5,
          borderTopColor: theme.border + '30',
          overflow: 'hidden',
        }}
      >
        <TabBarBackground />
        <View
          style={{
            flexDirection: 'row',
            height: TAB_BAR_HEIGHT,
            paddingHorizontal: spacing[2],
          }}
        >
          {tabItemsWithBadges.map((item, index) => (
            <TabItem key={item.id} item={item} index={index} />
          ))}
        </View>
      </View>
      
      {/* Floating action button */}
      {canCreateAlerts && (
        <FloatingActionButton
          icon="plus"
          onPress={() => router.push('/create-alert')}
          style={{
            position: 'absolute',
            bottom: TOTAL_TAB_HEIGHT + 16,
            right: 16,
          }}
        />
      )}
      
      {/* Navigation drawer */}
      <NavigationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigationItems={filteredNavItems}
      />
    </>
  );
}