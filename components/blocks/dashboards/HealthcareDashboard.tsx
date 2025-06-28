import React, { Suspense } from 'react';
import { Platform, ScrollView, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/theme/provider';
import { useHospitalStore } from '@/lib/stores/hospital-store';
import { useHealthcareAccess } from '@/hooks/usePermissions';
import { HealthcareErrorBoundary } from '@/components/providers/HealthcareErrorBoundary';
import { 
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Box,
  Heading1,
  Avatar,
  Skeleton,
  Grid,
  StatusGlassCard,
  Card,
  Badge,
  GlassCard,
} from '@/components/universal';
import { 
  ShiftStatus,
  MetricsOverview,
  AlertSummaryEnhanced,
  ActivePatients,
  GlassLoadingScreen,
} from '@/components/blocks/healthcare';
import { MobileHealthcareDashboard } from './MobileHealthcareDashboard';
import { HospitalSwitcher } from '@/components/blocks/organization';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useAlertWebSocket } from '@/hooks/healthcare';
import { useResponsive } from '@/hooks/responsive';

// Export header component for navigation
export function HealthcareDashboardHeader() {
  const { user } = useAuth();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { currentHospital } = useHospitalStore();
  const [isRefreshing, setRefreshing] = React.useState(false);
  
  const role = user?.role as 'doctor' | 'nurse' | 'head_doctor' | 'operator';
  
  return (
    <GlassCard 
      className="relative overflow-hidden"
      style={{
        backgroundColor: theme.background,
        borderColor: theme.border,
        borderWidth: 1,
        marginBottom: 0,
        borderRadius: 0,
      }}
    >
      <Box p={3}>
        <VStack gap={spacing[2]}>
          {/* User Info Row with Avatar on Left */}
          <HStack justifyContent="space-between" alignItems="center">
            <HStack gap={3} alignItems="center" flex={1}>
              <Avatar
                source={user?.image ? { uri: user.image } : undefined}
                name={user?.name || 'User'}
                size="lg"
                style={{
                  borderWidth: 2,
                  borderColor: theme.border,
                }}
              />
              <VStack gap={1} flex={1}>
                <Text size="xl" weight="bold">
                  Welcome back, {user?.name?.split(' ')[0] || 'Doctor'}
                </Text>
                <HStack gap={2} alignItems="center">
                  <Badge variant="outline" size="sm">
                    {role?.charAt(0).toUpperCase() + role?.slice(1).replace('_', ' ')}
                  </Badge>
                  <Text size="sm" colorTheme="mutedForeground">
                    {currentHospital?.name || 'Select Hospital'}
                  </Text>
                </HStack>
              </VStack>
            </HStack>
            
            {/* Shift Status - Moved to right side */}
            <Box 
              style={{
                backgroundColor: theme.muted,
                borderRadius: 12,
                padding: spacing[2],
                minWidth: 200,
              }}
            >
              {isRefreshing ? (
                <Skeleton height={60} />
              ) : (
                <Suspense fallback={<Skeleton height={60} />}>
                  <HealthcareErrorBoundary>
                    <ShiftStatus />
                  </HealthcareErrorBoundary>
                </Suspense>
              )}
            </Box>
          </HStack>
        </VStack>
      </Box>
    </GlassCard>
  );
}

export default function HealthcareDashboard() {
  const { user, hasHydrated, isRefreshing } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const [refreshing, setRefreshing] = React.useState(false);
  const { currentHospital } = useHospitalStore();
  const healthcarePermissions = useHealthcareAccess();
  const { isDesktop, isMobile } = useResponsive();
  
  // Healthcare context
  const role = user?.role as 'doctor' | 'nurse' | 'head_doctor' | 'operator';
  const hospitalId = currentHospital?.id || user?.defaultHospitalId || '';
  
  // Hooks must be called before conditional returns
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);
  
  // Enable real-time updates (only if we have a hospitalId)
  useAlertWebSocket({
    hospitalId: hospitalId,
    showNotifications: true,
    enabled: !!hospitalId && hospitalId !== '',
  });
  
  // Debug log to check user state
  React.useEffect(() => {
    console.log('[HealthcareDashboard] Component state', {
      hasHydrated,
      isAuthenticated: !!user,
      userId: user?.id,
      userRole: user?.role,
      userOrgId: user?.organizationId,
      userOrgName: user?.organizationName,
      defaultHospitalId: user?.defaultHospitalId,
      currentHospitalId: currentHospital?.id,
      currentHospitalName: currentHospital?.name,
      healthcarePermissions: {
        isHealthcareRole: healthcarePermissions.isHealthcareRole,
        canViewAlerts: healthcarePermissions.canViewAlerts,
        canCreateAlerts: healthcarePermissions.canCreateAlerts,
        canAcknowledgeAlerts: healthcarePermissions.canAcknowledgeAlerts,
      },
      hospitalId: hospitalId,
      role: role,
      timestamp: new Date().toISOString(),
    });
  }, [user, hasHydrated, currentHospital, healthcarePermissions, hospitalId, role]);
  
  // Show loading state while auth is hydrating or hospitals are loading
  const { isLoading: hospitalsLoading } = useHospitalStore();
  
  if (!hasHydrated || isRefreshing || hospitalsLoading) {
    return <GlassLoadingScreen message="Loading healthcare data..." showProgress={true} />;
  }
  
  // Use mobile-optimized dashboard for mobile devices
  if (Platform.OS !== 'web' || isMobile) {
    return <MobileHealthcareDashboard />;
  }
  
  // Check if user has hospital assignment after loading is complete
  if (!hospitalId && hasHydrated && !hospitalsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.muted || theme.background + 'F0' }}>
        <Container className="flex-1 items-center justify-center">
          <VStack gap={4} alignItems="center">
            <Text size="lg" weight="semibold">Hospital Assignment Required</Text>
            <Text colorTheme="mutedForeground" style={{ textAlign: 'center' }}>
              Healthcare features require hospital assignment.
            </Text>
            <Button 
              onPress={() => router.push('/settings')}
              variant="outline"
            >
              Complete Your Profile
            </Button>
          </VStack>
        </Container>
      </SafeAreaView>
    );
  }
  
  // Main scrollable content (without the header)
  const content = (
    <VStack gap={spacing[1]}>
      {/* Essential Actions - Better Design */}
      {(role === 'operator' || role === 'head_doctor') && (
        <Button
          onPress={() => router.push('/(modals)/create-alert')}
          variant="destructive"
          fullWidth
          size="lg"
          rippleEffect={true}
          animated={true}
          shadow="lg"
          style={{
            shadowColor: theme.destructive,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <HStack gap={3} alignItems="center">
            <Symbol 
              name="bell.badge" 
              size={24} 
              color="white" 
              animated 
              animationType="bounce"
              animationDelay={100}
            />
            <Text size="lg" weight="bold" style={{ color: 'white' }}>
              Create Emergency Alert
            </Text>
          </HStack>
        </Button>
      )}
      
      {/* Main Content Area */}
      <View style={{
        flexDirection: isDesktop ? 'row' : 'column',
        flexWrap: 'wrap',
        gap: spacing[2],
        marginHorizontal: isDesktop ? -spacing[2] : 0,
      }}>
        
        {/* Metrics Overview - No wrapper card */}
        <View style={{ 
          flex: 1,
          paddingHorizontal: isDesktop ? spacing[2] : 0,
        }}>
          {isRefreshing ? (
            <Skeleton height={400} />
          ) : (
            <Suspense fallback={<Skeleton height={400} />}>
              <HealthcareErrorBoundary>
                <MetricsOverview hospitalId={hospitalId} />
              </HealthcareErrorBoundary>
            </Suspense>
          )}
        </View>
      </View>
      
      {/* Alert Summary - No wrapper card */}
      {isRefreshing ? (
        <Skeleton height={200} />
      ) : (
        <Suspense fallback={<Skeleton height={200} />}>
          <HealthcareErrorBoundary>
            <AlertSummaryEnhanced 
              showOrganizationStats={true} 
              showDetails={true} 
              maxItems={5} 
            />
          </HealthcareErrorBoundary>
        </Suspense>
      )}
      
      {/* Active Patients for doctors */}
      {(role === 'doctor' || role === 'head_doctor') && (
        <View>
          {isRefreshing ? (
            <Skeleton height={400} />
          ) : (
            <Suspense fallback={<Skeleton height={400} />}>
              <HealthcareErrorBoundary>
                <ActivePatients scrollEnabled={Platform.OS === 'web'} />
              </HealthcareErrorBoundary>
            </Suspense>
          )}
        </View>
      )}
    </VStack>
  );
  
  // For mobile, wrap in ScrollView with proper padding
  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.muted || theme.background + 'F0' }}>
        {/* Header - sticks to top on mobile */}
        <HealthcareDashboardHeader />
        
        <ScrollView
          contentContainerStyle={{ 
            flexGrow: 1,
            padding: spacing[2],
            paddingBottom: spacing[3],
          }}
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
      </SafeAreaView>
    );
  }
  
  // For web, render with proper container and max width
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.muted || theme.background + 'F0' }}>
      {/* Sticky Header for Web */}
      <View style={{
        position: Platform.OS === 'web' ? 'sticky' : 'relative',
        top: 0,
        zIndex: 10,
        backgroundColor: theme.background,
      }}>
        <HealthcareDashboardHeader />
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          flexGrow: 1,
          padding: spacing[3],
          width: '100%',
          alignItems: 'center'
        }}
      >
        <View style={{ width: '100%', maxWidth: 1440 }}>
          {content}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}