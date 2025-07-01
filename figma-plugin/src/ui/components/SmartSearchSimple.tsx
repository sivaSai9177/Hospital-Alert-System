import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { BentoCard } from './Bento/BentoCard';
import { BentoInput } from './Bento/BentoInput';
import { BentoButton } from './Bento/BentoButton';
import { trpc } from '../lib/trpc';

interface SearchResult {
  type: 'documentation' | 'code' | 'pattern' | 'error';
  title: string;
  content: string;
  score?: number;
}

export const SmartSearchSimple: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  
  // Use tRPC query with manual fetch
  const searchQuery = trpc.figma.search.smartSearch.useQuery(
    { query, type: searchType as any },
    { 
      enabled: false, // Manual control
      staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    }
  );
  
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      searchQuery.refetch();
    }
  }, [query, searchQuery]);
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <div className="space-y-4">
      <BentoCard title="Smart Search" className="p-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            <BentoInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search docs, code, patterns..."
              className="flex-1"
            />
            <BentoButton
              onClick={handleSearch}
              disabled={!query.trim() || searchQuery.isFetching}
            >
              <Search className="w-4 h-4" />
            </BentoButton>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {['all', 'documentation', 'code', 'pattern', 'error'].map((type) => (
              <button
                key={type}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  searchType === type 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setSearchType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </BentoCard>
      
      {searchQuery.isFetching && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Searching...</p>
        </div>
      )}
      
      {searchQuery.data?.results && searchQuery.data.results.length > 0 && (
        <div className="space-y-2">
          {searchQuery.data.results.map((result: any, index: number) => (
            <BentoCard
              key={`${result.type}-${index}`}
              className="p-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                // Handle result click
                if (result.type === 'code' && result.code) {
                  navigator.clipboard.writeText(result.code);
                  parent.postMessage({
                    pluginMessage: {
                      type: 'NOTIFY',
                      data: { message: 'Code copied to clipboard!' }
                    }
                  }, '*');
                }
              }}
            >
              <div className="flex items-start gap-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  result.type === 'documentation' ? 'bg-blue-100 text-blue-600' :
                  result.type === 'code' ? 'bg-green-100 text-green-600' :
                  result.type === 'pattern' ? 'bg-purple-100 text-purple-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {result.type}
                </span>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 truncate">
                    {result.title || result.name || 'Untitled'}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {result.content || result.description || result.solution || ''}
                  </p>
                  {result.score && (
                    <p className="text-xs text-gray-400 mt-1">
                      Score: {Math.round(result.score * 100)}%
                    </p>
                  )}
                </div>
              </div>
            </BentoCard>
          ))}
        </div>
      )}
      
      {searchQuery.data?.results && searchQuery.data.results.length === 0 && (
        <BentoCard className="p-6 text-center">
          <p className="text-gray-600">No results found for "{query}"</p>
          <p className="text-sm text-gray-500 mt-1">Try different keywords</p>
        </BentoCard>
      )}
      
      {searchQuery.error && (
        <BentoCard className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600 text-sm">
            Search error: {searchQuery.error.message}
          </p>
        </BentoCard>
      )}
    </div>
  );
};