#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing object shorthand properties...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix patterns like "value," to "value: value,"
const patterns = [
  // Single word before comma
  { regex: /(\s+)(\w+),(\s+)/g, replace: '$1$2: $2,$3' },
  // Single word before closing brace
  { regex: /(\s+)(\w+)(\s*})/g, replace: '$1$2: $2$3' },
  // Fix specific known cases
  { regex: /\bvalue,/g, replace: 'value: value,' },
  { regex: /\bname,/g, replace: 'name: name,' },
  { regex: /\btype,/g, replace: 'type: type,' },
  { regex: /\bdescription,/g, replace: 'description: description,' },
];

let fixCount = 0;

// Apply fixes but be careful not to break existing "key: value" patterns
patterns.forEach(({ regex, replace }) => {
  const matches = code.match(regex) || [];
  
  // Only fix if it's not already in "key: value" format
  code = code.replace(regex, function(match, ...groups) {
    // Check if this is already a proper key: value pair
    const before = code.substring(Math.max(0, code.lastIndexOf('\n', arguments[arguments.length - 2])), arguments[arguments.length - 2]);
    if (before.includes(':')) {
      return match; // Already has a colon, don't fix
    }
    fixCount++;
    return match.replace(regex, replace);
  });
});

// More targeted fix for the specific patterns in animation tokens
code = code.replace(/{\s*name:\s*'([^']+)',\s*value,\s*type:/g, "{ name: '$1', value: value, type:");
code = code.replace(/value,\s*type:\s*'([^']+)',/g, "value: value, type: '$1',");
code = code.replace(/,\s+animations:\s+animations\s+}/g, ', animations: animations }');

// Fix escaped newlines in strings
code = code.replace(/\\n/g, ' ');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`✅ Fixed object shorthand issues!`);

// Verify the fix
console.log('\nChecking around line 5-10:');
const lines = code.split('\n');
for (let i = 4; i < 12 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i].substring(0, 100)}${lines[i].length > 100 ? '...' : ''}`);
}