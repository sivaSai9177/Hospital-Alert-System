// Suppress common Expo Go warnings - MUST be first import
import "@/lib/core/platform/suppress-warnings";
// Import crypto polyfill early for React Native
import "@/lib/core/crypto";
// Setup window debugger for browser console access
import "@/lib/core/debug/setup-window-logger";
// Import router debugging (will initialize after navigation is ready)
import { initializeRouterDebugger } from "@/lib/core/debug/router-debug";
import { initializeNavigationLogger } from "@/lib/navigation/navigation-logger";
// Import console interceptor
import { startConsoleInterception } from "@/components/blocks/debug/utils/console-interceptor";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { stackScreenOptions } from "@/lib/navigation/transitions";
import { AnimationProvider } from "@/lib/ui/animations/AnimationContext";
import { logger } from '@/lib/core/debug/unified-logger';
import { useThemeStore } from '@/lib/stores/theme-store';
import { AppLoadingScreen } from '@/components/blocks/loading/AppLoadingScreen';

import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { ErrorProvider } from "@/components/providers/ErrorProvider";
import { ErrorBanner } from "@/components/blocks/errors/ErrorBanner";
import { RootErrorStoreSetup } from "@/components/RootErrorStoreSetup";
import GlobalErrorBoundary from "@/components/providers/GlobalErrorBoundary";
import { ConsolidatedDebugPanel } from "@/components/blocks/debug/DebugPanel/DebugPanel";
import { NavigationDebugger } from "@/components/blocks/debug/NavigationDebugger";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { HospitalProvider } from "@/components/providers/HospitalProvider";
import { ThemeStyleInjector } from "@/components/providers/ThemeStyleInjector";
import { ThemeSync } from "@/components/providers/ThemeSync";
// SpacingProvider removed - now using Zustand store
import { EnhancedThemeProvider } from "@/lib/theme/provider";
import { TRPCProvider } from "@/lib/api/trpc";
import { initializeSecureStorage } from "@/lib/core/secure-storage";
import { AlertFilterProvider } from "@/contexts/AlertFilterContext";
// AnimationProvider removed - animations are now handled by components directly

// Import CSS for web platform
import './global.css';

// Import reanimated for all platforms
import 'react-native-reanimated';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Debug component to track mount/unmount (disabled to reduce console noise)
const LayoutDebugger = () => {
  return null;
};

// StatusBar component that responds to theme changes
const ThemedStatusBar = () => {
  const colorScheme = useThemeStore((state) => state.getEffectiveColorScheme());
  return <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />;
};



export default function RootLayout() {
  logger.system.info('RootLayout rendering', {
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    apiUrl: process.env.EXPO_PUBLIC_API_URL
  });
  
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [storageReady, setStorageReady] = useState(Platform.OS === 'web');
  
  logger.system.info('RootLayout state', { 
    fontLoaded: loaded, 
    fontError: error,
    storageReady,
    platform: Platform.OS 
  });

  useEffect(() => {
    // Initialize storage on mobile
    if (Platform.OS !== 'web') {
      console.log('[ROOT LAYOUT] Initializing secure storage...');
      initializeSecureStorage().then(() => {
        console.log('[ROOT LAYOUT] Secure storage ready!');
        setStorageReady(true);
      }).catch(err => {
        console.error('[ROOT LAYOUT] Secure storage init failed:', err);
        // Set ready anyway to prevent infinite loading
        setStorageReady(true);
      });
    }
  }, []);

  useEffect(() => {
    if (loaded && storageReady) {
      SplashScreen.hideAsync();
      logger.debug('[App] All resources loaded, hiding splash screen', 'SYSTEM');
      
      // Initialize debugging tools after navigation is ready
      if (__DEV__) {
        // Start console interception immediately
        startConsoleInterception();
        logger.debug('[App] Console interception started', 'SYSTEM');
        
        // Initialize router debugger after a delay with retry
        const initializeDebuggers = (retryCount = 0) => {
          setTimeout(() => {
            try {
              initializeRouterDebugger();
              logger.debug('[App] Router debugger initialized', 'SYSTEM');
              
              // Initialize navigation logger
              initializeNavigationLogger();
              logger.debug('[App] Navigation logger initialized', 'SYSTEM');
            } catch (error) {
              if (retryCount < 3) {
                logger.debug(`[App] Router debugger not ready, retrying... (attempt ${retryCount + 1})`, 'SYSTEM');
                initializeDebuggers(retryCount + 1);
              } else {
                logger.warn('[App] Router debugger initialization skipped after 3 attempts', 'SYSTEM');
              }
            }
          }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s, 3s
        };
        
        initializeDebuggers();
      }
    }
  }, [loaded, storageReady]);

  // Add error handling
  if (error) {
    logger.system.error('Font loading error', error);
  }

  // Wait for both fonts and storage to be ready
  if (!loaded || !storageReady) {
    logger.system.info('Waiting for resources', { loaded, storageReady });
    // Show the app loading screen while waiting for resources
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider style={{ flex: 1 }}>
          <AppLoadingScreen showProgress={true} minDisplayTime={0} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  logger.system.info('Resources ready, rendering app');

  return (
    <GlobalErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider style={{ flex: 1 }}>
          <ErrorBoundary>
            <TRPCProvider dehydratedState={undefined}>
              <ErrorProvider>
                <SyncProvider>
                  <SessionProvider>
                    <HospitalProvider>
                      <AlertFilterProvider>
                        <EnhancedThemeProvider>
                          <ThemeSync />
                        <AnimationProvider>
                          <ThemeStyleInjector>
                          <RootErrorStoreSetup />
                          <ErrorBanner />
                      <Stack 
                      screenOptions={{
                        ...stackScreenOptions.default,
                        headerShown: false,
                      }}
                    >
                    {/* Public routes */}
                    <Stack.Screen 
                      name="(public)" 
                      options={{ 
                        headerShown: false,
                        animation: 'fade',
                      }}
                    />
                    
                    {/* Authenticated app routes */}
                    <Stack.Screen 
                      name="(app)" 
                      options={{ 
                        headerShown: false,
                        animation: 'fade',
                      }}
                    />
                    
                    {/* Modal routes */}
                    <Stack.Screen 
                      name="(modals)" 
                      options={{ 
                        presentation: 'modal',
                        headerShown: false,
                      }}
                    />
                    
                    {/* Onboarding routes */}
                    <Stack.Screen 
                      name="onboarding" 
                      options={{ 
                        headerShown: false,
                        animation: 'fade',
                      }}
                    />
                    
                    {/* Legacy index route for backward compatibility */}
                    <Stack.Screen 
                      name="index" 
                      options={{ 
                        animation: 'fade',
                        animationDuration: 300,
                      }} 
                    />
                    
                    {/* Auth callback route */}
                    <Stack.Screen 
                      name="auth-callback" 
                      options={{ animation: 'fade' }}
                    />
                    
                    {/* 404 handler */}
                    <Stack.Screen 
                      name="+not-found" 
                      options={{ 
                        animation: 'fade',
                        animationDuration: 200,
                      }} 
                    />
                  </Stack>
                  <ThemedStatusBar />
                  <ConsolidatedDebugPanel />
                  <NavigationDebugger />
                  <LayoutDebugger />
                  </ThemeStyleInjector>
                </AnimationProvider>
              </EnhancedThemeProvider>
              </AlertFilterProvider>
              </HospitalProvider>
              </SessionProvider>
            </SyncProvider>
          </ErrorProvider>
          </TRPCProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
      </GestureHandlerRootView>
    </GlobalErrorBoundary>
  );
}
