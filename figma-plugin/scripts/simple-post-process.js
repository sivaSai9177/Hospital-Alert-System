#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../dist/code.js');
console.log('🔧 Post-processing ES5 output with regex transforms...');

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
let changeCount = 0;

// Track changes
function transform(pattern, replacement, description) {
  const before = content.length;
  content = content.replace(pattern, replacement);
  const after = content.length;
  if (before !== after) {
    changeCount++;
    console.log(`  ✓ ${description}`);
  }
}

// 1. Replace const/let with var
transform(/\b(const|let)\s+/g, 'var ', 'Replaced const/let with var');

// 2. Replace arrow functions - more comprehensive patterns
// Single parameter arrow functions
transform(/(\w+)\s*=>\s*\{/g, 'function($1) {', 'Replaced single param arrow functions');
transform(/(\w+)\s*=>\s*([^{])/g, 'function($1) { return $2', 'Replaced expression arrows');

// Multi-parameter arrow functions
transform(/\(([^)]*)\)\s*=>\s*\{/g, 'function($1) {', 'Replaced multi-param arrow functions');
transform(/\(([^)]*)\)\s*=>\s*([^{])/g, 'function($1) { return $2', 'Replaced multi-param expression arrows');

// 3. Replace template literals
content = content.replace(/`([^`]*)`/g, function(match, p1) {
  changeCount++;
  if (p1.includes('${')) {
    // Handle ${} interpolations
    return '"' + p1.replace(/\$\{([^}]+)\}/g, '" + ($1) + "') + '"';
  }
  return '"' + p1.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
});

// 4. Replace spread operators - more comprehensive patterns
// Array spreads: [...arr]
transform(/\[\s*\.\.\.([^\]]+)\]/g, 'Array.prototype.slice.call($1)', 'Replaced array spreads');

// Function call spreads: func(...args)
transform(/(\w+)\(\s*\.\.\.([^)]+)\)/g, '$1.apply(null, $2)', 'Replaced function spreads');

// Object spreads: {...obj}
transform(/\{\s*\.\.\.([^}]+)\}/g, 'Object.assign({}, $1)', 'Replaced object spreads');

// TypeScript __spreadArray helper uses spread syntax - replace it
content = content.replace(/\.concat\(([^)]+)\.\.\.([^)]+)\)/g, '.concat($1, $2)');
content = content.replace(/\[([^,\]]+),\s*\.\.\.([^\]]+)\]/g, '[$1].concat($2)');
content = content.replace(/\.\.\.Array\.prototype\.slice\.call/g, 'Array.prototype.slice.call');

// More spread patterns
transform(/\.push\(\.\.\.([^)]+)\)/g, '.push.apply(this, $1)', 'Replaced push spreads');
transform(/\.unshift\(\.\.\.([^)]+)\)/g, '.unshift.apply(this, $1)', 'Replaced unshift spreads');
transform(/\.concat\(\.\.\.([^)]+)\)/g, '.concat.apply([], $1)', 'Replaced concat spreads');

// 5. Replace async/await
transform(/\basync\s+function/g, 'function', 'Removed async from functions');
transform(/\basync\s+\(/g, 'function(', 'Replaced async arrows');
transform(/\bawait\s+/g, '', 'Removed await keywords');

// 6. Replace optional chaining
transform(/(\w+)\?\./g, '($1 && $1.', 'Replaced optional chaining');

// 7. Replace class declarations (simple conversion)
transform(/\bclass\s+(\w+)\s*\{/g, 'function $1() {}; $1.prototype = {', 'Replaced class declarations');
transform(/\bclass\s+(\w+)\s+extends\s+(\w+)\s*\{/g, 'function $1() { $2.call(this); }; $1.prototype = Object.create($2.prototype); $1.prototype.constructor = $1;', 'Replaced class with extends');

// 8. Fix escaped script tags
transform(/<\\\/script>/g, '<" + "/script>', 'Fixed escaped script tags');

// 9. Replace remaining ES6+ patterns
// for...of loops
transform(/\bfor\s*\(\s*(?:var|let|const)\s+(\w+)\s+of\s+([^)]+)\)/g, 
  'for (var $1_i = 0; $1_i < $2.length; $1_i++) { var $1 = $2[$1_i];', 
  'Replaced for...of loops');

// 10. Final pass for any remaining spreads - more aggressive
// This catches spreads that might be in complex expressions
content = content.replace(/\.\.\.(\w+)/g, function(match, varName) {
  changeCount++;
  // Context-aware replacement
  const beforeMatch = content.substring(Math.max(0, content.indexOf(match) - 10), content.indexOf(match));
  const afterMatch = content.substring(content.indexOf(match) + match.length, Math.min(content.length, content.indexOf(match) + match.length + 10));
  
  if (beforeMatch.includes('[') || beforeMatch.includes(',')) {
    // Likely in array context
    return 'Array.prototype.slice.call(' + varName + ')';
  } else if (beforeMatch.includes('(')) {
    // Likely in function call
    return varName;
  } else {
    // Default to array slice
    return 'Array.prototype.slice.call(' + varName + ')';
  }
});

// 11. Ensure IIFE wrapper
if (!content.trim().startsWith('(function')) {
  content = '(function() {\n"use strict";\n' + content + '\n})();';
  changeCount++;
  console.log('  ✓ Added IIFE wrapper');
}

// Write the processed content
fs.writeFileSync(filePath, content);

// Validate the result
const es6Patterns = {
  'arrow functions': /=>/g,
  'const declarations': /\bconst\s+/g,
  'let declarations': /\blet\s+/g,
  'template literals': /`[^`]*`/g,
  'spread operators': /\.\.\.(?!\s*\})/g,
  'class declarations': /\bclass\s+/g,
  'async/await': /\basync\s+|await\s+/g,
  'optional chaining': /\?\./g,
  'for...of loops': /\bfor\s*\([^)]*\bof\b/g,
};

let remainingIssues = 0;
const remaining = {};

for (const [feature, pattern] of Object.entries(es6Patterns)) {
  const matches = content.match(pattern);
  if (matches && matches.length > 0) {
    remaining[feature] = matches.length;
    remainingIssues += matches.length;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  - Total transformations: ${changeCount}`);
console.log(`  - Remaining ES6+ issues: ${remainingIssues}`);

if (remainingIssues > 0) {
  console.log('\n⚠️  Remaining ES6+ features:');
  for (const [feature, count] of Object.entries(remaining)) {
    console.log(`  - ${feature}: ${count}`);
  }
} else {
  console.log('\n🎉 All ES6+ features have been transpiled to ES5!');
}