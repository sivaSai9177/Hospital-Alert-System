#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing quote and syntax issues...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix the specific line with missing closing brace
console.log('Fixing missing closing braces in findAll...');
// Pattern: return node.type === 'RECTANGLE' || node.type === "FRAME");
// Should be: return node.type === 'RECTANGLE' || node.type === "FRAME"; });
code = code.replace(/return node\.type === 'RECTANGLE' \|\| node\.type === "FRAME"\);/g, 
  'return node.type === \'RECTANGLE\' || node.type === \'FRAME\'; });');

// Fix any other similar patterns where quotes don't match
console.log('Fixing quote consistency...');
// Convert all double quotes to single quotes for consistency
code = code.replace(/node\.type === "([^"]+)"/g, "node.type === '$1'");
code = code.replace(/\.type !== "([^"]+)"/g, ".type !== '$1'");

// Fix patterns where closing brace/parenthesis is missing after return statements
code = code.replace(/return ([^;]+)\);$/gm, function(match, expr) {
  // Count opening and closing parentheses
  const openCount = (expr.match(/\(/g) || []).length;
  const closeCount = (expr.match(/\)/g) || []).length;
  
  if (openCount > closeCount) {
    return 'return ' + expr + '; });';
  }
  return match;
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Quote and syntax fixes complete!');

// Check the specific area
const lines = code.split('\n');
console.log('\nChecking around line 195:');
for (let i = 193; i < 198 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}