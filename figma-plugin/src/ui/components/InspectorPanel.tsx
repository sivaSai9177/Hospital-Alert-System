import React, { useState, useEffect } from 'react';
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
  XCircle,
  Code,
  Palette,
  Layout,
  Settings
} from 'lucide-react';

interface InspectorPanelProps {
  selection: any[];
  inspectionResults: Map<string, any>;
  onInspectElement: (elementId: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selection,
  inspectionResults,
  onInspectElement,
  onRefresh,
  onExport,
  isLoading = false
}) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tree' | 'properties' | 'styles' | 'code'>('tree');
  const [expandAll, setExpandAll] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Get the current inspection result
  const currentResult = selectedElementId ? inspectionResults.get(selectedElementId) : null;

  const handleSelectElement = (element: any) => {
    setSelectedElementId(element.id);
    onInspectElement(element.id);
  };

  const handleCopyToClipboard = () => {
    if (currentResult) {
      navigator.clipboard.writeText(JSON.stringify(currentResult, null, 2));
    }
  };

  const filterElements = (element: any): any => {
    if (!element) return null;
    
    const matchesSearch = element.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || element.type === filterType;
    
    if (!matchesSearch || !matchesType) {
      // Check children
      if (element.children) {
        const filteredChildren = element.children
          .map((child: any) => filterElements(child))
          .filter(Boolean);
        
        if (filteredChildren.length > 0) {
          return { ...element, children: filteredChildren };
        }
      }
      return null;
    }
    
    if (element.children) {
      return {
        ...element,
        children: element.children.map((child: any) => filterElements(child)).filter(Boolean)
      };
    }
    
    return element;
  };

  const tabs = [
    { id: 'tree', label: 'Tree View', icon: Layout },
    { id: 'properties', label: 'Properties', icon: Settings },
    { id: 'styles', label: 'Styles', icon: Palette },
    { id: 'code', label: 'Code', icon: Code }
  ];

  return (
    <div className="inspector-panel h-full flex flex-col">
      {/* Header */}
      <div className="inspector-header p-figma-md border-b border-figma-border">
        <div className="flex items-center justify-between mb-figma-sm">
          <h2 className="text-figma-base font-semibold">Element Inspector</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="p-1 hover:bg-figma-border rounded transition-colors"
              title={expandAll ? "Collapse All" : "Expand All"}
            >
              {expandAll ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="p-1 hover:bg-figma-border rounded transition-colors"
              title="Copy to Clipboard"
              disabled={!currentResult}
            >
              <Copy className="w-4 h-4" />
            </button>
            {onExport && (
              <button
                onClick={onExport}
                className="p-1 hover:bg-figma-border rounded transition-colors"
                title="Export"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 hover:bg-figma-border rounded transition-colors"
                title="Refresh"
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-figma-text-secondary" />
            <input
              type="text"
              placeholder="Search elements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-figma w-full pl-8 text-figma-xs"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-figma-text-secondary" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-figma flex-1 text-figma-xs"
            >
              <option value="all">All Types</option>
              <option value="FRAME">Frames</option>
              <option value="GROUP">Groups</option>
              <option value="COMPONENT">Components</option>
              <option value="INSTANCE">Instances</option>
              <option value="TEXT">Text</option>
              <option value="RECTANGLE">Rectangles</option>
              <option value="ELLIPSE">Ellipses</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-figma-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1 px-figma-sm py-figma-xs text-figma-xs font-medium transition-colors",
                  "border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "border-figma-blue text-figma-blue"
                    : "border-transparent text-figma-text-secondary hover:text-figma-text"
                )}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {selection.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-figma-text-secondary mx-auto mb-4" />
              <p className="text-figma-text-secondary">No elements selected</p>
              <p className="text-figma-xs text-figma-text-tertiary mt-2">
                Select a frame, group, or component to inspect
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-figma-blue mx-auto mb-4"></div>
              <p className="text-figma-text-secondary">Loading element tree...</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-figma-md">
            {activeTab === 'tree' && (
              <div className="space-y-2">
                {selection.map((item) => {
                  const result = inspectionResults.get(item.id);
                  if (!result || result.error) {
                    return (
                      <div key={item.id} className="panel">
                        <div className="flex items-center gap-2 text-figma-red">
                          <XCircle className="w-4 h-4" />
                          <span className="text-figma-sm font-medium">{item.name}</span>
                        </div>
                        {result?.error && (
                          <p className="text-figma-xs text-figma-text-secondary mt-1">
                            {result.error}
                          </p>
                        )}
                      </div>
                    );
                  }

                  const filteredHierarchy = result.hierarchy ? filterElements(result.hierarchy) : null;
                  
                  if (!filteredHierarchy) {
                    return null;
                  }

                  return (
                    <div key={item.id} className="panel">
                      <ElementTreeView
                        element={filteredHierarchy}
                        onSelectElement={handleSelectElement}
                        selectedElementId={selectedElementId}
                        expandAll={expandAll}
                        showProperties={false}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'properties' && currentResult && (
              <div className="panel space-y-figma-md">
                <h3 className="text-figma-sm font-medium">Properties</h3>
                <PropertyList properties={currentResult} />
              </div>
            )}

            {activeTab === 'styles' && currentResult && (
              <div className="panel space-y-figma-md">
                <h3 className="text-figma-sm font-medium">Styles</h3>
                <StylesList element={currentResult} />
              </div>
            )}

            {activeTab === 'code' && currentResult && (
              <div className="panel">
                <h3 className="text-figma-sm font-medium mb-figma-sm">Code</h3>
                <pre className="text-figma-xs font-mono bg-figma-bg p-figma-sm rounded-figma overflow-x-auto">
                  {JSON.stringify(currentResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Property List Component
const PropertyList: React.FC<{ properties: any }> = ({ properties }) => {
  const renderValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="space-y-2">
      {Object.entries(properties).map(([key, value]) => (
        <div key={key} className="border-b border-figma-border pb-2">
          <div className="text-figma-xs text-figma-text-secondary">{key}</div>
          <div className="text-figma-sm text-figma-text font-mono mt-1">
            {renderValue(value)}
          </div>
        </div>
      ))}
    </div>
  );
};

// Styles List Component
const StylesList: React.FC<{ element: any }> = ({ element }) => {
  return (
    <div className="space-y-figma-md">
      {/* Fills */}
      {element.fills && element.fills.length > 0 && (
        <div>
          <h4 className="text-figma-xs font-medium text-figma-text-secondary mb-2">Fills</h4>
          <div className="space-y-1">
            {element.fills.map((fill: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-figma-border"
                  style={{
                    background: fill.type === 'SOLID'
                      ? `rgba(${fill.color.r * 255}, ${fill.color.g * 255}, ${fill.color.b * 255}, ${fill.opacity || 1})`
                      : '#ccc'
                  }}
                />
                <span className="text-figma-xs">{fill.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Effects */}
      {element.effects && element.effects.length > 0 && (
        <div>
          <h4 className="text-figma-xs font-medium text-figma-text-secondary mb-2">Effects</h4>
          <div className="space-y-1">
            {element.effects.map((effect: any, index: number) => (
              <div key={index} className="text-figma-xs">
                {effect.type} - {effect.visible ? 'Visible' : 'Hidden'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Typography */}
      {element.type === 'TEXT' && element.style && (
        <div>
          <h4 className="text-figma-xs font-medium text-figma-text-secondary mb-2">Typography</h4>
          <div className="space-y-1 text-figma-xs">
            <div>Font: {element.style.fontFamily}</div>
            <div>Size: {element.style.fontSize}px</div>
            <div>Weight: {element.style.fontWeight}</div>
            <div>Line Height: {element.style.lineHeight}px</div>
          </div>
        </div>
      )}
    </div>
  );
};