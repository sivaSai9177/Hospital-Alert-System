#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Fixing remaining syntax errors...\n');

let attempts = 0;
const maxAttempts = 20;

while (attempts < maxAttempts) {
  attempts++;
  
  try {
    // Check syntax
    execSync('node -c dist/code.js', { stdio: 'pipe' });
    console.log('\n✅ All syntax errors fixed!');
    break;
  } catch (error) {
    const errorOutput = error.stderr.toString();
    console.log(`Attempt ${attempts}: Found syntax error`);
    
    // Parse error to get line number and issue
    const match = errorOutput.match(/dist\/code\.js:(\d+)/);
    if (!match) {
      console.error('Could not parse error:', errorOutput);
      break;
    }
    
    const lineNum = parseInt(match[1]);
    console.log(`  Line ${lineNum}: ${errorOutput.split('\n')[0]}`);
    
    // Read the file
    let code = fs.readFileSync('dist/code.js', 'utf8');
    const lines = code.split('\n');
    
    if (lineNum > 0 && lineNum <= lines.length) {
      const problemLine = lines[lineNum - 1];
      console.log(`  Original: ${problemLine.trim()}`);
      
      // Apply specific fixes based on common patterns
      let fixed = problemLine;
      
      // Fix missing semicolons in return statements
      if (fixed.match(/return p\.[xy]\)/)) {
        fixed = fixed.replace(/return p\.([xy])\)/g, 'return p.$1; }');
      }
      
      // Fix missing closing braces in find/filter/map
      if (fixed.match(/\.(find|filter|map|reduce)\(function\([^)]+\)\s*\{\s*return[^}]+\)[^}]/)) {
        fixed = fixed.replace(/return ([^;]+)\)/g, 'return $1; }');
      }
      
      // Fix reduce syntax
      if (fixed.includes('gaps.reduce((a, b)')) {
        fixed = fixed.replace(/gaps\.reduce\(\(a, b\)/g, 'gaps.reduce(function(a, b)');
      }
      
      // Fix missing semicolons after function declarations
      if (fixed.match(/\}\s*$/)) {
        const nextLine = lineNum < lines.length ? lines[lineNum] : '';
        if (nextLine.match(/^\s*var\s+/) || nextLine.match(/^\s*function\s+/)) {
          fixed = fixed.replace(/\}\s*$/, '};');
        }
      }
      
      // Fix malformed Math.round calls
      if (fixed.includes('Math.round(function(')) {
        fixed = fixed.replace(/Math\.round\(function\(/g, 'Math.round(');
      }
      
      // Fix missing closing parentheses in Math operations
      if (fixed.includes('Math.round(height / divisor;')) {
        fixed = fixed.replace(/Math\.round\(([^)]+);/g, 'Math.round($1)');
      }
      
      // Fix patterns like: return (...; });
      // Should be: return ...;
      if (fixed.match(/return\s*\([^)]+;\s*\}\);/)) {
        fixed = fixed.replace(/return\s*\(([^)]+);\s*\}\);/g, 'return $1;');
      }
      
      // Update the line if it changed
      if (fixed !== problemLine) {
        console.log(`  Fixed to: ${fixed.trim()}`);
        lines[lineNum - 1] = fixed;
        code = lines.join('\n');
        fs.writeFileSync('dist/code.js', code);
      } else {
        console.log('  Could not automatically fix this line');
        
        // Try some more aggressive fixes
        if (errorOutput.includes('Unexpected token )')) {
          // Missing closing brace before )
          fixed = fixed.replace(/([^}])\)\s*;/, '$1; })');
          if (fixed !== problemLine) {
            console.log(`  Aggressive fix: ${fixed.trim()}`);
            lines[lineNum - 1] = fixed;
            code = lines.join('\n');
            fs.writeFileSync('dist/code.js', code);
          }
        }
      }
    }
  }
}

if (attempts >= maxAttempts) {
  console.log('\n⚠️  Reached maximum attempts. Some errors may remain.');
}