/**
 * Onboarding Flow Management Hook
 * Handles navigation, state persistence, and progress tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '@/lib/core/debug/logger';
import type { OnboardingState, OnboardingStep, UserProfile, UserRole } from '../types';
import { ONBOARDING_STEPS, ONBOARDING_STORAGE_KEY, ONBOARDING_TIMEOUT } from '../utils/constants';

const logger = log;

const initialState: OnboardingState = {
  currentStep: 'welcome',
  completedSteps: [],
  userData: {},
  progress: 0,
  skippedSteps: [],
  startedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
};

export function useOnboardingFlow() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(initialState);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted state
  useEffect(() => {
    loadPersistedState();
  }, []);

  // Save state changes
  useEffect(() => {
    if (!isLoading) {
      saveState(state);
    }
  }, [state, isLoading]);

  const loadPersistedState = async () => {
    try {
      const savedState = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState) as OnboardingState;
        
        // Check if session is still valid
        const lastActive = new Date(parsed.lastActiveAt).getTime();
        const now = Date.now();
        
        if (now - lastActive < ONBOARDING_TIMEOUT) {
          setState({
            ...parsed,
            lastActiveAt: new Date().toISOString(),
          });
        } else {
          // Session expired, reset
          logger.info('Onboarding session expired', 'ONBOARDING');
          await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }
      }
    } catch (error) {
      logger.error('Failed to load onboarding state', 'ONBOARDING', { error });
    } finally {
      setIsLoading(false);
    }
  };

  const saveState = async (newState: OnboardingState) => {
    try {
      await AsyncStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          ...newState,
          lastActiveAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Failed to save onboarding state', 'ONBOARDING', { error });
    }
  };

  const updateUserData = useCallback((data: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      userData: {
        ...prev.userData,
        ...data,
      },
    }));
  }, []);

  const setRole = useCallback((role: UserRole) => {
    setState((prev) => ({
      ...prev,
      selectedRole: role,
      userData: {
        ...prev.userData,
        role,
      },
    }));
  }, []);

  const completeStep = useCallback((step: OnboardingStep) => {
    setState((prev) => {
      const completedSteps = prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step];

      const progress = calculateProgress(completedSteps, prev.selectedRole);

      return {
        ...prev,
        completedSteps,
        progress,
      };
    });
  }, []);

  const navigateToStep = useCallback((step: OnboardingStep) => {
    const route = `/onboarding/${step}` as const;
    router.push(route as any);
  }, [router]);

  const goToNextStep = useCallback(() => {
    const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === state.currentStep);
    const nextStep = findNextStep(currentIndex, state.selectedRole);

    if (nextStep) {
      setState((prev) => ({
        ...prev,
        currentStep: nextStep.id,
      }));
      navigateToStep(nextStep.id);
    }
  }, [state.currentStep, state.selectedRole, navigateToStep]);

  const skipStep = useCallback((step: OnboardingStep) => {
    setState((prev) => ({
      ...prev,
      skippedSteps: [...prev.skippedSteps, step],
    }));
    goToNextStep();
  }, [goToNextStep]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === state.currentStep);
    const prevStep = findPreviousStep(currentIndex, state.selectedRole);

    if (prevStep) {
      setState((prev) => ({
        ...prev,
        currentStep: prevStep.id,
      }));
      navigateToStep(prevStep.id);
    }
  }, [state.currentStep, state.selectedRole, navigateToStep]);

  const findNextStep = (currentIndex: number, role?: UserRole) => {
    for (let i = currentIndex + 1; i < ONBOARDING_STEPS.length; i++) {
      const step = ONBOARDING_STEPS[i];
      if (!step.requiresRole || (role && step.requiresRole.includes(role))) {
        return step;
      }
    }
    return null;
  };

  const findPreviousStep = (currentIndex: number, role?: UserRole) => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const step = ONBOARDING_STEPS[i];
      if (!step.requiresRole || (role && step.requiresRole.includes(role))) {
        return step;
      }
    }
    return null;
  };

  const calculateProgress = (completedSteps: OnboardingStep[], role?: UserRole) => {
    const relevantSteps = ONBOARDING_STEPS.filter(
      (step) => !step.requiresRole || (role && step.requiresRole.includes(role))
    );
    const completedCount = completedSteps.filter((step) =>
      relevantSteps.some((s) => s.id === step)
    ).length;
    return Math.round((completedCount / relevantSteps.length) * 100);
  };

  const resetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setState(initialState);
    router.replace('/onboarding/welcome');
  };

  const completeOnboarding = async () => {
    const completedAt = new Date().toISOString();
    const totalTime = Date.now() - new Date(state.startedAt).getTime();

    // Update user data
    const finalUserData: UserProfile = {
      ...state.userData,
      onboardingCompleted: true,
      onboardingCompletedAt: completedAt,
    } as UserProfile;

    // Clear onboarding state
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);

    // Log analytics
    logger.info('Onboarding completed', 'ONBOARDING', {
      totalTime: Math.round(totalTime / 1000),
      skippedSteps: state.skippedSteps,
      role: state.selectedRole,
    });

    return finalUserData;
  };

  return {
    state,
    isLoading,
    updateUserData,
    setRole,
    completeStep,
    skipStep,
    goToNextStep,
    goToPreviousStep,
    resetOnboarding,
    completeOnboarding,
    currentStepConfig: ONBOARDING_STEPS.find((s) => s.id === state.currentStep),
    isFirstStep: state.currentStep === 'welcome',
    isLastStep: state.currentStep === 'completion',
    canSkip: !ONBOARDING_STEPS.find((s) => s.id === state.currentStep)?.required,
  };
}