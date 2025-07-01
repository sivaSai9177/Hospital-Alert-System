import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Text,
  VStack,
  HStack,
  Button,
  Symbol,
  GlassCard,
} from '@/components/universal';
import { AlertCreationFormSimplified, SuccessAnimation } from '@/components/blocks/healthcare';
import { HealthcareErrorBoundary } from '@/components/blocks/errors';
import { useAuth } from '@/hooks/useAuth';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useTheme } from '@/lib/theme/provider';
import { useHealthcareAccess } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/blocks/auth/PermissionGuard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { logger } from '@/lib/core/debug/unified-logger';
import { useHospitalStore } from '@/lib/stores/hospital-store';
import { useHospitalPermissions } from '@/hooks/useHospitalPermissions';
import { haptic } from '@/lib/ui/haptics';
import { useResponsive } from '@/hooks/responsive';
import { useShadow } from '@/hooks/useShadow';
import { AppLoadingScreen } from '@/components/blocks/loading/AppLoadingScreen';

export default function CreateAlertModal() {
  const { spacing } = useSpacing();
  const { user } = useAuth();
  const theme = useTheme();
  const { currentHospital } = useHospitalStore();
  const hospitalPermissions = useHospitalPermissions();
  const useHealthcareAccessResult = useHealthcareAccess();
  const permissionsLoading = 'isLoading' in useHealthcareAccessResult ? useHealthcareAccessResult.isLoading : false;
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successData, setSuccessData] = React.useState<{ roomNumber?: string; alertId?: string }>({});
  const headerScale = useSharedValue(1);
  const { isMobile, isDesktop } = useResponsive();
  const shadowMd = useShadow({ size: 'md' });
  
  // Debug logging
  React.useEffect(() => {
    logger.healthcare.info('CreateAlertModal mounted', {
      user: user,
      organizationId: user?.organizationId,
      defaultHospitalId: user?.defaultHospitalId,
      currentHospitalId: currentHospital?.id,
      currentHospital: currentHospital,
      hospitalStoreState: {
        hasCurrentHospital: !!currentHospital,
        currentHospitalName: currentHospital?.name,
      },
      permissions: {
        canCreateAlerts: hospitalPermissions.canCreateAlert(),
        hasHospitalAssigned: hospitalPermissions.hasHospitalAssigned,
        userRole: hospitalPermissions.userRole,
        userHospitalId: hospitalPermissions.userHospitalId,
        currentHospitalId: hospitalPermissions.currentHospitalId,
      },
      permissionsLoading,
    });
  }, [user, currentHospital, hospitalPermissions, permissionsLoading]);
  
  const handleClose = () => {
    haptic('light');
    if (router.canGoBack()) {
      router.back();
    } else {
      // If can't go back (e.g., after refresh), go to alerts list
      router.replace('/alerts' as any);
    }
  };
  
  const handleSuccess = (alertData?: any) => {
    haptic('success');
    setSuccessData({ 
      roomNumber: alertData?.roomNumber,
      alertId: alertData?.id 
    });
    setShowSuccess(true);
  };
  
  const handleSuccessComplete = () => {
    // Navigate to alerts screen with new alert ID
    if (successData.alertId) {
      router.replace({
        pathname: '/alerts',
        params: { newAlertId: successData.alertId }
      });
    } else {
      router.replace('/alerts');
    }
  };
  
  // Get the hospital ID from either current hospital or user's default
  const hospitalId = currentHospital?.id || user?.defaultHospitalId;
  
  // Show loading screen while permissions are being determined
  if (permissionsLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'modal',
            headerTitleAlign: 'center',
            headerRight: () => null,
            headerTitle: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 32 }}>🚨</Text>
                <Text style={{ fontSize: 19, fontWeight: '600', color: theme.foreground }}>
                  Create Emergency Alert
                </Text>
              </View>
            ),
            headerLeft: () => (
              <Pressable
                onPress={handleClose}
                style={{
                  padding: spacing[2],
                  marginLeft: Platform.OS === 'ios' ? 0 : -spacing[2],
                }}
              >
                <Symbol 
                  name={Platform.OS === 'ios' ? "chevron.left" : "arrow.left"} 
                  size={24} 
                  color={theme.foreground} 
                />
              </Pressable>
            ),
          }}
        />
        <AppLoadingScreen showProgress />
      </>
    );
  }
  
  // Check if user has hospital assignment
  if (!hospitalId) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'modal',
            headerTitleAlign: 'center',
            headerRight: () => null,
            headerTitle: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 32 }}>🚨</Text>
                <Text style={{ fontSize: 19, fontWeight: '600', color: theme.foreground }}>
                  Create Emergency Alert
                </Text>
              </View>
            ),
            headerLeft: () => (
              <Pressable
                onPress={handleClose}
                style={{
                  padding: spacing[2],
                  marginLeft: Platform.OS === 'ios' ? 0 : -spacing[2],
                }}
              >
                <Symbol 
                  name={Platform.OS === 'ios' ? "chevron.left" : "arrow.left"} 
                  size={24} 
                  color={theme.foreground} 
                />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.muted }}>
          <VStack gap={spacing[6] as any} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text size="base" weight="semibold">Hospital Assignment Required</Text>
            <Text colorTheme="mutedForeground" style={{ textAlign: 'center' }}>
              You need to be assigned to a hospital to create alerts.
            </Text>
            <VStack gap={spacing[3] as any}>
              <Button 
                onPress={() => {
                  router.back();
                  router.push('/(tabs)/settings' as any);
                }}
              >
                Complete Your Profile
              </Button>
              <Button 
                onPress={handleClose}
                variant="outline"
              >
                Cancel
              </Button>
            </VStack>
          </VStack>
        </SafeAreaView>
      </>
    );
  }

  // Check permissions with hospital context
  if (!permissionsLoading && !hospitalPermissions.canCreateAlert()) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'modal',
            headerTitleAlign: 'center',
            headerRight: () => null,
            headerTitle: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 32 }}>🚨</Text>
                <Text style={{ fontSize: 19, fontWeight: '600', color: theme.foreground }}>
                  Create Emergency Alert
                </Text>
              </View>
            ),
            headerLeft: () => (
              <Pressable
                onPress={handleClose}
                style={{
                  padding: spacing[2],
                  marginLeft: Platform.OS === 'ios' ? 0 : -spacing[2],
                }}
              >
                <Symbol 
                  name={Platform.OS === 'ios' ? "chevron.left" : "arrow.left"} 
                  size={24} 
                  color={theme.foreground} 
                />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.muted }}>
          <VStack gap={spacing[6] as any} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text size="base" weight="semibold">Permission Denied</Text>
            <Text colorTheme="mutedForeground" style={{ textAlign: 'center' }}>
              You don&apos;t have permission to create alerts in this hospital.
            </Text>
            <Button onPress={handleClose} variant="outline">
              Go Back
            </Button>
          </VStack>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          presentation: isMobile ? 'fullScreenModal' : 'modal',
          headerTitleAlign: 'center',
          headerRight: () => null,
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: isMobile ? 28 : 32 }}>🚨</Text>
              <Text style={{ fontSize: isMobile ? 17 : 19, fontWeight: '600', color: theme.foreground }}>
                Create Emergency Alert
              </Text>
            </View>
          ),
          headerLeft: () => (
            <Pressable
              onPress={handleClose}
              style={{
                padding: spacing[2],
                marginLeft: Platform.OS === 'ios' ? 0 : -spacing[2],
              }}
            >
              <Symbol 
                name={isMobile ? "xmark" : (Platform.OS === 'ios' ? "chevron.left" : "arrow.left")} 
                size={isMobile ? 22 : 24} 
                color={theme.foreground} 
              />
            </Pressable>
          ),
        }}
      />
      <PermissionGuard permission={PERMISSIONS.CREATE_ALERTS}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.muted }} edges={['bottom']}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                padding: isMobile ? spacing[3] : spacing[4],
                paddingTop: isMobile ? spacing[6] : spacing[8],
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ 
                width: '100%', 
                maxWidth: isDesktop ? 600 : '100%',
                alignSelf: 'center',
              }}>
                <HealthcareErrorBoundary>
                  <AlertCreationFormSimplified 
                    hospitalId={hospitalId} 
                    onSuccess={handleSuccess}
                    embedded={true}
                  />
                </HealthcareErrorBoundary>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
          
          {/* Success Animation Overlay */}
          <SuccessAnimation
            visible={showSuccess}
            title="Alert Sent!"
            subtitle={successData.roomNumber ? `Room ${successData.roomNumber} has been notified` : 'Medical staff have been notified'}
            onComplete={handleSuccessComplete}
            autoHide={true}
            autoHideDelay={2000}
          />
        </SafeAreaView>
      </PermissionGuard>
    </>
  );
}