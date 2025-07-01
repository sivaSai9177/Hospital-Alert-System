import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface InspectorNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  children?: InspectorNode[];
  properties?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    fills?: any[];
    strokes?: any[];
    effects?: any[];
    constraints?: any;
    layoutMode?: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    itemSpacing?: number;
    layoutAlign?: string;
    layoutGrow?: number;
  };
}

export interface SelectionInfo {
  id: string;
  name: string;
  type: string;
  parent?: {
    id: string;
    name: string;
    type: string;
  };
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styles: {
    fills: any[];
    strokes: any[];
    effects: any[];
    opacity: number;
    blendMode: string;
  };
  constraints: {
    horizontal: string;
    vertical: string;
  };
  exportSettings?: any[];
}

interface InspectorState {
  // Selection
  selectedNodes: InspectorNode[];
  selectionInfo: SelectionInfo | null;
  nodeHierarchy: InspectorNode | null;
  
  // UI State
  expandedNodes: Set<string>;
  hoveredNodeId: string | null;
  activePanel: 'properties' | 'hierarchy' | 'styles';
  searchQuery: string;
  
  // View options
  showHiddenNodes: boolean;
  showLockedNodes: boolean;
  filterByType: string | null;
  
  // Loading states
  isLoadingHierarchy: boolean;
  isLoadingProperties: boolean;
  error: string | null;
  
  // Actions
  setSelectedNodes: (nodes: InspectorNode[]) => void;
  setSelectionInfo: (info: SelectionInfo | null) => void;
  setNodeHierarchy: (hierarchy: InspectorNode | null) => void;
  
  toggleNodeExpanded: (nodeId: string) => void;
  expandAllNodes: () => void;
  collapseAllNodes: () => void;
  
  setHoveredNode: (nodeId: string | null) => void;
  setActivePanel: (panel: 'properties' | 'hierarchy' | 'styles') => void;
  setSearchQuery: (query: string) => void;
  
  setShowHiddenNodes: (show: boolean) => void;
  setShowLockedNodes: (show: boolean) => void;
  setFilterByType: (type: string | null) => void;
  
  setLoadingHierarchy: (loading: boolean) => void;
  setLoadingProperties: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Complex actions
  selectNodeInFigma: (nodeId: string) => void;
  highlightNodeInFigma: (nodeId: string) => void;
  zoomToNode: (nodeId: string) => void;
  copyNodeProperties: (nodeId: string) => void;
  
  // Clear state
  clearSelection: () => void;
  reset: () => void;
}

const initialState = {
  selectedNodes: [],
  selectionInfo: null,
  nodeHierarchy: null,
  expandedNodes: new Set<string>(),
  hoveredNodeId: null,
  activePanel: 'properties' as const,
  searchQuery: '',
  showHiddenNodes: false,
  showLockedNodes: true,
  filterByType: null,
  isLoadingHierarchy: false,
  isLoadingProperties: false,
  error: null,
};

export const useInspectorStore = create<InspectorState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Selection setters
      setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
      setSelectionInfo: (info) => set({ selectionInfo: info }),
      setNodeHierarchy: (hierarchy) => set({ nodeHierarchy: hierarchy }),

      // Tree view actions
      toggleNodeExpanded: (nodeId) => {
        const expandedNodes = new Set(get().expandedNodes);
        if (expandedNodes.has(nodeId)) {
          expandedNodes.delete(nodeId);
        } else {
          expandedNodes.add(nodeId);
        }
        set({ expandedNodes });
      },

      expandAllNodes: () => {
        const expandedNodes = new Set<string>();
        
        const addAllNodeIds = (node: InspectorNode) => {
          expandedNodes.add(node.id);
          node.children?.forEach(addAllNodeIds);
        };
        
        const hierarchy = get().nodeHierarchy;
        if (hierarchy) {
          addAllNodeIds(hierarchy);
        }
        
        set({ expandedNodes });
      },

      collapseAllNodes: () => {
        set({ expandedNodes: new Set() });
      },

      // UI state setters
      setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),
      setActivePanel: (panel) => set({ activePanel: panel }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setShowHiddenNodes: (show) => set({ showHiddenNodes: show }),
      setShowLockedNodes: (show) => set({ showLockedNodes: show }),
      setFilterByType: (type) => set({ filterByType: type }),
      
      setLoadingHierarchy: (loading) => set({ isLoadingHierarchy: loading }),
      setLoadingProperties: (loading) => set({ isLoadingProperties: loading }),
      setError: (error) => set({ error }),

      // Figma actions
      selectNodeInFigma: (nodeId) => {
        parent.postMessage({
          pluginMessage: {
            type: 'select-node',
            nodeId
          }
        }, '*');
      },

      highlightNodeInFigma: (nodeId) => {
        parent.postMessage({
          pluginMessage: {
            type: 'highlight-node',
            nodeId
          }
        }, '*');
      },

      zoomToNode: (nodeId) => {
        parent.postMessage({
          pluginMessage: {
            type: 'zoom-to-node',
            nodeId
          }
        }, '*');
      },

      copyNodeProperties: (nodeId) => {
        const node = findNodeById(get().nodeHierarchy, nodeId);
        if (node && node.properties) {
          navigator.clipboard.writeText(JSON.stringify(node.properties, null, 2));
        }
      },

      // Clear actions
      clearSelection: () => {
        set({
          selectedNodes: [],
          selectionInfo: null,
          nodeHierarchy: null,
        });
      },

      reset: () => set({ ...initialState, expandedNodes: new Set() }),
    }),
    {
      name: 'InspectorStore',
    }
  )
);

// Helper function to find node by ID in hierarchy
function findNodeById(node: InspectorNode | null, nodeId: string): InspectorNode | null {
  if (!node) return null;
  if (node.id === nodeId) return node;
  
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  
  return null;
}

// Hook to get filtered nodes based on search and filters
export function useFilteredNodes(node: InspectorNode | null): InspectorNode | null {
  const { searchQuery, showHiddenNodes, showLockedNodes, filterByType } = useInspectorStore();
  
  if (!node) return null;
  
  const filterNode = (n: InspectorNode): InspectorNode | null => {
    // Apply filters
    if (!showHiddenNodes && !n.visible) return null;
    if (!showLockedNodes && n.locked) return null;
    if (filterByType && n.type !== filterByType) return null;
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatches = n.name.toLowerCase().includes(query);
      const hasMatchingChildren = n.children?.some(child => filterNode(child) !== null);
      
      if (!nameMatches && !hasMatchingChildren) return null;
    }
    
    // Filter children recursively
    const filteredChildren = n.children
      ?.map(child => filterNode(child))
      .filter((child): child is InspectorNode => child !== null);
    
    return {
      ...n,
      children: filteredChildren
    };
  };
  
  return filterNode(node);
}