import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/responsive';
import { useSpacing } from '@/lib/stores/spacing-store';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
  style?: ViewStyle;
}

export function ResponsiveGrid({ 
  children, 
  columns = { mobile: 2, tablet: 3, desktop: 4 },
  gap = 2,
  style 
}: ResponsiveGridProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const { spacing } = useSpacing();
  
  const getColumns = () => {
    if (isMobile) return columns.mobile || 2;
    if (isTablet) return columns.tablet || 3;
    if (isDesktop) return columns.desktop || 4;
    return columns.desktop || 4;
  };
  
  const currentColumns = getColumns();
  const gapSize = spacing[gap] as number;
  
  return (
    <View 
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -gapSize / 2,
          marginVertical: -gapSize / 2,
        },
        style
      ]}
    >
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={{
            width: `${100 / currentColumns}%`,
            paddingHorizontal: gapSize / 2,
            paddingVertical: gapSize / 2,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

// Responsive grid item with aspect ratio support
interface ResponsiveGridItemProps {
  children: React.ReactNode;
  aspectRatio?: number;
  style?: ViewStyle;
}

export function ResponsiveGridItem({ 
  children, 
  aspectRatio,
  style 
}: ResponsiveGridItemProps) {
  return (
    <View 
      style={[
        {
          width: '100%',
          aspectRatio,
        },
        style
      ]}
    >
      {children}
    </View>
  );
}