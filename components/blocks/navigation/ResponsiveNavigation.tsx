import React, { useEffect, useState } from 'react';
import { Dimensions, Platform, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { EnhancedSidebar } from './EnhancedSidebar';
import { MobileNavigation } from './MobileNavigation';
import { BREAKPOINTS } from '@/lib/design/responsive-spacing';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';

interface ResponsiveNavigationProps {
  children?: React.ReactNode;
}

export function ResponsiveNavigation({ children }: ResponsiveNavigationProps) {
  const { width } = useWindowDimensions();
  const [navigationMode, setNavigationMode] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  useEffect(() => {
    if (width < BREAKPOINTS.tablet) {
      setNavigationMode('mobile');
    } else if (width < BREAKPOINTS.desktop) {
      setNavigationMode('tablet');
    } else {
      setNavigationMode('desktop');
    }
  }, [width]);

  // Desktop: Enhanced sidebar
  if (navigationMode === 'desktop') {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <EnhancedSidebar />
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </View>
    );
  }

  // Mobile/Tablet: Tab bar + drawer
  return <MobileNavigation>{children}</MobileNavigation>;
}