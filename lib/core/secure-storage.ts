import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { logger } from '@/lib/core/debug/unified-logger';

// Better Auth storage interface for web
export const webStorage = {
  getItem: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item;
    } catch (error) {
      logger.error('Web storage error getting item', 'STORAGE', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      logger.error('Web storage error setting item', 'STORAGE', error);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('Web storage error removing item', 'STORAGE', error);
    }
  },
};

// Initialize storage by loading session data from SecureStore
let storageInitialized = false;
let storageInitPromise: Promise<void> | null = null;

export const waitForStorageInit = async () => {
  if (storageInitialized) return;
  if (storageInitPromise) return storageInitPromise;
  
  storageInitPromise = initializeSecureStorage();
  await storageInitPromise;
};

export const initializeSecureStorage = async () => {
  if (storageInitialized || Platform.OS === 'web') return;
  
  try {
    logger.debug('Initializing mobile storage', 'STORAGE');
    
    // Initialize the persistent store immediately
    if (!(global as any).__persistentStore) {
      (global as any).__persistentStore = {};
    }
    
    // Mark as initialized immediately to unblock the app
    storageInitialized = true;
    
    // Load auth data in the background (non-blocking)
    const keys = [
      'better-auth_cookie', 
      'better-auth_session_data',
      'better-auth_session-token',
      'better-auth_user_data',
      // Also check for dot notation keys
      'better-auth.cookie', 
      'better-auth.session_data',
      'better-auth.session-token',
      'better-auth.user_data'
    ];
    
    // Load keys in background without blocking
    Promise.all(
      keys.map(async (key) => {
        try {
          const value = await SecureStore.getItemAsync(key);
          if (value) {
            (global as any).__persistentStore[key] = value;
            logger.debug(`Loaded ${key} from SecureStore`, 'STORAGE');
          }
        } catch (error) {
          logger.error(`Failed to load ${key} from SecureStore`, 'STORAGE', error);
        }
      })
    ).then(() => {
      logger.debug('Mobile storage background loading complete', 'STORAGE');
    }).catch(error => {
      logger.error('Mobile storage background loading failed', 'STORAGE', error);
    });
    
  } catch (error) {
    logger.error('Mobile storage initialization failed', 'STORAGE', error);
    // Still mark as initialized to prevent blocking
    storageInitialized = true;
  }
};

// Keep internal reference for backward compatibility
const initializeStorage = initializeSecureStorage;

// Initialize storage immediately
if (Platform.OS !== 'web') {
  initializeStorage();
}

// Better Auth storage interface for mobile with persistent storage
export const mobileStorage = {
  getItem: (key: string) => {
    try {
      // Ensure storage is initialized
      if (!storageInitialized) {
        logger.debug('Storage not initialized, starting initialization', 'STORAGE');
        initializeStorage(); // Start initialization if not done
      }
      
      const persistentStore = (global as any).__persistentStore || {};
      const value = persistentStore[key] || null;
      
      if (value) {
        logger.debug(`Retrieved ${key}`, 'STORAGE', { preview: value.substring(0, 50) + '...' });
      }
      
      return value;
    } catch (error) {
      logger.error('Mobile storage error getting item', 'STORAGE', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      // Initialize persistent storage if it doesn't exist
      if (!(global as any).__persistentStore) {
        (global as any).__persistentStore = {};
      }
      
      // Store in persistent memory store immediately
      const persistentStore = (global as any).__persistentStore;
      persistentStore[key] = value;
      
      // Also store in SecureStore asynchronously for actual persistence
      SecureStore.setItemAsync(key, value).catch(error => {
        logger.error(`Failed to store ${key} in SecureStore`, 'STORAGE', error);
      });
    } catch (error) {
      logger.error('Mobile storage error setting item', 'STORAGE', error);
    }
  },
  removeItem: (key: string) => {
    try {
      // Remove from persistent memory store
      if ((global as any).__persistentStore) {
        delete (global as any).__persistentStore[key];
      }
      
      // Also remove from SecureStore asynchronously
      SecureStore.deleteItemAsync(key).catch(error => {
        logger.error(`Failed to remove ${key} from SecureStore`, 'STORAGE', error);
      });
    } catch (error) {
      logger.error('Mobile storage error removing item', 'STORAGE', error);
    }
  },
};

// Cross-platform secure storage wrapper
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      return localStorage.getItem(key);
    }
    // Use SecureStore for mobile
    return await SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      localStorage.setItem(key, value);
    } else {
      // Use SecureStore for mobile
      await SecureStore.setItemAsync(key, value);
    }
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Use localStorage for web
      localStorage.removeItem(key);
    } else {
      // Use SecureStore for mobile
      await SecureStore.deleteItemAsync(key);
    }
  },

  // Synchronous methods for Better Auth
  getItemSync(key: string): string | null {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    // SecureStore doesn't have sync methods, so we'll return null
    // This is a limitation on mobile - need to use async storage
    logger.warn('Sync storage not available on mobile, use async methods', 'STORAGE');
    return null;
  },

  setItemSync(key: string, value: string): void {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      logger.warn('Sync storage not available on mobile, use async methods', 'STORAGE');
    }
  },

  deleteItemSync(key: string): void {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      logger.warn('Sync storage not available on mobile, use async methods', 'STORAGE');
    }
  }
};