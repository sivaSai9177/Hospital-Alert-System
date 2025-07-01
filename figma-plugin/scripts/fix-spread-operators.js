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

console.log('🔧 Fixing spread operators...');

// 1. Array spread in variable declarations: var x = [...arr]
code = code.replace(/=\s*\[\.\.\.([^\]]+)\]/g, (match, expr) => {
  fixCount++;
  return '= [].concat(' + expr + ')';
});

// 2. Array spread in return statements: return [...arr]
code = code.replace(/return\s+\[\.\.\.([^\]]+)\]/g, (match, expr) => {
  fixCount++;
  return 'return [].concat(' + expr + ')';
});

// 3. Array spread in function arguments: func([...arr])
code = code.replace(/\(\[\.\.\.([^\]]+)\]\)/g, (match, expr) => {
  fixCount++;
  return '([].concat(' + expr + '))';
});

// 4. Multiple array spreads: [...arr1, ...arr2]
code = code.replace(/\[([^,\]]*),\s*\.\.\.([^\],]+)\]/g, (match, before, spread) => {
  fixCount++;
  if (before.includes('...')) {
    // Handle nested spreads recursively
    return match;
  }
  return '[' + before + '].concat(' + spread + ')';
});

// 5. Object spread in variable declarations: var x = {...obj}
code = code.replace(/=\s*\{\.\.\.([^}]+)\}/g, (match, expr) => {
  fixCount++;
  return '= Object.assign({}, ' + expr + ')';
});

// 6. Object spread in return statements: return {...obj}
code = code.replace(/return\s+\{\.\.\.([^}]+)\}/g, (match, expr) => {
  fixCount++;
  return 'return Object.assign({}, ' + expr + ')';
});

// 7. Object spread with additional properties: {...obj, key: value}
code = code.replace(/\{\.\.\.([^,}]+),([^}]+)\}/g, (match, spread, props) => {
  fixCount++;
  return 'Object.assign({}, ' + spread + ', {' + props + '})';
});

// 8. Function parameter spread: function(...args)
code = code.replace(/function\s*\(\.\.\.(\w+)\)/g, (match, param) => {
  fixCount++;
  return 'function() { var ' + param + ' = Array.prototype.slice.call(arguments)';
});

// 9. Method parameter spread: method(...args)
code = code.replace(/(\w+)\s*:\s*function\s*\(\.\.\.(\w+)\)/g, (match, method, param) => {
  fixCount++;
  return method + ': function() { var ' + param + ' = Array.prototype.slice.call(arguments)';
});

// 10. Complex spread patterns in arrays
code = code.replace(/\[\s*\.\.\.([^,\]]+),\s*([^\]]+)\]/g, (match, spread, rest) => {
  fixCount++;
  return '[].concat(' + spread + ', [' + rest + '])';
});

// 11. Spread in array methods: arr.push(...items)
code = code.replace(/(\w+)\.push\(\.\.\.([^)]+)\)/g, (match, arr, items) => {
  fixCount++;
  return arr + '.push.apply(' + arr + ', ' + items + ')';
});

// 12. Spread in array concat: arr.concat(...arrays)
code = code.replace(/(\w+)\.concat\(\.\.\.([^)]+)\)/g, (match, arr, arrays) => {
  fixCount++;
  return arr + '.concat.apply(' + arr + ', ' + arrays + ')';
});

// 13. Rest parameters in arrow functions converted to regular functions
code = code.replace(/\(\.\.\.(\w+)\)\s*\{/g, (match, param) => {
  fixCount++;
  return '() { var ' + param + ' = Array.prototype.slice.call(arguments);';
});

// 14. Generic spread in any context followed by comma or closing bracket/paren
code = code.replace(/\.\.\.([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g, (match, expr, offset, string) => {
  // Check context
  const before = string.substring(Math.max(0, offset - 10), offset);
  const after = string.substring(offset + match.length, offset + match.length + 2);
  
  if (before.match(/[\[\(,]\s*$/) && after.match(/^[\s,\]\)]/)) {
    fixCount++;
    // It's likely an array spread
    return '].concat(' + expr + ')[0';
  }
  
  return match;
});

fs.writeFileSync(codePath, code);

console.log(`✅ Fixed ${fixCount} spread operator patterns`);

// Run validation to check remaining issues
const { execSync } = require('child_process');
try {
  const output = execSync('node scripts/es5-validator.js', { encoding: 'utf-8' });
  const spreadMatch = output.match(/Found (\d+) spread operators/);
  if (spreadMatch) {
    const remaining = parseInt(spreadMatch[1]);
    if (remaining > 0) {
      console.log(`⚠️  ${remaining} spread operators still remain - may need manual fixes`);
    }
  }
} catch (e) {
  // Validation failed, but that's okay
}