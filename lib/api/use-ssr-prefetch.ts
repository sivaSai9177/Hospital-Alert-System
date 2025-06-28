import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api } from './trpc';
import { usePathname, useGlobalSearchParams } from 'expo-router';
import { logger } from '@/lib/core/debug/unified-logger';
import { prefetchHelpers } from './ssr-utils';

interface PrefetchOptions {
  enabled?: boolean;
  dependencies?: any[];
}

/**
 * Hook to prefetch data for SSR on web platform
 */
export function useSSRPrefetch(
  prefetchFn: () => Promise<any>,
  options?: PrefetchOptions
) {
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchError, setPrefetchError] = useState<Error | null>(null);
  const enabled = options?.enabled ?? true;
  const dependencies = options?.dependencies || [];

  useEffect(() => {
    // Only prefetch on web during SSR
    if (Platform.OS !== 'web' || !enabled) return;
    
    // Check if we're in SSR context
    const isSSR = typeof window === 'undefined';
    if (!isSSR) return;

    let cancelled = false;

    const prefetch = async () => {
      setIsPrefetching(true);
      setPrefetchError(null);

      try {
        await prefetchFn();
        logger.debug('SSR prefetch completed', 'SSR_PREFETCH');
      } catch (error) {
        if (!cancelled) {
          logger.error('SSR prefetch failed', 'SSR_PREFETCH', error);
          setPrefetchError(error as Error);
        }
      } finally {
        if (!cancelled) {
          setIsPrefetching(false);
        }
      }
    };

    prefetch();

    return () => {
      cancelled = true;
    };
  }, [enabled, prefetchFn, ...dependencies]);

  return { isPrefetching, prefetchError };
}

/**
 * Client-side prefetch hook for Expo Router
 */
export function useClientPrefetch() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const utils = api.useUtils();
  
  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web') return;
    
    logger.debug('Client prefetch hook', 'SSR', { pathname, params });
    
    // Prefetch based on current route
    switch (pathname) {
      case '/':
      case '/index':
        // Prefetch user session
        utils.auth.getSession.prefetch();
        break;
        
      case '/dashboard':
      case '/operator-dashboard':
        // Prefetch user and organization data
        utils.auth.getSession.prefetch();
        if (params.organizationId && typeof params.organizationId === 'string') {
          utils.organization.get.prefetch({ organizationId: params.organizationId });
        }
        break;
        
      case '/healthcare':
      case '/healthcare/alerts':
      case '/alerts':
        // Prefetch healthcare data
        if (params.hospitalId && typeof params.hospitalId === 'string') {
          utils.healthcare.getActiveAlerts.prefetch({ hospitalId: params.hospitalId });
          utils.healthcare.getMetrics.prefetch();
        }
        break;
        
      case '/alerts/escalation-queue':
        // Prefetch escalation queue data
        if (params.hospitalId && typeof params.hospitalId === 'string') {
          utils.healthcare.getActiveAlerts.prefetch({ hospitalId: params.hospitalId });
        }
        break;
    }
  }, [pathname, params, utils]);
}

/**
 * Hook to prefetch healthcare data for SSR
 */
export function useSSRPrefetchHealthcare(hospitalId?: string) {
  return useSSRPrefetch(
    async () => {
      if (!hospitalId) return null;
      
      const cookie = Platform.OS === 'web' 
        ? document.cookie 
        : undefined;
      
      return prefetchHelpers.healthcare(hospitalId, cookie);
    },
    {
      enabled: !!hospitalId && Platform.OS === 'web',
      dependencies: [hospitalId],
    }
  );
}

/**
 * Hook to prefetch organization data for SSR
 */
export function useSSRPrefetchOrganization(organizationId?: string) {
  return useSSRPrefetch(
    async () => {
      if (!organizationId) return null;
      
      const cookie = Platform.OS === 'web' 
        ? document.cookie 
        : undefined;
      
      return prefetchHelpers.organization(organizationId, cookie);
    },
    {
      enabled: !!organizationId && Platform.OS === 'web',
      dependencies: [organizationId],
    }
  );
}

/**
 * Hook to prefetch user session for SSR
 */
export function useSSRPrefetchUser() {
  return useSSRPrefetch(
    async () => {
      const cookie = Platform.OS === 'web' 
        ? document.cookie 
        : undefined;
      
      return prefetchHelpers.user(cookie);
    },
    {
      enabled: Platform.OS === 'web',
    }
  );
}

/**
 * Hook to get SSR data on initial load
 */
export function useSSRData() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  
  const { data } = api.ssr.prefetchPage.useQuery(
    {
      path: pathname,
      params: params as Record<string, string>,
    },
    {
      enabled: Platform.OS === 'web' && typeof window !== 'undefined',
      staleTime: Infinity, // Never refetch SSR data
    }
  );
  
  return data?.dehydratedState;
}

/**
 * Higher-order component to add SSR prefetching to pages
 */
export function withSSRPrefetch<P extends object>(
  Component: React.ComponentType<P>,
  prefetchFn: (props: P) => Promise<any>
) {
  return function SSRPrefetchWrapper(props: P & { dehydratedState?: any }) {
    // On server, the dehydratedState will be passed as a prop
    // On client, we'll use it if available
    const [dehydratedState] = useState(props.dehydratedState);

    // Client-side prefetch if no dehydrated state
    useEffect(() => {
      if (Platform.OS === 'web' && !dehydratedState) {
        prefetchFn(props).catch(error => {
          logger.error('Client-side prefetch failed', 'SSR_HOC', error);
        });
      }
    }, [props, dehydratedState, prefetchFn]);

    return React.createElement(Component, props);
  };
}