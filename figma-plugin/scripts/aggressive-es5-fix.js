#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../dist/code.js');
console.log('🔧 Aggressive ES5 fix - removing ALL spread operators...');

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
let fixCount = 0;

// First, let's identify the minified variable names used in helpers
// TypeScript helpers often use minified names like a, r, o, etc.

// Pattern 1: Fix minified spread array helper calls
// Common pattern: a([],r(something),!1) or o([],a(something),!1)
content = content.replace(/([a-z])\(\[\],\s*([a-z])\(([^)]+)\),\s*!1\)/g, function(match, func1, func2, args) {
  fixCount++;
  return 'Array.prototype.slice.call(' + args + ')';
});

// Pattern 2: Fix spread in return statements
// return e.concat(r||Array.prototype.slice.call(t))
content = content.replace(/\.concat\(([a-z])\s*\|\|\s*Array\.prototype\.slice\.call\(([^)]+)\)\)/g, function(match, var1, var2) {
  fixCount++;
  return '.concat(Array.prototype.slice.call(' + var2 + '))';
});

// Pattern 3: Replace ALL remaining ... patterns
// This is aggressive but necessary
content = content.replace(/\.\.\.([a-zA-Z_$][\w$]*)/g, function(match, varName) {
  fixCount++;
  // Try to determine context by looking around
  const index = content.indexOf(match);
  const before = content.substring(Math.max(0, index - 20), index);
  const after = content.substring(index + match.length, Math.min(content.length, index + match.length + 20));
  
  // If in array context [...]
  if (before.match(/\[\s*$/) || before.match(/,\s*$/)) {
    return 'Array.prototype.slice.call(' + varName + ')';
  }
  // If in function call context func(...)
  else if (before.match(/\(\s*$/) || before.match(/,\s*$/)) {
    return varName; // Just remove the spread
  }
  // If in object context {...}
  else if (before.match(/\{\s*$/)) {
    return 'Object.assign({}, ' + varName + ')';
  }
  // Default to array slice
  else {
    return 'Array.prototype.slice.call(' + varName + ')';
  }
});

// Pattern 4: Fix any remaining arrow functions
content = content.replace(/(\w+)\s*=>\s*\{/g, 'function($1) {');
content = content.replace(/\(\s*([^)]*)\s*\)\s*=>\s*\{/g, 'function($1) {');
content = content.replace(/(\w+)\s*=>\s*([^{])/g, 'function($1) { return $2'); 
content = content.replace(/\(\s*([^)]*)\s*\)\s*=>\s*([^{])/g, 'function($1) { return $2');

// Pattern 5: Fix class declarations
content = content.replace(/\bclass\s+(\w+)\s*\{/g, 'function $1() {}; $1.prototype = {');
content = content.replace(/\bclass\s+(\w+)\s+extends\s+(\w+)\s*\{/g, 
  'function $1() { $2.call(this); }; $1.prototype = Object.create($2.prototype); $1.prototype.constructor = $1;');

// Pattern 6: Fix async/await (remove them)
content = content.replace(/\basync\s+function/g, 'function');
content = content.replace(/\basync\s+/g, '');
content = content.replace(/\bawait\s+/g, '');

// Pattern 7: Fix optional chaining more aggressively
content = content.replace(/(\w+)\?\./g, '($1 && $1.');
content = content.replace(/\]\?\./g, '] && obj.');

// Pattern 8: Fix specific minified patterns that might contain spreads
// These are common in minified TypeScript output
content = content.replace(/!([a-z])&&([a-z]) in ([a-z])\|\|/g, '(!$1 && $2 in $3) || ');
content = content.replace(/([a-z])=([a-z])\|\|\[\]/g, '$1 = $2 || []');

// Pattern 9: Fix concat patterns that might have spreads
content = content.replace(/\.concat\(([^)]+)\.\.\.([^)]+)\)/g, '.concat($1, $2)');

// Pattern 10: Final cleanup - remove any isolated ...
content = content.replace(/\.\.\.(?=\s|;|,|\)|]|})/g, '');

// Write the result
fs.writeFileSync(filePath, content);

// Final validation
const remainingSpreads = (content.match(/\.\.\./g) || []).length;
const remainingArrows = (content.match(/=>/g) || []).length;
const remainingClasses = (content.match(/\bclass\s+/g) || []).length;
const remainingAsync = (content.match(/\basync\s+/g) || []).length;

console.log(`\n📊 Fix Summary:`);
console.log(`  - Total fixes applied: ${fixCount}`);
console.log(`  - Remaining spread operators: ${remainingSpreads}`);
console.log(`  - Remaining arrow functions: ${remainingArrows}`);
console.log(`  - Remaining classes: ${remainingClasses}`);
console.log(`  - Remaining async/await: ${remainingAsync}`);

if (remainingSpreads === 0 && remainingArrows === 0 && remainingClasses === 0 && remainingAsync === 0) {
  console.log('\n🎉 All ES6+ features have been removed!');
} else {
  console.log('\n⚠️  Some ES6+ features still remain');
}