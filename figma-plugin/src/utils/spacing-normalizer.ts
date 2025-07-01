/**
 * Spacing Normalizer Utility
 * Helps normalize spacing values to follow Tailwind's 4px grid system
 */

// Tailwind's default spacing scale in pixels (including half-steps)
export const TAILWIND_SPACING_SCALE = [
  0,    // 0
  1,    // px
  2,    // 0.5
  4,    // 1
  6,    // 1.5
  8,    // 2
  10,   // 2.5
  12,   // 3
  14,   // 3.5
  16,   // 4
  18,   // 4.5 (half-step)
  20,   // 5
  22,   // 5.5 (half-step)
  24,   // 6
  26,   // 6.5 (half-step)
  28,   // 7
  30,   // 7.5 (half-step)
  32,   // 8
  36,   // 9
  40,   // 10
  44,   // 11
  48,   // 12
  56,   // 14
  64,   // 16
  80,   // 20
  96,   // 24
  112,  // 28
  128,  // 32
  144,  // 36
  160,  // 40
  176,  // 44
  192,  // 48
  208,  // 52
  224,  // 56
  240,  // 60
  256,  // 64
  288,  // 72
  320,  // 80
  384   // 96
];

// Map pixel values to Tailwind class names
export const SPACING_TO_TAILWIND: Record<number, string> = {
  0: '0',
  1: 'px',
  2: '0.5',
  4: '1',
  6: '1.5',
  8: '2',
  10: '2.5',
  12: '3',
  14: '3.5',
  16: '4',
  18: '4.5',  // half-step
  20: '5',
  22: '5.5',  // half-step
  24: '6',
  26: '6.5',  // half-step
  28: '7',
  30: '7.5',  // half-step
  32: '8',
  36: '9',
  40: '10',
  44: '11',
  48: '12',
  56: '14',
  64: '16',
  80: '20',
  96: '24',
  112: '28',
  128: '32',
  144: '36',
  160: '40',
  176: '44',
  192: '48',
  208: '52',
  224: '56',
  240: '60',
  256: '64',
  288: '72',
  320: '80',
  384: '96'
};

export interface SpacingNormalizationResult {
  original: number;
  normalized: number;
  tailwindClass: string;
  difference: number;
  percentChange: number;
  suggestion: string;
}

/**
 * Find the nearest Tailwind spacing value
 */
export function findNearestSpacing(value: number): number {
  if (TAILWIND_SPACING_SCALE.includes(value)) {
    return value;
  }
  
  let nearest = TAILWIND_SPACING_SCALE[0];
  let minDiff = Math.abs(value - nearest);
  
  for (const spacing of TAILWIND_SPACING_SCALE) {
    const diff = Math.abs(value - spacing);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = spacing;
    }
  }
  
  return nearest;
}

/**
 * Normalize a spacing value to the Tailwind grid
 */
export function normalizeSpacing(value: number): SpacingNormalizationResult {
  const normalized = findNearestSpacing(value);
  const difference = normalized - value;
  const percentChange = value === 0 ? 0 : Math.abs(difference / value) * 100;
  
  let suggestion = '';
  if (difference === 0) {
    suggestion = 'Value already follows Tailwind spacing scale';
  } else if (percentChange < 5) {
    suggestion = `Minor adjustment: use ${normalized}px (${SPACING_TO_TAILWIND[normalized]}) for perfect alignment`;
  } else {
    suggestion = `Consider using ${normalized}px (${SPACING_TO_TAILWIND[normalized]}) for consistency`;
  }
  
  return {
    original: value,
    normalized,
    tailwindClass: SPACING_TO_TAILWIND[normalized] || `[${normalized}px]`,
    difference,
    percentChange,
    suggestion
  };
}

/**
 * Normalize an array of spacing values
 */
export function normalizeSpacingArray(values: number[]): SpacingNormalizationResult[] {
  return values.map(value => normalizeSpacing(value));
}

/**
 * Check if a value follows the 4px grid
 */
export function followsGrid(value: number, gridSize: number = 4): boolean {
  return value % gridSize === 0;
}

/**
 * Get spacing scale suggestions for a design system
 */
export function getSpacingScaleSuggestions(currentSpacings: number[]): {
  missing: number[];
  extras: number[];
  suggestions: string[];
} {
  const uniqueSpacings = [...new Set(currentSpacings)].sort((a, b) => a - b);
  
  // Find common Tailwind spacings that are missing
  const commonSpacings = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
  const missing = commonSpacings.filter(s => !uniqueSpacings.includes(s));
  
  // Find spacings that don't match Tailwind scale
  const extras = uniqueSpacings.filter(s => !TAILWIND_SPACING_SCALE.includes(s));
  
  const suggestions: string[] = [];
  
  if (missing.length > 0) {
    suggestions.push(`Consider adding these common spacings: ${missing.join(', ')}px`);
  }
  
  if (extras.length > 0) {
    const normalized = extras.map(e => findNearestSpacing(e));
    suggestions.push(`Non-standard spacings found: ${extras.join(', ')}px. Consider using: ${normalized.join(', ')}px`);
  }
  
  // Check for good scale coverage
  const hasSmall = uniqueSpacings.some(s => s >= 4 && s <= 16);
  const hasMedium = uniqueSpacings.some(s => s >= 20 && s <= 48);
  const hasLarge = uniqueSpacings.some(s => s >= 56);
  
  if (!hasSmall) suggestions.push('Add small spacings (4-16px) for tight layouts');
  if (!hasMedium) suggestions.push('Add medium spacings (20-48px) for general use');
  if (!hasLarge) suggestions.push('Add large spacings (56px+) for sections and heroes');
  
  return { missing, extras, suggestions };
}

/**
 * Generate a complete Tailwind-compatible spacing scale
 */
export function generateSpacingScale(baseUnit: number = 4): Record<string, number> {
  const scale: Record<string, number> = {};
  
  // Generate standard Tailwind scale
  Object.entries(SPACING_TO_TAILWIND).forEach(([px, name]) => {
    scale[name] = parseInt(px);
  });
  
  return scale;
}