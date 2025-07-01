#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 Building Figma plugin (ES5 compatible)...\n');

// Clean
console.log('📦 Cleaning dist...');
execSync('rm -rf dist && mkdir -p dist', { stdio: 'inherit' });

// Build
console.log('\n🏗️  Building with Figma-specific config...');
try {
  execSync('webpack --config webpack.config.figma.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Post-process the output
console.log('\n🔧 Post-processing for Figma...');
const codePath = path.join(__dirname, '../dist/code.js');
let code = fs.readFileSync(codePath, 'utf8');

// Remove webpack bootstrap if present
if (code.startsWith('!function(')) {
  console.log('  - Detected webpack IIFE wrapper');
}

// Ensure the code doesn't start with a problematic pattern
// Figma might not like certain module patterns
code = code.replace(/^!function\(\)\{/, '(function(){');
code = code.replace(/\}\(\);?$/, '})();');

// Replace all ES6+ syntax
console.log('  - Removing ES6+ features...');

// 1. const/let -> var
code = code.replace(/\b(const|let)\s+/g, 'var ');

// 2. Arrow functions
code = code.replace(/(\w+)\s*=>\s*\{/g, 'function($1){');
code = code.replace(/\(\s*([^)]*)\s*\)\s*=>\s*\{/g, 'function($1){');
code = code.replace(/(\w+)\s*=>\s*([^{])/g, 'function($1){return $2');
code = code.replace(/\(\s*([^)]*)\s*\)\s*=>\s*([^{])/g, 'function($1){return $2');

// 3. Template literals
code = code.replace(/`([^`]*)`/g, function(match, p1) {
  if (p1.includes('${')) {
    return '"' + p1.replace(/\$\{([^}]+)\}/g, '" + ($1) + "') + '"';
  }
  return '"' + p1.replace(/"/g, '\\"') + '"';
});

// 4. Spread operators
code = code.replace(/\.\.\.([a-zA-Z_$][\w$]*)/g, function(match, varName) {
  return 'Array.prototype.slice.call(' + varName + ')';
});

// 5. Remove async/await
code = code.replace(/\basync\s+function/g, 'function');
code = code.replace(/\basync\s+/g, '');
code = code.replace(/\bawait\s+/g, '');

// Write the processed code
fs.writeFileSync(codePath, code);

// Copy UI files
console.log('\n📄 Copying UI files...');
if (fs.existsSync('src/ui/index.html')) {
  execSync('cp src/ui/index.html dist/', { stdio: 'inherit' });
} else if (fs.existsSync('src/ui/simple.html')) {
  execSync('cp src/ui/simple.html dist/index.html', { stdio: 'inherit' });
}

// Validate
console.log('\n🔍 Validating output...');
const finalCode = fs.readFileSync(codePath, 'utf8');
const stats = {
  size: (finalCode.length / 1024).toFixed(2) + ' KB',
  lines: finalCode.split('\n').length,
  es6: {
    const: (finalCode.match(/\bconst\s+/g) || []).length,
    let: (finalCode.match(/\blet\s+/g) || []).length,
    arrow: (finalCode.match(/=>/g) || []).length,
    template: (finalCode.match(/`/g) || []).length,
    spread: (finalCode.match(/\.\.\./g) || []).length,
    async: (finalCode.match(/\basync\s+/g) || []).length
  }
};

console.log('\n📊 Build Summary:');
console.log(`  File size: ${stats.size}`);
console.log(`  Lines: ${stats.lines}`);

const es6Total = Object.values(stats.es6).reduce((a, b) => a + b, 0);
if (es6Total > 0) {
  console.log('\n⚠️  ES6+ features found:');
  Object.entries(stats.es6).forEach(([feature, count]) => {
    if (count > 0) console.log(`  - ${feature}: ${count}`);
  });
} else {
  console.log('\n✅ No ES6+ features detected!');
}

console.log('\n✨ Build complete!');
console.log('📁 Output: dist/code.js');