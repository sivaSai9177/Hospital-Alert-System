/**
 * Color Extractor Handler
 * Extracts and analyzes colors from selected frames in Figma
 * Converts colors to HSL format for theme compatibility
 * Provides smart categorization and theme generation
 */

import { ColorToken, HSL, RGBA } from '../../shared/types/design-tokens';
import { syncTokensToCode } from './mcp-sync';

export interface ExtractedColor {
  hex: string;
  rgb: RGBA;
  hsl: HSL;
  opacity: number;
  usage: ColorUsage;
  frequency: number;
  luminance: number;
  saturation: number;
  temperature: 'cool' | 'warm' | 'neutral';
}

export interface ColorUsage {
  fill: number;
  stroke: number;
  text: number;
  effect: number;
}

export interface ColorCategory {
  name: string;
  role: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  colors: ExtractedColor[];
  suggestion?: string;
}

export interface ThemePreview {
  name: string;
  light: Record<string, string>;
  dark: Record<string, string>;
  description: string;
}

export interface ColorExtractionResult {
  extractedColors: ExtractedColor[];
  categories: ColorCategory[];
  themePreview: ThemePreview;
  tokens: ColorToken[];
}

/**
 * Extract colors from selected frames
 */
export async function extractColorsFromSelection(): Promise<ColorExtractionResult> {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    throw new Error('Please select one or more frames to extract colors from');
  }

  // Collect all colors from selected nodes
  const colorMap = new Map<string, ExtractedColor>();
  
  for (const node of selection) {
    await extractColorsFromNode(node, colorMap);
  }

  // Convert map to array and sort by frequency
  const extractedColors = Array.from(colorMap.values())
    .sort((a, b) => b.frequency - a.frequency);

  // Categorize colors
  const categories = categorizeColors(extractedColors);

  // Generate theme preview
  const themePreview = generateThemePreview(categories);

  // Create color tokens
  const tokens = createColorTokens(categories, themePreview);

  return {
    extractedColors,
    categories,
    themePreview,
    tokens
  };
}

/**
 * Recursively extract colors from a node and its children
 */
async function extractColorsFromNode(
  node: BaseNode,
  colorMap: Map<string, ExtractedColor>
): Promise<void> {
  // Extract fills
  if ('fills' in node && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill.type === 'SOLID' && fill.visible !== false) {
        const color = fill.color;
        const opacity = fill.opacity ?? 1;
        addColorToMap(colorMap, color, opacity, 'fill');
      }
    }
  }

  // Extract strokes
  if ('strokes' in node && Array.isArray(node.strokes)) {
    for (const stroke of node.strokes) {
      if (stroke.type === 'SOLID' && stroke.visible !== false) {
        const color = stroke.color;
        const opacity = stroke.opacity ?? 1;
        addColorToMap(colorMap, color, opacity, 'stroke');
      }
    }
  }

  // Extract text colors
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    const fills = textNode.fills;
    if (Array.isArray(fills)) {
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          const color = fill.color;
          const opacity = fill.opacity ?? 1;
          addColorToMap(colorMap, color, opacity, 'text');
        }
      }
    }
  }

  // Extract effects (shadows, etc.)
  if ('effects' in node && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if (('color' in effect) && effect.visible !== false) {
        const color = effect.color;
        const opacity = color.a ?? 1;
        addColorToMap(colorMap, { r: color.r, g: color.g, b: color.b }, opacity, 'effect');
      }
    }
  }

  // Recurse through children
  if ('children' in node) {
    for (const child of node.children) {
      await extractColorsFromNode(child, colorMap);
    }
  }
}

/**
 * Add color to map with usage tracking
 */
function addColorToMap(
  colorMap: Map<string, ExtractedColor>,
  color: RGB,
  opacity: number,
  usage: keyof ColorUsage
): void {
  const rgb: RGBA = {
    r: Math.round(color.r * 255),
    g: Math.round(color.g * 255),
    b: Math.round(color.b * 255),
    a: opacity
  };

  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const luminance = calculateLuminance(rgb);
  const saturation = hsl.s;
  const temperature = getColorTemperature(hsl);

  const key = `${hex}-${opacity}`;

  if (colorMap.has(key)) {
    const existing = colorMap.get(key)!;
    existing.frequency++;
    existing.usage[usage]++;
  } else {
    colorMap.set(key, {
      hex,
      rgb,
      hsl,
      opacity,
      usage: {
        fill: usage === 'fill' ? 1 : 0,
        stroke: usage === 'stroke' ? 1 : 0,
        text: usage === 'text' ? 1 : 0,
        effect: usage === 'effect' ? 1 : 0
      },
      frequency: 1,
      luminance,
      saturation,
      temperature
    });
  }
}

/**
 * Convert RGB to Hex
 */
function rgbToHex(rgb: RGBA): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(rgb: RGBA): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    case b:
      h = (r - g) / d + 4;
      break;
    default:
      h = 0;
  }

  h /= 6;

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to CSS HSL string
 */
function hslToString(hsl: HSL): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Calculate relative luminance
 */
function calculateLuminance(rgb: RGBA): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Determine color temperature
 */
function getColorTemperature(hsl: HSL): 'cool' | 'warm' | 'neutral' {
  const hue = hsl.h;
  const saturation = hsl.s;

  if (saturation < 10) {
    return 'neutral';
  }

  if ((hue >= 0 && hue <= 60) || (hue >= 300 && hue <= 360)) {
    return 'warm';
  } else if (hue >= 120 && hue <= 240) {
    return 'cool';
  } else {
    return 'neutral';
  }
}

/**
 * Categorize colors based on usage and characteristics
 */
function categorizeColors(colors: ExtractedColor[]): ColorCategory[] {
  const categories: ColorCategory[] = [];

  // Find primary colors (most used, medium to high saturation)
  const primaryCandidates = colors
    .filter(c => c.saturation > 30 && c.luminance > 0.1 && c.luminance < 0.9)
    .slice(0, 3);

  if (primaryCandidates.length > 0) {
    categories.push({
      name: 'Primary',
      role: 'primary',
      colors: [primaryCandidates[0]],
      suggestion: 'Main brand color, used for primary actions and key UI elements'
    });
  }

  // Find secondary colors
  const secondaryCandidates = colors
    .filter(c => !primaryCandidates.includes(c))
    .filter(c => c.saturation > 20 && c.saturation < 60)
    .slice(0, 2);

  if (secondaryCandidates.length > 0) {
    categories.push({
      name: 'Secondary',
      role: 'secondary',
      colors: secondaryCandidates,
      suggestion: 'Supporting colors for secondary actions and elements'
    });
  }

  // Find accent colors (high saturation, distinct hue)
  const accentCandidates = colors
    .filter(c => !primaryCandidates.includes(c) && !secondaryCandidates.includes(c))
    .filter(c => c.saturation > 60)
    .slice(0, 2);

  if (accentCandidates.length > 0) {
    categories.push({
      name: 'Accent',
      role: 'accent',
      colors: accentCandidates,
      suggestion: 'Highlight colors for emphasis and special elements'
    });
  }

  // Find neutral colors (low saturation)
  const neutralColors = colors
    .filter(c => c.saturation < 20)
    .sort((a, b) => a.luminance - b.luminance);

  if (neutralColors.length > 0) {
    categories.push({
      name: 'Neutral',
      role: 'neutral',
      colors: neutralColors,
      suggestion: 'Background, text, and border colors'
    });
  }

  // Find semantic colors
  const semanticColors = findSemanticColors(colors);
  categories.push(...semanticColors);

  return categories;
}

/**
 * Find semantic colors (success, warning, danger, info)
 */
function findSemanticColors(colors: ExtractedColor[]): ColorCategory[] {
  const categories: ColorCategory[] = [];

  // Success (green hues)
  const successColors = colors.filter(c => 
    c.hsl.h >= 90 && c.hsl.h <= 150 && c.saturation > 30
  );
  if (successColors.length > 0) {
    categories.push({
      name: 'Success',
      role: 'success',
      colors: [successColors[0]],
      suggestion: 'Success states and positive actions'
    });
  }

  // Warning (yellow/orange hues)
  const warningColors = colors.filter(c => 
    c.hsl.h >= 30 && c.hsl.h <= 60 && c.saturation > 30
  );
  if (warningColors.length > 0) {
    categories.push({
      name: 'Warning',
      role: 'warning',
      colors: [warningColors[0]],
      suggestion: 'Warning states and caution elements'
    });
  }

  // Danger (red hues)
  const dangerColors = colors.filter(c => 
    (c.hsl.h >= 0 && c.hsl.h <= 20) || (c.hsl.h >= 340 && c.hsl.h <= 360) && c.saturation > 30
  );
  if (dangerColors.length > 0) {
    categories.push({
      name: 'Danger',
      role: 'danger',
      colors: [dangerColors[0]],
      suggestion: 'Error states and destructive actions'
    });
  }

  // Info (blue hues)
  const infoColors = colors.filter(c => 
    c.hsl.h >= 200 && c.hsl.h <= 240 && c.saturation > 30
  );
  if (infoColors.length > 0) {
    categories.push({
      name: 'Info',
      role: 'info',
      colors: [infoColors[0]],
      suggestion: 'Informational states and highlights'
    });
  }

  return categories;
}

/**
 * Generate theme preview with light and dark modes
 */
function generateThemePreview(categories: ColorCategory[]): ThemePreview {
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};

  // Get colors by role
  const getColorByRole = (role: string) => 
    categories.find(c => c.role === role)?.colors[0];

  const primary = getColorByRole('primary');
  const secondary = getColorByRole('secondary');
  const accent = getColorByRole('accent');
  const neutrals = categories.find(c => c.role === 'neutral')?.colors || [];
  const success = getColorByRole('success');
  const warning = getColorByRole('warning');
  const danger = getColorByRole('danger');

  // Sort neutrals by luminance
  const sortedNeutrals = [...neutrals].sort((a, b) => b.luminance - a.luminance);
  
  // Light theme
  light.background = sortedNeutrals[0] ? hslToString(sortedNeutrals[0].hsl) : '0 0% 100%';
  light.foreground = sortedNeutrals[sortedNeutrals.length - 1] ? hslToString(sortedNeutrals[sortedNeutrals.length - 1].hsl) : '222.2 84% 4.9%';
  light.card = sortedNeutrals[0] ? hslToString(sortedNeutrals[0].hsl) : '0 0% 100%';
  light.cardForeground = sortedNeutrals[sortedNeutrals.length - 1] ? hslToString(sortedNeutrals[sortedNeutrals.length - 1].hsl) : '222.2 84% 4.9%';
  light.popover = sortedNeutrals[0] ? hslToString(sortedNeutrals[0].hsl) : '0 0% 100%';
  light.popoverForeground = sortedNeutrals[sortedNeutrals.length - 1] ? hslToString(sortedNeutrals[sortedNeutrals.length - 1].hsl) : '222.2 84% 4.9%';
  
  if (primary) {
    light.primary = hslToString(primary.hsl);
    light.primaryForeground = primary.luminance > 0.5 ? '222.2 84% 4.9%' : '210 40% 98%';
  } else {
    light.primary = '222.2 47.4% 11.2%';
    light.primaryForeground = '210 40% 98%';
  }

  if (secondary) {
    light.secondary = hslToString(adjustLightness(secondary.hsl, 0.9));
    light.secondaryForeground = hslToString(adjustLightness(secondary.hsl, 0.2));
  } else {
    light.secondary = '210 40% 96%';
    light.secondaryForeground = '222.2 47.4% 11.2%';
  }

  if (accent) {
    light.accent = hslToString(adjustLightness(accent.hsl, 0.9));
    light.accentForeground = hslToString(adjustLightness(accent.hsl, 0.2));
  } else {
    light.accent = '210 40% 96%';
    light.accentForeground = '222.2 47.4% 11.2%';
  }

  light.muted = sortedNeutrals[1] ? hslToString(sortedNeutrals[1].hsl) : '210 40% 96%';
  light.mutedForeground = sortedNeutrals[sortedNeutrals.length - 2] ? hslToString(sortedNeutrals[sortedNeutrals.length - 2].hsl) : '215.4 16.3% 46.9%';

  light.destructive = danger ? hslToString(danger.hsl) : '0 84.2% 60.2%';
  light.destructiveForeground = '0 0% 98%';

  light.border = sortedNeutrals[2] ? hslToString(sortedNeutrals[2].hsl) : '214.3 31.8% 91.4%';
  light.input = sortedNeutrals[2] ? hslToString(sortedNeutrals[2].hsl) : '214.3 31.8% 91.4%';
  light.ring = primary ? hslToString(primary.hsl) : '222.2 84% 4.9%';

  if (success) {
    light.success = hslToString(success.hsl);
    light.successForeground = '0 0% 98%';
  }

  // Dark theme (invert luminance)
  dark.background = sortedNeutrals[sortedNeutrals.length - 1] ? hslToString(adjustLightness(sortedNeutrals[sortedNeutrals.length - 1].hsl, 0.05)) : '222.2 84% 4.9%';
  dark.foreground = sortedNeutrals[0] ? hslToString(adjustLightness(sortedNeutrals[0].hsl, 0.98)) : '210 40% 98%';
  dark.card = sortedNeutrals[sortedNeutrals.length - 1] ? hslToString(adjustLightness(sortedNeutrals[sortedNeutrals.length - 1].hsl, 0.05)) : '222.2 84% 4.9%';
  dark.cardForeground = sortedNeutrals[0] ? hslToString(adjustLightness(sortedNeutrals[0].hsl, 0.98)) : '210 40% 98%';
  dark.popover = sortedNeutrals[sortedNeutrals.length - 1] ? hslToString(adjustLightness(sortedNeutrals[sortedNeutrals.length - 1].hsl, 0.05)) : '222.2 84% 4.9%';
  dark.popoverForeground = sortedNeutrals[0] ? hslToString(adjustLightness(sortedNeutrals[0].hsl, 0.98)) : '210 40% 98%';

  if (primary) {
    dark.primary = hslToString(adjustLightness(primary.hsl, 0.7));
    dark.primaryForeground = primary.luminance < 0.5 ? '210 40% 98%' : '222.2 84% 4.9%';
  } else {
    dark.primary = '210 40% 98%';
    dark.primaryForeground = '222.2 47.4% 11.2%';
  }

  if (secondary) {
    dark.secondary = hslToString(adjustLightness(secondary.hsl, 0.15));
    dark.secondaryForeground = hslToString(adjustLightness(secondary.hsl, 0.9));
  } else {
    dark.secondary = '217.2 32.6% 17.5%';
    dark.secondaryForeground = '210 40% 98%';
  }

  if (accent) {
    dark.accent = hslToString(adjustLightness(accent.hsl, 0.15));
    dark.accentForeground = hslToString(adjustLightness(accent.hsl, 0.9));
  } else {
    dark.accent = '217.2 32.6% 17.5%';
    dark.accentForeground = '210 40% 98%';
  }

  dark.muted = sortedNeutrals[sortedNeutrals.length - 2] ? hslToString(adjustLightness(sortedNeutrals[sortedNeutrals.length - 2].hsl, 0.15)) : '217.2 32.6% 17.5%';
  dark.mutedForeground = sortedNeutrals[1] ? hslToString(adjustLightness(sortedNeutrals[1].hsl, 0.7)) : '215 20.2% 65.1%';

  dark.destructive = danger ? hslToString(adjustLightness(danger.hsl, 0.5)) : '0 62.8% 30.6%';
  dark.destructiveForeground = '210 40% 98%';

  dark.border = sortedNeutrals[sortedNeutrals.length - 2] ? hslToString(adjustLightness(sortedNeutrals[sortedNeutrals.length - 2].hsl, 0.15)) : '217.2 32.6% 17.5%';
  dark.input = sortedNeutrals[sortedNeutrals.length - 2] ? hslToString(adjustLightness(sortedNeutrals[sortedNeutrals.length - 2].hsl, 0.15)) : '217.2 32.6% 17.5%';
  dark.ring = primary ? hslToString(adjustLightness(primary.hsl, 0.7)) : '212.7 26.8% 83.9%';

  if (success) {
    dark.success = hslToString(adjustLightness(success.hsl, 0.5));
    dark.successForeground = '210 40% 98%';
  }

  return {
    name: 'Extracted Theme',
    light,
    dark,
    description: 'Theme generated from extracted Figma colors'
  };
}

/**
 * Adjust lightness of HSL color
 */
function adjustLightness(hsl: HSL, targetLightness: number): HSL {
  return {
    h: hsl.h,
    s: hsl.s,
    l: Math.round(targetLightness * 100)
  };
}

/**
 * Create color tokens from categories
 */
function createColorTokens(categories: ColorCategory[], theme: ThemePreview): ColorToken[] {
  const tokens: ColorToken[] = [];

  // Add theme colors as tokens
  for (const [name, value] of Object.entries(theme.light)) {
    tokens.push({
      name: `${name}-light`,
      value: `hsl(${value})`,
      hsl: parseHslString(value),
      description: `Light mode ${name} color`,
      category: getTokenCategory(name)
    });
  }

  for (const [name, value] of Object.entries(theme.dark)) {
    tokens.push({
      name: `${name}-dark`,
      value: `hsl(${value})`,
      hsl: parseHslString(value),
      description: `Dark mode ${name} color`,
      category: getTokenCategory(name)
    });
  }

  // Add raw extracted colors as additional tokens
  let colorIndex = 0;
  for (const category of categories) {
    for (const color of category.colors) {
      tokens.push({
        name: `extracted-${category.role}-${colorIndex++}`,
        value: color.hex,
        rgb: color.rgb,
        hsl: color.hsl,
        opacity: color.opacity,
        description: `${category.name} color extracted from Figma`,
        category: category.role as ColorToken['category']
      });
    }
  }

  return tokens;
}

/**
 * Parse HSL string to HSL object
 */
function parseHslString(hslString: string): HSL {
  const parts = hslString.split(' ');
  return {
    h: parseFloat(parts[0]),
    s: parseFloat(parts[1].replace('%', '')),
    l: parseFloat(parts[2].replace('%', ''))
  };
}

/**
 * Get token category from color name
 */
function getTokenCategory(name: string): ColorToken['category'] {
  if (name.includes('primary')) return 'primary';
  if (name.includes('secondary')) return 'secondary';
  if (name.includes('accent')) return 'accent';
  if (name.includes('success')) return 'success';
  if (name.includes('warning')) return 'warning';
  if (name.includes('destructive') || name.includes('danger')) return 'danger';
  if (name.includes('info')) return 'info';
  return 'neutral';
}

/**
 * Sync extracted colors to codebase
 */
export async function syncExtractedColors(result: ColorExtractionResult): Promise<void> {
  const config = {
    targetFile: 'lib/theme/extracted-theme.tsx',
    format: 'shadcn',
    generateDarkMode: true
  };

  const response = await syncTokensToCode({
    colors: result.tokens,
    theme: result.themePreview
  }, config);

  if (!response.success) {
    throw new Error(`Failed to sync colors: ${response.error}`);
  }
}

/**
 * Apply extracted theme to current page
 */
export async function applyExtractedTheme(theme: ThemePreview): Promise<void> {
  // This would create/update Figma styles based on the extracted theme
  // Implementation depends on specific requirements
  
  // For now, just log the theme
  console.log('Theme to apply:', theme);
  
  // TODO: Implement style creation/updates
  // - Create/update color styles
  // - Apply to components
  // - Update design system frames
}