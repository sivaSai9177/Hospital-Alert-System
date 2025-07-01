#!/usr/bin/env bun
/**
 * Token Sync Server using Bun
 * Standalone HTTP server for token syncing between Figma and codebase
 */

import { serve } from 'bun';
import * as fs from 'fs/promises';
import * as path from 'path';
import { mapTokensToFigma } from '../src/extractors/unified-token-mapper';

const PORT = process.env.TOKEN_SYNC_PORT || 3457;
const TOKEN_STORAGE_PATH = path.join(import.meta.dir, '../token-storage');
const CODEBASE_PATH = path.join(import.meta.dir, '../../'); // Path to main codebase

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

/**
 * Extract tokens from the codebase using unified mapper
 */
async function extractTokensFromCodebase() {
  console.log('📦 Extracting tokens from codebase...');
  
  try {
    // Use the unified token mapper for real tokens
    const unifiedTokens = mapTokensToFigma();
    console.log('✅ Extracted unified tokens successfully');
    return unifiedTokens;
  } catch (error) {
    console.error('Failed to extract tokens:', error);
    throw error;
  }
}

/**
 * Save tokens back to the codebase
 */
async function saveTokensToCodebase(tokens: any, config: any) {
  console.log('💾 Saving tokens to codebase...');
  
  try {
    // Ensure storage directory exists
    await fs.mkdir(TOKEN_STORAGE_PATH, { recursive: true });
    
    // Save tokens as JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tokensPath = path.join(TOKEN_STORAGE_PATH, `design-tokens-${timestamp}.json`);
    await fs.writeFile(
      tokensPath,
      JSON.stringify(tokens, null, 2),
      'utf-8'
    );
    
    // Also save as latest
    const latestPath = path.join(TOKEN_STORAGE_PATH, 'design-tokens-latest.json');
    await fs.writeFile(
      latestPath,
      JSON.stringify(tokens, null, 2),
      'utf-8'
    );
    
    // Generate TypeScript types
    const typesContent = generateTypeScriptTypes(tokens);
    const typesPath = path.join(TOKEN_STORAGE_PATH, 'design-tokens.types.ts');
    await fs.writeFile(typesPath, typesContent, 'utf-8');
    
    // Generate CSS variables
    const cssContent = generateCSSVariables(tokens);
    const cssPath = path.join(TOKEN_STORAGE_PATH, 'design-tokens.css');
    await fs.writeFile(cssPath, cssContent, 'utf-8');
    
    console.log('✅ Tokens saved successfully to:', TOKEN_STORAGE_PATH);
    
    return {
      filesWritten: 4,
      paths: [tokensPath, latestPath, typesPath, cssPath]
    };
  } catch (error) {
    console.error('Failed to save tokens:', error);
    throw error;
  }
}

/**
 * Generate TypeScript types from tokens
 */
function generateTypeScriptTypes(tokens: any): string {
  const timestamp = new Date().toISOString();
  
  let types = `/**
 * Auto-generated design token types
 * Generated at: ${timestamp}
 * Source: Figma Plugin Sync
 */

export interface DesignTokens {
  colors: ColorCollection;
  spacing: SpacingCollection;
  typography: TypographyStyle[];
  effects: {
    shadows: ShadowEffect[];
    borderRadius: BorderRadiusToken[];
  };
}

export interface ColorCollection {
  name: string;
  modes: Array<{ name: string; modeId: string }>;
  variables: ColorVariable[];
}

export interface ColorVariable {
  name: string;
  type: 'COLOR';
  valuesByMode: Record<string, RGB>;
  scopes?: string[];
  description?: string;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface SpacingCollection {
  name: string;
  modes: Array<{ name: string; modeId: string }>;
  variables: SpacingVariable[];
}

export interface SpacingVariable {
  name: string;
  type: 'FLOAT';
  valuesByMode: Record<string, number>;
  scopes?: string[];
  description?: string;
}

export interface TypographyStyle {
  name: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: {
    value: number;
    unit: 'PIXELS' | 'PERCENT' | 'AUTO';
  };
  letterSpacing: {
    value: number;
    unit: 'PIXELS' | 'PERCENT';
  };
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
}

export interface ShadowEffect {
  name: string;
  effects: Array<{
    type: 'DROP_SHADOW' | 'INNER_SHADOW';
    color: RGB;
    offset: { x: number; y: number };
    radius: number;
    spread?: number;
    visible: boolean;
    blendMode: string;
  }>;
}

export interface BorderRadiusToken {
  name: string;
  type: 'FLOAT';
  value: number;
  scopes: string[];
  description?: string;
}
`;

  return types;
}

/**
 * Generate CSS variables from tokens
 */
function generateCSSVariables(tokens: any): string {
  const timestamp = new Date().toISOString();
  
  let css = `/**
 * Auto-generated design tokens as CSS variables
 * Generated at: ${timestamp}
 * Source: Figma Plugin Sync
 */

:root {
`;

  // Add color variables
  if (tokens.colors?.variables) {
    css += '  /* ===== Colors ===== */\n';
    tokens.colors.variables.forEach((variable: any) => {
      const cssVarName = `--${variable.name.replace(/\//g, '-').toLowerCase()}`;
      // Use default/light mode value
      const defaultMode = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[defaultMode];
      if (value) {
        const r = Math.round((value.r || 0) * 255);
        const g = Math.round((value.g || 0) * 255);
        const b = Math.round((value.b || 0) * 255);
        const a = value.a !== undefined ? value.a : 1;
        
        if (a < 1) {
          css += `  ${cssVarName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
        } else {
          css += `  ${cssVarName}: rgb(${r}, ${g}, ${b});\n`;
        }
      }
    });
    css += '\n';
  }

  // Add spacing variables
  if (tokens.spacing?.variables) {
    css += '  /* ===== Spacing ===== */\n';
    tokens.spacing.variables.forEach((variable: any) => {
      const cssVarName = `--${variable.name.replace(/\//g, '-').toLowerCase()}`;
      const defaultMode = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[defaultMode];
      if (value !== undefined) {
        css += `  ${cssVarName}: ${value}px;\n`;
      }
    });
    css += '\n';
  }

  // Add border radius variables
  if (tokens.effects?.borderRadius) {
    css += '  /* ===== Border Radius ===== */\n';
    tokens.effects.borderRadius.forEach((token: any) => {
      const cssVarName = `--${token.name.replace(/\//g, '-').toLowerCase()}`;
      css += `  ${cssVarName}: ${token.value}px;\n`;
    });
  }

  css += '}\n\n';

  // Add dark mode overrides if available
  const hasDarkMode = tokens.colors?.modes?.some((m: any) => 
    m.name.toLowerCase().includes('dark')
  );

  if (hasDarkMode && tokens.colors?.variables) {
    css += '/* ===== Dark Mode ===== */\n';
    css += '.dark,\n[data-theme="dark"] {\n';
    
    tokens.colors.variables.forEach((variable: any) => {
      const cssVarName = `--${variable.name.replace(/\//g, '-').toLowerCase()}`;
      // Find dark mode value
      const darkModeKey = Object.keys(variable.valuesByMode).find(key => 
        key.toLowerCase().includes('dark')
      );
      
      if (darkModeKey && variable.valuesByMode[darkModeKey]) {
        const value = variable.valuesByMode[darkModeKey];
        const r = Math.round((value.r || 0) * 255);
        const g = Math.round((value.g || 0) * 255);
        const b = Math.round((value.b || 0) * 255);
        const a = value.a !== undefined ? value.a : 1;
        
        if (a < 1) {
          css += `  ${cssVarName}: rgba(${r}, ${g}, ${b}, ${a});\n`;
        } else {
          css += `  ${cssVarName}: rgb(${r}, ${g}, ${b});\n`;
        }
      }
    });
    
    css += '}\n';
  }

  return css;
}

/**
 * Generate component code from Figma components
 */
async function generateComponentCode(components: any[], options: any) {
  console.log('🧩 Generating component code...');
  
  const componentCode = components.map(component => {
    const { name, type, properties } = component;
    const componentName = name.replace(/[^a-zA-Z0-9]/g, '');
    
    // Generate React Native component with NativeWind
    return `import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';

interface ${componentName}Props {
  onPress?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

const Styled${componentName} = styled(${type === 'FRAME' ? 'View' : 'TouchableOpacity'});

export const ${componentName}: React.FC<${componentName}Props> = ({ 
  onPress, 
  disabled = false,
  children 
}) => {
  return (
    <Styled${componentName}
      className="${generateTailwindClasses(properties)}"
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {children || <Text>${name}</Text>}
    </Styled${componentName}>
  );
};
`;
  }).join('\n\n');
  
  return componentCode;
}

/**
 * Generate Tailwind classes from Figma properties
 */
function generateTailwindClasses(properties: any): string {
  const classes: string[] = [];
  
  // Add basic styling
  classes.push('flex-1', 'items-center', 'justify-center');
  
  if (properties?.fills && properties.fills.length > 0) {
    const fill = properties.fills[0];
    if (fill.type === 'SOLID') {
      // Map to closest Tailwind color
      classes.push('bg-primary');
    }
  }
  
  // Add padding
  classes.push('p-4');
  
  // Add border radius
  classes.push('rounded-lg');
  
  return classes.join(' ');
}

// Create Bun server
const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Handle OPTIONS for CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    try {
      // Health check endpoint
      if (url.pathname === '/health' && req.method === 'GET') {
        return new Response(
          JSON.stringify({ 
            status: 'ok', 
            service: 'token-sync-server',
            runtime: 'bun',
            timestamp: new Date().toISOString() 
          }),
          { status: 200, headers: corsHeaders }
        );
      }
      
      // Main sync endpoint
      if (url.pathname === '/sync' && req.method === 'POST') {
        const body = await req.json();
        const { action, data, tokens, config } = body;
        
        console.log(`📨 Received ${action} request`);
        
        let response;
        
        switch (action) {
          case 'pull':
          case 'sync-from-code':
            const extractedTokens = await extractTokensFromCodebase();
            response = {
              success: true,
              tokens: extractedTokens,
              source: 'unified-token-mapper',
              timestamp: new Date().toISOString()
            };
            break;
            
          case 'push':
          case 'sync-to-code':
            const saveResult = await saveTokensToCodebase(data || tokens, config);
            response = {
              success: true,
              message: 'Tokens saved successfully',
              filesWritten: saveResult.filesWritten,
              paths: saveResult.paths,
              timestamp: new Date().toISOString()
            };
            break;
            
          case 'generate-component':
            const code = await generateComponentCode(data.components || [data], data.options || {});
            response = {
              success: true,
              code,
              timestamp: new Date().toISOString()
            };
            break;
            
          default:
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Unknown action: ${action}` 
              }),
              { status: 400, headers: corsHeaders }
            );
        }
        
        return new Response(
          JSON.stringify(response),
          { status: 200, headers: corsHeaders }
        );
      }
      
      // 404 for other routes
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: corsHeaders }
      );
      
    } catch (error) {
      console.error('Server error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  }
});

console.log(`
🚀 Token Sync Server running on http://localhost:${PORT}
⚡ Powered by Bun for optimal performance
📦 Using unified token mapper for real design tokens

Available endpoints:
  GET  /health - Health check
  POST /sync   - Token sync operations
    - action: 'sync-from-code' - Extract tokens from codebase
    - action: 'sync-to-code'   - Save tokens to codebase
    - action: 'generate-component' - Generate component code

Token storage path: ${TOKEN_STORAGE_PATH}
`);