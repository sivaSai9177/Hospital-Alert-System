/**
 * Typography Normalizer Utility
 * Helps normalize typography values to follow consistent scales
 */

// Common font size scale based on Tailwind and design best practices
export const FONT_SIZE_SCALE = [
  10,   // xs
  12,   // sm
  14,   // base
  16,   // md
  18,   // lg
  20,   // xl
  24,   // 2xl
  30,   // 3xl
  36,   // 4xl
  48,   // 5xl
  60,   // 6xl
  72,   // 7xl
  96,   // 8xl
  128   // 9xl
];

// Common line height scale in pixels
export const LINE_HEIGHT_SCALE = [
  12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48,
  52, 56, 60, 64, 66, 68, 72, 76, 80, 84, 88, 92, 96, 100, 104,
  108, 112, 116, 120, 124, 128, 136, 144, 152, 160
];

// Common line height ratios
export const LINE_HEIGHT_RATIOS = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2
};

// Font weight scale
export const FONT_WEIGHT_SCALE = {
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

export interface TypographyNormalizationResult {
  original: number;
  normalized: number;
  scale: string;
  difference: number;
  percentChange: number;
  suggestion: string;
}

/**
 * Find the nearest font size in the scale
 */
export function findNearestFontSize(value: number): number {
  if (FONT_SIZE_SCALE.includes(value)) {
    return value;
  }
  
  let nearest = FONT_SIZE_SCALE[0];
  let minDiff = Math.abs(value - nearest);
  
  for (const size of FONT_SIZE_SCALE) {
    const diff = Math.abs(value - size);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = size;
    }
  }
  
  return nearest;
}

/**
 * Find the nearest line height in the scale
 */
export function findNearestLineHeight(value: number): number {
  if (LINE_HEIGHT_SCALE.includes(Math.round(value))) {
    return Math.round(value);
  }
  
  let nearest = LINE_HEIGHT_SCALE[0];
  let minDiff = Math.abs(value - nearest);
  
  for (const height of LINE_HEIGHT_SCALE) {
    const diff = Math.abs(value - height);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = height;
    }
  }
  
  return nearest;
}

/**
 * Calculate appropriate line height for a font size
 */
export function calculateLineHeight(fontSize: number, ratio: keyof typeof LINE_HEIGHT_RATIOS = 'normal'): number {
  const calculatedHeight = fontSize * LINE_HEIGHT_RATIOS[ratio];
  return findNearestLineHeight(calculatedHeight);
}

/**
 * Get line height ratio recommendation based on font size
 */
export function getRecommendedLineHeightRatio(fontSize: number): keyof typeof LINE_HEIGHT_RATIOS {
  if (fontSize < 14) {
    return 'relaxed'; // Small text needs more breathing room
  } else if (fontSize >= 24) {
    return 'tight'; // Large text (headings) can be tighter
  } else {
    return 'normal'; // Body text
  }
}

/**
 * Normalize a font size value
 */
export function normalizeFontSize(value: number): TypographyNormalizationResult {
  const normalized = findNearestFontSize(value);
  const difference = normalized - value;
  const percentChange = value === 0 ? 0 : Math.abs(difference / value) * 100;
  
  let suggestion = '';
  let scale = '';
  
  // Find scale name
  const scaleIndex = FONT_SIZE_SCALE.indexOf(normalized);
  if (scaleIndex !== -1) {
    const scaleNames = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
    scale = scaleNames[scaleIndex] || `custom-${normalized}`;
  }
  
  if (difference === 0) {
    suggestion = 'Font size already follows the type scale';
  } else if (percentChange < 5) {
    suggestion = `Minor adjustment: use ${normalized}px (${scale}) for perfect scale alignment`;
  } else {
    suggestion = `Consider using ${normalized}px (${scale}) for consistency with the type scale`;
  }
  
  return {
    original: value,
    normalized,
    scale,
    difference,
    percentChange,
    suggestion
  };
}

/**
 * Normalize a line height value
 */
export function normalizeLineHeight(value: number, fontSize?: number): TypographyNormalizationResult {
  const normalized = findNearestLineHeight(value);
  const difference = normalized - value;
  const percentChange = value === 0 ? 0 : Math.abs(difference / value) * 100;
  
  let suggestion = '';
  let scale = '';
  
  if (fontSize) {
    const ratio = normalized / fontSize;
    
    // Find closest ratio name
    let closestRatioName = 'custom';
    let closestRatioDiff = Infinity;
    
    Object.entries(LINE_HEIGHT_RATIOS).forEach(([name, ratioValue]) => {
      const diff = Math.abs(ratio - ratioValue);
      if (diff < closestRatioDiff) {
        closestRatioDiff = diff;
        closestRatioName = name;
      }
    });
    
    scale = closestRatioName;
    
    if (difference === 0) {
      suggestion = `Line height ${value}px (${ratio.toFixed(2)} ratio) is on the scale`;
    } else if (percentChange < 5) {
      suggestion = `Minor adjustment: use ${normalized}px (${(normalized/fontSize).toFixed(2)} ratio)`;
    } else {
      const recommendedRatio = getRecommendedLineHeightRatio(fontSize);
      const recommendedHeight = calculateLineHeight(fontSize, recommendedRatio);
      suggestion = `Consider ${recommendedHeight}px (${LINE_HEIGHT_RATIOS[recommendedRatio]} ratio) for ${fontSize}px text`;
    }
  } else {
    scale = `${normalized}px`;
    
    if (difference === 0) {
      suggestion = 'Line height already on the scale';
    } else if (percentChange < 5) {
      suggestion = `Minor adjustment: use ${normalized}px for scale alignment`;
    } else {
      suggestion = `Consider using ${normalized}px for consistency`;
    }
  }
  
  return {
    original: value,
    normalized,
    scale,
    difference,
    percentChange,
    suggestion
  };
}

/**
 * Get type scale suggestions for a design system
 */
export function getTypeScaleSuggestions(currentSizes: number[]): {
  missing: number[];
  extras: number[];
  suggestions: string[];
} {
  const uniqueSizes = [...new Set(currentSizes)].sort((a, b) => a - b);
  
  // Find common sizes that are missing
  const essentialSizes = [12, 14, 16, 20, 24, 32, 48];
  const missing = essentialSizes.filter(s => !uniqueSizes.some(us => Math.abs(us - s) < 2));
  
  // Find sizes that don't match the scale
  const extras = uniqueSizes.filter(s => !FONT_SIZE_SCALE.includes(s));
  
  const suggestions: string[] = [];
  
  if (missing.length > 0) {
    suggestions.push(`Consider adding these essential font sizes: ${missing.join(', ')}px`);
  }
  
  if (extras.length > 0) {
    const normalized = extras.map(e => findNearestFontSize(e));
    suggestions.push(`Non-standard font sizes found: ${extras.join(', ')}px. Consider using: ${normalized.join(', ')}px`);
  }
  
  // Check for good scale coverage
  const hasSmall = uniqueSizes.some(s => s >= 10 && s <= 14);
  const hasMedium = uniqueSizes.some(s => s >= 16 && s <= 24);
  const hasLarge = uniqueSizes.some(s => s >= 32);
  
  if (!hasSmall) suggestions.push('Add small font sizes (10-14px) for captions and labels');
  if (!hasMedium) suggestions.push('Add medium font sizes (16-24px) for body text');
  if (!hasLarge) suggestions.push('Add large font sizes (32px+) for headings');
  
  // Check scale ratio consistency
  const ratios: number[] = [];
  for (let i = 1; i < uniqueSizes.length; i++) {
    if (uniqueSizes[i] !== uniqueSizes[i - 1]) {
      ratios.push(uniqueSizes[i] / uniqueSizes[i - 1]);
    }
  }
  
  if (ratios.length > 1) {
    const avgRatio = ratios.reduce((a, b) => a + b) / ratios.length;
    const isConsistent = ratios.every(r => Math.abs(r - avgRatio) < 0.1);
    
    if (!isConsistent) {
      suggestions.push('Consider using a consistent type scale ratio (e.g., 1.25 for major third, 1.333 for perfect fourth)');
    }
  }
  
  return { missing, extras, suggestions };
}