import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Pressable, Platform, Dimensions, PanResponder, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { Symbol } from '@/components/universal/display/Symbols';
import { Text, Badge, Box } from '@/components/universal';
import { UnifiedHeader } from './UnifiedHeader';
import { FloatingActionButton } from '@/components/universal/interaction/FloatingActionButton';
import { Drawer } from '@/components/universal/overlay/Drawer';
import { 
  navigationConfig, 
  getTabBarItems, 
  filterNavigationByPermissions,
  quickActions,
  supportNavigation
} from '@/lib/config/navigation.config';
import { useHealthcareAccess } from '@/hooks/usePermissions';
import { useAlertStats, useUnreadNotifications } from '@/hooks/healthcare';
import { HospitalSwitcher } from '@/components/blocks/organization';
import { SignOutButton } from '@/components/blocks/auth/SignOutButton/SignOutButton';
import { BlurView } from 'expo-blur';
import { logger } from '@/lib/core/debug/unified-logger';
import { useAuth } from '@/hooks/useAuth';
import { showAlert } from '@/lib/core/alert';
import { 
  VStack, 
  HStack, 
  Button,
  Avatar,
  Separator,
  Input,
  Modal,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/universal';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MobileNavigationProps {
  children: React.ReactNode;
}

// Navigation drawer content component
function NavigationContent({ 
  navigationItems, 
  onClose,
  alertStats,
  canCreateAlerts
}: { 
  navigationItems: any[];
  onClose: () => void;
  alertStats?: any;
  canCreateAlerts?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  // Debug log for Android
  useEffect(() => {
    logger.debug('NavigationContent permissions', 'ROUTER', {
      canCreateAlerts,
      platform: Platform.OS,
      user: user?.email,
    });
  }, [canCreateAlerts, user]);
  
  // Real-time notifications
  const { data: notifications } = useUnreadNotifications({
    refetchInterval: 60000,
    enabled: !!user,
  });
  
  // Auto-expand active sections
  useEffect(() => {
    navigationItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some((child: any) => isPathActive(child.href));
        if (hasActiveChild && !expandedItems.includes(item.id)) {
          setExpandedItems(prev => [...prev, item.id]);
        }
      }
    });
  }, [pathname]);
  
  const handleNavigation = useCallback((href: string) => {
    logger.info('Navigation item clicked', 'ROUTER', { href });
    haptic('light');
    
    // Close drawer first, then navigate
    onClose();
    
    // Small delay to ensure drawer closes smoothly
    setTimeout(() => {
      // Clean up the href to ensure proper routing
      const cleanHref = href.startsWith('/') ? href : `/${href}`;
      router.push(cleanHref as any);
    }, 100);
  }, [router, onClose]);
  
  const isPathActive = useCallback((href?: string) => {
    if (!href) return false;
    const cleanHref = href.replace('/(tabs)', '').replace('/(app)', '');
    const cleanPathname = pathname.replace('/(tabs)', '').replace('/(app)', '');
    return cleanHref === cleanPathname || (cleanHref !== '/' && cleanPathname.startsWith(cleanHref));
  }, [pathname]);
  
  const toggleExpanded = useCallback((itemId: string) => {
    haptic('light');
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);
  
  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return navigationItems;
    
    const search = searchQuery.toLowerCase();
    return navigationItems.filter(item => {
      const matchesTitle = item.title.toLowerCase().includes(search);
      const matchesChildren = item.children?.some(
        (child: any) => child.title.toLowerCase().includes(search)
      );
      return matchesTitle || matchesChildren;
    });
  }, [navigationItems, searchQuery]);
  
  // Render navigation item
  const renderNavItem = (item: any, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isActive = isPathActive(item.href);
    
    // Get badge count for alerts
    const getBadgeCount = () => {
      if (item.id === 'alerts' && alertStats) {
        return alertStats.active || 0;
      }
      return item.badge;
    };
    
    const badgeCount = getBadgeCount();
    
    return (
      <View key={item.id}>
        <Pressable
          onPress={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else if (item.href) {
              handleNavigation(item.href);
            }
          }}
          style={{
            paddingHorizontal: spacing[3] + (level * spacing[4]),
            paddingVertical: spacing[2.5],
            marginHorizontal: spacing[2],
            marginVertical: spacing[0.5],
            borderRadius: 8,
            backgroundColor: isActive ? theme.primary + '10' : 'transparent',
            borderWidth: isActive ? 1 : 0,
            borderColor: isActive ? theme.primary + '30' : 'transparent',
          }}
        >
          <HStack alignItems="center" gap={3}>
            <Symbol
              name={item.icon as any}
              size={20}
              color={isActive ? theme.primary : theme.foreground}
            />
            <Text
              size="base"
              weight={isActive ? 'semibold' : 'normal'}
              style={{
                flex: 1,
                color: isActive ? theme.primary : theme.foreground,
              }}
            >
              {item.title}
            </Text>
            
            {item.isNew && (
              <Badge variant="secondary" size="sm">
                NEW
              </Badge>
            )}
            
            {badgeCount !== undefined && badgeCount !== 0 && (
              <Badge
                variant={item.badgeVariant || 'error'}
                size="sm"
              >
                {badgeCount}
              </Badge>
            )}
            
            {hasChildren && (
              <Animated.View
                style={{
                  transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
                }}
              >
                <Symbol
                  name="chevron.right"
                  size={16}
                  color={theme.mutedForeground}
                />
              </Animated.View>
            )}
          </HStack>
        </Pressable>
        
        {hasChildren && isExpanded && (
          <View>
            {item.children.map((child: any) => renderNavItem(child, level + 1))}
          </View>
        )}
      </View>
    );
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing[8] }}
        style={{ flex: 1 }}
      >
        <VStack gap={3} p={4} style={{ paddingTop: 60 }}>
          {/* User info */}
          <HStack alignItems="center" gap={3}>
            <Avatar
              source={user?.image ? { uri: user.image } : undefined}
              name={user?.name || 'User'}
              size="lg"
            />
            <VStack gap={0.5} style={{ flex: 1 }}>
              <Text size="lg" weight="semibold">
                {user?.name || 'User'}
              </Text>
              <Text size="sm" colorTheme="mutedForeground">
                {user?.email}
              </Text>
            </VStack>
          </HStack>
          
          {/* Hospital switcher */}
          <HospitalSwitcher />
          
          {/* Notifications banner */}
          {notifications && (notifications as any).count > 0 && (
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
              <Pressable
                onPress={() => {
                  onClose();
                  setTimeout(() => router.push('/notification-center'), 100);
                }}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                  backgroundColor: theme.destructive + '10',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.destructive + '30',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Symbol name="bell.badge" size={16} color={theme.destructive} />
                <Text
                  size="sm"
                  weight="medium"
                  style={{
                    flex: 1,
                    marginLeft: spacing[2],
                    color: theme.destructive,
                  }}
                >
                  {(notifications as any).count} new notifications
                </Text>
                <Symbol name="chevron.right" size={16} color={theme.destructive} />
              </Pressable>
            </Animated.View>
          )}
          
          {/* Search with command palette button */}
          <Pressable
            onPress={() => setShowCommandPalette(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[2],
              backgroundColor: theme.input,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Symbol name="magnifyingglass" size={16} color={theme.mutedForeground} />
            <Text
              size="sm"
              style={{
                flex: 1,
                marginLeft: spacing[2],
                color: theme.mutedForeground,
              }}
            >
              Search menu...
            </Text>
            {Platform.OS === 'web' && (
              <Text size="xs" colorTheme="mutedForeground">⌘K</Text>
            )}
          </Pressable>
          
          {/* Quick Actions */}
          {canCreateAlerts && (
            <>
              <VStack gap={1}>
                <Text
                  size="sm"
                  weight="semibold"
                  colorTheme="mutedForeground"
                  style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[1] }}
                >
                  QUICK ACTIONS
                </Text>
                <Button
                  variant="outline"
                  onPress={() => {
                    onClose();
                    setTimeout(() => router.push('/(modals)/create-alert'), 100);
                  }}
                  fullWidth
                  animated={true}
                  style={{
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: theme.destructive,
                    backgroundColor: Platform.OS === 'android' ? theme.destructive + '10' : theme.destructive + '10',
                    ...(Platform.OS === 'android' && {
                      elevation: 2,
                      shadowColor: theme.destructive,
                    }),
                  }}
                >
                  <HStack gap={2} alignItems="center">
                    <Symbol name="plus.circle.fill" size={20} color={theme.destructive} />
                    <Text weight="semibold" style={{ color: theme.destructive }}>Create Alert</Text>
                  </HStack>
                </Button>
              </VStack>
              <Separator />
            </>
          )}
          
          {/* Main navigation */}
          <VStack gap={1}>
            <Text
              size="sm"
              weight="semibold"
              colorTheme="mutedForeground"
              style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[1] }}
            >
              NAVIGATION
            </Text>
            {filteredItems.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeIn.delay(index * 50).duration(300)}
              >
                {renderNavItem(item)}
              </Animated.View>
            ))}
          </VStack>
          
          {supportNavigation && supportNavigation.length > 0 && (
            <>
              <Separator />
              
              {/* Support section */}
              <VStack gap={1}>
                <Text
                  size="sm"
                  weight="semibold"
                  colorTheme="mutedForeground"
                  style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[1] }}
                >
                  HELP & SUPPORT
                </Text>
                {supportNavigation.map(item => {
                  // Handle shortcuts item specially to open command palette
                  if (item.id === 'shortcuts') {
                    return (
                      <View key={item.id}>
                        <Pressable
                          onPress={() => setShowCommandPalette(true)}
                          style={{
                            paddingHorizontal: spacing[3],
                            paddingVertical: spacing[2.5],
                            marginHorizontal: spacing[2],
                            marginVertical: spacing[0.5],
                            borderRadius: 8,
                            backgroundColor: 'transparent',
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Symbol name={item.icon as any} size={20} color={theme.foreground} />
                          <Text
                            size="base"
                            weight="normal"
                            style={{
                              flex: 1,
                              marginLeft: spacing[3],
                              color: theme.foreground,
                            }}
                          >
                            {item.title}
                          </Text>
                          {item.shortcut && (
                            <Text size="xs" colorTheme="mutedForeground">
                              {item.shortcut}
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    );
                  }
                  return renderNavItem(item);
                })}
              </VStack>
            </>
          )}
          
          <Separator />
          
          {/* Sign out button */}
          <SignOutButton fullWidth variant="outline" />
        </VStack>
      </ScrollView>
      
      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          items={navigationItems}
          onNavigate={(href, title) => {
            handleNavigation(href);
            showAlert('Navigation', `Navigating to ${title}`);
          }}
        />
      )}
    </View>
  );
}

// Command Palette Component
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onNavigate: (href: string, title: string) => void;
}

function CommandPalette({ isOpen, onClose, items, onNavigate }: CommandPaletteProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Flatten items for search
  const flatItems = useMemo(() => {
    const flat: any[] = [];
    items.forEach(item => {
      flat.push(item);
      if (item.children) {
        flat.push(...item.children);
      }
    });
    return flat;
  }, [items]);
  
  // Filter based on search
  const filteredItems = useMemo(() => {
    if (!search) return flatItems.filter(item => item.href);
    
    const searchLower = search.toLowerCase();
    return flatItems.filter(item => 
      item.href && item.title.toLowerCase().includes(searchLower)
    );
  }, [flatItems, search]);
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent style={{ maxWidth: 500 }}>
        <DialogHeader>
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>
        <VStack gap={3}>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Type to search..."
            autoFocus
            leftIcon={<Symbol name="magnifyingglass" size={16} />}
            rightElement={
              search ? (
                <Pressable onPress={() => setSearch('')}>
                  <Symbol name="xmark.circle.fill" size={16} color={theme.mutedForeground} />
                </Pressable>
              ) : undefined
            }
          />
          
          <ScrollView style={{ maxHeight: 400 }}>
            <VStack gap={1}>
              {filteredItems.length === 0 ? (
                <Box p={8} alignItems="center">
                  <Text size="sm" colorTheme="mutedForeground">
                    No results found
                  </Text>
                </Box>
              ) : (
                filteredItems.map((item, index) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (item.href) {
                        onNavigate(item.href, item.title);
                        onClose();
                      }
                    }}
                    style={{
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[3],
                      borderRadius: 8,
                      backgroundColor: selectedIndex === index 
                        ? theme.accent + '10' 
                        : 'transparent',
                      borderWidth: 1,
                      borderColor: selectedIndex === index
                        ? theme.accent + '30'
                        : 'transparent',
                    }}
                  >
                    <HStack alignItems="center" gap={3}>
                      <Box
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: selectedIndex === index
                            ? theme.accent + '20'
                            : theme.muted + '10',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Symbol
                          name={item.icon as any}
                          size={20}
                          color={selectedIndex === index 
                            ? theme.accent 
                            : theme.foreground}
                        />
                      </Box>
                      <VStack gap={0} style={{ flex: 1 }}>
                        <Text
                          size="sm"
                          weight={selectedIndex === index ? 'semibold' : 'medium'}
                        >
                          {item.title}
                        </Text>
                        {item.href && (
                          <Text
                            size="xs"
                            colorTheme="mutedForeground"
                          >
                            {item.href}
                          </Text>
                        )}
                      </VStack>
                      {item.shortcut && (
                        <Badge variant="outline" size="sm">
                          <Text size="xs">{item.shortcut}</Text>
                        </Badge>
                      )}
                    </HStack>
                  </Pressable>
                ))
              )}
            </VStack>
          </ScrollView>
        </VStack>
      </DialogContent>
    </Dialog>
  );
}

export function MobileNavigation({ children }: MobileNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { width: screenWidth } = Dimensions.get('window');
  
  // Gesture handler for edge swipe
  const translateX = useSharedValue(0);
  const gestureEnabled = useSharedValue(true);
  
  logger.debug('MobileNavigation render', 'ROUTER', {
    pathname,
    drawerOpen,
    screenWidth,
  });
  
  // Handle swipe gesture
  const gestureHandler = useCallback((event: PanGestureHandlerGestureEvent) => {
    'worklet';
    const { state, translationX } = event.nativeEvent;
    
    if (state === State.ACTIVE) {
      // Show swipe indicator based on translation
      translateX.value = Math.max(0, Math.min(translationX, 100));
    } else if (state === State.END || state === State.CANCELLED) {
      if (translationX > 50) {
        // Open drawer if swiped more than 50 pixels
        translateX.value = withSpring(0);
        runOnJS(() => {
          haptic('light');
          setDrawerOpen(true);
        })();
      } else {
        // Snap back
        translateX.value = withSpring(0);
      }
    }
  }, []);
  
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
  
  // Use tab items directly (More tab is already included from config)
  const allTabItems = tabItemsWithBadges;
  
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
    logger.info('Tab pressed', 'ROUTER', {
      itemId: item.id,
      itemTitle: item.title,
      hasHref: !!item.href,
    });
    
    haptic('light');
    
    if (item.id === 'more') {
      logger.info('Opening drawer from More tab', 'ROUTER');
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
  
  // Animated style for edge swipe indicator
  const swipeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? 0.3 : 0,
    transform: [{ translateX: translateX.value }],
  }));
  
  return (
    <>
      {/* Main content area */}
      <View style={{ flex: 1 }}>
        {children}
      </View>
      
      {/* Edge swipe gesture handler - TEMPORARILY DISABLED for Android */}
      {Platform.OS === 'ios' && (
        <PanGestureHandler 
          onGestureEvent={gestureHandler}
          shouldCancelWhenOutside={true}
          activeOffsetX={[0, 10]}
          failOffsetX={[-10, 50]}
          simultaneousHandlers={undefined}
          waitFor={undefined}
        >
          <Animated.View 
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: TOTAL_TAB_HEIGHT,
              width: 20, // Reduced edge area
              zIndex: 1,
            }} 
            pointerEvents="box-none"
          >
            {/* Swipe indicator */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  top: '40%',
                  width: 40,
                  height: 80,
                  backgroundColor: theme.primary,
                  borderTopRightRadius: 40,
                  borderBottomRightRadius: 40,
                },
                swipeIndicatorStyle,
              ]}
              pointerEvents="none"
            />
          </Animated.View>
        </PanGestureHandler>
      )}
      
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
          zIndex: 100,
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
          {allTabItems.map((item, index) => (
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
      <Drawer
        visible={drawerOpen}
        onClose={() => {
          logger.info('Drawer close callback triggered', 'ROUTER');
          setDrawerOpen(false);
        }}
        position="left"
        size="md"
        closeOnBackdrop={true}
        swipeEnabled={true}
        animationDuration={250}
        disableModal={true}
      >
        <NavigationContent 
          navigationItems={filteredNavItems}
          onClose={() => setDrawerOpen(false)}
          alertStats={alertStats}
          canCreateAlerts={canCreateAlerts}
        />
      </Drawer>
    </>
  );
}