/**
 * Spacing System Generator
 * Generates spacing scales and layout components in Figma
 */

interface SpacingToken {
  name: string;
  value: number;
  scale: number;
  description?: string;
}

interface SpacingCategory {
  name: string;
  description: string;
  tokens: SpacingToken[];
}

// Default spacing scale based on 4px grid
const DEFAULT_SPACING_SCALE: SpacingCategory[] = [
  {
    name: 'Core Spacing',
    description: 'Base spacing units for consistent layouts',
    tokens: [
      { name: 'space-0', value: 0, scale: 0, description: 'No spacing' },
      { name: 'space-1', value: 4, scale: 1, description: 'Extra small spacing' },
      { name: 'space-2', value: 8, scale: 2, description: 'Small spacing' },
      { name: 'space-3', value: 12, scale: 3, description: 'Small-medium spacing' },
      { name: 'space-4', value: 16, scale: 4, description: 'Medium spacing' },
      { name: 'space-5', value: 20, scale: 5, description: 'Medium-large spacing' },
      { name: 'space-6', value: 24, scale: 6, description: 'Large spacing' },
      { name: 'space-8', value: 32, scale: 8, description: 'Extra large spacing' },
      { name: 'space-10', value: 40, scale: 10, description: 'Huge spacing' },
      { name: 'space-12', value: 48, scale: 12, description: 'Massive spacing' },
      { name: 'space-16', value: 64, scale: 16, description: 'Giant spacing' },
      { name: 'space-20', value: 80, scale: 20, description: 'Enormous spacing' },
      { name: 'space-24', value: 96, scale: 24, description: 'Colossal spacing' }
    ]
  },
  {
    name: 'Component Spacing',
    description: 'Common spacing for UI components',
    tokens: [
      { name: 'button-padding-x', value: 16, scale: 4, description: 'Horizontal button padding' },
      { name: 'button-padding-y', value: 8, scale: 2, description: 'Vertical button padding' },
      { name: 'input-padding', value: 12, scale: 3, description: 'Input field padding' },
      { name: 'card-padding', value: 24, scale: 6, description: 'Card content padding' },
      { name: 'modal-padding', value: 32, scale: 8, description: 'Modal content padding' },
      { name: 'section-spacing', value: 64, scale: 16, description: 'Between sections' }
    ]
  },
  {
    name: 'Layout Spacing',
    description: 'Spacing for page layouts and grids',
    tokens: [
      { name: 'grid-gap-sm', value: 16, scale: 4, description: 'Small grid gap' },
      { name: 'grid-gap-md', value: 24, scale: 6, description: 'Medium grid gap' },
      { name: 'grid-gap-lg', value: 32, scale: 8, description: 'Large grid gap' },
      { name: 'page-margin-mobile', value: 16, scale: 4, description: 'Mobile page margins' },
      { name: 'page-margin-tablet', value: 32, scale: 8, description: 'Tablet page margins' },
      { name: 'page-margin-desktop', value: 64, scale: 16, description: 'Desktop page margins' },
      { name: 'max-width-sm', value: 640, scale: 160, description: 'Small container' },
      { name: 'max-width-md', value: 768, scale: 192, description: 'Medium container' },
      { name: 'max-width-lg', value: 1024, scale: 256, description: 'Large container' },
      { name: 'max-width-xl', value: 1280, scale: 320, description: 'Extra large container' }
    ]
  }
];

/**
 * Generate spacing system in Figma
 */
export async function generateSpacingSystem(): Promise<void> {
  try {
    // Create or find the spacing page
    let spacingPage = figma.root.children.find(function(page) {
      return page.name === '📐 Spacing System';
    });

    if (!spacingPage) {
      spacingPage = figma.createPage();
      spacingPage.name = '📐 Spacing System';
    }

    // Clear existing content
    spacingPage.children.forEach(function(child) {
      child.remove();
    });

    // Switch to the spacing page
    await figma.setCurrentPageAsync(spacingPage);

    // Create main frame
    const mainFrame = figma.createFrame();
    mainFrame.name = 'Spacing System';
    mainFrame.x = 0;
    mainFrame.y = 0;
    mainFrame.resize(1600, 2000);
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
    titleText.characters = 'Spacing System';
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
    descText.characters = 'A comprehensive spacing system based on a 4px grid for consistent layouts.';
    descText.fills = [{
      type: 'SOLID',
      color: { r: 0.4, g: 0.4, b: 0.4 }
    }];
    descText.layoutSizingHorizontal = 'FILL';
    mainFrame.appendChild(descText);

    // Generate spacing visualizations
    for (let i = 0; i < DEFAULT_SPACING_SCALE.length; i++) {
      const category = DEFAULT_SPACING_SCALE[i];
      const categoryFrame = await createSpacingCategory(category);
      mainFrame.appendChild(categoryFrame);
    }

    // Create spacing components
    const componentsFrame = await createSpacingComponents();
    mainFrame.appendChild(componentsFrame);

    // Create grid examples
    const gridFrame = await createGridExamples();
    mainFrame.appendChild(gridFrame);

    // Notify success
    figma.ui.postMessage({
      type: 'PAGES_GENERATED',
      data: { message: 'Spacing system generated successfully!' }
    });

  } catch (error) {
    console.error('Error generating spacing system:', error);
    figma.ui.postMessage({
      type: 'ERROR',
      data: { message: 'Failed to generate spacing system: ' + (error instanceof Error ? error.message : 'Unknown error') }
    });
  }
}

/**
 * Create a spacing category section
 */
async function createSpacingCategory(category: SpacingCategory): Promise<FrameNode> {
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

  // Create token grid
  const tokenGrid = figma.createFrame();
  tokenGrid.name = 'Tokens';
  tokenGrid.layoutMode = 'VERTICAL';
  tokenGrid.primaryAxisSizingMode = 'AUTO';
  tokenGrid.counterAxisSizingMode = 'FILL';
  tokenGrid.itemSpacing = 12;
  tokenGrid.fills = [];

  // Create tokens
  for (let i = 0; i < category.tokens.length; i++) {
    const token = category.tokens[i];
    const tokenFrame = await createSpacingToken(token);
    tokenGrid.appendChild(tokenFrame);
  }

  categoryFrame.appendChild(tokenGrid);
  return categoryFrame;
}

/**
 * Create a spacing token visualization
 */
async function createSpacingToken(token: SpacingToken): Promise<FrameNode> {
  const tokenFrame = figma.createFrame();
  tokenFrame.name = token.name;
  tokenFrame.layoutMode = 'HORIZONTAL';
  tokenFrame.primaryAxisSizingMode = 'FILL';
  tokenFrame.counterAxisSizingMode = 'AUTO';
  tokenFrame.primaryAxisAlignItems = 'CENTER';
  tokenFrame.itemSpacing = 16;
  tokenFrame.paddingLeft = 16;
  tokenFrame.paddingRight = 16;
  tokenFrame.paddingTop = 12;
  tokenFrame.paddingBottom = 12;
  tokenFrame.cornerRadius = 8;
  tokenFrame.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 }
  }];
  tokenFrame.strokes = [{
    type: 'SOLID',
    color: { r: 0.9, g: 0.9, b: 0.9 }
  }];
  tokenFrame.strokeWeight = 1;

  // Token info container
  const infoContainer = figma.createFrame();
  infoContainer.layoutMode = 'VERTICAL';
  infoContainer.primaryAxisSizingMode = 'FIXED';
  infoContainer.counterAxisSizingMode = 'AUTO';
  infoContainer.resize(200, 1);
  infoContainer.itemSpacing = 4;
  infoContainer.fills = [];

  // Token name
  const nameText = figma.createText();
  await loadFont({ family: 'Inter', style: 'Medium' });
  nameText.fontName = { family: 'Inter', style: 'Medium' };
  nameText.fontSize = 14;
  nameText.characters = token.name;
  nameText.fills = [{
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0 }
  }];
  infoContainer.appendChild(nameText);

  // Token specs
  const specsFrame = figma.createFrame();
  specsFrame.layoutMode = 'HORIZONTAL';
  specsFrame.primaryAxisSizingMode = 'AUTO';
  specsFrame.counterAxisSizingMode = 'AUTO';
  specsFrame.itemSpacing = 12;
  specsFrame.fills = [];

  // Value
  const valueText = figma.createText();
  valueText.fontName = { family: 'Inter', style: 'Regular' };
  valueText.fontSize = 12;
  valueText.characters = token.value + 'px';
  valueText.fills = [{
    type: 'SOLID',
    color: { r: 0.5, g: 0.5, b: 0.5 }
  }];
  specsFrame.appendChild(valueText);

  // Scale
  const scaleText = figma.createText();
  scaleText.fontName = { family: 'Inter', style: 'Regular' };
  scaleText.fontSize = 12;
  scaleText.characters = token.scale + 'x';
  scaleText.fills = [{
    type: 'SOLID',
    color: { r: 0.5, g: 0.5, b: 0.5 }
  }];
  specsFrame.appendChild(scaleText);

  infoContainer.appendChild(specsFrame);

  // Description
  if (token.description) {
    const descText = figma.createText();
    descText.fontName = { family: 'Inter', style: 'Regular' };
    descText.fontSize = 11;
    descText.characters = token.description;
    descText.fills = [{
      type: 'SOLID',
      color: { r: 0.6, g: 0.6, b: 0.6 }
    }];
    infoContainer.appendChild(descText);
  }

  tokenFrame.appendChild(infoContainer);

  // Visual representation
  const visualFrame = figma.createFrame();
  visualFrame.layoutMode = 'HORIZONTAL';
  visualFrame.primaryAxisSizingMode = 'FILL';
  visualFrame.counterAxisSizingMode = 'AUTO';
  visualFrame.primaryAxisAlignItems = 'CENTER';
  visualFrame.counterAxisAlignItems = 'CENTER';
  visualFrame.fills = [];

  // Spacing box
  if (token.value <= 96) {
    const spacingBox = figma.createFrame();
    spacingBox.name = 'Spacing Visual';
    spacingBox.resize(token.value || 1, token.value || 1);
    spacingBox.fills = [{
      type: 'SOLID',
      color: { r: 0.4, g: 0.6, b: 1 },
      opacity: 0.3
    }];
    spacingBox.strokes = [{
      type: 'SOLID',
      color: { r: 0.4, g: 0.6, b: 1 }
    }];
    spacingBox.strokeWeight = 1;
    spacingBox.cornerRadius = 4;
    visualFrame.appendChild(spacingBox);
  } else {
    // For large values, show a line
    const spacingLine = figma.createFrame();
    spacingLine.name = 'Spacing Line';
    spacingLine.resize(Math.min(token.value, 400), 4);
    spacingLine.fills = [{
      type: 'SOLID',
      color: { r: 0.4, g: 0.6, b: 1 }
    }];
    spacingLine.cornerRadius = 2;
    visualFrame.appendChild(spacingLine);
  }

  tokenFrame.appendChild(visualFrame);
  return tokenFrame;
}

/**
 * Create spacing components
 */
async function createSpacingComponents(): Promise<FrameNode> {
  const componentsFrame = figma.createFrame();
  componentsFrame.name = 'Spacing Components';
  componentsFrame.layoutMode = 'VERTICAL';
  componentsFrame.primaryAxisSizingMode = 'AUTO';
  componentsFrame.counterAxisSizingMode = 'FILL';
  componentsFrame.itemSpacing = 24;
  componentsFrame.fills = [];

  // Title
  const title = figma.createText();
  await loadFont({ family: 'Inter', style: 'Semi Bold' });
  title.fontName = { family: 'Inter', style: 'Semi Bold' };
  title.fontSize = 24;
  title.characters = 'Spacing Components';
  title.fills = [{
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0 }
  }];
  componentsFrame.appendChild(title);

  // Description
  const desc = figma.createText();
  await loadFont({ family: 'Inter', style: 'Regular' });
  desc.fontName = { family: 'Inter', style: 'Regular' };
  desc.fontSize = 14;
  desc.characters = 'Reusable spacing components for consistent layouts';
  desc.fills = [{
    type: 'SOLID',
    color: { r: 0.5, g: 0.5, b: 0.5 }
  }];
  desc.layoutSizingHorizontal = 'FILL';
  componentsFrame.appendChild(desc);

  // Create component instances
  const componentGrid = figma.createFrame();
  componentGrid.layoutMode = 'HORIZONTAL';
  componentGrid.primaryAxisSizingMode = 'AUTO';
  componentGrid.counterAxisSizingMode = 'AUTO';
  componentGrid.itemSpacing = 24;
  componentGrid.layoutWrap = 'WRAP';
  componentGrid.fills = [];

  // Spacer components
  const spacerSizes = [4, 8, 16, 24, 32, 48, 64];
  for (let i = 0; i < spacerSizes.length; i++) {
    const size = spacerSizes[i];
    const spacer = await createSpacerComponent(size);
    componentGrid.appendChild(spacer);
  }

  componentsFrame.appendChild(componentGrid);
  return componentsFrame;
}

/**
 * Create a spacer component
 */
async function createSpacerComponent(size: number): Promise<ComponentNode> {
  const component = figma.createComponent();
  component.name = 'Spacer/' + size + 'px';
  component.resize(size, size);
  component.fills = [{
    type: 'SOLID',
    color: { r: 0.9, g: 0.9, b: 0.9 },
    opacity: 0.5
  }];
  component.strokes = [{
    type: 'SOLID',
    color: { r: 0.7, g: 0.7, b: 0.7 }
  }];
  component.strokeWeight = 1;
  component.strokeDashes = [2, 2];
  component.cornerRadius = 2;

  // Add label
  const label = figma.createText();
  await loadFont({ family: 'Inter', style: 'Regular' });
  label.fontName = { family: 'Inter', style: 'Regular' };
  label.fontSize = 10;
  label.characters = size + 'px';
  label.fills = [{
    type: 'SOLID',
    color: { r: 0.5, g: 0.5, b: 0.5 }
  }];
  label.textAlignHorizontal = 'CENTER';
  label.textAlignVertical = 'CENTER';
  label.resize(size, size);
  component.appendChild(label);

  return component;
}

/**
 * Create grid examples
 */
async function createGridExamples(): Promise<FrameNode> {
  const gridFrame = figma.createFrame();
  gridFrame.name = 'Grid Examples';
  gridFrame.layoutMode = 'VERTICAL';
  gridFrame.primaryAxisSizingMode = 'AUTO';
  gridFrame.counterAxisSizingMode = 'FILL';
  gridFrame.itemSpacing = 24;
  gridFrame.fills = [];

  // Title
  const title = figma.createText();
  await loadFont({ family: 'Inter', style: 'Semi Bold' });
  title.fontName = { family: 'Inter', style: 'Semi Bold' };
  title.fontSize = 24;
  title.characters = 'Grid Layout Examples';
  title.fills = [{
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0 }
  }];
  gridFrame.appendChild(title);

  // Grid examples container
  const examplesContainer = figma.createFrame();
  examplesContainer.layoutMode = 'VERTICAL';
  examplesContainer.primaryAxisSizingMode = 'AUTO';
  examplesContainer.counterAxisSizingMode = 'FILL';
  examplesContainer.itemSpacing = 32;
  examplesContainer.fills = [];

  // 12-column grid
  const grid12 = await createGridExample(12, 24);
  examplesContainer.appendChild(grid12);

  // 8-column grid
  const grid8 = await createGridExample(8, 32);
  examplesContainer.appendChild(grid8);

  // 4-column grid
  const grid4 = await createGridExample(4, 16);
  examplesContainer.appendChild(grid4);

  gridFrame.appendChild(examplesContainer);
  return gridFrame;
}

/**
 * Create a grid example
 */
async function createGridExample(columns: number, gap: number): Promise<FrameNode> {
  const gridContainer = figma.createFrame();
  gridContainer.name = columns + '-Column Grid';
  gridContainer.layoutMode = 'VERTICAL';
  gridContainer.primaryAxisSizingMode = 'AUTO';
  gridContainer.counterAxisSizingMode = 'FILL';
  gridContainer.itemSpacing = 12;
  gridContainer.fills = [];

  // Grid label
  const label = figma.createText();
  await loadFont({ family: 'Inter', style: 'Medium' });
  label.fontName = { family: 'Inter', style: 'Medium' };
  label.fontSize = 14;
  label.characters = columns + '-Column Grid (Gap: ' + gap + 'px)';
  label.fills = [{
    type: 'SOLID',
    color: { r: 0.2, g: 0.2, b: 0.2 }
  }];
  gridContainer.appendChild(label);

  // Grid frame
  const gridFrame = figma.createFrame();
  gridFrame.name = 'Grid';
  gridFrame.layoutMode = 'HORIZONTAL';
  gridFrame.primaryAxisSizingMode = 'FILL';
  gridFrame.counterAxisSizingMode = 'AUTO';
  gridFrame.itemSpacing = gap;
  gridFrame.paddingLeft = 0;
  gridFrame.paddingRight = 0;
  gridFrame.paddingTop = 0;
  gridFrame.paddingBottom = 0;
  gridFrame.fills = [];

  // Create columns
  for (let i = 0; i < columns; i++) {
    const column = figma.createFrame();
    column.name = 'Column ' + (i + 1);
    column.layoutSizingHorizontal = 'FILL';
    column.resize(1, 100);
    column.fills = [{
      type: 'SOLID',
      color: { r: 0.9, g: 0.95, b: 1 }
    }];
    column.strokes = [{
      type: 'SOLID',
      color: { r: 0.7, g: 0.85, b: 1 }
    }];
    column.strokeWeight = 1;
    column.cornerRadius = 4;
    gridFrame.appendChild(column);
  }

  gridContainer.appendChild(gridFrame);
  return gridContainer;
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