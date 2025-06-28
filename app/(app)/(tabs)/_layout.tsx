import React from 'react';
import { Slot } from 'expo-router';
import { useHealthcareAccess } from '@/hooks/usePermissions';
import { HealthcareErrorBoundary } from '@/components/blocks/errors/HealthcareErrorBoundary';
import { AppLoadingScreen } from '@/components/blocks/loading/AppLoadingScreen';
import { ResponsiveNavigation } from '@/components/blocks/navigation/ResponsiveNavigation';
import { SidebarProvider } from '@/components/universal/navigation/Sidebar';

export default function TabsLayout() {
  const { isLoading } = useHealthcareAccess();
  
  // Show loading screen while permissions are being determined
  if (isLoading) {
    return <AppLoadingScreen showProgress />;
  }
  
  // Use responsive navigation that switches based on screen size
  return (
    <HealthcareErrorBoundary>
      <SidebarProvider defaultOpen={true}>
        <ResponsiveNavigation>
          <Slot />
        </ResponsiveNavigation>
      </SidebarProvider>
    </HealthcareErrorBoundary>
  );
}