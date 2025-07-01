import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { useFigmaBridge } from '../lib/figma-bridge';
import { trpc } from '../lib/trpc';
import { cn } from '../lib/utils';
import { 
  Wand2, 
  Send, 
  Sparkles,
  Zap,
  FileText,
  Layout,
  Palette,
  Settings2,
  Info
} from 'lucide-react';
import { CodeSuggestions } from '../components/CodeSuggestions';

export const Route = createFileRoute('/agent')({
  component: AgentPage,
});

interface Command {
  name: string;
  description: string;
  icon: any;
  action: string;
}

const commands: Command[] = [
  {
    name: 'Analyze',
    description: 'Deep analysis of selected frames',
    icon: Sparkles,
    action: '/analyze',
  },
  {
    name: 'Optimize',
    description: 'Auto-optimize layout and performance',
    icon: Zap,
    action: '/optimize',
  },
  {
    name: 'Generate',
    description: 'Generate components from description',
    icon: FileText,
    action: '/generate',
  },
  {
    name: 'Responsive',
    description: 'Create responsive variants',
    icon: Layout,
    action: '/responsive',
  },
  {
    name: 'Theme',
    description: 'Apply design system theme',
    icon: Palette,
    action: '/theme',
  },
  {
    name: 'Fix Issues',
    description: 'Auto-fix common problems',
    icon: Settings2,
    action: '/fix',
  },
];

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

function AgentPage() {
  const { selection, inspectFrame, mutateFrame, batchMutateFrames } = useFigmaBridge();
  const messageIdCounter = useRef(1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-message',
      role: 'system',
      content: 'Hello! I\'m your AI Design Agent. I can analyze, optimize, and generate Figma designs. Select frames and use commands or ask me anything!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeFrameMutation = trpc.figma.analyzeFrame.useMutation();
  const suggestOptimizationsMutation = trpc.figma.suggestOptimizations.useMutation();
  const generateComponentMutation = trpc.figma.generateComponent.useMutation();

  const processCommand = async (command: string, args: string) => {
    const selectedFrames = selection.filter(item => 
      ['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'].includes(item.type)
    );

    // Commands that don't require selection
    const noSelectionCommands = ['/generate', '/help', '/?'];
    
    if (selectedFrames.length === 0 && !noSelectionCommands.includes(command)) {
      // Show what's currently selected to help debug
      if (selection.length > 0) {
        const types = selection.map(s => s.type).join(', ');
        addMessage('assistant', `I see you have selected: ${types}. I need frames, components, or instances to work with. Currently selected: ${selection.map(s => s.name).join(', ')}`);
      } else {
        addMessage('assistant', 'Please select frames, components, or instances to work with. No selection detected.');
      }
      return;
    }

    setIsProcessing(true);

    try {
      switch (command) {
        case '/analyze':
          const frameIds = selectedFrames.map(f => f.id);
          const analysisResults = await Promise.all(
            frameIds.map(id => analyzeFrameMutation.mutateAsync({ frameId: id }))
          );
          
          const analysisMessage = analysisResults.map((result, index) => 
            `**${selectedFrames[index].name}:**\n${result.analysis}`
          ).join('\n\n');
          
          addMessage('assistant', analysisMessage);
          break;

        case '/optimize':
          const optimizations = await suggestOptimizationsMutation.mutateAsync({
            frameIds: selectedFrames.map(f => f.id),
          });
          
          if (optimizations.suggestions.length > 0) {
            const message = `Found ${optimizations.suggestions.length} optimizations:\n\n` +
              optimizations.suggestions.map(s => `• ${s.description}`).join('\n') +
              '\n\nWould you like me to apply these optimizations?';
            
            addMessage('assistant', message);
            // In real implementation, we'd handle the confirmation
          } else {
            addMessage('assistant', 'Your frames are already well-optimized! 🎉');
          }
          break;

        case '/generate':
          if (!args) {
            addMessage('assistant', 'Please describe what you want to generate. Example: `/generate a modern card component with title and description`');
            return;
          }
          
          const generated = await generateComponentMutation.mutateAsync({
            description: args,
            style: 'modern',
          });
          
          addMessage('assistant', `Generated component code:\n\n\`\`\`tsx\n${generated.code}\n\`\`\`\n\nThe component has been created in Figma!`);
          break;

        case '/fix':
          const issues = await Promise.all(
            selectedFrames.map(async (frame) => {
              const inspection = await inspectFrame(frame.id);
              return { frameId: frame.id, issues: inspection.issues || [] };
            })
          );
          
          const fixableIssues = issues.filter(f => f.issues.length > 0);
          
          if (fixableIssues.length > 0) {
            addMessage('assistant', `Found issues in ${fixableIssues.length} frames. Fixing...`);
            
            // Apply fixes
            const fixes = fixableIssues.map(({ frameId, issues }) => ({
              frameId,
              changes: {
                // Example fixes
                height: issues.includes('zero-height') ? 100 : undefined,
                width: issues.includes('zero-width') ? 200 : undefined,
              },
            }));
            
            await batchMutateFrames(fixes);
            addMessage('assistant', '✅ Fixed all issues!');
          } else {
            addMessage('assistant', 'No issues found! Your frames look great.');
          }
          break;

        case '/help':
          const helpMessage = `Here are the available commands:
          
**Analysis & Optimization:**
• \`/analyze\` - Analyze selected frames for issues and suggestions
• \`/optimize\` - Get optimization suggestions for performance and accessibility

**Generation & Creation:**
• \`/generate [description]\` - Generate a component from description
• \`/responsive\` - Create responsive variants of selected frames

**Styling & Fixes:**
• \`/theme\` - Apply design system theme to selection
• \`/fix\` - Auto-fix common issues in selected frames

**Tips:**
• Select frames before running most commands
• You can also ask questions in natural language
• Common typos are automatically corrected`;
          
          addMessage('assistant', helpMessage);
          break;

        default:
          addMessage('assistant', `Unknown command: ${command}. Try /help for available commands.`);
      }
    } catch (error) {
      addMessage('assistant', `Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Command typo mapping
  const commandCorrections: Record<string, string> = {
    '/analyse': '/analyze',
    '/analise': '/analyze',
    '/analize': '/analyze',
    '/optimise': '/optimize',
    '/optmize': '/optimize',
    '/gen': '/generate',
    '/create': '/generate',
    '/make': '/generate',
    '/theme': '/theme',
    '/themes': '/theme',
    '/reponsive': '/responsive',
    '/responsive': '/responsive',
    '/help': '/help',
    '/?': '/help',
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    // Check if it's a command
    if (userMessage.startsWith('/')) {
      let [command, ...args] = userMessage.split(' ');
      
      // Check for typos and correct them
      const correctedCommand = commandCorrections[command.toLowerCase()] || command.toLowerCase();
      if (correctedCommand !== command && commandCorrections[command.toLowerCase()]) {
        addMessage('assistant', `Did you mean ${correctedCommand}? I'll run that for you.`);
        command = correctedCommand;
      }
      
      await processCommand(command, args.join(' '));
    } else {
      // Natural language processing
      setIsProcessing(true);
      try {
        // In real implementation, this would use an AI model
        const response = await analyzeUserIntent(userMessage);
        addMessage('assistant', response);
      } catch (error) {
        addMessage('assistant', 'I encountered an error. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const addMessage = (role: Message['role'], content: string) => {
    const newMessage: Message = {
      id: `msg-${messageIdCounter.current++}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const analyzeUserIntent = async (message: string): Promise<string> => {
    // Simplified intent analysis
    const lowerMessage = message.toLowerCase();
    
    // Check if they're asking about selection or frames
    if (lowerMessage.includes('select') || lowerMessage.includes('frame')) {
      if (selectedFrames.length > 0) {
        return `You have ${selectedFrames.length} frame${selectedFrames.length > 1 ? 's' : ''} selected: ${selectedFrames.map(f => f.name).join(', ')}. What would you like me to do with them?`;
      } else {
        return 'No frames are currently selected. Please select a frame, component, or instance in Figma to work with.';
      }
    }
    
    // Check for analysis intent
    if (lowerMessage.includes('analyze') || lowerMessage.includes('check') || lowerMessage.includes('inspect')) {
      if (selectedFrames.length > 0) {
        // Auto-run the analyze command
        await processCommand('/analyze', '');
        return 'Running analysis on your selected frames...';
      }
      return 'I can analyze your frames for you. Select frames and use the `/analyze` command.';
    } 
    
    // Check for optimization intent
    if (lowerMessage.includes('optimize') || lowerMessage.includes('improve') || lowerMessage.includes('better')) {
      if (selectedFrames.length > 0) {
        await processCommand('/optimize', '');
        return 'Checking for optimization opportunities...';
      }
      return 'I can optimize your designs. Select frames and try the `/optimize` command.';
    } 
    
    // Check for creation intent
    if (lowerMessage.includes('create') || lowerMessage.includes('generate') || lowerMessage.includes('make')) {
      const descriptionMatch = message.match(/(?:create|generate|make)\s+(.+)/i);
      if (descriptionMatch) {
        await processCommand('/generate', descriptionMatch[1]);
        return 'Generating component based on your description...';
      }
      return 'I can generate components for you. Use `/generate` followed by a description, e.g., `/generate a modern card component`';
    }
    
    // Check for help intent
    if (lowerMessage.includes('help') || lowerMessage.includes('what can') || lowerMessage.includes('how do')) {
      await processCommand('/help', '');
      return 'Here\'s what I can help you with:';
    }
    
    // Default response with context
    if (selectedFrames.length > 0) {
      return `I see you have ${selectedFrames.length} frame${selectedFrames.length > 1 ? 's' : ''} selected. I can:
• Analyze them for issues (/analyze)
• Suggest optimizations (/optimize)
• Fix common problems (/fix)
• Create responsive variants (/responsive)

Or you can generate new components with /generate [description]`;
    }
    
    return 'I can help you with:\n• Analyzing frames (/analyze)\n• Optimizing layouts (/optimize)\n• Generating components (/generate)\n• Creating responsive variants (/responsive)\n• Applying themes (/theme)\n• Fixing issues (/fix)\n\nSelect some frames to get started, or use /generate to create new components.';
  };

  // Get selected frames for display
  const selectedFrames = selection.filter(item => 
    ['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'].includes(item.type)
  );

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Selection Status Bar */}
        {selection.length > 0 && (
          <div className="bg-figma-bg-brand text-figma-text-onbrand px-figma-sm py-figma-xs text-figma-xs flex items-center gap-2">
            <Info className="w-3 h-3" />
            <span>
              {selectedFrames.length > 0 
                ? `${selectedFrames.length} frame${selectedFrames.length > 1 ? 's' : ''} selected: ${selectedFrames.map(f => f.name).join(', ')}`
                : `Selected: ${selection.map(s => `${s.name} (${s.type})`).join(', ')}`
              }
            </span>
          </div>
        )}
      
      {/* Command Bar */}
      <div className="border-b border-figma-border p-figma-sm">
        <div className="flex gap-2 overflow-x-auto">
          {commands.map((cmd) => (
            <button
              key={cmd.action}
              onClick={() => setInput(cmd.action + ' ')}
              className="flex items-center gap-2 px-figma-sm py-figma-xs bg-figma-surface rounded-figma hover:bg-figma-border transition-colors whitespace-nowrap"
            >
              <cmd.icon className="w-4 h-4" />
              <span className="text-figma-xs">{cmd.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-figma-lg">
        <div className="space-y-figma-md">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] p-figma-sm rounded-figma",
                  message.role === 'user' 
                    ? "bg-figma-blue text-white" 
                    : message.role === 'assistant'
                    ? "bg-figma-surface"
                    : "bg-figma-purple text-white"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-1 mb-1">
                    <Wand2 className="w-4 h-4" />
                    <span className="text-figma-xs font-medium">AI Agent</span>
                  </div>
                )}
                <div className="text-figma-sm whitespace-pre-wrap">{message.content}</div>
                <div className="text-figma-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-figma-surface p-figma-sm rounded-figma">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse flex gap-1">
                    <div className="w-2 h-2 bg-figma-text-secondary rounded-full"></div>
                    <div className="w-2 h-2 bg-figma-text-secondary rounded-full animation-delay-200"></div>
                    <div className="w-2 h-2 bg-figma-text-secondary rounded-full animation-delay-400"></div>
                  </div>
                  <span className="text-figma-xs text-figma-text-secondary">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-figma-border p-figma-md">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything or use / for commands..."
            className="input-figma flex-1"
            disabled={isProcessing}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="btn-figma"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>
      
      {/* Code Suggestions Sidebar */}
      <div className="w-80 border-l border-figma-border bg-figma-surface p-figma-md overflow-y-auto">
        <CodeSuggestions />
      </div>
    </div>
  );
}