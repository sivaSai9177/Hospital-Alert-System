#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Quick Figma plugin build...\n');

// Step 1: Clean dist
console.log('1️⃣ Cleaning dist directory...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Step 2: Build plugin code
console.log('\n2️⃣ Building plugin code...');
try {
  execSync('node scripts/build-figma-complete.js && node scripts/final-es5-fix.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Plugin build failed!');
  process.exit(1);
}

// Step 3: Build simple UI
console.log('\n3️⃣ Building UI (simple mode)...');
try {
  execSync('bun run build:ui:simple', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ UI build failed!');
  process.exit(1);
}

// Step 4: Rename ui.html to index.html
console.log('\n4️⃣ Renaming ui.html to index.html...');
if (fs.existsSync('dist/ui.html')) {
  fs.renameSync('dist/ui.html', 'dist/index.html');
  console.log('✅ Renamed to index.html');
} else {
  console.error('❌ ui.html not found!');
  process.exit(1);
}

// Step 5: Validate
console.log('\n5️⃣ Validating build output...');
const requiredFiles = ['dist/code.js', 'dist/index.html'];
let success = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.error(`❌ Missing: ${file}`);
    success = false;
  }
});

if (success) {
  console.log('\n🎉 Build completed successfully!');
  console.log('\n⚠️  Note: Using simple UI build. Full React build needs fixing.');
} else {
  process.exit(1);
}