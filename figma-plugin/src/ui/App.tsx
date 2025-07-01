import React, { useState, useEffect, useCallback } from 'react';
import { MessageType, PluginMessage } from '../types/messages';
import { DesignTokens } from '../../shared/types/design-tokens';
import ErrorBoundary from './components/ErrorBoundary';
import Loading from './components/Loading';
import TokensView from './components/TokensView';
import SyncPanel from './components/SyncPanel';
import ComponentGenerator from './components/ComponentGenerator';
import Settings from './components/Settings';
import { FrameInspector } from './components/FrameInspector';
import { MemoryPanel } from './components/MemoryPanel';
import { ColorExtractor } from './components/ColorExtractor';

type TabType = 'tokens' | 'sync' | 'generate' | 'settings' | 'inspector' | 'memory' | 'colors';

interface AppState {
  activeTab: TabType;
  tokens: DesignTokens | null;
  loading: boolean;
  loadingMessage: string;
  error: string | null;
  settings: any;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: Date | null;
}

function App() {
  console.log('🎯 App component rendering...', new Date().toISOString());
  
  const [state, setState] = useState<AppState>({
    activeTab: 'tokens',
    tokens: null,
    loading: false,
    loadingMessage: 'Loading...',
    error: null,
    settings: {},
    syncStatus: 'idle',
    lastSyncTime: null,
  });

  useEffect(() => {
    // Listen for messages from plugin
    window.onmessage = (event: MessageEvent<{ pluginMessage: PluginMessage }>) => {
      const message = event.data.pluginMessage;
      if (!message) return;

      handlePluginMessage(message);
    };

    // Request initial data
    sendMessage({ type: MessageType.EXTRACT_TOKENS });
  }, []);

  const handlePluginMessage = useCallback((message: PluginMessage) => {
    switch (message.type) {
      case MessageType.INIT:
        setState(prev => ({
          ...prev,
          settings: message.data.settings,
          loading: false,
        }));
        break;

      case MessageType.LOADING:
        setState(prev => ({
          ...prev,
          loading: true,
          loadingMessage: message.data.message || 'Loading...',
          error: null,
        }));
        break;

      case MessageType.ERROR:
        setState(prev => ({
          ...prev,
          loading: false,
          error: message.data.message,
          syncStatus: prev.syncStatus === 'syncing' ? 'error' : prev.syncStatus,
        }));
        break;

      case MessageType.TOKENS_EXTRACTED:
        setState(prev => ({
          ...prev,
          tokens: message.data,
          loading: false,
          error: null,
        }));
        break;

      case MessageType.SYNC_COMPLETE:
        setState(prev => ({
          ...prev,
          syncStatus: 'success',
          loading: false,
          lastSyncTime: new Date(),
        }));
        setTimeout(() => {
          setState(prev => ({ ...prev, syncStatus: 'idle' }));
        }, 3000);
        break;

      case MessageType.SETTINGS_UPDATED:
        setState(prev => ({
          ...prev,
          settings: message.data,
        }));
        break;

      case MessageType.COMPONENT_GENERATED:
        setState(prev => ({
          ...prev,
          loading: false,
        }));
        // Show success toast or notification
        break;
    }
  }, []);

  const sendMessage = useCallback((message: PluginMessage) => {
    parent.postMessage({ pluginMessage: message }, '*');
  }, []);

  const handleExtractTokens = useCallback(() => {
    sendMessage({ type: MessageType.EXTRACT_TOKENS });
  }, [sendMessage]);

  const handleSyncToCode = useCallback((config: any) => {
    if (!state.tokens) {
      setState(prev => ({ ...prev, error: 'No tokens to sync. Extract tokens first.' }));
      return;
    }

    setState(prev => ({ ...prev, syncStatus: 'syncing', error: null }));
    sendMessage({
      type: MessageType.SYNC_TO_CODE,
      data: { tokens: state.tokens, config },
    });
  }, [state.tokens, sendMessage]);

  const handleSyncFromCode = useCallback(() => {
    setState(prev => ({ ...prev, syncStatus: 'syncing', error: null }));
    sendMessage({ type: MessageType.SYNC_FROM_CODE });
  }, [sendMessage]);

  const handleGenerateComponent = useCallback((options: any) => {
    setState(prev => ({ ...prev, error: null }));
    sendMessage({
      type: MessageType.GENERATE_COMPONENT,
      data: { options },
    });
  }, [sendMessage]);

  const handleUpdateSettings = useCallback((settings: any) => {
    sendMessage({
      type: MessageType.UPDATE_SETTINGS,
      data: settings,
    });
  }, [sendMessage]);

  const handleCloseError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + E to extract tokens
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handleExtractTokens();
      }
      // Cmd/Ctrl + S to sync
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (state.tokens && state.activeTab === 'sync') {
          handleSyncToCode({ direction: 'figma-to-code', autoSync: false, conflictResolution: 'manual' });
        }
      }
      // Cmd/Ctrl + K to extract colors
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setState(prev => ({ ...prev, activeTab: 'colors' }));
        // Trigger color extraction by sending a message to the active ColorExtractor component
        sendMessage({ type: MessageType.EXTRACT_COLORS });
      }
      // Tab navigation with number keys
      if (e.key >= '1' && e.key <= '7') {
        const tabs: TabType[] = ['tokens', 'sync', 'generate', 'settings', 'inspector', 'memory', 'colors'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          setState(prev => ({ ...prev, activeTab: tabs[tabIndex] }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state.tokens, state.activeTab, sendMessage, handleExtractTokens, handleSyncToCode]);

  return (
    <ErrorBoundary>
      <div className="app">
        <header className="header">
          <h1>Universal Design System</h1>
          <nav className="tabs" role="tablist">
            <button
              className={`tab ${state.activeTab === 'tokens' ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, activeTab: 'tokens' }))}
              role="tab"
              aria-selected={state.activeTab === 'tokens'}
              aria-controls="tokens-panel"
            >
              Tokens
              <span className="tab-shortcut">1</span>
            </button>
            <button
              className={`tab ${state.activeTab === 'sync' ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, activeTab: 'sync' }))}
              role="tab"
              aria-selected={state.activeTab === 'sync'}
              aria-controls="sync-panel"
              disabled={!state.tokens}
            >
              Sync
              <span className="tab-shortcut">2</span>
            </button>
            <button
              className={`tab ${state.activeTab === 'generate' ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, activeTab: 'generate' }))}
              role="tab"
              aria-selected={state.activeTab === 'generate'}
              aria-controls="generate-panel"
            >
              Generate
              <span className="tab-shortcut">3</span>
            </button>
            <button
              className={`tab ${state.activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, activeTab: 'settings' }))}
              role="tab"
              aria-selected={state.activeTab === 'settings'}
              aria-controls="settings-panel"
            >
              Settings
              <span className="tab-shortcut">4</span>
            </button>
            <button
              className={`tab ${state.activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, activeTab: 'inspector' }))}
              role="tab"
              aria-selected={state.activeTab === 'inspector'}
              aria-controls="inspector-panel"
            >
              Inspector
              <span className="tab-shortcut">5</span>
            </button>
            <button
              className={`tab ${state.activeTab === 'memory' ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, activeTab: 'memory' }))}
              role="tab"
              aria-selected={state.activeTab === 'memory'}
              aria-controls="memory-panel"
            >
              Memory
              <span className="tab-shortcut">6</span>
            </button>
            <button
              className={`tab ${state.activeTab === 'colors' ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, activeTab: 'colors' }))}
              role="tab"
              aria-selected={state.activeTab === 'colors'}
              aria-controls="colors-panel"
            >
              Colors
              <span className="tab-shortcut">7</span>
            </button>
          </nav>
        </header>

        <main className="main">
          {state.error && (
            <div className="error-banner" role="alert">
              <span>{state.error}</span>
              <button onClick={handleCloseError} aria-label="Close error">×</button>
            </div>
          )}

          {state.loading && (
            <Loading message={state.loadingMessage} type="spinner" />
          )}

          <div
            id="tokens-panel"
            role="tabpanel"
            hidden={state.activeTab !== 'tokens'}
            aria-labelledby="tokens-tab"
          >
            {state.activeTab === 'tokens' && (
              <TokensView
                tokens={state.tokens}
                onExtract={handleExtractTokens}
              />
            )}
          </div>

          <div
            id="sync-panel"
            role="tabpanel"
            hidden={state.activeTab !== 'sync'}
            aria-labelledby="sync-tab"
          >
            {state.activeTab === 'sync' && (
              <SyncPanel
                tokens={state.tokens}
                syncStatus={state.syncStatus}
                lastSyncTime={state.lastSyncTime}
                onSyncToCode={handleSyncToCode}
                onSyncFromCode={handleSyncFromCode}
              />
            )}
          </div>

          <div
            id="generate-panel"
            role="tabpanel"
            hidden={state.activeTab !== 'generate'}
            aria-labelledby="generate-tab"
          >
            {state.activeTab === 'generate' && (
              <ComponentGenerator
                onGenerate={handleGenerateComponent}
              />
            )}
          </div>

          <div
            id="settings-panel"
            role="tabpanel"
            hidden={state.activeTab !== 'settings'}
            aria-labelledby="settings-tab"
          >
            {state.activeTab === 'settings' && (
              <Settings
                settings={state.settings}
                onUpdate={handleUpdateSettings}
              />
            )}
          </div>

          <div
            id="inspector-panel"
            role="tabpanel"
            hidden={state.activeTab !== 'inspector'}
            aria-labelledby="inspector-tab"
          >
            {state.activeTab === 'inspector' && (
              <FrameInspector />
            )}
          </div>

          <div
            id="memory-panel"
            role="tabpanel"
            hidden={state.activeTab !== 'memory'}
            aria-labelledby="memory-tab"
          >
            {state.activeTab === 'memory' && (
              <MemoryPanel />
            )}
          </div>

          <div
            id="colors-panel"
            role="tabpanel"
            hidden={state.activeTab !== 'colors'}
            aria-labelledby="colors-tab"
          >
            {state.activeTab === 'colors' && (
              <ColorExtractor />
            )}
          </div>
        </main>

        <footer className="footer">
          <div className="keyboard-hints">
            <span>⌘E: Extract Tokens</span>
            <span>⌘S: Sync</span>
            <span>⌘K: Extract Colors</span>
            <span>1-7: Switch Tabs</span>
          </div>
          {state.lastSyncTime && (
            <div className="last-sync">
              Last sync: {state.lastSyncTime.toLocaleTimeString()}
            </div>
          )}
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;