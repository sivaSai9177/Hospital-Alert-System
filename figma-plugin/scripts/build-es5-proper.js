#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Figma plugin with proper ES5 compatibility...\n');

// Step 1: Clean previous build
console.log('1️⃣ Cleaning previous build...');
if (fs.existsSync('dist')) {
  // Preserve index.html if it exists
  let indexHtmlContent = null;
  if (fs.existsSync('dist/index.html')) {
    indexHtmlContent = fs.readFileSync('dist/index.html', 'utf8');
  }
  
  fs.rmSync('dist', { recursive: true });
  fs.mkdirSync('dist', { recursive: true });
  
  // Restore index.html
  if (indexHtmlContent) {
    fs.writeFileSync('dist/index.html', indexHtmlContent);
  }
}

// Step 2: Use esbuild to bundle with ES5 target
console.log('\n2️⃣ Building with esbuild targeting ES5...');
try {
  execSync(
    'npx esbuild src/code.ts ' +
    '--bundle ' +
    '--outfile=dist/code.js ' +
    '--format=iife ' +
    '--platform=browser ' +
    '--target=es5 ' +
    '--supported:arrow=false ' +
    '--supported:const-and-let=false ' +
    '--supported:destructuring=false ' +
    '--supported:for-of=false ' +
    '--supported:template-literal=false ' +
    '--supported:default-argument=false ' +
    '--supported:rest-argument=false ' +
    '--supported:object-extensions=false ' +
    '--supported:async-await=false ' +
    '--supported:class=false ' +
    '--supported:generator=false ' +
    '--supported:optional-chain=false ' +
    '--supported:nullish-coalescing=false ' +
    '--supported:logical-assignment=false ' +
    '--supported:class-field=false ' +
    '--supported:class-private-field=false ' +
    '--supported:class-private-method=false ' +
    '--supported:class-static-field=false ' +
    '--supported:numeric-separator=false ' +
    '--supported:bigint=false ' +
    '--loader:.ts=ts ' +
    '--loader:.tsx=tsx',
    { stdio: 'inherit' }
  );
} catch (error) {
  console.error('❌ esbuild failed:', error.message);
  process.exit(1);
}

// Step 3: Apply additional transformations with Babel
console.log('\n3️⃣ Applying Babel transformations for complete ES5 compatibility...');
try {
  execSync(
    'npx babel dist/code.js --out-file dist/code.babel.js --presets=@babel/preset-env',
    { stdio: 'inherit' }
  );
  
  // Replace the original with the Babel output
  fs.renameSync('dist/code.babel.js', 'dist/code.js');
} catch (error) {
  console.error('❌ Babel transformation failed:', error.message);
  process.exit(1);
}

// Step 4: Apply final fixes for Figma compatibility
console.log('\n4️⃣ Applying final Figma-specific fixes...');
let code = fs.readFileSync('dist/code.js', 'utf8');

// Remove any remaining problematic patterns
code = code.replace(/Object\.defineProperty\(exports,\s*"__esModule",\s*{\s*value:\s*true\s*}\);?/g, '');
code = code.replace(/exports\.__esModule\s*=\s*true;?/g, '');

// Ensure all arrow functions are converted
code = code.replace(/(\w+)\s*=>\s*{/g, 'function($1) {');
code = code.replace(/(\w+)\s*=>\s*([^{])/g, 'function($1) { return $2');

// Fix any remaining template literals
code = code.replace(/`([^`]*)`/g, function(match, content) {
  if (!content.includes('${')) {
    return "'" + content.replace(/'/g, "\\'") + "'";
  }
  return match; // Skip if it has interpolation (should be handled by Babel)
});

// Write the final code
fs.writeFileSync('dist/code.js', code);

// Step 5: Validate ES5 compatibility
console.log('\n5️⃣ Validating ES5 compatibility...');
const finalCode = fs.readFileSync('dist/code.js', 'utf8');
const issues = [];

if (finalCode.includes('=>') && !finalCode.includes('// =>')) {
  issues.push('⚠️  Arrow functions detected');
}
if (finalCode.includes('`')) {
  issues.push('⚠️  Template literals detected');
}
if (finalCode.includes('...') && !finalCode.includes('// ...')) {
  issues.push('⚠️  Spread operators detected');
}
if (finalCode.includes('?.')) {
  issues.push('⚠️  Optional chaining detected');
}
if (finalCode.includes('??')) {
  issues.push('⚠️  Nullish coalescing detected');
}
if (/class\s+\w+/.test(finalCode)) {
  issues.push('⚠️  ES6 classes detected');
}
if (finalCode.includes('const ') || finalCode.includes('let ')) {
  issues.push('⚠️  const/let declarations detected');
}

if (issues.length > 0) {
  console.log('   Issues found:');
  issues.forEach(issue => console.log('   ' + issue));
} else {
  console.log('   ✅ All ES5 compatibility checks passed!');
}

console.log('\n✅ Build complete! Output: dist/code.js');
console.log(`   File size: ${(fs.statSync('dist/code.js').size / 1024).toFixed(2)} KB`);