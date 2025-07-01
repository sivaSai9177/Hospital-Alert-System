/**
 * Animation Token Extractor
 * Extracts animation tokens from the Tailwind configuration
 */

export interface AnimationToken {
  name: string;
  value: string | number;
  type: 'duration' | 'timing' | 'delay' | 'keyframe' | 'animation';
  description?: string;
}

export interface AnimationTokens {
  durations: AnimationToken[];
  timingFunctions: AnimationToken[];
  delays: AnimationToken[];
  keyframes: AnimationToken[];
  animations: AnimationToken[];
}

// Animation durations from tailwind.config.ts
const ANIMATION_DURATIONS = {
  'instant': '0ms',
  'fast': '150ms',
  'normal': '300ms',
  'slow': '500ms',
  'slower': '700ms',
  'slowest': '1000ms',
};

// Animation timing functions
const ANIMATION_TIMING_FUNCTIONS = {
  'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
  'snappy': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  'ease-linear': 'linear',
  'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
  'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
  'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// Animation delays for stagger effects
const ANIMATION_DELAYS = {
  'stagger-1': '50ms',
  'stagger-2': '100ms',
  'stagger-3': '150ms',
  'stagger-4': '200ms',
  'stagger-5': '250ms',
  'stagger-6': '300ms',
};

// Keyframe definitions
const KEYFRAMES = {
  'fadeIn': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'fadeOut': {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
  'scaleIn': {
    '0%': { opacity: '0', transform: 'scale(0.95)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
  'scaleOut': {
    '0%': { opacity: '1', transform: 'scale(1)' },
    '100%': { opacity: '0', transform: 'scale(0.95)' },
  },
  'slideInUp': {
    '0%': { opacity: '0', transform: 'translateY(20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  'slideInDown': {
    '0%': { opacity: '0', transform: 'translateY(-20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  'slideInLeft': {
    '0%': { opacity: '0', transform: 'translateX(-20px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
  'slideInRight': {
    '0%': { opacity: '0', transform: 'translateX(20px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
  'scaleFadeIn': {
    '0%': { opacity: '0', transform: 'scale(0.95)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
  'slideAndFade': {
    '0%': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
  },
  'shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
  },
  'bounce': {
    '0%, 100%': { 
      transform: 'translateY(0)',
      animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
    },
    '50%': { 
      transform: 'translateY(-25%)',
      animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },
  'pulse': {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '.5' },
  },
  'spin': {
    'to': { transform: 'rotate(360deg)' },
  },
  'shimmer': {
    '0%': {
      backgroundPosition: '-200% 0',
    },
    '100%': {
      backgroundPosition: '200% 0',
    },
  },
  'skeletonWave': {
    '0%': {
      transform: 'translateX(-100%)',
    },
    '100%': {
      transform: 'translateX(100%)',
    },
  },
  'float': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
  },
};

// Pre-defined animations (combining keyframes with durations)
const ANIMATIONS = {
  'fade-in': 'fadeIn 300ms ease-out',
  'fade-out': 'fadeOut 300ms ease-in',
  'scale-in': 'scaleIn 200ms ease-out',
  'scale-out': 'scaleOut 200ms ease-in',
  'slide-in-up': 'slideInUp 300ms ease-out',
  'slide-in-down': 'slideInDown 300ms ease-out',
  'slide-in-left': 'slideInLeft 300ms ease-out',
  'slide-in-right': 'slideInRight 300ms ease-out',
  'shake': 'shake 500ms ease-in-out',
  'bounce': 'bounce 1000ms infinite',
  'pulse': 'pulse 2000ms ease-in-out infinite',
  'spin': 'spin 1000ms linear infinite',
  'shimmer': 'shimmer 2000ms linear infinite',
  'float': 'float 3000ms ease-in-out infinite',
};

/**
 * Generate animation tokens
 */
export function generateAnimationTokens(): AnimationTokens {
  // Convert durations
  const durations = Object.entries(ANIMATION_DURATIONS).map(([name, value]) => ({
    name: `duration-${name}`,
    value,
    type: 'duration' as const,
    description: `Animation duration: ${value}`,
  }));

  // Convert timing functions
  const timingFunctions = Object.entries(ANIMATION_TIMING_FUNCTIONS).map(([name, value]) => ({
    name: `timing-${name}`,
    value,
    type: 'timing' as const,
    description: `Timing function: ${name}`,
  }));

  // Convert delays
  const delays = Object.entries(ANIMATION_DELAYS).map(([name, value]) => ({
    name: `delay-${name}`,
    value,
    type: 'delay' as const,
    description: `Animation delay: ${value}`,
  }));

  // Convert keyframes
  const keyframes = Object.entries(KEYFRAMES).map(([name, value]) => ({
    name: `keyframe-${name}`,
    value: JSON.stringify(value),
    type: 'keyframe' as const,
    description: `Keyframe animation: ${name}`,
  }));

  // Convert animations
  const animations = Object.entries(ANIMATIONS).map(([name, value]) => ({
    name: `animation-${name}`,
    value,
    type: 'animation' as const,
    description: `Complete animation: ${value}`,
  }));

  return {
    durations,
    timingFunctions,
    delays,
    keyframes,
    animations,
  };
}

/**
 * Convert animation tokens to Figma format
 * Note: Figma doesn't directly support animations, so these are for documentation
 */
export function animationToFigmaDocumentation(tokens: AnimationTokens) {
  const documentation: any[] = [];

  // Group all tokens by type
  const groups = [
    { title: 'Durations', tokens: tokens.durations },
    { title: 'Timing Functions', tokens: tokens.timingFunctions },
    { title: 'Delays', tokens: tokens.delays },
    { title: 'Animations', tokens: tokens.animations },
  ];

  groups.forEach(group => {
    documentation.push({
      type: 'section',
      title: group.title,
      items: group.tokens.map(token => ({
        name: token.name,
        value: token.value,
        description: token.description,
      })),
    });
  });

  // Add keyframes as a special section
  documentation.push({
    type: 'section',
    title: 'Keyframes',
    items: tokens.keyframes.map(token => ({
      name: token.name,
      value: token.value,
      description: token.description,
    })),
  });

  return documentation;
}

/**
 * Generate CSS for animations
 */
export function generateAnimationCSS(tokens: AnimationTokens): string {
  let css = '/* Animation Tokens */\n:root {\n';

  // Add durations as CSS variables
  tokens.durations.forEach(token => {
    css += `  --${token.name}: ${token.value};\n`;
  });

  // Add delays as CSS variables
  tokens.delays.forEach(token => {
    css += `  --${token.name}: ${token.value};\n`;
  });

  css += '}\n\n';

  // Add keyframes
  css += '/* Keyframes */\n';
  tokens.keyframes.forEach(token => {
    const keyframeName = token.name.replace('keyframe-', '');
    const keyframeData = JSON.parse(token.value);
    
    css += `@keyframes ${keyframeName} {\n`;
    Object.entries(keyframeData).forEach(([step, properties]) => {
      css += `  ${step} {\n`;
      Object.entries(properties as any).forEach(([prop, value]) => {
        css += `    ${prop}: ${value};\n`;
      });
      css += '  }\n';
    });
    css += '}\n\n';
  });

  // Add utility classes
  css += '/* Animation Utility Classes */\n';
  tokens.animations.forEach(token => {
    const className = token.name.replace('animation-', 'animate-');
    css += `.${className} {\n`;
    css += `  animation: ${token.value};\n`;
    css += '}\n';
  });

  return css;
}

/**
 * Get animation presets for components
 */
export const COMPONENT_ANIMATIONS = {
  button: {
    hover: 'scale-in',
    press: 'scale-out',
    disabled: 'none',
  },
  card: {
    enter: 'fade-in scale-in',
    exit: 'fade-out scale-out',
    hover: 'float',
  },
  modal: {
    enter: 'fade-in slide-in-up',
    exit: 'fade-out slide-out-down',
  },
  toast: {
    enter: 'slide-in-right fade-in',
    exit: 'slide-out-right fade-out',
  },
  dropdown: {
    enter: 'fade-in slide-in-down',
    exit: 'fade-out slide-out-up',
  },
  page: {
    enter: 'fade-in',
    exit: 'fade-out',
  },
  skeleton: {
    loading: 'shimmer',
  },
};