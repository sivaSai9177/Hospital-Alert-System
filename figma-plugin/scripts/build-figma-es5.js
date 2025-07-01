#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building Figma plugin with ES5 compatibility...');

// Step 1: Run webpack
console.log('  Running webpack...');
execSync('webpack --config webpack/webpack.plugin.es5-figma.js', { stdio: 'inherit' });

// Step 2: Read the output
const codePath = path.join(__dirname, '../dist/code.js');
let code = fs.readFileSync(codePath, 'utf-8');

console.log('  Fixing ES6+ syntax...');

// Fix arrow functions
let arrowCount = 0;
// Pattern 1: param => { ... }
code = code.replace(/(\b\w+)\s*=>\s*\{/g, (match, param) => {
  arrowCount++;
  return `function(${param}){`;
});

// Pattern 2: (param) => { ... }
code = code.replace(/\(([^)]*)\)\s*=>\s*\{/g, (match, params) => {
  arrowCount++;
  return `function(${params}){`;
});

// Pattern 3: param => expression
code = code.replace(/(\b\w+)\s*=>\s*([^{;,\)}\]]+)([;,\)}\]])/g, (match, param, expr, term) => {
  arrowCount++;
  return `function(${param}){return ${expr}}${term}`;
});

// Pattern 4: (params) => expression  
code = code.replace(/\(([^)]*)\)\s*=>\s*([^{;,\)}\]]+)([;,\)}\]])/g, (match, params, expr, term) => {
  arrowCount++;
  return `function(${params}){return ${expr}}${term}`;
});

console.log(`  Fixed ${arrowCount} arrow functions`);

// Fix template literals
let templateCount = 0;
code = code.replace(/`([^`]*)`/g, (match, content) => {
  templateCount++;
  if (content.includes('${')) {
    let result = content;
    result = result.replace(/\$\{([^}]+)\}/g, '" + ($1) + "');
    result = result.replace(/"/g, '\\"');
    result = result.replace(/\n/g, '\\n');
    return '"' + result + '"';
  } else {
    return '"' + content.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }
});

console.log(`  Fixed ${templateCount} template literals`);

// Fix const/let to var
code = code.replace(/\b(const|let)\b/g, 'var');

// Add polyfills at the beginning
const polyfills = fs.readFileSync(path.join(__dirname, '../src/polyfills.js'), 'utf-8');

// Wrap everything in a single IIFE
code = `(function() {
${polyfills}

${code}
})();`;

// Write the result
fs.writeFileSync(codePath, code);

console.log('✅ Build complete!');
console.log(`   Output: ${codePath}`);
console.log(`   Size: ${(code.length / 1024).toFixed(2)}KB`);