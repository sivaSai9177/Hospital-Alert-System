#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Comprehensive ES5 fix...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Step 1: Fix __esm function
console.log('1. Fixing __esm function...');
code = code.replace(/var __esm = \(fn, res\) => \(\) => \(fn && \(res = fn\(fn = 0\)\), res\);/g,
  'var __esm = function(fn, res) { return function() { return (fn && (res = fn(fn = 0)), res); }; };');

// Step 2: Fix all arrow functions
console.log('2. Converting arrow functions...');
// Multi-line arrow functions
code = code.replace(/(\w+)\s*=>\s*\{/g, 'function($1) {');
code = code.replace(/\(\s*\)\s*=>\s*\{/g, 'function() {');
code = code.replace(/\(([^)]+)\)\s*=>\s*\{/g, 'function($1) {');

// Single expression arrow functions
code = code.replace(/(\w+)\s*=>\s*([^{])/g, 'function($1) { return $2');
code = code.replace(/\(\s*\)\s*=>\s*([^{])/g, 'function() { return $1');
code = code.replace(/\(([^)]+)\)\s*=>\s*([^{])/g, 'function($1) { return $2');

// Step 3: Fix destructuring in map/forEach/filter
console.log('3. Fixing array method destructuring...');
// Fix patterns that have been converted to function(([destructuring])
code = code.replace(/\.map\(function\(\(\[(\w+),\s*(\w+)\]\)\)/g, 
  '.map(function(arr) { var $1 = arr[0], $2 = arr[1];');
code = code.replace(/\.forEach\(function\(\(\[(\w+),\s*(\w+)\]\)\)/g, 
  '.forEach(function(arr) { var $1 = arr[0], $2 = arr[1];');
code = code.replace(/\.filter\(function\(\(\[(\w+),\s*(\w+)\]\)\)/g, 
  '.filter(function(arr) { var $1 = arr[0], $2 = arr[1];');
// Fix sort with destructuring like sort(([a], [b]) =>
code = code.replace(/\.sort\(\(\[(\w+)\],\s*\[(\w+)\]\)\s*=>\s*/g, 
  '.sort(function(arr1, arr2) { var $1 = arr1[0], $2 = arr2[0]; return ');
// Also fix if already converted to function syntax
code = code.replace(/\.sort\(function\(\(\[(\w+)\],\s*\[(\w+)\]\)\)/g, 
  '.sort(function(arr1, arr2) { var $1 = arr1[0], $2 = arr2[0];');
// Fix patterns with object destructuring in arrays like [width, { frames: frames2 }]
code = code.replace(/\.forEach\(\(\[(\w+),\s*\{\s*(\w+):\s*(\w+)\s*\}\]\)/g, 
  '.forEach(function(arr) { var $1 = arr[0], $3 = arr[1].$2;');
// Original patterns for arrow functions
code = code.replace(/\.map\(\(\[(\w+),\s*(\w+)\]\)\s*=>\s*\(\{/g, 
  '.map(function(arr) { var $1 = arr[0], $2 = arr[1]; return {');
code = code.replace(/\.map\(\(\[(\w+),\s*(\w+)\]\)\s*=>\s*\{/g, 
  '.map(function(arr) { var $1 = arr[0], $2 = arr[1]; return {');
code = code.replace(/\.forEach\(\(\[(\w+),\s*(\w+)\]\)\s*=>\s*/g, 
  '.forEach(function(arr) { var $1 = arr[0], $2 = arr[1]; ');

// Step 4: Fix template literals
console.log('4. Converting template literals...');
code = code.replace(/`([^`]*)`/g, function(match, content) {
  if (!content.includes('${')) {
    return "'" + content.replace(/'/g, "\\'") + "'";
  }
  
  // Handle template literals with expressions
  let result = content;
  result = result.replace(/\$\{([^}]+)\}/g, "' + ($1) + '");
  result = "'" + result + "'";
  result = result.replace(/^'' \+ /, '');
  result = result.replace(/ \+ ''$/, '');
  return result;
});

// Step 5: Fix object shorthand
console.log('5. Fixing object shorthand...');
code = code.replace(/\{\s*(\w+),\s*(\w+):/g, '{ $1: $1, $2:');
code = code.replace(/,\s*(\w+),\s*(\w+):/g, ', $1: $1, $2:');
code = code.replace(/,\s*(\w+)\s*\}/g, ', $1: $1 }');
code = code.replace(/\{\s*(\w+)\s*\}/g, '{ $1: $1 }');

// Step 6: Fix spread operators
console.log('6. Converting spread operators...');
// Object spread
code = code.replace(/\{\s*\.\.\.(\w+),/g, 'Object.assign({}, $1, {');
code = code.replace(/,\s*\.\.\.(\w+)\s*\}/g, '}, $1)');
// Array spread
code = code.replace(/\[\.\.\.([^\]]+)\]/g, 'Array.from($1)');

// Step 7: Fix optional chaining
console.log('7. Converting optional chaining...');
code = code.replace(/(\w+)\?\./g, '($1 && $1.');

// Step 8: Fix nullish coalescing
console.log('8. Converting nullish coalescing...');
code = code.replace(/(\w+)\s*\?\?\s*/g, '($1 != null ? $1 : ');

// Step 9: Remove escaped newlines
console.log('9. Removing escaped newlines...');
code = code.replace(/\\n/g, function(match, offset) {
  // Check if we're in a string
  const before = code.substring(Math.max(0, offset - 20), offset);
  const after = code.substring(offset, Math.min(code.length, offset + 20));
  if ((before.includes('"') || before.includes("'")) && 
      (after.includes('"') || after.includes("'"))) {
    return match; // Keep \n in strings
  }
  return ' '; // Replace with space outside strings
});

// Step 10: Fix auth/api fields
console.log('10. Fixing object field declarations...');
const fieldsToFix = ['auth', 'api', 'mcp', 'figma', 'system', 'ws'];
fieldsToFix.forEach(field => {
  const regex = new RegExp(`^(\\s*)${field}\\s*=\\s*\\{`, 'gm');
  code = code.replace(regex, `$1// ${field} = { // Field moved to constructor`);
});

// Step 11: Final cleanup
console.log('11. Final cleanup...');
code = code.replace(/\)\)\);/g, ')); });');
code = code.replace(/\}\)\);/g, '}); });');
// Fix any remaining destructuring patterns
code = code.replace(/function\(\(\[(\w+)\],\s*\[(\w+)\]\)\)/g, 
  'function(arr1, arr2) { var $1 = arr1[0], $2 = arr2[0];');
// Remove any literal \n in values
code = code.replace(/:\s*'([^']*?)\\n([^']*?)'/g, ": '$1 $2'");
code = code.replace(/:\s*"([^"]*?)\\n([^"]*?)"/g, ': "$1 $2"');
// Remove \n in object definitions
code = code.replace(/\{([^}]*?)\\n([^}]*?)\}/g, function(match, before, after) {
  // Only replace if not in a string
  if (!match.includes('"') && !match.includes("'")) {
    return '{' + before + ', ' + after + '}';
  }
  return '{' + before.replace(/\\n/g, ' ') + after.replace(/\\n/g, ' ') + '}';
});
// More aggressive \n removal - replace all literal \n that aren't in strings
code = code.replace(/([^"'])\\n([^"'])/g, '$1 $2');

// Step 12: Fix quote mismatches
console.log('12. Fixing quote mismatches...');
// Fix specific patterns where quotes are mismatched
// Pattern: '0" should be '0'
code = code.replace(/:\s*'(\d+(\.\d+)?)"/g, ": '$1'");
// Pattern: "value' should be 'value'
code = code.replace(/:\s*"([^"']+)'/g, ": '$1'");
// Don't do blanket replacements that might break valid mixed quotes
code = code.replace(/'([\w-]+)":\s*"([^'"]+)'/g, "'$1': '$2'");
// Fix patterns like '0%": should be '0%':
code = code.replace(/'(\d+%)":/g, "'$1':");
// Fix patterns like '0%, 100%": should be '0%, 100%':
code = code.replace(/'([^'"]+)":/g, "'$1':");
// Fix patterns like opacity: '0" should be opacity: '0'
code = code.replace(/:\s*'([^'"]+)"/g, ": '$1'");

// Final quote consistency pass
console.log('Final quote consistency check...');
// Fix remaining mismatched quotes in comparisons and method calls
code = code.replace(/===\s*'([^'"]+)"/g, "=== '$1'");
code = code.replace(/!==\s*'([^'"]+)"/g, "!== '$1'");
code = code.replace(/===\s*"([^'"]+)'/g, '=== "$1"');
code = code.replace(/!==\s*"([^'"]+)'/g, '!== "$1"');
code = code.replace(/\.includes\("([^'"]+)'/g, '.includes("$1")');
code = code.replace(/\.includes\('([^'"]+)"/g, ".includes('$1')");

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Comprehensive ES5 fix complete!');

// Validate
const issues = [];
if (code.includes('=>')) issues.push('Arrow functions');
if (code.includes('...')) issues.push('Spread operators');
if (code.includes('`')) issues.push('Template literals');
if (code.includes('?.')) issues.push('Optional chaining');
if (code.includes('??')) issues.push('Nullish coalescing');

if (issues.length > 0) {
  console.log('\n⚠️  Remaining issues:', issues.join(', '));
} else {
  console.log('\n🎉 All ES5 compatibility issues resolved!');
}