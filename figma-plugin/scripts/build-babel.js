#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Figma plugin with Babel for ES5 compatibility...\n');

// Step 1: Clean previous build
console.log('1️⃣ Cleaning previous build...');
if (fs.existsSync('dist/code.js')) {
  fs.unlinkSync('dist/code.js');
}

// Step 2: Compile TypeScript to JavaScript using Babel
console.log('\n2️⃣ Transpiling TypeScript to ES5 with Babel...');
try {
  execSync(
    'npx babel src/code.ts --out-file dist/code.js --extensions ".ts,.tsx"',
    { stdio: 'inherit' }
  );
} catch (error) {
  console.error('❌ Babel transpilation failed:', error.message);
  process.exit(1);
}

// Step 3: Bundle the transpiled code
console.log('\n3️⃣ Bundling with esbuild (bundle only, no transpilation)...');
try {
  execSync(
    'npx esbuild dist/code.js --bundle --outfile=dist/code.bundled.js --format=iife --platform=browser --target=es5 --minify=false',
    { stdio: 'inherit' }
  );
  
  // Replace the original with the bundled version
  fs.renameSync('dist/code.bundled.js', 'dist/code.js');
} catch (error) {
  console.error('❌ Bundling failed:', error.message);
  process.exit(1);
}

// Step 4: Validate ES5 compatibility
console.log('\n4️⃣ Validating ES5 compatibility...');
const code = fs.readFileSync('dist/code.js', 'utf8');
const issues = [];

if (code.includes('=>')) {
  issues.push('⚠️  Arrow functions detected');
}
if (code.includes('`')) {
  issues.push('⚠️  Template literals detected');
}
if (code.includes('...')) {
  issues.push('⚠️  Spread operators detected');
}
if (code.includes('?.')) {
  issues.push('⚠️  Optional chaining detected');
}
if (code.includes('??')) {
  issues.push('⚠️  Nullish coalescing detected');
}
if (code.includes('class ')) {
  // Check for class fields
  const classRegex = /class\s+\w+\s*{[^}]*\n\s*\w+\s*=/;
  if (classRegex.test(code)) {
    issues.push('⚠️  Class fields detected');
  }
}

if (issues.length > 0) {
  console.log('   Issues found:');
  issues.forEach(issue => console.log('   ' + issue));
} else {
  console.log('   ✅ All ES5 compatibility checks passed!');
}

console.log('\n✅ Build complete! Output: dist/code.js');