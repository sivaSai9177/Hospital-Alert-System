import React, { useState } from 'react';
import { DesignTokens } from '../../../shared/types/design-tokens';
import { SyncConfig } from '../../types/messages';

interface SyncPanelProps {
  tokens: DesignTokens | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: Date | null;
  onSyncToCode: (config: SyncConfig) => void;
  onSyncFromCode: () => void;
}

function SyncPanel({ tokens, syncStatus, lastSyncTime, onSyncToCode, onSyncFromCode }: SyncPanelProps) {
  const [config, setConfig] = useState<SyncConfig>({
    direction: 'figma-to-code',
    autoSync: false,
    conflictResolution: 'manual'
  });

  const handleSyncToCode = () => {
    onSyncToCode(config);
  };

  return (
    <div className="sync-panel">
      <h2>Sync Design System</h2>
      
      <div className="sync-status-display">
        <div className={`sync-status ${syncStatus}`}>
          {syncStatus === 'idle' && '⏸ Ready to sync'}
          {syncStatus === 'syncing' && '🔄 Syncing...'}
          {syncStatus === 'success' && '✅ Sync complete'}
          {syncStatus === 'error' && '❌ Sync failed'}
        </div>
      </div>

      <div className="sync-options">
        <div className="form-group">
          <label>Sync Direction</label>
          <select 
            className="form-control"
            value={config.direction}
            onChange={(e) => setConfig({ ...config, direction: e.target.value as any })}
          >
            <option key="figma-to-code" value="figma-to-code">Figma → Code</option>
            <option key="code-to-figma" value="code-to-figma">Code → Figma</option>
            <option key="bidirectional" value="bidirectional">Bidirectional</option>
          </select>
        </div>

        <div className="form-group">
          <label>Conflict Resolution</label>
          <select 
            className="form-control"
            value={config.conflictResolution}
            onChange={(e) => setConfig({ ...config, conflictResolution: e.target.value as any })}
          >
            <option key="manual" value="manual">Manual Review</option>
            <option key="prefer-figma" value="prefer-figma">Prefer Figma</option>
            <option key="prefer-code" value="prefer-code">Prefer Code</option>
          </select>
        </div>

        <div className="form-group">
          <label>
            <input 
              type="checkbox"
              checked={config.autoSync}
              onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
            />
            {' '}Enable Auto-sync
          </label>
        </div>
      </div>

      <div className="sync-actions">
        <button 
          className="button"
          onClick={handleSyncToCode}
          disabled={!tokens || syncStatus === 'syncing'}
        >
          Sync to Code
        </button>
        
        <button 
          className="button button-secondary"
          onClick={onSyncFromCode}
          disabled={syncStatus === 'syncing'}
        >
          Sync from Code
        </button>
      </div>

      {tokens && (
        <div className="sync-summary">
          <h3>Tokens to Sync</h3>
          <ul>
            <li>{tokens.colors.length} colors</li>
            <li>{tokens.typography.length} text styles</li>
            <li>{tokens.spacing.length} spacing values</li>
            <li>{tokens.shadows.length} shadows</li>
            <li>{tokens.borderRadius.length} border radii</li>
          </ul>
        </div>
      )}

      <div className="sync-info">
        <h3>How it works</h3>
        <p><strong>Figma → Code:</strong> Extracts design tokens from Figma and updates your codebase files.</p>
        <p><strong>Code → Figma:</strong> Reads design tokens from your codebase and updates Figma styles.</p>
        <p><strong>Bidirectional:</strong> Syncs changes in both directions with conflict resolution.</p>
      </div>
    </div>
  );
}

export default SyncPanel;