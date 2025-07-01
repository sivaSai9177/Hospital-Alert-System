#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '../dist/code.js');
let code = fs.readFileSync(codePath, 'utf-8');

console.log('Fixing multiline issues...');

// Split into lines
let lines = code.split('\n');

// Find lines that end with a semicolon or comma followed by a line that starts with 'if'
for (let i = 0; i < lines.length - 1; i++) {
  const currentLine = lines[i].trim();
  const nextLine = lines[i + 1].trim();
  
  // If current line ends with ; or , and next line starts with if, merge them
  if ((currentLine.endsWith(';') || currentLine.endsWith(',')) && nextLine.startsWith('if(')) {
    console.log(`  Merging lines ${i + 1} and ${i + 2}`);
    lines[i] = lines[i] + ' ' + lines[i + 1];
    lines.splice(i + 1, 1);
    i--; // Check this line again
  }
  
  // Also check for lines that have just a semicolon or comma
  if (currentLine === ';' || currentLine === ',') {
    if (i > 0) {
      console.log(`  Merging standalone ${currentLine} at line ${i + 1}`);
      lines[i - 1] = lines[i - 1] + currentLine;
      lines.splice(i, 1);
      i--;
    }
  }
}

// Rejoin the lines
code = lines.join('\n');

// Also fix any broken function declarations
code = code.replace(/\n(if\s*\()/g, ' $1');
code = code.replace(/\n(else\s*{)/g, ' $1');
code = code.replace(/\n(else\s+if)/g, ' $1');

fs.writeFileSync(codePath, code);

// Check the specific problem area
lines = code.split('\n');
console.log('Line 544 area after fix:');
for (let i = 542; i < 547 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i].substring(0, 100)}`);
}

console.log('✅ Fixed multiline issues');