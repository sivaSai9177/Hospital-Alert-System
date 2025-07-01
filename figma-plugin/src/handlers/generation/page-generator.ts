// Page generator for creating Design System and Universal Components pages in Figma

export interface PageGeneratorResult {
  success: boolean;
  pages: {
    designSystem?: PageNode;
    components?: PageNode;
  };
  errors: string[];
}

// Create Design System page with organized token displays
export async function createDesignSystemPage(): Promise<PageNode> {
  console.log('📄 Creating/Updating Design System page...');
  
  let designSystemPage: PageNode | null = null;
  
  // First, try to find the existing page using the current page approach
  try {
    // Get all pages after loading
    const allPages = figma.root.children;
    
    // Find existing Design System page
    for (const page of allPages) {
      if (page.type === 'PAGE' && page.name === '🎨 Design System') {
        designSystemPage = page as PageNode;
        console.log('Found existing Design System page');
        break;
      }
    }
  } catch (error) {
    console.log('Could not search for existing pages:', error);
  }
  
  // If not found, create a new one
  if (!designSystemPage) {
    console.log('Creating new Design System page...');
    designSystemPage = figma.createPage();
    designSystemPage.name = '🎨 Design System';
  }
  
  // Load the page to ensure we can access its children
  await designSystemPage.loadAsync();
  
  // Clear existing content if updating
  try {
    const children = [...designSystemPage.children];
    for (const child of children) {
      child.remove();
    }
    console.log('Cleared existing content');
  } catch (error) {
    console.log('No existing content to clear');
  }
  
  // Create main container following Untitled UI pattern with responsive layout
  const pageContainer = figma.createFrame();
  pageContainer.name = 'Page Container';
  pageContainer.x = 0;
  pageContainer.y = 0;
  pageContainer.layoutMode = 'HORIZONTAL';
  pageContainer.primaryAxisSizingMode = 'AUTO';
  pageContainer.counterAxisSizingMode = 'AUTO';
  pageContainer.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
  pageContainer.minWidth = 1280;
  pageContainer.minHeight = 720;
  
  // Create sidebar navigation
  const sidebar = await createSidebar();
  pageContainer.appendChild(sidebar);
  
  // Create main content area
  const mainArea = figma.createFrame();
  mainArea.name = 'Main Content Area';
  mainArea.layoutMode = 'VERTICAL';
  mainArea.primaryAxisSizingMode = 'AUTO';
  mainArea.counterAxisSizingMode = 'AUTO';
  mainArea.layoutGrow = 1;
  mainArea.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.98 } }];
  mainArea.clipsContent = true;
  
  // Add header to main area
  await addUntitledHeader(mainArea, 'Design System', 'Production-ready components and design tokens');
  
  // Create content wrapper with 8px grid system
  const contentWrapper = figma.createFrame();
  contentWrapper.name = 'Content Wrapper';
  contentWrapper.layoutMode = 'VERTICAL';
  contentWrapper.primaryAxisSizingMode = 'AUTO';
  contentWrapper.counterAxisSizingMode = 'AUTO';
  contentWrapper.paddingTop = 48; // 6 * 8px
  contentWrapper.paddingBottom = 96; // 12 * 8px
  contentWrapper.paddingLeft = 64; // 8 * 8px
  contentWrapper.paddingRight = 64; // 8 * 8px
  contentWrapper.itemSpacing = 64; // 8 * 8px
  contentWrapper.layoutGrow = 1;
  contentWrapper.maxWidth = 1440; // Max content width for readability
  
  mainArea.appendChild(contentWrapper);
  pageContainer.appendChild(mainArea);
  designSystemPage.appendChild(pageContainer);
  
  // Add content sections in Untitled UI style
  await addUntitledFoundation(contentWrapper);
  await addUntitledComponents(contentWrapper);
  await addUntitledPatterns(contentWrapper);
  
  return designSystemPage;
}

// Create Universal Components page
export async function createUniversalComponentsPage(): Promise<PageNode> {
  console.log('🧩 Creating/Updating Universal Components page...');
  
  let componentsPage: PageNode | null = null;
  
  // First, try to find the existing page
  try {
    // Get all pages after loading
    const allPages = figma.root.children;
    
    // Find existing Universal Components page
    for (const page of allPages) {
      if (page.type === 'PAGE' && page.name === '🧩 Universal Components') {
        componentsPage = page as PageNode;
        console.log('Found existing Universal Components page');
        break;
      }
    }
  } catch (error) {
    console.log('Could not search for existing pages:', error);
  }
  
  // If not found, create a new one
  if (!componentsPage) {
    console.log('Creating new Universal Components page...');
    componentsPage = figma.createPage();
    componentsPage.name = '🧩 Universal Components';
  }
  
  // Load the page to ensure we can access its children
  await componentsPage.loadAsync();
  
  // Clear existing content if updating
  try {
    const children = [...componentsPage.children];
    for (const child of children) {
      child.remove();
    }
    console.log('Cleared existing content');
  } catch (error) {
    console.log('No existing content to clear');
  }
  
  // Create main container with auto-layout
  const mainContainer = figma.createFrame();
  mainContainer.name = 'Components Container';
  mainContainer.x = 0;
  mainContainer.y = 0;
  mainContainer.layoutMode = 'VERTICAL';
  mainContainer.primaryAxisSizingMode = 'AUTO';
  mainContainer.counterAxisSizingMode = 'AUTO';
  mainContainer.paddingTop = 80;
  mainContainer.paddingBottom = 80;
  mainContainer.paddingLeft = 80;
  mainContainer.paddingRight = 80;
  mainContainer.itemSpacing = 80;
  mainContainer.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
  
  componentsPage.appendChild(mainContainer);
  
  // Add component sections
  await addTitleSection(mainContainer, 'Universal Components', 'Reusable components for all platforms');
  await addButtonComponents(mainContainer);
  await addInputComponents(mainContainer);
  await addCardComponents(mainContainer);
  await addNavigationComponents(mainContainer);
  await addFeedbackComponents(mainContainer);
  await addLayoutComponents(mainContainer);
  
  return componentsPage;
}

// Elevation system following Untitled UI standards
function getElevation(level: 0 | 1 | 2 | 3 | 4): Effect[] {
  const elevations = {
    0: [], // No elevation
    1: [ // Subtle elevation
      {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.04 },
        offset: { x: 0, y: 1 },
        radius: 2,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL' as const
      }
    ],
    2: [ // Medium elevation (cards)
      {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.05 },
        offset: { x: 0, y: 4 },
        radius: 16,
        spread: -4,
        visible: true,
        blendMode: 'NORMAL' as const
      },
      {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.08 },
        offset: { x: 0, y: 2 },
        radius: 8,
        spread: -2,
        visible: true,
        blendMode: 'NORMAL' as const
      }
    ],
    3: [ // High elevation (modals)
      {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.08 },
        offset: { x: 0, y: 8 },
        radius: 24,
        spread: -4,
        visible: true,
        blendMode: 'NORMAL' as const
      },
      {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.12 },
        offset: { x: 0, y: 16 },
        radius: 48,
        spread: -8,
        visible: true,
        blendMode: 'NORMAL' as const
      }
    ],
    4: [ // Maximum elevation
      {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.12 },
        offset: { x: 0, y: 24 },
        radius: 48,
        spread: -12,
        visible: true,
        blendMode: 'NORMAL' as const
      }
    ]
  };
  return elevations[level];
}

// Spacing system based on 8px grid
const SPACING = {
  xs: 4,   // 0.5 * 8
  sm: 8,   // 1 * 8
  md: 16,  // 2 * 8
  lg: 24,  // 3 * 8
  xl: 32,  // 4 * 8
  xxl: 48, // 6 * 8
  xxxl: 64 // 8 * 8
};

// Helper function to safely load fonts
async function loadFontSafe(fontName: { family: string; style: string }): Promise<{ family: string; style: string }> {
  try {
    await figma.loadFontAsync(fontName);
    return fontName;
  } catch (error) {
    console.warn(`Failed to load font ${fontName.family} ${fontName.style}, trying fallbacks...`);
    
    // Try common fallbacks based on the requested style
    const fallbacks = [
      // If Semi Bold was requested, try similar weights first
      ...(fontName.style === 'Semi Bold' ? [
        { family: fontName.family, style: 'SemiBold' }, // Alternative spelling
        { family: fontName.family, style: 'DemiBold' }, // Another alternative
        { family: fontName.family, style: 'Medium' },
        { family: fontName.family, style: 'Bold' }
      ] : []),
      // Standard fallbacks
      { family: fontName.family, style: 'Regular' },
      { family: 'Inter', style: 'Medium' },
      { family: 'Inter', style: 'Regular' },
      { family: 'Roboto', style: 'Regular' }
    ];
    
    for (const fallback of fallbacks) {
      try {
        await figma.loadFontAsync(fallback);
        console.log(`Using fallback font: ${fallback.family} ${fallback.style}`);
        return fallback;
      } catch (fallbackError) {
        continue;
      }
    }
    
    // If all fails, return a default font that should always be available
    console.error('All font fallbacks failed, using system default');
    // Return Inter Regular as the absolute fallback - this should always exist in Figma
    return { family: 'Inter', style: 'Regular' };
  }
}

// Create sidebar navigation (Untitled UI style)
async function createSidebar(): Promise<FrameNode> {
  const sidebar = figma.createFrame();
  sidebar.name = 'Sidebar';
  sidebar.layoutMode = 'VERTICAL';
  sidebar.primaryAxisSizingMode = 'FIXED';
  sidebar.counterAxisSizingMode = 'FIXED';
  sidebar.resize(280, 100); // Initial height, will stretch with layoutAlign
  sidebar.layoutAlign = 'STRETCH';
  sidebar.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  sidebar.paddingTop = 32;
  sidebar.paddingBottom = 32;
  sidebar.paddingLeft = 24;
  sidebar.paddingRight = 24;
  sidebar.itemSpacing = 8;
  
  // Add border
  sidebar.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }];
  sidebar.strokeWeight = 1;
  sidebar.strokeAlign = 'INSIDE';
  
  // Logo/Title
  const logoFrame = figma.createFrame();
  logoFrame.name = 'Logo';
  logoFrame.layoutMode = 'HORIZONTAL';
  logoFrame.primaryAxisSizingMode = 'AUTO';
  logoFrame.counterAxisSizingMode = 'AUTO';
  logoFrame.paddingBottom = 24;
  
  const logoText = figma.createText();
  const logoFont = await loadFontSafe({ family: 'Inter', style: 'Bold' });
  logoText.fontName = logoFont;
  logoText.fontSize = 20;
  logoText.characters = 'Design System';
  logoText.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  
  logoFrame.appendChild(logoText);
  sidebar.appendChild(logoFrame);
  
  // Navigation sections
  const navSections = [
    {
      title: 'Foundation',
      items: ['Colors', 'Typography', 'Spacing', 'Grid', 'Icons']
    },
    {
      title: 'Components',
      items: ['Buttons', 'Inputs', 'Cards', 'Navigation', 'Feedback']
    },
    {
      title: 'Patterns',
      items: ['Forms', 'Tables', 'Empty States', 'Error Pages']
    }
  ];
  
  for (const section of navSections) {
    const sectionFrame = figma.createFrame();
    sectionFrame.name = section.title;
    sectionFrame.layoutMode = 'VERTICAL';
    sectionFrame.primaryAxisSizingMode = 'AUTO';
    sectionFrame.counterAxisSizingMode = 'AUTO';
    sectionFrame.itemSpacing = 4;
    sectionFrame.paddingTop = 16;
    sectionFrame.paddingBottom = 16;
    
    // Section title
    const sectionTitle = figma.createText();
    const sectionFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
    sectionTitle.fontName = sectionFont;
    sectionTitle.fontSize = 12;
    sectionTitle.characters = section.title.toUpperCase();
    sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
    sectionTitle.letterSpacing = { value: 5, unit: 'PERCENT' };
    sectionFrame.appendChild(sectionTitle);
    
    // Nav items
    for (const item of section.items) {
      const navItem = figma.createFrame();
      navItem.name = item;
      navItem.layoutMode = 'HORIZONTAL';
      navItem.primaryAxisSizingMode = 'AUTO';
      navItem.counterAxisSizingMode = 'AUTO';
      navItem.paddingTop = 8;
      navItem.paddingBottom = 8;
      navItem.paddingLeft = 12;
      navItem.paddingRight = 12;
      navItem.cornerRadius = 6;
      
      const itemText = figma.createText();
      const itemFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
      itemText.fontName = itemFont;
      itemText.fontSize = 14;
      itemText.characters = item;
      itemText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.22 } }];
      
      navItem.appendChild(itemText);
      sectionFrame.appendChild(navItem);
    }
    
    sidebar.appendChild(sectionFrame);
  }
  
  return sidebar;
}

// Add Untitled UI style header
async function addUntitledHeader(parent: FrameNode, title: string, subtitle: string) {
  // Create a wrapper for header with border
  const headerWrapper = figma.createFrame();
  headerWrapper.name = 'Header Wrapper';
  headerWrapper.layoutMode = 'VERTICAL';
  headerWrapper.primaryAxisSizingMode = 'FIXED';
  headerWrapper.counterAxisSizingMode = 'FIXED';
  headerWrapper.layoutAlign = 'STRETCH';
  headerWrapper.fills = [];
  
  const header = figma.createFrame();
  header.name = 'Header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'FIXED';
  header.layoutAlign = 'STRETCH';
  header.paddingTop = SPACING.xxl;
  header.paddingBottom = SPACING.xl;
  header.paddingLeft = SPACING.xxl;
  header.paddingRight = SPACING.xxl;
  header.itemSpacing = SPACING.sm;
  header.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  
  const titleText = figma.createText();
  const titleFont = await loadFontSafe({ family: 'Inter', style: 'Bold' });
  titleText.fontName = titleFont;
  titleText.fontSize = 36;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  
  const subtitleText = figma.createText();
  const subtitleFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  subtitleText.fontName = subtitleFont;
  subtitleText.fontSize = 16;
  subtitleText.characters = subtitle;
  subtitleText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
  
  header.appendChild(titleText);
  header.appendChild(subtitleText);
  
  // Add bottom border as a separate element
  const borderFrame = figma.createFrame();
  borderFrame.name = 'Border';
  borderFrame.resize(1920, 1); // Full width, 1px height
  borderFrame.primaryAxisSizingMode = 'FIXED';
  borderFrame.counterAxisSizingMode = 'FIXED';
  borderFrame.layoutAlign = 'STRETCH';
  borderFrame.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }];
  
  headerWrapper.appendChild(header);
  headerWrapper.appendChild(borderFrame);
  parent.appendChild(headerWrapper);
}

// Helper function to add header section (deprecated)
async function addHeaderSection(parent: FrameNode, title: string, subtitle: string) {
  const headerFrame = figma.createFrame();
  headerFrame.name = 'Header';
  headerFrame.layoutMode = 'VERTICAL';
  headerFrame.primaryAxisSizingMode = 'FIXED';
  headerFrame.counterAxisSizingMode = 'FIXED';
  headerFrame.resize(1440, 200);
  headerFrame.paddingTop = 60;
  headerFrame.paddingBottom = 40;
  headerFrame.paddingLeft = 80;
  headerFrame.paddingRight = 80;
  headerFrame.itemSpacing = 20;
  headerFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  
  // Add shadow to header
  headerFrame.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.05 },
    offset: { x: 0, y: 2 },
    radius: 8,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL'
  }];
  
  // Title
  const titleText = figma.createText();
  const headerTitleFont = await loadFontSafe({ family: 'Inter', style: 'Bold' });
  titleText.fontName = headerTitleFont;
  titleText.fontSize = 48;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  
  // Subtitle
  const subtitleText = figma.createText();
  const headerSubtitleFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  subtitleText.fontName = headerSubtitleFont;
  subtitleText.fontSize = 20;
  subtitleText.characters = subtitle;
  subtitleText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
  
  headerFrame.appendChild(titleText);
  headerFrame.appendChild(subtitleText);
  parent.appendChild(headerFrame);
}

// Helper function to add title section (deprecated)
async function addTitleSection(parent: FrameNode, title: string, subtitle: string) {
  const titleFrame = figma.createFrame();
  titleFrame.name = 'Title Section';
  titleFrame.layoutMode = 'VERTICAL';
  titleFrame.primaryAxisSizingMode = 'AUTO';
  titleFrame.counterAxisSizingMode = 'FIXED';
  // Let auto-layout determine the height
  titleFrame.resize(1200, 120); // Initial height, will auto-adjust
  titleFrame.itemSpacing = 16;
  
  // Title
  const titleText = figma.createText();
  const titleFont = await loadFontSafe({ family: 'Inter', style: 'Bold' });
  titleText.fontName = titleFont;
  titleText.fontSize = 48;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  
  // Subtitle
  const subtitleText = figma.createText();
  const subtitleFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  subtitleText.fontName = subtitleFont;
  subtitleText.fontSize = 20;
  subtitleText.characters = subtitle;
  subtitleText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  
  titleFrame.appendChild(titleText);
  titleFrame.appendChild(subtitleText);
  parent.appendChild(titleFrame);
}

// Helper to create a section with consistent styling
async function createSectionFrame(name: string, title: string): Promise<FrameNode> {
  const section = figma.createFrame();
  section.name = name;
  section.layoutMode = 'VERTICAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'AUTO';
  section.layoutAlign = 'STRETCH';
  section.itemSpacing = SPACING.xl;
  
  // Add top padding for visual separation
  section.paddingTop = SPACING.xxxl;
  
  // Section title with proper hierarchy
  const titleContainer = figma.createFrame();
  titleContainer.name = 'Section Title';
  titleContainer.layoutMode = 'VERTICAL';
  titleContainer.primaryAxisSizingMode = 'AUTO';
  titleContainer.counterAxisSizingMode = 'AUTO';
  titleContainer.itemSpacing = SPACING.sm;
  titleContainer.paddingBottom = SPACING.xl;
  
  const sectionTitle = figma.createText();
  const titleFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
  sectionTitle.fontName = titleFont;
  sectionTitle.fontSize = 32;
  sectionTitle.characters = title;
  sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  
  titleContainer.appendChild(sectionTitle);
  section.appendChild(titleContainer);
  
  return section;
}

// Add Untitled UI style foundation section
async function addUntitledFoundation(parent: FrameNode) {
  const section = await createSectionFrame('Foundation Section', 'Foundation');
  
  // Section title
  const sectionTitle = figma.createText();
  const titleFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
  sectionTitle.fontName = titleFont;
  sectionTitle.fontSize = 24;
  sectionTitle.characters = 'Foundation';
  sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  section.appendChild(sectionTitle);
  
  // Cards grid with responsive layout
  const cardsGrid = figma.createFrame();
  cardsGrid.name = 'Foundation Grid';
  cardsGrid.layoutMode = 'HORIZONTAL';
  cardsGrid.layoutWrap = 'WRAP';
  cardsGrid.primaryAxisSizingMode = 'AUTO';
  cardsGrid.counterAxisSizingMode = 'AUTO';
  cardsGrid.itemSpacing = 32; // 4 * 8px
  cardsGrid.counterAxisSpacing = 32; // 4 * 8px
  cardsGrid.primaryAxisAlignItems = 'MIN';
  cardsGrid.counterAxisAlignItems = 'MIN';
  
  // Add foundation cards
  await addColorCard(cardsGrid);
  await addTypographyCard(cardsGrid);
  await addSpacingCard(cardsGrid);
  await addGridCard(cardsGrid);
  
  section.appendChild(cardsGrid);
  parent.appendChild(section);
}

// Add Untitled UI style components section
async function addUntitledComponents(parent: FrameNode) {
  const section = await createSectionFrame('Components Section', 'Components');
  
  // Components grid
  const componentsGrid = figma.createFrame();
  componentsGrid.name = 'Components Grid';
  componentsGrid.layoutMode = 'HORIZONTAL';
  componentsGrid.layoutWrap = 'WRAP';
  componentsGrid.primaryAxisSizingMode = 'AUTO';
  componentsGrid.counterAxisSizingMode = 'AUTO';
  componentsGrid.itemSpacing = SPACING.xl;
  componentsGrid.counterAxisSpacing = SPACING.xl;
  componentsGrid.primaryAxisAlignItems = 'MIN';
  componentsGrid.counterAxisAlignItems = 'MIN';
  
  // Add component showcase cards
  await addButtonShowcase(componentsGrid);
  await addInputShowcase(componentsGrid);
  await addToggleShowcase(componentsGrid);
  await addBadgeShowcase(componentsGrid);
  
  section.appendChild(componentsGrid);
  parent.appendChild(section);
}

// Add Untitled UI style patterns section
async function addUntitledPatterns(parent: FrameNode) {
  const section = await createSectionFrame('Patterns Section', 'Patterns');
  
  // Patterns grid
  const patternsGrid = figma.createFrame();
  patternsGrid.name = 'Patterns Grid';
  patternsGrid.layoutMode = 'HORIZONTAL';
  patternsGrid.layoutWrap = 'WRAP';
  patternsGrid.primaryAxisSizingMode = 'AUTO';
  patternsGrid.counterAxisSizingMode = 'AUTO';
  patternsGrid.itemSpacing = SPACING.xl;
  patternsGrid.counterAxisSpacing = SPACING.xl;
  patternsGrid.primaryAxisAlignItems = 'MIN';
  patternsGrid.counterAxisAlignItems = 'MIN';
  
  // Add pattern cards
  await addFormPatternCard(patternsGrid);
  await addTablePatternCard(patternsGrid);
  await addEmptyStateCard(patternsGrid);
  await addErrorPageCard(patternsGrid);
  
  section.appendChild(patternsGrid);
  parent.appendChild(section);
}

// Create color card (Untitled UI style)
async function addColorCard(parent: FrameNode) {
  const card = await createUntitledCard('Colors', 'Brand and semantic color palette');
  
  // Color grid
  const colorGrid = figma.createFrame();
  colorGrid.name = 'Color Grid';
  colorGrid.layoutMode = 'VERTICAL';
  colorGrid.primaryAxisSizingMode = 'AUTO';
  colorGrid.counterAxisSizingMode = 'AUTO';
  colorGrid.itemSpacing = 16;
  
  // Color groups
  const colorGroups = [
    {
      name: 'Brand',
      colors: [
        { name: 'Primary', light: { r: 0.33, g: 0.56, b: 0.96 }, dark: { r: 0.4, g: 0.65, b: 1 } },
        { name: 'Secondary', light: { r: 0.4, g: 0.8, b: 0.6 }, dark: { r: 0.45, g: 0.85, b: 0.65 } }
      ]
    },
    {
      name: 'Neutral',
      colors: [
        { name: 'Gray 900', light: { r: 0.067, g: 0.067, b: 0.067 }, dark: { r: 0.95, g: 0.95, b: 0.96 } },
        { name: 'Gray 700', light: { r: 0.2, g: 0.2, b: 0.22 }, dark: { r: 0.8, g: 0.8, b: 0.82 } },
        { name: 'Gray 500', light: { r: 0.4, g: 0.4, b: 0.45 }, dark: { r: 0.6, g: 0.6, b: 0.65 } },
        { name: 'Gray 300', light: { r: 0.6, g: 0.6, b: 0.65 }, dark: { r: 0.4, g: 0.4, b: 0.45 } },
        { name: 'Gray 100', light: { r: 0.9, g: 0.9, b: 0.91 }, dark: { r: 0.15, g: 0.15, b: 0.17 } }
      ]
    }
  ];
  
  for (const group of colorGroups) {
    const groupFrame = figma.createFrame();
    groupFrame.name = group.name;
    groupFrame.layoutMode = 'VERTICAL';
    groupFrame.primaryAxisSizingMode = 'AUTO';
    groupFrame.counterAxisSizingMode = 'AUTO';
    groupFrame.itemSpacing = SPACING.md;
    
    // Group title
    const groupTitle = figma.createText();
    const groupFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
    groupTitle.fontName = groupFont;
    groupTitle.fontSize = 14;
    groupTitle.characters = group.name;
    groupTitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
    groupFrame.appendChild(groupTitle);
    
    // Color rows
    for (const color of group.colors) {
      const colorRow = figma.createFrame();
      colorRow.name = color.name;
      colorRow.layoutMode = 'HORIZONTAL';
      colorRow.primaryAxisSizingMode = 'AUTO';
      colorRow.counterAxisSizingMode = 'AUTO';
      colorRow.itemSpacing = SPACING.md;
      colorRow.paddingTop = SPACING.xs;
      colorRow.paddingBottom = SPACING.xs;
      colorRow.primaryAxisAlignItems = 'CENTER';
      
      // Color swatches with better presentation
      const swatchContainer = figma.createFrame();
      swatchContainer.name = 'Swatches';
      swatchContainer.layoutMode = 'HORIZONTAL';
      swatchContainer.primaryAxisSizingMode = 'AUTO';
      swatchContainer.counterAxisSizingMode = 'AUTO';
      swatchContainer.itemSpacing = SPACING.xs;
      
      const lightSwatch = figma.createRectangle();
      lightSwatch.resize(48, 48); // Larger for better visibility
      lightSwatch.cornerRadius = SPACING.sm;
      lightSwatch.fills = [{ type: 'SOLID', color: color.light }];
      lightSwatch.effects = getElevation(1); // Subtle elevation
      
      const darkSwatch = figma.createRectangle();
      darkSwatch.resize(48, 48);
      darkSwatch.cornerRadius = SPACING.sm;
      darkSwatch.fills = [{ type: 'SOLID', color: color.dark }];
      darkSwatch.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }];
      darkSwatch.strokeWeight = 1;
      darkSwatch.effects = getElevation(1);
      
      swatchContainer.appendChild(lightSwatch);
      swatchContainer.appendChild(darkSwatch);
      
      // Color name
      const colorName = figma.createText();
      const nameFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
      colorName.fontName = nameFont;
      colorName.fontSize = 14;
      colorName.characters = color.name;
      colorName.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.22 } }];
      colorName.layoutGrow = 1;
      
      colorRow.appendChild(swatchContainer);
      colorRow.appendChild(colorName);
      groupFrame.appendChild(colorRow);
    }
    
    colorGrid.appendChild(groupFrame);
  }
  
  card.appendChild(colorGrid);
  parent.appendChild(card);
}

// Helper to create Untitled UI style card with responsive layout
async function createUntitledCard(title: string, description: string): Promise<FrameNode> {
  const card = figma.createFrame();
  card.name = `${title} Card`;
  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'AUTO';
  card.minWidth = 320; // Minimum card width
  card.maxWidth = 480; // Maximum card width
  card.layoutGrow = 1; // Allow cards to grow in grid
  card.paddingTop = 32; // 4 * 8px
  card.paddingBottom = 32; // 4 * 8px
  card.paddingLeft = 32; // 4 * 8px
  card.paddingRight = 32; // 4 * 8px
  card.itemSpacing = 24; // 3 * 8px
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.cornerRadius = 16; // 2 * 8px
  card.effects = getElevation(2); // Medium elevation for cards
  
  // Card header
  const header = figma.createFrame();
  header.name = 'Card Header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'AUTO';
  header.itemSpacing = 4;
  
  const titleText = figma.createText();
  const titleFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
  titleText.fontName = titleFont;
  titleText.layoutAlign = 'STRETCH';
  titleText.fontSize = 18;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  
  const descText = figma.createText();
  const descFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  descText.fontName = descFont;
  descText.fontSize = 14;
  descText.characters = description;
  descText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
  
  header.appendChild(titleText);
  header.appendChild(descText);
  card.appendChild(header);
  
  return card;
}

// Create typography card (Untitled UI style)
async function addTypographyCard(parent: FrameNode) {
  const card = await createUntitledCard('Typography', 'Text styles and type scale');
  
  // Type specimens
  const typeContainer = figma.createFrame();
  typeContainer.name = 'Type Specimens';
  typeContainer.layoutMode = 'VERTICAL';
  typeContainer.primaryAxisSizingMode = 'AUTO';
  typeContainer.counterAxisSizingMode = 'AUTO';
  typeContainer.itemSpacing = 16;
  
  const typeScales = [
    { name: 'Display', size: 36, weight: 'Bold', lineHeight: 44 },
    { name: 'Heading 1', size: 30, weight: 'Semi Bold', lineHeight: 38 },
    { name: 'Heading 2', size: 24, weight: 'Semi Bold', lineHeight: 32 },
    { name: 'Body Large', size: 18, weight: 'Regular', lineHeight: 28 },
    { name: 'Body', size: 16, weight: 'Regular', lineHeight: 24 },
    { name: 'Caption', size: 14, weight: 'Regular', lineHeight: 20 }
  ];
  
  for (const scale of typeScales) {
    const specimen = figma.createFrame();
    specimen.name = scale.name;
    specimen.layoutMode = 'HORIZONTAL';
    specimen.primaryAxisSizingMode = 'AUTO';
    specimen.counterAxisSizingMode = 'AUTO';
    specimen.primaryAxisAlignItems = 'CENTER';
    specimen.itemSpacing = 12;
    specimen.paddingTop = 8;
    specimen.paddingBottom = 8;
    
    // Sample text
    const sampleText = figma.createText();
    const sampleFont = await loadFontSafe({ family: 'Inter', style: scale.weight });
    sampleText.fontName = sampleFont;
    sampleText.fontSize = scale.size;
    sampleText.lineHeight = { value: scale.lineHeight, unit: 'PIXELS' };
    sampleText.characters = 'Aa';
    sampleText.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    // Let text determine its own height
    
    // Type info
    const infoFrame = figma.createFrame();
    infoFrame.layoutMode = 'VERTICAL';
    infoFrame.primaryAxisSizingMode = 'AUTO';
    infoFrame.counterAxisSizingMode = 'AUTO';
    infoFrame.layoutGrow = 1;
    
    const nameText = figma.createText();
    const nameFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
    nameText.fontName = nameFont;
    nameText.fontSize = 14;
    nameText.characters = scale.name;
    nameText.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    const specText = figma.createText();
    const specFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
    specText.fontName = specFont;
    specText.fontSize = 12;
    specText.characters = `${scale.size}/${scale.lineHeight} • ${scale.weight}`;
    specText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
    
    infoFrame.appendChild(nameText);
    infoFrame.appendChild(specText);
    
    specimen.appendChild(sampleText);
    specimen.appendChild(infoFrame);
    typeContainer.appendChild(specimen);
  }
  
  card.appendChild(typeContainer);
  parent.appendChild(card);
}

// Create spacing card (Untitled UI style)
async function addSpacingCard(parent: FrameNode) {
  const card = await createUntitledCard('Spacing', '4px base unit spacing system');
  
  // Spacing grid
  const spacingContainer = figma.createFrame();
  spacingContainer.name = 'Spacing Values';
  spacingContainer.layoutMode = 'VERTICAL';
  spacingContainer.primaryAxisSizingMode = 'AUTO';
  spacingContainer.counterAxisSizingMode = 'AUTO';
  spacingContainer.itemSpacing = 12;
  
  const spacingValues = [
    { name: 'xs', value: 4, usage: 'Tight spacing' },
    { name: 'sm', value: 8, usage: 'Compact elements' },
    { name: 'md', value: 16, usage: 'Default spacing' },
    { name: 'lg', value: 24, usage: 'Section spacing' },
    { name: 'xl', value: 32, usage: 'Large gaps' },
    { name: '2xl', value: 48, usage: 'Page sections' }
  ];
  
  for (const spacing of spacingValues) {
    const spacingRow = figma.createFrame();
    spacingRow.name = spacing.name;
    spacingRow.layoutMode = 'HORIZONTAL';
    spacingRow.primaryAxisSizingMode = 'AUTO';
    spacingRow.counterAxisSizingMode = 'AUTO';
    spacingRow.primaryAxisAlignItems = 'CENTER';
    spacingRow.itemSpacing = 12;
    
    // Visual block
    const block = figma.createRectangle();
    block.resize(spacing.value, spacing.value);
    block.fills = [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 }, opacity: 0.15 }];
    block.cornerRadius = 4;
    
    // Spacing info
    const infoFrame = figma.createFrame();
    infoFrame.layoutMode = 'VERTICAL';
    infoFrame.primaryAxisSizingMode = 'AUTO';
    infoFrame.counterAxisSizingMode = 'AUTO';
    infoFrame.layoutGrow = 1;
    
    const nameText = figma.createText();
    const nameFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
    nameText.fontName = nameFont;
    nameText.fontSize = 14;
    nameText.characters = `${spacing.name} • ${spacing.value}px`;
    nameText.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    const usageText = figma.createText();
    const usageFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
    usageText.fontName = usageFont;
    usageText.fontSize = 12;
    usageText.characters = spacing.usage;
    usageText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
    
    infoFrame.appendChild(nameText);
    infoFrame.appendChild(usageText);
    
    spacingRow.appendChild(block);
    spacingRow.appendChild(infoFrame);
    spacingContainer.appendChild(spacingRow);
  }
  
  card.appendChild(spacingContainer);
  parent.appendChild(card);
}

// Create button showcase card
async function addButtonShowcase(parent: FrameNode) {
  const card = await createUntitledCard('Buttons', 'Interactive button components');
  
  // Button states container
  const buttonContainer = figma.createFrame();
  buttonContainer.name = 'Button States';
  buttonContainer.layoutMode = 'VERTICAL';
  buttonContainer.primaryAxisSizingMode = 'AUTO';
  buttonContainer.counterAxisSizingMode = 'AUTO';
  buttonContainer.itemSpacing = SPACING.lg;
  
  // Button variants
  const variants = [
    { name: 'Primary', bg: { r: 0.33, g: 0.56, b: 0.96 }, fg: { r: 1, g: 1, b: 1 } },
    { name: 'Secondary', bg: { r: 0.95, g: 0.95, b: 0.96 }, fg: { r: 0.067, g: 0.067, b: 0.067 } },
    { name: 'Destructive', bg: { r: 0.91, g: 0.24, b: 0.21 }, fg: { r: 1, g: 1, b: 1 } }
  ];
  
  for (const variant of variants) {
    const variantRow = figma.createFrame();
    variantRow.name = `${variant.name} Buttons`;
    variantRow.layoutMode = 'HORIZONTAL';
    variantRow.primaryAxisSizingMode = 'AUTO';
    variantRow.counterAxisSizingMode = 'AUTO';
    variantRow.itemSpacing = SPACING.md;
    
    // Create button states
    const states = ['Default', 'Hover', 'Active', 'Disabled'];
    
    for (const state of states) {
      const button = figma.createFrame();
      button.name = `${variant.name} ${state}`;
      button.layoutMode = 'HORIZONTAL';
      button.primaryAxisSizingMode = 'AUTO';
      button.counterAxisSizingMode = 'AUTO';
      button.paddingTop = SPACING.sm;
      button.paddingBottom = SPACING.sm;
      button.paddingLeft = SPACING.md;
      button.paddingRight = SPACING.md;
      button.cornerRadius = SPACING.sm;
      button.primaryAxisAlignItems = 'CENTER';
      
      // Apply state-specific styling
      let bgColor = variant.bg;
      let opacity = 1;
      
      if (state === 'Hover') {
        bgColor = { r: bgColor.r * 0.9, g: bgColor.g * 0.9, b: bgColor.b * 0.9 };
      } else if (state === 'Active') {
        bgColor = { r: bgColor.r * 0.8, g: bgColor.g * 0.8, b: bgColor.b * 0.8 };
      } else if (state === 'Disabled') {
        opacity = 0.5;
      }
      
      button.fills = [{ type: 'SOLID', color: bgColor, opacity }];
      
      // Button text
      const buttonText = figma.createText();
      const font = await loadFontSafe({ family: 'Inter', style: 'Medium' });
      buttonText.fontName = font;
      buttonText.fontSize = 14;
      buttonText.characters = state;
      buttonText.fills = [{ type: 'SOLID', color: variant.fg, opacity }];
      
      button.appendChild(buttonText);
      variantRow.appendChild(button);
    }
    
    buttonContainer.appendChild(variantRow);
  }
  
  card.appendChild(buttonContainer);
  parent.appendChild(card);
}

// Create grid card (Untitled UI style)
async function addGridCard(parent: FrameNode) {
  const card = await createUntitledCard('Grid System', '12-column responsive grid');
  
  // Grid preview
  const gridPreview = figma.createFrame();
  gridPreview.name = 'Grid Preview';
  gridPreview.layoutMode = 'HORIZONTAL';
  gridPreview.primaryAxisSizingMode = 'AUTO';
  gridPreview.counterAxisSizingMode = 'FIXED';
  gridPreview.resize(800, 120);
  gridPreview.itemSpacing = 16;
  gridPreview.paddingLeft = 16;
  gridPreview.paddingRight = 16;
  gridPreview.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.98 } }];
  gridPreview.cornerRadius = 8;
  
  // Grid columns
  for (let i = 0; i < 12; i++) {
    const column = figma.createRectangle();
    column.layoutGrow = 1;
    column.resize(80, 120);
    column.fills = [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 }, opacity: 0.1 }];
    gridPreview.appendChild(column);
  }
  
  card.appendChild(gridPreview);
  parent.appendChild(card);
}

// Add Untitled UI style component previews section
async function addUntitledComponentPreviews(parent: FrameNode) {
  const section = figma.createFrame();
  section.name = 'Component Previews Section';
  section.layoutMode = 'VERTICAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'AUTO';
  section.itemSpacing = 32;
  
  const sectionTitle = figma.createText();
  const titleFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
  sectionTitle.fontName = titleFont;
  sectionTitle.fontSize = 24;
  sectionTitle.characters = 'Component Previews';
  sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  section.appendChild(sectionTitle);
  
  const componentsGrid = figma.createFrame();
  componentsGrid.name = 'Component Previews Grid';
  componentsGrid.layoutMode = 'HORIZONTAL';
  componentsGrid.layoutWrap = 'WRAP';
  componentsGrid.primaryAxisSizingMode = 'AUTO';
  componentsGrid.counterAxisSizingMode = 'AUTO';
  componentsGrid.itemSpacing = 24;
  componentsGrid.counterAxisSpacing = 24;
  
  // Add component preview cards
  await addButtonPreview(componentsGrid);
  await addInputPreview(componentsGrid);
  await addCardPreview(componentsGrid);
  
  section.appendChild(componentsGrid);
  parent.appendChild(section);
}

// Add button preview card
async function addButtonPreview(parent: FrameNode) {
  const card = await createUntitledCard('Buttons', 'Primary, secondary, and ghost variants');
  
  const buttonContainer = figma.createFrame();
  buttonContainer.layoutMode = 'VERTICAL';
  buttonContainer.primaryAxisSizingMode = 'AUTO';
  buttonContainer.counterAxisSizingMode = 'AUTO';
  buttonContainer.itemSpacing = 16;
  
  const variants = ['Primary', 'Secondary', 'Ghost'];
  
  for (const variant of variants) {
    const button = figma.createFrame();
    button.name = `Button ${variant}`;
    button.layoutMode = 'HORIZONTAL';
    button.primaryAxisSizingMode = 'AUTO';
    button.counterAxisSizingMode = 'AUTO';
    button.paddingTop = 10;
    button.paddingBottom = 10;
    button.paddingLeft = 16;
    button.paddingRight = 16;
    button.cornerRadius = 8;
    button.primaryAxisAlignItems = 'CENTER';
    button.itemSpacing = 8;
    
    if (variant === 'Primary') {
      button.fills = [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }];
    } else if (variant === 'Secondary') {
      button.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.96 } }];
    } else {
      button.fills = [];
      button.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }];
      button.strokeWeight = 1;
    }
    
    const buttonText = figma.createText();
    const buttonFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
    buttonText.fontName = buttonFont;
    buttonText.fontSize = 14;
    buttonText.characters = `${variant} Button`;
    buttonText.fills = variant === 'Primary' 
      ? [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
      : [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
    
    button.appendChild(buttonText);
    buttonContainer.appendChild(button);
  }
  
  card.appendChild(buttonContainer);
  parent.appendChild(card);
}

// Add input preview card
async function addInputPreview(parent: FrameNode) {
  const card = await createUntitledCard('Form Inputs', 'Text fields and form controls');
  
  const inputContainer = figma.createFrame();
  inputContainer.layoutMode = 'VERTICAL';
  inputContainer.primaryAxisSizingMode = 'AUTO';
  inputContainer.counterAxisSizingMode = 'AUTO';
  inputContainer.itemSpacing = 16;
  
  // Text input
  const input = figma.createFrame();
  input.name = 'Text Input';
  input.layoutMode = 'HORIZONTAL';
  input.primaryAxisSizingMode = 'AUTO';
  input.counterAxisSizingMode = 'AUTO';
  input.paddingTop = 10;
  input.paddingBottom = 10;
  input.paddingLeft = 12;
  input.paddingRight = 12;
  input.cornerRadius = 8;
  input.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  input.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }];
  input.strokeWeight = 1;
  
  const placeholder = figma.createText();
  const placeholderFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  placeholder.fontName = placeholderFont;
  placeholder.fontSize = 14;
  placeholder.characters = 'Enter text...';
  placeholder.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
  
  input.appendChild(placeholder);
  inputContainer.appendChild(input);
  
  card.appendChild(inputContainer);
  parent.appendChild(card);
}

// Add card preview
async function addCardPreview(parent: FrameNode) {
  const card = await createUntitledCard('Cards', 'Content containers and panels');
  
  // Sample card
  const sampleCard = figma.createFrame();
  sampleCard.name = 'Sample Card';
  sampleCard.layoutMode = 'VERTICAL';
  sampleCard.primaryAxisSizingMode = 'AUTO';
  sampleCard.counterAxisSizingMode = 'AUTO';
  sampleCard.paddingTop = 20;
  sampleCard.paddingBottom = 20;
  sampleCard.paddingLeft = 20;
  sampleCard.paddingRight = 20;
  sampleCard.itemSpacing = 12;
  sampleCard.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
  sampleCard.cornerRadius = 8;
  
  const cardTitle = figma.createText();
  const cardTitleFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
  cardTitle.fontName = cardTitleFont;
  cardTitle.fontSize = 16;
  cardTitle.characters = 'Card Title';
  cardTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  
  const cardContent = figma.createText();
  const cardContentFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  cardContent.fontName = cardContentFont;
  cardContent.fontSize = 14;
  cardContent.characters = 'Card content goes here';
  cardContent.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
  
  sampleCard.appendChild(cardTitle);
  sampleCard.appendChild(cardContent);
  card.appendChild(sampleCard);
  parent.appendChild(card);
}

// Add pattern previews section
async function addUntitledPatternPreviews(parent: FrameNode) {
  const section = figma.createFrame();
  section.name = 'Pattern Previews Section';
  section.layoutMode = 'VERTICAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'AUTO';
  section.itemSpacing = 32;
  
  const sectionTitle = figma.createText();
  const titleFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
  sectionTitle.fontName = titleFont;
  sectionTitle.fontSize = 24;
  sectionTitle.characters = 'Patterns';
  sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  section.appendChild(sectionTitle);
  
  parent.appendChild(section);
}

// Add foundation section with colors, typography, spacing (deprecated)
async function addFoundationSection(parent: FrameNode) {
  const foundationFrame = figma.createFrame();
  foundationFrame.name = 'Foundation';
  foundationFrame.layoutMode = 'VERTICAL';
  foundationFrame.primaryAxisSizingMode = 'FIXED';
  foundationFrame.counterAxisSizingMode = 'AUTO';
  foundationFrame.resize(800, 600); // Initial height
  foundationFrame.itemSpacing = 48;
  foundationFrame.paddingTop = 40;
  foundationFrame.paddingBottom = 40;
  foundationFrame.paddingLeft = 40;
  foundationFrame.paddingRight = 40;
  foundationFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  foundationFrame.cornerRadius = 16;
  foundationFrame.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.08 },
    offset: { x: 0, y: 4 },
    radius: 16,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL'
  }];
  
  // Section title
  const sectionTitle = figma.createText();
  const sectionTitleFont = await loadFontSafe({ family: 'Inter', style: 'Bold' });
  sectionTitle.fontName = sectionTitleFont;
  sectionTitle.fontSize = 32;
  sectionTitle.characters = 'Foundation';
  sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  foundationFrame.appendChild(sectionTitle);
  
  // Add subsections
  await addColorSubsection(foundationFrame);
  await addTypographySubsection(foundationFrame);
  await addSpacingSubsection(foundationFrame);
  
  parent.appendChild(foundationFrame);
}

// Add color subsection
async function addColorSubsection(parent: FrameNode) {
  const colorContainer = figma.createFrame();
  colorContainer.name = 'Colors';
  colorContainer.layoutMode = 'VERTICAL';
  colorContainer.primaryAxisSizingMode = 'AUTO';
  colorContainer.counterAxisSizingMode = 'FIXED';
  colorContainer.resize(720, 400); // Initial height
  colorContainer.itemSpacing = 24;
  
  // Subsection title
  const title = figma.createText();
  const titleFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
  title.fontName = titleFont;
  title.fontSize = 24;
  title.characters = 'Colors';
  title.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  colorContainer.appendChild(title);
  
  // Color grid
  const colorGrid = figma.createFrame();
  colorGrid.name = 'Color Grid';
  colorGrid.layoutMode = 'HORIZONTAL';
  colorGrid.layoutWrap = 'WRAP';
  colorGrid.primaryAxisSizingMode = 'FIXED';
  colorGrid.counterAxisSizingMode = 'AUTO';
  colorGrid.resize(720, 300); // Initial height
  colorGrid.itemSpacing = 16;
  colorGrid.counterAxisSpacing = 16;
  
  // Add color swatches
  const colors = [
    { name: 'Primary', value: { r: 0.33, g: 0.56, b: 0.96 } },
    { name: 'Secondary', value: { r: 0.4, g: 0.8, b: 0.6 } },
    { name: 'Background', value: { r: 0.98, g: 0.98, b: 0.99 } },
    { name: 'Foreground', value: { r: 0.067, g: 0.067, b: 0.067 } },
    { name: 'Muted', value: { r: 0.6, g: 0.6, b: 0.65 } },
    { name: 'Destructive', value: { r: 0.9, g: 0.2, b: 0.2 } }
  ];
  
  for (const color of colors) {
    const swatch = await createColorSwatch(color.name, color.value);
    colorGrid.appendChild(swatch);
  }
  
  colorContainer.appendChild(colorGrid);
  parent.appendChild(colorContainer);
}

// Add color section to Design System page (deprecated)
async function addColorSection(parent: FrameNode) {
  const section = await createSection('Colors', parent, 'A comprehensive color palette with semantic tokens for light and dark modes');
  
  // Get color variables from the document
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const colorCollection = collections.find(c => c.name.includes('Color') || c.name.includes('Theme'));
  
  if (colorCollection) {
    const variables = await Promise.all(
      colorCollection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
    );
    
    // Group colors by category
    const colorGroups: Record<string, any[]> = {};
    variables.forEach(variable => {
      if (variable && variable.resolvedType === 'COLOR') {
        const category = variable.name.split('/')[0] || 'Other';
        if (!colorGroups[category]) colorGroups[category] = [];
        colorGroups[category].push(variable);
      }
    });
    
    // Create color swatches for each group
    for (const [category, colors] of Object.entries(colorGroups)) {
      const groupFrame = figma.createFrame();
      groupFrame.name = `Color Group - ${category}`;
      groupFrame.layoutMode = 'VERTICAL';
      groupFrame.primaryAxisSizingMode = 'AUTO';
      groupFrame.counterAxisSizingMode = 'FIXED';
      // Let auto-layout determine the height
      groupFrame.resize(1200, 200); // Initial height
      groupFrame.itemSpacing = 16;
      
      // Category title
      const categoryTitle = figma.createText();
      const categoryFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
      categoryTitle.fontName = categoryFont;
      categoryTitle.fontSize = 18;
      categoryTitle.characters = category;
      groupFrame.appendChild(categoryTitle);
      
      // Color grid
      const colorGrid = figma.createFrame();
      colorGrid.name = 'Color Grid';
      colorGrid.layoutMode = 'HORIZONTAL';
      colorGrid.layoutWrap = 'WRAP';
      colorGrid.primaryAxisSizingMode = 'FIXED';
      colorGrid.counterAxisSizingMode = 'AUTO';
      colorGrid.resize(1200, 300); // Initial height
      colorGrid.itemSpacing = 16;
      colorGrid.counterAxisSpacing = 16;
      
      // Add color swatches
      for (const colorVar of colors) {
        const swatch = await createColorSwatch(colorVar);
        colorGrid.appendChild(swatch);
      }
      
      groupFrame.appendChild(colorGrid);
      section.appendChild(groupFrame);
    }
  }
}

// Create a color swatch
async function createColorSwatch(variable: Variable): Promise<FrameNode> {
  const swatch = figma.createFrame();
  swatch.name = `Color Swatch - ${variable.name}`;
  swatch.resize(160, 120);
  swatch.layoutMode = 'VERTICAL';
  swatch.primaryAxisSizingMode = 'FIXED';
  swatch.counterAxisSizingMode = 'FIXED';
  swatch.cornerRadius = 8;
  swatch.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 2 },
    radius: 8,
    visible: true,
    blendMode: 'NORMAL'
  }];
  
  // Color preview
  const colorPreview = figma.createRectangle();
  colorPreview.resize(160, 80);
  colorPreview.topLeftRadius = 8;
  colorPreview.topRightRadius = 8;
  
  // Apply the variable as a bound fill
  const fillsCopy = JSON.parse(JSON.stringify([{
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0 },
    boundVariables: {
      'color': {
        type: 'VARIABLE_ALIAS',
        id: variable.id
      }
    }
  }]));
  colorPreview.fills = fillsCopy;
  
  // Info container
  const infoContainer = figma.createFrame();
  infoContainer.resize(160, 40);
  infoContainer.layoutMode = 'VERTICAL';
  infoContainer.paddingTop = 8;
  infoContainer.paddingBottom = 8;
  infoContainer.paddingLeft = 12;
  infoContainer.paddingRight = 12;
  infoContainer.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  
  // Variable name
  const nameText = figma.createText();
  const nameFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
  nameText.fontName = nameFont;
  nameText.fontSize = 12;
  nameText.characters = variable.name.split('/').pop() || variable.name;
  nameText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  
  infoContainer.appendChild(nameText);
  swatch.appendChild(colorPreview);
  swatch.appendChild(infoContainer);
  
  return swatch;
}

// Add typography section
async function addTypographySection(parent: FrameNode) {
  const section = await createSection('Typography', parent, 'Type scale and text styles for consistent hierarchy');
  
  // Define typography scales
  const typographyScales = [
    { name: 'Display', size: 48, weight: 'Bold', lineHeight: 56 },
    { name: 'Headline', size: 32, weight: 'Semi Bold', lineHeight: 40 },
    { name: 'Title', size: 24, weight: 'Semi Bold', lineHeight: 32 },
    { name: 'Subtitle', size: 20, weight: 'Medium', lineHeight: 28 },
    { name: 'Body', size: 16, weight: 'Regular', lineHeight: 24 },
    { name: 'Caption', size: 14, weight: 'Regular', lineHeight: 20 },
    { name: 'Small', size: 12, weight: 'Regular', lineHeight: 16 }
  ];
  
  for (const scale of typographyScales) {
    const typeFrame = figma.createFrame();
    typeFrame.name = `Typography - ${scale.name}`;
    typeFrame.layoutMode = 'HORIZONTAL';
    typeFrame.primaryAxisSizingMode = 'FIXED';
    typeFrame.counterAxisSizingMode = 'AUTO';
    typeFrame.resize(1200, 100); // Initial height
    typeFrame.itemSpacing = 40;
    typeFrame.paddingTop = 20;
    typeFrame.paddingBottom = 20;
    typeFrame.paddingLeft = 24;
    typeFrame.paddingRight = 24;
    typeFrame.cornerRadius = 8;
    typeFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    
    // Sample text
    const sampleText = figma.createText();
    const sampleFont = await loadFontSafe({ family: 'Inter', style: scale.weight });
    sampleText.fontName = sampleFont;
    sampleText.fontSize = scale.size;
    sampleText.lineHeight = { value: scale.lineHeight, unit: 'PIXELS' };
    sampleText.characters = 'The quick brown fox jumps over the lazy dog';
    // Let text auto-size
    
    // Info text
    const infoText = figma.createText();
    const infoFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
    infoText.fontName = infoFont;
    infoText.fontSize = 14;
    infoText.characters = `${scale.name}\n${scale.size}px / ${scale.lineHeight}px\n${scale.weight}`;
    infoText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    infoText.textAlignHorizontal = 'RIGHT';
    // Let text auto-size
    
    typeFrame.appendChild(sampleText);
    typeFrame.appendChild(infoText);
    section.appendChild(typeFrame);
  }
}

// Add spacing section
async function addSpacingSection(parent: FrameNode) {
  const section = await createSection('Spacing', parent, 'Consistent spacing tokens for layout and components');
  
  // Define spacing scale
  const spacingScale = [
    { name: 'spacing-0', value: 0 },
    { name: 'spacing-1', value: 4 },
    { name: 'spacing-2', value: 8 },
    { name: 'spacing-3', value: 12 },
    { name: 'spacing-4', value: 16 },
    { name: 'spacing-5', value: 20 },
    { name: 'spacing-6', value: 24 },
    { name: 'spacing-8', value: 32 },
    { name: 'spacing-10', value: 40 },
    { name: 'spacing-12', value: 48 },
    { name: 'spacing-16', value: 64 },
    { name: 'spacing-20', value: 80 },
    { name: 'spacing-24', value: 96 }
  ];
  
  const spacingGrid = figma.createFrame();
  spacingGrid.name = 'Spacing Grid';
  spacingGrid.layoutMode = 'HORIZONTAL';
  spacingGrid.layoutWrap = 'WRAP';
  spacingGrid.primaryAxisSizingMode = 'FIXED';
  spacingGrid.counterAxisSizingMode = 'AUTO';
  spacingGrid.resize(1200, 200); // Initial height
  spacingGrid.itemSpacing = 24;
  spacingGrid.counterAxisSpacing = 24;
  
  for (const spacing of spacingScale) {
    const spacingFrame = figma.createFrame();
    spacingFrame.name = spacing.name;
    spacingFrame.resize(120, 120);
    spacingFrame.layoutMode = 'VERTICAL';
    spacingFrame.primaryAxisAlignItems = 'CENTER';
    spacingFrame.counterAxisAlignItems = 'CENTER';
    spacingFrame.cornerRadius = 8;
    spacingFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    spacingFrame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    spacingFrame.strokeWeight = 1;
    
    // Spacing visualization
    const spacingViz = figma.createRectangle();
    spacingViz.resize(spacing.value || 1, spacing.value || 1);
    spacingViz.fills = [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }];
    spacingViz.cornerRadius = 2;
    
    // Label
    const label = figma.createText();
    const labelFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
    label.fontName = labelFont;
    label.fontSize = 12;
    label.characters = `${spacing.value}px`;
    label.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    
    spacingFrame.appendChild(spacingViz);
    spacingFrame.appendChild(label);
    spacingGrid.appendChild(spacingFrame);
  }
  
  section.appendChild(spacingGrid);
}

// Add effects section (shadows, blur, etc.)
async function addEffectsSection(parent: FrameNode) {
  const section = await createSection('Effects', parent);
  
  // Shadow examples
  const shadows = [
    { 
      name: 'Shadow SM', 
      effect: {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        radius: 3,
        visible: true,
        blendMode: 'NORMAL' as const
      }
    },
    { 
      name: 'Shadow MD', 
      effect: {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 4 },
        radius: 6,
        visible: true,
        blendMode: 'NORMAL' as const
      }
    },
    { 
      name: 'Shadow LG', 
      effect: {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 10 },
        radius: 15,
        visible: true,
        blendMode: 'NORMAL' as const
      }
    },
    { 
      name: 'Shadow XL', 
      effect: {
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 20 },
        radius: 25,
        visible: true,
        blendMode: 'NORMAL' as const
      }
    }
  ];
  
  const shadowGrid = figma.createFrame();
  shadowGrid.name = 'Shadow Grid';
  shadowGrid.layoutMode = 'HORIZONTAL';
  shadowGrid.primaryAxisSizingMode = 'AUTO';
  shadowGrid.counterAxisSizingMode = 'AUTO';
  shadowGrid.itemSpacing = 32;
  
  for (const shadow of shadows) {
    const shadowFrame = figma.createFrame();
    shadowFrame.name = shadow.name;
    shadowFrame.resize(200, 150);
    shadowFrame.layoutMode = 'VERTICAL';
    shadowFrame.primaryAxisAlignItems = 'CENTER';
    shadowFrame.counterAxisAlignItems = 'CENTER';
    shadowFrame.itemSpacing = 16;
    shadowFrame.paddingTop = 24;
    shadowFrame.paddingBottom = 24;
    
    // Shadow preview
    const preview = figma.createRectangle();
    preview.resize(120, 80);
    preview.cornerRadius = 8;
    preview.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    preview.effects = [shadow.effect];
    
    // Label
    const label = figma.createText();
    const shadowLabelFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
    label.fontName = shadowLabelFont;
    label.fontSize = 14;
    label.characters = shadow.name;
    
    shadowFrame.appendChild(preview);
    shadowFrame.appendChild(label);
    shadowGrid.appendChild(shadowFrame);
  }
  
  section.appendChild(shadowGrid);
}

// Add grid section
async function addGridSection(parent: FrameNode) {
  const section = await createSection('Grid System', parent);
  
  // Create grid examples
  const gridExamples = [
    { columns: 12, gutter: 24, margin: 80, name: 'Desktop Grid' },
    { columns: 8, gutter: 20, margin: 40, name: 'Tablet Grid' },
    { columns: 4, gutter: 16, margin: 20, name: 'Mobile Grid' }
  ];
  
  for (const grid of gridExamples) {
    const gridFrame = figma.createFrame();
    gridFrame.name = grid.name;
    gridFrame.resize(1200, 200);
    gridFrame.layoutMode = 'HORIZONTAL';
    gridFrame.primaryAxisSizingMode = 'FIXED';
    gridFrame.counterAxisSizingMode = 'FIXED';
    gridFrame.itemSpacing = grid.gutter;
    gridFrame.paddingLeft = grid.margin;
    gridFrame.paddingRight = grid.margin;
    gridFrame.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.97 } }];
    gridFrame.cornerRadius = 8;
    
    // Add columns
    const columnWidth = (1200 - (grid.margin * 2) - (grid.gutter * (grid.columns - 1))) / grid.columns;
    
    for (let i = 0; i < grid.columns; i++) {
      const column = figma.createRectangle();
      column.resize(columnWidth, 200);
      column.fills = [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 }, opacity: 0.2 }];
      gridFrame.appendChild(column);
    }
    
    // Add label
    const labelFrame = figma.createFrame();
    labelFrame.resize(1200, 40);
    labelFrame.layoutMode = 'HORIZONTAL';
    labelFrame.counterAxisAlignItems = 'CENTER';
    labelFrame.paddingLeft = 24;
    
    const label = figma.createText();
    const gridLabelFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
    label.fontName = gridLabelFont;
    label.fontSize = 14;
    label.characters = `${grid.name}: ${grid.columns} columns, ${grid.gutter}px gutter, ${grid.margin}px margin`;
    
    labelFrame.appendChild(label);
    
    const wrapper = figma.createFrame();
    wrapper.name = `${grid.name} Wrapper`;
    wrapper.layoutMode = 'VERTICAL';
    wrapper.primaryAxisSizingMode = 'AUTO';
    wrapper.counterAxisSizingMode = 'AUTO';
    wrapper.itemSpacing = 8;
    
    wrapper.appendChild(labelFrame);
    wrapper.appendChild(gridFrame);
    section.appendChild(wrapper);
  }
}

// Add animation section  
async function addAnimationSection(parent: FrameNode) {
  const section = await createSection('Animations', parent);
  
  // Import animation tokens
  const { generateAnimationTokens } = await import('../../extractors/animation-extractor');
  const animationTokens = generateAnimationTokens();
  
  // Create subsections for each animation type
  const subsections = [
    { title: 'Durations', tokens: animationTokens.durations },
    { title: 'Timing Functions', tokens: animationTokens.timingFunctions },
    { title: 'Delays', tokens: animationTokens.delays },
    { title: 'Preset Animations', tokens: animationTokens.animations }
  ];
  
  for (const subsection of subsections) {
    // Create subsection container
    const subsectionFrame = figma.createFrame();
    subsectionFrame.name = subsection.title;
    subsectionFrame.layoutMode = 'VERTICAL';
    subsectionFrame.primaryAxisSizingMode = 'AUTO';
    subsectionFrame.counterAxisSizingMode = 'AUTO';
    subsectionFrame.itemSpacing = 16;
    subsectionFrame.paddingTop = 24;
    subsectionFrame.paddingBottom = 24;
    subsectionFrame.paddingLeft = 32;
    subsectionFrame.paddingRight = 32;
    subsectionFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
    subsectionFrame.cornerRadius = 12;
    
    // Subsection title
    const title = figma.createText();
    const titleFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
    title.fontName = titleFont;
    title.fontSize = 18;
    title.characters = subsection.title;
    subsectionFrame.appendChild(title);
    
    // Create token grid
    const tokenGrid = figma.createFrame();
    tokenGrid.name = `${subsection.title} Grid`;
    tokenGrid.layoutMode = 'VERTICAL';
    tokenGrid.primaryAxisSizingMode = 'AUTO';
    tokenGrid.counterAxisSizingMode = 'AUTO';
    tokenGrid.itemSpacing = 8;
    
    for (const token of subsection.tokens) {
      const tokenRow = figma.createFrame();
      tokenRow.name = token.name;
      tokenRow.layoutMode = 'HORIZONTAL';
      tokenRow.primaryAxisSizingMode = 'AUTO';
      tokenRow.counterAxisSizingMode = 'AUTO';
      tokenRow.itemSpacing = 16;
      tokenRow.paddingTop = 8;
      tokenRow.paddingBottom = 8;
      tokenRow.paddingLeft = 16;
      tokenRow.paddingRight = 16;
      tokenRow.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      tokenRow.cornerRadius = 6;
      
      // Token name
      const nameText = figma.createText();
      const nameFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
      nameText.fontName = nameFont;
      nameText.fontSize = 14;
      nameText.characters = token.name;
      // Remove layoutSizingHorizontal as it requires auto-layout
      
      // Token value
      const valueText = figma.createText();
      const valueFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
      valueText.fontName = valueFont;
      valueText.fontSize = 14;
      valueText.characters = String(token.value);
      valueText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
      
      tokenRow.appendChild(nameText);
      tokenRow.appendChild(valueText);
      tokenGrid.appendChild(tokenRow);
    }
    
    subsectionFrame.appendChild(tokenGrid);
    section.appendChild(subsectionFrame);
  }
  
  // Add note about Figma limitations
  const noteFrame = figma.createFrame();
  noteFrame.layoutMode = 'VERTICAL';
  noteFrame.primaryAxisSizingMode = 'AUTO';
  noteFrame.counterAxisSizingMode = 'AUTO';
  noteFrame.paddingTop = 16;
  noteFrame.paddingBottom = 16;
  noteFrame.paddingLeft = 24;
  noteFrame.paddingRight = 24;
  noteFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 0.95, b: 0.8 } }];
  noteFrame.cornerRadius = 8;
  
  const noteText = figma.createText();
  const noteFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  noteText.fontName = noteFont;
  noteText.fontSize = 13;
  noteText.characters = '⚠️ Note: Figma does not directly support animations. These tokens are for documentation and development reference.';
  // Remove layoutSizingHorizontal as it requires auto-layout
  
  noteFrame.appendChild(noteText);
  section.appendChild(noteFrame);
}

// Component section helpers
async function addButtonComponents(parent: FrameNode) {
  const section = await createSection('Buttons', parent);
  
  const variants = ['primary', 'secondary', 'outline', 'ghost', 'destructive'];
  const sizes = ['small', 'medium', 'large'];
  const states = ['default', 'hover', 'pressed', 'disabled'];
  
  // Create a grid for button variations
  const buttonGrid = figma.createFrame();
  buttonGrid.name = 'Button Grid';
  buttonGrid.layoutMode = 'VERTICAL';
  buttonGrid.primaryAxisSizingMode = 'AUTO';
  buttonGrid.counterAxisSizingMode = 'AUTO';
  buttonGrid.itemSpacing = 24;
  
  for (const variant of variants) {
    const variantRow = figma.createFrame();
    variantRow.name = `Button ${variant}`;
    variantRow.layoutMode = 'HORIZONTAL';
    variantRow.primaryAxisSizingMode = 'AUTO';
    variantRow.counterAxisSizingMode = 'AUTO';
    variantRow.itemSpacing = 16;
    
    for (const size of sizes) {
      const button = await createButton(variant, size);
      variantRow.appendChild(button);
    }
    
    buttonGrid.appendChild(variantRow);
  }
  
  section.appendChild(buttonGrid);
}

async function addInputComponents(parent: FrameNode) {
  const section = await createSection('Inputs', parent);
  
  const inputTypes = ['text', 'email', 'password', 'search', 'textarea'];
  const states = ['default', 'focused', 'error', 'disabled'];
  
  const inputGrid = figma.createFrame();
  inputGrid.name = 'Input Grid';
  inputGrid.layoutMode = 'VERTICAL';
  inputGrid.primaryAxisSizingMode = 'AUTO';
  inputGrid.counterAxisSizingMode = 'AUTO';
  inputGrid.itemSpacing = 24;
  
  for (const type of inputTypes) {
    const inputRow = figma.createFrame();
    inputRow.name = `Input ${type}`;
    inputRow.layoutMode = 'HORIZONTAL';
    inputRow.primaryAxisSizingMode = 'AUTO';
    inputRow.counterAxisSizingMode = 'AUTO';
    inputRow.itemSpacing = 16;
    
    for (const state of states) {
      const input = await createInput(type, state);
      inputRow.appendChild(input);
    }
    
    inputGrid.appendChild(inputRow);
  }
  
  section.appendChild(inputGrid);
}

async function addCardComponents(parent: FrameNode) {
  const section = await createSection('Cards', parent);
  
  const cardTypes = ['default', 'bordered', 'elevated', 'interactive'];
  
  const cardGrid = figma.createFrame();
  cardGrid.name = 'Card Grid';
  cardGrid.layoutMode = 'HORIZONTAL';
  cardGrid.primaryAxisSizingMode = 'AUTO';
  cardGrid.counterAxisSizingMode = 'AUTO';
  cardGrid.itemSpacing = 24;
  
  for (const type of cardTypes) {
    const card = await createCard(type);
    cardGrid.appendChild(card);
  }
  
  section.appendChild(cardGrid);
}

async function addNavigationComponents(parent: FrameNode) {
  const section = await createSection('Navigation', parent);
  
  // Add breadcrumb
  const breadcrumb = await createBreadcrumb();
  section.appendChild(breadcrumb);
  
  // Add tabs
  const tabs = await createTabs();
  section.appendChild(tabs);
  
  // Add nav menu
  const navMenu = await createNavMenu();
  section.appendChild(navMenu);
}

async function addFeedbackComponents(parent: FrameNode) {
  const section = await createSection('Feedback', parent);
  
  // Toast examples
  const toastTypes = ['success', 'error', 'warning', 'info'];
  const toastContainer = figma.createFrame();
  toastContainer.name = 'Toast Container';
  toastContainer.layoutMode = 'VERTICAL';
  toastContainer.primaryAxisSizingMode = 'AUTO';
  toastContainer.counterAxisSizingMode = 'AUTO';
  toastContainer.itemSpacing = 16;
  
  for (const type of toastTypes) {
    const toast = await createToast(type);
    toastContainer.appendChild(toast);
  }
  
  section.appendChild(toastContainer);
  
  // Badge examples
  const badgeTypes = ['default', 'primary', 'success', 'warning', 'error'];
  const badgeContainer = figma.createFrame();
  badgeContainer.name = 'Badge Container';
  badgeContainer.layoutMode = 'HORIZONTAL';
  badgeContainer.primaryAxisSizingMode = 'AUTO';
  badgeContainer.counterAxisSizingMode = 'AUTO';
  badgeContainer.itemSpacing = 16;
  
  for (const type of badgeTypes) {
    const badge = await createBadge(type);
    badgeContainer.appendChild(badge);
  }
  
  section.appendChild(badgeContainer);
}

async function addLayoutComponents(parent: FrameNode) {
  const section = await createSection('Layout', parent);
  
  // Container examples
  const containerSizes = ['sm', 'md', 'lg', 'xl'];
  
  for (const size of containerSizes) {
    const container = await createContainer(size);
    section.appendChild(container);
  }
}

// Helper function to create sections
async function createSection(title: string, parent: FrameNode, description?: string): Promise<FrameNode> {
  // Main section container
  const sectionContainer = figma.createFrame();
  sectionContainer.name = `${title} Section`;
  sectionContainer.layoutMode = 'VERTICAL';
  sectionContainer.primaryAxisSizingMode = 'AUTO';
  sectionContainer.counterAxisSizingMode = 'FIXED';
  sectionContainer.resize(1200, 400); // Initial height
  sectionContainer.itemSpacing = 40;
  sectionContainer.paddingTop = 60;
  sectionContainer.paddingBottom = 60;
  
  // Header
  const header = figma.createFrame();
  header.name = 'Section Header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'AUTO';
  header.itemSpacing = 12;
  header.paddingBottom = 32;
  
  // Section title
  const titleText = figma.createText();
  const sectionTitleFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
  titleText.fontName = sectionTitleFont;
  titleText.fontSize = 32;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  header.appendChild(titleText);
  
  // Section description
  if (description) {
    const descText = figma.createText();
    const descFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
    descText.fontName = descFont;
    descText.fontSize = 16;
    descText.characters = description;
    descText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.45 } }];
    header.appendChild(descText);
  }
  
  // Divider
  const divider = figma.createRectangle();
  divider.name = 'Divider';
  divider.resize(1200, 1);
  divider.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }];
  
  sectionContainer.appendChild(header);
  sectionContainer.appendChild(divider);
  
  // Content area
  const contentArea = figma.createFrame();
  contentArea.name = 'Content Area';
  contentArea.layoutMode = 'VERTICAL';
  contentArea.primaryAxisSizingMode = 'AUTO';
  contentArea.counterAxisSizingMode = 'FIXED';
  contentArea.resize(1200, 300); // Initial height
  contentArea.itemSpacing = 32;
  
  sectionContainer.appendChild(contentArea);
  parent.appendChild(sectionContainer);
  
  return contentArea; // Return content area for adding content
}

// Component creation helpers
async function createButton(variant: string, size: string): Promise<FrameNode> {
  const button = figma.createFrame();
  button.name = `Button/${variant}/${size}`;
  button.layoutMode = 'HORIZONTAL';
  button.primaryAxisAlignItems = 'CENTER';
  button.counterAxisAlignItems = 'CENTER';
  
  // Size configurations
  const sizeConfig = {
    small: { height: 32, padding: 12, fontSize: 14 },
    medium: { height: 40, padding: 16, fontSize: 16 },
    large: { height: 48, padding: 20, fontSize: 18 }
  }[size] || { height: 40, padding: 16, fontSize: 16 };
  
  button.resize(0, sizeConfig.height);
  button.paddingLeft = sizeConfig.padding;
  button.paddingRight = sizeConfig.padding;
  button.cornerRadius = 6;
  button.primaryAxisSizingMode = 'AUTO';
  button.counterAxisSizingMode = 'FIXED';
  
  // Variant styles
  const variantStyles = {
    primary: {
      fills: [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }],
      textColor: { r: 1, g: 1, b: 1 }
    },
    secondary: {
      fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.96 } }],
      textColor: { r: 0.2, g: 0.2, b: 0.2 }
    },
    outline: {
      fills: [],
      strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.82 } }],
      strokeWeight: 1,
      textColor: { r: 0.2, g: 0.2, b: 0.2 }
    },
    ghost: {
      fills: [],
      textColor: { r: 0.2, g: 0.2, b: 0.2 }
    },
    destructive: {
      fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.33, b: 0.33 } }],
      textColor: { r: 1, g: 1, b: 1 }
    }
  };
  
  const style = variantStyles[variant as keyof typeof variantStyles] || variantStyles.primary;
  
  if (style.fills) button.fills = style.fills as readonly Paint[];
  if (style.strokes) button.strokes = style.strokes as readonly Paint[];
  if (style.strokeWeight) button.strokeWeight = style.strokeWeight;
  
  // Button text
  const text = figma.createText();
  const buttonFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
  text.fontName = buttonFont;
  text.fontSize = sizeConfig.fontSize;
  text.characters = 'Button';
  text.fills = [{ type: 'SOLID', color: style.textColor }];
  
  button.appendChild(text);
  
  return button;
}

async function createInput(type: string, state: string): Promise<FrameNode> {
  const inputFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  const inputLabelFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
  
  const inputContainer = figma.createFrame();
  inputContainer.name = `Input/${type}/${state}`;
  inputContainer.layoutMode = 'VERTICAL';
  inputContainer.primaryAxisSizingMode = 'FIXED';
  inputContainer.counterAxisSizingMode = 'AUTO';
  inputContainer.resize(240, 80); // Initial height
  inputContainer.itemSpacing = 8;
  
  // Label
  const label = figma.createText();
  label.fontName = inputLabelFont;
  label.fontSize = 14;
  label.characters = 'Label';
  label.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  
  // Input field
  const input = figma.createFrame();
  input.resize(240, type === 'textarea' ? 96 : 40);
  input.cornerRadius = 6;
  input.paddingLeft = 12;
  input.paddingRight = 12;
  input.paddingTop = type === 'textarea' ? 10 : 8;
  input.paddingBottom = type === 'textarea' ? 10 : 8;
  input.layoutMode = 'HORIZONTAL';
  input.counterAxisAlignItems = type === 'textarea' ? 'MIN' : 'CENTER';
  
  // State styles
  const stateStyles = {
    default: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      strokes: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.82 } }],
      strokeWeight: 1
    },
    focused: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      strokes: [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }],
      strokeWeight: 2
    },
    error: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 0.95, b: 0.95 } }],
      strokes: [{ type: 'SOLID', color: { r: 0.96, g: 0.33, b: 0.33 } }],
      strokeWeight: 1
    },
    disabled: {
      fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.97 } }],
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }],
      strokeWeight: 1
    }
  };
  
  const style = stateStyles[state as keyof typeof stateStyles] || stateStyles.default;
  input.fills = style.fills as readonly Paint[];
  input.strokes = style.strokes as readonly Paint[];
  input.strokeWeight = style.strokeWeight;
  
  // Placeholder text
  const placeholder = figma.createText();
  placeholder.fontName = inputFont;
  placeholder.fontSize = 14;
  placeholder.characters = type === 'search' ? 'Search...' : `Enter ${type}...`;
  placeholder.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
  
  input.appendChild(placeholder);
  
  inputContainer.appendChild(label);
  inputContainer.appendChild(input);
  
  // Error message for error state
  if (state === 'error') {
    const errorMsg = figma.createText();
    errorMsg.fontName = inputFont;
    errorMsg.fontSize = 12;
    errorMsg.characters = 'This field is required';
    errorMsg.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.33, b: 0.33 } }];
    inputContainer.appendChild(errorMsg);
  }
  
  return inputContainer;
}

async function createCard(type: string): Promise<FrameNode> {
  const cardTitleFont = await loadFontSafe({ family: 'Inter', style: 'Semi Bold' });
  const cardDescFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  
  const card = figma.createFrame();
  card.name = `Card/${type}`;
  card.resize(280, 320);
  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'FIXED';
  card.counterAxisSizingMode = 'FIXED';
  card.cornerRadius = 12;
  
  // Card styles
  const cardStyles = {
    default: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      effects: []
    },
    bordered: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      strokes: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }],
      strokeWeight: 1,
      effects: []
    },
    elevated: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      effects: [{
        type: 'DROP_SHADOW' as const,
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 4 },
        radius: 12,
        visible: true,
        blendMode: 'NORMAL' as const
      }]
    },
    interactive: {
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      strokes: [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 }, opacity: 0.2 }],
      strokeWeight: 2,
      effects: [{
        type: 'DROP_SHADOW' as const,
        color: { r: 0.33, g: 0.56, b: 0.96, a: 0.1 },
        offset: { x: 0, y: 2 },
        radius: 8,
        visible: true,
        blendMode: 'NORMAL' as const
      }]
    }
  };
  
  const style = cardStyles[type as keyof typeof cardStyles] || cardStyles.default;
  card.fills = style.fills as readonly Paint[];
  if (style.strokes) card.strokes = style.strokes as readonly Paint[];
  if (style.strokeWeight) card.strokeWeight = style.strokeWeight;
  if (style.effects) card.effects = style.effects as readonly Effect[];
  
  // Card image placeholder
  const imagePlaceholder = figma.createRectangle();
  imagePlaceholder.resize(280, 160);
  imagePlaceholder.topLeftRadius = 12;
  imagePlaceholder.topRightRadius = 12;
  imagePlaceholder.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.96 } }];
  
  // Card content
  const content = figma.createFrame();
  content.layoutMode = 'VERTICAL';
  content.primaryAxisSizingMode = 'FIXED';
  content.counterAxisSizingMode = 'AUTO';
  content.resize(280, 160);
  content.paddingTop = 20;
  content.paddingBottom = 20;
  content.paddingLeft = 20;
  content.paddingRight = 20;
  content.itemSpacing = 12;
  
  // Title
  const title = figma.createText();
  title.fontName = cardTitleFont;
  title.fontSize = 18;
  title.characters = 'Card Title';
  title.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.067 } }];
  
  // Description
  const description = figma.createText();
  description.fontName = cardDescFont;
  description.fontSize = 14;
  description.characters = 'This is a card component with some sample content.';
  description.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  // Let text auto-size
  description.textAutoResize = 'HEIGHT';
  
  content.appendChild(title);
  content.appendChild(description);
  
  card.appendChild(imagePlaceholder);
  card.appendChild(content);
  
  return card;
}

async function createBreadcrumb(): Promise<FrameNode> {
  const breadcrumbFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  
  const breadcrumb = figma.createFrame();
  breadcrumb.name = 'Breadcrumb';
  breadcrumb.layoutMode = 'HORIZONTAL';
  breadcrumb.primaryAxisSizingMode = 'AUTO';
  breadcrumb.counterAxisSizingMode = 'AUTO';
  breadcrumb.itemSpacing = 8;
  breadcrumb.paddingTop = 8;
  breadcrumb.paddingBottom = 8;
  
  const items = ['Home', 'Products', 'Category', 'Item'];
  
  for (let i = 0; i < items.length; i++) {
    // Breadcrumb item
    const item = figma.createText();
    item.fontName = breadcrumbFont;
    item.fontSize = 14;
    item.characters = items[i];
    item.fills = i === items.length - 1 
      ? [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
      : [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }];
    
    breadcrumb.appendChild(item);
    
    // Separator
    if (i < items.length - 1) {
      const separator = figma.createText();
      separator.fontName = breadcrumbFont;
      separator.fontSize = 14;
      separator.characters = '/';
      separator.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
      breadcrumb.appendChild(separator);
    }
  }
  
  return breadcrumb;
}

async function createTabs(): Promise<FrameNode> {
  const tabFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
  
  const tabsContainer = figma.createFrame();
  tabsContainer.name = 'Tabs';
  tabsContainer.layoutMode = 'VERTICAL';
  tabsContainer.primaryAxisSizingMode = 'AUTO';
  tabsContainer.counterAxisSizingMode = 'AUTO';
  
  // Tab list
  const tabList = figma.createFrame();
  tabList.layoutMode = 'HORIZONTAL';
  tabList.primaryAxisSizingMode = 'AUTO';
  tabList.counterAxisSizingMode = 'AUTO';
  tabList.itemSpacing = 24;
  tabList.paddingBottom = 12;
  
  const tabs = ['Overview', 'Analytics', 'Reports', 'Settings'];
  
  for (let i = 0; i < tabs.length; i++) {
    const tab = figma.createFrame();
    tab.layoutMode = 'VERTICAL';
    tab.primaryAxisSizingMode = 'AUTO';
    tab.counterAxisSizingMode = 'AUTO';
    
    const tabText = figma.createText();
    tabText.fontName = tabFont;
    tabText.fontSize = 14;
    tabText.characters = tabs[i];
    tabText.fills = i === 0
      ? [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }]
      : [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    
    tab.appendChild(tabText);
    
    // Active indicator
    if (i === 0) {
      const indicator = figma.createRectangle();
      indicator.resize(tabText.width, 2);
      indicator.fills = [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }];
      indicator.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
      tab.appendChild(indicator);
    }
    
    tabList.appendChild(tab);
  }
  
  // Divider
  const divider = figma.createRectangle();
  divider.resize(600, 1);
  divider.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }];
  
  tabsContainer.appendChild(tabList);
  tabsContainer.appendChild(divider);
  
  return tabsContainer;
}

async function createNavMenu(): Promise<FrameNode> {
  const navMediumFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
  const navRegularFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  
  const nav = figma.createFrame();
  nav.name = 'Navigation Menu';
  nav.resize(240, 400); // Initial height
  nav.layoutMode = 'VERTICAL';
  nav.primaryAxisSizingMode = 'FIXED';
  nav.counterAxisSizingMode = 'AUTO';
  nav.paddingTop = 16;
  nav.paddingBottom = 16;
  nav.paddingLeft = 16;
  nav.paddingRight = 16;
  nav.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  nav.cornerRadius = 8;
  nav.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 2 },
    radius: 8,
    visible: true,
    blendMode: 'NORMAL'
  }];
  
  const menuItems = [
    { label: 'Dashboard', active: true },
    { label: 'Analytics', active: false },
    { label: 'Projects', active: false },
    { label: 'Team', active: false },
    { label: 'Settings', active: false }
  ];
  
  for (const menuItem of menuItems) {
    const item = figma.createFrame();
    item.resize(208, 36);
    item.layoutMode = 'HORIZONTAL';
    item.primaryAxisAlignItems = 'CENTER';
    item.paddingLeft = 12;
    item.paddingRight = 12;
    item.cornerRadius = 6;
    
    if (menuItem.active) {
      item.fills = [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 }, opacity: 0.1 }];
    }
    
    const text = figma.createText();
    text.fontName = menuItem.active ? navMediumFont : navRegularFont;
    text.fontSize = 14;
    text.characters = menuItem.label;
    text.fills = menuItem.active
      ? [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }]
      : [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    
    item.appendChild(text);
    nav.appendChild(item);
  }
  
  return nav;
}

async function createToast(type: string): Promise<FrameNode> {
  const toastTitleFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
  const toastMsgFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  
  const toast = figma.createFrame();
  toast.name = `Toast/${type}`;
  toast.resize(320, 64); // Initial height
  toast.layoutMode = 'HORIZONTAL';
  toast.primaryAxisSizingMode = 'FIXED';
  toast.counterAxisSizingMode = 'AUTO';
  toast.primaryAxisAlignItems = 'CENTER';
  toast.paddingTop = 12;
  toast.paddingBottom = 12;
  toast.paddingLeft = 16;
  toast.paddingRight = 16;
  toast.itemSpacing = 12;
  toast.cornerRadius = 6;
  
  // Toast styles
  const toastStyles = {
    success: {
      fills: [{ type: 'SOLID', color: { r: 0.93, g: 0.98, b: 0.93 } }],
      iconColor: { r: 0.33, g: 0.69, b: 0.33 },
      textColor: { r: 0.2, g: 0.4, b: 0.2 }
    },
    error: {
      fills: [{ type: 'SOLID', color: { r: 0.99, g: 0.93, b: 0.93 } }],
      iconColor: { r: 0.86, g: 0.33, b: 0.33 },
      textColor: { r: 0.4, g: 0.2, b: 0.2 }
    },
    warning: {
      fills: [{ type: 'SOLID', color: { r: 0.99, g: 0.96, b: 0.9 } }],
      iconColor: { r: 0.86, g: 0.6, b: 0.33 },
      textColor: { r: 0.4, g: 0.3, b: 0.2 }
    },
    info: {
      fills: [{ type: 'SOLID', color: { r: 0.93, g: 0.96, b: 0.99 } }],
      iconColor: { r: 0.33, g: 0.56, b: 0.86 },
      textColor: { r: 0.2, g: 0.3, b: 0.4 }
    }
  };
  
  const style = toastStyles[type as keyof typeof toastStyles] || toastStyles.info;
  toast.fills = style.fills as readonly Paint[];
  
  // Icon placeholder
  const icon = figma.createEllipse();
  icon.resize(20, 20);
  icon.fills = [{ type: 'SOLID', color: style.iconColor }];
  
  // Text content
  const textContainer = figma.createFrame();
  textContainer.layoutMode = 'VERTICAL';
  textContainer.primaryAxisSizingMode = 'AUTO';
  textContainer.counterAxisSizingMode = 'AUTO';
  textContainer.itemSpacing = 4;
  
  const title = figma.createText();
  title.fontName = toastTitleFont;
  title.fontSize = 14;
  title.characters = `${type.charAt(0).toUpperCase() + type.slice(1)} message`;
  title.fills = [{ type: 'SOLID', color: style.textColor }];
  
  const message = figma.createText();
  message.fontName = toastMsgFont;
  message.fontSize = 12;
  message.characters = 'This is a toast notification.';
  message.fills = [{ type: 'SOLID', color: style.textColor }];
  message.opacity = 0.8;
  
  textContainer.appendChild(title);
  textContainer.appendChild(message);
  
  toast.appendChild(icon);
  toast.appendChild(textContainer);
  
  return toast;
}

async function createBadge(type: string): Promise<FrameNode> {
  const badgeFont = await loadFontSafe({ family: 'Inter', style: 'Medium' });
  
  const badge = figma.createFrame();
  badge.name = `Badge/${type}`;
  badge.layoutMode = 'HORIZONTAL';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.primaryAxisAlignItems = 'CENTER';
  badge.counterAxisAlignItems = 'CENTER';
  badge.paddingTop = 4;
  badge.paddingBottom = 4;
  badge.paddingLeft = 8;
  badge.paddingRight = 8;
  badge.cornerRadius = 4;
  
  // Badge styles
  const badgeStyles = {
    default: {
      fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.96 } }],
      textColor: { r: 0.2, g: 0.2, b: 0.2 }
    },
    primary: {
      fills: [{ type: 'SOLID', color: { r: 0.33, g: 0.56, b: 0.96 } }],
      textColor: { r: 1, g: 1, b: 1 }
    },
    success: {
      fills: [{ type: 'SOLID', color: { r: 0.33, g: 0.69, b: 0.33 } }],
      textColor: { r: 1, g: 1, b: 1 }
    },
    warning: {
      fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.69, b: 0.33 } }],
      textColor: { r: 1, g: 1, b: 1 }
    },
    error: {
      fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.33, b: 0.33 } }],
      textColor: { r: 1, g: 1, b: 1 }
    }
  };
  
  const style = badgeStyles[type as keyof typeof badgeStyles] || badgeStyles.default;
  badge.fills = style.fills as readonly Paint[];
  
  const text = figma.createText();
  text.fontName = badgeFont;
  text.fontSize = 12;
  text.characters = type.toUpperCase();
  text.fills = [{ type: 'SOLID', color: style.textColor }];
  
  badge.appendChild(text);
  
  return badge;
}

async function createContainer(size: string): Promise<FrameNode> {
  const container = figma.createFrame();
  container.name = `Container/${size}`;
  container.layoutMode = 'HORIZONTAL';
  container.primaryAxisAlignItems = 'CENTER';
  container.counterAxisAlignItems = 'CENTER';
  container.counterAxisSizingMode = 'FIXED';
  container.resize(1200, 120);
  
  // Container sizes
  const containerSizes = {
    sm: { width: 640, padding: 16 },
    md: { width: 768, padding: 24 },
    lg: { width: 1024, padding: 32 },
    xl: { width: 1280, padding: 40 }
  };
  
  const config = containerSizes[size as keyof typeof containerSizes] || containerSizes.md;
  container.resize(config.width || 1200, 120);
  container.paddingLeft = config.padding;
  container.paddingRight = config.padding;
  container.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.99 } }];
  container.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.91 } }];
  container.strokeWeight = 1;
  container.dashPattern = [8, 4];
  
  // Label
  const label = figma.createText();
  const containerLabelFont = await loadFontSafe({ family: 'Inter', style: 'Regular' });
  label.fontName = containerLabelFont;
  label.fontSize = 14;
  label.characters = `Container ${size.toUpperCase()}: ${config.width}px`;
  label.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  
  container.appendChild(label);
  
  return container;
}

// Placeholder functions for other showcases
async function addInputShowcase(parent: FrameNode) {
  const card = await createUntitledCard('Inputs', 'Form input components');
  parent.appendChild(card);
}

async function addToggleShowcase(parent: FrameNode) {
  const card = await createUntitledCard('Toggles', 'Switch and checkbox components');
  parent.appendChild(card);
}

async function addBadgeShowcase(parent: FrameNode) {
  const card = await createUntitledCard('Badges', 'Status and label components');
  parent.appendChild(card);
}

// Placeholder functions for patterns
async function addFormPatternCard(parent: FrameNode) {
  const card = await createUntitledCard('Forms', 'Common form layouts');
  parent.appendChild(card);
}

async function addTablePatternCard(parent: FrameNode) {
  const card = await createUntitledCard('Tables', 'Data table patterns');
  parent.appendChild(card);
}

async function addEmptyStateCard(parent: FrameNode) {
  const card = await createUntitledCard('Empty States', 'No data illustrations');
  parent.appendChild(card);
}

async function addErrorPageCard(parent: FrameNode) {
  const card = await createUntitledCard('Error Pages', '404 and error states');
  parent.appendChild(card);
}

// Main function to generate both pages
export async function generateDesignSystemPages(): Promise<PageGeneratorResult> {
  const result: PageGeneratorResult = {
    success: false,
    pages: {},
    errors: []
  };
  
  try {
    console.log('🎨 Generating Design System pages...');
    
    // Load all pages first to avoid access errors
    await figma.loadAllPagesAsync();
    console.log('📄 All pages loaded');
    
    // Create Design System page
    result.pages.designSystem = await createDesignSystemPage();
    console.log('✅ Design System page created');
    
    // Create Universal Components page
    result.pages.components = await createUniversalComponentsPage();
    console.log('✅ Universal Components page created');
    
    result.success = true;
    
    // Switch to Design System page
    if (result.pages.designSystem) {
      await figma.setCurrentPageAsync(result.pages.designSystem);
    }
    
  } catch (error) {
    console.error('❌ Error generating pages:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
  }
  
  return result;
}