/**
 * Atomic Token Applier for Figma
 * Applies design tokens to Figma using Variables API for atomic design
 */

import { UnifiedTokens, FigmaVariableCollection } from '../../extractors/unified-token-mapper';
import { formatError, createUserMessage, FontErrors, VariableErrors, ColorErrors } from '../../utils/error-messages';
import { processSequentially, processLargeCollection, FigmaBatchOperations, createYieldController } from '../../utils/batch-processor';
import { getFigmaFontInfo, loadFontWithFallbacks, createFontLoader, FontInfo } from '../../utils/font-manager';

interface VariableInfo {
  id: string;
  key: string;
  name: string;
  variableCollectionId: string;
}

/**
 * Create or update a variable collection in Figma
 */
async function createOrUpdateVariableCollection(
  collection: FigmaVariableCollection,
  existingCollections: VariableCollection[]
): Promise<VariableCollection> {
  // Check if collection already exists
  const existing = existingCollections.find(c => c.name === collection.name);
  
  if (existing) {
    console.log(`📝 Updating existing collection: ${collection.name}`);
    return existing;
  }
  
  console.log(`✨ Creating new collection: ${collection.name}`);
  const newCollection = figma.variables.createVariableCollection(collection.name);
  
  // Set up modes - Limited to 1 mode in free plan
  const defaultModeId = newCollection.modes[0].modeId;
  
  // Rename default mode
  if (collection.modes.length > 0) {
    newCollection.renameMode(defaultModeId, collection.modes[0].name);
  }
  
  // Note: Additional modes require paid Figma plan
  if (collection.modes.length > 1) {
    console.warn(`⚠️ ${collection.name}: Multiple modes (${collection.modes.length}) requested but limited to 1 mode in free plan.`);
    console.log('💡 To use multiple modes, upgrade your Figma plan or create separate collections.');
  }
  
  return newCollection;
}

/**
 * Create or update variables in a collection
 */
async function createOrUpdateVariables(
  collection: FigmaVariableCollection,
  collectionId: string,
  variableCollection: VariableCollection
): Promise<VariableInfo[]> {
  if (!variableCollection) {
    throw new Error(createUserMessage(
      VariableErrors.collectionNotFound(collection.name),
      'Variable collection operation failed'
    ));
  }
  
  const variableInfos: VariableInfo[] = [];
  const existingVariables = await figma.variables.getLocalVariablesAsync();
  
  // Process variables in batches to prevent freezing
  const processedVariables = await processSequentially(
    collection.variables,
    async (variableConfig) => {
      try {
        // Send progress update
        figma.ui.postMessage({
          type: 'SYNC_ITEM_UPDATE',
          data: { 
            category: collection.name, 
            name: variableConfig.name, 
            status: 'in_progress' 
          }
        });
        
        // Check if variable exists
        const existingVar = existingVariables.find(
          v => v.name === variableConfig.name && v.variableCollectionId === collectionId
        );
        
        let variable: Variable;
        
        if (existingVar) {
          console.log(`📝 Updating variable: ${variableConfig.name}`);
          variable = existingVar;
        } else {
          console.log(`✨ Creating variable: ${variableConfig.name}`);
          variable = figma.variables.createVariable(
            variableConfig.name,
            variableCollection,
            variableConfig.type
          );
          
          // Set scopes only for new variables
          if (variableConfig.scopes && variable.scopes) {
            try {
              variable.scopes = variableConfig.scopes as any;
            } catch (scopeError) {
              const enhancedError = formatError(scopeError);
              console.warn(`⚠️ Could not set scopes for ${variableConfig.name}:`, enhancedError.message);
            }
          }
        }
        
        // Set values for each mode
        const modes = variableCollection.modes;
        // For free plan, we only have one mode - use the first value
        const mode = modes[0]; // Use the default/only mode
        const firstValue = Object.values(variableConfig.valuesByMode)[0];
        
        if (mode && firstValue !== undefined) {
          try {
            if (variableConfig.type === 'COLOR' && typeof firstValue === 'object') {
              // Convert RGB to Figma color format
              const color: RGB = {
                r: firstValue.r !== undefined ? firstValue.r / 255 : 0,
                g: firstValue.g !== undefined ? firstValue.g / 255 : 0,
                b: firstValue.b !== undefined ? firstValue.b / 255 : 0
              };
              variable.setValueForMode(mode.modeId, color);
            } else {
              variable.setValueForMode(mode.modeId, firstValue);
            }
          } catch (error) {
            const enhancedError = formatError(error);
            console.error(`Failed to set value for ${variableConfig.name}:`, enhancedError.message);
            if (enhancedError.fix) {
              console.log(`💡 Fix: ${enhancedError.fix}`);
            }
          }
        }
        
        // Set description
        if (variableConfig.description) {
          variable.description = variableConfig.description;
        }
        
        const variableInfo = {
          id: variable.id,
          key: variable.key,
          name: variable.name,
          variableCollectionId: variable.variableCollectionId
        };
        
        variableInfos.push(variableInfo);
        
        // Send completion update
        figma.ui.postMessage({
          type: 'SYNC_ITEM_UPDATE',
          data: { 
            category: collection.name, 
            name: variableConfig.name, 
            status: 'completed' 
          }
        });
        
        return variableInfo;
        
      } catch (error) {
        const enhancedError = formatError(error);
        console.error(`Failed to create/update variable ${variableConfig.name}:`, enhancedError.message);
        
        // Send failure update with enhanced error message
        figma.ui.postMessage({
          type: 'SYNC_ITEM_UPDATE',
          data: { 
            category: collection.name, 
            name: variableConfig.name, 
            status: 'failed',
            error: createUserMessage(enhancedError)
          }
        });
        
        return null; // Return null for failed items
      }
    },
    {
      batchSize: 5,
      delayMs: 10,
      onProgress: (progress, total) => {
        console.log(`Processing variables: ${progress}/${total}`);
      }
    }
  );
  
  return variableInfos;
}

/**
 * Apply typography text styles
 */
async function applyTypographyStyles(typographyStyles: any[]): Promise<void> {
  // Create font loader with fallbacks
  const fontLoader = createFontLoader(['Inter', 'Helvetica Neue', 'Arial']);
  
  // Collect all unique font combinations
  const fontsToLoad: FontInfo[] = [];
  const uniqueFonts = new Map<string, FontInfo>();
  
  for (const style of typographyStyles) {
    // Get font info from style - support custom font families
    const fontFamily = style.fontFamily || (style.fontName && style.fontName.family) || 'Inter';
    const fontInfo = getFigmaFontInfo(
      fontFamily,
      style.fontWeight || 400,
      style.fontStyle === 'italic'
    );
    
    const key = `${fontInfo.family}:${fontInfo.style}`;
    if (!uniqueFonts.has(key)) {
      uniqueFonts.set(key, fontInfo);
      fontsToLoad.push(fontInfo);
    }
  }
  
  // Load fonts in batches with fallback support
  console.log(`📋 Loading ${fontsToLoad.length} font variations...`);
  const loadedFonts = new Map<string, FontInfo>();
  
  await processSequentially(
    fontsToLoad,
    async (fontInfo) => {
      const loaded = await fontLoader(fontInfo);
      loadedFonts.set(`${fontInfo.family}:${fontInfo.style}`, loaded);
      return loaded;
    },
    {
      batchSize: 3,
      delayMs: 10,
      onProgress: (progress, total) => {
        console.log(`Loading fonts: ${progress}/${total}`);
      }
    }
  );
  
  // Get existing text styles
  const existingStyles = await figma.getLocalTextStylesAsync();
  
  // Process text styles in batches
  await processSequentially(
    typographyStyles,
    async (style) => {
      try {
      // Send progress update
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { 
          category: 'Typography', 
          name: style.name, 
          status: 'in_progress' 
        }
      });
      
      const existing = existingStyles.find(s => s.name === style.name);
      
      let textStyle: TextStyle;
      if (existing) {
        console.log(`📝 Updating text style: ${style.name}`);
        textStyle = existing;
      } else {
        console.log(`✨ Creating text style: ${style.name}`);
        textStyle = figma.createTextStyle();
        textStyle.name = style.name;
      }
      
      // Apply properties with custom font support
      const fontFamily = style.fontFamily || (style.fontName && style.fontName.family) || 'Inter';
      const originalFontInfo = getFigmaFontInfo(
        fontFamily,
        style.fontWeight || 400,
        style.fontStyle === 'italic'
      );
      
      // Get the loaded font (might be a fallback)
      const loadedFont = loadedFonts.get(`${originalFontInfo.family}:${originalFontInfo.style}`) || {
        family: 'Inter',
        style: 'Regular'
      };
      
      const fontName = { family: loadedFont.family, style: loadedFont.style };
      
      try {
        textStyle.fontSize = style.fontSize;
        textStyle.fontName = fontName;
        textStyle.lineHeight = style.lineHeight;
        textStyle.letterSpacing = style.letterSpacing;
        textStyle.textCase = style.textCase || 'ORIGINAL';
        textStyle.textDecoration = style.textDecoration || 'NONE';
        
        if (style.description) {
          textStyle.description = style.description;
        }
        
        // Send completion update
        figma.ui.postMessage({
          type: 'SYNC_ITEM_UPDATE',
          data: { 
            category: 'Typography', 
            name: style.name, 
            status: 'completed' 
          }
        });
      } catch (error) {
        const enhancedError = formatError(error);
        console.error(`❌ Error applying properties to ${style.name}:`, enhancedError.message);
        if (enhancedError.fix) {
          console.log(`💡 Fix: ${enhancedError.fix}`);
        }
        // Try with Regular font as fallback
        try {
          textStyle.fontName = { family: loadedFont.family, style: "Regular" };
          textStyle.fontSize = style.fontSize;
          textStyle.lineHeight = style.lineHeight;
          textStyle.letterSpacing = style.letterSpacing;
          textStyle.textCase = style.textCase || 'ORIGINAL';
          textStyle.textDecoration = style.textDecoration || 'NONE';
          
          // Send completion with warning
          figma.ui.postMessage({
            type: 'SYNC_ITEM_UPDATE',
            data: { 
              category: 'Typography', 
              name: style.name, 
              status: 'completed' 
            }
          });
        } catch (fallbackError) {
          console.error(`❌ Could not apply text style ${style.name} even with fallback`);
          
          // Send failure update
          figma.ui.postMessage({
            type: 'SYNC_ITEM_UPDATE',
            data: { 
              category: 'Typography', 
              name: style.name, 
              status: 'failed',
              error: createUserMessage(FontErrors.unloadedFont(fontFamily), 'Failed to apply text style')
            }
          });
        }
      }
    } catch (error) {
      const enhancedError = formatError(error);
      console.error(`❌ Error processing text style ${style.name}:`, enhancedError.message);
      
      // Send failure update with enhanced error message
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { 
          category: 'Typography', 
          name: style.name, 
          status: 'failed',
          error: createUserMessage(enhancedError)
        }
      });
    }
  },
  {
    batchSize: 5,
    delayMs: 10,
    onProgress: (progress, total) => {
      console.log(`Processing typography: ${progress}/${total}`);
    }
  });
}

/**
 * Map font weight to font style
 */
function getFontStyle(weight?: number): string {
  if (!weight) return "Regular";
  
  // Inter font has specific style names in Figma
  // Inter requires spaces in certain weight names
  const weightMap: Record<number, string> = {
    100: "Thin",
    200: "Extra Light", // Space required
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "Semi Bold", // Space required
    700: "Bold",
    800: "Extra Bold", // Space required
    900: "Black"
  };
  
  return weightMap[weight] || "Regular";
}

/**
 * Apply shadow effect styles
 */
async function applyShadowStyles(shadowEffects: any[]): Promise<void> {
  const existingStyles = await figma.getLocalEffectStylesAsync();
  
  // Process shadow styles in batches
  await processSequentially(
    shadowEffects,
    async (shadow) => {
      try {
      // Send progress update
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { 
          category: 'Shadows', 
          name: shadow.name, 
          status: 'in_progress' 
        }
      });
      
      const existing = existingStyles.find(s => s.name === shadow.name);
      
      let effectStyle: EffectStyle;
      if (existing) {
        console.log(`📝 Updating effect style: ${shadow.name}`);
        effectStyle = existing;
      } else {
        console.log(`✨ Creating effect style: ${shadow.name}`);
        effectStyle = figma.createEffectStyle();
        effectStyle.name = shadow.name;
      }
      
      // Apply effects
      effectStyle.effects = shadow.effects;
      
      if (shadow.description) {
        effectStyle.description = shadow.description;
      }
      
      // Send completion update
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { 
          category: 'Shadows', 
          name: shadow.name, 
          status: 'completed' 
        }
      });
      
    } catch (error) {
      const enhancedError = formatError(error);
      console.error(`❌ Error processing shadow style ${shadow.name}:`, enhancedError.message);
      
      // Send failure update with enhanced error message
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { 
          category: 'Shadows', 
          name: shadow.name, 
          status: 'failed',
          error: createUserMessage(enhancedError)
        }
      });
    }
  },
  {
    batchSize: 5,
    delayMs: 10,
    onProgress: (progress, total) => {
      console.log(`Processing shadows: ${progress}/${total}`);
    }
  });
}

/**
 * Main function to apply all tokens to Figma
 */
export async function applyTokensToFigmaAtomic(tokens: UnifiedTokens): Promise<void> {
  const startTime = Date.now();
  const yieldController = createYieldController(100); // Yield every 100ms
  
  try {
    console.log('🚀 Starting atomic token application to Figma...');
    
    // Send initial progress update
    figma.ui.postMessage({
      type: 'BATCH_OPERATION_START',
      data: { 
        message: 'Preparing to apply design tokens...',
        totalCategories: [
          tokens.colors ? 'Colors' : null,
          tokens.spacing ? 'Spacing' : null,
          tokens.typography && tokens.typography.length ? 'Typography' : null,
          tokens.effects && tokens.effects.shadows && tokens.effects.shadows.length ? 'Shadows' : null,
          tokens.effects && tokens.effects.borderRadius && tokens.effects.borderRadius.length ? 'Border Radius' : null
        ].filter(Boolean).length
      }
    });
    
    // Get existing collections
    const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
    
    // Apply color variables
    if (tokens.colors) {
      console.log('🎨 Applying color variables...');
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { category: 'Colors', name: 'Color Collection', status: 'in_progress' }
      });
      
      const colorCollection = await createOrUpdateVariableCollection(
        tokens.colors,
        existingCollections
      );
      await createOrUpdateVariables(tokens.colors, colorCollection.id, colorCollection);
      
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { category: 'Colors', name: 'Color Collection', status: 'completed' }
      });
    }
    
    // Apply spacing variables
    if (tokens.spacing) {
      console.log('📏 Applying spacing variables...');
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { category: 'Spacing', name: 'Spacing Collection', status: 'in_progress' }
      });
      
      const spacingCollection = await createOrUpdateVariableCollection(
        tokens.spacing,
        existingCollections
      );
      await createOrUpdateVariables(tokens.spacing, spacingCollection.id, spacingCollection);
      
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { category: 'Spacing', name: 'Spacing Collection', status: 'completed' }
      });
    }
    
    // Apply typography styles
    if (tokens.typography && tokens.typography.length > 0) {
      console.log('📝 Applying typography styles...');
      await applyTypographyStyles(tokens.typography);
    }
    
    // Apply effect styles
    if (tokens.effects) {
      if (tokens.effects.shadows && tokens.effects.shadows.length > 0) {
        console.log('🌑 Applying shadow styles...');
        await applyShadowStyles(tokens.effects.shadows);
      }
      
      // Border radius could be added as variables
      if (tokens.effects.borderRadius && tokens.effects.borderRadius.length > 0) {
        console.log('⭕ Applying border radius variables...');
        figma.ui.postMessage({
          type: 'SYNC_ITEM_UPDATE',
          data: { category: 'Border Radius', name: 'Border Radius Collection', status: 'in_progress' }
        });
        
        // Create a border radius collection
        const borderRadiusCollection: FigmaVariableCollection = {
          name: 'Border Radius',
          modes: [{ name: 'Default', modeId: 'default' }],
          variables: tokens.effects.borderRadius.map(br => ({
            name: br.name,
            type: 'FLOAT' as const,
            valuesByMode: { default: br.value },
            scopes: br.scopes,
            description: br.description
          }))
        };
        
        const brCollection = await createOrUpdateVariableCollection(
          borderRadiusCollection,
          existingCollections
        );
        await createOrUpdateVariables(borderRadiusCollection, brCollection.id, brCollection);
        
        figma.ui.postMessage({
          type: 'SYNC_ITEM_UPDATE',
          data: { category: 'Border Radius', name: 'Border Radius Collection', status: 'completed' }
        });
      }
    }
    
    console.log('✅ All tokens applied successfully!');
    
    // Calculate duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
    
    // Notify UI of completion
    figma.ui.postMessage({
      type: 'SYNC_COMPLETE',
      data: {
        collections: ['Colors', 'Spacing', 'Typography', 'Effects'],
        timestamp: new Date().toISOString(),
        duration
      }
    });
    
  } catch (error) {
    console.error('❌ Error applying tokens:', error);
    figma.ui.postMessage({
      type: 'ERROR',
      data: {
        message: error instanceof Error ? error.message : 'Failed to apply tokens',
        details: error
      }
    });
  }
}

/**
 * Extract current Figma variables and styles back to code format
 */
export async function extractFigmaTokensToCode(): Promise<any> {
  try {
    console.log('🔍 Extracting tokens from Figma...');
    
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const variables = await figma.variables.getLocalVariablesAsync();
    const textStyles = await figma.getLocalTextStylesAsync();
    const effectStyles = await figma.getLocalEffectStylesAsync();
    
    // Group variables by collection
    const tokensByCollection: Record<string, any[]> = {};
    
    for (const collection of collections) {
      const collectionVars = variables.filter(v => v.variableCollectionId === collection.id);
      tokensByCollection[collection.name] = collectionVars.map(v => ({
        name: v.name,
        type: v.resolvedType,
        values: collection.modes.reduce((acc, mode) => {
          try {
            acc[mode.name] = v.valuesByMode[mode.modeId];
          } catch (e) {
            // Some modes might not have values
          }
          return acc;
        }, {} as Record<string, any>)
      }));
    }
    
    return {
      variables: tokensByCollection,
      textStyles: textStyles.map(style => ({
        name: style.name,
        fontSize: style.fontSize,
        fontFamily: style.fontName.family,
        fontWeight: getWeightFromStyle(style.fontName.style),
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing
      })),
      effectStyles: effectStyles.map(style => ({
        name: style.name,
        effects: style.effects
      }))
    };
    
  } catch (error) {
    console.error('❌ Error extracting tokens:', error);
    throw error;
  }
}

/**
 * Get numeric weight from style name
 */
function getWeightFromStyle(style: string): number {
  const styleMap: Record<string, number> = {
    "Thin": 100,
    "Extra Light": 200,
    "ExtraLight": 200, // Support both formats
    "Light": 300,
    "Regular": 400,
    "Medium": 500,
    "Semi Bold": 600,
    "SemiBold": 600, // Support both formats
    "Bold": 700,
    "Extra Bold": 800,
    "ExtraBold": 800, // Support both formats
    "Black": 900
  };
  
  return styleMap[style] || 400;
}