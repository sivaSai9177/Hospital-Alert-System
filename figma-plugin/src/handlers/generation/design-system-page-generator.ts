// Design System Page Generator with Dynamic Component Extraction
// Follows Figma's component patterns for swatches and headers
// Optimized for free Figma plan with single mode limitation

interface ComponentTemplate {
  id: string;
  name: string;
  type: 'COMPONENT' | 'INSTANCE';
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  autoLayout?: {
    mode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
    spacing: number;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
}

// Default theme color definitions matching global.css
interface ThemeColors {
  light: Record<string, string>;
  dark: Record<string, string>;
}

const DEFAULT_THEME_COLORS: ThemeColors = {
  light: {
    // Base colors
    '--background': '0 0% 100%',
    '--foreground': '222.2 84% 4.9%',
    '--card': '0 0% 100%',
    '--card-foreground': '222.2 84% 4.9%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '222.2 84% 4.9%',
    
    // Semantic colors
    '--primary': '222.2 47.4% 11.2%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '210 40% 96%',
    '--secondary-foreground': '222.2 84% 4.9%',
    '--muted': '210 40% 96%',
    '--muted-foreground': '215.4 16.3% 46.9%',
    '--accent': '210 40% 96%',
    '--accent-foreground': '222.2 84% 4.9%',
    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '210 40% 98%',
    
    // UI colors
    '--border': '214.3 31.8% 91.4%',
    '--input': '214.3 31.8% 91.4%',
    '--ring': '222.2 84% 4.9%',
    
    // Sidebar colors
    '--sidebar-background': '0 0% 98%',
    '--sidebar-foreground': '240 5.3% 26.1%',
    '--sidebar-primary': '240 5.9% 10%',
    '--sidebar-primary-foreground': '0 0% 98%',
    '--sidebar-accent': '240 4.8% 95.9%',
    '--sidebar-accent-foreground': '240 5.9% 10%',
    '--sidebar-border': '220 13% 91%',
    '--sidebar-ring': '217.2 91.2% 59.8%',
  },
  dark: {
    // Base colors
    '--background': '222.2 84% 4.9%',
    '--foreground': '210 40% 98%',
    '--card': '222.2 84% 4.9%',
    '--card-foreground': '210 40% 98%',
    '--popover': '222.2 84% 4.9%',
    '--popover-foreground': '210 40% 98%',
    
    // Semantic colors
    '--primary': '210 40% 98%',
    '--primary-foreground': '222.2 47.4% 11.2%',
    '--secondary': '217.2 32.6% 17.5%',
    '--secondary-foreground': '210 40% 98%',
    '--muted': '217.2 32.6% 17.5%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '217.2 32.6% 17.5%',
    '--accent-foreground': '210 40% 98%',
    '--destructive': '0 62.8% 30.6%',
    '--destructive-foreground': '210 40% 98%',
    
    // UI colors
    '--border': '217.2 32.6% 17.5%',
    '--input': '217.2 32.6% 17.5%',
    '--ring': '212.7 26.8% 83.9%',
  }
};

interface SwatchConfig {
  baseComponent?: ComponentNode;
  gradientComponent?: ComponentNode;
  width: number;
  height: number;
  spacing: number;
  showGradient?: boolean;
}

interface DesignSystemPageConfig {
  header: {
    title: string;
    subtitle?: string;
    component?: ComponentNode;
  };
  sections: {
    colors?: boolean;
    typography?: boolean;
    spacing?: boolean;
    effects?: boolean;
    components?: boolean;
  };
  layout: {
    pageWidth: number;
    pageHeight: number;
    padding: number;
    sectionSpacing: number;
    gridColumns: number;
  };
}

// Helper function to convert HSL to RGB
function hslToRgb(hslStr: string): { r: number; g: number; b: number } {
  const [h, s, l] = hslStr.split(' ').map((v, i) => {
    const num = parseFloat(v);
    return i === 0 ? num / 360 : num / 100;
  });

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255) / 255,
    g: Math.round(g * 255) / 255,
    b: Math.round(b * 255) / 255
  };
}

// Helper to format color name
function formatColorName(cssVar: string): string {
  return cssVar
    .replace('--', '')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Use function-based approach instead of class for better compatibility
async function loadComponents() {
  const components = {
    swatchBase: null as ComponentNode | null,
    swatchGradient: null as ComponentNode | null,
    header: null as ComponentNode | null
  };
  
  try {
    // Search for swatch components in the current page
    const foundComponents = figma.currentPage.findAll(node => 
      node.type === 'COMPONENT' && 
      (node.name.includes('_Swatch') || node.name.includes('Design system header'))
    ) as ComponentNode[];
    
    foundComponents.forEach(comp => {
      if (comp.name === '_Swatch base') {
        components.swatchBase = comp;
      } else if (comp.name === '_Swatch base gradient') {
        components.swatchGradient = comp;
      } else if (comp.name.includes('Design system header')) {
        components.header = comp;
      }
    });
    
    console.log('Loaded components:', {
      swatchBase: !!components.swatchBase,
      swatchGradient: !!components.swatchGradient,
      header: !!components.header
    });
  } catch (error) {
    console.error('Error loading components:', error);
  }
  
  return components;
}

export class DesignSystemPageGenerator {
  constructor() {
    // No properties needed here for compatibility
  }
  
  /**
   * Load existing components from the document
   */
  private async loadComponents() {
    try {
      // Search for swatch components in the current page
      const components = figma.currentPage.findAll(node => 
        node.type === 'COMPONENT' && 
        (node.name.includes('_Swatch') || node.name.includes('Design system header'))
      ) as ComponentNode[];
      
      components.forEach(comp => {
        if (comp.name === '_Swatch base') {
          this.swatchBaseComponent = comp;
        } else if (comp.name === '_Swatch base gradient') {
          this.swatchGradientComponent = comp;
        } else if (comp.name.includes('Design system header')) {
          this.headerComponent = comp;
        }
      });
      
      console.log('Loaded components:', {
        swatchBase: !!this.swatchBaseComponent,
        swatchGradient: !!this.swatchGradientComponent,
        header: !!this.headerComponent
      });
    } catch (error) {
      console.error('Error loading components:', error);
    }
  }
  
  /**
   * Generate a complete design system page
   */
  async generateDesignSystemPage(config: DesignSystemPageConfig): Promise<PageNode> {
    // Create or find the design system page
    let page = figma.root.children.find(p => p.name === '🎨 Design System') as PageNode;
    
    if (!page) {
      page = figma.createPage();
      page.name = '🎨 Design System';
    }
    
    await page.loadAsync();
    
    // Clear existing content
    page.children.forEach(child => child.remove());
    
    // Create main container
    const mainContainer = figma.createFrame();
    mainContainer.name = 'Design System Container';
    mainContainer.resize(config.layout.pageWidth, config.layout.pageHeight);
    mainContainer.x = 0;
    mainContainer.y = 0;
    mainContainer.layoutMode = 'VERTICAL';
    mainContainer.primaryAxisSizingMode = 'AUTO';
    mainContainer.counterAxisSizingMode = 'AUTO';
    mainContainer.paddingTop = config.layout.padding;
    mainContainer.paddingBottom = config.layout.padding;
    mainContainer.paddingLeft = config.layout.padding;
    mainContainer.paddingRight = config.layout.padding;
    mainContainer.itemSpacing = config.layout.sectionSpacing;
    mainContainer.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
    
    page.appendChild(mainContainer);
    
    // Add header
    if (config.header) {
      await this.addHeader(mainContainer, config.header);
    }
    
    // Add sections based on configuration
    if (config.sections.colors) {
      await this.addColorSection(mainContainer, config.layout);
    }
    
    if (config.sections.typography) {
      await this.addTypographySection(mainContainer, config.layout);
    }
    
    if (config.sections.spacing) {
      await this.addSpacingSection(mainContainer, config.layout);
    }
    
    if (config.sections.effects) {
      await this.addEffectsSection(mainContainer, config.layout);
    }
    
    if (config.sections.components) {
      await this.addComponentsSection(mainContainer, config.layout);
    }
    
    return page;
  }
  
  /**
   * Add header section using header component or creating new one
   */
  private async addHeader(parent: FrameNode, headerConfig: any) {
    if (this.headerComponent) {
      // Use existing header component
      const headerInstance = this.headerComponent.createInstance();
      headerInstance.name = 'Design System Header';
      
      // Update text if it's an instance
      const titleText = headerInstance.findOne(n => n.type === 'TEXT' && n.name.includes('Title')) as TextNode;
      if (titleText) {
        await figma.loadFontAsync(titleText.fontName as FontName);
        titleText.characters = headerConfig.title;
      }
      
      const subtitleText = headerInstance.findOne(n => n.type === 'TEXT' && n.name.includes('Subtitle')) as TextNode;
      if (subtitleText && headerConfig.subtitle) {
        await figma.loadFontAsync(subtitleText.fontName as FontName);
        subtitleText.characters = headerConfig.subtitle;
      }
      
      parent.appendChild(headerInstance);
    } else {
      // Create new header
      const header = figma.createFrame();
      header.name = 'Design System Header';
      header.layoutMode = 'VERTICAL';
      header.primaryAxisSizingMode = 'FIXED';
      header.counterAxisSizingMode = 'AUTO';
      header.resize(2400, 510);
      header.paddingTop = 32;
      header.paddingBottom = 32;
      header.paddingLeft = 32;
      header.paddingRight = 32;
      header.itemSpacing = 16;
      header.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      
      // Add title
      const title = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
      title.fontName = { family: "Inter", style: "Bold" };
      title.fontSize = 48;
      title.characters = headerConfig.title;
      title.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
      
      header.appendChild(title);
      
      // Add subtitle if provided
      if (headerConfig.subtitle) {
        const subtitle = figma.createText();
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        subtitle.fontName = { family: "Inter", style: "Regular" };
        subtitle.fontSize = 20;
        subtitle.characters = headerConfig.subtitle;
        subtitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
        
        header.appendChild(subtitle);
      }
      
      parent.appendChild(header);
    }
  }
  
  /**
   * Add color section with dynamic swatches
   */
  private async addColorSection(parent: FrameNode, layout: any) {
    const section = figma.createFrame();
    section.name = 'Colors';
    section.layoutMode = 'VERTICAL';
    section.primaryAxisSizingMode = 'AUTO';
    section.counterAxisSizingMode = 'AUTO';
    section.itemSpacing = 48;
    
    // Section title
    const sectionTitle = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    sectionTitle.fontName = { family: "Inter", style: "Bold" };
    sectionTitle.fontSize = 32;
    sectionTitle.characters = 'Colors';
    sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    section.appendChild(sectionTitle);
    
    // Create color groups
    const colorCategories = [
      {
        name: 'Base Colors',
        colors: ['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground']
      },
      {
        name: 'Semantic Colors',
        colors: ['primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'destructive-foreground']
      },
      {
        name: 'UI Colors',
        colors: ['border', 'input', 'ring']
      },
      {
        name: 'Sidebar Colors',
        colors: ['sidebar-background', 'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground', 'sidebar-accent', 'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring']
      }
    ];
    
    // Create light and dark mode sections
    for (const mode of ['Light Mode', 'Dark Mode']) {
      const modeFrame = figma.createFrame();
      modeFrame.name = mode;
      modeFrame.layoutMode = 'VERTICAL';
      modeFrame.primaryAxisSizingMode = 'AUTO';
      modeFrame.counterAxisSizingMode = 'AUTO';
      modeFrame.itemSpacing = 32;
      
      // Mode title
      const modeTitle = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
      modeTitle.fontName = { family: "Inter", style: "Semi Bold" };
      modeTitle.fontSize = 24;
      modeTitle.characters = mode;
      modeTitle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.22 } }];
      
      modeFrame.appendChild(modeTitle);
      
      // Create swatches for each category
      for (const category of colorCategories) {
        const categoryFrame = figma.createFrame();
        categoryFrame.name = `${category.name} - ${mode}`;
        categoryFrame.layoutMode = 'VERTICAL';
        categoryFrame.primaryAxisSizingMode = 'AUTO';
        categoryFrame.counterAxisSizingMode = 'AUTO';
        categoryFrame.itemSpacing = 16;
        
        // Category title
        const categoryTitle = figma.createText();
        await figma.loadFontAsync({ family: "Inter", style: "Medium" });
        categoryTitle.fontName = { family: "Inter", style: "Medium" };
        categoryTitle.fontSize = 18;
        categoryTitle.characters = category.name;
        categoryTitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
        
        categoryFrame.appendChild(categoryTitle);
        
        // Swatch grid
        const swatchGrid = figma.createFrame();
        swatchGrid.name = 'Swatch Grid';
        swatchGrid.layoutMode = 'HORIZONTAL';
        swatchGrid.layoutWrap = 'WRAP';
        swatchGrid.primaryAxisSizingMode = 'AUTO';
        swatchGrid.counterAxisSizingMode = 'AUTO';
        swatchGrid.itemSpacing = 20;
        swatchGrid.counterAxisSpacing = 20;
        
        // Create swatches for this category
        for (const colorName of category.colors) {
          const cssVar = `--${colorName}`;
          const themeColors = mode === 'Light Mode' ? DEFAULT_THEME_COLORS.light : DEFAULT_THEME_COLORS.dark;
          
          if (themeColors[cssVar]) {
            const swatch = await this.createThemeColorSwatch(colorName, themeColors[cssVar], mode === 'Light Mode');
            swatchGrid.appendChild(swatch);
          }
        }
        
        categoryFrame.appendChild(swatchGrid);
        modeFrame.appendChild(categoryFrame);
      }
      
      section.appendChild(modeFrame);
    }
    
    parent.appendChild(section);
  }
  
  /**
   * Create a theme color swatch
   */
  private async createThemeColorSwatch(name: string, hslValue: string, isLight: boolean): Promise<FrameNode> {
    const swatch = figma.createFrame();
    swatch.name = `Swatch - ${name}`;
    swatch.resize(160, 156);
    swatch.layoutMode = 'VERTICAL';
    swatch.primaryAxisSizingMode = 'FIXED';
    swatch.counterAxisSizingMode = 'FIXED';
    swatch.itemSpacing = 0;
    swatch.cornerRadius = 8;
    swatch.effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.08 },
      offset: { x: 0, y: 2 },
      radius: 8,
      visible: true,
      blendMode: 'NORMAL',
      showShadowBehindNode: false
    }];
    
    // Color preview
    const colorPreview = figma.createRectangle();
    colorPreview.name = 'Color Preview';
    colorPreview.resize(160, 120);
    colorPreview.topLeftRadius = 8;
    colorPreview.topRightRadius = 8;
    
    // Convert HSL to RGB for Figma
    const rgb = hslToRgb(hslValue);
    colorPreview.fills = [{
      type: 'SOLID',
      color: rgb
    }];
    
    // Info container
    const infoContainer = figma.createFrame();
    infoContainer.name = 'Info';
    infoContainer.resize(160, 36);
    infoContainer.layoutMode = 'VERTICAL';
    infoContainer.primaryAxisAlignItems = 'CENTER';
    infoContainer.counterAxisAlignItems = 'CENTER';
    infoContainer.paddingTop = 8;
    infoContainer.paddingBottom = 8;
    infoContainer.paddingLeft = 12;
    infoContainer.paddingRight = 12;
    infoContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    
    // Variable name
    const nameText = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    nameText.fontName = { family: "Inter", style: "Medium" };
    nameText.fontSize = 12;
    nameText.characters = formatColorName(name);
    nameText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.22 } }];
    nameText.textAlignHorizontal = 'CENTER';
    
    infoContainer.appendChild(nameText);
    swatch.appendChild(colorPreview);
    swatch.appendChild(infoContainer);
    
    return swatch;
  }
  
  /**
   * Create a color swatch using component or custom frame
   */
  private async createColorSwatch(variable: Variable): Promise<FrameNode | InstanceNode> {
    if (this.swatchBaseComponent) {
      // Use existing swatch component
      const swatchInstance = this.swatchBaseComponent.createInstance();
      swatchInstance.name = `Swatch - ${variable.name}`;
      
      // Find the color rectangle and apply the variable
      const colorRect = swatchInstance.findOne(n => 
        n.type === 'RECTANGLE' && n.name.includes('Color')
      ) as RectangleNode;
      
      if (colorRect) {
        // Apply variable binding
        const fillsCopy = [{
          type: 'SOLID' as const,
          color: { r: 0, g: 0, b: 0 },
          boundVariables: {
            'color': {
              type: 'VARIABLE_ALIAS' as const,
              id: variable.id
            }
          }
        }];
        colorRect.fills = fillsCopy;
      }
      
      // Update the label
      const labelText = swatchInstance.findOne(n => 
        n.type === 'TEXT' && n.name.includes('Label')
      ) as TextNode;
      
      if (labelText) {
        await figma.loadFontAsync(labelText.fontName as FontName);
        labelText.characters = variable.name.split('/').pop() || variable.name;
      }
      
      return swatchInstance;
    } else {
      // Create custom swatch following the pattern
      const swatch = figma.createFrame();
      swatch.name = `Swatch - ${variable.name}`;
      swatch.resize(160, 156);
      swatch.layoutMode = 'VERTICAL';
      swatch.primaryAxisSizingMode = 'FIXED';
      swatch.counterAxisSizingMode = 'FIXED';
      swatch.itemSpacing = 0;
      swatch.cornerRadius = 8;
      swatch.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.08 },
        offset: { x: 0, y: 2 },
        radius: 8,
        visible: true,
        blendMode: 'NORMAL',
        showShadowBehindNode: false
      }];
      
      // Color preview
      const colorPreview = figma.createRectangle();
      colorPreview.name = 'Color Preview';
      colorPreview.resize(160, 120);
      colorPreview.topLeftRadius = 8;
      colorPreview.topRightRadius = 8;
      
      // Apply variable binding
      const fillsCopy = [{
        type: 'SOLID' as const,
        color: { r: 0, g: 0, b: 0 },
        boundVariables: {
          'color': {
            type: 'VARIABLE_ALIAS' as const,
            id: variable.id
          }
        }
      }];
      colorPreview.fills = fillsCopy;
      
      // Info container
      const infoContainer = figma.createFrame();
      infoContainer.name = 'Info';
      infoContainer.resize(160, 36);
      infoContainer.layoutMode = 'VERTICAL';
      infoContainer.primaryAxisAlignItems = 'CENTER';
      infoContainer.counterAxisAlignItems = 'CENTER';
      infoContainer.paddingTop = 8;
      infoContainer.paddingBottom = 8;
      infoContainer.paddingLeft = 12;
      infoContainer.paddingRight = 12;
      infoContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      
      // Variable name
      const nameText = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Medium" });
      nameText.fontName = { family: "Inter", style: "Medium" };
      nameText.fontSize = 12;
      nameText.characters = variable.name.split('/').pop() || variable.name;
      nameText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.22 } }];
      nameText.textAlignHorizontal = 'CENTER';
      
      infoContainer.appendChild(nameText);
      swatch.appendChild(colorPreview);
      swatch.appendChild(infoContainer);
      
      return swatch;
    }
  }
  
  /**
   * Add typography section
   */
  private async addTypographySection(parent: FrameNode, layout: any) {
    const section = figma.createFrame();
    section.name = 'Typography';
    section.layoutMode = 'VERTICAL';
    section.primaryAxisSizingMode = 'AUTO';
    section.counterAxisSizingMode = 'AUTO';
    section.itemSpacing = 32;
    
    // Section title
    const sectionTitle = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    sectionTitle.fontName = { family: "Inter", style: "Bold" };
    sectionTitle.fontSize = 32;
    sectionTitle.characters = 'Typography';
    sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    section.appendChild(sectionTitle);
    
    // Get text styles
    const textStyles = await figma.getLocalTextStylesAsync();
    
    // Create examples for each text style
    for (const style of textStyles) {
      const styleFrame = figma.createFrame();
      styleFrame.name = `Text Style - ${style.name}`;
      styleFrame.layoutMode = 'HORIZONTAL';
      styleFrame.primaryAxisSizingMode = 'AUTO';
      styleFrame.counterAxisSizingMode = 'AUTO';
      styleFrame.itemSpacing = 40;
      styleFrame.paddingTop = 24;
      styleFrame.paddingBottom = 24;
      styleFrame.paddingLeft = 32;
      styleFrame.paddingRight = 32;
      styleFrame.cornerRadius = 8;
      styleFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      
      // Sample text
      const sampleText = figma.createText();
      await style.loadAsync();
      sampleText.textStyleId = style.id;
      sampleText.characters = 'The quick brown fox jumps over the lazy dog';
      
      // Style info
      const infoText = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      infoText.fontName = { family: "Inter", style: "Regular" };
      infoText.fontSize = 14;
      infoText.characters = `${style.name}\n${style.fontSize}px / ${style.lineHeight}`;
      infoText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
      
      styleFrame.appendChild(sampleText);
      styleFrame.appendChild(infoText);
      section.appendChild(styleFrame);
    }
    
    parent.appendChild(section);
  }
  
  /**
   * Add spacing section
   */
  private async addSpacingSection(parent: FrameNode, layout: any) {
    const section = figma.createFrame();
    section.name = 'Spacing';
    section.layoutMode = 'VERTICAL';
    section.primaryAxisSizingMode = 'AUTO';
    section.counterAxisSizingMode = 'AUTO';
    section.itemSpacing = 32;
    
    // Section title
    const sectionTitle = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    sectionTitle.fontName = { family: "Inter", style: "Bold" };
    sectionTitle.fontSize = 32;
    sectionTitle.characters = 'Spacing';
    sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    section.appendChild(sectionTitle);
    
    // Get spacing variables
    const spacingVariables = await figma.variables.getLocalVariablesAsync('FLOAT');
    const spacingVars = spacingVariables.filter(v => v.name.toLowerCase().includes('spacing'));
    
    // Create spacing grid
    const spacingGrid = figma.createFrame();
    spacingGrid.name = 'Spacing Grid';
    spacingGrid.layoutMode = 'HORIZONTAL';
    spacingGrid.layoutWrap = 'WRAP';
    spacingGrid.primaryAxisSizingMode = 'AUTO';
    spacingGrid.counterAxisSizingMode = 'AUTO';
    spacingGrid.itemSpacing = 24;
    spacingGrid.counterAxisSpacing = 24;
    
    for (const variable of spacingVars) {
      const spacingFrame = figma.createFrame();
      spacingFrame.name = variable.name;
      spacingFrame.resize(120, 120);
      spacingFrame.layoutMode = 'VERTICAL';
      spacingFrame.primaryAxisAlignItems = 'CENTER';
      spacingFrame.counterAxisAlignItems = 'CENTER';
      spacingFrame.itemSpacing = 12;
      spacingFrame.cornerRadius = 8;
      spacingFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      spacingFrame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }];
      spacingFrame.strokeWeight = 1;
      
      // Get the value for the current mode
      const value = Object.values(variable.valuesByMode)[0] as number;
      
      // Spacing visualization
      const spacingViz = figma.createRectangle();
      spacingViz.resize(value || 4, value || 4);
      spacingViz.fills = [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }];
      spacingViz.cornerRadius = 2;
      
      // Label
      const label = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Medium" });
      label.fontName = { family: "Inter", style: "Medium" };
      label.fontSize = 12;
      label.characters = `${value}px`;
      label.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.22 } }];
      
      spacingFrame.appendChild(spacingViz);
      spacingFrame.appendChild(label);
      spacingGrid.appendChild(spacingFrame);
    }
    
    section.appendChild(spacingGrid);
    parent.appendChild(section);
  }
  
  /**
   * Add effects section (shadows, blur, etc.)
   */
  private async addEffectsSection(parent: FrameNode, layout: any) {
    const section = figma.createFrame();
    section.name = 'Effects';
    section.layoutMode = 'VERTICAL';
    section.primaryAxisSizingMode = 'AUTO';
    section.counterAxisSizingMode = 'AUTO';
    section.itemSpacing = 32;
    
    // Section title
    const sectionTitle = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    sectionTitle.fontName = { family: "Inter", style: "Bold" };
    sectionTitle.fontSize = 32;
    sectionTitle.characters = 'Effects';
    sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    section.appendChild(sectionTitle);
    
    // Get effect styles
    const effectStyles = await figma.getLocalEffectStylesAsync();
    
    // Create effect examples
    const effectGrid = figma.createFrame();
    effectGrid.name = 'Effect Grid';
    effectGrid.layoutMode = 'HORIZONTAL';
    effectGrid.layoutWrap = 'WRAP';
    effectGrid.primaryAxisSizingMode = 'AUTO';
    effectGrid.counterAxisSizingMode = 'AUTO';
    effectGrid.itemSpacing = 32;
    effectGrid.counterAxisSpacing = 32;
    
    for (const style of effectStyles) {
      const effectFrame = figma.createFrame();
      effectFrame.name = `Effect - ${style.name}`;
      effectFrame.resize(200, 200);
      effectFrame.layoutMode = 'VERTICAL';
      effectFrame.primaryAxisAlignItems = 'CENTER';
      effectFrame.counterAxisAlignItems = 'CENTER';
      effectFrame.itemSpacing = 16;
      
      // Effect preview
      const preview = figma.createRectangle();
      preview.resize(120, 120);
      preview.cornerRadius = 8;
      preview.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      preview.effectStyleId = style.id;
      
      // Label
      const label = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Medium" });
      label.fontName = { family: "Inter", style: "Medium" };
      label.fontSize = 14;
      label.characters = style.name;
      label.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.22 } }];
      label.textAlignHorizontal = 'CENTER';
      
      effectFrame.appendChild(preview);
      effectFrame.appendChild(label);
      effectGrid.appendChild(effectFrame);
    }
    
    section.appendChild(effectGrid);
    parent.appendChild(section);
  }
  
  /**
   * Add components section
   */
  private async addComponentsSection(parent: FrameNode, layout: any) {
    const section = figma.createFrame();
    section.name = 'Components';
    section.layoutMode = 'VERTICAL';
    section.primaryAxisSizingMode = 'AUTO';
    section.counterAxisSizingMode = 'AUTO';
    section.itemSpacing = 48;
    
    // Section title
    const sectionTitle = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    sectionTitle.fontName = { family: "Inter", style: "Bold" };
    sectionTitle.fontSize = 32;
    sectionTitle.characters = 'Components';
    sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    section.appendChild(sectionTitle);
    
    // Get local components
    const components = figma.currentPage.findAll(n => n.type === 'COMPONENT') as ComponentNode[];
    
    // Group components by category (based on name prefix)
    const componentGroups = new Map<string, ComponentNode[]>();
    
    components.forEach(comp => {
      const category = comp.name.split('/')[0] || 'Other';
      if (!componentGroups.has(category)) {
        componentGroups.set(category, []);
      }
      componentGroups.get(category)!.push(comp);
    });
    
    // Create component showcases
    for (const [category, comps] of componentGroups) {
      const categoryFrame = figma.createFrame();
      categoryFrame.name = `Component Category - ${category}`;
      categoryFrame.layoutMode = 'VERTICAL';
      categoryFrame.primaryAxisSizingMode = 'AUTO';
      categoryFrame.counterAxisSizingMode = 'AUTO';
      categoryFrame.itemSpacing = 24;
      
      // Category title
      const categoryTitle = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
      categoryTitle.fontName = { family: "Inter", style: "Semi Bold" };
      categoryTitle.fontSize = 24;
      categoryTitle.characters = category;
      categoryTitle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.22 } }];
      
      categoryFrame.appendChild(categoryTitle);
      
      // Component grid
      const componentGrid = figma.createFrame();
      componentGrid.name = 'Component Grid';
      componentGrid.layoutMode = 'HORIZONTAL';
      componentGrid.layoutWrap = 'WRAP';
      componentGrid.primaryAxisSizingMode = 'AUTO';
      componentGrid.counterAxisSizingMode = 'AUTO';
      componentGrid.itemSpacing = 32;
      componentGrid.counterAxisSpacing = 32;
      
      // Add component instances
      for (const comp of comps) {
        const instanceFrame = figma.createFrame();
        instanceFrame.name = `Component Instance - ${comp.name}`;
        instanceFrame.layoutMode = 'VERTICAL';
        instanceFrame.primaryAxisSizingMode = 'AUTO';
        instanceFrame.counterAxisSizingMode = 'AUTO';
        instanceFrame.itemSpacing = 12;
        instanceFrame.paddingTop = 24;
        instanceFrame.paddingBottom = 24;
        instanceFrame.paddingLeft = 24;
        instanceFrame.paddingRight = 24;
        instanceFrame.cornerRadius = 8;
        instanceFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
        
        // Component instance
        const instance = comp.createInstance();
        
        // Component name
        const nameText = figma.createText();
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        nameText.fontName = { family: "Inter", style: "Regular" };
        nameText.fontSize = 12;
        nameText.characters = comp.name.split('/').pop() || comp.name;
        nameText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
        nameText.textAlignHorizontal = 'CENTER';
        
        instanceFrame.appendChild(instance);
        instanceFrame.appendChild(nameText);
        componentGrid.appendChild(instanceFrame);
      }
      
      categoryFrame.appendChild(componentGrid);
      section.appendChild(categoryFrame);
    }
    
    parent.appendChild(section);
  }
}

// Export the generator function
export async function generateDesignSystemPage(): Promise<void> {
  const generator = new DesignSystemPageGenerator();
  
  const config: DesignSystemPageConfig = {
    header: {
      title: 'Design System',
      subtitle: 'Default theme colors for light and dark modes'
    },
    sections: {
      colors: true,
      typography: false, // Disable for now as we focus on colors
      spacing: false,
      effects: false,
      components: false
    },
    layout: {
      pageWidth: 3040,
      pageHeight: 8198,
      padding: 64,
      sectionSpacing: 80,
      gridColumns: 6
    }
  };
  
  try {
    const page = await generator.generateDesignSystemPage(config);
    console.log('✅ Design system page generated successfully');
    
    // Switch to the new page
    figma.currentPage = page;
  } catch (error) {
    console.error('❌ Error generating design system page:', error);
    throw error;
  }
}