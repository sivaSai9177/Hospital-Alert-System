import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import React from "react";

export default function Index() {
  const { user, isLoading, hasHydrated, isAuthenticated } = useAuth();

  // Log only on significant changes
  React.useEffect(() => {
    console.log("[INDEX] Auth state:", {
      hasHydrated,
      isLoading,
      isAuthenticated,
      userEmail: user?.email,
      userRole: user?.role,
      needsProfileCompletion: user?.needsProfileCompletion
    });
  }, [hasHydrated, isLoading, isAuthenticated, user]);

  // Add debug log for every render
  console.log("[INDEX] Render - hasHydrated:", hasHydrated, "isLoading:", isLoading, "isAuthenticated:", isAuthenticated, "user:", user?.email);

  // Don't render anything until auth has hydrated
  if (!hasHydrated) {
    console.log("[INDEX] Waiting for auth hydration");
    return null; // Root layout will show loading screen
  }

    // If not authenticated, go to login
    if (!user || !isAuthenticated) {
      console.log("[INDEX] User not authenticated, redirecting to login");
      return <Redirect href="/(public)/auth/login" />;
    }

    // Check if user needs onboarding (new users)
    if (!user.emailVerified || user.needsProfileCompletion === true || user.role === 'user' || !user.role || user.role === 'guest') {
      console.log("[INDEX] User needs onboarding", {
        emailVerified: user.emailVerified,
        needsProfileCompletion: user.needsProfileCompletion,
        role: user.role,
        hasOrganizationId: !!user.organizationId
      });
      // Redirect to onboarding flow for new users
      return <Redirect href="/onboarding/welcome" />;
    }

  // Authenticated user with completed profile goes to home
  console.log("[INDEX] User authenticated with completed profile, redirecting to home");
  return <Redirect href="/home" />;
}