import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useFigmaBridge } from '../lib/figma-bridge';
import { useDesignSystemStore, usePluginStore } from '../stores';
import {
  BentoCard,
  BentoSection,
  BentoButton,
  BentoTabs,
  BentoTabPanel,
  ScrollContainer,
  BentoEmptyState
} from '../components/Bento';
import { 
  Palette,
  Type,
  Grid3X3,
  Package,
  BookOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
  FileCode,
  Download,
  Upload,
  Copy,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Route = createFileRoute('/design-system')({
  component: DesignSystemPage,
});

function DesignSystemPage() {
  const { sendMessage, isConnected } = useFigmaBridge();
  const { addNotification } = usePluginStore();
  const {
    colorTokens,
    typographyTokens,
    spacingTokens,
    componentTokens,
    activeTab,
    isLoading,
    error,
    setColorTokens,
    setTypographyTokens,
    setSpacingTokens,
    setComponentTokens,
    setActiveTab,
    setLoading,
    setError,
    syncTokens,
    exportTokens,
    clearTokens
  } = useDesignSystemStore();

  // Listen for messages from Figma
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data.pluginMessage;
      if (!message) return;

      switch (message.type) {
        case 'PAGES_GENERATED':
          addNotification({
            type: 'success',
            title: 'Design System Generated',
            message: message.data.message,
            dismissible: true
          });
          setLoading(false);
          break;
        
        case 'COLOR_TOKENS_EXTRACTED':
          setColorTokens(message.data.colors);
          setLoading(false);
          break;
        
        case 'TYPOGRAPHY_DATA':
          setTypographyTokens(message.data.tokens);
          setLoading(false);
          break;
        
        case 'SPACING_DATA':
          setSpacingTokens(message.data.tokens);
          setLoading(false);
          break;
        
        case 'COMPONENT_DATA':
          setComponentTokens(message.data.components);
          setLoading(false);
          break;
        
        case 'ERROR':
          setError(message.data.message);
          addNotification({
            type: 'error',
            title: 'Generation Failed',
            message: message.data.message,
            dismissible: true
          });
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGenerateColors = async () => {
    setLoading(true);
    setError(null);
    sendMessage({ type: 'GENERATE_DESIGN_SYSTEM_PAGES' });
  };

  const handleGenerateTypography = async () => {
    setLoading(true);
    setError(null);
    sendMessage({ type: 'GENERATE_TYPOGRAPHY_SYSTEM' });
  };

  const handleGenerateSpacing = async () => {
    setLoading(true);
    setError(null);
    sendMessage({ type: 'GENERATE_SPACING_SYSTEM' });
  };

  const handleGenerateComponents = async () => {
    setLoading(true);
    setError(null);
    sendMessage({ type: 'GENERATE_COMPONENT_LIBRARY' });
  };

  const handleExportDocumentation = async () => {
    try {
      const format = 'json'; // Could be made configurable
      const data = await exportTokens(format);
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `design-system-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        type: 'success',
        title: 'Export Successful',
        message: 'Design system exported successfully',
        dismissible: true
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Failed to export',
        dismissible: true
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center">
        <BentoCard variant="default" className="max-w-sm">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-figma-text-secondary mx-auto mb-4" />
            <h3 className="text-figma-base font-medium mb-2">Connecting to Figma</h3>
            <p className="text-figma-sm text-figma-text-secondary">
              Waiting for connection...
            </p>
          </div>
        </BentoCard>
      </div>
    );
  }

  const tabs = [
    { id: 'colors', label: 'Colors', icon: Palette, badge: colorTokens.length || undefined },
    { id: 'typography', label: 'Typography', icon: Type, badge: typographyTokens.length || undefined },
    { id: 'spacing', label: 'Spacing', icon: Grid3X3, badge: spacingTokens.length || undefined },
    { id: 'components', label: 'Components', icon: Package, badge: componentTokens.length || undefined },
    { id: 'documentation', label: 'Documentation', icon: BookOpen }
  ];

  return (
    <div className="h-full flex flex-col bg-figma-bg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-figma-border bg-figma-surface">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-figma-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-figma-blue" />
              Design System Generator
            </h1>
            <p className="text-figma-sm text-figma-text-secondary">
              Generate and manage your design system in Figma
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BentoButton
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              onClick={syncTokens}
              loading={isLoading}
              title="Sync All"
            />
            <BentoButton
              size="sm"
              variant="ghost"
              icon={Download}
              onClick={handleExportDocumentation}
              title="Export"
            />
            <BentoButton
              size="sm"
              variant="ghost"
              icon={Settings}
              onClick={() => console.log('Settings')}
              title="Settings"
            />
          </div>
        </div>

        {/* Tabs */}
        <BentoTabs
          tabs={tabs}
          defaultTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId)}
          variant="default"
          size="md"
          fullWidth
        />
      </div>

      {/* Content */}
      <ScrollContainer className="flex-1">
        <div className="p-6 max-w-5xl mx-auto">
          {activeTab === 'colors' && (
            <ColorSystemTab 
              colorTokens={colorTokens}
              onGenerate={handleGenerateColors}
              isLoading={isLoading}
              error={error}
            />
          )}
          
          {activeTab === 'typography' && (
            <TypographySystemTab
              typographyTokens={typographyTokens}
              onGenerate={handleGenerateTypography}
              isLoading={isLoading}
              error={error}
            />
          )}
          
          {activeTab === 'spacing' && (
            <SpacingSystemTab
              spacingTokens={spacingTokens}
              onGenerate={handleGenerateSpacing}
              isLoading={isLoading}
              error={error}
            />
          )}
          
          {activeTab === 'components' && (
            <ComponentLibraryTab
              componentTokens={componentTokens}
              onGenerate={handleGenerateComponents}
              isLoading={isLoading}
              error={error}
            />
          )}
          
          {activeTab === 'documentation' && (
            <DocumentationTab
              onExport={handleExportDocumentation}
              isLoading={isLoading}
              allTokens={{
                colors: colorTokens,
                typography: typographyTokens,
                spacing: spacingTokens,
                components: componentTokens
              }}
            />
          )}
        </div>
      </ScrollContainer>
    </div>
  );
}

// Color System Tab
function ColorSystemTab({ colorTokens, onGenerate, isLoading, error }: {
  colorTokens: any[];
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <BentoCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-figma-base font-medium mb-2 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Color System Generator
            </h2>
            <p className="text-figma-sm text-figma-text-secondary mb-4">
              Generate a comprehensive color system with swatches for both light and dark modes.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Creates color swatches for all theme colors</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Organized by categories: Base, Semantic, UI</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Displays color name, hex value, and usage</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Synced with your codebase theme</span>
              </div>
            </div>

            <BentoButton
              onClick={onGenerate}
              loading={isLoading}
              icon={Sparkles}
              variant="primary"
            >
              Generate Color System
            </BentoButton>
          </div>
        </div>
      </BentoCard>

      {error && (
        <BentoCard variant="danger">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="text-figma-sm font-medium">Generation Failed</p>
              <p className="text-figma-xs text-figma-text-secondary mt-1">{error}</p>
            </div>
          </div>
        </BentoCard>
      )}

      {colorTokens.length > 0 && (
        <BentoSection title="Color Tokens" description={`${colorTokens.length} colors extracted`}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {colorTokens.map((token) => (
              <div key={token.id} className="p-3 border border-figma-border rounded-lg hover:bg-figma-hover transition-colors">
                <div 
                  className="w-full h-16 rounded mb-2 border border-figma-border"
                  style={{ backgroundColor: token.hex }}
                />
                <div className="text-figma-xs font-medium truncate">{token.name}</div>
                <div className="text-figma-xs text-figma-text-secondary">{token.hex}</div>
                {token.usage && token.usage.length > 0 && (
                  <div className="text-figma-xs text-figma-text-tertiary mt-1">
                    {token.usage[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </BentoSection>
      )}
    </div>
  );
}

// Typography System Tab
function TypographySystemTab({ typographyTokens, onGenerate, isLoading, error }: {
  typographyTokens: any[];
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <BentoCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-figma-base font-medium mb-2 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Typography System
            </h2>
            <p className="text-figma-sm text-figma-text-secondary mb-4">
              Extract and visualize typography scales from your codebase.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Extracts font families, sizes, and weights</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Creates text styles in Figma</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Generates typography scale documentation</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Includes line height and letter spacing</span>
              </div>
            </div>

            <BentoButton
              onClick={onGenerate}
              loading={isLoading}
              icon={Type}
              variant="primary"
            >
              Generate Typography System
            </BentoButton>
          </div>
        </div>
      </BentoCard>

      {typographyTokens.length > 0 && (
        <BentoSection title="Typography Scale" description={`${typographyTokens.length} text styles`}>
          <div className="space-y-4">
            {typographyTokens.map((token) => (
              <div key={token.id} className="p-4 border border-figma-border rounded-lg">
                <div 
                  style={{
                    fontFamily: token.fontFamily,
                    fontSize: `${token.fontSize}px`,
                    fontWeight: token.fontWeight,
                    lineHeight: token.lineHeight,
                    letterSpacing: `${token.letterSpacing}px`
                  }}
                  className="mb-2"
                >
                  {token.name}
                </div>
                <div className="flex flex-wrap gap-4 text-figma-xs text-figma-text-secondary">
                  <span>{token.fontFamily}</span>
                  <span>{token.fontSize}px</span>
                  <span>Weight: {token.fontWeight}</span>
                  <span>Line: {token.lineHeight}</span>
                </div>
              </div>
            ))}
          </div>
        </BentoSection>
      )}
    </div>
  );
}

// Spacing System Tab
function SpacingSystemTab({ spacingTokens, onGenerate, isLoading, error }: {
  spacingTokens: any[];
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <BentoCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-figma-base font-medium mb-2 flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Spacing & Layout System
            </h2>
            <p className="text-figma-sm text-figma-text-secondary mb-4">
              Visualize spacing tokens and create layout components.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Creates spacing scale visualization</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Generates spacing components</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Includes grid templates</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Responsive breakpoint guides</span>
              </div>
            </div>

            <BentoButton
              onClick={onGenerate}
              loading={isLoading}
              icon={Grid3X3}
              variant="primary"
            >
              Generate Spacing System
            </BentoButton>
          </div>
        </div>
      </BentoCard>

      {spacingTokens.length > 0 && (
        <BentoSection title="Spacing Scale" description={`${spacingTokens.length} spacing values`}>
          <div className="space-y-3">
            {spacingTokens.map((token) => (
              <div key={token.id} className="flex items-center gap-4">
                <div className="text-figma-sm font-medium w-20">{token.name}</div>
                <div 
                  className="h-8 bg-figma-blue rounded"
                  style={{ width: token.pixelValue }}
                />
                <div className="text-figma-xs text-figma-text-secondary">
                  {token.pixelValue} / {token.remValue}
                </div>
              </div>
            ))}
          </div>
        </BentoSection>
      )}
    </div>
  );
}

// Component Library Tab
function ComponentLibraryTab({ componentTokens, onGenerate, isLoading, error }: {
  componentTokens: any[];
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  const componentTypes = [
    { id: 'buttons', label: 'Buttons', checked: true },
    { id: 'inputs', label: 'Inputs', checked: true },
    { id: 'cards', label: 'Cards', checked: true },
    { id: 'modals', label: 'Modals', checked: true },
    { id: 'navigation', label: 'Navigation', checked: true },
    { id: 'badges', label: 'Badges', checked: true }
  ];

  return (
    <div className="space-y-6">
      <BentoCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-figma-base font-medium mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Component Library Generator
            </h2>
            <p className="text-figma-sm text-figma-text-secondary mb-4">
              Generate a library of common UI components with variants.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Creates buttons, inputs, cards, and more</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Includes size and state variants</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Follows your design system tokens</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Auto-layout enabled components</span>
              </div>
            </div>

            <BentoSection 
              title="Components to Generate" 
              className="mb-6"
              variant="flush"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {componentTypes.map((type) => (
                  <label key={type.id} className="flex items-center gap-2 text-figma-sm">
                    <input 
                      type="checkbox" 
                      defaultChecked={type.checked}
                      className="rounded border-figma-border"
                    />
                    {type.label}
                  </label>
                ))}
              </div>
            </BentoSection>

            <BentoButton
              onClick={onGenerate}
              loading={isLoading}
              icon={Package}
              variant="primary"
            >
              Generate Component Library
            </BentoButton>
          </div>
        </div>
      </BentoCard>

      {componentTokens.length > 0 && (
        <BentoSection title="Generated Components" description={`${componentTokens.length} components`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {componentTokens.map((component) => (
              <BentoCard key={component.id} variant="subtle">
                <h4 className="text-figma-sm font-medium mb-2">{component.name}</h4>
                <p className="text-figma-xs text-figma-text-secondary mb-3">
                  Type: {component.type}
                </p>
                {component.variants && (
                  <div className="text-figma-xs">
                    <span className="text-figma-text-secondary">Variants: </span>
                    {Object.keys(component.variants).join(', ')}
                  </div>
                )}
              </BentoCard>
            ))}
          </div>
        </BentoSection>
      )}
    </div>
  );
}

// Documentation Tab
function DocumentationTab({ onExport, isLoading, allTokens }: {
  onExport: () => void;
  isLoading: boolean;
  allTokens: any;
}) {
  const tokenCount = 
    allTokens.colors.length + 
    allTokens.typography.length + 
    allTokens.spacing.length + 
    allTokens.components.length;

  return (
    <div className="space-y-6">
      <BentoCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-figma-base font-medium mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Design Documentation
            </h2>
            <p className="text-figma-sm text-figma-text-secondary mb-4">
              Export comprehensive documentation of your design system.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Exports all design tokens</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Includes component specifications</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Generates usage guidelines</span>
              </div>
              <div className="flex items-start gap-2 text-figma-sm">
                <CheckCircle className="w-4 h-4 text-figma-green mt-0.5" />
                <span>Creates markdown documentation</span>
              </div>
            </div>

            <div className="flex gap-3">
              <BentoButton
                onClick={onExport}
                loading={isLoading}
                icon={Download}
                variant="primary"
              >
                Export Documentation
              </BentoButton>
              <BentoButton
                onClick={() => console.log('Preview')}
                icon={FileCode}
                variant="secondary"
              >
                Preview
              </BentoButton>
            </div>
          </div>
        </div>
      </BentoCard>

      <BentoSection title="Token Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BentoCard variant="subtle">
            <div className="text-center">
              <Palette className="w-8 h-8 text-figma-blue mx-auto mb-2" />
              <div className="text-2xl font-semibold">{allTokens.colors.length}</div>
              <div className="text-figma-xs text-figma-text-secondary">Colors</div>
            </div>
          </BentoCard>
          
          <BentoCard variant="subtle">
            <div className="text-center">
              <Type className="w-8 h-8 text-figma-blue mx-auto mb-2" />
              <div className="text-2xl font-semibold">{allTokens.typography.length}</div>
              <div className="text-figma-xs text-figma-text-secondary">Typography</div>
            </div>
          </BentoCard>
          
          <BentoCard variant="subtle">
            <div className="text-center">
              <Grid3X3 className="w-8 h-8 text-figma-blue mx-auto mb-2" />
              <div className="text-2xl font-semibold">{allTokens.spacing.length}</div>
              <div className="text-figma-xs text-figma-text-secondary">Spacing</div>
            </div>
          </BentoCard>
          
          <BentoCard variant="subtle">
            <div className="text-center">
              <Package className="w-8 h-8 text-figma-blue mx-auto mb-2" />
              <div className="text-2xl font-semibold">{allTokens.components.length}</div>
              <div className="text-figma-xs text-figma-text-secondary">Components</div>
            </div>
          </BentoCard>
        </div>
      </BentoSection>

      {tokenCount > 0 && (
        <BentoSection title="Export Options">
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-figma-border rounded-lg hover:bg-figma-hover cursor-pointer">
              <input type="radio" name="format" value="json" defaultChecked className="text-figma-blue" />
              <div>
                <div className="text-figma-sm font-medium">JSON Format</div>
                <div className="text-figma-xs text-figma-text-secondary">
                  Machine-readable format for development
                </div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border border-figma-border rounded-lg hover:bg-figma-hover cursor-pointer">
              <input type="radio" name="format" value="css" className="text-figma-blue" />
              <div>
                <div className="text-figma-sm font-medium">CSS Variables</div>
                <div className="text-figma-xs text-figma-text-secondary">
                  Ready-to-use CSS custom properties
                </div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border border-figma-border rounded-lg hover:bg-figma-hover cursor-pointer">
              <input type="radio" name="format" value="scss" className="text-figma-blue" />
              <div>
                <div className="text-figma-sm font-medium">SCSS Variables</div>
                <div className="text-figma-xs text-figma-text-secondary">
                  Sass variables for preprocessing
                </div>
              </div>
            </label>
          </div>
        </BentoSection>
      )}
    </div>
  );
}