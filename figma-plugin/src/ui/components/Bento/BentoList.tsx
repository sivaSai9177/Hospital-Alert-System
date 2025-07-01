import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronRight, LucideIcon } from 'lucide-react';

interface BentoListItem {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  badge?: string | number;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

interface BentoListProps {
  items: BentoListItem[];
  variant?: 'default' | 'compact' | 'comfortable';
  showDividers?: boolean;
  className?: string;
}

export const BentoList: React.FC<BentoListProps> = ({
  items,
  variant = 'default',
  showDividers = false,
  className
}) => {
  const variantClasses = {
    default: 'p-3',
    compact: 'p-2',
    comfortable: 'p-4'
  };

  return (
    <div className={cn('bento-list', className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        
        return (
          <React.Fragment key={item.id}>
            <button
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg transition-all duration-200',
                'hover:bg-figma-hover',
                variantClasses[variant],
                item.selected && 'bg-figma-selection',
                item.disabled && 'opacity-50 cursor-not-allowed',
                item.onClick && !item.disabled && 'cursor-pointer'
              )}
            >
              {Icon && (
                <Icon className={cn('w-4 h-4 flex-shrink-0', item.iconColor || 'text-figma-text-secondary')} />
              )}
              
              <div className="flex-1 text-left">
                <div className="text-figma-sm font-medium">{item.title}</div>
                {item.description && (
                  <div className="text-figma-xs text-figma-text-secondary mt-0.5">
                    {item.description}
                  </div>
                )}
              </div>
              
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-figma-xs font-medium bg-figma-surface text-figma-text-secondary rounded">
                  {item.badge}
                </span>
              )}
              
              {item.onClick && !item.disabled && (
                <ChevronRight className="w-4 h-4 text-figma-text-tertiary" />
              )}
            </button>
            
            {showDividers && index < items.length - 1 && (
              <div className="mx-3 my-1 border-b border-figma-border" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Empty state component for lists
interface BentoEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const BentoEmptyState: React.FC<BentoEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      {Icon && (
        <Icon className="w-12 h-12 text-figma-text-tertiary mb-3" />
      )}
      <h3 className="text-figma-sm font-medium text-figma-text mb-1">{title}</h3>
      {description && (
        <p className="text-figma-xs text-figma-text-secondary mb-4">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="text-figma-xs text-figma-blue hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};