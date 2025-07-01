#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '../dist/code.js');
let code = fs.readFileSync(codePath, 'utf-8');

console.log('Fixing illegal tokens...');

// Fix improperly escaped sequences
// Replace <\/script> with <" + "/script>
code = code.replace(/<\\\/script>/g, '<" + "/script>');

// Fix other potential issues with escape sequences
// Look for any backslash followed by a forward slash
code = code.replace(/\\\//g, '/');

// Fix any double-escaped backslashes
code = code.replace(/\\\\\\\\/g, '\\\\');

// Check for other problematic patterns
const problematicPatterns = [
  /\\x([0-9a-fA-F]{1})(?![0-9a-fA-F])/g, // Single hex digit
  /\\u([0-9a-fA-F]{1,3})(?![0-9a-fA-F])/g, // Incomplete unicode
];

problematicPatterns.forEach(pattern => {
  if (pattern.test(code)) {
    console.log('  Found problematic pattern:', pattern);
  }
});

fs.writeFileSync(codePath, code);

// Check line 687 specifically
const lines = code.split('\n');
if (lines[686]) { // 0-indexed
  console.log('Line 687 preview:', lines[686].substring(0, 100) + '...');
}

console.log('✅ Fixed illegal tokens');