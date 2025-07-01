import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface BentoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

export const BentoButton: React.FC<BentoButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-figma-blue text-white hover:bg-figma-blue-hover',
    secondary: 'bg-figma-surface text-figma-text border border-figma-border hover:bg-figma-hover hover:border-figma-border-strong',
    ghost: 'text-figma-text hover:bg-figma-hover',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-figma-xs gap-1.5',
    md: 'px-4 py-2 text-figma-sm gap-2',
    lg: 'px-6 py-3 text-figma-base gap-2.5'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <button
      className={cn(
        'bento-button inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-figma-blue focus:ring-offset-2 focus:ring-offset-figma-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        loading && 'relative',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
        </div>
      )}
      
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
        {Icon && iconPosition === 'left' && (
          <Icon className={iconSizeClasses[size]} />
        )}
        {children}
        {Icon && iconPosition === 'right' && (
          <Icon className={iconSizeClasses[size]} />
        )}
      </span>
    </button>
  );
};