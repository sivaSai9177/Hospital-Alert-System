import React, { useState, useEffect } from 'react';
import { Lightbulb, Copy, Check, Code } from 'lucide-react';
import { BentoCard } from './Bento/BentoCard';
import { BentoButton } from './Bento/BentoButton';
import { trpc } from '../lib/trpc';
import { useFigmaBridge } from '../lib/figma-bridge';

interface Suggestion {
  code: string;
  description: string;
  confidence: number;
  pattern?: string;
}

export const CodeSuggestions: React.FC = () => {
  const { selection } = useFigmaBridge();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [context, setContext] = useState('');
  
  // Build context from selection
  useEffect(() => {
    if (selection && selection.length > 0) {
      const node = selection[0];
      setContext(`${node.type} ${node.name || 'Untitled'}`);
    }
  }, [selection]);
  
  // Get suggestions based on context
  const suggestionsQuery = trpc.figma.search.smartSearch.useQuery(
    {
      query: context || 'component generation pattern',
      type: 'pattern',
      limit: 3
    },
    {
      enabled: true,
      staleTime: 5 * 60 * 1000
    }
  );
  
  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    
    // Notify plugin
    parent.postMessage({
      pluginMessage: {
        type: 'NOTIFY',
        data: { message: 'Code copied to clipboard!' }
      }
    }, '*');
  };
  
  const generateSuggestions = (): Suggestion[] => {
    if (!suggestionsQuery.data?.results) return [];
    
    return suggestionsQuery.data.results.map((result: any) => ({
      code: result.code || '',
      description: result.description || result.name || '',
      confidence: result.score || 0.8,
      pattern: result.name
    }));
  };
  
  const suggestions = generateSuggestions();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-gray-900">Code Suggestions</h3>
      </div>
      
      {selection && selection.length > 0 ? (
        <>
          <p className="text-sm text-gray-600 mb-3">
            Suggestions for: <span className="font-medium">{context}</span>
          </p>
          
          {suggestionsQuery.isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Finding patterns...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <BentoCard key={index} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">
                          {suggestion.pattern || `Pattern ${index + 1}`}
                        </p>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {Math.round(suggestion.confidence * 100)}% match
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        {suggestion.description}
                      </p>
                      <div className="bg-gray-50 rounded-md p-3 font-mono text-xs overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{suggestion.code}</pre>
                      </div>
                    </div>
                    <BentoButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopy(suggestion.code, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </BentoButton>
                  </div>
                </BentoCard>
              ))}
            </div>
          ) : (
            <BentoCard className="p-6 text-center">
              <p className="text-gray-600">No suggestions found for this selection</p>
              <p className="text-sm text-gray-500 mt-1">
                Try selecting a different element or indexing more patterns
              </p>
            </BentoCard>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Tip:</strong> These suggestions are based on indexed patterns. 
              Add more patterns to improve suggestions.
            </p>
          </div>
        </>
      ) : (
        <BentoCard className="p-6 text-center">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Select an element to get code suggestions</p>
          <p className="text-sm text-gray-500 mt-1">
            AI will suggest relevant code patterns based on your selection
          </p>
        </BentoCard>
      )}
    </div>
  );
};