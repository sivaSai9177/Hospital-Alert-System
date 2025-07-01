#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing final destructuring patterns...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix line 206 specifically - it has multiple issues
console.log('Fixing complex destructuring patterns...');

// First, fix the specific line with destructuring and missing braces
code = code.replace(
  /Array\.from\(ratioMap\.entries\(\)\)\.filter\(function\(\[_, \{ count: count \}\]\) \{ return count > 3\)\.forEach\(function\(\[ratioStr, \{ ratio: ratio \}\] \}\)/g,
  'Array.from(ratioMap.entries()).filter(function(entry) { var count = entry[1].count; return count > 3; }).forEach(function(entry) { var ratioStr = entry[0], ratio = entry[1].ratio;'
);

// Fix similar patterns with destructuring in filter/forEach
// Pattern: function([key, { prop: prop }])
code = code.replace(/function\(\[(\w+),\s*\{\s*(\w+):\s*(\w+)\s*\}\]\)/g, 
  'function(entry) { var $1 = entry[0], $3 = entry[1].$2;');

// Pattern: function([key, value])
code = code.replace(/function\(\[(\w+),\s*(\w+)\]\)/g, 
  'function(entry) { var $1 = entry[0], $2 = entry[1];');

// Fix patterns with underscore like [_, { count: count }]
code = code.replace(/function\(\[_,\s*\{\s*(\w+):\s*(\w+)\s*\}\]\)/g, 
  'function(entry) { var $2 = entry[1].$1;');

// Fix missing semicolons in .find() calls
code = code.replace(/\}\s*;\s*\}\s*\);/g, '; });');

// Fix the sort function pattern with (a, b) syntax
code = code.replace(/\.sort\(function\(\((\w+),\s*(\w+)\)/g, '.sort(function($1, $2');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Final destructuring fixes complete!');

// Check the specific area
const lines = code.split('\n');
console.log('\nChecking around line 206:');
for (let i = 204; i < 210 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}