#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing all semicolon patterns...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Split into lines for better processing
const lines = code.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // If line starts with semicolon followed by closing braces/parens
  if (line.trim().match(/^;\s*\}\s*\);?$/)) {
    // Check the previous lines to understand context
    let prevNonEmptyLine = '';
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].trim()) {
        prevNonEmptyLine = lines[j];
        break;
      }
    }
    
    // If previous line ends with a closing brace, this is likely a missing closing brace
    if (prevNonEmptyLine.trim().endsWith('}')) {
      line = line.replace(/^\s*;\s*/, '    ');
      console.log(`Fixed line ${i + 1}: semicolon at start replaced with proper indentation`);
    }
  }
  
  fixedLines.push(line);
}

code = fixedLines.join('\n');

// Additional cleanup
// Fix patterns like: description: 'text'\n      });\n    ; });
// Should be: description: 'text'\n      });\n    }
code = code.replace(/\}\);\n\s*;\s*\}\);/g, '});\n    }');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Semicolon pattern fixes complete!');

// Validate the fixes
const newLines = code.split('\n');
const remainingIssues = [];
newLines.forEach((line, i) => {
  if (line.trim().match(/^;\s*\}/)) {
    remainingIssues.push(i + 1);
  }
});

if (remainingIssues.length > 0) {
  console.log(`\n⚠️  ${remainingIssues.length} lines still start with semicolon:`);
  remainingIssues.slice(0, 5).forEach(lineNum => {
    console.log(`  Line ${lineNum}: ${newLines[lineNum - 1].trim()}`);
  });
} else {
  console.log('\n✅ No lines starting with semicolon found!');
}