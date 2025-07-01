import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { z } from 'zod';
import { logger } from '../../lib/debug/client-logger';

// Message schemas
const SelectionChangedSchema = z.object({
  type: z.literal('SELECTION_CHANGED'),
  selection: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
  })),
});

const FrameInspectionResultSchema = z.object({
  type: z.literal('FRAME_INSPECTION_RESULT'),
  data: z.union([
    // Success case
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      dimensions: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      autoLayout: z.object({
        mode: z.enum(['NONE', 'HORIZONTAL', 'VERTICAL']),
        primaryAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
        counterAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
        itemSpacing: z.number().optional(),
        paddingTop: z.number().optional(),
        paddingRight: z.number().optional(),
        paddingBottom: z.number().optional(),
        paddingLeft: z.number().optional(),
      }).optional(),
      hierarchy: z.any().optional(),
      issues: z.array(z.string()).optional(),
    }),
    // Error case
    z.object({
      id: z.string(),
      error: z.string(),
    }),
  ]),
});

type MessageFromPlugin = 
  | z.infer<typeof SelectionChangedSchema>
  | z.infer<typeof FrameInspectionResultSchema>
  | { type: 'ERROR'; error: string }
  | { type: 'SUCCESS'; message: string };

interface FigmaBridgeContextType {
  selection: Array<{ id: string; name: string; type: string }>;
  isConnected: boolean;
  sendMessage: (message: any) => void;
  inspectFrame: (frameId: string) => Promise<any>;
  mutateFrame: (frameId: string, mutations: any) => Promise<void>;
  batchMutateFrames: (mutations: Array<{ frameId: string; changes: any }>) => Promise<void>;
}

const FigmaBridgeContext = createContext<FigmaBridgeContextType | null>(null);

export function FigmaBridgeProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [messageHandlers] = useState(new Map<string, (data: any) => void>());

  // Send message to plugin
  const sendMessage = useCallback((message: any) => {
    logger.figma.debug('Sending message to plugin', message);
    parent.postMessage({ pluginMessage: message }, '*');
  }, []);

  // Handle messages from plugin
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      logger.figma.debug('Received message from plugin', msg);

      // Handle specific message types
      switch (msg.type) {
        case 'SELECTION_CHANGED':
          try {
            const parsed = SelectionChangedSchema.parse(msg);
            setSelection(parsed.selection);
          } catch (error) {
            console.error('Invalid selection message:', error);
          }
          break;

        case 'FRAME_INSPECTION_RESULT':
          try {
            const parsed = FrameInspectionResultSchema.parse(msg);
            const handler = messageHandlers.get(`inspect_${parsed.data.id}`);
            if (handler) {
              handler(parsed.data);
              messageHandlers.delete(`inspect_${parsed.data.id}`);
            }
          } catch (error) {
            console.error('Invalid frame inspection message:', error);
          }
          break;

        case 'CONNECTED':
          setIsConnected(true);
          break;

        case 'ERROR':
          console.error('Plugin error:', msg.error);
          break;

        case 'MUTATE_FRAME_RESULT':
          const mutateHandler = messageHandlers.get(msg.requestId);
          if (mutateHandler) {
            mutateHandler(msg.data);
            messageHandlers.delete(msg.requestId);
          }
          break;

        case 'BATCH_MUTATE_FRAMES_RESULT':
          const batchHandler = messageHandlers.get(msg.requestId);
          if (batchHandler) {
            batchHandler(msg.data);
            messageHandlers.delete(msg.requestId);
          }
          break;

        case 'INIT':
          logger.figma.info('Plugin initialized', msg.data);
          setIsConnected(true);
          break;

        default:
          // Check for custom handlers
          const handler = messageHandlers.get(msg.type);
          if (handler) {
            handler(msg.data);
            messageHandlers.delete(msg.type);
          }
      }
    };

    window.addEventListener('message', handleMessage);

    // Small delay to ensure plugin is ready
    setTimeout(() => {
      // Request initial selection
      sendMessage({ type: 'GET_SELECTION' });

      // Send connection message
      sendMessage({ type: 'UI_READY' });
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [sendMessage, messageHandlers]);

  // Inspect a frame
  const inspectFrame = useCallback((frameId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        messageHandlers.delete(`inspect_${frameId}`);
        reject(new Error('Frame inspection timeout'));
      }, 5000);

      messageHandlers.set(`inspect_${frameId}`, (data) => {
        clearTimeout(timeoutId);
        if ('error' in data) {
          reject(new Error(data.error));
        } else {
          resolve(data);
        }
      });

      sendMessage({
        type: 'INSPECT_FRAME',
        frameId,
      });
    });
  }, [sendMessage, messageHandlers]);

  // Mutate a frame
  const mutateFrame = useCallback(async (frameId: string, mutations: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      const requestId = `mutate_${frameId}_${Date.now()}`;
      const timeoutId = setTimeout(() => {
        messageHandlers.delete(requestId);
        reject(new Error('Frame mutation timeout'));
      }, 5000);

      messageHandlers.set(requestId, (data) => {
        clearTimeout(timeoutId);
        if (data.success) {
          resolve();
        } else {
          reject(new Error(data.error || 'Mutation failed'));
        }
      });

      sendMessage({
        type: 'MUTATE_FRAME',
        requestId,
        frameId,
        mutations,
      });
    });
  }, [sendMessage, messageHandlers]);

  // Batch mutate frames
  const batchMutateFrames = useCallback(async (mutations: Array<{ frameId: string; changes: any }>): Promise<void> => {
    return new Promise((resolve, reject) => {
      const requestId = `batch_mutate_${Date.now()}`;
      const timeoutId = setTimeout(() => {
        messageHandlers.delete(requestId);
        reject(new Error('Batch mutation timeout'));
      }, 10000);

      messageHandlers.set(requestId, (data) => {
        clearTimeout(timeoutId);
        if (data.success) {
          resolve();
        } else {
          reject(new Error(data.error || 'Batch mutation failed'));
        }
      });

      sendMessage({
        type: 'BATCH_MUTATE_FRAMES',
        requestId,
        mutations,
      });
    });
  }, [sendMessage, messageHandlers]);

  const value: FigmaBridgeContextType = {
    selection,
    isConnected,
    sendMessage,
    inspectFrame,
    mutateFrame,
    batchMutateFrames,
  };

  return (
    <FigmaBridgeContext.Provider value={value}>
      {children}
    </FigmaBridgeContext.Provider>
  );
}

export function useFigmaBridge() {
  const context = useContext(FigmaBridgeContext);
  if (!context) {
    throw new Error('useFigmaBridge must be used within FigmaBridgeProvider');
  }
  return context;
}