/**
 * Design Documentation Exporter
 * Exports comprehensive design documentation from Figma
 */

import { operationQueue } from '../../lib/operation-queue';
import { syncStateManager } from '../../lib/sync-state-manager';
import { figmaLogger, logger } from '../../lib/figma-logger';
import { MessageType } from '../../types/messages';

interface DocumentationOptions {
  includeColors?: boolean;
  includeTypography?: boolean;
  includeSpacing?: boolean;
  includeComponents?: boolean;
  includeIcons?: boolean;
  includePatterns?: boolean;
  includeGuidelines?: boolean;
  includeAccessibility?: boolean;
  format?: 'markdown' | 'html' | 'pdf' | 'json';
  includeScreenshots?: boolean;
  includeCodeExamples?: boolean;
  language?: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';
}

interface DocumentationSection {
  title: string;
  content: string;
  subsections?: DocumentationSection[];
  metadata?: Record<string, any>;
}

interface ExportedDocumentation {
  title: string;
  version: string;
  date: string;
  sections: DocumentationSection[];
  assets: DocumentationAsset[];
  format: string;
}

interface DocumentationAsset {
  id: string;
  type: 'image' | 'icon' | 'component';
  name: string;
  data?: string; // Base64 encoded
  url?: string;
}

/**
 * Design Documentation Exporter Class
 */
export class DesignDocumentationExporter {
  private operationId?: string;
  private documentation: ExportedDocumentation = {
    title: 'Design System Documentation',
    version: '1.0.0',
    date: new Date().toISOString(),
    sections: [],
    assets: [],
    format: 'markdown'
  };

  /**
   * Export design documentation
   */
  async export(options: DocumentationOptions = {}): Promise<void> {
    const operation = await operationQueue.addOperation(
      'documentation-export',
      async () => this.performExport(options),
      {
        priority: 'normal',
        data: { options }
      }
    );

    this.operationId = operation;
  }

  /**
   * Perform the export
   */
  private async performExport(options: DocumentationOptions): Promise<void> {
    try {
      logger.info('Starting design documentation export', { options });

      // Reset documentation
      this.documentation.sections = [];
      this.documentation.assets = [];
      this.documentation.format = options.format || 'markdown';

      // Step 1: Extract document metadata
      figmaLogger.updateProgress(this.operationId!, 10, 'Extracting document metadata...');
      await this.extractDocumentMetadata();

      // Step 2: Export color documentation
      if (options.includeColors !== false) {
        figmaLogger.updateProgress(this.operationId!, 20, 'Documenting colors...');
        await this.documentColors(options);
      }

      // Step 3: Export typography documentation
      if (options.includeTypography !== false) {
        figmaLogger.updateProgress(this.operationId!, 30, 'Documenting typography...');
        await this.documentTypography(options);
      }

      // Step 4: Export spacing documentation
      if (options.includeSpacing !== false) {
        figmaLogger.updateProgress(this.operationId!, 40, 'Documenting spacing...');
        await this.documentSpacing(options);
      }

      // Step 5: Export component documentation
      if (options.includeComponents !== false) {
        figmaLogger.updateProgress(this.operationId!, 50, 'Documenting components...');
        await this.documentComponents(options);
      }

      // Step 6: Export icon documentation
      if (options.includeIcons) {
        figmaLogger.updateProgress(this.operationId!, 60, 'Documenting icons...');
        await this.documentIcons(options);
      }

      // Step 7: Export patterns documentation
      if (options.includePatterns) {
        figmaLogger.updateProgress(this.operationId!, 70, 'Documenting patterns...');
        await this.documentPatterns(options);
      }

      // Step 8: Export guidelines
      if (options.includeGuidelines) {
        figmaLogger.updateProgress(this.operationId!, 80, 'Documenting guidelines...');
        await this.documentGuidelines(options);
      }

      // Step 9: Export accessibility documentation
      if (options.includeAccessibility) {
        figmaLogger.updateProgress(this.operationId!, 90, 'Documenting accessibility...');
        await this.documentAccessibility(options);
      }

      // Step 10: Generate final documentation
      figmaLogger.updateProgress(this.operationId!, 95, 'Generating documentation...');
      const result = await this.generateDocumentation(options);

      // Send results to UI
      figma.ui.postMessage({
        type: MessageType.DOCUMENTATION_EXPORTED,
        data: {
          documentation: result,
          format: options.format,
          sections: this.documentation.sections.length
        }
      });

      logger.success('Design documentation exported successfully', {
        sections: this.documentation.sections.length,
        assets: this.documentation.assets.length
      });
    } catch (error) {
      logger.error('Design documentation export failed', error);
      throw error;
    }
  }

  /**
   * Extract document metadata
   */
  private async extractDocumentMetadata(): Promise<void> {
    const metadata: DocumentationSection = {
      title: 'Document Information',
      content: '',
      metadata: {
        name: figma.root.name,
        lastModified: new Date().toISOString(),
        pages: figma.root.children.length,
        version: this.documentation.version
      }
    };

    // Build content
    metadata.content = this.formatMetadata(metadata.metadata);
    this.documentation.sections.push(metadata);
  }

  /**
   * Document colors
   */
  private async documentColors(options: DocumentationOptions): Promise<void> {
    const section: DocumentationSection = {
      title: 'Colors',
      content: '',
      subsections: []
    };

    // Find all color styles
    const colorStyles = await figma.getLocalPaintStylesAsync();
    
    // Group colors by category
    const colorGroups = new Map<string, any[]>();
    
    for (const style of colorStyles) {
      const category = this.getCategoryFromName(style.name);
      if (!colorGroups.has(category)) {
        colorGroups.set(category, []);
      }
      
      const colorData = {
        name: style.name,
        key: style.key,
        description: style.description,
        paints: style.paints
      };
      
      colorGroups.get(category)!.push(colorData);
    }

    // Create subsections for each category
    for (const [category, colors] of colorGroups) {
      const subsection: DocumentationSection = {
        title: category,
        content: this.formatColorSection(colors, options)
      };
      
      section.subsections!.push(subsection);
    }

    // Add color usage guidelines
    section.content = `The color system provides a comprehensive palette for all design needs. Colors are organized by purpose and semantic meaning.

## Color Principles
- **Semantic Colors**: Use purpose-driven colors (primary, success, warning, error)
- **Neutral Colors**: Use for text, backgrounds, and borders
- **Brand Colors**: Maintain brand consistency
- **Accessibility**: All color combinations meet WCAG AA standards

Total Colors: ${colorStyles.length}`;

    this.documentation.sections.push(section);
  }

  /**
   * Document typography
   */
  private async documentTypography(options: DocumentationOptions): Promise<void> {
    const section: DocumentationSection = {
      title: 'Typography',
      content: '',
      subsections: []
    };

    // Find all text styles
    const textStyles = await figma.getLocalTextStylesAsync();
    
    // Group typography by category
    const typeGroups = new Map<string, any[]>();
    
    for (const style of textStyles) {
      const category = this.getCategoryFromName(style.name);
      if (!typeGroups.has(category)) {
        typeGroups.set(category, []);
      }
      
      const typeData = {
        name: style.name,
        key: style.key,
        description: style.description,
        fontSize: style.fontSize,
        fontName: style.fontName,
        letterSpacing: style.letterSpacing,
        lineHeight: style.lineHeight,
        textCase: style.textCase,
        textDecoration: style.textDecoration
      };
      
      typeGroups.get(category)!.push(typeData);
    }

    // Create subsections
    for (const [category, styles] of typeGroups) {
      const subsection: DocumentationSection = {
        title: category,
        content: this.formatTypographySection(styles, options)
      };
      
      section.subsections!.push(subsection);
    }

    section.content = `The typography system ensures consistent and readable text across all platforms.

## Type Scale
Our type scale is based on a modular scale with a ratio of 1.25, providing harmonious size relationships.

## Font Families
- **Primary**: Inter - Used for all UI text
- **Monospace**: Roboto Mono - Used for code and technical content

Total Text Styles: ${textStyles.length}`;

    this.documentation.sections.push(section);
  }

  /**
   * Document spacing
   */
  private async documentSpacing(options: DocumentationOptions): Promise<void> {
    const section: DocumentationSection = {
      title: 'Spacing',
      content: '',
      subsections: []
    };

    // Define spacing scale
    const spacingScale = [
      { name: 'spacing-0', value: 0, pixels: '0px' },
      { name: 'spacing-1', value: 0.25, pixels: '4px' },
      { name: 'spacing-2', value: 0.5, pixels: '8px' },
      { name: 'spacing-3', value: 0.75, pixels: '12px' },
      { name: 'spacing-4', value: 1, pixels: '16px' },
      { name: 'spacing-5', value: 1.25, pixels: '20px' },
      { name: 'spacing-6', value: 1.5, pixels: '24px' },
      { name: 'spacing-8', value: 2, pixels: '32px' },
      { name: 'spacing-10', value: 2.5, pixels: '40px' },
      { name: 'spacing-12', value: 3, pixels: '48px' },
      { name: 'spacing-16', value: 4, pixels: '64px' },
      { name: 'spacing-20', value: 5, pixels: '80px' },
      { name: 'spacing-24', value: 6, pixels: '96px' }
    ];

    section.content = `The spacing system is based on a 4px grid, providing consistent spatial relationships.

## Spacing Principles
- **Base Unit**: 4px - All spacing values are multiples of this base
- **Consistency**: Use predefined spacing tokens, avoid arbitrary values
- **Hierarchy**: Larger spacing creates visual separation and hierarchy
- **Density**: Adjust spacing for different screen sizes and contexts

## Spacing Scale
${this.formatSpacingTable(spacingScale)}`;

    this.documentation.sections.push(section);
  }

  /**
   * Document components
   */
  private async documentComponents(options: DocumentationOptions): Promise<void> {
    const section: DocumentationSection = {
      title: 'Components',
      content: '',
      subsections: []
    };

    // Find all components
    const components: ComponentNode[] = [];
    const componentSets: ComponentSetNode[] = [];

    function traverse(node: SceneNode) {
      if (node.type === 'COMPONENT') {
        components.push(node);
      } else if (node.type === 'COMPONENT_SET') {
        componentSets.push(node);
      }

      if ('children' in node) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }

    // Search all pages
    for (const page of figma.root.children) {
      for (const child of page.children) {
        traverse(child);
      }
    }

    // Document component sets
    for (const componentSet of componentSets) {
      const subsection = await this.documentComponentSet(componentSet, options);
      section.subsections!.push(subsection);
    }

    // Document standalone components
    const standaloneComponents = components.filter(
      comp => comp.parent?.type !== 'COMPONENT_SET'
    );

    if (standaloneComponents.length > 0) {
      const standaloneSection: DocumentationSection = {
        title: 'Standalone Components',
        content: this.formatComponentList(standaloneComponents, options)
      };
      section.subsections!.push(standaloneSection);
    }

    section.content = `The component library provides reusable UI elements that ensure consistency across the product.

## Component Principles
- **Composability**: Components can be combined to create complex interfaces
- **Flexibility**: Components support multiple variants and states
- **Accessibility**: All components are keyboard navigable and screen reader friendly
- **Performance**: Components are optimized for rendering performance

Total Components: ${components.length}
Component Sets: ${componentSets.length}`;

    this.documentation.sections.push(section);
  }

  /**
   * Document a component set
   */
  private async documentComponentSet(
    componentSet: ComponentSetNode,
    options: DocumentationOptions
  ): Promise<DocumentationSection> {
    const section: DocumentationSection = {
      title: componentSet.name,
      content: ''
    };

    // Extract component properties
    const properties = componentSet.componentPropertyDefinitions || {};
    const variants = componentSet.children.filter(child => child.type === 'COMPONENT');

    let content = '';

    // Add description
    if (componentSet.description) {
      content += `${componentSet.description}\n\n`;
    }

    // Document properties
    if (Object.keys(properties).length > 0) {
      content += `### Properties\n\n`;
      content += `| Property | Type | Values | Default |\n`;
      content += `|----------|------|--------|------|\n`;

      for (const [propName, propDef] of Object.entries(properties)) {
        const values = propDef.variantOptions ? propDef.variantOptions.join(', ') : 'N/A';
        const defaultValue = propDef.defaultValue || 'N/A';
        content += `| ${propName} | ${propDef.type} | ${values} | ${defaultValue} |\n`;
      }
      content += '\n';
    }

    // Document variants
    if (variants.length > 0) {
      content += `### Variants (${variants.length})\n\n`;
      
      for (const variant of variants) {
        content += `- **${variant.name}**`;
        if (variant.description) {
          content += `: ${variant.description}`;
        }
        content += '\n';
      }
    }

    // Add code example if requested
    if (options.includeCodeExamples) {
      content += `\n### Usage Example\n\n`;
      content += this.generateComponentCodeExample(componentSet);
    }

    // Take screenshot if requested
    if (options.includeScreenshots && variants.length > 0) {
      try {
        const asset = await this.captureComponentScreenshot(variants[0]);
        if (asset) {
          this.documentation.assets.push(asset);
          content += `\n### Preview\n\n![${componentSet.name}](asset://${asset.id})\n`;
        }
      } catch (error) {
        logger.warn('Failed to capture component screenshot', error);
      }
    }

    section.content = content;
    return section;
  }

  /**
   * Document icons
   */
  private async documentIcons(options: DocumentationOptions): Promise<void> {
    const section: DocumentationSection = {
      title: 'Icons',
      content: '',
      subsections: []
    };

    // Find all icon components
    const icons: ComponentNode[] = [];

    function traverse(node: SceneNode) {
      if (node.type === 'COMPONENT' && 
          (node.name.toLowerCase().includes('icon') || 
           node.parent?.name.toLowerCase().includes('icon'))) {
        icons.push(node);
      }

      if ('children' in node) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }

    // Search all pages
    for (const page of figma.root.children) {
      for (const child of page.children) {
        traverse(child);
      }
    }

    // Group icons by category
    const iconGroups = new Map<string, ComponentNode[]>();
    
    for (const icon of icons) {
      const category = this.getIconCategory(icon.name);
      if (!iconGroups.has(category)) {
        iconGroups.set(category, []);
      }
      iconGroups.get(category)!.push(icon);
    }

    // Create subsections
    for (const [category, categoryIcons] of iconGroups) {
      const subsection: DocumentationSection = {
        title: category,
        content: await this.formatIconGrid(categoryIcons, options)
      };
      section.subsections!.push(subsection);
    }

    section.content = `The icon library provides a comprehensive set of symbols for the interface.

## Icon Guidelines
- **Size**: Icons are designed on a 24x24px grid
- **Stroke**: 2px stroke width for optimal clarity
- **Style**: Consistent line style across all icons
- **Usage**: Use icons to enhance usability, not as decoration

Total Icons: ${icons.length}`;

    this.documentation.sections.push(section);
  }

  /**
   * Document patterns
   */
  private async documentPatterns(options: DocumentationOptions): Promise<void> {
    const section: DocumentationSection = {
      title: 'Design Patterns',
      content: `Design patterns are reusable solutions to common design problems.

## Pattern Categories
1. **Layout Patterns**: Grid systems, page layouts, responsive behavior
2. **Navigation Patterns**: Menu systems, breadcrumbs, tabs
3. **Form Patterns**: Input groups, validation, multi-step forms
4. **Content Patterns**: Cards, lists, tables, media objects
5. **Feedback Patterns**: Notifications, loading states, empty states`,
      subsections: []
    };

    // Add common patterns
    const patterns = [
      {
        title: 'Card Layout',
        content: 'Cards are used to group related content and actions. They provide a consistent container for various types of information.'
      },
      {
        title: 'Form Validation',
        content: 'Form validation provides immediate feedback to users. Use inline validation for real-time feedback and summary validation for form submission.'
      },
      {
        title: 'Empty States',
        content: 'Empty states guide users when there is no content to display. They should be informative and provide clear actions.'
      },
      {
        title: 'Loading States',
        content: 'Loading states indicate that content is being fetched or processed. Use skeletons for layout stability and spinners for actions.'
      }
    ];

    for (const pattern of patterns) {
      section.subsections!.push({
        title: pattern.title,
        content: pattern.content
      });
    }

    this.documentation.sections.push(section);
  }

  /**
   * Document guidelines
   */
  private async documentGuidelines(options: DocumentationOptions): Promise<void> {
    const section: DocumentationSection = {
      title: 'Design Guidelines',
      content: '',
      subsections: [
        {
          title: 'Design Principles',
          content: `## Core Principles

### 1. Clarity
Every design decision should make the interface clearer and easier to understand.

### 2. Consistency
Maintain consistency in visual design, interaction patterns, and messaging.

### 3. Efficiency
Design for user efficiency, minimizing the steps required to complete tasks.

### 4. Accessibility
Ensure all users can access and use the interface regardless of abilities.

### 5. Delight
Add thoughtful details that make the experience enjoyable without compromising usability.`
        },
        {
          title: 'Voice & Tone',
          content: `## Writing Guidelines

### Voice Attributes
- **Clear**: Use simple, direct language
- **Friendly**: Be approachable and human
- **Professional**: Maintain credibility
- **Helpful**: Focus on user success

### Tone Variations
- **Success**: Celebratory but not excessive
- **Error**: Helpful and constructive
- **Empty State**: Encouraging and guiding
- **Onboarding**: Welcoming and informative`
        },
        {
          title: 'Responsive Design',
          content: `## Breakpoints

- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px - 1439px
- **Wide**: 1440px+

## Responsive Principles
1. **Mobile First**: Design for mobile, enhance for larger screens
2. **Flexible Grids**: Use percentage-based layouts
3. **Fluid Typography**: Scale text based on viewport
4. **Touch Targets**: Minimum 44x44px on mobile`
        }
      ]
    };

    this.documentation.sections.push(section);
  }

  /**
   * Document accessibility
   */
  private async documentAccessibility(options: DocumentationOptions): Promise<void> {
    const section: DocumentationSection = {
      title: 'Accessibility',
      content: `Accessibility ensures that all users can effectively use the product.

## WCAG Compliance
We follow WCAG 2.1 Level AA guidelines for all design decisions.`,
      subsections: [
        {
          title: 'Color Contrast',
          content: `## Contrast Requirements

### Text Contrast
- **Normal Text**: 4.5:1 minimum contrast ratio
- **Large Text**: 3:1 minimum contrast ratio (18pt+ or 14pt+ bold)
- **UI Components**: 3:1 minimum contrast ratio

### Testing Tools
- Use contrast checking tools during design
- Test with color blindness simulators
- Verify in grayscale mode`
        },
        {
          title: 'Keyboard Navigation',
          content: `## Keyboard Support

### Navigation Patterns
- **Tab**: Move forward through interactive elements
- **Shift+Tab**: Move backward through interactive elements
- **Arrow Keys**: Navigate within components (menus, lists)
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals and dismiss popups

### Focus Indicators
- Visible focus ring on all interactive elements
- 2px minimum focus ring width
- High contrast focus color`
        },
        {
          title: 'Screen Reader Support',
          content: `## Screen Reader Guidelines

### Semantic HTML
- Use proper heading hierarchy (h1-h6)
- Label all form inputs
- Provide alt text for images
- Use ARIA labels for icons

### Announcements
- Announce dynamic content changes
- Provide context for actions
- Include error messages in labels`
        },
        {
          title: 'Motion & Animation',
          content: `## Motion Accessibility

### Reduced Motion
- Respect prefers-reduced-motion setting
- Provide alternatives to motion-based interactions
- Keep essential animations under 5 seconds

### Safe Animation
- Avoid flashing content (3Hz or less)
- No auto-playing videos with sound
- Provide pause/stop controls for animations`
        }
      ]
    };

    this.documentation.sections.push(section);
  }

  /**
   * Generate final documentation
   */
  private async generateDocumentation(options: DocumentationOptions): Promise<string> {
    switch (options.format) {
      case 'html':
        return this.generateHTMLDocumentation();
      case 'pdf':
        return this.generatePDFDocumentation();
      case 'json':
        return this.generateJSONDocumentation();
      default:
        return this.generateMarkdownDocumentation();
    }
  }

  /**
   * Generate Markdown documentation
   */
  private generateMarkdownDocumentation(): string {
    let markdown = `# ${this.documentation.title}\n\n`;
    markdown += `Version: ${this.documentation.version}\n`;
    markdown += `Generated: ${new Date(this.documentation.date).toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;

    // Table of contents
    markdown += `## Table of Contents\n\n`;
    for (let i = 0; i < this.documentation.sections.length; i++) {
      const section = this.documentation.sections[i];
      markdown += `${i + 1}. [${section.title}](#${this.slugify(section.title)})\n`;
      
      if (section.subsections) {
        for (let j = 0; j < section.subsections.length; j++) {
          const subsection = section.subsections[j];
          markdown += `   ${i + 1}.${j + 1}. [${subsection.title}](#${this.slugify(subsection.title)})\n`;
        }
      }
    }
    markdown += `\n---\n\n`;

    // Content
    for (const section of this.documentation.sections) {
      markdown += `## ${section.title}\n\n`;
      markdown += section.content + '\n\n';

      if (section.subsections) {
        for (const subsection of section.subsections) {
          markdown += `### ${subsection.title}\n\n`;
          markdown += subsection.content + '\n\n';
        }
      }

      markdown += `---\n\n`;
    }

    return markdown;
  }

  /**
   * Generate HTML documentation
   */
  private generateHTMLDocumentation(): string {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.documentation.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1, h2, h3, h4 { margin-top: 2rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background-color: #f5f5f5; }
    code { background-color: #f5f5f5; padding: 0.125rem 0.25rem; border-radius: 3px; }
    pre { background-color: #f5f5f5; padding: 1rem; border-radius: 5px; overflow-x: auto; }
    .toc { background-color: #f9f9f9; padding: 1rem; border-radius: 5px; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>${this.documentation.title}</h1>
  <p>Version: ${this.documentation.version}<br>
  Generated: ${new Date(this.documentation.date).toLocaleDateString()}</p>
  
  <div class="toc">
    <h2>Table of Contents</h2>
    <ol>`;

    // Generate TOC
    for (const section of this.documentation.sections) {
      html += `<li><a href="#${this.slugify(section.title)}">${section.title}</a>`;
      
      if (section.subsections && section.subsections.length > 0) {
        html += '<ol>';
        for (const subsection of section.subsections) {
          html += `<li><a href="#${this.slugify(subsection.title)}">${subsection.title}</a></li>`;
        }
        html += '</ol>';
      }
      
      html += '</li>';
    }

    html += `
    </ol>
  </div>`;

    // Generate content
    for (const section of this.documentation.sections) {
      html += `<section id="${this.slugify(section.title)}">`;
      html += `<h2>${section.title}</h2>`;
      html += this.markdownToHTML(section.content);

      if (section.subsections) {
        for (const subsection of section.subsections) {
          html += `<section id="${this.slugify(subsection.title)}">`;
          html += `<h3>${subsection.title}</h3>`;
          html += this.markdownToHTML(subsection.content);
          html += '</section>';
        }
      }

      html += '</section>';
    }

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Generate PDF documentation (returns HTML for PDF conversion)
   */
  private generatePDFDocumentation(): string {
    // For PDF, we return HTML that's optimized for print
    return this.generateHTMLDocumentation();
  }

  /**
   * Generate JSON documentation
   */
  private generateJSONDocumentation(): string {
    return JSON.stringify(this.documentation, null, 2);
  }

  /**
   * Helper methods
   */
  private getCategoryFromName(name: string): string {
    const parts = name.split('/');
    return parts.length > 1 ? parts[0] : 'General';
  }

  private formatMetadata(metadata: Record<string, any>): string {
    let content = '';
    for (const [key, value] of Object.entries(metadata)) {
      content += `**${this.capitalize(key)}**: ${value}\n`;
    }
    return content;
  }

  private formatColorSection(colors: any[], options: DocumentationOptions): string {
    let content = '| Name | Value | Usage |\n';
    content += '|------|-------|-------|\n';

    for (const color of colors) {
      const value = this.getColorValue(color.paints[0]);
      const usage = color.description || 'General use';
      content += `| ${color.name} | ${value} | ${usage} |\n`;
    }

    return content;
  }

  private formatTypographySection(styles: any[], options: DocumentationOptions): string {
    let content = '| Style | Font | Size | Weight | Line Height |\n';
    content += '|-------|------|------|--------|-------------|\n';

    for (const style of styles) {
      const font = `${style.fontName.family}`;
      const weight = style.fontName.style;
      const lineHeight = style.lineHeight.unit === 'PERCENT' 
        ? `${(style.lineHeight.value / 100).toFixed(2)}` 
        : `${style.lineHeight.value}px`;
      
      content += `| ${style.name} | ${font} | ${style.fontSize}px | ${weight} | ${lineHeight} |\n`;
    }

    return content;
  }

  private formatSpacingTable(scale: any[]): string {
    let content = '| Token | Rem | Pixels | Usage |\n';
    content += '|-------|-----|--------|-------|\n';

    for (const space of scale) {
      const usage = this.getSpacingUsage(space.name);
      content += `| ${space.name} | ${space.value}rem | ${space.pixels} | ${usage} |\n`;
    }

    return content;
  }

  private formatComponentList(components: ComponentNode[], options: DocumentationOptions): string {
    let content = '| Component | Description | Last Updated |\n';
    content += '|-----------|-------------|-------------|\n';

    for (const component of components) {
      const description = component.description || 'No description';
      const updated = new Date().toLocaleDateString(); // In real impl, would track actual updates
      content += `| ${component.name} | ${description} | ${updated} |\n`;
    }

    return content;
  }

  private async formatIconGrid(icons: ComponentNode[], options: DocumentationOptions): Promise<string> {
    let content = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">\n';

    for (const icon of icons) {
      content += '<div style="text-align: center; padding: 1rem; border: 1px solid #eee; border-radius: 4px;">\n';
      
      if (options.includeScreenshots) {
        try {
          const asset = await this.captureComponentScreenshot(icon);
          if (asset) {
            this.documentation.assets.push(asset);
            content += `<img src="asset://${asset.id}" alt="${icon.name}" style="width: 24px; height: 24px; margin-bottom: 0.5rem;">\n`;
          }
        } catch (error) {
          logger.warn('Failed to capture icon screenshot', error);
        }
      }
      
      content += `<div style="font-size: 0.75rem;">${icon.name.replace(/^icon[/-]/i, '')}</div>\n`;
      content += '</div>\n';
    }

    content += '</div>';
    return content;
  }

  private generateComponentCodeExample(componentSet: ComponentSetNode): string {
    const props = componentSet.componentPropertyDefinitions || {};
    const componentName = this.toPascalCase(componentSet.name);

    let code = '```jsx\n';
    code += `import { ${componentName} } from '@/components/${componentName}';\n\n`;
    code += `function Example() {\n`;
    code += `  return (\n`;
    code += `    <${componentName}\n`;

    for (const [propName, propDef] of Object.entries(props)) {
      const propNameCamel = this.toCamelCase(propName);
      if (propDef.type === 'BOOLEAN') {
        code += `      ${propNameCamel}={true}\n`;
      } else if (propDef.type === 'TEXT') {
        code += `      ${propNameCamel}="Example text"\n`;
      } else if (propDef.type === 'VARIANT') {
        code += `      ${propNameCamel}="${propDef.defaultValue || propDef.variantOptions?.[0] || 'default'}"\n`;
      }
    }

    code += `    />\n`;
    code += `  );\n`;
    code += `}\n`;
    code += '```';

    return code;
  }

  private async captureComponentScreenshot(node: ComponentNode): Promise<DocumentationAsset | null> {
    try {
      const bytes = await node.exportAsync({
        format: 'PNG',
        scale: 2,
        constraint: { type: 'SCALE', value: 2 }
      });

      const base64 = this.uint8ArrayToBase64(bytes);
      
      return {
        id: `asset-${node.id}`,
        type: 'component',
        name: node.name,
        data: `data:image/png;base64,${base64}`
      };
    } catch (error) {
      logger.error('Failed to export component screenshot', error);
      return null;
    }
  }

  private getIconCategory(iconName: string): string {
    const name = iconName.toLowerCase();
    
    if (name.includes('arrow') || name.includes('chevron')) return 'Navigation';
    if (name.includes('social') || name.includes('brand')) return 'Social';
    if (name.includes('file') || name.includes('document')) return 'Files';
    if (name.includes('user') || name.includes('person')) return 'Users';
    if (name.includes('alert') || name.includes('warning') || name.includes('error')) return 'Alerts';
    if (name.includes('edit') || name.includes('pencil')) return 'Editing';
    if (name.includes('setting') || name.includes('gear')) return 'Settings';
    
    return 'General';
  }

  private getSpacingUsage(spacingName: string): string {
    const value = parseInt(spacingName.replace('spacing-', ''));
    
    if (value === 0) return 'No spacing';
    if (value <= 2) return 'Tight spacing, inline elements';
    if (value <= 4) return 'Default spacing, buttons, inputs';
    if (value <= 8) return 'Section spacing, cards';
    if (value <= 16) return 'Page sections';
    
    return 'Large sections, page level';
  }

  private getColorValue(paint: Paint): string {
    if (paint.type === 'SOLID') {
      const { r, g, b } = paint.color;
      const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    return 'Complex fill';
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[\s-_/]+/)
      .map(word => this.capitalize(word))
      .join('');
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private markdownToHTML(markdown: string): string {
    // Simple markdown to HTML conversion
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2>$1</h2>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Lists
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Clean up
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    
    return html;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Export singleton instance
export const designDocumentationExporter = new DesignDocumentationExporter();

// Export main function
export async function exportDesignDocumentation(options: DocumentationOptions = {}): Promise<void> {
  return designDocumentationExporter.export(options);
}