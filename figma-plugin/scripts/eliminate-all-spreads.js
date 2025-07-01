#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../dist/code.js');
console.log('🔥 Eliminating ALL spread operators...');

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
const originalLength = content.length;

// First, let's see what spreads we have
const spreadMatches = content.match(/\.\.\.[a-zA-Z_$][\w$]*/g) || [];
console.log(`Found ${spreadMatches.length} spread operators`);

// Strategy: Replace all spreads based on their context
// We'll use multiple passes to ensure we catch everything

// Pass 1: Replace spreads in minified TypeScript helpers
// Pattern: a([],r(e),!1) where a is __spreadArray
content = content.replace(/([a-z])\(\[\],([a-z])\(([^)]+)\),!1\)/g, 'Array.prototype.slice.call($3)');

// Pass 2: Replace spreads in array literals
// [...x] -> Array.prototype.slice.call(x)
content = content.replace(/\[\s*\.\.\.([a-zA-Z_$][\w$]*)\s*\]/g, 'Array.prototype.slice.call($1)');

// Pass 3: Replace spreads in array concatenation
// [x, ...y] -> [x].concat(y)
content = content.replace(/\[([^,\]]+),\s*\.\.\.([a-zA-Z_$][\w$]*)\s*\]/g, '[$1].concat($2)');

// Pass 4: Replace spreads in function calls
// func(...args) -> func.apply(null, args)
content = content.replace(/([a-zA-Z_$][\w$]*)\(\s*\.\.\.([a-zA-Z_$][\w$]*)\s*\)/g, '$1.apply(null, $2)');

// Pass 5: Replace spreads in object literals (shouldn't be many)
// {...obj} -> Object.assign({}, obj)
content = content.replace(/\{\s*\.\.\.([a-zA-Z_$][\w$]*)\s*\}/g, 'Object.assign({}, $1)');

// Pass 6: Handle complex spread patterns in minified code
// Pattern: r||Array.prototype.slice.call(t)
// This is actually correct ES5, but let's make sure the spread before it is handled
content = content.replace(/\.\.\.Array\.prototype\.slice\.call/g, 'Array.prototype.slice.call');

// Pass 7: Replace remaining spreads by looking at context
let previousLength = content.length;
do {
  previousLength = content.length;
  
  // Generic spread replacement
  content = content.replace(/\.\.\.([a-zA-Z_$][\w$]*)/g, function(match, varName, offset) {
    // Look at what comes before
    const before = content.substring(Math.max(0, offset - 10), offset);
    
    // Check if we're in a string
    let inString = false;
    let quoteCount = 0;
    for (let i = 0; i < offset; i++) {
      if (content[i] === '"' && (i === 0 || content[i-1] !== '\\')) {
        quoteCount++;
      }
    }
    inString = quoteCount % 2 === 1;
    
    if (inString) {
      return match; // Don't replace if in string
    }
    
    // Array context
    if (before.match(/\[\s*$/) || before.match(/,\s*$/)) {
      return 'Array.prototype.slice.call(' + varName + ')';
    }
    // Function context
    else if (before.match(/\(\s*$/)) {
      return varName; // Just remove the spread
    }
    // Object context
    else if (before.match(/\{\s*$/)) {
      return 'Object.assign({}, ' + varName + ')';
    }
    // Default: assume array
    else {
      return 'Array.prototype.slice.call(' + varName + ')';
    }
  });
} while (content.length !== previousLength);

// Pass 8: Final cleanup - remove any bare ... that might remain
content = content.replace(/\.\.\.(?=[^a-zA-Z_$])/g, '');

// Write the result
fs.writeFileSync(filePath, content);

// Validation
const finalSpreads = (content.match(/\.\.\./g) || []).length;
const reduction = ((originalLength - content.length) / originalLength * 100).toFixed(2);

console.log('\n📊 Results:');
console.log(`  - Original spreads: ${spreadMatches.length}`);
console.log(`  - Remaining spreads: ${finalSpreads}`);
console.log(`  - File size change: ${reduction}% reduction`);

if (finalSpreads === 0) {
  console.log('\n✅ Success! All spread operators have been eliminated.');
} else {
  console.log(`\n⚠️  ${finalSpreads} spread operators remain.`);
  
  // Show where they are
  const remainingMatches = content.match(/.{0,30}\.\.\..{0,30}/g);
  if (remainingMatches) {
    console.log('\nRemaining spreads:');
    remainingMatches.slice(0, 5).forEach((match, i) => {
      console.log(`  ${i + 1}. "${match.trim()}"`);
    });
  }
}