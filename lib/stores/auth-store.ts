// lib/stores/auth-store.ts
import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector , devtools } from 'zustand/middleware';
import PlatformStorage from '../core/platform-storage';
import { Platform } from 'react-native';
import type { User, Session } from 'better-auth/types';
import { AppUser, UserRole } from '@/types/auth'; // Import our unified types
import { logger } from '@/lib/core/debug/unified-logger';
const log = logger;

// Create a safe storage adapter that works on all platforms
const storage = Platform.OS === 'web' 
  ? {
      getItem: (name: string) => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(name);
      },
      setItem: (name: string, value: string) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(name, value);
      },
      removeItem: (name: string) => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(name);
      },
    }
  : PlatformStorage;

// Re-export AppUser from our unified types
export type { AppUser } from '@/types/auth';

// Helper function to safely convert any user object to AppUser
export function toAppUser(user: any, fallbackRole: UserRole = 'user'): AppUser {
  // Special handling for OAuth users - if role is guest or needsProfileCompletion is true, ensure it's preserved
  const needsProfileCompletion = user.needsProfileCompletion === true || 
                                  user.role === 'guest' || 
                                  (!user.role && fallbackRole === 'guest');
  
  const appUser = {
    ...user,
    role: user.role || fallbackRole,
    organizationId: user.organizationId || undefined,
    organizationName: user.organizationName || undefined,
    organizationRole: user.organizationRole || undefined,
    department: user.department || undefined,
    needsProfileCompletion: needsProfileCompletion,
    emailVerified: user.emailVerified !== false, // Default to true if not specified
  } as AppUser;
  
  logger.store.update('authStore', 'toAppUser', {
    input: {
      id: user?.id,
      role: user?.role,
      needsProfileCompletion: user?.needsProfileCompletion,
      hasRole: 'role' in user,
      hasNeedsProfileCompletion: 'needsProfileCompletion' in user
    },
    output: {
      role: appUser.role,
      needsProfileCompletion: appUser.needsProfileCompletion,
      fallbackRole
    }
  });
  
  return appUser;
}

interface AuthState {
  // Core state
  user: AppUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  
  // Enhanced state
  lastActivity: Date;
  error: string | null;
}

interface AuthActions {
  // Hydration
  setHasHydrated: (state: boolean) => void;
  
  // Authentication (state management only - actual auth calls via tRPC)
  setUser: (user: AppUser | null) => void;
  setSession: (session: Session | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  clearAuth: () => void;
  
  // Internal state management
  updateAuth: (user: AppUser | null, session: Session | null) => void;
  updateUserData: (userData: Partial<AppUser>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateActivity: () => void;
  
  // Permissions
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canAccess: (resource: string) => boolean;
  
  // Session management
  logout: (reason?: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// Credentials types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name: string;
  role?: 'operator' | 'doctor' | 'nurse' | 'head_doctor';
  hospitalId?: string;
}

// Create the store with Better Auth integration
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // Initial state
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        hasHydrated: false,
        lastActivity: new Date(),
        error: null,

        // Hydration
        setHasHydrated: (state) => {
          logger.store.update('authStore', 'setHasHydrated', { hasHydrated: state });
          set({ hasHydrated: state });
        },

        // Authentication state management only
        setUser: (user) => {
          logger.store.update('authStore', 'setUser', { userId: user?.id });
          set({ user });
        },

        setSession: (session) => {
          logger.store.update('authStore', 'setSession', { sessionId: session?.id });
          set({ session });
        },

        setAuthenticated: (authenticated) => {
          logger.store.update('authStore', 'setAuthenticated', { authenticated });
          set({ isAuthenticated: authenticated });
        },

        clearAuth: async () => {
          logger.store.update('authStore', 'clearAuth', {});
          const prevState = get();
          logger.store.update('authStore', 'clearAuth.previousState', {
            hadUser: !!prevState.user,
            wasAuthenticated: prevState.isAuthenticated
          });
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            error: null,
          });
          log.info('[AuthStore] State cleared', 'COMPONENT');
        },

        logout: async (reason = 'user_initiated') => {
          log.info('Initiating logout', 'AUTH', { reason });
          
          // Clear local state immediately
          get().clearAuth();
          
          // Clear session storage
          const { sessionManager } = await import('@/lib/auth/auth-session-manager');
          await sessionManager.clearSession();
        },
        
        signOut: async () => {
          try {
            await get().logout('user_initiated');
          } catch (error) {
            log.error('Sign out error', 'AUTH', error);
            // Clear auth state even if logout fails
            get().clearAuth();
            throw error;
          }
        },

        // Internal state management
        updateAuth: async (user, session) => {
          const currentState = get();
          
          // More comprehensive comparison to prevent unnecessary updates
          const userChanged = currentState.user?.id !== user?.id || 
                              currentState.user?.role !== user?.role ||
                              currentState.user?.needsProfileCompletion !== user?.needsProfileCompletion;
          const authChanged = currentState.isAuthenticated !== (!!user && !!session);
          
          if (!userChanged && !authChanged) {
            return; // Skip update entirely to prevent re-renders
          }
          
          logger.store.update('authStore', 'updateAuth', { 
            userId: user?.id, 
            role: user?.role,
            isAuth: !!user && !!session,
            userChanged,
            authChanged
          });
          
          // Better Auth handles session storage automatically
          
          set({
            user,
            session,
            isAuthenticated: !!user && !!session,
            lastActivity: new Date(),
            error: null,
          });
        },

        updateUserData: (userData) => {
          const currentState = get();
          
          if (!currentState.user) {
            log.warn('Cannot update user data - no user logged in', 'AUTH_STORE');
            return;
          }
          
          logger.store.update('authStore', 'updateUserData', userData);
          
          set({
            user: {
              ...currentState.user,
              ...userData,
            },
            lastActivity: new Date(),
          });
        },

        setLoading: (loading) => set({ isLoading: loading }),
        
        setError: (error) => set({ error }),

        updateActivity: () => {
          set({ lastActivity: new Date() });
        },

        // Session validation (will be called by components using tRPC)
        checkSession: async () => {
          // This will be called by components after they check session via tRPC
          const state = get();
          logger.store.update('authStore', 'checkSession', {
            hasUser: !!state.user,
            isAuthenticated: state.isAuthenticated
          });
          
          // In a full implementation, this would call the auth API to validate the session
          // For now, we'll just update the activity timestamp without triggering other updates
          const now = new Date();
          if (state.lastActivity.getTime() < now.getTime() - 30000) { // Only update if 30s passed
            set({ lastActivity: now });
          }
        },

        // Permission checking
        hasPermission: (permission) => {
          const user = get().user;
          if (!user) return false;
          
          // Role-based permissions
          const rolePermissions: Record<string, string[]> = {
            admin: ['*'], // Admin can access everything
            manager: [
              'manage_users', 'view_analytics', 'manage_content', 
              'view_team', 'view_reports', 'manage_approvals', 'manage_schedule'
            ],
            user: ['view_content', 'edit_profile'],
            guest: ['view_content'],
          };
          
          const permissions = rolePermissions[user.role] || [];
          return permissions.includes('*') || permissions.includes(permission);
        },

        hasRole: (role) => {
          const user = get().user;
          return user?.role === role;
        },

        canAccess: (resource) => {
          return get().hasPermission(resource);
        },
      })),
      {
        name: 'app-auth-storage',
        storage: createJSONStorage(() => storage),
        skipHydration: Platform.OS === 'web' && typeof window === 'undefined', // Skip on SSR
        onRehydrateStorage: (state) => {
          logger.store.update('authStore', 'onRehydrateStorage', { hasState: !!state });
          
          return (rehydratedState, error) => {
            if (error) {
              logger.store.error('authStore', 'rehydrateError', error);
            }
            
            // Always set hasHydrated to true immediately after rehydration
            if (rehydratedState) {
              rehydratedState.setHasHydrated(true);
            } else {
              // Even if no state, mark as hydrated immediately
              const currentState = useAuthStore.getState();
              currentState.setHasHydrated(true);
            }
          };
        },
        // Only persist non-sensitive data
        partialize: (state) => ({
          user: state.user,
          session: state.session,
          isAuthenticated: state.isAuthenticated,
          lastActivity: state.lastActivity,
        }),
      }
    ),
    { name: 'AppAuthStore' }
  )
);

// Subscribe to auth changes for side effects with throttling
let lastAuthStateChange = 0;
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated, previousIsAuthenticated) => {
    const now = Date.now();
    
    // Throttle subscription calls to prevent infinite loops
    if (now - lastAuthStateChange < 500) {
      return;
    }
    lastAuthStateChange = now;
    
    if (previousIsAuthenticated && !isAuthenticated) {
      // User logged out - clear any sensitive data
      logger.store.update('authStore', 'logoutClearingSensitiveData', {});
    }
  }
);

// Export stable hooks to prevent infinite loops
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const error = useAuthStore((state) => state.error);
  const lastActivity = useAuthStore((state) => state.lastActivity);
  
  // Get stable method references once
  const methods = React.useMemo(() => {
    const state = useAuthStore.getState();
    return {
      setUser: state.setUser,
      setSession: state.setSession,
      setAuthenticated: state.setAuthenticated,
      clearAuth: state.clearAuth,
      updateAuth: state.updateAuth,
      updateUserData: state.updateUserData,
      setLoading: state.setLoading,
      setError: state.setError,
      updateActivity: state.updateActivity,
      checkSession: state.checkSession,
      logout: state.logout,
      hasPermission: state.hasPermission,
      hasRole: state.hasRole,
      canAccess: state.canAccess,
      setRefreshing: state.setLoading, // Map setRefreshing to setLoading
    };
  }, []); // Empty deps - methods are stable
  
  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    hasHydrated,
    error,
    lastActivity,
    ...methods,
  };
};

export const useAuthGuard = (requiredPermission?: string) => {
  const { isAuthenticated, hasHydrated, canAccess } = useAuth();
  
  const isAuthorized = React.useMemo(() => {
    if (!hasHydrated || !isAuthenticated) return false;
    if (!requiredPermission) return true;
    return canAccess(requiredPermission);
  }, [isAuthenticated, hasHydrated, requiredPermission, canAccess]);
  
  return {
    isAuthorized,
    isLoading: !hasHydrated,
  };
};

// Export the store itself for direct access (needed by session timeout manager)
export const authStore = useAuthStore;

// Legacy exports for backward compatibility during transition
export const useUser = () => useAuthStore((state) => state.user);
export const useSession = () => useAuthStore((state) => state.session);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);