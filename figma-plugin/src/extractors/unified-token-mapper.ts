/**
 * Unified Token Mapper
 * Maps all design tokens to Figma Variables API format
 */

import { ExtractedCSSVariables } from './css-variable-extractor';
import { themesToFigmaFormat, getAllColorVariables } from './theme-extractor';
import { spacingToFigmaVariables, generateSpacingTokens } from './spacing-extractor';
import { typographyToFigmaTextStyles, generateTypographyPresets } from './typography-extractor';
import { generateAnimationTokens, animationToFigmaDocumentation } from './animation-extractor';

export interface FigmaVariableCollection {
  name: string;
  modes: { name: string; modeId: string }[];
  variables: {
    name: string;
    type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
    valuesByMode: Record<string, any>;
    scopes?: string[];
    description?: string;
  }[];
}

export interface UnifiedTokens {
  colors: FigmaVariableCollection;
  spacing: FigmaVariableCollection;
  typography: any[]; // Text styles, not variables
  effects: {
    shadows: any[];
    borderRadius: any[];
  };
  animations: any[]; // Animation documentation
}

/**
 * Create color variable collection from themes
 * Note: Free Figma plan is limited to 1 mode per collection
 */
function createColorCollection(): FigmaVariableCollection {
  const themes = themesToFigmaFormat();
  const colorVariables = getAllColorVariables();
  
  // For free plan, we'll use the default theme light mode only
  // Users can manually create additional collections for other themes
  const defaultTheme = themes[0]; // Use 'default' theme
  
  // Single mode for free plan
  const modes: { name: string; modeId: string }[] = [
    { name: 'Default', modeId: 'default' }
  ];
  
  // Create variables with default theme light values
  const variables = colorVariables.map(colorName => {
    const color = defaultTheme.colors[colorName];
    const value = color ? color.light : { r: 0, g: 0, b: 0 };
    
    return {
      name: colorName.replace(/-/g, '/'),
      type: 'COLOR' as const,
      valuesByMode: {
        'default': value
      },
      scopes: ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'],
      description: `Color token: ${colorName}`
    };
  });
  
  console.log(`📊 Creating ${variables.length} color variables with default theme`);
  console.log('💡 Tip: For multiple themes, create separate collections or upgrade Figma plan');
  
  return {
    name: 'Colors',
    modes,
    variables
  };
}

/**
 * Create spacing variable collection
 * Note: Free Figma plan is limited to 1 mode per collection
 */
function createSpacingCollection(): FigmaVariableCollection {
  const spacingTokens = generateSpacingTokens();
  const spacingVariables = spacingToFigmaVariables(spacingTokens);
  
  // Single mode for free plan - use medium density as default
  const modes = [
    { name: 'Default', modeId: 'default' }
  ];
  
  // Group variables by name and use medium density values
  const variableMap = new Map<string, any>();
  
  spacingVariables.forEach(variable => {
    if (variable.mode === 'medium') { // Use medium as default
      variableMap.set(variable.name, {
        name: variable.name.replace(/-/g, '/'),
        type: 'FLOAT',
        valuesByMode: { 'default': variable.value },
        scopes: variable.scopes,
        description: `Spacing token: ${variable.name} (medium density)`
      });
    }
  });
  
  console.log(`📏 Creating ${variableMap.size} spacing variables with medium density`);
  console.log('💡 Tip: For density modes, create separate collections or upgrade Figma plan');
  
  return {
    name: 'Spacing',
    modes,
    variables: Array.from(variableMap.values())
  };
}

/**
 * Create border radius collection
 */
function createBorderRadiusCollection(): any[] {
  const borderRadiusTokens = [
    { name: 'radius/none', value: 0 },
    { name: 'radius/sm', value: 2 },
    { name: 'radius/default', value: 4 },
    { name: 'radius/md', value: 6 },
    { name: 'radius/lg', value: 8 },
    { name: 'radius/xl', value: 12 },
    { name: 'radius/2xl', value: 16 },
    { name: 'radius/3xl', value: 24 },
    { name: 'radius/full', value: 9999 }
  ];
  
  return borderRadiusTokens.map(token => ({
    name: token.name,
    type: 'FLOAT',
    value: token.value,
    scopes: ['CORNER_RADIUS'],
    description: `Border radius: ${token.value}px`
  }));
}

/**
 * Create shadow effect styles
 */
function createShadowEffects(): any[] {
  return [
    {
      name: 'shadow/none',
      effects: []
    },
    {
      name: 'shadow/sm',
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.05 },
        offset: { x: 0, y: 1 },
        radius: 2,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL'
      }]
    },
    {
      name: 'shadow/default',
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        radius: 3,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL'
      }, {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.06 },
        offset: { x: 0, y: 1 },
        radius: 2,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL'
      }]
    },
    {
      name: 'shadow/md',
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 4 },
        radius: 6,
        spread: -1,
        visible: true,
        blendMode: 'NORMAL'
      }, {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.05 },
        offset: { x: 0, y: 2 },
        radius: 4,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL'
      }]
    },
    {
      name: 'shadow/lg',
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 10 },
        radius: 15,
        spread: -3,
        visible: true,
        blendMode: 'NORMAL'
      }, {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.05 },
        offset: { x: 0, y: 4 },
        radius: 6,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL'
      }]
    },
    {
      name: 'shadow/xl',
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 20 },
        radius: 25,
        spread: -5,
        visible: true,
        blendMode: 'NORMAL'
      }, {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.04 },
        offset: { x: 0, y: 10 },
        radius: 10,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL'
      }]
    },
    {
      name: 'shadow/2xl',
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 0, y: 25 },
        radius: 50,
        spread: -12,
        visible: true,
        blendMode: 'NORMAL'
      }]
    }
  ];
}

/**
 * Map all tokens to Figma format
 */
export function mapTokensToFigma(): UnifiedTokens {
  // Generate all token types
  const colorCollection = createColorCollection();
  const spacingCollection = createSpacingCollection();
  const typographyStyles = typographyToFigmaTextStyles(generateTypographyPresets());
  const shadowEffects = createShadowEffects();
  const borderRadiusTokens = createBorderRadiusCollection();
  
  // Generate animation tokens (for documentation)
  const animationTokens = generateAnimationTokens();
  const animationDocs = animationToFigmaDocumentation(animationTokens);
  
  return {
    colors: colorCollection,
    spacing: spacingCollection,
    typography: typographyStyles,
    effects: {
      shadows: shadowEffects,
      borderRadius: borderRadiusTokens
    },
    animations: animationDocs
  };
}

/**
 * Extract tokens from CSS variables and map to Figma format
 */
export function mapCSSVariablesToFigma(cssVariables: ExtractedCSSVariables) {
  // This would be used to process CSS variables from global.css
  // For now, we're using the predefined theme registry approach
  
  // You could extend this to merge CSS variables with theme tokens
  return {
    additionalColors: cssVariables.colors.map(v => ({
      name: v.name.replace('--', '').replace(/\./g, '_').replace(/-/g, '/'),
      value: v.value,
      mode: v.mode
    })),
    additionalSpacing: cssVariables.spacing.map(v => ({
      name: v.name.replace('--', '').replace(/\./g, '_').replace(/-/g, '/'),
      value: parseFloat(v.value) || 0
    }))
  };
}