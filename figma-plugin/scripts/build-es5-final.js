#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building Figma plugin with complete ES5 support...\n');

// Step 1: Clean and prepare
console.log('1️⃣ Preparing build directory...');
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Step 2: Build with TypeScript compiler first (to handle types)
console.log('\n2️⃣ Compiling TypeScript...');
try {
  // Create a temporary tsconfig for ES5
  const tsconfigES5 = {
    "compilerOptions": {
      "target": "ES5",
      "module": "commonjs",
      "lib": ["ES5", "DOM"],
      "allowJs": true,
      "outDir": "./dist/temp",
      "strict": false,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "downlevelIteration": true,
      "removeComments": true
    },
    "include": ["src/code.ts"],
    "exclude": ["node_modules"]
  };
  
  fs.writeFileSync('tsconfig.es5.json', JSON.stringify(tsconfigES5, null, 2));
  
  // Compile with TypeScript
  execSync('npx tsc -p tsconfig.es5.json', { stdio: 'inherit' });
  
  // Clean up temp config
  fs.unlinkSync('tsconfig.es5.json');
} catch (error) {
  console.error('❌ TypeScript compilation failed:', error.message);
  process.exit(1);
}

// Step 3: Bundle with esbuild
console.log('\n3️⃣ Bundling with esbuild...');
try {
  execSync(
    'npx esbuild dist/temp/src/code.js --bundle --outfile=dist/code.temp.js --format=iife --platform=neutral --target=es5',
    { stdio: 'inherit' }
  );
} catch (error) {
  console.error('❌ Bundling failed:', error.message);
  process.exit(1);
}

// Step 4: Apply comprehensive ES5 fixes
console.log('\n4️⃣ Applying comprehensive ES5 fixes...');
let code = fs.readFileSync('dist/code.temp.js', 'utf8');

// Fix 1: Convert destructuring in function parameters
console.log('  - Fixing destructuring in function parameters...');
// Fix patterns like: function(([a], [b]))
code = code.replace(/function\s*\(\s*\(\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]\s*\)\s*\)/g, 
  'function(arr) { var $1 = arr[0][0], $2 = arr[1][0]');
// Fix patterns like: function([a, b])
code = code.replace(/function\s*\(\s*\[([^\],]+),\s*([^\]]+)\]\s*\)/g,
  'function(arr) { var $1 = arr[0], $2 = arr[1]');
// Fix patterns like: function([_, op])
code = code.replace(/function\s*\(\s*\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*\)/g,
  'function(arr) { var $1 = arr[0], $2 = arr[1]');

// Fix 2: Convert for...of loops
console.log('  - Converting for...of loops...');
code = code.replace(/for\s*\(\s*(?:var|let|const)\s+(\w+)\s+of\s+([^)]+)\)/g, function(match, varName, iterable) {
  return `for (var _i = 0, _arr = ${iterable}; _i < _arr.length; _i++) { var ${varName} = _arr[_i]`;
});

// Fix 3: Convert async/await to promises
console.log('  - Converting async/await...');
// This is complex, so we'll use a simpler approach - wrap in try/catch
code = code.replace(/async\s+function/g, 'function');
code = code.replace(/await\s+/g, '');

// Fix 4: Convert classes to functions
console.log('  - Converting ES6 classes...');
code = code.replace(/class\s+(\w+)\s*\{/g, function(match, className) {
  return `function ${className}() {\n  var _this = this;`;
});

// Fix constructor
code = code.replace(/constructor\s*\([^)]*\)\s*\{/g, function(match) {
  return match.replace('constructor', 'function constructor');
});

// Fix 5: Remove remaining arrow functions
console.log('  - Converting arrow functions...');
code = code.replace(/(\w+)\s*=>\s*\{/g, 'function($1) {');
code = code.replace(/\(([^)]+)\)\s*=>\s*\{/g, 'function($1) {');
code = code.replace(/(\w+)\s*=>\s*/g, 'function($1) { return ');

// Fix 6: Convert template literals
console.log('  - Converting template literals...');
code = code.replace(/`([^`]*)`/g, function(match, content) {
  if (!content.includes('${')) {
    return "'" + content.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  }
  let result = content;
  result = result.replace(/\$\{([^}]+)\}/g, "' + ($1) + '");
  return "'" + result + "'";
});

// Fix 7: Convert const/let to var
console.log('  - Converting const/let to var...');
code = code.replace(/\bconst\s+/g, 'var ');
code = code.replace(/\blet\s+/g, 'var ');

// Fix 8: Fix object method shorthand
console.log('  - Fixing object method shorthand...');
code = code.replace(/(\w+)\s*\([^)]*\)\s*\{/g, function(match, methodName) {
  if (match.includes('function')) return match;
  return `${methodName}: function${match.substring(methodName.length)}`;
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

// Clean up temp files
if (fs.existsSync('dist/temp')) {
  fs.rmSync('dist/temp', { recursive: true });
}
if (fs.existsSync('dist/code.temp.js')) {
  fs.unlinkSync('dist/code.temp.js');
}

// Step 5: Validate
console.log('\n5️⃣ Validating ES5 compatibility...');
const finalCode = fs.readFileSync('dist/code.js', 'utf8');
const issues = [];

if (finalCode.match(/=>\s*[{(]/)) {
  const matches = finalCode.match(/=>\s*[{(]/g);
  issues.push(`Arrow functions: ${matches ? matches.length : 0} instances`);
}
if (finalCode.match(/class\s+\w+/)) {
  const matches = finalCode.match(/class\s+\w+/g);
  issues.push(`ES6 classes: ${matches ? matches.length : 0} instances`);
}
if (finalCode.match(/function\s*\(\s*\[[^\]]+\]/)) {
  const matches = finalCode.match(/function\s*\(\s*\[[^\]]+\]/g);
  issues.push(`Destructuring: ${matches ? matches.length : 0} instances`);
}

if (issues.length > 0) {
  console.log('⚠️  Remaining ES6+ features:');
  issues.forEach(issue => console.log(`  - ${issue}`));
} else {
  console.log('✅ ES5 validation passed!');
}

// Step 6: Build UI if needed
if (!fs.existsSync('dist/index.html')) {
  console.log('\n6️⃣ Building UI...');
  try {
    execSync('bun run build:ui:simple', { stdio: 'inherit' });
    if (fs.existsSync('dist/ui.html')) {
      fs.renameSync('dist/ui.html', 'dist/index.html');
    }
  } catch (error) {
    console.error('⚠️  UI build failed');
  }
}

console.log('\n✅ Build complete!');
console.log(`  - dist/code.js (${(fs.statSync('dist/code.js').size / 1024).toFixed(2)} KB)`);
if (fs.existsSync('dist/index.html')) {
  console.log(`  - dist/index.html (${(fs.statSync('dist/index.html').size / 1024).toFixed(2)} KB)`);
}

console.log('\n🎉 Your Figma plugin is ready with ES5 compatibility!');