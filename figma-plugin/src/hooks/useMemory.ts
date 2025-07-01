import React, { useState, useCallback } from 'react';
import { trpc } from '../ui/lib/trpc';
import type { DesignMetadata, SearchResult, DesignVector, MutationMemory } from '../types/memory';

export interface UseMemoryOptions {
  autoInitialize?: boolean;
}

export function useMemory(options: UseMemoryOptions = {}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const utils = trpc.useUtils();

  // Initialize memory service
  const initializeMemory = trpc.figma.memory.initialize.useMutation({
    onSuccess: () => {
      setIsInitialized(true);
      setIsInitializing(false);
    },
    onError: (error) => {
      console.error('Failed to initialize memory:', error);
      setIsInitializing(false);
    },
  });

  // Store design pattern
  const storeDesignPattern = trpc.figma.memory.storeDesignPattern.useMutation();

  // Store mutation
  const storeMutation = trpc.figma.memory.storeMutation.useMutation();

  // Store user preference
  const storeUserPreference = trpc.figma.memory.storeUserPreference.useMutation();

  // Update design usage
  const updateDesignUsage = trpc.figma.memory.updateDesignUsage.useMutation();

  // Clear all memory
  const clearAllMemory = trpc.figma.memory.clearAllMemory.useMutation();

  // Initialize on mount if requested
  React.useEffect(() => {
    if (options.autoInitialize && !isInitialized && !isInitializing) {
      setIsInitializing(true);
      initializeMemory.mutate();
    }
  }, [options.autoInitialize, isInitialized, isInitializing]);

  // Helper function to store current frame as design pattern
  const storeCurrentFrame = useCallback(async (
    frameId: string,
    frameName: string,
    metadata: DesignMetadata,
    description?: string
  ) => {
    try {
      const result = await storeDesignPattern.mutateAsync({
        frameId,
        frameName,
        metadata,
        description,
      });
      
      // Update usage stats for the newly stored pattern
      if (result.id) {
        await updateDesignUsage.mutateAsync({ designId: result.id });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to store design pattern:', error);
      throw error;
    }
  }, [storeDesignPattern, updateDesignUsage]);

  // Helper function for semantic search
  const semanticSearch = useCallback(async (
    query: string,
    limit: number = 10
  ): Promise<SearchResult<DesignVector>[]> => {
    try {
      const result = await utils.figma.memory.searchByDescription.fetch({
        query,
        limit,
      });
      
      return result?.results || [];
    } catch (error) {
      console.error('Failed to search designs:', error);
      return [];
    }
  }, [utils]);

  return {
    // State
    isInitialized,
    isInitializing,
    
    // Core functions
    initialize: () => {
      setIsInitializing(true);
      initializeMemory.mutate();
    },
    
    // Design patterns
    storeCurrentFrame,
    storeDesignPattern: storeDesignPattern.mutateAsync,
    findSimilarDesigns: trpc.figma.memory.findSimilarDesigns,
    
    // Mutations
    storeMutation: storeMutation.mutateAsync,
    findSuccessfulMutations: trpc.figma.memory.findSuccessfulMutations,
    
    // Search
    semanticSearch,
    searchByDescription: trpc.figma.memory.searchByDescription,
    
    // User preferences
    storeUserPreference: storeUserPreference.mutateAsync,
    getUserPreferences: trpc.figma.memory.getUserPreferences,
    
    // Stats and management
    updateDesignUsage: updateDesignUsage.mutateAsync,
    getStats: trpc.figma.memory.getStats,
    exportMemory: trpc.figma.memory.exportMemory,
    clearAllMemory: clearAllMemory.mutateAsync,
    
    // Loading states
    isStoringPattern: storeDesignPattern.isPending,
    isStoringMutation: storeMutation.isPending,
    isSearching: false, // Will be managed by query state
  };
}

// Hook for managing design pattern suggestions
export function useDesignSuggestions(currentFrameMetadata?: DesignMetadata) {
  const memory = useMemory({ autoInitialize: true });
  const [isLoading, setIsLoading] = useState(false);

  const suggestionsQuery = memory.findSimilarDesigns.useQuery(
    currentFrameMetadata ? {
      frameMetadata: currentFrameMetadata,
      limit: 5,
      threshold: 0.7,
    } : undefined as any,
    { 
      enabled: !!currentFrameMetadata && memory.isInitialized,
      refetchInterval: false,
    }
  );

  return {
    suggestions: suggestionsQuery.data?.results || [],
    isLoading: suggestionsQuery.isLoading,
    refresh: () => suggestionsQuery.refetch(),
  };
}

// Hook for tracking design patterns over time
export function useDesignHistory(userId?: string) {
  const memory = useMemory({ autoInitialize: true });

  const preferences = memory.getUserPreferences.useQuery(
    { userId: userId || 'default' },
    { enabled: !!userId && memory.isInitialized }
  );

  const stats = memory.getStats.useQuery(
    undefined,
    { enabled: memory.isInitialized }
  );

  return {
    preferences: preferences.data?.preferences || [],
    stats: stats.data?.stats,
    isLoading: preferences.isLoading || stats.isLoading,
  };
}