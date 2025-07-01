import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useFigmaBridge } from '../lib/figma-bridge';
import { useInspectorStore, usePluginStore } from '../stores';
import { MessageType } from '../../types/messages';
import { 
  BentoCard, 
  BentoSection, 
  BentoButton, 
  BentoInput,
  BentoTabs,
  BentoTabPanel,
  BentoList,
  BentoEmptyState,
  ScrollContainer
} from '../components/Bento';
import { 
  AlertCircle, 
  RefreshCw, 
  Download, 
  Copy,
  Search,
  Filter,
  Eye,
  Code,
  Layers,
  ChevronRight,
  Settings,
  Sparkles,
  Palette,
  Layout,
  FileText,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Route = createFileRoute('/inspector')({
  component: InspectorPage,
});

function InspectorPage() {
  const { selection, isConnected, sendMessage } = useFigmaBridge();
  const { addNotification } = usePluginStore();
  const {
    selectedNodes,
    selectionInfo,
    nodeHierarchy,
    expandedNodes,
    activePanel,
    searchQuery,
    showHiddenNodes,
    showLockedNodes,
    isLoadingHierarchy,
    isLoadingProperties,
    error,
    setSelectedNodes,
    setSelectionInfo,
    setNodeHierarchy,
    toggleNodeExpanded,
    expandAllNodes,
    collapseAllNodes,
    setActivePanel,
    setSearchQuery,
    setShowHiddenNodes,
    setShowLockedNodes,
    setLoadingHierarchy,
    setLoadingProperties,
    setError,
    selectNodeInFigma,
    zoomToNode,
    copyNodeProperties,
    clearSelection
  } = useInspectorStore();

  // Listen for inspection results
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data.pluginMessage || {};
      
      switch (type) {
        case MessageType.FRAME_INSPECTION_RESULT:
          if (data?.error) {
            setError(data.error);
            addNotification({
              type: 'error',
              title: 'Inspection Failed',
              message: data.error,
              dismissible: true
            });
          } else if (data) {
            setNodeHierarchy(data.hierarchy);
            setSelectionInfo(data);
            setLoadingHierarchy(false);
            setLoadingProperties(false);
          }
          break;

        case MessageType.SELECTION_CHANGED:
          if (data?.selection) {
            setSelectedNodes(data.selection);
            if (data.selection.length === 0) {
              clearSelection();
            }
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-inspect when selection changes
  useEffect(() => {
    if (selection.length > 0) {
      setLoadingHierarchy(true);
      setLoadingProperties(true);
      selection.forEach(item => {
        sendMessage({
          type: MessageType.INSPECT_FRAME,
          data: { frameId: item.id }
        });
      });
    } else {
      clearSelection();
    }
  }, [selection]);

  const handleRefresh = () => {
    if (selection.length > 0) {
      setLoadingHierarchy(true);
      setLoadingProperties(true);
      selection.forEach(item => {
        sendMessage({
          type: MessageType.INSPECT_FRAME,
          data: { frameId: item.id }
        });
      });
    }
  };

  const handleExport = () => {
    const data = {
      selection: selectedNodes,
      hierarchy: nodeHierarchy,
      info: selectionInfo,
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

    addNotification({
      type: 'success',
      title: 'Export Successful',
      message: 'Inspection data exported to JSON',
      dismissible: true
    });
  };

  const handleCopyProperties = () => {
    if (selectionInfo) {
      copyNodeProperties(selectionInfo.id);
      addNotification({
        type: 'success',
        title: 'Copied to Clipboard',
        message: 'Node properties copied as JSON',
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
    { id: 'properties', label: 'Properties', icon: Settings },
    { id: 'hierarchy', label: 'Hierarchy', icon: Layers },
    { id: 'styles', label: 'Styles', icon: Palette }
  ];

  return (
    <div className="h-full flex flex-col bg-figma-bg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-figma-border bg-figma-surface">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-figma-base font-semibold">Design Inspector</h2>
          <div className="flex items-center gap-2">
            <BentoButton
              size="sm"
              variant="ghost"
              icon={Copy}
              onClick={handleCopyProperties}
              disabled={!selectionInfo}
              title="Copy Properties"
            />
            <BentoButton
              size="sm"
              variant="ghost"
              icon={Download}
              onClick={handleExport}
              title="Export Data"
            />
            <BentoButton
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              onClick={handleRefresh}
              loading={isLoadingHierarchy}
              title="Refresh"
            />
          </div>
        </div>

        {/* Search Bar */}
        <BentoInput
          icon={Search}
          placeholder="Search elements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-3"
        />

        {/* View Options */}
        <div className="flex items-center justify-between">
          <BentoTabs
            tabs={tabs}
            defaultTab={activePanel}
            onChange={(tabId) => setActivePanel(tabId as any)}
            variant="underline"
            size="sm"
          />
          
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-figma-xs">
              <input
                type="checkbox"
                checked={showHiddenNodes}
                onChange={(e) => setShowHiddenNodes(e.target.checked)}
                className="rounded border-figma-border"
              />
              Show Hidden
            </label>
            <label className="flex items-center gap-1 text-figma-xs">
              <input
                type="checkbox"
                checked={showLockedNodes}
                onChange={(e) => setShowLockedNodes(e.target.checked)}
                className="rounded border-figma-border"
              />
              Show Locked
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {selection.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <BentoEmptyState
              icon={Layers}
              title="No Selection"
              description="Select elements in Figma to inspect their properties"
            />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <BentoCard variant="danger">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-figma-base font-medium mb-2">Inspection Error</h3>
                <p className="text-figma-sm text-figma-text-secondary">{error}</p>
                <BentoButton
                  variant="secondary"
                  onClick={handleRefresh}
                  className="mt-4"
                >
                  Try Again
                </BentoButton>
              </div>
            </BentoCard>
          </div>
        ) : (
          <>
            {/* Left Panel - Tree View */}
            <div className="w-80 border-r border-figma-border flex flex-col">
              <div className="p-3 border-b border-figma-border bg-figma-surface">
                <div className="flex items-center justify-between">
                  <h3 className="text-figma-sm font-medium">Element Tree</h3>
                  <div className="flex items-center gap-1">
                    <BentoButton
                      size="sm"
                      variant="ghost"
                      onClick={expandAllNodes}
                      title="Expand All"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </BentoButton>
                    <BentoButton
                      size="sm"
                      variant="ghost"
                      onClick={collapseAllNodes}
                      title="Collapse All"
                    >
                      <Minimize2 className="w-3 h-3" />
                    </BentoButton>
                  </div>
                </div>
              </div>

              <ScrollContainer className="flex-1">
                {isLoadingHierarchy ? (
                  <div className="p-4">
                    <BentoCard loading>
                      Loading hierarchy...
                    </BentoCard>
                  </div>
                ) : nodeHierarchy ? (
                  <div className="p-3">
                    <TreeNode
                      node={nodeHierarchy}
                      level={0}
                      expandedNodes={expandedNodes}
                      onToggle={toggleNodeExpanded}
                      onSelect={selectNodeInFigma}
                      searchQuery={searchQuery}
                    />
                  </div>
                ) : null}
              </ScrollContainer>
            </div>

            {/* Right Panel - Properties */}
            <div className="flex-1 flex flex-col">
              <ScrollContainer className="flex-1">
                <div className="p-4">
                  {activePanel === 'properties' && (
                    <PropertiesPanel
                      selectionInfo={selectionInfo}
                      isLoading={isLoadingProperties}
                    />
                  )}
                  
                  {activePanel === 'hierarchy' && (
                    <HierarchyPanel
                      nodeHierarchy={nodeHierarchy}
                      isLoading={isLoadingHierarchy}
                    />
                  )}
                  
                  {activePanel === 'styles' && (
                    <StylesPanel
                      selectionInfo={selectionInfo}
                      isLoading={isLoadingProperties}
                    />
                  )}
                </div>
              </ScrollContainer>

              {/* Smart Actions Bar */}
              {selectionInfo && (
                <div className="p-4 border-t border-figma-border bg-figma-surface">
                  <h4 className="text-figma-sm font-medium mb-2">Smart Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <BentoButton
                      size="sm"
                      variant="secondary"
                      icon={Code}
                      onClick={() => console.log('Generate code')}
                    >
                      Generate Code
                    </BentoButton>
                    <BentoButton
                      size="sm"
                      variant="secondary"
                      icon={Sparkles}
                      onClick={() => console.log('AI suggestions')}
                    >
                      AI Suggestions
                    </BentoButton>
                    <BentoButton
                      size="sm"
                      variant="secondary"
                      icon={Layout}
                      onClick={() => console.log('Analyze layout')}
                    >
                      Analyze Layout
                    </BentoButton>
                    <BentoButton
                      size="sm"
                      variant="secondary"
                      icon={FileText}
                      onClick={() => console.log('Export tokens')}
                    >
                      Export Tokens
                    </BentoButton>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Tree Node Component
const TreeNode: React.FC<{
  node: any;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  searchQuery: string;
}> = ({ node, level, expandedNodes, onToggle, onSelect, searchQuery }) => {
  if (!node) return null;

  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const matches = searchQuery ? node.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;

  if (!matches && !hasChildren) return null;

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={cn(
          "w-full flex items-center gap-1 px-2 py-1 text-figma-xs rounded hover:bg-figma-hover transition-colors",
          matches ? 'opacity-100' : 'opacity-50'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="p-0.5 hover:bg-figma-hover rounded"
          >
            <ChevronRight className={cn(
              "w-3 h-3 transition-transform",
              isExpanded && "rotate-90"
            )} />
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        
        <span className="truncate">{node.name}</span>
        <span className="text-figma-text-tertiary ml-auto">{node.type}</span>
      </button>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child: any) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Properties Panel
const PropertiesPanel: React.FC<{
  selectionInfo: any;
  isLoading: boolean;
}> = ({ selectionInfo, isLoading }) => {
  if (isLoading) {
    return <BentoCard loading>Loading properties...</BentoCard>;
  }

  if (!selectionInfo) {
    return <BentoEmptyState title="No properties" description="Select a node to view properties" />;
  }

  const properties = [
    { label: 'Type', value: selectionInfo.type },
    { label: 'Name', value: selectionInfo.name },
    { label: 'ID', value: selectionInfo.id },
    { label: 'Position', value: `${Math.round(selectionInfo.bounds?.x || 0)}, ${Math.round(selectionInfo.bounds?.y || 0)}` },
    { label: 'Size', value: `${Math.round(selectionInfo.bounds?.width || 0)} × ${Math.round(selectionInfo.bounds?.height || 0)}` },
    { label: 'Visible', value: selectionInfo.visible !== false ? 'Yes' : 'No' },
    { label: 'Locked', value: selectionInfo.locked ? 'Yes' : 'No' },
    { label: 'Opacity', value: selectionInfo.styles?.opacity ? `${Math.round(selectionInfo.styles.opacity * 100)}%` : '100%' }
  ];

  return (
    <div className="space-y-4">
      <BentoSection title="Basic Properties">
        <div className="space-y-2">
          {properties.map((prop) => (
            <div key={prop.label} className="flex justify-between text-figma-sm">
              <span className="text-figma-text-secondary">{prop.label}</span>
              <span className="font-medium font-mono text-figma-xs">{prop.value}</span>
            </div>
          ))}
        </div>
      </BentoSection>

      {selectionInfo.constraints && (
        <BentoSection title="Constraints">
          <div className="space-y-2">
            <div className="flex justify-between text-figma-sm">
              <span className="text-figma-text-secondary">Horizontal</span>
              <span className="font-medium">{selectionInfo.constraints.horizontal}</span>
            </div>
            <div className="flex justify-between text-figma-sm">
              <span className="text-figma-text-secondary">Vertical</span>
              <span className="font-medium">{selectionInfo.constraints.vertical}</span>
            </div>
          </div>
        </BentoSection>
      )}
    </div>
  );
};

// Hierarchy Panel
const HierarchyPanel: React.FC<{
  nodeHierarchy: any;
  isLoading: boolean;
}> = ({ nodeHierarchy, isLoading }) => {
  if (isLoading) {
    return <BentoCard loading>Loading hierarchy...</BentoCard>;
  }

  if (!nodeHierarchy) {
    return <BentoEmptyState title="No hierarchy" description="Select a node to view hierarchy" />;
  }

  return (
    <BentoSection title="Node Hierarchy">
      <pre className="text-figma-xs font-mono bg-figma-surface p-3 rounded overflow-x-auto">
        {JSON.stringify(nodeHierarchy, null, 2)}
      </pre>
    </BentoSection>
  );
};

// Styles Panel
const StylesPanel: React.FC<{
  selectionInfo: any;
  isLoading: boolean;
}> = ({ selectionInfo, isLoading }) => {
  if (isLoading) {
    return <BentoCard loading>Loading styles...</BentoCard>;
  }

  if (!selectionInfo?.styles) {
    return <BentoEmptyState title="No styles" description="Selected node has no styles" />;
  }

  const { fills, strokes, effects } = selectionInfo.styles;

  return (
    <div className="space-y-4">
      {fills && fills.length > 0 && (
        <BentoSection title="Fills">
          <div className="space-y-2">
            {fills.map((fill: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded border border-figma-border"
                  style={{
                    background: fill.type === 'SOLID'
                      ? `rgba(${fill.color.r * 255}, ${fill.color.g * 255}, ${fill.color.b * 255}, ${fill.opacity || 1})`
                      : '#666'
                  }}
                />
                <div className="flex-1">
                  <div className="text-figma-sm font-medium">{fill.type}</div>
                  {fill.type === 'SOLID' && (
                    <div className="text-figma-xs text-figma-text-secondary">
                      {`rgb(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)})`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </BentoSection>
      )}

      {strokes && strokes.length > 0 && (
        <BentoSection title="Strokes">
          <div className="space-y-2">
            {strokes.map((stroke: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded border-2"
                  style={{
                    borderColor: stroke.type === 'SOLID'
                      ? `rgba(${stroke.color.r * 255}, ${stroke.color.g * 255}, ${stroke.color.b * 255}, ${stroke.opacity || 1})`
                      : '#666'
                  }}
                />
                <div className="flex-1">
                  <div className="text-figma-sm font-medium">{stroke.type}</div>
                  <div className="text-figma-xs text-figma-text-secondary">
                    Weight: {stroke.weight || 1}px
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BentoSection>
      )}

      {effects && effects.length > 0 && (
        <BentoSection title="Effects">
          <div className="space-y-2">
            {effects.map((effect: any, idx: number) => (
              <div key={idx} className="p-2 bg-figma-surface rounded">
                <div className="text-figma-sm font-medium">{effect.type}</div>
                {effect.radius && (
                  <div className="text-figma-xs text-figma-text-secondary">
                    Radius: {effect.radius}px
                  </div>
                )}
              </div>
            ))}
          </div>
        </BentoSection>
      )}
    </div>
  );
};