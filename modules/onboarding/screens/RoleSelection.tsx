/**
 * Role Selection Screen
 * Allows users to choose their healthcare profession
 * Enhanced with theme support and SelectionButton component
 */

import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';
import { Text } from '@/components/universal/typography/Text';
import { Button } from '@/components/universal/interaction/Button';
import { VStack, HStack, ResponsiveGrid } from '@/components/universal/layout';
import { Symbol } from '@/components/universal/display/Symbols';
import { GlassCard } from '@/components/universal/display';
import { SelectionButton } from '@/components/universal/form/SelectionButton';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { ROLE_OPTIONS } from '../utils/constants';
import { haptic } from '@/lib/ui/haptics';
import type { UserRole } from '../types';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { useShadow } from '@/hooks/useShadow';

export function RoleSelectionScreen() {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const shadowMd = useShadow({ size: 'md' });
  const shadowLg = useShadow({ size: 'lg' });
  
  const {
    state,
    setRole,
    completeStep,
    goToNextStep,
    goToPreviousStep,
  } = useOnboardingFlow();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(
    state.selectedRole || null
  );
  const [showDetails, setShowDetails] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    haptic('light');
    setSelectedRole(role);
    setShowDetails(true);
  };

  const handleContinue = () => {
    if (selectedRole) {
      haptic('success');
      setRole(selectedRole);
      completeStep('role-selection');
      goToNextStep();
    }
  };

  const selectedRoleData = ROLE_OPTIONS.find((r) => r.id === selectedRole);

  // Responsive values
  const gridColumns = { mobile: 1, tablet: 2, desktop: 3 };
  const cardSize = isMobile ? 'md' : 'lg';
  const buttonSize = isMobile ? 'default' : 'lg';

  return (
    <OnboardingLayout
      title="Select Your Role"
      subtitle="Choose your healthcare profession to personalize your experience"
      onBack={goToPreviousStep}
      progress={state.progress}
      backgroundGradient={['#1e3a8a', '#3b82f6', '#60a5fa']}
    >
      <VStack gap={isMobile ? 4 : 6} style={{ flex: 1 }}>
        {/* Progress Indicator */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <ProgressIndicator
            currentStep={state.currentStep}
            completedSteps={state.completedSteps}
            variant="steps"
          />
        </Animated.View>

        {/* Role Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing[4] }}
        >
          <ResponsiveGrid
            columns={gridColumns}
            gap={isMobile ? 3 : 4}
          >
            {ROLE_OPTIONS.map((role, index) => (
              <Animated.View
                key={role.id}
                entering={
                  index % 2 === 0
                    ? SlideInLeft.duration(500).delay(300 + index * 50)
                    : SlideInRight.duration(500).delay(300 + index * 50)
                }
              >
                <SelectionButton
                  value={role.id}
                  selected={selectedRole === role.id}
                  onPress={() => handleRoleSelect(role.id)}
                  icon={
                    <View
                      style={{
                        width: spacing[12],
                        height: spacing[12],
                        borderRadius: spacing[6],
                        backgroundColor: selectedRole === role.id ? role.color + '20' : 'rgba(255, 255, 255, 0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Symbol
                        name={role.icon as any}
                        size={isMobile ? 24 : 28}
                        color={selectedRole === role.id ? role.color : 'white'}
                      />
                    </View>
                  }
                  label={role.title}
                  description={role.description}
                  variant="card"
                  size={cardSize}
                  color={role.color}
                  showCheckmark={false}
                  padding={spacing[4]}
                />
              </Animated.View>
            ))}
          </ResponsiveGrid>
        </ScrollView>

        {/* Selected Role Details */}
        {showDetails && selectedRoleData && (
          <Animated.View
            entering={FadeInDown.duration(400)}
          >
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
              <HStack gap={3} style={{ alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: spacing[10],
                    height: spacing[10],
                    borderRadius: spacing[3],
                    backgroundColor: selectedRoleData.color + '30',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Symbol
                    name={selectedRoleData.icon as any}
                    size={20}
                    color={selectedRoleData.color}
                  />
                </View>
                <VStack gap={2} style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: 'white',
                      fontSize: isMobile ? 18 : 20,
                      fontWeight: '600',
                    }}
                  >
                    {selectedRoleData.title} Features
                  </Text>
                  <VStack gap={1.5}>
                    {selectedRoleData.features.slice(0, 3).map((feature, index) => (
                      <HStack key={index} gap={2} style={{ alignItems: 'flex-start' }}>
                        <Symbol
                          name="checkmark.circle.fill"
                          size={16}
                          color={selectedRoleData.color}
                          style={{ marginTop: 2 }}
                        />
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.85)',
                            fontSize: isMobile ? 14 : 15,
                            lineHeight: 20,
                            flex: 1,
                          }}
                        >
                          {feature}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                  {selectedRoleData.requiresLicense && (
                    <View
                      style={{
                        marginTop: spacing[3],
                        padding: spacing[3],
                        borderRadius: spacing[2],
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing[2],
                      }}
                    >
                      <Symbol name="info.circle.fill" size={16} color="#fbbf24" />
                      <Text
                        style={{
                          color: '#fbbf24',
                          fontSize: 13,
                          flex: 1,
                        }}
                      >
                        Professional license verification required
                      </Text>
                    </View>
                  )}
                </VStack>
              </HStack>
            </GlassCard>
          </Animated.View>
        )}

        {/* Continue Button */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(600)}
          style={{ marginTop: 'auto' }}
        >
          <Button
            onPress={handleContinue}
            disabled={!selectedRole}
            size={buttonSize}
            fullWidth
            style={[
              {
                backgroundColor: selectedRole ? 'white' : 'rgba(255, 255, 255, 0.2)',
                borderColor: selectedRole ? 'white' : 'rgba(255, 255, 255, 0.3)',
              },
              selectedRole ? shadowLg : {},
            ]}
          >
            <Text
              style={{
                color: selectedRole ? theme.primary : 'rgba(255, 255, 255, 0.6)',
                fontSize: isMobile ? 16 : 18,
                fontWeight: 'bold',
              }}
            >
              Continue as {selectedRoleData?.title || 'Selected Role'}
            </Text>
          </Button>
        </Animated.View>

        {/* Info Text */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(700)}
          style={{ alignItems: 'center', marginTop: spacing[2] }}
        >
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            You can update your role later in settings
          </Text>
        </Animated.View>
      </VStack>
    </OnboardingLayout>
  );
}