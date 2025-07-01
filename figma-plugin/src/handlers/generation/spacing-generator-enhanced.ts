/**
 * Enhanced Spacing System Generator
 * Generates spacing scales with pause/resume support and codebase extraction
 */

import { operationQueue } from '../../lib/operation-queue';
import { syncStateManager } from '../../lib/sync-state-manager';
import { figmaLogger, logger } from '../../lib/figma-logger';
import { MessageType } from '../../types/messages';

interface SpacingToken {
  name: string;
  value: number;
  scale: number;
  description?: string;
  cssVariable?: string;
  tailwindClass?: string;
  remValue?: string;
}

interface SpacingCategory {
  name: string;
  description: string;
  tokens: SpacingToken[];
}

interface ExtractedSpacing {
  cssVariables: Record<string, string>;
  tailwindConfig: Record<string, any>;
  componentSpacing: Record<string, any>;
  gridSystems: GridSystem[];
}

interface GridSystem {
  name: string;
  columns: number;
  gap: number;
  breakpoint?: string;
  maxWidth?: number;
}

interface GenerationOptions {
  extractFromCode?: boolean;
  baseUnit?: number;
  scaleType?: 'linear' | 'exponential' | 'fibonacci' | 'custom';
  customScale?: number[];
  includeNegative?: boolean;
  includeComponents?: boolean;
  includeGrids?: boolean;
  generateVariables?: boolean;
}

/**
 * Enhanced spacing system generator with operation tracking
 */
export class SpacingSystemGenerator {
  private operationId?: string;
  private checkpoint?: any;
  private baseUnit: number = 4;

  /**
   * Generate spacing system with progress tracking
   */
  async generate(options: GenerationOptions = {}): Promise<void> {
    // Add to operation queue
    const queueId = await operationQueue.addOperation(
      'spacing-generation',
      this.executeGeneration.bind(this, options),
      {
        priority: 'high',
        data: options,
        onProgress: (progress) => {
          figma.ui.postMessage({
            type: MessageType.LOADING,
            data: { 
              message: `Generating spacing system... ${progress}%`,
              progress 
            }
          });
        },
        onComplete: () => {
          figma.ui.postMessage({
            type: MessageType.PAGES_GENERATED,
            data: { message: 'Spacing system generated successfully!' }
          });
        },
        onError: (error) => {
          figma.ui.postMessage({
            type: MessageType.ERROR,
            data: { message: error.message }
          });
        }
      }
    );

    this.operationId = queueId;
  }

  /**
   * Execute spacing generation
   */
  private async executeGeneration(options: GenerationOptions): Promise<void> {
    try {
      this.baseUnit = options.baseUnit || 4;

      // Check for checkpoint
      const checkpoint = await syncStateManager.getCheckpoint(this.operationId!);
      if (checkpoint) {
        logger.generation.info('Resuming spacing generation from checkpoint', checkpoint);
        this.checkpoint = checkpoint;
      }

      // Step 1: Extract spacing from codebase (25%)
      if (!this.checkpoint?.extractionComplete && options.extractFromCode) {
        await this.updateProgress(10, 'Extracting spacing from codebase...');
        const extracted = await this.extractFromCodebase();
        await this.saveCheckpoint({ extractionComplete: true, extracted });
        await this.updateProgress(25);
      }

      // Step 2: Generate spacing scales (45%)
      if (!this.checkpoint?.scalesGenerated) {
        await this.updateProgress(30, 'Generating spacing scales...');
        const scales = await this.generateScales(options);
        await this.saveCheckpoint({ 
          ...this.checkpoint,
          scalesGenerated: true, 
          scales 
        });
        await this.updateProgress(45);
      }

      // Step 3: Create Figma page and visualizations (65%)
      if (!this.checkpoint?.pageCreated) {
        await this.updateProgress(50, 'Creating spacing page...');
        const page = await this.createSpacingPage();
        await this.saveCheckpoint({ 
          ...this.checkpoint,
          pageCreated: true, 
          pageId: page.id 
        });
        await this.updateProgress(65);
      }

      // Step 4: Create spacing components (80%)
      if (!this.checkpoint?.componentsCreated && options.includeComponents !== false) {
        await this.updateProgress(70, 'Creating spacing components...');
        await this.createSpacingComponents(this.checkpoint?.scales || []);
        await this.saveCheckpoint({ 
          ...this.checkpoint,
          componentsCreated: true 
        });
        await this.updateProgress(80);
      }

      // Step 5: Create grid systems (90%)
      if (!this.checkpoint?.gridsCreated && options.includeGrids !== false) {
        await this.updateProgress(85, 'Creating grid systems...');
        await this.createGridSystems(this.checkpoint?.extracted?.gridSystems || []);
        await this.saveCheckpoint({ 
          ...this.checkpoint,
          gridsCreated: true 
        });
        await this.updateProgress(90);
      }

      // Step 6: Generate variables (100%)
      if (!this.checkpoint?.variablesCreated && options.generateVariables !== false) {
        await this.updateProgress(95, 'Creating spacing variables...');
        await this.createSpacingVariables(this.checkpoint?.scales || []);
        await this.saveCheckpoint({ 
          ...this.checkpoint,
          variablesCreated: true 
        });
        await this.updateProgress(100);
      }

      // Clear checkpoint on completion
      this.checkpoint = null;

    } catch (error) {
      logger.generation.error('Spacing generation failed', error);
      throw error;
    }
  }

  /**
   * Extract spacing from codebase
   */
  private async extractFromCodebase(): Promise<ExtractedSpacing> {
    return figmaLogger.measurePerformance(
      'Extract spacing from codebase',
      'EXTRACTION',
      async () => {
        // Simulate MCP call to extract spacing
        await this.simulateAsyncWork(2000);

        return {
          cssVariables: {
            '--spacing-0': '0',
            '--spacing-1': '0.25rem',
            '--spacing-2': '0.5rem',
            '--spacing-3': '0.75rem',
            '--spacing-4': '1rem',
            '--spacing-5': '1.25rem',
            '--spacing-6': '1.5rem',
            '--spacing-8': '2rem',
            '--spacing-10': '2.5rem',
            '--spacing-12': '3rem',
            '--spacing-16': '4rem',
            '--spacing-20': '5rem',
            '--spacing-24': '6rem',
            '--spacing-32': '8rem',
            '--spacing-40': '10rem',
            '--spacing-48': '12rem',
            '--spacing-56': '14rem',
            '--spacing-64': '16rem',
          },
          tailwindConfig: {
            spacing: {
              px: '1px',
              0: '0px',
              0.5: '0.125rem',
              1: '0.25rem',
              1.5: '0.375rem',
              2: '0.5rem',
              2.5: '0.625rem',
              3: '0.75rem',
              3.5: '0.875rem',
              4: '1rem',
              5: '1.25rem',
              6: '1.5rem',
              7: '1.75rem',
              8: '2rem',
              9: '2.25rem',
              10: '2.5rem',
              11: '2.75rem',
              12: '3rem',
              14: '3.5rem',
              16: '4rem',
              20: '5rem',
              24: '6rem',
              28: '7rem',
              32: '8rem',
              36: '9rem',
              40: '10rem',
              44: '11rem',
              48: '12rem',
              52: '13rem',
              56: '14rem',
              60: '15rem',
              64: '16rem',
              72: '18rem',
              80: '20rem',
              96: '24rem',
            }
          },
          componentSpacing: {
            button: {
              paddingX: '1rem',
              paddingY: '0.5rem',
              gap: '0.5rem'
            },
            card: {
              padding: '1.5rem',
              gap: '1rem'
            },
            form: {
              inputPadding: '0.75rem',
              labelGap: '0.5rem',
              fieldGap: '1.5rem'
            },
            modal: {
              padding: '2rem',
              headerGap: '1rem',
              footerGap: '1rem'
            },
            nav: {
              itemGap: '1rem',
              padding: '1rem'
            }
          },
          gridSystems: [
            {
              name: 'Mobile Grid',
              columns: 4,
              gap: 16,
              breakpoint: 'sm',
              maxWidth: 640
            },
            {
              name: 'Tablet Grid',
              columns: 8,
              gap: 24,
              breakpoint: 'md',
              maxWidth: 768
            },
            {
              name: 'Desktop Grid',
              columns: 12,
              gap: 32,
              breakpoint: 'lg',
              maxWidth: 1280
            }
          ]
        };
      },
      this.operationId
    );
  }

  /**
   * Generate spacing scales
   */
  private async generateScales(options: GenerationOptions): Promise<SpacingCategory[]> {
    const scaleType = options.scaleType || 'linear';
    const includeNegative = options.includeNegative || false;

    const categories: SpacingCategory[] = [];

    // Core spacing scale
    const coreTokens = this.generateCoreScale(scaleType, options.customScale);
    categories.push({
      name: 'Core Spacing',
      description: 'Base spacing units for consistent layouts',
      tokens: coreTokens
    });

    // Component spacing
    categories.push({
      name: 'Component Spacing',
      description: 'Common spacing for UI components',
      tokens: this.generateComponentSpacing()
    });

    // Layout spacing
    categories.push({
      name: 'Layout Spacing',
      description: 'Spacing for page layouts and grids',
      tokens: this.generateLayoutSpacing()
    });

    // Negative spacing (if requested)
    if (includeNegative) {
      categories.push({
        name: 'Negative Spacing',
        description: 'Negative values for positioning adjustments',
        tokens: this.generateNegativeSpacing(coreTokens)
      });
    }

    // Fractional spacing
    categories.push({
      name: 'Fractional Spacing',
      description: 'Sub-unit spacing for fine adjustments',
      tokens: this.generateFractionalSpacing()
    });

    return categories;
  }

  /**
   * Generate core spacing scale
   */
  private generateCoreScale(type: string, customScale?: number[]): SpacingToken[] {
    const tokens: SpacingToken[] = [];
    
    if (customScale) {
      // Use custom scale
      customScale.forEach((value, index) => {
        tokens.push({
          name: `space-${index}`,
          value: value * this.baseUnit,
          scale: value,
          remValue: `${(value * this.baseUnit) / 16}rem`,
          tailwindClass: `spacing-${index}`,
          cssVariable: `--spacing-${index}`
        });
      });
    } else {
      // Generate based on type
      const scales = this.getScaleValues(type);
      scales.forEach((scale, index) => {
        const value = scale * this.baseUnit;
        tokens.push({
          name: `space-${scale}`,
          value,
          scale,
          remValue: `${value / 16}rem`,
          tailwindClass: this.getTailwindClass(scale),
          cssVariable: `--spacing-${scale}`,
          description: this.getSpacingDescription(scale)
        });
      });
    }

    return tokens;
  }

  /**
   * Get scale values based on type
   */
  private getScaleValues(type: string): number[] {
    switch (type) {
      case 'exponential':
        return [0, 0.5, 1, 2, 4, 8, 16, 32, 64, 128];
      case 'fibonacci':
        return [0, 1, 2, 3, 5, 8, 13, 21, 34, 55];
      case 'linear':
      default:
        return [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96];
    }
  }

  /**
   * Get Tailwind class for scale
   */
  private getTailwindClass(scale: number): string {
    const tailwindMap: Record<number, string> = {
      0: 'spacing-0',
      0.5: 'spacing-0.5',
      1: 'spacing-1',
      2: 'spacing-2',
      3: 'spacing-3',
      4: 'spacing-4',
      5: 'spacing-5',
      6: 'spacing-6',
      8: 'spacing-8',
      10: 'spacing-10',
      12: 'spacing-12',
      16: 'spacing-16',
      20: 'spacing-20',
      24: 'spacing-24',
      32: 'spacing-32',
      40: 'spacing-40',
      48: 'spacing-48',
      64: 'spacing-64',
      80: 'spacing-80',
      96: 'spacing-96'
    };
    return tailwindMap[scale] || `spacing-${scale}`;
  }

  /**
   * Get spacing description
   */
  private getSpacingDescription(scale: number): string {
    if (scale === 0) return 'No spacing';
    if (scale <= 1) return 'Micro spacing';
    if (scale <= 2) return 'Extra small spacing';
    if (scale <= 4) return 'Small spacing';
    if (scale <= 8) return 'Medium spacing';
    if (scale <= 16) return 'Large spacing';
    if (scale <= 32) return 'Extra large spacing';
    if (scale <= 64) return 'Huge spacing';
    return 'Massive spacing';
  }

  /**
   * Generate component spacing
   */
  private generateComponentSpacing(): SpacingToken[] {
    return [
      {
        name: 'button-padding-x',
        value: 16,
        scale: 4,
        remValue: '1rem',
        description: 'Horizontal button padding',
        tailwindClass: 'px-4',
        cssVariable: '--button-padding-x'
      },
      {
        name: 'button-padding-y',
        value: 8,
        scale: 2,
        remValue: '0.5rem',
        description: 'Vertical button padding',
        tailwindClass: 'py-2',
        cssVariable: '--button-padding-y'
      },
      {
        name: 'input-padding',
        value: 12,
        scale: 3,
        remValue: '0.75rem',
        description: 'Input field padding',
        tailwindClass: 'p-3',
        cssVariable: '--input-padding'
      },
      {
        name: 'card-padding',
        value: 24,
        scale: 6,
        remValue: '1.5rem',
        description: 'Card content padding',
        tailwindClass: 'p-6',
        cssVariable: '--card-padding'
      },
      {
        name: 'modal-padding',
        value: 32,
        scale: 8,
        remValue: '2rem',
        description: 'Modal content padding',
        tailwindClass: 'p-8',
        cssVariable: '--modal-padding'
      },
      {
        name: 'section-spacing',
        value: 64,
        scale: 16,
        remValue: '4rem',
        description: 'Between sections',
        tailwindClass: 'spacing-16',
        cssVariable: '--section-spacing'
      },
      {
        name: 'stack-spacing',
        value: 16,
        scale: 4,
        remValue: '1rem',
        description: 'Vertical stack spacing',
        tailwindClass: 'space-y-4',
        cssVariable: '--stack-spacing'
      },
      {
        name: 'inline-spacing',
        value: 8,
        scale: 2,
        remValue: '0.5rem',
        description: 'Inline element spacing',
        tailwindClass: 'space-x-2',
        cssVariable: '--inline-spacing'
      }
    ];
  }

  /**
   * Generate layout spacing
   */
  private generateLayoutSpacing(): SpacingToken[] {
    return [
      {
        name: 'grid-gap-sm',
        value: 16,
        scale: 4,
        remValue: '1rem',
        description: 'Small grid gap',
        tailwindClass: 'gap-4',
        cssVariable: '--grid-gap-sm'
      },
      {
        name: 'grid-gap-md',
        value: 24,
        scale: 6,
        remValue: '1.5rem',
        description: 'Medium grid gap',
        tailwindClass: 'gap-6',
        cssVariable: '--grid-gap-md'
      },
      {
        name: 'grid-gap-lg',
        value: 32,
        scale: 8,
        remValue: '2rem',
        description: 'Large grid gap',
        tailwindClass: 'gap-8',
        cssVariable: '--grid-gap-lg'
      },
      {
        name: 'container-padding-mobile',
        value: 16,
        scale: 4,
        remValue: '1rem',
        description: 'Mobile container padding',
        tailwindClass: 'px-4',
        cssVariable: '--container-padding-mobile'
      },
      {
        name: 'container-padding-tablet',
        value: 32,
        scale: 8,
        remValue: '2rem',
        description: 'Tablet container padding',
        tailwindClass: 'px-8',
        cssVariable: '--container-padding-tablet'
      },
      {
        name: 'container-padding-desktop',
        value: 64,
        scale: 16,
        remValue: '4rem',
        description: 'Desktop container padding',
        tailwindClass: 'px-16',
        cssVariable: '--container-padding-desktop'
      }
    ];
  }

  /**
   * Generate negative spacing
   */
  private generateNegativeSpacing(coreTokens: SpacingToken[]): SpacingToken[] {
    return coreTokens
      .filter(token => token.value > 0 && token.value <= 64)
      .map(token => ({
        ...token,
        name: `-${token.name}`,
        value: -token.value,
        scale: -token.scale,
        remValue: `-${token.remValue}`,
        tailwindClass: `-${token.tailwindClass}`,
        cssVariable: `--negative-${token.name}`,
        description: `Negative ${token.description || 'spacing'}`
      }));
  }

  /**
   * Generate fractional spacing
   */
  private generateFractionalSpacing(): SpacingToken[] {
    return [
      {
        name: 'space-0.5',
        value: 2,
        scale: 0.5,
        remValue: '0.125rem',
        description: 'Half unit spacing',
        tailwindClass: 'spacing-0.5',
        cssVariable: '--spacing-0-5'
      },
      {
        name: 'space-1.5',
        value: 6,
        scale: 1.5,
        remValue: '0.375rem',
        description: 'One and half unit spacing',
        tailwindClass: 'spacing-1.5',
        cssVariable: '--spacing-1-5'
      },
      {
        name: 'space-2.5',
        value: 10,
        scale: 2.5,
        remValue: '0.625rem',
        description: 'Two and half unit spacing',
        tailwindClass: 'spacing-2.5',
        cssVariable: '--spacing-2-5'
      },
      {
        name: 'space-3.5',
        value: 14,
        scale: 3.5,
        remValue: '0.875rem',
        description: 'Three and half unit spacing',
        tailwindClass: 'spacing-3.5',
        cssVariable: '--spacing-3-5'
      }
    ];
  }

  /**
   * Create spacing page in Figma
   */
  private async createSpacingPage(): Promise<PageNode> {
    // Implementation would create the actual Figma page
    await this.simulateAsyncWork(1000);
    return {} as PageNode;
  }

  /**
   * Create spacing components
   */
  private async createSpacingComponents(categories: SpacingCategory[]): Promise<void> {
    // Implementation would create actual spacing components
    await this.simulateAsyncWork(1500);
  }

  /**
   * Create grid systems
   */
  private async createGridSystems(gridSystems: GridSystem[]): Promise<void> {
    // Implementation would create grid system examples
    await this.simulateAsyncWork(1000);
  }

  /**
   * Create spacing variables
   */
  private async createSpacingVariables(categories: SpacingCategory[]): Promise<void> {
    // Implementation would create Figma variables
    await this.simulateAsyncWork(500);
  }

  /**
   * Update operation progress
   */
  private async updateProgress(progress: number, message?: string): Promise<void> {
    if (this.operationId) {
      syncStateManager.updateProgress(this.operationId, progress);
      if (message) {
        logger.generation.info(message, { operationId: this.operationId, progress });
      }
    }
  }

  /**
   * Save checkpoint
   */
  private async saveCheckpoint(checkpoint: any): Promise<void> {
    if (this.operationId) {
      syncStateManager.updateProgress(
        this.operationId, 
        this.checkpoint?.progress || 0, 
        checkpoint
      );
      this.checkpoint = checkpoint;
    }
  }

  /**
   * Simulate async work (for testing)
   */
  private async simulateAsyncWork(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }
}

// Export singleton instance
export const spacingGenerator = new SpacingSystemGenerator();