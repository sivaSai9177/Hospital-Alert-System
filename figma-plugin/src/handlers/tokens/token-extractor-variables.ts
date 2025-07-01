import { ColorToken, TypographyToken, SpacingToken, ShadowToken, DesignTokens } from '../../shared/types/design-tokens';

export async function extractDesignTokensWithVariables(): Promise<DesignTokens> {
  const tokens: DesignTokens = {
    colors: await extractColorTokensWithVariables(),
    typography: await extractTypographyTokens(), // Variables API doesn't support typography yet
    spacing: await extractSpacingTokensWithVariables(),
    shadows: await extractShadowTokens(), // Variables API doesn't support shadows yet
    borderRadius: await extractBorderRadiusTokensWithVariables(),
    animations: [], // Figma doesn't have built-in animation tokens
    version: '1.0.0',
    lastUpdated: new Date().toISOString()
  };

  return tokens;
}

async function extractColorTokensWithVariables(): Promise<ColorToken[]> {
  const colors: ColorToken[] = [];
  
  // Try to extract from Variables API first
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    console.log('📊 Variable collections found:', collections.length);
    
    for (const collection of collections) {
      const variableIds = collection.variableIds;
      
      for (const variableId of variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        
        if (variable && variable.resolvedType === 'COLOR') {
          // Extract color values for each mode
          const modes = Object.keys(variable.valuesByMode);
          
          for (const modeId of modes) {
            const value = variable.valuesByMode[modeId];
            
            if (typeof value === 'object' && 'r' in value) {
              const mode = collection.modes.find(m => m.modeId === modeId);
              const modeName = mode ? mode.name : 'default';
              const tokenName = modeName === 'default' ? variable.name : `${variable.name}/${modeName}`;
              
              colors.push({
                name: tokenName,
                value: rgbToHex(value.r, value.g, value.b, value.a || 1),
                rgb: {
                  r: Math.round(value.r * 255),
                  g: Math.round(value.g * 255),
                  b: Math.round(value.b * 255),
                  a: value.a || 1
                },
                description: variable.description || '',
                category: categorizeColor(variable.name),
                variableId: variable.id,
                collectionId: collection.id,
                mode: modeName
              } as any);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Variables API not available or error accessing variables:', error);
  }
  
  // Fallback to legacy paint styles if no variables found
  if (colors.length === 0) {
    console.log('🎨 No variables found, checking legacy paint styles...');
    const paintStyles = await figma.getLocalPaintStylesAsync();
    console.log('🖌️ Paint styles found:', paintStyles.length);
    
    for (const style of paintStyles) {
      const paint = style.paints[0];
      if (paint && paint.type === 'SOLID') {
        const { r, g, b } = paint.color;
        const opacity = paint.opacity || 1;
        
        colors.push({
          name: style.name,
          value: rgbToHex(r, g, b, opacity),
          rgb: {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
            a: opacity
          },
          description: style.description,
          category: categorizeColor(style.name)
        });
      }
    }
  }

  return colors;
}

async function extractSpacingTokensWithVariables(): Promise<SpacingToken[]> {
  const spacing: SpacingToken[] = [];
  
  // Try to extract from Variables API
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    
    for (const collection of collections) {
      const variableIds = collection.variableIds;
      
      for (const variableId of variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        
        if (variable && variable.resolvedType === 'FLOAT' && 
            (variable.name.toLowerCase().includes('spacing') || 
             variable.name.toLowerCase().includes('space') ||
             variable.name.toLowerCase().includes('gap') ||
             variable.name.toLowerCase().includes('padding') ||
             variable.name.toLowerCase().includes('margin'))) {
          
          const modes = Object.keys(variable.valuesByMode);
          
          for (const modeId of modes) {
            const value = variable.valuesByMode[modeId];
            
            if (typeof value === 'number') {
              const mode = collection.modes.find(m => m.modeId === modeId);
              const modeName = mode ? mode.name : 'default';
              const tokenName = modeName === 'default' ? variable.name : `${variable.name}/${modeName}`;
              
              spacing.push({
                name: tokenName,
                value: value,
                scale: value / 4, // Assuming base unit of 4
                description: variable.description || `${value}px spacing`,
                variableId: variable.id,
                collectionId: collection.id,
                mode: modeName
              } as any);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error accessing spacing variables:', error);
  }
  
  // Fallback to extracting from auto-layout frames if no variables
  if (spacing.length === 0) {
    const frames = figma.currentPage.findAll(node => 
      node.type === 'FRAME' && 'layoutMode' in node && node.layoutMode !== 'NONE'
    ) as FrameNode[];

    const spacingValues = new Set<number>();
    
    frames.forEach(frame => {
      if (frame.itemSpacing) {
        spacingValues.add(frame.itemSpacing);
      }
      if ('paddingTop' in frame) {
        spacingValues.add(frame.paddingTop);
        spacingValues.add(frame.paddingRight);
        spacingValues.add(frame.paddingBottom);
        spacingValues.add(frame.paddingLeft);
      }
    });

    Array.from(spacingValues).sort((a, b) => a - b).forEach((value, index) => {
      spacing.push({
        name: `spacing-${index}`,
        value: value,
        scale: value / 4,
        description: `${value}px spacing`
      });
    });
  }

  return spacing;
}

async function extractBorderRadiusTokensWithVariables(): Promise<any[]> {
  const borderRadii: any[] = [];
  
  // Try to extract from Variables API
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    
    for (const collection of collections) {
      const variableIds = collection.variableIds;
      
      for (const variableId of variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        
        if (variable && variable.resolvedType === 'FLOAT' && 
            (variable.name.toLowerCase().includes('radius') || 
             variable.name.toLowerCase().includes('corner') ||
             variable.name.toLowerCase().includes('round'))) {
          
          const modes = Object.keys(variable.valuesByMode);
          
          for (const modeId of modes) {
            const value = variable.valuesByMode[modeId];
            
            if (typeof value === 'number') {
              const mode = collection.modes.find(m => m.modeId === modeId);
              const modeName = mode ? mode.name : 'default';
              const tokenName = modeName === 'default' ? variable.name : `${variable.name}/${modeName}`;
              
              borderRadii.push({
                name: tokenName,
                value: value,
                description: variable.description || `${value}px border radius`,
                variableId: variable.id,
                collectionId: collection.id,
                mode: modeName
              } as any);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error accessing border radius variables:', error);
  }
  
  // Fallback to extracting from components
  if (borderRadii.length === 0) {
    const components = figma.currentPage.findAll(node => node.type === 'COMPONENT');
    const radiusValues = new Set<number>();
    
    components.forEach(component => {
      if ('cornerRadius' in component && typeof component.cornerRadius === 'number') {
        radiusValues.add(component.cornerRadius);
      }
    });

    Array.from(radiusValues).sort((a, b) => a - b).forEach((value, index) => {
      borderRadii.push({
        name: `radius-${index}`,
        value: value,
        description: `${value}px border radius`
      });
    });
  }

  return borderRadii;
}

// Keep existing helper functions
async function extractTypographyTokens(): Promise<TypographyToken[]> {
  const typography: TypographyToken[] = [];
  const textStyles = await figma.getLocalTextStylesAsync();
  console.log('📝 Text styles found:', textStyles.length);

  for (const style of textStyles) {
    typography.push({
      name: style.name,
      fontFamily: style.fontName.family,
      fontSize: style.fontSize,
      fontWeight: mapFontWeight(style.fontName.style),
      lineHeight: style.lineHeight.unit === 'AUTO' ? 'auto' : style.lineHeight.value,
      letterSpacing: style.letterSpacing.value,
      textTransform: detectTextTransform(style),
      description: style.description
    });
  }

  return typography;
}

async function extractShadowTokens(): Promise<ShadowToken[]> {
  const shadows: ShadowToken[] = [];
  const effectStyles = await figma.getLocalEffectStylesAsync();
  console.log('🌑 Effect styles found:', effectStyles.length);

  for (const style of effectStyles) {
    const shadowEffects = style.effects.filter(effect => 
      effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW'
    );

    if (shadowEffects.length > 0) {
      shadows.push({
        name: style.name,
        value: shadowEffects.map(effect => ({
          color: rgbToHex(effect.color.r, effect.color.g, effect.color.b, effect.color.a),
          offset: { x: effect.offset.x, y: effect.offset.y },
          radius: effect.radius,
          spread: effect.spread || 0,
          opacity: effect.color.a
        })),
        description: style.description
      });
    }
  }

  return shadows;
}

// Helper functions
function rgbToHex(r: number, g: number, b: number, a: number = 1): string {
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a < 1 ? `${hex}${toHex(a)}` : hex;
}

function mapFontWeight(style: string): number {
  const weightMap: { [key: string]: number } = {
    'Thin': 100,
    'ExtraLight': 200,
    'Light': 300,
    'Regular': 400,
    'Medium': 500,
    'SemiBold': 600,
    'Bold': 700,
    'ExtraBold': 800,
    'Black': 900
  };

  for (const [key, value] of Object.entries(weightMap)) {
    if (style.includes(key)) {
      return value;
    }
  }

  return 400; // Default to regular
}

function detectTextTransform(style: TextStyle): 'none' | 'uppercase' | 'lowercase' | 'capitalize' {
  const name = style.name.toLowerCase();
  if (name.includes('uppercase') || name.includes('caps')) return 'uppercase';
  if (name.includes('lowercase')) return 'lowercase';
  if (name.includes('capitalize') || name.includes('title')) return 'capitalize';
  return 'none';
}

function categorizeColor(name: string): ColorToken['category'] {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('primary')) return 'primary';
  if (lowerName.includes('secondary')) return 'secondary';
  if (lowerName.includes('accent')) return 'accent';
  if (lowerName.includes('success') || lowerName.includes('green')) return 'success';
  if (lowerName.includes('warning') || lowerName.includes('yellow') || lowerName.includes('orange')) return 'warning';
  if (lowerName.includes('danger') || lowerName.includes('error') || lowerName.includes('red')) return 'danger';
  if (lowerName.includes('info') || lowerName.includes('blue')) return 'info';
  return 'neutral';
}