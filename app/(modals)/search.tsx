import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Keyboard
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme/provider';
import { useSpacing } from '@/lib/stores/spacing-store';
import { haptic } from '@/lib/ui/haptics';
import {
  Text,
  VStack,
  HStack,
  Badge,
  Avatar,
  Box,
  Symbol,
} from '@/components/universal';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { debounce } from '@/lib/core/utils';

type SearchCategory = 'all' | 'patients' | 'staff' | 'alerts';

interface SearchResult {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle?: string;
  metadata?: string;
  avatar?: string;
  badge?: string;
}

// Mock search results
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'patients',
    title: 'John Doe',
    subtitle: 'MRN: 123456',
    metadata: 'Room 203',
    avatar: 'JD',
  },
  {
    id: '2',
    type: 'staff',
    title: 'Dr. Sarah Smith',
    subtitle: 'Cardiologist',
    metadata: 'On duty',
    avatar: 'SS',
    badge: 'active',
  },
  {
    id: '3',
    type: 'alerts',
    title: 'Critical Patient Alert',
    subtitle: 'Room 203 - High Priority',
    metadata: '10 minutes ago',
    badge: 'critical',
  },
];

export default function SearchModal() {
  const theme = useTheme();
  const { spacing } = useSpacing();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // Auto-focus search input on mount
  React.useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  // Debounced search function
  const performSearch = useCallback(
    debounce((query: string) => {
      if (query.trim().length === 0) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      // Simulate API search
      setTimeout(() => {
        const filtered = mockSearchResults.filter(
          (result) =>
            result.title.toLowerCase().includes(query.toLowerCase()) ||
            result.subtitle?.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
        setIsLoading(false);
      }, 300);
    }, 300),
    []
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    performSearch(text);
  };

  const handleResultPress = (result: SearchResult) => {
    haptic('light');
    Keyboard.dismiss();
    
    // Navigate based on result type
    switch (result.type) {
      case 'patients':
        router.back();
        router.push(`/patients/${result.id}`);
        break;
      case 'alerts':
        router.back();
        router.push(`/alerts/${result.id}`);
        break;
      case 'staff':
        router.back();
        router.push(`/staff/${result.id}`);
        break;
    }
  };

  const handleClose = () => {
    haptic('light');
    Keyboard.dismiss();
    router.back();
  };

  const getTypeColor = (type: SearchCategory) => {
    switch (type) {
      case 'patients': return theme.primary;
      case 'staff': return theme.success;
      case 'alerts': return theme.destructive;
      default: return theme.muted;
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View 
          style={{
            paddingTop: insets.top,
            paddingHorizontal: spacing[4] as number,
            paddingBottom: spacing[3] as number,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          }}
        >
          <HStack alignItems="center" gap={3}>
            {/* Search Input */}
            <View 
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.muted + '20',
                borderRadius: 10,
                paddingHorizontal: spacing[3] as number,
                height: 44,
              }}
            >
              <Symbol name="magnifyingglass" size={18} color={theme.mutedForeground} />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Search patients, staff, alerts..."
                placeholderTextColor={theme.mutedForeground}
                style={{
                  flex: 1,
                  marginLeft: spacing[2] as number,
                  fontSize: 16,
                  color: theme.foreground,
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Symbol name="xmark.circle.fill" size={18} color={theme.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Cancel Button */}
            <TouchableOpacity onPress={handleClose}>
              <Text size="base" style={{ color: theme.primary }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </HStack>
        </View>

        {/* Search Results */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View style={{ padding: spacing[8] as number, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : searchQuery.length === 0 ? (
            <VStack p={4} gap={4}>
              <Text size="sm" colorTheme="mutedForeground" weight="semibold">
                RECENT SEARCHES
              </Text>
              {['Patient John Doe', 'Alert critical', 'Dr. Smith'].map((recent, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSearchChange(recent)}
                >
                  <HStack alignItems="center" gap={3}>
                    <Symbol name="clock" size={16} color={theme.mutedForeground} />
                    <Text colorTheme="mutedForeground">{recent}</Text>
                  </HStack>
                </TouchableOpacity>
              ))}
            </VStack>
          ) : searchResults.length === 0 ? (
            <View style={{ padding: spacing[8] as number, alignItems: 'center' }}>
              <Symbol name="magnifyingglass" size={48} color={theme.mutedForeground} />
              <Text 
                size="base" 
                colorTheme="mutedForeground" 
                style={{ marginTop: spacing[2] as number }}
              >
                No results found
              </Text>
            </View>
          ) : (
            <VStack p={4} gap={2}>
              {searchResults.map((result) => (
                <Animated.View
                  key={result.id}
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                >
                  <TouchableOpacity
                    onPress={() => handleResultPress(result)}
                    style={{
                      backgroundColor: theme.card,
                      borderRadius: 12,
                      padding: spacing[3] as number,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <HStack alignItems="center" gap={3}>
                      {result.avatar ? (
                        <Avatar name={result.avatar} size="md" />
                      ) : (
                        <View 
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: getTypeColor(result.type) + '20',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Symbol 
                            name={
                              result.type === 'patients' ? 'person.fill' :
                              result.type === 'staff' ? 'stethoscope' :
                              result.type === 'alerts' ? 'bell.fill' : 'doc.fill'
                            } 
                            size={20} 
                            color={getTypeColor(result.type)} 
                          />
                        </View>
                      )}
                      
                      <VStack style={{ flex: 1 }} gap={1}>
                        <HStack alignItems="center" gap={2}>
                          <Text weight="semibold">{result.title}</Text>
                          {result.badge && (
                            <Badge 
                              variant={result.badge === 'critical' ? 'destructive' : 'default'} 
                              size="sm"
                            >
                              {result.badge}
                            </Badge>
                          )}
                        </HStack>
                        {result.subtitle && (
                          <Text size="sm" colorTheme="mutedForeground">
                            {result.subtitle}
                          </Text>
                        )}
                        {result.metadata && (
                          <Text size="xs" colorTheme="mutedForeground">
                            {result.metadata}
                          </Text>
                        )}
                      </VStack>
                      
                      <Symbol name="chevron.right" size={16} color={theme.mutedForeground} />
                    </HStack>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </VStack>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}