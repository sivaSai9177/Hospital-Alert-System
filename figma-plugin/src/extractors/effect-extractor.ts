/**
 * Effect Token Extractor
 * Extracts filter, backdrop, and interaction tokens from Figma designs
 */

import { 
  FilterToken, 
  BackdropFilterToken, 
  InteractionToken, 
  ScrollToken,
  AppearanceToken 
} from '../../shared/types/design-tokens';

// Common filter presets based on Tailwind CSS
const FILTER_PRESETS = {
  blur: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 40,
    '3xl': 64
  },
  brightness: {
    0: 0,
    50: 50,
    75: 75,
    90: 90,
    95: 95,
    100: 100,
    105: 105,
    110: 110,
    125: 125,
    150: 150,
    200: 200
  },
  contrast: {
    0: 0,
    50: 50,
    75: 75,
    100: 100,
    125: 125,
    150: 150,
    200: 200
  },
  grayscale: {
    0: 0,
    100: 100
  },
  hueRotate: {
    0: 0,
    15: 15,
    30: 30,
    60: 60,
    90: 90,
    180: 180
  },
  invert: {
    0: 0,
    100: 100
  },
  saturate: {
    0: 0,
    50: 50,
    100: 100,
    150: 150,
    200: 200
  },
  sepia: {
    0: 0,
    100: 100
  }
};

/**
 * Extract filter tokens from effect styles
 */
export async function extractFilterTokens(): Promise<FilterToken[]> {
  const filters: FilterToken[] = [];
  const effectStyles = await figma.getLocalEffectStylesAsync();
  
  // Analyze effect styles for filter-like effects
  for (const style of effectStyles) {
    const filterToken: FilterToken = {
      name: style.name,
      description: style.description
    };
    
    let hasFilter = false;
    
    // Check for blur effects
    const blurEffect = style.effects.find(e => e.type === 'LAYER_BLUR');
    if (blurEffect && 'radius' in blurEffect) {
      filterToken.blur = blurEffect.radius;
      hasFilter = true;
    }
    
    // Check for drop shadow (can be used as filter drop-shadow)
    const dropShadow = style.effects.find(e => e.type === 'DROP_SHADOW');
    if (dropShadow && 'color' in dropShadow && 'offset' in dropShadow) {
      filterToken.dropShadow = {
        color: rgbToHex(dropShadow.color.r, dropShadow.color.g, dropShadow.color.b, dropShadow.color.a),
        offset: dropShadow.offset,
        radius: dropShadow.radius,
        spread: dropShadow.spread || 0,
        opacity: dropShadow.color.a
      };
      hasFilter = true;
    }
    
    if (hasFilter) {
      filters.push(filterToken);
    }
  }
  
  // Add common filter presets if not already defined
  addFilterPresets(filters);
  
  return filters;
}

/**
 * Extract backdrop filter tokens
 */
export async function extractBackdropFilterTokens(): Promise<BackdropFilterToken[]> {
  const backdropFilters: BackdropFilterToken[] = [];
  
  // Look for components with glass morphism or backdrop effects
  const components = figma.currentPage.findAll(node => 
    node.type === 'COMPONENT' && 
    (node.name.toLowerCase().includes('glass') || 
     node.name.toLowerCase().includes('backdrop') ||
     node.name.toLowerCase().includes('blur'))
  ) as ComponentNode[];
  
  for (const component of components) {
    // Check for semi-transparent backgrounds with blur
    const fills = component.fills as Paint[];
    const hasTransparency = fills.some(fill => 
      fill.type === 'SOLID' && fill.opacity && fill.opacity < 1
    );
    
    const effects = component.effects;
    const hasBlur = effects.some(e => e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR');
    
    if (hasTransparency && hasBlur) {
      const blurEffect = effects.find(e => e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR');
      
      backdropFilters.push({
        name: component.name,
        blur: blurEffect && 'radius' in blurEffect ? blurEffect.radius : 8,
        saturate: 150, // Common for glass morphism
        brightness: 105,
        description: 'Glass morphism effect'
      });
    }
  }
  
  // Add standard backdrop filter presets
  if (backdropFilters.length === 0) {
    backdropFilters.push(
      {
        name: 'backdrop-blur-sm',
        blur: 4,
        description: 'Small backdrop blur'
      },
      {
        name: 'backdrop-blur-md',
        blur: 12,
        description: 'Medium backdrop blur'
      },
      {
        name: 'backdrop-blur-lg',
        blur: 24,
        description: 'Large backdrop blur'
      },
      {
        name: 'backdrop-glass',
        blur: 16,
        saturate: 150,
        brightness: 105,
        description: 'Glass morphism preset'
      }
    );
  }
  
  return backdropFilters;
}

/**
 * Extract interaction tokens from components
 */
export async function extractInteractionTokens(): Promise<InteractionToken[]> {
  const interactions: InteractionToken[] = [];
  const interactionMap = new Map<string, InteractionToken>();
  
  // Analyze components for interaction patterns
  const components = figma.currentPage.findAll(node => node.type === 'COMPONENT') as ComponentNode[];
  
  for (const component of components) {
    const name = component.name.toLowerCase();
    const token: InteractionToken = {
      name: component.name,
      description: component.description
    };
    
    // Detect disabled states
    if (name.includes('disabled') || name.includes('inactive')) {
      token.pointerEvents = 'none';
      token.userSelect = 'none';
      token.cursor = 'not-allowed';
    }
    
    // Detect interactive elements
    if (name.includes('button') || name.includes('link') || name.includes('clickable')) {
      token.cursor = 'pointer';
      token.userSelect = 'none';
    }
    
    // Detect draggable elements
    if (name.includes('drag') || name.includes('handle') || name.includes('grip')) {
      token.cursor = 'move';
      token.touchAction = 'none';
    }
    
    // Detect resizable elements
    if (name.includes('resize') || name.includes('splitter')) {
      if (name.includes('horizontal')) {
        token.resize = 'horizontal';
        token.cursor = 'ew-resize';
      } else if (name.includes('vertical')) {
        token.resize = 'vertical';
        token.cursor = 'ns-resize';
      } else {
        token.resize = 'both';
        token.cursor = 'nwse-resize';
      }
    }
    
    // Detect text selection areas
    if (name.includes('text') || name.includes('input') || name.includes('textarea')) {
      token.userSelect = 'text';
      token.cursor = 'text';
    }
    
    // Only add if we detected interaction properties
    if (Object.keys(token).length > 2) { // name + description
      interactionMap.set(token.name, token);
    }
  }
  
  // Add standard interaction presets
  addInteractionPresets(interactionMap);
  
  return Array.from(interactionMap.values());
}

/**
 * Extract scroll behavior tokens
 */
export async function extractScrollTokens(): Promise<ScrollToken[]> {
  const scrollTokens: ScrollToken[] = [];
  
  // Look for scrollable frames
  const frames = figma.currentPage.findAll(node => 
    node.type === 'FRAME' && 
    (node.name.toLowerCase().includes('scroll') ||
     node.name.toLowerCase().includes('carousel') ||
     node.name.toLowerCase().includes('list'))
  ) as FrameNode[];
  
  for (const frame of frames) {
    const name = frame.name.toLowerCase();
    const token: ScrollToken = {
      name: frame.name,
      description: frame.description || 'Scrollable container'
    };
    
    // Detect scroll snap containers
    if (name.includes('carousel') || name.includes('snap')) {
      token.scrollSnapType = name.includes('horizontal') ? 'x' : 'y';
      token.scrollSnapAlign = 'start';
      token.scrollBehavior = 'smooth';
    }
    
    // Detect smooth scroll areas
    if (name.includes('smooth')) {
      token.scrollBehavior = 'smooth';
    }
    
    // Detect overflow behavior
    if (name.includes('contain')) {
      token.overscrollBehavior = 'contain';
    }
    
    scrollTokens.push(token);
  }
  
  // Add default scroll behavior tokens
  if (scrollTokens.length === 0) {
    scrollTokens.push(
      {
        name: 'scroll-smooth',
        scrollBehavior: 'smooth',
        description: 'Smooth scrolling behavior'
      },
      {
        name: 'scroll-snap-x',
        scrollSnapType: 'x',
        scrollSnapAlign: 'start',
        description: 'Horizontal scroll snapping'
      },
      {
        name: 'scroll-snap-y',
        scrollSnapType: 'y',
        scrollSnapAlign: 'start',
        description: 'Vertical scroll snapping'
      }
    );
  }
  
  return scrollTokens;
}

/**
 * Extract appearance tokens
 */
export async function extractAppearanceTokens(): Promise<AppearanceToken[]> {
  const appearances: AppearanceToken[] = [];
  
  // Look for theme-related components
  const themeComponents = figma.currentPage.findAll(node => 
    node.type === 'COMPONENT' && 
    (node.name.toLowerCase().includes('theme') ||
     node.name.toLowerCase().includes('mode') ||
     node.name.toLowerCase().includes('scheme'))
  ) as ComponentNode[];
  
  for (const component of themeComponents) {
    const name = component.name.toLowerCase();
    const token: AppearanceToken = {
      name: component.name,
      description: component.description
    };
    
    if (name.includes('dark')) {
      token.colorScheme = 'dark';
    } else if (name.includes('light')) {
      token.colorScheme = 'light';
    }
    
    // Extract accent colors
    const fills = component.fills as Paint[];
    const solidFill = fills.find(f => f.type === 'SOLID');
    if (solidFill && 'color' in solidFill) {
      token.accentColor = rgbToHex(
        solidFill.color.r,
        solidFill.color.g,
        solidFill.color.b
      );
    }
    
    appearances.push(token);
  }
  
  // Add default appearance tokens
  if (appearances.length === 0) {
    appearances.push(
      {
        name: 'color-scheme-light',
        colorScheme: 'light',
        description: 'Light color scheme'
      },
      {
        name: 'color-scheme-dark',
        colorScheme: 'dark',
        description: 'Dark color scheme'
      },
      {
        name: 'color-scheme-auto',
        colorScheme: 'light dark',
        description: 'Automatic color scheme'
      }
    );
  }
  
  return appearances;
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

function addFilterPresets(filters: FilterToken[]): void {
  const existingNames = new Set(filters.map(f => f.name));
  
  // Add blur presets
  Object.entries(FILTER_PRESETS.blur).forEach(([key, value]) => {
    const name = `blur-${key}`;
    if (!existingNames.has(name)) {
      filters.push({
        name,
        blur: value,
        description: `Blur ${key} (${value}px)`
      });
    }
  });
  
  // Add brightness presets
  Object.entries(FILTER_PRESETS.brightness).forEach(([key, value]) => {
    const name = `brightness-${key}`;
    if (!existingNames.has(name)) {
      filters.push({
        name,
        brightness: value,
        description: `Brightness ${value}%`
      });
    }
  });
  
  // Add contrast presets
  Object.entries(FILTER_PRESETS.contrast).forEach(([key, value]) => {
    const name = `contrast-${key}`;
    if (!existingNames.has(name)) {
      filters.push({
        name,
        contrast: value,
        description: `Contrast ${value}%`
      });
    }
  });
}

function addInteractionPresets(interactions: Map<string, InteractionToken>): void {
  const presets: InteractionToken[] = [
    {
      name: 'pointer-events-none',
      pointerEvents: 'none',
      description: 'Disable pointer events'
    },
    {
      name: 'user-select-none',
      userSelect: 'none',
      description: 'Disable text selection'
    },
    {
      name: 'user-select-all',
      userSelect: 'all',
      description: 'Select all on click'
    },
    {
      name: 'cursor-pointer',
      cursor: 'pointer',
      description: 'Clickable element'
    },
    {
      name: 'cursor-not-allowed',
      cursor: 'not-allowed',
      pointerEvents: 'none',
      description: 'Disabled element'
    },
    {
      name: 'resize-none',
      resize: 'none',
      description: 'Prevent resizing'
    },
    {
      name: 'touch-manipulation',
      touchAction: 'manipulation',
      description: 'Enable panning and pinch zoom'
    }
  ];
  
  presets.forEach(preset => {
    if (!interactions.has(preset.name)) {
      interactions.set(preset.name, preset);
    }
  });
}