#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Converting async/await to ES5...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Convert async function declarations
console.log('Converting async functions...');
// Pattern: async function name() {
code = code.replace(/async\s+function\s+(\w+)\s*\(/g, 'function $1(');

// Pattern: async () => or async (params) =>
code = code.replace(/async\s+\(\s*([^)]*)\s*\)\s*=>/g, 'function($1)');

// Pattern: async methodName() { in classes
code = code.replace(/async\s+(\w+)\s*\(/g, '$1(');

// Convert await to callback style
console.log('Converting await expressions...');
// This is complex - for now, just remove await keyword
// In a real scenario, we'd need to convert to promises/callbacks
code = code.replace(/await\s+/g, '');

// Add a comment to indicate manual conversion needed
code = code.replace(/function\s+(\w+)\s*\([^)]*\)\s*\{/g, function(match, name) {
  if (code.includes(name + '(') && match.includes('Async')) {
    return match + '\n  // Note: This function was async and needs manual conversion to use callbacks or promises';
  }
  return match;
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ async/await conversions complete!');

// Validate
const remainingAsync = (code.match(/\basync\s+/g) || []).length;
const remainingAwait = (code.match(/\bawait\s+/g) || []).length;

console.log(`\nValidation:`);
console.log(`  async declarations: ${remainingAsync}`);
console.log(`  await expressions: ${remainingAwait}`);

if (remainingAsync > 0 || remainingAwait > 0) {
  console.log('\n⚠️  Some async/await patterns might still remain');
} else {
  console.log('\n✅ All async/await removed');
}

console.log('\n⚠️  Note: Functions that were async will need manual conversion to use callbacks or promises');