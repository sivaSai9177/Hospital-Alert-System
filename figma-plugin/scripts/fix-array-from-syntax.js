#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing Array.from syntax errors...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix pattern: Array.from(something.values(); });
// Should be: Array.from(something.values());
console.log('Fixing Array.from with .values() patterns...');
code = code.replace(/Array\.from\(([^)]+)\.values\(\);\s*\}\s*\);/g, 'Array.from($1.values());');

// Fix pattern: return Array.from(something); });
// Should be: return Array.from(something);
code = code.replace(/return\s+Array\.from\(([^)]+)\);\s*\}\s*\);/g, 'return Array.from($1);');

// More general fix for any .values(); pattern
code = code.replace(/\.values\(\);\s*\)/g, '.values())');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Array.from syntax fixes complete!');

// Find and display examples
const lines = code.split('\n');
const arrayFromLines = [];
lines.forEach((line, i) => {
  if (line.includes('Array.from')) {
    arrayFromLines.push({ num: i + 1, content: line.trim() });
  }
});

if (arrayFromLines.length > 0) {
  console.log('\nArray.from usage examples:');
  arrayFromLines.slice(0, 5).forEach(({ num, content }) => {
    console.log(`  Line ${num}: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`);
  });
}