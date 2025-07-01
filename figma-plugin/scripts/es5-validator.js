#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '../dist/code.js');

if (!fs.existsSync(codePath)) {
  console.error('❌ dist/code.js not found. Run build first.');
  process.exit(1);
}

const code = fs.readFileSync(codePath, 'utf-8');

console.log('🔍 Validating ES5 compatibility...\n');

// Check for ES6+ features
const checks = [
  { pattern: /\bconst\b/g, name: 'const declarations' },
  { pattern: /\blet\b/g, name: 'let declarations' },
  { pattern: /=>/g, name: 'arrow functions' },
  { pattern: /`[^`]*`/g, name: 'template literals' },
  { pattern: /\.\.\./g, name: 'spread operators' },
  { pattern: /\bclass\s+\w+/g, name: 'class declarations' },
  { pattern: /\?\./g, name: 'optional chaining' },
  { pattern: /\?\?/g, name: 'nullish coalescing' },
  { pattern: /\basync\s+function/g, name: 'async functions' },
  { pattern: /\bawait\s+/g, name: 'await expressions' }
];

let totalIssues = 0;

checks.forEach(check => {
  const matches = code.match(check.pattern) || [];
  if (matches.length > 0) {
    // For arrow functions, check if they're in strings
    if (check.name === 'arrow functions') {
      const realArrows = matches.filter(match => {
        const index = code.indexOf(match);
        // Simple check: count quotes before this position
        const before = code.substring(0, index);
        const quotesBefore = (before.match(/"/g) || []).length;
        return quotesBefore % 2 === 0; // Even number = not in string
      });
      
      if (realArrows.length > 0) {
        console.log(`❌ Found ${realArrows.length} ${check.name} (not in strings)`);
        totalIssues += realArrows.length;
      } else if (matches.length > 0) {
        console.log(`ℹ️  Found ${matches.length} ${check.name} (all in strings - OK)`);
      }
    } else {
      console.log(`❌ Found ${matches.length} ${check.name}`);
      totalIssues += matches.length;
    }
  }
});

// Check basic syntax
console.log('\n📋 Syntax validation...');
try {
  // Create a test environment
  const testCode = `
    var figma = { 
      ui: { postMessage: function() {} },
      showUI: function() {},
      closePlugin: function() {}
    };
    var __html__ = "";
    ${code}
  `;
  
  new Function(testCode);
  console.log('✅ JavaScript syntax is valid');
} catch (e) {
  console.error('❌ Syntax error:', e.message);
  // Try to find the problematic line
  const match = e.message.match(/^(.+) in (.+):(\d+)$/);
  if (match) {
    console.error(`   Location: line ${match[3]}`);
  }
  totalIssues++;
}

// Summary
console.log('\n' + '='.repeat(50));
if (totalIssues === 0) {
  console.log('✅ ES5 validation passed!');
  console.log(`📦 File size: ${(code.length / 1024).toFixed(2)} KB`);
} else {
  console.log(`⚠️  Found ${totalIssues} compatibility issues`);
  console.log('\nNext steps:');
  console.log('1. Run "bun run build:plugin-only" to rebuild');
  console.log('2. Check the source files for ES6+ syntax');
  console.log('3. Ensure webpack is configured for ES5 output');
}
console.log('='.repeat(50));

process.exit(totalIssues > 0 ? 1 : 0);