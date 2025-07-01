import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useFigmaBridge } from '../lib/figma-bridge';
import { cn } from '../lib/utils';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  Copy,
  Play,
  Square,
  Circle,
  Zap
} from 'lucide-react';

export const Route = createFileRoute('/mutations')({
  component: MutationsPage,
});

interface Mutation {
  property: string;
  value: any;
  previousValue?: any;
}

interface MutationPreset {
  name: string;
  icon: any;
  mutations: Mutation[];
}

const mutationPresets: MutationPreset[] = [
  {
    name: 'Card Layout',
    icon: Square,
    mutations: [
      { property: 'layoutMode', value: 'VERTICAL' },
      { property: 'primaryAxisSizingMode', value: 'AUTO' },
      { property: 'counterAxisSizingMode', value: 'FIXED' },
      { property: 'paddingTop', value: 24 },
      { property: 'paddingRight', value: 24 },
      { property: 'paddingBottom', value: 24 },
      { property: 'paddingLeft', value: 24 },
      { property: 'itemSpacing', value: 16 },
      { property: 'cornerRadius', value: 12 },
    ],
  },
  {
    name: 'List Layout',
    icon: Sliders,
    mutations: [
      { property: 'layoutMode', value: 'VERTICAL' },
      { property: 'primaryAxisSizingMode', value: 'AUTO' },
      { property: 'counterAxisSizingMode', value: 'AUTO' },
      { property: 'paddingTop', value: 0 },
      { property: 'paddingRight', value: 0 },
      { property: 'paddingBottom', value: 0 },
      { property: 'paddingLeft', value: 0 },
      { property: 'itemSpacing', value: 1 },
    ],
  },
  {
    name: 'Responsive Grid',
    icon: Zap,
    mutations: [
      { property: 'layoutMode', value: 'HORIZONTAL' },
      { property: 'layoutWrap', value: 'WRAP' },
      { property: 'primaryAxisSizingMode', value: 'AUTO' },
      { property: 'counterAxisSizingMode', value: 'AUTO' },
      { property: 'itemSpacing', value: 16 },
      { property: 'counterAxisSpacing', value: 16 },
    ],
  },
];

function MutationsPage() {
  const { selection, mutateFrame, batchMutateFrames } = useFigmaBridge();
  const [mutations, setMutations] = useState<Map<string, Mutation[]>>(new Map());
  const [isApplying, setIsApplying] = useState(false);
  const [history, setHistory] = useState<Array<{ frameId: string; mutations: Mutation[] }>>([]);

  const selectedFrames = selection.filter(item => 
    ['FRAME', 'COMPONENT', 'INSTANCE'].includes(item.type)
  );

  const addMutation = (frameId: string, mutation: Mutation) => {
    const frameMutations = mutations.get(frameId) || [];
    const existingIndex = frameMutations.findIndex(m => m.property === mutation.property);
    
    if (existingIndex >= 0) {
      frameMutations[existingIndex] = mutation;
    } else {
      frameMutations.push(mutation);
    }
    
    setMutations(new Map(mutations.set(frameId, frameMutations)));
  };

  const removeMutation = (frameId: string, property: string) => {
    const frameMutations = mutations.get(frameId) || [];
    const filtered = frameMutations.filter(m => m.property !== property);
    
    if (filtered.length === 0) {
      mutations.delete(frameId);
    } else {
      mutations.set(frameId, filtered);
    }
    
    setMutations(new Map(mutations));
  };

  const applyPreset = (preset: MutationPreset) => {
    selectedFrames.forEach(frame => {
      mutations.set(frame.id, [...preset.mutations]);
    });
    setMutations(new Map(mutations));
  };

  const applyMutations = async () => {
    if (mutations.size === 0) return;

    setIsApplying(true);
    try {
      const mutationBatch = Array.from(mutations.entries()).map(([frameId, frameMutations]) => ({
        frameId,
        changes: frameMutations.reduce((acc, mut) => ({
          ...acc,
          [mut.property]: mut.value,
        }), {}),
      }));

      await batchMutateFrames(mutationBatch);
      
      // Add to history
      mutationBatch.forEach(({ frameId, changes }) => {
        const frameMutations = mutations.get(frameId) || [];
        history.push({ frameId, mutations: frameMutations });
      });
      setHistory([...history]);
      
      // Clear mutations
      setMutations(new Map());
    } catch (error) {
      console.error('Failed to apply mutations:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const undoLastMutation = async () => {
    if (history.length === 0) return;

    const lastBatch = history[history.length - 1];
    // In a real implementation, we'd apply the reverse mutations
    console.log('Undo:', lastBatch);
    setHistory(history.slice(0, -1));
  };

  return (
    <div className="flex h-full">
      {/* Mutation Builder */}
      <div className="flex-1 overflow-y-auto p-figma-lg">
        <div className="flex items-center justify-between mb-figma-lg">
          <h2 className="text-figma-base font-semibold">Frame Mutations</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={undoLastMutation}
              disabled={history.length === 0}
              className="btn-figma-secondary"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={applyMutations}
              disabled={mutations.size === 0 || isApplying}
              className="btn-figma"
            >
              {isApplying ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span className="ml-1">Apply</span>
            </button>
          </div>
        </div>

        {selectedFrames.length === 0 ? (
          <div className="text-center py-12">
            <Square className="w-12 h-12 text-figma-text-secondary mx-auto mb-4" />
            <p className="text-figma-text-secondary">Select frames to mutate</p>
          </div>
        ) : (
          <div className="space-y-figma-lg">
            {/* Presets */}
            <div>
              <h3 className="text-figma-sm font-medium mb-figma-sm text-figma-text-secondary">Presets</h3>
              <div className="grid grid-cols-3 gap-figma-sm">
                {mutationPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="panel p-figma-sm hover:bg-figma-border transition-colors"
                  >
                    <preset.icon className="w-6 h-6 mx-auto mb-1" />
                    <p className="text-figma-xs">{preset.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Mutations */}
            <div>
              <h3 className="text-figma-sm font-medium mb-figma-sm text-figma-text-secondary">
                Active Mutations ({mutations.size} frames)
              </h3>
              
              {selectedFrames.map((frame) => {
                const frameMutations = mutations.get(frame.id) || [];
                
                return (
                  <div key={frame.id} className="panel mb-figma-sm">
                    <div className="flex items-center justify-between mb-figma-sm">
                      <div className="flex items-center gap-2">
                        <Square className="w-4 h-4" />
                        <span className="text-figma-sm font-medium">{frame.name}</span>
                      </div>
                      {frameMutations.length > 0 && (
                        <span className="text-figma-xs text-figma-text-secondary">
                          {frameMutations.length} mutations
                        </span>
                      )}
                    </div>

                    {frameMutations.length === 0 ? (
                      <p className="text-figma-xs text-figma-text-secondary">No mutations added</p>
                    ) : (
                      <div className="space-y-1">
                        {frameMutations.map((mutation) => (
                          <div
                            key={mutation.property}
                            className="flex items-center justify-between py-1 px-2 bg-figma-bg rounded"
                          >
                            <span className="text-figma-xs">
                              <span className="text-figma-text-secondary">{mutation.property}:</span>{' '}
                              <span className="text-figma-blue">{JSON.stringify(mutation.value)}</span>
                            </span>
                            <button
                              onClick={() => removeMutation(frame.id, mutation.property)}
                              className="text-figma-text-secondary hover:text-figma-red"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Property Panel */}
      <div className="w-80 border-l border-figma-border p-figma-lg">
        <h3 className="text-figma-sm font-medium mb-figma-md">Properties</h3>
        
        {selectedFrames.length === 1 ? (
          <PropertyEditor
            frameId={selectedFrames[0].id}
            onAddMutation={(mutation) => addMutation(selectedFrames[0].id, mutation)}
          />
        ) : selectedFrames.length > 1 ? (
          <div>
            <p className="text-figma-xs text-figma-text-secondary mb-figma-md">
              Editing {selectedFrames.length} frames
            </p>
            <PropertyEditor
              frameId="batch"
              onAddMutation={(mutation) => {
                selectedFrames.forEach(frame => addMutation(frame.id, mutation));
              }}
            />
          </div>
        ) : (
          <p className="text-figma-xs text-figma-text-secondary">Select a frame to edit properties</p>
        )}
      </div>
    </div>
  );
}

function PropertyEditor({ frameId, onAddMutation }: { 
  frameId: string; 
  onAddMutation: (mutation: Mutation) => void;
}) {
  const [layoutMode, setLayoutMode] = useState<string>('NONE');
  const [padding, setPadding] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [spacing, setSpacing] = useState(0);
  const [cornerRadius, setCornerRadius] = useState(0);

  return (
    <div className="space-y-figma-md">
      {/* Layout Mode */}
      <div>
        <label className="text-figma-xs text-figma-text-secondary">Layout Mode</label>
        <select
          value={layoutMode}
          onChange={(e) => {
            setLayoutMode(e.target.value);
            onAddMutation({ property: 'layoutMode', value: e.target.value });
          }}
          className="input-figma w-full mt-1"
        >
          <option value="NONE">None</option>
          <option value="HORIZONTAL">Horizontal</option>
          <option value="VERTICAL">Vertical</option>
        </select>
      </div>

      {layoutMode !== 'NONE' && (
        <>
          {/* Spacing */}
          <div>
            <label className="text-figma-xs text-figma-text-secondary">Item Spacing</label>
            <input
              type="number"
              value={spacing}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                setSpacing(value);
                onAddMutation({ property: 'itemSpacing', value });
              }}
              className="input-figma w-full mt-1"
            />
          </div>

          {/* Padding */}
          <div>
            <label className="text-figma-xs text-figma-text-secondary">Padding</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.entries(padding).map(([key, value]) => (
                <input
                  key={key}
                  type="number"
                  value={value}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    setPadding({ ...padding, [key]: newValue });
                    onAddMutation({ property: `padding${key.charAt(0).toUpperCase() + key.slice(1)}`, value: newValue });
                  }}
                  placeholder={key}
                  className="input-figma"
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Corner Radius */}
      <div>
        <label className="text-figma-xs text-figma-text-secondary">Corner Radius</label>
        <input
          type="number"
          value={cornerRadius}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 0;
            setCornerRadius(value);
            onAddMutation({ property: 'cornerRadius', value });
          }}
          className="input-figma w-full mt-1"
        />
      </div>
    </div>
  );
}