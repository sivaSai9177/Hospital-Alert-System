/**
 * Hospital Setup Screen
 * Hospital selection and invitation code entry
 * Enhanced with theme support and validation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';
import { Text } from '@/components/universal/typography/Text';
import { Button } from '@/components/universal/interaction/Button';
import { Input } from '@/components/universal/form/Input';
import { VStack, HStack } from '@/components/universal/layout/Stack';
import { Symbol } from '@/components/universal/display/Symbols';
import { GlassCard } from '@/components/universal/display';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { useOnboardingValidation } from '../hooks/useOnboardingValidation';
import { haptic } from '@/lib/ui/haptics';
import { api } from '@/lib/api/trpc';
import { logger } from '@/lib/core/debug/unified-logger';
import { showAlert } from '@/lib/core/alert';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { useShadow } from '@/hooks/useShadow';
import { useSimpleFormDraft } from '@/hooks/useSimpleFormDraft';
import { debounce } from '@/lib/core/utils/debounce';
import type { Hospital } from '../types';

// Form data interface
interface HospitalForm {
  hospitalId: string;
  inviteCode?: string;
}

// Mock data - replace with actual API data
const mockHospitals: Hospital[] = [
  {
    id: '1',
    name: 'Central Medical Center',
    code: 'CMC',
    address: '123 Healthcare Blvd, Medical City, MC 12345',
    departments: [
      { id: '1', name: 'Emergency', description: '', isActive: true },
      { id: '2', name: 'ICU', description: '', isActive: true },
      { id: '3', name: 'Cardiology', description: '', isActive: true },
    ],
    requiresInvitation: false,
  },
  {
    id: '2',
    name: 'St. Mary\'s Hospital',
    code: 'SMH',
    address: '456 Healing Way, Caretown, CT 67890',
    departments: [
      { id: '4', name: 'Pediatrics', description: '', isActive: true },
      { id: '5', name: 'Maternity', description: '', isActive: true },
    ],
    requiresInvitation: true,
  },
  {
    id: '3',
    name: 'University Medical Center',
    code: 'UMC',
    address: '789 Academic Ave, College Town, CT 11111',
    departments: [
      { id: '6', name: 'Research', description: '', isActive: true },
      { id: '7', name: 'Teaching', description: '', isActive: true },
    ],
    requiresInvitation: true,
  },
];

export function HospitalSetupScreen() {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isTablet } = useResponsive();
  const shadowMd = useShadow({ size: 'md' });
  const shadowLg = useShadow({ size: 'lg' });
  
  const {
    state,
    updateUserData,
    completeStep,
    goToNextStep,
    goToPreviousStep,
  } = useOnboardingFlow();
  
  const {
    errors,
    validateField,
    validate,
    setError,
    clearError,
  } = useOnboardingValidation('hospital');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Form state for validation
  const [formData, setFormData] = useState<HospitalForm>({
    hospitalId: state.userData.hospitalId || '',
    inviteCode: '',
  });
  
  // Draft persistence
  const { saveDraft, clearDraft } = useSimpleFormDraft({
    formKey: 'onboarding-hospital',
    data: { searchQuery, hospitalId: selectedHospital?.id || '' },
    onDataChange: (data) => {
      if (data.searchQuery) setSearchQuery(data.searchQuery);
      if (data.hospitalId) {
        const hospital = mockHospitals.find(h => h.id === data.hospitalId);
        if (hospital) handleHospitalSelect(hospital);
      }
    },
    excludeFields: ['inviteCode'],
  });
  
  // Responsive values
  const inputSize = isMobile ? 'md' : 'lg';
  const buttonSize = isMobile ? 'md' : 'lg';
  const contentGap = isMobile ? 4 : 5;

  // Mock hospital search - api.organization.searchHospitals not available
  const hospitals: Hospital[] = mockHospitals;
  
  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setIsSearching(false);
    }, 300),
    []
  );
  
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 3) {
      setIsSearching(true);
      debouncedSearch(query);
    }
  }, [debouncedSearch]);

  const filteredHospitals = useMemo(() => {
    if (searchQuery.length < 3) return [];
    
    return hospitals.filter(h => 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, hospitals]);

  const handleHospitalSelect = useCallback((hospital: Hospital) => {
    haptic('light');
    setSelectedHospital(hospital);
    setFormData(prev => ({ ...prev, hospitalId: hospital.id }));
    clearError('hospitalId');
    
    if (hospital.requiresInvitation) {
      setShowInviteCode(true);
    } else {
      setShowInviteCode(false);
      setInviteCode('');
    }
  }, [clearError]);

  const handleContinue = async () => {
    if (!selectedHospital) {
      setError('hospitalId', 'Please select a hospital');
      return;
    }

    setIsSubmitting(true);
    haptic('light');

    try {
      // Verify invitation code if required
      if (selectedHospital.requiresInvitation && !inviteCode) {
        setError('inviteCode', 'Please enter your invitation code');
        setIsSubmitting(false);
        return;
      }

      // In a real app, verify invitation code with API
      if (inviteCode) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate invalid code for demo
        if (inviteCode !== 'DEMO-2024') {
          throw new Error('Invalid invitation code');
        }
      }

      // Clear draft on success
      await clearDraft();
      
      updateUserData({
        hospitalId: selectedHospital.id,
        hospitalName: selectedHospital.name,
      });

      haptic('success');
      completeStep('hospital-setup');
      goToNextStep();
    } catch (error: any) {
      haptic('error');
      logger.error('Hospital setup failed', error);
      
      if (error.message?.includes('Invalid invitation')) {
        setError('inviteCode', 'Invalid invitation code');
        showAlert({
          title: 'Invalid Code',
          description: 'Please check your invitation code and try again',
          variant: 'destructive',
        });
      } else {
        showAlert({
          title: 'Setup Failed',
          description: 'Unable to verify hospital access',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAccess = useCallback(() => {
    haptic('light');
    // In a real app, show form to request hospital access
    showAlert({
      title: 'Request Sent',
      description: 'Your request has been sent to the hospital administrator',
      variant: 'success',
    });
  }, []);
  
  // Check if form is valid
  const isFormValid = selectedHospital && 
    (!selectedHospital.requiresInvitation || inviteCode.length > 0);

  const renderHospitalItem = ({ item, index }: { item: Hospital; index: number }) => {
    const isSelected = selectedHospital?.id === item.id;

    return (
      <Animated.View
        entering={SlideInRight.duration(400).delay(Math.min(index * 50, 200))}
      >
        <TouchableOpacity
          onPress={() => handleHospitalSelect(item)}
          style={[
            {
              padding: spacing[4],
              borderRadius: spacing[3],
              marginBottom: spacing[3],
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isSelected
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.08)',
              borderWidth: 2,
              borderColor: isSelected
                ? 'rgba(255, 255, 255, 0.4)'
                : 'transparent',
            },
            ...(isSelected ? [shadowMd] : []),
          ]}
        >
          {/* Hospital Icon */}
          <View
            style={{
              width: spacing[12],
              height: spacing[12],
              borderRadius: spacing[3],
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing[4],
              backgroundColor: isSelected
                ? 'rgba(59, 130, 246, 0.3)'
                : 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <Symbol
              name="building.2.fill"
              size={24}
              color={isSelected ? theme.primary : 'white'}
            />
          </View>

          {/* Hospital Info */}
          <View style={{ flex: 1 }}>
            <Text style={{ 
              color: 'white', 
              fontWeight: '600', 
              fontSize: 16,
            }}>
              {item.name}
            </Text>
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: 14,
              marginTop: 2,
            }}>
              {item.address}
            </Text>
            <HStack gap={2} style={{ marginTop: spacing[1] }}>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.4)', 
                fontSize: 12,
              }}>
                {item.departments.length} departments
              </Text>
              {item.requiresInvitation && (
                <HStack gap={1} align="center">
                  <Symbol name="lock.fill" size={10} color={theme.warning || '#fbbf24'} />
                  <Text style={{ 
                    color: theme.warning || '#fbbf24', 
                    fontSize: 12,
                  }}>
                    Invitation required
                  </Text>
                </HStack>
              )}
            </HStack>
          </View>

          {/* Selection Indicator */}
          {isSelected && (
            <Symbol name="checkmark.circle.fill" size={24} color={theme.success} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <OnboardingLayout
      title="Select Your Hospital"
      subtitle="Choose the healthcare facility where you work"
      onBack={goToPreviousStep}
      progress={state.progress}
      backgroundGradient={['#1e3a8a', '#3b82f6', '#60a5fa']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <VStack gap={contentGap} style={{ flex: 1 }}>
          {/* Progress Indicator */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <ProgressIndicator
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
              variant="steps"
            />
          </Animated.View>

          {/* Search Input */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Input
              placeholder="Search hospitals by name or location"
              value={searchQuery}
              onChangeText={handleSearchChange}
              leftIcon="magnifyingglass"
              size={inputSize}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
              inputStyle={{ color: 'white' }}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              rightIcon={isSearching ? undefined : searchQuery.length > 0 ? 'xmark.circle.fill' : undefined}
              onRightIconPress={() => {
                setSearchQuery('');
                setSelectedHospital(null);
              }}
            />
            {searchQuery.length > 0 && searchQuery.length < 3 && (
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.5)', 
                fontSize: 12, 
                marginTop: spacing[1],
              }}>
                Type at least 3 characters to search
              </Text>
            )}
          </Animated.View>

          {/* Hospital List */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(400)}
            style={{ flex: 1 }}
          >
            {isSearching ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="white" />
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  marginTop: spacing[2],
                }}>
                  Searching hospitals...
                </Text>
              </View>
            ) : filteredHospitals.length > 0 ? (
              <FlatList
                data={filteredHospitals}
                renderItem={renderHospitalItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing[5] }}
                keyboardShouldPersistTaps="handled"
              />
            ) : searchQuery.length >= 3 ? (
              <VStack gap={4} style={{ 
                flex: 1, 
                alignItems: 'center', 
                justifyContent: 'center',
              }}>
                <Symbol name="building.2" size={48} color="rgba(255, 255, 255, 0.5)" />
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  textAlign: 'center',
                  fontSize: 16,
                }}>
                  No hospitals found matching &quot;{searchQuery}&quot;
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleRequestAccess}
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 14 }}>
                    Request to Add Hospital
                  </Text>
                </Button>
              </VStack>
            ) : searchQuery.length === 0 ? (
              <VStack gap={3} style={{ 
                alignItems: 'center', 
                paddingTop: spacing[8],
              }}>
                <Symbol name="magnifyingglass" size={32} color="rgba(255, 255, 255, 0.5)" />
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  textAlign: 'center',
                  fontSize: 16,
                }}>
                  Search for your hospital above
                </Text>
              </VStack>
            ) : null}
          </Animated.View>

          {/* Invitation Code Input */}
          {showInviteCode && selectedHospital && (
            <Animated.View entering={FadeInUp.duration(400)}>
              <GlassCard
                style={[
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    padding: spacing[4],
                  },
                  shadowMd,
                ]}
              >
                <VStack gap={3}>
                  <HStack gap={2} align="center">
                    <Symbol name="lock.fill" size={16} color={theme.warning || '#fbbf24'} />
                    <Text style={{ 
                      color: 'rgba(255, 255, 255, 0.9)', 
                      fontSize: 16,
                      fontWeight: '500',
                      flex: 1,
                    }}>
                      Enter invitation code for {selectedHospital.name}
                    </Text>
                  </HStack>
                  <Input
                    placeholder="e.g., DEMO-2024"
                    value={inviteCode}
                    onChangeText={(text) => {
                      setInviteCode(text.toUpperCase());
                      clearError('inviteCode');
                    }}
                    leftIcon="key"
                    autoCapitalize="characters"
                    size={inputSize}
                    error={errors.inviteCode}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: errors.inviteCode ? theme.destructive : 'rgba(255, 255, 255, 0.2)',
                    }}
                    inputStyle={{ color: 'white' }}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                  <TouchableOpacity onPress={handleRequestAccess}>
                    <Text style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      fontSize: 14, 
                      textAlign: 'center',
                    }}>
                      Don&apos;t have a code?{' '}
                      <Text style={{ color: 'white', fontWeight: '600' }}>
                        Request access
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </VStack>
              </GlassCard>
            </Animated.View>
          )}

          {/* Continue Button */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <Button
              onPress={handleContinue}
              disabled={!isFormValid || isSubmitting}
              isLoading={isSubmitting}
              size={buttonSize}
              fullWidth
              style={[
                {
                  backgroundColor: isFormValid && !isSubmitting ? 'white' : 'rgba(255, 255, 255, 0.2)',
                  borderColor: isFormValid && !isSubmitting ? 'white' : 'rgba(255, 255, 255, 0.3)',
                },
                ...(isFormValid && !isSubmitting ? [shadowLg] : []),
              ]}
            >
              <Text style={{
                color: isFormValid && !isSubmitting ? theme.primary : 'rgba(255, 255, 255, 0.6)',
                fontSize: isMobile ? 16 : 18,
                fontWeight: 'bold',
              }}>
                {isSubmitting ? 'Verifying...' : 'Continue'}
              </Text>
            </Button>
            {errors.hospitalId && (
              <Text style={{ 
                color: theme.destructive, 
                fontSize: 14, 
                marginTop: spacing[2],
                textAlign: 'center',
              }}>
                {errors.hospitalId}
              </Text>
            )}
          </Animated.View>

          {/* Skip Option */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(600)}
            style={{ alignItems: 'center' }}
          >
            <TouchableOpacity
              onPress={() => {
                haptic('light');
                completeStep('hospital-setup');
                goToNextStep();
              }}
              disabled={isSubmitting}
            >
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                fontSize: 14,
              }}>
                Skip for now
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </VStack>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
}