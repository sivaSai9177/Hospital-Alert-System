#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Token file paths - adjust these to match your project structure
const TOKEN_PATHS = {
  colors: path.resolve(__dirname, '../../../lib/design/colors.ts'),
  typography: path.resolve(__dirname, '../../../lib/design/typography.ts'),
  spacing: path.resolve(__dirname, '../../../lib/design/spacing.ts'),
  shadows: path.resolve(__dirname, '../../../lib/design/shadows.ts'),
  borderRadius: path.resolve(__dirname, '../../../lib/design/border-radius.ts'),
  // Combined tokens file (if you have one)
  combined: path.resolve(__dirname, '../../../lib/design/tokens.json'),
};

// Schemas for validation
const ColorTokenSchema = z.object({
  name: z.string(),
  value: z.string(),
  rgb: z.object({
    r: z.number(),
    g: z.number(),
    b: z.number(),
    a: z.number(),
  }).optional(),
  description: z.string().optional(),
  category: z.enum(['primary', 'secondary', 'accent', 'neutral', 'success', 'warning', 'danger', 'info']).optional(),
});

const TypographyTokenSchema = z.object({
  name: z.string(),
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.number(),
  lineHeight: z.union([z.number(), z.literal('auto')]),
  letterSpacing: z.number(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  description: z.string().optional(),
});

const SpacingTokenSchema = z.object({
  name: z.string(),
  value: z.number(),
  scale: z.number().optional(),
  description: z.string().optional(),
});

const ShadowTokenSchema = z.object({
  name: z.string(),
  value: z.array(z.object({
    color: z.string(),
    offset: z.object({ x: z.number(), y: z.number() }),
    radius: z.number(),
    spread: z.number().optional(),
    opacity: z.number().optional(),
  })),
  description: z.string().optional(),
});

const DesignTokensSchema = z.object({
  colors: z.array(ColorTokenSchema),
  typography: z.array(TypographyTokenSchema),
  spacing: z.array(SpacingTokenSchema),
  shadows: z.array(ShadowTokenSchema),
  borderRadius: z.array(z.object({
    name: z.string(),
    value: z.number(),
    description: z.string().optional(),
  })),
  version: z.string().optional(),
  lastUpdated: z.string().optional(),
});

class FigmaTokenServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'figma-token-sync',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'read-tokens',
          description: 'Read design tokens from the codebase',
          inputSchema: {
            type: 'object',
            properties: {
              tokenType: {
                type: 'string',
                enum: ['all', 'colors', 'typography', 'spacing', 'shadows', 'borderRadius'],
                description: 'Type of tokens to read',
              },
            },
          },
        },
        {
          name: 'write-tokens',
          description: 'Write design tokens to the codebase',
          inputSchema: {
            type: 'object',
            properties: {
              tokens: {
                type: 'object',
                description: 'Design tokens to write',
              },
              tokenType: {
                type: 'string',
                enum: ['all', 'colors', 'typography', 'spacing', 'shadows', 'borderRadius'],
                description: 'Type of tokens to write',
              },
            },
            required: ['tokens'],
          },
        },
        {
          name: 'sync-tokens',
          description: 'Sync tokens between Figma and codebase',
          inputSchema: {
            type: 'object',
            properties: {
              direction: {
                type: 'string',
                enum: ['figma-to-code', 'code-to-figma'],
                description: 'Sync direction',
              },
              tokens: {
                type: 'object',
                description: 'Tokens to sync (required for figma-to-code)',
              },
            },
            required: ['direction'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'read-tokens':
          return this.handleReadTokens(request.params.arguments);
        case 'write-tokens':
          return this.handleWriteTokens(request.params.arguments);
        case 'sync-tokens':
          return this.handleSyncTokens(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleReadTokens(args: any) {
    const { tokenType = 'all' } = args;
    
    try {
      // Try to read from combined tokens file first
      if (await this.fileExists(TOKEN_PATHS.combined)) {
        const content = await fs.readFile(TOKEN_PATHS.combined, 'utf-8');
        const tokens = JSON.parse(content);
        
        if (tokenType === 'all') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, tokens }, null, 2),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, tokens: { [tokenType]: tokens[tokenType] } }, null, 2),
            },
          ],
        };
      }
      
      // Otherwise, read from individual files
      const tokens: any = {};
      
      if (tokenType === 'all' || tokenType === 'colors') {
        tokens.colors = await this.readTokenFile(TOKEN_PATHS.colors, 'colors');
      }
      if (tokenType === 'all' || tokenType === 'typography') {
        tokens.typography = await this.readTokenFile(TOKEN_PATHS.typography, 'typography');
      }
      if (tokenType === 'all' || tokenType === 'spacing') {
        tokens.spacing = await this.readTokenFile(TOKEN_PATHS.spacing, 'spacing');
      }
      if (tokenType === 'all' || tokenType === 'shadows') {
        tokens.shadows = await this.readTokenFile(TOKEN_PATHS.shadows, 'shadows');
      }
      if (tokenType === 'all' || tokenType === 'borderRadius') {
        tokens.borderRadius = await this.readTokenFile(TOKEN_PATHS.borderRadius, 'borderRadius');
      }
      
      // Add metadata
      tokens.version = '1.0.0';
      tokens.lastUpdated = new Date().toISOString();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, tokens }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
      };
    }
  }

  private async handleWriteTokens(args: any) {
    const { tokens, tokenType = 'all' } = args;
    
    try {
      // Validate tokens
      const validatedTokens = DesignTokensSchema.parse(tokens);
      
      // Update timestamp
      validatedTokens.lastUpdated = new Date().toISOString();
      
      // Write to combined file if it exists
      if (await this.fileExists(TOKEN_PATHS.combined)) {
        let existingTokens = {};
        try {
          const content = await fs.readFile(TOKEN_PATHS.combined, 'utf-8');
          existingTokens = JSON.parse(content);
        } catch (e) {
          // File might be empty or invalid
        }
        
        const updatedTokens = {
          ...existingTokens,
          ...validatedTokens,
        };
        
        await fs.writeFile(
          TOKEN_PATHS.combined,
          JSON.stringify(updatedTokens, null, 2)
        );
      }
      
      // Also write to individual files if they exist
      if (tokenType === 'all' || tokenType === 'colors') {
        await this.writeTokenFile(TOKEN_PATHS.colors, validatedTokens.colors, 'colors');
      }
      if (tokenType === 'all' || tokenType === 'typography') {
        await this.writeTokenFile(TOKEN_PATHS.typography, validatedTokens.typography, 'typography');
      }
      if (tokenType === 'all' || tokenType === 'spacing') {
        await this.writeTokenFile(TOKEN_PATHS.spacing, validatedTokens.spacing, 'spacing');
      }
      if (tokenType === 'all' || tokenType === 'shadows') {
        await this.writeTokenFile(TOKEN_PATHS.shadows, validatedTokens.shadows, 'shadows');
      }
      if (tokenType === 'all' || tokenType === 'borderRadius') {
        await this.writeTokenFile(TOKEN_PATHS.borderRadius, validatedTokens.borderRadius, 'borderRadius');
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Tokens written successfully',
              tokensWritten: tokenType,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
      };
    }
  }

  private async handleSyncTokens(args: any) {
    const { direction, tokens } = args;
    
    try {
      if (direction === 'figma-to-code') {
        // Write tokens from Figma to codebase
        if (!tokens) {
          throw new Error('Tokens are required for figma-to-code sync');
        }
        
        const result = await this.handleWriteTokens({ tokens, tokenType: 'all' });
        return result;
      } else if (direction === 'code-to-figma') {
        // Read tokens from codebase for Figma
        const result = await this.handleReadTokens({ tokenType: 'all' });
        return result;
      } else {
        throw new Error(`Invalid sync direction: ${direction}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
      };
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async readTokenFile(filePath: string, tokenType: string): Promise<any> {
    if (!await this.fileExists(filePath)) {
      console.warn(`Token file not found: ${filePath}`);
      return [];
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Handle TypeScript files
    if (filePath.endsWith('.ts')) {
      // Extract JSON from TypeScript export
      const jsonMatch = content.match(/export\s+(?:const|default)\s+\w*\s*=\s*({[\s\S]*})/);
      if (jsonMatch) {
        try {
          // Simple eval for JSON-like content (be careful in production!)
          return eval(`(${jsonMatch[1]})`);
        } catch (e) {
          console.error(`Failed to parse TypeScript file ${filePath}:`, e);
          return [];
        }
      }
    }
    
    // Handle JSON files
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error(`Failed to parse JSON file ${filePath}:`, e);
      return [];
    }
  }

  private async writeTokenFile(filePath: string, tokens: any, tokenType: string): Promise<void> {
    if (!await this.fileExists(filePath)) {
      console.warn(`Token file not found, skipping: ${filePath}`);
      return;
    }
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    if (filePath.endsWith('.ts')) {
      // Write as TypeScript export
      const content = `// Auto-generated by Figma Token Sync
// Last updated: ${new Date().toISOString()}

export const ${tokenType} = ${JSON.stringify(tokens, null, 2)};

export default ${tokenType};
`;
      await fs.writeFile(filePath, content);
    } else {
      // Write as JSON
      await fs.writeFile(filePath, JSON.stringify(tokens, null, 2));
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma Token Sync MCP server running');
  }
}

const server = new FigmaTokenServer();
server.run().catch(console.error);