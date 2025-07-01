import React, { useState } from 'react';
import { TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text } from '@/components/universal/typography';
import { VStack, HStack } from '@/components/universal/layout';
import { Card } from '@/components/universal/display';
import { Button } from '@/components/universal/interaction';
import { Symbol } from '@/components/universal/display/Symbols';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/universal/overlay';
import { useOrganizationHospitals, useSelectHospital } from '@/hooks/healthcare';
import { useSpacing } from '@/lib/stores/spacing-store';
import { useTheme } from '@/lib/theme/provider';
import { useAuth } from '@/hooks/useAuth';
import { useHospitalStore } from '@/lib/stores/hospital-store';
import { haptic } from '@/lib/ui/haptics';
import { showSuccessAlert, showErrorAlert } from '@/lib/core/alert';
import Animated, { FadeIn } from 'react-native-reanimated';

interface HospitalSwitcherProps {
  compact?: boolean;
  showLabel?: boolean;
  onSwitch?: (hospitalId: string) => void;
}

const AnimatedView = Animated.View;

export function HospitalSwitcher({ 
  compact = false, 
  showLabel = true,
  onSwitch 
}: HospitalSwitcherProps) {
  const { spacing } = useSpacing();
  const theme = useTheme();
  const { user } = useAuth();
  const { currentHospital, setCurrentHospital } = useHospitalStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  
  const organizationId = user?.organizationId;
  
  // Fetch hospitals for the organization using enhanced hook
  const hospitalsQuery = useOrganizationHospitals(organizationId, {
    enabled: !!organizationId,
  });
  
  const hospitals = (hospitalsQuery as any).data?.hospitals || [];
  const isLoading = (hospitalsQuery as any).isLoading || false;
  
  // Switch hospital mutation using enhanced hook
  const switchHospitalMutation = useSelectHospital();
  
  const handleSelectHospital = async (hospitalId: string) => {
    if (hospitalId === currentHospital?.id) {
      setIsOpen(false);
      return;
    }
    
    setIsSwitching(true);
    
    try {
      const result = await (switchHospitalMutation as any).mutateAsync({ hospitalId });
      setCurrentHospital(result.hospital);
      setIsOpen(false);
      showSuccessAlert('Success', `Switched to ${result.hospital.name}`);
      haptic('success');
      
      if (onSwitch) {
        onSwitch(result.hospital.id);
      }
      
      // Refresh the page to reload with new hospital context
      if (Platform.OS === 'web') {
        window.location.reload();
      }
    } catch (error: any) {
      showErrorAlert('Error', error.message || 'Failed to switch hospital');
      haptic('error');
    } finally {
      setIsSwitching(false);
    }
  };
  
  // Don't show if only one hospital or no hospitals
  if (!organizationId || hospitals.length <= 1) {
    return null;
  }
  
  const currentHospitalData = hospitals.find(h => h.id === currentHospital?.id) || hospitals[0];
  
  return (
    <>
      <TouchableOpacity
        onPress={() => {
          haptic('light');
          setIsOpen(true);
        }}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Card 
          className={`p-3 ${compact ? 'px-3 py-2' : ''} hover:bg-muted transition-colors`}
          style={{
            shadowColor: Platform.OS === 'android' ? '#000' : 'transparent',
            shadowOpacity: Platform.OS === 'android' ? 0.1 : 0,
            elevation: Platform.OS === 'android' ? 2 : 0,
          }}
        >
          <HStack 
            gap={spacing[2] as any} 
            align="center"
            style={{
              overflow: 'visible', // Fix dropdown icon cutoff
            }}
          >
            <Symbol name="building.2" size={compact ? "xs" : "sm"} color={theme.primary} />
            {!compact && showLabel && (
              <VStack gap={0} style={{ flex: 1 }}>
                <Text size="xs" colorTheme="mutedForeground">Current Hospital</Text>
                <Text size="sm" weight="medium" numberOfLines={1}>
                  {currentHospitalData?.name || 'Select Hospital'}
                </Text>
              </VStack>
            )}
            {compact && (
              <Text size="sm" weight="medium">
                {currentHospitalData?.code || 'Select'}
              </Text>
            )}
            <Symbol 
              name="chevron.down" 
              size="xs" 
              color={theme.mutedForeground} 
              style={{
                marginLeft: spacing[1],
              }}
            />
          </HStack>
        </Card>
      </TouchableOpacity>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Hospital</DialogTitle>
          </DialogHeader>
          <VStack gap={spacing[2] as any}>
          <Text size="sm" colorTheme="mutedForeground" className="mb-2">
            Select a hospital to switch to:
          </Text>
          
          <ScrollView style={{ maxHeight: 400 }}>
            <VStack gap={spacing[2] as any}>
              {hospitals.map((hospital, index) => {
                const isSelected = hospital.id === currentHospital?.id;
                
                return (
                  <AnimatedView 
                    key={hospital.id}
                    entering={FadeIn.delay(index * 50)}
                  >
                    <TouchableOpacity
                      onPress={() => handleSelectHospital(hospital.id)}
                      disabled={isSwitching}
                    >
                      <Card 
                        className={`p-4 ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border'
                        } ${isSwitching ? 'opacity-50' : ''}`}
                      >
                        <HStack align="center" justify="between">
                          <VStack gap={spacing[1] as any} className="flex-1">
                            <HStack align="center" gap={spacing[2] as any}>
                              <Text size="base" weight={isSelected ? 'semibold' : 'medium'}>
                                {hospital.name}
                              </Text>
                              {hospital.isDefault && (
                                <Text size="xs" className="text-primary bg-primary/10 px-2 py-0.5 rounded">
                                  Default
                                </Text>
                              )}
                            </HStack>
                            <Text size="xs" colorTheme="mutedForeground">
                              Code: {hospital.code}
                            </Text>
                          </VStack>
                          {isSelected && (
                            <Symbol name="checkmark" size="sm" color={theme.primary} />
                          )}
                        </HStack>
                      </Card>
                    </TouchableOpacity>
                  </AnimatedView>
                );
              })}
            </VStack>
          </ScrollView>
          
          <HStack gap={spacing[2] as any} className="mt-4">
            <Button
              variant="outline"
              onPress={() => setIsOpen(false)}
              fullWidth
              disabled={isSwitching}
            >
              Cancel
            </Button>
          </HStack>
        </VStack>
        </DialogContent>
      </Dialog>
    </>
  );
}