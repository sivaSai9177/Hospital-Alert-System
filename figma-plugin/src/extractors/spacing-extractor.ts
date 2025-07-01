/**
 * Spacing System Extractor
 * Extracts spacing tokens from the design system
 */

export interface SpacingToken {
  name: string;
  value: number;
  pixelValue: string;
  mode?: 'compact' | 'medium' | 'large';
}

export interface DensitySpacing {
  compact: SpacingToken[];
  medium: SpacingToken[];
  large: SpacingToken[];
}

// Base spacing unit
const BASE_UNIT = 4;

// Spacing scale (0-96) - Including all Tailwind standard and half-step values
const SPACING_SCALE = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5,
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30,
  32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64,
  68, 72, 76, 80, 84, 88, 92, 96
];

// Density multipliers
const DENSITY_MULTIPLIERS = {
  compact: 0.75,
  medium: 1.0,
  large: 1.25
};

/**
 * Generate spacing tokens for a specific density
 */
function generateSpacingForDensity(density: keyof typeof DENSITY_MULTIPLIERS): SpacingToken[] {
  const multiplier = DENSITY_MULTIPLIERS[density];
  
  return SPACING_SCALE.map(scale => {
    const baseValue = scale * BASE_UNIT;
    const adjustedValue = Math.round(baseValue * multiplier);
    
    // Replace dots with underscores for valid Figma variable names
    const sanitizedScale = String(scale).replace('.', '_');
    
    return {
      name: `spacing-${sanitizedScale}`,
      value: adjustedValue,
      pixelValue: `${adjustedValue}px`,
      mode: density
    };
  });
}

/**
 * Generate all spacing tokens across densities
 */
export function generateSpacingTokens(): DensitySpacing {
  return {
    compact: generateSpacingForDensity('compact'),
    medium: generateSpacingForDensity('medium'),
    large: generateSpacingForDensity('large')
  };
}

/**
 * Component-specific spacing presets
 */
export const COMPONENT_SPACING = {
  button: {
    paddingX: { compact: 12, medium: 16, large: 20 },
    paddingY: { compact: 6, medium: 8, large: 10 },
    gap: { compact: 6, medium: 8, large: 10 }
  },
  card: {
    padding: { compact: 12, medium: 16, large: 20 },
    gap: { compact: 8, medium: 12, large: 16 }
  },
  input: {
    paddingX: { compact: 8, medium: 12, large: 16 },
    paddingY: { compact: 6, medium: 8, large: 10 }
  },
  modal: {
    padding: { compact: 16, medium: 24, large: 32 },
    gap: { compact: 12, medium: 16, large: 20 }
  },
  list: {
    itemPadding: { compact: 8, medium: 12, large: 16 },
    itemGap: { compact: 4, medium: 6, large: 8 }
  },
  navigation: {
    itemPadding: { compact: 6, medium: 8, large: 10 },
    itemGap: { compact: 2, medium: 4, large: 6 }
  }
};

/**
 * Convert spacing tokens to Figma Variables format
 */
export function spacingToFigmaVariables(spacing: DensitySpacing) {
  const variables: any[] = [];
  
  // Create variables for each density mode
  Object.entries(spacing).forEach(([density, tokens]) => {
    tokens.forEach(token => {
      variables.push({
        name: token.name,
        type: 'FLOAT',
        value: token.value,
        mode: density,
        scopes: ['GAP', 'WIDTH_HEIGHT', 'CORNER_RADIUS']
      });
    });
  });
  
  // Add component-specific spacing
  Object.entries(COMPONENT_SPACING).forEach(([component, spaces]) => {
    Object.entries(spaces).forEach(([property, values]) => {
      Object.entries(values).forEach(([density, value]) => {
        variables.push({
          name: `${component}/${property}`,
          type: 'FLOAT',
          value: value,
          mode: density,
          scopes: ['GAP', 'WIDTH_HEIGHT']
        });
      });
    });
  });
  
  return variables;
}

/**
 * Generate spacing utility classes for documentation
 */
export function generateSpacingUtilities(): string[] {
  const utilities: string[] = [];
  
  SPACING_SCALE.forEach(scale => {
    // Replace dots with underscores for valid class names
    const sanitizedScale = String(scale).replace('.', '_');
    
    // Padding utilities
    utilities.push(`p-${sanitizedScale}`);  // padding
    utilities.push(`px-${sanitizedScale}`); // padding horizontal
    utilities.push(`py-${sanitizedScale}`); // padding vertical
    utilities.push(`pt-${sanitizedScale}`); // padding top
    utilities.push(`pr-${sanitizedScale}`); // padding right
    utilities.push(`pb-${sanitizedScale}`); // padding bottom
    utilities.push(`pl-${sanitizedScale}`); // padding left
    
    // Margin utilities
    utilities.push(`m-${sanitizedScale}`);  // margin
    utilities.push(`mx-${sanitizedScale}`); // margin horizontal
    utilities.push(`my-${sanitizedScale}`); // margin vertical
    utilities.push(`mt-${sanitizedScale}`); // margin top
    utilities.push(`mr-${sanitizedScale}`); // margin right
    utilities.push(`mb-${sanitizedScale}`); // margin bottom
    utilities.push(`ml-${sanitizedScale}`); // margin left
    
    // Gap utilities (for flex/grid)
    utilities.push(`gap-${sanitizedScale}`);
    utilities.push(`gap-x-${sanitizedScale}`);
    utilities.push(`gap-y-${sanitizedScale}`);
  });
  
  return utilities;
}

/**
 * Get spacing value by scale and density
 */
export function getSpacing(scale: number, density: keyof typeof DENSITY_MULTIPLIERS = 'medium'): number {
  const baseValue = scale * BASE_UNIT;
  const multiplier = DENSITY_MULTIPLIERS[density];
  return Math.round(baseValue * multiplier);
}