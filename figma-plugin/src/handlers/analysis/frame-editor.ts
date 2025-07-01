/**
 * Frame Editor for Figma Plugin
 * Provides functionality to edit frame properties programmatically
 */

import { mutationsTracker } from '../../lib/mutations-tracker';

export interface FrameEditOptions {
  // Dimensions
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  
  // Auto-layout
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';
  layoutGrow?: number;
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  
  // Visual properties
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  cornerRadius?: number | number[];
  effects?: Effect[];
  opacity?: number;
  visible?: boolean;
  clipsContent?: boolean;
  
  // Constraints
  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };
  
  // Naming
  name?: string;
}

export interface FrameEditResult {
  success: boolean;
  nodeId: string;
  nodeName: string;
  changes: string[];
  errors?: string[];
}

/**
 * Edit a frame by ID with the given options
 */
export async function editFrame(nodeId: string, options: FrameEditOptions): Promise<FrameEditResult> {
  const changes: string[] = [];
  const errors: string[] = [];
  
  try {
    // Find the node
    const node = await figma.getNodeByIdAsync(nodeId);
    
    if (!node) {
      return {
        success: false,
        nodeId,
        nodeName: 'Unknown',
        changes: [],
        errors: ['Node not found']
      };
    }
    
    // Check if it's a frame-like node
    if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
      return {
        success: false,
        nodeId: node.id,
        nodeName: node.name,
        changes: [],
        errors: [`Node is not a frame (type: ${node.type})`]
      };
    }
    
    const frameNode = node as FrameNode;
    
    // Start mutation batch
    const batchId = mutationsTracker.startBatch(`Edit frame: ${frameNode.name}`);
    
    // Apply dimensions
    if (options.width !== undefined || options.height !== undefined) {
      const oldWidth = frameNode.width;
      const oldHeight = frameNode.height;
      const newWidth = options.width !== undefined ? options.width : frameNode.width;
      const newHeight = options.height !== undefined ? options.height : frameNode.height;
      frameNode.resize(newWidth, newHeight);
      mutationsTracker.trackUpdate(frameNode, 'size', { width: oldWidth, height: oldHeight }, { width: newWidth, height: newHeight });
      changes.push(`Resized to ${newWidth}x${newHeight}`);
    }
    
    // Apply position
    if (options.x !== undefined) {
      const oldX = frameNode.x;
      frameNode.x = options.x;
      mutationsTracker.trackUpdate(frameNode, 'x', oldX, options.x);
      changes.push(`Moved X to ${options.x}`);
    }
    if (options.y !== undefined) {
      const oldY = frameNode.y;
      frameNode.y = options.y;
      mutationsTracker.trackUpdate(frameNode, 'y', oldY, options.y);
      changes.push(`Moved Y to ${options.y}`);
    }
    
    // Apply auto-layout
    if (options.layoutMode !== undefined) {
      frameNode.layoutMode = options.layoutMode;
      changes.push(`Set layout mode to ${options.layoutMode}`);
      
      // Only apply layout properties if layout mode is not NONE
      if (options.layoutMode !== 'NONE') {
        if (options.primaryAxisSizingMode !== undefined) {
          frameNode.primaryAxisSizingMode = options.primaryAxisSizingMode;
          changes.push(`Set primary axis sizing to ${options.primaryAxisSizingMode}`);
        }
        
        if (options.counterAxisSizingMode !== undefined) {
          frameNode.counterAxisSizingMode = options.counterAxisSizingMode;
          changes.push(`Set counter axis sizing to ${options.counterAxisSizingMode}`);
        }
        
        if (options.primaryAxisAlignItems !== undefined) {
          frameNode.primaryAxisAlignItems = options.primaryAxisAlignItems;
          changes.push(`Set primary axis alignment to ${options.primaryAxisAlignItems}`);
        }
        
        if (options.counterAxisAlignItems !== undefined) {
          frameNode.counterAxisAlignItems = options.counterAxisAlignItems;
          changes.push(`Set counter axis alignment to ${options.counterAxisAlignItems}`);
        }
        
        if (options.itemSpacing !== undefined) {
          frameNode.itemSpacing = options.itemSpacing;
          changes.push(`Set item spacing to ${options.itemSpacing}`);
        }
        
        if (options.counterAxisSpacing !== undefined) {
          frameNode.counterAxisSpacing = options.counterAxisSpacing;
          changes.push(`Set counter axis spacing to ${options.counterAxisSpacing}`);
        }
        
        if (options.layoutWrap !== undefined) {
          frameNode.layoutWrap = options.layoutWrap;
          changes.push(`Set layout wrap to ${options.layoutWrap}`);
        }
      }
    }
    
    // Apply padding
    if (options.paddingTop !== undefined) {
      frameNode.paddingTop = options.paddingTop;
      changes.push(`Set top padding to ${options.paddingTop}`);
    }
    if (options.paddingRight !== undefined) {
      frameNode.paddingRight = options.paddingRight;
      changes.push(`Set right padding to ${options.paddingRight}`);
    }
    if (options.paddingBottom !== undefined) {
      frameNode.paddingBottom = options.paddingBottom;
      changes.push(`Set bottom padding to ${options.paddingBottom}`);
    }
    if (options.paddingLeft !== undefined) {
      frameNode.paddingLeft = options.paddingLeft;
      changes.push(`Set left padding to ${options.paddingLeft}`);
    }
    
    // Apply layout properties for child nodes
    if ('layoutAlign' in frameNode && options.layoutAlign !== undefined) {
      frameNode.layoutAlign = options.layoutAlign;
      changes.push(`Set layout align to ${options.layoutAlign}`);
    }
    
    if ('layoutGrow' in frameNode && options.layoutGrow !== undefined) {
      frameNode.layoutGrow = options.layoutGrow;
      changes.push(`Set layout grow to ${options.layoutGrow}`);
    }
    
    // Apply visual properties
    if (options.fills !== undefined) {
      const oldFills = frameNode.fills;
      frameNode.fills = options.fills;
      mutationsTracker.trackStyleChange(frameNode, 'fills', oldFills, options.fills);
      changes.push('Updated fills');
    }
    
    if (options.strokes !== undefined) {
      const oldStrokes = frameNode.strokes;
      frameNode.strokes = options.strokes;
      mutationsTracker.trackStyleChange(frameNode, 'strokes', oldStrokes, options.strokes);
      changes.push('Updated strokes');
    }
    
    if (options.strokeWeight !== undefined) {
      frameNode.strokeWeight = options.strokeWeight;
      changes.push(`Set stroke weight to ${options.strokeWeight}`);
    }
    
    if (options.strokeAlign !== undefined) {
      frameNode.strokeAlign = options.strokeAlign;
      changes.push(`Set stroke align to ${options.strokeAlign}`);
    }
    
    if (options.cornerRadius !== undefined) {
      if (typeof options.cornerRadius === 'number') {
        frameNode.cornerRadius = options.cornerRadius;
        changes.push(`Set corner radius to ${options.cornerRadius}`);
      } else {
        frameNode.topLeftRadius = options.cornerRadius[0] !== undefined ? options.cornerRadius[0] : 0;
        frameNode.topRightRadius = options.cornerRadius[1] !== undefined ? options.cornerRadius[1] : 0;
        frameNode.bottomRightRadius = options.cornerRadius[2] !== undefined ? options.cornerRadius[2] : 0;
        frameNode.bottomLeftRadius = options.cornerRadius[3] !== undefined ? options.cornerRadius[3] : 0;
        changes.push('Set individual corner radii');
      }
    }
    
    if (options.effects !== undefined) {
      frameNode.effects = options.effects;
      changes.push('Updated effects');
    }
    
    if (options.opacity !== undefined) {
      frameNode.opacity = options.opacity;
      changes.push(`Set opacity to ${options.opacity}`);
    }
    
    if (options.visible !== undefined) {
      frameNode.visible = options.visible;
      changes.push(`Set visibility to ${options.visible}`);
    }
    
    if (options.clipsContent !== undefined) {
      frameNode.clipsContent = options.clipsContent;
      changes.push(`Set clips content to ${options.clipsContent}`);
    }
    
    // Apply constraints
    if (options.constraints !== undefined) {
      frameNode.constraints = options.constraints;
      changes.push('Updated constraints');
    }
    
    // Apply name
    if (options.name !== undefined) {
      const oldName = frameNode.name;
      frameNode.name = options.name;
      mutationsTracker.trackUpdate(frameNode, 'name', oldName, options.name);
      changes.push(`Renamed to "${options.name}"`);
    }
    
    // Complete mutation batch
    mutationsTracker.completeBatch();
    
    return {
      success: true,
      nodeId: frameNode.id,
      nodeName: frameNode.name,
      changes,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    return {
      success: false,
      nodeId,
      nodeName: 'Unknown',
      changes: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Edit the currently selected frame
 */
export async function editSelectedFrame(options: FrameEditOptions): Promise<FrameEditResult> {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    return {
      success: false,
      nodeId: '',
      nodeName: '',
      changes: [],
      errors: ['No frame selected']
    };
  }
  
  const node = selection[0];
  return editFrame(node.id, options);
}

/**
 * Create a preset frame with common settings
 */
export async function createPresetFrame(preset: 'card' | 'section' | 'container' | 'sidebar'): Promise<FrameNode> {
  const presets: Record<string, FrameEditOptions> = {
    card: {
      width: 320,
      height: 200,
      layoutMode: 'VERTICAL',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'AUTO',
      paddingTop: 24,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      itemSpacing: 16,
      cornerRadius: 12,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 2 },
          radius: 8,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
    },
    section: {
      width: 1200,
      height: 600,
      layoutMode: 'VERTICAL',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'AUTO',
      paddingTop: 48,
      paddingRight: 48,
      paddingBottom: 48,
      paddingLeft: 48,
      itemSpacing: 32,
      fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }]
    },
    container: {
      width: 1440,
      height: 900,
      layoutMode: 'VERTICAL',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
      fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.96 } }]
    },
    sidebar: {
      width: 280,
      height: 900,
      layoutMode: 'VERTICAL',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
      paddingTop: 32,
      paddingRight: 24,
      paddingBottom: 32,
      paddingLeft: 24,
      itemSpacing: 8,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }],
      strokeWeight: 1,
      strokeAlign: 'INSIDE'
    }
  };
  
  const frame = figma.createFrame();
  frame.name = `${preset.charAt(0).toUpperCase() + preset.slice(1)} Frame`;
  
  const presetOptions = presets[preset];
  if (presetOptions) {
    await editFrame(frame.id, presetOptions);
  }
  
  // Add to current page
  figma.currentPage.appendChild(frame);
  
  // Center in viewport
  frame.x = figma.viewport.center.x - frame.width / 2;
  frame.y = figma.viewport.center.y - frame.height / 2;
  
  return frame;
}

/**
 * Batch edit multiple frames
 */
export async function batchEditFrames(nodeIds: string[], options: FrameEditOptions): Promise<FrameEditResult[]> {
  const results: FrameEditResult[] = [];
  
  for (const nodeId of nodeIds) {
    const result = await editFrame(nodeId, options);
    results.push(result);
  }
  
  return results;
}

/**
 * Fix common frame issues
 */
export async function fixFrameIssues(nodeId: string): Promise<FrameEditResult> {
  const node = await figma.getNodeByIdAsync(nodeId);
  
  if (!node || (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE')) {
    return {
      success: false,
      nodeId,
      nodeName: 'Unknown',
      changes: [],
      errors: ['Invalid node']
    };
  }
  
  const frameNode = node as FrameNode;
  const fixes: FrameEditOptions = {};
  const issues: string[] = [];
  
  // Fix zero height
  if (frameNode.height === 0) {
    fixes.height = 100;
    issues.push('Fixed zero height');
  }
  
  // Fix zero width
  if (frameNode.width === 0) {
    fixes.width = 200;
    issues.push('Fixed zero width');
  }
  
  // Fix auto-layout with no sizing mode
  if (frameNode.layoutMode !== 'NONE') {
    if (!frameNode.primaryAxisSizingMode) {
      fixes.primaryAxisSizingMode = 'AUTO';
      issues.push('Fixed missing primary axis sizing');
    }
    if (!frameNode.counterAxisSizingMode) {
      fixes.counterAxisSizingMode = 'AUTO';
      issues.push('Fixed missing counter axis sizing');
    }
  }
  
  // Apply fixes
  if (Object.keys(fixes).length > 0) {
    return editFrame(nodeId, fixes);
  }
  
  return {
    success: true,
    nodeId: frameNode.id,
    nodeName: frameNode.name,
    changes: ['No issues found']
  };
}