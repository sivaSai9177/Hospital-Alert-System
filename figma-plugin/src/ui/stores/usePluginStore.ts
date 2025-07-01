import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface PluginSettings {
  theme: 'light' | 'dark' | 'auto';
  autoSync: boolean;
  syncInterval: number; // in minutes
  exportFormat: 'json' | 'css' | 'scss';
  mcpEnabled: boolean;
  mcpEndpoint?: string;
  apiKey?: string;
  debugMode: boolean;
}

export interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  syncInProgress: boolean;
  syncErrors: string[];
}

export interface PluginNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: Date;
  dismissible: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface PluginState {
  // Plugin state
  isInitialized: boolean;
  currentView: string;
  settings: PluginSettings;
  syncStatus: SyncStatus;
  
  // Notifications
  notifications: PluginNotification[];
  
  // UI State
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  setCurrentView: (view: string) => void;
  updateSettings: (settings: Partial<PluginSettings>) => void;
  
  // Sync actions
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  startSync: () => Promise<void>;
  stopSync: () => void;
  
  // Notification actions
  addNotification: (notification: Omit<PluginNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // UI actions
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  
  // Reset
  reset: () => void;
}

const defaultSettings: PluginSettings = {
  theme: 'auto',
  autoSync: false,
  syncInterval: 30,
  exportFormat: 'json',
  mcpEnabled: false,
  debugMode: false,
};

const initialState = {
  isInitialized: false,
  currentView: '/',
  settings: defaultSettings,
  syncStatus: {
    isConnected: false,
    lastSync: null,
    syncInProgress: false,
    syncErrors: [],
  },
  notifications: [],
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  settingsOpen: false,
};

export const usePluginStore = create<PluginState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Initialize plugin
        initialize: async () => {
          try {
            // Load saved settings from Figma client storage
            parent.postMessage({
              pluginMessage: {
                type: 'load-settings'
              }
            }, '*');
            
            set({ isInitialized: true });
          } catch (error) {
            console.error('Failed to initialize plugin:', error);
          }
        },

        // View management
        setCurrentView: (view) => set({ currentView: view }),

        // Settings management
        updateSettings: (newSettings) => {
          const settings = { ...get().settings, ...newSettings };
          set({ settings });
          
          // Save to Figma client storage
          parent.postMessage({
            pluginMessage: {
              type: 'save-settings',
              settings
            }
          }, '*');
        },

        // Sync management
        setSyncStatus: (status) => {
          set({
            syncStatus: { ...get().syncStatus, ...status }
          });
        },

        startSync: async () => {
          const { syncStatus, settings } = get();
          
          if (syncStatus.syncInProgress) return;
          
          set({
            syncStatus: {
              ...syncStatus,
              syncInProgress: true,
              syncErrors: []
            }
          });

          try {
            parent.postMessage({
              pluginMessage: {
                type: 'start-sync',
                settings
              }
            }, '*');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({
              syncStatus: {
                ...get().syncStatus,
                syncInProgress: false,
                syncErrors: [errorMessage]
              }
            });
            throw error;
          }
        },

        stopSync: () => {
          parent.postMessage({
            pluginMessage: {
              type: 'stop-sync'
            }
          }, '*');
          
          set({
            syncStatus: {
              ...get().syncStatus,
              syncInProgress: false
            }
          });
        },

        // Notification management
        addNotification: (notification) => {
          const id = Date.now().toString();
          const newNotification: PluginNotification = {
            ...notification,
            id,
            timestamp: new Date(),
          };
          
          set({
            notifications: [...get().notifications, newNotification]
          });
          
          // Auto-dismiss info notifications after 5 seconds
          if (notification.type === 'info' && notification.dismissible !== false) {
            setTimeout(() => {
              get().removeNotification(id);
            }, 5000);
          }
        },

        removeNotification: (id) => {
          set({
            notifications: get().notifications.filter(n => n.id !== id)
          });
        },

        clearNotifications: () => {
          set({ notifications: [] });
        },

        // UI actions
        toggleSidebar: () => {
          set({ sidebarCollapsed: !get().sidebarCollapsed });
        },

        setCommandPaletteOpen: (open) => {
          set({ commandPaletteOpen: open });
        },

        setSettingsOpen: (open) => {
          set({ settingsOpen: open });
        },

        // Reset
        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'plugin-store',
        partialize: (state) => ({
          settings: state.settings,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    {
      name: 'PluginStore',
    }
  )
);

// Message handler hook
export function usePluginMessageHandler() {
  const {
    setSyncStatus,
    addNotification,
    updateSettings,
  } = usePluginStore();

  // Set up message listener
  window.addEventListener('message', (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    switch (msg.type) {
      case 'settings-loaded':
        if (msg.settings) {
          updateSettings(msg.settings);
        }
        break;

      case 'sync-complete':
        setSyncStatus({
          syncInProgress: false,
          lastSync: new Date(),
          syncErrors: [],
        });
        addNotification({
          type: 'success',
          title: 'Sync Complete',
          message: 'Design tokens synced successfully',
          dismissible: true,
        });
        break;

      case 'sync-error':
        setSyncStatus({
          syncInProgress: false,
          syncErrors: [msg.error],
        });
        addNotification({
          type: 'error',
          title: 'Sync Failed',
          message: msg.error,
          dismissible: true,
        });
        break;

      case 'connection-status':
        setSyncStatus({
          isConnected: msg.connected,
        });
        break;
    }
  });
}