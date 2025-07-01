#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building Figma plugin with validation...\n');

try {
  // Step 1: Clean
  console.log('1️⃣  Cleaning dist...');
  execSync('rm -rf dist', { stdio: 'inherit' });

  // Step 2: Lint source files for ES5 compatibility
  console.log('\n2️⃣  Linting source files for ES5 compatibility...');
  try {
    execSync('bunx eslint src/**/*.ts --config .eslintrc.figma.js --max-warnings 0', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    console.log('   ✅ Source files pass ES5 compatibility checks');
  } catch (e) {
    console.error('   ❌ ES5 compatibility issues found in source:');
    console.error(e.stdout?.toString() || e.message);
    // Continue anyway - webpack will transpile
  }

  // Step 3: Build
  console.log('\n3️⃣  Building with webpack...');
  execSync('bunx webpack --config webpack/webpack.plugin.es5-simple.js', { stdio: 'inherit' });

  // Step 4: Apply fixes
  console.log('\n4️⃣  Applying ES5 fixes...');
  execSync('node scripts/fix-illegal-tokens.js', { stdio: 'inherit' });
  execSync('node scripts/fix-regex-patterns.js', { stdio: 'inherit' });

  // Step 5: Validate output
  console.log('\n5️⃣  Validating output...');
  const codePath = path.join(__dirname, '../dist/code.js');
  const code = fs.readFileSync(codePath, 'utf-8');
  
  // Check for ES6+ features
  const checks = [
    { pattern: /\bconst\b/, name: 'const declarations' },
    { pattern: /\blet\b/, name: 'let declarations' },
    { pattern: /=>/g, name: 'arrow functions' },
    { pattern: /`/g, name: 'template literals' },
    { pattern: /\.\.\./, name: 'spread operators' },
    { pattern: /class\s+\w+/, name: 'class declarations' },
    { pattern: /\?\./g, name: 'optional chaining' },
    { pattern: /\?\?/g, name: 'nullish coalescing' }
  ];

  let hasIssues = false;
  for (const check of checks) {
    const matches = code.match(check.pattern);
    if (matches && matches.length > 0) {
      // Check if it's in a string
      const inString = check.name === 'arrow functions' && 
                      matches.every(m => code.includes('"' + m) || code.includes("'" + m));
      
      if (!inString) {
        console.error(`   ❌ Found ${matches.length} ${check.name}`);
        hasIssues = true;
      }
    }
  }

  if (!hasIssues) {
    console.log('   ✅ No ES6+ features detected');
  }

  // Step 6: Syntax validation
  console.log('\n6️⃣  Validating JavaScript syntax...');
  try {
    new Function('var figma = {}; var __html__ = ""; ' + code);
    console.log('   ✅ Syntax is valid');
  } catch (e) {
    console.error('   ❌ Syntax error:', e.message);
    hasIssues = true;
  }

  // Step 7: Copy HTML
  console.log('\n7️⃣  Copying HTML...');
  execSync('cp src/ui/simple.html dist/index.html', { stdio: 'inherit' });

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log(hasIssues ? '⚠️  Build completed with warnings' : '✅ Build completed successfully!');
  console.log(`📦 Output: dist/code.js (${(code.length / 1024).toFixed(2)} KB)`);
  console.log('='.repeat(50));

  if (hasIssues) {
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}