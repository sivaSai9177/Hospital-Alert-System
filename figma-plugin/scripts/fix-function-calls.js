#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing malformed function calls...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix processSequentiallyfunction pattern
console.log('Fixing processSequentiallyfunction...');
code = code.replace(/processSequentiallyfunction\(/g, 'processSequentially(function(');

// Fix any other similar patterns where a method name is concatenated with 'function'
const methodsToFix = ['map', 'filter', 'forEach', 'reduce', 'find', 'some', 'every', 'sort'];
methodsToFix.forEach(method => {
  const pattern = new RegExp(`${method}function\\(`, 'g');
  if (code.match(pattern)) {
    console.log(`Fixing ${method}function...`);
    code = code.replace(pattern, `${method}(function(`);
  }
});

// Fix the async in the processSequentially callback
console.log('Fixing async callbacks in processSequentially...');
code = code.replace(/processSequentially\(function\(([^,]+),\s*async\s*\(/g, 'processSequentially(function($1, function(');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Function call fixes complete!');

// Check for any remaining issues
const remainingMalformed = code.match(/\w+function\(/g) || [];
if (remainingMalformed.length > 0) {
  console.log(`\n⚠️  Found ${remainingMalformed.length} remaining malformed function calls:`);
  remainingMalformed.slice(0, 5).forEach(match => {
    console.log(`  - ${match}`);
  });
} else {
  console.log('\n✅ No malformed function calls found');
}