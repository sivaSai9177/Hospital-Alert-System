import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sessionTimeoutManager } from '@/lib/auth/session-timeout-manager';
import { tokenRefreshManager } from '@/lib/auth/token-refresh-manager';
import { SessionTimeoutWarning } from '@/components/blocks/auth/SessionTimeoutWarning';
import { useRouter } from 'expo-router';
import { log } from '@/lib/core/debug/logger';
import { useAuthSecurity } from '@/hooks/useAuthSecurity';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { isAuthenticated, clearAuth, hasHydrated, isOAuthActive, user } = useAuth();
  const router = useRouter();
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  
  // Initialize security features
  const { sendDeviceFingerprint, checkSessionAnomaly } = useAuthSecurity({
    enableFingerprinting: true,
    enableAnomalyDetection: true,
    enableGeolocation: false, // Respect user privacy by default
  });

  useEffect(() => {
    // Don't start session management until auth has hydrated
    if (!hasHydrated) return;
    
    // Skip if OAuth is active (from auth store)
    if (isOAuthActive && isOAuthActive()) {
      log.debug('Skipping session management - OAuth flow active', 'AUTH');
      return;
    }
    
    // Skip for users with incomplete profiles
    if (user?.needsProfileCompletion || user?.role === 'guest') {
      log.debug('Skipping session management - user needs profile completion', 'AUTH', {
        needsProfileCompletion: user?.needsProfileCompletion,
        role: user?.role
      });
      return;
    }
    
    // Check if we're in OAuth flow (URL-based detection as fallback)
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    const isOAuthFlow = currentSearch.includes('code=') || 
                       currentSearch.includes('state=') ||
                       currentPath.includes('auth-callback') ||
                       currentPath.includes('complete-profile');
    
    if (isOAuthFlow) {
      log.debug('Skipping session management during OAuth flow (URL detection)', 'AUTH');
      return;
    }
    
    if (isAuthenticated) {
      // Start session timeout monitoring
      sessionTimeoutManager.start({
        onWarning: () => {
          log.info('Session timeout warning triggered', 'AUTH');
          setShowTimeoutWarning(true);
        },
        onTimeout: () => {
          log.info('Session timed out', 'AUTH');
          handleLogout();
        }
      });
      
      // Initialize security checks with error handling
      try {
        sendDeviceFingerprint();
        checkSessionAnomaly();
      } catch (error) {
        log.error('Failed to initialize security features', 'AUTH', error);
        // Continue without security features rather than breaking the app
      }
    } else {
      // Stop monitoring if not authenticated
      sessionTimeoutManager.stop();
      setShowTimeoutWarning(false);
    }

    return () => {
      sessionTimeoutManager.stop();
    };
  }, [isAuthenticated, hasHydrated, sendDeviceFingerprint, checkSessionAnomaly, isOAuthActive, user]);

  const handleExtendSession = () => {
    setShowTimeoutWarning(false);
    // Token refresh is handled automatically by sessionTimeoutManager.extendSession()
  };

  const handleLogout = async () => {
    setShowTimeoutWarning(false);
    
    // Clear auth state
    await clearAuth();
    
    // Stop session management
    sessionTimeoutManager.stop();
    tokenRefreshManager.stop();
    
    // Redirect to login
    router.replace('/(public)/auth/login');
  };

  return (
    <>
      {children}
      <SessionTimeoutWarning
        open={showTimeoutWarning}
        onExtend={handleExtendSession}
        onLogout={handleLogout}
      />
    </>
  );
}