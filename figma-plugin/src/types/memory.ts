// Memory types for Design Agent
export interface DesignVector {
  id: string;
  frameId: string;
  frameName: string;
  timestamp: Date;
  embedding: number[];
  metadata: DesignMetadata;
}

export interface DesignMetadata {
  // Frame properties
  width: number;
  height: number;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  
  // Design tokens used
  colors: string[];
  typography: string[];
  spacing: number[];
  effects: string[];
  
  // Semantic information
  description?: string;
  tags: string[];
  category?: string;
  componentType?: string;
  
  // Usage statistics
  usageCount: number;
  lastUsed: Date;
  successRate: number;
  
  // User context
  userId?: string;
  projectId?: string;
  pageId?: string;
}

export interface MutationMemory {
  id: string;
  frameId: string;
  beforeState: Partial<DesignMetadata>;
  afterState: Partial<DesignMetadata>;
  mutations: FrameMutation[];
  success: boolean;
  timestamp: Date;
  context?: string;
}

export interface FrameMutation {
  property: string;
  oldValue: any;
  newValue: any;
}

export interface ComponentPattern {
  id: string;
  name: string;
  description: string;
  embedding: number[];
  examples: string[]; // Frame IDs
  properties: Record<string, any>;
  frequency: number;
  rating: number;
}

export interface UserPreference {
  id: string;
  userId: string;
  category: 'color' | 'spacing' | 'typography' | 'layout' | 'effects';
  preferences: Record<string, any>;
  confidence: number;
  lastUpdated: Date;
}

export interface SearchResult<T = DesignVector> {
  item: T;
  score: number;
  distance: number;
}

export interface MemoryCollection {
  DESIGN_PATTERNS: 'design_patterns';
  COMPONENT_MEMORY: 'component_memory';
  USER_PREFERENCES: 'user_preferences';
  MUTATION_HISTORY: 'mutation_history';
  TOKEN_USAGE: 'token_usage';
}

export const MEMORY_COLLECTIONS: MemoryCollection = {
  DESIGN_PATTERNS: 'design_patterns',
  COMPONENT_MEMORY: 'component_memory',
  USER_PREFERENCES: 'user_preferences',
  MUTATION_HISTORY: 'mutation_history',
  TOKEN_USAGE: 'token_usage',
};

export interface MemoryStats {
  totalVectors: number;
  collections: {
    name: string;
    count: number;
    lastUpdated: Date;
  }[];
  storageUsed: number;
  indexingStatus: 'ready' | 'indexing' | 'error';
}