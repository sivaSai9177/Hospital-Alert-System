import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface ColorToken {
  id: string;
  name: string;
  value: string;
  rgb: { r: number; g: number; b: number };
  hex: string;
  hsl: { h: number; s: number; l: number };
  opacity: number;
  usage?: string[];
}

export interface TypographyToken {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textCase?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface SpacingToken {
  id: string;
  name: string;
  value: number;
  pixelValue: string;
  remValue: string;
}

export interface ComponentToken {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  variants?: Record<string, any>;
}

interface DesignSystemState {
  // Tokens
  colorTokens: ColorToken[];
  typographyTokens: TypographyToken[];
  spacingTokens: SpacingToken[];
  componentTokens: ComponentToken[];

  // UI State
  activeTab: string;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;

  // Actions
  setColorTokens: (tokens: ColorToken[]) => void;
  setTypographyTokens: (tokens: TypographyToken[]) => void;
  setSpacingTokens: (tokens: SpacingToken[]) => void;
  setComponentTokens: (tokens: ComponentToken[]) => void;
  
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Sync actions
  syncTokens: () => Promise<void>;
  exportTokens: (format: 'json' | 'css' | 'scss') => Promise<string>;
  importTokens: (data: string, format: 'json' | 'css' | 'scss') => Promise<void>;
  
  // Clear state
  clearTokens: () => void;
  reset: () => void;
}

const initialState = {
  colorTokens: [],
  typographyTokens: [],
  spacingTokens: [],
  componentTokens: [],
  activeTab: 'colors',
  isLoading: false,
  error: null,
  lastSync: null,
};

export const useDesignSystemStore = create<DesignSystemState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Token setters
        setColorTokens: (tokens) => set({ colorTokens: tokens }),
        setTypographyTokens: (tokens) => set({ typographyTokens: tokens }),
        setSpacingTokens: (tokens) => set({ spacingTokens: tokens }),
        setComponentTokens: (tokens) => set({ componentTokens: tokens }),

        // UI state setters
        setActiveTab: (tab) => set({ activeTab: tab }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),

        // Sync actions
        syncTokens: async () => {
          set({ isLoading: true, error: null });
          
          try {
            // Send message to plugin code to sync tokens
            parent.postMessage({
              pluginMessage: {
                type: 'sync-all-tokens'
              }
            }, '*');
            
            set({ lastSync: new Date() });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to sync tokens' });
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        exportTokens: async (format) => {
          const state = get();
          const tokens = {
            colors: state.colorTokens,
            typography: state.typographyTokens,
            spacing: state.spacingTokens,
            components: state.componentTokens,
          };

          switch (format) {
            case 'json':
              return JSON.stringify(tokens, null, 2);
            
            case 'css':
              return generateCSSTokens(tokens);
            
            case 'scss':
              return generateSCSSTokens(tokens);
            
            default:
              throw new Error('Unsupported format');
          }
        },

        importTokens: async (data, format) => {
          set({ isLoading: true, error: null });
          
          try {
            let tokens;
            
            switch (format) {
              case 'json':
                tokens = JSON.parse(data);
                break;
              
              case 'css':
              case 'scss':
                // Parse CSS/SCSS to extract tokens
                tokens = parseCSSTokens(data);
                break;
              
              default:
                throw new Error('Unsupported format');
            }

            if (tokens.colors) set({ colorTokens: tokens.colors });
            if (tokens.typography) set({ typographyTokens: tokens.typography });
            if (tokens.spacing) set({ spacingTokens: tokens.spacing });
            if (tokens.components) set({ componentTokens: tokens.components });
            
            set({ lastSync: new Date() });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to import tokens' });
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        // Clear actions
        clearTokens: () => {
          set({
            colorTokens: [],
            typographyTokens: [],
            spacingTokens: [],
            componentTokens: [],
          });
        },

        reset: () => set(initialState),
      }),
      {
        name: 'design-system-store',
        partialize: (state) => ({
          colorTokens: state.colorTokens,
          typographyTokens: state.typographyTokens,
          spacingTokens: state.spacingTokens,
          componentTokens: state.componentTokens,
          lastSync: state.lastSync,
        }),
      }
    ),
    {
      name: 'DesignSystemStore',
    }
  )
);

// Helper functions
function generateCSSTokens(tokens: any): string {
  let css = ':root {\n';
  
  // Colors
  tokens.colors?.forEach((color: ColorToken) => {
    css += `  --color-${color.name}: ${color.hex};\n`;
  });
  
  // Typography
  tokens.typography?.forEach((typo: TypographyToken) => {
    css += `  --font-${typo.name}: ${typo.fontSize}px;\n`;
    css += `  --font-${typo.name}-family: ${typo.fontFamily};\n`;
    css += `  --font-${typo.name}-weight: ${typo.fontWeight};\n`;
  });
  
  // Spacing
  tokens.spacing?.forEach((space: SpacingToken) => {
    css += `  --spacing-${space.name}: ${space.pixelValue};\n`;
  });
  
  css += '}';
  return css;
}

function generateSCSSTokens(tokens: any): string {
  let scss = '// Design System Tokens\n\n';
  
  // Colors
  scss += '// Colors\n';
  tokens.colors?.forEach((color: ColorToken) => {
    scss += `$color-${color.name}: ${color.hex};\n`;
  });
  
  scss += '\n// Typography\n';
  tokens.typography?.forEach((typo: TypographyToken) => {
    scss += `$font-${typo.name}-size: ${typo.fontSize}px;\n`;
    scss += `$font-${typo.name}-family: ${typo.fontFamily};\n`;
    scss += `$font-${typo.name}-weight: ${typo.fontWeight};\n`;
  });
  
  scss += '\n// Spacing\n';
  tokens.spacing?.forEach((space: SpacingToken) => {
    scss += `$spacing-${space.name}: ${space.pixelValue};\n`;
  });
  
  return scss;
}

function parseCSSTokens(css: string): any {
  // Simple CSS parser - in production, use a proper CSS parser
  const tokens = {
    colors: [],
    typography: [],
    spacing: [],
  };
  
  // This is a placeholder - implement proper CSS parsing
  return tokens;
}