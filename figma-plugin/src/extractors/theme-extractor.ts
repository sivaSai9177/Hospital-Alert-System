/**
 * Theme Registry Extractor
 * Extracts theme definitions from the theme registry
 */

export interface ThemeColor {
  name: string;
  light: string;
  dark: string;
}

export interface ThemeShadow {
  name: string;
  value: string;
}

export interface ExtractedTheme {
  name: string;
  colors: ThemeColor[];
  shadows?: ThemeShadow[];
}

// Theme definitions based on the registry structure
export const themes: ExtractedTheme[] = [
  {
    name: 'default',
    colors: [
      { name: 'background', light: '#ffffff', dark: '#0a0a0a' },
      { name: 'foreground', light: '#0a0a0a', dark: '#fafafa' },
      { name: 'card', light: '#ffffff', dark: '#0a0a0a' },
      { name: 'card-foreground', light: '#0a0a0a', dark: '#fafafa' },
      { name: 'popover', light: '#ffffff', dark: '#0a0a0a' },
      { name: 'popover-foreground', light: '#0a0a0a', dark: '#fafafa' },
      { name: 'primary', light: '#18181b', dark: '#fafafa' },
      { name: 'primary-foreground', light: '#fafafa', dark: '#18181b' },
      { name: 'secondary', light: '#f4f4f5', dark: '#27272a' },
      { name: 'secondary-foreground', light: '#18181b', dark: '#fafafa' },
      { name: 'muted', light: '#f4f4f5', dark: '#27272a' },
      { name: 'muted-foreground', light: '#71717a', dark: '#a1a1aa' },
      { name: 'accent', light: '#f4f4f5', dark: '#27272a' },
      { name: 'accent-foreground', light: '#18181b', dark: '#fafafa' },
      { name: 'destructive', light: '#ef4444', dark: '#dc2626' },
      { name: 'destructive-foreground', light: '#fafafa', dark: '#fafafa' },
      { name: 'border', light: '#e4e4e7', dark: '#27272a' },
      { name: 'input', light: '#e4e4e7', dark: '#27272a' },
      { name: 'ring', light: '#18181b', dark: '#d4d4d8' },
      { name: 'sidebar-background', light: '#f9fafb', dark: '#111827' },
      { name: 'sidebar-foreground', light: '#374151', dark: '#e5e7eb' },
      { name: 'sidebar-primary', light: '#1f2937', dark: '#f3f4f6' },
      { name: 'sidebar-primary-foreground', light: '#f9fafb', dark: '#111827' },
      { name: 'sidebar-accent', light: '#f3f4f6', dark: '#1f2937' },
      { name: 'sidebar-accent-foreground', light: '#374151', dark: '#e5e7eb' },
      { name: 'sidebar-border', light: '#e5e7eb', dark: '#374151' },
      { name: 'sidebar-ring', light: '#9ca3af', dark: '#6b7280' }
    ]
  },
  {
    name: 'glass',
    colors: [
      { name: 'background', light: 'rgba(255, 255, 255, 0.8)', dark: 'rgba(10, 10, 10, 0.8)' },
      { name: 'foreground', light: '#0a0a0a', dark: '#fafafa' },
      { name: 'card', light: 'rgba(255, 255, 255, 0.6)', dark: 'rgba(20, 20, 20, 0.6)' },
      { name: 'card-foreground', light: '#0a0a0a', dark: '#fafafa' },
      { name: 'popover', light: 'rgba(255, 255, 255, 0.9)', dark: 'rgba(20, 20, 20, 0.9)' },
      { name: 'popover-foreground', light: '#0a0a0a', dark: '#fafafa' },
      { name: 'primary', light: 'rgba(24, 24, 27, 0.9)', dark: 'rgba(250, 250, 250, 0.9)' },
      { name: 'primary-foreground', light: '#fafafa', dark: '#18181b' },
      { name: 'secondary', light: 'rgba(244, 244, 245, 0.6)', dark: 'rgba(39, 39, 42, 0.6)' },
      { name: 'secondary-foreground', light: '#18181b', dark: '#fafafa' },
      { name: 'muted', light: 'rgba(244, 244, 245, 0.4)', dark: 'rgba(39, 39, 42, 0.4)' },
      { name: 'muted-foreground', light: '#71717a', dark: '#a1a1aa' },
      { name: 'accent', light: 'rgba(59, 130, 246, 0.2)', dark: 'rgba(59, 130, 246, 0.2)' },
      { name: 'accent-foreground', light: '#1e40af', dark: '#93bbfc' },
      { name: 'destructive', light: 'rgba(239, 68, 68, 0.8)', dark: 'rgba(220, 38, 38, 0.8)' },
      { name: 'destructive-foreground', light: '#fafafa', dark: '#fafafa' },
      { name: 'border', light: 'rgba(228, 228, 231, 0.5)', dark: 'rgba(39, 39, 42, 0.5)' },
      { name: 'input', light: 'rgba(228, 228, 231, 0.5)', dark: 'rgba(39, 39, 42, 0.5)' },
      { name: 'ring', light: 'rgba(24, 24, 27, 0.5)', dark: 'rgba(212, 212, 216, 0.5)' }
    ],
    shadows: [
      { name: 'glass-sm', value: '0 2px 8px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.04)' },
      { name: 'glass-md', value: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)' },
      { name: 'glass-lg', value: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)' }
    ]
  },
  {
    name: 'bubblegum',
    colors: [
      { name: 'background', light: '#fef0f5', dark: '#3a0a1c' },
      { name: 'foreground', light: '#4a0a2a', dark: '#fde1ec' },
      { name: 'card', light: '#fde1ec', dark: '#4a0a2a' },
      { name: 'card-foreground', light: '#4a0a2a', dark: '#fde1ec' },
      { name: 'popover', light: '#fde1ec', dark: '#4a0a2a' },
      { name: 'popover-foreground', light: '#4a0a2a', dark: '#fde1ec' },
      { name: 'primary', light: '#ec4899', dark: '#f472b6' },
      { name: 'primary-foreground', light: '#ffffff', dark: '#4a0a2a' },
      { name: 'secondary', light: '#f9a8d4', dark: '#831843' },
      { name: 'secondary-foreground', light: '#4a0a2a', dark: '#fde1ec' },
      { name: 'muted', light: '#fbbfdb', dark: '#6b0a3a' },
      { name: 'muted-foreground', light: '#831843', dark: '#f9a8d4' },
      { name: 'accent', light: '#fbbfdb', dark: '#831843' },
      { name: 'accent-foreground', light: '#4a0a2a', dark: '#fde1ec' },
      { name: 'destructive', light: '#dc2626', dark: '#ef4444' },
      { name: 'destructive-foreground', light: '#ffffff', dark: '#ffffff' },
      { name: 'border', light: '#f9a8d4', dark: '#6b0a3a' },
      { name: 'input', light: '#f9a8d4', dark: '#6b0a3a' },
      { name: 'ring', light: '#ec4899', dark: '#f472b6' }
    ]
  },
  {
    name: 'ocean',
    colors: [
      { name: 'background', light: '#f0f9ff', dark: '#0a1628' },
      { name: 'foreground', light: '#0c4a6e', dark: '#e0f2fe' },
      { name: 'card', light: '#e0f2fe', dark: '#0c4a6e' },
      { name: 'card-foreground', light: '#0c4a6e', dark: '#e0f2fe' },
      { name: 'popover', light: '#e0f2fe', dark: '#0c4a6e' },
      { name: 'popover-foreground', light: '#0c4a6e', dark: '#e0f2fe' },
      { name: 'primary', light: '#0ea5e9', dark: '#38bdf8' },
      { name: 'primary-foreground', light: '#ffffff', dark: '#0a1628' },
      { name: 'secondary', light: '#7dd3fc', dark: '#075985' },
      { name: 'secondary-foreground', light: '#0c4a6e', dark: '#e0f2fe' },
      { name: 'muted', light: '#bae6fd', dark: '#164e63' },
      { name: 'muted-foreground', light: '#075985', dark: '#7dd3fc' },
      { name: 'accent', light: '#bae6fd', dark: '#075985' },
      { name: 'accent-foreground', light: '#0c4a6e', dark: '#e0f2fe' },
      { name: 'destructive', light: '#dc2626', dark: '#ef4444' },
      { name: 'destructive-foreground', light: '#ffffff', dark: '#ffffff' },
      { name: 'border', light: '#7dd3fc', dark: '#164e63' },
      { name: 'input', light: '#7dd3fc', dark: '#164e63' },
      { name: 'ring', light: '#0ea5e9', dark: '#38bdf8' }
    ]
  },
  {
    name: 'forest',
    colors: [
      { name: 'background', light: '#f0fdf4', dark: '#0a2e0a' },
      { name: 'foreground', light: '#14532d', dark: '#dcfce7' },
      { name: 'card', light: '#dcfce7', dark: '#14532d' },
      { name: 'card-foreground', light: '#14532d', dark: '#dcfce7' },
      { name: 'popover', light: '#dcfce7', dark: '#14532d' },
      { name: 'popover-foreground', light: '#14532d', dark: '#dcfce7' },
      { name: 'primary', light: '#22c55e', dark: '#4ade80' },
      { name: 'primary-foreground', light: '#ffffff', dark: '#0a2e0a' },
      { name: 'secondary', light: '#86efac', dark: '#166534' },
      { name: 'secondary-foreground', light: '#14532d', dark: '#dcfce7' },
      { name: 'muted', light: '#bbf7d0', dark: '#1e5f3e' },
      { name: 'muted-foreground', light: '#166534', dark: '#86efac' },
      { name: 'accent', light: '#bbf7d0', dark: '#166534' },
      { name: 'accent-foreground', light: '#14532d', dark: '#dcfce7' },
      { name: 'destructive', light: '#dc2626', dark: '#ef4444' },
      { name: 'destructive-foreground', light: '#ffffff', dark: '#ffffff' },
      { name: 'border', light: '#86efac', dark: '#1e5f3e' },
      { name: 'input', light: '#86efac', dark: '#1e5f3e' },
      { name: 'ring', light: '#22c55e', dark: '#4ade80' }
    ]
  },
  {
    name: 'sunset',
    colors: [
      { name: 'background', light: '#fef3c7', dark: '#451a03' },
      { name: 'foreground', light: '#78350f', dark: '#fef3c7' },
      { name: 'card', light: '#fed7aa', dark: '#78350f' },
      { name: 'card-foreground', light: '#78350f', dark: '#fed7aa' },
      { name: 'popover', light: '#fed7aa', dark: '#78350f' },
      { name: 'popover-foreground', light: '#78350f', dark: '#fed7aa' },
      { name: 'primary', light: '#f97316', dark: '#fb923c' },
      { name: 'primary-foreground', light: '#ffffff', dark: '#451a03' },
      { name: 'secondary', light: '#fdba74', dark: '#92400e' },
      { name: 'secondary-foreground', light: '#78350f', dark: '#fef3c7' },
      { name: 'muted', light: '#ffedd5', dark: '#7c2d12' },
      { name: 'muted-foreground', light: '#92400e', dark: '#fdba74' },
      { name: 'accent', light: '#ffedd5', dark: '#92400e' },
      { name: 'accent-foreground', light: '#78350f', dark: '#fef3c7' },
      { name: 'destructive', light: '#dc2626', dark: '#ef4444' },
      { name: 'destructive-foreground', light: '#ffffff', dark: '#ffffff' },
      { name: 'border', light: '#fdba74', dark: '#7c2d12' },
      { name: 'input', light: '#fdba74', dark: '#7c2d12' },
      { name: 'ring', light: '#f97316', dark: '#fb923c' }
    ]
  }
];

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGBA string to RGB with opacity
 */
export function rgbaToRgb(rgba: string): { r: number; g: number; b: number; a: number } | null {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1
  };
}

/**
 * Convert theme colors to Figma-compatible format
 */
export function themesToFigmaFormat() {
  const figmaThemes: any[] = [];
  
  for (const theme of themes) {
    const figmaTheme = {
      name: theme.name,
      colors: {} as any,
      shadows: theme.shadows || []
    };
    
    // Process colors for light and dark modes
    for (const color of theme.colors) {
      // Light mode
      const lightColor = color.light.startsWith('rgba') 
        ? rgbaToRgb(color.light)
        : hexToRgb(color.light);
        
      // Dark mode  
      const darkColor = color.dark.startsWith('rgba')
        ? rgbaToRgb(color.dark)
        : hexToRgb(color.dark);
      
      if (lightColor && darkColor) {
        figmaTheme.colors[color.name] = {
          light: lightColor,
          dark: darkColor
        };
      }
    }
    
    figmaThemes.push(figmaTheme);
  }
  
  return figmaThemes;
}

/**
 * Get all unique color variables across themes
 */
export function getAllColorVariables(): string[] {
  const colorSet = new Set<string>();
  
  for (const theme of themes) {
    for (const color of theme.colors) {
      colorSet.add(color.name);
    }
  }
  
  return Array.from(colorSet);
}