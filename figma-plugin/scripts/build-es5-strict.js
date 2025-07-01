#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building Figma plugin with strict ES5 transpilation...\n');

try {
  // Step 1: Clean
  console.log('1️⃣  Cleaning dist...');
  execSync('rm -rf dist', { stdio: 'inherit' });

  // Step 2: Create dist directory
  execSync('mkdir -p dist', { stdio: 'inherit' });

  // Step 3: Build with strict ES5 webpack config
  console.log('\n2️⃣  Building with strict ES5 webpack config...');
  execSync('bunx webpack --config webpack/webpack.plugin.es5-strict.js', { stdio: 'inherit' });

  // Step 4: Apply all post-processing fixes
  console.log('\n3️⃣  Applying post-processing fixes...');
  
  const fixes = [
    'fix-illegal-tokens.js',
    'fix-regex-patterns.js',
    'fix-multiline-issues.js',
    'fix-unicode-escapes.js',
    'fix-string-escaping.js',
    'fix-es5-post-build.js',
    'fix-es5-aggressive.js',
  ];

  for (const fix of fixes) {
    const fixPath = path.join(__dirname, fix);
    if (fs.existsSync(fixPath)) {
      console.log(`   Applying ${fix}...`);
      try {
        execSync(`node ${fixPath}`, { stdio: 'pipe' });
      } catch (e) {
        console.log(`   ⚠️  ${fix} completed with warnings`);
      }
    }
  }

  // Step 5: Final aggressive ES5 fix
  console.log('\n4️⃣  Applying final ES5 transformations...');
  const codePath = path.join(__dirname, '../dist/code.js');
  let code = fs.readFileSync(codePath, 'utf-8');

  // Remove any remaining const/let
  code = code.replace(/\bconst\s+/g, 'var ');
  code = code.replace(/\blet\s+/g, 'var ');

  // Fix any remaining arrow functions
  code = code.replace(/(\w+)\s*=>\s*\{/g, function(match, param) {
    return 'function(' + param + '){';
  });
  code = code.replace(/(\w+)\s*=>\s*([^{])/g, function(match, param, expr) {
    return 'function(' + param + '){return ' + expr;
  });
  code = code.replace(/\(\)\s*=>\s*\{/g, 'function(){');
  code = code.replace(/\(\)\s*=>\s*([^{])/g, function(match, expr) {
    return 'function(){return ' + expr;
  });

  // Fix template literals
  code = code.replace(/`([^`]*)`/g, function(match, content) {
    return '"' + content.replace(/"/g, '\\"') + '"';
  });

  // Fix spread operators in arrays
  code = code.replace(/\[\.\.\.([^\]]+)\]/g, function(match, expr) {
    return '[].concat(' + expr + ')';
  });

  // Fix spread in function calls
  code = code.replace(/(\w+)\(\.\.\.([^)]+)\)/g, function(match, fn, expr) {
    return fn + '.apply(null, ' + expr + ')';
  });

  // Remove optional chaining
  code = code.replace(/(\w+)\?\./g, '$1 && $1.');

  // Remove nullish coalescing
  code = code.replace(/(\w+)\s*\?\?\s*([^;,\)]+)/g, '($1 !== null && $1 !== undefined ? $1 : $2)');

  fs.writeFileSync(codePath, code);

  // Step 6: Copy HTML
  console.log('\n5️⃣  Copying HTML...');
  execSync('cp src/ui/simple.html dist/index.html', { stdio: 'inherit' });

  // Step 7: Validate
  console.log('\n6️⃣  Validating output...');
  execSync('node scripts/es5-validator.js', { stdio: 'inherit' });

  console.log('\n✅ Build completed!');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}