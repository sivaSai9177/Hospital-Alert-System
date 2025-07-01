#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing keyframe quote mismatches...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix patterns like opacity: '0" to opacity: '0'
const regex1 = /opacity:\s*'([^'"]+)"/g;
code = code.replace(regex1, function(match, value) {
  fixCount++;
  return `opacity: '${value}'`;
});

// Fix patterns like transform: 'scale(0.95)' where quotes are already correct
// Just count them
const correctPatterns = code.match(/transform:\s*'[^']+'/g) || [];
console.log(`Found ${correctPatterns.length} correctly quoted transform values`);

// Also fix any remaining mismatched quotes in keyframes
// Pattern: '0" should be '0'
const regex2 = /:\s*'([^'"]+)"/g;
code = code.replace(regex2, function(match, value) {
  fixCount++;
  return `: '${value}'`;
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`✅ Fixed ${fixCount} quote mismatches!`);

// Verify around the keyframes section
console.log('\nChecking keyframes section (lines 60-75):');
const lines = code.split('\n');
for (let i = 59; i < 75 && i < lines.length; i++) {
  if (lines[i].includes('opacity') || lines[i].includes('transform')) {
    console.log(`${i + 1}: ${lines[i].trim()}`);
  }
}