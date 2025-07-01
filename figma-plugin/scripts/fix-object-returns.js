#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing object return patterns...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix pattern: return ({ ... }; });
// Should be: return ({ ... }); });
console.log('Fixing object return syntax...');
let fixCount = 0;

// Split into lines for better analysis
const lines = code.split('\n');
const fixedLines = [];
let inReturnObject = false;
let openParens = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Check if we're starting a return with object
  if (line.includes('return ({')) {
    inReturnObject = true;
    openParens = 1;
  }
  
  // If we're in a return object, count parentheses
  if (inReturnObject) {
    openParens += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
    
    // Check if this line closes the object
    if (line.trim().match(/^\}\s*;\s*\}\);?$/)) {
      // This should be }); });
      line = line.replace(/^\s*\}\s*;\s*\}\);?/, '  }); });');
      inReturnObject = false;
      fixCount++;
      console.log(`Fixed line ${i + 1}: object return closing`);
    } else if (line.includes('}; })')) {
      // Fix inline pattern
      line = line.replace(/\}\s*;\s*\}\)/, '}); })');
      inReturnObject = false;
      fixCount++;
    }
  }
  
  fixedLines.push(line);
}

code = fixedLines.join('\n');

// Additional pattern fixes
// Fix: description: 'text'\n  }; });
// Should be: description: 'text'\n  }); });
code = code.replace(/\n(\s+)\}\s*;\s*\}\);/g, '\n$1}); });');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`\n✅ Fixed ${fixCount} object return patterns!`);

// Check for remaining issues
const newLines = code.split('\n');
const issues = [];

newLines.forEach((line, i) => {
  if (line.match(/\}\s*;\s*\}/)) {
    issues.push(i + 1);
  }
});

if (issues.length > 0) {
  console.log(`\n⚠️  ${issues.length} potential issues remaining on lines:`, issues.slice(0, 5));
} else {
  console.log('\n✅ No obvious issues found!');
}