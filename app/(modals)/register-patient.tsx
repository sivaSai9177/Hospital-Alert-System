import React from 'react';
import { Platform, View, KeyboardAvoidingView, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHospitalContext } from '@/hooks/healthcare';
import { PatientCreationForm } from '@/components/blocks/healthcare';
import { Text } from '@/components/universal/typography';
import { VStack } from '@/components/universal/layout';
import { Symbol, AlertCircle } from '@/components/universal/display/Symbols';
import { Button } from '@/components/universal/interaction';
import { useHealthcareAccess } from '@/hooks/usePermissions';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { logger } from '@/lib/core/debug/unified-logger';
import { AppLoadingScreen } from '@/components/blocks/loading/AppLoadingScreen';

export default function RegisterPatientModal() {
  const router = useRouter();
  const { hospitalId } = useHospitalContext();
  const { canCreatePatients, isLoading } = useHealthcareAccess();
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isDesktop } = useResponsive();
  
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // If can't go back (e.g., after refresh), go to patients list
      router.replace('/patients' as any);
    }
  };

  const handleSuccess = (patient?: any) => {
    // Navigate to patient details if patient was created
    if (patient?.id) {
      logger.info('Navigating to patient details', 'REGISTER_PATIENT', { patientId: patient.id });
      // Use push instead of replace to maintain navigation stack
      router.push(`/patient-details?patientId=${patient.id}` as any);
    } else {
      router.back();
    }
  };

  // Show loading screen while permissions are being determined
  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Register Patient',
            headerLeft: () => (
              <Pressable
                onPress={handleBack}
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

  // Check permissions after loading
  if (!canCreatePatients) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Register Patient',
            headerLeft: () => (
              <Pressable
                onPress={handleBack}
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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4] }}>
            <VStack gap={4} align="center">
              <AlertCircle size={48} color="destructive" />
              <Text size="lg" weight="semibold" align="center">
                Access Denied
              </Text>
              <Text colorTheme="mutedForeground" align="center">
                Only doctors and head doctors can register new patients.
              </Text>
              <Button
                variant="default"
                onPress={handleBack}
                style={{ marginTop: 20 }}
              >
                Go Back
              </Button>
            </VStack>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!hospitalId) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Register Patient',
            headerLeft: () => (
              <Pressable
                onPress={handleBack}
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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4] }}>
            <VStack gap={4} align="center">
              <AlertCircle size={48} color="warning" />
              <Text size="lg" weight="semibold" align="center">
                No Hospital Selected
              </Text>
              <Text colorTheme="mutedForeground" align="center">
                Please select a hospital in settings before registering patients.
              </Text>
              <Button
                variant="default"
                onPress={handleBack}
                style={{ marginTop: 20 }}
              >
                Go Back
              </Button>
            </VStack>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Register Patient',
          headerLeft: () => (
            <Pressable
              onPress={handleBack}
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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        {(() => {
          try {
            return (
              <PatientCreationForm 
                hospitalId={hospitalId}
                onSuccess={handleSuccess}
                embedded={false}
              />
            );
          } catch (error) {
            logger.healthcare.error('RegisterPatientModal error', {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              hospitalId,
              canCreatePatients,
            });
            
            return (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4] }}>
                <VStack gap={4} align="center">
                  <Text size="lg" weight="semibold" colorTheme="destructive">Error Loading Form</Text>
                  <Text colorTheme="mutedForeground" align="center">
                    Unable to load the patient registration form. Please try again.
                  </Text>
                  <Button onPress={handleBack}>Go Back</Button>
                </VStack>
              </View>
            );
          }
        })()}
      </SafeAreaView>
    </>
  );
}