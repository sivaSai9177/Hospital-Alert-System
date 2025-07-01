import React, { useState, useEffect } from 'react';

interface FrameInspectionResult {
  id: string;
  name: string;
  type: string;
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  autoLayout?: {
    mode: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    itemSpacing?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
  };
  issues?: string[];
  suggestions?: string[];
}

interface FrameListItem {
  id: string;
  name: string;
  type: string;
}

export const FrameInspector: React.FC = () => {
  const [selectedFrame, setSelectedFrame] = useState<FrameInspectionResult | null>(null);
  const [frameList, setFrameList] = useState<FrameListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspect' | 'edit'>('inspect');
  const [selectionInfo, setSelectionInfo] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [editOptions, setEditOptions] = useState({
    width: '',
    height: '',
    layoutMode: 'NONE',
    paddingTop: '',
    paddingRight: '',
    paddingBottom: '',
    paddingLeft: '',
    itemSpacing: '',
  });

  useEffect(() => {
    // Listen for inspection results
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data.pluginMessage || {};
      
      switch (type) {
        case 'FRAME_INSPECTION_RESULT':
          setSelectedFrame(data);
          setLoading(false);
          break;
          
        case 'ALL_FRAMES_RESULT':
          if (data.frames) {
            setFrameList(data.frames);
          }
          setLoading(false);
          break;
          
        case 'FRAME_ISSUES_RESULT':
          if (selectedFrame && !data.error) {
            setSelectedFrame({
              ...selectedFrame,
              issues: data.issues,
              suggestions: data.suggestions
            });
          }
          break;
          
        case 'FRAME_EDIT_RESULT':
          if (data.success) {
            // Refresh the frame inspection
            inspectFrame(data.nodeId);
          }
          setLoading(false);
          break;
          
        case 'SELECTION_INFO_RESULT':
          if (!data.error) {
            setSelectionInfo(data);
          }
          break;
          
        case 'ALL_PAGES_RESULT':
          if (data.pages) {
            setPages(data.pages);
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedFrame]);

  useEffect(() => {
    // Load all frames on mount
    loadAllFrames();
    loadSelectionInfo();
    loadAllPages();
  }, []);

  const loadAllFrames = () => {
    setLoading(true);
    parent.postMessage({
      pluginMessage: { type: 'GET_ALL_FRAMES' }
    }, '*');
  };
  
  const loadSelectionInfo = () => {
    parent.postMessage({
      pluginMessage: { type: 'GET_SELECTION_INFO' }
    }, '*');
  };
  
  const loadAllPages = () => {
    parent.postMessage({
      pluginMessage: { type: 'GET_ALL_PAGES' }
    }, '*');
  };

  const inspectFrame = (frameId: string) => {
    setLoading(true);
    parent.postMessage({
      pluginMessage: { type: 'INSPECT_FRAME', data: { frameId } }
    }, '*');
  };

  const inspectSelected = () => {
    setLoading(true);
    parent.postMessage({
      pluginMessage: { type: 'INSPECT_SELECTED' }
    }, '*');
  };

  const analyzeFrame = (frameId: string) => {
    parent.postMessage({
      pluginMessage: { type: 'GET_FRAME_ISSUES', data: { frameId } }
    }, '*');
  };

  const editFrame = () => {
    if (!selectedFrame) return;
    
    const options: any = {};
    
    // Only include non-empty values
    if (editOptions.width) options.width = parseInt(editOptions.width);
    if (editOptions.height) options.height = parseInt(editOptions.height);
    if (editOptions.layoutMode !== 'NONE') options.layoutMode = editOptions.layoutMode;
    if (editOptions.paddingTop) options.paddingTop = parseInt(editOptions.paddingTop);
    if (editOptions.paddingRight) options.paddingRight = parseInt(editOptions.paddingRight);
    if (editOptions.paddingBottom) options.paddingBottom = parseInt(editOptions.paddingBottom);
    if (editOptions.paddingLeft) options.paddingLeft = parseInt(editOptions.paddingLeft);
    if (editOptions.itemSpacing) options.itemSpacing = parseInt(editOptions.itemSpacing);
    
    setLoading(true);
    parent.postMessage({
      pluginMessage: {
        type: 'EDIT_FRAME',
        data: { frameId: selectedFrame.id, options }
      }
    }, '*');
  };

  const fixIssues = () => {
    if (!selectedFrame) return;
    
    setLoading(true);
    parent.postMessage({
      pluginMessage: {
        type: 'FIX_FRAME_ISSUES',
        data: { frameId: selectedFrame.id }
      }
    }, '*');
  };

  const createPreset = (preset: string) => {
    parent.postMessage({
      pluginMessage: {
        type: 'CREATE_PRESET_FRAME',
        data: { preset }
      }
    }, '*');
  };

  return (
    <div className="frame-inspector">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'inspect' ? 'active' : ''}`}
          onClick={() => setActiveTab('inspect')}
        >
          Inspect
        </button>
        <button
          className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          Edit
        </button>
      </div>

      {activeTab === 'inspect' && (
        <div className="inspect-panel">
          {/* Current Page & Selection Info */}
          {selectionInfo && (
            <div className="selection-info">
              <div className="current-page">
                <strong>Current Page:</strong> {selectionInfo.currentPage.name}
              </div>
              {selectionInfo.selectionCount > 0 ? (
                <div className="selection-details">
                  <strong>Selected ({selectionInfo.selectionCount}):</strong>
                  {selectionInfo.selection.map((item: any, index: number) => (
                    <div key={item.id} className="selected-item">
                      <span className="item-type">{item.type}</span>
                      <span className="item-name">{item.name}</span>
                      <div className="item-path">{item.path.join(' → ')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-selection">No elements selected</div>
              )}
            </div>
          )}

          <div className="actions">
            <button onClick={inspectSelected} disabled={loading}>
              Inspect Selected
            </button>
            <button onClick={loadAllFrames} disabled={loading}>
              Refresh List
            </button>
            <button onClick={loadSelectionInfo} disabled={loading}>
              Update Selection
            </button>
          </div>

          <div className="frame-list">
            <h3>Frames in Page</h3>
            <select 
              onChange={(e) => e.target.value && inspectFrame(e.target.value)}
              disabled={loading}
              value={selectedFrame?.id || ''}
            >
              <option value="">Select a frame...</option>
              {frameList.map(frame => (
                <option key={frame.id} value={frame.id}>
                  {frame.name} ({frame.type})
                </option>
              ))}
            </select>
          </div>

          {selectedFrame && (
            <div className="inspection-result">
              <h3>{selectedFrame.name}</h3>
              <div className="property-group">
                <h4>Dimensions</h4>
                <div className="property">
                  <span>Position:</span>
                  <span>{selectedFrame.dimensions.x}, {selectedFrame.dimensions.y}</span>
                </div>
                <div className="property">
                  <span>Size:</span>
                  <span>{selectedFrame.dimensions.width} × {selectedFrame.dimensions.height}</span>
                </div>
              </div>

              {selectedFrame.autoLayout && (
                <div className="property-group">
                  <h4>Auto Layout</h4>
                  <div className="property">
                    <span>Mode:</span>
                    <span>{selectedFrame.autoLayout.mode}</span>
                  </div>
                  {selectedFrame.autoLayout.mode !== 'NONE' && (
                    <>
                      <div className="property">
                        <span>Primary Axis:</span>
                        <span>{selectedFrame.autoLayout.primaryAxisSizingMode}</span>
                      </div>
                      <div className="property">
                        <span>Counter Axis:</span>
                        <span>{selectedFrame.autoLayout.counterAxisSizingMode}</span>
                      </div>
                      <div className="property">
                        <span>Spacing:</span>
                        <span>{selectedFrame.autoLayout.itemSpacing || 0}</span>
                      </div>
                      <div className="property">
                        <span>Padding:</span>
                        <span>
                          {selectedFrame.autoLayout.paddingTop || 0} / 
                          {selectedFrame.autoLayout.paddingRight || 0} / 
                          {selectedFrame.autoLayout.paddingBottom || 0} / 
                          {selectedFrame.autoLayout.paddingLeft || 0}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button onClick={() => analyzeFrame(selectedFrame.id)}>
                Analyze Issues
              </button>

              {selectedFrame.issues && selectedFrame.issues.length > 0 && (
                <div className="issues">
                  <h4>Issues Found</h4>
                  <ul>
                    {selectedFrame.issues.map((issue, index) => (
                      <li key={index} className="issue">{issue}</li>
                    ))}
                  </ul>
                  <button onClick={fixIssues}>Fix All Issues</button>
                </div>
              )}

              {selectedFrame.suggestions && selectedFrame.suggestions.length > 0 && (
                <div className="suggestions">
                  <h4>Suggestions</h4>
                  <ul>
                    {selectedFrame.suggestions.map((suggestion, index) => (
                      <li key={index} className="suggestion">{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Element Hierarchy */}
          {selectedFrame?.hierarchy && (
            <div className="element-hierarchy">
              <h4>Element Hierarchy</h4>
              <ElementTree element={selectedFrame.hierarchy} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="edit-panel">
          {selectedFrame ? (
            <>
              <h3>Edit: {selectedFrame.name}</h3>
              
              <div className="edit-group">
                <h4>Dimensions</h4>
                <div className="input-row">
                  <label>
                    Width:
                    <input
                      type="number"
                      value={editOptions.width}
                      onChange={(e) => setEditOptions({...editOptions, width: e.target.value})}
                      placeholder={selectedFrame.dimensions.width.toString()}
                    />
                  </label>
                  <label>
                    Height:
                    <input
                      type="number"
                      value={editOptions.height}
                      onChange={(e) => setEditOptions({...editOptions, height: e.target.value})}
                      placeholder={selectedFrame.dimensions.height.toString()}
                    />
                  </label>
                </div>
              </div>

              <div className="edit-group">
                <h4>Auto Layout</h4>
                <label>
                  Mode:
                  <select
                    value={editOptions.layoutMode}
                    onChange={(e) => setEditOptions({...editOptions, layoutMode: e.target.value})}
                  >
                    <option value="NONE">None</option>
                    <option value="HORIZONTAL">Horizontal</option>
                    <option value="VERTICAL">Vertical</option>
                  </select>
                </label>
                
                {editOptions.layoutMode !== 'NONE' && (
                  <>
                    <label>
                      Item Spacing:
                      <input
                        type="number"
                        value={editOptions.itemSpacing}
                        onChange={(e) => setEditOptions({...editOptions, itemSpacing: e.target.value})}
                        placeholder="0"
                      />
                    </label>
                    
                    <h5>Padding</h5>
                    <div className="padding-inputs">
                      <input
                        type="number"
                        value={editOptions.paddingTop}
                        onChange={(e) => setEditOptions({...editOptions, paddingTop: e.target.value})}
                        placeholder="Top"
                      />
                      <input
                        type="number"
                        value={editOptions.paddingRight}
                        onChange={(e) => setEditOptions({...editOptions, paddingRight: e.target.value})}
                        placeholder="Right"
                      />
                      <input
                        type="number"
                        value={editOptions.paddingBottom}
                        onChange={(e) => setEditOptions({...editOptions, paddingBottom: e.target.value})}
                        placeholder="Bottom"
                      />
                      <input
                        type="number"
                        value={editOptions.paddingLeft}
                        onChange={(e) => setEditOptions({...editOptions, paddingLeft: e.target.value})}
                        placeholder="Left"
                      />
                    </div>
                  </>
                )}
              </div>

              <button onClick={editFrame} disabled={loading} className="primary">
                Apply Changes
              </button>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a frame to edit</p>
              <button onClick={inspectSelected}>Select Current Frame</button>
            </div>
          )}

          <div className="presets">
            <h4>Create Preset Frames</h4>
            <div className="preset-buttons">
              <button onClick={() => createPreset('card')}>Card</button>
              <button onClick={() => createPreset('section')}>Section</button>
              <button onClick={() => createPreset('container')}>Container</button>
              <button onClick={() => createPreset('sidebar')}>Sidebar</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .frame-inspector {
          padding: 16px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .tab {
          padding: 8px 16px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #666;
          border-bottom: 2px solid transparent;
        }

        .tab.active {
          color: #000;
          border-bottom-color: #5865f2;
        }

        .actions {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .frame-list {
          margin-bottom: 24px;
        }

        .frame-list h3 {
          font-size: 14px;
          margin-bottom: 8px;
        }

        .frame-list select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .inspection-result {
          background: #f5f5f5;
          padding: 16px;
          border-radius: 8px;
        }

        .property-group {
          margin-bottom: 16px;
        }

        .property-group h4 {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #666;
        }

        .property {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 12px;
        }

        .property span:first-child {
          color: #666;
        }

        .issues, .suggestions {
          margin-top: 16px;
        }

        .issues ul, .suggestions ul {
          margin: 8px 0;
          padding-left: 20px;
        }

        .issue {
          color: #e53e3e;
        }

        .suggestion {
          color: #3182ce;
        }

        .edit-group {
          margin-bottom: 24px;
        }

        .edit-group h4 {
          font-size: 14px;
          margin-bottom: 12px;
        }

        .input-row {
          display: flex;
          gap: 12px;
        }

        .input-row label {
          flex: 1;
        }

        label {
          display: block;
          margin-bottom: 12px;
          font-size: 12px;
        }

        input, select {
          display: block;
          width: 100%;
          padding: 8px;
          margin-top: 4px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .padding-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .presets {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e0e0e0;
        }

        .preset-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        button {
          padding: 8px 16px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        button:hover {
          background: #f5f5f5;
        }

        button.primary {
          background: #5865f2;
          color: white;
          border: none;
        }

        button.primary:hover {
          background: #4752c4;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .no-selection {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        .selection-info {
          background: #f0f0f0;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 12px;
        }

        .current-page {
          margin-bottom: 8px;
          color: #333;
        }

        .selected-item {
          margin: 8px 0;
          padding: 8px;
          background: white;
          border-radius: 4px;
        }

        .item-type {
          display: inline-block;
          padding: 2px 6px;
          background: #e0e0e0;
          border-radius: 3px;
          font-size: 10px;
          margin-right: 8px;
        }

        .item-name {
          font-weight: 500;
        }

        .item-path {
          font-size: 10px;
          color: #666;
          margin-top: 4px;
        }

        .element-hierarchy {
          margin-top: 24px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .element-tree {
          font-size: 12px;
        }

        .tree-node {
          margin-left: 16px;
          margin-top: 4px;
        }

        .tree-node-header {
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .tree-node-header:hover {
          background: #e0e0e0;
        }

        .tree-toggle {
          margin-right: 4px;
          font-size: 10px;
          width: 16px;
        }

        .tree-node-type {
          display: inline-block;
          padding: 2px 6px;
          background: #d0d0d0;
          border-radius: 3px;
          font-size: 10px;
          margin-right: 8px;
        }

        .tree-node-name {
          flex: 1;
        }

        .tree-node-props {
          margin-left: 20px;
          margin-top: 4px;
          padding: 4px;
          background: white;
          border-radius: 4px;
          font-size: 10px;
        }

        .prop-item {
          margin: 2px 0;
          color: #666;
        }
      `}</style>
    </div>
  );
};

// Element Tree Component
const ElementTree: React.FC<{ element: any; depth?: number }> = ({ element, depth = 0 }) => {
  const [expanded, setExpanded] = React.useState(depth < 2);
  const [showProps, setShowProps] = React.useState(false);
  
  const hasChildren = element.children && element.children.length > 0;
  const hasProps = element.properties && Object.keys(element.properties).length > 0;
  
  return (
    <div className="tree-node">
      <div 
        className="tree-node-header" 
        onClick={() => setExpanded(!expanded)}
      >
        <span className="tree-toggle">
          {hasChildren ? (expanded ? '▼' : '▶') : '•'}
        </span>
        <span className="tree-node-type">{element.type}</span>
        <span className="tree-node-name">{element.name}</span>
        {hasProps && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowProps(!showProps);
            }}
            style={{ fontSize: '10px', marginLeft: '8px' }}
          >
            {showProps ? 'Hide' : 'Show'} Props
          </button>
        )}
      </div>
      
      {showProps && hasProps && (
        <div className="tree-node-props">
          {Object.entries(element.properties).map(([key, value]: [string, any]) => (
            <div key={key} className="prop-item">
              <strong>{key}:</strong> {
                typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
              }
            </div>
          ))}
        </div>
      )}
      
      {expanded && hasChildren && (
        <div className="tree-children">
          {element.children.map((child: any, index: number) => (
            <ElementTree key={child.id || index} element={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};