#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing if statement closing braces...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixed = 0;

// Split into lines
const lines = code.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Check if this line has an if statement
  if (line.includes('if (') && line.includes('{')) {
    // Check the next few lines
    let hasClosingBrace = false;
    let bracesOpened = 1;
    
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      const nextLine = lines[j];
      bracesOpened += (nextLine.match(/\{/g) || []).length;
      bracesOpened -= (nextLine.match(/\}/g) || []).length;
      
      if (bracesOpened === 0) {
        hasClosingBrace = true;
        break;
      }
    }
    
    // If we find a pattern where the if statement body is followed by });
    // but the if statement itself isn't closed, we need to add a }
    if (!hasClosingBrace && i + 2 < lines.length) {
      const nextLine = lines[i + 1];
      const lineAfter = lines[i + 2];
      
      if (lineAfter.trim().startsWith('});') || lineAfter.trim().startsWith('})')) {
        console.log(`Found unclosed if statement at line ${i + 1}`);
        // Insert closing brace before the });
        fixedLines.push(line);
        fixedLines.push(nextLine);
        fixedLines.push('      }');
        fixed++;
        i++; // Skip the next line since we've already processed it
        continue;
      }
    }
  }
  
  fixedLines.push(line);
}

if (fixed > 0) {
  code = fixedLines.join('\n');
  fs.writeFileSync('dist/code.js', code);
  console.log(`\n✅ Fixed ${fixed} unclosed if statements`);
} else {
  console.log('\n✅ No unclosed if statements found');
}

// Also fix patterns where we have missing closing braces in general
// Pattern: statement;\n    });\n  });
// This suggests a missing closing brace
console.log('\nChecking for other missing braces...');
code = code.replace(/;\n(\s+)\}\);\n(\s+)\}\);/g, function(match, indent1, indent2) {
  if (indent1.length > indent2.length) {
    return ';\n' + indent1 + '}\n' + indent1 + '});\n' + indent2 + '});';
  }
  return match;
});

fs.writeFileSync('dist/code.js', code);
console.log('✅ Additional brace fixes applied');