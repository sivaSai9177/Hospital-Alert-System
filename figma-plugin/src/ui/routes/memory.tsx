import { createFileRoute } from '@tanstack/react-router';
import { MemoryPanel } from '../components/MemoryPanel';
import { useFigmaBridge } from '../lib/figma-bridge';
import { useState, useEffect } from 'react';
import type { DesignMetadata } from '../../types/memory';

export const Route = createFileRoute('/memory')({
  component: MemoryRoute,
} as any);

function MemoryRoute() {
  const { selection, inspectFrame } = useFigmaBridge();
  const [frameData, setFrameData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the first selected frame if any
  const selectedFrame = selection.find(item => item.type === 'FRAME' || item.type === 'COMPONENT');
  
  // Inspect the selected frame to get detailed data
  useEffect(() => {
    if (selectedFrame) {
      setIsLoading(true);
      inspectFrame(selectedFrame.id)
        .then(data => {
          setFrameData(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Failed to inspect frame:', error);
          setIsLoading(false);
        });
    } else {
      setFrameData(null);
    }
  }, [selectedFrame?.id, inspectFrame]);
  
  // Convert frame data to metadata format
  const currentFrameMetadata: DesignMetadata | undefined = frameData ? {
    width: frameData.dimensions?.width || 0,
    height: frameData.dimensions?.height || 0,
    layoutMode: frameData.autoLayout?.mode || 'NONE',
    primaryAxisSizingMode: frameData.autoLayout?.primaryAxisSizingMode,
    counterAxisSizingMode: frameData.autoLayout?.counterAxisSizingMode,
    colors: [], // Would need to extract from frame styles
    typography: [], // Would need to extract from text styles
    spacing: frameData.autoLayout ? [
      frameData.autoLayout.itemSpacing || 0,
      frameData.autoLayout.paddingTop || 0,
      frameData.autoLayout.paddingRight || 0,
      frameData.autoLayout.paddingBottom || 0,
      frameData.autoLayout.paddingLeft || 0,
    ].filter(v => v > 0) : [],
    effects: [], // Would need to extract from frame effects
    tags: [],
    usageCount: 0,
    lastUsed: new Date(),
    successRate: 1,
    description: frameData.name,
  } : undefined;

  if (!selectedFrame) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Select a frame to use the memory features</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Loading frame data...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-figma-bg">
      <MemoryPanel
        currentFrameId={selectedFrame.id}
        currentFrameName={selectedFrame.name}
        currentFrameMetadata={currentFrameMetadata}
      />
    </div>
  );
}