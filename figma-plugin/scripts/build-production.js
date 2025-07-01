#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Starting production build for Figma plugin (ES5)...\n');

// Clean dist directory
console.log('📦 Cleaning dist directory...');
execSync('rm -rf dist', { stdio: 'inherit' });

// Run webpack build
console.log('\n🏗️  Building with webpack (ES5 target)...');
try {
  execSync('webpack --config webpack.config.es5.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Webpack build failed');
  process.exit(1);
}

// Validate the output
console.log('\n🔍 Validating ES5 compatibility...');
const distPath = path.join(__dirname, '../dist/code.js');

if (!fs.existsSync(distPath)) {
  console.error('❌ Build output not found at dist/code.js');
  process.exit(1);
}

const content = fs.readFileSync(distPath, 'utf8');
const fileSize = (fs.statSync(distPath).size / 1024).toFixed(2);

// Check for ES6+ features
const es6Patterns = {
  'arrow functions': /=>/g,
  'const declarations': /\bconst\s+/g,
  'let declarations': /\blet\s+/g,
  'template literals': /`[^`]*`/g,
  'spread operators': /\.\.\.(?!\s*\})/g,
  'destructuring': /\{[^}]*\}\s*=/g,
  'class declarations': /\bclass\s+/g,
  'async/await': /\basync\s+|await\s+/g,
  'for...of loops': /\bfor\s*\([^)]*\bof\b/g,
  'optional chaining': /\?\./g,
  'nullish coalescing': /\?\?/g
};

let totalIssues = 0;
const foundIssues = {};

for (const [feature, pattern] of Object.entries(es6Patterns)) {
  const matches = content.match(pattern);
  if (matches && matches.length > 0) {
    foundIssues[feature] = matches.length;
    totalIssues += matches.length;
  }
}

// Report results
console.log('\n📊 Build Summary:');
console.log(`   File size: ${fileSize} KB`);
console.log(`   Total lines: ${content.split('\n').length}`);

if (totalIssues > 0) {
  console.log('\n⚠️  ES6+ features detected:');
  for (const [feature, count] of Object.entries(foundIssues)) {
    console.log(`   - ${feature}: ${count}`);
  }
  console.log(`\n❌ Total ES6+ issues: ${totalIssues}`);
  
  // Check if this is primarily from TypeScript helpers
  const spreadArrayMatches = content.match(/__spreadArray/g);
  if (spreadArrayMatches && spreadArrayMatches.length > 0) {
    console.log('\n💡 Note: Most spread operators appear to be from TypeScript helpers.');
    console.log('   Consider using tslib or custom ES5 polyfills.');
  }
} else {
  console.log('\n✅ No ES6+ features detected! Build is ES5 compatible.');
}

// Check for common Figma issues
console.log('\n🔍 Checking for Figma-specific issues...');
const figmaIssues = [];

// Check for escaped script tags
if (content.includes('<\\/script>')) {
  figmaIssues.push('Escaped script tags detected (<\\/script>)');
}

// Check for malformed regex
if (content.match(/\/\/\/g/)) {
  figmaIssues.push('Triple slash regex patterns detected (///g)');
}

// Check if code is properly wrapped
if (!content.trim().startsWith('(function')) {
  figmaIssues.push('Code not wrapped in IIFE');
}

if (figmaIssues.length > 0) {
  console.log('⚠️  Figma compatibility issues:');
  figmaIssues.forEach(issue => console.log(`   - ${issue}`));
} else {
  console.log('✅ No Figma-specific issues detected.');
}

// Run post-processing if ES6+ features found
if (totalIssues > 0) {
  console.log('\n⚙️  Running post-processing to fix ES6+ features...');
  try {
    execSync('node scripts/simple-post-process.js', { stdio: 'inherit' });
    execSync('node scripts/fix-typescript-helpers.js', { stdio: 'inherit' });
    execSync('node scripts/aggressive-es5-fix.js', { stdio: 'inherit' });
    
    // Re-validate after post-processing
    const processedContent = fs.readFileSync(distPath, 'utf8');
    let remainingIssues = 0;
    
    for (const [feature, pattern] of Object.entries(es6Patterns)) {
      const matches = processedContent.match(pattern);
      if (matches && matches.length > 0) {
        remainingIssues += matches.length;
      }
    }
    
    if (remainingIssues === 0) {
      console.log('\n✅ All ES6+ features successfully transpiled to ES5!');
    } else {
      console.log(`\n⚠️  ${remainingIssues} ES6+ features remain after post-processing.`);
    }
  } catch (error) {
    console.error('❌ Post-processing failed:', error.message);
  }
}

console.log('\n✨ Build complete!');