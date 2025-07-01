import React, { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  TextInput,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/useAuth';
import { TanStackDebugInfo } from './TanStackDebugInfoMigrated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useSpacingStore } from '@/lib/stores/spacing-store';
import { useAnimationStore } from '@/lib/stores/animation-store';
import { useDebugStore } from '@/lib/stores/debug-store';
import { useThemeStore } from '@/lib/stores/theme-store';
import { cn } from '@/lib/core/utils';
import { Text } from '@/components/universal/typography';
import { VStack, HStack } from '@/components/universal/layout';
import { Button } from '@/components/universal/interaction';
import { Card } from '@/components/universal/display';
import { Switch } from '@/components/universal/form';
import { Symbol } from '@/components/universal/display/Symbols';
import { useShadow } from '@/hooks/useShadow';
import Animated, { FadeIn } from 'react-native-reanimated';
import { debugLog, type LogLevel, type DebugLog, exportLogs } from '../utils/logger';
import { startConsoleInterception, stopConsoleInterception } from '../utils/console-interceptor';
import { getNavigationHistory, clearNavigationHistory, getCurrentRoute } from '@/lib/core/debug/router-debug';
import { webSocketLogger, type WebSocketLog } from '../utils/websocket-logger';
import { useDebugLogs, useWebSocketLogs, useFilteredLogs } from '../hooks/useDebugLogs';

const AnimatedView = Animated.View;

// Log level colors using Tailwind classes
const LOG_LEVEL_CLASSES = {
  error: 'border-destructive bg-destructive/10',
  warn: 'border-warning bg-warning/10',
  info: 'border-primary bg-primary/10',
  debug: 'border-success bg-success/10',
} as const;

// Memoized log entry component
const LogEntryItem = React.memo(({ 
  log, 
  onPress, 
  onLongPress 
}: { 
  log: DebugLog; 
  onPress: () => void; 
  onLongPress: () => void;
}) => {
  const shadowSm = useShadow({ size: 'sm' });
  
  return (
    <AnimatedView entering={FadeIn.springify()}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        className={cn(
          "mb-2 p-3 rounded-lg border-l-4",
          LOG_LEVEL_CLASSES[log.level]
        )}
        style={shadowSm}
      >
        <HStack justify="between" className="mb-1">
          <Text 
            size="xs" 
            weight="semibold"
            className={cn(
              log.level === 'error' && 'text-destructive',
              log.level === 'warn' && 'text-warning',
              log.level === 'info' && 'text-primary',
              log.level === 'debug' && 'text-success'
            )}
          >
            {log.level.toUpperCase()} {log.source && `• ${log.source}`}
          </Text>
          <Text size="xs" colorTheme="mutedForeground">
            {log.timestamp.toLocaleTimeString()}
          </Text>
        </HStack>
        
        <Text size="sm" className="mb-1">
          {log.message}
        </Text>
        
        {log.data && (
          <Text 
            size="xs" 
            colorTheme="mutedForeground"
            style={{ fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) }}
          >
            {JSON.stringify(log.data, null, 2)}
          </Text>
        )}
        
        <Text size="xs" colorTheme="mutedForeground" className="mt-2 italic">
          Tap to copy • Long press for details
        </Text>
      </TouchableOpacity>
    </AnimatedView>
  );
});

LogEntryItem.displayName = 'LogEntryItem';

export function ConsolidatedDebugPanel() {
  const [visible, setVisible] = useState(false);
  const [logFilter, setLogFilter] = useState<LogLevel>('debug');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'logs' | 'router' | 'wsocket' | 'config'>('logs');
  const [consoleIntercept, setConsoleIntercept] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const spacingStore = useSpacingStore();
  const animationStore = useAnimationStore();
  const debugStore = useDebugStore();
  const themeStore = useThemeStore();
  const shadowLg = useShadow({ size: 'lg' });
  
  // Defer search query for better performance
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Use TanStack Query hooks for debug logs
  const { logs, errorCount, logCounts, clearLogs } = useDebugLogs();
  const { wsLogs, clearWebSocketLogs } = useWebSocketLogs(activeTab === 'wsocket' && debugStore.enableWebSocketLogging);
  const { data: filteredLogs = [] } = useFilteredLogs(logs, logFilter, deferredSearchQuery);

  // Handle console interception toggle
  const handleConsoleInterceptToggle = useCallback((value: boolean) => {
    setConsoleIntercept(value);
    if (value) {
      startConsoleInterception();
    } else {
      stopConsoleInterception();
    }
  }, []);

  // Check if we should show the debug panel
  const shouldShowDebugPanel = __DEV__ && debugStore.showDebugPanel !== false;
  
  if (!shouldShowDebugPanel) return null;

  const handleExport = async () => {
    const logText = exportLogs(filteredLogs);
    
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(logText);
        Alert.alert('Success', 'Logs copied to clipboard');
      } catch {
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${Date.now()}.txt`;
        a.click();
      }
    } else {
      await Clipboard.setStringAsync(logText);
      Alert.alert('Success', 'Logs copied to clipboard');
    }
  };

  const copyLogEntry = async (log: DebugLog) => {
    const logText = exportLogs([log]);
    
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(logText);
      } catch {
        console.error('Failed to copy to clipboard');
      }
    } else {
      await Clipboard.setStringAsync(logText);
    }
    
    Alert.alert('Copied', 'Log entry copied to clipboard');
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            clearLogs();
          }
        },
      ]
    );
  };

  return (
    <>
      {/* Floating Debug Button */}
      <AnimatedView
        entering={FadeIn.delay(500).springify()}
        className="absolute left-5 z-50"
        style={[
          shadowLg,
          {
            bottom: Platform.OS === 'ios' ? 100 + 24 : 80 + 24, // Tab bar height + 24px
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => setVisible(true)}
          className="bg-primary w-14 h-14 rounded-full items-center justify-center"
        >
          <Text className="text-2xl">🐛</Text>
          {errorCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-destructive rounded-full min-w-[20px] h-5 items-center justify-center px-1">
              <Text size="xs" weight="bold" className="text-destructive-foreground">
                {errorCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </AnimatedView>

      {/* Debug Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setVisible(false)}
      >
        <View className="flex-1 bg-background">
          {/* Header */}
          <View 
            className={cn(
              "bg-background/95 border-b border-border",
              Platform.OS === 'ios' && "absolute top-0 left-0 right-0 z-10"
            )}
            style={{ paddingTop: insets.top }}
          >
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={100}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            
            <HStack className="h-11 px-4" align="center">
              <TouchableOpacity
                onPress={() => setVisible(false)}
                className="p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text size="lg" weight="bold">✕</Text>
              </TouchableOpacity>
              
              <View className="flex-1 items-center">
                <Text size="lg" weight="semibold">Debug Console</Text>
              </View>
              
              <View className="w-9" />
            </HStack>
          </View>

          {/* Main Content */}
          <ScrollView 
            className="flex-1"
            style={{ marginTop: Platform.OS === 'ios' ? insets.top + 44 : 0 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Platform Info */}
            <TouchableOpacity
              onLongPress={async () => {
                const platformInfo = `Platform: ${Platform.OS} | Version: ${Platform.Version || 'N/A'}
Auth: ${isAuthenticated ? '✅' : '❌'} | User: ${user?.email || 'None'} | Role: ${user?.role || 'None'}
Environment: ${process.env.EXPO_PUBLIC_ENVIRONMENT || 'dev'}`;
                
                await Clipboard.setStringAsync(platformInfo);
                Alert.alert('Copied', 'Platform info copied to clipboard');
              }}
              className="bg-primary/10 p-3 border-b border-primary/20"
            >
              <HStack justify="between" align="center">
                <Text size="sm" weight="semibold" className="text-primary">
                  {Platform.OS === 'ios' ? '🍎' : Platform.OS === 'android' ? '🤖' : '🌐'} {Platform.OS.toUpperCase()} {Platform.Version ? `v${Platform.Version}` : ''}
                </Text>
                <Text size="xs" colorTheme="mutedForeground" className="italic">
                  Long press to copy
                </Text>
              </HStack>
              <Text size="xs" className="text-primary mt-1" style={{ fontFamily: 'monospace' }}>
                Auth: {isAuthenticated ? '✅' : '❌'} | User: {user?.email || 'None'} | Role: {user?.role || 'None'}
              </Text>
            </TouchableOpacity>

            {/* Tab Navigation */}
            <HStack className="bg-card p-2 border-b border-border">
              {(debugStore.enableWebSocketLogging 
                ? ['logs', 'api', 'wsocket', 'config'] as const
                : ['logs', 'api', 'config'] as const
              ).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab as any)}
                  className={cn(
                    "flex-1 py-2 items-center rounded-md",
                    activeTab === tab && "bg-primary/10"
                  )}
                >
                  <Text 
                    size="sm" 
                    weight={activeTab === tab ? 'semibold' : 'normal'}
                    className={activeTab === tab ? 'text-primary' : 'text-muted-foreground'}
                  >
                    {tab === 'wsocket' ? 'WSocket' : tab === 'api' ? 'API' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </HStack>

            {/* Tab Content */}
            {activeTab === 'logs' && (
              <VStack className="p-4" gap={3}>
                {/* Log Controls */}
                <Card className="p-3">
                  <VStack gap={2}>
                    {/* Search */}
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search logs..."
                      className="bg-muted rounded-lg px-3 py-2 text-sm"
                      placeholderTextColor="#9ca3af"
                    />
                    
                    {/* Filter Buttons */}
                    <HStack gap={1}>
                      {(['error', 'warn', 'info', 'debug'] as const).map((level) => (
                        <TouchableOpacity
                          key={level}
                          onPress={() => setLogFilter(level)}
                          className={cn(
                            "flex-1 py-1 px-2 rounded-md items-center",
                            logFilter === level ? 'bg-primary' : 'bg-muted'
                          )}
                        >
                          <Text 
                            size="xs" 
                            weight="semibold"
                            className={logFilter === level ? 'text-primary-foreground' : 'text-muted-foreground'}
                          >
                            {level.toUpperCase()} ({logCounts[level]})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </HStack>
                    
                    {/* Actions */}
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={handleExport}
                        className="flex-1"
                      >
                        <HStack gap={1} align="center">
                          <Symbol name="arrow.down.circle" size={16} />
                          <Text>Export</Text>
                        </HStack>
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={handleClearLogs}
                        className="flex-1"
                      >
                        <HStack gap={1} align="center">
                          <Symbol name="trash" size={16} />
                          <Text>Clear</Text>
                        </HStack>
                      </Button>
                    </HStack>
                    
                    {/* Console Interception Toggle */}
                    <HStack justify="between" align="center" className="pt-2 border-t border-border">
                      <Text size="sm">Intercept Console</Text>
                      <Switch
                        checked={consoleIntercept}
                        onCheckedChange={handleConsoleInterceptToggle}
                      />
                    </HStack>
                  </VStack>
                </Card>
                
                {/* Log Entries */}
                <VStack gap={2}>
                  <Text size="sm" weight="semibold" colorTheme="mutedForeground">
                    {filteredLogs.length} logs {searchQuery && '(filtered)'}
                  </Text>
                  
                  {filteredLogs.length === 0 ? (
                    <Card className="p-12 items-center justify-center">
                      <VStack gap={2} align="center">
                        <Symbol name="info.circle" size={48} className="text-muted-foreground" />
                        <Text colorTheme="mutedForeground" className="text-center">No logs to display</Text>
                        <Text size="xs" colorTheme="mutedForeground" className="text-center">
                          {searchQuery ? 'No logs match your search' : 'Logs will appear here as they are generated'}
                        </Text>
                      </VStack>
                    </Card>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <LogEntryItem
                        key={`${log.timestamp.getTime()}-${index}`}
                        log={log}
                        onPress={() => copyLogEntry(log)}
                        onLongPress={() => {
                          Alert.alert(
                            'Log Details',
                            exportLogs([log]),
                            [
                              { text: 'Copy', onPress: () => copyLogEntry(log) },
                              { text: 'OK' },
                            ]
                          );
                        }}
                      />
                    ))
                  )}
                </VStack>
              </VStack>
            )}
            
            {activeTab === 'api' && (
              <VStack className="p-4" gap={3}>
                {/* TanStack Query Debug */}
                <TanStackDebugInfo />
              </VStack>
            )}
            
            {activeTab === 'wsocket' && (
              <VStack className="p-4" gap={3}>
                {/* WebSocket Controls */}
                <Card className="p-3">
                  <VStack gap={2}>
                    {/* WebSocket Info */}
                    <HStack justify="between" align="center">
                      <Text size="sm" weight="semibold">WebSocket Logs</Text>
                      <Text size="xs" colorTheme="mutedForeground">
                        {wsLogs.length} events
                      </Text>
                    </HStack>
                    
                    {/* Actions */}
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={async () => {
                          const logText = wsLogs.map(log => {
                            const timestamp = log.timestamp.toLocaleTimeString();
                            const url = new URL(log.url).pathname;
                            let line = `[${timestamp}] ${log.type.toUpperCase()} ${url}`;
                            
                            if (log.type === 'message') {
                              line += ` ${log.direction === 'send' ? '→' : '←'} ${log.messageType || 'unknown'} (${log.size || 0} bytes)`;
                            }
                            
                            if (log.data) {
                              line += `\nData: ${JSON.stringify(log.data, null, 2)}`;
                            }
                            
                            if (log.error) {
                              line += `\nError: ${log.error}`;
                            }
                            
                            return line;
                          }).join('\n\n');
                          
                          if (Platform.OS === 'web') {
                            try {
                              await navigator.clipboard.writeText(logText);
                              Alert.alert('Success', 'WebSocket logs copied to clipboard');
                            } catch {
                              const blob = new Blob([logText], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `ws-logs-${Date.now()}.txt`;
                              a.click();
                            }
                          } else {
                            await Clipboard.setStringAsync(logText);
                            Alert.alert('Success', 'WebSocket logs copied to clipboard');
                          }
                        }}
                        className="flex-1"
                      >
                        <HStack gap={1} align="center">
                          <Symbol name="arrow.down.circle" size={16} />
                          <Text>Export</Text>
                        </HStack>
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => {
                          Alert.alert(
                            'Clear WebSocket Logs',
                            'Are you sure you want to clear all WebSocket logs?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Clear', 
                                style: 'destructive',
                                onPress: () => {
                                  webSocketLogger.clearLogs();
                                  setWsLogs([]);
                                }
                              },
                            ]
                          );
                        }}
                        className="flex-1"
                      >
                        <HStack gap={1} align="center">
                          <Symbol name="trash" size={16} />
                          <Text>Clear</Text>
                        </HStack>
                      </Button>
                    </HStack>
                  </VStack>
                </Card>
                
                {/* WebSocket Log Entries */}
                <VStack gap={2}>
                  {wsLogs.length === 0 ? (
                    <Card className="p-12 items-center justify-center">
                      <VStack gap={2} align="center">
                        <Symbol name="wifi" size={48} className="text-muted-foreground" />
                        <Text colorTheme="mutedForeground" className="text-center">No WebSocket activity</Text>
                        <Text size="xs" colorTheme="mutedForeground" className="text-center">
                          WebSocket logging is {debugStore.enableWebSocketLogging ? 'enabled' : 'disabled'}.
                          {debugStore.enableWebSocketLogging && ' Waiting for WebSocket connections...'}
                        </Text>
                      </VStack>
                    </Card>
                  ) : (
                    wsLogs.map((log, index) => {
                      const url = new URL(log.url).pathname;
                      const bgClass = log.type === 'error' ? 'bg-destructive/10' : 
                                      log.type === 'connect' || log.type === 'open' ? 'bg-success/10' :
                                      log.type === 'close' || log.type === 'disconnect' ? 'bg-warning/10' :
                                      'bg-primary/10';
                      
                      return (
                        <TouchableOpacity
                          key={`${log.timestamp.getTime()}-${index}`}
                          onPress={async () => {
                            const details = `Type: ${log.type}
URL: ${log.url}
Time: ${log.timestamp.toLocaleString()}
${log.direction ? `Direction: ${log.direction}` : ''}
${log.messageType ? `Message Type: ${log.messageType}` : ''}
${log.size !== undefined ? `Size: ${log.size} bytes` : ''}
${log.data ? `\nData:\n${JSON.stringify(log.data, null, 2)}` : ''}
${log.error ? `\nError: ${log.error}` : ''}`;
                            
                            Alert.alert(
                              'WebSocket Event Details',
                              details,
                              [
                                { 
                                  text: 'Copy', 
                                  onPress: async () => {
                                    await Clipboard.setStringAsync(details);
                                    Alert.alert('Copied', 'Event details copied to clipboard');
                                  }
                                },
                                { text: 'OK' },
                              ]
                            );
                          }}
                          className={cn("mb-2 p-3 rounded-lg", bgClass)}
                        >
                          <HStack justify="between" className="mb-1">
                            <HStack gap={2} align="center">
                              <Text size="xs" weight="semibold">
                                {log.type === 'connect' && '🔌'}
                                {log.type === 'open' && '✅'}
                                {log.type === 'close' && '❌'}
                                {log.type === 'disconnect' && '🔌'}
                                {log.type === 'error' && '⚠️'}
                                {log.type === 'message' && (log.direction === 'send' ? '📤' : '📥')}
                                {' '}{log.type.toUpperCase()}
                              </Text>
                              {log.messageType && (
                                <Text size="xs" colorTheme="mutedForeground">
                                  ({log.messageType})
                                </Text>
                              )}
                            </HStack>
                            <Text size="xs" colorTheme="mutedForeground">
                              {log.timestamp.toLocaleTimeString()}
                            </Text>
                          </HStack>
                          
                          <Text size="sm" className="mb-1">
                            {url}
                          </Text>
                          
                          {log.type === 'message' && (
                            <HStack gap={2}>
                              <Text size="xs" colorTheme="mutedForeground">
                                {log.direction === 'send' ? 'Sent' : 'Received'}: {log.size || 0} bytes
                              </Text>
                            </HStack>
                          )}
                          
                          {log.type === 'close' && log.data && (
                            <Text size="xs" colorTheme="mutedForeground">
                              Code: {log.data.code} {log.data.reason ? `- ${log.data.reason}` : ''}
                            </Text>
                          )}
                          
                          {log.error && (
                            <Text size="xs" className="text-destructive mt-1">
                              Error: {typeof log.error === 'object' ? JSON.stringify(log.error) : log.error}
                            </Text>
                          )}
                          
                          {log.data && log.type === 'message' && (
                            <Text 
                              size="xs" 
                              colorTheme="mutedForeground"
                              style={{ fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) }}
                              numberOfLines={3}
                            >
                              {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data}
                            </Text>
                          )}
                          
                          <Text size="xs" colorTheme="mutedForeground" className="mt-2 italic">
                            Tap for details
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </VStack>
              </VStack>
            )}
            
            {activeTab === 'config' && (
              <VStack className="p-4" gap={3}>
                {/* Debug Settings */}
                <Card className="p-4">
                  <VStack gap={3}>
                    <Text size="lg" weight="semibold">Debug Settings</Text>
                    
                    <HStack justify="between" align="center">
                      <Text size="sm">Enable tRPC Logging</Text>
                      <Switch
                        checked={debugStore.enableTRPCLogging}
                        onCheckedChange={(checked) => debugStore.updateSettings({ enableTRPCLogging: checked })}
                      />
                    </HStack>
                    
                    <HStack justify="between" align="center">
                      <Text size="sm">Enable Router Logging</Text>
                      <Switch
                        checked={debugStore.enableRouterLogging}
                        onCheckedChange={(checked) => debugStore.updateSettings({ enableRouterLogging: checked })}
                      />
                    </HStack>
                    
                    <HStack justify="between" align="center">
                      <Text size="sm">Enable Auth Logging</Text>
                      <Switch
                        checked={debugStore.enableAuthLogging}
                        onCheckedChange={(checked) => debugStore.updateSettings({ enableAuthLogging: checked })}
                      />
                    </HStack>
                    
                    <HStack justify="between" align="center">
                      <Text size="sm">Enable WebSocket Logging</Text>
                      <Switch
                        checked={debugStore.enableWebSocketLogging}
                        onCheckedChange={(checked) => {
                          debugStore.updateSettings({ enableWebSocketLogging: checked });
                          if (checked) {
                            webSocketLogger.startInterception();
                          } else {
                            webSocketLogger.stopInterception();
                          }
                        }}
                      />
                    </HStack>
                    
                    <HStack justify="between" align="center">
                      <Text size="sm">Enable Healthcare Logging</Text>
                      <Switch
                        checked={debugStore.enableHealthcareLogging}
                        onCheckedChange={(checked) => debugStore.updateSettings({ enableHealthcareLogging: checked })}
                      />
                    </HStack>
                  </VStack>
                </Card>
                
                {/* Theme Settings */}
                <Card className="p-4">
                  <VStack gap={3}>
                    <Text size="lg" weight="semibold">Theme & Display</Text>
                    
                    {/* Theme Selection */}
                    <VStack gap={2}>
                      <Text size="sm">App Theme</Text>
                      <HStack gap={2} style={{ flexWrap: 'wrap' }}>
                        {Object.keys(themeStore.availableThemes).map((themeId) => (
                          <Button
                            key={themeId}
                            size="sm"
                            variant={themeStore.themeId === themeId ? 'default' : 'outline'}
                            onPress={() => themeStore.setThemeId(themeId)}
                          >
                            {themeId.charAt(0).toUpperCase() + themeId.slice(1)}
                          </Button>
                        ))}
                      </HStack>
                    </VStack>
                    
                    {/* Color Scheme */}
                    <VStack gap={2}>
                      <HStack justify="between" align="center">
                        <Text size="sm">Use System Theme</Text>
                        <Switch
                          checked={themeStore.useSystemTheme}
                          onCheckedChange={(checked) => themeStore.setUseSystemTheme(checked)}
                        />
                      </HStack>
                      
                      {!themeStore.useSystemTheme && (
                        <HStack gap={2}>
                          <Button
                            size="sm"
                            variant={themeStore.colorScheme === 'light' ? 'default' : 'outline'}
                            onPress={() => themeStore.setColorScheme('light')}
                          >
                            <HStack gap={1} align="center">
                              <Symbol name="sun.max" size={16} />
                              <Text>Light</Text>
                            </HStack>
                          </Button>
                          <Button
                            size="sm"
                            variant={themeStore.colorScheme === 'dark' ? 'default' : 'outline'}
                            onPress={() => themeStore.setColorScheme('dark')}
                          >
                            <HStack gap={1} align="center">
                              <Symbol name="moon" size={16} />
                              <Text>Dark</Text>
                            </HStack>
                          </Button>
                        </HStack>
                      )}
                    </VStack>
                    
                    <VStack gap={2}>
                      <Text size="sm">Spacing Density</Text>
                      <HStack gap={2}>
                        <Button
                          size="sm"
                          variant={spacingStore.density === 'compact' ? 'default' : 'outline'}
                          onPress={() => spacingStore.setDensity('compact')}
                        >
                          Compact
                        </Button>
                        <Button
                          size="sm"
                          variant={spacingStore.density === 'medium' ? 'default' : 'outline'}
                          onPress={() => spacingStore.setDensity('medium')}
                        >
                          Medium
                        </Button>
                        <Button
                          size="sm"
                          variant={spacingStore.density === 'large' ? 'default' : 'outline'}
                          onPress={() => spacingStore.setDensity('large')}
                        >
                          Large
                        </Button>
                      </HStack>
                    </VStack>
                  </VStack>
                </Card>
                
                {/* Animation Settings */}
                <Card className="p-4">
                  <VStack gap={3}>
                    <Text size="lg" weight="semibold">Animations</Text>
                    
                    <HStack justify="between" align="center">
                      <Text size="sm">Enable Animations</Text>
                      <Switch
                        checked={animationStore.enableAnimations}
                        onCheckedChange={(checked) => animationStore.setEnableAnimations(checked)}
                      />
                    </HStack>
                    
                    <HStack justify="between" align="center">
                      <Text size="sm">Debug Mode</Text>
                      <Switch
                        checked={animationStore.debugMode}
                        onCheckedChange={(checked) => animationStore.setDebugMode(checked)}
                      />
                    </HStack>
                    
                    <VStack gap={2}>
                      <Text size="sm">Animation Speed</Text>
                      <HStack gap={2}>
                        <Button
                          size="sm"
                          variant={animationStore.animationSpeed === 0.5 ? 'default' : 'outline'}
                          onPress={() => animationStore.setAnimationSpeed(0.5)}
                        >
                          Slow
                        </Button>
                        <Button
                          size="sm"
                          variant={animationStore.animationSpeed === 1 ? 'default' : 'outline'}
                          onPress={() => animationStore.setAnimationSpeed(1)}
                        >
                          Normal
                        </Button>
                        <Button
                          size="sm"
                          variant={animationStore.animationSpeed === 2 ? 'default' : 'outline'}
                          onPress={() => animationStore.setAnimationSpeed(2)}
                        >
                          Fast
                        </Button>
                      </HStack>
                    </VStack>
                  </VStack>
                </Card>
                
                {/* Router & Navigation Settings */}
                <Card className="p-4">
                  <VStack gap={3}>
                    <Text size="lg" weight="semibold">Router & Navigation</Text>
                    
                    <VStack gap={2}>
                      <Text size="sm" colorTheme="mutedForeground">
                        Current Route: {(() => {
                          const route = getCurrentRoute();
                          return route?.pathname || 'Unknown';
                        })()}
                      </Text>
                      
                      <HStack gap={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => {
                            clearNavigationHistory();
                            Alert.alert('Success', 'Navigation history cleared');
                          }}
                        >
                          Clear History
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="default"
                          onPress={() => {
                            const { router } = require('expo-router');
                            debugLog.info('Navigating to home screen from debug panel');
                            router.replace('/home');
                          }}
                        >
                          <HStack gap={1} align="center">
                            <Symbol name="house.fill" size={16} />
                            <Text>Go to Home</Text>
                          </HStack>
                        </Button>
                      </HStack>
                    </VStack>
                    
                    {/* Navigation History Summary */}
                    <VStack gap={2}>
                      <Text size="sm" weight="medium">Recent Navigation</Text>
                      {getNavigationHistory().length === 0 ? (
                        <Text size="xs" colorTheme="mutedForeground" className="italic">
                          No navigation history
                        </Text>
                      ) : (
                        <>
                          {getNavigationHistory().slice(0, 5).map((entry, index) => (
                            <TouchableOpacity
                              key={index}
                              onPress={() => {
                                const { router } = require('expo-router');
                                router.push(entry.pathname);
                              }}
                              className="p-2 bg-muted/50 rounded-md"
                            >
                              <HStack justify="between" align="center">
                                <Text size="xs">{entry.pathname}</Text>
                                <Text size="xs" colorTheme="mutedForeground">
                                  {new Date(entry.timestamp).toLocaleTimeString()}
                                </Text>
                              </HStack>
                            </TouchableOpacity>
                          ))}
                          {getNavigationHistory().length > 5 && (
                            <Text size="xs" colorTheme="mutedForeground" className="text-center">
                              +{getNavigationHistory().length - 5} more entries
                            </Text>
                          )}
                        </>
                      )}
                    </VStack>
                  </VStack>
                </Card>
              </VStack>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}