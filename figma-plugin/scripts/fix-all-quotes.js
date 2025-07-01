#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing all quote mismatches...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix patterns with mismatched quotes
const patterns = [
  // Fix patterns like "text' to 'text'
  { regex: /"([^"']+)'/g, replace: "'$1'" },
  // Fix patterns like 'text" to 'text'
  { regex: /'([^"']+)"/g, replace: "'$1'" },
  // Fix specific cases in conditionals
  { regex: /=== "([^"']+)'/g, replace: "=== '$1'" },
  { regex: /=== '([^"']+)"/g, replace: "=== '$1'" },
  // Fix includes patterns
  { regex: /\.includes\("([^"']+)'\)/g, replace: ".includes('$1')" },
  { regex: /\.includes\('([^"']+)"\)/g, replace: ".includes('$1')" },
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

// Check some known problem areas
console.log('\nChecking known problem areas:');
const lines = code.split('\n');
const checkLines = [114, 177, 203, 363, 366, 367];
checkLines.forEach(lineNum => {
  if (lineNum - 1 < lines.length) {
    const line = lines[lineNum - 1];
    if (line.includes('"') || line.includes("'")) {
      console.log(`Line ${lineNum}: ${line.substring(0, 100)}...`);
    }
  }
});