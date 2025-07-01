#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '../dist/code.js');

if (!fs.existsSync(codePath)) {
  console.error('❌ dist/code.js not found');
  process.exit(1);
}

let code = fs.readFileSync(codePath, 'utf-8');
let fixCount = 0;

console.log('🔧 Fixing syntax errors...');

// Fix the specific pattern causing issues
// Pattern: !r&&a in t || (r||(r=
// This should be: (!r&&a in t)||(r||(r=
code = code.replace(/!r&&a in t\s*\|\|\s*\(/g, (match) => {
  fixCount++;
  return '(!r&&a in t)||(';
});

// Fix similar patterns that might exist
code = code.replace(/!(\w+)&&(\w+)\s+in\s+(\w+)\s*\|\|\s*\(/g, (match, var1, var2, var3) => {
  fixCount++;
  return '(!' + var1 + '&&' + var2 + ' in ' + var3 + ')||(';
});

// Fix other potential syntax issues
// Remove extra spaces before parentheses in logical expressions
code = code.replace(/\|\|\s+\(/g, '||(');
code = code.replace(/&&\s+\(/g, '&&(');

// Fix unbalanced parentheses in specific patterns
let openParens = (code.match(/\(/g) || []).length;
let closeParens = (code.match(/\)/g) || []).length;

if (openParens !== closeParens) {
  console.log(`⚠️  Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
}

fs.writeFileSync(codePath, code);

console.log(`✅ Fixed ${fixCount} syntax patterns`);

// Try to validate the syntax
try {
  new Function('var figma = {}; ' + code);
  console.log('✅ Syntax validation passed');
} catch (e) {
  console.error('❌ Syntax error remains:', e.message);
  
  // Try to find the specific line
  const lines = code.split('\n');
  if (e.message.includes('Unexpected token')) {
    console.log('\nChecking for problematic patterns...');
    
    // Check for common syntax issues
    lines.forEach((line, index) => {
      // Check for || ( pattern with space
      if (line.match(/\|\|\s+\(/)) {
        console.log(`Line ${index + 1}: Contains "|| (" pattern`);
      }
      // Check for && ( pattern with space
      if (line.match(/&&\s+\(/)) {
        console.log(`Line ${index + 1}: Contains "&& (" pattern`);
      }
      // Check for unmatched parentheses in line
      const lineOpenParens = (line.match(/\(/g) || []).length;
      const lineCloseParens = (line.match(/\)/g) || []).length;
      if (lineOpenParens !== lineCloseParens) {
        console.log(`Line ${index + 1}: Unbalanced parentheses (${lineOpenParens} open, ${lineCloseParens} close)`);
      }
    });
  }
}