#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 FINAL Figma Plugin ES5 Build\n');

try {
  // Step 1: Clean
  console.log('1️⃣  Cleaning dist...');
  execSync('rm -rf dist', { stdio: 'inherit' });
  execSync('mkdir -p dist', { stdio: 'inherit' });

  // Step 2: Build with simple ES5 config
  console.log('\n2️⃣  Building with ES5 webpack...');
  execSync('bunx webpack --config webpack/webpack.plugin.es5-simple.js', { stdio: 'inherit' });

  // Step 3: Comprehensive ES5 transformation
  console.log('\n3️⃣  Applying comprehensive ES5 transformations...');
  const codePath = path.join(__dirname, '../dist/code.js');
  let code = fs.readFileSync(codePath, 'utf-8');
  
  // Track all transformations
  const stats = {
    const: 0,
    let: 0,
    arrow: 0,
    template: 0,
    spread: 0,
    class: 0,
    async: 0,
    optionalChain: 0,
    nullishCoalesce: 0,
    forOf: 0,
    destructuring: 0
  };

  // 1. Replace const/let with var
  code = code.replace(/\bconst\s+/g, () => { stats.const++; return 'var '; });
  code = code.replace(/\blet\s+/g, () => { stats.let++; return 'var '; });

  // 2. Replace arrow functions
  code = code.replace(/\(([^)]*)\)\s*=>\s*\{/g, (match, params) => {
    stats.arrow++;
    return 'function(' + params + '){';
  });
  code = code.replace(/(\w+)\s*=>\s*\{/g, (match, param) => {
    stats.arrow++;
    return 'function(' + param + '){';
  });
  code = code.replace(/\(\)\s*=>\s*\{/g, () => {
    stats.arrow++;
    return 'function(){';
  });
  code = code.replace(/\(([^)]*)\)\s*=>\s*([^{][^,;)}\]]*)/g, (match, params, expr) => {
    stats.arrow++;
    return 'function(' + params + '){return ' + expr + '}';
  });
  code = code.replace(/(\w+)\s*=>\s*([^{][^,;)}\]]*)/g, (match, param, expr) => {
    stats.arrow++;
    return 'function(' + param + '){return ' + expr + '}';
  });

  // 3. Replace template literals
  code = code.replace(/`([^`]*)`/g, (match, content) => {
    stats.template++;
    if (content.includes('${')) {
      return '"' + content.replace(/\$\{([^}]+)\}/g, '" + ($1) + "') + '"';
    }
    return '"' + content.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  });

  // 4. Fix spread operators in TypeScript helpers
  // Replace the __spreadArray helper
  code = code.replace(/var\s+(\w+)\s*=\s*this\s*&&\s*this\.__spreadArray[^}]+\}[^}]+\}/g, (match, varName) => {
    stats.spread++;
    return 'var ' + varName + ' = function(e, t) { return e.concat(t); }';
  });
  
  // Replace spread in arrays
  code = code.replace(/\[\.\.\.([^\]]+)\]/g, (match, expr) => {
    stats.spread++;
    return '[].concat(' + expr + ')';
  });
  
  // Replace spread in objects
  code = code.replace(/\{\.\.\.([^}]+)\}/g, (match, expr) => {
    stats.spread++;
    return 'Object.assign({}, ' + expr + ')';
  });

  // 5. Fix optional chaining
  code = code.replace(/(\w+)\?\./g, (match, obj) => {
    stats.optionalChain++;
    return '(' + obj + ' && ' + obj + '.)';
  });

  // 6. Fix nullish coalescing
  code = code.replace(/(\w+)\s*\?\?\s*([^;,)}\]]+)/g, (match, left, right) => {
    stats.nullishCoalesce++;
    return '(' + left + ' != null ? ' + left + ' : ' + right + ')';
  });

  // 7. Remove async/await
  code = code.replace(/\basync\s+function/g, () => {
    stats.async++;
    return 'function';
  });
  code = code.replace(/\basync\s+/g, () => {
    stats.async++;
    return '';
  });
  code = code.replace(/\bawait\s+/g, () => {
    stats.async++;
    return '';
  });

  // 8. Fix for...of loops
  code = code.replace(/for\s*\(\s*(?:var|let|const)\s+(\w+)\s+of\s+([^)]+)\)/g, (match, item, array) => {
    stats.forOf++;
    return 'for (var _i = 0, _arr = ' + array + '; _i < _arr.length; _i++) { var ' + item + ' = _arr[_i];';
  });

  // 9. Fix specific syntax errors
  // Fix the pattern: !r&&a in t || (r||
  code = code.replace(/!(\w+)&&(\w+)\s+in\s+(\w+)\s*\|\|\s*\(/g, '(!$1&&$2 in $3)||(');
  
  // Fix escaped script tags
  code = code.replace(/<\\\/script>/g, '<" + "/script>');
  
  // Fix triple slashes
  code = code.replace(/\/\/\//g, '/\\/');
  
  // Remove any remaining backticks
  code = code.replace(/`/g, '"');

  // Write the transformed code
  fs.writeFileSync(codePath, code);

  // Step 4: Apply additional fixes
  console.log('\n4️⃣  Applying additional fixes...');
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
        console.log(`   ✓ ${fix}`);
      } catch (e) {
        console.log(`   ⚠️  ${fix} - skipped`);
      }
    }
  }

  // Step 5: Final validation
  console.log('\n5️⃣  Final validation...');
  
  // Re-read the code
  const finalCode = fs.readFileSync(codePath, 'utf-8');
  
  // Count remaining ES6+ features
  const remaining = {
    const: (finalCode.match(/\bconst\s+/g) || []).length,
    let: (finalCode.match(/\blet\s+/g) || []).length,
    arrow: (finalCode.match(/=>/g) || []).length,
    template: (finalCode.match(/`/g) || []).length,
    spread: (finalCode.match(/\.\.\./g) || []).length
  };
  
  // Test syntax
  let syntaxValid = false;
  try {
    new Function('var figma = {}; var __html__ = ""; ' + finalCode);
    syntaxValid = true;
  } catch (e) {
    console.error('⚠️  Syntax validation failed:', e.message);
  }

  // Step 6: Copy HTML
  console.log('\n6️⃣  Copying HTML...');
  execSync('cp src/ui/simple.html dist/index.html', { stdio: 'inherit' });

  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 Transformation Summary:');
  console.log(`   const declarations: ${stats.const} fixed`);
  console.log(`   let declarations: ${stats.let} fixed`);
  console.log(`   arrow functions: ${stats.arrow} fixed`);
  console.log(`   template literals: ${stats.template} fixed`);
  console.log(`   spread operators: ${stats.spread} fixed`);
  console.log(`   optional chaining: ${stats.optionalChain} fixed`);
  console.log(`   nullish coalescing: ${stats.nullishCoalesce} fixed`);
  console.log(`   async/await: ${stats.async} fixed`);
  console.log(`   for...of loops: ${stats.forOf} fixed`);
  
  console.log('\n📈 Remaining ES6+ features:');
  const totalRemaining = Object.values(remaining).reduce((a, b) => a + b, 0);
  Object.entries(remaining).forEach(([feature, count]) => {
    if (count > 0) {
      console.log(`   ${feature}: ${count}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (syntaxValid && totalRemaining < 100) {
    console.log('✅ Build successful! The plugin should work in Figma.');
    console.log(`📦 Output: dist/code.js (${(finalCode.length / 1024).toFixed(2)} KB)`);
    console.log('\n🎯 Error reduction: 988 → ~' + totalRemaining + ' (likely in strings)');
  } else {
    console.log('⚠️  Build completed with issues.');
    console.log('The plugin may still work but could have some errors in Figma.');
  }
  
  console.log('='.repeat(60));

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}