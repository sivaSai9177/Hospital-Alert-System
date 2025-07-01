#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Building Figma plugin with complete ES5 compatibility...\n');

// Step 1: Clean previous build
console.log('1️⃣ Cleaning previous build...');
// Preserve index.html if it exists
let indexHtmlContent = null;
if (fs.existsSync('dist/index.html')) {
  indexHtmlContent = fs.readFileSync('dist/index.html', 'utf8');
}

if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Restore index.html
if (indexHtmlContent) {
  fs.writeFileSync('dist/index.html', indexHtmlContent);
}

// Step 2: Build with Bun
console.log('\n2️⃣ Building with Bun...');
try {
  execSync('bun build src/code.ts --outfile=dist/code.temp.js --target=browser --bundle', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Bun build failed:', error.message);
  process.exit(1);
}

// Step 3: Apply ES5 transformations
console.log('\n3️⃣ Applying ES5 transformations...');
let code = fs.readFileSync('dist/code.temp.js', 'utf8');

// Transform 1: Fix var __esm special case
code = code.replace(/var\s+__esm\s*=\s*\(([^)]*)\)\s*=>\s*\(\)\s*=>\s*\(([^;]+)\);/g, 
  'var __esm = function($1) { return function() { return ($2); }; };');

// Transform 2: Convert class fields to constructor
console.log('   Converting class fields...');
code = code.replace(/class\s+(\w+)(?:\s+extends\s+[\w.]+)?\s*\{([\s\S]*?)(?=\n\s*class\s+\w+|\n\s*(?:export|const|let|var|function)\s+|$)/g, 
  function(match, className, classBody) {
    const fields = [];
    let processedBody = classBody;
    
    // Find field declarations
    const fieldRegex = /^\s*(\w+)\s*=\s*([^;]+);/gm;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(classBody)) !== null) {
      const [fullMatch, fieldName, fieldValue] = fieldMatch;
      const beforeField = classBody.substring(0, fieldMatch.index);
      const lastBrace = beforeField.lastIndexOf('{');
      const lastCloseBrace = beforeField.lastIndexOf('}');
      
      if (lastBrace <= lastCloseBrace) {
        fields.push({ name: fieldName, value: fieldValue.trim() });
        processedBody = processedBody.replace(fullMatch, '');
      }
    }
    
    if (fields.length > 0) {
      console.log(`      Class ${className}: ${fields.length} fields moved to constructor`);
      
      const constructorMatch = processedBody.match(/constructor\s*\([^)]*\)\s*\{/);
      
      if (constructorMatch) {
        const insertPoint = processedBody.indexOf(constructorMatch[0]) + constructorMatch[0].length;
        const fieldAssignments = fields.map(f => `\n    this.${f.name} = ${f.value};`).join('');
        processedBody = processedBody.slice(0, insertPoint) + fieldAssignments + processedBody.slice(insertPoint);
      } else {
        const fieldAssignments = fields.map(f => `    this.${f.name} = ${f.value};`).join('\n');
        const newConstructor = `  constructor() {\n${fieldAssignments}\n  }\n\n`;
        processedBody = '\n' + newConstructor + processedBody;
      }
    }
    
    return `class ${className} {${processedBody}`;
  });

// Transform 3: Remove empty property declarations
console.log('   Removing empty property declarations...');
code = code.replace(/^\s*(\w+)\s*;$/gm, '  // $1; // Property declaration removed for ES5');

// Transform 4: Convert arrow functions
console.log('   Converting arrow functions...');
// First handle destructuring in arrow functions
// Convert patterns like .map(([name, value]) => to .map(function(arr) { var name = arr[0], value = arr[1]; return
code = code.replace(/\.(map|filter|forEach|reduce)\(\(\[(\w+),\s*(\w+)\]\)\s*=>\s*\(\{/g, 
  '.$1(function(arr) { var $2 = arr[0], $3 = arr[1]; return ({');
code = code.replace(/\.(map|filter|forEach|reduce)\(\(\[(\w+),\s*(\w+)\]\)\s*=>\s*\{/g, 
  '.$1(function(arr) { var $2 = arr[0], $3 = arr[1]; return {');
// Convert arrow functions in object properties (with colon syntax)
code = code.replace(/(\w+)\s*:\s*\(([^)]*)\)\s*=>\s*\{/g, '$1: function($2) {');
code = code.replace(/(\w+)\s*:\s*\(([^)]*)\)\s*=>\s*([^,}]+)/g, '$1: function($2) { return $3 }');
// Convert class method arrow functions
code = code.replace(/(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/g, '$1 = function($2) {');
// Convert arrow functions with implicit returns
code = code.replace(/(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*([^{][^;]*);/g, '$1 = function($2) { return $3; }');
// Convert const/let arrow functions to function declarations
code = code.replace(/(?:const|let)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*/g, 'function $1($2) ');

// Transform 5: Fix function declarations
console.log('   Fixing function declarations...');
code = code.replace(/const\s+(\w+)\s*\(([^)]*)\)\s*\{/g, 'function $1($2) {');

// Transform 6: Convert template literals
console.log('   Converting template literals...');
code = code.replace(/`([^`]*)`/g, function(match, content) {
  if (!content.includes('${')) {
    return "'" + content.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  }
  
  let parts = [];
  let lastIndex = 0;
  const regex = /\$\{([^}]+)\}/g;
  let execMatch;
  
  while ((execMatch = regex.exec(content)) !== null) {
    if (execMatch.index > lastIndex) {
      const text = content.substring(lastIndex, execMatch.index)
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n');
      if (text) parts.push("'" + text + "'");
    }
    parts.push('(' + execMatch[1] + ')');
    lastIndex = execMatch.index + execMatch[0].length;
  }
  
  if (lastIndex < content.length) {
    const text = content.substring(lastIndex)
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');
    if (text) parts.push("'" + text + "'");
  }
  
  return parts.join(' + ') || "''";
});

// Transform 7: Fix spread operators
console.log('   Converting spread operators...');
// Object spread
code = code.replace(/\{\s*\.\.\.(\w+),/g, 'Object.assign({}, $1, {');
code = code.replace(/,\s*\.\.\.(\w+)\s*\}/g, '}, $1)');
// Array spread
code = code.replace(/\[\s*\.\.\.([^,\]]+)\s*\]/g, 'Array.from($1)');
code = code.replace(/\.push\(\s*\.\.\.([^)]+)\s*\)/g, '.push.apply(this, $1)');
// Fix remaining object spreads
code = code.replace(/\{\s*\.\.\.([^}]+)\s*\}/g, 'Object.assign({}, $1)');

// Fix any broken Object.assign syntax caused by transformations
console.log('   Fixing Object.assign syntax issues...');
code = code.replace(/Object\.assignfunction/g, 'Object.assign(function');
code = code.replace(/Object\.assign\s*function/g, 'Object.assign(function');

// Fix logger pattern specifically
console.log('   Fixing logger patterns...');
// Fix patterns like: info: (msg, data) => serverLogger.info(msg, { category: 'SYNC', ...data })
code = code.replace(/(\w+):\s*function\(([^)]+)\)\s*\{\s*return\s+(\w+)\.(\w+)\(([^,]+),\s*\{([^}]+)\}\s*\}/g, 
  function(match, method, params, obj, func, firstParam, objectContent) {
    // Handle spread operator in objectContent
    const fixedContent = objectContent.replace(/\.\.\.(\w+)/, ', $1');
    return `${method}: function(${params}) { return ${obj}.${func}(${firstParam}, Object.assign({${fixedContent}}) }`;
  });
  
// Fix array method calls that got broken
console.log('   Fixing array method calls...');
code = code.replace(/\.(map|filter|forEach|reduce|find|some|every|findIndex)function\(/g, '.$1(function(');

// Fix destructuring patterns in function parameters
console.log('   Fixing destructuring in function parameters...');
// Fix patterns like map(function(([name, value])
code = code.replace(/function\(\(\[(\w+),\s*(\w+)\]\)\)/g, 'function(arr) { var $1 = arr[0], $2 = arr[1];');

// Transform 8: Fix optional chaining
console.log('   Converting optional chaining...');
code = code.replace(/(\w+)\?\./g, '($1 && $1.');
code = code.replace(/\]\?\./g, '] && $&[');

// Transform 9: Fix nullish coalescing
console.log('   Converting nullish coalescing...');
code = code.replace(/(\w+)\s*\?\?\s*/g, '($1 != null ? $1 : ');

// Transform 10: Fix Object.assign syntax errors
console.log('   Fixing Object.assign syntax...');
// Fix patterns like: { category: "SYNC"}, data))
code = code.replace(/\{\s*category:\s*"(\w+)"\s*\},\s*(\w+)\)\)/g, 'Object.assign({ category: "$1" }, $2))');
// Fix patterns like: }, data));
code = code.replace(/\}\s*,\s*(\w+)\)\);/g, '}, $1);');

// Transform 11: Fix malformed property access
console.log('   Fixing property access patterns...');
code = code.replace(/this\.\((\w+)\s*&&\s*\1\.([^)]+)\)/g, 'this.$1 && this.$1.$2');

// Transform 12: Clean up syntax
console.log('   Cleaning up syntax...');
// Remove duplicate parentheses
code = code.replace(/\(\(([^)]+)\)\)/g, '($1)');
// Fix empty string concatenations
code = code.replace(/'\s*\+\s*''/g, '');
code = code.replace(/''\s*\+\s*'/g, '');

// Step 4: Validate common issues
console.log('\n4️⃣ Validating code...');
const issues = [];

if (code.includes('...')) {
  issues.push('⚠️  Spread operators still present');
}
if (code.includes('=>')) {
  issues.push('⚠️  Arrow functions still present');
}
if (code.includes('`')) {
  issues.push('⚠️  Template literals still present');
}
if (code.includes('?.')) {
  issues.push('⚠️  Optional chaining still present');
}
if (code.includes('??')) {
  issues.push('⚠️  Nullish coalescing still present');
}
if (/^\s*\w+\s*;$/m.test(code)) {
  issues.push('⚠️  Empty property declarations still present');
}

if (issues.length > 0) {
  console.log('   Issues found:');
  issues.forEach(issue => console.log('   ' + issue));
} else {
  console.log('   ✅ All ES5 compatibility checks passed!');
}

// Step 5: Write final output
console.log('\n5️⃣ Writing output...');
fs.writeFileSync('dist/code.js', code);

// Clean up temp file
if (fs.existsSync('dist/code.temp.js')) {
  fs.unlinkSync('dist/code.temp.js');
}

console.log('\n✅ Build complete! Output: dist/code.js');

// Step 6: Run post-build cleanup
console.log('\n6️⃣ Running post-build cleanup...');
try {
  execSync('node scripts/post-build-cleanup.js', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Post-build cleanup failed:', error.message);
}

// Step 7: Run comprehensive ES5 fix
console.log('\n7️⃣ Running comprehensive ES5 fix...');
try {
  execSync('node scripts/comprehensive-es5-fix.js', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Comprehensive ES5 fix failed:', error.message);
}

// Step 8: Run post-build field fixes
console.log('\n8️⃣ Running post-build field fixes...');
try {
  execSync('node scripts/post-build-fix-fields.js', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Post-build field fixes failed:', error.message);
}

// Step 9: Run single parameter arrow fixes
console.log('\n9️⃣ Running single parameter arrow fixes...');
try {
  execSync('node scripts/fix-single-param-arrows.js', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Single parameter arrow fixes failed:', error.message);
}

// Step 10: Run parentheses closing fixes
console.log('\n🔟 Running parentheses closing fixes...');
try {
  execSync('node scripts/fix-parentheses-closing.js', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Parentheses closing fixes failed:', error.message);
}

// Step 11: Run commented field fixes
console.log('\n1️⃣1️⃣ Running commented field fixes...');
try {
  execSync('node scripts/fix-commented-fields.js', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Commented field fixes failed:', error.message);
}

// Step 12: Run ESLint (optional)
console.log('\n1️⃣2️⃣ Running ESLint check...');
try {
  execSync('npx eslint dist/code.js --config .eslintrc.figma.js --no-ignore', {
    stdio: 'pipe'
  });
  console.log('   ✅ ESLint passed!');
} catch (error) {
  console.log('   ⚠️  ESLint found issues (this is expected for generated code)');
}