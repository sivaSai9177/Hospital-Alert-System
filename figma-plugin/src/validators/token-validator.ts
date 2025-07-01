/**
 * Token Validator
 * Validates design tokens for consistency and correctness
 */

import { normalizeSpacing, followsGrid, getSpacingScaleSuggestions } from '../utils/spacing-normalizer';
import { 
  normalizeLineHeight, 
  normalizeFontSize, 
  getTypeScaleSuggestions,
  LINE_HEIGHT_SCALE 
} from '../utils/typography-normalizer';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  type: 'error';
  category: string;
  token: string;
  message: string;
  fix?: string;
}

export interface ValidationWarning {
  type: 'warning';
  category: string;
  token: string;
  message: string;
  suggestion?: string;
}

/**
 * Validate color tokens
 */
export function validateColorTokens(colors: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  // Check for valid color formats
  colors.forEach(color => {
    // Validate RGB values
    if (color.rgb) {
      const { r, g, b } = color.rgb;
      // Accept both 0-1 and 0-255 ranges
      const isNormalized = r <= 1 && g <= 1 && b <= 1;
      const isValid255 = r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
      
      if (isNormalized) {
        // Values are in 0-1 range, check they're valid
        if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1) {
          errors.push({
            type: 'error',
            category: 'Colors',
            token: color.name,
            message: 'RGB values must be between 0 and 1',
            fix: 'Ensure RGB values are normalized (0-1)'
          });
        }
      } else if (!isValid255) {
        // Values are not in 0-255 range either
        errors.push({
          type: 'error',
          category: 'Colors',
          token: color.name,
          message: 'RGB values must be between 0-255',
          fix: 'Ensure RGB values are in valid range (0-255)'
        });
      }
    }
    
    // Check naming conventions
    if (!color.name.match(/^[a-zA-Z0-9\/_-]+$/)) {
      errors.push({
        type: 'error',
        category: 'Colors',
        token: color.name,
        message: 'Invalid characters in color name',
        fix: 'Use only letters, numbers, forward slashes, hyphens, and underscores'
      });
    }
    
    // Check for color contrast (warning)
    if (color.name.includes('text') || color.name.includes('foreground')) {
      const backgroundColors = colors.filter(c => 
        c.name.includes('background') && 
        c.name.includes(color.name.split('/')[1] || 'default')
      );
      
      if (backgroundColors.length > 0) {
        // Simple contrast check (could be enhanced)
        const bg = backgroundColors[0];
        if (bg.rgb && color.rgb) {
          const contrast = calculateContrast(color.rgb, bg.rgb);
          if (contrast < 4.5) {
            warnings.push({
              type: 'warning',
              category: 'Colors',
              token: color.name,
              message: `Low contrast ratio (${contrast.toFixed(2)}) with ${bg.name}`,
              suggestion: 'Consider increasing contrast for better accessibility (WCAG AA requires 4.5:1)'
            });
          }
        }
      }
    }
  });
  
  // Check for color consistency
  const colorGroups: Record<string, any[]> = {};
  colors.forEach(color => {
    const group = color.name.split('/')[0];
    if (!colorGroups[group]) colorGroups[group] = [];
    colorGroups[group].push(color);
  });
  
  // Suggest missing theme variations
  Object.entries(colorGroups).forEach(([group, groupColors]) => {
    const hasLight = groupColors.some(c => c.name.includes('light'));
    const hasDark = groupColors.some(c => c.name.includes('dark'));
    
    if (hasLight && !hasDark) {
      suggestions.push(`Consider adding dark theme variations for "${group}" colors`);
    } else if (hasDark && !hasLight) {
      suggestions.push(`Consider adding light theme variations for "${group}" colors`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validate spacing tokens
 */
export function validateSpacingTokens(spacing: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  // Check for valid spacing values
  spacing.forEach(space => {
    if (typeof space.value !== 'number' || space.value < 0) {
      errors.push({
        type: 'error',
        category: 'Spacing',
        token: space.name,
        message: 'Spacing value must be a non-negative number',
        fix: 'Ensure spacing values are positive numbers'
      });
    }
    
    // Check for consistent scale using normalizer
    if (space.value > 0) {
      const normalization = normalizeSpacing(space.value);
      
      if (normalization.difference !== 0 && normalization.percentChange > 5) {
        warnings.push({
          type: 'warning',
          category: 'Spacing',
          token: space.name,
          message: `Spacing value ${space.value} doesn't follow 4px grid`,
          suggestion: normalization.suggestion
        });
      }
    }
  });
  
  // Get spacing scale suggestions
  const values = spacing.map(s => s.value);
  const scaleSuggestions = getSpacingScaleSuggestions(values);
  
  // Add suggestions from the spacing analyzer
  suggestions.push(...scaleSuggestions.suggestions);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validate typography tokens
 */
export function validateTypographyTokens(typography: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  typography.forEach(typo => {
    // Validate font size
    if (typeof typo.fontSize !== 'number' || typo.fontSize <= 0) {
      errors.push({
        type: 'error',
        category: 'Typography',
        token: typo.name,
        message: 'Font size must be a positive number',
        fix: 'Set font size to a positive value in pixels'
      });
    } else {
      // Check if font size follows scale
      const fontSizeNormalization = normalizeFontSize(typo.fontSize);
      if (fontSizeNormalization.difference !== 0 && fontSizeNormalization.percentChange > 10) {
        warnings.push({
          type: 'warning',
          category: 'Typography',
          token: typo.name,
          message: `Font size ${typo.fontSize}px is not on the type scale`,
          suggestion: fontSizeNormalization.suggestion
        });
      }
    }
    
    // Validate font weight
    const validWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    if (typo.fontWeight && !validWeights.includes(typo.fontWeight)) {
      errors.push({
        type: 'error',
        category: 'Typography',
        token: typo.name,
        message: `Invalid font weight: ${typo.fontWeight}`,
        fix: `Use standard font weights: ${validWeights.join(', ')}`
      });
    }
    
    // Validate line height
    if (typo.lineHeight && typo.lineHeight !== 'auto') {
      const lineHeightValue = typeof typo.lineHeight === 'object' ? 
        typo.lineHeight.value : typo.lineHeight;
      
      if (typeof lineHeightValue !== 'number' || lineHeightValue <= 0) {
        errors.push({
          type: 'error',
          category: 'Typography',
          token: typo.name,
          message: 'Line height must be a positive number',
          fix: 'Set line height to a positive value'
        });
      }
      
      // Check line height ratio and consistency
      const ratio = lineHeightValue / typo.fontSize;
      
      // Different recommendations based on font size
      let recommendedRatio = 1.5; // Default
      let minRatio = 1.2;
      
      if (typo.fontSize < 14) {
        // Small text needs more line height
        recommendedRatio = 1.5;
        minRatio = 1.4;
      } else if (typo.fontSize >= 24) {
        // Large text (headings) can have tighter line height
        recommendedRatio = 1.2;
        minRatio = 1.1;
      } else {
        // Body text
        recommendedRatio = 1.5;
        minRatio = 1.2;
      }
      
      if (ratio < minRatio) {
        warnings.push({
          type: 'warning',
          category: 'Typography',
          token: typo.name,
          message: `Line height ratio (${ratio.toFixed(2)}) may be too tight for ${typo.fontSize}px text`,
          suggestion: `Consider using a ratio of at least ${minRatio} (${Math.round(typo.fontSize * minRatio)}px)`
        });
      } else if (ratio > 2.0) {
        warnings.push({
          type: 'warning',
          category: 'Typography',
          token: typo.name,
          message: `Line height ratio (${ratio.toFixed(2)}) seems excessive`,
          suggestion: 'Line height ratios above 2.0 may create too much vertical space'
        });
      }
      
      // Use the typography normalizer to check line height consistency
      const lineHeightNormalization = normalizeLineHeight(lineHeightValue, typo.fontSize);
      
      // Only warn if the difference is significant and it's not already on the scale
      if (lineHeightNormalization.difference !== 0 && lineHeightNormalization.percentChange > 5) {
        // Check if it's close to the scale (within 2px tolerance)
        const isCloseToScale = LINE_HEIGHT_SCALE.some(lh => Math.abs(lh - lineHeightValue) <= 2);
        
        if (!isCloseToScale) {
          warnings.push({
            type: 'warning',
            category: 'Typography',
            token: typo.name,
            message: `Line height ${lineHeightValue}px doesn't match common scale`,
            suggestion: lineHeightNormalization.suggestion
          });
        }
      }
    }
    
    // Check letter spacing
    if (typo.letterSpacing) {
      const letterSpacingValue = typeof typo.letterSpacing === 'object' ? 
        typo.letterSpacing.value : typo.letterSpacing;
      
      // Warning for extreme letter spacing
      if (Math.abs(letterSpacingValue) > typo.fontSize * 0.1) {
        warnings.push({
          type: 'warning',
          category: 'Typography',
          token: typo.name,
          message: 'Letter spacing seems extreme',
          suggestion: 'Letter spacing typically should be within 10% of font size'
        });
      }
    }
  });
  
  // Use the typography normalizer to get scale suggestions
  const sizes = typography.map(t => t.fontSize);
  const scaleSuggestions = getTypeScaleSuggestions(sizes);
  
  // Add suggestions from the type scale analyzer
  suggestions.push(...scaleSuggestions.suggestions);
  
  // Analyze line height consistency across similar font sizes
  const lineHeightGroups = new Map<number, number[]>();
  typography.forEach(typo => {
    if (typo.lineHeight && typo.lineHeight !== 'auto') {
      const lineHeightValue = typeof typo.lineHeight === 'object' ? 
        typo.lineHeight.value : typo.lineHeight;
      
      // Group by font size ranges
      let sizeGroup: number;
      if (typo.fontSize < 14) sizeGroup = 12;
      else if (typo.fontSize < 18) sizeGroup = 16;
      else if (typo.fontSize < 24) sizeGroup = 20;
      else if (typo.fontSize < 32) sizeGroup = 28;
      else sizeGroup = 40;
      
      if (!lineHeightGroups.has(sizeGroup)) {
        lineHeightGroups.set(sizeGroup, []);
      }
      lineHeightGroups.get(sizeGroup)!.push(lineHeightValue / typo.fontSize);
    }
  });
  
  // Check for inconsistent line heights within size groups
  lineHeightGroups.forEach((ratios, sizeGroup) => {
    if (ratios.length > 1) {
      const avgRatio = ratios.reduce((a, b) => a + b) / ratios.length;
      const hasInconsistency = ratios.some(r => Math.abs(r - avgRatio) > 0.1);
      
      if (hasInconsistency) {
        suggestions.push(`Line height ratios vary for ${sizeGroup}px font size group. Consider standardizing.`);
      }
    }
  });
  
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validate shadow tokens
 */
export function validateShadowTokens(shadows: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  shadows.forEach(shadow => {
    // Check for either 'effects' or 'value' array (both are valid)
    const shadowEffects = shadow.effects || shadow.value;
    
    if (!shadowEffects || !Array.isArray(shadowEffects)) {
      errors.push({
        type: 'error',
        category: 'Shadows',
        token: shadow.name,
        message: 'Shadow must have effects array',
        fix: 'Add at least one shadow effect'
      });
      return;
    }
    
    shadowEffects.forEach((effect: any, index: number) => {
      // Validate shadow properties
      if (typeof effect.radius !== 'number' || effect.radius < 0) {
        errors.push({
          type: 'error',
          category: 'Shadows',
          token: shadow.name,
          message: `Shadow effect ${index + 1}: radius must be non-negative`,
          fix: 'Set radius to 0 or positive value'
        });
      }
      
      // Check for reasonable shadow values
      if (effect.radius > 100) {
        warnings.push({
          type: 'warning',
          category: 'Shadows',
          token: shadow.name,
          message: `Shadow effect ${index + 1}: very large blur radius (${effect.radius}px)`,
          suggestion: 'Consider if such a large blur is intentional'
        });
      }
      
      if (effect.offset && (Math.abs(effect.offset.x) > 50 || Math.abs(effect.offset.y) > 50)) {
        warnings.push({
          type: 'warning',
          category: 'Shadows',
          token: shadow.name,
          message: `Shadow effect ${index + 1}: large offset values`,
          suggestion: 'Large offsets may create unexpected visual results'
        });
      }
    });
  });
  
  // Check for shadow scale progression
  const shadowSizes = shadows
    .filter(s => s.effects && s.effects.length > 0)
    .map(s => ({ name: s.name, radius: s.effects[0].radius }))
    .sort((a, b) => a.radius - b.radius);
  
  if (shadowSizes.length >= 3) {
    suggestions.push('Good shadow scale progression detected');
  } else {
    suggestions.push('Consider creating a shadow scale with at least 3-5 levels (sm, md, lg, xl)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validate gradient tokens
 */
function validateGradientTokens(gradients: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  gradients.forEach(gradient => {
    // Check if gradient has at least 2 color stops
    if (!gradient.colorStops || gradient.colorStops.length < 2) {
      errors.push({
        type: 'error',
        category: 'Gradients',
        token: gradient.name,
        message: `Gradient must have at least 2 color stops (found ${(gradient.colorStops && gradient.colorStops.length) || 0})`,
        fix: 'Add at least 2 color stops to create a valid gradient'
      });
    }
    
    // Validate color stops
    if (gradient.colorStops) {
      gradient.colorStops.forEach((stop: any, index: number) => {
        // Check color format
        if (!stop.color || !isValidColor(stop.color)) {
          errors.push({
            type: 'error',
            category: 'Gradients',
            token: `${gradient.name} - stop ${index + 1}`,
            message: 'Invalid color format in gradient stop',
            fix: 'Use valid hex color format (e.g., #FF0000)'
          });
        }
        
        // Check position if specified
        if (stop.position !== undefined) {
          if (stop.position < 0 || stop.position > 100) {
            errors.push({
              type: 'error',
              category: 'Gradients',
              token: `${gradient.name} - stop ${index + 1}`,
              message: `Color stop position must be between 0-100% (found ${stop.position}%)`,
              fix: 'Adjust position to be within 0-100 range'
            });
          }
        }
      });
      
      // Check if positions are in ascending order
      const positions = gradient.colorStops
        .filter((stop: any) => stop.position !== undefined)
        .map((stop: any) => stop.position);
      
      for (let i = 1; i < positions.length; i++) {
        if (positions[i] < positions[i - 1]) {
          warnings.push({
            type: 'warning',
            category: 'Gradients',
            token: gradient.name,
            message: 'Color stop positions should be in ascending order',
            suggestion: 'Reorder color stops by position for predictable results'
          });
          break;
        }
      }
    }
    
    // Validate gradient type
    if (!['linear', 'radial', 'conic'].includes(gradient.type)) {
      errors.push({
        type: 'error',
        category: 'Gradients',
        token: gradient.name,
        message: `Invalid gradient type "${gradient.type}"`,
        fix: 'Use one of: linear, radial, conic'
      });
    }
    
    // Validate direction for linear gradients
    if (gradient.type === 'linear' && gradient.direction) {
      const validDirections = ['to-t', 'to-tr', 'to-r', 'to-br', 'to-b', 'to-bl', 'to-l', 'to-tl'];
      if (!validDirections.includes(gradient.direction) && !gradient.direction.endsWith('deg')) {
        warnings.push({
          type: 'warning',
          category: 'Gradients',
          token: gradient.name,
          message: `Non-standard gradient direction "${gradient.direction}"`,
          suggestion: `Use Tailwind directions: ${validDirections.join(', ')} or angle in degrees`
        });
      }
    }
    
    // Check naming convention
    if (!gradient.name.toLowerCase().includes('gradient')) {
      warnings.push({
        type: 'warning',
        category: 'Gradients',
        token: gradient.name,
        message: 'Gradient name should include "gradient" for clarity',
        suggestion: 'Consider renaming to include "gradient" (e.g., "primary-gradient")'
      });
    }
  });
  
  // Add suggestions
  if (gradients.length > 0) {
    suggestions.push(`Found ${gradients.length} gradient${gradients.length > 1 ? 's' : ''}`);
    
    const types = [...new Set(gradients.map(g => g.type))];
    suggestions.push(`Gradient types: ${types.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Check if a color string is valid
 */
function isValidColor(color: string): boolean {
  // Check hex format
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color)) {
    return true;
  }
  
  // Check rgb/rgba format
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
    return true;
  }
  
  return false;
}

/**
 * Validate container tokens
 */
function validateContainerTokens(containers: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  containers.forEach(container => {
    // Validate max width
    if (typeof container.maxWidth !== 'number' || container.maxWidth <= 0) {
      errors.push({
        type: 'error',
        category: 'Containers',
        token: container.name,
        message: 'Container maxWidth must be a positive number',
        fix: 'Set maxWidth to a positive pixel value'
      });
    }
    
    // Validate padding
    if (container.padding !== undefined && (typeof container.padding !== 'number' || container.padding < 0)) {
      errors.push({
        type: 'error',
        category: 'Containers',
        token: container.name,
        message: 'Container padding must be a non-negative number',
        fix: 'Set padding to 0 or positive value'
      });
    }
    
    // Check for responsive design patterns
    if (container.maxWidth > 1536) {
      warnings.push({
        type: 'warning',
        category: 'Containers',
        token: container.name,
        message: `Very large container width (${container.maxWidth}px)`,
        suggestion: 'Consider if this follows responsive design best practices'
      });
    }
  });
  
  // Suggest standard container widths
  if (containers.length < 3) {
    suggestions.push('Consider defining at least 3 container sizes (sm, md, lg) for responsive layouts');
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate grid tokens
 */
function validateGridTokens(grids: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  grids.forEach(grid => {
    // Validate columns
    if (typeof grid.columns !== 'number' || grid.columns <= 0 || !Number.isInteger(grid.columns)) {
      errors.push({
        type: 'error',
        category: 'Grids',
        token: grid.name,
        message: 'Grid columns must be a positive integer',
        fix: 'Set columns to a whole number greater than 0'
      });
    }
    
    // Check for excessive columns
    if (grid.columns > 24) {
      warnings.push({
        type: 'warning',
        category: 'Grids',
        token: grid.name,
        message: `Large number of grid columns (${grid.columns})`,
        suggestion: 'Consider if this many columns are necessary (12 or 24 are common maximums)'
      });
    }
    
    // Validate gap
    if (grid.gap !== undefined) {
      const normalization = normalizeSpacing(grid.gap);
      if (normalization.difference !== 0 && normalization.percentChange > 5) {
        warnings.push({
          type: 'warning',
          category: 'Grids',
          token: grid.name,
          message: `Grid gap ${grid.gap}px doesn't follow 4px grid`,
          suggestion: normalization.suggestion
        });
      }
    }
  });
  
  // Suggest common grid patterns
  const hasCommonGrids = grids.some(g => [2, 3, 4, 6, 12].includes(g.columns));
  if (!hasCommonGrids) {
    suggestions.push('Consider adding common grid patterns (2, 3, 4, 6, or 12 columns)');
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate flex layout tokens
 */
function validateFlexTokens(flexLayouts: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  flexLayouts.forEach(flex => {
    // Validate direction
    if (flex.direction && !['row', 'column'].includes(flex.direction)) {
      errors.push({
        type: 'error',
        category: 'Flex',
        token: flex.name,
        message: `Invalid flex direction "${flex.direction}"`,
        fix: 'Use "row" or "column" for direction'
      });
    }
    
    // Validate gap
    if (flex.gap !== undefined) {
      const normalization = normalizeSpacing(flex.gap);
      if (normalization.difference !== 0 && normalization.percentChange > 5) {
        warnings.push({
          type: 'warning',
          category: 'Flex',
          token: flex.name,
          message: `Flex gap ${flex.gap}px doesn't follow 4px grid`,
          suggestion: normalization.suggestion
        });
      }
    }
    
    // Validate alignItems
    const validAlignItems = ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'];
    if (flex.alignItems && !validAlignItems.includes(flex.alignItems)) {
      warnings.push({
        type: 'warning',
        category: 'Flex',
        token: flex.name,
        message: `Non-standard alignItems value "${flex.alignItems}"`,
        suggestion: `Use one of: ${validAlignItems.join(', ')}`
      });
    }
    
    // Validate justifyContent
    const validJustifyContent = ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'];
    if (flex.justifyContent && !validJustifyContent.includes(flex.justifyContent)) {
      warnings.push({
        type: 'warning',
        category: 'Flex',
        token: flex.name,
        message: `Non-standard justifyContent value "${flex.justifyContent}"`,
        suggestion: `Use one of: ${validJustifyContent.join(', ')}`
      });
    }
  });
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate aspect ratio tokens
 */
function validateAspectRatioTokens(aspects: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  aspects.forEach(aspect => {
    // Validate ratio format
    if (!aspect.ratio || !/^\d+:\d+$/.test(aspect.ratio)) {
      errors.push({
        type: 'error',
        category: 'AspectRatios',
        token: aspect.name,
        message: 'Aspect ratio must be in format "width:height" (e.g., "16:9")',
        fix: 'Use proper ratio format with colon separator'
      });
    }
    
    // Validate calculated value
    if (typeof aspect.value !== 'number' || aspect.value <= 0) {
      errors.push({
        type: 'error',
        category: 'AspectRatios',
        token: aspect.name,
        message: 'Aspect ratio value must be a positive number',
        fix: 'Ensure value is calculated correctly (width/height)'
      });
    }
    
    // Check for extreme ratios
    if (aspect.value < 0.25 || aspect.value > 4) {
      warnings.push({
        type: 'warning',
        category: 'AspectRatios',
        token: aspect.name,
        message: `Extreme aspect ratio (${aspect.ratio})`,
        suggestion: 'Very wide or tall aspect ratios may not be practical for most UI elements'
      });
    }
  });
  
  // Suggest common aspect ratios
  const commonRatios = ['1:1', '4:3', '16:9', '3:2', '2:1'];
  const hasCommon = aspects.some(a => commonRatios.includes(a.ratio));
  if (!hasCommon) {
    suggestions.push(`Consider adding common aspect ratios: ${commonRatios.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate z-index tokens
 */
function validateZIndexTokens(zIndexes: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  zIndexes.forEach(z => {
    // Validate value type
    if (typeof z.value !== 'number' || !Number.isInteger(z.value)) {
      errors.push({
        type: 'error',
        category: 'ZIndex',
        token: z.name,
        message: 'Z-index must be an integer',
        fix: 'Use whole numbers for z-index values'
      });
    }
    
    // Check for excessive values
    if (Math.abs(z.value) > 9999) {
      warnings.push({
        type: 'warning',
        category: 'ZIndex',
        token: z.name,
        message: `Very large z-index value (${z.value})`,
        suggestion: 'Consider using a more manageable scale (e.g., 0-100)'
      });
    }
  });
  
  // Check for consistent scale
  const values = zIndexes.map(z => z.value).sort((a, b) => a - b);
  if (values.length > 1) {
    const gaps = [];
    for (let i = 1; i < values.length; i++) {
      gaps.push(values[i] - values[i - 1]);
    }
    
    const hasConsistentGaps = gaps.every(g => g === gaps[0]);
    if (!hasConsistentGaps) {
      suggestions.push('Consider using a consistent z-index scale (e.g., increments of 10 or 100)');
    }
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate filter tokens
 */
function validateFilterTokens(filters: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  filters.forEach(filter => {
    // Validate blur values
    if (filter.blur !== undefined && (typeof filter.blur !== 'number' || filter.blur < 0)) {
      errors.push({
        type: 'error',
        category: 'Filters',
        token: filter.name,
        message: 'Blur value must be a non-negative number',
        fix: 'Set blur to 0 or positive pixel value'
      });
    }
    
    // Validate percentage-based filters
    const percentageFilters = ['brightness', 'contrast', 'grayscale', 'invert', 'saturate', 'sepia'];
    percentageFilters.forEach(prop => {
      if (filter[prop] !== undefined) {
        const value = filter[prop];
        if (typeof value !== 'number') {
          errors.push({
            type: 'error',
            category: 'Filters',
            token: filter.name,
            message: `${prop} must be a number`,
            fix: `Set ${prop} to a percentage value (0-100 for most, 0-200 for brightness/contrast/saturate)`
          });
        } else if (prop === 'grayscale' || prop === 'invert' || prop === 'sepia') {
          if (value < 0 || value > 100) {
            warnings.push({
              type: 'warning',
              category: 'Filters',
              token: filter.name,
              message: `${prop} value ${value}% is outside normal range (0-100)`,
              suggestion: `Use values between 0-100 for ${prop}`
            });
          }
        } else if (prop === 'brightness' || prop === 'contrast' || prop === 'saturate') {
          if (value < 0 || value > 200) {
            warnings.push({
              type: 'warning',
              category: 'Filters',
              token: filter.name,
              message: `${prop} value ${value}% is outside normal range (0-200)`,
              suggestion: `Use values between 0-200 for ${prop}`
            });
          }
        }
      }
    });
    
    // Validate hue-rotate
    if (filter.hueRotate !== undefined && typeof filter.hueRotate !== 'number') {
      errors.push({
        type: 'error',
        category: 'Filters',
        token: filter.name,
        message: 'Hue rotate must be a number in degrees',
        fix: 'Set hueRotate to a degree value (0-360)'
      });
    }
    
    // Check for excessive blur
    if (filter.blur > 100) {
      warnings.push({
        type: 'warning',
        category: 'Filters',
        token: filter.name,
        message: `Very large blur value (${filter.blur}px)`,
        suggestion: 'Consider if such a large blur is necessary for performance'
      });
    }
  });
  
  // Suggest common filter combinations
  if (filters.length > 0) {
    const hasBlur = filters.some(f => f.blur !== undefined);
    const hasBrightness = filters.some(f => f.brightness !== undefined);
    if (!hasBlur || !hasBrightness) {
      suggestions.push('Consider adding common filter presets like blur and brightness adjustments');
    }
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate backdrop filter tokens
 */
function validateBackdropFilterTokens(backdropFilters: any[]): ValidationResult {
  // Use same validation as regular filters
  const result = validateFilterTokens(backdropFilters);
  
  // Add backdrop-specific suggestions
  const hasGlassMorphism = backdropFilters.some(f => 
    f.blur && f.saturate && f.brightness
  );
  
  if (!hasGlassMorphism) {
    result.suggestions.push('Consider adding a glass morphism preset (blur + saturate + brightness)');
  }
  
  return result;
}

/**
 * Validate interaction tokens
 */
function validateInteractionTokens(interactions: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  const validPointerEvents = ['none', 'auto'];
  const validResize = ['none', 'both', 'horizontal', 'vertical'];
  const validTouchAction = ['auto', 'none', 'pan-x', 'pan-y', 'manipulation', 'pinch-zoom'];
  const validUserSelect = ['none', 'text', 'all', 'auto'];
  const commonCursors = ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed', 
                        'none', 'context-menu', 'progress', 'cell', 'crosshair', 'vertical-text',
                        'alias', 'copy', 'no-drop', 'grab', 'grabbing', 'zoom-in', 'zoom-out',
                        'e-resize', 'n-resize', 'ne-resize', 'nw-resize', 's-resize', 'se-resize',
                        'sw-resize', 'w-resize', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize'];
  
  interactions.forEach(interaction => {
    // Validate pointer events
    if (interaction.pointerEvents && !validPointerEvents.includes(interaction.pointerEvents)) {
      errors.push({
        type: 'error',
        category: 'Interactions',
        token: interaction.name,
        message: `Invalid pointer-events value "${interaction.pointerEvents}"`,
        fix: `Use one of: ${validPointerEvents.join(', ')}`
      });
    }
    
    // Validate resize
    if (interaction.resize && !validResize.includes(interaction.resize)) {
      errors.push({
        type: 'error',
        category: 'Interactions',
        token: interaction.name,
        message: `Invalid resize value "${interaction.resize}"`,
        fix: `Use one of: ${validResize.join(', ')}`
      });
    }
    
    // Validate touch action
    if (interaction.touchAction && !validTouchAction.includes(interaction.touchAction)) {
      errors.push({
        type: 'error',
        category: 'Interactions',
        token: interaction.name,
        message: `Invalid touch-action value "${interaction.touchAction}"`,
        fix: `Use one of: ${validTouchAction.join(', ')}`
      });
    }
    
    // Validate user select
    if (interaction.userSelect && !validUserSelect.includes(interaction.userSelect)) {
      errors.push({
        type: 'error',
        category: 'Interactions',
        token: interaction.name,
        message: `Invalid user-select value "${interaction.userSelect}"`,
        fix: `Use one of: ${validUserSelect.join(', ')}`
      });
    }
    
    // Validate cursor
    if (interaction.cursor && !commonCursors.includes(interaction.cursor)) {
      // Check if it's a URL cursor
      if (!interaction.cursor.startsWith('url(')) {
        warnings.push({
          type: 'warning',
          category: 'Interactions',
          token: interaction.name,
          message: `Non-standard cursor value "${interaction.cursor}"`,
          suggestion: 'Consider using standard cursor values for better compatibility'
        });
      }
    }
  });
  
  // Suggest interaction patterns
  const hasDisabledState = interactions.some(i => 
    i.pointerEvents === 'none' || i.cursor === 'not-allowed'
  );
  if (!hasDisabledState) {
    suggestions.push('Consider adding disabled state interactions (pointer-events: none, cursor: not-allowed)');
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate scroll behavior tokens
 */
function validateScrollTokens(scrollTokens: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  const validScrollBehavior = ['auto', 'smooth'];
  const validScrollSnapType = ['none', 'x', 'y', 'both', 'block', 'inline'];
  const validScrollSnapAlign = ['start', 'end', 'center', 'none'];
  const validScrollSnapStop = ['normal', 'always'];
  const validOverscrollBehavior = ['auto', 'contain', 'none'];
  
  scrollTokens.forEach(scroll => {
    // Validate scroll behavior
    if (scroll.scrollBehavior && !validScrollBehavior.includes(scroll.scrollBehavior)) {
      errors.push({
        type: 'error',
        category: 'Scroll',
        token: scroll.name,
        message: `Invalid scroll-behavior value "${scroll.scrollBehavior}"`,
        fix: `Use one of: ${validScrollBehavior.join(', ')}`
      });
    }
    
    // Validate scroll snap type
    if (scroll.scrollSnapType && !validScrollSnapType.includes(scroll.scrollSnapType)) {
      errors.push({
        type: 'error',
        category: 'Scroll',
        token: scroll.name,
        message: `Invalid scroll-snap-type value "${scroll.scrollSnapType}"`,
        fix: `Use one of: ${validScrollSnapType.join(', ')}`
      });
    }
    
    // Validate scroll snap align
    if (scroll.scrollSnapAlign && !validScrollSnapAlign.includes(scroll.scrollSnapAlign)) {
      errors.push({
        type: 'error',
        category: 'Scroll',
        token: scroll.name,
        message: `Invalid scroll-snap-align value "${scroll.scrollSnapAlign}"`,
        fix: `Use one of: ${validScrollSnapAlign.join(', ')}`
      });
    }
    
    // Validate scroll snap stop
    if (scroll.scrollSnapStop && !validScrollSnapStop.includes(scroll.scrollSnapStop)) {
      errors.push({
        type: 'error',
        category: 'Scroll',
        token: scroll.name,
        message: `Invalid scroll-snap-stop value "${scroll.scrollSnapStop}"`,
        fix: `Use one of: ${validScrollSnapStop.join(', ')}`
      });
    }
    
    // Validate overscroll behavior
    if (scroll.overscrollBehavior && !validOverscrollBehavior.includes(scroll.overscrollBehavior)) {
      errors.push({
        type: 'error',
        category: 'Scroll',
        token: scroll.name,
        message: `Invalid overscroll-behavior value "${scroll.overscrollBehavior}"`,
        fix: `Use one of: ${validOverscrollBehavior.join(', ')}`
      });
    }
  });
  
  // Suggest scroll patterns
  const hasSnapScroll = scrollTokens.some(s => s.scrollSnapType && s.scrollSnapType !== 'none');
  if (!hasSnapScroll) {
    suggestions.push('Consider adding scroll snap configurations for carousel-like interfaces');
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate appearance tokens
 */
function validateAppearanceTokens(appearances: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  const validAppearance = ['none', 'auto'];
  const validColorScheme = ['normal', 'light', 'dark', 'light dark'];
  
  appearances.forEach(appear => {
    // Validate appearance
    if (appear.appearance && !validAppearance.includes(appear.appearance)) {
      errors.push({
        type: 'error',
        category: 'Appearance',
        token: appear.name,
        message: `Invalid appearance value "${appear.appearance}"`,
        fix: `Use one of: ${validAppearance.join(', ')}`
      });
    }
    
    // Validate color scheme
    if (appear.colorScheme && !validColorScheme.includes(appear.colorScheme)) {
      errors.push({
        type: 'error',
        category: 'Appearance',
        token: appear.name,
        message: `Invalid color-scheme value "${appear.colorScheme}"`,
        fix: `Use one of: ${validColorScheme.join(', ')}`
      });
    }
    
    // Validate accent color
    if (appear.accentColor && !isValidColor(appear.accentColor)) {
      errors.push({
        type: 'error',
        category: 'Appearance',
        token: appear.name,
        message: 'Invalid accent color format',
        fix: 'Use valid hex color format (e.g., #FF0000)'
      });
    }
    
    // Validate caret color
    if (appear.caretColor && !isValidColor(appear.caretColor)) {
      errors.push({
        type: 'error',
        category: 'Appearance',
        token: appear.name,
        message: 'Invalid caret color format',
        fix: 'Use valid hex color format (e.g., #FF0000)'
      });
    }
  });
  
  // Suggest color scheme support
  const hasLightDark = appearances.some(a => 
    a.colorScheme === 'light' || a.colorScheme === 'dark'
  );
  if (!hasLightDark) {
    suggestions.push('Consider adding light and dark color scheme tokens for theme support');
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate transition tokens
 */
function validateTransitionTokens(transitions: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  const validBehavior = ['normal', 'allow-discrete'];
  const commonProperties = ['all', 'none', 'colors', 'opacity', 'shadow', 'transform'];
  const commonTimingFunctions = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'];
  
  transitions.forEach(transition => {
    // Validate duration
    if (transition.duration !== undefined) {
      if (typeof transition.duration !== 'number' || transition.duration < 0) {
        errors.push({
          type: 'error',
          category: 'Transitions',
          token: transition.name,
          message: 'Transition duration must be a non-negative number',
          fix: 'Set duration to 0 or positive milliseconds'
        });
      } else if (transition.duration > 5000) {
        warnings.push({
          type: 'warning',
          category: 'Transitions',
          token: transition.name,
          message: `Very long transition duration (${transition.duration}ms)`,
          suggestion: 'Consider if such a long transition is necessary'
        });
      }
    }
    
    // Validate delay
    if (transition.delay !== undefined) {
      if (typeof transition.delay !== 'number' || transition.delay < 0) {
        errors.push({
          type: 'error',
          category: 'Transitions',
          token: transition.name,
          message: 'Transition delay must be a non-negative number',
          fix: 'Set delay to 0 or positive milliseconds'
        });
      }
    }
    
    // Validate property
    if (transition.property) {
      const props = Array.isArray(transition.property) ? transition.property : [transition.property];
      props.forEach(prop => {
        if (!commonProperties.includes(prop) && !prop.includes(',')) {
          warnings.push({
            type: 'warning',
            category: 'Transitions',
            token: transition.name,
            message: `Non-standard transition property "${prop}"`,
            suggestion: `Common properties: ${commonProperties.join(', ')}`
          });
        }
      });
    }
    
    // Validate timing function
    if (transition.timingFunction) {
      if (!commonTimingFunctions.includes(transition.timingFunction) && 
          !transition.timingFunction.startsWith('cubic-bezier')) {
        warnings.push({
          type: 'warning',
          category: 'Transitions',
          token: transition.name,
          message: `Non-standard timing function "${transition.timingFunction}"`,
          suggestion: `Common functions: ${commonTimingFunctions.join(', ')}`
        });
      }
    }
    
    // Validate behavior
    if (transition.behavior && !validBehavior.includes(transition.behavior)) {
      errors.push({
        type: 'error',
        category: 'Transitions',
        token: transition.name,
        message: `Invalid transition behavior "${transition.behavior}"`,
        fix: `Use one of: ${validBehavior.join(', ')}`
      });
    }
  });
  
  // Suggest common transition patterns
  const hasHoverTransition = transitions.some(t => t.name.includes('hover'));
  if (!hasHoverTransition) {
    suggestions.push('Consider adding hover state transitions for interactive elements');
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate animation tokens
 */
function validateAnimationTokens(animations: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  
  const validDirection = ['normal', 'reverse', 'alternate', 'alternate-reverse'];
  const validFillMode = ['none', 'forwards', 'backwards', 'both'];
  const validPlayState = ['running', 'paused'];
  
  animations.forEach(animation => {
    // Validate duration (required)
    if (typeof animation.duration !== 'number' || animation.duration <= 0) {
      errors.push({
        type: 'error',
        category: 'Animations',
        token: animation.name,
        message: 'Animation duration must be a positive number',
        fix: 'Set duration to positive milliseconds'
      });
    } else if (animation.duration > 10000) {
      warnings.push({
        type: 'warning',
        category: 'Animations',
        token: animation.name,
        message: `Very long animation duration (${animation.duration}ms)`,
        suggestion: 'Long animations may affect performance and user experience'
      });
    }
    
    // Validate delay
    if (animation.delay !== undefined) {
      if (typeof animation.delay !== 'number' || animation.delay < 0) {
        errors.push({
          type: 'error',
          category: 'Animations',
          token: animation.name,
          message: 'Animation delay must be a non-negative number',
          fix: 'Set delay to 0 or positive milliseconds'
        });
      }
    }
    
    // Validate iteration count
    if (animation.iterationCount !== undefined) {
      if (animation.iterationCount !== 'infinite' && 
          (typeof animation.iterationCount !== 'number' || animation.iterationCount <= 0)) {
        errors.push({
          type: 'error',
          category: 'Animations',
          token: animation.name,
          message: 'Iteration count must be positive number or "infinite"',
          fix: 'Set to positive number or "infinite"'
        });
      }
    }
    
    // Validate direction
    if (animation.direction && !validDirection.includes(animation.direction)) {
      errors.push({
        type: 'error',
        category: 'Animations',
        token: animation.name,
        message: `Invalid animation direction "${animation.direction}"`,
        fix: `Use one of: ${validDirection.join(', ')}`
      });
    }
    
    // Validate fill mode
    if (animation.fillMode && !validFillMode.includes(animation.fillMode)) {
      errors.push({
        type: 'error',
        category: 'Animations',
        token: animation.name,
        message: `Invalid fill mode "${animation.fillMode}"`,
        fix: `Use one of: ${validFillMode.join(', ')}`
      });
    }
    
    // Validate play state
    if (animation.playState && !validPlayState.includes(animation.playState)) {
      errors.push({
        type: 'error',
        category: 'Animations',
        token: animation.name,
        message: `Invalid play state "${animation.playState}"`,
        fix: `Use one of: ${validPlayState.join(', ')}`
      });
    }
    
    // Validate keyframes
    if (animation.keyframes) {
      if (!Array.isArray(animation.keyframes) || animation.keyframes.length < 2) {
        errors.push({
          type: 'error',
          category: 'Animations',
          token: animation.name,
          message: 'Animation must have at least 2 keyframes',
          fix: 'Add keyframes for start and end states'
        });
      } else {
        // Check keyframe offsets
        const offsets = animation.keyframes.map((kf: any) => kf.offset);
        const hasInvalidOffset = offsets.some((o: number) => o < 0 || o > 100);
        if (hasInvalidOffset) {
          errors.push({
            type: 'error',
            category: 'Animations',
            token: animation.name,
            message: 'Keyframe offsets must be between 0-100',
            fix: 'Adjust offsets to percentage values 0-100'
          });
        }
        
        // Check for start and end keyframes
        if (!offsets.includes(0)) {
          warnings.push({
            type: 'warning',
            category: 'Animations',
            token: animation.name,
            message: 'Missing keyframe at 0%',
            suggestion: 'Add initial keyframe at 0% for smooth animation start'
          });
        }
        if (!offsets.includes(100)) {
          warnings.push({
            type: 'warning',
            category: 'Animations',
            token: animation.name,
            message: 'Missing keyframe at 100%',
            suggestion: 'Add final keyframe at 100% for smooth animation end'
          });
        }
      }
    }
    
    // Performance warnings
    if (animation.iterationCount === 'infinite' && (!animation.keyframes || 
        animation.keyframes.some((kf: any) => kf.filter || 
        (kf.transform && kf.transform.includes('blur'))))) {
      warnings.push({
        type: 'warning',
        category: 'Animations',
        token: animation.name,
        message: 'Infinite animation with expensive properties (blur/filter)',
        suggestion: 'Consider performance impact of continuous expensive animations'
      });
    }
  });
  
  // Suggest common animations
  const animationTypes = animations.map(a => a.name.toLowerCase());
  if (!animationTypes.some(n => n.includes('fade'))) {
    suggestions.push('Consider adding fade in/out animations for smooth transitions');
  }
  if (!animationTypes.some(n => n.includes('spin') || n.includes('rotate'))) {
    suggestions.push('Consider adding spin/rotate animations for loading states');
  }
  
  return { valid: errors.length === 0, errors, warnings, suggestions };
}

/**
 * Validate all tokens
 */
export function validateTokens(tokens: any): ValidationResult {
  const results: ValidationResult[] = [];
  
  if (tokens.colors && Array.isArray(tokens.colors)) {
    results.push(validateColorTokens(tokens.colors));
  }
  
  if (tokens.spacing && Array.isArray(tokens.spacing)) {
    results.push(validateSpacingTokens(tokens.spacing));
  }
  
  if (tokens.typography && Array.isArray(tokens.typography)) {
    results.push(validateTypographyTokens(tokens.typography));
  }
  
  if (tokens.shadows && Array.isArray(tokens.shadows)) {
    results.push(validateShadowTokens(tokens.shadows));
  }
  
  if (tokens.gradients && Array.isArray(tokens.gradients)) {
    results.push(validateGradientTokens(tokens.gradients));
  }
  
  if (tokens.containers && Array.isArray(tokens.containers)) {
    results.push(validateContainerTokens(tokens.containers));
  }
  
  if (tokens.grids && Array.isArray(tokens.grids)) {
    results.push(validateGridTokens(tokens.grids));
  }
  
  if (tokens.flexLayouts && Array.isArray(tokens.flexLayouts)) {
    results.push(validateFlexTokens(tokens.flexLayouts));
  }
  
  if (tokens.aspectRatios && Array.isArray(tokens.aspectRatios)) {
    results.push(validateAspectRatioTokens(tokens.aspectRatios));
  }
  
  if (tokens.zIndex && Array.isArray(tokens.zIndex)) {
    results.push(validateZIndexTokens(tokens.zIndex));
  }
  
  if (tokens.filters && Array.isArray(tokens.filters)) {
    results.push(validateFilterTokens(tokens.filters));
  }
  
  if (tokens.backdropFilters && Array.isArray(tokens.backdropFilters)) {
    results.push(validateBackdropFilterTokens(tokens.backdropFilters));
  }
  
  if (tokens.interactions && Array.isArray(tokens.interactions)) {
    results.push(validateInteractionTokens(tokens.interactions));
  }
  
  if (tokens.scrollBehavior && Array.isArray(tokens.scrollBehavior)) {
    results.push(validateScrollTokens(tokens.scrollBehavior));
  }
  
  if (tokens.appearance && Array.isArray(tokens.appearance)) {
    results.push(validateAppearanceTokens(tokens.appearance));
  }
  
  if (tokens.transitions && Array.isArray(tokens.transitions)) {
    results.push(validateTransitionTokens(tokens.transitions));
  }
  
  if (tokens.animations && Array.isArray(tokens.animations)) {
    results.push(validateAnimationTokens(tokens.animations));
  }
  
  // Combine all results
  const combined: ValidationResult = {
    valid: results.every(r => r.valid),
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
    suggestions: [...new Set(results.flatMap(r => r.suggestions))]
  };
  
  // Add general suggestions
  if (combined.errors.length === 0 && combined.warnings.length === 0) {
    combined.suggestions.push('✨ All tokens pass validation! Great job maintaining consistency.');
  }
  
  return combined;
}

/**
 * Calculate contrast ratio between two colors
 */
function calculateContrast(color1: any, color2: any): number {
  const l1 = calculateLuminance(color1);
  const l2 = calculateLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate relative luminance
 */
function calculateLuminance(color: any): number {
  const { r, g, b } = color;
  
  // Normalize to 0-1 range if values are in 0-255 range
  const normalize = (val: number) => val > 1 ? val / 255 : val;
  
  const sRGB = [normalize(r), normalize(g), normalize(b)].map(val => {
    if (val <= 0.03928) {
      return val / 12.92;
    }
    return Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/**
 * Format validation results for display
 */
export function formatValidationResults(results: ValidationResult): string {
  const lines: string[] = [];
  
  if (results.valid) {
    lines.push('✅ All tokens are valid!\n');
  } else {
    lines.push(`❌ Found ${results.errors.length} errors\n`);
  }
  
  // Errors
  if (results.errors.length > 0) {
    lines.push('## Errors\n');
    results.errors.forEach(error => {
      lines.push(`- **${error.category}/${error.token}**: ${error.message}`);
      if (error.fix) {
        lines.push(`  💡 Fix: ${error.fix}`);
      }
    });
    lines.push('');
  }
  
  // Warnings
  if (results.warnings.length > 0) {
    lines.push(`## Warnings (${results.warnings.length})\n`);
    results.warnings.forEach(warning => {
      lines.push(`- **${warning.category}/${warning.token}**: ${warning.message}`);
      if (warning.suggestion) {
        lines.push(`  💡 ${warning.suggestion}`);
      }
    });
    lines.push('');
  }
  
  // Suggestions
  if (results.suggestions.length > 0) {
    lines.push('## Suggestions\n');
    results.suggestions.forEach(suggestion => {
      lines.push(`- ${suggestion}`);
    });
  }
  
  return lines.join('\n');
}