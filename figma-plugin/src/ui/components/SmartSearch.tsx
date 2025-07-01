import React, { useState, useCallback, useEffect } from 'react';
import { Search, Code, FileText, AlertCircle, Lightbulb } from 'lucide-react';
import { BentoCard } from './Bento/BentoCard';
import { BentoInput } from './Bento/BentoInput';
import { BentoButton } from './Bento/BentoButton';
import { useDebounce } from '../hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'documentation' | 'code' | 'pattern' | 'error';
  title: string;
  content: string;
  path?: string;
  score: number;
  metadata?: any;
}

export const SmartSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  
  const debouncedQuery = useDebounce(query, 300);
  
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Send search request to plugin
      parent.postMessage({
        pluginMessage: {
          type: 'SMART_SEARCH',
          data: {
            query: searchQuery,
            type: selectedType
          }
        }
      }, '*');
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [selectedType]);
  
  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery);
    }
  }, [debouncedQuery, search]);
  
  useEffect(() => {
    // Listen for search results
    const handleMessage = (event: MessageEvent) => {
      if (event.data.pluginMessage?.type === 'SEARCH_RESULTS') {
        setResults(event.data.pluginMessage.data.results);
        setIsSearching(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'documentation':
        return <FileText className="w-4 h-4" />;
      case 'code':
        return <Code className="w-4 h-4" />;
      case 'pattern':
        return <Lightbulb className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'documentation':
        return 'text-blue-600 bg-blue-50';
      case 'code':
        return 'text-green-600 bg-green-50';
      case 'pattern':
        return 'text-purple-600 bg-purple-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };
  
  return (
    <div className="space-y-4">
      <BentoCard title="Smart Search" className="p-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <BentoInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documentation, code examples, patterns..."
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {['all', 'documentation', 'code', 'pattern', 'error'].map((type) => (
              <BentoButton
                key={type}
                variant={selectedType === type ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </BentoButton>
            ))}
          </div>
        </div>
      </BentoCard>
      
      {isSearching && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Searching...</p>
        </div>
      )}
      
      {!isSearching && results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <BentoCard
              key={result.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                parent.postMessage({
                  pluginMessage: {
                    type: 'OPEN_SEARCH_RESULT',
                    data: result
                  }
                }, '*');
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                  {getIcon(result.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">
                      {result.title}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {Math.round(result.score * 100)}% match
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {result.content}
                  </p>
                  
                  {result.path && (
                    <p className="text-xs text-gray-400 mt-1">
                      {result.path}
                    </p>
                  )}
                </div>
              </div>
            </BentoCard>
          ))}
        </div>
      )}
      
      {!isSearching && query && results.length === 0 && (
        <BentoCard className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No results found for "{query}"</p>
          <p className="text-sm text-gray-500 mt-1">
            Try different keywords or check the spelling
          </p>
        </BentoCard>
      )}
      
      {!query && (
        <BentoCard className="p-8 text-center">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Start typing to search</p>
          <div className="mt-4 text-sm text-gray-500 space-y-1">
            <p>• Find documentation and guides</p>
            <p>• Discover code examples</p>
            <p>• Learn design patterns</p>
            <p>• Get error solutions</p>
          </div>
        </BentoCard>
      )}
    </div>
  );
};