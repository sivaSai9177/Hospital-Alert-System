/**
 * Enhanced Error Messages with Fix Suggestions
 * Provides helpful error messages and solutions for common issues
 */

export interface ErrorWithFix {
  message: string;
  fix?: string;
  code?: string;
  details?: any;
}

/**
 * Font-related error messages
 */
export const FontErrors = {
  unloadedFont: (fontName: string): ErrorWithFix => ({
    message: `Cannot use unloaded font "${fontName}"`,
    fix: `Ensure the font is available in Figma. Try:
1. Install the font on your system
2. Restart Figma Desktop
3. Use a fallback font like "Inter"`,
    code: 'FONT_NOT_LOADED'
  }),

  invalidFontWeight: (weight: number | string): ErrorWithFix => ({
    message: `Invalid font weight: ${weight}`,
    fix: `Use standard font weights: 100, 200, 300, 400, 500, 600, 700, 800, 900
Common names: Thin, Light, Regular, Medium, Semi Bold, Bold, Black`,
    code: 'INVALID_FONT_WEIGHT'
  }),

  fontStyleNotFound: (family: string, style: string): ErrorWithFix => ({
    message: `Font style "${style}" not found for "${family}"`,
    fix: `Check available font styles in Figma. For Inter:
- Use "Semi Bold" with space (not "SemiBold")
- Use "Extra Light" with space (not "ExtraLight")
- Fallback to "Regular" if specific weight unavailable`,
    code: 'FONT_STYLE_NOT_FOUND'
  })
};

/**
 * Variable-related error messages
 */
export const VariableErrors = {
  invalidName: (name: string, invalidChar: string): ErrorWithFix => ({
    message: `Invalid variable name: "${name}" contains "${invalidChar}"`,
    fix: `Replace invalid characters:
- Dots (.) → Underscores (_)
- Spaces → Underscores or hyphens
- Special chars → Remove or replace
Example: "spacing.0.5" → "spacing/0_5"`,
    code: 'INVALID_VARIABLE_NAME'
  }),

  invalidScope: (scope: string, validScopes: string[]): ErrorWithFix => ({
    message: `Invalid scope: "${scope}"`,
    fix: `Use valid scopes: ${validScopes.join(', ')}
For colors: FRAME_FILL, SHAPE_FILL, TEXT_FILL, STROKE_COLOR
For numbers: GAP, WIDTH_HEIGHT, CORNER_RADIUS`,
    code: 'INVALID_SCOPE'
  }),

  collectionNotFound: (name: string): ErrorWithFix => ({
    message: `Variable collection "${name}" not found`,
    fix: `Create the collection first or check the collection name.
Collections are case-sensitive.`,
    code: 'COLLECTION_NOT_FOUND'
  }),

  modeLimit: (requested: number, limit: number): ErrorWithFix => ({
    message: `Limited to ${limit} mode(s) only. Requested ${requested} modes.`,
    fix: `Figma free plan limitation. Options:
1. Use only the default mode
2. Create separate collections for different themes
3. Upgrade to Figma Professional plan`,
    code: 'MODE_LIMIT_EXCEEDED'
  })
};

/**
 * Color-related error messages
 */
export const ColorErrors = {
  invalidFormat: (value: string): ErrorWithFix => ({
    message: `Invalid color format: "${value}"`,
    fix: `Use supported formats:
- RGB: { r: 0-1, g: 0-1, b: 0-1 }
- Hex: #RRGGBB or #RGB
- HSL will be converted to RGB automatically`,
    code: 'INVALID_COLOR_FORMAT'
  }),

  rgbOutOfRange: (component: string, value: number): ErrorWithFix => ({
    message: `RGB ${component} value ${value} out of range`,
    fix: `Figma uses normalized RGB (0-1), not 0-255.
Divide by 255: ${value} → ${(value / 255).toFixed(3)}`,
    code: 'RGB_OUT_OF_RANGE'
  }),

  lowContrast: (ratio: number, required: number): ErrorWithFix => ({
    message: `Low contrast ratio: ${ratio.toFixed(2)} (minimum ${required})`,
    fix: `Improve accessibility:
- WCAG AA: 4.5:1 for normal text, 3:1 for large text
- WCAG AAA: 7:1 for normal text, 4.5:1 for large text
- Darken foreground or lighten background`,
    code: 'LOW_CONTRAST'
  })
};

/**
 * API-related error messages
 */
export const APIErrors = {
  asyncRequired: (method: string): ErrorWithFix => ({
    message: `Cannot call ${method} with documentAccess: dynamic-page`,
    fix: `Use async version: ${method}Async
Example: getVariableCollectionById → getVariableCollectionByIdAsync`,
    code: 'ASYNC_METHOD_REQUIRED'
  }),

  incrementalMode: (): ErrorWithFix => ({
    message: 'Cannot call createVariable with a collection id in incremental mode',
    fix: `Pass the collection object instead of ID:
Wrong: createVariable(name, collectionId, type)
Right: createVariable(name, collection, type)`,
    code: 'INCREMENTAL_MODE_ERROR'
  }),

  documentAccess: (): ErrorWithFix => ({
    message: 'Plugin requires document access',
    fix: `This plugin needs to access your Figma document.
Run from Plugins menu, not from console/query mode.`,
    code: 'NO_DOCUMENT_ACCESS'
  })
};

/**
 * Unit conversion error messages
 */
export const UnitErrors = {
  invalidUnit: (unit: string, validUnits: string[]): ErrorWithFix => ({
    message: `Invalid unit: "${unit}"`,
    fix: `Use valid units: ${validUnits.join(', ')}
For letter spacing: PIXELS or PERCENT only
Convert EM to pixels: em × fontSize`,
    code: 'INVALID_UNIT'
  }),

  conversionFailed: (from: string, to: string): ErrorWithFix => ({
    message: `Cannot convert ${from} to ${to}`,
    fix: `Manual conversion needed:
- EM to PX: multiply by font size
- % to PX: multiply by base value
- REM to PX: multiply by root font size (usually 16)`,
    code: 'UNIT_CONVERSION_FAILED'
  })
};

/**
 * Syntax error messages
 */
export const SyntaxErrors = {
  spreadOperator: (): ErrorWithFix => ({
    message: 'Unexpected token ...',
    fix: `Figma doesn't support spread operator. Use Object.assign():
Wrong: { ...obj, prop: value }
Right: Object.assign({}, obj, { prop: value })`,
    code: 'SPREAD_NOT_SUPPORTED'
  }),

  optionalChaining: (): ErrorWithFix => ({
    message: 'Unexpected token ?',
    fix: `Figma doesn't support optional chaining. Use traditional checks:
Wrong: obj?.prop?.value
Right: obj && obj.prop && obj.prop.value`,
    code: 'OPTIONAL_CHAINING_NOT_SUPPORTED'
  }),

  asyncAwait: (): ErrorWithFix => ({
    message: 'Unexpected token async/await',
    fix: `Ensure proper async function syntax:
async function name() { ... }
const name = async () => { ... }`,
    code: 'ASYNC_SYNTAX_ERROR'
  })
};

/**
 * Token-specific error messages
 */
export const TokenErrors = {
  missingTokens: (type: string): ErrorWithFix => ({
    message: `No ${type} tokens found`,
    fix: `Check token source files:
- CSS: app/global.css
- Theme: lib/theme/index.ts
- Spacing: lib/design/spacing.ts
Ensure files exist and contain valid tokens`,
    code: 'MISSING_TOKENS'
  }),

  invalidTokenStructure: (path: string): ErrorWithFix => ({
    message: `Invalid token structure at ${path}`,
    fix: `Tokens should have:
- name: string
- value: appropriate type (number, string, object)
- Optional: description, scopes`,
    code: 'INVALID_TOKEN_STRUCTURE'
  }),

  duplicateToken: (name: string, category: string): ErrorWithFix => ({
    message: `Duplicate token "${name}" in ${category}`,
    fix: `Ensure unique token names within each category.
Consider namespacing: "button/primary" vs "text/primary"`,
    code: 'DUPLICATE_TOKEN'
  })
};

/**
 * Format error message for display
 */
export function formatError(error: any): ErrorWithFix {
  // Check if it's already an ErrorWithFix
  if (error.message && error.fix) {
    return error;
  }

  // Parse common Figma error messages
  const message = error.message || error.toString();

  // Font errors
  if (message.includes('Cannot use unloaded font')) {
    const fontMatch = message.match(/"([^"]+)"/);
    return FontErrors.unloadedFont(fontMatch ? fontMatch[1] : 'Unknown');
  }

  // Variable name errors
  if (message.includes('invalid variable name')) {
    const nameMatch = message.match(/"([^"]+)"/);
    return VariableErrors.invalidName(nameMatch ? nameMatch[1] : 'Unknown', '.');
  }

  // Scope errors
  if (message.includes('Invalid enum value')) {
    const scopeMatch = message.match(/received '([^']+)'/);
    return VariableErrors.invalidScope(scopeMatch ? scopeMatch[1] : 'Unknown', ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR']);
  }

  // API errors
  if (message.includes('documentAccess: dynamic-page')) {
    const methodMatch = message.match(/Cannot call (\w+)/);
    return APIErrors.asyncRequired(methodMatch ? methodMatch[1] : 'method');
  }

  if (message.includes('incremental mode')) {
    return APIErrors.incrementalMode();
  }

  // Syntax errors
  if (message.includes('Unexpected token ...')) {
    return SyntaxErrors.spreadOperator();
  }

  if (message.includes('Unexpected token .')) {
    return SyntaxErrors.optionalChaining();
  }

  // Default error
  return {
    message: message,
    fix: 'Check the console for more details',
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Create user-friendly error message
 */
export function createUserMessage(error: ErrorWithFix, context?: string): string {
  let message = error.message;
  
  if (context) {
    message = `${context}: ${message}`;
  }
  
  if (error.fix) {
    message += `\n\n💡 How to fix:\n${error.fix}`;
  }
  
  if (error.code) {
    message += `\n\nError code: ${error.code}`;
  }
  
  return message;
}