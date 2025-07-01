#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing commented field structures...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Split into lines for analysis
const lines = code.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Check if previous line is a comment about a field
  if (i > 0 && lines[i - 1].includes('// ') && lines[i - 1].includes('field should be in constructor')) {
    // If current line is just }; then it should also be commented
    if (line.trim() === '};') {
      console.log(`Commenting out line ${i + 1}: ${line.trim()}`);
      line = '  // ' + line.trim();
    }
  }
  
  // Also check for patterns where the comment and code are on the same line
  if (line.includes('// ') && line.includes(' = {') && !line.startsWith('  //')) {
    // This line has both comment and code, need to ensure it's fully commented
    console.log(`Fixing partial comment on line ${i + 1}`);
    if (!line.trim().startsWith('//')) {
      line = '  // ' + line.trim();
    }
  }
  
  fixedLines.push(line);
}

code = fixedLines.join('\n');

// Also fix any orphaned closing braces that should be commented
code = code.replace(/^(\s*)};$/gm, function(match, indent) {
  // Check if this is preceded by a commented field declaration
  const index = code.indexOf(match);
  const before = code.substring(Math.max(0, index - 200), index);
  if (before.includes('field should be in constructor') && before.lastIndexOf('//') > before.lastIndexOf('\n')) {
    return indent + '// };';
  }
  return match;
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Commented field structures fixed!');

// Verify the fix around line 52
console.log('\nChecking around line 52:');
const verifyLines = code.split('\n');
for (let i = 48; i < 56 && i < verifyLines.length; i++) {
  console.log(`${i + 1}: ${verifyLines[i].substring(0, 100)}${verifyLines[i].length > 100 ? '...' : ''}`);
}

// Check for any remaining issues
let issues = 0;
verifyLines.forEach((line, i) => {
  // Check for uncommented }; after field comments
  if (i > 0 && verifyLines[i - 1].includes('field should be in constructor') && 
      line.trim() === '};' && !line.includes('//')) {
    issues++;
    console.log(`\n⚠️  Uncommented }; at line ${i + 1}`);
  }
});

if (issues === 0) {
  console.log('\n✅ No remaining commented field issues!');
} else {
  console.log(`\n⚠️  Found ${issues} remaining issues`);
}