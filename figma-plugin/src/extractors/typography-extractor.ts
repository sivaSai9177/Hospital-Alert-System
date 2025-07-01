/**
 * Typography System Extractor
 * Extracts typography tokens from the design system
 */

export interface TypographyToken {
  name: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  fontWeight?: number;
  fontFamily?: string;
  mode?: 'compact' | 'medium' | 'large';
}

export interface TypographyPreset {
  name: string;
  variants: {
    compact: TypographyToken;
    medium: TypographyToken;
    large: TypographyToken;
  };
}

// Platform-specific font families
export const FONT_FAMILIES = {
  ios: {
    sans: '-apple-system, "SF Pro Text", "SF Pro Display"',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"SF Mono", Monaco, monospace'
  },
  android: {
    sans: 'Roboto, system-ui, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"Roboto Mono", monospace'
  },
  web: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"SF Mono", Monaco, Menlo, monospace'
  }
};

// Font weight tokens
export const FONT_WEIGHTS = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900
};

// Typography scale matching Tailwind CSS exactly
const TYPOGRAPHY_SCALE = {
  'xs': { base: 12, lineHeight: 16 },     // 0.75rem, 1rem
  'sm': { base: 14, lineHeight: 20 },     // 0.875rem, 1.25rem
  'base': { base: 16, lineHeight: 24 },   // 1rem, 1.5rem
  'lg': { base: 18, lineHeight: 28 },     // 1.125rem, 1.75rem
  'xl': { base: 20, lineHeight: 28 },     // 1.25rem, 1.75rem
  '2xl': { base: 24, lineHeight: 32 },    // 1.5rem, 2rem
  '3xl': { base: 30, lineHeight: 36 },    // 1.875rem, 2.25rem
  '4xl': { base: 36, lineHeight: 40 },    // 2.25rem, 2.5rem
  '5xl': { base: 48, lineHeight: 48 },    // 3rem, 1 (unitless)
  '6xl': { base: 60, lineHeight: 60 },    // 3.75rem, 1
  '7xl': { base: 72, lineHeight: 72 },    // 4.5rem, 1
  '8xl': { base: 96, lineHeight: 96 },    // 6rem, 1
  '9xl': { base: 128, lineHeight: 128 }   // 8rem, 1
};

// Density multipliers for typography
const TYPOGRAPHY_DENSITY = {
  compact: 0.9,
  medium: 1.0,
  large: 1.1
};

/**
 * Generate typography tokens for all densities
 */
export function generateTypographyTokens(): TypographyToken[] {
  const tokens: TypographyToken[] = [];
  
  Object.entries(TYPOGRAPHY_SCALE).forEach(([size, config]) => {
    Object.entries(TYPOGRAPHY_DENSITY).forEach(([density, multiplier]) => {
      const fontSize = Math.round(config.base * multiplier);
      const lineHeight = Math.round(fontSize * config.lineHeight);
      
      tokens.push({
        name: `text-${size}`,
        fontSize,
        lineHeight,
        letterSpacing: density === 'compact' ? -0.025 : density === 'large' ? 0.025 : 0, // Tailwind tracking values
        mode: density as 'compact' | 'medium' | 'large',
        fontFamily: 'font-sans' // Default Tailwind font stack
      });
    });
  });
  
  return tokens;
}

/**
 * Typography presets for common use cases
 */
export function generateTypographyPresets(): TypographyPreset[] {
  return [
    {
      name: 'display-large',
      variants: {
        compact: {
          name: 'display-large',
          fontSize: 54,
          lineHeight: 60,
          letterSpacing: -0.04,
          fontWeight: FONT_WEIGHTS.bold,
          mode: 'compact'
        },
        medium: {
          name: 'display-large',
          fontSize: 60,
          lineHeight: 66,
          letterSpacing: -0.02,
          fontWeight: FONT_WEIGHTS.bold,
          mode: 'medium'
        },
        large: {
          name: 'display-large',
          fontSize: 66,
          lineHeight: 72,
          letterSpacing: 0,
          fontWeight: FONT_WEIGHTS.bold,
          mode: 'large'
        }
      }
    },
    {
      name: 'display-medium',
      variants: {
        compact: {
          name: 'display-medium',
          fontSize: 43,
          lineHeight: 48,
          letterSpacing: -0.02,
          fontWeight: FONT_WEIGHTS.semibold,
          mode: 'compact'
        },
        medium: {
          name: 'display-medium',
          fontSize: 48,
          lineHeight: 54,
          letterSpacing: 0,
          fontWeight: FONT_WEIGHTS.semibold,
          mode: 'medium'
        },
        large: {
          name: 'display-medium',
          fontSize: 53,
          lineHeight: 60,
          letterSpacing: 0.02,
          fontWeight: FONT_WEIGHTS.semibold,
          mode: 'large'
        }
      }
    },
    {
      name: 'heading-1',
      variants: {
        compact: {
          name: 'heading-1',
          fontSize: 32,
          lineHeight: 40,
          fontWeight: FONT_WEIGHTS.semibold,
          mode: 'compact'
        },
        medium: {
          name: 'heading-1',
          fontSize: 36,
          lineHeight: 44,
          fontWeight: FONT_WEIGHTS.semibold,
          mode: 'medium'
        },
        large: {
          name: 'heading-1',
          fontSize: 40,
          lineHeight: 48,
          fontWeight: FONT_WEIGHTS.semibold,
          mode: 'large'
        }
      }
    },
    {
      name: 'heading-2',
      variants: {
        compact: {
          name: 'heading-2',
          fontSize: 27,
          lineHeight: 34,
          fontWeight: FONT_WEIGHTS.semibold,
          mode: 'compact'
        },
        medium: {
          name: 'heading-2',
          fontSize: 30,
          lineHeight: 38,
          fontWeight: FONT_WEIGHTS.semibold,
          mode: 'medium'
        },
        large: {
          name: 'heading-2',
          fontSize: 33,
          lineHeight: 42,
          fontWeight: FONT_WEIGHTS.semibold,
          mode: 'large'
        }
      }
    },
    {
      name: 'heading-3',
      variants: {
        compact: {
          name: 'heading-3',
          fontSize: 22,
          lineHeight: 28,
          fontWeight: FONT_WEIGHTS.medium,
          mode: 'compact'
        },
        medium: {
          name: 'heading-3',
          fontSize: 24,
          lineHeight: 32,
          fontWeight: FONT_WEIGHTS.medium,
          mode: 'medium'
        },
        large: {
          name: 'heading-3',
          fontSize: 26,
          lineHeight: 34,
          fontWeight: FONT_WEIGHTS.medium,
          mode: 'large'
        }
      }
    },
    {
      name: 'body-large',
      variants: {
        compact: {
          name: 'body-large',
          fontSize: 16,
          lineHeight: 24,
          fontWeight: FONT_WEIGHTS.normal,
          mode: 'compact'
        },
        medium: {
          name: 'body-large',
          fontSize: 18,
          lineHeight: 28,
          fontWeight: FONT_WEIGHTS.normal,
          mode: 'medium'
        },
        large: {
          name: 'body-large',
          fontSize: 20,
          lineHeight: 30,
          fontWeight: FONT_WEIGHTS.normal,
          mode: 'large'
        }
      }
    },
    {
      name: 'body',
      variants: {
        compact: {
          name: 'body',
          fontSize: 14,
          lineHeight: 20,
          fontWeight: FONT_WEIGHTS.normal,
          mode: 'compact'
        },
        medium: {
          name: 'body',
          fontSize: 16,
          lineHeight: 24,
          fontWeight: FONT_WEIGHTS.normal,
          mode: 'medium'
        },
        large: {
          name: 'body',
          fontSize: 18,
          lineHeight: 26,
          fontWeight: FONT_WEIGHTS.normal,
          mode: 'large'
        }
      }
    },
    {
      name: 'body-small',
      variants: {
        compact: {
          name: 'body-small',
          fontSize: 13,
          lineHeight: 18,
          fontWeight: FONT_WEIGHTS.normal,
          mode: 'compact'
        },
        medium: {
          name: 'body-small',
          fontSize: 14,
          lineHeight: 20,
          fontWeight: FONT_WEIGHTS.normal,
          mode: 'medium'
        },
        large: {
          name: 'body-small',
          fontSize: 15,
          lineHeight: 22,
          fontWeight: FONT_WEIGHTS.normal,
          mode: 'large'
        }
      }
    },
    {
      name: 'caption',
      variants: {
        compact: {
          name: 'caption',
          fontSize: 11,
          lineHeight: 16,
          fontWeight: FONT_WEIGHTS.normal,
          letterSpacing: 0.04,
          mode: 'compact'
        },
        medium: {
          name: 'caption',
          fontSize: 12,
          lineHeight: 16,
          fontWeight: FONT_WEIGHTS.normal,
          letterSpacing: 0.04,
          mode: 'medium'
        },
        large: {
          name: 'caption',
          fontSize: 13,
          lineHeight: 18,
          fontWeight: FONT_WEIGHTS.normal,
          letterSpacing: 0.04,
          mode: 'large'
        }
      }
    },
    {
      name: 'button',
      variants: {
        compact: {
          name: 'button',
          fontSize: 13,
          lineHeight: 18,
          fontWeight: FONT_WEIGHTS.medium,
          letterSpacing: 0.08,
          mode: 'compact'
        },
        medium: {
          name: 'button',
          fontSize: 14,
          lineHeight: 20,
          fontWeight: FONT_WEIGHTS.medium,
          letterSpacing: 0.08,
          mode: 'medium'
        },
        large: {
          name: 'button',
          fontSize: 16,
          lineHeight: 22,
          fontWeight: FONT_WEIGHTS.medium,
          letterSpacing: 0.08,
          mode: 'large'
        }
      }
    },
    {
      name: 'label',
      variants: {
        compact: {
          name: 'label',
          fontSize: 11,
          lineHeight: 14,
          fontWeight: FONT_WEIGHTS.medium,
          letterSpacing: 0.1,
          mode: 'compact'
        },
        medium: {
          name: 'label',
          fontSize: 12,
          lineHeight: 16,
          fontWeight: FONT_WEIGHTS.medium,
          letterSpacing: 0.1,
          mode: 'medium'
        },
        large: {
          name: 'label',
          fontSize: 13,
          lineHeight: 18,
          fontWeight: FONT_WEIGHTS.medium,
          letterSpacing: 0.1,
          mode: 'large'
        }
      }
    }
  ];
}

/**
 * Convert typography tokens to Figma Text Styles format
 */
export function typographyToFigmaTextStyles(presets: TypographyPreset[]) {
  const textStyles: any[] = [];
  
  presets.forEach(preset => {
    Object.entries(preset.variants).forEach(([density, variant]) => {
      textStyles.push({
        name: `${preset.name}/${density}`,
        fontSize: variant.fontSize,
        fontFamily: FONT_FAMILIES.web.sans, // Default to web sans
        fontWeight: variant.fontWeight || FONT_WEIGHTS.normal,
        lineHeight: {
          value: variant.lineHeight,
          unit: 'PIXELS'
        },
        letterSpacing: {
          value: variant.letterSpacing ? variant.letterSpacing * variant.fontSize : 0,
          unit: 'PIXELS'
        },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE'
      });
    });
  });
  
  return textStyles;
}