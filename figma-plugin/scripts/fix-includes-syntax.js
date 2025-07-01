#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing includes() syntax errors...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix patterns where there's a semicolon inside function calls
console.log('Fixing semicolons inside function calls...');
// Pattern: hasGridPattern(frame; });
code = code.replace(/hasGridPattern\(([^;]+);\s*\}\)/g, 'hasGridPattern($1)');

// Pattern: .includes("text"; });
code = code.replace(/\.includes\(([^;]+);\s*\}\)/g, '.includes($1)');

// More general pattern: any function call with semicolon before closing parenthesis
code = code.replace(/\(([^)]+);\s*\)\s*;/g, '($1);');

// Fix patterns where closing brace and parenthesis are in wrong order
// Pattern: }); at the end of a return statement should just be }
code = code.replace(/return\s+([^;]+)\s*\}\s*\)\s*;/g, function(match, expr) {
  // Check if this is inside a callback
  const lines = code.substring(0, code.indexOf(match)).split('\n');
  const lastFewLines = lines.slice(-5).join('\n');
  
  if (lastFewLines.includes('.findAll(') || lastFewLines.includes('.filter(') || 
      lastFewLines.includes('.map(') || lastFewLines.includes('.forEach(')) {
    return 'return ' + expr + '; });';
  }
  return 'return ' + expr + ';';
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ includes() syntax fixes complete!');

// Check around the problematic lines
const lines = code.split('\n');
console.log('\nChecking around line 159:');
for (let i = 157; i < 162 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}

console.log('\nChecking around line 134:');
for (let i = 132; i < 137 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}