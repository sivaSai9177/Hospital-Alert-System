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

console.log('🔧 Fixing TypeScript helper functions...');

// Replace __spreadArray helper with ES5 compatible version
const spreadArrayPattern = /var\s+a\s*=\s*this\s*&&\s*this\.__spreadArray\s*\|\|\s*function\s*\([^}]+\}[^}]+\}/g;
code = code.replace(spreadArrayPattern, (match) => {
  fixCount++;
  return `var a = function(e, t, n) {
    if (n || 2 === arguments.length) {
      for (var r, a = 0, o = t.length; a < o; a++) {
        if (!r && a in t) {
          if (!r) r = Array.prototype.slice.call(t, 0, a);
          r[a] = t[a];
        }
      }
    }
    return e.concat(r || Array.prototype.slice.call(t));
  }`;
});

// Replace spread syntax in function body
// Pattern: a([], r(...), false)
code = code.replace(/a\(\[\],\s*r\(([^)]+)\),\s*!1\)/g, (match, args) => {
  fixCount++;
  return 'Array.prototype.slice.call(' + args + ')';
});

// Replace __spreadArray calls
code = code.replace(/o\(\[\],\s*a\(([^)]+)\),\s*!1\)/g, (match, args) => {
  fixCount++;
  return 'Array.prototype.slice.call(' + args + ')';
});

// Replace spread in concat operations
code = code.replace(/\.concat\(r\s*\|\|\s*Array\.prototype\.slice\.call\(t\)\)/g, (match) => {
  fixCount++;
  return '.concat(t)';
});

// Remove any remaining ... operators by context
// In arrays: [...x] -> [].concat(x)
code = code.replace(/\[\.\.\.([^\]]+)\]/g, (match, expr) => {
  fixCount++;
  return '[].concat(' + expr + ')';
});

// In objects: {...x} -> Object.assign({}, x)
code = code.replace(/\{\.\.\.([^}]+)\}/g, (match, expr) => {
  fixCount++;
  return 'Object.assign({}, ' + expr + ')';
});

// In function calls: f(...x) -> f.apply(null, x)
code = code.replace(/(\w+)\(\.\.\.([^)]+)\)/g, (match, fn, args) => {
  fixCount++;
  return fn + '.apply(null, ' + args + ')';
});

// Fix the specific pattern causing issues
// Pattern: for(var r,a=0,o=t.length;a<o;a++)!r&&a in t||(r||(r=Array.prototype.slice.call(t,0,a)),r[a]=t[a])
// This is actually a spread implementation, but it uses ... syntax somewhere
code = code.replace(/!r&&a in t\|\|/g, (match) => {
  fixCount++;
  return '(!r && a in t) || ';
});

fs.writeFileSync(codePath, code);

console.log(`✅ Fixed ${fixCount} TypeScript helper patterns`);

// Check if we still have spread operators
const spreadCount = (code.match(/\.\.\./g) || []).length;
if (spreadCount > 0) {
  console.log(`⚠️  ${spreadCount} spread operators still remain`);
  
  // Find and show examples
  const matches = code.match(/.{0,50}\.\.\.{0,50}/g);
  if (matches && matches.length > 0) {
    console.log('\nExamples of remaining spreads:');
    matches.slice(0, 5).forEach((m, i) => {
      console.log(`  ${i + 1}. ...${m.split('...')[1]}...`);
    });
  }
}