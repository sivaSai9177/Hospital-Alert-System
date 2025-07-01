import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import superjson from 'superjson';
import { getMemoryService } from '../../../src/services/memory/index';
import type { DesignMetadata, FrameMutation } from '../../../src/types/memory';
import { createTRPCLogger } from '../../../src/lib/debug/trpc-logger';
import { logger } from '../../../src/lib/debug/server-logger';
import { searchService } from '../search-service';

// Initialize tRPC with logger middleware
const t = initTRPC.create({
  transformer: superjson,
});

// Create middleware
const loggerMiddleware = t.middleware(createTRPCLogger({
  logRequests: true,
  logResponses: true,
  logErrors: true,
  logPerformance: true,
  excludePaths: ['figma.memory.getStats'], // Exclude frequently called paths
}));

// Create procedures with logger
const publicProcedure = t.procedure.use(loggerMiddleware);
const router = t.router;

// Frame schemas
const FrameMutationSchema = z.object({
  frameId: z.string(),
  mutations: z.record(z.any()),
});

const BatchMutationSchema = z.object({
  mutations: z.array(z.object({
    frameId: z.string(),
    changes: z.record(z.any()),
  })),
});

const AnalyzeFrameSchema = z.object({
  frameId: z.string(),
});

const SuggestOptimizationsSchema = z.object({
  frameIds: z.array(z.string()),
});

const GenerateComponentSchema = z.object({
  description: z.string(),
  style: z.enum(['modern', 'minimal', 'playful', 'professional']).optional(),
  platform: z.enum(['universal', 'web', 'mobile']).optional(),
});

// Memory schemas
const DesignMetadataSchema = z.object({
  width: z.number(),
  height: z.number(),
  layoutMode: z.enum(['NONE', 'HORIZONTAL', 'VERTICAL']).optional(),
  primaryAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
  counterAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
  colors: z.array(z.string()),
  typography: z.array(z.string()),
  spacing: z.array(z.number()),
  effects: z.array(z.string()),
  description: z.string().optional(),
  tags: z.array(z.string()),
  category: z.string().optional(),
  componentType: z.string().optional(),
  usageCount: z.number(),
  lastUsed: z.date(),
  successRate: z.number(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
  pageId: z.string().optional(),
});

const StoreDesignPatternSchema = z.object({
  frameId: z.string(),
  frameName: z.string(),
  metadata: DesignMetadataSchema,
  description: z.string().optional(),
});

const FindSimilarDesignsSchema = z.object({
  frameMetadata: DesignMetadataSchema,
  limit: z.number().optional().default(5),
  threshold: z.number().optional().default(0.7),
});

const StoreMutationSchema = z.object({
  frameId: z.string(),
  mutations: z.array(z.object({
    property: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
  })),
  beforeState: DesignMetadataSchema.partial(),
  afterState: DesignMetadataSchema.partial(),
  success: z.boolean(),
  context: z.string().optional(),
});

const SearchByDescriptionSchema = z.object({
  query: z.string(),
  limit: z.number().optional().default(10),
});

const StoreUserPreferenceSchema = z.object({
  userId: z.string(),
  category: z.enum(['color', 'spacing', 'typography', 'layout', 'effects']),
  preferences: z.record(z.any()),
});

// Create router
export const figmaRouter = router({
  // Mutations
  mutateFrame: publicProcedure
    .input(FrameMutationSchema)
    .mutation(async ({ input }) => {
      // In real implementation, this would communicate with Figma plugin
      console.log('Mutating frame:', input.frameId, input.mutations);
      return {
        success: true,
        frameId: input.frameId,
        appliedMutations: Object.keys(input.mutations).length,
      };
    }),

  batchMutateFrames: publicProcedure
    .input(BatchMutationSchema)
    .mutation(async ({ input }) => {
      console.log('Batch mutating frames:', input.mutations.length);
      return {
        success: true,
        mutatedFrames: input.mutations.length,
        results: input.mutations.map(m => ({
          frameId: m.frameId,
          success: true,
        })),
      };
    }),

  // Analysis
  analyzeFrame: publicProcedure
    .input(AnalyzeFrameSchema)
    .mutation(async ({ input }) => {
      // Simulate frame analysis
      const analysis = {
        frameId: input.frameId,
        analysis: `Frame Analysis:
• Layout: Uses auto-layout with vertical direction
• Spacing: 16px between items
• Padding: 24px on all sides
• Accessibility: Missing ARIA labels
• Performance: Good - no heavy effects
• Suggestions: Consider adding responsive constraints`,
        score: 85,
        issues: ['missing-aria', 'no-responsive-constraints'],
      };
      
      return analysis;
    }),

  suggestOptimizations: publicProcedure
    .input(SuggestOptimizationsSchema)
    .mutation(async ({ input }) => {
      // Simulate optimization suggestions
      const suggestions = [
        {
          type: 'layout',
          description: 'Convert to auto-layout for better responsiveness',
          frames: input.frameIds.slice(0, 2),
        },
        {
          type: 'performance',
          description: 'Reduce shadow blur radius for better rendering',
          frames: input.frameIds.slice(1, 3),
        },
        {
          type: 'accessibility',
          description: 'Add proper contrast ratios for text',
          frames: input.frameIds,
        },
      ];

      return {
        suggestions: suggestions.filter(s => s.frames.length > 0),
        estimatedImpact: 'high',
      };
    }),

  // Generation
  generateComponent: publicProcedure
    .input(GenerateComponentSchema)
    .mutation(async ({ input }) => {
      // Simulate component generation
      const code = `import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/lib/utils';

interface GeneratedComponentProps {
  title?: string;
  description?: string;
  className?: string;
}

export function GeneratedComponent({ 
  title = "${input.description.slice(0, 20)}...",
  description = "Generated from: ${input.description}",
  className 
}: GeneratedComponentProps) {
  return (
    <View className={cn(
      "bg-white rounded-lg p-6 shadow-md",
      "dark:bg-gray-800",
      className
    )}>
      <Text className="text-xl font-semibold mb-2 dark:text-white">
        {title}
      </Text>
      <Text className="text-gray-600 dark:text-gray-300">
        {description}
      </Text>
    </View>
  );
}`;

      return {
        code,
        componentName: 'GeneratedComponent',
        framework: 'react-native',
        style: input.style || 'modern',
      };
    }),

  // Subscriptions for real-time updates
  onFrameUpdate: publicProcedure
    .input(z.object({ frameIds: z.array(z.string()) }))
    .subscription(({ input }) => {
      return observable((emit) => {
        console.log('Subscribing to frame updates:', input.frameIds);
        
        // Simulate frame updates
        const interval = setInterval(() => {
          const frameId = input.frameIds[Math.floor(Math.random() * input.frameIds.length)];
          emit.next({
            type: 'frame-updated',
            frameId,
            timestamp: new Date(),
            changes: ['position', 'size'],
          });
        }, 5000);

        return () => {
          clearInterval(interval);
        };
      });
    }),

  // Memory endpoints
  memory: {
    // Initialize memory service
    initialize: publicProcedure
      .mutation(async () => {
        const memory = getMemoryService();
        await memory.initialize();
        return { success: true, message: 'Memory service initialized' };
      }),

    // Store design pattern
    storeDesignPattern: publicProcedure
      .input(StoreDesignPatternSchema)
      .mutation(async ({ input }) => {
        const memory = getMemoryService();
        const id = await memory.storeDesignPattern(
          input.frameId,
          input.frameName,
          input.metadata,
          input.description
        );
        return { success: true, id, message: 'Design pattern stored successfully' };
      }),

    // Find similar designs
    findSimilarDesigns: publicProcedure
      .input(FindSimilarDesignsSchema)
      .query(async ({ input }) => {
        const memory = getMemoryService();
        const results = await memory.findSimilarDesigns(
          input.frameMetadata,
          input.limit,
          input.threshold
        );
        return {
          success: true,
          results,
          count: results.length,
        };
      }),

    // Store mutation history
    storeMutation: publicProcedure
      .input(StoreMutationSchema)
      .mutation(async ({ input }) => {
        const memory = getMemoryService();
        const id = await memory.storeMutation(
          input.frameId,
          input.mutations as FrameMutation[],
          input.beforeState,
          input.afterState,
          input.success,
          input.context
        );
        return { success: true, id, message: 'Mutation stored successfully' };
      }),

    // Find successful mutations
    findSuccessfulMutations: publicProcedure
      .input(z.object({ frameMetadata: DesignMetadataSchema, limit: z.number().optional().default(10) }))
      .query(async ({ input }) => {
        const memory = getMemoryService();
        const mutations = await memory.findSuccessfulMutations(
          input.frameMetadata,
          input.limit
        );
        return {
          success: true,
          mutations,
          count: mutations.length,
        };
      }),

    // Search by description
    searchByDescription: publicProcedure
      .input(SearchByDescriptionSchema)
      .query(async ({ input }) => {
        const memory = getMemoryService();
        const results = await memory.searchByDescription(
          input.query,
          input.limit
        );
        return {
          success: true,
          results,
          count: results.length,
        };
      }),

    // Store user preference
    storeUserPreference: publicProcedure
      .input(StoreUserPreferenceSchema)
      .mutation(async ({ input }) => {
        const memory = getMemoryService();
        await memory.storeUserPreference(
          input.userId,
          input.category,
          input.preferences
        );
        return { success: true, message: 'User preference stored' };
      }),

    // Get user preferences
    getUserPreferences: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const memory = getMemoryService();
        const preferences = await memory.getUserPreferences(input.userId);
        return {
          success: true,
          preferences,
          count: preferences.length,
        };
      }),

    // Update design usage
    updateDesignUsage: publicProcedure
      .input(z.object({ designId: z.string() }))
      .mutation(async ({ input }) => {
        const memory = getMemoryService();
        await memory.updateDesignUsage(input.designId);
        return { success: true, message: 'Design usage updated' };
      }),

    // Get memory stats
    getStats: publicProcedure
      .query(async () => {
        const memory = getMemoryService();
        const stats = await memory.getStats();
        return {
          success: true,
          stats,
        };
      }),

    // Export memory
    exportMemory: publicProcedure
      .query(async () => {
        const memory = getMemoryService();
        const exported = await memory.exportMemory();
        return {
          success: true,
          data: exported,
          exportedAt: new Date(),
        };
      }),

    // Clear all memory (admin only)
    clearAllMemory: publicProcedure
      .input(z.object({ confirm: z.literal('DELETE_ALL_MEMORY') }))
      .mutation(async ({ input }) => {
        if (input.confirm !== 'DELETE_ALL_MEMORY') {
          throw new Error('Invalid confirmation');
        }
        const memory = getMemoryService();
        await memory.clearAllMemory();
        return { success: true, message: 'All memory cleared' };
      }),
  },
  
  // Search endpoints
  search: {
    // Smart search across all indexed content
    smartSearch: publicProcedure
      .input(z.object({
        query: z.string(),
        type: z.enum(['all', 'documentation', 'code', 'pattern', 'error']).default('all'),
        limit: z.number().optional().default(10)
      }))
      .query(async ({ input }) => {
        try {
          const results = await searchService.search(input.query, input.type);
          
          return {
            success: true,
            results: results.slice(0, input.limit),
            count: results.length,
            query: input.query,
            type: input.type
          };
        } catch (error) {
          logger.error('Search error:', error);
          return {
            success: false,
            results: [],
            count: 0,
            error: error.message
          };
        }
      }),
    
    // Get search suggestions based on partial query
    getSuggestions: publicProcedure
      .input(z.object({
        query: z.string(),
        limit: z.number().optional().default(5)
      }))
      .query(async ({ input }) => {
        // For now, return common search terms
        const suggestions = [
          'token extraction',
          'component generation',
          'real-time sync',
          'error handling',
          'design patterns'
        ].filter(s => s.toLowerCase().includes(input.query.toLowerCase()));
        
        return {
          success: true,
          suggestions: suggestions.slice(0, input.limit)
        };
      })
  }
});

export type AppRouter = typeof figmaRouter;