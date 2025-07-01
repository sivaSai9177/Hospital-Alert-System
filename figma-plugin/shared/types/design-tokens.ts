export interface ColorToken {
  name: string;
  value: string;
  rgb?: RGBA;
  hsl?: HSL;
  opacity?: number;
  description?: string;
  category?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  // Variables API metadata
  variableId?: string;
  collectionId?: string;
  mode?: string;
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | 'auto';
  letterSpacing: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  description?: string;
}

export interface SpacingToken {
  name: string;
  value: number;
  scale?: number;
  density?: 'compact' | 'medium' | 'large';
  description?: string;
  // Variables API metadata
  variableId?: string;
  collectionId?: string;
  mode?: string;
}

export interface ShadowToken {
  name: string;
  value: ShadowEffect[];
  platform?: 'ios' | 'android' | 'web' | 'all';
  description?: string;
}

export interface ShadowEffect {
  color: string;
  offset: { x: number; y: number };
  radius: number;
  spread?: number;
  opacity?: number;
}

export interface BorderRadiusToken {
  name: string;
  value: number;
  description?: string;
  // Variables API metadata
  variableId?: string;
  collectionId?: string;
  mode?: string;
}

export interface TransitionToken {
  name: string;
  property?: string | string[]; // 'all', 'colors', 'opacity', 'shadow', 'transform', etc.
  duration?: number; // milliseconds
  timingFunction?: string; // 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', cubic-bezier
  delay?: number; // milliseconds
  behavior?: 'normal' | 'allow-discrete';
  description?: string;
}

export interface AnimationToken {
  name: string;
  duration: number; // milliseconds
  timingFunction?: string; // easing function
  delay?: number; // milliseconds
  iterationCount?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  playState?: 'running' | 'paused';
  keyframes?: AnimationKeyframe[];
  description?: string;
}

export interface AnimationKeyframe {
  offset: number; // 0-100 percentage
  transform?: string;
  opacity?: number;
  scale?: number;
  rotate?: number;
  translateX?: number;
  translateY?: number;
  backgroundColor?: string;
  borderColor?: string;
  filter?: string;
  [key: string]: any; // Allow other CSS properties
}

export interface GradientColorStop {
  color: string;
  position?: number; // 0-100 percentage
  rgb?: RGBA;
}

export interface GradientToken {
  name: string;
  type: 'linear' | 'radial' | 'conic';
  direction?: string; // 'to-r', 'to-br', '45deg', etc.
  colorStops: GradientColorStop[];
  description?: string;
  // For radial gradients
  centerX?: number;
  centerY?: number;
  // Variables API metadata
  variableId?: string;
  collectionId?: string;
  mode?: string;
}

export interface ContainerToken {
  name: string;
  maxWidth: number;
  padding?: number;
  description?: string;
}

export interface BreakpointToken {
  name: string;
  minWidth: number;
  description?: string;
}

export interface GridToken {
  name: string;
  columns: number;
  gap?: number;
  description?: string;
}

export interface FlexToken {
  name: string;
  direction?: 'row' | 'column';
  wrap?: boolean;
  gap?: number;
  alignItems?: string;
  justifyContent?: string;
  description?: string;
}

export interface AspectRatioToken {
  name: string;
  ratio: string; // e.g., "16:9", "1:1", "4:3"
  value: number; // Calculated decimal value
  description?: string;
}

export interface ZIndexToken {
  name: string;
  value: number;
  description?: string;
}

export interface FilterToken {
  name: string;
  blur?: number;           // px value
  brightness?: number;     // 0-200 (percentage)
  contrast?: number;       // 0-200 (percentage)
  grayscale?: number;      // 0-100 (percentage)
  hueRotate?: number;      // degrees
  invert?: number;         // 0-100 (percentage)
  opacity?: number;        // 0-100 (percentage)
  saturate?: number;       // 0-200 (percentage)
  sepia?: number;          // 0-100 (percentage)
  dropShadow?: ShadowEffect;
  description?: string;
}

export interface BackdropFilterToken {
  name: string;
  blur?: number;           // px value
  brightness?: number;     // 0-200 (percentage)
  contrast?: number;       // 0-200 (percentage)
  grayscale?: number;      // 0-100 (percentage)
  hueRotate?: number;      // degrees
  invert?: number;         // 0-100 (percentage)
  opacity?: number;        // 0-100 (percentage)
  saturate?: number;       // 0-200 (percentage)
  sepia?: number;          // 0-100 (percentage)
  description?: string;
}

export interface InteractionToken {
  name: string;
  pointerEvents?: 'none' | 'auto';
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  touchAction?: 'auto' | 'none' | 'pan-x' | 'pan-y' | 'manipulation' | 'pinch-zoom';
  userSelect?: 'none' | 'text' | 'all' | 'auto';
  cursor?: string;
  description?: string;
}

export interface ScrollToken {
  name: string;
  scrollBehavior?: 'auto' | 'smooth';
  scrollSnapType?: 'none' | 'x' | 'y' | 'both' | 'block' | 'inline';
  scrollSnapAlign?: 'start' | 'end' | 'center' | 'none';
  scrollSnapStop?: 'normal' | 'always';
  overscrollBehavior?: 'auto' | 'contain' | 'none';
  description?: string;
}

export interface AppearanceToken {
  name: string;
  appearance?: 'none' | 'auto';
  colorScheme?: 'normal' | 'light' | 'dark' | 'light dark';
  accentColor?: string;
  caretColor?: string;
  description?: string;
}

// Component-specific token types
export interface ComponentTokens {
  button?: ButtonTokens;
  input?: InputTokens;
  card?: CardTokens;
  dialog?: DialogTokens;
  badge?: BadgeTokens;
  avatar?: AvatarTokens;
  // Add more components as needed
}

export interface ButtonTokens {
  height?: Record<string, Record<string, number>>;
  padding?: Record<string, { x: number; y: number }>;
  fontSize?: Record<string, number>;
  borderRadius?: Record<string, number>;
  minWidth?: Record<string, number>;
  iconSize?: Record<string, Record<string, number>>;
  gap?: Record<string, number>;
  fontWeight?: Record<string, number>;
  shadow?: Record<string, string>;
  transition?: { duration: number; timing: string };
  variants?: Record<string, any>;
}

export interface InputTokens {
  height?: Record<string, Record<string, number>>;
  padding?: Record<string, { x: number; y: number }>;
  paddingX?: Record<string, number>;
  fontSize?: Record<string, number>;
  borderRadius?: Record<string, number>;
  borderWidth?: number;
  borderColor?: Record<string, string>;
  background?: Record<string, string>;
  placeholder?: { color: string; opacity: number };
  label?: any;
  helper?: any;
  icon?: any;
  transition?: { duration: number; timing: string };
}

export interface CardTokens {
  padding?: Record<string, { x: number; y: number }>;
  gap?: Record<string, number>;
  fontSize?: Record<string, number>;
  borderRadius?: Record<string, number>;
  border?: { width: number; color: string };
  shadow?: Record<string, string>;
  header?: any;
  footer?: any;
  transition?: { duration: number; timing: string };
}

export interface DialogTokens {
  overlay?: any;
  content?: any;
  header?: any;
  body?: any;
  footer?: any;
  animation?: any;
}

export interface BadgeTokens {
  height?: Record<string, number>;
  padding?: Record<string, { x: number; y: number }>;
  fontSize?: Record<string, number>;
  fontWeight?: number;
  borderRadius?: Record<string, number>;
  gap?: Record<string, number>;
  variants?: Record<string, any>;
}

export interface AvatarTokens {
  size?: Record<string, Record<string, number>>;
  fontSize?: Record<string, Record<string, number>>;
  borderRadius?: string;
  border?: { width: number; color: string };
  background?: string;
  color?: string;
  status?: any;
}

export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  shadows: ShadowToken[];
  borderRadius: BorderRadiusToken[];
  transitions?: TransitionToken[];
  animations?: AnimationToken[];
  opacity?: any[];
  gradients?: GradientToken[];
  containers?: ContainerToken[];
  breakpoints?: BreakpointToken[];
  grids?: GridToken[];
  flexLayouts?: FlexToken[];
  aspectRatios?: AspectRatioToken[];
  zIndex?: ZIndexToken[];
  filters?: FilterToken[];
  backdropFilters?: BackdropFilterToken[];
  interactions?: InteractionToken[];
  scrollBehavior?: ScrollToken[];
  appearance?: AppearanceToken[];
  components?: ComponentTokens;
  version?: string;
  lastUpdated?: string;
}