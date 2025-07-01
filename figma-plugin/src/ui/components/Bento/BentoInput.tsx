import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface BentoInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const BentoInput: React.FC<BentoInputProps> = ({
  label,
  error,
  hint,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = true,
  className,
  ...props
}) => {
  const hasIcon = !!Icon;
  const hasLeftIcon = hasIcon && iconPosition === 'left';
  const hasRightIcon = hasIcon && iconPosition === 'right';

  return (
    <div className={cn('bento-input-wrapper', fullWidth && 'w-full')}>
      {label && (
        <label className="block text-figma-xs font-medium text-figma-text mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {hasLeftIcon && (
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-figma-text-secondary">
            <Icon className="w-4 h-4" />
          </div>
        )}
        
        <input
          className={cn(
            'bento-input w-full px-3 py-2 bg-figma-surface text-figma-sm',
            'border border-figma-border rounded-lg',
            'focus:outline-none focus:border-figma-blue focus:ring-1 focus:ring-figma-blue',
            'placeholder:text-figma-text-tertiary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200',
            hasLeftIcon && 'pl-9',
            hasRightIcon && 'pr-9',
            error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        
        {hasRightIcon && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-figma-text-secondary">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      
      {(error || hint) && (
        <p className={cn(
          'mt-1 text-figma-xs',
          error ? 'text-red-400' : 'text-figma-text-secondary'
        )}>
          {error || hint}
        </p>
      )}
    </div>
  );
};