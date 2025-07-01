/**
 * CSS Variable Extractor
 * Parses CSS files to extract custom properties (CSS variables)
 */

// Note: File system operations would be handled by the MCP server
// This module focuses on parsing CSS content

export interface CSSVariable {
  name: string;
  value: string;
  category?: string;
  mode?: 'light' | 'dark' | 'default';
}

export interface ExtractedCSSVariables {
  colors: CSSVariable[];
  spacing: CSSVariable[];
  typography: CSSVariable[];
  shadows: CSSVariable[];
  borderRadius: CSSVariable[];
  other: CSSVariable[];
}

/**
 * Parse HSL color string to RGB
 */
function hslToRgb(hslString: string): { r: number; g: number; b: number } | null {
  // Handle HSL format: "210 40% 98%" or "210deg 40% 98%"
  const match = hslString.match(/(\d+)(?:deg)?\s+(\d+)%\s+(\d+)%/);
  if (!match) return null;

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

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
    b: Math.round(b * 255)
  };
}

/**
 * Convert CSS variable value to appropriate format
 */
function processVariableValue(name: string, value: string): string {
  // Remove quotes and trim
  value = value.replace(/["']/g, '').trim();

  // Handle HSL colors
  if (value.includes('%') && !value.includes('hsl')) {
    const rgb = hslToRgb(value);
    if (rgb) {
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }
  }

  // Handle calc() expressions
  if (value.includes('calc(')) {
    // Try to evaluate simple calc expressions
    const calcMatch = value.match(/calc\((.*?)\)/);
    if (calcMatch) {
      try {
        // Simple evaluation for basic math
        const expr = calcMatch[1].replace(/(\d+)px/g, '$1');
        // This is a simplified approach - in production, use a proper parser
        return value;
      } catch {
        return value;
      }
    }
  }

  return value;
}

/**
 * Categorize CSS variable by name
 */
function categorizeVariable(name: string): keyof ExtractedCSSVariables {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('color') || lowerName.includes('bg') || 
      lowerName.includes('foreground') || lowerName.includes('background') ||
      lowerName.includes('primary') || lowerName.includes('secondary') ||
      lowerName.includes('accent') || lowerName.includes('destructive') ||
      lowerName.includes('muted') || lowerName.includes('border') && !lowerName.includes('radius')) {
    return 'colors';
  }
  
  if (lowerName.includes('spacing') || lowerName.includes('space') ||
      lowerName.includes('gap') || lowerName.includes('padding') ||
      lowerName.includes('margin')) {
    return 'spacing';
  }
  
  if (lowerName.includes('font') || lowerName.includes('text') ||
      lowerName.includes('line-height') || lowerName.includes('letter-spacing')) {
    return 'typography';
  }
  
  if (lowerName.includes('shadow') || lowerName.includes('elevation')) {
    return 'shadows';
  }
  
  if (lowerName.includes('radius') || lowerName.includes('rounded')) {
    return 'borderRadius';
  }
  
  return 'other';
}

/**
 * Extract CSS variables from a CSS file
 */
export function extractCSSVariables(cssContent: string): ExtractedCSSVariables {
  const result: ExtractedCSSVariables = {
    colors: [],
    spacing: [],
    typography: [],
    shadows: [],
    borderRadius: [],
    other: []
  };

  // Regular expression to match CSS custom properties
  const variableRegex = /--([\w-]+):\s*([^;]+);/g;
  
  // Find all matches
  let match;
  while ((match = variableRegex.exec(cssContent)) !== null) {
    const [, name, value] = match;
    const processedValue = processVariableValue(name, value);
    
    const variable: CSSVariable = {
      name: `--${name}`,
      value: processedValue
    };

    // Determine mode based on context (e.g., inside .dark class)
    if (cssContent.lastIndexOf('.dark', match.index) > cssContent.lastIndexOf('}', match.index)) {
      variable.mode = 'dark';
    } else if (cssContent.lastIndexOf(':root', match.index) > cssContent.lastIndexOf('}', match.index)) {
      variable.mode = 'default';
    } else {
      variable.mode = 'light';
    }

    // Categorize and add to appropriate array
    const category = categorizeVariable(name);
    result[category].push(variable);
  }

  return result;
}

/**
 * Extract CSS variables from a file path
 * Note: This function would be used by the MCP server which has file system access
 */
export async function extractCSSVariablesFromFile(filePath: string): Promise<ExtractedCSSVariables> {
  // This would be implemented in the MCP server
  throw new Error('File system access should be handled by MCP server');
}

/**
 * Convert extracted CSS variables to design tokens format
 */
export function cssVariablesToTokens(variables: ExtractedCSSVariables) {
  return {
    colors: variables.colors.map(v => ({
      name: v.name.replace('--', '').replace(/\./g, '_').replace(/-/g, '/'),
      value: v.value,
      type: 'color',
      mode: v.mode
    })),
    spacing: variables.spacing.map(v => ({
      name: v.name.replace('--', '').replace(/\./g, '_').replace(/-/g, '/'),
      value: v.value,
      type: 'dimension'
    })),
    typography: variables.typography.map(v => ({
      name: v.name.replace('--', '').replace(/\./g, '_').replace(/-/g, '/'),
      value: v.value,
      type: v.name.includes('font-size') ? 'dimension' : 'string'
    })),
    effects: {
      shadows: variables.shadows.map(v => ({
        name: v.name.replace('--', '').replace(/\./g, '_').replace(/-/g, '/'),
        value: v.value,
        type: 'shadow'
      })),
      borderRadius: variables.borderRadius.map(v => ({
        name: v.name.replace('--', '').replace(/\./g, '_').replace(/-/g, '/'),
        value: v.value,
        type: 'dimension'
      }))
    }
  };
}