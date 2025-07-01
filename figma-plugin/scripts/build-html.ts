#!/usr/bin/env bun
import { writeFileSync, readFileSync, watchFile, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Universal Design System Sync</title>
  <style id="figma-style"></style>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: var(--font-stack);
      font-size: var(--font-size-small);
      line-height: var(--line-height);
      color: var(--figma-color-text);
      background: var(--figma-color-bg);
    }

    #root {
      width: 100%;
      height: 100vh;
    }

    /* Additional base styles */
    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-state h2 {
      margin-bottom: 12px;
      font-size: 18px;
    }

    .empty-state p {
      margin-bottom: 24px;
      color: #666;
    }

    .tokens-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .typography-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .typography-item {
      padding: 16px;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
    }

    .typography-preview {
      margin-bottom: 8px;
    }

    .typography-details {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #666;
    }

    .spacing-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .spacing-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .spacing-preview {
      background: #0066ff;
      height: 24px;
      border-radius: 4px;
    }

    .shadow-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
    }

    .shadow-item {
      padding: 24px;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      text-align: center;
    }

    .shadow-preview {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 8px;
      margin: 0 auto 12px;
    }

    .tokens-footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #666;
    }

    .sync-status-display {
      margin: 24px 0;
    }

    .sync-options {
      margin: 24px 0;
    }

    .sync-actions {
      display: flex;
      gap: 12px;
      margin: 24px 0;
    }

    .sync-summary {
      background: #f7f7f7;
      padding: 16px;
      border-radius: 6px;
      margin: 24px 0;
    }

    .sync-summary h3 {
      margin-bottom: 12px;
    }

    .sync-summary ul {
      list-style: none;
      padding-left: 0;
    }

    .sync-info {
      margin-top: 32px;
      padding: 16px;
      background: #f0f7ff;
      border-radius: 6px;
    }

    .sync-info h3 {
      margin-bottom: 12px;
    }

    .sync-info p {
      margin-bottom: 8px;
      font-size: 13px;
    }

    .generator-instructions {
      background: #f7f7f7;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 24px;
    }

    .generator-options {
      margin-bottom: 24px;
    }

    .generator-features {
      margin: 24px 0;
    }

    .generator-features h3 {
      margin-bottom: 12px;
    }

    .checkbox-option {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      cursor: pointer;
    }

    .checkbox-option input {
      margin-right: 8px;
    }

    .generator-examples {
      margin-top: 32px;
    }

    .code-preview {
      background: #f7f7f7;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 12px;
      line-height: 1.4;
    }

    .settings-section {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e5e5;
    }

    .settings-section h3 {
      margin-bottom: 16px;
    }

    .input-with-status {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .connection-status {
      font-size: 16px;
    }

    .settings-actions {
      display: flex;
      gap: 12px;
      margin: 24px 0;
    }

    .settings-info {
      margin-top: 32px;
      padding: 16px;
      background: #f7f7f7;
      border-radius: 6px;
    }

    .settings-info h3 {
      margin-bottom: 12px;
    }

    .settings-info p {
      margin-bottom: 4px;
      font-size: 13px;
    }

    /* Error boundary styles */
    .error-boundary {
      padding: 24px;
      text-align: center;
      color: #c00;
    }

    /* Form controls */
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--figma-color-border, #e5e5e5);
      border-radius: 4px;
      background: var(--figma-color-bg, #fff);
      color: var(--figma-color-text, #333);
      font-size: 14px;
      font-family: var(--font-stack);
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--figma-color-border-brand, #0066ff);
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--figma-color-text-secondary, #666);
    }

    /* Button styles */
    .button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--figma-color-bg-brand, #0066ff);
      color: white;
    }

    .button:hover {
      background: var(--figma-color-bg-brand-hover, #0052cc);
    }

    .button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .button-secondary {
      background: var(--figma-color-bg-secondary, #f0f0f0);
      color: var(--figma-color-text, #333);
    }

    .button-secondary:hover {
      background: var(--figma-color-bg-secondary-hover, #e0e0e0);
    }

    /* Tab styles */
    .header {
      border-bottom: 1px solid var(--figma-color-border, #e5e5e5);
      padding: 16px;
    }

    .header h1 {
      font-size: 16px;
      margin-bottom: 12px;
    }

    .tabs {
      display: flex;
      gap: 4px;
    }

    .tab {
      padding: 8px 12px;
      border: none;
      background: none;
      color: var(--figma-color-text-secondary, #666);
      font-size: 13px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      position: relative;
    }

    .tab:hover {
      background: var(--figma-color-bg-secondary, #f0f0f0);
    }

    .tab.active {
      color: var(--figma-color-text, #333);
      background: var(--figma-color-bg-secondary, #f0f0f0);
    }

    .tab-shortcut {
      position: absolute;
      top: 2px;
      right: 2px;
      font-size: 10px;
      color: var(--figma-color-text-tertiary, #999);
    }

    /* Main content */
    .main {
      padding: 16px;
      min-height: calc(100vh - 140px);
    }

    /* Footer */
    .footer {
      border-top: 1px solid var(--figma-color-border, #e5e5e5);
      padding: 12px 16px;
      font-size: 12px;
      color: var(--figma-color-text-secondary, #666);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .keyboard-hints {
      display: flex;
      gap: 16px;
    }

    /* App container */
    .app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--figma-color-bg, #fff);
      color: var(--figma-color-text, #333);
    }

    .error-boundary h2 {
      margin-bottom: 16px;
    }

    .error-boundary details {
      margin-top: 16px;
      text-align: left;
      background: #fee;
      padding: 16px;
      border-radius: 6px;
    }

    .error-boundary summary {
      cursor: pointer;
      font-weight: 500;
    }

    .error-boundary pre {
      margin-top: 12px;
      overflow-x: auto;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="root">
    <div style="padding: 20px; text-align: center;">
      <h2>Loading plugin...</h2>
      <p>If you see this message, the plugin is starting up.</p>
    </div>
    <!-- React will mount here -->
    <div id="react-root"></div>
  </div>
  <script>
    // Wait for Figma's injection to complete
    console.log('🎯 Plugin UI initializing...');
    
    // Add a flag to track if our script has loaded
    window.__pluginScriptLoaded = false;
    
    // Monitor for Figma's injection completion
    let figmaInjectionComplete = false;
    const checkFigmaInjection = setInterval(() => {
      if (document.querySelector('script[src*="figma"]') || figmaInjectionComplete) {
        figmaInjectionComplete = true;
        clearInterval(checkFigmaInjection);
        console.log('✅ Figma injection detected or timeout reached');
      }
    }, 50);
    
    // Timeout after 500ms
    setTimeout(() => {
      figmaInjectionComplete = true;
    }, 500);
  </script>
  <script src="minimal.js" onerror="console.error('❌ Failed to load minimal.js:', event)"></script>
</body>
</html>`;

function buildHTML() {
  const outputDir = join(process.cwd(), 'dist');
  const outputPath = join(outputDir, 'ui.html');
  
  // Ensure dist directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Read the JavaScript file and inline it
  const minimalJsPath = join(outputDir, 'minimal.js');
  const indexJsPath = join(outputDir, 'index.js');
  let finalHtml = html;
  
  // Try minimal.js first, then index.js
  let jsPath = minimalJsPath;
  if (!existsSync(jsPath) && existsSync(indexJsPath)) {
    jsPath = indexJsPath;
  }
  
  if (existsSync(jsPath)) {
    const jsContent = readFileSync(jsPath, 'utf-8');
    // Replace the script src with inline script
    finalHtml = html.replace(
      '<script src="minimal.js" onerror="console.error(\'❌ Failed to load minimal.js:\', event)"></script>',
      `<script>${jsContent}</script>`
    );
    console.log(`✓ Inlined ${jsPath.split('/').pop()} into HTML`);
  } else {
    console.warn('⚠️  No JavaScript file found to inline');
  }
  
  writeFileSync(outputPath, finalHtml);
  console.log(`✓ Built ui.html at ${new Date().toLocaleTimeString()}`);
}

// Build once
buildHTML();

// Watch mode if --watch flag is passed
if (process.argv.includes('--watch')) {
  console.log('👀 Watching for changes...');
  
  // Watch this script file for changes
  watchFile(__filename, { interval: 1000 }, () => {
    console.log('📝 Script changed, rebuilding...');
    buildHTML();
  });
  
  // Keep process running
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping watch mode');
    process.exit(0);
  });
}