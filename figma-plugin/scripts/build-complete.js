#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting complete Figma plugin build process...\n');

// Helper function to run commands with error handling
function runCommand(command, description) {
  console.log(`📌 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed!\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

// Step 1: Run quality checks
console.log('🔍 Step 1: Running quality checks...\n');

// Type checking
if (!runCommand('bun run type-check', 'TypeScript type checking')) {
  console.log('⚠️  Type checking failed, but continuing with build...\n');
}

// Linting (optional, can be strict)
if (!runCommand('bun run lint --max-warnings 50', 'ESLint checking')) {
  console.log('⚠️  Linting found issues, but continuing with build...\n');
}

// Step 2: Clean build directory
console.log('🧹 Step 2: Cleaning build directory...\n');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });
console.log('✅ Build directory cleaned!\n');

// Step 3: Build UI first
console.log('🎨 Step 3: Building UI with Vite...\n');
if (!runCommand('bun run ui:build', 'UI build')) {
  console.error('❌ UI build failed! Cannot continue.');
  process.exit(1);
}

// Check if index.html was created
if (!fs.existsSync('dist/index.html')) {
  console.error('❌ UI build did not create index.html!');
  console.log('📁 Contents of dist directory:');
  const files = fs.readdirSync('dist');
  files.forEach(file => console.log(`  - ${file}`));
  
  // Try to find any HTML file and rename it
  const htmlFile = files.find(f => f.endsWith('.html'));
  if (htmlFile && htmlFile !== 'index.html') {
    console.log(`\n🔄 Renaming ${htmlFile} to index.html...`);
    fs.renameSync(path.join('dist', htmlFile), path.join('dist', 'index.html'));
    console.log('✅ Renamed to index.html!\n');
  } else {
    console.error('\n❌ No HTML file found in dist directory!');
    process.exit(1);
  }
}

// Step 4: Build plugin code
console.log('🔧 Step 4: Building plugin code...\n');
if (!runCommand('node scripts/build-figma-complete.js', 'Plugin code build')) {
  console.error('❌ Plugin code build failed!');
  process.exit(1);
}

// Step 5: Apply final ES5 fixes
console.log('🔨 Step 5: Applying final ES5 fixes...\n');
if (!runCommand('node scripts/final-es5-fix.js', 'ES5 compatibility fixes')) {
  console.error('❌ ES5 fixes failed!');
  process.exit(1);
}

// Step 6: Validate build output
console.log('✔️  Step 6: Validating build output...\n');

const requiredFiles = ['dist/code.js', 'dist/index.html'];
const missingFiles = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.error('\n❌ Missing required files:');
  missingFiles.forEach(file => console.error(`  - ${file}`));
  process.exit(1);
}

// Step 7: Final validation
console.log('\n🏁 Final validation...\n');

// Check code.js for ES6+ features
const codeContent = fs.readFileSync('dist/code.js', 'utf8');
const es6Issues = [];

if (codeContent.includes('=>') && !codeContent.includes('// =>')) {
  es6Issues.push('Arrow functions detected');
}
if (codeContent.includes('const ') || codeContent.includes('let ')) {
  // Check if it's not in a string
  if (!/["'].*(?:const|let).*["']/.test(codeContent)) {
    es6Issues.push('const/let declarations detected');
  }
}
if (codeContent.includes('`') && !codeContent.includes('// `')) {
  es6Issues.push('Template literals detected');
}

if (es6Issues.length > 0) {
  console.log('⚠️  ES6+ features detected in code.js:');
  es6Issues.forEach(issue => console.log(`  - ${issue}`));
  console.log('\nThese might cause issues in Figma.\n');
}

// Check index.html structure
const htmlContent = fs.readFileSync('dist/index.html', 'utf8');
if (!htmlContent.includes('<script') && !htmlContent.includes('<style')) {
  console.error('❌ index.html appears to be missing bundled content!');
  process.exit(1);
}

console.log('✅ Build validation complete!\n');
console.log('🎉 Build completed successfully!');
console.log('\n📦 Output files:');
console.log('  - dist/code.js    (Plugin code)');
console.log('  - dist/index.html (Plugin UI)');
console.log('\n🚀 Your Figma plugin is ready to use!');