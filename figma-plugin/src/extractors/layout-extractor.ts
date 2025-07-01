/**
 * Layout Token Extractor
 * Extracts layout-related tokens from Figma designs
 */

import { 
  ContainerToken, 
  BreakpointToken, 
  GridToken, 
  FlexToken, 
  AspectRatioToken, 
  ZIndexToken 
} from '../../shared/types/design-tokens';

// Common breakpoints based on Tailwind CSS
const DEFAULT_BREAKPOINTS = [
  { name: 'sm', minWidth: 640, description: 'Small devices' },
  { name: 'md', minWidth: 768, description: 'Medium devices' },
  { name: 'lg', minWidth: 1024, description: 'Large devices' },
  { name: 'xl', minWidth: 1280, description: 'Extra large devices' },
  { name: '2xl', minWidth: 1536, description: '2X large devices' }
];

// Common aspect ratios
const COMMON_ASPECT_RATIOS = [
  { name: 'square', ratio: '1:1', value: 1 },
  { name: 'video', ratio: '16:9', value: 16/9 },
  { name: 'photo', ratio: '4:3', value: 4/3 },
  { name: 'portrait', ratio: '3:4', value: 3/4 },
  { name: 'ultrawide', ratio: '21:9', value: 21/9 }
];

/**
 * Extract container tokens from frames
 */
export async function extractContainerTokens(): Promise<ContainerToken[]> {
  const containers: ContainerToken[] = [];
  const containerFrames = new Map<number, { count: number; frames: FrameNode[] }>();
  
  // Find frames that look like containers
  const frames = figma.currentPage.findAll(node => {
    if (node.type !== 'FRAME') return false;
    const frame = node as FrameNode;
    
    // Look for frames with auto-layout and consistent width
    return frame.layoutMode !== 'NONE' && 
           frame.constraints && frame.constraints.horizontal === 'CENTER' &&
           frame.name.toLowerCase().includes('container');
  }) as FrameNode[];
  
  // Group by width
  frames.forEach(frame => {
    const width = Math.round(frame.width);
    if (!containerFrames.has(width)) {
      containerFrames.set(width, { count: 0, frames: [] });
    }
    const group = containerFrames.get(width)!;
    group.count++;
    group.frames.push(frame);
  });
  
  // Create tokens for common container widths
  Array.from(containerFrames.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([width, { frames }], index) => {
      const firstFrame = frames[0];
      const padding = firstFrame.paddingLeft || 0;
      
      containers.push({
        name: `container-${index}`,
        maxWidth: width,
        padding: padding,
        description: `${width}px max-width container`
      });
    });
  
  return containers;
}

/**
 * Extract grid tokens from frames
 */
export async function extractGridTokens(): Promise<GridToken[]> {
  const grids: GridToken[] = [];
  const gridMap = new Map<string, GridToken>();
  
  // Find frames with grid-like layouts
  const frames = figma.currentPage.findAll(node => {
    if (node.type !== 'FRAME') return false;
    const frame = node as FrameNode;
    
    // Look for frames with multiple children in a grid pattern
    return frame.layoutMode === 'NONE' && 
           frame.children.length > 2 &&
           hasGridPattern(frame);
  }) as FrameNode[];
  
  frames.forEach(frame => {
    const gridInfo = analyzeGridPattern(frame);
    if (gridInfo) {
      const key = `${gridInfo.columns}-${gridInfo.gap}`;
      if (!gridMap.has(key)) {
        gridMap.set(key, {
          name: `grid-cols-${gridInfo.columns}`,
          columns: gridInfo.columns,
          gap: gridInfo.gap,
          description: `${gridInfo.columns} column grid`
        });
      }
    }
  });
  
  return Array.from(gridMap.values());
}

/**
 * Extract flex layout tokens
 */
export async function extractFlexTokens(): Promise<FlexToken[]> {
  const flexLayouts: FlexToken[] = [];
  const flexMap = new Map<string, FlexToken>();
  
  // Find frames with auto-layout (flex)
  const frames = figma.currentPage.findAll(node => {
    if (node.type !== 'FRAME') return false;
    const frame = node as FrameNode;
    return frame.layoutMode !== 'NONE';
  }) as FrameNode[];
  
  frames.forEach(frame => {
    const direction = frame.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
    const gap = frame.itemSpacing || 0;
    const key = `${direction}-${gap}-${frame.layoutAlign}-${frame.counterAxisAlignItems}`;
    
    if (!flexMap.has(key)) {
      flexMap.set(key, {
        name: `flex-${direction}${gap > 0 ? `-gap-${gap}` : ''}`,
        direction: direction,
        wrap: frame.layoutWrap === 'WRAP',
        gap: gap,
        alignItems: mapAlignItems(frame.counterAxisAlignItems),
        justifyContent: mapJustifyContent(frame.primaryAxisAlignItems),
        description: `Flex ${direction} layout`
      });
    }
  });
  
  return Array.from(flexMap.values());
}

/**
 * Extract aspect ratio tokens
 */
export async function extractAspectRatioTokens(): Promise<AspectRatioToken[]> {
  const aspectRatios: AspectRatioToken[] = [];
  const ratioMap = new Map<string, { count: number; ratio: number }>();
  
  // Find rectangles and frames with consistent aspect ratios
  const nodes = figma.currentPage.findAll(node => 
    node.type === 'RECTANGLE' || node.type === 'FRAME'
  ) as (RectangleNode | FrameNode)[];
  
  nodes.forEach(node => {
    if (node.width > 0 && node.height > 0) {
      const ratio = node.width / node.height;
      const ratioStr = simplifyRatio(node.width, node.height);
      
      if (!ratioMap.has(ratioStr)) {
        ratioMap.set(ratioStr, { count: 0, ratio });
      }
      ratioMap.get(ratioStr)!.count++;
    }
  });
  
  // Add common ratios that appear frequently
  Array.from(ratioMap.entries())
    .filter(([_, { count }]) => count > 3)
    .forEach(([ratioStr, { ratio }]) => {
      // Check if it matches a common ratio
      const common = COMMON_ASPECT_RATIOS.find(r => 
        Math.abs(r.value - ratio) < 0.01
      );
      
      if (common) {
        aspectRatios.push(common);
      } else {
        aspectRatios.push({
          name: `aspect-${ratioStr.replace(':', '-')}`,
          ratio: ratioStr,
          value: ratio,
          description: `Custom aspect ratio ${ratioStr}`
        });
      }
    });
  
  return aspectRatios;
}

/**
 * Extract z-index tokens
 */
export async function extractZIndexTokens(): Promise<ZIndexToken[]> {
  const zIndexes: ZIndexToken[] = [];
  const zIndexValues = new Set<number>();
  
  // Analyze layer order in frames
  const frames = figma.currentPage.findAll(node => 
    node.type === 'FRAME' && node.children.length > 1
  ) as FrameNode[];
  
  frames.forEach(frame => {
    // In Figma, children are ordered from back to front
    frame.children.forEach((child, index) => {
      // Look for specific naming patterns that suggest z-index
      if (child.name.toLowerCase().includes('overlay') ||
          child.name.toLowerCase().includes('modal') ||
          child.name.toLowerCase().includes('dropdown') ||
          child.name.toLowerCase().includes('tooltip')) {
        zIndexValues.add((index + 1) * 10);
      }
    });
  });
  
  // Add standard z-index scale
  const standardScale = [0, 10, 20, 30, 40, 50];
  standardScale.forEach(value => {
    zIndexes.push({
      name: `z-${value}`,
      value: value,
      description: `Z-index ${value}`
    });
  });
  
  // Add any custom high values found
  Array.from(zIndexValues)
    .filter(v => v > 50)
    .sort((a, b) => a - b)
    .forEach(value => {
      zIndexes.push({
        name: `z-${value}`,
        value: value,
        description: `Z-index ${value} (custom)`
      });
    });
  
  return zIndexes;
}

/**
 * Extract breakpoint tokens based on frame sizes
 */
export function extractBreakpointTokens(): BreakpointToken[] {
  // For now, return default Tailwind breakpoints
  // In future, could analyze frame sizes to detect custom breakpoints
  return DEFAULT_BREAKPOINTS;
}

// Helper functions

function hasGridPattern(frame: FrameNode): boolean {
  if (frame.children.length < 2) return false;
  
  // Check if children are arranged in a grid-like pattern
  const positions = frame.children.map(child => ({
    x: child.x,
    y: child.y,
    width: child.width,
    height: child.height
  }));
  
  // Check for consistent spacing
  const rows = new Set(positions.map(p => Math.round(p.y)));
  const cols = new Set(positions.map(p => Math.round(p.x)));
  
  return rows.size > 1 || cols.size > 1;
}

function analyzeGridPattern(frame: FrameNode): { columns: number; gap: number } | null {
  const positions = frame.children.map(child => ({
    x: Math.round(child.x),
    y: Math.round(child.y),
    width: Math.round(child.width)
  }));
  
  // Find unique column positions
  const columnStarts = [...new Set(positions.map(p => p.x))].sort((a, b) => a - b);
  
  if (columnStarts.length < 2) return null;
  
  // Calculate gap
  const gaps: number[] = [];
  for (let i = 1; i < columnStarts.length; i++) {
    const prevEnd = positions.find(p => p.x === columnStarts[i - 1])!.x + 
                   positions.find(p => p.x === columnStarts[i - 1])!.width;
    const gap = columnStarts[i] - prevEnd;
    if (gap > 0) gaps.push(gap);
  }
  
  const avgGap = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b) / gaps.length) : 0;
  
  return {
    columns: columnStarts.length,
    gap: avgGap
  };
}

function simplifyRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(Math.round(width), Math.round(height));
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function mapAlignItems(figmaAlign: string): string {
  const alignMap: Record<string, string> = {
    'MIN': 'flex-start',
    'CENTER': 'center',
    'MAX': 'flex-end',
    'STRETCH': 'stretch',
    'BASELINE': 'baseline'
  };
  return alignMap[figmaAlign] || 'stretch';
}

function mapJustifyContent(figmaAlign: string): string {
  const justifyMap: Record<string, string> = {
    'MIN': 'flex-start',
    'CENTER': 'center',
    'MAX': 'flex-end',
    'SPACE_BETWEEN': 'space-between',
    'SPACE_AROUND': 'space-around',
    'SPACE_EVENLY': 'space-evenly'
  };
  return justifyMap[figmaAlign] || 'flex-start';
}