/**
 * Color Extractor for Figma Plugin
 * Extracts colors from selected frames and generates themes
 * Compatible with Figma's JavaScript environment
 */

interface ExtractedColor {
  value: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  frequency: number;
  usageContext: string[];
  opacity: number;
  luminance: number;
  saturation: number;
  hue: number;
}

interface ColorCategory {
  name: string;
  role: string;
  colors: ExtractedColor[];
  description: string;
}

interface ThemePreview {
  light: Record<string, string>;
  dark: Record<string, string>;
}

interface ColorExtractionResult {
  extractedColors: ExtractedColor[];
  categories: ColorCategory[];
  themePreview: ThemePreview;
  tokens: Record<string, any>;
}

/**
 * Main color extraction function
 */
export async function extractColors(): Promise<ColorExtractionResult> {
  const selection = figma.currentPage.selection;
  if (!selection || selection.length === 0) {
    throw new Error('Please select one or more frames to extract colors from');
  }

  // Map to store unique colors
  const colorMap = new Map<string, ExtractedColor>();

  // Process each selected node
  for (let i = 0; i < selection.length; i++) {
    const node = selection[i];
    await extractColorsFromNode(node, colorMap);
  }

  // Convert map to array and sort by frequency
  const extractedColors = [];
  colorMap.forEach(function(value) {
    extractedColors.push(value);
  });
  extractedColors.sort(function(a, b) { return b.frequency - a.frequency; });

  // Categorize colors
  const categories = categorizeColors(extractedColors);

  // Generate theme preview
  const themePreview = generateThemeFromColors(categories);

  // Generate tokens
  const tokens = generateTokensFromColors(categories);

  return {
    extractedColors: extractedColors,
    categories: categories,
    themePreview: themePreview,
    tokens: tokens
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
    for (let i = 0; i < node.fills.length; i++) {
      const fill = node.fills[i];
      if (fill.type === 'SOLID' && fill.visible !== false) {
        const opacity = fill.opacity !== undefined ? fill.opacity : 1;
        addColorToMap(colorMap, fill.color, 'fill', opacity);
      }
    }
  }

  // Extract strokes
  if ('strokes' in node && Array.isArray(node.strokes)) {
    for (let i = 0; i < node.strokes.length; i++) {
      const stroke = node.strokes[i];
      if (stroke.type === 'SOLID' && stroke.visible !== false) {
        const opacity = stroke.opacity !== undefined ? stroke.opacity : 1;
        addColorToMap(colorMap, stroke.color, 'stroke', opacity);
      }
    }
  }

  // Extract text colors
  if (node.type === 'TEXT' && 'fills' in node) {
    for (let i = 0; i < node.fills.length; i++) {
      const fill = node.fills[i];
      if (fill.type === 'SOLID' && fill.visible !== false) {
        const opacity = fill.opacity !== undefined ? fill.opacity : 1;
        addColorToMap(colorMap, fill.color, 'text', opacity);
      }
    }
  }

  // Extract effect colors (shadows, etc.)
  if ('effects' in node && Array.isArray(node.effects)) {
    for (let i = 0; i < node.effects.length; i++) {
      const effect = node.effects[i];
      if (effect.visible !== false && 'color' in effect) {
        const opacity = effect.color.a !== undefined ? effect.color.a : 1;
        addColorToMap(colorMap, effect.color, 'effect', opacity);
      }
    }
  }

  // Recursively process children
  if ('children' in node) {
    for (let i = 0; i < node.children.length; i++) {
      await extractColorsFromNode(node.children[i], colorMap);
    }
  }
}

/**
 * Add color to the map or update frequency
 */
function addColorToMap(
  colorMap: Map<string, ExtractedColor>,
  color: RGB | RGBA,
  context: string,
  opacity: number
): void {
  const hex = rgbToHex(color);
  const existing = colorMap.get(hex);

  if (existing) {
    existing.frequency++;
    if (existing.usageContext.indexOf(context) === -1) {
      existing.usageContext.push(context);
    }
  } else {
    const hsl = rgbToHsl(color);
    const extractedColor: ExtractedColor = {
      value: hex,
      hex: hex,
      rgb: {
        r: Math.round(color.r * 255),
        g: Math.round(color.g * 255),
        b: Math.round(color.b * 255)
      },
      hsl: hsl,
      frequency: 1,
      usageContext: [context],
      opacity: opacity,
      luminance: calculateLuminance(color),
      saturation: hsl.s,
      hue: hsl.h
    };
    colorMap.set(hex, extractedColor);
  }
}

/**
 * Convert RGB to hex
 */
function rgbToHex(color: RGB | RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(color: RGB | RGBA): { h: number; s: number; l: number } {
  const r = color.r;
  const g = color.g;
  const b = color.b;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Calculate relative luminance
 */
function calculateLuminance(color: RGB | RGBA): number {
  const sRGB = [color.r, color.g, color.b];
  const rgb = [];
  
  for (let i = 0; i < sRGB.length; i++) {
    const channel = sRGB[i];
    if (channel <= 0.04045) {
      rgb.push(channel / 12.92);
    } else {
      rgb.push(Math.pow((channel + 0.055) / 1.055, 2.4));
    }
  }

  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Categorize colors into design system roles
 */
function categorizeColors(colors: ExtractedColor[]): ColorCategory[] {
  const categories: ColorCategory[] = [];

  // Find primary colors (most saturated blues/purples)
  const primaryCandidates = [];
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    if (color.saturation > 30 && color.luminance > 0.1 && color.luminance < 0.9) {
      if ((color.hue >= 200 && color.hue <= 280) || // Blues and purples
          (color.frequency > 5)) { // Or frequently used
        primaryCandidates.push(color);
      }
    }
  }
  
  if (primaryCandidates.length > 0) {
    categories.push({
      name: 'Primary',
      role: 'primary',
      colors: primaryCandidates.slice(0, 3),
      description: 'Main brand colors for primary actions and key UI elements'
    });
  }

  // Find secondary colors
  const secondaryCandidates = [];
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    let isPrimary = false;
    for (let j = 0; j < primaryCandidates.length; j++) {
      if (primaryCandidates[j] === color) {
        isPrimary = true;
        break;
      }
    }
    if (!isPrimary && color.saturation > 20 && color.saturation < 60) {
      secondaryCandidates.push(color);
    }
  }

  if (secondaryCandidates.length > 0) {
    categories.push({
      name: 'Secondary',
      role: 'secondary',
      colors: secondaryCandidates.slice(0, 3),
      description: 'Supporting colors for secondary actions and accents'
    });
  }

  // Find accent colors (highly saturated)
  const accentCandidates = [];
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    let isUsed = false;
    for (let j = 0; j < primaryCandidates.length; j++) {
      if (primaryCandidates[j] === color) isUsed = true;
    }
    for (let j = 0; j < secondaryCandidates.length; j++) {
      if (secondaryCandidates[j] === color) isUsed = true;
    }
    if (!isUsed && color.saturation > 60) {
      accentCandidates.push(color);
    }
  }

  if (accentCandidates.length > 0) {
    categories.push({
      name: 'Accent',
      role: 'accent',
      colors: accentCandidates.slice(0, 2),
      description: 'Vibrant colors for special emphasis and highlights'
    });
  }

  // Find neutral colors (low saturation)
  const neutralCandidates = [];
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    if (color.saturation < 20) {
      neutralCandidates.push(color);
    }
  }
  neutralCandidates.sort(function(a, b) { return a.luminance - b.luminance; });

  if (neutralCandidates.length > 0) {
    categories.push({
      name: 'Neutral',
      role: 'neutral',
      colors: neutralCandidates.slice(0, 10),
      description: 'Grays and near-grays for backgrounds, borders, and text'
    });
  }

  // Find semantic colors
  const semanticCategories = findSemanticColors(colors);
  for (let i = 0; i < semanticCategories.length; i++) {
    categories.push(semanticCategories[i]);
  }

  // Filter out empty categories
  const nonEmptyCategories = [];
  for (let i = 0; i < categories.length; i++) {
    if (categories[i].colors.length > 0) {
      nonEmptyCategories.push(categories[i]);
    }
  }
  
  return nonEmptyCategories;
}

/**
 * Find semantic colors (success, warning, danger, info)
 */
function findSemanticColors(colors: ExtractedColor[]): ColorCategory[] {
  const categories: ColorCategory[] = [];

  // Success colors (greens)
  const successColors = [];
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    if (color.hue >= 80 && color.hue <= 140 && 
        color.saturation > 30 && 
        color.luminance > 0.2 && color.luminance < 0.8) {
      successColors.push(color);
    }
  }

  if (successColors.length > 0) {
    categories.push({
      name: 'Success',
      role: 'success',
      colors: successColors.slice(0, 2),
      description: 'Green colors for success states and positive actions'
    });
  }

  // Warning colors (yellows/oranges)
  const warningColors = [];
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    if (color.hue >= 30 && color.hue <= 60 && 
        color.saturation > 30 && 
        color.luminance > 0.3 && color.luminance < 0.8) {
      warningColors.push(color);
    }
  }

  if (warningColors.length > 0) {
    categories.push({
      name: 'Warning',
      role: 'warning',
      colors: warningColors.slice(0, 2),
      description: 'Yellow/orange colors for warnings and cautions'
    });
  }

  // Danger colors (reds)
  const dangerColors = [];
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    if ((color.hue >= 0 && color.hue <= 20) || (color.hue >= 340 && color.hue <= 360)) {
      if (color.saturation > 30 && 
          color.luminance > 0.2 && color.luminance < 0.8) {
        dangerColors.push(color);
      }
    }
  }

  if (dangerColors.length > 0) {
    categories.push({
      name: 'Danger',
      role: 'danger',
      colors: dangerColors.slice(0, 2),
      description: 'Red colors for errors and destructive actions'
    });
  }

  // Info colors (blues)
  const infoColors = [];
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    if (color.hue >= 180 && color.hue <= 240 && 
        color.saturation > 20 && 
        color.luminance > 0.3 && color.luminance < 0.7) {
      infoColors.push(color);
    }
  }

  if (infoColors.length > 0) {
    categories.push({
      name: 'Info',
      role: 'info',
      colors: infoColors.slice(0, 2),
      description: 'Blue colors for informational content'
    });
  }

  return categories;
}

/**
 * Generate theme from categorized colors
 */
function generateThemeFromColors(categories: ColorCategory[]): ThemePreview {
  // Helper to get first color by role
  function getColorByRole(role: string): ExtractedColor | undefined {
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].role === role && categories[i].colors.length > 0) {
        return categories[i].colors[0];
      }
    }
    return undefined;
  }

  // Get neutral colors
  let neutralCategory;
  for (let i = 0; i < categories.length; i++) {
    if (categories[i].role === 'neutral') {
      neutralCategory = categories[i];
      break;
    }
  }
  const neutrals = neutralCategory ? neutralCategory.colors : [];

  // Sort neutrals by luminance (light to dark)
  const sortedNeutrals = neutrals.slice();
  sortedNeutrals.sort(function(a, b) { return b.luminance - a.luminance; });

  // Light theme
  const lightTheme: Record<string, string> = {
    background: sortedNeutrals[0] ? hslToString(sortedNeutrals[0].hsl) : '0 0% 100%',
    foreground: sortedNeutrals[sortedNeutrals.length - 1] ? 
      hslToString(sortedNeutrals[sortedNeutrals.length - 1].hsl) : '0 0% 3.9%',
    card: sortedNeutrals[0] ? hslToString(sortedNeutrals[0].hsl) : '0 0% 100%',
    'card-foreground': sortedNeutrals[sortedNeutrals.length - 1] ? 
      hslToString(sortedNeutrals[sortedNeutrals.length - 1].hsl) : '0 0% 3.9%',
    popover: sortedNeutrals[0] ? hslToString(sortedNeutrals[0].hsl) : '0 0% 100%',
    'popover-foreground': sortedNeutrals[sortedNeutrals.length - 1] ? 
      hslToString(sortedNeutrals[sortedNeutrals.length - 1].hsl) : '0 0% 3.9%'
  };

  // Add primary color
  const primary = getColorByRole('primary');
  if (primary) {
    lightTheme.primary = hslToString(primary.hsl);
    lightTheme['primary-foreground'] = primary.luminance > 0.5 ? '0 0% 0%' : '0 0% 100%';
  }

  // Add secondary color
  const secondary = getColorByRole('secondary');
  if (secondary) {
    lightTheme.secondary = hslToString(secondary.hsl);
    lightTheme['secondary-foreground'] = secondary.luminance > 0.5 ? '0 0% 0%' : '0 0% 100%';
  }

  // Add semantic colors
  const success = getColorByRole('success');
  if (success) {
    lightTheme.success = hslToString(success.hsl);
    lightTheme['success-foreground'] = '0 0% 100%';
  }

  const warning = getColorByRole('warning');
  if (warning) {
    lightTheme.warning = hslToString(warning.hsl);
    lightTheme['warning-foreground'] = '0 0% 0%';
  }

  const danger = getColorByRole('danger');
  if (danger) {
    lightTheme.destructive = hslToString(danger.hsl);
    lightTheme['destructive-foreground'] = '0 0% 100%';
  }

  // Add muted and accent
  if (sortedNeutrals.length > 2) {
    lightTheme.muted = hslToString(sortedNeutrals[1].hsl);
    lightTheme['muted-foreground'] = hslToString(sortedNeutrals[sortedNeutrals.length - 2].hsl);
  }

  const accent = getColorByRole('accent');
  if (accent) {
    lightTheme.accent = hslToString(accent.hsl);
    lightTheme['accent-foreground'] = accent.luminance > 0.5 ? '0 0% 0%' : '0 0% 100%';
  }

  // Add border and input
  if (sortedNeutrals.length > 3) {
    lightTheme.border = hslToString(sortedNeutrals[2].hsl);
    lightTheme.input = hslToString(sortedNeutrals[2].hsl);
  }

  // Add ring (primary with adjusted opacity)
  if (primary) {
    lightTheme.ring = hslToString(primary.hsl);
  }

  // Generate dark theme by adjusting lightness
  const darkTheme: Record<string, string> = {};
  
  // Invert backgrounds and foregrounds for dark theme
  darkTheme.background = sortedNeutrals[sortedNeutrals.length - 1] ? 
    hslToString(sortedNeutrals[sortedNeutrals.length - 1].hsl) : '0 0% 3.9%';
  darkTheme.foreground = sortedNeutrals[0] ? 
    hslToString(sortedNeutrals[0].hsl) : '0 0% 98%';
  
  // Adjust other colors for dark theme
  for (const key in lightTheme) {
    if (!(key in darkTheme)) {
      darkTheme[key] = adjustForDarkMode(lightTheme[key], key);
    }
  }

  return {
    light: lightTheme,
    dark: darkTheme
  };
}

/**
 * Convert HSL to string format
 */
function hslToString(hsl: { h: number; s: number; l: number }): string {
  return hsl.h + ' ' + hsl.s + '% ' + hsl.l + '%';
}

/**
 * Adjust color for dark mode
 */
function adjustForDarkMode(hslString: string, key: string): string {
  const parts = hslString.split(' ');
  const h = parseInt(parts[0]);
  const s = parseInt(parts[1]);
  const l = parseInt(parts[2]);

  // Special handling for certain keys
  if (key.includes('foreground')) {
    // Invert lightness for foreground colors
    return h + ' ' + s + '% ' + (100 - l) + '%';
  } else if (key.includes('background') || key.includes('card') || key.includes('popover')) {
    // Dark backgrounds
    return h + ' ' + s + '% ' + Math.min(l * 0.1, 10) + '%';
  } else if (key === 'primary' || key === 'secondary' || key === 'accent') {
    // Slightly lighter for dark mode
    return h + ' ' + s + '% ' + Math.min(l + 10, 70) + '%';
  } else if (key === 'muted') {
    // Darker muted colors
    return h + ' ' + s + '% ' + Math.max(l * 0.3, 15) + '%';
  } else if (key === 'border' || key === 'input') {
    // Darker borders
    return h + ' ' + s + '% ' + Math.max(l * 0.2, 20) + '%';
  }

  // Default: darken the color
  return h + ' ' + s + '% ' + Math.max(l * 0.5, 20) + '%';
}

/**
 * Generate design tokens from categorized colors
 */
function generateTokensFromColors(categories: ColorCategory[]): Record<string, any> {
  const tokens: Record<string, any> = {
    colors: {},
    semantic: {},
    neutral: {}
  };

  // Process each category
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    
    if (category.role === 'primary' || category.role === 'secondary' || category.role === 'accent') {
      tokens.colors[category.role] = {};
      for (let j = 0; j < category.colors.length; j++) {
        const color = category.colors[j];
        const shade = j === 0 ? 'default' : (j * 100 + 400).toString();
        tokens.colors[category.role][shade] = {
          hex: color.hex,
          rgb: color.rgb,
          hsl: color.hsl
        };
      }
    } else if (category.role === 'neutral') {
      for (let j = 0; j < category.colors.length; j++) {
        const color = category.colors[j];
        const shade = Math.round((1 - color.luminance) * 900);
        tokens.neutral[shade.toString()] = {
          hex: color.hex,
          rgb: color.rgb,
          hsl: color.hsl
        };
      }
    } else {
      // Semantic colors
      tokens.semantic[category.role] = {
        default: category.colors[0] ? {
          hex: category.colors[0].hex,
          rgb: category.colors[0].rgb,
          hsl: category.colors[0].hsl
        } : null
      };
    }
  }

  return tokens;
}

/**
 * Apply extracted theme to current Figma page
 */
export async function applyExtractedTheme(theme: ThemePreview): Promise<void> {
  // This would create color styles in Figma
  // For now, we'll just log the action
  console.log('Applying theme to Figma page:', theme);
  
  // In a real implementation, you would:
  // 1. Create or update color styles for each theme color
  // 2. Apply the styles to the current page
  // 3. Update any existing components to use the new colors
}

/**
 * Sync extracted colors to codebase via MCP
 */
export async function syncExtractedColors(
  colors: ExtractedColor[],
  categories: ColorCategory[],
  theme: ThemePreview
): Promise<void> {
  // This would communicate with the MCP server
  // For now, we'll just log the action
  console.log('Syncing colors to codebase:', {
    colors: colors,
    categories: categories,
    theme: theme
  });
  
  // In a real implementation, you would:
  // 1. Send the data to the MCP server
  // 2. Update global.css with new CSS variables
  // 3. Update theme registry files
  // 4. Generate documentation
}