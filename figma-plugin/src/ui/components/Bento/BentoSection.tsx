import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface BentoSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  actions?: React.ReactNode;
  variant?: 'default' | 'flush';
}

export const BentoSection: React.FC<BentoSectionProps> = ({
  title,
  description,
  children,
  className,
  collapsible = false,
  defaultExpanded = true,
  actions,
  variant = 'default'
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const variantClasses = {
    default: 'bg-figma-surface border border-figma-border rounded-lg p-4',
    flush: ''
  };

  return (
    <div className={cn('bento-section', variantClasses[variant], className)}>
      <div
        className={cn(
          'flex items-center justify-between',
          collapsible && 'cursor-pointer',
          (isExpanded && children) && 'mb-3'
        )}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center gap-2 flex-1">
          {collapsible && (
            <button className="p-0.5 hover:bg-figma-hover rounded transition-colors">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          <div>
            <h3 className="text-figma-sm font-medium">{title}</h3>
            {description && (
              <p className="text-figma-xs text-figma-text-secondary mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      
      {(!collapsible || isExpanded) && children && (
        <div className="bento-section-content">
          {children}
        </div>
      )}
    </div>
  );
};