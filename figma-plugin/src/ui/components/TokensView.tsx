import React from 'react';
import { DesignTokens } from '../../../shared/types/design-tokens';

interface TokensViewProps {
  tokens: DesignTokens | null;
  onExtract: () => void;
}

function TokensView({ tokens, onExtract }: TokensViewProps) {
  if (!tokens) {
    return (
      <div className="empty-state">
        <h2>No tokens extracted yet</h2>
        <p>Extract design tokens from your Figma file to get started.</p>
        <button className="button" onClick={onExtract}>
          Extract Tokens
        </button>
      </div>
    );
  }

  return (
    <div className="tokens-view">
      <div className="tokens-header">
        <h2>Design Tokens</h2>
        <button className="button button-secondary" onClick={onExtract}>
          Refresh
        </button>
      </div>

      {/* Colors */}
      {tokens.colors.length > 0 && (
        <div className="token-section">
          <h3>Colors ({tokens.colors.length})</h3>
          <div className="token-grid">
            {tokens.colors.map((color, index) => (
              <div key={index} className="token-item">
                <div 
                  className="color-preview" 
                  style={{ backgroundColor: color.value }}
                />
                <div className="token-name">{color.name}</div>
                <div className="token-value">{color.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Typography */}
      {tokens.typography.length > 0 && (
        <div className="token-section">
          <h3>Typography ({tokens.typography.length})</h3>
          <div className="typography-list">
            {tokens.typography.map((type, index) => (
              <div key={index} className="typography-item">
                <div className="typography-preview" style={{
                  fontFamily: type.fontFamily,
                  fontSize: Math.min(type.fontSize, 24),
                  fontWeight: type.fontWeight,
                  lineHeight: type.lineHeight === 'auto' ? 'normal' : `${type.lineHeight}px`
                }}>
                  {type.name}
                </div>
                <div className="typography-details">
                  <span>{type.fontFamily}</span>
                  <span>{type.fontSize}px</span>
                  <span>Weight: {type.fontWeight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spacing */}
      {tokens.spacing.length > 0 && (
        <div className="token-section">
          <h3>Spacing ({tokens.spacing.length})</h3>
          <div className="spacing-list">
            {tokens.spacing.map((space, index) => (
              <div key={index} className="spacing-item">
                <div className="spacing-preview" style={{
                  width: `${space.value}px`,
                  height: '24px',
                  background: '#0066ff'
                }} />
                <span className="token-name">{space.name}</span>
                <span className="token-value">{space.value}px</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shadows */}
      {tokens.shadows.length > 0 && (
        <div className="token-section">
          <h3>Shadows ({tokens.shadows.length})</h3>
          <div className="shadow-list">
            {tokens.shadows.map((shadow, index) => (
              <div key={index} className="shadow-item">
                <div className="shadow-preview" style={{
                  boxShadow: shadow.value.map(s => 
                    `${s.offset.x}px ${s.offset.y}px ${s.radius}px ${s.spread || 0}px ${s.color}`
                  ).join(', ')
                }} />
                <div className="token-name">{shadow.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tokens-footer">
        <p>Version: {tokens.version || 'N/A'}</p>
        <p>Last updated: {tokens.lastUpdated ? new Date(tokens.lastUpdated).toLocaleString() : 'N/A'}</p>
      </div>
    </div>
  );
}

export default TokensView;