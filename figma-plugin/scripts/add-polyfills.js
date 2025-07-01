#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist/code.js');
const polyfillsPath = path.join(__dirname, '../src/polyfills.js');

if (fs.existsSync(distPath) && fs.existsSync(polyfillsPath)) {
  const polyfills = fs.readFileSync(polyfillsPath, 'utf-8');
  const code = fs.readFileSync(distPath, 'utf-8');
  
  // Only add polyfills if not already present
  if (!code.includes('// Comprehensive ES5 Polyfills')) {
    fs.writeFileSync(distPath, polyfills + '\n' + code);
    console.log('✅ Added ES5 polyfills');
  }
}