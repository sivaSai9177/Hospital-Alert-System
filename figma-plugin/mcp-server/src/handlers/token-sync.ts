import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DesignTokens } from '../../../shared/types/design-tokens.js';

export class TokenSyncHandler {
  /**
   * Sync tokens from Figma to the codebase
   */
  async syncTokensToCode(tokens: DesignTokens, targetPath: string) {
    const results = {
      filesWritten: 0,
      errors: [] as string[],
    };

    try {
      // Update color tokens in global.css
      await this.updateCSSVariables(tokens, targetPath);
      results.filesWritten++;

      // Update spacing tokens
      await this.updateSpacingTokens(tokens, targetPath);
      results.filesWritten++;

      // Update typography tokens
      await this.updateTypographyTokens(tokens, targetPath);
      results.filesWritten++;

      // Update shadow tokens
      await this.updateShadowTokens(tokens, targetPath);
      results.filesWritten++;

      // Update design system documentation
      await this.updateDesignSystemDocs(tokens, targetPath);
      results.filesWritten++;

    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return results;
  }

  /**
   * Update CSS variables in global.css
   */
  private async updateCSSVariables(tokens: DesignTokens, targetPath: string) {
    const cssPath = join(targetPath, 'app', 'global.css');
    let cssContent = readFileSync(cssPath, 'utf-8');

    // Extract existing CSS content before and after the :root block
    const rootStart = cssContent.indexOf(':root {');
    const rootEnd = cssContent.indexOf('}', rootStart) + 1;
    
    if (rootStart === -1) {
      throw new Error('Could not find :root block in global.css');
    }

    const beforeRoot = cssContent.substring(0, rootStart);
    const afterRoot = cssContent.substring(rootEnd);

    // Generate new CSS variables from tokens
    const cssVariables = this.generateCSSVariables(tokens);

    // Reconstruct the CSS file
    const newCssContent = `${beforeRoot}:root {
${cssVariables}
}${afterRoot}`;

    writeFileSync(cssPath, newCssContent);
  }

  /**
   * Generate CSS variables from design tokens
   */
  private generateCSSVariables(tokens: DesignTokens): string {
    const lines: string[] = [];

    // Add color tokens
    lines.push('  /* Colors from Figma */');
    tokens.colors.forEach(color => {
      const varName = this.tokenNameToCSSVariable(color.name);
      lines.push(`  --${varName}: ${color.value};`);
      
      // If it has RGB values, add those too
      if (color.rgb) {
        lines.push(`  --${varName}-rgb: ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b};`);
      }
    });

    // Add spacing tokens
    lines.push('\n  /* Spacing from Figma */');
    tokens.spacing.forEach(spacing => {
      const varName = this.tokenNameToCSSVariable(spacing.name);
      lines.push(`  --${varName}: ${spacing.value}px;`);
    });

    // Add border radius tokens
    if (tokens.borderRadius && tokens.borderRadius.length > 0) {
      lines.push('\n  /* Border Radius from Figma */');
      tokens.borderRadius.forEach(radius => {
        const varName = this.tokenNameToCSSVariable(radius.name);
        lines.push(`  --${varName}: ${radius.value}px;`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Update spacing tokens in the design system
   */
  private async updateSpacingTokens(tokens: DesignTokens, targetPath: string) {
    const spacingPath = join(targetPath, 'lib', 'design', 'spacing.ts');
    
    const spacingContent = `// Generated from Figma tokens
// Last updated: ${new Date().toISOString()}

export interface SpacingToken {
  name: string;
  value: number;
  scale: number;
  density?: 'compact' | 'medium' | 'large';
}

export const spacingTokens: SpacingToken[] = ${JSON.stringify(tokens.spacing, null, 2)};

// Base spacing unit
export const SPACING_BASE_UNIT = 4;

// Spacing scale
export const spacing = {
${tokens.spacing.map(s => `  '${s.name}': ${s.value},`).join('\n')}
} as const;

// Density-aware spacing
export function getSpacing(token: keyof typeof spacing, density: 'compact' | 'medium' | 'large' = 'medium'): number {
  const baseValue = spacing[token];
  switch (density) {
    case 'compact':
      return Math.round(baseValue * 0.75);
    case 'large':
      return Math.round(baseValue * 1.25);
    default:
      return baseValue;
  }
}
`;

    writeFileSync(spacingPath, spacingContent);
  }

  /**
   * Update typography tokens
   */
  private async updateTypographyTokens(tokens: DesignTokens, targetPath: string) {
    const typographyPath = join(targetPath, 'lib', 'design', 'typography.ts');
    
    const typographyContent = `// Generated from Figma tokens
// Last updated: ${new Date().toISOString()}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | 'auto';
  letterSpacing: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export const typographyTokens: TypographyToken[] = ${JSON.stringify(tokens.typography, null, 2)};

// Typography presets
export const typography = {
${tokens.typography.map(t => `  '${this.tokenNameToKey(t.name)}': {
    fontFamily: '${t.fontFamily}',
    fontSize: ${t.fontSize},
    fontWeight: ${t.fontWeight},
    lineHeight: ${t.lineHeight === 'auto' ? "'auto'" : t.lineHeight},
    letterSpacing: ${t.letterSpacing},${t.textTransform ? `
    textTransform: '${t.textTransform}',` : ''}
  },`).join('\n')}
} as const;
`;

    writeFileSync(typographyPath, typographyContent);
  }

  /**
   * Update shadow tokens
   */
  private async updateShadowTokens(tokens: DesignTokens, targetPath: string) {
    const shadowPath = join(targetPath, 'lib', 'design', 'shadows.ts');
    
    const shadowContent = `// Generated from Figma tokens
// Last updated: ${new Date().toISOString()}

import { Platform } from 'react-native';

export interface ShadowToken {
  name: string;
  value: ShadowEffect[];
  platform?: 'ios' | 'android' | 'web' | 'all';
}

export interface ShadowEffect {
  color: string;
  offset: { x: number; y: number };
  radius: number;
  spread?: number;
  opacity?: number;
}

export const shadowTokens: ShadowToken[] = ${JSON.stringify(tokens.shadows, null, 2)};

// Platform-specific shadow implementation
export const shadows = {
${tokens.shadows.map(s => `  '${this.tokenNameToKey(s.name)}': Platform.select({
    ios: {
      shadowColor: '${s.value[0]?.color || '#000'}',
      shadowOffset: { width: ${s.value[0]?.offset.x || 0}, height: ${s.value[0]?.offset.y || 0} },
      shadowOpacity: ${s.value[0]?.opacity || 0.1},
      shadowRadius: ${s.value[0]?.radius || 4},
    },
    android: {
      elevation: ${Math.min(Math.round((s.value[0]?.radius || 4) / 2), 24)},
    },
    web: {
      boxShadow: '${s.value.map(v => 
        `${v.offset.x}px ${v.offset.y}px ${v.radius}px ${v.spread || 0}px ${v.color}`
      ).join(', ')}',
    },
  }),`).join('\n')}
} as const;
`;

    writeFileSync(shadowPath, shadowContent);
  }

  /**
   * Update design system documentation
   */
  private async updateDesignSystemDocs(tokens: DesignTokens, targetPath: string) {
    const docsPath = join(targetPath, 'docs', 'design-system', 'tokens.md');
    
    const docsContent = `# Design Tokens

> Auto-generated from Figma on ${new Date().toLocaleString()}
> Version: ${tokens.version}

## Colors (${tokens.colors.length})

| Token | Value | Preview | Category |
|-------|-------|---------|----------|
${tokens.colors.map(c => 
  `| ${c.name} | \`${c.value}\` | <div style="width:20px;height:20px;background:${c.value};border:1px solid #ccc;"></div> | ${c.category || 'neutral'} |`
).join('\n')}

## Typography (${tokens.typography.length})

| Token | Font | Size | Weight | Line Height |
|-------|------|------|--------|-------------|
${tokens.typography.map(t => 
  `| ${t.name} | ${t.fontFamily} | ${t.fontSize}px | ${t.fontWeight} | ${t.lineHeight} |`
).join('\n')}

## Spacing (${tokens.spacing.length})

| Token | Value | Scale |
|-------|-------|-------|
${tokens.spacing.map(s => 
  `| ${s.name} | ${s.value}px | ${s.scale || s.value / 4}x |`
).join('\n')}

## Shadows (${tokens.shadows.length})

| Token | Description |
|-------|-------------|
${tokens.shadows.map(s => 
  `| ${s.name} | ${s.description || 'Shadow effect'} |`
).join('\n')}

## Border Radius (${tokens.borderRadius.length})

| Token | Value |
|-------|-------|
${tokens.borderRadius.map(r => 
  `| ${r.name} | ${r.value}px |`
).join('\n')}
`;

    writeFileSync(docsPath, docsContent);
  }

  /**
   * Convert token name to CSS variable format
   */
  private tokenNameToCSSVariable(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  }

  /**
   * Convert token name to JavaScript key format
   */
  private tokenNameToKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}