// Color utility functions

export interface RGB {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
}

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/**
 * Convert RGB values (0-1) to hex color string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert hex color string to RGB values (0-1)
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 3-character hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  return { r, g, b };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
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
 * Generate semantic color name from node name and index
 */
export function generateColorName(nodeName: string, index: number): string {
  // Clean the node name
  const cleanName = nodeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Add semantic suffix based on index
  const suffix = index === 0 ? 'bg' : index === 1 ? 'border' : String(index);
  
  return `${cleanName}-${suffix}`;
}

/**
 * Determine if a color is light or dark
 */
export function isLightColor(rgb: RGB): boolean {
  // Calculate relative luminance
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 0.5;
}

/**
 * Get contrasting color (black or white)
 */
export function getContrastColor(rgb: RGB): RGB {
  return isLightColor(rgb) 
    ? { r: 0, g: 0, b: 0 } // black
    : { r: 1, g: 1, b: 1 }; // white
}

/**
 * Mix two colors
 */
export function mixColors(color1: RGB, color2: RGB, ratio: number = 0.5): RGB {
  return {
    r: color1.r * (1 - ratio) + color2.r * ratio,
    g: color1.g * (1 - ratio) + color2.g * ratio,
    b: color1.b * (1 - ratio) + color2.b * ratio
  };
}

/**
 * Generate color palette variations
 */
export function generateColorPalette(baseColor: RGB): Record<string, RGB> {
  const white = { r: 1, g: 1, b: 1 };
  const black = { r: 0, g: 0, b: 0 };
  
  return {
    '50': mixColors(baseColor, white, 0.9),
    '100': mixColors(baseColor, white, 0.8),
    '200': mixColors(baseColor, white, 0.6),
    '300': mixColors(baseColor, white, 0.4),
    '400': mixColors(baseColor, white, 0.2),
    '500': baseColor,
    '600': mixColors(baseColor, black, 0.2),
    '700': mixColors(baseColor, black, 0.4),
    '800': mixColors(baseColor, black, 0.6),
    '900': mixColors(baseColor, black, 0.8),
  };
}