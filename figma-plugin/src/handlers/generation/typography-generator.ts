/**
 * Typography System Generator
 * Generates typography scales and text styles in Figma
 */

interface TypographyScale {
  name: string;
  fontSize: number;
  lineHeight: number | 'auto';
  fontWeight: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontFamily?: string;
}

interface TypographyCategory {
  name: string;
  description: string;
  scales: TypographyScale[];
}

// Default typography scales based on common design systems
const DEFAULT_TYPOGRAPHY_SCALES: TypographyCategory[] = [
  {
    name: 'Display',
    description: 'Large display text for hero sections',
    scales: [
      { name: 'Display XL', fontSize: 72, lineHeight: 1.1, fontWeight: 700 },
      { name: 'Display LG', fontSize: 60, lineHeight: 1.1, fontWeight: 700 },
      { name: 'Display MD', fontSize: 48, lineHeight: 1.2, fontWeight: 600 },
      { name: 'Display SM', fontSize: 36, lineHeight: 1.2, fontWeight: 600 }
    ]
  },
  {
    name: 'Headings',
    description: 'Section headings and titles',
    scales: [
      { name: 'Heading 1', fontSize: 32, lineHeight: 1.25, fontWeight: 600 },
      { name: 'Heading 2', fontSize: 28, lineHeight: 1.3, fontWeight: 600 },
      { name: 'Heading 3', fontSize: 24, lineHeight: 1.35, fontWeight: 600 },
      { name: 'Heading 4', fontSize: 20, lineHeight: 1.4, fontWeight: 500 },
      { name: 'Heading 5', fontSize: 18, lineHeight: 1.5, fontWeight: 500 },
      { name: 'Heading 6', fontSize: 16, lineHeight: 1.5, fontWeight: 500 }
    ]
  },
  {
    name: 'Body',
    description: 'Body text and paragraphs',
    scales: [
      { name: 'Body XL', fontSize: 20, lineHeight: 1.6, fontWeight: 400 },
      { name: 'Body LG', fontSize: 18, lineHeight: 1.6, fontWeight: 400 },
      { name: 'Body MD', fontSize: 16, lineHeight: 1.5, fontWeight: 400 },
      { name: 'Body SM', fontSize: 14, lineHeight: 1.5, fontWeight: 400 },
      { name: 'Body XS', fontSize: 12, lineHeight: 1.5, fontWeight: 400 }
    ]
  },
  {
    name: 'UI Text',
    description: 'Interface labels and controls',
    scales: [
      { name: 'Label LG', fontSize: 14, lineHeight: 1.4, fontWeight: 500 },
      { name: 'Label MD', fontSize: 13, lineHeight: 1.4, fontWeight: 500 },
      { name: 'Label SM', fontSize: 12, lineHeight: 1.3, fontWeight: 500 },
      { name: 'Caption', fontSize: 12, lineHeight: 1.4, fontWeight: 400 },
      { name: 'Overline', fontSize: 11, lineHeight: 1.3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }
    ]
  },
  {
    name: 'Code',
    description: 'Monospace text for code',
    scales: [
      { name: 'Code LG', fontSize: 16, lineHeight: 1.5, fontWeight: 400, fontFamily: 'monospace' },
      { name: 'Code MD', fontSize: 14, lineHeight: 1.5, fontWeight: 400, fontFamily: 'monospace' },
      { name: 'Code SM', fontSize: 13, lineHeight: 1.5, fontWeight: 400, fontFamily: 'monospace' }
    ]
  }
];

/**
 * Generate typography system in Figma
 */
export async function generateTypographySystem(): Promise<void> {
  try {
    // Create or find the typography page
    let typographyPage = figma.root.children.find(function(page) {
      return page.name === '📝 Typography System';
    });

    if (!typographyPage) {
      typographyPage = figma.createPage();
      typographyPage.name = '📝 Typography System';
    }

    // Clear existing content
    typographyPage.children.forEach(function(child) {
      child.remove();
    });

    // Switch to the typography page
    await figma.setCurrentPageAsync(typographyPage);

    // Create main frame
    const mainFrame = figma.createFrame();
    mainFrame.name = 'Typography System';
    mainFrame.x = 0;
    mainFrame.y = 0;
    mainFrame.resize(1200, 2400);
    mainFrame.fills = [{
      type: 'SOLID',
      color: { r: 0.98, g: 0.98, b: 0.98 }
    }];

    // Set up auto layout
    mainFrame.layoutMode = 'VERTICAL';
    mainFrame.primaryAxisSizingMode = 'AUTO';
    mainFrame.counterAxisSizingMode = 'FIXED';
    mainFrame.paddingLeft = 64;
    mainFrame.paddingRight = 64;
    mainFrame.paddingTop = 64;
    mainFrame.paddingBottom = 64;
    mainFrame.itemSpacing = 48;

    // Create title
    const titleText = figma.createText();
    await loadFont({ family: 'Inter', style: 'Bold' });
    titleText.fontName = { family: 'Inter', style: 'Bold' };
    titleText.fontSize = 48;
    titleText.characters = 'Typography System';
    titleText.fills = [{
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0 }
    }];
    mainFrame.appendChild(titleText);

    // Create description
    const descText = figma.createText();
    await loadFont({ family: 'Inter', style: 'Regular' });
    descText.fontName = { family: 'Inter', style: 'Regular' };
    descText.fontSize = 16;
    descText.characters = 'A comprehensive typography scale for consistent text styling across your design system.';
    descText.fills = [{
      type: 'SOLID',
      color: { r: 0.4, g: 0.4, b: 0.4 }
    }];
    descText.layoutSizingHorizontal = 'FILL';
    mainFrame.appendChild(descText);

    // Generate each category
    let yOffset = 0;
    for (let i = 0; i < DEFAULT_TYPOGRAPHY_SCALES.length; i++) {
      const category = DEFAULT_TYPOGRAPHY_SCALES[i];
      const categoryFrame = await createTypographyCategory(category, yOffset);
      mainFrame.appendChild(categoryFrame);
      yOffset += 400;
    }

    // Create text styles
    await createTextStyles();

    // Notify success
    figma.ui.postMessage({
      type: 'PAGES_GENERATED',
      data: { message: 'Typography system generated successfully!' }
    });

  } catch (error) {
    console.error('Error generating typography system:', error);
    figma.ui.postMessage({
      type: 'ERROR',
      data: { message: 'Failed to generate typography system: ' + (error instanceof Error ? error.message : 'Unknown error') }
    });
  }
}

/**
 * Create a typography category section
 */
async function createTypographyCategory(category: TypographyCategory, yOffset: number): Promise<FrameNode> {
  const categoryFrame = figma.createFrame();
  categoryFrame.name = category.name;
  categoryFrame.layoutMode = 'VERTICAL';
  categoryFrame.primaryAxisSizingMode = 'AUTO';
  categoryFrame.counterAxisSizingMode = 'FILL';
  categoryFrame.itemSpacing = 24;
  categoryFrame.fills = [];

  // Category title
  const categoryTitle = figma.createText();
  await loadFont({ family: 'Inter', style: 'Semi Bold' });
  categoryTitle.fontName = { family: 'Inter', style: 'Semi Bold' };
  categoryTitle.fontSize = 24;
  categoryTitle.characters = category.name;
  categoryTitle.fills = [{
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0 }
  }];
  categoryFrame.appendChild(categoryTitle);

  // Category description
  const categoryDesc = figma.createText();
  await loadFont({ family: 'Inter', style: 'Regular' });
  categoryDesc.fontName = { family: 'Inter', style: 'Regular' };
  categoryDesc.fontSize = 14;
  categoryDesc.characters = category.description;
  categoryDesc.fills = [{
    type: 'SOLID',
    color: { r: 0.5, g: 0.5, b: 0.5 }
  }];
  categoryDesc.layoutSizingHorizontal = 'FILL';
  categoryFrame.appendChild(categoryDesc);

  // Create samples for each scale
  for (let i = 0; i < category.scales.length; i++) {
    const scale = category.scales[i];
    const scaleFrame = await createTypographySample(scale);
    categoryFrame.appendChild(scaleFrame);
  }

  return categoryFrame;
}

/**
 * Create a typography sample
 */
async function createTypographySample(scale: TypographyScale): Promise<FrameNode> {
  const sampleFrame = figma.createFrame();
  sampleFrame.name = scale.name;
  sampleFrame.layoutMode = 'VERTICAL';
  sampleFrame.primaryAxisSizingMode = 'AUTO';
  sampleFrame.counterAxisSizingMode = 'FILL';
  sampleFrame.itemSpacing = 8;
  sampleFrame.paddingLeft = 24;
  sampleFrame.paddingRight = 24;
  sampleFrame.paddingTop = 16;
  sampleFrame.paddingBottom = 16;
  sampleFrame.cornerRadius = 8;
  sampleFrame.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 }
  }];
  sampleFrame.strokes = [{
    type: 'SOLID',
    color: { r: 0.9, g: 0.9, b: 0.9 }
  }];
  sampleFrame.strokeWeight = 1;

  // Create specs row
  const specsFrame = figma.createFrame();
  specsFrame.layoutMode = 'HORIZONTAL';
  specsFrame.primaryAxisSizingMode = 'FILL';
  specsFrame.counterAxisSizingMode = 'AUTO';
  specsFrame.itemSpacing = 24;
  specsFrame.fills = [];

  // Scale name
  const nameText = figma.createText();
  await loadFont({ family: 'Inter', style: 'Medium' });
  nameText.fontName = { family: 'Inter', style: 'Medium' };
  nameText.fontSize = 12;
  nameText.characters = scale.name;
  nameText.fills = [{
    type: 'SOLID',
    color: { r: 0.2, g: 0.2, b: 0.2 }
  }];
  specsFrame.appendChild(nameText);

  // Font size
  const sizeText = figma.createText();
  sizeText.fontName = { family: 'Inter', style: 'Regular' };
  sizeText.fontSize = 12;
  sizeText.characters = scale.fontSize + 'px';
  sizeText.fills = [{
    type: 'SOLID',
    color: { r: 0.5, g: 0.5, b: 0.5 }
  }];
  specsFrame.appendChild(sizeText);

  // Font weight
  const weightText = figma.createText();
  weightText.fontName = { family: 'Inter', style: 'Regular' };
  weightText.fontSize = 12;
  weightText.characters = 'Weight: ' + scale.fontWeight;
  weightText.fills = [{
    type: 'SOLID',
    color: { r: 0.5, g: 0.5, b: 0.5 }
  }];
  specsFrame.appendChild(weightText);

  // Line height
  const lineHeightText = figma.createText();
  lineHeightText.fontName = { family: 'Inter', style: 'Regular' };
  lineHeightText.fontSize = 12;
  const lineHeightValue = scale.lineHeight === 'auto' ? 'auto' : (scale.fontSize * scale.lineHeight).toFixed(0) + 'px';
  lineHeightText.characters = 'Line: ' + lineHeightValue;
  lineHeightText.fills = [{
    type: 'SOLID',
    color: { r: 0.5, g: 0.5, b: 0.5 }
  }];
  specsFrame.appendChild(lineHeightText);

  sampleFrame.appendChild(specsFrame);

  // Sample text
  const sampleText = figma.createText();
  const fontStyle = getFontStyle(scale.fontWeight);
  await loadFont({ family: scale.fontFamily || 'Inter', style: fontStyle });
  sampleText.fontName = { family: scale.fontFamily || 'Inter', style: fontStyle };
  sampleText.fontSize = scale.fontSize;
  sampleText.characters = getSampleText(scale.name);
  sampleText.fills = [{
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0 }
  }];
  sampleText.layoutSizingHorizontal = 'FILL';
  
  // Apply additional properties
  if (scale.lineHeight !== 'auto') {
    sampleText.lineHeight = {
      value: scale.fontSize * scale.lineHeight,
      unit: 'PIXELS'
    };
  }
  
  if (scale.letterSpacing !== undefined) {
    sampleText.letterSpacing = {
      value: scale.letterSpacing,
      unit: 'PIXELS'
    };
  }
  
  if (scale.textTransform === 'uppercase') {
    sampleText.textCase = 'UPPER';
  } else if (scale.textTransform === 'lowercase') {
    sampleText.textCase = 'LOWER';
  } else if (scale.textTransform === 'capitalize') {
    sampleText.textCase = 'TITLE';
  }

  sampleFrame.appendChild(sampleText);

  return sampleFrame;
}

/**
 * Get appropriate font style based on weight
 */
function getFontStyle(weight: number): string {
  if (weight <= 300) return 'Light';
  if (weight <= 400) return 'Regular';
  if (weight <= 500) return 'Medium';
  if (weight <= 600) return 'Semi Bold';
  if (weight <= 700) return 'Bold';
  if (weight <= 800) return 'Extra Bold';
  return 'Black';
}

/**
 * Get sample text based on typography scale name
 */
function getSampleText(name: string): string {
  if (name.includes('Display')) {
    return 'Display Typography';
  } else if (name.includes('Heading')) {
    return 'The quick brown fox jumps over the lazy dog';
  } else if (name.includes('Body')) {
    return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
  } else if (name.includes('Label')) {
    return 'Button Label';
  } else if (name.includes('Caption')) {
    return 'This is a caption text';
  } else if (name.includes('Overline')) {
    return 'OVERLINE TEXT';
  } else if (name.includes('Code')) {
    return 'const example = "Hello, World!";';
  }
  return 'The quick brown fox jumps over the lazy dog';
}

/**
 * Create text styles in Figma
 */
async function createTextStyles(): Promise<void> {
  // Get existing text styles
  const existingStyles = figma.getLocalTextStyles();
  
  // Create new text styles for each scale
  for (let i = 0; i < DEFAULT_TYPOGRAPHY_SCALES.length; i++) {
    const category = DEFAULT_TYPOGRAPHY_SCALES[i];
    
    for (let j = 0; j < category.scales.length; j++) {
      const scale = category.scales[j];
      const styleName = category.name + '/' + scale.name;
      
      // Check if style already exists
      let textStyle = existingStyles.find(function(style) {
        return style.name === styleName;
      });
      
      if (!textStyle) {
        textStyle = figma.createTextStyle();
        textStyle.name = styleName;
      }
      
      // Apply properties
      const fontStyle = getFontStyle(scale.fontWeight);
      await loadFont({ family: scale.fontFamily || 'Inter', style: fontStyle });
      textStyle.fontName = { family: scale.fontFamily || 'Inter', style: fontStyle };
      textStyle.fontSize = scale.fontSize;
      
      if (scale.lineHeight !== 'auto') {
        textStyle.lineHeight = {
          value: scale.fontSize * scale.lineHeight,
          unit: 'PIXELS'
        };
      }
      
      if (scale.letterSpacing !== undefined) {
        textStyle.letterSpacing = {
          value: scale.letterSpacing,
          unit: 'PIXELS'
        };
      }
      
      if (scale.textTransform === 'uppercase') {
        textStyle.textCase = 'UPPER';
      } else if (scale.textTransform === 'lowercase') {
        textStyle.textCase = 'LOWER';
      } else if (scale.textTransform === 'capitalize') {
        textStyle.textCase = 'TITLE';
      }
    }
  }
}

/**
 * Load font with fallback
 */
async function loadFont(font: FontName): Promise<void> {
  try {
    await figma.loadFontAsync(font);
  } catch (error) {
    console.warn('Failed to load font, trying fallbacks...', font);
    
    // Try fallback fonts
    const fallbacks = [
      { family: 'Inter', style: 'Regular' },
      { family: 'Roboto', style: 'Regular' }
    ];
    
    for (let i = 0; i < fallbacks.length; i++) {
      try {
        await figma.loadFontAsync(fallbacks[i]);
        return;
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Could not load any fonts');
  }
}

/**
 * Extract typography data from codebase (for future integration)
 */
export async function extractTypographyFromCode(): Promise<TypographyCategory[]> {
  // This would integrate with MCP to extract typography from the codebase
  // For now, return default scales
  return DEFAULT_TYPOGRAPHY_SCALES;
}