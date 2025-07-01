#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Figma Plugin Structure...\n');

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory not found');
  process.exit(1);
}

// Check for code.js
const codePath = path.join(distPath, 'code.js');
if (fs.existsSync(codePath)) {
  const codeContent = fs.readFileSync(codePath, 'utf8');
  const codeSize = (codeContent.length / 1024).toFixed(2);
  
  // Check for ES5 patterns
  const hasConst = codeContent.includes('const ');
  const hasLet = codeContent.includes('let ');
  const hasArrowFunctions = codeContent.includes('=>');
  const hasClasses = codeContent.includes('class ');
  const hasTemplateLiterals = codeContent.includes('`');
  
  console.log('📄 code.js:');
  console.log(`   Size: ${codeSize} KB`);
  console.log(`   ES5 Compliant: ${!hasConst && !hasLet && !hasArrowFunctions && !hasClasses && !hasTemplateLiterals ? '✅' : '❌'}`);
  
  if (hasConst || hasLet) console.log('   ⚠️  Contains const/let (ES6+)');
  if (hasArrowFunctions) console.log('   ⚠️  Contains arrow functions (ES6+)');
  if (hasClasses) console.log('   ⚠️  Contains classes (ES6+)');
  if (hasTemplateLiterals) console.log('   ⚠️  Contains template literals (ES6+)');
  
  // Check for required globals
  const hasFigmaGlobal = codeContent.includes('figma.');
  const hasHtmlGlobal = codeContent.includes('__html__');
  console.log(`   Uses figma global: ${hasFigmaGlobal ? '✅' : '❌'}`);
  console.log(`   Uses __html__ global: ${hasHtmlGlobal ? '✅' : '❌'}`);
  
  // Check for message handler
  const hasMessageHandler = codeContent.includes('figma.ui.onmessage');
  console.log(`   Has message handler: ${hasMessageHandler ? '✅' : '❌'}`);
} else {
  console.error('❌ code.js not found');
}

console.log('');

// Check for index.html
const htmlPath = path.join(distPath, 'index.html');
if (fs.existsSync(htmlPath)) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const htmlSize = (htmlContent.length / 1024).toFixed(2);
  
  console.log('📄 index.html:');
  console.log(`   Size: ${htmlSize} KB`);
  
  // Check for required elements
  const hasPostMessage = htmlContent.includes('parent.postMessage');
  const hasOnMessage = htmlContent.includes('window.onmessage');
  const hasBentoStyles = htmlContent.includes('--figma-');
  
  console.log(`   Has postMessage: ${hasPostMessage ? '✅' : '❌'}`);
  console.log(`   Has message listener: ${hasOnMessage ? '✅' : '❌'}`);
  console.log(`   Has Bento design system: ${hasBentoStyles ? '✅' : '❌'}`);
  
  // Count features
  const tabCount = (htmlContent.match(/nav-item/g) || []).length;
  console.log(`   Number of tabs: ${tabCount}`);
} else {
  console.error('❌ index.html not found');
}

console.log('\n✅ Plugin structure test complete!');