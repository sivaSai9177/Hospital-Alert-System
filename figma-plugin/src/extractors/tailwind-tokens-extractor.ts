/**
 * Tailwind-specific Token Extractor
 * Extracts tokens in Tailwind CSS format
 */

import { TAILWIND_LETTER_SPACING, TAILWIND_LINE_HEIGHTS, getTailwindFontSizeClass } from '../utils/tailwind-converter';

export interface TailwindToken {
  name: string;
  value: any;
  cssVar?: string;
  description?: string;
}

/**
 * Generate Tailwind letter spacing tokens
 */
export function generateLetterSpacingTokens(): TailwindToken[] {
  const tokens: TailwindToken[] = [];
  
  Object.entries(TAILWIND_LETTER_SPACING).forEach(([name, value]) => {
    tokens.push({
      name: `tracking-${name}`,
      value: `${value}em`,
      cssVar: `--tracking-${name}`,
      description: `Letter spacing: ${value}em`
    });
  });
  
  return tokens;
}

/**
 * Generate Tailwind line height tokens
 */
export function generateLineHeightTokens(): TailwindToken[] {
  const tokens: TailwindToken[] = [];
  
  Object.entries(TAILWIND_LINE_HEIGHTS).forEach(([name, value]) => {
    tokens.push({
      name: `leading-${name}`,
      value: value,
      cssVar: `--leading-${name}`,
      description: `Line height: ${value}`
    });
  });
  
  // Also add numeric line heights (leading-3 through leading-10)
  for (let i = 3; i <= 10; i++) {
    tokens.push({
      name: `leading-${i}`,
      value: `${i * 0.25}rem`,
      cssVar: `--leading-${i}`,
      description: `Line height: ${i * 0.25}rem`
    });
  }
  
  return tokens;
}

/**
 * Generate font weight tokens
 */
export function generateFontWeightTokens(): TailwindToken[] {
  const weights = {
    'thin': 100,
    'extralight': 200,
    'light': 300,
    'normal': 400,
    'medium': 500,
    'semibold': 600,
    'bold': 700,
    'extrabold': 800,
    'black': 900
  };
  
  const tokens: TailwindToken[] = [];
  
  Object.entries(weights).forEach(([name, value]) => {
    tokens.push({
      name: `font-${name}`,
      value: value,
      cssVar: `--font-weight-${name}`,
      description: `Font weight: ${value}`
    });
  });
  
  return tokens;
}

/**
 * Extract typography tokens from Figma text styles
 */
export function extractTypographyFromTextStyles(textStyles: TextStyle[]): Record<string, TailwindToken[]> {
  const fontSizes: Map<string, TailwindToken> = new Map();
  const lineHeights: Map<string, TailwindToken> = new Map();
  const letterSpacings: Map<string, TailwindToken> = new Map();
  const fontWeights: Map<number, TailwindToken> = new Map();
  
  textStyles.forEach(style => {
    // Extract font size
    const sizeClass = getTailwindFontSizeClass(style.fontSize);
    const sizeKey = sizeClass.replace('text-', '');
    
    if (!fontSizes.has(sizeKey)) {
      fontSizes.set(sizeKey, {
        name: sizeClass,
        value: `${style.fontSize}px`,
        cssVar: `--font-size-${sizeKey}`,
        description: style.name
      });
    }
    
    // Extract line height
    if (style.lineHeight && style.lineHeight.unit === 'PIXELS') {
      const lineHeightRem = style.lineHeight.value / 16;
      const lineHeightKey = `leading-${Math.round(lineHeightRem * 4) / 4}`;
      
      if (!lineHeights.has(lineHeightKey)) {
        lineHeights.set(lineHeightKey, {
          name: lineHeightKey,
          value: `${lineHeightRem}rem`,
          cssVar: `--${lineHeightKey}`,
          description: `From ${style.name}`
        });
      }
    }
    
    // Extract letter spacing
    if (style.letterSpacing && style.letterSpacing.unit === 'PIXELS' && style.letterSpacing.value !== 0) {
      const letterSpacingEm = style.letterSpacing.value / style.fontSize;
      let spacingName = 'normal';
      
      // Find closest Tailwind value
      let minDiff = Math.abs(letterSpacingEm);
      for (const [name, value] of Object.entries(TAILWIND_LETTER_SPACING)) {
        const diff = Math.abs(letterSpacingEm - value);
        if (diff < minDiff) {
          minDiff = diff;
          spacingName = name;
        }
      }
      
      const spacingKey = `tracking-${spacingName}`;
      if (!letterSpacings.has(spacingKey)) {
        letterSpacings.set(spacingKey, {
          name: spacingKey,
          value: `${letterSpacingEm}em`,
          cssVar: `--${spacingKey}`,
          description: `From ${style.name}`
        });
      }
    }
    
    // Extract font weight
    if (style.fontName && typeof style.fontName === 'object') {
      const fontStyle = style.fontName.style.toLowerCase();
      let weight = 400;
      
      // Extract weight from style name
      if (fontStyle.includes('thin')) weight = 100;
      else if (fontStyle.includes('extralight') || fontStyle.includes('extra light')) weight = 200;
      else if (fontStyle.includes('light')) weight = 300;
      else if (fontStyle.includes('medium')) weight = 500;
      else if (fontStyle.includes('semibold') || fontStyle.includes('semi bold')) weight = 600;
      else if (fontStyle.includes('bold')) weight = 700;
      else if (fontStyle.includes('extrabold') || fontStyle.includes('extra bold')) weight = 800;
      else if (fontStyle.includes('black') || fontStyle.includes('heavy')) weight = 900;
      
      if (!fontWeights.has(weight)) {
        fontWeights.set(weight, {
          name: `font-${getWeightName(weight)}`,
          value: weight,
          cssVar: `--font-weight-${weight}`,
          description: `Weight ${weight}`
        });
      }
    }
  });
  
  return {
    fontSize: Array.from(fontSizes.values()),
    lineHeight: Array.from(lineHeights.values()),
    letterSpacing: Array.from(letterSpacings.values()),
    fontWeight: Array.from(fontWeights.values())
  };
}

function getWeightName(weight: number): string {
  const names: Record<number, string> = {
    100: 'thin',
    200: 'extralight',
    300: 'light',
    400: 'normal',
    500: 'medium',
    600: 'semibold',
    700: 'bold',
    800: 'extrabold',
    900: 'black'
  };
  return names[weight] || 'normal';
}

/**
 * Generate font smoothing tokens
 */
export function generateFontSmoothingTokens(): TailwindToken[] {
  return [
    {
      name: 'antialiased',
      value: {
        '-webkit-font-smoothing': 'antialiased',
        '-moz-osx-font-smoothing': 'grayscale'
      },
      cssVar: '--font-smoothing-antialiased',
      description: 'Antialiased font smoothing'
    },
    {
      name: 'subpixel-antialiased',
      value: {
        '-webkit-font-smoothing': 'auto',
        '-moz-osx-font-smoothing': 'auto'
      },
      cssVar: '--font-smoothing-subpixel',
      description: 'Subpixel antialiased font smoothing'
    }
  ];
}