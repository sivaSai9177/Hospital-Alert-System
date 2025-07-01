import React, { useState, useCallback } from 'react';
import { cn } from '../lib/utils';
import {
  ChevronRight,
  ChevronDown,
  Frame,
  Type,
  Square,
  Circle,
  Image,
  Component,
  Copy,
  Package,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Info,
  AlertCircle
} from 'lucide-react';

interface ElementNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  children?: ElementNode[];
  properties?: any;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ElementTreeViewProps {
  element: ElementNode;
  onSelectElement?: (element: ElementNode) => void;
  selectedElementId?: string;
  expandAll?: boolean;
  showProperties?: boolean;
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'FRAME':
      return Frame;
    case 'TEXT':
      return Type;
    case 'RECTANGLE':
      return Square;
    case 'ELLIPSE':
      return Circle;
    case 'IMAGE':
      return Image;
    case 'COMPONENT':
      return Component;
    case 'INSTANCE':
      return Copy;
    case 'GROUP':
      return Layers;
    default:
      return Package;
  }
};

const getNodeColor = (type: string) => {
  switch (type) {
    case 'FRAME':
      return 'text-figma-blue';
    case 'TEXT':
      return 'text-figma-purple';
    case 'COMPONENT':
      return 'text-figma-green';
    case 'INSTANCE':
      return 'text-emerald-500';
    case 'GROUP':
      return 'text-orange-500';
    default:
      return 'text-figma-text-secondary';
  }
};

export const ElementTreeView: React.FC<ElementTreeViewProps> = ({
  element,
  onSelectElement,
  selectedElementId,
  expandAll = false,
  showProperties = true
}) => {
  return (
    <div className="element-tree-view">
      <TreeNode
        node={element}
        depth={0}
        onSelectElement={onSelectElement}
        selectedElementId={selectedElementId}
        expandAll={expandAll}
        showProperties={showProperties}
      />
    </div>
  );
};

interface TreeNodeProps {
  node: ElementNode;
  depth: number;
  onSelectElement?: (element: ElementNode) => void;
  selectedElementId?: string;
  expandAll?: boolean;
  showProperties?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  onSelectElement,
  selectedElementId,
  expandAll,
  showProperties
}) => {
  const [isExpanded, setIsExpanded] = useState(expandAll || depth < 2);
  const [showNodeProperties, setShowNodeProperties] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedElementId;

  const Icon = getNodeIcon(node.type);
  const nodeColor = getNodeColor(node.type);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleSelect = useCallback(() => {
    onSelectElement?.(node);
  }, [node, onSelectElement]);

  const handlePropertiesToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNodeProperties(!showNodeProperties);
  }, [showNodeProperties]);

  return (
    <div className="tree-node">
      <div
        className={cn(
          "tree-node-header group",
          "flex items-center gap-1 py-1 px-2 rounded cursor-pointer",
          "hover:bg-figma-hover transition-colors",
          isSelected && "bg-figma-selection",
          depth > 0 && "ml-4"
        )}
        onClick={handleSelect}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={handleToggle}
          className={cn(
            "p-0.5 rounded hover:bg-figma-border transition-colors",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {/* Node Icon */}
        <Icon className={cn("w-4 h-4 flex-shrink-0", nodeColor)} />

        {/* Node Name */}
        <span className={cn(
          "text-figma-sm flex-1 truncate",
          isSelected ? "font-medium" : ""
        )}>
          {node.name || 'Unnamed'}
        </span>

        {/* Node Badges */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {node.visible === false && (
            <EyeOff className="w-3 h-3 text-figma-text-tertiary" title="Hidden" />
          )}
          {node.locked && (
            <Lock className="w-3 h-3 text-figma-text-tertiary" title="Locked" />
          )}
          {node.opacity !== undefined && node.opacity < 1 && (
            <span className="text-figma-xs text-figma-text-tertiary">
              {Math.round(node.opacity * 100)}%
            </span>
          )}
          {showProperties && node.properties && (
            <button
              onClick={handlePropertiesToggle}
              className="p-0.5 rounded hover:bg-figma-border transition-colors"
              title="Show Properties"
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Child Count */}
        {hasChildren && (
          <span className="text-figma-xs text-figma-text-tertiary">
            {node.children!.length}
          </span>
        )}
      </div>

      {/* Properties Panel */}
      {showNodeProperties && node.properties && (
        <div className="ml-8 mt-1 mb-2 p-3 bg-figma-surface rounded-figma text-figma-xs">
          <div className="space-y-1">
            {node.absoluteBoundingBox && (
              <div>
                <span className="text-figma-text-secondary">Position:</span>{' '}
                {Math.round(node.absoluteBoundingBox.x)}, {Math.round(node.absoluteBoundingBox.y)}
                {' • '}
                <span className="text-figma-text-secondary">Size:</span>{' '}
                {Math.round(node.absoluteBoundingBox.width)} × {Math.round(node.absoluteBoundingBox.height)}
              </div>
            )}
            {Object.entries(node.properties).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-figma-text-secondary">{key}:</span>
                <span className="text-figma-text truncate flex-1">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="tree-node-children">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelectElement={onSelectElement}
              selectedElementId={selectedElementId}
              expandAll={expandAll}
              showProperties={showProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// CSS for the tree view
export const treeViewStyles = `
  .element-tree-view {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    user-select: none;
  }

  .tree-node {
    position: relative;
  }

  .tree-node-header {
    min-height: 28px;
  }

  .tree-node-children {
    position: relative;
  }

  .tree-node-children::before {
    content: '';
    position: absolute;
    left: 12px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--figma-color-border);
    opacity: 0.3;
  }

  /* Highlighted states */
  .bg-figma-selection {
    background: rgba(24, 160, 251, 0.1);
  }

  .bg-figma-hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;