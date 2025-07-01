import { DesignTokens, ColorToken, TypographyToken, SpacingToken, ShadowToken } from '../../shared/types/design-tokens';

// Apply tokens from code to Figma
export async function applyTokensToFigma(tokens: DesignTokens): Promise<void> {
  console.log('🔄 Starting token application to Figma...');
  
  try {
    // Apply color tokens
    if (tokens.colors && tokens.colors.length > 0) {
      await applyColorTokens(tokens.colors);
    }
    
    // Apply typography tokens
    if (tokens.typography && tokens.typography.length > 0) {
      await applyTypographyTokens(tokens.typography);
    }
    
    // Apply shadow tokens
    if (tokens.shadows && tokens.shadows.length > 0) {
      await applyShadowTokens(tokens.shadows);
    }
    
    console.log('✅ Successfully applied tokens to Figma');
  } catch (error) {
    console.error('❌ Error applying tokens:', error);
    throw error;
  }
}

async function applyColorTokens(colors: ColorToken[]): Promise<void> {
  console.log(`🎨 Applying ${colors.length} color tokens...`);
  
  // Get existing paint styles
  const existingStyles = await figma.getLocalPaintStylesAsync();
  const styleMap = new Map(existingStyles.map(style => [style.name, style]));
  
  for (const colorToken of colors) {
    try {
      const existingStyle = styleMap.get(colorToken.name);
      
      // Convert hex to RGB
      const rgb = hexToRgb(colorToken.value);
      if (!rgb) {
        console.warn(`⚠️ Invalid color value for ${colorToken.name}: ${colorToken.value}`);
        continue;
      }
      
      const paint: SolidPaint = {
        type: 'SOLID',
        color: {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255
        },
        opacity: rgb.a
      };
      
      if (existingStyle) {
        // Update existing style
        existingStyle.paints = [paint];
        if (colorToken.description) {
          existingStyle.description = colorToken.description;
        }
        console.log(`📝 Updated color style: ${colorToken.name}`);
      } else {
        // Create new style
        const newStyle = figma.createPaintStyle();
        newStyle.name = colorToken.name;
        newStyle.paints = [paint];
        if (colorToken.description) {
          newStyle.description = colorToken.description;
        }
        console.log(`✨ Created color style: ${colorToken.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to apply color token ${colorToken.name}:`, error);
    }
  }
}

async function applyTypographyTokens(typography: TypographyToken[]): Promise<void> {
  console.log(`📝 Applying ${typography.length} typography tokens...`);
  
  // Get existing text styles
  const existingStyles = await figma.getLocalTextStylesAsync();
  const styleMap = new Map(existingStyles.map(style => [style.name, style]));
  
  for (const typoToken of typography) {
    try {
      const existingStyle = styleMap.get(typoToken.name);
      
      // Load font
      const fontName: FontName = {
        family: typoToken.fontFamily,
        style: getFontStyle(typoToken.fontWeight)
      };
      
      // Ensure font is loaded
      try {
        await figma.loadFontAsync(fontName);
      } catch (fontError) {
        console.warn(`⚠️ Could not load font ${fontName.family} ${fontName.style}, using default`);
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        fontName.family = "Inter";
        fontName.style = "Regular";
      }
      
      if (existingStyle) {
        // Update existing style
        existingStyle.fontName = fontName;
        existingStyle.fontSize = typoToken.fontSize;
        if (typoToken.lineHeight !== 'auto' && typeof typoToken.lineHeight === 'number') {
          existingStyle.lineHeight = { value: typoToken.lineHeight, unit: 'PIXELS' };
        } else {
          existingStyle.lineHeight = { unit: 'AUTO' };
        }
        // Convert letter spacing if provided - if it's a fraction (em), convert to pixels
        if (typoToken.letterSpacing !== undefined) {
          const letterSpacingValue = Math.abs(typoToken.letterSpacing) < 1 
            ? typoToken.letterSpacing * typoToken.fontSize 
            : typoToken.letterSpacing;
          existingStyle.letterSpacing = { value: letterSpacingValue, unit: 'PIXELS' };
        }
        if (typoToken.description) {
          existingStyle.description = typoToken.description;
        }
        console.log(`📝 Updated text style: ${typoToken.name}`);
      } else {
        // Create new style
        const newStyle = figma.createTextStyle();
        newStyle.name = typoToken.name;
        newStyle.fontName = fontName;
        newStyle.fontSize = typoToken.fontSize;
        if (typoToken.lineHeight !== 'auto' && typeof typoToken.lineHeight === 'number') {
          newStyle.lineHeight = { value: typoToken.lineHeight, unit: 'PIXELS' };
        } else {
          newStyle.lineHeight = { unit: 'AUTO' };
        }
        // Convert letter spacing if provided - if it's a fraction (em), convert to pixels
        if (typoToken.letterSpacing !== undefined) {
          const letterSpacingValue = Math.abs(typoToken.letterSpacing) < 1 
            ? typoToken.letterSpacing * typoToken.fontSize 
            : typoToken.letterSpacing;
          newStyle.letterSpacing = { value: letterSpacingValue, unit: 'PIXELS' };
        }
        if (typoToken.description) {
          newStyle.description = typoToken.description;
        }
        console.log(`✨ Created text style: ${typoToken.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to apply typography token ${typoToken.name}:`, error);
    }
  }
}

async function applyShadowTokens(shadows: ShadowToken[]): Promise<void> {
  console.log(`🌑 Applying ${shadows.length} shadow tokens...`);
  
  // Get existing effect styles
  const existingStyles = await figma.getLocalEffectStylesAsync();
  const styleMap = new Map(existingStyles.map(style => [style.name, style]));
  
  for (const shadowToken of shadows) {
    try {
      const existingStyle = styleMap.get(shadowToken.name);
      
      // Convert shadow token to Figma effects
      const effects: Effect[] = shadowToken.value.map(shadow => {
        const rgb = hexToRgb(shadow.color);
        return {
          type: 'DROP_SHADOW',
          color: {
            r: rgb ? rgb.r / 255 : 0,
            g: rgb ? rgb.g / 255 : 0,
            b: rgb ? rgb.b / 255 : 0,
            a: rgb ? rgb.a : 1
          },
          offset: shadow.offset,
          radius: shadow.radius,
          spread: shadow.spread || 0,
          visible: true,
          blendMode: 'NORMAL'
        } as DropShadowEffect;
      });
      
      if (existingStyle) {
        // Update existing style
        existingStyle.effects = effects;
        if (shadowToken.description) {
          existingStyle.description = shadowToken.description;
        }
        console.log(`📝 Updated effect style: ${shadowToken.name}`);
      } else {
        // Create new style
        const newStyle = figma.createEffectStyle();
        newStyle.name = shadowToken.name;
        newStyle.effects = effects;
        if (shadowToken.description) {
          newStyle.description = shadowToken.description;
        }
        console.log(`✨ Created effect style: ${shadowToken.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to apply shadow token ${shadowToken.name}:`, error);
    }
  }
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } | null {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Handle 6 or 8 digit hex
  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
    
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b, a };
    }
  }
  
  return null;
}

function getFontStyle(weight: number): string {
  // Map numeric weights to Figma font styles
  // Inter font requires "Semi Bold" with a space
  const weightMap: { [key: number]: string } = {
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black'
  };
  
  return weightMap[weight] || 'Regular';
}

// Create or update Variables (for modern token management)
export async function applyTokensAsVariables(tokens: DesignTokens): Promise<void> {
  console.log('🔄 Starting token application as Variables...');
  
  try {
    // Get or create a variable collection
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    let collection = collections.find(c => c.name === 'Design System Tokens');
    
    if (!collection) {
      collection = figma.variables.createVariableCollection('Design System Tokens');
      console.log('✨ Created variable collection');
    }
    
    // Apply color variables
    if (tokens.colors && tokens.colors.length > 0) {
      for (const colorToken of tokens.colors) {
        await createOrUpdateColorVariable(collection, colorToken);
      }
    }
    
    // Apply spacing variables
    if (tokens.spacing && tokens.spacing.length > 0) {
      for (const spacingToken of tokens.spacing) {
        await createOrUpdateNumberVariable(collection, spacingToken.name, spacingToken.value, spacingToken.description);
      }
    }
    
    // Apply border radius variables
    if (tokens.borderRadius && tokens.borderRadius.length > 0) {
      for (const radiusToken of tokens.borderRadius) {
        await createOrUpdateNumberVariable(collection, radiusToken.name, radiusToken.value, radiusToken.description);
      }
    }
    
    console.log('✅ Successfully applied tokens as Variables');
  } catch (error) {
    console.error('❌ Error applying variables:', error);
    throw error;
  }
}

async function createOrUpdateColorVariable(collection: VariableCollection, colorToken: ColorToken): Promise<void> {
  try {
    // Check if variable exists
    const variables = await Promise.all(
      collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
    );
    const existingVar = variables.find(v => v && v.name === colorToken.name);
    
    const rgb = hexToRgb(colorToken.value);
    if (!rgb) return;
    
    const colorValue = {
      r: rgb.r / 255,
      g: rgb.g / 255,
      b: rgb.b / 255,
      a: rgb.a
    };
    
    if (existingVar) {
      // Update existing variable
      const modeId = collection.defaultModeId;
      existingVar.setValueForMode(modeId, colorValue);
      console.log(`📝 Updated color variable: ${colorToken.name}`);
    } else {
      // Create new variable
      const newVar = figma.variables.createVariable(
        colorToken.name,
        collection,
        'COLOR'
      );
      const modeId = collection.defaultModeId;
      newVar.setValueForMode(modeId, colorValue);
      console.log(`✨ Created color variable: ${colorToken.name}`);
    }
  } catch (error) {
    console.error(`❌ Failed to apply color variable ${colorToken.name}:`, error);
  }
}

async function createOrUpdateNumberVariable(collection: VariableCollection, name: string, value: number, description?: string): Promise<void> {
  try {
    // Check if variable exists
    const variables = await Promise.all(
      collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
    );
    const existingVar = variables.find(v => v && v.name === name);
    
    if (existingVar) {
      // Update existing variable
      const modeId = collection.defaultModeId;
      existingVar.setValueForMode(modeId, value);
      console.log(`📝 Updated number variable: ${name}`);
    } else {
      // Create new variable
      const newVar = figma.variables.createVariable(
        name,
        collection,
        'FLOAT'
      );
      const modeId = collection.defaultModeId;
      newVar.setValueForMode(modeId, value);
      console.log(`✨ Created number variable: ${name}`);
    }
  } catch (error) {
    console.error(`❌ Failed to apply number variable ${name}:`, error);
  }
}