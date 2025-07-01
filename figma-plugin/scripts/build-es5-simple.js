#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, '../dist/code.js');

console.log('🚀 Simple ES5 Build Process Starting...');

try {
  // Read the file
  let code = fs.readFileSync(distPath, 'utf-8');
  console.log(`📖 Input: ${(code.length / 1024).toFixed(2)}KB`);
  
  // Remove all ES6+ features with simple replacements
  console.log('🔧 Converting to ES5...');
  
  // 1. Remove all imports/exports
  code = code.replace(/^import\s+.*$/gm, '');
  code = code.replace(/^export\s+.*$/gm, '');
  
  // 2. Convert arrow functions
  code = code.replace(/(\w+)\s*=>\s*\{/g, 'function($1) {');
  code = code.replace(/\(([^)]*)\)\s*=>\s*\{/g, 'function($1) {');
  code = code.replace(/(\w+)\s*=>\s*/g, 'function($1) { return ');
  code = code.replace(/\(([^)]*)\)\s*=>\s*/g, 'function($1) { return ');
  
  // 3. Convert template literals (simple cases)
  code = code.replace(/`([^`]*)`/g, function(match, p1) {
    return '"' + p1.replace(/"/g, '\\"') + '"';
  });
  
  // 4. Convert const/let to var
  code = code.replace(/\b(const|let)\b/g, 'var');
  
  // 5. Remove classes
  code = code.replace(/\bclass\s+/g, 'function ');
  
  // 6. Remove async/await
  code = code.replace(/\basync\s+/g, '');
  code = code.replace(/\bawait\s+/g, '');
  
  // Write result
  fs.writeFileSync(distPath, code);
  console.log(`✅ Output: ${(code.length / 1024).toFixed(2)}KB`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}