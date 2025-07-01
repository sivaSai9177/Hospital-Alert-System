#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '../dist/code.js');
let code = fs.readFileSync(codePath, 'utf-8');

console.log('Fixing regex patterns...');

// Fix triple slashes - these should be /\//g (escaped forward slash)
let fixCount = 0;

// Replace ///g with /\//g
code = code.replace(/\/\/\/g/g, (match) => {
  fixCount++;
  console.log('  Fixed triple slash regex');
  return '/\\//g';
});

// Also check for other potential regex issues
// Look for .replace(/ with no closing
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Count slashes in replace calls
  const replaceMatches = line.match(/\.replace\(\/[^/]*\/[^,)]*[,)]/g);
  if (replaceMatches) {
    replaceMatches.forEach(match => {
      // Check if the regex looks malformed
      const slashCount = (match.match(/\//g) || []).length;
      if (slashCount % 2 !== 0 && !match.includes('\\/')) {
        console.log(`  Potential regex issue on line ${i + 1}: ${match}`);
      }
    });
  }
}

fs.writeFileSync(codePath, code);

console.log(`✅ Fixed ${fixCount} regex patterns`);

// Show the fixed line
const fixedLines = code.split('\n');
console.log('Line 528 after fix (first 200 chars):');
if (fixedLines[527]) {
  console.log(fixedLines[527].substring(0, 200));
}