/**
 * Batch Processor Utility
 * Prevents plugin freezing by processing large operations in chunks
 * Based on Figma's recommendations for avoiding frozen plugins
 */

export interface BatchProcessOptions {
  batchSize?: number;
  delayMs?: number;
  onProgress?: (progress: number, total: number) => void;
  onBatchComplete?: (batchIndex: number) => void;
}

/**
 * Process items in batches with yielding to prevent UI freezing
 * @param items Array of items to process
 * @param processor Function to process each item
 * @param options Batch processing options
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R> | R,
  options: BatchProcessOptions = {}
): Promise<R[]> {
  const {
    batchSize = 10,
    delayMs = 0,
    onProgress,
    onBatchComplete
  } = options;

  const results: R[] = [];
  const totalItems = items.length;
  
  // Process items in chunks
  for (let i = 0; i < totalItems; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, totalItems));
    const batchIndex = Math.floor(i / batchSize);
    
    // Process current batch
    const batchResults = await Promise.all(
      batch.map((item, index) => processor(item, i + index))
    );
    
    results.push(...batchResults);
    
    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, totalItems), totalItems);
    }
    
    // Batch complete callback
    if (onBatchComplete) {
      onBatchComplete(batchIndex);
    }
    
    // Yield to main thread to prevent freezing
    if (i + batchSize < totalItems && delayMs > 0) {
      await delay(delayMs);
    }
  }
  
  return results;
}

/**
 * Process items sequentially with yielding
 * Use for operations that must be performed in order
 */
export async function processSequentially<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R> | R,
  options: BatchProcessOptions = {}
): Promise<R[]> {
  const {
    batchSize = 5,
    delayMs = 0,
    onProgress
  } = options;

  const results: R[] = [];
  const totalItems = items.length;
  
  for (let i = 0; i < totalItems; i++) {
    const result = await processor(items[i], i);
    results.push(result);
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, totalItems);
    }
    
    // Yield periodically
    if ((i + 1) % batchSize === 0 && i + 1 < totalItems && delayMs > 0) {
      await delay(delayMs);
    }
  }
  
  return results;
}

/**
 * Process large collections with automatic chunking
 * Determines optimal batch size based on collection size
 */
export async function processLargeCollection<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R> | R,
  onProgress?: (progress: number, total: number) => void
): Promise<R[]> {
  const totalItems = items.length;
  
  // Determine optimal batch size
  let batchSize: number;
  let delayMs: number;
  
  if (totalItems < 50) {
    batchSize = 10;
    delayMs = 0;
  } else if (totalItems < 200) {
    batchSize = 20;
    delayMs = 10;
  } else if (totalItems < 1000) {
    batchSize = 50;
    delayMs = 20;
  } else {
    batchSize = 100;
    delayMs = 30;
  }
  
  return processBatch(items, processor, {
    batchSize,
    delayMs,
    onProgress
  });
}

/**
 * Utility to create a delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if we should yield based on time elapsed
 * Useful for long-running operations
 */
export function createYieldController(yieldIntervalMs?: number) {
  const startTime = Date.now();
  let lastYield = startTime;
  const yieldInterval = yieldIntervalMs || 100;
  
  return {
    async checkYield(): Promise<void> {
      const now = Date.now();
      if (now - lastYield > yieldInterval) {
        await delay(0); // Yield to main thread
        lastYield = Date.now();
      }
    },
    
    getElapsedTime(): number {
      return Date.now() - startTime;
    }
  };
}

export type YieldController = ReturnType<typeof createYieldController>;

/**
 * Batch operations for Figma-specific tasks
 */
export const FigmaBatchOperations = {
  /**
   * Create variables in batches
   */
  async createVariables(
    variables: { name: string; collection: VariableCollection; type: VariableResolvedDataType }[],
    onProgress?: (progress: number, total: number) => void
  ): Promise<Variable[]> {
    return processSequentially(
      variables,
      async ({ name, collection, type }) => {
        return figma.variables.createVariable(name, collection, type);
      },
      {
        batchSize: 5,
        delayMs: 10,
        onProgress
      }
    );
  },
  
  /**
   * Update variable values in batches
   */
  async updateVariableValues(
    updates: { variable: Variable; modeId: string; value: any }[],
    onProgress?: (progress: number, total: number) => void
  ): Promise<void> {
    await processSequentially(
      updates,
      async ({ variable, modeId, value }) => {
        variable.setValueForMode(modeId, value);
      },
      {
        batchSize: 10,
        delayMs: 5,
        onProgress
      }
    );
  },
  
  /**
   * Create text styles in batches
   */
  async createTextStyles(
    styles: { name: string; properties: any }[],
    onProgress?: (progress: number, total: number) => void
  ): Promise<TextStyle[]> {
    return processSequentially(
      styles,
      async ({ name, properties }) => {
        const textStyle = figma.createTextStyle();
        textStyle.name = name;
        Object.assign(textStyle, properties);
        return textStyle;
      },
      {
        batchSize: 5,
        delayMs: 10,
        onProgress
      }
    );
  },
  
  /**
   * Load fonts in batches
   */
  async loadFonts(
    fonts: { family: string; style: string }[],
    onProgress?: (progress: number, total: number) => void
  ): Promise<void> {
    await processBatch(
      fonts,
      async (font) => {
        try {
          await figma.loadFontAsync(font);
        } catch (error) {
          console.warn(`Failed to load font ${font.family} ${font.style}:`, error);
        }
      },
      {
        batchSize: 3,
        delayMs: 10,
        onProgress
      }
    );
  }
};