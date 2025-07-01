#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Final ES5 fixes for Figma plugin...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix 1: Properly fix ANIMATION_TIMING_FUNCTIONS
console.log('1. Fixing ANIMATION_TIMING_FUNCTIONS...');
const timingFunctionsStart = code.indexOf('// ANIMATION_TIMING_FUNCTIONS field should be in constructor');
if (timingFunctionsStart !== -1) {
  const timingFunctionsEnd = code.indexOf('// };', timingFunctionsStart);
  if (timingFunctionsEnd !== -1) {
    const beforeSection = code.substring(0, timingFunctionsStart);
    const afterSection = code.substring(timingFunctionsEnd + 5);
    
    const timingFunctions = `  ANIMATION_TIMING_FUNCTIONS = {
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    snappy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'ease-linear': 'linear',
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)'
  };`;
    
    code = beforeSection + timingFunctions + afterSection;
  }
}

// Fix 2: Properly fix ANIMATION_DELAYS
console.log('2. Fixing ANIMATION_DELAYS...');
const delaysStart = code.indexOf('// ANIMATION_DELAYS field should be in constructor');
if (delaysStart !== -1) {
  const delaysEnd = code.indexOf('// };', delaysStart);
  if (delaysEnd !== -1) {
    const beforeSection = code.substring(0, delaysStart);
    const afterSection = code.substring(delaysEnd + 5);
    
    const delays = `  ANIMATION_DELAYS = {
    'stagger-1': '50ms',
    'stagger-2': '100ms',
    'stagger-3': '150ms',
    'stagger-4': '200ms',
    'stagger-5': '250ms',
    'stagger-6': '300ms'
  };`;
    
    code = beforeSection + delays + afterSection;
  }
}

// Fix 3: Replace all const/let with var
console.log('3. Converting const/let to var...');
code = code.replace(/\bconst\s+/g, 'var ');
code = code.replace(/\blet\s+/g, 'var ');

// Fix 4: Fix any remaining arrow functions
console.log('4. Converting remaining arrow functions...');
// Single parameter arrow functions
code = code.replace(/(\w+)\s*=>\s*\{/g, 'function($1) {');
code = code.replace(/(\w+)\s*=>\s*([^{][^;]*);/g, 'function($1) { return $2; }');
code = code.replace(/(\w+)\s*=>\s*([^{][^,}]+)/g, 'function($1) { return $2 }');

// Multiple parameter arrow functions
code = code.replace(/\(([^)]+)\)\s*=>\s*\{/g, 'function($1) {');
code = code.replace(/\(([^)]+)\)\s*=>\s*([^{][^;]*);/g, 'function($1) { return $2; }');
code = code.replace(/\(([^)]+)\)\s*=>\s*([^{][^,}]+)/g, 'function($1) { return $2 }');

// Fix 5: Fix destructuring in .map/.forEach/.filter
console.log('5. Fixing array method destructuring...');
code = code.replace(/\.map\(function\(\[(\w+),\s*(\w+)\]\)/g, '.map(function(arr) { var $1 = arr[0], $2 = arr[1]; ');
code = code.replace(/\.forEach\(function\(\[(\w+),\s*(\w+)\]\)/g, '.forEach(function(arr) { var $1 = arr[0], $2 = arr[1]; ');

// Fix 6: Clean up any broken syntax
console.log('6. Cleaning up syntax...');
// Fix object syntax
code = code.replace(/\},\s*{/g, '},\n    {');
// Fix quotes
code = code.replace(/opacity: "(\d+)"/g, 'opacity: \'$1\'');
// Fix multiline object declarations
code = code.replace(/\{       /g, '{\n      ');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Final ES5 fixes complete!');

// Validate
const finalCode = fs.readFileSync('dist/code.js', 'utf8');
const issues = [];

if (finalCode.includes('=>')) {
  const arrowMatch = finalCode.match(/(.{0,30})=>(.{0,30})/);
  if (arrowMatch) issues.push(`Arrow function: ${arrowMatch[0].trim()}`);
}
if (finalCode.includes('const ')) {
  issues.push('const declarations still present');
}
if (finalCode.includes('let ')) {
  issues.push('let declarations still present');
}
if (finalCode.includes('// ANIMATION_TIMING_FUNCTIONS field')) {
  issues.push('ANIMATION_TIMING_FUNCTIONS still commented');
}
if (finalCode.includes('// ANIMATION_DELAYS field')) {
  issues.push('ANIMATION_DELAYS still commented');
}

if (issues.length > 0) {
  console.log('\n⚠️  Remaining issues:');
  issues.forEach(issue => console.log('  - ' + issue));
} else {
  console.log('\n✅ All validation checks passed!');
}

console.log(`\nFile size: ${(fs.statSync('dist/code.js').size / 1024).toFixed(2)} KB`);