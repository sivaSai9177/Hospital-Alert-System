// Import crypto polyfill first for React Native
import "../core/crypto";

import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { emailOTPClient, phoneNumberClient, twoFactorClient, magicLinkClient, organizationClient, adminClient } from "better-auth/client/plugins";
import { Platform, AppState, AppStateStatus } from "react-native";
import { webStorage, mobileStorage } from "../core/secure-storage";
import { getAuthUrl } from "../core/config/unified-env";
import { sessionManager } from "./auth-session-manager";
// Use server logger to avoid React Native imports in auth paths
import { logger } from "../core/debug/server-logger";

const BASE_URL = getAuthUrl();

// Log configuration once (only on client side)
if (typeof window !== 'undefined' || __DEV__) {
  logger.auth.info('Auth client initialized', {
    platform: Platform.OS,
    baseURL: BASE_URL,
    authEndpoint: `${BASE_URL}/api/auth`,
    isExpoGo: !Platform.OS || Platform.OS === 'ios' || Platform.OS === 'android',
    credentials: Platform.OS === 'web' ? 'include' : 'omit'
  });
}

// Custom fetch wrapper to intercept and fix sign-out requests and handle body issues
const customFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  
  // Enhanced logging for social sign-in requests
  if (url.includes('/sign-in/social')) {
    logger.auth.debug('Social sign-in request intercepted', {
      url,
      method: init?.method,
      bodyType: typeof init?.body,
      bodyValue: init?.body,
      headers: init?.headers,
      stack: new Error().stack?.split('\n').slice(1, 5).join('\n')
    });
  }
  
  // Check if body is literally "[object Object]" string (can happen with any request)
  if (init?.body === '[object Object]') {
    logger.auth.error('CRITICAL: Body is literally "[object Object]" string!', {
      url,
      method: init?.method,
      stack: new Error().stack?.split('\n').slice(1, 5).join('\n')
    });
    
    // For social sign-in, we need to reconstruct the proper body
    if (url.includes('/sign-in/social')) {
      const newInit = { ...init };
      // Default social sign-in body structure
      newInit.body = JSON.stringify({
        provider: 'google',
        callbackURL: Platform.OS === 'web' 
          ? `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081'}/auth-callback`
          : '/auth-callback'
      });
      logger.auth.warn('Fixed social sign-in body', { fixedBody: newInit.body });
      return fetch(input, newInit);
    }
    
    // Try to fix it - if it's a POST request, it likely needs an empty JSON object
    const newInit = { ...init };
    if (init?.method === 'POST' && init?.headers?.['Content-Type']?.includes('application/json')) {
      newInit.body = '{}';
    } else {
      delete newInit.body;
    }
    return fetch(input, newInit);
  }
  
  // Ensure body is properly stringified for JSON requests
  if (init?.body && init?.method === 'POST') {
    // Check headers - handle both Headers object and plain object
    let contentType = '';
    if (init.headers instanceof Headers) {
      contentType = init.headers.get('content-type') || '';
    } else if (typeof init.headers === 'object') {
      contentType = init.headers['Content-Type'] || init.headers['content-type'] || '';
    }
    
    // Special handling for social sign-in to ensure proper body format
    if (url.includes('/sign-in/social') && typeof init.body === 'object' && 
        !(init.body instanceof FormData) && !(init.body instanceof URLSearchParams) && 
        !(init.body instanceof Blob) && !(init.body instanceof ArrayBuffer)) {
      logger.auth.debug('Ensuring social sign-in body is properly stringified', {
        url,
        bodyType: typeof init.body,
        bodyConstructor: init.body?.constructor?.name,
        bodyKeys: Object.keys(init.body || {})
      });
      const newInit = { ...init };
      newInit.body = JSON.stringify(init.body);
      return fetch(input, newInit);
    }
    
    // If it's a JSON request and body is an object, stringify it
    if (contentType.includes('application/json') && typeof init.body === 'object' && 
        !(init.body instanceof FormData) && !(init.body instanceof URLSearchParams) && 
        !(init.body instanceof Blob) && !(init.body instanceof ArrayBuffer)) {
      logger.auth.debug('Stringifying object body for JSON request', {
        url,
        bodyType: typeof init.body,
        bodyConstructor: init.body?.constructor?.name
      });
      const newInit = { ...init };
      newInit.body = JSON.stringify(init.body);
      return fetch(input, newInit);
    }
  }
  
  // Special handling for sign-out requests
  if (url.includes('/sign-out')) {
    logger.auth.debug('Intercepting sign-out request', {
      url,
      method: init?.method,
      hasBody: !!init?.body,
      bodyType: typeof init?.body,
      bodyValue: init?.body
    });
    
    // Better Auth's sign-out doesn't expect a body - always remove it
    if (init?.body) {
      logger.auth.warn('Removing body from sign-out request', {
        bodyType: typeof init?.body,
        bodyValue: init?.body
      });
      const newInit = { ...init };
      delete newInit.body;
      // Ensure method is POST
      newInit.method = 'POST';
      return fetch(input, newInit);
    }
  }
  
  return fetch(input, init);
};

// Wrap the fetch to ensure we catch all cases
const wrappedFetch: typeof fetch = (input, init) => {
  // Log all requests to debug the issue
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  if (url.includes('/sign-in/social')) {
    logger.auth.warn('Social sign-in fetch call', {
      url,
      method: init?.method,
      bodyType: typeof init?.body,
      bodyString: typeof init?.body === 'string' ? init?.body : 'not-a-string',
      bodyValue: init?.body,
      hasHeaders: !!init?.headers
    });
  }
  return customFetch(input, init);
};

const baseAuthClient = createAuthClient({
  baseURL: BASE_URL, // Use base URL without /api/auth - Better Auth will append it
  customFetch: wrappedFetch, // Use our wrapped fetch
  fetchOptions: {
    // Add credentials for cookie support in tunnel mode
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
    headers: {
      'Content-Type': 'application/json',
      // Add security headers
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
    },
    // Request timeout - removed to prevent abort errors
    // The retry mechanism will handle timeouts instead
  },
  // Retry configuration
  retry: {
    retries: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retryCondition: (error) => {
      // Retry on network errors or 5xx errors
      return !error.response || error.response.status >= 500;
    },
  },
  // Session refresh configuration - optimized to reduce database load
  sessionRefresh: {
    enabled: true,
    interval: 2 * 60 * 60 * 1000, // Check every 2 hours (significantly reduced)
    refreshThreshold: 4 * 60 * 60 * 1000, // Refresh if expires in less than 4 hours
  },
  plugins: [
    expoClient({
      scheme: "expo-starter", // App scheme from app.json
      storagePrefix: "better-auth", // Use Better Auth's default prefix
      storage: Platform.OS === 'web' ? webStorage : mobileStorage,
      disableCache: false, // Enable session caching
      // Security settings
      // secureStorage: Platform.OS !== 'web', // Use secure storage on mobile - not a valid option
      // sessionValidation and tokenRefresh are not valid options for expoClient plugin
    }),
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: true,
          defaultValue: "user",
        },
        organizationId: {
          type: "string", 
          required: false,
        },
        organizationName: {
          type: "string",
          required: false,
        },
        department: {
          type: "string",
          required: false,
        },
        needsProfileCompletion: {
          type: "boolean",
          required: false,
          defaultValue: true,
        },
        phoneNumber: {
          type: "string",
          required: false,
        },
        phoneNumberVerified: {
          type: "boolean",
          required: false,
          defaultValue: false,
        },
        twoFactorEnabled: {
          type: "boolean",
          required: false,
          defaultValue: false,
        },
      },
    }),
    // Authentication plugins
    emailOTPClient(),
    phoneNumberClient(),
    twoFactorClient(),
    magicLinkClient(),
    organizationClient(),
    adminClient(),
  ],
});

// Store the original signOut method
const originalSignOut = baseAuthClient.signOut;

// Track if we're already signing out to prevent loops
let isSigningOut = false;

// Override just the signOut method while preserving all other methods
baseAuthClient.signOut = async function(options?: any) {
  // Capture stack trace to identify caller
  const stack = new Error().stack;
  logger.auth.warn('Sign-out called from:', {
    stack: stack?.split('\n').slice(1, 5).join('\n'),
    timestamp: new Date().toISOString(),
    hasOptions: !!options,
    optionsType: typeof options
  });
  
  // Prevent concurrent sign-out calls
  if (isSigningOut) {
    logger.auth.debug('Sign-out already in progress, skipping duplicate call');
    return { success: true };
  }
  
  isSigningOut = true;
  
  try {
    // Add a timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for sign-out
    
    try {
      // Call the original signOut WITHOUT any options - Better Auth doesn't accept them
      const result = await originalSignOut.call(this);
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout errors
      if (error.name === 'AbortError' || error.message?.includes('signal timed out')) {
        logger.auth.debug('Sign-out request timed out (session cleared locally)');
        // Return success since local cleanup already happened
        return { success: true };
      }
      
      // Handle Better Auth v1.2.8 500 error
      if (error?.response?.status === 500 || error?.status === 500) {
        logger.auth.debug('Better Auth sign-out returned 500 (known issue, ignoring)');
        return { success: true };
      }
      
      throw error;
    }
  } catch (error: any) {
    logger.auth.error('Sign-out error', error);
    // Don't throw - sign-out should always succeed locally
    return { success: true };
  } finally {
    // Reset the flag after a delay to allow for legitimate sign-out attempts later
    setTimeout(() => {
      isSigningOut = false;
    }, 2000);
  }
};

// Store original social sign-in method
const originalSocialSignIn = baseAuthClient.signIn.social;

// Override social sign-in to ensure proper request format
baseAuthClient.signIn.social = async function(options: any) {
  logger.auth.warn('Social sign-in called', {
    options,
    optionsType: typeof options,
    hasProvider: !!options?.provider,
    hasCallbackURL: !!options?.callbackURL
  });
  
  // Ensure options are properly formatted
  const cleanOptions = {
    provider: options?.provider || 'google',
    callbackURL: options?.callbackURL || (Platform.OS === 'web' 
      ? `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081'}/auth-callback`
      : '/auth-callback')
  };
  
  logger.auth.debug('Calling original social sign-in with clean options', cleanOptions);
  
  try {
    return await originalSocialSignIn.call(this, cleanOptions);
  } catch (error: any) {
    logger.auth.error('Social sign-in error', {
      error: error.message,
      stack: error.stack,
      response: error.response
    });
    throw error;
  }
};

// Export the modified client directly
export const authClient = baseAuthClient;

// Override getSession to return proper type
const originalGetSession = authClient.getSession;

// Create a properly typed wrapper
const getSessionWrapper = async (options?: Parameters<typeof originalGetSession>[0]) => {
  try {
    // Simply call the original getSession - let Better Auth handle caching
    const result = await originalGetSession.call(authClient, options);
    
    if (result && result.data) {
      return result.data;
    }
    
    // Fallback to auth store only if Better Auth returns nothing
    const { useAuthStore } = await import('../stores/auth-store');
    const state = useAuthStore.getState();
    
    if (state.session && state.user) {
      return {
        session: state.session,
        user: state.user
      };
    }
    
    return null;
  } catch (error) {
    logger.auth.error('Failed to get session', error);
    return null;
  }
};

// Type assertion to override with proper return type
(authClient as any).getSession = getSessionWrapper;

export type AuthClient = typeof authClient;

// Session monitoring for mobile apps
if (Platform.OS !== 'web') {
  let appState = AppState.currentState;
  let lastBackgroundTime: number | null = null;
  
  AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground
      logger.system.info('App came to foreground', {
        lastBackgroundTime,
        timeSinceBackground: lastBackgroundTime ? Date.now() - lastBackgroundTime : null,
      });
      
      // Check if session needs refresh after being in background
      if (lastBackgroundTime && Date.now() - lastBackgroundTime > 5 * 60 * 1000) {
        // More than 5 minutes in background, validate session
        authClient.getSession().catch((error) => {
          logger.auth.error('Session validation failed after foreground', error);
        });
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App is going to background
      lastBackgroundTime = Date.now();
      logger.system.info('App going to background', { timestamp: lastBackgroundTime });
    }
    
    appState = nextAppState;
  });
}

// Enhanced auth client with security utilities
export const authClientEnhanced = {
  ...authClient,
  
  // Security utilities
  security: {
    // Check if session is about to expire
    isSessionExpiringSoon: async (thresholdMinutes: number = 30): Promise<boolean> => {
      try {
        const result = await authClient.getSession();
        const session = result && 'session' in result ? result : null;
        if (!session?.session || !(session.session as any).expiresAt) return true;
        
        const expiresAt = new Date((session.session as any).expiresAt).getTime();
        const now = Date.now();
        const threshold = thresholdMinutes * 60 * 1000;
        
        return (expiresAt - now) < threshold;
      } catch {
        return true;
      }
    },
    
    // Force session refresh
    forceRefresh: async (): Promise<boolean> => {
      try {
        // Clear cached session
        await sessionManager.clearSession();
        // Get fresh session from server
        const session = await authClient.getSession();
        return !!session;
      } catch (error) {
        logger.auth.error('Force refresh failed', error);
        return false;
      }
    },
    
    // Validate session integrity
    validateSession: async (): Promise<{ valid: boolean; reason?: string }> => {
      try {
        const result = await authClient.getSession();
        const session = result && 'session' in result ? result : null;
        
        if (!session) {
          return { valid: false, reason: 'No session found' };
        }
        
        if (!session.session || !(session.session as any).expiresAt) {
          return { valid: false, reason: 'Invalid session structure' };
        }
        
        const expiresAt = new Date((session.session as any).expiresAt).getTime();
        if (expiresAt < Date.now()) {
          return { valid: false, reason: 'Session expired' };
        }
        
        // Additional validation can be added here
        
        return { valid: true };
      } catch (error) {
        logger.auth.error('Session validation error', error);
        // Check if it's a network error
        if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
          return { valid: false, reason: 'network_error' };
        }
        return { valid: false, reason: 'Validation error' };
      }
    },
  },
  
  // Enhanced sign out with cleanup
  signOutEnhanced: async (options?: { everywhere?: boolean }): Promise<void> => {
    logger.auth.warn('signOutEnhanced called', {
      hasOptions: !!options,
      options: options,
      stackTrace: new Error().stack?.split('\n').slice(1, 5).join('\n')
    });
    
    try {
      // Sign out from Better Auth - don't pass options as Better Auth doesn't accept them
      await authClient.signOut();
      
      // Clear all local storage
      await sessionManager.clearSession();
      
      // Additional cleanup if needed
      if (options?.everywhere) {
        // This would revoke all sessions server-side
        // Requires server implementation
        logger.auth.info('Sign out everywhere requested');
      }
    } catch (error) {
      logger.auth.error('Enhanced sign out failed', error);
      // Still clear local session even if server sign out fails
      await sessionManager.clearSession();
      throw error;
    }
  },
};