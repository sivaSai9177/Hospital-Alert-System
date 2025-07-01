import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { DesignTokens } from '../../../shared/types/design-tokens.js';

export class TokenWriter {
  /**
   * Write design tokens to the codebase
   */
  async writeTokensToCode(tokens: DesignTokens, targetPath: string): Promise<{ filesWritten: number; files: string[] }> {
    const result = {
      filesWritten: 0,
      files: [] as string[],
    };

    try {
      // Ensure directories exist
      this.ensureDirectories(targetPath);

      // Write tokens to different locations
      const colorFile = await this.writeColorTokens(tokens.colors, targetPath);
      if (colorFile) {
        result.files.push(colorFile);
        result.filesWritten++;
      }

      const typographyFile = await this.writeTypographyTokens(tokens.typography, targetPath);
      if (typographyFile) {
        result.files.push(typographyFile);
        result.filesWritten++;
      }

      const spacingFile = await this.writeSpacingTokens(tokens.spacing, targetPath);
      if (spacingFile) {
        result.files.push(spacingFile);
        result.filesWritten++;
      }

      const shadowFile = await this.writeShadowTokens(tokens.shadows, targetPath);
      if (shadowFile) {
        result.files.push(shadowFile);
        result.filesWritten++;
      }

      // Update CSS variables
      const cssFile = await this.updateCSSVariables(tokens, targetPath);
      if (cssFile) {
        result.files.push(cssFile);
        result.filesWritten++;
      }

      // Generate token index file
      const indexFile = await this.writeTokenIndex(tokens, targetPath);
      if (indexFile) {
        result.files.push(indexFile);
        result.filesWritten++;
      }

    } catch (error) {
      console.error('Error writing tokens:', error);
      throw error;
    }

    return result;
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(targetPath: string) {
    const dirs = [
      join(targetPath, 'lib', 'design', 'tokens'),
      join(targetPath, 'docs', 'design-system'),
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Write color tokens
   */
  private async writeColorTokens(colors: any[], targetPath: string): Promise<string | null> {
    if (!colors || colors.length === 0) return null;

    const filePath = join(targetPath, 'lib', 'design', 'tokens', 'colors.ts');
    
    const content = `// Auto-generated from Figma
// Last updated: ${new Date().toISOString()}

export interface ColorToken {
  name: string;
  value: string;
  rgb?: { r: number; g: number; b: number; a: number };
  hsl?: { h: number; s: number; l: number };
  category?: string;
}

export const colorTokens: ColorToken[] = ${JSON.stringify(colors, null, 2)};

// Color palette object for easy access
export const colors = {
${colors.map(c => `  '${this.tokenNameToKey(c.name)}': '${c.value}',`).join('\n')}
} as const;

// Semantic color mapping
export const semanticColors = {
  primary: colors.${this.findColorByCategory(colors, 'primary')},
  secondary: colors.${this.findColorByCategory(colors, 'secondary')},
  accent: colors.${this.findColorByCategory(colors, 'accent')},
  success: colors.${this.findColorByCategory(colors, 'success')},
  warning: colors.${this.findColorByCategory(colors, 'warning')},
  danger: colors.${this.findColorByCategory(colors, 'danger')},
  info: colors.${this.findColorByCategory(colors, 'info')},
} as const;

// Type for color keys
export type ColorKey = keyof typeof colors;
export type SemanticColorKey = keyof typeof semanticColors;
`;

    writeFileSync(filePath, content);
    return filePath;
  }

  /**
   * Write typography tokens
   */
  private async writeTypographyTokens(typography: any[], targetPath: string): Promise<string | null> {
    if (!typography || typography.length === 0) return null;

    const filePath = join(targetPath, 'lib', 'design', 'tokens', 'typography.ts');
    
    const content = `// Auto-generated from Figma
// Last updated: ${new Date().toISOString()}

import { Platform } from 'react-native';

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | 'auto';
  letterSpacing: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export const typographyTokens: TypographyToken[] = ${JSON.stringify(typography, null, 2)};

// Typography styles object
export const typography = {
${typography.map(t => `  '${this.tokenNameToKey(t.name)}': Platform.select({
    ios: {
      fontFamily: '${t.fontFamily}',
      fontSize: ${t.fontSize},
      fontWeight: '${t.fontWeight}' as any,
      lineHeight: ${t.lineHeight === 'auto' ? `${t.fontSize} * 1.2` : t.lineHeight},
      letterSpacing: ${t.letterSpacing},${t.textTransform ? `
      textTransform: '${t.textTransform}' as any,` : ''}
    },
    android: {
      fontFamily: '${t.fontFamily}',
      fontSize: ${t.fontSize},
      fontWeight: '${t.fontWeight}' as any,
      lineHeight: ${t.lineHeight === 'auto' ? `${t.fontSize} * 1.2` : t.lineHeight},
      letterSpacing: ${t.letterSpacing},${t.textTransform ? `
      textTransform: '${t.textTransform}' as any,` : ''}
    },
    web: {
      fontFamily: '${t.fontFamily}',
      fontSize: ${t.fontSize},
      fontWeight: ${t.fontWeight},
      lineHeight: ${t.lineHeight === 'auto' ? '1.2' : `'${t.lineHeight}px'`},
      letterSpacing: ${t.letterSpacing},${t.textTransform ? `
      textTransform: '${t.textTransform}',` : ''}
    },
  }),`).join('\n')}
} as const;

// Type for typography keys
export type TypographyKey = keyof typeof typography;

// Helper to get typography style
export function getTypography(key: TypographyKey) {
  return typography[key];
}
`;

    writeFileSync(filePath, content);
    return filePath;
  }

  /**
   * Write spacing tokens
   */
  private async writeSpacingTokens(spacing: any[], targetPath: string): Promise<string | null> {
    if (!spacing || spacing.length === 0) return null;

    const filePath = join(targetPath, 'lib', 'design', 'tokens', 'spacing.ts');
    
    const content = `// Auto-generated from Figma
// Last updated: ${new Date().toISOString()}

export interface SpacingToken {
  name: string;
  value: number;
  scale?: number;
  density?: 'compact' | 'medium' | 'large';
}

export const spacingTokens: SpacingToken[] = ${JSON.stringify(spacing, null, 2)};

// Base spacing unit
export const SPACING_BASE_UNIT = 4;

// Spacing scale object
export const spacing = {
${spacing.map(s => `  ${s.scale || this.tokenNameToKey(s.name)}: ${s.value},`).join('\n')}
} as const;

// Type for spacing keys
export type SpacingKey = keyof typeof spacing;

// Density multipliers
export const densityMultipliers = {
  compact: 0.75,
  medium: 1,
  large: 1.25,
} as const;

// Get density-aware spacing
export function getSpacing(
  value: SpacingKey | number,
  density: keyof typeof densityMultipliers = 'medium'
): number {
  const baseValue = typeof value === 'number' ? value : spacing[value];
  return Math.round(baseValue * densityMultipliers[density]);
}

// Spacing utilities
export const spacingUtils = {
  // Padding helpers
  p: (value: SpacingKey | number) => ({ padding: getSpacing(value) }),
  px: (value: SpacingKey | number) => ({ paddingHorizontal: getSpacing(value) }),
  py: (value: SpacingKey | number) => ({ paddingVertical: getSpacing(value) }),
  pt: (value: SpacingKey | number) => ({ paddingTop: getSpacing(value) }),
  pr: (value: SpacingKey | number) => ({ paddingRight: getSpacing(value) }),
  pb: (value: SpacingKey | number) => ({ paddingBottom: getSpacing(value) }),
  pl: (value: SpacingKey | number) => ({ paddingLeft: getSpacing(value) }),
  
  // Margin helpers
  m: (value: SpacingKey | number) => ({ margin: getSpacing(value) }),
  mx: (value: SpacingKey | number) => ({ marginHorizontal: getSpacing(value) }),
  my: (value: SpacingKey | number) => ({ marginVertical: getSpacing(value) }),
  mt: (value: SpacingKey | number) => ({ marginTop: getSpacing(value) }),
  mr: (value: SpacingKey | number) => ({ marginRight: getSpacing(value) }),
  mb: (value: SpacingKey | number) => ({ marginBottom: getSpacing(value) }),
  ml: (value: SpacingKey | number) => ({ marginLeft: getSpacing(value) }),
  
  // Gap helper for flexbox
  gap: (value: SpacingKey | number) => ({ gap: getSpacing(value) }),
} as const;
`;

    writeFileSync(filePath, content);
    return filePath;
  }

  /**
   * Write shadow tokens
   */
  private async writeShadowTokens(shadows: any[], targetPath: string): Promise<string | null> {
    if (!shadows || shadows.length === 0) return null;

    const filePath = join(targetPath, 'lib', 'design', 'tokens', 'shadows.ts');
    
    const content = `// Auto-generated from Figma
// Last updated: ${new Date().toISOString()}

import { Platform, ViewStyle } from 'react-native';

export interface ShadowToken {
  name: string;
  value: ShadowEffect[];
  platform?: 'ios' | 'android' | 'web' | 'all';
  description?: string;
}

export interface ShadowEffect {
  color: string;
  offset: { x: number; y: number };
  radius: number;
  spread?: number;
  opacity?: number;
}

export const shadowTokens: ShadowToken[] = ${JSON.stringify(shadows, null, 2)};

// Platform-specific shadow implementations
export const shadows = {
${shadows.map(s => {
  const effect = s.value[0] || { color: '#000', offset: { x: 0, y: 0 }, radius: 0, opacity: 0.1 };
  return `  '${this.tokenNameToKey(s.name)}': Platform.select<ViewStyle>({
    ios: {
      shadowColor: '${effect.color}',
      shadowOffset: {
        width: ${effect.offset.x},
        height: ${effect.offset.y},
      },
      shadowOpacity: ${effect.opacity || 0.1},
      shadowRadius: ${effect.radius},
    },
    android: {
      elevation: ${Math.min(Math.round(effect.radius / 2), 24)},
    },
    web: {
      boxShadow: '${s.value.map((v: any) => 
        `${v.offset.x}px ${v.offset.y}px ${v.radius}px ${v.spread || 0}px ${v.color}`
      ).join(', ')}',
    } as any,
  }) as ViewStyle,`;
}).join('\n')}
} as const;

// Type for shadow keys
export type ShadowKey = keyof typeof shadows;

// Get shadow style
export function getShadow(key: ShadowKey): ViewStyle {
  return shadows[key];
}

// Shadow levels for consistency
export const shadowLevels = {
  none: {} as ViewStyle,
  sm: shadows.${this.findShadowByLevel(shadows, 'sm')},
  md: shadows.${this.findShadowByLevel(shadows, 'md')},
  lg: shadows.${this.findShadowByLevel(shadows, 'lg')},
  xl: shadows.${this.findShadowByLevel(shadows, 'xl')},
} as const;
`;

    writeFileSync(filePath, content);
    return filePath;
  }

  /**
   * Update CSS variables
   */
  private async updateCSSVariables(tokens: DesignTokens, targetPath: string): Promise<string | null> {
    const cssPath = join(targetPath, 'app', 'global.css');
    
    // This would intelligently update CSS variables
    // For now, we'll create a separate token CSS file
    const tokenCssPath = join(targetPath, 'app', 'tokens.css');
    
    const cssContent = `/* Auto-generated from Figma tokens */
/* Last updated: ${new Date().toISOString()} */

:root {
  /* Color Tokens */
${tokens.colors.map(c => `  --${this.tokenNameToCSSVar(c.name)}: ${c.value};`).join('\n')}

  /* Spacing Tokens */
${tokens.spacing.map(s => `  --${this.tokenNameToCSSVar(s.name)}: ${s.value}px;`).join('\n')}

  /* Border Radius Tokens */
${tokens.borderRadius.map(r => `  --${this.tokenNameToCSSVar(r.name)}: ${r.value}px;`).join('\n')}

  /* Typography Scale */
${tokens.typography.map(t => `  --font-size-${this.tokenNameToCSSVar(t.name)}: ${t.fontSize}px;`).join('\n')}
}

/* Utility Classes */
${this.generateUtilityClasses(tokens)}
`;

    writeFileSync(tokenCssPath, cssContent);
    return tokenCssPath;
  }

  /**
   * Write token index file
   */
  private async writeTokenIndex(tokens: DesignTokens, targetPath: string): Promise<string | null> {
    const indexPath = join(targetPath, 'lib', 'design', 'tokens', 'index.ts');
    
    const content = `// Auto-generated token index
// Last updated: ${new Date().toISOString()}

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';

// Re-export all tokens
export { colorTokens } from './colors';
export { typographyTokens } from './typography';
export { spacingTokens } from './spacing';
export { shadowTokens } from './shadows';

// Token metadata
export const tokenMetadata = {
  version: '${tokens.version}',
  lastUpdated: '${tokens.lastUpdated}',
  counts: {
    colors: ${tokens.colors.length},
    typography: ${tokens.typography.length},
    spacing: ${tokens.spacing.length},
    shadows: ${tokens.shadows.length},
    borderRadius: ${tokens.borderRadius.length},
    animations: ${tokens.animations?.length || 0},
  },
};
`;

    writeFileSync(indexPath, content);
    return indexPath;
  }

  // Helper methods

  private tokenNameToKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private tokenNameToCSSVar(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  }

  private findColorByCategory(colors: any[], category: string): string {
    const color = colors.find(c => c.category === category);
    return color ? this.tokenNameToKey(color.name) : 'primary';
  }

  private findShadowByLevel(shadows: any[], level: string): string {
    const shadow = shadows.find(s => s.name.toLowerCase().includes(level));
    return shadow ? this.tokenNameToKey(shadow.name) : this.tokenNameToKey(shadows[0]?.name || 'shadow');
  }

  private generateUtilityClasses(tokens: DesignTokens): string {
    const utilities: string[] = [];

    // Color utilities
    tokens.colors.forEach(color => {
      const key = this.tokenNameToCSSVar(color.name);
      utilities.push(`.text-${key} { color: var(--${key}); }`);
      utilities.push(`.bg-${key} { background-color: var(--${key}); }`);
      utilities.push(`.border-${key} { border-color: var(--${key}); }`);
    });

    // Spacing utilities
    tokens.spacing.forEach(spacing => {
      const key = this.tokenNameToCSSVar(spacing.name);
      utilities.push(`.p-${key} { padding: var(--${key}); }`);
      utilities.push(`.m-${key} { margin: var(--${key}); }`);
    });

    return utilities.join('\n');
  }
}