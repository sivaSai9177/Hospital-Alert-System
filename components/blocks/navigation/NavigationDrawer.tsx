import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  Pressable, 
  Modal, 
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
  TextInput,
  StyleSheet,
  Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideOutLeft,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { Symbol } from '@/components/universal/display/Symbols';
import {
  Text,
  VStack,
  HStack,
  Box,
  Badge,
  Avatar,
  Separator,
} from '@/components/universal';
import { useAuth } from '@/hooks/useAuth';
import { HospitalSwitcher } from '@/components/blocks/organization';
import { NavigationItem, supportNavigation } from '@/lib/config/navigation.config';
import { SignOutButton } from '@/components/blocks/auth/SignOutButton/SignOutButton';
import { logger } from '@/lib/core/debug/unified-logger';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: NavigationItem[];
}

function NavigationDrawerComponent({ isOpen, onClose, navigationItems }: NavigationDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [backdropTouchable, setBackdropTouchable] = useState(false);
  const openingRef = useRef(false);
  
  logger.debug('NavigationDrawer render', 'ROUTER', {
    isOpen,
    pathname,
    userEmail: user?.email,
    navigationItemsCount: navigationItems.length,
  });
  
  const { width: screenWidth } = Dimensions.get('window');
  const DRAWER_WIDTH = Math.min(screenWidth * 0.85, 320);
  
  // Animation values - always initialize off-screen
  const drawerTranslateX = useSharedValue(-DRAWER_WIDTH);
  // Use React Native's Animated for backdrop opacity
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  
  useEffect(() => {
    logger.debug('NavigationDrawer animation effect', 'ROUTER', {
      isOpen,
      drawerWidth: DRAWER_WIDTH,
      currentTranslateX: drawerTranslateX.value,
    });
    
    if (isOpen) {
      // Mark that we're opening
      openingRef.current = true;
      
      // Disable backdrop touches initially
      setBackdropTouchable(false);
      
      logger.info('Opening navigation drawer', 'ROUTER', {
        drawerWidth: DRAWER_WIDTH,
        animationDuration: 300,
      });
      
      drawerTranslateX.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
      RNAnimated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        logger.debug('Backdrop animation complete (open)', 'ROUTER');
      });
      
      // Enable backdrop touches after a delay to prevent immediate close
      const timer = setTimeout(() => {
        openingRef.current = false;
        setBackdropTouchable(true);
        logger.debug('Backdrop now touchable', 'ROUTER');
      }, 500); // Increased delay for Android
      
      return () => clearTimeout(timer);
    } else {
      openingRef.current = false;
      setBackdropTouchable(false);
      
      logger.info('Closing navigation drawer', 'ROUTER');
      
      drawerTranslateX.value = withSpring(-DRAWER_WIDTH, {
        damping: 20,
        stiffness: 90,
      });
      RNAnimated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        logger.debug('Backdrop animation complete (close)', 'ROUTER');
      });
    }
  }, [isOpen, drawerTranslateX, backdropOpacity, DRAWER_WIDTH]);
  
  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerTranslateX.value }],
  }));
  
  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    haptic('light');
    logger.debug('Toggle section', 'ROUTER', { sectionId });
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  }, []);
  
  // Check if path is active
  const isPathActive = useCallback((href?: string) => {
    if (!href) return false;
    const cleanHref = href.replace('/(tabs)', '').replace('/(app)', '');
    const cleanPathname = pathname.replace('/(tabs)', '').replace('/(app)', '');
    return cleanHref === cleanPathname || (cleanHref !== '/' && cleanPathname.startsWith(cleanHref));
  }, [pathname]);
  
  // Handle navigation
  const handleNavigation = useCallback((href: string) => {
    logger.info('Navigation drawer item clicked', 'ROUTER', { href });
    haptic('light');
    router.push(href as any);
    onClose();
  }, [router, onClose]);
  
  // Filter items based on search
  const filterItems = useCallback((items: NavigationItem[], query: string): NavigationItem[] => {
    if (!query) return items;
    
    const searchLower = query.toLowerCase();
    return items.filter(item => {
      const matchesTitle = item.title.toLowerCase().includes(searchLower);
      const matchesChildren = item.children?.some(
        child => child.title.toLowerCase().includes(searchLower)
      );
      return matchesTitle || matchesChildren;
    });
  }, []);
  
  const filteredNavItems = filterItems(navigationItems, searchQuery);
  const filteredSupportItems = filterItems(supportNavigation, searchQuery);
  
  // Navigation item component
  const DrawerItem = ({ 
    item, 
    level = 0 
  }: { 
    item: NavigationItem; 
    level?: number;
  }) => {
    const isActive = isPathActive(item.href);
    const isExpanded = expandedSections.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    
    const scale = useSharedValue(1);
    const backgroundColor = useSharedValue(0);
    const chevronRotation = useSharedValue(isExpanded ? 90 : 0);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      backgroundColor: interpolate(
        backgroundColor.value,
        [0, 1],
        ['transparent', theme.muted + '20']
      ),
    }));
    
    const chevronAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${chevronRotation.value}deg` }],
    }));
    
    useEffect(() => {
      chevronRotation.value = withSpring(isExpanded ? 90 : 0, {
        damping: 15,
        stiffness: 150,
      });
    }, [isExpanded, chevronRotation]);
    
    const handlePress = () => {
      if (hasChildren) {
        toggleSection(item.id);
      } else if (item.href) {
        handleNavigation(item.href);
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
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            {
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              marginLeft: level * spacing[4],
              marginHorizontal: spacing[2],
              marginVertical: spacing[0.5],
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isActive ? theme.primary + '30' : 'transparent',
              backgroundColor: isActive ? theme.primary + '10' : 'transparent',
            },
            animatedStyle,
          ]}
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
            
            {item.badge !== undefined && item.badge !== 0 && (
              <Badge
                variant={item.badgeVariant || 'default'}
                size="sm"
              >
                {item.badge}
              </Badge>
            )}
            
            {hasChildren && (
              <Animated.View style={chevronAnimatedStyle}>
                <Symbol
                  name="chevron.right"
                  size={16}
                  color={theme.mutedForeground}
                />
              </Animated.View>
            )}
          </HStack>
        </AnimatedPressable>
        
        {hasChildren && isExpanded && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            {item.children!.map((child) => (
              <DrawerItem
                key={child.id}
                item={child}
                level={level + 1}
              />
            ))}
          </Animated.View>
        )}
      </View>
    );
  };
  
  // Don't render if not open - prevents re-initialization issues
  if (!isOpen) {
    logger.debug('NavigationDrawer not rendering - closed', 'ROUTER');
    return null;
  }
  
  logger.debug('NavigationDrawer rendering modal', 'ROUTER');
  
  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="none"
      // Temporarily disable onRequestClose to test
      // onRequestClose={() => {
      //   logger.debug('Modal onRequestClose called', 'ROUTER', {
      //     isOpening: openingRef.current,
      //   });
      //   if (!openingRef.current) {
      //     onClose();
      //   }
      // }}
      onShow={() => {
        logger.info('Modal shown', 'ROUTER');
      }}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      presentationStyle="overFullScreen"
    >
      <View style={StyleSheet.absoluteFillObject}>
        {/* Backdrop */}
        <TouchableWithoutFeedback 
          onPress={() => {
            logger.debug('Backdrop touched', 'ROUTER', {
              backdropTouchable,
              isOpening: openingRef.current,
            });
            if (backdropTouchable && !openingRef.current) {
              logger.info('Closing drawer via backdrop', 'ROUTER');
              onClose();
            }
          }}
          disabled={!backdropTouchable}
        >
          <RNAnimated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                opacity: backdropOpacity,
              },
            ]}
          />
        </TouchableWithoutFeedback>
        
        {/* Drawer */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: DRAWER_WIDTH,
              backgroundColor: theme.background,
              ...(Platform.OS === 'ios' ? {
                shadowColor: '#000',
                shadowOffset: { width: 2, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
              } : {
                elevation: 24, // Higher elevation for Android
              }),
              zIndex: 1000, // Ensure drawer is above backdrop
            },
            drawerAnimatedStyle,
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: insets.top,
              paddingBottom: insets.bottom + spacing[4],
            }}
          >
            <VStack gap={4}>
              {/* Header */}
              <VStack gap={3} p={4}>
                {/* User profile */}
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
                
                {/* Search */}
                <Box
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.input,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                  }}
                >
                  <Symbol name="magnifyingglass" size={16} color={theme.mutedForeground} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search menu..."
                    placeholderTextColor={theme.mutedForeground}
                    style={{
                      flex: 1,
                      marginLeft: spacing[2],
                      fontSize: 14,
                      color: theme.foreground,
                      ...(Platform.OS === 'web' && { outline: 'none' }),
                    }}
                  />
                  {searchQuery && (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <Symbol name="xmark.circle.fill" size={16} color={theme.mutedForeground} />
                    </Pressable>
                  )}
                </Box>
              </VStack>
              
              <Separator />
              
              {/* Main navigation */}
              <VStack gap={1}>
                {filteredNavItems.map((item) => (
                  <DrawerItem key={item.id} item={item} />
                ))}
              </VStack>
              
              <Separator />
              
              {/* Support section */}
              <VStack gap={1}>
                <Text
                  size="sm"
                  weight="semibold"
                  colorTheme="mutedForeground"
                  style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[1] }}
                >
                  HELP & SUPPORT
                </Text>
                {filteredSupportItems.map((item) => (
                  <DrawerItem key={item.id} item={item} />
                ))}
              </VStack>
              
              <Separator />
              
              {/* Actions */}
              <VStack gap={2} px={4}>
                <SignOutButton fullWidth variant="outline" />
              </VStack>
            </VStack>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export const NavigationDrawer = React.memo(NavigationDrawerComponent);