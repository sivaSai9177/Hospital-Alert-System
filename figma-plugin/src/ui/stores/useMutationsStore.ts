import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Mutation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move' | 'rename';
  nodeId: string;
  nodeName: string;
  nodeType: string;
  timestamp: Date;
  userId?: string;
  changes: {
    property: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: {
    parentId?: string;
    parentName?: string;
    page?: string;
    component?: string;
  };
}

export interface MutationBatch {
  id: string;
  name: string;
  mutations: Mutation[];
  timestamp: Date;
  applied: boolean;
}

interface MutationsState {
  // Mutations tracking
  mutations: Mutation[];
  mutationBatches: MutationBatch[];
  currentBatchId: string | null;
  
  // Filters
  filterType: 'all' | 'create' | 'update' | 'delete' | 'move' | 'rename';
  filterNodeType: string | null;
  filterTimeRange: 'all' | 'today' | 'week' | 'month';
  searchQuery: string;
  
  // UI State
  selectedMutationIds: Set<string>;
  expandedBatchIds: Set<string>;
  viewMode: 'list' | 'timeline' | 'grouped';
  
  // Settings
  autoTrack: boolean;
  maxMutations: number;
  groupSimilar: boolean;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addMutation: (mutation: Omit<Mutation, 'id' | 'timestamp'>) => void;
  addMutationBatch: (batch: Omit<MutationBatch, 'id' | 'timestamp'>) => void;
  removeMutation: (id: string) => void;
  clearMutations: () => void;
  
  startBatch: (name: string) => void;
  endBatch: () => void;
  applyBatch: (batchId: string) => void;
  revertBatch: (batchId: string) => void;
  
  setFilterType: (type: MutationsState['filterType']) => void;
  setFilterNodeType: (type: string | null) => void;
  setFilterTimeRange: (range: MutationsState['filterTimeRange']) => void;
  setSearchQuery: (query: string) => void;
  
  toggleMutationSelection: (id: string) => void;
  selectAllMutations: () => void;
  deselectAllMutations: () => void;
  
  toggleBatchExpanded: (id: string) => void;
  setViewMode: (mode: MutationsState['viewMode']) => void;
  
  setAutoTrack: (autoTrack: boolean) => void;
  setMaxMutations: (max: number) => void;
  setGroupSimilar: (group: boolean) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Complex actions
  exportMutations: (format: 'json' | 'csv') => string;
  importMutations: (data: string, format: 'json' | 'csv') => void;
  generateChangeReport: () => string;
  
  // Reset
  reset: () => void;
}

const initialState = {
  mutations: [],
  mutationBatches: [],
  currentBatchId: null,
  filterType: 'all' as const,
  filterNodeType: null,
  filterTimeRange: 'all' as const,
  searchQuery: '',
  selectedMutationIds: new Set<string>(),
  expandedBatchIds: new Set<string>(),
  viewMode: 'list' as const,
  autoTrack: true,
  maxMutations: 1000,
  groupSimilar: true,
  isLoading: false,
  error: null,
};

export const useMutationsStore = create<MutationsState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Mutation management
        addMutation: (mutation) => {
          const { mutations, maxMutations, currentBatchId } = get();
          const newMutation: Mutation = {
            ...mutation,
            id: Date.now().toString(),
            timestamp: new Date(),
          };
          
          // Add to current batch if exists
          if (currentBatchId) {
            const batches = get().mutationBatches.map(batch => {
              if (batch.id === currentBatchId) {
                return {
                  ...batch,
                  mutations: [...batch.mutations, newMutation]
                };
              }
              return batch;
            });
            set({ mutationBatches: batches });
          }
          
          // Add to mutations list
          const updatedMutations = [newMutation, ...mutations];
          
          // Trim if exceeds max
          if (updatedMutations.length > maxMutations) {
            updatedMutations.splice(maxMutations);
          }
          
          set({ mutations: updatedMutations });
          
          // Send to plugin backend
          parent.postMessage({
            pluginMessage: {
              type: 'mutation-tracked',
              mutation: newMutation
            }
          }, '*');
        },

        addMutationBatch: (batch) => {
          const newBatch: MutationBatch = {
            ...batch,
            id: Date.now().toString(),
            timestamp: new Date(),
          };
          
          set({
            mutationBatches: [newBatch, ...get().mutationBatches]
          });
        },

        removeMutation: (id) => {
          set({
            mutations: get().mutations.filter(m => m.id !== id)
          });
        },

        clearMutations: () => {
          set({ mutations: [], mutationBatches: [] });
        },

        // Batch management
        startBatch: (name) => {
          const batchId = Date.now().toString();
          const newBatch: MutationBatch = {
            id: batchId,
            name,
            mutations: [],
            timestamp: new Date(),
            applied: true,
          };
          
          set({
            mutationBatches: [newBatch, ...get().mutationBatches],
            currentBatchId: batchId,
          });
        },

        endBatch: () => {
          set({ currentBatchId: null });
        },

        applyBatch: (batchId) => {
          parent.postMessage({
            pluginMessage: {
              type: 'apply-mutation-batch',
              batchId
            }
          }, '*');
        },

        revertBatch: (batchId) => {
          parent.postMessage({
            pluginMessage: {
              type: 'revert-mutation-batch',
              batchId
            }
          }, '*');
        },

        // Filter actions
        setFilterType: (filterType) => set({ filterType }),
        setFilterNodeType: (filterNodeType) => set({ filterNodeType }),
        setFilterTimeRange: (filterTimeRange) => set({ filterTimeRange }),
        setSearchQuery: (searchQuery) => set({ searchQuery }),

        // Selection actions
        toggleMutationSelection: (id) => {
          const selectedMutationIds = new Set(get().selectedMutationIds);
          if (selectedMutationIds.has(id)) {
            selectedMutationIds.delete(id);
          } else {
            selectedMutationIds.add(id);
          }
          set({ selectedMutationIds });
        },

        selectAllMutations: () => {
          const mutations = get().mutations;
          set({
            selectedMutationIds: new Set(mutations.map(m => m.id))
          });
        },

        deselectAllMutations: () => {
          set({ selectedMutationIds: new Set() });
        },

        // UI actions
        toggleBatchExpanded: (id) => {
          const expandedBatchIds = new Set(get().expandedBatchIds);
          if (expandedBatchIds.has(id)) {
            expandedBatchIds.delete(id);
          } else {
            expandedBatchIds.add(id);
          }
          set({ expandedBatchIds });
        },

        setViewMode: (viewMode) => set({ viewMode }),

        // Settings actions
        setAutoTrack: (autoTrack) => {
          set({ autoTrack });
          parent.postMessage({
            pluginMessage: {
              type: 'set-auto-track',
              enabled: autoTrack
            }
          }, '*');
        },

        setMaxMutations: (maxMutations) => set({ maxMutations }),
        setGroupSimilar: (groupSimilar) => set({ groupSimilar }),
        
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),

        // Export/Import
        exportMutations: (format) => {
          const { mutations, mutationBatches } = get();
          const data = {
            mutations,
            batches: mutationBatches,
            exportDate: new Date().toISOString(),
          };
          
          if (format === 'json') {
            return JSON.stringify(data, null, 2);
          } else {
            // CSV format
            const csv = ['Type,Node,Property,Old Value,New Value,Timestamp'];
            mutations.forEach(m => {
              m.changes.forEach(c => {
                csv.push([
                  m.type,
                  m.nodeName,
                  c.property,
                  JSON.stringify(c.oldValue),
                  JSON.stringify(c.newValue),
                  m.timestamp.toISOString()
                ].join(','));
              });
            });
            return csv.join('\n');
          }
        },

        importMutations: (data, format) => {
          try {
            if (format === 'json') {
              const parsed = JSON.parse(data);
              if (parsed.mutations) {
                set({
                  mutations: parsed.mutations.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                  }))
                });
              }
              if (parsed.batches) {
                set({
                  mutationBatches: parsed.batches.map((b: any) => ({
                    ...b,
                    timestamp: new Date(b.timestamp)
                  }))
                });
              }
            }
          } catch (error) {
            throw new Error('Failed to import mutations');
          }
        },

        generateChangeReport: () => {
          const { mutations } = get();
          const report = ['# Design Change Report', ''];
          
          // Group by type
          const byType = mutations.reduce((acc, m) => {
            if (!acc[m.type]) acc[m.type] = [];
            acc[m.type].push(m);
            return acc;
          }, {} as Record<string, Mutation[]>);
          
          Object.entries(byType).forEach(([type, muts]) => {
            report.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)} (${muts.length})`);
            muts.forEach(m => {
              report.push(`- **${m.nodeName}** (${m.nodeType})`);
              m.changes.forEach(c => {
                report.push(`  - ${c.property}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`);
              });
            });
            report.push('');
          });
          
          return report.join('\n');
        },

        // Reset
        reset: () => set({ ...initialState, selectedMutationIds: new Set(), expandedBatchIds: new Set() }),
      }),
      {
        name: 'mutations-store',
        partialize: (state) => ({
          mutations: state.mutations.slice(0, 100), // Only persist recent 100
          mutationBatches: state.mutationBatches.slice(0, 10), // Only persist recent 10 batches
          autoTrack: state.autoTrack,
          maxMutations: state.maxMutations,
          groupSimilar: state.groupSimilar,
        }),
      }
    ),
    {
      name: 'MutationsStore',
    }
  )
);

// Helper hook for filtered mutations
export function useFilteredMutations() {
  const {
    mutations,
    filterType,
    filterNodeType,
    filterTimeRange,
    searchQuery,
  } = useMutationsStore();
  
  return mutations.filter(mutation => {
    // Type filter
    if (filterType !== 'all' && mutation.type !== filterType) return false;
    
    // Node type filter
    if (filterNodeType && mutation.nodeType !== filterNodeType) return false;
    
    // Time range filter
    if (filterTimeRange !== 'all') {
      const now = new Date();
      const mutationDate = new Date(mutation.timestamp);
      
      switch (filterTimeRange) {
        case 'today':
          if (mutationDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (mutationDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (mutationDate < monthAgo) return false;
          break;
      }
    }
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches = 
        mutation.nodeName.toLowerCase().includes(query) ||
        mutation.nodeType.toLowerCase().includes(query) ||
        mutation.changes.some(c => 
          c.property.toLowerCase().includes(query) ||
          JSON.stringify(c.oldValue).toLowerCase().includes(query) ||
          JSON.stringify(c.newValue).toLowerCase().includes(query)
        );
      
      if (!matches) return false;
    }
    
    return true;
  });
}