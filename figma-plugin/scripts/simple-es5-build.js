#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Simple ES5 build for Figma...');

// Run the existing webpack build
execSync('webpack --config webpack/webpack.plugin.es5-simple.js', { stdio: 'inherit' });

// Read the output
const codePath = path.join(__dirname, '../dist/code.js');
let code = fs.readFileSync(codePath, 'utf-8');

// The webpack output might have issues, let's check
console.log('  Checking webpack output...');
console.log('  First 100 chars:', code.substring(0, 100));

// If it starts with !function, it's already wrapped
if (code.startsWith('!function')) {
  console.log('  Output already has IIFE wrapper');
} else {
  // Wrap in IIFE
  code = '(function() {\n' + code + '\n})();';
}

// Fix any const/let that slipped through
code = code.replace(/\b(const|let)\b/g, 'var');

// Fix escaped characters that might cause issues
code = code.replace(/<\\\/script>/g, '<\\/script>');
code = code.replace(/\\\\/g, '\\\\');

// Write back
fs.writeFileSync(codePath, code);

// Copy HTML
execSync('cp src/ui/simple.html dist/index.html', { stdio: 'inherit' });

console.log('✅ Build complete!');

// Test syntax
try {
  // Check if it's valid JS
  new Function('var figma = {}; ' + code);
  console.log('✅ Syntax check passed');
} catch (e) {
  console.error('❌ Syntax error:', e.message);
  // Show the problematic area
  const lines = code.split('\n');
  console.log('First few lines:');
  for (let i = 0; i < 5 && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i].substring(0, 80)}`);
  }
}