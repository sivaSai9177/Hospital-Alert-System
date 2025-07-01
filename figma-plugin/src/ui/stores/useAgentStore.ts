import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  metadata?: {
    tokens?: number;
    model?: string;
    error?: string;
  };
}

export interface AgentContext {
  selectedNodes?: string[];
  currentPage?: string;
  recentActions?: string[];
  designTokens?: Record<string, any>;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon?: string;
}

interface AgentState {
  // Conversation
  messages: AgentMessage[];
  currentConversationId: string | null;
  isTyping: boolean;
  
  // Context
  context: AgentContext;
  capabilities: AgentCapability[];
  
  // Settings
  model: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku';
  temperature: number;
  maxTokens: number;
  streamResponse: boolean;
  
  // UI State
  inputValue: string;
  isMinimized: boolean;
  showContext: boolean;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  addMessage: (message: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<AgentMessage>) => void;
  clearMessages: () => void;
  
  setContext: (context: Partial<AgentContext>) => void;
  updateCapabilities: (capabilities: AgentCapability[]) => void;
  toggleCapability: (id: string) => void;
  
  setModel: (model: AgentState['model']) => void;
  setTemperature: (temperature: number) => void;
  setMaxTokens: (maxTokens: number) => void;
  setStreamResponse: (stream: boolean) => void;
  
  setInputValue: (value: string) => void;
  setMinimized: (minimized: boolean) => void;
  setShowContext: (show: boolean) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Complex actions
  executeAgentAction: (action: string, params?: any) => Promise<void>;
  generateCode: (prompt: string) => Promise<string>;
  analyzeSelection: () => Promise<void>;
  suggestImprovements: () => Promise<void>;
  
  // Reset
  reset: () => void;
}

const defaultCapabilities: AgentCapability[] = [
  {
    id: 'design-analysis',
    name: 'Design Analysis',
    description: 'Analyze and provide feedback on designs',
    enabled: true,
  },
  {
    id: 'code-generation',
    name: 'Code Generation',
    description: 'Generate code from designs',
    enabled: true,
  },
  {
    id: 'token-extraction',
    name: 'Token Extraction',
    description: 'Extract design tokens automatically',
    enabled: true,
  },
  {
    id: 'accessibility-check',
    name: 'Accessibility Check',
    description: 'Check designs for accessibility issues',
    enabled: true,
  },
  {
    id: 'auto-layout',
    name: 'Auto Layout Suggestions',
    description: 'Suggest auto layout improvements',
    enabled: false,
  },
];

const initialState = {
  messages: [],
  currentConversationId: null,
  isTyping: false,
  context: {},
  capabilities: defaultCapabilities,
  model: 'claude-3-sonnet' as const,
  temperature: 0.7,
  maxTokens: 2000,
  streamResponse: true,
  inputValue: '',
  isMinimized: false,
  showContext: false,
  isLoading: false,
  error: null,
};

export const useAgentStore = create<AgentState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Message actions
      sendMessage: async (content) => {
        const { messages, context, capabilities, model, temperature, maxTokens } = get();
        
        // Add user message
        const userMessage: AgentMessage = {
          id: Date.now().toString(),
          role: 'user',
          content,
          timestamp: new Date(),
          status: 'sent',
        };
        
        set({
          messages: [...messages, userMessage],
          isLoading: true,
          error: null,
          inputValue: '',
        });

        try {
          // Send to plugin backend
          parent.postMessage({
            pluginMessage: {
              type: 'agent-message',
              content,
              context,
              capabilities: capabilities.filter(c => c.enabled),
              settings: { model, temperature, maxTokens }
            }
          }, '*');
          
          // The response will come through the message handler
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to send message',
            isLoading: false,
          });
        }
      },

      addMessage: (message) => {
        const newMessage: AgentMessage = {
          ...message,
          id: Date.now().toString(),
          timestamp: new Date(),
        };
        
        set({
          messages: [...get().messages, newMessage],
        });
      },

      updateMessage: (id, updates) => {
        set({
          messages: get().messages.map(msg =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        });
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      // Context actions
      setContext: (newContext) => {
        set({
          context: { ...get().context, ...newContext }
        });
      },

      updateCapabilities: (capabilities) => {
        set({ capabilities });
      },

      toggleCapability: (id) => {
        set({
          capabilities: get().capabilities.map(cap =>
            cap.id === id ? { ...cap, enabled: !cap.enabled } : cap
          ),
        });
      },

      // Settings actions
      setModel: (model) => set({ model }),
      setTemperature: (temperature) => set({ temperature }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
      setStreamResponse: (streamResponse) => set({ streamResponse }),

      // UI actions
      setInputValue: (inputValue) => set({ inputValue }),
      setMinimized: (isMinimized) => set({ isMinimized }),
      setShowContext: (showContext) => set({ showContext }),
      
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Complex actions
      executeAgentAction: async (action, params) => {
        set({ isLoading: true, error: null });
        
        try {
          parent.postMessage({
            pluginMessage: {
              type: 'agent-action',
              action,
              params
            }
          }, '*');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to execute action',
            isLoading: false,
          });
        }
      },

      generateCode: async (prompt) => {
        const { context } = get();
        
        set({ isLoading: true, error: null });
        
        try {
          parent.postMessage({
            pluginMessage: {
              type: 'generate-code',
              prompt,
              context
            }
          }, '*');
          
          // Return will come through message handler
          return '';
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to generate code',
            isLoading: false,
          });
          throw error;
        }
      },

      analyzeSelection: async () => {
        const { context } = get();
        
        await get().sendMessage(
          `Analyze the current selection and provide insights on:
          1. Design consistency
          2. Accessibility concerns
          3. Potential improvements
          4. Best practices
          
          Context: ${JSON.stringify(context, null, 2)}`
        );
      },

      suggestImprovements: async () => {
        const { context } = get();
        
        await get().sendMessage(
          `Based on the current design, suggest improvements for:
          1. Visual hierarchy
          2. Spacing and alignment
          3. Color usage
          4. Typography
          5. Component structure
          
          Context: ${JSON.stringify(context, null, 2)}`
        );
      },

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'AgentStore',
    }
  )
);

// Message handler for agent responses
export function useAgentMessageHandler() {
  const { addMessage, setLoading, updateMessage } = useAgentStore();

  window.addEventListener('message', (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    switch (msg.type) {
      case 'agent-response':
        addMessage({
          role: 'assistant',
          content: msg.content,
          metadata: msg.metadata,
        });
        setLoading(false);
        break;

      case 'agent-stream-start':
        addMessage({
          role: 'assistant',
          content: '',
          status: 'sending',
        });
        break;

      case 'agent-stream-chunk':
        // Update the last assistant message
        const messages = useAgentStore.getState().messages;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          updateMessage(lastMessage.id, {
            content: lastMessage.content + msg.content,
          });
        }
        break;

      case 'agent-stream-end':
        // Mark as sent
        const msgs = useAgentStore.getState().messages;
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          updateMessage(last.id, {
            status: 'sent',
            metadata: msg.metadata,
          });
        }
        setLoading(false);
        break;

      case 'agent-error':
        addMessage({
          role: 'system',
          content: `Error: ${msg.error}`,
          status: 'error',
        });
        setLoading(false);
        break;

      case 'code-generated':
        // Handle code generation response
        addMessage({
          role: 'assistant',
          content: `\`\`\`${msg.language || 'typescript'}\n${msg.code}\n\`\`\``,
          metadata: { model: msg.model },
        });
        setLoading(false);
        break;
    }
  });
}