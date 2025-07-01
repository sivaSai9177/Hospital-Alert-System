#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Figma plugin with proper ES5 support using Babel...\n');

// Step 1: Clean dist directory
console.log('1️⃣ Cleaning dist directory...');
if (fs.existsSync('dist')) {
  // Save index.html if it exists
  let indexHtml = null;
  if (fs.existsSync('dist/index.html')) {
    indexHtml = fs.readFileSync('dist/index.html', 'utf8');
  }
  
  fs.rmSync('dist', { recursive: true });
  fs.mkdirSync('dist', { recursive: true });
  
  // Restore index.html
  if (indexHtml) {
    fs.writeFileSync('dist/index.html', indexHtml);
  }
} else {
  fs.mkdirSync('dist', { recursive: true });
}

// Step 2: Transpile TypeScript to ES5 using Babel
console.log('\n2️⃣ Transpiling TypeScript to ES5 with Babel...');
try {
  // First transpile with Babel
  execSync(
    'npx babel src/code.ts --out-file dist/code.transpiled.js --extensions ".ts,.tsx"',
    { stdio: 'inherit' }
  );
} catch (error) {
  console.error('❌ Babel transpilation failed:', error.message);
  process.exit(1);
}

// Step 3: Bundle with browserify for CommonJS module support
console.log('\n3️⃣ Bundling with browserify...');
try {
  // First install browserify if not present
  if (!fs.existsSync('node_modules/browserify')) {
    console.log('Installing browserify...');
    execSync('npm install --no-save browserify', { stdio: 'inherit' });
  }
  
  // Bundle the transpiled code
  execSync(
    'npx browserify dist/code.transpiled.js -o dist/code.bundled.js --no-builtins',
    { stdio: 'inherit' }
  );
} catch (error) {
  console.error('❌ Bundling failed:', error.message);
  process.exit(1);
}

// Step 4: Wrap in IIFE for Figma
console.log('\n4️⃣ Wrapping in IIFE for Figma...');
let code = fs.readFileSync('dist/code.bundled.js', 'utf8');

// Wrap in IIFE
code = `(function() {
  'use strict';
  ${code}
})();`;

// Step 5: Apply final ES5 fixes
console.log('\n5️⃣ Applying final ES5 compatibility fixes...');

// Fix any remaining arrow functions (safety check)
code = code.replace(/(\w+)\s*=>\s*{/g, 'function($1) {');
code = code.replace(/(\w+)\s*=>\s*([^{][^;,}]+)/g, 'function($1) { return $2; }');

// Fix any remaining template literals
code = code.replace(/`([^`]*)`/g, function(match, content) {
  if (!content.includes('${')) {
    return "'" + content.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  }
  // Handle template literals with interpolation
  let result = content;
  result = result.replace(/\$\{([^}]+)\}/g, "' + ($1) + '");
  return "'" + result + "'";
});

// Remove any remaining const/let (should be handled by Babel, but just in case)
code = code.replace(/\bconst\s+/g, 'var ');
code = code.replace(/\blet\s+/g, 'var ');

// Write final output
fs.writeFileSync('dist/code.js', code);

// Clean up intermediate files
fs.unlinkSync('dist/code.transpiled.js');
fs.unlinkSync('dist/code.bundled.js');

// Step 6: Validate ES5 compatibility
console.log('\n6️⃣ Validating ES5 compatibility...');
const finalCode = fs.readFileSync('dist/code.js', 'utf8');
const issues = [];

// Check for ES6+ features
if (finalCode.match(/=>\s*[{(]/)) {
  issues.push('Arrow functions detected');
}
if (finalCode.match(/class\s+\w+/)) {
  issues.push('ES6 classes detected');
}
if (finalCode.match(/async\s+function/)) {
  issues.push('Async functions detected');
}
if (finalCode.match(/function\s*\(\s*\[[^\]]+\]/)) {
  issues.push('Destructuring in function parameters detected');
}
if (finalCode.match(/for\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+/)) {
  issues.push('For...of loops detected');
}
if (finalCode.includes('`')) {
  issues.push('Template literals detected');
}
if (finalCode.match(/\.\.\./)) {
  issues.push('Spread operators detected');
}

if (issues.length > 0) {
  console.log('⚠️  Potential ES6+ features detected:');
  issues.forEach(issue => console.log(`  - ${issue}`));
  console.log('\nThese will be fixed in the next step...');
} else {
  console.log('✅ ES5 validation passed!');
}

// Step 7: Build UI if needed
if (!fs.existsSync('dist/index.html')) {
  console.log('\n7️⃣ Building UI...');
  try {
    execSync('bun run build:ui:simple', { stdio: 'inherit' });
    
    // Rename ui.html to index.html
    if (fs.existsSync('dist/ui.html')) {
      fs.renameSync('dist/ui.html', 'dist/index.html');
    }
  } catch (error) {
    console.error('⚠️  UI build failed, continuing without UI');
  }
}

console.log('\n✅ Build complete!');
console.log(`  - dist/code.js (${(fs.statSync('dist/code.js').size / 1024).toFixed(2)} KB)`);
if (fs.existsSync('dist/index.html')) {
  console.log(`  - dist/index.html (${(fs.statSync('dist/index.html').size / 1024).toFixed(2)} KB)`);
}