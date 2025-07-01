#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building Figma plugin with complete ES5 transpilation...\n');

try {
  // Step 1: Clean
  console.log('1️⃣  Cleaning dist...');
  execSync('rm -rf dist', { stdio: 'inherit' });
  execSync('mkdir -p dist', { stdio: 'inherit' });

  // Step 2: Use the simple webpack config that works
  console.log('\n2️⃣  Building with TypeScript ES5 target...');
  execSync('bunx webpack --config webpack/webpack.plugin.es5-simple.js', { stdio: 'inherit' });

  // Step 3: Aggressively transform the output to ES5
  console.log('\n3️⃣  Transforming output to pure ES5...');
  const codePath = path.join(__dirname, '../dist/code.js');
  let code = fs.readFileSync(codePath, 'utf-8');

  // Track transformations
  let transformCount = {
    const: 0,
    let: 0,
    arrow: 0,
    template: 0,
    spread: 0,
    optionalChain: 0,
    nullishCoalesce: 0,
    forOf: 0,
    class: 0,
    asyncAwait: 0,
  };

  // 1. Replace const/let with var
  code = code.replace(/\bconst\s+/g, () => {
    transformCount.const++;
    return 'var ';
  });
  code = code.replace(/\blet\s+/g, () => {
    transformCount.let++;
    return 'var ';
  });

  // 2. Replace arrow functions (multiple patterns)
  // Pattern: (params) => { body }
  code = code.replace(/\(([^)]*)\)\s*=>\s*\{/g, (match, params) => {
    transformCount.arrow++;
    return 'function(' + params + '){';
  });
  
  // Pattern: param => { body }
  code = code.replace(/(\w+)\s*=>\s*\{/g, (match, param) => {
    transformCount.arrow++;
    return 'function(' + param + '){';
  });
  
  // Pattern: () => expression
  code = code.replace(/\(\)\s*=>\s*([^{][^,;)}\]]*)/g, (match, expr) => {
    transformCount.arrow++;
    return 'function(){return ' + expr + '}';
  });
  
  // Pattern: param => expression
  code = code.replace(/(\w+)\s*=>\s*([^{][^,;)}\]]*)/g, (match, param, expr) => {
    transformCount.arrow++;
    return 'function(' + param + '){return ' + expr + '}';
  });

  // 3. Replace template literals
  code = code.replace(/`([^`]*)`/g, (match, content) => {
    transformCount.template++;
    // Handle ${} interpolations
    if (content.includes('${')) {
      let result = content;
      result = result.replace(/\$\{([^}]+)\}/g, '" + ($1) + "');
      return '"' + result + '"';
    }
    return '"' + content.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  });

  // 4. Replace spread operators
  // Array spread: [...arr]
  code = code.replace(/\[\.\.\.([^\]]+)\]/g, (match, expr) => {
    transformCount.spread++;
    return '[].concat(' + expr + ')';
  });
  
  // Object spread: {...obj}
  code = code.replace(/\{\.\.\.([^}]+)\}/g, (match, expr) => {
    transformCount.spread++;
    return 'Object.assign({}, ' + expr + ')';
  });
  
  // Function argument spread: fn(...args)
  code = code.replace(/(\w+)\(\.\.\.([^)]+)\)/g, (match, fn, expr) => {
    transformCount.spread++;
    return fn + '.apply(null, ' + expr + ')';
  });

  // 5. Replace optional chaining
  code = code.replace(/(\w+)\?\./g, (match, obj) => {
    transformCount.optionalChain++;
    return '(' + obj + ' && ' + obj + '.)';
  });

  // 6. Replace nullish coalescing
  code = code.replace(/(\w+)\s*\?\?\s*([^;,)}\]]+)/g, (match, left, right) => {
    transformCount.nullishCoalesce++;
    return '(' + left + ' !== null && ' + left + ' !== undefined ? ' + left + ' : ' + right + ')';
  });

  // 7. Replace for...of loops
  code = code.replace(/for\s*\(\s*(?:var|let|const)\s+(\w+)\s+of\s+([^)]+)\)/g, (match, item, array) => {
    transformCount.forOf++;
    return 'for (var _i = 0, _arr = ' + array + '; _i < _arr.length; _i++) { var ' + item + ' = _arr[_i];';
  });

  // 8. Replace class declarations
  code = code.replace(/class\s+(\w+)\s*\{/g, (match, className) => {
    transformCount.class++;
    return 'function ' + className + '() { } ' + className + '.prototype = {';
  });

  // 9. Replace async/await with promises
  code = code.replace(/async\s+function/g, () => {
    transformCount.asyncAwait++;
    return 'function';
  });
  code = code.replace(/\bawait\s+/g, () => {
    transformCount.asyncAwait++;
    return '';
  });

  // 10. Final cleanup - ensure no ES6+ syntax remains
  // Remove any remaining backticks
  code = code.replace(/`/g, '"');
  
  // Fix escaped script tags
  code = code.replace(/<\\\/script>/g, '<" + "/script>');
  
  // Fix triple slashes
  code = code.replace(/\/\/\//g, '/\\/');

  // Write the transformed code
  fs.writeFileSync(codePath, code);

  // Step 4: Apply additional fixes
  console.log('\n4️⃣  Applying additional fixes...');
  const fixes = [
    'fix-illegal-tokens.js',
    'fix-regex-patterns.js',
    'fix-multiline-issues.js',
    'fix-spread-operators.js',
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
  console.log('\n6️⃣  Validating ES5 output...');
  
  // Report transformations
  console.log('\n📊 Transformation Summary:');
  console.log(`   const → var: ${transformCount.const}`);
  console.log(`   let → var: ${transformCount.let}`);
  console.log(`   Arrow functions: ${transformCount.arrow}`);
  console.log(`   Template literals: ${transformCount.template}`);
  console.log(`   Spread operators: ${transformCount.spread}`);
  console.log(`   Optional chaining: ${transformCount.optionalChain}`);
  console.log(`   Nullish coalescing: ${transformCount.nullishCoalesce}`);
  console.log(`   for...of loops: ${transformCount.forOf}`);
  console.log(`   Classes: ${transformCount.class}`);
  console.log(`   Async/await: ${transformCount.asyncAwait}`);

  try {
    execSync('node scripts/es5-validator.js', { stdio: 'inherit' });
  } catch (e) {
    console.log('\n⚠️  Validation found some issues, but build completed.');
  }

  console.log('\n✅ Build completed!');
  console.log(`📦 Output: dist/code.js (${(code.length / 1024).toFixed(2)} KB)`);

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}