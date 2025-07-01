import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/trpc';
import { showErrorAlert, showSuccessAlert } from '@/lib/core/alert';
import { logger } from '@/lib/core/debug/unified-logger';
import { generateUUID } from '@/lib/core/crypto';
import { toAppUser } from '@/lib/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  organizationCode?: string;
  organizationName?: string;
  organizationId?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export function useRegister() {
  const { updateAuth, setLoading, setError } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  // Sign up mutation
  const signUpMutation = api.auth.signUp.useMutation({
    onSuccess: (data) => {
      logger.auth.info('Sign up successful via tRPC', { userId: data.user?.id });
      setLoading(false);
      
      // Invalidate any cached email check results
      queryClient.invalidateQueries({ 
        queryKey: [['auth', 'checkEmailExists']] 
      });
      
      if (data.user && data.token) {
        const appUser = toAppUser(data.user, data.user.role || 'user');
        
        const session = {
          id: generateUUID(),
          token: data.token,
          userId: appUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
        
        // Don't automatically log in - redirect to onboarding instead
        logger.auth.info('New user registered, redirecting to onboarding', { 
          userId: appUser.id,
          role: appUser.role 
        });
        
        // Store minimal session data for onboarding flow
        if (Platform.OS !== 'web' && data.token) {
          const { mobileStorage } = require('@/lib/core/secure-storage');
          
          // Store token for onboarding flow to use
          mobileStorage.setItem('onboarding_token', data.token);
          mobileStorage.setItem('onboarding_user_id', appUser.id);
          
          logger.auth.debug('Stored onboarding token for mobile', {
            userId: appUser.id
          });
        }
        
        showSuccessAlert("Account Created", "Let's get you set up!");
        
        // Redirect to onboarding
        router.replace('/onboarding/welcome');
      } else {
        logger.auth.error('No user or token in response');
        showErrorAlert("Registration Error", "Account created but login failed. Please login manually.");
      }
    },
    onError: (error) => {
      logger.auth.error('Sign up failed', error);
      setLoading(false);
      setError(error.message);
      showErrorAlert("Signup Failed", error.message || "Failed to create account. Please try again.");
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Check if email exists

  const register = useCallback(async (data: RegisterData) => {
    logger.auth.debug('Starting registration', { email: data.email, role: data.role });
    setLoading(true);
    setError(null);
    
    try {
      // Prepare signup data
      const signupData: any = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        acceptTerms: data.acceptTerms,
        acceptPrivacy: data.acceptPrivacy,
      };

      // Add organization data based on role
      if (data.organizationCode) {
        signupData.organizationCode = data.organizationCode;
      }
      if (data.organizationName) {
        signupData.organizationName = data.organizationName;
      }
      if (data.organizationId) {
        signupData.organizationId = data.organizationId;
      }

      await signUpMutation.mutateAsync(signupData);
      logger.auth.info('Registration process completed successfully');
    } catch (error: any) {
      logger.auth.error('Registration process failed', error);
      throw error;
    }
  }, [signUpMutation, setLoading, setError]);

  // Check email mutation - used imperatively with debounce
  const checkEmailMutation = api.auth.checkEmailExists.useMutation();
  
  const checkEmail = useCallback(async (email: string) => {
    // Validate email before making the request
    if (!email || email.length < 3) {
      return { exists: false };
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { exists: false };
    }
    
    // Prevent multiple simultaneous checks
    if (checkEmailMutation.isPending) {
      return { exists: false };
    }
    
    try {
      const result = await checkEmailMutation.mutateAsync({ email });
      return { exists: result.exists };
    } catch (error) {
      logger.auth.error('Email check failed', error);
      return { exists: false }; // Default to false on error
    }
  }, [checkEmailMutation]);

  return {
    register,
    checkEmail,
    isLoading: signUpMutation.isPending,
    error: signUpMutation.error?.message,
  };
}