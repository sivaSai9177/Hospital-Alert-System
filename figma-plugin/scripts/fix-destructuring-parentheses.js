#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing destructuring parentheses...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix patterns like function(([name, value]) to function(arr) { var name = arr[0], value = arr[1];
// Match the exact pattern in the file
const regex = /\.map\(function\(\(\[(\w+),\s*(\w+)\]\)\)\s*\{\s*return\s*\(\{/g;
let fixCount = 0;

// First, let's do a more general fix
code = code.replace(/function\(\(\[(\w+),\s*(\w+)\]\)\)/g, function(match, param1, param2) {
  fixCount++;
  return `function(arr) { var ${param1} = arr[0], ${param2} = arr[1];`;
});

// Also fix forEach, filter, etc. with same pattern
const methods = ['forEach', 'filter', 'reduce', 'some', 'every', 'find'];
methods.forEach(method => {
  const methodRegex = new RegExp(`\\.${method}\\(function\\(\\(\\[(\\w+),\\s*(\\w+)\\]\\)\\)`, 'g');
  code = code.replace(methodRegex, function(match, param1, param2) {
    fixCount++;
    return `.${method}(function(arr) { var ${param1} = arr[0], ${param2} = arr[1];`;
  });
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`✅ Fixed ${fixCount} destructuring parentheses issues!`);

// Verify the fix
console.log('\nChecking around line 5:');
const lines = code.split('\n');
for (let i = 2; i < 10 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i].substring(0, 100)}${lines[i].length > 100 ? '...' : ''}`);
}

// Check for remaining issues
const remainingIssues = code.match(/function\(\(\[/g) || [];
if (remainingIssues.length > 0) {
  console.log(`\n⚠️  Found ${remainingIssues.length} remaining issues`);
} else {
  console.log('\n✅ No remaining destructuring parentheses issues!');
}