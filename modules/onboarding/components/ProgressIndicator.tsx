/**
 * Progress Indicator Component
 * Visual progress representation for onboarding flow
 */

import React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Text } from '@/components/universal/typography/Text';
import { Symbol } from '@/components/universal/display/Symbols';
import { cn } from '@/lib/utils/cn';
import type { OnboardingStep } from '../types';
import { ONBOARDING_STEPS } from '../utils/constants';

interface ProgressIndicatorProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  variant?: 'linear' | 'steps' | 'circular';
  className?: string;
}

export function ProgressIndicator({
  currentStep,
  completedSteps,
  variant = 'steps',
  className,
}: ProgressIndicatorProps) {
  if (variant === 'linear') {
    return (
      <LinearProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
        className={className}
      />
    );
  }

  if (variant === 'circular') {
    return (
      <CircularProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
        className={className}
      />
    );
  }

  return (
    <StepProgress
      currentStep={currentStep}
      completedSteps={completedSteps}
      className={className}
    />
  );
}

// Linear Progress Bar
function LinearProgress({
  currentStep,
  completedSteps,
  className,
}: ProgressIndicatorProps) {
  const progress = calculateProgress(currentStep, completedSteps);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${progress}%`, {
        damping: 15,
        stiffness: 100,
      }),
    };
  });

  return (
    <View className={cn("w-full", className)}>
      <View className="h-2 bg-white/20 rounded-full overflow-hidden">
        <Animated.View
          className="h-full bg-green-500 rounded-full"
          style={animatedStyle}
        />
      </View>
      <Text className="text-white/80 text-center mt-2" size="xs">
        {Math.round(progress)}% Complete
      </Text>
    </View>
  );
}

// Step-based Progress
function StepProgress({
  currentStep,
  completedSteps,
  className,
}: ProgressIndicatorProps) {
  const visibleSteps = ONBOARDING_STEPS.filter(step => 
    step.required || completedSteps.includes(step.id)
  );

  return (
    <View className={cn("flex-row items-center justify-center", className)}>
      {visibleSteps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isPast = visibleSteps.findIndex(s => s.id === currentStep) > index;

        return (
          <React.Fragment key={step.id}>
            <StepIndicator
              step={step}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isPast={isPast}
              index={index}
            />
            {index < visibleSteps.length - 1 && (
              <StepConnector isCompleted={isCompleted || isPast} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// Individual Step Indicator
function StepIndicator({
  step,
  isCompleted,
  isCurrent,
  isPast,
  index,
}: {
  step: typeof ONBOARDING_STEPS[0];
  isCompleted: boolean;
  isCurrent: boolean;
  isPast: boolean;
  index: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(isCurrent ? 1.2 : 1, {
      damping: 15,
      stiffness: 100,
    });

    const opacity = withTiming(
      isCompleted || isCurrent || isPast ? 1 : 0.5,
      { duration: 300 }
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const getBackgroundColor = () => {
    if (isCompleted) return '#10b981';
    if (isCurrent) return '#3b82f6';
    if (isPast) return '#6b7280';
    return 'rgba(255, 255, 255, 0.2)';
  };

  return (
    <Animated.View
      style={[
        {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: getBackgroundColor(),
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
      ]}
    >
      {isCompleted ? (
        <Symbol name="checkmark.circle.fill" size={16} color="white" />
      ) : (
        <Text className="text-white font-semibold" size="xs">
          {index + 1}
        </Text>
      )}
    </Animated.View>
  );
}

// Connector between steps
function StepConnector({ isCompleted }: { isCompleted: boolean }) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        isCompleted ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
        { duration: 300 }
      ),
    };
  });

  return (
    <Animated.View
      style={[
        {
          height: 2,
          width: 24,
          marginHorizontal: 4,
        },
        animatedStyle,
      ]}
    />
  );
}

// Circular Progress
function CircularProgress({
  currentStep,
  completedSteps,
  className,
}: ProgressIndicatorProps) {
  const progress = calculateProgress(currentStep, completedSteps);
  const radius = 60;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  // Note: SVG animations would require a different approach in React Native
  // For now, we'll use the progress value directly without animation

  return (
    <View className={cn("items-center justify-center", className)}>
      <View style={{ width: radius * 2 + strokeWidth, height: radius * 2 + strokeWidth }}>
        {/* Background Circle */}
        <View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: radius + strokeWidth / 2,
            borderWidth: strokeWidth,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        />
        
        {/* Progress Text */}
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-white text-2xl font-bold">
            {Math.round(progress)}%
          </Text>
          <Text className="text-white/60 text-xs">Complete</Text>
        </View>
      </View>
    </View>
  );
}

// Helper function to calculate progress
function calculateProgress(currentStep: OnboardingStep, completedSteps: OnboardingStep[]): number {
  const totalSteps = ONBOARDING_STEPS.filter(s => s.required).length;
  const completed = completedSteps.filter(step => 
    ONBOARDING_STEPS.find(s => s.id === step && s.required)
  ).length;
  
  return Math.round((completed / totalSteps) * 100);
}