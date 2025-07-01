/**
 * Enhanced Typography System Generator
 * Generates typography scales with pause/resume support and codebase extraction
 */

import { operationQueue } from '../../lib/operation-queue';
import { syncStateManager } from '../../lib/sync-state-manager';
import { figmaLogger, logger } from '../../lib/figma-logger';
import { MessageType } from '../../types/messages';

interface TypographyScale {
  name: string;
  fontSize: number;
  lineHeight: number | 'auto';
  fontWeight: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontFamily?: string;
  cssVariable?: string;
  tailwindClass?: string;
}

interface TypographyCategory {
  name: string;
  description: string;
  scales: TypographyScale[];
}

interface ExtractedTypography {
  cssVariables: Record<string, any>;
  tailwindConfig: Record<string, any>;
  componentStyles: Record<string, any>;
}

interface GenerationOptions {
  extractFromCode?: boolean;
  includeResponsive?: boolean;
  createVariants?: boolean;
  fontFamilies?: string[];
  baseSize?: number;
  scale?: number;
}

/**
 * Enhanced typography system generator with operation tracking
 */
export class TypographySystemGenerator {
  private operationId?: string;
  private checkpoint?: any;

  /**
   * Generate typography system with progress tracking
   */
  async generate(options: GenerationOptions = {}): Promise<void> {
    // Add to operation queue
    const queueId = await operationQueue.addOperation(
      'typography-generation',
      this.executeGeneration.bind(this, options),
      {
        priority: 'high',
        data: options,
        onProgress: (progress) => {
          figma.ui.postMessage({
            type: MessageType.LOADING,
            data: { 
              message: `Generating typography system... ${progress}%`,
              progress 
            }
          });
        },
        onComplete: () => {
          figma.ui.postMessage({
            type: MessageType.PAGES_GENERATED,
            data: { message: 'Typography system generated successfully!' }
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
   * Execute typography generation
   */
  private async executeGeneration(options: GenerationOptions): Promise<void> {
    try {
      // Check for checkpoint
      const checkpoint = await syncStateManager.getCheckpoint(this.operationId!);
      if (checkpoint) {
        logger.generation.info('Resuming typography generation from checkpoint', checkpoint);
        this.checkpoint = checkpoint;
      }

      // Step 1: Extract typography from codebase (30%)
      if (!this.checkpoint?.extractionComplete && options.extractFromCode) {
        await this.updateProgress(10, 'Extracting typography from codebase...');
        const extracted = await this.extractFromCodebase();
        await this.saveCheckpoint({ extractionComplete: true, extracted });
        await this.updateProgress(30);
      }

      // Step 2: Generate typography scales (50%)
      if (!this.checkpoint?.scalesGenerated) {
        await this.updateProgress(35, 'Generating typography scales...');
        const scales = await this.generateScales(options);
        await this.saveCheckpoint({ 
          ...this.checkpoint,
          scalesGenerated: true, 
          scales 
        });
        await this.updateProgress(50);
      }

      // Step 3: Create Figma page and frames (70%)
      if (!this.checkpoint?.pageCreated) {
        await this.updateProgress(55, 'Creating typography page...');
        const page = await this.createTypographyPage();
        await this.saveCheckpoint({ 
          ...this.checkpoint,
          pageCreated: true, 
          pageId: page.id 
        });
        await this.updateProgress(70);
      }

      // Step 4: Generate text styles (85%)
      if (!this.checkpoint?.stylesCreated) {
        await this.updateProgress(75, 'Creating text styles...');
        await this.createTextStyles(this.checkpoint?.scales || []);
        await this.saveCheckpoint({ 
          ...this.checkpoint,
          stylesCreated: true 
        });
        await this.updateProgress(85);
      }

      // Step 5: Create documentation (100%)
      if (!this.checkpoint?.documentationCreated) {
        await this.updateProgress(90, 'Creating documentation...');
        await this.createDocumentation();
        await this.saveCheckpoint({ 
          ...this.checkpoint,
          documentationCreated: true 
        });
        await this.updateProgress(100);
      }

      // Clear checkpoint on completion
      this.checkpoint = null;

    } catch (error) {
      logger.generation.error('Typography generation failed', error);
      throw error;
    }
  }

  /**
   * Extract typography from codebase
   */
  private async extractFromCodebase(): Promise<ExtractedTypography> {
    return figmaLogger.measurePerformance(
      'Extract typography from codebase',
      'EXTRACTION',
      async () => {
        // Simulate MCP call to extract typography
        // In real implementation, this would call MCP server
        await this.simulateAsyncWork(2000);

        return {
          cssVariables: {
            '--font-size-xs': '0.75rem',
            '--font-size-sm': '0.875rem',
            '--font-size-base': '1rem',
            '--font-size-lg': '1.125rem',
            '--font-size-xl': '1.25rem',
            '--font-size-2xl': '1.5rem',
            '--font-size-3xl': '1.875rem',
            '--font-size-4xl': '2.25rem',
            '--font-size-5xl': '3rem',
            '--font-size-6xl': '3.75rem',
            '--font-size-7xl': '4.5rem',
            '--font-size-8xl': '6rem',
            '--font-size-9xl': '8rem',
          },
          tailwindConfig: {
            fontSize: {
              xs: ['0.75rem', { lineHeight: '1rem' }],
              sm: ['0.875rem', { lineHeight: '1.25rem' }],
              base: ['1rem', { lineHeight: '1.5rem' }],
              lg: ['1.125rem', { lineHeight: '1.75rem' }],
              xl: ['1.25rem', { lineHeight: '1.75rem' }],
              '2xl': ['1.5rem', { lineHeight: '2rem' }],
              '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
              '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
              '5xl': ['3rem', { lineHeight: '1' }],
              '6xl': ['3.75rem', { lineHeight: '1' }],
              '7xl': ['4.5rem', { lineHeight: '1' }],
              '8xl': ['6rem', { lineHeight: '1' }],
              '9xl': ['8rem', { lineHeight: '1' }],
            }
          },
          componentStyles: {
            h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 },
            h2: { fontSize: '1.875rem', fontWeight: 600, lineHeight: 1.3 },
            h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
            h4: { fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.5 },
            h5: { fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.5 },
            h6: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
            body: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },
            small: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
            code: { fontSize: '0.875rem', fontWeight: 400, fontFamily: 'monospace' }
          }
        };
      },
      this.operationId
    );
  }

  /**
   * Generate typography scales
   */
  private async generateScales(options: GenerationOptions): Promise<TypographyCategory[]> {
    const baseSize = options.baseSize || 16;
    const scale = options.scale || 1.25;
    const families = options.fontFamilies || ['Inter', 'system-ui'];

    const categories: TypographyCategory[] = [
      {
        name: 'Display',
        description: 'Large display text for hero sections',
        scales: this.generateDisplayScales(baseSize, scale, families[0])
      },
      {
        name: 'Headings',
        description: 'Section headings and titles',
        scales: this.generateHeadingScales(baseSize, scale, families[0])
      },
      {
        name: 'Body',
        description: 'Body text and paragraphs',
        scales: this.generateBodyScales(baseSize, families[0])
      },
      {
        name: 'UI Text',
        description: 'Interface labels and controls',
        scales: this.generateUIScales(baseSize, families[0])
      },
      {
        name: 'Code',
        description: 'Monospace text for code',
        scales: this.generateCodeScales(baseSize)
      }
    ];

    // Add responsive variants if requested
    if (options.includeResponsive) {
      categories.push({
        name: 'Responsive',
        description: 'Responsive typography scales',
        scales: this.generateResponsiveScales(baseSize, scale, families[0])
      });
    }

    return categories;
  }

  /**
   * Generate display scales
   */
  private generateDisplayScales(baseSize: number, scale: number, fontFamily: string): TypographyScale[] {
    return [
      {
        name: 'Display 2XL',
        fontSize: Math.round(baseSize * Math.pow(scale, 8)),
        lineHeight: 1.0,
        fontWeight: 800,
        fontFamily,
        tailwindClass: 'text-8xl'
      },
      {
        name: 'Display XL',
        fontSize: Math.round(baseSize * Math.pow(scale, 7)),
        lineHeight: 1.1,
        fontWeight: 700,
        fontFamily,
        tailwindClass: 'text-7xl'
      },
      {
        name: 'Display LG',
        fontSize: Math.round(baseSize * Math.pow(scale, 6)),
        lineHeight: 1.1,
        fontWeight: 700,
        fontFamily,
        tailwindClass: 'text-6xl'
      },
      {
        name: 'Display MD',
        fontSize: Math.round(baseSize * Math.pow(scale, 5)),
        lineHeight: 1.2,
        fontWeight: 600,
        fontFamily,
        tailwindClass: 'text-5xl'
      },
      {
        name: 'Display SM',
        fontSize: Math.round(baseSize * Math.pow(scale, 4)),
        lineHeight: 1.2,
        fontWeight: 600,
        fontFamily,
        tailwindClass: 'text-4xl'
      }
    ];
  }

  /**
   * Generate heading scales
   */
  private generateHeadingScales(baseSize: number, scale: number, fontFamily: string): TypographyScale[] {
    return [
      {
        name: 'Heading 1',
        fontSize: Math.round(baseSize * Math.pow(scale, 3)),
        lineHeight: 1.25,
        fontWeight: 600,
        fontFamily,
        tailwindClass: 'text-3xl',
        cssVariable: '--heading-1'
      },
      {
        name: 'Heading 2',
        fontSize: Math.round(baseSize * Math.pow(scale, 2.5)),
        lineHeight: 1.3,
        fontWeight: 600,
        fontFamily,
        tailwindClass: 'text-2xl',
        cssVariable: '--heading-2'
      },
      {
        name: 'Heading 3',
        fontSize: Math.round(baseSize * Math.pow(scale, 2)),
        lineHeight: 1.35,
        fontWeight: 600,
        fontFamily,
        tailwindClass: 'text-xl',
        cssVariable: '--heading-3'
      },
      {
        name: 'Heading 4',
        fontSize: Math.round(baseSize * Math.pow(scale, 1.5)),
        lineHeight: 1.4,
        fontWeight: 500,
        fontFamily,
        tailwindClass: 'text-lg',
        cssVariable: '--heading-4'
      },
      {
        name: 'Heading 5',
        fontSize: Math.round(baseSize * scale),
        lineHeight: 1.5,
        fontWeight: 500,
        fontFamily,
        tailwindClass: 'text-base',
        cssVariable: '--heading-5'
      },
      {
        name: 'Heading 6',
        fontSize: baseSize,
        lineHeight: 1.5,
        fontWeight: 500,
        fontFamily,
        tailwindClass: 'text-base',
        cssVariable: '--heading-6'
      }
    ];
  }

  /**
   * Generate body scales
   */
  private generateBodyScales(baseSize: number, fontFamily: string): TypographyScale[] {
    return [
      {
        name: 'Body XL',
        fontSize: Math.round(baseSize * 1.25),
        lineHeight: 1.6,
        fontWeight: 400,
        fontFamily,
        tailwindClass: 'text-xl'
      },
      {
        name: 'Body LG',
        fontSize: Math.round(baseSize * 1.125),
        lineHeight: 1.6,
        fontWeight: 400,
        fontFamily,
        tailwindClass: 'text-lg'
      },
      {
        name: 'Body MD',
        fontSize: baseSize,
        lineHeight: 1.5,
        fontWeight: 400,
        fontFamily,
        tailwindClass: 'text-base',
        cssVariable: '--body-text'
      },
      {
        name: 'Body SM',
        fontSize: Math.round(baseSize * 0.875),
        lineHeight: 1.5,
        fontWeight: 400,
        fontFamily,
        tailwindClass: 'text-sm'
      },
      {
        name: 'Body XS',
        fontSize: Math.round(baseSize * 0.75),
        lineHeight: 1.5,
        fontWeight: 400,
        fontFamily,
        tailwindClass: 'text-xs'
      }
    ];
  }

  /**
   * Generate UI scales
   */
  private generateUIScales(baseSize: number, fontFamily: string): TypographyScale[] {
    return [
      {
        name: 'Label LG',
        fontSize: Math.round(baseSize * 0.875),
        lineHeight: 1.4,
        fontWeight: 500,
        fontFamily,
        tailwindClass: 'text-sm font-medium'
      },
      {
        name: 'Label MD',
        fontSize: Math.round(baseSize * 0.8125),
        lineHeight: 1.4,
        fontWeight: 500,
        fontFamily,
        tailwindClass: 'text-sm font-medium'
      },
      {
        name: 'Label SM',
        fontSize: Math.round(baseSize * 0.75),
        lineHeight: 1.3,
        fontWeight: 500,
        fontFamily,
        tailwindClass: 'text-xs font-medium'
      },
      {
        name: 'Caption',
        fontSize: Math.round(baseSize * 0.75),
        lineHeight: 1.4,
        fontWeight: 400,
        fontFamily,
        tailwindClass: 'text-xs'
      },
      {
        name: 'Overline',
        fontSize: Math.round(baseSize * 0.6875),
        lineHeight: 1.3,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily,
        tailwindClass: 'text-xs uppercase tracking-wider'
      }
    ];
  }

  /**
   * Generate code scales
   */
  private generateCodeScales(baseSize: number): TypographyScale[] {
    return [
      {
        name: 'Code LG',
        fontSize: baseSize,
        lineHeight: 1.5,
        fontWeight: 400,
        fontFamily: 'monospace',
        tailwindClass: 'font-mono text-base'
      },
      {
        name: 'Code MD',
        fontSize: Math.round(baseSize * 0.875),
        lineHeight: 1.5,
        fontWeight: 400,
        fontFamily: 'monospace',
        tailwindClass: 'font-mono text-sm'
      },
      {
        name: 'Code SM',
        fontSize: Math.round(baseSize * 0.8125),
        lineHeight: 1.5,
        fontWeight: 400,
        fontFamily: 'monospace',
        tailwindClass: 'font-mono text-xs'
      }
    ];
  }

  /**
   * Generate responsive scales
   */
  private generateResponsiveScales(baseSize: number, scale: number, fontFamily: string): TypographyScale[] {
    return [
      {
        name: 'Responsive Display',
        fontSize: Math.round(baseSize * Math.pow(scale, 4)),
        lineHeight: 1.2,
        fontWeight: 700,
        fontFamily,
        tailwindClass: 'text-3xl md:text-4xl lg:text-5xl xl:text-6xl'
      },
      {
        name: 'Responsive Heading',
        fontSize: Math.round(baseSize * Math.pow(scale, 2)),
        lineHeight: 1.3,
        fontWeight: 600,
        fontFamily,
        tailwindClass: 'text-xl md:text-2xl lg:text-3xl'
      },
      {
        name: 'Responsive Body',
        fontSize: baseSize,
        lineHeight: 1.5,
        fontWeight: 400,
        fontFamily,
        tailwindClass: 'text-sm md:text-base lg:text-lg'
      }
    ];
  }

  /**
   * Create typography page in Figma
   */
  private async createTypographyPage(): Promise<PageNode> {
    // Implementation would create the actual Figma page
    // This is a placeholder for the actual implementation
    await this.simulateAsyncWork(1000);
    return {} as PageNode;
  }

  /**
   * Create text styles in Figma
   */
  private async createTextStyles(categories: TypographyCategory[]): Promise<void> {
    // Implementation would create actual text styles
    await this.simulateAsyncWork(1500);
  }

  /**
   * Create documentation
   */
  private async createDocumentation(): Promise<void> {
    // Implementation would create documentation frames
    await this.simulateAsyncWork(1000);
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
export const typographyGenerator = new TypographySystemGenerator();