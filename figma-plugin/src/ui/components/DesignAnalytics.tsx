import { useState, useEffect } from 'react';
import { useFigmaBridge } from '../lib/figma-bridge';
import { 
  TrendingUp,
  Palette,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';

interface AnalyticsData {
  colorUsage: {
    total: number;
    unique: number;
    mostUsed: string[];
  };
  componentStats: {
    total: number;
    instances: number;
    unique: number;
  };
  consistency: {
    score: number;
    issues: string[];
  };
  lastSync: string | null;
}

export function DesignAnalytics() {
  const { sendMessage } = useFigmaBridge();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock data for demonstration
  useEffect(() => {
    // In a real implementation, this would fetch from Figma
    setAnalytics({
      colorUsage: {
        total: 42,
        unique: 12,
        mostUsed: ['#0066FF', '#00AA44', '#FF3366']
      },
      componentStats: {
        total: 156,
        instances: 89,
        unique: 24
      },
      consistency: {
        score: 85,
        issues: ['3 colors not in design system', '5 components missing documentation']
      },
      lastSync: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    });
  }, []);
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-figma-green';
    if (score >= 70) return 'text-figma-orange';
    return 'text-figma-red';
  };
  
  const formatTimeAgo = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return diffMins + ' minutes ago';
    if (diffMins < 1440) return Math.floor(diffMins / 60) + ' hours ago';
    return Math.floor(diffMins / 1440) + ' days ago';
  };
  
  if (!analytics) {
    return (
      <div className="analytics-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-figma-blue"></div>
        <p className="text-figma-sm text-figma-text-secondary mt-2">Loading analytics...</p>
      </div>
    );
  }
  
  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h3 className="text-figma-sm font-medium text-figma-text-secondary mb-figma-sm">
          Design Analytics
        </h3>
        <button className="text-figma-xs text-figma-blue hover:underline">
          Refresh
        </button>
      </div>
      
      <div className="analytics-grid">
        {/* Color Usage */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <Palette className="w-4 h-4 text-figma-purple" />
            <span className="analytics-card-title">Colors</span>
          </div>
          <div className="analytics-card-value">{analytics.colorUsage.unique}</div>
          <div className="analytics-card-subtitle">unique colors</div>
          <div className="analytics-card-footer">
            <div className="color-swatches">
              {analytics.colorUsage.mostUsed.map((color, idx) => (
                <div
                  key={idx}
                  className="color-swatch"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Component Stats */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <Package className="w-4 h-4 text-figma-blue" />
            <span className="analytics-card-title">Components</span>
          </div>
          <div className="analytics-card-value">{analytics.componentStats.total}</div>
          <div className="analytics-card-subtitle">total components</div>
          <div className="analytics-card-footer">
            <span className="text-figma-xs text-figma-text-secondary">
              {analytics.componentStats.unique} unique, {analytics.componentStats.instances} instances
            </span>
          </div>
        </div>
        
        {/* Consistency Score */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <TrendingUp className="w-4 h-4 text-figma-green" />
            <span className="analytics-card-title">Consistency</span>
          </div>
          <div className={`analytics-card-value ${getScoreColor(analytics.consistency.score)}`}>
            {analytics.consistency.score}%
          </div>
          <div className="analytics-card-subtitle">design score</div>
          <div className="analytics-card-footer">
            {analytics.consistency.issues.length > 0 ? (
              <span className="text-figma-xs text-figma-orange flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {analytics.consistency.issues.length} issues
              </span>
            ) : (
              <span className="text-figma-xs text-figma-green flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                All good!
              </span>
            )}
          </div>
        </div>
        
        {/* Last Sync */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <Clock className="w-4 h-4 text-figma-orange" />
            <span className="analytics-card-title">Last Sync</span>
          </div>
          <div className="analytics-card-value text-figma-sm">
            {formatTimeAgo(analytics.lastSync)}
          </div>
          <div className="analytics-card-subtitle">with codebase</div>
          <div className="analytics-card-footer">
            <button className="text-figma-xs text-figma-blue hover:underline">
              Sync now
            </button>
          </div>
        </div>
      </div>
      
      {/* Issues Summary */}
      {analytics.consistency.issues.length > 0 && (
        <div className="analytics-issues">
          <h4 className="text-figma-xs font-medium text-figma-text-secondary mb-figma-xs">
            Issues to Address
          </h4>
          <ul className="space-y-figma-xs">
            {analytics.consistency.issues.map((issue, idx) => (
              <li key={idx} className="text-figma-xs text-figma-text-secondary flex items-start gap-2">
                <AlertCircle className="w-3 h-3 text-figma-orange mt-0.5 flex-shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}