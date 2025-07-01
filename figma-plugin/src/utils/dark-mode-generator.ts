/**
 * Dark Mode Token Generator
 * Automatically generates dark mode variants for color tokens
 */

import { ColorToken, RGBA } from '../../shared/types/design-tokens';

export interface DarkModeOptions {
  strategy: 'automatic' | 'manual' | 'inverse';
  preserveBrand?: boolean; // Keep brand colors unchanged
  backgroundLightness?: number; // Target lightness for backgrounds (0-100)
  foregroundLightness?: number; // Target lightness for text (0-100)
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  // Normalize to 0-1 range if needed
  r = r > 1 ? r / 255 : r;
  g = g > 1 ? g / 255 : g;
  b = b > 1 ? b / 255 : b;
  
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
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): RGBA {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: 1
  };
}

/**
 * Generate dark mode variant of a color
 */
export function generateDarkVariant(
  color: ColorToken,
  options: DarkModeOptions = { strategy: 'automatic' }
): ColorToken {
  if (!color.rgb) {
    return color; // Can't process without RGB values
  }
  
  const { r, g, b, a } = color.rgb;
  const hsl = rgbToHsl(r, g, b);
  
  let newHsl = { ...hsl };
  
  // Determine if this is a background or foreground color
  const isBackground = color.name.toLowerCase().includes('background') || 
                      color.name.toLowerCase().includes('bg');
  const isForeground = color.name.toLowerCase().includes('foreground') || 
                      color.name.toLowerCase().includes('text') ||
                      color.name.toLowerCase().includes('fg');
  const isBorder = color.name.toLowerCase().includes('border');
  const isPrimary = color.name.toLowerCase().includes('primary');
  const isAccent = color.name.toLowerCase().includes('accent');
  
  // Skip brand colors if preserveBrand is true
  if (options.preserveBrand && (isPrimary || isAccent)) {
    return {
      ...color,
      name: color.name.replace('/light', '/dark'),
      description: `${color.description || ''} (Dark mode - preserved)`
    };
  }
  
  switch (options.strategy) {
    case 'automatic':
      if (isBackground) {
        // Dark backgrounds: reduce lightness significantly
        newHsl.l = Math.min(20, hsl.l * 0.15);
        // Slightly reduce saturation for dark backgrounds
        newHsl.s = Math.max(5, hsl.s * 0.8);
      } else if (isForeground) {
        // Light text: increase lightness
        newHsl.l = Math.max(85, 100 - (100 - hsl.l) * 0.15);
        // Slightly reduce saturation for text
        newHsl.s = Math.min(20, hsl.s * 0.6);
      } else if (isBorder) {
        // Borders: moderate adjustment
        newHsl.l = 30 + (hsl.l - 50) * 0.3;
        newHsl.s = hsl.s * 0.7;
      } else {
        // General inversion with adjustments
        newHsl.l = 100 - hsl.l;
        // Adjust saturation based on lightness
        if (newHsl.l < 20) {
          newHsl.s = hsl.s * 0.6; // Reduce saturation for very dark colors
        } else if (newHsl.l > 80) {
          newHsl.s = hsl.s * 0.8; // Slightly reduce for very light colors
        }
      }
      break;
      
    case 'inverse':
      // Simple inversion
      newHsl.l = 100 - hsl.l;
      break;
      
    case 'manual':
      // Use provided target lightness values
      if (isBackground && options.backgroundLightness !== undefined) {
        newHsl.l = options.backgroundLightness;
      } else if (isForeground && options.foregroundLightness !== undefined) {
        newHsl.l = options.foregroundLightness;
      }
      break;
  }
  
  // Ensure values are within valid ranges
  newHsl.h = Math.max(0, Math.min(360, newHsl.h));
  newHsl.s = Math.max(0, Math.min(100, newHsl.s));
  newHsl.l = Math.max(0, Math.min(100, newHsl.l));
  
  const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
  
  return {
    ...color,
    name: color.name.replace('/light', '/dark'),
    value: rgbToHex(newRgb.r, newRgb.g, newRgb.b, a),
    rgb: { ...newRgb, a },
    hsl: newHsl,
    description: `${color.description || ''} (Dark mode variant)`
  };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number, a: number = 1): string {
  const toHex = (value: number) => {
    const hex = Math.round(value).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a < 1 ? `${hex}${toHex(a * 255)}` : hex;
}

/**
 * Generate dark mode variants for all color tokens
 */
export function generateDarkModeTokens(
  colors: ColorToken[],
  options: DarkModeOptions = { strategy: 'automatic' }
): ColorToken[] {
  const darkTokens: ColorToken[] = [];
  
  colors.forEach(color => {
    // Only process light mode colors
    if (color.name.includes('/light') || !color.name.includes('/dark')) {
      const darkVariant = generateDarkVariant(color, options);
      darkTokens.push(darkVariant);
    }
  });
  
  return darkTokens;
}

/**
 * Analyze color tokens and suggest dark mode strategy
 */
export function analyzeDarkModeNeeds(colors: ColorToken[]): {
  hasLightMode: boolean;
  hasDarkMode: boolean;
  needsDarkMode: string[];
  suggestions: string[];
} {
  const lightColors = colors.filter(c => c.name.includes('/light'));
  const darkColors = colors.filter(c => c.name.includes('/dark'));
  const neutralColors = colors.filter(c => !c.name.includes('/light') && !c.name.includes('/dark'));
  
  const needsDarkMode: string[] = [];
  const suggestions: string[] = [];
  
  // Check which light colors don't have dark variants
  lightColors.forEach(lightColor => {
    const darkName = lightColor.name.replace('/light', '/dark');
    if (!darkColors.some(d => d.name === darkName)) {
      needsDarkMode.push(lightColor.name);
    }
  });
  
  // Add suggestions
  if (lightColors.length === 0 && darkColors.length === 0) {
    suggestions.push('Consider adding /light and /dark suffixes to color names for theme support');
  }
  
  if (needsDarkMode.length > 0) {
    suggestions.push(`${needsDarkMode.length} light colors need dark variants`);
  }
  
  if (neutralColors.length > 0) {
    suggestions.push(`${neutralColors.length} colors don't specify light/dark mode - consider adding mode suffixes`);
  }
  
  return {
    hasLightMode: lightColors.length > 0,
    hasDarkMode: darkColors.length > 0,
    needsDarkMode,
    suggestions
  };
}