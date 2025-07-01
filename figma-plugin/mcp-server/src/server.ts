#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import ws from 'ws';

// Import handlers
import { TokenSyncHandler } from './handlers/token-sync.js';
import { ComponentGenerator } from './handlers/component-generator.js';
import { DesignSystemParser } from './sync/design-system-parser.js';
import { TokenWriter } from './sync/token-writer.js';
import { DesignTokens } from '../../shared/types/design-tokens.js';
import type { ComponentData } from './handlers/component-generator.js';
import { mapTokensToFigma } from '../../src/extractors/unified-token-mapper.js';
import { figmaRouter } from './routers/figma.js';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { createTRPCLogger } from '../../src/lib/debug/trpc-logger';
import { logger } from '../../src/lib/debug/server-logger';

// Initialize handlers
const tokenSync = new TokenSyncHandler();
const componentGen = new ComponentGenerator();
const dsParser = new DesignSystemParser();
const tokenWriter = new TokenWriter();

// Initialize tRPC
const t = initTRPC.create({
  transformer: superjson,
});

// Create app router
export const appRouter = t.router({
  figma: figmaRouter,
});

export type AppRouter = typeof appRouter;

// Input schemas using Zod
const ExtractTokensSchema = z.object({
  path: z.string().describe('Path to the codebase directory'),
});

const SyncTokensSchema = z.object({
  tokens: z.object({
    colors: z.array(z.any()).optional(),
    typography: z.array(z.any()).optional(),
    spacing: z.array(z.any()).optional(),
    shadows: z.array(z.any()).optional(),
    borderRadius: z.array(z.any()).optional(),
    opacity: z.array(z.any()).optional(),
    gradients: z.array(z.any()).optional(),
  }).passthrough().describe('Design tokens from Figma'),
  targetPath: z.string().describe('Target path for token files'),
});

const GenerateComponentSchema = z.object({
  component: z.object({}).passthrough().describe('Component data from Figma'),
  options: z.object({
    platform: z.enum(['universal', 'react-native', 'web']),
    useNativeWind: z.boolean(),
    includeTypes: z.boolean(),
    includeProps: z.boolean().optional(),
    includeAnimations: z.boolean().optional(),
    aiPrompt: z.string().optional(),
  }),
});

const AnalyzeComponentsSchema = z.object({
  componentPath: z.string().describe('Path to components directory'),
});

const InspectFrameSchema = z.object({
  frameId: z.string().describe('The ID of the Figma frame to inspect'),
});

// Create MCP server
const server = new Server(
  {
    name: 'universal-design-system',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// Register resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'tokens://current',
      name: 'Current Design Tokens',
      description: 'View all design tokens in the system',
      mimeType: 'application/json',
    },
    {
      uri: 'tokens://colors',
      name: 'Color Tokens',
      description: 'View color tokens only',
      mimeType: 'application/json',
    },
    {
      uri: 'tokens://typography',
      name: 'Typography Tokens',
      description: 'View typography tokens only',
      mimeType: 'application/json',
    },
    {
      uri: 'tokens://spacing',
      name: 'Spacing Tokens',
      description: 'View spacing tokens only',
      mimeType: 'application/json',
    },
  ],
}));

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  try {
    const projectPath = process.cwd();
    const tokens = await dsParser.extractTokensFromCode(projectPath);
    
    let content: any;
    
    switch (uri) {
      case 'tokens://current':
        content = tokens;
        break;
      case 'tokens://colors':
        content = { colors: tokens.colors };
        break;
      case 'tokens://typography':
        content = { typography: tokens.typography };
        break;
      case 'tokens://spacing':
        content = { spacing: tokens.spacing };
        break;
      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'extract_tokens',
      description: 'Extract design tokens from codebase',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the codebase directory',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'sync_tokens_to_code',
      description: 'Write design tokens from Figma to codebase',
      inputSchema: {
        type: 'object',
        properties: {
          tokens: {
            type: 'object',
            description: 'Design tokens from Figma',
          },
          targetPath: {
            type: 'string',
            description: 'Target path for token files',
          },
        },
        required: ['tokens', 'targetPath'],
      },
    },
    {
      name: 'generate_component',
      description: 'Generate React Native/Web component from Figma design',
      inputSchema: {
        type: 'object',
        properties: {
          component: {
            type: 'object',
            description: 'Component data from Figma',
          },
          options: {
            type: 'object',
            properties: {
              platform: {
                type: 'string',
                enum: ['universal', 'react-native', 'web'],
              },
              useNativeWind: {
                type: 'boolean',
              },
              includeTypes: {
                type: 'boolean',
              },
              includeProps: {
                type: 'boolean',
              },
              includeAnimations: {
                type: 'boolean',
              },
              aiPrompt: {
                type: 'string',
              },
            },
            required: ['platform', 'useNativeWind', 'includeTypes'],
          },
        },
        required: ['component', 'options'],
      },
    },
    {
      name: 'analyze_component_patterns',
      description: 'Analyze existing component patterns in codebase',
      inputSchema: {
        type: 'object',
        properties: {
          componentPath: {
            type: 'string',
            description: 'Path to components directory',
          },
        },
        required: ['componentPath'],
      },
    },
    {
      name: 'inspect_figma_frame',
      description: 'Inspect properties of a Figma frame including layout, dimensions, and styling',
      inputSchema: {
        type: 'object',
        properties: {
          frameId: {
            type: 'string',
            description: 'The ID of the Figma frame to inspect',
          },
        },
        required: ['frameId'],
      },
    },
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'extract_tokens': {
        const validatedArgs = ExtractTokensSchema.parse(args);
        const tokens = await dsParser.extractTokensFromCode(validatedArgs.path);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tokens, null, 2),
            },
          ],
        };
      }

      case 'sync_tokens_to_code': {
        const validatedArgs = SyncTokensSchema.parse(args);
        const result = await tokenWriter.writeTokensToCode(
          validatedArgs.tokens as DesignTokens,
          validatedArgs.targetPath
        );
        return {
          content: [
            {
              type: 'text',
              text: `Successfully synced tokens to ${result.filesWritten} files:\n${result.files.join('\n')}`,
            },
          ],
        };
      }

      case 'generate_component': {
        const validatedArgs = GenerateComponentSchema.parse(args);
        const code = await componentGen.generateComponent(
          validatedArgs.component as unknown as ComponentData,
          validatedArgs.options
        );
        return {
          content: [
            {
              type: 'text',
              text: code,
            },
          ],
        };
      }

      case 'analyze_component_patterns': {
        const validatedArgs = AnalyzeComponentsSchema.parse(args);
        const patterns = await dsParser.analyzeComponentPatterns(
          validatedArgs.componentPath
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(patterns, null, 2),
            },
          ],
        };
      }

      case 'inspect_figma_frame': {
        const validatedArgs = InspectFrameSchema.parse(args);
        
        // Create a WebSocket connection to communicate with Figma plugin
        // For now, return instructions on how to use the frame inspector
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Frame Inspector Usage',
                instructions: [
                  '1. Open the Figma plugin UI',
                  '2. Navigate to the Frame Inspector tab',
                  '3. Select a frame or use the frame list',
                  '4. View detailed frame properties and issues',
                  '5. Use the Editor tab to modify frame properties'
                ],
                features: {
                  inspect: 'View frame dimensions, auto-layout settings, and visual properties',
                  analyze: 'Detect common issues like zero height/width',
                  edit: 'Modify frame properties programmatically',
                  presets: 'Create common frame types (card, section, container, sidebar)'
                },
                frameId: validatedArgs.frameId
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Register prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'analyze_design_system',
      description: 'Analyze the current design system and suggest improvements',
      arguments: [
        {
          name: 'projectPath',
          description: 'Path to the project',
          required: true,
        },
      ],
    },
    {
      name: 'component_from_design',
      description: 'Generate a component from a design description',
      arguments: [
        {
          name: 'description',
          description: 'Description of the component to generate',
          required: true,
        },
        {
          name: 'platform',
          description: 'Target platform (universal, react-native, web)',
          required: false,
        },
      ],
    },
  ],
}));

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'analyze_design_system':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze the design system at ${args?.projectPath || process.cwd()} and provide:
1. Current token coverage (colors, typography, spacing, etc.)
2. Consistency issues or gaps
3. Suggestions for improvement
4. Missing tokens that should be added
5. Recommendations for better organization`,
            },
          },
        ],
      };

    case 'component_from_design':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate a ${args?.platform || 'universal'} component based on this description:

${args?.description}

Requirements:
- Use TypeScript with proper interfaces
- Include NativeWind/Tailwind classes
- Make it accessible with proper ARIA labels
- Include loading and error states if applicable
- Add density-aware spacing
- Follow the existing component patterns in the codebase`,
            },
          },
        ],
      };

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown prompt: ${name}`);
  }
});

// HTTP server for Figma plugin communication
const httpServer = createServer(async (req, res) => {
  const { pathname } = parse(req.url || '');
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        version: '1.0.0',
        name: 'universal-design-system-mcp',
        capabilities: ['tools', 'resources', 'prompts']
      }));
      return;
    }

    if (pathname === '/sync' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const request = JSON.parse(body);
          let response;

          switch (request.action) {
            case 'sync-tokens-to-code':
              const writeResult = await tokenWriter.writeTokensToCode(
                request.tokens,
                request.targetPath || process.cwd()
              );
              response = { success: true, data: writeResult };
              break;

            case 'sync-tokens-from-code':
            case 'sync-from-code':
            case 'pull':
              // Use unified token mapper for real tokens
              const unifiedTokens = mapTokensToFigma();
              response = { 
                success: true, 
                tokens: unifiedTokens,
                source: 'unified-token-mapper'
              };
              break;

            case 'generate-component':
              const code = await componentGen.generateComponent(
                request.components[0],
                request.options
              );
              response = { success: true, data: { code } };
              break;

            default:
              response = { success: false, error: 'Unknown action' };
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Server error' 
          }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    }));
  }
});

// Main function to start servers
async function main() {
  // Check if running in stdio mode (for Claude Desktop)
  const isStdio = process.argv.includes('--stdio');

  if (isStdio) {
    // Start MCP server on stdio for Claude Desktop
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Server running on stdio');
  } else {
    // Start HTTP server for Figma plugin
    const HTTP_PORT = process.env.PORT || 3456;
    
    // Create tRPC HTTP handler
    const trpcHandler = createHTTPServer({
      router: appRouter,
      createContext: () => ({}),
    });
    
    // Create WebSocket server for subscriptions
    const wss = new ws.Server({ port: 3458 }); // Use fixed port 3458 for WebSocket
    applyWSSHandler({
      wss,
      router: appRouter,
      createContext: () => ({}),
    });
    
    // Create hybrid server that handles both legacy and tRPC
    const hybridServer = createServer((req, res) => {
      const { pathname } = parse(req.url || '');
      
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-figma-file-key, x-figma-user-id');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      // Handle tRPC requests
      if (pathname?.startsWith('/trpc')) {
        trpcHandler(req, res);
        return;
      }
      
      // Handle legacy endpoints
      httpServer.emit('request', req, res);
    });
    
    hybridServer.listen(HTTP_PORT, () => {
      console.log(`HTTP Server running on http://localhost:${HTTP_PORT}`);
      console.log(`WebSocket Server running on ws://localhost:3458`);
      console.log('\nAvailable endpoints:');
      console.log(`  GET  /health - Health check`);
      console.log(`  POST /sync - Handle sync requests (legacy)`);
      console.log(`  POST /trpc/* - tRPC endpoints`);
      console.log(`  WS   ws://localhost:3458 - WebSocket subscriptions`);
      console.log('\nTo run as MCP server for Claude Desktop:');
      console.log(`  bun run src/server.ts --stdio`);
    });
  }
}

// Start the server
main().catch(console.error);