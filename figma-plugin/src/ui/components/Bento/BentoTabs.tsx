import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

interface BentoTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export const BentoTabs: React.FC<BentoTabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const variantClasses = {
    default: {
      container: 'border-b border-figma-border',
      tab: 'border-b-2 -mb-px',
      activeTab: 'border-figma-blue text-figma-blue',
      inactiveTab: 'border-transparent text-figma-text-secondary hover:text-figma-text'
    },
    pills: {
      container: 'bg-figma-surface p-1 rounded-lg',
      tab: '',
      activeTab: 'bg-figma-bg text-figma-text shadow-sm',
      inactiveTab: 'text-figma-text-secondary hover:text-figma-text'
    },
    underline: {
      container: '',
      tab: 'border-b-2',
      activeTab: 'border-figma-blue text-figma-blue',
      inactiveTab: 'border-transparent text-figma-text-secondary hover:text-figma-text hover:border-figma-border'
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-figma-xs',
    md: 'px-4 py-2 text-figma-sm'
  };

  const styles = variantClasses[variant];

  return (
    <div className={cn('bento-tabs', className)}>
      <div className={cn(
        'flex',
        styles.container,
        fullWidth ? 'w-full' : 'inline-flex',
        variant === 'pills' && 'gap-1'
      )}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 font-medium transition-all duration-200',
                'focus:outline-none',
                sizeClasses[size],
                styles.tab,
                isActive ? styles.activeTab : styles.inactiveTab,
                variant === 'pills' && 'rounded-md',
                fullWidth && 'flex-1 justify-center'
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
              {tab.badge !== undefined && (
                <span className={cn(
                  'px-1.5 py-0.5 text-xs font-normal rounded',
                  isActive
                    ? 'bg-figma-blue/10 text-figma-blue'
                    : 'bg-figma-surface text-figma-text-secondary'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface BentoTabPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const BentoTabPanel: React.FC<BentoTabPanelProps> = ({ children, className }) => {
  return (
    <div className={cn('bento-tab-panel mt-4', className)}>
      {children}
    </div>
  );
};