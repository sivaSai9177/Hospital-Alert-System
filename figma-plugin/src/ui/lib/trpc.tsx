import { createTRPCReact } from '@trpc/react-query';
import { createTRPCProxyClient, httpBatchLink, wsLink, createWSClient, splitLink, loggerLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import superjson from 'superjson';
import type { AppRouter } from '../../../mcp-server/src/server';
import { logger } from '../../lib/debug/client-logger';

// Create tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Create vanilla client for non-React contexts
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      enabled: () => process.env.NODE_ENV === 'development',
      logger: (opts) => {
        const { direction, type } = opts;
        if (direction === 'down' && opts.result instanceof Error) {
          logger.trpc.error(`${type} error:`, opts.result);
        } else if (direction === 'up') {
          logger.trpc.debug(`${type} request:`, opts);
        }
      },
    }),
    httpBatchLink({
      url: 'http://localhost:3456/trpc',
      transformer: superjson,
      headers() {
        return {
          'x-figma-file-key': '',
          'x-figma-user-id': '',
        };
      },
    }),
  ],
});

interface TRPCProviderProps {
  children: React.ReactNode;
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  const [trpcClientInstance] = useState(() => {
    // Check if WebSocket is needed
    const wsClient = createWSClient({
      url: 'ws://localhost:3458',
      onOpen: () => {
        console.log('WebSocket connected');
      },
      onClose: () => {
        console.log('WebSocket disconnected');
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
    });

    return trpc.createClient({
      links: [
        loggerLink({
          enabled: () => process.env.NODE_ENV === 'development',
          logger: (opts) => {
            const { direction, type } = opts;
            if (direction === 'down' && opts.result instanceof Error) {
              logger.trpc.error(`${type} error:`, opts.result);
            } else if (direction === 'up') {
              logger.trpc.debug(`${type} request:`, opts);
            }
          },
        }),
        splitLink({
          condition: (op) => op.type === 'subscription',
          true: wsLink({
            client: wsClient,
            transformer: superjson,
          }),
          false: httpBatchLink({
            url: 'http://localhost:3456/trpc',
            transformer: superjson,
            headers() {
              return {
                'x-figma-file-key': '',
                'x-figma-user-id': '',
              };
            },
          }),
        }),
      ],
    });
  });

  return (
    <trpc.Provider client={trpcClientInstance} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// Hooks for common patterns
export function useOptimisticMutation<TOutput>(
  mutationFn: any,
  options?: {
    onSuccess?: (data: TOutput) => void;
    onError?: (error: any) => void;
  }
) {
  const utils = trpc.useUtils();
  
  return mutationFn.useMutation({
    onMutate: async () => {
      await utils.invalidate();
    },
    onError: (error: any) => {
      console.error('Mutation failed:', error);
      options?.onError?.(error);
    },
    onSuccess: (data: TOutput) => {
      options?.onSuccess?.(data);
    },
    onSettled: () => {
      utils.invalidate();
    },
  });
}