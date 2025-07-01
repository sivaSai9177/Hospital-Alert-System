#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing function parameter syntax issues...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix patterns like: function(param return { or function((param return {
const patterns = [
  // function(param return {
  { regex: /function\((\w+) return \{/g, replace: 'function($1) { return {' },
  // function((param return {
  { regex: /function\(\((\w+) return \{/g, replace: 'function($1) { return {' },
  // function(param1, param2 return {
  { regex: /function\((\w+),\s*(\w+) return \{/g, replace: 'function($1, $2) { return {' },
  // function((param1, param2 return {
  { regex: /function\(\((\w+),\s*(\w+) return \{/g, replace: 'function($1, $2) { return {' },
  // function(param1, param2, param3 return {
  { regex: /function\((\w+),\s*(\w+),\s*(\w+) return \{/g, replace: 'function($1, $2, $3) { return {' },
];

// Apply fixes
patterns.forEach(({ regex, replace }) => {
  const matches = code.match(regex) || [];
  if (matches.length > 0) {
    console.log(`Found ${matches.length} instances of pattern: ${regex.source.substring(0, 40)}...`);
    code = code.replace(regex, replace);
    fixCount += matches.length;
  }
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`\n✅ Fixed ${fixCount} function parameter syntax issues!`);

// Check for remaining issues
const remainingIssues = code.match(/function\([^)]*return/g) || [];
if (remainingIssues.length > 0) {
  console.log(`\n⚠️  Found ${remainingIssues.length} potential remaining issues:`);
  remainingIssues.slice(0, 5).forEach(issue => {
    console.log(`  - ${issue}`);
  });
} else {
  console.log('\n✅ No remaining function parameter syntax issues!');
}