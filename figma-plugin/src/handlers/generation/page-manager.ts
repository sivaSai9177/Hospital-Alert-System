/**
 * Page Manager for Figma Plugin
 * Handles page creation, navigation, and organization
 */

import { PageInfo } from '../../types/messages';
import { formatError, createUserMessage } from '../../utils/error-messages';

/**
 * Get all pages in the current Figma file
 */
export async function getAllPages(): Promise<PageInfo[]> {
  try {
    const pages = figma.root.children;
    const currentPageId = figma.currentPage.id;
    
    return pages.map(page => ({
      id: page.id,
      name: page.name,
      isCurrent: page.id === currentPageId,
      type: detectPageType(page.name)
    }));
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to get pages'));
  }
}

/**
 * Create a new page in Figma
 */
export async function createPage(name: string, setAsCurrent: boolean = true): Promise<PageInfo> {
  try {
    console.log(`📄 Creating new page: ${name}`);
    
    // Check if page already exists
    const existingPage = figma.root.children.find(page => page.name === name);
    if (existingPage) {
      console.log(`📋 Page "${name}" already exists, navigating to it`);
      if (setAsCurrent) {
        await figma.setCurrentPageAsync(existingPage);
      }
      return {
        id: existingPage.id,
        name: existingPage.name,
        isCurrent: setAsCurrent,
        type: detectPageType(existingPage.name)
      };
    }
    
    // Create new page
    const newPage = figma.createPage();
    newPage.name = name;
    
    // Set as current page if requested
    if (setAsCurrent) {
      await figma.setCurrentPageAsync(newPage);
    }
    
    console.log(`✅ Page "${name}" created successfully`);
    
    return {
      id: newPage.id,
      name: newPage.name,
      isCurrent: setAsCurrent,
      type: detectPageType(newPage.name)
    };
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, `Failed to create page "${name}"`));
  }
}

/**
 * Navigate to a specific page
 */
export async function navigateToPage(pageId?: string, pageName?: string): Promise<PageInfo> {
  try {
    let targetPage: PageNode | undefined;
    
    if (pageId) {
      targetPage = figma.root.children.find(page => page.id === pageId);
    } else if (pageName) {
      targetPage = figma.root.children.find(page => page.name === pageName);
    }
    
    if (!targetPage) {
      throw new Error(`Page ${pageId || pageName} not found`);
    }
    
    await figma.setCurrentPageAsync(targetPage);
    console.log(`🔄 Navigated to page: ${targetPage.name}`);
    
    return {
      id: targetPage.id,
      name: targetPage.name,
      isCurrent: true,
      type: detectPageType(targetPage.name)
    };
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to navigate to page'));
  }
}

/**
 * Create or get design system pages
 */
export async function setupDesignSystemPages(): Promise<{
  mainPage: PageInfo;
  componentsPage: PageInfo;
  tokensPage: PageInfo;
  examplesPage: PageInfo;
}> {
  console.log('🏗️ Setting up design system pages...');
  
  const mainPage = await createPage('🎨 Design System', false);
  const componentsPage = await createPage('🧩 Components', false);
  const tokensPage = await createPage('🎨 Design Tokens', false);
  const examplesPage = await createPage('📖 Examples', false);
  
  // Navigate to main design system page
  await navigateToPage(mainPage.id);
  
  return {
    mainPage,
    componentsPage,
    tokensPage,
    examplesPage
  };
}

/**
 * Organize components on a page
 */
export async function organizeComponentsOnPage(
  pageId: string,
  components: SceneNode[],
  options: {
    columns?: number;
    spacing?: number;
    groupByType?: boolean;
  } = {}
): Promise<void> {
  const { columns = 4, spacing = 40, groupByType = true } = options;
  
  try {
    // Navigate to the target page
    await navigateToPage(pageId);
    
    if (groupByType) {
      // Group components by type
      const componentGroups = new Map<string, SceneNode[]>();
      
      components.forEach(component => {
        const type = detectComponentType(component.name);
        if (!componentGroups.has(type)) {
          componentGroups.set(type, []);
        }
        componentGroups.get(type)!.push(component);
      });
      
      // Arrange groups
      let currentY = 100;
      
      componentGroups.forEach((groupComponents, type) => {
        // Create section header
        const header = figma.createText();
        header.fontName = { family: "Inter", style: "Bold" };
        header.fontSize = 24;
        header.characters = type.charAt(0).toUpperCase() + type.slice(1);
        header.x = 100;
        header.y = currentY;
        
        currentY += 60;
        
        // Arrange components in grid
        arrangeInGrid(groupComponents, {
          startX: 100,
          startY: currentY,
          columns,
          spacing
        });
        
        // Calculate next section Y position
        const maxHeight = Math.max(...groupComponents.map(c => c.height));
        const rows = Math.ceil(groupComponents.length / columns);
        currentY += (maxHeight + spacing) * rows + 80;
      });
    } else {
      // Simple grid arrangement
      arrangeInGrid(components, {
        startX: 100,
        startY: 100,
        columns,
        spacing
      });
    }
    
    console.log(`✅ Organized ${components.length} components on page`);
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to organize components'));
  }
}

/**
 * Create a frame with component examples
 */
export async function createComponentExamplesFrame(
  component: ComponentNode,
  variants?: string[]
): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = `${component.name} - Examples`;
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisAlignItems = 'MIN';
  frame.counterAxisAlignItems = 'MIN';
  frame.paddingLeft = 24;
  frame.paddingRight = 24;
  frame.paddingTop = 24;
  frame.paddingBottom = 24;
  frame.itemSpacing = 16;
  frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
  
  // Add title
  const title = figma.createText();
  title.fontName = { family: "Inter", style: "Bold" };
  title.fontSize = 18;
  title.characters = component.name;
  frame.appendChild(title);
  
  // Create instances for each variant
  if (variants && variants.length > 0) {
    for (const variant of variants) {
      const variantFrame = figma.createFrame();
      variantFrame.name = variant;
      variantFrame.layoutMode = 'HORIZONTAL';
      variantFrame.counterAxisAlignItems = 'CENTER';
      variantFrame.itemSpacing = 16;
      variantFrame.paddingLeft = 16;
      variantFrame.paddingRight = 16;
      variantFrame.paddingTop = 12;
      variantFrame.paddingBottom = 12;
      
      // Add variant label
      const label = figma.createText();
      label.fontName = { family: "Inter", style: "Regular" };
      label.fontSize = 14;
      label.characters = variant;
      label.resize(100, label.height);
      variantFrame.appendChild(label);
      
      // Create component instance
      const instance = component.createInstance();
      variantFrame.appendChild(instance);
      
      frame.appendChild(variantFrame);
    }
  } else {
    // Just create a single instance
    const instance = component.createInstance();
    frame.appendChild(instance);
  }
  
  // Auto-resize frame
  frame.resize(400, frame.height);
  
  return frame;
}

/**
 * Helper function to detect page type from name
 */
function detectPageType(name: string): 'design-system' | 'components' | 'examples' | 'regular' {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('design system') || lowerName.includes('design-system')) {
    return 'design-system';
  }
  if (lowerName.includes('component')) {
    return 'components';
  }
  if (lowerName.includes('example') || lowerName.includes('demo')) {
    return 'examples';
  }
  
  return 'regular';
}

/**
 * Helper function to detect component type from name
 */
function detectComponentType(name: string): string {
  const lowerName = name.toLowerCase();
  
  const typeMap: Record<string, string[]> = {
    'buttons': ['button', 'btn', 'cta'],
    'inputs': ['input', 'textfield', 'field'],
    'cards': ['card', 'panel', 'surface'],
    'navigation': ['nav', 'menu', 'sidebar', 'header'],
    'feedback': ['alert', 'toast', 'notification', 'badge'],
    'overlays': ['modal', 'dialog', 'popup', 'drawer'],
    'data': ['table', 'list', 'grid'],
    'forms': ['form', 'checkbox', 'radio', 'switch', 'select'],
    'media': ['avatar', 'image', 'video', 'icon'],
    'layout': ['container', 'section', 'divider', 'spacer'],
  };
  
  for (const [type, patterns] of Object.entries(typeMap)) {
    if (patterns.some(pattern => lowerName.includes(pattern))) {
      return type;
    }
  }
  
  return 'other';
}

/**
 * Helper function to arrange nodes in a grid
 */
function arrangeInGrid(
  nodes: SceneNode[],
  options: {
    startX: number;
    startY: number;
    columns: number;
    spacing: number;
  }
): void {
  const { startX, startY, columns, spacing } = options;
  
  nodes.forEach((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    node.x = startX + col * (node.width + spacing);
    node.y = startY + row * (node.height + spacing);
  });
}