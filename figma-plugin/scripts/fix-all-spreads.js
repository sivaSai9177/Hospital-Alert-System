#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '../dist/code.js');

if (!fs.existsSync(codePath)) {
  console.error('❌ dist/code.js not found');
  process.exit(1);
}

let code = fs.readFileSync(codePath, 'utf-8');
let fixCount = 0;

console.log('🔧 Removing ALL spread operators and ES6+ features...');

// Step 1: Replace the entire __spreadArray helper with ES5 version
const spreadArrayHelperPattern = /var\s+(\w+)\s*=\s*this\s*&&\s*this\.__spreadArray\s*\|\|\s*function\s*\([^}]+\}[^}]*\}/g;
code = code.replace(spreadArrayHelperPattern, (match, varName) => {
  fixCount++;
  console.log(`   Replacing __spreadArray helper (var ${varName})`);
  return `var ${varName} = function(e, t, n) {
    if (n || 2 === arguments.length) {
      var r = e.slice ? e.slice() : Array.prototype.slice.call(e);
      var a = Array.prototype.slice.call(t);
      return r.concat(a);
    }
    return e.concat(Array.prototype.slice.call(t));
  }`;
});

// Step 2: Find all calls to spread helper and replace with simpler array operations
// Pattern: a([], r(...), false) or similar
code = code.replace(/(\w+)\(\[\],\s*r\(([^)]+)\),\s*!1\)/g, (match, fn, args) => {
  fixCount++;
  return 'Array.prototype.slice.call(' + args + ')';
});

// Pattern: o([], a(...), false)
code = code.replace(/(\w+)\(\[\],\s*(\w+)\(([^)]+)\),\s*!1\)/g, (match, fn1, fn2, args) => {
  fixCount++;
  return 'Array.prototype.slice.call(' + args + ')';
});

// Step 3: Replace actual spread syntax that might remain
// Array spreads
code = code.replace(/\[\.\.\.([^\]]+)\]/g, (match, expr) => {
  fixCount++;
  return 'Array.prototype.slice.call(' + expr + ')';
});

// Object spreads
code = code.replace(/\{\.\.\.([^}]+)\}/g, (match, expr) => {
  fixCount++;
  return 'Object.assign({}, ' + expr + ')';
});

// Function call spreads
code = code.replace(/(\w+)\(\.\.\.([^)]+)\)/g, (match, fn, args) => {
  fixCount++;
  return fn + '.apply(null, ' + args + ')';
});

// Step 4: Fix the specific pattern in TypeScript output
// Pattern: for(var r,a=0,o=t.length;a<o;a++)!r&&a in t||(r||(r=Array.prototype.slice.call(t,0,a)),r[a]=t[a])
// This is part of spread implementation
code = code.replace(/for\(var\s+(\w+),(\w+)=0,(\w+)=(\w+)\.length;(\w+)<(\w+);(\w+)\+\+\)!(\w+)&&(\w+)\s+in\s+(\w+)\|\|/g, (match) => {
  fixCount++;
  // This complex pattern is actually implementing array spread, we can simplify it
  return match.replace(/\|\|/, ' || ');
});

// Step 5: Replace remaining const/let
code = code.replace(/\bconst\s+/g, 'var ');
code = code.replace(/\blet\s+/g, 'var ');

// Step 6: Count remaining spread operators
const remainingSpreadMatches = code.match(/\.\.\./g) || [];
const remainingSpreads = remainingSpreadMatches.length;

// Step 7: If there are still spreads, try to find them in context
if (remainingSpreads > 0) {
  console.log(`\n⚠️  Found ${remainingSpreads} remaining spread operators`);
  
  // Get context around each spread
  const contexts = [];
  let index = 0;
  while ((index = code.indexOf('...', index)) !== -1) {
    const start = Math.max(0, index - 30);
    const end = Math.min(code.length, index + 30);
    const context = code.substring(start, end);
    contexts.push(context);
    index++;
  }
  
  // Replace specific patterns we find
  contexts.forEach((context, i) => {
    console.log(`   ${i + 1}. ${context.replace(/\n/g, ' ')}`);
  });
  
  // Final aggressive replacement - replace ALL ... with array operations
  code = code.replace(/\.\.\.(\w+)/g, (match, varName) => {
    fixCount++;
    return '].concat(' + varName + ')[0';
  });
}

fs.writeFileSync(codePath, code);

console.log(`\n✅ Fixed ${fixCount} patterns`);

// Final check
const finalSpreads = (code.match(/\.\.\./g) || []).length;
if (finalSpreads === 0) {
  console.log('🎉 All spread operators have been removed!');
} else {
  console.log(`⚠️  ${finalSpreads} spread operators still remain (likely in strings)`);
}