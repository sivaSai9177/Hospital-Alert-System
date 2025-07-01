#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing map/filter return syntax errors...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix pattern: return value)) ; });
// Should be: return value; }));
console.log('Fixing misplaced semicolons in return statements...');
code = code.replace(/return\s+([^;]+)\)\)\s*;\s*\}\);/g, function(match, expr) {
  fixCount++;
  return 'return ' + expr + '; }));';
});

// Fix pattern: return value) ; });
// Should be: return value; });
code = code.replace(/return\s+([^;]+)\)\s*;\s*\}\);/g, function(match, expr) {
  fixCount++;
  return 'return ' + expr + '; });';
});

// Fix pattern in sort functions: sort(function(a, b { return
// Should be: sort(function(a, b) { return
console.log('Fixing sort function syntax...');
code = code.replace(/\.sort\(function\((\w+),\s*(\w+)\s*\{\s*return/g, function(match, p1, p2) {
  fixCount++;
  return '.sort(function(' + p1 + ', ' + p2 + ') { return';
});

// Fix pattern: return a - b ; });
// Should be: return a - b; });
code = code.replace(/return\s+([^;]+)\s+;\s*\}\);/g, function(match, expr) {
  fixCount++;
  return 'return ' + expr + '; });';
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`\n✅ Fixed ${fixCount} syntax errors!`);

// Find remaining issues
const lines = code.split('\n');
const issues = [];

lines.forEach((line, i) => {
  // Check for patterns that might still be problematic
  if (line.match(/\)\s*;\s*\}/)) {
    issues.push({ line: i + 1, pattern: ') ; }' });
  }
  if (line.match(/function\(\w+,\s*\w+\s*\{/)) {
    issues.push({ line: i + 1, pattern: 'Missing ) after parameters' });
  }
});

if (issues.length > 0) {
  console.log('\nPotential remaining issues:');
  issues.slice(0, 5).forEach(({ line, pattern }) => {
    console.log(`  Line ${line}: ${pattern}`);
  });
}