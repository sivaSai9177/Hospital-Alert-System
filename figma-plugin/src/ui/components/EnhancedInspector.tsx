import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '../lib/utils';
import { ElementTreeView } from './ElementTreeView';
import {
  Search,
  Filter,
  Download,
  Copy,
  RefreshCw,
  Maximize2,
  Minimize2,
  Info,
  AlertCircle,
  CheckCircle,
  Code,
  Palette,
  Layout,
  Settings,
  Eye,
  EyeOff,
  Layers,
  ChevronRight,
  ChevronDown,
  FileText,
  Share2,
  Sparkles
} from 'lucide-react';

interface InspectorFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  action: (element: any) => void;
}

interface EnhancedInspectorProps {
  selection: any[];
  inspectionResults: Map<string, any>;
  onInspectElement: (elementId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const EnhancedInspector: React.FC<EnhancedInspectorProps> = ({
  selection,
  inspectionResults,
  onInspectElement,
  onRefresh,
  isLoading = false
}) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'tree' | 'visual' | 'code'>('tree');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['properties']));
  
  const currentElement = selectedElementId ? inspectionResults.get(selectedElementId) : null;

  // Smart features for the selected element
  const smartFeatures: InspectorFeature[] = useMemo(() => {
    if (!currentElement) return [];
    
    const features: InspectorFeature[] = [];
    
    // Color extraction for elements with fills
    if (currentElement.fills?.length > 0) {
      features.push({
        id: 'extract-colors',
        title: 'Extract Colors',
        description: 'Get color palette from this element',
        icon: Palette,
        color: 'text-purple-500',
        action: (element) => console.log('Extract colors from', element)
      });
    }
    
    // Layout analysis for frames
    if (currentElement.type === 'FRAME' || currentElement.autoLayout) {
      features.push({
        id: 'analyze-layout',
        title: 'Analyze Layout',
        description: 'Get layout insights and suggestions',
        icon: Layout,
        color: 'text-blue-500',
        action: (element) => console.log('Analyze layout', element)
      });
    }
    
    // Code generation
    features.push({
      id: 'generate-code',
      title: 'Generate Code',
      description: 'Convert to React/React Native component',
      icon: Code,
      color: 'text-green-500',
      action: (element) => console.log('Generate code', element)
    });
    
    // AI suggestions
    features.push({
      id: 'ai-suggestions',
      title: 'AI Suggestions',
      description: 'Get design improvements from Claude',
      icon: Sparkles,
      color: 'text-pink-500',
      action: (element) => console.log('Get AI suggestions', element)
    });
    
    return features;
  }, [currentElement]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSelectElement = (element: any) => {
    setSelectedElementId(element.id);
    if (!inspectionResults.has(element.id)) {
      onInspectElement(element.id);
    }
  };

  const exportData = () => {
    const data = {
      selection: selection,
      inspectionResults: Array.from(inspectionResults.entries()).map(([id, result]) => ({
        id,
        ...result
      })),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `figma-inspection-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (currentElement) {
      navigator.clipboard.writeText(JSON.stringify(currentElement, null, 2));
    }
  };

  return (
    <div className="h-full flex flex-col bg-figma-bg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-figma-border bg-figma-surface">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-figma-base font-semibold">Element Inspector</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={copyToClipboard}
              className="p-1.5 hover:bg-figma-hover rounded transition-colors"
              title="Copy JSON"
              disabled={!currentElement}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={exportData}
              className="p-1.5 hover:bg-figma-hover rounded transition-colors"
              title="Export Data"
            >
              <Download className="w-4 h-4" />
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 hover:bg-figma-hover rounded transition-colors"
                title="Refresh"
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            )}
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex gap-1">
          {[
            { id: 'tree', label: 'Tree', icon: Layers },
            { id: 'visual', label: 'Visual', icon: Eye },
            { id: 'code', label: 'Code', icon: Code }
          ].map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as any)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-figma-xs font-medium transition-colors",
                  activeView === view.id
                    ? "bg-figma-blue text-white"
                    : "text-figma-text-secondary hover:text-figma-text hover:bg-figma-hover"
                )}
              >
                <Icon className="w-3 h-3" />
                {view.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Tree/Selection */}
        <div className="w-64 border-r border-figma-border flex flex-col">
          <div className="p-3 border-b border-figma-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-figma-text-secondary" />
              <input
                type="text"
                placeholder="Search elements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 bg-figma-surface text-figma-xs rounded border border-figma-border focus:border-figma-blue outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selection.length === 0 ? (
              <div className="p-4 text-center">
                <Layers className="w-8 h-8 text-figma-text-tertiary mx-auto mb-2" />
                <p className="text-figma-xs text-figma-text-secondary">
                  Select elements in Figma to inspect
                </p>
              </div>
            ) : (
              <div className="p-2">
                {selection.map((item) => {
                  const result = inspectionResults.get(item.id);
                  if (!result || result.error) return null;

                  return (
                    <div key={item.id} className="mb-2">
                      <ElementTreeView
                        element={result.hierarchy || item}
                        onSelectElement={handleSelectElement}
                        selectedElementId={selectedElementId}
                        expandAll={false}
                        showProperties={false}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Details */}
        <div className="flex-1 overflow-y-auto">
          {!currentElement ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Info className="w-8 h-8 text-figma-text-tertiary mx-auto mb-2" />
                <p className="text-figma-sm text-figma-text-secondary">
                  Select an element to view details
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Smart Features */}
              {smartFeatures.length > 0 && (
                <div>
                  <h3 className="text-figma-sm font-medium mb-2">Smart Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {smartFeatures.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <button
                          key={feature.id}
                          onClick={() => feature.action(currentElement)}
                          className="flex items-start gap-2 p-2 rounded-lg border border-figma-border hover:bg-figma-hover transition-colors"
                        >
                          <Icon className={cn("w-4 h-4 mt-0.5", feature.color)} />
                          <div className="text-left">
                            <div className="text-figma-xs font-medium">{feature.title}</div>
                            <div className="text-figma-xs text-figma-text-secondary">
                              {feature.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* View Content */}
              {activeView === 'tree' && (
                <div className="space-y-3">
                  {/* Properties Section */}
                  <CollapsibleSection
                    title="Properties"
                    isExpanded={expandedSections.has('properties')}
                    onToggle={() => toggleSection('properties')}
                  >
                    <PropertyList element={currentElement} />
                  </CollapsibleSection>

                  {/* Styles Section */}
                  {(currentElement.fills || currentElement.strokes || currentElement.effects) && (
                    <CollapsibleSection
                      title="Styles"
                      isExpanded={expandedSections.has('styles')}
                      onToggle={() => toggleSection('styles')}
                    >
                      <StylesView element={currentElement} />
                    </CollapsibleSection>
                  )}

                  {/* Auto Layout Section */}
                  {currentElement.autoLayout && (
                    <CollapsibleSection
                      title="Auto Layout"
                      isExpanded={expandedSections.has('autoLayout')}
                      onToggle={() => toggleSection('autoLayout')}
                    >
                      <AutoLayoutView autoLayout={currentElement.autoLayout} />
                    </CollapsibleSection>
                  )}
                </div>
              )}

              {activeView === 'visual' && (
                <VisualView element={currentElement} />
              )}

              {activeView === 'code' && (
                <CodeView element={currentElement} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isExpanded, onToggle, children }) => {
  return (
    <div className="border border-figma-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-figma-hover transition-colors"
      >
        <h4 className="text-figma-sm font-medium">{title}</h4>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-figma-text-secondary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-figma-text-secondary" />
        )}
      </button>
      {isExpanded && (
        <div className="p-3 pt-0">
          {children}
        </div>
      )}
    </div>
  );
};

// Property List Component
const PropertyList: React.FC<{ element: any }> = ({ element }) => {
  const properties = [
    { key: 'Type', value: element.type },
    { key: 'Name', value: element.name },
    { key: 'Position', value: `${Math.round(element.dimensions?.x || 0)}, ${Math.round(element.dimensions?.y || 0)}` },
    { key: 'Size', value: `${Math.round(element.dimensions?.width || 0)} × ${Math.round(element.dimensions?.height || 0)}` },
    { key: 'Visible', value: element.visible !== false ? 'Yes' : 'No' },
    { key: 'Locked', value: element.locked ? 'Yes' : 'No' },
    { key: 'Opacity', value: element.opacity !== undefined ? `${Math.round(element.opacity * 100)}%` : '100%' }
  ];

  return (
    <div className="space-y-2">
      {properties.map((prop) => (
        <div key={prop.key} className="flex justify-between text-figma-xs">
          <span className="text-figma-text-secondary">{prop.key}</span>
          <span className="font-medium">{prop.value}</span>
        </div>
      ))}
    </div>
  );
};

// Styles View Component
const StylesView: React.FC<{ element: any }> = ({ element }) => {
  return (
    <div className="space-y-3">
      {element.fills && element.fills.length > 0 && (
        <div>
          <h5 className="text-figma-xs font-medium mb-1">Fills</h5>
          <div className="space-y-1">
            {element.fills.map((fill: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border border-figma-border"
                  style={{
                    background: fill.type === 'SOLID'
                      ? `rgba(${fill.color.r * 255}, ${fill.color.g * 255}, ${fill.color.b * 255}, ${fill.opacity || 1})`
                      : '#666'
                  }}
                />
                <span className="text-figma-xs">{fill.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Auto Layout View Component
const AutoLayoutView: React.FC<{ autoLayout: any }> = ({ autoLayout }) => {
  return (
    <div className="space-y-2 text-figma-xs">
      <div className="flex justify-between">
        <span className="text-figma-text-secondary">Direction</span>
        <span className="font-medium">{autoLayout.mode}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-figma-text-secondary">Gap</span>
        <span className="font-medium">{autoLayout.itemSpacing || 0}px</span>
      </div>
      <div className="flex justify-between">
        <span className="text-figma-text-secondary">Padding</span>
        <span className="font-medium">
          {[autoLayout.paddingTop || 0, autoLayout.paddingRight || 0, 
            autoLayout.paddingBottom || 0, autoLayout.paddingLeft || 0].join(' ')}
        </span>
      </div>
    </div>
  );
};

// Visual View Component
const VisualView: React.FC<{ element: any }> = ({ element }) => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-figma-surface rounded-lg">
        <h4 className="text-figma-sm font-medium mb-2">Visual Preview</h4>
        <p className="text-figma-xs text-figma-text-secondary">
          Visual preview coming soon...
        </p>
      </div>
    </div>
  );
};

// Code View Component
const CodeView: React.FC<{ element: any }> = ({ element }) => {
  return (
    <pre className="p-4 bg-figma-surface rounded-lg text-figma-xs font-mono overflow-x-auto">
      {JSON.stringify(element, null, 2)}
    </pre>
  );
};