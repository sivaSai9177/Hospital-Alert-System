#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing specific syntax issues...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix the specific pattern on line 145
console.log('Fixing sort with destructuring pattern...');
// Pattern: sort(function(([a], [b]) { return a - b; })
code = code.replace(/\.sort\(function\(\(\[(\w+)\],\s*\[(\w+)\]\)\s*\{\s*return\s+(\w+)\s*-\s*(\w+);\s*\}\)/g, 
  '.sort(function(entry1, entry2) { var $1 = entry1[0], $2 = entry2[0]; return $1 - $2; })');

// Fix the forEach pattern that follows
// Pattern: .forEach(function(arr, index) { var width = arr[0], frames2 = arr[1].frames; {
// The extra { at the end is wrong
code = code.replace(/\.forEach\(function\((\w+),\s*(\w+)\)\s*\{\s*var\s+(\w+)\s*=\s*\1\[0\],\s*(\w+)\s*=\s*\1\[1\]\.\w+;\s*\{/g,
  '.forEach(function($1, $2) { var $3 = $1[0], $4 = $1[1].frames;');

// Fix any remaining patterns with destructuring in sort
code = code.replace(/\.sort\(function\(\[(\w+)\],\s*\[(\w+)\]\)/g, 
  '.sort(function(entry1, entry2) { var $1 = entry1, $2 = entry2;');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Specific syntax fixes complete!');

// Check the specific line
const lines = code.split('\n');
console.log('\nChecking around line 145:');
for (let i = 143; i < 148 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}