import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useState } from 'react';
import { TRPCProvider } from '../lib/trpc';
import { FigmaBridgeProvider } from '../lib/figma-bridge';
import { cn } from '../lib/utils';
import { 
  Frame, 
  Layers, 
  Wand2, 
  Settings,
  Brain,
  ChevronRight,
  Terminal,
  Palette,
  LayoutDashboard,
  Search
} from 'lucide-react';
import { DebugConsole } from '../components/DebugConsole';
import { logger } from '../../lib/debug/client-logger';
import { useEffect } from 'react';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState(false);

  useEffect(() => {
    logger.system.info('Figma plugin UI initialized');
    logger.ui.debug('Debug console available - click the terminal icon to open');
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/inspector', label: 'Inspector', icon: Frame },
    { path: '/mutations', label: 'Mutations', icon: Layers },
    { path: '/design-system', label: 'Design System', icon: Palette },
    { path: '/agent', label: 'AI Agent', icon: Wand2 },
    { path: '/memory', label: 'Memory', icon: Brain },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <TRPCProvider>
      <FigmaBridgeProvider>
        <div className="flex h-full">
          {/* Sidebar */}
          <nav 
            className={cn(
              "bg-figma-surface border-r border-figma-border transition-all duration-200",
              isSidebarCollapsed ? "w-12" : "w-48"
            )}
          >
            <div className="flex items-center justify-between p-figma-sm border-b border-figma-border">
              {!isSidebarCollapsed && (
                <h1 className="text-figma-sm font-semibold">Design Agent</h1>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 hover:bg-figma-border rounded transition-colors"
              >
                <ChevronRight 
                  className={cn(
                    "w-4 h-4 transition-transform",
                    isSidebarCollapsed ? "rotate-0" : "rotate-180"
                  )} 
                />
              </button>
            </div>

            <div className="p-figma-xs">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-2 px-figma-sm py-figma-xs rounded-figma hover:bg-figma-border transition-colors mb-1"
                  activeProps={{
                    className: "bg-figma-border text-figma-blue"
                  }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="text-figma-sm">{item.label}</span>
                  )}
                </Link>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>

        {/* Debug Console Toggle */}
        <button
          onClick={() => setIsDebugConsoleOpen(!isDebugConsoleOpen)}
          className={cn(
            "fixed bottom-4 right-4 p-2 bg-figma-blue text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors z-40",
            isDebugConsoleOpen && "bottom-[21rem]"
          )}
          title="Toggle Debug Console"
        >
          <Terminal className="h-5 w-5" />
        </button>

        {/* Debug Console */}
        <DebugConsole 
          isOpen={isDebugConsoleOpen} 
          onClose={() => setIsDebugConsoleOpen(false)} 
        />

        {/* Show devtools only in development */}
        {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
      </FigmaBridgeProvider>
    </TRPCProvider>
  );
}