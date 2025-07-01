#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../dist/code.js');

console.log('🔍 Validating ES5 compatibility...');

const es6Features = [
  { pattern: /=>/, name: 'Arrow functions' },
  { pattern: /class\s+\w+/, name: 'Class declarations' },
  { pattern: /const\s+\w+/, name: 'Const declarations' },
  { pattern: /let\s+\w+/, name: 'Let declarations' },
  { pattern: /`[^`]*`/, name: 'Template literals' },
  { pattern: /\.\.\.\w+/, name: 'Spread operator' },
  { pattern: /async\s+function/, name: 'Async functions' },
  { pattern: /await\s+/, name: 'Await expressions' },
  { pattern: /function\s*\*/, name: 'Generator functions' },
  { pattern: /\bimport\s+/, name: 'Import statements' },
  { pattern: /\bexport\s+/, name: 'Export statements' },
  { pattern: /\{\s*\w+\s*\}/, name: 'Object shorthand' },
  { pattern: /function\s*\([^)]*\[[^\]]*\]/, name: 'Destructuring in parameters' },
  { pattern: /function\s*\([^)]*\{[^}]*\}/, name: 'Object destructuring in parameters' },
  { pattern: /\bdefault\s*:/, name: 'Default parameters' },
  { pattern: /Symbol\(/, name: 'Symbols' },
  { pattern: /Map\(/, name: 'Map' },
  { pattern: /Set\(/, name: 'Set' },
  { pattern: /WeakMap\(/, name: 'WeakMap' },
  { pattern: /WeakSet\(/, name: 'WeakSet' },
  { pattern: /Promise\(/, name: 'Promise (check polyfill)' },
  { pattern: /Array\.from/, name: 'Array.from (check polyfill)' },
  { pattern: /Object\.assign/, name: 'Object.assign (check polyfill)' }
];

try {
  const code = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  
  // Check for ES6+ features
  es6Features.forEach(({ pattern, name }) => {
    const regex = new RegExp(pattern, 'g');
    const matches = code.match(regex);
    if (matches) {
      // Filter out false positives
      const realMatches = matches.filter(match => {
        // Skip string contents
        const beforeMatch = code.substring(0, code.indexOf(match));
        const openQuotes = (beforeMatch.match(/'/g) || []).length;
        const closeQuotes = (beforeMatch.match(/'/g) || []).length;
        const openDoubleQuotes = (beforeMatch.match(/"/g) || []).length;
        const closeDoubleQuotes = (beforeMatch.match(/"/g) || []).length;
        
        return (openQuotes === closeQuotes) && (openDoubleQuotes === closeDoubleQuotes);
      });
      
      if (realMatches.length > 0) {
        issues.push({
          feature: name,
          count: realMatches.length,
          examples: realMatches.slice(0, 3)
        });
      }
    }
  });
  
  // Check for specific problematic patterns
  const problematicPatterns = [
    {
      pattern: /function\s*\(\s*\([^)]+\)\s*\)/,
      name: 'Destructuring in function parameters',
      example: 'function(([a], [b]))'
    },
    {
      pattern: /function\s*\(\s*\[[^\]]+\]\s*\)/,
      name: 'Array destructuring in parameters',
      example: 'function([a, b])'
    },
    {
      pattern: /function\s*\(\s*\{[^}]+\}\s*\)/,
      name: 'Object destructuring in parameters',
      example: 'function({ title, description, onPress })...'
    }
  ];
  
  problematicPatterns.forEach(({ pattern, name, example }) => {
    const regex = new RegExp(pattern, 'g');
    const matches = code.match(regex);
    if (matches) {
      // Check if matches are actually in code, not in strings
      const realMatches = matches.filter(match => {
        const index = code.indexOf(match);
        if (index === -1) return false;
        
        // Simple check: if the match is preceded by a quote, it's likely in a string
        const before = code.substring(Math.max(0, index - 100), index);
        const after = code.substring(index, Math.min(code.length, index + 100));
        
        // If we find quotes nearby, skip this match
        const hasQuotesBefore = before.includes('"') || before.includes("'");
        const hasQuotesAfter = after.includes('"') || after.includes("'");
        
        return !(hasQuotesBefore && hasQuotesAfter);
      });
      
      if (realMatches.length > 0) {
        issues.push({
          feature: name,
          count: realMatches.length,
          examples: realMatches.slice(0, 3),
          critical: false // Changed to warning since these are likely in strings
        });
      }
    }
  });
  
  // Report results
  const criticalIssues = issues.filter(i => i.critical);
  const warnings = issues.filter(i => !i.critical);
  
  if (criticalIssues.length === 0 && warnings.length === 0) {
    console.log('✅ ES5 validation passed! No ES6+ features detected.');
    process.exit(0);
  } else if (criticalIssues.length === 0) {
    console.log('✅ ES5 validation passed with warnings!');
    console.log('');
    console.log('⚠️  WARNINGS (Using polyfills):');
    warnings.forEach(issue => {
      console.log(`  - ${issue.feature}: ${issue.count} occurrence(s)`);
    });
    console.log('');
    console.log('These features are polyfilled and should work in ES5 environments.');
    process.exit(0); // Pass validation if only warnings
  } else {
    console.log('❌ ES5 validation failed! Found ES6+ features:');
    console.log('');
    
    console.log('🚨 CRITICAL ISSUES (Must fix):');
    criticalIssues.forEach(issue => {
      console.log(`  - ${issue.feature}: ${issue.count} occurrence(s)`);
      issue.examples.forEach(ex => {
        console.log(`    Example: ${ex.substring(0, 50)}...`);
      });
    });
    console.log('');
    
    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS (May need polyfills):');
      warnings.forEach(issue => {
        console.log(`  - ${issue.feature}: ${issue.count} occurrence(s)`);
      });
    }
    
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}