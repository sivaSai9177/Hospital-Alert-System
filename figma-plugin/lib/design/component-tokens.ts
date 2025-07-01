/**
 * Component-Specific Design Tokens
 * Centralized token definitions for all UI components
 * Supporting density modes (compact, medium, large)
 */

import { DensityMode } from './spacing';

// Component Token Types
export interface ComponentTokens {
  button: ButtonTokens;
  input: InputTokens;
  card: CardTokens;
  dialog: DialogTokens;
  navigation: NavigationTokens;
  badge: BadgeTokens;
  avatar: AvatarTokens;
  alert: AlertTokens;
  tabs: TabsTokens;
  tooltip: TooltipTokens;
  dropdown: DropdownTokens;
  switch: SwitchTokens;
  checkbox: CheckboxTokens;
  radio: RadioTokens;
  select: SelectTokens;
  textarea: TextareaTokens;
  table: TableTokens;
  list: ListTokens;
  accordion: AccordionTokens;
  breadcrumb: BreadcrumbTokens;
  pagination: PaginationTokens;
  skeleton: SkeletonTokens;
  progress: ProgressTokens;
  slider: SliderTokens;
  divider: DividerTokens;
}

// Base interfaces for common properties
interface BaseComponentTokens {
  padding: Record<DensityMode, { x: number; y: number }>;
  fontSize: Record<DensityMode, number>;
  borderRadius: Record<DensityMode, number>;
  transition: {
    duration: number;
    timing: string;
  };
}

interface SizeVariantTokens {
  small: Record<DensityMode, number>;
  medium: Record<DensityMode, number>;
  large: Record<DensityMode, number>;
}

// Button Tokens
export interface ButtonTokens extends BaseComponentTokens {
  height: SizeVariantTokens;
  minWidth: Record<DensityMode, number>;
  iconSize: SizeVariantTokens;
  gap: Record<DensityMode, number>;
  fontWeight: {
    default: number;
    primary: number;
    ghost: number;
  };
  shadow: {
    default: string;
    hover: string;
    active: string;
  };
  // Variant-specific tokens
  variants: {
    primary: {
      background: string;
      text: string;
      border: string;
      hover: {
        background: string;
        text: string;
        border: string;
      };
    };
    secondary: {
      background: string;
      text: string;
      border: string;
      hover: {
        background: string;
        text: string;
        border: string;
      };
    };
    outline: {
      background: string;
      text: string;
      border: string;
      hover: {
        background: string;
        text: string;
        border: string;
      };
    };
    ghost: {
      background: string;
      text: string;
      border: string;
      hover: {
        background: string;
        text: string;
        border: string;
      };
    };
    destructive: {
      background: string;
      text: string;
      border: string;
      hover: {
        background: string;
        text: string;
        border: string;
      };
    };
  };
}

// Input Tokens
export interface InputTokens extends BaseComponentTokens {
  height: SizeVariantTokens;
  paddingX: Record<DensityMode, number>;
  borderWidth: number;
  borderColor: {
    default: string;
    hover: string;
    focus: string;
    error: string;
    disabled: string;
  };
  background: {
    default: string;
    hover: string;
    focus: string;
    disabled: string;
  };
  placeholder: {
    color: string;
    opacity: number;
  };
  label: {
    fontSize: Record<DensityMode, number>;
    fontWeight: number;
    marginBottom: Record<DensityMode, number>;
  };
  helper: {
    fontSize: Record<DensityMode, number>;
    marginTop: Record<DensityMode, number>;
    color: {
      default: string;
      error: string;
    };
  };
  icon: {
    size: Record<DensityMode, number>;
    color: string;
    gap: Record<DensityMode, number>;
  };
}

// Card Tokens
export interface CardTokens extends BaseComponentTokens {
  padding: Record<DensityMode, { x: number; y: number }>;
  gap: Record<DensityMode, number>;
  border: {
    width: number;
    color: string;
  };
  shadow: {
    none: string;
    small: string;
    medium: string;
    large: string;
  };
  header: {
    padding: Record<DensityMode, { x: number; y: number }>;
    fontSize: Record<DensityMode, number>;
    fontWeight: number;
    borderBottom: string;
  };
  footer: {
    padding: Record<DensityMode, { x: number; y: number }>;
    borderTop: string;
  };
}

// Dialog/Modal Tokens
export interface DialogTokens {
  overlay: {
    background: string;
    opacity: number;
    backdropFilter: string;
  };
  content: {
    background: string;
    borderRadius: Record<DensityMode, number>;
    padding: Record<DensityMode, { x: number; y: number }>;
    shadow: string;
    maxWidth: {
      small: number;
      medium: number;
      large: number;
      full: string;
    };
    margin: Record<DensityMode, number>;
  };
  header: {
    padding: Record<DensityMode, { x: number; y: number }>;
    fontSize: Record<DensityMode, number>;
    fontWeight: number;
    borderBottom: string;
  };
  body: {
    padding: Record<DensityMode, { x: number; y: number }>;
  };
  footer: {
    padding: Record<DensityMode, { x: number; y: number }>;
    gap: Record<DensityMode, number>;
    borderTop: string;
  };
  animation: {
    duration: number;
    timing: string;
    scale: {
      from: number;
      to: number;
    };
  };
}

// Navigation Tokens
export interface NavigationTokens {
  sidebar: {
    width: {
      collapsed: number;
      expanded: number;
    };
    padding: Record<DensityMode, number>;
    background: string;
    border: string;
    item: {
      height: Record<DensityMode, number>;
      padding: Record<DensityMode, { x: number; y: number }>;
      borderRadius: Record<DensityMode, number>;
      fontSize: Record<DensityMode, number>;
      iconSize: Record<DensityMode, number>;
      gap: Record<DensityMode, number>;
      hover: {
        background: string;
        color: string;
      };
      active: {
        background: string;
        color: string;
        fontWeight: number;
      };
    };
  };
  header: {
    height: Record<DensityMode, number>;
    padding: Record<DensityMode, { x: number; y: number }>;
    background: string;
    borderBottom: string;
    shadow: string;
    logo: {
      height: Record<DensityMode, number>;
    };
  };
  breadcrumb: {
    fontSize: Record<DensityMode, number>;
    gap: Record<DensityMode, number>;
    separator: {
      content: string;
      color: string;
      margin: Record<DensityMode, number>;
    };
  };
}

// Badge Tokens
export interface BadgeTokens {
  height: Record<DensityMode, number>;
  padding: Record<DensityMode, { x: number; y: number }>;
  fontSize: Record<DensityMode, number>;
  fontWeight: number;
  borderRadius: Record<DensityMode, number>;
  gap: Record<DensityMode, number>;
  variants: {
    default: { background: string; color: string; border: string };
    primary: { background: string; color: string; border: string };
    secondary: { background: string; color: string; border: string };
    success: { background: string; color: string; border: string };
    warning: { background: string; color: string; border: string };
    error: { background: string; color: string; border: string };
    info: { background: string; color: string; border: string };
  };
}

// Avatar Tokens
export interface AvatarTokens {
  size: {
    small: Record<DensityMode, number>;
    medium: Record<DensityMode, number>;
    large: Record<DensityMode, number>;
    xlarge: Record<DensityMode, number>;
  };
  fontSize: {
    small: Record<DensityMode, number>;
    medium: Record<DensityMode, number>;
    large: Record<DensityMode, number>;
    xlarge: Record<DensityMode, number>;
  };
  borderRadius: string;
  border: {
    width: number;
    color: string;
  };
  background: string;
  color: string;
  status: {
    size: {
      small: number;
      medium: number;
      large: number;
      xlarge: number;
    };
    position: {
      bottom: number;
      right: number;
    };
    border: {
      width: number;
      color: string;
    };
  };
}

// Alert Tokens
export interface AlertTokens extends BaseComponentTokens {
  padding: Record<DensityMode, { x: number; y: number }>;
  gap: Record<DensityMode, number>;
  borderWidth: number;
  iconSize: Record<DensityMode, number>;
  variants: {
    info: {
      background: string;
      color: string;
      border: string;
      icon: string;
    };
    success: {
      background: string;
      color: string;
      border: string;
      icon: string;
    };
    warning: {
      background: string;
      color: string;
      border: string;
      icon: string;
    };
    error: {
      background: string;
      color: string;
      border: string;
      icon: string;
    };
  };
}

// Tabs Tokens
export interface TabsTokens {
  list: {
    borderBottom: string;
    gap: Record<DensityMode, number>;
  };
  trigger: {
    height: Record<DensityMode, number>;
    padding: Record<DensityMode, { x: number; y: number }>;
    fontSize: Record<DensityMode, number>;
    fontWeight: {
      default: number;
      active: number;
    };
    color: {
      default: string;
      hover: string;
      active: string;
      disabled: string;
    };
    borderBottom: {
      width: number;
      color: string;
    };
  };
  content: {
    padding: Record<DensityMode, { x: number; y: number }>;
  };
}

// Tooltip Tokens
export interface TooltipTokens {
  maxWidth: number;
  padding: Record<DensityMode, { x: number; y: number }>;
  fontSize: Record<DensityMode, number>;
  background: string;
  color: string;
  borderRadius: Record<DensityMode, number>;
  shadow: string;
  arrow: {
    size: number;
  };
  offset: number;
  animation: {
    duration: number;
    timing: string;
  };
}

// Dropdown Tokens
export interface DropdownTokens {
  minWidth: number;
  maxHeight: number;
  padding: Record<DensityMode, number>;
  background: string;
  border: string;
  borderRadius: Record<DensityMode, number>;
  shadow: string;
  item: {
    height: Record<DensityMode, number>;
    padding: Record<DensityMode, { x: number; y: number }>;
    fontSize: Record<DensityMode, number>;
    color: {
      default: string;
      hover: string;
      active: string;
      disabled: string;
    };
    background: {
      default: string;
      hover: string;
      active: string;
    };
  };
  separator: {
    margin: Record<DensityMode, number>;
    color: string;
  };
}

// Switch Tokens
export interface SwitchTokens {
  width: Record<DensityMode, number>;
  height: Record<DensityMode, number>;
  padding: number;
  thumb: {
    size: Record<DensityMode, number>;
    background: string;
    shadow: string;
  };
  track: {
    background: {
      off: string;
      on: string;
    };
    border: string;
    borderRadius: string;
  };
  label: {
    gap: Record<DensityMode, number>;
    fontSize: Record<DensityMode, number>;
  };
  transition: {
    duration: number;
    timing: string;
  };
}

// Checkbox Tokens
export interface CheckboxTokens {
  size: Record<DensityMode, number>;
  borderRadius: Record<DensityMode, number>;
  borderWidth: number;
  borderColor: {
    default: string;
    hover: string;
    checked: string;
    disabled: string;
  };
  background: {
    default: string;
    hover: string;
    checked: string;
    disabled: string;
  };
  icon: {
    size: Record<DensityMode, number>;
    color: string;
  };
  label: {
    gap: Record<DensityMode, number>;
    fontSize: Record<DensityMode, number>;
  };
}

// Radio Tokens
export interface RadioTokens {
  size: Record<DensityMode, number>;
  borderRadius: string;
  borderWidth: number;
  borderColor: {
    default: string;
    hover: string;
    checked: string;
    disabled: string;
  };
  background: {
    default: string;
    hover: string;
    checked: string;
    disabled: string;
  };
  dot: {
    size: Record<DensityMode, number>;
    background: string;
  };
  label: {
    gap: Record<DensityMode, number>;
    fontSize: Record<DensityMode, number>;
  };
}

// Select Tokens
export interface SelectTokens extends InputTokens {
  chevron: {
    size: Record<DensityMode, number>;
    color: string;
  };
  option: {
    height: Record<DensityMode, number>;
    padding: Record<DensityMode, { x: number; y: number }>;
    background: {
      default: string;
      hover: string;
      selected: string;
    };
  };
}

// Textarea Tokens
export interface TextareaTokens extends InputTokens {
  minHeight: Record<DensityMode, number>;
  resize: {
    handle: {
      size: number;
      color: string;
    };
  };
}

// Table Tokens
export interface TableTokens {
  header: {
    height: Record<DensityMode, number>;
    padding: Record<DensityMode, { x: number; y: number }>;
    background: string;
    borderBottom: string;
    fontSize: Record<DensityMode, number>;
    fontWeight: number;
    color: string;
  };
  row: {
    height: Record<DensityMode, number>;
    padding: Record<DensityMode, { x: number; y: number }>;
    borderBottom: string;
    hover: {
      background: string;
    };
    striped: {
      background: string;
    };
  };
  cell: {
    padding: Record<DensityMode, { x: number; y: number }>;
    fontSize: Record<DensityMode, number>;
  };
}

// List Tokens
export interface ListTokens {
  item: {
    padding: Record<DensityMode, { x: number; y: number }>;
    gap: Record<DensityMode, number>;
    borderBottom: string;
    hover: {
      background: string;
    };
  };
  bullet: {
    size: Record<DensityMode, number>;
    gap: Record<DensityMode, number>;
    color: string;
  };
}

// Accordion Tokens
export interface AccordionTokens {
  item: {
    borderBottom: string;
  };
  trigger: {
    padding: Record<DensityMode, { x: number; y: number }>;
    fontSize: Record<DensityMode, number>;
    fontWeight: number;
    color: {
      default: string;
      hover: string;
      active: string;
    };
    icon: {
      size: Record<DensityMode, number>;
      rotation: {
        collapsed: string;
        expanded: string;
      };
    };
  };
  content: {
    padding: Record<DensityMode, { x: number; y: number }>;
  };
  animation: {
    duration: number;
    timing: string;
  };
}

// Breadcrumb Tokens
export interface BreadcrumbTokens {
  fontSize: Record<DensityMode, number>;
  gap: Record<DensityMode, number>;
  separator: {
    content: string;
    color: string;
    margin: Record<DensityMode, number>;
  };
  link: {
    color: {
      default: string;
      hover: string;
      current: string;
    };
  };
}

// Pagination Tokens
export interface PaginationTokens {
  gap: Record<DensityMode, number>;
  item: {
    size: Record<DensityMode, number>;
    fontSize: Record<DensityMode, number>;
    borderRadius: Record<DensityMode, number>;
    color: {
      default: string;
      hover: string;
      active: string;
      disabled: string;
    };
    background: {
      default: string;
      hover: string;
      active: string;
    };
    border: {
      default: string;
      hover: string;
      active: string;
    };
  };
}

// Skeleton Tokens
export interface SkeletonTokens {
  borderRadius: Record<DensityMode, number>;
  background: {
    base: string;
    shimmer: string;
  };
  animation: {
    duration: number;
    timing: string;
  };
}

// Progress Tokens
export interface ProgressTokens {
  height: Record<DensityMode, number>;
  borderRadius: Record<DensityMode, number>;
  background: string;
  fill: {
    background: string;
    transition: {
      duration: number;
      timing: string;
    };
  };
  label: {
    fontSize: Record<DensityMode, number>;
    color: string;
  };
}

// Slider Tokens
export interface SliderTokens {
  track: {
    height: Record<DensityMode, number>;
    borderRadius: string;
    background: {
      default: string;
      filled: string;
    };
  };
  thumb: {
    size: Record<DensityMode, number>;
    borderRadius: string;
    background: string;
    border: string;
    shadow: string;
    hover: {
      scale: number;
      shadow: string;
    };
  };
  label: {
    fontSize: Record<DensityMode, number>;
    gap: Record<DensityMode, number>;
  };
}

// Divider Tokens
export interface DividerTokens {
  thickness: number;
  color: string;
  margin: Record<DensityMode, { x: number; y: number }>;
  orientation: {
    horizontal: {
      width: string;
      height: number;
    };
    vertical: {
      width: number;
      height: string;
    };
  };
}

// Default token values
export const componentTokens: ComponentTokens = {
  button: {
    height: {
      small: { compact: 28, medium: 32, large: 36 },
      medium: { compact: 32, medium: 40, large: 44 },
      large: { compact: 36, medium: 44, large: 48 },
    },
    padding: {
      compact: { x: 12, y: 4 },
      medium: { x: 16, y: 8 },
      large: { x: 20, y: 10 },
    },
    fontSize: {
      compact: 13,
      medium: 14,
      large: 16,
    },
    borderRadius: {
      compact: 4,
      medium: 6,
      large: 8,
    },
    minWidth: {
      compact: 64,
      medium: 80,
      large: 96,
    },
    iconSize: {
      small: { compact: 14, medium: 16, large: 18 },
      medium: { compact: 16, medium: 18, large: 20 },
      large: { compact: 18, medium: 20, large: 22 },
    },
    gap: {
      compact: 4,
      medium: 6,
      large: 8,
    },
    fontWeight: {
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
    variants: {
      primary: {
        background: 'var(--primary)',
        text: 'var(--primary-foreground)',
        border: 'transparent',
        hover: {
          background: 'var(--primary-hover)',
          text: 'var(--primary-foreground)',
          border: 'transparent',
        },
      },
      secondary: {
        background: 'var(--secondary)',
        text: 'var(--secondary-foreground)',
        border: 'transparent',
        hover: {
          background: 'var(--secondary-hover)',
          text: 'var(--secondary-foreground)',
          border: 'transparent',
        },
      },
      outline: {
        background: 'transparent',
        text: 'var(--foreground)',
        border: 'var(--border)',
        hover: {
          background: 'var(--accent)',
          text: 'var(--accent-foreground)',
          border: 'var(--border)',
        },
      },
      ghost: {
        background: 'transparent',
        text: 'var(--foreground)',
        border: 'transparent',
        hover: {
          background: 'var(--accent)',
          text: 'var(--accent-foreground)',
          border: 'transparent',
        },
      },
      destructive: {
        background: 'var(--destructive)',
        text: 'var(--destructive-foreground)',
        border: 'transparent',
        hover: {
          background: 'var(--destructive-hover)',
          text: 'var(--destructive-foreground)',
          border: 'transparent',
        },
      },
    },
  },
  // ... Additional component tokens would continue here
  // This is a starting point - the full implementation would include all components
};

// Helper function to get component tokens by density
export function getComponentTokens<T extends keyof ComponentTokens>(
  component: T,
  density: DensityMode = 'medium'
): ComponentTokens[T] {
  const tokens = componentTokens[component];
  
  // Create a density-aware version of the tokens
  // This would be implemented based on the specific component structure
  return tokens;
}

// Export individual component token getters
export const getButtonTokens = (density: DensityMode = 'medium') => 
  getComponentTokens('button', density);

export const getInputTokens = (density: DensityMode = 'medium') => 
  getComponentTokens('input', density);

export const getCardTokens = (density: DensityMode = 'medium') => 
  getComponentTokens('card', density);

// ... Additional getters for each component type