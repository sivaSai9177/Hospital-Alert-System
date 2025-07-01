#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing parentheses closing patterns...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix double closing parentheses that might cause syntax errors
console.log('Fixing double closing parentheses...');
// Pattern like includes("container"));  should be includes("container");
code = code.replace(/\.includes\(([^)]+)\)\)\);/g, '.includes($1);');
code = code.replace(/\.includes\(([^)]+)\)\)/g, '.includes($1)');

// Fix push(function({ pattern
console.log('Fixing push(function({ patterns...');
code = code.replace(/\.push\(function\(\{/g, '.push({');

// Fix map(function(([destructuring]) patterns  
console.log('Fixing destructuring patterns...');
// Match the pattern more broadly with optional spaces
code = code.replace(/\.(map|filter|forEach|reduce|find|some|every)\(function\(\(\[(\w+),\s*(\w+)\]\)\)\s*\{\s*return/g, 
  '.$1(function(arr) { var $2 = arr[0], $3 = arr[1]; return');
// Also handle Object.entries patterns
code = code.replace(/Object\.entries\(([^)]+)\)\.(map|filter|forEach)\(function\(\(\[(\w+),\s*(\w+)\]\)\)/g, 
  'Object.entries($1).$2(function(entry) { var $3 = entry[0], $4 = entry[1];');

// Fix any remaining function(([destructuring]) patterns
console.log('Fixing remaining destructuring patterns...');
// This catches any pattern like function(([a, b])
code = code.replace(/function\(\(\[(\w+),\s*(\w+)\]\)\)/g, 'function(arr) { var $1 = arr[0], $2 = arr[1];');
// Fix double parentheses after function like function((param)
code = code.replace(/function\(\((\w+)\)/g, 'function($1)');
// Fix sort pattern with function(([a], [b])
code = code.replace(/\.sort\(function\(\(\[(\w+)\],\s*\[(\w+)\]\)\)/g, 
  '.sort(function(arr1, arr2) { var $1 = arr1[0], $2 = arr2[0];');
// Fix broken sort syntax like "return a - b).forEach"
code = code.replace(/return\s+(\w+)\s*-\s*(\w+)\)\.forEach/g, 'return $1 - $2; }).forEach');
// Fix forEach with destructuring like forEach(function([width, { frames: frames2 }], index)
code = code.replace(/\.forEach\(function\(\[(\w+),\s*\{\s*(\w+):\s*(\w+)\s*\}\],\s*(\w+)\)/g, 
  '.forEach(function(arr, $4) { var $1 = arr[0], $3 = arr[1].$2;');
// Fix the broken parameter list after the fix above
code = code.replace(/;,\s*(\w+)\)\s*\{/g, '; }, $1) {');

// Fix patterns where map/forEach/etc callbacks are not properly closed
// Pattern: }))  at the end of a return statement
// Should be: }); })

// Split into lines for better analysis
const lines = code.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Check if this line has problematic closing pattern
  if (line.trim() === '}))') {
    // Look back to see if this is closing a map/forEach/etc function
    let isArrayMethod = false;
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      if (lines[j].includes('.map(') || lines[j].includes('.forEach(') || 
          lines[j].includes('.filter(') || lines[j].includes('.reduce(')) {
        isArrayMethod = true;
        break;
      }
    }
    
    if (isArrayMethod) {
      console.log(`Fixing line ${i + 1}: })) -> }); })`);
      line = line.replace('})))', '}); })');
      line = line.replace('}))', '}); })');
    }
  }
  
  // Also fix inline patterns
  if (line.includes('}))') && !line.includes('})); }) ')) {
    // Check if it's in the context of an array method
    if (line.includes('.map(') || line.includes('.forEach(') || 
        line.includes('.filter(') || line.includes('.reduce(')) {
      console.log(`Fixing inline pattern on line ${i + 1}`);
      line = line.replace(/\}\)\)/g, '}); })');
    }
  }
  
  fixedLines.push(line);
}

code = fixedLines.join('\n');

// Additional pattern fixes
// Fix: ({ ... })) -> ({ ... }); })
code = code.replace(/\(\{([^}]+)\}\)\)/g, function(match, content) {
  // Only fix if it's part of a return statement
  if (match.includes('return')) {
    return match;
  }
  return '({' + content + '}); })';
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Parentheses closing patterns fixed!');

// Verify the fix around line 34
console.log('\nChecking around line 34:');
const verifyLines = code.split('\n');
for (let i = 30; i < 38 && i < verifyLines.length; i++) {
  console.log(`${i + 1}: ${verifyLines[i]}`);
}

// Check for any remaining problematic patterns
let remainingIssues = 0;
verifyLines.forEach((line, i) => {
  if (line.trim() === '}))' || (line.includes('}))') && !line.includes('}); })'))) {
    remainingIssues++;
    if (remainingIssues <= 3) {
      console.log(`\n⚠️  Potential issue at line ${i + 1}: ${line.trim()}`);
    }
  }
});

if (remainingIssues > 0) {
  console.log(`\n⚠️  Found ${remainingIssues} potential remaining issues`);
} else {
  console.log('\n✅ No remaining parentheses issues found!');
}