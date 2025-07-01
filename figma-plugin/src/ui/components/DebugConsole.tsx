import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clientLogger, type LogLevel, type LogCategory, type ClientLogEntry } from '../../lib/debug/client-logger';
import { X, Download, Trash2, Filter, Search } from 'lucide-react';

interface DebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebugConsole({ isOpen, onClose }: DebugConsoleProps) {
  const [logs, setLogs] = useState<ClientLogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Set up logger integration
  useEffect(() => {
    const debugInterface = {
      addLog: (entry: ClientLogEntry) => {
        setLogs(prev => [...prev, entry]);
      },
      isEnabled: () => isOpen,
    };

    clientLogger.setDebugConsole(debugInterface);

    // Load initial buffer
    if (isOpen) {
      setLogs(clientLogger.getLogBuffer());
    }
  }, [isOpen]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
    if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;
    if (filter && !log.message.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    clientLogger.clearLogBuffer();
  }, []);

  // Export logs
  const exportLogs = useCallback(() => {
    const dataStr = clientLogger.exportLogs();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `figma-plugin-logs-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, []);

  // Get level color
  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'debug': return 'text-gray-500';
      case 'info': return 'text-blue-600';
      case 'warn': return 'text-yellow-600';
      case 'error': return 'text-red-600';
    }
  };

  // Get category color
  const getCategoryColor = (category: LogCategory) => {
    const colors: Record<LogCategory, string> = {
      'UI': 'bg-purple-100 text-purple-800',
      'FIGMA': 'bg-blue-100 text-blue-800',
      'TRPC': 'bg-green-100 text-green-800',
      'MEMORY': 'bg-yellow-100 text-yellow-800',
      'ROUTER': 'bg-indigo-100 text-indigo-800',
      'ERROR': 'bg-red-100 text-red-800',
      'SYSTEM': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={consoleRef}
      className="fixed bottom-0 left-0 right-0 h-80 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold">Debug Console</h3>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Level filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'all')}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as LogCategory | 'all')}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="UI">UI</option>
            <option value="FIGMA">Figma</option>
            <option value="TRPC">tRPC</option>
            <option value="MEMORY">Memory</option>
            <option value="ROUTER">Router</option>
            <option value="ERROR">Error</option>
            <option value="SYSTEM">System</option>
          </select>

          {/* Auto scroll toggle */}
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>

          {/* Actions */}
          <button
            onClick={exportLogs}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Export logs"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={clearLogs}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Clear logs"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="h-64 overflow-y-auto font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No logs to display
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2">
                {/* Timestamp */}
                <span className="text-gray-400 whitespace-nowrap">
                  {log.timestamp.toLocaleTimeString()}
                </span>

                {/* Level */}
                <span className={`${getLevelColor(log.level)} uppercase font-semibold`}>
                  {log.level.padEnd(5)}
                </span>

                {/* Category */}
                <span className={`px-1 rounded text-xs ${getCategoryColor(log.category)}`}>
                  {log.category}
                </span>

                {/* Message */}
                <span className="flex-1">
                  {log.message}
                  {log.data && (
                    <span className="ml-2 text-gray-500">
                      {typeof log.data === 'object' 
                        ? JSON.stringify(log.data, null, 2)
                        : String(log.data)
                      }
                    </span>
                  )}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-4 py-1 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700">
        Showing {filteredLogs.length} of {logs.length} logs
      </div>
    </div>
  );
}