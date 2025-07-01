import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('🎨 React wrapper starting...');

// Wait for Figma to finish injecting its code
function waitForFigmaInjection(callback: () => void) {
  // Check if Figma has injected its theme handler
  if (window.parent && window.parent !== window) {
    // Give Figma a moment to inject its code
    setTimeout(callback, 100);
  } else {
    // In development or if no parent, proceed immediately
    callback();
  }
}

// Initialize React after Figma's injection
function initializeReact() {
  console.log('⚛️ Initializing React...');
  
  const container = document.getElementById('react-root');
  if (!container) {
    console.error('❌ Could not find react-root element');
    return;
  }

  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('✅ React app rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering React app:', error);
  }
}

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    waitForFigmaInjection(initializeReact);
  });
} else {
  waitForFigmaInjection(initializeReact);
}