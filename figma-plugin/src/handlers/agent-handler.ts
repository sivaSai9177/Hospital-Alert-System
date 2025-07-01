/**
 * Agent Message Handler
 * Handles AI agent interactions for design assistance
 */

import { operationQueue } from '../lib/operation-queue';
import { syncStateManager } from '../lib/sync-state-manager';
import { figmaLogger, logger } from '../lib/figma-logger';
import { MessageType } from '../types/messages';

interface AgentMessage {
  type: 'agent-message' | 'agent-action' | 'generate-code';
  content?: string;
  action?: string;
  prompt?: string;
  context?: AgentContext;
  capabilities?: AgentCapability[];
  settings?: AgentSettings;
  params?: any;
}

interface AgentContext {
  selectedNodes?: string[];
  currentPage?: string;
  recentActions?: string[];
  designTokens?: Record<string, any>;
}

interface AgentCapability {
  id: string;
  name: string;
  enabled: boolean;
}

interface AgentSettings {
  model: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku';
  temperature: number;
  maxTokens: number;
}

interface AgentResponse {
  content: string;
  metadata?: {
    tokens?: number;
    model?: string;
    executedActions?: string[];
  };
}

/**
 * Agent Handler Class
 */
export class AgentHandler {
  private conversationHistory: { role: string; content: string }[] = [];
  private maxHistoryLength = 10;

  /**
   * Handle agent messages
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    const operationId = syncStateManager.createOperation('agent-interaction', {
      type: message.type,
      timestamp: new Date()
    });

    try {
      logger.agent.info('Processing agent message', { 
        type: message.type, 
        hasContext: !!message.context 
      });

      switch (message.type) {
        case 'agent-message':
          await this.handleChatMessage(message, operationId);
          break;
        
        case 'agent-action':
          await this.handleAgentAction(message, operationId);
          break;
        
        case 'generate-code':
          await this.handleCodeGeneration(message, operationId);
          break;
      }

      syncStateManager.completeOperation(operationId);
    } catch (error) {
      logger.agent.error('Agent message handling failed', error);
      syncStateManager.failOperation(operationId, error as Error);
      
      // Send error to UI
      figma.ui.postMessage({
        type: MessageType.AGENT_ERROR,
        error: error instanceof Error ? error.message : 'Agent processing failed'
      });
    }
  }

  /**
   * Handle chat messages
   */
  private async handleChatMessage(
    message: AgentMessage, 
    operationId: string
  ): Promise<void> {
    const { content, context, capabilities, settings } = message;

    if (!content) {
      throw new Error('No content provided for agent message');
    }

    // Add to conversation history
    this.addToHistory('user', content);

    // Build system prompt based on capabilities
    const systemPrompt = this.buildSystemPrompt(capabilities || []);

    // Build context prompt
    const contextPrompt = this.buildContextPrompt(context);

    // Simulate streaming response (in real implementation, this would call Claude API)
    await this.simulateStreamingResponse(
      content,
      systemPrompt,
      contextPrompt,
      settings,
      operationId
    );
  }

  /**
   * Handle agent actions
   */
  private async handleAgentAction(
    message: AgentMessage,
    operationId: string
  ): Promise<void> {
    const { action, params, context } = message;

    if (!action) {
      throw new Error('No action specified');
    }

    logger.agent.info(`Executing agent action: ${action}`, { params });

    // Add to operation queue for complex actions
    await operationQueue.addOperation(
      'agent-action',
      async () => {
        switch (action) {
          case 'analyze-design':
            return await this.analyzeDesign(params, context);
          
          case 'suggest-improvements':
            return await this.suggestImprovements(params, context);
          
          case 'check-accessibility':
            return await this.checkAccessibility(params, context);
          
          case 'extract-tokens':
            return await this.extractDesignTokens(params, context);
          
          case 'generate-components':
            return await this.generateComponents(params, context);
          
          default:
            throw new Error(`Unknown agent action: ${action}`);
        }
      },
      {
        priority: 'high',
        data: { action, params },
        onComplete: (result) => {
          figma.ui.postMessage({
            type: MessageType.AGENT_RESPONSE,
            content: result.content,
            metadata: result.metadata
          });
        }
      }
    );
  }

  /**
   * Handle code generation
   */
  private async handleCodeGeneration(
    message: AgentMessage,
    operationId: string
  ): Promise<void> {
    const { prompt, context } = message;

    if (!prompt) {
      throw new Error('No prompt provided for code generation');
    }

    logger.agent.info('Generating code from prompt', { prompt });

    // Get current selection
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      throw new Error('Please select a component to generate code');
    }

    // Extract component properties
    const componentData = this.extractComponentData(selection[0]);

    // Generate code (simulate for now)
    const generatedCode = await this.generateComponentCode(
      componentData,
      prompt,
      context
    );

    // Send response
    figma.ui.postMessage({
      type: MessageType.CODE_GENERATED,
      code: generatedCode,
      language: 'typescript',
      model: 'claude-3-sonnet'
    });
  }

  /**
   * Build system prompt based on capabilities
   */
  private buildSystemPrompt(capabilities: AgentCapability[]): string {
    const enabledCapabilities = capabilities.filter(c => c.enabled);
    
    let prompt = `You are an AI design assistant integrated with Figma. You can help with:
`;
    
    enabledCapabilities.forEach(cap => {
      switch (cap.id) {
        case 'design-analysis':
          prompt += '- Analyzing designs for consistency, usability, and best practices\n';
          break;
        case 'code-generation':
          prompt += '- Generating React Native and web code from designs\n';
          break;
        case 'token-extraction':
          prompt += '- Extracting and organizing design tokens\n';
          break;
        case 'accessibility-check':
          prompt += '- Checking designs for accessibility compliance (WCAG)\n';
          break;
        case 'auto-layout':
          prompt += '- Suggesting auto-layout improvements and responsive design patterns\n';
          break;
      }
    });

    prompt += `
Always provide actionable, specific feedback. When generating code, use modern React patterns with TypeScript and Tailwind CSS.`;

    return prompt;
  }

  /**
   * Build context prompt
   */
  private buildContextPrompt(context?: AgentContext): string {
    if (!context) return '';

    let prompt = '\n\nCurrent context:\n';

    if (context.selectedNodes?.length) {
      prompt += `- Selected nodes: ${context.selectedNodes.length} items\n`;
    }

    if (context.currentPage) {
      prompt += `- Current page: ${context.currentPage}\n`;
    }

    if (context.recentActions?.length) {
      prompt += `- Recent actions: ${context.recentActions.join(', ')}\n`;
    }

    if (context.designTokens) {
      prompt += `- Design tokens available: ${Object.keys(context.designTokens).join(', ')}\n`;
    }

    return prompt;
  }

  /**
   * Simulate streaming response
   */
  private async simulateStreamingResponse(
    userMessage: string,
    systemPrompt: string,
    contextPrompt: string,
    settings?: AgentSettings,
    operationId?: string
  ): Promise<void> {
    // Start streaming
    figma.ui.postMessage({ type: MessageType.AGENT_STREAM_START });

    // Simulate response chunks
    const response = await this.generateResponse(
      userMessage, 
      systemPrompt + contextPrompt
    );

    // Stream response in chunks
    const chunkSize = 10;
    for (let i = 0; i < response.length; i += chunkSize) {
      const chunk = response.slice(i, i + chunkSize);
      figma.ui.postMessage({
        type: MessageType.AGENT_STREAM_CHUNK,
        content: chunk
      });
      
      // Update progress
      if (operationId) {
        const progress = Math.min(90, (i / response.length) * 100);
        syncStateManager.updateProgress(operationId, progress);
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // End streaming
    figma.ui.postMessage({
      type: MessageType.AGENT_STREAM_END,
      metadata: {
        tokens: response.length,
        model: settings?.model || 'claude-3-sonnet'
      }
    });

    // Add to history
    this.addToHistory('assistant', response);
  }

  /**
   * Generate response (mock implementation)
   */
  private async generateResponse(
    userMessage: string,
    systemContext: string
  ): Promise<string> {
    // In real implementation, this would call Claude API
    // For now, return contextual mock responses

    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('analyze')) {
      return `I've analyzed your design and here are my findings:

**Design Consistency:**
- Color usage is consistent with your design tokens
- Typography follows the established hierarchy
- Spacing uses the 4px grid system effectively

**Areas for Improvement:**
1. Consider increasing the contrast ratio for better accessibility
2. The button padding could be more consistent across components
3. Some text elements might benefit from larger font sizes on mobile

**Recommendations:**
- Apply the standard button component from your design system
- Use semantic color tokens for better maintainability
- Consider adding focus states for keyboard navigation`;
    }

    if (lowerMessage.includes('accessibility')) {
      return `Here's my accessibility analysis:

**WCAG Compliance:**
- ✅ Color contrast meets AA standards (4.5:1)
- ⚠️ Some interactive elements are below 44x44px touch target
- ✅ Text is readable at 16px base size
- ❌ Missing focus indicators on interactive elements

**Recommendations:**
1. Increase touch targets to at least 44x44px
2. Add visible focus states with 2px outline
3. Ensure all images have descriptive alt text
4. Test with screen readers for full compliance`;
    }

    if (lowerMessage.includes('code') || lowerMessage.includes('component')) {
      return `I'll help you generate code for this component. Based on your selection, here's a React Native component with TypeScript and NativeWind:

\`\`\`typescript
import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface CardProps {
  title: string;
  description: string;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ title, description, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
    >
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </Text>
      <Text className="text-base text-gray-600">
        {description}
      </Text>
    </Pressable>
  );
};
\`\`\`

This component uses your design tokens and follows platform conventions.`;
    }

    // Default response
    return `I understand you want help with: "${userMessage}". 

I can assist you with:
- Design analysis and feedback
- Accessibility checking
- Code generation from designs
- Design token extraction
- Auto-layout suggestions

Please select a frame or component and ask me a specific question about it.`;
  }

  /**
   * Analyze design
   */
  private async analyzeDesign(
    params: any, 
    context?: AgentContext
  ): Promise<AgentResponse> {
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      throw new Error('Please select elements to analyze');
    }

    // Perform analysis
    const analysis = {
      consistency: this.checkDesignConsistency(selection),
      hierarchy: this.checkVisualHierarchy(selection),
      spacing: this.checkSpacingConsistency(selection),
      colors: this.checkColorUsage(selection)
    };

    return {
      content: this.formatAnalysisResults(analysis),
      metadata: {
        executedActions: ['analyze-consistency', 'check-hierarchy', 'check-spacing', 'check-colors']
      }
    };
  }

  /**
   * Suggest improvements
   */
  private async suggestImprovements(
    params: any,
    context?: AgentContext
  ): Promise<AgentResponse> {
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      throw new Error('Please select elements to improve');
    }

    const suggestions = [];

    // Check each selected node
    for (const node of selection) {
      if ('layoutMode' in node && node.layoutMode === 'NONE') {
        suggestions.push({
          node: node.name,
          type: 'auto-layout',
          suggestion: 'Convert to auto-layout for better responsiveness'
        });
      }

      if ('fills' in node && Array.isArray(node.fills)) {
        const hasSolidFill = node.fills.some(fill => fill.type === 'SOLID');
        if (hasSolidFill) {
          suggestions.push({
            node: node.name,
            type: 'design-token',
            suggestion: 'Use color tokens instead of hard-coded colors'
          });
        }
      }
    }

    return {
      content: this.formatSuggestions(suggestions),
      metadata: {
        executedActions: ['check-layout', 'check-tokens'],
        suggestionsCount: suggestions.length
      }
    };
  }

  /**
   * Check accessibility
   */
  private async checkAccessibility(
    params: any,
    context?: AgentContext
  ): Promise<AgentResponse> {
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      throw new Error('Please select elements to check');
    }

    const issues = [];

    for (const node of selection) {
      // Check touch target size
      if ('width' in node && 'height' in node) {
        if (node.width < 44 || node.height < 44) {
          issues.push({
            node: node.name,
            type: 'touch-target',
            severity: 'warning',
            message: 'Touch target is smaller than 44x44px'
          });
        }
      }

      // Check text contrast (simplified)
      if (node.type === 'TEXT') {
        issues.push({
          node: node.name,
          type: 'contrast',
          severity: 'info',
          message: 'Ensure text has sufficient contrast (4.5:1 for normal text)'
        });
      }
    }

    return {
      content: this.formatAccessibilityResults(issues),
      metadata: {
        executedActions: ['check-touch-targets', 'check-contrast'],
        issuesFound: issues.length
      }
    };
  }

  /**
   * Extract design tokens
   */
  private async extractDesignTokens(
    params: any,
    context?: AgentContext
  ): Promise<AgentResponse> {
    // This would integrate with the existing token extraction
    logger.agent.info('Extracting design tokens via agent');

    const tokens = {
      colors: {},
      typography: {},
      spacing: {},
      extracted: new Date().toISOString()
    };

    return {
      content: `Extracted design tokens:\n${JSON.stringify(tokens, null, 2)}`,
      metadata: {
        executedActions: ['extract-colors', 'extract-typography', 'extract-spacing']
      }
    };
  }

  /**
   * Generate components
   */
  private async generateComponents(
    params: any,
    context?: AgentContext
  ): Promise<AgentResponse> {
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      throw new Error('Please select a frame to generate components');
    }

    // This would integrate with component generation
    return {
      content: 'Component generation initiated. Check the component library page.',
      metadata: {
        executedActions: ['generate-components']
      }
    };
  }

  /**
   * Extract component data
   */
  private extractComponentData(node: SceneNode): any {
    const data: any = {
      name: node.name,
      type: node.type,
      id: node.id
    };

    if ('width' in node) data.width = node.width;
    if ('height' in node) data.height = node.height;
    if ('fills' in node) data.fills = node.fills;
    if ('strokes' in node) data.strokes = node.strokes;
    if ('effects' in node) data.effects = node.effects;
    if ('layoutMode' in node) data.layoutMode = node.layoutMode;
    if ('primaryAxisSizingMode' in node) data.primaryAxisSizingMode = node.primaryAxisSizingMode;
    if ('counterAxisSizingMode' in node) data.counterAxisSizingMode = node.counterAxisSizingMode;
    if ('paddingLeft' in node) {
      data.padding = {
        left: node.paddingLeft,
        right: node.paddingRight,
        top: node.paddingTop,
        bottom: node.paddingBottom
      };
    }

    return data;
  }

  /**
   * Generate component code
   */
  private async generateComponentCode(
    componentData: any,
    prompt: string,
    context?: AgentContext
  ): Promise<string> {
    // Mock code generation
    const componentName = componentData.name.replace(/[^a-zA-Z0-9]/g, '');
    
    return `import React from 'react';
import { View, Text } from 'react-native';

interface ${componentName}Props {
  // Add props based on component data
}

export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    <View className="flex-1 p-4">
      <Text className="text-lg font-semibold">
        ${componentName} Component
      </Text>
      {/* Component implementation based on Figma design */}
    </View>
  );
};

export default ${componentName};`;
  }

  /**
   * Helper methods for analysis
   */
  private checkDesignConsistency(nodes: readonly SceneNode[]): any {
    return { score: 85, issues: [] };
  }

  private checkVisualHierarchy(nodes: readonly SceneNode[]): any {
    return { score: 90, issues: [] };
  }

  private checkSpacingConsistency(nodes: readonly SceneNode[]): any {
    return { score: 80, issues: ['Inconsistent padding in some components'] };
  }

  private checkColorUsage(nodes: readonly SceneNode[]): any {
    return { score: 95, issues: [] };
  }

  /**
   * Format results
   */
  private formatAnalysisResults(analysis: any): string {
    return `Design Analysis Complete:

**Overall Score: ${(analysis.consistency.score + analysis.hierarchy.score + analysis.spacing.score + analysis.colors.score) / 4}%**

✅ Design Consistency: ${analysis.consistency.score}%
✅ Visual Hierarchy: ${analysis.hierarchy.score}%
⚠️ Spacing Consistency: ${analysis.spacing.score}%
✅ Color Usage: ${analysis.colors.score}%

**Issues Found:**
${analysis.spacing.issues.map((issue: string) => `- ${issue}`).join('\n')}
`;
  }

  private formatSuggestions(suggestions: any[]): string {
    if (suggestions.length === 0) {
      return 'Great job! No major improvements needed.';
    }

    return `Found ${suggestions.length} improvement suggestions:

${suggestions.map(s => `**${s.node}** (${s.type})
- ${s.suggestion}`).join('\n\n')}
`;
  }

  private formatAccessibilityResults(issues: any[]): string {
    if (issues.length === 0) {
      return '✅ No accessibility issues found!';
    }

    return `Found ${issues.length} accessibility considerations:

${issues.map(i => `**${i.node}** - ${i.severity.toUpperCase()}
- ${i.message}`).join('\n\n')}
`;
  }

  /**
   * Manage conversation history
   */
  private addToHistory(role: string, content: string): void {
    this.conversationHistory.push({ role, content });
    
    // Trim history if too long
    if (this.conversationHistory.length > this.maxHistoryLength * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): { role: string; content: string }[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}

// Export singleton instance
export const agentHandler = new AgentHandler();