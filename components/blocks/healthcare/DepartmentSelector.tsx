import React, { useState, useCallback } from 'react';
import { 
  View, 
  ScrollView, 
  Pressable, 
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import {
  VStack,
  HStack,
  Text,
  GlassCard,
  Badge,
  Button,
  Symbol,
  Container,
} from '@/components/universal';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import { useShadow } from '@/hooks/useShadow';
import { useResponsive } from '@/hooks/responsive';
import Animated, { 
  FadeIn, 
  FadeOut,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

// Department categories for better organization
const DEPARTMENT_CATEGORIES = {
  'Healthcare': [
    { value: 'emergency', label: 'Emergency', icon: '🚨', color: '#ef4444' },
    { value: 'icu', label: 'ICU', icon: '🏥', color: '#dc2626' },
    { value: 'cardiology', label: 'Cardiology', icon: '❤️', color: '#e11d48' },
    { value: 'pediatrics', label: 'Pediatrics', icon: '👶', color: '#ec4899' },
    { value: 'surgery', label: 'Surgery', icon: '🔪', color: '#db2777' },
    { value: 'radiology', label: 'Radiology', icon: '📷', color: '#7c3aed' },
    { value: 'pharmacy', label: 'Pharmacy', icon: '💊', color: '#2563eb' },
    { value: 'laboratory', label: 'Laboratory', icon: '🔬', color: '#0ea5e9' },
    { value: 'maternity', label: 'Maternity', icon: '🤰', color: '#ec4899' },
    { value: 'oncology', label: 'Oncology', icon: '🎗️', color: '#8b5cf6' },
    { value: 'neurology', label: 'Neurology', icon: '🧠', color: '#6366f1' },
    { value: 'orthopedics', label: 'Orthopedics', icon: '🦴', color: '#3b82f6' },
    { value: 'psychiatry', label: 'Psychiatry', icon: '🧘', color: '#06b6d4' },
    { value: 'general_medicine', label: 'General Medicine', icon: '👨‍⚕️', color: '#10b981' },
  ],
  'Emergency Response': [
    { value: 'dispatch_center', label: 'Dispatch Center', icon: '📞', color: '#f59e0b' },
    { value: 'emergency_response', label: 'Emergency Response', icon: '🚑', color: '#ef4444' },
    { value: 'fire_dispatch', label: 'Fire Dispatch', icon: '🚒', color: '#dc2626' },
    { value: 'police_dispatch', label: 'Police Dispatch', icon: '🚓', color: '#1e40af' },
    { value: 'medical_dispatch', label: 'Medical Dispatch', icon: '🚁', color: '#7c2d12' },
  ],
  'Support': [
    { value: 'administration', label: 'Administration', icon: '📋', color: '#6b7280' },
    { value: 'it_support', label: 'IT Support', icon: '💻', color: '#4b5563' },
    { value: 'facilities', label: 'Facilities', icon: '🏢', color: '#374151' },
  ],
};

// Routing rules based on alert type
const ROUTING_RULES = {
  cardiac: ['cardiology', 'icu', 'emergency'],
  respiratory: ['icu', 'emergency', 'general_medicine'],
  emergency: ['emergency', 'icu'],
  fall: ['emergency', 'orthopedics', 'general_medicine'],
  medication: ['pharmacy', 'general_medicine'],
  security: ['police_dispatch', 'administration'],
  fire: ['fire_dispatch', 'emergency_response'],
};

interface DepartmentSelectorProps {
  value?: string;
  onChange: (department: string) => void;
  alertType?: string;
  required?: boolean;
  error?: string;
}

export function DepartmentSelector({
  value,
  onChange,
  alertType,
  required = false,
  error,
}: DepartmentSelectorProps) {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const shadowMd = useShadow({ size: 'md' });
  const { isMobile } = useResponsive();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get recommended departments based on alert type
  const recommendedDepartments = alertType && ROUTING_RULES[alertType as keyof typeof ROUTING_RULES] || [];
  
  // Flatten all departments for search
  const allDepartments = Object.values(DEPARTMENT_CATEGORIES).flat();
  
  // Find selected department info
  const selectedDepartment = allDepartments.find(dept => dept.value === value);
  
  // Filter departments based on search
  const filteredDepartments = searchQuery 
    ? allDepartments.filter(dept => 
        dept.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleSelect = useCallback((department: string) => {
    haptic('light');
    onChange(department);
    setShowModal(false);
    setSearchQuery('');
  }, [onChange]);

  const DepartmentItem = ({ item, isRecommended }: { 
    item: typeof allDepartments[0], 
    isRecommended?: boolean 
  }) => {
    const isSelected = item.value === value;

    return (
      <Pressable
        onPress={() => handleSelect(item.value)}
        style={({ pressed }) => [{
          opacity: pressed ? 0.8 : 1,
        }]}
      >
        <HStack
          gap={3}
          p={3}
          alignItems="center"
          style={{
            backgroundColor: isSelected ? theme.primary + '20' : theme.card,
            borderWidth: 1,
            borderColor: isSelected ? theme.primary : theme.border,
            borderRadius: 12,
            marginBottom: spacing[2],
          }}
        >
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: item.color + '20',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text size="lg">{item.icon}</Text>
          </View>
          
          <VStack style={{ flex: 1 }}>
            <HStack gap={2} alignItems="center">
              <Text weight="semibold">{item.label}</Text>
              {isRecommended && (
                <Badge variant="default" size="sm">
                  Recommended
                </Badge>
              )}
            </HStack>
          </VStack>
          
          {isSelected && (
            <Symbol name="checkmark.circle.fill" size={20} color={theme.primary} />
          )}
        </HStack>
      </Pressable>
    );
  };

  return (
    <>
      {/* Department Selector Button */}
      <Pressable
        onPress={() => {
          haptic('light');
          setShowModal(true);
        }}
        style={[
          {
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: error ? theme.destructive : (value ? theme.primary : theme.border),
            borderRadius: 12,
            padding: spacing[3],
          },
          shadowMd,
        ]}
      >
        <HStack justifyContent="space-between" alignItems="center">
          <VStack style={{ flex: 1 }}>
            <HStack gap={1} alignItems="center">
              <Text weight="semibold" size="base">
                Target Department
              </Text>
              {required && (
                <Text size="sm" style={{ color: theme.destructive }}>*</Text>
              )}
            </HStack>
            
            {selectedDepartment ? (
              <HStack gap={2} alignItems="center" style={{ marginTop: spacing[1] }}>
                <Text size="lg">{selectedDepartment.icon}</Text>
                <Text size="base" weight="medium" style={{ color: selectedDepartment.color }}>
                  {selectedDepartment.label}
                </Text>
              </HStack>
            ) : (
              <Text size="sm" colorTheme="mutedForeground" style={{ marginTop: spacing[1] }}>
                Select department to route alert
              </Text>
            )}
          </VStack>
          
          <Symbol 
            name="chevron.right" 
            size={20} 
            color={theme.mutedForeground} 
          />
        </HStack>
      </Pressable>
      
      {error && (
        <Text size="xs" colorTheme="destructive" style={{ marginTop: spacing[1] }}>
          {error}
        </Text>
      )}

      {/* Department Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={false}
        presentationStyle={isMobile ? "fullScreen" : "pageSheet"}
        onRequestClose={() => setShowModal(false)}
      >
        <Container safe scroll={false} style={{ flex: 1, backgroundColor: theme.background }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={{ flex: 1 }}>
                {/* Modal Header */}
                <HStack
                  p={4}
                  justifyContent="space-between"
                  alignItems="center"
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    backgroundColor: theme.background,
                  }}
                >
                  <Text size="xl" weight="bold">Select Department</Text>
                  <Pressable
                    onPress={() => setShowModal(false)}
                    style={{
                      padding: spacing[2],
                      marginRight: -spacing[2],
                    }}
                  >
                    <Symbol name="xmark" size={24} color={theme.mutedForeground} />
                  </Pressable>
                </HStack>

                {/* Search Bar */}
                <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3] }}>
                  <HStack
                    gap={2}
                    alignItems="center"
                    style={{
                      backgroundColor: theme.muted,
                      borderRadius: 12,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                    }}
                  >
                    <Symbol name="magnifyingglass" size={20} color={theme.mutedForeground} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search departments..."
                      placeholderTextColor={theme.mutedForeground}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        color: theme.foreground,
                      }}
                    />
                  </HStack>
                </View>

                {/* Department List */}
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    padding: spacing[4],
                    paddingBottom: spacing[8],
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  {searchQuery ? (
                    // Show filtered results
                    filteredDepartments && filteredDepartments.length > 0 ? (
                      <VStack gap={2}>
                        <Text size="sm" weight="semibold" colorTheme="mutedForeground" style={{ marginBottom: spacing[2] }}>
                          Search Results
                        </Text>
                        {filteredDepartments.map(dept => (
                          <DepartmentItem 
                            key={dept.value} 
                            item={dept}
                            isRecommended={recommendedDepartments.includes(dept.value)}
                          />
                        ))}
                      </VStack>
                    ) : (
                      <VStack gap={2} alignItems="center" style={{ paddingVertical: spacing[8] }}>
                        <Symbol name="magnifyingglass" size={48} color={theme.mutedForeground} />
                        <Text colorTheme="mutedForeground">No departments found</Text>
                      </VStack>
                    )
                  ) : (
                    <>
                      {/* Recommended Departments */}
                      {recommendedDepartments.length > 0 && (
                        <VStack gap={2} style={{ marginBottom: spacing[4] }}>
                          <Text size="sm" weight="semibold" colorTheme="mutedForeground" style={{ marginBottom: spacing[2] }}>
                            Recommended for {alertType} alerts
                          </Text>
                          {recommendedDepartments.map(deptValue => {
                            const dept = allDepartments.find(d => d.value === deptValue);
                            return dept ? (
                              <DepartmentItem 
                                key={dept.value} 
                                item={dept}
                                isRecommended={true}
                              />
                            ) : null;
                          })}
                        </VStack>
                      )}

                      {/* All Departments by Category */}
                      {Object.entries(DEPARTMENT_CATEGORIES).map(([category, departments]) => (
                        <VStack key={category} gap={2} style={{ marginBottom: spacing[4] }}>
                          <Text size="sm" weight="semibold" colorTheme="mutedForeground" style={{ marginBottom: spacing[2] }}>
                            {category}
                          </Text>
                          {departments.map(dept => (
                            <DepartmentItem 
                              key={dept.value} 
                              item={dept}
                              isRecommended={recommendedDepartments.includes(dept.value)}
                            />
                          ))}
                        </VStack>
                      ))}
                    </>
                  )}
                </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Container>
      </Modal>
    </>
  );
}