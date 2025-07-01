import * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/universal/overlay';
import { VStack, HStack } from '@/components/universal/layout';
import { Text } from '@/components/universal/typography';
import { Button } from '@/components/universal/interaction';
import { Select, Input, TextArea } from '@/components/universal/form';
import { Badge } from '@/components/universal/display';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { showErrorAlert } from '@/lib/core/alert';
import { Symbol } from '@/components/universal/display/Symbols';
import type { Alert } from '@/types/alert';
import type { UrgencyAssessment, ResponseAction } from '@/types/healthcare';

interface AlertAcknowledgeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  alert: Alert;
  onAcknowledge: (data: {
    alertId: string;
    urgencyAssessment: 'maintain' | 'increase' | 'decrease';
    responseAction: 'responding' | 'delayed' | 'delegating' | 'monitoring';
    estimatedResponseTime?: number;
    delegateTo?: string;
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  availableStaff?: Array<{ id: string; name: string; role: string }>;
}

const URGENCY_OPTIONS = [
  { value: 'maintain', label: 'Maintain Current Level' },
  { value: 'increase', label: 'Increase Urgency' },
  { value: 'decrease', label: 'Decrease Urgency' },
];

const RESPONSE_OPTIONS = [
  { value: 'responding', label: 'Responding Now' },
  { value: 'delayed', label: 'Responding with Delay' },
  { value: 'delegating', label: 'Delegating to Another' },
  { value: 'monitoring', label: 'Monitoring Remotely' },
];

export function AlertAcknowledgeDialog({
  isOpen,
  onClose,
  alert,
  onAcknowledge,
  isLoading = false,
  availableStaff = [],
}: AlertAcknowledgeDialogProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  
  // Form state
  const [urgencyAssessment, setUrgencyAssessment] = useState<'maintain' | 'increase' | 'decrease'>('maintain');
  const [responseAction, setResponseAction] = useState<'responding' | 'delayed' | 'delegating' | 'monitoring'>('responding');
  const [estimatedResponseTime, setEstimatedResponseTime] = useState('5');
  const [delegateTo, setDelegateTo] = useState('');
  const [notes, setNotes] = useState('');
  
  // Validation
  const needsResponseTime = responseAction === 'responding' || responseAction === 'delayed';
  const needsDelegateTo = responseAction === 'delegating';
  
  const isValid = () => {
    if (needsResponseTime && (!estimatedResponseTime || parseInt(estimatedResponseTime) < 1)) {
      return false;
    }
    if (needsDelegateTo && !delegateTo) {
      return false;
    }
    return true;
  };
  
  const handleSubmit = async () => {
    if (!isValid()) {
      showErrorAlert('Invalid Input', 'Please fill in all required fields');
      return;
    }
    
    haptic('medium');
    
    const data = {
      alertId: alert.id,
      urgencyAssessment,
      responseAction,
      ...(needsResponseTime && { estimatedResponseTime: parseInt(estimatedResponseTime) }),
      ...(needsDelegateTo && { delegateTo }),
      ...(notes && { notes }),
    };
    
    await onAcknowledge(data);
    onClose();
  };
  
  const handleQuickAcknowledge = async () => {
    haptic('medium');
    
    // Quick acknowledge with defaults
    const data = {
      alertId: alert.id,
      urgencyAssessment: 'maintain' as const,
      responseAction: 'responding' as const,
      estimatedResponseTime: 5,
    };
    
    await onAcknowledge(data);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={{ maxWidth: 500 }}>
        <DialogHeader>
          <DialogTitle>Acknowledge Alert</DialogTitle>
          <DialogDescription>
            Provide details about your response to this alert
          </DialogDescription>
        </DialogHeader>
        
        <VStack gap={spacing[4] as any} p={spacing[4]}>
          {/* Alert Summary */}
          <VStack gap={spacing[2] as any}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text weight="semibold">Room {alert.roomNumber}</Text>
              <Badge variant="destructive" size="sm">
                <Text size="sm">Level {alert.urgencyLevel}</Text>
              </Badge>
            </HStack>
            <Text size="sm" colorTheme="mutedForeground">{alert.alertType}</Text>
            <Text size="sm">{alert.description}</Text>
          </VStack>
          
          {/* Form Fields */}
          <VStack gap={spacing[3] as any}>
            {/* Urgency Assessment */}
            <VStack gap={spacing[1] as any}>
              <Text size="sm" weight="medium">Urgency Assessment</Text>
              <Select
                value={urgencyAssessment}
                onValueChange={(value) => setUrgencyAssessment(value as any)}
                options={URGENCY_OPTIONS}
                placeholder="Select urgency assessment"
              />
            </VStack>
            
            {/* Response Action */}
            <VStack gap={spacing[1] as any}>
              <Text size="sm" weight="medium">Response Action</Text>
              <Select
                value={responseAction}
                onValueChange={(value) => setResponseAction(value as any)}
                options={RESPONSE_OPTIONS}
                placeholder="Select response action"
              />
            </VStack>
            
            {/* Estimated Response Time */}
            {needsResponseTime && (
              <VStack gap={spacing[1] as any}>
                <Text size="sm" weight="medium">
                  Estimated Response Time <Text size="xs" colorTheme="destructive">*</Text>
                </Text>
                <Input
                  value={estimatedResponseTime}
                  onChangeText={setEstimatedResponseTime}
                  placeholder="Minutes"
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text size="xs" colorTheme="mutedForeground">
                  How many minutes until you can respond?
                </Text>
              </VStack>
            )}
            
            {/* Delegate To */}
            {needsDelegateTo && (
              <VStack gap={spacing[1] as any}>
                <Text size="sm" weight="medium">
                  Delegate To <Text size="xs" colorTheme="destructive">*</Text>
                </Text>
                <Select
                  value={delegateTo}
                  onValueChange={setDelegateTo}
                  options={availableStaff.map(staff => ({
                    value: staff.id,
                    label: `${staff.name} (${staff.role})`,
                  }))}
                  placeholder="Select staff member"
                />
                {availableStaff.length === 0 && (
                  <Text size="xs" colorTheme="destructive">
                    No available staff to delegate to
                  </Text>
                )}
              </VStack>
            )}
            
            {/* Notes */}
            <VStack gap={spacing[1] as any}>
              <Text size="sm" weight="medium">Notes (Optional)</Text>
              <TextArea
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes..."
                maxLength={500}
                numberOfLines={3}
              />
              <Text size="xs" colorTheme="mutedForeground">
                {notes.length}/500 characters
              </Text>
            </VStack>
          </VStack>
        </VStack>
        
        <DialogFooter>
          <HStack gap={spacing[2] as any}>
            <Button
              variant="ghost"
              onPress={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onPress={handleQuickAcknowledge}
              disabled={isLoading}
            >
              <HStack gap={spacing[1] as any} alignItems="center">
                <Symbol name="bolt" size={16} />
                <Text>Quick Acknowledge</Text>
              </HStack>
            </Button>
            <Button
              onPress={handleSubmit}
              isLoading={isLoading}
              disabled={!isValid() || isLoading}
            >
              Acknowledge
            </Button>
          </HStack>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}