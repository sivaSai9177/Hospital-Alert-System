import { Platform } from 'react-native';
import { webStorage, mobileStorage } from '../core/secure-storage';
import { Session, User } from 'better-auth/types';
import { logger } from '../core/debug/unified-logger';

// Standardized storage keys - use underscore notation for consistency
const SESSION_TOKEN_KEY = 'better-auth_session-token';
const SESSION_DATA_KEY = 'better-auth_session_data';
const USER_DATA_KEY = 'better-auth_user_data';

// Legacy keys for migration
const LEGACY_KEYS = [
  'better-auth.session-token',
  'better-auth.session_data',
  'better-auth.user_data',
  'better-auth_cookie',
  'better-auth.cookie',
  'session-token',
  'auth-token'
];

export const sessionManager = {
  // Migrate old storage keys to new standardized keys
  async migrateStorageKeys() {
    const storage = Platform.OS === 'web' ? webStorage : mobileStorage;
    let migrated = false;
    
    try {
      // Check for legacy token storage
      for (const legacyKey of LEGACY_KEYS) {
        const value = storage.getItem(legacyKey);
        if (value) {
          // Extract token from various formats
          let token = null;
          let sessionData = null;
          let userData = null;
          
          if (legacyKey.includes('cookie')) {
            // Extract from cookie format
            const match = value.match(/better-auth\.session-token=([^;\s]+)/);
            if (match) {
              token = match[1];
            }
          } else if (legacyKey.includes('session_data') || legacyKey.includes('session-data')) {
            try {
              sessionData = JSON.parse(value);
            } catch (e) {
              // Not JSON
            }
          } else if (legacyKey.includes('user_data') || legacyKey.includes('user-data')) {
            try {
              userData = JSON.parse(value);
            } catch (e) {
              // Not JSON
            }
          } else if (value.includes('.') && !value.includes('=')) {
            // Direct token
            token = value.trim();
          }
          
          // Store in standardized location
          if (token && !storage.getItem(SESSION_TOKEN_KEY)) {
            storage.setItem(SESSION_TOKEN_KEY, token);
            migrated = true;
          }
          if (sessionData && !storage.getItem(SESSION_DATA_KEY)) {
            storage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));
            migrated = true;
          }
          if (userData && !storage.getItem(USER_DATA_KEY)) {
            storage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            migrated = true;
          }
          
          // Remove legacy key after migration
          storage.removeItem(legacyKey);
        }
      }
      
      if (migrated) {
        logger.auth.info('Migrated legacy auth storage keys', {
          platform: Platform.OS
        });
      }
    } catch (error) {
      logger.auth.error('Failed to migrate storage keys', {
        error: error?.message || error
      });
    }
    
    return migrated;
  },
  
  // Get session token for API requests (enhanced with reference project logic)
  getSessionToken() {
    const storage = Platform.OS === 'web' ? webStorage : mobileStorage;
    
    if (Platform.OS !== 'web') {
      // Mobile: Check all possible keys where token might be stored
      const possibleKeys = [
        'better-auth_session-token',
        'better-auth.session-token',
        'better-auth_cookie',
        'better-auth.cookie',
        'session-token',
        'auth-token'
      ];
      
      let foundToken = null;
      for (const key of possibleKeys) {
        const value = storage.getItem(key);
        if (value) {
          // Check if it's a cookie format and extract token
          if (key.includes('cookie')) {
            // Format 1: Full cookie string with multiple cookies
            const sessionTokenMatch = value.match(/better-auth\.session-token=([^;\s]+)/);
            if (sessionTokenMatch) {
              foundToken = sessionTokenMatch[1];
              break;
            }
            
            // Format 2: Just the session token part
            if (value.startsWith('better-auth.session-token=')) {
              foundToken = value.split('=')[1].split(';')[0].trim();
              break;
            }
            
            // Format 3: Raw token (no cookie format)
            if (value.includes('.') && !value.includes('=') && !value.includes(';')) {
              foundToken = value.trim();
              break;
            }
            
            // Format 4: JSON stringified
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === 'string' && parsed.includes('.')) {
                foundToken = parsed;
                break;
              } else if (parsed.token || parsed.sessionToken || parsed['better-auth.session-token']) {
                foundToken = parsed.token || parsed.sessionToken || parsed['better-auth.session-token'];
                break;
              }
            } catch (e) {
              // Not JSON, continue
            }
          } else {
            // Direct token storage (not in cookie key)
            if (value.includes('.')) { // Likely a JWT token
              foundToken = value.trim();
              break;
            }
          }
        }
      }
      
      // If no token found in known keys, check if there's a session stored
      if (!foundToken) {
        const sessionData = storage.getItem(SESSION_DATA_KEY);
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            if (parsed.token) {
              foundToken = parsed.token;
            }
          } catch (e) {
            // Not valid JSON
          }
        }
      }
      
      return foundToken;
    }
    
    // Web: Use standard key
    return storage.getItem(SESSION_TOKEN_KEY);
  },
  
  // Store session data
  async storeSession(session: Partial<Session> | { token: string; userId: string }) {
    const storage = Platform.OS === 'web' ? webStorage : mobileStorage;
    
    try {
      if ('token' in session && session.token) {
        storage.setItem(SESSION_TOKEN_KEY, session.token);
      }
      storage.setItem(SESSION_DATA_KEY, JSON.stringify(session));
      return true;
    } catch (error) {
      return false;
    }
  },
  
  // Get cached session data
  async getCachedSession(): Promise<{ session: any | null; user: User | null }> {
    const storage = Platform.OS === 'web' ? webStorage : mobileStorage;
    
    try {
      const sessionData = storage.getItem(SESSION_DATA_KEY);
      const userData = storage.getItem(USER_DATA_KEY);
      
      return {
        session: sessionData ? JSON.parse(sessionData) : null,
        user: userData ? JSON.parse(userData) : null,
      };
    } catch (error) {
      return { session: null, user: null };
    }
  },
  
  // Store user data alongside session
  async storeUserData(user: User) {
    const storage = Platform.OS === 'web' ? webStorage : mobileStorage;
    
    try {
      storage.setItem(USER_DATA_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      return false;
    }
  },
  
  // Clear session (used by signOut)
  async clearSession() {
    const storage = Platform.OS === 'web' ? webStorage : mobileStorage;
    
    try {
      // Clear standard keys
      storage.removeItem(SESSION_TOKEN_KEY);
      storage.removeItem(SESSION_DATA_KEY);
      storage.removeItem(USER_DATA_KEY);
      
      // Clear all legacy keys
      for (const legacyKey of LEGACY_KEYS) {
        storage.removeItem(legacyKey);
      }
      
      logger.auth.debug('Session storage cleared', {
        platform: Platform.OS
      });
      
      return true;
    } catch (error) {
      logger.auth.error('Failed to clear session storage', {
        error: error?.message || error
      });
      return false;
    }
  },
  
  // Add session token to request headers
  addAuthHeaders(headers: Record<string, string> = {}) {
    const token = this.getSessionToken();
    
    if (token) {
      return {
        ...headers,
        'Authorization': `Bearer ${token}`,
      };
    }
    
    return headers;
  },
  
  // Debug helper to check all storage locations
  async debugTokenStorage() {
    const storage = Platform.OS === 'web' ? webStorage : mobileStorage;
    const debug: any = {
      platform: Platform.OS,
      tokens: {},
      rawValues: {}
    };
    
    const keysToCheck = [
      'better-auth_cookie',
      'better-auth.cookie', 
      'better-auth_session-token',
      'better-auth.session-token',
      'better-auth_session_data',
      'better-auth.session_data',
      'better-auth_user_data',
      'better-auth.user_data'
    ];
    
    for (const key of keysToCheck) {
      const value = storage.getItem(key);
      if (value) {
        debug.rawValues[key] = value.substring(0, 100) + (value.length > 100 ? '...' : '');
        
        // Try to extract token
        if (key.includes('cookie')) {
          const match = value.match(/better-auth\.session-token=([^;\s]+)/);
          if (match) {
            debug.tokens[`${key}_extracted`] = match[1].substring(0, 20) + '...';
          }
        } else if (value.includes('.')) {
          debug.tokens[key] = value.substring(0, 20) + '...';
        }
      }
    }
    
    return debug;
  }
};