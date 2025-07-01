#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Converting const/let to var...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Convert const to var
console.log('Converting const declarations...');
code = code.replace(/\bconst\s+/g, 'var ');

// Convert let to var
console.log('Converting let declarations...');
code = code.replace(/\blet\s+/g, 'var ');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ const/let conversions complete!');

// Validate
const remainingConst = (code.match(/\bconst\s+/g) || []).length;
const remainingLet = (code.match(/\blet\s+/g) || []).length;

console.log(`\nValidation:`);
console.log(`  const declarations: ${remainingConst}`);
console.log(`  let declarations: ${remainingLet}`);

if (remainingConst > 0 || remainingLet > 0) {
  console.log('\n⚠️  Some declarations might still remain');
}