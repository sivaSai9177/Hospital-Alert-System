/**
 * Component Importer for Figma Plugin
 * Creates Figma components from code definitions
 */

import { ComponentDefinition } from '../../types/messages';
import { UnifiedTokens } from '../../extractors/unified-token-mapper';
import { formatError, createUserMessage } from '../../utils/error-messages';
import { applyTokensToFigmaAtomic } from './token-applier-atomic';

interface ImportResult {
  component: ComponentNode;
  variants?: ComponentNode[];
  instances?: InstanceNode[];
}

/**
 * Import multiple components into Figma
 */
export async function importComponents(
  definitions: ComponentDefinition[],
  tokens?: UnifiedTokens
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  console.log(`📦 Importing ${definitions.length} components...`);
  
  // Send initial progress
  figma.ui.postMessage({
    type: 'BATCH_OPERATION_START',
    data: { 
      message: `Importing ${definitions.length} components...`,
      totalItems: definitions.length
    }
  });
  
  for (let i = 0; i < definitions.length; i++) {
    const definition = definitions[i];
    
    try {
      // Send progress update
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { 
          category: 'Components', 
          name: definition.name, 
          status: 'in_progress',
          progress: i + 1,
          total: definitions.length
        }
      });
      
      const result = await importSingleComponent(definition, tokens);
      results.push(result);
      
      // Send completion update
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { 
          category: 'Components', 
          name: definition.name, 
          status: 'completed' 
        }
      });
      
    } catch (error) {
      const enhancedError = formatError(error);
      console.error(`Failed to import ${definition.name}:`, enhancedError.message);
      
      // Send failure update
      figma.ui.postMessage({
        type: 'SYNC_ITEM_UPDATE',
        data: { 
          category: 'Components', 
          name: definition.name, 
          status: 'failed',
          error: createUserMessage(enhancedError)
        }
      });
    }
  }
  
  console.log(`✅ Imported ${results.length}/${definitions.length} components successfully`);
  
  return results;
}

/**
 * Import a single component
 */
async function importSingleComponent(
  definition: ComponentDefinition,
  globalTokens?: UnifiedTokens
): Promise<ImportResult> {
  console.log(`🔨 Creating component: ${definition.name}`);
  
  const component = await createBaseComponent(definition);
  const result: ImportResult = { component };
  
  // Apply tokens if provided
  const tokens = definition.tokens || globalTokens;
  if (tokens) {
    await applyComponentTokens(component, tokens, definition.type);
  }
  
  // Create variants if defined
  if (definition.variants) {
    result.variants = await createComponentVariants(component, definition.variants, tokens);
  }
  
  // Create example instances
  result.instances = await createExampleInstances(component, definition.variants);
  
  return result;
}

/**
 * Create base component structure
 */
async function createBaseComponent(definition: ComponentDefinition): Promise<ComponentNode> {
  const component = figma.createComponent();
  component.name = definition.name;
  
  // Set dimensions
  const width = definition.dimensions?.width || getDefaultWidth(definition.type);
  const height = definition.dimensions?.height || getDefaultHeight(definition.type);
  component.resize(width, height);
  
  // Apply base structure based on type
  switch (definition.type) {
    case 'button':
      await createButtonStructure(component, definition);
      break;
    case 'input':
      await createInputStructure(component, definition);
      break;
    case 'card':
      await createCardStructure(component, definition);
      break;
    case 'badge':
      await createBadgeStructure(component, definition);
      break;
    case 'avatar':
      await createAvatarStructure(component, definition);
      break;
    case 'dialog':
      await createDialogStructure(component, definition);
      break;
    default:
      await createCustomStructure(component, definition);
  }
  
  return component;
}

/**
 * Create button component structure
 */
async function createButtonStructure(component: ComponentNode, definition: ComponentDefinition): Promise<void> {
  // Set up auto-layout
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';
  component.paddingLeft = 16;
  component.paddingRight = 16;
  component.paddingTop = 8;
  component.paddingBottom = 8;
  component.itemSpacing = 8;
  
  // Add corner radius
  component.cornerRadius = 6;
  
  // Default fills
  component.fills = [{
    type: 'SOLID',
    color: { r: 0.345, g: 0.411, b: 0.957 } // Primary blue
  }];
  
  // Add text
  const text = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  text.fontName = { family: "Inter", style: "Medium" };
  text.fontSize = 14;
  text.characters = "Button";
  text.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 }
  }];
  
  component.appendChild(text);
  
  // Add properties
  component.description = definition.properties?.description || "Button component";
}

/**
 * Create input component structure
 */
async function createInputStructure(component: ComponentNode, definition: ComponentDefinition): Promise<void> {
  // Set up auto-layout
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'MIN';
  component.paddingLeft = 12;
  component.paddingRight = 12;
  component.paddingTop = 8;
  component.paddingBottom = 8;
  
  // Add corner radius
  component.cornerRadius = 4;
  
  // Background
  component.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 }
  }];
  
  // Border
  component.strokes = [{
    type: 'SOLID',
    color: { r: 0.8, g: 0.8, b: 0.8 }
  }];
  component.strokeWeight = 1;
  
  // Add placeholder text
  const placeholder = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  placeholder.fontName = { family: "Inter", style: "Regular" };
  placeholder.fontSize = 14;
  placeholder.characters = "Placeholder text...";
  placeholder.fills = [{
    type: 'SOLID',
    color: { r: 0.6, g: 0.6, b: 0.6 }
  }];
  placeholder.opacity = 0.6;
  
  component.appendChild(placeholder);
  
  component.description = definition.properties?.description || "Input field component";
}

/**
 * Create card component structure
 */
async function createCardStructure(component: ComponentNode, definition: ComponentDefinition): Promise<void> {
  // Set up auto-layout
  component.layoutMode = 'VERTICAL';
  component.primaryAxisAlignItems = 'MIN';
  component.counterAxisAlignItems = 'MIN';
  component.paddingLeft = 16;
  component.paddingRight = 16;
  component.paddingTop = 16;
  component.paddingBottom = 16;
  component.itemSpacing = 12;
  
  // Add corner radius
  component.cornerRadius = 8;
  
  // Background
  component.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 }
  }];
  
  // Shadow
  component.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 2 },
    radius: 4,
    visible: true,
    blendMode: 'NORMAL'
  }];
  
  // Add header
  const header = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  header.fontName = { family: "Inter", style: "Medium" };
  header.fontSize = 16;
  header.characters = "Card Title";
  header.fills = [{
    type: 'SOLID',
    color: { r: 0.1, g: 0.1, b: 0.1 }
  }];
  
  // Add content
  const content = figma.createText();
  content.fontName = { family: "Inter", style: "Regular" };
  content.fontSize = 14;
  content.characters = "Card content goes here";
  content.fills = [{
    type: 'SOLID',
    color: { r: 0.4, g: 0.4, b: 0.4 }
  }];
  
  component.appendChild(header);
  component.appendChild(content);
  
  component.description = definition.properties?.description || "Card component";
}

/**
 * Create badge component structure
 */
async function createBadgeStructure(component: ComponentNode, definition: ComponentDefinition): Promise<void> {
  // Set up auto-layout
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';
  component.paddingLeft = 8;
  component.paddingRight = 8;
  component.paddingTop = 2;
  component.paddingBottom = 2;
  
  // Full corner radius for pill shape
  component.cornerRadius = 100;
  
  // Default fills
  component.fills = [{
    type: 'SOLID',
    color: { r: 0.9, g: 0.9, b: 0.9 }
  }];
  
  // Add text
  const text = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  text.fontName = { family: "Inter", style: "Medium" };
  text.fontSize = 12;
  text.characters = "Badge";
  text.fills = [{
    type: 'SOLID',
    color: { r: 0.3, g: 0.3, b: 0.3 }
  }];
  
  component.appendChild(text);
  
  component.description = definition.properties?.description || "Badge component";
}

/**
 * Create avatar component structure
 */
async function createAvatarStructure(component: ComponentNode, definition: ComponentDefinition): Promise<void> {
  // Make it circular
  const size = component.width;
  component.cornerRadius = size / 2;
  
  // Default fills (gradient)
  component.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { position: 0, color: { r: 0.6, g: 0.7, b: 0.9, a: 1 } },
      { position: 1, color: { r: 0.4, g: 0.5, b: 0.8, a: 1 } }
    ]
  }];
  
  // Add initials
  const initials = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  initials.fontName = { family: "Inter", style: "Medium" };
  initials.fontSize = size * 0.4;
  initials.characters = "AB";
  initials.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 }
  }];
  initials.textAlignHorizontal = 'CENTER';
  initials.textAlignVertical = 'CENTER';
  initials.resize(size, size);
  
  component.appendChild(initials);
  
  component.description = definition.properties?.description || "Avatar component";
}

/**
 * Create dialog component structure
 */
async function createDialogStructure(component: ComponentNode, definition: ComponentDefinition): Promise<void> {
  // Set up auto-layout
  component.layoutMode = 'VERTICAL';
  component.primaryAxisAlignItems = 'MIN';
  component.counterAxisAlignItems = 'MIN';
  component.paddingLeft = 24;
  component.paddingRight = 24;
  component.paddingTop = 24;
  component.paddingBottom = 24;
  component.itemSpacing = 16;
  
  // Add corner radius
  component.cornerRadius = 12;
  
  // Background
  component.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 }
  }];
  
  // Shadow
  component.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 16,
    visible: true,
    blendMode: 'NORMAL'
  }];
  
  // Add header
  const header = figma.createFrame();
  header.layoutMode = 'HORIZONTAL';
  header.counterAxisAlignItems = 'CENTER';
  header.primaryAxisSizingMode = 'FIXED';
  header.resize(component.width - 48, 32);
  
  const title = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  title.fontName = { family: "Inter", style: "Medium" };
  title.fontSize = 18;
  title.characters = "Dialog Title";
  header.appendChild(title);
  
  // Add content
  const content = figma.createText();
  content.fontName = { family: "Inter", style: "Regular" };
  content.fontSize = 14;
  content.characters = "Dialog content goes here";
  content.resize(component.width - 48, 40);
  
  // Add actions
  const actions = figma.createFrame();
  actions.layoutMode = 'HORIZONTAL';
  actions.primaryAxisAlignItems = 'MAX';
  actions.counterAxisAlignItems = 'CENTER';
  actions.itemSpacing = 12;
  actions.primaryAxisSizingMode = 'FIXED';
  actions.resize(component.width - 48, 32);
  
  component.appendChild(header);
  component.appendChild(content);
  component.appendChild(actions);
  
  component.description = definition.properties?.description || "Dialog component";
}

/**
 * Create custom component structure
 */
async function createCustomStructure(component: ComponentNode, definition: ComponentDefinition): Promise<void> {
  // Basic frame with auto-layout
  component.layoutMode = 'VERTICAL';
  component.primaryAxisAlignItems = 'MIN';
  component.counterAxisAlignItems = 'MIN';
  component.paddingLeft = 16;
  component.paddingRight = 16;
  component.paddingTop = 16;
  component.paddingBottom = 16;
  component.itemSpacing = 8;
  
  // Default background
  component.fills = [{
    type: 'SOLID',
    color: { r: 0.95, g: 0.95, b: 0.95 }
  }];
  
  component.description = definition.properties?.description || "Custom component";
}

/**
 * Apply tokens to component
 */
async function applyComponentTokens(
  component: ComponentNode,
  tokens: UnifiedTokens,
  type: string
): Promise<void> {
  // This would integrate with the token applier to apply appropriate tokens
  // based on component type
  console.log(`🎨 Applying tokens to ${type} component`);
  
  // For now, we'll apply some basic tokens
  // In a full implementation, this would map component types to specific tokens
}

/**
 * Create component variants
 */
async function createComponentVariants(
  baseComponent: ComponentNode,
  variants: Record<string, any>,
  tokens?: UnifiedTokens
): Promise<ComponentNode[]> {
  const variantComponents: ComponentNode[] = [];
  
  for (const [variantName, variantProps] of Object.entries(variants)) {
    const variant = baseComponent.clone() as ComponentNode;
    variant.name = `${baseComponent.name}/${variantName}`;
    
    // Apply variant-specific properties
    if (variantProps.fills) {
      variant.fills = variantProps.fills;
    }
    if (variantProps.strokes) {
      variant.strokes = variantProps.strokes;
    }
    if (variantProps.effects) {
      variant.effects = variantProps.effects;
    }
    
    variantComponents.push(variant);
  }
  
  // Create component set if we have variants
  if (variantComponents.length > 0) {
    try {
      const componentSet = figma.combineAsVariants(
        [baseComponent, ...variantComponents],
        baseComponent.parent!,
        baseComponent.parent!.children.indexOf(baseComponent)
      );
      componentSet.name = baseComponent.name;
      console.log(`✅ Created component set with ${variantComponents.length + 1} variants`);
    } catch (error) {
      console.warn('Could not create component set:', error);
    }
  }
  
  return variantComponents;
}

/**
 * Create example instances
 */
async function createExampleInstances(
  component: ComponentNode,
  variants?: Record<string, any>
): Promise<InstanceNode[]> {
  const instances: InstanceNode[] = [];
  const spacing = 20;
  let currentX = component.x + component.width + 100;
  
  // Create main instance
  const mainInstance = component.createInstance();
  mainInstance.x = currentX;
  mainInstance.y = component.y;
  instances.push(mainInstance);
  
  // Create variant instances if available
  if (variants) {
    currentX += mainInstance.width + spacing;
    
    for (const variantName of Object.keys(variants)) {
      const instance = component.createInstance();
      instance.x = currentX;
      instance.y = component.y;
      
      // Try to set variant properties
      if ('setProperties' in instance) {
        try {
          instance.setProperties({ variant: variantName });
        } catch (e) {
          console.warn(`Could not set variant ${variantName}`);
        }
      }
      
      instances.push(instance);
      currentX += instance.width + spacing;
    }
  }
  
  return instances;
}

/**
 * Get default width for component type
 */
function getDefaultWidth(type: string): number {
  const widths: Record<string, number> = {
    button: 120,
    input: 240,
    card: 320,
    badge: 80,
    avatar: 40,
    dialog: 400,
    custom: 200
  };
  
  return widths[type] || 200;
}

/**
 * Get default height for component type
 */
function getDefaultHeight(type: string): number {
  const heights: Record<string, number> = {
    button: 40,
    input: 40,
    card: 200,
    badge: 24,
    avatar: 40,
    dialog: 300,
    custom: 150
  };
  
  return heights[type] || 150;
}