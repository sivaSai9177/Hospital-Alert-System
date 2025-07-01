#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing opacity quote mismatches...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix patterns like opacity: '0" to opacity: '0'
const patterns = [
  // Fix opacity values with mismatched quotes
  { regex: /opacity:\s*'([^'"]+)"/g, replace: "opacity: '$1'" },
  // Fix transform values that might have quote issues
  { regex: /transform:\s*"([^'"]+)'/g, replace: "transform: '$1'" },
  // Fix any remaining '0" or '1" patterns
  { regex: /'(\d+(\.\d+)?)"/g, replace: "'$1'" },
];

// Apply fixes
patterns.forEach(({ regex, replace }) => {
  const matches = code.match(regex) || [];
  if (matches.length > 0) {
    console.log(`Found ${matches.length} instances of pattern: ${regex.source}`);
    code = code.replace(regex, replace);
    fixCount += matches.length;
  }
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`\n✅ Fixed ${fixCount} quote mismatches!`);

// Check the KEYFRAMES section
console.log('\nChecking KEYFRAMES section (lines 60-80):');
const lines = code.split('\n');
for (let i = 59; i < 80 && i < lines.length; i++) {
  if (lines[i].includes('opacity') || lines[i].includes('transform')) {
    console.log(`${i + 1}: ${lines[i].trim()}`);
  }
}