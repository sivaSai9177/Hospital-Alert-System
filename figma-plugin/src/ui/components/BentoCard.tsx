import React from 'react';
import { cn } from '../lib/utils';
import { LucideIcon } from 'lucide-react';

interface BentoCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'gradient' | 'outline';
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-figma-blue',
  className,
  onClick,
  children,
  size = 'medium',
  variant = 'default'
}) => {
  const sizeClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8'
  };

  const variantClasses = {
    default: 'bg-figma-surface border border-figma-border hover:border-figma-border-strong',
    gradient: 'bg-gradient-to-br from-figma-surface to-figma-bg-secondary border border-figma-border',
    outline: 'bg-transparent border-2 border-figma-border hover:bg-figma-surface'
  };

  return (
    <div
      className={cn(
        "bento-card rounded-xl transition-all duration-200",
        sizeClasses[size],
        variantClasses[variant],
        onClick && "cursor-pointer hover:transform hover:scale-[1.02] hover:shadow-lg",
        className
      )}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        {Icon && (
          <div className={cn("mb-4", iconColor)}>
            <Icon className="w-8 h-8" />
          </div>
        )}
        
        <div className="flex-1">
          <h3 className="text-figma-base font-semibold mb-2">{title}</h3>
          {description && (
            <p className="text-figma-sm text-figma-text-secondary mb-4">
              {description}
            </p>
          )}
          
          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "bento-grid grid gap-4",
      "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
};