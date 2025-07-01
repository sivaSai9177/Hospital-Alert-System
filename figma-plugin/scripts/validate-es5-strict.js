#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const filePath = path.resolve(__dirname, '../dist/code.js');

console.log('🔍 Strict ES5 Validation Starting...');

// Comprehensive list of ES6+ features to check
const es6Patterns = [
  // Syntax patterns
  { pattern: /=>/g, name: 'Arrow functions', critical: true },
  { pattern: /\bclass\s+\w+/g, name: 'Class declarations', critical: true },
  { pattern: /\bconst\s+/g, name: 'Const declarations', critical: true },
  { pattern: /\blet\s+/g, name: 'Let declarations', critical: true },
  { pattern: /`[^`]*`/g, name: 'Template literals', critical: true },
  { pattern: /\.\.\.\w+/g, name: 'Spread operator', critical: true },
  { pattern: /\basync\s+function/g, name: 'Async functions', critical: true },
  { pattern: /\bawait\s+/g, name: 'Await expressions', critical: true },
  { pattern: /\bfunction\s*\*/g, name: 'Generator functions', critical: true },
  { pattern: /\bimport\s+/g, name: 'Import statements', critical: true },
  { pattern: /\bexport\s+/g, name: 'Export statements', critical: true },
  { pattern: /\byield\s+/g, name: 'Yield expressions', critical: true },
  { pattern: /\bsuper\s*\(/g, name: 'Super calls', critical: true },
  { pattern: /\bextends\s+/g, name: 'Class extends', critical: true },
  { pattern: /\bstatic\s+/g, name: 'Static methods', critical: true },
  
  // Destructuring patterns
  { pattern: /\bconst\s*\{[^}]+\}\s*=/g, name: 'Object destructuring', critical: true },
  { pattern: /\bconst\s*\[[^\]]+\]\s*=/g, name: 'Array destructuring', critical: true },
  { pattern: /\blet\s*\{[^}]+\}\s*=/g, name: 'Object destructuring with let', critical: true },
  { pattern: /\blet\s*\[[^\]]+\]\s*=/g, name: 'Array destructuring with let', critical: true },
  { pattern: /\bvar\s*\{[^}]+\}\s*=/g, name: 'Object destructuring with var', critical: true },
  { pattern: /\bvar\s*\[[^\]]+\]\s*=/g, name: 'Array destructuring with var', critical: true },
  { pattern: /function\s*\([^)]*\{[^}]*\}[^)]*\)/g, name: 'Destructuring in parameters', critical: true },
  { pattern: /function\s*\([^)]*\[[^\]]*\][^)]*\)/g, name: 'Array destructuring in parameters', critical: true },
  
  // Object/Array methods that need polyfills
  { pattern: /Array\.from/g, name: 'Array.from', critical: false },
  { pattern: /Array\.of/g, name: 'Array.of', critical: false },
  { pattern: /\.includes\(/g, name: 'includes method', critical: false },
  { pattern: /\.find\(/g, name: 'find method', critical: false },
  { pattern: /\.findIndex\(/g, name: 'findIndex method', critical: false },
  { pattern: /Object\.assign/g, name: 'Object.assign', critical: false },
  { pattern: /Object\.values/g, name: 'Object.values', critical: true },
  { pattern: /Object\.entries/g, name: 'Object.entries', critical: true },
  { pattern: /Object\.keys/g, name: 'Object.keys', critical: false },
  
  // ES6+ APIs
  { pattern: /\bMap\s*\(/g, name: 'Map constructor', critical: false },
  { pattern: /\bSet\s*\(/g, name: 'Set constructor', critical: false },
  { pattern: /\bWeakMap\s*\(/g, name: 'WeakMap constructor', critical: false },
  { pattern: /\bWeakSet\s*\(/g, name: 'WeakSet constructor', critical: false },
  { pattern: /\bPromise\s*\(/g, name: 'Promise constructor', critical: false },
  { pattern: /\bSymbol\s*\(/g, name: 'Symbol', critical: true },
  { pattern: /\bProxy\s*\(/g, name: 'Proxy', critical: true },
  { pattern: /\bReflect\./g, name: 'Reflect API', critical: true },
  
  // Other ES6+ features
  { pattern: /\bfor\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+/g, name: 'for...of loops', critical: true },
  { pattern: /\[\s*\.\.\.([^\]]+)\]/g, name: 'Array spread', critical: true },
  { pattern: /\{\s*\.\.\.([^}]+)\}/g, name: 'Object spread', critical: true },
  { pattern: /(\w+)\s*:\s*function\s*\(/g, name: 'Method shorthand', critical: true },
  { pattern: /\b(\w+)\s*\([^)]*\)\s*\{/g, name: 'Method shorthand (compact)', critical: true },
  { pattern: /\[([^\]]+)\]\s*:/g, name: 'Computed property names', critical: true },
  { pattern: /\b(?:get|set)\s+\w+\s*\(/g, name: 'Getters/Setters', critical: true },
  
  // Default parameters
  { pattern: /function[^(]*\([^)]*=[^)]*\)/g, name: 'Default parameters', critical: true },
  
  // Binary/Octal literals
  { pattern: /0b[01]+/g, name: 'Binary literals', critical: true },
  { pattern: /0o[0-7]+/g, name: 'Octal literals', critical: true },
  
  // Unicode
  { pattern: /\\u\{[\da-fA-F]+\}/g, name: 'Unicode code point escapes', critical: true }
];

// Try to parse with Acorn for syntax validation
function validateWithAcorn(code) {
  try {
    acorn.parse(code, {
      ecmaVersion: 5,
      sourceType: 'script',
      allowReserved: true
    });
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      line: error.loc ? error.loc.line : null,
      column: error.loc ? error.loc.column : null
    };
  }
}

// Check for ES6+ patterns
function checkES6Patterns(code) {
  const issues = [];
  
  es6Patterns.forEach(({ pattern, name, critical }) => {
    const matches = code.match(pattern);
    if (matches && matches.length > 0) {
      // Try to filter out false positives (patterns in strings)
      const realMatches = matches.filter(match => {
        // Simple heuristic: check if the match appears to be in a string
        const index = code.indexOf(match);
        if (index === -1) return false;
        
        // Look for surrounding quotes
        const before = code.substring(Math.max(0, index - 50), index);
        const after = code.substring(index, Math.min(code.length, index + 50));
        
        // Count quotes to determine if we're in a string
        const beforeQuotes = (before.match(/["']/g) || []).length;
        const afterQuotes = (after.match(/["']/g) || []).length;
        
        // If odd number of quotes before and after, likely in a string
        if (beforeQuotes % 2 === 1 && afterQuotes % 2 === 1) {
          return false;
        }
        
        return true;
      });
      
      if (realMatches.length > 0) {
        issues.push({
          feature: name,
          count: realMatches.length,
          examples: realMatches.slice(0, 3).map(m => m.substring(0, 50)),
          critical: critical
        });
      }
    }
  });
  
  return issues;
}

// Check for non-ASCII characters
function checkNonASCII(code) {
  const nonASCII = code.match(/[^\x00-\x7F]/g);
  if (nonASCII && nonASCII.length > 0) {
    return {
      count: nonASCII.length,
      examples: [...new Set(nonASCII)].slice(0, 10)
    };
  }
  return null;
}

// Main validation
try {
  const code = fs.readFileSync(filePath, 'utf-8');
  console.log(`📖 Validating file: ${(code.length / 1024).toFixed(2)}KB`);
  
  // First, try parsing with Acorn
  console.log('🔬 Parsing with ES5 parser...');
  const acornResult = validateWithAcorn(code);
  
  if (!acornResult.valid) {
    console.error('❌ ES5 Syntax Error:');
    console.error(`   ${acornResult.error}`);
    if (acornResult.line) {
      console.error(`   at line ${acornResult.line}, column ${acornResult.column}`);
      
      // Try to show the problematic code
      const lines = code.split('\n');
      if (acornResult.line <= lines.length) {
        const line = lines[acornResult.line - 1];
        const start = Math.max(0, acornResult.column - 50);
        const end = Math.min(line.length, acornResult.column + 50);
        console.error(`   Near: "${line.substring(start, end)}"`);
        console.error(`   ${' '.repeat(50)}^`);
      }
    }
    process.exit(1);
  }
  
  // Check for ES6+ patterns
  console.log('🔍 Checking for ES6+ patterns...');
  const issues = checkES6Patterns(code);
  
  // Check for non-ASCII characters
  console.log('🔍 Checking for non-ASCII characters...');
  const nonASCII = checkNonASCII(code);
  
  // Separate critical issues from warnings
  const criticalIssues = issues.filter(i => i.critical);
  const warnings = issues.filter(i => !i.critical);
  
  // Report results
  if (criticalIssues.length === 0 && warnings.length === 0 && !nonASCII) {
    console.log('✅ Strict ES5 validation PASSED!');
    console.log('   No ES6+ features detected.');
    process.exit(0);
  } else {
    console.log('');
    
    if (criticalIssues.length > 0) {
      console.error('❌ CRITICAL ES6+ FEATURES FOUND:');
      criticalIssues.forEach(issue => {
        console.error(`   - ${issue.feature}: ${issue.count} occurrence(s)`);
        issue.examples.forEach(ex => {
          console.error(`     Example: "${ex}..."`);
        });
      });
      console.log('');
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️  WARNINGS (features that need polyfills):');
      warnings.forEach(issue => {
        console.warn(`   - ${issue.feature}: ${issue.count} occurrence(s)`);
      });
      console.log('');
    }
    
    if (nonASCII) {
      console.error('❌ NON-ASCII CHARACTERS FOUND:');
      console.error(`   Count: ${nonASCII.count}`);
      console.error(`   Examples: ${nonASCII.examples.join(', ')}`);
      console.log('');
    }
    
    if (criticalIssues.length > 0 || nonASCII) {
      console.error('❌ Build FAILED: ES6+ features or non-ASCII characters detected!');
      console.error('   The code is NOT compatible with Figma\'s ES5 requirement.');
      process.exit(1);
    } else {
      console.log('✅ Build passed with warnings.');
      console.log('   Ensure polyfills are properly included.');
      process.exit(0);
    }
  }
  
} catch (error) {
  console.error('❌ Validation error:', error.message);
  process.exit(1);
}