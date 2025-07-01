#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building ES5-compatible Figma plugin...');

// Use the standard build process
execSync('bun run clean && bunx webpack --config webpack/webpack.plugin.es5-simple.js', { 
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

// Read the output
const codePath = path.join(__dirname, '../dist/code.js');
let code = fs.readFileSync(codePath, 'utf-8');

console.log('  Applying ES5 fixes...');

// Fix ES6+ features
code = code.replace(/\b(const|let)\b/g, 'var');
code = code.replace(/\/\/\/g/g, '/\\//g');
code = code.replace(/<\\\/script>/g, '<" + "/script>');

// Run the other fix scripts
execSync('node scripts/fix-illegal-tokens.js', { stdio: 'inherit' });
execSync('node scripts/fix-regex-patterns.js', { stdio: 'inherit' });

// Copy HTML
execSync('cp src/ui/simple.html dist/index.html', { stdio: 'inherit' });

// Read the final code
code = fs.readFileSync(codePath, 'utf-8');

// Don't break lines in the middle of tokens - keep it as one line for now
// Figma seems to handle single-line files better
console.log('✅ Build complete!');
console.log('   Size:', (code.length / 1024).toFixed(2), 'KB');
console.log('   Format: Single line (optimized for Figma)');