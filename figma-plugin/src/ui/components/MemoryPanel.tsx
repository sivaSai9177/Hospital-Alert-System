import React, { useState } from 'react';
import { useMemory, useDesignSuggestions } from '../../hooks/useMemory';
import { Search, Brain, History, Settings, Download, Trash2 } from 'lucide-react';
import type { DesignMetadata } from '../../types/memory';

interface MemoryPanelProps {
  currentFrameId?: string;
  currentFrameName?: string;
  currentFrameMetadata?: DesignMetadata;
}

export function MemoryPanel({ 
  currentFrameId, 
  currentFrameName, 
  currentFrameMetadata 
}: MemoryPanelProps) {
  const memory = useMemory({ autoInitialize: true });
  const suggestions = useDesignSuggestions(currentFrameMetadata);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'search' | 'history' | 'settings'>('suggestions');
  const [isExporting, setIsExporting] = useState(false);

  // Handle semantic search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const results = await memory.semanticSearch(searchQuery);
    setSearchResults(results);
  };

  // Handle storing current frame
  const handleStoreFrame = async () => {
    if (!currentFrameId || !currentFrameName || !currentFrameMetadata) {
      console.error('Missing frame data');
      return;
    }

    try {
      await memory.storeCurrentFrame(
        currentFrameId,
        currentFrameName,
        currentFrameMetadata,
        `Stored from UI at ${new Date().toLocaleString()}`
      );
      // Refresh suggestions after storing
      suggestions.refresh();
    } catch (error) {
      console.error('Failed to store frame:', error);
    }
  };

  // Render memory stats
  const stats = memory.getStats.useQuery(undefined, { enabled: memory.isInitialized });

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
      <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Design Memory
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          AI-powered design pattern recognition and suggestions
        </p>
      </div>

      {!memory.isInitialized ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Memory service not initialized
          </p>
          <button 
            onClick={() => memory.initialize()}
            disabled={memory.isInitializing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {memory.isInitializing ? 'Initializing...' : 'Initialize Memory'}
          </button>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
            {(['suggestions', 'search', 'history', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'suggestions' && (
              <div className="space-y-4">
                {currentFrameId && (
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Similar designs based on current frame
                    </p>
                    <button
                      onClick={handleStoreFrame}
                      disabled={memory.isStoringPattern}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Store Current Frame
                    </button>
                  </div>
                )}
                
                {suggestions.isLoading ? (
                  <p className="text-center py-4 text-gray-500">
                    Finding similar designs...
                  </p>
                ) : suggestions.suggestions.length > 0 ? (
                  <div className="space-y-2">
                    {suggestions.suggestions.map((result) => (
                      <div key={result.item.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{result.item.frameName}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {result.item.metadata.description || 'No description'}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                                {Math.round(result.score * 100)}% match
                              </span>
                              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                {result.item.metadata.category || 'Uncategorized'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              console.log('Apply design:', result.item);
                            }}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-gray-500">
                    No similar designs found
                  </p>
                )}
              </div>
            )}

            {activeTab === 'search' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search designs by description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button 
                    onClick={handleSearch} 
                    disabled={memory.isSearching}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <div key={result.item.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <h4 className="font-medium">{result.item.frameName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {result.item.metadata.description}
                        </p>
                        <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
                          {Math.round(result.score * 100)}% relevance
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Recent Mutations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track successful design changes and patterns
                </p>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500">
                  Coming soon: Mutation history tracking
                </div>
              </div>
            )}

            {activeTab === 'settings' && stats.data && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Memory Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold">
                        {stats.data.stats.totalVectors}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total Vectors
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold">
                        {stats.data.stats.collections.length}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Collections
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Collections</h3>
                  {stats.data.stats.collections.map((col) => (
                    <div key={col.name} className="flex justify-between text-sm">
                      <span>{col.name}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {col.count} items
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={async () => {
                      setIsExporting(true);
                      try {
                        // For now, just log a message - would need to implement export differently
                        console.log('Export feature coming soon');
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all memory?')) {
                        memory.clearAllMemory({ confirm: 'DELETE_ALL_MEMORY' });
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}