import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, RefreshControl, Platform, ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  VStack,
  HStack,
  Text,
  Container,
  Button,
  Badge,
  Box,
  Card,
  Input,
  Select,
} from '@/components/universal';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { ActivePatients } from '@/components/blocks/healthcare';
import { Symbol } from '@/components/universal/display/Symbols';
import { EmptyState } from '@/components/universal/feedback/EmptyState';
import { useHealthcareAccess } from '@/hooks/usePermissions';
import { ApiErrorBoundary } from '@/components/blocks/errors/ApiErrorBoundary';
import { useHospitalContext, usePatients } from '@/hooks/healthcare';
import { useSSRPrefetchHealthcare } from '@/lib/api/use-ssr-prefetch';
import { haptic } from '@/lib/ui/haptics';
import { log } from '@/lib/core/debug/unified-logger';
import { api } from '@/lib/api/trpc';
import { UnifiedHeader } from '@/components/blocks/navigation/UnifiedHeader';

// Define Patient type locally until API is ready
interface Patient {
  id: string;
  name: string;
  roomNumber: string;
  department: string;
  condition?: string;
  assignedDoctor?: string;
  assignedNurse?: string;
  admittedAt?: string;
  notes?: string;
}

function PatientsScreenContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Use permission hooks
  const { canViewPatients, isMedicalStaff, canCreatePatients } = useHealthcareAccess();
  
  // Hospital context validation
  const hospitalContext = useHospitalContext();
  
  // SSR prefetch for web
  useSSRPrefetchHealthcare(hospitalContext.hospitalId);
  
  // Use enhanced API hook with built-in error handling and caching
  // This must be called before any conditional returns
  const { 
    data, 
    isLoading, 
    refetch,
    isOffline,
    cachedData,
  } = usePatients({
    status: departmentFilter === 'all' ? undefined : departmentFilter as 'active' | 'discharged',
    enabled: !!user && canViewPatients && isMedicalStaff && !!hospitalContext.hospitalId,
  }) as any;
  
  // Get query utils for invalidation
  const utils = api.useUtils();
  
  // Handle new patient navigation
  useEffect(() => {
    const newPatientId = searchParams.newPatientId;
    
    if (newPatientId && typeof newPatientId === 'string') {
      log.info('Navigating to new patient details', 'PATIENTS', { newPatientId });
      
      // First, invalidate and refetch to ensure we have the latest data
      const navigateToPatient = async () => {
        try {
          // Invalidate the patients query to force fresh data
          await utils.healthcare.getMyPatients.invalidate();
          
          // Wait a bit for the refetch to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Navigate to patient details
          router.push(`/patient-details?patientId=${newPatientId}`);
          
          // Clear the parameter to prevent re-triggering
          router.setParams({ newPatientId: undefined });
        } catch (error) {
          log.error('Failed to navigate to new patient', 'PATIENTS', error);
        }
      };
      
      navigateToPatient();
    }
  }, [searchParams.newPatientId, router, utils]);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic('light');
    try {
      await refetch();
      haptic('success');
    } catch {
      // Error handling is done by the hook
      log.error('Failed to refresh patients', 'PATIENTS');
      haptic('error');
    }
    setRefreshing(false);
  }, [refetch]);
  
  // Show simple message if hospital is missing (non-blocking)
  if (!hospitalContext.hospitalId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Container>
          <VStack p={4} gap={4 as any}>
            <Card>
              <VStack p={6} gap={4 as any} style={{ alignItems: 'center' }}>
                <Symbol name="building.2.fill" size={48} color={theme.mutedForeground} />
              <VStack gap={2 as any} style={{ alignItems: 'center' }}>
                <Text size="lg" weight="medium">No Hospital Selected</Text>
                <Text size="sm" style={{ color: theme.mutedForeground, textAlign: 'center' }}>
                  Please select a hospital from settings to manage patients.
                </Text>
              </VStack>
              <Button 
                variant="outline" 
                size="sm"
                onPress={() => {
                  haptic('light');
                  router.push('/(tabs)/settings' as any);
                }}
              >
                Go to Settings
              </Button>
              </VStack>
            </Card>
          </VStack>
        </Container>
      </View>
    );
  }
  
  // Return early if no valid hospital
  if (!hospitalContext.hospitalId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Container>
          <VStack p={4} gap={4 as any} alignItems="center" justifyContent="center" style={{ flex: 1 }}>
            <Text size="base" weight="semibold">Unable to Access Patients</Text>
            <Text colorTheme="mutedForeground" align="center">
              {hospitalContext.errorMessage || 'No hospital assigned'}
            </Text>
            <Button onPress={() => router.push('/home')} variant="outline">
              Return to Home
            </Button>
          </VStack>
        </Container>
      </View>
    );
  }
  
  
  // Check permissions
  if (!canViewPatients || !isMedicalStaff) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Container>
          <VStack p={4} gap={4 as any} alignItems="center" justifyContent="center" style={{ flex: 1 }}>
            <Text size="base">Access Restricted</Text>
            <Text colorTheme="mutedForeground" style={{ textAlign: 'center' }}>
              This section is only available to medical staff (doctors and nurses)
            </Text>
            <Button 
              onPress={() => router.push('/home')}
              variant="outline"
            >
              Go to Home
            </Button>
          </VStack>
        </Container>
      </View>
    );
  }
  
  // Use offline cached data if available when offline
  const patients = (data as any)?.patients || (cachedData as any)?.patients || [];
  const filteredPatients = patients.filter((patient: Patient) => {
    if (searchQuery && !patient.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !patient.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (departmentFilter !== 'all' && patient.department !== departmentFilter) {
      return false;
    }
    return true;
  });
  
  const content = (
    <VStack gap={4 as any}>
      
      {/* Search and Filters */}
      <Card>
        <Box p={3 as any}>
          <VStack gap={3 as any}>
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={<Symbol name="magnifyingglass" size={20} color={theme.mutedForeground} />}
            />
            <HStack gap={2 as any}>
              <Select 
                value={departmentFilter} 
                onValueChange={(value) => setDepartmentFilter(value as string)}
                placeholder="All Departments"
                options={[
                  { label: 'All Departments', value: 'all' },
                  { label: 'Emergency', value: 'emergency' },
                  { label: 'ICU', value: 'icu' },
                  { label: 'General Ward', value: 'general' },
                  { label: 'Pediatrics', value: 'pediatrics' },
                ]}
              />
            </HStack>
          </VStack>
        </Box>
      </Card>
      
      {/* Active Patients Component */}
      <ActivePatients />
      
      {/* Individual Patient Cards */}
      {filteredPatients.length === 0 && (
        <EmptyState
          variant={searchQuery || departmentFilter !== 'all' ? 'no-results' : 'no-patients'}
          title={searchQuery || departmentFilter !== 'all' ? 'No patients found' : 'No assigned patients'}
          description={
            searchQuery || departmentFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'You have no patients assigned to you at the moment'
          }
          actions={
            searchQuery || departmentFilter !== 'all'
              ? [{
                  label: 'Clear filters',
                  onPress: () => {
                    setSearchQuery('');
                    setDepartmentFilter('all');
                  },
                  variant: 'outline'
                }]
              : undefined
          }
        />
      )}
      
      {/* Show offline indicator */}
      {isOffline && cachedData && (
        <Card>
          <Box p={3} flexDirection="row" alignItems="center" gap={2}>
            <Symbol name="wifi.slash" size="sm" color={theme.mutedForeground} />
            <Text size="sm" colorTheme="mutedForeground">
              Showing cached data - offline mode
            </Text>
          </Box>
        </Card>
      )}
    </VStack>
  );
  
  // Handle loading state
  if (isLoading && !data && !cachedData) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Container>
          <VStack p={4} gap={4 as any} alignItems="center" justifyContent="center" style={{ flex: 1 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text mt={4} colorTheme="mutedForeground">Loading patients...</Text>
          </VStack>
        </Container>
      </View>
    );
  }
  
  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <UnifiedHeader 
            title="My Patients"
            subtitle="Manage and monitor patient care"
            rightElement={
              <HStack gap={2 as any} alignItems="center">
                <Badge variant="outline" size="md">
                  {`${filteredPatients.length} Active`}
                </Badge>
                {canCreatePatients && (
                  <Button
                    variant="default"
                    size="sm"
                    onPress={() => {
                      haptic('light');
                      router.push('/register-patient' as any);
                    }}
                  >
                    <Symbol name="plus" size={16} color="white" />
                    <Text style={{ color: 'white' }}>Register</Text>
                  </Button>
                )}
              </HStack>
            }
          />
          <ScrollView
            contentContainerStyle={{ padding: spacing[4] as any, paddingBottom: spacing[6] as any }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
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
        title="My Patients"
        subtitle="Manage and monitor patient care"
        rightElement={
          <HStack gap={2 as any} alignItems="center">
            <Badge variant="outline" size="md">
              {`${filteredPatients.length} Active`}
            </Badge>
            {canCreatePatients && (
              <Button
                variant="default"
                size="sm"
                onPress={() => {
                  haptic('light');
                  router.push('/register-patient' as any);
                }}
              >
                <Symbol name="plus" size={16} color="white" />
                <Text style={{ color: 'white' }}>Register</Text>
              </Button>
            )}
          </HStack>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <VStack p={4} gap={4 as any}>
          {content}
        </VStack>
      </ScrollView>
    </Container>
  );
}

// Export component wrapped with error boundary
export default function PatientsScreen() {
  return (
    <ApiErrorBoundary retryRoute="/patients">
      <PatientsScreenContent />
    </ApiErrorBoundary>
  );
}