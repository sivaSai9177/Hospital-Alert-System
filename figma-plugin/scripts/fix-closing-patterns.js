#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing closing patterns...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix patterns where we have }); }) but should have }; })
// This happens when closing an object literal inside a map/forEach function
const lines = code.split('\n');
const fixedLines = lines.map((line, index) => {
  // Check if this line ends with }); })
  if (line.trim().endsWith('}); })')) {
    // Look at previous lines to see if we're closing an object literal
    let isObjectLiteral = false;
    let braceCount = 0;
    
    // Check the previous 10 lines for object literal pattern
    for (let i = Math.max(0, index - 10); i < index; i++) {
      const prevLine = lines[i];
      if (prevLine.includes('return {')) {
        isObjectLiteral = true;
      }
      // Count braces to ensure we're at the right level
      braceCount += (prevLine.match(/\{/g) || []).length;
      braceCount -= (prevLine.match(/\}/g) || []).length;
    }
    
    if (isObjectLiteral && braceCount > 0) {
      fixCount++;
      return line.replace(/\}\); \}\)$/, '}; })');
    }
  }
  return line;
});

code = fixedLines.join('\n');

// Also fix standalone patterns
const standaloneRegex = /(\s+)\}\); \}\)(\s*$)/gm;
code = code.replace(standaloneRegex, function(match, before, after) {
  fixCount++;
  return before + '}; })' + after;
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`✅ Fixed ${fixCount} closing pattern issues!`);

// Verify by checking some known problematic areas
console.log('\nChecking known areas:');
const checkLines = [38, 46, 9519, 10186, 10211];
const newLines = code.split('\n');
checkLines.forEach(lineNum => {
  if (lineNum - 1 < newLines.length) {
    console.log(`Line ${lineNum}: ${newLines[lineNum - 1].trim()}`);
  }
});