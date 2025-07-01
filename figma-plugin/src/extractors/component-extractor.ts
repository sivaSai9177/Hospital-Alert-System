/**
 * Component Token Extractor
 * Extracts component-specific design tokens from Figma
 */

import { 
  ComponentTokens,
  ButtonTokens,
  InputTokens,
  CardTokens,
  DialogTokens,
  BadgeTokens,
  AvatarTokens
} from '../../shared/types/design-tokens';
import { convertToTailwindColorName } from '../utils/tailwind-converter';

// Component detection patterns
const COMPONENT_PATTERNS = {
  button: ['button', 'btn', 'cta', 'action'],
  input: ['input', 'textfield', 'field', 'form-control'],
  card: ['card', 'panel', 'surface', 'container'],
  dialog: ['dialog', 'modal', 'popup', 'overlay'],
  badge: ['badge', 'tag', 'chip', 'label'],
  avatar: ['avatar', 'profile', 'user-image'],
  alert: ['alert', 'notification', 'message', 'banner'],
  tabs: ['tabs', 'tab-group', 'tablist'],
  dropdown: ['dropdown', 'select', 'menu', 'popover'],
  switch: ['switch', 'toggle'],
  checkbox: ['checkbox', 'check'],
  radio: ['radio', 'option'],
  navigation: ['nav', 'navigation', 'sidebar', 'header'],
  table: ['table', 'data-grid'],
  list: ['list', 'list-item'],
  accordion: ['accordion', 'collapse', 'expandable'],
  tooltip: ['tooltip', 'hint', 'help'],
  progress: ['progress', 'loading', 'loader'],
  slider: ['slider', 'range'],
};

// State patterns for component variants
const STATE_PATTERNS = {
  default: ['default', 'normal', 'base'],
  hover: ['hover', 'over'],
  active: ['active', 'pressed', 'down'],
  focus: ['focus', 'focused'],
  disabled: ['disabled', 'inactive'],
  selected: ['selected', 'checked'],
  error: ['error', 'danger', 'invalid'],
};

// Size patterns
const SIZE_PATTERNS = {
  small: ['small', 'sm', 'xs', 'mini'],
  medium: ['medium', 'md', 'regular', 'normal'],
  large: ['large', 'lg', 'xl', 'big'],
};

// Variant patterns
const VARIANT_PATTERNS = {
  primary: ['primary', 'main', 'brand'],
  secondary: ['secondary', 'alt'],
  outline: ['outline', 'outlined', 'border'],
  ghost: ['ghost', 'text', 'minimal'],
  destructive: ['destructive', 'danger', 'error', 'delete'],
  success: ['success', 'positive', 'confirm'],
  warning: ['warning', 'caution'],
  info: ['info', 'informational'],
};

/**
 * Extract component tokens from Figma
 */
export async function extractComponentTokens(): Promise<ComponentTokens> {
  const components: Partial<ComponentTokens> = {};
  
  // Extract button tokens
  const buttonTokens = await extractButtonTokens();
  if (buttonTokens) components.button = buttonTokens;
  
  // Extract input tokens
  const inputTokens = await extractInputTokens();
  if (inputTokens) components.input = inputTokens;
  
  // Extract card tokens
  const cardTokens = await extractCardTokens();
  if (cardTokens) components.card = cardTokens;
  
  // Extract dialog tokens
  const dialogTokens = await extractDialogTokens();
  if (dialogTokens) components.dialog = dialogTokens;
  
  // Extract badge tokens
  const badgeTokens = await extractBadgeTokens();
  if (badgeTokens) components.badge = badgeTokens;
  
  // Extract avatar tokens
  const avatarTokens = await extractAvatarTokens();
  if (avatarTokens) components.avatar = avatarTokens;
  
  // Add more component extractors as needed
  
  return components as ComponentTokens;
}

/**
 * Extract button tokens
 */
async function extractButtonTokens(): Promise<ButtonTokens | null> {
  const buttons = findComponentsByPattern(COMPONENT_PATTERNS.button);
  if (buttons.length === 0) return null;
  
  const tokens: Partial<ButtonTokens> = {
    variants: {}
  };
  
  // Analyze button components
  buttons.forEach(button => {
    // Extract size information
    const size = detectSize(button.name);
    const variant = detectVariant(button.name);
    const state = detectState(button.name);
    
    if (button.type === 'COMPONENT' || button.type === 'INSTANCE') {
      // Extract dimensions
      if (size) {
        if (!tokens.height) tokens.height = { small: {}, medium: {}, large: {} };
        tokens.height[size] = {
          compact: Math.round(button.height * 0.8),
          medium: Math.round(button.height),
          large: Math.round(button.height * 1.2)
        };
      }
      
      // Extract padding
      if ('paddingLeft' in button) {
        if (!tokens.padding) tokens.padding = {};
        tokens.padding.medium = {
          x: button.paddingLeft || 16,
          y: button.paddingTop || 8
        };
      }
      
      // Extract colors for variants
      if (variant && !state) {
        if (!tokens.variants) tokens.variants = {};
        if (!tokens.variants[variant]) {
          tokens.variants[variant] = {
            background: '',
            text: '',
            border: '',
            hover: { background: '', text: '', border: '' }
          };
        }
        
        // Extract fills
        if ('fills' in button && button.fills && button.fills.length > 0) {
          const fill = button.fills[0];
          if (fill.type === 'SOLID') {
            tokens.variants[variant].background = rgbToString(fill.color);
          }
        }
        
        // Extract text color from children
        const textNode = button.findOne(node => node.type === 'TEXT');
        if (textNode && textNode.type === 'TEXT' && textNode.fills && textNode.fills.length > 0) {
          const fill = textNode.fills[0];
          if (fill.type === 'SOLID') {
            tokens.variants[variant].text = rgbToString(fill.color);
          }
        }
        
        // Extract border
        if ('strokes' in button && button.strokes && button.strokes.length > 0) {
          const stroke = button.strokes[0];
          if (stroke.type === 'SOLID') {
            tokens.variants[variant].border = rgbToString(stroke.color);
          }
        }
      }
      
      // Extract hover states
      if (variant && state === 'hover') {
        if (!tokens.variants) tokens.variants = {};
        if (!tokens.variants[variant]) {
          tokens.variants[variant] = {
            background: '',
            text: '',
            border: '',
            hover: { background: '', text: '', border: '' }
          };
        }
        
        if ('fills' in button && button.fills && button.fills.length > 0) {
          const fill = button.fills[0];
          if (fill.type === 'SOLID') {
            tokens.variants[variant].hover.background = rgbToString(fill.color);
          }
        }
      }
      
      // Extract border radius
      if ('cornerRadius' in button && typeof button.cornerRadius === 'number') {
        if (!tokens.borderRadius) tokens.borderRadius = {};
        tokens.borderRadius.medium = button.cornerRadius;
      }
      
      // Extract typography
      const textNode = button.findOne(node => node.type === 'TEXT');
      if (textNode && textNode.type === 'TEXT') {
        if (!tokens.fontSize) tokens.fontSize = {};
        tokens.fontSize.medium = textNode.fontSize as number;
        
        if (!tokens.fontWeight) tokens.fontWeight = { default: 400, primary: 600, ghost: 400 };
        tokens.fontWeight.default = mapFontWeight(textNode.fontWeight);
      }
    }
  });
  
  // Fill in defaults
  return {
    height: tokens.height || {
      small: { compact: 28, medium: 32, large: 36 },
      medium: { compact: 32, medium: 40, large: 44 },
      large: { compact: 36, medium: 44, large: 48 },
    },
    padding: tokens.padding || {
      compact: { x: 12, y: 4 },
      medium: { x: 16, y: 8 },
      large: { x: 20, y: 10 },
    },
    fontSize: tokens.fontSize || {
      compact: 13,
      medium: 14,
      large: 16,
    },
    borderRadius: tokens.borderRadius || {
      compact: 4,
      medium: 6,
      large: 8,
    },
    minWidth: { compact: 64, medium: 80, large: 96 },
    iconSize: {
      small: { compact: 14, medium: 16, large: 18 },
      medium: { compact: 16, medium: 18, large: 20 },
      large: { compact: 18, medium: 20, large: 22 },
    },
    gap: { compact: 4, medium: 6, large: 8 },
    fontWeight: tokens.fontWeight || {
      default: 500,
      primary: 600,
      ghost: 400,
    },
    shadow: {
      default: 'none',
      hover: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      active: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
    transition: {
      duration: 150,
      timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    variants: tokens.variants || {},
  };
}

/**
 * Extract input tokens
 */
async function extractInputTokens(): Promise<InputTokens | null> {
  const inputs = findComponentsByPattern(COMPONENT_PATTERNS.input);
  if (inputs.length === 0) return null;
  
  const tokens: Partial<InputTokens> = {
    borderColor: {},
    background: {},
  };
  
  inputs.forEach(input => {
    const state = detectState(input.name);
    const size = detectSize(input.name);
    
    if (input.type === 'COMPONENT' || input.type === 'INSTANCE') {
      // Extract dimensions
      if (size) {
        if (!tokens.height) tokens.height = { small: {}, medium: {}, large: {} };
        tokens.height[size] = {
          compact: Math.round(input.height * 0.8),
          medium: Math.round(input.height),
          large: Math.round(input.height * 1.2)
        };
      }
      
      // Extract padding
      if ('paddingLeft' in input) {
        if (!tokens.paddingX) tokens.paddingX = {};
        tokens.paddingX.medium = input.paddingLeft || 12;
      }
      
      // Extract border
      if ('strokes' in input && input.strokes && input.strokes.length > 0) {
        const stroke = input.strokes[0];
        if (stroke.type === 'SOLID') {
          const colorKey = state || 'default';
          tokens.borderColor![colorKey] = rgbToString(stroke.color);
        }
        
        if ('strokeWeight' in input && typeof input.strokeWeight === 'number') {
          tokens.borderWidth = input.strokeWeight;
        }
      }
      
      // Extract background
      if ('fills' in input && input.fills && input.fills.length > 0) {
        const fill = input.fills[0];
        if (fill.type === 'SOLID') {
          const colorKey = state || 'default';
          tokens.background![colorKey] = rgbToString(fill.color);
        }
      }
      
      // Extract border radius
      if ('cornerRadius' in input && typeof input.cornerRadius === 'number') {
        if (!tokens.borderRadius) tokens.borderRadius = {};
        tokens.borderRadius.medium = input.cornerRadius;
      }
      
      // Look for placeholder text
      const placeholderNode = input.findOne(node => 
        node.type === 'TEXT' && node.name.toLowerCase().includes('placeholder')
      );
      if (placeholderNode && placeholderNode.type === 'TEXT') {
        if (!tokens.placeholder) tokens.placeholder = { color: '', opacity: 1 };
        if (placeholderNode.fills && placeholderNode.fills.length > 0) {
          const fill = placeholderNode.fills[0];
          if (fill.type === 'SOLID') {
            tokens.placeholder.color = rgbToString(fill.color);
            tokens.placeholder.opacity = fill.opacity || 1;
          }
        }
      }
    }
  });
  
  // Fill in defaults
  return {
    height: tokens.height || {
      small: { compact: 28, medium: 32, large: 36 },
      medium: { compact: 32, medium: 40, large: 44 },
      large: { compact: 36, medium: 44, large: 48 },
    },
    padding: {
      compact: { x: 8, y: 4 },
      medium: { x: 12, y: 6 },
      large: { x: 16, y: 8 },
    },
    paddingX: tokens.paddingX || { compact: 8, medium: 12, large: 16 },
    fontSize: { compact: 13, medium: 14, large: 16 },
    borderRadius: tokens.borderRadius || { compact: 4, medium: 6, large: 8 },
    borderWidth: tokens.borderWidth || 1,
    borderColor: tokens.borderColor || {
      default: 'var(--border)',
      hover: 'var(--border-hover)',
      focus: 'var(--primary)',
      error: 'var(--destructive)',
      disabled: 'var(--border-disabled)',
    },
    background: tokens.background || {
      default: 'var(--background)',
      hover: 'var(--background-hover)',
      focus: 'var(--background)',
      disabled: 'var(--background-disabled)',
    },
    placeholder: tokens.placeholder || {
      color: 'var(--muted-foreground)',
      opacity: 0.5,
    },
    label: {
      fontSize: { compact: 12, medium: 14, large: 16 },
      fontWeight: 500,
      marginBottom: { compact: 4, medium: 6, large: 8 },
    },
    helper: {
      fontSize: { compact: 11, medium: 12, large: 14 },
      marginTop: { compact: 2, medium: 4, large: 6 },
      color: {
        default: 'var(--muted-foreground)',
        error: 'var(--destructive)',
      },
    },
    icon: {
      size: { compact: 14, medium: 16, large: 18 },
      color: 'var(--muted-foreground)',
      gap: { compact: 4, medium: 6, large: 8 },
    },
    transition: {
      duration: 150,
      timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  };
}

/**
 * Extract card tokens
 */
async function extractCardTokens(): Promise<CardTokens | null> {
  const cards = findComponentsByPattern(COMPONENT_PATTERNS.card);
  if (cards.length === 0) return null;
  
  const tokens: Partial<CardTokens> = {
    shadow: {},
    border: {},
  };
  
  cards.forEach(card => {
    if (card.type === 'COMPONENT' || card.type === 'INSTANCE') {
      // Extract padding
      if ('paddingLeft' in card) {
        if (!tokens.padding) tokens.padding = {};
        tokens.padding.medium = {
          x: card.paddingLeft || 16,
          y: card.paddingTop || 16
        };
      }
      
      // Extract border
      if ('strokes' in card && card.strokes && card.strokes.length > 0) {
        const stroke = card.strokes[0];
        if (stroke.type === 'SOLID') {
          tokens.border!.color = rgbToString(stroke.color);
        }
        
        if ('strokeWeight' in card && typeof card.strokeWeight === 'number') {
          tokens.border!.width = card.strokeWeight;
        }
      }
      
      // Extract shadow
      if ('effects' in card && card.effects && card.effects.length > 0) {
        card.effects.forEach(effect => {
          if (effect.type === 'DROP_SHADOW' && effect.visible !== false) {
            const shadowIntensity = detectShadowIntensity(effect);
            tokens.shadow![shadowIntensity] = effectToString(effect);
          }
        });
      }
      
      // Extract border radius
      if ('cornerRadius' in card && typeof card.cornerRadius === 'number') {
        if (!tokens.borderRadius) tokens.borderRadius = {};
        tokens.borderRadius.medium = card.cornerRadius;
      }
      
      // Look for header/footer
      const header = card.findOne(node => 
        node.name.toLowerCase().includes('header')
      );
      if (header && 'paddingLeft' in header) {
        if (!tokens.header) tokens.header = {
          padding: {},
          fontSize: {},
          fontWeight: 600,
          borderBottom: '',
        };
        tokens.header.padding.medium = {
          x: header.paddingLeft || 16,
          y: header.paddingTop || 12
        };
      }
    }
  });
  
  // Fill in defaults
  return {
    padding: tokens.padding || {
      compact: { x: 12, y: 12 },
      medium: { x: 16, y: 16 },
      large: { x: 20, y: 20 },
    },
    gap: { compact: 8, medium: 12, large: 16 },
    fontSize: { compact: 13, medium: 14, large: 16 },
    borderRadius: tokens.borderRadius || { compact: 6, medium: 8, large: 12 },
    border: tokens.border || {
      width: 1,
      color: 'var(--border)',
    },
    shadow: tokens.shadow || {
      none: 'none',
      small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      large: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
    header: tokens.header || {
      padding: {
        compact: { x: 12, y: 8 },
        medium: { x: 16, y: 12 },
        large: { x: 20, y: 16 },
      },
      fontSize: { compact: 14, medium: 16, large: 18 },
      fontWeight: 600,
      borderBottom: '1px solid var(--border)',
    },
    footer: {
      padding: {
        compact: { x: 12, y: 8 },
        medium: { x: 16, y: 12 },
        large: { x: 20, y: 16 },
      },
      borderTop: '1px solid var(--border)',
    },
    transition: {
      duration: 150,
      timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  };
}

/**
 * Extract dialog/modal tokens
 */
async function extractDialogTokens(): Promise<DialogTokens | null> {
  const dialogs = findComponentsByPattern(COMPONENT_PATTERNS.dialog);
  if (dialogs.length === 0) return null;
  
  const tokens: Partial<DialogTokens> = {
    overlay: {},
    content: {
      maxWidth: {},
      padding: {},
      margin: {},
    },
  };
  
  dialogs.forEach(dialog => {
    if (dialog.type === 'COMPONENT' || dialog.type === 'INSTANCE') {
      // Look for overlay
      const overlay = dialog.findOne(node => 
        node.name.toLowerCase().includes('overlay') || 
        node.name.toLowerCase().includes('backdrop')
      );
      if (overlay && 'fills' in overlay && overlay.fills && overlay.fills.length > 0) {
        const fill = overlay.fills[0];
        if (fill.type === 'SOLID') {
          tokens.overlay!.background = rgbToString(fill.color);
          tokens.overlay!.opacity = fill.opacity || 0.5;
        }
      }
      
      // Extract content container
      const content = dialog.findOne(node => 
        node.name.toLowerCase().includes('content') || 
        node.name.toLowerCase().includes('modal')
      );
      if (content) {
        // Extract dimensions
        if ('width' in content && typeof content.width === 'number') {
          const size = detectSize(dialog.name) || 'medium';
          tokens.content!.maxWidth![size] = content.width;
        }
        
        // Extract padding
        if ('paddingLeft' in content) {
          tokens.content!.padding!.medium = {
            x: content.paddingLeft || 24,
            y: content.paddingTop || 24
          };
        }
        
        // Extract background
        if ('fills' in content && content.fills && content.fills.length > 0) {
          const fill = content.fills[0];
          if (fill.type === 'SOLID') {
            tokens.content!.background = rgbToString(fill.color);
          }
        }
        
        // Extract border radius
        if ('cornerRadius' in content && typeof content.cornerRadius === 'number') {
          if (!tokens.content!.borderRadius) tokens.content!.borderRadius = {};
          tokens.content!.borderRadius.medium = content.cornerRadius;
        }
        
        // Extract shadow
        if ('effects' in content && content.effects && content.effects.length > 0) {
          const shadow = content.effects.find(e => e.type === 'DROP_SHADOW');
          if (shadow) {
            tokens.content!.shadow = effectToString(shadow);
          }
        }
      }
    }
  });
  
  // Fill in defaults
  return {
    overlay: {
      background: tokens.overlay?.background || 'rgba(0, 0, 0, 0.5)',
      opacity: tokens.overlay?.opacity || 0.5,
      backdropFilter: 'blur(4px)',
    },
    content: {
      background: tokens.content?.background || 'var(--background)',
      borderRadius: tokens.content?.borderRadius || {
        compact: 8,
        medium: 12,
        large: 16,
      },
      padding: tokens.content?.padding || {
        compact: { x: 16, y: 16 },
        medium: { x: 24, y: 24 },
        large: { x: 32, y: 32 },
      },
      shadow: tokens.content?.shadow || '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      maxWidth: tokens.content?.maxWidth || {
        small: 400,
        medium: 600,
        large: 800,
        full: '90vw',
      },
      margin: tokens.content?.margin || {
        compact: 16,
        medium: 32,
        large: 48,
      },
    },
    header: {
      padding: {
        compact: { x: 16, y: 12 },
        medium: { x: 24, y: 16 },
        large: { x: 32, y: 20 },
      },
      fontSize: { compact: 16, medium: 18, large: 20 },
      fontWeight: 600,
      borderBottom: '1px solid var(--border)',
    },
    body: {
      padding: {
        compact: { x: 16, y: 16 },
        medium: { x: 24, y: 24 },
        large: { x: 32, y: 32 },
      },
    },
    footer: {
      padding: {
        compact: { x: 16, y: 12 },
        medium: { x: 24, y: 16 },
        large: { x: 32, y: 20 },
      },
      gap: { compact: 8, medium: 12, large: 16 },
      borderTop: '1px solid var(--border)',
    },
    animation: {
      duration: 200,
      timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      scale: {
        from: 0.95,
        to: 1,
      },
    },
  };
}

/**
 * Extract badge tokens
 */
async function extractBadgeTokens(): Promise<BadgeTokens | null> {
  const badges = findComponentsByPattern(COMPONENT_PATTERNS.badge);
  if (badges.length === 0) return null;
  
  const tokens: Partial<BadgeTokens> = {
    variants: {},
  };
  
  badges.forEach(badge => {
    const variant = detectVariant(badge.name) || 'default';
    
    if (badge.type === 'COMPONENT' || badge.type === 'INSTANCE') {
      // Extract dimensions
      if ('height' in badge && typeof badge.height === 'number') {
        if (!tokens.height) tokens.height = {};
        tokens.height.medium = badge.height;
      }
      
      // Extract padding
      if ('paddingLeft' in badge) {
        if (!tokens.padding) tokens.padding = {};
        tokens.padding.medium = {
          x: badge.paddingLeft || 8,
          y: badge.paddingTop || 2
        };
      }
      
      // Extract colors
      if (!tokens.variants![variant]) {
        tokens.variants![variant] = {
          background: '',
          color: '',
          border: '',
        };
      }
      
      if ('fills' in badge && badge.fills && badge.fills.length > 0) {
        const fill = badge.fills[0];
        if (fill.type === 'SOLID') {
          tokens.variants![variant].background = rgbToString(fill.color);
        }
      }
      
      // Extract text color
      const textNode = badge.findOne(node => node.type === 'TEXT');
      if (textNode && textNode.type === 'TEXT' && textNode.fills && textNode.fills.length > 0) {
        const fill = textNode.fills[0];
        if (fill.type === 'SOLID') {
          tokens.variants![variant].color = rgbToString(fill.color);
        }
        
        if (!tokens.fontSize) tokens.fontSize = {};
        tokens.fontSize.medium = textNode.fontSize as number;
      }
      
      // Extract border
      if ('strokes' in badge && badge.strokes && badge.strokes.length > 0) {
        const stroke = badge.strokes[0];
        if (stroke.type === 'SOLID') {
          tokens.variants![variant].border = rgbToString(stroke.color);
        }
      }
      
      // Extract border radius
      if ('cornerRadius' in badge && typeof badge.cornerRadius === 'number') {
        if (!tokens.borderRadius) tokens.borderRadius = {};
        tokens.borderRadius.medium = badge.cornerRadius;
      }
    }
  });
  
  // Fill in defaults
  return {
    height: tokens.height || { compact: 18, medium: 22, large: 26 },
    padding: tokens.padding || {
      compact: { x: 6, y: 1 },
      medium: { x: 8, y: 2 },
      large: { x: 10, y: 3 },
    },
    fontSize: tokens.fontSize || { compact: 11, medium: 12, large: 14 },
    fontWeight: 500,
    borderRadius: tokens.borderRadius || { compact: 4, medium: 6, large: 8 },
    gap: { compact: 4, medium: 6, large: 8 },
    variants: tokens.variants || {
      default: { 
        background: 'var(--secondary)', 
        color: 'var(--secondary-foreground)', 
        border: 'transparent' 
      },
      primary: { 
        background: 'var(--primary)', 
        color: 'var(--primary-foreground)', 
        border: 'transparent' 
      },
      secondary: { 
        background: 'var(--secondary)', 
        color: 'var(--secondary-foreground)', 
        border: 'transparent' 
      },
      success: { 
        background: 'var(--success)', 
        color: 'var(--success-foreground)', 
        border: 'transparent' 
      },
      warning: { 
        background: 'var(--warning)', 
        color: 'var(--warning-foreground)', 
        border: 'transparent' 
      },
      error: { 
        background: 'var(--destructive)', 
        color: 'var(--destructive-foreground)', 
        border: 'transparent' 
      },
      info: { 
        background: 'var(--info)', 
        color: 'var(--info-foreground)', 
        border: 'transparent' 
      },
    },
  };
}

/**
 * Extract avatar tokens
 */
async function extractAvatarTokens(): Promise<AvatarTokens | null> {
  const avatars = findComponentsByPattern(COMPONENT_PATTERNS.avatar);
  if (avatars.length === 0) return null;
  
  const tokens: Partial<AvatarTokens> = {
    size: {},
    fontSize: {},
  };
  
  avatars.forEach(avatar => {
    const size = detectSize(avatar.name) || 'medium';
    
    if (avatar.type === 'COMPONENT' || avatar.type === 'INSTANCE') {
      // Extract size
      if ('width' in avatar && typeof avatar.width === 'number') {
        if (!tokens.size![size]) tokens.size![size] = {};
        tokens.size![size].medium = avatar.width;
      }
      
      // Extract text size
      const textNode = avatar.findOne(node => node.type === 'TEXT');
      if (textNode && textNode.type === 'TEXT') {
        if (!tokens.fontSize![size]) tokens.fontSize![size] = {};
        tokens.fontSize![size].medium = textNode.fontSize as number;
      }
      
      // Extract background
      if ('fills' in avatar && avatar.fills && avatar.fills.length > 0) {
        const fill = avatar.fills[0];
        if (fill.type === 'SOLID') {
          tokens.background = rgbToString(fill.color);
        }
      }
      
      // Extract border
      if ('strokes' in avatar && avatar.strokes && avatar.strokes.length > 0) {
        const stroke = avatar.strokes[0];
        if (stroke.type === 'SOLID') {
          if (!tokens.border) tokens.border = { width: 0, color: '' };
          tokens.border.color = rgbToString(stroke.color);
        }
        
        if ('strokeWeight' in avatar && typeof avatar.strokeWeight === 'number') {
          if (!tokens.border) tokens.border = { width: 0, color: '' };
          tokens.border.width = avatar.strokeWeight;
        }
      }
      
      // Extract border radius
      if ('cornerRadius' in avatar && typeof avatar.cornerRadius === 'number') {
        const isCircle = avatar.cornerRadius === avatar.width / 2;
        tokens.borderRadius = isCircle ? '50%' : `${avatar.cornerRadius}px`;
      }
    }
  });
  
  // Fill in defaults
  return {
    size: tokens.size || {
      small: { compact: 24, medium: 32, large: 40 },
      medium: { compact: 32, medium: 40, large: 48 },
      large: { compact: 40, medium: 48, large: 56 },
      xlarge: { compact: 48, medium: 56, large: 64 },
    },
    fontSize: tokens.fontSize || {
      small: { compact: 12, medium: 14, large: 16 },
      medium: { compact: 14, medium: 16, large: 18 },
      large: { compact: 16, medium: 18, large: 20 },
      xlarge: { compact: 18, medium: 20, large: 24 },
    },
    borderRadius: tokens.borderRadius || '50%',
    border: tokens.border || {
      width: 0,
      color: 'var(--border)',
    },
    background: tokens.background || 'var(--muted)',
    color: tokens.color || 'var(--muted-foreground)',
    status: {
      size: {
        small: 8,
        medium: 10,
        large: 12,
        xlarge: 14,
      },
      position: {
        bottom: 0,
        right: 0,
      },
      border: {
        width: 2,
        color: 'var(--background)',
      },
    },
  };
}

// Helper functions

function findComponentsByPattern(patterns: string[]): SceneNode[] {
  const components: SceneNode[] = [];
  
  function traverse(node: SceneNode) {
    const nodeName = node.name.toLowerCase();
    
    if (patterns.some(pattern => nodeName.includes(pattern))) {
      components.push(node);
    }
    
    if ('children' in node) {
      node.children.forEach(child => traverse(child));
    }
  }
  
  figma.currentPage.children.forEach(node => traverse(node));
  
  return components;
}

function detectSize(name: string): 'small' | 'medium' | 'large' | null {
  const lowerName = name.toLowerCase();
  
  for (const [size, patterns] of Object.entries(SIZE_PATTERNS) as [keyof typeof SIZE_PATTERNS, string[]][]) {
    if (patterns.some(pattern => lowerName.includes(pattern))) {
      return size;
    }
  }
  
  return null;
}

function detectVariant(name: string): string | null {
  const lowerName = name.toLowerCase();
  
  for (const [variant, patterns] of Object.entries(VARIANT_PATTERNS) as [string, string[]][]) {
    if (patterns.some(pattern => lowerName.includes(pattern))) {
      return variant;
    }
  }
  
  return null;
}

function detectState(name: string): string | null {
  const lowerName = name.toLowerCase();
  
  for (const [state, patterns] of Object.entries(STATE_PATTERNS) as [string, string[]][]) {
    if (patterns.some(pattern => lowerName.includes(pattern))) {
      return state;
    }
  }
  
  return null;
}

function detectShadowIntensity(effect: Effect): 'none' | 'small' | 'medium' | 'large' {
  if (effect.type !== 'DROP_SHADOW') return 'none';
  
  const blur = effect.radius;
  const spread = 'spread' in effect ? effect.spread : 0;
  const totalSize = blur + Math.abs(spread || 0);
  
  if (totalSize <= 2) return 'small';
  if (totalSize <= 6) return 'medium';
  return 'large';
}

function rgbToString(color: RGB): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function effectToString(effect: Effect): string {
  if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') return 'none';
  
  const x = effect.offset.x;
  const y = effect.offset.y;
  const blur = effect.radius;
  const spread = 'spread' in effect ? effect.spread : 0;
  const color = effect.color;
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a;
  
  const inset = effect.type === 'INNER_SHADOW' ? 'inset ' : '';
  
  return `${inset}${x}px ${y}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${a})`;
}

function mapFontWeight(weight: number | symbol): number {
  if (typeof weight === 'symbol') return 400;
  
  const weightMap: Record<number, number> = {
    100: 100, // Thin
    200: 200, // Extra Light
    300: 300, // Light
    400: 400, // Regular
    500: 500, // Medium
    600: 600, // Semi Bold
    700: 700, // Bold
    800: 800, // Extra Bold
    900: 900, // Black
  };
  
  return weightMap[weight] || 400;
}