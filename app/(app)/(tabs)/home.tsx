import React from 'react';
import { ScrollView, RefreshControl, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/theme/provider';
import { 
  Container,
  VStack,
  HStack,
  Text,
  Card,
  Button,
  Badge,
  Heading1,
  Avatar,
  Box,
} from '@/components/universal';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useShadow } from '@/hooks/useShadow';
import { UnifiedHeader } from '@/components/blocks/navigation/UnifiedHeader';

// Import role-specific dashboards
import { 
  OperatorDashboard, 
  HealthcareDashboard, 
  HealthcareDashboardHeader,
  AdminDashboard, 
  ManagerDashboard 
} from '@/components/blocks/dashboards';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const shadowMd = useShadow({ size: 'md' });
  const [refreshing, setRefreshing] = React.useState(false);
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);
  
  // Render role-specific dashboard
  const renderDashboard = () => {
    const role = user?.role || 'user';
    
    switch (role) {
      case 'operator':
        return <OperatorDashboard />;
      
      case 'doctor':
      case 'nurse':
      case 'head_doctor':
        return <HealthcareDashboard />;
        
      case 'admin':
        return <AdminDashboard />;
        
      case 'manager':
        return <ManagerDashboard />;
        
      default:
        return <DefaultDashboard />;
    }
  };
  
  return renderDashboard();
}

// Default dashboard for regular users
function DefaultDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const shadowMd = useShadow({ size: 'md' });
  const [refreshing, setRefreshing] = React.useState(false);
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);
  
  const content = (
    <VStack gap={5 as any}>
      
      {/* Quick Actions */}
      <Card style={shadowMd}>
        <Box p={4 as any}>
          <VStack gap={3 as any}>
            <Text size="base" weight="bold">Quick Actions</Text>
            <HStack gap={2 as any}>
              <Button
                onPress={() => router.push('/settings')}
                variant="outline"
                fullWidth
              >
                Settings
              </Button>
              {user?.organizationId && (
                <Button
                  onPress={() => router.push('/organization/dashboard')}
                  variant="outline"
                  fullWidth
                >
                  Organization
                </Button>
              )}
            </HStack>
          </VStack>
        </Box>
      </Card>
      
      {/* Status Card */}
      <Card style={shadowMd}>
        <Box p={4 as any}>
          <HStack justifyContent="space-between" alignItems="center">
            <VStack gap={1 as any}>
              <Text weight="semibold">Account Status</Text>
              <Text size="sm" colorTheme="mutedForeground">
                {user?.role ? user.role.replace('_', ' ').charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
              </Text>
            </VStack>
            <Badge variant="outline" size="md">
              Active
            </Badge>
          </HStack>
        </Box>
      </Card>
    </VStack>
  );
  
  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <UnifiedHeader 
            title="Welcome back!"
            subtitle={user?.name || user?.email || 'User'}
            rightElement={
              <Avatar
                source={user?.image ? { uri: user.image } : undefined}
                name={user?.name || 'User'}
                size="xl"
              />
            }
          />
          <ScrollView
            contentContainerStyle={{ padding: spacing[4] as any, paddingBottom: spacing[6] as any }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
              />
            }
          >
            {content}
          </ScrollView>
      </View>
    );
  }
  
  return (
    <Container>
      <UnifiedHeader 
          title="Welcome back!"
          subtitle={user?.name || user?.email || 'User'}
          rightElement={
            <Avatar
              source={user?.image ? { uri: user.image } : undefined}
              name={user?.name || 'User'}
              size="xl"
            />
          }
        />
        <VStack p={4} gap={4 as any}>
          {content}
        </VStack>
    </Container>
  );
}