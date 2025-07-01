import { useFigmaBridge } from '../lib/figma-bridge';
import { cn } from '../lib/utils';
import { 
  Palette,
  Type,
  Grid3X3,
  Package,
  FileCode,
  Sparkles,
  ArrowUpDown,
  Zap,
  Eye,
  CheckCircle
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: () => void;
  color: string;
  badge?: string;
}

export function QuickActions() {
  const { sendMessage } = useFigmaBridge();
  
  const quickActions: QuickAction[] = [
    {
      id: 'extract-colors',
      title: 'Extract Colors',
      description: 'Extract colors from selection',
      icon: Palette,
      color: 'text-figma-purple',
      action: () => sendMessage({ type: 'EXTRACT_COLORS' })
    },
    {
      id: 'generate-typography',
      title: 'Typography',
      description: 'Generate typography system',
      icon: Type,
      color: 'text-figma-blue',
      action: () => sendMessage({ type: 'GENERATE_TYPOGRAPHY_SYSTEM' })
    },
    {
      id: 'generate-spacing',
      title: 'Spacing',
      description: 'Create spacing system',
      icon: Grid3X3,
      color: 'text-figma-green',
      action: () => sendMessage({ type: 'GENERATE_SPACING_SYSTEM' })
    },
    {
      id: 'sync-tokens',
      title: 'Sync Tokens',
      description: 'Sync with codebase',
      icon: ArrowUpDown,
      color: 'text-figma-orange',
      action: () => sendMessage({ type: 'SYNC_FROM_CODE' })
    },
    {
      id: 'generate-component',
      title: 'Generate Code',
      description: 'Create component code',
      icon: FileCode,
      color: 'text-figma-red',
      action: () => sendMessage({ type: 'ANALYZE_COMPONENTS' })
    },
    {
      id: 'ai-suggestions',
      title: 'AI Suggestions',
      description: 'Get design improvements',
      icon: Sparkles,
      color: 'text-figma-purple',
      badge: 'New',
      action: () => {
        // TODO: Implement AI suggestions
        console.log('AI suggestions coming soon');
      }
    }
  ];
  
  return (
    <div className="quick-actions-container">
      <h3 className="text-figma-sm font-medium text-figma-text-secondary mb-figma-sm">
        Quick Actions
      </h3>
      <div className="quick-actions-grid">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.action}
              className="quick-action-card"
            >
              <div className="quick-action-header">
                <Icon className={cn("w-5 h-5", action.color)} />
                {action.badge && (
                  <span className="quick-action-badge">{action.badge}</span>
                )}
              </div>
              <h4 className="quick-action-title">{action.title}</h4>
              <p className="quick-action-description">{action.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}