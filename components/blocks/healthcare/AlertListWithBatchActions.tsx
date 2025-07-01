import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { AlertCardOptimized } from './AlertCardOptimized';
import { EmptyState } from '@/components/universal/feedback/EmptyState';
import { LoadingView } from '@/components/universal/feedback/LoadingView';
import { RefreshControl } from 'react-native';
import { VStack, HStack } from '@/components/universal/layout';
import { Text } from '@/components/universal/typography';
import { Button } from '@/components/universal/interaction';
import { Checkbox } from '@/components/universal/form';
import { Card } from '@/components/universal/display';
import { Symbol } from '@/components/universal/display/Symbols';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { showSuccessAlert, showErrorAlert } from '@/lib/core/alert';
import type { Alert, AlertListItem } from '@/types/alert';
import { startMeasure, endMeasure, useMeasureRender } from '@/lib/performance/monitor';

interface AlertListWithBatchActionsProps {
  alerts: Alert[];
  isLoading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onAlertPress?: (alert: Alert) => void;
  onAcknowledge?: (alertId: string) => Promise<void>;
  onResolve?: (alertId: string) => Promise<void>;
  onBatchAcknowledge?: (alertIds: string[]) => Promise<void>;
  onBatchResolve?: (alertIds: string[]) => Promise<void>;
  canAcknowledge?: boolean;
  canResolve?: boolean;
  highlightedAlertId?: string | null;
  searchQuery?: string;
  hasFilters?: boolean;
}

// Convert Alert to AlertListItem
const alertToListItem = (alert: Alert): AlertListItem => {
  return {
    id: alert.id,
    roomNumber: alert.roomNumber,
    alertType: alert.alertType,
    urgencyLevel: alert.urgencyLevel,
    status: alert.status as 'active' | 'acknowledged' | 'resolved',
    createdAt: alert.createdAt,
    createdByName: alert.createdByName || 'Unknown',
    hospitalId: alert.hospitalId,
    description: alert.description,
    acknowledgedByName: alert.acknowledgedByName,
    acknowledgedAt: alert.acknowledgedAt,
    currentEscalationTier: alert.currentEscalationTier,
    nextEscalationAt: alert.nextEscalationAt,
    isHighlighted: false,
  };
};

export function AlertListWithBatchActions({
  alerts,
  isLoading = false,
  refreshing = false,
  onRefresh,
  onAlertPress,
  onAcknowledge,
  onResolve,
  onBatchAcknowledge,
  onBatchResolve,
  canAcknowledge = false,
  canResolve = false,
  highlightedAlertId,
  searchQuery,
  hasFilters,
}: AlertListWithBatchActionsProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Animation values
  const selectionBarAnimation = React.useRef(new Animated.Value(0)).current;
  
  // Measure component render performance
  useMeasureRender('AlertListWithBatchActions');

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    haptic('light');
    const newMode = !selectionMode;
    setSelectionMode(newMode);
    
    if (!newMode) {
      setSelectedAlerts(new Set());
    }
    
    // Animate selection bar
    Animated.spring(selectionBarAnimation, {
      toValue: newMode ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [selectionMode, selectionBarAnimation]);

  // Toggle alert selection
  const toggleAlertSelection = useCallback((alertId: string) => {
    haptic('light');
    setSelectedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  }, []);

  // Select all visible alerts
  const selectAll = useCallback(() => {
    haptic('medium');
    const eligibleAlerts = alerts.filter(a => 
      a.status === 'active' || (a.status === 'acknowledged' && canResolve)
    );
    setSelectedAlerts(new Set(eligibleAlerts.map(a => a.id)));
  }, [alerts, canResolve]);

  // Clear selection
  const clearSelection = useCallback(() => {
    haptic('light');
    setSelectedAlerts(new Set());
  }, []);

  // Handle batch acknowledge
  const handleBatchAcknowledge = useCallback(async () => {
    if (!onBatchAcknowledge || selectedAlerts.size === 0) return;
    
    setIsProcessing(true);
    haptic('medium');
    
    try {
      const alertIds = Array.from(selectedAlerts);
      await onBatchAcknowledge(alertIds);
      showSuccessAlert(
        'Alerts Acknowledged',
        `Successfully acknowledged ${alertIds.length} alert${alertIds.length > 1 ? 's' : ''}`
      );
      setSelectedAlerts(new Set());
      setSelectionMode(false);
    } catch (error) {
      showErrorAlert('Failed to acknowledge alerts', 'Please try again');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAlerts, onBatchAcknowledge]);

  // Handle batch resolve
  const handleBatchResolve = useCallback(async () => {
    if (!onBatchResolve || selectedAlerts.size === 0) return;
    
    setIsProcessing(true);
    haptic('medium');
    
    try {
      const alertIds = Array.from(selectedAlerts);
      await onBatchResolve(alertIds);
      showSuccessAlert(
        'Alerts Resolved',
        `Successfully resolved ${alertIds.length} alert${alertIds.length > 1 ? 's' : ''}`
      );
      setSelectedAlerts(new Set());
      setSelectionMode(false);
    } catch (error) {
      showErrorAlert('Failed to resolve alerts', 'Please try again');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAlerts, onBatchResolve]);

  // Extract key for FlashList
  const keyExtractor = useCallback((item: Alert) => item.id, []);

  // Render individual alert item
  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<Alert>) => {
    const isSelected = selectedAlerts.has(item.id);
    const canSelect = item.status === 'active' || (item.status === 'acknowledged' && canResolve);
    
    return (
      <TouchableOpacity
        onPress={() => {
          if (selectionMode && canSelect) {
            toggleAlertSelection(item.id);
          } else {
            onAlertPress?.(item);
          }
        }}
        activeOpacity={0.7}
        disabled={selectionMode && !canSelect}
      >
        <View style={{ paddingHorizontal: spacing[4] as number }}>
          <HStack gap={3 as any} alignItems="center">
            {selectionMode && (
              <Animated.View
                style={{
                  opacity: selectionBarAnimation,
                  transform: [{
                    scale: selectionBarAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  }],
                }}
              >
                <Checkbox
                  value={isSelected}
                  onValueChange={() => toggleAlertSelection(item.id)}
                  disabled={!canSelect}
                />
              </Animated.View>
            )}
            
            <View style={{ flex: 1, opacity: selectionMode && !canSelect ? 0.5 : 1 }}>
              <AlertCardOptimized
                alert={alertToListItem(item)}
                index={index}
                onPress={() => {
                  if (!selectionMode) {
                    onAlertPress?.(item);
                  }
                }}
                onAcknowledge={onAcknowledge}
                onResolve={onResolve}
                canAcknowledge={canAcknowledge && !selectionMode}
                canResolve={canResolve && !selectionMode}
                isHighlighted={highlightedAlertId === item.id || isSelected}
              />
            </View>
          </HStack>
        </View>
      </TouchableOpacity>
    );
  }, [
    spacing,
    selectionMode,
    selectedAlerts,
    selectionBarAnimation,
    onAlertPress,
    onAcknowledge,
    onResolve,
    canAcknowledge,
    canResolve,
    highlightedAlertId,
    toggleAlertSelection,
  ]);

  // Item separator
  const ItemSeparator = useCallback(() => (
    <View style={{ height: spacing[3] as number }} />
  ), [spacing]);

  // Header component with selection controls
  const ListHeaderComponent = useCallback(() => (
    <VStack gap={spacing[3] as any}>
      <View style={{ height: spacing[2] as number }} />
      
      {/* Selection Mode Toggle */}
      <View style={{ paddingHorizontal: spacing[4] as number }}>
        <Button
          variant="ghost"
          size="sm"
          onPress={toggleSelectionMode}
          leftIcon={<Symbol name={selectionMode ? "xmark.circle" : "checkmark.circle"} size={16} />}
        >
          {selectionMode ? 'Cancel Selection' : 'Select Multiple'}
        </Button>
      </View>
      
      {/* Selection Controls */}
      {selectionMode && (
        <Animated.View
          style={{
            opacity: selectionBarAnimation,
            transform: [{
              translateY: selectionBarAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
          }}
        >
          <Card style={{ marginHorizontal: spacing[4] as number }}>
            <VStack gap={spacing[3] as any} p={spacing[3]}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text weight="semibold">
                  {selectedAlerts.size} selected
                </Text>
                <HStack gap={spacing[2] as any}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={selectAll}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={clearSelection}
                    disabled={selectedAlerts.size === 0}
                  >
                    Clear
                  </Button>
                </HStack>
              </HStack>
              
              {selectedAlerts.size > 0 && (
                <HStack gap={spacing[2] as any}>
                  {canAcknowledge && (
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={handleBatchAcknowledge}
                      isLoading={isProcessing}
                      style={{ flex: 1 }}
                    >
                      Acknowledge ({selectedAlerts.size})
                    </Button>
                  )}
                  {canResolve && (
                    <Button
                      variant="default"
                      size="sm"
                      onPress={handleBatchResolve}
                      isLoading={isProcessing}
                      style={{ flex: 1 }}
                    >
                      Resolve ({selectedAlerts.size})
                    </Button>
                  )}
                </HStack>
              )}
            </VStack>
          </Card>
        </Animated.View>
      )}
    </VStack>
  ), [
    spacing,
    selectionMode,
    selectedAlerts,
    selectionBarAnimation,
    toggleSelectionMode,
    selectAll,
    clearSelection,
    canAcknowledge,
    canResolve,
    handleBatchAcknowledge,
    handleBatchResolve,
    isProcessing,
  ]);

  // Footer component
  const ListFooterComponent = useCallback(() => (
    <View style={{ height: spacing[8] as number }} />
  ), [spacing]);

  // Empty component
  const ListEmptyComponent = useCallback(() => {
    if (isLoading) {
      return <LoadingView message="Loading alerts..." />;
    }

    return (
      <View style={{ 
        paddingHorizontal: spacing[4] as number,
        paddingTop: spacing[8] as number,
      }}>
        <EmptyState
          icon={<Symbol name="bell.slash" size={48} color="#6B7280" />}
          title="No alerts found"
          description={
            searchQuery || hasFilters
              ? 'Try adjusting your filters'
              : 'All alerts have been handled'
          }
        />
      </View>
    );
  }, [isLoading, spacing, searchQuery, hasFilters]);

  // Refresh control
  const refreshControl = useMemo(() => {
    if (!onRefresh) return undefined;
    
    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={theme.primary}
        colors={[theme.primary]}
      />
    );
  }, [refreshing, onRefresh, theme.primary]);

  // Estimated item size for better performance
  const estimatedItemSize = selectionMode ? 140 : 120;

  return (
    <FlashList
      data={alerts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      refreshControl={refreshControl}
      estimatedItemSize={estimatedItemSize}
      // Performance optimizations
      removeClippedSubviews={true}
      drawDistance={250}
      contentContainerStyle={{
        backgroundColor: theme.background,
      }}
    />
  );
}