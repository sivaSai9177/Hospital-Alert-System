import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface BentoCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost' | 'gradient' | 'danger' | 'subtle';
  interactive?: boolean;
  loading?: boolean;
  error?: string;
  badge?: string | number;
  actions?: React.ReactNode;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-figma-blue',
  className,
  onClick,
  children,
  size = 'md',
  variant = 'default',
  interactive = true,
  loading = false,
  error,
  badge,
  actions
}) => {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const variantClasses = {
    default: 'bg-figma-surface border border-figma-border',
    outline: 'bg-transparent border-2 border-figma-border',
    ghost: 'bg-transparent hover:bg-figma-surface',
    gradient: 'bg-gradient-to-br from-figma-surface to-figma-bg-secondary border border-figma-border',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-400',
    subtle: 'bg-figma-bg-secondary border border-figma-border/50'
  };

  const interactiveClasses = interactive && onClick && !loading
    ? 'cursor-pointer hover:border-figma-border-strong hover:shadow-sm transition-all duration-200'
    : '';

  return (
    <div
      className={cn(
        'bento-card rounded-lg relative overflow-hidden',
        sizeClasses[size],
        variantClasses[variant],
        interactiveClasses,
        loading && 'opacity-60 pointer-events-none',
        error && 'border-red-500/50',
        className
      )}
      onClick={onClick}
    >
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-figma-bg/50 z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-figma-blue" />
        </div>
      )}

      {/* Header */}
      {(Icon || title || badge || actions) && (
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            {Icon && (
              <Icon className={cn('w-5 h-5 flex-shrink-0', iconColor)} />
            )}
            <div className="flex-1">
              {title && (
                <h3 className="text-figma-sm font-medium">{title}</h3>
              )}
              {description && (
                <p className="text-figma-xs text-figma-text-secondary mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {badge !== undefined && (
              <span className="px-2 py-0.5 text-figma-xs font-medium bg-figma-blue/10 text-figma-blue rounded">
                {badge}
              </span>
            )}
            {actions}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-figma-xs text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      {children && (
        <div className="bento-card-content">
          {children}
        </div>
      )}
    </div>
  );
};