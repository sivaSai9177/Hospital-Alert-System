#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Final comprehensive syntax fixes...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix semicolons that should be closing braces
console.log('Fixing semicolons that should be closing braces...');
// Pattern: property: 'value'\n  ; });
// Should be: property: 'value'\n  };
code = code.replace(/'\n\s*;\s*\}\);/g, '\'\n  };');

// Fix other patterns where semicolon appears at start of line
code = code.replace(/^\s*;\s*\}/gm, '  }');

// Fix Array.from patterns
console.log('Fixing Array.from patterns...');
// Pattern: .filter(function(v) { return v > 50).sort(
// Missing closing brace
code = code.replace(/return v > 50\)\.sort/g, 'return v > 50; }).sort');

// Fix .find patterns with semicolon placement
console.log('Fixing .find patterns...');
// Pattern: < 0.01 ; });
// Should be: < 0.01; });
code = code.replace(/(\d+)\s*;\s*\}\);/g, '$1; });');

// Fix any double closing patterns
code = code.replace(/\}\s*\}\s*\);/g, '; });');

// Fix patterns where we have }] or ]} which are incorrect
code = code.replace(/\}\]/g, '}]');
code = code.replace(/\]\}/g, ']}');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Final syntax fixes complete!');

// Run validation
const lines = code.split('\n');
let syntaxIssues = [];

// Check for common patterns
lines.forEach((line, i) => {
  if (line.trim().startsWith(';') && !line.includes(';;')) {
    syntaxIssues.push(`Line ${i + 1}: Starts with semicolon`);
  }
  if (line.match(/\)\.[a-zA-Z]+\(/)) {
    // Check if there's a missing closing brace before the method call
    const beforeDot = line.substring(0, line.indexOf(').'));
    const openCount = (beforeDot.match(/\{/g) || []).length;
    const closeCount = (beforeDot.match(/\}/g) || []).length;
    if (openCount > closeCount) {
      syntaxIssues.push(`Line ${i + 1}: Possible missing closing brace`);
    }
  }
});

if (syntaxIssues.length > 0) {
  console.log('\nPotential issues to check:');
  syntaxIssues.slice(0, 5).forEach(issue => console.log(`  ${issue}`));
}

// Check specific problematic lines
console.log('\nChecking specific lines:');
[121, 206, 234].forEach(lineNum => {
  if (lineNum - 1 < lines.length) {
    console.log(`Line ${lineNum}: ${lines[lineNum - 1].trim()}`);
  }
});