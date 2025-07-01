#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../dist/code.js');
console.log('🔥 Final ES6+ cleanup...');

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Find and log what we're dealing with
console.log('Searching for ES6+ patterns...');

// 1. Remove any remaining arrow functions
// The pattern '=>' might be in code context
const arrowMatches = content.match(/[^"'`]=>(?![^"'`]*["'`])/g) || [];
if (arrowMatches.length > 0) {
  console.log(`Found ${arrowMatches.length} arrow functions outside strings`);
  
  // Replace arrow functions more aggressively
  content = content.replace(/(\})(\s*)(=>)(\s*)(\{)/g, '$1$2function()$4$5');
  content = content.replace(/([a-zA-Z_$][\w$]*)\s*=>\s*\{/g, 'function($1){');
  content = content.replace(/\(\s*([^)]*)\s*\)\s*=>\s*\{/g, 'function($1){');
  content = content.replace(/([a-zA-Z_$][\w$]*)\s*=>\s*/g, 'function($1){return ');
  content = content.replace(/\(\s*([^)]*)\s*\)\s*=>\s*/g, 'function($1){return ');
}

// 2. Remove async/await
content = content.replace(/\basync\s+function/g, 'function');
content = content.replace(/\basync\s+/g, '');
content = content.replace(/\bawait\s+/g, '');

// 3. Ensure no template literals
content = content.replace(/`([^`]*)`/g, function(match, p1) {
  if (p1.includes('${')) {
    return '"' + p1.replace(/\$\{([^}]+)\}/g, '" + ($1) + "') + '"';
  }
  return '"' + p1.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
});

// 4. Final validation
const finalChecks = {
  arrows: (content.match(/=>/g) || []).length,
  async: (content.match(/\basync\s+/g) || []).length,
  await: (content.match(/\bawait\s+/g) || []).length,
  const: (content.match(/\bconst\s+/g) || []).length,
  let: (content.match(/\blet\s+/g) || []).length,
  templates: (content.match(/`[^`]*`/g) || []).length,
  spreads: (content.match(/\.\.\./g) || []).length
};

// Write the cleaned content
fs.writeFileSync(filePath, content);

console.log('\n📊 Final cleanup results:');
let totalRemaining = 0;
for (const [feature, count] of Object.entries(finalChecks)) {
  if (count > 0) {
    console.log(`  ❌ ${feature}: ${count}`);
    totalRemaining += count;
  } else {
    console.log(`  ✅ ${feature}: 0`);
  }
}

if (totalRemaining === 0) {
  console.log('\n🎉 All ES6+ features eliminated!');
} else {
  console.log(`\n⚠️  ${totalRemaining} ES6+ features may remain (check if they're in strings)`);
  
  // Check if arrow functions are in strings
  const arrowsInStrings = content.match(/"[^"]*=>[^"]*"|'[^']*=>[^']*'/g) || [];
  if (arrowsInStrings.length > 0) {
    console.log(`  ℹ️  Found ${arrowsInStrings.length} arrow functions in string literals (safe)`);
  }
}