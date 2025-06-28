import React, { useCallback, useMemo, memo } from 'react';
import { View, ViewToken } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { AlertCardOptimized } from './AlertCardOptimized';
import { EmptyState } from '@/components/universal/feedback/EmptyState';
import { LoadingView } from '@/components/universal/feedback/LoadingView';
import { RefreshControl } from 'react-native';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { log } from '@/lib/core/debug/logger';
import type { Alert, AlertListItem } from '@/types/alert';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { startMeasure, endMeasure, useMeasureRender } from '@/lib/performance/monitor';

interface AlertListVirtualizedProps {
  alerts: Alert[];
  isLoading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onAlertPress?: (alert: Alert) => void;
  onAcknowledge?: (alertId: string) => Promise<void>;
  onResolve?: (alertId: string) => Promise<void>;
  canAcknowledge?: boolean;
  canResolve?: boolean;
  highlightedAlertId?: string | null;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
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

// Memoized alert card wrapper
const MemoizedAlertCard = memo(({ 
  alert, 
  index, 
  onPress, 
  onAcknowledge, 
  onResolve,
  canAcknowledge,
  canResolve,
  isHighlighted 
}: {
  alert: Alert;
  index: number;
  onPress?: () => void;
  onAcknowledge?: (alertId: string) => Promise<void>;
  onResolve?: (alertId: string) => Promise<void>;
  canAcknowledge?: boolean;
  canResolve?: boolean;
  isHighlighted?: boolean;
}) => {
  const alertListItem = alertToListItem(alert);
  
  return (
    <AlertCardOptimized
      alert={alertListItem}
      index={index}
      onPress={onPress}
      onAcknowledge={onAcknowledge}
      onResolve={onResolve}
      canAcknowledge={canAcknowledge}
      canResolve={canResolve}
      isHighlighted={isHighlighted}
    />
  );
});

export function AlertListVirtualized({
  alerts,
  isLoading = false,
  refreshing = false,
  onRefresh,
  onAlertPress,
  onAcknowledge,
  onResolve,
  canAcknowledge = false,
  canResolve = false,
  highlightedAlertId,
  onViewableItemsChanged,
  searchQuery,
  hasFilters,
}: AlertListVirtualizedProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  
  // Measure component render performance
  useMeasureRender('AlertListVirtualized');

  // Extract key for FlashList
  const keyExtractor = useCallback((item: Alert) => item.id, []);

  // Render individual alert item
  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<Alert>) => {
    return (
      <View style={{ paddingHorizontal: spacing[4] as number }}>
        <MemoizedAlertCard
          alert={item}
          index={index}
          onPress={() => onAlertPress?.(item)}
          onAcknowledge={onAcknowledge}
          onResolve={onResolve}
          canAcknowledge={canAcknowledge}
          canResolve={canResolve}
          isHighlighted={highlightedAlertId === item.id}
        />
      </View>
    );
  }, [
    spacing,
    onAlertPress,
    onAcknowledge,
    onResolve,
    canAcknowledge,
    canResolve,
    highlightedAlertId,
  ]);

  // Item separator
  const ItemSeparator = useCallback(() => (
    <View style={{ height: spacing[3] as number }} />
  ), [spacing]);

  // Header component
  const ListHeaderComponent = useCallback(() => (
    <View style={{ height: spacing[2] as number }} />
  ), [spacing]);

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[4] as number }}>
        <EmptyState
          variant="no-alerts"
          title={searchQuery || hasFilters ? "No alerts found" : "All Clear!"}
          description={
            searchQuery || hasFilters
              ? 'Try adjusting your filters'
              : 'No active alerts at the moment'
          }
          fullHeight
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
  const estimatedItemSize = 120;
  const separatorHeight = spacing[3] as number;

  // Calculate exact item layout for optimal performance
  const getItemLayout = useCallback((data: Alert[] | null | undefined, index: number) => {
    // Each item has the same height + separator
    const length = estimatedItemSize;
    const offset = index * (estimatedItemSize + separatorHeight) + (spacing[2] as number); // Add header offset
    
    return { length, offset, index };
  }, [estimatedItemSize, separatorHeight, spacing]);

  // Log performance metrics
  const onLoad = useCallback(() => {
    endMeasure('alert-list-render', {
      itemCount: alerts.length,
      estimatedItemSize,
    });
    
    log.debug('AlertList loaded', 'ALERTS', {
      itemCount: alerts.length,
      estimatedItemSize,
    });
  }, [alerts.length, estimatedItemSize]);
  
  // Start performance measurement when data changes
  React.useEffect(() => {
    if (alerts.length > 0) {
      startMeasure('alert-list-render');
    }
  }, [alerts.length]);

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
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
        waitForInteraction: false,
      }}
      onLoad={onLoad}
      // Performance optimizations
      removeClippedSubviews={true}
      // Draw distance for smoother scrolling
      drawDistance={250}
      // Maintain visible content position on iOS
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
      // Optimize for large lists
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={21}
      // Content container style
      contentContainerStyle={{
        backgroundColor: theme.background,
      }}
    />
  );
}