import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

console.log('🎨 UI script starting...');

console.log('🎨 Imports complete');

// Mount React app
const container = document.getElementById('root');
console.log('📍 Root element:', container);

if (container) {
  console.log('⚛️ Creating React root...');
  const root = createRoot(container);
  root.render(<App />);
  console.log('✅ React app rendered');
} else {
  console.error('❌ Could not find root element');
}