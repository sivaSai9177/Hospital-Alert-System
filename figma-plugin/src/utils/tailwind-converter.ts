/**
 * Tailwind CSS Converter Utilities
 * Converts design tokens to Tailwind CSS conventions
 */

/**
 * Tailwind font size scale with line heights
 * Values in rem with calculated line heights
 */
export const TAILWIND_FONT_SIZES = {
  'xs': { size: 0.75, lineHeight: 1 },     // 12px, line-height: 1rem
  'sm': { size: 0.875, lineHeight: 1.25 }, // 14px, line-height: 1.25rem
  'base': { size: 1, lineHeight: 1.5 },    // 16px, line-height: 1.5rem
  'lg': { size: 1.125, lineHeight: 1.75 }, // 18px, line-height: 1.75rem
  'xl': { size: 1.25, lineHeight: 1.75 },  // 20px, line-height: 1.75rem
  '2xl': { size: 1.5, lineHeight: 2 },     // 24px, line-height: 2rem
  '3xl': { size: 1.875, lineHeight: 2.25 },// 30px, line-height: 2.25rem
  '4xl': { size: 2.25, lineHeight: 2.5 },  // 36px, line-height: 2.5rem
  '5xl': { size: 3, lineHeight: 1 },       // 48px, line-height: 1
  '6xl': { size: 3.75, lineHeight: 1 },    // 60px, line-height: 1
  '7xl': { size: 4.5, lineHeight: 1 },     // 72px, line-height: 1
  '8xl': { size: 6, lineHeight: 1 },       // 96px, line-height: 1
  '9xl': { size: 8, lineHeight: 1 }        // 128px, line-height: 1
};

/**
 * Tailwind letter spacing (tracking) scale
 */
export const TAILWIND_LETTER_SPACING = {
  'tighter': -0.05,
  'tight': -0.025,
  'normal': 0,
  'wide': 0.025,
  'wider': 0.05,
  'widest': 0.1
};

/**
 * Tailwind line height (leading) values
 */
export const TAILWIND_LINE_HEIGHTS = {
  'none': 1,
  'tight': 1.25,
  'snug': 1.375,
  'normal': 1.5,
  'relaxed': 1.625,
  'loose': 2
};

/**
 * Convert pixel value to rem
 */
export function pxToRem(px: number, base: number = 16): number {
  return px / base;
}

/**
 * Convert rem to pixel value
 */
export function remToPx(rem: number, base: number = 16): number {
  return rem * base;
}

/**
 * Get Tailwind font size class from pixel value
 */
export function getTailwindFontSizeClass(fontSize: number): string {
  const sizeInRem = pxToRem(fontSize);
  
  // Find closest match
  let closestClass = 'base';
  let minDiff = Math.abs(sizeInRem - 1);
  
  for (const [className, config] of Object.entries(TAILWIND_FONT_SIZES)) {
    const diff = Math.abs(sizeInRem - config.size);
    if (diff < minDiff) {
      minDiff = diff;
      closestClass = className;
    }
  }
  
  return `text-${closestClass}`;
}

/**
 * Get Tailwind letter spacing class from em value
 */
export function getTailwindLetterSpacingClass(letterSpacing: number): string {
  if (letterSpacing === 0) return 'tracking-normal';
  
  // Find closest match
  let closestClass = 'normal';
  let minDiff = Math.abs(letterSpacing);
  
  for (const [className, value] of Object.entries(TAILWIND_LETTER_SPACING)) {
    const diff = Math.abs(letterSpacing - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestClass = className;
    }
  }
  
  return `tracking-${closestClass}`;
}

/**
 * Get Tailwind line height class from multiplier
 */
export function getTailwindLineHeightClass(lineHeight: number, fontSize: number): string {
  const multiplier = lineHeight / fontSize;
  
  // Find closest match
  let closestClass = 'normal';
  let minDiff = Math.abs(multiplier - 1.5);
  
  for (const [className, value] of Object.entries(TAILWIND_LINE_HEIGHTS)) {
    const diff = Math.abs(multiplier - value);
    if (diff < minDiff) {
      minDiff = diff;
      closestClass = className;
    }
  }
  
  return `leading-${closestClass}`;
}

/**
 * Convert color name to Tailwind format
 * e.g., "primary/500" -> "primary-500"
 */
export function convertToTailwindColorName(name: string): string {
  return name.replace(/\//g, '-');
}

/**
 * Extract color group and shade from name
 * e.g., "blue/500" -> { group: "blue", shade: "500" }
 */
export function extractColorParts(name: string): { group: string; shade: string } {
  const parts = name.split('/');
  if (parts.length === 1) {
    return { group: parts[0], shade: 'DEFAULT' };
  }
  
  const group = parts[0];
  const shade = parts.slice(1).join('-') || 'DEFAULT';
  
  return { group, shade };
}

/**
 * Convert RGB object to Tailwind color format
 */
export function rgbToTailwindColor(rgb: { r: number; g: number; b: number; a?: number }): string {
  // Tailwind expects RGB values in 0-255 range
  const r = Math.round(rgb.r <= 1 ? rgb.r * 255 : rgb.r);
  const g = Math.round(rgb.g <= 1 ? rgb.g * 255 : rgb.g);
  const b = Math.round(rgb.b <= 1 ? rgb.b * 255 : rgb.b);
  
  if (rgb.a !== undefined && rgb.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${rgb.a})`;
  }
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Generate Tailwind typography config from tokens
 */
export function generateTailwindTypography(typographyTokens: any[]): Record<string, any> {
  const typography: Record<string, any> = {};
  
  typographyTokens.forEach(token => {
    const sizeClass = getTailwindFontSizeClass(token.fontSize);
    const key = sizeClass.replace('text-', '');
    
    if (!typography[key]) {
      typography[key] = {
        fontSize: `${pxToRem(token.fontSize)}rem`,
        lineHeight: token.lineHeight ? `${pxToRem(token.lineHeight)}rem` : undefined,
        letterSpacing: token.letterSpacing ? `${token.letterSpacing}em` : undefined,
        fontWeight: token.fontWeight || undefined
      };
    }
  });
  
  return typography;
}

/**
 * Generate Tailwind color palette from tokens
 */
export function generateTailwindColors(colorTokens: any[]): Record<string, any> {
  const colors: Record<string, any> = {};
  
  colorTokens.forEach(token => {
    const { group, shade } = extractColorParts(token.name);
    
    if (!colors[group]) {
      colors[group] = {};
    }
    
    const colorValue = token.rgb 
      ? rgbToTailwindColor(token.rgb)
      : token.value;
    
    colors[group][shade] = colorValue;
  });
  
  return colors;
}

/**
 * Generate Tailwind spacing scale from tokens
 */
export function generateTailwindSpacing(spacingTokens: any[]): Record<string, string> {
  const spacing: Record<string, string> = {};
  
  spacingTokens.forEach(token => {
    const key = token.name.replace(/\//g, '-').replace(/spacing-/, '');
    spacing[key] = `${pxToRem(token.value)}rem`;
  });
  
  return spacing;
}

/**
 * Generate Tailwind gradients from tokens
 */
export function generateTailwindGradients(gradientTokens: any[]): Record<string, any> {
  const gradients: Record<string, any> = {};
  
  gradientTokens.forEach(token => {
    const key = token.name.replace(/\//g, '-').replace(/gradient-/, '');
    
    // Generate CSS gradient string
    let gradientValue = '';
    
    if (token.type === 'linear') {
      const direction = mapTailwindDirectionToCSS(token.direction || 'to-r');
      const colorStops = token.colorStops.map((stop: any) => {
        return stop.position !== undefined 
          ? `${stop.color} ${stop.position}%`
          : stop.color;
      }).join(', ');
      
      gradientValue = `linear-gradient(${direction}, ${colorStops})`;
    } else if (token.type === 'radial') {
      const colorStops = token.colorStops.map((stop: any) => {
        return stop.position !== undefined 
          ? `${stop.color} ${stop.position}%`
          : stop.color;
      }).join(', ');
      
      gradientValue = `radial-gradient(circle, ${colorStops})`;
    } else if (token.type === 'conic') {
      const colorStops = token.colorStops.map((stop: any) => {
        return stop.position !== undefined 
          ? `${stop.color} ${stop.position}%`
          : stop.color;
      }).join(', ');
      
      gradientValue = `conic-gradient(${colorStops})`;
    }
    
    gradients[key] = gradientValue;
  });
  
  return gradients;
}

/**
 * Map Tailwind direction to CSS gradient direction
 */
function mapTailwindDirectionToCSS(direction: string): string {
  const directionMap: Record<string, string> = {
    'to-t': 'to top',
    'to-tr': 'to top right',
    'to-r': 'to right',
    'to-br': 'to bottom right',
    'to-b': 'to bottom',
    'to-bl': 'to bottom left',
    'to-l': 'to left',
    'to-tl': 'to top left'
  };
  
  return directionMap[direction] || 'to right';
}

/**
 * Generate Tailwind container configuration from tokens
 */
export function generateTailwindContainers(containerTokens: any[]): Record<string, any> {
  const screens: Record<string, any> = {};
  
  containerTokens.forEach(token => {
    const key = token.name.replace(/container-/, '');
    screens[key] = {
      maxWidth: `${pxToRem(token.maxWidth)}rem`,
      padding: token.padding ? `${pxToRem(token.padding)}rem` : undefined
    };
  });
  
  return screens;
}

/**
 * Generate Tailwind grid templates from tokens
 */
export function generateTailwindGrids(gridTokens: any[]): Record<string, any> {
  const grids: Record<string, any> = {};
  
  gridTokens.forEach(token => {
    const key = token.name.replace(/grid-cols-/, '');
    grids[`grid-cols-${key}`] = `repeat(${token.columns}, minmax(0, 1fr))`;
    
    if (token.gap) {
      grids[`gap-${key}`] = `${pxToRem(token.gap)}rem`;
    }
  });
  
  return grids;
}

/**
 * Generate Tailwind aspect ratio utilities from tokens
 */
export function generateTailwindAspectRatios(aspectTokens: any[]): Record<string, any> {
  const aspects: Record<string, any> = {};
  
  aspectTokens.forEach(token => {
    const key = token.name.replace(/aspect-/, '');
    aspects[key] = token.ratio;
  });
  
  return aspects;
}

/**
 * Generate Tailwind z-index scale from tokens
 */
export function generateTailwindZIndex(zIndexTokens: any[]): Record<string, string> {
  const zIndex: Record<string, string> = {};
  
  zIndexTokens.forEach(token => {
    const key = token.name.replace(/z-/, '');
    zIndex[key] = token.value.toString();
  });
  
  return zIndex;
}

/**
 * Generate Tailwind filter utilities from tokens
 */
export function generateTailwindFilters(filterTokens: any[]): Record<string, any> {
  const filters: Record<string, any> = {};
  
  filterTokens.forEach(token => {
    const key = token.name.replace(/filter-/, '');
    const filterValues: string[] = [];
    
    if (token.blur !== undefined) {
      filterValues.push(`blur(${token.blur}px)`);
    }
    if (token.brightness !== undefined) {
      filterValues.push(`brightness(${token.brightness / 100})`);
    }
    if (token.contrast !== undefined) {
      filterValues.push(`contrast(${token.contrast / 100})`);
    }
    if (token.grayscale !== undefined) {
      filterValues.push(`grayscale(${token.grayscale / 100})`);
    }
    if (token.hueRotate !== undefined) {
      filterValues.push(`hue-rotate(${token.hueRotate}deg)`);
    }
    if (token.invert !== undefined) {
      filterValues.push(`invert(${token.invert / 100})`);
    }
    if (token.saturate !== undefined) {
      filterValues.push(`saturate(${token.saturate / 100})`);
    }
    if (token.sepia !== undefined) {
      filterValues.push(`sepia(${token.sepia / 100})`);
    }
    if (token.dropShadow) {
      const shadow = token.dropShadow;
      filterValues.push(`drop-shadow(${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${shadow.color})`);
    }
    
    filters[key] = filterValues.join(' ');
  });
  
  return filters;
}

/**
 * Generate Tailwind backdrop filter utilities from tokens
 */
export function generateTailwindBackdropFilters(backdropTokens: any[]): Record<string, any> {
  const backdropFilters: Record<string, any> = {};
  
  backdropTokens.forEach(token => {
    const key = token.name.replace(/backdrop-/, '');
    const filterValues: string[] = [];
    
    if (token.blur !== undefined) {
      filterValues.push(`blur(${token.blur}px)`);
    }
    if (token.brightness !== undefined) {
      filterValues.push(`brightness(${token.brightness / 100})`);
    }
    if (token.contrast !== undefined) {
      filterValues.push(`contrast(${token.contrast / 100})`);
    }
    if (token.grayscale !== undefined) {
      filterValues.push(`grayscale(${token.grayscale / 100})`);
    }
    if (token.hueRotate !== undefined) {
      filterValues.push(`hue-rotate(${token.hueRotate}deg)`);
    }
    if (token.invert !== undefined) {
      filterValues.push(`invert(${token.invert / 100})`);
    }
    if (token.saturate !== undefined) {
      filterValues.push(`saturate(${token.saturate / 100})`);
    }
    if (token.sepia !== undefined) {
      filterValues.push(`sepia(${token.sepia / 100})`);
    }
    
    backdropFilters[key] = filterValues.join(' ');
  });
  
  return backdropFilters;
}

/**
 * Generate Tailwind transition utilities from tokens
 */
export function generateTailwindTransitions(transitionTokens: any[]): Record<string, any> {
  const transitions: Record<string, any> = {
    transitionProperty: {},
    transitionDuration: {},
    transitionTimingFunction: {},
    transitionDelay: {}
  };
  
  transitionTokens.forEach(token => {
    const key = token.name.replace(/transition-/, '');
    
    // Add transition property
    if (token.property) {
      transitions.transitionProperty[key] = token.property;
    }
    
    // Add duration
    if (token.duration !== undefined) {
      transitions.transitionDuration[key] = `${token.duration}ms`;
    }
    
    // Add timing function
    if (token.timingFunction) {
      transitions.transitionTimingFunction[key] = token.timingFunction;
    }
    
    // Add delay
    if (token.delay !== undefined) {
      transitions.transitionDelay[key] = `${token.delay}ms`;
    }
  });
  
  return transitions;
}

/**
 * Generate Tailwind animation utilities from tokens
 */
export function generateTailwindAnimations(animationTokens: any[]): Record<string, any> {
  const animations: Record<string, any> = {
    animation: {},
    keyframes: {}
  };
  
  animationTokens.forEach(token => {
    const key = token.name.replace(/animate-/, '');
    
    // Build animation shorthand
    const animationParts: string[] = [];
    
    if (token.duration !== undefined) {
      animationParts.push(`${token.duration}ms`);
    }
    
    if (token.timingFunction) {
      animationParts.push(token.timingFunction);
    }
    
    if (token.delay !== undefined) {
      animationParts.push(`${token.delay}ms`);
    }
    
    if (token.iterationCount !== undefined) {
      animationParts.push(token.iterationCount === 'infinite' ? 'infinite' : `${token.iterationCount}`);
    }
    
    if (token.direction && token.direction !== 'normal') {
      animationParts.push(token.direction);
    }
    
    if (token.fillMode && token.fillMode !== 'none') {
      animationParts.push(token.fillMode);
    }
    
    // Add keyframe reference
    animationParts.unshift(key);
    
    animations.animation[key] = animationParts.join(' ');
    
    // Generate keyframes
    if (token.keyframes && token.keyframes.length > 0) {
      const keyframeObj: Record<string, any> = {};
      
      token.keyframes.forEach(keyframe => {
        const offsetKey = `${keyframe.offset}%`;
        const properties: Record<string, any> = {};
        
        if (keyframe.transform) {
          properties.transform = keyframe.transform;
        } else {
          // Build transform from individual properties
          const transforms: string[] = [];
          if (keyframe.translateX !== undefined) transforms.push(`translateX(${keyframe.translateX}%)`);
          if (keyframe.translateY !== undefined) transforms.push(`translateY(${keyframe.translateY}%)`);
          if (keyframe.scale !== undefined) transforms.push(`scale(${keyframe.scale})`);
          if (keyframe.rotate !== undefined) transforms.push(`rotate(${keyframe.rotate}deg)`);
          
          if (transforms.length > 0) {
            properties.transform = transforms.join(' ');
          }
        }
        
        if (keyframe.opacity !== undefined) properties.opacity = keyframe.opacity;
        if (keyframe.backgroundColor) properties.backgroundColor = keyframe.backgroundColor;
        if (keyframe.borderColor) properties.borderColor = keyframe.borderColor;
        if (keyframe.filter) properties.filter = keyframe.filter;
        
        keyframeObj[offsetKey] = properties;
      });
      
      animations.keyframes[key] = keyframeObj;
    }
  });
  
  return animations;
}

/**
 * Generate complete Tailwind theme from tokens
 */
export function generateTailwindTheme(tokens: any): any {
  const theme: any = {
    extend: {}
  };
  
  // Colors
  if (tokens.colors && tokens.colors.length > 0) {
    theme.extend.colors = generateTailwindColors(tokens.colors);
  }
  
  // Typography
  if (tokens.typography && tokens.typography.length > 0) {
    theme.extend.fontSize = generateTailwindTypography(tokens.typography);
  }
  
  // Spacing
  if (tokens.spacing && tokens.spacing.length > 0) {
    theme.extend.spacing = generateTailwindSpacing(tokens.spacing);
  }
  
  // Border Radius
  if (tokens.borderRadius && tokens.borderRadius.length > 0) {
    theme.extend.borderRadius = {};
    tokens.borderRadius.forEach(br => {
      const key = br.name.replace(/\//g, '-').replace(/radius-/, '');
      theme.extend.borderRadius[key] = `${pxToRem(br.value)}rem`;
    });
  }
  
  // Box Shadow
  if (tokens.shadows && tokens.shadows.length > 0) {
    theme.extend.boxShadow = {};
    tokens.shadows.forEach(shadow => {
      const key = shadow.name.replace(/\//g, '-').replace(/shadow-/, '');
      theme.extend.boxShadow[key] = shadow.value;
    });
  }
  
  // Gradients
  if (tokens.gradients && tokens.gradients.length > 0) {
    theme.extend.backgroundImage = generateTailwindGradients(tokens.gradients);
  }
  
  // Containers
  if (tokens.containers && tokens.containers.length > 0) {
    theme.extend.screens = generateTailwindContainers(tokens.containers);
  }
  
  // Breakpoints
  if (tokens.breakpoints && tokens.breakpoints.length > 0) {
    if (!theme.extend.screens) theme.extend.screens = {};
    tokens.breakpoints.forEach(bp => {
      theme.extend.screens[bp.name] = `${bp.minWidth}px`;
    });
  }
  
  // Grid Templates
  if (tokens.grids && tokens.grids.length > 0) {
    theme.extend.gridTemplateColumns = generateTailwindGrids(tokens.grids);
  }
  
  // Aspect Ratios
  if (tokens.aspectRatios && tokens.aspectRatios.length > 0) {
    theme.extend.aspectRatio = generateTailwindAspectRatios(tokens.aspectRatios);
  }
  
  // Z-Index
  if (tokens.zIndex && tokens.zIndex.length > 0) {
    theme.extend.zIndex = generateTailwindZIndex(tokens.zIndex);
  }
  
  // Filters
  if (tokens.filters && tokens.filters.length > 0) {
    if (!theme.extend.filter) theme.extend.filter = {};
    Object.assign(theme.extend.filter, generateTailwindFilters(tokens.filters));
  }
  
  // Backdrop Filters
  if (tokens.backdropFilters && tokens.backdropFilters.length > 0) {
    if (!theme.extend.backdropFilter) theme.extend.backdropFilter = {};
    Object.assign(theme.extend.backdropFilter, generateTailwindBackdropFilters(tokens.backdropFilters));
  }
  
  // Transitions
  if (tokens.transitions && tokens.transitions.length > 0) {
    const transitionConfig = generateTailwindTransitions(tokens.transitions);
    if (Object.keys(transitionConfig.transitionProperty).length > 0) {
      theme.extend.transitionProperty = transitionConfig.transitionProperty;
    }
    if (Object.keys(transitionConfig.transitionDuration).length > 0) {
      theme.extend.transitionDuration = transitionConfig.transitionDuration;
    }
    if (Object.keys(transitionConfig.transitionTimingFunction).length > 0) {
      theme.extend.transitionTimingFunction = transitionConfig.transitionTimingFunction;
    }
    if (Object.keys(transitionConfig.transitionDelay).length > 0) {
      theme.extend.transitionDelay = transitionConfig.transitionDelay;
    }
  }
  
  // Animations
  if (tokens.animations && tokens.animations.length > 0) {
    const animationConfig = generateTailwindAnimations(tokens.animations);
    if (Object.keys(animationConfig.animation).length > 0) {
      theme.extend.animation = animationConfig.animation;
    }
    if (Object.keys(animationConfig.keyframes).length > 0) {
      theme.extend.keyframes = animationConfig.keyframes;
    }
  }
  
  // Flex/Gap utilities are already covered by spacing tokens
  
  return theme;
}