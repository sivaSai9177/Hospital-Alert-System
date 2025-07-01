#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing logger syntax issues...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix missing closing braces and semicolons in logger methods
const fixes = [
  // Fix error methods
  { 
    regex: /error:\s*function\(msg,\s*error\)\s*\{\s*return\s+serverLogger\.error\(msg,\s*\{\s*category:\s*'(\w+)',\s*error:\s*error\s*\}\),/g,
    replace: 'error: function(msg, error) { return serverLogger.error(msg, { category: \'$1\', error: error }); },'
  },
  // Fix warn methods
  {
    regex: /warn:\s*function\(msg,\s*data\)\s*\{\s*return\s+serverLogger\.warn\(msg,\s*Object\.assign\(\{\s*category:\s*'(\w+)'\s*\},\s*data\)\),/g,
    replace: 'warn: function(msg, data) { return serverLogger.warn(msg, Object.assign({ category: \'$1\' }, data)); },'
  },
  // Fix debug methods
  {
    regex: /debug:\s*function\(msg,\s*data\)\s*\{\s*return\s+serverLogger\.debug\(msg,\s*Object\.assign\(\{\s*category:\s*'(\w+)'\s*\},\s*data\)\)$/gm,
    replace: 'debug: function(msg, data) { return serverLogger.debug(msg, Object.assign({ category: \'$1\' }, data)); }'
  },
  // Fix info methods at end of object
  {
    regex: /info:\s*function\(msg,\s*data\)\s*\{\s*return\s+serverLogger\.info\(msg,\s*Object\.assign\(\{\s*category:\s*'(\w+)'\s*\},\s*data\)\),$/gm,
    replace: 'info: function(msg, data) { return serverLogger.info(msg, Object.assign({ category: \'$1\' }, data)); },'
  }
];

// Apply fixes
fixes.forEach(({ regex, replace }) => {
  const matches = code.match(regex) || [];
  if (matches.length > 0) {
    console.log(`Found ${matches.length} instances to fix`);
    code = code.replace(regex, replace);
    fixCount += matches.length;
  }
});

// Fix the function parameter issue on line 1142
code = code.replace(/async measurePerformance\(name: name, category: category, fn, operationId\)/, 
                   'async measurePerformance(name, category, fn, operationId)');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`\n✅ Fixed ${fixCount + 1} syntax issues!`);

// Check the result
console.log('\nChecking around line 1165:');
const lines = code.split('\n');
for (let i = 1163; i < 1170 && i < lines.length; i++) {
  if (lines[i].includes('sync:') || lines[i].includes('error:') || lines[i].includes('warn:')) {
    console.log(`${i + 1}: ${lines[i].substring(0, 120)}...`);
  }
}