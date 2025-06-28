import React, { useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { AlertListVirtualized } from '../AlertListVirtualized';
import { BatchAlertActions } from './BatchAlertActions';
import { HStack } from '@/components/universal/layout';
import { Text } from '@/components/universal/typography';
import { Button } from '@/components/universal/interaction';
import { Checkbox } from '@/components/universal/form';
import { Card } from '@/components/universal/display';
import { Symbol } from '@/components/universal/display/Symbols';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { api } from '@/lib/api/trpc';
import type { Alert } from '@/types/alert';

interface AlertListWithBatchActionsProps {
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
  searchQuery?: string;
  hasFilters?: boolean;
}

export function AlertListWithBatchActions({
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
  searchQuery,
  hasFilters,
}: AlertListWithBatchActionsProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const [batchMode, setBatchMode] = useState(false);
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());
  
  // Batch mutations
  const batchAcknowledgeMutation = api.healthcare.batchAcknowledgeAlerts.useMutation();
  const batchResolveMutation = api.healthcare.batchResolveAlerts.useMutation();
  
  // Toggle batch mode
  const toggleBatchMode = useCallback(() => {
    haptic('light');
    setBatchMode(prev => {
      if (prev) {
        // Exiting batch mode - clear selection
        setSelectedAlertIds(new Set());
      }
      return !prev;
    });
  }, []);
  
  // Toggle alert selection
  const toggleAlertSelection = useCallback((alertId: string) => {
    haptic('light');
    setSelectedAlertIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  }, []);
  
  // Select all alerts
  const selectAll = useCallback(() => {
    haptic('medium');
    const activeAlerts = alerts.filter(a => a.status === 'active');
    setSelectedAlertIds(new Set(activeAlerts.map(a => a.id)));
  }, [alerts]);
  
  // Deselect all alerts
  const deselectAll = useCallback(() => {
    haptic('light');
    setSelectedAlertIds(new Set());
  }, []);
  
  // Handle batch acknowledge
  const handleBatchAcknowledge = useCallback(async () => {
    const alertIds = Array.from(selectedAlertIds);
    await batchAcknowledgeMutation.mutateAsync({ 
      alertIds,
      urgencyAssessment: 'maintain',
      responseAction: 'responding',
      estimatedResponseTime: 5,
    });
    setSelectedAlertIds(new Set());
    setBatchMode(false);
    onRefresh?.();
  }, [selectedAlertIds, batchAcknowledgeMutation, onRefresh]);
  
  // Handle batch resolve
  const handleBatchResolve = useCallback(async () => {
    const alertIds = Array.from(selectedAlertIds);
    await batchResolveMutation.mutateAsync({ 
      alertIds,
      resolution: 'Batch resolved by healthcare staff',
    });
    setSelectedAlertIds(new Set());
    setBatchMode(false);
    onRefresh?.();
  }, [selectedAlertIds, batchResolveMutation, onRefresh]);
  
  // Cancel batch mode
  const cancelBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedAlertIds(new Set());
  }, []);
  
  // Check if all active alerts are selected
  const isAllSelected = useMemo(() => {
    const activeAlerts = alerts.filter(a => a.status === 'active');
    if (activeAlerts.length === 0) return false;
    return activeAlerts.every(alert => selectedAlertIds.has(alert.id));
  }, [alerts, selectedAlertIds]);
  
  // Modified alert press handler
  const handleAlertPress = useCallback((alert: Alert) => {
    if (batchMode && alert.status === 'active') {
      toggleAlertSelection(alert.id);
    } else {
      onAlertPress?.(alert);
    }
  }, [batchMode, onAlertPress, toggleAlertSelection]);
  
  // Enhanced alert list with selection UI
  const EnhancedAlertList = useMemo(() => {
    // If not in batch mode, return regular list
    if (!batchMode) {
      return (
        <AlertListVirtualized
          alerts={alerts}
          isLoading={isLoading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onAlertPress={handleAlertPress}
          onAcknowledge={onAcknowledge}
          onResolve={onResolve}
          canAcknowledge={canAcknowledge}
          canResolve={canResolve}
          highlightedAlertId={highlightedAlertId}
          searchQuery={searchQuery}
          hasFilters={hasFilters}
        />
      );
    }
    
    // Custom render for batch mode with checkboxes
    return (
      <View style={{ flex: 1 }}>
        {/* Selection header */}
        <Card style={{ margin: spacing[4] as number, marginBottom: spacing[2] as number }}>
          <TouchableOpacity onPress={isAllSelected ? deselectAll : selectAll}>
            <HStack p={spacing[3]} gap={spacing[3] as any} alignItems="center">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={isAllSelected ? deselectAll : selectAll}
              />
              <Text weight="medium">
                {isAllSelected ? 'Deselect all' : 'Select all active alerts'}
              </Text>
            </HStack>
          </TouchableOpacity>
        </Card>
        
        {/* Alert list with checkboxes */}
        <View style={{ flex: 1 }}>
          {alerts.map((alert, index) => (
            <TouchableOpacity
              key={alert.id}
              onPress={() => alert.status === 'active' && toggleAlertSelection(alert.id)}
              activeOpacity={0.7}
              style={{ paddingHorizontal: spacing[4] as number }}
            >
              <HStack alignItems="center" gap={spacing[2] as any}>
                {alert.status === 'active' && (
                  <Checkbox
                    checked={selectedAlertIds.has(alert.id)}
                    onCheckedChange={() => toggleAlertSelection(alert.id)}
                  />
                )}
                <View style={{ flex: 1, opacity: alert.status !== 'active' ? 0.6 : 1 }}>
                  {/* Render alert card here - simplified for now */}
                  <Card style={{ marginVertical: spacing[1] as number }}>
                    <HStack p={spacing[3]} justifyContent="space-between" alignItems="center">
                      <View>
                        <Text weight="semibold">Room {alert.roomNumber}</Text>
                        <Text size="sm" colorTheme="mutedForeground">{alert.alertType}</Text>
                      </View>
                      <Text size="sm" colorTheme="mutedForeground">{alert.status}</Text>
                    </HStack>
                  </Card>
                </View>
              </HStack>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [
    alerts,
    batchMode,
    selectedAlertIds,
    isAllSelected,
    isLoading,
    refreshing,
    onRefresh,
    handleAlertPress,
    onAcknowledge,
    onResolve,
    canAcknowledge,
    canResolve,
    highlightedAlertId,
    searchQuery,
    hasFilters,
    spacing,
    selectAll,
    deselectAll,
    toggleAlertSelection,
  ]);
  
  return (
    <View style={{ flex: 1 }}>
      {/* Batch Mode Toggle */}
      {canAcknowledge && !batchMode && alerts.some(a => a.status === 'active') && (
        <View style={{ paddingHorizontal: spacing[4] as number, paddingTop: spacing[2] as number }}>
          <Button
            variant="outline"
            size="sm"
            onPress={toggleBatchMode}
            fullWidth
          >
            <HStack gap={spacing[2] as any} alignItems="center">
              <Symbol name="checkmark.square" size={16} />
              <Text>Select Multiple</Text>
            </HStack>
          </Button>
        </View>
      )}
      
      {/* Alert List */}
      {EnhancedAlertList}
      
      {/* Batch Actions */}
      <BatchAlertActions
        visible={batchMode}
        selectedCount={selectedAlertIds.size}
        isAllSelected={isAllSelected}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onBatchAcknowledge={handleBatchAcknowledge}
        onBatchResolve={canResolve ? handleBatchResolve : undefined}
        onCancel={cancelBatchMode}
        canResolve={canResolve}
      />
    </View>
  );
}