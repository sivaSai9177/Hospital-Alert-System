// Simplified Design System Page Generator
// Avoids class syntax for better compatibility with Figma's JavaScript environment

// Default theme color definitions matching global.css
const DEFAULT_THEME_COLORS = {
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

// Helper function to convert HSL to RGB
function hslToRgb(hslStr: string): { r: number; g: number; b: number } {
  const parts = hslStr.split(' ');
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = function(p: number, q: number, t: number) {
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
    .map(function(word) { return word.charAt(0).toUpperCase() + word.slice(1); })
    .join(' ');
}

// Create a color swatch
async function createColorSwatch(name: string, hslValue: string): Promise<FrameNode> {
  const swatch = figma.createFrame();
  swatch.name = 'Swatch - ' + name;
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

// Main function to generate design system page
export async function generateDesignSystemPage(): Promise<void> {
  try {
    // Create or find the design system page
    let page: PageNode | null = null;
    const pages = figma.root.children;
    
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].name === '🎨 Design System') {
        page = pages[i];
        break;
      }
    }
    
    if (!page) {
      page = figma.createPage();
      page.name = '🎨 Design System';
    }
    
    await page.loadAsync();
    
    // Clear existing content
    const children = page.children;
    for (let i = children.length - 1; i >= 0; i--) {
      children[i].remove();
    }
    
    // Create main container
    const mainContainer = figma.createFrame();
    mainContainer.name = 'Design System Container';
    mainContainer.resize(3040, 8198);
    mainContainer.x = 0;
    mainContainer.y = 0;
    mainContainer.layoutMode = 'VERTICAL';
    mainContainer.primaryAxisSizingMode = 'AUTO';
    mainContainer.counterAxisSizingMode = 'AUTO';
    mainContainer.paddingTop = 64;
    mainContainer.paddingBottom = 64;
    mainContainer.paddingLeft = 64;
    mainContainer.paddingRight = 64;
    mainContainer.itemSpacing = 80;
    mainContainer.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
    
    page.appendChild(mainContainer);
    
    // Add header
    const header = figma.createFrame();
    header.name = 'Design System Header';
    header.layoutMode = 'VERTICAL';
    header.primaryAxisSizingMode = 'FIXED';
    header.counterAxisSizingMode = 'AUTO';
    header.resize(2912, 200);
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
    title.characters = 'Design System';
    title.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    header.appendChild(title);
    
    // Add subtitle
    const subtitle = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    subtitle.fontName = { family: "Inter", style: "Regular" };
    subtitle.fontSize = 20;
    subtitle.characters = 'Default theme colors for light and dark modes';
    subtitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
    
    header.appendChild(subtitle);
    mainContainer.appendChild(header);
    
    // Add color section
    const colorSection = figma.createFrame();
    colorSection.name = 'Colors';
    colorSection.layoutMode = 'VERTICAL';
    colorSection.primaryAxisSizingMode = 'AUTO';
    colorSection.counterAxisSizingMode = 'AUTO';
    colorSection.itemSpacing = 48;
    
    // Section title
    const sectionTitle = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    sectionTitle.fontName = { family: "Inter", style: "Bold" };
    sectionTitle.fontSize = 32;
    sectionTitle.characters = 'Colors';
    sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    colorSection.appendChild(sectionTitle);
    
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
    const modes = ['Light Mode', 'Dark Mode'];
    for (let modeIndex = 0; modeIndex < modes.length; modeIndex++) {
      const mode = modes[modeIndex];
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
      for (let catIndex = 0; catIndex < colorCategories.length; catIndex++) {
        const category = colorCategories[catIndex];
        const categoryFrame = figma.createFrame();
        categoryFrame.name = category.name + ' - ' + mode;
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
        const themeColors = mode === 'Light Mode' ? DEFAULT_THEME_COLORS.light : DEFAULT_THEME_COLORS.dark;
        
        for (let colorIndex = 0; colorIndex < category.colors.length; colorIndex++) {
          const colorName = category.colors[colorIndex];
          const cssVar = '--' + colorName;
          
          if (themeColors[cssVar]) {
            const swatch = await createColorSwatch(colorName, themeColors[cssVar]);
            swatchGrid.appendChild(swatch);
          }
        }
        
        categoryFrame.appendChild(swatchGrid);
        modeFrame.appendChild(categoryFrame);
      }
      
      colorSection.appendChild(modeFrame);
    }
    
    mainContainer.appendChild(colorSection);
    
    // Switch to the new page using async API - pass the page node, not the ID
    await figma.setCurrentPageAsync(page);
    
    console.log('✅ Design system page generated successfully');
  } catch (error) {
    console.error('❌ Error generating design system page:', error);
    throw error;
  }
}