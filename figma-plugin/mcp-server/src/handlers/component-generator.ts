import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

export interface ComponentData {
  name: string;
  type: string;
  properties: any;
}

export interface GenerationOptions {
  platform: 'universal' | 'react-native' | 'web';
  useNativeWind: boolean;
  includeTypes: boolean;
  includeProps?: boolean;
  includeAnimations?: boolean;
  aiPrompt?: string;
}

export class ComponentGenerator {
  /**
   * Generate component code from Figma component data
   */
  async generateComponent(componentData: ComponentData, options: GenerationOptions): Promise<string> {
    // Analyze existing component patterns
    const patterns = await this.analyzeExistingPatterns();
    
    // Generate base component structure
    let componentCode = this.generateBaseComponent(componentData, options, patterns);
    
    // If AI prompt is provided, enhance the component
    if (options.aiPrompt) {
      componentCode = await this.enhanceWithAI(componentCode, options.aiPrompt);
    }
    
    return componentCode;
  }

  /**
   * Analyze existing component patterns in the codebase
   */
  private async analyzeExistingPatterns() {
    const patterns = {
      imports: new Set<string>(),
      hooks: new Set<string>(),
      propPatterns: [] as string[],
      stylePatterns: [] as string[],
    };

    try {
      // Find all component files
      const componentFiles = glob.sync('components/**/*.tsx', {
        ignore: ['**/*.test.tsx', '**/*.stories.tsx'],
      });

      // Analyze a few representative components
      const samplesToAnalyze = componentFiles.slice(0, 5);
      
      for (const file of samplesToAnalyze) {
        const content = readFileSync(file, 'utf-8');
        
        // Extract common imports
        const importMatches = content.matchAll(/import .+ from ['"](.+)['"]/g);
        for (const match of importMatches) {
          patterns.imports.add(match[1]);
        }
        
        // Extract common hooks
        const hookMatches = content.matchAll(/use[A-Z]\w+/g);
        for (const match of hookMatches) {
          patterns.hooks.add(match[0]);
        }
        
        // Extract prop patterns
        const propMatches = content.match(/interface \w+Props \{[\s\S]+?\}/);
        if (propMatches) {
          patterns.propPatterns.push(propMatches[0]);
        }
      }
    } catch (error) {
      console.error('Error analyzing patterns:', error);
    }

    return patterns;
  }

  /**
   * Generate base component code
   */
  private generateBaseComponent(
    componentData: ComponentData,
    options: GenerationOptions,
    patterns: any
  ): string {
    const componentName = this.sanitizeComponentName(componentData.name);
    const isUniversal = options.platform === 'universal';
    
    let code = '';

    // Imports
    code += this.generateImports(componentData, options, patterns);
    code += '\n\n';

    // Types
    if (options.includeTypes) {
      code += this.generateTypes(componentName, componentData, options);
      code += '\n\n';
    }

    // Component
    code += this.generateComponentFunction(componentName, componentData, options);

    return code;
  }

  /**
   * Generate imports based on component needs
   */
  private generateImports(
    componentData: ComponentData,
    options: GenerationOptions,
    patterns: any
  ): string {
    const imports: string[] = [];

    // React imports
    imports.push("import React from 'react';");

    // React Native imports
    if (options.platform !== 'web') {
      const rnImports = ['View', 'Text'];
      
      if (componentData.type === 'COMPONENT' || componentData.type === 'INSTANCE') {
        rnImports.push('TouchableOpacity');
      }
      
      imports.push(`import { ${rnImports.join(', ')} } from 'react-native';`);
    }

    // Animation imports
    if (options.includeAnimations) {
      imports.push("import Animated from 'react-native-reanimated';");
      imports.push("import { useAnimationVariant } from '@/hooks/useAnimationVariant';");
    }

    // Spacing and theme imports
    imports.push("import { useSpacing } from '@/hooks/core/useSpacing';");
    imports.push("import { useTheme } from '@/lib/theme';");

    // NativeWind
    if (options.useNativeWind) {
      imports.push("import { styled } from 'nativewind';");
    }

    return imports.join('\n');
  }

  /**
   * Generate TypeScript types
   */
  private generateTypes(
    componentName: string,
    componentData: ComponentData,
    options: GenerationOptions
  ): string {
    let types = `interface ${componentName}Props {\n`;

    // Standard props
    if (options.includeProps) {
      types += `  variant?: 'default' | 'primary' | 'secondary' | 'ghost';\n`;
      types += `  size?: 'sm' | 'md' | 'lg';\n`;
      types += `  disabled?: boolean;\n`;
      types += `  loading?: boolean;\n`;
    }

    // Event handlers
    types += `  onPress?: () => void;\n`;

    // Children and style
    types += `  children?: React.ReactNode;\n`;
    types += `  className?: string;\n`;
    types += `  style?: any;\n`;

    types += `}`;

    return types;
  }

  /**
   * Generate the main component function
   */
  private generateComponentFunction(
    componentName: string,
    componentData: ComponentData,
    options: GenerationOptions
  ): string {
    let code = '';

    code += `export function ${componentName}({\n`;
    code += `  variant = 'default',\n`;
    code += `  size = 'md',\n`;
    code += `  disabled = false,\n`;
    code += `  loading = false,\n`;
    code += `  onPress,\n`;
    code += `  children,\n`;
    code += `  className,\n`;
    code += `  style,\n`;
    code += `}: ${componentName}Props) {\n`;

    // Hooks
    code += `  const spacing = useSpacing();\n`;
    code += `  const theme = useTheme();\n`;

    if (options.includeAnimations) {
      code += `  const { animate } = useAnimationVariant('subtle');\n`;
    }

    code += '\n';

    // Render logic
    if (componentData.type === 'TEXT') {
      code += this.generateTextComponent(componentData, options);
    } else if (componentData.type === 'COMPONENT' || componentData.type === 'INSTANCE') {
      code += this.generateContainerComponent(componentData, options);
    } else {
      code += this.generateDefaultComponent(componentData, options);
    }

    code += `}\n`;

    return code;
  }

  /**
   * Generate text component
   */
  private generateTextComponent(componentData: ComponentData, options: GenerationOptions): string {
    let code = `  return (\n`;
    code += `    <Text\n`;
    
    if (options.useNativeWind) {
      code += `      className={\`text-\${size} \${className || ''}\`}\n`;
    }
    
    code += `      style={[style]}\n`;
    code += `    >\n`;
    code += `      {children || '${componentData.name}'}\n`;
    code += `    </Text>\n`;
    code += `  );\n`;

    return code;
  }

  /**
   * Generate container component
   */
  private generateContainerComponent(componentData: ComponentData, options: GenerationOptions): string {
    const isInteractive = componentData.properties.onPress !== undefined;
    const Container = isInteractive ? 'TouchableOpacity' : 'View';

    let code = `  return (\n`;
    code += `    <${Container}\n`;
    
    if (options.useNativeWind) {
      code += `      className={\`\${variant} \${size} \${disabled ? 'opacity-50' : ''} \${className || ''}\`}\n`;
    }
    
    if (isInteractive) {
      code += `      onPress={disabled || loading ? undefined : onPress}\n`;
      code += `      activeOpacity={0.8}\n`;
    }
    
    code += `      style={[\n`;
    code += `        {\n`;
    
    // Add extracted styles from Figma
    if (componentData.properties.size) {
      code += `          width: ${componentData.properties.size.width},\n`;
      code += `          height: ${componentData.properties.size.height},\n`;
    }
    
    code += `        },\n`;
    code += `        style,\n`;
    code += `      ]}\n`;
    code += `    >\n`;
    
    if (isInteractive && componentData.properties.loading) {
      code += `      {loading ? (\n`;
      code += `        <ActivityIndicator color={theme.colors.primary} />\n`;
      code += `      ) : (\n`;
      code += `        children\n`;
      code += `      )}\n`;
    } else {
      code += `      {children}\n`;
    }
    
    code += `    </${Container}>\n`;
    code += `  );\n`;

    return code;
  }

  /**
   * Generate default component
   */
  private generateDefaultComponent(componentData: ComponentData, options: GenerationOptions): string {
    let code = `  return (\n`;
    code += `    <View\n`;
    
    if (options.useNativeWind) {
      code += `      className={className}\n`;
    }
    
    code += `      style={[style]}\n`;
    code += `    >\n`;
    code += `      {children}\n`;
    code += `    </View>\n`;
    code += `  );\n`;

    return code;
  }

  /**
   * Enhance component with AI suggestions
   */
  private async enhanceWithAI(componentCode: string, prompt: string): Promise<string> {
    // This would integrate with Claude AI to enhance the component
    // For now, we'll add a comment indicating where AI enhancement would occur
    
    const enhancedCode = `// AI Enhancement: ${prompt}\n` + componentCode;
    
    return enhancedCode;
  }

  /**
   * Sanitize component name
   */
  private sanitizeComponentName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, '_')
      .replace(/^./, char => char.toUpperCase());
  }
}