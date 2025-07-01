#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Complete ES5 fix for Figma...');

// Clean and rebuild
console.log('  Cleaning dist...');
execSync('rm -rf dist', { stdio: 'inherit' });

console.log('  Running webpack...');
execSync('bunx webpack --config webpack/webpack.plugin.es5-simple.js', { stdio: 'inherit' });

// Read the code
const codePath = path.join(__dirname, '../dist/code.js');
let code = fs.readFileSync(codePath, 'utf-8');

console.log('  Applying comprehensive fixes...');

// Fix all ES6+ features
code = code.replace(/\b(const|let)\b/g, 'var');
code = code.replace(/\/\/\/g/g, '/\\//g');
code = code.replace(/<\\\/script>/g, '<" + "/script>');

// Fix arrow functions
code = code.replace(/(\w+)\s*=>\s*\{/g, 'function($1){');
code = code.replace(/\(([^)]*)\)\s*=>\s*\{/g, 'function($1){');
code = code.replace(/(\w+)\s*=>\s*([^{;,\)}\]]+)([;,\)}\]])/g, 'function($1){return $2}$3');
code = code.replace(/\(([^)]*)\)\s*=>\s*([^{;,\)}\]]+)([;,\)}\]])/g, 'function($1){return $2}$3');

// Fix template literals
code = code.replace(/`([^`]*)`/g, function(match, content) {
  if (content.includes('${')) {
    return '"' + content.replace(/\$\{([^}]+)\}/g, '" + ($1) + "').replace(/"/g, '\\"') + '"';
  }
  return '"' + content.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
});

// Write the result
fs.writeFileSync(codePath, code);

// Copy HTML
execSync('cp src/ui/simple.html dist/index.html', { stdio: 'inherit' });

// Add line breaks for readability
const lines = code.match(/.{1,1000}/g) || [];
const formattedCode = lines.join('\n');
fs.writeFileSync(codePath, formattedCode);

console.log('✅ Complete ES5 fix done!');
console.log('   Size:', (code.length / 1024).toFixed(2), 'KB');

// Quick validation
try {
  // Just check if it starts correctly
  if (formattedCode.startsWith('!function()') || formattedCode.startsWith('(function()')) {
    console.log('✅ Basic structure looks good');
  } else {
    console.log('⚠️  May need manual review');
  }
} catch (e) {
  console.error('Error during validation:', e.message);
}