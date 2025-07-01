// Component Analyzer for extracting component patterns and structures
// Designed to work with Figma's component system for design system generation

export interface ComponentAnalysis {
  component: ComponentNode;
  structure: {
    name: string;
    type: string;
    dimensions: {
      width: number;
      height: number;
    };
    autoLayout?: {
      mode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
      spacing: number;
      padding: { top: number; right: number; bottom: number; left: number };
    };
    children: AnalyzedNode[];
  };
  variants?: {
    properties: Record<string, string[]>;
    combinations: number;
  };
  usage: {
    instances: number;
    pages: string[];
  };
}

export interface AnalyzedNode {
  name: string;
  type: string;
  visible: boolean;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  children?: AnalyzedNode[];
  // Special properties for specific node types
  text?: {
    characters: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: number;
  };
  constraints?: {
    horizontal: string;
    vertical: string;
  };
}

export class ComponentAnalyzer {
  /**
   * Analyze selected components to extract their structure
   */
  async analyzeSelectedComponents(): Promise<ComponentAnalysis[]> {
    const selection = figma.currentPage.selection;
    const components = selection.filter(node => node.type === 'COMPONENT') as ComponentNode[];
    
    if (components.length === 0) {
      // Look for components in the current view
      const componentsInView = figma.currentPage.findAll(node => 
        node.type === 'COMPONENT' && this.isNodeInViewport(node)
      ) as ComponentNode[];
      
      if (componentsInView.length > 0) {
        components.push(...componentsInView);
      }
    }
    
    const analyses: ComponentAnalysis[] = [];
    
    for (const component of components) {
      const analysis = await this.analyzeComponent(component);
      analyses.push(analysis);
    }
    
    return analyses;
  }
  
  /**
   * Deep analyze a single component
   */
  private async analyzeComponent(component: ComponentNode): Promise<ComponentAnalysis> {
    const structure = this.extractNodeStructure(component);
    const variants = this.analyzeVariants(component);
    const usage = await this.analyzeUsage(component);
    
    return {
      component,
      structure,
      variants,
      usage
    };
  }
  
  /**
   * Extract the structure of a node recursively
   */
  private extractNodeStructure(node: SceneNode): any {
    const structure: any = {
      name: node.name,
      type: node.type,
      visible: node.visible
    };
    
    // Add dimensions for nodes that have them
    if ('width' in node && 'height' in node) {
      structure.dimensions = {
        width: node.width,
        height: node.height
      };
    }
    
    // Add auto-layout properties for frames
    if ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && node.layoutMode !== 'NONE') {
      structure.autoLayout = {
        mode: node.layoutMode,
        spacing: node.itemSpacing || 0,
        padding: {
          top: node.paddingTop || 0,
          right: node.paddingRight || 0,
          bottom: node.paddingBottom || 0,
          left: node.paddingLeft || 0
        }
      };
    }
    
    // Add visual properties
    if ('fills' in node && node.fills) {
      structure.fills = JSON.parse(JSON.stringify(node.fills));
    }
    
    if ('strokes' in node && node.strokes) {
      structure.strokes = JSON.parse(JSON.stringify(node.strokes));
    }
    
    if ('effects' in node && node.effects) {
      structure.effects = JSON.parse(JSON.stringify(node.effects));
    }
    
    // Add text properties
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      structure.text = {
        characters: textNode.characters,
        fontSize: typeof textNode.fontSize === 'number' ? textNode.fontSize : 0,
        fontFamily: textNode.fontName !== figma.mixed ? textNode.fontName.family : 'Mixed',
        fontWeight: textNode.fontName !== figma.mixed ? 
          (textNode.fontName.style.includes('Bold') ? 700 : 
           textNode.fontName.style.includes('Medium') ? 500 : 400) : 400
      };
    }
    
    // Add constraints
    if ('constraints' in node) {
      structure.constraints = node.constraints;
    }
    
    // Add children recursively
    if ('children' in node && node.children.length > 0) {
      structure.children = node.children.map(child => this.extractNodeStructure(child));
    }
    
    return structure;
  }
  
  /**
   * Analyze component variants if it's part of a variant set
   */
  private analyzeVariants(component: ComponentNode): any {
    const parent = component.parent;
    
    if (parent && parent.type === 'COMPONENT_SET') {
      const componentSet = parent as ComponentSetNode;
      const properties: Record<string, Set<string>> = {};
      
      // Extract all variant properties
      componentSet.children.forEach(variant => {
        if (variant.type === 'COMPONENT') {
          const variantProps = variant.variantProperties;
          if (variantProps) {
            Object.entries(variantProps).forEach(([key, value]) => {
              if (!properties[key]) {
                properties[key] = new Set();
              }
              properties[key].add(value);
            });
          }
        }
      });
      
      // Convert sets to arrays
      const variantProperties: Record<string, string[]> = {};
      Object.entries(properties).forEach(([key, values]) => {
        variantProperties[key] = Array.from(values);
      });
      
      return {
        properties: variantProperties,
        combinations: componentSet.children.length
      };
    }
    
    return null;
  }
  
  /**
   * Analyze component usage across the document
   */
  private async analyzeUsage(component: ComponentNode): Promise<any> {
    let instanceCount = 0;
    const pagesUsed = new Set<string>();
    
    // Search all pages for instances
    for (const page of figma.root.children) {
      await page.loadAsync();
      
      const instances = page.findAll(node => {
        if (node.type === 'INSTANCE') {
          const instance = node as InstanceNode;
          return instance.mainComponent && instance.mainComponent.id === component.id;
        }
        return false;
      });
      
      if (instances.length > 0) {
        instanceCount += instances.length;
        pagesUsed.add(page.name);
      }
    }
    
    return {
      instances: instanceCount,
      pages: Array.from(pagesUsed)
    };
  }
  
  /**
   * Check if a node is in the current viewport
   */
  private isNodeInViewport(node: SceneNode): boolean {
    // This is a simplified check - in reality you'd need viewport bounds
    return node.visible && node.parent === figma.currentPage;
  }
  
  /**
   * Extract swatch-specific information
   */
  extractSwatchInfo(analysis: ComponentAnalysis): SwatchInfo | null {
    if (!analysis.component.name.toLowerCase().includes('swatch')) {
      return null;
    }
    
    const colorNode = this.findColorNode(analysis.structure);
    const labelNode = this.findLabelNode(analysis.structure);
    
    return {
      type: analysis.component.name.includes('gradient') ? 'gradient' : 'solid',
      dimensions: analysis.structure.dimensions,
      colorBinding: colorNode && colorNode.fills && colorNode.fills[0] && colorNode.fills[0].boundVariables 
        ? colorNode.fills[0].boundVariables.color 
        : undefined,
      label: labelNode && labelNode.text ? labelNode.text.characters : undefined,
      autoLayout: analysis.structure.autoLayout
    };
  }
  
  /**
   * Find the color display node in a swatch
   */
  private findColorNode(structure: any): any {
    if (structure.type === 'RECTANGLE' && structure.fills) {
      return structure;
    }
    
    if (structure.children) {
      for (const child of structure.children) {
        const found = this.findColorNode(child);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * Find the label text node in a swatch
   */
  private findLabelNode(structure: any): any {
    if (structure.type === 'TEXT') {
      return structure;
    }
    
    if (structure.children) {
      for (const child of structure.children) {
        const found = this.findLabelNode(child);
        if (found) return found;
      }
    }
    
    return null;
  }
}

interface SwatchInfo {
  type: 'solid' | 'gradient';
  dimensions: { width: number; height: number };
  colorBinding?: any;
  label?: string;
  autoLayout?: any;
}

// Export functions for easy use
export async function analyzeSelectedComponents(): Promise<ComponentAnalysis[]> {
  const analyzer = new ComponentAnalyzer();
  return analyzer.analyzeSelectedComponents();
}

export function extractSwatchPatterns(analyses: ComponentAnalysis[]): SwatchInfo[] {
  const analyzer = new ComponentAnalyzer();
  return analyses
    .map(analysis => analyzer.extractSwatchInfo(analysis))
    .filter((info): info is SwatchInfo => info !== null);
}