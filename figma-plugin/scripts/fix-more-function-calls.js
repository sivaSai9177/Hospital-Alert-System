#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing more malformed function calls...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix all patterns where a word is concatenated with 'function('
console.log('Fixing all word+function patterns...');
code = code.replace(/(\w+)function\(/g, '$1(function(');

// Also fix patterns where there might be a dot before
code = code.replace(/\.(\w+)function\(/g, '.$1(function(');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Additional function call fixes complete!');

// Validate
const remaining = code.match(/\w+function\(/g) || [];
if (remaining.length > 0) {
  console.log(`\n⚠️  Still found ${remaining.length} issues`);
} else {
  console.log('\n✅ All function call patterns fixed!');
}