/**
 * Code Generator for Design Tokens
 * Generates code files from extracted Figma tokens
 */

import { generateTailwindTheme, pxToRem, convertToTailwindColorName } from '../../utils/tailwind-converter';

export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}

/**
 * Generate CSS variables from tokens
 */
function generateCSSVariables(tokens: any): string {
  const lines = [
    '/* Generated from Figma tokens */',
    '/* Tailwind CSS compatible format */',
    '',
    '@layer base {',
    '  :root {'
  ];
  
  // Colors
  if (tokens.colors && tokens.colors.length > 0) {
    lines.push('    /* Colors */');
    tokens.colors.forEach(color => {
      const cssVarName = `--color-${convertToTailwindColorName(color.name)}`;
      if (color.rgb) {
        const r = Math.round(color.rgb.r * 255);
        const g = Math.round(color.rgb.g * 255);
        const b = Math.round(color.rgb.b * 255);
        lines.push(`    ${cssVarName}: ${r} ${g} ${b};`);
      } else if (color.value) {
        lines.push(`    ${cssVarName}: ${color.value};`);
      }
    });
    lines.push('');
  }
  
  // Typography
  if (tokens.typography && tokens.typography.length > 0) {
    lines.push('    /* Typography */');
    const fontSizes = new Set();
    tokens.typography.forEach(typo => {
      const size = typo.name.replace('text-', '').split('/')[0];
      if (!fontSizes.has(size)) {
        fontSizes.add(size);
        lines.push(`    --font-size-${size}: ${pxToRem(typo.fontSize)}rem;`);
        lines.push(`    --line-height-${size}: ${pxToRem(typo.lineHeight)}rem;`);
      }
    });
    lines.push('');
  }
  
  // Spacing
  if (tokens.spacing && tokens.spacing.length > 0) {
    lines.push('    /* Spacing */');
    tokens.spacing.forEach(spacing => {
      const key = spacing.name.replace(/spacing-/, '').replace(/\//g, '-');
      lines.push(`    --spacing-${key}: ${pxToRem(spacing.value)}rem;`);
    });
    lines.push('');
  }
  
  // Gradients
  if (tokens.gradients && tokens.gradients.length > 0) {
    lines.push('    /* Gradients */');
    tokens.gradients.forEach(gradient => {
      const key = gradient.name.replace(/\//g, '-').replace(/gradient-/, '');
      let gradientValue = '';
      
      if (gradient.type === 'linear') {
        const direction = mapTailwindDirectionToCSS(gradient.direction || 'to-r');
        const colorStops = gradient.colorStops.map(stop => {
          return stop.position !== undefined 
            ? `${stop.color} ${stop.position}%`
            : stop.color;
        }).join(', ');
        gradientValue = `linear-gradient(${direction}, ${colorStops})`;
      } else if (gradient.type === 'radial') {
        const colorStops = gradient.colorStops.map(stop => {
          return stop.position !== undefined 
            ? `${stop.color} ${stop.position}%`
            : stop.color;
        }).join(', ');
        gradientValue = `radial-gradient(circle, ${colorStops})`;
      } else if (gradient.type === 'conic') {
        const colorStops = gradient.colorStops.map(stop => {
          return stop.position !== undefined 
            ? `${stop.color} ${stop.position}%`
            : stop.color;
        }).join(', ');
        gradientValue = `conic-gradient(${colorStops})`;
      }
      
      lines.push(`    --gradient-${key}: ${gradientValue};`);
    });
    lines.push('');
  }
  
  // Containers
  if (tokens.containers && tokens.containers.length > 0) {
    lines.push('    /* Containers */');
    tokens.containers.forEach(container => {
      const key = container.name.replace(/\//g, '-');
      lines.push(`    --${key}-max-width: ${pxToRem(container.maxWidth)}rem;`);
      if (container.padding) {
        lines.push(`    --${key}-padding: ${pxToRem(container.padding)}rem;`);
      }
    });
    lines.push('');
  }
  
  // Breakpoints
  if (tokens.breakpoints && tokens.breakpoints.length > 0) {
    lines.push('    /* Breakpoints */');
    tokens.breakpoints.forEach(breakpoint => {
      lines.push(`    --breakpoint-${breakpoint.name}: ${breakpoint.minWidth}px;`);
    });
    lines.push('');
  }
  
  // Grid Templates
  if (tokens.grids && tokens.grids.length > 0) {
    lines.push('    /* Grid Templates */');
    tokens.grids.forEach(grid => {
      const key = grid.name.replace(/\//g, '-');
      lines.push(`    --${key}: repeat(${grid.columns}, minmax(0, 1fr));`);
      if (grid.gap) {
        lines.push(`    --${key}-gap: ${pxToRem(grid.gap)}rem;`);
      }
    });
    lines.push('');
  }
  
  // Aspect Ratios
  if (tokens.aspectRatios && tokens.aspectRatios.length > 0) {
    lines.push('    /* Aspect Ratios */');
    tokens.aspectRatios.forEach(aspect => {
      const key = aspect.name.replace(/\//g, '-');
      lines.push(`    --${key}: ${aspect.ratio};`);
    });
    lines.push('');
  }
  
  // Z-Index
  if (tokens.zIndex && tokens.zIndex.length > 0) {
    lines.push('    /* Z-Index Scale */');
    tokens.zIndex.forEach(z => {
      lines.push(`    --${z.name}: ${z.value};`);
    });
    lines.push('');
  }
  
  // Filters
  if (tokens.filters && tokens.filters.length > 0) {
    lines.push('    /* Filters */');
    tokens.filters.forEach(filter => {
      const key = filter.name.replace(/\//g, '-');
      const filterValues: string[] = [];
      
      if (filter.blur !== undefined) filterValues.push(`blur(${filter.blur}px)`);
      if (filter.brightness !== undefined) filterValues.push(`brightness(${filter.brightness}%)`);
      if (filter.contrast !== undefined) filterValues.push(`contrast(${filter.contrast}%)`);
      if (filter.grayscale !== undefined) filterValues.push(`grayscale(${filter.grayscale}%)`);
      if (filter.hueRotate !== undefined) filterValues.push(`hue-rotate(${filter.hueRotate}deg)`);
      if (filter.invert !== undefined) filterValues.push(`invert(${filter.invert}%)`);
      if (filter.saturate !== undefined) filterValues.push(`saturate(${filter.saturate}%)`);
      if (filter.sepia !== undefined) filterValues.push(`sepia(${filter.sepia}%)`);
      
      if (filterValues.length > 0) {
        lines.push(`    --filter-${key}: ${filterValues.join(' ')};`);
      }
    });
    lines.push('');
  }
  
  // Backdrop Filters
  if (tokens.backdropFilters && tokens.backdropFilters.length > 0) {
    lines.push('    /* Backdrop Filters */');
    tokens.backdropFilters.forEach(filter => {
      const key = filter.name.replace(/\//g, '-');
      const filterValues: string[] = [];
      
      if (filter.blur !== undefined) filterValues.push(`blur(${filter.blur}px)`);
      if (filter.brightness !== undefined) filterValues.push(`brightness(${filter.brightness}%)`);
      if (filter.contrast !== undefined) filterValues.push(`contrast(${filter.contrast}%)`);
      if (filter.grayscale !== undefined) filterValues.push(`grayscale(${filter.grayscale}%)`);
      if (filter.hueRotate !== undefined) filterValues.push(`hue-rotate(${filter.hueRotate}deg)`);
      if (filter.invert !== undefined) filterValues.push(`invert(${filter.invert}%)`);
      if (filter.saturate !== undefined) filterValues.push(`saturate(${filter.saturate}%)`);
      if (filter.sepia !== undefined) filterValues.push(`sepia(${filter.sepia}%)`);
      
      if (filterValues.length > 0) {
        lines.push(`    --${key}: ${filterValues.join(' ')};`);
      }
    });
    lines.push('');
  }
  
  // Scroll Behavior
  if (tokens.scrollBehavior && tokens.scrollBehavior.length > 0) {
    lines.push('    /* Scroll Behavior */');
    tokens.scrollBehavior.forEach(scroll => {
      const key = scroll.name.replace(/\//g, '-');
      if (scroll.scrollBehavior) {
        lines.push(`    --${key}-behavior: ${scroll.scrollBehavior};`);
      }
      if (scroll.scrollSnapType) {
        lines.push(`    --${key}-snap-type: ${scroll.scrollSnapType};`);
      }
      if (scroll.scrollSnapAlign) {
        lines.push(`    --${key}-snap-align: ${scroll.scrollSnapAlign};`);
      }
    });
    lines.push('');
  }
  
  // Transitions
  if (tokens.transitions && tokens.transitions.length > 0) {
    lines.push('    /* Transitions */');
    tokens.transitions.forEach(transition => {
      const key = transition.name.replace(/\//g, '-');
      if (transition.property) {
        lines.push(`    --${key}-property: ${transition.property};`);
      }
      if (transition.duration !== undefined) {
        lines.push(`    --${key}-duration: ${transition.duration}ms;`);
      }
      if (transition.timingFunction) {
        lines.push(`    --${key}-timing: ${transition.timingFunction};`);
      }
      if (transition.delay !== undefined) {
        lines.push(`    --${key}-delay: ${transition.delay}ms;`);
      }
    });
    lines.push('');
  }
  
  // Animations
  if (tokens.animations && tokens.animations.length > 0) {
    lines.push('    /* Animations */');
    tokens.animations.forEach(animation => {
      const key = animation.name.replace(/\//g, '-');
      lines.push(`    --${key}-duration: ${animation.duration}ms;`);
      if (animation.timingFunction) {
        lines.push(`    --${key}-timing: ${animation.timingFunction};`);
      }
      if (animation.delay !== undefined) {
        lines.push(`    --${key}-delay: ${animation.delay}ms;`);
      }
      if (animation.iterationCount !== undefined) {
        lines.push(`    --${key}-iterations: ${animation.iterationCount};`);
      }
    });
    lines.push('');
  }
  
  lines.push('  }');
  lines.push('}');
  
  // Add keyframes after root
  if (tokens.animations && tokens.animations.length > 0) {
    lines.push('');
    lines.push('/* Animation Keyframes */');
    tokens.animations.forEach(animation => {
      if (animation.keyframes && animation.keyframes.length > 0) {
        lines.push(`@keyframes ${animation.name.replace(/animate-/, '')} {`);
        animation.keyframes.forEach(keyframe => {
          lines.push(`  ${keyframe.offset}% {`);
          if (keyframe.transform || keyframe.translateX !== undefined || keyframe.translateY !== undefined || 
              keyframe.scale !== undefined || keyframe.rotate !== undefined) {
            const transforms: string[] = [];
            if (keyframe.transform) {
              transforms.push(keyframe.transform);
            } else {
              if (keyframe.translateX !== undefined) transforms.push(`translateX(${keyframe.translateX}%)`);
              if (keyframe.translateY !== undefined) transforms.push(`translateY(${keyframe.translateY}%)`);
              if (keyframe.scale !== undefined) transforms.push(`scale(${keyframe.scale})`);
              if (keyframe.rotate !== undefined) transforms.push(`rotate(${keyframe.rotate}deg)`);
            }
            if (transforms.length > 0) {
              lines.push(`    transform: ${transforms.join(' ')};`);
            }
          }
          if (keyframe.opacity !== undefined) lines.push(`    opacity: ${keyframe.opacity};`);
          if (keyframe.backgroundColor) lines.push(`    background-color: ${keyframe.backgroundColor};`);
          if (keyframe.borderColor) lines.push(`    border-color: ${keyframe.borderColor};`);
          if (keyframe.filter) lines.push(`    filter: ${keyframe.filter};`);
          lines.push('  }');
        });
        lines.push('}');
      }
    });
  }
  
  // Add helper function
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
  
  return lines.join('\n');
}

/**
 * Generate TypeScript theme constants
 */
function generateThemeConstants(tokens: any): string {
  const lines = ['// Generated from Figma tokens'];
  lines.push("import { StyleSheet } from 'react-native';");
  lines.push('');
  lines.push('export const theme = {');
  
  // Colors
  if (tokens.colors && tokens.colors.length > 0) {
    lines.push('  colors: {');
    tokens.colors.forEach(color => {
      const key = color.name.replace(/\//g, '_').replace(/-/g, '_');
      if (color.rgb) {
        const r = Math.round(color.rgb.r * 255);
        const g = Math.round(color.rgb.g * 255);
        const b = Math.round(color.rgb.b * 255);
        lines.push(`    ${key}: 'rgb(${r}, ${g}, ${b})',`);
      } else if (color.value) {
        lines.push(`    ${key}: '${color.value}',`);
      }
    });
    lines.push('  },');
  }
  
  // Spacing
  if (tokens.spacing && tokens.spacing.length > 0) {
    lines.push('  spacing: {');
    tokens.spacing.forEach(spacing => {
      const key = spacing.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: ${spacing.value},`);
    });
    lines.push('  },');
  }
  
  // Typography
  if (tokens.typography && tokens.typography.length > 0) {
    lines.push('  typography: {');
    tokens.typography.forEach(typo => {
      const key = typo.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      lines.push(`      fontSize: ${typo.fontSize},`);
      lines.push(`      fontWeight: ${typo.fontWeight || 400},`);
      lines.push(`      lineHeight: ${typo.lineHeight.value || typo.lineHeight},`);
      lines.push(`      letterSpacing: ${typo.letterSpacing.value || typo.letterSpacing},`);
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Shadows
  if (tokens.shadows && tokens.shadows.length > 0) {
    lines.push('  shadows: {');
    tokens.shadows.forEach(shadow => {
      const key = shadow.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      if (shadow.effects && shadow.effects.length > 0) {
        const effect = shadow.effects[0];
        lines.push(`      shadowColor: 'rgba(0, 0, 0, ${effect.color.a || 1})',`);
        lines.push(`      shadowOffset: { width: ${effect.offset.x}, height: ${effect.offset.y} },`);
        lines.push(`      shadowRadius: ${effect.radius},`);
        lines.push(`      shadowOpacity: 1,`);
        lines.push(`      elevation: ${Math.round(effect.radius / 2)}, // Android`);
      }
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Border Radius
  if (tokens.borderRadius && tokens.borderRadius.length > 0) {
    lines.push('  borderRadius: {');
    tokens.borderRadius.forEach(br => {
      const key = br.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: ${br.value},`);
    });
    lines.push('  },');
  }
  
  // Gradients
  if (tokens.gradients && tokens.gradients.length > 0) {
    lines.push('  gradients: {');
    tokens.gradients.forEach(gradient => {
      const key = gradient.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      lines.push(`      type: '${gradient.type}',`);
      if (gradient.direction) {
        lines.push(`      direction: '${gradient.direction}',`);
      }
      lines.push(`      colorStops: [`);
      gradient.colorStops.forEach(stop => {
        lines.push(`        { color: '${stop.color}', position: ${stop.position || 'undefined'} },`);
      });
      lines.push('      ],');
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Containers
  if (tokens.containers && tokens.containers.length > 0) {
    lines.push('  containers: {');
    tokens.containers.forEach(container => {
      const key = container.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      lines.push(`      maxWidth: ${container.maxWidth},`);
      if (container.padding) {
        lines.push(`      padding: ${container.padding},`);
      }
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Breakpoints
  if (tokens.breakpoints && tokens.breakpoints.length > 0) {
    lines.push('  breakpoints: {');
    tokens.breakpoints.forEach(breakpoint => {
      lines.push(`    ${breakpoint.name}: ${breakpoint.minWidth},`);
    });
    lines.push('  },');
  }
  
  // Grids
  if (tokens.grids && tokens.grids.length > 0) {
    lines.push('  grids: {');
    tokens.grids.forEach(grid => {
      const key = grid.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      lines.push(`      columns: ${grid.columns},`);
      if (grid.gap) {
        lines.push(`      gap: ${grid.gap},`);
      }
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Flex Layouts
  if (tokens.flexLayouts && tokens.flexLayouts.length > 0) {
    lines.push('  flexLayouts: {');
    tokens.flexLayouts.forEach(flex => {
      const key = flex.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      if (flex.direction) lines.push(`      direction: '${flex.direction}',`);
      if (flex.wrap !== undefined) lines.push(`      wrap: ${flex.wrap},`);
      if (flex.gap) lines.push(`      gap: ${flex.gap},`);
      if (flex.alignItems) lines.push(`      alignItems: '${flex.alignItems}',`);
      if (flex.justifyContent) lines.push(`      justifyContent: '${flex.justifyContent}',`);
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Aspect Ratios
  if (tokens.aspectRatios && tokens.aspectRatios.length > 0) {
    lines.push('  aspectRatios: {');
    tokens.aspectRatios.forEach(aspect => {
      const key = aspect.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      lines.push(`      ratio: '${aspect.ratio}',`);
      lines.push(`      value: ${aspect.value},`);
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Z-Index
  if (tokens.zIndex && tokens.zIndex.length > 0) {
    lines.push('  zIndex: {');
    tokens.zIndex.forEach(z => {
      const key = z.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: ${z.value},`);
    });
    lines.push('  },');
  }
  
  // Filters
  if (tokens.filters && tokens.filters.length > 0) {
    lines.push('  filters: {');
    tokens.filters.forEach(filter => {
      const key = filter.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      if (filter.blur !== undefined) lines.push(`      blur: ${filter.blur},`);
      if (filter.brightness !== undefined) lines.push(`      brightness: ${filter.brightness},`);
      if (filter.contrast !== undefined) lines.push(`      contrast: ${filter.contrast},`);
      if (filter.grayscale !== undefined) lines.push(`      grayscale: ${filter.grayscale},`);
      if (filter.hueRotate !== undefined) lines.push(`      hueRotate: ${filter.hueRotate},`);
      if (filter.invert !== undefined) lines.push(`      invert: ${filter.invert},`);
      if (filter.saturate !== undefined) lines.push(`      saturate: ${filter.saturate},`);
      if (filter.sepia !== undefined) lines.push(`      sepia: ${filter.sepia},`);
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Backdrop Filters
  if (tokens.backdropFilters && tokens.backdropFilters.length > 0) {
    lines.push('  backdropFilters: {');
    tokens.backdropFilters.forEach(filter => {
      const key = filter.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      if (filter.blur !== undefined) lines.push(`      blur: ${filter.blur},`);
      if (filter.brightness !== undefined) lines.push(`      brightness: ${filter.brightness},`);
      if (filter.contrast !== undefined) lines.push(`      contrast: ${filter.contrast},`);
      if (filter.grayscale !== undefined) lines.push(`      grayscale: ${filter.grayscale},`);
      if (filter.hueRotate !== undefined) lines.push(`      hueRotate: ${filter.hueRotate},`);
      if (filter.invert !== undefined) lines.push(`      invert: ${filter.invert},`);
      if (filter.saturate !== undefined) lines.push(`      saturate: ${filter.saturate},`);
      if (filter.sepia !== undefined) lines.push(`      sepia: ${filter.sepia},`);
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Interactions
  if (tokens.interactions && tokens.interactions.length > 0) {
    lines.push('  interactions: {');
    tokens.interactions.forEach(interaction => {
      const key = interaction.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      if (interaction.pointerEvents) lines.push(`      pointerEvents: '${interaction.pointerEvents}',`);
      if (interaction.resize) lines.push(`      resize: '${interaction.resize}',`);
      if (interaction.touchAction) lines.push(`      touchAction: '${interaction.touchAction}',`);
      if (interaction.userSelect) lines.push(`      userSelect: '${interaction.userSelect}',`);
      if (interaction.cursor) lines.push(`      cursor: '${interaction.cursor}',`);
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Scroll Behavior
  if (tokens.scrollBehavior && tokens.scrollBehavior.length > 0) {
    lines.push('  scrollBehavior: {');
    tokens.scrollBehavior.forEach(scroll => {
      const key = scroll.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      if (scroll.scrollBehavior) lines.push(`      behavior: '${scroll.scrollBehavior}',`);
      if (scroll.scrollSnapType) lines.push(`      snapType: '${scroll.scrollSnapType}',`);
      if (scroll.scrollSnapAlign) lines.push(`      snapAlign: '${scroll.scrollSnapAlign}',`);
      if (scroll.scrollSnapStop) lines.push(`      snapStop: '${scroll.scrollSnapStop}',`);
      if (scroll.overscrollBehavior) lines.push(`      overscroll: '${scroll.overscrollBehavior}',`);
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Appearance
  if (tokens.appearance && tokens.appearance.length > 0) {
    lines.push('  appearance: {');
    tokens.appearance.forEach(appear => {
      const key = appear.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      if (appear.appearance) lines.push(`      appearance: '${appear.appearance}',`);
      if (appear.colorScheme) lines.push(`      colorScheme: '${appear.colorScheme}',`);
      if (appear.accentColor) lines.push(`      accentColor: '${appear.accentColor}',`);
      if (appear.caretColor) lines.push(`      caretColor: '${appear.caretColor}',`);
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Transitions
  if (tokens.transitions && tokens.transitions.length > 0) {
    lines.push('  transitions: {');
    tokens.transitions.forEach(transition => {
      const key = transition.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      if (transition.property) lines.push(`      property: '${transition.property}',`);
      if (transition.duration !== undefined) lines.push(`      duration: ${transition.duration},`);
      if (transition.timingFunction) lines.push(`      timingFunction: '${transition.timingFunction}',`);
      if (transition.delay !== undefined) lines.push(`      delay: ${transition.delay},`);
      if (transition.behavior) lines.push(`      behavior: '${transition.behavior}',`);
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  // Animations
  if (tokens.animations && tokens.animations.length > 0) {
    lines.push('  animations: {');
    tokens.animations.forEach(animation => {
      const key = animation.name.replace(/\//g, '_').replace(/-/g, '_');
      lines.push(`    ${key}: {`);
      lines.push(`      duration: ${animation.duration},`);
      if (animation.timingFunction) lines.push(`      timingFunction: '${animation.timingFunction}',`);
      if (animation.delay !== undefined) lines.push(`      delay: ${animation.delay},`);
      if (animation.iterationCount !== undefined) {
        lines.push(`      iterationCount: ${animation.iterationCount === 'infinite' ? "'infinite'" : animation.iterationCount},`);
      }
      if (animation.direction) lines.push(`      direction: '${animation.direction}',`);
      if (animation.fillMode) lines.push(`      fillMode: '${animation.fillMode}',`);
      if (animation.playState) lines.push(`      playState: '${animation.playState}',`);
      if (animation.keyframes) {
        lines.push('      keyframes: [');
        animation.keyframes.forEach(keyframe => {
          lines.push('        {');
          lines.push(`          offset: ${keyframe.offset},`);
          if (keyframe.transform) lines.push(`          transform: '${keyframe.transform}',`);
          if (keyframe.opacity !== undefined) lines.push(`          opacity: ${keyframe.opacity},`);
          if (keyframe.scale !== undefined) lines.push(`          scale: ${keyframe.scale},`);
          if (keyframe.rotate !== undefined) lines.push(`          rotate: ${keyframe.rotate},`);
          if (keyframe.translateX !== undefined) lines.push(`          translateX: ${keyframe.translateX},`);
          if (keyframe.translateY !== undefined) lines.push(`          translateY: ${keyframe.translateY},`);
          if (keyframe.backgroundColor) lines.push(`          backgroundColor: '${keyframe.backgroundColor}',`);
          if (keyframe.borderColor) lines.push(`          borderColor: '${keyframe.borderColor}',`);
          if (keyframe.filter) lines.push(`          filter: '${keyframe.filter}',`);
          lines.push('        },');
        });
        lines.push('      ],');
      }
      lines.push('    },');
    });
    lines.push('  },');
  }
  
  lines.push('};');
  lines.push('');
  lines.push('export default theme;');
  
  return lines.join('\n');
}

/**
 * Generate Tailwind config
 */
function generateTailwindConfig(tokens: any): string {
  const theme = generateTailwindTheme(tokens);
  
  const lines = [
    '// Generated from Figma tokens',
    '// Follows Tailwind CSS conventions',
    '',
    '// Tailwind CSS configuration',
    'module.exports = {',
    '  content: [',
    '    "./app/**/*.{js,ts,jsx,tsx,mdx}",',
    '    "./components/**/*.{js,ts,jsx,tsx,mdx}",',
    '  ],',
    '  theme: ' + JSON.stringify(theme, null, 2).split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n'),
    '  plugins: [],',
    '};'
  ];
  
  return lines.join('\n');
}

/**
 * Generate all code files from tokens
 */
export function generateCodeFromTokens(tokens: any): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  
  // Generate CSS variables
  files.push({
    path: 'app/global-generated.css',
    content: generateCSSVariables(tokens),
    description: 'CSS variables following Tailwind conventions'
  });
  
  // Generate TypeScript theme
  files.push({
    path: 'lib/theme/generated-tokens.ts',
    content: generateThemeConstants(tokens),
    description: 'TypeScript theme constants'
  });
  
  // Generate Tailwind config (if needed)
  files.push({
    path: 'tailwind-tokens.config.js',
    content: generateTailwindConfig(tokens),
    description: 'Tailwind configuration'
  });
  
  // Generate JSON backup
  files.push({
    path: 'design-tokens.json',
    content: JSON.stringify(tokens, null, 2),
    description: 'Complete token backup'
  });
  
  return files;
}

/**
 * Format generated files as a summary
 */
export function formatGeneratedFilesSummary(files: GeneratedFile[]): string {
  const lines = ['# Generated Design Token Files\n'];
  
  files.forEach(file => {
    lines.push(`## ${file.path}`);
    lines.push(`${file.description}\n`);
    lines.push('```');
    lines.push(file.content.slice(0, 500) + (file.content.length > 500 ? '\n...' : ''));
    lines.push('```\n');
  });
  
  return lines.join('\n');
}