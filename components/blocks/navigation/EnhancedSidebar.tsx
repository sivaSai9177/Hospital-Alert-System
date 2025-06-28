import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import {
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  Symbol,
  Button,
} from '@/components/universal';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  TeamSwitcher,
  NavUser,
  useSidebar,
} from '@/components/universal/navigation/Sidebar';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useAuth } from '@/hooks/useAuth';
import { useHealthcareAccess } from '@/hooks/usePermissions';
import { useAlertStats, useUnreadNotifications } from '@/hooks/healthcare';
import { haptic } from '@/lib/ui/haptics';
import { useDebounce } from '@/hooks/useDebounce';
import { showAlert } from '@/lib/core/alert';
import { useHospitalStore } from '@/lib/stores/hospital-store';
import { HospitalSwitcher } from '@/components/blocks/organization';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NavItem {
  id: string;
  title: string;
  icon: string;
  href?: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'error' | 'outline';
  items?: NavItem[];
  requiredPermission?: string;
  shortcut?: string;
  isNew?: boolean;
  isActive?: boolean;
}

interface EnhancedSidebarProps {
  children?: React.ReactNode;
}

export function EnhancedSidebar({ children }: EnhancedSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { user } = useAuth();
  const { currentHospital } = useHospitalStore();
  const { isCollapsed, toggleGroup, openGroups } = useSidebar();
  const [searchQuery] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [floatingSubmenu, setFloatingSubmenu] = useState<{ itemId: string; position: { x: number; y: number } } | null>(null);
  
  // Auto-expand alerts menu if we're on an alerts page
  React.useEffect(() => {
    if (pathname.includes('/alerts') && !openGroups.includes('alerts')) {
      toggleGroup('alerts');
    }
  }, [pathname]);
  
  // Permission checks
  const {
    canViewAlerts,
    canViewPatients,
    canViewAnalytics,
    canManageShifts,
    canViewAuditLogs,
  } = useHealthcareAccess();
  
  // Real-time data for badges using enhanced hooks
  const { data: alertStats } = useAlertStats({
    refetchInterval: 30000,
    enabled: canViewAlerts,
  });
  
  const { data: notifications } = useUnreadNotifications({
    refetchInterval: 60000,
    enabled: !!user,
  });
  
  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Navigation items with permissions
  const navItems: NavItem[] = useMemo(() => [
    {
      id: 'home',
      title: 'Dashboard',
      icon: 'house.fill',
      href: '/home',
      shortcut: '⌘D',
    },
    ...(canViewAlerts ? [{
      id: 'alerts',
      title: 'Alerts',
      icon: 'bell.badge',
      href: '/alerts',
      badge: (alertStats as any)?.active || 0,
      badgeVariant: 'error' as const,
      shortcut: '⌘A',
      items: [
        {
          id: 'active-alerts',
          title: 'Active Alerts',
          icon: 'bell.fill',
          href: '/alerts',
          badge: (alertStats as any)?.active,
        },
        {
          id: 'escalation-queue',
          title: 'Escalation Queue',
          icon: 'exclamationmark.triangle',
          href: '/alerts/escalation-queue',
          badge: (alertStats as any)?.escalated,
          isNew: true,
        },
        {
          id: 'alert-history',
          title: 'Alert History',
          icon: 'clock.arrow.circlepath',
          href: '/alerts/history',
        },
      ],
    }] : []),
    ...(canViewPatients ? [{
      id: 'patients',
      title: 'Patients',
      icon: 'person.2.fill',
      href: '/patients',
      shortcut: '⌘P',
    }] : []),
    ...(canManageShifts ? [{
      id: 'shifts',
      title: 'Shift Management',
      icon: 'calendar.badge.clock',
      items: [
        {
          id: 'shift-schedule',
          title: 'Schedule',
          icon: 'calendar',
          href: '/shifts/schedule',
        },
        {
          id: 'shift-handover',
          title: 'Handover',
          icon: 'arrow.triangle.2.circlepath',
          href: '/shifts/handover',
        },
        {
          id: 'shift-reports',
          title: 'Reports',
          icon: 'doc.text',
          href: '/shifts/reports',
        },
      ],
    }] : []),
    ...(canViewAnalytics ? [{
      id: 'analytics',
      title: 'Analytics',
      icon: 'chart.line.uptrend.xyaxis',
      items: [
        {
          id: 'response-analytics',
          title: 'Response Times',
          icon: 'speedometer',
          href: '/analytics/response-analytics',
          isNew: true,
        },
      ],
    }] : []),
    ...(canViewAuditLogs ? [{
      id: 'logs',
      title: 'Activity & Logs',
      icon: 'doc.text.magnifyingglass',
      items: [
        {
          id: 'activity-logs',
          title: 'Activity Logs',
          icon: 'list.bullet.rectangle',
          href: '/logs/activity-logs',
        },
      ],
    }] : []),
    {
      id: 'settings',
      title: 'Settings',
      icon: 'gearshape.fill',
      href: '/settings',
      shortcut: '⌘,',
    },
  ], [canViewAlerts, canViewPatients, canManageShifts, canViewAnalytics, canViewAuditLogs, alertStats]);
  
  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return navItems;
    
    const search = debouncedSearch.toLowerCase();
    return navItems.filter(item => {
      const matchesTitle = item.title.toLowerCase().includes(search);
      const matchesSubItems = item.items?.some(
        subItem => subItem.title.toLowerCase().includes(search)
      );
      return matchesTitle || matchesSubItems;
    });
  }, [navItems, debouncedSearch]);
  
  // Check if path is active
  const isPathActive = useCallback((href?: string) => {
    if (!href) return false;
    
    // Clean up paths for comparison
    const cleanHref = href.replace('/(tabs)', '').replace('/(app)', '');
    const cleanPathname = pathname.replace('/(tabs)', '').replace('/(app)', '');
    
    // Exact match
    if (cleanHref === cleanPathname) return true;
    
    // Check if current path starts with the href (for nested routes)
    if (cleanHref !== '/' && cleanPathname.startsWith(cleanHref)) return true;
    
    return false;
  }, [pathname]);
  
  // Handle navigation
  const handleNavigation = useCallback((href: string) => {
    haptic('light');
    router.push(href as any);
  }, [router]);
  
  // Keyboard shortcuts
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      
      // Quick navigation
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'd':
            e.preventDefault();
            router.push('/home');
            break;
          case 'a':
            e.preventDefault();
            if (canViewAlerts) router.push('/alerts');
            break;
          case 'p':
            e.preventDefault();
            if (canViewPatients) router.push('/patients');
            break;
          case ',':
            e.preventDefault();
            router.push('/settings');
            break;
        }
      }
    };
    
    // Only add event listeners on web
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [router, canViewAlerts, canViewPatients]);
  
  // Animation values for sidebar
  const sidebarAnimation = useSharedValue(isCollapsed ? 0 : 1);
  
  React.useEffect(() => {
    sidebarAnimation.value = withTiming(isCollapsed ? 0 : 1, {
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [isCollapsed, sidebarAnimation]);
  
  // Enhanced nav item with animations and features
  const EnhancedNavItem = ({ item, level = 0 }: { item: NavItem; level?: number }) => {
    const isActive = isPathActive(item.href);
    const isOpen = openGroups.includes(item.id);
    const hasSubItems = item.items && item.items.length > 0;
    const [isHovered, setIsHovered] = React.useState(false);
    
    const scale = useSharedValue(1);
    const backgroundColor = useSharedValue(0);
    const iconRotation = useSharedValue(isOpen ? 90 : 0);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      backgroundColor: backgroundColor.value === 0 ? 'transparent' : theme.accent + '20',
    }));
    
    const iconAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${iconRotation.value}deg` }],
    }));
    
    React.useEffect(() => {
      iconRotation.value = withSpring(isOpen ? 90 : 0, {
        damping: 15,
        stiffness: 150,
      });
    }, [isOpen, iconRotation]);
    
    const handlePress = (event?: any) => {
      if (hasSubItems) {
        if (isCollapsed) {
          // Show floating submenu for collapsed sidebar
          const target = event?.currentTarget || event?.target;
          if (target && Platform.OS === 'web') {
            const rect = target.getBoundingClientRect();
            setFloatingSubmenu({
              itemId: item.id,
              position: {
                x: rect.right + 10,
                y: rect.top
              }
            });
          }
        } else {
          // Toggle submenu for expanded sidebar
          toggleGroup(item.id);
        }
      } else if (item.href) {
        handleNavigation(item.href);
        setFloatingSubmenu(null); // Close any open floating submenu
      } else if (item.id === 'shortcuts') {
        setShowCommandPalette(true);
      }
    };
    
    const handlePressIn = () => {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      backgroundColor.value = withTiming(1, { duration: 100 });
    };
    
    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      backgroundColor.value = withTiming(0, { duration: 100 });
    };
    
    return (
      <View>
        <AnimatedPressable
          onPress={(event) => handlePress(event)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onHoverIn={() => setIsHovered(true)}
          onHoverOut={() => setIsHovered(false)}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing[2],
              paddingVertical: spacing[2],
              marginLeft: isCollapsed ? 0 : level * spacing[3],
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isActive ? theme.primary + '30' : (isHovered ? theme.border + '30' : 'transparent'),
              backgroundColor: isActive 
                ? theme.primary + '15' 
                : (isHovered ? theme.muted : 'transparent'),
            },
            animatedStyle,
            Platform.OS === 'web' && {
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            },
          ]}
        >
          {isCollapsed ? (
            <VStack gap={1} alignItems="center" style={{ flex: 1 }}>
              <Symbol
                name={item.icon as any}
                size={24}
                color={isActive ? theme.primary : theme.mutedForeground}
              />
              <Text
                size="xs"
                weight={isActive ? 'semibold' : 'normal'}
                style={{
                  color: isActive ? theme.primary : theme.mutedForeground,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {item.title.split(' ')[0]}
              </Text>
            </VStack>
          ) : (
            <>
              <Symbol
                name={item.icon as any}
                size={20}
                color={isActive ? theme.primary : theme.mutedForeground}
              />
              <Text
                size="sm"
                weight={isActive ? 'semibold' : 'normal'}
                style={{
                  flex: 1,
                  marginLeft: spacing[3],
                  color: isActive ? theme.primary : theme.foreground,
                }}
              >
                {item.title}
              </Text>
              
              {item.isNew && (
                <Badge 
                  variant="secondary" 
                  size="sm" 
                  style={{ 
                    marginRight: spacing[2],
                    backgroundColor: theme.accent + '20',
                    borderColor: theme.accent + '40',
                  }}
                >
                  NEW
                </Badge>
              )}
              
              {item.badge !== undefined && item.badge !== 0 && (
                <Badge
                  variant={item.badgeVariant || 'default'}
                  size="sm"
                  style={{ marginRight: spacing[2] }}
                >
                  {item.badge}
                </Badge>
              )}
              
              {item.shortcut && Platform.OS === 'web' && (
                <Text
                  size="xs"
                  style={{
                    color: theme.mutedForeground,
                    marginRight: spacing[2],
                  }}
                >
                  {item.shortcut}
                </Text>
              )}
              
              {hasSubItems && (
                <Animated.View style={iconAnimatedStyle}>
                  <Symbol
                    name="chevron.right"
                    size={16}
                    color={theme.mutedForeground}
                  />
                </Animated.View>
              )}
            </>
          )}
        </AnimatedPressable>
        
        {!isCollapsed && hasSubItems && isOpen && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            {item.items!.map((subItem, subIndex) => (
              <Animated.View
                key={subItem.id}
                entering={FadeIn.delay(subIndex * 30).duration(200)}
              >
                <EnhancedNavItem
                  item={subItem}
                  level={level + 1}
                />
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </View>
    );
  };
  
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader
          style={[
            {
              backgroundColor: Platform.OS === 'web' ? theme.card + 'f8' : theme.card,
              borderBottomWidth: 1,
              borderBottomColor: theme.border + '20',
              padding: spacing[2],
            },
            Platform.OS === 'web' && {
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            },
          ]}
        >
          <VStack gap={spacing[1]}>
            {/* Hospital Switcher with Modal */}
            <HospitalSwitcher compact={isCollapsed} showLabel={!isCollapsed} />
            
            {/* Search Bar */}
            {!isCollapsed && (
              <Pressable
                onPress={() => setShowCommandPalette(true)}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                  backgroundColor: theme.input,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
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
                  Search... {Platform.OS === 'web' && '⌘K'}
                </Text>
              </Pressable>
            )}
            
            {/* Notifications */}
            {notifications && (notifications as any).count > 0 && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
            >
              <Pressable
                onPress={() => router.push('/notification-center')}
                style={{
                  marginTop: spacing[2],
                  paddingHorizontal: isCollapsed ? spacing[2] : spacing[3],
                  paddingVertical: spacing[2],
                  backgroundColor: theme.destructive + '10',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.destructive + '30',
                  flexDirection: isCollapsed ? 'column' : 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Symbol name="bell.badge" size={isCollapsed ? 20 : 16} color={theme.destructive} />
                {!isCollapsed && (
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
                )}
                {isCollapsed && (
                  <Badge
                    variant="error"
                    size="xs"
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                    }}
                  >
                    {(notifications as any).count}
                  </Badge>
                )}
              </Pressable>
            </Animated.View>
            )}
          </VStack>
        </SidebarHeader>
        
        <SidebarContent
          style={{
            backgroundColor: Platform.OS === 'web' ? theme.background + 'f8' : theme.background,
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false} style={{ padding: spacing[2] }}>
            <VStack gap={spacing[2]}>
              {/* Quick Actions */}
              <VStack gap={spacing[1]}>
                {!isCollapsed && (
                  <Text size="sm" weight="medium" colorTheme="mutedForeground">
                    Quick Actions
                  </Text>
                )}
                <Button
                  variant="outline"
                  size={isCollapsed ? "icon" : "default"}
                  onPress={() => router.push('/(modals)/create-alert')}
                  fullWidth={!isCollapsed}
                  animated={true}
                  className="border-destructive hover:bg-destructive/10 hover:border-destructive/60 transition-all"
                  style={{
                    borderRadius: 16,
                    minHeight: 52,
                    borderWidth: 2,
                    borderColor: theme.destructive,
                  }}
                >
                  {isCollapsed ? (
                    <Symbol name="plus.circle.fill" size={24} color={theme.destructive} animated animationType="bounce" />
                  ) : (
                    <HStack gap={2} alignItems="center">
                      <Symbol name="plus.circle.fill" size={20} color={theme.destructive} animated animationType="bounce" />
                      <Text weight="semibold" style={{ color: theme.destructive }}>Create Alert</Text>
                    </HStack>
                  )}
                </Button>
              </VStack>
              
              {/* Main Navigation */}
              <VStack gap={spacing[1]}>
                {!isCollapsed && (
                  <Text size="sm" weight="medium" colorTheme="mutedForeground">
                    Navigation
                  </Text>
                )}
                <VStack gap={1}>
                  {filteredItems.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeIn.delay(index * 50).duration(300)}
                  >
                    <EnhancedNavItem item={item} />
                  </Animated.View>
                  ))}
                </VStack>
              </VStack>
              
              {/* Help & Support */}
              <VStack gap={spacing[1]}>
                {!isCollapsed && (
                  <Text size="sm" weight="medium" colorTheme="mutedForeground">
                    Help & Support
                  </Text>
                )}
                <VStack gap={1}>
                  <EnhancedNavItem
                    item={{
                      id: 'documentation',
                      title: 'Documentation',
                      icon: 'book',
                      href: '/docs',
                    }}
                  />
                  <EnhancedNavItem
                    item={{
                      id: 'support',
                      title: 'Support',
                      icon: 'questionmark.circle',
                      href: '/support',
                    }}
                  />
                  <EnhancedNavItem
                    item={{
                      id: 'shortcuts',
                      title: 'Shortcuts',
                      icon: 'keyboard',
                      shortcut: '⌘K',
                    }}
                  />
                </VStack>
              </VStack>
            </VStack>
          </ScrollView>
        </SidebarContent>
        
        <SidebarFooter
          style={[
            {
              backgroundColor: Platform.OS === 'web' ? theme.card + 'f8' : theme.card,
              borderTopWidth: 1,
              borderTopColor: theme.border + '20',
            },
            Platform.OS === 'web' && {
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            },
          ]}
        >
          <NavUser
            user={{
              name: user?.name || 'User',
              email: user?.email || '',
              avatar: user?.image,
            }}
          />
          
          {/* Theme Switcher */}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onPress={() => router.push('/settings')}
              style={{ marginTop: spacing[2] }}
            >
              <HStack gap={2} alignItems="center">
                <Symbol name="moon" size={16} />
                <Text size="sm">Appearance</Text>
              </HStack>
            </Button>
          )}
        </SidebarFooter>
        
        <SidebarRail />
      </Sidebar>
      
      {/* Command Palette Modal */}
      {showCommandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          items={navItems}
          onNavigate={handleNavigation}
        />
      )}
      
      {/* Floating Submenu for Collapsed Sidebar */}
      {floatingSubmenu && isCollapsed && Platform.OS === 'web' && (
        <FloatingSubmenu
          items={navItems.find(item => item.id === floatingSubmenu.itemId)?.items || []}
          position={floatingSubmenu.position}
          onClose={() => setFloatingSubmenu(null)}
          onNavigate={(href) => {
            handleNavigation(href);
            setFloatingSubmenu(null);
          }}
          theme={theme}
          spacing={spacing}
        />
      )}
    </>
  );
}

// Floating Submenu Component
interface FloatingSubmenuProps {
  items: NavItem[];
  position: { x: number; y: number };
  onClose: () => void;
  onNavigate: (href: string) => void;
  theme: any;
  spacing: any;
}

function FloatingSubmenu({ items, position, onClose, onNavigate, theme, spacing }: FloatingSubmenuProps) {
  React.useEffect(() => {
    // Only add event listeners on web
    if (Platform.OS !== 'web') return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.floating-submenu')) {
        onClose();
      }
    };
    
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [onClose]);
  
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      className="floating-submenu"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        backgroundColor: theme.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        minWidth: 200,
        zIndex: 9999,
        paddingVertical: spacing[2],
      }}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => {
            if (item.href) {
              onNavigate(item.href);
            }
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            gap: spacing[3],
          }}
        >
          <Symbol 
            name={item.icon as any} 
            size={18} 
            color={theme.foreground} 
          />
          <Text size="sm" style={{ flex: 1 }}>
            {item.title}
          </Text>
          {item.badge !== undefined && item.badge !== 0 && (
            <Badge variant={item.badgeVariant || 'default'} size="sm">
              {item.badge}
            </Badge>
          )}
          {item.isNew && (
            <Badge variant="secondary" size="sm">
              NEW
            </Badge>
          )}
        </Pressable>
      ))}
    </Animated.View>
  );
}

// Command Palette Component
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[];
  onNavigate: (href: string, title: string) => void;
}

function CommandPalette({ isOpen, onClose, items, onNavigate }: CommandPaletteProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Flatten items for search
  const flatItems = useMemo(() => {
    const flat: NavItem[] = [];
    items.forEach(item => {
      flat.push(item);
      if (item.items) {
        flat.push(...item.items);
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
  
  // Handle keyboard navigation
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          const selected = filteredItems[selectedIndex];
          if (selected?.href) {
            onNavigate(selected.href, selected.title);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    
    // Only add event listeners on web
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedIndex, filteredItems, onNavigate, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        alignItems: 'center',
        paddingTop: 100,
        zIndex: 9999,
        ...(Platform.OS === 'web' && {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }),
      }}
    >
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <Animated.View
        entering={SlideInLeft.duration(300).easing(Easing.bezier(0.4, 0, 0.2, 1))}
        exiting={SlideOutLeft.duration(200).easing(Easing.bezier(0.4, 0, 0.2, 1))}
        style={{
          width: '90%',
          maxWidth: 600,
          backgroundColor: Platform.OS === 'web' ? theme.card + 'f8' : theme.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border + '40',
          shadowColor: theme.accent,
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.15,
          shadowRadius: 40,
          elevation: 30,
          ...(Platform.OS === 'web' && {
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }),
        }}
      >
        <KeyboardAvoidingView behavior="padding">
          <VStack>
            {/* Search Input */}
            <VStack gap={4} p={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack gap={1}>
                  <Text size="lg" weight="semibold">Command Palette</Text>
                  <Text size="sm" colorTheme="mutedForeground">
                    Quickly access any page or action
                  </Text>
                </VStack>
                <Pressable
                  onPress={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: theme.muted + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Symbol name="xmark" size={16} color={theme.mutedForeground} />
                </Pressable>
              </HStack>
              
              <Box
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.input,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border + '40',
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                }}
              >
                <Symbol name="magnifyingglass" size={20} color={theme.mutedForeground} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Type to search..."
                  placeholderTextColor={theme.mutedForeground}
                  autoFocus
                  style={{
                    flex: 1,
                    marginLeft: spacing[3],
                    fontSize: 16,
                    color: theme.foreground,
                    ...(Platform.OS === 'web' && { outline: 'none' }),
                  }}
                />
                {search && (
                  <Pressable onPress={() => setSearch('')}>
                    <Symbol name="xmark.circle.fill" size={18} color={theme.mutedForeground} />
                  </Pressable>
                )}
              </Box>
            </VStack>
            
            {/* Results */}
            <ScrollView
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
            >
              <VStack p={2}>
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
                      style={[
                        {
                          paddingHorizontal: spacing[3],
                          paddingVertical: spacing[3],
                          marginHorizontal: spacing[2],
                          marginVertical: spacing[1],
                          borderRadius: 10,
                          backgroundColor: selectedIndex === index 
                            ? theme.accent + '10' 
                            : 'transparent',
                          borderWidth: 1,
                          borderColor: selectedIndex === index
                            ? theme.accent + '30'
                            : 'transparent',
                        },
                        Platform.OS === 'web' && {
                          // @ts-ignore - web-only styles
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        } as any,
                      ]}
                    >
                      <HStack alignItems="center" gap={3}>
                        <Box
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
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
                            style={{
                              color: selectedIndex === index 
                                ? theme.foreground 
                                : theme.foreground,
                            }}
                          >
                            {item.title}
                          </Text>
                          {item.href && (
                            <Text
                              size="xs"
                              style={{
                                color: theme.mutedForeground,
                                opacity: 0.7,
                              }}
                            >
                              {item.href.split('/').slice(2).join(' › ')}
                            </Text>
                          )}
                        </VStack>
                        {item.shortcut && (
                          <Badge
                            variant="outline"
                            size="sm"
                            style={{
                              backgroundColor: selectedIndex === index
                                ? theme.accent + '10'
                                : 'transparent',
                            }}
                          >
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
        </KeyboardAvoidingView>
      </Animated.View>
    </Animated.View>
  );
}