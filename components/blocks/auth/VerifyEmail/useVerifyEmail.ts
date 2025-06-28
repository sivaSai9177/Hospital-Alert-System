import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/stores/auth-store';
import { api } from '@/lib/api/trpc';
import { showSuccessAlert, showErrorAlert } from '@/lib/core/alert';
import { log } from '@/lib/core/debug/logger';
import { ROUTES } from '@/lib/navigation/routes';

interface UseVerifyEmailOptions {
  email?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useVerifyEmail(options: UseVerifyEmailOptions = {}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const email = options.email || user?.email;

  const verify = useCallback(async (code: string) => {
    if (!email) {
      const errorMessage = 'Email address not found';
      setError(errorMessage);
      showErrorAlert('Error', errorMessage);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the actual API
      await api.auth.verifyEmail.mutateAsync({ email, code });
      
      log.auth.info('Email verified successfully');
      showSuccessAlert('Email Verified', 'Your email has been verified successfully!');
      
      if (options.onSuccess) {
        options.onSuccess();
      } else {
        // Default navigation behavior
        if (user?.needsProfileCompletion) {
          router.replace('/(auth)/complete-profile');
        } else {
          router.replace('/home');
        }
      }
    } catch (error: any) {
      log.auth.error('Email verification failed', error);
      const errorMessage = error.message || 'Invalid verification code';
      setError(errorMessage);
      
      if (options.onError) {
        options.onError(errorMessage);
      } else {
        showErrorAlert('Verification Failed', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, options, router, user]);

  const resend = useCallback(async () => {
    if (!email) {
      const errorMessage = 'Email address not found';
      setError(errorMessage);
      showErrorAlert('Error', errorMessage);
      return;
    }
    
    setIsResending(true);
    setError(null);
    
    try {
      // Call the actual API
      await api.auth.resendVerificationEmail.mutateAsync({ email });
      
      log.auth.info('Verification email resent');
      showSuccessAlert('Email Sent', 'A new verification code has been sent to your email');
    } catch (error: any) {
      log.auth.error('Failed to resend verification email', error);
      const errorMessage = error.message || 'Failed to send verification email';
      setError(errorMessage);
      showErrorAlert('Error', errorMessage);
    } finally {
      setIsResending(false);
    }
  }, [email]);

  const goBack = useCallback(() => {
    router.replace(ROUTES.auth.login);
  }, [router]);

  return {
    verify,
    resend,
    goBack,
    isLoading,
    isResending,
    error,
    email,
  };
}