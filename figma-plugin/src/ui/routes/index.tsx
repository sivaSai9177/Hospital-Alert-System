import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useFigmaBridge } from '../lib/figma-bridge';
import { cn } from '../lib/utils';
import { MessageType } from '../../types/messages';
import { 
  Palette,
  Type,
  Grid3X3,
  Package,
  FileText,
  Zap,
  Activity,
  Clock,
  ArrowRight,
  RefreshCw,
  Download,
  Upload,
  Sparkles,
  Eye,
  Settings,
  Code,
  GitBranch,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Layers,
  Copy,
  Play,
  Pause,
  X
} from 'lucide-react';
import '../styles/dashboard.css';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

interface Operation {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

function DashboardPage() {
  const { selection, isConnected, sendMessage } = useFigmaBridge();
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [operations, setOperations] = useState<Record<string, Operation>>({});

  // Listen for operation results
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data.pluginMessage || {};
      
      switch (type) {
        case MessageType.COLOR_EXTRACTION_RESULT:
          setActiveOperation(null);
          addActivity('Extracted colors from selection', 'success');
          break;
        case MessageType.PAGES_GENERATED:
          setActiveOperation(null);
          addActivity(data.message || 'Generated design system', 'success');
          break;
        case MessageType.ERROR:
          setActiveOperation(null);
          addActivity(data.message || 'Operation failed', 'error');
          break;
        
        // Operation status messages
        case MessageType.OPERATION_STARTED:
          setOperations(prev => ({
            ...prev,
            [data.operationId]: {
              id: data.operationId,
              name: data.name || 'Processing...',
              status: 'running',
              progress: 0
            }
          }));
          addActivity(`Operation started: ${data.name || 'Processing...'}`, 'info');
          break;
        case MessageType.OPERATION_PROGRESS:
          setOperations(prev => ({
            ...prev,
            [data.operationId]: {
              ...prev[data.operationId],
              progress: data.progress || 0,
              message: data.message
            }
          }));
          break;
        case MessageType.OPERATION_COMPLETED:
          setOperations(prev => ({
            ...prev,
            [data.operationId]: {
              ...prev[data.operationId],
              status: 'completed',
              progress: 100
            }
          }));
          addActivity(`Operation completed: ${data.name || 'Success'}`, 'success');
          // Remove completed operations after 5 seconds
          setTimeout(() => {
            setOperations(prev => {
              const { [data.operationId]: _, ...rest } = prev;
              return rest;
            });
          }, 5000);
          break;
        case MessageType.OPERATION_FAILED:
          setOperations(prev => ({
            ...prev,
            [data.operationId]: {
              ...prev[data.operationId],
              status: 'failed'
            }
          }));
          addActivity(`Operation failed: ${data.error || 'Unknown error'}`, 'error');
          break;
        case MessageType.OPERATION_PAUSED:
          setOperations(prev => ({
            ...prev,
            [data.operationId]: {
              ...prev[data.operationId],
              status: 'paused'
            }
          }));
          addActivity('Operation paused', 'info');
          break;
        case MessageType.OPERATION_RESUMED:
          setOperations(prev => ({
            ...prev,
            [data.operationId]: {
              ...prev[data.operationId],
              status: 'running'
            }
          }));
          addActivity('Operation resumed', 'info');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const addActivity = (message: string, status: 'success' | 'error' | 'info') => {
    setRecentActivity(prev => [{
      id: Date.now(),
      message,
      status,
      time: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 4)]);
  };

  const handleQuickAction = (action: string, message: string) => {
    setActiveOperation(action);
    sendMessage({ type: action as MessageType });
    addActivity(message, 'info');
  };

  const handlePauseOperation = (operationId: string) => {
    sendMessage({ 
      type: MessageType.PAUSE_OPERATION, 
      data: { operationId } 
    });
  };

  const handleResumeOperation = (operationId: string) => {
    sendMessage({ 
      type: MessageType.RESUME_OPERATION, 
      data: { operationId } 
    });
  };

  const handleCancelOperation = (operationId: string) => {
    sendMessage({ 
      type: MessageType.CANCEL_OPERATION, 
      data: { operationId } 
    });
    setOperations(prev => {
      const { [operationId]: _, ...rest } = prev;
      return rest;
    });
  };

  const quickActions = [
    {
      id: 'EXTRACT_COLORS',
      label: 'Extract Colors',
      icon: Palette,
      color: 'text-purple-500',
      description: 'Extract palette from selection'
    },
    {
      id: 'GENERATE_TYPOGRAPHY_SYSTEM',
      label: 'Typography',
      icon: Type,
      color: 'text-blue-500',
      description: 'Generate type scale'
    },
    {
      id: 'GENERATE_SPACING_SYSTEM',
      label: 'Spacing',
      icon: Grid3X3,
      color: 'text-green-500',
      description: 'Create spacing tokens'
    },
    {
      id: 'SYNC_TO_CODE',
      label: 'Sync Tokens',
      icon: GitBranch,
      color: 'text-orange-500',
      description: 'Push tokens to code'
    }
  ];

  const navigationCards = [
    {
      title: 'Inspector',
      description: 'Deep dive into element properties',
      icon: Eye,
      route: '/inspector',
      color: 'text-cyan-500',
      badge: selection.length > 0 ? `${selection.length} selected` : null
    },
    {
      title: 'Design System',
      description: 'Manage tokens & components',
      icon: Layers,
      route: '/design-system',
      color: 'text-purple-500'
    },
    {
      title: 'AI Agent',
      description: 'Get design assistance',
      icon: Sparkles,
      route: '/agent',
      color: 'text-pink-500'
    },
    {
      title: 'Settings',
      description: 'Configure plugin',
      icon: Settings,
      route: '/settings',
      color: 'text-gray-500'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-figma-bg">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-figma-border bg-figma-surface">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-figma-base font-semibold">Universal Design System</h1>
            <p className="text-figma-xs text-figma-text-secondary">
              {isConnected ? 'Connected to MCP' : 'Connecting...'}
            </p>
          </div>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-gray-500 animate-pulse"
          )} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Quick Actions */}
        <div className="mb-4">
          <h2 className="text-figma-sm font-medium mb-2">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isActive = activeOperation === action.id;
              
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id, `Starting ${action.label.toLowerCase()}...`)}
                  disabled={isActive}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    "hover:bg-figma-hover hover:border-figma-border-strong",
                    "bg-figma-surface border-figma-border",
                    isActive && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className={cn("w-4 h-4", action.color)} />
                  <div className="text-left flex-1">
                    <div className="text-figma-sm font-medium">{action.label}</div>
                    <div className="text-figma-xs text-figma-text-secondary">
                      {action.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-figma-blue" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Operations */}
        {Object.keys(operations).length > 0 && (
          <div className="mb-4">
            <h2 className="text-figma-sm font-medium mb-2">Active Operations</h2>
            <div className="space-y-2">
              {Object.values(operations).map((operation) => (
                <div
                  key={operation.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    "bg-figma-surface border-figma-border",
                    operation.status === 'failed' && "border-red-500/30"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-figma-sm font-medium">{operation.name}</span>
                      <span className={cn(
                        "text-figma-xs px-2 py-0.5 rounded",
                        operation.status === 'running' && "bg-blue-500/10 text-blue-400",
                        operation.status === 'paused' && "bg-yellow-500/10 text-yellow-400",
                        operation.status === 'failed' && "bg-red-500/10 text-red-400"
                      )}>
                        {operation.status}
                      </span>
                    </div>
                    {operation.message && (
                      <p className="text-figma-xs text-figma-text-secondary mb-2">
                        {operation.message}
                      </p>
                    )}
                    <div className="relative h-1 bg-figma-bg rounded overflow-hidden">
                      <div 
                        className={cn(
                          "absolute left-0 top-0 h-full transition-all",
                          operation.status === 'failed' ? "bg-red-500" : "bg-figma-blue"
                        )}
                        style={{ width: `${operation.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {operation.status === 'running' && (
                      <button
                        onClick={() => handlePauseOperation(operation.id)}
                        className="p-1.5 rounded hover:bg-figma-hover transition-colors"
                        title="Pause operation"
                      >
                        <Pause className="w-3 h-3" />
                      </button>
                    )}
                    {operation.status === 'paused' && (
                      <button
                        onClick={() => handleResumeOperation(operation.id)}
                        className="p-1.5 rounded hover:bg-figma-hover transition-colors"
                        title="Resume operation"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelOperation(operation.id)}
                      className="p-1.5 rounded hover:bg-figma-hover transition-colors"
                      title="Cancel operation"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="mb-4">
          <h2 className="text-figma-sm font-medium mb-2">Tools</h2>
          <div className="grid grid-cols-2 gap-2">
            {navigationCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.route}
                  to={card.route}
                  className={cn(
                    "flex flex-col gap-2 p-3 rounded-lg border transition-all",
                    "hover:bg-figma-hover hover:border-figma-border-strong",
                    "bg-figma-surface border-figma-border"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <Icon className={cn("w-4 h-4", card.color)} />
                    {card.badge && (
                      <span className="text-figma-xs bg-figma-blue/10 text-figma-blue px-2 py-0.5 rounded">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-figma-sm font-medium">{card.title}</div>
                    <div className="text-figma-xs text-figma-text-secondary">
                      {card.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div>
            <h2 className="text-figma-sm font-medium mb-2">Recent Activity</h2>
            <div className="space-y-1">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded text-figma-xs",
                    "bg-figma-surface border border-figma-border",
                    activity.status === 'success' && "border-green-500/20",
                    activity.status === 'error' && "border-red-500/20"
                  )}
                >
                  {activity.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                  {activity.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                  {activity.status === 'info' && <Clock className="w-3 h-3 text-figma-text-secondary" />}
                  <span className="flex-1">{activity.message}</span>
                  <span className="text-figma-text-tertiary">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selection Info */}
        {selection.length > 0 && (
          <div className="mt-4 p-3 bg-figma-surface border border-figma-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-figma-sm font-medium">Current Selection</div>
                <div className="text-figma-xs text-figma-text-secondary">
                  {selection.length} item{selection.length !== 1 ? 's' : ''} selected
                </div>
              </div>
              <Link
                to="/inspector"
                className="flex items-center gap-1 text-figma-xs text-figma-blue hover:underline"
              >
                Inspect <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}