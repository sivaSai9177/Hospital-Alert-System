/**
 * Frame Inspector for Figma Plugin
 * Provides detailed information about Figma frames for debugging
 */

import { mutationsTracker } from '../../lib/mutations-tracker';
import { operationQueue } from '../../lib/operation-queue';
import { syncStateManager } from '../../lib/sync-state-manager';
import { figmaLogger, logger } from '../../lib/figma-logger';

export interface NodeProperties {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  blendMode?: string;
  isMask?: boolean;
  absoluteTransform?: number[][];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ElementHierarchy extends NodeProperties {
  children?: ElementHierarchy[];
  properties?: {
    fills?: any[];
    strokes?: any[];
    effects?: any[];
    cornerRadius?: number | number[];
    strokeWeight?: number;
    strokeAlign?: string;
    constraints?: any;
    layoutMode?: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    itemSpacing?: number;
    layoutAlign?: string;
    layoutGrow?: number;
    characters?: string;
    fontSize?: number;
    fontName?: any;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
    lineHeight?: any;
    letterSpacing?: any;
  };
}

export interface FrameInspectionResult {
  id: string;
  name: string;
  type: string;
  page?: {
    id: string;
    name: string;
  };
  isSelected?: boolean;
  path?: string[]; // Path from page to this node
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  autoLayout?: {
    mode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    primaryAxisSizingMode?: 'FIXED' | 'AUTO';
    counterAxisSizingMode?: 'FIXED' | 'AUTO';
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    itemSpacing?: number;
    counterAxisSpacing?: number;
    layoutAlign?: string;
    layoutGrow?: number;
    layoutWrap?: string;
  };
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  cornerRadius?: number | number[];
  constraints?: {
    horizontal: string;
    vertical: string;
  };
  clipsContent?: boolean;
  visible?: boolean;
  opacity?: number;
  parent?: {
    id: string;
    name: string;
    type: string;
  };
  children?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  hierarchy?: ElementHierarchy; // Full hierarchy of all elements
  
  // Deep analysis
  deepAnalysis?: {
    summary: {
      totalChildren: number;
      elementTypes: Record<string, number>;
      textElements: number;
      imageElements: number;
      componentInstances: number;
      groups: number;
      vectors: number;
    };
    structure: {
      maxDepth: number;
      hasAutoLayout: boolean;
      layoutDirection: string;
      hasConstraints: boolean;
      responsive: boolean;
    };
    design: {
      colorCount: number;
      uniqueColors: string[];
      fontFamilies: string[];
      fontSize: { min: number; max: number; avg: number };
      hasEffects: boolean;
      hasGradients: boolean;
    };
    content: {
      textContent: Array<{ name: string; text: string; fontSize: number }>;
      components: Array<{ name: string; mainComponent?: string }>;
      images: Array<{ name: string; type: string }>;
    };
    issues: string[];
  };
}

/**
 * Get the path from page to node
 */
function getNodePath(node: SceneNode): string[] {
  const path: string[] = [];
  let current: SceneNode | DocumentNode | PageNode = node;
  
  while (current && current.type !== 'DOCUMENT') {
    if (current.type === 'PAGE') {
      path.unshift(`📄 ${current.name}`);
      break;
    } else {
      path.unshift(current.name);
      if (current.parent) {
        current = current.parent as any;
      } else {
        break;
      }
    }
  }
  
  return path;
}

/**
 * Build complete element hierarchy with all properties
 */
function buildElementHierarchy(node: SceneNode, maxDepth: number = 10, currentDepth: number = 0): ElementHierarchy {
  const hierarchy: ElementHierarchy = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked,
    opacity: node.opacity,
    blendMode: node.blendMode,
    isMask: node.isMask,
  };
  
  // Add absolute transform and bounding box
  if ('absoluteTransform' in node) {
    hierarchy.absoluteTransform = node.absoluteTransform;
  }
  
  if ('absoluteBoundingBox' in node) {
    hierarchy.absoluteBoundingBox = node.absoluteBoundingBox;
  }
  
  // Add properties based on node type
  const properties: any = {};
  
  // Common properties - serialize to avoid symbol issues
  if ('fills' in node && node.fills) {
    try {
      properties.fills = JSON.parse(JSON.stringify(node.fills));
    } catch (e) {
      properties.fills = [];
    }
  }
  if ('strokes' in node && node.strokes) {
    try {
      properties.strokes = JSON.parse(JSON.stringify(node.strokes));
    } catch (e) {
      properties.strokes = [];
    }
  }
  if ('effects' in node && node.effects) {
    try {
      properties.effects = JSON.parse(JSON.stringify(node.effects));
    } catch (e) {
      properties.effects = [];
    }
  }
  if ('cornerRadius' in node) {
    properties.cornerRadius = node.cornerRadius;
  }
  if ('strokeWeight' in node) {
    properties.strokeWeight = node.strokeWeight;
  }
  if ('strokeAlign' in node) {
    properties.strokeAlign = node.strokeAlign;
  }
  if ('constraints' in node && node.constraints) {
    try {
      properties.constraints = JSON.parse(JSON.stringify(node.constraints));
    } catch (e) {
      properties.constraints = {};
    }
  }
  
  // Frame/Component properties
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const frameNode = node as FrameNode;
    properties.layoutMode = frameNode.layoutMode;
    if (frameNode.layoutMode !== 'NONE') {
      properties.primaryAxisSizingMode = frameNode.primaryAxisSizingMode;
      properties.counterAxisSizingMode = frameNode.counterAxisSizingMode;
      properties.paddingTop = frameNode.paddingTop;
      properties.paddingRight = frameNode.paddingRight;
      properties.paddingBottom = frameNode.paddingBottom;
      properties.paddingLeft = frameNode.paddingLeft;
      properties.itemSpacing = frameNode.itemSpacing;
    }
    if ('layoutAlign' in frameNode) {
      properties.layoutAlign = frameNode.layoutAlign;
    }
    if ('layoutGrow' in frameNode) {
      properties.layoutGrow = frameNode.layoutGrow;
    }
  }
  
  // Text properties
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    properties.characters = textNode.characters;
    if (typeof textNode.fontSize === 'number') {
      properties.fontSize = textNode.fontSize;
    }
    if (textNode.fontName && typeof textNode.fontName === 'object') {
      try {
        properties.fontName = JSON.parse(JSON.stringify(textNode.fontName));
      } catch (e) {
        properties.fontName = { family: 'Unknown', style: 'Regular' };
      }
    }
    properties.textAlignHorizontal = textNode.textAlignHorizontal;
    properties.textAlignVertical = textNode.textAlignVertical;
    if (textNode.lineHeight && typeof textNode.lineHeight === 'object') {
      try {
        properties.lineHeight = JSON.parse(JSON.stringify(textNode.lineHeight));
      } catch (e) {
        properties.lineHeight = { unit: 'AUTO' };
      }
    }
    if (textNode.letterSpacing && typeof textNode.letterSpacing === 'object') {
      try {
        properties.letterSpacing = JSON.parse(JSON.stringify(textNode.letterSpacing));
      } catch (e) {
        properties.letterSpacing = { unit: 'PERCENT', value: 0 };
      }
    }
  }
  
  // Add properties if any exist
  if (Object.keys(properties).length > 0) {
    hierarchy.properties = properties;
  }
  
  // Add children recursively
  if ('children' in node && currentDepth < maxDepth) {
    hierarchy.children = node.children.map(child => 
      buildElementHierarchy(child, maxDepth, currentDepth + 1)
    );
  }
  
  return hierarchy;
}

/**
 * Get the page that contains a node
 */
function getNodePage(node: SceneNode): PageNode | null {
  let current: SceneNode | DocumentNode | PageNode = node;
  
  while (current && current.type !== 'DOCUMENT') {
    if (current.type === 'PAGE') {
      return current as PageNode;
    }
    if (current.parent) {
      current = current.parent as any;
    } else {
      break;
    }
  }
  
  return null;
}

/**
 * Deep analysis of frame contents
 */
async function analyzeFrameContents(node: FrameNode | ComponentNode | InstanceNode): Promise<any> {
  const analysis = {
    summary: {
      totalChildren: 0,
      elementTypes: {} as Record<string, number>,
      textElements: 0,
      imageElements: 0,
      componentInstances: 0,
      groups: 0,
      vectors: 0,
    },
    structure: {
      maxDepth: 0,
      hasAutoLayout: node.layoutMode !== 'NONE',
      layoutDirection: node.layoutMode,
      hasConstraints: false,
      responsive: false,
    },
    design: {
      colorCount: 0,
      uniqueColors: [] as string[],
      fontFamilies: [] as string[],
      fontSize: { min: Infinity, max: 0, avg: 0 },
      hasEffects: false,
      hasGradients: false,
    },
    content: {
      textContent: [] as Array<{ name: string; text: string; fontSize: number; path: string[] }>,
      components: [] as Array<{ name: string; mainComponent?: string; path: string[] }>,
      images: [] as Array<{ name: string; type: string; path: string[] }>,
      allElements: [] as Array<{ 
        id: string; 
        name: string; 
        type: string; 
        depth: number; 
        path: string[];
        parent?: string;
        hasChildren: boolean;
        childCount?: number;
      }>,
    },
    issues: [] as string[],
  };

  // Recursive function to analyze nodes
  async function analyzeNode(node: SceneNode, depth: number = 0, path: string[] = []) {
    if (!node || !node.type) {
      console.warn('Invalid node in analyzeNode:', node);
      return;
    }
    
    analysis.summary.totalChildren++;
    analysis.structure.maxDepth = Math.max(analysis.structure.maxDepth, depth);
    
    // Build the current path
    const currentPath = [...path, node.name];
    
    // Record every element in the hierarchy
    const elementInfo = {
      id: node.id,
      name: node.name,
      type: node.type,
      depth: depth,
      path: currentPath,
      parent: path[path.length - 1] || 'root',
      hasChildren: 'children' in node && node.children && node.children.length > 0,
      childCount: 'children' in node && node.children ? node.children.length : undefined,
    };
    analysis.content.allElements.push(elementInfo);
    
    // Count element types
    if (analysis.elementTypes && node.type) {
      if (!analysis.elementTypes[node.type]) {
        analysis.elementTypes[node.type] = 0;
      }
      analysis.elementTypes[node.type]++;
    }
    
    // Check for constraints
    if ('constraints' in node && node.constraints) {
      analysis.structure.hasConstraints = true;
      const c = node.constraints;
      if (c.horizontal !== 'MIN' || c.vertical !== 'MIN') {
        analysis.structure.responsive = true;
      }
    }
    
    // Analyze based on node type using if-else for better compatibility
    const nodeType = node.type;
    
    if (nodeType === 'TEXT') {
      analysis.summary.textElements++;
      const textNode = node as TextNode;
      if (textNode.characters) {
        analysis.content.textContent.push({
          name: node.name,
          text: textNode.characters.substring(0, 100),
          fontSize: typeof textNode.fontSize === 'number' ? textNode.fontSize : 0,
          path: currentPath,
        });
        
        // Track font info
        if (typeof textNode.fontSize === 'number') {
          analysis.design.fontSize.min = Math.min(analysis.design.fontSize.min, textNode.fontSize);
          analysis.design.fontSize.max = Math.max(analysis.design.fontSize.max, textNode.fontSize);
        }
      }
    } else if (nodeType === 'RECTANGLE' || nodeType === 'ELLIPSE') {
      const shape = node as RectangleNode | EllipseNode;
      if (shape.fills && Array.isArray(shape.fills)) {
        shape.fills.forEach(fill => {
          if (fill.type === 'IMAGE') {
            analysis.summary.imageElements++;
            analysis.content.images.push({
              name: node.name,
              type: 'fill',
              path: currentPath,
            });
          } else if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') {
            analysis.design.hasGradients = true;
          }
        });
      }
    } else if (nodeType === 'INSTANCE') {
      analysis.summary.componentInstances++;
      const instance = node as InstanceNode;
      try {
        const mainComponent = await instance.getMainComponentAsync();
        analysis.content.components.push({
          name: node.name,
          mainComponent: mainComponent ? mainComponent.name : undefined,
          path: currentPath,
        });
      } catch (err) {
        // If we can't get the main component, just record without it
        analysis.content.components.push({
          name: node.name,
          mainComponent: undefined,
          path: currentPath,
        });
      }
    } else if (nodeType === 'GROUP') {
      analysis.summary.groups++;
    } else if (nodeType === 'VECTOR') {
      analysis.summary.vectors++;
    }
    
    // Check for effects
    if ('effects' in node && node.effects && node.effects.length > 0) {
      analysis.design.hasEffects = true;
    }
    
    // Extract colors
    if ('fills' in node && Array.isArray(node.fills)) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.visible !== false) {
          const color = `rgb(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)})`;
          if (!analysis.design.uniqueColors.includes(color)) {
            analysis.design.uniqueColors.push(color);
          }
        }
      });
    }
    
    // Recursively analyze children
    if ('children' in node && node.children) {
      for (let index = 0; index < node.children.length; index++) {
        const child = node.children[index];
        if (!child) {
          console.warn(`Recursive: Child at index ${index} is undefined`);
          continue;
        }
        await analyzeNode(child, depth + 1, currentPath);
      }
    }
  }
  
  // Start analysis
  if ('children' in node && node.children) {
    try {
      for (let index = 0; index < node.children.length; index++) {
        const child = node.children[index];
        if (!child) {
          console.warn(`Child at index ${index} is undefined`);
          continue;
        }
        await analyzeNode(child, 0, [node.name]);
      }
    } catch (err) {
      console.error('Error during children analysis:', err);
    }
  }
  
  // Calculate averages and final stats
  analysis.design.colorCount = analysis.design.uniqueColors.length;
  if (analysis.summary.textElements > 0 && analysis.design.fontSize.min !== Infinity) {
    analysis.design.fontSize.avg = (analysis.design.fontSize.min + analysis.design.fontSize.max) / 2;
  } else {
    analysis.design.fontSize = { min: 0, max: 0, avg: 0 };
  }
  
  // Check for common issues
  if (analysis.summary.totalChildren === 0) {
    analysis.issues.push('Frame is empty');
  }
  if (analysis.structure.maxDepth > 10) {
    analysis.issues.push('Very deep nesting detected (>10 levels)');
  }
  if (analysis.design.colorCount > 20) {
    analysis.issues.push('Too many unique colors');
  }
  if (analysis.summary.groups > analysis.summary.totalChildren * 0.5) {
    analysis.issues.push('Excessive use of groups');
  }
  
  return analysis;
}

/**
 * Inspect a frame by ID
 */
export async function inspectFrame(nodeId: string): Promise<FrameInspectionResult | null> {
  // Create operation for tracking
  const operationId = syncStateManager.createOperation('frame-inspection', {
    nodeId,
    timestamp: new Date()
  });

  try {
    logger.info(`Inspecting frame with ID: ${nodeId}`);
    
    // Start operation
    syncStateManager.startOperation(operationId);
    
    // Find the node
    const node = await figma.getNodeByIdAsync(nodeId);
    
    if (!node) {
      logger.error(`Node with ID ${nodeId} not found`);
      // Try to find in current selection as fallback
      const selectedNode = figma.currentPage.selection.find(n => n.id === nodeId);
      if (selectedNode) {
        logger.info('Found node in current selection');
      }
      syncStateManager.failOperation(operationId, 'Node not found');
      return null;
    }
    
    logger.info(`Found node: ${node.name} (${node.type})`);
    
    
    // Get page info
    const page = getNodePage(node);
    const isSelected = figma.currentPage.selection.some(selected => selected.id === nodeId);
    
    // Build inspection result
    const result: FrameInspectionResult = {
      id: node.id,
      name: node.name,
      type: node.type,
      isSelected,
      path: getNodePath(node),
      dimensions: {
        x: 'x' in node ? node.x : 0,
        y: 'y' in node ? node.y : 0,
        width: 'width' in node ? node.width : 0,
        height: 'height' in node ? node.height : 0,
      }
    };
    
    // Add page info
    if (page) {
      result.page = {
        id: page.id,
        name: page.name
      };
    }
    
    // Add auto-layout properties if it's a frame
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const frameNode = node as FrameNode;
      
      result.autoLayout = {
        mode: frameNode.layoutMode,
      };
      
      if (frameNode.layoutMode !== 'NONE') {
        result.autoLayout.primaryAxisSizingMode = frameNode.primaryAxisSizingMode;
        result.autoLayout.counterAxisSizingMode = frameNode.counterAxisSizingMode;
        result.autoLayout.primaryAxisAlignItems = frameNode.primaryAxisAlignItems;
        result.autoLayout.counterAxisAlignItems = frameNode.counterAxisAlignItems;
        result.autoLayout.paddingTop = frameNode.paddingTop;
        result.autoLayout.paddingRight = frameNode.paddingRight;
        result.autoLayout.paddingBottom = frameNode.paddingBottom;
        result.autoLayout.paddingLeft = frameNode.paddingLeft;
        result.autoLayout.itemSpacing = frameNode.itemSpacing;
        
        if ('counterAxisSpacing' in frameNode) {
          result.autoLayout.counterAxisSpacing = frameNode.counterAxisSpacing;
        }
        
        if ('layoutAlign' in frameNode) {
          result.autoLayout.layoutAlign = frameNode.layoutAlign;
        }
        
        if ('layoutGrow' in frameNode) {
          result.autoLayout.layoutGrow = frameNode.layoutGrow;
        }
        
        if ('layoutWrap' in frameNode) {
          result.autoLayout.layoutWrap = frameNode.layoutWrap;
        }
      }
      
      // Add visual properties (serialize to avoid symbol issues)
      result.fills = JSON.parse(JSON.stringify(frameNode.fills || []));
      result.strokes = JSON.parse(JSON.stringify(frameNode.strokes || []));
      result.effects = JSON.parse(JSON.stringify(frameNode.effects || []));
      result.cornerRadius = frameNode.cornerRadius;
      result.clipsContent = frameNode.clipsContent;
    }
    
    // Add common properties
    if ('visible' in node) {
      result.visible = node.visible;
    }
    
    if ('opacity' in node) {
      result.opacity = node.opacity;
    }
    
    if ('constraints' in node) {
      result.constraints = JSON.parse(JSON.stringify(node.constraints || {}));
    }
    
    // Add parent info
    if (node.parent && node.parent.type !== 'DOCUMENT') {
      result.parent = {
        id: node.parent.id,
        name: node.parent.name,
        type: node.parent.type,
      };
    }
    
    // Add children info
    if ('children' in node && node.children.length > 0) {
      result.children = node.children.map(child => ({
        id: child.id,
        name: child.name,
        type: child.type,
      }));
    }
    
    // Build complete hierarchy - serialize to avoid symbol issues
    try {
      const hierarchy = buildElementHierarchy(node, 10);
      // Deep serialize to remove any symbols
      result.hierarchy = JSON.parse(JSON.stringify(hierarchy));
    } catch (error) {
      console.warn('Failed to build element hierarchy:', error);
    }
    
    // Update progress
    syncStateManager.updateProgress(operationId, 70);
    
    // Add deep analysis if it's a single frame inspection
    if ('children' in node) {
      try {
        result.deepAnalysis = await analyzeFrameContents(node as FrameNode | ComponentNode | InstanceNode);
        syncStateManager.updateProgress(operationId, 90);
      } catch (error) {
        logger.warn('Deep analysis failed:', error);
        // Continue without deep analysis rather than failing the entire inspection
      }
    }
    
    // Track mutations for this inspection
    mutationsTracker.trackUpdate(node, 'inspected', false, true);
    
    // Complete operation
    syncStateManager.completeOperation(operationId, result);
    
    return result;
  } catch (error) {
    logger.error('Error inspecting frame:', error);
    syncStateManager.failOperation(operationId, error as Error);
    return null;
  }
}

/**
 * Inspect the currently selected frame
 */
export async function inspectSelectedFrame(): Promise<FrameInspectionResult | null> {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    console.log('No frame selected');
    return null;
  }
  
  const node = selection[0];
  return inspectFrame(node.id);
}

/**
 * Batch inspect multiple frames with operation queue
 */
export async function batchInspectFrames(nodeIds: string[]): Promise<FrameInspectionResult[]> {
  const results: FrameInspectionResult[] = [];
  
  // Add to operation queue
  await operationQueue.addOperation(
    'batch-inspection',
    async function() {
      const totalFrames = nodeIds.length;
      
      for (let i = 0; i < nodeIds.length; i++) {
        const nodeId = nodeIds[i];
        
        // Update progress
        const progress = Math.round((i / totalFrames) * 100);
        if ('updateProgress' in this) {
          (this as any).updateProgress(progress);
        }
        
        // Inspect frame
        const result = await inspectFrame(nodeId);
        if (result) {
          results.push(result);
        }
        
        // Check if operation is paused
        const operationState = syncStateManager.getOperation((this as any).operationId);
        if (operationState?.status === 'paused') {
          // Save checkpoint
          syncStateManager.updateProgress((this as any).operationId, progress, {
            completedFrames: i,
            results: results
          });
          
          // Wait for resume
          while (operationState?.status === 'paused') {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      return results;
    },
    {
      priority: 'normal',
      data: { nodeIds },
      maxRetries: 1
    }
  );
  
  return results;
}

/**
 * Get current selection and page info
 */
export async function getCurrentSelectionInfo(): Promise<{
  currentPage: { id: string; name: string };
  selection: Array<{
    id: string;
    name: string;
    type: string;
    path: string[];
  }>;
  selectionCount: number;
}> {
  const currentPage = figma.currentPage;
  const selection = figma.currentPage.selection;
  
  return {
    currentPage: {
      id: currentPage.id,
      name: currentPage.name
    },
    selection: selection.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      path: getNodePath(node)
    })),
    selectionCount: selection.length
  };
}

/**
 * Get all pages in the document
 */
export async function getAllPages(): Promise<Array<{
  id: string;
  name: string;
  isCurrent: boolean;
  frameCount: number;
}>> {
  const pages = figma.root.children;
  const currentPageId = figma.currentPage.id;
  
  return pages.map(page => {
    let frameCount = 0;
    
    // Count frames in the page
    function countFrames(node: SceneNode) {
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        frameCount++;
      }
      if ('children' in node) {
        for (const child of node.children) {
          countFrames(child);
        }
      }
    }
    
    for (const child of page.children) {
      countFrames(child);
    }
    
    return {
      id: page.id,
      name: page.name,
      isCurrent: page.id === currentPageId,
      frameCount
    };
  });
}

/**
 * Get all frames in the current page
 */
export async function getAllFrames(): Promise<Array<{id: string, name: string, type: string}>> {
  const frames: Array<{id: string, name: string, type: string}> = [];
  
  function traverse(node: SceneNode) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      frames.push({
        id: node.id,
        name: node.name,
        type: node.type
      });
    }
    
    if ('children' in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  
  for (const child of figma.currentPage.children) {
    traverse(child);
  }
  
  return frames;
}

/**
 * Get frame issues and suggestions
 */
export async function getFrameIssues(nodeId: string): Promise<{issues: string[], suggestions: string[]}> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  const node = await figma.getNodeByIdAsync(nodeId);
  
  if (!node || (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE')) {
    issues.push('Not a valid frame node');
    return { issues, suggestions };
  }
  
  const frameNode = node as FrameNode;
  
  // Check for zero dimensions
  if (frameNode.width === 0) {
    issues.push('Frame has zero width');
    suggestions.push('Set a minimum width for the frame');
  }
  
  if (frameNode.height === 0) {
    issues.push('Frame has zero height');
    suggestions.push('Set a minimum height or use auto-layout with content');
  }
  
  // Check auto-layout issues
  if (frameNode.layoutMode !== 'NONE') {
    if (frameNode.primaryAxisSizingMode === 'AUTO' && frameNode.children.length === 0) {
      issues.push('Auto-layout frame with AUTO sizing has no children');
      suggestions.push('Add content or switch to FIXED sizing');
    }
    
    if (frameNode.layoutMode === 'HORIZONTAL' && frameNode.counterAxisSizingMode === 'AUTO' && 
        frameNode.children.some(child => 'layoutAlign' in child && child.layoutAlign !== 'STRETCH')) {
      suggestions.push('Consider using STRETCH alignment for children in horizontal auto-layout');
    }
  }
  
  // Check for missing fills
  if (!frameNode.fills || frameNode.fills.length === 0) {
    suggestions.push('Frame has no fill - consider adding a background color');
  }
  
  // Check for very small frames
  if (frameNode.width < 10 || frameNode.height < 10) {
    issues.push('Frame dimensions are very small');
  }
  
  // Check for naming
  if (frameNode.name === 'Frame' || frameNode.name.match(/^Frame \d+$/)) {
    suggestions.push('Frame has a generic name - consider renaming for better organization');
  }
  
  return { issues, suggestions };
}

/**
 * Get element details including all children and properties
 */
export async function getElementDetails(nodeId: string): Promise<{
  element: ElementHierarchy;
  parentFrame?: {
    id: string;
    name: string;
    type: string;
  };
  statistics: {
    totalElements: number;
    elementTypes: Record<string, number>;
    maxDepth: number;
  };
}> {
  const node = await figma.getNodeByIdAsync(nodeId);
  
  if (!node) {
    throw new Error('Node not found');
  }
  
  // Build hierarchy
  const element = buildElementHierarchy(node);
  
  // Find parent frame
  let parentFrame: any = null;
  let parent = node.parent;
  while (parent && parent.type !== 'PAGE') {
    if (parent.type === 'FRAME' || parent.type === 'COMPONENT' || parent.type === 'INSTANCE') {
      parentFrame = {
        id: parent.id,
        name: parent.name,
        type: parent.type
      };
      break;
    }
    parent = parent.parent as any;
  }
  
  // Calculate statistics
  let totalElements = 0;
  const elementTypes: Record<string, number> = {};
  let maxDepth = 0;
  
  function countElements(el: ElementHierarchy, depth: number = 0) {
    totalElements++;
    elementTypes[el.type] = (elementTypes[el.type] || 0) + 1;
    maxDepth = Math.max(maxDepth, depth);
    
    if (el.children) {
      el.children.forEach(child => countElements(child, depth + 1));
    }
  }
  
  countElements(element);
  
  return {
    element,
    parentFrame,
    statistics: {
      totalElements,
      elementTypes,
      maxDepth
    }
  };
}

/**
 * Get all groups/folders in the current selection
 */
export async function getSelectionGroups(): Promise<{
  groups: Array<{
    id: string;
    name: string;
    type: string;
    path: string[];
    childCount: number;
  }>;
  totalGroups: number;
}> {
  const selection = figma.currentPage.selection;
  const groups: any[] = [];
  const processedIds = new Set<string>();
  
  function findGroups(node: SceneNode, path: string[] = []) {
    if (processedIds.has(node.id)) return;
    processedIds.add(node.id);
    
    if (node.type === 'GROUP' || node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const currentPath = [...path, node.name];
      
      if (node.type === 'GROUP' || ('children' in node && node.children.length > 0)) {
        groups.push({
          id: node.id,
          name: node.name,
          type: node.type,
          path: currentPath,
          childCount: 'children' in node ? node.children.length : 0
        });
      }
      
      if ('children' in node) {
        node.children.forEach(child => findGroups(child, currentPath));
      }
    }
  }
  
  // Process all selected nodes
  selection.forEach(node => findGroups(node));
  
  return {
    groups,
    totalGroups: groups.length
  };
}

/**
 * Get frame hierarchy from a starting node
 */
export async function getFrameHierarchy(nodeId: string, maxDepth: number = 3): Promise<any> {
  const node = await figma.getNodeByIdAsync(nodeId);
  
  if (!node) {
    return null;
  }
  
  const buildHierarchy = (node: SceneNode, depth: number): any => {
    if (depth > maxDepth) {
      return null;
    }
    
    const info: any = {
      id: node.id,
      name: node.name,
      type: node.type,
    };
    
    if ('width' in node && 'height' in node) {
      info.dimensions = {
        width: node.width,
        height: node.height,
      };
    }
    
    if (node.type === 'FRAME' && node.layoutMode !== 'NONE') {
      info.layoutMode = node.layoutMode;
      info.primaryAxisSizingMode = node.primaryAxisSizingMode;
      info.counterAxisSizingMode = node.counterAxisSizingMode;
    }
    
    if ('children' in node && node.children.length > 0) {
      info.children = node.children.map(child => buildHierarchy(child, depth + 1)).filter(Boolean);
    }
    
    return info;
  };
  
  return buildHierarchy(node, 0);
}