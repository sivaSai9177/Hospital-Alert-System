import { createFileRoute } from '@tanstack/react-router';
import { SmartSearchSimple } from '../components/SmartSearchSimple';
import { Search } from 'lucide-react';

export const Route = createFileRoute('/search')({
  component: SearchPage,
});

function SearchPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Search className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Smart Search</h1>
            <p className="text-sm text-gray-600">
              Search documentation, code examples, patterns, and solutions
            </p>
          </div>
        </div>
      </div>
      
      <SmartSearchSimple />
      
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Popular Searches</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Token extraction</li>
            <li>• Component generation</li>
            <li>• Real-time sync</li>
            <li>• Error handling</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Search Tips</h3>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• Use specific keywords</li>
            <li>• Filter by type for better results</li>
            <li>• Click code results to copy</li>
            <li>• Try error messages for solutions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}