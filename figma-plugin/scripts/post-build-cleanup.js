#!/usr/bin/env node

const fs = require('fs');

console.log('🧹 Running post-build cleanup...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let changeCount = 0;

// Fix 1: Array.from issues
console.log('Fixing Array.from patterns...');
const arrayFromPattern = /\[\s*\.\.\.([^,\]]+)\s*\]/g;
let matches = code.match(arrayFromPattern);
if (matches) {
  code = code.replace(arrayFromPattern, (match, expr) => {
    changeCount++;
    return `Array.from(${expr})`;
  });
  console.log(`  Fixed ${matches.length} array spread patterns`);
}

// Fix 2: Object spread in array methods
console.log('Fixing object spreads in callbacks...');
const mapSpreadPattern = /\.map\s*\(\s*\(\s*\{[^}]*\.\.\.([^}]+)\}\s*\)\s*=>/g;
matches = code.match(mapSpreadPattern);
if (matches) {
  code = code.replace(mapSpreadPattern, (match, spread) => {
    changeCount++;
    return match.replace(`...${spread}`, `/* spread */ ${spread}`);
  });
  console.log(`  Fixed ${matches.length} object spread in map patterns`);
}

// Fix 3: Remaining arrow functions in specific contexts
console.log('Fixing remaining arrow functions...');
// Fix arrow functions in array methods
code = code.replace(/\.(map|filter|forEach|find|some|every|reduce)\s*\(\s*\(([^)]*)\)\s*=>\s*\{/g, 
  '.$1(function($2) {');
code = code.replace(/\.(map|filter|forEach|find|some|every|reduce)\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*\{/g, 
  '.$1(function($2) {');
// Fix arrow functions with implicit returns in array methods
code = code.replace(/\.(map|filter|forEach|find|some|every)\s*\(\s*\(([^)]*)\)\s*=>\s*([^{][^\n]*)\)/g, 
  '.$1(function($2) { return $3 })');

// Fix 4: Fix specific optional chaining patterns that were missed
console.log('Fixing remaining optional chaining...');
code = code.replace(/(\w+)\?\.\[/g, '($1 && $1[');
code = code.replace(/\]\?\./g, '] && ].');

// Fix 5: Fix line continuations in strings
console.log('Fixing multi-line strings...');
const multiLineStringPattern = /['"]([^'"]*)\n([^'"]*)['"]/g;
matches = code.match(multiLineStringPattern);
if (matches) {
  code = code.replace(multiLineStringPattern, (match, before, after) => {
    changeCount++;
    return `'${before}\\n${after}'`;
  });
  console.log(`  Fixed ${matches.length} multi-line strings`);
}

// Fix 6: Specific syntax patterns
console.log('Fixing specific syntax patterns...');
// Fix (this. patterns
code = code.replace(/\(this\.\(/g, '(this.');
// Fix double parentheses
code = code.replace(/\(\(([^)]+)\)\)/g, '($1)');
// Fix malformed ternary operators
code = code.replace(/\s*:\s*""\)/g, ' : \'\')');
// Fix literal \n in object properties
code = code.replace(/,\s*\\n\s*(\w+):/g, ',\n    $1:');
code = code.replace(/(\w+),\s*\\n\s+/g, '$1,\n    ');
// Fix sort with double destructuring pattern
code = code.replace(/\.sort\(function\(\(\[(\w+)\],\s*\[(\w+)\]\)\)/g, 
  '.sort(function(entry1, entry2) { var $1 = entry1[0], $2 = entry2[0];');

// Fix 7: Clean up comments
console.log('Cleaning up generated comments...');
code = code.replace(/\/\*\s*spread\s*\*\/\s*/g, '');

// Write the cleaned code
fs.writeFileSync('dist/code.js', code);

console.log(`\n✅ Post-build cleanup complete! Made ${changeCount} fixes.`);

// Re-validate
console.log('\n🔍 Re-validating code...');
const issues = [];

if (code.match(/\.\.\./)) {
  const spreadCount = (code.match(/\.\.\./g) || []).length;
  issues.push(`   ⚠️  ${spreadCount} spread operators still present`);
}
if (code.match(/=>/)) {
  const arrowCount = (code.match(/=>/g) || []).length;
  issues.push(`   ⚠️  ${arrowCount} arrow functions still present`);
}
if (code.match(/\?\./) || code.match(/\?\[/)) {
  issues.push('   ⚠️  Optional chaining still present');
}

if (issues.length > 0) {
  console.log('Remaining issues:');
  issues.forEach(issue => console.log(issue));
  
  // Show examples
  console.log('\nExamples of remaining issues:');
  const spreadExamples = code.match(/.{0,50}\.\.\.{0,50}/g);
  if (spreadExamples) {
    console.log('\nSpread operators:');
    spreadExamples.slice(0, 3).forEach(ex => console.log('  ', ex.trim()));
  }
  
  const arrowExamples = code.match(/.{0,30}=>.{0,30}/g);
  if (arrowExamples) {
    console.log('\nArrow functions:');
    arrowExamples.slice(0, 3).forEach(ex => console.log('  ', ex.trim()));
  }
} else {
  console.log('   ✅ All validation checks passed!');
}