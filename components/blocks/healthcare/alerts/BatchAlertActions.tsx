import * as React from 'react';
import { View, Animated, Platform } from 'react-native';
import { VStack, HStack } from '@/components/universal/layout';
import { Text } from '@/components/universal/typography';
import { Button } from '@/components/universal/interaction';
import { Badge } from '@/components/universal/display';
import { Checkbox } from '@/components/universal/form';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { showErrorAlert, showSuccessAlert } from '@/lib/core/alert';
import { Symbol } from '@/components/universal/display/Symbols';
import { useShadow } from '@/hooks/useShadow';

interface BatchAlertActionsProps {
  visible: boolean;
  selectedCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchAcknowledge: () => Promise<void>;
  onBatchResolve?: () => Promise<void>;
  onCancel: () => void;
  canResolve?: boolean;
}

export function BatchAlertActions({
  visible,
  selectedCount,
  isAllSelected,
  onSelectAll,
  onDeselectAll,
  onBatchAcknowledge,
  onBatchResolve,
  onCancel,
  canResolve = false,
}: BatchAlertActionsProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const shadowLg = useShadow({ size: 'lg' });
  const [isAcknowledging, setIsAcknowledging] = React.useState(false);
  const [isResolving, setIsResolving] = React.useState(false);
  
  // Animation for slide-up effect
  const slideAnimation = React.useRef(new Animated.Value(100)).current;
  const fadeAnimation = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnimation, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnimation, fadeAnimation]);
  
  const handleBatchAcknowledge = async () => {
    if (selectedCount === 0) return;
    
    haptic('medium');
    setIsAcknowledging(true);
    
    try {
      await onBatchAcknowledge();
      showSuccessAlert(
        'Alerts Acknowledged',
        `Successfully acknowledged ${selectedCount} alert${selectedCount > 1 ? 's' : ''}`
      );
      onCancel(); // Clear selection
    } catch (error) {
      showErrorAlert('Failed to acknowledge', 'Please try again');
    } finally {
      setIsAcknowledging(false);
    }
  };
  
  const handleBatchResolve = async () => {
    if (!onBatchResolve || selectedCount === 0) return;
    
    haptic('medium');
    setIsResolving(true);
    
    try {
      await onBatchResolve();
      showSuccessAlert(
        'Alerts Resolved',
        `Successfully resolved ${selectedCount} alert${selectedCount > 1 ? 's' : ''}`
      );
      onCancel(); // Clear selection
    } catch (error) {
      showErrorAlert('Failed to resolve', 'Please try again');
    } finally {
      setIsResolving(false);
    }
  };
  
  if (!visible) return null;
  
  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          opacity: fadeAnimation,
          zIndex: 998,
        }}
        onTouchEnd={onCancel}
      />
      
      {/* Action Bar */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          transform: [{ translateY: slideAnimation }],
          zIndex: 999,
          ...shadowLg,
          ...(Platform.OS === 'web' ? { position: 'fixed' } : {}),
        }}
      >
        <VStack gap={spacing[3] as any} p={spacing[4]}>
          {/* Selection Info */}
          <HStack justifyContent="space-between" alignItems="center">
            <HStack gap={spacing[3] as any} alignItems="center">
              <Button
                variant="ghost"
                size="icon"
                onPress={onCancel}
              >
                <Symbol name="xmark" size={20} />
              </Button>
              <VStack gap={spacing[1] as any}>
                <Text weight="semibold">
                  {selectedCount} alert{selectedCount !== 1 ? 's' : ''} selected
                </Text>
                <Button
                  variant="link"
                  size="sm"
                  onPress={isAllSelected ? onDeselectAll : onSelectAll}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {isAllSelected ? 'Deselect all' : 'Select all'}
                </Button>
              </VStack>
            </HStack>
            
            <Badge variant="secondary">
              Batch Mode
            </Badge>
          </HStack>
          
          {/* Action Buttons */}
          <HStack gap={spacing[2] as any}>
            <Button
              onPress={handleBatchAcknowledge}
              variant="outline"
              fullWidth
              isLoading={isAcknowledging}
              disabled={selectedCount === 0}
            >
              <HStack gap={spacing[2] as any} alignItems="center">
                <Symbol name="checkmark.circle" size={16} />
                <Text>Acknowledge All</Text>
              </HStack>
            </Button>
            
            {canResolve && onBatchResolve && (
              <Button
                onPress={handleBatchResolve}
                variant="default"
                fullWidth
                isLoading={isResolving}
                disabled={selectedCount === 0}
              >
                <HStack gap={spacing[2] as any} alignItems="center">
                  <Symbol name="checkmark.circle.fill" size={16} />
                  <Text>Resolve All</Text>
                </HStack>
              </Button>
            )}
          </HStack>
          
          {/* Default Values Notice */}
          <VStack gap={spacing[1] as any}>
            <Text size="xs" colorTheme="mutedForeground" style={{ textAlign: 'center' }}>
              This action will affect all selected alerts
            </Text>
            <Text size="xs" colorTheme="mutedForeground" style={{ textAlign: 'center' }}>
              Default: Urgency maintained, Responding now
            </Text>
          </VStack>
        </VStack>
      </Animated.View>
    </>
  );
}