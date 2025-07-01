#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing remaining spread operators...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix spread in ternary operations
console.log('Fixing spread in conditional arrays...');
// Pattern: ...condition ? [...] : [...]
code = code.replace(/\.\.\.(\w+\.?\w*)\s*===\s*'([^']+)'\s*\?\s*\[/g, function(match, variable, value) {
  return `].concat(${variable} === '${value}' ? [`;
});

// Fix spread in map results
console.log('Fixing spread in map results...');
// Pattern: ...this.queue.map(
code = code.replace(/\.\.\.(this\.\w+)\.map\(/g, '].concat($1.map(');

// Pattern: ...Array.from(
code = code.replace(/\.\.\.Array\.from\(/g, '].concat(Array.from(');

// Fix spread in object properties
console.log('Fixing spread in objects...');
// Pattern: ...msg.data in object literal
code = code.replace(/,\s*\.\.\.(msg\.data)/g, function(match, prop) {
  return '); Object.assign(result, ' + prop + '); result';
});

// Fix spread operator patterns in general
// Convert [...array] to Array.from(array)
code = code.replace(/\[\s*\.\.\.([\w.]+)\s*\]/g, 'Array.from($1)');

// Convert { ...obj } to Object.assign({}, obj)
code = code.replace(/\{\s*\.\.\.([\w.]+)\s*\}/g, 'Object.assign({}, $1)');

// Convert { prop, ...obj } to Object.assign({ prop: prop }, obj)
code = code.replace(/\{\s*([\w]+):\s*([\w.]+),\s*\.\.\.([\w.]+)\s*\}/g, 'Object.assign({ $1: $2 }, $3)');

// Fix array concatenation patterns
// If we have patterns like const arr = [...someArray, ...otherArray]
code = code.replace(/=\s*\[\s*\.\.\.([\w.]+),\s*\.\.\.([\w.]+)\s*\]/g, '= $1.concat($2)');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Remaining spread operators fixed!');

// Validate
const remainingSpread = (code.match(/\.\.\./g) || []).length;
const remainingArrows = (code.match(/=>/g) || []).length;

console.log(`\nValidation:`);
console.log(`  Spread operators: ${remainingSpread}`);
console.log(`  Arrow functions: ${remainingArrows}`);

if (remainingSpread > 0) {
  // Show some examples
  const examples = code.match(/.{0,50}\.\.\..{0,50}/g) || [];
  console.log('\nRemaining spread examples:');
  examples.slice(0, 5).forEach(ex => {
    if (!ex.includes('console.') && !ex.includes("'...") && !ex.includes('"...')) {
      console.log('  ', ex.trim());
    }
  });
}