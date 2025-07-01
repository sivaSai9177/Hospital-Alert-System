import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { DesignTokens, ColorToken, TypographyToken, SpacingToken, ShadowToken } from '../../../shared/types/design-tokens.js';

export class DesignSystemParser {
  /**
   * Extract design tokens from the codebase
   */
  async extractTokensFromCode(projectPath: string): Promise<DesignTokens> {
    const tokens: DesignTokens = {
      colors: await this.extractColorTokens(projectPath),
      typography: await this.extractTypographyTokens(projectPath),
      spacing: await this.extractSpacingTokens(projectPath),
      shadows: await this.extractShadowTokens(projectPath),
      borderRadius: await this.extractBorderRadiusTokens(projectPath),
      animations: await this.extractAnimationTokens(projectPath),
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    };

    return tokens;
  }

  /**
   * Extract color tokens from CSS and theme files
   */
  private async extractColorTokens(projectPath: string): Promise<ColorToken[]> {
    const colors: ColorToken[] = [];
    
    try {
      // Parse global.css for CSS variables
      const cssPath = join(projectPath, 'app', 'global.css');
      const cssContent = readFileSync(cssPath, 'utf-8');
      
      // Extract CSS color variables
      const colorVarRegex = /--([\w-]+):\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|hsl\([^)]+\)|rgb\([^)]+\))/g;
      let match;
      
      while ((match = colorVarRegex.exec(cssContent)) !== null) {
        const [, name, value] = match;
        if (this.isColorVariable(name)) {
          colors.push({
            name: this.cssVariableToTokenName(name),
            value: value,
            category: this.categorizeColorName(name),
          });
        }
      }

      // Parse theme registry for additional colors
      const themeRegistryPath = join(projectPath, 'lib', 'theme', 'registry.tsx');
      if (this.fileExists(themeRegistryPath)) {
        const themeContent = readFileSync(themeRegistryPath, 'utf-8');
        
        // Extract theme colors
        const themeColorRegex = /(\w+):\s*['"]([^'"]+)['"]/g;
        while ((match = themeColorRegex.exec(themeContent)) !== null) {
          const [, name, value] = match;
          if (this.isColorValue(value)) {
            colors.push({
              name: this.formatTokenName(name),
              value: value,
              category: this.categorizeColorName(name),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error extracting color tokens:', error);
    }

    return colors;
  }

  /**
   * Extract typography tokens
   */
  private async extractTypographyTokens(projectPath: string): Promise<TypographyToken[]> {
    const typography: TypographyToken[] = [];
    
    try {
      const typographyPath = join(projectPath, 'lib', 'design', 'typography.ts');
      if (this.fileExists(typographyPath)) {
        const content = readFileSync(typographyPath, 'utf-8');
        
        // Parse typography presets
        const presetRegex = /['"]?([\w-]+)['"]?\s*:\s*\{([^}]+)\}/g;
        let match;
        
        while ((match = presetRegex.exec(content)) !== null) {
          const [, name, properties] = match;
          const token = this.parseTypographyProperties(name, properties);
          if (token) {
            typography.push(token);
          }
        }
      }

      // Also check for typography in theme files
      const themeFiles = glob.sync(join(projectPath, 'lib/theme/**/*.{ts,tsx}'));
      for (const file of themeFiles) {
        const content = readFileSync(file, 'utf-8');
        const additionalTypography = this.extractTypographyFromTheme(content);
        typography.push(...additionalTypography);
      }
    } catch (error) {
      console.error('Error extracting typography tokens:', error);
    }

    return typography;
  }

  /**
   * Extract spacing tokens
   */
  private async extractSpacingTokens(projectPath: string): Promise<SpacingToken[]> {
    const spacing: SpacingToken[] = [];
    
    try {
      const spacingPath = join(projectPath, 'lib', 'design', 'spacing.ts');
      if (this.fileExists(spacingPath)) {
        const content = readFileSync(spacingPath, 'utf-8');
        
        // Parse spacing scale
        const scaleRegex = /(\d+):\s*(\d+)/g;
        let match;
        
        while ((match = scaleRegex.exec(content)) !== null) {
          const [, scale, value] = match;
          spacing.push({
            name: `spacing-${scale}`,
            value: parseInt(value),
            scale: parseInt(scale),
          });
        }
      }

      // Check CSS for spacing variables
      const cssPath = join(projectPath, 'app', 'global.css');
      const cssContent = readFileSync(cssPath, 'utf-8');
      
      const spacingVarRegex = /--(spacing-[\w-]+):\s*(\d+)px/g;
      let match;
      while ((match = spacingVarRegex.exec(cssContent)) !== null) {
        const [, name, value] = match;
        spacing.push({
          name: this.cssVariableToTokenName(name),
          value: parseInt(value),
          scale: parseInt(value) / 4, // Assuming base unit of 4
        });
      }
    } catch (error) {
      console.error('Error extracting spacing tokens:', error);
    }

    return spacing;
  }

  /**
   * Extract shadow tokens
   */
  private async extractShadowTokens(projectPath: string): Promise<ShadowToken[]> {
    const shadows: ShadowToken[] = [];
    
    try {
      // Check for shadow definitions in design system
      const shadowFiles = glob.sync(join(projectPath, 'lib/design/**/shadow*.{ts,tsx}'));
      
      for (const file of shadowFiles) {
        const content = readFileSync(file, 'utf-8');
        const fileShadows = this.parseShadowDefinitions(content);
        shadows.push(...fileShadows);
      }

      // Check CSS for box-shadow definitions
      const cssPath = join(projectPath, 'app', 'global.css');
      const cssContent = readFileSync(cssPath, 'utf-8');
      
      const shadowVarRegex = /--(shadow-[\w-]+):\s*([^;]+);/g;
      let match;
      
      while ((match = shadowVarRegex.exec(cssContent)) !== null) {
        const [, name, value] = match;
        const shadowToken = this.parseCSSBoxShadow(name, value);
        if (shadowToken) {
          shadows.push(shadowToken);
        }
      }
    } catch (error) {
      console.error('Error extracting shadow tokens:', error);
    }

    return shadows;
  }

  /**
   * Extract border radius tokens
   */
  private async extractBorderRadiusTokens(projectPath: string): Promise<any[]> {
    const radii: any[] = [];
    
    try {
      const cssPath = join(projectPath, 'app', 'global.css');
      const cssContent = readFileSync(cssPath, 'utf-8');
      
      const radiusVarRegex = /--(radius-[\w-]+):\s*(\d+)px/g;
      let match;
      
      while ((match = radiusVarRegex.exec(cssContent)) !== null) {
        const [, name, value] = match;
        radii.push({
          name: this.cssVariableToTokenName(name),
          value: parseInt(value),
        });
      }
    } catch (error) {
      console.error('Error extracting border radius tokens:', error);
    }

    return radii;
  }

  /**
   * Extract animation tokens
   */
  private async extractAnimationTokens(projectPath: string): Promise<any[]> {
    const animations: any[] = [];
    
    try {
      const animationPath = join(projectPath, 'lib', 'design', 'animation-variants.ts');
      if (this.fileExists(animationPath)) {
        const content = readFileSync(animationPath, 'utf-8');
        
        // Parse animation variants
        const variantRegex = /(\w+):\s*\{[^}]*duration:\s*(\d+)[^}]*\}/g;
        let match;
        
        while ((match = variantRegex.exec(content)) !== null) {
          const [, name, duration] = match;
          animations.push({
            name: name,
            duration: parseInt(duration),
            variant: name as any,
          });
        }
      }
    } catch (error) {
      console.error('Error extracting animation tokens:', error);
    }

    return animations;
  }

  /**
   * Analyze component patterns in the codebase
   */
  async analyzeComponentPatterns(componentPath: string): Promise<any> {
    const patterns = {
      componentCount: 0,
      commonProps: new Map<string, number>(),
      commonHooks: new Map<string, number>(),
      stylePatterns: new Map<string, number>(),
      importPatterns: new Map<string, number>(),
    };

    try {
      const componentFiles = glob.sync(join(componentPath, '**/*.{tsx,jsx}'), {
        ignore: ['**/*.test.*', '**/*.stories.*'],
      });

      patterns.componentCount = componentFiles.length;

      for (const file of componentFiles.slice(0, 20)) { // Analyze first 20 components
        const content = readFileSync(file, 'utf-8');
        
        // Analyze props
        const propsMatch = content.match(/interface \w+Props \{([^}]+)\}/);
        if (propsMatch) {
          const props = propsMatch[1].match(/(\w+)\??\s*:/g);
          props?.forEach(prop => {
            const propName = prop.replace(/\??\s*:/, '').trim();
            patterns.commonProps.set(propName, (patterns.commonProps.get(propName) || 0) + 1);
          });
        }

        // Analyze hooks
        const hooks = content.match(/use[A-Z]\w+/g);
        hooks?.forEach(hook => {
          patterns.commonHooks.set(hook, (patterns.commonHooks.get(hook) || 0) + 1);
        });

        // Analyze imports
        const imports = content.match(/import .+ from ['"](.+)['"]/g);
        imports?.forEach(imp => {
          const module = imp.match(/from ['"](.+)['"]/)?.[1];
          if (module) {
            patterns.importPatterns.set(module, (patterns.importPatterns.get(module) || 0) + 1);
          }
        });
      }
    } catch (error) {
      console.error('Error analyzing component patterns:', error);
    }

    return {
      componentCount: patterns.componentCount,
      commonProps: Array.from(patterns.commonProps.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      commonHooks: Array.from(patterns.commonHooks.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      importPatterns: Array.from(patterns.importPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    };
  }

  // Helper methods

  private fileExists(path: string): boolean {
    try {
      readFileSync(path);
      return true;
    } catch {
      return false;
    }
  }

  private isColorVariable(name: string): boolean {
    const colorKeywords = ['color', 'bg', 'background', 'border', 'primary', 'secondary', 'accent', 'success', 'warning', 'danger', 'info'];
    return colorKeywords.some(keyword => name.includes(keyword));
  }

  private isColorValue(value: string): boolean {
    return /^(#[0-9a-fA-F]{3,8}|rgb|hsl|hwb)/.test(value);
  }

  private cssVariableToTokenName(cssVar: string): string {
    return cssVar.replace(/^--/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatTokenName(name: string): string {
    return name.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, l => l.toUpperCase());
  }

  private categorizeColorName(name: string): ColorToken['category'] {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('primary')) return 'primary';
    if (lowerName.includes('secondary')) return 'secondary';
    if (lowerName.includes('accent')) return 'accent';
    if (lowerName.includes('success') || lowerName.includes('green')) return 'success';
    if (lowerName.includes('warning') || lowerName.includes('yellow')) return 'warning';
    if (lowerName.includes('danger') || lowerName.includes('error') || lowerName.includes('red')) return 'danger';
    if (lowerName.includes('info') || lowerName.includes('blue')) return 'info';
    return 'neutral';
  }

  private parseTypographyProperties(name: string, properties: string): TypographyToken | null {
    try {
      const fontSize = properties.match(/fontSize:\s*(\d+)/)?.[1];
      const fontWeight = properties.match(/fontWeight:\s*(\d+)/)?.[1];
      const fontFamily = properties.match(/fontFamily:\s*['"]([^'"]+)['"]/)?.[1];
      const lineHeight = properties.match(/lineHeight:\s*(\d+|'auto')/)?.[1];
      const letterSpacing = properties.match(/letterSpacing:\s*(\d+)/)?.[1];

      if (fontSize) {
        return {
          name: this.formatTokenName(name),
          fontFamily: fontFamily || 'System',
          fontSize: parseInt(fontSize),
          fontWeight: parseInt(fontWeight || '400'),
          lineHeight: lineHeight === "'auto'" ? 'auto' : parseInt(lineHeight || '0'),
          letterSpacing: parseInt(letterSpacing || '0'),
        };
      }
    } catch (error) {
      console.error('Error parsing typography properties:', error);
    }
    
    return null;
  }

  private extractTypographyFromTheme(content: string): TypographyToken[] {
    const tokens: TypographyToken[] = [];
    // Implementation for extracting typography from theme files
    return tokens;
  }

  private parseShadowDefinitions(content: string): ShadowToken[] {
    const shadows: ShadowToken[] = [];
    // Implementation for parsing shadow definitions
    return shadows;
  }

  private parseCSSBoxShadow(name: string, value: string): ShadowToken | null {
    try {
      // Simple box-shadow parser
      const parts = value.split(/\s+/);
      if (parts.length >= 4) {
        return {
          name: this.cssVariableToTokenName(name),
          value: [{
            color: parts[parts.length - 1],
            offset: { x: parseInt(parts[0]) || 0, y: parseInt(parts[1]) || 0 },
            radius: parseInt(parts[2]) || 0,
            spread: parseInt(parts[3]) || 0,
          }],
        };
      }
    } catch (error) {
      console.error('Error parsing CSS box-shadow:', error);
    }
    return null;
  }
}