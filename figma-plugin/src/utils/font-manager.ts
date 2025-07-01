/**
 * Font Manager Utility
 * Handles custom fonts and font families in Figma
 */

export interface FontInfo {
  family: string;
  style: string;
  weight?: number;
  italic?: boolean;
}

export interface FontMapping {
  cssFamily: string;
  figmaFamily: string;
  fallbacks?: string[];
  weightMap?: Record<number, string>;
}

/**
 * Tailwind CSS default font stacks
 */
export const TAILWIND_FONT_STACKS = {
  'font-sans': [
    'ui-sans-serif',
    'system-ui',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    '"Noto Color Emoji"'
  ],
  'font-serif': [
    'ui-serif',
    'Georgia',
    'Cambria',
    '"Times New Roman"',
    'Times',
    'serif'
  ],
  'font-mono': [
    'ui-monospace',
    'SFMono-Regular',
    '"SF Mono"',
    'Consolas',
    '"Liberation Mono"',
    '"Courier New"',
    'monospace'
  ]
};

/**
 * Common font mappings between CSS and Figma
 */
export const FONT_MAPPINGS: Record<string, FontMapping> = {
  // Tailwind font stacks
  'font-sans': {
    cssFamily: 'ui-sans-serif, system-ui, sans-serif',
    figmaFamily: 'Inter',
    fallbacks: ['SF Pro Display', 'Helvetica Neue', 'Arial']
  },
  'font-serif': {
    cssFamily: 'ui-serif, Georgia, serif',
    figmaFamily: 'Georgia',
    fallbacks: ['Times New Roman', 'Times']
  },
  'font-mono': {
    cssFamily: 'ui-monospace, SFMono-Regular, monospace',
    figmaFamily: 'SF Mono',
    fallbacks: ['Monaco', 'Consolas', 'Courier New']
  },
  
  // System fonts
  'system-ui': {
    cssFamily: 'system-ui',
    figmaFamily: 'Inter',
    fallbacks: ['Helvetica Neue', 'Arial']
  },
  '-apple-system': {
    cssFamily: '-apple-system',
    figmaFamily: 'SF Pro Display',
    fallbacks: ['Inter', 'Helvetica Neue']
  },
  
  // Google Fonts
  'Roboto': {
    cssFamily: 'Roboto',
    figmaFamily: 'Roboto',
    weightMap: {
      100: 'Thin',
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      700: 'Bold',
      900: 'Black'
    }
  },
  'Open Sans': {
    cssFamily: 'Open Sans',
    figmaFamily: 'Open Sans',
    weightMap: {
      300: 'Light',
      400: 'Regular',
      600: 'SemiBold',
      700: 'Bold',
      800: 'ExtraBold'
    }
  },
  'Montserrat': {
    cssFamily: 'Montserrat',
    figmaFamily: 'Montserrat',
    weightMap: {
      100: 'Thin',
      200: 'ExtraLight',
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      600: 'SemiBold',
      700: 'Bold',
      800: 'ExtraBold',
      900: 'Black'
    }
  },
  'Poppins': {
    cssFamily: 'Poppins',
    figmaFamily: 'Poppins',
    weightMap: {
      100: 'Thin',
      200: 'ExtraLight',
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      600: 'SemiBold',
      700: 'Bold',
      800: 'ExtraBold',
      900: 'Black'
    }
  },
  'Lato': {
    cssFamily: 'Lato',
    figmaFamily: 'Lato',
    weightMap: {
      100: 'Hairline',
      300: 'Light',
      400: 'Regular',
      700: 'Bold',
      900: 'Black'
    }
  },
  
  // Default fallback
  'Inter': {
    cssFamily: 'Inter',
    figmaFamily: 'Inter',
    weightMap: {
      100: 'Thin',
      200: 'Extra Light', // Space required
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      600: 'Semi Bold', // Space required
      700: 'Bold',
      800: 'Extra Bold', // Space required
      900: 'Black'
    }
  }
};

/**
 * Extract font family from CSS font-family string
 */
export function extractFontFamily(fontFamilyString: string): string {
  // Check if it's a Tailwind font utility class
  if (fontFamilyString.startsWith('font-')) {
    return fontFamilyString;
  }
  
  // Remove quotes and get first font
  const fonts = fontFamilyString.split(',').map(f => f.trim().replace(/['"]/g, ''));
  return fonts[0] || 'font-sans';
}

/**
 * Get Tailwind font family class from font name
 */
export function getTailwindFontClass(fontFamily: string): string {
  // Check if already a Tailwind class
  if (fontFamily.startsWith('font-')) {
    return fontFamily;
  }
  
  // Map common fonts to Tailwind classes
  const fontLower = fontFamily.toLowerCase();
  if (fontLower.includes('mono') || fontLower.includes('courier') || fontLower.includes('consolas')) {
    return 'font-mono';
  }
  if (fontLower.includes('serif') || fontLower.includes('georgia') || fontLower.includes('times')) {
    return 'font-serif';
  }
  
  // Default to sans
  return 'font-sans';
}

/**
 * Get Figma font info from CSS properties
 */
export function getFigmaFontInfo(
  cssFamily: string,
  weight: number = 400,
  italic: boolean = false
): FontInfo {
  const family = extractFontFamily(cssFamily);
  const mapping = FONT_MAPPINGS[family] || FONT_MAPPINGS['Inter'];
  
  const figmaFamily = mapping.figmaFamily;
  const style = getFontStyleFromWeight(weight, italic, mapping.weightMap);
  
  return {
    family: figmaFamily,
    style,
    weight,
    italic
  };
}

/**
 * Get font style name from weight
 */
export function getFontStyleFromWeight(
  weight: number,
  italic: boolean = false,
  customWeightMap?: Record<number, string>
): string {
  const weightMap = customWeightMap || FONT_MAPPINGS['Inter'].weightMap!;
  
  // Find exact match or closest weight
  let closestWeight = 400;
  let minDiff = Math.abs(weight - 400);
  
  for (const w of Object.keys(weightMap).map(Number)) {
    const diff = Math.abs(weight - w);
    if (diff < minDiff) {
      minDiff = diff;
      closestWeight = w;
    }
  }
  
  const baseStyle = weightMap[closestWeight] || 'Regular';
  return italic ? `${baseStyle} Italic` : baseStyle;
}

/**
 * Detect available fonts in Figma
 */
export async function detectAvailableFonts(): Promise<string[]> {
  const availableFonts: Set<string> = new Set();
  
  // Try loading common fonts to check availability
  const testFonts = [
    { family: 'Inter', style: 'Regular' },
    { family: 'Roboto', style: 'Regular' },
    { family: 'Open Sans', style: 'Regular' },
    { family: 'Montserrat', style: 'Regular' },
    { family: 'Poppins', style: 'Regular' },
    { family: 'Lato', style: 'Regular' },
    { family: 'SF Pro Display', style: 'Regular' },
    { family: 'Helvetica Neue', style: 'Regular' },
    { family: 'Arial', style: 'Regular' }
  ];
  
  for (const font of testFonts) {
    try {
      await figma.loadFontAsync(font);
      availableFonts.add(font.family);
    } catch (error) {
      // Font not available
    }
  }
  
  return Array.from(availableFonts);
}

/**
 * Load font with fallbacks
 */
export async function loadFontWithFallbacks(
  fontInfo: FontInfo,
  fallbackFamilies?: string[]
): Promise<FontInfo> {
  const fallbacks = fallbackFamilies || ['Inter'];
  
  // Try primary font
  try {
    await figma.loadFontAsync({
      family: fontInfo.family,
      style: fontInfo.style
    });
    return fontInfo;
  } catch (error) {
    console.warn(`Failed to load ${fontInfo.family} ${fontInfo.style}, trying fallbacks...`);
  }
  
  // Try with Regular style
  try {
    await figma.loadFontAsync({
      family: fontInfo.family,
      style: 'Regular'
    });
    return Object.assign({}, fontInfo, { style: 'Regular' });
  } catch (error) {
    // Continue to fallbacks
  }
  
  // Try fallback fonts
  for (const fallback of fallbacks) {
    try {
      const fallbackMapping = FONT_MAPPINGS[fallback] || FONT_MAPPINGS['Inter'];
      const fallbackStyle = getFontStyleFromWeight(
        fontInfo.weight || 400,
        fontInfo.italic,
        fallbackMapping.weightMap
      );
      
      await figma.loadFontAsync({
        family: fallbackMapping.figmaFamily,
        style: fallbackStyle
      });
      
      console.log(`Using fallback font: ${fallbackMapping.figmaFamily} ${fallbackStyle}`);
      return {
        family: fallbackMapping.figmaFamily,
        style: fallbackStyle,
        weight: fontInfo.weight,
        italic: fontInfo.italic
      };
    } catch (error) {
      // Try next fallback
    }
  }
  
  // Final fallback to Inter Regular
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  return {
    family: 'Inter',
    style: 'Regular',
    weight: 400,
    italic: false
  };
}

/**
 * Create font loader for batch operations
 */
export function createFontLoader(fallbackFamilies?: string[]) {
  const loadedFonts = new Map<string, FontInfo>();
  
  return async function loadFont(fontInfo: FontInfo): Promise<FontInfo> {
    const key = `${fontInfo.family}:${fontInfo.style}`;
    
    if (loadedFonts.has(key)) {
      return loadedFonts.get(key)!;
    }
    
    const loadedFont = await loadFontWithFallbacks(fontInfo, fallbackFamilies);
    loadedFonts.set(key, loadedFont);
    
    return loadedFont;
  };
}

/**
 * Get font info from Figma text node
 */
export function getFontInfoFromNode(node: TextNode): FontInfo | null {
  if (node.fontName === figma.mixed) {
    return null;
  }
  
  const fontName = node.fontName as FontName;
  
  // Find weight from style name
  let weight = 400;
  let italic = false;
  
  if (fontName.style.toLowerCase().includes('italic')) {
    italic = true;
  }
  
  // Try to extract weight from style name
  const styleWords = fontName.style.replace(/italic/i, '').trim().toLowerCase();
  
  const weightKeywords: Record<string, number> = {
    'thin': 100,
    'hairline': 100,
    'extralight': 200,
    'extra light': 200,
    'light': 300,
    'regular': 400,
    'normal': 400,
    'medium': 500,
    'semibold': 600,
    'semi bold': 600,
    'bold': 700,
    'extrabold': 800,
    'extra bold': 800,
    'black': 900,
    'heavy': 900
  };
  
  for (const [keyword, w] of Object.entries(weightKeywords)) {
    if (styleWords.includes(keyword)) {
      weight = w;
      break;
    }
  }
  
  return {
    family: fontName.family,
    style: fontName.style,
    weight,
    italic
  };
}

/**
 * Convert typography token to use custom font
 */
export function applyCustomFont(
  typographyToken: any,
  fontFamily?: string
): any {
  if (!fontFamily) {
    return typographyToken;
  }
  
  const fontInfo = getFigmaFontInfo(
    fontFamily,
    typographyToken.fontWeight || 400,
    false
  );
  
  return Object.assign({}, typographyToken, {
    fontFamily: fontInfo.family,
    fontName: {
      family: fontInfo.family,
      style: fontInfo.style
    }
  });
}