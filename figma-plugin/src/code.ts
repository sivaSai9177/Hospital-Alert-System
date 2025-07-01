// This plugin runs in Figma's main thread
console.log('🚀 Plugin starting...');

import { extractDesignTokens } from './handlers/tokens/token-extractor';
import { extractDesignTokensWithVariables } from './handlers/tokens/token-extractor-variables';
import { syncWithMCPServer, setupRealtimeSync, cleanupRealtimeSync } from './handlers/sync/mcp-sync';
import { applyTokensToFigma, applyTokensAsVariables } from './handlers/tokens/token-applier';
import { applyTokensToFigmaAtomic } from './handlers/tokens/token-applier-atomic';
import { mapTokensToFigma } from './extractors/unified-token-mapper';
import { generateCodeFromTokens, formatGeneratedFilesSummary } from './handlers/generation/code-generator';
import { validateTokens, formatValidationResults } from './validators/token-validator';
import { generateDesignSystemPages } from './handlers/generation/page-generator';
import { generateDesignSystemPage } from './handlers/generation/design-system-page-generator-simple';
import { MessageType, PluginMessage } from './types/messages';
import { formatError, createUserMessage } from './utils/error-messages';
import { inspectFrame, inspectSelectedFrame, getAllFrames, getFrameIssues, getCurrentSelectionInfo, getAllPages, getElementDetails, getSelectionGroups } from './handlers/analysis/frame-inspector';
import { editFrame, editSelectedFrame, createPresetFrame, fixFrameIssues } from './handlers/analysis/frame-editor';
import { analyzeSelectedComponents } from './handlers/analysis/component-analyzer';
import { extractColors, syncExtractedColors, applyExtractedTheme } from './handlers/analysis/color-extractor-simple';
import { generateTypographySystem } from './handlers/generation/typography-generator';
import { typographyGenerator } from './handlers/generation/typography-generator-enhanced';
import { generateSpacingSystem } from './handlers/generation/spacing-generator';
import { spacingGenerator } from './handlers/generation/spacing-generator-enhanced';
import { agentHandler } from './handlers/agent-handler';
import { operationQueue } from './lib/operation-queue';
import { syncStateManager } from './lib/sync-state-manager';
import { componentLibraryGenerator } from './handlers/generation/component-library-generator';
import { designDocumentationExporter } from './handlers/generation/design-documentation-exporter';

console.log('📦 Imports loaded');

// Message handler from UI
figma.ui.onmessage = async (msg: PluginMessage) => {
  console.log('📨 Received message:', msg.type, msg);
  try {
    switch (msg.type) {
      case MessageType.EXTRACT_TOKENS:
        await handleExtractTokens();
        break;
      
      case MessageType.SYNC_TO_CODE:
        await handleSyncToCode(msg.data);
        break;
      
      case MessageType.SYNC_FROM_CODE:
        await handleSyncFromCode();
        break;
      
      case MessageType.GENERATE_COMPONENT:
        await handleGenerateComponent(msg.data);
        break;
      
      case MessageType.UPDATE_SETTINGS:
        await handleUpdateSettings(msg.data);
        break;
      
      case MessageType.ENABLE_REALTIME_SYNC:
        await handleEnableRealtimeSync();
        break;
      
      case MessageType.DISABLE_REALTIME_SYNC:
        await handleDisableRealtimeSync();
        break;
      
      case MessageType.IMPORT_TOKENS:
        await handleImportTokens(msg.data);
        break;
      
      case MessageType.RETRY_FAILED_TOKENS:
        await handleRetryFailedTokens(msg.data);
        break;
      
      case MessageType.VALIDATE_TOKENS:
        await handleValidateTokens(msg.data);
        break;
      
      case MessageType.SHOW_VALIDATION_DETAILS:
        await handleShowValidationDetails(msg.data);
        break;
      
      case MessageType.GENERATE_DESIGN_SYSTEM_PAGES:
        await handleGenerateDesignSystemPages();
        break;
      
      case MessageType.GENERATE_TYPOGRAPHY_SYSTEM:
        await handleGenerateTypographySystem();
        break;
      
      case MessageType.GENERATE_SPACING_SYSTEM:
        await handleGenerateSpacingSystem();
        break;
      
      case MessageType.GENERATE_COMPONENT_LIBRARY:
        await handleGenerateComponentLibrary();
        break;
      
      case MessageType.EXPORT_DESIGN_DOCUMENTATION:
        await handleExportDesignDocumentation();
        break;
        
      case MessageType.UPDATE_DESIGN_SYSTEM_PAGES:
        console.log('🔄 Received UPDATE_DESIGN_SYSTEM_PAGES message');
        await handleUpdateDesignSystemPages();
        break;
        
      case MessageType.INSPECT_FRAME:
        await handleInspectFrame(msg);
        break;
        
      case MessageType.INSPECT_SELECTED:
        await handleInspectSelected();
        break;
        
      case MessageType.GET_ALL_FRAMES:
        await handleGetAllFrames();
        break;
        
      case MessageType.GET_FRAME_ISSUES:
        await handleGetFrameIssues(msg.data);
        break;
        
      case MessageType.GET_SELECTION_INFO:
        await handleGetSelectionInfo();
        break;
        
      case MessageType.GET_ALL_PAGES:
        await handleGetAllPages();
        break;
        
      case MessageType.GET_ELEMENT_DETAILS:
        await handleGetElementDetails(msg.data);
        break;
        
      case MessageType.GET_SELECTION_GROUPS:
        await handleGetSelectionGroups();
        break;
        
      case MessageType.EDIT_FRAME:
        await handleEditFrame(msg.data);
        break;
        
      case MessageType.EDIT_SELECTED_FRAME:
        await handleEditSelectedFrame(msg.data);
        break;
        
      case MessageType.CREATE_PRESET_FRAME:
        await handleCreatePresetFrame(msg.data);
        break;
        
      case MessageType.FIX_FRAME_ISSUES:
        await handleFixFrameIssues(msg.data);
        break;
      
      case MessageType.ANALYZE_COMPONENTS:
        await handleAnalyzeComponents();
        break;
      
      case MessageType.EXTRACT_COLORS:
        await handleExtractColors();
        break;
      
      case MessageType.SYNC_EXTRACTED_COLORS:
        await handleSyncExtractedColors(msg.data);
        break;
      
      case MessageType.APPLY_EXTRACTED_THEME:
        await handleApplyExtractedTheme(msg.data);
        break;
      
      // Operation control handlers
      case MessageType.PAUSE_OPERATION:
        await handlePauseOperation(msg.data);
        break;
      
      case MessageType.RESUME_OPERATION:
        await handleResumeOperation(msg.data);
        break;
      
      case MessageType.CANCEL_OPERATION:
        await handleCancelOperation(msg.data);
        break;
      
      case MessageType.GET_OPERATION_STATUS:
        await handleGetOperationStatus();
        break;
      
      // Agent message handlers
      case MessageType.AGENT_MESSAGE:
        await agentHandler.handleMessage({
          type: 'agent-message',
          ...msg.data
        });
        break;
      
      case MessageType.AGENT_ACTION:
        await agentHandler.handleMessage({
          type: 'agent-action',
          ...msg.data
        });
        break;
      
      case MessageType.GENERATE_CODE:
        await agentHandler.handleMessage({
          type: 'generate-code',
          ...msg.data
        });
        break;
      
      case MessageType.CLOSE:
        cleanupRealtimeSync();
        figma.closePlugin();
        break;
      
      case MessageType.GET_CURRENT_SELECTION:
        await handleGetSelectionInfo();
        break;
      
      case MessageType.GET_SELECTION:
        // Send current selection
        figma.ui.postMessage({
          type: MessageType.SELECTION_CHANGED,
          selection: figma.currentPage.selection.map(node => ({
            id: node.id,
            name: node.name,
            type: node.type,
          })),
        });
        break;
      
      case MessageType.UI_READY:
        // UI is ready, send connection confirmation
        figma.ui.postMessage({
          type: MessageType.CONNECTED
        });
        break;
      
      case MessageType.MUTATE_FRAME:
        await handleMutateFrame(msg);
        break;
      
      case MessageType.BATCH_MUTATE_FRAMES:
        await handleBatchMutateFrames(msg);
        break;
      
      case MessageType.PAUSE_OPERATION:
        if (msg.data?.operationId) {
          syncStateManager.pauseOperation(msg.data.operationId);
        }
        break;
      
      case MessageType.RESUME_OPERATION:
        if (msg.data?.operationId) {
          syncStateManager.resumeOperation(msg.data.operationId);
        }
        break;
      
      case MessageType.CANCEL_OPERATION:
        if (msg.data?.operationId) {
          operationQueue.cancelOperation(msg.data.operationId);
          syncStateManager.failOperation(msg.data.operationId, 'Operation cancelled by user');
        }
        break;
      
      case MessageType.SMART_SEARCH:
        // Note: Search functionality is handled in the UI layer
        // The actual search is performed by the SmartSearch component
        // which directly queries the indexed documentation
        figma.notify('Search is handled in the UI layer', { timeout: 2000 });
        break;
      
      case MessageType.OPEN_SEARCH_RESULT:
        // Handle opening search results
        if (msg.data?.type === 'code' && msg.data?.metadata?.code) {
          // Copy code to clipboard notification
          figma.notify('Code copied to clipboard', { timeout: 2000 });
        }
        break;
      
      default:
        console.error('Unknown message type:', msg.type);
    }
  } catch (error) {
    console.error('Plugin error:', error);
    const enhancedError = formatError(error);
    const userMessage = createUserMessage(enhancedError, 'Plugin operation failed');
    
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: {
        message: userMessage,
        details: enhancedError
      }
    });
  }
};

// Extract design tokens from current file
async function handleExtractTokens() {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Extracting design tokens...' }
  });

  try {
    // Try Variables API first, fallback to legacy if needed
    let tokens;
    try {
      console.log('🔍 Attempting to extract tokens using Variables API...');
      tokens = await extractDesignTokensWithVariables();
      console.log('✅ Successfully extracted tokens with Variables API');
    } catch (variablesError) {
      console.warn('⚠️ Variables API extraction failed, falling back to legacy:', variablesError);
      tokens = await extractDesignTokens();
      console.log('✅ Successfully extracted tokens with legacy API');
    }
    
    figma.ui.postMessage({
      type: MessageType.TOKENS_EXTRACTED,
      data: tokens
    });
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to extract tokens'));
  }
}

// Sync tokens to codebase via MCP
async function handleSyncToCode(data: any) {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Syncing to codebase...' }
  });

  try {
    // Check if MCP server is configured
    const settings = await figma.clientStorage.getAsync('settings');
    const hasMCPServer = settings && settings.mcpServerUrl;
    
    if (hasMCPServer) {
      // Use MCP server if configured
      const result = await syncWithMCPServer({
        action: 'sync-to-code',
        tokens: data.tokens,
        config: data.config
      });

      figma.ui.postMessage({
        type: MessageType.SYNC_COMPLETE,
        data: result
      });
    } else {
      // Generate code files locally
      console.log('📝 Generating code files from tokens...');
      const generatedFiles = generateCodeFromTokens(data.tokens);
      const summary = formatGeneratedFilesSummary(generatedFiles);
      
      // Send the generated files summary to UI
      figma.ui.postMessage({
        type: 'CODE_GENERATED',
        data: {
          files: generatedFiles,
          summary: summary,
          message: 'Code files generated! Copy the code below to your project.'
        }
      });
    }
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to sync to code'));
  }
}

// Sync tokens from codebase via MCP
async function handleSyncFromCode() {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Fetching tokens from codebase...' }
  });

  try {
    // Get sync mode from settings
    const settings = await figma.clientStorage.getAsync('settings');
    const useSampleData = !settings || !settings.mcpServerUrl;
    
    let tokens;
    
    if (useSampleData) {
      // Use unified token mapper for real tokens
      console.log('⚠️ No MCP server configured, using real design tokens from codebase');
      const unifiedTokens = mapTokensToFigma();
      
      // Apply using atomic approach for better Figma Variables support
      console.log('🎨 Applying tokens using Variables API...');
      
      // Validate tokens before applying
      const validationResults = validateTokens(unifiedTokens);
      if (!validationResults.valid) {
        console.warn('⚠️ Token validation failed with errors:', validationResults.errors);
        
        // Show validation errors in UI
        figma.ui.postMessage({
          type: 'VALIDATION_RESULTS',
          data: validationResults
        });
      }
      
      // Save tokens for retry functionality
      await figma.clientStorage.setAsync('lastSyncedTokens', { tokens: unifiedTokens });
      
      await applyTokensToFigmaAtomic(unifiedTokens);
      
      figma.ui.postMessage({
        type: MessageType.SYNC_COMPLETE,
        data: { 
          tokens: unifiedTokens,
          source: 'local-codebase',
          timestamp: new Date().toISOString()
        }
      });
      
      return; // Exit early since we already applied tokens
    } else {
      // Sync from actual MCP server
      const result = await syncWithMCPServer({
        action: 'sync-from-code',
        config: settings
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync from code');
      }
      
      tokens = result.tokens || result.data;
    }

    // Apply tokens to Figma using atomic approach if we have unified tokens
    if (tokens && tokens.colors && tokens.spacing) {
      console.log('🎨 Applying tokens using Variables API...');
      // Save tokens for retry functionality
      await figma.clientStorage.setAsync('lastSyncedTokens', { tokens });
      await applyTokensToFigmaAtomic(tokens);
    } else {
      // Fallback to legacy approach for old token format
      console.log('🎨 Applying tokens using legacy approach...');
      await applyTokensToFigma(tokens);
    }

    figma.ui.postMessage({
      type: MessageType.SYNC_COMPLETE,
      data: { tokens }
    });
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to sync from code'));
  }
}

// Generate component code from selected Figma components
async function handleGenerateComponent(data: any) {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    throw new Error('Please select a component to generate code');
  }

  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Generating component code...' }
  });

  try {
    const componentData = selection.map(node => ({
      name: node.name,
      type: node.type,
      properties: extractNodeProperties(node)
    }));

    const result = await syncWithMCPServer({
      action: 'generate-component',
      components: componentData,
      options: data.options
    });

    figma.ui.postMessage({
      type: MessageType.COMPONENT_GENERATED,
      data: result
    });
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to generate component'));
  }
}

// Update plugin settings
async function handleUpdateSettings(settings: any) {
  await figma.clientStorage.setAsync('settings', settings);
  
  figma.ui.postMessage({
    type: MessageType.SETTINGS_UPDATED,
    data: settings
  });
}

// Enable real-time sync
async function handleEnableRealtimeSync() {
  console.log('🔄 Enabling real-time sync...');
  
  setupRealtimeSync(async (tokens) => {
    // Apply tokens when received from WebSocket
    console.log('📨 Received real-time token update');
    
    try {
      await applyTokensToFigma(tokens);
      
      figma.ui.postMessage({
        type: MessageType.REALTIME_UPDATE,
        data: { tokens, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Failed to apply real-time token update:', error);
    }
  });
  
  figma.ui.postMessage({
    type: MessageType.REALTIME_STATUS,
    data: { enabled: true }
  });
}

// Disable real-time sync
async function handleDisableRealtimeSync() {
  console.log('🛑 Disabling real-time sync...');
  cleanupRealtimeSync();
  
  figma.ui.postMessage({
    type: MessageType.REALTIME_STATUS,
    data: { enabled: false }
  });
}

// Import tokens from JSON
async function handleImportTokens(tokens: any) {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Importing tokens...' }
  });

  try {
    // Convert imported tokens to unified format if needed
    let unifiedTokens = tokens;
    
    // Check if tokens have the right structure
    if (tokens.colors && Array.isArray(tokens.colors)) {
      // Legacy format - convert to unified format
      unifiedTokens = {
        colors: {
          name: 'Imported Colors',
          modes: [{ name: 'Default', modeId: 'default' }],
          variables: tokens.colors.map((color: any) => ({
            name: color.name.replace(/-/g, '/'),
            type: 'COLOR' as const,
            valuesByMode: {
              default: color.rgb || {
                r: parseInt(color.value.slice(1, 3), 16),
                g: parseInt(color.value.slice(3, 5), 16),
                b: parseInt(color.value.slice(5, 7), 16)
              }
            },
            scopes: ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'],
            description: color.description || ''
          }))
        },
        spacing: tokens.spacing ? {
          name: 'Imported Spacing',
          modes: [{ name: 'Default', modeId: 'default' }],
          variables: tokens.spacing.map((spacing: any) => ({
            name: spacing.name.replace(/-/g, '/'),
            type: 'FLOAT' as const,
            valuesByMode: { default: spacing.value },
            scopes: ['GAP', 'WIDTH_HEIGHT', 'CORNER_RADIUS'],
            description: spacing.description || `${spacing.value}px`
          }))
        } : null,
        typography: tokens.typography || [],
        effects: {
          shadows: tokens.shadows || [],
          borderRadius: tokens.borderRadius || []
        }
      };
    }
    
    // Apply tokens using atomic approach
    console.log('🎨 Applying imported tokens...');
    // Save tokens for retry functionality
    await figma.clientStorage.setAsync('lastSyncedTokens', { tokens: unifiedTokens });
    await applyTokensToFigmaAtomic(unifiedTokens);
    
    figma.ui.postMessage({
      type: MessageType.SYNC_COMPLETE,
      data: { 
        tokens: unifiedTokens,
        source: 'import',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to import tokens'));
  }
}

// Retry failed tokens
async function handleRetryFailedTokens(data: any) {
  const { tokens } = data;
  
  if (!tokens || tokens.length === 0) return;
  
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Retrying failed tokens...' }
  });
  
  try {
    // Get the original tokens from the last sync
    const settings = await figma.clientStorage.getAsync('lastSyncedTokens');
    if (!settings || !settings.tokens) {
      throw new Error('No tokens available to retry');
    }
    
    const originalTokens = settings.tokens;
    
    // Create a subset of tokens to retry
    const tokensToRetry: any = {
      colors: null,
      spacing: null,
      typography: [],
      effects: { shadows: [], borderRadius: [] }
    };
    
    // Filter tokens by category and name
    for (const { category, name } of tokens) {
      switch (category) {
        case 'Colors':
          if (!tokensToRetry.colors && originalTokens.colors) {
            tokensToRetry.colors = Object.assign({}, originalTokens.colors, {
              variables: originalTokens.colors.variables.filter((v: any) => 
                tokens.some((t: any) => t.category === 'Colors' && t.name === v.name)
              )
            });
          }
          break;
          
        case 'Spacing':
          if (!tokensToRetry.spacing && originalTokens.spacing) {
            tokensToRetry.spacing = Object.assign({}, originalTokens.spacing, {
              variables: originalTokens.spacing.variables.filter((v: any) => 
                tokens.some((t: any) => t.category === 'Spacing' && t.name === v.name)
              )
            });
          }
          break;
          
        case 'Typography':
          if (originalTokens.typography) {
            const typographyItem = originalTokens.typography.find((t: any) => t.name === name);
            if (typographyItem) {
              tokensToRetry.typography.push(typographyItem);
            }
          }
          break;
          
        case 'Shadows':
          if (originalTokens.effects && originalTokens.effects.shadows) {
            const shadowItem = originalTokens.effects.shadows.find((s: any) => s.name === name);
            if (shadowItem) {
              tokensToRetry.effects.shadows.push(shadowItem);
            }
          }
          break;
          
        case 'Border Radius':
          if (originalTokens.effects && originalTokens.effects.borderRadius) {
            const borderRadiusItem = originalTokens.effects.borderRadius.find((br: any) => br.name === name);
            if (borderRadiusItem) {
              tokensToRetry.effects.borderRadius.push(borderRadiusItem);
            }
          }
          break;
      }
    }
    
    // Apply only the failed tokens
    console.log('🔄 Retrying failed tokens...');
    await applyTokensToFigmaAtomic(tokensToRetry);
    
    figma.ui.postMessage({
      type: MessageType.SYNC_COMPLETE,
      data: { 
        tokens: tokensToRetry,
        source: 'retry',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Failed to retry tokens:', error);
    const enhancedError = formatError(error);
    const userMessage = createUserMessage(enhancedError, 'Failed to retry tokens');
    
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { 
        message: userMessage,
        details: enhancedError
      }
    });
  }
}

// Validate tokens
async function handleValidateTokens(tokens: any) {
  try {
    const validationResults = validateTokens(tokens);
    
    figma.ui.postMessage({
      type: 'VALIDATION_RESULTS',
      data: validationResults
    });
  } catch (error) {
    console.error('Validation error:', error);
  }
}

// Show validation details
async function handleShowValidationDetails(validationResults: any) {
  figma.ui.postMessage({
    type: MessageType.SHOW_VALIDATION_DETAILS_RESULT,
    data: validationResults
  });
}

// Generate Design System pages
async function handleGenerateDesignSystemPages() {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Generating Design System pages...' }
  });

  try {
    // Use the new design system page generator
    await generateDesignSystemPage();
    
    figma.ui.postMessage({
      type: 'PAGES_GENERATED',
      data: {
        success: true,
        message: 'Design System page created successfully with dynamic component extraction!',
        pages: {
          designSystem: '🎨 Design System'
        }
      }
    });
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to generate Design System page'));
  }
}

// Update/Refresh Design System pages with latest improvements
async function handleUpdateDesignSystemPages() {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Updating Design System pages with latest improvements...' }
  });

  try {
    // First check if pages exist
    await figma.loadAllPagesAsync();
    const allPages = figma.root.children;
    let hasDesignSystemPage = false;
    let hasComponentsPage = false;
    
    for (const page of allPages) {
      if (page.type === 'PAGE') {
        if (page.name === '🎨 Design System') {
          hasDesignSystemPage = true;
        } else if (page.name === '🧩 Universal Components') {
          hasComponentsPage = true;
        }
      }
    }
    
    if (!hasDesignSystemPage && !hasComponentsPage) {
      figma.ui.postMessage({
        type: 'ERROR',
        data: {
          message: 'No Design System pages found. Please generate them first using the "Generate Design System Pages" button.'
        }
      });
      return;
    }
    
    // Regenerate pages (this will update existing ones)
    const result = await generateDesignSystemPages();
    
    if (result.success) {
      figma.ui.postMessage({
        type: 'PAGES_UPDATED',
        data: {
          success: true,
          message: 'Design System pages updated successfully with latest improvements!\n\n✨ Updates applied:\n• Responsive layouts with auto-sizing\n• 8px grid system for consistent spacing\n• Improved elevation system\n• Better visual hierarchy\n• Enhanced component showcases',
          pages: {
            designSystem: result.pages.designSystem ? result.pages.designSystem.name : 'Design System',
            components: result.pages.components ? result.pages.components.name : 'Universal Components'
          }
        }
      });
    } else {
      throw new Error(result.errors.join(', '));
    }
  } catch (error) {
    const enhancedError = formatError(error);
    throw new Error(createUserMessage(enhancedError, 'Failed to update Design System pages'));
  }
}

// Helper function to extract node properties
function extractNodeProperties(node: SceneNode): any {
  const properties: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible
  };

  if ('width' in node && 'height' in node) {
    properties.size = {
      width: node.width,
      height: node.height
    };
  }

  if ('fills' in node) {
    properties.fills = node.fills;
  }

  if ('strokes' in node) {
    properties.strokes = node.strokes;
  }

  if ('effects' in node) {
    properties.effects = node.effects;
  }

  return properties;
}

// Handle frame inspection
async function handleInspectFrame(msg: PluginMessage) {
  const frameId = msg.data?.frameId;
  
  if (!frameId) {
    figma.ui.postMessage({
      type: MessageType.FRAME_INSPECTION_RESULT,
      data: { error: 'No frame ID provided' }
    });
    return;
  }
  
  try {
    const result = await inspectFrame(frameId);
    
    if (!result) {
      figma.ui.postMessage({
        type: MessageType.FRAME_INSPECTION_RESULT,
        data: { 
          id: frameId,
          error: `Frame with ID ${frameId} not found or inaccessible` 
        }
      });
      return;
    }
    
    // Add the frame ID to the result so the UI knows which frame this is for
    figma.ui.postMessage({
      type: MessageType.FRAME_INSPECTION_RESULT,
      data: Object.assign({}, result, { id: frameId })
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.FRAME_INSPECTION_RESULT,
      data: { 
        id: frameId,
        error: error instanceof Error ? error.message : 'Failed to inspect frame' 
      }
    });
  }
}

// Handle inspection of selected frame
async function handleInspectSelected() {
  try {
    const result = await inspectSelectedFrame();
    
    if (!result) {
      figma.ui.postMessage({
        type: 'FRAME_INSPECTION_RESULT',
        data: { error: 'No frame selected' }
      });
      return;
    }
    
    figma.ui.postMessage({
      type: 'FRAME_INSPECTION_RESULT',
      data: result
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'FRAME_INSPECTION_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to inspect selected frame' }
    });
  }
}

// Handle getting selection info
async function handleGetSelectionInfo() {
  try {
    const info = await getCurrentSelectionInfo();
    
    // Transform the data to match what the simple UI expects
    const frames = info.selection.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      path: item.path,
      page: info.currentPage,
      properties: undefined as any // We'll get detailed properties if needed
    }));
    
    // If we have selected items, get detailed info for the first one
    if (frames.length > 0 && figma.currentPage.selection.length > 0) {
      const node = figma.currentPage.selection[0];
      if ('width' in node && 'height' in node && 'x' in node && 'y' in node) {
        frames[0].properties = {
          width: node.width,
          height: node.height,
          x: node.x,
          y: node.y,
          layoutMode: 'layoutMode' in node ? node.layoutMode : undefined,
          layoutPositioning: 'layoutPositioning' in node ? node.layoutPositioning : undefined
        };
      }
    }
    
    // Send the message type expected by the simple UI
    figma.ui.postMessage({
      type: 'SELECTION_INFO',
      data: { frames }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'SELECTION_INFO',
      data: { 
        frames: [],
        error: error instanceof Error ? error.message : 'Failed to get selection info' 
      }
    });
  }
}

// Handle getting all pages
async function handleGetAllPages() {
  try {
    const pages = await getAllPages();
    
    figma.ui.postMessage({
      type: 'ALL_PAGES_RESULT',
      data: { pages }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'ALL_PAGES_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to get pages' }
    });
  }
}

// Handle getting element details
async function handleGetElementDetails(data: any) {
  const { nodeId } = data;
  
  if (!nodeId) {
    figma.ui.postMessage({
      type: 'ELEMENT_DETAILS_RESULT',
      data: { error: 'No node ID provided' }
    });
    return;
  }
  
  try {
    const details = await getElementDetails(nodeId);
    
    figma.ui.postMessage({
      type: 'ELEMENT_DETAILS_RESULT',
      data: details
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'ELEMENT_DETAILS_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to get element details' }
    });
  }
}

// Handle getting selection groups
async function handleGetSelectionGroups() {
  try {
    const groups = await getSelectionGroups();
    
    figma.ui.postMessage({
      type: 'SELECTION_GROUPS_RESULT',
      data: groups
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'SELECTION_GROUPS_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to get selection groups' }
    });
  }
}

// Handle getting all frames
async function handleGetAllFrames() {
  try {
    const frames = await getAllFrames();
    
    figma.ui.postMessage({
      type: 'ALL_FRAMES_RESULT',
      data: { frames }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'ALL_FRAMES_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to get frames' }
    });
  }
}

// Handle getting frame issues
async function handleGetFrameIssues(data: any) {
  const { frameId } = data;
  
  if (!frameId) {
    figma.ui.postMessage({
      type: 'FRAME_ISSUES_RESULT',
      data: { error: 'No frame ID provided' }
    });
    return;
  }
  
  try {
    const result = await getFrameIssues(frameId);
    
    figma.ui.postMessage({
      type: 'FRAME_ISSUES_RESULT',
      data: result
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'FRAME_ISSUES_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to analyze frame' }
    });
  }
}

// Handle frame editing
async function handleEditFrame(data: any) {
  const { frameId, options } = data;
  
  if (!frameId || !options) {
    figma.ui.postMessage({
      type: 'FRAME_EDIT_RESULT',
      data: { error: 'Missing frame ID or edit options' }
    });
    return;
  }
  
  try {
    const result = await editFrame(frameId, options);
    
    figma.ui.postMessage({
      type: 'FRAME_EDIT_RESULT',
      data: result
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'FRAME_EDIT_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to edit frame' }
    });
  }
}

// Handle editing selected frame
async function handleEditSelectedFrame(data: any) {
  const { options } = data;
  
  if (!options) {
    figma.ui.postMessage({
      type: 'FRAME_EDIT_RESULT',
      data: { error: 'No edit options provided' }
    });
    return;
  }
  
  try {
    const result = await editSelectedFrame(options);
    
    figma.ui.postMessage({
      type: 'FRAME_EDIT_RESULT',
      data: result
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'FRAME_EDIT_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to edit selected frame' }
    });
  }
}

// Handle creating preset frame
async function handleCreatePresetFrame(data: any) {
  const { preset } = data;
  
  if (!preset) {
    figma.ui.postMessage({
      type: 'FRAME_CREATE_RESULT',
      data: { error: 'No preset specified' }
    });
    return;
  }
  
  try {
    const frame = await createPresetFrame(preset);
    
    figma.ui.postMessage({
      type: 'FRAME_CREATE_RESULT',
      data: {
        success: true,
        frameId: frame.id,
        frameName: frame.name
      }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'FRAME_CREATE_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to create preset frame' }
    });
  }
}

// Handle fixing frame issues
async function handleFixFrameIssues(data: any) {
  const { frameId } = data;
  
  if (!frameId) {
    figma.ui.postMessage({
      type: 'FRAME_FIX_RESULT',
      data: { error: 'No frame ID provided' }
    });
    return;
  }
  
  try {
    const result = await fixFrameIssues(frameId);
    
    figma.ui.postMessage({
      type: 'FRAME_FIX_RESULT',
      data: result
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'FRAME_FIX_RESULT',
      data: { error: error instanceof Error ? error.message : 'Failed to fix frame issues' }
    });
  }
}

// Handle single frame mutation
async function handleMutateFrame(msg: PluginMessage) {
  const data = msg.data || {};
  const requestId = data.requestId;
  const frameId = data.frameId;
  const mutations = data.mutations;
  
  if (!frameId) {
    figma.ui.postMessage({
      type: MessageType.MUTATE_FRAME_RESULT,
      requestId: requestId,
      data: { success: false, error: 'No frame ID provided' }
    });
    return;
  }
  
  try {
    const node = await figma.getNodeByIdAsync(frameId);
    if (!node) {
      throw new Error('Frame not found');
    }
    
    // Apply mutations based on type
    if ('width' in mutations && node.type === 'FRAME') {
      (node as FrameNode).resize(mutations.width, node.height);
    }
    if ('height' in mutations && node.type === 'FRAME') {
      (node as FrameNode).resize(node.width, mutations.height);
    }
    if ('name' in mutations) {
      node.name = mutations.name;
    }
    if ('visible' in mutations && 'visible' in node) {
      node.visible = mutations.visible;
    }
    
    figma.ui.postMessage({
      type: MessageType.MUTATE_FRAME_RESULT,
      requestId,
      data: { success: true }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.MUTATE_FRAME_RESULT,
      requestId,
      data: { success: false, error: error instanceof Error ? error.message : String(error) }
    });
  }
}

// Handle batch frame mutations
async function handleBatchMutateFrames(msg: PluginMessage) {
  const { requestId, mutations } = msg.data || {};
  
  if (!mutations || !Array.isArray(mutations)) {
    figma.ui.postMessage({
      type: MessageType.BATCH_MUTATE_FRAMES_RESULT,
      requestId,
      data: { success: false, error: 'Invalid mutations array' }
    });
    return;
  }
  
  try {
    const results = await Promise.all(
      mutations.map(async ({ frameId, changes }) => {
        try {
          const node = await figma.getNodeByIdAsync(frameId);
          if (!node) return { frameId, success: false, error: 'Node not found' };
          
          // Apply changes
          if ('width' in changes && node.type === 'FRAME') {
            (node as FrameNode).resize(changes.width, node.height);
          }
          if ('height' in changes && node.type === 'FRAME') {
            (node as FrameNode).resize(node.width, changes.height);
          }
          if ('name' in changes) {
            node.name = changes.name;
          }
          if ('visible' in changes && 'visible' in node) {
            node.visible = changes.visible;
          }
          
          return { frameId, success: true };
        } catch (error) {
          return { frameId, success: false, error: error instanceof Error ? error.message : String(error) };
        }
      })
    );
    
    figma.ui.postMessage({
      type: MessageType.BATCH_MUTATE_FRAMES_RESULT,
      requestId,
      data: { success: true, results }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.BATCH_MUTATE_FRAMES_RESULT,
      requestId,
      data: { success: false, error: error instanceof Error ? error.message : String(error) }
    });
  }
}

// Import statement is already at the top, so we don't need this function anymore
// The applyTokensToFigma is now imported from token-applier.ts

// Handle analyzing selected components
async function handleAnalyzeComponents() {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Analyzing selected components...' }
  });

  try {
    const analyses = await analyzeSelectedComponents();
    
    if (analyses.length === 0) {
      figma.ui.postMessage({
        type: MessageType.COMPONENT_ANALYSIS_RESULT,
        data: { 
          error: 'No components selected or found. Please select component(s) to analyze.' 
        }
      });
      return;
    }
    
    // Send detailed analysis results
    figma.ui.postMessage({
      type: MessageType.COMPONENT_ANALYSIS_RESULT,
      data: {
        success: true,
        analyses: analyses.map(analysis => ({
          name: analysis.component.name,
          type: analysis.component.type,
          dimensions: analysis.structure.dimensions,
          autoLayout: analysis.structure.autoLayout,
          variants: analysis.variants,
          usage: analysis.usage,
          structure: analysis.structure
        }))
      }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { 
        message: error instanceof Error ? error.message : 'Failed to analyze components' 
      }
    });
  }
}

// Initialize plugin
async function initialize() {
  console.log('🔧 Initializing plugin...');
  
  // Check if we're in query mode (codegen)
  if (figma.mode === 'codegen') {
    console.log('🚫 Plugin running in codegen/query mode - UI not available');
    figma.closePlugin('This plugin requires UI mode. Please run it from the plugins menu.');
    return;
  }
  
  // Check if we have a valid page context
  if (!figma.currentPage) {
    console.error('❌ No current page available');
    return;
  }
  
  console.log('📄 Current page:', figma.currentPage.name);
  console.log('🔍 Plugin mode:', figma.mode);
  console.log('📝 Editor type:', figma.editorType);
  
  // Show UI after confirming we have context
  figma.showUI(__html__, {
    width: 900,
    height: 600,
    title: 'Design System Agent'
  });
  
  // Listen for selection changes
  figma.on('selectionchange', () => {
    figma.ui.postMessage({
      type: 'SELECTION_CHANGED',
      selection: figma.currentPage.selection.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
      })),
    });
  });
  
  console.log('🖼️ UI shown');
  
  // Small delay to ensure UI is ready
  setTimeout(async () => {
    // Load saved settings
    const settings = await figma.clientStorage.getAsync('settings');
    
    // Get plugin parameters
    const parameters = figma.parameters;
    
    figma.ui.postMessage({
      type: MessageType.INIT,
      data: {
        settings: settings || {},
        fileName: figma.root.name,
        selection: figma.currentPage.selection.length,
        parameters: parameters
      }
    });
    
    console.log('📨 Init message sent to UI');
    
    // Handle initial action from parameters (removed from manifest for now)
    // if (parameters && parameters.action === 'extract') {
    //   setTimeout(() => {
    //     handleExtractTokens();
    //   }, 500);
    // }
  }, 100);
}

// Handle extracting colors from selection
async function handleExtractColors() {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Extracting colors from selection...' }
  });

  try {
    const result = await extractColors();
    
    figma.ui.postMessage({
      type: MessageType.COLOR_EXTRACTION_RESULT,
      data: {
        success: true,
        extractedColors: result.extractedColors,
        categories: result.categories,
        themePreview: result.themePreview,
        tokens: result.tokens
      }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { 
        message: error instanceof Error ? error.message : 'Failed to extract colors' 
      }
    });
  }
}

// Handle syncing extracted colors to codebase
async function handleSyncExtractedColors(data: any) {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Syncing extracted colors to codebase...' }
  });

  try {
    await syncExtractedColors(data.result);
    
    figma.ui.postMessage({
      type: MessageType.COLOR_SYNC_RESULT,
      data: {
        success: true,
        message: 'Colors successfully synced to codebase!'
      }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { 
        message: error instanceof Error ? error.message : 'Failed to sync colors' 
      }
    });
  }
}

// Handle applying extracted theme to current page
async function handleApplyExtractedTheme(data: any) {
  figma.ui.postMessage({
    type: MessageType.LOADING,
    data: { message: 'Applying extracted theme...' }
  });

  try {
    await applyExtractedTheme(data.theme);
    
    figma.ui.postMessage({
      type: MessageType.THEME_APPLIED_RESULT,
      data: {
        success: true,
        message: 'Theme successfully applied to current page!'
      }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { 
        message: error instanceof Error ? error.message : 'Failed to apply theme' 
      }
    });
  }
}

// Typography System Generation
async function handleGenerateTypographySystem() {
  try {
    // Use enhanced typography generator with pause/resume support
    await typographyGenerator.generate({
      extractFromCode: true,
      includeResponsive: true,
      createVariants: true,
      fontFamilies: ['Inter', 'system-ui'],
      baseSize: 16,
      scale: 1.25
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { 
        message: error instanceof Error ? error.message : 'Failed to generate typography system' 
      }
    });
  }
}

// Spacing System Generation
async function handleGenerateSpacingSystem() {
  try {
    // Use enhanced spacing generator with pause/resume support
    await spacingGenerator.generate({
      extractFromCode: true,
      baseUnit: 4,
      scaleType: 'linear',
      includeNegative: true,
      includeComponents: true,
      includeGrids: true,
      generateVariables: true
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { 
        message: error instanceof Error ? error.message : 'Failed to generate spacing system' 
      }
    });
  }
}

// Component Library Generation
async function handleGenerateComponentLibrary() {
  try {
    // Use the component library generator with operation tracking
    await componentLibraryGenerator.generate({
      includeVariants: true,
      includeStates: true,
      includeResponsive: true,
      includeAnimations: false,
      includeDocumentation: true,
      targetFramework: 'react',
      styleSystem: 'tailwind',
      outputFormat: 'typescript',
      componentPrefix: 'UI',
      generateStorybook: true,
      generateTests: true
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { 
        message: error instanceof Error ? error.message : 'Failed to generate component library' 
      }
    });
  }
}

// Export Design Documentation
async function handleExportDesignDocumentation() {
  try {
    // Use the design documentation exporter with operation tracking
    await designDocumentationExporter.export({
      includeColors: true,
      includeTypography: true,
      includeSpacing: true,
      includeComponents: true,
      includeIcons: true,
      includePatterns: true,
      includeGuidelines: true,
      includeAccessibility: true,
      format: 'markdown',
      includeScreenshots: true,
      includeCodeExamples: true,
      language: 'en'
    });
  } catch (error) {
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { 
        message: error instanceof Error ? error.message : 'Failed to export documentation' 
      }
    });
  }
}

// Operation Control Handlers
async function handlePauseOperation(data: any) {
  const { operationId } = data || {};
  
  if (operationId) {
    // Pause specific operation
    operationQueue.pauseQueue();
    figma.ui.postMessage({
      type: MessageType.OPERATION_PAUSED,
      data: { operationId }
    });
  } else {
    // Pause all operations
    operationQueue.pauseQueue();
    figma.ui.postMessage({
      type: MessageType.OPERATION_PAUSED,
      data: { message: 'All operations paused' }
    });
  }
}

async function handleResumeOperation(data: any) {
  const { operationId } = data || {};
  
  if (operationId) {
    // Resume specific operation
    await operationQueue.resumeQueue();
    figma.ui.postMessage({
      type: MessageType.OPERATION_RESUMED,
      data: { operationId }
    });
  } else {
    // Resume all operations
    await operationQueue.resumeQueue();
    figma.ui.postMessage({
      type: MessageType.OPERATION_RESUMED,
      data: { message: 'All operations resumed' }
    });
  }
}

async function handleCancelOperation(data: any) {
  const { operationId } = data || {};
  
  if (!operationId) {
    figma.ui.postMessage({
      type: MessageType.ERROR,
      data: { message: 'Operation ID required for cancellation' }
    });
    return;
  }
  
  const success = operationQueue.cancelOperation(operationId);
  
  figma.ui.postMessage({
    type: MessageType.OPERATION_CANCELLED,
    data: { 
      operationId,
      success,
      message: success ? 'Operation cancelled' : 'Operation not found or already completed'
    }
  });
}

async function handleGetOperationStatus() {
  const status = operationQueue.getQueueStatus();
  const operations = syncStateManager.getOperationSummary();
  
  figma.ui.postMessage({
    type: MessageType.OPERATION_STATUS,
    data: {
      queue: status,
      operations: operations,
      timestamp: new Date().toISOString()
    }
  });
}

// Handle menu commands
if (figma.command) {
  handleMenuCommand(figma.command);
} else {
  // Start the plugin with error handling
  try {
    initialize();
  } catch (error) {
    console.error('❌ Failed to initialize plugin:', error);
  }
}

// Handle menu commands
async function handleMenuCommand(command: string) {
  console.log('📋 Menu command:', command);
  
  // Show UI first for most commands
  const uiCommands = [
    'open-plugin', 'extract-tokens', 'sync-to-code', 'sync-from-code',
    'open-inspector', 'open-ai-assistant', 'open-settings'
  ];
  
  if (uiCommands.includes(command)) {
    initialize();
  }
  
  // Wait a bit for UI to initialize
  await new Promise(resolve => setTimeout(resolve, 500));
  
  switch (command) {
    case 'open-plugin':
      // Just initialize the UI, no special action needed
      break;
      
    case 'extract-tokens':
      await handleExtractTokens();
      break;
      
    case 'sync-to-code':
      figma.ui.postMessage({ type: MessageType.SYNC_TO_CODE });
      break;
      
    case 'sync-from-code':
      await handleSyncFromCode();
      break;
      
    case 'generate-typography':
      await handleGenerateTypographySystem();
      break;
      
    case 'generate-spacing':
      await handleGenerateSpacingSystem();
      break;
      
    case 'generate-components':
      await handleGenerateComponentLibrary();
      break;
      
    case 'export-documentation':
      await handleExportDesignDocumentation();
      break;
      
    case 'open-inspector':
      figma.ui.postMessage({ 
        type: MessageType.NAVIGATE_TO_TAB,
        data: { tab: 'inspector' }
      });
      break;
      
    case 'open-ai-assistant':
      figma.ui.postMessage({ 
        type: MessageType.NAVIGATE_TO_TAB,
        data: { tab: 'agent' }
      });
      break;
      
    case 'open-settings':
      figma.ui.postMessage({ 
        type: MessageType.NAVIGATE_TO_TAB,
        data: { tab: 'settings' }
      });
      break;
      
    default:
      console.error('Unknown command:', command);
  }
}