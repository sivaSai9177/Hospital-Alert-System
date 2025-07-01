/**
 * Component Library Generator
 * Generates a comprehensive component library from Figma designs
 */

import { operationQueue } from '../../lib/operation-queue';
import { syncStateManager } from '../../lib/sync-state-manager';
import { figmaLogger, logger } from '../../lib/figma-logger';
import { MessageType } from '../../types/messages';
import { extractComponents } from '../../extractors/component-extractor';
import { generateCodeFromTokens } from './code-generator';

interface ComponentLibraryOptions {
  includeVariants?: boolean;
  includeStates?: boolean;
  includeResponsive?: boolean;
  includeAnimations?: boolean;
  includeDocumentation?: boolean;
  targetFramework?: 'react' | 'react-native' | 'vue' | 'angular';
  styleSystem?: 'tailwind' | 'styled-components' | 'css-modules' | 'nativewind';
  outputFormat?: 'typescript' | 'javascript';
  componentPrefix?: string;
  generateStorybook?: boolean;
  generateTests?: boolean;
}

interface ComponentDefinition {
  id: string;
  name: string;
  type: string;
  description?: string;
  props: ComponentProp[];
  variants: ComponentVariant[];
  states: ComponentState[];
  dependencies: string[];
  code?: GeneratedCode;
}

interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

interface ComponentVariant {
  name: string;
  props: Record<string, any>;
  description?: string;
}

interface ComponentState {
  name: string;
  props: Record<string, any>;
  description?: string;
}

interface GeneratedCode {
  component: string;
  styles: string;
  types?: string;
  story?: string;
  test?: string;
  documentation?: string;
}

/**
 * Component Library Generator Class
 */
export class ComponentLibraryGenerator {
  private operationId?: string;
  private components: Map<string, ComponentDefinition> = new Map();

  /**
   * Generate component library
   */
  async generate(options: ComponentLibraryOptions = {}): Promise<void> {
    const operation = await operationQueue.addOperation(
      'component-library-generation',
      async () => this.performGeneration(options),
      {
        priority: 'high',
        data: { options }
      }
    );

    this.operationId = operation;
  }

  /**
   * Perform the generation
   */
  private async performGeneration(options: ComponentLibraryOptions): Promise<void> {
    try {
      logger.component.info('Starting component library generation', { options });

      // Step 1: Find component sets
      figmaLogger.updateProgress(this.operationId!, 10, 'Finding component sets...');
      const componentSets = await this.findComponentSets();

      if (componentSets.length === 0) {
        throw new Error('No component sets found. Please create components first.');
      }

      // Step 2: Extract component definitions
      figmaLogger.updateProgress(this.operationId!, 30, 'Extracting component definitions...');
      await this.extractComponentDefinitions(componentSets, options);

      // Step 3: Generate component code
      figmaLogger.updateProgress(this.operationId!, 50, 'Generating component code...');
      await this.generateComponentCode(options);

      // Step 4: Create component library structure
      figmaLogger.updateProgress(this.operationId!, 70, 'Creating library structure...');
      await this.createLibraryStructure(options);

      // Step 5: Generate documentation
      if (options.includeDocumentation) {
        figmaLogger.updateProgress(this.operationId!, 85, 'Generating documentation...');
        await this.generateDocumentation(options);
      }

      // Step 6: Create library page in Figma
      figmaLogger.updateProgress(this.operationId!, 95, 'Creating library page...');
      await this.createLibraryPage(options);

      // Send results to UI
      figma.ui.postMessage({
        type: MessageType.COMPONENT_LIBRARY_GENERATED,
        data: {
          components: Array.from(this.components.values()),
          options
        }
      });

      logger.component.success('Component library generated successfully', {
        componentCount: this.components.size
      });
    } catch (error) {
      logger.component.error('Component library generation failed', error);
      throw error;
    }
  }

  /**
   * Find all component sets in the document
   */
  private async findComponentSets(): Promise<ComponentSetNode[]> {
    const componentSets: ComponentSetNode[] = [];

    function traverse(node: SceneNode) {
      if (node.type === 'COMPONENT_SET') {
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

    return componentSets;
  }

  /**
   * Extract component definitions from component sets
   */
  private async extractComponentDefinitions(
    componentSets: ComponentSetNode[],
    options: ComponentLibraryOptions
  ): Promise<void> {
    for (const componentSet of componentSets) {
      const definition = await this.extractComponentDefinition(componentSet, options);
      this.components.set(definition.id, definition);
    }
  }

  /**
   * Extract single component definition
   */
  private async extractComponentDefinition(
    componentSet: ComponentSetNode,
    options: ComponentLibraryOptions
  ): Promise<ComponentDefinition> {
    const definition: ComponentDefinition = {
      id: componentSet.id,
      name: this.formatComponentName(componentSet.name, options.componentPrefix),
      type: 'component',
      description: componentSet.description,
      props: [],
      variants: [],
      states: [],
      dependencies: []
    };

    // Extract props from component properties
    if (componentSet.componentPropertyDefinitions) {
      for (const [propName, propDef] of Object.entries(componentSet.componentPropertyDefinitions)) {
        definition.props.push({
          name: this.formatPropName(propName),
          type: this.getPropertyType(propDef),
          required: false,
          defaultValue: propDef.defaultValue,
          description: `${propDef.type} property`
        });
      }
    }

    // Extract variants
    if (options.includeVariants) {
      definition.variants = await this.extractVariants(componentSet);
    }

    // Extract states
    if (options.includeStates) {
      definition.states = await this.extractStates(componentSet);
    }

    // Extract dependencies
    definition.dependencies = await this.extractDependencies(componentSet);

    return definition;
  }

  /**
   * Extract component variants
   */
  private async extractVariants(componentSet: ComponentSetNode): Promise<ComponentVariant[]> {
    const variants: ComponentVariant[] = [];

    for (const variant of componentSet.children) {
      if (variant.type === 'COMPONENT') {
        const variantProps: Record<string, any> = {};
        
        // Extract variant properties
        if (variant.name.includes('=')) {
          const pairs = variant.name.split(', ');
          for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key && value) {
              variantProps[this.formatPropName(key)] = value;
            }
          }
        }

        variants.push({
          name: variant.name,
          props: variantProps,
          description: variant.description
        });
      }
    }

    return variants;
  }

  /**
   * Extract component states
   */
  private async extractStates(componentSet: ComponentSetNode): Promise<ComponentState[]> {
    const states: ComponentState[] = [];

    // Look for interactive states
    for (const variant of componentSet.children) {
      if (variant.type === 'COMPONENT') {
        const reactions = variant.reactions || [];
        
        for (const reaction of reactions) {
          if (reaction.trigger?.type === 'ON_HOVER') {
            states.push({
              name: 'hover',
              props: { isHovered: true },
              description: 'Hover state'
            });
          }
          
          if (reaction.trigger?.type === 'ON_PRESS') {
            states.push({
              name: 'pressed',
              props: { isPressed: true },
              description: 'Pressed state'
            });
          }
        }
      }
    }

    // Deduplicate states
    const uniqueStates = Array.from(
      new Map(states.map(s => [s.name, s])).values()
    );

    return uniqueStates;
  }

  /**
   * Extract component dependencies
   */
  private async extractDependencies(componentSet: ComponentSetNode): Promise<string[]> {
    const dependencies = new Set<string>();

    function traverse(node: SceneNode) {
      if (node.type === 'INSTANCE') {
        const mainComponent = node.mainComponent;
        if (mainComponent && mainComponent.parent?.type === 'COMPONENT_SET') {
          dependencies.add(mainComponent.parent.name);
        }
      }

      if ('children' in node) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }

    for (const variant of componentSet.children) {
      traverse(variant);
    }

    return Array.from(dependencies);
  }

  /**
   * Generate component code
   */
  private async generateComponentCode(options: ComponentLibraryOptions): Promise<void> {
    for (const [id, definition] of this.components) {
      const code = await this.generateSingleComponentCode(definition, options);
      definition.code = code;
    }
  }

  /**
   * Generate code for a single component
   */
  private async generateSingleComponentCode(
    definition: ComponentDefinition,
    options: ComponentLibraryOptions
  ): Promise<GeneratedCode> {
    const code: GeneratedCode = {
      component: '',
      styles: ''
    };

    // Generate component code based on framework
    switch (options.targetFramework) {
      case 'react':
        code.component = this.generateReactComponent(definition, options);
        break;
      case 'react-native':
        code.component = this.generateReactNativeComponent(definition, options);
        break;
      case 'vue':
        code.component = this.generateVueComponent(definition, options);
        break;
      case 'angular':
        code.component = this.generateAngularComponent(definition, options);
        break;
      default:
        code.component = this.generateReactComponent(definition, options);
    }

    // Generate styles based on style system
    switch (options.styleSystem) {
      case 'tailwind':
      case 'nativewind':
        code.styles = this.generateTailwindStyles(definition);
        break;
      case 'styled-components':
        code.styles = this.generateStyledComponentsStyles(definition);
        break;
      case 'css-modules':
        code.styles = this.generateCSSModulesStyles(definition);
        break;
    }

    // Generate TypeScript types if needed
    if (options.outputFormat === 'typescript') {
      code.types = this.generateTypeScriptTypes(definition);
    }

    // Generate Storybook story if needed
    if (options.generateStorybook) {
      code.story = this.generateStorybookStory(definition, options);
    }

    // Generate tests if needed
    if (options.generateTests) {
      code.test = this.generateComponentTest(definition, options);
    }

    // Generate documentation
    if (options.includeDocumentation) {
      code.documentation = this.generateComponentDocumentation(definition);
    }

    return code;
  }

  /**
   * Generate React component
   */
  private generateReactComponent(
    definition: ComponentDefinition,
    options: ComponentLibraryOptions
  ): string {
    const { name, props, variants, states } = definition;
    const isTypeScript = options.outputFormat === 'typescript';

    let code = `import React from 'react';\n`;
    
    if (options.styleSystem === 'styled-components') {
      code += `import styled from 'styled-components';\n`;
    } else if (options.styleSystem === 'css-modules') {
      code += `import styles from './${name}.module.css';\n`;
    }

    code += `\n`;

    // Add TypeScript interface
    if (isTypeScript) {
      code += `interface ${name}Props {\n`;
      for (const prop of props) {
        code += `  ${prop.name}${prop.required ? '' : '?'}: ${prop.type};\n`;
      }
      code += `}\n\n`;
    }

    // Component definition
    code += `export const ${name}${isTypeScript ? `: React.FC<${name}Props>` : ''} = ({\n`;
    for (const prop of props) {
      code += `  ${prop.name}${prop.defaultValue ? ` = ${JSON.stringify(prop.defaultValue)}` : ''},\n`;
    }
    code += `}) => {\n`;

    // Add state hooks if needed
    if (states.length > 0) {
      for (const state of states) {
        code += `  const [${state.name}, set${this.capitalize(state.name)}] = React.useState(false);\n`;
      }
      code += `\n`;
    }

    // Render method
    code += `  return (\n`;
    code += `    <div className="${options.styleSystem === 'tailwind' ? 'component' : 'styles.component'}">\n`;
    code += `      {/* Component implementation */}\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generate React Native component
   */
  private generateReactNativeComponent(
    definition: ComponentDefinition,
    options: ComponentLibraryOptions
  ): string {
    const { name, props } = definition;
    const isTypeScript = options.outputFormat === 'typescript';

    let code = `import React from 'react';\n`;
    code += `import { View, Text, Pressable } from 'react-native';\n`;
    
    if (options.styleSystem === 'nativewind') {
      code += `import { styled } from 'nativewind';\n`;
    }

    code += `\n`;

    // Add TypeScript interface
    if (isTypeScript) {
      code += `interface ${name}Props {\n`;
      for (const prop of props) {
        code += `  ${prop.name}${prop.required ? '' : '?'}: ${prop.type};\n`;
      }
      code += `}\n\n`;
    }

    // Component definition
    code += `export const ${name}${isTypeScript ? `: React.FC<${name}Props>` : ''} = ({\n`;
    for (const prop of props) {
      code += `  ${prop.name}${prop.defaultValue ? ` = ${JSON.stringify(prop.defaultValue)}` : ''},\n`;
    }
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    <View${options.styleSystem === 'nativewind' ? ' className="flex-1"' : ''}>\n`;
    code += `      <Text>${name} Component</Text>\n`;
    code += `    </View>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generate Vue component
   */
  private generateVueComponent(
    definition: ComponentDefinition,
    options: ComponentLibraryOptions
  ): string {
    const { name, props } = definition;

    let code = `<template>\n`;
    code += `  <div class="component">\n`;
    code += `    <!-- Component implementation -->\n`;
    code += `  </div>\n`;
    code += `</template>\n\n`;

    code += `<script${options.outputFormat === 'typescript' ? ' lang="ts"' : ''}>\n`;
    code += `export default {\n`;
    code += `  name: '${name}',\n`;
    code += `  props: {\n`;
    
    for (const prop of props) {
      code += `    ${prop.name}: {\n`;
      code += `      type: ${this.getVuePropType(prop.type)},\n`;
      code += `      required: ${prop.required},\n`;
      if (prop.defaultValue !== undefined) {
        code += `      default: ${JSON.stringify(prop.defaultValue)},\n`;
      }
      code += `    },\n`;
    }
    
    code += `  },\n`;
    code += `};\n`;
    code += `</script>\n`;

    if (options.styleSystem === 'css-modules') {
      code += `\n<style module>\n`;
      code += `.component {\n`;
      code += `  /* Component styles */\n`;
      code += `}\n`;
      code += `</style>\n`;
    }

    return code;
  }

  /**
   * Generate Angular component
   */
  private generateAngularComponent(
    definition: ComponentDefinition,
    options: ComponentLibraryOptions
  ): string {
    const { name, props } = definition;

    let code = `import { Component, Input } from '@angular/core';\n\n`;
    
    code += `@Component({\n`;
    code += `  selector: 'app-${this.kebabCase(name)}',\n`;
    code += `  templateUrl: './${this.kebabCase(name)}.component.html',\n`;
    code += `  styleUrls: ['./${this.kebabCase(name)}.component.css']\n`;
    code += `})\n`;
    code += `export class ${name}Component {\n`;
    
    for (const prop of props) {
      code += `  @Input() ${prop.name}${prop.required ? '!' : '?'}: ${this.getAngularType(prop.type)}`;
      if (prop.defaultValue !== undefined) {
        code += ` = ${JSON.stringify(prop.defaultValue)}`;
      }
      code += `;\n`;
    }
    
    code += `}\n`;

    return code;
  }

  /**
   * Generate Tailwind styles
   */
  private generateTailwindStyles(definition: ComponentDefinition): string {
    return `/* Tailwind classes are applied inline in the component */`;
  }

  /**
   * Generate Styled Components styles
   */
  private generateStyledComponentsStyles(definition: ComponentDefinition): string {
    const { name } = definition;
    
    let styles = `const Styled${name} = styled.div\`\n`;
    styles += `  /* Component styles */\n`;
    styles += `  display: flex;\n`;
    styles += `  align-items: center;\n`;
    styles += `  justify-content: center;\n`;
    styles += `\`;\n`;

    return styles;
  }

  /**
   * Generate CSS Modules styles
   */
  private generateCSSModulesStyles(definition: ComponentDefinition): string {
    let styles = `.component {\n`;
    styles += `  /* Component styles */\n`;
    styles += `  display: flex;\n`;
    styles += `  align-items: center;\n`;
    styles += `  justify-content: center;\n`;
    styles += `}\n`;

    return styles;
  }

  /**
   * Generate TypeScript types
   */
  private generateTypeScriptTypes(definition: ComponentDefinition): string {
    const { name, props } = definition;
    
    let types = `export interface ${name}Props {\n`;
    for (const prop of props) {
      types += `  ${prop.name}${prop.required ? '' : '?'}: ${prop.type};\n`;
    }
    types += `}\n`;

    return types;
  }

  /**
   * Generate Storybook story
   */
  private generateStorybookStory(
    definition: ComponentDefinition,
    options: ComponentLibraryOptions
  ): string {
    const { name, props } = definition;
    
    let story = `import type { Meta, StoryObj } from '@storybook/react';\n`;
    story += `import { ${name} } from './${name}';\n\n`;
    
    story += `const meta: Meta<typeof ${name}> = {\n`;
    story += `  title: 'Components/${name}',\n`;
    story += `  component: ${name},\n`;
    story += `  parameters: {\n`;
    story += `    layout: 'centered',\n`;
    story += `  },\n`;
    story += `  tags: ['autodocs'],\n`;
    story += `};\n\n`;
    
    story += `export default meta;\n`;
    story += `type Story = StoryObj<typeof meta>;\n\n`;
    
    story += `export const Default: Story = {\n`;
    story += `  args: {\n`;
    for (const prop of props) {
      if (prop.defaultValue !== undefined) {
        story += `    ${prop.name}: ${JSON.stringify(prop.defaultValue)},\n`;
      }
    }
    story += `  },\n`;
    story += `};\n`;

    return story;
  }

  /**
   * Generate component test
   */
  private generateComponentTest(
    definition: ComponentDefinition,
    options: ComponentLibraryOptions
  ): string {
    const { name } = definition;
    
    let test = `import { render, screen } from '@testing-library/react';\n`;
    test += `import { ${name} } from './${name}';\n\n`;
    
    test += `describe('${name}', () => {\n`;
    test += `  it('renders correctly', () => {\n`;
    test += `    render(<${name} />);\n`;
    test += `    expect(screen.getByRole('${this.getAriaRole(definition)}')).toBeInTheDocument();\n`;
    test += `  });\n`;
    test += `});\n`;

    return test;
  }

  /**
   * Generate component documentation
   */
  private generateComponentDocumentation(definition: ComponentDefinition): string {
    const { name, description, props, variants, states } = definition;
    
    let docs = `# ${name}\n\n`;
    
    if (description) {
      docs += `${description}\n\n`;
    }
    
    docs += `## Props\n\n`;
    docs += `| Prop | Type | Required | Default | Description |\n`;
    docs += `|------|------|----------|---------|-------------|\n`;
    
    for (const prop of props) {
      docs += `| ${prop.name} | ${prop.type} | ${prop.required ? 'Yes' : 'No'} | ${prop.defaultValue || '-'} | ${prop.description || '-'} |\n`;
    }
    
    if (variants.length > 0) {
      docs += `\n## Variants\n\n`;
      for (const variant of variants) {
        docs += `- **${variant.name}**: ${variant.description || 'No description'}\n`;
      }
    }
    
    if (states.length > 0) {
      docs += `\n## States\n\n`;
      for (const state of states) {
        docs += `- **${state.name}**: ${state.description || 'No description'}\n`;
      }
    }

    return docs;
  }

  /**
   * Create library structure
   */
  private async createLibraryStructure(options: ComponentLibraryOptions): Promise<void> {
    // This would integrate with the file system in a real implementation
    // For now, we'll just organize the generated code
    logger.component.info('Library structure created', {
      componentCount: this.components.size,
      framework: options.targetFramework,
      styleSystem: options.styleSystem
    });
  }

  /**
   * Generate documentation
   */
  private async generateDocumentation(options: ComponentLibraryOptions): Promise<void> {
    let mainDocs = `# Component Library\n\n`;
    mainDocs += `Generated from Figma designs on ${new Date().toLocaleDateString()}\n\n`;
    mainDocs += `## Components\n\n`;

    for (const [id, definition] of this.components) {
      mainDocs += `- [${definition.name}](#${definition.name.toLowerCase()})\n`;
    }

    mainDocs += `\n---\n\n`;

    for (const [id, definition] of this.components) {
      if (definition.code?.documentation) {
        mainDocs += definition.code.documentation + '\n\n---\n\n';
      }
    }

    logger.component.info('Documentation generated', {
      componentCount: this.components.size
    });
  }

  /**
   * Create library page in Figma
   */
  private async createLibraryPage(options: ComponentLibraryOptions): Promise<void> {
    const page = figma.createPage();
    page.name = '📚 Component Library';

    // Create header
    const header = figma.createText();
    header.characters = 'Component Library';
    header.fontSize = 48;
    header.fontName = { family: 'Inter', style: 'Bold' };
    header.x = 100;
    header.y = 100;

    page.appendChild(header);

    // Create component showcase
    let yOffset = 300;
    const xOffset = 100;
    const spacing = 400;

    for (const [id, definition] of this.components) {
      // Create section header
      const sectionHeader = figma.createText();
      sectionHeader.characters = definition.name;
      sectionHeader.fontSize = 24;
      sectionHeader.fontName = { family: 'Inter', style: 'Semi Bold' };
      sectionHeader.x = xOffset;
      sectionHeader.y = yOffset;

      page.appendChild(sectionHeader);

      // Add description if available
      if (definition.description) {
        const description = figma.createText();
        description.characters = definition.description;
        description.fontSize = 14;
        description.fontName = { family: 'Inter', style: 'Regular' };
        description.x = xOffset;
        description.y = yOffset + 40;
        description.resize(600, 100);

        page.appendChild(description);
      }

      // Add code preview
      if (definition.code?.component) {
        const codeFrame = figma.createFrame();
        codeFrame.name = `${definition.name} Code`;
        codeFrame.x = xOffset;
        codeFrame.y = yOffset + 100;
        codeFrame.resize(800, 300);
        codeFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
        codeFrame.cornerRadius = 8;

        const codeText = figma.createText();
        codeText.characters = definition.code.component.substring(0, 500) + '...';
        codeText.fontSize = 12;
        codeText.fontName = { family: 'Roboto Mono', style: 'Regular' };
        codeText.x = 20;
        codeText.y = 20;
        codeText.resize(760, 260);

        codeFrame.appendChild(codeText);
        page.appendChild(codeFrame);
      }

      yOffset += spacing;
    }

    // Switch to the new page
    figma.currentPage = page;

    logger.component.success('Component library page created');
  }

  /**
   * Helper methods
   */
  private formatComponentName(name: string, prefix?: string): string {
    const formatted = name
      .split(/[\s-_]/g)
      .map(word => this.capitalize(word))
      .join('');
    
    return prefix ? `${prefix}${formatted}` : formatted;
  }

  private formatPropName(name: string): string {
    return name
      .split(/[\s-_]/g)
      .map((word, index) => 
        index === 0 ? word.toLowerCase() : this.capitalize(word)
      )
      .join('');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  private getPropertyType(propDef: any): string {
    switch (propDef.type) {
      case 'BOOLEAN':
        return 'boolean';
      case 'TEXT':
        return 'string';
      case 'INSTANCE_SWAP':
        return 'React.ReactNode';
      case 'VARIANT':
        return 'string';
      default:
        return 'any';
    }
  }

  private getVuePropType(type: string): string {
    switch (type) {
      case 'boolean':
        return 'Boolean';
      case 'string':
        return 'String';
      case 'number':
        return 'Number';
      case 'React.ReactNode':
        return 'Object';
      default:
        return 'Object';
    }
  }

  private getAngularType(type: string): string {
    switch (type) {
      case 'React.ReactNode':
        return 'any';
      default:
        return type;
    }
  }

  private getAriaRole(definition: ComponentDefinition): string {
    const name = definition.name.toLowerCase();
    
    if (name.includes('button')) return 'button';
    if (name.includes('link')) return 'link';
    if (name.includes('input')) return 'textbox';
    if (name.includes('checkbox')) return 'checkbox';
    if (name.includes('radio')) return 'radio';
    if (name.includes('select')) return 'combobox';
    if (name.includes('menu')) return 'menu';
    if (name.includes('tab')) return 'tab';
    if (name.includes('dialog') || name.includes('modal')) return 'dialog';
    
    return 'region';
  }
}

// Export singleton instance
export const componentLibraryGenerator = new ComponentLibraryGenerator();

// Export main function
export async function generateComponentLibrary(options: ComponentLibraryOptions = {}): Promise<void> {
  return componentLibraryGenerator.generate(options);
}