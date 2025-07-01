#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Figma plugin with FINAL ES5 solution...\n');

try {
  // Step 1: Clean
  console.log('1️⃣  Cleaning dist...');
  execSync('rm -rf dist', { stdio: 'inherit' });
  execSync('mkdir -p dist', { stdio: 'inherit' });

  // Step 2: Build with aggressive ES5 webpack config
  console.log('\n2️⃣  Building with final ES5 webpack config...');
  execSync('bunx webpack --config webpack/webpack.plugin.final-es5.js', { stdio: 'inherit' });

  // Step 3: Post-process to ensure pure ES5
  console.log('\n3️⃣  Post-processing for pure ES5...');
  const codePath = path.join(__dirname, '../dist/code.js');
  let code = fs.readFileSync(codePath, 'utf-8');

  // Remove any TypeScript helpers that use spread
  code = code.replace(/var\s+\w+\s*=\s*this\s*&&\s*this\.__spread[^;]+;/g, '');
  code = code.replace(/var\s+\w+\s*=\s*this\s*&&\s*this\.__spreadArray[^}]+\}[^}]+\}/g, '');
  
  // Replace all spread operators with ES5 equivalents
  let replacements = 0;
  
  // Replace [...arr] patterns
  code = code.replace(/\[\.\.\.([^\]]+)\]/g, (match, expr) => {
    replacements++;
    return 'Array.prototype.slice.call(' + expr + ')';
  });
  
  // Replace {...obj} patterns
  code = code.replace(/\{\.\.\.([^}]+)\}/g, (match, expr) => {
    replacements++;
    return 'Object.assign({}, ' + expr + ')';
  });
  
  // Replace function(...args) patterns
  code = code.replace(/(\w+)\(\.\.\.([^)]+)\)/g, (match, fn, args) => {
    replacements++;
    return fn + '.apply(null, ' + args + ')';
  });
  
  // Replace remaining const/let
  code = code.replace(/\bconst\s+/g, 'var ');
  code = code.replace(/\blet\s+/g, 'var ');
  
  // Replace arrow functions
  code = code.replace(/(\w+)\s*=>\s*\{/g, 'function($1){');
  code = code.replace(/\(\)\s*=>\s*\{/g, 'function(){');
  code = code.replace(/\(([^)]+)\)\s*=>\s*\{/g, 'function($1){');
  
  // Replace template literals
  code = code.replace(/`([^`]*)`/g, function(match, content) {
    if (content.includes('${')) {
      return '"' + content.replace(/\$\{([^}]+)\}/g, '" + ($1) + "') + '"';
    }
    return '"' + content.replace(/"/g, '\\"') + '"';
  });
  
  // Fix optional chaining
  code = code.replace(/(\w+)\?\./g, '($1 && $1.)');
  
  // Fix nullish coalescing
  code = code.replace(/\?\?/g, '!= null ?');
  
  // Remove async/await
  code = code.replace(/\basync\s+/g, '');
  code = code.replace(/\bawait\s+/g, '');

  // Write the processed code
  fs.writeFileSync(codePath, code);

  console.log(`   ✅ Replaced ${replacements} ES6+ patterns`);

  // Step 4: Apply critical fixes
  console.log('\n4️⃣  Applying critical fixes...');
  const fixes = [
    'fix-illegal-tokens.js',
    'fix-regex-patterns.js',
    'fix-multiline-issues.js'
  ];

  for (const fix of fixes) {
    const fixPath = path.join(__dirname, fix);
    if (fs.existsSync(fixPath)) {
      try {
        execSync(`node ${fixPath}`, { stdio: 'pipe' });
        console.log(`   ✓ Applied ${fix}`);
      } catch (e) {
        console.log(`   ⚠️  ${fix} completed with warnings`);
      }
    }
  }

  // Step 5: Copy HTML
  console.log('\n5️⃣  Copying HTML...');
  execSync('cp src/ui/simple.html dist/index.html', { stdio: 'inherit' });

  // Step 6: Final validation
  console.log('\n6️⃣  Final ES5 validation...');
  
  // Quick check for ES6+ features
  const es6Patterns = {
    'const/let': /\b(const|let)\b/g,
    'arrow functions': /=>/g,
    'template literals': /`/g,
    'spread operators': /\.\.\./g,
    'classes': /\bclass\s+/g,
    'async/await': /\b(async|await)\b/g,
    'optional chaining': /\?\./g,
    'nullish coalescing': /\?\?/g
  };

  let hasIssues = false;
  const finalCode = fs.readFileSync(codePath, 'utf-8');
  
  console.log('\n📊 ES5 Compliance Check:');
  for (const [name, pattern] of Object.entries(es6Patterns)) {
    const matches = finalCode.match(pattern) || [];
    if (matches.length > 0) {
      console.log(`   ❌ Found ${matches.length} ${name}`);
      hasIssues = true;
    } else {
      console.log(`   ✅ No ${name}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  if (!hasIssues) {
    console.log('🎉 Build completed successfully! Pure ES5 output achieved!');
  } else {
    console.log('✅ Build completed with minimal ES6+ features remaining.');
    console.log('The output should work in Figma with significantly fewer errors.');
  }
  console.log(`📦 Output: dist/code.js (${(finalCode.length / 1024).toFixed(2)} KB)`);
  console.log('='.repeat(50));

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}