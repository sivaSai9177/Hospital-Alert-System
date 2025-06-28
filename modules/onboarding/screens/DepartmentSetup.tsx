/**
 * Department Setup Screen
 * Department selection based on hospital and role
 * Enhanced with theme support and responsive design
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInLeft,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Text } from '@/components/universal/typography/Text';
import { Button } from '@/components/universal/interaction/Button';
import { VStack, HStack, ResponsiveGrid } from '@/components/universal/layout';
import { Symbol } from '@/components/universal/display/Symbols';
import { GlassCard } from '@/components/universal/display';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { useOnboardingValidation } from '../hooks/useOnboardingValidation';
import { haptic } from '@/lib/ui/haptics';
import { showAlert } from '@/lib/core/alert';
import { useTheme } from '@/lib/theme';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useResponsive } from '@/hooks/responsive';
import { useShadow } from '@/hooks/useShadow';
import type { Department } from '../types';


// Department icons mapping
const departmentIcons: Record<string, string> = {
  emergency: 'cross.fill',
  icu: 'heart.text.square.fill',
  cardiology: 'heart.fill',
  pediatrics: 'figure.child',
  surgery: 'scissors',
  radiology: 'xray',
  pharmacy: 'pills.fill',
  laboratory: 'flask.fill',
  maternity: 'figure.and.child.holdinghands',
  oncology: 'staroflife.fill',
  neurology: 'brain.head.profile',
  orthopedics: 'figure.walk',
  psychiatry: 'brain',
  general_medicine: 'stethoscope',
};

export function DepartmentSetupScreen() {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const { isMobile, isTablet } = useResponsive();
  const shadowMd = useShadow({ size: 'md' });
  const shadowLg = useShadow({ size: 'lg' });
  
  const {
    state,
    updateUserData,
    completeStep,
    skipStep,
    goToNextStep,
    goToPreviousStep,
    canSkip,
  } = useOnboardingFlow();
  
  const {
    errors,
    validateField,
    setError,
    clearError,
  } = useOnboardingValidation('department');

  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    state.userData.departmentId || null
  );
  
  // Responsive values
  const buttonSize = isMobile ? 'md' : 'lg';
  const contentGap = isMobile ? 4 : 5;
  const gridColumns = { mobile: 2, tablet: 3, desktop: 4 };
  const iconSize = isMobile ? 28 : 32;
  const cardSize = isMobile ? spacing[20] : spacing[24];

  // Mock departments - in a real app, fetch based on selected hospital
  const departments = mockDepartments;

  const handleDepartmentSelect = (departmentId: string) => {
    haptic('light');
    setSelectedDepartment(departmentId);
    clearError('departmentId');
  };

  const handleContinue = () => {
    if (!selectedDepartment) {
      setError('departmentId', 'Please select your department');
      showAlert({
        title: 'Department Required',
        description: 'Please select your department to continue',
        variant: 'destructive',
      });
      return;
    }

    haptic('success');
    updateUserData({
      departmentId: selectedDepartment,
    });
    completeStep('department-setup');
    goToNextStep();
  };

  const handleSkip = () => {
    haptic('light');
    skipStep('department-setup');
  };

  const DepartmentCard = ({ department, index }: { department: Department; index: number }) => {
    const isSelected = selectedDepartment === department.id;
    const icon = departmentIcons[department.id] || 'building.2.fill';

    const cardStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            scale: withSpring(isSelected ? 0.98 : 1, {
              damping: 15,
              stiffness: 100,
            }),
          },
        ],
      };
    });

    return (
      <Animated.View
        key={department.id}
        entering={SlideInLeft.duration(400).delay(Math.min(200 + index * 50, 400))}
        style={cardStyle}
      >
        <TouchableOpacity
          onPress={() => handleDepartmentSelect(department.id)}
          style={[
            {
              padding: spacing[4],
              borderRadius: spacing[3],
              aspectRatio: 1,
              backgroundColor: isSelected
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.08)',
              borderWidth: 2,
              borderColor: isSelected
                ? 'rgba(255, 255, 255, 0.4)'
                : 'transparent',
            },
            isSelected ? shadowMd : undefined,
          ]}
        >
          <VStack gap={3} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {/* Icon */}
            <View
              style={{
                width: spacing[16],
                height: spacing[16],
                borderRadius: spacing[4],
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isSelected
                  ? 'rgba(59, 130, 246, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Symbol
                name={icon as any}
                size={iconSize}
                color={isSelected ? theme.primary : 'white'}
              />
            </View>

            {/* Department Name */}
            <Text
              style={{
                color: 'white',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: isMobile ? 14 : 16,
              }}
              numberOfLines={2}
            >
              {department.name}
            </Text>

            {/* Selection Indicator */}
            {isSelected && (
              <View style={{ position: 'absolute', top: spacing[2], right: spacing[2] }}>
                <Symbol name="checkmark.circle.fill" size={20} color={theme.success} />
              </View>
            )}
          </VStack>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <OnboardingLayout
      title="Select Department"
      subtitle="Choose your primary department"
      onBack={goToPreviousStep}
      onSkip={canSkip ? handleSkip : undefined}
      showSkip={canSkip}
      progress={state.progress}
      backgroundGradient={['#1e3a8a', '#3b82f6', '#60a5fa']}
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

        {/* Info Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <GlassCard
            style={[
              {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                padding: spacing[4],
                flexDirection: 'row',
                alignItems: 'center',
              },
              shadowMd,
            ]}
          >
            <Symbol name="info.circle.fill" size={20} color={theme.info || '#60a5fa'} />
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: 14, 
              marginLeft: spacing[3], 
              flex: 1,
              lineHeight: 20,
            }}>
              You can access other departments later, but alerts will be routed based on your primary department
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Department Grid */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(400)}
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <ResponsiveGrid
              columns={gridColumns}
              gap={isMobile ? 3 : 4}
            >
              {departments.map((dept, index) => (
                <DepartmentCard key={dept.id} department={dept} index={index} />
              ))}
            </ResponsiveGrid>
          </ScrollView>
        </Animated.View>

        {/* Continue Button */}
        <Animated.View entering={FadeInDown.duration(400).delay(600)}>
          <Button
            onPress={handleContinue}
            disabled={!selectedDepartment}
            size={buttonSize}
            fullWidth
            style={[
              {
                backgroundColor: selectedDepartment ? 'white' : 'rgba(255, 255, 255, 0.2)',
                borderColor: selectedDepartment ? 'white' : 'rgba(255, 255, 255, 0.3)',
              },
              ...(selectedDepartment ? [shadowLg] : []),
            ]}
          >
            <Text style={{
              color: selectedDepartment ? theme.primary : 'rgba(255, 255, 255, 0.6)',
              fontSize: isMobile ? 16 : 18,
              fontWeight: 'bold',
            }}>
              Continue
            </Text>
          </Button>
        </Animated.View>

        {/* Department Details */}
        {selectedDepartment && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <GlassCard
              style={[
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  padding: spacing[4],
                },
              ]}
            >
              <HStack gap={2} align="center">
                <Symbol name="checkmark.shield.fill" size={16} color={theme.success} />
                <Text style={{ 
                  color: theme.success, 
                  fontSize: 14, 
                  flex: 1,
                }}>
                  You&apos;ll receive alerts specific to{' '}
                  {departments.find(d => d.id === selectedDepartment)?.name}
                </Text>
              </HStack>
            </GlassCard>
          </Animated.View>
        )}
      </VStack>
    </OnboardingLayout>
  );
}

// Mock departments - replace with actual data from selected hospital
const mockDepartments: Department[] = [
  { id: 'emergency', name: 'Emergency', description: 'Emergency Department', isActive: true },
  { id: 'icu', name: 'ICU', description: 'Intensive Care Unit', isActive: true },
  { id: 'cardiology', name: 'Cardiology', description: 'Heart and Vascular', isActive: true },
  { id: 'pediatrics', name: 'Pediatrics', description: 'Children\'s Health', isActive: true },
  { id: 'surgery', name: 'Surgery', description: 'Surgical Services', isActive: true },
  { id: 'radiology', name: 'Radiology', description: 'Medical Imaging', isActive: true },
  { id: 'pharmacy', name: 'Pharmacy', description: 'Medication Services', isActive: true },
  { id: 'laboratory', name: 'Laboratory', description: 'Diagnostic Testing', isActive: true },
];