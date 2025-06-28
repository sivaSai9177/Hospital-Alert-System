import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { 
  VStack, 
  HStack, 
  Text, 
  Card, 
  Badge, 
  Button,
  Symbol,
} from '@/components/universal';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { navigationLogger, getNavigationHistory } from '@/lib/navigation/navigation-logger';
import { isValidRoute, VALID_ROUTES } from '@/lib/navigation/route-validator';
import { haptic } from '@/lib/ui/haptics';
import { useDebugStore } from '@/lib/stores/debug-store';

export function NavigationDebugger() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { showNavigationDebugger } = useDebugStore();
  const [history, setHistory] = useState(getNavigationHistory());
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    // Update history when navigation occurs
    const interval = setInterval(() => {
      setHistory(getNavigationHistory());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const stats = navigationLogger.getStatistics();
  const isCurrentRouteValid = isValidRoute(pathname);
  
  const toggleExpanded = () => {
    haptic('light');
    setExpanded(!expanded);
  };
  
  const navigateToRoute = (route: string) => {
    haptic('light');
    router.push(route as any);
  };
  
  const clearHistory = () => {
    haptic('medium');
    navigationLogger.clearHistory();
    setHistory([]);
  };
  
  if (!__DEV__ || !showNavigationDebugger) return null;
  
  return (
    <View
      style={{
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 80,
        right: 16,
        zIndex: 9999,
      }}
    >
      {/* Collapsed View */}
      {!expanded && (
        <Pressable
          onPress={toggleExpanded}
          style={{
            backgroundColor: isCurrentRouteValid ? theme.primary : theme.destructive,
            borderRadius: 28,
            width: 56,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Symbol 
            name="map.fill" 
            size={24} 
            color="white" 
          />
        </Pressable>
      )}
      
      {/* Expanded View */}
      {expanded && (
        <Card
          style={{
            width: 320,
            maxHeight: 500,
            backgroundColor: theme.card,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          <VStack gap={3}>
            {/* Header */}
            <HStack justifyContent="space-between" alignItems="center" p={3}>
              <Text weight="bold">Navigation Debugger</Text>
              <Pressable onPress={toggleExpanded}>
                <Symbol name="xmark.circle.fill" size={24} color={theme.mutedForeground} />
              </Pressable>
            </HStack>
            
            {/* Current Route */}
            <VStack gap={2} px={3}>
              <Text size="sm" colorTheme="mutedForeground">Current Route</Text>
              <HStack gap={2} alignItems="center">
                <Text weight="medium" style={{ flex: 1 }}>{pathname}</Text>
                <Badge 
                  variant={isCurrentRouteValid ? "default" : "destructive"}
                  size="sm"
                >
                  <Text>{isCurrentRouteValid ? "Valid" : "Invalid"}</Text>
                </Badge>
              </HStack>
            </VStack>
            
            {/* Statistics */}
            <VStack gap={2} px={3}>
              <Text size="sm" colorTheme="mutedForeground">Statistics</Text>
              <HStack gap={2} flexWrap="wrap">
                <Badge variant="outline" size="sm">
                  <Text>{stats.totalNavigations} navigations</Text>
                </Badge>
                <Badge variant="outline" size="sm">
                  <Text>{stats.invalidNavigations} invalid</Text>
                </Badge>
                <Badge variant="outline" size="sm">
                  <Text>{Object.keys(stats.topRoutes).length} routes</Text>
                </Badge>
              </HStack>
            </VStack>
            
            {/* Recent History */}
            <VStack gap={2} px={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text size="sm" colorTheme="mutedForeground">Recent History</Text>
                <Button size="xs" variant="ghost" onPress={clearHistory}>
                  Clear
                </Button>
              </HStack>
              <ScrollView style={{ maxHeight: 150 }}>
                <VStack gap={1}>
                  {history.slice(-5).reverse().map((event, index) => (
                    <HStack key={index} gap={2} alignItems="center">
                      <Badge 
                        variant="outline" 
                        size="xs"
                        style={{ minWidth: 60 }}
                      >
                        <Text>{event.type}</Text>
                      </Badge>
                      <Text size="xs" style={{ flex: 1 }} numberOfLines={1}>
                        {event.href || 'N/A'}
                      </Text>
                      {!event.valid && (
                        <Symbol name="exclamationmark.triangle" size={12} color={theme.destructive} />
                      )}
                    </HStack>
                  ))}
                </VStack>
              </ScrollView>
            </VStack>
            
            {/* All Routes */}
            <VStack gap={2} px={3} pb={3}>
              <Pressable onPress={() => setShowAllRoutes(!showAllRoutes)}>
                <HStack gap={2} alignItems="center">
                  <Text size="sm" colorTheme="mutedForeground">All Routes</Text>
                  <Symbol 
                    name={showAllRoutes ? "chevron.up" : "chevron.down"} 
                    size={12} 
                    color={theme.mutedForeground} 
                  />
                </HStack>
              </Pressable>
              
              {showAllRoutes && (
                <ScrollView style={{ maxHeight: 200 }}>
                  <VStack gap={1}>
                    {VALID_ROUTES.map((route) => (
                      <Pressable
                        key={route}
                        onPress={() => navigateToRoute(route)}
                        style={{
                          paddingVertical: spacing[1],
                          paddingHorizontal: spacing[2],
                          borderRadius: 4,
                          backgroundColor: pathname === route ? theme.accent : 'transparent',
                        }}
                      >
                        <HStack gap={2} alignItems="center">
                          <Text 
                            size="xs" 
                            weight={pathname === route ? "medium" : "normal"}
                          >
                            {route}
                          </Text>
                          {pathname === route && (
                            <Symbol name="checkmark.circle.fill" size={12} color={theme.primary} />
                          )}
                        </HStack>
                      </Pressable>
                    ))}
                  </VStack>
                </ScrollView>
              )}
            </VStack>
          </VStack>
        </Card>
      )}
    </View>
  );
}