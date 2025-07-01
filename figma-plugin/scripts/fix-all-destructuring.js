#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing all destructuring patterns...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix destructuring in map functions: .map(function(([name, value])
const mapDestructRegex = /\.map\(function\(\(\[(\w+),\s*(\w+)\]\)\)\s*\{\s*return\s*\(\{/g;
code = code.replace(mapDestructRegex, function(match, param1, param2) {
  fixCount++;
  return `.map(function(arr) { var ${param1} = arr[0], ${param2} = arr[1]; return {`;
});

// Fix object shorthand properties
const shorthandPatterns = [
  // value, -> value: value,
  { regex: /(\s+)value,(\s+)/g, replace: '$1value: value,$2' },
  // type, -> type: type,
  { regex: /(\s+)type,(\s+)/g, replace: '$1type: type,$2' },
  // Fix specific patterns in the animation tokens
  { regex: /value,\s*type:\s*'(\w+)',/g, replace: "value: value, type: '$1'," },
];

shorthandPatterns.forEach(({ regex, replace }) => {
  const matches = code.match(regex) || [];
  if (matches.length > 0) {
    code = code.replace(regex, replace);
    fixCount += matches.length;
  }
});

// Fix escaped newlines in the animation token definitions
code = code.replace(/\\n/g, ' ');

// Fix any remaining "return ({" patterns to "return {"
code = code.replace(/return\s*\(\{/g, 'return {');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`✅ Fixed ${fixCount} destructuring and syntax issues!`);

// Check the result
console.log('\nChecking lines 4-20:');
const lines = code.split('\n');
for (let i = 3; i < 20 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i].substring(0, 100)}${lines[i].length > 100 ? '...' : ''}`);
}