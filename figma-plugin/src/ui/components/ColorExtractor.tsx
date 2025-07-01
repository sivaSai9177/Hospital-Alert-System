import * as React from 'react';
import { useState } from 'react';
import { MessageType } from '../../types/messages';
import './ColorExtractor.css';

interface ExtractedColor {
  hex: string;
  rgb: { r: number; g: number; b: number; a: number };
  hsl: { h: number; s: number; l: number };
  frequency: number;
  usage: {
    fill: number;
    stroke: number;
    text: number;
    effect: number;
  };
  temperature: 'cool' | 'warm' | 'neutral';
}

interface ColorCategory {
  name: string;
  role: string;
  colors: ExtractedColor[];
  suggestion?: string;
}

interface ThemePreview {
  name: string;
  light: Record<string, string>;
  dark: Record<string, string>;
  description: string;
}

interface ColorExtractionResult {
  extractedColors: ExtractedColor[];
  categories: ColorCategory[];
  themePreview: ThemePreview;
  tokens: any[];
}

export function ColorExtractor() {
  const [result, setResult] = useState<ColorExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    // Listen for color extraction results
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case MessageType.COLOR_EXTRACTION_RESULT:
          if (msg.data.success) {
            setResult(msg.data);
            setError(null);
          } else {
            setError(msg.data.message || 'Failed to extract colors');
          }
          setLoading(false);
          break;

        case MessageType.COLOR_SYNC_RESULT:
          if (msg.data.success) {
            // Show success message
            setError(null);
          } else {
            setError(msg.data.message || 'Failed to sync colors');
          }
          setLoading(false);
          break;

        case MessageType.THEME_APPLIED_RESULT:
          if (msg.data.success) {
            // Show success message
            setError(null);
          } else {
            setError(msg.data.message || 'Failed to apply theme');
          }
          setLoading(false);
          break;

        case MessageType.LOADING:
          setLoading(true);
          break;

        case MessageType.ERROR:
          setError(msg.data.message);
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExtractColors = () => {
    setLoading(true);
    setError(null);
    parent.postMessage({ pluginMessage: { type: MessageType.EXTRACT_COLORS } }, '*');
  };

  const handleSyncColors = () => {
    if (!result) return;
    setLoading(true);
    setError(null);
    parent.postMessage({ 
      pluginMessage: { 
        type: MessageType.SYNC_EXTRACTED_COLORS,
        data: { result }
      } 
    }, '*');
  };

  const handleApplyTheme = () => {
    if (!result) return;
    setLoading(true);
    setError(null);
    parent.postMessage({ 
      pluginMessage: { 
        type: MessageType.APPLY_EXTRACTED_THEME,
        data: { theme: result.themePreview }
      } 
    }, '*');
  };

  const renderColorSwatch = (color: ExtractedColor) => (
    <div key={color.hex} className="color-swatch-item">
      <div 
        className="color-swatch"
        style={{ backgroundColor: color.hex, opacity: color.rgb.a }}
      />
      <div className="color-swatch-info">
        <div className="color-hex">{color.hex}</div>
        <div className="color-usage">
          Used {color.frequency}x ({color.usage.fill} fills, {color.usage.text} texts)
        </div>
        <div className="color-hsl">
          HSL: {color.hsl.h}°, {color.hsl.s}%, {color.hsl.l}%
        </div>
      </div>
    </div>
  );

  const renderThemePreview = () => {
    if (!result) return null;
    
    const theme = result.themePreview;
    const colors = activeMode === 'light' ? theme.light : theme.dark;

    return (
      <div className="theme-preview-container">
        <div className="theme-mode-toggle">
          <button
            onClick={() => setActiveMode('light')}
            className={`theme-mode-button ${activeMode === 'light' ? 'active' : ''}`}
          >
            Light Mode
          </button>
          <button
            onClick={() => setActiveMode('dark')}
            className={`theme-mode-button ${activeMode === 'dark' ? 'active' : ''}`}
          >
            Dark Mode
          </button>
        </div>

        <div className={`theme-preview ${activeMode}`}>
          <div className="theme-colors-grid">
            {Object.entries(colors).map(([name, value]) => (
              <div key={name} className="theme-color-item">
                <div 
                  className="theme-color-swatch"
                  style={{ backgroundColor: `hsl(${value})` }}
                />
                <span className="theme-color-name">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="color-extractor">
      <div className="section-header">
        <h2>Color Extraction</h2>
        <p className="section-description">
          Extract colors from selected frames and generate theme tokens
        </p>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Close error">×</button>
        </div>
      )}

      <div className="color-extractor-content">
        <button
          onClick={handleExtractColors}
          disabled={loading}
          className="button button-primary full-width"
        >
          {loading ? 'Extracting...' : 'Extract Colors from Selection'}
        </button>

        {result && (
          <>
            <div className="color-section">
              <h3>Extracted Colors ({result.extractedColors.length})</h3>
              <div className="extracted-colors-list">
                {result.extractedColors.slice(0, 10).map(renderColorSwatch)}
              </div>
              {result.extractedColors.length > 10 && (
                <p className="color-count-info">
                  Showing 10 of {result.extractedColors.length} colors
                </p>
              )}
            </div>

            <div className="color-section">
              <h3>Color Categories</h3>
              <div className="color-categories">
                {result.categories.map(category => (
                  <div key={category.name} className="category-card">
                    <h4 className="category-title">
                      {category.name} <span className="category-role">({category.role})</span>
                    </h4>
                    {category.suggestion && (
                      <p className="category-suggestion">{category.suggestion}</p>
                    )}
                    <div className="category-colors">
                      {category.colors.map(color => (
                        <div
                          key={color.hex}
                          className="category-color-swatch"
                          style={{ backgroundColor: color.hex }}
                          title={`${color.hex} - ${color.temperature}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="color-section">
              <h3>Theme Preview</h3>
              {renderThemePreview()}
            </div>

            <div className="action-buttons">
              <button
                onClick={handleSyncColors}
                disabled={loading}
                className="button button-success"
              >
                <svg className="button-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V11M4 7L8 11L12 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sync to Codebase
              </button>
              <button
                onClick={handleApplyTheme}
                disabled={loading}
                className="button button-secondary"
              >
                <svg className="button-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L10 4L8 6M8 10L10 12L8 14M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Apply Theme to Page
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}