#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing method-function spacing issues...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix patterns where method name is concatenated with 'function'
const methods = [
  'findAll', 'find', 'map', 'forEach', 'filter', 'reduce', 'some', 'every',
  'push', 'pop', 'shift', 'unshift', 'sort', 'reverse', 'includes'
];

let fixCount = 0;

methods.forEach(method => {
  // Pattern: methodfunction( -> method(function(
  const regex = new RegExp(`\\.${method}function\\(`, 'g');
  const matches = code.match(regex) || [];
  if (matches.length > 0) {
    console.log(`Found ${matches.length} instances of ${method}function(`);
    code = code.replace(regex, `.${method}(function(`);
    fixCount += matches.length;
  }
  
  // Also check for space pattern: method function( -> method(function(
  const spaceRegex = new RegExp(`\\.${method}\\s+function\\(`, 'g');
  const spaceMatches = code.match(spaceRegex) || [];
  if (spaceMatches.length > 0) {
    console.log(`Found ${spaceMatches.length} instances of ${method} function(`);
    code = code.replace(spaceRegex, `.${method}(function(`);
    fixCount += spaceMatches.length;
  }
});

// Also fix any stray patterns
code = code.replace(/(\w+)function\(/g, '$1(function(');

// Fix the quote mismatch on line 112
// Pattern: .includes("container') -> .includes('container')
code = code.replace(/\.includes\("([^"]+)'\)/g, ".includes('$1')");
code = code.replace(/\.includes\('([^']+)"\)/g, ".includes('$1')");

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`\n✅ Fixed ${fixCount} method-function spacing issues!`);

// Verify the fix
console.log('\nChecking around line 110:');
const lines = code.split('\n');
for (let i = 107; i < 115 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i].substring(0, 100)}${lines[i].length > 100 ? '...' : ''}`);
}

// Check for any remaining issues
const remainingIssues = code.match(/\w+function\(/g) || [];
if (remainingIssues.length > 0) {
  console.log(`\n⚠️  Found ${remainingIssues.length} remaining issues:`);
  remainingIssues.slice(0, 3).forEach(issue => {
    console.log(`  - ${issue}`);
  });
} else {
  console.log('\n✅ No remaining method-function spacing issues!');
}