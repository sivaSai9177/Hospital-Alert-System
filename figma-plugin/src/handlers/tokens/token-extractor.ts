import { ColorToken, TypographyToken, SpacingToken, ShadowToken, GradientToken, DesignTokens } from '../../shared/types/design-tokens';
import { 
  extractContainerTokens, 
  extractGridTokens, 
  extractFlexTokens, 
  extractAspectRatioTokens, 
  extractZIndexTokens,
  extractBreakpointTokens 
} from '../../extractors/layout-extractor';
import {
  extractFilterTokens,
  extractBackdropFilterTokens,
  extractInteractionTokens,
  extractScrollTokens,
  extractAppearanceTokens
} from '../../extractors/effect-extractor';
// Animation tokens are handled in unified-token-mapper.ts
// import {
//   extractTransitionTokens,
//   extractAnimationTokens
// } from '../../extractors/animation-extractor';

export async function extractDesignTokens(): Promise<DesignTokens> {
  const tokens: DesignTokens = {
    colors: await extractColorTokens(),
    typography: await extractTypographyTokens(),
    spacing: await extractSpacingTokens(),
    shadows: await extractShadowTokens(),
    borderRadius: await extractBorderRadiusTokens(),
    gradients: await extractGradientTokens(),
    containers: await extractContainerTokens(),
    breakpoints: extractBreakpointTokens(),
    grids: await extractGridTokens(),
    flexLayouts: await extractFlexTokens(),
    aspectRatios: await extractAspectRatioTokens(),
    zIndex: await extractZIndexTokens(),
    filters: await extractFilterTokens(),
    backdropFilters: await extractBackdropFilterTokens(),
    interactions: await extractInteractionTokens(),
    scrollBehavior: await extractScrollTokens(),
    appearance: await extractAppearanceTokens(),
    // transitions: await extractTransitionTokens(),
    // animations: await extractAnimationTokens(),
    transitions: [], // Animation tokens are handled in unified-token-mapper
    animations: [], // Animation tokens are handled in unified-token-mapper
    version: '1.0.0',
    lastUpdated: new Date().toISOString()
  };

  return tokens;
}

async function extractColorTokens(): Promise<ColorToken[]> {
  const colors: ColorToken[] = [];
  const paintStyles = await figma.getLocalPaintStylesAsync();

  for (const style of paintStyles) {
    const paint = style.paints[0];
    if (paint && paint.type === 'SOLID') {
      const { r, g, b } = paint.color;
      const opacity = paint.opacity || 1;
      
      colors.push({
        name: style.name,
        value: rgbToHex(r, g, b, opacity),
        rgb: {
          r: Math.round(r * 255),
          g: Math.round(g * 255),
          b: Math.round(b * 255),
          a: opacity
        },
        description: style.description,
        category: categorizeColor(style.name)
      });
    }
  }

  return colors;
}

async function extractTypographyTokens(): Promise<TypographyToken[]> {
  const typography: TypographyToken[] = [];
  const textStyles = await figma.getLocalTextStylesAsync();

  for (const style of textStyles) {
    typography.push({
      name: style.name,
      fontFamily: style.fontName.family,
      fontSize: style.fontSize,
      fontWeight: mapFontWeight(style.fontName.style),
      lineHeight: style.lineHeight.unit === 'AUTO' ? 'auto' : style.lineHeight.value,
      letterSpacing: style.letterSpacing.value,
      textTransform: detectTextTransform(style),
      description: style.description
    });
  }

  return typography;
}

async function extractSpacingTokens(): Promise<SpacingToken[]> {
  // Extract spacing from auto-layout frames
  const spacing: SpacingToken[] = [];
  const frames = figma.currentPage.findAll(node => 
    node.type === 'FRAME' && 'layoutMode' in node && node.layoutMode !== 'NONE'
  ) as FrameNode[];

  const spacingValues = new Set<number>();
  
  frames.forEach(frame => {
    if (frame.itemSpacing) {
      spacingValues.add(frame.itemSpacing);
    }
    if ('paddingTop' in frame) {
      spacingValues.add(frame.paddingTop);
      spacingValues.add(frame.paddingRight);
      spacingValues.add(frame.paddingBottom);
      spacingValues.add(frame.paddingLeft);
    }
  });

  // Convert to spacing tokens
  Array.from(spacingValues).sort((a, b) => a - b).forEach((value, index) => {
    spacing.push({
      name: `spacing-${index}`,
      value: value,
      scale: value / 4, // Assuming base unit of 4
      description: `${value}px spacing`
    });
  });

  return spacing;
}

async function extractShadowTokens(): Promise<ShadowToken[]> {
  const shadows: ShadowToken[] = [];
  const effectStyles = await figma.getLocalEffectStylesAsync();

  for (const style of effectStyles) {
    const shadowEffects = style.effects.filter(effect => 
      effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW'
    );

    if (shadowEffects.length > 0) {
      shadows.push({
        name: style.name,
        value: shadowEffects.map(effect => ({
          color: rgbToHex(effect.color.r, effect.color.g, effect.color.b, effect.color.a),
          offset: { x: effect.offset.x, y: effect.offset.y },
          radius: effect.radius,
          spread: effect.spread || 0,
          opacity: effect.color.a
        })),
        description: style.description
      });
    }
  }

  return shadows;
}

async function extractBorderRadiusTokens(): Promise<any[]> {
  const borderRadii: any[] = [];
  const components = figma.currentPage.findAll(node => node.type === 'COMPONENT');
  
  const radiusValues = new Set<number>();
  
  components.forEach(component => {
    if ('cornerRadius' in component && typeof component.cornerRadius === 'number') {
      radiusValues.add(component.cornerRadius);
    }
  });

  Array.from(radiusValues).sort((a, b) => a - b).forEach((value, index) => {
    borderRadii.push({
      name: `radius-${index}`,
      value: value,
      description: `${value}px border radius`
    });
  });

  return borderRadii;
}

async function extractGradientTokens(): Promise<GradientToken[]> {
  const gradients: GradientToken[] = [];
  const paintStyles = await figma.getLocalPaintStylesAsync();

  for (const style of paintStyles) {
    const paint = style.paints[0];
    if (paint && (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR')) {
      const gradient = paint as GradientPaint;
      
      // Extract color stops
      const colorStops = gradient.gradientStops.map((stop, index) => ({
        color: rgbToHex(stop.color.r, stop.color.g, stop.color.b, stop.color.a),
        position: Math.round(stop.position * 100), // Convert to percentage
        rgb: {
          r: Math.round(stop.color.r * 255),
          g: Math.round(stop.color.g * 255),
          b: Math.round(stop.color.b * 255),
          a: stop.color.a
        }
      }));

      let gradientType: 'linear' | 'radial' | 'conic' = 'linear';
      let direction: string | undefined;

      if (paint.type === 'GRADIENT_LINEAR') {
        gradientType = 'linear';
        // Calculate direction from transform
        direction = calculateGradientDirection(gradient.gradientTransform);
      } else if (paint.type === 'GRADIENT_RADIAL') {
        gradientType = 'radial';
      } else if (paint.type === 'GRADIENT_ANGULAR') {
        gradientType = 'conic';
      }

      gradients.push({
        name: style.name,
        type: gradientType,
        direction: direction,
        colorStops: colorStops,
        description: style.description
      });
    }
  }

  return gradients;
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

function mapFontWeight(style: string): number {
  const weightMap: { [key: string]: number } = {
    'Thin': 100,
    'ExtraLight': 200,
    'Light': 300,
    'Regular': 400,
    'Medium': 500,
    'SemiBold': 600,
    'Bold': 700,
    'ExtraBold': 800,
    'Black': 900
  };

  for (const [key, value] of Object.entries(weightMap)) {
    if (style.includes(key)) {
      return value;
    }
  }

  return 400; // Default to regular
}

function detectTextTransform(style: TextStyle): 'none' | 'uppercase' | 'lowercase' | 'capitalize' {
  // Figma doesn't have built-in text transform, so we detect from naming convention
  const name = style.name.toLowerCase();
  if (name.includes('uppercase') || name.includes('caps')) return 'uppercase';
  if (name.includes('lowercase')) return 'lowercase';
  if (name.includes('capitalize') || name.includes('title')) return 'capitalize';
  return 'none';
}

function categorizeColor(name: string): ColorToken['category'] {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('primary')) return 'primary';
  if (lowerName.includes('secondary')) return 'secondary';
  if (lowerName.includes('accent')) return 'accent';
  if (lowerName.includes('success') || lowerName.includes('green')) return 'success';
  if (lowerName.includes('warning') || lowerName.includes('yellow') || lowerName.includes('orange')) return 'warning';
  if (lowerName.includes('danger') || lowerName.includes('error') || lowerName.includes('red')) return 'danger';
  if (lowerName.includes('info') || lowerName.includes('blue')) return 'info';
  return 'neutral';
}

function calculateGradientDirection(transform: Transform): string {
  // Transform is a 2x3 matrix [[a, b, c], [d, e, f]]
  // For gradients, this represents the transformation of the gradient vector
  
  // Calculate angle from transform matrix
  const dx = transform[0][0];
  const dy = transform[1][0];
  
  // Calculate angle in degrees
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Normalize angle to 0-360 range
  const normalizedAngle = (angle + 360) % 360;
  
  // Map to Tailwind direction classes
  if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return 'to-r';
  if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return 'to-br';
  if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return 'to-b';
  if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return 'to-bl';
  if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return 'to-l';
  if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return 'to-tl';
  if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return 'to-t';
  if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) return 'to-tr';
  
  return 'to-r'; // Default
}