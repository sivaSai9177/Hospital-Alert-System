#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Final syntax cleanup...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix the pattern where we have ; }); }); which should be }); });
console.log('Fixing semicolon before closing braces...');
code = code.replace(/;\s*\}\s*\)\s*;\s*\}\s*\)\s*;/g, '}); });');

// Fix pattern where we have a semicolon at the start of a line followed by });
code = code.replace(/^\s*;\s*\}\s*\)\s*;\s*\}\s*\)\s*;/gm, '  }); });');

// Fix the specific pattern in the map functions
// Pattern: description: 'text'\n  ; }); });
// Should be: description: 'text'\n  }); });
code = code.replace(/\n\s*;\s*\}\);/g, '\n  });');

// Fix multiline object returns in map functions
// When we have return ({ ... ; }); it should be return ({ ... }); 
const lines = code.split('\n');
const fixedLines = [];
let inReturnObject = false;
let returnStartLine = -1;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Check if we're starting a return with object
  if (line.includes('return ({') || line.includes('return {')) {
    inReturnObject = true;
    returnStartLine = i;
  }
  
  // If we're in a return object and find ; }); pattern
  if (inReturnObject && line.trim() === '; }); });') {
    line = '  }); });';
    inReturnObject = false;
  } else if (inReturnObject && line.trim().startsWith('; })')) {
    line = line.replace(/^\s*;\s*/, '  ');
    inReturnObject = false;
  }
  
  // Also check if we ended the return object normally
  if (inReturnObject && (line.includes('}); });') || line.includes('}); }'))) {
    inReturnObject = false;
  }
  
  fixedLines.push(line);
}

code = fixedLines.join('\n');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Final syntax cleanup complete!');

// Check the specific areas
console.log('\nChecking around line 8:');
const newLines = code.split('\n');
for (let i = 5; i < 10 && i < newLines.length; i++) {
  console.log(`${i + 1}: ${newLines[i]}`);
}

// Run a final validation
const syntaxIssues = [];
newLines.forEach((line, i) => {
  // Check for common syntax issues
  if (line.trim().startsWith(';')) {
    syntaxIssues.push(`Line ${i + 1}: Starts with semicolon`);
  }
  if (line.includes('; });') && !line.includes('return')) {
    syntaxIssues.push(`Line ${i + 1}: Semicolon before closing`);
  }
});

if (syntaxIssues.length > 0) {
  console.log('\n⚠️  Potential remaining issues:');
  syntaxIssues.slice(0, 5).forEach(issue => console.log(`  ${issue}`));
} else {
  console.log('\n✅ No obvious syntax issues found!');
}