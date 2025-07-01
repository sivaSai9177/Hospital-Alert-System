import React, { useState, useEffect } from 'react';

interface SettingsProps {
  settings: any;
  onUpdate: (settings: any) => void;
}

function Settings({ settings, onUpdate }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState({
    mcpServerUrl: 'http://localhost:3456',
    autoExtractOnOpen: false,
    syncOnSave: false,
    includePrivateTokens: false,
    tokenPrefix: '',
    ...settings
  });

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    checkMCPConnection();
  }, [localSettings.mcpServerUrl]);

  const checkMCPConnection = async () => {
    setConnectionStatus('checking');
    try {
      const response = await fetch(`${localSettings.mcpServerUrl}/health`);
      setConnectionStatus(response.ok ? 'connected' : 'disconnected');
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const handleSave = () => {
    onUpdate(localSettings);
  };

  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>MCP Server Configuration</h3>
        
        <div className="form-group">
          <label>Server URL</label>
          <div className="input-with-status">
            <input
              type="text"
              className="form-control"
              value={localSettings.mcpServerUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, mcpServerUrl: e.target.value })}
              placeholder="http://localhost:3456"
            />
            <span className={`connection-status ${connectionStatus}`}>
              {connectionStatus === 'checking' && '⏳'}
              {connectionStatus === 'connected' && '✅'}
              {connectionStatus === 'disconnected' && '❌'}
            </span>
          </div>
          <small>URL of your MCP server for AI-powered features</small>
        </div>
      </div>

      <div className="settings-section">
        <h3>Automation</h3>
        
        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={localSettings.autoExtractOnOpen}
            onChange={(e) => setLocalSettings({ ...localSettings, autoExtractOnOpen: e.target.checked })}
          />
          Auto-extract tokens when opening file
        </label>

        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={localSettings.syncOnSave}
            onChange={(e) => setLocalSettings({ ...localSettings, syncOnSave: e.target.checked })}
          />
          Auto-sync on file save
        </label>
      </div>

      <div className="settings-section">
        <h3>Token Configuration</h3>
        
        <div className="form-group">
          <label>Token Prefix</label>
          <input
            type="text"
            className="form-control"
            value={localSettings.tokenPrefix}
            onChange={(e) => setLocalSettings({ ...localSettings, tokenPrefix: e.target.value })}
            placeholder="e.g., 'ds-' or 'theme-'"
          />
          <small>Prefix to add to all generated token names</small>
        </div>

        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={localSettings.includePrivateTokens}
            onChange={(e) => setLocalSettings({ ...localSettings, includePrivateTokens: e.target.checked })}
          />
          Include private tokens (starting with _)
        </label>
      </div>

      <div className="settings-actions">
        <button className="button" onClick={handleSave}>
          Save Settings
        </button>
        <button className="button button-secondary" onClick={checkMCPConnection}>
          Test Connection
        </button>
      </div>

      <div className="settings-info">
        <h3>About</h3>
        <p><strong>Universal Design System Sync</strong></p>
        <p>Version 1.0.0</p>
        <p>Sync your Figma designs with your React Native + Web codebase using AI-powered code generation.</p>
      </div>
    </div>
  );
}

export default Settings;